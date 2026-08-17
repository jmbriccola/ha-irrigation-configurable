import { describe, it, expect } from "vitest";
import zoneCardSource from "./zone-card?raw";
import hubCardSource from "./hub-card?raw";
import { HUB_CARD_BLOCKS, ZONE_CARD_BLOCKS } from "./types";

/**
 * A block key that renders nothing, and a service with no consumer.
 *
 * `wiring.test.ts` (3.8.1) catches a property declared and not passed. It
 * cannot see one level up: **the curve block shipped in 3.7.0 as a checkbox
 * that did nothing.** It was in `ZONE_CARD_BLOCKS`, the editor listed it, the
 * shell never drew it, and every test passed — for two releases, on the brief's
 * own diagnostic #1.
 *
 * The same blindness let `get_run_history` sit unused for three releases: built,
 * specced, tested, documented, released, and called by nothing. Invisible work
 * is worse than absent work, because it looks finished.
 *
 * This check is static and free. Its sibling -- every response service reaches a
 * surface -- lives in the Python suite (`test_services_yaml.py`), because it
 * has to read `services.yaml` and the card sources together, and reading files
 * is free there and costs a Node type dependency here.
 */

const SHELLS: [name: string, source: string, blocks: readonly string[]][] = [
  ["zone-card", zoneCardSource, ZONE_CARD_BLOCKS],
  ["hub-card", hubCardSource, HUB_CARD_BLOCKS],
];

describe.each(SHELLS)("%s renders every block it offers", (name, source, blocks) => {
  it("has a render branch for each key", () => {
    const guard = name === "zone-card" ? "zoneBlockEnabled" : "hubBlockEnabled";
    const unrendered = blocks.filter(
      (block) => !source.includes(`${guard}(config, "${block}")\n          ? `),
    );

    expect(
      unrendered,
      `${name} offers ${unrendered.join(", ")} in its config and editor but draws nothing for ${
        unrendered.length === 1 ? "it" : "them"
      }`,
    ).toEqual([]);
  });

  it("offers at least one block, so an empty list is not mistaken for success", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });
});
