"""Date-keyed daily history for temperature maxima and rain counters.

Values are keyed by the ISO date they belong to, so "midnight rotation" is not
an operation at all: after midnight the same mapping simply reads shifted, and
a restart can never corrupt or double-rotate the window. Old keys are pruned.

All functions are pure: they return new mappings and never mutate inputs.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta

from .model import EngineParams

type DailyHistory = Mapping[str, float]


def record_temp_max(history: DailyHistory, day: date, value: float) -> dict[str, float]:
    """Record an observed temperature, keeping the daily maximum."""
    key = day.isoformat()
    current = history.get(key)
    updated = dict(history)
    updated[key] = value if current is None else max(current, value)
    return updated


def add_rain(history: DailyHistory, day: date, mm: float, *, cap: float) -> dict[str, float]:
    """Accumulate rain for a day, clamped to [0, cap]."""
    key = day.isoformat()
    updated = dict(history)
    updated[key] = min(max(history.get(key, 0.0) + max(mm, 0.0), 0.0), cap)
    return updated


def commit_staged_rain(
    history: DailyHistory, day: date, *, staging_mm: float, params: EngineParams
) -> dict[str, float]:
    """Commit the staged hourly forecast at the staged weight (never full weight:
    forecast-only rain is an estimate, not a measurement)."""
    return add_rain(
        history,
        day,
        staging_mm * params.staged_rain_weight,
        cap=params.daily_rain_cap_mm,
    )


def prune_history(history: DailyHistory, today: date, *, keep_days: int = 4) -> dict[str, float]:
    """Drop entries older than the evaluation window (today plus keep_days - 1)."""
    cutoff = (today - timedelta(days=keep_days - 1)).isoformat()
    return {key: value for key, value in history.items() if key >= cutoff}


def day_values_for_evaluation(
    history: DailyHistory, today: date
) -> tuple[float | None, float | None, float | None, float | None]:
    """The (d-3, d-2, d-1, today) values; missing days are None, never 0."""
    return (
        history.get((today - timedelta(days=3)).isoformat()),
        history.get((today - timedelta(days=2)).isoformat()),
        history.get((today - timedelta(days=1)).isoformat()),
        history.get(today.isoformat()),
    )
