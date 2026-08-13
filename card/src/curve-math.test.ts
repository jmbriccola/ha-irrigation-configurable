import { describe, expect, it } from "vitest";
import {
  curveValue,
  pointsFromSemantic,
  previewFromMinutes,
  roundHalfEven,
  scaledValue,
  semanticFromPoints,
  validatePoints,
} from "./curve-math";
import type { CurvePoint } from "./curve-math";

describe("pointsFromSemantic (parity with engine/semantic.py)", () => {
  it("matches the Python reference table", () => {
    expect(pointsFromSemantic(15, 15)).toEqual([
      [12, 0],
      [25, 15],
      [35, 30],
    ]);
    expect(pointsFromSemantic(3, 30)).toEqual([
      [12, 0],
      [25, 3],
      [35, 33],
    ]);
    expect(pointsFromSemantic(20, 0)).toEqual([
      [12, 20],
      [25, 20],
      [35, 20],
    ]);
  });

  it("uses round-half-to-even at the .5 boundary (matches Python round())", () => {
    // amount - SLOPE_SPAN*heat = 9 - 1.3*5 = 2.5 -> banker's rounding gives 2,
    // not 3 (which Math.round, being half-up, would wrongly produce).
    expect(pointsFromSemantic(9, 5)).toEqual([
      [12, 2],
      [25, 9],
      [35, 14],
    ]);
  });
});

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

describe("semanticFromPoints", () => {
  it("round-trips", () => {
    const pts = pointsFromSemantic(18, 12);
    expect(semanticFromPoints(pts)).toEqual({ amount: 18, heat: 12 });
  });
  it("clamps to ranges", () => {
    expect(
      semanticFromPoints([
        [25, 1],
        [35, 1],
      ]),
    ).toEqual({ amount: 3, heat: 0 });
  });
  it("applies the curve's own min/max clamps before deriving amount/heat, matching engine/semantic.py's semantic_from_curve (which reads curve_value, itself clamped)", () => {
    expect(
      semanticFromPoints(
        [
          [25, 200],
          [35, 400],
        ],
        undefined,
        30,
      ),
    ).toEqual({ amount: 30, heat: 0 });
  });
});

describe("curveValue", () => {
  it("interpolates linearly and extrapolates flat", () => {
    const pts: [number, number][] = [
      [10, 5],
      [25, 15],
      [35, 30],
    ];
    expect(curveValue(pts, 17.5)).toBeCloseTo(10);
    expect(curveValue(pts, 5)).toBeCloseTo(5);
    expect(curveValue(pts, 40)).toBeCloseTo(30);
  });
  it("applies clamps", () => {
    expect(
      curveValue(
        [
          [10, 0],
          [35, 50],
        ],
        35,
        5,
        30,
      ),
    ).toBe(30);
  });
});

describe("scaledValue", () => {
  const points: CurvePoint[] = [
    [10, 10],
    [25, 20],
    [35, 32],
  ];

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
