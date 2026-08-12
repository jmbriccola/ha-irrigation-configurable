import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { localize, pickLanguage } from "../localize/localize";
import { asNumber, defineElement } from "../types";
import type { HomeAssistant } from "../types";
import type { ZoneData } from "./config-read";
// Side-effect import: registers <imc-entity-picker>, used for the Valvola
// field (and, in the Avanzate drawer, the flow-sensor field).
import "./ha-selector";

/**
 * The zone create/edit form (spec §1.2). A normal user only ever touches
 * Nome / Valvola / Area — the remaining fields live behind an ▸ Avanzate
 * drawer.
 *
 * CRITICAL: the Avanzate drawer is rendered ONLY in edit mode (`this.zone`
 * set). Phase A's `add_zone` service accepts *only* `name`, `valve_entity`,
 * `area_m2`, `icon` — its voluptuous schema has no ALLOW_EXTRA, so any other
 * field in the payload makes the call hard-fail. A new zone is therefore
 * created with the basics and refined afterward via `update_zone` (which
 * does accept the advanced fields). See `_save` for the matching guard on
 * the patch itself.
 */

export interface ZoneSaveDetail {
  mode: "add" | "update";
  zoneId?: string;
  patch: {
    name: string;
    valve_entity: string;
    area_m2?: number;
    icon?: string;
    flow_sensor?: string;
    nominal_flow_lpm?: number;
    flow_tolerance_pct?: number;
    adjustment_pct?: number;
    order?: number;
    interval_days?: number;
    compatibility_group?: string;
    season_months?: number[];
  };
}

export interface ZoneRemoveDetail {
  zoneId: string;
}

const MONTH_LABELS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
};

function monthLabels(lang: string): string[] {
  return MONTH_LABELS[lang] ?? MONTH_LABELS.en!;
}

export class ImcZoneEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) zone?: ZoneData;
  @property() zoneId?: string;

  @state() private _name = "";
  @state() private _valve = "";
  @state() private _areaM2?: number;

  // Advanced fields — only ever populated (seeded/edited) in edit mode; see
  // the class doc comment + `_save` for why they must never reach `add_zone`.
  @state() private _flowSensor = "";
  @state() private _nominalFlowLpm?: number;
  @state() private _flowTolerancePct?: number;
  @state() private _adjustmentPct?: number;
  @state() private _order?: number;
  @state() private _intervalDays?: number;
  @state() private _compatibilityGroup = "";
  @state() private _seasonMonths: number[] = [];
  @state() private _advancedOpen = false;

  private _seededZoneId?: string;

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .header {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
      font-family: inherit;
    }
    .months {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .month {
      min-width: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      text-align: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .month.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      color: var(--imc-accent, #8ab4ff);
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    .buttons button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .buttons button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .buttons button.danger {
      flex: 0 0 auto;
      background: transparent;
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if ((changed.has("zone") || changed.has("zoneId")) && this.zoneId !== this._seededZoneId) {
      this._seededZoneId = this.zoneId;
      this._seedFromZone();
    }
  }

  private _seedFromZone(): void {
    const zone = this.zone;
    this._name = zone?.name ?? "";
    this._valve = zone?.valve_entity ?? "";
    this._areaM2 = zone?.area_m2;
    this._flowSensor = zone?.flow_sensor ?? "";
    this._nominalFlowLpm = zone?.nominal_flow_lpm;
    this._flowTolerancePct = zone?.flow_tolerance_pct;
    this._adjustmentPct = zone?.adjustment_pct;
    this._order = zone?.order;
    this._intervalDays = zone?.interval_days;
    this._compatibilityGroup = zone?.compatibility_group ?? "";
    this._seasonMonths = zone?.season_months ? [...zone.season_months] : [];
    this._advancedOpen = false;
  }

  private get _canSave(): boolean {
    return this._name.trim() !== "" && this._valve.trim() !== "";
  }

  protected override render(): TemplateResult {
    const lang = pickLanguage(this.hass);
    const isEdit = !!this.zone;

    return html`
      <div class="header">${localize(lang, isEdit ? "zone.edit" : "zone.add")}</div>

      <div class="section-label">${localize(lang, "zone.field_name")}</div>
      <input
        class="field"
        type="text"
        .value=${this._name}
        @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
      />

      <div class="section-label">${localize(lang, "zone.field_valve")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: ["valve", "switch"] } }}
        .value=${this._valve}
        .label=${localize(lang, "zone.field_valve")}
        @value-changed=${(e: CustomEvent<{ value: string }>) => (this._valve = e.detail.value)}
      ></imc-entity-picker>

      <div class="section-label">${localize(lang, "zone.field_area")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._areaM2 ?? ""}
        @input=${(e: Event) =>
          (this._areaM2 = asNumber((e.target as HTMLInputElement).value))}
      />
      ${isEdit
        ? html`
            <div
              class="section-label advanced-toggle"
              @click=${() => (this._advancedOpen = !this._advancedOpen)}
            >
              ${this._advancedOpen ? "▾" : "▸"} ${localize(lang, "zone.advanced")}
            </div>
            ${this._advancedOpen ? this._renderAdvanced(lang) : nothing}
          `
        : nothing}

      <div class="buttons">
        ${isEdit
          ? html`<button class="danger" type="button" @click=${this._remove}>
              🗑 ${localize(lang, "zone.delete")}
            </button>`
          : nothing}
        <button type="button" @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>
        <button
          class="primary"
          type="button"
          ?disabled=${!this._canSave}
          @click=${this._save}
        >
          ${localize(lang, "editor.save")}
        </button>
      </div>
    `;
  }

  private _renderAdvanced(lang: string): TemplateResult {
    return html`
      <div class="section-label">${localize(lang, "zone.field_flow_sensor")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: "sensor" } }}
        .value=${this._flowSensor}
        .label=${localize(lang, "zone.field_flow_sensor")}
        @value-changed=${(e: CustomEvent<{ value: string }>) =>
          (this._flowSensor = e.detail.value)}
      ></imc-entity-picker>

      <div class="section-label">${localize(lang, "zone.field_flow_nominal")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._nominalFlowLpm ?? ""}
        @input=${(e: Event) =>
          (this._nominalFlowLpm = asNumber((e.target as HTMLInputElement).value))}
      />

      <div class="section-label">${localize(lang, "zone.field_flow_tolerance")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="100"
        step="1"
        .value=${this._flowTolerancePct ?? ""}
        @input=${(e: Event) =>
          (this._flowTolerancePct = asNumber((e.target as HTMLInputElement).value))}
      />

      <div class="section-label">${localize(lang, "zone.field_adjustment")}</div>
      <input
        class="field"
        type="number"
        min="10"
        max="300"
        step="1"
        .value=${this._adjustmentPct ?? ""}
        @input=${(e: Event) =>
          (this._adjustmentPct = asNumber((e.target as HTMLInputElement).value))}
      />

      <div class="section-label">${localize(lang, "zone.field_order")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="1000"
        step="1"
        .value=${this._order ?? ""}
        @input=${(e: Event) => (this._order = asNumber((e.target as HTMLInputElement).value))}
      />

      <div class="section-label">${localize(lang, "zone.field_interval")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="60"
        step="1"
        .value=${this._intervalDays ?? ""}
        @input=${(e: Event) =>
          (this._intervalDays = asNumber((e.target as HTMLInputElement).value))}
      />

      <div class="section-label">${localize(lang, "zone.field_season")}</div>
      <div class="months">
        ${monthLabels(lang).map((lbl, i) => {
          const m = i + 1;
          return html`
            <div
              class="month ${this._seasonMonths.includes(m) ? "on" : ""}"
              @click=${() => (this._seasonMonths = this._toggleMonth(m))}
            >
              ${lbl}
            </div>
          `;
        })}
      </div>

      <div class="section-label">${localize(lang, "zone.field_group")}</div>
      <input
        class="field"
        type="text"
        .value=${this._compatibilityGroup}
        @input=${(e: Event) =>
          (this._compatibilityGroup = (e.target as HTMLInputElement).value)}
      />
    `;
  }

  private _toggleMonth(month: number): number[] {
    const set = new Set(this._seasonMonths);
    if (set.has(month)) set.delete(month);
    else set.add(month);
    return [...set].sort((a, b) => a - b);
  }

  private _save(): void {
    if (!this._canSave) return;
    const isEdit = !!this.zone;

    const patch: ZoneSaveDetail["patch"] = {
      name: this._name.trim(),
      valve_entity: this._valve.trim(),
    };
    if (this._areaM2 !== undefined) patch.area_m2 = this._areaM2;

    // Defense in depth: even though the Avanzate drawer (and therefore any
    // edit to these fields) only ever renders in edit mode, guard here too
    // so a create-mode `patch` can never carry a field `add_zone` rejects.
    if (isEdit) {
      if (this._flowSensor.trim() !== "") patch.flow_sensor = this._flowSensor.trim();
      if (this._nominalFlowLpm !== undefined) patch.nominal_flow_lpm = this._nominalFlowLpm;
      if (this._flowTolerancePct !== undefined) {
        patch.flow_tolerance_pct = this._flowTolerancePct;
      }
      if (this._adjustmentPct !== undefined) patch.adjustment_pct = this._adjustmentPct;
      if (this._order !== undefined) patch.order = this._order;
      if (this._intervalDays !== undefined) patch.interval_days = this._intervalDays;
      if (this._compatibilityGroup.trim() !== "") {
        patch.compatibility_group = this._compatibilityGroup.trim();
      }
      if (this._seasonMonths.length > 0) patch.season_months = [...this._seasonMonths];
    }

    this.dispatchEvent(
      new CustomEvent<ZoneSaveDetail>("imc-zone-save", {
        detail: { mode: isEdit ? "update" : "add", zoneId: this.zoneId, patch },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _remove(): void {
    const zoneId = this.zoneId;
    if (!zoneId) return;
    const lang = pickLanguage(this.hass);
    if (!window.confirm(`${localize(lang, "zone.delete")}?`)) return;
    this.dispatchEvent(
      new CustomEvent<ZoneRemoveDetail>("imc-zone-remove", {
        detail: { zoneId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-zone-cancel", { bubbles: true, composed: true }),
    );
  }
}

defineElement("imc-zone-editor", ImcZoneEditor);

declare global {
  interface HTMLElementTagNameMap {
    "imc-zone-editor": ImcZoneEditor;
  }
}
