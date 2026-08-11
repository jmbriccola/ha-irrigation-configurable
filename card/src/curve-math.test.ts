import { describe, expect, it } from "vitest";
import {
  curveValue,
  pointsFromSemantic,
  roundHalfEven,
  semanticFromPoints,
} from "./curve-math";

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
