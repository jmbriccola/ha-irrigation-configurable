import { describe, it, expect } from "vitest";
import { chartBars, PLOT } from "./water-chart";
import type { HistorySeries } from "./water-history";

function series(
  days: { date: string; l: number; est?: boolean; gap_s?: number }[],
  oldestRecorded: string | null = null,
): HistorySeries {
  return {
    days: days.map((day) => ({
      date: day.date,
      l: day.l,
      est: day.est ?? false,
      gap_s: day.gap_s ?? 0,
    })),
    oldestRecorded,
    totalL: days.reduce((sum, day) => sum + day.l, 0),
  };
}

const W = 300;
const H = 100;

describe("chartBars", () => {
  it("gives every day a slot, including the zeros", () => {
    // Dense in, dense out. A chart that dropped empty days would compress the
    // calendar and put a bar on the wrong date.
    const bars = chartBars(series([
      { date: "2026-08-15", l: 10 },
      { date: "2026-08-16", l: 0 },
      { date: "2026-08-17", l: 20 },
    ]), W, H);

    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => bar.date)).toEqual(["2026-08-15", "2026-08-16", "2026-08-17"]);
    expect(bars[0]?.x).toBeLessThan(bars[1]!.x);
    expect(bars[1]?.x).toBeLessThan(bars[2]!.x);
  });

  it("scales the tallest day to the full plot and the rest against it", () => {
    const bars = chartBars(series([
      { date: "2026-08-15", l: 10 },
      { date: "2026-08-16", l: 20 },
    ]), W, H);

    expect(bars[1]?.h).toBeCloseTo(PLOT.height(H));
    expect(bars[0]?.h).toBeCloseTo(PLOT.height(H) / 2);
  });

  it("does not divide by zero on an all-zero window", () => {
    const bars = chartBars(series([
      { date: "2026-08-15", l: 0 },
      { date: "2026-08-16", l: 0 },
    ]), W, H);

    expect(bars.every((bar) => bar.h === 0)).toBe(true);
    expect(bars.every((bar) => Number.isFinite(bar.y))).toBe(true);
  });

  it("marks an unobserved day whatever its litres — that is the whole point", () => {
    // Diagnostic #7: a day with six hours of unreadable meter must never look
    // like a quiet day. The mark rides on gap_s alone, never on the litres.
    const bars = chartBars(series([
      { date: "2026-08-15", l: 0, gap_s: 21600 },
      { date: "2026-08-16", l: 40, gap_s: 600 },
      { date: "2026-08-17", l: 40, gap_s: 0 },
    ]), W, H);

    expect(bars[0]?.gap).toBe(true);
    expect(bars[1]?.gap).toBe(true);
    expect(bars[2]?.gap).toBe(false);
  });

  it("marks an estimated day without hiding its litres", () => {
    const bars = chartBars(series([
      { date: "2026-08-15", l: 30, est: true },
      { date: "2026-08-16", l: 30 },
    ]), W, H);

    expect(bars[0]?.est).toBe(true);
    expect(bars[1]?.est).toBe(false);
    expect(bars[0]?.h).toBeCloseTo(bars[1]!.h);
  });

  it("separates days before anything was recorded from observed dry days", () => {
    // Both are zero litres. Only one of them is a measurement.
    const bars = chartBars(
      series(
        [
          { date: "2026-08-14", l: 0 },
          { date: "2026-08-15", l: 0 },
          { date: "2026-08-16", l: 10 },
        ],
        "2026-08-15",
      ),
      W,
      H,
    );

    expect(bars[0]?.unrecorded).toBe(true);
    expect(bars[1]?.unrecorded).toBe(false);
    expect(bars[2]?.unrecorded).toBe(false);
  });

  it("draws no unrecorded band when the service reported no boundary", () => {
    const bars = chartBars(series([{ date: "2026-08-14", l: 0 }]), W, H);

    expect(bars[0]?.unrecorded).toBe(false);
  });

  it("gives an unrecorded day no bar at all, rather than a zero-height one", () => {
    const bars = chartBars(
      series([{ date: "2026-08-14", l: 0 }, { date: "2026-08-16", l: 10 }], "2026-08-15"),
      W,
      H,
    );

    expect(bars[0]?.h).toBe(0);
    expect(bars[0]?.unrecorded).toBe(true);
  });

  it("returns nothing for an empty series instead of an empty plot", () => {
    expect(chartBars(series([]), W, H)).toEqual([]);
  });

  it("keeps every bar inside the plot", () => {
    const bars = chartBars(series([
      { date: "2026-08-15", l: 7 },
      { date: "2026-08-16", l: 3 },
      { date: "2026-08-17", l: 11 },
    ]), W, H);

    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.w).toBeLessThanOrEqual(W + 0.001);
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.y + bar.h).toBeLessThanOrEqual(H + 0.001);
    }
  });
});
