"""Buttons: evaluate now, stop everything."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import IrrigationConfigEntry
from .entity import MaestroHubEntity, async_ensure_hub_device
from .runtime import IrrigationRuntime


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the hub buttons."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)
    async_add_entities([HubEvaluateButton(runtime), HubStopAllButton(runtime)])


class HubEvaluateButton(MaestroHubEntity, ButtonEntity):
    """Run one engine evaluation now (refreshes the hub sensors)."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_evaluate")

    async def async_press(self) -> None:
        await self._runtime.async_evaluate()


class HubStopAllButton(MaestroHubEntity, ButtonEntity):
    """Stop everything: close all valves, cancel the queue, arm the block."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_stop_all")

    async def async_press(self) -> None:
        await self._runtime.async_stop_all(manual=True)
