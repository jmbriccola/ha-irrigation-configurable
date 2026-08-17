import { css, html, LitElement, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { localize, localizeDynamic } from "../localize/localize";
import { asArray, asString, defineElement } from "../types";

/**
 * When this zone runs next, and what would happen if it ran now.
 *
 * These are two different facts and the block never merges them into one
 * sentence. `zone_next_run`'s instant is already resolved against every gate
 * that can be projected forward — calendar, season, suspension, pause,
 * skip-today. The verdict beside it is about NOW: the weather skips, the
 * budget against the threshold, the consumption budget, none of which is
 * knowable for a future day. A card that wrote "next Tuesday, and it will be
 * skipped" would be claiming exactly the thing the backend refuses to claim.
 */

export type Verdict = "would_run" | "blocked" | "unknown";

export interface ProgramVerdict {
  cycle_id?: string;
  verdict?: string;
  reason_key?: string | null;
}

export interface NextRunVerdict {
  verdict?: string;
  reason_key?: string | null;
  evaluated_at?: string | null;
  programs?: ProgramVerdict[];
}

/** Programs whose reasons differ, so the zone-level line cannot name one. */
export function disagreeingPrograms(verdict: NextRunVerdict | undefined): ProgramVerdict[] {
  if (!verdict || verdict.verdict !== "blocked" || verdict.reason_key) return [];
  return asArray(verdict.programs)
    .map((raw) => raw as ProgramVerdict)
    .filter((program) => program.verdict === "blocked");
}

/**
 * "2 h fa" — the verdict's age, not its timestamp.
 *
 * An absolute time reads as authority; the point here is the opposite. The
 * cached evaluation refreshes when a session starts or `evaluate` runs and
 * nothing re-evaluates on a timer, so between sessions this is routinely
 * hours and the reader has to be able to see that at a glance.
 */
export function verdictAge(lang: string, evaluatedAt: string | null | undefined, now: number): string | null {
  if (!evaluatedAt) return null;
  const stamp = Date.parse(evaluatedAt);
  if (Number.isNaN(stamp)) return null;
  const minutes = Math.max(0, Math.round((now - stamp) / 60000));
  if (minutes < 1) return localize(lang, "next_run.age_now");
  if (minutes < 60) return localize(lang, "next_run.age_minutes", { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return localize(lang, "next_run.age_hours", { n: hours });
  return localize(lang, "next_run.age_days", { n: Math.round(hours / 24) });
}

export class ImcNextRunBlock extends LitElement {
  /** `zone_next_run`'s state: an ISO instant, or undefined when there is none. */
  @property() nextRun?: string;
  @property() nextRunProgram?: string;
  @property({ attribute: false }) verdict?: NextRunVerdict;
  @property() language = "en";
  @property({ attribute: false }) now: number = Date.now();

  static override styles = css`
    :host {
      display: block;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px;
      font-size: 13px;
      padding: 2px 0;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      min-width: 74px;
    }
    .value {
      color: var(--primary-text-color);
    }
    .muted {
      color: var(--secondary-text-color, #727272);
    }
    .age {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    ul {
      margin: 2px 0 0;
      padding-left: 88px;
      list-style: none;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    li::before {
      content: "· ";
    }
  `;

  private _when(): string {
    if (!this.nextRun) return localize(this.language, "next_run.none");
    const stamp = new Date(this.nextRun);
    if (Number.isNaN(stamp.getTime())) return localize(this.language, "next_run.none");
    const when = stamp.toLocaleString(this.language, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return this.nextRunProgram ? `${when} — ${this.nextRunProgram}` : when;
  }

  private _today(): TemplateResult {
    const verdict = this.verdict?.verdict as Verdict | undefined;
    if (verdict === "unknown" || verdict === undefined) {
      // Not "will not water": no evaluation has run, which is a different
      // statement and the contract requires it be read as one.
      return html`<span class="value muted">${localize(this.language, "next_run.not_evaluated")}</span>`;
    }
    if (verdict === "would_run") {
      return html`<span class="value">${localize(this.language, "next_run.would_run")}</span>`;
    }
    const reason = asString(this.verdict?.reason_key);
    return html`<span class="value"
      >${localize(this.language, "next_run.blocked")}${reason
        ? ` — ${localizeDynamic(this.language, "reason", reason)}`
        : ""}</span
    >`;
  }

  protected override render(): TemplateResult {
    const disagreeing = disagreeingPrograms(this.verdict);
    const age = verdictAge(this.language, this.verdict?.evaluated_at, this.now);
    return html`
      <div class="line">
        <span class="label">${localize(this.language, "next_run.next")}</span>
        <span class="value">${this._when()}</span>
      </div>
      <div class="line">
        <span class="label">${localize(this.language, "next_run.today")}</span>
        ${this._today()}
        ${age ? html`<span class="age">· ${age}</span>` : nothing}
      </div>
      ${disagreeing.length > 0
        ? html`<ul>
            ${disagreeing.map(
              (program) =>
                html`<li>
                  ${program.reason_key
                    ? localizeDynamic(this.language, "reason", program.reason_key)
                    : localize(this.language, "next_run.blocked")}
                </li>`,
            )}
          </ul>`
        : nothing}
    `;
  }
}

defineElement("imc-next-run-block", ImcNextRunBlock);

declare global {
  interface HTMLElementTagNameMap {
    "imc-next-run-block": ImcNextRunBlock;
  }
}
