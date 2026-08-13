import { describe, expect, it } from "vitest";
import { previewFromMinutes, roundHalfEven, scaledValue, validatePoints } from "./curve-math";
import type { CurvePoint } from "./curve-math";

describe("roundHalfEven", () => {
  it("rounds halves to the nearest even integer", () => {
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(3.5)).toBe(4);
    expect(roundHalfEven(-4.5)).toBe(-4);
    expect(roundHalfEven(-2.5)).toBe(-2);
  });
  it("rounds non-halves normally", () => {
    expect(roundHalfEven(2.4)).toBe(2);
    expect(roundHalfEven(2.6)).toBe(3);
  });
});

describe("scaledValue", () => {
  const points: CurvePoint[] = [
    [10, 10],
    [25, 20],
    [35, 32],
  ];

  it("interpolates linearly and extrapolates flat", () => {
    expect(scaledValue(points, 17.5)).toBeCloseTo(15);
    expect(scaledValue(points, 5)).toBeCloseTo(10); // flat below the first point
    expect(scaledValue(points, 40)).toBeCloseTo(32); // flat beyond the last point
  });

  it("applies the intensity before the clamps, like the engine", () => {
    // raw 20 at the reference, 150% -> 30, inside the clamps.
    expect(scaledValue(points, 25, 150, 1, 60)).toBeCloseTo(30);
    // A floor must not be scaled with the value it guards: raw 10 at 50%
    // is 5, floored back up to the unscaled minimum.
    expect(scaledValue(points, 10, 50, 10, 60)).toBeCloseTo(10);
  });

  it("defaults to an unscaled curve", () => {
    expect(scaledValue(points, 25, 100)).toBeCloseTo(20);
  });

  it("caps a value that lands exactly on an authored point", () => {
    expect(scaledValue([[10, 0], [35, 50]], 35, 100, 5, 30)).toBe(30);
  });
});

describe("previewFromMinutes", () => {
  const points: CurvePoint[] = [
    [10, 10],
    [25, 20],
    [35, 32],
  ];

  it("reproduces the requested minutes at the reference", () => {
    expect(previewFromMinutes(points, 30, 25, 1, 60)).toBe(30);
  });

  it("keeps the curve's shape at other temperatures", () => {
    // 30 minutes asked at 25 C is a factor of 1.5; raw 32 at 35 C -> 48.
    expect(previewFromMinutes(points, 30, 35, 1, 60)).toBe(48);
  });

  it("returns 0 rather than dividing by a curve worth nothing", () => {
    expect(previewFromMinutes([[25, 0]], 20, 30)).toBe(0);
  });

  it("folds an adjustmentPct in before the clamps, engine-order", () => {
    // reference value at 25 C is 20, so minutesAtReference=20 is a no-op
    // derived intensity (100%). At 35 C the raw curve reads 32. Combined
    // with a 70% adjustment: 100 * 70 / 100 = 70; 32 * 70 / 100 = 22.4,
    // rounded (banker's rounding) to 22 -- this is the same formula
    // schedule-math.ts's previewMinutes now calls, rather than
    // re-implementing (see curve-math.ts's docblock).
    expect(previewFromMinutes(points, 20, 35, 1, 60, 70)).toBe(22);
  });
});

describe("validatePoints", () => {
  it("accepts a valid multi-point curve", () => {
    expect(validatePoints([[5, 1], [25, 20], [40, 55]])).toBeNull();
  });

  it("rejects an empty curve", () => {
    expect(validatePoints([])).toBe("curve_empty");
  });

  it("rejects a negative value", () => {
    expect(validatePoints([[25, -1]])).toBe("curve_negative_value");
  });

  it("rejects temperatures that do not strictly increase", () => {
    expect(validatePoints([[25, 10], [25, 12]])).toBe("curve_temps_not_increasing");
    expect(validatePoints([[30, 10], [25, 12]])).toBe("curve_temps_not_increasing");
  });
});
