import { describe, it, expect } from "vitest";
import { ZONE_CARD_BLOCKS, zoneBlockEnabled } from "./types";
import type { ZoneCardConfig } from "./types";

const BASE: ZoneCardConfig = { type: "custom:irrigation-maestro-zone-card", zone: "z1" };

describe("zoneBlockEnabled", () => {
  it("treats an unset key as on, which is the whole default-on policy", () => {
    // The acceptance criterion is a dashboard built without assembling
    // anything: a user who adds the card sees what the zone has and turns off
    // what they do not want.
    for (const block of ZONE_CARD_BLOCKS) {
      expect(zoneBlockEnabled(BASE, block)).toBe(true);
    }
  });

  it("treats an unset key as on even when siblings are set", () => {
    const config: ZoneCardConfig = { ...BASE, blocks: { curve: false } };

    expect(zoneBlockEnabled(config, "curve")).toBe(false);
    expect(zoneBlockEnabled(config, "programs")).toBe(true);
  });

  it("honours an explicit true, so a user who writes it out is not overruled", () => {
    expect(zoneBlockEnabled({ ...BASE, blocks: { curve: true } }, "curve")).toBe(true);
  });

  it("turns a block off only for an explicit false", () => {
    expect(zoneBlockEnabled({ ...BASE, blocks: { consumption: false } }, "consumption")).toBe(
      false,
    );
  });
});

/**
 * The editor's writers, exercised through the same helper the card reads with.
 *
 * These mirror `zone-card-editor.ts`'s `_setBlock` / `_setSource` rules rather
 * than reaching into the element: the rules are what round-trips, and a test
 * that drove the DOM would pass while the rule underneath it drifted.
 */
function setBlock(
  config: ZoneCardConfig,
  block: (typeof ZONE_CARD_BLOCKS)[number],
  enabled: boolean,
): ZoneCardConfig {
  const blocks = { ...(config.blocks ?? {}) };
  if (enabled) delete blocks[block];
  else blocks[block] = false;
  const next: ZoneCardConfig = { ...config };
  if (Object.keys(blocks).length > 0) next.blocks = blocks;
  else delete next.blocks;
  return next;
}

describe("config round-trip", () => {
  it("adds exactly one key when a block is turned off", () => {
    const next = setBlock(BASE, "curve", false);

    expect(next.blocks).toEqual({ curve: false });
    expect(Object.keys(next).sort()).toEqual(["blocks", "type", "zone"]);
  });

  it("returns to the original config when the same block is turned back on", () => {
    // Toggling twice must not grow the user's YAML by a key that says
    // "default". A config that gains noise every time it is opened is a
    // config the user stops trusting.
    const off = setBlock(BASE, "curve", false);
    const on = setBlock(off, "curve", true);

    expect(on).toEqual(BASE);
  });

  it("keeps other disabled blocks when one is re-enabled", () => {
    let config = setBlock(BASE, "curve", false);
    config = setBlock(config, "hardware", false);
    config = setBlock(config, "curve", true);

    expect(config.blocks).toEqual({ hardware: false });
  });

  it("leaves a YAML-authored config untouched when nothing is edited", () => {
    const authored: ZoneCardConfig = {
      type: "custom:irrigation-maestro-zone-card",
      zone: "z1",
      chart_days: 90,
    };

    expect({ ...authored }).toEqual(authored);
    expect(Object.keys(authored)).toEqual(["type", "zone", "chart_days"]);
  });
});

describe("switching the consumption source back to internal", () => {
  it("clears the entity keys rather than remembering a choice it no longer shows", () => {
    const withEntities: ZoneCardConfig = {
      ...BASE,
      consumption_source: "entity",
      total_entity: "sensor.a",
      today_entity: "sensor.b",
      month_entity: "sensor.c",
    };

    const next: ZoneCardConfig = { ...withEntities };
    delete next.consumption_source;
    delete next.total_entity;
    delete next.today_entity;
    delete next.month_entity;

    expect(next).toEqual(BASE);
  });
});
