"""Tests for card serving and automatic Lovelace resource registration."""

from custom_components.irrigation_maestro.const import CARD_FILENAME, FRONTEND_URL_BASE
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


async def test_resource_registered_in_storage_mode(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "lovelace", {})  # storage mode
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Alpha", "valve.a")])

    lovelace = hass.data["lovelace"]
    urls = [item["url"] for item in lovelace.resources.async_items()]
    expected_prefix = f"{FRONTEND_URL_BASE}/{CARD_FILENAME}?v="
    assert any(url.startswith(expected_prefix) for url in urls), urls


async def test_yaml_mode_skips_resource_registration(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "lovelace", {"lovelace": {"mode": "yaml"}})
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    # Setup must succeed anyway; the README documents the manual fallback.
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    assert entry.runtime_data is not None
