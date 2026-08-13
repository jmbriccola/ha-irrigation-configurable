import { describe, expect, it } from "vitest";
import {
  addPoint,
  curveKindForSave,
  dragValue,
  graphAxis,
  needsIntensityResetNotice,
  removePoint,
  sortPoints,
  updatePoint,
} from "./curve-editor-state";
import type { CurvePoint } from "./curve-math";

const HEIGHT = 170;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

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

  /**
   * Regression: dragValue used to route EVERY move through roundHalfEven,
   * including a zero-pixel one -- so grabbing a handle whose point holds a
   * fractional value (curves legitimately carry them; one shipped preset
   * has 64/3) and letting go without moving the pointer still truncated it
   * to an integer, even though there was zero net displacement.
   */
  it("leaves a fractional value byte-identical on a zero-pixel drag", () => {
    expect(dragValue(64 / 3, 0, 5)).toBe(64 / 3);
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

describe("graphAxis", () => {
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = HEIGHT - PAD_BOTTOM; // y for value 0, always pinned here

  it("baseline: y(0) is always the plot's bottom edge, regardless of scale", () => {
    const axis = graphAxis([[25, 10]], 1, 60, HEIGHT, PAD_TOP, PAD_BOTTOM);
    expect(axis.y(0)).toBeCloseTo(baseline);
  });

  it("scales top to the tallest point when both clamps sit inside the points' range", () => {
    const axis = graphAxis(
      [[10, 10], [25, 20], [35, 32]],
      1,
      // A max inside the points' own range (32) so the points, not the
      // clamp, set the scale for this case.
      30,
      HEIGHT,
      PAD_TOP,
      PAD_BOTTOM,
    );
    expect(axis.top).toBe(32 + 4);
  });

  it("stretches to keep a floor (min) above every point on-screen", () => {
    // This is defect A's core bug: a point far below a floor used to be
    // drawn AT the floor's height (zero visible drag room). The axis must
    // now scale to the floor even though no point reaches it, so the floor
    // line -- and the true, lower position of the point -- both fit.
    const axis = graphAxis([[12, 2]], 5, 60, HEIGHT, PAD_TOP, PAD_BOTTOM);
    expect(axis.top).toBeGreaterThanOrEqual(60);
  });

  it("stretches to keep a point far above the ceiling (max) on-screen too", () => {
    const axis = graphAxis([[25, 500]], 1, 60, HEIGHT, PAD_TOP, PAD_BOTTOM);
    expect(axis.top).toBeGreaterThanOrEqual(500);
  });

  it("never lets the min or max guide line fall outside the plot area", () => {
    const cases: Array<[CurvePoint[], number, number]> = [
      [[[25, 15]], 1, 60],
      [[[12, 2]], 5, 60], // floor far above every point
      [[[25, 500]], 1, 60], // point far above the ceiling
      [[[10, 10], [25, 20], [35, 32]], 1, 60],
    ];
    for (const [points, min, max] of cases) {
      const axis = graphAxis(points, min, max, HEIGHT, PAD_TOP, PAD_BOTTOM);
      const minY = axis.y(min);
      const maxY = axis.y(max);
      expect(minY).toBeGreaterThanOrEqual(PAD_TOP);
      expect(minY).toBeLessThanOrEqual(HEIGHT - PAD_BOTTOM);
      expect(maxY).toBeGreaterThanOrEqual(PAD_TOP);
      expect(maxY).toBeLessThanOrEqual(HEIGHT - PAD_BOTTOM);
    }
  });

  it("places a higher raw value at a smaller y (higher on screen) than a lower one", () => {
    const axis = graphAxis([[25, 40]], 1, 60, HEIGHT, PAD_TOP, PAD_BOTTOM);
    expect(axis.y(40)).toBeLessThan(axis.y(10));
  });

  it("maps the axis's own top value to the plot's top edge", () => {
    const axis = graphAxis([[25, 15]], 1, 60, HEIGHT, PAD_TOP, PAD_BOTTOM);
    expect(axis.y(axis.top)).toBeCloseTo(HEIGHT - PAD_BOTTOM - plotHeight);
  });
});
