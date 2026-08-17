import { describe, it, expect } from "vitest";
import { HUB_CARD_BLOCKS, hubBlockEnabled } from "./types";
import type { HubCardConfig } from "./types";

const BASE: HubCardConfig = { type: "custom:irrigation-maestro-hub-card" };

describe("hubBlockEnabled", () => {
  it("treats an unset key as on, the same policy the zone card settled", () => {
    for (const block of HUB_CARD_BLOCKS) {
      expect(hubBlockEnabled(BASE, block)).toBe(true);
    }
  });

  it("turns a block off only for an explicit false", () => {
    const config: HubCardConfig = { ...BASE, blocks: { health: false } };

    expect(hubBlockEnabled(config, "health")).toBe(false);
    expect(hubBlockEnabled(config, "decision")).toBe(true);
    expect(hubBlockEnabled({ ...BASE, blocks: { health: true } }, "health")).toBe(true);
  });
});

/** Mirrors `hub-card-editor.ts`'s `_setBlock`; the rule is what round-trips. */
function setBlock(
  config: HubCardConfig,
  block: (typeof HUB_CARD_BLOCKS)[number],
  enabled: boolean,
): HubCardConfig {
  const blocks = { ...(config.blocks ?? {}) };
  if (enabled) delete blocks[block];
  else blocks[block] = false;
  const next: HubCardConfig = { ...config };
  if (Object.keys(blocks).length > 0) next.blocks = blocks;
  else delete next.blocks;
  return next;
}

describe("hub config round-trip", () => {
  it("returns to the original config when a block is toggled twice", () => {
    const off = setBlock(BASE, "health", false);
    expect(setBlock(off, "health", true)).toEqual(BASE);
  });

  it("adds exactly one key when a block is turned off", () => {
    expect(Object.keys(setBlock(BASE, "session", false)).sort()).toEqual(["blocks", "type"]);
  });

  it("keeps other disabled blocks when one is re-enabled", () => {
    let config = setBlock(BASE, "health", false);
    config = setBlock(config, "session", false);
    config = setBlock(config, "health", true);

    expect(config.blocks).toEqual({ session: false });
  });
});

/**
 * The decision verdict, which shipped in 3.8.0 reading an attribute no entity
 * publishes — so the most prominent line on the card said "it would water" in
 * every state, including the ones where the engine had decided to skip.
 *
 * The fix is one identifier. The test is the point: it asserts the SOURCE, not
 * just the rendering, because the rendering was never wrong — it was faithfully
 * displaying `undefined`.
 */
describe("where the hub card reads its decision from", () => {
  it("reads skip_reason from the evaluation sensor, not from the session sensor", async () => {
    const source = (await import("./hub-card?raw")).default;

    expect(source).toContain('hub.waterBudget?.attributes["skip_reason"]');
    expect(source).not.toContain('hub.session?.attributes["skip_reason"]');
  });

  it("reads the session sensor only for things the session sensor publishes", async () => {
    // queue / started_at / active_zone_id are its whole contract. Anything else
    // read from it is the same mistake in a different attribute.
    const source = (await import("./hub-card?raw")).default;
    const published = new Set(["queue", "started_at", "active_zone_id"]);
    const read = [...source.matchAll(/session\?\.attributes\["([^"]+)"\]/g)].map((m) => m[1]!);

    expect(read.filter((name) => !published.has(name))).toEqual([]);
  });
});
