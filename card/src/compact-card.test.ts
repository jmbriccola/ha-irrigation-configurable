import { describe, it, expect } from "vitest";
import zoneRowSource from "./zone-row?raw";
import cardSource from "./card?raw";
import editorSource from "./editor?raw";
import { ROW_TOGGLES, rowLineEnabled } from "./types";
import type { CardConfig } from "./types";

const BASE: CardConfig = { type: "custom:irrigation-maestro-card" };

describe("rowLineEnabled", () => {
  it("treats an unset toggle as on, the same policy as both other cards", () => {
    for (const toggle of ROW_TOGGLES) {
      expect(rowLineEnabled(BASE, toggle)).toBe(true);
    }
  });

  it("turns a line off only for an explicit false", () => {
    expect(rowLineEnabled({ ...BASE, show_water: false }, "show_water")).toBe(false);
    expect(rowLineEnabled({ ...BASE, show_water: true }, "show_water")).toBe(true);
    expect(rowLineEnabled({ ...BASE, show_water: false }, "show_verdict")).toBe(true);
  });
});

/**
 * The wiring checks that 3.8.1 introduced, applied to the row.
 *
 * `zone-row.ts` is not under `blocks/` and so is outside `wiring.test.ts`'s
 * scope — but it is the same boundary, and it is where three defects lived.
 * These assertions are cheap and they are the ones that would have failed.
 */
describe("the compact row's new inputs are actually handed over", () => {
  it("passes every toggle the row declares", () => {
    const declared = [...zoneRowSource.matchAll(/@property\([^)]*\)\s+(show[A-Z]\w*)/g)].map(
      (match) => match[1]!,
    );

    expect(declared.length).toBeGreaterThan(0);
    for (const property of declared) {
      expect(cardSource, `zone-row declares ${property} and card.ts never passes it`).toContain(
        `.${property}=\${`,
      );
    }
  });

  it("offers every config toggle in the editor, so none is YAML-only by accident", () => {
    for (const toggle of ROW_TOGGLES) {
      expect(editorSource, `${toggle} is readable but not editable`).toContain(`"${toggle}"`);
    }
  });

  it("reads the verdict from zone_state, which is the entity that publishes it", () => {
    // zone_next_run carries the instant; the verdict lives on zone_state,
    // which is never unavailable. Reading it from the wrong entity is exactly
    // how the hub card's decision line came to be always wrong.
    expect(zoneRowSource).toContain('zone.state?.attributes["next_run"]');
  });
});

describe("what the compact row does with a verdict it cannot trust", () => {
  it("renders no verdict line at all for `unknown`, rather than saying so", () => {
    // The zone card has room to write "not evaluated yet". A row has one line
    // per fact, and spending it on the absence of information is worse than
    // leaving the fact out. The guard is `!== "unknown"`, asserted here
    // because it is a one-word difference from rendering the wrong thing.
    expect(zoneRowSource).toContain('if (today !== "unknown")');
  });
});
