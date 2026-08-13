import { describe, it, expect } from "vitest";
import {
  everyDay,
  toggleWeekday,
  isUniform,
  dayIntensity,
  dayBase,
  dayDelivery,
  previewMinutes,
  minutesChanged,
  WEEKDAYS,
} from "./schedule-math";

describe("weekday helpers", () => {
  it("everyDay is true for empty/undefined/all-seven", () => {
    expect(everyDay(undefined)).toBe(true);
    expect(everyDay([])).toBe(true);
    expect(everyDay([...WEEKDAYS])).toBe(true);
    expect(everyDay([0, 2, 4])).toBe(false);
  });
  it("toggleWeekday adds and removes, keeping sorted unique", () => {
    expect(toggleWeekday([0, 4], 2)).toEqual([0, 2, 4]);
    expect(toggleWeekday([0, 2, 4], 2)).toEqual([0, 4]);
    expect(toggleWeekday([4, 0], 0)).toEqual([4]);
  });
});

describe("isUniform", () => {
  it("is true when there is no per-day map", () => {
    expect(isUniform(undefined)).toBe(true);
    expect(isUniform({})).toBe(true);
    expect(isUniform({ "0": 10 })).toBe(false);
  });
});

const CYCLE = {
  intensity_pct: 150,
  day_intensity_pct: { "0": 50 },
  curve: { points: [[10, 10], [25, 20], [35, 32]], min: 1, max: 60 },
};

describe("dayIntensity", () => {
  it("prefers a per-day override and falls back to the uniform value", () => {
    expect(dayIntensity(CYCLE, 0)).toBe(50);
    expect(dayIntensity(CYCLE, 3)).toBe(150);
  });

  it("treats a program with no intensity as unscaled", () => {
    expect(dayIntensity({}, 3)).toBe(100);
  });
});

describe("dayBase", () => {
  // dayBase's SETTING-only nature -- that it has no channel for a zone's
  // adjustment_pct to enter through -- is a fact about its *signature* (see
  // the module doc on dayDelivery/previewMinutes), which TypeScript already
  // enforces at compile time: there is no third parameter to pass one
  // through even if a caller wanted to. A separate runtime test asserting
  // "dayBase(CYCLE, 3) is 30" could only ever repeat the assertion below --
  // a byte-for-byte duplicate that stays green even if dayBase somehow
  // grew an adjustment parameter later -- so there is deliberately no such
  // test here.
  it("is the scaled minutes at the reference temperature", () => {
    expect(dayBase(CYCLE, 3)).toBe(30); // 20 * 1.5
    expect(dayBase(CYCLE, 0)).toBe(10); // 20 * 0.5
  });
});

describe("dayDelivery", () => {
  it("folds the zone's adjustment_pct into the SETTING, engine-order: multiply first, then clamp", () => {
    // dayIntensity(CYCLE, 3) is 150. At 70% zone adjustment the combined
    // percentage is 150 * 70 / 100 = 105, applied to raw(25) = 20:
    // 20 * 105 / 100 = 21 -- the same figure engine/curves.py::curve_value
    // would produce for zone.adjustment_pct=70, intensity_pct=150 at 25 °C.
    expect(dayDelivery(CYCLE, 3, 70)).toBe(21);
    // dayIntensity(CYCLE, 0) is 50 (the Sunday override). Combined: 50 * 70
    // / 100 = 35. 20 * 35 / 100 = 7.
    expect(dayDelivery(CYCLE, 0, 70)).toBe(7);
  });

  it("is unchanged from dayBase's figure at a 100% (no-op) adjustment", () => {
    expect(dayDelivery(CYCLE, 3, 100)).toBe(dayBase(CYCLE, 3));
    expect(dayDelivery(CYCLE, 0, 100)).toBe(dayBase(CYCLE, 0));
  });

  it("never scales the clamps themselves", () => {
    // A tiny curve value pushed further down by the adjustment still hits
    // the floor, not zero or a fraction of the floor.
    const clamped = { curve: { points: [[25, 10]], min: 5, max: 60 } };
    // 10 * (100 * 10 / 100) / 100 = 1, floored to the clamp minimum of 5 --
    // never 5 * 0.1 = 0.5.
    expect(dayDelivery(clamped, 0, 10)).toBe(5);
  });
});

describe("previewMinutes", () => {
  it("with a known curve and intensity, produces what the engine would deliver at 70% zone adjustment", () => {
    // reference value at 25 °C is 20 (matches CYCLE's own middle point), so
    // minutesAtReference=20 means the derived intensity is exactly 100%.
    // At 35 °C the raw curve reads 32. Combined percentage with a 70%
    // zone adjustment: 100 * 70 / 100 = 70. 32 * 70 / 100 = 22.4, rounded
    // (banker's rounding) to 22 -- the same value
    // curve_value(curve, 35, 70) would produce, then rounded for display.
    expect(previewMinutes(CYCLE, 20, 35, 70)).toBe(22);
  });

  // "Comparing the omitted-argument call against an explicit 100" was
  // dropped here as its own test: that comparison alone passes even if
  // adjustmentPct were ignored completely (both calls would then just
  // ignore whatever, or nothing, was passed, and trivially agree). The
  // test below keeps that comparison only alongside a concrete,
  // independently-computed expectation, which is what actually pins the
  // default -- if the default silently broke (e.g. read as NaN), the
  // second assertion would catch it even though the first could not.
  it("is unchanged from today's behaviour at a 100% (no-op) adjustment", () => {
    expect(previewMinutes(CYCLE, 20, 35)).toBe(previewMinutes(CYCLE, 20, 35, 100));
    expect(previewMinutes(CYCLE, 20, 35)).toBe(32); // raw(35) unscaled
  });
});

describe("minutesChanged", () => {
  it("is false for an untouched uniform stepper", () => {
    expect(minutesChanged(true, true, 15, 15, {}, {})).toBe(false);
  });

  it("is true once the uniform stepper is nudged", () => {
    expect(minutesChanged(true, true, 15, 16, {}, {})).toBe(true);
  });

  it("ignores the per-day map while sameForAll is in force", () => {
    // The per-day map may be stale (its mode isn't in use) -- only the
    // uniform value the user is actually looking at should gate the save.
    expect(minutesChanged(true, true, 15, 15, { "0": 10 }, { "0": 99 })).toBe(false);
  });

  it("is false for an untouched per-day map", () => {
    expect(minutesChanged(false, false, 15, 15, { "0": 10, "3": 20 }, { "0": 10, "3": 20 })).toBe(
      false,
    );
  });

  it("is true when one weekday's value diverges from its seed", () => {
    expect(minutesChanged(false, false, 15, 15, { "0": 10, "3": 20 }, { "0": 10, "3": 21 })).toBe(
      true,
    );
  });

  it("ignores the uniform value while a per-day map is in force", () => {
    expect(minutesChanged(false, false, 15, 99, { "0": 10 }, { "0": 10 })).toBe(false);
  });

  it("is true when a weekday is added or removed from the map", () => {
    expect(minutesChanged(false, false, 15, 15, { "0": 10 }, { "0": 10, "3": 20 })).toBe(true);
    expect(minutesChanged(false, false, 15, 15, { "0": 10, "3": 20 }, { "0": 10 })).toBe(true);
  });

  it("is true when sameForAll collapses to uniform, even with untouched values", () => {
    // The seeded state was per-day (e.g. Monday at half); the user toggles
    // "same duration every day" and presses Save without touching a
    // stepper. That toggle must still count as an edit -- it collapses
    // day_intensity_pct server-side -- even though every number involved
    // is unchanged.
    expect(
      minutesChanged(true, false, 20, 20, { "0": 10, "3": 20 }, { "0": 10, "3": 20 }),
    ).toBe(true);
  });

  it("is true when sameForAll expands to per-day, even with untouched values", () => {
    expect(minutesChanged(false, true, 15, 15, {}, {})).toBe(true);
  });
});
