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
  /** `hub_leak`. Absent whenever the entity is unavailable — see `leakStatus`. */
  leak?: HassEntity;
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
  /** `zone_leak`. Absent whenever the entity is unavailable — see `leakStatus`. */
  leak?: HassEntity;
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
  hub_leak: "leak",
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
  zone_leak: "leak",
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

/** What a capability badge is saying, which decides how it is drawn.
 *  `muted` states a declared absence — this is not covered, and the user
 *  should know rather than assume they are protected. `hint` is an
 *  invitation — the hardware could do it and has not been told to — and must
 *  never be drawn as a warning (docs/design/card-contract.md). */
export type BadgeTone = "muted" | "hint";

/**
 * Every badge this helper can emit. A closed union rather than `string` so
 * that the renderer's label/icon map is a total `Record` over it: adding a
 * badge here without giving it a label is then a compile error naming the
 * missing key, instead of a chip that silently never appears.
 */
export const CAPABILITY_BADGE_KEYS = [
  "water_estimated",
  "leak_unavailable",
  "leak_system_scope",
  "leak_candidate",
  "supply_unavailable",
  "supply_candidate",
] as const;
export type CapabilityBadgeKey = (typeof CAPABILITY_BADGE_KEYS)[number];

export interface CapabilityBadge {
  key: CapabilityBadgeKey;
  tone: BadgeTone;
}

/**
 * `zone_state.capabilities`, or `{}` when the zone has told us nothing.
 *
 * There is deliberately no `isUnavailable(zone.state)` guard here, unlike in
 * `zoneHasFlowMeter` above: an unavailable entity publishes no attributes at
 * all, so this already answers `{}` for one, and both readers below turn `{}`
 * into silence rather than into a claim. A guard would be a term with no
 * observable effect — which on this branch is worse than none, because
 * nothing could ever prove it still worked.
 */
function zoneCapabilities(zone: ZoneBundle): Record<string, unknown> {
  const raw = zone.state?.attributes?.["capabilities"];
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/**
 * What this zone plainly cannot do, and what it could do if asked — from
 * `zone_state.capabilities` (docs/design/card-contract.md).
 *
 * A pure helper rather than logic inside `zone-row.ts`, which has no test
 * harness of its own: the difference between a declared absence and an
 * invitation is the whole point of the capability model, and it needs to be
 * pinned by tests rather than by a reviewer reading a template.
 *
 * Three deliberate silences:
 *
 * - **A zone whose state entity is unavailable** publishes no attributes at
 *   all, so `capabilities` is simply missing. That is "we have not been
 *   told", not "declared absent", and badging it would put on screen a claim
 *   nothing supports — the same fail-closed reasoning `zoneHasFlowMeter`
 *   above is built on.
 * - **`water_accounting: "unavailable"`** is left to the `degraded` badges.
 *   It can only arise when no meter is usable, and such a zone always
 *   carries `no_flow_meter` or `flow_unit_unknown` in `degraded` (sensor.py's
 *   `_degraded` derives both from the same `zone_flow_meter_usable` call), so
 *   a second chip would restate what the row already shows.
 * - **A configured capability** says nothing at all: it is the normal state,
 *   and the card contract asks for it to read as active, not as a notice.
 *
 * **The leak badges are driven by `leak_watch`, not by `leak_detection`.**
 * The latter is about the valve's own leak SENSOR and knows nothing about
 * flow, so an installation of metered zones and no sensors reads
 * `"unavailable"` on every zone while source 2 watches all of them. Badging
 * that as "no leak sensor" is *true*, and it leaves the user believing
 * nothing is watching — which is worse than a false statement, because there
 * is nothing to catch by reading it. `leak_watch` answers the question the
 * badge is actually asking, from the same predicate the entity's own
 * availability uses, so the two cannot disagree.
 *
 * The candidate invitation is NOT suppressed on a watched zone: a second,
 * independent source is a real improvement, and an invitation costs nothing
 * to ignore. On an unwatched zone it arrives beside the declaration — one
 * names the state, the other the remedy.
 */
export function capabilityBadges(zone: ZoneBundle): CapabilityBadge[] {
  const caps = zoneCapabilities(zone);
  const badges: CapabilityBadge[] = [];
  if (asString(caps["water_accounting"]) === "estimated") {
    badges.push({ key: "water_estimated", tone: "muted" });
  }

  // Where this zone's leaks are watched. Absent (an older sensor, or a zone
  // whose state entity is unavailable) says nothing at all rather than
  // guessing in either direction.
  const watch = asString(caps["leak_watch"]);
  if (watch === "none") badges.push({ key: "leak_unavailable", tone: "muted" });
  else if (watch === "system") badges.push({ key: "leak_system_scope", tone: "muted" });
  if (asString(caps["leak_detection"]) === "candidate_available") {
    badges.push({ key: "leak_candidate", tone: "hint" });
  }

  // The water supply has no second source, so its own capability IS its
  // coverage and the older shape still holds here.
  const supply = asString(caps["water_supply"]);
  if (supply === "unavailable") badges.push({ key: "supply_unavailable", tone: "muted" });
  else if (supply === "candidate_available") {
    badges.push({ key: "supply_candidate", tone: "hint" });
  }
  return badges;
}

/**
 * What a leak scope has established, in the five states a surface has to
 * keep apart (docs/design/card-contract.md, "Leak entities").
 *
 * - `alarm` — the entity reads `on`: a leak is confirmed on this scope.
 * - `quiet` — the entity reads `off`: for one confirmation window the scope
 *   was in a position to see a leak and saw none. NOT a promise about the
 *   seconds since.
 * - `unresolved` — no entity, and the zone says why in `degraded`. Render
 *   the zone's own explanation; do not add a vaguer one on top.
 * - `establishing` — no entity, the zone has a source on its OWN scope
 *   (`leak_watch: "zone"`, which a meter satisfies just as a leak sensor
 *   does), and no stall is declared: the scope is serving its confirmation
 *   window. Gating this on the sensor instead is the mistake the long comment
 *   on `leakStatus` below exists to prevent.
 * - `unknown` — no entity and nothing that could tell us either way.
 */
export type LeakCoverage = "alarm" | "quiet" | "unresolved" | "establishing" | "unknown";

export interface LeakStatus {
  coverage: LeakCoverage;
  /** When the alarm was **confirmed** — the contract's `since`. Named for
   *  what it is: a source withdrawing and returning yields a fresh one, and
   *  no surface may present it as when the water started escaping. */
  confirmedAt?: string;
  /** Raw contract source keys (`valve_sensor`, `no_flow_closed`), as the
   *  entity sorted them. Unlocalised — translate via `leak_source.<key>`. */
  sources: string[];
  /** The source a description should cite, when the alarm names one. */
  describingSource?: string;
}

/** The stall keys `zone_state.degraded` uses to explain a silent entity. */
const LEAK_STALL_KEYS = ["leak_never_observable", "leak_evidence_unresolved"];

/** The alarm itself, read from the entity and from nowhere else. */
function leakAlarm(entity: HassEntity | undefined): LeakStatus | null {
  if (!entity || entity.state !== "on") return null;
  return {
    coverage: "alarm",
    confirmedAt: asString(entity.attributes["since"]),
    sources: asArray(entity.attributes["sources"])
      .map((item) => asString(item))
      .filter((item): item is string => item !== undefined),
    describingSource: asString(entity.attributes["describing_source"]),
  };
}

/**
 * One zone's leak coverage.
 *
 * The entity answers the alarm and only the alarm. Coverage is read from
 * `zone_state.capabilities.leak_detection` because **an unavailable entity
 * publishes no attributes at all**, `maestro_role` included — so
 * `discover()`'s attribute walk cannot see one, and "this zone has no leak
 * entity" and "its leak entity is unavailable" are the same observation. A
 * helper that concluded "no leak" from a missing entity would publish
 * exactly the silence the availability rule exists to withhold.
 *
 * `establishing` is gated on `leak_watch === "zone"`, not on
 * `leak_detection === "configured"`. The two differ on exactly the zones
 * this feature is for: a metered zone with no leak sensor has a source on
 * its own scope and IS serving a confirmation window, while
 * `leak_detection` reads `"unavailable"` for it. Gating on the sensor would
 * report "nothing known" about a zone that is mid-window — and `leak_watch`
 * is `leak_sources_configured` itself, the same predicate the entity's
 * availability is gated on, so the badge and the entity move together.
 *
 * `unknown` covers `leak_watch: "system"` too: that zone's OWN alarm is
 * unavailable for ever by design, so it has nothing to establish. Where its
 * water is watched is the capability badge's job, not this one's.
 */
export function leakStatus(zone: ZoneBundle): LeakStatus {
  const alarm = leakAlarm(zone.leak);
  if (alarm) return alarm;
  if (zone.leak?.state === "off") return { coverage: "quiet", sources: [] };
  const degraded = asArray(zone.state?.attributes?.["degraded"]).map((item) => asString(item));
  if (LEAK_STALL_KEYS.some((key) => degraded.includes(key))) {
    return { coverage: "unresolved", sources: [] };
  }
  if (asString(zoneCapabilities(zone)["leak_watch"]) === "zone") {
    return { coverage: "establishing", sources: [] };
  }
  return { coverage: "unknown", sources: [] };
}

/**
 * The hub scope's leak alarm — water measured on a meter serving more than
 * one zone (or none), where which zone leaks is unanswerable but whether the
 * system leaks is not.
 *
 * Only three states are reachable here: the hub has no `zone_state` and
 * therefore no `degraded`, so a hub scope that can never conclude is
 * explained nowhere at all (the contract says so in as many words). `unknown`
 * is rendered as silence — what a card must not do is present it as healthy.
 */
export function hubLeakStatus(hub: HubBundle): LeakStatus {
  const alarm = leakAlarm(hub.leak);
  if (alarm) return alarm;
  return { coverage: hub.leak?.state === "off" ? "quiet" : "unknown", sources: [] };
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
  // `?? 0` here is not the zero-vs-null slip this helper otherwise avoids:
  // unlike `state`, today_l/month_l have no "unavailable" case of their own
  // to lose -- the contract guarantees the sensor always publishes both
  // alongside a valid total (docs/design/card-contract.md), so the only way
  // to reach this line with a missing attribute is an older/malformed
  // sensor, not a legitimate "we don't know".
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
