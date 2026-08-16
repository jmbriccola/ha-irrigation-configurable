# History API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the water history the component already holds, and start holding a run history it does not, through two read-only services the Lovelace cards will be built on.

**Architecture:** Pure arithmetic in `engine/runlog.py` (new) and one added function in `engine/metering.py`, both with no Home Assistant imports and no clock. A second `Store` (`RunLogStore` in `storage.py`) keeps the run log out of the hot state file. `IrrigationRuntime.record_run_outcome` — already the single funnel for every recorded outcome — gains one append. Two `SupportsResponse.ONLY` services read, filter and shape.

**Tech Stack:** Python 3.13 syntax (ruff target py313) type-checked at 3.14, Home Assistant 2026.7.2, voluptuous, pytest + pytest-homeassistant-custom-component, freezegun.

**Spec:** [`docs/superpowers/specs/2026-08-16-history-api-design.md`](../specs/2026-08-16-history-api-design.md) — read it alongside this plan; it carries the reasoning this plan only executes.

## Global Constraints

- **The decision engine is not touched.** `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py` must be byte-identical at the end. Hashes are recorded in Task 0 and verified in Task 7.
- **Code, comments and docstrings in English.** Translations complete in `translations/en.json` **and** `translations/it.json` — `tests/test_translations.py` fails on drift.
- **Italian terminology is fixed at coinage, in every file at once** (3.2.1 / 3.4.0 rule): *storico dei consumi* (water series), *storico delle esecuzioni* (run log), *acqua non attribuita*, *litri stimati* (`est`), *secondi non osservati* (`gap_s`). Quote a control by the words on it, never by a paraphrase or its negation.
- **A new service is two distinct places**: declared in `services.yaml` **and** registered in `services.py`. `tests/components/test_services_yaml.py` enforces that they agree.
- **Everything async, no blocking I/O, no mandatory YAML configuration.**
- **Python 3.13 syntax** for HA 2025.7 compatibility even though mypy parses at 3.14. `from __future__ import annotations` at the top of every module.
- **Run the bare command**: `pyproject.toml` already sets `addopts = "-q"`, so `.venv/bin/pytest -q` prints no summary at all. Always run `.venv/bin/pytest`, never with `-q`.
- **No frontend change.** `custom_components/irrigation_maestro/frontend/` stays untouched, so the CI job asserting the committed bundle matches source passes with no rebuild.

---

### Task 0: Record the engine hashes

**Files:**
- Create: `/tmp/engine-hashes-before.txt` (not committed)

- [ ] **Step 1: Record the four frozen files' hashes**

```bash
cd /home/jmbriccola/projects/ha-irrigation-configurable
sha256sum custom_components/irrigation_maestro/engine/weather.py \
          custom_components/irrigation_maestro/engine/curves.py \
          custom_components/irrigation_maestro/engine/evaluate.py \
          custom_components/irrigation_maestro/engine/history.py \
  | tee /tmp/engine-hashes-before.txt
```

Expected: four lines of output. Keep the file — Task 7 diffs against it.

- [ ] **Step 2: Confirm the branch and a green baseline**

```bash
git branch --show-current   # must print: feat/history-api
.venv/bin/pytest
```

Expected: `feat/history-api`, and the suite passes. If it does not pass here, stop — nothing below can be attributed to this work otherwise.

---

### Task 1: `engine/runlog.py` — pure run-log arithmetic

**Files:**
- Create: `custom_components/irrigation_maestro/engine/runlog.py`
- Test: `tests/engine/test_runlog.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `RETENTION_DAYS: Final = 730`, `MAX_RUNS: Final = 8000`
  - `type RunEntry = dict[str, Any]`
  - `build_entry(*, at: datetime, zone_id: str, zone_name: str, program_id: str, program_name: str | None, result: str, reason_key: str | None, duration_min: int | None, volume_l: float | None, partial: bool, scheduled: bool) -> RunEntry`
  - `append_run(runs: list[RunEntry], entry: RunEntry, *, max_runs: int = MAX_RUNS) -> tuple[list[RunEntry], int]`
  - `prune_runs(runs: list[RunEntry], cutoff: datetime) -> list[RunEntry]`
  - `select_runs(runs: list[RunEntry], *, start_at: datetime, end_at: datetime, zone_ids: frozenset[str] | None = None, results: frozenset[str] | None = None, limit: int) -> tuple[list[RunEntry], bool]`
  - `oldest_at(runs: list[RunEntry]) -> str | None`

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/test_runlog.py`:

```python
"""The run log's arithmetic: what an entry omits, and what the two limits drop."""

from datetime import UTC, datetime, timedelta

from custom_components.irrigation_maestro.engine import runlog


def _at(hour: int, day: int = 16) -> datetime:
    return datetime(2026, 8, day, hour, 0, tzinfo=UTC)


def _entry(hour: int, day: int = 16, **overrides: object) -> runlog.RunEntry:
    fields: dict[str, object] = {
        "at": _at(hour, day),
        "zone_id": "z1",
        "zone_name": "Vasi",
        "program_id": "p1",
        "program_name": "Mattino",
        "result": "completed",
        "reason_key": None,
        "duration_min": 12,
        "volume_l": 40.0,
        "partial": False,
        "scheduled": True,
    }
    fields.update(overrides)
    return runlog.build_entry(**fields)  # type: ignore[arg-type]


def test_an_entry_omits_every_optional_field_that_has_nothing_to_say() -> None:
    """A skip has no duration and no litres; null would cost bytes to say nothing."""
    entry = _entry(6, result="skipped", reason_key="budget_sufficient",
                   duration_min=None, volume_l=None)

    assert entry == {
        "at": "2026-08-16T06:00:00+00:00",
        "zone_id": "z1",
        "zone_name": "Vasi",
        "program_id": "p1",
        "program_name": "Mattino",
        "result": "skipped",
        "reason_key": "budget_sufficient",
        "scheduled": True,
    }


def test_partial_is_stored_only_when_true() -> None:
    assert "partial" not in _entry(6)
    assert _entry(6, partial=True)["partial"] is True


def test_a_program_that_no_longer_exists_records_no_name_rather_than_raising() -> None:
    assert "program_name" not in _entry(6, program_name=None)


def test_append_below_the_cap_drops_nothing() -> None:
    runs, dropped = runlog.append_run([_entry(6)], _entry(7), max_runs=10)

    assert dropped == 0
    assert [run["at"] for run in runs] == [
        "2026-08-16T06:00:00+00:00",
        "2026-08-16T07:00:00+00:00",
    ]


def test_the_cap_drops_from_the_head_and_reports_how_many() -> None:
    """Oldest first, so the survivors are the newest -- and the count is what
    later tells a capped log apart from a young one."""
    runs, dropped = runlog.append_run([_entry(6), _entry(7)], _entry(8), max_runs=2)

    assert dropped == 1
    assert [run["at"] for run in runs] == [
        "2026-08-16T07:00:00+00:00",
        "2026-08-16T08:00:00+00:00",
    ]


def test_prune_keeps_the_boundary_instant_and_drops_what_precedes_it() -> None:
    runs = [_entry(6, day=1), _entry(6, day=10), _entry(6, day=16)]

    kept = runlog.prune_runs(runs, _at(6, day=10))

    assert [run["at"] for run in kept] == [
        "2026-08-10T06:00:00+00:00",
        "2026-08-16T06:00:00+00:00",
    ]


def test_prune_of_an_empty_log_is_empty_not_an_error() -> None:
    assert runlog.prune_runs([], _at(6)) == []


def test_prune_that_removes_everything_returns_an_empty_list() -> None:
    assert runlog.prune_runs([_entry(6, day=1)], _at(6, day=10)) == []


def test_select_is_half_open_so_the_last_local_day_is_included_whole() -> None:
    runs = [_entry(6, day=15), _entry(6, day=16), _entry(6, day=17)]

    selected, truncated = runlog.select_runs(
        runs, start_at=_at(0, day=16), end_at=_at(0, day=17), limit=100
    )

    assert truncated is False
    assert [run["at"] for run in selected] == ["2026-08-16T06:00:00+00:00"]


def test_select_filters_by_zone_and_by_result_together() -> None:
    runs = [
        _entry(6, zone_id="z1", result="completed"),
        _entry(7, zone_id="z1", result="skipped", duration_min=None, volume_l=None),
        _entry(8, zone_id="z2", result="skipped", duration_min=None, volume_l=None),
    ]

    selected, _ = runlog.select_runs(
        runs,
        start_at=_at(0),
        end_at=_at(0, day=17),
        zone_ids=frozenset({"z1"}),
        results=frozenset({"skipped"}),
        limit=100,
    )

    assert [run["at"] for run in selected] == ["2026-08-16T07:00:00+00:00"]


def test_the_limit_keeps_the_most_recent_and_says_so() -> None:
    """Truncating the newest would answer a question nobody asks."""
    runs = [_entry(6), _entry(7), _entry(8)]

    selected, truncated = runlog.select_runs(
        runs, start_at=_at(0), end_at=_at(0, day=17), limit=2
    )

    assert truncated is True
    assert [run["at"] for run in selected] == [
        "2026-08-16T07:00:00+00:00",
        "2026-08-16T08:00:00+00:00",
    ]


def test_a_selection_that_exactly_fills_the_limit_is_not_truncated() -> None:
    selected, truncated = runlog.select_runs(
        [_entry(6), _entry(7)], start_at=_at(0), end_at=_at(0, day=17), limit=2
    )

    assert truncated is False
    assert len(selected) == 2


def test_oldest_at_reads_the_head_and_is_none_for_an_empty_log() -> None:
    assert runlog.oldest_at([]) is None
    assert runlog.oldest_at([_entry(6), _entry(7)]) == "2026-08-16T06:00:00+00:00"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/engine/test_runlog.py`
Expected: collection error — `ModuleNotFoundError: No module named '...engine.runlog'`.

- [ ] **Step 3: Write the implementation**

Create `custom_components/irrigation_maestro/engine/runlog.py`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/engine/test_runlog.py`
Expected: 13 passed.

- [ ] **Step 5: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro/engine/runlog.py tests/engine/test_runlog.py
.venv/bin/ruff format custom_components/irrigation_maestro/engine/runlog.py tests/engine/test_runlog.py
.venv/bin/mypy
```
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/engine/runlog.py tests/engine/test_runlog.py
git commit -m "feat(runlog): the arithmetic of a log that keeps what did not happen

Pure, clock-free, timezone-free -- every boundary is an instant, because
entries stamp UTC and both the retention window and a query's range are
local-calendar questions only the caller can convert.

An entry omits what it has nothing to say about: a skip carries no duration
and no litres, and null would cost bytes to say so. The cap reports how many
it dropped, because that count is the only thing that later tells a truncated
log apart from one that has not been running long -- both have an oldest
entry newer than a caller's requested start."
```

---

### Task 2: `engine/metering.daily_series` — the dense projection

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/metering.py` (append two functions)
- Test: `tests/engine/test_metering.py` (append tests)

**Interfaces:**
- Consumes: `DailyLitres`, `UNATTRIBUTED_KEY` — already in `engine/metering.py`.
- Produces:
  - `daily_series(daily: DailyLitres, key: str, start: date, end: date) -> list[dict[str, Any]]`
  - `keys_in_range(daily: DailyLitres, start: date, end: date) -> set[str]`

- [ ] **Step 1: Write the failing tests**

Append to `tests/engine/test_metering.py`:

```python
def test_the_series_is_dense_so_a_quiet_day_and_a_blind_day_are_different_shapes() -> None:
    """The whole reason gap_s exists: a day with a six-hour hole in the meter
    must not look like a day on which nothing was watered."""
    daily = metering.roll_into_day({}, "2026-08-16", "z1", 40.0, estimated=False, gap_s=0.0)
    daily = metering.roll_into_day(daily, "2026-08-18", "z1", 0.0, estimated=False, gap_s=21600.0)

    series = metering.daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 18))

    assert series == [
        {"date": "2026-08-16", "l": 40.0, "est": False, "gap_s": 0.0},
        {"date": "2026-08-17", "l": 0.0, "est": False, "gap_s": 0.0},
        {"date": "2026-08-18", "l": 0.0, "est": False, "gap_s": 21600.0},
    ]


def test_a_single_day_range_yields_exactly_one_point() -> None:
    series = metering.daily_series({}, "z1", date(2026, 8, 16), date(2026, 8, 16))

    assert series == [{"date": "2026-08-16", "l": 0.0, "est": False, "gap_s": 0.0}]


def test_the_series_carries_the_estimated_latch_through() -> None:
    daily = metering.roll_into_day({}, "2026-08-16", "z1", 40.0, estimated=True, gap_s=0.0)

    assert metering.daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 16))[0]["est"] is True


def test_the_unattributed_series_carries_closed_l_and_no_est() -> None:
    """closed_l is the only figure leak detection reads, and est is meaningless
    for water no zone claimed."""
    daily = metering.roll_into_day(
        {}, "2026-08-16", metering.UNATTRIBUTED_KEY, 5.0,
        estimated=False, gap_s=0.0, closed_l=2.0,
    )

    series = metering.daily_series(
        daily, metering.UNATTRIBUTED_KEY, date(2026, 8, 16), date(2026, 8, 16)
    )

    assert series == [{"date": "2026-08-16", "l": 5.0, "gap_s": 0.0, "closed_l": 2.0}]


def test_the_series_rounds_litres_to_millilitres_and_seconds_to_a_tenth() -> None:
    daily = metering.roll_into_day(
        {}, "2026-08-16", "z1", 1.0 / 3.0, estimated=False, gap_s=1.0 / 3.0
    )

    point = metering.daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 16))[0]

    assert point["l"] == 0.333
    assert point["gap_s"] == 0.3


def test_keys_in_range_reports_every_key_that_booked_anything() -> None:
    daily = metering.roll_into_day({}, "2026-08-16", "z1", 1.0, estimated=False, gap_s=0.0)
    daily = metering.roll_into_day(daily, "2026-08-20", "z2", 1.0, estimated=False, gap_s=0.0)
    daily = metering.roll_into_day(
        daily, "2026-08-16", metering.UNATTRIBUTED_KEY, 1.0, estimated=False, gap_s=0.0
    )

    assert metering.keys_in_range(daily, date(2026, 8, 16), date(2026, 8, 17)) == {
        "z1",
        metering.UNATTRIBUTED_KEY,
    }
```

Add `from datetime import date` to that test file's imports if it is not already there.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/engine/test_metering.py -k "dense or single_day_range or estimated_latch or unattributed_series or millilitres or keys_in_range"`
Expected: FAIL — `AttributeError: module ... has no attribute 'daily_series'`.

- [ ] **Step 3: Write the implementation**

Append to `custom_components/irrigation_maestro/engine/metering.py`:

```python
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
        if unattributed:
            record["gap_s"] = round(float(entry.get("gap_s", 0.0)), 1)
            record["closed_l"] = round(float(entry.get("closed_l", 0.0)), 3)
        else:
            record["est"] = bool(entry.get("est", False))
            record["gap_s"] = round(float(entry.get("gap_s", 0.0)), 1)
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/engine/test_metering.py`
Expected: every test in the file passes, the six new ones included.

- [ ] **Step 5: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro/engine/metering.py tests/engine/test_metering.py
.venv/bin/ruff format custom_components/irrigation_maestro/engine/metering.py tests/engine/test_metering.py
.venv/bin/mypy
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/engine/metering.py tests/engine/test_metering.py
git commit -m "feat(metering): a dense day series, so a blind day is not a quiet day

The stored history is sparse, and an absence there means nothing happened.
A day whose meter could not be read is not an absence -- it has a record,
carrying zero litres and a positive gap_s, because interpolating would
invent water and a counted zero would assert that none passed. Densifying
here makes the two shapes comparable at a glance; leaving it to consumers
means reconstructing a calendar in every one of them, and one gets it wrong.

closed_l rides along for the unattributed key alone, and est does not: water
no zone claimed was never estimated from a nominal rate."
```

---

### Task 3: `RunLogStore` — the second store

**Files:**
- Modify: `custom_components/irrigation_maestro/const.py` (add one constant near `STORAGE_VERSION`, line 258)
- Modify: `custom_components/irrigation_maestro/storage.py` (import `runlog`; append a class)
- Test: `tests/components/test_run_log.py` (new)

**Interfaces:**
- Consumes: `engine.runlog` from Task 1.
- Produces: `storage.RunLogStore` with
  - `__init__(hass: HomeAssistant, entry_id: str)`
  - `async_load() -> None`, `async_save() -> None`, `schedule_save() -> None`
  - `entries -> list[runlog.RunEntry]` (property)
  - `cap_dropped -> int` (property)
  - `oldest_at() -> str | None`
  - `append(entry: runlog.RunEntry) -> None`
  - `prune(cutoff: datetime) -> None`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_run_log.py`:

```python
"""The run log's own store: its own file, its own limits, its own counter."""

from datetime import UTC, datetime

from custom_components.irrigation_maestro.engine import runlog
from custom_components.irrigation_maestro.storage import RunLogStore
from homeassistant.core import HomeAssistant


def _entry(hour: int, day: int = 16) -> runlog.RunEntry:
    return runlog.build_entry(
        at=datetime(2026, 8, day, hour, 0, tzinfo=UTC),
        zone_id="z1",
        zone_name="Vasi",
        program_id="p1",
        program_name="Mattino",
        result="completed",
        reason_key=None,
        duration_min=12,
        volume_l=40.0,
        partial=False,
        scheduled=True,
    )


async def test_a_fresh_store_is_empty_and_has_dropped_nothing(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()

    assert store.entries == []
    assert store.cap_dropped == 0
    assert store.oldest_at() is None


async def test_appending_keeps_append_order(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()

    store.append(_entry(6))
    store.append(_entry(7))

    assert [run["at"] for run in store.entries] == [
        "2026-08-16T06:00:00+00:00",
        "2026-08-16T07:00:00+00:00",
    ]
    assert store.oldest_at() == "2026-08-16T06:00:00+00:00"


def _fill_to_cap(store: RunLogStore) -> None:
    """Seed a full log directly.

    Appending MAX_RUNS entries one at a time would copy the list 8000 times for
    no extra coverage: append_run's own cap behaviour is proved in
    tests/engine/test_runlog.py against a small max_runs. What is under test
    here is that the counter accumulates and persists.
    """
    store._data["runs"] = [
        _entry(0) | {"at": f"2026-08-16T00:{index // 60:02d}:{index % 60:02d}+00:00"}
        for index in range(runlog.MAX_RUNS)
    ]


async def test_the_cap_accumulates_into_a_monotonic_counter(hass: HomeAssistant) -> None:
    """The counter is the only thing that later tells a truncated log apart
    from a young one -- both have an oldest entry newer than a caller's start."""
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    _fill_to_cap(store)

    store.append(_entry(6, day=17))
    store.append(_entry(7, day=17))
    store.append(_entry(8, day=17))

    assert len(store.entries) == runlog.MAX_RUNS
    assert store.cap_dropped == 3


async def test_prune_drops_what_precedes_the_cutoff(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    store.append(_entry(6, day=1))
    store.append(_entry(6, day=16))

    store.prune(datetime(2026, 8, 10, tzinfo=UTC))

    assert [run["at"] for run in store.entries] == ["2026-08-16T06:00:00+00:00"]


async def test_entries_and_the_counter_both_survive_a_reload(hass: HomeAssistant) -> None:
    """cap_dropped must persist, or the truncation flag would go false on
    every reboot."""
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    _fill_to_cap(store)
    store.append(_entry(6, day=17))
    await store.async_save()

    reloaded = RunLogStore(hass, "entry1")
    await reloaded.async_load()

    assert len(reloaded.entries) == runlog.MAX_RUNS
    assert reloaded.cap_dropped == 1


async def test_the_run_log_uses_a_file_of_its_own(hass: HomeAssistant) -> None:
    """Not a section of the state store: that one is rewritten on every meter
    sample, and this series reaches megabytes."""
    store = RunLogStore(hass, "entry1")

    assert store.store_key == "irrigation_maestro.runs.entry1"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_run_log.py`
Expected: `ImportError: cannot import name 'RunLogStore' from ...storage`.

- [ ] **Step 3: Add the storage version constant**

In `custom_components/irrigation_maestro/const.py`, replace:

```python
STORAGE_VERSION: Final = 1
```

with:

```python
STORAGE_VERSION: Final = 1

#: The run log is a second Store with a schema of its own, so it versions on
#: its own. Sharing STORAGE_VERSION would force a bump of one file for a change
#: to the other, and a migration for a schema that did not move.
STORAGE_VERSION_RUNS: Final = 1
```

- [ ] **Step 4: Write the store**

In `custom_components/irrigation_maestro/storage.py`, change the const import:

```python
from .const import DOMAIN, STORAGE_VERSION
```

to:

```python
from .const import DOMAIN, STORAGE_VERSION, STORAGE_VERSION_RUNS
```

and the engine import:

```python
from .engine import history, metering
```

to:

```python
from .engine import history, metering, runlog
```

Then append this class at the end of the file (after `RuntimeState`):

```python
class RunLogStore:
    """Every outcome the component recorded, in a file of its own.

    Deliberately not a section of ``RuntimeState``. That store rewrites its
    whole dict on every ``schedule_save()`` -- a litre-bearing meter sample, a
    session phase transition, a zone toggle, a rain reading, midnight -- and
    this series reaches ~720 KB on a small installation and ~2 MB at the entry
    cap. Appending it there would multiply write amplification on what is
    usually an SD card, for something that changes a handful of times a day.

    The file is not deleted when the config entry is removed, because the state
    store is not either: the integration has no ``async_remove_entry`` at all,
    and deleting one of the two would be the worse of the three available
    behaviours.
    """

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.store_key = f"{DOMAIN}.runs.{entry_id}"
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION_RUNS, self.store_key)
        self._data: dict[str, Any] = {"runs": [], "cap_dropped": 0}

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored is not None:
            self._data = {"runs": [], "cap_dropped": 0, **stored}

    async def async_save(self) -> None:
        await self._store.async_save(self._data)

    def schedule_save(self) -> None:
        """Debounced, like the state store: an outcome is not worth a sync write."""
        self._store.async_delay_save(lambda: self._data, _SAVE_DELAY_S)

    @property
    def entries(self) -> list[runlog.RunEntry]:
        return cast(list[runlog.RunEntry], self._data["runs"])

    @property
    def cap_dropped(self) -> int:
        """How many entries the cap has ever removed.

        Monotonic and persisted, because it is the only thing that tells a
        truncated log apart from a young one: both have an oldest entry newer
        than a caller's requested start, and only this says which. It resetting
        on every reboot would make the truncation flag quietly go false.
        """
        return int(self._data["cap_dropped"])

    def oldest_at(self) -> str | None:
        return runlog.oldest_at(self.entries)

    def append(self, entry: runlog.RunEntry) -> None:
        runs, dropped = runlog.append_run(self.entries, entry)
        self._data["runs"] = runs
        self._data["cap_dropped"] = self.cap_dropped + dropped

    def prune(self, cutoff: datetime) -> None:
        self._data["runs"] = runlog.prune_runs(self.entries, cutoff)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_run_log.py`
Expected: 6 passed.

- [ ] **Step 6: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
```
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/const.py \
        custom_components/irrigation_maestro/storage.py \
        tests/components/test_run_log.py
git commit -m "feat(storage): the run log gets a file of its own

The state store rewrites its whole dict on every schedule_save -- a meter
sample, a phase transition, a toggle, a rain reading, midnight. This series
reaches megabytes. Appending it there would multiply write amplification on
an SD card for something that changes a handful of times a day.

cap_dropped is persisted, not derived: it is the only thing that tells a
truncated log apart from a young one, since both have an oldest entry newer
than a caller's requested start. Resetting it on reboot would make the
truncation flag quietly go false."
```

---

### Task 4: Wire the run log into the runtime

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py` (construct at ~203, load at ~287, append + helper in `record_run_outcome` ~1006, prune in `_midnight` ~3443, save in `async_save_state` ~3458)
- Test: `tests/components/test_run_log.py` (append integration tests)

**Interfaces:**
- Consumes: `storage.RunLogStore`, `engine.runlog` from Tasks 1 and 3.
- Produces: `IrrigationRuntime.run_log: RunLogStore` — every later task reads the log through this attribute.

- [ ] **Step 1: Write the failing tests**

First extend the **imports at the top of** `tests/components/test_run_log.py` —
ruff selects `E`, so `E402` fires on an import below the first statement:

```python
import asyncio

from custom_components.irrigation_maestro.runtime import IrrigationRuntime
from freezegun.api import FrozenDateTimeFactory

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data
```

Then append to the same file:

```python
# ---------------------------------------------------------------------------
# Through the runtime: record_run_outcome is the single writer, and these
# drive it rather than the store, so that claim is what is under test.
# ---------------------------------------------------------------------------


def _runtime(hass: HomeAssistant) -> IrrigationRuntime:
    entry = hass.config_entries.async_entries("irrigation_maestro")[0]
    return entry.runtime_data


async def test_a_completed_run_lands_in_the_log_with_its_minutes_and_litres(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])

    await advance(hass, freezer, 2400, step=10.0)

    entries = _runtime(hass).run_log.entries
    completed = [entry for entry in entries if entry["result"] == "completed"]
    assert completed, f"no completed run recorded, log holds {entries}"
    assert completed[-1]["zone_name"] == "Vasi"
    assert completed[-1]["program_name"] == "Morning"
    assert completed[-1]["scheduled"] is True
    assert "duration_min" in completed[-1]
    assert "reason_key" not in completed[-1]


async def test_a_skip_records_the_reason_the_component_would_otherwise_forget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """outcome_log keeps a bare result string for three days. This is the only
    place the *why* survives."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    # Rain enough to make the budget sufficient: the zone is skipped, not run.
    mock_weather(hass, condition="rainy", temp=14.0)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])

    await advance(hass, freezer, 2400, step=10.0)

    skipped = [
        entry for entry in _runtime(hass).run_log.entries if entry["result"] == "skipped"
    ]
    assert skipped, "no skip recorded"
    assert skipped[-1]["reason_key"]
    assert "duration_min" not in skipped[-1]
    assert "volume_l" not in skipped[-1]


async def test_a_manual_run_is_recorded_as_unscheduled(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59", minutes=1.0)])
    zone_id = next(iter(entry.subentries))

    await hass.services.async_call(
        "irrigation_maestro", "run_zone", {"zone_id": zone_id}, blocking=True
    )
    await advance(hass, freezer, 300, step=10.0)

    entries = _runtime(hass).run_log.entries
    assert entries, "no run recorded"
    assert entries[-1]["scheduled"] is False


async def test_removing_a_zone_leaves_its_runs_with_the_name_it_had(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The daily water history keeps a removed zone's litres for the same
    reason: deleting them would rewrite past months."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])
    zone_id = next(iter(entry.subentries))
    await advance(hass, freezer, 2400, step=10.0)
    before = len(_runtime(hass).run_log.entries)
    assert before > 0

    await hass.services.async_call(
        "irrigation_maestro", "remove_zone", {"zone_id": zone_id}, blocking=True
    )
    await hass.async_block_till_done()

    entries = _runtime(hass).run_log.entries
    assert len(entries) >= before
    assert entries[0]["zone_name"] == "Vasi"


async def test_midnight_prunes_the_run_log(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59", minutes=1.0)])
    runtime = _runtime(hass)
    runtime.run_log.append(
        runlog.build_entry(
            at=datetime(2020, 1, 1, tzinfo=UTC),
            zone_id="gone",
            zone_name="Old",
            program_id="p",
            program_name=None,
            result="completed",
            reason_key=None,
            duration_min=1,
            volume_l=None,
            partial=False,
            scheduled=True,
        )
    )
    assert any(entry["zone_id"] == "gone" for entry in runtime.run_log.entries)

    runtime._midnight(None)
    await asyncio.sleep(0)

    assert not any(entry["zone_id"] == "gone" for entry in runtime.run_log.entries)
```

`park.add("valve.vasi")` is the whole arming step: `MockValvePark.add`
(`tests/components/mocks.py:52`) defaults a `valve.` entity to `"closed"`,
which is what every test in `test_session.py` relies on.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_run_log.py -k "completed_run or skip_records or manual_run or removing_a_zone or midnight_prunes"`
Expected: FAIL — `AttributeError: 'IrrigationRuntime' object has no attribute 'run_log'`.

- [ ] **Step 3: Construct and load the store**

In `custom_components/irrigation_maestro/runtime.py`, change the storage import to include the new class:

```python
from .storage import RunLogStore, RuntimeState
```

(if the existing import reads `from .storage import RuntimeState`; match whatever form is there).

Add the engine import beside the existing engine imports:

```python
from .engine import runlog
```

In `IrrigationRuntime.__init__`, immediately after `self.state = RuntimeState(hass, entry.entry_id)`:

```python
        #: The run log lives in its own Store: see RunLogStore's docstring for
        #: why it is not a section of the one above.
        self.run_log = RunLogStore(hass, entry.entry_id)
```

In `async_setup`, immediately after `await self.state.async_load()`:

```python
        await self.run_log.async_load()
```

- [ ] **Step 4: Append on every recorded outcome**

In `record_run_outcome`, immediately after `self.state.schedule_save()` (the line that follows `set_last_completed`), insert:

```python
        self.run_log.append(
            runlog.build_entry(
                at=now,
                zone_id=zone_id,
                zone_name=zone_name,
                program_id=cycle_id,
                program_name=self._program_name(zone_id, cycle_id),
                result=result,
                reason_key=reason,
                duration_min=minutes,
                volume_l=liters,
                partial=partial,
                scheduled=scheduled,
            )
        )
        self.run_log.schedule_save()
```

Add this helper method to `IrrigationRuntime`, directly below `record_run_outcome`:

```python
    def _program_name(self, zone_id: str, cycle_id: str) -> str | None:
        """The program's display name at the moment it ran, or None if it is gone.

        Denormalised into the entry rather than looked up on read. A removed
        zone keeps its runs -- the daily water history keeps its litres for the
        same reason -- and without the stored name what survives is an
        unreadable subentry id. It is also the more honest name: what the
        program was called then, not what a later program with that id is
        called now. A zone_removed cancellation records the outcome after the
        zone is already gone, which is exactly the None case.
        """
        zone = self.zones.get(zone_id)
        if zone is None:
            return None
        for cycle in zone.config.cycles:
            if cycle.cycle_id == cycle_id:
                return cycle.name
        return None
```

- [ ] **Step 5: Prune at midnight and save on shutdown**

In `_midnight`, after `self.state.prune_water(today)`:

```python
        self.run_log.prune(self._run_retention_cutoff(today))
        self.run_log.schedule_save()
```

Add this helper beside `_midnight`:

```python
    def _run_retention_cutoff(self, today: date) -> datetime:
        """The UTC instant the run-log retention window opens at.

        The window is a local-calendar one and entries stamp UTC, so the
        conversion happens here: engine/runlog.py keeps no timezone, exactly as
        engine/metering.py keeps no clock. start_of_local_day rather than a
        subtraction of hours, so a DST boundary inside the window costs nothing.
        """
        first_kept = today - timedelta(days=runlog.RETENTION_DAYS - 1)
        return dt_util.as_utc(dt_util.start_of_local_day(first_kept))
```

Change `async_save_state` to flush both stores:

```python
    async def async_save_state(self) -> None:
        await self.state.async_save()
        await self.run_log.async_save()
```

`runtime.py:13` currently reads `from datetime import datetime, timedelta`. `_run_retention_cutoff` annotates `today: date`, so change it to:

```python
from datetime import date, datetime, timedelta
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_run_log.py`
Expected: all pass. If `test_a_skip_records_the_reason...` does not produce a skip, adjust the weather mock until it does (a `rainy` condition at a low temperature triggers `precipitation` or `cold_day`); the assertion under test is that *whatever* reason fired is recorded, not which one.

- [ ] **Step 7: Run the whole suite — this touches the hottest path in the component**

Run: `.venv/bin/pytest`
Expected: everything passes. `test_session.py`, `test_leaks.py` and `test_budget.py` all drive `record_run_outcome`; a failure there means the append is throwing on a path the new tests do not reach.

- [ ] **Step 8: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
```
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add custom_components/irrigation_maestro/runtime.py tests/components/test_run_log.py
git commit -m "feat(runtime): record what happened, including what did not

record_run_outcome was already the single funnel for every outcome the
component records -- completions, plan-time skips, session overruns,
interruptions, cancellations -- and it already held every field the log
needs. One append there, and no second writer anywhere: two writers would
be two histories that can disagree.

The program's name is resolved and stored at write time, because a removed
zone keeps its runs and an id alone is unreadable. The retention cutoff is
computed here, where there is a timezone, and passed to the engine as an
instant."
```

---

### Task 5: `get_water_history`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `translations/it.json`
- Modify: `tests/components/test_services_yaml.py`
- Test: `tests/components/test_history_api.py` (new)

**Interfaces:**
- Consumes: `metering.daily_series`, `metering.keys_in_range`, `metering.sum_period`, `metering.RETENTION_DAYS`, `runtime.state.daily_water()`.
- Produces: `_history_range(call) -> tuple[date, date]` and `_retention_floor(today, keep_days) -> date` — Task 6 reuses both. Service name constant `SERVICE_GET_WATER_HISTORY: Final = "get_water_history"`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_history_api.py`:

```python
"""The two history services: what they return, and what they refuse to imply."""

from datetime import timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine import metering
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


async def _hub(hass: HomeAssistant) -> Any:
    park = MockValvePark(hass)
    park.add("valve.vasi")
    park.add("valve.prato")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Vasi", "valve.vasi", at="23:59", order=10),
            zone_data("Prato", "valve.prato", at="23:59", order=20),
        ],
    )
    return entry


def _zone_ids(entry: Any) -> list[str]:
    return list(entry.subentries)


async def _water(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(
        DOMAIN, "get_water_history", data, blocking=True, return_response=True
    )


async def test_the_default_window_is_thirty_inclusive_days_ending_today(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass)

    today = dt_util.now().date()
    assert response["end"] == today.isoformat()
    assert response["start"] == (today - timedelta(days=29)).isoformat()
    assert len(response["zones"][0]["days"]) == 30


async def test_a_configured_zone_with_no_water_is_returned_as_zeros_not_omitted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Omitted would be indistinguishable from a zone that does not exist."""
    freezer.move_to(START)
    entry = await _hub(hass)

    response = await _water(hass)

    returned = {zone["zone_id"] for zone in response["zones"]}
    assert returned == set(_zone_ids(entry))
    assert all(day["l"] == 0.0 for day in response["zones"][0]["days"])


async def test_naming_one_zone_returns_exactly_that_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    first = _zone_ids(entry)[0]

    response = await _water(hass, zone_id=first)

    assert [zone["zone_id"] for zone in response["zones"]] == [first]


async def test_naming_several_zones_returns_those_in_order_then_name(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    ids = _zone_ids(entry)

    response = await _water(hass, zone_id=list(reversed(ids)))

    assert [zone["zone_name"] for zone in response["zones"]] == ["Vasi", "Prato"]


async def test_the_unattributed_row_is_a_sibling_of_the_zones_never_a_member(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Summing the zones must stay the right operation."""
    freezer.move_to(START)
    await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    today = dt_util.now().date()
    runtime.state.add_unattributed("__hub__", 5.0, day=today, valves_closed=True)

    response = await _water(hass)

    assert all(zone["zone_id"] != metering.UNATTRIBUTED_KEY for zone in response["zones"])
    assert sum(zone["total_l"] for zone in response["zones"]) == 0.0
    assert response["unattributed"]["total_l"] == 5.0
    assert response["unattributed"]["closed_l"] == 5.0


async def test_est_and_gap_s_reach_the_response(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 12.0, day=today, estimated=True, gap_s=90.0)

    response = await _water(hass, zone_id=zone_id)

    point = response["zones"][0]["days"][-1]
    assert point["l"] == 12.0
    assert point["est"] is True
    assert point["gap_s"] == 90.0


async def test_a_blind_day_and_a_quiet_day_are_different_records(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 0.0, day=today, estimated=False, gap_s=21600.0)

    response = await _water(hass, zone_id=zone_id)

    blind, quiet = response["zones"][0]["days"][-1], response["zones"][0]["days"][-2]
    assert blind["l"] == 0.0 and blind["gap_s"] == 21600.0
    assert quiet["l"] == 0.0 and quiet["gap_s"] == 0.0


async def test_a_range_older_than_retention_is_clamped_and_declares_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _water(hass, start_date=(today - timedelta(days=900)).isoformat())

    floor = today - timedelta(days=metering.RETENTION_DAYS - 1)
    assert response["truncated_by_retention"] is True
    assert response["start"] == floor.isoformat()
    assert response["oldest_available"] == floor.isoformat()


async def test_a_range_inside_retention_declares_no_truncation(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass)

    assert response["truncated_by_retention"] is False


async def test_include_unattributed_false_omits_the_key_entirely(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An empty object would let a caller read "no unattributed water" from a
    request that never asked."""
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass, include_unattributed=False)

    assert "unattributed" not in response


async def test_a_zone_that_no_longer_exists_keeps_its_water_with_a_null_name(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 30.0, day=today, estimated=False)

    await hass.services.async_call(
        DOMAIN, "remove_zone", {"zone_id": zone_id}, blocking=True
    )
    await hass.async_block_till_done()
    response = await _water(hass)

    gone = [zone for zone in response["zones"] if zone["zone_id"] == zone_id]
    assert gone and gone[0]["zone_name"] is None
    assert gone[0]["total_l"] == 30.0
    assert response["zones"][-1]["zone_id"] == zone_id  # unconfigured sorts last


async def test_a_future_end_date_is_clamped_to_today(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _water(hass, end_date=(today + timedelta(days=10)).isoformat())

    assert response["end"] == today.isoformat()


async def test_a_backwards_range_is_refused_rather_than_silently_swapped(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A caller with its arguments the wrong way round has a bug, and quietly
    fixing it hides the bug."""
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    with pytest.raises(ServiceValidationError):
        await _water(
            hass,
            start_date=today.isoformat(),
            end_date=(today - timedelta(days=5)).isoformat(),
        )


async def test_an_installation_with_no_zones_answers_rather_than_raising(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    await setup_hub(hass, [])

    response = await _water(hass)

    assert response["zones"] == []
    assert response["unattributed"]["total_l"] == 0.0
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_history_api.py`
Expected: FAIL — `Service irrigation_maestro.get_water_history not found`.

- [ ] **Step 3: Add the service to `services.py`**

`services.py` imports nothing from `datetime` today. Add a new import line (ruff's `I` rule will place it; run `ruff format` and let it sort):

```python
from datetime import date, timedelta
```

Add beside the other engine imports:

```python
from .engine import metering
```

Add the attribute and service-name constants beside their neighbours:

```python
SERVICE_GET_WATER_HISTORY: Final = "get_water_history"

ATTR_START_DATE: Final = "start_date"
ATTR_END_DATE: Final = "end_date"
ATTR_INCLUDE_UNATTRIBUTED: Final = "include_unattributed"

#: Both history services default to this many inclusive days ending today. One
#: number on purpose: two services disagreeing about what "the last 30 days"
#: means would put two charts on one screen that do not line up.
_HISTORY_WINDOW_DAYS: Final = 30
```

Add the schema beside the other schemas:

```python
_GET_WATER_HISTORY_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_START_DATE): cv.date,
        vol.Optional(ATTR_END_DATE): cv.date,
        vol.Optional(ATTR_ZONE_ID): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_INCLUDE_UNATTRIBUTED): cv.boolean,
    }
)
```

Add the shared range helpers next to the other module helpers (above the handlers):

```python
def _history_range(call: ServiceCall) -> tuple[date, date]:
    """The inclusive local-day window both history services resolve.

    One implementation on purpose -- see _HISTORY_WINDOW_DAYS. A future
    end_date is clamped to today: neither history can hold tomorrow, and
    answering a future range with zeroes would assert observation of a day that
    has not happened. A backwards range is refused rather than swapped: a
    caller with its arguments the wrong way round has a bug, and quietly fixing
    it hides the bug.
    """
    today = dt_util.now().date()
    end: date = min(call.data.get(ATTR_END_DATE, today), today)
    start: date = call.data.get(ATTR_START_DATE, end - timedelta(days=_HISTORY_WINDOW_DAYS - 1))
    if start > end:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_history_range",
            translation_placeholders={"start": start.isoformat(), "end": end.isoformat()},
        )
    return start, end


def _retention_floor(keep_days: int) -> date:
    """The oldest local day a series can still hold.

    Anchored to today, never to the caller's end_date: the prune runs against
    today, so what the component holds is a window anchored there. A request
    for a range that ended six months ago is still limited by what survived
    until now.
    """
    return dt_util.now().date() - timedelta(days=keep_days - 1)
```

Add the handler beside the other handlers:

```python
async def _async_get_water_history(call: ServiceCall) -> ServiceResponse:
    """The per-zone daily water series, dense, with unattributed water beside it."""
    runtime = _runtime(call.hass)
    start, end = _history_range(call)
    floor = _retention_floor(metering.RETENTION_DAYS)
    truncated = start < floor
    start = max(start, floor)

    daily = runtime.state.daily_water()
    requested = call.data.get(ATTR_ZONE_ID)
    if requested is not None:
        # Not validated against runtime.zones: a removed zone's litres stay on
        # the books, so asking for one by id is a legitimate question.
        zone_ids = list(dict.fromkeys(requested))
    else:
        held = metering.keys_in_range(daily, start, end) - {metering.UNATTRIBUTED_KEY}
        zone_ids = sorted(set(runtime.zones) | held)

    zones = [
        {
            "zone_id": zone_id,
            "zone_name": (
                runtime.zones[zone_id].config.name if zone_id in runtime.zones else None
            ),
            "total_l": round(metering.sum_period(daily, start, end, key=zone_id), 3),
            "days": metering.daily_series(daily, zone_id, start, end),
        }
        for zone_id in zone_ids
    ]
    zones.sort(key=lambda row: _zone_history_sort_key(runtime, str(row["zone_id"])))

    response: dict[str, Any] = {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "retention_days": metering.RETENTION_DAYS,
        "oldest_available": floor.isoformat(),
        "truncated_by_retention": truncated,
        "unit": "L",
        "zones": zones,
    }
    if call.data.get(ATTR_INCLUDE_UNATTRIBUTED, True):
        days = metering.daily_series(daily, metering.UNATTRIBUTED_KEY, start, end)
        response["unattributed"] = {
            "total_l": round(sum(float(day["l"]) for day in days), 3),
            "closed_l": round(sum(float(day["closed_l"]) for day in days), 3),
            "days": days,
        }
    return cast(ServiceResponse, response)


def _zone_history_sort_key(runtime: IrrigationRuntime, zone_id: str) -> tuple[int, int, str]:
    """Configured zones by order then name, then everything else by id.

    The same sort the session queue uses, so a card listing zones in one place
    and charting them in another gets one order. A zone that is no longer
    configured has no order and sorts last rather than at an arbitrary
    position.
    """
    zone = runtime.zones.get(zone_id)
    if zone is None:
        return (1, 0, zone_id)
    return (0, zone.config.order, zone.config.name)
```

Register it inside `async_setup_services`, beside the other response services:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_WATER_HISTORY,
        _async_get_water_history,
        _GET_WATER_HISTORY_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

- [ ] **Step 4: Declare it in `services.yaml`**

Append:

```yaml
get_water_history:
  fields:
    start_date:
      example: "2026-07-18"
      selector:
        date:
    end_date:
      example: "2026-08-16"
      selector:
        date:
    zone_id:
      example: 1b2f3c4d5e6f
      selector:
        text:
          multiple: true
    include_unattributed:
      default: true
      selector:
        boolean:
```

- [ ] **Step 5: Translate it, both locales**

In `translations/en.json`, under `services`:

```json
"get_water_history": {
  "name": "Water history",
  "description": "Returns the daily litres each zone used over a date range, one point per day including the days with none, plus the water no zone claimed. Days on which the meter could not be read are marked with the seconds that went unobserved, so a gap in measurement does not look like a quiet day.",
  "fields": {
    "start_date": {
      "name": "From",
      "description": "First day of the range, included. Defaults to 29 days before the end date. Earlier than the 730 days kept is clamped, and the response says so."
    },
    "end_date": {
      "name": "To",
      "description": "Last day of the range, included. Defaults to today, and a future date is clamped to today."
    },
    "zone_id": {
      "name": "Zones",
      "description": "One or more zones. Left empty, every zone is returned, including zones that were removed but still hold water in the history."
    },
    "include_unattributed": {
      "name": "Include unattributed water",
      "description": "Water a meter measured that no zone claimed. It is returned beside the zones and is never part of their total: it is not consumption."
    }
  }
}
```

In `translations/it.json`, the same key, same field names:

```json
"get_water_history": {
  "name": "Storico dei consumi",
  "description": "Restituisce i litri giornalieri di ogni zona in un intervallo di date, un punto per giorno compresi quelli senza consumo, più l'acqua non attribuita. I giorni in cui il flussometro non era leggibile portano i secondi non osservati, così un buco di misura non somiglia a un giorno tranquillo.",
  "fields": {
    "start_date": {
      "name": "Dal",
      "description": "Primo giorno dell'intervallo, incluso. Se omesso, 29 giorni prima della data finale. Una data più vecchia dei 730 giorni conservati viene riportata al limite, e la risposta lo dichiara."
    },
    "end_date": {
      "name": "Al",
      "description": "Ultimo giorno dell'intervallo, incluso. Se omesso è oggi, e una data futura viene riportata a oggi."
    },
    "zone_id": {
      "name": "Zone",
      "description": "Una o più zone. Lasciato vuoto restituisce ogni zona, comprese quelle rimosse che conservano acqua nello storico."
    },
    "include_unattributed": {
      "name": "Includi l'acqua non attribuita",
      "description": "Acqua misurata dal flussometro che nessuna zona ha reclamato. Viene restituita accanto alle zone e non fa mai parte del loro totale: non è consumo."
    }
  }
}
```

Add to `exceptions` in **both** files:

```json
"invalid_history_range": {
  "message": "The start date ({start}) is after the end date ({end})."
}
```

```json
"invalid_history_range": {
  "message": "La data iniziale ({start}) è successiva alla data finale ({end})."
}
```

- [ ] **Step 6: Add the service to the declare-check**

In `tests/components/test_services_yaml.py`, extend the `@pytest.mark.parametrize` list:

```python
        ("get_water_history", services._GET_WATER_HISTORY_SCHEMA),
```

- [ ] **Step 7: Run the tests**

```bash
.venv/bin/pytest tests/components/test_history_api.py
.venv/bin/pytest tests/components/test_services_yaml.py tests/test_translations.py
```
Expected: all pass.

- [ ] **Step 8: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
```
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_history_api.py \
        tests/components/test_services_yaml.py
git commit -m "feat(services): get_water_history, dense and with the gaps declared

The 730-day daily summary has been held since 3.3.0 and reachable only from
diagnostics. This exposes it, one point per day including the days with
none, because a card must tell a fully observed day with no water apart from
a day whose meter went unread for six hours -- and the second one is exactly
the false reading gap_s exists to prevent.

Unattributed water sits beside the zones, never among them, so summing the
zones stays the right operation. A zone removed after the fact keeps its
litres and comes back with a null name: deleting them would rewrite past
months, which is why drop_zone leaves them alone."
```

---

### Task 6: `get_run_history`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `translations/it.json`
- Modify: `tests/components/test_services_yaml.py`
- Test: `tests/components/test_history_api.py` (append)

**Interfaces:**
- Consumes: `_history_range`, `_retention_floor`, `_HISTORY_WINDOW_DAYS` from Task 5; `runtime.run_log` from Task 4; `runlog.select_runs`, `runlog.RETENTION_DAYS` from Task 1.
- Produces: `SERVICE_GET_RUN_HISTORY: Final = "get_run_history"`.

- [ ] **Step 1: Write the failing tests**

First extend the **imports at the top of** `tests/components/test_history_api.py`
(`E402` again): change `from datetime import timedelta` to
`from datetime import UTC, datetime, timedelta`, and add
`from custom_components.irrigation_maestro.engine import runlog` beside the
existing `metering` import.

Then append to the same file:

```python
# ---------------------------------------------------------------------------
# get_run_history
# ---------------------------------------------------------------------------


async def _runs(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(
        DOMAIN, "get_run_history", data, blocking=True, return_response=True
    )


def _seed(hass: HomeAssistant, *entries: runlog.RunEntry) -> None:
    log = hass.config_entries.async_entries(DOMAIN)[0].runtime_data.run_log
    for entry in entries:
        log.append(entry)


def _run(
    at: datetime, *, zone_id: str = "z1", result: str = "completed", name: str = "Vasi"
) -> runlog.RunEntry:
    return runlog.build_entry(
        at=at,
        zone_id=zone_id,
        zone_name=name,
        program_id="p1",
        program_name="Mattino",
        result=result,
        reason_key=None if result == "completed" else "budget_sufficient",
        duration_min=12 if result == "completed" else None,
        volume_l=40.0 if result == "completed" else None,
        partial=False,
        scheduled=True,
    )


async def test_runs_come_back_oldest_first_so_the_two_series_share_an_axis(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(hass, _run(now - timedelta(hours=2)), _run(now - timedelta(hours=1)))

    response = await _runs(hass)

    assert [entry["at"] for entry in response["runs"]] == sorted(
        entry["at"] for entry in response["runs"]
    )
    assert response["count"] == 2


async def test_a_skip_reports_its_reason_and_null_figures(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    _seed(hass, _run(dt_util.utcnow(), result="skipped"))

    entry = (await _runs(hass))["runs"][0]

    assert entry["result"] == "skipped"
    assert entry["reason_key"] == "budget_sufficient"
    assert entry["duration_min"] is None
    assert entry["volume_l"] is None
    assert entry["partial"] is False


async def test_the_zone_and_result_filters_combine(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(
        hass,
        _run(now - timedelta(hours=3), zone_id="z1", result="completed"),
        _run(now - timedelta(hours=2), zone_id="z1", result="skipped"),
        _run(now - timedelta(hours=1), zone_id="z2", result="skipped"),
    )

    response = await _runs(hass, zone_id="z1", result="skipped")

    assert response["count"] == 1
    assert response["runs"][0]["zone_id"] == "z1"
    assert response["runs"][0]["result"] == "skipped"


async def test_the_limit_keeps_the_most_recent_and_declares_itself(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(hass, *[_run(now - timedelta(hours=hours)) for hours in (5, 4, 3, 2, 1)])

    response = await _runs(hass, limit=2)

    assert response["truncated_by_limit"] is True
    assert response["count"] == 2
    assert response["runs"][-1]["at"] == (now - timedelta(hours=1)).isoformat()


async def test_a_young_log_is_not_reported_as_truncated_by_the_cap(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A fresh install has an oldest entry newer than the requested start and
    has truncated nothing. Only cap_dropped tells the two apart."""
    freezer.move_to(START)
    await _hub(hass)
    _seed(hass, _run(dt_util.utcnow()))

    response = await _runs(hass)

    assert response["truncated_by_cap"] is False
    assert response["oldest_kept"] is not None


async def test_a_capped_log_whose_window_starts_earlier_is_reported_as_truncated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    log = hass.config_entries.async_entries(DOMAIN)[0].runtime_data.run_log
    now = dt_util.utcnow()
    # Seeded directly rather than appended MAX_RUNS times: append_run's cap is
    # proved in tests/engine/test_runlog.py. What matters here is that a log
    # the cap HAS bitten reports differently from one it has not, for a window
    # that starts before the oldest surviving entry.
    log._data["runs"] = [
        _run(now - timedelta(seconds=runlog.MAX_RUNS - index))
        for index in range(runlog.MAX_RUNS)
    ]
    log.append(_run(now))

    response = await _runs(hass, start_date=(dt_util.now().date() - timedelta(days=5)).isoformat())

    assert log.cap_dropped == 1
    assert response["truncated_by_cap"] is True


async def test_an_empty_log_answers_with_a_null_oldest_rather_than_raising(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _runs(hass)

    assert response["runs"] == []
    assert response["count"] == 0
    assert response["oldest_kept"] is None
    assert response["truncated_by_cap"] is False


async def test_a_range_older_than_retention_is_clamped_and_declares_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _runs(hass, start_date=(today - timedelta(days=900)).isoformat())

    assert response["truncated_by_retention"] is True
    assert response["start"] == (
        today - timedelta(days=runlog.RETENTION_DAYS - 1)
    ).isoformat()


async def test_a_run_recorded_before_the_local_offset_is_filed_on_its_local_day(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """00:30 in CEST carries the previous UTC date. Filtering on the raw string
    would file it a day early -- an off-by-one that reads as correct until a
    chart's first or last day is wrong."""
    await hass.config.async_set_time_zone("Europe/Rome")
    freezer.move_to("2026-08-15 22:30:00+00:00")  # 2026-08-16 00:30 local
    await _hub(hass)
    _seed(hass, _run(datetime(2026, 8, 15, 22, 30, tzinfo=UTC)))

    same_day = await _runs(hass, start_date="2026-08-16", end_date="2026-08-16")
    day_before = await _runs(hass, start_date="2026-08-15", end_date="2026-08-15")

    assert same_day["count"] == 1
    assert day_before["count"] == 0


async def test_a_backwards_range_is_refused_here_too(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    with pytest.raises(ServiceValidationError):
        await _runs(
            hass,
            start_date=today.isoformat(),
            end_date=(today - timedelta(days=5)).isoformat(),
        )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_history_api.py -k "runs or skip_reports or filters_combine or limit_keeps or young_log or capped_log or empty_log or local_day or backwards_range_is_refused_here"`
Expected: FAIL — `Service irrigation_maestro.get_run_history not found`.

- [ ] **Step 3: Add the service to `services.py`**

Extend Task 5's import line — `datetime.fromisoformat` is needed to read `oldest_at` back:

```python
from datetime import date, datetime, timedelta
```

Extend the engine import:

```python
from .engine import metering, runlog
```

Add the constants:

```python
SERVICE_GET_RUN_HISTORY: Final = "get_run_history"

ATTR_RESULT: Final = "result"
ATTR_LIMIT: Final = "limit"

#: The four values record_run_outcome can write, and the only ones the filter
#: accepts. They live in session.py as RESULT_*; repeated here as a validation
#: vocabulary rather than imported, because services.py importing session.py
#: would be a new dependency for a tuple of four strings.
_RUN_RESULTS: Final = ("completed", "skipped", "interrupted", "cancelled")

_RUN_HISTORY_LIMIT: Final = 500
_RUN_HISTORY_MAX_LIMIT: Final = 5000
```

Add the schema:

```python
_GET_RUN_HISTORY_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_START_DATE): cv.date,
        vol.Optional(ATTR_END_DATE): cv.date,
        vol.Optional(ATTR_ZONE_ID): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_RESULT): vol.All(cv.ensure_list, [vol.In(_RUN_RESULTS)]),
        vol.Optional(ATTR_LIMIT): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=_RUN_HISTORY_MAX_LIMIT)
        ),
    }
)
```

Add the handler:

```python
async def _async_get_run_history(call: ServiceCall) -> ServiceResponse:
    """Every outcome recorded in a range, skips and their reasons included."""
    runtime = _runtime(call.hass)
    start, end = _history_range(call)
    floor = _retention_floor(runlog.RETENTION_DAYS)
    truncated_retention = start < floor
    start = max(start, floor)

    # The stored instants are UTC; the caller's range is local calendar days.
    # Inclusive [start, end] is exactly [local midnight of start, local
    # midnight of the day after end) -- start_of_local_day rather than a
    # 24-hour subtraction, so a DST boundary inside the window costs nothing.
    start_at = dt_util.as_utc(dt_util.start_of_local_day(start))
    end_at = dt_util.as_utc(dt_util.start_of_local_day(end + timedelta(days=1)))

    zone_ids = call.data.get(ATTR_ZONE_ID)
    results = call.data.get(ATTR_RESULT)
    selected, truncated_limit = runlog.select_runs(
        runtime.run_log.entries,
        start_at=start_at,
        end_at=end_at,
        zone_ids=frozenset(zone_ids) if zone_ids else None,
        results=frozenset(results) if results else None,
        limit=call.data.get(ATTR_LIMIT, _RUN_HISTORY_LIMIT),
    )

    oldest = runtime.run_log.oldest_at()
    # cap_dropped is what tells a truncated log apart from a young one: both
    # have an oldest entry newer than the requested start. The residual is a
    # false warning, never a false all-clear.
    truncated_cap = (
        runtime.run_log.cap_dropped > 0
        and oldest is not None
        and start < dt_util.as_local(datetime.fromisoformat(oldest)).date()
    )

    runs = [
        {
            "at": entry["at"],
            "zone_id": entry["zone_id"],
            "zone_name": entry["zone_name"],
            "program_id": entry["program_id"],
            "program_name": entry.get("program_name"),
            "result": entry["result"],
            "reason_key": entry.get("reason_key"),
            "duration_min": entry.get("duration_min"),
            "volume_l": entry.get("volume_l"),
            "partial": bool(entry.get("partial", False)),
            "scheduled": bool(entry["scheduled"]),
        }
        for entry in selected
    ]

    return cast(
        ServiceResponse,
        {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "retention_days": runlog.RETENTION_DAYS,
            "oldest_kept": oldest,
            "truncated_by_retention": truncated_retention,
            "truncated_by_cap": truncated_cap,
            "truncated_by_limit": truncated_limit,
            "count": len(runs),
            "runs": runs,
        },
    )
```

Register it:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_RUN_HISTORY,
        _async_get_run_history,
        _GET_RUN_HISTORY_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

- [ ] **Step 4: Declare it in `services.yaml`**

Append:

```yaml
get_run_history:
  fields:
    start_date:
      example: "2026-07-18"
      selector:
        date:
    end_date:
      example: "2026-08-16"
      selector:
        date:
    zone_id:
      example: 1b2f3c4d5e6f
      selector:
        text:
          multiple: true
    result:
      selector:
        select:
          multiple: true
          options:
            - completed
            - skipped
            - interrupted
            - cancelled
    limit:
      default: 500
      selector:
        number:
          min: 1
          max: 5000
          mode: box
```

- [ ] **Step 5: Translate it, both locales**

`translations/en.json`, under `services`:

```json
"get_run_history": {
  "name": "Run history",
  "description": "Returns every outcome recorded in a date range — the runs that completed and, just as importantly, the ones that were skipped, interrupted or cancelled, each with the reason. A cycle that does not start leaves no trace anywhere else.",
  "fields": {
    "start_date": {
      "name": "From",
      "description": "First day of the range, included. Defaults to 29 days before the end date. Earlier than the 730 days kept is clamped, and the response says so."
    },
    "end_date": {
      "name": "To",
      "description": "Last day of the range, included. Defaults to today, and a future date is clamped to today."
    },
    "zone_id": {
      "name": "Zones",
      "description": "One or more zones. Left empty, every zone is returned, including zones that were removed but still have runs in the log."
    },
    "result": {
      "name": "Results",
      "description": "Keep only these outcomes. Left empty, every outcome is returned."
    },
    "limit": {
      "name": "Maximum entries",
      "description": "At most this many entries, keeping the most recent. The response says whether it had to."
    }
  }
}
```

`translations/it.json`:

```json
"get_run_history": {
  "name": "Storico delle esecuzioni",
  "description": "Restituisce ogni esito registrato in un intervallo di date — le irrigazioni completate e, non meno importante, quelle saltate, interrotte o annullate, ciascuna con il suo motivo. Un ciclo che non parte non lascia traccia da nessun'altra parte.",
  "fields": {
    "start_date": {
      "name": "Dal",
      "description": "Primo giorno dell'intervallo, incluso. Se omesso, 29 giorni prima della data finale. Una data più vecchia dei 730 giorni conservati viene riportata al limite, e la risposta lo dichiara."
    },
    "end_date": {
      "name": "Al",
      "description": "Ultimo giorno dell'intervallo, incluso. Se omesso è oggi, e una data futura viene riportata a oggi."
    },
    "zone_id": {
      "name": "Zone",
      "description": "Una o più zone. Lasciato vuoto restituisce ogni zona, comprese quelle rimosse che conservano esecuzioni nello storico."
    },
    "result": {
      "name": "Esiti",
      "description": "Tiene solo questi esiti. Lasciato vuoto restituisce ogni esito."
    },
    "limit": {
      "name": "Numero massimo di voci",
      "description": "Al massimo questo numero di voci, tenendo le più recenti. La risposta dichiara se ha dovuto tagliare."
    }
  }
}
```

- [ ] **Step 6: Add the service to the declare-check**

In `tests/components/test_services_yaml.py`, extend the parametrize list again:

```python
        ("get_run_history", services._GET_RUN_HISTORY_SCHEMA),
```

- [ ] **Step 7: Run the tests**

```bash
.venv/bin/pytest tests/components/test_history_api.py tests/components/test_services_yaml.py tests/test_translations.py
```
Expected: all pass.

- [ ] **Step 8: Lint and type-check**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
```
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_history_api.py \
        tests/components/test_services_yaml.py
git commit -m "feat(services): get_run_history, where the non-events are

Two services and not the one the brief asked for: one row per day per zone
against one row per event, different filters, different natural windows. A
card drawing twelve months of consumption does not want two thousand run
records riding along.

The range is converted to instants here, where there is a timezone. A run
recorded at 00:30 local carries the previous UTC date, and filtering on the
raw string would file it a day early -- the kind of off-by-one that reads as
correct until a chart's first or last day is wrong."
```

---

### Task 7: Diagnostics, docs, version, and the verification the branch is judged on

**Files:**
- Modify: `custom_components/irrigation_maestro/diagnostics.py`
- Modify: `docs/design/card-contract.md`
- Modify: `custom_components/irrigation_maestro/manifest.json`
- Modify: `CHANGELOG.md`
- Modify: `docs/it/istruzioni.md`, `docs/it/guida-rapida.md`
- Test: `tests/components/test_diagnostics.py` (append)

**Interfaces:**
- Consumes: `runtime.run_log` from Task 4.
- Produces: nothing further.

- [ ] **Step 1: Write the failing diagnostics test**

Append to `tests/components/test_diagnostics.py`. That file already imports
`async_get_config_entry_diagnostics`, `MockValvePark`, and `START` /
`mock_weather` / `setup_hub` / `zone_data` from `.test_session`; add these three
to its imports:

```python
from datetime import timedelta

from custom_components.irrigation_maestro.engine import runlog
from homeassistant.util import dt as dt_util
```

Then append:

```python
async def test_diagnostics_carries_a_bounded_tail_of_the_run_log(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The full series would bury everything else -- the same reasoning the
    water daily history already gets in this file."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    log = entry.runtime_data.run_log
    now = dt_util.utcnow()
    for index in range(60):
        log.append(
            runlog.build_entry(
                at=now - timedelta(minutes=60 - index),
                zone_id="z1",
                zone_name="Vasi",
                program_id="p1",
                program_name="Mattino",
                result="completed",
                reason_key=None,
                duration_min=1,
                volume_l=None,
                partial=False,
                scheduled=True,
            )
        )

    payload = await async_get_config_entry_diagnostics(hass, entry)

    assert payload["run_log"]["count"] == 60
    assert len(payload["run_log"]["recent"]) == 50
    assert payload["run_log"]["oldest_kept"] is not None
    assert payload["run_log"]["newest"] == payload["run_log"]["recent"][-1]["at"]
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.venv/bin/pytest tests/components/test_diagnostics.py -k run_log`
Expected: FAIL — `KeyError: 'run_log'`.

- [ ] **Step 3: Add the diagnostics section**

In `custom_components/irrigation_maestro/diagnostics.py`, add beside `_water_daily_summary`:

```python
#: A diagnostics payload is read at a glance. The run log runs to thousands of
#: entries, and dumping it would bury the configuration, the leak state and the
#: notification verdict under a series nobody scrolls to -- the same reasoning
#: _water_daily_summary already gets, one section up.
_RUN_LOG_TAIL: Final = 50


def _run_log_summary(runtime: Any) -> dict[str, Any]:
    """Counts, the boundaries, and the most recent entries."""
    entries = runtime.run_log.entries
    return {
        "count": len(entries),
        "cap_dropped": runtime.run_log.cap_dropped,
        "oldest_kept": runtime.run_log.oldest_at(),
        "newest": entries[-1]["at"] if entries else None,
        "recent": entries[-_RUN_LOG_TAIL:],
    }
```

Add `from typing import Any, Final` (extend the existing `typing` import) and add the key to the payload, beside `"runtime_state"`:

```python
        "run_log": _run_log_summary(runtime),
```

- [ ] **Step 4: Run it to verify it passes**

Run: `.venv/bin/pytest tests/components/test_diagnostics.py`
Expected: all pass.

- [ ] **Step 5: Extend `docs/design/card-contract.md`**

In the "Services (domain `irrigation_maestro`)" table, add two rows:

```markdown
| `get_water_history` | `start_date`, `end_date` (dates, optional), `zone_id` (string or list, optional), `include_unattributed` (bool, default true); supports response ONLY |
| `get_run_history` | `start_date`, `end_date` (dates, optional), `zone_id` (string or list, optional), `result` (one or more of `completed`/`skipped`/`interrupted`/`cancelled`, optional), `limit` (1–5000, default 500); supports response ONLY |
```

Then add a new `### History services` subsection immediately after the "Configuration services" subsection, carrying the two response shapes exactly as §4.2 and §5.3 of the spec give them, plus these five statements a card author must not have to infer:

1. Both windows default to the last 30 inclusive local days, both clamp a future `end_date` to today, both refuse a backwards range with `invalid_history_range`, and both anchor the retention floor to **today** rather than to `end_date`.
2. The water series is **dense**: one point per day, zeros included. `l: 0, gap_s: 0` is a fully observed dry day; `l: 0, gap_s > 0` is a day the meter could not be read and **must not be drawn as a dry day**; a date outside `[oldest_available, end]` is unknown.
3. `unattributed` is a sibling of `zones` and is **never** part of their sum. `closed_l` on its days is the subset measured with every managed valve shut — the only figure leak detection reads.
4. A zone that is no longer configured is returned with `zone_name: null` and sorts last. Its water and its runs stay on the books; nothing is deleted when a zone is removed.
5. `truncated_by_retention` means the caller asked for more than the component ever keeps; `truncated_by_cap` means this installation produces more runs than the log holds at once. They are different sentences and a card should not merge them.

- [ ] **Step 6: Extend the Italian guides**

Add a short section to `docs/it/istruzioni.md` and a one-line mention in `docs/it/guida-rapida.md`, both callable from Strumenti per sviluppatori → Azioni. Use the fixed terminology and no other: **storico dei consumi** (`get_water_history`), **storico delle esecuzioni** (`get_run_history`), **acqua non attribuita**, **litri stimati**, **secondi non osservati**, **flussometro**. Quote each field by the label the translation gives it — *Dal*, *Al*, *Zone*, *Esiti*, *Numero massimo di voci*, *Includi l'acqua non attribuita* — never by a paraphrase and never by its negation.

- [ ] **Step 7: Bump the version and write the changelog**

`custom_components/irrigation_maestro/manifest.json`: `"version": "3.5.0"`.

Add a `## [3.5.0] - 2026-08-16` section at the top of `CHANGELOG.md`, below the header block, matching the prose style of the 3.4.0 section: what the two services return, why the run log is a separate store, why the water series is dense, that unattributed water is never summed into the zones, that a removed zone keeps its history, and that the log starts empty at upgrade because there is nothing honest to backfill it from.

- [ ] **Step 8: Verify the engine is untouched**

```bash
sha256sum -c /tmp/engine-hashes-before.txt
git diff --stat main -- custom_components/irrigation_maestro/engine/weather.py \
                        custom_components/irrigation_maestro/engine/curves.py \
                        custom_components/irrigation_maestro/engine/evaluate.py \
                        custom_components/irrigation_maestro/engine/history.py
```
Expected: four `OK` lines, and an empty diff. If either fails, revert those files before going further — the constraint is unconditional.

- [ ] **Step 9: Verify the frontend bundle was not disturbed**

```bash
git diff --stat main -- custom_components/irrigation_maestro/frontend/
```
Expected: empty. The CI job `card` asserts this.

- [ ] **Step 10: Full verification — evidence before assertions**

```bash
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/mypy
.venv/bin/pytest
```
Expected: all four clean. Read the actual output; do not claim a pass you have not seen.

- [ ] **Step 11: Commit**

```bash
git add custom_components/irrigation_maestro/diagnostics.py \
        custom_components/irrigation_maestro/manifest.json \
        docs/design/card-contract.md docs/it/istruzioni.md docs/it/guida-rapida.md \
        CHANGELOG.md tests/components/test_diagnostics.py
git commit -m "feat: 3.5.0 — the history API the cards are built on

Diagnostics gets a bounded tail rather than the series, for the reason
already written in that file for the water history: a payload read at a
glance must not bury the configuration under something nobody scrolls to.

card-contract.md carries both response shapes and the five statements a card
author must not have to infer -- above all that a day with gap_s > 0 is not
a dry day, which is the whole reason the series is dense."
```

- [ ] **Step 12: Re-run the mutation matrix against the shipped tree**

This is the last step, not the step after the code each mutation was written for — a mutation proof holds only against the tree it ran on, and six went quiet across 3.4.0 with no two sharing a cause. After the matrix, **byte-compare against the pre-mutation snapshot**: a timeout once left a gutted function in `runtime.py` and not one of 733 tests failed, because that mutation's kills lived in tests that had already run.

```bash
cp -r custom_components /tmp/pre-mutation-snapshot
# ... run the matrix ...
diff -r custom_components /tmp/pre-mutation-snapshot
```
Expected: no differences. Verify the revert; do not assume it.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §1 second Store, own version, load, save | 3, 4 |
| §1.1 `engine/runlog.py` pure | 1 |
| §2 entry shape, omitted optionals, UTC + local bucketing | 1, 6 |
| §2.1 denormalised names, removed zone keeps runs | 1, 4 |
| §2.2 `scheduled` | 1, 4 |
| §2.3 one writer | 4 |
| §3 730-day prune, `MAX_RUNS`, `cap_dropped`, three flags | 1, 3, 4, 6 |
| §3.1 shared date semantics | 5 (`_history_range`, `_retention_floor`), 6 (reuse) |
| §4 `get_run_history` fields, order, limit, `count` | 6 |
| §5 `get_water_history` fields, dense series, response | 2, 5 |
| §5.4 unattributed sibling, `closed_l`, omit on false | 2, 5 |
| §5.5 removed zones, `zone_name: null`, sort last | 5 |
| §6 two services | 5, 6 |
| §7 diagnostics bounded | 7 |
| §8 touch points | all |
| §9 no next-run-gates, no frontend, no backfill | 7 (steps 8–9) |
| §10 tests | 1, 2, 3, 4, 5, 6, 7 |

No gaps.

**Placeholder scan:** every step carries the code it asks for. The two lookups an earlier draft left to the implementer are resolved: `MockValvePark.add` (`mocks.py:52`, defaults a `valve.` entity to `"closed"`) and the diagnostics test's imports, both now written out. The changelog, the `card-contract.md` subsection and the Italian-guide prose (Task 7 Steps 5–7) are the only free-writing steps; each carries its required content as a numbered list and its fixed vocabulary.

**Type consistency:** `RunLogStore.entries` is the property name in Tasks 3, 4, 6 and 7 (never `runs`, which is the raw dict key). `IrrigationRuntime.run_log` is the attribute name in Tasks 4, 6 and 7. `runlog.build_entry` takes the same eleven keyword arguments everywhere it appears. `select_runs` returns `(list, bool)` and is unpacked as such in Task 6. `_history_range` returns `(date, date)` and `_retention_floor` takes `keep_days` only, matching both call sites.

**Import lines are exact, not "add what is missing".** `services.py` imports nothing from `datetime` today (Task 5 adds a line, Task 6 extends it); `runtime.py:13` has `datetime, timedelta` and needs `date` added (Task 4); `diagnostics.py:5` has `Any` and needs `Final` (Task 7). Test-file imports go at the top because ruff selects `E`, and `E402` fires on anything below the first statement.

**Checked against the running code rather than assumed:** `cv.date` returns a `datetime.date` on the pinned HA 2026.7.2; `MockValvePark.add` defaults a `valve.` entity to `"closed"`; and `setup_hub(hass, [])` sets up cleanly with no zones, which is what the empty-installation test in Task 5 depends on.
