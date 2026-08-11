# Design — Live curve editor in the Lovelace card

Status: approved in brainstorming (2026-08-11), pending written-spec review.
Topic: make watering-curve configuration easy for non-expert users, with a
live, self-explanatory editor in the card.

## 1. Goal & non-goals

**Goal.** A non-expert can shape a zone-cycle's watering curve from the card
with two plain-language sliders and see, in real time, how many minutes it
will water — with a graph, worked examples, and "what it would do with today's
weather". Power users get an "Advanced" panel with safety limits and
draggable points.

**Why the card (not the config flow).** HA config flows are non-reactive
server-rendered forms: no live preview is possible. Live feedback while a
slider moves is only achievable in the custom Lit card, which is already part
of the integration.

**Non-goals (kept in the existing config flow, unchanged):**
- **Volume curves** (liters, needing a flow meter): advanced; edited in the
  zone reconfigure flow. The card editor is offered only for **duration**
  curves. A volume cycle shows a short "edit in settings" note instead.
- **Arbitrary N control points.** The card editor works with a fixed **3
  points** (cool / mild / hot). Curves needing more points remain editable as
  free text in the config flow.
- No change to how curves are stored or to the decision engine.

## 2. The semantic model (the heart of "easy")

Fixed anchor temperatures (constants, tunable in one place):
`COOL = 12 °C`, `MILD = 25 °C`, `HOT = 35 °C`.

Two semantic parameters the sliders expose:
- **amount `A`** — minutes at MILD (25 °C). UI range 3–45, integer.
- **heat `H`** — extra minutes at HOT (35 °C) vs MILD. UI range 0–30, integer.

**Generate 3 control points** (slope `H/10` min/°C, cool extrapolated down and
floored at 0 so the curve is always valid):
```
cool_v  = max(0, round(A - 1.3 * H))     # slope H/10 min/°C; A - slope*(25-12) = A - 1.3H
mild_v  = A
hot_v   = A + H
points  = [(12, cool_v), (25, mild_v), (35, hot_v)]
```
The engine already interpolates linearly between points and extrapolates flat
outside them, then applies the min/max clamps after the zone adjustment — no
engine change needed.

**Reverse fit** (opening an existing curve, incl. presets & custom):
```
A = round(curve_value_at(25))
H = round(curve_value_at(35) - curve_value_at(25))         # clamped to [0, 30]
A clamped to [3, 45]
```
The 3 editor points are seeded from the existing curve's interpolated values
at 12/25/35 so the graph faithfully shows the current curve on open. Existing
`min`/`max` are read from the curve and preserved.

**Clamps (min/max).** Shown only in Advanced. Defaults are **generous safety
rails**, not tight caps, so simple mode is never surprise-capped:
`min = 1`, `max = 120` — for a curve created fresh; when editing an existing
curve, its current min/max are kept until the user changes them. Advanced
users tighten them to real "never less / never more" limits.

**Interaction rules (Advanced draggable points).**
- Points sit at fixed temperatures (12/25/35). Dragging moves a point
  **vertically only** (minutes), so temperatures stay strictly increasing and
  the curve is always valid.
- Moving a **slider** regenerates all 3 points from `(A, H)` (overwriting any
  drag). Dragging a **point** edits that point's minutes directly and re-fits
  the sliders (`A ← mild point`, `H ← hot − mild`) so they keep showing a
  coarse handle. Simple, explainable: *sliders shape the whole curve; drag
  fine-tunes one point; moving a slider re-shapes.*

## 3. Save path

Two ways to persist, both landing in the existing per-cycle curve storage and
applied in-place with no reload:

- **Simple save** (sliders untouched-by-drag): call a **new service**
  `irrigation_maestro.set_simple_curve(zone_id, cycle_id, amount, heat,
  min_value?, max_value?)`. The server runs the *same* semantic formula
  (authoritative, tested Python) to generate the points and store them. Ranges
  are validated server-side. If `min_value`/`max_value` are omitted, the
  cycle's current clamps are kept (never silently reset).
- **Advanced save** (points were dragged): call the existing
  `irrigation_maestro.set_curve(zone_id, cycle_id, points, min_value,
  max_value)` with the exact 3 points.

Live preview is always client-side (TS), using a mirror of the same formula, so
**what you preview is what gets saved**. `set_simple_curve`'s Python formula and
the card's TS formula are kept in lockstep and guarded by parity tests
(§7).

`Cancel` discards local state and collapses the editor.

## 4. Where it lives in the card

Each cycle already appears in a zone's expanded detail with a read-only curve
sparkline. Add a **"Edit curve"** button next to it (duration cycles only).
Pressing it expands the editor inline for that cycle; `Save`/`Cancel` collapse
it. Volume cycles show the "edit in settings" note in place of the button.

Data the editor reads (all already exposed, see `docs/design/card-contract.md`):
- the cycle's current curve (`points`, `min`, `max`, `kind`) from the
  `zone_state` sensor's `cycles` attribute;
- the current **weighted temperature** from the `hub_weighted_temp` sensor for
  the "today" row. If it is unknown/unavailable, that row is simply hidden.

## 5. Components

**Python (integration)**
- `engine/semantic.py` — pure, HA-free, unit-tested reference:
  `ANCHORS = (12.0, 25.0, 35.0)`, `AMOUNT_RANGE = (3, 45)`,
  `HEAT_RANGE = (0, 30)`, `points_from_semantic(amount, heat)`,
  `semantic_from_curve(curve)`.
- `services.py` / `services.yaml` — new `set_simple_curve` service using
  `points_from_semantic`, then the same persistence path as `set_curve`
  (validate via `engine.curves.validate_points`, write the subentry cycle
  curve, in-place update). Range/`min>max`/unknown-zone-cycle errors raise
  `ServiceValidationError` with translation keys.
- `translations/en.json` + `it.json` — `services.set_simple_curve` name/desc/
  fields, plus any new exception keys.

**Card (`card/src/`)**
- `curve-editor.ts` — new Lit component: the two sliders, the live SVG graph
  (reusing the sparkline drawing), example chips, "today" row, Advanced panel
  (limits + draggable points), Save/Cancel. Emits service calls.
- `curve-math.ts` — TS mirror of the semantic formula + curve interpolation
  (extract the sparkline's value function here so editor and sparkline share
  it). Header comment points to `engine/semantic.py` as the reference.
- `zone-row.ts` — add the "Edit curve" affordance and host the editor.
- `localize/en.ts` + `it.ts` — new `editor.*` strings (§6).

## 6. Copy — every user-visible string (validate these)

Card strings (`editor.*` in the card dictionaries). **EN / IT:**

| Key | English | Italiano |
|---|---|---|
| editor.edit_curve | Edit curve | Modifica curva |
| editor.title | How much to water by temperature | Quanto irrigare in base al caldo |
| editor.amount.label | 💧 How much water | 💧 Quanta acqua |
| editor.amount.help | Watering minutes on a mild day (25°). This is the baseline everything else builds on. | Minuti di irrigazione in una giornata mite (25°). È la base: tutto il resto parte da qui. |
| editor.amount.value | {min} min at 25° | {min} min a 25° |
| editor.amount.low / high | little (3 min) / a lot (45 min) | poca (3 min) / tanta (45 min) |
| editor.heat.label | 🔥 How much more when it's hot | 🔥 Quanto di più quando fa caldo |
| editor.heat.help | Extra minutes on a hot day (35°) compared with a mild one. At 0 it waters the same regardless. | Minuti extra in una giornata calda (35°) rispetto a una mite. A 0 irriga sempre uguale. |
| editor.heat.value | +{min} min at 35° | +{min} min a 35° |
| editor.heat.low / high | same (+0) / much more (+30) | uguale (+0) / molto di più (+30) |
| editor.graph.caption | Live preview — watering minutes by temperature | Anteprima dal vivo — minuti di irrigazione secondo la temperatura |
| editor.graph.today | today {temp}° | oggi {temp}° |
| editor.example.cool / mild / hot | Cool · 12° / Mild · 25° / Hot · 35° | Fresco · 12° / Mite · 25° / Caldo · 35° |
| editor.today | 🌡️ With today's weather (weighted temperature {temp}°) it would water ≈ {min} min. | 🌡️ Con il meteo di oggi (temperatura pesata {temp}°) irrigherebbe ≈ {min} min. |
| editor.advanced.toggle | ▸ Advanced — limits and draggable points | ▸ Avanzate — limiti e punti trascinabili |
| editor.advanced.help | For precise control. You can ignore this — the defaults are fine. | Per chi vuole il controllo preciso. Puoi ignorarle: i valori predefiniti vanno bene. |
| editor.min.label / help | ⬇️ Never less than / Absolute minimum minutes, even when cold. | ⬇️ Mai meno di / Minuti minimi assoluti, anche col freddo. |
| editor.max.label / help | ⬆️ Never more than / Absolute maximum minutes, even in extreme heat. | ⬆️ Mai più di / Minuti massimi assoluti, anche col gran caldo. |
| editor.drag_hint | ✋ Drag the three points (up/down) to shape the curve by hand. | ✋ Trascina i tre punti (su/giù) per modellare la curva a mano. |
| editor.more_points | Need more than three points? Edit the full curve in the zone settings. | Ti servono più di tre punti? La curva completa si modifica nelle impostazioni della zona. |
| editor.save / cancel | Save / Cancel | Salva / Annulla |
| editor.saved | Curve updated. | Curva aggiornata. |
| editor.save_error | Couldn't save the curve: {error} | Non è stato possibile salvare la curva: {error} |
| editor.volume_note | This cycle uses a volume curve (liters). Edit it in the zone settings. | Questo ciclo usa una curva a volume (litri). Modificala nelle impostazioni della zona. |

Integration strings (`services.set_simple_curve` in translations). **EN / IT:**

| Key | English | Italiano |
|---|---|---|
| name | Set simple curve | Imposta curva semplice |
| description | Builds a duration curve from a base amount and a hot-day boost, then saves it to a cycle. | Costruisce una curva a durata da una quantità base e un incremento per i giorni caldi, poi la salva su un ciclo. |
| fields.zone_id | Zone / The zone owning the cycle. | Zona / La zona a cui appartiene il ciclo. |
| fields.cycle_id | Cycle / The cycle whose curve is set. | Ciclo / Il ciclo di cui impostare la curva. |
| fields.amount | Amount (min at 25°) / Watering minutes on a mild day. | Quanta acqua (min a 25°) / Minuti di irrigazione in una giornata mite. |
| fields.heat | Hot-day boost (extra min at 35°) / Extra minutes on a hot day vs a mild one. | Di più quando caldo (min extra a 35°) / Minuti extra in una giornata calda rispetto a una mite. |
| fields.min_value | Never less than (min) / Optional lower limit. | Mai meno di (min) / Limite inferiore facoltativo. |
| fields.max_value | Never more than (min) / Optional upper limit. | Mai più di (min) / Limite superiore facoltativo. |
| exceptions.amount_out_of_range | Amount must be between 3 and 45 minutes. | La quantità deve essere tra 3 e 45 minuti. |
| exceptions.heat_out_of_range | Hot-day boost must be between 0 and 30 minutes. | L'incremento per i giorni caldi deve essere tra 0 e 30 minuti. |

## 7. Testing

- **Python `tests/engine/test_semantic.py`**: `points_from_semantic` shape
  (cool ≤ mild ≤ hot for H ≥ 0), cool-floor at 0 for large H, endpoint values
  equal A and A+H; `semantic_from_curve` round-trips (A,H) → points → (A,H) and
  fits the built-in `preset_pots` to sensible (A,H); ranges enforced.
- **Python integration `tests/components/test_services.py`**: `set_simple_curve`
  stores the expected points on a cycle and the change applies in-place (no
  reload); validation errors for amount/heat out of range, `min > max`, unknown
  zone/cycle.
- **Card parity**: add a minimal vitest (`card/src/curve-math.test.ts`) with a
  handful of `(amount, heat)` cases whose expected points match the Python
  reference table, guarding TS↔Python drift. `npm run typecheck` + `npm run
  build` stay green; the committed bundle is rebuilt.
- No new HA APIs; hassfest/HACS unaffected.

## 8. Docs, versioning, rollout

- Update `docs/design/card-contract.md` (card now also calls `set_simple_curve`;
  editor reads `cycles` + `hub_weighted_temp`), `INSTRUCTIONS.md` +
  `docs/it/istruzioni.md` (a short "Editing curves from the card" section),
  README feature list, and `CHANGELOG.md`.
- No config-entry schema change → no migration.
- Version: bump `manifest.json` to **1.1.0** (new feature). On merge to main the
  existing CI release job cuts the GitHub release automatically.

## 9. Open risks

- TS↔Python formula drift → mitigated by the parity vitest and a single
  documented formula.
- Reverse-fit of an unusual custom curve into 2 sliders is lossy; acceptable
  because the graph is seeded from the real points and Advanced/points or the
  config flow remain available for exact shapes.
