import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { WEEKDAYS, toggleWeekday, weekdayLabels } from "../schedule-math";
import { localize, pickLanguage } from "../localize/localize";
import type { TranslationKey } from "../localize/localize";
import { asNumber, defineElement } from "../types";
import type { HomeAssistant } from "../types";
import type { HubOptions } from "./config-read";
import { FLOW_UNITS, detectedFlowUnit, flowUnitNote } from "./flow-units";
import {
  ALL_EVENT_ORDER,
  NOTIFY_GROUP_ORDER,
  buildSaveCalls,
  discoverRecipients,
  presetSelection,
  recipientRows,
  selectionFromStatus,
} from "./notification-wizard-state";
import type {
  NotificationStatusResponse,
  NotifyGroup,
  NotifyPriority,
  SetNotificationsCall,
  WizardPreset,
  WizardSelection,
} from "./notification-wizard-state";
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


/**
 * Installer settings: the panel edits them, the services validate them.
 *
 * A field the user left empty is omitted entirely, because every settings
 * service treats absent as unchanged. Zero is NOT empty — it is a meaningful
 * pause or confirmation delay, and dropping it as falsy would make the field
 * impossible to set back to zero.
 */
function put(
  patch: Record<string, unknown>,
  key: string,
  value: number | string | undefined,
): void {
  if (value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;
  patch[key] = value;
}

export interface SessionLimitsInput {
  sessionMaxMin?: number;
  mustFinishBy?: string;
  waitFreeMin?: number;
  manualBlockMin?: number;
  settlePauseS?: number;
  sentinelTime?: string;
}

export function buildSessionLimitsPatch(input: SessionLimitsInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  put(patch, "session_max_min", input.sessionMaxMin);
  put(patch, "must_finish_by", input.mustFinishBy);
  put(patch, "wait_free_min", input.waitFreeMin);
  put(patch, "manual_block_min", input.manualBlockMin);
  put(patch, "settle_pause_s", input.settlePauseS);
  put(patch, "sentinel_time", input.sentinelTime);
  return patch;
}

export interface ValveSafetyInput {
  openConfirmS?: number;
  closeConfirmS?: number;
  switchConfirmS?: number;
  startupValveTimeoutS?: number;
  watchdogMaxMin?: number;
}

export function buildValveSafetyPatch(input: ValveSafetyInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  put(patch, "open_confirm_s", input.openConfirmS);
  put(patch, "close_confirm_s", input.closeConfirmS);
  put(patch, "switch_confirm_s", input.switchConfirmS);
  put(patch, "startup_valve_timeout_s", input.startupValveTimeoutS);
  put(patch, "watchdog_max_min", input.watchdogMaxMin);
  return patch;
}

export interface ConcurrencyInput {
  maxConcurrent?: number;
  compatibilityGroups?: string;
  masterPreOpenS?: number;
  masterPostCloseS?: number;
}

export function buildConcurrencyPatch(input: ConcurrencyInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  put(patch, "max_concurrent", input.maxConcurrent);
  put(patch, "compatibility_groups", input.compatibilityGroups?.trim());
  put(patch, "master_pre_open_s", input.masterPreOpenS);
  put(patch, "master_post_close_s", input.masterPostCloseS);
  return patch;
}

/** One recipient's outcome from `test_notification`, as the panel hands it back. */
export interface NotifyTestResult {
  sent: boolean;
  error: string | null;
}

/** `imc-settings-test-notification`: the recipients to prove, right now. */
export interface NotificationTestDetail {
  services: string[];
}

const EVENT_LABEL_KEYS: Record<string, TranslationKey> = {
  watchdog: "notify.event_watchdog",
  anomaly: "notify.event_anomaly",
  skipped: "notify.event_skipped",
  interrupted: "notify.event_interrupted",
  cancelled: "notify.event_cancelled",
  completed: "notify.event_completed",
  sentinel: "notify.event_sentinel",
  session_overrun: "notify.event_session_overrun",
  consumption_budget: "notify.event_consumption_budget",
};

const GROUP_LABEL_KEYS: Record<NotifyGroup, TranslationKey> = {
  critical: "notify.group_critical",
  operational: "notify.group_operational",
  informational: "notify.group_informational",
};

const PRESET_LABEL_KEYS: Record<WizardPreset, TranslationKey> = {
  recommended: "notify.preset_recommended",
  critical: "notify.preset_critical",
  all: "notify.preset_all",
};

const PRESET_ORDER: readonly WizardPreset[] = ["recommended", "critical", "all"];

const STEP_LABEL_KEYS: readonly TranslationKey[] = [
  "notify.step_recipients",
  "notify.step_events",
  "notify.step_summary",
];

/** An event's label, degrading to the raw key for an event this card doesn't know. */
function eventLabel(lang: string, event: string): string {
  const key = EVENT_LABEL_KEYS[event];
  return key === undefined ? event : localize(lang, key);
}

/**
 * The priority a chip must show.
 *
 * `selection.priorities` is sparse on purpose: an entry exists only for an
 * event whose priority the user actually chose, or that was already
 * configured — and `buildSaveCalls` sends the field only for those. Every
 * other event falls back to what the backend reports, which for an
 * unconfigured event IS `default_priority(event)`: high for watchdog,
 * anomaly, sentinel and interrupted. Pre-filling the map to make rendering
 * simpler would turn those defaults into explicit stored values and shadow
 * them permanently.
 */
export function effectiveNotifyPriority(
  selection: WizardSelection,
  status: NotificationStatusResponse,
  event: string,
): NotifyPriority {
  const chosen = selection.priorities[event];
  if (chosen !== undefined) return chosen;
  const reported = status.events.find((entry) => entry.event === event)?.priority;
  return reported === "high" ? "high" : "normal";
}

/**
 * The essential events that will not arrive — what the mute banner names.
 *
 * Empty exactly when the verdict is `ok`: notify.py calls it `ok` only when
 * every essential event is reachable, so "the banner has nothing to say" and
 * "the banner is not drawn" are the same condition rather than two rules that
 * could drift apart.
 */
export function unreachableEssentials(status: NotificationStatusResponse): string[] {
  return status.events
    .filter((event) => event.essential && !event.reachable)
    .map((event) => event.event);
}

/** Set equality: a preset is "the current choice" however the lists are ordered. */
export function sameEventSet(left: readonly string[], right: readonly string[]): boolean {
  const chosen = new Set(left);
  const other = new Set(right);
  return chosen.size === other.size && [...chosen].every((event) => other.has(event));
}

export interface WeatherSaveDetail {
  weather_entity: string;
  rain_sensor?: string;
  outdoor_temp_sensor?: string;
  line_flow_sensor?: string;
  line_flow_sensor_unit?: string;
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
  @state() private _lineFlowSensorUnit = "";
  @state() private _masterValve = "";

  // Budget consumo
  @state() private _litersPerMonth?: number;
  @state() private _action: BudgetAction = "notify";
  @state() private _reducePct?: number;

  // Restrizioni calendario
  @state() private _forbiddenWindows: { start: string; end: string }[] = [];

  // Installer settings: two collapsed drawers, closed by default. Everything
  // is reachable, but eleven safety fields sitting open next to the everyday
  // settings invite accidental edits.
  @state() private _sessionOpen = false;
  @state() private _valvesOpen = false;
  @state() private _session: SessionLimitsInput = {};
  @state() private _valves: ValveSafetyInput = {};
  @state() private _concurrency: ConcurrencyInput = {};

  // Notifications: a three-step guided path, not nine flat rows.
  //
  // Its state comes from the backend's `notification_status` (read by
  // panel.ts and passed down here), NOT from the exported config: the
  // verdict, the recommendation and per-event reachability are derived
  // state with exactly one implementation, in notify.py.
  @property({ attribute: false }) notifyStatus?: NotificationStatusResponse;
  /** The status read failed. Only shown when there is no status to show. */
  @property({ attribute: false }) notifyStatusFailed = false;
  @property({ attribute: false }) testResults: Record<string, NotifyTestResult> = {};
  /** Recipients whose test send has not answered yet. */
  @property({ attribute: false }) testPending: string[] = [];
  @state() private _wizardStep = 0;
  @state() private _selection: WizardSelection = { recipients: [], events: [], priorities: {} };
  @state() private _collapsedGroups: string[] = [];
  @state() private _saveError?: string;

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
    .field-note {
      margin-top: 6px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
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
    .notify-hint {
      margin-top: 8px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
    .notify-error {
      margin-top: 10px;
      font-size: 12.5px;
      color: var(--error-color, #db4437);
    }
    .notify-banner {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12.5px;
      background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
      border: 1px solid var(--error-color, #db4437);
    }
    .notify-banner-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 14px 0 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
    }
    .step.on {
      color: var(--imc-accent, #3a6df0);
      font-weight: 600;
    }
    .notify-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin: 7px 0;
    }
    .check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 150px;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      overflow-wrap: anywhere;
    }
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      flex: none;
      accent-color: var(--imc-accent, #3a6df0);
      cursor: pointer;
    }
    .link-btn {
      border: none;
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      font: inherit;
      font-size: 12px;
      padding: 0;
      cursor: pointer;
    }
    .notify-banner .link-btn {
      margin-top: 6px;
    }
    .link-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .recipient-gone {
      font-size: 12px;
      color: var(--error-color, #db4437);
    }
    .test-result {
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .test-result.ok {
      color: var(--success-color, #1f9d55);
    }
    .test-result.fail {
      color: var(--error-color, #db4437);
    }
    .group-header {
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .seg.small span {
      font-size: 11px;
      padding: 4px 9px;
    }
    .summary {
      font-size: 13px;
      overflow-wrap: anywhere;
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
    // The wizard opens on what `notification_status` reports, so a save
    // followed by a reload leaves the user looking at what is now stored.
    // The step is deliberately NOT reset: being thrown back to step 1 the
    // instant a save lands reads as the save having failed.
    if (changed.has("notifyStatus") && this.notifyStatus) {
      this._selection = selectionFromStatus(this.notifyStatus);
      this._saveError = undefined;
    }
  }

  private _seedFromOptions(): void {
    const o = this.options ?? {};
    this._weatherEntity = o.weather_entity ?? "";
    this._rainSensor = o.rain_sensor ?? "";
    this._outdoorTempSensor = o.outdoor_temp_sensor ?? "";
    this._lineFlowSensor = o.line_flow_sensor ?? "";
    this._lineFlowSensorUnit = o.line_flow_sensor_unit ?? "";
    this._masterValve = o.master_valve ?? "";

    const budget = o.consumption_budget;
    this._litersPerMonth = budget?.liters_per_month;
    this._action = normalizeAction(budget?.action);
    this._reducePct = budget?.reduce_pct;

    const restrictions = o.restrictions;
    const opts = this.options ?? {};
    this._session = {
      sessionMaxMin: opts.session_max_min,
      mustFinishBy: opts.must_finish_by,
      waitFreeMin: opts.wait_free_min,
      manualBlockMin: opts.manual_block_min,
      settlePauseS: opts.settle_pause_s,
      sentinelTime: opts.sentinel_time,
    };
    this._valves = {
      openConfirmS: opts.open_confirm_s,
      closeConfirmS: opts.close_confirm_s,
      switchConfirmS: opts.switch_confirm_s,
      startupValveTimeoutS: opts.startup_valve_timeout_s,
      watchdogMaxMin: opts.watchdog_max_min,
    };
    this._concurrency = {
      maxConcurrent: opts.max_concurrent,
      compatibilityGroups: opts.compatibility_groups,
      masterPreOpenS: opts.master_pre_open_s,
      masterPostCloseS: opts.master_post_close_s,
    };
    // `opts.notifications` is deliberately NOT read here: the wizard's state
    // is seeded from `notification_status` in `willUpdate` above.
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

  /**
   * `set_weather_sources` already drops a stored line-meter unit whenever the
   * line meter itself is cleared — an override that outlived its sensor would
   * silently apply to whatever sensor is configured next. Mirror that here so
   * the form shows what the save will actually do.
   */
  private _setLineFlowSensor(value: string): void {
    this._lineFlowSensor = value;
    if (value.trim() === "") this._lineFlowSensorUnit = "";
  }

  /**
   * The unit the line meter reports in, under the picker it belongs to.
   * Rendered only once a meter is chosen (see `_setLineFlowSensor`), and
   * offering "detected from the entity" as a real option: saving it sends
   * `""`, which `set_weather_sources` reads as "clear the override".
   */
  private _renderLineFlowUnit(lang: string): TemplateResult | typeof nothing {
    const sensor = this._lineFlowSensor.trim();
    if (sensor === "") return nothing;
    const detected = this.hass ? detectedFlowUnit(this.hass, sensor) : undefined;
    const label = localize(lang, "settings.field_line_flow_unit");
    const chosen = this._lineFlowSensorUnit;
    // Selection lives on the options rather than in a `.value` binding on the
    // <select>, for the reason spelled out in zone-editor's `_renderFlowUnit`:
    // lit-html commits an element's bindings before its children exist.
    // The note's strings are the `zone.*` ones — they are not zone-specific.
    return html`
      <div class="section-label">${label}</div>
      <select
        class="field"
        aria-label=${label}
        @change=${(e: Event) => (this._lineFlowSensorUnit = (e.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${chosen === ""}>
          ${localize(lang, "zone.flow_unit_auto")}
        </option>
        ${FLOW_UNITS.map(
          (unit) => html`<option value=${unit} ?selected=${chosen === unit}>${unit}</option>`,
        )}
      </select>
      <div class="field-note">${flowUnitNote(lang, this._lineFlowSensorUnit, detected)}</div>
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
      ${this._renderRestrictionsSection(lang)} ${this._renderNotificationsSection(lang)}
      ${this._renderSessionDrawer(lang)} ${this._renderValvesDrawer(lang)}

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
              (v) => this._setLineFlowSensor(v),
            )}
            ${this._renderLineFlowUnit(lang)}
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
      line_flow_sensor_unit: this._lineFlowSensorUnit.trim(),
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


  /** A labelled number input that reports its unit and its default. */
  private _num(
    label: string,
    hint: string,
    value: number | undefined,
    onInput: (value: number | undefined) => void,
  ): TemplateResult {
    return html`
      <div class="section-label">${label}</div>
      <input
        class="field"
        type="number"
        .value=${value ?? ""}
        @input=${(e: Event) => onInput(asNumber((e.target as HTMLInputElement).value))}
      />
      <div class="hint">${hint}</div>
    `;
  }

  /**
   * The guided path: who receives them, what to send, confirm. A recipient
   * is PICKED from the notify services the instance actually has, never
   * typed — the field this replaces carried a `notify.mobile_app_phone`
   * placeholder, which the integration then invoked as
   * `notify.notify.mobile_app_phone` and which therefore never arrived.
   */
  private _renderNotificationsSection(lang: string): TemplateResult {
    const status = this.notifyStatus;
    if (!status) {
      // Nothing to configure yet: either the read is in flight, or it failed
      // with nothing to fall back on. A failure has to say so HERE and offer
      // the retry — the reading line on its own is a dead end whose only exit
      // is leaving settings and coming back.
      return html`
        <div class="sec">
          <div class="header">🔔 ${localize(lang, "settings.notifications")}</div>
          ${this.notifyStatusFailed
            ? html`
                <div class="notify-error">${localize(lang, "notify.load_failed")}</div>
                <button class="link-btn" type="button" @click=${this._retryNotifyStatus}>
                  ${localize(lang, "notify.retry")}
                </button>
              `
            : html`<div class="notify-hint">${localize(lang, "notify.loading")}</div>`}
        </div>
      `;
    }
    return html`
      <div class="sec">
        <div class="header">🔔 ${localize(lang, "settings.notifications")}</div>
        ${status.verdict === "ok" ? nothing : this._renderMuteBanner(lang, status)}
        <div class="steps">
          ${STEP_LABEL_KEYS.map(
            (key, index) =>
              html`<span class="step ${index === this._wizardStep ? "on" : ""}"
                >${index + 1}. ${localize(lang, key)}</span
              >`,
          )}
        </div>
        ${this._wizardStep === 0 ? this._renderRecipients(lang) : nothing}
        ${this._wizardStep === 1 ? this._renderEvents(lang, status) : nothing}
        ${this._wizardStep === 2 ? this._renderSummary(lang) : nothing}
        ${this._renderWizardNav(lang)}
      </div>
    `;
  }

  /**
   * What will not arrive. The verdict is the backend's, never recomputed
   * here: `silent` means no essential event has a working recipient at all,
   * `partial` means some of them do and the banner names the rest.
   */
  private _renderMuteBanner(lang: string, status: NotificationStatusResponse): TemplateResult {
    const unreached = unreachableEssentials(status)
      .map((event) => eventLabel(lang, event))
      .join(", ");
    return html`
      <div class="notify-banner">
        ${status.verdict === "silent"
          ? html`
              <div class="notify-banner-title">${localize(lang, "notify.mute_title")}</div>
              <div>${localize(lang, "notify.mute_body")}</div>
            `
          : html`<div>${localize(lang, "notify.partial_body", { events: unreached })}</div>`}
        <button class="link-btn" type="button" @click=${() => this._goToStep(0)}>
          ${localize(lang, "notify.configure")}
        </button>
      </div>
    `;
  }

  /**
   * Step 1. The list is the instance's own notify services, so a recipient
   * that cannot exist cannot be chosen. Each one can be proved before it
   * matters: `test_notification` reports per recipient whether the message
   * actually left.
   *
   * A recipient that is still stored but has vanished from the instance is
   * listed too, marked as gone: it has no service to test, but it needs the
   * checkbox, because unchecking it is the only way to stop Save from writing
   * it back and its ERROR repair from re-raising.
   */
  private _renderRecipients(lang: string): TemplateResult {
    const recipients = this.hass ? recipientRows(this.hass, this._selection.recipients) : [];
    if (recipients.length === 0) {
      return html`<div class="notify-hint">${localize(lang, "notify.no_recipients")}</div>`;
    }
    return html`
      <div class="section-label">${localize(lang, "notify.step_recipients")}</div>
      ${recipients.map((recipient) => {
        // The send blocks on the notify integration, so a slow one would
        // otherwise leave the click with no feedback at all: while a test is
        // outstanding the row says so, and its button cannot be pressed again.
        const pending = this.testPending.includes(recipient.service);
        const result = this.testResults[recipient.service];
        return html`
          <div class="notify-row">
            <label class="check-row">
              <input
                type="checkbox"
                .checked=${this._selection.recipients.includes(recipient.service)}
                @change=${() => this._toggleRecipient(recipient.service)}
              />
              <span>${recipient.label}</span>
            </label>
            ${recipient.missing
              ? html`<span class="recipient-gone">${localize(lang, "notify.recipient_gone")}</span>`
              : html`
                  <button
                    class="link-btn"
                    type="button"
                    ?disabled=${pending}
                    @click=${() => this._sendTest(recipient.service)}
                  >
                    ${localize(lang, "notify.send_test")}
                  </button>
                `}
            ${pending
              ? html`<span class="test-result">… ${localize(lang, "notify.test_sending")}</span>`
              : result === undefined
                ? nothing
                : html`<span class="test-result ${result.sent ? "ok" : "fail"}"
                    >${result.sent
                      ? `✓ ${localize(lang, "notify.test_ok")}`
                      : `✗ ${localize(lang, "notify.test_failed", { error: result.error ?? "" })}`}</span
                  >`}
          </div>
        `;
      })}
      ${recipients.some((recipient) => recipient.missing)
        ? html`<div class="notify-hint">${localize(lang, "notify.recipient_gone_hint")}</div>`
        : nothing}
    `;
  }

  /** Step 2: a preset in one click, or the three groups browsed by hand. */
  private _renderEvents(lang: string, status: NotificationStatusResponse): TemplateResult {
    return html`
      <div class="section-label">${localize(lang, "notify.step_events")}</div>
      <span class="seg">
        ${PRESET_ORDER.map((preset) => {
          // `.seg` means "here is the current choice" everywhere else in this
          // view, so a preset the selection already matches must read as
          // chosen — otherwise the recommendation the wizard opens on looks
          // like something nobody has accepted yet.
          const current = sameEventSet(this._selection.events, presetSelection(preset, status));
          return html`<span
            class="${current ? "sel" : ""}"
            @click=${() => this._applyPreset(preset, status)}
            >${localize(lang, PRESET_LABEL_KEYS[preset])}</span
          >`;
        })}
      </span>
      ${NOTIFY_GROUP_ORDER.map((group) => this._renderEventGroup(lang, group, status))}
    `;
  }

  private _renderEventGroup(
    lang: string,
    group: NotifyGroup,
    status: NotificationStatusResponse,
  ): TemplateResult {
    const open = !this._collapsedGroups.includes(group);
    const events = status.groups[group] ?? [];
    return html`
      <div class="group-header" @click=${() => this._toggleGroup(group)}>
        ${open ? "▾" : "▸"} ${localize(lang, GROUP_LABEL_KEYS[group])}
      </div>
      ${open ? events.map((event) => this._renderEventRow(lang, event, status)) : nothing}
    `;
  }

  private _renderEventRow(
    lang: string,
    event: string,
    status: NotificationStatusResponse,
  ): TemplateResult {
    const priority = effectiveNotifyPriority(this._selection, status, event);
    return html`
      <div class="notify-row">
        <label class="check-row">
          <input
            type="checkbox"
            .checked=${this._selection.events.includes(event)}
            @change=${() => this._toggleEvent(event)}
          />
          <span>${eventLabel(lang, event)}</span>
        </label>
        <span class="seg small">
          <span
            class="${priority === "high" ? "sel" : ""}"
            @click=${() => this._setPriority(event, "high")}
            >${localize(lang, "notify.priority_high")}</span
          >
          <span
            class="${priority === "normal" ? "sel" : ""}"
            @click=${() => this._setPriority(event, "normal")}
            >${localize(lang, "notify.priority_normal")}</span
          >
        </span>
      </div>
    `;
  }

  /** Step 3: exactly what Save will write, in the backend's own event order. */
  private _renderSummary(lang: string): TemplateResult {
    const labels = new Map(
      (this.hass ? discoverRecipients(this.hass) : []).map((r) => [r.service, r.label]),
    );
    const chosen = ALL_EVENT_ORDER.filter((event) => this._selection.events.includes(event));
    return html`
      <div class="section-label">${localize(lang, "notify.step_recipients")}</div>
      <div class="summary">
        ${this._selection.recipients.map((service) => labels.get(service) ?? service).join(", ") ||
        "—"}
      </div>
      <div class="section-label">${localize(lang, "notify.step_events")}</div>
      <div class="summary">
        ${chosen.length === 0 ? "—" : chosen.map((event) => eventLabel(lang, event)).join(", ")}
      </div>
      ${this._saveError ? html`<div class="notify-error">${this._saveError}</div>` : nothing}
    `;
  }

  private _renderWizardNav(lang: string): TemplateResult {
    return html`
      <div class="buttons">
        ${this._wizardStep > 0
          ? html`<button type="button" @click=${() => this._goToStep(this._wizardStep - 1)}>
              ${localize(lang, "notify.back")}
            </button>`
          : nothing}
        ${this._wizardStep < STEP_LABEL_KEYS.length - 1
          ? html`<button
              class="primary"
              type="button"
              @click=${() => this._goToStep(this._wizardStep + 1)}
            >
              ${localize(lang, "notify.next")}
            </button>`
          : html`<button class="primary" type="button" @click=${() => this._saveNotifications(lang)}>
              ${localize(lang, "notify.save")}
            </button>`}
      </div>
    `;
  }

  private _goToStep(step: number): void {
    this._wizardStep = Math.min(STEP_LABEL_KEYS.length - 1, Math.max(0, step));
    this._saveError = undefined;
  }

  private _toggleRecipient(service: string): void {
    const chosen = this._selection.recipients;
    this._selection = {
      ...this._selection,
      recipients: chosen.includes(service)
        ? chosen.filter((name) => name !== service)
        : [...chosen, service],
    };
  }

  private _toggleEvent(event: string): void {
    const chosen = this._selection.events;
    this._selection = {
      ...this._selection,
      events: chosen.includes(event)
        ? chosen.filter((name) => name !== event)
        : [...chosen, event],
    };
  }

  private _toggleGroup(group: NotifyGroup): void {
    this._collapsedGroups = this._collapsedGroups.includes(group)
      ? this._collapsedGroups.filter((name) => name !== group)
      : [...this._collapsedGroups, group];
  }

  private _applyPreset(preset: WizardPreset, status: NotificationStatusResponse): void {
    this._selection = { ...this._selection, events: presetSelection(preset, status) };
  }

  /**
   * The ONLY writer of `priorities` — see `effectiveNotifyPriority` above
   * for why nothing else may add an entry.
   */
  private _setPriority(event: string, priority: NotifyPriority): void {
    this._selection = {
      ...this._selection,
      priorities: { ...this._selection.priorities, [event]: priority },
    };
  }

  /** Ask the panel to read `notification_status` again after a failed read. */
  private _retryNotifyStatus(): void {
    this.dispatchEvent(
      new CustomEvent<void>("imc-settings-retry-notifications", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _sendTest(service: string): void {
    this.dispatchEvent(
      new CustomEvent<NotificationTestDetail>("imc-settings-test-notification", {
        detail: { services: [service] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * `buildSaveCalls` refuses a selection that enables an event with nowhere
   * to send it — the same refusal `set_notifications` makes server-side.
   * Catching it here keeps the user in the wizard with an explanation,
   * instead of a service-error toast over a form they can no longer see.
   */
  private _saveNotifications(lang: string): void {
    let calls: SetNotificationsCall[];
    try {
      calls = buildSaveCalls(this._selection);
    } catch {
      this._saveError = localize(lang, "notify.needs_recipient");
      return;
    }
    this._saveError = undefined;
    this.dispatchEvent(
      new CustomEvent<SetNotificationsCall[]>("imc-settings-save-notifications", {
        detail: calls,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderSessionDrawer(lang: string): TemplateResult {
    return html`
      <div class="sec">
        <div
          class="header advanced-toggle"
          @click=${() => (this._sessionOpen = !this._sessionOpen)}
        >
          ${this._sessionOpen ? "▾" : "▸"} ${localize(lang, "settings.session_safety")}
        </div>
        ${this._sessionOpen
          ? html`
              ${this._num(
                localize(lang, "settings.session_max_min"),
                localize(lang, "settings.session_max_min_hint"),
                this._session.sessionMaxMin,
                (v) => (this._session = { ...this._session, sessionMaxMin: v }),
              )}
              <div class="section-label">${localize(lang, "settings.must_finish_by")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.mustFinishBy ?? ""}
                @input=${(e: Event) =>
                  (this._session = {
                    ...this._session,
                    mustFinishBy: (e.target as HTMLInputElement).value,
                  })}
              />
              ${this._num(
                localize(lang, "settings.wait_free_min"),
                localize(lang, "settings.wait_free_min_hint"),
                this._session.waitFreeMin,
                (v) => (this._session = { ...this._session, waitFreeMin: v }),
              )}
              ${this._num(
                localize(lang, "settings.manual_block_min"),
                localize(lang, "settings.manual_block_min_hint"),
                this._session.manualBlockMin,
                (v) => (this._session = { ...this._session, manualBlockMin: v }),
              )}
              ${this._num(
                localize(lang, "settings.settle_pause_s"),
                localize(lang, "settings.settle_pause_s_hint"),
                this._session.settlePauseS,
                (v) => (this._session = { ...this._session, settlePauseS: v }),
              )}
              <div class="section-label">${localize(lang, "settings.sentinel_time")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.sentinelTime ?? ""}
                @input=${(e: Event) =>
                  (this._session = {
                    ...this._session,
                    sentinelTime: (e.target as HTMLInputElement).value,
                  })}
              />
              <button class="primary" @click=${this._saveSessionLimits}>
                ${localize(lang, "editor.save")}
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderValvesDrawer(lang: string): TemplateResult {
    return html`
      <div class="sec">
        <div class="header advanced-toggle" @click=${() => (this._valvesOpen = !this._valvesOpen)}>
          ${this._valvesOpen ? "▾" : "▸"} ${localize(lang, "settings.valves_concurrency")}
        </div>
        ${this._valvesOpen
          ? html`
              ${this._num(
                localize(lang, "settings.open_confirm_s"),
                localize(lang, "settings.open_confirm_s_hint"),
                this._valves.openConfirmS,
                (v) => (this._valves = { ...this._valves, openConfirmS: v }),
              )}
              ${this._num(
                localize(lang, "settings.close_confirm_s"),
                localize(lang, "settings.close_confirm_s_hint"),
                this._valves.closeConfirmS,
                (v) => (this._valves = { ...this._valves, closeConfirmS: v }),
              )}
              ${this._num(
                localize(lang, "settings.switch_confirm_s"),
                localize(lang, "settings.switch_confirm_s_hint"),
                this._valves.switchConfirmS,
                (v) => (this._valves = { ...this._valves, switchConfirmS: v }),
              )}
              ${this._num(
                localize(lang, "settings.startup_valve_timeout_s"),
                localize(lang, "settings.startup_valve_timeout_s_hint"),
                this._valves.startupValveTimeoutS,
                (v) => (this._valves = { ...this._valves, startupValveTimeoutS: v }),
              )}
              ${this._num(
                localize(lang, "settings.watchdog_max_min"),
                localize(lang, "settings.watchdog_max_min_hint"),
                this._valves.watchdogMaxMin,
                (v) => (this._valves = { ...this._valves, watchdogMaxMin: v }),
              )}
              ${this._num(
                localize(lang, "settings.max_concurrent"),
                localize(lang, "settings.max_concurrent_hint"),
                this._concurrency.maxConcurrent,
                (v) => (this._concurrency = { ...this._concurrency, maxConcurrent: v }),
              )}
              <div class="section-label">${localize(lang, "settings.compatibility_groups")}</div>
              <input
                class="field"
                type="text"
                .value=${this._concurrency.compatibilityGroups ?? ""}
                @input=${(e: Event) =>
                  (this._concurrency = {
                    ...this._concurrency,
                    compatibilityGroups: (e.target as HTMLInputElement).value,
                  })}
              />
              <div class="hint">${localize(lang, "settings.compatibility_groups_hint")}</div>
              ${this._num(
                localize(lang, "settings.master_pre_open_s"),
                localize(lang, "settings.master_pre_open_s_hint"),
                this._concurrency.masterPreOpenS,
                (v) => (this._concurrency = { ...this._concurrency, masterPreOpenS: v }),
              )}
              ${this._num(
                localize(lang, "settings.master_post_close_s"),
                localize(lang, "settings.master_post_close_s_hint"),
                this._concurrency.masterPostCloseS,
                (v) => (this._concurrency = { ...this._concurrency, masterPostCloseS: v }),
              )}
              <button class="primary" @click=${this._saveValveSafety}>
                ${localize(lang, "editor.save")}
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _saveSessionLimits(): void {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-session-limits", {
        detail: buildSessionLimitsPatch(this._session),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _saveValveSafety(): void {
    // The drawer holds both groups, so one Save emits both service calls.
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-valve-safety", {
        detail: buildValveSafetyPatch(this._valves),
        bubbles: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-concurrency", {
        detail: buildConcurrencyPatch(this._concurrency),
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
