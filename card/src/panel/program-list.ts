import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import type { CycleInfo } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { readCycles, type ZoneBundle } from "../discovery";
import { describeTrigger } from "../format";
import { weekdayLabels, everyDay } from "../schedule-math";
import "./program-editor";

/**
 * List of a zone's programs (cycles): name, weekday chips, start-time
 * trigger description, and a minutes summary — plus an inline editor
 * (`imc-program-editor`) opened per program via an Edit button. The editor's
 * save/cancel events bubble (composed) up to the panel, which owns the
 * actual service calls; this component only tracks which program is open.
 */
export class ImcProgramList extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) zone?: ZoneBundle;
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _editingId?: string;

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
    .link-btn {
      margin-top: 8px;
      border: none;
      background: transparent;
      padding: 2px 0;
      font-size: 11px;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      text-decoration: underline;
    }
    .link-btn:hover {
      opacity: 0.8;
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
      const editing = !!c.cycle_id && this._editingId === c.cycle_id;
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
          ${c.cycle_id
            ? html`<button
                class="link-btn"
                @click=${() => (this._editingId = editing ? undefined : c.cycle_id)}
              >
                ${localize(lang, "panel.edit_program")}
              </button>`
            : nothing}
          ${editing
            ? html`<imc-program-editor
                .hass=${hass}
                .zoneId=${zone.zoneId}
                .cycle=${c}
                .weightedTemp=${this.weightedTemp}
                @imc-program-save-schedule=${() => (this._editingId = undefined)}
                @imc-program-save-minutes=${() => (this._editingId = undefined)}
                @imc-program-cancel=${() => (this._editingId = undefined)}
              ></imc-program-editor>`
            : nothing}
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
