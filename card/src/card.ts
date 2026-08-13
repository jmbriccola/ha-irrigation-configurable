import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { MaestroModel } from "./discovery";
import { discover } from "./discovery";
import type {
  CardConfig,
  GlobalAction,
  HomeAssistant,
  QueueItem,
  SessionState,
  ZoneAction,
} from "./types";
import {
  asArray,
  asNumber,
  asString,
  clamp,
  CONFIG_DEFAULTS,
  defineElement,
  isUnavailable,
} from "./types";
import { formatNumber } from "./format";
import {
  localize,
  localizeDynamic,
  localizeQueueState,
  pickLanguage,
} from "./localize/localize";
import "./zone-row";
import "./global-controls";

const SESSION_STATES: readonly SessionState[] = [
  "idle",
  "evaluating",
  "running",
];

function isSessionState(value: string | undefined): value is SessionState {
  return !!value && (SESSION_STATES as readonly string[]).includes(value);
}

/**
 * The Irrigation Maestro Lovelace card.
 */
export class IrrigationMaestroCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: CardConfig;
  @state() private _now: number = Date.now();
  @state() private _error?: string;

  private _model?: MaestroModel;
  private _relevantIds: string[] = [];
  private _statesCount = 0;
  private _timer?: number;
  private _timerPeriod = 0;
  private _errorTimer?: number;

  /* ------------------------------------------------------------ */
  /* Custom-card API                                               */
  /* ------------------------------------------------------------ */

  public static getConfigElement(): HTMLElement {
    return document.createElement("irrigation-maestro-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    this._config = { ...CONFIG_DEFAULTS, ...config };
  }

  public getCardSize(): number {
    const zones = this._model?.zones.length ?? 2;
    const header = this._config?.show_header !== false ? 2 : 0;
    return Math.max(2, header + zones);
  }

  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* ------------------------------------------------------------ */

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.size === 1 && changed.has("hass")) {
      const previous = changed.get("hass") as HomeAssistant | undefined;
      const current = this.hass;
      if (!previous || !current) return true;
      // A new/removed entity may carry a maestro_role: rescan then.
      const count = Object.keys(current.states).length;
      if (count !== this._statesCount) return true;
      return this._relevantIds.some(
        (id) => previous.states[id] !== current.states[id],
      );
    }
    return true;
  }

  /* ------------------------------------------------------------ */
  /* Refresh timer (1 s while watering, 30 s otherwise)            */
  /* ------------------------------------------------------------ */

  public override connectedCallback(): void {
    super.connectedCallback();
    this._ensureTimer(this._timerPeriod === 1000);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer !== undefined) {
      window.clearInterval(this._timer);
      this._timer = undefined;
      this._timerPeriod = 0;
    }
    if (this._errorTimer !== undefined) {
      window.clearTimeout(this._errorTimer);
      this._errorTimer = undefined;
    }
  }

  private _ensureTimer(fast: boolean): void {
    const period = fast ? 1000 : 30000;
    if (this._timer !== undefined && this._timerPeriod === period) return;
    if (this._timer !== undefined) window.clearInterval(this._timer);
    this._timerPeriod = period;
    this._timer = window.setInterval(() => {
      this._now = Date.now();
    }, period);
  }

  protected override updated(): void {
    const watering = this._model?.zones.some(
      (z) => z.state?.state === "watering" || z.state?.state === "soaking",
    );
    if (this.isConnected) this._ensureTimer(!!watering);
  }

  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */

  private async _call(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    try {
      await hass.callService(domain, service, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._error = message;
      if (this._errorTimer !== undefined) {
        window.clearTimeout(this._errorTimer);
      }
      this._errorTimer = window.setTimeout(() => {
        this._error = undefined;
        this._errorTimer = undefined;
      }, 6000);
    }
  }

  private _onZoneAction(ev: CustomEvent<ZoneAction>): void {
    const detail = ev.detail;
    switch (detail.action) {
      case "run":
        void this._call("irrigation_maestro", "run_zone", {
          zone_id: detail.zoneId,
        });
        break;
      case "skip":
        void this._call("irrigation_maestro", "skip_today", {
          zone_id: detail.zoneId,
        });
        break;
      case "pause":
        void this._call("irrigation_maestro", "pause", {
          hours: detail.hours,
          zone_id: detail.zoneId,
        });
        break;
      case "suspend":
        void this._call("irrigation_maestro", "suspend_until", {
          until: detail.until,
          zone_id: detail.zoneId,
        });
        break;
      case "resume":
        void this._call("irrigation_maestro", "resume", {
          zone_id: detail.zoneId,
        });
        break;
      case "set-enabled": {
        const zone = this._model?.zones.find(
          (z) => z.zoneId === detail.zoneId,
        );
        const entityId = zone?.enabledSwitch?.entity_id;
        if (entityId) {
          void this._call(
            "switch",
            detail.enabled ? "turn_on" : "turn_off",
            { entity_id: entityId },
          );
        }
        break;
      }
      case "save-curve":
        void this._call("irrigation_maestro", "set_curve", {
          zone_id: detail.zoneId,
          cycle_id: detail.cycleId,
          points: detail.points,
          min_value: detail.min,
          max_value: detail.max,
          kind: detail.kind,
        });
        break;
    }
  }

  private _onGlobalAction(ev: CustomEvent<GlobalAction>): void {
    const detail = ev.detail;
    switch (detail.action) {
      case "run_all":
        void this._call("irrigation_maestro", "run_all");
        break;
      case "stop_all":
        void this._call("irrigation_maestro", "stop_all");
        break;
      case "evaluate":
        void this._call("irrigation_maestro", "evaluate");
        break;
      case "set-pause": {
        const entityId = this._model?.hub.pauseSwitch?.entity_id;
        if (entityId) {
          void this._call(
            "switch",
            detail.paused ? "turn_on" : "turn_off",
            { entity_id: entityId },
          );
        }
        break;
      }
    }
  }

  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */

  private _renderHeader(model: MaestroModel, lang: string): unknown {
    const hub = model.hub;

    // Water budget vs skip threshold meter.
    const budget = !isUnavailable(hub.waterBudget)
      ? asNumber(hub.waterBudget?.state)
      : undefined;
    const threshold = !isUnavailable(hub.skipThreshold)
      ? asNumber(hub.skipThreshold?.state)
      : undefined;
    let meter: unknown = nothing;
    if (budget !== undefined || threshold !== undefined) {
      const scale = Math.max(budget ?? 0, threshold ?? 0, 0.001);
      const fill = clamp((budget ?? 0) / scale, 0, 1);
      const mark =
        threshold !== undefined ? clamp(threshold / scale, 0, 1) : undefined;
      const sufficient =
        budget !== undefined &&
        threshold !== undefined &&
        budget >= threshold;
      meter = html`
        <div
          class="budget"
          title=${`${localize(lang, "header.water_budget")} / ${localize(lang, "header.skip_threshold")}`}
        >
          <span class="budget-label">${localize(lang, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${sufficient ? "sufficient" : ""}"
              style="width:${(fill * 100).toFixed(1)}%"
            ></div>
            ${mark !== undefined
              ? html`<div
                  class="meter-mark"
                  style="left:${(mark * 100).toFixed(1)}%"
                ></div>`
              : nothing}
          </div>
          <span class="budget-numbers">
            ${formatNumber(budget, 2) ?? "—"} /
            ${formatNumber(threshold, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }

    // Weighted temperature + stale-weather badge.
    const tempEntity = hub.weightedTemp;
    const temp = !isUnavailable(tempEntity)
      ? asNumber(tempEntity?.state)
      : undefined;
    const stale = tempEntity?.attributes["stale_weather"] === true;

    // Session state.
    const sessionRaw = hub.session?.state;
    const sessionState = isSessionState(sessionRaw) ? sessionRaw : undefined;

    // Global pause.
    const paused = hub.pauseSwitch?.state === "on";

    // Consumption budget (optional entity).
    const consumption = !isUnavailable(hub.consumptionLeft)
      ? asNumber(hub.consumptionLeft?.state)
      : undefined;

    return html`
      <div class="header">
        ${meter}
        <div class="chips">
          ${temp !== undefined
            ? html`<span
                class="chip"
                title=${localize(lang, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${formatNumber(temp, 1)} °C
              </span>`
            : nothing}
          ${stale
            ? html`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${localize(lang, "header.stale_weather")}
              </span>`
            : nothing}
          ${sessionState
            ? html`<span
                class="chip ${sessionState !== "idle" ? "accent" : ""}"
                title=${localize(lang, "header.session")}
              >
                <ha-icon
                  icon=${sessionState === "running"
                    ? "mdi:play-circle-outline"
                    : sessionState === "evaluating"
                      ? "mdi:magnify"
                      : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${localizeDynamic(lang, "session", sessionState)}
              </span>`
            : nothing}
          ${paused
            ? html`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${localize(lang, "header.global_pause")}
              </span>`
            : nothing}
          ${consumption !== undefined
            ? html`<span
                class="chip"
                title=${localize(lang, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${formatNumber(consumption, 0)} L
              </span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderQueue(model: MaestroModel, lang: string): unknown {
    const session = model.hub.session;
    if (session?.state !== "running") return nothing;
    const queue = asArray(session.attributes["queue"]).filter(
      (item): item is QueueItem => !!item && typeof item === "object",
    );
    if (queue.length === 0) return nothing;
    const activeZoneId = asString(session.attributes["active_zone_id"]);

    return html`
      <div class="queue">
        <div class="queue-title">${localize(lang, "queue.title")}</div>
        ${queue.map((item, index) => {
          const itemState = asString(item.state);
          const active =
            (activeZoneId !== undefined && item.zone_id === activeZoneId) ||
            itemState === "watering" ||
            itemState === "running";
          const duration = asNumber(item.duration_min);
          return html`
            <div class="queue-item ${active ? "active" : ""}">
              <span class="queue-index">${index + 1}.</span>
              <span class="queue-name">
                ${asString(item.zone_name) ?? asString(item.zone_id) ?? "?"}
              </span>
              ${duration !== undefined
                ? html`<span class="queue-duration">
                    ${localize(lang, "queue.duration", { minutes: duration })}
                  </span>`
                : nothing}
              ${itemState
                ? html`<span class="queue-state">
                    ${localizeQueueState(lang, itemState)}
                  </span>`
                : nothing}
            </div>
          `;
        })}
      </div>
    `;
  }

  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const lang = pickLanguage(hass);
    const model = discover(hass);
    this._model = model;
    this._relevantIds = model.entityIds;
    this._statesCount = Object.keys(hass.states).length;

    const title = config.title
      ? html`<h1 class="card-title">${config.title}</h1>`
      : nothing;

    if (!model.found) {
      return html`
        <ha-card>
          ${title}
          <div class="message">${localize(lang, "card.not_installed")}</div>
        </ha-card>
      `;
    }

    const filter = config.zones;
    const zones =
      filter && filter.length > 0
        ? model.zones.filter((z) => filter.includes(z.zoneId))
        : model.zones;

    return html`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${title}
        ${config.show_header !== false ? this._renderHeader(model, lang) : nothing}
        ${this._error
          ? html`<div class="error">${this._error}</div>`
          : nothing}
        ${config.show_queue !== false ? this._renderQueue(model, lang) : nothing}
        ${zones.length === 0
          ? html`<div class="message">${localize(lang, "card.no_zones")}</div>`
          : zones.map(
              (zone) => html`
                <imc-zone-row
                  .zone=${zone}
                  .language=${lang}
                  .now=${this._now}
                  .compact=${config.compact === true}
                  .showControls=${config.show_controls !== false}
                  .weightedTemp=${asNumber(model.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `,
            )}
        ${config.show_controls !== false
          ? html`<imc-global-controls
              .language=${lang}
              .paused=${model.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!model.hub.pauseSwitch}
            ></imc-global-controls>`
          : nothing}
      </ha-card>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color);
    }
    .card-title {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      margin: 0;
      padding: 14px 16px 0;
    }
    .message {
      padding: 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 13px;
    }
    .error {
      margin: 0 16px 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
    }
    .budget {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 220px;
      min-width: 200px;
    }
    .budget-label {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .meter {
      position: relative;
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.15)
      );
      min-width: 60px;
    }
    .meter-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.3s ease;
    }
    .meter-fill.sufficient {
      background: var(--success-color, #43a047);
    }
    .meter-mark {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.6;
    }
    .budget-numbers {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--primary-text-color);
    }
    .chip.accent {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .chip.warning {
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .queue {
      margin: 0 16px 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.08)
      );
    }
    .queue-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 4px;
    }
    .queue-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      padding: 2px 0;
    }
    .queue-item.active {
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }
    .queue-index {
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .queue-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .queue-duration,
    .queue-state {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .queue-item.active .queue-state {
      color: var(--primary-color, #03a9f4);
    }
  `;
}

defineElement("irrigation-maestro-card", IrrigationMaestroCard);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-card": IrrigationMaestroCard;
  }
}
