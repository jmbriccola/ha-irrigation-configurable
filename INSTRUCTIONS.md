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
   - **Line flow sensor** (optional) — a shared flow meter on the manifold,
     used by every zone without its own meter. Whatever unit it declares
     (m³/h, L/h, gal/min, …) is detected and converted to L/min
     automatically; a sensor that declares nothing usable can be given an
     explicit unit in the panel's **Weather & sensors** settings (§6) —
     clearing it resumes detection. Until the unit is known the meter counts
     as absent (see the README's degradation matrix).
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
ready to refine. The extra zone fields — flow meter with its unit override,
nominal flow/tolerance, **leak sensor**, **water-supply sensor**, adjustment
% (default 100% — e.g. 70% for a shaded bed), order, cadence in days, season
months, compatibility group — live behind **✎ Modifica zona → Avanzate**.
Cycle (program) IDs are stable, so history and per-cycle switches survive
edits.

The two sensor fields are **pre-filled from the valve's own device** when
one is found there: creating a zone walks from its valve entity to that
device and takes a sibling `binary_sensor` with `device_class: moisture` as
the leak sensor and one with `device_class: problem` as the water-supply
sensor. Detection is by device class only — never by entity name — so a
valve that exposes nothing simply gets neither, and an existing zone is
never wired up behind your back: the panel offers the candidate and it takes
effect only when you save. Either field can point anywhere you like; a
moisture probe in the flower bed is a legitimate choice, and so is a supply
contact shared by the whole garden. See §7.

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
   **Avanzate** drawer for flow sensor (with its unit — detected
   automatically, or overridden for a sensor that declares nothing usable;
   clearing the override resumes detection), nominal flow/tolerance, the
   **leak sensor** and **water-supply sensor** (§2 and §7), adjustment %,
   order, watering interval, season-month override and compatibility group —
   only the fields you change are updated. A **🗑 Elimina zona** button (with
   a confirmation prompt) removes the zone.
6. **⚙️ Impostazioni**, in the header, holds the everyday hub settings, each
   saved independently: **Weather & sensors** (weather entity, rain/
   outdoor-temperature/line-flow sensors and the line meter's unit
   override, master valve), **Consumption
   budget** (liters per month and the action on exceeding it — notify,
   reduce, suspend), **Calendar restrictions** (allowed weekdays, odd/even
   parity, forbidden time windows) and **Notifications** (a three-step
   guided wizard: recipients are picked from the `notify.*` services this
   instance actually has — never typed, each with a test-send button —
   events are chosen by preset (*Recommended*, *Critical only*,
   *Everything*) across three collapsible severity groups with a priority
   chip per event, then a summary to save; the five events an irrigation
   system should never miss — watchdog, anomaly, sentinel, interrupted,
   leak — come pre-selected; skips sharing a reason still produce one
   aggregated message). Two collapsed **Advanced** drawers hold the rest:
   **session and safety** (max session length, must-finish-by,
   wait-for-free-valves, block window after a manual stop, settle pause
   between zones, sentinel time) and **valves and concurrency**
   (open/close/switch confirmation windows, startup close timeout,
   watchdog maximum, max concurrent zones and compatibility groups,
   master valve pre-open/post-close delays, and — at the foot of the same
   drawer, saved with the same button — the **leak and water-supply
   settings**: what to do on a confirmed leak, the leak threshold in L/min,
   the leak confirmation window, the reminder interval, whether a cycle may
   start without water and how long an outage must last first; see §7).

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

## 7. Leaks, and water that never arrives

Two different problems, two different sensors, and it is worth keeping them
apart: a **leak** is water going where it should not, a **missing supply** is
no water arriving at all.

**A leak is confirmed from two kinds of evidence**, and they raise one alarm
between them, not two:

1. the zone's **leak sensor** reporting while *that zone's* valve is closed —
   on some valves (the SONOFF SWV among them) that alarm is derived from the
   valve's own internal flow meter and means "water is passing while I am
   shut"; on others it is a ground probe. Either way, what is known is that
   the valve reports water it should not be seeing;
2. **flow measured while every managed valve, master included, reports
   closed** — above the leak threshold (default 0.5 L/min; below that is drip
   and drainage). This needs no sensor at all, only a flow meter, so an
   installation of three zones with their own meters and no leak sensors
   anywhere is watched on every zone.

Both must last the confirmation window (default 300 s) before anything is
said. A meter that serves more than one zone cannot say *which* zone is
leaking, so its alarm is raised for the **system** instead; the zones behind
it show "leaks watched at system level, not for this zone", which says where
they are watched, not whether they are.

**What you get when one is confirmed**: a high-priority notification (the
`leak` event is pre-selected in the wizard, §6), a Repairs notice that stays
for as long as the condition does, a reminder every 6 hours by default, and
one of the new **leak entities** turning `on`.

**The leak entities** are `binary_sensor`s with `device_class: problem` — one
per zone plus one for the system — and they are what an automation should
watch. Read this before writing one:

- **`unavailable` is normal, and it can last for ever.** It means *nothing
  has been established here*: either nothing could ever raise the alarm for
  this zone, or the zone has not yet been watched long enough. An automation
  written against an entity that never leaves `unavailable` **silently never
  fires**, and silence looks exactly like working. Check that the entity has
  gone to `off` before you trust it.
- **After a restart it is `unavailable` for a confirmation window before it
  will say `off`, on purpose.** `off` on a `problem` sensor asserts *there is
  no problem*, and moments after boot nothing of the kind has been
  established. If it said `off` there, the natural companion automation —
  "leak cleared → reopen the mains" — would fire on a restart during a live
  leak.
- If a zone's entity is stuck at `unavailable`, the zone's own **degraded
  badges** say why after an hour: *could not check for leaks* (nothing was in
  a position to conclude anything) or *cannot finish judging a possible leak*
  (something is reporting and nothing can resolve it). Neither means the zone
  is broken — hand-watering off an irrigation line for over an hour holds a
  valve open, which reads exactly the same and is perfectly benign. The
  **system** entity has no such badge at all, so if it is quiet and no zone
  explains why, look at the line meter yourself.
- If you have a line meter **and** per-zone meters, one leak raises both the
  zone's entity and the system's — they are measuring the same water and
  neither can know the other saw it. Make the automation idempotent, or
  trigger on one scope only.
- `since` is when the alarm was **confirmed**, not when the water started.

**What the component does about it** is yours to choose, in ⚙️ Impostazioni →
*Advanced: valves and concurrency*: notify only, notify and re-close the
valves (the default), or notify, re-close and refuse new cycles. The default
is deliberately not the blocking one — re-closing a valve that is already
closed does nothing, and that is the honest position: a leak found while
nothing is watering cannot be stopped by this integration, only reported,
with the closure re-asserted in case a command was lost. Blocking is there
for the burst-pipe case, and it is opt-in because a false positive that
blocks leaves the garden dry.

**The water-supply sensor** answers the other question. It is a `problem`
sensor whose polarity reads backwards from its name: **`on` means there is no
water**. With one configured, a cycle is refused rather than started into a
dry line — but only once the outage has lasted the confirmation window
(default 180 s), so a single flaky reading cannot withhold water, and after a
restart that clock starts again, because how long the water has been off is
not knowable. The outcome reads `no_water_supply` rather than a generic
`no_flow`, and so does a cycle that had already started and found nothing
flowing.

Switching **"start without water"** back on turns off the refusal and nothing
else: the notification and the Repairs notice still arrive. Choosing to water
anyway is not the same as choosing not to be told.

Two honest limits worth knowing before you rely on any of this:

- **A zone with no flow meter has no zero-flow guard at all.** The guard is
  built only where a meter resolves, so a cycle that starts into a closed tap
  on an estimated zone runs its full length dry and records its nominal
  estimate as though it had watered. Nothing notices. That is exactly the
  installation a water-supply sensor is worth most on — a supply contact is
  cheap and per-zone meters are not.
- **A valve that shuts itself off** because its firmware sees no flow used to
  abort the whole session as manual intervention. It is now read for what it
  is — but only for the watering zone's own valve, and only when that zone's
  own supply sensor says the water is gone, at that moment or within five
  seconds. Without such a sensor there is no way to tell firmware from a hand
  on the switch, so the old behaviour stands.

## 8. Troubleshooting

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
- **A leak entity never leaves `unavailable`** → nothing has been established
  for that scope. Look at the zone's badges: *leaks not watched here* means
  no source is configured at all; *could not check for leaks* or *cannot
  finish judging a possible leak* (after an hour) means a source exists but
  nothing has been in a position to conclude — a sensor that has never
  reported, a meter whose unit will not resolve, or a valve that never
  reports closed, which blocks every metered scope. It is not a fault by
  itself: an hour of hand-watering from an irrigation line looks identical.
  Any automation on that entity is not firing while this lasts (§7).
- **Everything skipped as `leak`** → the leak action is set to *close and
  block* and an alarm is standing. Clear the cause; the block lifts with the
  alarm. The Repairs notice names the zone and the evidence.
- **One leak, two alarms** → you have a line meter *and* per-zone meters, so
  the same water is measured twice and both scopes report it. Expected; see
  the README's degradation matrix.
- **`no_water_supply`** → the zone's water-supply sensor reports no water and
  the outage has lasted the confirmation window. Check the tap, the mains
  pressure and any upstream shut-off. Remember the polarity: `on` on that
  sensor means the water is *missing*.
- **"Unrecognised leak action"** → the stored `leak_action` is not one of
  `notify` / `close` / `close_and_block`; the component fell back to `close`
  and told you rather than blocking silently. Set it again in the panel.
- Diagnostics: integration page → three-dot menu → **Download diagnostics**
  (config + runtime state, redacted).
