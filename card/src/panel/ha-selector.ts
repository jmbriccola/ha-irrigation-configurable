import { LitElement, html, css, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";

/**
 * `device_class` sits beside `domain` at the top level of the entity filter.
 * That is Home Assistant's legacy filter shape — feature-frozen rather than
 * deprecated, still carried by `_LegacyEntityFilterSelectorConfig` in HA's
 * own `helpers/selector.py`, and the form this integration's `services.yaml`
 * already uses for every entity field it declares. Same shape here, so the
 * panel and the services agree about what a leak sensor looks like.
 */
export type EntitySelectorConfig = {
  entity: { domain?: string | string[]; device_class?: string | string[] };
};

/** True iff HA's native <ha-selector> is registered in this document. */
export function useNativeSelector(): boolean {
  return typeof customElements !== "undefined" && !!customElements.get("ha-selector");
}

/**
 * Entity picker that reuses HA's native <ha-selector> at runtime (never
 * bundled — it lives in the frontend, shared via panel_custom
 * embed_iframe=False). Falls back to a plain entity-id text input when the
 * element isn't available, so the form never renders an empty box.
 */
export class ImcEntityPicker extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) selector: EntitySelectorConfig = { entity: {} };
  @property() value = "";
  @property() label = "";

  static override styles = css`
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
    }
  `;

  private _emit(value: string): void {
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value }, bubbles: true, composed: true }),
    );
  }

  override render(): TemplateResult {
    if (useNativeSelector()) {
      return html`<ha-selector
        .hass=${this.hass}
        .selector=${this.selector}
        .value=${this.value || undefined}
        .label=${this.label}
        @value-changed=${(e: CustomEvent) => this._emit((e.detail?.value as string) ?? "")}
      ></ha-selector>`;
    }
    return html`<input
      .value=${this.value}
      placeholder=${this.label}
      @input=${(e: Event) => this._emit((e.target as HTMLInputElement).value)}
    />`;
  }
}

defineElement("imc-entity-picker", ImcEntityPicker);
