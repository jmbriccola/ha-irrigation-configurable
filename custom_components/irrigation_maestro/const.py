"""Constants for Irrigation Maestro."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "irrigation_maestro"

# Config entry / subentry -------------------------------------------------

SUBENTRY_TYPE_ZONE: Final = "zone"

# Hub options keys
CONF_WEATHER_ENTITY: Final = "weather_entity"
CONF_RAIN_SENSOR: Final = "rain_sensor"
CONF_OUTDOOR_TEMP_SENSOR: Final = "outdoor_temp_sensor"
CONF_LINE_FLOW_SENSOR: Final = "line_flow_sensor"
CONF_LINE_FLOW_UNIT: Final = "line_flow_sensor_unit"
CONF_MASTER_VALVE: Final = "master_valve"
CONF_MASTER_PRE_OPEN_S: Final = "master_pre_open_s"
CONF_MASTER_POST_CLOSE_S: Final = "master_post_close_s"
CONF_MAX_CONCURRENT: Final = "max_concurrent"
CONF_COMPATIBILITY_GROUPS: Final = "compatibility_groups"
CONF_SETTLE_PAUSE_S: Final = "settle_pause_s"
CONF_MANUAL_BLOCK_MIN: Final = "manual_block_min"
CONF_WATCHDOG_MAX_MIN: Final = "watchdog_max_min"
CONF_OPEN_CONFIRM_S: Final = "open_confirm_s"
CONF_CLOSE_CONFIRM_S: Final = "close_confirm_s"
CONF_SWITCH_CONFIRM_S: Final = "switch_confirm_s"
CONF_WAIT_FREE_MIN: Final = "wait_free_min"
CONF_SENTINEL_TIME: Final = "sentinel_time"
CONF_SESSION_MAX_MIN: Final = "session_max_min"
CONF_MUST_FINISH_BY: Final = "must_finish_by"
CONF_STARTUP_VALVE_TIMEOUT_S: Final = "startup_valve_timeout_s"
CONF_RESTRICTIONS: Final = "restrictions"
CONF_ENGINE: Final = "engine"
CONF_NOTIFICATIONS: Final = "notifications"
CONF_CONSUMPTION_BUDGET: Final = "consumption_budget"
CONF_CURVE_TEMPLATES: Final = "curve_templates"
CONF_LEAK_ACTION: Final = "leak_action"
CONF_LEAK_THRESHOLD_LPM: Final = "leak_threshold_lpm"
CONF_LEAK_CONFIRM_S: Final = "leak_confirm_s"
CONF_LEAK_REPEAT_MIN: Final = "leak_repeat_min"
CONF_REQUIRE_WATER_SUPPLY: Final = "require_water_supply"
CONF_WATER_SUPPLY_CONFIRM_S: Final = "water_supply_confirm_s"

# What the component does when a leak alarm goes active.
LEAK_ACTION_NOTIFY: Final = "notify"
LEAK_ACTION_CLOSE: Final = "close"
LEAK_ACTION_CLOSE_AND_BLOCK: Final = "close_and_block"
#: The legal values, in one place: parsing validates against this and the
#: service schema selects from it, so a value the options accept can never be
#: one the runtime silently ignores.
LEAK_ACTIONS: Final = (LEAK_ACTION_NOTIFY, LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK)

# WHERE a zone's water is watched for leaks, published per zone in
# zone_state's `capabilities`. Not the same question as `leak_detection`,
# which is about the valve's own leak SENSOR: a zone with no sensor at all is
# still watched by its own meter, and on a shared line meter it is watched by
# the system scope instead. Saying "no leak sensor" to a user whose three
# metered zones are all being watched is true and produces a false belief,
# which is worse than a false statement -- there is nothing to catch by
# reading it.
#: This zone's own scope has a source: an alarm will name THIS zone.
LEAK_WATCH_ZONE: Final = "zone"
#: No source of its own, but a meter that also serves it reports for the hub
#: scope -- so its water is watched, and an alarm would name the system.
LEAK_WATCH_SYSTEM: Final = "system"
#: Nothing watches this zone's water at all.
LEAK_WATCH_NONE: Final = "none"
LEAK_WATCH_VALUES: Final = (LEAK_WATCH_ZONE, LEAK_WATCH_SYSTEM, LEAK_WATCH_NONE)

# The two `degraded` keys that explain a silent leak entity. Named constants,
# unlike every other degraded key, for one reason: the card MATCHES THESE BY
# NAME (discovery.ts's leakStatus branches on them to decide a zone has an
# explanation of its own), so a rename here silently stops that branch firing.
# A cross-boundary test asserts each value appears in the card source; it
# imports these, so it cannot hold a stale copy of a name nobody updated.
DEGRADED_LEAK_EVIDENCE_UNRESOLVED: Final = "leak_evidence_unresolved"
DEGRADED_LEAK_NEVER_OBSERVABLE: Final = "leak_never_observable"

# Restrictions keys (hub-level and zone override)
CONF_ALLOWED_WEEKDAYS: Final = "allowed_weekdays"
CONF_PARITY: Final = "parity"
CONF_FORBIDDEN_WINDOWS: Final = "forbidden_windows"
CONF_WINDOW_START: Final = "start"
CONF_WINDOW_END: Final = "end"

# Engine keys (mirror engine.EngineParams fields)
CONF_TEMP_WEIGHTS: Final = "temp_weights"
CONF_RAIN_WEIGHTS: Final = "rain_weights"
CONF_FORECAST_CREDIT_WEIGHTS: Final = "forecast_credit_weights"
CONF_FORECAST_CREDIT_CAP: Final = "forecast_credit_cap_mm"
CONF_HOT_CREDIT_HALVING_TEMP: Final = "hot_credit_halving_temp_c"
CONF_THRESHOLD_BASE: Final = "threshold_base_mm"
CONF_THRESHOLD_SLOPE: Final = "threshold_slope_mm_per_c"
CONF_THRESHOLD_KNEE: Final = "threshold_knee_c"
CONF_THRESHOLD_MAX: Final = "threshold_max_mm"
CONF_FREEZE_SKIP: Final = "freeze_skip_c"
CONF_COLD_DAY_SKIP: Final = "cold_day_skip_c"
CONF_WIND_SKIP_ENABLED: Final = "wind_skip_enabled"
CONF_WIND_SKIP_KMH: Final = "wind_skip_kmh"
CONF_STAGED_RAIN_WEIGHT: Final = "staged_rain_weight"
CONF_SEASON_MONTHS: Final = "season_months"
CONF_STALE_WEATHER_MAX_H: Final = "stale_weather_max_h"
CONF_STALE_WEATHER_POLICY: Final = "stale_weather_policy"

STALE_POLICY_FAIL_OPEN: Final = "fail_open"
STALE_POLICY_FAIL_CLOSED: Final = "fail_closed"

# Notification config: {event_key: {"enabled": bool, "services": [..], "priority": str}}
CONF_NOTIFY_ENABLED: Final = "enabled"
CONF_NOTIFY_SERVICES: Final = "services"
CONF_NOTIFY_PRIORITY: Final = "priority"

# Consumption budget
CONF_BUDGET_LITERS: Final = "liters_per_month"
CONF_BUDGET_ACTION: Final = "action"
CONF_BUDGET_REDUCE_PCT: Final = "reduce_pct"
BUDGET_ACTION_NOTIFY: Final = "notify"
BUDGET_ACTION_REDUCE: Final = "reduce"
BUDGET_ACTION_SUSPEND: Final = "suspend"

# Zone subentry data keys
CONF_ZONE_NAME: Final = "name"
CONF_ZONE_ICON: Final = "icon"
CONF_VALVE_ENTITY: Final = "valve_entity"
CONF_FLOW_SENSOR: Final = "flow_sensor"
#: Explicit unit for this zone's flow sensor, used when the entity declares
#: nothing or declares something the converter cannot handle. Absent means
#: "read the unit from the entity".
CONF_FLOW_SENSOR_UNIT: Final = "flow_sensor_unit"
CONF_NOMINAL_FLOW_LPM: Final = "nominal_flow_lpm"
CONF_FLOW_TOLERANCE_PCT: Final = "flow_tolerance_pct"
#: Optional per-zone binary_sensor with device_class "moisture", reporting a
#: leak. On some valves this is a physical ground probe; on others (e.g. the
#: SONOFF SWV) it is an alarm derived from the valve's own internal flow
#: meter -- "water is passing while I am closed" -- which the integration
#: platform (ZHA) maps to "moisture" because it is the nearest available
#: class. Both are valid on different hardware, so any message about this
#: sensor must be true for both: say "the valve reports a leak", never
#: "water detected on the ground".
CONF_LEAK_SENSOR: Final = "leak_sensor"
#: Optional per-zone binary_sensor with device_class "problem". Its polarity
#: is inverted relative to the usual reading of the name: "on" means
#: PROBLEM, i.e. the water supply is missing, not that it is present.
CONF_WATER_SUPPLY_SENSOR: Final = "water_supply_sensor"
CONF_AREA_M2: Final = "area_m2"
CONF_ADJUSTMENT_PCT: Final = "adjustment_pct"
CONF_ORDER: Final = "order"
CONF_INTERVAL_DAYS: Final = "interval_days"
CONF_COMPATIBILITY_GROUP: Final = "compatibility_group"
CONF_ZONE_SEASON_MONTHS: Final = "season_months"
CONF_ZONE_RESTRICTIONS: Final = "restrictions"
CONF_CYCLES: Final = "cycles"

# Cycle keys
CONF_CYCLE_ID: Final = "id"
CONF_CYCLE_NAME: Final = "name"
CONF_CYCLE_ENABLED: Final = "enabled"
CONF_TRIGGER: Final = "trigger"
CONF_TRIGGER_KIND: Final = "kind"
CONF_TRIGGER_EVENT: Final = "event"
CONF_TRIGGER_OFFSET_S: Final = "offset_s"
CONF_TRIGGER_AT: Final = "at"
CONF_MONTHS_OVERRIDE: Final = "months_override"
CONF_CYCLE_DAYS: Final = "days"  # legacy v1, migrated to CONF_CALENDAR
CONF_CALENDAR: Final = "calendar"
CONF_CYCLE_DAY_MINUTES: Final = "day_minutes"
CONF_CURVE: Final = "curve"
CONF_CURVE_POINTS: Final = "points"
CONF_CURVE_MIN: Final = "min_value"
CONF_CURVE_MAX: Final = "max_value"
CONF_CURVE_KIND: Final = "kind"
CONF_CURVE_TEMPLATE: Final = "template"
CONF_CYCLE_INTENSITY_PCT: Final = "intensity_pct"
CONF_CYCLE_DAY_INTENSITY_PCT: Final = "day_intensity_pct"

#: Temperature the quick minutes control converts against: "N minutes" means
#: N minutes at this temperature, expressed as a percentage of the curve's
#: raw value there.
CURVE_REFERENCE_TEMP_C: Final = 25.0
CONF_SOAK_MAX_RUN_MIN: Final = "soak_max_run_min"
CONF_SOAK_PAUSE_MIN: Final = "soak_pause_min"
CONF_VOLUME_SAFETY_TIMEOUT_MIN: Final = "volume_safety_timeout_min"

TRIGGER_KIND_SUN: Final = "sun"
TRIGGER_KIND_TIME: Final = "time"

# Defaults ----------------------------------------------------------------

DEFAULT_MASTER_PRE_OPEN_S: Final = 5
DEFAULT_MASTER_POST_CLOSE_S: Final = 5
DEFAULT_MAX_CONCURRENT: Final = 1
DEFAULT_SETTLE_PAUSE_S: Final = 120
DEFAULT_MANUAL_BLOCK_MIN: Final = 60
DEFAULT_WATCHDOG_MAX_MIN: Final = 70
DEFAULT_OPEN_CONFIRM_S: Final = 120
DEFAULT_CLOSE_CONFIRM_S: Final = 120
DEFAULT_SWITCH_CONFIRM_S: Final = 10
DEFAULT_WAIT_FREE_MIN: Final = 10
DEFAULT_SENTINEL_TIME: Final = "12:00"
DEFAULT_STARTUP_VALVE_TIMEOUT_S: Final = 300
DEFAULT_STALE_WEATHER_MAX_H: Final = 6
DEFAULT_INTERVAL_DAYS: Final = 3
DEFAULT_ORDER: Final = 100
DEFAULT_ADJUSTMENT_PCT: Final = 100
DEFAULT_FLOW_TOLERANCE_PCT: Final = 25
DEFAULT_BUDGET_REDUCE_PCT: Final = 50

#: Sustained flow below this, with everything shut, is drip and drainage.
#: Checked against the author's own plumbing.
DEFAULT_LEAK_THRESHOLD_LPM: Final = 0.5
#: How long a leak must be reported before it is believed. One setting, two
#: mechanisms, because the two sources observe different things:
#:
#: * source 2 (flow with everything shut) counts only the seconds its meter
#:   actually MEASURED, and resets whenever flow drops below the threshold or
#:   any managed valve stops reporting closed -- so post-cycle drainage cannot
#:   reach it: it would have to run above threshold for the whole of it, which
#:   is not drainage. One mechanism instead of a threshold plus a separate
#:   blanking window after each close;
#: * source 1 (the valve's own sensor) measures wall-clock time since the
#:   later of the sensor asserting and THIS ZONE's valve reporting closed --
#:   a level, not a rate, so there is nothing to accumulate. On hardware where
#:   "moisture" is a real ground probe, that is what stops a probe wet from
#:   its own zone's cycle alarming at every close.
DEFAULT_LEAK_CONFIRM_S: Final = 300
#: How often a leak that will not go away says so again. Long, because the
#: alarm is a standing condition and a reminder every few minutes is noise.
DEFAULT_LEAK_REPEAT_MIN: Final = 360
#: A missing water supply blocks the start of a cycle by default: with no water
#: the cycle waters nothing anyway, so blocking costs the garden nothing.
DEFAULT_REQUIRE_WATER_SUPPLY: Final = True
#: How long the supply must have been reported missing before a cycle start is
#: refused. Deliberately shorter than DEFAULT_LEAK_CONFIRM_S, because the two
#: mistakes cost different amounts: a false leak alarm shuts valves and shouts,
#: while a false supply block withholds water that -- if the sensor is right --
#: was never going to arrive. And erring the other way is cheap too, WHERE A
#: METER RESOLVES: a window too long merely lets the cycle start, and the
#: zero-flow guard interrupts it a few minutes later with the same diagnosis,
#: so the two behaviours degrade into each other rather than contradicting.
#: On a zone with no meter there is no guard -- session.py builds no
#: FlowMonitor without a ledger -- so nothing catches the dry run and the
#: window is the only thing standing between a supply outage and ten minutes
#: of watering nothing. Which is an argument for the default being short, not
#: for it being zero: the flaky-reading case is just as real there.
#:
#: Measured against the sensor's own last_changed, so nothing is tracked and
#: nothing can drift. After a restart a restored state's last_changed is the
#: restore, so the clock restarts -- the safe direction: we do not know how
#: long the supply has been out, so we do not withhold water until it is
#: confirmed again.
DEFAULT_WATER_SUPPLY_CONFIRM_S: Final = 180

# Runtime -----------------------------------------------------------------

STORAGE_VERSION: Final = 1

#: The run log is a second Store with a schema of its own, so it versions on
#: its own. Sharing STORAGE_VERSION would force a bump of one file for a change
#: to the other, and a migration for a schema that did not move.
STORAGE_VERSION_RUNS: Final = 1

EVENT_PREFIX: Final = f"{DOMAIN}_"

ATTR_MAESTRO_ROLE: Final = "maestro_role"
ATTR_ZONE_ID: Final = "zone_id"

# Curve preset ids (read-only templates)
PRESET_POTS_ID: Final = "preset_pots"
PRESET_LAWN_ID: Final = "preset_lawn"

# Frontend
FRONTEND_URL_BASE: Final = f"/{DOMAIN}/frontend"
CARD_FILENAME: Final = "irrigation-maestro-card.js"
PANEL_FILENAME: Final = "irrigation-maestro-panel.js"
