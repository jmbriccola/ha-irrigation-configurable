import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { asNumber, isUnavailable, defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { formatNumber } from "../format";
import { discover, type MaestroModel, type ZoneBundle } from "../discovery";
import "./program-list";
import "./zone-editor";
import "./settings-view";
import { type CalendarConfig } from "./calendar-editor";
import type {
  ProgramCurveSaveDetail,
  ProgramMinutesSaveDetail,
  ProgramScheduleSaveDetail,
} from "./program-editor";
import type {
  ProgramRemoveDetail,
  ProgramRenameDetail,
  ProgramToggleDetail,
} from "./program-list";
import type { WizardFinishDetail } from "./program-wizard";
import type { ZoneRemoveDetail, ZoneSaveDetail } from "./zone-editor";
import type {
  BudgetSaveDetail,
  NotificationSaveDetail,
  RestrictionsSaveDetail,
  WeatherSaveDetail,
} from "./settings-view";
import {
  parseExportedConfig,
  type ExportedConfig,
  type HubOptions,
  type ZoneData,
} from "./config-read";

/**
 * Only the fields of the chosen mode travel: the service rebuilds the whole
 * calendar from them and writes it as one object, so switching mode can never
 * leave residue from the previous one.
 */
function calendarFields(calendar: CalendarConfig): Record<string, unknown> {
  if (calendar.mode === "interval") {
    return { calendar_mode: "interval", interval_days: calendar.interval_days };
  }
  if (calendar.mode === "parity") {
    return { calendar_mode: "parity", parity: calendar.parity };
  }
  return { calendar_mode: "weekdays", days: calendar.days };
}

/**
 * Sidebar panel shell: zone tabs + the selected zone's read-only program
 * list. Registered via panel_custom (see custom_components/.../panel.py),
 * which sets `hass`/`narrow`/`route`/`panel` on the element.
 */
export class IrrigationMaestroPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @state() private _selectedZoneId?: string;
  @state() private _error?: string;
  @state() private _notice?: string;
  // undefined = zone-list view, null = create-new, ZoneData = editing an
  // existing zone (seeded from a fresh `export_config` read — see
  // `_readConfig`/`_onEditZone` below).
  @state() private _editingZone?: ZoneData | null;
  @state() private _editingZoneId?: string;
  // "zones" = the normal zone tabs/program-list view (default), "settings" =
  // the everyday-settings view (spec §1.3), opened via the header's ⚙️
  // button — see `_onOpenSettings`/`_options` below.
  @state() private _view: "zones" | "settings" = "zones";
  @state() private _options?: HubOptions;

  private _relevantIds: string[] = [];
  private _statesCount = 0;
  private _errorTimer?: number;
  private _noticeTimer?: number;

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._errorTimer !== undefined) {
      window.clearTimeout(this._errorTimer);
      this._errorTimer = undefined;
    }
    if (this._noticeTimer !== undefined) {
      window.clearTimeout(this._noticeTimer);
      this._noticeTimer = undefined;
    }
  }

  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */

  private async _call(
    domain: string,
    service: string,
    data: Record<string, unknown>,
    returnResponse = false,
  ): Promise<{ context: unknown; response?: Record<string, unknown> } | undefined> {
    if (!this.hass) return undefined;
    try {
      // notifyOnError=false: this wrapper already surfaces failures via the
      // panel's own `_error` toast below — HA's own error dialog on top of
      // that would be a redundant, double error UI for the same failure.
      return await this.hass.callService(domain, service, data, undefined, false, returnResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._showError(message);
      return undefined;
    }
  }

  /** Surface a message in the `_error` toast, auto-dismissed after 6s — shared
   *  by `_call`'s failure path and any other spot (e.g. `_onEditZone`) that
   *  needs to report a non-`_call` failure the same way. */
  private _showError(message: string): void {
    this._error = message;
    if (this._errorTimer !== undefined) {
      window.clearTimeout(this._errorTimer);
    }
    this._errorTimer = window.setTimeout(() => {
      this._error = undefined;
      this._errorTimer = undefined;
    }, 6000);
  }

  /** Surface a message in the `_notice` toast, auto-dismissed after 3s — the
   *  success-side counterpart to `_showError` above, called after a save
   *  actually succeeds (never on failure — the `_error` toast already covers
   *  that). */
  private _showNotice(message: string): void {
    this._notice = message;
    if (this._noticeTimer !== undefined) {
      window.clearTimeout(this._noticeTimer);
    }
    this._noticeTimer = window.setTimeout(() => {
      this._notice = undefined;
      this._noticeTimer = undefined;
    }, 3000);
  }

  /**
   * Full-config snapshot, used to seed the zone editor with every field
   * (including the advanced ones `discover()`'s entity-attribute model
   * doesn't surface). `export_config` is a response service returning a
   * JSON string payload — nested under `res.response["payload"]`, same
   * shape as the other response services above.
   */
  private async _readConfig(): Promise<ExportedConfig | undefined> {
    const res = await this._call("irrigation_maestro", "export_config", {}, true);
    const payload = res?.response?.["payload"];
    if (typeof payload !== "string") return undefined;
    try {
      return parseExportedConfig(payload);
    } catch {
      return undefined;
    }
  }

  private async _onEditZone(zoneId: string): Promise<void> {
    const cfg = await this._readConfig();
    if (cfg) {
      this._editingZoneId = zoneId;
      this._editingZone = cfg.zones[zoneId] ?? {};
    } else {
      // `_readConfig()` returning undefined here is NOT a `_call` exception
      // (that path already populates `_error` on its own) — it's a
      // service-succeeded-but-unusable-payload case (missing/non-string/
      // unparseable), which would otherwise fail silently with no visible
      // feedback to the user.
      this._showError(localize(pickLanguage(this.hass), "panel.config_read_failed"));
    }
  }

  /**
   * ⚙️ header button: opens the everyday-settings view (spec §1.3), seeded
   * from a fresh `export_config` read — same "read-before-open" pattern as
   * `_onEditZone` above, including the shared `config_read_failed` error
   * path when the read fails or the payload is unusable.
   */
  private async _onOpenSettings(): Promise<void> {
    const cfg = await this._readConfig();
    if (cfg) {
      this._options = cfg.options;
      this._view = "settings";
    } else {
      this._showError(localize(pickLanguage(this.hass), "panel.config_read_failed"));
    }
  }

  /**
   * `imc-zone-save`: `add_zone` accepts ONLY `name`/`valve_entity`/
   * `area_m2`/`icon` — its voluptuous schema has no ALLOW_EXTRA, so any
   * other field in the payload hard-fails the call. Pick exactly those
   * keys rather than spreading `d.patch` (the editor never produces
   * advanced fields in create mode, but this guards defensively either
   * way). `update_zone` accepts the full field set, so the update branch
   * spreads the patch directly. `add_zone` is a response service — its id
   * comes back nested under `res.response["zone_id"]`, mirroring
   * `_onWizardFinish`'s `program_id` handling above.
   *
   * Editing state is only cleared on SUCCESS — `_call` returns `undefined`
   * on a failed service call (having already populated `_error`), so a
   * failed add/update leaves `_editingZone`/`_editingZoneId` untouched and
   * the editor stays open with the user's input intact, rather than
   * silently discarding it behind the 6s error toast.
   */
  private async _onZoneSave(ev: CustomEvent<ZoneSaveDetail>): Promise<void> {
    const d = ev.detail;
    let success: boolean;
    if (d.mode === "add") {
      const p = d.patch;
      const add: Record<string, unknown> = { name: p.name, valve_entity: p.valve_entity };
      if (p.area_m2 !== undefined) add["area_m2"] = p.area_m2;
      if (p.icon !== undefined) add["icon"] = p.icon;
      const res = await this._call("irrigation_maestro", "add_zone", add, true);
      const zoneId = res?.response?.["zone_id"];
      success = typeof zoneId === "string" && zoneId !== "";
      if (success) this._selectedZoneId = zoneId as string;
    } else {
      const res = await this._call("irrigation_maestro", "update_zone", {
        zone_id: d.zoneId,
        ...d.patch,
      });
      success = !!res;
    }
    if (success) {
      this._editingZone = undefined;
      this._editingZoneId = undefined;
      this._showNotice(localize(pickLanguage(this.hass), "panel.saved_zone"));
    }
  }

  private async _onZoneRemove(ev: CustomEvent<ZoneRemoveDetail>): Promise<void> {
    const res = await this._call("irrigation_maestro", "remove_zone", {
      zone_id: ev.detail.zoneId,
    });
    this._editingZone = undefined;
    this._editingZoneId = undefined;
    this._selectedZoneId = undefined;
    if (res) {
      this._showNotice(localize(pickLanguage(this.hass), "panel.removed_zone"));
    }
  }

  private _onZoneCancel(): void {
    this._editingZone = undefined;
    this._editingZoneId = undefined;
  }

  /**
   * The 3 settings-view save events (spec §1.3, wired in this task): each
   * event's detail keys ARE the matching hub service's attr names 1:1
   * (verified against `services.yaml`), so every handler spreads the detail
   * straight into the service call — no field renaming needed here, unlike
   * e.g. `_onCurveSave` above.
   */
  private async _onSaveWeather(ev: CustomEvent<WeatherSaveDetail>): Promise<void> {
    const result = await this._call("irrigation_maestro", "set_weather_sources", {
      ...ev.detail,
    });
    if (result !== undefined) {
      this._showNotice(localize(pickLanguage(this.hass), "panel.saved_settings"));
    }
  }

  private async _onSaveBudget(ev: CustomEvent<BudgetSaveDetail>): Promise<void> {
    const result = await this._call("irrigation_maestro", "set_consumption_budget", {
      ...ev.detail,
    });
    if (result !== undefined) {
      this._showNotice(localize(pickLanguage(this.hass), "panel.saved_settings"));
    }
  }

  private async _onSaveRestrictions(ev: CustomEvent<RestrictionsSaveDetail>): Promise<void> {
    const result = await this._call("irrigation_maestro", "set_restrictions", { ...ev.detail });
    if (result !== undefined) {
      this._showNotice(localize(pickLanguage(this.hass), "panel.saved_settings"));
    }
  }

  private _onSettingsBack(): void {
    this._view = "zones";
  }

  /** Shared path for the settings services: skip empty patches, toast on success. */
  private async _saveSettings(service: string, data: Record<string, unknown>): Promise<void> {
    if (Object.keys(data).length === 0) return;
    const res = await this._call("irrigation_maestro", service, data);
    if (res !== undefined) {
      this._showNotice(localize(pickLanguage(this.hass), "panel.saved_settings"));
    }
  }

  private _onSaveSchedule(ev: CustomEvent<ProgramScheduleSaveDetail>): void {
    const d = ev.detail;
    // Exactly the fields of the chosen mode travel: the service rebuilds the
    // calendar from them and writes it whole, so switching mode can never
    // leave residue from the previous one.
    void this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: d.zoneId,
      program_id: d.programId,
      ...calendarFields(d.calendar),
      ...(d.seasonMonths ? { season_months: d.seasonMonths } : {}),
      start_kind: d.start.kind,
      ...(d.start.kind === "time"
        ? { start_time: d.start.at }
        : { start_event: d.start.event, start_offset_min: d.start.offset_min ?? 0 }),
    });
  }

  private _onSaveMinutes(ev: CustomEvent<ProgramMinutesSaveDetail>): void {
    const d = ev.detail;
    void this._call(
      "irrigation_maestro",
      "set_program_minutes",
      d.dayMinutes
        ? { zone_id: d.zoneId, program_id: d.programId, day_minutes: d.dayMinutes }
        : { zone_id: d.zoneId, program_id: d.programId, minutes: d.minutes },
    );
  }

  /**
   * `imc-curve-save`, re-dispatched by `program-editor.ts` with `zoneId`
   * attached (the embedded `imc-curve-editor`'s own event has no zoneId —
   * see the doc comment on `ProgramCurveSaveDetail`). The curve services use
   * DIFFERENT field names than the schedule/minutes services above:
   * `cycle_id` (not `program_id`) and `min_value`/`max_value` (not
   * `min`/`max`) — mirrors the dashboard card's handler at `card.ts:213-231`.
   */
  private _onCurveSave(ev: CustomEvent<ProgramCurveSaveDetail>): void {
    const { zoneId, curve } = ev.detail;
    if (curve.mode === "simple") {
      void this._call("irrigation_maestro", "set_simple_curve", {
        zone_id: zoneId,
        cycle_id: curve.cycleId,
        amount: curve.amount,
        heat: curve.heat,
        min_value: curve.min,
        max_value: curve.max,
      });
    } else {
      void this._call("irrigation_maestro", "set_curve", {
        zone_id: zoneId,
        cycle_id: curve.cycleId,
        points: curve.points,
        min_value: curve.min,
        max_value: curve.max,
      });
    }
  }

  /**
   * Add-program wizard finish: chain `add_program` → `set_program_schedule`
   * → `set_program_minutes` for the freshly created program. `add_program`
   * is a response service — its id comes back **nested** under
   * `res.response["program_id"]` (the frontend `callService(...,
   * returnResponse=true)` resolves to `{ context, response }`), never
   * `res.program_id`. If the response is missing the id, `_call` has
   * already surfaced `_error` on a hard failure; either way we abort the
   * chain rather than write a schedule/minutes against an unknown program.
   */
  private async _onWizardFinish(ev: CustomEvent<WizardFinishDetail>): Promise<void> {
    const d = ev.detail;
    const res = await this._call(
      "irrigation_maestro",
      "add_program",
      { zone_id: d.zoneId, ...(d.name ? { name: d.name } : {}) },
      /* returnResponse */ true,
    );
    const programId = res?.response?.["program_id"];
    if (typeof programId !== "string" || !programId) return;

    await this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: d.zoneId,
      program_id: programId,
      ...calendarFields(d.calendar),
      start_kind: d.start.kind,
      ...(d.start.kind === "time"
        ? { start_time: d.start.at }
        : { start_event: d.start.event, start_offset_min: d.start.offset_min ?? 0 }),
    });
    await this._call("irrigation_maestro", "set_program_minutes", {
      zone_id: d.zoneId,
      program_id: programId,
      minutes: d.minutes,
    });
  }

  private _onProgramToggle(ev: CustomEvent<ProgramToggleDetail>): void {
    const d = ev.detail;
    void this._call("switch", d.enabled ? "turn_on" : "turn_off", {
      entity_id: d.entityId,
    });
  }

  private _onProgramRename(ev: CustomEvent<ProgramRenameDetail>): void {
    const d = ev.detail;
    void this._call("irrigation_maestro", "rename_program", {
      zone_id: d.zoneId,
      program_id: d.programId,
      name: d.name,
    });
  }

  private _onProgramRemove(ev: CustomEvent<ProgramRemoveDetail>): void {
    const d = ev.detail;
    void this._call("irrigation_maestro", "remove_program", {
      zone_id: d.zoneId,
      program_id: d.programId,
    });
  }

  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* (same change-detection approach as card.ts).                  */
  /* ------------------------------------------------------------ */

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.size === 1 && changed.has("hass")) {
      const previous = changed.get("hass") as HomeAssistant | undefined;
      const current = this.hass;
      if (!previous || !current) return true;
      const count = Object.keys(current.states).length;
      if (count !== this._statesCount) return true;
      return this._relevantIds.some(
        (id) => previous.states[id] !== current.states[id],
      );
    }
    return true;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      --imc-accent: #3a6df0;
    }
    .wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 16px;
      box-sizing: border-box;
    }
    .wrap.narrow {
      padding: 10px;
    }
    header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }
    header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    .settings-btn {
      margin-left: auto;
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .settings-btn:hover {
      opacity: 0.8;
    }
    .meteo {
      font-size: 12.5px;
      color: var(--secondary-text-color);
      margin: 0 0 14px;
    }
    .tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .wrap.narrow .tabs {
      gap: 4px;
    }
    .tab {
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .tab.sel {
      background: var(--imc-accent);
      color: #fff;
    }
    .tab.add {
      background: transparent;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      color: var(--imc-accent, #3a6df0);
      font-weight: 600;
    }
    .zone-toolbar {
      display: flex;
      justify-content: flex-end;
      margin: -6px 0 8px;
    }
    .edit-zone-link {
      font-size: 12px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .edit-zone-link:hover {
      opacity: 0.8;
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 24px 0;
    }
    .error {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      overflow-wrap: anywhere;
    }
    .notice {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--success-color, #1f9d55);
      color: var(--text-primary-color, #fff);
      overflow-wrap: anywhere;
    }
  `;

  /** Error + success toasts, rendered together at the same spot in every
   *  render branch below — see `_showError`/`_showNotice`. */
  private _renderToasts(): TemplateResult {
    return html`
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${this._notice ? html`<div class="notice">${this._notice}</div>` : nothing}
    `;
  }

  override render(): TemplateResult {
    const hass = this.hass;
    if (!hass) return html``;
    const lang = pickLanguage(hass);
    const model: MaestroModel = discover(hass);
    this._relevantIds = model.entityIds;
    this._statesCount = Object.keys(hass.states).length;

    // Checked BEFORE the empty-zones early-return below: the create form
    // must be reachable even with zero zones (that's exactly how a fresh
    // install — hub configured, no zones yet — creates its first one, via
    // the ＋ button in the empty state). If this check lived after that
    // early-return, opening the create form from a zero-zone state would be
    // impossible — the early-return would fire first every time and the
    // editing state would never get rendered.
    if (this._editingZone !== undefined) {
      return html`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-zone-save=${this._onZoneSave}
          @imc-zone-remove=${this._onZoneRemove}
          @imc-zone-cancel=${this._onZoneCancel}
        >
          <header><h1>${localize(lang, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-zone-editor
            .hass=${hass}
            .zone=${this._editingZone ?? undefined}
            .zoneId=${this._editingZoneId}
          ></imc-zone-editor>
        </div>
      `;
    }

    // The settings view (spec §1.3) replaces the whole zones view — it's
    // opened via the header's ⚙️ button (`_onOpenSettings`) and owns its own
    // "‹ back" control internally, dispatching `imc-settings-back` (wired
    // below) to return here. Checked AFTER the zone-editor branch above
    // (that one takes precedence — you can't be mid zone-edit and in
    // settings at once) but BEFORE the empty-zones check below, since
    // settings must be reachable regardless of zone count.
    if (this._view === "settings") {
      return html`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-settings-save-weather=${this._onSaveWeather}
          @imc-settings-save-budget=${this._onSaveBudget}
          @imc-settings-save-restrictions=${this._onSaveRestrictions}
          @imc-settings-save-session-limits=${(e: CustomEvent<Record<string, unknown>>) =>
          this._saveSettings("set_session_limits", e.detail)}
        @imc-settings-save-valve-safety=${(e: CustomEvent<Record<string, unknown>>) =>
          this._saveSettings("set_valve_safety", e.detail)}
        @imc-settings-save-concurrency=${(e: CustomEvent<Record<string, unknown>>) =>
          this._saveSettings("set_concurrency", e.detail)}
        @imc-settings-save-notifications=${(e: CustomEvent<NotificationSaveDetail>) =>
          this._saveSettings("set_notifications", { ...e.detail })}
        @imc-settings-back=${this._onSettingsBack}
        >
          <header><h1>${localize(lang, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-settings-view .hass=${hass} .options=${this._options ?? {}}></imc-settings-view>
        </div>
      `;
    }

    if (!model.found || model.zones.length === 0) {
      return html`
        <div class="wrap">
          <header>
            <h1>${localize(lang, "panel.title")}</h1>
            <span class="settings-btn" @click=${this._onOpenSettings}>
              ⚙️ ${localize(lang, "settings.title")}
            </span>
          </header>
          ${this._renderToasts()}
          <div class="empty">${localize(lang, "panel.no_zones")}</div>
          <div class="tabs">
            <div
              class="tab add"
              @click=${() => {
                this._editingZone = null;
                this._editingZoneId = undefined;
              }}
            >
              ＋ ${localize(lang, "zone.add")}
            </div>
          </div>
        </div>
      `;
    }

    const selected = this._resolveSelected(model.zones);
    const weightedTemp = !isUnavailable(model.hub.weightedTemp)
      ? asNumber(model.hub.weightedTemp?.state)
      : undefined;
    return html`
      <div
        class="wrap ${this.narrow ? "narrow" : ""}"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-curve-save=${this._onCurveSave}
        @imc-program-cancel=${() => undefined}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
        @imc-wizard-finish=${this._onWizardFinish}
        @imc-wizard-cancel=${() => undefined}
      >
        <header>
          <h1>${localize(lang, "panel.title")}</h1>
          <span class="settings-btn" @click=${this._onOpenSettings}>
            ⚙️ ${localize(lang, "settings.title")}
          </span>
        </header>
        ${this._renderWeatherContext(model, lang, weightedTemp)}
        ${this._renderToasts()}
        <div class="tabs">
          ${model.zones.map(
            (z) => html`
              <div
                class="tab ${z.zoneId === selected.zoneId ? "sel" : ""}"
                @click=${() => (this._selectedZoneId = z.zoneId)}
              >
                ${z.name}
              </div>
            `,
          )}
          <div
            class="tab add"
            @click=${() => {
              this._editingZone = null;
              this._editingZoneId = undefined;
            }}
          >
            ＋ ${localize(lang, "zone.add")}
          </div>
        </div>
        <div class="zone-toolbar">
          <span class="edit-zone-link" @click=${() => this._onEditZone(selected.zoneId)}>
            ✎ ${localize(lang, "zone.edit")}
          </span>
        </div>
        <imc-program-list
          .hass=${hass}
          .zone=${selected}
          .weightedTemp=${weightedTemp}
        ></imc-program-list>
      </div>
    `;
  }

  private _resolveSelected(zones: ZoneBundle[]): ZoneBundle {
    return zones.find((z) => z.zoneId === this._selectedZoneId) ?? zones[0]!;
  }

  /**
   * Header weather line — "meteo: 32° · budget acqua OK" (spec §1.1: "Header
   * shows live context: current weighted temperature and water-budget
   * status"). Degrades gracefully: no weighted-temp reading (sensor
   * missing/unavailable) hides the whole line; a temperature without a
   * clean budget/threshold pair (either sensor missing/unavailable) shows
   * just the temperature. The sufficiency check mirrors card.ts's
   * `_renderHeader` budget meter (`budget >= threshold`).
   */
  private _renderWeatherContext(
    model: MaestroModel,
    lang: string,
    weightedTemp: number | undefined,
  ): TemplateResult | typeof nothing {
    if (weightedTemp === undefined) return nothing;
    const budget = !isUnavailable(model.hub.waterBudget)
      ? asNumber(model.hub.waterBudget?.state)
      : undefined;
    const threshold = !isUnavailable(model.hub.skipThreshold)
      ? asNumber(model.hub.skipThreshold?.state)
      : undefined;
    const budgetKey =
      budget !== undefined && threshold !== undefined
        ? budget >= threshold
          ? "panel.budget_ok"
          : "panel.budget_low"
        : undefined;
    return html`
      <div class="meteo">
        ${localize(lang, "panel.weather_temp", { temp: formatNumber(weightedTemp, 1) ?? "" })}
        ${budgetKey ? html` · ${localize(lang, budgetKey)}` : nothing}
      </div>
    `;
  }
}

defineElement("irrigation-maestro-panel", IrrigationMaestroPanel);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-panel": IrrigationMaestroPanel;
  }
}
