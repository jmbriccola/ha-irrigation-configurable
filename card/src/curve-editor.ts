import { css, html, LitElement, nothing, svg } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {
  AMOUNT_MAX,
  AMOUNT_MIN,
  COOL,
  HEAT_MAX,
  HEAT_MIN,
  HOT,
  MILD,
  curveValue,
  parseCurvePoints,
  pointsFromSemantic,
  roundHalfEven,
  semanticFromPoints,
} from "./curve-math";
import type { CurvePoint } from "./curve-math";
import { localize } from "./localize/localize";
import { asNumber, defineElement } from "./types";
import type { CycleInfo } from "./types";

export type CurveSavePayload =
  | {
      cycleId: string;
      mode: "simple";
      amount: number;
      heat: number;
      min: number;
      max: number;
    }
  | {
      cycleId: string;
      mode: "advanced";
      points: [number, number][];
      min: number;
      max: number;
    };

const GRAPH_W = 320;
const GRAPH_H = 170;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 24;
const T_MIN = 5;
const T_MAX = 40;

export class ImcCurveEditor extends LitElement {
  @property() language = "en";
  @property({ attribute: false }) cycle?: CycleInfo;
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _amount = 15;
  @state() private _heat = 15;
  @state() private _min = 1;
  @state() private _max = 120;
  @state() private _advanced = false;
  /** When a point has been dragged, we save exact points, not the semantic pair. */
  @state() private _dragged = false;
  @state() private _points: CurvePoint[] = pointsFromSemantic(15, 15);

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
    .field {
      margin-bottom: 16px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    label {
      font-weight: 600;
    }
    .value {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      white-space: nowrap;
    }
    .help {
      font-size: 0.8rem;
      opacity: 0.7;
      margin: 2px 0 6px;
    }
    input[type="range"] {
      width: 100%;
    }
    .ends {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      opacity: 0.5;
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
    .tick {
      fill: var(--secondary-text-color, #888);
      font-size: 9px;
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
    }
    .example {
      flex: 1;
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
      font-size: 1.1rem;
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
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      font-size: 0.85rem;
      margin-bottom: 12px;
      text-decoration: underline;
      opacity: 0.85;
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
    .note {
      font-size: 0.75rem;
      opacity: 0.6;
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
    .volume-note {
      font-size: 0.9rem;
      opacity: 0.8;
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("cycle")) this._seedFromCycle();
  }

  private _seedFromCycle(): void {
    const curve = this.cycle?.curve;
    const pts = parseCurvePoints(curve?.points);
    if (pts.length === 0) return;
    const { amount, heat } = semanticFromPoints(pts);
    this._amount = amount;
    this._heat = heat;
    this._min = asNumber(curve?.min) ?? 1;
    this._max = asNumber(curve?.max) ?? 120;
    this._dragged = false;
    // Seed the editor points from the real curve at the three anchors so the
    // graph faithfully shows the existing curve on open.
    this._points = [
      [COOL, roundHalfEven(curveValue(pts, COOL))],
      [MILD, roundHalfEven(curveValue(pts, MILD))],
      [HOT, roundHalfEven(curveValue(pts, HOT))],
    ];
  }

  private _regen(): void {
    this._points = pointsFromSemantic(this._amount, this._heat);
    this._dragged = false;
  }

  private _onAmount(e: Event): void {
    this._amount = Number((e.target as HTMLInputElement).value);
    this._regen();
  }

  private _onHeat(e: Event): void {
    this._heat = Number((e.target as HTMLInputElement).value);
    this._regen();
  }

  private _clampedValue(temp: number): number {
    return roundHalfEven(curveValue(this._points, temp, this._min, this._max));
  }

  private _sx(t: number): number {
    return PAD_L + ((t - T_MIN) / (T_MAX - T_MIN)) * (GRAPH_W - PAD_L - PAD_R);
  }

  private _sy(v: number): number {
    const top = Math.max(this._max, ...this._points.map((p) => p[1]), 1);
    return GRAPH_H - PAD_B - (v / top) * (GRAPH_H - PAD_T - PAD_B);
  }

  private _valueFromY(y: number): number {
    const top = Math.max(this._max, ...this._points.map((p) => p[1]), 1);
    const v = ((GRAPH_H - PAD_B - y) / (GRAPH_H - PAD_T - PAD_B)) * top;
    return Math.max(0, roundHalfEven(v));
  }

  private _startDrag(index: number, ev: PointerEvent): void {
    if (!this._advanced) return;
    ev.preventDefault();
    const svgEl = (ev.currentTarget as SVGElement).ownerSVGElement;
    if (!svgEl) return;
    const move = (e: PointerEvent): void => {
      const rect = svgEl.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * GRAPH_H;
      const next = [...this._points];
      const current = next[index];
      if (!current) return;
      next[index] = [current[0], this._valueFromY(y)];
      this._points = next;
      this._dragged = true;
      const { amount, heat } = semanticFromPoints(this._points);
      this._amount = amount;
      this._heat = heat;
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  private _save(): void {
    const cycleId = this.cycle?.cycle_id ?? "";
    const detail: CurveSavePayload = this._dragged
      ? {
          cycleId,
          mode: "advanced",
          points: this._points.map((p) => [p[0], p[1]] as [number, number]),
          min: this._min,
          max: this._max,
        }
      : {
          cycleId,
          mode: "simple",
          amount: this._amount,
          heat: this._heat,
          min: this._min,
          max: this._max,
        };
    this.dispatchEvent(
      new CustomEvent<CurveSavePayload>("imc-curve-save", {
        detail,
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
    if (this.cycle?.curve?.kind === "volume") {
      return html`<div class="volume-note">${localize(lang, "editor.volume_note")}</div>`;
    }
    return html`
      <div class="title">${localize(lang, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${localize(lang, "editor.amount.label")}</label>
          <span class="value">${localize(lang, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${localize(lang, "editor.amount.help")}</div>
        <input type="range" min=${AMOUNT_MIN} max=${AMOUNT_MAX} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${localize(lang, "editor.amount.low")}</span><span>${localize(lang, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${localize(lang, "editor.heat.label")}</label>
          <span class="value">${localize(lang, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${localize(lang, "editor.heat.help")}</div>
        <input type="range" min=${HEAT_MIN} max=${HEAT_MAX} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${localize(lang, "editor.heat.low")}</span><span>${localize(lang, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${localize(lang, "editor.graph.caption")}</div>
        ${this._renderGraph(lang)}
      </div>

      <div class="examples">
        ${this._exampleTile(localize(lang, "editor.example.cool"), this._clampedValue(COOL))}
        ${this._exampleTile(localize(lang, "editor.example.mild"), this._clampedValue(MILD))}
        ${this._exampleTile(localize(lang, "editor.example.hot"), this._clampedValue(HOT))}
      </div>

      ${this._renderToday(lang)}

      <div class="advanced-toggle" @click=${() => (this._advanced = !this._advanced)}>
        ${this._advanced ? "▾" : "▸"} ${localize(lang, "editor.advanced.toggle")}
      </div>
      ${this._advanced ? this._renderAdvanced(lang) : nothing}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${localize(lang, "editor.save")}</button>
        <button @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>
      </div>
    `;
  }

  private _exampleTile(label: string, minutes: number): TemplateResult {
    return html`<div class="example"><div class="lbl">${label}</div><div class="num">${minutes} min</div></div>`;
  }

  private _renderToday(lang: string): TemplateResult | typeof nothing {
    const t = this.weightedTemp;
    if (t === undefined || Number.isNaN(t)) return nothing;
    const minutes = this._clampedValue(t);
    return html`<div class="today-banner">${localize(lang, "editor.today", {
      temp: Math.round(t),
      min: minutes,
    })}</div>`;
  }

  private _renderAdvanced(lang: string): TemplateResult {
    return html`
      <div class="help">${localize(lang, "editor.advanced.help")}</div>
      <div class="limits">
        <div class="limit">
          <label>${localize(lang, "editor.min.label")}</label>
          <div class="help">${localize(lang, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(e: Event) => (this._min = Number((e.target as HTMLInputElement).value))} /> min
        </div>
        <div class="limit">
          <label>${localize(lang, "editor.max.label")}</label>
          <div class="help">${localize(lang, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(e: Event) => (this._max = Number((e.target as HTMLInputElement).value))} /> min
        </div>
      </div>
      <div class="note">${localize(lang, "editor.drag_hint")}</div>
      <div class="note">${localize(lang, "editor.more_points")}</div>
    `;
  }

  private _renderGraph(lang: string): TemplateResult {
    const dense: Array<[number, number]> = [];
    for (let t = T_MIN; t <= T_MAX; t += 1) {
      dense.push([this._sx(t), this._sy(this._clampedValue(t))]);
    }
    const path = dense
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ");
    const t = this.weightedTemp;
    const showToday = t !== undefined && !Number.isNaN(t) && t >= T_MIN && t <= T_MAX;
    return svg`
      <svg viewBox="0 0 ${GRAPH_W} ${GRAPH_H}">
        <line class="axis" x1=${PAD_L} y1=${PAD_T} x2=${PAD_L} y2=${GRAPH_H - PAD_B}></line>
        <line class="axis" x1=${PAD_L} y1=${GRAPH_H - PAD_B} x2=${GRAPH_W - PAD_R} y2=${GRAPH_H - PAD_B}></line>
        <text class="tick" x=${this._sx(COOL)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(MILD)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(HOT)} y=${GRAPH_H - PAD_B + 12} text-anchor="middle">35°</text>
        ${showToday
          ? svg`<line class="today" x1=${this._sx(t as number)} y1=${PAD_T} x2=${this._sx(t as number)} y2=${GRAPH_H - PAD_B}></line>
              <text class="today-text" x=${this._sx(t as number)} y=${PAD_T - 4} text-anchor="middle">${localize(lang, "editor.graph.today", { temp: Math.round(t as number) })}</text>`
          : nothing}
        <path class="curve" d=${path}></path>
        ${this._points.map(
          (p, i) => svg`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(p[0]).toFixed(1)} cy=${this._sy(this._clampedValue(p[0])).toFixed(1)}
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
