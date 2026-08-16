export interface ZoneData {
  name?: string;
  valve_entity?: string;
  area_m2?: number;
  icon?: string;
  flow_sensor?: string;
  flow_sensor_unit?: string;
  nominal_flow_lpm?: number;
  flow_tolerance_pct?: number;
  // Leak source 1 and the water-supply gate. Stored verbatim, empty string
  // included: every consumer reads them with truthiness, so "" is how a
  // sensor is un-chosen (capabilities.py says so at the point of use).
  leak_sensor?: string;
  water_supply_sensor?: string;
  adjustment_pct?: number;
  order?: number;
  compatibility_group?: string;
  season_months?: number[];
}

export interface HubOptions {
  // Installer settings, editable from the panel's Advanced drawers since 2.1.0.
  session_max_min?: number;
  must_finish_by?: string;
  wait_free_min?: number;
  manual_block_min?: number;
  settle_pause_s?: number;
  sentinel_time?: string;
  open_confirm_s?: number;
  close_confirm_s?: number;
  switch_confirm_s?: number;
  startup_valve_timeout_s?: number;
  watchdog_max_min?: number;
  max_concurrent?: number;
  compatibility_groups?: string;
  master_pre_open_s?: number;
  master_post_close_s?: number;
  // Leak detection and the water-supply gate. They live under
  // `set_valve_safety` rather than a service of their own: the same kind of
  // setting as the confirmation windows above — what the component does when
  // a valve, or the water behind it, does not behave.
  leak_action?: string;
  leak_threshold_lpm?: number;
  leak_confirm_s?: number;
  leak_repeat_min?: number;
  require_water_supply?: boolean;
  water_supply_confirm_s?: number;
  notifications?: Record<string, { enabled?: boolean; services?: string[] }>;
  weather_entity?: string;
  rain_sensor?: string;
  outdoor_temp_sensor?: string;
  line_flow_sensor?: string;
  line_flow_sensor_unit?: string;
  master_valve?: string;
  consumption_budget?: {
    liters_per_month?: number;
    action?: string;
    reduce_pct?: number;
  };
  restrictions?: {
    parity?: string;
    forbidden_windows?: {
      start: string;
      end: string;
    }[];
  };
}

export interface ExportedConfig {
  options: HubOptions;
  zones: Record<string, ZoneData>;
}

export function parseExportedConfig(payload: string): ExportedConfig {
  const raw = JSON.parse(payload) as { options?: HubOptions; zones?: Record<string, ZoneData> };
  return { options: raw.options ?? {}, zones: raw.zones ?? {} };
}
