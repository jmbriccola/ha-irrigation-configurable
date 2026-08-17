# The hub card — design

**Date**: 2026-08-17
**Branch**: `feat/hub-card`, from `main` at 3.7.0. **Version**: 3.8.0.
**Scope**: `irrigation-maestro-hub-card` — the session, the decision panel, and
system health. Fourth of the five branches; only the compact card follows.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py`, `engine/history.py` and
`engine/planner.py` are not touched — which, as §1 explains, is the constraint
that shapes this card's hardest decision rather than merely bounding it.

---

## The problem this card is for

The brief says the decision panel *"is the heart of the engine and is today
unreadable"*. That is accurate and it is not about missing data. Every number
is published: `hub_water_budget` carries the rain history and the forecast
credit, `hub_skip_threshold` the threshold, `hub_weighted_temp` the five daily
maxima. What is missing is the **relation between them** — a budget of 3.79 mm
means nothing until you can see it against a threshold of 4.5 mm, and five
temperatures mean nothing until you can see which one dominated.

So this card is mostly composition, not new data. It has exactly one backend
addition, and that addition comes with a subtlety worth more than the code.

---

## 1 · The weights, and why publishing them is not enough

The brief asks for the weighted temperature *"with the five daily maxima that
produced it and their respective weights"*. The maxima are published. The
weights are not: `temp_weights` — `(0.05, 0.15, 0.30, 0.35, 0.15)` — is an
`EngineParams` field that no entity carries, and `export_config` would not help
because on a default installation those values are not in the options at all.

**`hub_weighted_temp` gains `temp_weights`.** One line.

The subtlety is what makes it correct. `weighted_temperature`
(`engine/weather.py`) **renormalises over the days that are available**: a
missing day is never counted as 0 °C, its weight is redistributed
proportionally across the rest. So on a day where `temp_tomorrow` is absent,
the five configured weights are *not* the weights that produced the number.

Rendering them anyway would be a plausible-but-false display of exactly the
kind this architecture exists to refuse — and it would be worse than most,
because it would be a *diagnostic* screen lying about how a decision was made.

The card therefore cannot simply print them, and the sensor cannot compute the
effective ones: doing that would mean a second implementation of a rule that
lives in a frozen engine file, which is the defect this repo has already
removed twice (`resolved_meter_entity`, `scope_for`).

**The resolution**: publish the configured weights, and have the card mark a
missing day as missing — struck through, with its weight shown as redistributed
rather than as its configured value. When all five days are present, which is
the ordinary case, the displayed weights *are* the effective ones and the card
says so by saying nothing. When one is absent, the card says that, instead of
pretending it weighed zero.

`weather_entity` is published on the same sensor at the same time. The card
needs the weather source for the health block, and asking for the entire
`export_config` payload to learn one entity id is disproportionate.

---

## 2 · The blocks

Five, each independently toggleable, all on by default — the same policy the
zone card settled, and `zoneBlockEnabled` is reused rather than re-derived.

| block | key | content |
|---|---|---|
| Session | `session` | state, the queue in its real order with each zone's frozen duration, the active zone |
| Decision | `decision` | budget against threshold as a **meter**; the five temperatures with their weights; the forecast credit and the rain history; the current decision and its reason |
| Health | `health` | weather source and freshness; notification status; unattributed water; system leak; consumption budget |
| Notifications | — | part of `health`, not a block of its own: it is one line until something is wrong |
| Actions | `actions` | evaluate now, stop all, global pause |

### 2.1 The meter is extracted, not copied

The budget-against-threshold meter already exists inside `card.ts` — the live
card that branch 5 turns into the compact card. It moves to a shared
`imc-budget-meter` used by both.

This is the one place this branch touches a file it does not own, and it is
deliberate: two meters for one comparison would diverge, and the divergence
would be invisible because both would look plausible. The change to `card.ts`
is the smallest possible — the markup moves, the behaviour does not — and the
existing card's tests stay as they are. Branch 5 inherits a component instead
of a duplicate.

**Nothing else moves.** The status chips and the queue rendering stay in
`card.ts` even though this card renders richer versions of both: touching the
live card more deeply, in a branch that is not about it, is how a defect
reaches the user's real dashboard rather than a card nobody has added yet.

### 2.2 The decision block is the point of the card

Four rows, in the order a person actually reasons:

1. **Will it water?** — the decision and its reason, from `hub_session` /
   `hub_water_budget`'s `skip_reason` when there is one. Present tense, and
   worded as the *current* evaluation rather than a forecast, exactly as
   3.6.0's contract requires of the per-zone verdict.
2. **Budget against threshold** — the meter. Two numbers whose comparison *is*
   the decision, drawn so the comparison is the thing you see.
3. **Why the budget is what it is** — rain today / d1 / d2 / d3 and the
   forecast credit, each with its contribution.
4. **Why the threshold is what it is** — the weighted temperature, expanded
   into its five days with their weights, per §1.

### 2.3 Notification status is a diagnostic, not a settings screen

`notification_status` already returns the verdict, the events enabled with no
recipient, and the services that do not resolve — which is diagnostic #3 in the
brief: *"enabled with no recipients" is visible instead of being discovered
when the alarm does not arrive.*

The health block renders one line when the verdict is fine and an explicit
warning when it is not, naming the events that would go nowhere. It offers
`test_notification` from there, because the moment you learn the system might
be mute is the moment you want to check.

It does **not** edit notification settings. The panel is the one editor for
those (2.1.0), and unlike the zone card's sensor adoption there is no
discovered value to adopt here — only a form, which is precisely what that rule
forbids duplicating.

---

## 3 · What the card refuses to say

- **`hub_leak` unavailable is not an all-clear.** It means the system scope has
  established nothing, and the contract is explicit that the hub has no
  `degraded` list to explain why. The card renders "nothing established" and
  never a green tick — the contract's own words: *a card should not present
  that as healthy.*
- **No evaluation yet** — every hub sensor returns `{}` for its attributes
  before the first evaluation. The decision block renders "not evaluated yet",
  the same phrasing the zone card uses, and never a decision.
- **`stale_weather`** is shown as a warning beside the source, not folded into
  the numbers. The numbers are real; what is old is the weather they rest on.
- **Unattributed water is not consumption**, and the health block says so where
  it shows it. `closed_l` is the subset leak detection reads and is labelled as
  such; the total is not.

---

## 4 · Configuration

```yaml
type: custom:irrigation-maestro-hub-card
title: Impianto              # optional
blocks:                      # every key optional; UNSET MEANS ON
  decision: true
  health: true
  session: true
  actions: true
```

No zone key: there is one hub. The editor is the same shape as the zone card's
— title plus a checkbox per block — and reuses `zoneBlockEnabled` and the same
"never write a default out" writer, so a config toggled twice returns to
exactly what it was.

---

## 5 · Touch points

| file | change |
|---|---|
| `custom_components/.../sensor.py` | `temp_weights` and `weather_entity` on `hub_weighted_temp` |
| `card/src/budget-meter.ts` | **new**, extracted from `card.ts` |
| `card/src/card.ts` | uses `<imc-budget-meter>` — markup moves, behaviour does not |
| `card/src/hub-card.ts` | **new** — shell, blocks, service calls |
| `card/src/blocks/decision-block.ts` | **new** — §2.2 |
| `card/src/blocks/health-block.ts` | **new** — §2.3 |
| `card/src/hub-card-editor.ts` | **new** |
| `card/src/notification-status.ts` | **new** — fetch + cache, the `water-history` pattern |
| `card/src/types.ts` | `HubCardConfig`, `HUB_CARD_BLOCKS` |
| `card/src/index.ts` | the third card type, same bundle |
| `card/src/localize/{en,it}.ts` | new keys, both files, same order |
| `docs/design/card-contract.md`, `MEMORY.md`, `README.md`, `CHANGELOG.md`, `manifest.json` | 3.8.0 |

---

## 6 · Testing

- **`temp_weights` / `weather_entity`** reach `hub_weighted_temp`, and are
  absent before the first evaluation like every other attribute there.
- **`weightRows`** (pure): five rows when every day is present; a missing day is
  marked and its configured weight is **not** presented as effective; the rows
  survive a `temp_weights` that is absent (an older backend) by rendering the
  values without weights rather than by blanking.
- **`budgetMeter`** geometry (pure): the fill, the threshold mark, the
  sufficient/insufficient state, and a threshold of zero without dividing by it.
- **`notificationSummary`** (pure): a mute verdict is a warning naming the
  events; a healthy verdict is one line; a failed service call degrades to "not
  checked" rather than to "fine".
- **Degradation**: no evaluation → "not evaluated yet"; `hub_leak` unavailable →
  "nothing established", never a tick.
- **`theme-safety.test.ts`** extended to the new components.
- **The existing card's suite stays green** across the meter extraction, which
  is the check that the move changed no behaviour.

---

## Delivery

One branch, one PR, 3.8.0, merged before the compact card. The PR states the
weights subtlety in §1 explicitly: it is the one thing in this card a reviewer
could reasonably think was a shortcut, and it is the opposite.
