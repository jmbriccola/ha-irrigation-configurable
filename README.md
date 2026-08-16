# Irrigation Maestro

Weather-aware irrigation orchestration for Home Assistant. Unlimited zones,
a field-proven weather decision engine, hard safety guarantees around your
valves, and a dedicated Lovelace card — all configured from the UI, no YAML.

> Nato dalla generalizzazione di un impianto reale a 2 zone (valvole Zigbee,
> flussometri, previsioni Met.no). La guida rapida in italiano è in
> [`docs/it/guida-rapida.md`](docs/it/guida-rapida.md); le istruzioni complete
> in [`INSTRUCTIONS.md`](INSTRUCTIONS.md) (EN) e
> [`docs/it/istruzioni.md`](docs/it/istruzioni.md) (IT).

## Why another irrigation integration?

Irrigation Maestro is built around two ideas:

1. **A weather model that decides *whether* and *how long* to water** — not a
   fixed schedule. It weighs the last four days of temperature maxima and
   rainfall, discounts forecast rain (never at face value), and converts a
   weighted temperature into per-zone durations through user-editable curves.
2. **Safety is not negotiable.** Zones never touch valves directly: a central
   queue serializes every cycle, verifies valves before and after each step,
   watches for manual intervention, survives restarts by closing everything,
   and a fully independent watchdog backstops it all. Any conflict or
   uncertainty resolves to *cancel and notify* — never *open anyway*.

## Features

- **Unlimited zones** (`valve` or `switch` entities), each with one or more
  daily cycles anchored to sun events (± offset) or fixed times.
- **Per-cycle temperature→duration curves**: a point editor — add, remove,
  drag or type each control point, with explicit min/max clamps and an
  explicit duration/volume kind — plus a live preview of the resulting
  minutes at seven temperatures. The two field-validated presets (§8 below)
  live on as the engine's reference curves but are no longer offered as a
  selectable template in the UI; `copy_curve` copies a curve's shape into
  another program instead. Optional **volume mode** (liters) with flow
  meter; optional **cycle-and-soak** with cross-zone interleaving.
- **One calendar per program**, in exactly one of three mutually exclusive
  modes: specific **weekdays**, **every N days** (counted from the day that
  program last completed, so a skipped day retries), or **odd/even** days of
  the month for municipal parity ordinances. Because the modes cannot be
  combined, two schedules can never silently cancel each other out. Each
  program also carries its own **season** (months), defaulting to the hub's —
  so a zone can keep its morning program all season and run the evening one
  only in high summer.
- **Per-zone adjustment factor** and hub-wide **forbidden time windows**: a
  cycle already running is truncated rather than allowed to overrun into a
  window. Windows constrain hours only; watering days belong to the program.
- **Everything configured from the sidebar panel** after setup: zones,
  programs and their calendars, weather sources, consumption budget, forbidden
  hours, notifications, and — behind Advanced drawers — session limits, valve
  confirmations, the watchdog and concurrency. Zones and programs are created
  and edited exclusively there. The config flow covers only first-run hub
  setup and the weather decision engine, which stays deliberately out of the
  dashboard's reach.
- **Weather engine** (§ details below) with a single forecast fetch per
  session, stage-and-commit rain estimation without a rain sensor, and a
  configurable stale-weather policy.
- **Five safety levels** + open/close confirmation, independent watchdog
  (with restart close-all that waits for Zigbee availability), daily
  sentinel, session time limits, master valve/pump sequencing, flow anomaly
  detection (leak, no-flow, out-of-range) and a monthly consumption budget.
- **Per-zone leak detection** from two kinds of evidence that are treated as
  one alarm: the valve's own `moisture` sensor reporting while that valve is
  closed, and water measured by a flow meter while *every* managed valve
  reports closed. Each alarm is published as a `binary_sensor` with
  `device_class: problem` — one per zone plus one for the system scope — and
  as an `irrigation_maestro_leak` event; what happens next is configurable
  (notify, re-close, or re-close and refuse new cycles). A separate optional
  **water-supply sensor** per zone distinguishes *no water arriving* from *a
  leak*, refuses to start a cycle into a dry line, and explains a valve that
  shuts itself off for lack of pressure instead of aborting the session as
  manual intervention.
- **Per-event notifications** to any `notify.*` targets, aggregated (one
  message per shared reason, never one per zone), rich bus events
  (`irrigation_maestro_*`) and per-zone outcome sensors. Set up from a
  three-step guided wizard in the panel: recipients picked from the
  `notify.*` services this instance actually has — never typed, each with a
  test-send button — then events chosen by preset (*Recommended*, *Critical
  only*, *Everything*) across three severity groups with a priority chip per
  event, then a summary to save. `notification_status` reports what is live
  and where, and Repairs opens an issue if a configuration would leave you
  uninformed.
- **Custom Lovelace card** (installed automatically in storage mode) with
  live progress, queue, controls, degraded-feature badges, the same
  point-based curve editor as the panel, and full EN/IT localization.
- **Repairs** issues for detected problems, downloadable **diagnostics**,
  config **export/import**, schema versioning with migrations from day one.

## Installation (HACS custom repository)

1. HACS → menu (⋮) → **Custom repositories**.
2. Repository: `https://github.com/jmbriccola/ha-irrigation-configurable`,
   type **Integration** → **Add**.
3. Install **Irrigation Maestro** from HACS, restart Home Assistant.
4. Settings → Devices & services → **Add integration** → *Irrigation
   Maestro*: pick your `weather` entity (plus optional rain / temperature /
   flow sensors and master valve).
5. Zones are created from the **Irrigazione** sidebar panel (below) — open
   it from the Home Assistant sidebar and use **＋ Aggiungi zona** for each
   irrigation circuit.

Requires Home Assistant **2025.7.0 or newer**.

### The card

In **storage mode** (the default) the card resource is registered
automatically — just add the *Irrigation Maestro Card* from the dashboard
card picker. If your dashboards are in **YAML mode**, add the resource
manually:

```yaml
lovelace:
  resources:
    - url: /irrigation_maestro/frontend/irrigation-maestro-card.js?v=1.0.0
      type: module
```

### The "Irrigazione" panel

The integration also registers a dedicated **sidebar panel** — look for
**Irrigazione** (sprinkler icon) in the Home Assistant sidebar. It's the
day-to-day **configuration hub**: pick a zone tab and add or edit its
watering programs (giorni/days on a weekly grid, orario/start time,
durata/duration per day or uniform), with a guided wizard for new programs,
**duplicate program** and **copy curve** actions to reuse a program or a
curve's shape across zones, and an **Advanced** drawer with the point-based
curve editor (add, remove, drag or type control points; min/max clamps; a
seven-temperature preview) for programs that scale duration with
temperature — plus **＋ Aggiungi zona / ✎ Modifica zona** to create, edit
or delete zones themselves, and a **⚙️ Impostazioni** view to edit the
everyday hub settings (weather & sensors, consumption budget, calendar
restrictions), all without leaving the sidebar. The HA **config flow**
(Settings → Devices & services) remains fully available too, for the
initial setup and for the expert engine-tuning parameters (the only options
step left there — safety, notifications, restrictions and the consumption
budget are all edited in the panel now). The dashboard card described above
keeps working
exactly as before — the panel is an additional, more spacious place to
manage zones and programs, not a replacement.

## The decision engine

All weights below are defaults, editable in the hub options (with a
reset-to-defaults switch). Formulas are implemented in a pure Python module
([`engine/`](custom_components/irrigation_maestro/engine/)) covered by a
regression test that reproduces the source system's real-world values
exactly.

- **Weighted temperature** = max(3 days ago)·0.05 + max(2 days ago)·0.15 +
  max(yesterday)·0.30 + max(today, effective)·0.35 + max(tomorrow)·0.15.
  Daily maxima are tracked by the integration itself (persisted, no
  midnight-rotation step to corrupt). Missing days renormalize the remaining
  weights — never counted as 0 °C.
- **Past rain**: from a real rain sensor when configured; otherwise estimated
  from the hourly forecast with **stage-and-commit**: at minute 55 the ending
  hour's forecast is committed at ×0.8 (forecast-only rain never counts at
  full weight).
- **Water budget (mm)** = today·0.85 + yesterday·0.5 + 2 days·0.2 +
  3 days·0.05 + forecast credit, where credit = (0–24 h)·0.6 + (24–48 h)·0.25,
  capped at 5 mm and **halved when the weighted temperature ≥ 30 °C**
  (forecast summer storms often never arrive).
- **Dynamic skip threshold (mm)** = 3 + 0.5·max(weighted temp − 28 °C, 0),
  capped at 6. Budget ≥ threshold → session skipped ("budget sufficient").
- **Immediate skips**: out of season (silent), precipitation in progress,
  frost risk (< 2 °C), cold day (effective max < 10 °C), wind over threshold
  (opt-in).
- **Weather unavailable**: last data reused up to 6 h (configurable); beyond
  that, a configurable policy — *fail-open* (default: water with the curve on
  the last known weighted temperature, budget = 0) or *fail-closed* (skip as
  `weather_unavailable`) — always with a notification and a Repairs issue.

Durations are frozen when the session starts; nothing is re-evaluated
mid-queue. The forecast is fetched **once per session** and shared by all
zones.

## Safety model

1. **Central queue** — the only code path that opens valves. Priority-ordered
   (zone order number), at most `max_concurrent` zones active (default **1**;
   raising it requires zones to share a *compatibility group*).
2. **Valves-free check** before opening (all managed valves confirmed closed;
   timeout → cancel).
3. **Settle pause** between zones (default 2 min) with a re-check after.
4. **Surveillance** during the cycle: a foreign managed valve opening, or the
   active valve closed externally → everything closes, cycle interrupted,
   notification sent. One narrow exemption: if the closing valve belongs to
   the watering zone, the close was not ours, and that zone's own
   water-supply sensor reports no water within a five-second grace, the close
   is read as a valve shutting itself off for want of pressure — the cycle
   ends as `no_water_supply` and the manual-stop block is not armed. Without
   such a sensor nothing changes: uncertainty still aborts.
5. **Post-manual-stop block**: after any manual interruption no queued cycle
   starts for the block window (default 60 min).

Plus: open confirmation (2 min default) and close confirmation with retry and
urgent notification; an **independent watchdog** that force-closes anything
open beyond 70 min (default) and closes every valve at Home Assistant start
(waiting for entities to leave `unavailable`, with a Repairs issue if one
never does — no legitimate cycle survives a restart); a **daily sentinel**
that verifies every due cycle left an outcome and alerts when a trigger never
ran; optional **session limits** (max duration / must-finish-by) that skip
the remaining zones as `session_overrun`.

## Degradation matrix

Every optional-hardware feature disables itself when the hardware is missing,
and the UI (zone attributes + card badges) declares it:

| Feature | Requires | Without it |
|---|---|---|
| Flow readings in the right scale | A meter that declares a convertible unit, or an explicit unit override | Readings are ignored entirely rather than assumed to be L/min: volume mode and flow anomalies are off for that meter and consumption falls back to nominal flow × minutes, with a Repairs issue naming the sensor |
| Volume mode (liters target) | Flow meter (zone or line) whose unit can be determined | Cycle runs as a plain duration cycle for its safety-timeout minutes; volume mode not offered in the flow |
| Flow anomalies (leak, no-flow, out-of-range) | Flow meter whose unit can be determined | No flow diagnostics; time-based watering only. **There is no zero-flow guard at all** — `FlowMonitor` is built only for a zone whose meter resolves — so a cycle that starts into a closed tap runs its full length dry and books its nominal estimate as if it had watered. Nothing in the integration can notice; this is what the water-supply sensor below exists to compensate for, and that installation — a cheap supply contact, no per-zone meters — is the likeliest one to reach it |
| Out-of-range diagnosis per zone | Flow meter whose unit can be determined, and per-zone nominal flow rates | With a shared line meter the expected range is the **sum of nominal flows of the open zones** (± tolerance); if any open zone lacks a nominal rate, range checks are skipped. A line meter cannot tell *which* zone misbehaves |
| Position feedback, open/close confirmation | `valve` entity | `switch` zones run **optimistically**: commands are assumed to actuate after a short configurable delay; surveillance still reacts to state changes, but a stuck-open head cannot be detected — the watchdog and (if present) flow meter are the remaining guards |
| Hourly rain staging, hourly forecast precision | Weather provider with hourly forecast | Falls back to `daily` forecast with a conservative prorated estimate; stage-and-commit disabled |
| Measured consumption | Flow meter whose unit can be determined | Consumption estimated as nominal flow × minutes (needs nominal flow; otherwise not tracked) |
| Continuous water accounting | A flow meter (zone or line) whose unit can be determined, **or** a per-zone nominal flow rate | Litres are estimated once per cycle as nominal flow × minutes and marked `estimated`; water outside cycles is not seen at all, so unattributed-water detection is unavailable for that zone. With **neither** a meter nor a nominal rate nothing is recorded at all, and `zone_water_total` says so with `source: "none"` rather than claiming a measurement |
| Unattributed-water detection | Same | Unavailable for that zone: with no meter there is nothing to observe while the valves are closed |
| Leak source 1 — the valve's own sensor | A `binary_sensor` with `device_class: moisture`, found on the valve's own device or picked by hand in the zone form | That source is absent; `capabilities.leak_detection` reads `unavailable` rather than leaving an alarm that looks armed. Source 2 can still cover the zone on its own — which is why a card must read `leak_watch`, not `leak_detection`, before telling anyone whether a zone is watched |
| Leak source 2 — flow while every valve is closed | A flow meter (the zone's own, or the hub's line meter) whose unit resolves | That source is absent. A zone with neither source has no leak detection at all: `capabilities.leak_watch` says `none` and its `zone_leak` entity is `unavailable` for ever |
| A leak alarm that names the **zone** | A source on the zone's own scope: its leak sensor, or a meter serving that zone alone | A meter shared by two or more zones (or by none) measures water no single zone can be blamed for, so its alarm is raised on the **system** scope instead — `hub_leak`, with `capabilities.leak_watch: "system"` on each zone behind it. Those zones' own `zone_leak` entities stay `unavailable` permanently, and correctly: nothing can name the zone. Do not render that as uncovered, and do not render it as an all-clear |
| **One** alarm per leak | Per-zone meters **or** a line meter — not both | A line meter configured *alongside* per-zone meters measures the same water the zone meters already measured, so one physical leak raises `zone_leak` **and** `hub_leak`. Both statements are true and neither scope can know the other saw it; suppressing either would mean choosing which evidence to ignore, and which choice is right depends on the plumbing, not on the code. Since 3.4.0 that is also **two entities an automation can double-count** — trigger on one scope, or make the action idempotent |
| Water-supply diagnosis, and refusing to start into a dry line | A `binary_sensor` with `device_class: problem` on the zone (`on` = **no** water) | A cycle starts into the dry line and, *if* the zone has a usable meter, is interrupted as generic `no_flow` rather than `no_water_supply`; with no meter it is not interrupted at all (row above). `require_water_supply` (default on) governs **only** the refusal — switching it off still notifies and still raises the Repairs notice, because "do not withhold water" is a different statement from "do not tell me" |
| A valve that shuts itself off read as legitimate | The zone's own water-supply sensor, reporting no water at the moment of the close or within a five-second grace | An unledgered close of the watering zone's valve is treated as manual intervention: the session aborts and the manual-stop block is armed, exactly as in 3.3.x |
| Rain measured | Rain sensor (daily mm) | Stage-and-commit forecast estimation (above) |
| Card auto-install | Lovelace storage mode | Manual resource registration (documented above) |

An **estimated** zone still gets `device_class: water` and `state_class:
total_increasing`, so it still appears in the Water dashboard next to
measured zones — excluding it was considered and rejected: a zone's
long-term trend is more useful with an estimated contribution than with a
silent gap. What compensates is redundant marking, not exclusion: the
`estimated` and `source` attributes on `zone_water_total`, a badge in the
card, and each day's own estimated flag in the daily history behind it.

### Living with the leak entities

`zone_leak` and `hub_leak` carry `device_class: problem`, so `off` asserts
*there is no problem*. The integration will not make that assertion until it
has earned it, and the consequences are worth reading before you automate on
them.

- **`unavailable` is a first-class state, not an error.** It means *this
  scope has established nothing* — either no source could ever raise the
  alarm, or the scope has not yet been **observed** for one confirmation
  window (`leak_confirm_s`, default 300 s). Only seconds in which a source
  could actually have concluded something count towards that window, so a
  boot in the middle of a cycle earns nothing until the valves shut.
- **An entity can stay `unavailable` indefinitely, and an automation written
  against it then silently never fires.** This is the single most important
  thing to understand here, because silence is indistinguishable from
  working: a sensor that was configured and has never reported, or a scope
  that is never in a position to observe (a valve held permanently open,
  with a meter as the scope's only source), never earns its window. The
  entity itself says nothing about this. What says it is `zone_state`'s
  `degraded` list, after an hour of *idle* time — `leak_never_observable`
  (nothing could conclude anything) or `leak_evidence_unresolved` (something
  *is* reporting and nothing can finish judging it). Test your leak
  automations by watching the entity leave `unavailable`, not by assuming it
  has.
- **That hour is a judgement, not a measurement.** It was chosen as twelve
  times the confirmation window and, as of 3.4.0, has never met real
  hardware. The condition it reports is not always a fault either:
  hand-watering off an irrigation line for more than an hour holds a valve
  open outside the integration, which is exactly what
  `leak_never_observable` describes. It is true, and it reads like a defect.
  Treat both keys as *"this zone could not check, and here is where to
  look"* — never as *"this zone is broken"*, and never as a leak.
- **The hub scope has no such signal at all.** `degraded` lives on
  `zone_state`, and the hub has none. Where the same cause also stalls the
  zones — a valve that never reports closed blocks every metered scope — the
  zones declare it and the hub's silence is at least explained nearby. Where
  it does not, it is explained nowhere: two zones that each have their own
  leak sensor, behind one shared line meter, both settle on their sensors and
  report normally while `hub_leak` sits `unavailable` for ever with no
  surface saying why. A zone whose `leak_watch` is `system` points you at
  precisely that scope.
- **After a restart every leak entity is `unavailable` for a confirmation
  window before it will say `off`, by design.** The alarm lives in memory
  and is deliberately not persisted, so at boot nothing is known. Publishing
  `off` there would fire the second half of the obvious automation pair —
  *"leak → close the mains"* and *"leak cleared → reopen the mains"* — on a
  restart during a live leak, and put the water back on. A transition into
  `unavailable` fires no `to: "off"` trigger; a restored alarm was rejected
  because it can be stale, fixed while Home Assistant was down.
- **`since` is when the alarm was confirmed, not when the water started.** A
  source withdrawing and returning yields a fresh one, and a restart moves it
  forward. No surface may present it as the age of the leak.

## Entities & services

One **hub device** (water budget, skip threshold, weighted temperature,
session state with live queue, optional remaining consumption budget,
**unattributed water**, **system leak**, global pause switch, *Evaluate now*
/ *Stop all* buttons) and one **device per zone** (state, next run, last
outcome with reason, **total water**, **leak**, enable switch, per-cycle
enable switches, order / cadence / adjustment numbers, suspend-until
datetime).

The two leak entities are `binary_sensor`s with `device_class: problem` —
one per zone (`zone_leak`) and one for the system scope (`hub_leak`), which
is where a leak measured on a meter serving more than one zone is reported,
because which zone leaked is genuinely unanswerable there. There is
deliberately no single summary entity: an automation that closes the mains
needs to know which zone to shut, and a summary cannot say. Each carries
`sources`, `since` and `describing_source`. Read "Living with the leak
entities" above before automating on them — `unavailable` is a normal state
and it can last indefinitely.

The two water sensors carry `device_class: water` and `state_class:
total_increasing`, so Home Assistant's own statistics engine derives their
daily/monthly/yearly figures and both are eligible for the **Water
dashboard**:

- **`zone_water_total`** — one per zone, all-time litres, with `today_l` /
  `month_l` / `estimated` / `source` / `meter_entity` attributes.
- **`hub_unattributed_water`** — litres a meter measured that no zone
  claimed, with a `closed_l` subset measured while every managed valve
  reported closed.

### Upgrading from 3.2.x

A meter's flow is now integrated **continuously**, not only while a cycle is
running, so the hand-built chain many installs kept alongside this
integration is redundant: the `integration` (Riemann sum) helper that turned
L/min into litres, the `utility_meter` that cut it into daily/monthly cycles,
and the template sensors that split it per zone are all replaced by
`zone_water_total`, `hub_unattributed_water` and HA's own statistics. Delete
them once you are satisfied the new sensors read what you expect — that
deletion is the point of this release.

Historical data is **not** imported: the new sensors start from zero at the
upgrade, and the old monthly consumption counter is carried once as this
period's opening balance so the budget keeps enforcing to the end of the
month. This is a deliberate choice, not a limitation to work around — a
back-fill would mix measured with estimated litres under a provenance flag
that could no longer be trusted.

Services: `run_zone`, `run_all`, `skip_today`, `pause`, `suspend_until`,
`resume`, `stop_all`, `evaluate` (returns the full computed plan),
`set_zone_order`, `set_curve`, `set_notifications`, `test_notification`,
`notification_status`, `export_config`, `import_config` — plus everything
the panel writes, including `update_zone` (which carries the per-zone
`leak_sensor` and `water_supply_sensor`; `add_zone` takes neither as input
and instead writes whatever it detects on the valve's own device),
`discover_zone_sensors`
(reports what is configured for a zone *and* what its valve's own device
offers, as a suggestion only — nothing is adopted until you save it) and
`set_valve_safety`, which holds the five leak and water-supply settings
alongside the valve confirmation windows: `leak_action`,
`leak_threshold_lpm`, `leak_confirm_s`, `leak_repeat_min`,
`require_water_supply` and `water_supply_confirm_s`. All are documented in
the UI (Developer tools → Actions) in English and Italian.

Events: `irrigation_maestro_session_started/finished`,
`irrigation_maestro_cycle_started/finished/skipped/cancelled/interrupted`,
`irrigation_maestro_anomaly/watchdog/sentinel/session_overrun/consumption_budget`
with rich payloads for your own automations, plus
`irrigation_maestro_leak`, which is scoped rather than zoned: it carries
`scope` (a `zone_id` or `"__hub__"`), `zone_id` (`null` for a system-scope
alarm, so an automation reading it cannot address a zone that was never
implicated), `state` (`active` | `cleared`), `first_source` and `sources`.
It fires once when the alarm is confirmed and once when it clears — a
second source agreeing is not a second alarm, and the repeat reminder fires
no event at all.

## Development

```bash
uv venv .venv --python 3.14
uv pip install --python .venv/bin/python pytest-homeassistant-custom-component ruff mypy
.venv/bin/python -m pytest tests          # full suite
.venv/bin/ruff check . && .venv/bin/mypy  # lint + strict typing
cd card && npm ci && npm run build        # rebuild the Lovelace card bundle
```

The decision engine is pure Python (no Home Assistant imports) — see
[`tests/engine/`](tests/engine/) for the § 8 regression case and the full
formula suite. Design notes live in [`docs/design/`](docs/design/) and the
project decision log in [`MEMORY.md`](MEMORY.md).

## License

[MIT](LICENSE) © Jacopo Maria Briccola
