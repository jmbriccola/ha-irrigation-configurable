"""Sensors: hub evaluation values, session status, per-zone state/next/outcome.

States and attributes follow docs/design/card-contract.md exactly — the card
is built against them.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfPrecipitationDepth, UnitOfTemperature, UnitOfVolume
from homeassistant.core import HomeAssistant
from homeassistant.helpers import sun
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from . import IrrigationConfigEntry
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
    async_add_entities(hub_entities)

    def _zone_sensors(zone_id: str) -> list[Entity]:
        return [
            ZoneStateSensor(runtime, zone_id),
            ZoneNextRunSensor(runtime, zone_id),
            ZoneLastOutcomeSensor(runtime, zone_id),
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
        elif config.flow_sensor is None and runtime.hub.line_flow_sensor is not None:
            degraded.append("line_meter_shared")
        # A volume-target cycle needs a usable meter; without one it silently
        # degrades to a timed run (see the degradation matrix).
        if not usable and any(cycle.curve.kind is CurveKind.VOLUME for cycle in config.cycles):
            degraded.append("volume_mode_unavailable")
        snapshot = runtime.weather.last_snapshot
        if snapshot is not None and not snapshot.hourly:
            degraded.append("no_hourly_forecast")
        return degraded


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
