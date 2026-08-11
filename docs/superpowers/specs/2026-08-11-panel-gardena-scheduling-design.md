# Irrigation Maestro — "Centralina" Scheduling Panel Design

**Status:** Approved design (brainstorm) — 2026-08-11
**Domain:** `irrigation_maestro`
**Supersedes/extends:** the live curve editor (`2026-08-11-card-live-curve-editor-design.md`), which becomes the *advanced* "reattività al caldo" control inside this panel.

**Goal:** Give zone scheduling the feel of a classic irrigation controller (Gardena-style) — pick the days, a start time, and a per-day duration — while the weather engine keeps adapting the minutes under the hood. Make it *reachable*: a dedicated sidebar panel replaces the "hunt for a buried card" experience.

**Architecture:** A hybrid split. The Home Assistant **config flow** keeps only what needs device/entity pickers (create the hub, create a zone + choose its valve). Everything about *when and how long to water* moves into a new **"Irrigazione" sidebar panel** built from the existing Lit card components. The panel reads program state from zone-sensor attributes and writes changes through a small set of new services that mutate the zone subentry in place (the pattern `_write_cycle_curve` already uses). The weather math is untouched; only the last mile — the per-cycle schedule gate and the duration source — changes, additively, so the §8 regression stays byte-identical.

**Tech stack:** Python 3.13 engine (pure, HA-free), HA config subentries + services, Lit 3 + TypeScript + Vite card/panel bundle, Vitest + pytest.

---

## Global Constraints

- **§8 regression is sacred.** The weighted-temperature, water-budget and skip-threshold math and the curve→duration path for *existing* curve-configured cycles must produce identical numbers (weighted 31.0 °C, budget 3.79 mm, threshold 4.5 mm, pots 32 min, lawn 15 min). New scheduling/duration behavior is strictly additive and only applies to programs that opt into it.
- **Backward compatible.** Every existing config keeps working with no user action and no data rewrite. New per-cycle fields are optional; absent → today's behavior exactly.
- **Card contract via `maestro_role`.** Discovery stays attribute-driven; new attributes are additive and the card degrades gracefully when they are absent (older backends).
- **CI stays green.** ruff, mypy strict, pytest, hassfest, HACS (non-blocking), card typecheck + vitest + build + bundle-in-sync.
- **Terminology:** user-facing "ciclo" → **"programma"** across card/panel/config-flow/services/docs. Internal keys (`CONF_CYCLES`, `cycle_id`, `CycleConfig`) are unchanged for compatibility.
- **Two anchors of trust:** never water for a guessed duration (a broken curve/program must fail loudly, not run), and never open a valve outside the SessionRunner.

---

## 0. Problem & diagnosis (why the user couldn't reach the screens)

The sliders/curve editor live **inside the Lovelace card** (`imc-curve-editor`, rendered inline two interactions deep: expand a zone → "Modifica curva"). The card auto-registers as a *resource* in storage-mode dashboards (`resources.py`) but is **never placed on a dashboard automatically** — the user must add "Irrigation Maestro Card" from the picker. Meanwhile scheduling (giorni/orari/intervallo) is edited in a **different place entirely**: Impostazioni → Dispositivi e servizi → Configura (the subentry options flow). Two homes for "configuration", one of them buried. This fragmentation is the root cause and the redesign's primary target.

**Fix:** one always-visible **sidebar panel** for the whole daily-use experience; the config flow shrinks to zone/valve creation.

---

## 1. UX design

Reference mockups (validated with the user): `.superpowers/brainstorm/71746-1786441509/content/{placement,program-editor,wizard-advanced}.html`.

### 1.1 The panel

- New sidebar entry **"Irrigazione"** (icon `mdi:sprinkler-variant`), full-page, always reachable.
- Header shows live context: current weighted temperature and water-budget status (from hub sensors).
- **Zone tabs** (Prato / Aiuole / Vasi / ＋). "＋" deep-links to the config flow's *add-zone* step (valve picker lives there).
- Under a zone: its **programmi**, each a card with the weekday chips, start time, and per-day durations; plus a per-program enable toggle (bound to the existing `CycleEnabledSwitch`), rename, delete, and "＋ Aggiungi programma".

### 1.2 The program editor (the heart)

Linear, top to bottom — a normal user touches only these three:

1. **Giorni** — seven weekday chips (Lun…Dom), tap to toggle. This is a *positive* schedule (the program runs on selected days).
2. **Orario di partenza** — segmented `Ora fissa · Alba · Tramonto`; fixed time shows a time picker, sun shows an offset (± minutes). Maps to the existing `CycleTrigger` (`time` / `sun`).
3. **Durata per giorno** — one `– min +` stepper per selected day, plus a **"Stessa durata per tutti i giorni"** toggle that collapses to a single stepper (the common case).

Below them:
- **Riga meteo (verde)** — makes the under-the-hood adaptation visible without asking anything: e.g. *"Oggi (mercoledì) fa caldo (32°): i 20′ diventano ≈ 24′. Se piove, salta."* Computed from the current weighted temp + the program's reactivity + skip logic.
- **▸ Impostazioni avanzate** — a single collapsible drawer (below).

### 1.3 New-program wizard (guided, safe defaults)

Three steps with sensible pre-filled values; the user can stop after step 3:
1. **Quando** — weekday chips + quick presets (Ogni giorno · Giorni alterni · Solo weekend). Default: every day.
2. **A che ora** — `Ora fissa · Alba · Tramonto`. Default: sunrise.
3. **Quanto** — one duration stepper (default seeded from the zone/preset), with a "Durata diversa per giorno" toggle. A "✓ Fatto" line previews today's weather-adjusted minutes.

New programs are created **already valid** (all days, sunrise, a reasonable default duration, moderate reactivity), so the wizard is confirm-and-tweak, never fill-from-empty.

### 1.4 Advanced drawer (all optional, sensible defaults)

Everything the engine already supports, hidden until wanted:
- **Reattività al caldo** — the existing `amount`/`heat` curve editor (`imc-curve-editor`), reused verbatim as the per-program weather-response control. Default: moderate.
- **Minuti minimi / massimi** — the curve `min_value` / `max_value` clamps.
- **Soglia salta-pioggia** — surfaced from the engine budget/threshold settings (read-only context + link to hub engine options for global tuning).
- **Ammollo (cicli e pause)** — `soak_max_run_min` / `soak_pause_min`.
- **Mesi di stagione · intervallo minimo** — `months_override` / zone `interval_days`.
- **Modalità volume (litri)** — volume curve + `volume_safety_timeout_min` (unchanged; per-day minutes UI hidden in volume mode).

---

## 2. Data model & backward compatibility

### 2.1 New per-cycle (per-program) fields

Two optional keys added to each cycle dict in the zone subentry (`const.py`):

| Const | Key | Type | Meaning |
|---|---|---|---|
| `CONF_CYCLE_DAYS` | `days` | `list[int]` (0=Mon…6=Sun) | Weekdays the program runs. **Absent/empty ⇒ every day** (today's behavior). |
| `CONF_CYCLE_DAY_MINUTES` | `day_minutes` | `dict[str,int]` keyed by weekday int-as-string | Per-day base minutes (minutes on a *mild* 25 °C day). Absent ⇒ use the curve as-is for all days. A weekday not present in the map ⇒ fall back to the curve **as-is** (the legacy heat-adjusted path — *not* a flat mild value). |

**No other new persisted fields.** Uniform base minutes and the heat response continue to live in the existing `curve` (its 25 °C anchor is the base; the 35 °C−25 °C delta is the reactivity). This maximizes reuse of `engine/semantic.py` and keeps storage stable.

`CycleConfig` (models.py) gains `days: frozenset[int] | None` and `day_minutes: dict[int, int]` (parsed from the two keys); `CycleSpec` (planner) gains the same so the engine can see them. `to_spec` forwards them.

### 2.2 How the friendly model maps to the curve (reuse, not rewrite)

- **Base minutes** for a day = `day_minutes[weekday]` if present, else `curve_value(curve, 25 °C)`.
- **Reactivity / heat delta** = `round(curve_value(curve, 35 °C) − curve_value(curve, 25 °C))` — the same quantity `semantic_from_curve` already computes as `heat`.
- **Effective curve for the day** = `points_from_semantic(amount=base_minutes, heat=heat_delta)` with the program's existing `min_value`/`max_value`, evaluated by the untouched `curve_value`. This is exactly the semantic mapping the card already mirrors in TS.

Writing from the panel: setting a uniform duration writes the curve's amount (`set_simple_curve` amount, preserving heat); enabling per-day writes `day_minutes`; editing reactivity writes the curve `heat` (`set_simple_curve`) or full points (`set_curve`, advanced).

### 2.3 Migration

Zero data migration required. Existing cycles have no `days`/`day_minutes` ⇒ engine takes the legacy curve path ⇒ identical output (§8 safe). When the panel opens an existing program it derives `(amount, heat)` via `semantic_from_curve` to seed the sliders and reads the trigger for the start time — read-only derivation, no write until the user changes something.

### 2.4 `interval_days` and weekday scheduling coexist

`interval_days` (zone cadence, "al massimo ogni N giorni") stays as an **advanced** knob. A program with an explicit `days` schedule is gated by weekday first; `interval_days` still applies as an additional zone-level "not more often than" guard (default 3 preserves current behavior for day-less programs). The panel's simple view does not show `interval_days`; it lives in Advanced.

---

## 3. Engine changes (additive, §8-preserving)

Two surgical changes, both guarded so legacy cycles are untouched.

### 3.1 Positive weekday gate (per program)

Add `SkipReason.DAY_NOT_SCHEDULED`. In `build_session_plan`'s per-cycle loop (planner.py), before the season check, add:

```
elif cycle.days is not None and now.weekday() not in cycle.days:
    reason = SkipReason.DAY_NOT_SCHEDULED
```

`cycle.days is None` (day-less program) ⇒ no gate ⇒ current behavior. This is per-*cycle* (each program has its own days), so it must live in the cycle loop, not `_zone_gate`. `ZoneNextRunSensor` and the runtime trigger scheduler (`runtime._schedule_cycle`) keep arming daily; the handler simply skips non-scheduled weekdays (the plan already reports the reason). Optionally, `next_allowed_start`-style weekday awareness can refine "prossimo avvio", but the correctness gate is the planner skip.

**Notification hygiene (must-do):** add `DAY_NOT_SCHEDULED` to `engine/model.py`'s `_SILENT_REASONS`. Triggers arm **daily**, and any non-silent skip buffers a persistent notification (`runtime._flush_skip_notices`), so a weekend-only program would otherwise emit a "Skipped (day_not_scheduled)" notice on all five off days. `NOT_DUE` and `OUT_OF_SEASON` are already silent — this reason belongs with them.

### 3.2 Per-day duration source

Extract a shared helper `resolve_day_curve(cycle, weekday) -> Curve` and call it from `_cycle_target` (planner.py) instead of using `cycle.curve` directly:

```
_COOL, _MILD, _HOT = semantic.ANCHORS  # 12 / 25 / 35 — never hardcode

def resolve_day_curve(cycle, weekday):
    if (cycle.curve.kind is not CurveKind.VOLUME          # volume ignores per-day minutes
            and cycle.day_minutes
            and (base := cycle.day_minutes.get(weekday)) is not None):
        heat = round(curve_value(cycle.curve, _HOT) - curve_value(cycle.curve, _MILD))
        return Curve(points=points_from_semantic(base, heat),
                     min_value=cycle.curve.min_value,
                     max_value=cycle.curve.max_value,
                     kind=cycle.curve.kind)
    return cycle.curve                                    # legacy path — §8 unchanged

# in _cycle_target:
value = curve_value(resolve_day_curve(cycle, now.weekday()), weighted_temp, zone.adjustment_pct)
```

`_cycle_target` gains the weekday (derived from `now`, which its only caller `build_session_plan` already holds — **no caller signature churn beyond passing it down**). The `duration_factor`, soak split, truncation and min/max clamp all stay downstream, unchanged. The `_HOT`/`_MILD` anchors come from `semantic.ANCHORS`, never hardcoded literals.

### 3.3 Manual runs must honor per-day minutes

`runtime._manual_run` computes its duration **independently** of `_cycle_target` (`curve_value(cycle.curve, …)` directly), so it does *not* pick up `day_minutes` for free. Patch it to call the same `resolve_day_curve(cycle, now.weekday())` helper, so tapping "Avvia ora" on Tuesday uses Tuesday's minutes. (Manual runs deliberately bypass the decision *gates* — the weekday *gate* does not apply to a manual run; only the duration *resolver* is shared.)

### 3.4 §8 protection

The §8 golden numbers are **not one test** — they live across four files, all on code paths this design does not touch: `tests/engine/test_evaluate.py` (weighted 31.0 / budget 3.79 / threshold 4.5), `tests/engine/test_curves.py` and `tests/engine/test_weather.py` (lawn 15, `curve_value`), and `tests/engine/test_planner.py` (pots 32, the legacy planner branch). Existing fixtures build day-less, `day_minutes`-less cycles ⇒ `resolve_day_curve` returns `cycle.curve` and the weekday gate never fires ⇒ identical results. **The new `CycleConfig`/`CycleSpec` fields must ship with defaults** (`days: frozenset[int] | None = None`, `day_minutes: dict[int,int] = field(default_factory=dict)`) or every existing constructor/fixture breaks. Extend `test_planner.py` with day-less assertions; never edit any expected number.

---

## 4. Frontend ↔ backend contract

### 4.1 Read: zone-sensor attributes (additive)

`ZoneStateSensor`'s `cycles` attribute list already carries each cycle's `trigger` and curve `points`. Add per entry: `days` (list[int] or null), `day_minutes` (map or null), and the derived `amount`/`heat` (via `semantic_from_curve`) for convenience. Absent on older backends ⇒ panel falls back to "every day" + curve. `discovery.ts` gains typed readers. The new skip reason needs a card string: add `reason.day_not_scheduled` to `card/src/types.ts` (`REASON_KEYS`) + `localize/en.ts` + `it.ts`, else the panel renders the raw key (the backend does not translate reasons; notifications use the raw string, which is fine).

### 4.2 Write: new services (mutate the subentry in place, no reload)

All follow the existing in-place subentry-update pattern (`services._write_cycle_curve` + `runtime.async_config_updated`, which reconciles cycle entities without a reload). Existing `set_curve` / `set_simple_curve` are reused for reactivity/advanced curve edits.

| Service | Fields | Effect |
|---|---|---|
| `add_program` | `zone_id`, `name?`, `copy_from?` | Append a new cycle with safe defaults (all days, sunrise, default duration+reactivity); **response** `{program_id}`. |
| `remove_program` | `zone_id`, `program_id` | Remove the cycle (guard: a zone keeps ≥1 program). |
| `rename_program` | `zone_id`, `program_id`, `name` | Rename. |
| `set_program_schedule` | `zone_id`, `program_id`, `days:list[int]`, `start:{kind, at? , event?, offset_min?}` | Write weekday set + trigger. |
| `set_program_minutes` | `zone_id`, `program_id`, `minutes?:int` \| `day_minutes?:map` | Uniform base (updates curve amount, preserves heat) or per-day map. |

Volume guard from `set_simple_curve` applies (`set_program_minutes` rejects on volume programs, error `simple_curve_on_volume`). All services validate through the typed models before persisting (never store an invalid program). `services.yaml` documents each with clear IT/EN field help; a shared `_load_zone_subentry` / `_write_cycle_field` helper keeps it DRY.

### 4.3 The card stays

`imc-curve-editor`, `curve-math.ts`, `zone-row.ts` are reused by the panel. The dashboard card remains available (unchanged contract) for users who prefer an embedded widget; the panel is the primary, discoverable home.

---

## 5. Sidebar panel registration

- A new frontend entry `irrigation-maestro-panel.js` (built by the same Vite pipeline, bundled into `frontend/`) defines a Lit element `<irrigation-maestro-panel>` receiving `hass`, `narrow`, `route`, `panel`; it composes the existing zone/program/editor components full-page. Add a `PANEL_FILENAME` const in `const.py` mirroring the existing `CARD_FILENAME`.
- Registered during `async_setup_entry` via `frontend.async_register_panel(hass, ...)` / `panel_custom` — sidebar title "Irrigazione", `mdi:sprinkler-variant`, module URL under `FRONTEND_URL_BASE`, `require_admin=False`. Registration is idempotent (guard like `_REGISTERED_KEY`) and unregisters on unload. Add `"frontend"` to the manifest `dependencies` (currently `["http","lovelace"]`) so the panel API is guaranteed loaded.
- Static path serving already exists (`resources.py`, idempotent via `_REGISTERED_KEY`); the panel JS is served the same way. Works in both storage and YAML modes because it does not depend on Lovelace resource auto-registration. There is no enforced HA version floor in the repo today (manifest has no `homeassistant` key), so Phase B must verify `async_register_panel` against the supported range and degrade to "add the card manually" if a panel cannot be registered.

---

## 6. Terminology

User-facing rename **ciclo → programma** (and "curva" stays "curva", now under Avanzate as "reattività al caldo"). Applies to: card + panel localize keys (en/it), `services.yaml` names/descriptions, config-flow step labels, and docs. Internal identifiers (`cycle_id`, `CONF_CYCLES`, `CycleConfig`, service ids that already shipped like `set_curve`) are unchanged to avoid breaking existing automations and stored data.

---

## 7. Copy (key labels, IT / EN)

| Context | IT | EN |
|---|---|---|
| Panel title | Irrigazione | Irrigation |
| Program section | Programmi | Programs |
| Add program | Aggiungi programma | Add program |
| Step 1 | In che giorni? | Which days? |
| Presets | Ogni giorno · Giorni alterni · Solo weekend | Every day · Alternate days · Weekends |
| Step 2 | Quando parte? | When does it start? |
| Start kinds | Ora fissa · Alba · Tramonto | Fixed time · Sunrise · Sunset |
| Step 3 | Per quanto tempo? | For how long? |
| Per-day toggle | Durata diversa per giorno | Different duration per day |
| Same-for-all | Stessa durata per tutti i giorni | Same duration every day |
| Weather line | Oggi (…) fa caldo (…°): i …′ diventano ≈ …′. Se piove, salta. | Today (…) is hot (…°): …′ becomes ≈ …′. Skips if it rains. |
| Advanced header | Impostazioni avanzate | Advanced settings |
| Reactivity | Reattività al caldo | Heat response |
| Min/Max | Minuti minimi / massimi | Minimum / maximum minutes |

---

## 8. Testing strategy

- **Engine (pytest, pure):** new tests for the weekday gate (`DAY_NOT_SCHEDULED` when today ∉ days; runs when day-less), and for per-day duration (a `day_minutes` weekday yields `points_from_semantic(base, heat)` output; a missing weekday falls back to the curve). Reactivity default verified against a golden case.
- **§8 golden — unchanged.** Assert the existing weighted/budget/threshold/pots/lawn numbers still reproduce with day-less preset cycles. Never edit its expected values.
- **Services:** each new service mutates the subentry, persists valid models, reconciles entities without reload; volume guard on `set_program_minutes`; `remove_program` refuses the last program.
- **Migration:** an existing curve cycle read by the panel derives `(amount, heat)`, exposes `days=null`, and runs identically before any edit.
- **Card/panel (Vitest + typecheck):** schedule-model helpers (weekday set ↔ chips, per-day map ↔ steppers), the TS↔PY semantic parity test still green, panel renders zones/programs, bundle in sync (`irrigation-maestro-card.js` + new `irrigation-maestro-panel.js`).
- **hassfest / HACS / CI** all green; version bump to 1.2.0.

---

## 9. Implementation phases

The design is one feature but ships as **two dependent plans**, each producing working, testable software:

- **Phase A — Backend & contract.** `days` + `day_minutes` model (with defaults), engine weekday gate (`DAY_NOT_SCHEDULED` added to `_SILENT_REASONS`), shared `resolve_day_curve` used by both the planner and `runtime._manual_run`, new services, sensor attributes, terminology in services/docs, tests. Fully usable via services/YAML and the *existing* card before any panel exists. §8 intact.
- **Phase B — Panel & Gardena UX.** Sidebar panel registration (`PANEL_FILENAME`, manifest `frontend` dep), panel Lit shell, weekly-grid program editor, wizard, advanced drawer, per-day duration UI, the `reason.day_not_scheduled` card string, localize, bundle, docs. Consumes Phase A.

`writing-plans` produces the Phase A plan first; Phase B follows once A is green.

---

## 10. Out of scope (YAGNI)

- Multiple *simultaneous* start times inside one program (the user chose "programmi multipli liberi" — a second daily watering is a second program, not intra-program complexity).
- Per-day *start times* (only per-day durations were requested); one start time per program. Revisit only if asked.
- Drag-and-drop program reordering in the panel (zone `order` already exists via a number entity; keep it in Advanced).
- Rewriting the dashboard card or changing its shipped contract.
- Any change to the weather math, safety state machine, or SessionRunner.

---

## 11. Risks & open questions

- **Panel registration API surface.** `frontend.async_register_panel` / `panel_custom` for a custom Lit element is well-trodden but version-sensitive; Phase B must verify against the supported HA range (2025.7+) and degrade to "add the card manually" if a panel cannot be registered.
- **Reactivity semantics for per-day base.** We preserve the *absolute* heat delta (35°−25° minutes) across per-day bases. For very small bases the cool anchor floors at 0 (already handled by `points_from_semantic`). Confirm this reads naturally in the weather line; a proportional option is a possible future toggle, not v1.
- **Duration-path ripple (corrected).** `_cycle_target`'s *only* caller is `build_session_plan`, which already holds `now` — so there is no cross-module signature churn from the planner change. The real, easy-to-miss ripple is `runtime._manual_run`, which computes duration **independently** of `_cycle_target`; it must be patched to share `resolve_day_curve` (§3.4) or per-day minutes silently won't apply to `run_zone`/`run_all`. The `evaluate` service reaches the new logic only through `build_session_plan`, so it needs no change.
- **Per-day override on a preset changes its shape.** Rebuilding a day curve from `(base, heat)` uses the 12/25/35 anchors, so a per-day POTS program loses the preset's own ramp to the 55-min cap at 42.5 °C (it becomes flat beyond 35 °C). Intended for the friendly amount+heat model; documented so it is not mistaken for a regression. Presets used without per-day minutes are untouched.
- **"＋ zona" deep-link** from the panel into the config flow depends on HA's config-flow deep-link URL; if unavailable, fall back to an instruction + button that opens the integration page.
