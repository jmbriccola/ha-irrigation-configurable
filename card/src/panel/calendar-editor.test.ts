import { describe, expect, it } from "vitest";
import {
  ALL_WEEKDAYS,
  type CalendarConfig,
  describeCalendar,
  normaliseCalendar,
} from "./calendar-editor";

describe("normaliseCalendar", () => {
  it("keeps only the keys of the active mode", () => {
    const hybrid = {
      mode: "weekdays",
      days: [0, 2],
      interval_days: 3,
      parity: "odd",
    } as unknown as CalendarConfig;
    expect(normaliseCalendar(hybrid)).toEqual({ mode: "weekdays", days: [0, 2] });
  });

  it("defaults an empty weekday selection to every day", () => {
    expect(normaliseCalendar({ mode: "weekdays", days: [] })).toEqual({
      mode: "weekdays",
      days: ALL_WEEKDAYS,
    });
  });

  it("sorts and de-duplicates weekdays", () => {
    expect(normaliseCalendar({ mode: "weekdays", days: [4, 0, 4, 2] })).toEqual({
      mode: "weekdays",
      days: [0, 2, 4],
    });
  });

  it("clamps an interval below one", () => {
    expect(normaliseCalendar({ mode: "interval", interval_days: 0 })).toEqual({
      mode: "interval",
      interval_days: 1,
    });
  });

  it("clamps an interval above sixty", () => {
    expect(normaliseCalendar({ mode: "interval", interval_days: 99 })).toEqual({
      mode: "interval",
      interval_days: 60,
    });
  });

  it("falls back to every day for an unknown mode", () => {
    expect(normaliseCalendar({ mode: "whenever" } as unknown as CalendarConfig)).toEqual({
      mode: "weekdays",
      days: ALL_WEEKDAYS,
    });
  });

  it("falls back to every day when the calendar is missing", () => {
    expect(normaliseCalendar(undefined)).toEqual({ mode: "weekdays", days: ALL_WEEKDAYS });
  });

  it("keeps a parity calendar intact", () => {
    expect(normaliseCalendar({ mode: "parity", parity: "even" })).toEqual({
      mode: "parity",
      parity: "even",
    });
  });
});

describe("describeCalendar", () => {
  it("summarises every mode for the program list", () => {
    expect(describeCalendar({ mode: "weekdays", days: ALL_WEEKDAYS })).toBe("Ogni giorno");
    expect(describeCalendar({ mode: "weekdays", days: [0, 2, 4] })).toBe("Lun, Mer, Ven");
    expect(describeCalendar({ mode: "interval", interval_days: 1 })).toBe("Ogni giorno");
    expect(describeCalendar({ mode: "interval", interval_days: 3 })).toBe("Ogni 3 giorni");
    expect(describeCalendar({ mode: "parity", parity: "odd" })).toBe("Giorni dispari");
    expect(describeCalendar({ mode: "parity", parity: "even" })).toBe("Giorni pari");
  });
});

describe("mode switching", () => {
  it("never carries residue from the previous mode", () => {
    // Switching mode replaces the object wholesale, so the UI cannot express
    // a hybrid any more than the backend can.
    const fromWeekdays = normaliseCalendar({ mode: "weekdays", days: [0, 2] });
    const toInterval = normaliseCalendar({ mode: "interval", interval_days: 4 });
    expect(Object.keys(toInterval)).toEqual(["mode", "interval_days"]);
    expect(Object.keys(fromWeekdays)).toEqual(["mode", "days"]);
  });
});
