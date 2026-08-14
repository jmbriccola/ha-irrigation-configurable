"""The one place a flow sensor's state is read, and the one place a unit is converted.

Every flow number inside this integration is litres per minute: `nominal_flow_lpm`,
the tolerance band, accumulated litres, volume-curve targets, and every per-zone
and monthly water total derived from them. Conversion happens here, at the
boundary, so no downstream code ever sees a foreign unit and no downstream
code has to know one exists.

Before this module the component read `float(state.state)` and called it L/min
whatever the sensor declared. On a real install the zone meters publish m³/h,
which made every litre 1000/60 ≈ 16.7 times too small.

When the unit cannot be determined the reading is None rather than a guess.
Callers must treat that as "no usable meter" — see the degradation matrix in
README.md — because a plausible number that is silently wrong is worse than a
declared absence.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Final, Literal

from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, UnitOfVolumeFlowRate
from homeassistant.core import HomeAssistant
from homeassistant.util.unit_conversion import VolumeFlowRateConverter

_LOGGER = logging.getLogger(__name__)

CANONICAL_UNIT: Final = UnitOfVolumeFlowRate.LITERS_PER_MINUTE

#: Derived from the converter rather than hand-listed, so it cannot drift when
#: Home Assistant adds a unit.
SUPPORTED_FLOW_UNITS: Final = frozenset(VolumeFlowRateConverter.VALID_UNITS)

type FlowUnitSource = Literal["override", "declared", "unknown"]

_UNUSABLE_STATES: Final = frozenset({"unavailable", "unknown"})


@dataclass(frozen=True, slots=True)
class FlowReading:
    """One reading in canonical units, or None when the unit is unknown."""

    lpm: float | None
    unit: str | None
    source: FlowUnitSource
    #: False when no number was read: the entity is missing, unavailable, or
    #: non-numeric. Distinct from ``lpm == 0.0``, which the zero-flow guard is
    #: entitled to act on but an integrator must not count as water not passed.
    available: bool = False

    @property
    def unit_known(self) -> bool:
        return self.source != "unknown"


class FlowSensorReader:
    """Reads a flow sensor and returns L/min, or None when the unit is unknown.

    The unit is resolved on every read — it is a dict lookup on the state
    object, so a unit that changes at runtime (an upstream integration update,
    an entity-settings override) is picked up with no extra machinery.
    """

    def __init__(self, hass: HomeAssistant, entity_id: str, override: str | None = None) -> None:
        self._hass = hass
        self._entity_id = entity_id
        self._override = override

    @property
    def entity_id(self) -> str:
        return self._entity_id

    def read(self) -> FlowReading:
        """The current flow in L/min, with the unit that produced it."""
        state = self._hass.states.get(self._entity_id)
        declared = None if state is None else state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)

        # The override wins even against a unit the sensor declares perfectly
        # well: the user is correcting a sensor they know lies. An override the
        # converter cannot handle is ignored rather than allowed to blind a
        # sensor that does declare something usable.
        unit: str
        source: FlowUnitSource
        if self._override in SUPPORTED_FLOW_UNITS:
            unit, source = str(self._override), "override"
        elif declared in SUPPORTED_FLOW_UNITS:
            unit, source = str(declared), "declared"
        else:
            return FlowReading(None, None, "unknown", False)

        if state is None or state.state in _UNUSABLE_STATES:
            # Unit known, value not: that is zero flow, and the zero-flow guard
            # is entitled to act on it. Not the same as an unknown unit, and
            # not the same as a measured zero -- available says which.
            return FlowReading(0.0, unit, source, False)
        try:
            raw = float(state.state)
        except ValueError:
            return FlowReading(0.0, unit, source, False)

        lpm = VolumeFlowRateConverter.convert(max(raw, 0.0), unit, CANONICAL_UNIT)
        return FlowReading(max(lpm, 0.0), unit, source, True)

    @property
    def unit_known(self) -> bool:
        return self.read().unit_known
