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
