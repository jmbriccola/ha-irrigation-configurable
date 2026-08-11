import { css, html, LitElement, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { parseCurvePoints, type CurvePoint } from "./curve-math";
import type { CycleCurve } from "./types";
import { asNumber, defineElement } from "./types";

const WIDTH = 150;
const HEIGHT = 44;
const PAD_X = 6;
const PAD_Y = 6;

/**
 * Read-only inline SVG sparkline of a cycle curve: value over
 * temperature, with dashed lines marking the min/max clamps.
 */
export class ImcCurveSparkline extends LitElement {
  @property({ attribute: false }) curve?: CycleCurve;

  static override styles = css`
    :host {
      display: inline-block;
      line-height: 0;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.8;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .dot {
      fill: var(--primary-color, #03a9f4);
    }
    .clamp {
      stroke: var(--secondary-text-color, #727272);
      stroke-width: 1;
      stroke-dasharray: 3 3;
      opacity: 0.7;
    }
    .clamp-label {
      fill: var(--secondary-text-color, #727272);
      font-size: 7px;
      font-family: inherit;
    }
    .axis-label {
      fill: var(--secondary-text-color, #727272);
      font-size: 7.5px;
      font-family: inherit;
    }
  `;

  protected override render(): TemplateResult | typeof nothing {
    const curve = this.curve;
    const points: CurvePoint[] = parseCurvePoints(curve?.points);
    if (points.length === 0) return nothing;

    const clampMin = asNumber(curve?.min);
    const clampMax = asNumber(curve?.max);

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    if (clampMin !== undefined) ys.push(clampMin);
    if (clampMax !== undefined) ys.push(clampMax);

    let xMin = Math.min(...xs);
    let xMax = Math.max(...xs);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (xMax - xMin < 1e-9) {
      xMin -= 1;
      xMax += 1;
    }
    if (yMax - yMin < 1e-9) {
      yMin -= 1;
      yMax += 1;
    }

    const sx = (x: number): number =>
      PAD_X + ((x - xMin) / (xMax - xMin)) * (WIDTH - 2 * PAD_X);
    const sy = (y: number): number =>
      HEIGHT - PAD_Y - ((y - yMin) / (yMax - yMin)) * (HEIGHT - 2 * PAD_Y);

    const path = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`)
      .join(" ");

    const clampLine = (value: number, label: string) => svg`
      <line
        class="clamp"
        x1="0" x2="${WIDTH}"
        y1="${sy(value).toFixed(1)}" y2="${sy(value).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${WIDTH - 2}" text-anchor="end"
        y="${(sy(value) - 2).toFixed(1)}">${label}</text>
    `;

    const first = points[0];
    const last = points[points.length - 1];

    return html`
      <svg
        viewBox="0 0 ${WIDTH} ${HEIGHT + 10}"
        width="${WIDTH}"
        height="${HEIGHT + 10}"
        role="img"
        aria-hidden="true"
      >
        ${clampMin !== undefined ? clampLine(clampMin, String(clampMin)) : nothing}
        ${clampMax !== undefined ? clampLine(clampMax, String(clampMax)) : nothing}
        <path class="line" d="${path}"></path>
        ${points.map(
          (p) => svg`<circle class="dot" r="2"
            cx="${sx(p[0]).toFixed(1)}" cy="${sy(p[1]).toFixed(1)}"></circle>`,
        )}
        ${first
          ? svg`<text class="axis-label" x="${PAD_X}" y="${HEIGHT + 8}"
              text-anchor="start">${first[0]}°</text>`
          : nothing}
        ${last && last !== first
          ? svg`<text class="axis-label" x="${WIDTH - PAD_X}" y="${HEIGHT + 8}"
              text-anchor="end">${last[0]}°</text>`
          : nothing}
      </svg>
    `;
  }
}

defineElement("imc-curve-sparkline", ImcCurveSparkline);

declare global {
  interface HTMLElementTagNameMap {
    "imc-curve-sparkline": ImcCurveSparkline;
  }
}
