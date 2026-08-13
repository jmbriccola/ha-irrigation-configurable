import { describe, it, expect } from "vitest";
import {
  everyDay,
  toggleWeekday,
  isUniform,
  dayIntensity,
  dayBase,
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
  it("is the scaled minutes at the reference temperature", () => {
    expect(dayBase(CYCLE, 3)).toBe(30); // 20 * 1.5
    expect(dayBase(CYCLE, 0)).toBe(10); // 20 * 0.5
  });
});

describe("minutesChanged", () => {
  it("is false for an untouched uniform stepper", () => {
    expect(minutesChanged(true, 15, 15, {}, {})).toBe(false);
  });

  it("is true once the uniform stepper is nudged", () => {
    expect(minutesChanged(true, 15, 16, {}, {})).toBe(true);
  });

  it("ignores the per-day map while sameForAll is in force", () => {
    // The per-day map may be stale (its mode isn't in use) -- only the
    // uniform value the user is actually looking at should gate the save.
    expect(minutesChanged(true, 15, 15, { "0": 10 }, { "0": 99 })).toBe(false);
  });

  it("is false for an untouched per-day map", () => {
    expect(minutesChanged(false, 15, 15, { "0": 10, "3": 20 }, { "0": 10, "3": 20 })).toBe(false);
  });

  it("is true when one weekday's value diverges from its seed", () => {
    expect(minutesChanged(false, 15, 15, { "0": 10, "3": 20 }, { "0": 10, "3": 21 })).toBe(true);
  });

  it("ignores the uniform value while a per-day map is in force", () => {
    expect(minutesChanged(false, 15, 99, { "0": 10 }, { "0": 10 })).toBe(false);
  });

  it("is true when a weekday is added or removed from the map", () => {
    expect(minutesChanged(false, 15, 15, { "0": 10 }, { "0": 10, "3": 20 })).toBe(true);
    expect(minutesChanged(false, 15, 15, { "0": 10, "3": 20 }, { "0": 10 })).toBe(true);
  });
});
