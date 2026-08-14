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

#: Floor between two store writes (and two entity refreshes) asked for by the
#: sample path. A meter can report several times a second; the store it writes
#: to is shared with everything else the integration persists.
_PERSIST_INTERVAL_S = 60.0


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
    #: across a gap (unit unknown, or the meter unavailable) rather than
    #: interpolated, so accounting can report a gap instead of silently
    #: treating it as zero flow. For accounting only -- the zero-flow guard
    #: (FlowMonitor) does NOT read this field: its blind condition is
    #: `not unit_known or unit_recovered` alone, because a meter reporting a
    #: known zero while unavailable (flow.py's unavailable/unknown case:
    #: unit known, lpm 0.0, available False, hence measured_s 0.0 here) is a
    #: genuine zero the guard must still act on. Gating the guard on this
    #: field would leave it blind for as long as such an outage lasts.
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

    def retarget(self, reader: FlowSensorReader) -> None:
        """Read the same entity under a new unit override, from here forward.

        Replacing the ledger object instead would restart total_l at zero and
        take every subscription down with it -- including a running
        FlowMonitor's, which holds this object, never re-resolves it, and
        computes both its live litres and its final volume against a baseline
        taken from this total. Same physical meter, same monotonic total, same
        subscribers: only the interpretation of the number changes.

        The interval still open is closed first, at the rate that was believed
        while it ran -- the same left-Riemann rule _integrate applies
        everywhere else. Those litres are published on the next sample rather
        than here, so they are attributed to whoever the interval started
        with, exactly as an untouched ledger would have attributed them.
        """
        self._integrate(dt_util.utcnow())
        self._reader = reader
        reading = reader.read()
        self.unit_known = reading.unit_known
        self._last_lpm = reading.lpm or 0.0
        self._last_available = reading.available

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

    And it is read at the right end of the interval: each sample attributes
    the interval it is *closing* using the valve state remembered from the
    interval's own start, not the state at the sample's instant. A cycle's
    tail -- up to one tick's worth, integrated after the valve has already
    closed -- would otherwise find no claimant and land in the unattributed,
    valves-closed bucket on every single run.
    """

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self._ledgers: dict[str, MeterLedger] = {}
        self._unsubs: dict[str, CALLBACK_TYPE] = {}
        self._overrides: dict[str, str | None] = {}
        self._last_totals: dict[str, float] = {}
        # Who was watering as of the start of the interval that is still
        # open -- i.e. as of the previous sample. _on_sample attributes the
        # interval it is closing using these, not the claimants at its own
        # instant, and then refreshes them for the interval it is opening.
        # (zone_id, nominal_flow_lpm) pairs, not ZoneRuntime objects: pending
        # state can outlive a config change by up to one sample interval, and
        # a zone can be deleted in that window while its meter survives
        # (another zone, or the line, still points at it) -- holding onto the
        # object itself would credit that interval's litres to a zone that no
        # longer exists. Ids and nominal flow are all _on_sample needs.
        self._pending_claimants: dict[str, list[tuple[str, float]]] = {}
        self._pending_valves_closed: dict[str, bool] = {}
        #: When the sample path last asked for a store write and an entity
        #: refresh. See _due_to_persist.
        self._last_persist_at: datetime | None = None

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
        self._pending_claimants.clear()
        self._pending_valves_closed.clear()
        self._last_persist_at = None

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

        The same reasoning covers a meter this change *does* touch, as long as
        the entity itself survives. Editing a running meter's unit override is
        applied in place by design -- a reload would abort the cycle -- so
        stopping its ledger would deafen precisely the monitor watching that
        meter: stop() clears the listeners, and the monitor has no way to
        re-establish its own. Its litres would freeze while unit_known stayed
        True, so the guard would not judge itself blind, and within
        ZERO_FLOW_GRACE_S a healthy run would be interrupted as no_flow. Such
        a ledger is retargeted instead (see MeterLedger.retarget): same
        object, same monotonic total, same subscribers.

        Only a ledger whose entity disappeared from the configuration is
        stopped and dropped. Everything else -- the ledger, its running total,
        and every subscription on it -- is left exactly as it was.
        """
        resolved = self._resolved_meters()
        for entity_id in list(self._ledgers):
            if entity_id in resolved:
                if resolved[entity_id] != self._overrides.get(entity_id):
                    self._ledgers[entity_id].retarget(
                        FlowSensorReader(self._runtime.hass, entity_id, resolved[entity_id])
                    )
                    self._overrides[entity_id] = resolved[entity_id]
                    # _last_totals and the pending claimant/valves-closed
                    # state deliberately stay: the ledger's total carries on
                    # and so does its open interval, so clearing them would
                    # credit the whole cumulative total as one delta on the
                    # next sample and judge that interval by the wrong
                    # claimants.
                continue  # unaffected or retargeted: subscribers keep running
            self._unsubs.pop(entity_id)()
            self._ledgers.pop(entity_id).stop()
            self._overrides.pop(entity_id, None)
            # A stale entry here would make a later ledger on the same entity
            # -- one built after the meter returns to the configuration --
            # compute its first delta against the dropped ledger's last known
            # total, instead of the fresh ledger's own 0.0 starting point.
            # Same reasoning for the pending claimant/valves-closed state
            # below: that ledger's first interval must be judged against who
            # is watering then, not who was watering under the dropped one.
            self._last_totals.pop(entity_id, None)
            self._pending_claimants.pop(entity_id, None)
            self._pending_valves_closed.pop(entity_id, None)
        for entity_id, override in resolved.items():
            if entity_id in self._ledgers:
                continue  # already running, untouched above
            reader = FlowSensorReader(self._runtime.hass, entity_id, override)
            ledger = MeterLedger(self._runtime.hass, reader)
            self._ledgers[entity_id] = ledger
            self._overrides[entity_id] = override
            self._unsubs[entity_id] = ledger.subscribe(partial(self._on_sample, entity_id))
            # The interval about to open starts now, at whatever is watering
            # this instant -- there is no earlier sample to have captured it.
            self._pending_claimants[entity_id] = self._claimant_snapshot(entity_id)
            self._pending_valves_closed[entity_id] = self._all_valves_closed()
            ledger.start()

    def _resolved_meters(self) -> dict[str, str | None]:
        """Every configured meter, once, with the unit override that applies.

        One ledger per entity: keying by (entity, override) would integrate the
        same physical water twice. A zone that owns the meter and declares an
        override wins over the hub's -- including when the meter in question
        is the shared line meter, so a zone that points its own flow_sensor at
        it and declares its own override still wins over the hub's line
        override. Two conflicting claims on one entity are a configuration
        fault, resolved deterministically (zone order, then zone over hub) and
        reported -- zone-vs-zone and zone-vs-hub are different claimant
        shapes, each with its own issue id and translation key (see
        ``report_flow_unit_override_conflict`` and
        ``report_flow_line_override_conflict``), so a fix to one can never
        clear the other.

        This runs on every rebuild, i.e. every config change, so it is also
        the natural place to retire a conflict warning once it no longer
        applies: every entity that resolves here without a zone-vs-zone
        conflict has that issue cleared, and the line entity's zone-vs-hub
        issue is cleared whenever it no longer conflicts, before returning.
        """
        meters: dict[str, str | None] = {}
        claimed_by: dict[str, str] = {}
        conflicted: set[str] = set()
        for zone in sorted(self._runtime.zones.values(), key=lambda z: z.config.order):
            sensor = zone.config.flow_sensor
            if not sensor:
                continue
            if sensor in meters and meters[sensor] != zone.config.flow_sensor_unit:
                self._runtime.report_flow_unit_override_conflict(
                    sensor, claimed_by[sensor], zone.config.name
                )
                conflicted.add(sensor)
                continue
            meters[sensor] = zone.config.flow_sensor_unit
            claimed_by[sensor] = zone.config.name
        line = self._runtime.hub.line_flow_sensor
        if line:
            if line in meters and meters[line] != self._runtime.hub.line_flow_sensor_unit:
                # A zone already claims the line entity under its own
                # override, and that override disagrees with the hub's own
                # line_flow_sensor_unit. The zone still wins -- meters[line]
                # is left untouched -- but the disagreement must not be
                # silent, since flow_reader_for builds a reader under the
                # hub's override for any zone that falls back to the line.
                self._runtime.report_flow_line_override_conflict(line, claimed_by[line])
            else:
                self._runtime.clear_flow_line_override_conflict(line)
                if line not in meters:
                    meters[line] = self._runtime.hub.line_flow_sensor_unit
        for entity_id in meters:
            if entity_id not in conflicted:
                self._runtime.clear_flow_unit_override_conflict(entity_id)
        return meters

    def ledger_for(self, zone: ZoneRuntime) -> MeterLedger | None:
        """The ledger of whichever meter serves this zone, or None."""
        sensor = self._runtime.resolved_meter_entity(zone.config)
        return self._ledgers.get(sensor) if sensor else None

    def _claimants(self, entity_id: str) -> list[ZoneRuntime]:
        """Zones fed by this meter whose valve reports open."""
        claimants = []
        for zone in self._runtime.zones.values():
            sensor = self._runtime.resolved_meter_entity(zone.config)
            if sensor == entity_id and zone.valve.is_open:
                claimants.append(zone)
        return claimants

    def _claimant_snapshot(self, entity_id: str) -> list[tuple[str, float]]:
        """(zone_id, nominal_flow_lpm) for each open claimant, right now.

        What goes into ``_pending_claimants`` -- ids and their nominal flow,
        not the ``ZoneRuntime`` objects themselves, so a zone deleted while
        its interval is still pending cannot be credited water under an id
        that no longer exists. This is also exactly what a claimant looked
        like at the interval's own start, consistent with attributing the
        interval to who (and at what weight) it started with.
        """
        return [
            (zone.config.zone_id, zone.config.nominal_flow_lpm or 0.0)
            for zone in self._claimants(entity_id)
        ]

    def _all_valves_closed(self) -> bool:
        """Every managed valve, master included, reports closed.

        ``all(is_closed)``, never ``not any(is_open)``: valves.py separates
        the two on purpose, and is_closed's own docstring says an uncertain
        state is NOT closed. A ``valve.`` entity publishes opening/closing
        while it travels and a battery Zigbee valve publishes unavailable
        mid-run; in either window nothing is open, so the weaker test would
        call the system idle and book the litres into closed_l -- the sole
        input to leak detection, persisted from 3.3.0 onward. An uncertain
        valve claims nothing and contributes no leak evidence either, which
        is the only honest reading of "we do not know".
        """
        return all(controller.is_closed for controller in self._runtime.all_valve_controllers())

    def _scope_for(self, entity_id: str) -> str:
        """Whose leak this would be: the sole zone on this meter, or the hub."""
        owners = [
            zone.config.zone_id
            for zone in self._runtime.zones.values()
            if self._runtime.resolved_meter_entity(zone.config) == entity_id
        ]
        return owners[0] if len(owners) == 1 else HUB_SCOPE

    @callback
    def _on_sample(self, entity_id: str, sample: MeterSample) -> None:
        liters = sample.total_l - self._last_totals.get(entity_id, 0.0)
        self._last_totals[entity_id] = sample.total_l
        # Attribute the interval that just closed to who was watering at its
        # START (captured by the previous sample), not at this sample's own
        # instant: a run's tail -- up to one tick's worth, integrated after
        # the valve has already closed -- would otherwise find no claimants
        # right now and land in the unattributed bucket, a false contribution
        # to closed_l on every single cycle. Rate and claimants both belong
        # to the interval's beginning, matching the left-Riemann rate
        # MeterLedger already charges from its own start.
        claimants = self._pending_claimants.get(entity_id, [])
        # Defaults to False, not True: this fallback is unreachable today --
        # rebuild() seeds both pending dicts before a ledger's first sample
        # can ever fire -- but with no actual knowledge of the valve state,
        # "unattributed" is the honest default and "leak" (valves_closed=True)
        # is not something to assert without evidence.
        valves_closed = self._pending_valves_closed.get(entity_id, False)
        # Refresh unconditionally, even when nothing accrues below: the
        # interval opening now must be judged by who is watering as of THIS
        # instant, not stranded on whoever was watering before a zero-litres
        # gap (unit unknown, or simply no elapsed time).
        self._pending_claimants[entity_id] = self._claimant_snapshot(entity_id)
        self._pending_valves_closed[entity_id] = self._all_valves_closed()
        if liters <= 0:
            return
        day = dt_util.as_local(sample.at).date()
        state = self._runtime.state
        if not claimants:
            state.add_unattributed(
                self._scope_for(entity_id),
                liters,
                day=day,
                valves_closed=valves_closed,
            )
        elif len(claimants) == 1:
            state.add_water(claimants[0][0], liters, day=day, estimated=False)
        else:
            weights = [nominal for _, nominal in claimants]
            # Equal shares as soon as ANY claimant lacks a nominal, not only
            # when all of them do. A partial set of nominals cannot yield a
            # trustworthy proportion, and the alternative -- weight 0 -- would
            # credit exactly zero litres to a zone that was demonstrably
            # watering, which is plainly false. Water is conserved either way;
            # this only decides which of two wrong-in-detail splits to publish,
            # and an even one tells no zone it used nothing.
            if any(weight <= 0 for weight in weights):
                weights = [1.0] * len(claimants)
            total_weight = sum(weights)
            for (zone_id, _), weight in zip(claimants, weights, strict=True):
                state.add_water(
                    zone_id,
                    liters * weight / total_weight,
                    day=day,
                    estimated=False,
                )
        if not self._due_to_persist(sample.at):
            return
        state.schedule_save()
        # Every entity here is push-only: it re-reads on SIGNAL_UPDATE and
        # never polls. In-session litres are covered, because the session
        # dispatches on segment end and on each phase transition -- water
        # accrued OUTSIDE a session is not. A tap left open at 21:00 puts
        # thousands of litres into the store while hub_unattributed_water's
        # HA state does not move until the midnight housekeeping, which books
        # the whole delta on the wrong statistics day.
        self._runtime.dispatch_update()

    def _due_to_persist(self, at: datetime) -> bool:
        """At most one store write and one entity refresh per minute.

        Store._async_schedule_callback_delayed_write reschedules to
        _next_write_time whenever its timer fires early, and every
        async_delay_save pushes that to now + _SAVE_DELAY_S. A meter
        publishing faster than that delay therefore postpones the write for
        as long as flow continues -- and the store is shared, so a 90-minute
        session on a 3 s meter lands no write at all and takes
        set_last_completed for cycles that already finished down with it. A
        power cut then waters those zones again on the next evaluate. Nothing
        wrote at meter frequency before 3.3.0; this path must not either.

        The unconditional saves elsewhere are untouched: day rollover,
        record_estimate and the end of a cycle all still write immediately.
        """
        if self._last_persist_at is not None:
            elapsed_s = (at - self._last_persist_at).total_seconds()
            # Any non-forward gap re-arms at once: a clock stepping back must
            # not mute the store for the length of the step.
            if 0.0 <= elapsed_s < _PERSIST_INTERVAL_S:
                return False
        self._last_persist_at = at
        return True

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
