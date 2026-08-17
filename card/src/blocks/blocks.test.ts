import { describe, it, expect } from "vitest";
import { programRows } from "./programs-block";
import { showsChart } from "./consumption-block";
import { hardwareRows } from "./hardware-block";
import type { CycleInfo } from "../types";

const CURVE = { points: [[20, 10] as [number, number]], min: 1, max: 60, kind: "duration" };

function cycle(over: Partial<CycleInfo> = {}): CycleInfo {
  return { cycle_id: "c1", name: "Morning", enabled: true, curve: CURVE, ...over };
}

describe("programRows", () => {
  it("shows DELIVERY minutes, with the zone's adjustment folded in", () => {
    // The contract is explicit: a program list describes what actually gets
    // watered, so the zone's adjustment belongs in the number. Showing the
    // setting instead would print minutes the zone will never deliver.
    const full = programRows("en", [cycle()], 0, 100, 20);
    const reduced = programRows("en", [cycle()], 0, 70, 20);

    expect(full[0]?.minutes).toBe(10);
    expect(reduced[0]?.minutes).toBe(7);
  });

  it("shows no minutes at all when there is no weighted temperature", () => {
    // A dash is honest; a number derived from a temperature nobody measured
    // is the plausible-but-false figure this project refuses.
    expect(programRows("en", [cycle()], 0, 100, undefined)[0]?.minutes).toBeNull();
  });

  it("renders each program's calendar in words", () => {
    const rows = programRows(
      "it",
      [
        cycle({ calendar: { mode: "weekdays", days: [0, 3] } }),
        cycle({
          cycle_id: "c2",
          calendar: { mode: "interval", interval_days: 3 },
          last_completed: "2026-08-14",
        }),
      ],
      0,
      100,
      20,
    );

    expect(rows[0]?.calendar).toBe("lun e gio");
    expect(rows[1]?.calendar).toBe("ogni 3 giorni · ultimo completato il 14/08");
  });

  it("keeps the zone's published order", () => {
    const rows = programRows("en", [cycle({ cycle_id: "a" }), cycle({ cycle_id: "b" })], 0, 100, 20);
    expect(rows.map((row) => row.cycle.cycle_id)).toEqual(["a", "b"]);
  });
});

describe("showsChart", () => {
  it("draws the integration's series only when the integration is the source", () => {
    // With an external source the series would sit under someone else's
    // totals, presenting two accountings as though they agreed.
    expect(showsChart("internal", "measured")).toBe(true);
    expect(showsChart("entity", "measured")).toBe(false);
  });

  it("draws nothing when nothing is being recorded at all", () => {
    expect(showsChart("internal", "unavailable")).toBe(false);
  });

  it("still draws for an estimated zone — estimated litres are real bookkeeping", () => {
    expect(showsChart("internal", "estimated")).toBe(true);
  });

  it("draws when the zone said nothing about accounting, rather than hiding on silence", () => {
    expect(showsChart("internal", undefined)).toBe(true);
  });
});

describe("hardwareRows", () => {
  it("declares an absent capability rather than hiding it", () => {
    // A sensor-shaped badge that would never fire is worse than a plain
    // statement that the sensor is not there.
    const rows = hardwareRows({ leak_detection: "unavailable" }, {});
    const leak = rows.find((row) => row.key === "leak_detection");

    expect(leak?.state).toBe("unavailable");
    expect(leak?.adoptable).toBe(false);
  });

  it("offers adoption only for a candidate the backend actually named", () => {
    const named = hardwareRows(
      { leak_detection: "candidate_available" },
      { leak_candidate: "binary_sensor.vasi_moisture" },
    );
    const unnamed = hardwareRows({ leak_detection: "candidate_available" }, {});

    expect(named.find((row) => row.key === "leak_detection")?.adoptable).toBe(true);
    expect(unnamed.find((row) => row.key === "leak_detection")?.adoptable).toBe(false);
  });

  it("never offers adoption for something already configured", () => {
    const rows = hardwareRows(
      { water_supply: "configured" },
      { supply_candidate: "binary_sensor.vasi_problem" },
    );

    expect(rows.find((row) => row.key === "water_supply")?.adoptable).toBe(false);
  });

  it("reports every capability, defaulting a silent one to absent", () => {
    const rows = hardwareRows({}, {});

    expect(rows.map((row) => row.key)).toEqual([
      "water_accounting",
      "leak_watch",
      "leak_detection",
      "water_supply",
    ]);
    expect(rows.every((row) => row.state === "unavailable")).toBe(true);
  });

  it("carries leak_watch through, which is the key a coverage badge must branch on", () => {
    // leak_detection knows nothing about flow: a zone watched entirely by its
    // own meter reads "unavailable" there while being fully covered.
    const rows = hardwareRows({ leak_watch: "system", leak_detection: "unavailable" }, {});

    expect(rows.find((row) => row.key === "leak_watch")?.state).toBe("system");
  });
});
