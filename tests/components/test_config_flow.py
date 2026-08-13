"""Tests for the Irrigation Maestro config and options flows."""

from typing import Any

import pytest
from custom_components.irrigation_maestro import const
from custom_components.irrigation_maestro.models import HubConfig, engine_params_from_config
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .test_session import mock_weather, setup_hub, zone_data


@pytest.fixture
def hub_entry(hass: HomeAssistant) -> MockConfigEntry:
    """A configured hub entry."""
    entry = MockConfigEntry(
        domain=const.DOMAIN,
        title="Irrigation Maestro",
        data={},
        options={const.CONF_WEATHER_ENTITY: "weather.home"},
    )
    entry.add_to_hass(hass)
    return entry


async def _options_section(
    hass: HomeAssistant, entry: MockConfigEntry, section: str
) -> dict[str, Any]:
    """Open the options flow and enter one menu section."""
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": section}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == section
    return result


# ---------------------------------------------------------------------------
# Hub config flow


async def test_hub_happy_path(hass: HomeAssistant) -> None:
    """The user step creates the hub with only the provided options."""
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            const.CONF_WEATHER_ENTITY: "weather.home",
            const.CONF_RAIN_SENSOR: "sensor.rain_today",
        },
    )
    await hass.async_block_till_done()

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Irrigation Maestro"
    assert result["data"] == {}
    assert result["options"] == {
        const.CONF_WEATHER_ENTITY: "weather.home",
        const.CONF_RAIN_SENSOR: "sensor.rain_today",
    }

    entry = hass.config_entries.async_entries(const.DOMAIN)[0]
    assert entry.version == 3
    assert entry.minor_version == 1
    # The options must parse into the typed hub model.
    hub = HubConfig.from_options(dict(entry.options))
    assert hub.weather_entity == "weather.home"
    assert hub.master_valve is None


async def test_hub_single_instance(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """A second hub entry is refused."""
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_no_zone_subentry_flow_is_offered(hass: HomeAssistant) -> None:
    """Zones are created from the panel. A second surface that writes zone
    data differently is what silently replaced curves in 2.x."""
    from custom_components.irrigation_maestro.config_flow import (
        IrrigationMaestroConfigFlow,
    )

    assert IrrigationMaestroConfigFlow.async_get_supported_subentry_types({}) == {}


async def test_existing_zone_subentries_still_load(hass: HomeAssistant) -> None:
    """The risk this task carries: an entry whose subentry type is no longer
    registered must still set up, with its zones intact."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    assert entry.state is ConfigEntryState.LOADED
    assert len(entry.runtime_data.zone_ids) == 1


# ---------------------------------------------------------------------------
# Options flow


async def test_options_engine_roundtrip_and_reset(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Engine values are stored under the engine key; reset wipes them."""
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_THRESHOLD_BASE: 4.5,
            const.CONF_WIND_SKIP_ENABLED: True,
            const.CONF_SEASON_MONTHS: ["4", "5", "6"],
            const.CONF_STALE_WEATHER_MAX_H: 12,
            const.CONF_STALE_WEATHER_POLICY: const.STALE_POLICY_FAIL_CLOSED,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    options = hub_entry.options
    engine = options[const.CONF_ENGINE]
    assert engine[const.CONF_THRESHOLD_BASE] == 4.5
    assert engine[const.CONF_WIND_SKIP_ENABLED] is True
    assert engine[const.CONF_SEASON_MONTHS] == [4, 5, 6]
    assert len(engine[const.CONF_TEMP_WEIGHTS]) == 5
    # Stale-weather settings live at the top level (see HubConfig.from_options).
    assert options[const.CONF_STALE_WEATHER_MAX_H] == 12
    assert options[const.CONF_STALE_WEATHER_POLICY] == const.STALE_POLICY_FAIL_CLOSED
    params = engine_params_from_config(engine)
    assert params.threshold_base_mm == 4.5
    assert params.season_months == frozenset({4, 5, 6})

    # Reset to defaults removes the whole engine section again.
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"reset_to_defaults": True}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert const.CONF_ENGINE not in hub_entry.options
    assert const.CONF_STALE_WEATHER_MAX_H not in hub_entry.options
    assert const.CONF_STALE_WEATHER_POLICY not in hub_entry.options


async def test_options_engine_invalid_weights(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Malformed weight lists come back as field errors, not exceptions."""
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {const.CONF_TEMP_WEIGHTS: "0.1, 0.2"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {const.CONF_TEMP_WEIGHTS: "invalid_temp_weights"}
    assert const.CONF_ENGINE not in hub_entry.options


async def test_options_menu_only_offers_the_weather_engine(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Everything else moved to the panel: one editor per setting."""
    result = await hass.config_entries.options.async_init(hub_entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    assert set(result["menu_options"]) == {"engine_advanced"}


async def test_first_run_still_works(hass: HomeAssistant) -> None:
    """The config flow keeps what the panel cannot do before the hub exists."""
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
