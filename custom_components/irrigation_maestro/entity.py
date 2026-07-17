"""Entity foundations shared by every Irrigation Maestro platform.

Every entity exposes ``maestro_role`` (and ``zone_id`` for zone entities) so
the Lovelace card discovers everything through attributes — never through
hardcoded entity ids (see docs/design/card-contract.md). Entities are pushed
via the runtime dispatcher; nothing polls.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any, Final

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import ATTR_MAESTRO_ROLE, ATTR_ZONE_ID, DOMAIN, SUBENTRY_TYPE_ZONE
from .models import ZoneConfig
from .runtime import SIGNAL_UPDATE, SIGNAL_ZONES_CHANGED, IrrigationRuntime

MANUFACTURER: Final = "Jacopo Maria Briccola"
MODEL: Final = "Irrigation Maestro"

INTEGRATION_VERSION: Final[str] = str(
    json.loads(Path(__file__).with_name("manifest.json").read_text(encoding="utf-8"))["version"]
)


@callback
def async_ensure_hub_device(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Create the hub device eagerly so zone devices can reference it."""
    registry = dr.async_get(hass)
    registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name=MODEL,
        manufacturer=MANUFACTURER,
        model=MODEL,
        sw_version=INTEGRATION_VERSION,
    )


@callback
def async_add_zone_entities(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
    factory: Callable[[str], Sequence[Entity]],
) -> None:
    """Add one entity set per zone subentry, following later zone additions.

    Entities are attached to their subentry (``config_subentry_id``) so
    removing a zone removes its entities and device with it.
    """
    known: set[str] = set()

    @callback
    def _sync(_entry_id: str | None = None) -> None:
        for subentry_id, subentry in entry.subentries.items():
            if subentry.subentry_type != SUBENTRY_TYPE_ZONE or subentry_id in known:
                continue
            known.add(subentry_id)
            entities = factory(subentry_id)
            if entities:
                async_add_entities(entities, config_subentry_id=subentry_id)

    _sync()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_ZONES_CHANGED, _sync))


class MaestroEntity(Entity):
    """Push-updated entity with the contract's discovery attributes."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, runtime: IrrigationRuntime, role: str) -> None:
        self._runtime = runtime
        self._role = role
        self._attr_translation_key = role

    async def async_added_to_hass(self) -> None:
        """Subscribe to the runtime's push signal."""
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_UPDATE, self._handle_update)
        )

    @callback
    def _handle_update(self, _entry_id: str) -> None:
        self.async_write_ha_state()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes: maestro_role always, plus role specifics."""
        return {ATTR_MAESTRO_ROLE: self._role, **self._role_attributes()}

    def _role_attributes(self) -> dict[str, Any]:
        """Role-specific extra attributes; overridden where the contract asks."""
        return {}


class MaestroHubEntity(MaestroEntity):
    """An entity of the hub device."""

    def __init__(self, runtime: IrrigationRuntime, role: str) -> None:
        super().__init__(runtime, role)
        entry_id = runtime.entry.entry_id
        self._attr_unique_id = f"{entry_id}_{role}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name=MODEL,
            manufacturer=MANUFACTURER,
            model=MODEL,
            sw_version=INTEGRATION_VERSION,
        )


class MaestroZoneEntity(MaestroEntity):
    """An entity of one zone device (config subentry)."""

    def __init__(
        self,
        runtime: IrrigationRuntime,
        zone_id: str,
        role: str,
        *,
        unique_suffix: str | None = None,
    ) -> None:
        super().__init__(runtime, role)
        self._zone_id = zone_id
        self._attr_unique_id = f"{zone_id}_{unique_suffix or role}"
        zone = runtime.zones[zone_id].config
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, zone_id)},
            via_device=(DOMAIN, runtime.entry.entry_id),
            name=zone.name,
            manufacturer=MANUFACTURER,
        )

    @property
    def zone_config(self) -> ZoneConfig | None:
        """The zone's parsed config, or None if the zone was removed."""
        zone = self._runtime.zones.get(self._zone_id)
        return zone.config if zone else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            ATTR_MAESTRO_ROLE: self._role,
            ATTR_ZONE_ID: self._zone_id,
            **self._role_attributes(),
        }
