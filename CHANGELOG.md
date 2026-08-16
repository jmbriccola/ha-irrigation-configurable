# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [3.5.0] - 2026-08-16

### Read-only history services

- **Two new services, both `supports response: ONLY`.** `get_water_history`
  returns the per-zone daily water series the component has held since
  3.3.0 but that a caller could previously only reach through the
  diagnostics download; `get_run_history` returns every recorded outcome —
  completed runs and, just as importantly, the ones that were skipped,
  interrupted or cancelled, each with its `reason_key`. A cycle that never
  starts leaves no trace anywhere else, and until now neither did a card
  asking one.
- **The run log lives in a `Store` of its own.** `RuntimeState` rewrites its
  whole dict on every `schedule_save()` — a litre-bearing meter sample, a
  session phase transition, a zone toggle, midnight housekeeping — and the
  run log reaches roughly 2 MB at its cap. Appending a growing series to
  that store would multiply write amplification, on what is usually an SD
  card, for something that changes a handful of times a day. It is instead
  its own file, its own storage version, loaded and saved independently,
  with its own persisted `cap_dropped` counter — the only thing that tells
  a truncated log apart from one that has simply not run long enough, since
  both have an oldest entry newer than a caller's requested start.
- **The water series is dense: one point per day, zeros included.** An
  omitted day would be indistinguishable from a day the component never
  observed. A day whose meter could not be read is not dropped either: it
  is recorded as zero litres carrying the seconds that went unobserved
  (`gap_s`), because interpolating would invent water and counting a plain
  zero would assert that none passed. `l: 0, gap_s: 0` and `l: 0, gap_s >
  0` are different sentences, and a card must not draw them the same way.
- **Unattributed water is never summed into the zones.** `get_water_history`
  returns it as a sibling of `zones`, never as a member, so summing the
  zones stays the right operation for a total or a budget. `closed_l` on
  its days is the subset measured with every managed valve shut — the only
  figure leak detection reads.
- **A removed zone keeps its water and its runs.** Both services still
  return them, with `zone_name: null` and sorted last: deleting a zone's
  history along with its configuration would rewrite months a user already
  lived through, over a fact — the water used, the cycles run — that
  removing the zone does not undo.
- **The run log starts empty at this upgrade, on purpose.** The sentinel's
  `outcome_log` — the only outcome record that existed before this branch —
  keeps three days of bare result strings, with no `reason_key` and no
  duration, kept purely to answer "did this cycle leave a trace". Inventing
  plausible `reason_key`s for those three days to seed the new log would be
  exactly the plausible-but-false number this architecture exists to
  remove, so `get_run_history` answers truthfully with nothing before the
  upgrade instant instead of a guess dressed as history.

## [3.4.0] - 2026-08-16

### Per-zone leak detection

- **Two optional sensors per zone, detected rather than named.** When a zone
  is created, the integration walks from its valve entity to that valve's
  device and looks for sibling `binary_sensor`s by **device class** —
  `moisture` becomes the zone's *leak sensor*, `problem` its *water-supply
  sensor*. Nothing is matched on entity names, id prefixes or manufacturer:
  the ids in any field report are examples from one installation.
  `add_zone` writes what it finds; for a zone that already exists nothing is
  adopted behind your back — `discover_zone_sensors` reports the candidates,
  the panel pre-fills them in **✎ Modifica zona → Avanzate**, and they take
  effect only when you save. Either field can be pointed anywhere: a probe in
  the flower bed is a legitimate, deliberate choice.
- **A leak is confirmed from two independent kinds of evidence, and raises
  one alarm.** Source 1 is the valve's own leak sensor, counted only while
  *that zone's* valve reports closed — on the SONOFF SWV the `moisture`
  alarm already means "water is passing while I am shut", and on hardware
  where it is a genuine ground probe the gate is what stops a probe under a
  sprinkler alarming on every cycle. Source 2 is flow above
  `leak_threshold_lpm` (default **0.5 L/min**) measured while **every**
  managed valve, master included, reports closed. Both must persist for
  `leak_confirm_s` (default **300 s**) — source 1 in wall-clock time from
  the later of the sensor asserting and the valve reporting closed, source 2
  in seconds the meter actually measured, so a reporting gap neither confirms
  nor denies. Whichever notices first raises the alarm; a second source
  agreeing records itself and stays quiet.
- **The alarm belongs to a scope, which is not always a zone.** A meter that
  serves two or more zones — or none — cannot say which zone leaked, only
  that the *system* is losing water, so its alarm is raised on the hub scope
  instead. Zones behind such a meter report
  `capabilities.leak_watch: "system"`, which states *where* their water is
  watched rather than passing a verdict on whether it is.
- **Two new entities: `zone_leak` (one per zone) and `hub_leak`**, both
  `binary_sensor` with `device_class: problem` and the attributes `sources`,
  `since` and `describing_source`. There is deliberately no summary entity:
  an automation that closes the mains needs to know which zone to shut.
  `unavailable` is a first-class state here and means *nothing has been
  established* — either no source could ever raise the alarm, or the scope
  has not yet been **observed** for one confirmation window, counting only
  seconds in which a source could actually have concluded something. That is
  what makes the obvious automation pair safe: `off` under `problem` asserts
  *there is no problem*, and publishing it at boot would fire "leak cleared →
  reopen the mains" during a live leak. The alarm is deliberately not
  persisted, because a restored alarm can be stale. **An entity can therefore
  stay `unavailable` indefinitely** — a configured sensor that never reports,
  or a scope never in a position to observe — and an automation written
  against it then silently never fires. After an hour of idle time that is
  declared on `zone_state.degraded` as `leak_never_observable` or
  `leak_evidence_unresolved`. Read the README's *Living with the leak
  entities* before automating on either.
- **`irrigation_maestro_leak`**, a new bus event and a new notification
  event. The event carries `scope`, `zone_id` (`null` for a hub-scope alarm),
  `state` (`active` | `cleared`), `first_source` and `sources`; it fires once
  when the alarm is confirmed and once when it clears, and the repeat
  reminder fires no event at all. As a notification it joins the four events
  an irrigation system should never miss, so it is pre-selected by the wizard
  and defaults to high priority — one message on the transition, then a
  reminder every `leak_repeat_min` (default **360 min**; zero turns the
  reminders off without touching the alarm), and a Repairs issue that stands
  for as long as the condition does — **except across a restart**, which takes
  it down with the in-memory alarm behind it; it returns only once the
  evidence has been earned again over a fresh confirmation window. The same
  holds for the water-supply notice.
- **`leak_action` decides what happens next**: `notify` (message and Repairs
  notice only), `close` (the default — additionally one re-close of the master
  and the implicated valves, but only of a valve still reporting open, so on
  an idle system no command is sent at all) or `close_and_block` (also
  refuses to start new cycles for the zones concerned while the alarm
  stands). The default is deliberately not the blocking one: re-closing a
  valve that is already closed is a no-op, which is the honest position — a
  leak found while idle cannot be stopped by this component, only reported,
  with the closure re-asserted in case a command was lost. It recovers a valve
  left open by a lost command and dries nothing on a false positive. The
  re-close is skipped while a cycle is running, because a zone's own sensor
  can alarm while a *different* zone waters and closing the master there would
  abort a cycle nothing implicated. An unrecognised value falls back to
  `close` and says so in Repairs instead of doing it silently.
- **Diagnostics now carry the leak picture.** Everything above lives in
  memory by design — the alarm is not persisted, and neither is the
  observation window — so the diagnostics download, which dumps the *stored*
  state, said nothing whatever about a subsystem whose failure mode is
  silence. Per scope it now reports the alarm with its sources, `since` and
  describing source; whether a source is configured and whether the state is
  established; and the observation window itself: seconds earned
  (`observed_s`) against the figure they must reach (`window_s` — the
  confirmation window, floored at 30 s, reported beside `confirm_s` rather
  than replacing it), whether the scope can observe right now, whether it
  holds evidence it cannot resolve, whether it has latched, the stall reason
  once there is one, and `blocking_valves`: which valves are holding this
  scope's window shut, naming only valves that report *neither* open nor
  closed. Every value is read from the predicate the rest of the component
  already uses, so a support dump cannot disagree with the entity beside it.
- **A valve that cannot say where it is is now named.** Leak source 2 needs
  *every* managed valve to report closed, and "reports closed" is strict — so
  one flat battery, one radio dropout, one cloud integration in backoff, or
  one valve deleted from Home Assistant but left in the configuration
  silently switches flow-based leak detection off for **every** zone, not
  only its own. After an hour that now raises one Repairs notice **per such
  valve**, naming it — where a meter exists at all, since with none there was
  no flow detection to stop. A valve that is merely open is watering and
  raises nothing. The notice also states what a reader would otherwise get
  wrong: a scope that had already settled goes on publishing the `off` it last
  established throughout the freeze, which is a latched answer rather than a
  live check. It comes down the moment the valve reports its position again.
- **A leak in progress is described by evidence the scope still has.** The
  Repairs notice is keyed on `describing_source` — the first source to notice
  while it is still contributing, a surviving source otherwise — so removing
  the meter from a zone whose sensor is still asserting re-describes the
  notice instead of leaving it citing flow nobody is measuring. `first_source`
  keeps its own meaning on the event payload and in the log. Withdrawing a
  source by de-configuring it withdraws its alarm too, reminders included.

### Water that never arrives, which is not a leak

- **An optional water-supply sensor per zone** (`device_class: problem`,
  where **`on` means there is NO water** — inverted with respect to how the
  name reads). It answers a question the flow meter cannot: whether the
  cycle delivered nothing because something is broken, or because there was
  nothing to deliver.
- **A cycle is refused rather than run dry**, once the outage has lasted
  `water_supply_confirm_s` (default **180 s**). A single flaky reading
  cannot withhold water, and after a restart the clock restarts — we do not
  know how long the supply has been out, so we do not withhold water on that
  ignorance. The outcome is `no_water_supply`. `require_water_supply`
  (default on) governs **only** the refusal: switching it off still notifies
  and still raises the Repairs notice, because "do not withhold water" is a
  different statement from "do not tell me".
- **A cycle interrupted for want of flow now names the missing supply**, as
  `no_water_supply` rather than a generic `no_flow`. That diagnosis is
  deliberately *not* gated on the confirmation window: it explains an event
  that already happened, and the reading at that instant is the evidence.
- **The notice does not lift on silence, though the refusal does.** Only the
  sensor reading `off`, or being removed from the zone, withdraws the notice;
  an `unavailable` sensor used to push "the water is back", a claim nobody
  had established. The refusal, by contrast, lifts on silence — one must not
  withhold water on no evidence, and one must not assert a recovery on no
  evidence either.

### Behaviour changes

- **A valve that shuts itself off for lack of water is no longer treated as
  manual intervention.** Some valves (the SONOFF SWV among them) close
  themselves when their firmware notices no flow. Until now that was an
  unledgered close during a cycle, which aborted the whole session and armed
  the 60-minute manual-stop block. It is now read for what it is — the
  segment ends as `no_water_supply` and the queue keeps its place —
  **provided** the closing valve belongs to the watering zone and that zone's
  own water-supply sensor reports no water, at that instant or within a
  five-second grace (the valve's state and its sensor are two entities of one
  device, reported in no guaranteed order). With no such sensor nothing
  changes: there is no way to tell firmware from a hand on the switch, and
  uncertainty still aborts.
- **`set_valve_safety` now also writes the leak and water-supply settings**
  (`leak_action`, `leak_threshold_lpm`, `leak_confirm_s`, `leak_repeat_min`,
  `require_water_supply`, `water_supply_confirm_s`), and the panel edits them
  in **⚙️ Impostazioni → Advanced: valves and concurrency**. The service is
  slightly misnamed for it; renaming would break every existing automation
  for a gain in discoverability only, so it keeps its name.
- **`update_zone` accepts `leak_sensor` and `water_supply_sensor`**; passing
  an empty string clears either. `add_zone` takes neither — it writes only
  what it detects.
- Italian: the water-supply sensor is now called *sensore di mancanza
  d'acqua* everywhere, including in the service fields and the Repairs
  notice, which had two other names for it.

### Fixed

- **Closing an already-closed valve no longer disarms surveillance.** Every
  internal close registered a command-ledger entry, which exists solely to
  tell our own valve transitions apart from manual ones. A valve that is
  already closed produces no transition, so that entry was never consumed and
  sat for its full 60-second TTL — where it would absorb the *next* genuine
  manual close and let it pass unnoticed. `runtime.async_close_all_valves`
  already guarded against this; the session runner's own close path was the
  one that did not. Every re-close path in leak handling goes through it.

## [3.3.0] - 2026-08-14

### Water is metered continuously, not only during a cycle

- **One ledger per flow meter, always running.** Litres now accrue whenever a
  meter reports, whether or not anything is watering. Before this release the
  integration only integrated flow while it believed a zone was watering, so
  a dripping valve, a tap opened by hand, or a cycle that ended abnormally
  were all invisible to it — even though an external `utility_meter` reading
  the same sensor would have caught every drop. `FlowMonitor` no longer
  integrates; it reads deltas off the meter's own ledger.
- **Litres are attributed to whichever zone's valve reports open**, not to
  whichever zone the run phase claims — a distinction that matters during
  the open-confirm wait, during the master's pre-open, and above all when a
  close command fails: the valve stays open, but a phase-based rule would
  have stopped counting there and, worse, flagged the water it missed as a
  system leak.
- **Water no zone claims goes to an unattributed bucket**, split into a
  total — which includes the master's pre-open line priming, real water
  belonging to no zone on every single cycle — and an all-closed subset seen
  with every managed valve reporting closed. Only the all-closed subset is a
  leak signal.
- **`zone_water_total`** (per zone) and **`hub_unattributed_water`** (hub)
  are new sensors, `device_class: water` / `state_class: total_increasing`,
  so Home Assistant's own statistics engine produces daily/monthly/yearly
  figures for both and either is eligible for the Water dashboard. Neither
  publishes a "today" or "this month" sibling entity — recorder statistics
  already derive those from the recorded total, and a second entity holding
  the same fact would be a second thing that could drift from it.
  `zone_water_total` does carry `today_l`/`month_l` as attributes, sliced
  from the same per-zone daily history that backs its cumulative state.
- **A per-zone daily water history**, kept for 730 days, backs the totals
  above and the derived monthly budget below.
- **A meter that cannot be read is recorded as a gap, never as zero.** An
  unavailable meter — or one whose unit stops resolving — contributes no
  litres: interpolating would invent water, and counting a zero would assert
  that none passed, which nobody can assert of an interval nobody saw. What
  the day records instead is how many seconds went unobserved, attributed
  exactly as litres are (to whichever zones were watering, else to the
  unattributed scope), plus `last_gap_at` on `zone_water_total` — the
  instant of that zone's most recent unobserved interval, persisted with its
  counters. Without it a six-hour outage would read as a quiet afternoon.
- **The monthly consumption budget is now derived**, not a standalone
  counter: the carried-over opening balance (see "Behaviour changes") plus
  the per-zone daily sum for the period, computed fresh on every read.
  Unattributed water is deliberately excluded from it — a leak must not be
  able to suspend irrigation, the right consequence from the wrong cause.
- **An estimated zone (no usable meter) still gets `device_class: water`**
  and appears in the Water dashboard next to measured ones. Hiding it was
  considered and rejected: a zone's long-term trend is more useful with an
  estimated contribution than with a silent gap. What compensates is
  redundant marking, not exclusion — the `estimated`/`source` attributes, a
  card badge, and a per-day estimated flag in the history behind it. The
  README's degradation matrix states plainly what an estimated zone can and
  cannot detect: it sees water only during its own cycles, so
  unattributed-water (leak) detection is unavailable for it.
- **A one-time Repairs notice on upgrade** states that the old monthly
  counter has been carried forward once as this period's opening balance,
  and why that balance — and the litres recorded before this release — are
  not rewritten.

### Behaviour changes

- **Two zones sharing a line meter no longer double-count its water.**
  Before this release, every zone drawing from a shared line meter
  integrated the *full* line flow independently and each added that to the
  monthly total — the same water counted twice. Litres measured while more
  than one zone on the same meter is open are now split between the open
  zones in proportion to their `nominal_flow_lpm`.
- **A zone whose meter measures zero no longer books the nominal estimate.**
  The old guard was "this cycle tallied no litres *and* a nominal rate
  exists", which conflates "nothing flowed" with "there is nothing to
  measure with". A zone whose meter is perfectly readable and whose cycle
  was interrupted by the zero-flow guard measures a real, true zero — and
  the nominal estimate was booked on top of it, onto a `device_class:
  water` sensor on the Water dashboard. The guard is now "is there a usable
  meter", so such a cycle records nothing. Monthly totals on existing
  installs will be lower than 3.2.x reported wherever this happened.
- **`line_meter_shared` now catches a meter cleared to an empty string.**
  The check used to test a zone's own meter with `is None`, while the rest
  of the runtime resolves "does this zone have its own meter" by truthiness.
  A zone whose `flow_sensor` had been cleared to `""` (rather than left
  unset) fell back to the shared line meter without being labelled as
  sharing it. Fixed by routing every meter-resolution call site through one
  function, `resolved_meter_entity`, instead of seven separate copies of the
  same rule.

## [3.2.1] - 2026-08-14

### Fixed

- **A notification wizard whose first status read fails no longer gets
  stuck on "reading the notification status…" forever.** The failure now
  shows in place of the hint, with a retry button, instead of only a toast
  that disappears after six seconds and leaves no way back short of
  leaving Settings and returning.
- **A test send that fails now shows its result next to the recipient you
  tested**, not only as a toast: every recipient you test gets a verdict,
  a stale ✓ from an earlier attempt is replaced rather than left standing,
  and the row shows a pending state while the send — which blocks — is
  outstanding. The response behind that verdict is now validated rather
  than trusted blindly, the same treatment the status read already had.
- **The preset chips, priority chips and event-group headers in the
  notification wizard are reachable by keyboard** (role, tabindex,
  Enter/Space, `aria-pressed`/`aria-expanded`). They were click-only, so
  the four events an irrigation system should never miss could not be
  chosen without a mouse.
- `test_notification`'s default title and message now follow the
  instance's configured language instead of always being English; an
  explicit title or message you pass still wins, as before.
- Aliased recipients such as `["notify.phone", "phone"]`, which both
  resolve to the same service, now produce one result instead of the
  second silently overwriting the first.
- The doubled ellipsis on a test send's in-progress row ("… Invio in
  corso…") is gone.

### Changed

- **One Italian word for a flow meter: "flussometro."** The integration's
  translations, the card and the Italian docs previously mixed six terms
  for the same device — contatore di flusso, contatore di portata,
  contatore di linea, sensore di portata, sensore di portata di linea,
  misuratore di portata — depending on where you looked. They now all
  read "flussometro." The consumption counter ("contatore dei consumi")
  and the cadence counter are different concepts and were deliberately
  left as they were.
- The README degradation matrix's "Out-of-range diagnosis per zone" row
  now names the meter prerequisite it depends on, matching the row above
  it.

### Testing

- `panel.ts` — the notification wizard — had no test file at all until
  now. The most important property of the 3.1.0 notification work is
  pinned: a failed save stops the loop instead of continuing on to switch
  previously-enabled events off underneath a failed enable.
- A handful of properties reviewers had verified by reading code, but that
  nothing would have caught if a future change broke, are now guarded by
  tests: `Notifier.async_notify` keeps going past a missing recipient
  instead of aborting the whole send; `set_notifications` stays
  all-or-nothing even when it's a *later* named event that fails, not just
  a uniformly-failing one; `notification_status`'s response contains no
  tuples or sets anywhere in it; and the two notification Repairs issues
  fire independently of each other.
- `en.ts` and `it.ts` are now checked for identical key sets *and*
  identical key order, closing a gap two different review rounds had to
  catch by eye.

This release changes no decision the engine makes and migrates no
configuration.

## [3.2.0] - 2026-08-14

### Flow sensors are read in the unit they declare

- **Automatic conversion.** A meter reporting m³/h, L/h, gal/min or any other
  unit `VolumeFlowRateConverter` handles is now converted on the way in.
  Previously every reading was treated as L/min whatever the sensor declared,
  so an m³/h meter undercounted litres by a factor of 1000/60 ≈ 16.7.
- **L/min stays canonical** throughout the engine — `nominal_flow_lpm`,
  tolerances, accumulated litres, volume targets, the monthly counter and the
  anomaly messages. Conversion happens at one boundary, on read.
- **An explicit unit per sensor**, on the zone and on the hub's line meter,
  for a sensor that declares nothing or declares something unconvertible. The
  detected unit is offered as the default, the override wins over it, and the
  panel states which one is in use.
- **No silent assumption.** A meter whose unit cannot be determined has its
  readings ignored rather than guessed: volume mode and flow anomaly detection
  switch off for it, consumption falls back to nominal flow × minutes, and a
  Repairs issue names the sensor. In particular the zero-flow guard stands
  down instead of firing — otherwise every run on such a meter would have been
  interrupted.
- **A unit that changes at runtime** is picked up on the next read. If it
  becomes unresolvable mid-cycle the litres freeze at the last certain value
  and the cycle finishes on its timeout, without a crash or an interruption.
- **The meters are watched, not read once at startup.** A flow sensor that
  only reaches the state machine after Home Assistant has started — the normal
  case for Zigbee and MQTT — refreshes the zone's status and the Repairs
  notice the moment it does, and so does one added or repointed later without
  a reload. A working meter is no longer left reading as "unit unknown", with
  volume mode declared unavailable, until some unrelated update happens by.
- **A non-L/min meter is named in Repairs**: the notice lists which meters
  report which unit and states that their readings are converted to L/min. For
  an install upgraded from before 3.2.0 it adds that the litres those meters
  recorded back then are understated; that history is deliberately not
  rewritten — see the release notes.
- **In Italian** the two unit fields are labelled "Unità del sensore di
  portata" and "Unità del sensore di portata di linea", matching the sensor
  picker each one sits under, in the panel and in the service dialogs alike.

## [3.1.0] - 2026-08-13

### Notifications are configured, not guessed

- **Guided setup in the panel.** Recipients are picked from the `notify.*`
  services the instance actually has (`notify.send_message` excepted: Home
  Assistant registers it on every instance, but it addresses notify *entities*
  and, called without one, reports success while delivering nothing), never
  typed. The four events an irrigation system should never miss — valve
  failure, flow anomaly, irrigation not executed, interrupted cycle — are
  proposed pre-selected, so accepting the recommendation is one click. Events
  browse by severity (critical / operational / informational) instead of nine
  flat rows.
- **A test send** inside the wizard, per recipient, with the failure reason.
- **`enabled: true` with no recipients is refused**, in the wizard and in
  `set_notifications`. Validation judges the merged result, so flipping
  `enabled` on an event whose recipient list is already empty fails too.
- **Recipients are stored bare.** The old field's placeholder read
  `notify.mobile_app_phone`, but the integration calls `notify.<service>` — a
  configuration written that way was invoked as
  `notify.notify.mobile_app_phone` and never arrived. New values are
  normalised on write and existing ones on read, so no migration is needed.
- **Repairs when it matters**: notifications enabled with no recipient; no
  essential event reaching anyone; a configured recipient that no longer
  exists (for essential events, where a log line was not enough). Each one
  names the path to the wizard in the language Home Assistant is running in.
- **A recipient that has vanished is still listed**, marked as no longer
  existing, so it can be unchecked. It is what the repair issue asks you to
  do: without a row of its own there was nothing to clear, every save wrote
  the dead recipient back, and the issue returned.
- **Priority per event**, defaulting to high for the four essential events.
- **`notification_status`** — a new action reporting which events notify,
  where they go and whether the system is mute; the same summary is in the
  downloadable diagnostics.
- **`test_notification`** — a new action, also callable from Developer Tools.

## [3.0.0] - 2026-08-13

The full curve-authoring rework: a new storage model and services on the
backend, and a card and panel rebuilt to match.

### Changed — breaking

- **A curve now has one stored form.** Until now a program's watering curve
  could be either explicit control points or a reference to a preset such as
  `{"template": "preset_pots"}`, and every dashboard save silently converted
  the reference into materialised points without telling you. Storage
  migrates v2 → v3 on first load: any stored template reference is
  materialised losslessly (the points written are exactly the preset's), and
  the migration is idempotent.
- **"Minutes" is now an intensity percentage that scales your curve, not a
  value that rebuilds it.** Nudging a program's minutes used to re-derive a
  "heat" value and regenerate a fresh two/three-point curve, destroying any
  authored shape underneath it — a six-point curve silently became three
  points. Minutes now scale the existing curve through the adjustment factor
  the engine already had, so a curve with any number of points keeps every
  point regardless of how often the minutes are adjusted.
- **Per-day minutes became a per-day intensity, and the migration that
  converts them changes what a "hot day" value means.** Per-day minutes used
  to make the engine discard the configured curve and rebuild a three-anchor
  one at evaluation time, keeping the heat *delta* absolute. The migrated
  per-day intensity instead scales the whole curve proportionally: the mild
  value is unchanged, but the hot value now follows your own curve's shape
  rather than the old fixed delta. Check each program's watering after
  upgrading if you rely on a per-day override on a hot day.
- **Zones and programs left Home Assistant's Settings.** The zone subentry
  flow (Settings → Devices & services → Irrigation Maestro → Add zone /
  reconfigure) is gone. The panel creates the first zone from its empty
  state; if the panel cannot load, `add_zone` is still callable from
  Developer Tools → Actions. Hub setup (weather sources) and the
  engine-parameters step are unchanged and still live in Settings.
- **Watering presets left the user interface.** `preset_pots` and
  `preset_lawn` can no longer be selected or created through the panel or a
  service call. They remain in the engine as the field-validated reference
  curves the §8 regression tests pin, and `resolve_curve` still resolves a
  template reference, so a configuration exported from a 2.x install still
  imports correctly.
- **`set_simple_curve` is removed.** The old amount/heat pair could only ever
  express a curve through three fixed anchors at 12/25/35 °C, and it zeroed
  the 12 °C anchor on every save. Any automation calling
  `irrigation_maestro.set_simple_curve` breaks — switch it to `set_curve`,
  which takes explicit points. `engine/semantic.py`, the module that
  converted between the amount/heat pair and points, is gone with it.
- **The zone sensor no longer publishes `amount`, `heat` or `day_minutes`.**
  Those were derived, backward-compatible attributes kept only as a bridge
  for the old two-slider card editor. Anything reading them — a template
  sensor, a custom card — breaks. The card and panel now read `curve.points`,
  `intensity_pct` and `day_intensity_pct` and compute displayed minutes
  themselves.

### Added

- `duplicate_program` service: copies a program to a fresh id, so no cadence
  marker or outcome history follows the copy. Refuses to create a volume-mode
  copy in a zone with no flow meter.
- `copy_curve` service: copies only the curve's shape into another program,
  leaving that program's intensity, name, schedule and soak settings alone.
- `set_curve` gained a `kind` field. Setting a curve's kind through this
  service is now the only way to create a volume-mode program.
- A duration curve's point values are capped at 1440 minutes (a day) —
  restoring, at `set_curve`, a bound the old config flow used to enforce.
  The cap is duration-only: a volume curve's points are litres and have no
  such ceiling.
- `add_zone` now writes `order` (highest existing zone's order + 1, so a new
  zone lands at the end of the watering sequence) and `adjustment_pct`
  explicitly, now that it is the only path that creates a zone.
- **A point-based curve editor**, shared verbatim by the card and the panel.
  Add, remove, drag or type each control point directly, with explicit
  min/max clamps, an explicit duration/volume kind, and a preview of the
  resulting curve at seven temperatures. The old two-slider editor could only
  ever express three fixed anchors at 12/25/35 °C — a floor, a knee above
  35 °C, or an anchor outside that window was unreachable — and every curve
  it authored started at (12, 0), because its amount/heat formula zeroed the
  cold anchor.
- The card now computes the minutes it displays from the real curve and the
  program's intensity, instead of reconstructing them from three fixed
  anchors. A six-point curve is displayed as six points.
- **Duplicate program** and **copy curve**, both reachable from the panel
  (backing the `duplicate_program` and `copy_curve` services above).
- The curve editor **warns before saving** when the program carries a
  watering intensity — uniform or per-day — because saving a curve resets
  that scale back to 100%.

### Fixed

- Displayed minutes now account for the zone's `adjustment_pct`. The zone
  sensor publishes it, and the card folds it into every DELIVERY figure —
  the program editor's weather line, the wizard's live preview, the curve
  editor's preview tiles and "today" banner, and the program list's
  per-program summary — while the minutes stepper keeps showing the
  pre-adjustment SETTING it actually saves. A zone adjusted to 70% used to
  show 20 min everywhere while actually watering 14; the program editor now
  says so when the two figures diverge.

## [2.1.1] - 2026-08-13

### Fixed

- **A program's calendar looked like it never saved.** Switching a program
  from "every day" to "every N days" (or to odd/even) appeared to do nothing:
  you saved, reopened the editor, and it showed "every day" again.

  The setting was being stored correctly the whole time. What was broken was
  the panel reading it back — it still looked for the `days` attribute that
  2.0.0 replaced with `calendar`, so it never saw your choice and always
  redisplayed the default. Because the stored value and the displayed value
  disagreed, the program actually watered on the schedule you had chosen even
  though the screen denied it.

  **After updating, open each program and check its calendar** — it now shows
  what is really stored, which may differ from what you last saw.

- The same gap hid the settings added in 2.1.0: the season, cycle-and-soak and
  the volume safety timeout were never published for the panel to read, so
  they would have behaved the same way once edited. Both sides are fixed, and
  a test now asserts every field the panel can edit survives the full round
  trip.

## [2.1.0] - 2026-08-12

### Added

- **The dashboard now configures everything except the weather engine.**
  Eighteen settings previously existed only inside the integration's option
  screens, which meant leaving the irrigation panel to change them. They are
  now editable in ⚙️ Impostazioni, and each has a service behind it:
  - **Notifications** — enable each event and pick the notify services it
    calls, saved per event as you toggle.
  - **▸ Advanced: session and safety** — maximum session length, must-finish-by,
    wait for free valves, block after a manual stop, settle pause, sentinel
    time.
  - **▸ Advanced: valves and concurrency** — open/close/switch confirmation
    timeouts, startup close timeout, watchdog maximum, zones at once,
    compatibility groups, master valve pre-open and post-close.
  The advanced sections are collapsed by default and every field states its
  unit and its default, so it is clear what "empty" means before changing it.
- **Cycle-and-soak and the volume safety timeout** are editable per program,
  in the editor's Advanced drawer.
- New services for all of the above: `set_session_limits`, `set_valve_safety`,
  `set_concurrency`, `set_notifications`, `set_program_advanced`. Every field
  is optional and absent means unchanged.

### Fixed

- **The program enable toggle no longer disappears.** When the program's
  switch entity could not be found the control rendered nothing at all — no
  switch and no explanation. It now shows as visibly unavailable with a
  reason. This mattered because the 2.0.0 migration can disable a program
  whose calendar could never water and then asks you, in a repair issue, to
  enable it again.
- **The toggle is also in the program editor**, not only in the program list —
  the screen you land on when you click ✎ is the natural place to disable the
  program you are looking at.

### Changed

- The integration's **options menu now offers only the weather engine**.
  Everything else moved to the panel, so each setting has exactly one editor.
  First-run setup and zone creation are unchanged. If the panel ever fails to
  load, every setting stays reachable from Developer Tools → Actions.

## [2.0.0] - 2026-08-12

### Changed — breaking

- **Watering days now have one owner: the program.** Up to four separate
  mechanisms used to decide whether a zone watered today — a weekday grid on
  the program, an "every N days" cadence on the zone, and the hub's allowed
  weekdays and odd/even parity. They were edited on four different screens,
  combined silently, and skipped silently when they disagreed.

  The observable symptom: a program set to Mon/Wed/Fri on a zone with the
  default cadence of 3 days watered **only on Monday and Friday**. Wednesday
  is two days after Monday, the cadence demanded three, and the skip reason
  was silent — no notification, no repair issue, nothing in the UI. A program
  whose days fell outside the hub's allowed weekdays never watered at all,
  equally silently.

  Each program now has exactly **one calendar mode**:
  - **weekdays** — the days you pick
  - **every N days** — counted from the day *that program* last completed, so
    a day skipped for rain or budget still retries
  - **odd/even** — days of the month, for municipal parity ordinances

  Because the modes are mutually exclusive, two schedules can no longer
  cancel each other out — the conflict is unrepresentable rather than merely
  detected. Each program also carries **its own season months**, which is
  what the "turn off only the evening program in the shoulder seasons" case
  always needed.

- **Zones no longer carry a calendar.** The watering-interval field, the
  per-zone season and the per-zone restrictions override are gone, along with
  the zone's watering-interval **number entity**.

- **Restrictions constrain hours only.** The hub keeps forbidden time
  windows, which still truncate a run already in progress so it cannot
  overrun into the window. The allowed-weekday grid and the odd/even control
  are gone: they were the second and third weekday choosers.

- **Services.** `set_program_schedule` takes `calendar_mode` plus the field of
  that mode (`days`, `interval_days` or `parity`) and an optional
  `season_months`. `update_zone` no longer accepts `interval_days` or
  `season_months`. `set_restrictions` no longer accepts `allowed_weekdays` or
  `parity`.

- **Entity IDs are unchanged**, so existing automations keep working. Only
  display names and translations moved from "cycle" to "program".

### Migration

Existing installations are converted automatically on upgrade. Where the old
combination is expressible, the watering days are preserved exactly — this is
asserted in the test suite by comparing 60 days of watering before and after.
Where it is not, the migration keeps the delivered water volume unchanged and
raises a **repair issue** naming the affected programs, rather than changing
behaviour silently:

- *Watering cadence replaced by the weekday schedule* — the program had both;
  the days you picked win, and it now waters on all of them.
- *Allowed-days limit no longer applies* — a program on an "every N days"
  cadence cannot also be limited to weekdays. Its cadence is untouched; set
  its calendar to weekdays if you must comply with the limit.
- *Odd/even rule no longer applies* — same reason: a program has one mode.
- *Program disabled* — its days were never allowed by the hub limit, so it
  never watered. Now visible instead of silent.
- *Per-zone restrictions removed* — they had no interface and were reachable
  only by editing exported configuration.

The hub's allowed weekdays are **intersected** into weekday calendars rather
than discarded, so a restricted zone does not silently become a daily one.

**After upgrading, open ⚙️ → each zone → each program and check its
calendar**, especially if you see a repair issue.

### Fixed

- **Next run** no longer promises a run on a day the zone will skip. It
  projects each program forward until a day passes every gate — calendar,
  season, suspension, pause and skip-today — so a suspended zone reports when
  watering resumes instead of tomorrow.

## [1.3.3] - 2026-08-12

### Fixed

- **Zones with multiple daily cycles only ran the first one.** A zone with,
  say, a morning cycle (sunrise −1h) and an evening cycle (sunset −3h) ran
  the morning one and silently skipped the evening one — every day. The
  first completed cycle wrote the zone's "last watered" day, and the cadence
  check then read that as "already watered today", skipping every later
  trigger of the same day as `not_due` (a silent reason, so nothing was
  notified or logged as a problem). No configuration could work around it:
  the check enforces a minimum interval of one day, so even `interval_days=1`
  blocked the second cycle.

  A completed cycle now *establishes* the watering day instead of closing
  it, which is what the cadence was always specified to do: on a watering day
  all enabled cycles of the zone run, and the counter restarts from the day a
  cycle completed. Multi-day cadence is unchanged (with `interval_days=3` and
  a cycle completed Monday, Tuesday and Wednesday still skip), skipped days
  still keep the zone due so it retries, and manual runs still never
  establish a day.

  Also hardened as part of the same check: a "last watered" day in the
  *future* — possible after clock skew, a timezone change, or restoring an
  older store — used to produce a negative day count that froze the zone
  silently and permanently. Such a zone is now due, and the next completed
  cycle rewrites the marker to today, so the anomaly self-heals.

## [1.3.2] - 2026-08-12

### Fixed

- **Optional sensors in ⚙️ Impostazioni can now be cleared.** Once an
  optional entity was set (e.g. the outdoor temperature sensor), the native
  entity picker offered no way to empty it again, so it was stuck. Each
  optional field (rain sensor, outdoor temperature, line flow, master valve)
  now shows an explicit **✕ Clear** link when it holds a value; clearing and
  saving removes it, so temperature falls back to the weather entity as
  intended. The backend already treated an empty value as "clear" — this
  adds the missing affordance and a regression test guarding it.

## [1.3.1] - 2026-08-12

### Added

- The **"Irrigazione" panel now shows a success confirmation toast** after
  saving — zone create/edit, zone delete, and each of the three settings
  saves (weather & sensors, consumption budget, calendar restrictions) — the
  same place the existing error toast already appears, so a save that
  worked is now as visible as one that didn't.

## [1.3.0] - 2026-08-12

### Added

- The **"Irrigazione" panel is now the configuration hub**: create, edit and
  delete zones (＋ Aggiungi zona / ✎ Modifica zona, with a 🗑 delete and
  confirmation) directly from the sidebar, no need to leave the panel for
  the integration page.
- A new **⚙️ Impostazioni** view in the panel for the everyday hub settings —
  weather & sensors, consumption budget, calendar restrictions — each saved
  independently, right next to the zones and programs it already managed.
- Six new backend services powering the above, usable directly too (scripts,
  automations, bulk changes): `add_zone`, `update_zone`, `remove_zone`,
  `set_weather_sources`, `set_consumption_budget`, `set_restrictions`.
- The HA **config flow** (Settings → Devices & services) remains fully
  available, both for the initial hub/zone setup and for the expert
  engine/safety/notification parameters the panel doesn't expose — nothing
  here replaces it.

## [1.2.0] - 2026-08-11

### Added

- New **"Irrigazione" sidebar panel** (`panel_custom`, served as its own
  bundle): a dedicated, full-page view of every zone's programs, alongside
  the existing dashboard card — not a replacement for it.
- **Weekly day-grid scheduling**: pick which weekdays a program runs on
  directly on a 7-day grid, with a start time or sun-event trigger, and
  **per-day watering durations** (e.g. shorter on a day you know it rained)
  or a single uniform duration, via the new `set_program_schedule` /
  `set_program_minutes` services.
- **Guided "add program" wizard** to create a new program on a zone in a few
  steps (name, trigger, days, duration), including copying an existing
  program as a starting point (`add_program`), plus rename and remove
  (`rename_program`, `remove_program`) directly from the panel.
- **Advanced drawer** on each program reusing the same beginner-friendly
  heat-response curve editor as the card (two sliders, live graph, "with
  today's weather" line) for zones that want the mild/hot-day duration
  curve instead of a fixed target.
- A weekday-aware weather line and `day_not_scheduled` skip reason so it's
  clear when a program simply isn't due today versus skipped by the weather
  engine.

## [1.1.0] - 2026-08-11

### Added

- Live, beginner-friendly **curve editor in the Lovelace card**: two
  plain-language sliders ("how much water", "how much more when it's hot") with
  a live graph, worked examples and a "with today's weather" line; an Advanced
  panel with safety limits and draggable points. New `set_simple_curve`
  service.

## [1.0.0] - 2026-07-17

First release.

### Added

- Weather decision engine (pure Python): weighted temperature with bootstrap
  renormalization, stage-and-commit rain estimation, water budget, forecast
  credit with hot-weather halving, dynamic skip threshold, immediate skips
  (season, precipitation, frost, cold day, optional wind).
- Unlimited zones as config subentries: sun/time cycles with independent
  enable switches, per-cycle temperature curves (presets, templates, copy),
  volume mode, cycle-and-soak, per-zone cadence by calendar day, seasonal
  windows, calendar restrictions (weekdays, odd/even, forbidden windows).
- Orchestrator with five safety levels: central queue, valves-free check,
  settle pause, in-cycle surveillance, post-manual-stop block; plus open and
  close confirmation, independent watchdog with startup close-all, daily
  sentinel, session limits, master valve/pump support, flow anomaly
  detection (leak, no-flow, out-of-range) and consumption budget.
- Full UI config flow (no YAML), per-event notifications with aggregation,
  rich bus events, per-zone outcome sensors, Repairs issues, diagnostics.
- Custom Lovelace card (Lit/TypeScript) with en/it localization, served and
  registered automatically in storage mode.
- Complete English and Italian translations.
