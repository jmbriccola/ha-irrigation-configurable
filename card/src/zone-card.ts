import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { discover, leakStatus, readCycles, waterSummary, zoneAdjustmentPct } from "./discovery";
import type { ZoneBundle } from "./discovery";
import { describeLeakAlarm, formatNumber } from "./format";
import { localize, localizeDynamic, pickLanguage } from "./localize/localize";
import {
  asArray,
  asNumber,
  asString,
  defineElement,
  isUnavailable,
  ZONE_CARD_BLOCKS,
  zoneBlockEnabled,
} from "./types";
import type { HomeAssistant, ZoneCardBlock, ZoneCardConfig } from "./types";
import { WaterHistoryCache } from "./water-history";
import "./blocks/next-run-block";
import "./blocks/programs-block";
import "./blocks/hardware-block";
import "./blocks/consumption-block";

/**
 * The detailed card for one zone.
 *
 * One card, one zone. The detailed view is per-zone by nature: rendering N
 * would duplicate what the compact card exists to do and would make the card's
 * height unbounded. A user who wants three detailed zones adds three cards,
 * which is how every entity-detail card in Home Assistant works.
 *
 * **The shell owns every service call.** Blocks emit events; nothing below
 * this file writes. That boundary is what keeps the write paths countable and
 * lets each block be tested as arithmetic.
 */

const DOMAIN = "irrigation_maestro";

export class IrrigationMaestroZoneCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: ZoneCardConfig;
  @state() private _now: number = Date.now();
  @state() private _error?: string;
  @state() private _candidates?: Record<string, string | null>;

  private readonly _history = new WaterHistoryCache();
  private _relevantIds: string[] = [];
  private _statesCount = 0;
  private _timer?: number;
  private _timerPeriod = 0;
  private _errorTimer?: number;
  private _discoveredFor?: string;

  /* ------------------------------------------------------------ */
  /* Custom-card API                                               */
  /* ------------------------------------------------------------ */

  public static getConfigElement(): HTMLElement {
    return document.createElement("irrigation-maestro-zone-card-editor");
  }

  /**
   * What the card picker inserts. Seeded with the first zone by order, so the
   * preview shows a real card rather than the missing-zone line.
   */
  public static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const zones = hass ? discover(hass).zones : [];
    return zones.length > 0 ? { zone: zones[0]!.zoneId } : {};
  }

  public setConfig(config: ZoneCardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    this._config = { ...config };
  }

  public getCardSize(): number {
    const config = this._config;
    if (!config) return 3;
    const blocks = ZONE_CARD_BLOCKS.filter((block) => zoneBlockEnabled(config, block)).length;
    return Math.max(3, blocks + (zoneBlockEnabled(config, "consumption") ? 3 : 0));
  }

  /* ------------------------------------------------------------ */
  /* Update gating and the refresh timer                           */
  /* ------------------------------------------------------------ */

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.size === 1 && changed.has("hass")) {
      const previous = changed.get("hass") as HomeAssistant | undefined;
      const current = this.hass;
      if (!previous || !current) return true;
      const count = Object.keys(current.states).length;
      if (count !== this._statesCount) return true;
      return this._relevantIds.some((id) => previous.states[id] !== current.states[id]);
    }
    return true;
  }

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
    const zone = this._zone();
    const watering = zone?.state?.state === "watering" || zone?.state?.state === "soaking";
    if (this.isConnected) this._ensureTimer(!!watering);

    // Fetching lives here and never in render(): a Lit render can run many
    // times a second, and a service round trip per frame would be a
    // self-inflicted denial of service on the user's own installation.
    const config = this._config;
    if (this.hass && zone && config && zoneBlockEnabled(config, "consumption")) {
      this._history.request(
        this.hass,
        zone.zoneId,
        config.chart_days ?? 30,
        Date.now(),
        new Date(),
      );
    }
    if (this.hass && zone && config && zoneBlockEnabled(config, "hardware")) {
      this._discoverSensors(zone.zoneId);
    }
  }

  /* ------------------------------------------------------------ */
  /* Services — every write in the card is here                    */
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
      this._error = err instanceof Error ? err.message : String(err);
      if (this._errorTimer !== undefined) window.clearTimeout(this._errorTimer);
      this._errorTimer = window.setTimeout(() => {
        this._error = undefined;
        this._errorTimer = undefined;
      }, 6000);
    }
  }

  /**
   * Ask the backend which sensors this zone's own valve device offers.
   *
   * Once per zone, not per render: the answer changes only when hardware does.
   * The card never derives candidates by name — the contract forbids it, and
   * the backend's own tests carry a decoy whose id looks right and whose
   * device class is wrong.
   */
  private _discoverSensors(zoneId: string): void {
    if (this._discoveredFor === zoneId || !this.hass) return;
    this._discoveredFor = zoneId;
    void this.hass
      .callService(DOMAIN, "discover_zone_sensors", { zone_id: zoneId }, undefined, false, true)
      .then((result) => {
        this._candidates = (result.response ?? {}) as Record<string, string | null>;
      })
      .catch(() => {
        // No proposals is a fine outcome; a thrown error would take the card
        // down for a block the user may not even have enabled.
        this._candidates = {};
      });
  }

  private _onProgramToggle(ev: CustomEvent<{ cycleId?: string; enabled: boolean }>): void {
    const zone = this._zone();
    const cycleId = ev.detail.cycleId;
    const entity = zone?.cycleSwitches.find(
      (item) => asString(item.attributes["cycle_id"]) === cycleId,
    );
    if (!entity) return;
    void this._call("switch", ev.detail.enabled ? "turn_on" : "turn_off", {
      entity_id: entity.entity_id,
    });
  }

  private _onAdoptSensor(ev: CustomEvent<{ field: string; entityId: string }>): void {
    const zone = this._zone();
    if (!zone) return;
    // One call, with the entity the backend itself discovered. Not an editor:
    // the panel is the one place these settings are edited, and anything
    // beyond adopting a discovered value belongs there.
    void this._call(DOMAIN, "update_zone", {
      zone_id: zone.zoneId,
      [ev.detail.field]: ev.detail.entityId,
    });
  }

  /* ------------------------------------------------------------ */
  /* Model                                                         */
  /* ------------------------------------------------------------ */

  private _zone(): ZoneBundle | undefined {
    const hass = this.hass;
    const zoneId = this._config?.zone;
    if (!hass || !zoneId) return undefined;
    return discover(hass).zones.find((zone) => zone.zoneId === zoneId);
  }

  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */

  private _renderState(zone: ZoneBundle, lang: string): TemplateResult {
    const leak = leakStatus(zone);
    const status = zone.state?.state ?? "unknown";
    const startedAt = asString(zone.state?.attributes["run_started_at"]);
    const total = asNumber(zone.state?.attributes["run_duration_min"]);
    let progress: TemplateResult | typeof nothing = nothing;
    if (startedAt && total) {
      const elapsedMin = Math.max(0, (this._now - Date.parse(startedAt)) / 60000);
      const fraction = Math.min(1, elapsedMin / total);
      progress = html`
        <div class="progress" role="progressbar" aria-valuenow=${Math.round(fraction * 100)}>
          <div class="progress-fill" style="width:${(fraction * 100).toFixed(1)}%"></div>
        </div>
        <span class="progress-text">
          ${localize(lang, "zone_card.remaining", {
            n: Math.max(0, Math.round(total - elapsedMin)),
          })}
        </span>
      `;
    }
    return html`
      <div class="status-row">
        <span class="status">${localizeDynamic(lang, "zone_state", status)}</span>
        ${leak.coverage === "alarm"
          ? html`<span
              class="chip alarm"
              title=${describeLeakAlarm(lang, localize(lang, "header.leak"), leak, this._now)}
              >${localize(lang, "header.leak")}</span
            >`
          : nothing}
      </div>
      ${progress}
    `;
  }

  private _renderLastOutcome(zone: ZoneBundle, lang: string): TemplateResult | typeof nothing {
    const outcome = zone.lastOutcome;
    if (!outcome || isUnavailable(outcome) || outcome.state === "none") return nothing;
    const reason = asString(outcome.attributes["reason_key"]);
    const minutes = asNumber(outcome.attributes["duration_min"]);
    const liters = asNumber(outcome.attributes["volume_l"]);
    return html`
      <div class="line">
        <span class="label">${localize(lang, "zone.last_outcome")}</span>
        <span class="value">
          ${localizeDynamic(lang, "outcome", outcome.state)}${reason
            ? ` — ${localizeDynamic(lang, "reason", reason)}`
            : ""}
          ${minutes !== undefined ? html`· ${minutes} min` : nothing}
          ${liters !== undefined ? html`· ${formatNumber(liters, 1)} L` : nothing}
        </span>
      </div>
    `;
  }

  private _renderActions(zone: ZoneBundle, lang: string): TemplateResult {
    return html`
      <div class="actions">
        <button @click=${() => this._call(DOMAIN, "run_zone", { zone_id: zone.zoneId })}>
          ${localize(lang, "controls.run_now")}
        </button>
        <button @click=${() => this._call(DOMAIN, "skip_today", { zone_id: zone.zoneId })}>
          ${localize(lang, "controls.skip_today")}
        </button>
        <button @click=${() => this._call(DOMAIN, "pause", { zone_id: zone.zoneId, hours: 24 })}>
          ${localize(lang, "controls.pause_for") + " " + localize(lang, "controls.hours", { hours: 24 })}
        </button>
        <button @click=${() => this._call(DOMAIN, "resume", { zone_id: zone.zoneId })}>
          ${localize(lang, "controls.resume")}
        </button>
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const lang = pickLanguage(hass);
    const model = discover(hass);
    this._relevantIds = model.entityIds;
    this._statesCount = Object.keys(hass.states).length;

    const zone = model.zones.find((item) => item.zoneId === config.zone);
    if (!zone) {
      // Never fall back to another zone: silently showing the wrong zone's
      // water is worse than showing none.
      return html`<ha-card
        ><div class="message">
          ${localize(lang, "zone_card.missing_zone", { id: config.zone ?? "—" })}
        </div></ha-card
      >`;
    }

    const cycles = readCycles(zone);
    const water = waterSummary(zone);
    const capabilities = zone.state?.attributes["capabilities"] as
      | Record<string, unknown>
      | undefined;
    const degraded = asArray(zone.state?.attributes["degraded"])
      .map((item) => asString(item))
      .filter((item): item is string => item !== undefined);

    return html`
      <ha-card
        @imc-program-toggle=${this._onProgramToggle}
        @imc-adopt-sensor=${this._onAdoptSensor}
      >
        <h1 class="card-title">${config.title ?? zone.name}</h1>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${zoneBlockEnabled(config, "state")
          ? html`<div class="block">${this._renderState(zone, lang)}</div>`
          : nothing}
        ${zoneBlockEnabled(config, "next_run")
          ? html`<div class="block">
              <imc-next-run-block
                .nextRun=${isUnavailable(zone.nextRun) ? undefined : zone.nextRun?.state}
                .nextRunProgram=${asString(zone.nextRun?.attributes["cycle_name"])}
                .verdict=${zone.state?.attributes["next_run"]}
                .language=${lang}
                .now=${this._now}
              ></imc-next-run-block>
            </div>`
          : nothing}
        ${zoneBlockEnabled(config, "last_outcome")
          ? html`<div class="block">${this._renderLastOutcome(zone, lang)}</div>`
          : nothing}
        ${zoneBlockEnabled(config, "programs")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "zone_card.programs")}</div>
              <imc-programs-block
                .cycles=${cycles}
                .language=${lang}
                .adjustmentPct=${zoneAdjustmentPct(zone)}
                .weightedTemp=${asNumber(model.hub.weightedTemp?.state)}
              ></imc-programs-block>
            </div>`
          : nothing}
        ${zoneBlockEnabled(config, "hardware")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "zone_card.hardware")}</div>
              <imc-hardware-block
                .capabilities=${capabilities}
                .candidates=${this._candidates}
                .degraded=${degraded}
                .meterEntity=${asString(zone.zone_water_total?.attributes["meter_entity"])}
                .batteryState=${config.battery_entity
                  ? hass.states[config.battery_entity]?.state
                  : undefined}
                .language=${lang}
              ></imc-hardware-block>
            </div>`
          : nothing}
        ${zoneBlockEnabled(config, "consumption")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "zone_card.consumption")}</div>
              <imc-consumption-block
                .water=${water}
                .series=${this._history.get(zone.zoneId, config.chart_days ?? 30)}
                .source=${config.consumption_source ?? "internal"}
                .accounting=${asString(capabilities?.["water_accounting"])}
                .language=${lang}
              ></imc-consumption-block>
            </div>`
          : nothing}
        ${zoneBlockEnabled(config, "actions")
          ? html`<div class="block">${this._renderActions(zone, lang)}</div>`
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
      padding-bottom: 8px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      margin: 0;
      padding: 14px 16px 4px;
    }
    .block {
      padding: 8px 16px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.18));
    }
    .block:first-of-type {
      border-top: none;
    }
    .block-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 4px;
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
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .chip.alarm {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-weight: 600;
    }
    .progress {
      position: relative;
      height: 6px;
      border-radius: 3px;
      margin-top: 6px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: baseline;
      font-size: 13px;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      min-width: 74px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    button {
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      border-radius: 14px;
      padding: 4px 10px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
      background: transparent;
      color: var(--primary-text-color);
    }
    button:hover {
      border-color: var(--primary-color, #03a9f4);
    }
  `;
}

defineElement("irrigation-maestro-zone-card", IrrigationMaestroZoneCard);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-zone-card": IrrigationMaestroZoneCard;
  }
}
