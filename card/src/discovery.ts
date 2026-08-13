import type { CycleInfo, HassEntity, HomeAssistant } from "./types";
import { asArray, asNumber, asString } from "./types";

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

export interface ZoneBundle {
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
    const dm = c["day_minutes"];
    if (dm && typeof dm === "object") {
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(dm as Record<string, unknown>)) {
        const n = asNumber(v);
        if (n !== undefined) map[k] = n;
      }
      info.day_minutes = map;
    }
    info.amount = asNumber(c["amount"]);
    info.heat = asNumber(c["heat"]);
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
