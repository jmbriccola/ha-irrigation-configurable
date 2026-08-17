# Cards at a glance — design

**Date**: 2026-08-17
**Branch**: `feat/cards-at-a-glance`, from `main` at 3.9.0. **Version**: 3.10.0
(additive throughout — a new sensor, a new attribute, card content; nothing
removed or changed incompatibly).
**Scope**: make the three cards answer the questions a person actually asks
when they open the dashboard.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py`, `engine/history.py`,
`engine/planner.py` untouched; hashes verified before the PR.

---

## Why this branch exists

The user installed 3.9.0 and used it. Their verdict: the cards are *"un po'
povere, non danno davvero info utili at a glance"*.

That is correct, and investigating it found causes rather than taste:

| finding | severity |
|---|---|
| **The curve block is never rendered.** It is in `ZONE_CARD_BLOCKS`, the editor shows its checkbox, and the shell draws nothing. | A checkbox that does nothing, for the brief's **diagnostic #1** |
| **`get_run_history` has no consumer.** Built, specced, tested and released in 3.5.0; three cards were then built without ever calling it. | The service that exists to make non-events visible is on no surface |
| **`valve_entity` is published by nothing.** The card knows a zone is watering but not which valve to watch. | The user's third ask is unreachable |
| **No installation-wide water total exists.** | The user's second ask is unreachable |
| **`ha-icon` appears 0 times** across all three cards and six blocks. | The "at a glance" failure, in one number |
| The state block shows no flow rate, no litres delivered, no running program; the programs block shows no start time — **all three promised by the 3.7.0 spec** | Thinner than specified |

**The method was the root cause.** The cards were built from the brief's list
of blocks rather than from the questions a person asks looking at a dashboard.
So the most valuable service went unconnected, the most diagnostic block went
undrawn, and the three things the user named first are exactly the three that
were missing. This spec is organised by their questions instead.

---

## Question 1 — "How did each program's last run go?"

Note the word: **programs**, plural, per program. Today the card shows
`zone_last_outcome`, which is per *zone*: a zone with three programs shows one
line and does not say which program it describes.

**Source: the run log**, through `get_run_history` — the user's choice, and the
right one. It keeps 730 days, it carries `reason_key`, `duration_min`,
`volume_l` and `scheduled` per entry, and crucially **it holds the skips**,
which is the whole reason it was built: a cycle that does not start is a
non-event, and non-events are the ones that get away.

The rejected alternative was a per-program attribute on `zone_state`. It would
be fresher and cheaper, but it would show only the last run and no history, and
it would put a second stored representation beside the one the run log already
holds — the defect this repo has removed from a curve and from a water counter.

### Shape

A new `run-history.ts` cache, the same pattern as `water-history.ts`: asked
from `updated()`, never from `render()`; a failed attempt ages like a
successful one; one request per zone.

`lastRunPerProgram(runs)` — pure, tested — reduces the returned entries to the
most recent per `program_id`. The programs block gains a line per program:

> **Mattino** · lun e gio · 12 min oggi
> ↳ ieri 06:30 — completato, 11 min, 47 L

and for a skip, which is the point:

> ↳ ieri 06:30 — saltato: bilancio idrico sufficiente

**A program with no run in the window says so** — "mai eseguito nella finestra"
— rather than showing nothing, because an empty line reads as "no data
available" when the fact is "it has not run".

---

## Question 2 — "How much water, overall and per zone?"

Per zone exists (`zone_water_total`, with `today_l` / `month_l`). Nothing
totals the installation.

**A new hub sensor**, `hub_water_total`, `device_class: water`,
`state_class: total_increasing` — the user's choice, and the reason it is the
right one is that it reaches beyond this card: those two attributes are what
puts an entity into Home Assistant's long-term statistics and its Water
dashboard. A figure summed inside a card exists only inside that card.

It sums the per-zone cumulative litres. **Unattributed water is excluded**, for
the reason `sum_period` already excludes it: it is not consumption, and folding
a leak into the total would make a leak look like irrigation.

**Today and this month are summed card-side** from the per-zone `today_l` /
`month_l` the card already reads. That is a deliberate limit of the option
chosen: the cumulative figure is the one that needs statistics, and the two
derived views are cheap to compose where they are shown. If that proves
confusing in use, publishing them as attributes is the upgrade path and is
noted here rather than discovered later.

---

## Question 3 — "Are the valves open?"

`zone_state` tells you the zone is `watering`. It does not tell you the valve
is *open* — which is a different fact, and the difference is exactly where this
integration's hardest bugs have lived: a failed close leaves a valve open with
no run in progress, and a stuck valve reports closed while water flows.

**`zone_state` gains `valve_entity`.** One line, and it is the enabling change:
with it the card reads the valve's own state (`open` / `closed` /
`unavailable`) and its `device_class` battery sibling if the user mapped one.

The card renders the physical state beside the logical one and **says when they
disagree**, because that disagreement is a fault worth seeing: a zone reading
`idle` whose valve reads `open` is the shape of a failed close.

---

## Question 4 — "and other things useful to me and other users"

Taken as licence to close the gaps the investigation found, not to invent:

- **The curve block is rendered.** `ImcCurveEditor` already exists, complete
  and tested, with `cycle` / `weightedTemp` / `zoneHasFlowMeter` /
  `zoneAdjustmentPct` inputs. This is wiring, not building — and it delivers
  diagnostic #1, the drawn curve with today's value, which is what makes a
  wrong curve visible instead of arithmetic.
- **The state block gains what its spec promised**: the running program's name,
  elapsed and remaining, live L/min read from the meter `zone_water_total`
  already names (converted through the existing `flow-units.ts`), and the
  litres delivered so far.
- **The programs block gains the start time** — the first thing anyone wants
  from a program list, and absent since 3.7.0.
- **Icons and hierarchy throughout.** Every row that states a status gets an
  `ha-icon` and a weight that distinguishes a heading from a detail. Colours
  stay theme tokens; `theme-safety.test.ts` is extended to every touched
  component, so "add icons" cannot smuggle in a literal.

---

## What stops this recurring

The wiring test added in 3.8.1 catches a property declared and not passed. It
does **not** catch a *block key* declared and not rendered — which is how the
curve block shipped as a checkbox that does nothing, and how an entire service
shipped with no consumer.

Two checks close that:

1. **Every block key renders something.** For each key in `ZONE_CARD_BLOCKS`
   and `HUB_CARD_BLOCKS`, the shell source must contain a render branch guarded
   by that key. Static, source-read, no DOM — the `wiring.test.ts` pattern.
2. **Every response service the contract documents has a consumer, or is
   explicitly listed as not having one.** A service built and never wired is
   invisible work; making the absence *declared* rather than accidental is the
   cheapest possible guard, and it is exactly the check that would have caught
   `get_run_history` sitting unused for three releases.

---

## Touch points

| file | change |
|---|---|
| `custom_components/.../sensor.py` | `valve_entity` on `zone_state`; new `HubWaterTotalSensor` |
| `custom_components/.../const.py` | the new role name |
| `card/src/run-history.ts` | **new** — cache + `lastRunPerProgram`, pure and tested |
| `card/src/blocks/programs-block.ts` | start time; last run per program |
| `card/src/zone-card.ts` | render the curve block; fill the state block; wire the run history |
| `card/src/blocks/health-block.ts`, `hub-card.ts` | the installation total |
| `card/src/zone-row.ts` | valve state on the compact row |
| `card/src/*` | icons and hierarchy |
| `card/src/block-coverage.test.ts` | **new** — the two checks above |
| `docs/design/card-contract.md`, `MEMORY.md`, `README.md`, `CHANGELOG.md`, `manifest.json` | 3.10.0 |

---

## Testing

- **Python**: `valve_entity` reaches `zone_state`; `hub_water_total` sums the
  zones, excludes unattributed water, and carries both device and state class.
- **`lastRunPerProgram`**: the most recent per program wins; a program with no
  runs is present and marked; a skip keeps its `reason_key`; ordering is not
  assumed from the response.
- **`run-history.ts`**: the same four guarantees as `water-history.ts` — the
  request matches the window, one call per key, a failure does not retry
  tightly, a failure degrades rather than throwing.
- **Block coverage**: both new checks fail if a key is added without a render
  branch. Proven by adding a fake key and watching them fail.
- **The existing suites stay green**, which is what says the visual pass and
  the state-block additions changed no behaviour.
- A declared mutation matrix over the new decision points, reverted with a
  byte-compare — and the matrix harness verified to actually apply its
  mutations before its results are believed, which it did not do last time.

---

## Delivery

One branch, one PR, 3.10.0. The PR leads with what was wrong rather than with
what is new: a checkbox that did nothing, a service with no consumer, and three
of the user's first four questions unanswerable from the published data.
