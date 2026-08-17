import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { formatNumber } from "../format";
import { localize } from "../localize/localize";
import { defineElement } from "../types";
import type { WaterSummary } from "../types";
import type { HistorySeries } from "../water-history";
import "../water-chart";

/**
 * What this zone has used, and the daily history behind it.
 *
 * The three figures come from `zone_water_total`'s own attributes and are
 * never summed from the chart series. They are already published, already
 * guaranteed consistent with the total they slice, and re-deriving them here
 * would put a second computation of one number on the same dashboard as the
 * first — which is how two figures for one fact start disagreeing.
 */

export type ConsumptionSource = "internal" | "entity";

/**
 * Whether the chart belongs on screen.
 *
 * Not a rendering detail: with an external consumption source the integration's
 * own series would sit *underneath* someone else's totals, presenting two
 * different accountings as though they agreed. Hiding it is the honest answer.
 */
export function showsChart(source: ConsumptionSource, accounting: string | undefined): boolean {
  if (source !== "internal") return false;
  // "unavailable" means nothing is being recorded at all -- no meter usable and
  // no nominal rate -- so there is no series to draw and never will be.
  return accounting !== "unavailable";
}

export class ImcConsumptionBlock extends LitElement {
  @property({ attribute: false }) water?: WaterSummary | null;
  @property({ attribute: false }) series?: HistorySeries | null;
  @property() source: ConsumptionSource = "internal";
  @property() accounting?: string;
  @property() language = "en";

  static override styles = css`
    :host {
      display: block;
    }
    .figures {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      padding-bottom: 6px;
    }
    .figure {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .figure-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #727272);
    }
    .figure-value {
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .badge {
      align-self: center;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.14));
      color: var(--secondary-text-color, #727272);
    }
  `;

  private _figure(labelKey: "consumption.today" | "consumption.month" | "consumption.total", value: number | undefined): TemplateResult {
    return html`
      <div class="figure">
        <span class="figure-label">${localize(this.language, labelKey)}</span>
        <span class="figure-value">${formatNumber(value, 1) ?? "—"} L</span>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    const water = this.water ?? undefined;
    return html`
      <div class="figures">
        ${this._figure("consumption.today", water?.today)}
        ${this._figure("consumption.month", water?.month)}
        ${this._figure("consumption.total", water?.total)}
        ${water?.estimated
          ? html`<span class="badge">${localize(this.language, "consumption.estimated")}</span>`
          : nothing}
      </div>
      ${showsChart(this.source, this.accounting)
        ? html`<imc-water-chart
            .series=${this.series ?? undefined}
            .language=${this.language}
          ></imc-water-chart>`
        : nothing}
    `;
  }
}

defineElement("imc-consumption-block", ImcConsumptionBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-consumption-block": ImcConsumptionBlock;
  }
}
