"""Numbers: zone order, watering interval, adjustment percentage.

These are *config*, not runtime state (§5): setting them writes back to the
zone's subentry data; the entry update listener then applies the change in
place without interrupting a running cycle.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.const import PERCENTAGE, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import IrrigationConfigEntry
from .const import (
    CONF_ADJUSTMENT_PCT,
    CONF_INTERVAL_DAYS,
    CONF_ORDER,
    DEFAULT_ADJUSTMENT_PCT,
    DEFAULT_INTERVAL_DAYS,
    DEFAULT_ORDER,
)
from .entity import MaestroZoneEntity, async_add_zone_entities, async_ensure_hub_device
from .runtime import IrrigationRuntime


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the per-zone config numbers."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)

    def _zone_numbers(zone_id: str) -> list[Entity]:
        return [
            ZoneOrderNumber(runtime, zone_id),
            ZoneIntervalNumber(runtime, zone_id),
            ZoneAdjustmentNumber(runtime, zone_id),
        ]

    async_add_zone_entities(hass, entry, async_add_entities, _zone_numbers)


class ZoneConfigNumber(MaestroZoneEntity, NumberEntity):
    """A number backed by one key of the zone subentry data."""

    _attr_mode = NumberMode.BOX
    _key: str
    _default: int

    def __init__(self, runtime: IrrigationRuntime, zone_id: str, role: str) -> None:
        super().__init__(runtime, zone_id, role)

    @property
    def native_value(self) -> float | None:
        subentry = self._runtime.entry.subentries.get(self._zone_id)
        if subentry is None:
            return None
        return float(subentry.data.get(self._key, self._default))

    async def async_set_native_value(self, value: float) -> None:
        entry = self._runtime.entry
        subentry = entry.subentries[self._zone_id]
        data: dict[str, Any] = {**subentry.data, self._key: int(value)}
        self.hass.config_entries.async_update_subentry(entry, subentry, data=data)


class ZoneOrderNumber(ZoneConfigNumber):
    """Watering priority: zones water in ascending order."""

    _attr_native_min_value = 1
    _attr_native_max_value = 1000
    _attr_native_step = 1
    _key = CONF_ORDER
    _default = DEFAULT_ORDER

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_order")


class ZoneIntervalNumber(ZoneConfigNumber):
    """Cadence: water at most every N days."""

    _attr_native_min_value = 1
    _attr_native_max_value = 60
    _attr_native_step = 1
    _attr_native_unit_of_measurement = UnitOfTime.DAYS
    _key = CONF_INTERVAL_DAYS
    _default = DEFAULT_INTERVAL_DAYS

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_interval")


class ZoneAdjustmentNumber(ZoneConfigNumber):
    """Curve output scaling, applied before the clamps."""

    _attr_native_min_value = 10
    _attr_native_max_value = 300
    _attr_native_step = 1
    _attr_native_unit_of_measurement = PERCENTAGE
    _key = CONF_ADJUSTMENT_PCT
    _default = DEFAULT_ADJUSTMENT_PCT

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_adjustment")
