import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { discover, hubLeakStatus } from "./discovery";
import type { MaestroModel } from "./discovery";
import { localize, localizeQueueState, pickLanguage } from "./localize/localize";
import {
  asArray,
  asNumber,
  asString,
  defineElement,
  HUB_CARD_BLOCKS,
  hubBlockEnabled,
  isUnavailable,
} from "./types";
import type { HomeAssistant, HubCardConfig, QueueItem } from "./types";
import "./blocks/decision-block";
import "./blocks/health-block";
import "./global-controls";

/**
 * The hub card: what the system is doing, why, and whether it can still tell
 * you things.
 *
 * Like the zone card, the shell owns every service call and the blocks only
 * emit. Unlike it, there is no zone key — there is one hub.
 */

const DOMAIN = "irrigation_maestro";
/** How long the notification verdict stays fresh. It changes only when settings do. */
const NOTIFICATION_REFRESH_MS = 5 * 60 * 1000;

export class IrrigationMaestroHubCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: HubCardConfig;
  @state() private _error?: string;
  @state() private _notifications?: Record<string, unknown> | null;

  private _relevantIds: string[] = [];
  private _statesCount = 0;
  private _errorTimer?: number;
  private _notificationsAt = 0;
  private _notificationsInFlight = false;

  public static getConfigElement(): HTMLElement {
    return document.createElement("irrigation-maestro-hub-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  public setConfig(config: HubCardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = { ...config };
  }

  public getCardSize(): number {
    const config = this._config;
    if (!config) return 4;
    return HUB_CARD_BLOCKS.filter((block) => hubBlockEnabled(config, block)).length + 2;
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.size === 1 && changed.has("hass")) {
      const previous = changed.get("hass") as HomeAssistant | undefined;
      const current = this.hass;
      if (!previous || !current) return true;
      if (Object.keys(current.states).length !== this._statesCount) return true;
      return this._relevantIds.some((id) => previous.states[id] !== current.states[id]);
    }
    return true;
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._errorTimer !== undefined) {
      window.clearTimeout(this._errorTimer);
      this._errorTimer = undefined;
    }
  }

  protected override updated(): void {
    const config = this._config;
    if (this.hass && config && hubBlockEnabled(config, "health")) {
      this._refreshNotifications(Date.now());
    }
  }

  /**
   * Ask what the notification configuration would actually deliver.
   *
   * From `updated()`, never from `render()`, and rate-limited — the same rule
   * the history cache follows, for the same reason. A failed call ages exactly
   * like a successful one, so a hub that is down is asked once rather than on
   * every frame, and the block degrades to "could not be checked" rather than
   * to "fine".
   */
  private _refreshNotifications(now: number): void {
    if (this._notificationsInFlight) return;
    if (this._notifications !== undefined && now - this._notificationsAt < NOTIFICATION_REFRESH_MS) {
      return;
    }
    if (!this.hass) return;
    this._notificationsInFlight = true;
    this._notificationsAt = now;
    void this.hass
      .callService(DOMAIN, "notification_status", {}, undefined, false, true)
      .then((result) => {
        this._notifications = (result.response ?? null) as Record<string, unknown> | null;
      })
      .catch(() => {
        this._notifications = null;
      })
      .finally(() => {
        this._notificationsInFlight = false;
      });
  }

  private async _call(service: string, data?: Record<string, unknown>): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    try {
      await hass.callService(DOMAIN, service, data);
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      if (this._errorTimer !== undefined) window.clearTimeout(this._errorTimer);
      this._errorTimer = window.setTimeout(() => {
        this._error = undefined;
        this._errorTimer = undefined;
      }, 6000);
    }
  }

  private _onGlobalAction(ev: CustomEvent<{ action: string; paused?: boolean }>): void {
    const hub = this.hass ? discover(this.hass).hub : undefined;
    switch (ev.detail.action) {
      case "run_all":
        void this._call("run_all");
        break;
      case "stop_all":
        void this._call("stop_all");
        break;
      case "evaluate":
        void this._call("evaluate");
        break;
      case "set-pause": {
        const entityId = hub?.pauseSwitch?.entity_id;
        if (entityId && this.hass) {
          void this.hass.callService("switch", ev.detail.paused ? "turn_on" : "turn_off", {
            entity_id: entityId,
          });
        }
        break;
      }
    }
  }

  private _renderSession(model: MaestroModel, lang: string): TemplateResult {
    const session = model.hub.session;
    const queue = asArray(session?.attributes["queue"]).filter(
      (item): item is QueueItem => !!item && typeof item === "object",
    );
    const activeZoneId = asString(session?.attributes["active_zone_id"]);
    return html`
      <div class="session-state">
        ${session ? localizeQueueState(lang, session.state) : "—"}
      </div>
      ${queue.length > 0
        ? html`<div class="queue">
            ${queue.map(
              (item, index) => html`
                <div class="queue-item ${item.zone_id === activeZoneId ? "active" : ""}">
                  <span class="idx">${index + 1}.</span>
                  <span class="qname">${asString(item.zone_name) ?? "?"}</span>
                  ${asNumber(item.duration_min) !== undefined
                    ? html`<span class="qmeta">${asNumber(item.duration_min)} min</span>`
                    : nothing}
                  ${asString(item.state)
                    ? html`<span class="qmeta">${localizeQueueState(lang, asString(item.state)!)}</span>`
                    : nothing}
                </div>
              `,
            )}
          </div>`
        : nothing}
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

    if (!model.found) {
      return html`<ha-card
        ><div class="message">${localize(lang, "hub_card.not_installed")}</div></ha-card
      >`;
    }

    const hub = model.hub;
    const budget = !isUnavailable(hub.waterBudget) ? asNumber(hub.waterBudget?.state) : undefined;
    const threshold = !isUnavailable(hub.skipThreshold)
      ? asNumber(hub.skipThreshold?.state)
      : undefined;
    // Every hub sensor returns {} for its attributes before the first
    // evaluation, so one published attribute is the honest signal that one has
    // run -- not the state, which can be "unknown" for other reasons.
    const evaluated = hub.weightedTemp?.attributes["temp_today_eff"] !== undefined;

    return html`
      <ha-card @imc-global-action=${this._onGlobalAction} @imc-test-notification=${() =>
        this._call("test_notification")}>
        ${config.title ? html`<h1 class="card-title">${config.title}</h1>` : nothing}
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}

        ${hubBlockEnabled(config, "session")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "hub_card.session")}</div>
              ${this._renderSession(model, lang)}
            </div>`
          : nothing}

        ${hubBlockEnabled(config, "decision")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "hub_card.decision")}</div>
              <imc-decision-block
                .budget=${budget}
                .threshold=${threshold}
                .budgetAttrs=${hub.waterBudget?.attributes}
                .tempAttrs=${hub.weightedTemp?.attributes}
                .weightedTemp=${asNumber(hub.weightedTemp?.state)}
                .skipReason=${asString(hub.waterBudget?.attributes["skip_reason"])}
                .evaluated=${evaluated}
                .language=${lang}
              ></imc-decision-block>
            </div>`
          : nothing}

        ${hubBlockEnabled(config, "health")
          ? html`<div class="block">
              <div class="block-title">${localize(lang, "hub_card.health")}</div>
              <imc-health-block
                .weatherEntity=${asString(hub.weightedTemp?.attributes["weather_entity"])}
                .staleWeather=${hub.weightedTemp?.attributes["stale_weather"] === true}
                .notifications=${this._notifications}
                .leak=${hubLeakStatus(hub)}
                .unattributedTotal=${asNumber(hub.unattributedWater?.state)}
                .unattributedClosed=${asNumber(hub.unattributedWater?.attributes["closed_l"])}
                .budgetLeft=${!isUnavailable(hub.consumptionLeft)
                  ? asNumber(hub.consumptionLeft?.state)
                  : undefined}
                .language=${lang}
              ></imc-health-block>
            </div>`
          : nothing}

        ${hubBlockEnabled(config, "actions")
          ? html`<div class="block">
              <imc-global-controls
                .language=${lang}
                .paused=${hub.pauseSwitch?.state === "on"}
                .hasPauseSwitch=${!!hub.pauseSwitch}
              ></imc-global-controls>
            </div>`
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
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }
    .error {
      margin: 0 16px 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
    }
    .session-state {
      font-size: 14px;
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
    .idx {
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .qname {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qmeta {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
  `;
}

defineElement("irrigation-maestro-hub-card", IrrigationMaestroHubCard);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-hub-card": IrrigationMaestroHubCard;
  }
}
