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
  it("parses the new schedule fields", () => {
    const cycles = readCycles(zoneWithCycles([
      { cycle_id: "a1", name: "Mattina", enabled: true,
        trigger: { kind: "time", at: "06:30" },
        curve: { points: [[12, 0], [25, 15], [35, 23]], min: 1, max: 60, kind: "duration" },
        days: [0, 2, 4], day_minutes: { "0": 10, "4": 20 }, amount: 15, heat: 8 },
    ]));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.days).toEqual([0, 2, 4]);
    expect(cycles[0]?.day_minutes).toEqual({ "0": 10, "4": 20 });
    expect(cycles[0]?.amount).toBe(15);
    expect(cycles[0]?.heat).toBe(8);
  });

  it("tolerates missing schedule fields (day-less program)", () => {
    const cycles = readCycles(zoneWithCycles([{ cycle_id: "a1", name: "X" }]));
    expect(cycles[0]?.days).toBeUndefined();
    expect(cycles[0]?.day_minutes).toBeUndefined();
  });

  it("returns [] when there is no cycles attribute", () => {
    expect(readCycles({ zoneId: "z", name: "z", order: 1, cycleSwitches: [] })).toEqual([]);
  });
});
