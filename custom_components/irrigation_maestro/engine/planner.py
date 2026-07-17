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

from .curves import Curve, CurveKind, curve_value
from .model import EngineParams, SessionEvaluation, SkipReason
from .scheduling import CalendarRestrictions, day_allowed, is_due, split_soak


@dataclass(frozen=True, slots=True)
class CycleSpec:
    """A cycle due at the current trigger, as seen by the planner."""

    cycle_id: str
    enabled: bool
    curve: Curve
    soak_max_run_min: int | None = None
    soak_pause_min: int = 0
    months_override: frozenset[int] | None = None
    volume_safety_timeout_min: int | None = None


@dataclass(frozen=True, slots=True)
class ZoneSpec:
    """A zone with the cycles due at the current trigger."""

    zone_id: str
    name: str
    enabled: bool
    order: int
    adjustment_pct: float
    interval_days: int
    season_months: frozenset[int] | None
    restrictions: CalendarRestrictions | None
    last_completed: date | None
    suspended_until: datetime | None
    paused_until: datetime | None
    skip_today: bool
    has_flow_meter: bool
    cycles: tuple[CycleSpec, ...]


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


def _zone_gate(
    params: EngineParams,
    zone: ZoneSpec,
    restrictions: CalendarRestrictions,
    now: datetime,
) -> SkipReason | None:
    """Zone-level eligibility, in reporting priority order."""
    if not zone.enabled:
        return SkipReason.ZONE_DISABLED
    if zone.suspended_until is not None and zone.suspended_until > now:
        return SkipReason.SUSPENDED
    if zone.paused_until is not None and zone.paused_until > now:
        return SkipReason.PAUSED
    if zone.skip_today:
        return SkipReason.SKIP_TODAY_REQUESTED
    if not day_allowed(now.date(), restrictions):
        return SkipReason.CALENDAR_RESTRICTED
    if not is_due(zone.last_completed, now.date(), zone.interval_days):
        return SkipReason.NOT_DUE
    return None


def _cycle_target(
    cycle: CycleSpec,
    zone: ZoneSpec,
    weighted_temp: float,
    duration_factor: float,
) -> tuple[int, int | None, int]:
    """Frozen (duration_min, volume_l, safety_timeout_min) for one cycle."""
    value = curve_value(cycle.curve, weighted_temp, zone.adjustment_pct)
    target = max(round(value * duration_factor), 1)
    if cycle.curve.kind is CurveKind.VOLUME and zone.has_flow_meter:
        timeout = cycle.volume_safety_timeout_min or target  # minutes fallback
        return target, target, timeout
    if cycle.curve.kind is CurveKind.VOLUME:
        # Degradation: volume cycle without a usable meter runs as a plain
        # duration cycle for its safety timeout (documented in the matrix).
        duration = cycle.volume_safety_timeout_min or target
        return duration, None, duration
    return target, None, target


def build_session_plan(
    params: EngineParams,
    evaluation: SessionEvaluation,
    zones: list[ZoneSpec],
    *,
    global_restrictions: CalendarRestrictions,
    now: datetime,
    duration_factor: float = 1.0,
) -> SessionPlan:
    """Build the frozen plan for one session."""
    runs: list[tuple[int, str, str, PlannedRun]] = []
    skipped: list[SkippedCycle] = []

    for zone in zones:
        restrictions = zone.restrictions if zone.restrictions is not None else (global_restrictions)
        zone_months = zone.season_months if zone.season_months is not None else params.season_months
        zone_reason = _zone_gate(params, zone, restrictions, now)

        for cycle in zone.cycles:
            months = cycle.months_override if cycle.months_override is not None else zone_months
            reason: SkipReason | None
            if zone_reason is not None:
                reason = zone_reason
            elif not cycle.enabled:
                reason = SkipReason.CYCLE_DISABLED
            elif now.month not in months:
                reason = SkipReason.OUT_OF_SEASON
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
                cycle, zone, evaluation.weighted_temp, duration_factor
            )
            planned = PlannedRun(
                zone_id=zone.zone_id,
                zone_name=zone.name,
                cycle_id=cycle.cycle_id,
                duration_min=duration,
                volume_l=volume,
                runs=split_soak(duration, max_run_min=cycle.soak_max_run_min),
                soak_pause_min=cycle.soak_pause_min,
                safety_timeout_min=timeout,
            )
            runs.append((zone.order, zone.name.casefold(), zone.zone_id, planned))

    runs.sort(key=lambda item: item[:3])
    return SessionPlan(
        evaluation=evaluation,
        runs=tuple(item[3] for item in runs),
        skipped=tuple(skipped),
    )
