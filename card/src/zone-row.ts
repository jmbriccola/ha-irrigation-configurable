import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { ZoneBundle } from "./discovery";
import type { CycleInfo, ZoneAction, ZoneState } from "./types";
import {
  asArray,
  asNumber,
  asString,
  defineElement,
  isUnavailable,
} from "./types";
import {
  computeRunProgress,
  describeTrigger,
  formatDate,
  formatDateTime,
  formatRelative,
} from "./format";
import { localize, localizeDynamic } from "./localize/localize";
import "./curve-sparkline";
import "./curve-editor";
import type { CurveSavePayload } from "./curve-editor";

const STATE_ICONS: Record<ZoneState, string> = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline",
};

const PAUSE_HOURS = [1, 4, 8, 24] as const;

function isZoneState(value: string): value is ZoneState {
  return value in STATE_ICONS;
}

/**
 * One zone: name, state, live progress, next run, last outcome,
 * badges, per-zone controls and an expandable cycle/curve detail area.
 */
export class ImcZoneRow extends LitElement {
  @property({ attribute: false }) zone?: ZoneBundle;
  @property() language = "en";
  @property({ attribute: false }) now: number = Date.now();
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean }) showControls = true;
  @property({ attribute: false }) weightedTemp?: number;

  @state() private _expanded = false;
  @state() private _editingCycle?: string;

  static override styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    .zone {
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
      padding: 10px 16px;
    }
    :host([compact]) .zone {
      padding: 6px 16px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .row:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .state-icon {
      flex: none;
      color: var(--secondary-text-color, #727272);
      --mdc-icon-size: 22px;
    }
    .state-icon.watering,
    .state-icon.queued,
    .state-icon.soaking {
      color: var(--primary-color, #03a9f4);
    }
    .state-icon.paused,
    .state-icon.suspended {
      color: var(--warning-color, #ffa600);
    }
    .state-icon.disabled {
      color: var(--disabled-text-color, #9e9e9e);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .name-line {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zone.disabled .name {
      color: var(--disabled-text-color, #9e9e9e);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 10px;
      white-space: nowrap;
      border: 1px solid var(--warning-color, #ffa600);
      color: var(--warning-color, #ffa600);
    }
    .state-chip {
      flex: none;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--secondary-text-color, #727272);
    }
    .state-chip.watering,
    .state-chip.soaking,
    .state-chip.queued {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .state-chip.paused,
    .state-chip.suspended {
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .caret {
      flex: none;
      color: var(--secondary-text-color, #727272);
      --mdc-icon-size: 20px;
    }
    .meta {
      margin-top: 4px;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta .abs {
      opacity: 0.8;
    }
    .progress-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .progress {
      position: relative;
      flex: 1;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.15)
      );
    }
    .progress .bar {
      height: 100%;
      border-radius: 3px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.9s linear;
    }
    .progress.soaking .bar {
      opacity: 0.45;
    }
    .progress .seg {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--card-background-color, #fff);
    }
    .remaining {
      flex: none;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }
    button,
    select,
    input[type="date"] {
      font: inherit;
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: transparent;
      border: 1px solid
        var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }
    button:hover,
    select:hover,
    input[type="date"]:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    input[type="date"] {
      color-scheme: light dark;
      max-width: 130px;
    }
    select {
      appearance: auto;
    }
    .details {
      margin-top: 10px;
      border-top: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.2));
      padding-top: 8px;
    }
    .details-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 6px;
    }
    .cycle {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .cycle-info {
      flex: 1;
      min-width: 0;
    }
    .cycle-name {
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cycle-name .off {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 8px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--secondary-text-color, #727272);
    }
    .cycle-sub {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      margin-top: 1px;
    }
    .no-cycles {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .link-btn {
      flex: none;
      border: none;
      background: transparent;
      padding: 2px 4px;
      font-size: 11px;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      text-decoration: underline;
    }
    .link-btn:hover {
      border-color: transparent;
      opacity: 0.8;
    }
  `;

  private get _zoneState(): ZoneState | undefined {
    const raw = this.zone?.state?.state;
    return raw && isZoneState(raw) ? raw : undefined;
  }

  private _dispatch(detail: ZoneAction): void {
    this.dispatchEvent(
      new CustomEvent<ZoneAction>("imc-zone-action", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleExpanded(): void {
    this._expanded = !this._expanded;
  }

  private _onHeaderKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._toggleExpanded();
    }
  }

  private _onPauseSelect(ev: Event): void {
    const select = ev.currentTarget as HTMLSelectElement;
    const hours = Number(select.value);
    select.value = "";
    const zoneId = this.zone?.zoneId;
    if (zoneId && Number.isFinite(hours) && hours > 0) {
      this._dispatch({ action: "pause", zoneId, hours });
    }
  }

  private _onSuspendDate(ev: Event): void {
    const input = ev.currentTarget as HTMLInputElement;
    const date = input.value;
    input.value = "";
    const zoneId = this.zone?.zoneId;
    if (zoneId && date) {
      this._dispatch({ action: "suspend", zoneId, until: `${date}T00:00:00` });
    }
  }

  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */

  private _renderBadges(): unknown {
    const zone = this.zone;
    if (!zone) return nothing;
    const attrs = zone.state?.attributes ?? {};

    const badges: TemplateResult[] = [];

    const suspendedUntil =
      asString(attrs["suspended_until"]) ??
      (!isUnavailable(zone.suspendUntil) ? zone.suspendUntil?.state : undefined);
    if (this._zoneState === "suspended" && suspendedUntil) {
      const date = formatDate(suspendedUntil, this.language) ?? suspendedUntil;
      badges.push(html`
        <span class="badge" title=${localize(this.language, "zone.suspended_until", { date })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${date}
        </span>
      `);
    }

    for (const item of asArray(attrs["degraded"])) {
      const key = asString(item);
      if (!key) continue;
      const label = localizeDynamic(this.language, "degraded", key);
      badges.push(html`
        <span class="badge" title=${label}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? nothing : label}
        </span>
      `);
    }
    return badges;
  }

  private _renderProgress(): unknown {
    const zone = this.zone;
    const zoneState = this._zoneState;
    if (!zone || (zoneState !== "watering" && zoneState !== "soaking")) {
      return nothing;
    }
    const progress = computeRunProgress(
      zone.state?.attributes ?? {},
      this.now,
    );
    if (!progress) return nothing;
    return html`
      <div class="progress-line">
        <div class="progress ${zoneState === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(progress.fraction * 100).toFixed(2)}%"></div>
          ${progress.segmentBounds.map(
            (b) => html`<div class="seg" style="left:${(b * 100).toFixed(2)}%"></div>`,
          )}
        </div>
        <span class="remaining">
          ${localize(this.language, "zone.remaining", {
            minutes: progress.remainingMin,
          })}
        </span>
      </div>
    `;
  }

  private _renderMeta(): unknown {
    const zone = this.zone;
    if (!zone) return nothing;
    const lang = this.language;
    const lines: TemplateResult[] = [];

    // Next scheduled run: relative + absolute (+ cycle name).
    const nextRun = zone.nextRun;
    if (nextRun && !isUnavailable(nextRun)) {
      const relative = formatRelative(nextRun.state, lang, this.now);
      const absolute = formatDateTime(nextRun.state, lang);
      const cycleName = asString(nextRun.attributes["cycle_name"]);
      if (relative || absolute) {
        lines.push(html`
          <span>
            ${localize(lang, "zone.next_run")}: ${relative ?? ""}
            ${absolute
              ? html`<span class="abs">
                  · ${absolute}${cycleName ? ` (${cycleName})` : ""}
                </span>`
              : nothing}
          </span>
        `);
      }
    } else {
      lines.push(html`<span>${localize(lang, "zone.no_next_run")}</span>`);
    }

    // Last outcome with localized reason.
    const outcome = zone.lastOutcome;
    if (outcome && !isUnavailable(outcome) && outcome.state !== "none") {
      const outcomeLabel = localizeDynamic(lang, "outcome", outcome.state);
      const reasonKey = asString(outcome.attributes["reason_key"]);
      const reason = reasonKey
        ? localizeDynamic(lang, "reason", reasonKey)
        : undefined;
      const finishedAt = asString(outcome.attributes["finished_at"]);
      const when = formatRelative(finishedAt, lang, this.now);
      lines.push(html`
        <span>
          ${localize(lang, "zone.last_outcome")}: ${outcomeLabel}${reason
            ? ` — ${reason}`
            : ""}${when ? html`<span class="abs"> · ${when}</span>` : nothing}
        </span>
      `);
    }

    return html`<div class="meta">${lines}</div>`;
  }

  private _renderControls(): unknown {
    const zone = this.zone;
    if (!zone || !this.showControls) return nothing;
    const lang = this.language;
    const zoneId = zone.zoneId;
    const zoneState = this._zoneState;
    const enabledSwitch = zone.enabledSwitch;
    const enabled = enabledSwitch?.state === "on";
    const canResume = zoneState === "paused" || zoneState === "suspended";

    return html`
      <div class="controls" @click=${(ev: Event) => ev.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId })}>
          ${localize(lang, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId })}>
          ${localize(lang, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${localize(lang, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${localize(lang, "controls.pause_for")}
          </option>
          ${PAUSE_HOURS.map(
            (h) => html`<option value=${h}>
              ${localize(lang, "controls.hours", { hours: h })}
            </option>`,
          )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${localize(lang, "controls.suspend_until")}
          title=${localize(lang, "controls.suspend_until")}
        />
        ${canResume
          ? html`<button
              @click=${() => this._dispatch({ action: "resume", zoneId })}
            >
              ${localize(lang, "controls.resume")}
            </button>`
          : nothing}
        ${enabledSwitch
          ? html`<button
              @click=${() =>
                this._dispatch({
                  action: "set-enabled",
                  zoneId,
                  enabled: !enabled,
                })}
            >
              ${localize(lang, enabled ? "controls.disable" : "controls.enable")}
            </button>`
          : nothing}
      </div>
    `;
  }

  private _renderCycles(): unknown {
    const zone = this.zone;
    if (!zone) return nothing;
    const lang = this.language;
    const cycles = asArray(zone.state?.attributes["cycles"]).filter(
      (c): c is CycleInfo => !!c && typeof c === "object",
    );
    if (cycles.length === 0) {
      return html`<div class="details">
        <div class="no-cycles">${localize(lang, "zone.no_cycles")}</div>
      </div>`;
    }
    return html`
      <div class="details">
        <div class="details-title">${localize(lang, "zone.cycles")}</div>
        ${cycles.map((cycle) => this._renderCycle(cycle))}
      </div>
    `;
  }

  private _renderCycle(cycle: CycleInfo): unknown {
    const lang = this.language;
    const zone = this.zone;
    const cycleId = asString(cycle.cycle_id);
    // Prefer the live cycle_enabled switch when present.
    const cycleSwitch = zone?.cycleSwitches.find(
      (sw) => asString(sw.attributes["cycle_id"]) === cycleId,
    );
    const enabled = cycleSwitch
      ? cycleSwitch.state === "on"
      : cycle.enabled !== false;

    const trigger = describeTrigger(cycle.trigger, lang);
    const curve = cycle.curve;
    const clampMin = asNumber(curve?.min);
    const clampMax = asNumber(curve?.max);
    const unit = localize(
      lang,
      curve?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration",
    );
    const clampParts: string[] = [];
    if (clampMin !== undefined) {
      clampParts.push(
        `${localize(lang, "curve.clamp_min")} ${clampMin} ${unit}`,
      );
    }
    if (clampMax !== undefined) {
      clampParts.push(
        `${localize(lang, "curve.clamp_max")} ${clampMax} ${unit}`,
      );
    }

    const isVolume = curve?.kind === "volume";
    const editing = !!cycleId && this._editingCycle === cycleId;
    const editButton =
      isVolume || !cycleId
        ? nothing
        : html`<button
            class="link-btn"
            @click=${() =>
              (this._editingCycle = editing ? undefined : cycleId)}
          >
            ${localize(lang, "editor.edit_curve")}
          </button>`;
    const editor = editing
      ? html`<imc-curve-editor
          .language=${lang}
          .cycle=${cycle}
          .weightedTemp=${this.weightedTemp}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => (this._editingCycle = undefined)}
        ></imc-curve-editor>`
      : nothing;

    return html`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${asString(cycle.name) ?? cycleId ?? "?"}
            ${enabled
              ? nothing
              : html`<span class="off">
                  ${localize(lang, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${trigger}${trigger && clampParts.length > 0 ? " · " : ""}${clampParts.join(" · ")}
          </div>
        </div>
        ${curve
          ? html`<imc-curve-sparkline .curve=${curve}></imc-curve-sparkline>`
          : nothing}
        ${editButton}
      </div>
      ${editor}
    `;
  }

  private _onCurveSave(ev: CustomEvent<CurveSavePayload>): void {
    const zoneId = this.zone?.zoneId;
    if (!zoneId) return;
    const d = ev.detail;
    if (d.mode === "simple") {
      this._dispatch({
        action: "save-simple-curve",
        zoneId,
        cycleId: d.cycleId,
        amount: d.amount,
        heat: d.heat,
        min: d.min,
        max: d.max,
      });
    } else {
      this._dispatch({
        action: "save-curve",
        zoneId,
        cycleId: d.cycleId,
        points: d.points,
        min: d.min,
        max: d.max,
      });
    }
    this._editingCycle = undefined;
  }

  protected override render(): unknown {
    const zone = this.zone;
    if (!zone) return nothing;
    const lang = this.language;
    const zoneState = this._zoneState;
    const stateLabel = zoneState
      ? localizeDynamic(lang, "zone_state", zoneState)
      : localize(lang, "card.unavailable");
    const icon = zoneState ? STATE_ICONS[zoneState] : "mdi:help-circle-outline";
    const stateClass = zoneState ?? "unknown";
    const showBody = !this.compact || this._expanded;

    return html`
      <div class="zone ${stateClass}">
        <div
          class="row"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._toggleExpanded}
          @keydown=${this._onHeaderKeydown}
        >
          <ha-icon class="state-icon ${stateClass}" icon=${icon}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${zone.name}</span>
              ${this._renderBadges()}
            </div>
          </div>
          <span class="state-chip ${stateClass}">${stateLabel}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${showBody ? this._renderMeta() : nothing}
        ${showBody ? this._renderControls() : nothing}
        ${this._expanded ? this._renderCycles() : nothing}
      </div>
    `;
  }
}

defineElement("imc-zone-row", ImcZoneRow);

declare global {
  interface HTMLElementTagNameMap {
    "imc-zone-row": ImcZoneRow;
  }
}
