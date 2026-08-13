import { describe, expect, it } from "vitest";
import { addPoint, removePoint, sortPoints, updatePoint } from "./curve-editor-state";
import type { CurvePoint } from "./curve-math";

const POINTS: CurvePoint[] = [
  [10, 10],
  [25, 20],
  [35, 32],
];

describe("curve editor point operations", () => {
  it("inserts a new point midway between its neighbours", () => {
    const next = addPoint(POINTS, 1);
    expect(next).toHaveLength(4);
    expect(next[2]).toEqual([30, 26]); // midpoint of (25,20) and (35,32)
  });

  it("appends beyond the last point when asked to extend the end", () => {
    const next = addPoint(POINTS, 2);
    expect(next).toHaveLength(4);
    expect(next[3]?.[0]).toBeGreaterThan(35);
  });

  it("refuses to remove the last remaining point", () => {
    expect(removePoint([[25, 20]], 0)).toEqual([[25, 20]]);
  });

  it("removes a point when others remain", () => {
    expect(removePoint(POINTS, 1)).toEqual([
      [10, 10],
      [35, 32],
    ]);
  });

  it("keeps points ordered by temperature after an edit", () => {
    const next = sortPoints(updatePoint(POINTS, 0, 40, 12));
    expect(next.map((p) => p[0])).toEqual([25, 35, 40]);
  });
});
