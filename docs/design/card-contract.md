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
| `hub_leak`          | binary_sensor | `on` = a leak is confirmed for the system scope, `device_class: problem`; **unavailable** when no source could ever raise it, and until the scope has been observed for one confirmation window | `sources`, `since`, `describing_source` — see "Leak entities" below |
| `hub_pause`         | switch   | on = globally paused           | — |
| `hub_evaluate`      | button   | press = evaluate now           | — |
| `hub_stop_all`      | button   | press = stop everything        | — |

## Zone entities (one set per zone)

| maestro_role        | platform | state | extra attributes |
|---------------------|----------|-------|------------------|
| `zone_state`        | sensor   | `idle` \| `queued` \| `watering` \| `soaking` \| `paused` \| `suspended` \| `disabled` | `zone_name`, `order`, `adjustment_pct` (float, 10–300), `degraded` (list of keys, see below), `run_started_at` (ISO, while watering), `run_duration_min` (frozen total), `run_planned_runs` (soak split list), `active_cycle_id`, `suspended_until` (ISO or null), `cycles` (list, see below), `capabilities` (object, see "Zone capabilities" below) |
| `zone_next_run`     | sensor   | ISO timestamp or unavailable | `cycle_id`, `cycle_name` |
| `zone_last_outcome` | sensor   | `completed` \| `skipped` \| `interrupted` \| `cancelled` \| `none` | `reason_key` (see keys), `finished_at` (ISO), `cycle_id`, `duration_min`, `volume_l` |
| `zone_water_total`  | sensor   | liters (float), `device_class: water`, `state_class: total_increasing` | `estimated` (bool), `source` (`measured` \| `nominal` \| `mixed` \| `none`), `today_l` (float), `month_l` (float), `meter_entity` (entity id or null), `last_gap_at` (ISO or null) — see "Water accounting sensors" below |
| `zone_leak`         | binary_sensor | `on` = a leak is confirmed for this zone, `device_class: problem`; **unavailable** when no source could ever raise it, and until the scope has been observed for one confirmation window | `sources`, `since`, `describing_source` — see "Leak entities" below |
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
`line_meter_shared`, `no_hourly_forecast`, `volume_mode_unavailable`,
`leak_sensor_missing`, `water_supply_sensor_missing` (a sensor is configured
but no longer resolves in either the entity registry or the state machine —
see "Zone capabilities" below for why this is not folded into `capabilities`
itself), and two that explain a silent leak entity:

- `leak_never_observable` — for an hour of **idle** time (never counting time
  spent watering, when no leak conclusion is possible by design) nothing has
  been in a position to conclude anything for this zone: a leak sensor that
  has never reported, a meter that is not measuring, or a valve somewhere that
  never reports closed — which blocks every metered scope, since a meter's
  seconds only count with the whole system shut. **Not necessarily a fault**:
  a valve held open outside this integration reads exactly the same, so an
  hour of hand-watering from an irrigation line produces this key and is
  entirely benign. Word it as "this zone could not check", never as "this zone
  is broken".
- `leak_evidence_unresolved` — same hour, but something **is** reporting a
  leak and nothing can finish judging it: a sensor asserting over a valve that
  never reports closed, or measured seconds frozen by a meter that stopped
  reading.

Both accompany a `zone_leak` entity that is `unavailable` and will stay so
until the condition clears — which is correct (see "Leak entities" below) and
is exactly why it is declared: an entity that is silent for ever is otherwise
indistinguishable from a broken integration. They are diagnostics, not alarms:
render them as "this zone cannot currently check for leaks, and here is why",
never as a leak. The two are distinct because they send the user to different
places — the plumbing and its sensors, versus a valve that never reports.

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
    never accrue any right now: no meter is currently usable for it (no
    meter resolves at all, or one does but its unit does not) and its
    `nominal_flow_lpm` is unset **or zero** (the schema allows `0`, and a
    zero nominal books nothing), so there is nothing to integrate and no
    estimate to book. This is the same live usability check
    `water_accounting`'s own `"unavailable"` uses (see "Zone capabilities"
    below), so at zero litres the two agree; it is gated by `total <= 0`,
    so it cannot flap once real litres exist — a zone whose nominal was
    cleared after the fact still reports the provenance of what it
    actually accrued, not `none` retroactively.
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
    exactly like a quiet afternoon. The seconds behind it live in the daily
    history's `gap_s`. The card is not required to render it — as of 3.3.0
    it does not.
    - **Freshness, stated plainly:** a sample that carries *only* a gap
      updates the accounting in memory but asks for **neither a store write
      nor an entity refresh** — otherwise a meter that is permanently
      unreadable (a missing or typo'd entity reads as unit-unknown) would
      rewrite the whole state file once a minute forever, on hardware that
      is usually an SD card. So this attribute is published on the next
      update the integration dispatches **for some other reason**: a
      litre-bearing sample (at most once a minute, unchanged), a session
      phase transition or segment end, or the midnight housekeeping. During
      an outage in which no water is flowing anywhere, that can be hours —
      the value is recorded, just not yet published. Same for durability:
      the gap rides along with the next write that has a reason of its own,
      so an unclean shutdown can lose the most recent gap seconds and a
      `last_gap_at` that had not been written yet. Deliberate: gap seconds
      are the cheapest thing this store holds — losing some under-reports
      an outage, where losing litres would mean a wrong meter reading.
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

### Leak entities (`zone_leak`, `hub_leak`)

One `binary_sensor` per **leak scope**, mirroring the detector exactly: one
for every zone, plus one for the hub scope — water measured on a meter that
serves more than one zone (or none), where which zone leaks is unanswerable
but whether the *system* leaks is not. There is deliberately **no single
summary entity**: an automation that closes the mains needs to know which
zone to shut, and a summary cannot say.

`device_class: problem`, so `on` means "a leak is confirmed on this scope"
in the vocabulary Home Assistant already renders and automates on. The
alarm is the detector's own: one alarm per scope however many sources agree,
raised only after the confirmation window, and held through a source going
silent (an unreadable meter or a flat sensor battery withdraws nothing).

**`unavailable` is a first-class state here, and it is not an error.** It
means *this scope has established nothing*, which happens in exactly two
ways, because `off` under `device_class: problem` asserts *there is no
problem* and neither case can claim that:

1. **No source.** No leak sensor is configured for the zone and no meter
   reports for the scope, so nothing could ever raise the alarm. Configuring
   one takes effect without a reload — it then serves the window in rule 2,
   exactly as it would have at start-up.
2. **Not watched long enough yet.** The entity is unavailable until its scope
   has been *observed* for one confirmation window (`leak_confirm_s`, default
   300 s). The alarm lives in memory only and is deliberately not persisted,
   so at start-up every scope begins with no alarm and a window that has not
   run: for that window we have not established that there is no leak, only
   that we have just started looking.

   **What the window counts is observation, not elapsed time.** Only seconds
   in which one of the scope's sources could actually have concluded something
   count towards it:

   - a leak sensor reading `off` concludes it at any time, so those seconds
     always count;
   - a leak sensor reading `on` counts while that zone's valve reports closed,
     which is exactly when the detector is timing its own window;
   - a meter counts while it is measuring **and** every managed valve is
     closed, because water through an open valve is watering and is discarded.

   So a boot in the middle of a cycle earns nothing until the valves shut, and
   a source that comes up 60 s late is not credited with 60 s it did not
   watch. "Measuring" is strict: `on`/`off` from a sensor (not `unknown` from a
   device that has paired and not yet spoken), and a meter reading that is both
   numeric **and** in a resolvable unit.

   **The window also cannot close while the scope holds unresolved
   evidence** — the sensor's last reading was `on`, or the detector has
   measured seconds on its books. Held, not ticking: a sensor reading `on`
   over a valve that has not reported closed arms no timer anywhere, and
   closing the window there would publish `off` while that zone's own leak
   sensor is reading `on`.
   Silence does not retract this any more than it retracts a raised alarm.

   The window is **per scope and per source set**. Changing the set — swapping
   the sensor, clearing the meter, adding a second source — makes the scope
   earn a window again, because the credit belongs to the sources that served
   it. A zone added later, and a zone that gains its first source later, each
   serve a full window from that moment; a reload is a start-up like any other.
   Note that a scope's meters follow the same `scope_for` rule the litres do,
   so adding or removing a zone behind a shared line meter moves that meter
   between scopes and costs those scopes their credit, even though neither was
   edited directly.

   Once a window has been served it stays served: a later confirmation window
   (post-cycle drainage opens one on every cycle) does not take the answer
   back, and neither does raising `leak_confirm_s` at runtime — a scope that
   has not yet served waits out the new, longer window instead.

   **What `off` therefore guarantees**, exactly: for one confirmation window,
   this scope was in a position to see a leak and saw none, and no source is
   holding evidence it has not resolved. It does **not** guarantee that a leak
   could not begin in the seconds since — that is the detector's own
   confirmation delay, which no entity can remove.

   **The cost, stated plainly:** a configured source that never reports
   anything usable, or a scope that is never in a position to observe (a
   permanently open valve with a meter as its only source), leaves its entity
   unavailable indefinitely. That is the honest answer — the alternative is to
   publish "there is no problem" on behalf of a device that has never spoken,
   or about a period in which nothing could have been noticed. Two of the
   reasons have a signal of their own in `zone_state.degraded` and a card
   should send the user there: `leak_sensor_missing` (the sensor no longer
   exists) and `flow_unit_unknown` (the meter's unit will not resolve). The
   others — a sensor that exists and has never reported, and a scope that has
   never been observable — are declared after an hour of idle time as
   `leak_never_observable` / `leak_evidence_unresolved` in `degraded` (above),
   so that a permanently silent entity is never left looking like a broken
   one. **The hub scope is not covered by this at all**: `degraded` lives on
   `zone_state` and the hub has none. Where the same cause also stalls the
   zones — a valve that never reports closed blocks every metered scope — the
   zones declare it and the hub's silence is at least explained nearby. Where
   it does not, it is explained nowhere: two zones that each have their own
   leak sensor, behind one shared line meter, both settle on their sensors and
   report nothing, while `hub_leak` can stay `unavailable` indefinitely with no
   surface saying why. A card should not present that as healthy.

Four consequences worth stating, because they are easy to get backwards:

- Availability answers **"could this ever tell me something"**, never "is a
  source answering right now". An entity holding an alarm never goes
  unavailable because its meter dropped out or its sensor went quiet — that
  would retract a live warning at the moment it matters most. An alarm that
  is already standing is published immediately, start-up window or not: rule
  2 withholds a *silence*, never an answer we already hold. Nor does a source
  falling silent **after** its window has run take the entity back to
  `unavailable`: the window asks whether the scope has had a fair look, and it
  has had one.
- **The start-up window is what makes the obvious automation pair safe.**
  "Leak → close the mains" plus "leak cleared → reopen it" means a `to: "off"`
  trigger, and a restart during a live leak must not fire it. It does not: the
  entity publishes `unavailable`, never `off`, until it has watched long
  enough, and a transition into `unavailable` fires no `to: "off"` trigger.
  Persisting the alarm instead was considered and rejected — a restored alarm
  can be stale, fixed while the system was down — so the evidence is re-earned
  and `since` moves forward across a restart.
- A card rendering a leak badge must treat `unavailable` as *"nothing
  established"*, never as `off` and never as a fault. The entity itself does
  not say which of the two reasons applies, and a card that needs to tell them
  apart must read **`zone_state.capabilities.leak_watch`** (see "Zone
  capabilities" below): `"none"` there is the declared absence of a source
  (reason 1), while `"zone"` alongside an unavailable leak entity is reason
  2 — a window that resolves by itself within `leak_confirm_s` of the source
  reporting, and does not resolve at all while it never does (check `degraded`
  for `leak_sensor_missing` / `flow_unit_unknown` first; if neither is there,
  the source exists and has not yet spoken).

  **Not `leak_detection`, which cannot answer this.** That key is about the
  valve's own leak *sensor* and knows nothing about flow, so a zone watched
  entirely by its own meter — leak source 2, with no sensor anywhere — reads
  `"unavailable"` there while being fully covered. A card branching on it
  tells such a user "no leak sensor", which is true and leaves them believing
  nothing is watching. `leak_watch` is `leak_sources_configured`, the same
  predicate this entity's own availability is gated on, so the two cannot
  disagree.

  The third value, `"system"`, is a zone whose leaks are watched at the hub
  scope rather than its own — see `leak_watch` below. Its `zone_leak` entity
  stays `unavailable` indefinitely and that is correct: nothing can name that
  zone. A card must not render it as uncovered, and must not render it as an
  all-clear either; it says *where*.
- **Discovery caveat:** Home Assistant publishes no extra state attributes at
  all while an entity is unavailable, `maestro_role` included — so the
  attribute walk at the top of this document does not see an unavailable leak
  entity. A card must therefore treat *"no leak entity for this zone"* and
  *"its leak entity is unavailable"* as the same thing, which they are: both
  mean nothing here could raise a leak alarm. Do not read the absence as an
  error, and do not fall back to matching entity ids to find it.

Attributes, on both:

- `sources` (list of strings, sorted): which sources are contributing
  **right now** — `"valve_sensor"` (the zone's own leak sensor said so) and
  `"no_flow_closed"` (water measured while every managed valve reported
  closed). Not the same as which one raised the alarm: a source can withdraw
  while the alarm stands on another. Empty while `off`.
- `since` (ISO or `null`): when the alarm was **confirmed**, which is not
  when the water started, and no surface may present it as such — a source
  withdrawing and returning yields a fresh one.
- `describing_source` (string or `null`): the source whose evidence a
  description should cite — the first one to notice while it is still
  contributing, a surviving source otherwise. It is what the Repairs notice
  is keyed on, so a card showing both agrees with what the user is reading
  at the same moment. The *first* source is not published here; it is
  carried by the `irrigation_maestro_leak` event (below), which is where an
  automation that cares about provenance reads it.

### Zone capabilities (`zone_state.capabilities`)

Resolved **per zone, not per hub**: in a mixed installation one zone's valve
sits on a device that exposes a moisture/problem sibling sensor and another
does not, and each zone reports its own hardware — never the hub's or
another zone's. `zone_state.capabilities` is an object with four keys, each
one of three string values:

```json
"capabilities": {
  "water_accounting": "measured" | "estimated" | "unavailable",
  "leak_detection":   "configured" | "candidate_available" | "unavailable",
  "water_supply":     "configured" | "candidate_available" | "unavailable",
  "leak_watch":       "zone" | "system" | "none"
}
```

**`leak_detection` and `leak_watch` answer different questions, and a card
almost always wants the second.** The first is about the valve's own leak
*sensor*; the second is about whether anything at all watches this zone's
water, including the flow meter that `leak_detection` knows nothing about.

- **`leak_detection` / `water_supply`** — from `capabilities.py`'s
  `resolve_zone_capabilities`, one per zone:
  - `configured`: the zone's `leak_sensor` / `water_supply_sensor` is set,
    to any entity id, anywhere — not necessarily a sibling of the valve (a
    ground probe near the bed is a legitimate, deliberate choice). The card
    should render this as **active**, not as an invitation.
  - `candidate_available`: nothing is configured, but the valve's own
    device exposes a `binary_sensor` of the matching `device_class`
    (`moisture` for leak, `problem` for water supply) that could be wired
    up. Render this as an **invitation** — "your hardware could do this,
    you have not told it to" — never as a warning or an alarm.
  - `unavailable`: neither configured nor candidate. A **declared absence of
    that sensor**, on purpose: a sensor-shaped alarm that would silently
    never fire is worse than a capability that plainly says the sensor is not
    there. For `water_supply` that is also the whole story, since the supply
    gate has no second source. For `leak_detection` it is **not**: read
    `leak_watch` before telling a user anything about leak coverage, because
    a fully metered zone with no sensor reads `unavailable` here and is
    watched.
  - Detected candidates are matched by `device_class` alone, never by
    entity id or name — a plausible-looking id earns a sensor nothing (see
    `capabilities.py`'s own tests). The card must not re-derive candidates
    by name either; read `candidate_available` and, if it needs the actual
    entity id to offer wiring it up, call the `discover_zone_sensors`
    service (below).
- **`leak_watch`** — *which scope watches this zone's water for leaks*, from
  `runtime.leak_watch`. The one key a card should build a leak-coverage badge
  on:
  - `zone`: this zone's own scope has a source — its leak sensor, or a meter
    that serves it alone — so an alarm can name **this zone**, and its
    `zone_leak` entity is the one to watch. This value is
    `leak_sources_configured` itself, the same predicate that entity's
    availability is gated on, so the attribute and the entity cannot disagree
    about whether a zone is watched.
  - `system`: no source on its own scope, but a meter that also serves it
    reports for the hub scope — the shared-line-meter topology, where which
    of the zones behind the meter leaked is unanswerable. Its water **is**
    measured and a leak in it **will** raise an alarm, on `hub_leak`. Its own
    `zone_leak` therefore stays `unavailable` for ever, correctly. Render
    this as *where* it is watched: "not watched" is false, and "watched"
    without saying where promises a zone-named alarm that can never arrive.
    No badge for this state may read as an all-clear.
  - `none`: nothing watches this zone's water at all. This is the value that
    means what a user reads as "no leak detection here".
- **`water_accounting`** — judged from the zone's flow meter and nominal
  rate, not from `capabilities.py` (which knows nothing about flow), and
  deliberately in the same order `zone_water_total`'s own `source` uses —
  a usable meter first, the nominal fallback second — so the two agree by
  construction rather than by coincidence:
  - `measured`: `zone_flow_meter_usable` confirms a meter is configured
    **and** its unit currently resolves. (This one runtime call already
    covers "no meter at all": it returns `False` whenever no meter entity
    resolves for the zone, so no separate `zone_has_flow_meter` check is
    needed or used here.)
  - `estimated`: the meter is not usable right now — no meter is
    configured, or one is but its unit does not currently resolve — **and**
    `nominal_flow_lpm` is set and nonzero, so litres are still being
    booked every run from nominal flow × minutes (`add_consumption`'s own
    fallback, which triggers on exactly this condition — an unusable
    meter, configured or not — so this value and what is actually being
    recorded never disagree).
  - `unavailable`: the meter is not usable right now **and** no nominal
    rate is set (unset or `0`) — nothing is being recorded at all. Reached
    the same way `zone_water_total`'s own `source: "none"` reaches it for
    the identical, never-had-anything zone.

  **`water_accounting` and `source` describe different things and can
  legitimately differ.** `source` is retrospective — what the litres a
  zone has *already accrued* are made of — while `water_accounting` is a
  statement about the zone's capability *right now*. Two examples, both
  reachable through ordinary use:
  - A zone can show `water_accounting: "measured"` today while
    `zone_water_total.source` still reads `"mixed"` from a spell of
    estimation last week; `source` is not describing the present moment.
  - A zone accrues litres entirely through the nominal fallback (meter
    unusable, `nominal_flow_lpm` set), so `source` settles at `"nominal"`.
    The user then clears `nominal_flow_lpm` to `0` via `update_zone`,
    meter still unusable: `water_accounting` now correctly reads
    `"unavailable"` — nothing new will be recorded from here on — while
    `source` still correctly reads `"nominal"`, because it reports what
    the litres already on the books are made of, not whether anything is
    still being added to them (the same "cleared after the fact" behavior
    `source`'s own definition above documents).

  What the two fields must never do is disagree about **whether new
  litres are currently accruing**: a zone reading `water_accounting:
  "unavailable"` cannot be adding to its total, measured or estimated, at
  that moment — both the live meter path and `add_consumption`'s nominal
  fallback require exactly the conditions that keep `water_accounting`
  out of `"unavailable"` to add anything at all. That narrower guarantee
  is what an earlier defect in this repo actually broke: checking
  `zone_has_flow_meter` (configuration only) ahead of the live usability
  check made a zone with a broken-but-configured meter and a nominal
  fallback report `"unavailable"` while `add_consumption` was silently
  accruing new litres from the nominal estimate underneath it — new
  accrual with `water_accounting` insisting none was happening, not
  merely an old `source` value sitting alongside a new capability
  reading.

**"Configured and missing" is not a fourth `capabilities` value.**
`capabilities.py` reports `configured` for a sensor the user chose even
after that entity stops existing — deliberately: the module only records
intent, and downgrading it the moment an entity blips would let the panel
offer to silently overwrite a deliberate choice during, say, a Zigbee
re-pair. But a configured sensor the user believes is covering them, and
which has in fact vanished, has to be visible as such somewhere, or
`configured` quietly becomes exactly the failure this whole model exists to
prevent. That somewhere is the existing `degraded` list, not `capabilities`:
`leak_sensor_missing` / `water_supply_sensor_missing` appear there whenever
the zone's configured sensor no longer resolves in either the entity
registry or the state machine (registry checked first, so a sensor that
simply has not posted a state since restart — the normal case right after
Home Assistant comes up — is not misreported as vanished). A zone can
therefore show `leak_detection: "configured"` **and** `"leak_sensor_missing"
in degraded` at the same time; that combination is what "configured, but no
longer there" looks like from the attributes alone, and is exactly what
distinguishes it from a zone whose configured sensor is present and
healthy (`"configured"`, nothing in `degraded`).

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
| `get_water_history` | `start_date`, `end_date` (dates, optional), `zone_id` (string or list, optional), `include_unattributed` (bool, default true); supports response ONLY |
| `get_run_history` | `start_date`, `end_date` (dates, optional), `zone_id` (string or list, optional), `result` (one or more of `completed`/`skipped`/`interrupted`/`cancelled`, optional), `limit` (1–5000, default 500); supports response ONLY |

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

### History services

Both `supports_response: ONLY` — neither writes anything, both exist purely
so a card can draw a chart from data the component already holds. They share
one range resolver (`_history_range`) and one retention floor
(`_retention_floor`), so "the last 30 days" and "how far back this
installation still remembers" mean the same thing on both.

`get_water_history` — the per-zone daily water series, dense, with
unattributed water beside it:

```json
{
  "start": "2026-07-18",
  "end": "2026-08-16",
  "retention_days": 730,
  "oldest_available": "2024-08-17",
  "truncated_by_retention": false,
  "unit": "L",
  "zones": [
    {
      "zone_id": "1b2f3c4d5e6f",
      "zone_name": "Vasi",
      "total_l": 12.345,
      "days": [
        {"date": "2026-07-18", "l": 0.0, "gap_s": 0.0, "est": false}
      ]
    }
  ],
  "unattributed": {
    "total_l": 5.0,
    "closed_l": 5.0,
    "days": [
      {"date": "2026-07-18", "l": 0.0, "gap_s": 0.0, "closed_l": 0.0}
    ]
  }
}
```

`zones[].days[]` runs one record per day across `[start, end]` inclusive, in
calendar order; `unattributed.days[]` is the same shape with `closed_l`
instead of `est` (see statement 2 below). `unattributed` is present only when
`include_unattributed` is true (the default) — omitted, not an empty object,
when the caller asked it off. `zones` is sorted by the same order used
elsewhere in this contract: configured zones by `order` then name, zones no
longer configured last, by id.

`get_run_history` — every outcome recorded in the range, skips and their
reasons included:

```json
{
  "start": "2026-07-18",
  "end": "2026-08-16",
  "retention_days": 730,
  "oldest_kept": "2024-08-18T06:00:00+00:00",
  "truncated_by_retention": false,
  "truncated_by_cap": false,
  "truncated_by_limit": false,
  "count": 1,
  "runs": [
    {
      "at": "2026-08-16T05:00:00+00:00",
      "zone_id": "1b2f3c4d5e6f",
      "zone_name": "Vasi",
      "program_id": "p1",
      "program_name": "Mattino",
      "result": "completed",
      "reason_key": null,
      "duration_min": 12,
      "volume_l": 40.0,
      "partial": false,
      "scheduled": true
    }
  ]
}
```

`runs[]` is chronological, oldest first — the order a chart's x-axis wants,
and the same order the log itself is kept in. `oldest_kept` is the `at` of
the log's oldest surviving entry, an ISO instant, or `null` for a log that
has recorded nothing yet. A skip, an interruption or a cancellation carries
`reason_key`; `duration_min` and `volume_l` are `null` on any run that never
measured them, a completed run included when no meter was usable.

Five statements a card author must not have to infer:

1. Both windows default to the last 30 inclusive local days, both clamp a
   future `end_date` to today, both refuse a backwards range with
   `invalid_history_range`, and both anchor the retention floor to **today**
   rather than to `end_date`.
2. The water series is **dense**: one point per day, zeros included. `l: 0,
   gap_s: 0` is a fully observed dry day; `l: 0, gap_s > 0` is a day the
   meter could not be read and **must not be drawn as a dry day**; a date
   outside `[oldest_available, end]` is unknown.
3. `unattributed` is a sibling of `zones` and is **never** part of their
   sum. `closed_l` on its days is the subset measured with every managed
   valve shut — the only figure leak detection reads.
4. A zone that is no longer configured is returned with `zone_name: null`
   and sorts last. Its water and its runs stay on the books; nothing is
   deleted when a zone is removed.
5. `truncated_by_retention` means the caller asked for more than the
   component ever keeps; `truncated_by_cap` means this installation
   produces more runs than the log holds at once. They are different
   sentences and a card should not merge them.

## Events

`irrigation_maestro_<event>` with `event` one of: `session_started`,
`session_finished`, `cycle_started`, `cycle_finished`, `cycle_skipped`,
`cycle_interrupted`, `cycle_cancelled`, `anomaly`, `watchdog`, `sentinel`,
`session_overrun`, `consumption_budget`, `leak`. Payload always includes
`zone_id`, `zone_name`, `cycle_id` where applicable, plus `reason_key` for
skips.

`irrigation_maestro_leak` is the exception to that shape, because a leak is
scoped rather than zoned: it carries `scope` (a `zone_id` or `"__hub__"`),
`zone_id` (`null` for a hub-scope alarm, so an automation reading it cannot
address a zone that was never implicated), `state` (`active` | `cleared`),
`first_source` and `sources`. It fires **once** per alarm and once when it
clears — a second source agreeing is not a second alarm, and the repeat
reminder fires no event at all. The live state of the same alarm is the
`zone_leak` / `hub_leak` entity above.

## Localizable keys (card must translate, en + it)

Skip/outcome `reason_key` values: `out_of_season`, `precipitation`,
`frost_risk`, `cold_day`, `wind`, `budget_sufficient`, `not_due`,
`calendar_restricted`, `zone_disabled`, `cycle_disabled`, `day_not_scheduled`
(the program's `days` doesn't include today), `suspended`,
`paused`, `manual_stop_block`, `session_overrun`, `weather_unavailable`,
`skip_today_requested`, `consumption_budget`, plus cancellation/interruption
causes: `valves_busy`, `valve_unavailable`, `open_failed`,
`foreign_valve_open`, `manual_intervention` (also used for manual stop-all),
`no_flow`, `watchdog`, `zone_removed`, `shutdown`, `cancelled`, `leak` (a
confirmed leak alarm under the `close_and_block` action refused the start),
`no_water_supply` (the zone's water-supply sensor reports no water — a refused
start once the outage has been confirmed, and also the reason a zero-flow
interrupt carries when that sensor explains it).
Anomaly-only keys (fired in `anomaly` events, not as run outcomes):
`flow_out_of_range`, `close_failed`. A restart leaves no per-cycle outcome
by design — the startup watchdog closes valves and the sentinel flags the
missing outcome.

Zone/session states and degraded keys above are localizable too, as are the
`capabilities` values (`measured`, `estimated`, `configured`,
`candidate_available`, `unavailable`, and `leak_watch`'s `zone` / `system` /
`none` — the last three being statements about *where*, so word them that
way and never as a verdict) and the leak source keys
`valve_sensor` / `no_flow_closed`, which reach the card as raw values in
`zone_leak` / `hub_leak`'s `sources` and `describing_source` attributes and
in the `leak` event's `first_source`. Word them as *observations*, never as
conclusions — `valve_sensor` is "the valve's own sensor reports a leak" for
both readings of a `moisture` sensor, and must never become "water detected
on the ground", which is false on the reference hardware.

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
