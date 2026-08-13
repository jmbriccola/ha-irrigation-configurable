"""Config, options and zone-subentry flows for Irrigation Maestro."""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from copy import deepcopy
from typing import Any, Final, Literal
from uuid import uuid4

import voluptuous as vol
from homeassistant.config_entries import (
    SOURCE_RECONFIGURE,
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    ConfigSubentryFlow,
    OptionsFlow,
    SubentryFlowResult,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from . import const
from .engine.curves import CurveError, CurveKind, validate_points
from .engine.model import EngineParams

# Form-only keys (never stored under these names).
_FIELD_OFFSET_MIN: Final = "offset_min"
_FIELD_RESET: Final = "reset_to_defaults"
_FIELD_EVENT: Final = "event"
_FIELD_SOURCE: Final = "source"
_FIELD_CYCLE: Final = "cycle"

# EngineParams fields without a const.py alias (keys must match the dataclass).
_CONF_STAGE_COMMIT_MINUTE: Final = "stage_commit_minute"
_CONF_DAILY_RAIN_CAP: Final = "daily_rain_cap_mm"
_CONF_HOURLY_STAGING_CAP: Final = "hourly_staging_cap_mm"

_ENGINE_DEFAULTS: Final = EngineParams()

NOTIFY_EVENTS: Final[tuple[str, ...]] = (
    "completed",
    "skipped",
    "interrupted",
    "cancelled",
    "anomaly",
    "watchdog",
    "sentinel",
    "session_overrun",
    "consumption_budget",
)
NOTIFY_PRIORITIES: Final[tuple[str, ...]] = ("normal", "high")

_CURVE_SOURCE_CUSTOM: Final = "custom"
_CURVE_SOURCE_COPY: Final = "copy"

_MAX_DURATION_MIN: Final = 1440
_MAX_OFFSET_MIN: Final = 360

_HUB_OPTIONAL_ENTITIES: Final = (
    const.CONF_RAIN_SENSOR,
    const.CONF_OUTDOOR_TEMP_SENSOR,
    const.CONF_LINE_FLOW_SENSOR,
    const.CONF_MASTER_VALVE,
)

_TIME_WINDOW_RE: Final = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$")


# ---------------------------------------------------------------------------
# Small selector builders


def _entity(domain: str | list[str]) -> selector.EntitySelector:
    return selector.EntitySelector(selector.EntitySelectorConfig(domain=domain))


def _number(
    *,
    min_value: float | None = None,
    max_value: float | None = None,
    step: float | Literal["any"] = 1,
    unit: str | None = None,
) -> selector.NumberSelector:
    config = selector.NumberSelectorConfig(mode=selector.NumberSelectorMode.BOX, step=step)
    if min_value is not None:
        config["min"] = min_value
    if max_value is not None:
        config["max"] = max_value
    if unit is not None:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


def _select(
    options: Sequence[str] | Sequence[selector.SelectOptionDict],
    *,
    translation_key: str,
    multiple: bool = False,
    custom_value: bool = False,
) -> selector.SelectSelector:
    return selector.SelectSelector(
        selector.SelectSelectorConfig(
            options=options,
            multiple=multiple,
            custom_value=custom_value,
            mode=selector.SelectSelectorMode.DROPDOWN,
            translation_key=translation_key,
        )
    )


def _months_select() -> selector.SelectSelector:
    return _select([str(month) for month in range(1, 13)], translation_key="month", multiple=True)


def _weekdays_select() -> selector.SelectSelector:
    return _select([str(day) for day in range(7)], translation_key="weekday", multiple=True)


# ---------------------------------------------------------------------------
# Text parsing helpers (comma-separated user input)


def _parse_points_text(text: str) -> list[list[float]]:
    """Parse '10:5, 25:15' into point pairs; CurveError with a stable key on failure."""
    points: list[list[float]] = []
    for chunk in text.split(","):
        item = chunk.strip()
        if not item:
            continue
        temp_text, sep, value_text = item.partition(":")
        if not sep:
            raise CurveError("invalid_points_format")
        try:
            points.append([float(temp_text), float(value_text)])
        except ValueError:
            raise CurveError("invalid_points_format") from None
    validate_points([(temp, value) for temp, value in points])
    return points


def _format_points(points: Iterable[Sequence[float]]) -> str:
    return ", ".join(f"{temp:g}:{value:g}" for temp, value in points)


def _parse_float_list(text: str, expected: int) -> list[float]:
    values = [float(chunk) for chunk in text.split(",") if chunk.strip()]
    if len(values) != expected:
        raise ValueError(f"expected {expected} values")
    return values


def _format_float_list(values: Iterable[float]) -> str:
    return ", ".join(f"{value:g}" for value in values)


def _parse_windows_text(text: str) -> list[dict[str, str]]:
    """Parse '08:00-10:30, 22:00-23:00' into window dicts; ValueError on failure."""
    windows: list[dict[str, str]] = []
    for chunk in text.split(","):
        item = chunk.strip()
        if not item:
            continue
        match = _TIME_WINDOW_RE.match(item)
        if match is None:
            raise ValueError(f"invalid window: {item}")
        windows.append(
            {
                const.CONF_WINDOW_START: f"{match[1]}:{match[2]}",
                const.CONF_WINDOW_END: f"{match[3]}:{match[4]}",
            }
        )
    return windows


def _format_windows(windows: Iterable[Mapping[str, str]]) -> str:
    return ", ".join(
        f"{window[const.CONF_WINDOW_START]}-{window[const.CONF_WINDOW_END]}" for window in windows
    )


def _parse_name_list(text: str) -> list[str]:
    return [chunk.strip() for chunk in text.split(",") if chunk.strip()]


def _hh_mm(value: str) -> str:
    """Normalize a TimeSelector value ('HH:MM:SS' or 'HH:MM') to 'HH:MM'."""
    return value[:5]


def _hub_entities_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(const.CONF_WEATHER_ENTITY): _entity("weather"),
            vol.Optional(const.CONF_RAIN_SENSOR): _entity("sensor"),
            vol.Optional(const.CONF_OUTDOOR_TEMP_SENSOR): _entity("sensor"),
            vol.Optional(const.CONF_LINE_FLOW_SENSOR): _entity("sensor"),
            vol.Optional(const.CONF_MASTER_VALVE): _entity(["valve", "switch"]),
        }
    )


# ---------------------------------------------------------------------------
# Hub config flow


class IrrigationMaestroConfigFlow(ConfigFlow, domain=const.DOMAIN):
    """Create the single Irrigation Maestro hub entry."""

    VERSION = 3
    MINOR_VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> IrrigationMaestroOptionsFlow:
        """Return the hub options flow."""
        return IrrigationMaestroOptionsFlow()

    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        """Return the supported subentry flows."""
        return {const.SUBENTRY_TYPE_ZONE: ZoneSubentryFlowHandler}

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Create the hub entry from the initial form."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            options: dict[str, Any] = {
                const.CONF_WEATHER_ENTITY: user_input[const.CONF_WEATHER_ENTITY]
            }
            for key in _HUB_OPTIONAL_ENTITIES:
                if key in user_input:
                    options[key] = user_input[key]
            return self.async_create_entry(title="Irrigation Maestro", data={}, options=options)

        return self.async_show_form(step_id="user", data_schema=_hub_entities_schema())


# ---------------------------------------------------------------------------
# Hub options flow


class IrrigationMaestroOptionsFlow(OptionsFlow):
    """Edit the hub options, one section at a time."""

    _notify_event: str

    def _merged(self, updates: dict[str, Any], removals: Iterable[str] = ()) -> dict[str, Any]:
        """New options dict: current options with section updates applied."""
        options = dict(self.config_entry.options)
        for key in removals:
            options.pop(key, None)
        options.update(updates)
        return options

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show the section menu."""
        # Everything else moved to the panel in 2.1.0, so each setting has
        # exactly one editor. The weather decision engine stays here: it is
        # field-validated and deliberately out of the dashboard's reach.
        return self.async_show_menu(step_id="init", menu_options=["engine_advanced"])

    # -- Engine (advanced) --------------------------------------------------

    async def async_step_engine_advanced(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Every engine weight and threshold, with reset-to-defaults."""
        options = self.config_entry.options
        engine: Mapping[str, Any] = options.get(const.CONF_ENGINE, {})
        errors: dict[str, str] = {}

        weight_fields: tuple[tuple[str, int, str], ...] = (
            (const.CONF_TEMP_WEIGHTS, 5, "invalid_temp_weights"),
            (const.CONF_RAIN_WEIGHTS, 4, "invalid_rain_weights"),
            (const.CONF_FORECAST_CREDIT_WEIGHTS, 2, "invalid_forecast_weights"),
        )
        float_fields: tuple[str, ...] = (
            const.CONF_FORECAST_CREDIT_CAP,
            const.CONF_HOT_CREDIT_HALVING_TEMP,
            const.CONF_THRESHOLD_BASE,
            const.CONF_THRESHOLD_SLOPE,
            const.CONF_THRESHOLD_KNEE,
            const.CONF_THRESHOLD_MAX,
            const.CONF_FREEZE_SKIP,
            const.CONF_COLD_DAY_SKIP,
            const.CONF_WIND_SKIP_KMH,
            const.CONF_STAGED_RAIN_WEIGHT,
            _CONF_DAILY_RAIN_CAP,
            _CONF_HOURLY_STAGING_CAP,
        )
        engine_removals = (
            const.CONF_ENGINE,
            const.CONF_STALE_WEATHER_MAX_H,
            const.CONF_STALE_WEATHER_POLICY,
        )

        if user_input is not None:
            if user_input[_FIELD_RESET]:
                return self.async_create_entry(title="", data=self._merged({}, engine_removals))
            new_engine: dict[str, Any] = {}
            for key, count, error_key in weight_fields:
                try:
                    new_engine[key] = _parse_float_list(user_input[key], count)
                except ValueError:
                    errors[key] = error_key
            for key in float_fields:
                new_engine[key] = float(user_input[key])
            new_engine[_CONF_STAGE_COMMIT_MINUTE] = int(user_input[_CONF_STAGE_COMMIT_MINUTE])
            new_engine[const.CONF_WIND_SKIP_ENABLED] = bool(
                user_input[const.CONF_WIND_SKIP_ENABLED]
            )
            months = sorted(int(m) for m in user_input.get(const.CONF_SEASON_MONTHS, []))
            if months:
                new_engine[const.CONF_SEASON_MONTHS] = months
            if not errors:
                updates = {
                    const.CONF_ENGINE: new_engine,
                    const.CONF_STALE_WEATHER_MAX_H: int(user_input[const.CONF_STALE_WEATHER_MAX_H]),
                    const.CONF_STALE_WEATHER_POLICY: user_input[const.CONF_STALE_WEATHER_POLICY],
                }
                return self.async_create_entry(title="", data=self._merged(updates))

        def current(key: str) -> Any:
            return engine.get(key, getattr(_ENGINE_DEFAULTS, key))

        schema_dict: dict[Any, Any] = {
            vol.Required(key, default=_format_float_list(current(key))): selector.TextSelector()
            for key, _, _ in weight_fields
        }
        for key in float_fields:
            schema_dict[vol.Required(key, default=current(key))] = _number(step="any")
        schema_dict[
            vol.Required(_CONF_STAGE_COMMIT_MINUTE, default=current(_CONF_STAGE_COMMIT_MINUTE))
        ] = _number(min_value=0, max_value=59, unit="min")
        schema_dict[
            vol.Required(
                const.CONF_WIND_SKIP_ENABLED, default=current(const.CONF_WIND_SKIP_ENABLED)
            )
        ] = selector.BooleanSelector()
        schema_dict[
            vol.Optional(
                const.CONF_SEASON_MONTHS,
                default=[str(m) for m in sorted(current(const.CONF_SEASON_MONTHS))],
            )
        ] = _months_select()
        schema_dict[
            vol.Required(
                const.CONF_STALE_WEATHER_MAX_H,
                default=options.get(
                    const.CONF_STALE_WEATHER_MAX_H, const.DEFAULT_STALE_WEATHER_MAX_H
                ),
            )
        ] = _number(min_value=1, max_value=168, unit="h")
        schema_dict[
            vol.Required(
                const.CONF_STALE_WEATHER_POLICY,
                default=options.get(const.CONF_STALE_WEATHER_POLICY, const.STALE_POLICY_FAIL_OPEN),
            )
        ] = _select(
            [const.STALE_POLICY_FAIL_OPEN, const.STALE_POLICY_FAIL_CLOSED],
            translation_key="stale_weather_policy",
        )
        schema_dict[vol.Required(_FIELD_RESET, default=False)] = selector.BooleanSelector()

        schema = vol.Schema(schema_dict)
        if errors and user_input is not None:
            schema = self.add_suggested_values_to_schema(schema, user_input)
        return self.async_show_form(step_id="engine_advanced", data_schema=schema, errors=errors)


# ---------------------------------------------------------------------------
# Zone subentry flow


class ZoneSubentryFlowHandler(ConfigSubentryFlow):
    """Create or reconfigure one irrigation zone with its cycles."""

    def __init__(self) -> None:
        """Initialize in-flow working state."""
        self._zone_data: dict[str, Any] = {}
        self._cycles: list[dict[str, Any]] = []
        self._cycle_draft: dict[str, Any] = {}
        self._edit_index: int | None = None
        self._trigger_kind: str = const.TRIGGER_KIND_SUN
        # Volume safety timeout entered on the source step, applied once the
        # custom/copied curve's kind is known.
        self._pending_volume_timeout: float | None = None

    # -- Hub context ----------------------------------------------------------

    @property
    def _hub_options(self) -> Mapping[str, Any]:
        return self._get_entry().options

    @property
    def _hub_templates(self) -> Mapping[str, Any]:
        templates: Mapping[str, Any] = self._hub_options.get(const.CONF_CURVE_TEMPLATES, {})
        return templates

    @property
    def _volume_capable(self) -> bool:
        """Volume cycles need a per-zone flow meter or the shared line meter."""
        return (
            const.CONF_FLOW_SENSOR in self._zone_data
            or const.CONF_LINE_FLOW_SENSOR in self._hub_options
        )

    def _curve_kind_of(self, curve_conf: Mapping[str, Any]) -> str:
        """Resolve a curve config to duration/volume without building the Curve."""
        template_id = curve_conf.get(const.CONF_CURVE_TEMPLATE)
        if template_id is None:
            return str(curve_conf.get(const.CONF_CURVE_KIND, CurveKind.DURATION))
        if template_id in (const.PRESET_POTS_ID, const.PRESET_LAWN_ID):
            return str(CurveKind.DURATION)
        template: Mapping[str, Any] = self._hub_templates.get(template_id, {})
        return str(template.get(const.CONF_CURVE_KIND, CurveKind.DURATION))

    # -- Zone basics ------------------------------------------------------------

    def _zone_schema(self) -> vol.Schema:
        groups = list(self._hub_options.get(const.CONF_COMPATIBILITY_GROUPS, []))
        stored_group = self._zone_data.get(const.CONF_COMPATIBILITY_GROUP)
        if stored_group is not None and stored_group not in groups:
            groups.append(stored_group)
        schema: dict[Any, Any] = {
            vol.Required(const.CONF_ZONE_NAME): selector.TextSelector(),
            vol.Optional(const.CONF_ZONE_ICON): selector.IconSelector(),
            vol.Required(const.CONF_VALVE_ENTITY): _entity(["valve", "switch"]),
            vol.Optional(const.CONF_FLOW_SENSOR): _entity("sensor"),
            vol.Optional(const.CONF_NOMINAL_FLOW_LPM): _number(
                min_value=0, step="any", unit="L/min"
            ),
            vol.Optional(const.CONF_FLOW_TOLERANCE_PCT): _number(
                min_value=1, max_value=100, unit="%"
            ),
            vol.Optional(const.CONF_AREA_M2): _number(min_value=0, step="any", unit="m²"),
            # Ranges match the zone number entities and the set_zone_order
            # service (order 1-1000, adjustment 10-300%).
            vol.Required(const.CONF_ADJUSTMENT_PCT, default=const.DEFAULT_ADJUSTMENT_PCT): _number(
                min_value=10, max_value=300, unit="%"
            ),
            vol.Required(const.CONF_ORDER, default=const.DEFAULT_ORDER): _number(
                min_value=1, max_value=1000
            ),
            # Range enforced in code so the user gets a friendly error.
        }
        if groups:
            schema[vol.Optional(const.CONF_COMPATIBILITY_GROUP)] = _select(
                groups, translation_key="compatibility_group"
            )
        return vol.Schema(schema)

    def _zone_suggested_values(self) -> dict[str, Any]:
        return dict(self._zone_data)

    def _zone_data_from_input(
        self, user_input: dict[str, Any]
    ) -> tuple[dict[str, Any], dict[str, str]]:
        """Build the zone-basics dict; returns (data, errors)."""
        errors: dict[str, str] = {}
        data: dict[str, Any] = {
            const.CONF_ZONE_NAME: user_input[const.CONF_ZONE_NAME],
            const.CONF_VALVE_ENTITY: user_input[const.CONF_VALVE_ENTITY],
            const.CONF_ADJUSTMENT_PCT: int(user_input[const.CONF_ADJUSTMENT_PCT]),
            const.CONF_ORDER: int(user_input[const.CONF_ORDER]),
        }
        for key in (
            const.CONF_ZONE_ICON,
            const.CONF_FLOW_SENSOR,
            const.CONF_COMPATIBILITY_GROUP,
        ):
            if key in user_input:
                data[key] = user_input[key]
        for key in (
            const.CONF_NOMINAL_FLOW_LPM,
            const.CONF_FLOW_TOLERANCE_PCT,
            const.CONF_AREA_M2,
        ):
            if key in user_input:
                data[key] = float(user_input[key])
        return data, errors

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> SubentryFlowResult:
        """Zone basics, then the cycle loop."""
        errors: dict[str, str] = {}
        if user_input is not None:
            data, errors = self._zone_data_from_input(user_input)
            if not errors:
                self._zone_data = data
                return await self.async_step_cycle_menu()
        schema = self._zone_schema()
        if user_input is not None:
            schema = self.add_suggested_values_to_schema(schema, user_input)
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    # -- Creation cycle loop --------------------------------------------------

    async def async_step_cycle_menu(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Add another cycle or finish; at least one cycle is required."""
        menu_options = ["add_cycle"]
        if self._cycles:
            menu_options.append("finish")
        return self.async_show_menu(
            step_id="cycle_menu",
            menu_options=menu_options,
            description_placeholders={
                "zone_name": str(self._zone_data.get(const.CONF_ZONE_NAME, "")),
                "cycles": ", ".join(
                    str(cycle.get(const.CONF_CYCLE_NAME, "")) for cycle in self._cycles
                )
                or "—",
            },
        )

    async def async_step_finish(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Create the zone subentry."""
        data = {**self._zone_data, const.CONF_CYCLES: self._cycles}
        return self.async_create_entry(
            title=str(data[const.CONF_ZONE_NAME]), data=data, unique_id=None
        )

    # -- Cycle steps (shared by creation and reconfigure) ------------------------

    async def async_step_add_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Start a fresh cycle draft."""
        self._cycle_draft = {}
        self._edit_index = None
        return await self.async_step_cycle()

    async def async_step_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Cycle name, trigger kind and season override."""
        draft = self._cycle_draft
        if user_input is not None:
            draft[const.CONF_CYCLE_NAME] = user_input[const.CONF_CYCLE_NAME]
            self._trigger_kind = user_input[const.CONF_TRIGGER_KIND]
            months = sorted(int(m) for m in user_input.get(const.CONF_MONTHS_OVERRIDE, []))
            if months:
                draft[const.CONF_MONTHS_OVERRIDE] = months
            else:
                draft.pop(const.CONF_MONTHS_OVERRIDE, None)
            if self._trigger_kind == const.TRIGGER_KIND_SUN:
                return await self.async_step_cycle_sun()
            return await self.async_step_cycle_time()

        trigger: Mapping[str, Any] = draft.get(const.CONF_TRIGGER, {})
        schema = vol.Schema(
            {
                vol.Required(const.CONF_CYCLE_NAME): selector.TextSelector(),
                vol.Required(
                    const.CONF_TRIGGER_KIND,
                    default=trigger.get(const.CONF_TRIGGER_KIND, const.TRIGGER_KIND_SUN),
                ): _select(
                    [const.TRIGGER_KIND_SUN, const.TRIGGER_KIND_TIME],
                    translation_key="trigger_kind",
                ),
                vol.Optional(
                    const.CONF_MONTHS_OVERRIDE,
                    default=[str(m) for m in draft.get(const.CONF_MONTHS_OVERRIDE, [])],
                ): _months_select(),
            }
        )
        suggested = (
            {const.CONF_CYCLE_NAME: draft[const.CONF_CYCLE_NAME]}
            if const.CONF_CYCLE_NAME in draft
            else None
        )
        return self.async_show_form(
            step_id="cycle",
            data_schema=self.add_suggested_values_to_schema(schema, suggested),
        )

    async def async_step_cycle_sun(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Sun trigger: event and signed offset in minutes (stored as seconds)."""
        draft = self._cycle_draft
        trigger: Mapping[str, Any] = draft.get(const.CONF_TRIGGER, {})
        errors: dict[str, str] = {}
        if user_input is not None:
            offset_min = int(user_input[_FIELD_OFFSET_MIN])
            if abs(offset_min) > _MAX_OFFSET_MIN:
                errors[_FIELD_OFFSET_MIN] = "offset_out_of_range"
            else:
                draft[const.CONF_TRIGGER] = {
                    const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
                    const.CONF_TRIGGER_EVENT: user_input[const.CONF_TRIGGER_EVENT],
                    const.CONF_TRIGGER_OFFSET_S: offset_min * 60,
                }
                return await self.async_step_cycle_curve()

        is_sun = trigger.get(const.CONF_TRIGGER_KIND) == const.TRIGGER_KIND_SUN
        schema = vol.Schema(
            {
                vol.Required(
                    const.CONF_TRIGGER_EVENT,
                    default=trigger.get(const.CONF_TRIGGER_EVENT, "sunrise")
                    if is_sun
                    else "sunrise",
                ): _select(["sunrise", "sunset"], translation_key="sun_event"),
                # Range enforced in code so the user gets a friendly error.
                vol.Required(
                    _FIELD_OFFSET_MIN,
                    default=int(trigger.get(const.CONF_TRIGGER_OFFSET_S, 0)) // 60 if is_sun else 0,
                ): _number(unit="min"),
            }
        )
        if user_input is not None:
            schema = self.add_suggested_values_to_schema(schema, user_input)
        return self.async_show_form(step_id="cycle_sun", data_schema=schema, errors=errors)

    async def async_step_cycle_time(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Fixed-time trigger."""
        draft = self._cycle_draft
        trigger: Mapping[str, Any] = draft.get(const.CONF_TRIGGER, {})
        if user_input is not None:
            draft[const.CONF_TRIGGER] = {
                const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
                const.CONF_TRIGGER_AT: _hh_mm(user_input[const.CONF_TRIGGER_AT]),
            }
            return await self.async_step_cycle_curve()

        is_time = trigger.get(const.CONF_TRIGGER_KIND) == const.TRIGGER_KIND_TIME
        schema = vol.Schema(
            {
                vol.Required(
                    const.CONF_TRIGGER_AT,
                    default=trigger.get(const.CONF_TRIGGER_AT, "06:00") if is_time else "06:00",
                ): selector.TimeSelector()
            }
        )
        return self.async_show_form(step_id="cycle_time", data_schema=schema)

    # -- Curve steps ----------------------------------------------------------

    def _copy_candidates(self) -> list[selector.SelectOptionDict]:
        """Cycles of existing zones, as 'Zone name / Cycle name' options."""
        candidates: list[selector.SelectOptionDict] = []
        for subentry in self._get_entry().subentries.values():
            if subentry.subentry_type != const.SUBENTRY_TYPE_ZONE:
                continue
            for cycle in subentry.data.get(const.CONF_CYCLES, []):
                candidates.append(
                    selector.SelectOptionDict(
                        value=f"{subentry.subentry_id}:{cycle[const.CONF_CYCLE_ID]}",
                        label=f"{subentry.title} / {cycle.get(const.CONF_CYCLE_NAME, '')}",
                    )
                )
        return candidates

    def _curve_source_options(self) -> list[selector.SelectOptionDict]:
        options = [
            selector.SelectOptionDict(value=const.PRESET_POTS_ID, label="Preset: potted plants"),
            selector.SelectOptionDict(value=const.PRESET_LAWN_ID, label="Preset: lawn"),
            selector.SelectOptionDict(value=_CURVE_SOURCE_CUSTOM, label="Custom curve"),
        ]
        options.extend(
            selector.SelectOptionDict(
                value=template_id, label=str(template.get("name", template_id))
            )
            for template_id, template in self._hub_templates.items()
        )
        if self._copy_candidates():
            options.append(
                selector.SelectOptionDict(
                    value=_CURVE_SOURCE_COPY, label="Copy from an existing cycle"
                )
            )
        return options

    def _apply_soak_input(self, user_input: dict[str, Any]) -> dict[str, str]:
        """Store soak fields on the draft; returns field errors."""
        draft = self._cycle_draft
        soak_max = user_input.get(const.CONF_SOAK_MAX_RUN_MIN)
        soak_pause = user_input.get(const.CONF_SOAK_PAUSE_MIN)
        if soak_max is None and soak_pause is not None:
            return {const.CONF_SOAK_PAUSE_MIN: "soak_pause_without_max"}
        if soak_max is not None:
            draft[const.CONF_SOAK_MAX_RUN_MIN] = int(soak_max)
            draft[const.CONF_SOAK_PAUSE_MIN] = int(soak_pause or 0)
        else:
            draft.pop(const.CONF_SOAK_MAX_RUN_MIN, None)
            draft.pop(const.CONF_SOAK_PAUSE_MIN, None)
        return {}

    def _apply_volume_timeout(self, user_input: dict[str, Any], kind: str) -> None:
        """Keep the volume safety timeout only for volume curves."""
        draft = self._cycle_draft
        timeout = user_input.get(const.CONF_VOLUME_SAFETY_TIMEOUT_MIN)
        if kind == CurveKind.VOLUME and timeout is not None:
            draft[const.CONF_VOLUME_SAFETY_TIMEOUT_MIN] = int(timeout)
        else:
            draft.pop(const.CONF_VOLUME_SAFETY_TIMEOUT_MIN, None)

    async def async_step_cycle_curve(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Curve source plus soak and volume-safety settings."""
        draft = self._cycle_draft
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = self._apply_soak_input(user_input)
            source = user_input[_FIELD_SOURCE]
            if not errors:
                if source == _CURVE_SOURCE_CUSTOM:
                    self._pending_volume_timeout = user_input.get(
                        const.CONF_VOLUME_SAFETY_TIMEOUT_MIN
                    )
                    return await self.async_step_cycle_curve_custom()
                if source == _CURVE_SOURCE_COPY:
                    self._pending_volume_timeout = user_input.get(
                        const.CONF_VOLUME_SAFETY_TIMEOUT_MIN
                    )
                    return await self.async_step_cycle_curve_copy()
                curve_conf = {const.CONF_CURVE_TEMPLATE: source}
                kind = self._curve_kind_of(curve_conf)
                if kind == CurveKind.VOLUME and not self._volume_capable:
                    errors[_FIELD_SOURCE] = "volume_requires_flow"
                else:
                    draft[const.CONF_CURVE] = curve_conf
                    self._apply_volume_timeout(user_input, kind)
                    return await self._async_finish_cycle()

        curve: Mapping[str, Any] = draft.get(const.CONF_CURVE, {})
        if const.CONF_CURVE_TEMPLATE in curve:
            default_source = curve[const.CONF_CURVE_TEMPLATE]
        elif const.CONF_CURVE_POINTS in curve:
            default_source = _CURVE_SOURCE_CUSTOM
        else:
            default_source = const.PRESET_POTS_ID
        schema = vol.Schema(
            {
                vol.Required(_FIELD_SOURCE, default=default_source): _select(
                    self._curve_source_options(), translation_key="curve_source"
                ),
                vol.Optional(const.CONF_SOAK_MAX_RUN_MIN): _number(
                    min_value=1, max_value=_MAX_DURATION_MIN, unit="min"
                ),
                vol.Optional(const.CONF_SOAK_PAUSE_MIN): _number(
                    min_value=0, max_value=_MAX_DURATION_MIN, unit="min"
                ),
                vol.Optional(const.CONF_VOLUME_SAFETY_TIMEOUT_MIN): _number(
                    min_value=1, max_value=_MAX_DURATION_MIN, unit="min"
                ),
            }
        )
        suggested: dict[str, Any] = {
            key: draft[key]
            for key in (
                const.CONF_SOAK_MAX_RUN_MIN,
                const.CONF_SOAK_PAUSE_MIN,
                const.CONF_VOLUME_SAFETY_TIMEOUT_MIN,
            )
            if key in draft
        }
        if user_input is not None:
            suggested = user_input
        return self.async_show_form(
            step_id="cycle_curve",
            data_schema=self.add_suggested_values_to_schema(schema, suggested),
            errors=errors,
        )

    async def async_step_cycle_curve_custom(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Inline curve points with clamps and kind."""
        draft = self._cycle_draft
        errors: dict[str, str] = {}
        if user_input is not None:
            kind = user_input.get(const.CONF_CURVE_KIND, str(CurveKind.DURATION))
            points: list[list[float]] = []
            try:
                points = _parse_points_text(user_input[const.CONF_CURVE_POINTS])
            except CurveError as err:
                errors[const.CONF_CURVE_POINTS] = str(err).partition(":")[0]
            min_value = float(user_input[const.CONF_CURVE_MIN])
            max_value = float(user_input[const.CONF_CURVE_MAX])
            if min_value > max_value:
                errors[const.CONF_CURVE_MIN] = "min_above_max"
            elif min_value < 0:
                errors[const.CONF_CURVE_MIN] = "negative_clamp"
            if kind == CurveKind.VOLUME and not self._volume_capable:
                errors[const.CONF_CURVE_KIND] = "volume_requires_flow"
            if not errors and kind == CurveKind.DURATION:
                values = [value for _, value in points] + [min_value, max_value]
                if any(not 1 <= value <= _MAX_DURATION_MIN for value in values):
                    errors[const.CONF_CURVE_POINTS] = "duration_out_of_range"
            if not errors:
                curve_conf: dict[str, Any] = {
                    const.CONF_CURVE_POINTS: points,
                    const.CONF_CURVE_MIN: min_value,
                    const.CONF_CURVE_MAX: max_value,
                }
                if kind == CurveKind.VOLUME:
                    curve_conf[const.CONF_CURVE_KIND] = str(CurveKind.VOLUME)
                draft[const.CONF_CURVE] = curve_conf
                self._apply_volume_timeout(
                    {const.CONF_VOLUME_SAFETY_TIMEOUT_MIN: self._pending_volume_timeout},
                    kind,
                )
                return await self._async_finish_cycle()

        curve: Mapping[str, Any] = draft.get(const.CONF_CURVE, {})
        is_custom = const.CONF_CURVE_POINTS in curve
        kinds = [str(CurveKind.DURATION)]
        if self._volume_capable:
            kinds.append(str(CurveKind.VOLUME))
        schema = vol.Schema(
            {
                vol.Required(const.CONF_CURVE_POINTS): selector.TextSelector(),
                vol.Required(const.CONF_CURVE_MIN): _number(step="any"),
                vol.Required(const.CONF_CURVE_MAX): _number(step="any"),
                vol.Required(
                    const.CONF_CURVE_KIND,
                    default=str(curve.get(const.CONF_CURVE_KIND, CurveKind.DURATION)),
                ): _select(kinds, translation_key="curve_kind"),
            }
        )
        if user_input is not None:
            schema = self.add_suggested_values_to_schema(schema, user_input)
        elif is_custom:
            schema = self.add_suggested_values_to_schema(
                schema,
                {
                    const.CONF_CURVE_POINTS: _format_points(curve[const.CONF_CURVE_POINTS]),
                    const.CONF_CURVE_MIN: curve[const.CONF_CURVE_MIN],
                    const.CONF_CURVE_MAX: curve[const.CONF_CURVE_MAX],
                },
            )
        return self.async_show_form(step_id="cycle_curve_custom", data_schema=schema, errors=errors)

    async def async_step_cycle_curve_copy(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Copy the curve of an existing zone's cycle."""
        draft = self._cycle_draft
        errors: dict[str, str] = {}
        if user_input is not None:
            subentry_id, _, cycle_id = user_input[_FIELD_SOURCE].partition(":")
            entry = self._get_entry()
            source_cycle: Mapping[str, Any] | None = None
            if (subentry := entry.subentries.get(subentry_id)) is not None:
                source_cycle = next(
                    (
                        cycle
                        for cycle in subentry.data.get(const.CONF_CYCLES, [])
                        if cycle[const.CONF_CYCLE_ID] == cycle_id
                    ),
                    None,
                )
            if source_cycle is None:
                errors[_FIELD_SOURCE] = "copy_source_missing"
            else:
                curve_conf = deepcopy(dict(source_cycle[const.CONF_CURVE]))
                kind = self._curve_kind_of(curve_conf)
                if kind == CurveKind.VOLUME and not self._volume_capable:
                    errors[_FIELD_SOURCE] = "volume_requires_flow"
                else:
                    draft[const.CONF_CURVE] = curve_conf
                    timeout = self._pending_volume_timeout or source_cycle.get(
                        const.CONF_VOLUME_SAFETY_TIMEOUT_MIN
                    )
                    self._apply_volume_timeout(
                        {const.CONF_VOLUME_SAFETY_TIMEOUT_MIN: timeout}, kind
                    )
                    return await self._async_finish_cycle()

        schema = vol.Schema(
            {
                vol.Required(_FIELD_SOURCE): _select(
                    self._copy_candidates(), translation_key="copy_source"
                )
            }
        )
        return self.async_show_form(step_id="cycle_curve_copy", data_schema=schema, errors=errors)

    async def _async_finish_cycle(self) -> SubentryFlowResult:
        """Commit the draft to the cycle list and return to the loop menu."""
        draft = self._cycle_draft
        if const.CONF_CYCLE_ID not in draft:
            # Stable id, generated exactly once; edits never regenerate it.
            draft[const.CONF_CYCLE_ID] = uuid4().hex[:8]
        if self._edit_index is None:
            self._cycles.append(draft)
        else:
            self._cycles[self._edit_index] = draft
        self._cycle_draft = {}
        self._edit_index = None
        self._pending_volume_timeout = None
        if self.source == SOURCE_RECONFIGURE:
            return await self.async_step_manage_cycles()
        return await self.async_step_cycle_menu()

    # -- Reconfigure ------------------------------------------------------------

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Reconfigure menu: basics, cycles, done."""
        if not self._zone_data:
            data = deepcopy(dict(self._get_reconfigure_subentry().data))
            self._cycles = data.pop(const.CONF_CYCLES, [])
            self._zone_data = data
        return self.async_show_menu(
            step_id="reconfigure",
            menu_options=["edit_zone", "manage_cycles", "done"],
            description_placeholders={
                "zone_name": str(self._zone_data.get(const.CONF_ZONE_NAME, ""))
            },
        )

    async def async_step_edit_zone(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Edit zone basics, pre-filled."""
        errors: dict[str, str] = {}
        if user_input is not None:
            data, errors = self._zone_data_from_input(user_input)
            if not errors:
                self._zone_data = data
                return await self.async_step_reconfigure()
        suggested = user_input if user_input is not None else self._zone_suggested_values()
        return self.async_show_form(
            step_id="edit_zone",
            data_schema=self.add_suggested_values_to_schema(self._zone_schema(), suggested),
            errors=errors,
        )

    async def async_step_manage_cycles(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Cycle management menu."""
        menu_options = ["add_cycle", "edit_cycle"]
        if len(self._cycles) > 1:
            menu_options.append("remove_cycle")
        menu_options.append("back")
        return self.async_show_menu(
            step_id="manage_cycles",
            menu_options=menu_options,
            description_placeholders={
                "cycles": ", ".join(
                    str(cycle.get(const.CONF_CYCLE_NAME, "")) for cycle in self._cycles
                )
                or "—"
            },
        )

    def _cycle_options(self) -> list[selector.SelectOptionDict]:
        return [
            selector.SelectOptionDict(
                value=str(cycle[const.CONF_CYCLE_ID]),
                label=str(cycle.get(const.CONF_CYCLE_NAME, cycle[const.CONF_CYCLE_ID])),
            )
            for cycle in self._cycles
        ]

    async def async_step_edit_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Pick a cycle to edit, then reuse the cycle steps pre-filled."""
        if user_input is not None:
            cycle_id = user_input[_FIELD_CYCLE]
            self._edit_index = next(
                index
                for index, cycle in enumerate(self._cycles)
                if cycle[const.CONF_CYCLE_ID] == cycle_id
            )
            self._cycle_draft = deepcopy(self._cycles[self._edit_index])
            return await self.async_step_cycle()
        schema = vol.Schema(
            {vol.Required(_FIELD_CYCLE): _select(self._cycle_options(), translation_key="cycle")}
        )
        return self.async_show_form(step_id="edit_cycle", data_schema=schema)

    async def async_step_remove_cycle(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Remove a cycle (the last one cannot be removed)."""
        if user_input is not None:
            cycle_id = user_input[_FIELD_CYCLE]
            self._cycles = [
                cycle for cycle in self._cycles if cycle[const.CONF_CYCLE_ID] != cycle_id
            ]
            return await self.async_step_manage_cycles()
        schema = vol.Schema(
            {vol.Required(_FIELD_CYCLE): _select(self._cycle_options(), translation_key="cycle")}
        )
        return self.async_show_form(step_id="remove_cycle", data_schema=schema)

    async def async_step_back(self, user_input: dict[str, Any] | None = None) -> SubentryFlowResult:
        """Return from cycle management to the reconfigure menu."""
        return await self.async_step_reconfigure()

    async def async_step_done(self, user_input: dict[str, Any] | None = None) -> SubentryFlowResult:
        """Persist the reconfigured zone."""
        entry = self._get_entry()
        subentry = self._get_reconfigure_subentry()
        data = {**self._zone_data, const.CONF_CYCLES: self._cycles}
        return self.async_update_and_abort(
            entry, subentry, data=data, title=str(data[const.CONF_ZONE_NAME])
        )
