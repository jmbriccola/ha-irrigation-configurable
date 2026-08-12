import { css, html, LitElement } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { defineElement } from "../types";

/**
 * The program calendar control: one mode at a time.
 *
 * Before 2.0.0 a weekday grid on the program and an "every N days" cadence on
 * the zone were edited on different screens and silently ANDed, so a
 * Mon/Wed/Fri program with the default cadence never watered on Wednesday.
 * The three modes here are mutually exclusive, and switching mode replaces
 * the calendar object wholesale — the UI cannot express a hybrid any more
 * than the stored discriminated union can.
 */

export const ALL_WEEKDAYS: number[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MIN_INTERVAL = 1;
const MAX_INTERVAL = 60;

export type CalendarConfig =
  | { mode: "weekdays"; days: number[] }
  | { mode: "interval"; interval_days: number }
  | { mode: "parity"; parity: "odd" | "even" };

export interface CalendarChangeDetail {
  calendar: CalendarConfig;
}

/**
 * What may arrive off the wire: a hand-edited store or an older export can
 * carry any shape, so the loose type is the honest input here.
 */
export interface CalendarLike {
  mode?: string;
  days?: number[];
  interval_days?: number;
  parity?: string;
}

/** Normalise to exactly the keys of the active mode. */
export function normaliseCalendar(calendar: CalendarLike | undefined): CalendarConfig {
  const everyDay: CalendarConfig = { mode: "weekdays", days: [...ALL_WEEKDAYS] };
  if (!calendar) return everyDay;
  if (calendar.mode === "interval") {
    const raw = Number(calendar.interval_days) || MIN_INTERVAL;
    return {
      mode: "interval",
      interval_days: Math.min(Math.max(Math.round(raw), MIN_INTERVAL), MAX_INTERVAL),
    };
  }
  if (calendar.mode === "parity") {
    return { mode: "parity", parity: calendar.parity === "even" ? "even" : "odd" };
  }
  if (calendar.mode === "weekdays") {
    const days = [...new Set(calendar.days ?? [])].sort((a, b) => a - b);
    return days.length === 0 ? everyDay : { mode: "weekdays", days };
  }
  return everyDay;
}

/** One-line summary for the program list. */
export function describeCalendar(calendar: CalendarLike | undefined): string {
  const normalised = normaliseCalendar(calendar);
  if (normalised.mode === "interval") {
    return normalised.interval_days === 1
      ? "Ogni giorno"
      : `Ogni ${normalised.interval_days} giorni`;
  }
  if (normalised.mode === "parity") {
    return normalised.parity === "odd" ? "Giorni dispari" : "Giorni pari";
  }
  if (normalised.days.length >= 7) return "Ogni giorno";
  return normalised.days.map((day) => DAY_LABELS[day]).join(", ");
}

export class ImcCalendarEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .modes {
      display: flex;
      gap: 4px;
      background: var(--secondary-background-color, #f1f1f1);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 12px;
    }
    .modes button {
      flex: 1;
      border: none;
      background: transparent;
      border-radius: 8px;
      padding: 8px 6px;
      font: inherit;
      font-size: 0.9em;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .modes button[aria-pressed="true"] {
      background: var(--card-background-color, #fff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      border: 1px solid var(--divider-color, #ddd);
      background: transparent;
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .chip[aria-pressed="true"] {
      background: var(--primary-color, #03a9f4);
      border-color: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .interval {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .interval input {
      width: 5em;
      padding: 8px;
      font: inherit;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .hint {
      margin-top: 8px;
      font-size: 0.85em;
      color: var(--secondary-text-color, #666);
    }
  `;

  @property({ attribute: false }) calendar?: CalendarConfig;

  private get _value(): CalendarConfig {
    return normaliseCalendar(this.calendar);
  }

  private _emit(calendar: CalendarConfig): void {
    this.dispatchEvent(
      new CustomEvent<CalendarChangeDetail>("imc-calendar-change", {
        detail: { calendar },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Switching mode replaces the object; nothing carries over. */
  private _selectMode(mode: CalendarConfig["mode"]): void {
    if (this._value.mode === mode) return;
    if (mode === "interval") this._emit({ mode: "interval", interval_days: 3 });
    else if (mode === "parity") this._emit({ mode: "parity", parity: "odd" });
    else this._emit({ mode: "weekdays", days: [...ALL_WEEKDAYS] });
  }

  private _toggleDay(day: number): void {
    const current = this._value;
    if (current.mode !== "weekdays") return;
    const days = current.days.includes(day)
      ? current.days.filter((item) => item !== day)
      : [...current.days, day].sort((a, b) => a - b);
    // A program with no days would never water; keep the last one selected.
    if (days.length === 0) return;
    this._emit({ mode: "weekdays", days });
  }

  private _setInterval(raw: string): void {
    this._emit(normaliseCalendar({ mode: "interval", interval_days: Number(raw) }));
  }

  private _renderBody(value: CalendarConfig): TemplateResult {
    if (value.mode === "interval") {
      return html`
        <div class="interval">
          <label for="imc-interval">Ogni</label>
          <input
            id="imc-interval"
            type="number"
            min="${MIN_INTERVAL}"
            max="${MAX_INTERVAL}"
            .value=${String(value.interval_days)}
            @change=${(event: Event) =>
              this._setInterval((event.target as HTMLInputElement).value)}
          />
          <span>giorni</span>
        </div>
        <div class="hint">Il conteggio riparte dal giorno in cui il programma ha irrigato.</div>
      `;
    }
    if (value.mode === "parity") {
      return html`
        <div class="chips">
          ${(["odd", "even"] as const).map(
            (parity) => html`
              <button
                type="button"
                class="chip"
                aria-pressed=${value.parity === parity}
                @click=${() => this._emit({ mode: "parity", parity })}
              >
                ${parity === "odd" ? "Giorni dispari" : "Giorni pari"}
              </button>
            `,
          )}
        </div>
        <div class="hint">Segue il giorno del mese, come le ordinanze comunali pari/dispari.</div>
      `;
    }
    return html`
      <div class="chips">
        ${ALL_WEEKDAYS.map(
          (day) => html`
            <button
              type="button"
              class="chip"
              aria-pressed=${value.days.includes(day)}
              @click=${() => this._toggleDay(day)}
            >
              ${DAY_LABELS[day]}
            </button>
          `,
        )}
      </div>
    `;
  }

  override render(): TemplateResult {
    const value = this._value;
    const modes: Array<[CalendarConfig["mode"], string]> = [
      ["weekdays", "Giorni della settimana"],
      ["interval", "Ogni N giorni"],
      ["parity", "Pari/dispari"],
    ];
    return html`
      <div class="modes" role="group" aria-label="Modalità del calendario">
        ${modes.map(
          ([mode, label]) => html`
            <button
              type="button"
              aria-pressed=${value.mode === mode}
              @click=${() => this._selectMode(mode)}
            >
              ${label}
            </button>
          `,
        )}
      </div>
      ${this._renderBody(value)}
    `;
  }
}

defineElement("imc-calendar-editor", ImcCalendarEditor);
