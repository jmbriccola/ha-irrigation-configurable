# Unified Schedule Model — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the program the single owner of *when* a zone waters, with exactly one calendar mode, so conflicting schedules become impossible to express rather than something to detect.

**Architecture:** A new pure-engine module owns a discriminated-union calendar (`weekdays` | `interval` | `parity`) and one predicate `calendar_allows()`. The planner's zone gate drops `is_due` and `day_allowed` and the program loop calls that single predicate. `last_completed` moves from per-zone to per-program. A config-entry migration (v1 → v2) rewrites every zone/program and raises repair issues wherever it had to drop a constraint it could not express.

**Tech Stack:** Python 3.13+, Home Assistant custom integration, `pytest` + `pytest-homeassistant-custom-component`, `freezegun`, `ruff`. Frontend is Lit + TypeScript in `card/`, built with `vitest` for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-12-unified-schedule-model-design.md`

## Global Constraints

- Code, comments, docstrings and README in **English**. UI strings go in **both** `translations/en.json` and `translations/it.json`.
- **No changes to the weather decision engine** — weights, thresholds, budget, curves are field-validated and out of scope.
- Everything async, **no blocking I/O**, no YAML configuration.
- The **§8 regression suite** (`tests/engine/test_evaluate.py`) must stay green and untouched.
- Entity **`unique_id`s must not change** — only display names and translation keys. Existing automations must survive.
- Run the full suite with `.venv/bin/python -m pytest -q -p no:logging` and lint with `.venv/bin/python -m ruff check . && .venv/bin/python -m ruff format --check .` before every commit.
- Target version **2.0.0** (breaking). Bump `manifest.json` only in the final task.
- Frontend tests: `cd card && npm test`. Frontend build: `cd card && npm run build`.

---

## File Structure

**Created**
- `custom_components/irrigation_maestro/engine/calendar.py` — the calendar union and `calendar_allows()`. Pure, no HA imports.
- `custom_components/irrigation_maestro/migration.py` — v1 → v2 config-entry rewrite and the repair issues it raises. Isolated so it can be tested without a running integration.
- `tests/engine/test_calendar.py`
- `tests/components/test_migration.py`
- `card/src/panel/calendar-editor.ts` — the three-mode calendar control.
- `card/src/panel/calendar-editor.test.ts`

**Modified**
- `engine/model.py` — `SkipReason` consolidation.
- `engine/planner.py` — zone gate and program loop.
- `engine/scheduling.py` — `is_due` stays (used by interval mode); `day_allowed` loses its planner caller.
- `models.py` — `CycleConfig` gains `calendar` + `season_months`, loses `days`/`months_override`; `ZoneConfig` loses `interval_days`/`season_months`/`restrictions`.
- `storage.py` — `last_completed` keyed by `zone:program`.
- `runtime.py` — pass per-program marker; write it per program.
- `sensor.py` — `ZoneNextRunSensor` projection.
- `services.py`, `services.yaml` — `set_program_schedule` takes a calendar; `update_zone` drops removed keys.
- `config_flow.py` — drop the removed zone fields.
- `number.py` — remove `ZoneIntervalNumber`.
- `card/src/panel/program-editor.ts`, `program-wizard.ts`, `program-list.ts`, `zone-editor.ts`, `settings-view.ts`, `config-read.ts`, `panel.ts`.
- `translations/en.json`, `translations/it.json`.
- `README.md`, `CHANGELOG.md`, `MEMORY.md`, `manifest.json`.

---

### Task 1: Calendar model

The whole feature rests on this file. It is pure — no HA imports — so it is fast to test and impossible to get entangled with runtime concerns.

**Files:**
- Create: `custom_components/irrigation_maestro/engine/calendar.py`
- Test: `tests/engine/test_calendar.py`

**Interfaces:**
- Consumes: `is_due` from `engine/scheduling.py` (existing signature: `is_due(last_completed: date | None, today: date, interval_days: int) -> bool`).
- Produces:
  - `CalendarMode` (StrEnum): `WEEKDAYS`, `INTERVAL`, `PARITY`
  - `ProgramCalendar` frozen dataclass with `mode`, `days: frozenset[int]`, `interval_days: int`, `parity: Parity | None`
  - `ProgramCalendar.weekdays(days) -> ProgramCalendar`, `.interval(n)`, `.odd()`, `.even()`, `.daily()`
  - `ProgramCalendar.from_config(dict) -> ProgramCalendar`, `.to_config() -> dict`
  - `calendar_allows(calendar: ProgramCalendar, day: date, last_completed: date | None) -> bool`

- [ ] **Step 1: Write the failing tests**

```python
"""Tests for the program calendar: one mode, mutually exclusive."""

from datetime import date

import pytest
from custom_components.irrigation_maestro.engine.calendar import (
    CalendarMode,
    ProgramCalendar,
    calendar_allows,
)
from custom_components.irrigation_maestro.engine.model import EngineError
from custom_components.irrigation_maestro.engine.scheduling import Parity

MON = date(2026, 7, 13)
TUE = date(2026, 7, 14)
WED = date(2026, 7, 15)


class TestWeekdays:
    def test_allows_listed_day(self):
        cal = ProgramCalendar.weekdays({0, 2, 4})
        assert calendar_allows(cal, MON, None)

    def test_blocks_unlisted_day(self):
        cal = ProgramCalendar.weekdays({0, 2, 4})
        assert not calendar_allows(cal, TUE, None)

    def test_daily_allows_everything(self):
        cal = ProgramCalendar.daily()
        assert all(calendar_allows(cal, d, None) for d in (MON, TUE, WED))

    def test_last_completed_is_irrelevant(self):
        # A weekday program runs on its days regardless of when it last ran.
        cal = ProgramCalendar.weekdays({0})
        assert calendar_allows(cal, MON, MON)

    def test_empty_days_rejected(self):
        # A calendar that can never run must not be constructible.
        with pytest.raises(EngineError):
            ProgramCalendar.weekdays(set())


class TestInterval:
    def test_never_run_is_allowed(self):
        assert calendar_allows(ProgramCalendar.interval(3), MON, None)

    def test_blocks_before_interval(self):
        assert not calendar_allows(ProgramCalendar.interval(3), TUE, MON)

    def test_allows_on_interval(self):
        assert calendar_allows(ProgramCalendar.interval(3), date(2026, 7, 16), MON)

    def test_same_day_stays_allowed(self):
        # A completed run establishes the day; it does not close it (v1.3.3).
        assert calendar_allows(ProgramCalendar.interval(3), MON, MON)

    def test_future_marker_does_not_lock_out(self):
        assert calendar_allows(ProgramCalendar.interval(3), MON, WED)

    def test_interval_below_one_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.interval(0)


class TestParity:
    def test_odd_allows_odd_day(self):
        assert calendar_allows(ProgramCalendar.odd(), date(2026, 7, 17), None)

    def test_odd_blocks_even_day(self):
        assert not calendar_allows(ProgramCalendar.odd(), date(2026, 7, 18), None)

    def test_even_allows_even_day(self):
        assert calendar_allows(ProgramCalendar.even(), date(2026, 7, 18), None)


class TestSerialisation:
    @pytest.mark.parametrize(
        "cal",
        [
            ProgramCalendar.weekdays({0, 2, 4}),
            ProgramCalendar.interval(3),
            ProgramCalendar.odd(),
            ProgramCalendar.even(),
            ProgramCalendar.daily(),
        ],
    )
    def test_round_trip(self, cal):
        assert ProgramCalendar.from_config(cal.to_config()) == cal

    def test_stored_shape_is_a_discriminated_union(self):
        assert ProgramCalendar.weekdays({0, 2}).to_config() == {
            "mode": "weekdays",
            "days": [0, 2],
        }
        assert ProgramCalendar.interval(3).to_config() == {
            "mode": "interval",
            "interval_days": 3,
        }
        assert ProgramCalendar.odd().to_config() == {"mode": "parity", "parity": "odd"}

    def test_unknown_mode_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.from_config({"mode": "whenever"})

    def test_foreign_keys_cannot_smuggle_a_second_mode(self):
        # An import or a hand-edited JSON must not produce a hybrid.
        cal = ProgramCalendar.from_config(
            {"mode": "weekdays", "days": [0], "interval_days": 3, "parity": "odd"}
        )
        assert cal.mode is CalendarMode.WEEKDAYS
        assert cal.to_config() == {"mode": "weekdays", "days": [0]}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/engine/test_calendar.py -q -p no:logging`
Expected: collection error — `No module named ...engine.calendar`.

- [ ] **Step 3: Write the implementation**

```python
"""The program calendar: which calendar days a program may run on (§1).

Exactly one mode is active at a time. The mode is stored as a discriminated
union rather than a set of optional fields, so no service call, JSON import or
migration can produce a program with two competing schedules — the ambiguity
that made a weekday grid and a per-zone cadence silently cancel each other out
before 2.0.0.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Any, Self

from .model import EngineError
from .scheduling import Parity, is_due

_ALL_WEEKDAYS = frozenset(range(7))


class CalendarMode(StrEnum):
    """The one active way of choosing watering days."""

    WEEKDAYS = "weekdays"
    INTERVAL = "interval"
    PARITY = "parity"


@dataclass(frozen=True, slots=True)
class ProgramCalendar:
    """Which days a program may run on. Exactly one mode is meaningful."""

    mode: CalendarMode
    days: frozenset[int] = _ALL_WEEKDAYS
    interval_days: int = 1
    parity: Parity | None = None

    @classmethod
    def weekdays(cls, days: set[int] | frozenset[int]) -> Self:
        chosen = frozenset(int(d) for d in days)
        if not chosen:
            raise EngineError("calendar_weekdays_empty")
        if not chosen <= _ALL_WEEKDAYS:
            raise EngineError("calendar_weekdays_out_of_range")
        return cls(mode=CalendarMode.WEEKDAYS, days=chosen)

    @classmethod
    def daily(cls) -> Self:
        return cls(mode=CalendarMode.WEEKDAYS, days=_ALL_WEEKDAYS)

    @classmethod
    def interval(cls, interval_days: int) -> Self:
        if interval_days < 1:
            raise EngineError("calendar_interval_below_one")
        return cls(mode=CalendarMode.INTERVAL, interval_days=int(interval_days))

    @classmethod
    def odd(cls) -> Self:
        return cls(mode=CalendarMode.PARITY, parity=Parity.ODD)

    @classmethod
    def even(cls) -> Self:
        return cls(mode=CalendarMode.PARITY, parity=Parity.EVEN)

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> Self:
        """Build from stored data, ignoring keys foreign to the chosen mode."""
        raw = config.get("mode")
        try:
            mode = CalendarMode(raw)
        except ValueError as err:
            raise EngineError("calendar_unknown_mode") from err
        if mode is CalendarMode.WEEKDAYS:
            return cls.weekdays(config.get("days", _ALL_WEEKDAYS))
        if mode is CalendarMode.INTERVAL:
            return cls.interval(int(config.get("interval_days", 1)))
        try:
            parity = Parity(config["parity"])
        except (KeyError, ValueError) as err:
            raise EngineError("calendar_unknown_parity") from err
        return cls(mode=CalendarMode.PARITY, parity=parity)

    def to_config(self) -> dict[str, Any]:
        """The stored shape: only the keys of the active mode."""
        if self.mode is CalendarMode.WEEKDAYS:
            return {"mode": str(self.mode), "days": sorted(self.days)}
        if self.mode is CalendarMode.INTERVAL:
            return {"mode": str(self.mode), "interval_days": self.interval_days}
        assert self.parity is not None
        return {"mode": str(self.mode), "parity": str(self.parity)}


def calendar_allows(
    calendar: ProgramCalendar, day: date, last_completed: date | None
) -> bool:
    """Whether the program's calendar permits running on ``day``.

    ``last_completed`` is the program's own last watering day and only matters
    in INTERVAL mode. It is per program, not per zone: two programs of the same
    zone each keep their own cadence.
    """
    if calendar.mode is CalendarMode.WEEKDAYS:
        return day.weekday() in calendar.days
    if calendar.mode is CalendarMode.INTERVAL:
        return is_due(last_completed, day, calendar.interval_days)
    return (day.day % 2 == 1) if calendar.parity is Parity.ODD else (day.day % 2 == 0)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/engine/test_calendar.py -q -p no:logging`
Expected: all pass.

- [ ] **Step 5: Run the full suite and lint**

Run: `.venv/bin/python -m pytest -q -p no:logging && .venv/bin/python -m ruff check . && .venv/bin/python -m ruff format --check .`
Expected: 285 passed plus the new tests, lint clean.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/engine/calendar.py tests/engine/test_calendar.py
git commit -m "feat(engine): program calendar as a discriminated union

One mode at a time — weekdays, interval or parity — so a program cannot hold
two competing schedules. from_config ignores keys foreign to the chosen mode,
so an import or a hand-edited store cannot smuggle in a hybrid."
```

---

### Task 2: Consolidate skip reasons

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/model.py:20-53`
- Test: `tests/engine/test_planner.py`

**Interfaces:**
- Produces: `SkipReason.CALENDAR_NOT_TODAY` (silent). Removes `SkipReason.NOT_DUE`, `SkipReason.DAY_NOT_SCHEDULED`, `SkipReason.CALENDAR_RESTRICTED`.

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/test_planner.py`:

```python
class TestSkipReasonConsolidation:
    def test_calendar_not_today_exists_and_is_silent(self):
        assert SkipReason.CALENDAR_NOT_TODAY.silent is True

    def test_superseded_reasons_are_gone(self):
        for name in ("NOT_DUE", "DAY_NOT_SCHEDULED", "CALENDAR_RESTRICTED"):
            assert not hasattr(SkipReason, name), f"{name} should be replaced"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/engine/test_planner.py::TestSkipReasonConsolidation -q -p no:logging`
Expected: FAIL — `CALENDAR_NOT_TODAY` does not exist.

- [ ] **Step 3: Edit the enum**

In `engine/model.py`, delete the `NOT_DUE`, `CALENDAR_RESTRICTED` and `DAY_NOT_SCHEDULED` members and add `CALENDAR_NOT_TODAY = "calendar_not_today"`. In `_SILENT_REASONS`, replace the three removed entries with `SkipReason.CALENDAR_NOT_TODAY`.

- [ ] **Step 4: Run and see the rest of the suite fail loudly**

Run: `.venv/bin/python -m pytest -q -p no:logging`
Expected: failures in `test_planner.py` and `test_session.py` referencing the removed members. That is the point — they pin the old model and Task 4 rewrites them.

- [ ] **Step 5: Commit (suite intentionally red)**

```bash
git add custom_components/irrigation_maestro/engine/model.py tests/engine/test_planner.py
git commit -m "refactor(engine): one calendar skip reason

NOT_DUE, DAY_NOT_SCHEDULED and CALENDAR_RESTRICTED all meant the same thing to
a user — not a watering day. They differed only by which of the three
overlapping mechanisms produced them. Suite is red until Task 4 rewires the
planner."
```

---

### Task 3: Config model

**Files:**
- Modify: `custom_components/irrigation_maestro/models.py:112-260`
- Modify: `custom_components/irrigation_maestro/engine/planner.py:23-56` (`CycleSpec`, `ZoneSpec`)
- Test: `tests/components/test_models.py`

**Interfaces:**
- Consumes: `ProgramCalendar` from Task 1.
- Produces: `CycleConfig.calendar: ProgramCalendar`, `CycleConfig.season_months: frozenset[int] | None`; `CycleSpec.calendar`, `CycleSpec.season_months`; `ZoneSpec` without `interval_days`/`season_months`/`restrictions`/`last_completed`; `CycleSpec.last_completed: date | None`.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_models.py`:

```python
def test_cycle_config_parses_calendar():
    from custom_components.irrigation_maestro.engine.calendar import ProgramCalendar

    cycle = CycleConfig.from_config(
        {
            "id": "c1",
            "name": "Morning",
            "trigger": {"kind": "time", "at": "05:30"},
            "curve": {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0},
            "calendar": {"mode": "weekdays", "days": [0, 2, 4]},
            "season_months": [6, 7, 8],
        },
        {},
    )
    assert cycle.calendar == ProgramCalendar.weekdays({0, 2, 4})
    assert cycle.season_months == frozenset({6, 7, 8})


def test_cycle_config_defaults_to_daily():
    cycle = CycleConfig.from_config(
        {
            "id": "c1",
            "trigger": {"kind": "time", "at": "05:30"},
            "curve": {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0},
        },
        {},
    )
    assert cycle.calendar.mode.value == "weekdays"
    assert cycle.calendar.days == frozenset(range(7))


def test_zone_config_has_no_calendar_fields():
    for removed in ("interval_days", "season_months", "restrictions"):
        assert not hasattr(ZoneConfig, "__dataclass_fields__") or (
            removed not in ZoneConfig.__dataclass_fields__
        ), f"ZoneConfig should no longer own {removed}"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_models.py -q -p no:logging -k "calendar or no_calendar_fields"`
Expected: FAIL — `CycleConfig` has no `calendar`.

- [ ] **Step 3: Edit the dataclasses**

In `models.py`:
- `CycleConfig`: replace `months_override` with `season_months`, delete `days`, add `calendar: ProgramCalendar`. In `from_config`, read `config.get("calendar")` through `ProgramCalendar.from_config` when present, else `ProgramCalendar.daily()`; read `season_months` from `CONF_SEASON_MONTHS`.
- `CycleConfig.to_spec` gains a `last_completed: date | None` keyword and forwards `calendar`, `season_months`, `last_completed`.
- `ZoneConfig`: delete `interval_days`, `season_months`, `restrictions` and their parsing.
- `ZoneConfig.to_spec`: drop the deleted keyword arguments; cycles now carry the calendar.

In `engine/planner.py`:
- `CycleSpec`: delete `days` and `months_override`; add `calendar: ProgramCalendar`, `season_months: frozenset[int] | None = None`, `last_completed: date | None = None`.
- `ZoneSpec`: delete `interval_days`, `season_months`, `restrictions`, `last_completed`.

- [ ] **Step 4: Run the model tests**

Run: `.venv/bin/python -m pytest tests/components/test_models.py -q -p no:logging`
Expected: the new tests pass. Planner tests stay red until Task 4.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/models.py custom_components/irrigation_maestro/engine/planner.py tests/components/test_models.py
git commit -m "refactor(models): the program owns its calendar and season

Zones keep what is genuinely theirs — valve, area, order, flow, adjustment.
Everything that answers 'when' now lives on the program."
```

---

### Task 4: Planner rework

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/planner.py:116-215`
- Test: `tests/engine/test_planner.py`

**Interfaces:**
- Consumes: `calendar_allows` (Task 1), `SkipReason.CALENDAR_NOT_TODAY` (Task 2), the new specs (Task 3).
- Produces: `_zone_gate(params, zone, now) -> SkipReason | None` — note the `restrictions` parameter is gone.

- [ ] **Step 1: Rewrite the planner tests**

In `tests/engine/test_planner.py`, update `make_cycle`/`make_zone` helpers so cycles take `calendar` and `season_months` and zones no longer take `interval_days`/`season_months`/`restrictions`/`last_completed`. Replace `TestMultipleDailyCycles` and the calendar parts of `TestGates`/`TestWeekdayGate` with:

```python
class TestCalendarGate:
    def test_weekday_program_runs_on_its_day(self):
        cycle = make_cycle(calendar=ProgramCalendar.weekdays({4}))  # Friday
        assert plan([make_zone(cycles=(cycle,))]).runs

    def test_weekday_program_skips_other_days(self):
        cycle = make_cycle(calendar=ProgramCalendar.weekdays({0, 1}))
        result = plan([make_zone(cycles=(cycle,))])
        assert not result.runs
        assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY

    def test_interval_program_gates_following_days(self):
        cycle = make_cycle(calendar=ProgramCalendar.interval(3), last_completed=TODAY)
        for offset in (1, 2):
            result = plan([make_zone(cycles=(cycle,))], now=NOW + timedelta(days=offset))
            assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY
        assert plan([make_zone(cycles=(cycle,))], now=NOW + timedelta(days=3)).runs

    def test_two_programs_keep_independent_cadences(self):
        # The v1.3.3 bug must not reappear one level down: the morning program
        # completing today must not consume the evening program's cadence.
        morning = make_cycle("morning", calendar=ProgramCalendar.interval(3), last_completed=TODAY)
        evening = make_cycle("evening", calendar=ProgramCalendar.interval(3), last_completed=None)
        result = plan([make_zone(cycles=(morning, evening))])
        assert [run.cycle_id for run in result.runs] == ["morning", "evening"]

    def test_parity_program(self):
        # NOW is 2026-07-17, an odd day.
        assert plan([make_zone(cycles=(make_cycle(calendar=ProgramCalendar.odd()),))]).runs
        odd_only = make_cycle(calendar=ProgramCalendar.even())
        result = plan([make_zone(cycles=(odd_only,))])
        assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY

    def test_season_is_per_program(self):
        summer = make_cycle("summer", season_months=frozenset({7}))
        winter = make_cycle("winter", season_months=frozenset({1}))
        result = plan([make_zone(cycles=(summer, winter))])
        assert [run.cycle_id for run in result.runs] == ["summer"]
        assert result.skipped[0].reason is SkipReason.OUT_OF_SEASON

    def test_zone_gates_still_win_for_reporting(self):
        zone = make_zone(enabled=False, cycles=(make_cycle(calendar=ProgramCalendar.daily()),))
        assert plan([zone]).skipped[0].reason is SkipReason.ZONE_DISABLED
```

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/python -m pytest tests/engine/test_planner.py -q -p no:logging`
Expected: FAIL — the planner still reads `zone.interval_days`.

- [ ] **Step 3: Rewrite `_zone_gate` and the program loop**

```python
def _zone_gate(params: EngineParams, zone: ZoneSpec, now: datetime) -> SkipReason | None:
    """Zone-level eligibility, in reporting priority order.

    Calendar decisions belong to the program, not the zone.
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
```

In `build_session_plan`, drop the `restrictions` and `zone_months` locals, call `_zone_gate(params, zone, now)`, and in the program loop replace the `cycle.days` and month checks with:

```python
months = cycle.season_months if cycle.season_months is not None else params.season_months
...
elif not cycle.enabled:
    reason = SkipReason.CYCLE_DISABLED
elif not calendar_allows(cycle.calendar, now.date(), cycle.last_completed):
    reason = SkipReason.CALENDAR_NOT_TODAY
elif now.month not in months:
    reason = SkipReason.OUT_OF_SEASON
```

Leave the rest of the chain (the `OUT_OF_SEASON` re-derivation, weather skips) unchanged.

- [ ] **Step 4: Run the planner tests**

Run: `.venv/bin/python -m pytest tests/engine/test_planner.py -q -p no:logging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/engine/planner.py tests/engine/test_planner.py
git commit -m "feat(engine): the program calendar is the only day gate

The zone gate keeps only what is genuinely zone-level. Two programs of one
zone now hold independent cadences, so the 1.3.3 defect cannot reappear a
level down."
```

---

### Task 5: Per-program watering marker

**Files:**
- Modify: `custom_components/irrigation_maestro/storage.py:117-122`, `:180-190`
- Modify: `custom_components/irrigation_maestro/runtime.py:472-485`, `:685-713`
- Test: `tests/components/test_storage.py`, `tests/components/test_session.py`

**Interfaces:**
- Produces: `RuntimeState.last_completed(zone_id, program_id) -> date | None` and `set_last_completed(zone_id, program_id, day)`. Storage key is `f"{zone_id}:{program_id}"`. `drop_zone` clears every key prefixed `f"{zone_id}:"`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_storage.py`:

```python
def test_last_completed_is_per_program(hass):
    state = RuntimeState(hass, "entry")
    state.set_last_completed("zone1", "morning", TODAY)
    assert state.last_completed("zone1", "morning") == TODAY
    assert state.last_completed("zone1", "evening") is None


def test_drop_zone_clears_every_program_marker(hass):
    state = RuntimeState(hass, "entry")
    state.set_last_completed("zone1", "morning", TODAY)
    state.set_last_completed("zone2", "morning", TODAY)
    state.drop_zone("zone1")
    assert state.last_completed("zone1", "morning") is None
    assert state.last_completed("zone2", "morning") == TODAY
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_storage.py -q -p no:logging -k per_program`
Expected: FAIL — `last_completed()` takes one argument.

- [ ] **Step 3: Implement**

```python
    @staticmethod
    def _marker_key(zone_id: str, program_id: str) -> str:
        return f"{zone_id}:{program_id}"

    def last_completed(self, zone_id: str, program_id: str) -> date | None:
        raw = self._data["last_completed"].get(self._marker_key(zone_id, program_id))
        return date.fromisoformat(raw) if raw else None

    def set_last_completed(self, zone_id: str, program_id: str, day: date) -> None:
        self._data["last_completed"][self._marker_key(zone_id, program_id)] = day.isoformat()
```

In `drop_zone`, handle `last_completed` separately from the plain per-zone dicts:

```python
        prefix = f"{zone_id}:"
        self._data["last_completed"] = {
            key: value
            for key, value in self._data["last_completed"].items()
            if not key.startswith(prefix)
        }
```

and remove `"last_completed"` from the list of plain keys it iterates.

In `runtime.py`: `_zone_spec` no longer passes `last_completed` to the zone; each `cycle.to_spec(...)` receives `last_completed=self.state.last_completed(zone.zone_id, cycle.cycle_id)`. In `record_run_outcome`, the write becomes `self.state.set_last_completed(zone_id, cycle_id, today)`.

- [ ] **Step 4: Run storage and session tests**

Run: `.venv/bin/python -m pytest tests/components/test_storage.py tests/components/test_session.py -q -p no:logging`
Expected: PASS after updating the two assertions in `test_session.py` that call `runtime.state.last_completed(zone_id)` to pass the program id.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/storage.py custom_components/irrigation_maestro/runtime.py tests/components/test_storage.py tests/components/test_session.py
git commit -m "feat(storage): watering marker per program

Cadence is now a program property, so the marker that feeds it must be one
too — a shared per-zone marker is what let one program consume another's
cadence."
```

---

### Task 6: Migration v1 → v2

The highest-risk task. It runs once on real installations and cannot be undone.

**Files:**
- Create: `custom_components/irrigation_maestro/migration.py`
- Modify: `custom_components/irrigation_maestro/__init__.py:57-70`
- Modify: `custom_components/irrigation_maestro/config_flow.py:213`
- Test: `tests/components/test_migration.py`

**Interfaces:**
- Produces: `migrate_zone_v1_to_v2(zone_data: dict, hub_restrictions: dict | None) -> tuple[dict, list[MigrationNote]]` and `MigrationNote(kind: str, zone_name: str, program_name: str, detail: dict[str, Any])`. `kind` is one of `cadence_dropped`, `parity_dropped`, `weekdays_dropped`, `program_disabled`, `zone_restrictions_dropped`.

- [ ] **Step 1: Write the failing tests**

```python
"""Migration v1 -> v2: the schedule model rewrite.

The contract is behavioural, not structural: a migrated configuration must
water on the same calendar days as before, or raise a note saying it could not.
"""

from datetime import date, timedelta

import pytest
from custom_components.irrigation_maestro.migration import migrate_zone_v1_to_v2

TODAY = date(2026, 7, 13)  # Monday


def zone_v1(*, interval_days=3, days=None, season=None, programs=1):
    cycles = []
    for index in range(programs):
        cycle = {"id": f"c{index}", "name": f"P{index}", "trigger": {"kind": "time", "at": "05:30"}}
        if days is not None:
            cycle["days"] = sorted(days)
        cycles.append(cycle)
    zone = {"name": "Pots", "valve_entity": "valve.p", "interval_days": interval_days, "cycles": cycles}
    if season is not None:
        zone["season_months"] = sorted(season)
    return zone


def calendars(migrated):
    return [cycle["calendar"] for cycle in migrated["cycles"]]


class TestCalendarChoice:
    def test_grid_wins_over_cadence_and_notes_it(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3, days={0, 2, 4}), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2, 4]}]
        assert [n.kind for n in notes] == ["cadence_dropped"]

    def test_grid_with_daily_cadence_is_not_a_conflict(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1, days={0, 2}), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]
        assert notes == []

    def test_cadence_without_grid_becomes_interval(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3), None)
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]
        assert notes == []

    def test_no_grid_no_cadence_becomes_daily(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 1, 2, 3, 4, 5, 6]}]
        assert notes == []

    def test_all_seven_days_is_not_a_meaningful_grid(self):
        migrated, _ = migrate_zone_v1_to_v2(zone_v1(interval_days=3, days=set(range(7))), None)
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]


class TestHubWeekdays:
    def test_allowed_weekdays_are_intersected_not_dropped(self):
        # Hub allows Mon/Wed/Fri; a daily program must not become daily.
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2, 4]}]
        assert notes == []

    def test_intersection_narrows_an_existing_grid(self):
        migrated, _ = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={0, 1, 2}), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]

    def test_empty_intersection_disables_the_program(self):
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={1, 3}), {"allowed_weekdays": [0, 2, 4]}
        )
        assert migrated["cycles"][0]["enabled"] is False
        assert [n.kind for n in notes] == ["program_disabled"]

    def test_interval_keeps_its_cadence_and_notes_the_dropped_limit(self):
        # "every 3 days but only Mon/Wed/Fri" is inexpressible; keep the water
        # volume, hand the legal decision to the user.
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=3), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]
        assert [n.kind for n in notes] == ["weekdays_dropped"]


class TestHubParity:
    def test_parity_becomes_the_mode_when_no_grid(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1), {"parity": "odd"})
        assert calendars(migrated) == [{"mode": "parity", "parity": "odd"}]
        assert notes == []

    def test_parity_with_a_grid_keeps_the_grid_and_notes_it(self):
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={0, 2}), {"parity": "odd"}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]
        assert [n.kind for n in notes] == ["parity_dropped"]


class TestSeason:
    def test_zone_season_pushes_down_to_programs(self):
        migrated, _ = migrate_zone_v1_to_v2(zone_v1(season={6, 7, 8}), None)
        assert migrated["cycles"][0]["season_months"] == [6, 7, 8]
        assert "season_months" not in migrated

    def test_existing_override_wins_over_the_zone_value(self):
        zone = zone_v1(season={6, 7, 8})
        zone["cycles"][0]["months_override"] = [7]
        migrated, _ = migrate_zone_v1_to_v2(zone, None)
        assert migrated["cycles"][0]["season_months"] == [7]
        assert "months_override" not in migrated["cycles"][0]


class TestRemovedZoneFields:
    def test_calendar_fields_are_gone(self):
        migrated, _ = migrate_zone_v1_to_v2(zone_v1(), None)
        for key in ("interval_days", "season_months", "restrictions"):
            assert key not in migrated

    def test_zone_restrictions_override_is_reported(self):
        zone = zone_v1()
        zone["restrictions"] = {"allowed_weekdays": [1]}
        _migrated, notes = migrate_zone_v1_to_v2(zone, None)
        assert "zone_restrictions_dropped" in [n.kind for n in notes]


class TestBehaviourPreservation:
    """The real contract: which days water, before and after."""

    def watering_days_v1(self, zone, hub, start, count):
        """Replay the OLD rules: grid AND cadence AND hub weekdays AND parity."""
        from custom_components.irrigation_maestro.engine.scheduling import is_due

        grid = zone["cycles"][0].get("days")
        allowed = (hub or {}).get("allowed_weekdays")
        parity = (hub or {}).get("parity")
        last, days = None, []
        for offset in range(count):
            day = start + timedelta(days=offset)
            if grid is not None and day.weekday() not in grid:
                continue
            if allowed is not None and day.weekday() not in allowed:
                continue
            if parity == "odd" and day.day % 2 == 0:
                continue
            if parity == "even" and day.day % 2 == 1:
                continue
            if not is_due(last, day, zone["interval_days"]):
                continue
            days.append(day)
            last = day
        return days

    def watering_days_v2(self, migrated, start, count):
        from custom_components.irrigation_maestro.engine.calendar import (
            ProgramCalendar,
            calendar_allows,
        )

        cycle = migrated["cycles"][0]
        if cycle.get("enabled") is False:
            return []
        calendar = ProgramCalendar.from_config(cycle["calendar"])
        last, days = None, []
        for offset in range(count):
            day = start + timedelta(days=offset)
            if not calendar_allows(calendar, day, last):
                continue
            days.append(day)
            last = day
        return days

    @pytest.mark.parametrize(
        "zone,hub",
        [
            (zone_v1(interval_days=1), None),
            (zone_v1(interval_days=3), None),
            (zone_v1(interval_days=1, days={0, 2, 4}), None),
            (zone_v1(interval_days=1), {"allowed_weekdays": [0, 2, 4]}),
            (zone_v1(interval_days=1, days={0, 1, 2}), {"allowed_weekdays": [0, 2, 4]}),
            (zone_v1(interval_days=1), {"parity": "odd"}),
        ],
    )
    def test_watering_days_are_unchanged_over_60_days(self, zone, hub):
        migrated, notes = migrate_zone_v1_to_v2(zone, hub)
        assert notes == [], "this combination is expected to migrate cleanly"
        assert self.watering_days_v2(migrated, TODAY, 60) == self.watering_days_v1(
            zone, hub, TODAY, 60
        )
```

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/python -m pytest tests/components/test_migration.py -q -p no:logging`
Expected: collection error — no `migration` module.

- [ ] **Step 3: Implement the migration**

```python
"""Config-entry migration v1 -> v2: the unified schedule model.

Before 2.0.0 a watering day was the AND of up to four separate mechanisms —
a per-program weekday grid, a per-zone cadence, and the hub's allowed weekdays
and odd/even parity — each editable on a different screen and each skipping
silently. This rewrite gives every program exactly one calendar.

Where a combination is expressible in the new model, the migration preserves
the watering days exactly. Where it is not, it keeps the delivered water
volume unchanged and returns a note, which the caller turns into a repair
issue: the user is told what was dropped rather than discovering it in a dry
flower bed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import const

_ALL_WEEKDAYS = frozenset(range(7))


@dataclass(frozen=True, slots=True)
class MigrationNote:
    """One thing the migration could not carry over, for a repair issue."""

    kind: str
    zone_name: str
    program_name: str
    detail: dict[str, Any] = field(default_factory=dict)


def _meaningful_grid(raw: Any) -> frozenset[int] | None:
    """The grid, or None when it constrains nothing."""
    if raw is None:
        return None
    grid = frozenset(int(d) for d in raw)
    if not grid or grid >= _ALL_WEEKDAYS:
        return None
    return grid


def migrate_zone_v1_to_v2(
    zone_data: dict[str, Any], hub_restrictions: dict[str, Any] | None
) -> tuple[dict[str, Any], list[MigrationNote]]:
    """Rewrite one zone subentry. Returns the new data and what was dropped."""
    zone = dict(zone_data)
    notes: list[MigrationNote] = []
    zone_name = zone.get(const.CONF_ZONE_NAME, zone.get("name", "?"))

    interval = int(zone.pop(const.CONF_INTERVAL_DAYS, const.DEFAULT_INTERVAL_DAYS))
    zone_season = zone.pop(const.CONF_SEASON_MONTHS, None)
    if zone.pop(const.CONF_RESTRICTIONS, None) is not None:
        notes.append(MigrationNote("zone_restrictions_dropped", zone_name, "", {}))

    restrictions = hub_restrictions or {}
    allowed_raw = restrictions.get("allowed_weekdays")
    allowed = frozenset(int(d) for d in allowed_raw) if allowed_raw else None
    parity = restrictions.get("parity")

    cycles: list[dict[str, Any]] = []
    for raw_cycle in zone.get(const.CONF_CYCLES, []):
        cycle = dict(raw_cycle)
        name = cycle.get(const.CONF_CYCLE_NAME, cycle.get(const.CONF_CYCLE_ID, "?"))
        grid = _meaningful_grid(cycle.pop(const.CONF_CYCLE_DAYS, None))

        # Season: an explicit per-program override wins over the zone value.
        override = cycle.pop(const.CONF_MONTHS_OVERRIDE, None)
        season = override if override is not None else zone_season
        if season is not None:
            cycle[const.CONF_SEASON_MONTHS] = sorted(int(m) for m in season)

        if grid is not None:
            if interval > 1:
                notes.append(
                    MigrationNote(
                        "cadence_dropped", zone_name, name, {"interval_days": interval}
                    )
                )
            if parity:
                notes.append(
                    MigrationNote("parity_dropped", zone_name, name, {"parity": parity})
                )
            effective = grid & allowed if allowed is not None else grid
            if not effective:
                cycle[const.CONF_CYCLE_ENABLED] = False
                cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": sorted(grid)}
                notes.append(MigrationNote("program_disabled", zone_name, name, {}))
                cycles.append(cycle)
                continue
            cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": sorted(effective)}
        elif interval > 1:
            # "every N days, but only on these weekdays" has no single mode.
            # Keep the cadence (same water volume) and report the lost limit.
            if allowed is not None:
                notes.append(
                    MigrationNote(
                        "weekdays_dropped", zone_name, name, {"allowed": sorted(allowed)}
                    )
                )
            if parity:
                notes.append(
                    MigrationNote("parity_dropped", zone_name, name, {"parity": parity})
                )
            cycle[const.CONF_CALENDAR] = {"mode": "interval", "interval_days": interval}
        elif parity:
            cycle[const.CONF_CALENDAR] = {"mode": "parity", "parity": parity}
        else:
            days = sorted(allowed) if allowed is not None else sorted(_ALL_WEEKDAYS)
            cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": days}

        cycles.append(cycle)

    zone[const.CONF_CYCLES] = cycles
    return zone, notes
```

Add `CONF_CALENDAR: Final = "calendar"` and `CONF_ZONE_NAME: Final = "name"` to `const.py` if not already present.

- [ ] **Step 4: Run the migration tests**

Run: `.venv/bin/python -m pytest tests/components/test_migration.py -q -p no:logging`
Expected: PASS, including the 60-day behaviour-preservation parametrisation.

- [ ] **Step 5: Wire it into `async_migrate_entry`**

In `__init__.py`, replace the body of `async_migrate_entry` so that a v1 entry is rewritten: for each zone subentry call `migrate_zone_v1_to_v2` with the hub's `options["restrictions"]`; collect the notes; strip `allowed_weekdays` and `parity` from the hub restrictions, keeping `forbidden_windows`; seed `last_completed{zone:program}` from the old `last_completed{zone}`; then `hass.config_entries.async_update_entry(entry, version=2, ...)`. Raise the repair issues in Task 7. Keep the `entry.version > 2` refusal.

Set `VERSION = 2` in `config_flow.py:213`.

- [ ] **Step 6: Run the full suite**

Run: `.venv/bin/python -m pytest -q -p no:logging`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/migration.py custom_components/irrigation_maestro/__init__.py custom_components/irrigation_maestro/config_flow.py custom_components/irrigation_maestro/const.py tests/components/test_migration.py
git commit -m "feat: migrate the schedule model to v2

Preserves the watering days exactly wherever the old combination is
expressible, and reports what it had to drop where it is not. The hub's
allowed weekdays are intersected into the grid rather than discarded, so a
restricted zone does not silently become a daily one."
```

---

### Task 7: Repair issues for the migration

**Files:**
- Modify: `custom_components/irrigation_maestro/__init__.py`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Test: `tests/components/test_migration.py`

**Interfaces:**
- Consumes: `MigrationNote` (Task 6).
- Produces: `async_report_migration_notes(hass, notes: list[MigrationNote]) -> None`, one issue per note kind, id `f"migration_{kind}"`, `translation_placeholders={"items": "..."}`.

- [ ] **Step 1: Write the failing test**

```python
async def test_migration_raises_one_issue_per_kind(hass):
    from homeassistant.helpers import issue_registry as ir
    from custom_components.irrigation_maestro.__init__ import async_report_migration_notes
    from custom_components.irrigation_maestro.migration import MigrationNote

    await async_report_migration_notes(
        hass,
        [
            MigrationNote("cadence_dropped", "Pots", "Morning", {"interval_days": 3}),
            MigrationNote("cadence_dropped", "Lawn", "Evening", {"interval_days": 2}),
            MigrationNote("parity_dropped", "Pots", "Morning", {"parity": "odd"}),
        ],
    )
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "migration_cadence_dropped") is not None
    assert registry.async_get_issue(DOMAIN, "migration_parity_dropped") is not None
    issue = registry.async_get_issue(DOMAIN, "migration_cadence_dropped")
    assert "Pots" in issue.translation_placeholders["items"]
    assert "Lawn" in issue.translation_placeholders["items"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_migration.py -q -p no:logging -k issue`
Expected: FAIL — no such function.

- [ ] **Step 3: Implement**

```python
async def async_report_migration_notes(
    hass: HomeAssistant, notes: list[MigrationNote]
) -> None:
    """One repair issue per kind, listing every zone and program affected."""
    grouped: dict[str, list[MigrationNote]] = {}
    for note in notes:
        grouped.setdefault(note.kind, []).append(note)
    for kind, items in grouped.items():
        summary = ", ".join(
            f"{note.zone_name} / {note.program_name}".rstrip(" /") for note in items
        )
        ir.async_create_issue(
            hass,
            DOMAIN,
            f"migration_{kind}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key=f"migration_{kind}",
            translation_placeholders={"items": summary},
        )
```

Add the five `migration_*` entries under `issues` in both translation files. English wording, for example `migration_cadence_dropped`:

> title: `Watering cadence replaced by the weekday schedule`
> description: `These programs had both a weekday schedule and a per-zone "every N days" cadence, which silently cancelled each other out. The weekday schedule you chose is now the only one in effect, so they water on the days you selected: {items}.`

`migration_weekdays_dropped`:

> title: `Allowed-days limit no longer applies to some programs`
> description: `These programs water on an "every N days" cadence, which cannot also be limited to specific weekdays. Their cadence is unchanged, but your allowed-days limit no longer applies to them. If you must comply with it, set their calendar to specific weekdays: {items}.`

Write the Italian equivalents in `it.json` with the same placeholders.

- [ ] **Step 4: Run the tests and lint**

Run: `.venv/bin/python -m pytest tests/components/test_migration.py -q -p no:logging && .venv/bin/python -m ruff check .`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/__init__.py custom_components/irrigation_maestro/translations tests/components/test_migration.py
git commit -m "feat: repair issues for everything the migration dropped

Grouped by kind and listing every affected program, so a silent behaviour
change becomes something the user reads in the UI."
```

---

### Task 8: ZoneNextRunSensor

**Files:**
- Modify: `custom_components/irrigation_maestro/sensor.py:295-345`
- Test: `tests/components/test_entities.py`

**Interfaces:**
- Consumes: `calendar_allows`, per-program markers.
- Produces: `ZoneNextRunSensor._next()` returning the first *eligible* occurrence.

- [ ] **Step 1: Write the failing test**

```python
async def test_next_run_skips_days_the_calendar_forbids(hass, freezer):
    # Friday; the only program runs on Mondays.
    freezer.move_to("2026-07-17 04:00:00+00:00")
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots", calendar={"mode": "weekdays", "days": [0]})],
    )
    state = hass.states.get("sensor.pots_next_run")
    assert state.state.startswith("2026-07-20")  # the following Monday


async def test_next_run_is_none_when_suspended_indefinitely(hass, freezer):
    freezer.move_to("2026-07-17 04:00:00+00:00")
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    runtime.state.set_suspended_until(runtime.zone_ids[0], datetime(2027, 1, 1, tzinfo=UTC))
    await hass.async_block_till_done()
    assert hass.states.get("sensor.pots_next_run").state == "unknown"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_entities.py -q -p no:logging -k next_run`
Expected: FAIL — the sensor returns tomorrow's raw trigger.

- [ ] **Step 3: Implement the projection**

Replace `_next()` with a bounded forward walk: for each enabled program, for each of the next 366 days starting today, skip the day unless `calendar_allows(program.calendar, day, marker)` and the day's month is in the program's effective season and the day is past `suspended_until`/`paused_until` and is not the `skip_today` date; compute the trigger instant for that day (for sun triggers use `sun.get_astral_event_date` for the specific day); skip instants already in the past; keep the earliest across programs. Return `None` if nothing is found within the window.

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/python -m pytest tests/components/test_entities.py -q -p no:logging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/sensor.py tests/components/test_entities.py
git commit -m "fix(sensor): next run respects the calendar and the gates

It used to show the next raw trigger, so the card promised a run on days the
zone would skip. Now computable, because one calendar mode replaced four
overlapping ones."
```

---

### Task 9: Services

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py:170-200`, `:290-320`, `:601-640`, `:836-860`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: `set_program_schedule` accepting `calendar_mode` (`weekdays` | `interval` | `parity`), `days`, `interval_days`, `parity`, `season_months`, plus the existing start fields; `update_zone` without `interval_days`/`season_months`; `set_restrictions` without `allowed_weekdays`/`parity`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_set_program_schedule_writes_a_weekday_calendar(hass):
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    await hass.services.async_call(
        DOMAIN,
        "set_program_schedule",
        {"zone_id": zone_id, "program_id": "cy_pots", "calendar_mode": "weekdays", "days": [0, 2]},
        blocking=True,
    )
    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.calendar.to_config() == {"mode": "weekdays", "days": [0, 2]}


async def test_set_program_schedule_replaces_the_previous_mode(hass):
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    for payload in (
        {"calendar_mode": "weekdays", "days": [0, 2]},
        {"calendar_mode": "interval", "interval_days": 4},
    ):
        await hass.services.async_call(
            DOMAIN,
            "set_program_schedule",
            {"zone_id": zone_id, "program_id": "cy_pots", **payload},
            blocking=True,
        )
    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    # No residue of the weekday mode survives the switch.
    assert cycle.calendar.to_config() == {"mode": "interval", "interval_days": 4}


async def test_update_zone_rejects_removed_calendar_keys(hass):
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "update_zone", {"zone_id": zone_id, "interval_days": 3}, blocking=True
        )
```

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/python -m pytest tests/components/test_services.py -q -p no:logging -k "schedule or removed_calendar"`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `_async_set_program_schedule`, build the calendar from `calendar_mode` and write `cycle[CONF_CALENDAR] = calendar.to_config()`, removing any legacy `days` key. Validate with a voluptuous schema where each mode requires its own field. Add `season_months` handling. Remove `interval_days` and `season_months` from `_ZONE_PATCH_KEYS` and the `update_zone` schema. Remove `allowed_weekdays`/`parity` from `_SET_RESTRICTIONS_SCHEMA` and from `set_restrictions`. Mirror every change in `services.yaml` with the same selectors and field names.

- [ ] **Step 4: Run the service tests**

Run: `.venv/bin/python -m pytest tests/components/test_services.py -q -p no:logging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml tests/components/test_services.py
git commit -m "feat(services): one calendar per program, no zone cadence

set_program_schedule writes the whole calendar as one mode, so switching modes
cannot leave residue from the previous one."
```

---

### Task 10: Config flow cleanup

**Files:**
- Modify: `custom_components/irrigation_maestro/config_flow.py:60`, `:502-548`, `:745-810`, `:1245-1265`
- Modify: `custom_components/irrigation_maestro/number.py:87-98`
- Test: `tests/components/test_config_flow.py`, `tests/components/test_entities.py`

- [ ] **Step 1: Write the failing test**

```python
async def test_zone_flow_has_no_calendar_fields(hass):
    result = await hass.config_entries.subentries.async_init(
        (entry.entry_id, "zone"), context={"source": "user"}
    )
    for removed in ("interval_days", "season_months"):
        assert removed not in result["data_schema"].schema


async def test_no_interval_number_entity(hass):
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    assert hass.states.get("number.pots_watering_interval") is None
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_config_flow.py tests/components/test_entities.py -q -p no:logging -k "calendar_fields or interval_number"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Remove `interval_days` and `season_months` from `_zone_schema`, its validation and the reconfigure step; remove `_MAX_INTERVAL_DAYS`. Remove the weekday and parity fields from `async_step_restrictions`, keeping only the forbidden-windows text field. Delete `ZoneIntervalNumber` and its entry in the platform's entity list.

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/python -m pytest tests/components/ -q -p no:logging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/config_flow.py custom_components/irrigation_maestro/number.py tests/components
git commit -m "refactor(config): zones no longer carry a calendar

Drops the interval field, the zone season and the weekday/parity restrictions
from the config flow, and removes the interval number entity."
```

---

### Task 11: Panel calendar editor

**Files:**
- Create: `card/src/panel/calendar-editor.ts`, `card/src/panel/calendar-editor.test.ts`
- Modify: `card/src/panel/program-editor.ts:310-400`, `program-wizard.ts:320-400`, `program-list.ts:220-250`, `config-read.ts`, `panel.ts`

**Interfaces:**
- Produces: `<imc-calendar-editor>` with property `calendar: CalendarConfig` and event `imc-calendar-change` carrying `{calendar: CalendarConfig}`, where `CalendarConfig` is the discriminated union `{mode:'weekdays',days:number[]} | {mode:'interval',interval_days:number} | {mode:'parity',parity:'odd'|'even'}`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { normaliseCalendar, describeCalendar } from './calendar-editor';

describe('normaliseCalendar', () => {
  it('keeps only the keys of the active mode', () => {
    expect(normaliseCalendar({ mode: 'weekdays', days: [0, 2], interval_days: 3 } as never))
      .toEqual({ mode: 'weekdays', days: [0, 2] });
  });

  it('defaults an empty weekday selection to every day', () => {
    expect(normaliseCalendar({ mode: 'weekdays', days: [] })).toEqual({
      mode: 'weekdays',
      days: [0, 1, 2, 3, 4, 5, 6],
    });
  });

  it('clamps an interval below one', () => {
    expect(normaliseCalendar({ mode: 'interval', interval_days: 0 })).toEqual({
      mode: 'interval',
      interval_days: 1,
    });
  });
});

describe('describeCalendar', () => {
  it('summarises each mode for the program list', () => {
    expect(describeCalendar({ mode: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Ogni giorno');
    expect(describeCalendar({ mode: 'interval', interval_days: 3 })).toBe('Ogni 3 giorni');
    expect(describeCalendar({ mode: 'parity', parity: 'odd' })).toBe('Giorni dispari');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd card && npm test -- calendar-editor`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Build `<imc-calendar-editor>` as a Lit element: a segmented control choosing the mode, and below it exactly one editor — seven weekday chips, a number stepper (1–60), or an odd/even segmented control. Switching mode replaces the calendar object wholesale so no residue survives. Export the two pure helpers `normaliseCalendar` and `describeCalendar` for the tests and the program list. Follow the existing panel styling conventions in `program-editor.ts`.

- [ ] **Step 4: Run the tests**

Run: `cd card && npm test`
Expected: PASS.

- [ ] **Step 5: Wire into the program editor and wizard**

Replace the seven-chip grid in `program-editor.ts` with `<imc-calendar-editor>`, add the season month chips next to it, and send both through `set_program_schedule`. Do the same in the wizard, defaulting to `{mode:'weekdays',days:[0..6]}`. Update `program-list.ts` to render `describeCalendar`. Extend `config-read.ts` types with `calendar` and `season_months`.

- [ ] **Step 6: Build and test**

Run: `cd card && npm test && npm run build`
Expected: PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add card/src/panel
git commit -m "feat(panel): one calendar control per program

Mode selector plus exactly one editor. Switching mode replaces the calendar
object wholesale, so the UI cannot express a hybrid either."
```

---

### Task 12: Panel zone editor and settings cleanup

**Files:**
- Modify: `card/src/panel/zone-editor.ts:300-400`, `settings-view.ts:490-560`

- [ ] **Step 1: Write the failing test**

```typescript
it('the zone patch carries no calendar fields', () => {
  const patch = buildZonePatch({ name: 'Pots', valveEntity: 'valve.p', order: 100 });
  expect(patch).not.toHaveProperty('interval_days');
  expect(patch).not.toHaveProperty('season_months');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd card && npm test -- zone-editor`
Expected: FAIL.

- [ ] **Step 3: Implement**

Remove the interval stepper and the season month chips from the zone editor's Advanced drawer and from its patch builder. In `settings-view.ts` remove the weekday chips and the parity segmented control, keep the forbidden-window time inputs, and relabel the section to make clear it constrains hours only.

- [ ] **Step 4: Build and test**

Run: `cd card && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add card/src/panel
git commit -m "refactor(panel): calendars live only in the program editor

Removes the second weekday grid and the zone interval, the two controls that
silently fought the program schedule."
```

---

### Task 13: Terminology

**Files:**
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Modify: `switch.py`, `sensor.py`, `services.py` docstrings and display names

- [ ] **Step 1: Write the failing test**

```python
async def test_cycle_switch_keeps_its_unique_id(hass):
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    registry = er.async_get(hass)
    entity = registry.async_get("switch.pots_morning_program")
    assert entity is not None
    assert entity.unique_id.endswith("cy_pots_enabled")  # unchanged from 1.x
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_entities.py -q -p no:logging -k unique_id`
Expected: FAIL on the new entity_id.

- [ ] **Step 3: Implement**

Rename user-facing occurrences of "cycle" to "program" in both translation files and in entity display names and `translation_key`s. Do **not** touch `unique_id` construction anywhere. Keep `cycle_id` as the internal Python identifier to limit the diff; the rename is user-facing only.

- [ ] **Step 4: Run the full suite**

Run: `.venv/bin/python -m pytest -q -p no:logging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro tests
git commit -m "refactor: one word for one concept — program

The panel said program, the config flow and entities said cycle, for the same
object. unique_ids are untouched so existing automations keep working."
```

---

### Task 14: Docs and release

**Files:**
- Modify: `README.md`, `CHANGELOG.md`, `MEMORY.md`, `manifest.json`
- Modify: `docs/design/architecture.md`

- [ ] **Step 1: Update the docs**

In `README.md`, replace the cadence bullet with a description of the program calendar and its three modes. In `docs/design/architecture.md`, update the scheduling section and the `interval_days` reference at line 105. In `MEMORY.md`, replace the `last_completed` note with the per-program semantics and record that the calendar is a discriminated union with one mode.

- [ ] **Step 2: Write the changelog**

Add a `## [2.0.0]` section with a **Changed (breaking)** subsection describing the observable symptom first: zones with a weekday schedule and a per-zone cadence silently skipped days; both now live in one place. List each repair issue and what it means. Include an explicit "after upgrading, check each program's calendar" instruction.

- [ ] **Step 3: Bump the version**

Set `"version": "2.0.0"` in `manifest.json`. Confirm `hacs.json` carries no version field.

- [ ] **Step 4: Final verification**

Run:
```bash
.venv/bin/python -m pytest -q -p no:logging
.venv/bin/python -m ruff check . && .venv/bin/python -m ruff format --check .
cd card && npm test && npm run build && cd ..
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md MEMORY.md docs custom_components/irrigation_maestro/manifest.json
git commit -m "release: unified schedule model (v2.0.0)"
```

---

## Self-Review

**Spec coverage.** D1 → Tasks 1, 3, 4. D2 → Task 1 (union) and Task 11 (UI). D3 → Tasks 3, 10, 12. D4 → Tasks 9, 10, 12. D5 → Task 6. D6 → Task 5. D7 → Tasks 11, 12 (Phase 1 share; the rest is Phase 2 by design). D8 → Task 13. The `ZoneNextRunSensor` requirement → Task 8. Migration testing strategy → Task 6 Step 1, including the 60-day behaviour-preservation parametrisation and the exclusivity tests in Task 1.

**Placeholders.** None: every code step carries real code or an exact edit description with file and line ranges.

**Type consistency.** `ProgramCalendar.to_config()`/`from_config()` are used with the same shape in Tasks 1, 3, 6, 9 and 11. `calendar_allows(calendar, day, last_completed)` keeps one signature in Tasks 1, 4 and 8. `MigrationNote(kind, zone_name, program_name, detail)` matches between Tasks 6 and 7. `RuntimeState.last_completed(zone_id, program_id)` matches between Tasks 5 and 8.

**Known ordering constraint.** Task 2 deliberately leaves the suite red; Task 4 restores it. Do not reorder them, and do not "fix" the red suite between the two.
