"""Irrigation Maestro: weather-aware irrigation orchestration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir

from . import const
from .const import DOMAIN
from .migration import (
    MigrationNote,
    migrate_hub_restrictions,
    migrate_zone_v1_to_v2,
    migrate_zone_v2_to_v3,
)
from .panel import async_register_panel, async_unregister_panel
from .resources import async_register_frontend
from .runtime import IrrigationRuntime
from .services import async_setup_services

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.BINARY_SENSOR,
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


@callback
def async_report_migration_notes(hass: HomeAssistant, notes: list[MigrationNote]) -> None:
    """One repair issue per kind, listing every zone and program affected."""
    grouped: dict[str, list[MigrationNote]] = {}
    for note in notes:
        grouped.setdefault(note.kind, []).append(note)
    for kind, items in grouped.items():
        summary = ", ".join(
            f"{note.zone_name} / {note.program_name}".removesuffix(" / ") for note in items
        )
        ir.async_create_issue(
            hass,
            DOMAIN,
            f"migration_{kind}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key=f"migration_{kind}",
            translation_placeholders={"items": summary},
        )


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate old config entries (schema versioning from 1.0, §7)."""
    if entry.version > 3:
        # Downgrade from a future major version: refuse, do not guess.
        return False

    if entry.version < 2:
        # v1 -> v2: the program becomes the single owner of "when". Every zone
        # is rewritten and anything the new model cannot express is reported.
        hub_restrictions = dict(entry.options.get(const.CONF_RESTRICTIONS) or {})
        notes: list[MigrationNote] = []
        for subentry in entry.subentries.values():
            if subentry.subentry_type != const.SUBENTRY_TYPE_ZONE:
                continue
            data, zone_notes = migrate_zone_v1_to_v2(dict(subentry.data), hub_restrictions)
            notes.extend(zone_notes)
            hass.config_entries.async_update_subentry(entry, subentry, data=data)

        options = dict(entry.options)
        options[const.CONF_RESTRICTIONS] = migrate_hub_restrictions(hub_restrictions)
        hass.config_entries.async_update_entry(entry, options=options, version=2, minor_version=0)

        if notes:
            async_report_migration_notes(hass, notes)
        _LOGGER.info(
            "Migrated config entry %s to the unified schedule model (%s note(s))",
            entry.entry_id,
            len(notes),
        )

    if entry.version < 3:
        # v2 -> v3: curve template references become explicit points and
        # per-day minutes become a per-day intensity percentage.
        templates = entry.options.get(const.CONF_CURVE_TEMPLATES, {})
        notes = []
        for subentry in entry.subentries.values():
            if subentry.subentry_type != const.SUBENTRY_TYPE_ZONE:
                continue
            data, zone_notes = migrate_zone_v2_to_v3(dict(subentry.data), templates)
            notes.extend(zone_notes)
            hass.config_entries.async_update_subentry(entry, subentry, data=data)

        hass.config_entries.async_update_entry(entry, version=3, minor_version=0)

        if notes:
            async_report_migration_notes(hass, notes)
        _LOGGER.info(
            "Migrated config entry %s to explicit curve points and per-day intensity (%s note(s))",
            entry.entry_id,
            len(notes),
        )

    return True
