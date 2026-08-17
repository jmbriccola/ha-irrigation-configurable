import { describe, it, expect } from "vitest";
import { calendarText } from "./calendar-text";

/**
 * Diagnostic #5 from the brief: "lun e gio" and "ogni 3 giorni con
 * ritentativo" are very different behaviours, and until this module they were
 * distinguishable only by reading the stored JSON.
 *
 * The tests below pin the phrasing rather than the implementation, because the
 * phrasing IS the feature -- and they cover both languages, because the card's
 * language is the card's, not the browser's.
 */
describe("calendarText", () => {
  it("names two weekdays with the language's own conjunction", () => {
    expect(calendarText("it", { mode: "weekdays", days: [0, 3] })).toBe("lun e gio");
    expect(calendarText("en", { mode: "weekdays", days: [0, 3] })).toBe("Mon and Thu");
  });

  it("lists three or more weekdays with separators and a final conjunction", () => {
    expect(calendarText("it", { mode: "weekdays", days: [0, 2, 4] })).toBe("lun, mer e ven");
    expect(calendarText("en", { mode: "weekdays", days: [0, 2, 4] })).toBe("Mon, Wed and Fri");
  });

  it("collapses the full week to 'every day' rather than listing seven", () => {
    const week = { mode: "weekdays" as const, days: [0, 1, 2, 3, 4, 5, 6] };
    expect(calendarText("it", week)).toBe("ogni giorno");
    expect(calendarText("en", week)).toBe("every day");
  });

  it("treats an empty day list as every day, which is what the backend means by it", () => {
    expect(calendarText("it", { mode: "weekdays", days: [] })).toBe("ogni giorno");
  });

  it("sorts the days rather than trusting the stored order", () => {
    expect(calendarText("it", { mode: "weekdays", days: [4, 0] })).toBe("lun e ven");
  });

  it("states an interval with the date the count restarted", () => {
    const cal = { mode: "interval" as const, interval_days: 3 };
    expect(calendarText("it", cal, "2026-08-14")).toBe(
      "ogni 3 giorni · ultimo completato il 14/08",
    );
    expect(calendarText("en", cal, "2026-08-14")).toBe(
      "every 3 days · last completed 14/08",
    );
  });

  it("says so when an interval has never completed, instead of omitting the half", () => {
    const cal = { mode: "interval" as const, interval_days: 3 };
    expect(calendarText("it", cal, null)).toBe("ogni 3 giorni · mai completato");
    expect(calendarText("it", cal)).toBe("ogni 3 giorni · mai completato");
  });

  it("does not say 'every 1 days'", () => {
    expect(calendarText("it", { mode: "interval", interval_days: 1 }, null)).toBe(
      "ogni giorno · mai completato",
    );
    expect(calendarText("en", { mode: "interval", interval_days: 1 }, null)).toBe(
      "every day · never completed",
    );
  });

  it("names both parities", () => {
    expect(calendarText("it", { mode: "parity", parity: "odd" })).toBe("giorni dispari");
    expect(calendarText("it", { mode: "parity", parity: "even" })).toBe("giorni pari");
    expect(calendarText("en", { mode: "parity", parity: "even" })).toBe("even days");
  });

  it("falls back to 'every day' for a mode it has never heard of", () => {
    // Storage may grow a mode before the card does. A card that blanked or
    // threw here would take the whole program row down with it; "every day" is
    // the backend's own default and the least wrong thing to show.
    expect(calendarText("it", { mode: "fortnightly" } as never)).toBe("ogni giorno");
    expect(calendarText("it", undefined)).toBe("ogni giorno");
  });

  it("ignores a malformed date rather than printing it raw", () => {
    expect(calendarText("it", { mode: "interval", interval_days: 3 }, "not-a-date")).toBe(
      "ogni 3 giorni · mai completato",
    );
  });
});
