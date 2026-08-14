# Water Accounting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the run-scoped flow integrator with one continuously-integrating ledger per flow meter, so every litre that passes a meter is accounted for — attributed to the zone whose valve is open, or to an unattributed bucket when none is — and exposed as per-zone `total_increasing` water sensors that Home Assistant's statistics engine can graph, totalise and feed to the Water dashboard.

**Architecture:** A pure accumulator in `engine/metering.py` (no HA imports, clock injected) does the arithmetic and the 730-day retention. `accounting.py` wires it to Home Assistant: one `MeterLedger` per configured meter entity, subscribing to state changes plus a 30 s safety tick, emitting a `MeterSample` per integration step; a `WaterAccountant` resolves attribution from **valve state** and writes through `RuntimeState`. `FlowMonitor` stops integrating and becomes a subscriber, keeping its own timers and its range check. The monthly consumption budget stops being an independent counter and derives from the same daily history.

**Tech Stack:** Python 3.13-compatible syntax (ruff `target-version = py313`), mypy strict, Home Assistant ≥ 2025.7, pytest via `pytest-homeassistant-custom-component`, Lit 3 + TypeScript + Vite for the card.

**Spec:** `docs/superpowers/specs/2026-08-14-water-accounting-and-leak-detection-design.md`

**Branch:** `feat/water-accounting`, branched from up-to-date `main`. Ships as 3.3.0. Do **not** start `feat/leak-detection` until this is merged.

## Global Constraints

- **Never touch the decision engine.** `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py`, the weights, thresholds, water budget, forecast credit, weighted temperature, immediate skips and the `PRESET_POTS` / `PRESET_LAWN` control points are field-validated and out of scope. Adding the **new** file `engine/metering.py` is in scope; modifying any existing engine file is not.
- **Every flow reading goes through `flow.py`.** L/min is canonical; conversion happens once, on read. Do not convert anywhere else and do not add a second canonical unit.
- **Code, comments and docstrings in English.** Translations complete in `translations/en.json` and `translations/it.json`; the card has its own IT+EN layer in `card/src/localize/`.
- **Italian terminology:** a flow meter is *"flussometro"*, always, nothing else. *"Contatore"* is reserved for an actual counter (the consumption total, the cadence counter), never for the device.
- **Fully asynchronous, no blocking I/O, no YAML configuration.**
- **Every new service is declared in `services.yaml` AND registered** — two distinct places in the file, and it is easy to add only one.
- **Backward compatible.** Existing configurations must load. Migrations are idempotent, following `migration.py`.
- **`STORAGE_VERSION` stays 1.** A major bump with the plain `Store` at `storage.py:31` makes HA's base `_async_migrate_func` raise `NotImplementedError` (`homeassistant/helpers/storage.py:620-622`, re-raised at `:449-460`), failing setup on every existing install.
- **All `async_call_later` callbacks must be `@callback`-decorated.** A plain function runs in the executor thread and raises "Non-thread-safe operation…".
- **Commands:** tests `.venv/bin/pytest <path> -v`; whole suite `.venv/bin/pytest -q`; lint `.venv/bin/ruff check .`; types `.venv/bin/mypy`; card `cd card && npm run typecheck && npm test && npm run build`.

---

## File Structure

**Created:**
- `custom_components/irrigation_maestro/engine/metering.py` — pure accumulation, daily rollup, 730-day retention. No HA imports.
- `custom_components/irrigation_maestro/accounting.py` — `MeterSample`, `MeterLedger`, `WaterAccountant`. All HA wiring.
- `tests/engine/test_metering.py` — mirrors `engine/metering.py` 1:1, per the repo's engine-test convention.
- `tests/components/test_metering.py` — HA-wired accounting.
- `tests/components/test_metering_restart.py` — restart and monotonicity.

**Modified:**
- `flow.py` — `FlowReading.available`.
- `storage.py` — `water` section, explicit sub-dict merge, accessors, 730-day prune, `drop_zone`.
- `migration.py` — `seed_carried_over_and_drop_consumption`.
- `session.py` — `FlowMonitor` becomes a `MeterLedger` subscriber; `_close_valve` untouched here (it belongs to the leak plan).
- `runtime.py` — accountant lifecycle, out-of-cycle entry point, `_consumption_factor` reads the derived total.
- `sensor.py` — two new roles, `line_meter_shared` truthiness fix.
- `diagnostics.py` — summarise the 730-day series.
- `card/src/{types,discovery,zone-row}.ts`, `card/src/localize/{en,it}.ts`.
- `translations/{en,it}.json`, `README.md`, `docs/design/{architecture,card-contract}.md`, `MEMORY.md`, `CHANGELOG.md`, `manifest.json`.

---

## Task 1: Pin the FlowMonitor invariants that no test protects

Two deliberate behaviours have no test, so the refactor in Task 9 could break them and stay green. Pin them **first**, against today's code.

**Files:**
- Test: `tests/components/test_safety_extra.py`

**Interfaces:**
- Consumes: `setup_hub`, `zone_data`, `advance`, `mock_weather` from `tests/components/test_session.py`; `MockValvePark` from `tests/components/mocks.py`.
- Produces: nothing — pure test additions.

- [ ] **Step 1: Write the failing-if-broken test for the volume target above the unit gate**

`session.py:228-233` compares the volume target *before* the `unit_known` gate, so water certainly delivered still finishes the run. Every existing unit-loss test uses duration cycles; every volume test keeps the unit throughout.

Append to `tests/components/test_safety_extra.py`:

```python
async def test_volume_target_reached_on_the_read_that_loses_the_unit(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Litres already integrated finish the run even if that read kills the unit.

    The target check sits above the unit_known gate on purpose (session.py:228):
    water certainly delivered is still delivered. Without this test a refactor
    can move the check below the gate and hang the cycle on its safety timeout.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                cycles=[
                    {
                        "id": "cy_alpha",
                        "name": "Morning",
                        "enabled": True,
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[20.0, 100.0]],
                            "min_value": 1.0,
                            "max_value": 500.0,
                            "kind": "volume",
                        },
                        "volume_safety_timeout_min": 60,
                    }
                ],
            )
        ],
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # 60 L/min for ~2 min crosses the 100 L target; the same read that carries
    # it past the target also removes the unit.
    await advance(hass, freezer, 120, step=1.0)
    hass.states.async_set("sensor.flow", "60", {})  # unit gone
    await advance(hass, freezer, 60, step=1.0)

    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
```

- [ ] **Step 2: Run it and confirm it passes against current code**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py::test_volume_target_reached_on_the_read_that_loses_the_unit -v`
Expected: PASS. It is a *characterisation* test — it must pass now, and its job is to fail later if Task 9 reorders the check. If it fails now, stop and investigate: the invariant is not what the comment claims.

- [ ] **Step 3: Write the positive-path range test**

Only the negative case exists (`test_safety_extra.py:554-620`). A refactor could disable range reporting entirely and the suite stays green.

```python
async def test_flow_in_range_reports_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The positive path of _check_range: sustained in-range flow is silent.

    Without this, a refactor that never calls report_flow_out_of_range at all
    passes the whole suite.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                flow_sensor="sensor.flow",
                nominal_flow_lpm=10.0,
                flow_tolerance_pct=25,
            )
        ],
    )
    runtime = entry.runtime_data
    reported: list[tuple[float, float, float]] = []
    runtime.report_flow_out_of_range = lambda *args: reported.append(args)  # type: ignore[method-assign]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    # Well past RANGE_SUSTAIN_S (120 s) with flow inside 7.5–12.5 L/min.
    await advance(hass, freezer, 300, step=1.0)

    assert reported == []
```

- [ ] **Step 4: Run it**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py::test_flow_in_range_reports_nothing -v`
Expected: PASS.

- [ ] **Step 5: Run the whole file and commit**

```bash
.venv/bin/pytest tests/components/test_safety_extra.py -q
.venv/bin/ruff check .
git add tests/components/test_safety_extra.py
git commit -m "test(flow): pin the two FlowMonitor invariants no test protected

The volume target is compared above the unit_known gate on purpose
(session.py:228) and _check_range's positive path had no coverage at all --
a refactor could disable range reporting entirely and the suite stayed
green. Both are characterisation tests: they pass today and exist to fail
when the per-meter ledger refactor moves either behaviour."
```

---

## Task 2: Pin the consumption budget gate end-to-end

`_consumption_factor` (`runtime.py:496-513`) drives `reduce` and `suspend` and is untested. `test_session.py:421` looks like coverage but asserts `reason_key == "budget_sufficient"` — the rain/mm budget, a different mechanism entirely. Task 11 changes what `runtime.py:499` reads; it must not be the first thing to exercise this path.

**Files:**
- Test: `tests/components/test_budget.py` (create)

**Interfaces:**
- Consumes: `setup_hub`, `zone_data`, `advance`, `mock_weather`, `START` from `tests/components/test_session.py`.
- Produces: nothing — pure test additions. Task 11 must keep all three passing unchanged.

- [ ] **Step 1: Write the three budget-action tests**

Create `tests/components/test_budget.py`:

```python
"""The consumption budget gate: notify, reduce, suspend.

runtime._consumption_factor drives real duration changes and real session
suspension, and had no end-to-end test. test_session.py's
test_budget_skip_records_outcome_and_aggregates_notification is a false
friend -- it asserts reason_key == "budget_sufficient", which is the rain
budget in millimetres, an unrelated mechanism.
"""

from datetime import date

from homeassistant.core import HomeAssistant
from freezegun.api import FrozenDateTimeFactory

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def _hub_over_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, action: str
):
    """A hub whose monthly counter already sits above a 100 L budget."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=5.0)],
        {"consumption_budget": {"liters_per_month": 100, "action": action,
                                "reduce_pct": 50}},
    )
    runtime = entry.runtime_data
    runtime.state.add_consumption(150.0, period_start=date(2026, 7, 1))
    return entry, runtime, park


async def test_budget_notify_fires_once_per_period(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry, runtime, _park = await _hub_over_budget(hass, freezer, "notify")
    events: list[dict] = []
    hass.bus.async_listen(
        "irrigation_maestro_consumption_budget", lambda e: events.append(e.data)
    )

    runtime._consumption_factor()
    runtime._consumption_factor()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0]["liters"] == 150.0


async def test_budget_reduce_halves_the_factor(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "reduce")
    factor, suspend = runtime._consumption_factor()
    assert factor == 0.5
    assert suspend is False


async def test_budget_suspend_sets_the_suspend_flag(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "suspend")
    factor, suspend = runtime._consumption_factor()
    assert factor == 1.0
    assert suspend is True


async def test_budget_under_the_limit_does_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10)],
        {"consumption_budget": {"liters_per_month": 1000, "action": "suspend"}},
    )
    runtime = entry.runtime_data
    runtime.state.add_consumption(10.0, period_start=date(2026, 7, 1))
    assert runtime._consumption_factor() == (1.0, False)
```

- [ ] **Step 2: Run them**

Run: `.venv/bin/pytest tests/components/test_budget.py -v`
Expected: all four PASS against current code. If `test_budget_notify_fires_once_per_period` fails, check that the event name matches `EVENT_PREFIX + EVENT_CONSUMPTION_BUDGET`.

- [ ] **Step 3: Commit**

```bash
.venv/bin/ruff check .
git add tests/components/test_budget.py
git commit -m "test(budget): pin the consumption gate before rewiring its source

_consumption_factor drives reduce and suspend and had no end-to-end test;
the one that looked like coverage asserts the rain budget in millimetres,
not this. Pinned now so the switch to the derived per-zone total is judged
against behaviour rather than against nothing."
```

---

## Task 3: Pin the persisted storage shape and the existing migration

No test reads the raw store, so the key set has no safety net; and `migrate_markers` — the precedent the new migration copies — ships with no test at all.

**Files:**
- Test: `tests/components/test_storage.py:1-30` (add imports as needed), append tests

**Interfaces:**
- Consumes: `RuntimeState` from `custom_components.irrigation_maestro.storage`, `migrate_last_completed` from `custom_components.irrigation_maestro.migration`.
- Produces: nothing.

- [ ] **Step 1: Write the round-trip and migration tests**

Append to `tests/components/test_storage.py`:

```python
async def test_persisted_key_set_round_trips(hass: HomeAssistant) -> None:
    """The stored dict keeps exactly the keys the defaults declare.

    Nothing else asserts the persisted shape, so a key added or removed by
    accident is invisible until an install fails to load.
    """
    state = RuntimeState(hass, "entry1")
    await state.async_load()
    await state.async_save()

    reloaded = RuntimeState(hass, "entry1")
    await reloaded.async_load()
    assert set(reloaded.as_dict()) == {
        "temp_history",
        "rain_history",
        "rain_staging_mm",
        "last_completed",
        "manual_stop_at",
        "suspended_until",
        "paused_until",
        "skip_today",
        "last_outcome",
        "zone_enabled",
        "cycle_enabled",
        "outcome_log",
        "consumption",
    }


def test_marker_migration_is_idempotent() -> None:
    """migrate_last_completed re-keys zone -> zone:program, once.

    The precedent every later storage migration copies, shipped untested.
    """
    zone_programs = {"z1": ["p1", "p2"]}
    once = migrate_last_completed({"z1": "2026-07-01"}, zone_programs)
    assert once == {"z1:p1": "2026-07-01", "z1:p2": "2026-07-01"}
    assert migrate_last_completed(once, zone_programs) == once


def test_marker_migration_drops_markers_of_removed_zones() -> None:
    assert migrate_last_completed({"gone": "2026-07-01"}, {}) == {}
```

Add `from custom_components.irrigation_maestro.migration import migrate_last_completed` to the imports at the top of the file.

- [ ] **Step 2: Run them**

Run: `.venv/bin/pytest tests/components/test_storage.py -v`
Expected: all PASS. The round-trip test's key set must match `storage.py:36-49` exactly — if it fails, copy the actual key set from the failure output rather than editing the source.

- [ ] **Step 3: Commit**

```bash
.venv/bin/ruff check .
git add tests/components/test_storage.py
git commit -m "test(storage): pin the persisted key set and the marker migration

The store's shape had no test at all, and migrate_last_completed -- the
idempotency precedent the water-section migration copies -- shipped
untested. Both are pinned before the water section adds keys."
```

---

## Task 4: `FlowReading.available`

Accounting needs to tell a true zero from "unavailable with a known unit". Today `flow.py` returns `0.0` for both, deliberately, because the zero-flow guard must act on the second.

**Files:**
- Modify: `custom_components/irrigation_maestro/flow.py:41-52`, `:89-99`
- Test: `tests/components/test_flow.py`

**Interfaces:**
- Produces: `FlowReading.available: bool` — `False` when the state object is missing, is `unavailable`/`unknown`, or is non-numeric; `True` otherwise. Consumed by `MeterLedger` in Task 7.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_flow.py`:

```python
def test_available_distinguishes_a_true_zero_from_a_gap(hass: HomeAssistant) -> None:
    """0.0 L/min means two opposite things; accounting needs them apart.

    The zero-flow guard is entitled to treat an unavailable meter as zero
    flow. An integrator is not: a gap is water it did not observe, not water
    that did not pass.
    """
    reader = FlowSensorReader(hass, "sensor.flow")

    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    reading = reader.read()
    assert reading.lpm == 0.0
    assert reading.available is True

    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    reading = reader.read()
    assert reading.lpm == 0.0
    assert reading.available is False

    hass.states.async_set("sensor.flow", "not a number", {"unit_of_measurement": "L/min"})
    assert reader.read().available is False

    hass.states.async_set("sensor.flow", "5", {})  # unit unknown
    reading = reader.read()
    assert reading.lpm is None
    assert reading.available is False
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.venv/bin/pytest tests/components/test_flow.py::test_available_distinguishes_a_true_zero_from_a_gap -v`
Expected: FAIL — `AttributeError: 'FlowReading' object has no attribute 'available'`.

- [ ] **Step 3: Implement**

In `flow.py`, change the dataclass:

```python
@dataclass(frozen=True, slots=True)
class FlowReading:
    """One reading in canonical units, or None when the unit is unknown."""

    lpm: float | None
    unit: str | None
    source: FlowUnitSource
    #: False when no number was read: the entity is missing, unavailable, or
    #: non-numeric. Distinct from ``lpm == 0.0``, which the zero-flow guard is
    #: entitled to act on but an integrator must not count as water not passed.
    available: bool = False

    @property
    def unit_known(self) -> bool:
        return self.source != "unknown"
```

Then update the four return sites in `read()`:

```python
        else:
            return FlowReading(None, None, "unknown", False)

        if state is None or state.state in _UNUSABLE_STATES:
            # Unit known, value not: that is zero flow, and the zero-flow guard
            # is entitled to act on it. Not the same as an unknown unit, and
            # not the same as a measured zero -- available says which.
            return FlowReading(0.0, unit, source, False)
        try:
            raw = float(state.state)
        except ValueError:
            return FlowReading(0.0, unit, source, False)

        lpm = VolumeFlowRateConverter.convert(max(raw, 0.0), unit, CANONICAL_UNIT)
        return FlowReading(max(lpm, 0.0), unit, source, True)
```

- [ ] **Step 4: Run the test and the whole flow suite**

Run: `.venv/bin/pytest tests/components/test_flow.py -v`
Expected: all PASS. The default `available: bool = False` keeps any positional construction in existing tests valid.

- [ ] **Step 5: Type-check and commit**

```bash
.venv/bin/mypy
.venv/bin/ruff check .
git add custom_components/irrigation_maestro/flow.py tests/components/test_flow.py
git commit -m "feat(flow): distinguish a measured zero from a reading gap

lpm == 0.0 means two opposite things: a meter reporting no flow, and a
meter that could not be read. The zero-flow guard is entitled to act on
the second; an integrator must not count it as water that did not pass.
Additive -- every existing consumer reads .lpm and is unaffected."
```

---

## Task 5: The pure metering engine

**Files:**
- Create: `custom_components/irrigation_maestro/engine/metering.py`
- Test: `tests/engine/test_metering.py`

**Interfaces:**
- Produces, all consumed by Tasks 6 and 7:
  - `accumulate(last_lpm: float, elapsed_s: float) -> float` — litres over one interval.
  - `roll_into_day(daily: DailyLitres, day: str, key: str, liters: float, *, estimated: bool, gap_s: float) -> DailyLitres` — returns a new dict, never mutates.
  - `prune_daily(daily: DailyLitres, today: date, *, keep_days: int = 730) -> DailyLitres`
  - `sum_period(daily: DailyLitres, start: date, end: date) -> float` — attributed litres only, every zone key, excluding `UNATTRIBUTED_KEY`.
  - `RETENTION_DAYS: Final = 730`, `UNATTRIBUTED_KEY: Final = "__unattributed__"`, `HUB_SCOPE: Final = "__hub__"`.
  - `type DailyLitres = dict[str, dict[str, Any]]`

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/test_metering.py`:

```python
"""Pure metering arithmetic: accumulation, daily rollup, 730-day retention."""

from datetime import date

from custom_components.irrigation_maestro.engine.metering import (
    RETENTION_DAYS,
    UNATTRIBUTED_KEY,
    accumulate,
    prune_daily,
    roll_into_day,
    sum_period,
)


def test_accumulate_is_rate_times_time() -> None:
    assert accumulate(60.0, 60.0) == 60.0        # 60 L/min for one minute
    assert accumulate(7.5, 600.0) == 75.0        # 7.5 L/min for ten minutes
    assert accumulate(0.0, 600.0) == 0.0


def test_accumulate_clamps_negative_inputs() -> None:
    """A meter reporting backwards, or a clock stepping back, adds nothing."""
    assert accumulate(-5.0, 60.0) == 0.0
    assert accumulate(60.0, -60.0) == 0.0


def test_roll_into_day_accumulates_without_mutating() -> None:
    daily: dict = {}
    first = roll_into_day(daily, "2026-08-14", "z1", 10.0, estimated=False, gap_s=0.0)
    second = roll_into_day(first, "2026-08-14", "z1", 5.0, estimated=False, gap_s=30.0)

    assert daily == {}
    assert first["2026-08-14"]["z1"]["l"] == 10.0
    assert second["2026-08-14"]["z1"]["l"] == 15.0
    assert second["2026-08-14"]["z1"]["gap_s"] == 30.0


def test_roll_into_day_marks_a_day_estimated_once_any_litre_is() -> None:
    """Mixed provenance is estimated: the number is not wholly measured."""
    daily = roll_into_day({}, "2026-08-14", "z1", 10.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z1", 5.0, estimated=True, gap_s=0.0)
    assert daily["2026-08-14"]["z1"]["est"] is True


def test_prune_keeps_exactly_the_retention_window() -> None:
    today = date(2026, 8, 14)
    daily = {}
    for offset in (0, 1, RETENTION_DAYS - 1, RETENTION_DAYS, RETENTION_DAYS + 1):
        day = date.fromordinal(today.toordinal() - offset).isoformat()
        daily = roll_into_day(daily, day, "z1", 1.0, estimated=False, gap_s=0.0)

    pruned = prune_daily(daily, today)
    kept = sorted(pruned)
    assert len(kept) == 3                      # offsets 0, 1, 729
    assert date.fromisoformat(kept[0]) == date.fromordinal(
        today.toordinal() - (RETENTION_DAYS - 1)
    )


def test_prune_is_idempotent() -> None:
    today = date(2026, 8, 14)
    daily = roll_into_day({}, "2020-01-01", "z1", 1.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, today.isoformat(), "z1", 1.0, estimated=False, gap_s=0.0)
    once = prune_daily(daily, today)
    assert prune_daily(once, today) == once


def test_sum_period_covers_the_inclusive_range_and_ignores_unattributed() -> None:
    daily: dict = {}
    daily = roll_into_day(daily, "2026-08-01", "z1", 10.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z1", 20.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z2", 5.0, estimated=True, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-15", "z1", 99.0, estimated=False, gap_s=0.0)
    daily.setdefault("2026-08-14", {})[UNATTRIBUTED_KEY] = {"l": 42.0, "closed_l": 42.0}

    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 14)) == 35.0
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/engine/test_metering.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named '...engine.metering'`.

- [ ] **Step 3: Implement**

Create `custom_components/irrigation_maestro/engine/metering.py`:

```python
"""Pure metering arithmetic: how flow becomes litres, and how long we keep them.

No Home Assistant imports and no clock of its own — the caller passes both the
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


def prune_daily(
    daily: DailyLitres, today: date, *, keep_days: int = RETENTION_DAYS
) -> DailyLitres:
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
```

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/pytest tests/engine/test_metering.py -v`
Expected: all PASS.

- [ ] **Step 5: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/engine/metering.py tests/engine/test_metering.py
git commit -m "feat(metering): pure accumulation, daily rollup and 730-day retention

The arithmetic half of continuous water accounting, with no Home Assistant
imports and no clock of its own, mirrored 1:1 by tests/engine/test_metering.py
like every other engine module. est latches true so a day mixing measured
and estimated litres never reports as measured."
```

---

## Task 6: The `water` storage section

**Files:**
- Modify: `custom_components/irrigation_maestro/storage.py:33-57` (defaults + deep merge), `:114-120` (prune), `:197-213` (`drop_zone`), append accessors
- Test: `tests/components/test_storage.py`

**Interfaces:**
- Consumes: `engine.metering.{roll_into_day, prune_daily, sum_period, RETENTION_DAYS, UNATTRIBUTED_KEY, HUB_SCOPE}`.
- Produces, all consumed by Tasks 7, 8, 11, 12:
  - `RuntimeState.add_water(zone_id: str, liters: float, *, day: date, estimated: bool, gap_s: float = 0.0) -> None`
  - `RuntimeState.add_unattributed(scope: str, liters: float, *, day: date, valves_closed: bool) -> None`
  - `RuntimeState.zone_water_total(zone_id: str) -> float`
  - `RuntimeState.zone_water_estimated(zone_id: str) -> float`
  - `RuntimeState.unattributed_total(scope: str | None = None) -> float`
  - `RuntimeState.unattributed_closed(scope: str | None = None) -> float`
  - `RuntimeState.water_for_day(zone_id: str, day: date) -> float`
  - `RuntimeState.water_for_period(start: date, end: date) -> float`
  - `RuntimeState.daily_water() -> DailyLitres` (read-only snapshot, for diagnostics and the card)
  - `RuntimeState.carried_over_for(period_start: date) -> float`
  - `RuntimeState.set_carried_over(period_start: date, liters: float) -> None`

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_storage.py`:

```python
async def test_water_totals_accumulate_and_split_by_provenance(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_water("z1", 10.0, day=day, estimated=False)
    state.add_water("z1", 5.0, day=day, estimated=True)

    assert state.zone_water_total("z1") == 15.0
    assert state.zone_water_estimated("z1") == 5.0
    assert state.water_for_day("z1", day) == 15.0


async def test_unattributed_tracks_closed_valves_separately(hass: HomeAssistant) -> None:
    """Priming litres are unattributed; only the all-closed subset is suspect."""
    state = RuntimeState(hass, "entry_water2")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_unattributed("z1", 2.0, day=day, valves_closed=False)   # master pre-open
    state.add_unattributed("z1", 8.0, day=day, valves_closed=True)    # leak candidate

    assert state.unattributed_total("z1") == 10.0
    assert state.unattributed_closed("z1") == 8.0
    assert state.unattributed_total() == 10.0


async def test_water_survives_a_reload_without_going_backwards(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water3")
    await state.async_load()
    state.add_water("z1", 42.0, day=date(2026, 8, 14), estimated=False)
    await state.async_save()

    reloaded = RuntimeState(hass, "entry_water3")
    await reloaded.async_load()
    assert reloaded.zone_water_total("z1") == 42.0


async def test_a_partial_stored_water_section_is_filled_with_defaults(
    hass: HomeAssistant, hass_storage: dict
) -> None:
    """The defaults merge is shallow, so the sub-dict must be merged explicitly.

    A store written by an earlier build of this feature, or hand-edited, must
    not make every accessor raise KeyError.
    """
    hass_storage["irrigation_maestro.entry_water4"] = {
        "version": 1,
        "data": {"water": {"zones": {"z1": {"total_l": 3.0, "estimated_l": 0.0}}}},
    }
    state = RuntimeState(hass, "entry_water4")
    await state.async_load()

    assert state.zone_water_total("z1") == 3.0
    assert state.unattributed_total() == 0.0
    assert state.daily_water() == {}
    assert state.carried_over_for(date(2026, 8, 1)) == 0.0


async def test_daily_water_is_pruned_to_the_retention_window(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water5")
    await state.async_load()
    today = date(2026, 8, 14)
    state.add_water("z1", 1.0, day=date.fromordinal(today.toordinal() - 731), estimated=False)
    state.add_water("z1", 1.0, day=date.fromordinal(today.toordinal() - 729), estimated=False)
    state.add_water("z1", 1.0, day=today, estimated=False)

    state.prune(today)

    assert len(state.daily_water()) == 2


async def test_dropping_a_zone_keeps_its_history_and_drops_its_counters(
    hass: HomeAssistant,
) -> None:
    """Water that flowed, flowed: deleting the history would rewrite past months.

    The cumulative counters back entities that no longer exist, so they go.
    """
    state = RuntimeState(hass, "entry_water6")
    await state.async_load()
    day = date(2026, 8, 14)
    state.add_water("z1", 10.0, day=day, estimated=False)
    state.add_unattributed("z1", 4.0, day=day, valves_closed=True)

    state.drop_zone("z1")

    assert state.zone_water_total("z1") == 0.0
    assert state.unattributed_total("z1") == 0.0
    assert state.water_for_day("z1", day) == 10.0
    assert state.water_for_period(day, day) == 10.0


async def test_carried_over_applies_only_to_its_own_period(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water7")
    await state.async_load()
    state.set_carried_over(date(2026, 8, 1), 250.0)

    assert state.carried_over_for(date(2026, 8, 1)) == 250.0
    assert state.carried_over_for(date(2026, 9, 1)) == 0.0
```

Add `from datetime import date` and the `RETENTION_DAYS` import if the file lacks them.

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/pytest tests/components/test_storage.py -v -k water or carried`
Expected: FAIL — `AttributeError: 'RuntimeState' object has no attribute 'add_water'`.

- [ ] **Step 3: Implement the defaults, the deep merge and the prune**

In `storage.py`, add to `_default_data()` after `"consumption"`:

```python
            "water": {
                "zones": {},
                "unattributed": {},
                "daily": {},
                "carried_over": {"period_start": None, "liters": 0.0},
            },
```

Replace `async_load` so the water sub-dict is merged too — `storage.py:52-57`'s merge is shallow and a stored `water` dict would arrive without its sub-keys:

```python
    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored is not None:
            data = self._default_data()
            data.update(stored)
            # The top-level merge is shallow. "water" is the one nested section
            # whose sub-keys are read unconditionally, so it is merged one level
            # deeper rather than teaching fifteen accessors to tolerate absence.
            water = self._default_data()["water"]
            water.update(data.get("water") or {})
            data["water"] = water
            self._data = data
```

Extend `prune()` (`storage.py:114-120`) with the daily-water sweep:

```python
        self._data["water"]["daily"] = metering.prune_daily(
            self._data["water"]["daily"], today
        )
```

Add `from .engine import history, metering` to the imports.

- [ ] **Step 4: Implement the accessors**

Append to `RuntimeState`, before `as_dict`:

```python
    # Water accounting ------------------------------------------------------

    @property
    def _water(self) -> dict[str, Any]:
        return self._data["water"]

    def add_water(
        self,
        zone_id: str,
        liters: float,
        *,
        day: date,
        estimated: bool,
        gap_s: float = 0.0,
    ) -> None:
        """Credit litres to a zone: cumulative and daily, in one transaction.

        One writer for both, so the cumulative and the "today"/"this month"
        projections derived from the daily history cannot diverge.
        """
        if liters <= 0 and gap_s <= 0:
            return
        zones = self._water["zones"]
        entry = zones.setdefault(zone_id, {"total_l": 0.0, "estimated_l": 0.0})
        entry["total_l"] = float(entry["total_l"]) + max(liters, 0.0)
        if estimated:
            entry["estimated_l"] = float(entry["estimated_l"]) + max(liters, 0.0)
        self._water["daily"] = metering.roll_into_day(
            self._water["daily"], day.isoformat(), zone_id, liters,
            estimated=estimated, gap_s=gap_s,
        )

    def add_unattributed(
        self, scope: str, liters: float, *, day: date, valves_closed: bool
    ) -> None:
        """Credit litres no zone claimed, splitting off the all-closed subset.

        total_l includes line priming during master pre-open, which happens
        every cycle and is not a leak. closed_l is the subset seen with every
        managed valve closed, and is the only part leak detection reads.
        """
        if liters <= 0:
            return
        entry = self._water["unattributed"].setdefault(scope, {"total_l": 0.0, "closed_l": 0.0})
        entry["total_l"] = float(entry["total_l"]) + liters
        if valves_closed:
            entry["closed_l"] = float(entry["closed_l"]) + liters
        daily = metering.roll_into_day(
            self._water["daily"], day.isoformat(), metering.UNATTRIBUTED_KEY,
            liters, estimated=False, gap_s=0.0,
        )
        record = daily[day.isoformat()][metering.UNATTRIBUTED_KEY]
        record["closed_l"] = float(record.get("closed_l", 0.0)) + (liters if valves_closed else 0.0)
        self._water["daily"] = daily

    def zone_water_total(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("total_l", 0.0))

    def zone_water_estimated(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("estimated_l", 0.0))

    def unattributed_total(self, scope: str | None = None) -> float:
        buckets = self._water["unattributed"]
        if scope is not None:
            return float(buckets.get(scope, {}).get("total_l", 0.0))
        return sum(float(entry.get("total_l", 0.0)) for entry in buckets.values())

    def unattributed_closed(self, scope: str | None = None) -> float:
        buckets = self._water["unattributed"]
        if scope is not None:
            return float(buckets.get(scope, {}).get("closed_l", 0.0))
        return sum(float(entry.get("closed_l", 0.0)) for entry in buckets.values())

    def water_for_day(self, zone_id: str, day: date) -> float:
        return float(
            self._water["daily"].get(day.isoformat(), {}).get(zone_id, {}).get("l", 0.0)
        )

    def water_for_period(self, start: date, end: date) -> float:
        return metering.sum_period(self._water["daily"], start, end)

    def daily_water(self) -> dict[str, Any]:
        """Read-only snapshot of the daily series (diagnostics, card)."""
        return {day: dict(keys) for day, keys in self._water["daily"].items()}

    def carried_over_for(self, period_start: date) -> float:
        """The opening balance, but only for the period it was stamped with."""
        carried = self._water["carried_over"]
        if carried.get("period_start") != period_start.isoformat():
            return 0.0
        return float(carried.get("liters", 0.0))

    def set_carried_over(self, period_start: date, liters: float) -> None:
        self._water["carried_over"] = {
            "period_start": period_start.isoformat(),
            "liters": max(liters, 0.0),
        }
```

- [ ] **Step 5: Extend `drop_zone`**

The existing prefix filter at `storage.py:207-213` is zone-first and does not fit `{day: {zone_id: …}}`. Add an explicit nested rebuild inside `drop_zone`, after the existing loops:

```python
        # Live counters back entities that no longer exist, so they go. The
        # daily history stays: deleting it would rewrite past months and make
        # the derived budget total jump. It ages out at 730 days like the rest.
        self._water["zones"].pop(zone_id, None)
        self._water["unattributed"].pop(zone_id, None)
```

- [ ] **Step 6: Run the storage tests**

Run: `.venv/bin/pytest tests/components/test_storage.py -v`
Expected: all PASS, including the Task 3 round-trip test — update its expected key set to include `"water"`.

- [ ] **Step 7: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/storage.py tests/components/test_storage.py
git commit -m "feat(storage): the water section, with a 730-day daily history

Cumulative per zone, unattributed per meter scope split into total and the
all-closed subset, and a per-day-per-zone summary pruned to 730 days so the
card can draw history without the recorder and without depending on the
user's purge_keep_days.

Two deliberate shapes: add_water writes the cumulative and the daily entry
in one call, so no projection can drift from the total; and drop_zone keeps
the history while dropping the counters, because deleting it would rewrite
past months. The water sub-dict is merged explicitly on load -- the
top-level defaults merge is shallow."
```

---

## Task 7: `MeterLedger` — one integrator per meter

**Files:**
- Create: `custom_components/irrigation_maestro/accounting.py`
- Test: `tests/components/test_metering.py` (create)

**Interfaces:**
- Consumes: `FlowSensorReader`, `FlowReading.available` (Task 4); `engine.metering.accumulate` (Task 5).
- Produces, consumed by Tasks 8 and 9:
  - `MeterSample` — frozen dataclass with `at: datetime`, `lpm: float | None`, `available: bool`, `total_l: float`, `measured_s: float`, `unit_recovered: bool`.
  - `MeterLedger(hass, reader, *, tick_s: float = 30.0)` with `entity_id: str`, `total_l: float`, `unit_known: bool`, `start() -> None`, `stop() -> None`, `subscribe(listener: Callable[[MeterSample], None]) -> CALLBACK_TYPE`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_metering.py`:

```python
"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from datetime import timedelta

from custom_components.irrigation_maestro.accounting import MeterLedger, MeterSample
from custom_components.irrigation_maestro.flow import FlowSensorReader
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .test_session import START, advance


async def _ledger(hass: HomeAssistant) -> tuple[MeterLedger, list[MeterSample]]:
    ledger = MeterLedger(hass, FlowSensorReader(hass, "sensor.flow"))
    samples: list[MeterSample] = []
    ledger.subscribe(samples.append)
    ledger.start()
    return ledger, samples


async def test_the_ledger_integrates_between_ticks(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, _samples = await _ledger(hass)

    await advance(hass, freezer, 120, step=10.0)

    assert 110 <= ledger.total_l <= 130     # 60 L/min for ~2 min
    ledger.stop()


async def test_the_ledger_converts_at_the_boundary(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m3/h is 7.5 L/min, not 0.45."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    ledger, _samples = await _ledger(hass)

    await advance(hass, freezer, 600, step=10.0)

    assert 70 <= ledger.total_l <= 80
    ledger.stop()


async def test_an_unavailable_meter_is_a_gap_not_a_zero(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No interpolation and no phantom zero: the counter simply falls behind."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)

    await advance(hass, freezer, 60, step=10.0)
    before = ledger.total_l
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)

    assert ledger.total_l == before          # nothing accrued across the gap
    assert samples[-1].available is False
    assert samples[-1].measured_s == 0.0
    ledger.stop()


async def test_an_unknown_unit_freezes_the_total(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 60, step=10.0)
    before = ledger.total_l

    hass.states.async_set("sensor.flow", "60", {})   # unit gone
    await advance(hass, freezer, 120, step=10.0)

    assert ledger.total_l == before
    assert ledger.unit_known is False
    assert samples[-1].lpm is None
    ledger.stop()


async def test_recovery_is_published_on_the_state_event(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The zero-flow guard learns of recovery now, not on its next tick."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {})   # unit unknown from the start
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 30, step=10.0)

    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    assert samples[-1].unit_recovered is True
    assert ledger.unit_known is True
    ledger.stop()


async def test_the_total_never_decreases(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 120, step=10.0)
    hass.states.async_set("sensor.flow", "-100", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 60, step=10.0)

    totals = [sample.total_l for sample in samples]
    assert totals == sorted(totals)
    ledger.stop()
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_metering.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named '...accounting'`.

- [ ] **Step 3: Implement `accounting.py` (ledger only)**

Create `custom_components/irrigation_maestro/accounting.py`:

```python
"""Continuous water accounting: one integrator per meter, one attribution rule.

Before this module the component integrated flow only while it was watering, so
a dripping valve, a tap opened by hand and a cycle that ended abnormally were
all invisible to it and visible to any external utility_meter. Integration now
runs whenever the meter reports, and the litres are attributed to whichever zone
has its valve open — or to an unattributed bucket when none has.

This is the one place water becomes litres, exactly as flow.py is the one place
a unit becomes L/min. FlowMonitor consumes the samples this emits; it does not
integrate.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from datetime import timedelta

from .engine.metering import accumulate
from .flow import FlowSensorReader

_LOGGER = logging.getLogger(__name__)

#: How often a quiet meter is sampled anyway. A meter that stops emitting
#: events must still be integrated, and a gap must be noticed within a bounded
#: delay rather than at the end of the run.
DEFAULT_TICK_S = 30.0


@dataclass(frozen=True, slots=True)
class MeterSample:
    """One integration step, published to every subscriber."""

    at: datetime
    #: Current flow, or None when the unit cannot be resolved.
    lpm: float | None
    #: False when no number was read (missing, unavailable, non-numeric).
    available: bool
    #: The meter's cumulative litres after this step. Monotonic.
    total_l: float
    #: Seconds of the interval just closed that were actually measured. Zero
    #: across a gap. Consumers judging a window (the zero-flow guard) compare
    #: this against the window length instead of trusting wall-clock time.
    measured_s: float
    #: True when this sample carries a unit that had been lost. Published
    #: synchronously on the state event, because a consumer that learned of
    #: recovery on its next tick would judge a part-blind window.
    unit_recovered: bool


class MeterLedger:
    """Integrates one flow meter continuously and publishes every step."""

    def __init__(
        self,
        hass: HomeAssistant,
        reader: FlowSensorReader,
        *,
        tick_s: float = DEFAULT_TICK_S,
    ) -> None:
        self._hass = hass
        self._reader = reader
        self._tick_s = tick_s
        self.total_l = 0.0
        self.unit_known = True
        self._last_at: datetime | None = None
        self._last_lpm = 0.0
        self._last_available = False
        self._listeners: list[Callable[[MeterSample], None]] = []
        self._unsubs: list[CALLBACK_TYPE] = []

    @property
    def entity_id(self) -> str:
        return self._reader.entity_id

    def subscribe(self, listener: Callable[[MeterSample], None]) -> CALLBACK_TYPE:
        self._listeners.append(listener)

        @callback
        def _unsub() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _unsub

    def start(self) -> None:
        self._last_at = dt_util.utcnow()
        reading = self._reader.read()
        self._last_lpm = reading.lpm or 0.0
        self._last_available = reading.available
        self.unit_known = reading.unit_known
        self._unsubs.append(
            async_track_state_change_event(self._hass, [self.entity_id], self._on_state)
        )
        self._unsubs.append(
            async_track_time_interval(
                self._hass, self._on_tick, timedelta(seconds=self._tick_s)
            )
        )

    def stop(self) -> None:
        self._integrate(dt_util.utcnow())
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        self._listeners.clear()

    @callback
    def _on_state(self, _event: Event[EventStateChangedData]) -> None:
        self._sample()

    @callback
    def _on_tick(self, _now: datetime) -> None:
        self._sample()

    def _integrate(self, now: datetime) -> float:
        """Close the open interval; returns the seconds that were measured.

        Litres accrue only when the previous reading was both unit-resolvable
        and available. An unknown unit freezes the total at the last certain
        value; a gap contributes nothing and is not interpolated, because a
        plausible number that is silently wrong is worse than a declared
        absence -- and counting zero would assert that no water passed, which
        we have no right to assert.
        """
        if self._last_at is None:
            self._last_at = now
            return 0.0
        elapsed_s = max((now - self._last_at).total_seconds(), 0.0)
        self._last_at = now
        if not self.unit_known or not self._last_available:
            return 0.0
        self.total_l += accumulate(self._last_lpm, elapsed_s)
        return elapsed_s

    def _sample(self) -> None:
        now = dt_util.utcnow()
        measured_s = self._integrate(now)
        reading = self._reader.read()
        recovered = reading.unit_known and not self.unit_known
        self.unit_known = reading.unit_known
        self._last_lpm = reading.lpm or 0.0
        self._last_available = reading.available
        sample = MeterSample(
            at=now,
            lpm=reading.lpm,
            available=reading.available,
            total_l=self.total_l,
            measured_s=measured_s,
            unit_recovered=recovered,
        )
        for listener in list(self._listeners):
            try:
                listener(sample)
            except Exception:  # pragma: no cover - a listener must not stop the ledger
                _LOGGER.exception("Meter ledger listener failed for %s", self.entity_id)
```

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/pytest tests/components/test_metering.py -v`
Expected: all PASS.

- [ ] **Step 5: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/accounting.py tests/components/test_metering.py
git commit -m "feat(accounting): one continuously-integrating ledger per meter

The component integrated flow only while watering, so a dripping valve or a
tap opened by hand were invisible to it and visible to any utility_meter.
The ledger integrates whenever the meter reports, plus a 30 s tick so a
quiet meter is still sampled and a gap is noticed within a bounded delay.

Three semantics, all tested: an unknown unit freezes the total, an
unavailable meter is a gap that accrues nothing rather than a zero, and the
recovery edge is published synchronously on the state event so a consumer
judging a window never mistakes a part-blind one for a whole one."
```

---

## Task 8: `WaterAccountant` — attribution by valve state

**Files:**
- Modify: `custom_components/irrigation_maestro/accounting.py` (append), `runtime.py:1134-1157` (`_track_flow_sensors`), `runtime.py:1079-1088` (`add_consumption`)
- Test: `tests/components/test_metering.py`

**Interfaces:**
- Consumes: `MeterLedger`, `MeterSample` (Task 7); `RuntimeState.add_water` / `add_unattributed` (Task 6); `runtime.zones`, `zone.valve.is_open`, `runtime.master_controller`.
- Produces, consumed by Tasks 9, 11, 12:
  - `WaterAccountant(runtime)` with `start() -> None`, `stop() -> None`, `rebuild() -> None`, `ledger_for(zone: ZoneRuntime) -> MeterLedger | None`, `record_estimate(zone_id: str, liters: float) -> None`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_metering.py`:

```python
async def test_litres_go_to_the_zone_whose_valve_is_open(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.state.zone_water_total(zone_id) > 40
    assert runtime.state.unattributed_total() == 0.0


async def test_litres_with_every_valve_closed_are_unattributed_and_suspect(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "5", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    # Well before the 05:30 trigger: nothing is open.
    await advance(hass, freezer, 600, step=10.0)

    assert runtime.state.zone_water_total(zone_id) == 0.0
    assert runtime.state.unattributed_closed(zone_id) > 40
    assert runtime.state.unattributed_total(zone_id) == runtime.state.unattributed_closed(zone_id)


async def test_a_shared_line_meter_splits_by_nominal_flow(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Two zones on one meter: proportional, not double.

    Before this, both zones integrated the full line flow and both added it to
    the monthly total -- the same water counted twice.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=10.0, order=1),
            zone_data("Beta", "valve.b", minutes=10, nominal_flow_lpm=30.0, order=2),
        ],
        {"line_flow_sensor": "sensor.line", "max_concurrent": 2},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids[0], runtime.zone_ids[1]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    assert hass.states.get("valve.b").state == "open"
    hass.states.async_set("sensor.line", "40", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    total = runtime.state.zone_water_total(alpha) + runtime.state.zone_water_total(beta)
    assert 180 <= total <= 220                                   # 40 L/min x ~5 min, once
    ratio = runtime.state.zone_water_total(beta) / runtime.state.zone_water_total(alpha)
    assert 2.5 <= ratio <= 3.5                                   # 30:10


async def test_a_zone_without_a_meter_gets_a_marked_estimate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    assert 70 <= runtime.state.zone_water_total(zone_id) <= 80
    assert runtime.state.zone_water_estimated(zone_id) == runtime.state.zone_water_total(zone_id)
```

Extend the imports at the top of the file with `from .mocks import MockValvePark` and `mock_weather, setup_hub, zone_data` from `.test_session`.

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_metering.py -v -k "zone or line or estimate"`
Expected: FAIL — the new assertions find zero litres, because nothing writes them yet.

- [ ] **Step 3: Implement `WaterAccountant`**

Append to `accounting.py`:

```python
class WaterAccountant:
    """Owns the ledgers and decides whose water each litre was.

    Attribution follows valve state, not run phase. The phase is necessary and
    not sufficient: PHASE_OPENING covers the whole open-confirm wait, the master
    pre-open pressurises the line while the zone is still queued, and a failed
    close clears the zone from active_runs while its valve is still open --
    which would diagnose a stuck-open valve as a system leak. A valve that
    reports open is watering; that is the physical truth, and it is the same
    predicate leak detection reads.
    """

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self._ledgers: dict[str, MeterLedger] = {}
        self._unsubs: list[CALLBACK_TYPE] = []

    def start(self) -> None:
        self.rebuild()

    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        for ledger in self._ledgers.values():
            ledger.stop()
        self._ledgers.clear()

    def rebuild(self) -> None:
        """Rebuild the ledger set from the current configuration.

        Rebuilt rather than added to, like _track_flow_sensors and
        _schedule_triggers, so repointing a zone's meter takes effect without a
        reload.
        """
        self.stop()
        for entity_id, override in self._resolved_meters().items():
            reader = FlowSensorReader(self._runtime.hass, entity_id, override)
            ledger = MeterLedger(self._runtime.hass, reader)
            self._ledgers[entity_id] = ledger
            self._unsubs.append(
                ledger.subscribe(partial(self._on_sample, entity_id))
            )
            ledger.start()

    def _resolved_meters(self) -> dict[str, str | None]:
        """Every configured meter, once, with the unit override that applies.

        One ledger per entity: keying by (entity, override) would integrate the
        same physical water twice. A zone that owns the meter and declares an
        override wins over the hub's; two zones declaring different overrides
        for one entity is a configuration fault, resolved deterministically by
        zone order and reported.
        """
        meters: dict[str, str | None] = {}
        claimed_by: dict[str, str] = {}
        for zone in sorted(self._runtime.zones.values(), key=lambda z: z.config.order):
            sensor = zone.config.flow_sensor
            if not sensor:
                continue
            if sensor in meters and meters[sensor] != zone.config.flow_sensor_unit:
                self._runtime.report_flow_unit_override_conflict(
                    sensor, claimed_by[sensor], zone.config.name
                )
                continue
            meters[sensor] = zone.config.flow_sensor_unit
            claimed_by[sensor] = zone.config.name
        line = self._runtime.hub.line_flow_sensor
        if line and line not in meters:
            meters[line] = self._runtime.hub.line_flow_sensor_unit
        return meters

    def ledger_for(self, zone: ZoneRuntime) -> MeterLedger | None:
        """The ledger of whichever meter serves this zone, or None."""
        sensor = zone.config.flow_sensor or self._runtime.hub.line_flow_sensor
        return self._ledgers.get(sensor) if sensor else None

    def _claimants(self, entity_id: str) -> list[ZoneRuntime]:
        """Zones fed by this meter whose valve reports open."""
        line = self._runtime.hub.line_flow_sensor
        claimants = []
        for zone in self._runtime.zones.values():
            sensor = zone.config.flow_sensor or line
            if sensor == entity_id and zone.valve.is_open:
                claimants.append(zone)
        return claimants

    def _all_valves_closed(self) -> bool:
        """Every managed valve, master included, reports closed."""
        return not any(
            controller.is_open for controller in self._runtime.all_valve_controllers()
        )

    def _scope_for(self, entity_id: str) -> str:
        """Whose leak this would be: the sole zone on this meter, or the hub."""
        line = self._runtime.hub.line_flow_sensor
        owners = [
            zone.config.zone_id
            for zone in self._runtime.zones.values()
            if (zone.config.flow_sensor or line) == entity_id
        ]
        return owners[0] if len(owners) == 1 else HUB_SCOPE

    @callback
    def _on_sample(self, entity_id: str, sample: MeterSample) -> None:
        liters = sample.total_l - self._last_totals.get(entity_id, 0.0)
        self._last_totals[entity_id] = sample.total_l
        if liters <= 0:
            return
        day = dt_util.as_local(sample.at).date()
        claimants = self._claimants(entity_id)
        state = self._runtime.state
        if not claimants:
            state.add_unattributed(
                self._scope_for(entity_id),
                liters,
                day=day,
                valves_closed=self._all_valves_closed(),
            )
        elif len(claimants) == 1:
            state.add_water(claimants[0].config.zone_id, liters, day=day, estimated=False)
        else:
            weights = [zone.config.nominal_flow_lpm or 0.0 for zone in claimants]
            total_weight = sum(weights)
            if total_weight <= 0:
                weights = [1.0] * len(claimants)
                total_weight = float(len(claimants))
            for zone, weight in zip(claimants, weights, strict=True):
                state.add_water(
                    zone.config.zone_id,
                    liters * weight / total_weight,
                    day=day,
                    estimated=False,
                )
        state.schedule_save()

    def record_estimate(self, zone_id: str, liters: float) -> None:
        """Litres for a zone with no meter: nominal rate x minutes, marked.

        Cycle-scoped on purpose. There is nothing to integrate continuously
        without a meter, and an estimate must never be presented as a
        measurement.
        """
        if liters <= 0:
            return
        self._runtime.state.add_water(
            zone_id, liters, day=dt_util.now().date(), estimated=True
        )
        self._runtime.state.schedule_save()
```

Add to the module imports: `from functools import partial`, `from typing import TYPE_CHECKING`, `from .engine.metering import HUB_SCOPE, accumulate`, and under `TYPE_CHECKING` import `IrrigationRuntime` and `ZoneRuntime` from `.runtime`. Add `self._last_totals: dict[str, float] = {}` to `WaterAccountant.__init__` and reset it in `rebuild`.

- [ ] **Step 4: Wire it into the runtime**

In `runtime.py`, add `self.accountant = WaterAccountant(self)` where the other collaborators are constructed, call `self.accountant.start()` alongside `_start_trackers()`, `self.accountant.stop()` in the teardown that unsubscribes the trackers, and `self.accountant.rebuild()` at the end of `_track_flow_sensors` so a config change rebuilds both together.

Replace `add_consumption` (`runtime.py:1081-1088`) with a version that routes the meterless estimate through the accountant and no longer keeps its own total:

```python
    def add_consumption(self, zone: ZoneRuntime, liters: float, *, minutes: float) -> None:
        """Close out a cycle's accounting for a zone with no usable meter.

        Metered litres are already in the ledger, continuously: adding them
        again here would count the same water twice. What is left is the
        estimate for a zone that has nothing to integrate.
        """
        if liters > 0:
            return
        if zone.config.nominal_flow_lpm is None:
            return
        self.accountant.record_estimate(
            zone.config.zone_id, zone.config.nominal_flow_lpm * minutes
        )
```

Add `report_flow_unit_override_conflict` next to the other repair reporters:

```python
    def report_flow_unit_override_conflict(self, entity_id: str, first: str, second: str) -> None:
        """Two zones read one meter under different unit overrides.

        One ledger per meter means one interpretation; this names both zones
        rather than silently applying whichever was parsed first.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_override_conflict_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_override_conflict",
            translation_placeholders={
                "entity_id": entity_id,
                "first": first,
                "second": second,
            },
        )
```

Add the `flow_unit_override_conflict` issue strings to `translations/en.json` and `translations/it.json`, next to `flow_unit_unknown`. Italian uses **flussometro**.

- [ ] **Step 5: Run the metering tests**

Run: `.venv/bin/pytest tests/components/test_metering.py -v`
Expected: all PASS.

- [ ] **Step 6: Run the whole suite and expect two known failures**

Run: `.venv/bin/pytest -q`
Expected: `test_consumption_counts_real_litres_from_a_cubic_metre_meter` and `test_a_zone_without_a_meter_still_estimates_from_the_nominal_rate` FAIL — they read `state.consumption_liters`, which no longer receives cycle litres. They are fixed in Task 11, which is where the budget moves to the derived total. Do not fix them here; note them and continue.

- [ ] **Step 7: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/accounting.py custom_components/irrigation_maestro/runtime.py custom_components/irrigation_maestro/translations tests/components/test_metering.py
git commit -m "feat(accounting): attribute litres by valve state, split a shared meter

A zone claims its meter while its valve reports open. The run phase is
necessary and not sufficient: PHASE_OPENING covers the whole open-confirm
wait, the master pre-open pressurises the line while the zone is still
queued, and a failed close clears the zone from active_runs while its valve
is still open -- which would have diagnosed a stuck-open valve as a system
leak.

This also fixes a shipped double count: two zones on one line meter each
integrated the full line flow and each added it to the monthly total. They
now split it in proportion to their nominal rates.

Unattributed litres are credited per meter scope, so a meter inside one
valve localises the leak on that valve, and are split into total and the
all-closed subset so per-cycle line priming never reads as suspect."
```

---

## Task 9: `FlowMonitor` becomes a ledger subscriber

**Files:**
- Modify: `custom_components/irrigation_maestro/session.py:104-286` (`FlowMonitor`), `:949-967` (construction)
- Test: `tests/components/test_safety_extra.py` (existing tests must pass unchanged)

**Interfaces:**
- Consumes: `MeterLedger`, `MeterSample` (Task 7); `WaterAccountant.ledger_for` (Task 8).
- Produces: `FlowMonitor(runtime, ledger, *, volume_target_l, expected_lpm, on_no_flow, on_volume_reached)` — the second positional argument changes from `FlowSensorReader` to `MeterLedger`. `start()`, `stop() -> float`, `.liters`, `.unit_known` keep their meaning.

- [ ] **Step 1: Rewrite `FlowMonitor` against the ledger**

Replace the body of `FlowMonitor` in `session.py`, keeping the class docstring's rules intact and updating what it says about integration:

```python
class FlowMonitor:
    """Watches a run's flow for anomalies. It no longer integrates.

    Litres come from the meter's ledger, which integrates continuously whether
    or not anything is watering; this holds a baseline and reads deltas. One
    integrator per meter, so a run's volume and the zone's cumulative total can
    never disagree.

    The rules that survive unchanged: a reading whose unit cannot be determined
    accumulates nothing, chases no volume target, checks no range, and above all
    does NOT trip the zero-flow guard, which would otherwise interrupt every run
    on such a meter. A window that was only partly measured is skipped for the
    same reason — the grace window elapses on the wall clock whether or not the
    meter was readable.
    """

    ZERO_FLOW_GRACE_S = 120
    ZERO_FLOW_EPSILON_L = 0.1
    RANGE_SUSTAIN_S = 120

    def __init__(
        self,
        runtime: IrrigationRuntime,
        ledger: MeterLedger,
        *,
        volume_target_l: int | None,
        expected_lpm: Callable[[], tuple[float, float] | None],
        on_no_flow: Callable[[], None],
        on_volume_reached: Callable[[], None],
    ) -> None:
        self._runtime = runtime
        self._ledger = ledger
        self._sensor = ledger.entity_id
        self._volume_target = volume_target_l
        self._expected_lpm = expected_lpm
        self._on_no_flow = on_no_flow
        self._on_volume_reached = on_volume_reached
        self.liters = 0.0
        self._baseline = 0.0
        self._last_lpm = 0.0
        self._liters_at_last_check = 0.0
        self._measured_s_in_window = 0.0
        self._periodic_unsub: CALLBACK_TYPE | None = None
        self._out_of_range_since: datetime | None = None
        self._range_notified = False
        self._unsubs: list[CALLBACK_TYPE] = []
        self.unit_known = True
        self._unit_recovered = False

    def start(self) -> None:
        self._baseline = self._ledger.total_l
        self.liters = 0.0
        self._liters_at_last_check = 0.0
        self._measured_s_in_window = 0.0
        self.unit_known = self._ledger.unit_known
        if self.unit_known:
            # Unconditionally, not on a transition: a meter fixed between runs
            # never presents a False->True edge and would otherwise keep its
            # repair for the life of the process. Deleting an issue that is not
            # there is a no-op.
            self._runtime.clear_flow_unit_unknown(self._sensor)
        self._unsubs.append(self._ledger.subscribe(self._on_sample))
        self._schedule_periodic_check()

    def _schedule_periodic_check(self) -> None:
        self._periodic_unsub = async_call_later(
            self._runtime.hass, self.ZERO_FLOW_GRACE_S, self._periodic_check
        )
        self._unsubs.append(self._periodic_unsub)

    def stop(self) -> float:
        self.liters = self._ledger.total_l - self._baseline
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        return self.liters

    @callback
    def _on_sample(self, sample: MeterSample) -> None:
        self.liters = sample.total_l - self._baseline
        self._measured_s_in_window += sample.measured_s
        self._last_lpm = sample.lpm or 0.0
        if sample.unit_recovered:
            # The window this happened in is now part blind, part measured;
            # _periodic_check must not judge it. Cleared when it consumes it.
            self._unit_recovered = True
            # Nothing was range-checked while the unit was unknown, so a
            # timestamp from before the loss plus one reading after it would
            # report as "sustained" an interval that was mostly unobserved.
            self._out_of_range_since = None
            self._runtime.clear_flow_unit_unknown(self._sensor)
        was_known = self.unit_known
        self.unit_known = sample.lpm is not None
        if was_known and not self.unit_known:
            # Report once per transition, not once per state change.
            self._runtime.report_flow_unit_unknown(self._sensor)
            self._runtime.report_flow_unit_lost(self._sensor)
        # Above the unit_known gate deliberately: these litres are the frozen,
        # certain ones, and this sample may be the one that lost the unit after
        # the ledger had already carried them past the target. Water certainly
        # delivered still finishes the run.
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        if not self.unit_known:
            return
        self._check_range(sample.at)

    @callback
    def _periodic_check(self, _now: Any) -> None:
        """Recurring guard: supply failure mid-run, on the run's own clock."""
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        blind = not self.unit_known or self._unit_recovered
        # A window nobody could measure in full cannot be weighed against a
        # full window's threshold. Judge the next whole one instead.
        partly_blind = self._measured_s_in_window < self.ZERO_FLOW_GRACE_S * 0.5
        self._unit_recovered = False
        delta = self.liters - self._liters_at_last_check
        self._liters_at_last_check = self.liters
        self._measured_s_in_window = 0.0
        if blind or partly_blind:
            self._schedule_periodic_check()
            return
        if delta < self.ZERO_FLOW_EPSILON_L:
            self._on_no_flow()
            return
        self._schedule_periodic_check()

    def _check_range(self, now: datetime) -> None:
        expected = self._expected_lpm()
        if expected is None or self._range_notified or not self.unit_known:
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
```

Update the imports in `session.py`: drop `FlowSensorReader` if unused, add `from .accounting import MeterLedger, MeterSample`.

- [ ] **Step 2: Update the construction site**

In `_water` (`session.py:949-960`), replace the reader lookup with the ledger:

```python
        monitor: FlowMonitor | None = None
        ledger = self._runtime.accountant.ledger_for(zone)
        if ledger is not None:
            monitor = FlowMonitor(
                self._runtime,
                ledger,
                volume_target_l=segment.run.volume_l,
                expected_lpm=self._runtime.expected_flow_range,
                on_no_flow=lambda: _finish("no_flow"),
                on_volume_reached=lambda: _finish("done"),
            )
            monitor.start()
```

- [ ] **Step 3: Run the safety suite**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py -v`
Expected: all PASS, including the two characterisation tests from Task 1. If the zero-flow tests fail on timing, check that `_schedule_periodic_check` still anchors to the monitor's own `async_call_later` chain and not to the ledger's 30 s tick — `test_safety_extra.py:518-528` and `:590-598` compute checkpoints from `ActiveRun.started_at`.

- [ ] **Step 4: Write the mid-cycle restart test**

Create `tests/components/test_metering_restart.py`:

```python
"""A restart in the middle of a cycle must not double-count or go backwards.

A total_increasing sensor that jumps back or resets confuses Home Assistant's
statistics, and litres counted twice are worse than litres missed: the first
is a wrong number presented as right, the second is a declared gap.
"""

from datetime import date

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def test_a_restart_mid_cycle_neither_doubles_nor_rewinds(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=20, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    before = runtime.state.zone_water_total(zone_id)
    assert before > 40
    await runtime.state.async_save()

    # Reload the entry: the queue is memory-only and the watchdog closes what
    # it finds open, exactly as after a real restart.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data

    after = reloaded.state.zone_water_total(zone_id)
    assert after >= before                       # never backwards
    assert after <= before + 1.0                 # and not re-counted

    # The interval spanning the restart is a gap, not a double count: the
    # ledger restarts from now rather than resuming from the old timestamp.
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)
    assert reloaded.state.zone_water_total(zone_id) >= after


async def test_the_daily_entry_matches_the_cumulative_after_a_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One writer for both, so a reload cannot split them apart."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)
    await runtime.state.async_save()

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data

    assert reloaded.state.water_for_day(zone_id, date(2026, 7, 17)) == pytest.approx(
        reloaded.state.zone_water_total(zone_id)
    )
```

Add `import pytest` at the top.

- [ ] **Step 5: Run it**

Run: `.venv/bin/pytest tests/components/test_metering_restart.py -v`
Expected: both PASS. If the first fails with `after > before + 1.0`, the ledger is resuming from a persisted timestamp instead of `now` — check `MeterLedger.start`, which must set `_last_at = dt_util.utcnow()` and nothing else.

- [ ] **Step 6: Run the whole suite**

Run: `.venv/bin/pytest -q`
Expected: only the two known consumption failures from Task 8 Step 6.

- [ ] **Step 7: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/session.py tests/components/test_metering_restart.py
git commit -m "refactor(session): FlowMonitor consumes the ledger instead of integrating

Two integrators over one meter were two numbers for the same water. The
monitor now holds a baseline and reads deltas from the meter's ledger, so a
run's volume and the zone's cumulative total cannot disagree.

Everything else is preserved deliberately: the volume target is still
compared above the unit_known gate, the zero-flow guard still runs on the
run's own clock anchored to started_at, and a window that was only partly
measured is still skipped -- now decided by the sample's measured_s rather
than by a boolean, which is the same rule with the arithmetic made visible."
```

---

## Task 10: Migration — seed `carried_over`, drop `consumption`

**Files:**
- Modify: `custom_components/irrigation_maestro/migration.py` (append), `storage.py` (call it), `runtime.py:919-962` area (repair reporter)
- Test: `tests/components/test_storage.py`

**Interfaces:**
- Consumes: `RuntimeState.set_carried_over` (Task 6).
- Produces: `migration.seed_carried_over_and_drop_consumption(data: dict[str, Any], today: date) -> bool` — returns True when it changed anything, so the caller can raise the notice exactly once.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_storage.py`:

```python
def test_consumption_is_carried_over_then_removed() -> None:
    data = {
        "consumption": {"period_start": "2026-08-01", "liters": 250.0},
        "water": {"zones": {}, "unattributed": {}, "daily": {},
                  "carried_over": {"period_start": None, "liters": 0.0}},
    }
    changed = seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))

    assert changed is True
    assert "consumption" not in data
    assert data["water"]["carried_over"] == {"period_start": "2026-08-01", "liters": 250.0}


def test_the_carry_over_migration_is_idempotent() -> None:
    data = {
        "consumption": {"period_start": "2026-08-01", "liters": 250.0},
        "water": {"zones": {}, "unattributed": {}, "daily": {},
                  "carried_over": {"period_start": None, "liters": 0.0}},
    }
    seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))
    before = dict(data["water"]["carried_over"])

    assert seed_carried_over_and_drop_consumption(data, date(2026, 8, 14)) is False
    assert data["water"]["carried_over"] == before


def test_a_stale_period_is_not_carried_into_the_current_one() -> None:
    """A counter from July must not become August's opening balance."""
    data = {
        "consumption": {"period_start": "2026-07-01", "liters": 900.0},
        "water": {"zones": {}, "unattributed": {}, "daily": {},
                  "carried_over": {"period_start": None, "liters": 0.0}},
    }
    seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))

    assert "consumption" not in data
    assert data["water"]["carried_over"]["liters"] == 0.0
```

Import `seed_carried_over_and_drop_consumption` from `custom_components.irrigation_maestro.migration`.

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_storage.py -v -k carried`
Expected: FAIL — `ImportError: cannot import name 'seed_carried_over_and_drop_consumption'`.

- [ ] **Step 3: Implement the migration**

Append to `migration.py`:

```python
def seed_carried_over_and_drop_consumption(data: dict[str, Any], today: date) -> bool:
    """Turn the standalone monthly counter into an opening balance, then drop it.

    The monthly total is not merely displayed: _consumption_factor drives
    reduce and suspend. Zeroing it mid-month would silently stop the budget
    enforcing for the rest of the period, so the old value is carried as an
    explicit balance stamped with its own period — it expires by itself at the
    next boundary rather than living on as a second counter of the same water.

    A counter from an earlier period is dropped rather than carried: it is not
    this period's water.

    Idempotent: the key is removed on the first pass, and a data set without it
    is left exactly as found. Removing it from _default_data would not be
    enough — the defaults merge copies unknown stored keys through verbatim and
    re-saves them.
    """
    consumption = data.pop("consumption", None)
    if consumption is None:
        return False
    period_start = today.replace(day=1)
    stored_start = consumption.get("period_start")
    liters = float(consumption.get("liters", 0.0))
    if stored_start == period_start.isoformat() and liters > 0:
        data.setdefault("water", {})["carried_over"] = {
            "period_start": period_start.isoformat(),
            "liters": liters,
        }
    return True
```

Add `from datetime import date` to the imports.

- [ ] **Step 4: Call it from storage and raise the notice**

In `storage.py`, add a method next to `migrate_markers`:

```python
    def migrate_consumption(self, today: date) -> bool:
        """Carry the old monthly counter into an opening balance (3.3.0)."""
        return migrate.seed_carried_over_and_drop_consumption(self._data, today)
```

Import it as `from . import migration as migrate` alongside the existing `from .migration import migrate_last_completed`.

In `runtime.py`, where `migrate_markers` is invoked at setup (`runtime.py:125-132`), call it and raise the notice once:

```python
        if self.state.migrate_consumption(dt_util.now().date()):
            self.report_consumption_history_restarted()
```

Add the reporter beside the other repair reporters:

```python
    def report_consumption_history_restarted(self) -> None:
        """The monthly total now derives from per-zone daily litres (3.3.0).

        Modelled on the 3.2.0 rescale notice: the carried balance mixes litres
        measured through a meter with litres estimated as nominal x minutes and
        has no daily breakdown, so this month's chart starts at the upgrade
        while the budget total still includes the balance. Both self-heal at
        the next period boundary.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "consumption_history_restarted",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="consumption_history_restarted",
        )
```

Add the `consumption_history_restarted` strings to `translations/en.json` and `translations/it.json` under `issues`.

- [ ] **Step 5: Run the tests**

Run: `.venv/bin/pytest tests/components/test_storage.py -v`
Expected: all PASS. Update the Task 3 round-trip key set: `"consumption"` is gone after a load, `"water"` is present.

- [ ] **Step 6: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/migration.py custom_components/irrigation_maestro/storage.py custom_components/irrigation_maestro/runtime.py custom_components/irrigation_maestro/translations tests/components/test_storage.py
git commit -m "feat(migration): carry the monthly counter as an opening balance

The standalone counter is gone, but it cannot simply be zeroed: it drives
reduce and suspend, not just a sensor, so an upgrade mid-month would have
silently stopped the budget enforcing for the rest of the period. The old
value becomes carried_over, stamped with its period and expiring by itself
at the next boundary -- an addend named for what it is, not a second
counter of the same water. A counter from an earlier period is dropped
rather than carried.

Idempotent, and it pops the key explicitly: removing it from the defaults
would not delete it, because the defaults merge copies unknown stored keys
through verbatim and re-saves them."
```

---

## Task 11: The budget derives from the daily history

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py:496-513`, `sensor.py:174-203`
- Test: `tests/components/test_budget.py`, `tests/components/test_session.py:617-655`

**Interfaces:**
- Consumes: `RuntimeState.water_for_period`, `carried_over_for` (Task 6).
- Produces: `IrrigationRuntime.consumption_used_liters() -> float` — the period total every consumer reads.

- [ ] **Step 1: Write the failing reconciliation test**

Append to `tests/components/test_budget.py`:

```python
async def test_the_budget_total_is_the_sum_of_the_zones(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One number, derived, so a zone total and the budget cannot diverge."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)],
        {"consumption_budget": {"liters_per_month": 1000, "action": "notify"}},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    assert runtime.consumption_used_liters() == runtime.state.zone_water_total(zone_id)


async def test_the_carried_balance_is_included_then_expires(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)                       # July 2026
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data
    runtime.state.set_carried_over(date(2026, 7, 1), 250.0)

    assert runtime.consumption_used_liters() == 250.0

    freezer.move_to("2026-08-02 05:00:00+00:00")
    assert runtime.consumption_used_liters() == 0.0


async def test_unattributed_water_stays_out_of_the_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A leak must not suspend irrigation through the budget action."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10)],
        {"consumption_budget": {"liters_per_month": 100, "action": "suspend"}},
    )
    runtime = entry.runtime_data
    runtime.state.add_unattributed(
        "__hub__", 5000.0, day=date(2026, 7, 17), valves_closed=True
    )

    assert runtime.consumption_used_liters() == 0.0
    assert runtime._consumption_factor() == (1.0, False)
```

Add `from datetime import date` to the imports.

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_budget.py -v -k "sum or carried or unattributed"`
Expected: FAIL — `AttributeError: 'IrrigationRuntime' object has no attribute 'consumption_used_liters'`.

- [ ] **Step 3: Implement**

In `runtime.py`, add the derived total and route both consumers through it:

```python
    def consumption_used_liters(self) -> float:
        """Attributed litres this period: the carried balance plus the daily sum.

        Derived, never stored: one number for the water, so a per-zone total and
        the budget cannot drift apart. Unattributed water is excluded on
        purpose — letting a leak into the budget would let it suspend
        irrigation, the right consequence from the wrong cause.
        """
        today = dt_util.now().date()
        period_start = today.replace(day=1)
        return self.state.carried_over_for(period_start) + self.state.water_for_period(
            period_start, today
        )
```

Change `_consumption_factor` line 499 and `_notify_budget_exceeded_once` to read it:

```python
        budget = self.hub.consumption_budget_liters
        used = self.consumption_used_liters()
        if budget is None or used < budget:
            return 1.0, False
```

and in `_notify_budget_exceeded_once`, replace `self.state.consumption_liters` with a local `used = self.consumption_used_liters()` and `self.state.consumption_period_start` with `dt_util.now().date().replace(day=1)`.

In `sensor.py`, `HubConsumptionLeftSensor`:

```python
    @property
    def native_value(self) -> float | None:
        budget = self._runtime.hub.consumption_budget_liters
        if budget is None:
            return None
        return round(budget - self._runtime.consumption_used_liters(), 1)

    def _role_attributes(self) -> dict[str, Any]:
        runtime = self._runtime
        period_start = dt_util.now().date().replace(day=1)
        return {
            "budget_liters": runtime.hub.consumption_budget_liters,
            "used_liters": round(runtime.consumption_used_liters(), 1),
            "unattributed_liters": round(runtime.state.unattributed_total(), 1),
            "period_start": period_start.isoformat(),
            "action": runtime.hub.consumption_action,
        }
```

- [ ] **Step 4: Fix the two tests that encode the old assumption**

In `tests/components/test_session.py`, rewrite both:

```python
async def test_consumption_counts_real_litres_from_a_cubic_metre_meter(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m³/h for ten minutes is 75 L, not 4.5 L.

    The meter is driven to zero outside the run window: integration is now
    continuous, so a meter parked at 0.45 m³/h for the whole advance would
    report flow through the ~32 minutes the valve is closed as well. The 4.5 L
    sentinel this test exists to catch is unchanged -- it is far below the
    bound either way.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "m³/h"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")],
        {"consumption_budget": {"liters_per_month": 1000, "action": "notify"}},
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await advance(hass, freezer, 10 * 60, step=10.0)
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "m³/h"})
    await advance(hass, freezer, 60)

    runtime = entry.runtime_data
    # ~7.5 L/min for ~10 min. Generous bounds: the exact figure depends on when
    # the ledger samples, but 4.5 L (the un-converted answer) is far below.
    assert 60 <= runtime.consumption_used_liters() <= 90


async def test_a_zone_without_a_meter_still_estimates_from_the_nominal_rate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The fallback path is canonical L/min too, so both roads agree."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)],
    )
    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)
    runtime = entry.runtime_data
    assert 70 <= runtime.consumption_used_liters() <= 80
    assert runtime.state.zone_water_estimated(runtime.zone_ids[0]) > 0
```

- [ ] **Step 5: Delete the obsolete storage test and accessors**

`test_storage.py::test_consumption_period_reset` encodes reset-on-write semantics that no longer exist. Delete it, and delete `RuntimeState.consumption_liters`, `consumption_period_start` and `add_consumption` from `storage.py:225-243` once nothing imports them.

Run: `grep -rn "consumption_liters\|add_consumption\|consumption_period_start" custom_components tests` — the only survivor should be `runtime.add_consumption`, which is the cycle-end estimate hook from Task 8.

- [ ] **Step 6: Run everything**

Run: `.venv/bin/pytest -q`
Expected: **all PASS**, including the four Task 2 budget tests unchanged (they set the counter through the removed `state.add_consumption` — update them to use `state.set_carried_over(date(2026, 7, 1), 150.0)` instead, which is the same fact expressed in the new model).

- [ ] **Step 7: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add -A
git commit -m "feat(budget): derive the monthly total from per-zone daily litres

Two counters measuring the same water could diverge, so there is now one:
the period total is the carried balance plus the sum of the daily per-zone
history. Unattributed water is deliberately excluded -- letting a leak into
the budget would let it suspend irrigation through BUDGET_ACTION_SUSPEND,
the right consequence from the wrong cause -- and is exposed alongside it as
an attribute instead.

test_consumption_counts_real_litres_from_a_cubic_metre_meter is corrected
rather than ported: it parked its meter at 0.45 m3/h for the whole advance,
which under continuous integration reports flow through the ~32 minutes the
valve is closed too. Its 4.5 L un-converted sentinel is unchanged.
test_consumption_period_reset is deleted: it encoded the reset-on-write
semantics this commit removes."
```

---

## Task 12: The water sensors

**Files:**
- Modify: `custom_components/irrigation_maestro/sensor.py:37-64` (setup), `:274-300` (`_degraded`), append two classes
- Test: `tests/components/test_entities.py`

**Interfaces:**
- Consumes: `RuntimeState` water accessors (Task 6), `runtime.consumption_used_liters` (Task 11).
- Produces: roles `zone_water_total` and `hub_unattributed_water`, consumed by Task 13's card work.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_entities.py`:

```python
async def test_the_zone_water_sensor_is_a_statistics_grade_total(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """device_class water + total_increasing is what feeds long-term statistics."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)]
    )
    runtime = entry.runtime_data
    state = role_state(hass, "zone_water_total", zone_id=runtime.zone_ids[0])

    assert state.attributes["device_class"] == "water"
    assert state.attributes["state_class"] == "total_increasing"
    assert state.attributes["unit_of_measurement"] == "L"


async def test_an_estimated_zone_is_marked_estimated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)]
    )
    runtime = entry.runtime_data
    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    state = role_state(hass, "zone_water_total", zone_id=runtime.zone_ids[0])
    assert state.attributes["estimated"] is True
    assert state.attributes["source"] == "nominal"


async def test_the_unattributed_sensor_separates_priming_from_suspect_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data
    day = dt_util.now().date()
    runtime.state.add_unattributed("__hub__", 3.0, day=day, valves_closed=False)
    runtime.state.add_unattributed("__hub__", 7.0, day=day, valves_closed=True)
    runtime.dispatch_update()
    await hass.async_block_till_done()

    state = role_state(hass, "hub_unattributed_water")
    assert float(state.state) == 10.0
    assert state.attributes["closed_l"] == 7.0


async def test_a_zone_on_the_line_meter_is_declared_shared_even_when_cleared(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Empty string is a reachable way of saying "no meter" (runtime.py:240).

    sensor.py used `is None` here, so a zone whose meter was cleared fed from
    the line meter without being labelled -- and the label is the set the
    attribution index must reproduce.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="")],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    state = role_state(hass, "zone_state", zone_id=runtime.zone_ids[0])
    assert "line_meter_shared" in state.attributes["degraded"]
```

Use whatever `role_state` helper `test_entities.py` already defines; if its signature differs, adapt these calls to it rather than adding a second helper.

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/pytest tests/components/test_entities.py -v -k "water or shared"`
Expected: FAIL — the roles do not exist and `line_meter_shared` is absent.

- [ ] **Step 3: Implement the two sensors**

Append to `sensor.py`:

```python
class ZoneWaterTotalSensor(MaestroZoneEntity, SensorEntity):
    """Cumulative water for one zone, in litres.

    device_class water + state_class total_increasing is not decoration: it is
    what makes Home Assistant record the sensor in long-term statistics and
    offer it to the Water dashboard, which is where daily, monthly and yearly
    totals come from. That is why no "today" or "this month" entity exists —
    the statistics engine already produces them, and a second entity holding
    the same fact is a second thing that can be wrong.

    today_l and month_l are attributes, projected from the same daily history
    that add_water writes in the same call that increments this total, so the
    card can render a number without querying the recorder and without a value
    that can drift from the total it is a slice of.
    """

    _attr_device_class = SensorDeviceClass.WATER
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_suggested_display_precision = 1

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        super().__init__(runtime, zone_id, "zone_water_total")

    @property
    def native_value(self) -> float:
        return round(self._runtime.state.zone_water_total(self._zone_id), 3)

    def _role_attributes(self) -> dict[str, Any]:
        runtime = self._runtime
        state = runtime.state
        total = state.zone_water_total(self._zone_id)
        estimated = state.zone_water_estimated(self._zone_id)
        today = dt_util.now().date()
        config = self.zone_config
        if estimated <= 0:
            source = "measured"
        elif estimated >= total:
            source = "nominal"
        else:
            source = "mixed"
        return {
            "estimated": estimated > 0,
            "source": source,
            "today_l": round(state.water_for_day(self._zone_id, today), 1),
            "month_l": round(
                state.water_for_period(today.replace(day=1), today), 1
            ),
            "meter_entity": (
                (config.flow_sensor or runtime.hub.line_flow_sensor) if config else None
            ),
        }


class HubUnattributedWaterSensor(MaestroHubEntity, SensorEntity):
    """Water no zone claimed.

    total_l includes the line priming that happens during master_pre_open_s on
    every cycle, which is real water belonging to no zone and is not a leak.
    closed_l is the subset measured while every managed valve reported closed,
    and it is the only part leak detection reads.
    """

    _attr_device_class = SensorDeviceClass.WATER
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_suggested_display_precision = 1

    def __init__(self, runtime: IrrigationRuntime) -> None:
        super().__init__(runtime, "hub_unattributed_water")

    @property
    def native_value(self) -> float:
        return round(self._runtime.state.unattributed_total(), 3)

    def _role_attributes(self) -> dict[str, Any]:
        state = self._runtime.state
        return {
            "closed_l": round(state.unattributed_closed(), 3),
            "per_scope": {
                scope: round(state.unattributed_total(scope), 1)
                for scope in (*self._runtime.zone_ids, "__hub__")
                if state.unattributed_total(scope) > 0
            },
        }
```

Add `SensorStateClass` to the `homeassistant.components.sensor` import. Register both in `async_setup_entry`: `HubUnattributedWaterSensor(runtime)` in `hub_entities`, `ZoneWaterTotalSensor(runtime, zone_id)` in `_zone_sensors`.

- [ ] **Step 4: Fix the `line_meter_shared` truthiness bug**

In `_degraded` (`sensor.py:291`):

```python
        elif not config.flow_sensor and runtime.hub.line_flow_sensor:
            degraded.append("line_meter_shared")
```

- [ ] **Step 5: Add the entity translations**

Add `zone_water_total` and `hub_unattributed_water` under `entity.sensor` in `translations/en.json` and `translations/it.json`. Italian: *"Acqua totale"* and *"Acqua non attribuita"*.

- [ ] **Step 6: Run the entity tests and the whole suite**

Run: `.venv/bin/pytest tests/components/test_entities.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 7: Lint, type-check, commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add -A
git commit -m "feat(sensor): per-zone cumulative water and the unattributed total

device_class water + total_increasing makes both sensors eligible for
long-term statistics and the Water dashboard, which is where daily, monthly
and yearly totals come from -- so no today/this-month entities exist. Those
two numbers are attributes projected from the same daily history that
add_water writes in the same call that increments the total, so they cannot
drift from the total they are a slice of.

Also fixes line_meter_shared, which used `is None` where the runtime uses
truthiness: a zone whose meter was cleared to \"\" fed from the line meter
without being labelled, and that label is exactly the set the attribution
index reproduces."
```

---

## Task 13: Card — capability badges and litres in the zone row

**Files:**
- Modify: `docs/design/card-contract.md`, `card/src/types.ts`, `card/src/discovery.ts`, `card/src/zone-row.ts`, `card/src/localize/en.ts`, `card/src/localize/it.ts`
- Test: `card/src/discovery.test.ts`

**Interfaces:**
- Consumes: the `zone_water_total` and `hub_unattributed_water` roles (Task 12).
- Produces: `waterSummary(zone: ZoneEntities): WaterSummary | null` in `discovery.ts` — a pure helper, so the logic is tested even though there is no `zone-row.test.ts` harness.

- [ ] **Step 1: Document the contract first**

Add both roles to `docs/design/card-contract.md` with their exact attribute sets, next to the existing zone roles. The card is built against this document; it is the source, not a summary.

- [ ] **Step 2: Write the failing helper test**

Append to `card/src/discovery.test.ts`:

```typescript
describe("waterSummary", () => {
  it("returns null when the zone has no water sensor", () => {
    expect(waterSummary({ zone_water_total: undefined } as never)).toBeNull();
  });

  it("reports measured litres with today and month", () => {
    const summary = waterSummary({
      zone_water_total: {
        entity_id: "sensor.a_water",
        state: "1284.6",
        attributes: {
          maestro_role: "zone_water_total",
          estimated: false,
          source: "measured",
          today_l: 41.2,
          month_l: 612.5,
        },
      },
    } as never);
    expect(summary).toEqual({
      total: 1284.6,
      today: 41.2,
      month: 612.5,
      estimated: false,
    });
  });

  it("marks an estimated zone so the row can badge it", () => {
    const summary = waterSummary({
      zone_water_total: {
        entity_id: "sensor.a_water",
        state: "300",
        attributes: {
          maestro_role: "zone_water_total",
          estimated: true,
          source: "nominal",
          today_l: 75,
          month_l: 300,
        },
      },
    } as never);
    expect(summary?.estimated).toBe(true);
  });

  it("treats an unavailable sensor as no summary rather than zero", () => {
    expect(
      waterSummary({
        zone_water_total: {
          entity_id: "sensor.a_water",
          state: "unavailable",
          attributes: { maestro_role: "zone_water_total" },
        },
      } as never),
    ).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd card && npx vitest run src/discovery.test.ts`
Expected: FAIL — `waterSummary is not exported`.

- [ ] **Step 4: Implement the helper, the types and the row**

In `card/src/types.ts`, add `zone_water_total` to the zone entity map and `hub_unattributed_water` to the hub map, plus:

```typescript
export interface WaterSummary {
  total: number;
  today: number;
  month: number;
  estimated: boolean;
}
```

In `card/src/discovery.ts`, beside `zoneHasFlowMeter`:

```typescript
/** The zone's water figures, or null when there is nothing trustworthy to show.
 *
 * An unavailable sensor yields null rather than zero: zero would claim no water
 * passed, which is a different statement from "we do not know".
 */
export function waterSummary(zone: ZoneEntities): WaterSummary | null {
  const entity = zone.zone_water_total;
  if (!entity) return null;
  const total = Number(entity.state);
  if (!Number.isFinite(total)) return null;
  return {
    total,
    today: Number(entity.attributes.today_l ?? 0),
    month: Number(entity.attributes.month_l ?? 0),
    estimated: Boolean(entity.attributes.estimated),
  };
}
```

In `card/src/zone-row.ts`, push a third line into `_renderMeta`'s `lines` array (the `.meta` flex column at `zone-row.ts:156-166`), using `formatNumber(value, 0)` from `format.ts` and the existing `.abs` opacity treatment for the secondary figures. Render the `estimated` badge alongside the existing degraded badges.

- [ ] **Step 5: Add the localised strings**

Add the new keys to `card/src/localize/en.ts` and `card/src/localize/it.ts` **at the identical index in both files** — `localize.test.ts:26-28` asserts key order, not merely the key set. Italian: *"stimato"*, *"oggi"*, *"questo mese"*, *"acqua non attribuita"*.

- [ ] **Step 6: Run the frontend checks and build**

```bash
cd card && npm run typecheck && npm test && npm run build && cd ..
```
Expected: typecheck clean, all tests pass, both bundles emitted into `custom_components/irrigation_maestro/frontend/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(card): water figures and an estimated badge in the zone row

The row had no litres at all -- volume_l was published and never rendered.
Cumulative, today and this month now sit in the meta block, and a zone whose
figures come from nominal x minutes is badged, so an estimate is never read
as a measurement.

The logic is a pure waterSummary() helper in discovery.ts rather than inline
in the render: there is no zone-row test harness, and factoring it out is
cheaper than retrofitting one. An unavailable sensor yields null, not zero:
zero would claim no water passed."
```

---

## Task 14: Documentation, changelog, release

**Files:**
- Modify: `README.md`, `docs/design/architecture.md`, `MEMORY.md`, `CHANGELOG.md`, `manifest.json`, `diagnostics.py`, plus the stale prose listed below
- Test: `tests/test_translations.py`

- [ ] **Step 1: Summarise the water section in diagnostics**

`storage.as_dict()` rides into `diagnostics.py:32` wholesale, and a 730-day series would dominate the payload. In `diagnostics.py`, replace the raw `water["daily"]` with a summary: day count, oldest and newest day, and the current period total.

- [ ] **Step 2: Add the degradation-matrix rows**

In `README.md`, under `## Degradation matrix`, add:

| Feature | Requires | Without it |
|---|---|---|
| Continuous water accounting | A flow meter (zone or line) whose unit can be determined | Litres are estimated once per cycle as nominal flow × minutes and marked `estimated`; water outside cycles is not seen at all, so unattributed-water detection is unavailable for that zone |
| Unattributed-water detection | Same | Unavailable for that zone: with no meter there is nothing to observe while the valves are closed |

- [ ] **Step 3: Correct the prose that names the old behaviour**

Each of these describes a mechanism this branch replaces. Reword, do not delete:

- `translations/en.json` and `it.json`, `issues.flow_unit_corrected` — names "the consumption counter"
- `runtime.py:931-936` — repeats the same promise in a docstring
- `docs/design/architecture.md:142`
- `docs/design/card-contract.md:23`
- `flow.py:1-16` and `storage.py:1-8` module docstrings
- `tests/components/test_flow.py:230-231` docstring — "a running cycle reads its litres straight from the reader" is no longer true
- `tests/components/test_session.py:579` docstring
- `MEMORY.md:239-245` — the "L/min is canonical" entry, which describes `FlowMonitor` as the integrator

- [ ] **Step 4: Add the MEMORY decision entries**

Append to `MEMORY.md` under "Deliberate design decisions", in the established voice:

- **Water becomes litres in one place (3.3.0).** One `MeterLedger` per meter integrates continuously; `FlowMonitor` holds a baseline and reads deltas. Two integrators over one meter were two numbers for the same water. Do not add a second integrator, and do not let a consumer integrate a reading itself.
- **Attribution follows valve state, not run phase (3.3.0).** `PHASE_WATERING` is necessary and not sufficient — it misses the open-confirm wait and the master pre-open, and a failed close clears `active_runs` while the valve is still open, which would have diagnosed a stuck-open valve as a system leak. A valve that reports open is watering.
- **Unattributed water is split into total and all-closed (3.3.0).** Line priming during `master_pre_open_s` is real water belonging to no zone, on every cycle. Only the all-closed subset is a leak signal; conflating them would inflate it once per cycle forever.
- **The monthly budget is derived, never stored (3.3.0).** Carried balance plus the daily per-zone sum. Unattributed water is excluded on purpose: in the budget, a leak would suspend irrigation. `carried_over` is an opening balance with a period stamp that expires by itself — do not turn it back into a running counter.

- [ ] **Step 5: Changelog and version**

Add a `## 3.3.0` section to `CHANGELOG.md` covering: continuous per-meter accounting; per-zone cumulative water sensors eligible for statistics and the Water dashboard; the unattributed-water sensor; the 730-day daily history; the budget deriving from per-zone data with a carried balance; and — explicitly, under a "Behaviour changes" heading — the concurrent-zone double count fix and the `line_meter_shared` fix.

Bump `manifest.json` to `3.3.0`.

- [ ] **Step 6: Full verification**

```bash
.venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/mypy
cd card && npm run typecheck && npm test && npm run build && cd ..
git status --short          # the two frontend bundles must be staged with everything else
```
Expected: everything green; `tests/test_translations.py` confirms en/it key parity.

- [ ] **Step 7: Commit and open the PR**

```bash
git add -A
git commit -m "chore: release 3.3.0 -- continuous per-zone water accounting

Docs, degradation matrix, changelog, manifest bump, and the prose sweep for
every place that described litres as something counted only during cycles."
git push -u origin feat/water-accounting
```

Then open the PR against `main`. The description must state, per the spec's delivery section: how litres are attributed and what happens to unattributed water; how monotonicity survives restarts and reloads; that no today/this-month entities were exposed and why; how the monthly budget was reconciled including `carried_over` and the one-time Repairs notice; and the two shipped behaviour changes.

---

## Self-Review

**Spec coverage.** §1.1 ledger → Tasks 5, 7, 9. §1.2 attribution → Task 8. §1.3 estimated zones → Tasks 8, 12. §1.4 gaps → Tasks 4, 7. §1.5 monotonicity → Task 7's `test_the_total_never_decreases`, Task 6's persistence round-trip, and Task 9 Step 4's `tests/components/test_metering_restart.py`, which covers the mid-cycle reload the spec asks for by name. §1.6 storage → Task 6. §1.7 sensors → Task 12. §1.8 budget → Tasks 10, 11. §1.9 no seeding service → nothing to build, stated in Task 14's PR description. §1.10 touch points → Tasks 12, 14. §1.11 tests → Tasks 1, 2, 3, and the corrections in Task 11 Step 4.

**Placeholders.** None: every code step carries the actual code, every test step the actual assertions, every command the actual invocation.

**Type consistency.** `add_water(zone_id, liters, *, day, estimated, gap_s=0.0)` is called with exactly that shape in Tasks 6, 8 and the tests. `MeterSample`'s six fields are constructed in Task 7 and consumed by name in Tasks 8 and 9. `FlowMonitor.__init__`'s second positional argument changes from `FlowSensorReader` to `MeterLedger` in Task 9 and its only construction site is updated in the same task. `consumption_used_liters()` is introduced in Task 11 and used in Tasks 11 and 12 only.
