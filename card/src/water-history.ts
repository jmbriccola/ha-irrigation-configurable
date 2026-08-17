import { asArray, asNumber, asString } from "./types";
import type { HomeAssistant } from "./types";

/**
 * The consumption history behind the zone card's chart.
 *
 * One rule shapes this module: **never fetch on render.** A Lit render can run
 * many times a second, and a service round trip per frame would be a
 * self-inflicted denial of service on the user's own installation. So the card
 * calls `request()` from `updated()`, which decides whether a fetch is owed,
 * and reads `get()` from `render()`, which never touches the network.
 *
 * The service returns a **dense** series — one point per day including the
 * zeros — and this module carries it through unchanged. Densifying, or
 * dropping empty days to "save space", would destroy exactly the distinction
 * the backend went to the trouble of making: a day with no water and a day
 * whose meter could not be read are different facts.
 */

const DOMAIN = "irrigation_maestro";

/** How long a fetched window stays fresh. Water accrues by the minute at most. */
const REFRESH_MS = 5 * 60 * 1000;

export interface HistoryDay {
  date: string;
  l: number;
  est: boolean;
  gap_s: number;
}

export interface HistorySeries {
  days: HistoryDay[];
  /**
   * The oldest day the *installation* recorded anything for, or null.
   *
   * Not the oldest day this zone existed — the service computes it across the
   * whole history. A zone added last week still shows real zeros for the
   * months before it was created, and the chart's wording is narrowed to what
   * this field actually supports (see the zone-card spec, §4.1).
   */
  oldestRecorded: string | null;
  totalL: number;
}

interface Entry {
  /** The instant of the last attempt, successful or not — a failure must age too. */
  attemptedAt: number;
  series: HistorySeries | null;
  inFlight: boolean;
}

/** Local ISO day, without dragging a timezone library in for it. */
function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSeries(response: Record<string, unknown> | undefined): HistorySeries {
  const zones = asArray(response?.["zones"]);
  const zone = zones[0] as Record<string, unknown> | undefined;
  const days = asArray(zone?.["days"]).map((raw): HistoryDay => {
    const record = raw as Record<string, unknown>;
    return {
      date: asString(record["date"]) ?? "",
      l: asNumber(record["l"]) ?? 0,
      est: record["est"] === true,
      gap_s: asNumber(record["gap_s"]) ?? 0,
    };
  });
  return {
    days,
    oldestRecorded: asString(response?.["oldest_recorded"]) ?? null,
    totalL: asNumber(zone?.["total_l"]) ?? 0,
  };
}

export class WaterHistoryCache {
  private readonly _entries = new Map<string, Entry>();

  private static _key(zoneId: string, days: number): string {
    return `${zoneId}|${days}`;
  }

  /** The fetched series, or null while one is in flight, after a failure, or before the first request. */
  get(zoneId: string, days: number): HistorySeries | null {
    return this._entries.get(WaterHistoryCache._key(zoneId, days))?.series ?? null;
  }

  /**
   * Fetch if one is owed. Safe to call on every update — that is the point.
   *
   * ``now`` and ``today`` are passed in rather than read from a clock here, so
   * the tests can drive both without freezing global time, the same division
   * of labour the Python engine modules use.
   */
  request(hass: HomeAssistant, zoneId: string, days: number, now: number, today: Date): void {
    const key = WaterHistoryCache._key(zoneId, days);
    const entry = this._entries.get(key);
    if (entry?.inFlight) return;
    // A failed attempt ages exactly like a successful one. Without that, a card
    // whose hub is down would retry on every single render forever.
    if (entry && now - entry.attemptedAt < REFRESH_MS) return;

    const end = new Date(today.getTime());
    const start = new Date(today.getTime());
    // `days` inclusive days ending today: the first is days-1 back, not days.
    start.setDate(start.getDate() - (days - 1));

    const pending: Entry = { attemptedAt: now, series: entry?.series ?? null, inFlight: true };
    this._entries.set(key, pending);

    void hass
      .callService(
        DOMAIN,
        "get_water_history",
        { zone_id: zoneId, start_date: isoDay(start), end_date: isoDay(end) },
        undefined,
        false,
        true,
      )
      .then((result) => {
        this._entries.set(key, {
          attemptedAt: now,
          series: parseSeries(result.response),
          inFlight: false,
        });
      })
      .catch(() => {
        // The chart's absence is the degradation; a thrown error inside a
        // render would take the whole card down for a block the user may not
        // even have enabled.
        this._entries.set(key, { attemptedAt: now, series: null, inFlight: false });
      });
  }
}
