"""Domain services (docs/design/card-contract.md).

Services are registered once per Home Assistant instance and resolve the
single hub entry at call time. Every user-facing failure raises
``ServiceValidationError`` with a translation key — never a bare exception.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from copy import deepcopy
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
from .engine.calendar import ProgramCalendar
from .engine.curves import CurveError, CurveKind, interpolate, validate_points
from .migration import MigrationNote, migrate_zone_v2_to_v3
from .models import CycleConfig, HubConfig, ZoneConfig, resolve_curve
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
)
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
SERVICE_EXPORT_CONFIG: Final = "export_config"
SERVICE_IMPORT_CONFIG: Final = "import_config"
SERVICE_SET_PROGRAM_SCHEDULE: Final = "set_program_schedule"
SERVICE_SET_PROGRAM_MINUTES: Final = "set_program_minutes"
SERVICE_ADD_PROGRAM: Final = "add_program"
SERVICE_DUPLICATE_PROGRAM: Final = "duplicate_program"
SERVICE_COPY_CURVE: Final = "copy_curve"
SERVICE_REMOVE_PROGRAM: Final = "remove_program"
SERVICE_RENAME_PROGRAM: Final = "rename_program"
SERVICE_ADD_ZONE: Final = "add_zone"
SERVICE_UPDATE_ZONE: Final = "update_zone"
SERVICE_REMOVE_ZONE: Final = "remove_zone"
SERVICE_SET_WEATHER_SOURCES: Final = "set_weather_sources"
SERVICE_SET_CONSUMPTION_BUDGET: Final = "set_consumption_budget"
SERVICE_SET_RESTRICTIONS: Final = "set_restrictions"
SERVICE_SET_SESSION_LIMITS: Final = "set_session_limits"
SERVICE_SET_VALVE_SAFETY: Final = "set_valve_safety"
SERVICE_SET_CONCURRENCY: Final = "set_concurrency"
SERVICE_SET_NOTIFICATIONS: Final = "set_notifications"
SERVICE_SET_PROGRAM_ADVANCED: Final = "set_program_advanced"

ATTR_ZONE_ID: Final = "zone_id"
ATTR_CYCLE_ID: Final = "cycle_id"
ATTR_DURATION: Final = "duration"
ATTR_HOURS: Final = "hours"
ATTR_UNTIL: Final = "until"
ATTR_ORDER: Final = "order"
ATTR_POINTS: Final = "points"
ATTR_MIN_VALUE: Final = "min_value"
ATTR_MAX_VALUE: Final = "max_value"
ATTR_KIND: Final = "kind"
ATTR_PAYLOAD: Final = "payload"
ATTR_PROGRAM_ID: Final = "program_id"
ATTR_TARGET_ZONE_ID: Final = "target_zone_id"
ATTR_SOURCE_ZONE_ID: Final = "source_zone_id"
ATTR_SOURCE_PROGRAM_ID: Final = "source_program_id"
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
ATTR_PARITY: Final = "parity"
ATTR_CALENDAR_MODE: Final = "calendar_mode"
ATTR_FORBIDDEN_WINDOWS: Final = "forbidden_windows"
ATTR_WINDOW_START: Final = "start"
ATTR_WINDOW_END: Final = "end"
ATTR_SESSION_MAX_MIN: Final = "session_max_min"
ATTR_MUST_FINISH_BY: Final = "must_finish_by"
ATTR_WAIT_FREE_MIN: Final = "wait_free_min"
ATTR_MANUAL_BLOCK_MIN: Final = "manual_block_min"
ATTR_SETTLE_PAUSE_S: Final = "settle_pause_s"
ATTR_SENTINEL_TIME: Final = "sentinel_time"
ATTR_OPEN_CONFIRM_S: Final = "open_confirm_s"
ATTR_CLOSE_CONFIRM_S: Final = "close_confirm_s"
ATTR_SWITCH_CONFIRM_S: Final = "switch_confirm_s"
ATTR_STARTUP_VALVE_TIMEOUT_S: Final = "startup_valve_timeout_s"
ATTR_WATCHDOG_MAX_MIN: Final = "watchdog_max_min"
ATTR_MAX_CONCURRENT: Final = "max_concurrent"
ATTR_COMPATIBILITY_GROUPS: Final = "compatibility_groups"
ATTR_MASTER_PRE_OPEN_S: Final = "master_pre_open_s"
ATTR_MASTER_POST_CLOSE_S: Final = "master_post_close_s"
ATTR_EVENT: Final = "event"
ATTR_ENABLED: Final = "enabled"
ATTR_SERVICES: Final = "services"
ATTR_SOAK_MAX_RUN_MIN: Final = "soak_max_run_min"
ATTR_SOAK_PAUSE_MIN: Final = "soak_pause_min"
ATTR_VOLUME_SAFETY_TIMEOUT_MIN: Final = "volume_safety_timeout_min"

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
        vol.Optional(ATTR_KIND): vol.In([str(CurveKind.DURATION), str(CurveKind.VOLUME)]),
    }
)
_IMPORT_CONFIG_SCHEMA = vol.Schema({vol.Required(ATTR_PAYLOAD): cv.string})
_EMPTY_SCHEMA = vol.Schema({})

_WEEKDAYS = vol.All([vol.All(vol.Coerce(int), vol.Range(min=0, max=6))], vol.Length(max=7))
_MONTHS = vol.All([vol.All(vol.Coerce(int), vol.Range(min=1, max=12))], vol.Length(max=12))

_SET_PROGRAM_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_CALENDAR_MODE, default="weekdays"): vol.In(
            ["weekdays", "interval", "parity"]
        ),
        vol.Optional(ATTR_DAYS, default=list): _WEEKDAYS,
        vol.Optional(ATTR_INTERVAL_DAYS): vol.All(vol.Coerce(int), vol.Range(min=1, max=60)),
        vol.Optional(ATTR_PARITY): vol.In(["odd", "even"]),
        vol.Optional(ATTR_SEASON_MONTHS): _MONTHS,
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
_DUPLICATE_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_TARGET_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
    }
)
_COPY_CURVE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_SOURCE_ZONE_ID): cv.string,
        vol.Required(ATTR_SOURCE_PROGRAM_ID): cv.string,
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
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
        vol.Optional(ATTR_COMPATIBILITY_GROUP): cv.string,
    }
)
_REMOVE_ZONE_SCHEMA = vol.Schema({vol.Required(ATTR_ZONE_ID): cv.string})

_SET_WEATHER_SOURCES_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_WEATHER_ENTITY): vol.All(cv.string, vol.Length(min=1)),
        vol.Optional(ATTR_RAIN_SENSOR): cv.string,
        vol.Optional(ATTR_OUTDOOR_TEMP_SENSOR): cv.string,
        vol.Optional(ATTR_LINE_FLOW_SENSOR): cv.string,
        vol.Optional(ATTR_MASTER_VALVE): cv.string,
    }
)

_SET_CONSUMPTION_BUDGET_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_LITERS_PER_MONTH): vol.All(vol.Coerce(float), vol.Range(min=0)),
        vol.Required(ATTR_ACTION): vol.In(
            [const.BUDGET_ACTION_NOTIFY, const.BUDGET_ACTION_REDUCE, const.BUDGET_ACTION_SUSPEND]
        ),
        vol.Optional(ATTR_REDUCE_PCT): vol.All(vol.Coerce(int), vol.Range(min=1, max=100)),
    }
)
_WINDOW_SCHEMA = vol.Schema(
    {vol.Required(ATTR_WINDOW_START): cv.string, vol.Required(ATTR_WINDOW_END): cv.string}
)
_SET_RESTRICTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_FORBIDDEN_WINDOWS): [_WINDOW_SCHEMA],
    }
)

# attr -> option key; optional ones MERGE: present+non-empty sets, present+empty
# clears, absent unchanged
_WEATHER_OPT_KEYS: Final = {
    ATTR_RAIN_SENSOR: const.CONF_RAIN_SENSOR,
    ATTR_OUTDOOR_TEMP_SENSOR: const.CONF_OUTDOOR_TEMP_SENSOR,
    ATTR_LINE_FLOW_SENSOR: const.CONF_LINE_FLOW_SENSOR,
    ATTR_MASTER_VALVE: const.CONF_MASTER_VALVE,
}


# attr -> zone-data const key, with the coercion already applied by the schema
def _seconds(low: int, high: int) -> Any:
    return vol.All(vol.Coerce(int), vol.Range(min=low, max=high))


_SESSION_LIMIT_KEYS: Final = {
    ATTR_SESSION_MAX_MIN: const.CONF_SESSION_MAX_MIN,
    ATTR_MUST_FINISH_BY: const.CONF_MUST_FINISH_BY,
    ATTR_WAIT_FREE_MIN: const.CONF_WAIT_FREE_MIN,
    ATTR_MANUAL_BLOCK_MIN: const.CONF_MANUAL_BLOCK_MIN,
    ATTR_SETTLE_PAUSE_S: const.CONF_SETTLE_PAUSE_S,
    ATTR_SENTINEL_TIME: const.CONF_SENTINEL_TIME,
}
_VALVE_SAFETY_KEYS: Final = {
    ATTR_OPEN_CONFIRM_S: const.CONF_OPEN_CONFIRM_S,
    ATTR_CLOSE_CONFIRM_S: const.CONF_CLOSE_CONFIRM_S,
    ATTR_SWITCH_CONFIRM_S: const.CONF_SWITCH_CONFIRM_S,
    ATTR_STARTUP_VALVE_TIMEOUT_S: const.CONF_STARTUP_VALVE_TIMEOUT_S,
    ATTR_WATCHDOG_MAX_MIN: const.CONF_WATCHDOG_MAX_MIN,
}
_CONCURRENCY_KEYS: Final = {
    ATTR_MAX_CONCURRENT: const.CONF_MAX_CONCURRENT,
    ATTR_COMPATIBILITY_GROUPS: const.CONF_COMPATIBILITY_GROUPS,
    ATTR_MASTER_PRE_OPEN_S: const.CONF_MASTER_PRE_OPEN_S,
    ATTR_MASTER_POST_CLOSE_S: const.CONF_MASTER_POST_CLOSE_S,
}

# Built from notify.py so a renamed event cannot drift out of sync here.
_NOTIFY_EVENTS: Final = (
    EVENT_COMPLETED,
    EVENT_SKIPPED,
    EVENT_INTERRUPTED,
    EVENT_CANCELLED,
    EVENT_ANOMALY,
    EVENT_WATCHDOG,
    EVENT_SENTINEL,
    EVENT_SESSION_OVERRUN,
    EVENT_CONSUMPTION_BUDGET,
)

_SET_PROGRAM_ADVANCED_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_SOAK_MAX_RUN_MIN): vol.All(vol.Coerce(int), vol.Range(min=1, max=1440)),
        vol.Optional(ATTR_SOAK_PAUSE_MIN): vol.All(vol.Coerce(int), vol.Range(min=0, max=1440)),
        vol.Optional(ATTR_VOLUME_SAFETY_TIMEOUT_MIN): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=1440)
        ),
    }
)
_SET_NOTIFICATIONS_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_EVENT): vol.In(_NOTIFY_EVENTS),
        vol.Optional(ATTR_ENABLED): cv.boolean,
        vol.Optional(ATTR_SERVICES): vol.All(cv.ensure_list, [cv.string]),
    }
)
_SET_SESSION_LIMITS_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_SESSION_MAX_MIN): _seconds(1, 1440),
        vol.Optional(ATTR_MUST_FINISH_BY): cv.string,
        vol.Optional(ATTR_WAIT_FREE_MIN): _seconds(0, 120),
        vol.Optional(ATTR_MANUAL_BLOCK_MIN): _seconds(0, 1440),
        vol.Optional(ATTR_SETTLE_PAUSE_S): _seconds(0, 600),
        vol.Optional(ATTR_SENTINEL_TIME): cv.string,
    }
)
_SET_VALVE_SAFETY_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_OPEN_CONFIRM_S): _seconds(1, 300),
        vol.Optional(ATTR_CLOSE_CONFIRM_S): _seconds(1, 300),
        vol.Optional(ATTR_SWITCH_CONFIRM_S): _seconds(1, 300),
        vol.Optional(ATTR_STARTUP_VALVE_TIMEOUT_S): _seconds(1, 600),
        vol.Optional(ATTR_WATCHDOG_MAX_MIN): _seconds(1, 1440),
    }
)
_SET_CONCURRENCY_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_MAX_CONCURRENT): _seconds(1, 10),
        vol.Optional(ATTR_COMPATIBILITY_GROUPS): cv.string,
        vol.Optional(ATTR_MASTER_PRE_OPEN_S): _seconds(0, 600),
        vol.Optional(ATTR_MASTER_POST_CLOSE_S): _seconds(0, 600),
    }
)

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
    ATTR_COMPATIBILITY_GROUP: const.CONF_COMPATIBILITY_GROUP,
}


#: The default curve for a new program: 5 minutes on a cold day, 15 on a mild
#: one, 23 on a hot one. These are exactly the points the retired semantic
#: mapping produced for amount=15, heat=8, so a program created before and
#: after 3.0.0 starts identically.
DEFAULT_CURVE_POINTS: Final = ((12.0, 5.0), (25.0, 15.0), (35.0, 23.0))


def _default_program(name: str) -> dict[str, Any]:
    """A valid, sensible new program: every day, sunrise, 15' mild + 8' hot."""
    return {
        const.CONF_CYCLE_ID: uuid4().hex[:8],
        const.CONF_CYCLE_NAME: name,
        const.CONF_TRIGGER: {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
            const.CONF_TRIGGER_EVENT: "sunrise",
            const.CONF_TRIGGER_OFFSET_S: 0,
        },
        const.CONF_CURVE: {
            const.CONF_CURVE_POINTS: [[temp, value] for temp, value in DEFAULT_CURVE_POINTS],
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


def _write_hub_options(hass: HomeAssistant, entry: ConfigEntry, options: dict[str, Any]) -> None:
    """Validate a COMPLETE options dict and persist it in place.

    Callers build ``options`` from ``dict(entry.options)`` and set/pop keys, so
    clearing a key actually takes effect (a re-merge with entry.options here
    would silently resurrect popped keys).
    """
    try:
        HubConfig.from_options(options)
    except (ValueError, KeyError, TypeError) as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_hub_settings",
            translation_placeholders={"error": str(err)},
        ) from err
    hass.config_entries.async_update_entry(entry, options=options)


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
            # set_curve carries absolute minutes (or litres), so the number
            # the user authored must be the number delivered -- a surviving
            # hidden intensity multiplier would make the result differ from
            # what they drew. The quick minutes control (set_program_minutes)
            # stays the only writer of the intensity.
            item.pop(const.CONF_CYCLE_INTENSITY_PCT, None)
            item.pop(const.CONF_CYCLE_DAY_INTENSITY_PCT, None)
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

    kind = str(call.data.get(ATTR_KIND, cycle.curve.kind))
    if kind == CurveKind.VOLUME and not runtime.zone_has_flow_meter(runtime.zones[zone_id].config):
        # A volume target without a usable meter would degrade to a timed run;
        # refuse at configuration time rather than surprise at watering time.
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": cycle_id},
        )

    _write_cycle_curve(hass, entry, zone_id, cycle_id, points, min_value, max_value, kind)


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


def _calendar_from_call(call: ServiceCall) -> dict[str, Any]:
    """The whole calendar as one mode. Switching mode leaves no residue."""
    mode = call.data[ATTR_CALENDAR_MODE]
    try:
        if mode == "interval":
            calendar = ProgramCalendar.interval(call.data[ATTR_INTERVAL_DAYS])
        elif mode == "parity":
            parity = call.data[ATTR_PARITY]
            calendar = ProgramCalendar.odd() if parity == "odd" else ProgramCalendar.even()
        else:
            days = sorted(set(call.data[ATTR_DAYS]))
            calendar = ProgramCalendar.weekdays(days) if days else ProgramCalendar.daily()
    except KeyError as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="calendar_field_required",
            translation_placeholders={"mode": mode},
        ) from err
    return calendar.to_config()


async def _async_set_program_schedule(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)
    calendar = _calendar_from_call(call)
    season = call.data.get(ATTR_SEASON_MONTHS)
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
        item[const.CONF_CALENDAR] = calendar
        item.pop(const.CONF_CYCLE_DAYS, None)  # legacy v1 key, never revived
        if season is not None:
            item[const.CONF_SEASON_MONTHS] = sorted(set(season))
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
    reference = interpolate(cycle.curve.points, const.CURVE_REFERENCE_TEMP_C)
    if reference <= 0:
        # A curve worth zero minutes at the reference cannot be scaled into
        # any target; refuse rather than divide by zero or invent points.
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="cannot_scale_zero_curve",
            translation_placeholders={"cycle_id": program_id},
        )

    mutate: Callable[[dict[str, Any]], None]
    if ATTR_MINUTES in call.data:
        intensity = round(100.0 * float(call.data[ATTR_MINUTES]) / reference, 2)

        def mutate(item: dict[str, Any]) -> None:
            # The curve is never touched here: minutes are a strength, not a
            # shape. Uniform minutes clear any per-day override.
            item[const.CONF_CYCLE_INTENSITY_PCT] = intensity
            item.pop(const.CONF_CYCLE_DAY_INTENSITY_PCT, None)

    elif ATTR_DAY_MINUTES in call.data:
        day_map: dict[str, float] = {}
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
            day_map[str(weekday)] = round(100.0 * float(raw_val) / reference, 2)

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CYCLE_DAY_INTENSITY_PCT] = day_map

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


def _unique_program_name(cycles: list[dict[str, Any]], preferred: str) -> str:
    """A name no program in the target zone already uses."""
    taken = {str(cycle.get(const.CONF_CYCLE_NAME, "")) for cycle in cycles}
    if preferred not in taken:
        return preferred
    for suffix in range(2, 100):
        candidate = f"{preferred} {suffix}"
        if candidate not in taken:
            return candidate
    return f"{preferred} {uuid4().hex[:4]}"


async def _async_duplicate_program(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    target_zone_id: str = call.data.get(ATTR_TARGET_ZONE_ID, zone_id)
    _require_zone(runtime, target_zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]

    source = next(
        (
            dict(item)
            for item in entry.subentries[zone_id].data.get(const.CONF_CYCLES, [])
            if item.get(const.CONF_CYCLE_ID) == program_id
        ),
        None,
    )
    if source is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )

    target = entry.subentries[target_zone_id]
    cycles = [dict(item) for item in target.data.get(const.CONF_CYCLES, [])]

    program = deepcopy(source)
    # A fresh id is what keeps runtime state out of the copy: last_completed
    # and outcome_log are keyed by program, so the duplicate starts unmarked.
    program[const.CONF_CYCLE_ID] = uuid4().hex[:8]
    preferred = call.data.get(ATTR_NAME, f"{source.get(const.CONF_CYCLE_NAME, 'Program')} (copy)")
    program[const.CONF_CYCLE_NAME] = _unique_program_name(cycles, str(preferred))

    curve = resolve_curve(program[const.CONF_CURVE], runtime.hub.curve_templates)
    if curve.kind is CurveKind.VOLUME and not runtime.zone_has_flow_meter(
        runtime.zones[target_zone_id].config
    ):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": program[const.CONF_CYCLE_ID]},
        )

    _validate_program(program, runtime.hub.curve_templates)
    cycles.append(program)
    hass.config_entries.async_update_subentry(
        entry, target, data={**target.data, const.CONF_CYCLES: cycles}
    )
    return {"program_id": program[const.CONF_CYCLE_ID]}


async def _async_copy_curve(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    source_zone_id: str = call.data[ATTR_SOURCE_ZONE_ID]
    _require_zone(runtime, source_zone_id)
    source_program_id: str = call.data[ATTR_SOURCE_PROGRAM_ID]
    source_cycle = runtime.zones[source_zone_id].config.cycle(source_program_id)
    if source_cycle is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": source_program_id},
        )

    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    if source_cycle.curve.kind is CurveKind.VOLUME and not runtime.zone_has_flow_meter(
        runtime.zones[zone_id].config
    ):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": program_id},
        )

    curve_config = deepcopy(source_cycle.curve_config)

    def mutate(item: dict[str, Any]) -> None:
        # Only the shape travels: schedule, calendar, soak, name and intensity
        # belong to the destination program.
        item[const.CONF_CURVE] = curve_config

    _update_cycle(hass, entry, zone_id, program_id, mutate)


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

    # One convention, on the service side: the service is the only path that
    # creates a zone now, so it writes the defaults rather than leaving them
    # implicit in half the installations.
    existing_orders = [
        int(subentry.data.get(const.CONF_ORDER, const.DEFAULT_ORDER))
        for subentry in entry.subentries.values()
        if subentry.subentry_type == SUBENTRY_TYPE_ZONE
    ]
    data[const.CONF_ORDER] = max(existing_orders, default=const.DEFAULT_ORDER - 1) + 1
    data[const.CONF_ADJUSTMENT_PCT] = const.DEFAULT_ADJUSTMENT_PCT

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


async def _async_set_weather_sources(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    merged = dict(entry.options)
    merged[const.CONF_WEATHER_ENTITY] = call.data[ATTR_WEATHER_ENTITY]
    for attr, opt_key in _WEATHER_OPT_KEYS.items():
        if attr in call.data:  # absent = unchanged
            value = call.data[attr]
            if value:  # non-empty = set
                merged[opt_key] = value
            else:  # explicit empty = clear
                merged.pop(opt_key, None)
    _write_hub_options(hass, entry, merged)


async def _async_set_consumption_budget(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    budget: dict[str, Any] = {const.CONF_BUDGET_ACTION: call.data[ATTR_ACTION]}
    if ATTR_LITERS_PER_MONTH in call.data and call.data[ATTR_LITERS_PER_MONTH] > 0:
        budget[const.CONF_BUDGET_LITERS] = float(call.data[ATTR_LITERS_PER_MONTH])
    if ATTR_REDUCE_PCT in call.data:
        budget[const.CONF_BUDGET_REDUCE_PCT] = int(call.data[ATTR_REDUCE_PCT])
    merged = dict(entry.options)
    merged[const.CONF_CONSUMPTION_BUDGET] = budget
    _write_hub_options(hass, entry, merged)


def _patch_hub_options(call: ServiceCall, mapping: dict[str, str]) -> None:
    """Apply the fields present in the call to the hub options.

    Absent means unchanged, matching update_zone. The COMPLETE dict goes
    through _write_hub_options, which validates it via HubConfig.from_options
    before anything is persisted, so a bad combination fails the call rather
    than reaching the runtime.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    options = dict(entry.options)
    for attr, conf_key in mapping.items():
        if attr in call.data:
            options[conf_key] = call.data[attr]
    _write_hub_options(hass, entry, options)


async def _async_set_program_advanced(call: ServiceCall) -> None:
    """Cycle-and-soak and the volume safety timeout, per program."""
    hass, entry, zone_id, program_id = _program_context(call)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    cycle = runtime.zones[zone_id].config.cycle(program_id)
    existing_max_run = cycle.soak_max_run_min if cycle else None
    new_max_run = call.data.get(ATTR_SOAK_MAX_RUN_MIN, existing_max_run)
    if call.data.get(ATTR_SOAK_PAUSE_MIN) and not new_max_run:
        # The run would never be split, so the pause would silently do nothing.
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="soak_pause_without_max_run"
        )

    def mutate(item: dict[str, Any]) -> None:
        for attr, conf_key in (
            (ATTR_SOAK_MAX_RUN_MIN, const.CONF_SOAK_MAX_RUN_MIN),
            (ATTR_SOAK_PAUSE_MIN, const.CONF_SOAK_PAUSE_MIN),
            (ATTR_VOLUME_SAFETY_TIMEOUT_MIN, const.CONF_VOLUME_SAFETY_TIMEOUT_MIN),
        ):
            if attr in call.data:
                item[conf_key] = call.data[attr]

    _update_cycle(hass, entry, zone_id, program_id, mutate)


async def _async_set_notifications(call: ServiceCall) -> None:
    """Enable/disable one event and set the notify services it calls.

    One event per call: a caller never has to post the whole nested structure
    back, and so cannot clobber the events it did not mean to touch.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    options = dict(entry.options)
    notifications = {
        key: dict(value) for key, value in options.get(const.CONF_NOTIFICATIONS, {}).items()
    }
    event = call.data[ATTR_EVENT]
    current = notifications.get(event, {})
    if ATTR_ENABLED in call.data:
        current[const.CONF_NOTIFY_ENABLED] = call.data[ATTR_ENABLED]
    if ATTR_SERVICES in call.data:
        current[const.CONF_NOTIFY_SERVICES] = list(call.data[ATTR_SERVICES])
    notifications[event] = current
    options[const.CONF_NOTIFICATIONS] = notifications
    _write_hub_options(hass, entry, options)


async def _async_set_session_limits(call: ServiceCall) -> None:
    _patch_hub_options(call, _SESSION_LIMIT_KEYS)


async def _async_set_valve_safety(call: ServiceCall) -> None:
    _patch_hub_options(call, _VALVE_SAFETY_KEYS)


async def _async_set_concurrency(call: ServiceCall) -> None:
    _patch_hub_options(call, _CONCURRENCY_KEYS)


async def _async_set_restrictions(call: ServiceCall) -> None:
    """Forbidden time-of-day windows.

    Restrictions constrain hours only from 2.0.0. Which *days* a zone waters
    is a program calendar decision — keeping a second weekday chooser here is
    what let two schedules silently cancel each other out.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    restrictions: dict[str, Any] = {}
    if ATTR_FORBIDDEN_WINDOWS in call.data:
        restrictions[const.CONF_FORBIDDEN_WINDOWS] = [
            {
                const.CONF_WINDOW_START: str(w[ATTR_WINDOW_START])[:5],
                const.CONF_WINDOW_END: str(w[ATTR_WINDOW_END])[:5],
            }
            for w in call.data[ATTR_FORBIDDEN_WINDOWS]
        ]
    merged = dict(entry.options)
    merged[const.CONF_RESTRICTIONS] = restrictions
    _write_hub_options(hass, entry, merged)


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

    # A payload exported from a pre-3.0 install still carries v2-shaped zone
    # data: curve template references and a day_minutes map. The v2 -> v3
    # migration only ever runs on a config-entry version bump, so an entry
    # already at v3 never sees it -- writing the payload verbatim would
    # silently revive both defects that migration removed. Run every zone
    # through the same migration the entry-version upgrade uses, using the
    # imported options' templates the same way async_migrate_entry does. A
    # v3 payload passes through unchanged, so applying this unconditionally
    # is correct for both a legacy export and a current one.
    templates = options.get(const.CONF_CURVE_TEMPLATES, {})
    migration_notes: list[MigrationNote] = []
    migrated_zones: dict[str, Any] = {}
    for zone_id, data in zones.items():
        if isinstance(data, dict):
            migrated, zone_notes = migrate_zone_v2_to_v3(data, templates)
            migration_notes.extend(zone_notes)
            migrated_zones[zone_id] = migrated
        else:
            migrated_zones[zone_id] = data
    zones = migrated_zones

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
    if migration_notes:
        # Anything the migration could not carry over (an unresolvable
        # template, a curve worth zero at the reference) becomes a repair
        # issue the same way a config-entry version bump reports it -- a
        # silent loss during import would be worse than during upgrade,
        # since the user just watched the import "succeed".
        from . import async_report_migration_notes  # noqa: PLC0415 -- avoids a package import cycle

        async_report_migration_notes(hass, migration_notes)


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
        DOMAIN,
        SERVICE_DUPLICATE_PROGRAM,
        _async_duplicate_program,
        _DUPLICATE_PROGRAM_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(DOMAIN, SERVICE_COPY_CURVE, _async_copy_curve, _COPY_CURVE_SCHEMA)
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
    hass.services.async_register(
        DOMAIN, SERVICE_SET_WEATHER_SOURCES, _async_set_weather_sources, _SET_WEATHER_SOURCES_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_CONSUMPTION_BUDGET,
        _async_set_consumption_budget,
        _SET_CONSUMPTION_BUDGET_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_RESTRICTIONS, _async_set_restrictions, _SET_RESTRICTIONS_SCHEMA
    )
    for name, handler, schema in (
        (SERVICE_SET_SESSION_LIMITS, _async_set_session_limits, _SET_SESSION_LIMITS_SCHEMA),
        (SERVICE_SET_VALVE_SAFETY, _async_set_valve_safety, _SET_VALVE_SAFETY_SCHEMA),
        (SERVICE_SET_CONCURRENCY, _async_set_concurrency, _SET_CONCURRENCY_SCHEMA),
        (SERVICE_SET_NOTIFICATIONS, _async_set_notifications, _SET_NOTIFICATIONS_SCHEMA),
        (
            SERVICE_SET_PROGRAM_ADVANCED,
            _async_set_program_advanced,
            _SET_PROGRAM_ADVANCED_SCHEMA,
        ),
    ):
        hass.services.async_register(DOMAIN, name, handler, schema)
