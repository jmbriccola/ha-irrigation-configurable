# Next run against the gates — design

**Date**: 2026-08-17
**Branch**: `feat/next-run-gates`, from `main` at 3.5.0. **Version**: 3.6.0.
**Scope**: publish, on an entity a card can always read, whether a zone would
water if its program fired right now — and if not, why. Backend only; the
second of the five branches in the Lovelace cards initiative, and the last one
before the cards themselves.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py` and `engine/history.py` are
field-validated and are not touched; their hashes are recorded before the first
commit and verified before the PR. `engine/planner.py` is not in that list but
its **behaviour** is not changed either: this branch calls `build_session_plan`,
it does not alter what it decides.

---

## The gap, stated precisely

The original brief records this as an open follow-up: *"`ZoneNextRunSensor`
ignores the gates."* That follow-up closed in 2.0.0 and the brief is out of
date. The sensor projects every enabled program forward up to 366 days
(`sensor.py`, `_next_eligible`) through:

zone enabled · program enabled · calendar (weekdays / interval with the
`last_completed` marker / parity) · season months · suspension · pause ·
skip-today

What it does **not** resolve, and for a future day *cannot*, is the layer that
only exists in the present: the immediate weather skips (`precipitation`,
`frost_risk`, `cold_day`, `wind`), the water budget against the skip threshold
(`budget_sufficient`), the consumption budget (`consumption_budget`), and
`weather_unavailable`. Tomorrow's weather is not knowable, and a component that
implied otherwise would be manufacturing exactly the plausible-but-false number
this architecture exists to refuse.

So the work is not "resolve a gate that is ignored". It is: **publish today's
verdict, and let the timestamp beside it say how current that verdict is.** The
card then renders the two together — "next: Tue 19/08 06:30 · today it would be
skipped: budget sufficient" — and the user can see a suppression that no single
number reveals.

---

## 1 · Where the verdict is published, and why not on `zone_next_run`

On **`zone_state`**, as a `next_run` object. Not on `zone_next_run`, whose state
is the instant itself and where the verdict would appear to belong.

Home Assistant publishes **no state attributes at all while an entity is
unavailable** — a fact this repo already documents, under "Discovery caveat" in
the card contract, because it made unavailable leak entities invisible to the
attribute walk. `zone_next_run` is `unavailable` whenever there is no next
occurrence: a disabled zone, a zone whose every program is disabled, a zone
suspended past the search window. Those are precisely the cases where the user
most needs to be told why nothing is coming. Putting the explanation there means
it vanishes exactly when it is the only thing worth saying.

`zone_state` is never unavailable — it reports `disabled` and `suspended` as
*states* — and it already carries the zone's other structured diagnostics
(`degraded`, `capabilities`, `cycles`). The verdict joins them.

**The instant is not duplicated into it.** `zone_next_run`'s state is the one
representation of "when", and a second copy is a second thing that can drift —
the same rule that keeps a derived `minutes` attribute off this very sensor
(3.0.0). A card reads the instant from one entity and the verdict from the
other; both are zone-scoped and both are found by the same `zone_id` walk the
contract already specifies.

---

## 2 · Where the verdict comes from: the planner, called and not copied

`build_session_plan` (`engine/planner.py`) is already the single place that
decides run-or-skip and attaches a `SkipReason` to every cycle that does not
run. It is pure, synchronous, and takes everything it needs as arguments.

The verdict **calls it**. It does not re-derive the decision from the same
inputs, because a second implementation of one decision is two decisions that
can disagree — the defect this repo has already removed twice, in
`resolved_meter_entity` (3.3.0) and `scope_for` (3.4.0), and whose rule
MEMORY.md states as *one definition per predicate, do not re-inline it*.

The inputs are all synchronous and already exist:

- `runtime.last_evaluation` — the cached `SessionEvaluation`, already read by
  four hub sensors (`hub_water_budget`, `hub_skip_threshold`,
  `hub_weighted_temp`, and the session sensor's own view).
- `runtime._zone_spec(zone, cycles)` — builds the `ZoneSpec` the planner takes.
- the consumption gate — see §3, which is where this design changes something.

No I/O, no `await`, no weather fetch. A sensor attribute read stays a pure
computation over a handful of cycles.

### 2.1 What the verdict is *about*

`build_session_plan` is called with `now = dt_util.now()` and the cached
evaluation. Its answer is therefore: **if every one of this zone's programs
fired at this instant, which would water and which would not.**

That is deliberately not the same question as "will the occurrence
`zone_next_run` reports actually water". Nothing can answer the second for a day
whose weather has not happened. Every surface that renders the verdict must word
it in the present tense, and the card contract says so.

A program whose calendar does not include today is reported `blocked` with
`calendar_not_today` — which is correct and useful: it is the honest statement
that this program is not due, and it is what distinguishes "not scheduled today"
from "scheduled but suppressed".

---

## 3 · `_consumption_factor` has a side effect, and the verdict must not trigger it

`IrrigationRuntime._consumption_factor()` returns `(duration_factor,
suspend_all)` — and on the way calls `_notify_budget_exceeded_once()`, which
fires a `consumption_budget` event and dispatches a notification.

Calling it from a sensor attribute read would send budget notifications on every
entity refresh. The once-per-period guard (`_budget_notified_period`) bounds the
damage to one notification per month, but the trigger would be "a card
rendered", which is not a moment at which anything about the budget happened.

**The pure half is extracted.** `_consumption_gate()` returns the same tuple and
notifies nothing; `_consumption_factor()` becomes a thin wrapper that notifies
when the budget is exceeded and then delegates. Every existing caller keeps the
notifying version — the session paths, where crossing the budget genuinely is an
event. The verdict uses the gate.

This is a targeted improvement to code the branch is already touching, not
unrelated refactoring: the split exists because this feature needs the pure
half, and leaving one function with two jobs is what would have made the bug.

---

## 4 · The published shape

On `zone_state`, a `next_run` object:

```json
"next_run": {
  "verdict": "would_run",
  "reason_key": null,
  "evaluated_at": "2026-08-17T05:30:12+00:00",
  "programs": [
    {"cycle_id": "a1b2c3d4", "verdict": "would_run", "reason_key": null},
    {"cycle_id": "e5f6a7b8", "verdict": "blocked", "reason_key": "calendar_not_today"}
  ]
}
```

### 4.1 `verdict` has three values and the third is not a failure

- **`would_run`** — this program (or, at zone level, at least one program) would
  water if it fired now.
- **`blocked`** — it would not, and `reason_key` says why. The key is a
  `SkipReason` value, already in the contract's localizable list, so no new
  vocabulary is coined.
- **`unknown`** — **no evaluation exists yet**, so nothing can be said. Reached
  at start-up before the first session or `evaluate` call, and never afterwards
  (the cached evaluation is not cleared). `reason_key` is `null` and `programs`
  is an empty list.

  `unknown` is not `weather_unavailable`. That reason means an evaluation *ran*
  and could not reach the weather; this means none has run. Publishing `blocked`
  with a guessed reason there, or `would_run` on no information, would each be an
  assertion nobody has earned — the same discipline `zone_leak`'s `unavailable`
  applies one module over.

### 4.2 `evaluated_at` is the freshness, and it is not new

The UTC instant of the evaluation the verdict rests on, or `null` when the
verdict is `unknown`. The cached evaluation refreshes when a session starts or
`evaluate` is called, so between sessions it can be hours old.

That is **not a new characteristic**: `hub_water_budget`,
`hub_skip_threshold` and `hub_weighted_temp` already publish from the same
cache, and the contract already carries `stale_weather` for the case where the
evaluation itself could not reach fresh weather. This branch adds no periodic
re-evaluation — that would spend weather API calls to keep a display current,
and the display can instead say when it was computed.

`stale_weather` is deliberately **not** copied into `next_run`: it lives on
`hub_weighted_temp` and a card that wants it reads it there, once, rather than
having N zone copies that can disagree with the hub's.

### 4.3 The zone-level `reason_key` is set only when the programs agree

The aggregation is ordered, and `unknown` comes first: with no cached
evaluation the zone is `unknown` regardless of anything else, because no
per-program verdict was computed to aggregate. Only then does the rest apply.

`verdict` at zone level is `would_run` when **any** program would run — that is
what "will this zone water" means.

When every program is blocked, `reason_key` carries the shared reason **only if
all of them report the same one**. When they differ it is `null`, and the card
reads `programs[]`.

Picking one reason out of several would be a lie by omission on the exact screen
built to stop lies by omission: a zone with a morning program blocked by
`calendar_not_today` and an evening program blocked by `budget_sufficient` is
not "blocked because of the calendar", and a compact card that said so would
send the user to the wrong setting. `null` costs the compact card a generic
phrase and keeps it true.

A zone with **no programs at all** reports `verdict: "blocked"` with
`reason_key: null` and an empty `programs` list. It cannot water and no
`SkipReason` describes "there is nothing to run"; inventing one for a
configuration the panel does not allow to persist would be vocabulary nobody
needs.

---

## 5 · Touch points

| file | change |
|---|---|
| `runtime.py` | extract `_consumption_gate()` (pure) out of `_consumption_factor()`; add the public `zone_next_run_verdict(zone: ZoneRuntime) -> dict[str, Any]` that builds the spec, calls the planner and aggregates. It takes the `ZoneRuntime` the caller already holds rather than an id, so it has no "unknown zone" case to return `None` for and no caller has to handle one — `ZoneStateSensor._role_attributes` already early-returns `{}` when the zone's config is gone |
| `sensor.py` | `ZoneStateSensor._role_attributes` publishes `next_run` |
| `docs/design/card-contract.md` | the `zone_state` row, plus a `### Next-run verdict` subsection with the shape, the three verdict values, the present-tense wording rule, and the freshness statement |
| `translations/en.json`, `it.json` | **no change** — the reason keys are already card-localized, and `would_run`/`blocked`/`unknown` are card vocabulary like the zone states and `degraded` keys. They are added to the contract's "Localizable keys" list for the card branches to translate. |
| `MEMORY.md` (repo) | the 3.6.0 decisions, under "Deliberate design decisions" — the omission that nearly shipped in 3.5.0 |
| `manifest.json` | 3.6.0 |
| `CHANGELOG.md` | 3.6.0 section |
| `README.md`, `docs/it/*` | the verdict is not a user-facing control and adds no service; the card branches document it where a user meets it. The degradation matrix in the README gains one row: no evaluation yet → `unknown`. |

No card change: `custom_components/irrigation_maestro/frontend/` stays untouched
and the CI job asserting the committed bundle matches source passes with no
rebuild.

---

## 6 · Tests

`tests/components/test_next_run_verdict.py`

- a zone whose program is due and whose weather permits reports `would_run`,
  `reason_key: null`;
- a zone blocked by the water budget reports `blocked` /
  `budget_sufficient` — driven through a real evaluation, not a hand-built one;
- a disabled zone reports `blocked` / `zone_disabled` **while its
  `zone_next_run` entity is unavailable**, which is the case this design exists
  to cover and must be asserted together;
- a program not scheduled today reports `calendar_not_today`;
- two programs blocked for **different** reasons yield a zone `reason_key` of
  `null` with both reasons present in `programs[]`; two blocked for the **same**
  reason yield that reason at zone level;
- before any evaluation has run, `verdict` is `unknown`, `evaluated_at` is
  `null`, `programs` is empty — and it is **not** `weather_unavailable`;
- `evaluated_at` matches the instant of the evaluation actually used;
- a zone with no programs reports `blocked` with a `null` reason and an empty
  list.

`tests/components/test_budget.py` (extend)

- **`_consumption_gate` notifies nothing**: over-budget, called directly, fires
  no `consumption_budget` event and dispatches no notification, while
  `_consumption_factor` on the same state still does. This is the regression
  that would otherwise reappear the first time someone inlines the gate back.
- reading `zone_state`'s attributes on an over-budget hub fires no
  `consumption_budget` event — the defect stated at the level a user would meet
  it, not at the level of the helper.

**Engine hashes**: the four frozen files recorded before the first commit and
verified before the PR. `engine/planner.py` is additionally asserted unchanged,
because "call it, do not alter it" is this branch's central claim.

**A small declared mutation matrix**, as 3.5.0 established, over this branch's
own decision points: the any/all in the zone-level aggregation, the
same-reason test, and the `unknown` guard — plus one declared control expected
to survive. There is no harness in this repo; it is run by hand and the revert
is verified by byte-compare, never assumed.

---

## Delivery

One branch, `feat/next-run-gates`, one PR to `main`, merged before the first
card branch starts. `manifest.json` 3.6.0, CHANGELOG, repo `MEMORY.md`, and
`card-contract.md` extended — that document is the input to the three card
branches that follow, and after this branch it is complete for them.
