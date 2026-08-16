"""Pure run-log arithmetic: what an outcome records, and what the limits drop.

No Home Assistant imports and no clock of its own -- the caller passes both the
instant and the cutoff, exactly as engine.metering does. The wiring lives in
storage.py and runtime.py.

The log is a flat list in append order, oldest first. A prune is a slice, the
entry cap is a slice, and a range query is a filter; a day-keyed map would buy
nothing and would make "the 500 most recent" awkward.

Entries stamp UTC while both the retention window and a query's range are
local-calendar questions, so every boundary this module takes is an *instant*.
Converting a local day to one is the caller's job, and it is the caller that
has a timezone -- the same division of labour that keeps engine.metering free
of a clock.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Final

#: Aligned with engine.metering.RETENTION_DAYS so the two series a card draws
#: cover the same period and a chart cannot have half its history missing.
RETENTION_DAYS: Final = 730

#: Retention alone does not bound the file: 730 days times an installation's
#: run rate is unbounded in the run rate. 8000 entries is roughly 2 MB, the
#: absolute worst case; it never bites below eleven recorded outcomes a day, so
#: a small installation keeps the full window and never meets it.
MAX_RUNS: Final = 8000

type RunEntry = dict[str, Any]


def build_entry(
    *,
    at: datetime,
    zone_id: str,
    zone_name: str,
    program_id: str,
    program_name: str | None,
    result: str,
    reason_key: str | None,
    duration_min: int | None,
    volume_l: float | None,
    partial: bool,
    scheduled: bool,
) -> RunEntry:
    """One entry, omitting every optional field that has nothing to say.

    A skip has no duration and no litres, and writing them as ``null`` would
    cost roughly 15% of the file to say nothing. Readers use ``.get()``, so
    absent and null mean the same thing and both mean "this run has no such
    figure". ``partial`` is written only when true, for the same reason.

    ``at`` is serialised as given: the caller stamps UTC (``dt_util.utcnow()``,
    exactly as ``last_outcome`` already does), and this module neither converts
    nor assumes.
    """
    entry: RunEntry = {
        "at": at.isoformat(),
        "zone_id": zone_id,
        "zone_name": zone_name,
        "program_id": program_id,
        "result": result,
        "scheduled": scheduled,
    }
    if program_name is not None:
        entry["program_name"] = program_name
    if reason_key is not None:
        entry["reason_key"] = reason_key
    if duration_min is not None:
        entry["duration_min"] = duration_min
    if volume_l is not None:
        entry["volume_l"] = volume_l
    if partial:
        entry["partial"] = True
    return entry


def append_run(
    runs: list[RunEntry], entry: RunEntry, *, max_runs: int = MAX_RUNS
) -> tuple[list[RunEntry], int]:
    """Append one entry, dropping from the head when the cap is reached.

    Returns the new list and how many entries the cap removed on this call, so
    the caller can keep a monotonic count. That count is the only thing that
    tells a truncated log apart from one that has simply not been running long:
    both have an oldest entry newer than a caller's requested start, and only
    the count says which.
    """
    appended = [*runs, entry]
    if len(appended) <= max_runs:
        return appended, 0
    dropped = len(appended) - max_runs
    return appended[dropped:], dropped


def prune_runs(runs: list[RunEntry], cutoff: datetime) -> list[RunEntry]:
    """Drop entries recorded before ``cutoff``.

    A cutoff *instant*, not a date: entries stamp UTC while the retention
    window is a local-calendar one, and only the caller knows the zone. The
    list is append-ordered, so the survivors are a suffix.
    """
    for index, entry in enumerate(runs):
        if datetime.fromisoformat(str(entry["at"])) >= cutoff:
            return runs[index:]
    return []


def select_runs(
    runs: list[RunEntry],
    *,
    start_at: datetime,
    end_at: datetime,
    zone_ids: frozenset[str] | None = None,
    results: frozenset[str] | None = None,
    limit: int,
) -> tuple[list[RunEntry], bool]:
    """Entries in ``[start_at, end_at)``, filtered, with the newest kept.

    The window is a half-open instant range because the caller's question is a
    local-calendar one: the inclusive local days ``[start, end]`` are exactly
    the instants from the local start of ``start`` up to, and not including,
    the local start of the day after ``end``. Doing that conversion in the
    caller keeps this module free of a timezone, and makes a DST boundary a
    ``start_of_local_day`` problem rather than a subtraction of 24 hours that
    is wrong twice a year.

    Returns the selection in chronological order and whether ``limit`` bit.
    When it does, the *most recent* survive: truncating the newest would answer
    a question nobody asks.
    """
    selected = [
        entry
        for entry in runs
        if start_at <= datetime.fromisoformat(str(entry["at"])) < end_at
        and (zone_ids is None or entry["zone_id"] in zone_ids)
        and (results is None or entry["result"] in results)
    ]
    if len(selected) <= limit:
        return selected, False
    return selected[-limit:], True


def oldest_at(runs: list[RunEntry]) -> str | None:
    """The ``at`` of the oldest entry, or ``None`` for an empty log."""
    return str(runs[0]["at"]) if runs else None
