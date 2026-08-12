/**
 * Types modelling the card ↔ integration contract
 * (docs/design/card-contract.md) plus the minimal slice of the
 * Home Assistant frontend API the card relies on.
 */

/* ------------------------------------------------------------------ */
/* Contract: states, roles, keys                                       */
/* ------------------------------------------------------------------ */

export const ZONE_STATES = [
  "idle",
  "queued",
  "watering",
  "soaking",
  "paused",
  "suspended",
  "disabled",
] as const;
export type ZoneState = (typeof ZONE_STATES)[number];

export const SESSION_STATES = ["idle", "evaluating", "running"] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const OUTCOME_STATES = [
  "completed",
  "skipped",
  "interrupted",
  "cancelled",
  "none",
] as const;
export type OutcomeState = (typeof OUTCOME_STATES)[number];

export const REASON_KEYS = [
  "out_of_season",
  "precipitation",
  "frost_risk",
  "cold_day",
  "wind",
  "budget_sufficient",
  "not_due",
  "calendar_restricted",
  "zone_disabled",
  "cycle_disabled",
  "suspended",
  "paused",
  "manual_stop_block",
  "session_overrun",
  "weather_unavailable",
  "skip_today_requested",
  "day_not_scheduled",
  "consumption_budget",
  // cancellation causes
  "valves_busy",
  "valve_unavailable",
  "open_failed",
  "foreign_valve_open",
  "manual_intervention",
  "no_flow",
  "flow_out_of_range",
  "close_failed",
  "restart",
] as const;
export type ReasonKey = (typeof REASON_KEYS)[number];

export const DEGRADED_KEYS = [
  "switch_valve",
  "no_flow_meter",
  "line_meter_shared",
  "no_hourly_forecast",
  "volume_mode_unavailable",
] as const;
export type DegradedKey = (typeof DEGRADED_KEYS)[number];

export type HubRole =
  | "hub_water_budget"
  | "hub_skip_threshold"
  | "hub_weighted_temp"
  | "hub_session"
  | "hub_consumption_left"
  | "hub_pause"
  | "hub_evaluate"
  | "hub_stop_all";

export type ZoneRole =
  | "zone_state"
  | "zone_next_run"
  | "zone_last_outcome"
  | "zone_enabled"
  | "cycle_enabled"
  | "zone_order"
  | "zone_interval"
  | "zone_adjustment"
  | "zone_suspend_until";

export type MaestroRole = HubRole | ZoneRole;

/* ------------------------------------------------------------------ */
/* Contract: attribute payload shapes (read defensively — attributes   */
/* arrive untyped from hass, so every field is optional)               */
/* ------------------------------------------------------------------ */

export interface CycleTrigger {
  kind?: string;
  event?: string;
  offset_s?: number;
  at?: string;
  time?: string;
}

export interface CycleCurve {
  /** List of [temperature, value] pairs. */
  points?: unknown;
  min?: number;
  max?: number;
  /** "duration" (minutes) or "volume" (liters). */
  kind?: string;
}

export interface CalendarInfo {
  mode: "weekdays" | "interval" | "parity";
  days?: number[];
  parity?: "odd" | "even";
}

export interface CycleInfo {
  calendar?: CalendarInfo;
  season_months?: number[];
  cycle_id?: string;
  name?: string;
  enabled?: boolean;
  trigger?: CycleTrigger;
  curve?: CycleCurve;
  /** Weekdays 0=Mon..6=Sun the program runs; undefined/absent = every day. */
  days?: number[];
  /** Per-weekday base minutes, keyed by weekday-as-string; absent = uniform. */
  day_minutes?: Record<string, number>;
  /** Friendly derived values for a duration curve (null/absent for volume). */
  amount?: number;
  heat?: number;
}

export interface QueueItem {
  zone_id?: string;
  zone_name?: string;
  cycle_id?: string;
  duration_min?: number;
  state?: string;
}

/* ------------------------------------------------------------------ */
/* Home Assistant frontend API (minimal)                               */
/* ------------------------------------------------------------------ */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  locale?: { language?: string };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean,
    returnResponse?: boolean,
  ): Promise<{ context: unknown; response?: Record<string, unknown> }>;
}

/* ------------------------------------------------------------------ */
/* Card configuration                                                  */
/* ------------------------------------------------------------------ */

export interface CardConfig {
  type: string;
  title?: string;
  show_header?: boolean;
  show_queue?: boolean;
  show_controls?: boolean;
  compact?: boolean;
  /** Optional filter: list of zone_ids (subentry ids) to display. */
  zones?: string[];
}

export const CONFIG_DEFAULTS = {
  show_header: true,
  show_queue: true,
  show_controls: true,
  compact: false,
} as const;

/* ------------------------------------------------------------------ */
/* Internal component events                                           */
/* ------------------------------------------------------------------ */

export type ZoneAction =
  | { action: "run"; zoneId: string }
  | { action: "skip"; zoneId: string }
  | { action: "pause"; zoneId: string; hours: number }
  | { action: "suspend"; zoneId: string; until: string }
  | { action: "resume"; zoneId: string }
  | { action: "set-enabled"; zoneId: string; enabled: boolean }
  | {
      action: "save-simple-curve";
      zoneId: string;
      cycleId: string;
      amount: number;
      heat: number;
      min: number;
      max: number;
    }
  | {
      action: "save-curve";
      zoneId: string;
      cycleId: string;
      points: [number, number][];
      min: number;
      max: number;
    };

export type GlobalAction =
  | { action: "run_all" }
  | { action: "stop_all" }
  | { action: "evaluate" }
  | { action: "set-pause"; paused: boolean };

/* ------------------------------------------------------------------ */
/* window.customCards registration                                     */
/* ------------------------------------------------------------------ */

export interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

/* ------------------------------------------------------------------ */
/* Small defensive helpers used across components                      */
/* ------------------------------------------------------------------ */

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isUnavailable(entity: HassEntity | undefined): boolean {
  return (
    !entity || entity.state === "unavailable" || entity.state === "unknown"
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * customElements.define that tolerates re-registration (e.g. the module
 * being loaded twice by Lovelace).
 */
export function defineElement(
  tag: string,
  cls: CustomElementConstructor,
): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, cls);
  }
}
