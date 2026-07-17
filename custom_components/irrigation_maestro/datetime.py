"""Datetime: per-zone suspension end (the module name is dictated by HA)."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.datetime import DateTimeEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from . import IrrigationConfigEntry
from .entity import MaestroZoneEntity, async_add_zone_entities, async_ensure_hub_device
from .runtime import IrrigationRuntime


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the per-zone suspend-until entities."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)

    def _zone_datetimes(zone_id: str) -> list[Entity]:
        return [ZoneSuspendUntilDateTime(runtime, zone_id)]

    async_add_zone_entities(hass, entry, async_add_entities, _zone_datetimes)


class ZoneSuspendUntilDateTime(MaestroZoneEntity, DateTimeEntity):
    """When the zone's suspension ends; unknown when not suspended."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_suspend_until")

    @property
    def native_value(self) -> datetime | None:
        value = self._runtime.state.suspended_until(self._zone_id)
        return dt_util.as_utc(value) if value is not None else None

    async def async_set_value(self, value: datetime) -> None:
        self._runtime.suspend_until(dt_util.as_utc(value), self._zone_id)
