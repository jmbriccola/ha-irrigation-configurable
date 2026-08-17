import { asArray, asNumber, asString } from "./types";
import type { HomeAssistant } from "./types";

/**
 * The run log behind "how did each program's last run go".
 *
 * `get_run_history` shipped in 3.5.0 with its own storage, its own tests and
 * its own section of the card contract — and then three cards were built
 * without ever calling it. It is the service that exists to make **non-events**
 * visible: a cycle that does not start leaves nothing behind anywhere else, and
 * `zone_last_outcome` answers per *zone*, so a zone with three programs shows
 * one line and does not say which program it describes.
 *
 * Same discipline as `water-history.ts`, for the same reasons: asked from
 * `updated()` and never from `render()`, one request per key, and a failed
 * attempt that ages exactly like a successful one so a hub that is down is
 * asked once rather than on every frame.
 */

const DOMAIN = "irrigation_maestro";
const REFRESH_MS = 5 * 60 * 1000;
/** Enough to cover a fortnightly cadence twice over without a large payload. */
const WINDOW_DAYS = 30;

export interface RunEntry {
  at: string;
  programId: string;
  programName: string | null;
  result: string;
  reasonKey: string | null;
  durationMin: number | null;
  volumeL: number | null;
  scheduled: boolean;
}

interface Entry {
  attemptedAt: number;
  runs: RunEntry[] | null;
  inFlight: boolean;
}

function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseRuns(response: Record<string, unknown> | undefined): RunEntry[] {
  return asArray(response?.["runs"]).map((raw): RunEntry => {
    const record = raw as Record<string, unknown>;
    return {
      at: asString(record["at"]) ?? "",
      programId: asString(record["program_id"]) ?? "",
      programName: asString(record["program_name"]) ?? null,
      result: asString(record["result"]) ?? "",
      reasonKey: asString(record["reason_key"]) ?? null,
      durationMin: asNumber(record["duration_min"]) ?? null,
      volumeL: asNumber(record["volume_l"]) ?? null,
      scheduled: record["scheduled"] !== false,
    };
  });
}

/**
 * The most recent entry per program.
 *
 * Ordering is **not** assumed from the response even though the service returns
 * chronological entries: this reduces on the instant, so a future change to
 * that ordering cannot silently start showing the oldest run as the newest.
 */
export function lastRunPerProgram(runs: RunEntry[]): Map<string, RunEntry> {
  const latest = new Map<string, RunEntry>();
  for (const run of runs) {
    if (!run.programId) continue;
    const held = latest.get(run.programId);
    if (!held || Date.parse(run.at) > Date.parse(held.at)) {
      latest.set(run.programId, run);
    }
  }
  return latest;
}

export class RunHistoryCache {
  private readonly _entries = new Map<string, Entry>();

  /** The window's runs, or null while one is in flight, after a failure, or before the first request. */
  get(zoneId: string): RunEntry[] | null {
    return this._entries.get(zoneId)?.runs ?? null;
  }

  request(hass: HomeAssistant, zoneId: string, now: number, today: Date): void {
    const entry = this._entries.get(zoneId);
    if (entry?.inFlight) return;
    if (entry && now - entry.attemptedAt < REFRESH_MS) return;

    const start = new Date(today.getTime());
    start.setDate(start.getDate() - (WINDOW_DAYS - 1));

    this._entries.set(zoneId, {
      attemptedAt: now,
      runs: entry?.runs ?? null,
      inFlight: true,
    });

    void hass
      .callService(
        DOMAIN,
        "get_run_history",
        { zone_id: zoneId, start_date: isoDay(start), end_date: isoDay(today) },
        undefined,
        false,
        true,
      )
      .then((result) => {
        this._entries.set(zoneId, {
          attemptedAt: now,
          runs: parseRuns(result.response),
          inFlight: false,
        });
      })
      .catch(() => {
        this._entries.set(zoneId, { attemptedAt: now, runs: null, inFlight: false });
      });
  }
}
