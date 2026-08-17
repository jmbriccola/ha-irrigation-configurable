import { describe, it, expect } from "vitest";
import { meterGeometry } from "./budget-meter";

/**
 * The comparison between these two numbers IS the decision to water. The
 * geometry is tested as arithmetic because the two cases that matter — the
 * one that could divide by zero and the one that decides whether the bar
 * reads as "enough" — are invisible in a DOM snapshot.
 */
describe("meterGeometry", () => {
  it("fills proportionally when the budget is under the threshold", () => {
    const { fill, mark, sufficient } = meterGeometry(2, 4);

    expect(fill).toBeCloseTo(0.5);
    expect(mark).toBeCloseTo(1);
    expect(sufficient).toBe(false);
  });

  it("reads as sufficient exactly at the threshold, which is where the engine skips", () => {
    // budget >= threshold is the engine's own comparison
    // (evaluate_session: `budget >= threshold` -> BUDGET_SUFFICIENT), and a
    // meter that turned green one drop later would disagree with the decision
    // it is drawn to explain.
    expect(meterGeometry(4, 4).sufficient).toBe(true);
    expect(meterGeometry(3.99, 4).sufficient).toBe(false);
  });

  it("scales to the budget once it exceeds the threshold, so the mark moves left", () => {
    const { fill, mark } = meterGeometry(8, 4);

    expect(fill).toBeCloseTo(1);
    expect(mark).toBeCloseTo(0.5);
  });

  it("does not divide by zero at the start of a dry spell", () => {
    // Both legitimately zero. A meter that threw or blanked here would vanish
    // exactly when the budget is most interesting.
    const { fill, mark, sufficient } = meterGeometry(0, 0);

    expect(Number.isFinite(fill)).toBe(true);
    expect(fill).toBe(0);
    expect(mark).toBe(0);
    expect(sufficient).toBe(true);
  });

  it("claims nothing about sufficiency when either number is missing", () => {
    expect(meterGeometry(undefined, 4).sufficient).toBe(false);
    expect(meterGeometry(4, undefined).sufficient).toBe(false);
    expect(meterGeometry(4, undefined).mark).toBeUndefined();
  });

  it("never leaves the bar outside its track", () => {
    for (const [budget, threshold] of [
      [100, 1],
      [1, 100],
      [0, 5],
      [5, 0],
    ] as const) {
      const { fill, mark } = meterGeometry(budget, threshold);
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(1);
      expect(mark).toBeGreaterThanOrEqual(0);
      expect(mark).toBeLessThanOrEqual(1);
    }
  });
});
