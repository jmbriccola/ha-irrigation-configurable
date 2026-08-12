"""Session planner: gates, ordering and frozen durations.

Given the session evaluation and the zone/cycle specifications due at a
trigger, the planner decides which cycles run and freezes their durations —
the queue never re-evaluates mid-session (§3). Every cycle that does not run
leaves a skip reason, so the sentinel and the per-zone outcome sensors always
have something to report.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

from .calendar import ProgramCalendar, calendar_allows
from .curves import Curve, CurveKind, curve_value
from .model import EngineParams, SessionEvaluation, SkipReason
from .scheduling import split_soak
from .semantic import ANCHORS, points_from_semantic

_DEFAULT_VOLUME_TIMEOUT_MIN = 30


@dataclass(frozen=True, slots=True)
class CycleSpec:
    """A cycle due at the current trigger, as seen by the planner."""

    cycle_id: str
    enabled: bool
    curve: Curve
    calendar: ProgramCalendar = field(default_factory=ProgramCalendar.daily)
    season_months: frozenset[int] | None = None
    last_completed: date | None = None
    soak_max_run_min: int | None = None
    soak_pause_min: int = 0
    volume_safety_timeout_min: int | None = None
    day_minutes: dict[int, int] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ZoneSpec:
    """A zone with the cycles due at the current trigger."""

    zone_id: str
    name: str
    enabled: bool
    order: int
    adjustment_pct: float
    suspended_until: datetime | None
    paused_until: datetime | None
    skip_today: bool
    has_flow_meter: bool
    cycles: tuple[CycleSpec, ...]


def resolve_day_curve(curve: Curve, day_minutes: dict[int, int], weekday: int) -> Curve:
    """The curve to use today: a per-day base rebuilt via the semantic mapping,
    or the original curve unchanged (legacy path — keeps §8 identical)."""
    if curve.kind is CurveKind.VOLUME:
        return curve  # per-day minutes is a duration concept
    base = day_minutes.get(weekday)
    if base is None:
        return curve
    _cool, mild, hot = ANCHORS
    heat = round(curve_value(curve, hot) - curve_value(curve, mild))
    return Curve(
        points=points_from_semantic(base, heat),
        min_value=curve.min_value,
        max_value=curve.max_value,
        kind=curve.kind,
    )


@dataclass(frozen=True, slots=True)
class PlannedRun:
    """One frozen zone-cycle run in the session queue."""

    zone_id: str
    zone_name: str
    cycle_id: str
    duration_min: int
    volume_l: int | None
    runs: tuple[int, ...]
    soak_pause_min: int
    safety_timeout_min: int
    order: int = 100  # zone priority; the queue is kept sorted by it


@dataclass(frozen=True, slots=True)
class SkippedCycle:
    zone_id: str
    zone_name: str
    cycle_id: str
    reason: SkipReason


@dataclass(frozen=True, slots=True)
class SessionPlan:
    evaluation: SessionEvaluation
    runs: tuple[PlannedRun, ...] = field(default_factory=tuple)
    skipped: tuple[SkippedCycle, ...] = field(default_factory=tuple)

    def aggregate_skips(self) -> dict[SkipReason, list[str]]:
        """Zone names per skip reason, each zone once — one notification per
        shared reason instead of one per zone."""
        groups: dict[SkipReason, list[str]] = {}
        for item in self.skipped:
            names = groups.setdefault(item.reason, [])
            if item.zone_name not in names:
                names.append(item.zone_name)
        return groups


def _zone_gate(params: EngineParams, zone: ZoneSpec, now: datetime) -> SkipReason | None:
    """Zone-level eligibility, in reporting priority order.

    Calendar decisions belong to the program, not the zone: a zone no longer
    holds a cadence or a season of its own.
    """
    if not zone.enabled:
        return SkipReason.ZONE_DISABLED
    if zone.suspended_until is not None and zone.suspended_until > now:
        return SkipReason.SUSPENDED
    if zone.paused_until is not None and zone.paused_until > now:
        return SkipReason.PAUSED
    if zone.skip_today:
        return SkipReason.SKIP_TODAY_REQUESTED
    return None


def _cycle_target(
    cycle: CycleSpec,
    zone: ZoneSpec,
    weighted_temp: float,
    duration_factor: float,
    weekday: int,
) -> tuple[int, int | None, int]:
    """Frozen (duration_min, volume_l, safety_timeout_min) for one cycle.

    ``duration_min`` is always MINUTES: for volume cycles it is the safety
    timeout (liters are the separate ``volume_l`` target and must never leak
    into the time domain — soak splits, truncation and watchdog all reason
    in minutes).
    """
    day_curve = resolve_day_curve(cycle.curve, cycle.day_minutes, weekday)
    value = curve_value(day_curve, weighted_temp, zone.adjustment_pct)
    target = max(round(value * duration_factor), 1)
    if cycle.curve.kind is CurveKind.VOLUME:
        timeout = cycle.volume_safety_timeout_min or _DEFAULT_VOLUME_TIMEOUT_MIN
        if zone.has_flow_meter:
            return timeout, target, timeout
        # Degradation: volume cycle without a usable meter runs as a plain
        # duration cycle for its safety timeout (documented in the matrix).
        return timeout, None, timeout
    return target, None, target


def build_session_plan(
    params: EngineParams,
    evaluation: SessionEvaluation,
    zones: list[ZoneSpec],
    *,
    now: datetime,
    duration_factor: float = 1.0,
) -> SessionPlan:
    """Build the frozen plan for one session."""
    runs: list[tuple[int, str, str, PlannedRun]] = []
    skipped: list[SkippedCycle] = []

    for zone in zones:
        zone_reason = _zone_gate(params, zone, now)

        for cycle in zone.cycles:
            months = (
                cycle.season_months if cycle.season_months is not None else params.season_months
            )
            reason: SkipReason | None
            if zone_reason is not None:
                reason = zone_reason
            elif not cycle.enabled:
                reason = SkipReason.CYCLE_DISABLED
            elif not calendar_allows(cycle.calendar, now.date(), cycle.last_completed):
                reason = SkipReason.CALENDAR_NOT_TODAY
            elif now.month not in months:
                reason = SkipReason.OUT_OF_SEASON
            elif evaluation.skip_reason is SkipReason.OUT_OF_SEASON:
                # The session-level season check uses the HUB months; this
                # cycle's own months include the current month (zone/cycle
                # season extensions), so re-derive the decision from the
                # already-computed budget instead of inheriting the skip.
                if evaluation.weighted_temp is None:
                    reason = SkipReason.WEATHER_UNAVAILABLE
                elif evaluation.water_budget >= evaluation.skip_threshold:
                    reason = SkipReason.BUDGET_SUFFICIENT
                else:
                    reason = None
            elif evaluation.skip_reason is not None:
                reason = evaluation.skip_reason
            elif evaluation.weighted_temp is None:
                reason = SkipReason.WEATHER_UNAVAILABLE
            else:
                reason = None

            if reason is not None:
                skipped.append(SkippedCycle(zone.zone_id, zone.name, cycle.cycle_id, reason))
                continue

            assert evaluation.weighted_temp is not None
            duration, volume, timeout = _cycle_target(
                cycle, zone, evaluation.weighted_temp, duration_factor, now.weekday()
            )
            # Volume cycles are never soak-split: the target is a single
            # metered quantity, and splitting would deliver it once per slice.
            soak_max = None if volume is not None else cycle.soak_max_run_min
            planned = PlannedRun(
                zone_id=zone.zone_id,
                zone_name=zone.name,
                cycle_id=cycle.cycle_id,
                duration_min=duration,
                volume_l=volume,
                runs=split_soak(duration, max_run_min=soak_max),
                soak_pause_min=cycle.soak_pause_min,
                safety_timeout_min=timeout,
                order=zone.order,
            )
            runs.append((zone.order, zone.name.casefold(), zone.zone_id, planned))

    runs.sort(key=lambda item: item[:3])
    return SessionPlan(
        evaluation=evaluation,
        runs=tuple(item[3] for item in runs),
        skipped=tuple(skipped),
    )
