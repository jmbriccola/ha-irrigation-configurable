# Dashboard Curve Authoring — Phase B (card) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the dashboard a real curve editor — any number of control points, explicit clamps and kind — then retire the two-slider semantic model from both sides of the wire and ship 3.0.0.

**Architecture:** The card stops reading the derived `amount` / `heat` / `day_minutes` compatibility values and computes minutes itself from `curve.points` and `intensity_pct`, mirroring the engine's arithmetic. Only once the card no longer reads them do those attributes, `set_simple_curve` and `engine/semantic.py` come out. Every card change rebuilds the committed bundle, because CI fails on a stale one.

**Tech Stack:** Lit 3 + TypeScript + Vite (`card/`), vitest for card unit tests; Python 3.13 syntax, pytest + ruff + mypy for the integration.

**Spec:** `docs/superpowers/specs/2026-08-13-dashboard-curve-authoring-design.md`
**Phase A plan (already executed):** `docs/superpowers/plans/2026-08-13-dashboard-curve-authoring-phase-a-backend.md`
**Wire contract:** `docs/design/card-contract.md` — updated in Phase A, and normative here.

## Global Constraints

- **Ordering is load-bearing.** The card must stop reading `amount`, `heat` and `day_minutes` (Task 1) BEFORE the sensor stops publishing them (Task 6). Reversing these two strands leaves an intermediate commit where the installed dashboard shows zeroes.
- **CI fails on a stale bundle**: `.github/workflows/ci.yml` runs `git diff --exit-code custom_components/irrigation_maestro/frontend/`. Every task that changes `card/src/**` must run `npm run build` and commit the two regenerated files in `custom_components/irrigation_maestro/frontend/`.
- `card/node_modules` does not exist in a fresh worktree — run `npm ci` in `card/` once before the first card task.
- The weather decision engine stays out of scope: `engine/weather.py`, `engine/evaluate.py`, `engine/history.py` and the arithmetic in `engine/curves.py` are not modified. `PRESET_POTS` / `PRESET_LAWN` control points are never modified, and the §8 regression tests (`tests/engine/test_curves.py`, `tests/engine/test_weather.py`) must pass unchanged.
- The card's arithmetic must mirror the engine's ordering exactly: **interpolate → intensity → clamps**. `engine/curves.py::curve_value` applies the adjustment before the min/max clamps; the TypeScript must do the same or the preview will disagree with the water delivered.
- Reference temperature is **25 °C** on both sides (`const.CURVE_REFERENCE_TEMP_C`).
- Rounding uses banker's rounding (`roundHalfEven` in `curve-math.ts`) to match Python's `round()`. Do not substitute `Math.round`.
- Code, comments and docstrings in English; the card carries its own IT+EN layer in `card/src/localize/`, and every new user-visible string needs both.
- Python gates after every backend commit: `ruff check .`, `ruff format --check .`, `mypy custom_components`, `pytest`. Card gates after every card commit: `npm run typecheck`, `npm run test`, `npm run build`.
- Baseline at the start of this phase: 389 Python tests passing, all gates clean.

## File Structure

**Card — rewritten**
- `card/src/curve-math.ts` — loses the semantic mapping, gains raw/scaled evaluation, point validation and the preview temperatures. The one place curve arithmetic lives on the card.
- `card/src/schedule-math.ts` — `dayBase` / `effectiveMinutes` re-expressed over the real curve and the intensity.
- `card/src/curve-editor.ts` — rewritten from two sliders to a point editor.
- `card/src/discovery.ts` — reads `intensity_pct` / `day_intensity_pct`.
- `card/src/types.ts` — `CycleInfo` and `ZoneAction` follow.

**Card — adjusted callers**
- `card/src/zone-row.ts`, `card/src/card.ts` — curve save path, `kind`, no simple-curve action.
- `card/src/panel/program-editor.ts`, `program-wizard.ts`, `program-list.ts`, `panel.ts` — preview math, duplicate and copy-curve actions.
- `card/src/localize/en.ts`, `card/src/localize/it.ts`.

**Integration — removals and debts**
- `custom_components/irrigation_maestro/services.py`, `services.yaml`, `sensor.py`, `config_flow.py`, `translations/{en,it}.json`.
- Deleted: `custom_components/irrigation_maestro/engine/semantic.py`, `tests/engine/test_semantic.py`.
- `manifest.json`, `CHANGELOG.md`, `MEMORY.md`, `docs/design/card-contract.md`.

---

### Task 1: The card computes minutes from the curve, not from derived values

`schedule-math.ts` predicts a program's minutes by rebuilding a curve from `pointsFromSemantic(base, heat)` — a third re-implementation of the curve arithmetic, and a lossy one, since it reads the same three-anchor reduction it is supposed to replace. This task makes the card evaluate the real curve.

**Files:**
- Modify: `card/src/curve-math.ts`, `card/src/curve-math.test.ts`
- Modify: `card/src/schedule-math.ts`, `card/src/schedule-math.test.ts`
- Modify: `card/src/discovery.ts`, `card/src/discovery.test.ts`, `card/src/types.ts`
- Modify: `card/src/panel/program-editor.ts:637-650`, `card/src/panel/program-wizard.ts:397`

**Interfaces:**
- Produces: `REFERENCE_TEMP = 25`, `PREVIEW_TEMPS`, `rawValue(points, temp)`, `scaledValue(points, temp, intensityPct, min?, max?)`, `validatePoints(points)`, `previewFromMinutes(points, minutesAtReference, temp, min?, max?)`, `dayIntensity(cycle, wd)`, `dayBase(cycle, wd)`, `effectiveMinutes(cycle, wd, weightedTemp)`.
- `CycleInfo` gains `intensity_pct?: number` and `day_intensity_pct?: Record<string, number>`; keeps `amount` / `heat` / `day_minutes` for now (Task 6 removes them).

- [ ] **Step 1: Write the failing tests**

Append to `card/src/curve-math.test.ts`:

```ts
describe("scaledValue", () => {
  const points: CurvePoint[] = [
    [10, 10],
    [25, 20],
    [35, 32],
  ];

  it("applies the intensity before the clamps, like the engine", () => {
    // raw 20 at the reference, 150% -> 30, inside the clamps.
    expect(scaledValue(points, 25, 150, 1, 60)).toBeCloseTo(30);
    // A floor must not be scaled with the value it guards: raw 10 at 50%
    // is 5, floored back up to the unscaled minimum.
    expect(scaledValue(points, 10, 50, 10, 60)).toBeCloseTo(10);
  });

  it("defaults to an unscaled curve", () => {
    expect(scaledValue(points, 25, 100)).toBeCloseTo(20);
  });
});

describe("previewFromMinutes", () => {
  const points: CurvePoint[] = [
    [10, 10],
    [25, 20],
    [35, 32],
  ];

  it("reproduces the requested minutes at the reference", () => {
    expect(previewFromMinutes(points, 30, 25, 1, 60)).toBe(30);
  });

  it("keeps the curve's shape at other temperatures", () => {
    // 30 minutes asked at 25 C is a factor of 1.5; raw 32 at 35 C -> 48.
    expect(previewFromMinutes(points, 30, 35, 1, 60)).toBe(48);
  });

  it("returns 0 rather than dividing by a curve worth nothing", () => {
    expect(previewFromMinutes([[25, 0]], 20, 30)).toBe(0);
  });
});

describe("validatePoints", () => {
  it("accepts a valid multi-point curve", () => {
    expect(validatePoints([[5, 1], [25, 20], [40, 55]])).toBeNull();
  });

  it("rejects an empty curve", () => {
    expect(validatePoints([])).toBe("curve_empty");
  });

  it("rejects a negative value", () => {
    expect(validatePoints([[25, -1]])).toBe("curve_negative_value");
  });

  it("rejects temperatures that do not strictly increase", () => {
    expect(validatePoints([[25, 10], [25, 12]])).toBe("curve_temps_not_increasing");
    expect(validatePoints([[30, 10], [25, 12]])).toBe("curve_temps_not_increasing");
  });
});
```

Replace the semantic tests in that file (`pointsFromSemantic`, `semanticFromPoints`) — they test a mapping this phase deletes.

Append to `card/src/schedule-math.test.ts`:

```ts
const CYCLE = {
  intensity_pct: 150,
  day_intensity_pct: { "0": 50 },
  curve: { points: [[10, 10], [25, 20], [35, 32]], min: 1, max: 60 },
};

describe("dayIntensity", () => {
  it("prefers a per-day override and falls back to the uniform value", () => {
    expect(dayIntensity(CYCLE, 0)).toBe(50);
    expect(dayIntensity(CYCLE, 3)).toBe(150);
  });

  it("treats a program with no intensity as unscaled", () => {
    expect(dayIntensity({}, 3)).toBe(100);
  });
});

describe("dayBase", () => {
  it("is the scaled minutes at the reference temperature", () => {
    expect(dayBase(CYCLE, 3)).toBe(30); // 20 * 1.5
    expect(dayBase(CYCLE, 0)).toBe(10); // 20 * 0.5
  });
});

describe("effectiveMinutes", () => {
  it("evaluates the real curve at the weighted temperature", () => {
    expect(effectiveMinutes(CYCLE, 3, 35)).toBe(48); // 32 * 1.5
  });

  it("keeps every control point — a six-point curve is not reduced", () => {
    const six = {
      intensity_pct: 100,
      curve: {
        points: [[5, 4], [12, 10], [20, 18], [25, 24], [33, 40], [40, 52]],
        min: 1,
        max: 60,
      },
    };
    // 33 C sits exactly on the fifth point. The old three-anchor rebuild
    // could not represent it and returned the interpolation between 25 and 35.
    expect(effectiveMinutes(six, 3, 33)).toBe(40);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd card && npm run test`
Expected: FAIL — `scaledValue is not exported`, `dayIntensity is not a function`.

- [ ] **Step 3: Rewrite `curve-math.ts`**

Delete `pointsFromSemantic`, `semanticFromPoints`, `AMOUNT_MIN`, `AMOUNT_MAX`, `HEAT_MIN`, `HEAT_MAX`, `COOL`, `MILD`, `HOT` and `SLOPE_SPAN`. Keep `roundHalfEven` and `parseCurvePoints` unchanged. Replace the module docstring, and rewrite `curveValue` as the pair below:

```ts
/** The reference temperature the quick minutes control converts against. */
export const REFERENCE_TEMP = 25;

/** Temperatures the editor previews the curve at. */
export const PREVIEW_TEMPS = [5, 12, 20, 25, 30, 35, 40] as const;

/**
 * The curve's raw value: linear between control points, flat beyond the
 * extremes, no intensity and no clamps. Mirrors engine/curves.py::interpolate.
 */
export function rawValue(points: CurvePoint[], temp: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (temp <= first[0]) return first[1];
  if (temp >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (!p0 || !p1) continue;
    const [t0, v0] = p0;
    const [t1, v1] = p1;
    if (t0 <= temp && temp <= t1) return v0 + ((v1 - v0) * (temp - t0)) / (t1 - t0);
  }
  return last[1];
}

/**
 * The configured value: raw, then the intensity, then the clamps — the same
 * order engine/curves.py::curve_value applies, so the preview and the water
 * delivered cannot disagree. The clamps are absolute guards and are NOT
 * scaled with the value they guard.
 */
export function scaledValue(
  points: CurvePoint[],
  temp: number,
  intensityPct = 100,
  min?: number,
  max?: number,
): number {
  let value = (rawValue(points, temp) * intensityPct) / 100;
  if (min !== undefined) value = Math.max(value, min);
  if (max !== undefined) value = Math.min(value, max);
  return value;
}

/**
 * The curve read at `temp` when the user has asked for `minutesAtReference`
 * minutes at 25 C. Algebraically identical to the intensity the backend will
 * store (100 * minutes / raw(25)), so the live preview matches what is saved.
 */
export function previewFromMinutes(
  points: CurvePoint[],
  minutesAtReference: number,
  temp: number,
  min?: number,
  max?: number,
): number {
  const reference = rawValue(points, REFERENCE_TEMP);
  if (reference <= 0) return 0; // a curve worth nothing cannot be scaled
  return roundHalfEven(scaledValue(points, temp, (100 * minutesAtReference) / reference, min, max));
}

/**
 * Mirrors engine/curves.py::validate_points. Returns an error key the card
 * localises, or null when the points are valid.
 */
export function validatePoints(points: CurvePoint[]): string | null {
  if (points.length === 0) return "curve_empty";
  for (const point of points) {
    if (point[1] < 0) return "curve_negative_value";
  }
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    if (!previous || !current) continue;
    if (current[0] <= previous[0]) return "curve_temps_not_increasing";
  }
  return null;
}
```

If any file still imports `curveValue`, keep a thin wrapper `export const curveValue = (points, temp, min?, max?) => scaledValue(points, temp, 100, min, max);` ONLY if a caller genuinely needs it; otherwise update the callers and do not keep it.

- [ ] **Step 4: Rewrite `schedule-math.ts`**

Replace the `pointsFromSemantic` import and the `dayBase` / `effectiveMinutes` / `isUniform` block:

```ts
import { parseCurvePoints, previewFromMinutes, REFERENCE_TEMP, roundHalfEven, scaledValue } from "./curve-math";
import type { CycleInfo } from "./types";

/** Programs whose per-day map is empty water the same amount every day. */
export function isUniform(dayIntensityPct?: Record<string, number>): boolean {
  return !dayIntensityPct || Object.keys(dayIntensityPct).length === 0;
}

/** The scale in force on a given weekday: the override, else the uniform value. */
export function dayIntensity(cycle: Partial<CycleInfo>, wd: number): number {
  return cycle.day_intensity_pct?.[String(wd)] ?? cycle.intensity_pct ?? 100;
}

/** Minutes this program waters at the reference temperature on that weekday. */
export function dayBase(cycle: Partial<CycleInfo>, wd: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return roundHalfEven(
    scaledValue(points, REFERENCE_TEMP, dayIntensity(cycle, wd), cycle.curve?.min, cycle.curve?.max),
  );
}

/** Minutes this program will water at the given weighted temperature. */
export function effectiveMinutes(cycle: Partial<CycleInfo>, wd: number, weightedTemp: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return roundHalfEven(
    scaledValue(points, weightedTemp, dayIntensity(cycle, wd), cycle.curve?.min, cycle.curve?.max),
  );
}

/** Live preview while the user is dragging a minutes stepper (unsaved state). */
export function previewMinutes(cycle: Partial<CycleInfo>, minutesAtReference: number, weightedTemp: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return previewFromMinutes(points, minutesAtReference, weightedTemp, cycle.curve?.min, cycle.curve?.max);
}
```

- [ ] **Step 5: Update `types.ts` and `discovery.ts`**

In `CycleInfo` add, next to the existing optional fields:

```ts
  /** Watering strength as a percentage of the curve; absent reads as 100. */
  intensity_pct?: number;
  /** Per-weekday override of `intensity_pct`, keyed by weekday-as-string. */
  day_intensity_pct?: Record<string, number>;
```

Leave `amount`, `heat` and `day_minutes` in place for now — Task 6 removes them once the sensor stops publishing them.

In `readCycles` (`discovery.ts:150-163`), keep the `day_minutes` / `amount` / `heat` reads for now and ADD, using the same shape as the existing `day_minutes` loop:

```ts
    info.intensity_pct = asNumber(c["intensity_pct"]);
    const di = c["day_intensity_pct"];
    if (di && typeof di === "object") {
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(di as Record<string, unknown>)) {
        const n = asNumber(v);
        if (n !== undefined) map[k] = n;
      }
      info.day_intensity_pct = map;
    }
```

Add a case to `discovery.test.ts` asserting both new fields are read.

- [ ] **Step 6: Update the two preview callers**

In `card/src/panel/program-editor.ts` (`_renderWeatherLine`, around `:637`), replace the `dayBase` + `heat` + `effectiveMinutes` block with the working-state preview, keeping the surrounding "does it even run today" logic untouched:

```ts
    const base = this._sameForAll
      ? this._uniformMinutes
      : (this._dayMinutes[String(today)] ?? this._uniformMinutes);
    const min = previewMinutes(cycle, base, t);
```

Its `_sameForAll` seeding (`:387`) becomes `isUniform(cycle.day_intensity_pct)`, and the per-day stepper values (`:583`, `:657`) read `dayBase(cycle, wd)` when the user has not touched that day. `card/src/panel/program-wizard.ts:397` becomes `previewMinutes(draftCycle, base, weightedTemp)` — the wizard's draft has a curve because `add_program` writes the default one.

- [ ] **Step 7: Run the card gates and rebuild the bundle**

Run, from `card/`:

```bash
npm ci        # first card task only; node_modules is absent in a fresh worktree
npm run test
npm run typecheck
npm run build
```
Expected: tests pass, typecheck clean, build regenerates both files under `custom_components/irrigation_maestro/frontend/`.

- [ ] **Step 8: Commit**

```bash
git add card/src custom_components/irrigation_maestro/frontend
git commit -m "feat(card): predict minutes from the real curve and the intensity

schedule-math rebuilt a three-anchor curve from amount/heat to predict a
program's minutes — the same lossy reduction this release removes, one
level further out. It now evaluates the configured points and applies the
intensity in the engine's own order: interpolate, scale, clamp."
```

---

### Task 2: The point-based curve editor

**Files:**
- Rewrite: `card/src/curve-editor.ts`
- Modify: `card/src/localize/en.ts`, `card/src/localize/it.ts`
- Test: `card/src/curve-editor.test.ts` (new)

**Interfaces:**
- Consumes: `rawValue`, `scaledValue`, `validatePoints`, `PREVIEW_TEMPS`, `parseCurvePoints`, `roundHalfEven` (Task 1).
- Produces: `CurveSavePayload` becomes a single shape — `{ cycleId: string; points: [number, number][]; min: number; max: number; kind: "duration" | "volume" }`. The `mode: "simple"` variant is deleted.

- [ ] **Step 1: Write the failing test**

Create `card/src/curve-editor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addPoint, removePoint, sortPoints, updatePoint } from "./curve-editor-state";
import type { CurvePoint } from "./curve-math";

const POINTS: CurvePoint[] = [
  [10, 10],
  [25, 20],
  [35, 32],
];

describe("curve editor point operations", () => {
  it("inserts a new point midway between its neighbours", () => {
    const next = addPoint(POINTS, 1);
    expect(next).toHaveLength(4);
    expect(next[2]).toEqual([30, 26]); // midpoint of (25,20) and (35,32)
  });

  it("appends beyond the last point when asked to extend the end", () => {
    const next = addPoint(POINTS, 2);
    expect(next).toHaveLength(4);
    expect(next[3]?.[0]).toBeGreaterThan(35);
  });

  it("refuses to remove the last remaining point", () => {
    expect(removePoint([[25, 20]], 0)).toEqual([[25, 20]]);
  });

  it("removes a point when others remain", () => {
    expect(removePoint(POINTS, 1)).toEqual([
      [10, 10],
      [35, 32],
    ]);
  });

  it("keeps points ordered by temperature after an edit", () => {
    const next = sortPoints(updatePoint(POINTS, 0, 40, 12));
    expect(next.map((p) => p[0])).toEqual([25, 35, 40]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd card && npm run test`
Expected: FAIL — `Cannot find module './curve-editor-state'`.

- [ ] **Step 3: Write the pure state module**

Create `card/src/curve-editor-state.ts` — the editor's logic lives here so it is testable without a DOM:

```ts
import type { CurvePoint } from "./curve-math";

/** Points, ordered by temperature. The editor keeps this invariant after
 * every edit so the curve is always renderable and always valid to save. */
export function sortPoints(points: CurvePoint[]): CurvePoint[] {
  return [...points].sort((a, b) => a[0] - b[0]);
}

/**
 * Insert a point after `index`: midway to the next one, or 5 degrees past
 * the end when there is no next one. Halving an interval is what a user
 * means by "give me another handle here".
 */
export function addPoint(points: CurvePoint[], index: number): CurvePoint[] {
  const current = points[index];
  if (!current) return points;
  const next = points[index + 1];
  const inserted: CurvePoint = next
    ? [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2]
    : [current[0] + 5, current[1]];
  return sortPoints([...points, inserted]);
}

/** Remove a point, unless it is the only one left — an empty curve is invalid. */
export function removePoint(points: CurvePoint[], index: number): CurvePoint[] {
  if (points.length <= 1) return points;
  return points.filter((_, i) => i !== index);
}

/** Replace one point's temperature and value, leaving the order to the caller. */
export function updatePoint(
  points: CurvePoint[],
  index: number,
  temp: number,
  value: number,
): CurvePoint[] {
  const next = [...points];
  if (!next[index]) return points;
  next[index] = [temp, Math.max(0, value)];
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd card && npm run test`
Expected: PASS.

- [ ] **Step 5: Rewrite the editor component**

Rewrite `card/src/curve-editor.ts` around the state module. Keep the existing `static styles` block, the SVG graph geometry constants and `_startDrag` (extended to any point index), and replace the rest:

- `@state()` fields: `_points: CurvePoint[]`, `_min: number`, `_max: number`, `_kind: "duration" | "volume"`, `_error: string | null`.
- `_seedFromCycle()` reads `parseCurvePoints(this.cycle?.curve?.points)` **verbatim** — no reduction to anchors, which is the entire point of this task — plus `min`, `max` and `kind`.
- A point table: one row per point with a temperature input, a value input, a remove button (disabled when only one point remains) and an add button; every mutation goes through the state module and then `sortPoints`.
- The graph keeps the drag handles, now one per point, and derives its x-axis range from the points themselves rather than the fixed 5–40 window: `xMin = min(points[0][0], 5) - 2`, `xMax = max(last[0], 40) + 2`.
- Explicit `min` / `max` number inputs, as today.
- A `kind` selector, offered only when `this.zoneHasFlowMeter` is true (new boolean property, passed down from the caller in Task 3); when false the control is hidden and the kind stays `"duration"`.
- A preview strip reading `scaledValue(this._points, t, 100, this._min, this._max)` at each of `PREVIEW_TEMPS`, plus the existing "today" marker.
- **The intensity notice.** When `this.cycle?.intensity_pct` is set and not 100, render a line above the buttons: `localize(lang, "editor.intensity_reset", { pct: Math.round(this.cycle.intensity_pct) })`. Saving a curve resets the intensity to 100 % on the backend (`card-contract.md`, "the intensity reset rule"), so a user who scaled a program to 150 % and then edits its curve must be told the scale goes away — otherwise the delivered minutes change for a reason they cannot see.
The two non-obvious parts, in full — the save gate and one point row:

```ts
  private _save(): void {
    const error =
      validatePoints(this._points) ??
      (this._min > this._max ? "min_above_max" : null) ??
      (this._min < 0 ? "negative_clamp" : null);
    if (error) {
      // Nothing is dispatched on a bad curve: the services validate again and
      // would reject it, and a half-applied edit is worse than a refused one.
      this._error = error;
      return;
    }
    this._error = null;
    this.dispatchEvent(
      new CustomEvent<CurveSavePayload>("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((p) => [p[0], p[1]] as [number, number]),
          min: this._min,
          max: this._max,
          kind: this._kind,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderPointRow(point: CurvePoint, index: number, lang: string): TemplateResult {
    return html`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(point[0])}
        aria-label=${localize(lang, "editor.point_temp")}
        @change=${(e: Event) => this._editPoint(index, e, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(point[1])}
        aria-label=${localize(lang, "editor.point_value")}
        @change=${(e: Event) => this._editPoint(index, e, "value")}
      />
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${localize(lang, "editor.point_remove")}
        @click=${() => (this._points = removePoint(this._points, index))}
      >
        ✕
      </button>
      <button
        type="button"
        title=${localize(lang, "editor.point_add")}
        @click=${() => (this._points = addPoint(this._points, index))}
      >
        ＋
      </button>
    </div>`;
  }

  private _editPoint(index: number, event: Event, field: "temp" | "value"): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(raw)) return;
    const current = this._points[index];
    if (!current) return;
    const next =
      field === "temp"
        ? updatePoint(this._points, index, raw, current[1])
        : updatePoint(this._points, index, current[0], raw);
    // Re-sorting on every edit keeps the curve renderable while the user is
    // still typing; validatePoints then only ever has to reject duplicates.
    this._points = sortPoints(next);
    this._error = null;
  }
```

- [ ] **Step 6: Add the localisation keys**

In `card/src/localize/en.ts` and `it.ts`, under the `editor` namespace, add: `points_title`, `point_temp`, `point_value`, `point_add`, `point_remove`, `kind_label`, `kind_duration`, `kind_volume`, `preview_title`, `intensity_reset`, and one message per error key — `curve_empty`, `curve_negative_value`, `curve_temps_not_increasing`, `min_above_max`, `negative_clamp`. Delete the now-unused `editor.amount.*` and `editor.heat.*` keys. Italian must be genuine Italian, matching the file's existing voice.

Suggested English for the notice, to be matched in tone in Italian: *"This program waters at {pct}% of its curve. Saving a curve you edited here resets that to 100%, so the minutes will change."*

- [ ] **Step 7: Run the card gates and rebuild**

Run, from `card/`: `npm run test && npm run typecheck && npm run build`
Expected: all pass; bundle regenerated.

- [ ] **Step 8: Commit**

```bash
git add card/src custom_components/irrigation_maestro/frontend
git commit -m "feat(card): a curve editor with as many points as the user needs

The two sliders could only ever express three fixed anchors at 12/25/35 C,
so a floor, a knee above 35 C or any anchor outside that window was
unreachable from the dashboard. Points are now added, moved and removed
directly, with the clamps and the kind explicit and the resulting curve
previewed at seven temperatures."
```

---

### Task 3: Wire the new payload through, and drop the simple-curve path from the card

**Files:**
- Modify: `card/src/types.ts` (`ZoneAction`), `card/src/zone-row.ts:585-645`, `card/src/card.ts`, `card/src/panel/program-editor.ts:540-570`, `card/src/panel/panel.ts`

**Interfaces:**
- Consumes: the single `CurveSavePayload` (Task 2).
- Produces: `ZoneAction` loses `save-simple-curve`; `save-curve` gains `kind`. The panel's `ProgramCurveSaveDetail` follows.

- [ ] **Step 1: Update the action types**

In `types.ts`, delete the `save-simple-curve` variant and extend the other:

```ts
  | {
      action: "save-curve";
      zoneId: string;
      cycleId: string;
      points: [number, number][];
      min: number;
      max: number;
      kind: "duration" | "volume";
    }
```

- [ ] **Step 2: Update the dispatchers**

In `zone-row.ts`'s `_onCurveSave`, emit the single action shape. In `card.ts`, delete the `set_simple_curve` service call and pass `kind` to `set_curve`:

```ts
      case "save-curve":
        await this._callService("set_curve", {
          zone_id: action.zoneId,
          cycle_id: action.cycleId,
          points: action.points,
          min_value: action.min,
          max_value: action.max,
          kind: action.kind,
        });
        break;
```

Do the same in `panel.ts` for the panel's own curve-save handler. Pass the zone's flow-meter capability into `<imc-curve-editor .zoneHasFlowMeter=${...}>` from both callers — a zone has one when its `degraded` list does NOT contain `no_flow_meter` (the zone sensor already publishes `degraded`).

- [ ] **Step 3: Run the card gates and rebuild**

Run, from `card/`: `npm run test && npm run typecheck && npm run build`
Expected: typecheck fails first on any missed `save-simple-curve` reference — fix each, then all three pass.

- [ ] **Step 4: Verify by hand that the service is no longer called**

Run: `grep -rn "set_simple_curve\|save-simple-curve" card/src`
Expected: no output. The card must not call it before Task 6 deletes it.

- [ ] **Step 5: Commit**

```bash
git add card/src custom_components/irrigation_maestro/frontend
git commit -m "feat(card): one curve save path, carrying the kind"
```

---

### Task 4: Duplicate a program, and copy a curve from another one

**Files:**
- Modify: `card/src/panel/program-list.ts`, `card/src/panel/program-editor.ts`, `card/src/panel/panel.ts`
- Modify: `card/src/localize/en.ts`, `card/src/localize/it.ts`

**Interfaces:**
- Produces: panel events `imc-program-duplicate` (`{ zoneId, programId }`) and `imc-curve-copy` (`{ zoneId, programId, sourceZoneId, sourceProgramId }`), dispatched to the `duplicate_program` and `copy_curve` services built in Phase A.

- [ ] **Step 1: Add the duplicate action**

In `program-list.ts`, beside each program's existing controls, add a duplicate button that dispatches `imc-program-duplicate` with that program's zone and id. In `panel.ts`, handle it by calling the service and refreshing:

```ts
      await this._call("irrigation_maestro", "duplicate_program", {
        zone_id: detail.zoneId,
        program_id: detail.programId,
      });
```

`duplicate_program` names the copy itself and avoids collisions, so the panel passes no name.

- [ ] **Step 2: Add the copy-curve action**

In the program editor's curve section, add a "copy curve from…" control listing every program in every zone except the one being edited, labelled `"<zone name> / <program name>"` — the shape `_copy_candidates()` used in the config flow before it was removed. Selecting one dispatches `imc-curve-copy`; `panel.ts` calls:

```ts
      await this._call("irrigation_maestro", "copy_curve", {
        source_zone_id: detail.sourceZoneId,
        source_program_id: detail.sourceProgramId,
        zone_id: detail.zoneId,
        program_id: detail.programId,
      });
```

The candidate list comes from the panel's already-loaded zone bundles — do not add a new read path.

- [ ] **Step 3: Localise**

Add `program.duplicate`, `program.duplicate_done`, `curve.copy_from`, `curve.copy_placeholder` and an error string for a failed copy, in both languages.

- [ ] **Step 4: Run the card gates and rebuild**

Run, from `card/`: `npm run test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add card/src custom_components/irrigation_maestro/frontend
git commit -m "feat(panel): duplicate a program, copy a curve from another"
```

---

### Task 5: The card stops reading the compatibility values

Only now, with every consumer migrated, does the card drop the derived fields — before the backend stops publishing them, so no intermediate commit shows zeroes.

**Files:**
- Modify: `card/src/types.ts`, `card/src/discovery.ts`, `card/src/discovery.test.ts`, and any straggling reader

- [ ] **Step 1: Find every remaining reader**

Run: `grep -rn "\.amount\|\.heat\|day_minutes" card/src --include="*.ts" | grep -v "\.test\."`
Every hit must be either migrated or deleted. `_dayMinutes` as the program editor's own working state is fine — it is the minutes the user is typing, not a value read from the wire; rename it `_dayMinutesDraft` if that is unclear.

- [ ] **Step 2: Remove the fields**

Delete `amount`, `heat` and `day_minutes` from `CycleInfo`, and their reads from `readCycles`. Update `discovery.test.ts`.

- [ ] **Step 3: Run the card gates and rebuild**

Run, from `card/`: `npm run test && npm run typecheck && npm run build`
Expected: typecheck names any straggler; fix and re-run until clean.

- [ ] **Step 4: Commit**

```bash
git add card/src custom_components/irrigation_maestro/frontend
git commit -m "refactor(card): read the curve and the intensity, not derived minutes"
```

---

### Task 6: Retire the semantic model from the integration

**Files:**
- Delete: `custom_components/irrigation_maestro/engine/semantic.py`, `tests/engine/test_semantic.py`
- Modify: `custom_components/irrigation_maestro/services.py`, `services.yaml`, `sensor.py`, `translations/{en,it}.json`
- Modify: `tests/components/test_entities.py`, `tests/components/test_services.py`
- Modify: `docs/design/card-contract.md`

- [ ] **Step 1: Write the failing test**

In `tests/components/test_entities.py`, extend the zone-sensor test to assert the compatibility values are gone and the stored ones remain:

```python
async def test_zone_sensor_publishes_only_the_stored_shape(hass: HomeAssistant) -> None:
    """amount/heat/day_minutes were a bridge for the 2.x card. The card now
    reads the curve and the intensity, so publishing a second, derived
    representation of the same quantity is a source of drift, not a service."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle = role_state(hass, "zone_state", zone_id).attributes["cycles"][0]

    assert "amount" not in cycle
    assert "heat" not in cycle
    assert "day_minutes" not in cycle
    assert cycle["intensity_pct"] == 100.0
    assert cycle["curve"]["points"] == [[20.0, 3.0]]
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pytest tests/components/test_entities.py -k stored_shape -v`
Expected: FAIL — `assert 'amount' not in {...}`.

- [ ] **Step 3: Strip `_cycle_dict`**

In `sensor.py`, delete the derivation block and the three keys, keeping `intensity_pct`, `day_intensity_pct` and `curve`. Remove the now-unused `curve_value` import if nothing else in the file uses it.

- [ ] **Step 4: Remove `set_simple_curve` and the semantic module**

In `services.py`: delete `SERVICE_SET_SIMPLE_CURVE`, `_SET_SIMPLE_CURVE_SCHEMA`, `_async_set_simple_curve` and its registration, and the `points_from_semantic` / `semantic_from_curve` imports. Replace `_default_program`'s `points_from_semantic(15, 8)` with the literal it produces, so the default survives the module's deletion:

```python
#: The default curve for a new program: 5 minutes on a cold day, 15 on a mild
#: one, 23 on a hot one. These are exactly the points the retired semantic
#: mapping produced for amount=15, heat=8, so a program created before and
#: after 3.0.0 starts identically.
DEFAULT_CURVE_POINTS: Final = ((12.0, 5.0), (25.0, 15.0), (35.0, 23.0))
```

and use it in `_default_program`, replacing the `points = list(points_from_semantic(15, 8))` line and the `CONF_CURVE_POINTS` entry that consumed it:

```python
        const.CONF_CURVE: {
            const.CONF_CURVE_POINTS: [[temp, value] for temp, value in DEFAULT_CURVE_POINTS],
            const.CONF_CURVE_MIN: 1.0,
            const.CONF_CURVE_MAX: 60.0,
            const.CONF_CURVE_KIND: str(CurveKind.DURATION),
        },
```

`tests/components/test_services.py` already asserts a new program's default curve; confirm it still passes rather than editing it — if it fails, the literal is wrong.

Delete `engine/semantic.py` and `tests/engine/test_semantic.py`. Remove `set_simple_curve` from `services.yaml` and its strings from both translation files. Delete the tests in `tests/components/test_services.py` that exercise the removed service, saying in the commit message that the behaviour they pinned is what this release removes.

- [ ] **Step 5: Update the wire contract**

In `docs/design/card-contract.md`, remove `amount` / `heat` / `day_minutes` from the published cycle payload and `set_simple_curve` from the services, and state that the card now derives minutes from `curve.points` and `intensity_pct` itself.

- [ ] **Step 6: Run every gate**

Run:
```bash
pytest
ruff check . && ruff format --check .
mypy custom_components
grep -rn "semantic" custom_components/ tests/ card/src || echo "no semantic references remain"
```
Expected: suite green, gates clean, no straggling references.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: retire the semantic curve model

The two-number mapping existed to make a curve editable through two
sliders. With points editable directly it has no user, and keeping it
would keep a lossy second representation of every curve alive on both
sides of the wire. The tests that pinned set_simple_curve are removed
because the behaviour they encoded is the one this release replaces."
```

---

### Task 7: Pay the small debts the branch recorded

Each of these was found during Phase A, judged not to block that phase, and left with a note. None depends on the others.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`, `config_flow.py`, `translations/{en,it}.json`, `INSTRUCTIONS.md`, `docs/it/istruzioni.md`
- Test: `tests/components/test_services.py`

- [ ] **Step 1: Restore `import_config`'s error contract**

The v2 → v3 migration loop added in Phase A sits ABOVE the `try` that turns payload errors into a translated `ServiceValidationError`, so a hand-edited malformed backup now surfaces a raw `ValueError` / `TypeError` / `AttributeError` and Home Assistant shows "Unknown error occurred". Move the loop inside that `try` (or wrap it in its own `except Exception: raise _invalid_payload()`), and add a test:

```python
async def test_import_config_rejects_a_malformed_payload_cleanly(hass: HomeAssistant) -> None:
    """A hand-edited backup must produce a translated error, not a traceback."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    before = dict(entry.subentries[zone_id].data)
    payload = json.dumps({"options": dict(entry.options), "zones": {zone_id: {"cycles": "abc"}}})

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "import_config", {"payload": payload}, blocking=True
        )
    # Atomic: nothing written on the way to the error.
    assert dict(entry.subentries[zone_id].data) == before
```

- [ ] **Step 2: Bound curve point values**

Removing the config flow removed the only upper bound (1440 minutes) on a curve point's value. Now that the point editor is the authoring surface, add it back where the authoring happens — a `vol.Range(min=0, max=1440)` on the value of each point in `_SET_CURVE_SCHEMA`, with a test that a 5000-minute point is refused. Keep the clamps' own bounds as `services.yaml` already advertises them.

- [ ] **Step 3: Sweep the dead code**

Remove the module-level symbols in `config_flow.py` that nothing references — verify each with `grep -rn "<name>" custom_components/ tests/` before deleting — and the unused selector keys in both translation files (`copy_source`, `curve_source`, `trigger_kind`, `sun_event`, `curve_kind`, `notify_event`, `notify_priority`, `budget_action`), keeping the ones `config_flow.py` still uses (`month`, `weekday`, `stale_weather_policy`).

- [ ] **Step 4: Correct the stale instructions**

`INSTRUCTIONS.md` section 3 and its Italian mirror still list Safety, Restrictions, Notifications and the consumption budget as config-flow options; the options flow has offered only `engine_advanced` since 2.1.0. Point them at the panel.

- [ ] **Step 5: Run every gate**

Run: `pytest && ruff check . && ruff format --check . && mypy custom_components`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: import errors stay translated, curve values stay bounded

Also sweeps dead config-flow symbols and translation keys, and corrects
instructions that still describe options retired in 2.1.0."
```

---

### Task 8: Ship 3.0.0

**Files:**
- Modify: `custom_components/irrigation_maestro/manifest.json`, `CHANGELOG.md`, `MEMORY.md`, `README.md`

- [ ] **Step 1: Verify the whole branch**

Run:
```bash
pytest
ruff check . && ruff format --check .
mypy custom_components
cd card && npm run test && npm run typecheck && npm run build && cd ..
git diff --exit-code custom_components/irrigation_maestro/frontend/
```
Expected: everything green and the bundle already up to date — a non-empty diff here means a card task forgot to commit its build, and CI would have failed.

- [ ] **Step 2: Confirm the §8 regression is still untouched**

Run: `git diff main --stat -- tests/engine/test_curves.py tests/engine/test_weather.py`
Expected: `test_weather.py` unchanged; `test_curves.py` changed only by Phase A's added `TestInterpolate` class. A moved reference value stops the release.

- [ ] **Step 3: Bump the version**

Set `"version": "3.0.0"` in `custom_components/irrigation_maestro/manifest.json`.

- [ ] **Step 4: Complete the changelog**

Extend the existing `## 3.0.0` entry with what Phase B added — the point-based curve editor, duplicate and copy-curve in the panel — and move `set_simple_curve`'s removal and the removal of the derived `amount` / `heat` / `day_minutes` attributes from "not yet done" into the breaking list. Any automation calling `irrigation_maestro.set_simple_curve` breaks; say so plainly.

- [ ] **Step 5: Record the decisions**

In `MEMORY.md`, add: the card computes minutes from the curve and the intensity (no second representation on the wire); the editor's point model and why the semantic mapping was deleted rather than kept as a simplified mode; the intensity-reset notice as the honest surface for the backend's reset rule.

- [ ] **Step 6: Update the README's feature list**

It still describes the curve editor as two sliders. Describe what shipped.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "release: dashboard curve authoring (v3.0.0)"
```

---

## Notes for the executor

- **Do not reorder Tasks 1, 5 and 6.** The card must stop reading the derived values before the backend stops publishing them; every other ordering leaves a commit where the installed dashboard shows zeroes for every program.
- **Every card task ends with a rebuilt, committed bundle.** CI diffs it; a task that skips the build passes locally and fails on push.
- If a card change turns out to need a service the backend does not expose, stop and report it rather than widening a service's schema from the card side — Phase A's services were reviewed as a set.
