# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

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
