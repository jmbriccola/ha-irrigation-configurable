# Unified schedule model — design

Date: 2026-08-12
Status: approved for planning
Target: v2.0.0 (Phase 1, breaking) and v2.1.0 (Phase 2, additive)

## Problem

Eight separate mechanisms decide *when* a zone waters. They live at three
levels (hub, zone, program) and are edited across four surfaces (config flow,
number entities, panel, Lovelace card). Several of them AND together while
being presented to the user as independent choices, and the resulting skips
are silent.

Confirmed failures on v1.3.3:

1. **Weekday grid vs. cadence.** A program with a Mon/Wed/Fri grid on a zone
   with the default `interval_days=3` silently drops Wednesday every week.
   Monday establishes the watering day, Wednesday is two days later, the
   cadence demands three. Both `NOT_DUE` and `DAY_NOT_SCHEDULED` are silent
   skip reasons, so nothing is reported.
2. **Two identical weekday grids.** The program editor
   (`card/src/panel/program-editor.ts:344`) and the restrictions view
   (`card/src/panel/settings-view.ts:501`) render visually identical weekday
   choosers in the same panel. They intersect. A Mon/Wed/Fri program under
   Tue/Thu restrictions never runs, silently.
3. **Invisible season override.** `cycle.months_override` is only reachable
   from the config flow. A user editing season months in the panel can be
   silently overridden by a value they cannot see.
4. **Unreachable zone restrictions.** `zone.restrictions` has no user surface
   at all — it is settable only by hand-editing exported JSON.
5. **`ZoneNextRunSensor` ignores every gate** (`sensor.py:314`), so the card
   shows a next-run time for days the zone will skip.

The root cause is not any single field: there is no single source of truth for
"when", and no single surface that owns it.

## Goals

- One source of truth for *when* a zone waters: the program.
- One surface for configuration: the irrigation panel. The config flow covers
  first-run setup only.
- Conflicting schedules must be impossible to express, not merely detected.
- No silent behaviour change on existing installations: migration preserves
  observed watering days, or reports what it changed.

## Non-goals

- The weather decision engine (weights, thresholds, budget, curves) is
  field-validated and out of scope. It stays in the config flow.
- Runtime operations (run now, pause, skip today, suspend) stay in the
  Lovelace card. The panel remains configuration-only.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | The **program** owns the whole "when": calendar, start trigger, season. | Matches how the user already works (programs are created in the dashboard) and the Gardena/Rachio model. |
| D2 | The calendar has **exactly one mode**: weekdays, interval, or parity. | Mutually exclusive modes make the silent combination structurally impossible rather than something to detect. |
| D3 | The **zone** loses `interval_days`, `season_months` and `restrictions`. | These are the duplicate sources of truth. |
| D4 | Hub restrictions keep **only** `forbidden_windows`. | Hours are a different axis from days; they do not compete with the calendar. |
| D5 | Migration: where a grid and a cadence both exist, the **grid wins**, plus a repair issue. | The grid is the explicit visible choice; `interval_days` is usually an untouched default. |
| D6 | `last_completed` becomes **per program**. | Two programs with their own cadence would otherwise overwrite each other's counter — the v1.3.3 bug one level down. |
| D7 | Everything except the weather engine becomes editable from the panel. | The centralisation goal. |
| D8 | Entity `unique_id`s do not change. | Renaming would break existing automations. |

### Why parity stays as a calendar mode

Odd/even day-of-month cannot be expressed by a weekday grid (odd days are not
weekdays) nor by an interval (month boundaries produce two consecutive odd
days: 29, 31, 1). Deleting hub parity without a replacement would leave users
under an odd/even ordinance with no way to comply. It therefore moves into the
program calendar as the third mode rather than disappearing.

### Why forbidden windows stay

They constrain hours, not days, so they create no day-level ambiguity. They
also do something a program cannot: **truncate a run already in progress** so
it does not overrun into the window (`engine/scheduling.py:117`
`max_run_minutes`). Setting a late start time is not equivalent — with
cycle-and-soak and a multi-zone queue a session can stretch, and without
truncation it spills into the forbidden window, which is the violation the
ordinance penalises.

## Model

```
Program                       (today: "cycle")
  program_id, name, enabled
  calendar:                   ← exactly one mode
      {mode: "weekdays", days: [0..6]}
    | {mode: "interval", interval_days: N}
    | {mode: "parity",   parity: "odd" | "even"}
  trigger: {kind: sun|time, event, offset_s, at}
  season_months: [1..12] | null    ← null inherits the hub default
  duration/curve/soak              ← unchanged, out of scope for Phase 1

Zone
  valve, area, icon, order, compatibility_group,
  flow sensor fields, adjustment_pct
  (no calendar fields at all)

Hub
  forbidden_windows
  default season_months
  weather engine (untouched)
```

The calendar is stored as a **discriminated union**, not three optional
fields, so no path — service call, JSON import, migration — can produce an
ambiguous state.

## Migration

Storage version bump. Per program, given `grid = cycle.days` and
`N = zone.interval_days`:

- `grid` is *meaningful* when it is not `None` and selects fewer than 7 days.
- `N` is *meaningful* when it is greater than 1.

| grid | N | Result | Repair issue |
|---|---|---|---|
| meaningful | meaningful | `weekdays(grid)`, `N` discarded | yes — names the zone, the old cadence and the new days |
| meaningful | 1 | `weekdays(grid)` | no |
| not meaningful | meaningful | `interval(N)` | no |
| not meaningful | 1 | `weekdays(all)` | no |

Then, in order:

1. **Hub `allowed_weekdays` is intersected, not dropped — for `weekdays`
   programs.** The new grid is `(grid or all-7) ∩ allowed_weekdays`. Dropping
   it would turn a Mon/Wed/Fri-restricted zone into a daily one — more water
   and a possible ordinance violation. An empty intersection disables the
   program and raises a repair issue; such a program never ran anyway.

   For a program migrating to **`interval` mode**, the intersection is not
   possible: "every N days, but only on Mon/Wed/Fri" is not expressible in any
   single mode. Converting it to `weekdays(allowed_weekdays)` would preserve
   the ordinance but change the cadence, usually upward — a 7-day interval
   would become three waterings a week. The interval is therefore **kept as
   is**, with a dedicated repair issue naming the program and stating that the
   allowed-days limit no longer applies to it, so the user can switch it to
   `weekdays` deliberately. This keeps the delivered water volume unchanged
   and leaves a legal decision with the user instead of guessing at it.
2. **Hub `parity`**, where set, becomes the program's mode when the program
   has no meaningful grid. Where the program *does* have a grid, the grid is
   kept and a **dedicated repair issue** is raised: a legal constraint is
   being dropped and the user must choose deliberately, not discover it later.
3. **`zone.season_months`** is pushed down to every program that has no
   `months_override`. Programs with an override keep it.
4. **`zone.restrictions`** (the unreachable override) is dropped; if it
   differs from the hub value, a repair issue reports it.
5. **`last_completed{zone}`** becomes `last_completed{zone:program}`, seeded
   with the zone value for every program of that zone. All programs of a zone
   are therefore due at the same moment initially, matching current behaviour.

## Engine changes

`_zone_gate` (`engine/planner.py:116`) loses `is_due` and `day_allowed`. Zone
gating keeps only what is genuinely zone-level: `enabled`, `suspended`,
`paused`, `skip_today`.

The program loop gains a single `calendar_allows(program, day, last_completed)`
check replacing `cycle.days`, `interval_days` and the weekday/parity part of
the restrictions. It resolves by mode:

- `weekdays` — `day.weekday() in days`
- `interval` — `is_due(program_last_completed, day, interval_days)`, keeping
  the v1.3.3 future-date guard as defence against clock skew
- `parity` — `day.day % 2` matches

`last_completed` gates only `interval` mode. It is still recorded for every
mode, because the outcome history and the sentinel rely on it.

Skip reasons collapse: `NOT_DUE`, `DAY_NOT_SCHEDULED` and the day half of
`CALENDAR_RESTRICTED` become one silent `CALENDAR_NOT_TODAY`. Silence is
correct here — "not scheduled today" is normal operation, not an anomaly. The
formerly silent *failure* cases disappear because they can no longer be
expressed.

`ZoneNextRunSensor` becomes computable and correct: for each enabled program,
walk forward day by day (bounded at 366) until the calendar mode, the season
and the runtime gates all allow, then take the earliest resulting trigger
instant.

## Surfaces

**Phase 1.** Program editor gains a calendar mode selector (three mutually
exclusive modes) and the season chips, next to the start trigger — they answer
the same question and belong on the same screen. The zone editor loses its
calendar fields. The settings view keeps only forbidden windows, relabelled as
an hours-only constraint.

**Phase 2** is sketched here only to show where Phase 1 is heading; it gets
its own spec and plan once Phase 1 has shipped. Services are added for the
settings that have none today (soak
max run and pause, volume safety timeout, session max, must-finish-by,
wait-free, manual block, settle pause, sentinel time, max concurrent, hub
default season). The panel gains the views that use them. The config flow
retires to first-run setup.

Terminology unifies on "program" across services, entities and translations,
in both `en.json` and `it.json`. `unique_id`s are untouched, so `entity_id`s
and existing automations survive; only display names and translation keys
change.

## Testing

- **Migration is the highest risk** and gets a dedicated table-driven suite:
  every combination of grid × interval × hub weekdays × hub parity × zone
  season, asserting both the resulting model and the repair issues raised.
- **Behaviour preservation:** for a representative set of pre-migration
  configurations, assert that the set of watering days over a 60-day window is
  identical before and after migration — except in the documented cases where
  a repair issue is raised.
- **Exclusivity:** property-style tests asserting no service call, JSON import
  or migration path can produce a program with more than one calendar mode.
- **The v1.3.3 regressions stay green**, retargeted to per-program markers:
  multiple daily programs all run; interval still gates following days;
  skipped days still retry; manual runs still never establish a day.
- **End-to-end** through the real component with mock valves and frozen time,
  as the existing `tests/components/test_session.py` suite does.

## Rollout

Phase 1 ships as **v2.0.0** with an explicit breaking-change changelog: what
moved, what each repair issue means, and how to verify a zone's schedule after
upgrading. Phase 2 ships as **v2.1.0**, additive.

Phase 1 must precede Phase 2 because the panel's calendar UI depends on the
new model, and because it closes the active water-wasting defect first.
