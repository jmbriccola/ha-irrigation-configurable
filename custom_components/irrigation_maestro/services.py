"""Domain services (docs/design/card-contract.md).

Services are registered once per Home Assistant instance and resolve the
single hub entry at call time. Every user-facing failure raises
``ServiceValidationError`` with a translation key — never a bare exception.
"""

from __future__ import annotations

import json
from typing import Any, Final, cast

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
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
from .engine.curves import CurveError, validate_points
from .models import HubConfig, ZoneConfig
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

ATTR_ZONE_ID: Final = "zone_id"
ATTR_CYCLE_ID: Final = "cycle_id"
ATTR_DURATION: Final = "duration"
ATTR_HOURS: Final = "hours"
ATTR_UNTIL: Final = "until"
ATTR_ORDER: Final = "order"
ATTR_POINTS: Final = "points"
ATTR_MIN_VALUE: Final = "min_value"
ATTR_MAX_VALUE: Final = "max_value"
ATTR_PAYLOAD: Final = "payload"

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
_IMPORT_CONFIG_SCHEMA = vol.Schema({vol.Required(ATTR_PAYLOAD): cv.string})
_EMPTY_SCHEMA = vol.Schema({})


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

    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    for item in cycles:
        if item.get(const.CONF_CYCLE_ID) == cycle_id:
            item[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[temp, value] for temp, value in points],
                const.CONF_CURVE_MIN: min_value,
                const.CONF_CURVE_MAX: max_value,
                const.CONF_CURVE_KIND: str(cycle.curve.kind),
            }
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )


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
        DOMAIN,
        SERVICE_EXPORT_CONFIG,
        _async_export_config,
        _EMPTY_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_CONFIG, _async_import_config, _IMPORT_CONFIG_SCHEMA
    )
