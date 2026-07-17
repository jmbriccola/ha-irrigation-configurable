# Irrigation Maestro — Setup & usage guide

Italiano: [docs/it/istruzioni.md](docs/it/istruzioni.md)

This guide walks through configuring the integration and using it (and the
card) day to day. For concepts and formulas see the [README](README.md).

## 1. Install and create the hub

1. Add the repository to HACS as a custom repository (type *Integration*),
   install **Irrigation Maestro**, restart Home Assistant.
2. *Settings → Devices & services → Add integration → Irrigation Maestro.*
3. Fill the first form:
   - **Weather entity** (required) — a `weather.*` entity with forecasts
     (Met.no works out of the box).
   - **Rain sensor** (optional) — a sensor reporting **today's cumulative
     rain in mm**. Without it, rain is estimated from the hourly forecast.
   - **Outdoor temperature sensor** (optional) — overrides the weather
     entity's temperature for daily-maximum tracking.
   - **Line flow sensor** (optional) — a shared flow meter (L/min) on the
     manifold, used by every zone without its own meter.
   - **Master valve / pump** (optional) — a `valve` or `switch` opened before
     the first zone of each session and closed after the last.

The hub is created with sensible defaults; everything else lives in the
hub's **Configure** menu (options) and in the zones you add next.

## 2. Add zones

On the Irrigation Maestro integration page press **Add zone** and repeat per
circuit:

1. **Basics**: name, icon, the zone's `valve` or `switch` entity, optional
   flow meter and nominal flow (L/min) with tolerance %, optional area (m²),
   adjustment factor (default 100% — e.g. 70% for a shaded bed), **order**
   (position in the watering sequence), **cadence** in days (default 3 —
   1 = every day), optional per-zone season months and compatibility group.
2. **Cycles** — add one or more daily cycles. Each cycle has:
   - a **trigger**: sun event (sunrise/sunset with ± offset in minutes) or a
     fixed time;
   - optional month override (e.g. an evening cycle only June–August);
   - a **curve** (next step).
3. **Curve** — choose a source:
   - **Preset "potted plants"**: 1 min/°C, +1 extra min/°C above 30 °C,
     clamped 10–55 min.
   - **Preset "lawn"**: target mm = 4 + 0.3·(t−25) (min 3, max 8 mm) at
     0.375 mm/min, clamped 8–25 min.
   - **A saved template** (managed in the hub options) or **copy from an
     existing zone/cycle**.
   - **Custom**: control points as text — `10:5, 25:15, 35:30` means 5 min at
     10 °C, 15 min at 25 °C, 30 min at 35 °C, linear in between, flat
     outside — plus explicit min/max clamps.
   - Kind **duration** (minutes) or **volume** (liters — only offered when
     the zone has a usable flow meter; set the safety timeout too).
   - Optional **cycle-and-soak**: max minutes per run and soak pause (e.g.
     10 min run / 15 min soak). Other queued zones water during the pause.

Everything is editable later: open the zone from the integration page and
use **Reconfigure** (zones have no gear icon — reconfigure is in the
three-dot menu). Cycle IDs are stable, so history and per-cycle switches
survive edits.

**Zone order** is the number entity on each zone (or the `set_zone_order`
service) — there is deliberately no drag-and-drop in the flow.

## 3. Hub options (Configure)

- **General**: the entities from step 1, master valve pre/post delays,
  **max concurrent zones** (keep 1 unless your pressure allows more — then
  assign zones to a shared *compatibility group*), compatibility groups.
- **Safety & timing**: settle pause between zones, manual-stop block window,
  watchdog maximum, open/close/switch confirmation windows, wait-for-free
  timeout, startup valve timeout, sentinel time, optional session limits
  (max minutes and/or must-finish-by).
- **Engine (advanced)**: every weight and threshold of the decision engine,
  with a **reset to defaults** switch. Season months live here too.
- **Restrictions** (watering ordinances): allowed weekdays, odd/even day of
  month, forbidden time windows (`08:00-10:30, 22:00-06:00`). Zones can
  override them individually. Queued work slides to the first allowed slot;
  a running cycle is truncated rather than allowed to overrun into a window.
- **Notifications**: per event type (completed, skipped, interrupted,
  cancelled, anomaly, watchdog, sentinel, session overrun, consumption
  budget) choose enabled, target `notify.*` services and priority. Skips
  sharing a reason produce **one** aggregated message.
- **Consumption budget**: liters per month and the action on exceeding it —
  notify only, reduce durations by a percentage, or suspend until the next
  month.

## 4. Day-to-day use

- **Enable/disable** a zone or a single cycle with their switches (e.g. turn
  the evening cycle off in spring).
- **Pause** (hours) or **suspend until a date** (holidays, winterizing) per
  zone or globally — suspension ends automatically. `resume` clears both.
- **Skip today** for a zone or all zones.
- **Run now**: `run_zone` (optional duration override) or the card's play
  button. Manual runs bypass cadence/budget decisions but keep every safety
  check; they do not reset the cadence counter.
- **Stop all**: closes everything and blocks queued cycles for the block
  window (default 60 min).
- **Evaluate now** (button or `evaluate` service): computes and returns the
  full plan — budget, threshold, per-zone durations, skip reasons — without
  opening anything.
- Watch the **hub sensors** (budget vs threshold, weighted temperature,
  session + queue) and each zone's **state / next run / last outcome**
  sensors. Outcome reasons are translated in the UI and in the card.
- **Export/import**: the `export_config` service returns the whole
  configuration as JSON; `import_config` restores it.

## 5. The card

Add *Irrigation Maestro Card* from the dashboard picker (storage mode
registers the resource automatically; YAML mode: see README). The card
shows the budget/threshold gauge, weighted temperature, session state and
queue, and one row per zone with live progress, next run, last outcome,
degraded-feature badges and controls (run, skip, pause, suspend, enable).
The visual editor offers: title, header/queue/controls toggles, compact
mode, zone filter. Curves are displayed (sparkline per cycle) — editing
stays in the configuration flow.

## 6. Troubleshooting

- **A cycle didn't run and nobody told you** → the daily sentinel (default
  12:00) notifies and opens a Repairs issue when a due cycle left no
  outcome — typically Home Assistant was off at trigger time.
- **Valve found open at startup** → the watchdog closed it: a restart never
  resumes a cycle by design. The sentinel will flag the missed cycle.
- **"Valve close FAILED" (urgent)** → the valve did not confirm closing after
  a retry. The watchdog keeps retrying every minute; if water still flows,
  close the tap. Check the Zigbee network and the Repairs issue.
- **Everything skipped as `manual_stop_block`** → someone stopped a cycle by
  hand within the block window. Wait for it to expire or `run_zone` manually.
- **`weather_unavailable`** → the weather entity had no data beyond the
  configured staleness; check the provider. Fail-open (default) still waters
  on the last known temperature with budget 0.
- **Zone shows a `switch_valve` badge** → the zone uses a `switch`: no
  position feedback, so open/close confirmation is optimistic and reduced
  (see the degradation matrix in the README).
- Diagnostics: integration page → three-dot menu → **Download diagnostics**
  (config + runtime state, redacted).
