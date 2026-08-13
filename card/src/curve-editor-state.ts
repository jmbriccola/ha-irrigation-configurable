import type { CurvePoint } from "./curve-math";

/** Points, ordered by temperature. The editor keeps this invariant after
 * every edit so the curve is always renderable and always valid to save. */
export function sortPoints(points: CurvePoint[]): CurvePoint[] {
  return [...points].sort((a, b) => a[0] - b[0]);
}

/**
 * Insert a point after `index`: midway to the next one, or 5 degrees past
 * the end when there is no next one. Halving an interval is what a user
 * means by "give me another handle here".
 */
export function addPoint(points: CurvePoint[], index: number): CurvePoint[] {
  const current = points[index];
  if (!current) return points;
  const next = points[index + 1];
  const inserted: CurvePoint = next
    ? [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2]
    : [current[0] + 5, current[1]];
  return sortPoints([...points, inserted]);
}

/** Remove a point, unless it is the only one left — an empty curve is invalid. */
export function removePoint(points: CurvePoint[], index: number): CurvePoint[] {
  if (points.length <= 1) return points;
  return points.filter((_, i) => i !== index);
}

/** Replace one point's temperature and value, leaving the order to the caller. */
export function updatePoint(
  points: CurvePoint[],
  index: number,
  temp: number,
  value: number,
): CurvePoint[] {
  const next = [...points];
  if (!next[index]) return points;
  next[index] = [temp, Math.max(0, value)];
  return next;
}
