import { LitElement, html, css, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import type { CycleInfo } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { readCycles, type ZoneBundle } from "../discovery";
import { describeTrigger } from "../format";
import { weekdayLabels, everyDay } from "../schedule-math";

/**
 * Read-only list of a zone's programs (cycles): name, weekday chips,
 * start-time trigger description, and a minutes summary. No service
 * calls, no editing, no events — that lands in a later task.
 */
export class ImcProgramList extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) zone?: ZoneBundle;

  static override styles = css`
    .prog {
      border: 1px solid var(--divider-color, #333);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .name {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .days {
      display: flex;
      gap: 5px;
      margin: 6px 0;
    }
    .day {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .meta {
      font-size: 12.5px;
      color: var(--secondary-text-color);
    }
  `;

  override render(): TemplateResult {
    const hass = this.hass;
    const zone = this.zone;
    if (!hass || !zone) return html``;
    const lang = pickLanguage(hass);
    const cycles: CycleInfo[] = readCycles(zone);
    if (cycles.length === 0) {
      return html`<div class="meta">${localize(lang, "panel.no_programs")}</div>`;
    }
    const labels = weekdayLabels(lang);
    return html`${cycles.map((c) => {
      const on = c.days ?? [];
      const isEvery = everyDay(c.days);
      return html`
        <div class="prog">
          <div class="name">${c.name ?? c.cycle_id}</div>
          <div class="days">
            ${labels.map(
              (lbl, wd) => html`
                <div class="day ${isEvery || on.includes(wd) ? "on" : ""}">
                  ${lbl}
                </div>
              `,
            )}
          </div>
          <div class="meta">
            ${describeTrigger(c.trigger, lang)} · ${this._minutesSummary(lang, c)}
          </div>
        </div>
      `;
    })}`;
  }

  private _minutesSummary(lang: string, c: CycleInfo): string {
    if (c.day_minutes && Object.keys(c.day_minutes).length > 0) {
      return localize(lang, "panel.per_day_minutes");
    }
    return localize(lang, "panel.minutes_value", { min: c.amount ?? "?" });
  }
}

defineElement("imc-program-list", ImcProgramList);

declare global {
  interface HTMLElementTagNameMap {
    "imc-program-list": ImcProgramList;
  }
}
