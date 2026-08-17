import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { calendarText } from "../calendar-text";
import { localize } from "../localize/localize";
import { dayDelivery } from "../schedule-math";
import { defineElement } from "../types";
import type { CycleInfo } from "../types";

/**
 * The zone's programs: when each starts, which days it runs, and what it
 * would actually deliver today.
 *
 * Two things this block is careful about. The calendar is rendered in words,
 * because "Mon and Thu" and "every 3 days, last completed on the 14th" are
 * very different behaviours that were distinguishable only by reading JSON.
 * And the minutes shown are **delivery**, not the setting: the card contract
 * is explicit that a program list describes what actually gets watered, which
 * means the zone's `adjustment_pct` is folded in. Showing the setting here
 * would print a number the zone will never deliver.
 */

export interface ProgramRow {
  cycle: CycleInfo;
  /** Delivery minutes for today, adjustment folded in. Null when not derivable. */
  minutes: number | null;
  calendar: string;
}

/**
 * One row per program, in the order the zone published them.
 *
 * Pure, so the two decisions that matter — which minutes figure, and what the
 * calendar says — are testable without a DOM.
 */
export function programRows(
  lang: string,
  cycles: CycleInfo[],
  weekday: number,
  adjustmentPct: number,
  weightedTemp: number | undefined,
): ProgramRow[] {
  return cycles.map((cycle) => ({
    cycle,
    // Delivery, never the setting: the contract calls this out because the two
    // differ whenever the zone's adjustment is not 100%, and the list is
    // describing what gets watered.
    minutes:
      weightedTemp === undefined ? null : Math.round(dayDelivery(cycle, weekday, adjustmentPct)),
    calendar: calendarText(lang, cycle.calendar, cycle.last_completed),
  }));
}

export class ImcProgramsBlock extends LitElement {
  @property({ attribute: false }) cycles: CycleInfo[] = [];
  @property({ attribute: false }) weightedTemp?: number;
  @property({ type: Number }) adjustmentPct = 100;
  @property() language = "en";
  @property({ type: Boolean }) showControls = true;

  static override styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 4px 0;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .row:first-child {
      border-top: none;
    }
    .name {
      font-size: 13px;
      color: var(--primary-text-color);
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      flex: 2 1 auto;
      min-width: 0;
    }
    .minutes {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      color: var(--primary-text-color);
    }
    .off {
      opacity: 0.55;
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
    .empty {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
  `;

  private _toggle(cycle: CycleInfo): void {
    // The block never calls a service: the shell owns every write, which is
    // what keeps the write paths countable and the block testable.
    this.dispatchEvent(
      new CustomEvent("imc-program-toggle", {
        detail: { cycleId: cycle.cycle_id, enabled: cycle.enabled === false },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render(): TemplateResult {
    if (this.cycles.length === 0) {
      return html`<div class="empty">${localize(this.language, "programs.none")}</div>`;
    }
    const weekday = (new Date().getDay() + 6) % 7; // JS Sunday=0 -> engine Monday=0
    const rows = programRows(
      this.language,
      this.cycles,
      weekday,
      this.adjustmentPct,
      this.weightedTemp,
    );

    return html`
      ${rows.map(
        (row) => html`
          <div class="row ${row.cycle.enabled === false ? "off" : ""}">
            <span class="name">${row.cycle.name ?? row.cycle.cycle_id}</span>
            <span class="meta">${row.calendar}</span>
            <span class="minutes">
              ${row.minutes === null
                ? "—"
                : localize(this.language, "programs.minutes", { n: row.minutes })}
            </span>
            ${this.showControls
              ? html`<button @click=${() => this._toggle(row.cycle)}>
                  ${localize(
                    this.language,
                    row.cycle.enabled === false ? "programs.enable" : "programs.disable",
                  )}
                </button>`
              : nothing}
          </div>
        `,
      )}
    `;
  }
}

defineElement("imc-programs-block", ImcProgramsBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-programs-block": ImcProgramsBlock;
  }
}
