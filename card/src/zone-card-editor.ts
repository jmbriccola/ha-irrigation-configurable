import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { discover } from "./discovery";
import { localize, localizeDynamic, pickLanguage } from "./localize/localize";
import {
  defineElement,
  ZONE_CARD_BLOCKS,
  ZONE_CARD_CHART_DAYS,
  zoneBlockEnabled,
} from "./types";
import type { HomeAssistant, ZoneCardBlock, ZoneCardConfig } from "./types";
import "./panel/ha-selector";

/**
 * Visual editor for the zone card.
 *
 * The rule that shapes every writer below: **the config round-trips
 * losslessly.** The editor writes only keys the user actually set, and an
 * unset block key means "default", never `false`. A card configured in YAML
 * with three keys must come back out of this editor with three keys — anything
 * else rewrites a user's file behind their back the first time they open the
 * editor to look at it.
 */
export class IrrigationMaestroZoneCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: ZoneCardConfig;

  static override styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 4px 0;
    }
    label.field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    input[type="text"],
    select {
      font: inherit;
      font-size: 14px;
      color: var(--primary-text-color);
      background: var(--card-background-color, transparent);
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 8px 10px;
    }
    label.toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary-color, #03a9f4);
      cursor: pointer;
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .group-title {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
  `;

  public setConfig(config: ZoneCardConfig): void {
    this._config = { ...config };
  }

  private _emit(next: ZoneCardConfig): void {
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Set a key, or delete it when the value is the default — never write a default out. */
  private _set(key: keyof ZoneCardConfig, value: unknown, isDefault: boolean): void {
    if (!this._config) return;
    const next: ZoneCardConfig = { ...this._config };
    if (isDefault) {
      delete next[key];
    } else {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
    this._emit(next);
  }

  private _setBlock(block: ZoneCardBlock, enabled: boolean): void {
    if (!this._config) return;
    const blocks = { ...(this._config.blocks ?? {}) };
    if (enabled) {
      // Deleted, not set to true: "on" is the default, and writing it out
      // would grow the user's YAML by one key every time they toggled twice.
      delete blocks[block];
    } else {
      blocks[block] = false;
    }
    const next: ZoneCardConfig = { ...this._config };
    if (Object.keys(blocks).length > 0) {
      next.blocks = blocks;
    } else {
      delete next.blocks;
    }
    this._emit(next);
  }

  private _setSource(source: "internal" | "entity"): void {
    if (!this._config) return;
    const next: ZoneCardConfig = { ...this._config };
    if (source === "internal") {
      // The entity keys are meaningless for the internal source, and leaving
      // them behind would resurrect stale entity ids the day the user switches
      // back — a config that remembers a choice it no longer shows.
      delete next.consumption_source;
      delete next.total_entity;
      delete next.today_entity;
      delete next.month_entity;
    } else {
      next.consumption_source = "entity";
    }
    this._emit(next);
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const lang = pickLanguage(hass);
    const zones = discover(hass).zones;
    const source = config.consumption_source ?? "internal";

    return html`
      <div class="form">
        <label class="field">
          ${localize(lang, "zone_card_editor.zone")}
          <select
            .value=${config.zone ?? ""}
            @change=${(ev: Event) =>
              this._set("zone", (ev.currentTarget as HTMLSelectElement).value, false)}
          >
            ${zones.map(
              (zone) =>
                html`<option value=${zone.zoneId} ?selected=${zone.zoneId === config.zone}>
                  ${zone.name}
                </option>`,
            )}
          </select>
        </label>

        <label class="field">
          ${localize(lang, "zone_card_editor.title")}
          <input
            type="text"
            .value=${config.title ?? ""}
            placeholder=${localize(lang, "zone_card_editor.title_placeholder")}
            @input=${(ev: Event) => {
              const value = (ev.currentTarget as HTMLInputElement).value;
              this._set("title", value, value === "");
            }}
          />
        </label>

        <div class="group">
          <span class="group-title">${localize(lang, "zone_card_editor.blocks")}</span>
          ${ZONE_CARD_BLOCKS.map(
            (block) => html`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${zoneBlockEnabled(config, block)}
                  @change=${(ev: Event) =>
                    this._setBlock(block, (ev.currentTarget as HTMLInputElement).checked)}
                />
                ${localizeDynamic(lang, "block", block)}
              </label>
            `,
          )}
        </div>

        <label class="field">
          ${localize(lang, "zone_card_editor.chart_days")}
          <select
            @change=${(ev: Event) => {
              const value = Number((ev.currentTarget as HTMLSelectElement).value);
              this._set("chart_days", value, value === 30);
            }}
          >
            ${ZONE_CARD_CHART_DAYS.map(
              (days) =>
                html`<option value=${days} ?selected=${(config.chart_days ?? 30) === days}>
                  ${localize(lang, "zone_card_editor.days", { n: days })}
                </option>`,
            )}
          </select>
        </label>

        <label class="field">
          ${localize(lang, "zone_card_editor.consumption_source")}
          <select
            @change=${(ev: Event) =>
              this._setSource(
                (ev.currentTarget as HTMLSelectElement).value as "internal" | "entity",
              )}
          >
            <option value="internal" ?selected=${source === "internal"}>
              ${localize(lang, "zone_card_editor.source_internal")}
            </option>
            <option value="entity" ?selected=${source === "entity"}>
              ${localize(lang, "zone_card_editor.source_entity")}
            </option>
          </select>
        </label>

        ${source === "entity"
          ? html`
              ${(
                [
                  ["total_entity", "zone_card_editor.total_entity"],
                  ["today_entity", "zone_card_editor.today_entity"],
                  ["month_entity", "zone_card_editor.month_entity"],
                ] as const
              ).map(
                ([key, labelKey]) => html`
                  <label class="field">
                    ${localize(lang, labelKey)}
                    <imc-entity-picker
                      .hass=${hass}
                      .value=${config[key] ?? ""}
                      .selector=${{ entity: { domain: "sensor" } }}
                      @value-changed=${(ev: CustomEvent<{ value: string }>) =>
                        this._set(key, ev.detail.value, !ev.detail.value)}
                    ></imc-entity-picker>
                  </label>
                `,
              )}
            `
          : nothing}

        <label class="field">
          ${localize(lang, "zone_card_editor.battery_entity")}
          <imc-entity-picker
            .hass=${hass}
            .value=${config.battery_entity ?? ""}
            .selector=${{ entity: { domain: "sensor" } }}
            @value-changed=${(ev: CustomEvent<{ value: string }>) =>
              this._set("battery_entity", ev.detail.value, !ev.detail.value)}
          ></imc-entity-picker>
          <span class="hint">${localize(lang, "zone_card_editor.battery_hint")}</span>
        </label>
      </div>
    `;
  }
}

defineElement("irrigation-maestro-zone-card-editor", IrrigationMaestroZoneCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-zone-card-editor": IrrigationMaestroZoneCardEditor;
  }
}
