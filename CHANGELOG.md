# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

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
- **Upgrading with a non-L/min meter**: a Repairs notice names the sensors and
  explains that the current period's consumption total is understated and will
  be correct from the next period. The stored counter is deliberately not
  rewritten — see the release notes.

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
