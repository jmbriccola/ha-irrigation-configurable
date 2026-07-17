import type { HassEntity, HomeAssistant } from "./types";
import { asNumber, asString } from "./types";

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
