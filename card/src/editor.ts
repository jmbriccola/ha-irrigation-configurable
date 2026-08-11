import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { discover } from "./discovery";
import type { CardConfig, HomeAssistant } from "./types";
import { defineElement } from "./types";
import { localize, pickLanguage } from "./localize/localize";
import type { TranslationKey } from "./localize/localize";

type BooleanOption = "show_header" | "show_queue" | "show_controls" | "compact";

const BOOLEAN_OPTIONS: ReadonlyArray<{
  key: BooleanOption;
  label: TranslationKey;
  fallback: boolean;
}> = [
  { key: "show_header", label: "editor.show_header", fallback: true },
  { key: "show_queue", label: "editor.show_queue", fallback: true },
  { key: "show_controls", label: "editor.show_controls", fallback: true },
  { key: "compact", label: "editor.compact", fallback: false },
];

/**
 * Visual configuration editor. Uses plain Lit-rendered inputs so it
 * works with no external dependencies.
 */
export class IrrigationMaestroCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: CardConfig;

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
    input[type="text"] {
      font: inherit;
      font-size: 14px;
      color: var(--primary-text-color);
      background: var(--card-background-color, transparent);
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 8px 10px;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--primary-color, #03a9f4);
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
    .zones {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .zones-title {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      opacity: 0.9;
    }
  `;

  public setConfig(config: CardConfig): void {
    this._config = { ...config };
  }

  private _emitConfig(next: CardConfig): void {
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onTitleInput(ev: Event): void {
    if (!this._config) return;
    const value = (ev.currentTarget as HTMLInputElement).value;
    const next: CardConfig = { ...this._config };
    if (value) {
      next.title = value;
    } else {
      delete next.title;
    }
    this._emitConfig(next);
  }

  private _onToggle(key: BooleanOption, ev: Event): void {
    if (!this._config) return;
    const checked = (ev.currentTarget as HTMLInputElement).checked;
    this._emitConfig({ ...this._config, [key]: checked });
  }

  private _onZoneToggle(zoneId: string, ev: Event): void {
    if (!this._config) return;
    const checked = (ev.currentTarget as HTMLInputElement).checked;
    const current = new Set(this._config.zones ?? []);
    if (checked) {
      current.add(zoneId);
    } else {
      current.delete(zoneId);
    }
    const next: CardConfig = { ...this._config };
    if (current.size > 0) {
      next.zones = [...current];
    } else {
      delete next.zones;
    }
    this._emitConfig(next);
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const lang = pickLanguage(hass);
    const zones = discover(hass).zones;
    const selected = new Set(config.zones ?? []);

    return html`
      <div class="form">
        <label class="field">
          ${localize(lang, "card_editor.title")}
          <input
            type="text"
            .value=${config.title ?? ""}
            placeholder=${localize(lang, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${BOOLEAN_OPTIONS.map(
          ({ key, label, fallback }) => html`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${config[key] ?? fallback}
                @change=${(ev: Event) => this._onToggle(key, ev)}
              />
              ${localize(lang, label)}
            </label>
          `,
        )}

        <div class="zones">
          <span class="zones-title">${localize(lang, "editor.zones")}</span>
          ${zones.length === 0
            ? html`<span class="hint">${localize(lang, "editor.no_zones")}</span>`
            : html`
                ${zones.map(
                  (zone) => html`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${selected.has(zone.zoneId)}
                        @change=${(ev: Event) =>
                          this._onZoneToggle(zone.zoneId, ev)}
                      />
                      ${zone.name}
                    </label>
                  `,
                )}
                <span class="hint">${localize(lang, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
}

defineElement("irrigation-maestro-card-editor", IrrigationMaestroCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-card-editor": IrrigationMaestroCardEditor;
  }
}
