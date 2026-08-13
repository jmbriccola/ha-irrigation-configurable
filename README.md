# Irrigation Maestro

Weather-aware irrigation orchestration for Home Assistant. Unlimited zones,
a field-proven weather decision engine, hard safety guarantees around your
valves, and a dedicated Lovelace card — all configured from the UI, no YAML.

> Nato dalla generalizzazione di un impianto reale a 2 zone (valvole Zigbee,
> flussometri, previsioni Met.no). La guida rapida in italiano è in
> [`docs/it/guida-rapida.md`](docs/it/guida-rapida.md); le istruzioni complete
> in [`INSTRUCTIONS.md`](INSTRUCTIONS.md) (EN) e
> [`docs/it/istruzioni.md`](docs/it/istruzioni.md) (IT).

## Why another irrigation integration?

Irrigation Maestro is built around two ideas:

1. **A weather model that decides *whether* and *how long* to water** — not a
   fixed schedule. It weighs the last four days of temperature maxima and
   rainfall, discounts forecast rain (never at face value), and converts a
   weighted temperature into per-zone durations through user-editable curves.
2. **Safety is not negotiable.** Zones never touch valves directly: a central
   queue serializes every cycle, verifies valves before and after each step,
   watches for manual intervention, survives restarts by closing everything,
   and a fully independent watchdog backstops it all. Any conflict or
   uncertainty resolves to *cancel and notify* — never *open anyway*.

## Features

- **Unlimited zones** (`valve` or `switch` entities), each with one or more
  daily cycles anchored to sun events (± offset) or fixed times.
- **Per-cycle temperature→duration curves**: control points with linear
  interpolation, flat extrapolation, explicit min/max clamps; two
  field-validated presets included; shared curve templates and copy-between-
  cycles for many-zone setups; optional **volume mode** (liters) with flow
  meter; optional **cycle-and-soak** with cross-zone interleaving.
- **One calendar per program**, in exactly one of three mutually exclusive
  modes: specific **weekdays**, **every N days** (counted from the day that
  program last completed, so a skipped day retries), or **odd/even** days of
  the month for municipal parity ordinances. Because the modes cannot be
  combined, two schedules can never silently cancel each other out. Each
  program also carries its own **season** (months), defaulting to the hub's —
  so a zone can keep its morning program all season and run the evening one
  only in high summer.
- **Per-zone adjustment factor** and hub-wide **forbidden time windows**: a
  cycle already running is truncated rather than allowed to overrun into a
  window. Windows constrain hours only; watering days belong to the program.
- **Everything configured from the sidebar panel** after setup: zones,
  programs and their calendars, weather sources, consumption budget, forbidden
  hours, notifications, and — behind Advanced drawers — session limits, valve
  confirmations, the watchdog and concurrency. Zones and programs are created
  and edited exclusively there. The config flow covers only first-run hub
  setup and the weather decision engine, which stays deliberately out of the
  dashboard's reach.
- **Weather engine** (§ details below) with a single forecast fetch per
  session, stage-and-commit rain estimation without a rain sensor, and a
  configurable stale-weather policy.
- **Five safety levels** + open/close confirmation, independent watchdog
  (with restart close-all that waits for Zigbee availability), daily
  sentinel, session time limits, master valve/pump sequencing, flow anomaly
  detection (leak, no-flow, out-of-range) and a monthly consumption budget.
- **Per-event notifications** to any `notify.*` targets, aggregated (one
  message per shared reason, never one per zone), rich bus events
  (`irrigation_maestro_*`) and per-zone outcome sensors.
- **Custom Lovelace card** (installed automatically in storage mode) with
  live progress, queue, controls, degraded-feature badges, a live
  beginner-friendly curve editor and full EN/IT localization.
- **Repairs** issues for detected problems, downloadable **diagnostics**,
  config **export/import**, schema versioning with migrations from day one.

## Installation (HACS custom repository)

1. HACS → menu (⋮) → **Custom repositories**.
2. Repository: `https://github.com/jmbriccola/ha-irrigation-configurable`,
   type **Integration** → **Add**.
3. Install **Irrigation Maestro** from HACS, restart Home Assistant.
4. Settings → Devices & services → **Add integration** → *Irrigation
   Maestro*: pick your `weather` entity (plus optional rain / temperature /
   flow sensors and master valve).
5. Zones are created from the **Irrigazione** sidebar panel (below) — open
   it from the Home Assistant sidebar and use **＋ Aggiungi zona** for each
   irrigation circuit.

Requires Home Assistant **2025.7.0 or newer**.

### The card

In **storage mode** (the default) the card resource is registered
automatically — just add the *Irrigation Maestro Card* from the dashboard
card picker. If your dashboards are in **YAML mode**, add the resource
manually:

```yaml
lovelace:
  resources:
    - url: /irrigation_maestro/frontend/irrigation-maestro-card.js?v=1.0.0
      type: module
```

### The "Irrigazione" panel

The integration also registers a dedicated **sidebar panel** — look for
**Irrigazione** (sprinkler icon) in the Home Assistant sidebar. It's the
day-to-day **configuration hub**: pick a zone tab and add or edit its
watering programs (giorni/days on a weekly grid, orario/start time,
durata/duration per day or uniform), with a guided wizard for new programs
and an **Advanced** drawer for the heat-response curve when a fixed duration
isn't enough — plus **＋ Aggiungi zona / ✎ Modifica zona** to create, edit
or delete zones themselves, and a **⚙️ Impostazioni** view to edit the
everyday hub settings (weather & sensors, consumption budget, calendar
restrictions), all without leaving the sidebar. The HA **config flow**
(Settings → Devices & services) remains fully available too, for the
initial setup and for the expert engine/safety/notification parameters the
panel doesn't expose. The dashboard card described above keeps working
exactly as before — the panel is an additional, more spacious place to
manage zones and programs, not a replacement.

## The decision engine

All weights below are defaults, editable in the hub options (with a
reset-to-defaults switch). Formulas are implemented in a pure Python module
([`engine/`](custom_components/irrigation_maestro/engine/)) covered by a
regression test that reproduces the source system's real-world values
exactly.

- **Weighted temperature** = max(3 days ago)·0.05 + max(2 days ago)·0.15 +
  max(yesterday)·0.30 + max(today, effective)·0.35 + max(tomorrow)·0.15.
  Daily maxima are tracked by the integration itself (persisted, no
  midnight-rotation step to corrupt). Missing days renormalize the remaining
  weights — never counted as 0 °C.
- **Past rain**: from a real rain sensor when configured; otherwise estimated
  from the hourly forecast with **stage-and-commit**: at minute 55 the ending
  hour's forecast is committed at ×0.8 (forecast-only rain never counts at
  full weight).
- **Water budget (mm)** = today·0.85 + yesterday·0.5 + 2 days·0.2 +
  3 days·0.05 + forecast credit, where credit = (0–24 h)·0.6 + (24–48 h)·0.25,
  capped at 5 mm and **halved when the weighted temperature ≥ 30 °C**
  (forecast summer storms often never arrive).
- **Dynamic skip threshold (mm)** = 3 + 0.5·max(weighted temp − 28 °C, 0),
  capped at 6. Budget ≥ threshold → session skipped ("budget sufficient").
- **Immediate skips**: out of season (silent), precipitation in progress,
  frost risk (< 2 °C), cold day (effective max < 10 °C), wind over threshold
  (opt-in).
- **Weather unavailable**: last data reused up to 6 h (configurable); beyond
  that, a configurable policy — *fail-open* (default: water with the curve on
  the last known weighted temperature, budget = 0) or *fail-closed* (skip as
  `weather_unavailable`) — always with a notification and a Repairs issue.

Durations are frozen when the session starts; nothing is re-evaluated
mid-queue. The forecast is fetched **once per session** and shared by all
zones.

## Safety model

1. **Central queue** — the only code path that opens valves. Priority-ordered
   (zone order number), at most `max_concurrent` zones active (default **1**;
   raising it requires zones to share a *compatibility group*).
2. **Valves-free check** before opening (all managed valves confirmed closed;
   timeout → cancel).
3. **Settle pause** between zones (default 2 min) with a re-check after.
4. **Surveillance** during the cycle: a foreign managed valve opening, or the
   active valve closed externally → everything closes, cycle interrupted,
   notification sent.
5. **Post-manual-stop block**: after any manual interruption no queued cycle
   starts for the block window (default 60 min).

Plus: open confirmation (2 min default) and close confirmation with retry and
urgent notification; an **independent watchdog** that force-closes anything
open beyond 70 min (default) and closes every valve at Home Assistant start
(waiting for entities to leave `unavailable`, with a Repairs issue if one
never does — no legitimate cycle survives a restart); a **daily sentinel**
that verifies every due cycle left an outcome and alerts when a trigger never
ran; optional **session limits** (max duration / must-finish-by) that skip
the remaining zones as `session_overrun`.

## Degradation matrix

Every optional-hardware feature disables itself when the hardware is missing,
and the UI (zone attributes + card badges) declares it:

| Feature | Requires | Without it |
|---|---|---|
| Volume mode (liters target) | Flow meter (zone or line) | Cycle runs as a plain duration cycle for its safety-timeout minutes; volume mode not offered in the flow |
| Flow anomalies (leak, no-flow, out-of-range) | Flow meter | No flow diagnostics; time-based watering only |
| Out-of-range diagnosis per zone | Per-zone nominal flow rates | With a shared line meter the expected range is the **sum of nominal flows of the open zones** (± tolerance); if any open zone lacks a nominal rate, range checks are skipped. A line meter cannot tell *which* zone misbehaves |
| Position feedback, open/close confirmation | `valve` entity | `switch` zones run **optimistically**: commands are assumed to actuate after a short configurable delay; surveillance still reacts to state changes, but a stuck-open head cannot be detected — the watchdog and (if present) flow meter are the remaining guards |
| Hourly rain staging, hourly forecast precision | Weather provider with hourly forecast | Falls back to `daily` forecast with a conservative prorated estimate; stage-and-commit disabled |
| Measured consumption | Flow meter | Consumption estimated as nominal flow × minutes (needs nominal flow; otherwise not tracked) |
| Rain measured | Rain sensor (daily mm) | Stage-and-commit forecast estimation (above) |
| Card auto-install | Lovelace storage mode | Manual resource registration (documented above) |

## Entities & services

One **hub device** (water budget, skip threshold, weighted temperature,
session state with live queue, optional remaining consumption budget, global
pause switch, *Evaluate now* / *Stop all* buttons) and one **device per
zone** (state, next run, last outcome with reason, enable switch, per-cycle
enable switches, order / cadence / adjustment numbers, suspend-until
datetime).

Services: `run_zone`, `run_all`, `skip_today`, `pause`, `suspend_until`,
`resume`, `stop_all`, `evaluate` (returns the full computed plan),
`set_zone_order`, `set_curve`, `export_config`, `import_config` — all
documented in the UI (Developer tools → Actions) in English and Italian.

Events: `irrigation_maestro_session_started/finished`,
`irrigation_maestro_cycle_started/finished/skipped/cancelled/interrupted`,
`irrigation_maestro_anomaly/watchdog/sentinel/session_overrun/consumption_budget`
with rich payloads for your own automations.

## Development

```bash
uv venv .venv --python 3.14
uv pip install --python .venv/bin/python pytest-homeassistant-custom-component ruff mypy
.venv/bin/python -m pytest tests          # full suite
.venv/bin/ruff check . && .venv/bin/mypy  # lint + strict typing
cd card && npm ci && npm run build        # rebuild the Lovelace card bundle
```

The decision engine is pure Python (no Home Assistant imports) — see
[`tests/engine/`](tests/engine/) for the § 8 regression case and the full
formula suite. Design notes live in [`docs/design/`](docs/design/) and the
project decision log in [`MEMORY.md`](MEMORY.md).

## License

[MIT](LICENSE) © Jacopo Maria Briccola
