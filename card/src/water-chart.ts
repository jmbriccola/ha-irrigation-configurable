import { css, html, LitElement, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { formatNumber } from "./format";
import { localize } from "./localize/localize";
import { defineElement } from "./types";
import type { HistorySeries } from "./water-history";

/**
 * The daily consumption history, drawn by hand.
 *
 * No charting library: the bundle is committed to the repository and served by
 * Home Assistant, `curve-sparkline.ts` and `curve-editor.ts` already establish
 * that this project draws its own SVG, and a dependency here would be the
 * largest thing in the file.
 *
 * **Meaning is carried in shape, never in hue alone.** The card must work on
 * light and dark themes and may force no colours, so every fill is a Home
 * Assistant custom property with a fallback — and the two marks that matter
 * are a hatch and a baseline tick, which survive a theme that maps several
 * tokens to similar colours and survive a reader who cannot tell them apart.
 */

const VIEW_W = 320;
const VIEW_H = 96;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 6;
const PAD_B = 10;
const GAP_TICK = 3;

export const PLOT = {
  width: (w: number): number => w - PAD_L - PAD_R,
  height: (h: number): number => h - PAD_T - PAD_B,
};

export interface ChartBar {
  date: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Litres booked from the nominal estimate rather than measured. */
  est: boolean;
  /** Seconds of this day went unobserved. True whatever the litres — that is the point. */
  gap: boolean;
  /** Before anything was recorded at all. Zero litres here is not a measurement. */
  unrecorded: boolean;
}

/**
 * Bar geometry for one series.
 *
 * Pure and exported so the decisions that matter — what counts as a gap, what
 * counts as unrecorded, how an all-zero window scales — are tested as
 * arithmetic rather than through a DOM snapshot.
 */
export function chartBars(series: HistorySeries, width: number, height: number): ChartBar[] {
  const days = series.days;
  if (days.length === 0) return [];

  const plotW = PLOT.width(width);
  const plotH = PLOT.height(height);
  const slot = plotW / days.length;
  // A hairline between bars at 30 days, none at 365 where they would vanish.
  const barW = Math.max(slot - Math.min(1, slot * 0.15), slot * 0.5);
  const peak = Math.max(...days.map((day) => day.l), 0);

  return days.map((day, index) => {
    const unrecorded =
      series.oldestRecorded !== null && day.date < series.oldestRecorded;
    // Scale against the peak; an all-zero window yields zero-height bars
    // rather than a division by zero or a row of full-height ones.
    const h = unrecorded || peak <= 0 ? 0 : (day.l / peak) * plotH;
    return {
      date: day.date,
      x: PAD_L + index * slot + (slot - barW) / 2,
      y: PAD_T + plotH - h,
      w: barW,
      h,
      est: day.est,
      // Diagnostic #7: a day with six hours of unreadable meter must never
      // look like a quiet day, so the mark rides on gap_s alone.
      gap: day.gap_s > 0,
      unrecorded,
    };
  });
}

export class ImcWaterChart extends LitElement {
  @property({ attribute: false }) series?: HistorySeries;
  @property() language = "en";

  static override styles = css`
    :host {
      display: block;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .bar {
      fill: var(--primary-color, #03a9f4);
    }
    .bar.est {
      fill: url(#imc-hatch);
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 0.5;
    }
    .unrecorded {
      fill: var(--divider-color, rgba(127, 127, 127, 0.25));
    }
    .gap {
      fill: var(--warning-color, #ffa600);
    }
    .baseline {
      stroke: var(--divider-color, rgba(127, 127, 127, 0.4));
      stroke-width: 1;
    }
    .hatch-line {
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.2;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      line-height: 1.4;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .swatch {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      background: var(--primary-color, #03a9f4);
    }
    .swatch.est {
      background: repeating-linear-gradient(
        45deg,
        var(--primary-color, #03a9f4) 0 1.5px,
        transparent 1.5px 3px
      );
      box-shadow: inset 0 0 0 1px var(--primary-color, #03a9f4);
    }
    .swatch.gap {
      background: var(--warning-color, #ffa600);
      height: 3px;
      border-radius: 1px;
    }
    .swatch.unrecorded {
      background: var(--divider-color, rgba(127, 127, 127, 0.25));
    }
    .empty {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      line-height: 1.4;
    }
  `;

  protected override render(): TemplateResult | typeof nothing {
    const series = this.series;
    if (!series || series.days.length === 0) {
      return html`<div class="empty">${localize(this.language, "chart.no_data")}</div>`;
    }

    const bars = chartBars(series, VIEW_W, VIEW_H);
    const baseline = PAD_T + PLOT.height(VIEW_H);
    const anyEst = bars.some((bar) => bar.est);
    const anyGap = bars.some((bar) => bar.gap);
    const anyUnrecorded = bars.some((bar) => bar.unrecorded);

    return html`
      <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img"
           aria-label=${localize(this.language, "chart.aria", {
             days: series.days.length,
             liters: formatNumber(series.totalL, 0) ?? "0",
           })}>
        <defs>
          <pattern id="imc-hatch" width="4" height="4" patternUnits="userSpaceOnUse"
                   patternTransform="rotate(45)">
            <line class="hatch-line" x1="0" y1="0" x2="0" y2="4"></line>
          </pattern>
        </defs>
        ${bars.map((bar) =>
          bar.unrecorded
            ? svg`<rect class="unrecorded" x=${bar.x} y=${PAD_T}
                        width=${bar.w} height=${PLOT.height(VIEW_H)}></rect>`
            : bar.h > 0
              ? svg`<rect class="bar ${bar.est ? "est" : ""}" x=${bar.x} y=${bar.y}
                          width=${bar.w} height=${bar.h}></rect>`
              : nothing,
        )}
        <line class="baseline" x1=${PAD_L} y1=${baseline}
              x2=${VIEW_W - PAD_R} y2=${baseline}></line>
        ${bars
          .filter((bar) => bar.gap)
          .map(
            (bar) =>
              svg`<rect class="gap" x=${bar.x} y=${baseline + 1}
                        width=${bar.w} height=${GAP_TICK}></rect>`,
          )}
      </svg>
      <div class="legend">
        <span><i class="swatch"></i>${localize(this.language, "chart.measured")}</span>
        ${anyEst
          ? html`<span><i class="swatch est"></i>${localize(this.language, "chart.estimated")}</span>`
          : nothing}
        ${anyGap
          ? html`<span><i class="swatch gap"></i>${localize(this.language, "chart.gap")}</span>`
          : nothing}
        ${anyUnrecorded
          ? html`<span><i class="swatch unrecorded"></i>${localize(
              this.language,
              "chart.unrecorded",
            )}</span>`
          : nothing}
      </div>
    `;
  }
}

defineElement("imc-water-chart", ImcWaterChart);

declare global {
  interface HTMLElementTagNameMap {
    "imc-water-chart": ImcWaterChart;
  }
}
