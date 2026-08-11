/**
 * Shared curve math for the card. The semantic mapping mirrors
 * custom_components/irrigation_maestro/engine/semantic.py EXACTLY — keep the two
 * in lockstep (guarded by curve-math.test.ts). curveValue mirrors
 * engine/curves.py curve_value with adjustment 100.
 */
import { asNumber } from "./types";

export const COOL = 12;
export const MILD = 25;
export const HOT = 35;
export const AMOUNT_MIN = 3;
export const AMOUNT_MAX = 45;
export const HEAT_MIN = 0;
export const HEAT_MAX = 30;

const SLOPE_SPAN = (MILD - COOL) / 10; // 1.3

export type CurvePoint = readonly [number, number];

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Round-half-to-even (banker's rounding), matching Python's built-in
 * round(). JS's Math.round is round-half-up and diverges from Python at
 * exact .5 boundaries — using it here would break "preview == saved".
 */
export function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

export function pointsFromSemantic(
  amount: number,
  heat: number,
): [CurvePoint, CurvePoint, CurvePoint] {
  const cool = Math.max(0, roundHalfEven(amount - SLOPE_SPAN * heat));
  return [
    [COOL, cool],
    [MILD, amount],
    [HOT, amount + heat],
  ];
}

export function curveValue(
  points: CurvePoint[],
  temp: number,
  min?: number,
  max?: number,
): number {
  const first = points[0];
  const last = points[points.length - 1];
  let raw: number;
  if (!first || !last) {
    raw = 0;
  } else if (temp <= first[0]) {
    raw = first[1];
  } else if (temp >= last[0]) {
    raw = last[1];
  } else {
    raw = last[1];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      if (!p0 || !p1) continue;
      const [t0, v0] = p0;
      const [t1, v1] = p1;
      if (t0 <= temp && temp <= t1) {
        raw = v0 + ((v1 - v0) * (temp - t0)) / (t1 - t0);
        break;
      }
    }
  }
  if (min !== undefined) raw = Math.max(raw, min);
  if (max !== undefined) raw = Math.min(raw, max);
  return raw;
}

export function semanticFromPoints(points: CurvePoint[]): {
  amount: number;
  heat: number;
} {
  const mild = curveValue(points, MILD);
  const hot = curveValue(points, HOT);
  return {
    amount: clamp(roundHalfEven(mild), AMOUNT_MIN, AMOUNT_MAX),
    heat: clamp(roundHalfEven(hot - mild), HEAT_MIN, HEAT_MAX),
  };
}

export function parseCurvePoints(raw: unknown): CurvePoint[] {
  if (!Array.isArray(raw)) return [];
  const points: CurvePoint[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const x = asNumber(item[0]);
    const y = asNumber(item[1]);
    if (x !== undefined && y !== undefined) points.push([x, y]);
  }
  return [...points].sort((a, b) => a[0] - b[0]);
}
