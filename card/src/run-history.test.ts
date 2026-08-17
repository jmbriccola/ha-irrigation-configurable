import { describe, it, expect } from "vitest";
import { lastRunPerProgram, RunHistoryCache } from "./run-history";
import type { RunEntry } from "./run-history";
import type { HomeAssistant } from "./types";

interface Call {
  service: string;
  data: Record<string, unknown>;
  askedForResponse: boolean;
}

function fakeHass(respond: (call: Call) => unknown): { hass: HomeAssistant; calls: Call[] } {
  const calls: Call[] = [];
  const hass: HomeAssistant = {
    states: {},
    async callService(_domain, service, data, _t, _n, returnResponse) {
      const call: Call = {
        service,
        data: data ?? {},
        askedForResponse: returnResponse === true,
      };
      calls.push(call);
      const response = await respond(call);
      return {
        context: {},
        response: returnResponse ? (response as Record<string, unknown>) : undefined,
      };
    },
  };
  return { hass, calls };
}

function run(over: Partial<RunEntry> = {}): RunEntry {
  return {
    at: "2026-08-16T04:30:00+00:00",
    programId: "p1",
    programName: "Mattino",
    result: "completed",
    reasonKey: null,
    durationMin: 11,
    volumeL: 47,
    scheduled: true,
    ...over,
  };
}

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("lastRunPerProgram", () => {
  it("keeps the most recent entry for each program", () => {
    const latest = lastRunPerProgram([
      run({ programId: "a", at: "2026-08-10T05:00:00+00:00" }),
      run({ programId: "a", at: "2026-08-16T05:00:00+00:00", volumeL: 99 }),
      run({ programId: "b", at: "2026-08-12T05:00:00+00:00" }),
    ]);

    expect(latest.size).toBe(2);
    expect(latest.get("a")?.volumeL).toBe(99);
    expect(latest.get("b")?.at).toBe("2026-08-12T05:00:00+00:00");
  });

  it("does not trust the response's ordering", () => {
    // The service returns chronological entries today. Reducing on the instant
    // means a future change to that ordering cannot silently start showing the
    // oldest run as the newest.
    const latest = lastRunPerProgram([
      run({ at: "2026-08-16T05:00:00+00:00", volumeL: 99 }),
      run({ at: "2026-08-10T05:00:00+00:00", volumeL: 1 }),
    ]);

    expect(latest.get("p1")?.volumeL).toBe(99);
  });

  it("keeps a skip, which is the whole reason the run log exists", () => {
    const latest = lastRunPerProgram([
      run({ result: "completed", at: "2026-08-10T05:00:00+00:00" }),
      run({
        result: "skipped",
        reasonKey: "budget_sufficient",
        durationMin: null,
        volumeL: null,
        at: "2026-08-16T05:00:00+00:00",
      }),
    ]);

    expect(latest.get("p1")?.result).toBe("skipped");
    expect(latest.get("p1")?.reasonKey).toBe("budget_sufficient");
  });

  it("ignores an entry with no program id rather than grouping them together", () => {
    expect(lastRunPerProgram([run({ programId: "" })]).size).toBe(0);
  });

  it("is empty for an empty log, which the caller must read as 'never run'", () => {
    expect(lastRunPerProgram([]).size).toBe(0);
  });
});

describe("RunHistoryCache", () => {
  const TODAY = new Date("2026-08-17T12:00:00Z");

  it("asks the run-history service for its window, and asks for a response", async () => {
    const { hass, calls } = fakeHass(() => ({ runs: [] }));
    const cache = new RunHistoryCache();

    cache.request(hass, "z1", 1000, TODAY);
    await settle();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.service).toBe("get_run_history");
    expect(calls[0]?.askedForResponse).toBe(true);
    expect(calls[0]?.data["zone_id"]).toBe("z1");
    expect(calls[0]?.data["end_date"]).toBe("2026-08-17");
    expect(calls[0]?.data["start_date"]).toBe("2026-07-19");
  });

  it("does not fetch again for the same zone — a render loop must cost nothing", async () => {
    const { hass, calls } = fakeHass(() => ({ runs: [] }));
    const cache = new RunHistoryCache();

    for (let i = 0; i < 50; i += 1) cache.request(hass, "z1", 1000 + i, TODAY);
    await settle();

    expect(calls).toHaveLength(1);
  });

  it("survives a failing service and does not retry in a tight loop", async () => {
    const { hass, calls } = fakeHass(() => {
      throw new Error("hub not loaded");
    });
    const cache = new RunHistoryCache();

    for (let i = 0; i < 50; i += 1) {
      cache.request(hass, "z1", 1000 + i, TODAY);
      await settle();
    }

    expect(calls).toHaveLength(1);
    expect(cache.get("z1")).toBeNull();
  });

  it("carries the response through, skips and all", async () => {
    const { hass } = fakeHass(() => ({
      runs: [
        {
          at: "2026-08-16T04:30:00+00:00",
          program_id: "p1",
          program_name: "Mattino",
          result: "skipped",
          reason_key: "wind",
          duration_min: null,
          volume_l: null,
          scheduled: true,
        },
      ],
    }));
    const cache = new RunHistoryCache();

    cache.request(hass, "z1", 1000, TODAY);
    await settle();
    const runs = cache.get("z1");

    expect(runs).toHaveLength(1);
    expect(runs?.[0]?.result).toBe("skipped");
    expect(runs?.[0]?.reasonKey).toBe("wind");
    expect(runs?.[0]?.durationMin).toBeNull();
    expect(runs?.[0]?.programName).toBe("Mattino");
  });

  it("treats a manual run as unscheduled, and everything else as scheduled", async () => {
    const { hass } = fakeHass(() => ({
      runs: [
        { at: "2026-08-16T04:30:00+00:00", program_id: "p1", result: "completed", scheduled: false },
        { at: "2026-08-16T05:30:00+00:00", program_id: "p2", result: "completed" },
      ],
    }));
    const cache = new RunHistoryCache();

    cache.request(hass, "z1", 1000, TODAY);
    await settle();

    expect(cache.get("z1")?.[0]?.scheduled).toBe(false);
    expect(cache.get("z1")?.[1]?.scheduled).toBe(true);
  });
});
