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
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, callback
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

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

_GATHER_WINDOW_S = 2.0

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
    """Integrates a flow sensor (L/min) during a run and detects anomalies."""

    ZERO_FLOW_GRACE_S = 120
    ZERO_FLOW_EPSILON_L = 0.1
    RANGE_SUSTAIN_S = 120

    def __init__(
        self,
        runtime: IrrigationRuntime,
        sensor: str,
        *,
        volume_target_l: int | None,
        expected_lpm: Callable[[], tuple[float, float] | None],
        on_no_flow: Callable[[], None],
        on_volume_reached: Callable[[], None],
    ) -> None:
        self._runtime = runtime
        self._sensor = sensor
        self._volume_target = volume_target_l
        self._expected_lpm = expected_lpm
        self._on_no_flow = on_no_flow
        self._on_volume_reached = on_volume_reached
        self.liters = 0.0
        self._last_at: datetime | None = None
        self._last_lpm = 0.0
        self._liters_at_last_check = 0.0
        self._periodic_unsub: CALLBACK_TYPE | None = None
        self._out_of_range_since: datetime | None = None
        self._range_notified = False
        self._unsubs: list[CALLBACK_TYPE] = []

    def _read(self) -> float:
        state = self._runtime.hass.states.get(self._sensor)
        if state is None or state.state in ("unavailable", "unknown"):
            return 0.0
        try:
            return max(float(state.state), 0.0)
        except ValueError:
            return 0.0

    def start(self) -> None:
        now = dt_util.utcnow()
        self._last_at = now
        self._last_lpm = self._read()
        self._liters_at_last_check = 0.0
        self._unsubs.append(
            async_track_state_change_event(self._runtime.hass, [self._sensor], self._on_state)
        )
        self._schedule_periodic_check()

    def _schedule_periodic_check(self) -> None:
        self._periodic_unsub = async_call_later(
            self._runtime.hass, self.ZERO_FLOW_GRACE_S, self._periodic_check
        )
        self._unsubs.append(self._periodic_unsub)

    def stop(self) -> float:
        self._integrate(dt_util.utcnow())
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        return self.liters

    def _integrate(self, now: datetime) -> None:
        if self._last_at is not None:
            minutes = (now - self._last_at).total_seconds() / 60
            self.liters += self._last_lpm * minutes
        self._last_at = now

    @callback
    def _on_state(self, _event: Event[EventStateChangedData]) -> None:
        now = dt_util.utcnow()
        self._integrate(now)
        self._last_lpm = self._read()
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        self._check_range(now)

    @callback
    def _periodic_check(self, _now: Any) -> None:
        """Recurring guard: supply failure mid-run and steady-sensor volume.

        A sensor that stops emitting events would otherwise defeat both the
        zero-flow detection (only checked once) and the volume target (only
        checked in the state callback).
        """
        self._integrate(dt_util.utcnow())
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        delta = self.liters - self._liters_at_last_check
        self._liters_at_last_check = self.liters
        if delta < self.ZERO_FLOW_EPSILON_L:
            self._on_no_flow()
            return
        self._schedule_periodic_check()

    def _check_range(self, now: datetime) -> None:
        expected = self._expected_lpm()
        if expected is None or self._range_notified:
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
        if zone.config.restrictions is not None:
            return zone.config.restrictions
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
        expected_open = {self._runtime.zones[zone_id].valve.entity_id for zone_id in self._active}
        master = self._runtime.hub.master_valve
        if master is not None and self._master_open:
            expected_open.add(master)

        if is_open and entity_id not in expected_open:
            self._trigger_manual_abort(REASON_FOREIGN_VALVE)
        elif is_closed and entity_id in expected_open:
            self._trigger_manual_abort(REASON_MANUAL)

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
        watering_result, liters, elapsed_min = await self._water(segment, zone, allowed_min)

        # Close with confirmation and one retry (always, whatever happened).
        close_ok = await self._close_valve(valve)
        self._clear_active(segment)
        self._last_zone = segment.zone_id
        runtime.add_consumption(zone, liters, minutes=elapsed_min)

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
            self._record(segment, RESULT_INTERRUPTED, REASON_NO_FLOW, minutes=allowed_min)
            await runtime.notify_anomaly(
                f"No flow detected while watering {segment.run.zone_name}; cycle interrupted."
            )
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
    ) -> tuple[str, float, float]:
        """Run the watering wait; returns (result, liters, elapsed_minutes)."""
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
        sensor = self._runtime.flow_sensor_for(zone)
        if sensor is not None:
            monitor = FlowMonitor(
                self._runtime,
                sensor,
                volume_target_l=segment.run.volume_l,
                expected_lpm=self._runtime.expected_flow_range,
                on_no_flow=lambda: _finish("no_flow"),
                on_volume_reached=lambda: _finish("done"),
            )
            monitor.start()

        started = dt_util.utcnow()
        try:
            await self._race(future)
        finally:
            unsub_timer()
        liters = monitor.stop() if monitor is not None else 0.0
        elapsed_min = (dt_util.utcnow() - started).total_seconds() / 60
        if self._abort.is_set() or not future.done():
            return "aborted", liters, elapsed_min
        return future.result(), liters, elapsed_min

    async def _close_valve(self, valve: ValveController) -> bool:
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
