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

Zones — and the watering programs on them — are created and edited from the
**Irrigazione** sidebar panel, not from this integration page; see §6 below
for the full walkthrough (the zone form, the program wizard, the day grid
and the curve editor). In short: open the panel, press **＋ Aggiungi zona**,
give it a name and a `valve` or `switch` entity, and it's created with one
sensible default program (every day, sunrise, a default heat-response curve)
ready to refine. The extra zone fields — flow meter, nominal flow/tolerance,
adjustment % (default 100% — e.g. 70% for a shaded bed), order, cadence in
days, season months, compatibility group — live behind **✎ Modifica zona →
Avanzate**. Cycle (program) IDs are stable, so history and per-cycle
switches survive edits.

A program's curve — the temperature→duration mapping, with explicit min/max
clamps and optional volume mode or cycle-and-soak — is reshaped live with
the two-slider editor (§6, and §5 for the same editor on the card). A curve
needing more than three control points, or set by exact coordinates, is set
with the `set_curve` service instead (Developer tools → Actions; see the
README's service list).

**Zone order** is the number entity on each zone (or the `set_zone_order`
service) — there is deliberately no drag-and-drop in the panel.

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
mode, zone filter. Curves are displayed (sparkline per cycle) and can be
edited live from the card.

Editing curves from the card — expand a zone, open a cycle and press
**Edit curve**. Two sliders (*How much water* and *How much more when it's
hot*) reshape the watering live: the graph, the cool/mild/hot examples and
the 'with today's weather' line update as you drag. **Advanced** adds the
*Never less than / Never more than* safety limits and lets you drag the
three points. Curves needing more than three points, or set by exact
coordinates, use the `set_curve` service instead (Developer tools →
Actions).

## 6. The "Irrigazione" panel

Open the **Irrigazione** entry in the Home Assistant sidebar (sprinkler
icon) — it's the day-to-day **configuration hub**: a full-page alternative
to the card for managing programs, plus zone management and the everyday
hub settings, all in one place.

1. Pick a **zone** tab.
2. The program list shows every program on that zone; add a new one with
   the guided wizard (name, trigger, days, duration — optionally copying an
   existing program as a starting point), or edit/rename/remove an existing
   one.
3. Each program opens onto a weekly **day grid** — tap the weekdays it
   should run on (empty = every day) — a start time or sun-event trigger,
   and a duration: one value for every scheduled day, or a different value
   per day (e.g. shorter after a day it rained).
4. **Advanced** settings on a program — the heat-response curve (the same
   two-slider editor as the card, "how much water" / "how much more when
   it's hot") for programs that scale duration with temperature instead of
   a fixed value — live behind a drawer, collapsed by default.
5. **＋ Aggiungi zona** (next to the zone tabs) opens a short form — name,
   valve (or switch) entity, area — and creates the zone with one sensible
   default program, ready to refine. **✎ Modifica zona** (above the program
   list, for the selected zone) opens the same form pre-filled, plus an
   **Avanzate** drawer for flow sensor, nominal flow/tolerance, adjustment
   %, order, watering interval, season-month override and compatibility
   group — only the fields you change are updated. A **🗑 Elimina zona**
   button (with a confirmation prompt) removes the zone.
6. **⚙️ Impostazioni**, in the header, opens three independently-saved
   sections: **Weather & sensors** (weather entity, rain/outdoor-temperature/
   line-flow sensors, master valve), **Consumption budget** (liters per
   month and the action on exceeding it — notify, reduce, suspend) and
   **Calendar restrictions** (allowed weekdays, odd/even parity, forbidden
   time windows) — each with its own Save button.

Expert parameters (engine weights/thresholds, safety timings, notification
routing — §3 above) aren't in the panel; they stay in the hub's **Configure**
menu (the config flow), which also remains the way to do the **initial hub
setup**. Zones and programs, though, are created and edited from the panel
only — the config flow has no zone step, so there is nothing to keep in
sync.

The panel and the dashboard card read and write the same programs — use
either, or both; nothing needs to be migrated. The card (§5 above) keeps
working exactly as it does today.

## 7. Troubleshooting

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
