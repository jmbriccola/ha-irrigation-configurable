# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

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
