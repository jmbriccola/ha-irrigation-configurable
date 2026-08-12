export interface ZoneData {
  name?: string;
  valve_entity?: string;
  area_m2?: number;
  icon?: string;
  flow_sensor?: string;
  nominal_flow_lpm?: number;
  flow_tolerance_pct?: number;
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
  notifications?: Record<string, { enabled?: boolean; services?: string[] }>;
  weather_entity?: string;
  rain_sensor?: string;
  outdoor_temp_sensor?: string;
  line_flow_sensor?: string;
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
