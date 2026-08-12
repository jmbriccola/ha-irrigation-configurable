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
CONF_NOMINAL_FLOW_LPM: Final = "nominal_flow_lpm"
CONF_FLOW_TOLERANCE_PCT: Final = "flow_tolerance_pct"
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

# Runtime -----------------------------------------------------------------

STORAGE_VERSION: Final = 1

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
