import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { formatNumber } from "./format";
import { localize } from "./localize/localize";
import { clamp, defineElement } from "./types";

/**
 * The water budget against the skip threshold.
 *
 * The comparison between these two numbers **is** the decision to water or
 * not, and in numeric form nobody catches it — which is the brief's own
 * complaint about the decision panel. Drawn, the comparison is the thing you
 * see rather than something you compute.
 *
 * Extracted from `card.ts` rather than copied into the hub card. Two meters
 * for one comparison would diverge, and the divergence would be invisible
 * because both would look plausible.
 */

export interface MeterGeometry {
  /** Budget as a fraction of the scale, 0..1. */
  fill: number;
  /** Threshold's position on the same scale, or undefined when there is none. */
  mark: number | undefined;
  /** Budget has reached the threshold — the state in which watering is skipped. */
  sufficient: boolean;
}

/**
 * Pure geometry, so the one case that could divide by zero and the one case
 * that decides the colour are testable without a DOM.
 */
export function meterGeometry(
  budget: number | undefined,
  threshold: number | undefined,
): MeterGeometry {
  // A floor on the scale rather than a guard on the division: both values can
  // legitimately be zero at the start of a dry spell, and a meter that threw
  // or blanked there would vanish exactly when the budget is most interesting.
  const scale = Math.max(budget ?? 0, threshold ?? 0, 0.001);
  return {
    fill: clamp((budget ?? 0) / scale, 0, 1),
    mark: threshold !== undefined ? clamp(threshold / scale, 0, 1) : undefined,
    sufficient: budget !== undefined && threshold !== undefined && budget >= threshold,
  };
}

export class ImcBudgetMeter extends LitElement {
  @property({ attribute: false }) budget?: number;
  @property({ attribute: false }) threshold?: number;
  @property() language = "en";
  /** The compact header wants one line; the hub card's decision block wants room. */
  @property({ type: Boolean, reflect: true }) wide = false;

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 220px;
      min-width: 200px;
    }
    :host([wide]) {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
    .label {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .meter {
      position: relative;
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
      min-width: 60px;
    }
    :host([wide]) .meter {
      height: 12px;
    }
    .meter-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.3s ease;
    }
    .meter-fill.sufficient {
      background: var(--success-color, #43a047);
    }
    .meter-mark {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.6;
    }
    .numbers {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `;

  protected override render(): TemplateResult | typeof nothing {
    if (this.budget === undefined && this.threshold === undefined) return nothing;
    const { fill, mark, sufficient } = meterGeometry(this.budget, this.threshold);
    const lang = this.language;
    return html`
      <span class="label">${localize(lang, "header.water_budget")}</span>
      <div
        class="meter"
        title=${`${localize(lang, "header.water_budget")} / ${localize(lang, "header.skip_threshold")}`}
      >
        <div
          class="meter-fill ${sufficient ? "sufficient" : ""}"
          style="width:${(fill * 100).toFixed(1)}%"
        ></div>
        ${mark !== undefined
          ? html`<div class="meter-mark" style="left:${(mark * 100).toFixed(1)}%"></div>`
          : nothing}
      </div>
      <span class="numbers">
        ${formatNumber(this.budget, 2) ?? "—"} / ${formatNumber(this.threshold, 1) ?? "—"} mm
      </span>
    `;
  }
}

defineElement("imc-budget-meter", ImcBudgetMeter);

declare global {
  interface HTMLElementTagNameMap {
    "imc-budget-meter": ImcBudgetMeter;
  }
}
