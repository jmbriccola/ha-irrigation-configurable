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
  // Deliberately UNLABELLED, and excluded by name from the locale-coverage
  // test in localize/localize.test.ts, which states the reason: the card
  // contract says a restart leaves no per-cycle outcome by design, so this
  // key cannot reach a rendered outcome. Nothing in the component emits it
  // as a reason_key (checked across custom_components/ when the leak work
  // added the two keys below). Do not invent a label for it; if the
  // component ever starts emitting it, label it and drop the exclusion.
  "restart",
  // A confirmed leak alarm under the close_and_block action.
  "leak",
  // Not a leak: the zone's water-supply sensor reports there is no water.
  // Both a refused start and the diagnosis of a zero-flow interrupt.
  "no_water_supply",
] as const;
export type ReasonKey = (typeof REASON_KEYS)[number];

export const DEGRADED_KEYS = [
  "switch_valve",
  "no_flow_meter",
  "flow_unit_unknown",
  "line_meter_shared",
  "no_hourly_forecast",
  "volume_mode_unavailable",
  // A sensor the user chose that no longer resolves. `capabilities` keeps
  // reporting it as `configured` on purpose (it records intent), so this is
  // the only place "configured, and gone" is visible.
  "leak_sensor_missing",
  "water_supply_sensor_missing",
  // Why a leak entity has been silent for an hour of idle time. Diagnostics,
  // NOT alarms: word them as "this zone could not check", never as a leak
  // (docs/design/card-contract.md).
  "leak_never_observable",
  "leak_evidence_unresolved",
] as const;
export type DegradedKey = (typeof DEGRADED_KEYS)[number];

/**
 * The leak sources, as `zone_leak`/`hub_leak` publish them raw in `sources`
 * and `describing_source` and as the `leak` event carries them in
 * `first_source`. Unlocalised contract keys: every surface must translate
 * them (`leak_source.<key>`), the way `reason_key` is translated.
 *
 * They are OBSERVATIONS, never conclusions — `valve_sensor` is "the valve's
 * own sensor reports a leak" for both readings of a `moisture` sensor, and
 * must never become "water detected on the ground", which is false on the
 * reference hardware (docs/design/card-contract.md).
 */
export const LEAK_SOURCE_KEYS = ["valve_sensor", "no_flow_closed"] as const;
export type LeakSourceKey = (typeof LEAK_SOURCE_KEYS)[number];

export type HubRole =
  | "hub_water_budget"
  | "hub_skip_threshold"
  | "hub_weighted_temp"
  | "hub_session"
  | "hub_consumption_left"
  // Water accounting (docs/design/card-contract.md): hub-wide litres no
  // zone claimed. Not yet surfaced by the card -- the role is registered
  // here, same as zone_interval/zone_adjustment below, so it counts as a
  // discovery hit ahead of whichever task first renders it.
  | "hub_unattributed_water"
  // The system scope's leak alarm: water on a meter no single zone owns.
  // `unavailable` here is a first-class state meaning "nothing established",
  // and an unavailable entity publishes no attributes at all -- so this role
  // is simply absent from the discovery walk while that lasts.
  | "hub_leak"
  | "hub_pause"
  | "hub_evaluate"
  | "hub_stop_all";

export type ZoneRole =
  | "zone_state"
  | "zone_next_run"
  | "zone_last_outcome"
  // Water accounting (docs/design/card-contract.md): the zone's cumulative
  // litres, `waterSummary()` in discovery.ts reads this role's entity.
  | "zone_water_total"
  // This zone's leak alarm (`discovery.ts`'s `leakStatus` reads it). Same
  // caveat as `hub_leak` above: unavailable means nothing established, and
  // an unavailable entity is invisible to the attribute walk.
  | "zone_leak"
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
  /** Present only in `interval` mode — `to_config` emits the active mode's keys only. */
  interval_days?: number;
  parity?: "odd" | "even";
}

export interface CycleInfo {
  soak_max_run_min?: number;
  soak_pause_min?: number;
  volume_safety_timeout_min?: number;
  calendar?: CalendarInfo;
  season_months?: number[];
  cycle_id?: string;
  name?: string;
  enabled?: boolean;
  trigger?: CycleTrigger;
  curve?: CycleCurve;
  /** Weekdays 0=Mon..6=Sun the program runs; undefined/absent = every day. */
  days?: number[];
  /** Watering strength as a percentage of the curve; absent reads as 100. */
  intensity_pct?: number;
  /** Per-weekday override of `intensity_pct`, keyed by weekday-as-string. */
  day_intensity_pct?: Record<string, number>;
  /**
   * The cadence marker: the last day this program COMPLETED a scheduled run,
   * ISO date or null. Gates `interval` mode only, and is what turns "every 3
   * days" from half an answer into a checkable one.
   */
  last_completed?: string | null;
}

export interface QueueItem {
  zone_id?: string;
  zone_name?: string;
  cycle_id?: string;
  duration_min?: number;
  state?: string;
}

/**
 * A zone's water figures, derived from `zone_water_total`
 * (docs/design/card-contract.md) by `waterSummary()` in discovery.ts.
 */
export interface WaterSummary {
  total: number;
  today: number;
  month: number;
  /** True when any of `total` came from the nominal-flow estimate rather
   *  than a meter reading -- covers both `source: "nominal"` (all of it)
   *  and `source: "mixed"` (some of it): the contract defines `estimated`
   *  as true in either case, so badging on this one flag already covers
   *  both sources without a separate check. */
  estimated: boolean;
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
  /** Mirrors the HA frontend's service registry; the wizard's recipient-discovery source. */
  services?: Record<string, Record<string, { name?: string; description?: string }>>;
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

/**
 * The eight blocks of the zone card.
 *
 * Ordered as they render. Every one defaults ON: the acceptance criterion is a
 * dashboard built without assembling anything, so a user who adds the card
 * sees what the zone has and turns off what they do not want. Clean
 * degradation removes the rest by itself -- a zone with no meter shows no
 * consumption block whether or not its key is set.
 */
export const ZONE_CARD_BLOCKS = [
  "state",
  "next_run",
  "last_outcome",
  "programs",
  "curve",
  "hardware",
  "consumption",
  "actions",
] as const;

export type ZoneCardBlock = (typeof ZONE_CARD_BLOCKS)[number];

export interface ZoneCardConfig {
  type: string;
  /** Required: the subentry id of the zone this card shows. */
  zone?: string;
  title?: string;
  blocks?: Partial<Record<ZoneCardBlock, boolean>>;
  /** Days of history the chart draws. */
  chart_days?: 30 | 90 | 365;
  /** Where the consumption figures come from. */
  consumption_source?: "internal" | "entity";
  total_entity?: string;
  today_entity?: string;
  month_entity?: string;
  /** The integration knows nothing about batteries; this is the user's mapping. */
  battery_entity?: string;
}

export const ZONE_CARD_CHART_DAYS = [30, 90, 365] as const;

/**
 * Whether a block renders.
 *
 * **One definition of "unset means on"**, used by both the card and its
 * editor. Two copies of this rule would eventually disagree, and the way it
 * would show is an editor whose checkbox says one thing while the card does
 * another.
 */
export function zoneBlockEnabled(config: ZoneCardConfig, block: ZoneCardBlock): boolean {
  return config.blocks?.[block] !== false;
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
      action: "save-curve";
      zoneId: string;
      cycleId: string;
      points: [number, number][];
      min: number;
      max: number;
      /** Absent when the kind selector wasn't offered — the service must
       *  keep the program's current kind, not have one asserted over it. */
      kind?: "duration" | "volume";
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
