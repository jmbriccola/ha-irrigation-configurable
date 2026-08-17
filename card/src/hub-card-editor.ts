import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { localize, localizeDynamic, pickLanguage } from "./localize/localize";
import { defineElement, HUB_CARD_BLOCKS, hubBlockEnabled } from "./types";
import type { HomeAssistant, HubCardBlock, HubCardConfig } from "./types";

/**
 * Visual editor for the hub card.
 *
 * Same writer discipline as the zone card's: only keys the user set are
 * written, "on" is a deletion rather than a `true`, and a config toggled twice
 * comes back byte-for-byte. There is no zone picker — there is one hub.
 */
export class IrrigationMaestroHubCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: HubCardConfig;

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
  `;

  public setConfig(config: HubCardConfig): void {
    this._config = { ...config };
  }

  private _emit(next: HubCardConfig): void {
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }),
    );
  }

  private _setBlock(block: HubCardBlock, enabled: boolean): void {
    if (!this._config) return;
    const blocks = { ...(this._config.blocks ?? {}) };
    if (enabled) delete blocks[block];
    else blocks[block] = false;
    const next: HubCardConfig = { ...this._config };
    if (Object.keys(blocks).length > 0) next.blocks = blocks;
    else delete next.blocks;
    this._emit(next);
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;
    const lang = pickLanguage(hass);

    return html`
      <div class="form">
        <label class="field">
          ${localize(lang, "hub_card_editor.title")}
          <input
            type="text"
            .value=${config.title ?? ""}
            @input=${(ev: Event) => {
              const value = (ev.currentTarget as HTMLInputElement).value;
              const next: HubCardConfig = { ...config };
              if (value) next.title = value;
              else delete next.title;
              this._emit(next);
            }}
          />
        </label>

        <div class="group">
          <span class="group-title">${localize(lang, "hub_card_editor.blocks")}</span>
          ${HUB_CARD_BLOCKS.map(
            (block) => html`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${hubBlockEnabled(config, block)}
                  @change=${(ev: Event) =>
                    this._setBlock(block, (ev.currentTarget as HTMLInputElement).checked)}
                />
                ${localizeDynamic(lang, "hub_block", block)}
              </label>
            `,
          )}
        </div>
      </div>
    `;
  }
}

defineElement("irrigation-maestro-hub-card-editor", IrrigationMaestroHubCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-hub-card-editor": IrrigationMaestroHubCardEditor;
  }
}
