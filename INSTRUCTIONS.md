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
   the leak confirmation window, the reminder interval, **Refuse to start
   without water** and how long an outage must last first; see §7).

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
`leak` event is pre-selected in the wizard, §6), a Repairs notice, a reminder
every 6 hours by default, and one of the new **leak entities** turning `on`.

The Repairs notice stays for as long as the condition does — with one
exception worth knowing, because nothing on screen will tell you: **a restart
of Home Assistant takes it down.** The alarm lives in memory and is
deliberately not persisted (see the entity bullets below), so the notice goes
with it and comes back only once the evidence has been gathered again over a
fresh confirmation window. The same is true of the water-supply notice. A
notice that is gone the morning after a reboot has not been resolved; it has
been forgotten, and is being re-established.

**The leak entities** are `binary_sensor`s with `device_class: problem` — one
per zone plus one for the system — and they are what an automation should
watch. Read this before writing one:

- **`unavailable` is normal, and it can last for ever.** It means *nothing
  has been established here*: either nothing could ever raise the alarm for
  this zone, or the zone has not yet been watched long enough. An automation
  written against an entity that never leaves `unavailable` **silently never
  fires**, and silence looks exactly like working. Check that the entity has
  gone to `off` before you trust it.
- **The sequence after every restart is: `unavailable`, for one confirmation
  window of observation, then `off`** — or `on`, if a leak gets confirmed
  first. `off` on a `problem` sensor asserts *there is no problem*, and
  moments after boot nothing of the kind has been established, so the entity
  says nothing instead. This means every healthy install makes an
  `unavailable → off` transition once per restart, which is why the clearing
  automation below is written the way it is.
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

The pair almost everyone wants is "leak → close the mains" and "leak cleared
→ reopen it". Write it like this:

```yaml
automation:
  - alias: Leak - close the mains
    triggers:
      - trigger: state
        entity_id: binary_sensor.alpha_leak
        to: "on"
    actions:
      - action: valve.close_valve
        target:
          entity_id: valve.mains

  - alias: Leak cleared - reopen the mains
    triggers:
      - trigger: state
        entity_id: binary_sensor.alpha_leak
        # `from: "on"` is load-bearing: it restricts this to a real clearing
        # edge. Without it the trigger also matches the `unavailable -> off`
        # transition every restart produces, and the mains would reopen on a
        # reboot you did after closing them by hand.
        from: "on"
        to: "off"
    actions:
      - action: valve.open_valve
        target:
          entity_id: valve.mains
```

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

Switching **"Refuse to start without water"** off turns off the refusal and
nothing else: the notification and the Repairs notice still arrive. Choosing
to water anyway is not the same as choosing not to be told. (That checkbox is
the panel's name for it; the `set_valve_safety` service calls the same setting
**Require the water supply**, and the stored key is `require_water_supply`.
All three are on when the refusal is on.)

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

### Trip it on purpose, before you need it

None of this proves itself. The alarm lives in memory, the entity says
nothing until it has watched long enough, and a correctly configured system
that is quiet looks exactly like a misconfigured one that is quiet. Test it
deliberately, once, on a day nothing is wrong.

**A false trip is free.** The default action re-closes the master and the
implicated valve *only where one of them is still reporting open* — and on an
idle system both are already shut, so no command is sent at all: nothing
reaches the valves and nothing reaches the command ledger. Nothing is
watered, nothing is stopped, no valve moves. (While a cycle is running the
re-close is skipped outright, so that a leak on one zone cannot abort
another zone's watering.) Only `close_and_block` has a cost worth thinking
about, and only because it refuses new cycles until you clear the alarm.

**Shorten the wait first.** ⚙️ Impostazioni → *Advanced: valves and
concurrency* → **leak confirmation window**, set to 60 seconds, Save. The
water-supply window beside it can go to 30. **Put both back afterwards** —
300 s and 180 s are the defaults, and they are what keeps a flaky sensor
from crying leak. Lowering it during a test takes nothing back: a scope that
has already settled stays settled.

Two of the three sources have a physical condition you cannot safely create,
so **Developer tools → States → pick the entity → Set state** is the honest
way in. One caveat that matters: *the real device overwrites your value on
its next report.* A battery sensor that only reports on change may stay
quiet for hours and let the test run; a flow meter that reports every few
seconds will overwrite you almost at once, which is why the flow source is
better tested with real water. **Keep the attributes exactly as shown** when
you set a state — a meter without its `unit_of_measurement` records nothing
at all, and the test would fail for the wrong reason.

**Source 1 — the valve's leak sensor.** Set the zone's leak sensor to `on`
while its valve is closed (it will be, if nothing is watering). The clock
starts at the later of your edit and that valve last reporting closed, so in
practice: from now.

**Source 2 — flow while everything is shut.** The honest test is real water:
open a hand tap fed from the metered line while nothing is watering. As far
as the component is concerned that *is* a leak, which is exactly the point.
Otherwise set the flow sensor to a value above the leak threshold (default
0.5 L/min) and leave it there. The meter is sampled every 30 seconds and the
window counts **measured** seconds, so about ten samples are needed at the
default — and a meter that stops reporting pauses that count rather than
resetting it. A zone with no meter at all cannot test this source; there is
nothing to observe with.

While you are looking at the meter, **write down what it reads with every
valve shut and nothing leaking.** That number is what the 0.5 L/min leak
threshold is guessing at, and this is the only moment it is cheap to
measure: a line that sits at a true zero can have the threshold lowered, and
one that trickles while it drains needs the default or more. Nobody has this
figure for real hardware yet.

**Source 3 — the water supply.** Set the zone's water-supply sensor to `on`,
remembering that `on` means the water is **gone**. This one is not a leak
and the leak entities correctly do not move.

**What should happen, in order:**

1. **Nothing, for the whole window.** This is the single most common reason
   to conclude the feature is broken. At the defaults that is five minutes of
   silence for a leak and three for the supply.
2. Then, for a leak: a high-priority **notification** to your configured
   targets; a **Repairs issue** (Settings → Devices & services → Repairs)
   naming the zone and which evidence it is citing; the zone's **leak entity**
   turns `on`; the **card row** shows its leak badge. A reminder repeats every
   6 hours (default) until it clears.
3. For the supply: notification and Repairs notice, and no leak anywhere.
   The interesting outcome is the **refused start** — call `run_zone` on that
   zone, or press play on its card row, and the run is skipped with the
   outcome `no_water_supply`. Manual runs are deliberately not exempt: asking
   by hand does not conjure water into the pipe. (With *Refuse to start
   without water* switched **off**, the notice still arrives and only the
   refusal is gone — so leave it on for this test.)

**Clearing, and what it looks like.** Set the leak sensor back to `off` and
the source withdraws immediately; drop the flow back to zero, or close the
tap, and it withdraws on the next meter sample — a *measured* zero is what
withdraws it, which is also why post-cycle drainage never leaves an alarm
standing. When the last source withdraws you get a "cleared" notification,
the Repairs issue disappears, the entity returns to `off` and the badge
clears. Under `close_and_block` the message also tells you whether cycles
are actually allowed again — they are not, if another scope still holds an
alarm of its own. Deleting the zone while its alarm stands clears it the same
way, and you get the same "cleared" notification, naming the zone as it was
last configured: an alarm whose subject no longer exists would otherwise
never be withdrawn, and any automation waiting on the all-clear would wait
for ever.

**And to see what the component actually thinks**, download diagnostics
(integration page → three-dot menu → **Download diagnostics**) and read the
`leaks` section. It is the only window into any of this, because none of it
is written to disk: per scope it reports whether a source is configured,
whether a state has been established, how many observable seconds have been
earned (`observation.observed_s`) against the window they must reach
(`observation.window_s` — the confirmation window, but never less than 30 s,
which is why it is reported beside `confirm_s` rather than instead of it),
whether the scope can observe right now, whether it is holding evidence it
cannot resolve, whether it has latched, and — in
`observation.blocking_valves` — exactly which valves are stopping it, naming
only valves that report *neither* open nor closed, since an open valve is
watering rather than faulty. Plus which meters report for the scope, which is
the only way to confirm from outside that a shared line meter really is routed
to the system scope.

**The raw values you will meet there.** The card translates all of these into
your language; Developer Tools and the diagnostics download deliberately do
not, because the words belong to the card and having them in two places would
mean two owners for one sentence. What each one says:

- **`valve_sensor`** (in `sources`, `describing_source`, `first_source`) —
  the valve's own sensor reports a leak. On the reference hardware that is an
  alarm derived from the valve's *internal flow meter*, meaning "water is
  passing while I am shut"; on a genuine ground probe it means the probe is
  wet. It does not mean water has been seen on the ground.
- **`no_flow_closed`** (same places) — water was measured while every managed
  valve, master included, reported closed.
- **`zone` / `system` / `none`** (in `capabilities.leak_watch`) — *where*
  this zone's water is watched for leaks: on its own scope, on the system
  scope (a meter shared with other zones, so no zone can be named), or
  nowhere. It states a place, never a verdict: `system` is not "unwatched",
  and a leak there does raise `hub_leak`.
- **`leak_never_observable`** (in `degraded`) — for an hour of idle time,
  nothing here has been in a position to conclude anything: a sensor that has
  never reported, a meter that is not measuring, or a valve that never
  reports closed. **Not a fault by itself** — an hour of hand-watering from
  an irrigation line reads exactly the same.
- **`leak_evidence_unresolved`** (in `degraded`) — same hour, but something
  *is* reporting a leak and nothing can finish judging it.
- **`leak_sensor_missing` / `water_supply_sensor_missing`** (in `degraded`) —
  the sensor you chose no longer exists. The zone still says it is configured,
  because that was your choice and nothing overwrites it silently.
- **`flow_unit_unknown`** (in `degraded`) — the meter is there but its unit
  will not resolve, so litres, volume mode and the flow anomalies all treat it
  as absent rather than guessing L/min. **Leak detection is the exception, and
  it is the one that matters in this chapter:** `capabilities.leak_watch` is
  answered from what is *configured*, with no usability test, so such a zone
  still reads `zone` — while source 2 can conclude nothing from a meter it
  cannot read. Its leak entity therefore stays `unavailable` for ever; the
  card shows *Leak check not concluded yet* meanwhile, and after an hour of
  idle time `leak_never_observable` joins this key in `degraded` and the card
  shows those instead. Fix the unit (§1, or the panel's **Weather &
  sensors**) or clear the meter — waiting produces no answer.

Outcome reasons you may see on a zone — `no_water_supply`, `leak`, `no_flow`
— are explained in §8 below.

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
- **"A valve is not reporting its position"** → that valve reads neither open
  nor closed — a flat battery, a radio that dropped out, a cloud integration
  in backoff, or an entity deleted from Home Assistant but left in the
  configuration. It is worth reacting to even though nothing looks wrong:
  while it lasts, **leak detection by flow is off for every zone**, not just
  that valve's own, because that source works by measuring water while *every*
  managed valve reports closed. A zone whose scope had already settled keeps
  publishing its last `off`, which is a latched answer and not a live check.
  Restore the valve or remove it from the configuration; the notice goes as
  soon as it reports again, and each zone then serves a fresh confirmation
  window. One notice per such valve, raised after an hour.
- **Everything skipped as `leak`** → the leak action is set to *close and
  block* and an alarm is standing. Clear the cause; the block lifts with the
  alarm. The Repairs notice names the zone and the evidence.
- **One leak, two alarms** → you have a line meter *and* per-zone meters, so
  the same water is measured twice and both scopes report it. Expected; see
  the README's degradation matrix.
- **`no_flow`** → the cycle started but the meter measured essentially nothing
  over the grace window, so it was interrupted. Check the tap, the filter and
  the line. If that zone has a water-supply sensor and the water is genuinely
  gone, the outcome names `no_water_supply` instead — the more specific
  diagnosis wins. A zone with **no** meter has no such guard at all and runs
  its full length dry (§7).
- **`no_water_supply`** → the zone's water-supply sensor reports no water and
  the outage has lasted the confirmation window. Check the tap, the mains
  pressure and any upstream shut-off. Remember the polarity: `on` on that
  sensor means the water is *missing*.
- **"Unrecognised leak action"** → the stored `leak_action` is not one of
  `notify` / `close` / `close_and_block`; the component fell back to `close`
  and told you rather than blocking silently. Set it again in the panel.
- Diagnostics: integration page → three-dot menu → **Download diagnostics**
  (config + runtime state, redacted).
