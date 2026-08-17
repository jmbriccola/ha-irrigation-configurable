import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { formatNumber } from "../format";
import { localize, localizeDynamic } from "../localize/localize";
import { weightRows, weightsAreEffective } from "../hub-decision";
import { asNumber, asString, defineElement } from "../types";
import "../budget-meter";

/**
 * Why the system will or will not water, in the order a person reasons.
 *
 * The brief calls this the heart of the engine and says it is unreadable
 * today. That is not about missing data — every number here is published.
 * What was missing is the *relation*: a budget of 3.79 mm means nothing until
 * you see it against a threshold of 4.5 mm, and five temperatures mean nothing
 * until you can see which one dominated.
 */
export class ImcDecisionBlock extends LitElement {
  @property({ attribute: false }) budget?: number;
  @property({ attribute: false }) threshold?: number;
  /** `hub_water_budget`'s attributes: the rain history and the forecast credit. */
  @property({ attribute: false }) budgetAttrs?: Record<string, unknown>;
  /** `hub_weighted_temp`'s attributes: the five maxima, the weights, staleness. */
  @property({ attribute: false }) tempAttrs?: Record<string, unknown>;
  @property({ attribute: false }) weightedTemp?: number;
  @property() skipReason?: string;
  @property({ type: Boolean }) evaluated = false;
  @property() language = "en";

  static override styles = css`
    :host {
      display: block;
    }
    .verdict {
      font-size: 15px;
      padding-bottom: 6px;
      color: var(--primary-text-color);
    }
    .verdict .reason {
      color: var(--secondary-text-color, #727272);
      font-size: 13px;
    }
    .muted {
      color: var(--secondary-text-color, #727272);
    }
    .section {
      padding-top: 8px;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #727272);
      padding-bottom: 2px;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 1px 0;
    }
    .row .name {
      flex: 1 1 auto;
      color: var(--secondary-text-color, #727272);
    }
    .row .num {
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .row .weight {
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color, #727272);
      min-width: 42px;
      text-align: right;
    }
    .row.missing .name,
    .row.missing .num {
      text-decoration: line-through;
      opacity: 0.7;
    }
    .note {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
      font-style: italic;
    }
  `;

  private _verdict(): TemplateResult {
    if (!this.evaluated) {
      return html`<div class="verdict muted">
        ${localize(this.language, "hub_card.not_evaluated")}
      </div>`;
    }
    const reason = this.skipReason;
    return html`<div class="verdict">
      ${localize(this.language, reason ? "hub_card.will_skip" : "hub_card.will_water")}
      ${reason
        ? html`<span class="reason">— ${localizeDynamic(this.language, "reason", reason)}</span>`
        : nothing}
    </div>`;
  }

  private _rain(): TemplateResult {
    const lang = this.language;
    const rows: [string, number | undefined][] = [
      [localize(lang, "decision.day_today"), asNumber(this.budgetAttrs?.["rain_today"])],
      [localize(lang, "decision.day_d1"), asNumber(this.budgetAttrs?.["rain_d1"])],
      [localize(lang, "decision.day_d2"), asNumber(this.budgetAttrs?.["rain_d2"])],
      [localize(lang, "decision.day_d3"), asNumber(this.budgetAttrs?.["rain_d3"])],
    ];
    const credit = asNumber(this.budgetAttrs?.["forecast_credit"]);
    return html`
      <div class="section">
        <div class="section-title">${localize(lang, "decision.rain")}</div>
        ${rows.map(
          ([label, value]) => html`
            <div class="row">
              <span class="name">${label}</span>
              <span class="num">${formatNumber(value, 2) ?? "—"} mm</span>
            </div>
          `,
        )}
        <div class="row">
          <span class="name">${localize(lang, "decision.forecast_credit")}</span>
          <span class="num">${formatNumber(credit, 2) ?? "—"} mm</span>
        </div>
      </div>
    `;
  }

  private _temperature(): TemplateResult {
    const lang = this.language;
    const rows = weightRows(this.tempAttrs, this.tempAttrs?.["temp_weights"]);
    const labels: Record<string, string> = {
      temp_d3: localize(lang, "decision.day_d3"),
      temp_d2: localize(lang, "decision.day_d2"),
      temp_d1: localize(lang, "decision.day_d1"),
      temp_today_eff: localize(lang, "decision.day_today"),
      temp_tomorrow: localize(lang, "decision.day_tomorrow"),
    };
    return html`
      <div class="section">
        <div class="section-title">
          ${localize(lang, "decision.weighted_temp")}:
          ${formatNumber(this.weightedTemp, 1) ?? "—"} °C
        </div>
        ${rows.map(
          (row) => html`
            <div class="row ${row.missing ? "missing" : ""}">
              <span class="name">${labels[row.key] ?? row.key}</span>
              <span class="num">
                ${row.missing
                  ? localize(lang, "decision.missing_day")
                  : `${formatNumber(row.value ?? undefined, 1)} °C`}
              </span>
              <span class="weight">
                ${row.missing || row.weight === null
                  ? ""
                  : `${Math.round(row.weight * 100)}%`}
              </span>
            </div>
          `,
        )}
        ${!weightsAreEffective(rows)
          ? html`<div class="note">${localize(lang, "decision.weights_note")}</div>`
          : nothing}
      </div>
    `;
  }

  protected override render(): TemplateResult {
    return html`
      ${this._verdict()}
      <imc-budget-meter
        .budget=${this.budget}
        .threshold=${this.threshold}
        .language=${this.language}
        wide
      ></imc-budget-meter>
      ${this.evaluated ? html`${this._rain()} ${this._temperature()}` : nothing}
    `;
  }
}

defineElement("imc-decision-block", ImcDecisionBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-decision-block": ImcDecisionBlock;
  }
}
