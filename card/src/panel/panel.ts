import { LitElement, html, css, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";

export class IrrigationMaestroPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: unknown;
  @property({ attribute: false }) panel?: unknown;

  @state() private _error?: string;

  static override styles = css`
    :host { display: block; height: 100%; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 20px; font-weight: 600; }
  `;

  override render(): TemplateResult {
    const lang = pickLanguage(this.hass);
    return html`
      <div class="wrap">
        <h1>${localize(lang, "panel.title")}</h1>
      </div>
    `;
  }
}

defineElement("irrigation-maestro-panel", IrrigationMaestroPanel);
