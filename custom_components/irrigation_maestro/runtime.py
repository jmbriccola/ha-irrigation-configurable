"""Per-entry runtime: configuration, triggers, evaluation and the session.

This is the owner object stored in ``entry.runtime_data``. Configuration
changes are applied here in place — never by reloading the entry — so a
running cycle is never aborted by an options edit (§5).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import replace
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, State, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers import sun
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_time,
    async_track_state_change_event,
    async_track_time_change,
)
from homeassistant.util import dt as dt_util

from .accounting import WaterAccountant
from .const import (
    DOMAIN,
    SUBENTRY_TYPE_ZONE,
)
from .engine.curves import CurveKind, curve_value
from .engine.evaluate import evaluate_session
from .engine.model import SessionEvaluation, SkipReason
from .engine.planner import PlannedRun, build_session_plan
from .engine.scheduling import split_soak
from .flow import CANONICAL_UNIT, FlowSensorReader
from .models import CycleConfig, HubConfig, ZoneConfig
from .notify import (
    EVENT_ANOMALY,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_CONSUMPTION_BUDGET,
    EVENT_INTERRUPTED,
    EVENT_SENTINEL,
    EVENT_SESSION_OVERRUN,
    EVENT_SKIPPED,
    EVENT_WATCHDOG,
    Notifier,
    evaluate_notifications,
)
from .sentinel import Sentinel
from .session import (
    RESULT_CANCELLED,
    RESULT_COMPLETED,
    RESULT_INTERRUPTED,
    RESULT_SKIPPED,
    SessionRunner,
)
from .storage import RuntimeState
from .valves import ValveController
from .watchdog import Watchdog
from .weather_client import WeatherClient

_LOGGER = logging.getLogger(__name__)

SIGNAL_UPDATE = f"{DOMAIN}_update"
SIGNAL_ZONES_CHANGED = f"{DOMAIN}_zones_changed"

# Fallback expiry only: entries are normally retired by their own state
# transition (see SessionRunner._on_valve_change). Keep it short so an entry
# whose command never actuated cannot mask a later manual intervention.
_LEDGER_TTL_S = 60
_EVALUATION_REUSE_S = 120
_SKIP_NOTICE_DEBOUNCE_S = 5
_TEMP_TRACK_MINUTES = 10
_INDEFINITE = datetime(2999, 1, 1, tzinfo=dt_util.UTC)


def _declared_unit(state: State | None) -> str | None:
    """The unit an entity declares, or None if it declares (or is) nothing."""
    return None if state is None else state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)


class ZoneRuntime:
    """A zone's live objects: parsed config + valve controller."""

    def __init__(self, config: ZoneConfig, valve: ValveController) -> None:
        self.config = config
        self.valve = valve


class IrrigationRuntime:
    """Everything alive for one hub config entry."""

    def __init__(self, hass: Any, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.hub = HubConfig.from_options(dict(entry.options))
        self.state = RuntimeState(hass, entry.entry_id)
        self.zones: dict[str, ZoneRuntime] = {}
        self.master_controller: ValveController | None = None
        self.notifier = Notifier(hass, lambda: self.hub.notifications)
        self.weather = WeatherClient(hass, lambda: self.hub)
        self.session = SessionRunner(self)
        self.watchdog = Watchdog(self)
        self.sentinel = Sentinel(self)
        self.accountant = WaterAccountant(self)
        self._session_lock = asyncio.Lock()
        self._ledger: dict[tuple[str, str], list[datetime]] = {}
        self._trigger_unsubs: list[CALLBACK_TYPE] = []
        self._tracker_unsubs: list[CALLBACK_TYPE] = []
        self._flow_tracker_unsub: CALLBACK_TYPE | None = None
        self._skip_notices: dict[str, list[str]] = {}
        self._skip_flush_unsub: CALLBACK_TYPE | None = None
        self._last_evaluation: tuple[datetime, SessionEvaluation] | None = None
        self._budget_notified_period: str | None = None

    # Setup / teardown -------------------------------------------------------

    async def async_setup(self) -> None:
        await self.state.async_load()
        self._build_zones()
        # v2: the watering marker is keyed per program. Idempotent — already
        # migrated keys pass through untouched.
        self.state.migrate_markers(
            {
                zone_id: [cycle.cycle_id for cycle in zone.config.cycles]
                for zone_id, zone in self.zones.items()
            }
        )
        # 3.3.0: the standalone monthly counter becomes an opening balance,
        # once. A migration that has already run returns False, so the
        # notice is not re-raised on every later setup. Scheduled so the
        # fact of having migrated survives a restart on its own, rather than
        # by luck of some unrelated write landing first.
        if self.state.migrate_consumption(dt_util.now().date()):
            self.report_consumption_history_restarted()
            self.state.schedule_save()
        self._schedule_triggers()
        self._start_trackers()
        self.accountant.start()
        self.watchdog.start()
        self.sentinel.start()
        self._refresh_notification_issues()
        self._report_rescaled_flow_meters()

    async def async_shutdown(self) -> None:
        """Entry unload: stop everything and leave the valves closed."""
        if self.session.active:
            await self.session.async_stop_all(reason="shutdown", manual=False)
        self.watchdog.stop()
        self.sentinel.stop()
        self._clear_triggers()
        for unsub in self._tracker_unsubs:
            unsub()
        self._tracker_unsubs.clear()
        if self._flow_tracker_unsub is not None:
            self._flow_tracker_unsub()
            self._flow_tracker_unsub = None
        self.accountant.stop()
        if self._skip_flush_unsub is not None:
            self._skip_flush_unsub()
            self._skip_flush_unsub = None
        await self.state.async_save()

    def _build_zones(self) -> None:
        zones: dict[str, ZoneRuntime] = {}
        for subentry in self.entry.subentries.values():
            if subentry.subentry_type != SUBENTRY_TYPE_ZONE:
                continue
            config = ZoneConfig.from_subentry(
                subentry.subentry_id,
                dict(subentry.data),
                templates=self.hub.curve_templates,
            )
            zones[config.zone_id] = ZoneRuntime(
                config, ValveController(self.hass, config.valve_entity)
            )
        self.zones = zones
        self.master_controller = (
            ValveController(self.hass, self.hub.master_valve) if self.hub.master_valve else None
        )

    async def async_config_updated(self) -> None:
        """Apply config changes in place — never reload mid-cycle (§5)."""
        old_zone_ids = set(self.zones)
        old_cycles = {
            zone_id: {cycle.cycle_id for cycle in zone.config.cycles}
            for zone_id, zone in self.zones.items()
        }
        self.hub = HubConfig.from_options(dict(self.entry.options))
        self._build_zones()
        removed = old_zone_ids - set(self.zones)
        for zone_id in removed:
            if zone_id in self.session.active_runs:
                await self.session.async_stop_all(reason="zone_removed", manual=False)
            self.state.drop_zone(zone_id)
        self._schedule_triggers()
        self._track_flow_sensors()  # a repointed or new meter, watched at once
        self.sentinel.start()  # re-arm at the (possibly new) sentinel time
        self.state.schedule_save()
        # Signal the platforms to add/remove entities when the zone set OR any
        # zone's cycle set changed (new/removed cycle => new/removed switch),
        # so a reconfigure needs no reload.
        cycles_changed = any(
            old_cycles.get(zone_id, set()) != {cycle.cycle_id for cycle in zone.config.cycles}
            for zone_id, zone in self.zones.items()
        )
        self._refresh_notification_issues()
        self._report_rescaled_flow_meters()
        if removed or (set(self.zones) - old_zone_ids) or cycles_changed:
            async_dispatcher_send(self.hass, SIGNAL_ZONES_CHANGED, self.entry.entry_id)
        self.dispatch_update()

    # Introspection ------------------------------------------------------------

    @property
    def last_evaluation(self) -> SessionEvaluation | None:
        """The most recent engine evaluation, if any (hub sensors)."""
        return None if self._last_evaluation is None else self._last_evaluation[1]

    @property
    def zone_ids(self) -> list[str]:
        return list(self.zones)

    def zone_configs(self) -> list[ZoneConfig]:
        return [zone.config for zone in self.zones.values()]

    def managed_valve_entities(self) -> list[str]:
        entities = [zone.valve.entity_id for zone in self.zones.values()]
        if self.hub.master_valve:
            entities.append(self.hub.master_valve)
        return entities

    def all_valve_controllers(self) -> list[ValveController]:
        controllers = [zone.valve for zone in self.zones.values()]
        if self.master_controller is not None:
            controllers.append(self.master_controller)
        return controllers

    def flow_reader_for(self, zone: ZoneRuntime) -> FlowSensorReader | None:
        """A reader for whichever meter serves this zone, with its own override.

        The override that applies belongs to the sensor being read: a zone
        falling back to the shared line meter takes the hub's override, not its
        own — its own describes a sensor it does not have.

        Truthiness, not ``is not None``: update_zone writes flow_sensor
        unconditionally, so an empty string is a reachable way of saying "no
        meter". Reading it as one would bind a monitor to a nonexistent entity
        and suppress the fallback to the line meter. This has to agree with
        zone_has_flow_meter, which is truthiness too.
        """
        if zone.config.flow_sensor:
            return FlowSensorReader(
                self.hass, zone.config.flow_sensor, zone.config.flow_sensor_unit
            )
        if self.hub.line_flow_sensor:
            return FlowSensorReader(
                self.hass, self.hub.line_flow_sensor, self.hub.line_flow_sensor_unit
            )
        return None

    def zone_has_flow_meter(self, zone: ZoneConfig) -> bool:
        return bool(zone.flow_sensor or self.hub.line_flow_sensor)

    def zone_flow_meter_usable(self, zone: ZoneRuntime) -> bool:
        """Is there a meter AND can its unit be determined right now?

        Deliberately separate from zone_has_flow_meter, which is configuration
        only: this one reads live state, so it belongs at plan time and in the
        zone's declared status, not in the services that create a volume curve
        (a momentarily unavailable sensor must not make an edit fail).
        """
        reader = self.flow_reader_for(zone)
        return reader is not None and reader.read().unit_known

    def expected_flow_range(self) -> tuple[float, float] | None:
        """Expected line flow = Σ nominal flows of the open zones ± tolerance."""
        nominals: list[tuple[float, float]] = []
        for zone in self.zones.values():
            if zone.valve.is_open:
                if zone.config.nominal_flow_lpm is None:
                    return None  # can't judge the range without every nominal
                nominals.append((zone.config.nominal_flow_lpm, zone.config.flow_tolerance_pct))
        if not nominals:
            return None
        total = sum(nominal for nominal, _ in nominals)
        tolerance = max(tol for _, tol in nominals) / 100
        return (total * (1 - tolerance), total * (1 + tolerance))

    def manual_block_active(self) -> bool:
        stopped_at = self.state.manual_stop_at
        if stopped_at is None:
            return False
        return dt_util.utcnow() - stopped_at < timedelta(minutes=self.hub.manual_block_min)

    def zone_status(self, zone_id: str) -> str:
        active = self.session.active_runs.get(zone_id)
        if active is not None:
            # Map internal phases onto the card-contract state set:
            # waiting/settling are pre-watering queue states; opening/closing
            # bracket the actual watering.
            if active.phase in ("watering", "opening", "closing"):
                return "watering"
            if active.phase in ("waiting", "settling"):
                return "queued"
            return active.phase  # soaking
        if any(segment_zone == zone_id for segment_zone in self.session.queued_zone_ids):
            queued = [
                segment
                for segment in self.session.queue_snapshot()
                if segment["zone_id"] == zone_id
            ]
            return "soaking" if queued and self._is_soak_wait(zone_id) else "queued"
        if not self.state.zone_enabled(zone_id):
            return "disabled"
        now = dt_util.utcnow()
        suspended = self.state.suspended_until(zone_id)
        if suspended is not None and suspended > now:
            return "suspended"
        paused = self.state.paused_until(zone_id) or self.state.paused_until(None)
        if paused is not None and paused > now:
            return "paused"
        return "idle"

    def _is_soak_wait(self, zone_id: str) -> bool:
        return any(
            segment.zone_id == zone_id and segment.segment_index > 0
            for segment in self.session._queue
        )

    # Command ledger (distinguishes our commands from manual intervention) ------

    def ledger_expect(self, entity_id: str, action: str) -> None:
        self._ledger.setdefault((entity_id, action), []).append(dt_util.utcnow())

    def ledger_consume(self, entity_id: str, action: str) -> bool:
        entries = self._ledger.get((entity_id, action), [])
        cutoff = dt_util.utcnow() - timedelta(seconds=_LEDGER_TTL_S)
        fresh = [entry for entry in entries if entry >= cutoff]
        if not fresh:
            self._ledger.pop((entity_id, action), None)
            return False
        fresh.pop(0)
        self._ledger[(entity_id, action)] = fresh
        return True

    def ledger_discard(self, entity_id: str, action: str) -> None:
        """Drop pending entries for a command that never actuated, so they
        cannot absorb a genuine manual transition later."""
        self._ledger.pop((entity_id, action), None)

    async def async_close_all_valves(self) -> None:
        """Close every managed valve, ledger-registered (not 'manual')."""
        for controller in self.all_valve_controllers():
            if not controller.is_closed:
                self.ledger_expect(controller.entity_id, "close")
                await controller.async_close()

    async def async_sleep(self, seconds: float) -> None:
        future: asyncio.Future[None] = self.hass.loop.create_future()

        @callback
        def _done(_now: Any) -> None:
            if not future.done():
                future.set_result(None)

        async_call_later(self.hass, seconds, _done)
        await future

    # Triggers -------------------------------------------------------------------

    def _clear_triggers(self) -> None:
        for unsub in self._trigger_unsubs:
            unsub()
        self._trigger_unsubs.clear()

    def _schedule_triggers(self) -> None:
        self._clear_triggers()
        for zone in self.zones.values():
            for cycle in zone.config.cycles:
                self._schedule_cycle(zone.config.zone_id, cycle)

    def _schedule_cycle(self, zone_id: str, cycle: CycleConfig) -> None:
        if cycle.trigger.kind == "time" and cycle.trigger.at is not None:
            at = cycle.trigger.at

            @callback
            def _fire(
                _now: datetime, zone_id: str = zone_id, cycle_id: str = cycle.cycle_id
            ) -> None:
                self._create_trigger_task(zone_id, cycle_id)

            self._trigger_unsubs.append(
                async_track_time_change(self.hass, _fire, hour=at.hour, minute=at.minute, second=0)
            )
        elif cycle.trigger.kind == "sun" and cycle.trigger.event is not None:
            self._schedule_sun_cycle(zone_id, cycle)

    def _schedule_sun_cycle(self, zone_id: str, cycle: CycleConfig) -> None:
        assert cycle.trigger.event is not None
        next_fire = sun.get_astral_event_next(
            self.hass, cycle.trigger.event, offset=timedelta(seconds=cycle.trigger.offset_s)
        )

        @callback
        def _fire(_now: datetime) -> None:
            self._create_trigger_task(zone_id, cycle.cycle_id)
            # Re-arm for the next day (a fresh astral computation each time).
            if zone_id in self.zones and self.zones[zone_id].config.cycle(cycle.cycle_id):
                self._schedule_sun_cycle(zone_id, cycle)

        self._trigger_unsubs.append(async_track_point_in_time(self.hass, _fire, next_fire))

    def _create_trigger_task(self, zone_id: str, cycle_id: str) -> None:
        self.entry.async_create_background_task(
            self.hass,
            self.async_handle_trigger(zone_id, cycle_id),
            name=f"irrigation_maestro_trigger_{zone_id}_{cycle_id}",
        )

    # Evaluation -------------------------------------------------------------------

    async def async_evaluate(self) -> SessionEvaluation:
        """One engine evaluation from a fresh (or policy-stale) snapshot."""
        now = dt_util.utcnow()
        if self._last_evaluation is not None and now - self._last_evaluation[0] < timedelta(
            seconds=_EVALUATION_REUSE_S
        ):
            return self._last_evaluation[1]

        local_now = dt_util.now()
        today = local_now.date()
        self.state.prune(today)
        snapshot = await self.weather.async_snapshot(now)
        temp_d3, temp_d2, temp_d1, temp_today = self.state.temps_for(today)
        rain_today, rain_d1, rain_d2, rain_d3 = self.state.rains_for(today)

        if snapshot is None:
            self._report_weather_unavailable()
            if self.hub.stale_weather_policy == "fail_closed":
                evaluation = SessionEvaluation(
                    weighted_temp=None,
                    forecast_credit=0.0,
                    water_budget=0.0,
                    skip_threshold=self.hub.engine_params.threshold_base_mm,
                    skip_reason=SkipReason.WEATHER_UNAVAILABLE,
                    stale_weather=True,
                )
            else:
                # Fail-open: curve duration from the last known weighted
                # temperature (observed history only), budget = 0.
                evaluation = evaluate_session(
                    self.hub.engine_params,
                    now=local_now,
                    season_months=self.hub.engine_params.season_months,
                    condition=None,
                    current_temp=None,
                    wind_kmh=None,
                    temp_d3=temp_d3,
                    temp_d2=temp_d2,
                    temp_d1=temp_d1,
                    temp_today_observed=temp_today,
                    temp_today_forecast_max=None,
                    temp_tomorrow_max=None,
                    rain_committed_today=0.0,
                    rain_staging_mm=0.0,
                    rain_d1=0.0,
                    rain_d2=0.0,
                    rain_d3=0.0,
                    forecast_0_24=0.0,
                    forecast_24_48=0.0,
                    stale_weather=True,
                )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "weather_unavailable")
            evaluation = evaluate_session(
                self.hub.engine_params,
                now=local_now,
                season_months=self.hub.engine_params.season_months,
                condition=snapshot.condition,
                current_temp=snapshot.current_temp,
                wind_kmh=snapshot.wind_kmh,
                temp_d3=temp_d3,
                temp_d2=temp_d2,
                temp_d1=temp_d1,
                temp_today_observed=temp_today,
                temp_today_forecast_max=snapshot.today_forecast_max,
                temp_tomorrow_max=snapshot.tomorrow_max,
                rain_committed_today=rain_today,
                rain_staging_mm=self.state.staging_mm if self.hub.rain_sensor is None else 0.0,
                rain_d1=rain_d1,
                rain_d2=rain_d2,
                rain_d3=rain_d3,
                forecast_0_24=snapshot.rain_0_24,
                forecast_24_48=snapshot.rain_24_48,
                stale_weather=snapshot.stale,
            )
        self._last_evaluation = (now, evaluation)
        self.dispatch_update()
        return evaluation

    def _consumption_factor(self) -> tuple[float, bool]:
        """(duration_factor, suspend_all) from the consumption budget."""
        budget = self.hub.consumption_budget_liters
        if budget is None or self.state.consumption_liters < budget:
            return 1.0, False
        self._notify_budget_exceeded_once()
        if self.hub.consumption_action == "reduce":
            return self.hub.consumption_reduce_pct / 100, False
        if self.hub.consumption_action == "suspend":
            return 1.0, True
        return 1.0, False

    def _notify_budget_exceeded_once(self) -> None:
        period = (self.state.consumption_period_start or dt_util.now().date()).isoformat()
        if self._budget_notified_period == period:
            return
        self._budget_notified_period = period
        self.fire_event(EVENT_CONSUMPTION_BUDGET, {"liters": self.state.consumption_liters})
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_CONSUMPTION_BUDGET,
                title="💧 Irrigation Maestro",
                message=(
                    "Monthly water budget exceeded "
                    f"({self.state.consumption_liters:.0f} L used). "
                    f"Configured action: {self.hub.consumption_action}."
                ),
            ),
            name="irrigation_maestro_budget_notice",
        )

    def _zone_spec(self, zone: ZoneRuntime, cycles: list[CycleConfig]) -> Any:
        dt_util.utcnow()
        config = zone.config
        return config.to_spec(
            enabled=self.state.zone_enabled(config.zone_id),
            cycles=tuple(
                cycle.to_spec(
                    enabled=self.state.cycle_enabled(config.zone_id, cycle.cycle_id),
                    last_completed=self.state.last_completed(config.zone_id, cycle.cycle_id),
                )
                for cycle in cycles
            ),
            suspended_until=self.state.suspended_until(config.zone_id),
            paused_until=self.state.paused_until(config.zone_id) or self.state.paused_until(None),
            skip_today=self.state.skip_today_date(config.zone_id) == dt_util.now().date(),
            has_flow_meter=self.zone_flow_meter_usable(zone),
        )

    # Session entry points ----------------------------------------------------------

    async def async_handle_trigger(self, zone_id: str, cycle_id: str) -> None:
        """A scheduled cycle trigger fired."""
        zone = self.zones.get(zone_id)
        cycle = zone.config.cycle(cycle_id) if zone else None
        if zone is None or cycle is None:
            return
        async with self._session_lock:
            evaluation, factor, suspend_all = await self._session_evaluation()
            if suspend_all:
                evaluation = replace(evaluation, skip_reason=SkipReason.CONSUMPTION_BUDGET)
            plan = build_session_plan(
                self.hub.engine_params,
                evaluation,
                [self._zone_spec(zone, [cycle])],
                now=dt_util.now(),
                duration_factor=factor,
            )
            for skipped in plan.skipped:
                self.record_run_outcome(
                    zone_id=skipped.zone_id,
                    zone_name=skipped.zone_name,
                    cycle_id=skipped.cycle_id,
                    result=RESULT_SKIPPED,
                    reason=str(skipped.reason),
                    scheduled=True,
                )
                if not skipped.reason.silent:
                    self._buffer_skip_notice(str(skipped.reason), skipped.zone_name)
            if plan.runs:
                self.session.enqueue(plan.runs, manual=False)

    async def _session_evaluation(self) -> tuple[SessionEvaluation, float, bool]:
        """The active session's frozen evaluation, or a fresh one."""
        if self.session.active and self.session.evaluation is not None:
            return self.session.evaluation, self.session.duration_factor, False
        evaluation = await self.async_evaluate()
        factor, suspend_all = self._consumption_factor()
        self.session.start_session(evaluation, factor)
        return evaluation, factor, suspend_all

    async def async_run_zone(self, zone_id: str, duration_min: int | None = None) -> None:
        """Manual run: bypasses decision gates; safety gates still apply."""
        zone = self.zones.get(zone_id)
        if zone is None:
            return
        async with self._session_lock:
            evaluation, _factor, _ = await self._session_evaluation()
            run = self._manual_run(zone.config, evaluation, duration_min)
            self.session.enqueue([run], manual=True)

    def _manual_run(
        self,
        zone: ZoneConfig,
        evaluation: SessionEvaluation,
        duration_min: int | None,
    ) -> PlannedRun:
        cycle = next(
            (
                candidate
                for candidate in zone.cycles
                if self.state.cycle_enabled(zone.zone_id, candidate.cycle_id)
            ),
            zone.cycles[0] if zone.cycles else None,
        )
        if duration_min is None:
            if cycle is not None and cycle.curve.kind is CurveKind.VOLUME:
                # A volume curve yields liters, not minutes: run for the
                # cycle's safety timeout instead of misreading the target.
                duration_min = cycle.volume_safety_timeout_min or 10
            elif cycle is not None and evaluation.weighted_temp is not None:
                # Mirror the engine's scaling (planner._cycle_target) so a manual
                # run agrees with a scheduled one: fold today's per-day intensity
                # (falling back to the cycle's overall intensity) into the zone's
                # adjustment before evaluating the curve. Weekday is read from
                # local time, matching how the schedule is authored.
                weekday = dt_util.now().weekday()
                factor = cycle.day_intensity_pct.get(weekday, cycle.intensity_pct)
                duration_min = max(
                    round(
                        curve_value(
                            cycle.curve,
                            evaluation.weighted_temp,
                            zone.adjustment_pct * factor / 100.0,
                        )
                    ),
                    1,
                )
            else:
                duration_min = 10  # deliberate fallback for a curve-less manual run
        soak_max = cycle.soak_max_run_min if cycle else None
        return PlannedRun(
            zone_id=zone.zone_id,
            zone_name=zone.name,
            cycle_id=cycle.cycle_id if cycle else "manual",
            duration_min=duration_min,
            volume_l=None,
            runs=split_soak(duration_min, max_run_min=soak_max),
            soak_pause_min=cycle.soak_pause_min if cycle else 0,
            safety_timeout_min=duration_min,
        )

    async def async_run_all(self) -> None:
        for zone_id in self.zone_ids:
            if not self.state.zone_enabled(zone_id):
                continue
            suspended = self.state.suspended_until(zone_id)
            if suspended is not None and suspended > dt_util.utcnow():
                continue
            await self.async_run_zone(zone_id)

    async def async_stop_all(self, *, manual: bool = True) -> None:
        if manual:
            self.state.set_manual_stop(dt_util.utcnow())
            self.state.schedule_save()
        await self.session.async_stop_all(reason="manual_intervention", manual=manual)
        self.dispatch_update()

    def skip_today(self, zone_id: str | None) -> None:
        today = dt_util.now().date()
        for target in [zone_id] if zone_id else self.zone_ids:
            self.state.set_skip_today(target, today)
        self.state.schedule_save()
        self.dispatch_update()

    def pause(self, hours: float, zone_id: str | None) -> None:
        until = dt_util.utcnow() + timedelta(hours=hours)
        self.state.set_paused_until(zone_id, until)
        self.state.schedule_save()
        self.dispatch_update()

    def set_global_pause(self, paused: bool) -> None:
        if paused:
            self.state.set_paused_until(None, _INDEFINITE)
        else:
            self.state.clear_pause(None)
        self.state.schedule_save()
        self.dispatch_update()

    @property
    def globally_paused(self) -> bool:
        paused = self.state.paused_until(None)
        return paused is not None and paused > dt_util.utcnow()

    def suspend_until(self, until: datetime, zone_id: str | None) -> None:
        for target in [zone_id] if zone_id else self.zone_ids:
            self.state.set_suspended_until(target, until)
        self.state.schedule_save()
        self.dispatch_update()

    def resume(self, zone_id: str | None) -> None:
        targets = [zone_id] if zone_id else [*self.zone_ids, None]
        for target in targets:
            if target is not None:
                self.state.set_suspended_until(target, None)
            self.state.clear_pause(target)
        self.state.schedule_save()
        self.dispatch_update()

    async def async_evaluate_plan(self) -> dict[str, Any]:
        """The `evaluate` service response: the full computed plan."""
        evaluation = await self.async_evaluate()
        factor, suspend_all = self._consumption_factor()
        if suspend_all:
            evaluation = replace(evaluation, skip_reason=SkipReason.CONSUMPTION_BUDGET)
        specs = [self._zone_spec(zone, list(zone.config.cycles)) for zone in self.zones.values()]
        plan = build_session_plan(
            self.hub.engine_params,
            evaluation,
            specs,
            now=dt_util.now(),
            duration_factor=factor,
        )
        return {
            "weighted_temp": evaluation.weighted_temp,
            "water_budget": evaluation.water_budget,
            "skip_threshold": evaluation.skip_threshold,
            "forecast_credit": evaluation.forecast_credit,
            "skip_reason": str(evaluation.skip_reason) if evaluation.skip_reason else None,
            "stale_weather": evaluation.stale_weather,
            "runs": [
                {
                    "zone_id": run.zone_id,
                    "zone_name": run.zone_name,
                    "cycle_id": run.cycle_id,
                    "duration_min": run.duration_min,
                    "volume_l": run.volume_l,
                }
                for run in plan.runs
            ],
            "skipped": [
                {
                    "zone_id": item.zone_id,
                    "zone_name": item.zone_name,
                    "cycle_id": item.cycle_id,
                    "reason": str(item.reason),
                }
                for item in plan.skipped
            ],
        }

    # Outcome recording ------------------------------------------------------------

    def record_run_outcome(
        self,
        *,
        zone_id: str,
        zone_name: str,
        cycle_id: str,
        result: str,
        reason: str | None = None,
        minutes: int | None = None,
        liters: float | None = None,
        partial: bool = False,
        scheduled: bool = True,
    ) -> None:
        now = dt_util.utcnow()
        today = dt_util.as_local(now).date()
        outcome = {
            "result": result,
            "reason_key": reason,
            "at": now.isoformat(),
            "cycle_id": cycle_id,
            "duration_min": minutes,
            "volume_l": liters,
            "partial": partial,
        }
        self.state.set_last_outcome(zone_id, outcome)
        self.state.record_outcome(today, zone_id, cycle_id, result)
        if result == RESULT_COMPLETED and scheduled:
            self.state.set_last_completed(zone_id, cycle_id, today)
        self.state.schedule_save()

        event_map = {
            RESULT_COMPLETED: "cycle_finished",
            RESULT_SKIPPED: "cycle_skipped",
            RESULT_CANCELLED: "cycle_cancelled",
            RESULT_INTERRUPTED: "cycle_interrupted",
        }
        self.fire_event(
            event_map.get(result, "cycle_finished"),
            {
                "zone_id": zone_id,
                "zone_name": zone_name,
                "cycle_id": cycle_id,
                "result": result,
                "reason_key": reason,
                "duration_min": minutes,
                "volume_l": liters,
                "partial": partial,
            },
        )
        if result == RESULT_COMPLETED:
            self.entry.async_create_background_task(
                self.hass,
                self.notifier.async_notify(
                    EVENT_COMPLETED,
                    title="💧 Irrigation Maestro",
                    message=f"{zone_name}: cycle completed ({minutes} min).",
                ),
                name="irrigation_maestro_notify_completed",
            )
        self.dispatch_update()

    # Aggregated notifications -------------------------------------------------------

    def _buffer_skip_notice(self, reason: str, zone_name: str) -> None:
        names = self._skip_notices.setdefault(reason, [])
        if zone_name not in names:
            names.append(zone_name)
        if self._skip_flush_unsub is not None:
            self._skip_flush_unsub()
        self._skip_flush_unsub = async_call_later(
            self.hass, _SKIP_NOTICE_DEBOUNCE_S, self._flush_skip_notices
        )

    @callback
    def _flush_skip_notices(self, _now: Any) -> None:
        self._skip_flush_unsub = None
        notices, self._skip_notices = self._skip_notices, {}
        for reason, names in notices.items():
            self.entry.async_create_background_task(
                self.hass,
                self.notifier.async_notify(
                    EVENT_SKIPPED,
                    title="💧 Irrigation skipped",
                    message=f"Skipped ({reason}): {', '.join(names)}.",
                ),
                name="irrigation_maestro_notify_skipped",
            )

    async def notify_cancelled(self, reason: str, zone_names: list[str]) -> None:
        event = EVENT_INTERRUPTED if reason in ("manual_intervention",) else EVENT_CANCELLED
        await self.notifier.async_notify(
            event,
            title="💧 Irrigation not completed",
            message=f"Cycle not completed ({reason}): {', '.join(zone_names)}.",
        )

    async def notify_session_overrun(self, zone_names: list[str]) -> None:
        await self.notifier.async_notify(
            EVENT_SESSION_OVERRUN,
            title="💧 Irrigation session limit",
            message=(f"Session time limit reached; skipped zones: {', '.join(zone_names)}."),
        )

    async def notify_anomaly(self, message: str) -> None:
        self.fire_event(EVENT_ANOMALY, {"message": message})
        await self.notifier.async_notify(
            EVENT_ANOMALY,
            title="⚠️ Irrigation anomaly",
            message=message,
            force_priority="high",
        )

    async def notify_watchdog(self, message: str) -> None:
        await self.notifier.async_notify(
            EVENT_WATCHDOG,
            title="⚠️ Irrigation watchdog",
            message=message,
            force_priority="high",
        )

    async def notify_sentinel(self, missing: list[str]) -> None:
        await self.notifier.async_notify(
            EVENT_SENTINEL,
            title="⚠️ Irrigation not executed",
            message=(
                "No outcome recorded today for: "
                f"{', '.join(missing)}. The trigger probably never ran "
                "(Home Assistant off at trigger time, or an unexpected error)."
            ),
            force_priority="high",
        )

    # Repairs ---------------------------------------------------------------------

    def _refresh_notification_issues(self) -> None:
        """Surface a configuration that will not reach anyone.

        Judged from the configuration alone -- known_services is not passed.
        At setup time another integration's notify services may not have
        registered yet, and calling their recipients missing then would be a
        false alarm. A recipient that has genuinely vanished is caught by
        Notifier at send time, where its absence is certain.
        """
        status = evaluate_notifications(self.hub.notifications)
        if status.enabled_without_target:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_enabled_without_target",
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="notifications_enabled_without_target",
                translation_placeholders={"events": ", ".join(status.enabled_without_target)},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_enabled_without_target")

        if status.verdict == "silent":
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_silent",
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="notifications_silent",
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_silent")

    def _report_rescaled_flow_meters(self) -> None:
        """State which meters are being converted, and from what.

        A standing fact, not an event: there is no version gate and no
        one-shot flag, so this runs on every setup and config update and the
        issue is present exactly while some meter reads non-canonically. The
        text says so -- it describes the conversion in force, and mentions the
        understated history only as a conditional for an install upgraded from
        before 3.2.0. Anchoring it to "the current period" instead was false
        on a fresh install, false again once the month rolled over, and back
        at every HA version bump that reset the issue's dismissal.

        The stored consumption counter is deliberately NOT rewritten: the
        accumulated total mixes litres measured through the meter with litres
        estimated as nominal x minutes, which the defect never touched.
        Multiplying the whole total by a single factor would be exactly the
        plausible-but-false number this feature removes.
        """
        rescaled: dict[str, str] = {}
        for zone in self.zones.values():
            reader = self.flow_reader_for(zone)
            if reader is None:
                continue
            reading = reader.read()
            if (
                reading.unit is not None
                and reading.unit != CANONICAL_UNIT
                and reader.entity_id not in rescaled
            ):
                rescaled[reader.entity_id] = reading.unit
        if not rescaled:
            ir.async_delete_issue(self.hass, DOMAIN, "flow_unit_corrected")
            return
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "flow_unit_corrected",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_corrected",
            translation_placeholders={
                "sensors": ", ".join(
                    f"{entity_id} ({unit})" for entity_id, unit in rescaled.items()
                )
            },
        )

    def report_consumption_history_restarted(self) -> None:
        """The monthly total now derives from per-zone daily litres (3.3.0).

        Modelled on the 3.2.0 rescale notice: the carried balance mixes
        litres measured through a meter with litres estimated as nominal x
        minutes and has no daily breakdown, so this month's chart starts at
        the upgrade while the budget total still includes the balance. Both
        self-heal at the next period boundary.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "consumption_history_restarted",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="consumption_history_restarted",
        )

    def _report_weather_unavailable(self) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "weather_unavailable",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="weather_unavailable",
        )
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_ANOMALY,
                title="⚠️ Irrigation Maestro",
                message=(
                    "Weather data unavailable at evaluation time; applied the "
                    f"configured policy ({self.hub.stale_weather_policy})."
                ),
            ),
            name="irrigation_maestro_weather_notice",
        )

    async def report_close_failure(self, entity_id: str, zone_name: str) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"close_failed_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="close_failed",
            translation_placeholders={"entity_id": entity_id},
        )
        self.fire_event(EVENT_ANOMALY, {"message": f"close failed: {entity_id}"})
        await self.notifier.async_notify(
            EVENT_ANOMALY,
            title="🚨 Irrigation: valve close FAILED",
            message=(
                f"The valve {entity_id} ({zone_name}) did not confirm closure "
                "after a retry. The watchdog will keep trying; if water still "
                "flows, close the tap manually!"
            ),
            force_priority="high",
        )

    def report_valve_unreachable(self, entity_id: str) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"valve_unreachable_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="valve_unreachable",
            translation_placeholders={"entity_id": entity_id},
        )

    def report_sentinel_missing(self, missing: list[str]) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "sentinel_missing_outcome",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="sentinel_missing_outcome",
            translation_placeholders={"cycles": ", ".join(missing)},
        )

    def report_flow_out_of_range(self, actual: float, low: float, high: float) -> None:
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(
                f"Flow out of expected range: {actual:.1f} L/min "
                f"(expected {low:.1f}-{high:.1f} L/min)."
            ),
            name="irrigation_maestro_flow_range",
        )

    def report_flow_unit_unknown(self, entity_id: str) -> None:
        """The meter's unit cannot be determined, so its readings are unusable.

        Not an assumption of L/min: a plausible number that is silently wrong
        is worse than a declared absence (see the degradation matrix).
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_unknown_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_unknown",
            translation_placeholders={"entity_id": entity_id},
        )

    def clear_flow_unit_unknown(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_unknown_{entity_id}")

    def report_flow_unit_override_conflict(self, entity_id: str, first: str, second: str) -> None:
        """Two zones read one meter under different unit overrides.

        One ledger per meter means one interpretation; this names both zones
        rather than silently applying whichever was resolved first. ``first``/
        ``second`` are bare zone names -- proper nouns, not English prose --
        so each locale template supplies its own word for "zone" around them.
        Placeholders are plain string substitution with no per-locale
        conditional, so anything that describes the *kind* of claimant, not
        just its name, cannot live here; see
        ``report_flow_line_override_conflict`` for the other claimant shape
        this fact forces into its own translation key.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_override_conflict_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_override_conflict",
            translation_placeholders={
                "entity_id": entity_id,
                "first": first,
                "second": second,
            },
        )

    def clear_flow_unit_override_conflict(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_override_conflict_{entity_id}")

    def report_flow_line_override_conflict(self, entity_id: str, zone: str) -> None:
        """A zone's own override on the shared line meter disagrees with the hub's.

        A zone that points its own flow_sensor at the hub's line meter, with
        its own flow_sensor_unit, wins the ledger (mandated, unchanged) --
        but flow_reader_for builds a reader under the hub's own
        line_flow_sensor_unit for any zone that falls back to the line, so
        the disagreement must not be silent. A distinct issue id and
        translation key from ``report_flow_unit_override_conflict``, on
        purpose: that repair's template says "zone X and zone Y" in each
        locale, and this claimant is the hub, not a second zone -- a
        placeholder cannot make one static template correctly say "zone" in
        one case and "the hub" in another across languages, so this shape
        gets its own template, authored in full, per locale. Keyed
        separately from the zone-vs-zone issue on the same entity so
        resolving one conflict cannot clear the other.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_override_conflict_line_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_override_conflict_line",
            translation_placeholders={"entity_id": entity_id, "zone": zone},
        )

    def clear_flow_line_override_conflict(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_override_conflict_line_{entity_id}")

    def report_flow_unit_lost(self, entity_id: str) -> None:
        """A meter that was readable stopped being so during a cycle.

        The repair states the standing condition; this pushes the change,
        because a run silently losing volume mode and flow anomaly detection
        halfway through is something the user has to be told about now.
        """
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(
                f"The flow sensor {entity_id} stopped reporting a usable unit "
                "of measurement mid-cycle; its readings are no longer being "
                "used. Volume mode and flow anomaly detection are off for it "
                "until its unit is set."
            ),
            name="irrigation_maestro_flow_unit_lost",
        )

    # Consumption -------------------------------------------------------------------

    def add_consumption(
        self, zone: ZoneRuntime, liters: float, *, minutes: float, had_usable_unit: bool
    ) -> None:
        """Close out a cycle's accounting for a zone with no usable meter.

        Metered litres are already in the ledger, continuously: adding them
        again here would count the same water twice. What is left is the
        estimate for a zone that has nothing to integrate -- which is a
        property of whether a meter is usable right now, not of whether this
        particular cycle happened to measure zero litres. Those are not the
        same thing: a no-flow interrupt on a zone with a perfectly usable
        meter measures a real, true zero, and booking the nominal estimate on
        top of it would put a false number on zone_water_total, a
        device_class: water / total_increasing sensor the user has chosen to
        expose on HA's own Water dashboard -- precisely the kind of
        plausible-but-false number this feature exists to remove. ``liters``
        is accepted (session.py's call site is fixed) but no longer
        consulted: usability, not this cycle's tally, decides.

        ``had_usable_unit`` is the run's own frozen answer
        (``FlowMonitor.had_usable_unit``), not a live re-read via
        ``zone_flow_meter_usable``: this is called after the valve close and
        after the monitor's own ``stop()``, a gap in which the unit can
        resolve or stop resolving without ever having mattered to the litres
        this run actually put into the ledger. A zone with no meter at all
        (no monitor was ever built) passes False here, same as before.
        """
        if had_usable_unit:
            return
        if zone.config.nominal_flow_lpm is None:
            return
        self.accountant.record_estimate(zone.config.zone_id, zone.config.nominal_flow_lpm * minutes)

    # Trackers -----------------------------------------------------------------------

    def _start_trackers(self) -> None:
        # Daily-maximum temperature tracking (persisted, restart-safe).
        self._tracker_unsubs.append(
            async_track_time_change(
                self.hass,
                self._track_temp,
                minute=list(range(0, 60, _TEMP_TRACK_MINUTES)),
                second=0,
            )
        )
        # Hourly stage-and-commit rain estimation at minute 55 (only used
        # without a physical rain sensor).
        self._tracker_unsubs.append(
            async_track_time_change(self.hass, self._stage_commit, minute=55, second=0)
        )
        # Midnight housekeeping.
        self._tracker_unsubs.append(
            async_track_time_change(self.hass, self._midnight, hour=0, minute=5, second=0)
        )
        if self.hub.rain_sensor:
            self._tracker_unsubs.append(
                async_track_state_change_event(
                    self.hass, [self.hub.rain_sensor], self._on_rain_sensor
                )
            )
        self._track_flow_sensors()

    def _flow_sensor_entities(self) -> list[str]:
        """Every configured meter, de-duplicated, in a stable order.

        Truthiness, not ``is not None``, and for the same reason as
        flow_reader_for: an empty string is a reachable way of saying "no
        meter", and subscribing to it would bind a listener to nothing.
        """
        entity_ids: list[str] = []
        for zone in self.zones.values():
            if zone.config.flow_sensor and zone.config.flow_sensor not in entity_ids:
                entity_ids.append(zone.config.flow_sensor)
        if self.hub.line_flow_sensor and self.hub.line_flow_sensor not in entity_ids:
            entity_ids.append(self.hub.line_flow_sensor)
        return entity_ids

    def _track_flow_sensors(self) -> None:
        """Watch every configured meter's state; rebuilt on every config change.

        A meter's live state feeds two things that have no other reason to
        re-run: the zone's declared degradation (rendered only on
        SIGNAL_UPDATE, since the entities do not poll) and the rescale notice.
        Without this subscription a meter that appears *after* setup -- the
        normal case for Zigbee/MQTT, whose restored states are written at
        EVENT_HOMEASSISTANT_START, i.e. after the config entries are set up --
        leaves a perfectly good meter accused of having no usable unit, and
        leaves the upgrade notice unfired on the very install it exists for.

        Rebuilt rather than added to, like _schedule_triggers, so repointing a
        zone's meter takes effect without a reload (§5). The accountant's own
        ledgers are rebuilt here too, at the end, so a config change updates
        both together -- WaterAccountant.rebuild() diffs rather than dropping
        every ledger, so a meter this change did not touch keeps its running
        total and its live subscriptions.
        """
        if self._flow_tracker_unsub is not None:
            self._flow_tracker_unsub()
            self._flow_tracker_unsub = None
        entity_ids = self._flow_sensor_entities()
        if entity_ids:
            self._flow_tracker_unsub = async_track_state_change_event(
                self.hass, entity_ids, self._on_flow_sensor
            )
        self.accountant.rebuild()

    @callback
    def _on_flow_sensor(self, event: Event[EventStateChangedData]) -> None:
        """A meter appeared, vanished, or changed the unit it declares.

        Filtered on the declared unit, not on the event: both consumers depend
        on the unit the reader resolves and on nothing else -- the litres of a
        running cycle are read straight from the reader by the session. A
        meter reporting every second would otherwise re-render every entity of
        the integration and rewrite the issue registry at 1 Hz, all to reach
        the same two conclusions.

        Both consumers re-read live state themselves, so this only has to tell
        them to look again.
        """
        if _declared_unit(event.data["old_state"]) == _declared_unit(event.data["new_state"]):
            return
        self.dispatch_update()
        self._report_rescaled_flow_meters()

    @callback
    def _track_temp(self, _now: Any) -> None:
        value = self._current_outdoor_temp()
        if value is None:
            return
        self.state.record_temp(dt_util.now().date(), value)
        self.state.schedule_save()

    def _current_outdoor_temp(self) -> float | None:
        if self.hub.outdoor_temp_sensor:
            state = self.hass.states.get(self.hub.outdoor_temp_sensor)
            if state is not None and state.state not in ("unavailable", "unknown"):
                try:
                    return float(state.state)
                except ValueError:
                    return None
            return None
        state = self.hass.states.get(self.hub.weather_entity)
        if state is None:
            return None
        try:
            return float(state.attributes.get("temperature"))
        except (TypeError, ValueError):
            return None

    @callback
    def _stage_commit(self, _now: Any) -> None:
        if self.hub.rain_sensor is not None:
            return
        self.entry.async_create_background_task(
            self.hass, self._async_stage_commit(), name="irrigation_maestro_stage"
        )

    async def _async_stage_commit(self) -> None:
        today = dt_util.now().date()
        self.state.commit_staging(today, self.hub.engine_params)
        snapshot = await self.weather.async_snapshot(dt_util.utcnow())
        if snapshot is not None and snapshot.hourly:
            self.state.set_staging(
                min(snapshot.next_hour_mm, self.hub.engine_params.hourly_staging_cap_mm)
            )
        self.state.schedule_save()
        self.dispatch_update()

    @callback
    def _on_rain_sensor(self, event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        if new_state is None or new_state.state in ("unavailable", "unknown"):
            return
        try:
            value = float(new_state.state)
        except ValueError:
            return
        self.state.set_rain_total(dt_util.now().date(), value, self.hub.engine_params)
        self.state.schedule_save()

    @callback
    def _midnight(self, _now: Any) -> None:
        today = dt_util.now().date()
        self.state.prune(today)
        self.state.prune_water(today)
        self.state.schedule_save()
        self.dispatch_update()

    # Misc -----------------------------------------------------------------------------

    def fire_event(self, event: str, payload: dict[str, Any]) -> None:
        self.hass.bus.async_fire(f"{DOMAIN}_{event}", payload)

    def dispatch_update(self) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATE, self.entry.entry_id)

    async def async_save_state(self) -> None:
        await self.state.async_save()
