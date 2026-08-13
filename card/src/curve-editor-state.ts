import { roundHalfEven } from "./curve-math";
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

/**
 * The `kind` field for a save payload: included only when the kind
 * selector was actually offered to the user (`offerKind` — mirrors
 * `zoneHasFlowMeter`). A zone with no usable flow meter must never be able
 * to change a stored curve's kind in either direction merely by opening
 * and re-saving the editor — omitting the key (not sending
 * `kind: undefined`) is what makes `set_curve` fall back to the program's
 * current kind (`services.py::_async_set_curve`), so a meterless zone's
 * existing volume curve round-trips through this editor unchanged.
 */
export function curveKindForSave(
  kind: "duration" | "volume",
  offerKind: boolean,
): "duration" | "volume" | undefined {
  return offerKind ? kind : undefined;
}

/**
 * Whether the editor must warn that saving here resets the program's
 * watering strength. `set_curve` clears BOTH `intensity_pct` and
 * `day_intensity_pct` when it replaces a curve (card-contract.md, "the
 * intensity reset rule") — so this fires not only when the uniform
 * intensity differs from 100%, but also when any per-day override exists,
 * even while the uniform value itself still reads 100.
 */
export function needsIntensityResetNotice(cycle: {
  intensity_pct?: number;
  day_intensity_pct?: Record<string, number>;
}): boolean {
  if (cycle.intensity_pct !== undefined && cycle.intensity_pct !== 100) return true;
  return Object.keys(cycle.day_intensity_pct ?? {}).length > 0;
}

/**
 * A point's next raw value after dragging its handle by `deltaY` SVG
 * viewBox pixels, relative to the value it had when the drag started.
 * Relative, not absolute: only the accumulated pixel delta is ever applied
 * to the frozen starting value, rather than re-deriving the value from the
 * pointer's current position on every move. `unitsPerPixel` is
 * `_axis().top / (plot height in px)` (curve-editor.ts), itself frozen at
 * drag start alongside `startValue`, so the pointer's sensitivity can't
 * drift mid-drag if the axis scale changes underneath it.
 *
 * The `deltaY === 0` early return below is its own branch, not a side
 * effect of the arithmetic: `roundHalfEven` runs on every OTHER move, and
 * `deltaY * unitsPerPixel` being exactly 0 does NOT by itself keep
 * `startValue` untouched -- `roundHalfEven(startValue - 0)` still rounds a
 * fractional `startValue`. Without the early return, a drag that went away
 * and came back to its exact starting height would round a fractional
 * stored point (curves legitimately carry them -- one shipped preset has
 * 64/3) despite zero net displacement.
 */
export function dragValue(startValue: number, deltaY: number, unitsPerPixel: number): number {
  // See the docblock above: this branch, not the arithmetic below, is what
  // keeps a net-zero drag byte-identical.
  if (deltaY === 0) return startValue;
  return Math.max(0, roundHalfEven(startValue - deltaY * unitsPerPixel));
}

/**
 * The curve graph's vertical axis: how high (in raw curve units) the plot
 * must reach to keep every authored point AND both clamp lines on-screen,
 * plus the SVG-space y for any raw value at that scale. Pure and DOM-free
 * on purpose -- curve-editor.ts's rendering is a thin wrapper around this,
 * and extracting it is what makes "the clamp lines never fall outside the
 * plot" testable without mounting a component.
 *
 * `top` always covers the tallest of: every point's raw value, `min`, and
 * `max`. Before this existed, the axis scaled from the raw points alone
 * while the line drew CLAMPED values -- so a point far above `max` set a
 * towering, never-drawn scale that squashed the actually-visible curve
 * into a sliver near the bottom, and a floor drawn above every point was
 * invisible entirely. Including the clamps in the scale, and drawing the
 * raw (unclamped) curve against it, fixes both: the clamps are always
 * on-screen, and a handle always sits exactly on the line it edits.
 */
export interface GraphAxis {
  /** The raw-unit value mapped to the plot's top edge (`padTop`). */
  top: number;
  /** SVG viewBox y for a given raw value, at this axis's scale. */
  y(value: number): number;
}

export function graphAxis(
  points: CurvePoint[],
  min: number,
  max: number,
  height: number,
  padTop: number,
  padBottom: number,
): GraphAxis {
  const candidates = [...points.map((p) => p[1]), min, max];
  const top = Math.max(12, ...candidates) + 4;
  const plotHeight = height - padTop - padBottom;
  return {
    top,
    y: (value: number) => height - padBottom - (value / top) * plotHeight,
  };
}
