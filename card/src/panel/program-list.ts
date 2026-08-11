import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { HassEntity, HomeAssistant } from "../types";
import { asString, defineElement } from "../types";
import type { CycleInfo } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { readCycles, type ZoneBundle } from "../discovery";
import { describeTrigger } from "../format";
import { weekdayLabels, everyDay } from "../schedule-math";
import "./program-editor";

/** `imc-program-toggle`: enable/disable a program's `cycle_enabled` switch. */
export interface ProgramToggleDetail {
  zoneId: string;
  programId: string;
  entityId: string;
  enabled: boolean;
}

/** `imc-program-rename`: rename a program. */
export interface ProgramRenameDetail {
  zoneId: string;
  programId: string;
  name: string;
}

/** `imc-program-remove`: delete a program (backend refuses the last one). */
export interface ProgramRemoveDetail {
  zoneId: string;
  programId: string;
}

/**
 * List of a zone's programs (cycles): name, weekday chips, start-time
 * trigger description, and a minutes summary — plus an inline editor
 * (`imc-program-editor`) opened per program via an Edit button, and
 * enable/rename/delete actions. All of these emit bubbling+composed
 * CustomEvents that the panel maps to service calls; this component never
 * calls hass.callService itself.
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
    .link-btn.danger {
      color: var(--error-color, #db4437);
    }
    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      font-size: 12.5px;
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .switch {
      width: 34px;
      height: 20px;
      background: var(--divider-color, #444);
      border-radius: 999px;
      position: relative;
      transition: background 0.15s ease;
      flex: none;
    }
    .switch::after {
      content: "";
      position: absolute;
      left: 2px;
      top: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.15s ease;
    }
    .switch.on {
      background: var(--imc-accent, #3a6df0);
    }
    .switch.on::after {
      left: 16px;
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
      const cycleSwitch = c.cycle_id ? this._findCycleSwitch(zone, c.cycle_id) : undefined;
      const switchOn = cycleSwitch?.state === "on";
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
          ${cycleSwitch
            ? html`<div
                class="toggle-row"
                @click=${() => this._onToggle(zone.zoneId, c, cycleSwitch)}
              >
                <span class="switch ${switchOn ? "on" : ""}"></span>
                <span
                  >${localize(
                    lang,
                    switchOn ? "zone.cycle_enabled" : "zone.cycle_disabled",
                  )}</span
                >
              </div>`
            : nothing}
          ${c.cycle_id
            ? html`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => (this._editingId = editing ? undefined : c.cycle_id)}
                >
                  ${localize(lang, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(lang, zone.zoneId, c)}>
                  ${localize(lang, "panel.rename_program")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(lang, zone.zoneId, c)}
                >
                  ${localize(lang, "panel.delete_program")}
                </button>
              </div>`
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

  /** Find the `cycle_enabled` switch entity for a program, matched by the
   *  discovery-assigned `cycle_id` attribute (see docs/design/card-contract.md). */
  private _findCycleSwitch(zone: ZoneBundle, cycleId: string): HassEntity | undefined {
    return zone.cycleSwitches.find((e) => asString(e.attributes["cycle_id"]) === cycleId);
  }

  private _dispatch<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }

  private _onToggle(zoneId: string, c: CycleInfo, entity: HassEntity): void {
    if (!c.cycle_id) return;
    this._dispatch<ProgramToggleDetail>("imc-program-toggle", {
      zoneId,
      programId: c.cycle_id,
      entityId: entity.entity_id,
      enabled: entity.state !== "on",
    });
  }

  private _onRename(lang: string, zoneId: string, c: CycleInfo): void {
    if (!c.cycle_id) return;
    const current = c.name ?? "";
    const name = window.prompt(localize(lang, "panel.rename_program"), current);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === current) return;
    this._dispatch<ProgramRenameDetail>("imc-program-rename", {
      zoneId,
      programId: c.cycle_id,
      name: trimmed,
    });
  }

  private _onDelete(lang: string, zoneId: string, c: CycleInfo): void {
    if (!c.cycle_id) return;
    const name = c.name ?? c.cycle_id;
    if (!window.confirm(localize(lang, "panel.confirm_delete_program", { name }))) return;
    this._dispatch<ProgramRemoveDetail>("imc-program-remove", { zoneId, programId: c.cycle_id });
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
