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
  interval_days?: number;
  compatibility_group?: string;
  season_months?: number[];
}

export interface HubOptions {
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
    allowed_weekdays?: number[];
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
