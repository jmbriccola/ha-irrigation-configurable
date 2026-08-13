/**
 * Shared curve math for the card.
 *
 * `rawValue`/`scaledValue`/`previewFromMinutes`/`validatePoints` mirror
 * `custom_components/irrigation_maestro/engine/curves.py` EXACTLY — keep the
 * two in lockstep (guarded by curve-math.test.ts). The old semantic mapping
 * (`pointsFromSemantic`/`semanticFromPoints`/`curveValue`, mirroring
 * `engine/semantic.py`) was retired once `curve-editor.ts` became a real
 * point editor that authors curves directly instead of deriving them from a
 * semantic amount/heat pair.
 */
import { asNumber } from "./types";

export type CurvePoint = readonly [number, number];

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

/** The reference temperature the quick minutes control converts against. */
export const REFERENCE_TEMP = 25;

/** Temperatures the editor previews the curve at. */
export const PREVIEW_TEMPS = [5, 12, 20, 25, 30, 35, 40] as const;

/**
 * The curve's raw value: linear between control points, flat beyond the
 * extremes, no intensity and no clamps. Mirrors engine/curves.py::interpolate.
 */
export function rawValue(points: CurvePoint[], temp: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (temp <= first[0]) return first[1];
  if (temp >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (!p0 || !p1) continue;
    const [t0, v0] = p0;
    const [t1, v1] = p1;
    if (t0 <= temp && temp <= t1) return v0 + ((v1 - v0) * (temp - t0)) / (t1 - t0);
  }
  return last[1];
}

/**
 * The configured value: raw, then the intensity, then the clamps — the same
 * order engine/curves.py::curve_value applies, so the preview and the water
 * delivered cannot disagree. The clamps are absolute guards and are NOT
 * scaled with the value they guard.
 */
export function scaledValue(
  points: CurvePoint[],
  temp: number,
  intensityPct = 100,
  min?: number,
  max?: number,
): number {
  let value = (rawValue(points, temp) * intensityPct) / 100;
  if (min !== undefined) value = Math.max(value, min);
  if (max !== undefined) value = Math.min(value, max);
  return value;
}

/**
 * The curve read at `temp` when the user has asked for `minutesAtReference`
 * minutes at 25 C. Algebraically identical to the intensity the backend will
 * store (100 * minutes / raw(25)), so the live preview matches what is saved.
 */
export function previewFromMinutes(
  points: CurvePoint[],
  minutesAtReference: number,
  temp: number,
  min?: number,
  max?: number,
): number {
  const reference = rawValue(points, REFERENCE_TEMP);
  if (reference <= 0) return 0; // a curve worth nothing cannot be scaled
  return roundHalfEven(scaledValue(points, temp, (100 * minutesAtReference) / reference, min, max));
}

/**
 * Mirrors engine/curves.py::validate_points. Returns an error key the card
 * localises, or null when the points are valid.
 */
export function validatePoints(points: CurvePoint[]): string | null {
  if (points.length === 0) return "curve_empty";
  for (const point of points) {
    if (point[1] < 0) return "curve_negative_value";
  }
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    if (!previous || !current) continue;
    if (current[0] <= previous[0]) return "curve_temps_not_increasing";
  }
  return null;
}
