# Card ↔ Integration contract

The Lovelace card discovers everything through entity **attributes** — no
hardcoded entity IDs. Every entity of the integration exposes:

```
maestro_role: <role>          # see tables below
zone_id: <subentry_id>        # zone-scoped entities only
```

Discovery: iterate `hass.states`, keep entities with a `maestro_role`
attribute. Group zone entities by `zone_id`. There is exactly one hub (single
config entry).

## Hub entities

| maestro_role        | platform | state                          | extra attributes |
|---------------------|----------|--------------------------------|------------------|
| `hub_water_budget`  | sensor   | mm (float)                     | `rain_today`, `rain_d1`, `rain_d2`, `rain_d3`, `forecast_0_24`, `forecast_24_48`, `forecast_credit` |
| `hub_skip_threshold`| sensor   | mm (float)                     | — |
| `hub_weighted_temp` | sensor   | °C (float) or unavailable      | `temp_d3`, `temp_d2`, `temp_d1`, `temp_today_eff`, `temp_tomorrow`, `stale_weather` (bool) |
| `hub_session`       | sensor   | `idle` \| `evaluating` \| `running` | `queue`: ordered list of `{zone_id, zone_name, cycle_id, duration_min, state}`; `started_at` (ISO); `active_zone_id` |
| `hub_consumption_left` | sensor | liters left (float) or unavailable | `budget_liters`, `used_liters`, `period_start`, `action` — entity always exists; unavailable when no budget is configured |
| `hub_pause`         | switch   | on = globally paused           | — |
| `hub_evaluate`      | button   | press = evaluate now           | — |
| `hub_stop_all`      | button   | press = stop everything        | — |

## Zone entities (one set per zone)

| maestro_role        | platform | state | extra attributes |
|---------------------|----------|-------|------------------|
| `zone_state`        | sensor   | `idle` \| `queued` \| `watering` \| `soaking` \| `paused` \| `suspended` \| `disabled` | `zone_name`, `order`, `degraded` (list of keys, see below), `run_started_at` (ISO, while watering), `run_duration_min` (frozen total), `run_planned_runs` (soak split list), `active_cycle_id`, `suspended_until` (ISO or null), `cycles` (list, see below) |
| `zone_next_run`     | sensor   | ISO timestamp or unavailable | `cycle_id`, `cycle_name` |
| `zone_last_outcome` | sensor   | `completed` \| `skipped` \| `interrupted` \| `cancelled` \| `none` | `reason_key` (see keys), `finished_at` (ISO), `cycle_id`, `duration_min`, `volume_l` |
| `zone_enabled`      | switch   | on/off | — |
| `cycle_enabled`     | switch   | on/off (one per cycle) | `cycle_id`, `cycle_name` |
| `zone_order`        | number   | int | — |
| `zone_interval`     | number   | days (int) | — |
| `zone_adjustment`   | number   | percent (int) | — |
| `zone_suspend_until`| datetime | ISO or unavailable | — |

`cycles` attribute on `zone_state` (source for the card's curve sparkline
and live curve editor — see note under the services table). User-facing copy
calls a cycle a **"program"**; the internal key stays `cycles` and the
per-item id stays `cycle_id` (the `set_program_*`/`*_program` services below
call the same value `program_id` in their fields, for the user-facing name):

```json
[{"cycle_id": "a1b2c3d4", "name": "Morning", "enabled": true,
  "trigger": {"kind": "sun", "event": "sunrise", "offset_s": -3600},
  "days": [0, 2, 4], "day_minutes": {"0": 15, "2": 20},
  "amount": 15, "heat": 8,
  "curve": {"points": [[10, 5], [25, 15], [35, 30]], "min": 10, "max": 55,
             "kind": "duration"}}]
```

- `days`: sorted list of weekdays (0=Monday..6=Sunday) the program is
  scheduled on, or `null` when unset (every day). Set via
  `set_program_schedule`.
- `day_minutes`: `{"<weekday>": <minutes>}` map for per-day watering
  minutes, or `null` when not used (uniform minutes apply instead). Set via
  `set_program_minutes`.
- `amount` / `heat`: the semantic (mild-day minutes / hot-day boost minutes)
  reading of a duration-kind curve, or `null` for a volume-kind curve. Mirror
  of `set_simple_curve`'s fields, kept in sync with `curve.points`.

`degraded` keys: `switch_valve` (no position feedback), `no_flow_meter`,
`line_meter_shared`, `no_hourly_forecast`, `volume_mode_unavailable`.

## Services (domain `irrigation_maestro`)

| service | fields |
|---|---|
| `run_zone` | `zone_id` (required), `duration` (min, optional override) |
| `run_all` | — |
| `skip_today` | `zone_id` (optional; omitted = all zones) |
| `pause` | `hours` (required), `zone_id` (optional; omitted = global) |
| `suspend_until` | `until` (datetime, required), `zone_id` (optional) |
| `resume` | `zone_id` (optional; omitted = clear global+all) |
| `stop_all` | — |
| `evaluate` | supports response (full plan) |
| `set_zone_order` | `zone_id`, `order` (int) |
| `set_curve` | `zone_id`, `cycle_id`, `points` (list of [temp, value]), `min_value`, `max_value` (optional) |
| `set_simple_curve` | `zone_id`, `cycle_id`, `amount`, `heat`, `min_value?`, `max_value?` |
| `export_config` | supports response |
| `import_config` | `payload` (JSON string) |
| `set_program_schedule` | `zone_id`, `program_id`, `days` (list of 0–6, empty/omitted = every day), `start_kind` (`time` \| `sun`, required), `start_time` (required if `start_kind: time`), `start_event` (`sunrise` \| `sunset`, required if `start_kind: sun`), `start_offset_min` (int, −360..360, sun starts only, default 0) |
| `set_program_minutes` | `zone_id`, `program_id`, `minutes` (int, 1..1440) **or** `day_minutes` (`{"<weekday>": <minutes>}`) — mutually exclusive, exactly one required |
| `add_program` | `zone_id`, `name` (optional), `copy_from` (optional program_id to clone); supports response `{"program_id": ...}` |
| `remove_program` | `zone_id`, `program_id` |
| `rename_program` | `zone_id`, `program_id`, `name` |

`zone_id` is always the subentry id (the `zone_id` attribute above).
`program_id` is the same value as the `cycle_id` in the `cycles` attribute —
the services use the user-facing name ("program") for their field.

The card now also **writes** curves: the simple sliders call
`set_simple_curve`, and dragging the three points in the Advanced view calls
`set_curve`. The live editor's "with today's weather" line reads
`hub_weighted_temp`.

### Program scheduling services (`set_program_*` / `*_program`)

- `set_program_schedule` replaces a program's weekday selection and trigger
  in one call. An empty/omitted `days` means "every day". `start_kind`
  selects between a fixed clock time (`start_time` required) and a sun event
  (`start_event` required, `start_offset_min` optional, minutes before a
  sunrise/sunset offset are negative).
- `set_program_minutes` sets watering minutes either uniformly (`minutes`)
  or per weekday (`day_minutes`); the two fields are **exclusive** — passing
  both, or neither, is a validation error. It only applies to duration-kind
  curves: calling it on a program whose curve is volume-target raises
  `simple_curve_on_volume` (edit volume curves via the zone settings
  instead). Passing `minutes` rebuilds the curve from the semantic
  amount/heat and clears any existing `day_minutes`; passing `day_minutes`
  sets the per-day map without touching the curve.
- `add_program` creates a new program on a zone, either a sensible default
  (every day, sunrise start, 15′ mild + 8′ hot boost) or a copy of an
  existing program (`copy_from`) with a fresh `cycle_id`. Returns
  `{"program_id": "<new id>"}` as its service response.
- `remove_program` deletes a program by id; a zone must keep at least one
  program (`cannot_remove_last_program` if it's the last one).
- `rename_program` changes only a program's display name.

### Configuration services

Six additional services manage the hub and its zones directly — a scripting
surface for the same settings the config flow exposes, useful for
automations, YAML-driven setups, or bulk changes:

| service | fields |
|---|---|
| `add_zone` | `name` (required), `valve_entity` (required, valve/switch), `area_m2` (optional), `icon` (optional); supports response `{"zone_id": ...}` |
| `update_zone` | `zone_id` (required) + any of: `name`, `valve_entity` (valve/switch), `area_m2`, `icon`, `flow_sensor` (sensor), `nominal_flow_lpm`, `flow_tolerance_pct` (1-100), `adjustment_pct` (10-300), `order` (1-1000), `interval_days` (1-60), `compatibility_group`, `season_months` (list of 1-12) — only the fields passed are changed |
| `remove_zone` | `zone_id` (required) |
| `set_weather_sources` | `weather_entity` (required, weather), `rain_sensor`/`outdoor_temp_sensor`/`line_flow_sensor` (sensor, optional), `master_valve` (valve/switch, optional) |
| `set_consumption_budget` | `liters_per_month` (optional; omitted/zero disables the budget), `action` (required: notify/reduce/suspend), `reduce_pct` (1-100, used when action is reduce) |
| `set_restrictions` | `allowed_weekdays` (list of 0-6, empty = every day), `parity` (odd/even/none), `forbidden_windows` (list of `{start, end}` time-of-day pairs) |

- `add_zone` creates the zone with a default program (every day, sunrise
  start, 15′ mild + 8′ hot boost) — the same seed the config flow's zone
  wizard uses — and returns the new zone's id (the `zone_id` attribute above)
  as its service response.
- `update_zone` and `remove_zone` mirror the "Edit zone" and zone-removal
  paths of the config flow's zone subentry, but as a single service call
  instead of a multi-step wizard.
- `set_weather_sources`, `set_consumption_budget` and `set_restrictions`
  patch the hub's options in place — `set_weather_sources` requires
  `weather_entity` on every call (the hub always needs one); the optional
  sensor/valve fields on it follow the merge rule used by `_write_hub_options`:
  present and non-empty sets the value, present and empty clears it, and
  omitting the field entirely leaves the current value unchanged.
- All six apply their change **in place** via
  `config_entries.async_add_subentry` / `async_update_subentry` /
  `async_remove_subentry` (zones) or an options update (hub settings) — no
  integration reload is required, the same way the `set_program_*` /
  `*_program` services above already work. Zone writes are validated before
  persisting (`invalid_zone`) and hub-option writes are validated before
  persisting (`invalid_hub_settings`); a failed validation leaves the prior
  configuration untouched.
- The config flow (initial setup wizard, "Configure" on the hub, "Add
  zone"/"Configure" on a zone subentry) **remains a fully supported
  alternative** to these services — nothing here replaces it. Phase A ships
  only the service layer; a dedicated zone editor / settings view in the
  card or panel that calls these services from the UI is Phase B.

## Events

`irrigation_maestro_<event>` with `event` one of: `session_started`,
`session_finished`, `cycle_started`, `cycle_finished`, `cycle_skipped`,
`cycle_interrupted`, `cycle_cancelled`, `anomaly`, `watchdog`, `sentinel`,
`session_overrun`, `consumption_budget`. Payload always includes `zone_id`,
`zone_name`, `cycle_id` where applicable, plus `reason_key` for skips.

## Localizable keys (card must translate, en + it)

Skip/outcome `reason_key` values: `out_of_season`, `precipitation`,
`frost_risk`, `cold_day`, `wind`, `budget_sufficient`, `not_due`,
`calendar_restricted`, `zone_disabled`, `cycle_disabled`, `day_not_scheduled`
(the program's `days` doesn't include today), `suspended`,
`paused`, `manual_stop_block`, `session_overrun`, `weather_unavailable`,
`skip_today_requested`, `consumption_budget`, plus cancellation/interruption
causes: `valves_busy`, `valve_unavailable`, `open_failed`,
`foreign_valve_open`, `manual_intervention` (also used for manual stop-all),
`no_flow`, `watchdog`, `zone_removed`, `shutdown`, `cancelled`.
Anomaly-only keys (fired in `anomaly` events, not as run outcomes):
`flow_out_of_range`, `close_failed`. A restart leaves no per-cycle outcome
by design — the startup watchdog closes valves and the sentinel flags the
missing outcome.

Zone/session states and degraded keys above are localizable too.

## The sidebar panel (`irrigation-maestro-panel`)

Alongside the dashboard card, the integration registers a **custom sidebar
panel** via `panel_custom`:

- `frontend_url_path`: `irrigation` (sidebar entry **"Irrigazione"**,
  `mdi:sprinkler-variant`).
- `webcomponent_name`: `irrigation-maestro-panel`.
- Served from its own bundle, `irrigation-maestro-panel.js`, cache-busted
  with the same `?v={version}` query param as the card (see
  `custom_components/irrigation_maestro/panel.py` /
  `custom_components/irrigation_maestro/resources.py`); the two bundles are
  independent — a panel-only change does not require touching
  `irrigation-maestro-card.js` and vice versa, but both are always rebuilt
  and committed together to keep `frontend/` in sync with source.
- `require_admin: false`, `embed_iframe: false`, `trust_external: false` —
  it renders like any other built-in HA panel, not an iframe.

The panel is **not** a replacement for the card: the dashboard card keeps
working unchanged (same entities, same services) for anyone who prefers a
Lovelace tile. The panel is a dedicated, full-page surface for zone/program
management.

**Discovery and data**: the panel uses the exact same contract as the card —
no separate API. It iterates `hass.states` for entities carrying
`maestro_role`, groups by `zone_id` the same way, and reads/writes programs
through the `cycles[]` list on each zone's `zone_state` attributes described
above: `cycle_id`, `name`, `enabled`, `trigger`, `days`, `day_minutes`,
`amount`, `heat`, `curve`. The weekly day-grid, per-day duration fields and
the "with today's weather" line are pure presentations of those same
fields — there is no new backend surface for the panel to consume.

**Services it drives** — the five program-scheduling services documented
above, unchanged from the card's Phase A contract:

- `set_program_schedule` — day-grid + trigger editor.
- `set_program_minutes` — uniform or per-day duration editor.
- `add_program` — the guided add-program wizard (optionally `copy_from` an
  existing program).
- `rename_program` / `remove_program` — program list row actions.

Plus the existing curve services (`set_curve`, `set_simple_curve`) behind
the panel's **advanced drawer**, which reuses the same beginner-friendly
heat-response curve editor component as the card (two sliders, live graph,
worked examples, "with today's weather" line) rather than a separate
implementation.
