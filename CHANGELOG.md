# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

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
