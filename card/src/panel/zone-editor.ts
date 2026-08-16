import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { localize, pickLanguage } from "../localize/localize";
import { asNumber, defineElement } from "../types";
import type { HomeAssistant } from "../types";
import type { ZoneData } from "./config-read";
import { FLOW_UNITS, detectedFlowUnit, flowUnitNote } from "./flow-units";
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
    flow_sensor_unit?: string;
    nominal_flow_lpm?: number;
    flow_tolerance_pct?: number;
    leak_sensor?: string;
    water_supply_sensor?: string;
    adjustment_pct?: number;
    order?: number;
    compatibility_group?: string;
  };
}

export interface ZoneRemoveDetail {
  zoneId: string;
}

/**
 * What `discover_zone_sensors` answers for one zone: what it is already
 * configured with, and what the valve's own device could offer.
 *
 * Server-side because the frontend cannot do it — the card's `hass` object
 * exposes states only, with no entity or device registry, and a state's
 * attributes never carry a `device_id`. Candidates are matched by
 * `device_class` alone, never by entity id or name: the panel must not
 * re-derive them from names either.
 */
export interface ZoneSensorDiscovery {
  leak_sensor?: string;
  water_supply_sensor?: string;
  leak_candidate?: string;
  supply_candidate?: string;
}

/**
 * The `.field-note` under a sensor picker: where the value could come from,
 * in the same idiom the flow unit's note uses.
 *
 * `undefined` means "say nothing", and it covers two different silences on
 * purpose:
 *
 * - **The discovery was never read** (the service failed, or has not
 *   answered). "This device offers no leak sensor" would then be an
 *   assertion about hardware nobody asked about.
 * - **A sensor is chosen and the device offers no candidate.** That is a
 *   probe somewhere else in the garden, which the capability model calls a
 *   legitimate, deliberate choice — warning about it would push the user to
 *   "fix" a configuration that is already right.
 */
export function sensorNote(
  lang: string,
  kind: "leak" | "supply",
  value: string,
  discovery: ZoneSensorDiscovery | undefined,
): string | undefined {
  if (!discovery) return undefined;
  const candidate = kind === "leak" ? discovery.leak_candidate : discovery.supply_candidate;
  if (candidate) return localize(lang, "zone.sensor_detected", { entity: candidate });
  if (value.trim() !== "") return undefined;
  return localize(lang, kind === "leak" ? "zone.leak_sensor_none" : "zone.water_supply_none");
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
  /** `discover_zone_sensors`' answer for this zone, read by the panel when
   *  the editor opens. Undefined until it lands, and after a failed read —
   *  see `sensorNote` for why that is not the same as "nothing found". */
  @property({ attribute: false }) sensorDiscovery?: ZoneSensorDiscovery;

  @state() private _name = "";
  @state() private _valve = "";
  @state() private _areaM2?: number;

  // Advanced fields — only ever populated (seeded/edited) in edit mode; see
  // the class doc comment + `_save` for why they must never reach `add_zone`.
  @state() private _flowSensor = "";
  @state() private _flowSensorUnit = "";
  @state() private _leakSensor = "";
  @state() private _waterSupplySensor = "";
  @state() private _nominalFlowLpm?: number;
  @state() private _flowTolerancePct?: number;
  @state() private _adjustmentPct?: number;
  @state() private _order?: number;
  @state() private _compatibilityGroup = "";
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
    .field-note {
      margin-top: 6px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
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

  /**
   * Seeding happens once per zone. `sensorDiscovery` therefore has to be set
   * in the SAME update as `zone`/`zoneId` — the panel reads the config and
   * the discovery together and assigns both before the editor renders. A
   * discovery arriving in a later update would be ignored rather than
   * re-seeding, which is the right trade: re-seeding on any later property
   * change would throw away whatever the user had already typed.
   */
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
    this._flowSensorUnit = zone?.flow_sensor_unit ?? "";
    // Detection proposes, storage decides. `??` is doing real work here:
    // it fires on a key that was NEVER written and not on an empty string,
    // and the backend keeps those two apart on purpose (`update_zone` stores
    // "" verbatim; a zone it never touched carries no key at all). So a zone
    // predating this feature is offered its device's candidate, while a
    // sensor the user deliberately cleared stays cleared instead of being
    // re-proposed on every visit — which, since this field is sent on every
    // save, would make un-choosing a sensor impossible.
    const discovery = this.sensorDiscovery;
    this._leakSensor = zone?.leak_sensor ?? discovery?.leak_candidate ?? "";
    this._waterSupplySensor =
      zone?.water_supply_sensor ?? discovery?.supply_candidate ?? "";
    this._nominalFlowLpm = zone?.nominal_flow_lpm;
    this._flowTolerancePct = zone?.flow_tolerance_pct;
    this._adjustmentPct = zone?.adjustment_pct;
    this._order = zone?.order;
    this._compatibilityGroup = zone?.compatibility_group ?? "";
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

  /**
   * The unit this zone's meter reports in. Rendered only while a meter is in
   * the picker above: with no meter there is nothing to state a unit for, and
   * the note below would warn about ignored readings that do not exist.
   *
   * Emptying the picker only hides this field, it does not clear the stored
   * override — an empty `flow_sensor` is omitted from the patch, so the zone
   * keeps the meter it had, and dropping the unit under it would leave that
   * meter being read in whatever unit it declares. (The hub's line meter
   * differs: `set_weather_sources` really does clear it, and drops its unit
   * with it — see settings-view's `_setLineFlowSensor`.)
   *
   * "Detected from the entity" is a real option, not an empty placeholder —
   * it is how the user hands the decision back to the entity, and saving it
   * sends `""`, which `update_zone` treats as "clear the override".
   */
  private _renderFlowUnit(lang: string): TemplateResult | typeof nothing {
    const sensor = this._flowSensor.trim();
    if (sensor === "") return nothing;
    const detected = this.hass ? detectedFlowUnit(this.hass, sensor) : undefined;
    const label = localize(lang, "zone.field_flow_unit");
    const chosen = this._flowSensorUnit;
    // The selection is carried by each <option>, NOT by a `.value` binding on
    // the <select>: lit-html commits an element's own bindings before its
    // children, so on first render `.value` would be assigned while the unit
    // options do not exist yet and would silently fall back to "auto" — the
    // control would then contradict the note right below it.
    return html`
      <div class="section-label">${label}</div>
      <select
        class="field"
        aria-label=${label}
        @change=${(e: Event) => (this._flowSensorUnit = (e.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${chosen === ""}>
          ${localize(lang, "zone.flow_unit_auto")}
        </option>
        ${FLOW_UNITS.map(
          (unit) => html`<option value=${unit} ?selected=${chosen === unit}>${unit}</option>`,
        )}
      </select>
      <div class="field-note">${flowUnitNote(lang, this._flowSensorUnit, detected)}</div>
    `;
  }

  /**
   * One of the two `binary_sensor` fields, with the provenance underneath it
   * in the same `.field-note` idiom the flow unit uses.
   *
   * The picker is filtered by `device_class` rather than by domain alone,
   * mirroring how the backend finds candidates: `moisture` for a leak,
   * `problem` for the water supply. It is a filter, not a rule — the user is
   * free to pick anything the selector will show them, and a probe elsewhere
   * in the garden is a legitimate choice.
   *
   * The supply field carries one extra line, always: its polarity is
   * inverted with respect to its name (`on` means there is NO water), and a
   * user who reads it the other way round configures a zone that refuses to
   * water whenever everything is fine.
   */
  private _renderSensorPicker(lang: string, kind: "leak" | "supply"): TemplateResult {
    const isLeak = kind === "leak";
    const label = localize(
      lang,
      isLeak ? "zone.field_leak_sensor" : "zone.field_water_supply_sensor",
    );
    const value = isLeak ? this._leakSensor : this._waterSupplySensor;
    const note = sensorNote(lang, kind, value, this.sensorDiscovery);
    return html`
      <div class="section-label">${label}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{
          entity: { domain: "binary_sensor", device_class: isLeak ? "moisture" : "problem" },
        }}
        .value=${value}
        .label=${label}
        @value-changed=${(e: CustomEvent<{ value: string }>) => {
          if (isLeak) this._leakSensor = e.detail.value;
          else this._waterSupplySensor = e.detail.value;
        }}
      ></imc-entity-picker>
      ${note ? html`<div class="field-note">${note}</div>` : nothing}
      ${isLeak
        ? nothing
        : html`<div class="field-note">
            ${localize(lang, "zone.water_supply_polarity")}
          </div>`}
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
      ${this._renderFlowUnit(lang)}

      ${this._renderSensorPicker(lang, "leak")}
      ${this._renderSensorPicker(lang, "supply")}

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
      // Always sent, unlike every other field here: for this one "unset" is
      // itself a choice the user can make in the picker (detect
      // automatically), and `update_zone` reads `""` as "clear the override".
      // Omitting it when empty would leave a stored override unremovable.
      patch.flow_sensor_unit = this._flowSensorUnit.trim();
      // Also always sent, for the same reason and a second one. "No sensor"
      // is a state the user can choose here — clearing a leak sensor they
      // have stopped trusting is the very reaction the backend's
      // source-withdrawal path was written for — and `update_zone` stores ""
      // verbatim, which every consumer reads as unset. Omitting them when
      // empty would leave a chosen sensor unremovable from this panel.
      patch.leak_sensor = this._leakSensor.trim();
      patch.water_supply_sensor = this._waterSupplySensor.trim();
      if (this._nominalFlowLpm !== undefined) patch.nominal_flow_lpm = this._nominalFlowLpm;
      if (this._flowTolerancePct !== undefined) {
        patch.flow_tolerance_pct = this._flowTolerancePct;
      }
      if (this._adjustmentPct !== undefined) patch.adjustment_pct = this._adjustmentPct;
      if (this._order !== undefined) patch.order = this._order;
      if (this._compatibilityGroup.trim() !== "") {
        patch.compatibility_group = this._compatibilityGroup.trim();
      }
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
