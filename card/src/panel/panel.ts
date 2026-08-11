import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { asNumber, defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { discover, type MaestroModel, type ZoneBundle } from "../discovery";
import "./program-list";
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

  private _relevantIds: string[] = [];
  private _statesCount = 0;
  private _errorTimer?: number;

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._errorTimer !== undefined) {
      window.clearTimeout(this._errorTimer);
      this._errorTimer = undefined;
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
      return await this.hass.callService(domain, service, data, undefined, true, returnResponse);
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
      return undefined;
    }
  }

  private _onSaveSchedule(ev: CustomEvent<ProgramScheduleSaveDetail>): void {
    const d = ev.detail;
    void this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: d.zoneId,
      program_id: d.programId,
      days: d.days,
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
      days: d.days,
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
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    .tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
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
    }
  `;

  override render(): TemplateResult {
    const hass = this.hass;
    if (!hass) return html``;
    const lang = pickLanguage(hass);
    const model: MaestroModel = discover(hass);
    this._relevantIds = model.entityIds;
    this._statesCount = Object.keys(hass.states).length;

    if (!model.found || model.zones.length === 0) {
      return html`
        <div class="wrap">
          <header><h1>${localize(lang, "panel.title")}</h1></header>
          <div class="empty">${localize(lang, "panel.no_zones")}</div>
        </div>
      `;
    }

    const selected = this._resolveSelected(model.zones);
    const weightedTemp = asNumber(model.hub.weightedTemp?.state);
    return html`
      <div
        class="wrap"
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
        <header><h1>${localize(lang, "panel.title")}</h1></header>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
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
}

defineElement("irrigation-maestro-panel", IrrigationMaestroPanel);

declare global {
  interface HTMLElementTagNameMap {
    "irrigation-maestro-panel": IrrigationMaestroPanel;
  }
}
