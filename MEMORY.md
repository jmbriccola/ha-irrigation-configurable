# Project Memory — Irrigation Maestro

Decision log and progress record for the `irrigation_maestro` Home Assistant
custom integration. Everything decided or done in this project is recorded
here (project rule).

## Identity

- **Name**: Irrigation Maestro — **domain `irrigation_maestro`**.
  Collision check (2026-07-17): domain is free in home-assistant/brands
  (4 248 custom + 1 492 core brands checked), HACS default list (2 698 repos),
  HA core components, GitHub-wide code search. Nearby names: `maestro_mcz`
  (stoves), `bluemaestro` (BLE), irrigation-related domains
  `irrigation_unlimited`, `irrigationprogram`, `smart_irrigation`,
  `simple_irrigation`, `opensprinkler`, `irrigation_estimator` — no conflict.
- Repo: `jmbriccola/ha-irrigation-configurable`, MIT, copyright
  **Jacopo Maria Briccola** (LICENSE header updated from `jmbriccola`).

## Source system

`existing-scripts/{automations,scripts}.yaml` is the field-validated 2-zone
YAML system the spec generalises. Formulas cross-checked against it. Extra
details harvested from it (kept as engine behaviour):

- Lawn preset mm-target has a **floor of 3 mm** (`[..., 3] | max`) in addition
  to the 8 mm cap.
- "Rain today" at evaluation time = committed counter + staged hour × 0.8 when
  evaluating before minute 55 (pro-rata of the stage-and-commit slot).
- Counter caps: daily rain ≤ 200 mm, hourly staging ≤ 50 mm.
- Rounding contract (reproduces §8 exactly, verified by script 2026-07-17):
  weighted temp → 0.1 °C; credit/budget/threshold → 0.01 mm; durations →
  whole minutes via `round()`. §8 outputs reproduced: 31.0 °C, 0.09 mm,
  3.79 mm, 4.5 mm, water, 32 min, 15 min.
- YAML defaulted missing temp days to 25 °C; the spec supersedes this with
  weight renormalisation over available days (bootstrap) — implemented in the
  engine, YAML behaviour NOT carried over.

## Architecture decisions (full text: docs/design/architecture.md)

1. **Zones as config subentries** of a single hub entry (spec option a).
   Zone editing via subentry reconfigure flow (subentries have no options
   flow); zone reordering via `number` entity + `set_zone_order` service.
2. **Pure engine** in `engine/` (no HA imports, clock injected, frozen
   dataclasses): curves, weather model, scheduling/cadence/restrictions,
   session planner. Rounding contract above.
3. **Config vs state**: config in entry/subentries (numbers like order/
   interval/adjustment write back to subentry data); runtime state (temp/rain
   history keyed by ISO date — rotation-free, prune old keys; last-completed
   per zone; manual-stop ts; suspensions; consumption) in
   `helpers.storage.Store`. Update listeners apply config in place, no reload
   mid-cycle; running session keeps its frozen plan.
4. **Session model**: first trigger starts a session → ONE weather fetch →
   engine evaluates all due cycles → frozen SessionPlan; later triggers join
   the running session reusing the snapshot. Manual runs enter the same
   queue. Nothing opens a valve except the queue runner.
5. **Zone run state machine**: QUEUED → WAITING_FREE → SETTLING → OPENING →
   WATERING ⇄ SOAKING → CLOSING → COMPLETED, with SKIPPED / CANCELLED /
   INTERRUPTED exits. Watchdog + sentinel are independent of sessions.
   Master valve = managed valve, exempt from foreign-valve rule in-session.
6. **Card**: Lit 3 + TS + Vite in `card/`, bundle committed to
   `custom_components/irrigation_maestro/frontend/`, served via
   `async_register_static_paths`, auto-registered Lovelace resource (storage
   mode) with `?v=` cache-busting; reasons published as keys, localised in
   card and in sensor attributes.
7. Presets `preset_pots` / `preset_lawn` = §8 reference curves, shipped as
   read-only curve templates.

## Facts established during development

- Current stable HA at dev time: **2026.7.2** (Python ≥ 3.14.2);
  pytest-homeassistant-custom-component 0.13.346 tracks it. Dev venv:
  Python 3.14 (uv). Min supported HA in hacs.json: **2025.7.0** (floor:
  subentries+reconfigure ≥ 2025.4, sync static-path API removed in 2025.7).
- Subentry APIs confirmed on core dev: `async_get_supported_subentry_types`,
  `ConfigSubentryFlow` with `_get_entry()` / `_get_reconfigure_subentry()` /
  `async_update_and_abort`; subentries have reconfigure but NO options flow.
- `hass.data["lovelace"]` is a LovelaceData object (`.resources`,
  `resource_mode`); resource auto-registration only in storage mode.
- mypy `python_version = 3.14` (must parse installed HA sources); our code
  stays 3.13-syntax (ruff target py313) for HA 2025.7 compatibility.
- **Test-harness gotcha**: a plain (non-`@callback`, non-coroutine) function
  passed to `async_call_later` runs in the executor thread → touching futures
  from it raises "Non-thread-safe operation…". All timer callbacks must be
  `@callback`-decorated. Probe tests in tests/components/test_timer_probe.py.

## Deliberate design decisions (beyond the spec)

- Manual runs (`run_zone`/`run_all`) bypass decision gates (cadence, budget,
  season, restrictions) AND the manual-stop block — user intent is explicit;
  safety gates (valves free, confirmations, surveillance) always apply.
  Manual completions do NOT update the cadence counter (`last_completed`).
- **The program owns "when" (2.0.0).** Each program holds ONE calendar mode —
  weekdays | interval | parity — stored as a discriminated union, plus its own
  season months. Zones own no calendar at all. Before 2.0.0 up to four
  mechanisms ANDed silently (program weekday grid, zone `interval_days`, hub
  `allowed_weekdays`, hub `parity`), so a Mon/Wed/Fri program on the default
  cadence of 3 dropped every Wednesday without a word. Mutually exclusive
  modes make that unrepresentable rather than merely detectable — do not
  reintroduce a second day mechanism anywhere.
- `last_completed` is keyed `zone:program` and only gates INTERVAL mode. Per
  program, not per zone: a shared marker let one program consume another's
  cadence (the 1.3.3 defect, one level down). `is_due` still treats a marker
  equal to or after today as due, which covers clock skew.
- Hub restrictions are **hours only** from 2.0.0 (`forbidden_windows`). They
  are kept, and not folded into the calendar, because they constrain a
  different axis and because they TRUNCATE a run already in progress
  (`max_run_minutes`) — a late start time is not equivalent.
- Migration v1→v2 lives in `migration.py`, is idempotent (a program that
  already has a calendar is never rewritten), and reports anything it could
  not express as a repair issue instead of changing behaviour silently.
- **One editor per setting (2.1.0).** Every setting except the weather engine
  is edited in the panel; the config-flow options menu keeps only
  `engine_advanced`. Do not re-add a config-flow step for something the panel
  already edits — that is duplicated surface, and the reason it is safe to
  remove is that services remain callable from Developer Tools when the panel
  cannot load. Installer parameters live behind collapsed Advanced drawers.
- Volume-mode cycle whose meter disappears degrades to a duration run of its
  volume-safety-timeout minutes (never guesses liters).
- Flow out-of-range → anomaly notification only; zero-flow → interrupt.
  Leak check (flow with all valves closed) piggybacks the watchdog interval.
- Forbidden-window truncation → outcome `completed` with `partial: true`.
- Queued runs landing in a forbidden window slide to `next_allowed_start`,
  still subject to session limits (`session_overrun`).
- Consumption budget: notify once per period; `reduce` multiplies durations
  (after clamps, min 1 min); `suspend` marks sessions `consumption_budget`.
- Zone/cycle enable flags and suspensions are runtime state (Store), not
  config; number entities (order/interval/adjustment) write back to subentry
  data because they are config.
- Command ledger distinguishes our valve commands from manual intervention
  (surveillance): every internal open/close registers (entity, action) with
  TTL 300 s; unledgered transitions during a session = manual → abort all.
- Session evaluation cached 120 s so near-simultaneous triggers share one
  weather fetch; the frozen evaluation lives for the whole session.
- Queue is priority-sorted at every enqueue (zone order, name, id) plus a 2 s
  gather window at session start: simultaneous triggers arrive in arbitrary
  callback order, but zones must run in the configured sequence.
- Cycle-and-soak: only a run's FIRST segment is enqueued; each completed
  segment queues the next one with `earliest = now + soak_pause` (bug found
  by test: pre-expanding all segments made slice 2 start immediately).
- Brands PR assets generated in docs/brands/irrigation_maestro/ (droplet over
  field, Pillow-generated placeholder — replaceable with real artwork).
- **A curve has one stored form (3.0.0).** Before 3.0.0 a curve could be
  explicit points OR a `{"template": ...}` reference, and every dashboard
  save silently materialised the reference into points with no visible
  change — the card reduced any curve to two friendly numbers, so nobody
  could tell. Storage now holds points + min/max/kind only; migration v2→v3
  materialises a stored reference losslessly (the points written are exactly
  the preset's) and is idempotent. Do not reintroduce a second stored form
  for the same value — that is the exact defect this migration removes.
- **Intensity scales the curve; it does not rebuild it (3.0.0).** The minutes
  control used to re-derive a "heat" value from the curve and regenerate a
  fresh two/three-point curve on every nudge, destroying any authored shape
  underneath — a six-point curve silently became three points. `intensity_pct`
  now multiplies through the adjustment factor `curve_value` already had,
  applied via the new unclamped `interpolate()`; any curve keeps every point
  no matter how often intensity changes. Per-day minutes became a per-day
  intensity for the same reason, one level down in the engine, where uniform
  per-day minutes used to force a three-anchor rebuild at evaluation time.
  This is a deliberate semantic change, not just a rename: the old per-day
  delta was absolute (mild fixed, hot = mild + heat), the new one is
  proportional (hot scales with the whole curve) — the migration preserves
  the mild value exactly and lets the hot value follow the user's own curve
  instead of a fixed offset.
- **Presets retired from the interface, kept as engine constants (3.0.0).**
  `PRESET_POTS` / `PRESET_LAWN` can no longer be selected or created through
  the panel or a service call — only explicit points can. They stay in
  `engine/curves.py` because §8 pins them as field-validated reference
  curves, and `resolve_curve` still resolves a template reference so a
  configuration exported from a 2.x install still imports.
- **Zone-defaults convention (3.0.0): the creating service writes them.**
  `add_zone` now writes `order` (highest existing + 1) and `adjustment_pct`
  explicitly instead of leaving them to fall back implicitly, because it is
  now the only path that creates a zone (the subentry add flow is deleted).
  One writer, one convention — do not let a second zone-creation path leave
  these implicit again.
- **Subentries: the storage model survived, the flow did not (3.0.0).**
  `docs/design/architecture.md` still gives "a native Add zone button" as
  the historical rationale for choosing subentries — that record is
  intentionally left alone. What changed is narrower: zones are still config
  subentries (their own devices, stable ids, `async_update_subentry`); only
  the subentry *flow* (add/reconfigure UI in Settings) was deleted, because
  the panel is now the only place a zone is created or edited. Do not read
  the architecture doc's rationale as still describing current UI — it
  explains why the storage model was picked, not how zones are edited today.
- **The card derives minutes; nothing publishes them twice (3.0.0 Phase B).**
  The zone sensor stopped publishing `amount`/`heat`/`day_minutes` the same
  release the card stopped reading them (deliberately ordered together —
  see below). The card now computes displayed minutes client-side from
  `curve.points`, `intensity_pct` and `day_intensity_pct`, the same
  `interpolate()`-based adjustment the engine applies server-side. One
  source of truth on the wire (the curve + the intensity), not a curve plus
  a second, pre-baked representation of what it means — do not add a derived
  "minutes" attribute back onto the sensor; compute it where it's displayed.
- **The point editor replaced the semantic mapping outright, not as an
  "advanced" alternative to a simplified mode (3.0.0 Phase B).** The
  amount/heat two-slider editor was kept alive through Phase A specifically
  as a bridge (`engine/semantic.py`, `set_simple_curve`, the derived
  attributes) so the backend rework could ship without breaking the running
  card. Phase B deletes all three. The reason it was deleted rather than
  retained as a "simple mode" next to the point editor: amount/heat cannot
  express what points can (a floor, a knee above 35 °C, an anchor outside
  12–35 °C), it isn't a projection of a general curve (round-tripping a
  hand-authored curve through it silently reshaped it — every curve it wrote
  started at (12, 0), because its own formula zeroed the cold anchor), and a
  second editable model of the same curve is exactly the "two stored forms"
  defect the 3.0.0 migration exists to remove one level up. Do not
  reintroduce a derived, coarser curve editor alongside the point one.
- **The intensity-reset notice is a UI surface for a Phase A backend rule,
  not a new rule (3.0.0 Phase B).** Explicitly setting a curve (`set_curve`)
  already reset a program's intensity to 100% server-side before Phase B —
  a curve write and a scale of that curve are different axes, and keeping a
  stale scale on a newly authored curve would silently reshape it again. The
  point editor now warns before save when the program carries a non-100%
  uniform or per-day intensity, so the reset is seen instead of discovered
  after the fact. The warning is a notice, not a new confirmation gate — do
  not add a blocking dialog here; the backend rule is unconditional and
  correct, the card's job is only to make it visible.
- **The notification wizard lives in the panel (3.1.0).** Notifications were
  already edited there, and the 2.1.0 rule is one editor per setting — putting
  a guided path in the options flow would have been the duplicated surface
  that rule exists to prevent. Findability, which is what the request was
  really about, is solved with Repairs issues that fire exactly when the user
  has the problem, plus `notification_status` and the diagnostics payload.
  Do not add a config-flow notifications step.
- **ESSENTIAL_EVENTS is not one of the display groups (3.1.0).** The severity
  grouping is presentation; the four events that must arrive (watchdog,
  anomaly, sentinel, interrupted) span all three groups. One set drives the
  proposed defaults, the default priority, the missing-recipient repair and
  the definition of "mute" — do not re-derive any of those from a group.
- **Recipients are stored bare, and normalised on read too (3.1.0).** The old
  panel placeholder taught users to type `notify.mobile_app_phone`, which
  `Notifier` then invoked as `notify.notify.mobile_app_phone` — a third silent
  exit next to the two in the brief. Normalising on read repairs existing
  configurations without a migration; do not remove either half.
- **L/min is canonical and `flow.py` is the only converter (3.2.0).** Every
  flow number in the engine is litres per minute; conversion happens once, on
  read, so no downstream code sees a foreign unit or has to know one exists.
  Do not convert anywhere else, and do not add a second canonical unit.
- **An unknown unit disables the zero-flow guard rather than tripping it
  (3.2.0).** `FlowMonitor._periodic_check` interrupts a cycle when fewer than
  `ZERO_FLOW_EPSILON_L` litres accrue in the grace window — litres it reads as
  deltas off the meter's ledger (3.3.0: see "Water becomes litres in one
  place" below), not by accumulating them itself. A ledger that cannot
  resolve a unit produces no litres, so a guard that trusted it blindly would
  have interrupted every run on a meter whose unit is unresolvable — turning
  a reporting gap into an outage. An unresolvable unit degrades exactly like
  a missing meter, at every point where a missing meter is already handled.
- **`zone_has_flow_meter` stays configuration-only; `zone_flow_meter_usable`
  reads live state (3.2.0).** The services that create a volume curve use the
  first, so an edit cannot fail because a sensor was momentarily unavailable.
  Plan time and the zone's declared status use the second, where the
  consequence is a degraded run rather than a refused edit. Do not merge them.
- **The consumption counter was not rescaled for existing installs (3.2.0).**
  It is monthly and resets at period start, so the distortion self-heals
  within 31 days; and the accumulated total mixes litres measured through the
  meter with litres estimated as nominal × minutes, which the defect never
  touched. Applying one factor to the whole total would be exactly the
  plausible-but-false number this feature removes. A Repairs notice states the
  scale change instead.
- **Italian terminology: "flussometro" is the only word for a flow meter
  (3.2.1).** A branch review found six variants in use across it.json, it.ts
  and the docs (contatore di flusso/di portata/di linea, sensore di portata,
  sensore di portata di linea, misuratore di portata); all were swept to
  "flussometro". "Contatore" stays reserved for an actual counter — the
  consumption total (contatore dei consumi) and the cadence counter — never
  for the device. Do not reintroduce a synonym for the meter itself.
  User-visible Italian now also lives in `services.py`
  (`_TEST_NOTIFICATION_DEFAULTS`, the localized `test_notification` title and
  message) — check there too, not just it.json, it.ts and the docs.
- **Water becomes litres in one place (3.3.0).** One `MeterLedger` per meter
  integrates continuously, whether or not anything is watering; `FlowMonitor`
  holds a baseline and reads the ledger's deltas — it does not integrate.
  Two integrators reading one meter were two numbers for the same water. Do
  not add a second integrator, and do not let a consumer accumulate a
  reading itself.
- **Attribution follows valve state, not run phase (3.3.0).**
  `WaterAccountant` credits each closed interval's litres to whichever
  zone's valve reports open, not to whichever zone `PHASE_WATERING` claims.
  The phase is necessary and not sufficient: it misses the whole
  open-confirm wait (`PHASE_OPENING`), it misses the master pre-open that
  pressurises the line while the zone is still queued, and a failed close
  clears the zone from `active_runs` while its valve is still physically
  open — which would diagnose a stuck-open valve as a system leak. A valve
  that reports open is watering; that is the same predicate leak detection
  reads.
- **Unattributed water splits into total and all-closed (3.3.0).** Line
  priming during `master_pre_open_s` is real water belonging to no zone, on
  every single cycle — counting it as suspect would false-positive on every
  run. `total_l` includes it; `closed_l`, the subset measured with every
  managed valve (zones + master) reporting closed, does not, and is the
  only figure leak detection reads. Do not let leak detection read
  `total_l`, and do not fold `closed_l` back into it.
- **The monthly budget is derived, never stored (3.3.0).**
  `consumption_used_liters()` is `carried_over_for(period_start) +
  water_for_period(...)`, computed on every read from the per-zone daily
  history — one number for the water, so a per-zone total and the budget
  can never drift apart. Unattributed water is excluded on purpose: letting
  a leak into the budget would let it suspend irrigation, the right
  consequence from the wrong cause. `carried_over` is a one-period opening
  balance stamped with the period it belongs to (`carried_over_for` returns
  0 once the stamp no longer matches) — do not turn it back into a running
  counter.
- **The meter-resolution predicate has one definition (3.3.0).**
  `resolved_meter_entity` (`runtime.py`) resolves to the zone's own meter if
  it has one, else the hub's line meter, else none — every one of its seven
  call sites across `sensor.py`, `runtime.py` and `accounting.py` goes
  through it instead of repeating the fallback. It used to be inlined at
  each of those, and one of the seven drifted to `is None` where the rest
  used truthiness: an empty-string meter (cleared by `update_zone`) then
  kept silently feeding from the line meter without being labelled as such
  (the `line_meter_shared` bug). Do not re-inline it.

## Progress log

- 2026-07-17: Repo recon (LICENSE only + source YAML). §8 math verified by
  script. Domain collision check done (free). Architecture doc written.
- 2026-07-17: Engine complete (124 pure tests, §8 exact). Scaffold + engine
  committed. Card built by subagent (Lit3+TS+Vite, bundle committed in
  frontend/, i18n it/en, editor, typecheck+build green). Config flow built by
  subagent (hub flow, options menu 6 sections, zone subentry flow with cycle
  loop + curve step + copy/presets, reconfigure; 16 tests green; translations
  config/options/config_subentries en+it). Storage, valve controller,
  weather client, session runner, watchdog, sentinel, runtime, __init__
  implemented; session safety tests in progress.
- 2026-07-17 (later): 12 session safety scenarios + 9 extra (master valve,
  sentinel, stale weather fail-open/closed, volume mode, zero-flow, soak
  interleave, max_concurrent=2 batching) green. Lovelace resource
  auto-registration fixed (`resource_mode` attr) + tested (storage & yaml).
  Entities/services/diagnostics/translations built by subagent per the card
  contract: full suite **217 passed**, ruff clean, mypy strict clean
  (31 files). Card bundle build verified reproducible. Docs written (README
  with degradation matrix, INSTRUCTIONS.md, docs/it/guida-rapida.md,
  docs/it/istruzioni.md, CHANGELOG, brands PR guide + assets). Final
  adversarial review workflow (6 lenses + refutation) launched.
- Test-harness notes: MockValvePark now reacts to the call_service EVENT
  (loading the real switch platform replaces plain service registrations);
  advance() drains the ready queue 25× per tick (background-task starvation
  under async_block_till_done caused ~10% flakes at baseline).
- 2026-07-17 (final): adversarial review workflow (6 lenses × verify, 42
  agents) surfaced 35 confirmed findings; ALL fixed. Notably: (safety) the
  surveillance ledger now retires an entry on its own command echo — stale
  entries no longer mask a later manual intervention (TTL 60 s + discard on
  unconfirmed commands); level-2 check includes the zone's own valve; no
  zone valve opens after an abort during master pre-open; recurring
  zero-flow/volume checks; watchdog exempts the master during a session.
  (engine) volume cycles never soak-split (was n-fold overwater) and never
  reuse liters as minutes; per-cycle season extensions survive hub
  out-of-season. (ha) import_config validates through the typed models;
  hub_consumption_left always exists; reconfigure adds/removes cycle switches
  live. (contract) zone_state emits only the 7 contract states; frozen
  run_duration_min/run_planned_runs; cycle_started + session_overrun events.
  (i18n) card IT: budget idrico, temperatura pesata, masculine outcomes,
  disambiguated global-pause. Final state: **222 tests pass**, ruff + mypy
  strict clean (31 files), card typecheck+build green, all translations
  complete & consistent, manifest/services/icons validated, all modules
  import. Ready for a 1.0.0 tag.
