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
from functools import partial
from typing import TYPE_CHECKING

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .engine.metering import HUB_SCOPE, accumulate
from .flow import FlowSensorReader

if TYPE_CHECKING:
    from .runtime import IrrigationRuntime, ZoneRuntime

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
        if self._unsubs:
            # Already running. Task 8 rebuilds ledgers on config change; a
            # second start() must not double-subscribe and double-publish.
            return
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
        # `not self.unit_known` is redundant today -- flow.py already forces
        # `available=False` whenever the unit is unknown, so the second half
        # of this guard alone would already catch it. Kept as defense in
        # depth so this guard does not quietly depend on that flow.py
        # invariant holding forever.
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
            except Exception:  # a listener must not stop the ledger or starve its peers
                _LOGGER.exception("Meter ledger listener failed for %s", self.entity_id)


class WaterAccountant:
    """Owns the ledgers and decides whose water each litre was.

    Attribution follows valve state, not run phase. The phase is necessary and
    not sufficient: PHASE_OPENING covers the whole open-confirm wait, the master
    pre-open pressurises the line while the zone is still queued, and a failed
    close clears the zone from active_runs while its valve is still open --
    which would diagnose a stuck-open valve as a system leak. A valve that
    reports open is watering; that is the physical truth, and it is the same
    predicate leak detection reads.
    """

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self._ledgers: dict[str, MeterLedger] = {}
        self._unsubs: dict[str, CALLBACK_TYPE] = {}
        self._overrides: dict[str, str | None] = {}
        self._last_totals: dict[str, float] = {}

    def start(self) -> None:
        self.rebuild()

    def stop(self) -> None:
        for unsub in self._unsubs.values():
            unsub()
        self._unsubs.clear()
        for ledger in self._ledgers.values():
            ledger.stop()
        self._ledgers.clear()
        self._overrides.clear()
        self._last_totals.clear()

    def rebuild(self) -> None:
        """Rebuild the ledger set from the current configuration -- by diffing.

        Rebuilt rather than added to, like _track_flow_sensors and
        _schedule_triggers, so repointing a zone's meter takes effect without a
        reload. But diffed against what is already running, not dropped and
        recreated wholesale: a live FlowMonitor (Task 9) subscribes to a ledger
        directly, and stopping every ledger on every config change -- even one
        that touches no meter -- would silently deafen a monitor watching a
        healthy, unrelated run. Its zero-flow guard would then see zero litres
        accrue and interrupt a cycle that was never at fault.

        Only a ledger whose entity disappeared from the configuration, or whose
        resolved unit override changed, is stopped and dropped. Everything
        else -- the ledger, its running total, and every subscription on it --
        is left exactly as it was.
        """
        resolved = self._resolved_meters()
        for entity_id in list(self._ledgers):
            if entity_id in resolved and resolved[entity_id] == self._overrides.get(entity_id):
                continue  # unaffected: leave the ledger and its subscribers running
            self._unsubs.pop(entity_id)()
            self._ledgers.pop(entity_id).stop()
            self._overrides.pop(entity_id, None)
            # A stale entry here would make a recreated ledger's first sample
            # compute its delta against the old ledger's last known total,
            # instead of the fresh ledger's own 0.0 starting point.
            self._last_totals.pop(entity_id, None)
        for entity_id, override in resolved.items():
            if entity_id in self._ledgers:
                continue  # already running, untouched above
            reader = FlowSensorReader(self._runtime.hass, entity_id, override)
            ledger = MeterLedger(self._runtime.hass, reader)
            self._ledgers[entity_id] = ledger
            self._overrides[entity_id] = override
            self._unsubs[entity_id] = ledger.subscribe(partial(self._on_sample, entity_id))
            ledger.start()

    def _resolved_meters(self) -> dict[str, str | None]:
        """Every configured meter, once, with the unit override that applies.

        One ledger per entity: keying by (entity, override) would integrate the
        same physical water twice. A zone that owns the meter and declares an
        override wins over the hub's -- including when the meter in question
        is the shared line meter, so a zone that points its own flow_sensor at
        it and declares its own override still wins over the hub's line
        override. Two conflicting claims on one entity, zone-vs-zone or
        zone-vs-hub, are a configuration fault, resolved deterministically
        (zone order, then zone over hub) and reported.

        This runs on every rebuild, i.e. every config change, so it is also
        the natural place to retire a conflict warning once it no longer
        applies: every entity that resolves here without conflicting has its
        issue cleared before returning.
        """
        meters: dict[str, str | None] = {}
        claimed_by: dict[str, str] = {}
        conflicted: set[str] = set()
        for zone in sorted(self._runtime.zones.values(), key=lambda z: z.config.order):
            sensor = zone.config.flow_sensor
            if not sensor:
                continue
            label = f"zone {zone.config.name}"
            if sensor in meters and meters[sensor] != zone.config.flow_sensor_unit:
                self._runtime.report_flow_unit_override_conflict(sensor, claimed_by[sensor], label)
                conflicted.add(sensor)
                continue
            meters[sensor] = zone.config.flow_sensor_unit
            claimed_by[sensor] = label
        line = self._runtime.hub.line_flow_sensor
        if line:
            if line in meters and meters[line] != self._runtime.hub.line_flow_sensor_unit:
                # A zone already claims the line entity under its own
                # override, and that override disagrees with the hub's own
                # line_flow_sensor_unit. The zone still wins -- meters[line]
                # is left untouched -- but the disagreement must not be
                # silent, since flow_reader_for builds a reader under the
                # hub's override for any zone that falls back to the line.
                self._runtime.report_flow_unit_override_conflict(
                    line, claimed_by[line], "the hub's line meter"
                )
                conflicted.add(line)
            elif line not in meters:
                meters[line] = self._runtime.hub.line_flow_sensor_unit
        for entity_id in meters:
            if entity_id not in conflicted:
                self._runtime.clear_flow_unit_override_conflict(entity_id)
        return meters

    def ledger_for(self, zone: ZoneRuntime) -> MeterLedger | None:
        """The ledger of whichever meter serves this zone, or None."""
        sensor = zone.config.flow_sensor or self._runtime.hub.line_flow_sensor
        return self._ledgers.get(sensor) if sensor else None

    def _claimants(self, entity_id: str) -> list[ZoneRuntime]:
        """Zones fed by this meter whose valve reports open."""
        line = self._runtime.hub.line_flow_sensor
        claimants = []
        for zone in self._runtime.zones.values():
            sensor = zone.config.flow_sensor or line
            if sensor == entity_id and zone.valve.is_open:
                claimants.append(zone)
        return claimants

    def _all_valves_closed(self) -> bool:
        """Every managed valve, master included, reports closed."""
        return not any(controller.is_open for controller in self._runtime.all_valve_controllers())

    def _scope_for(self, entity_id: str) -> str:
        """Whose leak this would be: the sole zone on this meter, or the hub."""
        line = self._runtime.hub.line_flow_sensor
        owners = [
            zone.config.zone_id
            for zone in self._runtime.zones.values()
            if (zone.config.flow_sensor or line) == entity_id
        ]
        return owners[0] if len(owners) == 1 else HUB_SCOPE

    @callback
    def _on_sample(self, entity_id: str, sample: MeterSample) -> None:
        liters = sample.total_l - self._last_totals.get(entity_id, 0.0)
        self._last_totals[entity_id] = sample.total_l
        if liters <= 0:
            return
        day = dt_util.as_local(sample.at).date()
        claimants = self._claimants(entity_id)
        state = self._runtime.state
        if not claimants:
            state.add_unattributed(
                self._scope_for(entity_id),
                liters,
                day=day,
                valves_closed=self._all_valves_closed(),
            )
        elif len(claimants) == 1:
            state.add_water(claimants[0].config.zone_id, liters, day=day, estimated=False)
        else:
            weights = [zone.config.nominal_flow_lpm or 0.0 for zone in claimants]
            total_weight = sum(weights)
            if total_weight <= 0:
                weights = [1.0] * len(claimants)
                total_weight = float(len(claimants))
            for zone, weight in zip(claimants, weights, strict=True):
                state.add_water(
                    zone.config.zone_id,
                    liters * weight / total_weight,
                    day=day,
                    estimated=False,
                )
        state.schedule_save()

    def record_estimate(self, zone_id: str, liters: float) -> None:
        """Litres for a zone with no meter: nominal rate x minutes, marked.

        Cycle-scoped on purpose. There is nothing to integrate continuously
        without a meter, and an estimate must never be presented as a
        measurement.
        """
        if liters <= 0:
            return
        self._runtime.state.add_water(zone_id, liters, day=dt_util.now().date(), estimated=True)
        self._runtime.state.schedule_save()
