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
    closed_l: float = 0.0,
) -> DailyLitres:
    """Add litres to one key on one day, returning a new dict.

    ``est`` latches true: a day that mixes measured and estimated litres is not
    wholly measured, and reporting it as measured would be the plausible-but-
    false number this feature exists to remove.

    ``closed_l`` is the subset of ``liters`` seen while every managed valve
    reported closed. It is the only part leak detection reads, so it is an
    explicit parameter accumulated exactly like ``l`` and ``gap_s`` -- never a
    field callers patch onto the returned dict after the fact.

    ``gap_s`` accumulates the same way, clamped at zero: seconds of that day
    in which the meter could not be read while this key was the one the litres
    would have gone to, summed across every call. It is fed from
    ``MeterSample`` -- elapsed minus measured -- by the accountant, which
    decides whose gap it is exactly as it decides whose litres. So ``0.0``
    says "nothing unreadable was attributed to this key", not "this day was
    fully observed": a zone idle through an outage keeps a clean ``gap_s``
    while UNATTRIBUTED_KEY carries the seconds. A gap carries no litres by
    construction, so a call with ``liters == 0`` and a positive ``gap_s`` is
    ordinary rather than a no-op.
    """
    updated: DailyLitres = {existing_day: dict(keys) for existing_day, keys in daily.items()}
    day_record = updated.setdefault(day, {})
    entry = dict(day_record.get(key, {"l": 0.0, "est": False, "gap_s": 0.0, "closed_l": 0.0}))
    entry["l"] = float(entry["l"]) + max(liters, 0.0)
    entry["est"] = bool(entry["est"]) or estimated
    entry["gap_s"] = float(entry["gap_s"]) + max(gap_s, 0.0)
    entry["closed_l"] = float(entry.get("closed_l", 0.0)) + max(closed_l, 0.0)
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


def sum_period(daily: DailyLitres, start: date, end: date, *, key: str | None = None) -> float:
    """Attributed litres over an inclusive day range.

    Across every zone by default, or one zone alone when ``key`` names it. The
    two readings are different questions -- the budget spends the whole
    account, a per-zone sensor reports its own row -- and both must be the
    same slice of the same daily history, or a zone's "this month" would
    contradict the "today" printed beside it.

    Unattributed water is excluded on purpose: it is not watering, and letting
    it into the budget would let a leak suspend irrigation.
    """
    first, last = start.isoformat(), end.isoformat()
    total = 0.0
    for day, keys in daily.items():
        if day < first or day > last:
            continue
        for entry_key, entry in keys.items():
            if entry_key == UNATTRIBUTED_KEY or (key is not None and entry_key != key):
                continue
            total += float(entry.get("l", 0.0))
    return total


def daily_series(daily: DailyLitres, key: str, start: date, end: date) -> list[dict[str, Any]]:
    """One record per day across an inclusive range -- the zeros included.

    Dense, not sparse, and that is the point. The stored history has no record
    for a day on which a key booked neither litres nor gap seconds, so an
    absence there means "nothing happened". A reader must be able to tell that
    apart from a day whose meter could not be read, which *does* have a record,
    carrying zero litres and a positive ``gap_s`` -- a gap is booked as zero
    litres on purpose, since interpolating would invent water and counting a
    zero would assert that none passed. Emitting the zeros makes the two shapes
    comparable at a glance instead of leaving every consumer to reconstruct the
    calendar, which one of them would get wrong.

    ``closed_l`` rides along only for UNATTRIBUTED_KEY: it is the only key that
    accumulates it, and the only figure leak detection reads. ``est`` is
    omitted there for the mirror reason -- water no zone claimed was never
    estimated from a nominal rate.

    Rounding happens here rather than in storage: litres to millilitres, which
    is exact for any real meter, and gap seconds to a tenth. A dense series can
    run to thousands of points, and float tails on every one of them are
    payload nobody reads.
    """
    unattributed = key == UNATTRIBUTED_KEY
    series: list[dict[str, Any]] = []
    day = start
    while day <= end:
        entry = daily.get(day.isoformat(), {}).get(key, {})
        record: dict[str, Any] = {
            "date": day.isoformat(),
            "l": round(float(entry.get("l", 0.0)), 3),
        }
        record["gap_s"] = round(float(entry.get("gap_s", 0.0)), 1)
        if unattributed:
            record["closed_l"] = round(float(entry.get("closed_l", 0.0)), 3)
        else:
            record["est"] = bool(entry.get("est", False))
        series.append(record)
        day += timedelta(days=1)
    return series


def keys_in_range(daily: DailyLitres, start: date, end: date) -> set[str]:
    """Every key that booked litres or gap seconds in an inclusive range.

    Includes UNATTRIBUTED_KEY, which callers filter out when they want zones.
    Used to find zones that hold water in the history but are no longer
    configured -- their litres stay on the books when the zone is removed, for
    the same reason ``drop_zone`` leaves them there.
    """
    first, last = start.isoformat(), end.isoformat()
    return {key for day, keys in daily.items() if first <= day <= last for key in keys}
