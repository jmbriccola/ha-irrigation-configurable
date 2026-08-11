"""Irrigation Maestro: weather-aware irrigation orchestration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .panel import async_register_panel, async_unregister_panel
from .resources import async_register_frontend
from .runtime import IrrigationRuntime
from .services import async_setup_services

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.BUTTON,
    Platform.DATETIME,
    Platform.NUMBER,
    Platform.SENSOR,
    Platform.SWITCH,
]

type IrrigationConfigEntry = ConfigEntry[IrrigationRuntime]


async def async_setup_entry(hass: HomeAssistant, entry: IrrigationConfigEntry) -> bool:
    """Set up the hub from a config entry."""
    runtime = IrrigationRuntime(hass, entry)
    await runtime.async_setup()
    entry.runtime_data = runtime

    await async_register_frontend(hass)
    await async_register_panel(hass)
    async_setup_services(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: IrrigationConfigEntry) -> None:
    """Apply config changes in place — a reload would abort a running cycle."""
    await entry.runtime_data.async_config_updated()


async def async_unload_entry(hass: HomeAssistant, entry: IrrigationConfigEntry) -> bool:
    """Unload the entry, leaving every valve closed."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.async_shutdown()
        async_unregister_panel(hass)
    return unload_ok


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate old config entries (schema versioning from 1.0, §7)."""
    if entry.version > 1:
        # Downgrade from a future major version: refuse, do not guess.
        return False
    # Version 1.x: nothing to migrate yet. This hook ships from day one so the
    # first schema change cannot break existing installations.
    _LOGGER.debug(
        "Config entry %s at version %s.%s — no migration needed",
        entry.entry_id,
        entry.version,
        entry.minor_version,
    )
    return True
