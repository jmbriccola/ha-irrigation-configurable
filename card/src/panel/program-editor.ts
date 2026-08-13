import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {
  WEEKDAYS,
  dayBase,
  isUniform,
  minutesChanged,
  previewMinutes,
  toggleWeekday,
  weekdayLabels,
} from "../schedule-math";
import { localize, pickLanguage } from "../localize/localize";
import { asNumber, clamp, defineElement } from "../types";
import type { CycleInfo, HassEntity, HomeAssistant } from "../types";
// Side-effect import: registers <imc-curve-editor>, reused verbatim as the
// "heat response" control inside the advanced drawer below.
import "../curve-editor";
import "./calendar-editor";
import { type CalendarConfig, normaliseCalendar } from "./calendar-editor";
import { programToggleStyles, renderProgramToggle } from "./program-toggle";
import type { CurveSavePayload } from "../curve-editor";
import { buildCopyCandidates, type ZoneBundle } from "../discovery";

/**
 * The program editor: the heart of the editing UX (spec §1.2). Loads a
 * `CycleInfo`, lets the user edit days / start time / per-day durations,
 * shows the weather-adjusted preview for today, and emits two save events
 * that the panel maps to `set_program_schedule` / `set_program_minutes`.
 * All weather/curve math is delegated to schedule-math.ts — this component
 * only holds the working copy and renders it.
 */

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

/** Season chips: empty means "inherit the hub season". */
function toggleMonth(months: number[], month: number): number[] {
  return months.includes(month)
    ? months.filter((item) => item !== month)
    : [...months, month].sort((a, b) => a - b);
}

export interface AdvancedInput {
  soakMaxRunMin?: number;
  soakPauseMin?: number;
  volumeSafetyTimeoutMin?: number;
}

/** Absent means unchanged, matching set_program_advanced. Zero is a value. */
export function buildAdvancedPatch(input: AdvancedInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.soakMaxRunMin !== undefined) patch["soak_max_run_min"] = input.soakMaxRunMin;
  if (input.soakPauseMin !== undefined) patch["soak_pause_min"] = input.soakPauseMin;
  if (input.volumeSafetyTimeoutMin !== undefined) {
    patch["volume_safety_timeout_min"] = input.volumeSafetyTimeoutMin;
  }
  return patch;
}

export interface ProgramStartDetail {
  kind: "time" | "sun";
  at?: string;
  event?: "sunrise" | "sunset";
  offset_min?: number;
}

export interface ProgramScheduleSaveDetail {
  zoneId: string;
  programId: string;
  calendar: CalendarConfig;
  seasonMonths?: number[];
  start: ProgramStartDetail;
}

export interface ProgramMinutesSaveDetail {
  zoneId: string;
  programId: string;
  minutes?: number;
  dayMinutes?: Record<string, number>;
}

/**
 * `imc-curve-save`, re-dispatched by this editor. The embedded
 * `imc-curve-editor` (reused verbatim — see curve-editor.ts) emits its own
 * `imc-curve-save` with a `CurveSavePayload` detail that has no notion of
 * which zone it belongs to. We intercept that raw event, stop it from
 * bubbling further, and re-dispatch under the same event name with the
 * `zoneId` this editor already knows (mirrors how the schedule/minutes save
 * events above carry `zoneId` directly), so the panel's single listener has
 * everything it needs to call the curve services.
 */
export interface ProgramCurveSaveDetail {
  zoneId: string;
  curve: CurveSavePayload;
}

/** `imc-curve-copy`: replace this program's curve with another program's
 *  curve shape — `zoneId`/`programId` are the destination (this editor's own
 *  program), `sourceZoneId`/`sourceProgramId` the picked candidate. */
export interface CurveCopyDetail {
  zoneId: string;
  programId: string;
  sourceZoneId: string;
  sourceProgramId: string;
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
  /** The program's `cycle_enabled` switch, passed down by the program list. */
  @property({ attribute: false }) cycleSwitch?: HassEntity;
  @property() zoneId = "";
  @property({ attribute: false }) cycle?: CycleInfo;
  @property({ attribute: false }) weightedTemp?: number;
  /** Passed down to the embedded `imc-curve-editor` — whether the zone has a
   *  usable flow meter, gating that editor's volume option. */
  @property({ type: Boolean }) zoneHasFlowMeter = false;
  /** Every zone the panel has loaded — the source pool for "copy curve
   *  from…" (see `buildCopyCandidates`). */
  @property({ attribute: false }) allZones: ZoneBundle[] = [];

  @state() private _calendar: CalendarConfig = { mode: "weekdays", days: [...WEEKDAYS] };
  @state() private _seasonMonths: number[] = [];
  @state() private _startKind: "time" | "sun" = "time";
  @state() private _startAt = "06:00";
  @state() private _startEvent: "sunrise" | "sunset" = "sunrise";
  @state() private _startOffsetMin = 0;
  @state() private _uniformMinutes = DEFAULT_MINUTES;
  @state() private _dayMinutes: Record<string, number> = {};
  @state() private _sameForAll = true;
  @state() private _advancedOpen = false;
  @state() private _advanced: AdvancedInput = {};

  private _seededCycleId?: string;
  /** Signature of the curve/intensity fields as of the last minutes seed —
   *  see `_curveSignature` and the re-seed branch in `willUpdate`. */
  private _seededCurveSignature?: string;
  /** The minutes state as seeded, so `_save` can tell whether the user
   *  actually touched a stepper (see `minutesChanged` in schedule-math.ts). */
  private _seededUniformMinutes = DEFAULT_MINUTES;
  private _seededDayMinutes: Record<string, number> = {};
  /** Seeded value of `_sameForAll` — a flip of the mode itself, in either
   *  direction, must count as a change even if no stepper moved (see
   *  `minutesChanged`). */
  private _seededSameForAll = true;

  /**
   * Volume-mode programs (liters, edited via the curve editor's
   * amount/heat controls) have no minutes to save here — `amount`/`heat`
   * come back null for them. Duration steppers + weather preview only make
   * sense for a "duration" curve.
   */
  /** Weekdays the per-day duration editor should offer.

   * Only the weekday mode pins runs to particular weekdays; an interval or
   * parity program can land on any of them.
   */
  private get _activeDays(): number[] {
    return this._calendar.mode === "weekdays" ? this._calendar.days : [...WEEKDAYS];
  }

  private get _isVolume(): boolean {
    return this.cycle?.curve?.kind === "volume";
  }

  static override styles = css`
    ${programToggleStyles}
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
    .start-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
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
    .volume-note {
      margin-top: 14px;
      font-size: 12.5px;
      opacity: 0.8;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
    }
    .copy-label {
      display: block;
      font-size: 12px;
      color: var(--secondary-text-color, #aab);
      margin-bottom: 4px;
    }
    .copy-select {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 4px;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
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
      } else if (this._curveSignature(this.cycle) !== this._seededCurveSignature) {
        // Same program, but its curve or intensity moved under us — a
        // curve save or a curve copy while this editor stayed open. The
        // schedule/season/start fields the user may be mid-editing are
        // untouched; only the minutes seed (stale otherwise) is refreshed,
        // so the stepper shows what the program now actually waters.
        this._seedMinutesFromCycle();
      }
    }
  }

  /** Fields of `cycle` that affect what a minutes stepper should show —
   *  used to detect a curve save/copy landing while this editor is open
   *  (see `willUpdate`). Not a general equality check: only what
   *  `_seedMinutesFromCycle` reads. */
  private _curveSignature(cycle?: CycleInfo): string {
    return JSON.stringify([
      cycle?.curve?.points,
      cycle?.curve?.min,
      cycle?.curve?.max,
      cycle?.curve?.kind,
      cycle?.intensity_pct,
      cycle?.day_intensity_pct,
    ]);
  }

  private _seedFromCycle(): void {
    const cycle = this.cycle;
    if (!cycle) return;
    this._calendar = normaliseCalendar(cycle.calendar);
    this._advanced = {
      soakMaxRunMin: cycle.soak_max_run_min,
      soakPauseMin: cycle.soak_pause_min,
      volumeSafetyTimeoutMin: cycle.volume_safety_timeout_min,
    };
    this._seasonMonths = [...(cycle.season_months ?? [])];

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

    this._seedMinutesFromCycle();
  }

  /**
   * Seeds the minutes-editing state (uniform value, per-day map, and which
   * mode is in force) from the current `cycle`, and records that state as
   * the seed for `minutesChanged` to compare against in `_save`. Split out
   * from `_seedFromCycle` so a curve save/copy can refresh just this part
   * without disturbing calendar/season/start edits in progress.
   */
  private _seedMinutesFromCycle(): void {
    const cycle = this.cycle;
    if (!cycle) return;
    this._seededCurveSignature = this._curveSignature(cycle);

    // The reference-temperature minutes, computed from the real curve and
    // the uniform intensity (day overrides ignored — this seeds the "same
    // for all" control, not any particular day).
    this._uniformMinutes = cycle.curve
      ? dayBase({ curve: cycle.curve, intensity_pct: cycle.intensity_pct }, 0)
      : DEFAULT_MINUTES;
    this._dayMinutes = cycle.day_intensity_pct
      ? Object.fromEntries(
          Object.keys(cycle.day_intensity_pct).map((wd) => [wd, dayBase(cycle, Number(wd))]),
        )
      : {};
    this._sameForAll = isUniform(cycle.day_intensity_pct);

    this._seededUniformMinutes = this._uniformMinutes;
    this._seededDayMinutes = this._buildDayMinutes();
    this._seededSameForAll = this._sameForAll;
  }

  protected override render(): TemplateResult {
    const cycle = this.cycle;
    if (!cycle) return html``;
    const lang = pickLanguage(this.hass);
    const labels = weekdayLabels(lang);

    return html`
      ${renderProgramToggle(lang, this.cycleSwitch, () => this._onToggleEnabled())}

      <div class="section-label">${localize(lang, "program_editor.calendar")}</div>
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(event: CustomEvent<{ calendar: CalendarConfig }>) =>
          (this._calendar = event.detail.calendar)}
      ></imc-calendar-editor>

      <div class="section-label">${localize(lang, "program_editor.season")}</div>
      <div class="days">
        ${MONTH_LABELS.map(
          (lbl, index) => html`
            <div
              class="day ${this._seasonMonths.includes(index + 1) ? "on" : ""}"
              @click=${() => (this._seasonMonths = toggleMonth(this._seasonMonths, index + 1))}
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

      ${this._isVolume
        ? html`<div class="volume-note">${localize(lang, "editor.volume_note")}</div>`
        : html`
            <div class="section-label">${localize(lang, "program_editor.duration_per_day")}</div>
            ${this._renderDurations(lang, labels)}
            <div class="same-row" @click=${() => (this._sameForAll = !this._sameForAll)}>
              <span class="switch ${this._sameForAll ? "on" : ""}"></span>
              ${localize(lang, "program_editor.same_duration")}
            </div>

            ${this._renderWeatherLine(lang, cycle)}
          `}

      <div
        class="section-label advanced-toggle"
        @click=${() => (this._advancedOpen = !this._advancedOpen)}
      >
        ${this._advancedOpen ? "▾" : "▸"} ${localize(lang, "panel.advanced")}
      </div>
      ${this._advancedOpen ? this._renderAdvanced(lang) : nothing}

      <div class="buttons">
        <button class="primary" @click=${this._save}>
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

  private _renderAdvanced(lang: string): TemplateResult {
    return html`
      <div class="section-label">${localize(lang, "program_editor.soak_max_run")}</div>
      <input
        class="field"
        type="number"
        min="1"
        .value=${this._advanced.soakMaxRunMin ?? ""}
        @input=${(e: Event) =>
          (this._advanced = {
            ...this._advanced,
            soakMaxRunMin: asNumber((e.target as HTMLInputElement).value),
          })}
      />
      <div class="hint">${localize(lang, "program_editor.soak_max_run_hint")}</div>

      <div class="section-label">${localize(lang, "program_editor.soak_pause")}</div>
      <input
        class="field"
        type="number"
        min="0"
        .value=${this._advanced.soakPauseMin ?? ""}
        @input=${(e: Event) =>
          (this._advanced = {
            ...this._advanced,
            soakPauseMin: asNumber((e.target as HTMLInputElement).value),
          })}
      />
      <div class="hint">${localize(lang, "program_editor.soak_pause_hint")}</div>

      ${this._isVolume
        ? html`
            <div class="section-label">
              ${localize(lang, "program_editor.volume_safety_timeout")}
            </div>
            <input
              class="field"
              type="number"
              min="1"
              .value=${this._advanced.volumeSafetyTimeoutMin ?? ""}
              @input=${(e: Event) =>
                (this._advanced = {
                  ...this._advanced,
                  volumeSafetyTimeoutMin: asNumber((e.target as HTMLInputElement).value),
                })}
            />
            <div class="hint">
              ${localize(lang, "program_editor.volume_safety_timeout_hint")}
            </div>
          `
        : nothing}

      <div class="section-label">${localize(lang, "panel.heat_response")}</div>
      ${this._renderCopyCurve(lang)}
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${pickLanguage(this.hass)}
        .zoneHasFlowMeter=${this.zoneHasFlowMeter}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-cancel=${() => (this._advancedOpen = false)}
      ></imc-curve-editor>
    `;
  }

  /**
   * "Copy curve from…": every other program, across every zone, offered by
   * `buildCopyCandidates` (see its doc comment for the two things it
   * already leaves out). Picking one dispatches `imc-curve-copy`
   * immediately — there is no separate confirm step, mirroring how
   * `imc-curve-save` itself is a one-shot action — and the `<select>` is
   * reset back to its placeholder right after so the same source can be
   * picked again (e.g. after tweaking something and wanting a fresh copy).
   */
  private _renderCopyCurve(lang: string): TemplateResult {
    const programId = this.cycle?.cycle_id ?? "";
    const candidates = buildCopyCandidates(
      this.allZones,
      this.zoneId,
      programId,
      this.zoneHasFlowMeter,
    );
    if (candidates.length === 0) {
      return html`
        <label class="copy-label">${localize(lang, "curve.copy_from")}</label>
        <div class="hint">${localize(lang, "curve.copy_error")}</div>
      `;
    }
    return html`
      <label class="copy-label">${localize(lang, "curve.copy_from")}</label>
      <select class="timebox copy-select" @change=${this._onCopyCurve}>
        <option value="" selected>${localize(lang, "curve.copy_placeholder")}</option>
        ${candidates.map(
          (c) => html`<option value=${c.value}>${c.label}</option>`,
        )}
      </select>
    `;
  }

  private _onCopyCurve(ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    const value = select.value;
    const programId = this.cycle?.cycle_id;
    if (!value || !programId) return;
    const separator = value.indexOf(":");
    if (separator < 0) return;
    this.dispatchEvent(
      new CustomEvent<CurveCopyDetail>("imc-curve-copy", {
        detail: {
          zoneId: this.zoneId,
          programId,
          sourceZoneId: value.slice(0, separator),
          sourceProgramId: value.slice(separator + 1),
        },
        bubbles: true,
        composed: true,
      }),
    );
    select.value = "";
  }

  /**
   * Intercepts the embedded curve editor's `imc-curve-save` (raw
   * `CurveSavePayload`, no zoneId) and re-dispatches under the same event
   * name with `zoneId` attached — see the `ProgramCurveSaveDetail` doc
   * comment above for why. `curve-editor.ts` itself is never modified.
   */
  private _onCurveSave(ev: CustomEvent<CurveSavePayload>): void {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<ProgramCurveSaveDetail>("imc-curve-save", {
        detail: { zoneId: this.zoneId, curve: ev.detail },
        bubbles: true,
        composed: true,
      }),
    );
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
    return html`${this._activeDays.map((wd) => {
      // The saved per-day value until the user overrides it in this session.
      const value = this._dayMinutes[String(wd)] ?? dayBase(this.cycle ?? {}, wd);
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

    // The program may not even run today — an "≈ N min" preview for a day
    // it never waters on would be misleading. "Every day" is 7 chips on
    // (mirrors the [] === every-day convention used when saving).
    if (!this._activeDays.includes(today)) {
      return html`<div class="weather">${localize(lang, "reason.calendar_not_today")}</div>`;
    }

    // Base comes from the WORKING (unsaved) state, not the saved `cycle`
    // prop, so the preview moves live as the user drags a stepper —
    // matching the wizard's live preview (program-wizard.ts). This is the
    // program's OWN curve and intensity, BEFORE the zone's adjustment
    // factor: the engine multiplies by zone.adjustment_pct on top
    // (engine/planner.py), and that factor is not published on the zone
    // sensor, so this preview cannot account for it. A zone adjusted to
    // 70% shows this same figure everywhere in the card and waters less.
    const base = this._sameForAll
      ? this._uniformMinutes
      : (this._dayMinutes[String(today)] ?? this._uniformMinutes);
    const min = previewMinutes(cycle, base, t);
    const dayName = new Date().toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      weekday: "long",
    });
    return html`<div class="weather">
      ${localize(lang, "panel.weather_line", { day: dayName, min })}
    </div>`;
  }

  private _buildDayMinutes(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const wd of this._activeDays) {
      map[String(wd)] = this._dayMinutes[String(wd)] ?? dayBase(this.cycle ?? {}, wd);
    }
    return map;
  }

  /** Reuses `imc-program-toggle`, so the panel needs no new plumbing. */
  private _onToggleEnabled(): void {
    const entity = this.cycleSwitch;
    if (!entity || !this.cycle?.cycle_id) return;
    this.dispatchEvent(
      new CustomEvent("imc-program-toggle", {
        detail: {
          zoneId: this.zoneId,
          programId: this.cycle.cycle_id,
          entityId: entity.entity_id,
          enabled: entity.state !== "on",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _save(): void {
    // Guard: an empty weekday selection must never be persisted. The
    // backend treats a falsy/empty `days` as "every day" — the opposite of
    // "no days selected" — so silently saving [] here would invert intent.
    // The Save button is disabled for this case too; this is defense in
    // depth in case _save is ever invoked programmatically.
    const zoneId = this.zoneId;
    const programId = this.cycle?.cycle_id ?? "";
    const start: ProgramStartDetail =
      this._startKind === "time"
        ? { kind: "time", at: this._startAt }
        : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };

    this.dispatchEvent(
      new CustomEvent<ProgramScheduleSaveDetail>("imc-program-save-schedule", {
        detail: {
          zoneId,
          programId,
          calendar: this._calendar,
          seasonMonths: this._seasonMonths.length ? [...this._seasonMonths].sort((a, b) => a - b) : undefined,
          start,
        },
        bubbles: true,
        composed: true,
      }),
    );

    const advanced = buildAdvancedPatch(this._advanced);
    if (Object.keys(advanced).length > 0) {
      this.dispatchEvent(
        new CustomEvent("imc-program-save-advanced", {
          detail: { zoneId, programId, patch: advanced },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // Volume-mode programs have no minutes to save here — the backend
    // rejects set_program_minutes for a volume curve (simple_curve_on_volume).
    // Liters are edited via the curve editor in the Advanced drawer instead.
    if (this._isVolume) return;

    const dayMinutes = this._buildDayMinutes();
    // Dispatch only when the minutes actually changed from what was
    // seeded. set_program_minutes computes its intensity by dividing the
    // given value by the curve's CURRENT reference value — sending the
    // unchanged seeded minutes back unconditionally would rescale the
    // curve whenever that reference moved underneath it (a curve save/copy
    // earlier in this same session, or a clamp binding at the reference
    // temperature), silently undoing the edit that moved it.
    if (
      !minutesChanged(
        this._sameForAll,
        this._seededSameForAll,
        this._seededUniformMinutes,
        this._uniformMinutes,
        this._seededDayMinutes,
        dayMinutes,
      )
    ) {
      return;
    }

    const minutesDetail: ProgramMinutesSaveDetail = this._sameForAll
      ? { zoneId, programId, minutes: this._uniformMinutes }
      : { zoneId, programId, dayMinutes };
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
