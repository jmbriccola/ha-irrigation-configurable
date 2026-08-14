"""Pure metering arithmetic: how flow becomes litres, and how long we keep them.

No Home Assistant imports and no clock of its own -- the caller passes both the
elapsed interval and today's date, exactly as engine.history does. The wiring
lives in accounting.py.

The daily structure is a two-level dict, ISO day -> key -> record, where a key
is either a zone id or UNATTRIBUTED_KEY. It is pruned to RETENTION_DAYS so it
survives whatever purge_keep_days the user has set on the recorder without
growing forever.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Final

RETENTION_DAYS: Final = 730
UNATTRIBUTED_KEY: Final = "__unattributed__"
HUB_SCOPE: Final = "__hub__"

type DailyLitres = dict[str, dict[str, Any]]


def accumulate(last_lpm: float, elapsed_s: float) -> float:
    """Litres over one interval, left-Riemann: the rate held since the last sample.

    Both inputs are clamped at zero. A meter reporting backwards and a clock
    that steps back are both real, and neither may remove water already counted
    from a monotonic total.
    """
    return max(last_lpm, 0.0) * max(elapsed_s, 0.0) / 60.0


def roll_into_day(
    daily: DailyLitres,
    day: str,
    key: str,
    liters: float,
    *,
    estimated: bool,
    gap_s: float,
) -> DailyLitres:
    """Add litres to one key on one day, returning a new dict.

    ``est`` latches true: a day that mixes measured and estimated litres is not
    wholly measured, and reporting it as measured would be the plausible-but-
    false number this feature exists to remove.
    """
    updated: DailyLitres = {existing_day: dict(keys) for existing_day, keys in daily.items()}
    day_record = updated.setdefault(day, {})
    entry = dict(day_record.get(key, {"l": 0.0, "est": False, "gap_s": 0.0}))
    entry["l"] = float(entry["l"]) + max(liters, 0.0)
    entry["est"] = bool(entry["est"]) or estimated
    entry["gap_s"] = float(entry["gap_s"]) + max(gap_s, 0.0)
    day_record[key] = entry
    return updated


def prune_daily(daily: DailyLitres, today: date, *, keep_days: int = RETENTION_DAYS) -> DailyLitres:
    """Drop days older than the retention window.

    ISO-string comparison against a cutoff, like the outcome-log prune in
    storage.py, rather than engine.history.prune_history, which is typed for
    flat date->float histories.
    """
    cutoff = (today - timedelta(days=keep_days - 1)).isoformat()
    return {day: keys for day, keys in daily.items() if day >= cutoff}


def sum_period(daily: DailyLitres, start: date, end: date) -> float:
    """Attributed litres over an inclusive day range, across every zone.

    Unattributed water is excluded on purpose: it is not watering, and letting
    it into the budget would let a leak suspend irrigation.
    """
    first, last = start.isoformat(), end.isoformat()
    total = 0.0
    for day, keys in daily.items():
        if day < first or day > last:
            continue
        for key, entry in keys.items():
            if key == UNATTRIBUTED_KEY:
                continue
            total += float(entry.get("l", 0.0))
    return total
