# Dashboard curve authoring — design

Date: 2026-08-13
Status: approved for planning
Target: v3.0.0 (breaking: a service is removed, minutes change meaning,
zone/program configuration leaves the config flow, storage migrates v2 -> v3)

## Problem

Zones and programs are configured in two places that write differently, and
the dashboard's curve editor cannot express the curves the field-validated
system actually uses.

Confirmed on v2.1.1:

1. **The curve editor has exactly two numbers.** `engine/semantic.py` maps
   them onto three fixed anchors at 12/25/35 °C: `amount` is minutes at 25 °C
   (3–45), `heat` is the extra minutes at 35 °C (0–30), and the cold anchor is
   derived as `max(0, round(amount - 1.3 * heat))`. A curve with an
   independent floor, an anchor outside 12–35 °C, or any slope above 35 °C is
   unreachable. `PRESET_POTS` (`t + max(0, t-30)`, clamped 10–55) is precisely
   such a curve: above 37 °C the editor is flat where the real curve still
   climbs, and in the cold it falls to 0 where the real curve floors at 10.
2. **Every dashboard-authored curve starts at `(12, 0)`,** because the derived
   cold anchor hits zero as soon as `heat` is large relative to `amount`. The
   user never chose that point; the formula imposed it.
3. **The preset reference is destroyed in silence.** A curve chosen as a
   preset is stored as a reference, `{"template": "preset_pots"}`
   (`config_flow.py:1047`, `models.py:72`). `_write_cycle_curve`
   (`services.py:612`) rebuilds the curve dict from scratch as
   `{points, min_value, max_value, kind}` and never carries the `template`
   key forward. So `set_simple_curve`, `set_curve`, **and the quick minutes
   control** `set_program_minutes` (`services.py:799`, which re-reads `heat`
   from the curve and rewrites the points) each replace the reference with
   materialised points, without a word.
4. **The user cannot notice.** The card renders two plausible numbers because
   `semantic_from_curve()` reduces any curve to `amount`/`heat`. On
   `PRESET_POTS` it returns `(25, 15)`, which looks right but has lost the
   floor, the knee and the ceiling.
5. **The engine imposes the three-point limit too.** `resolve_day_curve`
   (`engine/planner.py:56`) discards the configured curve and rebuilds a
   three-anchor one from the semantic model whenever per-day minutes are set.
   A six-point curve silently becomes a three-point one at evaluation time.

Nothing in the data model requires three points: `Curve.points` is a tuple of
any length and `validate_points` has no maximum. The limit exists only in the
card's semantic editor and in `resolve_day_curve`.

The root cause is the same one that produced the v1.3.3 and v2.0.0 defects:
two surfaces write the same data with different conventions, and the lossy one
wins silently.

## Goals

- A program's curve is authored freely from the dashboard: any number of
  control points, explicit clamps, explicit kind.
- One storage form for a curve, so nothing can be silently converted into
  anything else.
- No non-curve operation (rename, schedule, calendar, soak, minutes) can alter
  the curve.
- Duplicating a program and copying a curve are one-click operations.
- Zones and programs are configured in exactly one place: the panel.

## Non-goals

- The weather decision engine — weights, thresholds, water budget, forecast
  credit, weighted temperature, immediate skips — is field-validated and out of
  scope. `engine/weather.py`, `engine/evaluate.py` and `engine/history.py` are
  not touched.
- The control points of `PRESET_POTS` and `PRESET_LAWN` are not modified: they
  reproduce the source system's §8 formulas exactly.
- Runtime operations (run now, pause, skip today, suspend) stay in the card.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | A curve is stored in **one form only**: `points` + `min` + `max` + `kind`. | Two forms are what allowed one to be silently converted into the other. With one form there is no reference left to lose. |
| D2 | Presets disappear from the **user interface**, not from the engine. `PRESET_POTS`/`PRESET_LAWN` stay as §8 reference constants. | Zones and programs are authored in the dashboard now; a fixed catalogue adds nothing. The engine regression tests depend on the constants. |
| D3 | `resolve_curve` keeps resolving `{"template": ...}`. | `import_config` must still accept a payload exported by a 2.x install. |
| D4 | Migration v2 -> v3 **materialises** every stored template reference into explicit points. | Lossless (the points are exactly the preset's), idempotent, and it leaves a single convention in user data. |
| D5 | The semantic `amount`/`heat` model is **deleted**, not kept as a mode. | Applied to a six-point curve it regenerates three anchors — the exact destruction this work removes. Deleting both sides also settles the "keep Python and TypeScript aligned" constraint. |
| D6 | The quick minutes control stores an **intensity percentage**, and never writes the curve. | It scales any curve with any number of points instead of regenerating one. See "Why a percentage". |
| D7 | Per-day minutes become **per-day intensity**, replacing `resolve_day_curve`. | Same mechanism, one level down; removes the engine's only three-point constraint. |
| D8 | `duplicate_program` into a zone without a flow meter, with a `volume` curve, is **refused**. | Same guard the config flow already applies (`volume_requires_flow`). Silent degradation into a timed run is exactly the class of surprise this work removes. |
| D9 | The zone subentry flow is **removed entirely**; the panel creates the first zone. | A parallel surface that writes differently is what produced the lost preset. The panel already creates a zone from its empty state (shipped in 1.3.0). |
| D10 | `add_zone` always writes `order` and `adjustment_pct` explicitly. | One documented convention, on the service side, now that the service is the only path. |
| D11 | Version **3.0.0**. | A public service is removed, minutes change meaning, the configuration surface moves, storage migrates. |

### Why a percentage and not a target in minutes

The quick control asks the user for minutes but stores a percentage.

Storing the target in minutes would make curve editing look ignored: with a
stored target of "20 minutes at 25 °C", any edit to the curve would be undone
at 25 °C, because the target pins the value there. Storing the factor instead
means an edit to the curve visibly changes the delivered minutes, and the
intensity remains an independent, reversible knob: *this is the shape I drew,
at this strength*.

### Why the clamps do not scale

`min_value` and `max_value` are safety guards the user set deliberately — a
10-minute floor for pots, a 55-minute ceiling for the line. Scaling them with
the intensity would silently move the guard along with the thing it guards.
They stay absolute, applied after the intensity, exactly as `curve_value`
already applies them after the zone adjustment.

## Model

### Curve

Unchanged on disk except that the `template` key no longer occurs in migrated
user data:

```
curve: { points: [[t, v], ...], min: float, max: float, kind: "duration"|"volume" }
```

`validate_points` remains the single validation authority: non-empty, strictly
increasing temperatures, values >= 0, clamps not inverted.

### Intensity

Two new program keys, both percentages, default 100:

- `intensity_pct: float` — uniform scale for the program.
- `day_intensity_pct: dict[str, float]` — per weekday (`"0"`–`"6"`), overriding
  the uniform value for that day only.

They replace `day_minutes` (absolute minutes per weekday), which is migrated
and then dropped.

The reference temperature for converting minutes to a percentage is **25 °C**,
the same mild anchor the old semantic model used, so the number the user types
keeps meaning what it meant.

## Engine changes

Confined to `engine/planner.py`, plus one behaviour-preserving extraction in
`engine/curves.py`.

1. **`resolve_day_curve` is deleted.** It was the only place that rebuilt a
   curve from three anchors.
2. **`_cycle_target` folds the intensity into the adjustment it already
   passes**:

   ```
   factor = cycle.day_intensity_pct.get(weekday, cycle.intensity_pct)
   value  = curve_value(cycle.curve, weighted_temp, zone.adjustment_pct * factor / 100.0)
   ```

   `curve_value` already multiplies by the adjustment before applying the
   clamps, so the ordering (curve -> zone adjustment -> intensity -> clamps) is
   the existing contract with one more factor in it. `engine/curves.py`'s
   arithmetic is unchanged.
3. **`interpolate(points, temp_c)` is extracted** from `curve_value` in
   `engine/curves.py` and re-used by it, so `curve_value` keeps its exact
   current behaviour. Services need the *unclamped* value at 25 °C to compute
   an intensity that actually hits the requested minutes: with a floor of 10
   and a raw value of 8, deriving the factor from the clamped value would ask
   for 200 % and deliver 16 minutes instead of 20. This is the only edit to
   `engine/curves.py`; the §8 regression tests must stay green unchanged.

`CycleSpec` gains `intensity_pct` and `day_intensity_pct` and loses
`day_minutes`.

## Migration v2 -> v3

In `migration.py`, driven from `async_migrate_entry` (`__init__.py:86`, whose
`entry.version > 2` refusal moves to `> 3`). Idempotent, in this order per
program:

1. **Materialise the curve.** `{"template": X}` becomes the explicit points,
   clamps and kind of `X`, resolved through `resolve_curve` against the
   built-in presets and the hub templates. A program already holding points is
   left untouched. An unresolvable template is left as-is and reported as a
   repair issue rather than guessed at.
2. **Convert per-day minutes.** For each entry of `day_minutes`,
   `day_intensity_pct[d] = 100 * minutes / interpolate(points, 25.0)`, then
   `day_minutes` is dropped. Runs after step 1 so the points always exist.
   If the raw value at 25 °C is 0 the factor is undefined: the entry is
   dropped and reported as a repair issue.
3. `intensity_pct` is not written by the migration; its absence reads as 100.

Then the entry is updated to `version=3, minor_version=0`, and
`IrrigationMaestroConfigFlow.VERSION` (`config_flow.py:212`) becomes 3 so a
freshly created entry is not immediately a migration candidate.

Declared behaviour change: per-day minutes now scale the whole curve
proportionally, where before they rebuilt three anchors keeping the absolute
heat delta. For a three-anchor curve the mild value is identical and the hot
value changes; this is the point of the change and it is covered by tests and
stated in the changelog.

## Services

**New**

- `duplicate_program(zone_id, program_id, target_zone_id?, name?)` — deep-copies
  the program, assigns a fresh `uuid4().hex[:8]` id, and appends it to the
  target zone (default: the same zone). The service copies configuration only
  and never touches the store, so no runtime state follows the duplicate:
  `last_completed` is keyed `zone_id:program_id` (`storage.py:134`) and
  `outcome_log` `zone_id:cycle_id` per day (`storage.py:195`), both of which a
  fresh id misses. `last_outcome` is keyed by **zone alone**
  (`storage.py:172`), so there is no program-level record to inherit; a
  duplicate in the same zone simply shares that zone's last outcome, which is
  what a zone-scoped record means. Default name `"<name> (copy)"`, with an incrementing
  suffix while it collides with a program in the target zone. A `volume` curve
  landing in a zone without a usable flow meter is refused with
  `volume_requires_flow`. Returns `{"program_id": ...}`.
- `copy_curve(source_zone_id, source_program_id, zone_id, program_id)` — copies
  `points`, `min`, `max` and `kind` only. Schedule, calendar, soak, name,
  enablement and intensity are untouched: intensity is the program's strength,
  not its shape.

**Changed**

- `set_curve` gains `kind` (`duration`|`volume`), guarded by
  `volume_requires_flow`. Without it, once the config flow is gone there is no
  way left to create a volume program.
- `set_program_minutes` no longer writes the curve. `minutes` becomes
  `intensity_pct = 100 * minutes / interpolate(points, 25.0)`; `day_minutes`
  becomes `day_intensity_pct` the same way. A raw value of 0 at 25 °C is
  refused with `cannot_scale_zero_curve` — a flat-zero curve cannot be scaled
  into anything.
- `add_zone` writes `order = max(existing) + 1` and an explicit
  `adjustment_pct`, so a new zone lands at the end of the sequence instead of
  tying with every other zone.

**Removed**

- `set_simple_curve`, together with `engine/semantic.py`, its tests, the
  semantic half of `card/src/curve-math.ts`, and the `amount`/`heat` attributes
  of the zone sensor (documented in `docs/design/card-contract.md`).

Every new service is declared in `services.yaml` **and** registered in the
block at `services.py:1225` — two separate edits.

## Surfaces

### Curve editor (card + panel)

`imc-curve-editor` is rewritten around points instead of sliders:

- a point list — temperature and value per row, add and remove, kept sorted by
  temperature;
- drag on the graph for the value, as today, now for any point;
- explicit `min` and `max` fields;
- a `kind` selector, with `volume` offered only when the zone has a usable flow
  meter;
- a preview reading the resulting curve at 5/12/20/25/30/35/40 °C, plus the
  current weighted-temperature marker already implemented;
- a badge showing the active intensity when it is not 100 %, with a control to
  reset it — so a scaled program never looks like an unscaled one.

Client-side validation mirrors `validate_points`. The services validate again
before writing (`_validate_program` and the checks in `set_curve` both run
before `_write_cycle_curve`), so an invalid edit produces a localised message
and no partial write.

`duplicate_program` appears as an action on the program; `copy_curve` as
"copy curve from…" on the destination program, its source list built the way
`_copy_candidates()` builds it — zone title and program name across all zones.

### Predicted minutes on the card

`card/src/schedule-math.ts` computes the minutes shown next to each program
from `amount`, `heat` and `day_minutes` (`dayBase`, `effectiveMinutes`) — a
third re-implementation of the curve arithmetic, and a lossy one, since it
reads the same three-anchor reduction the sensor publishes. With the semantic
model gone it is rewritten to evaluate the real curve through the existing
`curveValue` and apply the intensity, so the predicted figure comes from the
same points the engine uses. `day_minutes` occurs in about twenty files
(sensor, runtime, models, planner, `const`, the panel program editor and list,
`discovery.ts`, both localisations, and their tests); the rename is mechanical
but wide, and each site is either converted to intensity or deleted.

### Config flow

`ZoneSubentryFlowHandler` is removed in full: zone creation, zone reconfigure,
the cycle loop, and the curve source/custom/copy steps. What remains is hub
setup (weather sources and the entities the hub needs) and the
`engine_advanced` options step.

The first zone is created **from the panel**, whose empty state already calls
`add_zone` (`panel.ts:626`, shipped in 1.3.0). Keeping a config-flow path for
the first zone would re-create the parallel surface this work exists to
remove; the fallback when the panel cannot load is `add_zone` from Developer
Tools, the same rationale accepted in 2.1.0.

`config_subentries` translations are removed from `en.json` and `it.json`.

**To verify during implementation:** how Home Assistant treats existing
subentries whose type is no longer returned by
`async_get_supported_subentry_types`. If entry loading is affected, the
fallback is to keep the type registered while removing every flow step, which
preserves the outcome (no parallel editing surface) at the cost of one dead
registration.

## Testing

Beyond keeping the existing suite green:

- **Non-curve operations preserve the curve.** Rename, schedule change,
  calendar change and minutes change on a program leave `curve` byte-identical
  — the regression that motivates this work.
- **Migration.** A stored `{"template": "preset_pots"}` becomes exactly
  `PRESET_POTS`'s points, clamps and kind; running the migration twice changes
  nothing; an unresolvable template is reported, not guessed.
- **Per-day conversion.** `day_minutes` becomes an equivalent
  `day_intensity_pct`; a zero-valued curve at 25 °C is reported rather than
  divided by.
- **Intensity.** `set_program_minutes(minutes=N)` makes the planner deliver N
  minutes at 25 °C for a curve whose raw value there is below its floor
  (the clamped-reference trap); a six-point curve keeps six points after the
  call; intensity composes with the zone adjustment in the documented order.
- **`duplicate_program`.** Fresh id; no `last_completed`, `last_outcome` or
  `outcome_log` inherited; curve copied exactly; name does not collide;
  cross-zone duplication works; a `volume` curve into a meterless zone is
  refused with the documented error.
- **`copy_curve`.** Only the curve changes; schedule, calendar, soak, name and
  intensity are untouched.
- **Point editing.** Non-increasing temperatures, a negative value and
  inverted clamps each produce a comprehensible error and no partial write.
- **Round-trip.** `export_config` / `import_config` with a v3 payload, and
  with a legacy payload still holding a template reference.
- **§8 regression unchanged.** The engine tests that pin the reference values
  (`test_curves.py`, `test_weather.py`, `test_planner.py`) pass without
  modification.

Tests that encoded the old behaviour — the semantic mapping, the three-anchor
rebuild, minutes rewriting the curve — are deleted or rewritten, with the
commit message explaining why the encoded behaviour was wrong.

## Rollout

Single release, v3.0.0. `manifest.json` bumped, `CHANGELOG.md` updated with
the breaking changes stated plainly: `set_simple_curve` removed, per-day
minutes rescale the curve instead of rebuilding it, zone and program
configuration moved to the panel, storage migrated on first load.

The pull request states, as the brief requires: where first-zone creation
ended up and why (panel, D9); the zone defaults convention (D10); that the
quick minutes control changed semantics (D6, D7); and what remains reachable
only from Settings (weather sources, engine parameters) versus only from the
dashboard (everything about zones and programs).
