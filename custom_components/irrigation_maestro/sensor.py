"""Sensors: hub evaluation values, session status, per-zone state/next/outcome.

States and attributes follow docs/design/card-contract.md exactly — the card
is built against them.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import UnitOfPrecipitationDepth, UnitOfTemperature, UnitOfVolume
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import sun
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from . import IrrigationConfigEntry
from .capabilities import resolve_zone_capabilities
from .const import TRIGGER_KIND_SUN, TRIGGER_KIND_TIME
from .engine.calendar import calendar_allows
from .engine.curves import CurveKind
from .entity import (
    MaestroHubEntity,
    MaestroZoneEntity,
    async_add_zone_entities,
    async_ensure_hub_device,
)
from .models import CycleConfig, CycleTrigger, ZoneConfig
from .runtime import IrrigationRuntime
from .session import PHASE_WATERING

_EVALUATING_WINDOW_S = 60


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the hub and zone sensors."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)

    hub_entities: list[Entity] = [
        HubWaterBudgetSensor(runtime),
        HubSkipThresholdSensor(runtime),
        HubWeightedTempSensor(runtime),
        HubSessionSensor(runtime),
    ]
    # Always created: it reports "unavailable" until a budget is configured,
    # so enabling the budget later via options needs no reload.
    hub_entities.append(HubConsumptionLeftSensor(runtime))
    hub_entities.append(HubUnattributedWaterSensor(runtime))
    async_add_entities(hub_entities)

    def _zone_sensors(zone_id: str) -> list[Entity]:
        return [
            ZoneStateSensor(runtime, zone_id),
            ZoneNextRunSensor(runtime, zone_id),
            ZoneLastOutcomeSensor(runtime, zone_id),
            ZoneWaterTotalSensor(runtime, zone_id),
        ]

    async_add_zone_entities(hass, entry, async_add_entities, _zone_sensors)


# Hub sensors -----------------------------------------------------------------


class HubWaterBudgetSensor(MaestroHubEntity, SensorEntity):
    """The computed water budget (mm) with its rain/forecast inputs."""

    _attr_device_class = SensorDeviceClass.PRECIPITATION
    _attr_native_unit_of_measurement = UnitOfPrecipitationDepth.MILLIMETERS
    _attr_suggested_display_precision = 2

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_water_budget")

    @property
    def native_value(self) -> float | None:
        evaluation = self._runtime.last_evaluation
        return None if evaluation is None else round(evaluation.water_budget, 2)

    def _role_attributes(self) -> dict[str, Any]:
        evaluation = self._runtime.last_evaluation
        if evaluation is None:
            return {}
        return {
            "rain_today": evaluation.rain_today,
            "rain_d1": evaluation.rain_d1,
            "rain_d2": evaluation.rain_d2,
            "rain_d3": evaluation.rain_d3,
            "forecast_0_24": evaluation.forecast_0_24,
            "forecast_24_48": evaluation.forecast_24_48,
            "forecast_credit": round(evaluation.forecast_credit, 2),
            # The evaluation's own verdict, which was reachable only through
            # the `evaluate` service response -- so a card could draw the
            # budget against the threshold and still not say WHY the system
            # would skip. It lives here beside the evaluation's other derived
            # values (forecast_credit is no more a "budget" than this is).
            #
            # The reason may have nothing to do with the budget -- `wind`,
            # `frost_risk` -- because it is the SESSION EVALUATION's verdict,
            # not the budget's. `None` means it would water; the attribute
            # being absent entirely means nothing has been evaluated yet, and
            # the two must not be conflated.
            "skip_reason": str(evaluation.skip_reason) if evaluation.skip_reason else None,
        }


class HubSkipThresholdSensor(MaestroHubEntity, SensorEntity):
    """The temperature-dependent skip threshold (mm)."""

    _attr_device_class = SensorDeviceClass.PRECIPITATION
    _attr_native_unit_of_measurement = UnitOfPrecipitationDepth.MILLIMETERS
    _attr_suggested_display_precision = 2

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_skip_threshold")

    @property
    def native_value(self) -> float | None:
        evaluation = self._runtime.last_evaluation
        return None if evaluation is None else round(evaluation.skip_threshold, 2)


class HubWeightedTempSensor(MaestroHubEntity, SensorEntity):
    """The weighted temperature (°C) driving the curves."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_weighted_temp")

    @property
    def native_value(self) -> float | None:
        evaluation = self._runtime.last_evaluation
        return None if evaluation is None else evaluation.weighted_temp

    def _role_attributes(self) -> dict[str, Any]:
        evaluation = self._runtime.last_evaluation
        if evaluation is None:
            return {}
        temp_d3, temp_d2, temp_d1, _today = self._runtime.state.temps_for(dt_util.now().date())
        return {
            "temp_d3": temp_d3,
            "temp_d2": temp_d2,
            "temp_d1": temp_d1,
            "temp_today_eff": evaluation.today_max_eff,
            "temp_tomorrow": evaluation.tomorrow_max,
            "stale_weather": evaluation.stale_weather,
            # The CONFIGURED weights, in the order of the five values above.
            # Deliberately not the effective ones: weighted_temperature
            # renormalises over the days that are available, redistributing a
            # missing day's weight rather than counting it as 0 °C. Computing
            # that here would be a second implementation of a rule that lives
            # in a frozen engine file -- the defect resolved_meter_entity and
            # scope_for each exist to have removed. A card must therefore mark
            # a missing day AS missing instead of presenting its configured
            # weight as the one that applied.
            "temp_weights": list(self._runtime.hub.engine_params.temp_weights),
            # The source behind all of it. Published here so a card does not
            # have to fetch the whole export_config payload to learn one id.
            "weather_entity": self._runtime.hub.weather_entity,
        }


class HubSessionSensor(MaestroHubEntity, SensorEntity):
    """The session runner: idle / evaluating / running, with the live queue."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_session")

    @property
    def native_value(self) -> str:
        session = self._runtime.session
        if session.active or session.active_runs:
            return "running"
        if (
            session.evaluation is not None
            and session.started_at is not None
            and dt_util.utcnow() - session.started_at < timedelta(seconds=_EVALUATING_WINDOW_S)
        ):
            return "evaluating"
        return "idle"

    def _role_attributes(self) -> dict[str, Any]:
        session = self._runtime.session
        return {
            "queue": session.queue_snapshot(),
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "active_zone_id": next(iter(session.active_runs), None),
        }


class HubConsumptionLeftSensor(MaestroHubEntity, SensorEntity):
    """Liters left in the monthly budget; unavailable when none is configured."""

    _attr_device_class = SensorDeviceClass.VOLUME
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_suggested_display_precision = 0

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_consumption_left")

    @property
    def available(self) -> bool:
        return self._runtime.hub.consumption_budget_liters is not None

    @property
    def native_value(self) -> float | None:
        budget = self._runtime.hub.consumption_budget_liters
        if budget is None:
            return None
        return round(budget - self._runtime.consumption_used_liters(), 1)

    def _role_attributes(self) -> dict[str, Any]:
        runtime = self._runtime
        period_start = dt_util.now().date().replace(day=1)
        return {
            "budget_liters": runtime.hub.consumption_budget_liters,
            "used_liters": round(runtime.consumption_used_liters(), 1),
            "unattributed_liters": round(runtime.state.unattributed_total(), 1),
            "period_start": period_start.isoformat(),
            "action": runtime.hub.consumption_action,
        }


# Zone sensors ----------------------------------------------------------------


def _trigger_dict(trigger: CycleTrigger) -> dict[str, Any]:
    if trigger.kind == TRIGGER_KIND_SUN:
        return {"kind": TRIGGER_KIND_SUN, "event": trigger.event, "offset_s": trigger.offset_s}
    return {
        "kind": TRIGGER_KIND_TIME,
        "at": trigger.at.strftime("%H:%M") if trigger.at is not None else None,
    }


class ZoneStateSensor(MaestroZoneEntity, SensorEntity):
    """The zone's live state plus everything the card renders for it."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_state")

    @property
    def native_value(self) -> str:
        return self._runtime.zone_status(self._zone_id)

    def _role_attributes(self) -> dict[str, Any]:
        config = self.zone_config
        if config is None:
            return {}
        runtime = self._runtime
        suspended = runtime.state.suspended_until(self._zone_id)
        attributes: dict[str, Any] = {
            "zone_name": config.name,
            "order": config.order,
            "adjustment_pct": float(config.adjustment_pct),
            "degraded": self._degraded(),
            "suspended_until": suspended.isoformat() if suspended else None,
            "cycles": [self._cycle_dict(cycle) for cycle in config.cycles],
            "capabilities": self._capabilities(config),
            # Published here rather than on zone_next_run: Home Assistant emits
            # no attributes at all while an entity is unavailable, and that
            # sensor is unavailable for a disabled zone -- the case where the
            # explanation is the only thing left to say.
            "next_run": runtime.zone_next_run_verdict(runtime.zones[self._zone_id]),
        }
        active = runtime.session.active_runs.get(self._zone_id)
        if active is not None:
            attributes["active_cycle_id"] = active.cycle_id
            if active.phase == PHASE_WATERING and active.started_at is not None:
                attributes["run_started_at"] = active.started_at.isoformat()
                # Frozen at plan time (contract): the full-run total and its
                # soak split, not a live-derived estimate.
                attributes["run_duration_min"] = active.run_total_min
                attributes["run_planned_runs"] = list(active.planned_runs)
        return attributes

    def _cycle_dict(self, cycle: CycleConfig) -> dict[str, Any]:
        return {
            "cycle_id": cycle.cycle_id,
            "name": cycle.name,
            "enabled": self._runtime.state.cycle_enabled(self._zone_id, cycle.cycle_id),
            "trigger": _trigger_dict(cycle.trigger),
            "calendar": cycle.calendar.to_config(),
            # The cadence marker, per zone AND program: a shared one let one
            # program consume another's cadence (the 1.3.3 defect). It gates
            # INTERVAL mode only, but the card renders it beside the interval
            # because "every 3 days" is half an answer without the date the
            # count restarted.
            "last_completed": (
                marker.isoformat()
                if (marker := self._runtime.state.last_completed(self._zone_id, cycle.cycle_id))
                else None
            ),
            "season_months": sorted(cycle.season_months) if cycle.season_months else None,
            "soak_max_run_min": cycle.soak_max_run_min,
            "soak_pause_min": cycle.soak_pause_min or None,
            "volume_safety_timeout_min": cycle.volume_safety_timeout_min,
            "intensity_pct": cycle.intensity_pct,
            "day_intensity_pct": ({str(k): v for k, v in cycle.day_intensity_pct.items()} or None),
            "curve": {
                "points": [[temp, value] for temp, value in cycle.curve.points],
                "min": cycle.curve.min_value,
                "max": cycle.curve.max_value,
                "kind": str(cycle.curve.kind),
            },
        }

    def _degraded(self) -> list[str]:
        config = self.zone_config
        if config is None:
            return []
        runtime = self._runtime
        degraded: list[str] = []
        if config.is_switch:
            degraded.append("switch_valve")
        has_meter = runtime.zone_has_flow_meter(config)
        usable = has_meter and runtime.zone_flow_meter_usable(runtime.zones[config.zone_id])
        if not has_meter:
            degraded.append("no_flow_meter")
        elif not usable:
            # A meter is configured but its unit cannot be resolved, so it is
            # not usable. Distinct from no_flow_meter: the fix is different --
            # set the unit, do not buy a meter.
            degraded.append("flow_unit_unknown")
        elif not config.flow_sensor and runtime.resolved_meter_entity(config) is not None:
            degraded.append("line_meter_shared")
        # A volume-target cycle needs a usable meter; without one it silently
        # degrades to a timed run (see the degradation matrix).
        if not usable and any(cycle.curve.kind is CurveKind.VOLUME for cycle in config.cycles):
            degraded.append("volume_mode_unavailable")
        snapshot = runtime.weather.last_snapshot
        if snapshot is not None and not snapshot.hourly:
            degraded.append("no_hourly_forecast")
        # capabilities.py reports "configured" for a chosen sensor even after
        # it vanishes -- deliberately, since that module only records intent
        # and downgrading it would let the panel offer to overwrite a
        # deliberate choice during, say, a Zigbee re-pair. But a configured
        # sensor that no longer exists must still be visible as such
        # somewhere, or "configured" quietly becomes an alarm that will never
        # fire again. This is that somewhere.
        if config.leak_sensor and not self._entity_known(config.leak_sensor):
            degraded.append("leak_sensor_missing")
        if config.water_supply_sensor and not self._entity_known(config.water_supply_sensor):
            degraded.append("water_supply_sensor_missing")
        # A leak entity that has been unable to conclude anything for an hour
        # of idle time says nothing at all, and an entity stuck at
        # "unavailable" for ever cannot be told from a broken integration. The
        # refusal is right; leaving the user to guess at it is not, so the
        # reason is declared here, beside the other "configured, and here is
        # why it cannot do its job" keys.
        stall = runtime.leak_observation_stall(self._zone_id)
        if stall is not None:
            degraded.append(stall)
        return degraded

    def _entity_known(self, entity_id: str) -> bool:
        """A registry entry or a live state -- either proves it still exists.

        Registry first, mirroring capabilities._device_class_of's own
        reasoning: the registry answer is valid before an entity has ever
        posted a state, the normal case for Zigbee/MQTT right after a
        restart, so checking live state alone would flag a healthy,
        not-yet-reported sensor as vanished.
        """
        if er.async_get(self.hass).async_get(entity_id) is not None:
            return True
        return self.hass.states.get(entity_id) is not None

    def _capabilities(self, config: ZoneConfig) -> dict[str, str]:
        """What this zone can do, resolved per zone rather than per hub.

        In a mixed installation one zone has the sensor and another does
        not, and each must report accordingly -- that is the point of the
        whole model. "candidate_available" means the hardware could do it
        and has not been told to: an invitation in the card, not an alarm.

        water_accounting comes from the meter (zone_flow_meter_usable), not
        from capabilities.py, which knows nothing about flow, and it follows
        zone_water_total's own `source` ordering on purpose: usable meter
        first, nominal fallback second, so the two agree by construction
        rather than by coincidence. Checking zone_has_flow_meter first (a
        configuration-only test) was tried and rejected: it made a zone with
        a configured-but-currently-unusable meter and a nominal rate report
        "unavailable" while add_consumption was silently booking the nominal
        estimate underneath and zone_water_total.source read "nominal" for
        the very same zone -- two attributes of the same entity disagreeing
        about whether accounting was happening, which is false on this
        field's part: accounting *was* happening, in estimated mode.
        zone_flow_meter_usable already covers "no meter configured" (it
        returns False whenever no meter entity resolves), so no separate
        zone_has_flow_meter check is needed here.
        """
        runtime = self._runtime
        caps = resolve_zone_capabilities(self.hass, config)
        if runtime.zone_flow_meter_usable(runtime.zones[config.zone_id]):
            accounting = "measured"
        elif config.nominal_flow_lpm:
            accounting = "estimated"
        else:
            accounting = "unavailable"
        return {
            "water_accounting": accounting,
            "leak_detection": caps.leak_detection,
            "water_supply": caps.water_supply,
            # WHERE this zone's leaks are watched, which leak_detection above
            # cannot answer: that key is about the valve's own sensor and
            # knows nothing about flow, so a fully metered zone with no sensor
            # reads "unavailable" there while source 2 watches it. Published
            # beside it rather than folded into it, because "configured" would
            # then be ambiguous about WHICH source -- and because the two
            # genuinely differ, a zone can be watched by the system scope
            # while having nothing of its own. See runtime.leak_watch.
            "leak_watch": runtime.leak_watch(config.zone_id),
        }


class ZoneNextRunSensor(MaestroZoneEntity, SensorEntity):
    """The earliest next occurrence the zone will actually water on.

    It projects each enabled program forward until a day passes every gate —
    calendar, season, suspension, pause and skip-today — instead of reporting
    the raw next trigger. Before 2.0.0 it ignored all of them and promised a
    run on days the zone would skip; four overlapping day mechanisms made an
    honest answer impractical, and one calendar mode makes it easy.
    """

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _SEARCH_DAYS = 366

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_next_run")

    @property
    def native_value(self) -> datetime | None:
        best = self._next()
        return best[0] if best is not None else None

    def _role_attributes(self) -> dict[str, Any]:
        best = self._next()
        if best is None:
            return {}
        return {"cycle_id": best[1].cycle_id, "cycle_name": best[1].name}

    def _next(self) -> tuple[datetime, CycleConfig] | None:
        config = self.zone_config
        if config is None:
            return None
        state = self._runtime.state
        best: tuple[datetime, CycleConfig] | None = None
        for cycle in config.cycles:
            if not state.cycle_enabled(self._zone_id, cycle.cycle_id):
                continue
            when = self._next_eligible(config, cycle)
            if when is not None and (best is None or when < best[0]):
                best = (when, cycle)
        return best

    def _next_eligible(self, config: ZoneConfig, cycle: CycleConfig) -> datetime | None:
        """First instant this program both fires and is allowed to water."""
        state = self._runtime.state
        if not state.zone_enabled(self._zone_id):
            return None
        now = dt_util.now()
        marker = state.last_completed(self._zone_id, cycle.cycle_id)
        months = (
            cycle.season_months
            if cycle.season_months is not None
            else self._runtime.hub.engine_params.season_months
        )
        blocked_until = max(
            filter(
                None,
                (state.suspended_until(self._zone_id), state.paused_until(self._zone_id)),
            ),
            default=None,
        )
        skip_day = state.skip_today_date(self._zone_id)

        for offset in range(self._SEARCH_DAYS):
            day = now.date() + timedelta(days=offset)
            if day == skip_day or day.month not in months:
                continue
            if not calendar_allows(cycle.calendar, day, marker):
                continue
            when = self._occurrence_on(cycle.trigger, day)
            if when is None or when <= now:
                continue
            if blocked_until is not None and when <= blocked_until:
                continue
            return when
        return None

    def _occurrence_on(self, trigger: CycleTrigger, day: date) -> datetime | None:
        """The trigger instant on a specific calendar day."""
        if trigger.kind == TRIGGER_KIND_TIME and trigger.at is not None:
            return dt_util.start_of_local_day(day).replace(
                hour=trigger.at.hour, minute=trigger.at.minute
            )
        if trigger.kind == TRIGGER_KIND_SUN and trigger.event is not None:
            base = sun.get_astral_event_date(self.hass, trigger.event, day)
            return base + timedelta(seconds=trigger.offset_s) if base else None
        return None


class ZoneLastOutcomeSensor(MaestroZoneEntity, SensorEntity):
    """The zone's last recorded run outcome."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_last_outcome")

    @property
    def native_value(self) -> str:
        outcome = self._runtime.state.last_outcome(self._zone_id)
        return str(outcome["result"]) if outcome else "none"

    def _role_attributes(self) -> dict[str, Any]:
        outcome = self._runtime.state.last_outcome(self._zone_id)
        if not outcome:
            return {}
        return {
            "reason_key": outcome.get("reason_key"),
            "finished_at": outcome.get("at"),
            "cycle_id": outcome.get("cycle_id"),
            "duration_min": outcome.get("duration_min"),
            "volume_l": outcome.get("volume_l"),
        }


class ZoneWaterTotalSensor(MaestroZoneEntity, SensorEntity):
    """Cumulative water for one zone, in litres.

    device_class water + state_class total_increasing is not decoration: it is
    what makes Home Assistant record the sensor in long-term statistics and
    offer it to the Water dashboard, which is where daily, monthly and yearly
    totals come from. That is why no "today" or "this month" entity exists --
    the statistics engine already produces them, and a second entity holding
    the same fact is a second thing that can be wrong.

    today_l and month_l are attributes, projected from the same daily history
    that add_water writes in the same call that increments this total, so the
    card can render a number without querying the recorder and without a value
    that can drift from the total it is a slice of.
    """

    _attr_device_class = SensorDeviceClass.WATER
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_suggested_display_precision = 1

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_water_total")

    @property
    def native_value(self) -> float:
        return round(self._runtime.state.zone_water_total(self._zone_id), 3)

    def _role_attributes(self) -> dict[str, Any]:
        runtime = self._runtime
        state = runtime.state
        total = state.zone_water_total(self._zone_id)
        estimated = state.zone_water_estimated(self._zone_id)
        today = dt_util.now().date()
        config = self.zone_config
        # A zone that cannot currently record anything -- no usable meter
        # right now, and no nominal fallback either -- can record nothing at
        # all: there is nothing to integrate, and record_estimate returns on
        # non-positive litres. Calling that "measured" (the elif below's
        # zero-litres default) describes a measurement that will never
        # happen, so it gets its own value. zone_flow_meter_usable is the
        # same live check water_accounting's own "unavailable" uses (not
        # zone_has_flow_meter, which is configuration only and would call a
        # meter that has never once resolved a unit "measured" at 0 L): a
        # meter that has never yet produced a usable reading has recorded
        # nothing, whatever the config says. Falsy, not `is None`, for the
        # nominal check: update_zone's schema takes any nominal_flow_lpm >=
        # 0, and a nominal of exactly 0 books nothing either -- such a zone
        # records nothing just as surely as one with no nominal at all, and
        # must not claim otherwise. `total <= 0` guards the branch, so once
        # real litres exist (measured or estimated) nothing here can flap
        # back to "none" -- and a zone whose nominal was cleared after the
        # fact still reports the provenance of what it actually accrued,
        # not "none" retroactively.
        if (
            total <= 0
            and config is not None
            and not runtime.zone_flow_meter_usable(runtime.zones[config.zone_id])
            and not config.nominal_flow_lpm
        ):
            source = "none"
        elif estimated <= 0:
            source = "measured"
        elif estimated >= total:
            source = "nominal"
        else:
            source = "mixed"
        return {
            "estimated": estimated > 0,
            "source": source,
            "today_l": round(state.water_for_day(self._zone_id, today), 1),
            # zone_water_for_period, not water_for_period: the latter is the
            # whole account, which the budget spends and this sensor does not
            # report. Both are on RuntimeState and only the zone-scoped one
            # belongs beside a today_l that is already zone-scoped.
            "month_l": round(
                state.zone_water_for_period(self._zone_id, today.replace(day=1), today), 1
            ),
            "meter_entity": runtime.resolved_meter_entity(config) if config else None,
            # When this zone's litres last stopped being observed while it was
            # watering: the meter went unavailable, or its unit stopped
            # resolving. None until it happens. It reads from the store, so it
            # survives a restart exactly as the counters beside it do -- and
            # it is the one figure that separates "no water used" from "no
            # water seen", which the litres alone cannot say.
            "last_gap_at": state.zone_last_gap_at(self._zone_id),
        }


class HubUnattributedWaterSensor(MaestroHubEntity, SensorEntity):
    """Water no zone claimed.

    total_l includes the line priming that happens during master_pre_open_s on
    every cycle, which is real water belonging to no zone and is not a leak.
    closed_l is the subset measured while every managed valve reported closed,
    and it is the only part leak detection reads.
    """

    _attr_device_class = SensorDeviceClass.WATER
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_suggested_display_precision = 1

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_unattributed_water")

    @property
    def native_value(self) -> float:
        return round(self._runtime.state.unattributed_total(), 3)

    def _role_attributes(self) -> dict[str, Any]:
        state = self._runtime.state
        return {
            "closed_l": round(state.unattributed_closed(), 3),
            "per_scope": {
                scope: round(state.unattributed_total(scope), 1)
                for scope in (*self._runtime.zone_ids, "__hub__")
                if state.unattributed_total(scope) > 0
            },
        }
