import { describe, it, expect } from "vitest";
import {
  notificationSummary,
  weightRows,
  weightsAreEffective,
} from "./hub-decision";

const WEIGHTS = [0.05, 0.15, 0.3, 0.35, 0.15];

const ALL_DAYS = {
  temp_d3: 24,
  temp_d2: 26,
  temp_d1: 29,
  temp_today_eff: 31,
  temp_tomorrow: 30,
};

describe("weightRows", () => {
  it("pairs each day with its configured weight, in the engine's order", () => {
    const rows = weightRows(ALL_DAYS, WEIGHTS);

    expect(rows.map((row) => row.key)).toEqual([
      "temp_d3",
      "temp_d2",
      "temp_d1",
      "temp_today_eff",
      "temp_tomorrow",
    ]);
    expect(rows.map((row) => row.weight)).toEqual(WEIGHTS);
    expect(rows.map((row) => row.value)).toEqual([24, 26, 29, 31, 30]);
  });

  it("marks a missing day, because its weight was redistributed and not applied", () => {
    // This is the whole point. weighted_temperature renormalises over the days
    // that arrived, so printing 0.15 beside a null tomorrow would state a
    // weight that did not apply -- on the one screen built to explain how the
    // decision was made.
    const rows = weightRows({ ...ALL_DAYS, temp_tomorrow: null }, WEIGHTS);

    expect(rows[4]?.missing).toBe(true);
    expect(rows[4]?.value).toBeNull();
    expect(rows.slice(0, 4).every((row) => !row.missing)).toBe(true);
  });

  it("treats an absent attribute exactly like an explicit null", () => {
    const rows = weightRows({ temp_d1: 29 }, WEIGHTS);

    expect(rows.filter((row) => row.missing)).toHaveLength(4);
    expect(rows[2]?.missing).toBe(false);
  });

  it("still lists the days when the backend published no weights at all", () => {
    // An older install upgrading in place. The values are real and worth
    // showing; blanking the whole block over a missing attribute would hide
    // information the user has.
    const rows = weightRows(ALL_DAYS, undefined);

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.weight === null)).toBe(true);
    expect(rows.map((row) => row.value)).toEqual([24, 26, 29, 31, 30]);
  });

  it("survives a weights array of the wrong length without inventing one", () => {
    const rows = weightRows(ALL_DAYS, [0.5, 0.5]);

    expect(rows[0]?.weight).toBe(0.5);
    expect(rows[4]?.weight).toBeNull();
  });
});

describe("weightsAreEffective", () => {
  it("is true only when every day arrived", () => {
    expect(weightsAreEffective(weightRows(ALL_DAYS, WEIGHTS))).toBe(true);
    expect(weightsAreEffective(weightRows({ ...ALL_DAYS, temp_d3: null }, WEIGHTS))).toBe(false);
  });
});

describe("notificationSummary", () => {
  it("is fine only when nothing is silent and nothing is unreachable", () => {
    const summary = notificationSummary({
      verdict: "ok",
      enabled_without_target: [],
      unreachable: {},
    });

    expect(summary.verdict).toBe("ok");
  });

  it("names the events that would reach nobody", () => {
    // Diagnostic #3: "enabled with no recipients" is seen here instead of
    // being discovered when the alarm does not arrive.
    const summary = notificationSummary({
      verdict: "ok",
      enabled_without_target: ["watchdog", "leak"],
      unreachable: {},
    });

    expect(summary.verdict).toBe("partial");
    expect(summary.silentEvents).toEqual(["watchdog", "leak"]);
  });

  it("names a recipient service that does not resolve", () => {
    const summary = notificationSummary({
      verdict: "ok",
      enabled_without_target: [],
      unreachable: { "mobile_app_old_phone": ["watchdog"] },
    });

    expect(summary.verdict).toBe("partial");
    expect(summary.unreachable).toEqual(["mobile_app_old_phone"]);
  });

  it("carries a mute verdict through even when nothing else is wrong", () => {
    expect(notificationSummary({ verdict: "mute" }).verdict).toBe("muted");
  });

  it("degrades to unchecked, never to fine, when the call did not come back", () => {
    // Claiming the notifications are healthy because we could not ask is the
    // exact failure this screen exists to prevent.
    expect(notificationSummary(null).verdict).toBe("unchecked");
    expect(notificationSummary(undefined).verdict).toBe("unchecked");
  });
});
