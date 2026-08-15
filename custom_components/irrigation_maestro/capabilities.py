"""What a zone's hardware can actually do, resolved per zone.

The entity ids in the field reports are examples from one installation, not a
convention: this module never matches on names. It walks from the zone's valve
to its device through the entity registry, then looks among that device's other
entities for the device_class it needs -- "moisture" for a leak report,
"problem" for the water supply.

Detection proposes; storage decides. Nothing here is applied implicitly: what
acts at runtime is only what is written in the zone's configuration, because a
silently adopted sensor is a coupling between two devices that nobody
authorised. add_zone writes what this finds; the panel pre-fills with it.

A capability that is neither configured nor available is declared absent, which
is the point: an alarm that will never fire must say so rather than sit there
looking armed.
"""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.const import ATTR_DEVICE_CLASS
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .models import ZoneConfig

CONFIGURED = "configured"
CANDIDATE_AVAILABLE = "candidate_available"
UNAVAILABLE = "unavailable"


@dataclass(frozen=True, slots=True)
class ZoneCapabilities:
    """What this zone can detect, and what it could if it were told to."""

    leak_sensor: str | None
    water_supply_sensor: str | None
    leak_candidate: str | None
    supply_candidate: str | None

    @staticmethod
    def _status(configured: str | None, candidate: str | None) -> str:
        if configured:
            return CONFIGURED
        return CANDIDATE_AVAILABLE if candidate else UNAVAILABLE

    @property
    def leak_detection(self) -> str:
        return self._status(self.leak_sensor, self.leak_candidate)

    @property
    def water_supply(self) -> str:
        return self._status(self.water_supply_sensor, self.supply_candidate)


def _device_class_of(hass: HomeAssistant, entry: er.RegistryEntry) -> str | None:
    """The class from the registry, falling back to live state.

    The registry answer works before the entity has ever had a state, which is
    the normal case for Zigbee and MQTT right after a restart. The user's own
    override (``device_class``) wins over the integration's
    ``original_device_class``, because that is what the user meant.
    """
    if entry.device_class or entry.original_device_class:
        return entry.device_class or entry.original_device_class
    state = hass.states.get(entry.entity_id)
    return None if state is None else state.attributes.get(ATTR_DEVICE_CLASS)


def discover_sibling_sensors(
    hass: HomeAssistant, valve_entity: str
) -> tuple[str | None, str | None]:
    """(moisture, problem) binary sensors on the valve's own device.

    Read-only: this only answers a question about what the registry and live
    states currently show. A valve absent from the registry, or with no
    device -- a template or helper entity is a legitimate configuration --
    yields no candidates rather than raising.
    """
    registry = er.async_get(hass)
    valve = registry.async_get(valve_entity)
    if valve is None or valve.device_id is None:
        return None, None
    leak: str | None = None
    supply: str | None = None
    for entry in er.async_entries_for_device(
        registry, valve.device_id, include_disabled_entities=False
    ):
        if entry.domain != "binary_sensor":
            continue
        device_class = _device_class_of(hass, entry)
        if device_class == BinarySensorDeviceClass.MOISTURE and leak is None:
            leak = entry.entity_id
        elif device_class == BinarySensorDeviceClass.PROBLEM and supply is None:
            supply = entry.entity_id
    return leak, supply


def resolve_zone_capabilities(hass: HomeAssistant, zone: ZoneConfig) -> ZoneCapabilities:
    """What this zone has, and what its valve's device could offer."""
    leak_candidate, supply_candidate = discover_sibling_sensors(hass, zone.valve_entity)
    # update_zone writes leak_sensor/water_supply_sensor unconditionally, so ""
    # is a reachable "no sensor" on every zone -- resolve with truthiness, not
    # `is None`.
    return ZoneCapabilities(
        leak_sensor=zone.leak_sensor or None,
        water_supply_sensor=zone.water_supply_sensor or None,
        leak_candidate=leak_candidate,
        supply_candidate=supply_candidate,
    )
