"""Continuous water accounting: one integrator per meter, one attribution rule.

Before this module the component integrated flow only while it was watering, so
a dripping valve, a tap opened by hand and a cycle that ended abnormally were
all invisible to it and visible to any external utility_meter. Integration now
runs whenever the meter reports, and the litres are attributed to whichever zone
has its valve open -- or to an unattributed bucket when none has.

This is the one place water becomes litres, exactly as flow.py is the one place
a unit becomes L/min. FlowMonitor consumes the samples this emits; it does not
integrate.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .engine.metering import accumulate
from .flow import FlowSensorReader

_LOGGER = logging.getLogger(__name__)

#: How often a quiet meter is sampled anyway. A meter that stops emitting
#: events must still be integrated, and a gap must be noticed within a bounded
#: delay rather than at the end of the run.
DEFAULT_TICK_S = 30.0


@dataclass(frozen=True, slots=True)
class MeterSample:
    """One integration step, published to every subscriber."""

    at: datetime
    #: Current flow, or None when the unit cannot be resolved.
    lpm: float | None
    #: False when no number was read (missing, unavailable, non-numeric).
    available: bool
    #: The meter's cumulative litres after this step. Monotonic.
    total_l: float
    #: Seconds of the interval just closed that were actually measured. Zero
    #: across a gap. Consumers judging a window (the zero-flow guard) compare
    #: this against the window length instead of trusting wall-clock time.
    measured_s: float
    #: True when this sample carries a unit that had been lost. Published
    #: synchronously on the state event, because a consumer that learned of
    #: recovery on its next tick would judge a part-blind window.
    unit_recovered: bool


class MeterLedger:
    """Integrates one flow meter continuously and publishes every step."""

    def __init__(
        self,
        hass: HomeAssistant,
        reader: FlowSensorReader,
        *,
        tick_s: float = DEFAULT_TICK_S,
    ) -> None:
        self._hass = hass
        self._reader = reader
        self._tick_s = tick_s
        self.total_l = 0.0
        self.unit_known = True
        self._last_at: datetime | None = None
        self._last_lpm = 0.0
        self._last_available = False
        self._listeners: list[Callable[[MeterSample], None]] = []
        self._unsubs: list[CALLBACK_TYPE] = []

    @property
    def entity_id(self) -> str:
        return self._reader.entity_id

    def subscribe(self, listener: Callable[[MeterSample], None]) -> CALLBACK_TYPE:
        self._listeners.append(listener)

        @callback
        def _unsub() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _unsub

    def start(self) -> None:
        self._last_at = dt_util.utcnow()
        reading = self._reader.read()
        self._last_lpm = reading.lpm or 0.0
        self._last_available = reading.available
        self.unit_known = reading.unit_known
        self._unsubs.append(
            async_track_state_change_event(self._hass, [self.entity_id], self._on_state)
        )
        self._unsubs.append(
            async_track_time_interval(self._hass, self._on_tick, timedelta(seconds=self._tick_s))
        )

    def stop(self) -> None:
        self._integrate(dt_util.utcnow())
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        self._listeners.clear()

    @callback
    def _on_state(self, _event: Event[EventStateChangedData]) -> None:
        self._sample()

    @callback
    def _on_tick(self, _now: datetime) -> None:
        self._sample()

    def _integrate(self, now: datetime) -> float:
        """Close the open interval; returns the seconds that were measured.

        Litres accrue only when the previous reading was both unit-resolvable
        and available. An unknown unit freezes the total at the last certain
        value; a gap contributes nothing and is not interpolated, because a
        plausible number that is silently wrong is worse than a declared
        absence -- and counting zero would assert that no water passed, which
        we have no right to assert.
        """
        if self._last_at is None:
            self._last_at = now
            return 0.0
        elapsed_s = max((now - self._last_at).total_seconds(), 0.0)
        self._last_at = now
        if not self.unit_known or not self._last_available:
            return 0.0
        self.total_l += accumulate(self._last_lpm, elapsed_s)
        return elapsed_s

    def _sample(self) -> None:
        now = dt_util.utcnow()
        measured_s = self._integrate(now)
        reading = self._reader.read()
        recovered = reading.unit_known and not self.unit_known
        self.unit_known = reading.unit_known
        self._last_lpm = reading.lpm or 0.0
        self._last_available = reading.available
        sample = MeterSample(
            at=now,
            lpm=reading.lpm,
            available=reading.available,
            total_l=self.total_l,
            measured_s=measured_s,
            unit_recovered=recovered,
        )
        for listener in list(self._listeners):
            try:
                listener(sample)
            except Exception:  # pragma: no cover - a listener must not stop the ledger
                _LOGGER.exception("Meter ledger listener failed for %s", self.entity_id)
