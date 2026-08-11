# Card Live Curve Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a non-expert shape a zone-cycle's watering curve from the Lovelace card with two plain-language sliders and a live preview, plus an Advanced panel with limits and draggable points.

**Architecture:** A pure Python "semantic" mapping (amount + heat → 3 control points) backs a new `set_simple_curve` service; the Lit card gets a live editor that previews client-side with the mirrored formula and saves via `set_simple_curve` (sliders) or the existing `set_curve` (dragged points). Curves are stored exactly as today — no engine or schema change.

**Tech Stack:** Python 3.13 / Home Assistant custom integration (voluptuous, pytest-homeassistant-custom-component); Lit 3 + TypeScript + Vite for the card; Vitest for card unit tests (new).

## Global Constraints

- Semantic anchors: **COOL 12 °C, MILD 25 °C, HOT 35 °C** (constants).
- Slider ranges: **amount 3–45**, **heat 0–30** (integers).
- Point generation: `cool = max(0, round(amount − 1.3·heat))`, `mild = amount`, `hot = amount + heat`; points `[(12,cool),(25,mild),(35,hot)]`.
- Editor is **duration curves only**; volume cycles show a note. Fixed **3 points**; more points stay in the config flow.
- Live preview is client-side; **what you preview is what gets saved** — the TS formula must match `engine/semantic.py` exactly (parity test).
- All user-visible strings come from the spec §6 table, **EN and IT**, verbatim. The card's `it.ts` is `Record<keyof typeof en, string>` (compile-time parity); the integration `en.json`/`it.json` must stay structurally identical.
- CI must stay green: `ruff check .`, `ruff format --check .`, `mypy` (strict), `pytest tests`, hassfest, HACS action, and the card job (`npm ci`, `npm run build`, committed bundle up to date) — plus the new `npm run test`.
- Bump `manifest.json` version to **1.1.0** (auto-release cuts the GitHub release on merge to main).
- Run Python tooling through the repo venv: `.venv/bin/python -m pytest …`, `.venv/bin/ruff …`, `.venv/bin/mypy`. Card tooling in `card/`: `npm run typecheck`, `npm run test`, `npm run build`.

---

### Task 1: Semantic mapping (pure Python engine module)

**Files:**
- Create: `custom_components/irrigation_maestro/engine/semantic.py`
- Test: `tests/engine/test_semantic.py`

**Interfaces:**
- Consumes: `engine.curves.Curve`, `engine.curves.curve_value(curve, temp_c, adjustment_pct=100)`.
- Produces:
  - `ANCHORS: tuple[float, float, float] = (12.0, 25.0, 35.0)`
  - `AMOUNT_MIN=3, AMOUNT_MAX=45, HEAT_MIN=0, HEAT_MAX=30` (ints)
  - `points_from_semantic(amount: int, heat: int) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]`
  - `semantic_from_curve(curve: Curve) -> tuple[int, int]` returns `(amount, heat)` clamped to the ranges.

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/test_semantic.py`:

```python
"""Tests for the semantic curve mapping (amount + heat <-> 3 control points)."""

import pytest

from custom_components.irrigation_maestro.engine.curves import PRESET_POTS, Curve
from custom_components.irrigation_maestro.engine.semantic import (
    AMOUNT_MAX,
    AMOUNT_MIN,
    ANCHORS,
    HEAT_MAX,
    HEAT_MIN,
    points_from_semantic,
    semantic_from_curve,
)


def test_anchors_are_cool_mild_hot():
    assert ANCHORS == (12.0, 25.0, 35.0)


def test_points_endpoints_match_amount_and_heat():
    points = points_from_semantic(15, 15)
    assert points == ((12.0, 8.0), (25.0, 15.0), (35.0, 30.0))


def test_points_temperatures_are_fixed_and_increasing():
    points = points_from_semantic(3, 30)
    assert [t for t, _ in points] == [12.0, 25.0, 35.0]


def test_cool_value_floored_at_zero_for_large_heat():
    # 3 - 1.3*30 = -36 -> floored to 0; values never negative.
    points = points_from_semantic(3, 30)
    assert points[0][1] == 0.0
    assert all(v >= 0 for _, v in points)


def test_heat_zero_is_flat_from_mild_up():
    points = points_from_semantic(20, 0)
    assert points == ((12.0, 20.0), (25.0, 20.0), (35.0, 20.0))


def test_semantic_from_curve_roundtrips():
    points = points_from_semantic(18, 12)
    curve = Curve(points=points, min_value=0.0, max_value=120.0)
    assert semantic_from_curve(curve) == (18, 12)


def test_semantic_from_curve_fits_pots_preset():
    # pots preset: 1 min/°C, +1/°C above 30, clamp 10-55.
    # At 25 -> 25 min (amount), at 35 -> 40 min -> heat 15.
    amount, heat = semantic_from_curve(PRESET_POTS)
    assert amount == 25
    assert heat == 15


def test_semantic_values_clamped_to_ranges():
    tiny = Curve(points=((25.0, 1.0), (35.0, 1.0)), min_value=0.0, max_value=120.0)
    amount, heat = semantic_from_curve(tiny)
    assert amount == AMOUNT_MIN  # 1 -> clamped up to 3
    assert heat == HEAT_MIN
    huge = Curve(points=((25.0, 200.0), (35.0, 400.0)), min_value=0.0, max_value=1000.0)
    amount, heat = semantic_from_curve(huge)
    assert amount == AMOUNT_MAX
    assert heat == HEAT_MAX
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/engine/test_semantic.py -q`
Expected: FAIL — `ModuleNotFoundError: engine.semantic`.

- [ ] **Step 3: Write the module**

Create `custom_components/irrigation_maestro/engine/semantic.py`:

```python
"""Semantic curve mapping: two friendly numbers <-> three control points.

This is the reference implementation of the mapping the card editor mirrors in
TypeScript. Kept pure and HA-free so it is unit-testable and shared by the
``set_simple_curve`` service.

- ``amount``: watering minutes on a mild day (25 C) — the baseline.
- ``heat``: extra minutes on a hot day (35 C) versus a mild one.

Points are generated with a slope of ``heat / 10`` minutes per degree, the cool
anchor extrapolated down and floored at 0 so the curve is always valid.
"""

from __future__ import annotations

from .curves import Curve, curve_value

ANCHORS: tuple[float, float, float] = (12.0, 25.0, 35.0)
AMOUNT_MIN, AMOUNT_MAX = 3, 45
HEAT_MIN, HEAT_MAX = 0, 30

_COOL, _MILD, _HOT = ANCHORS
_SLOPE_SPAN = (_MILD - _COOL) / 10.0  # = 1.3 (per unit of heat)


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def points_from_semantic(
    amount: int, heat: int
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]:
    """Three control points (cool, mild, hot) for the given amount and heat."""
    cool = max(0, round(amount - _SLOPE_SPAN * heat))
    return (
        (_COOL, float(cool)),
        (_MILD, float(amount)),
        (_HOT, float(amount + heat)),
    )


def semantic_from_curve(curve: Curve) -> tuple[int, int]:
    """Best-effort (amount, heat) for an existing curve, clamped to the UI ranges."""
    mild = curve_value(curve, _MILD)
    hot = curve_value(curve, _HOT)
    amount = _clamp(round(mild), AMOUNT_MIN, AMOUNT_MAX)
    heat = _clamp(round(hot - mild), HEAT_MIN, HEAT_MAX)
    return amount, heat
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/engine/test_semantic.py -q`
Expected: PASS (8 tests).

- [ ] **Step 5: Lint, type-check, commit**

Run: `.venv/bin/ruff check custom_components/irrigation_maestro/engine/semantic.py tests/engine/test_semantic.py && .venv/bin/ruff format custom_components/irrigation_maestro/engine/semantic.py tests/engine/test_semantic.py && .venv/bin/mypy`
Expected: all clean.

```bash
git add custom_components/irrigation_maestro/engine/semantic.py tests/engine/test_semantic.py
git commit -m "feat(engine): semantic curve mapping (amount + heat <-> points)"
```

---

### Task 2: `set_simple_curve` service

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json`
- Modify: `custom_components/irrigation_maestro/translations/it.json`
- Test: `tests/components/test_services.py` (add tests)

**Interfaces:**
- Consumes: `engine.semantic.points_from_semantic`; existing `_loaded_entry`, `_require_zone`, `const.*`, `validate_points`, `ServiceValidationError`.
- Produces: registered service `irrigation_maestro.set_simple_curve` and a shared helper `_write_cycle_curve(hass, entry, zone_id, cycle_id, points, min_value, max_value, kind)` used by both `set_curve` and `set_simple_curve`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/components/test_services.py` (reuse this file's existing helpers `setup_hub`, `zone_data`, `mock_weather` imported from `.test_session`, and its service-call pattern; match the style already there):

```python
async def test_set_simple_curve_stores_generated_points(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        "irrigation_maestro",
        "set_simple_curve",
        {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 15, "heat": 15},
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle(cycle_id)
    assert cycle.curve.points == ((12.0, 8.0), (25.0, 15.0), (35.0, 30.0))


async def test_set_simple_curve_keeps_existing_clamps_when_omitted(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id
    before = entry.runtime_data.zones[zone_id].config.cycle(cycle_id).curve

    await hass.services.async_call(
        "irrigation_maestro",
        "set_simple_curve",
        {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 20, "heat": 10},
        blocking=True,
    )
    await hass.async_block_till_done()
    after = entry.runtime_data.zones[zone_id].config.cycle(cycle_id).curve
    assert after.min_value == before.min_value
    assert after.max_value == before.max_value


async def test_set_simple_curve_rejects_out_of_range(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    with pytest.raises(Exception):  # vol.Invalid / MultipleInvalid before the handler
        await hass.services.async_call(
            "irrigation_maestro",
            "set_simple_curve",
            {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 999, "heat": 5},
            blocking=True,
        )
```

Confirm the file's imports include `pytest` and `MockValvePark` / `START` / `setup_hub` / `zone_data` / `mock_weather` (add any that are missing, matching the other tests in the file).

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/components/test_services.py -k set_simple_curve -q`
Expected: FAIL — service not registered.

- [ ] **Step 3: Refactor the shared curve-writer, then add the service**

In `services.py`, add near the other constants:

```python
SERVICE_SET_SIMPLE_CURVE: Final = "set_simple_curve"
ATTR_AMOUNT: Final = "amount"
ATTR_HEAT: Final = "heat"
```

Add the schema (near `_SET_CURVE_SCHEMA`):

```python
_SET_SIMPLE_CURVE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Required(ATTR_CYCLE_ID): cv.string,
        vol.Required(ATTR_AMOUNT): vol.All(vol.Coerce(int), vol.Range(min=3, max=45)),
        vol.Required(ATTR_HEAT): vol.All(vol.Coerce(int), vol.Range(min=0, max=30)),
        vol.Optional(ATTR_MIN_VALUE): vol.Coerce(float),
        vol.Optional(ATTR_MAX_VALUE): vol.Coerce(float),
    }
)
```

Import the mapping at the top:

```python
from .engine.semantic import points_from_semantic
```

Extract the persistence shared by both services. Add this helper and refactor `_async_set_curve` to call it:

```python
def _write_cycle_curve(
    hass: HomeAssistant,
    entry: ConfigEntry,
    zone_id: str,
    cycle_id: str,
    points: list[tuple[float, float]],
    min_value: float,
    max_value: float,
    kind: str,
) -> None:
    """Persist a cycle's curve into the zone subentry (in-place, no reload)."""
    subentry = entry.subentries[zone_id]
    cycles = [dict(item) for item in subentry.data.get(const.CONF_CYCLES, [])]
    for item in cycles:
        if item.get(const.CONF_CYCLE_ID) == cycle_id:
            item[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[temp, value] for temp, value in points],
                const.CONF_CURVE_MIN: min_value,
                const.CONF_CURVE_MAX: max_value,
                const.CONF_CURVE_KIND: kind,
            }
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, const.CONF_CYCLES: cycles}
    )
```

Replace the tail of `_async_set_curve` (from `subentry = entry.subentries[zone_id]` to the end) with:

```python
    _write_cycle_curve(
        hass, entry, zone_id, cycle_id, points, min_value, max_value, str(cycle.curve.kind)
    )
```

Add the new handler:

```python
async def _async_set_simple_curve(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    cycle_id: str = call.data[ATTR_CYCLE_ID]
    _require_zone(runtime, zone_id)
    cycle = runtime.zones[zone_id].config.cycle(cycle_id)
    if cycle is None:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_cycle",
            translation_placeholders={"cycle_id": cycle_id},
        )
    points = list(points_from_semantic(call.data[ATTR_AMOUNT], call.data[ATTR_HEAT]))
    try:
        validate_points(points)
    except CurveError as err:  # defensive; the formula is always valid
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_points",
            translation_placeholders={"error": str(err)},
        ) from err
    min_value = float(call.data.get(ATTR_MIN_VALUE, cycle.curve.min_value))
    max_value = float(call.data.get(ATTR_MAX_VALUE, cycle.curve.max_value))
    if min_value > max_value:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="min_above_max")
    _write_cycle_curve(
        hass, entry, zone_id, cycle_id, points, min_value, max_value, str(cycle.curve.kind)
    )
```

Register it in `async_setup_services` alongside the others:

```python
    hass.services.async_register(
        DOMAIN, SERVICE_SET_SIMPLE_CURVE, _async_set_simple_curve, _SET_SIMPLE_CURVE_SCHEMA
    )
```

- [ ] **Step 4: Add `services.yaml` entry**

In `services.yaml`, after `set_curve:`, add:

```yaml
set_simple_curve:
  fields:
    zone_id:
      required: true
      example: 1b2f3c4d5e6f
      selector:
        text:
    cycle_id:
      required: true
      example: a1b2c3d4
      selector:
        text:
    amount:
      required: true
      example: 15
      selector:
        number:
          min: 3
          max: 45
          step: 1
          mode: slider
          unit_of_measurement: min
    heat:
      required: true
      example: 15
      selector:
        number:
          min: 0
          max: 30
          step: 1
          mode: slider
          unit_of_measurement: min
    min_value:
      example: 8
      selector:
        number:
          min: 0
          max: 10000
          step: 0.1
          mode: box
    max_value:
      example: 35
      selector:
        number:
          min: 0
          max: 10000
          step: 0.1
          mode: box
```

- [ ] **Step 5: Add translations (en + it)**

In `translations/en.json`, inside `"services"`, after `"set_curve"`, add:

```json
    "set_simple_curve": {
      "name": "Set simple curve",
      "description": "Builds a duration curve from a base amount and a hot-day boost, then saves it to a cycle.",
      "fields": {
        "zone_id": { "name": "Zone", "description": "The zone owning the cycle." },
        "cycle_id": { "name": "Cycle", "description": "The cycle whose curve is set." },
        "amount": { "name": "Amount (min at 25°)", "description": "Watering minutes on a mild day." },
        "heat": { "name": "Hot-day boost (extra min at 35°)", "description": "Extra minutes on a hot day vs a mild one." },
        "min_value": { "name": "Never less than (min)", "description": "Optional lower limit." },
        "max_value": { "name": "Never more than (min)", "description": "Optional upper limit." }
      }
    },
```

In `translations/en.json`, inside `"exceptions"`, add:

```json
    "amount_out_of_range": { "message": "Amount must be between 3 and 45 minutes." },
    "heat_out_of_range": { "message": "Hot-day boost must be between 0 and 30 minutes." },
```

Mirror both blocks in `translations/it.json` (same keys, same nesting):

```json
    "set_simple_curve": {
      "name": "Imposta curva semplice",
      "description": "Costruisce una curva a durata da una quantità base e un incremento per i giorni caldi, poi la salva su un ciclo.",
      "fields": {
        "zone_id": { "name": "Zona", "description": "La zona a cui appartiene il ciclo." },
        "cycle_id": { "name": "Ciclo", "description": "Il ciclo di cui impostare la curva." },
        "amount": { "name": "Quanta acqua (min a 25°)", "description": "Minuti di irrigazione in una giornata mite." },
        "heat": { "name": "Di più quando caldo (min extra a 35°)", "description": "Minuti extra in una giornata calda rispetto a una mite." },
        "min_value": { "name": "Mai meno di (min)", "description": "Limite inferiore facoltativo." },
        "max_value": { "name": "Mai più di (min)", "description": "Limite superiore facoltativo." }
      }
    },
```
```json
    "amount_out_of_range": { "message": "La quantità deve essere tra 3 e 45 minuti." },
    "heat_out_of_range": { "message": "L'incremento per i giorni caldi deve essere tra 0 e 30 minuti." },
```

(The `amount_out_of_range` / `heat_out_of_range` keys are declared now for completeness; range errors are actually raised by the voluptuous schema before the handler, so they are not referenced in code — keep them for documentation and future use. They must exist in BOTH files to preserve key parity.)

- [ ] **Step 6: Run tests + validate translations**

```bash
.venv/bin/python -m pytest tests/components/test_services.py -k "set_simple_curve or set_curve" -q
.venv/bin/python -c "import json; a=json.load(open('custom_components/irrigation_maestro/translations/en.json')); b=json.load(open('custom_components/irrigation_maestro/translations/it.json'))
def keys(d,p=''):
    o=set()
    for k,v in d.items():
        o.add(p+k)
        if isinstance(v,dict): o|=keys(v,p+k+'.')
    return o
assert keys(a)==keys(b), keys(a)^keys(b); print('translation parity OK')"
.venv/bin/python -c "import yaml,json; y=set(yaml.safe_load(open('custom_components/irrigation_maestro/services.yaml'))); e=set(json.load(open('custom_components/irrigation_maestro/translations/en.json'))['services']); assert y==e, y^e; print('services.yaml matches translations')"
```
Expected: existing set_curve tests still pass, 3 new pass, both parity checks print OK.

Also confirm no single-quoted placeholder was introduced (hassfest rule):
Run: `grep -nE "'[^']*\{[a-z_]+\}[^']*'" custom_components/irrigation_maestro/translations/*.json || echo "no bad placeholders"`

- [ ] **Step 7: Lint, type, commit**

```bash
.venv/bin/ruff check custom_components tests && .venv/bin/ruff format custom_components tests && .venv/bin/mypy
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json tests/components/test_services.py
git commit -m "feat(services): set_simple_curve — save a curve from amount + heat"
```

---

### Task 3: Shared card curve math + Vitest parity

**Files:**
- Create: `card/src/curve-math.ts`
- Modify: `card/src/curve-sparkline.ts` (use the shared value function)
- Create: `card/src/curve-math.test.ts`
- Modify: `card/package.json` (add vitest devDep + `test` script)
- Modify: `.github/workflows/ci.yml` (run `npm run test` in the card job)

**Interfaces:**
- Produces:
  - `COOL=12, MILD=25, HOT=35`, `AMOUNT_MIN=3, AMOUNT_MAX=45, HEAT_MIN=0, HEAT_MAX=30`
  - `type CurvePoint = readonly [number, number]`
  - `pointsFromSemantic(amount: number, heat: number): [CurvePoint, CurvePoint, CurvePoint]`
  - `semanticFromPoints(points: CurvePoint[]): { amount: number; heat: number }`
  - `curveValue(points: CurvePoint[], temp: number, min?: number, max?: number): number` (linear interpolation, flat extrapolation, optional clamps — mirrors `engine.curves.curve_value` with adjustment 100)
  - `parseCurvePoints(raw: unknown): CurvePoint[]` (moved from the sparkline)

- [ ] **Step 1: Write the failing parity test**

Create `card/src/curve-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  curveValue,
  pointsFromSemantic,
  semanticFromPoints,
} from "./curve-math";

describe("pointsFromSemantic (parity with engine/semantic.py)", () => {
  it("matches the Python reference table", () => {
    expect(pointsFromSemantic(15, 15)).toEqual([
      [12, 8],
      [25, 15],
      [35, 30],
    ]);
    expect(pointsFromSemantic(3, 30)).toEqual([
      [12, 0],
      [25, 3],
      [35, 33],
    ]);
    expect(pointsFromSemantic(20, 0)).toEqual([
      [12, 20],
      [25, 20],
      [35, 20],
    ]);
  });
});

describe("semanticFromPoints", () => {
  it("round-trips", () => {
    const pts = pointsFromSemantic(18, 12);
    expect(semanticFromPoints(pts)).toEqual({ amount: 18, heat: 12 });
  });
  it("clamps to ranges", () => {
    expect(semanticFromPoints([[25, 1], [35, 1]])).toEqual({ amount: 3, heat: 0 });
  });
});

describe("curveValue", () => {
  it("interpolates linearly and extrapolates flat", () => {
    const pts: [number, number][] = [[10, 5], [25, 15], [35, 30]];
    expect(curveValue(pts, 17.5)).toBeCloseTo(10);
    expect(curveValue(pts, 5)).toBeCloseTo(5);
    expect(curveValue(pts, 40)).toBeCloseTo(30);
  });
  it("applies clamps", () => {
    expect(curveValue([[10, 0], [35, 50]], 35, 5, 30)).toBe(30);
  });
});
```

- [ ] **Step 2: Add vitest to the card and a test script**

In `card/package.json`, add to `devDependencies`: `"vitest": "^2.1.0"`, and to `scripts`: `"test": "vitest run"`. Then:

Run: `cd card && npm install`
Expected: installs vitest, updates `package-lock.json`.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd card && npm run test`
Expected: FAIL — cannot resolve `./curve-math`.

- [ ] **Step 4: Write `curve-math.ts`**

Create `card/src/curve-math.ts`:

```ts
/**
 * Shared curve math for the card. The semantic mapping mirrors
 * custom_components/irrigation_maestro/engine/semantic.py EXACTLY — keep the two
 * in lockstep (guarded by curve-math.test.ts). curveValue mirrors
 * engine/curves.py curve_value with adjustment 100.
 */
import { asNumber } from "./types";

export const COOL = 12;
export const MILD = 25;
export const HOT = 35;
export const AMOUNT_MIN = 3;
export const AMOUNT_MAX = 45;
export const HEAT_MIN = 0;
export const HEAT_MAX = 30;

const SLOPE_SPAN = (MILD - COOL) / 10; // 1.3

export type CurvePoint = readonly [number, number];

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function pointsFromSemantic(
  amount: number,
  heat: number,
): [CurvePoint, CurvePoint, CurvePoint] {
  const cool = Math.max(0, Math.round(amount - SLOPE_SPAN * heat));
  return [
    [COOL, cool],
    [MILD, amount],
    [HOT, amount + heat],
  ];
}

export function curveValue(
  points: CurvePoint[],
  temp: number,
  min?: number,
  max?: number,
): number {
  let raw: number;
  if (points.length === 0) {
    raw = 0;
  } else if (temp <= points[0][0]) {
    raw = points[0][1];
  } else if (temp >= points[points.length - 1][0]) {
    raw = points[points.length - 1][1];
  } else {
    raw = points[points.length - 1][1];
    for (let i = 0; i < points.length - 1; i++) {
      const [t0, v0] = points[i];
      const [t1, v1] = points[i + 1];
      if (t0 <= temp && temp <= t1) {
        raw = v0 + ((v1 - v0) * (temp - t0)) / (t1 - t0);
        break;
      }
    }
  }
  if (min !== undefined) raw = Math.max(raw, min);
  if (max !== undefined) raw = Math.min(raw, max);
  return raw;
}

export function semanticFromPoints(points: CurvePoint[]): {
  amount: number;
  heat: number;
} {
  const mild = curveValue(points, MILD);
  const hot = curveValue(points, HOT);
  return {
    amount: clamp(Math.round(mild), AMOUNT_MIN, AMOUNT_MAX),
    heat: clamp(Math.round(hot - mild), HEAT_MIN, HEAT_MAX),
  };
}

export function parseCurvePoints(raw: unknown): CurvePoint[] {
  if (!Array.isArray(raw)) return [];
  const points: CurvePoint[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const x = asNumber(item[0]);
    const y = asNumber(item[1]);
    if (x !== undefined && y !== undefined) points.push([x, y]);
  }
  return [...points].sort((a, b) => a[0] - b[0]);
}
```

- [ ] **Step 5: Refactor the sparkline to use `parseCurvePoints`**

In `card/src/curve-sparkline.ts`: delete the local `parsePoints` function and its `Point` type; import `{ parseCurvePoints, type CurvePoint }` from `./curve-math`; replace `parsePoints(curve?.points)` with `parseCurvePoints(curve?.points)` and `Point[]` with `CurvePoint[]`.

- [ ] **Step 6: Run test + typecheck**

Run: `cd card && npm run test && npm run typecheck`
Expected: parity tests PASS, tsc clean.

- [ ] **Step 7: Wire vitest into CI**

In `.github/workflows/ci.yml`, in the `card` job, add a step before "Committed bundle is up to date":

```yaml
      - name: Card unit tests
        working-directory: card
        run: npm run test
```

- [ ] **Step 8: Commit**

```bash
git add card/src/curve-math.ts card/src/curve-math.test.ts card/src/curve-sparkline.ts card/package.json card/package-lock.json .github/workflows/ci.yml
git commit -m "feat(card): shared curve math + vitest parity with the Python engine"
```

---

### Task 4: Editor localization strings (en + it)

**Files:**
- Modify: `card/src/localize/en.ts`
- Modify: `card/src/localize/it.ts`

**Interfaces:**
- Produces the `editor.*` keys consumed by Task 5. `it.ts` is `Record<keyof typeof en, string>`, so both files must gain the identical set of keys.

- [ ] **Step 1: Add keys to `en.ts`**

In `card/src/localize/en.ts`, before the closing `} as const;`, add:

```ts
  // Curve editor
  "editor.edit_curve": "Edit curve",
  "editor.title": "How much to water by temperature",
  "editor.amount.label": "💧 How much water",
  "editor.amount.help": "Watering minutes on a mild day (25°). This is the baseline everything else builds on.",
  "editor.amount.value": "{min} min at 25°",
  "editor.amount.low": "little (3 min)",
  "editor.amount.high": "a lot (45 min)",
  "editor.heat.label": "🔥 How much more when it's hot",
  "editor.heat.help": "Extra minutes on a hot day (35°) compared with a mild one. At 0 it waters the same regardless.",
  "editor.heat.value": "+{min} min at 35°",
  "editor.heat.low": "same (+0)",
  "editor.heat.high": "much more (+30)",
  "editor.graph.caption": "Live preview — watering minutes by temperature",
  "editor.graph.today": "today {temp}°",
  "editor.example.cool": "Cool · 12°",
  "editor.example.mild": "Mild · 25°",
  "editor.example.hot": "Hot · 35°",
  "editor.today": "🌡️ With today's weather (weighted temperature {temp}°) it would water ≈ {min} min.",
  "editor.advanced.toggle": "Advanced — limits and draggable points",
  "editor.advanced.help": "For precise control. You can ignore this — the defaults are fine.",
  "editor.min.label": "⬇️ Never less than",
  "editor.min.help": "Absolute minimum minutes, even when cold.",
  "editor.max.label": "⬆️ Never more than",
  "editor.max.help": "Absolute maximum minutes, even in extreme heat.",
  "editor.drag_hint": "✋ Drag the three points (up/down) to shape the curve by hand.",
  "editor.more_points": "Need more than three points? Edit the full curve in the zone settings.",
  "editor.save": "Save",
  "editor.cancel": "Cancel",
  "editor.saved": "Curve updated.",
  "editor.save_error": "Couldn't save the curve: {error}",
  "editor.volume_note": "This cycle uses a volume curve (liters). Edit it in the zone settings.",
```

- [ ] **Step 2: Add the mirrored keys to `it.ts`**

In `card/src/localize/it.ts`, before the closing `};`, add:

```ts
  // Editor curva
  "editor.edit_curve": "Modifica curva",
  "editor.title": "Quanto irrigare in base al caldo",
  "editor.amount.label": "💧 Quanta acqua",
  "editor.amount.help": "Minuti di irrigazione in una giornata mite (25°). È la base: tutto il resto parte da qui.",
  "editor.amount.value": "{min} min a 25°",
  "editor.amount.low": "poca (3 min)",
  "editor.amount.high": "tanta (45 min)",
  "editor.heat.label": "🔥 Quanto di più quando fa caldo",
  "editor.heat.help": "Minuti extra in una giornata calda (35°) rispetto a una mite. A 0 irriga sempre uguale.",
  "editor.heat.value": "+{min} min a 35°",
  "editor.heat.low": "uguale (+0)",
  "editor.heat.high": "molto di più (+30)",
  "editor.graph.caption": "Anteprima dal vivo — minuti di irrigazione secondo la temperatura",
  "editor.graph.today": "oggi {temp}°",
  "editor.example.cool": "Fresco · 12°",
  "editor.example.mild": "Mite · 25°",
  "editor.example.hot": "Caldo · 35°",
  "editor.today": "🌡️ Con il meteo di oggi (temperatura pesata {temp}°) irrigherebbe ≈ {min} min.",
  "editor.advanced.toggle": "Avanzate — limiti e punti trascinabili",
  "editor.advanced.help": "Per chi vuole il controllo preciso. Puoi ignorarle: i valori predefiniti vanno bene.",
  "editor.min.label": "⬇️ Mai meno di",
  "editor.min.help": "Minuti minimi assoluti, anche col freddo.",
  "editor.max.label": "⬆️ Mai più di",
  "editor.max.help": "Minuti massimi assoluti, anche col gran caldo.",
  "editor.drag_hint": "✋ Trascina i tre punti (su/giù) per modellare la curva a mano.",
  "editor.more_points": "Ti servono più di tre punti? La curva completa si modifica nelle impostazioni della zona.",
  "editor.save": "Salva",
  "editor.cancel": "Annulla",
  "editor.saved": "Curva aggiornata.",
  "editor.save_error": "Non è stato possibile salvare la curva: {error}",
  "editor.volume_note": "Questo ciclo usa una curva a volume (litri). Modificala nelle impostazioni della zona.",
```

- [ ] **Step 3: Typecheck (verifies EN/IT key parity)**

Run: `cd card && npm run typecheck`
Expected: clean — if a key is missing in `it.ts`, tsc fails the `Record<keyof typeof en, string>` constraint.

- [ ] **Step 4: Commit**

```bash
git add card/src/localize/en.ts card/src/localize/it.ts
git commit -m "i18n(card): editor strings (en + it)"
```

---

### Task 5: Curve editor component (`curve-editor.ts`)

**Files:**
- Create: `card/src/curve-editor.ts`

**Interfaces:**
- Consumes: `curve-math.ts` (all exports), `localize`/`localizeDynamic`, `CycleCurve`/`CycleInfo`/`defineElement`/`asNumber` from `./types`.
- Produces: element `imc-curve-editor` with:
  - `@property() language`, `@property({attribute:false}) cycle?: CycleInfo`, `@property({attribute:false}) weightedTemp?: number`.
  - Emits `imc-curve-save` → `CustomEvent<CurveSavePayload>` and `imc-curve-cancel` → `CustomEvent<void>`.
  - Exported type `CurveSavePayload = { cycleId: string; mode: "simple"; amount: number; heat: number; min: number; max: number } | { cycleId: string; mode: "advanced"; points: [number, number][]; min: number; max: number }`.

- [ ] **Step 1: Create the component**

Create `card/src/curve-editor.ts`:

```ts
import { css, html, LitElement, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {
  AMOUNT_MAX,
  AMOUNT_MIN,
  COOL,
  HEAT_MAX,
  HEAT_MIN,
  HOT,
  MILD,
  curveValue,
  parseCurvePoints,
  pointsFromSemantic,
  semanticFromPoints,
} from "./curve-math";
import type { CurvePoint } from "./curve-math";
import { localize } from "./localize/localize";
import { asNumber, defineElement } from "./types";
import type { CycleInfo } from "./types";

export type CurveSavePayload =
  | {
      cycleId: string;
      mode: "simple";
      amount: number;
      heat: number;
      min: number;
      max: number;
    }
  | {
      cycleId: string;
      mode: "advanced";
      points: [number, number][];
      min: number;
      max: number;
    };

const GRAPH_W = 320;
const GRAPH_H = 170;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 24;
const T_MIN = 5;
const T_MAX = 40;

export class ImcCurveEditor extends LitElement {
  @property() language = "en";
  @property({ attribute: false }) cycle?: CycleInfo;
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _amount = 15;
  @state() private _heat = 15;
  @state() private _min = 1;
  @state() private _max = 120;
  @state() private _advanced = false;
  /** When a point has been dragged, we save exact points, not the semantic pair. */
  @state() private _dragged = false;
  @state() private _points: CurvePoint[] = pointsFromSemantic(15, 15);

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .title {
      font-weight: 700;
      font-size: 1.05rem;
      margin-bottom: 12px;
    }
    .field {
      margin-bottom: 16px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    label {
      font-weight: 600;
    }
    .value {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      white-space: nowrap;
    }
    .help {
      font-size: 0.8rem;
      opacity: 0.7;
      margin: 2px 0 6px;
    }
    input[type="range"] {
      width: 100%;
    }
    .ends {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      opacity: 0.5;
    }
    .graph-box {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 10px;
      margin: 6px 0 12px;
    }
    .caption {
      font-size: 0.72rem;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    svg {
      display: block;
      width: 100%;
      height: 150px;
      overflow: visible;
    }
    .axis {
      stroke: var(--secondary-text-color, #888);
      opacity: 0.4;
    }
    .tick {
      fill: var(--secondary-text-color, #888);
      font-size: 9px;
    }
    .curve {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 3;
      stroke-linejoin: round;
    }
    .handle {
      fill: var(--primary-color, #03a9f4);
      stroke: var(--card-background-color, #fff);
      stroke-width: 2;
      cursor: ns-resize;
    }
    .today {
      stroke: var(--success-color, #43a047);
      stroke-dasharray: 4 3;
    }
    .today-text {
      fill: var(--success-color, #43a047);
      font-size: 10px;
      font-weight: 700;
    }
    .examples {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .example {
      flex: 1;
      text-align: center;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 10px;
      padding: 8px 4px;
    }
    .example .lbl {
      font-size: 0.72rem;
      opacity: 0.6;
    }
    .example .num {
      font-size: 1.1rem;
      font-weight: 700;
    }
    .today-banner {
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 0.9rem;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      font-size: 0.85rem;
      margin-bottom: 12px;
      text-decoration: underline;
      opacity: 0.85;
    }
    .limits {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .limits .limit {
      flex: 1;
    }
    .limits input {
      width: 70px;
      text-align: center;
    }
    .note {
      font-size: 0.75rem;
      opacity: 0.6;
      margin-bottom: 12px;
    }
    .buttons {
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .volume-note {
      font-size: 0.9rem;
      opacity: 0.8;
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("cycle")) this._seedFromCycle();
  }

  private _seedFromCycle(): void {
    const curve = this.cycle?.curve;
    const pts = parseCurvePoints(curve?.points);
    if (pts.length === 0) return;
    const { amount, heat } = semanticFromPoints(pts);
    this._amount = amount;
    this._heat = heat;
    this._min = asNumber(curve?.min) ?? 1;
    this._max = asNumber(curve?.max) ?? 120;
    this._dragged = false;
    // Seed the editor points from the real curve at the three anchors so the
    // graph faithfully shows the existing curve on open.
    this._points = [
      [COOL, Math.round(curveValue(pts, COOL))],
      [MILD, Math.round(curveValue(pts, MILD))],
      [HOT, Math.round(curveValue(pts, HOT))],
    ];
  }

  private _regen(): void {
    this._points = pointsFromSemantic(this._amount, this._heat);
    this._dragged = false;
  }

  private _onAmount(e: Event): void {
    this._amount = Number((e.target as HTMLInputElement).value);
    this._regen();
  }

  private _onHeat(e: Event): void {
    this._heat = Number((e.target as HTMLInputElement).value);
    this._regen();
  }

  private _clampedValue(temp: number): number {
    return Math.round(curveValue(this._points, temp, this._min, this._max));
  }

  private _sx(t: number): number {
    return PAD_L + ((t - T_MIN) / (T_MAX - T_MIN)) * (GRAPH_W - PAD_L - PAD_R);
  }

  private _sy(v: number): number {
    const top = Math.max(this._max, ...this._points.map((p) => p[1]), 1);
    return GRAPH_H - PAD_B - (v / top) * (GRAPH_H - PAD_T - PAD_B);
  }

  private _valueFromY(y: number): number {
    const top = Math.max(this._max, ...this._points.map((p) => p[1]), 1);
    const v = ((GRAPH_H - PAD_B - y) / (GRAPH_H - PAD_T - PAD_B)) * top;
    return Math.max(0, Math.round(v));
  }

  private _startDrag(index: number, ev: PointerEvent): void {
    if (!this._advanced) return;
    ev.preventDefault();
    const svgEl = (ev.currentTarget as SVGElement).ownerSVGElement;
    if (!svgEl) return;
    const move = (e: PointerEvent): void => {
      const rect = svgEl.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * GRAPH_H;
      const next = [...this._points];
      next[index] = [next[index][0], this._valueFromY(y)];
      this._points = next;
      this._dragged = true;
      const { amount, heat } = semanticFromPoints(this._points);
      this._amount = amount;
      this._heat = heat;
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  private _save(): void {
    const cycleId = this.cycle?.cycle_id ?? "";
    const detail: CurveSavePayload = this._dragged
      ? {
          cycleId,
          mode: "advanced",
          points: this._points.map((p) => [p[0], p[1]] as [number, number]),
          min: this._min,
          max: this._max,
        }
      : {
          cycleId,
          mode: "simple",
          amount: this._amount,
          heat: this._heat,
          min: this._min,
          max: this._max,
        };
    this.dispatchEvent(
      new CustomEvent<CurveSavePayload>("imc-curve-save", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-curve-cancel", { bubbles: true, composed: true }),
    );
  }

  protected override render(): TemplateResult {
    const lang = this.language;
    if (this.cycle?.curve?.kind === "volume") {
      return html`<div class="volume-note">${localize(lang, "editor.volume_note")}</div>`;
    }
    return html`
      <div class="title">${localize(lang, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${localize(lang, "editor.amount.label")}</label>
          <span class="value">${localize(lang, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${localize(lang, "editor.amount.help")}</div>
        <input type="range" min=${AMOUNT_MIN} max=${AMOUNT_MAX} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${localize(lang, "editor.amount.low")}</span><span>${localize(lang, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${localize(lang, "editor.heat.label")}</label>
          <span class="value">${localize(lang, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${localize(lang, "editor.heat.help")}</div>
        <input type="range" min=${HEAT_MIN} max=${HEAT_MAX} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${localize(lang, "editor.heat.low")}</span><span>${localize(lang, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${localize(lang, "editor.graph.caption")}</div>
        ${this._renderGraph(lang)}
      </div>

      <div class="examples">
        ${this._exampleTile(localize(lang, "editor.example.cool"), this._clampedValue(COOL))}
        ${this._exampleTile(localize(lang, "editor.example.mild"), this._clampedValue(MILD))}
        ${this._exampleTile(localize(lang, "editor.example.hot"), this._clampedValue(HOT))}
      </div>

      ${this._renderToday(lang)}

      <div class="advanced-toggle" @click=${() => (this._advanced = !this._advanced)}>
        ${this._advanced ? "▾" : "▸"} ${localize(lang, "editor.advanced.toggle")}
      </div>
      ${this._advanced ? this._renderAdvanced(lang) : nothing}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${localize(lang, "editor.save")}</button>
        <button @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>
      </div>
    `;
  }

  private _exampleTile(label: string, minutes: number): TemplateResult {
    return html`<div class="example"><div class="lbl">${label}</div><div class="num">${minutes} min</div></div>`;
  }

  private _renderToday(lang: string): TemplateResult | typeof nothing {
    const t = this.weightedTemp;
    if (t === undefined || Number.isNaN(t)) return nothing;
    const minutes = this._clampedValue(t);
    return html`<div class="today-banner">${localize(lang, "editor.today", {
      temp: Math.round(t),
      min: minutes,
    })}</div>`;
  }

  private _renderAdvanced(lang: string): TemplateResult {
    return html`
      <div class="help">${localize(lang, "editor.advanced.help")}</div>
      <div class="limits">
        <div class="limit">
          <label>${localize(lang, "editor.min.label")}</label>
          <div class="help">${localize(lang, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(e: Event) => (this._min = Number((e.target as HTMLInputElement).value))} /> min
        </div>
        <div class="limit">
          <label>${localize(lang, "editor.max.label")}</label>
          <div class="help">${localize(lang, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(e: Event) => (this._max = Number((e.target as HTMLInputElement).value))} /> min
        </div>
      </div>
      <div class="note">${localize(lang, "editor.drag_hint")}</div>
      <div class="note">${localize(lang, "editor.more_points")}</div>
    `;
  }

  private _renderGraph(lang: string): TemplateResult {
    const dense: Array<[number, number]> = [];
    for (let t = T_MIN; t <= T_MAX; t += 1) {
      dense.push([this._sx(t), this._sy(this._clampedValue(t))]);
    }
    const path = dense.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const t = this.weightedTemp;
    const showToday = t !== undefined && !Number.isNaN(t) && t >= T_MIN && t <= T_MAX;
    return svg`
      <svg viewBox="0 0 ${GRAPH_W} ${GRAPH_H}">
        <line class="axis" x1=${PAD_L} y1=${PAD_T} x2=${PAD_L} y2=${GRAPH_H - PAD_B}></line>
        <line class="axis" x1=${PAD_L} y1=${GRAPH_H - PAD_B} x2=${GRAPH_W - PAD_R} y2=${GRAPH_H - PAD_B}></line>
        <text class="tick" x=${this._sx(COOL)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(MILD)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(HOT)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">35°</text>
        ${showToday
          ? svg`<line class="today" x1=${this._sx(t as number)} y1=${PAD_T} x2=${this._sx(t as number)} y2=${GRAPH_H - PAD_B}></line>
              <text class="today-text" x=${this._sx(t as number)} y=${PAD_T - 4} text-anchor="middle">${localize(lang, "editor.graph.today", { temp: Math.round(t as number) })}</text>`
          : nothing}
        <path class="curve" d=${path}></path>
        ${this._points.map(
          (p, i) => svg`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(p[0]).toFixed(1)} cy=${this._sy(this._clampedValue(p[0])).toFixed(1)}
            @pointerdown=${(e: PointerEvent) => this._startDrag(i, e)}></circle>`,
        )}
      </svg>
    `;
  }
}

defineElement("imc-curve-editor", ImcCurveEditor);

declare global {
  interface HTMLElementTagNameMap {
    "imc-curve-editor": ImcCurveEditor;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd card && npm run typecheck`
Expected: clean. (If `localize`'s params type rejects numeric values, cast with `String(...)` at the call sites — check `localize/localize.ts` signature first and match it.)

- [ ] **Step 3: Commit**

```bash
git add card/src/curve-editor.ts
git commit -m "feat(card): live curve editor component"
```

---

### Task 6: Wire the editor into the card + rebuild bundle

**Files:**
- Modify: `card/src/types.ts` (extend `ZoneAction`)
- Modify: `card/src/zone-row.ts` (Edit button, host the editor, pass `weightedTemp`, re-dispatch save/cancel)
- Modify: `card/src/card.ts` (pass `weightedTemp` to the row; handle the new `ZoneAction`s)
- Modify: `custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js` (rebuilt bundle — do not hand-edit)

**Interfaces:**
- Consumes: `CurveSavePayload` from `curve-editor.ts`; `hub.weightedTemp` (a `HassEntity`) already discovered in `card.ts`.
- Produces: `ZoneAction` gains `{ action: "save-simple-curve"; zoneId; cycleId; amount; heat; min; max }` and `{ action: "save-curve"; zoneId; cycleId; points; min; max }`.

- [ ] **Step 1: Extend `ZoneAction`**

In `card/src/types.ts`, add to the `ZoneAction` union:

```ts
  | {
      action: "save-simple-curve";
      zoneId: string;
      cycleId: string;
      amount: number;
      heat: number;
      min: number;
      max: number;
    }
  | {
      action: "save-curve";
      zoneId: string;
      cycleId: string;
      points: [number, number][];
      min: number;
      max: number;
    }
```

- [ ] **Step 2: Zone-row — Edit button, editor host, weightedTemp prop**

In `card/src/zone-row.ts`:
- Add `import "./curve-editor";` and `import type { CurveSavePayload } from "./curve-editor";`.
- Add `@property({ attribute: false }) weightedTemp?: number;` and `@state() private _editingCycle?: string;`.
- In `_renderCycle(cycle)`, for duration cycles add an "Edit curve" button; when `this._editingCycle === cycle.cycle_id`, render the editor instead of/below the sparkline:

```ts
    const isVolume = curve?.kind === "volume";
    const editing = this._editingCycle === cycle.cycle_id;
    // ... existing sparkline block ...
    const editButton = isVolume
      ? nothing
      : html`<button class="link-btn" @click=${() =>
          (this._editingCycle = editing ? undefined : cycle.cycle_id)}>
          ${localize(lang, "editor.edit_curve")}
        </button>`;
    const editor = editing
      ? html`<imc-curve-editor
          .language=${lang}
          .cycle=${cycle}
          .weightedTemp=${this.weightedTemp}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => (this._editingCycle = undefined)}
        ></imc-curve-editor>`
      : nothing;
```

Insert `editButton` next to the sparkline and `editor` below the cycle block. Add a `.link-btn` style (small text button). Add the handler:

```ts
  private _onCurveSave(ev: CustomEvent<CurveSavePayload>): void {
    const zoneId = this.zone?.zoneId;
    if (!zoneId) return;
    const d = ev.detail;
    if (d.mode === "simple") {
      this._dispatch({
        action: "save-simple-curve",
        zoneId,
        cycleId: d.cycleId,
        amount: d.amount,
        heat: d.heat,
        min: d.min,
        max: d.max,
      });
    } else {
      this._dispatch({
        action: "save-curve",
        zoneId,
        cycleId: d.cycleId,
        points: d.points,
        min: d.min,
        max: d.max,
      });
    }
    this._editingCycle = undefined;
  }
```

(Confirm `this.zone?.zoneId` is the correct accessor by checking the `ZoneBundle` type used in this file; match whatever the existing dispatch handlers use for the zone id.)

- [ ] **Step 3: Card — pass weightedTemp, handle the new actions**

In `card/src/card.ts`:
- Where `<imc-zone-row ...>` is rendered, add `.weightedTemp=${asNumber(this._model?.hub.weightedTemp?.state)}` (import `asNumber` from `./types` if not already imported; use the model's hub reference that the header already uses).
- In `_onZoneAction`, add cases:

```ts
      case "save-simple-curve":
        void this._call("irrigation_maestro", "set_simple_curve", {
          zone_id: detail.zoneId,
          cycle_id: detail.cycleId,
          amount: detail.amount,
          heat: detail.heat,
          min_value: detail.min,
          max_value: detail.max,
        });
        break;
      case "save-curve":
        void this._call("irrigation_maestro", "set_curve", {
          zone_id: detail.zoneId,
          cycle_id: detail.cycleId,
          points: detail.points,
          min_value: detail.min,
          max_value: detail.max,
        });
        break;
```

- [ ] **Step 4: Typecheck, test, build the bundle**

```bash
cd card && npm run typecheck && npm run test && npm run build
```
Expected: clean; `custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js` regenerated.

- [ ] **Step 5: Commit (source + rebuilt bundle together)**

```bash
cd /home/jmbriccola/projects/ha-irrigation-configurable
git add card/src/types.ts card/src/zone-row.ts card/src/card.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js
git commit -m "feat(card): wire the curve editor into zone rows and save via services"
```

---

### Task 7: Docs, contract, version bump

**Files:**
- Modify: `docs/design/card-contract.md`
- Modify: `INSTRUCTIONS.md`
- Modify: `docs/it/istruzioni.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `custom_components/irrigation_maestro/manifest.json`

- [ ] **Step 1: Update the card contract**

In `docs/design/card-contract.md`: in the services table add a row for `set_simple_curve` with fields `zone_id, cycle_id, amount, heat, min_value?, max_value?`; add a note under the card section that the card now also **writes** curves (via `set_simple_curve` for the simple sliders and `set_curve` for dragged points) and reads `hub_weighted_temp` for the editor's "today" line.

- [ ] **Step 2: Update user docs**

In `INSTRUCTIONS.md` (§ "The card") and `docs/it/istruzioni.md` (§ "La card"), add a short paragraph:

> EN: "Editing curves from the card — expand a zone, open a cycle and press **Edit curve**. Two sliders (*How much water* and *How much more when it's hot*) reshape the watering live: the graph, the cool/mild/hot examples and the 'with today's weather' line update as you drag. **Advanced** adds the *Never less than / Never more than* safety limits and lets you drag the three points. Curves needing more than three points are still edited in the zone settings."

> IT: "Modificare le curve dalla card — espandi una zona, apri un ciclo e premi **Modifica curva**. Due slider (*Quanta acqua* e *Quanto di più quando fa caldo*) rimodellano l'irrigazione dal vivo: il grafico, gli esempi fresco/mite/caldo e la riga 'con il meteo di oggi' si aggiornano mentre trascini. **Avanzate** aggiunge i limiti di sicurezza *Mai meno di / Mai più di* e ti fa trascinare i tre punti. Le curve con più di tre punti si modificano nelle impostazioni della zona."

- [ ] **Step 3: README + CHANGELOG**

In `README.md`, add to the card feature bullet that the card includes a live, beginner-friendly curve editor. In `CHANGELOG.md`, add a `## [1.1.0]` section above `## [1.0.0]`:

```markdown
## [1.1.0] - 2026-08-11

### Added

- Live, beginner-friendly **curve editor in the Lovelace card**: two
  plain-language sliders ("how much water", "how much more when it's hot") with
  a live graph, worked examples and a "with today's weather" line; an Advanced
  panel with safety limits and draggable points. New `set_simple_curve`
  service.
```

- [ ] **Step 4: Bump the manifest version**

In `custom_components/irrigation_maestro/manifest.json`, set `"version": "1.1.0"`.

- [ ] **Step 5: Full local gate**

```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/python -m pytest tests -q
cd card && npm run typecheck && npm run test && npm run build && git diff --exit-code custom_components/irrigation_maestro/frontend/
```
Expected: all green; the bundle diff is empty (already committed in Task 6).

- [ ] **Step 6: Commit**

```bash
cd /home/jmbriccola/projects/ha-irrigation-configurable
git add docs/design/card-contract.md INSTRUCTIONS.md docs/it/istruzioni.md README.md CHANGELOG.md custom_components/irrigation_maestro/manifest.json
git commit -m "docs: document the card curve editor; bump to 1.1.0"
```

---

## Self-review notes

- **Spec coverage:** §2 semantic model → Task 1 + Task 3 (TS mirror). §3 save path (`set_simple_curve` + `set_curve`) → Task 2 + Task 6. §4 placement/data deps → Task 6 (edit button, weightedTemp) + reads `cycles` (already exposed). §5 components → Tasks 1/3/5/6. §6 copy (all strings) → Task 4 (card) + Task 2 (service). §7 testing → Task 1/2 (Python), Task 3 (vitest parity), typecheck/build throughout. §8 docs/version → Task 7. §9 risks (drift) → Task 3 parity test.
- **Placeholder scan:** every code step has concrete code; the two "confirm the accessor" notes (zone id in zone-row, localize param type) are verification steps against existing code, not deferred implementation.
- **Type consistency:** `points_from_semantic`/`pointsFromSemantic`, `semantic_from_curve`/`semanticFromPoints`, `curveValue`, `CurveSavePayload`, `ZoneAction` variants `save-simple-curve`/`save-curve`, and service names `set_simple_curve`/`set_curve` are used consistently across tasks.
