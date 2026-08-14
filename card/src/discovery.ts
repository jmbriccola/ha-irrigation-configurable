import type { CycleInfo, HassEntity, HomeAssistant, WaterSummary } from "./types";
import { asArray, asNumber, asString, isUnavailable } from "./types";

/**
 * Attribute-based entity discovery, per the card contract: iterate
 * hass.states, keep entities exposing a `maestro_role` attribute, and
 * group zone-scoped entities by their `zone_id` attribute.
 */

export interface HubBundle {
  waterBudget?: HassEntity;
  skipThreshold?: HassEntity;
  weightedTemp?: HassEntity;
  session?: HassEntity;
  consumptionLeft?: HassEntity;
  pauseSwitch?: HassEntity;
  evaluateButton?: HassEntity;
  stopAllButton?: HassEntity;
}

/**
 * The slice of a zone's entities `waterSummary()` needs, keyed by role name
 * (not translated to a slot-style name like `ZoneBundle`'s other fields) so
 * the helper's own tests can pass bare literals shaped like the card
 * contract, without constructing a full `ZoneBundle`. `ZoneBundle` below
 * extends this, so every real zone bundle satisfies it too.
 */
export interface ZoneEntities {
  zone_water_total?: HassEntity;
}

export interface ZoneBundle extends ZoneEntities {
  zoneId: string;
  name: string;
  order: number;
  state?: HassEntity;
  nextRun?: HassEntity;
  lastOutcome?: HassEntity;
  enabledSwitch?: HassEntity;
  orderNumber?: HassEntity;
  suspendUntil?: HassEntity;
  cycleSwitches: HassEntity[];
}

export interface MaestroModel {
  /** True when at least one maestro entity exists. */
  found: boolean;
  hub: HubBundle;
  /** Zones sorted by their `order` attribute. */
  zones: ZoneBundle[];
  /** All entity ids taking part in the model (for change detection). */
  entityIds: string[];
}

// hub_unattributed_water (docs/design/card-contract.md) is a registered
// role -- see types.ts's HubRole -- but has no card consumer yet, so it is
// deliberately absent here, same as zone_interval/zone_adjustment below:
// unmapped roles still count as discovery hits, they just have nowhere to
// land on the bundle until something reads them.
const HUB_ROLE_TO_SLOT: Record<string, keyof HubBundle> = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton",
};

const ZONE_ROLE_TO_SLOT: Record<
  string,
  Exclude<keyof ZoneBundle, "zoneId" | "name" | "order" | "cycleSwitches">
> = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil",
};

export function discover(hass: HomeAssistant): MaestroModel {
  const hub: HubBundle = {};
  const zoneMap = new Map<string, ZoneBundle>();
  const entityIds: string[] = [];

  for (const entity of Object.values(hass.states)) {
    const role = asString(entity.attributes["maestro_role"]);
    if (!role) continue;
    entityIds.push(entity.entity_id);

    const zoneId = asString(entity.attributes["zone_id"]);
    if (zoneId) {
      let zone = zoneMap.get(zoneId);
      if (!zone) {
        zone = {
          zoneId,
          name: zoneId,
          order: Number.MAX_SAFE_INTEGER,
          cycleSwitches: [],
        };
        zoneMap.set(zoneId, zone);
      }
      if (role === "cycle_enabled") {
        zone.cycleSwitches.push(entity);
      } else {
        const slot = ZONE_ROLE_TO_SLOT[role];
        if (slot) zone[slot] = entity;
        // zone_interval / zone_adjustment exist in the contract but the
        // card does not surface them; they still count as discovery hits.
      }
    } else {
      const slot = HUB_ROLE_TO_SLOT[role];
      if (slot) hub[slot] = entity;
    }
  }

  const zones = [...zoneMap.values()];
  for (const zone of zones) {
    const attrs = zone.state?.attributes ?? {};
    zone.name =
      asString(attrs["zone_name"]) ??
      asString(zone.state?.attributes["friendly_name"]) ??
      zone.zoneId;
    zone.order =
      asNumber(attrs["order"]) ??
      asNumber(zone.orderNumber?.state) ??
      Number.MAX_SAFE_INTEGER;
  }
  zones.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );

  return { found: entityIds.length > 0, hub, zones, entityIds };
}

/** A zone can measure litres when its `degraded` list does NOT report
 *  `no_flow_meter` (docs/design/card-contract.md) — gates the curve
 *  editor's volume option, mirroring the backend's own `volume_requires_flow`
 *  guard on `set_curve`.
 *
 *  Fails CLOSED when the zone's state entity is unavailable/unknown/absent:
 *  an unavailable entity's attributes are empty, so `degraded` reads as `[]`
 *  — indistinguishable, by absence alone, from "checked and found nothing
 *  degraded". Reading that as "has a flow meter" would offer the volume
 *  option on a zone the card knows nothing about, which `set_curve`'s own
 *  `volume_requires_flow` guard would then refuse. "No data" must not read
 *  as "capable". */
export function zoneHasFlowMeter(zone: ZoneBundle): boolean {
  if (isUnavailable(zone.state)) return false;
  const degraded = asArray(zone.state?.attributes?.["degraded"]);
  return !degraded.some((item) => asString(item) === "no_flow_meter");
}

/** The zone's water figures, or null when there is nothing trustworthy to
 *  show (docs/design/card-contract.md's `zone_water_total` role).
 *
 *  An unavailable sensor yields null rather than zero: zero would claim no
 *  water passed, which is a different statement from "we do not know" --
 *  the same distinction the ledger this figure comes from is built on.
 */
export function waterSummary(zone: ZoneEntities): WaterSummary | null {
  const entity = zone.zone_water_total;
  if (!entity) return null;
  const total = asNumber(entity.state);
  if (total === undefined) return null;
  return {
    total,
    today: asNumber(entity.attributes["today_l"]) ?? 0,
    month: asNumber(entity.attributes["month_l"]) ?? 0,
    estimated: Boolean(entity.attributes["estimated"]),
  };
}

/**
 * The zone's `adjustment_pct` (docs/design/card-contract.md) — the factor
 * the engine multiplies into every program's curve alongside its own
 * intensity (`engine/planner.py`: `zone.adjustment_pct * factor / 100.0`).
 * Delivery previews (schedule-math.ts's `previewMinutes`/`dayDelivery`, the
 * curve editor's today banner and preview tiles) fold this in; the minutes
 * SETTING (`dayBase`) deliberately does not — see the split documented
 * there. Absent (an older sensor, or a zone read before its first refresh)
 * reads as 100, the engine's own default.
 */
export function zoneAdjustmentPct(zone: ZoneBundle): number {
  return asNumber(zone.state?.attributes?.["adjustment_pct"]) ?? 100;
}

/** A `copy_curve` source option: `value` is what a `<select>` carries,
 *  `zoneId`/`programId` are the same pair split back out for the event
 *  detail, and `label` is "<zone name> / <program name>". */
export interface CopyCandidate {
  value: string;
  zoneId: string;
  programId: string;
  label: string;
}

/**
 * Every program across every zone, offered as a `copy_curve` source for the
 * program currently open in the editor — the same "<zone name> / <program
 * name>" shape `_copy_candidates()` built in the config flow before that
 * flow was removed (docs/design/architecture.md). Two things are left out:
 *
 * - the program being edited itself (`excludeZoneId`/`excludeProgramId`) —
 *   copying a curve onto itself is a no-op, not a real choice;
 * - a volume-kind curve when `destinationHasFlowMeter` is false — offering
 *   it would just walk the user into `copy_curve`'s own `volume_requires_flow`
 *   refusal, and every candidate's curve kind is already sitting in the
 *   `zones` bundles the panel loaded, so there is no reason not to filter.
 */
export function buildCopyCandidates(
  zones: ZoneBundle[],
  excludeZoneId: string,
  excludeProgramId: string,
  destinationHasFlowMeter: boolean,
): CopyCandidate[] {
  const candidates: CopyCandidate[] = [];
  for (const zone of zones) {
    for (const cycle of readCycles(zone)) {
      if (!cycle.cycle_id) continue;
      if (zone.zoneId === excludeZoneId && cycle.cycle_id === excludeProgramId) continue;
      if (!destinationHasFlowMeter && cycle.curve?.kind === "volume") continue;
      candidates.push({
        value: `${zone.zoneId}:${cycle.cycle_id}`,
        zoneId: zone.zoneId,
        programId: cycle.cycle_id,
        label: `${zone.name} / ${cycle.name ?? cycle.cycle_id}`,
      });
    }
  }
  return candidates;
}

/** Read a zone's programs (cycles) from its state entity attribute, typed. */
export function readCycles(zone: ZoneBundle): CycleInfo[] {
  const raw = asArray(zone.state?.attributes?.["cycles"]);
  const out: CycleInfo[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const c = item as Record<string, unknown>;
    const info: CycleInfo = {
      cycle_id: asString(c["cycle_id"]),
      name: asString(c["name"]),
      enabled: typeof c["enabled"] === "boolean" ? (c["enabled"] as boolean) : undefined,
      trigger: (c["trigger"] as CycleInfo["trigger"]) ?? undefined,
      curve: (c["curve"] as CycleInfo["curve"]) ?? undefined,
    };
    // The read-back path must track what sensor._cycle_dict publishes. It
    // drifted once — `days` was replaced by `calendar` in 2.0.0 and this was
    // not updated, so every program displayed as "every day" no matter what
    // was stored, and a saved change looked ignored.
    const calendar = c["calendar"];
    if (calendar && typeof calendar === "object") {
      info.calendar = calendar as CycleInfo["calendar"];
    }
    const season = c["season_months"];
    if (Array.isArray(season)) {
      info.season_months = season
        .map((m) => asNumber(m))
        .filter((m): m is number => m !== undefined);
    }
    info.soak_max_run_min = asNumber(c["soak_max_run_min"]);
    info.soak_pause_min = asNumber(c["soak_pause_min"]);
    info.volume_safety_timeout_min = asNumber(c["volume_safety_timeout_min"]);
    info.intensity_pct = asNumber(c["intensity_pct"]);
    const di = c["day_intensity_pct"];
    if (di && typeof di === "object") {
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(di as Record<string, unknown>)) {
        const n = asNumber(v);
        if (n !== undefined) map[k] = n;
      }
      info.day_intensity_pct = map;
    }
    out.push(info);
  }
  return out;
}
