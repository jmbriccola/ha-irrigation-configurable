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
**Irrigazione** panel's settings (§6) and in the zones you add next — the
hub's **Configure** menu only holds the weather engine's advanced
parameters (§3).

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
clamps ("Never less than" / "Never more than") and an explicit duration or
volume kind — is edited live with the point-based curve editor (§6, and §5
for the same editor on the card): add, remove, drag or type each control
point, with a preview of the resulting value at seven reference
temperatures. Saving a curve resets the program's watering intensity —
uniform or per-day — back to the curve's own values; the editor warns first
if there's one to lose. `set_curve` (Developer tools → Actions; see the
README's service list) sets a curve the same way from an automation or a
scripted import.

**Zone order** is the number entity on each zone (or the `set_zone_order`
service) — there is deliberately no drag-and-drop in the panel.

## 3. Hub options (Configure)

*Settings → Devices & services → Irrigation Maestro → Configure* opens onto
a single section now:

- **Engine (advanced)**: every weight and threshold of the weather decision
  engine, with a **reset to defaults** switch. Season months, the
  stale-weather threshold and its fail-open/fail-closed policy live here
  too — it stays a config-flow step because it is field-validated and
  deliberately out of the dashboard's reach.

General settings (master valve pre/post delays, max concurrent zones,
compatibility groups), safety & timing, restrictions, notifications and the
consumption budget all moved to the panel's **⚙️ Impostazioni** (§6) — this
page no longer offers them. The weather entity and its sensors, set once
during initial hub setup above, are edited from there too from then on.

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
**Edit curve**. The editor shows the curve as a live graph and as a list of
control points: add a point, remove one, or drag or type its temperature
and value directly. The graph, the seven-temperature preview and the 'with
today's weather' line update as you edit. *Never less than / Never more
than* set the absolute clamps applied after the curve and any intensity
scaling, and a duration/volume selector appears for zones with a flow
meter. Saving resets the program's watering intensity — uniform or per-day
— back to the curve's own values; the editor warns first if there's one to
lose. `set_curve` (Developer tools → Actions) sets a curve the same way
from an automation.

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
4. **Advanced** settings on a program — the same point-based curve editor as
   the card (§5): add, remove, drag or type each control point, set the
   *Never less than / Never more than* clamps and the duration/volume kind,
   and preview the result at seven reference temperatures — for programs
   that scale duration with temperature instead of a fixed value. Saving a
   curve resets the program's watering intensity to the curve's own values;
   the editor warns first. Live behind a drawer, collapsed by default.
5. **＋ Aggiungi zona** (next to the zone tabs) opens a short form — name,
   valve (or switch) entity, area — and creates the zone with one sensible
   default program, ready to refine. **✎ Modifica zona** (above the program
   list, for the selected zone) opens the same form pre-filled, plus an
   **Avanzate** drawer for flow sensor, nominal flow/tolerance, adjustment
   %, order, watering interval, season-month override and compatibility
   group — only the fields you change are updated. A **🗑 Elimina zona**
   button (with a confirmation prompt) removes the zone.
6. **⚙️ Impostazioni**, in the header, holds the everyday hub settings, each
   saved independently: **Weather & sensors** (weather entity, rain/
   outdoor-temperature/line-flow sensors, master valve), **Consumption
   budget** (liters per month and the action on exceeding it — notify,
   reduce, suspend), **Calendar restrictions** (allowed weekdays, odd/even
   parity, forbidden time windows) and **Notifications** (a three-step
   guided wizard: recipients are picked from the `notify.*` services this
   instance actually has — never typed, each with a test-send button —
   events are chosen by preset (*Recommended*, *Critical only*,
   *Everything*) across three collapsible severity groups with a priority
   chip per event, then a summary to save; the four events an irrigation
   system should never miss — watchdog, anomaly, sentinel, interrupted —
   come pre-selected; skips sharing a reason still produce one aggregated
   message). Two collapsed **Advanced** drawers hold the rest: **session
   and safety** (max session length, must-finish-by, wait-for-free-valves,
   block window after a manual stop, settle pause between zones, sentinel
   time) and **valves and concurrency** (open/close/switch confirmation
   windows, startup close timeout, watchdog maximum, max concurrent zones
   and compatibility groups, master valve pre-open/post-close delays).

Expert parameters — the weather engine's weights and thresholds (§3 above)
— aren't in the panel; they stay in the hub's **Configure** menu (the
config flow), which also remains the way to do the **initial hub setup**.
Everything else "Configure" used to hold, safety timings and notification
routing included, is an ordinary panel setting now (point 6 above), not a
config-flow step. Zones and programs are created and edited from the panel
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
