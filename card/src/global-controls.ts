import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { GlobalAction } from "./types";
import { defineElement } from "./types";
import { localize } from "./localize/localize";

/**
 * Global controls: run all, stop all (confirmed), evaluate now and the
 * global pause toggle.
 */
export class ImcGlobalControls extends LitElement {
  @property() language = "en";
  @property({ type: Boolean }) paused = false;
  @property({ type: Boolean }) hasPauseSwitch = false;

  static override styles = css`
    :host {
      display: block;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 16px 14px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    button {
      font: inherit;
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: transparent;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
    }
    button:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    button.danger {
      color: var(--error-color, #db4437);
    }
    button.danger:hover {
      border-color: var(--error-color, #db4437);
    }
    button.active {
      background: var(--warning-color, #ffa600);
      border-color: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
  `;

  private _dispatch(detail: GlobalAction): void {
    this.dispatchEvent(
      new CustomEvent<GlobalAction>("imc-global-action", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onStopAll(): void {
    if (window.confirm(localize(this.language, "controls.confirm_stop_all"))) {
      this._dispatch({ action: "stop_all" });
    }
  }

  protected override render(): unknown {
    const lang = this.language;
    return html`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${localize(lang, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${localize(lang, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${localize(lang, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch
          ? html`<button
              class=${this.paused ? "active" : ""}
              @click=${() =>
                this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${localize(
                lang,
                this.paused ? "controls.resume_global" : "controls.pause_global",
              )}
            </button>`
          : nothing}
      </div>
    `;
  }
}

defineElement("imc-global-controls", ImcGlobalControls);

declare global {
  interface HTMLElementTagNameMap {
    "imc-global-controls": ImcGlobalControls;
  }
}
