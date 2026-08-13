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

/** Minutes this program will water at the given weighted temperature. */
export function effectiveMinutes(cycle: Partial<CycleInfo>, wd: number, weightedTemp: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return roundHalfEven(
    scaledValue(points, weightedTemp, dayIntensity(cycle, wd), cycle.curve?.min, cycle.curve?.max),
  );
}

/** Live preview while the user is dragging a minutes stepper (unsaved state). */
export function previewMinutes(cycle: Partial<CycleInfo>, minutesAtReference: number, weightedTemp: number): number {
  const points = parseCurvePoints(cycle.curve?.points);
  return previewFromMinutes(points, minutesAtReference, weightedTemp, cycle.curve?.min, cycle.curve?.max);
}
