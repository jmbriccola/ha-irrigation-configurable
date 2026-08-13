/**
 * Pure scheduling logic for the Irrigazione panel. Weather math mirrors
 * engine/planner.resolve_day_curve + engine/curves.py via curve-math.ts.
 */
import { parseCurvePoints, previewFromMinutes, REFERENCE_TEMP, roundHalfEven, scaledValue } from "./curve-math";
import type { CycleInfo } from "./types";

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const LABELS: Record<string, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
};

export function weekdayLabels(lang: string): string[] {
  return LABELS[lang] ?? LABELS.en!;
}

export function everyDay(days?: number[]): boolean {
  return !days || days.length === 0 || days.length >= 7;
}

export function toggleWeekday(days: number[], wd: number): number[] {
  const set = new Set(days);
  if (set.has(wd)) set.delete(wd);
  else set.add(wd);
  return [...set].sort((a, b) => a - b);
}

/** Programs whose per-day map is empty water the same amount every day. */
export function isUniform(dayIntensityPct?: Record<string, number>): boolean {
  return !dayIntensityPct || Object.keys(dayIntensityPct).length === 0;
}

/** The scale in force on a given weekday: the override, else the uniform value. */
export function dayIntensity(cycle: Partial<CycleInfo>, wd: number): number {
  return cycle.day_intensity_pct?.[String(wd)] ?? cycle.intensity_pct ?? 100;
}

/** Minutes this program waters at the reference temperature on that weekday. */
export function dayBase(cycle: Partial<CycleInfo>, wd: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return roundHalfEven(
    scaledValue(points, REFERENCE_TEMP, dayIntensity(cycle, wd), cycle.curve?.min, cycle.curve?.max),
  );
}

/** Live preview while the user is dragging a minutes stepper (unsaved state). */
export function previewMinutes(cycle: Partial<CycleInfo>, minutesAtReference: number, weightedTemp: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return previewFromMinutes(points, minutesAtReference, weightedTemp, cycle.curve?.min, cycle.curve?.max);
}

/**
 * Whether the program editor's working minutes have actually diverged from
 * what was seeded from the program, so Save should write
 * `set_program_minutes`. An untouched control must dispatch nothing: the
 * service derives its intensity by dividing the given minutes by the
 * curve's *current* reference value, so re-sending an unchanged seeded
 * value after the curve itself changed underneath it (a curve save, a
 * curve copy) would silently rescale the curve back toward the old
 * number instead of leaving the fresh one in place.
 *
 * A flip of `sameForAll` itself always counts as a change, in both
 * directions — collapsing to uniform clears `day_intensity_pct` server-side
 * and expanding to per-day starts writing it, so the flag reaching Save
 * differently from how it was seeded is itself the edit, even if every
 * stepper still reads what it was seeded with.
 *
 * Short of that flip, only the mode actually in use is compared — the
 * uniform value when `sameForAll`, else the per-day map — since the other
 * mode's seed may be stale (it is not what the user is looking at or
 * editing).
 */
export function minutesChanged(
  sameForAll: boolean,
  seededSameForAll: boolean,
  seededUniform: number,
  uniform: number,
  seededDayMinutes: Record<string, number>,
  dayMinutes: Record<string, number>,
): boolean {
  if (sameForAll !== seededSameForAll) return true;
  if (sameForAll) return uniform !== seededUniform;
  const keys = new Set([...Object.keys(seededDayMinutes), ...Object.keys(dayMinutes)]);
  for (const key of keys) {
    if (seededDayMinutes[key] !== dayMinutes[key]) return true;
  }
  return false;
}
