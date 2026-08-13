import { describe, it, expect } from "vitest";
import { readCycles } from "./discovery";
import type { ZoneBundle } from "./discovery";

function zoneWithCycles(cycles: unknown): ZoneBundle {
  return {
    zoneId: "z1", name: "Prato", order: 1, cycleSwitches: [],
    state: { entity_id: "sensor.z1", state: "idle", attributes: { cycles } },
  };
}

describe("readCycles", () => {
  it("parses the schedule fields", () => {
    // `days` was replaced by `calendar` in 2.0.0. This test used to assert the
    // old key and kept passing, which is exactly why the read path drifting
    // out of sync with the sensor went unnoticed.
    const cycles = readCycles(zoneWithCycles([
      { cycle_id: "a1", name: "Mattina", enabled: true,
        trigger: { kind: "time", at: "06:30" },
        curve: { points: [[12, 0], [25, 15], [35, 23]], min: 1, max: 60, kind: "duration" },
        calendar: { mode: "weekdays", days: [0, 2, 4] },
        day_minutes: { "0": 10, "4": 20 }, amount: 15, heat: 8 },
    ]));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.calendar).toEqual({ mode: "weekdays", days: [0, 2, 4] });
    expect(cycles[0]?.day_minutes).toEqual({ "0": 10, "4": 20 });
    expect(cycles[0]?.amount).toBe(15);
    expect(cycles[0]?.heat).toBe(8);
  });

  it("tolerates missing schedule fields (day-less program)", () => {
    const cycles = readCycles(zoneWithCycles([{ cycle_id: "a1", name: "X" }]));
    expect(cycles[0]?.calendar).toBeUndefined();
    expect(cycles[0]?.day_minutes).toBeUndefined();
  });

  it("returns [] when there is no cycles attribute", () => {
    expect(readCycles({ zoneId: "z", name: "z", order: 1, cycleSwitches: [] })).toEqual([]);
  });
});

describe("readCycles: the panel's read-back path", () => {
  /**
   * Regression: the panel wrote the new fields correctly but never read them
   * back. `readCycles` still extracted the pre-2.0.0 `days` attribute and
   * ignored `calendar`, so the program list and the editor always showed
   * "every day" no matter what was stored — a saved change looked ignored.
   */
  const zoneWith = (cycle: Record<string, unknown>) =>
    ({ state: { attributes: { cycles: [cycle] } } }) as never;

  it("reads the calendar the sensor publishes", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "interval", interval_days: 3 } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "interval", interval_days: 3 });
  });

  it("reads a weekday calendar", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "weekdays", days: [0, 2, 4] } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "weekdays", days: [0, 2, 4] });
  });

  it("reads a parity calendar", () => {
    const info = readCycles(
      zoneWith({ cycle_id: "c1", calendar: { mode: "parity", parity: "odd" } }),
    )[0];
    expect(info?.calendar).toEqual({ mode: "parity", parity: "odd" });
  });

  it("reads the season and the advanced fields", () => {
    const info = readCycles(
      zoneWith({
        cycle_id: "c1",
        season_months: [6, 7, 8],
        soak_max_run_min: 10,
        soak_pause_min: 15,
        volume_safety_timeout_min: 45,
      }),
    )[0];
    expect(info?.season_months).toEqual([6, 7, 8]);
    expect(info?.soak_max_run_min).toBe(10);
    expect(info?.soak_pause_min).toBe(15);
    expect(info?.volume_safety_timeout_min).toBe(45);
  });

  it("leaves the calendar undefined when the attribute is absent", () => {
    const info = readCycles(zoneWith({ cycle_id: "c1" }))[0];
    expect(info?.calendar).toBeUndefined();
  });
});
