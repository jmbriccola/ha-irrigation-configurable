import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {
  WEEKDAYS,
  dayBase,
  effectiveMinutes,
  isUniform,
  toggleWeekday,
  weekdayLabels,
} from "../schedule-math";
import { localize, pickLanguage } from "../localize/localize";
import { asNumber, clamp, defineElement } from "../types";
import type { CycleInfo, HomeAssistant } from "../types";

/**
 * The program editor: the heart of the editing UX (spec §1.2). Loads a
 * `CycleInfo`, lets the user edit days / start time / per-day durations,
 * shows the weather-adjusted preview for today, and emits two save events
 * that the panel maps to `set_program_schedule` / `set_program_minutes`.
 * All weather/curve math is delegated to schedule-math.ts — this component
 * only holds the working copy and renders it.
 */

export interface ProgramStartDetail {
  kind: "time" | "sun";
  at?: string;
  event?: "sunrise" | "sunset";
  offset_min?: number;
}

export interface ProgramScheduleSaveDetail {
  zoneId: string;
  programId: string;
  days: number[];
  start: ProgramStartDetail;
}

export interface ProgramMinutesSaveDetail {
  zoneId: string;
  programId: string;
  minutes?: number;
  dayMinutes?: Record<string, number>;
}

interface StepperOptions {
  min: number;
  max: number;
  step: number;
  suffix: string;
  signed?: boolean;
}

const DEFAULT_MINUTES = 15;
// Bounds mirror the backend service schemas: set_program_minutes accepts
// 1..1440 min; set_program_schedule accepts a sun offset of -360..360 min.
const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;
const MIN_OFFSET = -360;
const MAX_OFFSET = 360;
const OFFSET_STEP = 5;

export class ImcProgramEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property() zoneId = "";
  @property({ attribute: false }) cycle?: CycleInfo;
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _days: number[] = [...WEEKDAYS];
  @state() private _startKind: "time" | "sun" = "time";
  @state() private _startAt = "06:00";
  @state() private _startEvent: "sunrise" | "sunset" = "sunrise";
  @state() private _startOffsetMin = 0;
  @state() private _uniformMinutes = DEFAULT_MINUTES;
  @state() private _dayMinutes: Record<string, number> = {};
  @state() private _sameForAll = true;

  private _seededCycleId?: string;

  static override styles = css`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .section-label:first-child {
      margin-top: 0;
    }
    .days {
      display: flex;
      gap: 6px;
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
    .start-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .seg {
      display: inline-flex;
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
    .timebox {
      background: var(--secondary-background-color, #26262e);
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      color: inherit;
      font-family: inherit;
    }
    .duration-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
    }
    .dname {
      width: 44px;
      font-size: 13px;
      color: var(--secondary-text-color);
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
      width: 30px;
      height: 30px;
      padding: 0;
      font-size: 16px;
      cursor: pointer;
    }
    .stepper .val {
      min-width: 64px;
      text-align: center;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    .same-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #aab);
      margin-top: 10px;
      cursor: pointer;
      user-select: none;
    }
    .switch {
      width: 34px;
      height: 20px;
      background: var(--divider-color, #444);
      border-radius: 999px;
      position: relative;
      transition: background 0.15s ease;
      flex: none;
    }
    .switch::after {
      content: "";
      position: absolute;
      left: 2px;
      top: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.15s ease;
    }
    .switch.on {
      background: var(--imc-accent, #3a6df0);
    }
    .switch.on::after {
      left: 16px;
    }
    .weather {
      margin-top: 14px;
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12.5px;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
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
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("cycle")) {
      const id = this.cycle?.cycle_id;
      if (id !== this._seededCycleId) {
        this._seededCycleId = id;
        this._seedFromCycle();
      }
    }
  }

  private _seedFromCycle(): void {
    const cycle = this.cycle;
    if (!cycle) return;
    this._days = cycle.days && cycle.days.length > 0 ? [...cycle.days] : [...WEEKDAYS];

    const trigger = cycle.trigger;
    if (trigger?.kind === "sun") {
      this._startKind = "sun";
      this._startEvent = trigger.event === "sunset" ? "sunset" : "sunrise";
      this._startOffsetMin = Math.round((asNumber(trigger.offset_s) ?? 0) / 60);
    } else {
      this._startKind = "time";
      this._startEvent = "sunrise";
      this._startOffsetMin = 0;
    }
    this._startAt = trigger?.at ?? trigger?.time ?? "06:00";

    this._uniformMinutes = asNumber(cycle.amount) ?? DEFAULT_MINUTES;
    this._dayMinutes = cycle.day_minutes ? { ...cycle.day_minutes } : {};
    this._sameForAll = isUniform(cycle.day_minutes);
  }

  protected override render(): TemplateResult {
    const cycle = this.cycle;
    if (!cycle) return html``;
    const lang = pickLanguage(this.hass);
    const labels = weekdayLabels(lang);

    return html`
      <div class="section-label">${localize(lang, "program_editor.days")}</div>
      <div class="days">
        ${labels.map(
          (lbl, wd) => html`
            <div
              class="day ${this._days.includes(wd) ? "on" : ""}"
              @click=${() => (this._days = toggleWeekday(this._days, wd))}
            >
              ${lbl}
            </div>
          `,
        )}
      </div>

      <div class="section-label">${localize(lang, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => (this._startKind = "time")}
            >${localize(lang, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${localize(lang, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${localize(lang, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time"
          ? html`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(e: Event) => (this._startAt = (e.target as HTMLInputElement).value)}
            />`
          : this._stepper(this._startOffsetMin, (v) => (this._startOffsetMin = v), {
              min: MIN_OFFSET,
              max: MAX_OFFSET,
              step: OFFSET_STEP,
              suffix: "min",
              signed: true,
            })}
      </div>

      <div class="section-label">${localize(lang, "program_editor.duration_per_day")}</div>
      ${this._renderDurations(lang, labels)}
      <div class="same-row" @click=${() => (this._sameForAll = !this._sameForAll)}>
        <span class="switch ${this._sameForAll ? "on" : ""}"></span>
        ${localize(lang, "program_editor.same_duration")}
      </div>

      ${this._renderWeatherLine(lang, cycle)}
      ${this._days.length === 0
        ? html`<div class="hint">${localize(lang, "panel.pick_a_day")}</div>`
        : nothing}

      <div class="buttons">
        <button class="primary" ?disabled=${this._days.length === 0} @click=${this._save}>
          ${localize(lang, "editor.save")}
        </button>
        <button @click=${this._cancel}>${localize(lang, "editor.cancel")}</button>
      </div>
    `;
  }

  private _setSun(event: "sunrise" | "sunset"): void {
    this._startKind = "sun";
    this._startEvent = event;
  }

  private _renderDurations(lang: string, labels: string[]): TemplateResult {
    const unit = localize(lang, "curve.unit_duration");
    if (this._sameForAll) {
      return html`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (v) => (this._uniformMinutes = v), {
          min: MIN_MINUTES,
          max: MAX_MINUTES,
          step: 1,
          suffix: unit,
        })}
      </div>`;
    }
    return html`${this._days.map((wd) => {
      const value = dayBase({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, wd);
      return html`<div class="duration-row">
        <span class="dname">${labels[wd] ?? ""}</span>
        ${this._stepper(
          value,
          (v) => (this._dayMinutes = { ...this._dayMinutes, [String(wd)]: v }),
          { min: MIN_MINUTES, max: MAX_MINUTES, step: 1, suffix: unit },
        )}
      </div>`;
    })}`;
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

  private _renderWeatherLine(lang: string, cycle: CycleInfo): TemplateResult | typeof nothing {
    const t = this.weightedTemp;
    if (t === undefined || Number.isNaN(t)) return nothing;
    const today = (new Date().getDay() + 6) % 7;
    const base = dayBase(cycle, today);
    const heat = asNumber(cycle.heat) ?? 8;
    const min = effectiveMinutes(
      base,
      heat,
      t,
      asNumber(cycle.curve?.min),
      asNumber(cycle.curve?.max),
    );
    const dayName = new Date().toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "long",
    });
    return html`<div class="weather">
      ${localize(lang, "panel.weather_line", { day: dayName, min })}
    </div>`;
  }

  private _buildDayMinutes(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const wd of this._days) {
      map[String(wd)] = dayBase(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        wd,
      );
    }
    return map;
  }

  private _save(): void {
    // Guard: an empty weekday selection must never be persisted. The
    // backend treats a falsy/empty `days` as "every day" — the opposite of
    // "no days selected" — so silently saving [] here would invert intent.
    // The Save button is disabled for this case too; this is defense in
    // depth in case _save is ever invoked programmatically.
    if (this._days.length === 0) return;

    const zoneId = this.zoneId;
    const programId = this.cycle?.cycle_id ?? "";
    const start: ProgramStartDetail =
      this._startKind === "time"
        ? { kind: "time", at: this._startAt }
        : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };

    // "Every day" (all 7 chips on) serializes as [] per the documented
    // absent/empty = every-day convention, keeping saved state consistent
    // with what a never-edited program already looks like on the wire.
    const sortedDays = [...this._days].sort((a, b) => a - b);
    const days = sortedDays.length >= 7 ? [] : sortedDays;

    this.dispatchEvent(
      new CustomEvent<ProgramScheduleSaveDetail>("imc-program-save-schedule", {
        detail: { zoneId, programId, days, start },
        bubbles: true,
        composed: true,
      }),
    );

    const minutesDetail: ProgramMinutesSaveDetail = this._sameForAll
      ? { zoneId, programId, minutes: this._uniformMinutes }
      : { zoneId, programId, dayMinutes: this._buildDayMinutes() };
    this.dispatchEvent(
      new CustomEvent<ProgramMinutesSaveDetail>("imc-program-save-minutes", {
        detail: minutesDetail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-program-cancel", { bubbles: true, composed: true }),
    );
  }
}

defineElement("imc-program-editor", ImcProgramEditor);

declare global {
  interface HTMLElementTagNameMap {
    "imc-program-editor": ImcProgramEditor;
  }
}
