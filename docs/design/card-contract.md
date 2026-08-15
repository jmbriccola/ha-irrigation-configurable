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
| `hub_consumption_left` | sensor | liters left (float) or unavailable | `budget_liters`, `used_liters`, `unattributed_liters`, `period_start`, `action` — entity always exists; unavailable when no budget is configured |
| `hub_unattributed_water` | sensor | liters (float), `device_class: water`, `state_class: total_increasing` | `closed_l` (float), `per_scope` (`{scope: liters}`, only scopes with water > 0; scope is a `zone_id` or `"__hub__"`) — see "Water accounting sensors" below |
| `hub_pause`         | switch   | on = globally paused           | — |
| `hub_evaluate`      | button   | press = evaluate now           | — |
| `hub_stop_all`      | button   | press = stop everything        | — |

## Zone entities (one set per zone)

| maestro_role        | platform | state | extra attributes |
|---------------------|----------|-------|------------------|
| `zone_state`        | sensor   | `idle` \| `queued` \| `watering` \| `soaking` \| `paused` \| `suspended` \| `disabled` | `zone_name`, `order`, `adjustment_pct` (float, 10–300), `degraded` (list of keys, see below), `run_started_at` (ISO, while watering), `run_duration_min` (frozen total), `run_planned_runs` (soak split list), `active_cycle_id`, `suspended_until` (ISO or null), `cycles` (list, see below) |
| `zone_next_run`     | sensor   | ISO timestamp or unavailable | `cycle_id`, `cycle_name` |
| `zone_last_outcome` | sensor   | `completed` \| `skipped` \| `interrupted` \| `cancelled` \| `none` | `reason_key` (see keys), `finished_at` (ISO), `cycle_id`, `duration_min`, `volume_l` |
| `zone_water_total`  | sensor   | liters (float), `device_class: water`, `state_class: total_increasing` | `estimated` (bool), `source` (`measured` \| `nominal` \| `mixed` \| `none`), `today_l` (float), `month_l` (float), `meter_entity` (entity id or null), `last_gap_at` (ISO or null) — see "Water accounting sensors" below |
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
  "days": [0, 2, 4],
  "intensity_pct": 100.0, "day_intensity_pct": {"0": 150.0},
  "curve": {"points": [[10, 5], [25, 15], [35, 30]], "min": 10, "max": 55,
             "kind": "duration"}}]
```

- `days`: sorted list of weekdays (0=Monday..6=Sunday) the program is
  scheduled on, or `null` when unset (every day). Set via
  `set_program_schedule`.
- `intensity_pct` / `day_intensity_pct`: the program's watering **strength**,
  stored separately from `curve.points`' **shape**. `intensity_pct` is a
  uniform percentage applied to every point of the curve; `day_intensity_pct`
  is an optional `{"<weekday>": <percent>}` override — a weekday missing from
  the map falls back to `intensity_pct`. Both are written only by
  `set_program_minutes` (below), which is the sole writer of either field:
  nudging minutes never rewrites `curve.points`. An explicit curve write
  (`set_curve`) always resets `intensity_pct` to `100.0` and clears
  `day_intensity_pct` — see "the intensity reset rule" under the curve
  services below.
  **`intensity_pct` is not the whole of `curve_value`'s adjustment
  argument.** The engine multiplies it by the zone's `adjustment_pct` before
  calling `curve_value` (`zone.adjustment_pct * factor / 100.0` in
  `engine/planner.py`), and `adjustment_pct` is a *zone* setting, not a
  program one. `zone_state` publishes it directly (`adjustment_pct`, see the
  table above) precisely so the card's previews can fold it in — it is also
  still the `zone_adjustment` NUMBER entity's state (`maestro_role:
  zone_adjustment`), which the zone editor reads/writes via `export_config`
  (`config-read.ts`, `zone-editor.ts`) exactly as before; the `zone_state`
  copy exists for previews to read without a round trip through that entity.
- The card keeps two different numbers apart on purpose, both loosely called
  "minutes":
  - **The SETTING**: `intensity_pct` / `day_intensity_pct` and the minutes
    derived from them at the reference temperature (`dayBase` in
    schedule-math.ts), *before* `adjustment_pct`. This seeds the program
    editor's minutes stepper and is the only form ever sent to
    `set_program_minutes`, which derives its intensity as
    `100 * minutes / rawValue(curve, 25)` — no adjustment factor. Folding
    the zone's adjustment into that number before sending it would make the
    engine apply the factor twice and compound the error, so the stepper
    always shows and saves the pre-adjustment figure.
  - **DELIVERY**: the SETTING with `adjustment_pct` folded in, mirroring the
    engine's own ordering exactly — the two percentages are multiplied
    together first, and only that product is applied to the curve's raw
    value; the min/max clamps are absolute guards applied last and are
    never themselves scaled (`curve_value`: `interpolate(temp) *
    adjustment_pct / 100`, then clamp). `previewMinutes` / `dayDelivery`
    (schedule-math.ts) and the curve editor's delivery helper reproduce
    this. Delivery is what the program editor's weather line, the wizard's
    live preview, the curve editor's preview tiles and "today" banner, and
    the program list's per-program summary all show — the list shows
    delivery **on purpose**, not the setting, because it is describing what
    actually gets watered, not what is stored.

  A zone with a non-default `adjustment_pct` therefore shows two different
  numbers for the same program — e.g. 20 min on the stepper (the setting)
  and ≈14 min everywhere else (delivery, at 70%) — and the program editor
  renders a short note explaining the split whenever the zone's adjustment
  isn't 100%, since that screen is the one place both figures are visible
  together.
- The sensor publishes only the stored shape: `curve.points`, `intensity_pct`
  and `day_intensity_pct`. As of 3.0.0 it no longer also publishes
  `day_minutes` / `amount` / `heat` — those were derived display values kept
  only as a bridge for the 2.x card's two-slider editor. The card now derives
  the minutes it displays (uniform and per-day) from `curve.points` and
  `intensity_pct` (plus `day_intensity_pct`) itself, client-side — the
  SETTING form everywhere `dayBase` is used, the DELIVERY form (with
  `adjustment_pct` folded in) everywhere noted above.

`degraded` keys: `switch_valve` (no position feedback), `no_flow_meter`,
`flow_unit_unknown` (a meter is configured but its unit cannot be resolved),
`line_meter_shared`, `no_hourly_forecast`, `volume_mode_unavailable`.

### Water accounting sensors (`zone_water_total`, `hub_unattributed_water`)

Both carry `device_class: water` + `state_class: total_increasing` on
purpose, including `zone_water_total` for a zone whose litres are entirely
an estimate (`nominal_flow_lpm × minutes`, no usable meter) — this was an
explicit product decision, not an oversight: excluding estimated zones was
considered and rejected, because a zone's Water dashboard trend is more
useful with an estimated contribution than with a silent gap. What
compensates instead is redundant marking, not exclusion: the `estimated` /
`source` attributes here, a badge in the card, and a row in the
degradation matrix. **Do not add a condition that withholds
`device_class`/`state_class` for estimated or meterless zones.**

That same device-class pairing is what makes both entities eligible for
Home Assistant's long-term statistics and the Water dashboard, which is
where daily/monthly/yearly totals come from — this is also why **neither
sensor has a "today" or "this month" sibling entity**: the statistics
engine already derives those from the recorded total, and a second entity
holding the same fact would be a second thing that could drift from it.

- **`zone_water_total`** — the zone's all-time cumulative litres.
  - `estimated` (bool): `true` if any of the zone's accrued litres came
    from the nominal-flow estimate rather than a meter reading.
  - `source`: `measured` when none of the total is estimated,
    `nominal` when *all* of it is (the zone has never had a usable meter
    reading), `mixed` when the zone has some of each — e.g. a meter that
    only became usable partway through the zone's history, or that drops
    out intermittently. `none` when the zone holds no litres *and* can
    never accrue any: no meter resolves for it and its `nominal_flow_lpm`
    is unset **or zero** (the schema allows `0`, and a zero nominal books
    nothing), so there is nothing to integrate and no estimate to book.
    Judged on configuration, not on live meter state, so it does not flap
    with a momentarily unavailable sensor.
  - `today_l` / `month_l` (float): the same-zone total sliced to today and
    to the calendar month-to-date. Both are read from the daily history
    that `add_water` writes in the same call that increments the
    cumulative total — never recomputed independently — so they cannot
    diverge from the total they are a slice of, and both roll over at
    local midnight the same way the daily history itself does (no
    separate "reset" logic).
  - `meter_entity`: the entity id actually feeding this zone's litres —
    its own `flow_sensor` if it has one, else the hub's `line_flow_sensor`,
    else `null` (nominal-only). Matches the meter identified by the
    `no_flow_meter` / `line_meter_shared` `degraded` keys on `zone_state`.
  - `last_gap_at` (ISO or `null`): the end of the most recent interval that
    went **unobserved while this zone was watering** — its meter was
    unavailable, or its unit stopped resolving. `null` until it happens.
    Attributed exactly as litres are, so a gap while the zone's valve was
    shut belongs to the unattributed scope and never reaches this attribute.
    It exists because the litres alone cannot distinguish "no water used"
    from "no water seen": a gap is recorded as **zero litres** (no
    interpolation, which would invent water; no counted zero, which would
    assert that none passed), so without this stamp a six-hour outage looks
    exactly like a quiet afternoon. Persisted with the counters, so it
    survives a restart; the seconds behind it live in the daily history's
    `gap_s`. The card is not required to render it — as of 3.3.0 it does
    not. Refreshed on the same throttle as the rest of the sample path (at
    most once a minute), so during a long outage it can trail the store by
    up to that much.
- **`hub_unattributed_water`** — litres a meter measured that no zone
  claimed; the entity's state is the grand total across every scope.
  - `closed_l` (float): the subset of the total measured while every
    managed valve (zone valves + master) reported closed. **This is the
    only figure leak detection reads.** The entity's `state` (the grand
    total) is not: it includes the line priming that happens during
    `master_pre_open_s` on every single cycle, which is real water
    belonging to no zone and is not a leak, so treating the whole total as
    suspect would false-positive on every run.
  - `per_scope` (`{scope: liters}`): the same total broken out by who
    would have been the claimant — a `zone_id` when the unattributed water
    was measured on a meter that serves exactly one zone, `"__hub__"` when
    it was measured on a meter serving more than one zone (or none).
    Scopes with zero litres are omitted.

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
| `set_curve` | `zone_id`, `cycle_id`, `points` (list of [temp, value]), `min_value`, `max_value` (optional), `kind` (`duration` \| `volume`, optional; switches the curve's target kind — `volume` is rejected unless the zone has a usable flow meter) |
| `export_config` | supports response |
| `import_config` | `payload` (JSON string) |
| `set_program_schedule` | `zone_id`, `program_id`, `days` (list of 0–6, empty/omitted = every day), `start_kind` (`time` \| `sun`, required), `start_time` (required if `start_kind: time`), `start_event` (`sunrise` \| `sunset`, required if `start_kind: sun`), `start_offset_min` (int, −360..360, sun starts only, default 0) |
| `set_program_minutes` | `zone_id`, `program_id`, `minutes` (int, 1..1440) **or** `day_minutes` (`{"<weekday>": <minutes>}`) — mutually exclusive, exactly one required |
| `add_program` | `zone_id`, `name` (optional), `copy_from` (optional program_id to clone); supports response `{"program_id": ...}` |
| `duplicate_program` | `zone_id`, `program_id`, `target_zone_id` (optional, default = `zone_id`), `name` (optional, default = "<source name> (copy)"); supports response `{"program_id": ...}` |
| `copy_curve` | `source_zone_id`, `source_program_id`, `zone_id`, `program_id` — copies only the curve's shape onto an already-existing destination program |
| `remove_program` | `zone_id`, `program_id` |
| `rename_program` | `zone_id`, `program_id`, `name` |

`zone_id` is always the subentry id (the `zone_id` attribute above).
`program_id` is the same value as the `cycle_id` in the `cycles` attribute —
the services use the user-facing name ("program") for their field.

The card now also **writes** curves: dragging points directly in the curve
editor calls `set_curve`. There is no separate "simple" slider variant —
every save carries the full set of authored points, because the editor
authors them directly instead of deriving them from a semantic amount/heat
pair. The live editor's "with today's weather" line reads
`hub_weighted_temp`.

**The intensity reset rule**: `set_curve` carries absolute values (minutes,
or litres for a volume curve) — the number the user authors in the editor
must be the number delivered. It therefore always resets `intensity_pct` to
`100.0` and clears `day_intensity_pct` when it replaces a program's curve; a
surviving intensity would otherwise compose with the freshly authored points
and silently multiply (or shrink) what gets delivered. `set_program_minutes`
remains the only service that writes the intensity, and it never touches
`curve.points`. `copy_curve` is the deliberate exception: it copies only the
source program's curve **shape** onto an existing destination program, and
leaves the destination's own `intensity_pct` / `day_intensity_pct`
untouched — the two programs' strengths are independent even after a shape
copy.

### Program scheduling services (`set_program_*` / `*_program`)

- `set_program_schedule` replaces a program's weekday selection and trigger
  in one call. An empty/omitted `days` means "every day". `start_kind`
  selects between a fixed clock time (`start_time` required) and a sun event
  (`start_event` required, `start_offset_min` optional, minutes before a
  sunrise/sunset offset are negative).
- `set_program_minutes` sets watering **strength** either uniformly
  (`minutes`) or per weekday (`day_minutes`); the two fields are
  **exclusive** — passing both, or neither, is a validation error. It only
  applies to duration-kind curves: calling it on a program whose curve is
  volume-target raises `simple_curve_on_volume` (a volume program's
  watering is set by its curve, in litres, instead — use `set_curve`).
  Neither call ever touches `curve.points`: passing
  `minutes` writes a uniform `intensity_pct` (computed against the curve's
  value at the reference temperature) and clears any existing
  `day_intensity_pct`; passing `day_minutes` writes `day_intensity_pct`
  without touching `intensity_pct`. This reverses the pre-3.x behavior,
  where minutes rebuilt the curve from a semantic amount/heat pair.
- `add_program` creates a new program on a zone, either a sensible default
  (every day, sunrise start, 15′ mild + 8′ hot boost) or a copy of an
  existing program (`copy_from`) with a fresh `cycle_id`. Returns
  `{"program_id": "<new id>"}` as its service response.
- `duplicate_program` copies a whole program (curve, schedule, intensity,
  soak, everything) to a fresh `cycle_id`, either within the same zone or
  into `target_zone_id`; the copy's name is de-duplicated against the
  target zone's existing program names when `name` is omitted. Rejects a
  volume-kind source curve when the target zone has no usable flow meter
  (`volume_requires_flow`). Returns `{"program_id": "<new id>"}`.
- `copy_curve` copies only a program's curve shape onto an *existing*
  destination program (`zone_id` / `program_id`), leaving that program's
  schedule, calendar, soak settings, name and intensity untouched — see "the
  intensity reset rule" above for why this differs from `set_curve`. Also
  rejects a volume-kind source without a usable flow meter on the
  destination zone.
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

- `add_zone` seeds the new zone with one sensible default program (a
  duration curve of about 15 min on a mild day, +8 on a hot day, running
  every day at sunrise) so the zone is immediately valid and usable; the
  user then edits it. This is **not** the config flow's interactive zone
  wizard — that wizard is a multi-step form whose curve step defaults to
  the "Preset: potted plants" template instead. `add_zone` returns the new
  zone's id (the `zone_id` attribute above) as its service response.
- `update_zone` and `remove_zone` mirror the "Edit zone" and zone-removal
  paths of the config flow's zone subentry, but as a single service call
  instead of a multi-step wizard. `update_zone` **patches**: only the
  fields passed in the call are changed, everything else on the zone is
  left as-is.
- `set_weather_sources`, `set_consumption_budget` and `set_restrictions`
  patch the hub's options in place, but with different write semantics per
  service:
  - `set_weather_sources` **merges**: `weather_entity` is required on
    every call (the hub always needs one); each optional sensor/valve
    field follows the merge rule used by `_write_hub_options` — present
    and non-empty sets the value, present and empty clears it, and
    omitting the field entirely leaves the current value unchanged.
  - `set_consumption_budget` and `set_restrictions` **replace** their
    whole options section on every call: any field omitted from the call
    is cleared, not left as-is (the panel is expected to always send the
    full section). This is the opposite of `set_weather_sources`' merge
    behavior and of `update_zone`'s patch behavior above — callers that
    only want to change one field of a budget/restrictions call must
    still pass every other field they want to keep.
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
  alternative** to these services — nothing here replaces it, including for
  the parameters the panel's zone editor / settings view (below) don't
  expose: engine weights/thresholds, safety timings, notification routing.
  Phase A shipped the service layer only; Phase B is the panel UI that calls
  these six services — see "The sidebar panel" below for the ＋/✎ zone
  editor and the ⚙️ settings view that consume them.

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
management, and — since Phase B — the **configuration hub**: on top of the
program list Phase A gave it, it also creates/edits/deletes zones and edits
the everyday hub settings (weather & sensors, consumption budget, calendar
restrictions).

**Discovery and data (zones/programs list)**: the panel uses the exact same
contract as the card — no separate API. It iterates `hass.states` for
entities carrying `maestro_role`, groups by `zone_id` the same way, and
reads/writes programs through the `cycles[]` list on each zone's
`zone_state` attributes described above: `cycle_id`, `name`, `enabled`,
`trigger`, `days`, `intensity_pct`, `day_intensity_pct`, `curve`. The weekly
day-grid, per-day duration fields and the "with today's weather" line are
pure presentations of those same fields — there is no new backend surface
for this part of the panel to consume.

**Reads for the zone editor and settings view**: `zone_state` attributes
don't carry every zone field (e.g. `flow_sensor`, `nominal_flow_lpm`,
`compatibility_group`) or any hub option (weather entities, consumption
budget, restrictions) — those exist only in config-entry/subentry data, not
entity attributes. The ✎ zone editor and ⚙️ settings view therefore call
`export_config` (the same response service `import_config` round-trips) when
opened, and seed the form from the parsed JSON payload (`options` +
`zones[zone_id]`) instead of from `discover()`'s entity model — one read per
open, not on every render (`panel.ts`'s `_readConfig` / `_onEditZone` /
`_onOpenSettings`). Entity fields in both forms (valve, flow sensor, weather
entity, rain / outdoor-temp / line-flow sensors, master valve) reuse Home
Assistant's native `<ha-selector>` at runtime — never bundled, supplied by
the frontend, consistent with `embed_iframe: false` above — through a thin
`<imc-entity-picker>` wrapper that falls back to a plain entity-id text
input when `<ha-selector>` isn't registered.

**Services it drives** — the five program-scheduling services documented
above, unchanged from the card's Phase A contract:

- `set_program_schedule` — day-grid + trigger editor.
- `set_program_minutes` — uniform or per-day duration editor.
- `add_program` — the guided add-program wizard (optionally `copy_from` an
  existing program).
- `rename_program` / `remove_program` — program list row actions.

Plus the existing curve service (`set_curve`) behind the panel's **advanced
drawer**, which reuses the same curve-points editor component as the card
(live graph, draggable control points, worked examples, "with today's
weather" line) rather than a separate implementation.

**Plus the six configuration services** (documented in "Configuration
services" above), driving the ＋/✎ zone editor and the ⚙️ settings view:

- `add_zone` / `update_zone` / `remove_zone` — zone create / edit / delete.
- `set_weather_sources` / `set_consumption_budget` / `set_restrictions` —
  the settings view's three independently-saved sections.
