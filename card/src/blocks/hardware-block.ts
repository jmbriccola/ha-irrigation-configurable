import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { localize, localizeDynamic } from "../localize/localize";
import { defineElement } from "../types";

/**
 * What hardware this zone has, what it could have, and what it plainly does
 * not have.
 *
 * The three capability values map to three different sentences, and getting
 * them wrong is the failure this block exists to prevent:
 *
 * - `configured` is **active**, not an invitation.
 * - `candidate_available` is an **invitation** — the user's own valve exposes
 *   a sensor they have not wired up. Never a warning, never an alarm.
 * - `unavailable` is a **declared absence**, and it is shown rather than
 *   hidden: a sensor-shaped badge that would never fire is worse than a plain
 *   statement that the sensor is not there.
 *
 * The block proposes; it does not become a second editor. A candidate offers
 * exactly one action — adopt the entity the backend itself discovered — which
 * is a single `update_zone` call the shell makes. Anything beyond that belongs
 * in the panel, which is the one editor for these settings.
 */

export type CapabilityState = "configured" | "candidate_available" | "unavailable" | string;

export interface HardwareRow {
  /** `leak_detection` | `water_supply` | `water_accounting` | `leak_watch` */
  key: string;
  state: CapabilityState;
  /** Only a candidate can be adopted, and only when discovery named an entity. */
  adoptable: boolean;
}

/**
 * The rows to render, and which of them can be adopted.
 *
 * Pure so the "propose, never alarm" rule is testable: a candidate must never
 * come out of here looking like a fault, and an absence must never come out
 * looking adoptable.
 */
export function hardwareRows(
  capabilities: Record<string, unknown> | undefined,
  candidates: Record<string, string | null> | undefined,
): HardwareRow[] {
  const caps = capabilities ?? {};
  const rows: HardwareRow[] = [];
  for (const key of ["water_accounting", "leak_watch", "leak_detection", "water_supply"]) {
    const state = typeof caps[key] === "string" ? (caps[key] as string) : "unavailable";
    const candidateKey = key === "leak_detection" ? "leak_candidate" : "supply_candidate";
    rows.push({
      key,
      state,
      adoptable:
        state === "candidate_available" && Boolean(candidates?.[candidateKey]),
    });
  }
  return rows;
}

export class ImcHardwareBlock extends LitElement {
  @property({ attribute: false }) capabilities?: Record<string, unknown>;
  @property({ attribute: false }) candidates?: Record<string, string | null>;
  @property({ attribute: false }) degraded: string[] = [];
  /** The meter actually feeding this zone's litres, and the unit it declares. */
  @property() meterEntity?: string;
  @property() meterUnit?: string;
  @property() batteryState?: string;
  @property() language = "en";

  static override styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 3px 0;
      font-size: 12px;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      flex: 0 0 auto;
      min-width: 130px;
    }
    .value {
      color: var(--primary-text-color);
      flex: 1 1 auto;
    }
    .hint {
      color: var(--secondary-text-color, #727272);
      font-style: italic;
    }
    button {
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--primary-color, #03a9f4);
      background: transparent;
      color: var(--primary-color, #03a9f4);
    }
    .meter {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
      margin-top: 4px;
    }
    code {
      font-size: 11px;
    }
  `;

  private _adopt(key: string): void {
    const field = key === "leak_detection" ? "leak_sensor" : "water_supply_sensor";
    const candidate =
      key === "leak_detection"
        ? this.candidates?.["leak_candidate"]
        : this.candidates?.["supply_candidate"];
    if (!candidate) return;
    this.dispatchEvent(
      new CustomEvent("imc-adopt-sensor", {
        detail: { field, entityId: candidate },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render(): TemplateResult {
    const rows = hardwareRows(this.capabilities, this.candidates);
    return html`
      ${rows.map(
        (row) => html`
          <div class="row">
            <span class="label">${localizeDynamic(this.language, "capability", row.key)}</span>
            <span class="value ${row.state === "candidate_available" ? "hint" : ""}">
              ${localizeDynamic(this.language, "capability_state", row.state)}
            </span>
            ${row.adoptable
              ? html`<button @click=${() => this._adopt(row.key)}>
                  ${localize(this.language, "hardware.adopt")}
                </button>`
              : nothing}
          </div>
        `,
      )}
      ${this.batteryState !== undefined
        ? html`<div class="row">
            <span class="label">${localize(this.language, "hardware.battery")}</span>
            <span class="value">${this.batteryState}</span>
          </div>`
        : nothing}
      ${this.meterEntity
        ? html`<div class="meter">
            ${localize(this.language, "hardware.meter")}: <code>${this.meterEntity}</code>
            ${this.degraded.includes("flow_unit_unknown")
              ? html` — ${localize(this.language, "hardware.unit_unknown")}`
              : this.meterUnit
                ? html` — ${localize(this.language, "hardware.unit_resolved", {
                    unit: this.meterUnit,
                  })}`
                : nothing}
          </div>`
        : nothing}
    `;
  }
}

defineElement("imc-hardware-block", ImcHardwareBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-hardware-block": ImcHardwareBlock;
  }
}
