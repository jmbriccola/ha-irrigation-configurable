"""Cadence helper, season windows and forbidden time windows (§1).

From 2.0.0 restrictions constrain HOURS only — which days a zone waters is
decided by each program's calendar (see engine/calendar.py). Keeping a second
weekday/parity mechanism here is what let two schedules silently cancel each
other out, so it is deliberately absent rather than merely unused. Queued or
retried work slides to the first allowed slot, and a running cycle must never
overrun into a forbidden window (it is truncated instead).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from enum import StrEnum

from .model import EngineError

_MAX_SEARCH_DAYS = 366


class Parity(StrEnum):
    """Odd/even day-of-month watering scheme."""

    ODD = "odd"
    EVEN = "even"


@dataclass(frozen=True, slots=True)
class TimeWindow:
    """A forbidden time-of-day window: start inclusive, end exclusive.

    A window whose end is not after its start wraps past midnight
    (e.g. 22:00-06:00).
    """

    start: time
    end: time

    def contains(self, value: time) -> bool:
        if self.start == self.end:
            return False
        if self.start < self.end:
            return self.start <= value < self.end
        return value >= self.start or value < self.end


@dataclass(frozen=True, slots=True)
class CalendarRestrictions:
    """Hub-wide watering-ordinance limits. Hours only (see the module docstring)."""

    forbidden_windows: tuple[TimeWindow, ...] = field(default_factory=tuple)


def is_due(last_completed: date | None, today: date, interval_days: int) -> bool:
    """Cadence check per calendar day.

    Due when at least ``interval_days`` calendar days passed since the last
    day with a completed cycle. A skipped day keeps the zone due, so it
    retries on following days until it completes.

    A cycle completed today ESTABLISHES today as a watering day rather than
    closing it: the zone stays due so its remaining cycles of the day still
    run (§1). The cadence counts days between watering days, not between
    cycles. Only scheduled runs write the marker, so a manual run never
    establishes a day.

    A marker in the future (clock skew, a timezone change, a restored older
    store) is treated the same way instead of yielding a negative day count
    that would freeze the zone silently and permanently; the next completed
    cycle rewrites it to today, so the anomaly self-heals.
    """
    if last_completed is None:
        return True
    if last_completed >= today:
        return True
    return (today - last_completed).days >= max(interval_days, 1)


def in_season(month: int, months: frozenset[int]) -> bool:
    """Whether the month falls in the active season."""
    return month in months


def time_allowed(value: time, windows: tuple[TimeWindow, ...]) -> bool:
    """Whether a time of day is outside every forbidden window."""
    return not any(window.contains(value) for window in windows)


def next_allowed_start(start: datetime, restrictions: CalendarRestrictions) -> datetime:
    """First instant at or after ``start`` where a cycle may begin.

    Slides out of forbidden windows (to the window end, re-checking the
    landing day). Raises
    EngineError if nothing is allowed within a year — a configuration that
    forbids everything must surface, not spin.
    """
    candidate = start
    deadline = start + timedelta(days=_MAX_SEARCH_DAYS)
    while candidate <= deadline:
        blocking = next(
            (w for w in restrictions.forbidden_windows if w.contains(candidate.time())),
            None,
        )
        if blocking is None:
            return candidate
        landing_day = candidate.date()
        if blocking.end <= candidate.time():  # wrapping window: end is tomorrow
            landing_day += timedelta(days=1)
        candidate = datetime.combine(landing_day, blocking.end, tzinfo=candidate.tzinfo)
    raise EngineError("no_allowed_slot_within_a_year")


def max_run_minutes(
    start: datetime, restrictions: CalendarRestrictions, *, requested_min: int
) -> int:
    """Longest run (minutes) from ``start`` that stays out of forbidden windows.

    0 when the start itself is inside a window; otherwise the requested
    duration, shortened to end exactly at the first window boundary it would
    cross.
    """
    if not time_allowed(start.time(), restrictions.forbidden_windows):
        return 0
    allowed = requested_min
    for minutes in range(1, requested_min + 1):
        instant = start + timedelta(minutes=minutes)
        if not time_allowed(instant.time(), restrictions.forbidden_windows):
            allowed = minutes
            break
    return min(allowed, requested_min)


def split_soak(duration_min: int, *, max_run_min: int | None) -> tuple[int, ...]:
    """Split a watering duration into cycle-and-soak runs.

    Returns the sequence of run lengths; the soak pause between them is the
    cycle's configured pause. Without a max run length the duration is a
    single run.
    """
    if duration_min <= 0:
        return ()
    if max_run_min is None or duration_min <= max_run_min:
        return (duration_min,)
    full_runs, remainder = divmod(duration_min, max_run_min)
    runs = [max_run_min] * full_runs
    if remainder:
        runs.append(remainder)
    return tuple(runs)
