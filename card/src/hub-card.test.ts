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
