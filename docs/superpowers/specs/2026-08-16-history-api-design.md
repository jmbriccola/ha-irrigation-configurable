# History API — design

**Date**: 2026-08-16
**Branch**: `feat/history-api`, from `main` at 3.4.0. **Version**: 3.5.0.
**Scope**: two read-only services that expose history the component already
holds or is about to start holding, plus the storage that makes the second one
possible. No frontend work — this is the prerequisite the three Lovelace cards
(zone, hub, compact) are built on, each of which gets its own branch afterwards.

**Out of scope, unconditionally**: the decision engine. `engine/weather.py`,
`engine/curves.py`, `engine/evaluate.py` and `engine/history.py` are
field-validated and are not touched; their hashes are recorded before the first
commit and verified before the PR. Weights, thresholds, water budget, forecast
credit, weighted temperature, immediate skips and the `PRESET_POTS` /
`PRESET_LAWN` control points are not touched either.

**Also out of scope**: "next irrigation resolved against the gates". That is a
separate branch (`feat/next-run-gates`) for reasons stated under "What this
branch deliberately does not do" below.

---

## The gap

Two of the seven diagnostic readings the cards must offer have no reachable
data behind them today, and they fail in opposite ways.

**Water history is held and unreachable.** 3.4.0 keeps a per-zone daily summary
pruned to 730 days (`engine/metering.py`, `RETENTION_DAYS`), with `l`, `est`,
`gap_s` and `closed_l` per day and per key. It exists precisely so a card can
draw a history without querying the recorder and without depending on the
user's `purge_keep_days`. `IrrigationStore.daily_water()` already returns a
read-only three-level copy of it, and its docstring already says
"diagnostics, card". **No service exposes it.** The frontend cannot reach it at
all. This is a wrapper, not new plumbing.

**Run history is not held.** "A cycle that does not start is a non-event, and
non-events are the ones that get away" is the requirement; nothing in the store
can answer it. `outcome_log` (`storage.py:226`) keeps
`day -> "zone:program" -> result` — a bare result string, with no `reason_key`,
no duration, no litres — and is **pruned to three days** (`storage.py:143`),
because it is sentinel evidence, not a history. `last_outcome` keeps only the
most recent outcome per zone. So the component today can say *that* something
was skipped this morning, for about 72 hours, and can never say *why*.

The two services below close both. They are separate services because they
answer separate questions — see §6.

---

## 1 · Where the run log lives

A **second `Store`**, `irrigation_maestro.runs.<entry_id>`, alongside the
existing `irrigation_maestro.<entry_id>` — not a new section inside it.

`RuntimeState.schedule_save()` rewrites the whole `_data` dict, and it is
called constantly: on every litre-bearing meter sample (up to once a minute),
on every session phase transition and segment end, on every zone/program enable
toggle, on every rain-sensor reading, at midnight. The run log at the retention
decided below reaches ~720 KB on a two-zone installation and ~2 MB at the entry
cap. Appending that to the hot state file would multiply write amplification on
what is usually an SD card, for a series that changes a handful of times a day.

Separate file, separate lifecycle: loaded once at setup, written only when an
outcome is recorded or the midnight prune runs.

**Consequences that must be honoured, not discovered later:**

- `RunLogStore` is constructed and loaded in `IrrigationRuntime.__init__` /
  `async_setup` beside `RuntimeState` (`runtime.py:203` / `runtime.py:287`).
- Its own `STORAGE_VERSION_RUNS: Final = 1` in `const.py`. It does not share
  `STORAGE_VERSION`: two files with independent schemas must be able to
  migrate independently, and reusing one number would force a bump of one for
  a change to the other.
- `async_save_state` (`runtime.py:3458`) saves both, so an orderly shutdown
  flushes the run log too.
- Removing the config entry must remove both files.

### 1.1 Pure arithmetic in `engine/runlog.py`

New file, same role and the same rules as `engine/metering.py`: no Home
Assistant imports, no clock of its own, the caller passes both. It holds
`append_run`, `prune_runs`, `cap_runs` and `select_runs`. The four frozen
engine files are untouched; `engine/metering.py` gains one function (§5.2) and
is not among them.

---

## 2 · The run entry

```json
{"at": "2026-08-16T04:30:12+00:00",
 "zone_id": "1b2f3c4d5e6f", "zone_name": "Vasi",
 "program_id": "a1b2c3d4", "program_name": "Mattino",
 "result": "skipped", "reason_key": "budget_sufficient",
 "scheduled": true}
```

A **flat list in append order**, oldest first — not a `day -> [...]` map. The
prune is a slice, the cap is a slice, and a range query is a filter; a
day-keyed map would buy nothing and would make "the 500 most recent" awkward.

`duration_min`, `volume_l` and `partial` are written **only when they exist**.
A skip has no duration and no litres, and writing them as `null` costs roughly
15% of the file to say nothing. Readers use `.get()`; absent and `null` mean
the same thing and both mean "this run has no such figure".

`partial` is likewise written only when it is `true`; `false` is the default
and needs no storage.

`at` is the **UTC** ISO instant, exactly as `last_outcome` already stores it
(`runtime.py:1023-1024`: `now = dt_util.utcnow()`, then `"at": now.isoformat()`).
No separate `day` field: it is derivable, and a second representation of one
fact is a second thing that can drift — the same rule that keeps a derived
`minutes` attribute off the zone sensor.

**Bucketing to a calendar day is therefore a conversion, not a string
comparison.** An entry belongs to the local day of `dt_util.as_local(at)`,
which is what `record_run_outcome` itself already computes one line below
(`today = dt_util.as_local(now).date()`). Filtering on the raw UTC string would
misplace every entry whose local time is earlier than the zone's offset, since
those carry the **previous** UTC date: for CET that is 00:00–00:59, for CEST
00:00–01:59. A program set to start at 00:30, or a sunrise trigger with a large
negative offset, lands there — and the entry would be filed a day early, which
is exactly the kind of off-by-one that reads as correct until a chart's first
or last day is wrong. West of Greenwich the error runs the other way, on the
late-evening hours.

### 2.1 Names are denormalised at write time

`zone_name` and `program_name` are copied into the entry, not looked up on
read.

A removed zone **keeps its runs**, for exactly the reason the daily water
history keeps a removed zone's litres (`storage.drop_zone`: deleting them would
rewrite past months). Without the stored name, what survives is an unreadable
subentry id. The stored name is also the more honest one: it is what the zone
was called when it ran, not what some later zone with the same id is called
now. The same applies to a renamed or deleted program.

`program_name` is resolved at write time from
`runtime.zones[zone_id].config.cycles`, falling back to `None` when the zone or
program is already gone (a `zone_removed` cancellation is exactly that case).
`zone_name` needs no lookup: every caller already passes it.

### 2.2 `scheduled` distinguishes a manual run from a program

Both call sites already pass it (`session.py:949`, `runtime.py:827`). It is
kept because a card showing "this program has not run for eleven days" must not
count the three times the user pressed *Irriga ora*, and because a manual run
deliberately bypasses the decision gates — its presence in the log says nothing
about whether the gates would have allowed it.

### 2.3 One writer

`IrrigationRuntime.record_run_outcome` (`runtime.py:1006`) is already the sole
funnel for every outcome the component records: completions and abnormal ends
via `session.py:940`, plan-time skips via `runtime.py:822`, session-overrun
skips via `session.py:971`. It already receives `zone_name`, `reason`,
`minutes`, `liters`, `partial` and `scheduled`.

**One line is added there**, next to the existing `set_last_outcome` /
`record_outcome` pair. No second write path anywhere — the rule this repo
applies to litres (`add_water` is one transaction for the cumulative and the
daily) applies here for the same reason: two writers are two histories that can
disagree.

Confirmed by reading: no outcome reaches storage by any other route.

---

## 3 · Two limits, and how each declares itself

**Retention: 730 days**, aligned with the water history so the two series cover
the same period and a chart cannot have half its history missing. Pruned on the
existing midnight housekeeping (`runtime._midnight`, `runtime.py:3443`), beside
`state.prune_water(today)` — the once-a-day callback that already saves.

**Entry cap: `MAX_RUNS: Final = 8000`**, applied on append, dropping from the
head. Retention alone does not bound the file: 730 days times an installation's
run rate is unbounded in the run rate. 8000 entries is ~2 MB at ~250 bytes
each — the worst case, absolutely. It never bites below eleven recorded
outcomes per day, so an installation of two zones with two programs (~4/day,
~2900 entries) keeps the full 730 days and never meets it. A ten-zone,
three-program installation (~30/day) settles at ~266 days.

Both limits are **declared in every response** that they could have affected.
The two flags are distinct because they send the user to different
conclusions: one says "you asked for more than this component ever keeps", the
other says "your installation produces more runs than this component holds at
once".

- **`truncated_by_retention`** — a pure date comparison: the requested
  `start_date` predates the retention floor. No stored state needed, and no
  ambiguity.
- **`truncated_by_cap`** — needs one piece of stored state, because otherwise
  it cannot be told apart from a log that simply has not been running long
  enough. A fresh 3.5.0 install has an `oldest_kept` of yesterday and has
  truncated nothing; the shape of that fact is identical to a cap that ate
  eighteen months.

  So the run store keeps **`cap_dropped: int`**, a monotonic count of entries
  the cap has ever removed, and the flag is
  `cap_dropped > 0 and start_date < local_day(oldest_kept)`.

  Stated exactly, that flag means: *the cap has removed entries at some point,
  and your window begins before the oldest entry I still hold.* It does not
  prove those particular entries fell inside your window — a request whose
  start predates the log for an unrelated reason, on an installation where the
  cap has bitten at some time in the past, sets it too. That residual is a
  false *warning*, never a false all-clear, which is the safe direction here
  and the same asymmetry the leak module settles on: hold what withholds.
- **`oldest_kept`** — the `at` of the oldest entry actually in the log, or
  `null` when it is empty.

A cap that does not declare itself reads as "everything is covered" to a user
who is not covered.

### 3.1 Date semantics, shared by both services

Both services resolve their range identically. Fixing this once here is the
point: two services that disagreed about what "last 30 days" means would put
two charts on one screen that do not line up.

- Dates are **local calendar days**, inclusive at both ends. `start_date` and
  `end_date` are `cv.date`.
- `end_date` defaults to today and is **clamped to today** when a future date
  is passed. Neither history can hold tomorrow, and answering a future range
  with zeroes would assert observation of a day that has not happened.
- `start_date` defaults to `end_date − 29 days`, giving a 30-day inclusive
  window.
- `start_date > end_date` is a `ServiceValidationError`
  (`invalid_history_range`, translated in both locales). It is not silently
  swapped: a caller that has its arguments backwards has a bug, and quietly
  fixing it hides the bug.
- The **retention floor is `today − 729 days`**, not `end_date − 729`. The
  prune runs against today, so what the component holds is a window anchored
  to today; a request for a range that ended six months ago is still limited
  by what survived until now. `start_date` before the floor is clamped to it
  and the retention flag is set.
- Numbers are rounded in the response, not in storage: litres to 3 decimals
  (millilitre resolution — small enough to be exact for any real meter, short
  enough that 7300 dense points do not carry float tails), `gap_s` to 1.

---

## 4 · `get_run_history` — `SupportsResponse.ONLY`

### 4.1 Fields

| field | type | default |
|---|---|---|
| `start_date` | date | `end_date` − 29 days |
| `end_date` | date | today (local) |
| `zone_id` | string or list of strings | omitted = every zone, including removed ones present in the log |
| `result` | string or list: `completed` \| `skipped` \| `interrupted` \| `cancelled` | omitted = every result |
| `limit` | int, 1–5000 | 500 |

`zone_id` accepts one or many through `cv.ensure_list`, which is how the
brief's "one, some, all" is expressed without a second field; `result` does the
same. Dates follow §3.1 exactly.

### 4.2 Response

```json
{"start": "2026-07-18", "end": "2026-08-16",
 "retention_days": 730, "oldest_kept": "2026-02-03T04:30:00+00:00",
 "truncated_by_retention": false, "truncated_by_cap": false,
 "truncated_by_limit": false, "count": 37,
 "runs": [{"at": "…", "zone_id": "…", "zone_name": "Vasi",
           "program_id": "…", "program_name": "Mattino",
           "result": "completed", "reason_key": null,
           "duration_min": 32, "volume_l": 118.4,
           "partial": false, "scheduled": true}]}
```

**Chronological order, oldest first** — the same direction as the water series,
so a card can put the two on one axis without reversing either. A list view
that wants newest-first reverses in the card, which is one line; a chart that
had to reverse a series to align it would be a defect waiting to happen.

**When `limit` bites, the most recent are kept** and `truncated_by_limit` is
set. Filter, then take the tail, then return that tail in chronological order.
Truncating the *newest* would answer a question nobody asks.

`count` is the length of `runs` — what was returned, after every filter and
after `limit`. Not the pre-limit match count: a caller reading `count` is
reading the list it holds.

Entries are returned exactly as stored, with absent optional keys normalised to
`null` in the response (`reason_key`, `duration_min`, `volume_l`, and `partial`
to `false`) — the wire format is explicit even though the stored format is
sparse, because a service response is a contract read by consumers who did not
write the storage.

---

## 5 · `get_water_history` — `SupportsResponse.ONLY`

### 5.1 Fields

| field | type | default |
|---|---|---|
| `start_date` | date | `end_date` − 29 days |
| `end_date` | date | today (local) |
| `zone_id` | string or list of strings | omitted = every configured zone, plus every unconfigured zone holding litres in range |
| `include_unattributed` | bool | `true` |

Dates follow §3.1 exactly.

A **configured zone with no litres in the range is returned**, with an all-zero
dense series — not omitted. A zone that has not watered this month is a fact
the card must be able to draw; leaving it out would make it indistinguishable
from a zone that does not exist, which is the degradation the cards are
required to avoid. Naming a zone explicitly in `zone_id` returns it on the same
terms, so a card that asks for one zone always gets one series back and never
has to handle a missing key.

### 5.2 The series is dense — one point per day

This is the decision with the most consequences in this branch.

The stored daily history is sparse: a day on which a key booked neither litres
nor gap seconds has no record. The response densifies it across the requested
range, emitting `{"date": …, "l": 0.0, "est": false, "gap_s": 0.0}` for such a
day.

The reason is the requirement itself. A card must tell three things apart that
a sparse response collapses into one absence:

| what the card sees | what it means |
|---|---|
| `l: 0.0, gap_s: 0.0` | the day was fully observed and no water passed |
| `l: 0.0, gap_s: 21600` | six hours in which the meter could not be read |
| a date outside `[oldest_available, end]` | we do not know |

The second is *exactly* the false reading the water-accounting architecture
exists to prevent — "a day with a six-hour hole read as a normal day". The
stored model already distinguishes it (`roll_into_day` is called with
`liters=0` and a positive `gap_s`, and that call is documented as ordinary
rather than a no-op), so the data is there; a sparse response would push the
reconstruction into every consumer, and one of them will get it wrong.

The cost is size: dense means `days × zones` objects. That is why the default
window is 30 days and the card asks for the window it draws. A full 730-day,
ten-zone request is ~7300 objects and is the caller's explicit choice.

The densification is a new pure function in `engine/metering.py`
(`daily_series`), which is that module's job — "pure metering arithmetic" — and
is not among the four frozen files.

### 5.3 Response

```json
{"start": "2026-07-18", "end": "2026-08-16",
 "retention_days": 730, "oldest_available": "2024-08-18",
 "truncated_by_retention": false, "unit": "L",
 "zones": [{"zone_id": "1b2f3c4d5e6f", "zone_name": "Vasi",
            "total_l": 1234.5,
            "days": [{"date": "2026-07-18", "l": 42.0,
                      "est": false, "gap_s": 0.0}]}],
 "unattributed": {"total_l": 12.0, "closed_l": 3.0,
                  "days": [{"date": "2026-07-18", "l": 0.4,
                            "gap_s": 0.0, "closed_l": 0.4}]}}
```

- `total_l` per zone is the sum of the returned range, not the zone's all-time
  cumulative — that is `sensor.<zone>_acqua_totale` and duplicating it here
  would be a second number for one fact.
- `oldest_available` is the **retention floor** of §3.1 (`today` − 729 days),
  not the oldest day with data. "No water in January" and "January is outside
  what this component keeps" are different statements, and only the floor can
  make the second one.
- `zones` is ordered by the zone's configured `order`, then by name — the same
  sort the session queue uses, so a card listing zones in one place and
  charting them in another gets one order. Zones no longer configured (§5.5)
  have no `order` and sort last, by name.
- There is no cap flag here. The water history has one limit, retention, and
  the daily model is bounded by construction: one record per day per key, no
  matter how many runs produced it.

### 5.4 Unattributed water is a sibling of `zones`, never a member

It sits under its own top-level key, outside the `zones` list.

Unattributed water is not consumption. `metering.sum_period` already excludes
it by construction, and the budget excludes it on purpose — letting a leak into
the budget would let it suspend irrigation, the right consequence from the
wrong cause. Putting it in the same list as the zones would make "sum the
zones" the wrong operation, silently, for every consumer who does the obvious
thing. Structural separation instead of a convention to remember.

`closed_l` rides along on the unattributed days because it is the only figure
leak detection reads, and a card showing a leak history needs the subset
measured with every managed valve shut — not the total, which includes the line
priming that happens on every single cycle.

`include_unattributed: false` omits the key entirely rather than emitting an
empty object, so a consumer cannot read "no unattributed water" from a request
that never asked.

### 5.5 Removed zones

A zone whose litres remain in the daily history but which no longer exists is
returned with `zone_name: null`. It is not filtered out: its water flowed, it
is in the account, and a monthly chart that silently omitted it would not add
up to the budget figure printed beside it.

---

## 6 · Why two services and not one

The brief asked for one service. This is the deliberate deviation.

They are different questions at different granularities: one row per day per
zone against one row per event; date-and-zone filters against
date-and-zone-and-result-and-limit; a natural window of months against a
natural window of weeks. A card drawing twelve months of consumption does not
want two thousand run records riding along, and a card listing this week's
skips does not want 3650 daily water points.

A single service would need a `include`/`series` discriminator and would return
a union type whose halves are never both wanted. Two names, two shapes, two
schemas that `services.yaml` can describe honestly.

---

## 7 · Diagnostics

`diagnostics.py` gains a bounded run-log section: **the last 50 entries** plus
`count`, `oldest_kept`, `newest`. The reasoning is already written in that file
for `_water_daily_summary` — the full series is the one part of the state too
big for a diagnostics payload, and dumping it would bury everything else under
something nobody reads at a glance.

---

## 8 · Touch points

| file | change |
|---|---|
| `engine/runlog.py` | **new**. `append_run`, `prune_runs`, `cap_runs`, `select_runs` — pure, clock injected |
| `engine/metering.py` | `daily_series` — dense per-day projection over a range |
| `storage.py` | **new** `RunLogStore` class: own `Store`, `async_load`, `async_save`, `schedule_save`, `append`, `prune`, `entries`, `cap_dropped`, `oldest_kept` |
| `const.py` | `STORAGE_VERSION_RUNS`, `RUN_RETENTION_DAYS`, `MAX_RUNS` |
| `runtime.py` | construct + load `RunLogStore`; one append in `record_run_outcome`; prune in `_midnight`; save in `async_save_state`; remove the file with the entry |
| `services.py` | `SERVICE_GET_WATER_HISTORY`, `SERVICE_GET_RUN_HISTORY`, their schemas, their handlers, **and their registration** — two distinct places |
| `services.yaml` | both services declared with fields and selectors |
| `translations/en.json`, `it.json` | `services.get_water_history`, `services.get_run_history` — names, descriptions, every field — plus `exceptions.invalid_history_range` |
| `diagnostics.py` | bounded run-log section |
| `docs/design/card-contract.md` | both services in the services table, with response shapes — this is what the three card branches read |
| `manifest.json` | 3.5.0 |
| `CHANGELOG.md` | 3.5.0 section |

`README` / `docs/it/*`: the two services are user-callable from Developer
Tools, so they belong in the guides. Italian terminology is fixed at coinage,
in both files, per the 3.2.1/3.4.0 rule: *storico dei consumi* for the water
series, *storico delle esecuzioni* for the run log, *acqua non attribuita*
unchanged, *litri stimati* for `est`, *secondi non osservati* for `gap_s`.

---

## 9 · What this branch deliberately does not do

**"Next irrigation resolved against the gates" is not here.** The brief records
it as an open follow-up on `ZoneNextRunSensor`; that follow-up was closed in
2.0.0. The sensor already projects each enabled program forward up to 366 days
through zone enable, program enable, calendar (weekdays / interval / parity,
with the `last_completed` marker), season months, suspension, pause and
skip-today (`sensor.py:430-462`).

What it does not resolve — and for a future day *cannot* — is the weather and
state layer: water budget against skip threshold, `precipitation`,
`frost_risk`, `cold_day`, `wind`, the consumption budget, forbidden windows,
missing water supply, a leak block under `close_and_block`. Those are knowable
only for the current evaluation. So the work is not "fix an ignored gate": it
is "publish today's verdict, and say plainly that future days are conditional
on weather". That is a different change, in a different file, with its own
correctness argument about what an entity may assert — it gets its own branch
and its own spec (`feat/next-run-gates`), and it blocks none of the three card
branches on this one.

**No card, no editor, no bundle rebuild.** `custom_components/.../frontend/`
is untouched, so the CI job that asserts the committed bundle matches source
passes without a rebuild.

**No seeding, no backfill.** The run log starts empty at 3.5.0 and fills from
the first outcome after upgrade. There is nothing to backfill from:
`outcome_log` holds three days of bare result strings, and inventing
`reason_key`s for them would be exactly the plausible-but-false number this
architecture exists to remove. The water series needs no backfill — it has been
accumulating since 3.3.0.

---

## 10 · Tests

**Water history** (`tests/components/test_history_api.py`)

- a range returns exactly the days requested, inclusive at both ends;
- one zone, some zones, every zone — three selections, three results;
- a configured zone with no litres in the range comes back as an all-zero
  dense series rather than being omitted, and so does a zone named explicitly
  in `zone_id`;
- the unattributed row is present, is outside `zones`, and summing `zones`
  does not include it;
- `est` and `gap_s` reach the response unchanged from storage;
- a day with `l: 0` and `gap_s > 0` is distinguishable from a day with
  `l: 0` and `gap_s: 0` — the dense-series requirement, asserted directly;
- a `start_date` older than 730 days is clamped and `truncated_by_retention`
  is `true`; one inside the window leaves it `false`;
- `include_unattributed: false` omits the key entirely;
- a zone present in the history but absent from configuration is returned with
  `zone_name: null`;
- `zones` comes back in `order`-then-name sequence, with an unconfigured zone
  last;
- an installation with no zones and no water returns an empty, well-formed
  response rather than raising.

**Shared date semantics** (§3.1, exercised through both services)

- the default window is 30 inclusive days ending today;
- a future `end_date` is clamped to today;
- `start_date > end_date` raises `invalid_history_range` and the key resolves
  in both locales;
- the retention floor is anchored to today, not to `end_date`: a request whose
  `end_date` is six months in the past and whose `start_date` predates
  `today − 729` is still flagged;
- litres round to 3 decimals and `gap_s` to 1 in the response while storage
  keeps full precision.

**Run log** (`tests/components/test_run_log.py`, `tests/engine/test_runlog.py`)

- an entry is appended for each of `completed`, `skipped`, `interrupted`,
  `cancelled` — driven through `record_run_outcome`, not by calling the store
  directly, so the single-writer claim is what is under test;
- a plan-time skip carries its `reason_key`; a completion carries
  `duration_min` and `volume_l` and no `reason_key`;
- a skip omits `duration_min` / `volume_l` in storage and reports them as
  `null` in the response;
- a manual run records `scheduled: false`;
- `program_name` is resolved at write time, and a run whose program no longer
  exists records `null` rather than raising;
- removing a zone leaves its entries in place, with the name it had;
- an outcome recorded at a local time earlier than the zone's UTC offset
  (00:30 in CEST, so `at` carries the previous UTC date) is bucketed to the
  **local** day — the conversion asserted directly with a frozen clock,
  because a raw string comparison passes every other test in this file;
- the 730-day prune drops older entries and keeps the boundary day;
- the cap drops from the head at `MAX_RUNS` and increments `cap_dropped`;
- `truncated_by_cap` is **false** on a young log whose `oldest_kept` is newer
  than the requested start but whose `cap_dropped` is still zero — the
  fresh-install case the flag exists to not misreport — and **true** once the
  cap has dropped anything and the window starts before `oldest_kept`;
- `cap_dropped` survives a restart, or the flag would reset to false on every
  reboot;
- `limit` keeps the most recent and sets `truncated_by_limit`;
- the response is chronological, oldest first;
- `result` and `zone_id` filters, singly and combined;
- the run store survives a restart: written entries are read back
  (`tests/components/test_metering_restart.py` is the shape to follow).

**Contract**

- `test_services_yaml.py`: both new services added to the parametrised
  declare-exactly-what-you-accept check — declaring in `services.yaml` and
  registering in `services.py` are two distinct places, and a field in only one
  of them either cannot be picked or cannot be validated;
- `test_translations.py` already enforces en/it parity and will fail on a
  missing key;
- `test_diagnostics.py`: the run-log section is present and bounded at 50.

**Engine hashes**: `weather.py`, `curves.py`, `evaluate.py`, `history.py`
recorded before the first commit and verified before the PR.

**Mutation matrix**: re-run against the *shipped* tree as the last step, not
the step after the code it was written for (3.4.0's most portable finding), and
byte-compare against the pre-mutation snapshot afterwards rather than assuming
the revert.

---

## Delivery

One branch, `feat/history-api`, one PR to `main`, merged before any card branch
starts. `manifest.json` 3.5.0, CHANGELOG section, `card-contract.md` extended
with both services — that document is the input to the three card branches that
follow.

The PR description states: why the run log is a separate store; why two
services instead of the one the brief asked for; why the series is dense; and
that "next irrigation against the gates" was found already resolved for the
deterministic gates and is deferred to its own branch for the weather layer.
