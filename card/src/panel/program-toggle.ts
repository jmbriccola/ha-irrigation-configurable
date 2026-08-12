import { css, html } from "lit";
import type { TemplateResult } from "lit";
import type { HassEntity } from "../types";
import { localize } from "../localize/localize";

/**
 * The program enable toggle, shared by the program list and the program
 * editor.
 *
 * It used to render nothing at all when the `cycle_enabled` switch entity
 * could not be found — no control and no explanation. That became a real
 * problem in 2.0.0, whose migration DISABLES a program whose calendar could
 * never water and then asks the user, via a repair issue, to enable it again.
 * A control that silently vanishes is the worst answer to that. It now
 * degrades to a visibly disabled switch with a reason.
 */

export interface ToggleState {
  on: boolean;
  available: boolean;
}

const UNAVAILABLE_STATES = new Set(["unavailable", "unknown"]);

/** Whether the program is enabled, and whether the control can be used. */
export function toggleState(entity: HassEntity | undefined): ToggleState {
  if (!entity || UNAVAILABLE_STATES.has(entity.state)) {
    return { on: false, available: false };
  }
  return { on: entity.state === "on", available: true };
}

export const programToggleStyles = css`
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-size: 12.5px;
    color: var(--secondary-text-color);
    cursor: pointer;
    user-select: none;
  }
  .toggle-row[aria-disabled="true"] {
    cursor: default;
    opacity: 0.65;
  }
  .toggle-row:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .switch {
    width: 34px;
    height: 20px;
    background: var(--divider-color, #444);
    border-radius: 999px;
    position: relative;
    flex: none;
    transition: background 0.15s ease;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card-background-color, #fff);
    transition: transform 0.15s ease;
  }
  .switch.on {
    background: var(--primary-color, #03a9f4);
  }
  .switch.on::after {
    transform: translateX(14px);
  }
`;

/** Render the toggle. `onToggle` is never called while unavailable. */
export function renderProgramToggle(
  lang: string,
  entity: HassEntity | undefined,
  onToggle: () => void,
): TemplateResult {
  const { on, available } = toggleState(entity);
  const label = available
    ? localize(lang, on ? "zone.cycle_enabled" : "zone.cycle_disabled")
    : localize(lang, "program.toggle_unavailable");
  const activate = (): void => {
    if (available) onToggle();
  };
  return html`<div
    class="toggle-row"
    role="switch"
    tabindex=${available ? "0" : "-1"}
    aria-checked=${on ? "true" : "false"}
    aria-disabled=${available ? "false" : "true"}
    @click=${activate}
    @keydown=${(event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        activate();
      }
    }}
  >
    <span class="switch ${on ? "on" : ""}"></span>
    <span>${label}</span>
  </div>`;
}
