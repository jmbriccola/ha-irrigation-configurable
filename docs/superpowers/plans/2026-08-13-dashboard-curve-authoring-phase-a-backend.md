# Dashboard Curve Authoring — Phase A (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a curve a single stored form scaled by an explicit intensity, so no non-curve operation can ever rewrite it, and add the services the dashboard needs to duplicate a program and copy a curve.

**Architecture:** A curve is stored only as `points` + `min` + `max` + `kind`; a v2 -> v3 migration materialises the last template references. The quick minutes control stops writing points and instead stores an `intensity_pct`, folded into the adjustment factor `curve_value` already applies before its clamps — so `engine/curves.py` arithmetic is untouched and the engine's only three-point constraint (`resolve_day_curve`) disappears. The zone subentry flow is deleted; the panel is the only configuration surface.

**Tech Stack:** Python 3.13 syntax (ruff target py313, mypy `python_version = 3.14`), Home Assistant custom integration, pytest + pytest-homeassistant-custom-component, voluptuous service schemas.

**Spec:** `docs/superpowers/specs/2026-08-13-dashboard-curve-authoring-design.md`

## Global Constraints

- The weather decision engine is out of scope: `engine/weather.py`, `engine/evaluate.py`, `engine/history.py` are **not modified**. The only `engine/curves.py` change is the behaviour-preserving extraction in Task 1.
- The control points of `PRESET_POTS` and `PRESET_LAWN` are **never modified**. The §8 regression tests (`tests/engine/test_curves.py`, `tests/engine/test_weather.py`) must pass **unchanged** throughout.
- Code, comments and docstrings in **English**. UI strings translated in both `translations/en.json` and `translations/it.json`.
- Everything async, no blocking I/O, no YAML configuration.
- Every new service is declared in `services.yaml` **and** registered in `async_register_services` — two separate edits in two separate places.
- Backward compatibility: `resolve_curve` keeps resolving `{"template": ...}` so `import_config` still accepts a 2.x payload. Migrations are idempotent.
- Reference temperature for the minutes <-> intensity conversion is **25.0 °C** (`const.CURVE_REFERENCE_TEMP_C`).
- Phase A must leave the **currently shipped card working**: the zone sensor keeps publishing `amount`, `heat` and `day_minutes` as derived compatibility values (Task 11). `set_simple_curve` and `engine/semantic.py` survive Phase A and are removed in Phase B.
- Run `ruff check . && ruff format --check . && mypy custom_components` before every commit; the full suite (`pytest`) must be green at every task boundary.

---

### Task 1: Unclamped interpolation helper

Services and the migration need the curve's raw value at 25 °C. Deriving the intensity from the *clamped* value would miss the target: with a floor of 10 and a raw value of 8, asking for 20 minutes would compute 200 % and deliver 16.

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/curves.py:59-77`
- Test: `tests/engine/test_curves.py`

**Interfaces:**
- Produces: `interpolate(points: Sequence[CurvePoint], temp_c: float) -> float` — linear interpolation between control points, flat beyond the extremes, **no adjustment and no clamps**.

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/test_curves.py`:

```python
class TestInterpolate:
    """Raw interpolation: no adjustment, no clamps."""

    def test_ignores_the_clamps(self) -> None:
        # PRESET_POTS floors at 10 min, but the raw line through (10,10) and
        # (30,30) is 5 at 5 degrees. curve_value clamps it; interpolate does not.
        assert interpolate(PRESET_POTS.points, 5.0) == pytest.approx(10.0)
        curve = Curve(points=((10.0, 5.0), (30.0, 30.0)), min_value=10.0, max_value=55.0)
        assert interpolate(curve.points, 10.0) == pytest.approx(5.0)
        assert curve_value(curve, 10.0) == pytest.approx(10.0)

    def test_interpolates_between_points(self) -> None:
        assert interpolate(PRESET_POTS.points, 20.0) == pytest.approx(20.0)
        assert interpolate(PRESET_POTS.points, 36.0) == pytest.approx(42.0)

    def test_flat_beyond_the_extremes(self) -> None:
        assert interpolate(PRESET_POTS.points, -5.0) == pytest.approx(10.0)
        assert interpolate(PRESET_POTS.points, 99.0) == pytest.approx(55.0)
```

Add `interpolate` to the existing `from custom_components.irrigation_maestro.engine.curves import (...)` block at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/engine/test_curves.py::TestInterpolate -v`
Expected: FAIL — `ImportError: cannot import name 'interpolate'`

- [ ] **Step 3: Write minimal implementation**

In `engine/curves.py`, insert `interpolate` above `curve_value` and rewrite `curve_value` to use it. The arithmetic is moved verbatim, not changed:

```python
def interpolate(points: Sequence[CurvePoint], temp_c: float) -> float:
    """The curve's raw value: linear between points, flat beyond the extremes.

    No adjustment factor and no clamps — callers that need the configured
    value use curve_value. Scaling a curve to a target duration needs the
    unclamped value, otherwise an active clamp makes the target unreachable.
    """
    if temp_c <= points[0][0]:
        return points[0][1]
    if temp_c >= points[-1][0]:
        return points[-1][1]
    for (t0, v0), (t1, v1) in pairwise(points):
        if t0 <= temp_c <= t1:
            return v0 + (v1 - v0) * (temp_c - t0) / (t1 - t0)
    return points[-1][1]


def curve_value(curve: Curve, temp_c: float, adjustment_pct: float = 100.0) -> float:
    """Evaluate the curve at a temperature.

    Linear interpolation between points, flat beyond the extremes, then the
    adjustment factor, then the min/max clamps.
    """
    adjusted = interpolate(curve.points, temp_c) * adjustment_pct / 100.0
    return min(max(adjusted, curve.min_value), curve.max_value)
```

- [ ] **Step 4: Run the curve and §8 regression tests**

Run: `pytest tests/engine/test_curves.py tests/engine/test_weather.py tests/engine/test_planner.py -v`
Expected: PASS — all of them, with the §8 assertions unmodified. This is the proof the extraction changed no behaviour.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/engine/curves.py tests/engine/test_curves.py
git commit -m "refactor(engine): expose the curve's unclamped value

Scaling a curve to a target duration needs the raw value: deriving the
factor from the clamped one makes the target unreachable whenever a clamp
is active. Pure extraction — curve_value keeps its exact behaviour."
```

---

### Task 2: Program intensity replaces the three-anchor rebuild

`resolve_day_curve` is the only place in the engine that imposes three control points: given per-day minutes it discards the configured curve and rebuilds one from the semantic anchors, so a six-point curve silently becomes three points at evaluation time.

**Files:**
- Modify: `custom_components/irrigation_maestro/engine/planner.py:23-70` (CycleSpec, delete `resolve_day_curve`), `:131-157` (`_cycle_target`)
- Modify: `custom_components/irrigation_maestro/const.py`
- Test: `tests/engine/test_planner.py`

**Interfaces:**
- Consumes: `interpolate` (Task 1).
- Produces: `CycleSpec.intensity_pct: float = 100.0`, `CycleSpec.day_intensity_pct: dict[int, float]` (weekday -> percent, overriding the uniform value for that day). `CycleSpec.day_minutes` is **removed**. `const.CURVE_REFERENCE_TEMP_C: Final = 25.0`.

- [ ] **Step 1: Write the failing test**

In `tests/engine/test_planner.py`, add `intensity_pct=100.0` and `day_intensity_pct={}` to the `defaults` dict in `make_cycle`, remove `resolve_day_curve` from the imports, delete the existing `resolve_day_curve` tests, and append:

```python
SIX_POINT = Curve(
    points=((5.0, 4.0), (12.0, 10.0), (20.0, 18.0), (25.0, 24.0), (33.0, 40.0), (40.0, 52.0)),
    min_value=1.0,
    max_value=60.0,
)


class TestIntensity:
    """The intensity scales the configured curve; it never replaces it."""

    def _duration(self, cycle, zone_kwargs=None, weekday=4):
        return _cycle_target(cycle, make_zone(**(zone_kwargs or {})), 33.0, 1.0, weekday)[0]

    def test_uniform_intensity_scales_every_point(self) -> None:
        # 33 C sits exactly on a control point: raw 40 min.
        plain = self._duration(make_cycle(curve=SIX_POINT))
        scaled = self._duration(make_cycle(curve=SIX_POINT, intensity_pct=150.0))
        assert plain == 40
        assert scaled == 60  # 40 * 1.5, still under the 60 ceiling

    def test_per_day_intensity_overrides_the_uniform_one(self) -> None:
        cycle = make_cycle(curve=SIX_POINT, intensity_pct=150.0, day_intensity_pct={4: 50.0})
        assert self._duration(cycle, weekday=4) == 20  # Friday: 40 * 0.5
        assert self._duration(cycle, weekday=3) == 60  # Thursday: 40 * 1.5

    def test_the_curve_shape_survives_the_scale(self) -> None:
        """The defect this replaces: per-day minutes rebuilt three anchors,
        flattening everything above the hot anchor. Scaling keeps the shape,
        so the ratio between two temperatures is unchanged."""
        cycle = make_cycle(curve=SIX_POINT, intensity_pct=50.0)
        zone = make_zone()
        cold = _cycle_target(cycle, zone, 12.0, 1.0, 4)[0]
        hot = _cycle_target(cycle, zone, 40.0, 1.0, 4)[0]
        assert cold == 5  # 10 * 0.5
        assert hot == 26  # 52 * 0.5

    def test_intensity_composes_with_the_zone_adjustment(self) -> None:
        cycle = make_cycle(curve=SIX_POINT, intensity_pct=50.0)
        assert self._duration(cycle, {"adjustment_pct": 200.0}) == 40  # 40 * 0.5 * 2.0

    def test_the_clamps_are_not_scaled(self) -> None:
        """min/max are safety guards the user set; the intensity must not move
        the guard along with the thing it guards."""
        floored = Curve(points=((25.0, 8.0),), min_value=10.0, max_value=55.0)
        cycle = make_cycle(curve=floored, intensity_pct=50.0)
        # raw 8 * 0.5 = 4, floored back up to the unscaled minimum of 10.
        assert self._duration(cycle) == 10
```

Add `Curve` and `_cycle_target` to the imports at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/engine/test_planner.py::TestIntensity -v`
Expected: FAIL — `TypeError: CycleSpec.__init__() got an unexpected keyword argument 'intensity_pct'`

- [ ] **Step 3: Write minimal implementation**

In `const.py`, next to the other curve constants (near `CONF_CURVE_KIND`):

```python
CONF_CYCLE_INTENSITY_PCT: Final = "intensity_pct"
CONF_CYCLE_DAY_INTENSITY_PCT: Final = "day_intensity_pct"

#: Temperature the quick minutes control converts against: "N minutes" means
#: N minutes at this temperature, expressed as a percentage of the curve's
#: raw value there.
CURVE_REFERENCE_TEMP_C: Final = 25.0
```

In `engine/planner.py`: replace `day_minutes: dict[int, int] = field(default_factory=dict)` in `CycleSpec` with

```python
    intensity_pct: float = 100.0
    day_intensity_pct: dict[int, float] = field(default_factory=dict)
```

Delete `resolve_day_curve` entirely, and drop `ANCHORS` / `points_from_semantic` from the imports if nothing else in the file uses them. Then in `_cycle_target` replace the first two lines of the body:

```python
    # The intensity scales the configured curve instead of replacing it, so a
    # curve keeps every control point the user authored. It rides the same
    # adjustment argument curve_value already applies before its clamps, which
    # fixes the order: curve -> zone adjustment -> intensity -> clamps.
    factor = cycle.day_intensity_pct.get(weekday, cycle.intensity_pct)
    value = curve_value(cycle.curve, weighted_temp, zone.adjustment_pct * factor / 100.0)
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/engine/ -v`
Expected: PASS. The §8 assertions in `test_weather.py` and `test_curves.py` are untouched and still pass.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/engine/planner.py custom_components/irrigation_maestro/const.py tests/engine/test_planner.py
git commit -m "feat(engine): scale the curve by an intensity instead of rebuilding it

resolve_day_curve discarded the configured curve and rebuilt three anchors
from the semantic model whenever per-day minutes were set, so a six-point
curve silently became a three-point one at evaluation time. A percentage
folded into the existing adjustment factor scales any curve with any
number of points and leaves engine/curves.py arithmetic untouched."
```

---

### Task 3: Typed model carries the intensity

**Files:**
- Modify: `custom_components/irrigation_maestro/models.py:108-161` (`CycleConfig`)
- Test: `tests/components/test_models.py`

**Interfaces:**
- Consumes: `const.CONF_CYCLE_INTENSITY_PCT`, `const.CONF_CYCLE_DAY_INTENSITY_PCT`, `CycleSpec.intensity_pct` / `.day_intensity_pct` (Task 2).
- Produces: `CycleConfig.intensity_pct: float`, `CycleConfig.day_intensity_pct: dict[int, float]`; `CycleConfig.day_minutes` is removed; `to_spec` forwards both.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_models.py`:

```python
class TestCycleIntensity:
    def test_absent_intensity_reads_as_one_hundred(self) -> None:
        cycle = CycleConfig.from_config(
            {
                "id": "c1",
                "name": "Morning",
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {"points": [[20.0, 5.0]], "min_value": 1.0, "max_value": 60.0},
            },
            {},
        )
        assert cycle.intensity_pct == 100.0
        assert cycle.day_intensity_pct == {}

    def test_intensity_parsed_and_forwarded_to_the_spec(self) -> None:
        cycle = CycleConfig.from_config(
            {
                "id": "c1",
                "name": "Morning",
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {"points": [[20.0, 5.0]], "min_value": 1.0, "max_value": 60.0},
                "intensity_pct": 133.0,
                "day_intensity_pct": {"0": 50.0, "6": 200.0},
            },
            {},
        )
        assert cycle.intensity_pct == 133.0
        assert cycle.day_intensity_pct == {0: 50.0, 6: 200.0}
        spec = cycle.to_spec(enabled=True)
        assert spec.intensity_pct == 133.0
        assert spec.day_intensity_pct == {0: 50.0, 6: 200.0}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_models.py::TestCycleIntensity -v`
Expected: FAIL — `AttributeError: 'CycleConfig' object has no attribute 'intensity_pct'`

- [ ] **Step 3: Write minimal implementation**

In `models.py`, in `CycleConfig`, replace the `day_minutes` field with:

```python
    intensity_pct: float = 100.0
    day_intensity_pct: dict[int, float] = field(default_factory=dict)
```

In `from_config`, replace the `day_minutes_raw` line and the `day_minutes=` argument with:

```python
        day_intensity_raw = config.get(const.CONF_CYCLE_DAY_INTENSITY_PCT, {})
```

```python
            intensity_pct=float(config.get(const.CONF_CYCLE_INTENSITY_PCT, 100.0)),
            day_intensity_pct={int(k): float(v) for k, v in day_intensity_raw.items()},
```

In `to_spec`, replace `day_minutes=self.day_minutes` with:

```python
            intensity_pct=self.intensity_pct,
            day_intensity_pct=self.day_intensity_pct,
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_models.py -v && mypy custom_components`
Expected: PASS, mypy clean.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/models.py tests/components/test_models.py
git commit -m "feat(models): parse the program intensity"
```

---

### Task 4: Migration materialises template references

**Files:**
- Modify: `custom_components/irrigation_maestro/migration.py`
- Test: `tests/components/test_migration.py`

**Interfaces:**
- Consumes: `resolve_curve` (`models.py:66`), `MigrationNote` (`migration.py:26`).
- Produces: `migrate_zone_v2_to_v3(zone_data: dict[str, Any], templates: dict[str, Any]) -> tuple[dict[str, Any], list[MigrationNote]]`.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_migration.py`:

```python
class TestCurveMaterialisation:
    def _zone(self, curve: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "cycles": [{"id": "c1", "name": "Morning", "curve": curve}],
        }

    def test_preset_reference_becomes_its_exact_points(self) -> None:
        data, notes = migrate_zone_v2_to_v3(self._zone({"template": "preset_pots"}), {})
        curve = data["cycles"][0]["curve"]
        assert "template" not in curve
        assert curve["points"] == [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]]
        assert curve["min_value"] == 10.0
        assert curve["max_value"] == 55.0
        assert curve["kind"] == "duration"
        assert notes == []

    def test_running_twice_changes_nothing(self) -> None:
        once, _ = migrate_zone_v2_to_v3(self._zone({"template": "preset_pots"}), {})
        twice, notes = migrate_zone_v2_to_v3(deepcopy(once), {})
        assert twice == once
        assert notes == []

    def test_explicit_points_are_left_alone(self) -> None:
        original = {"points": [[12.0, 5.0], [25.0, 15.0]], "min_value": 1.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(dict(original)), {})
        assert data["cycles"][0]["curve"] == original
        assert notes == []

    def test_hub_template_is_resolved(self) -> None:
        templates = {"custom": {"points": [[15.0, 7.0]], "min_value": 1.0, "max_value": 30.0}}
        data, _ = migrate_zone_v2_to_v3(self._zone({"template": "custom"}), templates)
        assert data["cycles"][0]["curve"]["points"] == [[15.0, 7.0]]

    def test_unresolvable_template_is_reported_not_guessed(self) -> None:
        data, notes = migrate_zone_v2_to_v3(self._zone({"template": "gone"}), {})
        assert data["cycles"][0]["curve"] == {"template": "gone"}
        assert [note.kind for note in notes] == ["curve_template_missing"]
```

Add `from copy import deepcopy`, `from typing import Any` and `migrate_zone_v2_to_v3` to the imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_migration.py::TestCurveMaterialisation -v`
Expected: FAIL — `ImportError: cannot import name 'migrate_zone_v2_to_v3'`

- [ ] **Step 3: Write minimal implementation**

Append to `migration.py`:

```python
def migrate_zone_v2_to_v3(
    zone_data: dict[str, Any], templates: dict[str, Any]
) -> tuple[dict[str, Any], list[MigrationNote]]:
    """Rewrite one zone subentry for v3: curves become explicit points.

    Presets left the user interface in 3.0.0, so a stored reference is a form
    nobody can create or inspect any more. Materialising it is lossless — the
    points written are exactly the preset's — and leaves one convention in
    user data, which is what stops a reference being silently replaced.
    """
    # Imported here: models imports from this module's package at load time and
    # a module-level import would be circular.
    from .models import resolve_curve

    zone = dict(zone_data)
    notes: list[MigrationNote] = []
    zone_name = str(zone.get(const.CONF_ZONE_NAME, ""))
    cycles: list[dict[str, Any]] = []
    for raw_cycle in zone.get(const.CONF_CYCLES, []):
        cycle = dict(raw_cycle)
        name = str(cycle.get(const.CONF_CYCLE_NAME, ""))
        curve = dict(cycle.get(const.CONF_CURVE, {}))
        if const.CONF_CURVE_TEMPLATE in curve:
            try:
                resolved = resolve_curve(curve, templates)
            except CurveError:
                # Never guess a duration: keep the reference and report it.
                notes.append(
                    MigrationNote(
                        "curve_template_missing",
                        zone_name,
                        name,
                        {"template": curve[const.CONF_CURVE_TEMPLATE]},
                    )
                )
                cycles.append(cycle)
                continue
            cycle[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[temp, value] for temp, value in resolved.points],
                const.CONF_CURVE_MIN: resolved.min_value,
                const.CONF_CURVE_MAX: resolved.max_value,
                const.CONF_CURVE_KIND: str(resolved.kind),
            }
        cycles.append(cycle)

    zone[const.CONF_CYCLES] = cycles
    return zone, notes
```

Add `from .engine.curves import CurveError` to the imports at the top of `migration.py`.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_migration.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/migration.py tests/components/test_migration.py
git commit -m "feat(migration): materialise stored curve template references"
```

---

### Task 5: Migration converts per-day minutes, and the hook runs it

**Files:**
- Modify: `custom_components/irrigation_maestro/migration.py` (extend `migrate_zone_v2_to_v3`)
- Modify: `custom_components/irrigation_maestro/__init__.py:86-107`
- Modify: `custom_components/irrigation_maestro/config_flow.py:212`
- Modify: `tests/components/test_session.py:97` (`setup_hub` creates a v3 entry)
- Test: `tests/components/test_migration.py`

**Interfaces:**
- Consumes: `interpolate` (Task 1), `const.CURVE_REFERENCE_TEMP_C` (Task 2).
- Produces: `migrate_zone_v2_to_v3` additionally rewrites `day_minutes` into `day_intensity_pct` and drops the old key. Entry version becomes 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_migration.py`, inside a new class:

```python
class TestPerDayMinutesConversion:
    def _zone(self, curve: dict[str, Any], day_minutes: dict[str, int]) -> dict[str, Any]:
        return {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "cycles": [
                {"id": "c1", "name": "Morning", "curve": curve, "day_minutes": day_minutes}
            ],
        }

    def test_minutes_become_an_equivalent_percentage(self) -> None:
        # Raw value at 25 C is 20 min; 30 minutes on Monday is 150 %.
        curve = {"points": [[25.0, 20.0]], "min_value": 1.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30, "3": 10}), {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert cycle["day_intensity_pct"] == {"0": 150.0, "3": 50.0}
        assert notes == []

    def test_conversion_uses_the_unclamped_value(self) -> None:
        """A floor of 10 over a raw 8 must not distort the factor: asking for
        20 minutes is 250 % of 8, not 200 % of the clamped 10."""
        curve = {"points": [[25.0, 8.0]], "min_value": 10.0, "max_value": 60.0}
        data, _ = migrate_zone_v2_to_v3(self._zone(curve, {"0": 20}), {})
        assert data["cycles"][0]["day_intensity_pct"] == {"0": 250.0}

    def test_running_twice_changes_nothing(self) -> None:
        curve = {"points": [[25.0, 20.0]], "min_value": 1.0, "max_value": 60.0}
        once, _ = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30}), {})
        twice, notes = migrate_zone_v2_to_v3(deepcopy(once), {})
        assert twice == once
        assert notes == []

    def test_a_zero_curve_cannot_be_scaled_and_is_reported(self) -> None:
        curve = {"points": [[25.0, 0.0]], "min_value": 0.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30}), {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert "day_intensity_pct" not in cycle
        assert [note.kind for note in notes] == ["day_minutes_dropped"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_migration.py::TestPerDayMinutesConversion -v`
Expected: FAIL — `KeyError: 'day_intensity_pct'` (the key is not produced yet)

- [ ] **Step 3: Write minimal implementation**

In `migrate_zone_v2_to_v3`, after the curve block and before `cycles.append(cycle)`, insert:

```python
        day_minutes = cycle.pop(const.CONF_CYCLE_DAY_MINUTES, None)
        if day_minutes:
            points = cycle[const.CONF_CURVE].get(const.CONF_CURVE_POINTS)
            reference = (
                interpolate(
                    [(float(t), float(v)) for t, v in points], const.CURVE_REFERENCE_TEMP_C
                )
                if points
                else 0.0
            )
            if reference > 0:
                cycle[const.CONF_CYCLE_DAY_INTENSITY_PCT] = {
                    str(day): round(100.0 * float(minutes) / reference, 2)
                    for day, minutes in day_minutes.items()
                }
            else:
                # A curve worth zero minutes at the reference cannot be scaled
                # into anything; report the loss instead of inventing a factor.
                notes.append(
                    MigrationNote("day_minutes_dropped", zone_name, name, dict(day_minutes))
                )
```

Add `from .engine.curves import CurveError, interpolate` to the imports.

In `__init__.py`, change the guard and add the v2 -> v3 leg. The existing v1 -> v2 body stays; after it (and for entries already at version 2) run:

```python
async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate old config entries (schema versioning from 1.0, §7)."""
    if entry.version > 3:
        # Downgrade from a future major version: refuse, do not guess.
        return False
```

and, after the v1 -> v2 work has produced `version=2`, append the v3 leg that iterates the subentries calling `migrate_zone_v2_to_v3(dict(subentry.data), templates)` with
`templates = entry.options.get(const.CONF_CURVE_TEMPLATES, {})`, writes each result back with `hass.config_entries.async_update_subentry(entry, subentry, data=data)`, collects the notes into the same repair-issue path the v1 -> v2 notes already use, and finishes with
`hass.config_entries.async_update_entry(entry, version=3, minor_version=0)`.

In `config_flow.py:212`, `VERSION = 2` becomes `VERSION = 3`.

In `tests/components/test_session.py:97`, `version=2` becomes `version=3` so component tests exercise the current schema rather than the migration on every setup.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/ -v`
Expected: PASS — including the existing v1 -> v2 migration tests, which must keep passing untouched.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/migration.py custom_components/irrigation_maestro/__init__.py custom_components/irrigation_maestro/config_flow.py tests/components/test_migration.py tests/components/test_session.py
git commit -m "feat(migration): per-day minutes become a per-day intensity (v2 -> v3)

Declared behaviour change: per-day minutes now scale the whole curve
proportionally where before they rebuilt three anchors and kept the heat
delta absolute. The mild value is identical; the hot value follows the
curve the user authored instead of a regenerated one."
```

---

### Task 6: The quick minutes control stops writing the curve

This is the defect at the centre of the work: `set_program_minutes` re-read `heat` from the curve and rewrote the points, so a preset reference was replaced by materialised points without a word.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py:781-830` (`_async_set_program_minutes`)
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `translations/it.json`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: `interpolate` (Task 1), `const.CURVE_REFERENCE_TEMP_C`, `const.CONF_CYCLE_INTENSITY_PCT`, `const.CONF_CYCLE_DAY_INTENSITY_PCT` (Task 2).
- Produces: `set_program_minutes` writes only `intensity_pct` / `day_intensity_pct`; new error key `cannot_scale_zero_curve`.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_services.py`:

```python
async def test_set_program_minutes_never_touches_the_curve(hass: HomeAssistant) -> None:
    """The regression this release exists for: a quick minutes change used to
    rewrite the control points, silently replacing whatever curve was there."""
    mock_weather(hass)
    curve = {
        "points": [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]],
        "min_value": 10.0,
        "max_value": 55.0,
    }
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": dict(curve),
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "minutes": 50},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["curve"] == curve  # every control point survives
    # Raw value at 25 C is 25 min, so 50 minutes is 200 %.
    assert stored["intensity_pct"] == 200.0


async def test_set_program_minutes_hits_the_target_through_a_floor(
    hass: HomeAssistant,
) -> None:
    """The factor comes from the unclamped value: deriving it from the clamped
    one would ask for 200 % and deliver 16 minutes instead of 20."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 8.0]],
                            "min_value": 10.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "minutes": 20},
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle("c1")
    assert cycle.intensity_pct == 250.0
    assert curve_value(cycle.curve, 25.0, cycle.intensity_pct) == pytest.approx(20.0)


async def test_set_program_minutes_refuses_a_curve_worth_zero(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 0.0]],
                            "min_value": 0.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_minutes",
            {"zone_id": zone_id, "program_id": "c1", "minutes": 20},
            blocking=True,
        )


async def test_set_program_day_minutes_writes_per_day_intensity(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 20.0]],
                            "min_value": 1.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "day_minutes": {"0": 30, "3": 10}},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["day_intensity_pct"] == {"0": 150.0, "3": 50.0}
    assert "day_minutes" not in stored
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_services.py -k "program_minutes" -v`
Expected: FAIL — the stored cycle still has rewritten `curve` points and no `intensity_pct`.

- [ ] **Step 3: Write minimal implementation**

Replace the body of `_async_set_program_minutes` after the volume guard with:

```python
    reference = interpolate(cycle.curve.points, const.CURVE_REFERENCE_TEMP_C)
    if reference <= 0:
        # A curve worth zero minutes at the reference cannot be scaled into
        # any target; refuse rather than divide by zero or invent points.
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="cannot_scale_zero_curve",
            translation_placeholders={"cycle_id": program_id},
        )

    mutate: Callable[[dict[str, Any]], None]
    if ATTR_MINUTES in call.data:
        intensity = round(100.0 * float(call.data[ATTR_MINUTES]) / reference, 2)

        def mutate(item: dict[str, Any]) -> None:
            # The curve is never touched here: minutes are a strength, not a
            # shape. Uniform minutes clear any per-day override.
            item[const.CONF_CYCLE_INTENSITY_PCT] = intensity
            item.pop(const.CONF_CYCLE_DAY_INTENSITY_PCT, None)

    elif ATTR_DAY_MINUTES in call.data:
        day_map: dict[str, float] = {}
        for raw_key, raw_val in call.data[ATTR_DAY_MINUTES].items():
            try:
                weekday = int(raw_key)
            except (TypeError, ValueError):
                raise ServiceValidationError(
                    translation_domain=DOMAIN, translation_key="invalid_weekday"
                ) from None
            if not 0 <= weekday <= 6:
                raise ServiceValidationError(
                    translation_domain=DOMAIN, translation_key="invalid_weekday"
                )
            day_map[str(weekday)] = round(100.0 * float(raw_val) / reference, 2)

        def mutate(item: dict[str, Any]) -> None:
            item[const.CONF_CYCLE_DAY_INTENSITY_PCT] = day_map

    else:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="minutes_required")

    _update_cycle(hass, entry, zone_id, program_id, mutate)
```

Add `interpolate` to the `from .engine.curves import ...` line in `services.py`.

In both `translations/en.json` and `translations/it.json`, add to `exceptions`:

```json
"cannot_scale_zero_curve": {
  "message": "Program {cycle_id} waters for zero minutes at 25 °C, so it cannot be scaled to a target. Edit its curve instead."
}
```

Italian:

```json
"cannot_scale_zero_curve": {
  "message": "Il programma {cycle_id} a 25 °C irriga per zero minuti, quindi non può essere scalato a un obiettivo. Modifica invece la sua curva."
}
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_services.py -v`
Expected: PASS. Tests that asserted the old rewrite-the-curve behaviour are rewritten here, not deleted silently.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/translations tests/components/test_services.py
git commit -m "fix(services): the minutes control scales, it no longer rewrites the curve

set_program_minutes re-read heat from the curve and rewrote the control
points, which silently replaced a preset reference with materialised
points. Minutes are a strength, not a shape: they now store a percentage
and leave the curve alone."
```

---

### Task 7: `set_curve` can set the kind

Once the config flow's curve step is gone (Task 12) this is the only way left to create a volume program.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py:638-676` (`_async_set_curve`), the `_SET_CURVE_SCHEMA` near `:376`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: `set_curve` accepts optional `kind` (`"duration"` | `"volume"`), rejected with `volume_requires_flow` when the zone has no usable flow meter.

- [ ] **Step 1: Write the failing test**

```python
async def test_set_curve_switches_kind_to_volume_with_a_meter(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots", flow_sensor="sensor.pots_flow")],
    )
    hass.states.async_set("sensor.pots_flow", "5.0")
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {
            "zone_id": zone_id,
            "cycle_id": "cy_pots",
            "points": [[20.0, 30.0]],
            "min_value": 1.0,
            "max_value": 100.0,
            "kind": "volume",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.curve.kind is CurveKind.VOLUME


async def test_set_curve_refuses_volume_without_a_meter(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {
                "zone_id": zone_id,
                "cycle_id": "cy_pots",
                "points": [[20.0, 30.0]],
                "kind": "volume",
            },
            blocking=True,
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_services.py -k "set_curve" -v`
Expected: FAIL — `vol.Invalid: extra keys not allowed @ data['kind']`

- [ ] **Step 3: Write minimal implementation**

Add to `_SET_CURVE_SCHEMA`:

```python
        vol.Optional(ATTR_KIND): vol.In([str(CurveKind.DURATION), str(CurveKind.VOLUME)]),
```

with `ATTR_KIND: Final = "kind"` next to the other attribute constants. In `_async_set_curve`, after the min/max validation and before `_write_cycle_curve`:

```python
    kind = str(call.data.get(ATTR_KIND, cycle.curve.kind))
    if kind == CurveKind.VOLUME and not runtime.zone_has_flow_meter(
        runtime.zones[zone_id].config
    ):
        # A volume target without a usable meter would degrade to a timed run;
        # refuse at configuration time rather than surprise at watering time.
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": cycle_id},
        )
```

and pass `kind` instead of `str(cycle.curve.kind)` to `_write_cycle_curve`.

Add the `volume_requires_flow` message to both translation files under `exceptions` if it is not already there, and declare the new `kind` field in `services.yaml` under `set_curve`:

```yaml
    kind:
      required: false
      example: duration
      selector:
        select:
          options:
            - duration
            - volume
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_services.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations tests/components/test_services.py
git commit -m "feat(services): set_curve can set the curve kind

With the config flow's curve step gone there would otherwise be no way to
create a volume program from the dashboard."
```

---

### Task 8: `duplicate_program`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py` (schema, handler, registration near `:1192`)
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `translations/it.json`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: service `duplicate_program(zone_id, program_id, target_zone_id?, name?)` returning `{"program_id": str}`; constant `SERVICE_DUPLICATE_PROGRAM: Final = "duplicate_program"`; helper `_unique_program_name(cycles: list[dict[str, Any]], preferred: str) -> str`.

- [ ] **Step 1: Write the failing test**

```python
async def test_duplicate_program_is_a_fresh_program(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    # A watering marker on the source: the duplicate must not inherit cadence.
    entry.runtime_data.state.set_last_completed(zone_id, "cy_pots", dt_util.now().date())

    response = await hass.services.async_call(
        DOMAIN,
        "duplicate_program",
        {"zone_id": zone_id, "program_id": "cy_pots"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    new_id = response["program_id"]
    assert new_id != "cy_pots"
    cycles = entry.subentries[zone_id].data["cycles"]
    assert len(cycles) == 2
    duplicate = next(c for c in cycles if c["id"] == new_id)
    source = next(c for c in cycles if c["id"] == "cy_pots")
    assert duplicate["curve"] == source["curve"]
    assert duplicate["name"] == "Morning (copy)"
    assert entry.runtime_data.state.last_completed(zone_id, new_id) is None


async def test_duplicate_program_name_does_not_collide(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    for _ in range(2):
        await hass.services.async_call(
            DOMAIN,
            "duplicate_program",
            {"zone_id": zone_id, "program_id": "cy_pots"},
            blocking=True,
            return_response=True,
        )
        await hass.async_block_till_done()

    names = [c["name"] for c in entry.subentries[zone_id].data["cycles"]]
    assert names == ["Morning", "Morning (copy)", "Morning (copy 2)"]


async def test_duplicate_program_into_another_zone(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots"), zone_data("Lawn", "valve.lawn")],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]

    response = await hass.services.async_call(
        DOMAIN,
        "duplicate_program",
        {"zone_id": pots, "program_id": "cy_pots", "target_zone_id": lawn, "name": "Borrowed"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    assert len(entry.subentries[pots].data["cycles"]) == 1
    lawn_cycles = entry.subentries[lawn].data["cycles"]
    assert [c["name"] for c in lawn_cycles] == ["Morning", "Borrowed"]
    assert lawn_cycles[1]["id"] == response["program_id"]


async def test_duplicate_volume_program_into_a_meterless_zone_is_refused(
    hass: HomeAssistant,
) -> None:
    """Documented behaviour: refuse, rather than silently degrade the copy to
    a timed run in a zone that cannot measure liters."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                flow_sensor="sensor.pots_flow",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[20.0, 30.0]],
                            "min_value": 1.0,
                            "max_value": 100.0,
                            "kind": "volume",
                        },
                    }
                ],
            ),
            zone_data("Lawn", "valve.lawn"),
        ],
    )
    hass.states.async_set("sensor.pots_flow", "5.0")
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "duplicate_program",
            {"zone_id": pots, "program_id": "c1", "target_zone_id": lawn},
            blocking=True,
            return_response=True,
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_services.py -k duplicate -v`
Expected: FAIL — `ServiceNotFound: irrigation_maestro.duplicate_program`

- [ ] **Step 3: Write minimal implementation**

Constants and schema:

```python
SERVICE_DUPLICATE_PROGRAM: Final = "duplicate_program"
ATTR_TARGET_ZONE_ID: Final = "target_zone_id"

_DUPLICATE_PROGRAM_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
        vol.Optional(ATTR_TARGET_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
    }
)
```

Helper and handler:

```python
def _unique_program_name(cycles: list[dict[str, Any]], preferred: str) -> str:
    """A name no program in the target zone already uses."""
    taken = {str(cycle.get(const.CONF_CYCLE_NAME, "")) for cycle in cycles}
    if preferred not in taken:
        return preferred
    for suffix in range(2, 100):
        candidate = f"{preferred} {suffix}"
        if candidate not in taken:
            return candidate
    return f"{preferred} {uuid4().hex[:4]}"


async def _async_duplicate_program(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    target_zone_id: str = call.data.get(ATTR_TARGET_ZONE_ID, zone_id)
    _require_zone(runtime, target_zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]

    source = next(
        (
            dict(item)
            for item in entry.subentries[zone_id].data.get(const.CONF_CYCLES, [])
            if item.get(const.CONF_CYCLE_ID) == program_id
        ),
        None,
    )
    if source is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": program_id},
        )

    target = entry.subentries[target_zone_id]
    cycles = [dict(item) for item in target.data.get(const.CONF_CYCLES, [])]

    program = deepcopy(source)
    # A fresh id is what keeps runtime state out of the copy: last_completed
    # and outcome_log are keyed by program, so the duplicate starts unmarked.
    program[const.CONF_CYCLE_ID] = uuid4().hex[:8]
    preferred = call.data.get(
        ATTR_NAME, f"{source.get(const.CONF_CYCLE_NAME, 'Program')} (copy)"
    )
    program[const.CONF_CYCLE_NAME] = _unique_program_name(cycles, str(preferred))

    curve = resolve_curve(program[const.CONF_CURVE], runtime.hub.curve_templates)
    if curve.kind is CurveKind.VOLUME and not runtime.zone_has_flow_meter(
        runtime.zones[target_zone_id].config
    ):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": program[const.CONF_CYCLE_ID]},
        )

    _validate_program(program, runtime.hub.curve_templates)
    cycles.append(program)
    hass.config_entries.async_update_subentry(
        entry, target, data={**target.data, const.CONF_CYCLES: cycles}
    )
    return {"program_id": program[const.CONF_CYCLE_ID]}
```

Add `from copy import deepcopy` and `resolve_curve` to the `from .models import ...` line if absent.

Register it in `async_register_services`:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_DUPLICATE_PROGRAM,
        _async_duplicate_program,
        _DUPLICATE_PROGRAM_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
```

Declare it in `services.yaml`:

```yaml
duplicate_program:
  fields:
    zone_id:
      required: true
      example: 01J8ZQ
      selector:
        text:
    program_id:
      required: true
      example: a1b2c3d4
      selector:
        text:
    target_zone_id:
      required: false
      example: 01J8ZR
      selector:
        text:
    name:
      required: false
      example: Morning (copy)
      selector:
        text:
```

Add `services.duplicate_program` name/description and each field's name/description to both `translations/en.json` and `translations/it.json`, matching the structure the existing services use.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_services.py -k duplicate -v && pytest tests/components/test_resources.py -v`
Expected: PASS — `test_resources.py` checks every registered service is declared in `services.yaml`, so it catches a half-added service.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations tests/components/test_services.py
git commit -m "feat(services): duplicate_program

A fresh id keeps the copy free of the source's cadence marker and outcome
log, both of which are keyed by program."
```

---

### Task 9: `copy_curve`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py` (schema, handler, registration)
- Modify: `custom_components/irrigation_maestro/services.yaml`, both translation files
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: service `copy_curve(source_zone_id, source_program_id, zone_id, program_id)`; constant `SERVICE_COPY_CURVE: Final = "copy_curve"`.

- [ ] **Step 1: Write the failing test**

```python
async def test_copy_curve_changes_only_the_curve(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "src",
                        "name": "Source",
                        "trigger": {"kind": "time", "at": "04:00"},
                        "curve": {
                            "points": [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]],
                            "min_value": 10.0,
                            "max_value": 55.0,
                        },
                    }
                ],
            ),
            zone_data("Lawn", "valve.lawn", at="06:15"),
        ],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]
    before = dict(entry.subentries[lawn].data["cycles"][0])

    await hass.services.async_call(
        DOMAIN,
        "copy_curve",
        {
            "source_zone_id": pots,
            "source_program_id": "src",
            "zone_id": lawn,
            "program_id": "cy_lawn",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    after = entry.subentries[lawn].data["cycles"][0]
    assert after["curve"] == entry.subentries[pots].data["cycles"][0]["curve"]
    for key in ("id", "name", "trigger"):
        assert after[key] == before[key]


async def test_copy_curve_leaves_the_intensity_alone(hass: HomeAssistant) -> None:
    """The curve is the shape; the intensity is the strength. Copying one must
    not carry the other."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Pots", "valve.pots"),
            zone_data("Lawn", "valve.lawn"),
        ],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]
    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": lawn, "program_id": "cy_lawn", "minutes": 9},
        blocking=True,
    )
    await hass.async_block_till_done()
    intensity = entry.subentries[lawn].data["cycles"][0]["intensity_pct"]

    await hass.services.async_call(
        DOMAIN,
        "copy_curve",
        {
            "source_zone_id": pots,
            "source_program_id": "cy_pots",
            "zone_id": lawn,
            "program_id": "cy_lawn",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    assert entry.subentries[lawn].data["cycles"][0]["intensity_pct"] == intensity
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_services.py -k copy_curve -v`
Expected: FAIL — `ServiceNotFound: irrigation_maestro.copy_curve`

- [ ] **Step 3: Write minimal implementation**

```python
SERVICE_COPY_CURVE: Final = "copy_curve"
ATTR_SOURCE_ZONE_ID: Final = "source_zone_id"
ATTR_SOURCE_PROGRAM_ID: Final = "source_program_id"

_COPY_CURVE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_SOURCE_ZONE_ID): cv.string,
        vol.Required(ATTR_SOURCE_PROGRAM_ID): cv.string,
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_PROGRAM_ID): cv.string,
    }
)


async def _async_copy_curve(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    source_zone_id: str = call.data[ATTR_SOURCE_ZONE_ID]
    _require_zone(runtime, source_zone_id)
    source_program_id: str = call.data[ATTR_SOURCE_PROGRAM_ID]
    source_cycle = runtime.zones[source_zone_id].config.cycle(source_program_id)
    if source_cycle is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_program",
            translation_placeholders={"program_id": source_program_id},
        )

    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    program_id: str = call.data[ATTR_PROGRAM_ID]
    if source_cycle.curve.kind is CurveKind.VOLUME and not runtime.zone_has_flow_meter(
        runtime.zones[zone_id].config
    ):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="volume_requires_flow",
            translation_placeholders={"cycle_id": program_id},
        )

    curve_config = deepcopy(source_cycle.curve_config)

    def mutate(item: dict[str, Any]) -> None:
        # Only the shape travels: schedule, calendar, soak, name and intensity
        # belong to the destination program.
        item[const.CONF_CURVE] = curve_config

    _update_cycle(hass, entry, zone_id, program_id, mutate)
```

Register it beside the other program services and declare it in `services.yaml` with the four required text fields, plus name/description entries in both translation files.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_services.py -k copy_curve -v && pytest tests/components/test_resources.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations tests/components/test_services.py
git commit -m "feat(services): copy_curve copies the shape and nothing else"
```

---

### Task 10: `add_zone` writes the zone defaults

With the config flow gone, the service is the only path that creates a zone, so its conventions become the conventions.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py:903-926` (`_async_add_zone`)
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: `add_zone` writes `const.CONF_ORDER` = highest existing order + 1 and `const.CONF_ADJUSTMENT_PCT` = `const.DEFAULT_ADJUSTMENT_PCT`.

- [ ] **Step 1: Write the failing test**

```python
async def test_add_zone_writes_the_defaults_explicitly(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots", order=100)])

    response = await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Lawn", "valve_entity": "valve.lawn"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    data = entry.subentries[response["zone_id"]].data
    # A new zone lands at the end of the sequence instead of tying with the
    # zones already there.
    assert data["order"] == 101
    assert data["adjustment_pct"] == const.DEFAULT_ADJUSTMENT_PCT
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_services.py -k add_zone_writes -v`
Expected: FAIL — `KeyError: 'order'`

- [ ] **Step 3: Write minimal implementation**

In `_async_add_zone`, after building `data` and before `_validate_zone`:

```python
    # One convention, on the service side: the service is the only path that
    # creates a zone now, so it writes the defaults rather than leaving them
    # implicit in half the installations.
    existing_orders = [
        int(subentry.data.get(const.CONF_ORDER, const.DEFAULT_ORDER))
        for subentry in entry.subentries.values()
        if subentry.subentry_type == SUBENTRY_TYPE_ZONE
    ]
    data[const.CONF_ORDER] = max(existing_orders, default=const.DEFAULT_ORDER - 1) + 1
    data[const.CONF_ADJUSTMENT_PCT] = const.DEFAULT_ADJUSTMENT_PCT
```

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_services.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/services.py tests/components/test_services.py
git commit -m "feat(services): add_zone writes order and adjustment explicitly"
```

---

### Task 11: The sensor publishes the intensity, and keeps the shipped card working

Phase A must not break the card that is already installed. The card reads `amount`, `heat` and `day_minutes`; those keys keep being published, now derived from the curve **and the intensity**, so the displayed minutes stay truthful. Phase B removes them.

**Files:**
- Modify: `custom_components/irrigation_maestro/sensor.py:253-275` (`_cycle_dict`)
- Test: `tests/components/test_entities.py`

**Interfaces:**
- Produces: cycle attributes gain `intensity_pct` and `day_intensity_pct`; `amount`, `heat` and `day_minutes` remain as derived compatibility values.

- [ ] **Step 1: Write the failing test**

```python
async def test_zone_sensor_publishes_the_intensity(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 20.0], [35.0, 30.0]],
                            "min_value": 1.0,
                            "max_value": 60.0,
                        },
                        "intensity_pct": 150.0,
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]
    cycle = role_state(hass, "zone_state", zone_id).attributes["cycles"][0]

    assert cycle["intensity_pct"] == 150.0
    assert cycle["day_intensity_pct"] is None
    # Compatibility values the shipped card still reads must include the scale,
    # otherwise a scaled program would display its unscaled minutes.
    assert cycle["amount"] == 30  # 20 * 1.5
    assert cycle["heat"] == 15  # 45 - 30
```

`role_state` is the helper this file already uses to find an entity by its
`maestro_role` attribute (see `tests/components/test_entities.py:546`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_entities.py -k intensity -v`
Expected: FAIL — `KeyError: 'intensity_pct'`

- [ ] **Step 3: Write minimal implementation**

Replace `_cycle_dict`'s semantic derivation with:

```python
    def _cycle_dict(self, cycle: CycleConfig) -> dict[str, Any]:
        is_duration = cycle.curve.kind is CurveKind.DURATION
        # Derived for the card that is already installed: the effective value
        # at the reference temperature, including the intensity. Removed once
        # the card reads the curve and the intensity directly (Phase B).
        if is_duration:
            mild = curve_value(cycle.curve, const.CURVE_REFERENCE_TEMP_C, cycle.intensity_pct)
            hot = curve_value(cycle.curve, 35.0, cycle.intensity_pct)
            amount: int | None = round(mild)
            heat: int | None = round(hot - mild)
            day_minutes = {
                str(day): round(
                    curve_value(cycle.curve, const.CURVE_REFERENCE_TEMP_C, pct)
                )
                for day, pct in cycle.day_intensity_pct.items()
            } or None
        else:
            amount = heat = None
            day_minutes = None
        return {
            "cycle_id": cycle.cycle_id,
            "name": cycle.name,
            "enabled": self._runtime.state.cycle_enabled(self._zone_id, cycle.cycle_id),
            "trigger": _trigger_dict(cycle.trigger),
            "calendar": cycle.calendar.to_config(),
            "season_months": sorted(cycle.season_months) if cycle.season_months else None,
            "soak_max_run_min": cycle.soak_max_run_min,
            "soak_pause_min": cycle.soak_pause_min or None,
            "volume_safety_timeout_min": cycle.volume_safety_timeout_min,
            "intensity_pct": cycle.intensity_pct,
            "day_intensity_pct": (
                {str(k): v for k, v in cycle.day_intensity_pct.items()} or None
            ),
            "day_minutes": day_minutes,
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

Replace the `semantic_from_curve` import with `curve_value` and add `from . import const` if it is not already imported.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/test_entities.py -v && mypy custom_components`
Expected: PASS, mypy clean.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/sensor.py tests/components/test_entities.py
git commit -m "feat(sensor): publish the program intensity

amount/heat/day_minutes stay as derived compatibility values so the card
already installed keeps showing truthful minutes; Phase B removes them."
```

---

### Task 12: The zone subentry flow leaves the config flow

**Files:**
- Modify: `custom_components/irrigation_maestro/config_flow.py:383-1019` (delete `ZoneSubentryFlowHandler` and its helpers), `:220-228` (`async_get_supported_subentry_types`)
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `translations/it.json` (drop `config_subentries`)
- Test: `tests/components/test_config_flow.py`

**Interfaces:**
- Produces: the config flow offers hub setup and the `engine_advanced` options step only. Zones and programs are created and edited exclusively through the services.

- [ ] **Step 1: Write the failing test**

Delete the zone-subentry tests in `tests/components/test_config_flow.py` (every test that drives `async_step_user` of the subentry flow, the cycle loop, or the curve steps — including the ones at `:268` and `:323` that assert a preset reference is stored). Their behaviour is deliberately removed; the commit message says so. Then add:

```python
async def test_no_zone_subentry_flow_is_offered(hass: HomeAssistant) -> None:
    """Zones are created from the panel. A second surface that writes zone
    data differently is what silently replaced curves in 2.x."""
    from custom_components.irrigation_maestro.config_flow import (
        IrrigationMaestroConfigFlow,
    )

    assert IrrigationMaestroConfigFlow.async_get_supported_subentry_types({}) == {}


async def test_existing_zone_subentries_still_load(hass: HomeAssistant) -> None:
    """The risk this task carries: an entry whose subentry type is no longer
    registered must still set up, with its zones intact."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    assert entry.state is ConfigEntryState.LOADED
    assert len(entry.runtime_data.zone_ids) == 1
```

Import `ConfigEntryState`, `mock_weather`, `setup_hub` and `zone_data` from `.test_session` as the other component tests do.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/components/test_config_flow.py -v`
Expected: FAIL — `async_get_supported_subentry_types` still returns the zone handler.

- [ ] **Step 3: Write minimal implementation**

Delete the whole `ZoneSubentryFlowHandler` class and every helper only it used: `_parse_points_text`, `_format_points`, `_CURVE_SOURCE_CUSTOM`, `_CURVE_SOURCE_COPY`, `_FIELD_SOURCE`, `_FIELD_CYCLE`, `_MAX_DURATION_MIN` — check each with `grep -n "<name>" custom_components/irrigation_maestro/config_flow.py` before removing, and leave anything the hub flow still uses.

Make `async_get_supported_subentry_types` return an empty mapping:

```python
    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        """No subentry flow: zones are created and edited from the panel.

        Existing zone subentries keep loading — they are data on the entry,
        not a capability of the flow. A parallel editing surface that wrote
        zone data with different conventions is precisely what silently
        replaced curve references before 3.0.0.
        """
        return {}
```

Remove the `config_subentries` block from both translation files.

**If `test_existing_zone_subentries_still_load` fails**, apply the fallback the spec names: keep the subentry type registered, pointing at a handler whose only step aborts with a message directing the user to the panel. Record which route was taken in the commit message.

- [ ] **Step 4: Run the tests**

Run: `pytest tests/components/ -v && python -m script.hassfest --requirements --action validate 2>/dev/null || true`
Expected: component tests PASS. Also run `pytest tests/ -v` to confirm nothing else referenced the deleted symbols.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/config_flow.py custom_components/irrigation_maestro/translations tests/components/test_config_flow.py
git commit -m "refactor(config): zones and programs leave the config flow

The subentry flow was a second surface writing the same data with
different conventions — it stored curves as preset references that every
dashboard save then silently materialised. Zones are created from the
panel's empty state; add_zone remains callable from Developer Tools when
the panel cannot load. The tests asserting a stored preset reference are
removed because the behaviour they pinned is the defect."
```

---

### Task 13: No non-curve operation touches the curve

The spec's central guarantee, asserted directly rather than inferred from the
individual services, plus the round-trip that proves both curve forms survive
an export and re-import.

**Files:**
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: every service from Tasks 6–10.

- [ ] **Step 1: Write the failing test**

```python
async def test_no_non_curve_operation_rewrites_the_curve(hass: HomeAssistant) -> None:
    """Rename, reschedule, recalendar and rescale a program: the control
    points must come out byte-identical. This is the guarantee 3.0.0 exists
    to provide."""
    mock_weather(hass)
    curve = {
        "points": [[5.0, 4.0], [12.0, 10.0], [25.0, 24.0], [33.0, 40.0], [40.0, 52.0]],
        "min_value": 1.0,
        "max_value": 60.0,
    }
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": dict(curve),
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]
    program = {"zone_id": zone_id, "program_id": "c1"}

    for service, payload in (
        ("rename_program", {"name": "Evening"}),
        (
            "set_program_schedule",
            {
                "calendar_mode": "weekdays",
                "days": [0, 2, 4],
                "start_kind": "time",
                "start_time": "06:15",
            },
        ),
        ("set_program_schedule", {"calendar_mode": "interval", "interval_days": 3,
                                  "start_kind": "sun", "start_event": "sunrise",
                                  "start_offset_min": 0}),
        ("set_program_minutes", {"minutes": 30}),
        ("set_program_minutes", {"day_minutes": {"0": 12}}),
    ):
        await hass.services.async_call(
            DOMAIN, service, {**program, **payload}, blocking=True
        )
        await hass.async_block_till_done()
        stored = entry.subentries[zone_id].data["cycles"][0]
        assert stored["curve"] == curve, f"{service} rewrote the curve"


async def test_export_import_round_trip_preserves_both_curve_forms(
    hass: HomeAssistant,
) -> None:
    """A v3 payload carries explicit points; a payload exported by a 2.x
    install still carries a template reference, and import must accept it."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "export_config", {}, blocking=True, return_response=True
    )
    exported = json.loads(response["payload"])
    assert "points" in exported["zones"][zone_id]["cycles"][0]["curve"]

    await hass.services.async_call(
        DOMAIN, "import_config", {"payload": response["payload"]}, blocking=True
    )
    await hass.async_block_till_done()
    assert entry.subentries[zone_id].data["cycles"][0]["curve"] == (
        exported["zones"][zone_id]["cycles"][0]["curve"]
    )

    legacy = deepcopy(exported)
    legacy["zones"][zone_id]["cycles"][0]["curve"] = {"template": "preset_pots"}
    await hass.services.async_call(
        DOMAIN, "import_config", {"payload": json.dumps(legacy)}, blocking=True
    )
    await hass.async_block_till_done()
    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.curve.points == ((10.0, 10.0), (30.0, 30.0), (42.5, 55.0))
```

Add `from copy import deepcopy` to the test file's imports if absent.

- [ ] **Step 2: Run the tests**

Run: `pytest tests/components/test_services.py -k "non_curve_operation or round_trip" -v`
Expected: PASS — every behaviour these assert was built in Tasks 6–10. If
`test_no_non_curve_operation_rewrites_the_curve` fails, a service is still
writing `CONF_CURVE`; fix that service rather than relaxing the assertion.

- [ ] **Step 3: Commit**

```bash
git add tests/components/test_services.py
git commit -m "test: no non-curve operation may rewrite the curve"
```

---

### Task 14: Full verification and changelog

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `MEMORY.md` (decision log — project rule)

- [ ] **Step 1: Run the whole suite and every gate**

Run:

```bash
pytest
ruff check . && ruff format --check .
mypy custom_components
```

Expected: all green. Record the test count; it must be at least the 222 the project had, minus the deliberately removed subentry-flow and semantic tests, plus the new ones.

- [ ] **Step 2: Confirm the §8 regression is untouched**

Run: `git diff main --stat -- tests/engine/test_curves.py tests/engine/test_weather.py`
Expected: `test_weather.py` unchanged; `test_curves.py` changed only by the added `TestInterpolate` class. If either shows a changed §8 assertion, stop — a reference value moved and that is out of scope.

- [ ] **Step 3: Write the changelog entry**

Add to `CHANGELOG.md` under a new `## 3.0.0` heading: the breaking changes (per-day minutes rescale the curve instead of rebuilding it; zone and program configuration moved out of Settings; storage migrates v2 -> v3 on first load), and the additions (`duplicate_program`, `copy_curve`, `kind` on `set_curve`).

- [ ] **Step 4: Record the decisions in MEMORY.md**

Add to the "Deliberate design decisions" section: one curve form only and why; the intensity as a scale rather than a rewrite; presets retired from the interface but kept as §8 engine constants; the zone-defaults convention.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md MEMORY.md
git commit -m "docs: changelog and decision log for Phase A"
```

---

## Phase B (not in this plan)

Phase B rewrites the frontend against what Phase A produced: the point-based
curve editor, `schedule-math.ts` evaluating the real curve through
`curveValue`, the duplicate and copy-curve actions, and then the removals that
Phase A deliberately deferred — `set_simple_curve`, `engine/semantic.py`, the
semantic half of `curve-math.ts`, and the `amount`/`heat`/`day_minutes`
compatibility attributes. The version bump to 3.0.0 in `manifest.json` lands
with Phase B, when the release is coherent end to end.

Phase B gets its own plan, written once Phase A is green.
