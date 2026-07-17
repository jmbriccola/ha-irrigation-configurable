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
| `hub_consumption_left` | sensor | liters left (float) or unavailable | `budget_liters`, `used_liters`, `period_start`, `action` — entity absent when no budget configured |
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

`cycles` attribute on `zone_state` (for read-only curve display):

```json
[{"cycle_id": "a1b2c3d4", "name": "Morning", "enabled": true,
  "trigger": {"kind": "sun", "event": "sunrise", "offset_s": -3600} ,
  "curve": {"points": [[10, 5], [25, 15], [35, 30]], "min": 10, "max": 55,
             "kind": "duration"}}]
```

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
| `export_config` | supports response |
| `import_config` | `payload` (JSON string) |

`zone_id` is always the subentry id (the `zone_id` attribute above).

## Events

`irrigation_maestro_<event>` with `event` one of: `session_started`,
`session_finished`, `cycle_started`, `cycle_finished`, `cycle_skipped`,
`cycle_interrupted`, `cycle_cancelled`, `anomaly`, `watchdog`, `sentinel`,
`session_overrun`, `consumption_budget`. Payload always includes `zone_id`,
`zone_name`, `cycle_id` where applicable, plus `reason_key` for skips.

## Localizable keys (card must translate, en + it)

Skip/outcome `reason_key` values: `out_of_season`, `precipitation`,
`frost_risk`, `cold_day`, `wind`, `budget_sufficient`, `not_due`,
`calendar_restricted`, `zone_disabled`, `cycle_disabled`, `suspended`,
`paused`, `manual_stop_block`, `session_overrun`, `weather_unavailable`,
`skip_today_requested`, `consumption_budget`, plus cancellation causes:
`valves_busy`, `valve_unavailable`, `open_failed`, `foreign_valve_open`,
`manual_intervention`, `no_flow`, `flow_out_of_range`, `close_failed`,
`restart`.

Zone/session states and degraded keys above are localizable too.
