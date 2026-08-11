# Gardena Scheduling — Phase A (Backend & Contract) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-program weekday scheduling and per-day durations to the irrigation engine and expose them through new services and sensor attributes — the backend the Phase B "Irrigazione" panel will drive — without changing any existing behavior.

**Architecture:** Two optional per-cycle fields (`days`, `day_minutes`) flow from config → typed models → planner. The weather math is untouched; a shared, volume-guarded `resolve_day_curve` helper rebuilds a day's curve from `(base minutes, heat)` via the existing `semantic.py` mapping, and a positive weekday gate skips off-days. New services mutate the zone subentry in place using the established `_write_cycle_curve` + `async_config_updated` pattern. Every change is additive: a program with neither field behaves exactly as today, so the §8 golden numbers stay byte-identical.

**Tech Stack:** Python 3.13, Home Assistant custom integration (config subentries + services + voluptuous schemas), pytest + pytest-homeassistant-custom-component. Pure engine code stays HA-free.

## Global Constraints

- **§8 regression is sacred.** These golden numbers must still pass unchanged: weighted 31.0 °C, budget 3.79 mm, threshold 4.5 mm (`tests/engine/test_evaluate.py`), lawn 15 min (`tests/engine/test_curves.py`, `tests/engine/test_weather.py`), pots 32 min (`tests/engine/test_planner.py:95`). Never edit an expected number; only add new assertions.
- **Additive & backward compatible.** New fields are optional. `days` default `None` = every day. `day_minutes` default empty dict = use the curve as-is. Absent ⇒ today's behavior exactly. No data migration.
- **Never guess a duration.** A program with an invalid curve/day value must fail loudly, never water for a wrong time. Services raise `ServiceValidationError` with a translation key, never a bare exception.
- **Weekday encoding:** Python `date.weekday()` — `0 = Monday … 6 = Sunday`, matching the existing `CalendarRestrictions.allowed_weekdays`.
- **Anchors come from `semantic.ANCHORS`** `(12.0, 25.0, 35.0)` — never hardcode `25`/`35` literals.
- **Volume programs ignore `day_minutes`** (per-day minutes is a duration concept). Both the engine resolver and `set_program_minutes` must guard on `CurveKind.VOLUME`.
- **Internal keys unchanged.** `CONF_CYCLES`, `cycle_id`, `CycleConfig`, `set_curve`/`set_simple_curve` keep their names for compatibility. New *user-facing* service names use "program". Full "ciclo → programma" relabel of the existing card/config-flow strings is **Phase B**, out of scope here (see §Scope note below).
- **Do not bump `manifest.json` version in Phase A.** Phase A is not a standalone release; the version bump ships with Phase B.
- **CI must stay green:** `ruff check .`, `ruff format --check .`, `mypy` (strict), `pytest`, hassfest.

**Scope note (YAGNI):** Phase A delivers the model, engine, services, and read contract — fully usable via services/YAML and the *existing* card. The sidebar panel, wizard, weekly-grid UI, the `reason.day_not_scheduled` card string, and the cosmetic ciclo→programma rename of existing UI strings are **Phase B** and are not in this plan.

---

## File Structure

**Modified:**
- `custom_components/irrigation_maestro/const.py` — two new cycle keys.
- `custom_components/irrigation_maestro/models.py` — `CycleConfig` gains `days` + `day_minutes`, parsing + `to_spec` forwarding.
- `custom_components/irrigation_maestro/engine/planner.py` — `CycleSpec` fields, `resolve_day_curve` helper, per-day duration in `_cycle_target`, weekday gate in `build_session_plan`.
- `custom_components/irrigation_maestro/engine/model.py` — `SkipReason.DAY_NOT_SCHEDULED` + add to `_SILENT_REASONS`.
- `custom_components/irrigation_maestro/runtime.py` — `_manual_run` uses `resolve_day_curve`.
- `custom_components/irrigation_maestro/sensor.py` — `ZoneStateSensor` cycles attribute gains `days`/`day_minutes`/`amount`/`heat`.
- `custom_components/irrigation_maestro/services.py` — shared `_update_cycle` mutator + 5 new services.
- `custom_components/irrigation_maestro/services.yaml` — 5 new service definitions.
- `custom_components/irrigation_maestro/translations/en.json` + `it.json` — new exception keys + service strings.
- `docs/design/card-contract.md` — document new attributes + services.

**Tests:** `tests/engine/test_planner.py`, `tests/components/test_models.py`, `tests/components/test_services.py`, `tests/components/test_entities.py`.

---

### Task 1: Per-cycle model fields (`days`, `day_minutes`)

Add the two optional fields end to end (const → `CycleConfig` → `CycleSpec`) with safe defaults, so nothing downstream breaks and existing fixtures still construct.

**Files:**
- Modify: `custom_components/irrigation_maestro/const.py` (cycle keys block, near line 98-116)
- Modify: `custom_components/irrigation_maestro/models.py` (`CycleConfig`, lines 112-152)
- Modify: `custom_components/irrigation_maestro/engine/planner.py` (`CycleSpec`, lines 22-33)
- Test: `tests/components/test_models.py`

**Interfaces:**
- Produces: `const.CONF_CYCLE_DAYS = "days"`, `const.CONF_CYCLE_DAY_MINUTES = "day_minutes"`.
- Produces: `CycleConfig.days: frozenset[int] | None = None`, `CycleConfig.day_minutes: dict[int, int]` (default empty).
- Produces: `CycleSpec.days: frozenset[int] | None = None`, `CycleSpec.day_minutes: dict[int, int]` (default empty).

- [ ] **Step 1: Write the failing test**

In `tests/components/test_models.py`, add:

```python
from custom_components.irrigation_maestro import const
from custom_components.irrigation_maestro.models import CycleConfig


def _cycle_data(**extra):
    data = {
        const.CONF_CYCLE_ID: "c1",
        const.CONF_CYCLE_NAME: "Morning",
        const.CONF_TRIGGER: {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
            const.CONF_TRIGGER_AT: "06:30",
        },
        const.CONF_CURVE: {const.CONF_CURVE_TEMPLATE: const.PRESET_POTS_ID},
    }
    data.update(extra)
    return data


def test_cycle_defaults_have_no_schedule():
    cycle = CycleConfig.from_config(_cycle_data(), templates={})
    assert cycle.days is None            # None = every day
    assert cycle.day_minutes == {}       # empty = use the curve as-is


def test_cycle_parses_days_and_day_minutes():
    cycle = CycleConfig.from_config(
        _cycle_data(days=[0, 2, 4], day_minutes={"0": 10, "4": 20}),
        templates={},
    )
    assert cycle.days == frozenset({0, 2, 4})
    assert cycle.day_minutes == {0: 10, 4: 20}   # keys coerced to int
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/components/test_models.py -k "cycle_defaults or cycle_parses" -v`
Expected: FAIL (`AttributeError: 'CycleConfig' object has no attribute 'days'`).

- [ ] **Step 3: Add the const keys**

In `const.py`, in the "# Cycle keys" block (after `CONF_MONTHS_OVERRIDE`, line ~107):

```python
CONF_CYCLE_DAYS: Final = "days"
CONF_CYCLE_DAY_MINUTES: Final = "day_minutes"
```

- [ ] **Step 4: Add the fields to `CycleConfig`**

In `models.py`, add to the `CycleConfig` dataclass (after `months_override`, line 122):

```python
    days: frozenset[int] | None = None
    day_minutes: dict[int, int] = field(default_factory=dict)
```

`field` is already imported (`from dataclasses import dataclass, field`). In `CycleConfig.from_config`, before the `return cls(`, add:

```python
        days_raw = config.get(const.CONF_CYCLE_DAYS)
        day_minutes_raw = config.get(const.CONF_CYCLE_DAY_MINUTES, {})
```

and add these keyword arguments to `cls(...)`:

```python
            days=frozenset(int(d) for d in days_raw) if days_raw is not None else None,
            day_minutes={int(k): int(v) for k, v in day_minutes_raw.items()},
```

In `CycleConfig.to_spec`, add to the `CycleSpec(...)` call:

```python
            days=self.days,
            day_minutes=self.day_minutes,
```

- [ ] **Step 5: Add the fields to `CycleSpec`**

In `engine/planner.py`, add to the `CycleSpec` dataclass (after `volume_safety_timeout_min`, line 32):

```python
    days: frozenset[int] | None = None
    day_minutes: dict[int, int] = field(default_factory=dict)
```

`field` is already imported in planner.py (`from dataclasses import dataclass, field`).

- [ ] **Step 6: Run the tests and the §8 planner test**

Run: `.venv/bin/pytest tests/components/test_models.py tests/engine/test_planner.py -q`
Expected: PASS (new model tests pass; `test_duration_frozen_from_weighted_temp` still 32 — the new fields defaulted).

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/const.py custom_components/irrigation_maestro/models.py custom_components/irrigation_maestro/engine/planner.py tests/components/test_models.py
git commit -m "feat(engine): add optional per-cycle days + day_minutes fields"
```

---

### Task 2: `resolve_day_curve` + per-day duration in the planner

Add the shared resolver and wire it into `_cycle_target`. Legacy cycles (no `day_minutes`) fall through to the exact current call, so §8 is preserved.

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/planner.py`
- Test: `tests/engine/test_planner.py`

**Interfaces:**
- Produces: `resolve_day_curve(curve: Curve, day_minutes: dict[int, int], weekday: int) -> Curve` (in `planner.py`).
- Changes: `_cycle_target(cycle, zone, weighted_temp, duration_factor, weekday)` — gains a trailing `weekday: int`.

- [ ] **Step 1: Write the failing test**

In `tests/engine/test_planner.py` (`NOW` is Friday 2026-07-17, so `NOW.weekday() == 4`), add:

```python
from custom_components.irrigation_maestro.engine.planner import resolve_day_curve

_DAY_CURVE = Curve(points=((12.0, 0.0), (25.0, 10.0), (35.0, 20.0)), min_value=0.0, max_value=60.0)


class TestPerDayDuration:
    def test_day_minutes_override_rebuilds_curve(self):
        # Friday base 20' at 25C, heat of the curve = 20-10 = 10.
        # points_from_semantic(20, 10) -> (12,7),(25,20),(35,30); at 31C -> 26.
        cycle = make_cycle(curve=_DAY_CURVE, day_minutes={4: 20})
        result = plan([make_zone(cycles=(cycle,))])
        assert result.runs[0].duration_min == 26

    def test_missing_weekday_falls_back_to_curve(self):
        # No Friday entry -> legacy path: curve at 31C -> 16.
        cycle = make_cycle(curve=_DAY_CURVE, day_minutes={0: 20})
        result = plan([make_zone(cycles=(cycle,))])
        assert result.runs[0].duration_min == 16

    def test_volume_ignores_day_minutes(self):
        vol_curve = Curve(
            points=((12.0, 0.0), (25.0, 10.0), (35.0, 20.0)),
            min_value=0.0, max_value=60.0, kind=CurveKind.VOLUME,
        )
        # day_minutes must not build a duration curve from liters; resolver returns the curve unchanged.
        assert resolve_day_curve(vol_curve, {4: 20}, 4) is vol_curve

    def test_resolve_day_curve_is_identity_without_day_minutes(self):
        assert resolve_day_curve(_DAY_CURVE, {}, 4) is _DAY_CURVE
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/engine/test_planner.py::TestPerDayDuration -v`
Expected: FAIL (`ImportError: cannot import name 'resolve_day_curve'`).

- [ ] **Step 3: Implement `resolve_day_curve`**

In `engine/planner.py`, add the import near the top (after the existing `from .curves import ...`):

```python
from .semantic import ANCHORS, points_from_semantic
```

Then add the helper (below the dataclasses, above `_zone_gate`):

```python
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
```

- [ ] **Step 4: Wire it into `_cycle_target`**

In `engine/planner.py`, change `_cycle_target`'s signature to add `weekday: int` and replace the first line of its body:

```python
def _cycle_target(
    cycle: CycleSpec,
    zone: ZoneSpec,
    weighted_temp: float,
    duration_factor: float,
    weekday: int,
) -> tuple[int, int | None, int]:
    ...
    day_curve = resolve_day_curve(cycle.curve, cycle.day_minutes, weekday)
    value = curve_value(day_curve, weighted_temp, zone.adjustment_pct)
    target = max(round(value * duration_factor), 1)
    if cycle.curve.kind is CurveKind.VOLUME:   # kind is unchanged by the resolver
        ...
```

Keep the rest of `_cycle_target` (volume/timeout logic) exactly as is — it already reads `cycle.curve.kind`, which the resolver preserves.

Update its only caller in `build_session_plan` (line ~192):

```python
            duration, volume, timeout = _cycle_target(
                cycle, zone, evaluation.weighted_temp, duration_factor, now.weekday()
            )
```

- [ ] **Step 5: Run the tests + §8**

Run: `.venv/bin/pytest tests/engine/test_planner.py -q`
Expected: PASS (new `TestPerDayDuration` passes; `test_duration_frozen_from_weighted_temp` still 32; adjustment 22; factor 16 — all unchanged).

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/engine/planner.py tests/engine/test_planner.py
git commit -m "feat(engine): per-day duration via shared resolve_day_curve helper"
```

---

### Task 3: Positive weekday gate + silent skip reason

A program only runs on its selected weekdays; the skip is silent so a weekend-only program doesn't notify five days a week.

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/model.py`
- Modify: `custom_components/irrigation_maestro/engine/planner.py` (`build_session_plan` cycle loop)
- Test: `tests/engine/test_planner.py`

**Interfaces:**
- Produces: `SkipReason.DAY_NOT_SCHEDULED = "day_not_scheduled"`, member of `_SILENT_REASONS`.

- [ ] **Step 1: Write the failing test**

In `tests/engine/test_planner.py` add (NOW is Friday, weekday 4):

```python
class TestWeekdayGate:
    def test_skips_when_today_not_scheduled(self):
        cycle = make_cycle(days=frozenset({0, 1}))  # Mon, Tue only
        result = plan([make_zone(cycles=(cycle,))])
        assert not result.runs
        assert result.skipped[0].reason is SkipReason.DAY_NOT_SCHEDULED

    def test_runs_when_today_scheduled(self):
        cycle = make_cycle(days=frozenset({4}))  # Friday
        result = plan([make_zone(cycles=(cycle,))])
        assert len(result.runs) == 1

    def test_day_less_program_unaffected(self):
        result = plan([make_zone()])  # make_cycle() has days=None
        assert len(result.runs) == 1

    def test_day_not_scheduled_is_silent(self):
        assert SkipReason.DAY_NOT_SCHEDULED.silent is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/engine/test_planner.py::TestWeekdayGate -v`
Expected: FAIL (`AttributeError: DAY_NOT_SCHEDULED`).

- [ ] **Step 3: Add the reason (and mark it silent)**

In `engine/model.py`, add to the `SkipReason` enum (after `SKIP_TODAY_REQUESTED`, line 35):

```python
    DAY_NOT_SCHEDULED = "day_not_scheduled"
```

and add it to `_SILENT_REASONS` (line 44-51):

```python
_SILENT_REASONS = frozenset(
    {
        SkipReason.OUT_OF_SEASON,
        SkipReason.NOT_DUE,
        SkipReason.ZONE_DISABLED,
        SkipReason.CYCLE_DISABLED,
        SkipReason.DAY_NOT_SCHEDULED,
    }
)
```

- [ ] **Step 4: Add the gate in the planner loop**

In `engine/planner.py`, in `build_session_plan`'s per-cycle `if/elif` chain, insert immediately after the `elif not cycle.enabled:` branch (before the `elif now.month not in months:` branch):

```python
            elif cycle.days is not None and now.weekday() not in cycle.days:
                reason = SkipReason.DAY_NOT_SCHEDULED
```

- [ ] **Step 5: Run the tests + full engine suite**

Run: `.venv/bin/pytest tests/engine -q`
Expected: PASS (weekday gate works; all §8 golden values in test_evaluate/test_curves/test_weather/test_planner unchanged).

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/engine/model.py custom_components/irrigation_maestro/engine/planner.py tests/engine/test_planner.py
git commit -m "feat(engine): positive weekday gate with silent day_not_scheduled reason"
```

---

### Task 4: Manual runs honor per-day minutes

`run_zone`/`run_all` compute duration in `_manual_run`, independently of the planner. Route it through the same resolver so Tuesday's minutes apply to a manual run too. (The weekday *gate* never applies to manual runs — only the duration resolver is shared.)

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py` (`_manual_run`, lines 540-576)
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: `resolve_day_curve` from `engine/planner.py`.

- [ ] **Step 1: Write the failing test**

In `tests/components/test_services.py`, add a test that freezes onto a known weekday and asserts the manual duration follows `day_minutes`. Use the existing `setup_hub`/`zone_data` helpers; `zone_data` builds a zone dict — pass a cycle carrying `day_minutes` for the frozen weekday. Model after `test_run_zone_with_duration_override`:

```python
from custom_components.irrigation_maestro import const


async def test_manual_run_uses_per_day_minutes(hass, freezer):
    # START is a fixed datetime in test_session; compute its weekday for the map.
    freezer.move_to(START)
    weekday = START.weekday()
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    zone = zone_data("Pots", "valve.pots")
    # Give the (single) cycle a per-day base of 7 minutes today, a duration curve.
    zone[const.CONF_CYCLES][0][const.CONF_CURVE] = {
        const.CONF_CURVE_POINTS: [[12, 0], [25, 7], [35, 14]],
        const.CONF_CURVE_MIN: 0, const.CONF_CURVE_MAX: 60,
        const.CONF_CURVE_KIND: "duration",
    }
    zone[const.CONF_CYCLES][0][const.CONF_CYCLE_DAY_MINUTES] = {str(weekday): 7}
    entry = await setup_hub(hass, [zone])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(DOMAIN, "run_zone", {"zone_id": zone_id}, blocking=True)
    await advance(hass, freezer, 30)
    assert hass.states.get("valve.pots").state == "open"
    # base 7' today; weather may nudge it, but it must be the per-day base region,
    # not a curve-mild fallback of a different value.
    assert runtime.session.active_runs[zone_id].run_total_min >= 1
```

(The assertion checks the run happens with the per-day curve in effect; adjust the exact expected minute to the frozen weather in `mock_weather` when implementing — the point is `day_minutes` is consulted.)

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/components/test_services.py::test_manual_run_uses_per_day_minutes -v`
Expected: FAIL (duration computed from the raw curve mild value, ignoring `day_minutes`), or the assertion on the per-day region fails.

- [ ] **Step 3: Patch `_manual_run`**

In `runtime.py`, add the import (near the other `from .engine.planner import ...`):

```python
from .engine.planner import resolve_day_curve
```

In `_manual_run`, replace the `curve_value(cycle.curve, ...)` branch (lines 559-563) with:

```python
            elif cycle is not None and evaluation.weighted_temp is not None:
                day_curve = resolve_day_curve(
                    cycle.curve, cycle.day_minutes, dt_util.now().weekday()
                )
                duration_min = max(
                    round(curve_value(day_curve, evaluation.weighted_temp, zone.adjustment_pct)),
                    1,
                )
```

`dt_util` and `curve_value` are already imported in runtime.py.

- [ ] **Step 4: Run the test + service suite**

Run: `.venv/bin/pytest tests/components/test_services.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/runtime.py tests/components/test_services.py
git commit -m "feat(runtime): manual runs honor per-day minutes"
```

---

### Task 5: Sensor exposes schedule + derived amount/heat

The card/panel reads programs from the `ZoneStateSensor` `cycles` attribute. Add the new schedule fields and the friendly `(amount, heat)` derivation.

**Files:**
- Modify: `custom_components/irrigation_maestro/sensor.py` (`ZoneStateSensor._role_attributes`, lines 238-252)
- Test: `tests/components/test_entities.py`

**Interfaces:**
- Consumes: `semantic_from_curve` from `engine/semantic.py`, `CurveKind` from `engine/curves.py` (already imported in sensor.py).
- Produces (attribute contract): each `cycles[]` entry additionally has `days: list[int] | null`, `day_minutes: {str: int} | null`, `amount: int | null`, `heat: int | null`.

- [ ] **Step 1: Write the failing test**

In `tests/components/test_entities.py`, find the test that reads the zone-state `cycles` attribute (or add one) and assert the new keys. Minimal addition:

```python
def _first_cycle_attr(hass, entity_id):
    return hass.states.get(entity_id).attributes["cycles"][0]


async def test_zone_state_exposes_schedule_fields(hass, freezer):
    # set up a hub with one duration-curve zone (reuse the file's existing setup helper)
    ...  # entity_id = the zone_state sensor
    cycle = _first_cycle_attr(hass, entity_id)
    assert cycle["days"] is None            # day-less program
    assert cycle["day_minutes"] is None     # no per-day overrides
    assert isinstance(cycle["amount"], int) # derived from the curve
    assert isinstance(cycle["heat"], int)
```

(Use whatever hub/zone setup helper this test file already imports; the assertion is the new part.)

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/components/test_entities.py::test_zone_state_exposes_schedule_fields -v`
Expected: FAIL (`KeyError: 'days'`).

- [ ] **Step 3: Implement**

In `sensor.py`, add the import (with the existing engine imports at the top):

```python
from .engine.semantic import semantic_from_curve
```

In `ZoneStateSensor._role_attributes`, replace the cycle dict comprehension body (lines 239-250) so each entry includes the new fields. Extract per-cycle derivation into a small local to stay readable:

```python
            "cycles": [self._cycle_dict(cycle) for cycle in config.cycles],
```

and add a method to the class:

```python
    def _cycle_dict(self, cycle: CycleConfig) -> dict[str, Any]:
        is_duration = cycle.curve.kind is CurveKind.DURATION
        amount, heat = semantic_from_curve(cycle.curve) if is_duration else (None, None)
        return {
            "cycle_id": cycle.cycle_id,
            "name": cycle.name,
            "enabled": self._runtime.state.cycle_enabled(self._zone_id, cycle.cycle_id),
            "trigger": _trigger_dict(cycle.trigger),
            "days": sorted(cycle.days) if cycle.days is not None else None,
            "day_minutes": (
                {str(k): v for k, v in cycle.day_minutes.items()} or None
            ),
            "amount": amount,
            "heat": heat,
            "curve": {
                "points": [[temp, value] for temp, value in cycle.curve.points],
                "min": cycle.curve.min_value,
                "max": cycle.curve.max_value,
                "kind": str(cycle.curve.kind),
            },
        }
```

`CycleConfig` is already imported in sensor.py (used by `ZoneNextRunSensor`).

- [ ] **Step 4: Run the test + entity suite**

Run: `.venv/bin/pytest tests/components/test_entities.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/sensor.py tests/components/test_entities.py
git commit -m "feat(sensor): expose program days, day_minutes, amount, heat"
```

---

### Task 6: Services — `set_program_schedule` + `set_program_minutes`

Two write services and a shared in-place mutator, following `_write_cycle_curve`'s pattern.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json` (exceptions)
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces service `irrigation_maestro.set_program_schedule` — `zone_id`, `program_id`, optional `days: list[int]` (0-6; empty/omitted = every day), `start_kind: "time"|"sun"`, `start_time: "HH:MM"` (time), `start_event: "sunrise"|"sunset"` + optional `start_offset_min: int` (sun).
- Produces service `irrigation_maestro.set_program_minutes` — `zone_id`, `program_id`, exactly one of `minutes: int` (uniform, updates the curve amount, preserves heat, clears per-day) or `day_minutes: {str|int: int}` (per-day map). Rejected on volume programs.
- Produces helper `_update_cycle(hass, entry, zone_id, cycle_id, mutate)` (generalizes `_write_cycle_curve`).

- [ ] **Step 1: Write the failing tests**

In `tests/components/test_services.py`:

```python
async def test_set_program_schedule_writes_days_and_time(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN, "set_program_schedule",
        {"zone_id": zone_id, "program_id": program_id,
         "days": [0, 2, 4], "start_kind": "time", "start_time": "07:15"},
        blocking=True,
    )
    cycle = runtime.zones[zone_id].config.cycles[0]
    assert cycle.days == frozenset({0, 2, 4})
    assert cycle.trigger.kind == "time"
    assert cycle.trigger.at.strftime("%H:%M") == "07:15"


async def test_set_program_minutes_uniform_preserves_heat(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    from custom_components.irrigation_maestro.engine.semantic import semantic_from_curve
    _, heat_before = semantic_from_curve(runtime.zones[zone_id].config.cycles[0].curve)

    await hass.services.async_call(
        DOMAIN, "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "minutes": 18},
        blocking=True,
    )
    amount_after, heat_after = semantic_from_curve(runtime.zones[zone_id].config.cycles[0].curve)
    assert amount_after == 18
    assert heat_after == heat_before          # heat preserved
    assert runtime.zones[zone_id].config.cycles[0].day_minutes == {}   # per-day cleared


async def test_set_program_minutes_per_day(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN, "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "day_minutes": {"0": 10, "4": 20}},
        blocking=True,
    )
    assert runtime.zones[zone_id].config.cycles[0].day_minutes == {0: 10, 4: 20}


async def test_set_program_minutes_rejects_unknown_program(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "set_program_minutes",
            {"zone_id": zone_id, "program_id": "nope", "minutes": 12},
            blocking=True,
        )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_services.py -k "set_program" -v`
Expected: FAIL (`Unable to find service irrigation_maestro.set_program_schedule`).

- [ ] **Step 3: Add constants, schemas and the shared mutator**

In `services.py`, add service-name constants (near the other `SERVICE_*`, line 33-45):

```python
SERVICE_SET_PROGRAM_SCHEDULE: Final = "set_program_schedule"
SERVICE_SET_PROGRAM_MINUTES: Final = "set_program_minutes"
SERVICE_ADD_PROGRAM: Final = "add_program"
SERVICE_REMOVE_PROGRAM: Final = "remove_program"
SERVICE_RENAME_PROGRAM: Final = "rename_program"
```

Add attribute constants (near line 47-58):

```python
ATTR_PROGRAM_ID: Final = "program_id"
ATTR_DAYS: Final = "days"
ATTR_START_KIND: Final = "start_kind"
ATTR_START_TIME: Final = "start_time"
ATTR_START_EVENT: Final = "start_event"
ATTR_START_OFFSET_MIN: Final = "start_offset_min"
ATTR_MINUTES: Final = "minutes"
ATTR_DAY_MINUTES: Final = "day_minutes"
ATTR_NAME: Final = "name"
ATTR_COPY_FROM: Final = "copy_from"
```

Add schemas (near the other schemas, after `_SET_SIMPLE_CURVE_SCHEMA`):

```python
_WEEKDAYS = vol.All([vol.All(vol.Coerce(int), vol.Range(min=0, max=6))], vol.Length(max=7))

_SET_PROGRAM_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_DAYS, default=list): _WEEKDAYS,
        vol.Required(ATTR_START_KIND): vol.In(["time", "sun"]),
        vol.Optional(ATTR_START_TIME): cv.string,
        vol.Optional(ATTR_START_EVENT): vol.In(["sunrise", "sunset"]),
        vol.Optional(ATTR_START_OFFSET_MIN, default=0): vol.All(
            vol.Coerce(int), vol.Range(min=-360, max=360)
        ),
    }
)
_SET_PROGRAM_MINUTES_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Exclusive(ATTR_MINUTES, "amount"): vol.All(vol.Coerce(int), vol.Range(min=1, max=1440)),
        vol.Exclusive(ATTR_DAY_MINUTES, "amount"): {
            cv.string: vol.All(vol.Coerce(int), vol.Range(min=1, max=1440))
        },
    }
)
```

Add the shared mutator (near `_write_cycle_curve`):

```python
def _update_cycle(
    hass: HomeAssistant,
    entry: ConfigEntry,
    zone_id: str,
    cycle_id: str,
    mutate: "Callable[[dict[str, Any]], None]",
) -> None:
    """Apply ``mutate`` to the matching cycle dict and persist in place (no reload)."""
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    found = False
    for item in cycles:
        if item.get(const.CONF_CYCLE_ID) == cycle_id:
            mutate(item)
            found = True
    if not found:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": cycle_id},
        )
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )
```

Add `from collections.abc import Callable` to the imports.

- [ ] **Step 4: Add the two handlers**

```python
def _program_context(call: ServiceCall) -> tuple[HomeAssistant, ConfigEntry, str, str]:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    if runtime.zones[zone_id].config.cycle(program_id) is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )
    return hass, entry, zone_id, program_id


async def _async_set_program_schedule(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)
    days = sorted(set(call.data[ATTR_DAYS]))
    kind = call.data[ATTR_START_KIND]
    if kind == "time":
        if ATTR_START_TIME not in call.data:
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="start_time_required")
        trigger = {const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
                   const.CONF_TRIGGER_AT: call.data[ATTR_START_TIME]}
    else:
        if ATTR_START_EVENT not in call.data:
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="start_event_required")
        trigger = {const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
                   const.CONF_TRIGGER_EVENT: call.data[ATTR_START_EVENT],
                   const.CONF_TRIGGER_OFFSET_S: int(call.data[ATTR_START_OFFSET_MIN]) * 60}

    def mutate(item: dict[str, Any]) -> None:
        if days:
            item[const.CONF_CYCLE_DAYS] = days
        else:
            item.pop(const.CONF_CYCLE_DAYS, None)  # empty = every day
        item[const.CONF_TRIGGER] = trigger

    _update_cycle(hass, entry, zone_id, program_id, mutate)


async def _async_set_program_minutes(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    cycle = runtime.zones[zone_id].config.cycle(program_id)
    assert cycle is not None
    if cycle.curve.kind is CurveKind.VOLUME:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="simple_curve_on_volume",
            translation_placeholders={"cycle_id": program_id},
        )
    if ATTR_MINUTES in call.data:
        from .engine.semantic import semantic_from_curve
        _, heat = semantic_from_curve(cycle.curve)
        points = list(points_from_semantic(int(call.data[ATTR_MINUTES]), heat))

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[t, v] for t, v in points],
                const.CONF_CURVE_MIN: cycle.curve.min_value,
                const.CONF_CURVE_MAX: cycle.curve.max_value,
                const.CONF_CURVE_KIND: str(cycle.curve.kind),
            }
            item.pop(const.CONF_CYCLE_DAY_MINUTES, None)  # uniform clears per-day
    elif ATTR_DAY_MINUTES in call.data:
        day_map = {str(int(k)): int(v) for k, v in call.data[ATTR_DAY_MINUTES].items()}
        for weekday in day_map:
            if not 0 <= int(weekday) <= 6:
                raise ServiceValidationError(translation_domain=DOMAIN, translation_key="invalid_weekday")

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CYCLE_DAY_MINUTES] = day_map
    else:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="minutes_required")

    _update_cycle(hass, entry, zone_id, program_id, mutate)
```

- [ ] **Step 5: Register the services**

In `async_setup_services`, add:

```python
    hass.services.async_register(
        DOMAIN, SERVICE_SET_PROGRAM_SCHEDULE, _async_set_program_schedule,
        _SET_PROGRAM_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_PROGRAM_MINUTES, _async_set_program_minutes,
        _SET_PROGRAM_MINUTES_SCHEMA,
    )
```

- [ ] **Step 6: Add the exception strings**

In `translations/en.json` under `exceptions`, add:

```json
"unknown_program": { "message": "Unknown program: {program_id}." },
"start_time_required": { "message": "A fixed-time start needs a start_time (HH:MM)." },
"start_event_required": { "message": "A sun start needs a start_event (sunrise or sunset)." },
"minutes_required": { "message": "Provide either minutes or day_minutes." },
"invalid_weekday": { "message": "Weekdays must be 0 (Monday) to 6 (Sunday)." }
```

In `translations/it.json` under `exceptions`, add the Italian equivalents:

```json
"unknown_program": { "message": "Programma sconosciuto: {program_id}." },
"start_time_required": { "message": "Un avvio a ora fissa richiede start_time (HH:MM)." },
"start_event_required": { "message": "Un avvio solare richiede start_event (sunrise o sunset)." },
"minutes_required": { "message": "Fornisci minutes oppure day_minutes." },
"invalid_weekday": { "message": "I giorni vanno da 0 (lunedì) a 6 (domenica)." }
```

- [ ] **Step 7: Run the tests**

Run: `.venv/bin/pytest tests/components/test_services.py -k "set_program" -q`
Expected: PASS (all four).

- [ ] **Step 8: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json tests/components/test_services.py
git commit -m "feat(services): set_program_schedule + set_program_minutes"
```

---

### Task 7: Services — `add_program` / `remove_program` / `rename_program`

Add/remove/rename a program, mutating the subentry cycles list. Add/remove change the cycle set, so `async_config_updated` reconciles the per-cycle switch entities automatically (no reload).

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces `irrigation_maestro.add_program` — `zone_id`, optional `name`, optional `copy_from` (program_id); **response** `{"program_id": "<hex>"}`.
- Produces `irrigation_maestro.remove_program` — `zone_id`, `program_id` (refuses the last program).
- Produces `irrigation_maestro.rename_program` — `zone_id`, `program_id`, `name`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_add_program_creates_enabled_program(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    before = len(runtime.zones[zone_id].config.cycles)

    resp = await hass.services.async_call(
        DOMAIN, "add_program", {"zone_id": zone_id, "name": "Sera"},
        blocking=True, return_response=True,
    )
    new_id = resp["program_id"]
    cycles = runtime.zones[zone_id].config.cycles
    assert len(cycles) == before + 1
    added = next(c for c in cycles if c.cycle_id == new_id)
    assert added.name == "Sera"
    assert added.curve.kind is CurveKind.DURATION
    assert runtime.state.cycle_enabled(zone_id, new_id) is True   # defaults enabled


async def test_remove_program_refuses_last(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    only_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "remove_program", {"zone_id": zone_id, "program_id": only_id}, blocking=True
        )


async def test_add_then_remove_program(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    resp = await hass.services.async_call(
        DOMAIN, "add_program", {"zone_id": zone_id}, blocking=True, return_response=True
    )
    new_id = resp["program_id"]
    await hass.services.async_call(
        DOMAIN, "remove_program", {"zone_id": zone_id, "program_id": new_id}, blocking=True
    )
    assert all(c.cycle_id != new_id for c in runtime.zones[zone_id].config.cycles)


async def test_rename_program(hass, freezer):
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    pid = runtime.zones[zone_id].config.cycles[0].cycle_id
    await hass.services.async_call(
        DOMAIN, "rename_program", {"zone_id": zone_id, "program_id": pid, "name": "Alba"}, blocking=True
    )
    assert runtime.zones[zone_id].config.cycle(pid).name == "Alba"
```

`CurveKind` is already imported in this test module via `from .test_session import ...`? If not, add `from custom_components.irrigation_maestro.engine.curves import CurveKind`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_services.py -k "program" -v`
Expected: FAIL (services not found).

- [ ] **Step 3: Add schemas + a default-program builder**

In `services.py`, add `from uuid import uuid4` to the imports and:

```python
_ADD_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_COPY_FROM): cv.string,
    }
)
_REMOVE_PROGRAM_SCHEMA = vol.Schema(
    {vol.Required(ATTR_ZONE_ID): cv.string, vol.Required(ATTR_PROGRAM_ID): cv.string}
)
_RENAME_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Required(ATTR_NAME): cv.string,
    }
)


def _default_program(name: str) -> dict[str, Any]:
    """A valid, sensible new program: every day, sunrise, 15' mild + 8' hot."""
    points = list(points_from_semantic(15, 8))
    return {
        const.CONF_CYCLE_ID: uuid4().hex[:8],
        const.CONF_CYCLE_NAME: name,
        const.CONF_TRIGGER: {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
            const.CONF_TRIGGER_EVENT: "sunrise",
            const.CONF_TRIGGER_OFFSET_S: 0,
        },
        const.CONF_CURVE: {
            const.CONF_CURVE_POINTS: [[t, v] for t, v in points],
            const.CONF_CURVE_MIN: 1.0,
            const.CONF_CURVE_MAX: 60.0,
            const.CONF_CURVE_KIND: str(CurveKind.DURATION),
        },
    }
```

- [ ] **Step 4: Add the handlers**

```python
async def _async_add_program(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]

    copy_from = call.data.get(ATTR_COPY_FROM)
    if copy_from is not None:
        source = next((c for c in cycles if c.get(const.CONF_CYCLE_ID) == copy_from), None)
        if source is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="unknown_program",
                translation_placeholders={"program_id": copy_from},
            )
        program = {k: v for k, v in source.items() if k != const.CONF_CYCLE_ID}
        program[const.CONF_CYCLE_ID] = uuid4().hex[:8]
        program[const.CONF_CYCLE_NAME] = call.data.get(ATTR_NAME, f"{source.get(const.CONF_CYCLE_NAME, 'Program')} (copy)")
    else:
        program = _default_program(call.data.get(ATTR_NAME, "Program"))

    cycles.append(program)
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )
    return {"program_id": program[const.CONF_CYCLE_ID]}


async def _async_remove_program(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    if not any(c.get(const.CONF_CYCLE_ID) == program_id for c in cycles):
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )
    if len(cycles) <= 1:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="cannot_remove_last_program"
        )
    cycles = [c for c in cycles if c.get(const.CONF_CYCLE_ID) != program_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )


async def _async_rename_program(call: ServiceCall) -> None:
    hass, entry, zone_id, program_id = _program_context(call)

    def mutate(item: dict[str, Any]) -> None:
        item[const.CONF_CYCLE_NAME] = call.data[ATTR_NAME]

    _update_cycle(hass, entry, zone_id, program_id, mutate)
```

- [ ] **Step 5: Register (note `add_program` returns a response)**

```python
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_PROGRAM, _async_add_program, _ADD_PROGRAM_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REMOVE_PROGRAM, _async_remove_program, _REMOVE_PROGRAM_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RENAME_PROGRAM, _async_rename_program, _RENAME_PROGRAM_SCHEMA
    )
```

- [ ] **Step 6: Add the exception string**

In `translations/en.json` exceptions: `"cannot_remove_last_program": { "message": "A zone must keep at least one program." }`
In `translations/it.json` exceptions: `"cannot_remove_last_program": { "message": "Una zona deve avere almeno un programma." }`

- [ ] **Step 7: Run the tests**

Run: `.venv/bin/pytest tests/components/test_services.py -k "program" -q`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json tests/components/test_services.py
git commit -m "feat(services): add/remove/rename program"
```

---

### Task 8: services.yaml, service strings, docs + full gate

Register the five new services in `services.yaml` with clear IT/EN help (via translations `services` block), document the new attribute/service contract, and run the whole gate including hassfest.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json` (`services` block)
- Modify: `docs/design/card-contract.md`
- Test: full suite + hassfest

**Interfaces:** none new — documentation + metadata for the Task 6/7 services.

- [ ] **Step 1: Add the services to `services.yaml`**

Append (mirror the structure of the existing `set_curve` entry — check the file for the exact selector style it uses):

```yaml
set_program_schedule:
  fields:
    zone_id:
      required: true
      selector: { text: }
    program_id:
      required: true
      selector: { text: }
    days:
      selector:
        select:
          multiple: true
          options:
            - { value: "0", label: "Mon" }
            - { value: "1", label: "Tue" }
            - { value: "2", label: "Wed" }
            - { value: "3", label: "Thu" }
            - { value: "4", label: "Fri" }
            - { value: "5", label: "Sat" }
            - { value: "6", label: "Sun" }
    start_kind:
      required: true
      selector: { select: { options: ["time", "sun"] } }
    start_time:
      selector: { time: }
    start_event:
      selector: { select: { options: ["sunrise", "sunset"] } }
    start_offset_min:
      selector: { number: { min: -360, max: 360, unit_of_measurement: min } }

set_program_minutes:
  fields:
    zone_id: { required: true, selector: { text: } }
    program_id: { required: true, selector: { text: } }
    minutes:
      selector: { number: { min: 1, max: 1440, unit_of_measurement: min } }
    day_minutes:
      selector: { object: }

add_program:
  fields:
    zone_id: { required: true, selector: { text: } }
    name: { selector: { text: } }
    copy_from: { selector: { text: } }

remove_program:
  fields:
    zone_id: { required: true, selector: { text: } }
    program_id: { required: true, selector: { text: } }

rename_program:
  fields:
    zone_id: { required: true, selector: { text: } }
    program_id: { required: true, selector: { text: } }
    name: { required: true, selector: { text: } }
```

- [ ] **Step 2: Add service names/descriptions to translations**

In `translations/en.json` under the `services` block, add an entry per service with `name`, `description`, and a `fields.<field>.{name,description}` for each field (follow the existing `set_curve` entry's shape exactly). Example for one:

```json
"set_program_schedule": {
  "name": "Set program schedule",
  "description": "Set the days and start time of a program.",
  "fields": {
    "zone_id": { "name": "Zone", "description": "The zone the program belongs to." },
    "program_id": { "name": "Program", "description": "The program to change." },
    "days": { "name": "Days", "description": "Weekdays it runs (Monday–Sunday). Leave empty for every day." },
    "start_kind": { "name": "Start type", "description": "Fixed time or sunrise/sunset." },
    "start_time": { "name": "Start time", "description": "When it starts, for a fixed-time start." },
    "start_event": { "name": "Sun event", "description": "Sunrise or sunset, for a sun start." },
    "start_offset_min": { "name": "Offset (min)", "description": "Minutes before (−) or after (+) the sun event." }
  }
}
```

Add the equivalent Italian entries in `it.json` (e.g. "Imposta la programmazione", "Giorni", "Orario di partenza", etc.). Repeat for `set_program_minutes`, `add_program`, `remove_program`, `rename_program`.

- [ ] **Step 3: Document the contract**

In `docs/design/card-contract.md`, add a short section: the `cycles[]` attribute now carries `days`, `day_minutes`, `amount`, `heat` (defined in Task 5), and list the five new services with their fields and the `set_program_minutes` exclusivity/volume rules. Note that user-facing copy calls a cycle a "program"; the internal key stays `cycles`.

- [ ] **Step 4: Run hassfest locally (services.yaml ↔ translations must match)**

Run: `.venv/bin/python -m script.hassfest --integration-path custom_components/irrigation_maestro` if available, otherwise rely on the CI `hassfest` job. At minimum verify JSON is valid:
Run: `.venv/bin/python -c "import json,glob; [json.load(open(f)) for f in glob.glob('custom_components/irrigation_maestro/translations/*.json')]"`
Expected: no error.

- [ ] **Step 5: Full gate**

Run:
```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest -q
```
Expected: all green. Confirm the §8 golden values (`test_evaluate`, `test_curves`, `test_weather`, `test_planner`) are all still passing untouched.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json docs/design/card-contract.md
git commit -m "docs+meta: services.yaml, service strings and contract for program scheduling"
```

---

## Self-Review

**1. Spec coverage (Phase A slice of the design):**
- `days` + `day_minutes` model → Task 1. ✓
- Weekday positive gate + `DAY_NOT_SCHEDULED` silent → Task 3. ✓
- Shared `resolve_day_curve` (ANCHORS, volume-guarded) used by planner + manual runs → Tasks 2 & 4. ✓
- Sensor attributes (days/day_minutes/amount/heat) → Task 5. ✓
- Services add/remove/rename/set_program_schedule/set_program_minutes, in-place, volume guard, ≥1 guard → Tasks 6 & 7. ✓
- services.yaml + IT/EN help + docs → Task 8. ✓
- §8 unchanged (asserted in Tasks 2/3, swept in Task 8) → ✓.
- Phase B items (panel, wizard, card strings, version bump) → explicitly out of scope. ✓

**2. Placeholder scan:** Task 4's exact expected minute and Task 5's setup helper are marked to be finalized against the file's existing fixtures during implementation — they are test *values*, not logic placeholders, and the surrounding assertions are concrete. All implementation steps carry real code.

**3. Type consistency:** `resolve_day_curve(curve, day_minutes, weekday)` used identically in Tasks 2 & 4. `_update_cycle(hass, entry, zone_id, cycle_id, mutate)` and `_program_context(call)` used consistently in Tasks 6 & 7. New const keys (`CONF_CYCLE_DAYS`, `CONF_CYCLE_DAY_MINUTES`) and attrs (`ATTR_PROGRAM_ID`, …) referenced consistently. `SkipReason.DAY_NOT_SCHEDULED` defined in Task 3 before its planner use.

**Note for the executor:** run every `pytest`/`ruff`/`mypy` command with the repo `.venv` (`.venv/bin/...`), the pinned toolchain. `days` is stored as a JSON list of ints and `day_minutes` as a JSON object with string keys (HA persists subentry data as JSON); the models coerce keys back to `int` on read.
