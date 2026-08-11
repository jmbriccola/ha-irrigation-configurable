/**
 * Pure scheduling logic for the Irrigazione panel. Weather math mirrors
 * engine/planner.resolve_day_curve + engine/semantic.py via curve-math.ts.
 */
import { pointsFromSemantic, curveValue, roundHalfEven } from "./curve-math";

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

export function isUniform(dayMinutes?: Record<string, number>): boolean {
  return !dayMinutes || Object.keys(dayMinutes).length === 0;
}

export function dayBase(
  cycle: { amount?: number; day_minutes?: Record<string, number> },
  wd: number,
): number {
  return cycle.day_minutes?.[String(wd)] ?? cycle.amount ?? 0;
}

export function effectiveMinutes(
  base: number,
  heat: number,
  weightedTemp: number,
  min?: number,
  max?: number,
): number {
  return roundHalfEven(curveValue(pointsFromSemantic(base, heat), weightedTemp, min, max));
}
