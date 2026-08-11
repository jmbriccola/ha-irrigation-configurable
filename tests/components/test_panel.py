"""Tests for the Irrigation Maestro sidebar panel registration."""

import sys
from unittest.mock import MagicMock

from custom_components.irrigation_maestro.panel import PANEL_URL_PATH
from homeassistant.components.frontend import async_panel_exists
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from .mocks import MockValvePark
from .test_session import mock_weather, setup_hub, zone_data


async def test_panel_registered_on_setup(hass: HomeAssistant) -> None:
    # Mock hass_frontend to avoid import errors in test environment
    sys.modules["hass_frontend"] = MagicMock()
    try:
        assert await async_setup_component(hass, "frontend", {})
    finally:
        sys.modules.pop("hass_frontend", None)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    assert async_panel_exists(hass, PANEL_URL_PATH)


async def test_panel_removed_on_unload(hass: HomeAssistant) -> None:
    # Mock hass_frontend to avoid import errors in test environment
    sys.modules["hass_frontend"] = MagicMock()
    try:
        assert await async_setup_component(hass, "frontend", {})
    finally:
        sys.modules.pop("hass_frontend", None)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    assert async_panel_exists(hass, PANEL_URL_PATH)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert not async_panel_exists(hass, PANEL_URL_PATH)
