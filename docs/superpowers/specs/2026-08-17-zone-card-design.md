# The zone card — design

**Date**: 2026-08-17
**Branch**: `feat/zone-card`, from `main` at 3.6.0. **Version**: 3.7.0.
**Scope**: `irrigation-maestro-zone-card` — the detailed per-zone card, with a
visual editor and individually toggleable blocks. Third of the five branches in
the Lovelace cards initiative, and the first that a user actually sees.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py`, `engine/history.py` and
`engine/planner.py` are not touched; hashes verified before the PR.

---

## What already exists, and what this branch actually adds

The brief reads as a green field. It is not. `card/src/` already holds:

| module | what it gives this card |
|---|---|
| `discovery.ts` (504) | `discover`, `capabilityBadges`, `leakStatus`, `waterSummary`, `readCycles`, `zoneAdjustmentPct`, `buildCopyCandidates` |
| `zone-row.ts` (846) | working renderings of zone state, live progress, badges, controls and the program list |
| `curve-editor.ts` (668) + `curve-math` + `curve-sparkline` | the drawn, draggable, savable curve editor |
| `schedule-math.ts` | the SETTING / DELIVERY split, which a card must not re-derive |
| `panel/flow-units.ts` | flow-unit conversion for the live L/min figure |
| `format.ts`, `localize/` | number/duration formatting, leak phrasing, the typed en/it dictionaries |

So the genuinely new work is six things: the next-run verdict block, the
natural-language calendar, the consumption history chart, the hardware
proposal, per-block configuration with a visual editor, and the card shell that
composes them.

**`zone-row.ts` is not refactored into the new card.** It belongs to
`irrigation-maestro-card`, which is still installed on the user's dashboard and
which branch 5 turns into the compact card. Rewriting it underneath a live card
in a branch that is not about it would be exactly the unrelated refactoring this
process forbids. The new card reuses the *pure* modules and writes its own
rendering; where a rendering is genuinely identical the code moves to a shared
module only if branch 5 needs it too, and that decision belongs to branch 5.

---

## 1 · One card, one zone

`zone` is a required config key holding a `zone_id`. The editor picks it from
the discovered zones.

The detailed card is per-zone by nature. Rendering N zones in it would duplicate
what the compact card exists to do and would make the card's height unbounded —
and the brief's own "choose which zones appear" is a requirement on the compact
and hub cards, where a list is the point. A user who wants three detailed zones
adds three cards, which is how every entity-detail card in Home Assistant works.

A card whose configured zone no longer exists renders a single line saying so,
naming the id. It does not fall back to another zone: silently showing the wrong
zone's water is worse than showing none.

`getStubConfig` — what the card picker inserts when a user adds the card —
seeds `zone` with the **first discovered zone by order**, so the preview in the
picker shows a real card rather than the missing-zone line. On an installation
with no zones it seeds nothing, and the card renders the same one-line message
it would for a deleted zone.

---

## 2 · The backend gap this branch must close

The brief asks for the calendar phrase *"ogni 3 giorni, ultimo completato il
14/08"*. The second half is not publishable today: `last_completed` exists only
inside `ZoneNextRunSensor._next_eligible` (`sensor.py:441`) and no entity
carries it.

Without it the card can say "every 3 days" but not when the count restarted —
and a cadence is diagnosed precisely by knowing that. A user staring at "every 3
days" on a zone that has not watered in nine has no way to tell whether the
marker is stale, whether the zone was skipped, or whether the interval is being
counted from a date they did not expect.

**`_cycle_dict` gains `last_completed`** (ISO date or `null`), documented in the
card contract's `cycles` example. One line of backend, and it is genuinely part
of this feature rather than a drive-by: the card cannot render its required
string without it.

---

## 3 · The blocks

Eight, each independently toggleable, **all on by default**. The acceptance
criterion is a dashboard built without assembling anything, so a user who adds
the card sees what the zone has and turns off what they do not want. Clean
degradation removes the rest by itself.

| block | key | content |
|---|---|---|
| State | `state` | name, icon, zone state, valve state; while watering: which program, elapsed and remaining, live L/min, litres so far, progress |
| Next run | `next_run` | the instant from `zone_next_run`, plus **today's verdict** from `zone_state.next_run` |
| Last outcome | `last_outcome` | result, reason, duration, litres, when |
| Programs | `programs` | per program: name, start, **calendar in words**, enable switch, and the duration that would be delivered today |
| Curve | `curve` | the drawn curve with today's value marked; editable; `copy_curve` and `duplicate_program` |
| Hardware | `hardware` | battery, leak, water supply, flow meter and its resolved unit — configured, proposed, or declared absent |
| Consumption | `consumption` | today / month / total, plus the history chart |
| Actions | `actions` | run now (with optional duration), skip today, suspend until, pause |

### 3.1 The next-run block is two facts, and must not merge them

`zone_next_run`'s state is *when the next occurrence is*, already resolved
against every projectable gate. `zone_state.next_run` is *what would happen if a
program fired now*, and 3.6.0's contract requires the present tense.

The block renders them as two lines, never as one sentence:

> **Prossima**: mar 19/08, 06:30 — Mattino
> **Oggi**: non irrigherebbe — bilancio idrico sufficiente · valutato 2 h fa

`verdict: "unknown"` renders as "non ancora valutato", never as "non
irrigherebbe". When the programs disagree (`reason_key: null` with a blocked
verdict), the block lists the per-program reasons rather than inventing a
summary — the contract is explicit that a summary there would send the user to
the wrong setting.

`evaluated_at` is rendered as an age ("valutato 2 h fa"), because an absolute
timestamp reads as authority and the point is the opposite.

### 3.2 The calendar in words is a pure module

`calendar-text.ts`, tested, converting a `ProgramCalendar` config plus
`last_completed` into a phrase:

| stored | rendered (it) |
|---|---|
| `{mode: "weekdays", days: [0,3]}` | "lun e gio" |
| `{mode: "weekdays", days: [0,1,2,3,4,5,6]}` | "ogni giorno" |
| `{mode: "interval", interval_days: 3}` | "ogni 3 giorni · ultimo completato il 14/08" |
| `{mode: "interval", interval_days: 3}`, no marker | "ogni 3 giorni · mai completato" |
| `{mode: "parity", parity: "odd"}` | "giorni dispari" |

This is diagnostic #5 in the brief: *"lun e gio" and "ogni 3 giorni con
ritentativo" are very different behaviours and were distinguishable only by
reading the JSON.* The module is pure and localized through the same
`localize()` the rest of the card uses, so the weekday names come from the
dictionary and not from `toLocaleDateString`, which would follow the browser
rather than the card's language.

### 3.3 The hardware block proposes; it does not become a second editor

`capabilities` gives three values per capability. The block renders:

- `configured` → **active**, with the entity's live state where there is one.
- `candidate_available` → an **invitation**: "your valve's device exposes a leak
  sensor you have not wired up". Never a warning, never an alarm.
- `unavailable` → a **declared absence**. Not hidden, because a sensor-shaped
  badge that would never fire is worse than a plain statement that the sensor is
  not there.

For a candidate, the block calls `discover_zone_sensors` to get the actual
entity id and offers **one action: adopt it**, which is a single `update_zone`
call. That is a proposal with an accept button, not an editor.

**This is the design's most arguable point and it is flagged as such.** The
2.1.0 rule is *one editor per setting*, and the panel already edits these
sensors. A card that grew a sensor-picking form would be the duplicated surface
that rule exists to prevent. Adopting a value the backend itself discovered is
narrower than that, and the alternative — showing the invitation and sending the
user to the panel — was considered and rejected as a worse answer to "your
hardware could do this": it names a capability and then declines to enable it.
Anything beyond adopt-the-discovered-value belongs in the panel, and the block
links there for it.

Battery is different: the integration knows nothing about it. It is a
**card-config entity mapping** (`battery_entity`), with `discover_zone_sensors`
offering nothing, exactly as the brief requires for entities that are not the
plugin's.

### 3.4 The flow meter's unit is shown, not just its litres

Diagnostic #4: *m³/h read as L/min was invisible until someone looked at the
litres.* The hardware block shows the meter entity, the unit it declares, and
the unit the integration resolved it to — which is what makes a mismatch
visible before it becomes a wrong number. `zone_water_total.meter_entity` names
the meter; `degraded` carries `flow_unit_unknown` when it will not resolve.

---

## 4 · The consumption history chart

A hand-drawn SVG bar chart. **No charting library**: the bundle is committed to
the repository and served by Home Assistant, `curve-sparkline.ts` and
`curve-editor.ts` already establish that this project draws its own SVG, and a
dependency here would be the largest thing in the file.

### 4.1 What it draws

One bar per day, from `get_water_history`, over a configurable period
(`chart_days`: 30 / 90 / 365, default 30). Because the service returns a
**dense** series, every day in the range has a bar — including the zeros, which
is the point.

Three day shapes, and they must be distinguishable **without colour**, because
the card must work on light and dark themes and forced colours are forbidden:

- **measured** — a solid bar.
- **estimated** (`est: true`) — the same bar with a hatch pattern, plus a legend
  entry. The litres are real bookkeeping, not a measurement, and 3.3.0's rule is
  redundant marking rather than exclusion.
- **unobserved** (`gap_s > 0`) — a marker on the day's baseline whatever its
  litres, so a day with six hours of unreadable meter never looks like a quiet
  day. This is diagnostic #7, and it is the reason the chart exists rather than
  a sparkline.

Days before `oldest_recorded` are rendered as a distinct "not recorded yet"
band, never as zeros — 3.5.0 added that field precisely so a young installation
does not read as two years of confident dry days.

**A limit of that field, stated so the card does not overclaim.**
`oldest_recorded` is `min(daily)` across the whole history, so it is the oldest
day the *installation* recorded anything — not the oldest day *this zone*
existed. A zone added last week still shows real zeros for the months before it
was created, and the card cannot currently tell those apart from observed dry
days. The band is therefore worded as "prima di questa data non registravamo",
which is true at the installation level, and the card claims nothing about when
an individual zone was added. Making it per-zone would mean a per-zone
`oldest_recorded` in the response; that is a contract change worth making only
if a user reports being misled, and it is recorded here rather than silently
papered over.

### 4.2 Colours come from the theme, always

Every fill is a Home Assistant CSS custom property with a fallback
(`var(--primary-color, #03a9f4)`), as the existing card does throughout. No
literal palette. The hatch and the gap marker carry their meaning in *shape*,
so the chart survives a theme that maps several tokens to similar colours, and
survives a reader who cannot distinguish them.

### 4.3 Fetching is cached and coarse

`water-history.ts` — a pure-ish module, tested — calls `get_water_history`
through `hass.callService(..., returnResponse=true)`, the pattern
`panel.ts:199` already uses. It caches per `(zone, period)` and refetches only
when the zone or period changes, or after a coarse interval. **It never fetches
on render**: a Lit render can run many times a second, and a service round trip
per frame would be a self-inflicted denial of service on the user's own
installation.

The request asks for exactly the window it draws. 3.5.0's contract warns that a
730-day × 40-zone request is megabytes over the websocket; a per-zone card asking
for one zone and 30 days is the shape that warning is asking for.

### 4.4 Where the figures come from

Today / month / total come from `zone_water_total`'s own attributes
(`today_l`, `month_l`, state), **not** summed from the chart series. They are
already published and already guaranteed consistent with the total they slice;
re-deriving them in the card would be a second computation that can disagree
with the one the sensor shows elsewhere on the same dashboard.

An **external source** is configurable (`consumption_source: internal |
entity`, with `total_entity` / `today_entity` / `month_entity`), for the user
who keeps their own `utility_meter` chain. Choosing `entity` hides the chart:
the history service knows nothing about those entities, and drawing the
integration's series under someone else's totals would put two different
accountings side by side as though they agreed.

---

## 5 · Configuration and the visual editor

```yaml
type: custom:irrigation-maestro-zone-card
zone: 1b2f3c4d5e6f
title: Vasi                     # optional, defaults to the zone's name
blocks:                          # every key optional, every default true
  state: true
  next_run: true
  last_outcome: true
  programs: true
  curve: true
  hardware: true
  consumption: true
  actions: true
chart_days: 30                   # 30 | 90 | 365
consumption_source: internal     # internal | entity
battery_entity: sensor.vasi_battery
```

The editor is a Lit form in the style of the existing `editor.ts`: a zone
picker, the title, a checkbox per block, the period selector, the consumption
source with its entity fields shown only when `entity` is chosen, and the
battery entity. Entity fields reuse the panel's `<imc-entity-picker>` wrapper
over Home Assistant's own `<ha-selector>`, which falls back to a plain entity-id
text input when the selector is not registered — the same degradation the panel
already relies on.

**Config round-trips losslessly**: the editor writes only keys the user set, and
an unset block key means "default", never "false". A card configured in YAML
with three keys must come back out of the editor with three keys.

---

## 6 · Degradation

A block whose data does not exist **disappears**. It never renders
"unavailable", which is the brief's explicit requirement and the thing that
makes a card feel broken.

| condition | effect |
|---|---|
| no flow meter and no nominal rate (`water_accounting: "unavailable"`) | consumption block hidden entirely |
| meter present, unit unresolved (`flow_unit_unknown`) | figures shown, chart shown, and the hardware block names the unresolved unit |
| `consumption_source: entity` | chart hidden (§4.4) |
| leak entity absent or unavailable | rendered as "nothing established", never as an all-clear and never as a fault — `leak_watch` is the key to branch on, not `leak_detection` |
| `next_run.verdict: "unknown"` | "non ancora valutato", never "non irrigherebbe" |
| a program with a volume curve | the curve block shows litres, and the minutes stepper is not offered — `set_program_minutes` rejects it server-side |
| configured zone missing | one line naming the id; no fallback zone |

---

## 7 · Localization

Both dictionaries, enforced by the type system: `TranslationKey = keyof typeof
en` and `it` is typed `Record<TranslationKey, string>`, so a missing Italian key
fails `npm run typecheck`. `localize.test.ts` already asserts parity and key
order.

Italian terminology is fixed and not this branch's to vary: *flussometro*,
*sensore di perdita*, *sensore di mancanza d'acqua*, *acqua non attribuita*,
*litri stimati*, *secondi non osservati*, *storico dei consumi*. Weekday and
month names come from the dictionary, never from `toLocaleDateString` — a card
whose language is Italian must not print English weekdays because the browser is
set to English.

---

## 8 · Testing

Vitest, following the existing suites' shape (`discovery.test.ts`,
`schedule-math.test.ts`, `curve-editor.test.ts` are pure-logic tests; the card
elements are exercised through their state, not through a DOM snapshot).

- **`calendar-text.test.ts`** — every mode, the empty and full weekday sets, an
  interval with and without a marker, parity both ways, and both languages.
- **`water-history.test.ts`** — the request carries the drawn window; the cache
  is not refetched on re-render; a changed period refetches; a service error
  degrades to "no chart" rather than throwing; `oldest_recorded` splits the
  not-recorded band from the zeros.
- **`zone-card.test.ts`** — block toggles hide blocks; an unset key means
  default-on; a missing zone renders the one-line message; every degradation row
  in §6 that is decidable from a state fixture.
- **`zone-card-editor.test.ts`** — a config round-trips unchanged; toggling a
  block writes exactly one key; choosing `internal` removes the entity keys.
- **Python**: `last_completed` appears in `zone_state.cycles[]`, is `null`
  before the first completion, and carries the marker's date after one.

Theme: light and dark are asserted structurally — no test can see colour, so the
test that matters is that **no literal colour appears in the new components'
styles**, which a lint-style test over the stylesheet source can check
mechanically.

---

## 9 · Touch points

| file | change |
|---|---|
| `card/src/zone-card.ts` | **new** — shell, config, orchestration, the state / last-outcome / actions blocks |
| `card/src/blocks/next-run-block.ts` | **new** |
| `card/src/blocks/programs-block.ts` | **new** |
| `card/src/blocks/hardware-block.ts` | **new** |
| `card/src/blocks/consumption-block.ts` | **new** |
| `card/src/calendar-text.ts` | **new**, pure |
| `card/src/water-history.ts` | **new**, fetch + cache |
| `card/src/water-chart.ts` | **new**, SVG element |
| `card/src/zone-card-editor.ts` | **new** |
| `card/src/types.ts` | `ZoneCardConfig` and its defaults |
| `card/src/index.ts` | register the second type in `window.customCards` — **same bundle, same resource**, so `resources.py` and `const.py` are untouched |
| `card/src/localize/en.ts`, `it.ts` | the new keys, both files, same order |
| `custom_components/.../sensor.py` | `last_completed` in `_cycle_dict` |
| `docs/design/card-contract.md` | `last_completed` in the `cycles` example; a `## The zone card` section listing the config and the block keys |
| `MEMORY.md`, `CHANGELOG.md`, `manifest.json`, `README.md` | 3.7.0 |

The bundle is rebuilt and committed; CI asserts it matches source.

---

## Delivery

One branch, one PR, 3.7.0, merged before branch 4. The PR states: which blocks
are configurable and which are always present; how the card degrades per §6; and
that the hardware block's adopt action is a deliberate, bounded exception to the
one-editor rule, with the reasoning in §3.3 so a reviewer can overrule it.
