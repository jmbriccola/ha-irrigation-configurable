/**
 * Minimal schedule helpers shared by the panel's program list. Weekday
 * encoding: 0=Mon..6=Sun. Task 5 extends this file with the remaining
 * schedule-math helpers (chip set ↔ day array, per-day minutes map) and
 * their own tests — keep this file additive.
 */

const WEEKDAY_LABELS: Record<string, readonly string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
};

/** Short weekday labels for the given language, Monday first (0=Mon..6=Sun). */
export function weekdayLabels(lang: string): readonly string[] {
  return WEEKDAY_LABELS[lang] ?? WEEKDAY_LABELS["en"]!;
}

/**
 * True when `days` represents "every day": undefined, empty, or containing
 * all 7 weekdays (0=Mon..6=Sun) — renders as every chip highlighted.
 */
export function everyDay(days?: number[]): boolean {
  if (!days || days.length === 0) return true;
  const set = new Set(days);
  for (let wd = 0; wd < 7; wd += 1) {
    if (!set.has(wd)) return false;
  }
  return true;
}
