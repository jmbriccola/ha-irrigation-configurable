import { describe, it, expect } from "vitest";
import { WaterHistoryCache } from "./water-history";
import type { HomeAssistant } from "./types";

interface Call {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  askedForResponse: boolean;
}

/**
 * The double honours `returnResponse` exactly as the panel's own double does,
 * and for the same reason: Home Assistant returns no `response` unless the
 * caller asked for one, so a double that answers regardless makes "forgot to
 * ask for the response" invisible.
 */
function fakeHass(
  respond: (call: Call) => unknown | Promise<unknown>,
): { hass: HomeAssistant; calls: Call[] } {
  const calls: Call[] = [];
  const hass: HomeAssistant = {
    states: {},
    async callService(domain, service, data, _target, _notifyOnError, returnResponse) {
      const call: Call = {
        domain,
        service,
        data: data ?? {},
        askedForResponse: returnResponse === true,
      };
      calls.push(call);
      const response = await respond(call);
      return {
        context: {},
        response: returnResponse
          ? (response as Record<string, unknown> | undefined)
          : undefined,
      };
    },
  };
  return { hass, calls };
}

function seriesResponse(days: { date: string; l: number; est?: boolean; gap_s?: number }[]) {
  return {
    start: days[0]?.date,
    end: days[days.length - 1]?.date,
    oldest_recorded: "2026-08-10",
    unit: "L",
    zones: [
      {
        zone_id: "z1",
        zone_name: "Vasi",
        total_l: days.reduce((sum, day) => sum + day.l, 0),
        days: days.map((day) => ({
          date: day.date,
          l: day.l,
          est: day.est ?? false,
          gap_s: day.gap_s ?? 0,
        })),
      },
    ],
  };
}

const DAYS = [
  { date: "2026-08-15", l: 10 },
  { date: "2026-08-16", l: 0, gap_s: 21600 },
  { date: "2026-08-17", l: 5, est: true },
];

const T0 = 1_000_000;

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("WaterHistoryCache", () => {
  it("asks for exactly the window it will draw, and asks for a response", async () => {
    const { hass, calls } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.domain).toBe("irrigation_maestro");
    expect(calls[0]?.service).toBe("get_water_history");
    expect(calls[0]?.askedForResponse).toBe(true);
    expect(calls[0]?.data["zone_id"]).toBe("z1");
    expect(calls[0]?.data["end_date"]).toBe("2026-08-17");
    // 30 inclusive days ending today: the first is 29 days back, not 30.
    expect(calls[0]?.data["start_date"]).toBe("2026-07-19");
  });

  it("does not fetch again for the same key — a render loop must cost nothing", async () => {
    const { hass, calls } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    for (let i = 0; i < 50; i += 1) {
      cache.request(hass, "z1", 30, T0 + i, new Date("2026-08-17T12:00:00Z"));
    }
    await settle();

    expect(calls).toHaveLength(1);
  });

  it("refetches when the period changes", async () => {
    const { hass, calls } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();
    cache.request(hass, "z1", 90, T0 + 1, new Date("2026-08-17T12:00:00Z"));
    await settle();

    expect(calls).toHaveLength(2);
    expect(calls[1]?.data["start_date"]).toBe("2026-05-20");
  });

  it("refetches when the zone changes", async () => {
    const { hass, calls } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();
    cache.request(hass, "z2", 30, T0 + 1, new Date("2026-08-17T12:00:00Z"));
    await settle();

    expect(calls).toHaveLength(2);
    expect(calls[1]?.data["zone_id"]).toBe("z2");
  });

  it("carries the response through unchanged — the card draws what the service said", async () => {
    const { hass } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();
    const series = cache.get("z1", 30);

    expect(series).not.toBeNull();
    expect(series?.days).toHaveLength(3);
    expect(series?.days[1]).toEqual({ date: "2026-08-16", l: 0, est: false, gap_s: 21600 });
    expect(series?.days[2]?.est).toBe(true);
    expect(series?.oldestRecorded).toBe("2026-08-10");
    expect(series?.totalL).toBe(15);
  });

  it("returns null for a key it has not fetched, and while one is in flight", () => {
    const { hass } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    expect(cache.get("z1", 30)).toBeNull();
    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    expect(cache.get("z1", 30)).toBeNull();
  });

  it("survives a failing service and does not retry in a tight loop", async () => {
    const { hass, calls } = fakeHass(() => {
      throw new Error("hub not loaded");
    });
    const cache = new WaterHistoryCache();

    for (let i = 0; i < 50; i += 1) {
      cache.request(hass, "z1", 30, T0 + i, new Date("2026-08-17T12:00:00Z"));
      await settle();
    }

    // One attempt, not fifty: a card whose hub is down must not hammer it.
    expect(calls).toHaveLength(1);
    expect(cache.get("z1", 30)).toBeNull();
  });

  it("retries once the entry has aged past the refresh interval", async () => {
    const { hass, calls } = fakeHass(() => seriesResponse(DAYS));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();
    cache.request(hass, "z1", 30, T0 + 10 * 60 * 1000, new Date("2026-08-17T12:00:00Z"));
    await settle();

    expect(calls).toHaveLength(2);
  });

  it("treats a response naming no zone as an empty series, not as a crash", async () => {
    const { hass } = fakeHass(() => ({ zones: [], oldest_recorded: null }));
    const cache = new WaterHistoryCache();

    cache.request(hass, "z1", 30, T0, new Date("2026-08-17T12:00:00Z"));
    await settle();
    const series = cache.get("z1", 30);

    expect(series).not.toBeNull();
    expect(series?.days).toEqual([]);
    expect(series?.oldestRecorded).toBeNull();
  });
});
