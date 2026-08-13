import { css, html, LitElement, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {
  parseCurvePoints,
  PREVIEW_TEMPS,
  REFERENCE_TEMP,
  roundHalfEven,
  scaledValue,
  validatePoints,
} from "./curve-math";
import type { CurvePoint } from "./curve-math";
import { addPoint, removePoint, sortPoints, updatePoint } from "./curve-editor-state";
import { localize, localizeDynamic } from "./localize/localize";
import { asNumber, defineElement } from "./types";
import type { CycleInfo } from "./types";

/**
 * A single curve save: the full set of authored points plus the clamps and
 * the target kind. There is no longer a "simple" variant — every save
 * carries exact points, because the editor now authors them directly
 * instead of deriving them from a semantic amount/heat pair.
 */
export type CurveSavePayload = {
  cycleId: string;
  points: [number, number][];
  min: number;
  max: number;
  kind: "duration" | "volume";
};

const GRAPH_W = 320;
const GRAPH_H = 170;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 24;
// The graph's x-axis range always covers at least 5–40 °C (the old fixed
// window) but stretches to fit the authored points when they reach outside
// it — a floor below 5° or a knee above 40° must stay visible.
const AXIS_MIN = 5;
const AXIS_MAX = 40;
const AXIS_PAD = 2;

export class ImcCurveEditor extends LitElement {
  @property() language = "en";
  @property({ attribute: false }) cycle?: CycleInfo;
  @property({ attribute: false }) weightedTemp?: number;
  /** Whether the zone has a usable flow meter — gates the volume option in
   *  the kind selector, mirroring the backend's `volume_requires_flow` guard. */
  @property({ type: Boolean }) zoneHasFlowMeter = false;

  @state() private _points: CurvePoint[] = [[REFERENCE_TEMP, 15]];
  @state() private _min = 1;
  @state() private _max = 120;
  @state() private _kind: "duration" | "volume" = "duration";
  @state() private _error: string | null = null;
  private _seededCycleId?: string;

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .title {
      font-weight: 700;
      font-size: 1.05rem;
      margin-bottom: 12px;
    }
    .graph-box {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 10px;
      margin: 6px 0 12px;
    }
    .caption {
      font-size: 0.72rem;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    svg {
      display: block;
      width: 100%;
      height: 150px;
      overflow: visible;
    }
    .axis {
      stroke: var(--secondary-text-color, #888);
      opacity: 0.4;
    }
    .curve {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 3;
      stroke-linejoin: round;
    }
    .handle {
      fill: var(--primary-color, #03a9f4);
      stroke: var(--card-background-color, #fff);
      stroke-width: 2;
      cursor: ns-resize;
    }
    .today {
      stroke: var(--success-color, #43a047);
      stroke-dasharray: 4 3;
    }
    .today-text {
      fill: var(--success-color, #43a047);
      font-size: 10px;
      font-weight: 700;
    }
    .examples {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .example {
      flex: 1 1 60px;
      text-align: center;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 10px;
      padding: 8px 4px;
    }
    .example .lbl {
      font-size: 0.72rem;
      opacity: 0.6;
    }
    .example .num {
      font-size: 1.05rem;
      font-weight: 700;
    }
    .today-banner {
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 0.9rem;
    }
    .intensity-notice {
      background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      border: 1px solid var(--warning-color, #ffa600);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 0.85rem;
    }
    .points-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin: 4px 0 6px;
    }
    .point-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .point-row input[type="number"] {
      width: 64px;
      text-align: center;
    }
    .point-row button {
      flex: none;
      padding: 4px 8px;
      width: auto;
    }
    .kind {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .limits {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .limits .limit {
      flex: 1;
    }
    .limits input {
      width: 70px;
      text-align: center;
    }
    label {
      font-weight: 600;
    }
    .help {
      font-size: 0.8rem;
      opacity: 0.7;
      margin: 2px 0 6px;
    }
    .error {
      font-size: 0.85rem;
      color: var(--error-color, #db4437);
      margin-bottom: 12px;
    }
    .buttons {
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    select {
      font: inherit;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("cycle")) {
      const id = this.cycle?.cycle_id;
      if (id !== this._seededCycleId) {
        this._seededCycleId = id;
        this._seedFromCycle();
      }
    }
  }

  private _seedFromCycle(): void {
    const curve = this.cycle?.curve;
    const pts = parseCurvePoints(curve?.points);
    if (pts.length === 0) return;
    // The full, exact set of authored points — no reduction to fixed
    // anchors, which is the entire point of this editor.
    this._points = pts;
    this._min = asNumber(curve?.min) ?? 1;
    this._max = asNumber(curve?.max) ?? 120;
    // A zone that can no longer measure litres must never have "volume"
    // silently re-offered to it — the kind selector stays hidden and this
    // falls back to "duration", matching the backend's own guard.
    this._kind = this.zoneHasFlowMeter && curve?.kind === "volume" ? "volume" : "duration";
    this._error = null;
  }

  /** The curve as the user is drawing it: unscaled (intensity 100%), since
   *  saving always resets the program's intensity to 100% anyway. */
  private _previewValue(temp: number): number {
    return roundHalfEven(scaledValue(this._points, temp, 100, this._min, this._max));
  }

  private _unit(): string {
    return localize(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }

  private _axisMin(): number {
    return Math.min(this._points[0]?.[0] ?? AXIS_MIN, AXIS_MIN) - AXIS_PAD;
  }

  private _axisMax(): number {
    const last = this._points[this._points.length - 1];
    return Math.max(last?.[0] ?? AXIS_MAX, AXIS_MAX) + AXIS_PAD;
  }

  private _sx(t: number): number {
    const axisMin = this._axisMin();
    const axisMax = this._axisMax();
    return PAD_L + ((t - axisMin) / (axisMax - axisMin)) * (GRAPH_W - PAD_L - PAD_R);
  }

  private _graphTop(): number {
    return Math.max(12, ...this._points.map((p) => p[1])) + 4;
  }

  private _sy(v: number): number {
    const top = this._graphTop();
    return GRAPH_H - PAD_B - (v / top) * (GRAPH_H - PAD_T - PAD_B);
  }

  private _valueFromY(y: number): number {
    const top = this._graphTop();
    const v = ((GRAPH_H - PAD_B - y) / (GRAPH_H - PAD_T - PAD_B)) * top;
    return Math.max(0, roundHalfEven(v));
  }

  private _startDrag(index: number, ev: PointerEvent): void {
    ev.preventDefault();
    const svgEl = (ev.currentTarget as SVGElement).ownerSVGElement;
    if (!svgEl) return;
    const move = (e: PointerEvent): void => {
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return;
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const viewY = pt.matrixTransform(ctm.inverse()).y; // already in viewBox units (0..GRAPH_H)
      const current = this._points[index];
      if (!current) return;
      this._points = updatePoint(this._points, index, current[0], this._valueFromY(viewY));
      this._error = null;
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  private _save(): void {
    const error =
      validatePoints(this._points) ??
      (this._min > this._max ? "min_above_max" : null) ??
      (this._min < 0 ? "negative_clamp" : null);
    if (error) {
      // Nothing is dispatched on a bad curve: the services validate again and
      // would reject it, and a half-applied curve edit is worse than a refused one.
      this._error = error;
      return;
    }
    this._error = null;
    this.dispatchEvent(
      new CustomEvent<CurveSavePayload>("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((p) => [p[0], p[1]] as [number, number]),
          min: this._min,
          max: this._max,
          kind: this._kind,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-curve-cancel", { bubbles: true, composed: true }),
    );
  }

  protected override render(): TemplateResult {
    const lang = this.language;
    return html`
      <div class="title">${localize(lang, "editor.title")}</div>

      ${this._renderIntensityNotice(lang)}

      <div class="graph-box">
        <div class="caption">${localize(lang, "editor.graph.caption")}</div>
        ${this._renderGraph(lang)}
      </div>

      <div class="caption">${localize(lang, "editor.preview_title")}</div>
      <div class="examples">
        ${PREVIEW_TEMPS.map((t) => this._exampleTile(`${t}°`, this._previewValue(t)))}
      </div>

      ${this._renderToday(lang)}

      <div class="points-title">${localize(lang, "editor.points_title")}</div>
      ${this._points.map((p, i) => this._renderPointRow(p, i, lang))}

      ${this.zoneHasFlowMeter ? this._renderKind(lang) : nothing}

      <div class="limits">
        <div class="limit">
          <label>${localize(lang, "editor.min.label")}</label>
          <div class="help">${localize(lang, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(e: Event) => {
              const value = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(value)) {
                this._min = value;
                this._error = null;
              }
            }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${localize(lang, "editor.max.label")}</label>
          <div class="help">${localize(lang, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(e: Event) => {
              const value = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(value)) {
                this._max = value;
                this._error = null;
              }
            }} /> ${this._unit()}
        </div>
      </div>

      ${this._error
        ? html`<div class="error">${localizeDynamic(lang, "editor", this._error)}</div>`
        : nothing}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${localize(lang, "editor.save")}</button>
        <button @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>
      </div>
    `;
  }

  private _renderIntensityNotice(lang: string): TemplateResult | typeof nothing {
    const pct = this.cycle?.intensity_pct;
    if (pct === undefined || pct === 100) return nothing;
    return html`<div class="intensity-notice">
      ${localize(lang, "editor.intensity_reset", { pct: Math.round(pct) })}
    </div>`;
  }

  private _renderKind(lang: string): TemplateResult {
    return html`<div class="kind">
      <label for="imc-curve-kind">${localize(lang, "editor.kind_label")}</label>
      <select
        id="imc-curve-kind"
        .value=${this._kind}
        @change=${(e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          this._kind = value === "volume" ? "volume" : "duration";
        }}
      >
        <option value="duration">${localize(lang, "editor.kind_duration")}</option>
        <option value="volume">${localize(lang, "editor.kind_volume")}</option>
      </select>
    </div>`;
  }

  private _exampleTile(label: string, value: number): TemplateResult {
    return html`<div class="example"><div class="lbl">${label}</div><div class="num">${value} ${this._unit()}</div></div>`;
  }

  private _renderToday(lang: string): TemplateResult | typeof nothing {
    const t = this.weightedTemp;
    if (t === undefined || Number.isNaN(t)) return nothing;
    const value = this._previewValue(t);
    return html`<div class="today-banner">${localize(lang, "editor.today", {
      temp: Math.round(t),
      value,
      unit: this._unit(),
    })}</div>`;
  }

  private _renderPointRow(point: CurvePoint, index: number, lang: string): TemplateResult {
    return html`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(point[0])}
        aria-label=${localize(lang, "editor.point_temp")}
        @change=${(e: Event) => this._editPoint(index, e, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(point[1])}
        aria-label=${localize(lang, "editor.point_value")}
        @change=${(e: Event) => this._editPoint(index, e, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${localize(lang, "editor.point_remove")}
        @click=${() => (this._points = removePoint(this._points, index))}
      >
        ✕
      </button>
      <button
        type="button"
        title=${localize(lang, "editor.point_add")}
        @click=${() => (this._points = addPoint(this._points, index))}
      >
        ＋
      </button>
    </div>`;
  }

  private _editPoint(index: number, event: Event, field: "temp" | "value"): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(raw)) return;
    const current = this._points[index];
    if (!current) return;
    const next =
      field === "temp"
        ? updatePoint(this._points, index, raw, current[1])
        : updatePoint(this._points, index, current[0], raw);
    // Re-sorting on every edit keeps the curve renderable while the user is
    // still typing; validatePoints then only ever has to reject duplicates.
    this._points = sortPoints(next);
    this._error = null;
  }

  private _renderGraph(lang: string): TemplateResult {
    const axisMin = this._axisMin();
    const axisMax = this._axisMax();
    const dense: Array<[number, number]> = [];
    for (let t = axisMin; t <= axisMax; t += 1) {
      dense.push([this._sx(t), this._sy(this._previewValue(t))]);
    }
    const path = dense
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ");
    const t = this.weightedTemp;
    const showToday = t !== undefined && !Number.isNaN(t) && t >= axisMin && t <= axisMax;
    return svg`
      <svg viewBox="0 0 ${GRAPH_W} ${GRAPH_H}">
        <line class="axis" x1=${PAD_L} y1=${PAD_T} x2=${PAD_L} y2=${GRAPH_H - PAD_B}></line>
        <line class="axis" x1=${PAD_L} y1=${GRAPH_H - PAD_B} x2=${GRAPH_W - PAD_R} y2=${GRAPH_H - PAD_B}></line>
        ${showToday
          ? svg`<line class="today" x1=${this._sx(t as number)} y1=${PAD_T} x2=${this._sx(t as number)} y2=${GRAPH_H - PAD_B}></line>
              <text class="today-text" x=${this._sx(t as number)} y=${PAD_T - 4} text-anchor="middle">${localize(lang, "editor.graph.today", { temp: Math.round(t as number) })}</text>`
          : nothing}
        <path class="curve" d=${path}></path>
        ${this._points.map(
          (p, i) => svg`<circle class="handle" r="7"
            cx=${this._sx(p[0]).toFixed(1)} cy=${this._sy(this._previewValue(p[0])).toFixed(1)}
            @pointerdown=${(e: PointerEvent) => this._startDrag(i, e)}></circle>`,
        )}
      </svg>
    `;
  }
}

defineElement("imc-curve-editor", ImcCurveEditor);

declare global {
  interface HTMLElementTagNameMap {
    "imc-curve-editor": ImcCurveEditor;
  }
}
