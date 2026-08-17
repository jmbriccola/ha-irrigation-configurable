import { localize } from "./localize/localize";

/**
 * The weighted temperature, broken into the five days that produced it.
 *
 * **The weights published by `hub_weighted_temp` are the CONFIGURED ones.**
 * `weighted_temperature` renormalises over the days that are actually
 * available: a missing day is never counted as 0 °C, its weight is
 * redistributed proportionally across the rest. So on a day where one of the
 * five values is null, the configured weight beside it is not the weight that
 * applied — and printing it as though it were would be a diagnostic screen
 * lying about how a decision was made, which is the worst place for it.
 *
 * The effective weights are deliberately not computed here: that would be a
 * second implementation of a rule living in a frozen engine file. Instead a
 * missing day is marked `missing`, and the renderer strikes it through and
 * says its weight was redistributed rather than showing a number.
 */

export interface WeightRow {
  /** Dictionary key for the day's label. */
  key: string;
  /** The day's maximum, or null when it never arrived. */
  value: number | null;
  /** The configured weight, or null when the backend published none (older install). */
  weight: number | null;
  /** True when the value is absent, so its weight was redistributed elsewhere. */
  missing: boolean;
}

const DAY_KEYS = [
  "temp_d3",
  "temp_d2",
  "temp_d1",
  "temp_today_eff",
  "temp_tomorrow",
] as const;

export function weightRows(
  attributes: Record<string, unknown> | undefined,
  weights: unknown,
): WeightRow[] {
  const configured = Array.isArray(weights) ? weights : [];
  return DAY_KEYS.map((key, index) => {
    const raw = attributes?.[key];
    const value = typeof raw === "number" ? raw : null;
    const weight = typeof configured[index] === "number" ? (configured[index] as number) : null;
    return { key, value, weight, missing: value === null };
  });
}

/** True when every day arrived, so the configured weights ARE the effective ones. */
export function weightsAreEffective(rows: WeightRow[]): boolean {
  return rows.every((row) => !row.missing);
}

export type NotificationVerdict = "ok" | "muted" | "partial" | "unchecked";

export interface NotificationSummary {
  verdict: NotificationVerdict;
  /** Events that are enabled and would reach nobody. */
  silentEvents: string[];
  /** Recipient services the integration cannot resolve. */
  unreachable: string[];
}

/**
 * What `notification_status` actually means for a person.
 *
 * Diagnostic #3 from the brief: "enabled with no recipients" becomes visible
 * instead of being discovered when the alarm does not arrive. A failed call
 * degrades to `unchecked` and never to `ok` — claiming the notifications are
 * fine because we could not ask is the exact failure this screen exists to
 * prevent.
 */
export function notificationSummary(
  response: Record<string, unknown> | null | undefined,
): NotificationSummary {
  if (!response) return { verdict: "unchecked", silentEvents: [], unreachable: [] };
  const silentEvents = Array.isArray(response["enabled_without_target"])
    ? (response["enabled_without_target"] as unknown[]).map(String)
    : [];
  const unreachableMap = (response["unreachable"] ?? {}) as Record<string, unknown>;
  const unreachable = Object.keys(unreachableMap);
  const raw = response["verdict"];
  const verdict: NotificationVerdict =
    raw === "mute" || raw === "muted"
      ? "muted"
      : silentEvents.length > 0 || unreachable.length > 0
        ? "partial"
        : "ok";
  return { verdict, silentEvents, unreachable };
}

/** One line for the health block; the detail rides beneath it. */
export function notificationHeadline(lang: string, summary: NotificationSummary): string {
  switch (summary.verdict) {
    case "muted":
      return localize(lang, "health.notifications_muted");
    case "partial":
      return localize(lang, "health.notifications_partial", {
        n: summary.silentEvents.length + summary.unreachable.length,
      });
    case "unchecked":
      return localize(lang, "health.notifications_unchecked");
    default:
      return localize(lang, "health.notifications_ok");
  }
}
