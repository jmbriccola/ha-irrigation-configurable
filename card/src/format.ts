import type { CycleTrigger } from "./types";
import { asNumber, asString, clamp } from "./types";
import { localize } from "./localize/localize";

/* ------------------------------------------------------------------ */
/* Intl helpers (formatters cached per language)                       */
/* ------------------------------------------------------------------ */

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function rtf(lang: string): Intl.RelativeTimeFormat {
  let fmt = relativeFormatters.get(lang);
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    relativeFormatters.set(lang, fmt);
  }
  return fmt;
}

/** "in 2 hours" / "3 minutes ago" — undefined for unparsable input. */
export function formatRelative(
  iso: string | undefined,
  lang: string,
  nowMs = Date.now(),
): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  const diffS = Math.round((t - nowMs) / 1000);
  const abs = Math.abs(diffS);
  try {
    if (abs < 60) return rtf(lang).format(diffS, "second");
    if (abs < 3600) return rtf(lang).format(Math.round(diffS / 60), "minute");
    if (abs < 86400) return rtf(lang).format(Math.round(diffS / 3600), "hour");
    return rtf(lang).format(Math.round(diffS / 86400), "day");
  } catch {
    return undefined;
  }
}

/** "Jul 17, 6:30 PM" (locale-dependent) — undefined for bad input. */
export function formatDateTime(
  iso: string | undefined,
  lang: string,
): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  let fmt = dateTimeFormatters.get(lang);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    dateTimeFormatters.set(lang, fmt);
  }
  return fmt.format(t);
}

/** Date only, e.g. "Jul 24, 2026". */
export function formatDate(
  iso: string | undefined,
  lang: string,
): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  let fmt = dateFormatters.get(lang);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    dateFormatters.set(lang, fmt);
  }
  return fmt.format(t);
}

/** Fixed-decimals number, tolerant of string input. */
export function formatNumber(
  value: unknown,
  digits = 1,
): string | undefined {
  const n = asNumber(value);
  if (n === undefined) return undefined;
  return n.toFixed(digits).replace(/\.0+$/, (m) => (digits > 0 ? "" : m));
}

/* ------------------------------------------------------------------ */
/* Run progress (client-side, from run_started_at + run_duration_min)  */
/* ------------------------------------------------------------------ */

export interface RunProgress {
  /** 0..1 fraction of the frozen total duration elapsed. */
  fraction: number;
  /** Whole minutes remaining (>= 0). */
  remainingMin: number;
  /** Cumulative segment boundaries (0..1) from run_planned_runs. */
  segmentBounds: number[];
}

/** Normalize one entry of run_planned_runs into minutes. */
function plannedRunMinutes(item: unknown): number | undefined {
  const direct = asNumber(item);
  if (direct !== undefined) return direct;
  if (item && typeof item === "object") {
    const rec = item as Record<string, unknown>;
    return (
      asNumber(rec["duration_min"]) ??
      asNumber(rec["duration"]) ??
      asNumber(rec["minutes"])
    );
  }
  return undefined;
}

export function computeRunProgress(
  attributes: Record<string, unknown>,
  nowMs: number,
): RunProgress | undefined {
  const startedAt = asString(attributes["run_started_at"]);
  const durationMin = asNumber(attributes["run_duration_min"]);
  if (!startedAt || durationMin === undefined || durationMin <= 0) {
    return undefined;
  }
  const startMs = Date.parse(startedAt);
  if (Number.isNaN(startMs)) return undefined;

  const elapsedMin = (nowMs - startMs) / 60000;
  const fraction = clamp(elapsedMin / durationMin, 0, 1);
  const remainingMin = Math.max(0, Math.ceil(durationMin - elapsedMin));

  const segmentBounds: number[] = [];
  const planned = attributes["run_planned_runs"];
  if (Array.isArray(planned) && planned.length > 1) {
    const minutes = planned
      .map(plannedRunMinutes)
      .filter((m): m is number => m !== undefined && m > 0);
    const total = minutes.reduce((a, b) => a + b, 0);
    if (minutes.length > 1 && total > 0) {
      let acc = 0;
      for (let i = 0; i < minutes.length - 1; i += 1) {
        acc += minutes[i] ?? 0;
        segmentBounds.push(acc / total);
      }
    }
  }

  return { fraction, remainingMin, segmentBounds };
}

/* ------------------------------------------------------------------ */
/* Cycle trigger description                                           */
/* ------------------------------------------------------------------ */

function formatOffset(totalSeconds: number): string {
  const s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0) parts.push(`${m} min`);
  if (parts.length === 0) parts.push(`${s} s`);
  return parts.join(" ");
}

/** Human description of a cycle trigger ("Sunrise − 1 h", "At 06:30"…). */
export function describeTrigger(
  trigger: CycleTrigger | undefined,
  lang: string,
): string {
  if (!trigger || typeof trigger !== "object") return "";
  if (
    trigger.kind === "sun" &&
    (trigger.event === "sunrise" || trigger.event === "sunset")
  ) {
    const base = localize(
      lang,
      trigger.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset",
    );
    const offset = asNumber(trigger.offset_s) ?? 0;
    if (offset === 0) return base;
    const sign = offset < 0 ? "−" : "+";
    return `${base} ${sign} ${formatOffset(offset)}`;
  }
  const at = asString(trigger.at) ?? asString(trigger.time);
  if (at) return localize(lang, "trigger.at", { time: at });
  return asString(trigger.kind) ?? "";
}
