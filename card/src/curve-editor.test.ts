import { describe, expect, it } from "vitest";
import {
  addPoint,
  curveKindForSave,
  dragValue,
  needsIntensityResetNotice,
  removePoint,
  sortPoints,
  updatePoint,
} from "./curve-editor-state";
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

describe("curveKindForSave", () => {
  it("omits kind when the selector was not offered, so a stored volume curve on a meterless zone round-trips unchanged", () => {
    // The zone's flow meter is gone (offerKind: false) but the program was
    // already a volume curve; the save must not assert "duration" over it.
    expect(curveKindForSave("volume", false)).toBeUndefined();
    // Nor should it re-assert "volume" itself — the point is that nothing
    // about kind travels at all when the selector was never shown.
    expect(curveKindForSave("volume", true) === undefined).toBe(false);
  });

  it("includes kind when the selector was offered", () => {
    expect(curveKindForSave("duration", true)).toBe("duration");
    expect(curveKindForSave("volume", true)).toBe("volume");
  });
});

describe("needsIntensityResetNotice", () => {
  it("fires when the uniform intensity isn't 100%", () => {
    expect(needsIntensityResetNotice({ intensity_pct: 150 })).toBe(true);
  });

  it("fires when a per-day override exists, even while the uniform intensity reads 100%", () => {
    expect(
      needsIntensityResetNotice({ intensity_pct: 100, day_intensity_pct: { "0": 150 } }),
    ).toBe(true);
  });

  it("stays quiet at the defaults", () => {
    expect(needsIntensityResetNotice({})).toBe(false);
    expect(needsIntensityResetNotice({ intensity_pct: 100 })).toBe(false);
    expect(needsIntensityResetNotice({ intensity_pct: 100, day_intensity_pct: {} })).toBe(false);
  });
});

describe("dragValue", () => {
  it("leaves the value byte-identical when the pointer hasn't moved", () => {
    expect(dragValue(2, 0, 3)).toBe(2);
  });

  it("moves the raw value by the expected amount", () => {
    // Moving up (negative deltaY) by 10px at 0.5 units/px raises the value by 5.
    expect(dragValue(10, -10, 0.5)).toBe(15);
    // Moving down (positive deltaY) lowers it.
    expect(dragValue(10, 10, 0.5)).toBe(5);
  });

  it("never goes negative", () => {
    expect(dragValue(1, 100, 1)).toBe(0);
  });
});
