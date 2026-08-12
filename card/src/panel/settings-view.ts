import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { WEEKDAYS, toggleWeekday, weekdayLabels } from "../schedule-math";
import { localize, pickLanguage } from "../localize/localize";
import type { TranslationKey } from "../localize/localize";
import { asNumber, defineElement } from "../types";
import type { HomeAssistant } from "../types";
import type { HubOptions } from "./config-read";
// Side-effect import registers <imc-entity-picker>; the type is used by the
// optional-picker helper below. Both come from the same module.
import "./ha-selector";
import type { EntitySelectorConfig } from "./ha-selector";

/**
 * The everyday-settings view (spec §1.3): three independently-saved
 * sections — weather & sensors, consumption budget, calendar restrictions —
 * plus a note pointing expert parameters at HA Settings. Each section owns
 * its own Save button and emits its own event; `panel.ts` (wired in a later
 * task) maps each to its matching hub service.
 */

export interface WeatherSaveDetail {
  weather_entity: string;
  rain_sensor?: string;
  outdoor_temp_sensor?: string;
  line_flow_sensor?: string;
  master_valve?: string;
}

export interface BudgetSaveDetail {
  liters_per_month?: number;
  action: "notify" | "reduce" | "suspend";
  reduce_pct?: number;
}

export interface RestrictionsSaveDetail {
  forbidden_windows?: { start: string; end: string }[];
}

type BudgetAction = "notify" | "reduce" | "suspend";
type Parity = "none" | "odd" | "even";

const DEFAULT_WINDOW = { start: "22:00", end: "06:00" };

function normalizeAction(raw?: string): BudgetAction {
  return raw === "reduce" || raw === "suspend" ? raw : "notify";
}

function normalizeParity(raw?: string): Parity {
  return raw === "odd" || raw === "even" ? raw : "none";
}

export class ImcSettingsView extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) options: HubOptions = {};

  // Meteo e sensori
  @state() private _weatherEntity = "";
  @state() private _rainSensor = "";
  @state() private _outdoorTempSensor = "";
  @state() private _lineFlowSensor = "";
  @state() private _masterValve = "";

  // Budget consumo
  @state() private _litersPerMonth?: number;
  @state() private _action: BudgetAction = "notify";
  @state() private _reducePct?: number;

  // Restrizioni calendario
  @state() private _forbiddenWindows: { start: string; end: string }[] = [];

  static override styles = css`
    :host {
      display: block;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0 12px;
    }
    .back {
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .title {
      font-size: 15px;
      font-weight: 600;
    }
    .sec {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 10px;
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
    .section-label:first-of-type {
      margin-top: 10px;
    }
    .section-label.opt-label {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .clear-link {
      font-size: 11px;
      text-transform: none;
      letter-spacing: 0;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
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
    .two {
      display: flex;
      gap: 10px;
    }
    .two > div {
      flex: 1;
      min-width: 0;
    }
    .days {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .day {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .seg {
      display: inline-flex;
      flex-wrap: wrap;
      background: var(--secondary-background-color, #26262e);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .seg span {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--secondary-text-color, #aab);
      cursor: pointer;
      user-select: none;
    }
    .seg span.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .window-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .window-row input[type="time"] {
      width: auto;
      flex: 1;
    }
    .window-sep {
      color: var(--secondary-text-color, #8b93a7);
    }
    .icon-btn {
      border: none;
      background: transparent;
      color: var(--error-color, #db4437);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
    }
    .add-window {
      margin-top: 8px;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12.5px;
      cursor: pointer;
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
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .advanced-note {
      margin-top: 12px;
      padding: 0 2px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    // The settings view is opened fresh each time (spec §1.3 / task 5
    // brief), so reseeding whenever `.options` changes identity — Lit's
    // default `hasChanged` already gates `changed.has(...)` on that — is
    // sufficient; no extra "seeded once" tracking needed.
    if (changed.has("options")) {
      this._seedFromOptions();
    }
  }

  private _seedFromOptions(): void {
    const o = this.options ?? {};
    this._weatherEntity = o.weather_entity ?? "";
    this._rainSensor = o.rain_sensor ?? "";
    this._outdoorTempSensor = o.outdoor_temp_sensor ?? "";
    this._lineFlowSensor = o.line_flow_sensor ?? "";
    this._masterValve = o.master_valve ?? "";

    const budget = o.consumption_budget;
    this._litersPerMonth = budget?.liters_per_month;
    this._action = normalizeAction(budget?.action);
    this._reducePct = budget?.reduce_pct;

    const restrictions = o.restrictions;
    this._forbiddenWindows = restrictions?.forbidden_windows
      ? restrictions.forbidden_windows.map((w) => ({ ...w }))
      : [];
  }

  private get _canSaveWeather(): boolean {
    return this._weatherEntity.trim() !== "";
  }

  /**
   * An optional entity field: the native `<ha-selector>` offers no reliable,
   * discoverable way to empty a value once set, so we render an explicit
   * "Clear" link (shown only when there IS a value) that sets the field back
   * to `""`. Saving then sends `""`, which `set_weather_sources` treats as
   * "clear this key" — restoring e.g. the weather entity's own temperature.
   */
  private _optionalPicker(
    lang: string,
    labelKey: TranslationKey,
    value: string,
    selector: EntitySelectorConfig,
    setValue: (v: string) => void,
  ): TemplateResult {
    const label = localize(lang, labelKey);
    return html`
      <div class="section-label opt-label">
        <span>${label}</span>
        ${value
          ? html`<span
              class="clear-link"
              role="button"
              tabindex="0"
              @click=${() => setValue("")}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setValue("");
                }
              }}
              >✕ ${localize(lang, "settings.clear")}</span
            >`
          : nothing}
      </div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${selector}
        .value=${value}
        .label=${label}
        @value-changed=${(e: CustomEvent<{ value: string }>) => setValue(e.detail.value)}
      ></imc-entity-picker>
    `;
  }

  protected override render(): TemplateResult {
    const lang = pickLanguage(this.hass);
    return html`
      <div class="topbar">
        <span class="back" @click=${this._back}>‹ ${localize(lang, "wizard.back")}</span>
        <span class="title">${localize(lang, "settings.title")}</span>
      </div>

      ${this._renderWeatherSection(lang)} ${this._renderBudgetSection(lang)}
      ${this._renderRestrictionsSection(lang)}

      <div class="advanced-note">▸ ${localize(lang, "settings.advanced_note")}</div>
    `;
  }

  private _renderWeatherSection(lang: string): TemplateResult {
    return html`
      <div class="sec">
        <div class="header">🌦️ ${localize(lang, "settings.weather")}</div>

        <div class="section-label">${localize(lang, "settings.weather_entity")}</div>
        <imc-entity-picker
          .hass=${this.hass}
          .selector=${{ entity: { domain: "weather" } }}
          .value=${this._weatherEntity}
          .label=${localize(lang, "settings.weather_entity")}
          @value-changed=${(e: CustomEvent<{ value: string }>) =>
            (this._weatherEntity = e.detail.value)}
        ></imc-entity-picker>

        <div class="two">
          <div>
            ${this._optionalPicker(
              lang,
              "settings.rain",
              this._rainSensor,
              { entity: { domain: "sensor" } },
              (v) => (this._rainSensor = v),
            )}
          </div>
          <div>
            ${this._optionalPicker(
              lang,
              "settings.outdoor_temp",
              this._outdoorTempSensor,
              { entity: { domain: "sensor" } },
              (v) => (this._outdoorTempSensor = v),
            )}
          </div>
        </div>

        <div class="two">
          <div>
            ${this._optionalPicker(
              lang,
              "settings.line_flow",
              this._lineFlowSensor,
              { entity: { domain: "sensor" } },
              (v) => (this._lineFlowSensor = v),
            )}
          </div>
          <div>
            ${this._optionalPicker(
              lang,
              "settings.master_valve",
              this._masterValve,
              { entity: { domain: ["valve", "switch"] } },
              (v) => (this._masterValve = v),
            )}
          </div>
        </div>

        <div class="buttons">
          <button
            class="primary"
            type="button"
            ?disabled=${!this._canSaveWeather}
            @click=${this._saveWeather}
          >
            ${localize(lang, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderBudgetSection(lang: string): TemplateResult {
    return html`
      <div class="sec">
        <div class="header">🚰 ${localize(lang, "settings.budget")}</div>

        <div class="two">
          <div>
            <div class="section-label">${localize(lang, "settings.liters")}</div>
            <input
              class="field"
              type="number"
              min="0"
              step="1"
              .value=${this._litersPerMonth ?? ""}
              @input=${(e: Event) =>
                (this._litersPerMonth = asNumber((e.target as HTMLInputElement).value))}
            />
          </div>
          <div>
            <div class="section-label">${localize(lang, "settings.on_exceed")}</div>
            <span class="seg">
              <span
                class="${this._action === "notify" ? "sel" : ""}"
                @click=${() => (this._action = "notify")}
                >${localize(lang, "settings.action_notify")}</span
              >
              <span
                class="${this._action === "reduce" ? "sel" : ""}"
                @click=${() => (this._action = "reduce")}
                >${localize(lang, "settings.action_reduce")}</span
              >
              <span
                class="${this._action === "suspend" ? "sel" : ""}"
                @click=${() => (this._action = "suspend")}
                >${localize(lang, "settings.action_suspend")}</span
              >
            </span>
          </div>
        </div>

        ${this._action === "reduce"
          ? html`
              <div class="section-label">${localize(lang, "settings.reduce_pct")}</div>
              <input
                class="field"
                type="number"
                min="1"
                max="100"
                step="1"
                .value=${this._reducePct ?? ""}
                @input=${(e: Event) =>
                  (this._reducePct = asNumber((e.target as HTMLInputElement).value))}
              />
            `
          : nothing}

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveBudget}>
            ${localize(lang, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderRestrictionsSection(lang: string): TemplateResult {
    // Hours only. Which DAYS a zone waters is set on each program's
    // calendar — a second weekday grid here is what let two schedules
    // silently cancel each other out before 2.0.0.
    return html`
      <div class="sec">
        <div class="header">🕑 ${localize(lang, "settings.restrictions")}</div>
        <div class="hint">${localize(lang, "settings.restrictions_hours_only")}</div>

        <div class="section-label">${localize(lang, "settings.forbidden_windows")}</div>
        ${this._forbiddenWindows.map(
          (w, i) => html`
            <div class="window-row">
              <input
                class="field"
                type="time"
                .value=${w.start}
                @input=${(e: Event) =>
                  this._updateWindow(i, "start", (e.target as HTMLInputElement).value)}
              />
              <span class="window-sep">–</span>
              <input
                class="field"
                type="time"
                .value=${w.end}
                @input=${(e: Event) =>
                  this._updateWindow(i, "end", (e.target as HTMLInputElement).value)}
              />
              <button
                class="icon-btn"
                type="button"
                @click=${() => this._removeWindow(i)}
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          `,
        )}
        <button class="add-window" type="button" @click=${this._addWindow}>＋</button>

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveRestrictions}>
            ${localize(lang, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }

  private _updateWindow(index: number, field: "start" | "end", value: string): void {
    this._forbiddenWindows = this._forbiddenWindows.map((w, i) =>
      i === index ? { ...w, [field]: value } : w,
    );
  }

  private _addWindow(): void {
    this._forbiddenWindows = [...this._forbiddenWindows, { ...DEFAULT_WINDOW }];
  }

  private _removeWindow(index: number): void {
    this._forbiddenWindows = this._forbiddenWindows.filter((_, i) => i !== index);
  }

  /**
   * `set_weather_sources` MERGES its patch into existing options (unlike
   * the budget/restrictions services below, which replace their whole
   * section) — an omitted key there just means "leave unchanged". Sending
   * `""` for a cleared optional is therefore how the user actually clears
   * it; omitting the key instead would silently leave the old value in
   * place. `weather_entity` is always sent (required, non-empty — guarded
   * by `_canSaveWeather`/the disabled Save button).
   */
  private _saveWeather(): void {
    if (!this._canSaveWeather) return;
    const detail: WeatherSaveDetail = {
      weather_entity: this._weatherEntity.trim(),
      rain_sensor: this._rainSensor.trim(),
      outdoor_temp_sensor: this._outdoorTempSensor.trim(),
      line_flow_sensor: this._lineFlowSensor.trim(),
      master_valve: this._masterValve.trim(),
    };
    this.dispatchEvent(
      new CustomEvent<WeatherSaveDetail>("imc-settings-save-weather", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * `set_consumption_budget` REPLACES the whole `consumption_budget`
   * section — any field left out of the payload is cleared. This always
   * sends the full working state (`action` always; `liters_per_month`/
   * `reduce_pct` when set) rather than a partial diff.
   */
  private _saveBudget(): void {
    const detail: BudgetSaveDetail = { action: this._action };
    if (this._litersPerMonth !== undefined) detail.liters_per_month = this._litersPerMonth;
    if (this._action === "reduce" && this._reducePct !== undefined) {
      detail.reduce_pct = this._reducePct;
    }
    this.dispatchEvent(
      new CustomEvent<BudgetSaveDetail>("imc-settings-save-budget", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * `set_restrictions` REPLACES the whole `restrictions` section, so this
   * always sends the full current weekday set / parity / windows — never a
   * diff. All 7 (or 0) weekdays selected serializes as `[]`, mirroring the
   * "empty = every day allowed" convention used by `set_restrictions` and
   * the program schedule elsewhere in the panel.
   */
  private _saveRestrictions(): void {
    const detail: RestrictionsSaveDetail = {
      forbidden_windows: this._forbiddenWindows.map((w) => ({ start: w.start, end: w.end })),
    };
    this.dispatchEvent(
      new CustomEvent<RestrictionsSaveDetail>("imc-settings-save-restrictions", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _back(): void {
    this.dispatchEvent(new CustomEvent<void>("imc-settings-back", { bubbles: true, composed: true }));
  }
}

defineElement("imc-settings-view", ImcSettingsView);

declare global {
  interface HTMLElementTagNameMap {
    "imc-settings-view": ImcSettingsView;
  }
}
