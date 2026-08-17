import { localize } from "./localize/localize";

/**
 * A program's calendar, rendered as a phrase a person can check at a glance.
 *
 * Diagnostic #5 from the brief: "Mon and Thu" and "every 3 days, last
 * completed on the 14th" are very different behaviours, and until this module
 * they were distinguishable only by reading the stored JSON. The interval half
 * matters most — "every 3 days" alone is half an answer, because a zone that
 * has not watered in nine days looks identical whether its marker is stale,
 * its runs were skipped, or the count is running from a day nobody expected.
 *
 * Pure: no Lit, no clock, and no `toLocaleDateString`. Weekday names come from
 * the card's own dictionary, so the card's language wins over the browser's —
 * an Italian card must not print English weekdays because Chrome is English.
 */

export interface CalendarConfig {
  mode: "weekdays" | "interval" | "parity";
  days?: number[];
  interval_days?: number;
  parity?: "odd" | "even";
}

const WEEKDAY_KEYS = [
  "weekday.0",
  "weekday.1",
  "weekday.2",
  "weekday.3",
  "weekday.4",
  "weekday.5",
  "weekday.6",
] as const;

/** "lun, mer e ven" — separators plus the language's own final conjunction. */
function joinDays(lang: string, days: number[]): string {
  // Filtered rather than asserted: the caller already bounds the days to 0..6,
  // and `noUncheckedIndexedAccess` is right to want that proved here too
  // rather than trusted across a function boundary.
  const names = days
    .map((day) => WEEKDAY_KEYS[day])
    .filter((key): key is (typeof WEEKDAY_KEYS)[number] => key !== undefined)
    .map((key) => localize(lang, key));
  if (names.length <= 1) return names[0] ?? "";
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} ${localize(lang, "list.and")} ${last}`;
}

/**
 * "14/08" from an ISO date, or null when there is nothing usable.
 *
 * Day/month only: the year is noise next to a cadence measured in days, and
 * a marker older than a year is a different problem than this phrase is for.
 * A malformed value yields null rather than being printed raw — storage is
 * trusted for its shape, not for its contents.
 */
function shortDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${day}/${month}`;
}

export function calendarText(
  lang: string,
  calendar: CalendarConfig | undefined,
  lastCompleted?: string | null,
): string {
  const everyDay = localize(lang, "calendar.every_day");

  if (calendar?.mode === "weekdays") {
    const days = [...new Set(calendar.days ?? [])]
      .filter((day) => day >= 0 && day <= 6)
      .sort((a, b) => a - b);
    // An empty selection means every day, which is what the backend means by
    // it (`set_program_schedule`: "empty/omitted = every day").
    if (days.length === 0 || days.length === 7) return everyDay;
    return joinDays(lang, days);
  }

  if (calendar?.mode === "interval") {
    const n = calendar.interval_days ?? 1;
    const cadence = n === 1 ? everyDay : localize(lang, "calendar.interval", { n });
    const stamp = lastCompleted ? shortDate(lastCompleted) : null;
    const marker = stamp
      ? localize(lang, "calendar.last_completed", { date: stamp })
      : localize(lang, "calendar.never_completed");
    // The marker is not optional decoration: it is the half that makes the
    // cadence checkable, so it is always rendered, including when absent.
    return `${cadence} · ${marker}`;
  }

  if (calendar?.mode === "parity") {
    return localize(
      lang,
      calendar.parity === "even" ? "calendar.parity_even" : "calendar.parity_odd",
    );
  }

  // An unknown or missing mode. Storage may grow one before the card does, and
  // a card that blanked or threw here would take the whole program row down
  // with it. "Every day" is the backend's own default and the least wrong
  // thing to show.
  return everyDay;
}
