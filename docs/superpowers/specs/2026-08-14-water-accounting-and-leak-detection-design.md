# Water accounting and leak detection — design

**Date**: 2026-08-14
**Scope**: two features, two branches, two PRs, merged one at a time.
`feat/water-accounting` (3.3.0) branches from `main` today;
`feat/leak-detection` (3.4.0) branches from `main` **after** the first merges.
Both touch `services.yaml`, `const.py`, `sensor.py` and `manifest.json`, which
is why they cannot run in parallel.

**Goal**: the integration becomes sufficient on its own. The user currently
maintains, by hand in `configuration.yaml`, three `template` sensors converting
m³/h to L/min, three `integration` sensors accumulating litres, and six
`utility_meter` helpers cutting them per day and per month. At the end of this
work that chain can be deleted with nothing lost. Historical data is **not**
imported — the user has stated it does not matter to them.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py`, `engine/history.py`, the weights,
thresholds, water budget, forecast credit, weighted temperature, immediate
skips and the `PRESET_POTS` / `PRESET_LAWN` control points are field-validated
and are not touched.

---

## The defect

`FlowIntegrator`/`FlowMonitor` (`session.py:104`) integrates flow **only during
a run**. The litres land in `volume_l`, an *attribute* of the zone's last
outcome sensor:

```
sensor.vasi_ultimo_esito
  state: completed
  attributes: { duration_min: 37, volume_l: 3.689, ... }
```

Home Assistant does not record attributes in long-term statistics, so that
number is not graphable, not totalisable, and is overwritten by the next cycle.
Storage holds `consumption.liters` (`storage.py:49`), but it is a **single
aggregate across every zone**, monthly, exposed only indirectly by
`HubConsumptionLeftSensor` as the *remainder* of a budget — therefore
`unavailable` when no budget is configured.

Deeper than the reporting gap: a `utility_meter` always integrates, the
component only integrates while it waters. A dripping valve, a tap opened by
hand, or a cycle that ends abnormally are all visible to the external chain and
invisible to the component. Until that changes the user cannot delete it.

---

## Part 0 — pre-work, on the `feat/water-accounting` branch, first commit

Four behaviours that are load-bearing for this design have **no test**. They
must be pinned *before* the refactor, or the refactor can break them and stay
green. This is one commit, no production code:

1. **Volume target above the unit gate.** `session.py:228-233` (mirrored at
   `:248`) deliberately compares the volume target *before* the `unit_known`
   gate, so water certainly delivered still finishes the run. Every existing
   unit-loss test uses duration cycles (`test_safety_extra.py:444, :488, :554`)
   and every volume test keeps the unit throughout. Add: a volume cycle whose
   meter loses its unit on the very read that crosses the target — the run must
   complete, not hang.
2. **`_check_range`'s positive path.** Only the negative case exists
   (`test_safety_extra.py:554-620`). A refactor could disable range reporting
   entirely and the suite stays green. Add: in-range flow, sustained, reports
   nothing.
3. **The budget gate end-to-end.** `_consumption_factor` (`runtime.py:496-513`)
   drives `reduce` and `suspend` and is untested: grep finds only config writes
   (`test_services.py:1344, 1352`) and raw floats (`test_planner.py:85-104`).
   `test_session.py:421` is a false friend — it asserts
   `reason_key == "budget_sufficient"`, the rain/mm budget, a different thing.
   Add three tests: `notify` notifies once per period, `reduce` multiplies
   durations after clamps with a 1-minute floor, `suspend` marks the session
   `consumption_budget`.
4. **The storage round-trip shape.** No test reads the raw dict: grepping
   `tests/` for `hass_storage`, `_default_data`, `_data[` yields nothing. Add a
   save/load round-trip asserting the persisted key set, so the new `water`
   section has a safety net the current schema lacks.

Also in this commit: a test for `migrate_markers`, which ships today with none
at all (`storage.py:59-63` ← `migration.py:128-143`). The new migration follows
its pattern, and the precedent should not stay untested while its imitation is.

---

## Part 1 — Water accounting per zone

### 1.1 Architecture: one ledger per meter

**One place where water becomes litres**, exactly as `flow.py` is the one place
where a unit becomes L/min. Two new modules:

- **`engine/metering.py`** — pure, no Home Assistant imports, clock injected,
  mirroring the `engine/history.py` convention (and therefore mirrored 1:1 by
  `tests/engine/test_metering.py`). Owns: left-Riemann accumulation from a
  sample sequence, the daily rollup, and the 730-day retention window.
- **`accounting.py`** — Home Assistant wiring. Owns `MeterLedger` (one per
  configured meter entity) and `WaterAccountant` (owns the ledgers, resolves
  attribution, writes through `RuntimeState`).

`MeterLedger` subscribes to its meter's state changes plus a 30 s safety tick,
so a meter that stops emitting events still gets integrated and a gap is
detected within a bounded delay. It emits a sample to its subscribers on every
integration step:

```python
@dataclass(frozen=True, slots=True)
class MeterSample:
    at: datetime
    lpm: float | None      # None = unit unknown
    available: bool        # False = state unavailable/unknown/non-numeric
    total_l: float         # meter cumulative after this sample
    measured_s: float      # seconds of this interval that were actually measured
    unit_recovered: bool   # this sample carries a unit that had been lost
```

`FlowMonitor` stops integrating and becomes a subscriber. It keeps a baseline
of `total_l` at run start; run litres are `total_l - baseline`. It keeps its own
`async_call_later` scheduling **anchored to `started_at`, unchanged**, because
`test_safety_extra.py:518-528` and `:590-598` compute checkpoints as
`ActiveRun.started_at + 120s·k` and would otherwise break for timing reasons
rather than behavioural ones (**R4**). It keeps `_check_range`, which reads
`sample.lpm` — instantaneous flow, never integrated.

**The recovery edge is published synchronously on the state event** (**R3**).
`_out_of_range_since` resets and `_unit_recovered` reaches the zero-flow guard's
window through `MeterSample`, not on the monitor's next tick — a monitor that
learned of recovery a tick late would fail `test_safety_extra.py:488-551` and
`:554-620`. The guard skips a window whenever `measured_s` is less than the
window length, which is the same rule as today (`session.py:259-266`) expressed
in seconds rather than in a boolean.

**Ledger identity and unit overrides** (hidden work 2). `flow_reader_for`
(`runtime.py:233-254`) reads the same entity under the zone override or the hub
override depending on which zone asks. One ledger per `entity_id`, with the
override resolved once, deterministically: a zone that owns the meter and
declares an override wins over the hub override; two zones declaring different
overrides for the same entity is a configuration fault — the lowest-ordered
zone's override applies and a Repairs issue `flow_unit_override_conflict` names
both. Keying by `(entity_id, override)` was rejected: it would integrate the
same physical water into two ledgers.

**The ledger does not own the Repairs lifecycle** (hidden work 3).
`test_safety_extra.py:651-656` asserts `flow_unit_unknown_*` survives until the
next run withdraws it, and that intent is right: a standing configuration fault
should not flicker. `report_flow_unit_unknown` / `clear_flow_unit_unknown` stay
driven by the existing run-scoped path and by `_on_flow_sensor`
(`runtime.py:1160-1176`). The ledger integrates; it does not report.

**`_unit_ever_known` becomes per meter, not per run** (**R2**). Today it is
per-monitor (`session.py:150, 159-164, 181`), so a meter unknown for all of run
A and lost mid-run B pushes only in B. Ledger-scoped is the better semantic —
the user cares about the meter, not about which run noticed — and it is
declared, not drifted into. A two-run test pins it.

### 1.2 Attribution follows valve state, not run phase

`PHASE_WATERING` is necessary and **not sufficient** (**C9**): `PHASE_OPENING`
is set at `session.py:849` and the whole open-confirm wait runs at `:853` before
`PHASE_WATERING` at `:933`, and `_open_master` pressurises the line and sleeps
`master_pre_open_s` (`session.py:660-675`) while the zone is still
`PHASE_WAITING` or `PHASE_SETTLING`. Worse, `_close_valve` can return False,
the zone is cleared from `_active` anyway (`session.py:880-881`), and only a
notification follows (`:900-901`) — a stuck-open valve leaves `active_runs`
empty while water flows.

Keying on the phase would therefore turn every open-confirm window, every
master pre-open, and every failed close into fake "unattributed water" — and
would diagnose a valve that will not close as a system leak.

**Rule: a zone claims its meter while its valve reports open.** This is the
physical truth, it is robust to the failed-close path, and it follows the
precedent already in the codebase — `expected_flow_range` keys off
`zone.valve.is_open` (`runtime.py:273-274`). It also makes Part 1 and Part 2
read the same predicate: "flow while every managed valve reports closed" is
exactly the unattributed bucket, not a second approximation of it.

Per sample, for meter X:

| Zones claiming X | Destination |
|---|---|
| exactly one | all litres to that zone, `source: measured` |
| more than one | split proportionally to `nominal_flow_lpm`; equal split when nominals are missing |
| none | **unattributed** |

Unattributed litres are credited to the meter's scope, not to one pool. When X
belongs to exactly one zone — the SONOFF SWV case, meter inside the valve —
they land in `unattributed[zone_id]`, which localises the leak on the right
valve and is precisely the signal Part 2 consumes. When X is the shared line
meter they land in `unattributed["__hub__"]`: the system leaks, no zone named.

Unattributed does not mean *suspect*, and the two must not be conflated. During
`master_pre_open_s` the master is open and no zone valve is, so the line
pressurises and real litres flow that belong to no zone — every cycle,
systematically. Those are priming litres, not a leak. The bucket therefore
carries two counters: `total_l`, all water no zone claimed, and `closed_l`, the
subset seen while **every** managed valve including the master reported closed.
**Only `closed_l` feeds leak source 2.** Without the split, priming would
inflate the leak signal once per cycle forever.

Unattributed litres are **never** added to a zone's consumption. Two
quantities, two sensors, two rows in the Water dashboard.

**This fixes a shipped double count** (hidden work 1). Today two zones on one
line meter each integrate the full flow and each call `add_consumption`
(`session.py:950-960`, `:883`; exercised by `test_safety_extra.py:229-262` at
`max_concurrent=2`). The proportional split is a behaviour change for
line-meter installs running concurrent zones, declared in the PR and pinned by
a new test — nothing currently pins it either way.

**Fix in passing**: `sensor.py:291` uses `config.flow_sensor is None` where the
runtime uses truthiness (`runtime.py:240-244, :246, :257, :1128`), so a zone
whose meter was cleared to `""` feeds from the line meter without being labelled
`line_meter_shared` (**C10**). The attribution index must reproduce exactly the
set the runner feeds from, so the two must agree.

### 1.3 Zones without a meter

No ledger — there is nothing to integrate. The zone receives
`nominal_flow_lpm × minutes` **once, at cycle end**, marked `source: nominal`.
The nominal fallback stays cycle-scoped (hidden work 15): it is an estimate, not
a measurement, and `test_session.py:640-655` pins that.

Consequence to declare in the degradation matrix: on these zones unattributed
water is structurally invisible, so **leak source 2 does not exist for them**.

Per the user's decision the sensor still carries `device_class: water` and
enters the Water dashboard, with `estimated: true` in attributes. The recorded
reservation, stated once: the Water dashboard total will mix measured and
estimated litres with no visual distinction. Compensated by making the marking
redundant — attribute on the sensor, badge in the zone row, per-day flag in the
history, row in the degradation matrix — so anyone reading the number has three
chances to learn how it was made.

### 1.4 Reading gaps

`flow.py` returns `lpm=0.0` both for a true zero and for "unavailable with a
known unit" — deliberate, because the zero-flow guard must be able to act on it.
For accounting the two are opposites. Additive change: `FlowReading` gains
`available: bool`; no existing consumer changes, they all read `.lpm`.

Ledger rules, declared and tested:

- unit unknown → accumulate nothing, freeze (existing rule, unchanged);
- unit known, unavailable → **accumulate nothing, record the gap**. No
  interpolation (that would invent water) and no zero (that would assert no
  water passed, which we have no right to assert). `gap_s` per day, plus
  `last_gap_at` on the sensor;
- numeric → integrate left-Riemann from the previous sample.

The counter therefore falls behind by exactly the amount not observed, and the
shortfall is legible rather than silent.

### 1.5 Persistence and monotonicity

The cumulative lives in `Store`, is never zeroed or recomputed at startup, and
the sensor reads it from there — no `RestoreEntity`, which would be a second
copy of the same number. The ledger restarts with `_last_at = now`, so the
interval between the last save and the restart is a gap (§1.4), **not** a double
count: it does not resume from the old timestamp. Maximum loss is bounded by the
10 s debounce, and nothing is lost on a clean shutdown because `Store` writes on
final-write. If storage is lost entirely the counter restarts at 0, which
`total_increasing` treats as a meter reset — never a negative delta.

Sensor state is written on a **60 s tick** and at run start/end, not on every
sample (hidden work 4). `test_flow.py:223-255` asserts `dispatches == 0` on a
value-only change, enforced by `runtime.py:1173-1174`; the ledger subscribes
independently of `SIGNAL_UPDATE` and that filter is unchanged. Statistics need a
sample every few minutes, not every tick.

### 1.6 Storage shape and retention

```
water:
  zones:        { zone_id: {total_l, estimated_l} }         # cumulative, never decreases
  unattributed: { zone_id | "__hub__": {total_l, closed_l} } # closed_l = leak signal only
  daily:        { "YYYY-MM-DD": { zone_id: {l, est, gap_s},
                                  "__unattributed__": { scope: {l, closed_l} } } }
  carried_over: { period_start, liters }                    # see §1.8
```

- **The defaults merge is shallow** (**C6**): `storage.py:52-57` takes a stored
  `water` dict as-is and never fills sub-key defaults. Either every accessor
  tolerates missing sub-keys or `async_load` merges the sub-dict explicitly.
  This design does the second — one place, not fifteen.
- **Retention is 730 days**, pruned with the inline `outcome_log` idiom
  (`storage.py:117-120`, ISO-string cutoff plus dict comprehension), **not**
  through `engine/history.prune_history`, which is typed `Mapping[str, float]`
  for flat date→float histories (**C3**).
- **Pruned in `_midnight` only** (**C4**). `prune()` has a hotter second caller
  at `runtime.py:427` inside `async_evaluate`, reached from every trigger fire,
  the `evaluate` service and the evaluate button, capped at ~every 2 minutes by
  the 120 s reuse guard — and `async_evaluate` does not save afterwards. A
  730 × N-zone sweep does not belong there.
- **`drop_zone` keeps the history and drops the live counters** (**R6**).
  Removing a zone removes `water.zones[zone_id]` and
  `water.unattributed[zone_id]` — they back entities that no longer exist — but
  leaves `daily` intact, because deleting it would rewrite past months and make
  the current period's budget total jump. Water that flowed, flowed. It ages out
  at 730 days like everything else. `daily` needs an explicit nested rebuild:
  neither existing `drop_zone` shape fits (hidden work 17), and a `"day:zone"`
  flat key would defeat the zone-first prefix filter at `storage.py:207-213`.
  Pinned in the `drop_zone` contract test (`test_live_reconfigure.py:46-67`).
- **Diagnostics summarises** (hidden work 14). `storage.as_dict()` rides into
  `diagnostics.py:32` wholesale; a 730-day series must be reduced to counts and
  a window there.

### 1.7 Sensors

Per zone, role `zone_water_total`:

```
device_class: water, state_class: total_increasing, unit: L
attributes: estimated, source (measured|nominal|mixed), today_l, month_l,
            meter_entity, last_gap_at
```

Hub, role `hub_unattributed_water`: same classes, cumulative water no zone
claimed. Its state is `total_l`; `closed_l`, `today_l`, `month_l`, `per_scope`
and `since` are attributes. It is measured water and belongs in the Water
dashboard — `closed_l` is the leak, made visible before anything else detects
it.

**No "today"/"this month" entities.** `today_l` and `month_l` are attributes
projected from the same `daily` structure that is written inside the same call
that increments the cumulative — one function, one transaction, so they cannot
diverge. Real daily and monthly graphs come from Home Assistant's statistics
engine, which is the entire reason the sensor is `total_increasing`; the
attributes exist only so the card can show a number without querying the
recorder.

### 1.8 Budget reconciliation

`consumption.liters` stops being an independent counter. `used_liters` for the
period is derived as `carried_over(if the period matches) + sum(daily over the
period)` across zones. **The budget counts attributed water only**, and exposes
unattributed litres alongside it: folding a leak into the budget would let a
leak suspend irrigation through `BUDGET_ACTION_SUSPEND` — the right consequence
from the wrong cause.

**`carried_over` exists because zeroing is not safe** (**C2**, **R7**). The
monthly total is not merely displayed: `_consumption_factor`
(`runtime.py:496-513`) drives `reduce` and `suspend`, and is called at
`runtime.py:584` and `:709`. An upgrade mid-month that resets it to zero
silently disables enforcement for the rest of the period. `carried_over` is an
explicit opening balance with a period stamp and a one-period lifetime: it
expires by itself at the next boundary. It is not a second counter of the same
water — it is a declared addend, named for what it is, that stops existing.

The migration is an **idempotent in-code pop**, wired like `migrate_markers`
(`storage.py:59-63` ← `migration.py:128-143`, called at `runtime.py:125-132`):
`data.pop("consumption", None)` after seeding `carried_over`. Dropping the key
from `_default_data()` alone would **not** remove it — the merge copies unknown
stored keys through verbatim and re-saves them (**C2a**).

A Repairs issue `consumption_history_restarted`, modelled on
`flow_unit_corrected` (`runtime.py:919-962`), states the one-time discrepancy:
the carried balance mixes measured and estimated litres and has no daily
breakdown, so the per-day chart starts at the upgrade date while the budget
total includes the balance.

**`STORAGE_VERSION` stays 1** (**C1**). The defaults-first/stored-wins merge
already absorbs added and removed keys in both directions. A *major* bump with
the plain `Store` at `storage.py:31` makes HA's base `_async_migrate_func` raise
`NotImplementedError` (`homeassistant/helpers/storage.py:620-622`, re-raised at
`:449-460`), propagating out of `RuntimeState.async_load` → `runtime.py:123` →
setup failure on **every existing install**. A `minor_version` bump is the only
safe marker if one is ever wanted.

### 1.9 No seeding service

The optional "set the initial counter value" service is **not shipped**. The
reference user has explicitly said prior history does not matter, and the
feature would add a write path into a monotonic counter for no stated need.
Stated in the PR so the omission is a decision, not an oversight.

### 1.10 Touch points

`flow.py` (`available` flag) · new `engine/metering.py` · new `accounting.py` ·
`storage.py` (water section, deep merge, 730-day prune, `drop_zone`) ·
`migration.py` (+ its first test) · `session.py` (`FlowMonitor` becomes a
subscriber) · `runtime.py` (accountant lifecycle in `_track_flow_sensors`,
second `add_consumption` entry point for out-of-cycle water — hidden work 15,
`_consumption_factor` reads the derived total) · `sensor.py` (two new roles, the
`is None` fix) · `diagnostics.py` (summarise) · `docs/design/card-contract.md` ·
`card/src/{types,discovery,zone-row}.ts` + `localize/{en,it}.ts` ·
`translations/{en,it}.json` · README degradation matrix · CHANGELOG ·
`manifest.json` → 3.3.0.

**Prose that names the old behaviour and goes stale** (hidden work 6, 13): the
`flow_unit_corrected` Repairs text names "the consumption counter" in both
locales, `runtime.py:931-936` repeats the promise, plus
`docs/design/architecture.md:142`, `docs/design/card-contract.md:23`,
`CHANGELOG.md:80`, the `flow.py:1-6` and `storage.py:1-8` docstrings,
`test_flow.py:230-231`, `test_session.py:579` and `MEMORY.md:239-245`.

### 1.11 Tests

`tests/engine/test_metering.py` (pure: rate × interval, gaps, clamping, daily
rollup, retention window on both edges — 730 in, 731 out, idempotent) ·
`tests/components/test_metering.py` (HA-wired: attribution to the right zone
during a cycle and to the unattributed bucket outside one; proportional split
across concurrent zones; meter unavailable mid-cycle produces no phantom
litres; meterless zone yields an estimate marked as such; budget and per-zone
totals stay consistent) · `tests/components/test_metering_restart.py`
(mid-cycle restart: no double count, no backward jump) · plus the pinning tests
from Part 0.

Test infrastructure, corrected against the repo (**C-testinfra**): there are no
hub/zone fixtures. `tests/conftest.py` holds three autouse fixtures, none about
hubs; construction is via module-level helpers imported from
`tests/components/test_session.py` — `setup_hub(hass, zones, options)` and
`zone_data(...)`. Time advances with `freezer.move_to(START)` then
`await advance(hass, freezer, seconds, step=10.0)`, a free async function at
`test_session.py:121-139` (not a `MockValvePark` method — `MockValvePark` has
`add`/`set_behavior`/`force_state`/`.commands` only). Use `step=1.0` when a
checkpoint must land inside a 120 s monitor window. All `async_call_later`
callbacks must be `@callback`-decorated.

**Existing tests that encode "litres are counted only during cycles"**
(**R1**): `test_session.py:617-637`
(`test_consumption_counts_real_litres_from_a_cubic_metre_meter`) parks its meter
at a nonzero value at `:624` and never zeroes it, so under continuous
integration it reads 7.5 L/min across all 42 advanced minutes while the valve is
closed for ~32 of them, and the `60 <= liters <= 90` bound at `:637` becomes
~315 L. Rewrite the fixture to drive the meter to 0 outside the run window,
keeping the 4.5 L un-converted sentinel it was written to catch. Audit the
safety fixtures that also park a nonzero meter across the whole advance
(`test_safety_extra.py:450, 502, 573, 624`) — they assert on
`outcome["volume_l"]` and should survive, but they would feed phantom pre-cycle
litres to a leak detector. `test_storage.py:90-97`
(`test_consumption_period_reset`) encodes the reset-on-write semantics being
deleted and needs rewriting, not porting. Each correction explains in its commit
message why the old assumption no longer holds.

---

## Part 2 — Leak detection

### 2.1 Capabilities are detected, never matched by name

The entity ids in the brief come from one real installation and are examples,
not a convention. No string matching on `_water_leak`, no prefixes, no assumed
manufacturer.

New `capabilities.py`: given a zone's valve entity, entity registry →
`device_id` → device registry → every entity of that device → filter
`binary_sensor` by `device_class` (`moisture` → leak, `problem` → water
supply). `device_class` is read from the registry entry when present, falling
back to state attributes, so detection works before the entity has a state.
**There is no existing idiom** — no module reads a foreign entity's
`device_class` today (**C-capabilities**); the closest analogue is
`card/src/panel/flow-units.ts` `detectedFlowUnit`, which sniffs a unit from
`hass.states`. This establishes the backend one.

It must be backend: `HomeAssistant` in `card/src/types.ts:164-178` exposes only
`states`, `language`, `locale`, `services`, `callService`, and `HassEntity` is
`{entity_id, state, attributes}` — no `device_id`, no registries. So a new
response service `discover_zone_sensors` (`SupportsResponse.ONLY`), shaped like
`export_config` / `notification_status` (`services.py:1509-1531`), declared in
`services.yaml` **and** registered — two distinct places in the file.

**Detection proposes, storage decides.** What acts at runtime is only what is
written in the zone's configuration; never a discovery applied implicitly,
which would be an invisible coupling between two devices that nobody
authorised. Two insertion points, following the 3.0.0 convention that the
creating service writes the defaults:

- `add_zone` runs discovery **server-side** and writes what it finds. This
  needs no schema change: `add_zone`'s voluptuous schema has no `ALLOW_EXTRA`
  and its whitelist is duplicated in `panel.ts:361-386` and
  `zone-editor.ts:390-409`, so a create-time *input* field would be a
  three-way change (hidden work 8) — writing it server-side is free.
- The panel zone editor **pre-fills** both selectors with the candidates and
  shows their provenance, reusing the `.field-note` "detected: X" idiom already
  at `zone-editor.ts:281-308`. It lives in the **Avanzate** drawer, which
  renders only when `isEdit` (`zone-editor.ts:234-244`) — the natural home
  beside the flow sensor, and it leaves `add_zone`'s schema, `panel.ts`'s
  whitelist and the `isEdit` guard untouched.

The user can change it, clear it, or point at an entity on a different device —
a ground flood probe near the bed is legitimate and needs no special case.

Pre-existing zones are touched by no migration. They stay declared without
detection until the user opens the editor, where the field is already filled.
They do not stay silent, though — `zone_state` gains:

```
capabilities: {
  water_accounting: "measured" | "estimated" | "unavailable",
  leak_detection:   "configured" | "candidate_available" | "unavailable",
  water_supply:     "configured" | "candidate_available" | "unavailable"
}
```

`candidate_available` means "your hardware could do this, you have not told it
to" and the card renders it as an invitation. `unavailable` is a capability
declared absent — the point of the brief: never an alarm that will silently
never fire. Resolution is **per zone**, so in a mixed installation each zone
reports its own.

### 2.2 The three sources

**Source 1 — the valve's leak sensor** (`moisture`, `on` = leak). Shares the
confirmation delay with source 2. Messages stay generic — *"the valve of zone X
reports a leak"*, never *"water detected on the ground"* — because on SWV that
binary sensor is an alarm derived from the valve's internal flow meter ("water
is passing while I am closed"), which ZHA maps to `moisture` as the nearest
available class, while on other hardware the same class is a physical probe. Any
wording that presumes one is false for the other.

**Source 2 — flow with the valves closed.** The one check only this component
can make, because only it knows when it commanded the closure. It consumes
`closed_l` from the unattributed bucket of §1.2 — already per meter, therefore
already localised on the zone when the meter is the zone's own, and already
free of the per-cycle priming litres that `total_l` includes. Condition: every managed
valve (master included) reports closed **and** flow ≥ `leak_threshold_lpm`
sustained for `leak_confirm_s`. Defaults 0.5 L/min and 300 s, both in the
Advanced drawer. The timer starts when the last valve closes and resets whenever
flow drops below threshold, so residual post-cycle drainage does not alarm: to
do so it would have to run above threshold for five unbroken minutes, which is
not drainage. One mechanism rather than a threshold plus a separate blanking
window.

This is the source that brings leak detection to hardware exposing only a flow
meter. Where the firmware already does it (source 1), the two unify — see §2.3.

**Source 3 — water supply missing** (`problem`, `on` = **problem, i.e. no
water**). Inverted with respect to how the name `water_supply` reads, and the
mistake everyone makes on the first attempt. It is not a leak and does not go
through the leak alarm. It does three things:

1. explains a zero-flow cycle: the outcome carries `reason_key:
   no_water_supply` instead of the generic diagnosis;
2. **blocks the start of a cycle**, by default, outcome `skipped`, reason
   `no_water_supply`. Rationale: with no water the cycle does not water anyway,
   so blocking costs the garden nothing — it saves a pointless valve actuation
   and replaces an interrupted cycle with an outcome that says why. Configurable
   (`require_water_supply`, default on) because a flaky sensor must not be able
   to stop the system without appeal;
3. while the supply is missing: a Repairs issue and a notification on the
   existing `anomaly` channel.

This is entirely new configuration surface, not a read of existing state:
`grep -rn water_supply` over the repository returns nothing. It needs
`CONF_WATER_SUPPLY_SENSOR` near `const.py:87`, a `water_supply_sensor` field on
`ZoneConfig` and `from_subentry` (`models.py:189-208`), an entry in
`_ZONE_PATCH_KEYS` (`services.py:467-478`) with its `ATTR` and `services.yaml`
schema, and a panel field. `CONF_LEAK_SENSOR` follows the same path.

Adding a reason key is a four-file change (hidden work 16): `session.py:49-56`,
`card/src/types.ts:35-63`, `en.ts:96-129` and `it.ts` **at the same index**, and
`docs/design/card-contract.md:279-291` — plus `runtime.py:839`'s
`reason in ("manual_intervention",)` tuple if it must notify as an interruption
rather than a cancellation.

### 2.3 One alarm per zone

Sources 1 and 2 converge into one `LeakDetector` per zone with a single state:

```
active, since, first_source, sources: {valve_sensor, no_flow_closed}, last_notified_at
```

The notification fires on the `false → true` transition, repeats every
`leak_repeat_min` (default 6 h) while the condition persists, and a clearing
notification closes it on `true → false`. A second source firing while the alarm
is already active **only adds its name to `sources`** — no second notification.
This is the real SWV case, where the firmware already performs the
valve-closed detection and both sources observe the same physical event.
`first_source` stays recorded: "the valve told me" and "I measured it" are
different diagnostic facts even at equal alarm.

Repairs issue `leak_<zone_id>` created on activation and deleted on clearing,
because a notification is read and forgotten while an issue stays.

New event key `leak` in `notify.py`, in `GROUP_CRITICAL` for presentation
**and** in `ESSENTIAL_EVENTS` for the four consumers that set governs — that is
how it becomes proposed-on-by-default in the wizard, inherits high priority,
feeds the vanished-recipient repair and counts in the definition of "mute".
`ESSENTIAL_EVENTS` is deliberately not a display group (MEMORY.md:225-229);
joining both is correct, not duplication. The rejection of "enabled with an
empty recipient list" is already generic and the new key inherits it.

Consequences to sweep: `services.yaml` carries **three copies** of the event
list and nothing tests it — a missed block makes the key unpickable in Developer
Tools while the service still accepts it, so all three change and a test asserts
they agree (hidden work 9). Two prose strings enumerate the essential four and
go stale: `en.json:726`
(`services.set_notifications.fields.priority.description`) and
`en.json:833-834` (`issues.notifications_silent.description`), plus their
Italian mirrors and the Italian docs. `localize.test.ts:26-28` asserts key
**order**, not just the key set, between `en.ts` and `it.ts` — insert at the
identical index in both; `tests/test_translations.py:34-45` enforces set parity
for the JSON locales.

### 2.4 What the component does

`leak_action`, hub-level, default `close`:

- `notify` — notification and Repairs only;
- **`close`** (default) — notification, Repairs, and one re-close attempt of the
  master and the implicated valve, registered in the command ledger so
  surveillance does not read it as manual intervention. It recovers a valve left
  open by a lost command; it does not repair a seeping seat and does not pretend
  to; it dries nothing on a false positive because cycles continue;
- `close_and_block` — as above, plus no new cycles on the affected zone while
  the condition persists.

Closing when everything is already closed is a no-op, which is exactly why
blocking is a separate, opt-in axis rather than folded into the default: the
honest position is that the component cannot stop a leak it detects while idle,
only report it and re-assert the closure.

**Prerequisite fix** (hidden work 7): `_close_valve` (`session.py:973-982`)
calls `ledger_expect(..., "close")` with no `is_closed` guard;
`async_wait_until` returns immediately (`valves.py:67`), no transition occurs,
and the entry survives its 60 s TTL where it can absorb a genuine manual close.
`runtime.py:346-351` guards correctly. Any re-close path hits this every time,
so it is fixed first.

### 2.5 The valve that closes itself

The SWV exposes `switch.<valve>_chiusura_automatica_per_mancanza_d_acqua` and
closes itself when it detects no flow. The component must not fight it.

Today an unledgered close during a session is manual intervention and aborts
everything. The exception is surgical: an **unledgered close**, of the **valve
of the zone that is watering**, while **that zone's** `water_supply` sensor
reads no water → legitimate closure. The run ends with `no_water_supply`, no
global abort, no manual block.

**Strictly** (**C-surveillance**): exempt only when the sensor is configured
**and** `state == "on"`. `unavailable`, `unknown`, a missing entity, or no
sensor configured all fall through to the existing `manual_intervention` abort —
consistent with the project rule that uncertainty resolves to the safe side
(`session.py:13-14`, `valves.py:17`). Without a supply sensor there is no way to
tell the firmware's self-close from a hand on the switch, and the
manual-intervention guarantee is not weakened where the evidence to weaken it is
absent.

**The exemption is per zone** (**R5**): it does not call `set_manual_stop`
(`session.py:551-553`), so other zones continue — correct for a single-zone
outage. A whole-line outage resolves itself as each zone hits the same
condition. It does not drive `_close_master` beyond the normal end-of-segment
path.

**One terminating path, explicitly**: the suppressed abort
must end the run immediately with `no_water_supply` rather than letting the
zero-flow guard decide by accident up to 120 s later
(`ZERO_FLOW_GRACE_S`, `session.py:119`). Today they cannot race —
`_trigger_manual_abort` (`session.py:544`) resolves `_water`'s `_race`
(`:964`) before the guard's window elapses — and suppressing the abort is
exactly what would create the race. Handing off deliberately keeps one outcome
instead of two possible ones.

### 2.6 Degradation matrix

Four new rows: continuous accounting (needs a meter with a resolvable unit →
otherwise a per-cycle estimate and no unattributed-water detection); source 1
(needs a configured `moisture` → otherwise declared absent for that zone);
source 2 (needs a meter → same); source 3 (needs a configured `problem` → no
pre-emptive block, and a dry cycle stays diagnosed as generic zero-flow).

### 2.7 Tests

`tests/components/test_leaks.py` — a dedicated file, because
`test_safety_extra.py` is 728 lines and is the *in-cycle* safety file, while
leak sourcing is its mirror image (flow observed while every valve is closed).
Reuse its proven steering idiom for placing events inside monitor windows.
Coverage: each source fires alone; an absent source raises no false alarm and no
exception; sources 1 and 2 firing together on one zone produce **one** alarm;
drip within threshold and confirmation delay does not alarm; a persistent leak
gives one notification then repeats at the configured interval, not one per
detection; clearing sends the closing notification and resolves the Repairs
issue; a self-closing valve is a legitimate closure, and is not when the supply
sensor is `unavailable`.

`tests/components/test_capabilities.py` — structured like `test_flow.py`
(24 tests, the closest existing analogue and itself capability detection in
miniature): pure resolution first, then late appearance, then config update
without reload, then withdrawal when the capability disappears. Coverage: a
valve whose device exposes a `moisture` binary sensor is proposed automatically;
one that does not is declared unavailable for that zone with no silently
inactive alarm; a mixed installation behaves per zone; a user-specified sensor
on a different device is accepted; `water_supply` with `device_class: problem`
has the right polarity, `on` = no water. Degradation is asserted through the
entity contract via `role_state(...).attributes["degraded"]`, as
`test_entities.py:310` does.

**Frontend** (**R8**): there is no `zone-row.test.ts` or `card.test.ts`, and
`discover()` itself is untested. New badge and number logic is factored into a
pure helper beside `zoneHasFlowMeter` (`discovery.ts:122-138`) and tested in
`discovery.test.ts`, rather than landing in an untested render path —
retrofitting a harness afterwards is the expensive order.

**CI** (hidden work 11): one `npm run build` emits both `frontend/*.js`; commit
them in the same change and bump `manifest.json` for cache-busting.

---

## Delivery

Two branches, two PRs, merged one at a time. Each with tests, changelog and a
`manifest.json` bump (3.3.0, then 3.4.0). The PR descriptions state:

- how litres are attributed and what happens to unattributed water;
- how counter monotonicity survives restarts and reloads;
- that no "today"/"this month" entities were exposed, and why the statistics
  engine plus derived attributes was preferred;
- how the existing monthly budget was reconciled with the new per-zone data,
  including `carried_over` and the one-time Repairs notice;
- what the component does on leak detection and why that;
- the two shipped behaviour changes: the concurrent-zone double count fixed by
  proportional splitting, and the `line_meter_shared` truthiness fix.
