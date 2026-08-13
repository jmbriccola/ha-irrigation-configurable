import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { WEEKDAYS, previewMinutes, toggleWeekday, weekdayLabels } from "../schedule-math";
import "./calendar-editor";
import { type CalendarConfig } from "./calendar-editor";
import { localize, pickLanguage } from "../localize/localize";
import { pointsFromSemantic } from "../curve-math";
import { clamp, defineElement } from "../types";
import type { CycleInfo, HomeAssistant } from "../types";

/**
 * The 3-step "add program" wizard (spec §1.3, mockup `wizard-advanced`):
 * Giorni → Orario → Durata, pre-seeded with safe defaults (every day,
 * sunrise, 15 min — the same defaults the backend's `add_program` writes)
 * so the flow is confirm-and-tweak, never fill-from-empty. The user can
 * finish at step 3. Emits a single `imc-wizard-finish` with everything
 * panel.ts needs to chain `add_program` → `set_program_schedule` →
 * `set_program_minutes`; like program-editor.ts, this component never
 * calls hass.callService itself.
 */

export interface WizardStart {
  kind: "time" | "sun";
  at?: string;
  event?: "sunrise" | "sunset";
  offset_min?: number;
}

export interface WizardFinishDetail {
  zoneId: string;
  name?: string;
  calendar: CalendarConfig;
  start: WizardStart;
  minutes: number;
}

interface StepperOptions {
  min: number;
  max: number;
  step: number;
  suffix: string;
  signed?: boolean;
}

type Step = 1 | 2 | 3;

// Mirrors the backend's `_default_program` (services.py): every day,
// sunrise, 15' on a mild day + 8' more when it's hot, clamped 1..60.
const DEFAULT_MINUTES = 15;
const DEFAULT_HEAT = 8;
const DEFAULT_CURVE_MIN = 1;
const DEFAULT_CURVE_MAX = 60;

// The draft's curve shape — `add_program` always writes exactly this curve
// for a fresh program, so the wizard's live preview evaluates the same
// points the backend will actually save.
const DRAFT_CYCLE: Partial<CycleInfo> = {
  curve: {
    points: pointsFromSemantic(DEFAULT_MINUTES, DEFAULT_HEAT),
    min: DEFAULT_CURVE_MIN,
    max: DEFAULT_CURVE_MAX,
  },
};

// Bounds mirror the backend service schemas (same as program-editor.ts).
const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;
const MIN_OFFSET = -360;
const MAX_OFFSET = 360;
const OFFSET_STEP = 5;

// "Giorni alterni" — the mockup's own example selection (Lun/Mer/Ven).
// A true every-other-day cadence can't be expressed exactly as a fixed
// weekly weekday set; this is the closest fixed-week approximation.
const PRESET_ALTERNATE: readonly number[] = [0, 2, 4];
const PRESET_WEEKEND: readonly number[] = [5, 6];

function sameDays(a: number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...a].sort((x, y) => x - y);
  return sorted.every((v, i) => v === b[i]);
}

export class ImcProgramWizard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property() zoneId = "";
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _step: Step = 1;
  @state() private _calendar: CalendarConfig = { mode: "weekdays", days: [...WEEKDAYS] };
  @state() private _startKind: "time" | "sun" = "sun";
  @state() private _startAt = "06:00";
  @state() private _startEvent: "sunrise" | "sunset" = "sunrise";
  @state() private _startOffsetMin = 0;
  @state() private _minutes = DEFAULT_MINUTES;

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
    }
    .close {
      border: none;
      background: transparent;
      color: var(--secondary-text-color, #8b93a7);
      font-size: 14px;
      cursor: pointer;
      padding: 2px 6px;
    }
    .dots {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 14px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--divider-color, #3a3a44);
    }
    .dot.on {
      background: var(--imc-accent, #3a6df0);
    }
    .days {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
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
    .presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 12px;
    }
    .preset {
      font-size: 11px;
      color: var(--secondary-text-color, #aab);
      background: var(--secondary-background-color, #26262e);
      border-radius: 999px;
      padding: 5px 12px;
      cursor: pointer;
      user-select: none;
    }
    .preset.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .seg {
      display: flex;
      flex-wrap: wrap;
      background: var(--secondary-background-color, #26262e);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .seg span {
      flex: 1;
      text-align: center;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      color: var(--secondary-text-color, #aab);
      cursor: pointer;
      user-select: none;
    }
    .seg span.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .timebox {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin-top: 14px;
      background: var(--secondary-background-color, #26262e);
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-size: 20px;
      text-align: center;
      color: inherit;
      font-family: inherit;
    }
    .offset-row {
      display: flex;
      justify-content: center;
      margin-top: 14px;
    }
    .stepper-row {
      display: flex;
      justify-content: center;
      margin-top: 6px;
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-background-color, #26262e);
      border-radius: 8px;
      overflow: hidden;
    }
    .stepper button {
      border: none;
      background: transparent;
      color: var(--imc-accent, #8ab4ff);
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 18px;
      cursor: pointer;
    }
    .stepper .val {
      min-width: 80px;
      text-align: center;
      font-size: 15px;
      font-variant-numeric: tabular-nums;
    }
    .done {
      margin-top: 14px;
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12.5px;
      text-align: center;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
      text-align: center;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 18px;
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
  `;

  protected override render(): TemplateResult {
    const lang = pickLanguage(this.hass);
    return html`
      <div class="head">
        <span class="title">${this._stepTitle(lang)}</span>
        <button class="close" @click=${this._cancel} aria-label=${localize(lang, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${([1, 2, 3] as Step[]).map(
          (n) => html`<span class="dot ${this._step === n ? "on" : ""}"></span>`,
        )}
      </div>
      ${this._step === 1 ? this._renderStep1(lang) : nothing}
      ${this._step === 2 ? this._renderStep2(lang) : nothing}
      ${this._step === 3 ? this._renderStep3(lang) : nothing}
      <div class="buttons">
        ${this._step > 1
          ? html`<button @click=${this._back}>${localize(lang, "wizard.back")}</button>`
          : html`<button @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>`}
        ${this._step < 3
          ? html`<button
              class="primary"
              @click=${this._next}
            >
              ${localize(lang, "wizard.next")}
            </button>`
          : html`<button
              class="primary"
              @click=${this._finish}
            >
              ${localize(lang, "wizard.finish")}
            </button>`}
      </div>
    `;
  }

  private _stepTitle(lang: string): string {
    if (this._step === 1) return localize(lang, "wizard.step1_title");
    if (this._step === 2) return localize(lang, "wizard.step2_title");
    return localize(lang, "wizard.step3_title");
  }

  private _renderStep1(_lang: string): TemplateResult {
    return html`
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(event: CustomEvent<{ calendar: CalendarConfig }>) =>
          (this._calendar = event.detail.calendar)}
      ></imc-calendar-editor>
    `;
  }

  private _renderStep2(lang: string): TemplateResult {
    return html`
      <div class="seg">
        <span
          class="${this._startKind === "time" ? "sel" : ""}"
          @click=${() => (this._startKind = "time")}
        >
          ${localize(lang, "program_editor.start_fixed")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
          @click=${() => this._setSun("sunrise")}
        >
          ${localize(lang, "program_editor.start_sunrise")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
          @click=${() => this._setSun("sunset")}
        >
          ${localize(lang, "program_editor.start_sunset")}
        </span>
      </div>
      ${this._startKind === "time"
        ? html`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(e: Event) => (this._startAt = (e.target as HTMLInputElement).value)}
          />`
        : html`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (v) => (this._startOffsetMin = v), {
              min: MIN_OFFSET,
              max: MAX_OFFSET,
              step: OFFSET_STEP,
              suffix: "min",
              signed: true,
            })}
          </div>`}
    `;
  }

  private _renderStep3(lang: string): TemplateResult {
    const unit = localize(lang, "curve.unit_duration");
    return html`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (v) => (this._minutes = v), {
          min: MIN_MINUTES,
          max: MAX_MINUTES,
          step: 1,
          suffix: unit,
        })}
      </div>
      ${this._renderPreview(lang)}
    `;
  }

  private _renderPreview(lang: string): TemplateResult | typeof nothing {
    const t = this.weightedTemp;
    if (t === undefined || Number.isNaN(t)) return nothing;
    const dayName = new Date().toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "long",
    });
    const min = previewMinutes(DRAFT_CYCLE, this._minutes, t);
    return html`<div class="done">
      ${localize(lang, "wizard.done_prefix")}
      ${localize(lang, "panel.weather_line", { day: dayName, min })}
    </div>`;
  }

  private _stepper(
    value: number,
    onChange: (v: number) => void,
    opts: StepperOptions,
  ): TemplateResult {
    const sign = opts.signed && value > 0 ? "+" : "";
    return html`
      <span class="stepper">
        <button
          type="button"
          @click=${() => onChange(clamp(value - opts.step, opts.min, opts.max))}
        >
          –
        </button>
        <span class="val">${sign}${value} ${opts.suffix}</span>
        <button
          type="button"
          @click=${() => onChange(clamp(value + opts.step, opts.min, opts.max))}
        >
          +
        </button>
      </span>
    `;
  }

  private _setSun(event: "sunrise" | "sunset"): void {
    this._startKind = "sun";
    this._startEvent = event;
  }

  private _back(): void {
    if (this._step > 1) this._step = (this._step - 1) as Step;
  }

  private _next(): void {
    if (this._step < 3) this._step = (this._step + 1) as Step;
  }

  private _finish(): void {
    const start: WizardStart =
      this._startKind === "time"
        ? { kind: "time", at: this._startAt }
        : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };

    this.dispatchEvent(
      new CustomEvent<WizardFinishDetail>("imc-wizard-finish", {
        detail: {
          zoneId: this.zoneId,
          calendar: this._calendar,
          start,
          minutes: this._minutes,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-wizard-cancel", { bubbles: true, composed: true }),
    );
  }
}

defineElement("imc-program-wizard", ImcProgramWizard);

declare global {
  interface HTMLElementTagNameMap {
    "imc-program-wizard": ImcProgramWizard;
  }
}
