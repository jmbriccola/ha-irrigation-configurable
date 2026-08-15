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
from functools import partial
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
    CONF_LEAK_ACTION,
    DOMAIN,
    LEAK_ACTION_CLOSE,
    LEAK_ACTION_CLOSE_AND_BLOCK,
    LEAK_ACTIONS,
    SUBENTRY_TYPE_ZONE,
)
from .engine.curves import CurveKind, curve_value
from .engine.evaluate import evaluate_session
from .engine.metering import HUB_SCOPE
from .engine.model import SessionEvaluation, SkipReason
from .engine.planner import PlannedRun, build_session_plan
from .engine.scheduling import split_soak
from .flow import CANONICAL_UNIT, FlowSensorReader
from .leak import SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR, LeakDetector, LeakState
from .models import CycleConfig, HubConfig, ZoneConfig
from .notify import (
    EVENT_ANOMALY,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_CONSUMPTION_BUDGET,
    EVENT_INTERRUPTED,
    EVENT_LEAK,
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
#: Notification titles. The raise and the reminder share one, so a phone that
#: groups by title groups a standing condition with its own reminders.
_LEAK_TITLE = "🚨 Irrigation: possible leak"
_LEAK_CLEARED_TITLE = "💧 Irrigation: leak condition cleared"
#: How each source reads in a message. Deliberately descriptions of what was
#: OBSERVED, not of what it means: "the valve's own sensor" is true whether
#: that sensor is a ground probe or the SWV's internal flow alarm.
_LEAK_SOURCE_PHRASES = {
    SOURCE_VALVE_SENSOR: "the valve's own sensor",
    SOURCE_NO_FLOW_CLOSED: "flow measured with every valve closed",
}
#: The reading of a ``device_class: problem`` supply sensor that means the
#: water is GONE. "on" is the problem, which is the opposite of how the
#: entity's name reads, and the mistake everyone makes on the first attempt.
_SUPPLY_MISSING = "on"
#: And the reading that means it is there. Named separately, and checked
#: for explicitly, because "not missing" is a third thing: an unavailable
#: sensor is neither.
_SUPPLY_PRESENT = "off"
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
        self._leak_detectors: dict[str, LeakDetector] = {}
        #: Zones whose outage has been ANNOUNCED -- confirmed, notified and
        #: carrying a repair notice. Memory only, and edge detection only:
        #: it decides whether a transition still has to be said out loud,
        #: never whether a cycle may start. That question is answered from
        #: live state every time it is asked.
        self._supply_announced: set[str] = set()
        self._supply_tracker_unsub: CALLBACK_TYPE | None = None
        #: One per zone whose window is running: nothing else fires when a
        #: confirmation window merely runs out.
        self._supply_wake_unsubs: dict[str, CALLBACK_TYPE] = {}
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
        # once. A migration that has already run reports nothing dropped and
        # nothing seeded, so neither the write nor the notice repeats on a
        # later setup. The save is scheduled on the removal alone -- the fact
        # of having migrated must survive a restart on its own, rather than by
        # luck of some unrelated write landing first -- while the notice is
        # gated on a balance actually having been carried: every 3.2.x install
        # has the key, and telling a user who never had a budget that their
        # total was carried forward would state a fact that did not happen.
        migrated = self.state.migrate_consumption(dt_util.now().date())
        if migrated.dropped:
            self.state.schedule_save()
        if migrated.seeded:
            self.report_consumption_history_restarted()
        self._schedule_triggers()
        self._start_trackers()
        self.accountant.start()
        # After the accountant, which owns which meter serves which scope. No
        # sample can be missed in between: every call from here to the end of
        # setup is synchronous, and a ledger publishes nothing until its first
        # tick or state event.
        self._rebuild_leak_detectors()
        self._track_water_supply_sensors()
        self.watchdog.start()
        self.sentinel.start()
        self._refresh_notification_issues()
        self._report_rescaled_flow_meters()
        self._report_invalid_leak_action()

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
        for detector in self._leak_detectors.values():
            detector.stop()
        self._leak_detectors.clear()
        if self._supply_tracker_unsub is not None:
            self._supply_tracker_unsub()
            self._supply_tracker_unsub = None
        self._cancel_supply_wakes()
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
        # After _track_flow_sensors, which rebuilds the ledgers: the detectors
        # ask the accountant which scopes still have a meter, and asking before
        # would answer from the configuration that has just been replaced.
        self._rebuild_leak_detectors()
        self._track_water_supply_sensors()
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
        self._report_invalid_leak_action()
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

    def resolved_meter_entity(self, zone: ZoneConfig) -> str | None:
        """The entity id that feeds this zone's water, or None if none does.

        The zone's own meter if it has one, else the hub's shared line meter,
        else no meter at all. The single definition of "which meter serves
        this zone" -- every caller that needs the entity id, or just needs to
        know whether one resolves, goes through this instead of repeating the
        fallback rule.

        Truthiness, not ``is not None``: update_zone writes flow_sensor
        unconditionally, so an empty string is a reachable way of saying "no
        meter". Reading it as one would suppress the fallback to the line
        meter for a zone whose meter was cleared.
        """
        return zone.flow_sensor or self.hub.line_flow_sensor or None

    def flow_reader_for(self, zone: ZoneRuntime) -> FlowSensorReader | None:
        """A reader for whichever meter serves this zone, with its own override.

        The override that applies belongs to the sensor being read: a zone
        falling back to the shared line meter takes the hub's override, not its
        own — its own describes a sensor it does not have. Which entity that is
        resolves through resolved_meter_entity; this only has to pick the
        matching override once that entity is known.
        """
        entity_id = self.resolved_meter_entity(zone.config)
        if entity_id is None:
            return None
        if zone.config.flow_sensor:
            return FlowSensorReader(self.hass, entity_id, zone.config.flow_sensor_unit)
        return FlowSensorReader(self.hass, entity_id, self.hub.line_flow_sensor_unit)

    def zone_has_flow_meter(self, zone: ZoneConfig) -> bool:
        return self.resolved_meter_entity(zone) is not None

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

    def ledger_pending(self, entity_id: str, action: str) -> bool:
        """Is a command of ours still waiting for the transition that retires it?

        Read-only, and deliberately not folded into ``ledger_expect``: a second
        entry is correct whenever a second command will produce a second
        transition. It is wrong only where one transition can retire at most
        one entry however many commands were sent -- re-closing a valve that
        two alarms both want closed -- and that caller asks here first.
        """
        cutoff = dt_util.utcnow() - timedelta(seconds=_LEDGER_TTL_S)
        return any(entry >= cutoff for entry in self._ledger.get((entity_id, action), []))

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

    def consumption_used_liters(self) -> float:
        """Attributed litres this period: the carried balance plus the daily sum.

        Derived, never stored: one number for the water, so a per-zone total and
        the budget cannot drift apart. Unattributed water is excluded on
        purpose -- letting a leak into the budget would let it suspend
        irrigation, the right consequence from the wrong cause.
        """
        today = dt_util.now().date()
        period_start = today.replace(day=1)
        return self.state.carried_over_for(period_start) + self.state.water_for_period(
            period_start, today
        )

    def _consumption_factor(self) -> tuple[float, bool]:
        """(duration_factor, suspend_all) from the consumption budget."""
        budget = self.hub.consumption_budget_liters
        used = self.consumption_used_liters()
        if budget is None or used < budget:
            return 1.0, False
        self._notify_budget_exceeded_once()
        if self.hub.consumption_action == "reduce":
            return self.hub.consumption_reduce_pct / 100, False
        if self.hub.consumption_action == "suspend":
            return 1.0, True
        return 1.0, False

    def _notify_budget_exceeded_once(self) -> None:
        used = self.consumption_used_liters()
        period = dt_util.now().date().replace(day=1).isoformat()
        if self._budget_notified_period == period:
            return
        self._budget_notified_period = period
        self.fire_event(EVENT_CONSUMPTION_BUDGET, {"liters": used})
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_CONSUMPTION_BUDGET,
                title="💧 Irrigation Maestro",
                message=(
                    f"Monthly water budget exceeded ({used:.0f} L used). "
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

        The litres already recorded -- now split between the carried-over
        opening balance and the per-zone daily history -- are deliberately
        NOT rewritten: they mix litres measured through the meter with litres
        estimated as nominal x minutes, which the defect never touched.
        Multiplying them by a single factor would be exactly the
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

        Two causes reach here, and the message must fit both: a unit that
        stopped resolving, and a meter retired mid-run because it left the
        configuration (MeterLedger.retire publishes a unit-less farewell
        sample, which is this same transition from the monitor's point of
        view). So the remedy stays general -- "set its unit" is no remedy at
        all for a sensor that is no longer configured, and handing someone a
        fix that cannot work, mid-cycle, is worse than handing them none.
        """
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(
                f"The flow sensor {entity_id} became unreadable mid-cycle "
                "(no usable unit, or no longer configured), so this run has "
                "lost its flow readings. Volume mode and flow anomaly "
                "detection are off for it until a usable flow meter is "
                "configured again."
            ),
            name="irrigation_maestro_flow_unit_lost",
        )

    # Leak detection ------------------------------------------------------------------

    def leak_scopes(self) -> list[str]:
        """Every scope a leak alarm can name: each zone, plus the hub itself.

        The same key set the unattributed water bucket uses, and deliberately
        so. HUB_SCOPE is not a fallback for "no zone configured": it is the
        answer whenever a meter serves more than one zone, where which zone
        leaks is genuinely unanswerable but whether the SYSTEM leaks is not.
        Without it, every installation on a shared line meter would have no
        source 2 at all while the documentation promised it a flow meter was
        enough -- a false claim about a safety feature.

        Always present, even when no meter currently resolves to it, so the
        state is queryable at all times and a configuration change cannot
        silently remove an alarm's home.
        """
        return [*self.zones, HUB_SCOPE]

    def _rebuild_leak_detectors(self) -> None:
        """One detector per scope, rebuilt by diffing rather than by replacing.

        A detector holds a live alarm and a confirmation window in progress.
        Dropping and recreating the whole set on every configuration change --
        even one that touches no leak setting -- would silently clear an active
        alarm and restart a window that was seconds from confirming, which is
        the same defect WaterAccountant.rebuild avoids for its ledgers. So a
        surviving scope keeps its detector and is only told to re-resolve its
        sources; only a scope that left the configuration is stopped and
        dropped.
        """
        scopes = self.leak_scopes()
        metered = self.accountant.metered_scopes()
        for scope in list(self._leak_detectors):
            if scope not in scopes:
                self._leak_detectors.pop(scope).stop()
                # A dropped detector never withdraws -- stop() only cancels its
                # subscriptions -- so this is the only place its Repairs issue
                # can ever be deleted. Without it, removing a zone that was
                # alarming leaves an issue nothing can take down.
                ir.async_delete_issue(self.hass, DOMAIN, self._leak_issue_id(scope))
        for scope in scopes:
            detector = self._leak_detectors.get(scope)
            if detector is None:
                detector = LeakDetector(self, scope)
                self._leak_detectors[scope] = detector
            detector.start(has_meter=scope in metered)
        self._reconcile_leak_issues()

    def _reconcile_leak_issues(self) -> None:
        """Delete the issue of every scope that is not actually alarming.

        The alarm lives in memory and the issue registry does not, so a restart
        (or an alarm that ended while Home Assistant was down) would otherwise
        leave an issue standing with nothing behind it and no path left that
        could delete it. Run after ``start()``, which re-judges every source
        from live state and can raise on the spot, so a leak that is still
        present keeps the issue it just re-created.

        Deletion only: an issue is created by the raise, together with the
        notification that belongs to the same transition. Creating one here
        would be a second author for the same fact.
        """
        for scope, detector in self._leak_detectors.items():
            if not detector.state.active:
                ir.async_delete_issue(self.hass, DOMAIN, self._leak_issue_id(scope))

    def leak_detector(self, scope: str) -> LeakDetector | None:
        """The detector for a scope, or None when the scope names nothing.

        WaterAccountant feeds source 2 through this, keyed by the scope of the
        meter that reported -- a zone id when exactly one zone is behind that
        meter, HUB_SCOPE otherwise.
        """
        return self._leak_detectors.get(scope)

    def leak_state(self, scope: str) -> LeakState:
        """A scope's alarm. A scope with no detector is simply not alarming."""
        detector = self._leak_detectors.get(scope)
        return detector.state if detector is not None else LeakState()

    def _leak_subject(self, scope: str) -> str:
        """Who an alarm is about, for a log line: a zone's name, or the system.

        HUB_SCOPE must never be printed as though it were a zone id. It means
        the water was seen on a meter shared by several zones (or by none), so
        the honest subject is the installation itself.
        """
        if scope == HUB_SCOPE:
            return "the system (shared meter)"
        zone = self.zones.get(scope)
        return zone.config.name if zone else scope

    def on_leak_raised(self, scope: str, state: LeakState) -> None:
        """The alarm went false -> true, once, for however many sources agree.

        Everything the user sees hangs off this one transition: the event, the
        notification, the Repairs issue that outlives it, and the configured
        action. A second source arriving later adds itself to ``sources`` and
        reaches none of them, which is the whole point of one alarm per scope.
        """
        _LOGGER.warning(
            "Leak alarm raised on %s by %s", self._leak_subject(scope), state.first_source
        )
        self._fire_leak_event(scope, state, "active")
        self._create_leak_issue(scope, state)
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_TITLE, message=self._leak_raised_message(scope, state)
        )
        if self.hub.leak_action in (LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK):
            self.entry.async_create_background_task(
                self.hass,
                self.async_close_for_leak(scope),
                name="irrigation_maestro_leak_close",
            )
        self.dispatch_update()

    def on_leak_repeated(self, scope: str, state: LeakState) -> None:
        """Still leaking, one leak_repeat_min later.

        No event is fired: an automation consuming the event stream counts
        alarms, and a reminder is not a second alarm -- that is the whole point
        of unifying the sources. No second re-close either: the action is one
        attempt per alarm, not a retry loop against a valve that has already
        been told.
        """
        _LOGGER.warning(
            "%s is still reporting a leak (sources: %s)",
            self._leak_subject(scope),
            ", ".join(sorted(state.sources)),
        )
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_TITLE, message=self._leak_repeated_message(scope, state)
        )

    def on_leak_cleared(self, scope: str, state: LeakState) -> None:
        """The last source withdrew: close the event, the issue and the notice.

        ``state`` is the alarm as it was immediately before clearing, so the
        event says what kind of leak has ended rather than only that one has.
        """
        _LOGGER.warning("Leak alarm cleared on %s", self._leak_subject(scope))
        self._fire_leak_event(scope, state, "cleared")
        ir.async_delete_issue(self.hass, DOMAIN, self._leak_issue_id(scope))
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_CLEARED_TITLE, message=self._leak_cleared_message(scope)
        )
        self.dispatch_update()

    def on_leak_sources_changed(self, scope: str, state: LeakState) -> None:
        """A source stopped contributing, and the alarm survived on another.

        Not a new alarm and not the end of one, so it fires no event, sends no
        notification, and touches neither ``since`` nor the reminder cadence --
        that timer is armed in ``LeakDetector._raise`` and re-armed only by its
        own expiry, and nothing here goes near it. What can change is the
        DESCRIPTION, and only when the source the standing text cites is the
        one that has gone quiet: see ``LeakState.describing_source``.

        Deleted and recreated rather than updated in place. Home Assistant's
        ``async_create_issue`` upserts, but the upsert preserves both the
        issue's creation time and its DISMISSAL -- so a notice the user
        dismissed under the old diagnosis would stay dismissed under the new
        one, and the correction they most need to read is the one they would
        never see. It reads as new because it genuinely is new evidence.

        Guarded on the key actually changing, so a source merely joining (which
        cannot change the description while the first one still contributes)
        costs nothing.
        """
        if not state.active:
            return
        issue_id = self._leak_issue_id(scope)
        existing = ir.async_get(self.hass).async_get_issue(DOMAIN, issue_id)
        if existing is None or existing.translation_key != self._leak_translation_key(scope, state):
            _LOGGER.warning(
                "Leak alarm on %s now rests on %s; re-describing the repair notice",
                self._leak_subject(scope),
                ", ".join(sorted(state.sources)),
            )
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)
            self._create_leak_issue(scope, state)
        self.dispatch_update()

    def _create_leak_issue(self, scope: str, state: LeakState) -> None:
        """The one place a leak repair notice is built."""
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            self._leak_issue_id(scope),
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key=self._leak_translation_key(scope, state),
            translation_placeholders=self._leak_placeholders(scope),
        )

    def _notify_leak(self, event: str, *, title: str, message: str) -> None:
        """Push one leak notice. The hooks are callbacks; this cannot await."""
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(event, title=title, message=message),
            name="irrigation_maestro_notify_leak",
        )

    @staticmethod
    def _leak_issue_id(scope: str) -> str:
        return f"leak_{scope}"

    @staticmethod
    def _leak_translation_key(scope: str, state: LeakState) -> str:
        """Which authored template this alarm gets.

        Three of them, not one with placeholders, for the reason
        ``flow_unit_override_conflict_line`` already exists separately from
        ``flow_unit_override_conflict``: a placeholder is plain string
        substitution, so a template cannot say "zone Alpha" in one case and
        "the system" in another, nor name a different sensor per source,
        across two languages. Each shape is authored in full, per locale.

        A hub scope has no leak sensor to resolve -- ``LeakDetector`` never
        subscribes to one without a zone -- so its only reachable source is
        flow, and it takes the system template whatever the sources say.

        Keyed on ``describing_source``, not on ``first_source``: the template
        names a sensor and tells the user what makes the notice go away, so it
        has to describe evidence that still exists. ``first_source`` remains
        the honest answer to "who noticed first" -- it is what the leak event
        carries -- but a zone whose meter has been removed while its valve
        sensor holds the alarm up would otherwise keep a template about flow
        measurement, promising to clear when the meter is removed, which is
        exactly what already happened.
        """
        if scope == HUB_SCOPE:
            return "leak_system_flow"
        if state.describing_source == SOURCE_VALVE_SENSOR:
            return "leak_zone_valve_sensor"
        return "leak_zone_flow"

    def _leak_placeholders(self, scope: str) -> dict[str, str]:
        """The system template names no zone, so it is given no placeholder.

        Home Assistant renders the template it is handed; an unused
        placeholder is harmless, but a template written with none must not be
        handed a zone name it might one day be tempted to interpolate.
        """
        if scope == HUB_SCOPE:
            return {}
        zone = self.zones.get(scope)
        return {"zone": zone.config.name if zone else scope}

    def _leak_raised_message(self, scope: str, state: LeakState) -> str:
        """What is KNOWN, in wording true for both readings of the sensor.

        A ``device_class: moisture`` sensor on a valve is not necessarily a
        ground probe: on the SONOFF SWV it is an alarm derived from the valve's
        own internal flow meter -- "water is passing while I am closed" --
        mapped to the nearest available class, while on other hardware it
        really is a probe. "Water detected on the ground" would be false for
        half of all installations, so the message says the valve reports a
        leak and stops there.

        The scope decides the subject. A hub alarm cannot name a zone, because
        water on a meter serving more than one zone genuinely does not say
        which of them leaks -- and claiming one would send the user digging in
        the wrong flowerbed.
        """
        if scope == HUB_SCOPE:
            detail = (
                "Possible leak in the irrigation system -- water is flowing while "
                "every valve reports closed. The meter that measured it does not "
                "belong to a single zone, so which zone is leaking cannot be told."
            )
        elif state.describing_source == SOURCE_VALVE_SENSOR:
            # Same rule as the repair template, and identical to first_source
            # at the only moment this is sent: a description cites evidence
            # that exists, so the two must not diverge if this is ever reused.
            detail = (
                f"{self._zone_name(scope)}: possible leak -- the valve of this zone "
                "reports a leak while it is closed."
            )
        else:
            detail = (
                f"{self._zone_name(scope)}: possible leak -- water is flowing while "
                "every valve reports closed."
            )
        return f"{detail} {self._leak_action_note()}"

    def _leak_repeated_message(self, scope: str, state: LeakState) -> str:
        """The reminder, and the only place a second source ever surfaces.

        It stayed silent when it arrived -- one alarm, one notification -- so
        the reminder lists every source currently reporting rather than only
        the one that raised the alarm.

        The timestamp is when detection CONFIRMED the leak, which is not when
        the water started and must never be offered as though it were: the
        alarm is memory-only, so a restart or a de-configure-and-restore yields
        a fresh one for a leak that never stopped. It carries its date as well
        as its time, because at the default six-hour interval the second
        reminder already shows a time a reader would otherwise take for today.

        It carries the action note too. This is the one message a standing
        alarm keeps sending, so a close_and_block user who reads only reminders
        would otherwise never be told that cycles are being refused.
        """
        sources = ", ".join(
            _LEAK_SOURCE_PHRASES.get(source, source) for source in sorted(state.sources)
        )
        confirmed = (
            ""
            if state.since is None
            else f" Confirmed at {dt_util.as_local(state.since):%Y-%m-%d %H:%M} "
            "(when detection confirmed it, not when the water started)."
        )
        subject = "The irrigation system" if scope == HUB_SCOPE else self._zone_name(scope)
        return (
            f"{subject}: still reporting a leak ({sources}).{confirmed} {self._leak_action_note()}"
        )

    def _leak_cleared_message(self, scope: str) -> str:
        """Deliberately says only that the alarm ended.

        An alarm is withdrawn by evidence that the water stopped OR by its last
        source leaving the configuration, and a message claiming the sensor now
        reports no leak would be false in the second case.

        The resume clause is gated on the zones this alarm implicated actually
        becoming free, not merely on the action being close_and_block. One
        physical leak on an ordinary topology -- a zone with its own leak
        sensor behind a shared line meter -- raises a zone alarm AND a hub
        alarm; the zone's sensor recovering clears only the first, and telling
        the user cycles resume while the hub alarm still blocks that zone and
        its neighbours would be false at the instant it is sent. The detector
        has already reset its state before calling this, so the question is
        answered against the alarms that remain.
        """
        subject = "The irrigation system" if scope == HUB_SCOPE else self._zone_name(scope)
        if self.hub.leak_action != LEAK_ACTION_CLOSE_AND_BLOCK:
            blocking = ""
        elif set(self.leak_zone_ids(scope)) & self.leak_blocked_zone_ids():
            blocking = " New cycles are still blocked by another leak alarm."
        else:
            blocking = " New cycles are allowed again."
        return f"{subject}: the leak condition has cleared.{blocking}"

    def _leak_action_note(self) -> str:
        """What the configured action is doing, right now, and nothing more.

        Two things it must not claim. Closing a valve that is already closed is
        a no-op, and the component cannot stop a leak it detects while idle --
        it can only report it and re-assert the closure; the user chose this
        default after being shown that trade-off, and a message implying the
        water has been dealt with would undo it.

        And it must not assert a close that ``async_close_for_leak``
        deliberately skips. A running session is not an edge case here: it is
        precisely the scenario the skip exists for, a zone's own sensor
        alarming while a different zone waters. ``session.active`` is read in
        the same turn that schedules the attempt, so the message and the action
        agree about what is being done.
        """
        action = self.hub.leak_action
        if action not in (LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK):
            return "Configured action: notify only."
        prefix = (
            "Configured action: close and block"
            if action == LEAK_ACTION_CLOSE_AND_BLOCK
            else "Configured action: close"
        )
        if self.session.active:
            attempt = (
                " -- the re-close is skipped because a cycle is running: re-asserting "
                "the closure would abort a cycle on a zone nothing has implicated."
            )
        else:
            attempt = (
                " -- the master and the implicated valve are commanded closed again. "
                "That recovers a valve left open by a command that never landed; it "
                "cannot stop water passing a valve already shut."
            )
        # Present tense, and no undertaking about how long it will last. The
        # block follows the alarm AND the configured action, and the action is
        # a setting the user can change while the alarm still stands -- so a
        # message promising the block for the alarm's whole duration is one
        # they can falsify from the settings page a minute later.
        blocked = (
            " No new cycle starts for the zones concerned."
            if action == LEAK_ACTION_CLOSE_AND_BLOCK
            else ""
        )
        return f"{prefix}{attempt}{blocked}"

    def _zone_name(self, zone_id: str) -> str:
        zone = self.zones.get(zone_id)
        return zone.config.name if zone else zone_id

    # What the alarm does ---------------------------------------------------------------

    def leak_zone_ids(self, scope: str) -> list[str]:
        """Which zones an alarm on this scope implicates.

        A zone scope implicates that zone. A hub scope implicates every zone
        whose meter reports under HUB_SCOPE -- exactly the set that could be
        leaking, resolved through the accountant's own scope rule so the zones
        an alarm names can never disagree with the zones its litres came from.

        When no zone resolves to such a meter at all (every zone has its own,
        and a line meter measures the whole installation on top), the honest
        answer is every zone: that meter sits upstream of all of them, and an
        empty set would make the alarm's consequences vanish on precisely the
        topology where it is least able to point at anyone.
        """
        if scope != HUB_SCOPE:
            return [scope] if scope in self.zones else []
        served = [
            zone_id
            for zone_id, zone in self.zones.items()
            if (meter := self.resolved_meter_entity(zone.config)) is not None
            and self.accountant.scope_for(meter) == HUB_SCOPE
        ]
        return served or list(self.zones)

    def leak_blocked_zone_ids(self) -> set[str]:
        """Every zone close_and_block currently refuses to start a cycle for.

        Empty under any other action, so the block is a property of the
        configuration and the live alarms together -- changing the action
        releases the block at once, with no state to unwind.
        """
        if self.hub.leak_action != LEAK_ACTION_CLOSE_AND_BLOCK:
            return set()
        blocked: set[str] = set()
        for scope, detector in self._leak_detectors.items():
            if detector.state.active:
                blocked.update(self.leak_zone_ids(scope))
        return blocked

    def leak_block_active(self, zone_id: str) -> bool:
        """Is this zone currently refused a new cycle by a leak alarm?

        The session's own gate. Asked per segment rather than per session, so a
        zone blocked by an alarm that raised while the queue was running is
        refused at the moment it would open a valve.
        """
        return zone_id in self.leak_blocked_zone_ids()

    async def async_close_for_leak(self, scope: str) -> None:
        """One re-close attempt of the master and the implicated valves.

        Honestly bounded: closing a valve that is already closed is a no-op,
        and the component cannot stop a leak it detects while idle. What this
        genuinely recovers is a valve left open by a command that never landed
        -- most plausibly the master, since source 2 needs every valve closed
        before it will confirm anything, while a zone's own sensor needs only
        its own. It does not repair a seeping seat and must not pretend to.

        Skipped entirely while a session is running. ``close`` promises that
        cycles continue, the session owns every managed valve while it runs,
        and a zone's sensor can alarm while a DIFFERENT zone waters -- so
        closing the master here would abort a legitimate cycle on a zone
        nothing has implicated. The alarm persists and says so; the water does
        not become our excuse for stopping someone else's watering.

        Ledger-registered, and guarded on ``is_closed`` for the same reason
        every other close path is: a command to an already-closed valve
        produces no transition, so its entry would sit for the whole TTL and
        absorb the next genuine manual close.

        Guarded on a pending entry for the same reason, one step further out.
        Two zone alarms can raise in the same turn -- the shared-line topology
        makes that ordinary -- and both would find the master open and both arm
        an entry, while the single close that follows can retire only one. The
        survivor is exactly the trap the ``is_closed`` guard exists to avoid,
        arriving through a second alarm instead of a second call.
        """
        if self.session.active:
            _LOGGER.warning(
                "Leak alarm on %s: not re-closing while a cycle is running",
                self._leak_subject(scope),
            )
            return
        controllers = [self.zones[zone_id].valve for zone_id in self.leak_zone_ids(scope)]
        if self.master_controller is not None:
            controllers.append(self.master_controller)
        for controller in controllers:
            if controller.is_closed or self.ledger_pending(controller.entity_id, "close"):
                continue
            self.ledger_expect(controller.entity_id, "close")
            await controller.async_close()

    def _report_invalid_leak_action(self) -> None:
        """A rejected leak_action must leave a trace.

        ``leak_action_from_config`` falls back to ``close`` rather than
        refusing to load the integration, which is right -- but silently, so a
        user who mistypes the action believes they configured one thing and
        gets another, with the failure least visible exactly where it matters
        most. The service schema cannot be the whole answer: options also
        arrive through import_config and through a hand-edited entry.
        """
        raw = self.entry.options.get(CONF_LEAK_ACTION)
        if raw is None or str(raw) in LEAK_ACTIONS:
            ir.async_delete_issue(self.hass, DOMAIN, "leak_action_invalid")
            return
        _LOGGER.warning(
            "Unrecognised leak_action %r; using %s instead", str(raw), self.hub.leak_action
        )
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "leak_action_invalid",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="leak_action_invalid",
            translation_placeholders={"value": str(raw)},
        )

    def _fire_leak_event(self, scope: str, state: LeakState, phase: str) -> None:
        """The one place the leak payload is built.

        ``zone_id`` is None for a hub-scope alarm rather than carrying
        HUB_SCOPE, so an automation that reads it cannot address a zone that
        was never implicated. ``scope`` always carries the real key.
        """
        self.fire_event(
            EVENT_LEAK,
            {
                "scope": scope,
                "zone_id": None if scope == HUB_SCOPE else scope,
                "state": phase,
                "first_source": state.first_source,
                "sources": sorted(state.sources),
            },
        )

    # The water supply: source 3, and not a leak ---------------------------------------

    def water_supply_sensor(self, zone_id: str) -> str | None:
        """This zone's supply sensor entity id, or None where there is none.

        Truthiness, not ``is not None``: ``update_zone`` stores "" as the way of
        clearing the key, so an empty string means the user has no sensor here.

        One resolver, because "has this zone a supply sensor" and "which sensor"
        are the same question and were being spelled out separately at every
        site that asked either. A caller that only needs the first asks
        ``is not None``.
        """
        zone = self.zones.get(zone_id)
        sensor = zone.config.water_supply_sensor if zone else None
        return sensor or None

    def water_supply_missing(self, zone_id: str) -> bool:
        """True only on hard evidence that the water is gone.

        ``device_class: problem`` inverts the polarity the entity's name
        suggests: ``on`` is the PROBLEM, so on means NO water. Every use of
        this predicate has to read correctly against that, and the name of the
        sensor is not the thing to read it against.

        Anything else -- no sensor configured, an entity that never turned up,
        ``unavailable``, ``unknown`` -- is not evidence and answers False.
        Uncertainty resolves to the side that keeps watering, because the
        alternative is a flaky sensor drying the garden: the failure this
        feature must not introduce while removing another.
        """
        return self._water_supply_alarm(zone_id) is not None

    def water_supply_block_active(self, zone_id: str) -> bool:
        """Is this zone currently refused a new cycle for want of water?

        Prolonged confirmation, chosen over both "block immediately" and
        "never block": a single flaky reading must not withhold water, and a
        genuine outage should not cost a pointless valve actuation and an
        interrupted cycle either.

        The elapsed time is the sensor state's own ``last_changed``, so there
        is nothing of ours to keep, restart or drift. After a restart a
        restored state's ``last_changed`` is the restore, so the clock starts
        again -- the safe direction, since we do not know how long the supply
        has been out and must not withhold water on a guess.

        ``require_water_supply`` switches this gate off, because a flaky sensor
        must not be able to stop the system without appeal. It does not switch
        off the repair notice or its notification: those report a condition,
        and a user who has chosen to keep watering through it is still entitled
        to know it is there.

        The window is shared with that notice and with nothing else. Explaining
        a zero-flow interrupt (see SessionRunner) reads ``water_supply_missing``
        directly: that describes an event that has already happened, and the
        reading at that moment is the evidence for it.
        """
        return self.hub.require_water_supply and self._water_supply_confirmed(zone_id)

    def _water_supply_confirmed(self, zone_id: str) -> bool:
        """Has the outage stood long enough to be asserted as a present fact?

        The bar for saying "the supply is out", whether the saying withholds
        water (the gate above) or merely tells the user (the repair notice and
        its notification). Both assert the same present fact, so both need the
        same evidence; only the diagnosis of an interruption that has already
        happened is exempt, because there the reading at that moment IS the
        evidence and a window would blur a precise answer into a generic one.
        """
        remaining_s = self._water_supply_remaining_s(zone_id)
        return remaining_s is not None and remaining_s <= 0

    def _water_supply_remaining_s(self, zone_id: str) -> float | None:
        """Seconds still to run before this zone's outage may be asserted.

        ``None`` when there is nothing to assert -- no sensor, or a sensor not
        reporting the water gone. Zero or below means confirmed.

        One expression of the threshold, not two. The announcement needs the
        remaining seconds anyway, to arm the wake that fires when the window
        merely runs out, and a second comparison written beside it is a second
        place for the two answers to drift apart.

        Read from the sensor state's own ``last_changed``, so there is nothing
        of ours to keep, restart or drift. After a restart a restored state's
        ``last_changed`` is the restore, so the clock starts again.
        """
        state = self._water_supply_alarm(zone_id)
        if state is None:
            return None
        elapsed_s = (dt_util.utcnow() - state.last_changed).total_seconds()
        return self.hub.water_supply_confirm_s - elapsed_s

    def _water_supply_alarm(self, zone_id: str) -> State | None:
        """This zone's supply sensor, but only while it reports no water.

        One resolver for both questions above, so "is the water gone" and "how
        long has it been gone" can never be answered from different readings.
        """
        sensor = self.water_supply_sensor(zone_id)
        if sensor is None:
            # A zone that says it has no supply sensor can never be one whose
            # supply is known to be missing.
            return None
        state = self.hass.states.get(sensor)
        return state if state is not None and state.state == _SUPPLY_MISSING else None

    def _water_supply_restored(self, zone_id: str) -> bool:
        """Evidence that an announced outage is over. Silence is not evidence.

        Two things qualify: the sensor saying the water is there, and the
        sensor being de-configured -- the user's own statement, and the only
        thing that could ever take down a notice raised by a source they have
        since removed.

        ``unavailable``, ``unknown`` and an entity that has vanished do NOT
        qualify, and this is the whole reason the check is written as "reads
        present" rather than "does not read missing". A sensor going quiet is
        not the water coming back, and a notice withdrawn on silence would
        assert exactly that -- while the message announcing it would be false
        at the instant it was sent.
        """
        sensor = self.water_supply_sensor(zone_id)
        if sensor is None:
            return True
        state = self.hass.states.get(sensor)
        return state is not None and state.state == _SUPPLY_PRESENT

    def _water_supply_entities(self) -> list[str]:
        """Every configured supply sensor, de-duplicated, in a stable order."""
        entity_ids: list[str] = []
        for zone_id in self.zones:
            sensor = self.water_supply_sensor(zone_id)
            if sensor is not None and sensor not in entity_ids:
                entity_ids.append(sensor)
        return entity_ids

    def _track_water_supply_sensors(self) -> None:
        """Watch every configured supply sensor; rebuilt on every config change.

        Rebuilt rather than added to, like the meters and the triggers, so a
        repointed sensor takes effect without a reload (§5).

        The re-evaluation that follows is what makes the notice honest in the
        two cases a subscription alone cannot cover: a supply already missing
        when Home Assistant starts has no transition left to make, and a sensor
        the user has just REMOVED would otherwise leave a repair notice with
        nothing behind it that could ever take it down.
        """
        if self._supply_tracker_unsub is not None:
            self._supply_tracker_unsub()
            self._supply_tracker_unsub = None
        entity_ids = self._water_supply_entities()
        if entity_ids:
            self._supply_tracker_unsub = async_track_state_change_event(
                self.hass, entity_ids, self._on_water_supply_sensor
            )
        self._cancel_supply_wakes()
        for zone_id in list(self._supply_announced - set(self.zones)):
            # A zone that has left the configuration cannot clear its own
            # notice: nothing subscribes for it any more and nothing will ever
            # evaluate it again. This is the only place it can be taken down.
            self._supply_announced.discard(zone_id)
            ir.async_delete_issue(self.hass, DOMAIN, self._water_supply_issue_id(zone_id))
        for zone_id in self.zones:
            self._evaluate_water_supply(zone_id)

    @callback
    def _on_water_supply_sensor(self, _event: Event[EventStateChangedData]) -> None:
        """Re-judge every zone, not only the one whose sensor moved.

        Two zones behind one supply sensor is an ordinary topology -- a single
        mains-pressure switch for the whole garden -- and mapping the entity
        back to its zones would be a second copy of a relation the zone configs
        already hold. Re-reading a handful of states costs nothing.
        """
        for zone_id in self.zones:
            self._evaluate_water_supply(zone_id)

    def _evaluate_water_supply(self, zone_id: str) -> None:
        """Announce a confirmed outage, and take the notice down when it ends.

        A supply anomaly, not a leak: it goes on the anomaly channel and gets
        its own repair. Routing it through the leak event would count an outage
        as a leak in every automation that consumes that stream, and the two
        are opposites -- one is water where it should not be, the other is no
        water at all.

        Announced only once the outage has been confirmed, on the same window
        that gates the refusal to start. Both assert "the supply is out" as a
        present fact, so both need the same evidence: a sensor flapping every
        half minute would otherwise produce a notification pair every half
        minute, which is the alarm fatigue the rest of this feature's design
        exists to prevent.

        Withdrawn promptly, with no window at all, because the water returning
        is itself the evidence -- and withdrawn only on evidence: see
        ``_water_supply_restored``.
        """
        self._cancel_supply_wake(zone_id)
        announced = zone_id in self._supply_announced
        remaining_s = self._water_supply_remaining_s(zone_id)
        if remaining_s is None:
            if announced and self._water_supply_restored(zone_id):
                self._withdraw_water_supply(zone_id)
            return
        if announced:
            return  # already said, and a standing condition says it once
        if remaining_s <= 0:
            self._announce_water_supply(zone_id)
            return
        # Nothing else fires when the window merely runs out -- the sensor has
        # already made the only state change it is going to make -- so ask to
        # be woken exactly then and judge again from live state.
        self._supply_wake_unsubs[zone_id] = async_call_later(
            self.hass, remaining_s, partial(self._on_supply_wake, zone_id)
        )

    @callback
    def _on_supply_wake(self, zone_id: str, _now: datetime) -> None:
        self._supply_wake_unsubs.pop(zone_id, None)
        self._evaluate_water_supply(zone_id)

    def _cancel_supply_wake(self, zone_id: str) -> None:
        unsub = self._supply_wake_unsubs.pop(zone_id, None)
        if unsub is not None:
            unsub()

    def _cancel_supply_wakes(self) -> None:
        for unsub in self._supply_wake_unsubs.values():
            unsub()
        self._supply_wake_unsubs.clear()

    def _announce_water_supply(self, zone_id: str) -> None:
        name = self._zone_name(zone_id)
        self._supply_announced.add(zone_id)
        _LOGGER.warning("No water supply reported for %s", name)
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            self._water_supply_issue_id(zone_id),
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="water_supply_missing",
            translation_placeholders={"zone": name},
        )
        # Present tense, and no promise about what happens next. The refusal
        # ends when the water returns, but it also ends if this sensor simply
        # goes quiet -- withholding water needs positive evidence that there is
        # none -- and a snapshot must not undertake to keep refusing.
        gate = (
            " No new cycle starts for this zone."
            if self.hub.require_water_supply
            else " Cycles still start: the water-supply gate is switched off."
        )
        self._notify_water_supply(
            f"{name}: no water supply -- the zone's sensor reports the water is gone.{gate}"
        )

    def _withdraw_water_supply(self, zone_id: str) -> None:
        """The notice comes down, and the message says which of the two ended it.

        A sensor the user removed is not the water coming back, and one
        message for both would be false in the second case -- the same defect
        the leak notices were corrected for.
        """
        name = self._zone_name(zone_id)
        self._supply_announced.discard(zone_id)
        _LOGGER.warning("The no-water condition has ended for %s", name)
        ir.async_delete_issue(self.hass, DOMAIN, self._water_supply_issue_id(zone_id))
        if self.water_supply_sensor(zone_id) is not None:
            ended = f"{name}: the water supply is back."
        else:
            ended = (
                f"{name}: the water-supply sensor has been removed, so the "
                "missing supply is no longer reported."
            )
        resumed = (
            " Cycles are no longer refused for lack of water."
            if self.hub.require_water_supply
            else ""
        )
        self._notify_water_supply(f"{ended}{resumed}")

    def _notify_water_supply(self, message: str) -> None:
        """One supply notice. The callers are callbacks; they cannot await."""
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(message),
            name="irrigation_maestro_water_supply",
        )
        self.dispatch_update()

    @staticmethod
    def _water_supply_issue_id(zone_id: str) -> str:
        return f"water_supply_missing_{zone_id}"

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
        on the unit the reader resolves and on nothing else -- a running
        cycle's litres come from the meter's ledger, which the reader feeds
        continuously, not from this signal. A meter reporting every second
        would otherwise re-render every entity of the integration and rewrite
        the issue registry at 1 Hz, all to reach the same two conclusions.

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
