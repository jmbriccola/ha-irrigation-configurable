# Irrigation Maestro — Architecture Design

Status: draft presented before implementation (per project process §10.1).
Working name: **Irrigation Maestro**, domain `irrigation_maestro` (collision check pending — see MEMORY.md).

This document records the deliberate architectural choices for the integration. The
behavioural specification (formulas, safety rules, §8 regression case) lives in the
project brief and is treated as fixed; this document covers *how* it is realised.

## 1. Hub + zones: config subentries (choice **a**)

Zones are **config subentries** of a single hub config entry (`ConfigSubentryFlow`,
HA ≥ 2025.3; our minimum will be ≥ that for other reasons, see §9).

Why subentries over a multi-step options flow:

- Each zone gets its own stable `subentry_id`, its own device (via
  `config_subentry_id` on the device registry entry), independent add/remove
  without touching sibling zones, and a native "Add zone" button in the UI.
- The hub options flow stays small (global settings only) instead of a fragile
  20-step wizard multiplexing zone CRUD.
- Removing a zone removes exactly its device/entities — no manual bookkeeping.

Consequences (documented limitations):

- Subentries have **no options flow** — all zone editing (cycles, curves) goes
  through the subentry **reconfigure flow**, implemented as a menu-driven flow.
- Zone reordering stays outside the flow entirely: a `number` entity per zone
  plus the `set_zone_order` service (spec §1).

## 2. Data model

### 2.1 Config (in the config entry — user intent, survives restore/backup)

**Hub entry `data`**: empty (nothing immutable). **Hub entry `options`**:

```
weather_entity: str                    # required
rain_sensor: str | None                # cumulative daily mm sensor
outdoor_temp_sensor: str | None        # overrides weather temp for tracking
line_flow_sensor: str | None           # shared line flow meter (L/min)
master_valve: str | None               # valve.* or switch.*
master_pre_open_s: int = 5
master_post_close_s: int = 5
max_concurrent: int = 1
compatibility_groups: list[str] = []   # names; zones reference one by name
settle_pause_s: int = 120
manual_block_min: int = 60
watchdog_max_min: int = 70
open_confirm_s: int = 120              # valve commanded but not open -> cancel
close_confirm_s: int = 120
switch_confirm_s: int = 10             # optimistic delay for switch-based valves
sentinel_time: "12:00"
session_max_min: int | None            # session duration limit
session_must_finish_by: "HH:MM" | None
restrictions:                          # global, zone-overridable
  allowed_weekdays: list[int] | None   # None = all
  parity: "odd" | "even" | None        # day-of-month scheme
  forbidden_windows: [{start: "HH:MM", end: "HH:MM"}]
engine:                                # every §2 parameter, with reset-to-default
  temp_weights: [0.05, 0.15, 0.30, 0.35, 0.15]   # d-3, d-2, d-1, today, tomorrow
  rain_weights: [0.85, 0.5, 0.2, 0.05]           # today, d-1, d-2, d-3
  forecast_credit_weights: [0.6, 0.25]           # 0-24h, 24-48h
  forecast_credit_cap_mm: 5.0
  hot_credit_halving_temp: 30.0
  threshold_base_mm: 3.0
  threshold_slope_mm_per_c: 0.5
  threshold_knee_c: 28.0
  threshold_max_mm: 6.0
  freeze_skip_c: 2.0
  cold_day_skip_c: 10.0
  wind_skip_enabled: false
  wind_skip_kmh: 30.0
  staged_rain_weight: 0.8
  season_months: [3..10]               # hub default, zone-overridable
  stale_weather_max_h: 6
  stale_weather_policy: "fail_open" | "fail_closed" = "fail_open"
notifications:
  events: {completed | skipped | interrupted | cancelled | anomaly | watchdog |
           sentinel | session_overrun | consumption_budget:
             {enabled: bool, services: [str], priority: normal|high}}
consumption_budget:
  liters_per_month: float | None
  action: "notify" | "reduce" | "suspend" = "notify"
  reduce_pct: int = 50
curve_templates:                       # shared, referenced by cycles
  {template_id: {name, kind: duration|volume, points: [[c, min|l]], min, max}}
```

Built-in presets (read-only templates): `preset_pots` (1 min/°C, +1 min/°C above
30 °C, clamp 10–55) and `preset_lawn` (mm = clamp(4 + 0.3·(t−25), 3, 8) at
0.375 mm/min, clamp 8–25), exactly the §8 reference curves.

**Zone subentry** (`subentry_type = "zone"`), `data`:

```
name, icon
valve_entity: str            # valve.* or switch.*
flow_sensor: str | None      # per-zone meter (L/min); None -> line meter if set
nominal_flow_lpm: float | None
flow_tolerance_pct: float = 25
area_m2: float | None        # enables minutes<->mm display conversions
adjustment_pct: int = 100    # after curve, before clamps
order: int = 100
interval_days: int = 3       # cadence N (runtime-adjustable via number entity)
compatibility_group: str | None
season_months: list[int] | None      # None -> hub default
restrictions_override: {...} | None  # same shape as hub restrictions
cycles:
  - id: str                  # stable 8-hex, generated once
    name: str
    enabled_default: true    # runtime toggle lives in a switch entity
    trigger: {kind: "sun", event: sunrise|sunset, offset_s: int}
           | {kind: "time", at: "HH:MM"}
    months_override: list[int] | None
    mode: "duration" | "volume"       # volume requires a usable flow meter
    curve: {template: template_id} | {points: [[c, v]], min: v, max: v}
    soak: {max_run_min: int, pause_min: int} | None
    volume_safety_timeout_min: int | None   # fallback for volume mode
```

Numbers exposed as entities (order, interval_days, adjustment_pct) are **written
back to the subentry data** on change (single source of truth = config entry;
they are config, not runtime state).

### 2.2 Runtime state (`helpers.storage.Store`, one store per config entry — never in the entry)

```
version: 1
temp_history:  {date_iso: max_c}         # rolling window, today + 3 days back
rain_history:  {date_iso: mm}            # committed rain, same window
rain_staging:  {hour_iso: mm}            # stage-and-commit slot
last_completed: {zone_subentry_id: date_iso}
manual_stop_at: iso_ts | None
suspended_until: {zone_subentry_id: iso_ts}
paused_until:   {zone_subentry_id | "__global__": iso_ts}
last_outcome:  {zone_subentry_id: {result, reason_key, at, cycle_id, minutes, liters}}
consumption:   {period_start: date_iso, liters: float}
```

Date-keyed dicts make midnight rotation trivial and restart-safe (no rotation
automation: values are keyed by the day they belong to; old keys are pruned).

### 2.3 Config/state separation and live reconfiguration

The hub update-listener and subentry updates are applied **in place, without
reloading the entry**, by pushing new config into the coordinator/orchestrator.
Running cycles keep their frozen plan (durations frozen at session evaluation);
new config takes effect from the next session. Structural changes that require
entity add/remove (zone added/removed, cycle added/removed) create/remove
entities dynamically without a full reload where possible; a zone *removal*
while that zone is watering stops it safely first.

## 3. Pure decision engine (`engine/` — zero HA imports)

- `model.py` — frozen dataclasses: `EngineParams`, `WeatherSnapshot`,
  `ZoneConfig`/`CycleConfig` (engine view), `EvaluationInput`, `SessionPlan`,
  `SkipReason` enum, outcome types.
- `curves.py` — monotonic-point validation, linear interpolation, flat
  extrapolation, clamps, adjustment factor, presets, duration & volume kinds.
- `weather.py` — weighted temperature (with **bootstrap renormalisation** over
  available days — missing days redistribute their weight proportionally, never
  counted as 0 °C), rain budget, forecast credit (cap → hot-halving), dynamic
  skip threshold, immediate-skip checks, staged-rain handling.
- `scheduling.py` — calendar-day cadence, season windows, weekday/parity/
  forbidden-window restrictions, next-eligible-slot computation, retry-on-skip
  semantics, must-finish-by truncation math.
- `planner.py` — turns (configs + snapshot + runtime state + clock) into a
  `SessionPlan`: ordered zone runs with frozen durations/volumes, soak
  splitting, per-zone skip reasons, aggregate skip grouping.

Determinism: the engine never reads the clock — `now` is always a parameter.
Rounding contract (validated against §8): weighted temp → 0.1 °C; credit,
budget, threshold → 0.01 mm; durations → whole minutes (round-half-up via
`round()` on floats ≥ 0 is acceptable: verified against the source system).

## 4. Orchestrator (coordinator layer)

One `IrrigationCoordinator` per config entry owning: engine invocation, session
queue, safety supervision, notification manager, storage.

### 4.1 Session lifecycle

A **session** starts when a cycle trigger fires (sun/time listener) and no
session is active. Weather is fetched **once** (`weather.get_forecasts`,
hourly → daily fallback → stale-data policy), the engine evaluates **all**
zones/cycles due at this trigger, and produces a frozen `SessionPlan`. Cycles
triggering while a session is active join the active session's queue (their
durations computed from the same frozen snapshot). Manual `run_zone`/`run_all`
enter the same queue — nothing ever opens a valve outside the queue.

### 4.2 Zone run state machine

```
QUEUED → WAITING_FREE → SETTLING → OPENING → WATERING ⇄ SOAKING → CLOSING → COMPLETED
   └→ SKIPPED(reason)        └→ CANCELLED(reason)          └→ INTERRUPTED(manual)
```

- WAITING_FREE: all managed valves confirmed closed (timeout → CANCELLED).
- SETTLING: configurable pause, re-check after (spec safety level 3).
- OPENING: command + confirmation window (2 min valves; optimistic delay for
  switches) → failure = CANCELLED + close command + notify.
- WATERING: duration timer (or volume target via flow integration with safety
  timeout); surveillance listener active: any foreign managed valve opening, or
  the active valve closing externally → close **all**, INTERRUPTED, manual-stop
  block armed.
- SOAKING: cycle-and-soak pause; the queue may interleave other zones' runs.
- CLOSING: command + confirm + one retry + urgent notification on failure.
- Session end: master valve post-close; aggregate notifications flushed.

Master valve/pump: opened `master_pre_open_s` before the first zone command of
the session, closed `master_post_close_s` after the last close confirmation.
It is a *managed valve* for the watchdog and surveillance, but exempt from the
"foreign valve" rule while a session runs.

### 4.3 Independent safety layer

- **Watchdog**: its own interval timer (not part of any session): any managed
  valve open longer than `watchdog_max_min` → force close + notify. On
  `EVENT_HOMEASSISTANT_STARTED`: wait for each managed valve to leave
  `unavailable` (with per-valve timeout), then close everything found open;
  unreachable valve → Repairs issue + urgent notification. No legitimate cycle
  survives a restart (runtime queue is memory-only by design).
- **Sentinel**: daily at `sentinel_time`, checks every cycle that was due today
  left an outcome (completed or skipped-with-reason); missing → notification +
  Repairs issue.
- **Flow anomalies** (degrade if no meter): flow with all valves closed (leak,
  urgent), zero flow with valve open (interrupt + notify), out-of-range flow —
  expected range = Σ nominal flows of active zones (line meter) or zone nominal
  (zone meter), ± tolerance.
- **Manual-stop block**: any manual interruption arms a block window; queued
  and new runs are cancelled with `manual_stop_block` until it expires.

### 4.4 Notifications

`NotificationManager`: per-event-type config (enabled, notify services list —
validated at send time, priority). Session-scoped aggregation: skips sharing a
reason produce **one** message listing the zones. Events also fire on the bus
(`irrigation_maestro_cycle_started/finished/skipped/interrupted/cancelled/
anomaly/watchdog/sentinel/session_overrun/budget`) with rich payloads.

## 5. Entities & services

**Hub device**: sensors — water budget (mm), skip threshold (mm), weighted
temperature (°C), session state, queue (attr: ordered runs), remaining
consumption budget (L); switch — global pause; buttons — "Evaluate now",
"Stop all".

**Zone device** (one per subentry, `via_device` hub): switch zone-enabled;
switch per cycle (enable, stable `cycle_id` in attributes); sensors — state
(idle/queued/watering/soaking/paused/suspended), next scheduled run, last
outcome (attrs: reason key, localized reason, timestamp, cycle id, minutes,
liters); numbers — interval_days, order, adjustment_pct; datetime —
suspended_until.

**Services** (all with translated names/descriptions, icons in icons.json):
`run_zone(zone, duration?)`, `run_all`, `skip_today(zone?)`, `pause(hours,
zone?)`, `suspend_until(until, zone?)`, `resume(zone?)`, `stop_all`,
`evaluate` (supports response: full computed plan), `set_zone_order(zone,
order)`, `set_curve(zone, cycle_id, points, min?, max?)` (validates like the
UI editor), `export_config` (response), `import_config(payload)`.

**Repairs** for: valve entity missing, weather unavailable beyond policy,
close-failure, valve unreachable at startup, notify service vanished.
**Diagnostics**: config + runtime state with entity IDs kept, coordinates and
anything sensitive redacted.

## 6. Config flow structure

**Hub (ConfigFlow v1.1)**
1. `user`: name + weather entity (+ advanced: rain/temp/line-flow sensors,
   master valve) → create entry. Single instance allowed.
2. Options flow (menu): General / Safety & timing / Engine (advanced, with
   "reset to defaults" toggle) / Restrictions / Notifications / Consumption
   budget / Curve templates.

**Zone subentry flow** (`zone`)
1. `user`: name, icon, valve, flow source, nominal flow/tolerance, area,
   adjustment, order, interval, season, compatibility group.
2. `cycles` (menu loop): add/edit/remove cycle → per cycle: trigger step →
   curve step (preset/template select, or points as validated text `"10:5,
   25:15, 35:30"`, clamps, mode, soak, volume options).
3. Reconfigure flow: same menu, pre-filled (`async_update_and_abort`).

Copy/duplicate: "duplicate zone" (in hub options) and "copy curve from…"
(select any existing zone/cycle or template) inside the curve step.

**Migrations**: `VERSION = 1`, `MINOR_VERSION = 1`, `async_migrate_entry`
shipped and tested from 1.0 (no-op forward path + downgrade guard).

## 7. Lovelace card

Lit 3 + TypeScript + Vite (library mode, single-file IIFE/ES module), source in
`card/`, build emitted to `custom_components/irrigation_maestro/frontend/
irrigation-maestro-card.js` and **committed** (HACS ships only
`custom_components/<domain>/`). Served via
`async_register_static_paths([StaticPathConfig(...)])`; auto-registered in the
Lovelace resource storage collection with `?v=<version>` cache-busting (storage
mode only; YAML-mode fallback documented). Card i18n (en/it) internal, keyed to
`hass.language`, including skip/outcome reasons (the integration publishes
reason **keys**; both card and sensor attributes localize them). Visual editor;
light/dark via HA CSS custom properties. Curve display read-only (SVG spark
plot); curve editing stays in the config flow.

## 8. Testing

- Engine: plain pytest, no HA — formulas (§8 regression exact-value test),
  curves (interpolation/extrapolation/clamps/validation), bootstrap
  renormalisation, staged rain, cadence/restrictions/next-slot, planner
  freezing and soak splitting.
- Integration: `pytest-homeassistant-custom-component` — config/subentry/
  options/reconfigure flows, migrations, mutual exclusion (2+ zones triggering
  together, with and without master valve), every §3 safety path (each cancel
  branch), restart watchdog with delayed-available valves, sentinel, switch
  degradation, flow anomalies, notification aggregation, services (incl.
  response schemas), live-reconfigure-without-reload.

## 9. Repo & CI

Per spec §7. CI: `lint.yml` (ruff + mypy strict), `test.yml` (pytest, uv),
`hassfest.yml`, `hacs.yml` (`ignore: brands` until the brands PR merges),
`card.yml` (npm ci + build + assert bundle up to date). Release: SemVer tags,
`manifest.json version` must equal the tag (checked in release workflow).
Minimum HA version in `hacs.json`: determined by newest API we use
(subentries ≥ 2025.3; reconfigure-on-subentries and static-path API push this
to **2025.7** — final value confirmed against research notes in MEMORY.md).
