import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { calendarText } from "../calendar-text";
import { describeTrigger, formatNumber, formatRelative } from "../format";
import type { RunEntry } from "../run-history";
import { localize, localizeDynamic } from "../localize/localize";
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
  /** When it starts — a clock time or a sun event with its offset. */
  start: string;
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
    // Absent since 3.7.0 despite being in that spec, and arguably the first
    // thing anyone wants from a program list.
    start: describeTrigger(cycle.trigger, lang),
  }));
}

export class ImcProgramsBlock extends LitElement {
  @property({ attribute: false }) cycles: CycleInfo[] = [];
  @property({ attribute: false }) weightedTemp?: number;
  @property({ type: Number }) adjustmentPct = 100;
  @property() language = "en";
  @property({ type: Boolean }) showControls = true;
  /**
   * The latest run per program, from the run log.
   *
   * `undefined` means the history has not been fetched (or failed); an empty
   * map means it was fetched and this zone has no runs in the window. The two
   * are rendered differently, because "we do not know" and "it has not run"
   * are different statements.
   */
  @property({ attribute: false }) lastRuns?: Map<string, RunEntry>;

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
    .last-run {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding: 0 0 4px 8px;
    }
    .last-run.muted {
      font-style: italic;
      opacity: 0.8;
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

  /**
   * How this program's last run went — the answer `zone_last_outcome` cannot
   * give, because it is per zone and a zone may have several programs.
   *
   * A skip is shown as prominently as a completion: a cycle that does not
   * start leaves no other trace, and those are the ones that get away.
   */
  private _lastRun(cycle: CycleInfo): TemplateResult | typeof nothing {
    if (this.lastRuns === undefined) return nothing;
    const lang = this.language;
    const id = cycle.cycle_id ?? "";
    const run = this.lastRuns.get(id);
    if (!run) {
      // Fetched, and this program has not run in the window. Saying so beats
      // an empty line, which reads as "no data" rather than "no runs".
      return html`<div class="last-run muted">${localize(lang, "programs.never_run")}</div>`;
    }
    const when = formatRelative(run.at, lang, Date.now()) ?? run.at;
    const figures = [
      run.durationMin !== null ? `${run.durationMin} min` : null,
      run.volumeL !== null ? `${formatNumber(run.volumeL, 0)} L` : null,
    ].filter((part): part is string => part !== null);
    return html`
      <div class="last-run">
        ${when} — ${localizeDynamic(lang, "outcome", run.result)}${run.reasonKey
          ? `: ${localizeDynamic(lang, "reason", run.reasonKey)}`
          : ""}${figures.length > 0 ? ` · ${figures.join(" · ")}` : ""}${run.scheduled
          ? ""
          : ` · ${localize(lang, "programs.manual")}`}
      </div>
    `;
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
            <span class="meta">${row.start ? `${row.start} · ` : ""}${row.calendar}</span>
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
          ${this._lastRun(row.cycle)}
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
