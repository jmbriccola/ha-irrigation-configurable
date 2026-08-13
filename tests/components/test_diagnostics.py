"""The diagnostics payload makes the mute state inspectable without .storage."""

from custom_components.irrigation_maestro.diagnostics import (
    async_get_config_entry_diagnostics,
)
from homeassistant.core import HomeAssistant

from .test_session import setup_hub, zone_data


async def test_diagnostics_carry_the_notification_verdict(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    payload = await async_get_config_entry_diagnostics(hass, entry)
    assert payload["notifications"]["verdict"] == "silent"
    assert payload["notifications"]["enabled_without_target"] == ["interrupted"]
