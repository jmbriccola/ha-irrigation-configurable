import { describe, it, expect } from "vitest";
import { everyDay, toggleWeekday, isUniform, dayBase, effectiveMinutes, WEEKDAYS } from "./schedule-math";

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

describe("per-day + weather", () => {
  it("isUniform when no per-day map", () => {
    expect(isUniform(undefined)).toBe(true);
    expect(isUniform({})).toBe(true);
    expect(isUniform({ "0": 10 })).toBe(false);
  });
  it("dayBase prefers the per-day value, else amount", () => {
    expect(dayBase({ amount: 15, day_minutes: { "4": 20 } }, 4)).toBe(20);
    expect(dayBase({ amount: 15, day_minutes: { "4": 20 } }, 1)).toBe(15);
    expect(dayBase({ amount: 15 }, 1)).toBe(15);
  });
  it("effectiveMinutes mirrors the backend resolve_day_curve (base 20, heat 10, 31C -> 26)", () => {
    // pointsFromSemantic(20,10) = [[12,7],[25,20],[35,30]]; at 31 -> 20+10*0.6 = 26
    expect(effectiveMinutes(20, 10, 31, 1, 60)).toBe(26);
  });
});
