"""The leak alarm as an entity: one per scope, so automations can act on it.

Until this platform existed the alarm reached the user only as a notification,
a Repairs issue and a card badge -- none of which an automation can read, so
"close the mains when the irrigation leaks" needed a hand-written template
helper, which is precisely the kind of helper this integration exists to
delete.

One entity per scope, following ``leak_scopes()``: every zone, plus the hub
for water no zone can be blamed for. Mirroring the detector rather than
summarising it, because a summary entity cannot say WHICH zone to shut, and
that is the first thing an automation needs.

States and attributes follow docs/design/card-contract.md exactly.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import IrrigationConfigEntry
from .engine.metering import HUB_SCOPE
from .entity import (
    MaestroEntity,
    MaestroHubEntity,
    MaestroZoneEntity,
    async_add_zone_entities,
    async_ensure_hub_device,
)
from .runtime import IrrigationRuntime


async def async_setup_entry(
    hass: HomeAssistant,
    entry: IrrigationConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up one leak entity per leak scope: the hub, and every zone."""
    runtime = entry.runtime_data
    async_ensure_hub_device(hass, entry)
    async_add_entities([HubLeakBinarySensor(runtime)])

    def _zone_binary_sensors(zone_id: str) -> list[Entity]:
        return [ZoneLeakBinarySensor(runtime, zone_id)]

    # Through the dynamic path, not a list built once here: zones arrive and
    # leave through subentries while the entry stays loaded, and a leak entity
    # a zone gained only after a restart would be missing exactly while the
    # user was setting that zone up.
    async_add_zone_entities(hass, entry, async_add_entities, _zone_binary_sensors)


class _MaestroLeakEntity(MaestroEntity, BinarySensorEntity):
    """One scope's leak alarm. The hub's and a zone's differ only in scope.

    Written once rather than twice: the state, the availability rule and the
    attributes are the same question asked of a different key, and the two
    copies a per-device implementation would need are two things that can
    drift apart while the suite stays green.

    ``device_class: problem`` is what makes this readable by an automation
    without translation -- and it is also what makes ``off`` an assertion, see
    ``available``.
    """

    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    #: The scope this entity reports for: a zone id, or HUB_SCOPE.
    _leak_scope: str

    @property
    def is_on(self) -> bool:
        """The scope's alarm, as the detector holds it."""
        return self._runtime.leak_state(self._leak_scope).active

    @property
    def available(self) -> bool:
        """Has this scope established anything for us to publish?

        Two ways it has not, and both must read ``unavailable`` rather than
        ``off``: no source that could ever raise the alarm, and a scope that
        has not yet been WATCHED for a full confirmation window -- the state
        every scope is in until one of its sources has been reporting for
        ``leak_confirm_s``, since the detector holds its alarm in memory only
        and starts each time with nothing. ``device_class: problem``
        gives ``off`` the meaning "there is no problem", and neither state has
        established anything of the sort. A message claiming it is read by a
        person who can doubt it; an entity claiming it is read by an
        automation that cannot, and whose natural "leak cleared -> reopen the
        mains" rule triggers on exactly that edge.

        What it must NOT ask is "is a source answering this second". A meter
        that has gone unreadable and a leak sensor whose battery is flat are
        both silent, and the detector holds its alarm through exactly that
        silence rather than withdrawing on it -- so an availability that
        tracked liveness would retract a live warning at the moment it matters
        most. ``leak_state_established`` answers from the configuration and
        from how long the scope has been watched, never from whether a source
        is speaking now: once a window has run, silence does not re-open it,
        and an alarm already standing is published whatever either says.
        """
        return self._runtime.leak_state_established(self._leak_scope)

    def _role_attributes(self) -> dict[str, Any]:
        """Enough to act on, without restating the entity's own state.

        ``sources`` is what is contributing NOW (sorted, so a two-source alarm
        renders the same way every time), which is not the same as what raised
        it: a source can withdraw while the alarm stands on another.

        ``describing_source`` rather than ``first_source`` deliberately. It is
        what the Repairs notice is keyed on, and the two are read in the same
        breath -- an attribute naming the meter while the notice names the
        valve sensor would leave the user to guess which one to go and look
        at. ``first_source`` is still the honest answer to "who noticed
        first", and it is still carried by the leak event, which is where an
        automation that cares about provenance reads it.

        ``since`` is when the alarm was CONFIRMED, not when the water started;
        nothing here or anywhere else may claim otherwise.
        """
        state = self._runtime.leak_state(self._leak_scope)
        return {
            "sources": sorted(state.sources),
            "since": state.since.isoformat() if state.since is not None else None,
            "describing_source": state.describing_source,
        }


class HubLeakBinarySensor(_MaestroLeakEntity, MaestroHubEntity):
    """The system's own leak alarm: water on a meter no single zone owns."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_leak")
        self._leak_scope = HUB_SCOPE


class ZoneLeakBinarySensor(_MaestroLeakEntity, MaestroZoneEntity):
    """One zone's leak alarm, from its own valve sensor or its own meter."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_leak")
        self._leak_scope = zone_id
