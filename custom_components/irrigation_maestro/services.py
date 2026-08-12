"""Domain services (docs/design/card-contract.md).

Services are registered once per Home Assistant instance and resolve the
single hub entry at call time. Every user-facing failure raises
``ServiceValidationError`` with a translation key — never a bare exception.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from types import MappingProxyType
from typing import Any, Final, cast
from uuid import uuid4

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigEntryState, ConfigSubentry
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from . import const
from .const import DOMAIN, SUBENTRY_TYPE_ZONE
from .engine.curves import CurveError, CurveKind, validate_points
from .engine.semantic import points_from_semantic, semantic_from_curve
from .models import CycleConfig, HubConfig, ZoneConfig
from .runtime import IrrigationRuntime

SERVICE_RUN_ZONE: Final = "run_zone"
SERVICE_RUN_ALL: Final = "run_all"
SERVICE_SKIP_TODAY: Final = "skip_today"
SERVICE_PAUSE: Final = "pause"
SERVICE_SUSPEND_UNTIL: Final = "suspend_until"
SERVICE_RESUME: Final = "resume"
SERVICE_STOP_ALL: Final = "stop_all"
SERVICE_EVALUATE: Final = "evaluate"
SERVICE_SET_ZONE_ORDER: Final = "set_zone_order"
SERVICE_SET_CURVE: Final = "set_curve"
SERVICE_SET_SIMPLE_CURVE: Final = "set_simple_curve"
SERVICE_EXPORT_CONFIG: Final = "export_config"
SERVICE_IMPORT_CONFIG: Final = "import_config"
SERVICE_SET_PROGRAM_SCHEDULE: Final = "set_program_schedule"
SERVICE_SET_PROGRAM_MINUTES: Final = "set_program_minutes"
SERVICE_ADD_PROGRAM: Final = "add_program"
SERVICE_REMOVE_PROGRAM: Final = "remove_program"
SERVICE_RENAME_PROGRAM: Final = "rename_program"
SERVICE_ADD_ZONE: Final = "add_zone"
SERVICE_UPDATE_ZONE: Final = "update_zone"
SERVICE_REMOVE_ZONE: Final = "remove_zone"
SERVICE_SET_WEATHER_SOURCES: Final = "set_weather_sources"
SERVICE_SET_CONSUMPTION_BUDGET: Final = "set_consumption_budget"
SERVICE_SET_RESTRICTIONS: Final = "set_restrictions"

ATTR_ZONE_ID: Final = "zone_id"
ATTR_CYCLE_ID: Final = "cycle_id"
ATTR_DURATION: Final = "duration"
ATTR_HOURS: Final = "hours"
ATTR_UNTIL: Final = "until"
ATTR_ORDER: Final = "order"
ATTR_POINTS: Final = "points"
ATTR_AMOUNT: Final = "amount"
ATTR_HEAT: Final = "heat"
ATTR_MIN_VALUE: Final = "min_value"
ATTR_MAX_VALUE: Final = "max_value"
ATTR_PAYLOAD: Final = "payload"
ATTR_PROGRAM_ID: Final = "program_id"
ATTR_DAYS: Final = "days"
ATTR_START_KIND: Final = "start_kind"
ATTR_START_TIME: Final = "start_time"
ATTR_START_EVENT: Final = "start_event"
ATTR_START_OFFSET_MIN: Final = "start_offset_min"
ATTR_MINUTES: Final = "minutes"
ATTR_DAY_MINUTES: Final = "day_minutes"
ATTR_NAME: Final = "name"
ATTR_COPY_FROM: Final = "copy_from"
ATTR_VALVE_ENTITY: Final = "valve_entity"
ATTR_AREA_M2: Final = "area_m2"
ATTR_ICON: Final = "icon"
ATTR_FLOW_SENSOR: Final = "flow_sensor"
ATTR_NOMINAL_FLOW_LPM: Final = "nominal_flow_lpm"
ATTR_FLOW_TOLERANCE_PCT: Final = "flow_tolerance_pct"
ATTR_ADJUSTMENT_PCT: Final = "adjustment_pct"
ATTR_INTERVAL_DAYS: Final = "interval_days"
ATTR_COMPATIBILITY_GROUP: Final = "compatibility_group"
ATTR_SEASON_MONTHS: Final = "season_months"
ATTR_WEATHER_ENTITY: Final = "weather_entity"
ATTR_RAIN_SENSOR: Final = "rain_sensor"
ATTR_OUTDOOR_TEMP_SENSOR: Final = "outdoor_temp_sensor"
ATTR_LINE_FLOW_SENSOR: Final = "line_flow_sensor"
ATTR_MASTER_VALVE: Final = "master_valve"
ATTR_LITERS_PER_MONTH: Final = "liters_per_month"
ATTR_ACTION: Final = "action"
ATTR_REDUCE_PCT: Final = "reduce_pct"
ATTR_ALLOWED_WEEKDAYS: Final = "allowed_weekdays"
ATTR_PARITY: Final = "parity"
ATTR_FORBIDDEN_WINDOWS: Final = "forbidden_windows"
ATTR_WINDOW_START: Final = "start"
ATTR_WINDOW_END: Final = "end"

_DATA_SERVICES_REGISTERED: Final = "services_registered"


def _curve_point(value: Any) -> list[float]:
    """One [temperature, value] control point."""
    if not isinstance(value, list | tuple) or len(value) != 2:
        raise vol.Invalid("each point must be a [temperature, value] pair")
    try:
        return [float(value[0]), float(value[1])]
    except (TypeError, ValueError) as err:
        raise vol.Invalid("point entries must be numbers") from err


_RUN_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Optional(ATTR_DURATION): vol.All(vol.Coerce(int), vol.Range(min=1, max=1440)),
    }
)
_ZONE_OPTIONAL_SCHEMA = vol.Schema({vol.Optional(ATTR_ZONE_ID): cv.string})
_PAUSE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_HOURS): vol.All(
            vol.Coerce(float), vol.Range(min=0, max=8760, min_included=False)
        ),
        vol.Optional(ATTR_ZONE_ID): cv.string,
    }
)
_SUSPEND_UNTIL_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_UNTIL): cv.datetime,
        vol.Optional(ATTR_ZONE_ID): cv.string,
    }
)
_SET_ZONE_ORDER_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_ORDER): vol.All(vol.Coerce(int), vol.Range(min=1, max=1000)),
    }
)
_SET_CURVE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_CYCLE_ID): cv.string,
        vol.Required(ATTR_POINTS): vol.All([_curve_point], vol.Length(min=1)),
        vol.Optional(ATTR_MIN_VALUE): vol.Coerce(float),
        vol.Optional(ATTR_MAX_VALUE): vol.Coerce(float),
    }
)
_SET_SIMPLE_CURVE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_CYCLE_ID): cv.string,
        vol.Required(ATTR_AMOUNT): vol.All(vol.Coerce(int), vol.Range(min=3, max=45)),
        vol.Required(ATTR_HEAT): vol.All(vol.Coerce(int), vol.Range(min=0, max=30)),
        vol.Optional(ATTR_MIN_VALUE): vol.Coerce(float),
        vol.Optional(ATTR_MAX_VALUE): vol.Coerce(float),
    }
)
_IMPORT_CONFIG_SCHEMA = vol.Schema({vol.Required(ATTR_PAYLOAD): cv.string})
_EMPTY_SCHEMA = vol.Schema({})

_WEEKDAYS = vol.All([vol.All(vol.Coerce(int), vol.Range(min=0, max=6))], vol.Length(max=7))

_SET_PROGRAM_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_DAYS, default=list): _WEEKDAYS,
        vol.Required(ATTR_START_KIND): vol.In(["time", "sun"]),
        vol.Optional(ATTR_START_TIME): cv.string,
        vol.Optional(ATTR_START_EVENT): vol.In(["sunrise", "sunset"]),
        vol.Optional(ATTR_START_OFFSET_MIN, default=0): vol.All(
            vol.Coerce(int), vol.Range(min=-360, max=360)
        ),
    }
)
_SET_PROGRAM_MINUTES_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Exclusive(ATTR_MINUTES, "amount"): vol.All(vol.Coerce(int), vol.Range(min=1, max=1440)),
        vol.Exclusive(ATTR_DAY_MINUTES, "amount"): {
            cv.string: vol.All(vol.Coerce(int), vol.Range(min=1, max=1440))
        },
    }
)
_ADD_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_COPY_FROM): cv.string,
    }
)
_REMOVE_PROGRAM_SCHEMA = vol.Schema(
    {vol.Required(ATTR_ZONE_ID): cv.string, vol.Required(ATTR_PROGRAM_ID): cv.string}
)
_RENAME_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Required(ATTR_NAME): cv.string,
    }
)
_ADD_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_NAME): cv.string,
        vol.Required(ATTR_VALVE_ENTITY): cv.string,
        vol.Optional(ATTR_AREA_M2): vol.Coerce(float),
        vol.Optional(ATTR_ICON): cv.string,
    }
)
_UPDATE_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_VALVE_ENTITY): cv.string,
        vol.Optional(ATTR_AREA_M2): vol.Coerce(float),
        vol.Optional(ATTR_ICON): cv.string,
        vol.Optional(ATTR_FLOW_SENSOR): cv.string,
        vol.Optional(ATTR_NOMINAL_FLOW_LPM): vol.All(vol.Coerce(float), vol.Range(min=0)),
        vol.Optional(ATTR_FLOW_TOLERANCE_PCT): vol.All(
            vol.Coerce(float), vol.Range(min=1, max=100)
        ),
        vol.Optional(ATTR_ADJUSTMENT_PCT): vol.All(vol.Coerce(int), vol.Range(min=10, max=300)),
        vol.Optional(ATTR_ORDER): vol.All(vol.Coerce(int), vol.Range(min=1, max=1000)),
        vol.Optional(ATTR_INTERVAL_DAYS): vol.All(vol.Coerce(int), vol.Range(min=1, max=60)),
        vol.Optional(ATTR_COMPATIBILITY_GROUP): cv.string,
        vol.Optional(ATTR_SEASON_MONTHS): [vol.All(vol.Coerce(int), vol.Range(min=1, max=12))],
    }
)
_REMOVE_ZONE_SCHEMA = vol.Schema({vol.Required(ATTR_ZONE_ID): cv.string})

# attr -> zone-data const key, with the coercion already applied by the schema
_ZONE_PATCH_KEYS: Final = {
    ATTR_NAME: const.CONF_ZONE_NAME,
    ATTR_VALVE_ENTITY: const.CONF_VALVE_ENTITY,
    ATTR_AREA_M2: const.CONF_AREA_M2,
    ATTR_ICON: const.CONF_ZONE_ICON,
    ATTR_FLOW_SENSOR: const.CONF_FLOW_SENSOR,
    ATTR_NOMINAL_FLOW_LPM: const.CONF_NOMINAL_FLOW_LPM,
    ATTR_FLOW_TOLERANCE_PCT: const.CONF_FLOW_TOLERANCE_PCT,
    ATTR_ADJUSTMENT_PCT: const.CONF_ADJUSTMENT_PCT,
    ATTR_ORDER: const.CONF_ORDER,
    ATTR_INTERVAL_DAYS: const.CONF_INTERVAL_DAYS,
    ATTR_COMPATIBILITY_GROUP: const.CONF_COMPATIBILITY_GROUP,
    ATTR_SEASON_MONTHS: const.CONF_ZONE_SEASON_MONTHS,
}


def _default_program(name: str) -> dict[str, Any]:
    """A valid, sensible new program: every day, sunrise, 15' mild + 8' hot."""
    points = list(points_from_semantic(15, 8))
    return {
        const.CONF_CYCLE_ID: uuid4().hex[:8],
        const.CONF_CYCLE_NAME: name,
        const.CONF_TRIGGER: {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
            const.CONF_TRIGGER_EVENT: "sunrise",
            const.CONF_TRIGGER_OFFSET_S: 0,
        },
        const.CONF_CURVE: {
            const.CONF_CURVE_POINTS: [[t, v] for t, v in points],
            const.CONF_CURVE_MIN: 1.0,
            const.CONF_CURVE_MAX: 60.0,
            const.CONF_CURVE_KIND: str(CurveKind.DURATION),
        },
    }


# Entry / runtime resolution -----------------------------------------------------


def _loaded_entry(hass: HomeAssistant) -> ConfigEntry:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="hub_not_loaded")


def _runtime(hass: HomeAssistant) -> IrrigationRuntime:
    return cast(IrrigationRuntime, _loaded_entry(hass).runtime_data)


def _require_zone(runtime: IrrigationRuntime, zone_id: str) -> None:
    if zone_id not in runtime.zones:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_zone",
            translation_placeholders={"zone_id": zone_id},
        )


def _optional_zone(call: ServiceCall, runtime: IrrigationRuntime) -> str | None:
    zone_id = call.data.get(ATTR_ZONE_ID)
    if zone_id is not None:
        _require_zone(runtime, zone_id)
    return cast(str | None, zone_id)


def _invalid_payload() -> ServiceValidationError:
    return ServiceValidationError(translation_domain=DOMAIN, translation_key="invalid_payload")


# Handlers ------------------------------------------------------------------------


async def _async_run_zone(call: ServiceCall) -> None:
    runtime = _runtime(call.hass)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    await runtime.async_run_zone(zone_id, call.data.get(ATTR_DURATION))


async def _async_run_all(call: ServiceCall) -> None:
    await _runtime(call.hass).async_run_all()


async def _async_skip_today(call: ServiceCall) -> None:
    runtime = _runtime(call.hass)
    runtime.skip_today(_optional_zone(call, runtime))


async def _async_pause(call: ServiceCall) -> None:
    runtime = _runtime(call.hass)
    runtime.pause(call.data[ATTR_HOURS], _optional_zone(call, runtime))


async def _async_suspend_until(call: ServiceCall) -> None:
    runtime = _runtime(call.hass)
    until = dt_util.as_utc(call.data[ATTR_UNTIL])
    runtime.suspend_until(until, _optional_zone(call, runtime))


async def _async_resume(call: ServiceCall) -> None:
    runtime = _runtime(call.hass)
    runtime.resume(_optional_zone(call, runtime))


async def _async_stop_all(call: ServiceCall) -> None:
    await _runtime(call.hass).async_stop_all(manual=True)


async def _async_evaluate(call: ServiceCall) -> ServiceResponse:
    plan = await _runtime(call.hass).async_evaluate_plan()
    if call.return_response:
        return cast(ServiceResponse, plan)
    return None


async def _async_set_zone_order(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    subentry = entry.subentries[zone_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_ORDER: call.data[ATTR_ORDER]}
    )


def _validate_program(program: dict[str, Any], templates: dict[str, Any]) -> None:
    """Round-trip a program dict through the typed model before it is persisted.

    Services build/mutate raw cycle dicts; without this gate an invalid
    program (e.g. an unparseable trigger time, a broken curve) is written to
    storage and only crashes later, asynchronously, on the next reload
    (spec §4.2).
    """
    try:
        CycleConfig.from_config(program, templates)
    except (CurveError, ValueError, KeyError, TypeError) as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_program",
            translation_placeholders={"error": str(err)},
        ) from err


def _validate_zone(data: dict[str, Any], templates: dict[str, Any]) -> None:
    """Round-trip a zone dict through the typed model before persisting."""
    try:
        ZoneConfig.from_subentry("probe", data, templates=templates)
    except (CurveError, ValueError, KeyError, TypeError) as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_zone",
            translation_placeholders={"error": str(err)},
        ) from err


def _update_cycle(
    hass: HomeAssistant,
    entry: ConfigEntry,
    zone_id: str,
    cycle_id: str,
    mutate: Callable[[dict[str, Any]], None],
) -> None:
    """Apply ``mutate`` to the matching cycle dict and persist in place (no reload)."""
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    found = False
    mutated_item: dict[str, Any] | None = None
    for item in cycles:
        if item.get(const.CONF_CYCLE_ID) == cycle_id:
            mutate(item)
            found = True
            mutated_item = item
    if not found:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": cycle_id},
        )
    assert mutated_item is not None
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    _validate_program(mutated_item, runtime.hub.curve_templates)
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )


def _write_cycle_curve(
    hass: HomeAssistant,
    entry: ConfigEntry,
    zone_id: str,
    cycle_id: str,
    points: list[tuple[float, float]],
    min_value: float,
    max_value: float,
    kind: str,
) -> None:
    """Persist a cycle's curve into the zone subentry (in-place, no reload)."""
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    for item in cycles:
        if item.get(const.CONF_CYCLE_ID) == cycle_id:
            item[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[temp, value] for temp, value in points],
                const.CONF_CURVE_MIN: min_value,
                const.CONF_CURVE_MAX: max_value,
                const.CONF_CURVE_KIND: kind,
            }
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )


async def _async_set_curve(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    cycle_id: str = call.data[ATTR_CYCLE_ID]
    _require_zone(runtime, zone_id)
    cycle = runtime.zones[zone_id].config.cycle(cycle_id)
    if cycle is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_cycle",
            translation_placeholders={"cycle_id": cycle_id},
        )

    points = [(float(temp), float(value)) for temp, value in call.data[ATTR_POINTS]]
    try:
        validate_points(points)
    except CurveError as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_points",
            translation_placeholders={"error": str(err)},
        ) from err
    min_value = float(call.data.get(ATTR_MIN_VALUE, cycle.curve.min_value))
    max_value = float(call.data.get(ATTR_MAX_VALUE, cycle.curve.max_value))
    if min_value > max_value:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="min_above_max")

    _write_cycle_curve(
        hass, entry, zone_id, cycle_id, points, min_value, max_value, str(cycle.curve.kind)
    )


async def _async_set_simple_curve(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    cycle_id: str = call.data[ATTR_CYCLE_ID]
    _require_zone(runtime, zone_id)
    cycle = runtime.zones[zone_id].config.cycle(cycle_id)
    if cycle is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_cycle",
            translation_placeholders={"cycle_id": cycle_id},
        )
    if cycle.curve.kind is CurveKind.VOLUME:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="simple_curve_on_volume",
            translation_placeholders={"cycle_id": cycle_id},
        )
    points = list(points_from_semantic(call.data[ATTR_AMOUNT], call.data[ATTR_HEAT]))
    try:
        validate_points(points)
    except CurveError as err:  # defensive; the formula is always valid
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_points",
            translation_placeholders={"error": str(err)},
        ) from err
    min_value = float(call.data.get(ATTR_MIN_VALUE, cycle.curve.min_value))
    max_value = float(call.data.get(ATTR_MAX_VALUE, cycle.curve.max_value))
    if min_value > max_value:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="min_above_max")
    _write_cycle_curve(
        hass, entry, zone_id, cycle_id, points, min_value, max_value, str(cycle.curve.kind)
    )


def _program_context(call: ServiceCall) -> tuple[HomeAssistant, ConfigEntry, str, str]:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    if runtime.zones[zone_id].config.cycle(program_id) is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )
    return hass, entry, zone_id, program_id


async def _async_set_program_schedule(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)
    days = sorted(set(call.data[ATTR_DAYS]))
    kind = call.data[ATTR_START_KIND]
    trigger: dict[str, Any]
    if kind == "time":
        if ATTR_START_TIME not in call.data:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="start_time_required"
            )
        trigger = {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
            # HA's TimeSelector (and services.yaml examples) may emit "HH:MM:SS";
            # _parse_time only understands "HH:MM" — normalize the same way
            # config_flow._hh_mm does before persisting.
            const.CONF_TRIGGER_AT: call.data[ATTR_START_TIME][:5],
        }
    else:
        if ATTR_START_EVENT not in call.data:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="start_event_required"
            )
        trigger = {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
            const.CONF_TRIGGER_EVENT: call.data[ATTR_START_EVENT],
            const.CONF_TRIGGER_OFFSET_S: int(call.data[ATTR_START_OFFSET_MIN]) * 60,
        }

    def mutate(item: dict[str, Any]) -> None:
        if days:
            item[const.CONF_CYCLE_DAYS] = days
        else:
            item.pop(const.CONF_CYCLE_DAYS, None)  # empty = every day
        item[const.CONF_TRIGGER] = trigger

    _update_cycle(hass, entry, zone_id, program_id, mutate)


async def _async_set_program_minutes(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    cycle = runtime.zones[zone_id].config.cycle(program_id)
    assert cycle is not None
    if cycle.curve.kind is CurveKind.VOLUME:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="simple_curve_on_volume",
            translation_placeholders={"cycle_id": program_id},
        )
    mutate: Callable[[dict[str, Any]], None]
    if ATTR_MINUTES in call.data:
        _, heat = semantic_from_curve(cycle.curve)
        points = list(points_from_semantic(int(call.data[ATTR_MINUTES]), heat))

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[t, v] for t, v in points],
                const.CONF_CURVE_MIN: cycle.curve.min_value,
                const.CONF_CURVE_MAX: cycle.curve.max_value,
                const.CONF_CURVE_KIND: str(cycle.curve.kind),
            }
            item.pop(const.CONF_CYCLE_DAY_MINUTES, None)  # uniform clears per-day

    elif ATTR_DAY_MINUTES in call.data:
        day_map: dict[str, int] = {}
        for raw_key, raw_val in call.data[ATTR_DAY_MINUTES].items():
            try:
                weekday = int(raw_key)
            except (TypeError, ValueError):
                raise ServiceValidationError(
                    translation_domain=DOMAIN, translation_key="invalid_weekday"
                ) from None
            if not 0 <= weekday <= 6:
                raise ServiceValidationError(
                    translation_domain=DOMAIN, translation_key="invalid_weekday"
                )
            day_map[str(weekday)] = int(raw_val)

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CYCLE_DAY_MINUTES] = day_map

    else:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="minutes_required")

    _update_cycle(hass, entry, zone_id, program_id, mutate)


async def _async_add_program(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]

    copy_from = call.data.get(ATTR_COPY_FROM)
    if copy_from is not None:
        source = next((c for c in cycles if c.get(const.CONF_CYCLE_ID) == copy_from), None)
        if source is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="unknown_program",
                translation_placeholders={"program_id": copy_from},
            )
        program = {k: v for k, v in source.items() if k != const.CONF_CYCLE_ID}
        program[const.CONF_CYCLE_ID] = uuid4().hex[:8]
        program[const.CONF_CYCLE_NAME] = call.data.get(
            ATTR_NAME, f"{source.get(const.CONF_CYCLE_NAME, 'Program')} (copy)"
        )
    else:
        program = _default_program(call.data.get(ATTR_NAME, "Program"))

    _validate_program(program, runtime.hub.curve_templates)
    cycles.append(program)
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )
    return {"program_id": program[const.CONF_CYCLE_ID]}


async def _async_remove_program(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    if not any(c.get(const.CONF_CYCLE_ID) == program_id for c in cycles):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )
    if len(cycles) <= 1:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="cannot_remove_last_program"
        )
    cycles = [c for c in cycles if c.get(const.CONF_CYCLE_ID) != program_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )


async def _async_rename_program(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)

    def mutate(item: dict[str, Any]) -> None:
        item[const.CONF_CYCLE_NAME] = call.data[ATTR_NAME]

    _update_cycle(hass, entry, zone_id, program_id, mutate)


async def _async_add_zone(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    name: str = call.data[ATTR_NAME]
    data: dict[str, Any] = {
        const.CONF_ZONE_NAME: name,
        const.CONF_VALVE_ENTITY: call.data[ATTR_VALVE_ENTITY],
        const.CONF_CYCLES: [_default_program(name)],
    }
    if ATTR_AREA_M2 in call.data:
        data[const.CONF_AREA_M2] = float(call.data[ATTR_AREA_M2])
    if ATTR_ICON in call.data:
        data[const.CONF_ZONE_ICON] = call.data[ATTR_ICON]

    _validate_zone(data, runtime.hub.curve_templates)

    subentry = ConfigSubentry(
        subentry_type=SUBENTRY_TYPE_ZONE,
        data=MappingProxyType(data),
        title=name,
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(entry, subentry)
    return {"zone_id": subentry.subentry_id}


async def _async_update_zone(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    subentry = entry.subentries[zone_id]
    data = dict(subentry.data)  # preserves CONF_CYCLES + untouched keys
    for attr, conf_key in _ZONE_PATCH_KEYS.items():
        if attr in call.data:
            data[conf_key] = call.data[attr]
    _validate_zone(data, runtime.hub.curve_templates)
    title = call.data.get(ATTR_NAME, subentry.title)
    hass.config_entries.async_update_subentry(entry, subentry, data=data, title=title)


async def _async_remove_zone(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    hass.config_entries.async_remove_subentry(entry, zone_id)


async def _async_export_config(call: ServiceCall) -> ServiceResponse:
    entry = _loaded_entry(call.hass)
    payload = {
        "options": dict(entry.options),
        "zones": {
            subentry_id: dict(subentry.data)
            for subentry_id, subentry in entry.subentries.items()
            if subentry.subentry_type == SUBENTRY_TYPE_ZONE
        },
    }
    return {"payload": json.dumps(payload)}


async def _async_import_config(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    try:
        payload = json.loads(call.data[ATTR_PAYLOAD])
    except json.JSONDecodeError as err:
        raise _invalid_payload() from err
    if not isinstance(payload, dict):
        raise _invalid_payload()
    options = payload.get("options")
    zones = payload.get("zones")
    if not isinstance(options, dict) or not isinstance(zones, dict):
        raise _invalid_payload()
    # Validate everything before touching anything: import is all-or-nothing.
    # Parsing through the typed models is the same code path setup uses, so a
    # payload that passes here cannot break the entry afterwards.
    try:
        hub_config = HubConfig.from_options(options)
        for zone_id, data in zones.items():
            if isinstance(data, dict):
                ZoneConfig.from_subentry(str(zone_id), data, templates=hub_config.curve_templates)
    except Exception as err:
        raise _invalid_payload() from err
    for zone_id, data in zones.items():
        subentry = entry.subentries.get(zone_id)
        if subentry is None or subentry.subentry_type != SUBENTRY_TYPE_ZONE:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="unknown_import_zone",
                translation_placeholders={"zone_id": str(zone_id)},
            )
        if not isinstance(data, dict):
            raise _invalid_payload()
    hass.config_entries.async_update_entry(entry, options=options)
    for zone_id, data in zones.items():
        hass.config_entries.async_update_subentry(entry, entry.subentries[zone_id], data=data)


# Registration ---------------------------------------------------------------------


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the domain services once."""
    domain_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(_DATA_SERVICES_REGISTERED):
        return
    domain_data[_DATA_SERVICES_REGISTERED] = True

    hass.services.async_register(DOMAIN, SERVICE_RUN_ZONE, _async_run_zone, _RUN_ZONE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_RUN_ALL, _async_run_all, _EMPTY_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_SKIP_TODAY, _async_skip_today, _ZONE_OPTIONAL_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_PAUSE, _async_pause, _PAUSE_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_SUSPEND_UNTIL, _async_suspend_until, _SUSPEND_UNTIL_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_RESUME, _async_resume, _ZONE_OPTIONAL_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_STOP_ALL, _async_stop_all, _EMPTY_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_EVALUATE,
        _async_evaluate,
        _EMPTY_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_ZONE_ORDER, _async_set_zone_order, _SET_ZONE_ORDER_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_SET_CURVE, _async_set_curve, _SET_CURVE_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_SET_SIMPLE_CURVE, _async_set_simple_curve, _SET_SIMPLE_CURVE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_EXPORT_CONFIG,
        _async_export_config,
        _EMPTY_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_CONFIG, _async_import_config, _IMPORT_CONFIG_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_PROGRAM_SCHEDULE,
        _async_set_program_schedule,
        _SET_PROGRAM_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_PROGRAM_MINUTES,
        _async_set_program_minutes,
        _SET_PROGRAM_MINUTES_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_PROGRAM,
        _async_add_program,
        _ADD_PROGRAM_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REMOVE_PROGRAM, _async_remove_program, _REMOVE_PROGRAM_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RENAME_PROGRAM, _async_rename_program, _RENAME_PROGRAM_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_ZONE,
        _async_add_zone,
        _ADD_ZONE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_UPDATE_ZONE, _async_update_zone, _UPDATE_ZONE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REMOVE_ZONE, _async_remove_zone, _REMOVE_ZONE_SCHEMA
    )
