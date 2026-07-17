"""Switches: zone enable, per-cycle enable, global pause.

Enable flags are runtime state (§5), not config — they live in the Store and
survive restarts without touching the config entry.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import IrrigationConfigEntry
from .entity import (
    MaestroHubEntity,
    MaestroZoneEntity,
    async_add_zone_entities,
    async_ensure_hub_device,
)
from .models import CycleConfig
from .runtime import IrrigationRuntime


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the pause switch and the zone/cycle enable switches."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)
    async_add_entities([HubPauseSwitch(runtime)])

    def _zone_switches(zone_id: str) -> list[Entity]:
        entities: list[Entity] = [ZoneEnabledSwitch(runtime, zone_id)]
        entities.extend(
            CycleEnabledSwitch(runtime, zone_id, cycle)
            for cycle in runtime.zones[zone_id].config.cycles
        )
        return entities

    async_add_zone_entities(hass, entry, async_add_entities, _zone_switches)


class HubPauseSwitch(MaestroHubEntity, SwitchEntity):
    """Global pause: on = no automatic watering anywhere."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_pause")

    @property
    def is_on(self) -> bool:
        return self._runtime.globally_paused

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._runtime.set_global_pause(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._runtime.set_global_pause(False)


class ZoneEnabledSwitch(MaestroZoneEntity, SwitchEntity):
    """Zone enable flag; a disabled zone skips every trigger."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_enabled")

    @property
    def is_on(self) -> bool:
        return self._runtime.state.zone_enabled(self._zone_id)

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)

    def _set(self, enabled: bool) -> None:
        self._runtime.state.set_zone_enabled(self._zone_id, enabled)
        self._runtime.state.schedule_save()
        self._runtime.dispatch_update()


class CycleEnabledSwitch(MaestroZoneEntity, SwitchEntity):
    """Per-cycle enable flag; named after the cycle itself."""

    _attr_icon = "mdi:calendar-clock"

    def __init__(self, runtime: IrrigationRuntime, zone_id: str, cycle: CycleConfig) -> None:
        super().__init__(runtime, zone_id, "cycle_enabled", unique_suffix=f"cycle_{cycle.cycle_id}")
        self._cycle_id = cycle.cycle_id
        # The entity is named after the cycle, not a translation.
        self._attr_translation_key = None
        self._attr_name = cycle.name
        self._fallback_name = cycle.name

    @property
    def is_on(self) -> bool:
        return self._runtime.state.cycle_enabled(self._zone_id, self._cycle_id)

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._set(False)

    def _set(self, enabled: bool) -> None:
        self._runtime.state.set_cycle_enabled(self._zone_id, self._cycle_id, enabled)
        self._runtime.state.schedule_save()
        self._runtime.dispatch_update()

    def _role_attributes(self) -> dict[str, Any]:
        return {"cycle_id": self._cycle_id, "cycle_name": self._cycle_name()}

    def _cycle_name(self) -> str:
        config = self.zone_config
        cycle = config.cycle(self._cycle_id) if config else None
        return cycle.name if cycle else self._fallback_name
