"""Config and options flows for Irrigation Maestro."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any, Final, Literal

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    ConfigSubentryFlow,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from . import const
from .engine.model import EngineParams

# Form-only keys (never stored under these names).
_FIELD_RESET: Final = "reset_to_defaults"

# EngineParams fields without a const.py alias (keys must match the dataclass).
_CONF_STAGE_COMMIT_MINUTE: Final = "stage_commit_minute"
_CONF_DAILY_RAIN_CAP: Final = "daily_rain_cap_mm"
_CONF_HOURLY_STAGING_CAP: Final = "hourly_staging_cap_mm"

_ENGINE_DEFAULTS: Final = EngineParams()

_HUB_OPTIONAL_ENTITIES: Final = (
    const.CONF_RAIN_SENSOR,
    const.CONF_OUTDOOR_TEMP_SENSOR,
    const.CONF_LINE_FLOW_SENSOR,
    const.CONF_MASTER_VALVE,
)


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


# ---------------------------------------------------------------------------
# Text parsing helpers (comma-separated user input)


def _parse_float_list(text: str, expected: int) -> list[float]:
    values = [float(chunk) for chunk in text.split(",") if chunk.strip()]
    if len(values) != expected:
        raise ValueError(f"expected {expected} values")
    return values


def _format_float_list(values: Iterable[float]) -> str:
    return ", ".join(f"{value:g}" for value in values)


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
        """No subentry flow: zones are created and edited from the panel.

        Existing zone subentries keep loading — they are data on the entry,
        not a capability of the flow. A parallel editing surface that wrote
        zone data with different conventions is precisely what silently
        replaced curve references before 3.0.0.
        """
        return {}

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
