import { describe, it, expect } from "vitest";
import { everyDay, toggleWeekday, isUniform, dayIntensity, dayBase, effectiveMinutes, WEEKDAYS } from "./schedule-math";

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
  it("is the scaled minutes at the reference temperature", () => {
    expect(dayBase(CYCLE, 3)).toBe(30); // 20 * 1.5
    expect(dayBase(CYCLE, 0)).toBe(10); // 20 * 0.5
  });
});

describe("effectiveMinutes", () => {
  it("evaluates the real curve at the weighted temperature", () => {
    expect(effectiveMinutes(CYCLE, 3, 35)).toBe(48); // 32 * 1.5
  });

  it("keeps every control point — a six-point curve is not reduced", () => {
    const six = {
      intensity_pct: 100,
      curve: {
        points: [[5, 4], [12, 10], [20, 18], [25, 24], [33, 40], [40, 52]],
        min: 1,
        max: 60,
      },
    };
    // 33 C sits exactly on the fifth point. The old three-anchor rebuild
    // could not represent it and returned the interpolation between 25 and 35.
    expect(effectiveMinutes(six, 3, 33)).toBe(40);
  });
});
