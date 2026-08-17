import { describe, it, expect } from "vitest";
import zoneCardSource from "./zone-card?raw";
import hubCardSource from "./hub-card?raw";
import nextRunBlockSource from "./blocks/next-run-block?raw";
import programsBlockSource from "./blocks/programs-block?raw";
import hardwareBlockSource from "./blocks/hardware-block?raw";
import consumptionBlockSource from "./blocks/consumption-block?raw";
import decisionBlockSource from "./blocks/decision-block?raw";
import healthBlockSource from "./blocks/health-block?raw";

/**
 * Every input a block declares must actually be handed to it.
 *
 * This test exists because two defects shipped in the same shape and neither
 * was catchable by anything already here. `hardware-block.meterUnit` was
 * declared, used in its render, and never passed — so the flow meter's unit,
 * which the brief lists as a diagnostic in its own right, was dead code. The
 * card suite could not see it because **every other card test is on a pure
 * helper**: `weightRows`, `todayVerdict`, `chartBars`, `meterGeometry`. None of
 * them crosses the boundary from "what the shell hands over" to "what the
 * block declares it needs".
 *
 * A rendering test would catch it too, but would cost a DOM environment and a
 * new dependency. This is static and free: the sources are already available
 * through Vite's `?raw` import, a `@property` is a declaration, and
 * `.name=${…}` is the only way Lit passes one.
 *
 * It cannot catch the *other* half of that class — a property that IS passed,
 * from an attribute the backend never publishes, which is how the hub card's
 * decision verdict came to read "it would water" in every state. That half is
 * pinned on the Python side, by asserting the attribute exists on the entity.
 * Between the two, the boundary is covered from both ends.
 */

const SHELLS = `${zoneCardSource}\n${hubCardSource}`;

const BLOCKS: [name: string, source: string][] = [
  ["next-run-block", nextRunBlockSource],
  ["programs-block", programsBlockSource],
  ["hardware-block", hardwareBlockSource],
  ["consumption-block", consumptionBlockSource],
  ["decision-block", decisionBlockSource],
  ["health-block", healthBlockSource],
];

function declaredProperties(source: string): string[] {
  return [...source.matchAll(/@property\([^)]*\)\s+([a-zA-Z_]\w*)/g)].map((match) => match[1]!);
}

describe.each(BLOCKS)("%s is fully wired", (name, source) => {
  it("declares at least one input, so an empty match is not mistaken for success", () => {
    // Without this, a regex that silently stopped matching would make every
    // assertion below vacuously true -- the failure mode of every static check.
    expect(declaredProperties(source).length).toBeGreaterThan(0);
  });

  it("has every declared input passed by a card shell", () => {
    const unwired = declaredProperties(source).filter(
      (property) => !SHELLS.includes(`.${property}=\${`),
    );

    expect(
      unwired,
      `${name} declares ${unwired.join(", ")} but no shell passes ${
        unwired.length === 1 ? "it" : "them"
      }`,
    ).toEqual([]);
  });
});

describe("the shells hand over nothing a block does not declare", () => {
  it("passes no property to a block element that the block never reads", () => {
    // The mirror failure: a shell renaming a property while the block keeps the
    // old name. Lit accepts it silently -- the value simply lands nowhere.
    const declared = new Set(BLOCKS.flatMap(([, source]) => declaredProperties(source)));
    // Elements this test governs; other custom elements have their own inputs.
    const blockTags = /<imc-(next-run|programs|hardware|consumption|decision|health)-block([\s\S]*?)>/g;
    const stray: string[] = [];
    for (const match of SHELLS.matchAll(blockTags)) {
      for (const attr of match[2]!.matchAll(/\.([a-zA-Z_]\w*)=\$\{/g)) {
        if (!declared.has(attr[1]!)) stray.push(`${match[1]}: .${attr[1]}`);
      }
    }

    expect(stray).toEqual([]);
  });
});
