import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { formatNumber } from "../format";
import { localize } from "../localize/localize";
import { notificationHeadline, notificationSummary } from "../hub-decision";
import type { LeakStatus } from "../discovery";
import { defineElement } from "../types";

/**
 * Whether the system can still tell you things.
 *
 * Three of the brief's diagnostics live here. Notifications: "enabled with no
 * recipients" is seen instead of being discovered when the alarm does not
 * arrive. Weather freshness: an old reading is shown as old rather than folded
 * into numbers that then look current. And the system leak, which is the one
 * place a card must be most careful — `hub_leak` unavailable means the scope
 * has established NOTHING, the hub has no `degraded` list to explain why, and
 * the contract says in as many words that a card must not present that as
 * healthy.
 */
export class ImcHealthBlock extends LitElement {
  @property() weatherEntity?: string;
  @property({ type: Boolean }) staleWeather = false;
  @property({ attribute: false }) notifications?: Record<string, unknown> | null;
  @property({ attribute: false }) leak?: LeakStatus;
  @property({ attribute: false }) unattributedTotal?: number;
  @property({ attribute: false }) unattributedClosed?: number;
  @property({ attribute: false }) budgetLeft?: number;
  @property() language = "en";

  static override styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 3px 0;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      flex: 0 0 auto;
      min-width: 140px;
    }
    .value {
      color: var(--primary-text-color);
      flex: 1 1 auto;
    }
    .warn {
      color: var(--warning-color, #ffa600);
    }
    .note {
      font-size: 11px;
      font-style: italic;
      color: var(--secondary-text-color, #727272);
    }
    ul {
      margin: 2px 0 0;
      padding-left: 148px;
      list-style: none;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    li::before {
      content: "· ";
    }
    button {
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
      background: transparent;
      color: var(--primary-text-color);
    }
    code {
      font-size: 11px;
    }
  `;

  private _test(): void {
    this.dispatchEvent(new CustomEvent("imc-test-notification", { bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const lang = this.language;
    const summary = notificationSummary(this.notifications);
    const leakLine =
      this.leak?.coverage === "alarm"
        ? html`<span class="value warn">${localize(lang, "header.leak")}</span>`
        : // Never a tick: unavailable means nothing was established, and the
          // hub has no degraded list to say why.
          html`<span class="value">${localize(lang, "health.leak_nothing")}</span>`;

    return html`
      <div class="row">
        <span class="label">${localize(lang, "health.weather_source")}</span>
        <span class="value">
          ${this.weatherEntity ? html`<code>${this.weatherEntity}</code>` : "—"}
          ${this.staleWeather
            ? html`<span class="warn">— ${localize(lang, "health.weather_stale")}</span>`
            : nothing}
        </span>
      </div>

      <div class="row">
        <span class="label">${localize(lang, "health.notifications")}</span>
        <span class="value ${summary.verdict === "ok" ? "" : "warn"}">
          ${notificationHeadline(lang, summary)}
        </span>
        <button @click=${this._test}>${localize(lang, "health.test_notification")}</button>
      </div>
      ${summary.silentEvents.length > 0
        ? html`<ul>
            ${summary.silentEvents.map(
              (event) => html`<li>${event} — ${localize(lang, "health.silent_events")}</li>`,
            )}
          </ul>`
        : nothing}
      ${summary.unreachable.length > 0
        ? html`<ul>
            ${summary.unreachable.map(
              (service) => html`<li>${service} — ${localize(lang, "health.unreachable")}</li>`,
            )}
          </ul>`
        : nothing}

      <div class="row">
        <span class="label">${localize(lang, "health.system_leak")}</span>
        ${leakLine}
      </div>

      ${this.unattributedTotal !== undefined
        ? html`<div class="row">
              <span class="label">${localize(lang, "health.unattributed")}</span>
              <span class="value">
                ${formatNumber(this.unattributedTotal, 1)} L
                ${this.unattributedClosed !== undefined
                  ? html`${localize(lang, "health.closed_subset", {
                      liters: formatNumber(this.unattributedClosed, 1) ?? "0",
                    })}`
                  : nothing}
              </span>
            </div>
            <div class="row">
              <span class="label"></span>
              <span class="note">${localize(lang, "health.unattributed_note")}</span>
            </div>`
        : nothing}

      ${this.budgetLeft !== undefined
        ? html`<div class="row">
            <span class="label">${localize(lang, "health.budget_left")}</span>
            <span class="value">${formatNumber(this.budgetLeft, 0)} L</span>
          </div>`
        : nothing}
    `;
  }
}

defineElement("imc-health-block", ImcHealthBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-health-block": ImcHealthBlock;
  }
}
