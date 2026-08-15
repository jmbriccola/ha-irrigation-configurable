"""Session runner: the only code path that ever opens a valve (§3).

One session = one frozen evaluation + a queue of zone-cycle segments.
The runner serializes segments (or batches them up to ``max_concurrent``
within a compatibility group), enforcing every safety level:

1. central queue — zones never open valves directly;
2. all managed valves verified closed before opening (timeout → cancel);
3. settle pause between zones, re-checked afterwards;
4. surveillance during the cycle (foreign open / manual close → close all);
5. post-manual-stop block window.

Any conflict or uncertainty resolves to *cancel and notify*, never *open
anyway*.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import partial
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, callback
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .accounting import MeterLedger, MeterSample
from .engine.model import SessionEvaluation, SkipReason
from .engine.planner import PlannedRun
from .engine.scheduling import max_run_minutes, next_allowed_start
from .valves import ValveController

if TYPE_CHECKING:
    from .runtime import IrrigationRuntime, ZoneRuntime

_LOGGER = logging.getLogger(__name__)

RESULT_COMPLETED = "completed"
RESULT_SKIPPED = "skipped"
RESULT_CANCELLED = "cancelled"
RESULT_INTERRUPTED = "interrupted"

REASON_VALVES_BUSY = "valves_busy"
REASON_VALVE_UNAVAILABLE = "valve_unavailable"
REASON_OPEN_FAILED = "open_failed"
REASON_FOREIGN_VALVE = "foreign_valve_open"
REASON_MANUAL = "manual_intervention"
REASON_NO_FLOW = "no_flow"
REASON_CLOSE_FAILED = "close_failed"
REASON_WATCHDOG = "watchdog"
REASON_LEAK = "leak"
#: Not a leak: the third thing a zone's sensors can say about water is that
#: there is none. It both refuses a start and explains a zero-flow interrupt,
#: which are the same fact reached from either side of the valve opening.
REASON_NO_WATER_SUPPLY = "no_water_supply"

_GATHER_WINDOW_S = 2.0

#: How long an unledgered close waits for its zone's supply sensor to speak
#: before the close is judged (see ``_defer_supply_decision``).
#:
#: The valve's state and the supply sensor's are two entities of one device,
#: reported separately, and nothing orders them: a same-device burst lands
#: inside a second, while a report whose first acknowledgement is lost waits on
#: the radio's own retries and arrives seconds later. Five seconds is past that
#: and under anything a person waiting at the valve would notice. It is not a
#: setting: the number is a property of the transport, not of the garden, and
#: this design has enough knobs.
_SUPPLY_EVIDENCE_GRACE_S = 5.0

PHASE_WAITING = "waiting"
PHASE_SETTLING = "settling"
PHASE_OPENING = "opening"
PHASE_WATERING = "watering"
PHASE_SOAKING = "soaking"
PHASE_CLOSING = "closing"


@dataclass
class QueuedSegment:
    """One run segment (a full run, or one cycle-and-soak slice)."""

    run: PlannedRun
    segment_index: int
    duration_min: int
    manual: bool
    earliest: datetime | None = None  # UTC; None = as soon as possible

    @property
    def zone_id(self) -> str:
        return self.run.zone_id

    @property
    def is_last_segment(self) -> bool:
        return self.segment_index == len(self.run.runs) - 1


@dataclass
class ActiveRun:
    """Live info about the currently watering zone (entity attributes)."""

    zone_id: str
    cycle_id: str
    phase: str
    started_at: datetime | None = None
    duration_min: int = 0
    segment_index: int = 0
    total_segments: int = 1
    liters: float = 0.0
    # Frozen at plan time (card contract: run_duration_min / run_planned_runs).
    run_total_min: int = 0
    planned_runs: tuple[int, ...] = ()


class FlowMonitor:
    """Watches a run's flow for anomalies. It no longer integrates.

    Litres come from the meter's ledger, which integrates continuously whether
    or not anything is watering; this holds a baseline and reads deltas. One
    integrator per meter, so a run's volume and the zone's cumulative total can
    never disagree.

    The rules that survive unchanged: a reading whose unit cannot be determined
    accumulates nothing, chases no volume target, checks no range, and above all
    does NOT trip the zero-flow guard, which would otherwise interrupt every run
    on such a meter. The guard's blind condition is exactly `not unit_known or
    unit_recovered` -- nothing else. In particular it does NOT read
    MeterSample.measured_s: a meter reporting a known zero because it is
    unavailable (flow.py's unavailable/unknown case -- unit known, lpm 0.0,
    available False) is still a genuine zero the guard is entitled to act on,
    and gating on measured_s would silently blind the guard to exactly that
    meter for as long as the outage lasts.
    """

    ZERO_FLOW_GRACE_S = 120
    ZERO_FLOW_EPSILON_L = 0.1
    RANGE_SUSTAIN_S = 120

    def __init__(
        self,
        runtime: IrrigationRuntime,
        ledger: MeterLedger,
        *,
        volume_target_l: int | None,
        expected_lpm: Callable[[], tuple[float, float] | None],
        on_no_flow: Callable[[], None],
        on_volume_reached: Callable[[], None],
    ) -> None:
        self._runtime = runtime
        self._ledger = ledger
        self._sensor = ledger.entity_id
        self._volume_target = volume_target_l
        self._expected_lpm = expected_lpm
        self._on_no_flow = on_no_flow
        self._on_volume_reached = on_volume_reached
        self.liters = 0.0
        self._baseline = 0.0
        self._last_lpm = 0.0
        self._liters_at_last_check = 0.0
        self._periodic_unsub: CALLBACK_TYPE | None = None
        self._out_of_range_since: datetime | None = None
        self._range_notified = False
        self._unsubs: list[CALLBACK_TYPE] = []
        self.unit_known = True
        self._unit_recovered = False
        self._unit_ever_known = False

    def start(self) -> None:
        self._baseline = self._ledger.total_l
        self.liters = 0.0
        self._liters_at_last_check = 0.0
        self.unit_known = self._ledger.unit_known
        if self.unit_known:
            self._unit_ever_known = True
            # Unconditionally, not on a transition: a meter fixed between runs
            # never presents a False->True edge and would otherwise keep its
            # repair for the life of the process. Deleting an issue that is not
            # there is a no-op.
            self._runtime.clear_flow_unit_unknown(self._sensor)
        else:
            # Also unconditional, for the same reason in reverse: every run
            # builds a fresh monitor that starts out believing the unit is
            # known, so a ledger whose unit was already unresolvable presents
            # that as a transition from THIS monitor's own point of view.
            # report_flow_unit_lost is withheld here -- nothing has resolved
            # yet this run, so there is no "was working and stopped" event to
            # push, only the standing configuration fault the repair states.
            self._runtime.report_flow_unit_unknown(self._sensor)
        self._unsubs.append(self._ledger.subscribe(self._on_sample))
        self._schedule_periodic_check()

    def _schedule_periodic_check(self) -> None:
        self._periodic_unsub = async_call_later(
            self._runtime.hass, self.ZERO_FLOW_GRACE_S, self._periodic_check
        )
        self._unsubs.append(self._periodic_unsub)

    def stop(self) -> float:
        self.liters = self._ledger.total_l - self._baseline
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        return self.liters

    @property
    def had_usable_unit(self) -> bool:
        """Whether the unit resolved at ANY point during this run, not just the last sample.

        Deliberately not ``self.unit_known`` (the last sample's answer): a
        meter that worked for part of a run and then lost its unit still has
        its working-part litres already recorded by the ledger, and
        ``add_consumption`` must not book a full-duration nominal estimate on
        top of them just because the run ended blind. Litres counted twice
        are worse than litres missed.

        Also not a live re-read after the run (``runtime.zone_flow_meter_usable``):
        the moments between this monitor's ``stop()`` and that later call are
        enough for the unit to resolve or stop resolving, disagreeing with
        what was true during the cycle. This is the run's own frozen answer.
        """
        return self._unit_ever_known

    @callback
    def _on_sample(self, sample: MeterSample) -> None:
        self.liters = sample.total_l - self._baseline
        self._last_lpm = sample.lpm or 0.0
        if sample.unit_recovered:
            # The window this happened in is now part blind, part measured;
            # _periodic_check must not judge it. Cleared when it consumes it.
            self._unit_recovered = True
            # Nothing was range-checked while the unit was unknown, so a
            # timestamp from before the loss plus one reading after it would
            # report as "sustained" an interval that was mostly unobserved.
            self._out_of_range_since = None
            self._runtime.clear_flow_unit_unknown(self._sensor)
        was_known = self.unit_known
        self.unit_known = sample.lpm is not None
        if self.unit_known:
            self._unit_ever_known = True
        if was_known and not self.unit_known:
            # Report once per transition, not once per read.
            self._runtime.report_flow_unit_unknown(self._sensor)
            self._runtime.report_flow_unit_lost(self._sensor)
        # Above the unit_known gate deliberately: these litres are the frozen,
        # certain ones, and this sample may be the one that lost the unit after
        # the ledger had already carried them past the target. Water certainly
        # delivered still finishes the run.
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        if not self.unit_known:
            return
        self._check_range(sample.at)

    @callback
    def _periodic_check(self, _now: Any) -> None:
        """Recurring guard: supply failure mid-run, on the run's own clock."""
        # Defensive, not a live path: _on_sample already runs this same check
        # on every ledger sample, ticks included, which arrive at least every
        # DEFAULT_TICK_S (30 s) -- far more often than this 120 s chain fires.
        # Kept for the same reason a safety timeout is kept even when nothing
        # is expected to reach it: cheap, and it costs nothing to leave armed.
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        # not unit_known or unit_recovered, and nothing else: a meter reading
        # a known zero (flow.py's unavailable/unknown case) must still trip
        # this guard, so it is judged on this boolean alone, never on how
        # much of the window was actually measured -- measured_s exists for
        # accounting (MeterSample), not for this decision.
        blind = not self.unit_known or self._unit_recovered
        self._unit_recovered = False
        delta = self.liters - self._liters_at_last_check
        self._liters_at_last_check = self.liters
        if blind:
            self._schedule_periodic_check()
            return
        if delta < self.ZERO_FLOW_EPSILON_L:
            self._on_no_flow()
            return
        self._schedule_periodic_check()

    def _check_range(self, now: datetime) -> None:
        expected = self._expected_lpm()
        if expected is None or self._range_notified or not self.unit_known:
            return
        low, high = expected
        if low <= self._last_lpm <= high:
            self._out_of_range_since = None
            return
        if self._out_of_range_since is None:
            self._out_of_range_since = now
        elif (now - self._out_of_range_since).total_seconds() >= self.RANGE_SUSTAIN_S:
            self._range_notified = True
            self._runtime.report_flow_out_of_range(self._last_lpm, low, high)


class SessionRunner:
    """Executes one session's queue; there is at most one per hub."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self.evaluation: SessionEvaluation | None = None
        self.duration_factor: float = 1.0
        self.started_at: datetime | None = None
        self._queue: list[QueuedSegment] = []
        self._task: asyncio.Task[None] | None = None
        self._abort = asyncio.Event()
        self._abort_reason: str | None = None
        self._abort_manual = False
        self._stopping = False
        self._active: dict[str, ActiveRun] = {}
        self._master_open = False
        self._last_zone: str | None = None
        self._surveillance_unsub: CALLBACK_TYPE | None = None
        self._recorded: set[tuple[str, str]] = set()
        self._pending_cancel_notices: dict[str, list[str]] = {}
        # One entry per zone currently in its watering wait, so a callback
        # outside ``_water`` can end that wait with a chosen result. Registered
        # and removed by ``_water`` itself, which is what makes "is this zone
        # watering right now" the same question as "is there a finisher".
        self._segment_finishers: dict[str, Callable[[str], None]] = {}
        # Closes whose verdict is waiting for evidence that may still arrive.
        # One per zone, cancelled with surveillance itself.
        self._pending_supply_decisions: dict[str, CALLBACK_TYPE] = {}

    # Public surface --------------------------------------------------------

    @property
    def active(self) -> bool:
        return self._task is not None and not self._task.done()

    @property
    def active_runs(self) -> dict[str, ActiveRun]:
        return dict(self._active)

    @property
    def queued_zone_ids(self) -> list[str]:
        return [segment.zone_id for segment in self._queue]

    def queue_snapshot(self) -> list[dict[str, Any]]:
        return [
            {
                "zone_id": segment.zone_id,
                "zone_name": segment.run.zone_name,
                "cycle_id": segment.run.cycle_id,
                "duration_min": segment.duration_min,
                "state": "queued",
            }
            for segment in self._queue
        ]

    def start_session(self, evaluation: SessionEvaluation, duration_factor: float) -> None:
        """Arm a new session (queue still empty)."""
        self.evaluation = evaluation
        self.duration_factor = duration_factor
        self.started_at = dt_util.utcnow()
        self._stopping = False
        self._abort = asyncio.Event()
        self._abort_reason = None
        self._abort_manual = False
        self._recorded.clear()
        self._pending_cancel_notices.clear()
        self._last_zone = None

    def enqueue(self, runs: Iterable[PlannedRun], *, manual: bool) -> None:
        """Queue each run's first segment and make sure the runner task lives.

        Later cycle-and-soak segments are queued by ``_execute`` when the
        previous one completes, carrying the soak-pause ``earliest`` time.
        """
        for run in runs:
            if not run.runs:
                continue
            self._queue.append(
                QueuedSegment(run=run, segment_index=0, duration_min=run.runs[0], manual=manual)
            )
        # The queue is priority-ordered: triggers firing in the same instant
        # arrive in arbitrary callback order, but zones must run in the
        # configured sequence (§1).
        self._queue.sort(
            key=lambda segment: (
                segment.run.order,
                segment.run.zone_name.casefold(),
                segment.run.zone_id,
                segment.segment_index,
            )
        )
        if self._queue and not self.active:
            self._task = self._runtime.entry.async_create_background_task(
                self._runtime.hass, self._run(), name="irrigation_maestro_session"
            )
        self._runtime.dispatch_update()

    async def async_stop_all(self, *, reason: str, manual: bool) -> None:
        """Abort the session: close everything, cancel the queue."""
        if not self.active and not self._active:
            await self._runtime.async_close_all_valves()
            return
        self._abort_reason = reason
        self._abort_manual = manual
        self._stopping = True
        self._abort.set()
        await self._runtime.async_close_all_valves()

    # Internals --------------------------------------------------------------

    def _restrictions(self, zone: ZoneRuntime) -> Any:
        """The hub's forbidden time windows.

        Restrictions are hours-only from 2.0.0 and no longer vary per zone;
        which *days* a zone waters is decided by each program's calendar.
        """
        return self._runtime.hub.restrictions

    def _session_expired(self) -> bool:
        hub = self._runtime.hub
        if hub.session_max_min is not None and self.started_at is not None:
            elapsed = (dt_util.utcnow() - self.started_at).total_seconds() / 60
            if elapsed >= hub.session_max_min:
                return True
        if hub.must_finish_by is not None:
            if dt_util.now().time() >= hub.must_finish_by:
                return True
            # A session that crossed midnight has certainly missed a same-day
            # must-finish-by deadline, even though the clock time reads early.
            return (
                self.started_at is not None
                and dt_util.as_local(self.started_at).date() != dt_util.now().date()
            )
        return False

    def _pick(self) -> QueuedSegment | None:
        now = dt_util.utcnow()
        for index, segment in enumerate(self._queue):
            if segment.earliest is None or segment.earliest <= now:
                return self._queue.pop(index)
        return None

    def _gather_batch(self, first: QueuedSegment) -> list[QueuedSegment]:
        """Segments allowed to run together with ``first``.

        Only zones sharing the same (non-empty) compatibility group may
        coexist, up to ``max_concurrent``; the pressure-safe default of 1
        keeps everything strictly serial.
        """
        limit = self._runtime.hub.max_concurrent
        if limit <= 1:
            return [first]
        first_zone = self._runtime.zones.get(first.zone_id)
        group = first_zone.config.compatibility_group if first_zone else None
        if not group:
            return [first]
        batch = [first]
        now = dt_util.utcnow()
        for candidate in list(self._queue):
            if len(batch) >= limit:
                break
            if candidate.earliest is not None and candidate.earliest > now:
                continue
            if candidate.zone_id in {item.zone_id for item in batch}:
                continue
            zone = self._runtime.zones.get(candidate.zone_id)
            if zone is None or zone.config.compatibility_group != group:
                continue
            self._queue.remove(candidate)
            batch.append(candidate)
        return batch

    async def _run(self) -> None:
        self._start_surveillance()
        self._runtime.fire_event(
            "session_started",
            {"queued": [segment.zone_id for segment in self._queue]},
        )
        try:
            # Coalescing window: triggers scheduled for the same instant all
            # join the queue before the first pick, so zone priority wins over
            # callback arrival order.
            await self._sleep(_GATHER_WINDOW_S)
            while not self._stopping:
                segment = self._pick()
                if segment is None:
                    if not self._queue:
                        break
                    pending = [s.earliest for s in self._queue if s.earliest is not None]
                    if not pending:
                        break  # defensive: nothing can ever become eligible
                    await self._wait_until(min(pending))
                    continue
                if self._session_expired():
                    self._skip_remaining(segment)
                    break
                batch = self._gather_batch(segment)
                if len(batch) == 1:
                    await self._execute(segment)
                else:
                    await asyncio.gather(*(self._execute(item) for item in batch))
            if self._stopping:
                self._cancel_queue()
        finally:
            self._stop_surveillance()
            await self._close_master()
            # A run enqueued during this teardown must not vanish silently:
            # record an outcome so the sentinel never sees a gap.
            for leftover in list(self._queue):
                self._record(leftover, RESULT_CANCELLED, self._abort_reason or RESULT_CANCELLED)
            await self._flush_cancel_notices()
            self._active.clear()
            self._queue.clear()
            self.evaluation = None
            self.started_at = None
            self._runtime.fire_event(
                "session_finished",
                {"aborted": self._stopping, "reason": self._abort_reason},
            )
            await self._runtime.async_save_state()
            self._runtime.dispatch_update()

    # -- safety level 4: surveillance ----------------------------------------

    def _start_surveillance(self) -> None:
        entities = self._runtime.managed_valve_entities()
        self._surveillance_unsub = async_track_state_change_event(
            self._runtime.hass, entities, self._on_valve_change
        )

    def _stop_surveillance(self) -> None:
        if self._surveillance_unsub is not None:
            self._surveillance_unsub()
            self._surveillance_unsub = None
        # Surveillance's own deferred work dies with it: a verdict on a close
        # is meaningless once there is no session left to abort, and this is
        # the single teardown -- reached from ``_run``'s finally on every exit,
        # including the cancellation that entry unload and reload produce.
        self._cancel_supply_decisions()

    @callback
    def _on_valve_change(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data["entity_id"]
        new_state = event.data["new_state"]
        if new_state is None:
            return
        is_open = new_state.state in ("open", "on")
        is_closed = new_state.state in ("closed", "off")
        # Consume our own command echo FIRST, expected or not: every internal
        # command registers a ledger entry and its resulting transition must
        # retire it, otherwise stale entries would mask a real manual
        # intervention later (the entries only exist to tell ours apart).
        if is_open and self._runtime.ledger_consume(entity_id, "open"):
            return
        if is_closed and self._runtime.ledger_consume(entity_id, "close"):
            return
        if self._stopping:
            return
        # Both questions below are answered from this one mapping, so the set
        # of expected valves and the zone a valve belongs to cannot drift
        # apart. The master is in the set and not in the mapping, which is
        # exactly the difference the exemption turns on.
        #
        # Keyed by entity id, so two zones configured on ONE valve entity
        # collapse to the last of them -- inherited from the set this replaced,
        # which collapsed them too, but now load-bearing for a safety decision:
        # the exemption would consult that zone's sensor and end that zone's
        # run alone. Left as it is deliberately; it needs a topology nothing in
        # the component asks for.
        active_valves = {
            self._runtime.zones[zone_id].valve.entity_id: zone_id for zone_id in self._active
        }
        expected_open = set(active_valves)
        master = self._runtime.hub.master_valve
        if master is not None and self._master_open:
            expected_open.add(master)

        if is_open and entity_id not in expected_open:
            self._trigger_manual_abort(REASON_FOREIGN_VALVE)
        elif is_closed and entity_id in expected_open:
            zone_id = active_valves.get(entity_id)
            if zone_id is not None:
                if self._runtime.water_supply_missing(zone_id):
                    # The valve's own firmware closes it when it detects no flow
                    # (the SWV's automatic no-water closure). Fighting that would
                    # abort every zone over a legitimate, self-diagnosed stop.
                    #
                    # Deliberately narrow: only the watering zone's OWN valve,
                    # and only on hard evidence from its OWN supply sensor.
                    # Without a sensor there is no way to tell the firmware from
                    # a hand on the switch, and the manual-intervention
                    # guarantee is not weakened where the evidence to weaken it
                    # is absent.
                    #
                    # The raw predicate, never the gated one: the confirmation
                    # window governs refusing a START, and the firmware closes
                    # the moment it sees no flow, so waiting it out here would
                    # defeat the exemption in precisely the case it exists for.
                    self._end_segment_no_supply(zone_id)
                    return
                if self._runtime.water_supply_sensor(zone_id) is not None:
                    # The evidence exists but has not arrived. The valve's state
                    # and its supply sensor are two entities of one device,
                    # reported separately and in no guaranteed order, so judging
                    # on the reading available in this instant would abort the
                    # whole session whenever the close happens to be read first
                    # -- intermittently, which reads as a flaky bug rather than
                    # a missing feature.
                    self._defer_supply_decision(zone_id)
                    return
                # No sensor: no evidence can arrive, so there is nothing to wait
                # for and the guarantee below is untouched. This is what keeps
                # the delay bounded to installations that asked for it.
            self._trigger_manual_abort(REASON_MANUAL)

    @callback
    def _defer_supply_decision(self, zone_id: str) -> None:
        """Hold the verdict on this close until its evidence could have arrived.

        What it costs, plainly: a genuine manual close on a zone that HAS a
        supply sensor is answered ``_SUPPLY_EVIDENCE_GRACE_S`` later than it
        used to be, and the other zones water for those seconds. A hand on a
        valve is not a race against seconds, and it is a hand that was stopping
        those zones anyway. What it buys is that the firmware's own no-water
        closure stops depending on which of two reports the radio delivers
        first.

        One wait per zone, never extended: a second close arriving inside the
        window is the same premise, and re-arming would let a flapping valve
        postpone the verdict indefinitely. The wait already re-reads live state
        when it ends, so nothing is lost by keeping the first.
        """
        if zone_id in self._pending_supply_decisions:
            return
        self._pending_supply_decisions[zone_id] = async_call_later(
            self._runtime.hass,
            _SUPPLY_EVIDENCE_GRACE_S,
            partial(self._decide_supply_close, zone_id),
        )

    @callback
    def _decide_supply_close(self, zone_id: str, _now: datetime) -> None:
        """Judge the deferred close from live state, whatever it now says.

        Evidence first, and only then the question of what is left to act on:
        an outage confirmed a second before the segment ended is still the
        right diagnosis, and ``_end_segment_no_supply`` is a no-op when there
        is no wait to end -- so this path reaches exactly the same answer as
        the immediate one, in every phase.

        Without evidence, the abort fires only while the premise it was
        deferred on still holds: the session is running, the zone is still
        active, and its valve is still shut. A valve that reopened inside the
        window, or a run that has since ended, has left nothing to abort ON --
        the observation has expired, and aborting on an expired observation is
        acting on stale information. The cost is a manual close in the last
        seconds of a run, on a zone with a supply sensor, going unanswered; the
        next zone opens, and the next close is judged on its own merits with
        the block armed then. The guarantee degrades by seconds, not by cases.

        The first check is defence in depth: ``_stop_surveillance`` cancels
        every pending decision, so a fire into a dead session should not be
        reachable at all.
        """
        self._pending_supply_decisions.pop(zone_id, None)
        if self._stopping or not self.active:
            return
        if self._runtime.water_supply_missing(zone_id):
            self._end_segment_no_supply(zone_id)
            return
        zone = self._runtime.zones.get(zone_id)
        if zone is None or zone_id not in self._active or not zone.valve.is_closed:
            return
        self._trigger_manual_abort(REASON_MANUAL)

    @callback
    def _cancel_supply_decisions(self) -> None:
        for unsub in self._pending_supply_decisions.values():
            unsub()
        self._pending_supply_decisions.clear()

    @callback
    def _end_segment_no_supply(self, zone_id: str) -> None:
        """End this zone's watering now, with the specific reason.

        Chosen rather than left to the zero-flow guard, which is not a fallback
        everywhere: ``_water`` builds its FlowMonitor only for a zone whose
        meter resolves, so an installation with neither a zone meter nor a hub
        line meter has no zero-flow guard at all -- and that is the likeliest
        installation to arrive here, since a supply contact is cheap and
        per-zone meters are not. There, ending the segment is not merely
        tidier and earlier: it is the only thing that ever ends it, and the
        alternative is a run standing its full length behind a shut valve.
        Where a meter does exist, the guard would reach the same conclusion
        within its grace window, later and by a different route. One
        terminating path, chosen, instead of one late and one absent.

        A zone in ``_active`` that is not watering yet -- waiting for the
        valves to be free, settling, opening -- has registered no finisher and
        has no wait to end. The exemption still holds, because the evidence is
        the same and the firmware is as entitled to close then as later; the
        segment simply reaches its own outcome by its own path.
        """
        finisher = self._segment_finishers.get(zone_id)
        if finisher is not None:
            finisher(REASON_NO_WATER_SUPPLY)

    @callback
    def _trigger_manual_abort(self, reason: str) -> None:
        _LOGGER.warning("Manual intervention detected (%s): aborting session", reason)
        self._abort_reason = reason
        self._abort_manual = True
        self._stopping = True
        self._abort.set()
        # Arm the post-manual-stop block window immediately (§3 level 5).
        self._runtime.state.set_manual_stop(dt_util.utcnow())
        self._runtime.state.schedule_save()
        self._runtime.entry.async_create_background_task(
            self._runtime.hass,
            self._runtime.async_close_all_valves(),
            name="irrigation_maestro_abort_close",
        )

    # -- waits -----------------------------------------------------------------

    async def _sleep(self, seconds: float) -> bool:
        """Abortable sleep. Returns False if the session was aborted."""
        if self._abort.is_set():
            return False
        if seconds <= 0:
            return True
        future: asyncio.Future[bool] = self._runtime.hass.loop.create_future()

        @callback
        def _timeout(_now: Any) -> None:
            if not future.done():
                future.set_result(True)

        unsub_timer = async_call_later(self._runtime.hass, seconds, _timeout)
        try:
            await self._race(future)
            return future.done() and not self._abort.is_set()
        finally:
            unsub_timer()

    async def _race(self, future: asyncio.Future[Any]) -> None:
        """Wait for a future OR the session abort event, whichever first."""
        abort_task: asyncio.Future[Any] = asyncio.ensure_future(self._abort.wait())
        try:
            await asyncio.wait((future, abort_task), return_when=asyncio.FIRST_COMPLETED)
        finally:
            abort_task.cancel()

    async def _wait_until(self, when: datetime) -> bool:
        return await self._sleep((when - dt_util.utcnow()).total_seconds())

    async def _wait_valves_closed(
        self, *, timeout_s: float, own_zone_id: str | None = None
    ) -> str | None:
        """Wait for every managed valve to be confirmed closed.

        Concurrently-active *other* zones (and the master while a session
        runs) are exempt; the calling zone's OWN valve is checked too — a
        valve found open before its command was ever sent means a manual
        intervention or a failed earlier close, and must cancel, not be
        silently absorbed (§3 level 2).

        Returns None when free, or a cancellation reason on timeout.
        """
        excluded = {
            self._runtime.zones[zone_id].valve.entity_id
            for zone_id in self._active
            if zone_id != own_zone_id
        }
        master = self._runtime.hub.master_valve
        if master is not None and self._master_open:
            excluded.add(master)
        controllers = [
            controller
            for controller in self._runtime.all_valve_controllers()
            if controller.entity_id not in excluded
        ]

        def blocked() -> list[Any]:
            return [controller for controller in controllers if not controller.is_closed]

        if not blocked():
            return None

        future: asyncio.Future[bool] = self._runtime.hass.loop.create_future()

        @callback
        def _on_state(_event: Event[EventStateChangedData]) -> None:
            if not future.done() and not blocked():
                future.set_result(True)

        @callback
        def _timeout(_now: Any) -> None:
            if not future.done():
                future.set_result(False)

        unsub_state = async_track_state_change_event(
            self._runtime.hass,
            [controller.entity_id for controller in controllers],
            _on_state,
        )
        unsub_timer = async_call_later(self._runtime.hass, timeout_s, _timeout)
        try:
            await self._race(future)
            if self._abort.is_set():
                return self._abort_reason or REASON_MANUAL
            if future.done() and future.result():
                return None
            remaining = blocked()
            if any(not controller.available for controller in remaining):
                return REASON_VALVE_UNAVAILABLE
            return REASON_VALVES_BUSY
        finally:
            unsub_state()
            unsub_timer()

    # -- master valve -----------------------------------------------------------

    async def _open_master(self) -> bool:
        hub = self._runtime.hub
        master = self._runtime.master_controller
        if master is None or self._master_open:
            return True
        self._runtime.ledger_expect(master.entity_id, "open")
        await master.async_open()
        confirm = hub.switch_confirm_s if master.is_switch else hub.open_confirm_s
        if not await master.async_wait_until(open_=True, timeout_s=confirm):
            self._runtime.ledger_discard(master.entity_id, "open")
            self._runtime.ledger_expect(master.entity_id, "close")
            await master.async_close()
            return False
        self._master_open = True
        await self._sleep(hub.master_pre_open_s)
        return True

    async def _close_master(self) -> None:
        master = self._runtime.master_controller
        if master is None or not self._master_open:
            return
        await self._sleep_unconditional(self._runtime.hub.master_post_close_s)
        self._runtime.ledger_expect(master.entity_id, "close")
        await master.async_close()
        await master.async_wait_until(open_=False, timeout_s=self._runtime.hub.close_confirm_s)
        self._master_open = False

    async def _sleep_unconditional(self, seconds: float) -> None:
        """A sleep that ignores the abort flag (used during teardown)."""
        if seconds <= 0:
            return
        future: asyncio.Future[None] = self._runtime.hass.loop.create_future()

        @callback
        def _timeout(_now: Any) -> None:
            if not future.done():
                future.set_result(None)

        async_call_later(self._runtime.hass, seconds, _timeout)
        await future

    # -- outcome helpers ---------------------------------------------------------

    def _record(
        self,
        segment: QueuedSegment,
        result: str,
        reason: str | None = None,
        *,
        minutes: int | None = None,
        liters: float | None = None,
        partial: bool = False,
        notify_reason_group: bool = True,
    ) -> None:
        key = (segment.run.zone_id, segment.run.cycle_id)
        if key in self._recorded:
            return
        self._recorded.add(key)
        self._runtime.record_run_outcome(
            zone_id=segment.run.zone_id,
            zone_name=segment.run.zone_name,
            cycle_id=segment.run.cycle_id,
            result=result,
            reason=reason,
            minutes=minutes,
            liters=liters,
            partial=partial,
            scheduled=not segment.manual,
        )
        if result in (RESULT_CANCELLED, RESULT_INTERRUPTED) and notify_reason_group:
            names = self._pending_cancel_notices.setdefault(reason or result, [])
            if segment.run.zone_name not in names:
                names.append(segment.run.zone_name)
        # A failed or aborted segment invalidates the rest of its run.
        if result != RESULT_COMPLETED:
            self._queue = [
                item for item in self._queue if (item.run.zone_id, item.run.cycle_id) != key
            ]

    def _skip_remaining(self, first: QueuedSegment | None) -> None:
        segments = ([first] if first else []) + self._queue
        self._queue = []
        seen: set[tuple[str, str]] = set()
        names: list[str] = []
        for segment in segments:
            key = (segment.run.zone_id, segment.run.cycle_id)
            if key in seen:
                continue
            seen.add(key)
            self._runtime.record_run_outcome(
                zone_id=segment.run.zone_id,
                zone_name=segment.run.zone_name,
                cycle_id=segment.run.cycle_id,
                result=RESULT_SKIPPED,
                reason=str(SkipReason.SESSION_OVERRUN),
                scheduled=not segment.manual,
            )
            if segment.run.zone_name not in names:
                names.append(segment.run.zone_name)
        if names:
            self._runtime.fire_event("session_overrun", {"zones": names})
            self._runtime.entry.async_create_background_task(
                self._runtime.hass,
                self._runtime.notify_session_overrun(names),
                name="irrigation_maestro_notify_overrun",
            )

    def _cancel_queue(self) -> None:
        reason = (
            "manual_stop_block" if self._abort_manual else (self._abort_reason or RESULT_CANCELLED)
        )
        for segment in list(self._queue):
            self._record(segment, RESULT_CANCELLED, reason)
        self._queue = []

    async def _flush_cancel_notices(self) -> None:
        for reason, names in self._pending_cancel_notices.items():
            await self._runtime.notify_cancelled(reason, names)
        self._pending_cancel_notices.clear()

    # -- segment execution ----------------------------------------------------------

    async def _execute(self, segment: QueuedSegment) -> None:
        runtime = self._runtime
        hub = runtime.hub
        zone = runtime.zones.get(segment.zone_id)
        if zone is None:  # zone removed while queued
            return
        valve = zone.valve

        # Safety level 5: post-manual-stop block window.
        if not segment.manual and runtime.manual_block_active():
            self._record(segment, RESULT_CANCELLED, "manual_stop_block")
            return

        # A confirmed leak, under the leak action that opted into blocking.
        # Here rather than at enqueue time so every path is covered by one
        # gate, exactly like the window above: scheduled runs, manual runs and
        # the later segments of a soak split all reach this before a valve
        # opens. A segment already watering is NOT stopped -- blocking governs
        # starts, and aborting a running cycle is what `close` promises not to
        # do. Manual runs are deliberately not exempt: "no new cycles" includes
        # the one asked for by hand, and the escapes are fixing the leak,
        # removing the source that reported it, or changing the action.
        if runtime.leak_block_active(segment.zone_id):
            self._record(segment, RESULT_SKIPPED, REASON_LEAK)
            return

        # No water behind the valve, confirmed for long enough to be believed.
        # In the same gate block and for the same reasons: every path reaches
        # it before a valve opens, a running segment is not stopped, and a
        # manual run is not exempt -- asking by hand does not conjure water
        # into the pipe. Blocking costs the garden nothing, because with no
        # water the cycle waters nothing either way; what it saves is a
        # pointless actuation and an outcome that says why.
        if runtime.water_supply_block_active(segment.zone_id):
            self._record(segment, RESULT_SKIPPED, REASON_NO_WATER_SUPPLY)
            return

        # Calendar forbidden windows: never start inside one; truncate to
        # avoid overrunning into one; slide queued work to the next slot.
        restrictions = self._restrictions(zone)
        local_now = dt_util.now()
        allowed_min = max_run_minutes(local_now, restrictions, requested_min=segment.duration_min)
        if allowed_min <= 0:
            slot = next_allowed_start(local_now, restrictions)
            segment.earliest = dt_util.as_utc(slot)
            self._queue.append(segment)
            return
        truncated = allowed_min < segment.duration_min

        # Safety level 2: every managed valve confirmed closed — including
        # this zone's own valve (open before its command = manual/stuck).
        self._set_active(segment, PHASE_WAITING)
        reason = await self._wait_valves_closed(
            timeout_s=hub.wait_free_min * 60, own_zone_id=segment.zone_id
        )
        if reason is not None:
            self._clear_active(segment)
            if self._stopping:
                self._record(segment, RESULT_INTERRUPTED, reason)
            else:
                self._record(segment, RESULT_CANCELLED, reason)
            return

        # Safety level 3: settle pause between zones, then re-check.
        if self._last_zone is not None and self._last_zone != segment.zone_id:
            self._set_active(segment, PHASE_SETTLING)
            if not await self._sleep(hub.settle_pause_s):
                self._clear_active(segment)
                self._record(segment, RESULT_INTERRUPTED, self._abort_reason or REASON_MANUAL)
                return
            reason = await self._wait_valves_closed(timeout_s=1, own_zone_id=segment.zone_id)
            if reason is not None:
                self._clear_active(segment)
                self._record(segment, RESULT_CANCELLED, REASON_FOREIGN_VALVE)
                return

        # Master valve / pump.
        if not await self._open_master():
            self._clear_active(segment)
            self._record(segment, RESULT_CANCELLED, REASON_OPEN_FAILED)
            self._stopping = True
            self._abort_reason = REASON_OPEN_FAILED
            return
        if self._abort.is_set():
            # Aborted during the master pre-open pause: never open the zone
            # valve after a stop ("cancel and notify, never open anyway").
            self._clear_active(segment)
            self._record(segment, RESULT_INTERRUPTED, self._abort_reason or REASON_MANUAL)
            return

        # Open with confirmation.
        self._set_active(segment, PHASE_OPENING)
        runtime.ledger_expect(valve.entity_id, "open")
        await valve.async_open()
        confirm_s = hub.switch_confirm_s if valve.is_switch else hub.open_confirm_s
        if not await valve.async_wait_until(open_=True, timeout_s=confirm_s):
            # The unconfirmed command's ledger entry must not linger: it could
            # absorb a genuine manual open later.
            runtime.ledger_discard(valve.entity_id, "open")
            runtime.ledger_expect(valve.entity_id, "close")
            await valve.async_close()
            self._clear_active(segment)
            if self._stopping:
                self._record(segment, RESULT_INTERRUPTED, self._abort_reason or REASON_MANUAL)
            else:
                self._record(segment, RESULT_CANCELLED, REASON_OPEN_FAILED)
            return

        # Watering.
        runtime.fire_event(
            "cycle_started",
            {
                "zone_id": segment.zone_id,
                "zone_name": segment.run.zone_name,
                "cycle_id": segment.run.cycle_id,
                "segment_index": segment.segment_index,
                "duration_min": allowed_min,
            },
        )
        watering_result, liters, elapsed_min, had_usable_unit = await self._water(
            segment, zone, allowed_min
        )

        # Close with confirmation and one retry (always, whatever happened).
        close_ok = await self._close_valve(valve)
        self._clear_active(segment)
        self._last_zone = segment.zone_id
        runtime.add_consumption(zone, liters, minutes=elapsed_min, had_usable_unit=had_usable_unit)

        if watering_result == "aborted":
            self._record(
                segment,
                RESULT_INTERRUPTED,
                self._abort_reason or REASON_MANUAL,
                minutes=allowed_min,
                liters=liters or None,
            )
            return
        if watering_result == "no_flow":
            # Prefer the specific diagnosis when the zone has a sensor able to
            # give one. Deliberately NOT gated on the confirmation window that
            # governs a refused start: this explains an interruption that has
            # already happened, and the sensor's reading at that moment is the
            # evidence for why. Gating it would swap a specific diagnosis for a
            # generic one and gain nothing -- the cycle is over either way.
            #
            # Only the reason changes: the outcome, the notification channel
            # and the aggregation are the generic diagnosis's, because this is
            # the same physical event and it must not move channel depending on
            # whether the zone happens to have a supply sensor.
            if runtime.water_supply_missing(segment.zone_id):
                self._record(
                    segment, RESULT_INTERRUPTED, REASON_NO_WATER_SUPPLY, minutes=allowed_min
                )
                await runtime.notify_anomaly(
                    f"No flow while watering {segment.run.zone_name}: the zone's "
                    "supply sensor reports no water. Cycle interrupted."
                )
                return
            self._record(segment, RESULT_INTERRUPTED, REASON_NO_FLOW, minutes=allowed_min)
            await runtime.notify_anomaly(
                f"No flow detected while watering {segment.run.zone_name}; cycle interrupted."
            )
            return
        if watering_result == REASON_NO_WATER_SUPPLY:
            # The zone's valve closed itself for want of water (see
            # _on_valve_change): the same fact as the diagnosis just above,
            # about the same zone, reached from the other side of the valve --
            # so it lands in the same outcome, with the same reason.
            #
            # No anomaly is pushed on top of it. The interruption already
            # travels with this reason, in the outcome and in the not-completed
            # notice _record groups; the outage itself is what the supply's own
            # notice reports, once it stands confirmed. Anything said here
            # would be a second telling of one of those two.
            self._record(segment, RESULT_INTERRUPTED, REASON_NO_WATER_SUPPLY, minutes=allowed_min)
            return
        if not close_ok:
            await runtime.report_close_failure(valve.entity_id, segment.run.zone_name)

        if segment.is_last_segment or truncated:
            self._record(
                segment,
                RESULT_COMPLETED,
                minutes=self._completed_minutes(segment, allowed_min, truncated),
                liters=liters or None,
                partial=truncated,
            )
        else:
            # Cycle-and-soak: requeue the next segment after the pause; other
            # zones may interleave meanwhile.
            next_segment = QueuedSegment(
                run=segment.run,
                segment_index=segment.segment_index + 1,
                duration_min=segment.run.runs[segment.segment_index + 1],
                manual=segment.manual,
                earliest=dt_util.utcnow() + timedelta(minutes=segment.run.soak_pause_min),
            )
            self._queue.append(next_segment)
        runtime.dispatch_update()

    def _completed_minutes(self, segment: QueuedSegment, allowed_min: int, truncated: bool) -> int:
        done_before = sum(segment.run.runs[: segment.segment_index])
        this_run = allowed_min if truncated else segment.duration_min
        return done_before + this_run

    async def _water(
        self, segment: QueuedSegment, zone: ZoneRuntime, allowed_min: int
    ) -> tuple[str, float, float, bool]:
        """Run the watering wait; returns (result, liters, elapsed_minutes, had_usable_unit)."""
        self._set_active(segment, PHASE_WATERING, duration_min=allowed_min)
        future: asyncio.Future[str] = self._runtime.hass.loop.create_future()

        def _finish(result: str) -> None:
            if not future.done():
                future.set_result(result)

        duration_s: float = allowed_min * 60
        if segment.run.volume_l is not None:
            duration_s = segment.run.safety_timeout_min * 60

        @callback
        def _on_duration_elapsed(_now: Any) -> None:
            _finish("done")

        unsub_timer = async_call_later(self._runtime.hass, duration_s, _on_duration_elapsed)
        monitor: FlowMonitor | None = None
        ledger = self._runtime.accountant.ledger_for(zone)
        if ledger is not None:
            monitor = FlowMonitor(
                self._runtime,
                ledger,
                volume_target_l=segment.run.volume_l,
                expected_lpm=self._runtime.expected_flow_range,
                on_no_flow=lambda: _finish("no_flow"),
                on_volume_reached=lambda: _finish("done"),
            )
            monitor.start()

        started = dt_util.utcnow()
        liters = 0.0
        had_usable_unit = False
        # Registered as late as possible and dropped in the same `finally` as
        # the monitor: a finisher outliving its wait would resolve a future
        # belonging to nothing, or to the zone's next segment.
        self._segment_finishers[segment.zone_id] = _finish
        try:
            await self._race(future)
        finally:
            self._segment_finishers.pop(segment.zone_id, None)
            # monitor.stop() belongs here, not after the try: a CancelledError
            # out of _race must not skip it, or it leaves a ledger
            # subscription and a self-rearming periodic-check timer chain
            # alive for the life of the process.
            unsub_timer()
            if monitor is not None:
                liters = monitor.stop()
                had_usable_unit = monitor.had_usable_unit
        elapsed_min = (dt_util.utcnow() - started).total_seconds() / 60
        if self._abort.is_set() or not future.done():
            return "aborted", liters, elapsed_min, had_usable_unit
        return future.result(), liters, elapsed_min, had_usable_unit

    async def _close_valve(self, valve: ValveController) -> bool:
        # A valve already closed produces no transition, so a ledger entry
        # registered here would never be consumed and would sit for its whole
        # TTL, absorbing the next genuine manual close. runtime.async_close_all_valves
        # guards the same way -- this made _close_valve the odd one out.
        if valve.is_closed:
            return True
        self._runtime.ledger_expect(valve.entity_id, "close")
        await valve.async_close()
        hub = self._runtime.hub
        confirm_s = hub.switch_confirm_s if valve.is_switch else hub.close_confirm_s
        if await valve.async_wait_until(open_=False, timeout_s=confirm_s):
            return True
        self._runtime.ledger_expect(valve.entity_id, "close")
        await valve.async_close()
        return await valve.async_wait_until(open_=False, timeout_s=confirm_s)

    def _set_active(self, segment: QueuedSegment, phase: str, duration_min: int = 0) -> None:
        self._active[segment.zone_id] = ActiveRun(
            zone_id=segment.zone_id,
            cycle_id=segment.run.cycle_id,
            phase=phase,
            started_at=dt_util.utcnow() if phase == PHASE_WATERING else None,
            duration_min=duration_min or segment.duration_min,
            segment_index=segment.segment_index,
            total_segments=len(segment.run.runs),
            run_total_min=segment.run.duration_min,
            planned_runs=segment.run.runs,
        )
        self._runtime.dispatch_update()

    def _clear_active(self, segment: QueuedSegment) -> None:
        self._active.pop(segment.zone_id, None)
        self._runtime.dispatch_update()
