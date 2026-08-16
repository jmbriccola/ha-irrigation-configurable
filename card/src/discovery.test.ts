import { describe, it, expect } from "vitest";
import {
  buildCopyCandidates,
  capabilityBadges,
  discover,
  hubLeakStatus,
  leakStatus,
  readCycles,
  waterSummary,
  zoneAdjustmentPct,
  zoneHasFlowMeter,
} from "./discovery";
import type { ZoneBundle } from "./discovery";
import type { HomeAssistant } from "./types";

function zoneWithCycles(cycles: unknown): ZoneBundle {
  return {
    zoneId: "z1", name: "Prato", order: 1, cycleSwitches: [],
    state: { entity_id: "sensor.z1", state: "idle", attributes: { cycles } },
  };
}

describe("readCycles", () => {
  it("parses the schedule fields", () => {
    // `days` was replaced by `calendar` in 2.0.0. This test used to assert the
    // old key and kept passing, which is exactly why the read path drifting
    // out of sync with the sensor went unnoticed.
    const cycles = readCycles(zoneWithCycles([
      { cycle_id: "a1", name: "Mattina", enabled: true,
        trigger: { kind: "time", at: "06:30" },
        curve: { points: [[12, 0], [25, 15], [35, 23]], min: 1, max: 60, kind: "duration" },
        calendar: { mode: "weekdays", days: [0, 2, 4] },
        intensity_pct: 100, day_intensity_pct: { "0": 50, "4": 150 } },
    ]));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.calendar).toEqual({ mode: "weekdays", days: [0, 2, 4] });
    expect(cycles[0]?.intensity_pct).toBe(100);
    expect(cycles[0]?.day_intensity_pct).toEqual({ "0": 50, "4": 150 });
  });

  it("tolerates missing schedule fields (day-less program)", () => {
    const cycles = readCycles(zoneWithCycles([{ cycle_id: "a1", name: "X" }]));
    expect(cycles[0]?.calendar).toBeUndefined();
    expect(cycles[0]?.day_intensity_pct).toBeUndefined();
  });

  it("returns [] when there is no cycles attribute", () => {
    expect(readCycles({ zoneId: "z", name: "z", order: 1, cycleSwitches: [] })).toEqual([]);
  });
});

describe("readCycles: the panel's read-back path", () => {
  /**
   * Regression: the panel wrote the new fields correctly but never read them
   * back. `readCycles` still extracted the pre-2.0.0 `days` attribute and
   * ignored `calendar`, so the program list and the editor always showed
   * "every day" no matter what was stored — a saved change looked ignored.
   */
  const zoneWith = (cycle: Record<string, unknown>) =>
    ({ state: { attributes: { cycles: [cycle] } } }) as never;

  it("reads the calendar the sensor publishes", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "interval", interval_days: 3 } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "interval", interval_days: 3 });
  });

  it("reads a weekday calendar", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "weekdays", days: [0, 2, 4] } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "weekdays", days: [0, 2, 4] });
  });

  it("reads a parity calendar", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "parity", parity: "odd" } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "parity", parity: "odd" });
  });

  it("reads the season and the advanced fields", () => {
    const info = readCycles(
      zoneWith({
        cycle_id: "c1",
        season_months: [6, 7, 8],
        soak_max_run_min: 10,
        soak_pause_min: 15,
        volume_safety_timeout_min: 45,
      }),
    )[0];
    expect(info?.season_months).toEqual([6, 7, 8]);
    expect(info?.soak_max_run_min).toBe(10);
    expect(info?.soak_pause_min).toBe(15);
    expect(info?.volume_safety_timeout_min).toBe(45);
  });

  it("leaves the calendar undefined when the attribute is absent", () => {
    const info = readCycles(zoneWith({ cycle_id: "c1" }))[0];
    expect(info?.calendar).toBeUndefined();
  });
});

describe("zoneAdjustmentPct", () => {
  it("reads the sensor's published value", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Pots", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "idle", attributes: { adjustment_pct: 70 } },
    };
    expect(zoneAdjustmentPct(zone)).toBe(70);
  });

  it("reads an absent adjustment as 100, the engine's own default", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Pots", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "idle", attributes: {} },
    };
    expect(zoneAdjustmentPct(zone)).toBe(100);
    expect(zoneAdjustmentPct({ zoneId: "z2", name: "Herbs", order: 2, cycleSwitches: [] })).toBe(100);
  });
});

describe("zoneHasFlowMeter", () => {
  it("is true for an available zone reporting no degradation", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "idle", attributes: { degraded: [] } },
    };
    expect(zoneHasFlowMeter(zone)).toBe(true);
  });

  it("is false when the zone's degraded list reports no_flow_meter", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "idle", attributes: { degraded: ["no_flow_meter"] } },
    };
    expect(zoneHasFlowMeter(zone)).toBe(false);
  });

  /**
   * Regression: an unavailable entity's attributes are `{}`, so `degraded`
   * used to read as `[]` -- indistinguishable from "checked, nothing
   * degraded" -- and the zone was concluded to HAVE a flow meter, offering
   * a volume option the backend's `volume_requires_flow` guard would then
   * refuse. "No data" must fail CLOSED, not read as "capable".
   */
  it("is false when the zone's state entity is unavailable, even with an empty degraded list", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "unavailable", attributes: {} },
    };
    expect(zoneHasFlowMeter(zone)).toBe(false);
  });

  it("is false when the zone's state entity is unknown", () => {
    const zone: ZoneBundle = {
      zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [],
      state: { entity_id: "sensor.z1", state: "unknown", attributes: {} },
    };
    expect(zoneHasFlowMeter(zone)).toBe(false);
  });

  it("is false when the zone has no state entity at all", () => {
    const zone: ZoneBundle = { zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [] };
    expect(zoneHasFlowMeter(zone)).toBe(false);
  });
});

describe("buildCopyCandidates", () => {
  function zone(zoneId: string, name: string, cycles: unknown[]): ZoneBundle {
    return {
      zoneId,
      name,
      order: 1,
      cycleSwitches: [],
      state: { entity_id: `sensor.${zoneId}`, state: "idle", attributes: { cycles } },
    };
  }

  const lawn = zone("z1", "Lawn", [
    { cycle_id: "a1", name: "Morning", curve: { kind: "duration" } },
    { cycle_id: "a2", name: "Evening", curve: { kind: "volume" } },
  ]);
  const pots = zone("z2", "Pots", [{ cycle_id: "b1", name: "Drip", curve: { kind: "duration" } }]);

  it("labels every program as '<zone name> / <program name>'", () => {
    const candidates = buildCopyCandidates([lawn, pots], "none", "none", true);
    expect(candidates).toEqual([
      { value: "z1:a1", zoneId: "z1", programId: "a1", label: "Lawn / Morning" },
      { value: "z1:a2", zoneId: "z1", programId: "a2", label: "Lawn / Evening" },
      { value: "z2:b1", zoneId: "z2", programId: "b1", label: "Pots / Drip" },
    ]);
  });

  it("excludes only the program being edited, not the rest of its zone", () => {
    const candidates = buildCopyCandidates([lawn, pots], "z1", "a1", true);
    expect(candidates.map((c) => c.value)).toEqual(["z1:a2", "z2:b1"]);
  });

  it("drops volume-kind sources when the destination has no flow meter", () => {
    const candidates = buildCopyCandidates([lawn, pots], "none", "none", false);
    expect(candidates.map((c) => c.value)).toEqual(["z1:a1", "z2:b1"]);
  });

  it("keeps volume-kind sources when the destination has a flow meter", () => {
    const candidates = buildCopyCandidates([lawn, pots], "none", "none", true);
    expect(candidates.some((c) => c.value === "z1:a2")).toBe(true);
  });

  it("skips cycles without an id", () => {
    const noId = zone("z3", "Herbs", [{ name: "No id" }]);
    expect(buildCopyCandidates([noId], "none", "none", true)).toEqual([]);
  });

  it("returns [] with no zones", () => {
    expect(buildCopyCandidates([], "none", "none", true)).toEqual([]);
  });
});

describe("waterSummary", () => {
  it("returns null when the zone has no water sensor", () => {
    expect(waterSummary({ zone_water_total: undefined } as never)).toBeNull();
  });

  it("reports measured litres with today and month", () => {
    const summary = waterSummary({
      zone_water_total: {
        entity_id: "sensor.a_water",
        state: "1284.6",
        attributes: {
          maestro_role: "zone_water_total",
          estimated: false,
          source: "measured",
          today_l: 41.2,
          month_l: 612.5,
        },
      },
    } as never);
    expect(summary).toEqual({
      total: 1284.6,
      today: 41.2,
      month: 612.5,
      estimated: false,
    });
  });

  it("marks an estimated zone so the row can badge it", () => {
    const summary = waterSummary({
      zone_water_total: {
        entity_id: "sensor.a_water",
        state: "300",
        attributes: {
          maestro_role: "zone_water_total",
          estimated: true,
          source: "nominal",
          today_l: 75,
          month_l: 300,
        },
      },
    } as never);
    expect(summary?.estimated).toBe(true);
  });

  it("treats an unavailable sensor as no summary rather than zero", () => {
    expect(
      waterSummary({
        zone_water_total: {
          entity_id: "sensor.a_water",
          state: "unavailable",
          attributes: { maestro_role: "zone_water_total" },
        },
      } as never),
    ).toBeNull();
  });
});

/**
 * A zone as `discover()` builds it. The `zone_state` role lands on the
 * `state` slot (see ZONE_ROLE_TO_SLOT), so a fixture keyed `zone_state`
 * would type-check through a cast and then read as an empty zone — the
 * helper would see nothing and the assertions would be about nothing.
 */
function zoneWith(
  attributes: Record<string, unknown>,
  leak?: { state: string; attributes?: Record<string, unknown> },
): ZoneBundle {
  return {
    zoneId: "z1",
    name: "Lawn",
    order: 1,
    cycleSwitches: [],
    state: { entity_id: "sensor.z1_state", state: "idle", attributes },
    ...(leak
      ? {
          leak: {
            entity_id: "binary_sensor.z1_leak",
            state: leak.state,
            attributes: { maestro_role: "zone_leak", ...(leak.attributes ?? {}) },
          },
        }
      : {}),
  };
}

const capabilities = (caps: Record<string, string>, degraded: string[] = []) => ({
  maestro_role: "zone_state",
  capabilities: caps,
  degraded,
});

describe("capabilityBadges", () => {
  it("badges nothing when everything is configured", () => {
    expect(
      capabilityBadges(
        zoneWith(
          capabilities({
            water_accounting: "measured",
            leak_detection: "configured",
            water_supply: "configured",
            leak_watch: "zone",
          }),
        ),
      ),
    ).toEqual([]);
  });

  it("declares an absent capability rather than staying silent", () => {
    const badges = capabilityBadges(
      zoneWith(
        capabilities({
          water_accounting: "estimated",
          leak_detection: "unavailable",
          water_supply: "unavailable",
          leak_watch: "none",
        }),
      ),
    );
    expect(badges.map((badge) => badge.key)).toEqual([
      "water_estimated",
      "leak_unavailable",
      "supply_unavailable",
    ]);
    expect(badges.every((badge) => badge.tone === "muted")).toBe(true);
  });

  /**
   * The user's own installation: three metered zones, not one leak sensor.
   * Source 2 watches all three, and `leak_detection` says "unavailable" for
   * all three because it is about the valve's SENSOR. A badge reading "No
   * leak sensor" there is true and leaves the user believing nothing is
   * watching — worse than a false statement, because there is nothing to
   * catch by reading it.
   */
  it("says nothing about a missing sensor on a zone its own meter watches", () => {
    expect(
      capabilityBadges(
        zoneWith(
          capabilities({
            water_accounting: "measured",
            leak_detection: "unavailable",
            water_supply: "configured",
            leak_watch: "zone",
          }),
        ),
      ),
    ).toEqual([]);
  });

  it("says where a shared-line-meter zone is watched instead of calling it uncovered", () => {
    // Its own scope has no source and its own alarm can never fire, but the
    // water IS measured and a leak in it raises `hub_leak`. "Not watched"
    // would be false; saying nothing would leave the sensor-less zone
    // looking identical to an unwatched one.
    expect(
      capabilityBadges(
        zoneWith(
          capabilities({
            water_accounting: "measured",
            leak_detection: "unavailable",
            water_supply: "configured",
            leak_watch: "system",
          }),
        ),
      ),
    ).toEqual([{ key: "leak_system_scope", tone: "muted" }]);
  });

  it("still invites the sensor on a zone the meter already watches", () => {
    // A second, independent source is a real improvement even where source 2
    // is running, and an invitation costs the user nothing to ignore.
    expect(
      capabilityBadges(
        zoneWith(
          capabilities({
            water_accounting: "measured",
            leak_detection: "candidate_available",
            water_supply: "configured",
            leak_watch: "zone",
          }),
        ),
      ),
    ).toEqual([{ key: "leak_candidate", tone: "hint" }]);
  });

  it("invites configuration when the hardware could do it", () => {
    // Nothing watches this zone yet, so the invitation arrives beside the
    // declaration that it is unwatched: one names the state, the other the
    // remedy.
    const badges = capabilityBadges(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "candidate_available",
          water_supply: "configured",
          leak_watch: "none",
        }),
      ),
    );
    expect(badges).toEqual([
      { key: "leak_unavailable", tone: "muted" },
      { key: "leak_candidate", tone: "hint" },
    ]);
  });

  /**
   * The tone is the whole difference between "you are not protected" and
   * "you could be, with one click". Collapsing the two into one tone is the
   * single mutation this pair of cases exists to catch.
   */
  it("keeps the invitation apart from the declared absence", () => {
    const invited = capabilityBadges(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "candidate_available",
          water_supply: "candidate_available",
          leak_watch: "zone",
        }),
      ),
    );
    expect(invited).toEqual([
      { key: "leak_candidate", tone: "hint" },
      { key: "supply_candidate", tone: "hint" },
    ]);
  });

  it("says nothing about a zone whose state entity is unavailable", () => {
    // An unavailable entity publishes no attributes at all, so `capabilities`
    // reads as absent -- which is "we have not been told", not "declared
    // absent". Badging it would put a claim on screen nothing supports.
    const zone: ZoneBundle = {
      zoneId: "z1",
      name: "Lawn",
      order: 1,
      cycleSwitches: [],
      state: { entity_id: "sensor.z1_state", state: "unavailable", attributes: {} },
    };
    expect(capabilityBadges(zone)).toEqual([]);
    expect(capabilityBadges({ zoneId: "z1", name: "Lawn", order: 1, cycleSwitches: [] })).toEqual(
      [],
    );
  });

  it("leaves water_accounting: unavailable to the degraded badge that already explains it", () => {
    // `water_accounting` can only be "unavailable" when no meter is usable,
    // and that zone always carries `no_flow_meter` or `flow_unit_unknown` in
    // `degraded` (sensor.py's `_degraded`), which the row already renders. A
    // second chip saying the same thing is noise, not a declaration.
    expect(
      capabilityBadges(
        zoneWith(
          capabilities(
            {
              water_accounting: "unavailable",
              leak_detection: "configured",
              water_supply: "configured",
              leak_watch: "zone",
            },
            ["no_flow_meter"],
          ),
        ),
      ),
    ).toEqual([]);
  });
});

/**
 * The three states the row must keep apart, and the reason this helper is
 * not allowed to read coverage off the leak entity: Home Assistant publishes
 * NO attributes while an entity is unavailable, `maestro_role` included, so
 * `discover()`'s attribute walk cannot see one. "No leak entity" and "its
 * leak entity is unavailable" are the same observation.
 */
describe("leakStatus", () => {
  it("reads the alarm, its confirmation instant and its sources from the entity", () => {
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "configured",
          water_supply: "configured",
          leak_watch: "zone",
        }),
        {
          state: "on",
          attributes: {
            sources: ["no_flow_closed", "valve_sensor"],
            since: "2026-08-16T05:30:00+00:00",
            describing_source: "valve_sensor",
          },
        },
      ),
    );
    expect(status.coverage).toBe("alarm");
    // Named `confirmedAt`, not `since`: the contract's `since` is when the
    // alarm was CONFIRMED, never when the water began escaping.
    expect(status.confirmedAt).toBe("2026-08-16T05:30:00+00:00");
    expect(status.sources).toEqual(["no_flow_closed", "valve_sensor"]);
    expect(status.describingSource).toBe("valve_sensor");
  });

  it("reads the alarm from the entity even where the capability declares no sensor", () => {
    // A zone with no leak sensor still has source 2 -- water measured on its
    // own meter with every valve shut -- and `capabilities.leak_detection`
    // describes the SENSOR only. Gating the alarm on the capability would
    // hide a confirmed leak on every meter-only zone.
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "unavailable",
          water_supply: "unavailable",
          leak_watch: "zone",
        }),
        { state: "on", attributes: { sources: ["no_flow_closed"], since: null } },
      ),
    );
    expect(status.coverage).toBe("alarm");
    expect(status.confirmedAt).toBeUndefined();
    expect(status.sources).toEqual(["no_flow_closed"]);
  });

  it("reads `off` as watched-and-quiet", () => {
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "configured",
          water_supply: "configured",
          leak_watch: "zone",
        }),
        { state: "off", attributes: { sources: [], since: null } },
      ),
    );
    expect(status.coverage).toBe("quiet");
  });

  it("does NOT read a missing entity as quiet when a sensor is configured", () => {
    // The defect this whole helper exists to prevent. The entity is
    // unavailable (so absent from discovery) while the scope serves its
    // first confirmation window; rendering that as "no leak" throws away
    // every round the availability rule cost.
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "configured",
          water_supply: "configured",
          leak_watch: "zone",
        }),
      ),
    );
    expect(status.coverage).toBe("establishing");
  });

  it("defers to the zone's own explanation when it has one", () => {
    for (const stall of ["leak_never_observable", "leak_evidence_unresolved"]) {
      const status = leakStatus(
        zoneWith(
          capabilities(
            {
              water_accounting: "measured",
              leak_detection: "configured",
              water_supply: "configured",
              leak_watch: "zone",
            },
            [stall],
          ),
        ),
      );
      expect(status.coverage).toBe("unresolved");
    }
  });

  it("says nothing it cannot know for a zone nothing watches", () => {
    // No entity and no source anywhere: there is no window running, so
    // neither "still looking" nor "no leak" is true. The muted capability
    // badge declares that nothing watches it; this helper adds no second
    // claim on top.
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "unavailable",
          water_supply: "unavailable",
          leak_watch: "none",
        }),
      ),
    );
    expect(status.coverage).toBe("unknown");
    expect(status.sources).toEqual([]);
  });

  it("is still establishing for a metered zone that has no leak sensor", () => {
    // The gap this whole field closed. `leak_detection` says "unavailable"
    // -- there is no sensor -- while source 2 is mid-window on the zone's own
    // meter. Gating on the sensor would report "nothing known" about a zone
    // that is actively being watched.
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "unavailable",
          water_supply: "unavailable",
          leak_watch: "zone",
        }),
      ),
    );
    expect(status.coverage).toBe("establishing");
  });

  it("establishes nothing of its own for a zone the system scope watches", () => {
    // Its own alarm is unavailable for ever by design -- the hub's is the one
    // that can fire. Saying "still looking" would promise a zone-named
    // verdict that is never coming; where its water IS watched is the
    // capability badge's job.
    const status = leakStatus(
      zoneWith(
        capabilities({
          water_accounting: "measured",
          leak_detection: "unavailable",
          water_supply: "unavailable",
          leak_watch: "system",
        }),
      ),
    );
    expect(status.coverage).toBe("unknown");
  });
});

describe("discover: the leak roles reach a slot", () => {
  /**
   * The wire between the backend and everything above. An unmapped role is
   * still counted as a discovery hit, so it fails completely silently: the
   * alarm entity exists, the walk sees it, and no surface can read it.
   */
  it("puts zone_leak and hub_leak on their bundles", () => {
    const hass = {
      states: {
        "sensor.z1_state": {
          entity_id: "sensor.z1_state",
          state: "idle",
          attributes: { maestro_role: "zone_state", zone_id: "z1", zone_name: "Lawn" },
        },
        "binary_sensor.z1_leak": {
          entity_id: "binary_sensor.z1_leak",
          state: "on",
          attributes: { maestro_role: "zone_leak", zone_id: "z1", sources: ["valve_sensor"] },
        },
        "binary_sensor.hub_leak": {
          entity_id: "binary_sensor.hub_leak",
          state: "off",
          attributes: { maestro_role: "hub_leak" },
        },
      },
    } as unknown as HomeAssistant;

    const model = discover(hass);

    expect(model.zones[0]?.leak?.entity_id).toBe("binary_sensor.z1_leak");
    expect(model.hub.leak?.entity_id).toBe("binary_sensor.hub_leak");
    expect(leakStatus(model.zones[0]!).coverage).toBe("alarm");
    expect(hubLeakStatus(model.hub).coverage).toBe("quiet");
  });
});

describe("hubLeakStatus", () => {
  it("reports the system alarm the hub scope raises", () => {
    const status = hubLeakStatus({
      leak: {
        entity_id: "binary_sensor.hub_leak",
        state: "on",
        attributes: {
          maestro_role: "hub_leak",
          sources: ["no_flow_closed"],
          since: "2026-08-16T04:00:00+00:00",
          describing_source: "no_flow_closed",
        },
      },
    });
    expect(status.coverage).toBe("alarm");
    expect(status.confirmedAt).toBe("2026-08-16T04:00:00+00:00");
    expect(status.describingSource).toBe("no_flow_closed");
  });

  it("has nothing to say when the hub entity is unavailable", () => {
    // The hub has no `zone_state` and therefore no `degraded`, so a hub scope
    // that can never conclude is explained nowhere. Silence is the honest
    // rendering; what must not happen is a chip claiming the system is fine.
    expect(hubLeakStatus({}).coverage).toBe("unknown");
    expect(
      hubLeakStatus({
        leak: {
          entity_id: "binary_sensor.hub_leak",
          state: "off",
          attributes: { maestro_role: "hub_leak" },
        },
      }).coverage,
    ).toBe("quiet");
  });
});
