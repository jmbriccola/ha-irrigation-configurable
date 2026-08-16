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
- **`pyproject.toml` already sets `addopts = "-q"`**, so `.venv/bin/pytest -q`
  is effectively `-qq` and prints **no summary line at all**. Any test count
  quoted from that command shape was read from somewhere else. Run bare
  `.venv/bin/pytest`.
- **Mutation proofs decay** (3.4.0, the branch's most portable finding). A
  proof holds against the tree it ran on, exactly as a green suite does; a
  later change can silently re-arm a mutation the suite once killed, and
  nothing announces it. Re-run the whole matrix against the *shipped* tree as
  the last step of a task, not the step after the code it was written for.
  Six mutations went quiet across this branch and no two shared a cause: a
  new clause that disarmed the guarding tests, a term that was provably dead,
  a later fix that masked the mutation, three tests that could no longer
  reach the line, and one whose scenario had drifted out from under it. A
  survivor therefore does not by itself mean a weak test — hence the
  **declared control mutation**: a term known to be constant where it sits is
  entered in the matrix as expected-to-survive, and the harness fails if it
  ever starts being killed or if anything else starts surviving.
- **Verify the revert, do not assume it.** A timeout killed a mutation matrix
  mid-run and left a gutted function in `runtime.py`; not one of 733 tests
  failed at that moment, because that mutation's kills live in tests that had
  already run earlier in the same session. Only a byte-compare against the
  pre-mutation snapshot caught it.

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
  TTL `_LEDGER_TTL_S` = **60 s** (the 300 s in earlier drafts of this file was
  never the shipped value); unledgered transitions during a session = manual →
  abort all. An entry is only ever consumed by a real transition, so no close
  path may register one for a valve that is already closed — see the 3.4.0 fix.
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
  **The same defect recurred one feature later and the rule extends (3.4.0):**
  the leak sensor is *sensore di perdita* and the water-supply sensor is
  *sensore di mancanza d'acqua*, everywhere. 3.4.0 shipped it.ts calling the
  latter "sensore di mancanza d'acqua" while it.json called the same field
  "sensore alimentazione idrica" in the service and "sensore di presenza
  d'acqua" in the Repairs notice — three names for one field, across the two
  surfaces that edit it. Swept in the release commit. A new user-visible noun
  needs its Italian fixed once, in both files, at the moment it is coined.
  **Third recurrence, same release, and the rule now covers CONTROLS as well
  as nouns (3.4.0).** The whole-branch review found both guides referring to
  a checkbox called "start without water" / "parti anche senza acqua" —
  a control that exists on no surface and is the logical INVERSE of the one
  that does (the panel's "Refuse to start without water" / "Non partire senza
  acqua", the service's "Require the water supply" / "Richiedi la presenza
  d'acqua"). English §7 then stated its polarity backwards inside the very
  paragraph predicting what a test would show, because an inverted name
  invites an inverted sentence. **Quote a control by the words on it, never by
  a paraphrase, and least of all by its negation** — the paraphrase costs the
  reader a hunt for a switch to turn on when they must turn one off, and it
  hides polarity errors from every reviewer who reads for sense rather than
  for the UI. Where the same setting has three legitimate names (panel label,
  service field, stored key) the guide names all three once, together.
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
- **Capabilities are detected, never named (3.4.0).** The registry walk goes
  valve → device → sibling `binary_sensor` by `device_class` (`moisture` for
  leak, `problem` for water supply), preferring the user's `device_class`
  override over the integration's `original_device_class`. Entity ids in
  field reports are examples from one installation. Do not add name matching,
  id prefixes or manufacturer assumptions anywhere — the test suite carries a
  decoy whose id ends in `_water_leak` with the wrong device class precisely
  so that a substring matcher cannot pass.
- **Detection proposes, storage decides (3.4.0).** `add_zone` writes what it
  finds; `discover_zone_sensors` reports candidates and the panel pre-fills
  them. Nothing is adopted implicitly at runtime, and no migration adopts a
  sensor for an existing zone — a silently coupled device is a coupling
  nobody authorised. `add_zone` deliberately does not accept the two sensor
  keys as input; only `update_zone` does.
- **Sources 1 and 2 are one alarm (3.4.0).** On SONOFF SWV the valve's
  `moisture` sensor is derived from its internal flow meter, so both sources
  see one physical event. A second source at an active alarm records itself
  and stays quiet. Two facts are kept, and they are not interchangeable:
  `first_source` (the event payload and the log — provenance, fixed at the
  raise) and `describing_source` (the Repairs issue key and the entity
  attribute — the first source *while it still contributes*, a surviving
  source otherwise). The second exists because an issue keyed to the first
  kept describing evidence the scope no longer had: source 2 raises, source 1
  joins, the meter is removed, and the notice still cited flow on a zone with
  no meter. Do not collapse them back into one.
- **The detector is per scope, not per zone (3.4.0).** Scopes are the zone
  ids plus `HUB_SCOPE`, and a meter serving two or more zones (or none)
  resolves to the hub — where *which* zone leaked is unanswerable but
  *whether the system* leaks is not. Keyed per zone, an installation on a
  shared line meter would have had no source-2 alarm at all while the README
  claimed otherwise. The scope rule is `WaterAccountant.scope_for`, consumed
  by the alarm's consequences as well as by the litres, and
  `all_valves_closed` is consumed rather than copied. Do not write a second
  copy of either: the zones an alarm blocks would drift from the zones its
  litres came from.
- **Source 1 is gated on that zone's own valve being closed (3.4.0).** On the
  SWV the `moisture` alarm means "water is passing while I am shut", so the
  valve is closed whenever it fires. On hardware where the class is a genuine
  ground probe, a probe under a sprinkler is wet on every cycle. Gating on
  the zone's own valve (not on all valves, which would suppress a legitimate
  alarm on zone A while zone B waters) makes both readings behave. The window
  is `now - max(sensor.last_changed, valve_closed_since)`: the sensor
  timestamp alone would confirm instantly at every close.
- **A de-configured source withdraws its alarm (3.4.0).** Clear the leak
  sensor — the likely reaction to a sensor you distrust — and the alarm goes
  with it, along with its repeat reminder. The module's rule is *no evidence
  → hold; evidence the mechanism itself is gone → withdraw*, and
  de-configuration is the second. `_resolved_meters` therefore builds from
  configuration alone and never reads live state, so an unavailable but still
  configured meter keeps its ledger and its alarm. Do not make either half
  read the other's kind of evidence.
- **`water_supply` is `device_class: problem`: `on` means NO water (3.4.0).**
  Inverted with respect to the entity name. Uncertainty (`unavailable`,
  `unknown`, missing, unconfigured) never counts as evidence of a missing
  supply. The gate reads the sensor's own `last_changed` rather than tracking
  a timestamp, so a restart restarts the clock — the safe direction, since we
  do not know how long the supply has been out and must not withhold water on
  that ignorance.
- **The supply refusal lifts on silence; the supply notice does not (3.4.0).**
  Same sensor, opposite directions, because the two acts fail differently:
  *do not withhold water on no evidence*, and *do not assert a recovery on no
  evidence*. Only `off` or de-configuration withdraws the notice — an
  unavailable sensor once pushed "the water is back", a claim nobody had
  established. The cost is that any text promising the refusal must not
  promise it unconditionally, because silence retracts it; the Repairs
  description is worded for that. Do not "fix" the asymmetry by making them
  match.
- **No Repairs notice of ours survives a restart, and every one of them used
  to say otherwise (3.4.0).** Home Assistant reloads a non-persistent issue
  with `active=False` and no translation key
  (`IssueRegistry._async_load`), so it is not shown; nothing at setup
  re-creates one, and re-raising costs a full confirmation window because the
  condition behind it has to be established again. Both leak notices, the
  system-flow notice and the water-supply notice each promised permanence —
  "this notice stays until…", with "the notification is read and forgotten,
  this is not" as the whole rhetorical point — while every surface documented
  the memory-only restart behaviour meticulously *for the entity* and no
  surface said it of the notice. The rule that generalises: **whenever a
  restart is documented as erasing some state, check every text that promises
  durability built on that state**, not just the text about the state itself.
  Persisting the issues is not the fix — a restored notice can be as stale as
  a restored alarm — so the texts say so instead.
- **`require_water_supply: false` still notifies and still raises the repair
  (3.4.0).** The setting is named for the gate and governs the gate; "do not
  withhold water" is a different statement from "do not tell me". A user who
  distrusts the sensor has two honest levers already — remove it from the
  zone, or mute the anomaly channel — and both say what they mean.
- **The self-close exemption is narrow on purpose (3.4.0).** The watering
  zone's own valve, an unledgered close, and that zone's own supply sensor
  reading `on`. Nothing else. Where a supply sensor is configured but has not
  spoken, the verdict is deferred `_SUPPLY_EVIDENCE_GRACE_S` (5.0 s) and
  re-read, because the valve's state and its supply sensor are two entities
  of one device reported in no guaranteed order — without that the exemption
  would work intermittently, which is worse than not shipping it. With no
  sensor there is no delay at all, which is what keeps the weakening bounded.
  The premise expires on `not valve.is_open`, never on `not is_closed`:
  `is_closed` is strictly confirmed, so a hand-closed valve that then drops
  off the radio would answer False and escape judgement entirely — the one
  site in `session.py` where uncertainty would have resolved to *continue*.
- **The default leak action re-closes and does not block (3.4.0).** Closing
  what is already closed is a no-op, and that is the honest position: the
  component cannot stop a leak it detects while idle. It recovers a valve
  left open by a lost command and dries nothing on a false positive.
  `close_and_block` exists for the burst-pipe case and is opt-in. The
  re-close is skipped while a session is running, because a zone's own sensor
  can alarm while a *different* zone waters and closing the master there
  would abort a cycle nothing implicated — so the message must not claim the
  master was re-closed at the moment the component chose not to touch it.
- **The leak alarm is an entity, and `off` is an assertion (3.4.0).** One
  `binary_sensor` per scope, `device_class: problem`, so `off` means *there
  is no problem* and may not be said before it is earned. Five invariants,
  each with a defect behind it that was shipped and caught: (1) a standing
  alarm is publishable always, and that clause comes first — move it and a
  reload hides a live alarm for a whole window; (2) availability is
  configuration-only, never liveness, or a silent meter retracts a live
  warning; (3) unresolved evidence is *held*, never a countdown — a sensor
  asserting over a valve that never reports closed arms no timer anywhere;
  (4) the start-up window counts seconds in which a source could actually
  have concluded, not wall clock, so a boot mid-cycle earns nothing until the
  valves shut; (5) the latch is written on the wake path, never inside the
  read — latching inside the query gave a 30 s whole-integration dispatch
  loop for the life of an alarm, and one that never ends if the entity is
  disabled. Do not add `RestoreEntity` here: a restored `off` at boot is
  exactly the clearing edge this design exists to prevent.
- **Hold what withholds, never hold what permits (3.4.0).** The one sentence
  to carry forward. Remembering a source's last reading is conservative when
  that reading was the alarm — it keeps a window open — and permissive when
  it was the all-clear: the scope goes on accruing observable seconds while
  its only sensor is mute, then publishes "there is no problem" over a window
  in which nothing spoke. So the `on` branch may read a remembered value; the
  `off` branch must read live state. The same test kills the argument for
  keeping unpruned memory of de-configured sensors — true of a stale `on`,
  false of a stale `off` — which is why that map is now filtered to
  configured sensors and pruned on rebuild.
- **The hub-and-zone double alarm stays (3.4.0, user decision).** A line
  meter configured alongside per-zone meters measures the same water the zone
  meters measured, so one physical leak raises `zone_leak` and `hub_leak`.
  Both are true; neither scope can know the other saw it. Suppressing either
  would mean choosing which evidence to ignore, and which choice is right
  depends on the plumbing, not on the code. It is in the README's degradation
  matrix as a case to be *shown*, including the fact that it is now two
  entities an automation can double-count. Do not add a deduplication rule.
- **`leak_watch` answers coverage; `leak_detection` answers the sensor
  (3.4.0).** They diverge on ordinary hardware and the divergence is the
  reason the second exists: three metered zones with no leak sensors have
  full source-2 coverage while `leak_detection` reads `unavailable` — or
  `candidate_available`, where the valve's own device exposes an unwired
  `moisture` sibling, which is the common case on the reference hardware — on
  all three, so a card built on it says "no leak sensor" or offers to wire one
  up. Both are true, and both produce the belief that nothing is watching.
  `leak_watch` returns `leak_sources_configured` itself, the same predicate
  the entity's availability is gated on, so the attribute and the entity
  cannot disagree. Its `system` value states a *place*, not a verdict.
  **`leak_watch` is CONFIGURATION, with no usability test**, so `zone` is not
  a promise that the source works: a meter whose unit never resolves reads
  `zone` while source 2 can conclude nothing from it, leaving the entity
  `unavailable` for ever — behind a card that says "Leak check not concluded
  yet" until the hour is up, then hands over to `flow_unit_unknown` +
  `leak_never_observable` in `degraded` (verified by probe, 3.4.0). Do not
  make the matrix say such a zone reads `none`. Do not merge the two keys and
  do not re-derive either in the frontend.
- **"Configured and missing" is a `degraded` key, not a fourth capability
  value (3.4.0).** `capabilities` records the user's intent, so a sensor that
  has vanished still reads `configured` — downgrading it would make the panel
  offer to overwrite a deliberate choice during, say, a Zigbee re-pair. What
  must not happen is the user believing they are covered, so
  `leak_sensor_missing` / `water_supply_sensor_missing` appear in
  `zone_state.degraded`, detected registry-first so an entity that has not
  posted a state since restart is not misflagged.
- **Diagnostics READ the leak picture; they never compute it (3.4.0).**
  `RuntimeManager.leak_diagnostics()` is the one place that assembles it, and
  every value comes from the predicate the rest of the component already
  consumes — `leak_state`, `leak_sources_configured`,
  `leak_state_established`, `leak_observation_stall`, and the three the
  observation window is built on. A support dump that re-derived any of them
  would be a second place deciding what a leak is, and it would be worse
  there than anywhere else, because a dump is believed exactly when the
  entity is doubted. This deliberately widened the runtime's public surface
  by one method rather than letting `diagnostics.py` reach into four
  internals; if the picture needs another field, add it to that method.
  It exists because the whole mechanism is in memory on purpose, so
  `state.as_dict()` — everything diagnostics carried before — describes none
  of it.
- **Ship the safe example, never the hazard note (3.4.0).** The docs used to
  explain that a transition *into* `unavailable` fires no `to: "off"`
  trigger, and said nothing about the transition *out* of it — which every
  healthy install makes once per restart, once the observation window
  completes. A reader copying the obvious clearing automation would have
  reopened the mains on a reboot. The fix was not a warning beside a wrong
  example: it was to print the example with `from: "on"` on the clearing
  trigger, with the reason in a comment inside the block, because the block
  is what gets copied. Any future automation example in this repo carries the
  same constraint.
- **A silent leak entity is declared, after an hour, and only on the zones
  (3.4.0).** `leak_never_observable` and `leak_evidence_unresolved` exist
  because an entity stuck at `unavailable` for ever is indistinguishable from
  a broken integration. They count *idle* time only, never time spent
  watering. Two honest limits, both documented in the README rather than
  hidden: the one-hour threshold has never met real hardware, and a valve
  held open outside the integration — an hour of hand-watering from an
  irrigation line — produces `leak_never_observable` legitimately, so the
  wording is "could not check", never "is broken". The hub scope has no such
  signal at all, because `degraded` lives on `zone_state`.

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
