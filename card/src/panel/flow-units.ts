import { localize } from "../localize/localize";
import type { TranslationKey } from "../localize/localize";
import { asString } from "../types";
import type { HomeAssistant } from "../types";

/**
 * Flow-unit helpers for the two places a meter is configured.
 *
 * The canonical unit of the whole engine is L/min; this is only about telling
 * the backend what a sensor reports when the sensor itself does not say, or
 * says something wrong. Conversion happens server-side, in flow.py.
 */

/**
 * Mirrors SUPPORTED_FLOW_UNITS in flow.py, canonical first. A Python test pins
 * that set against VolumeFlowRateConverter.VALID_UNITS; this list is a hand
 * copy, and flow-units.test.ts pins it whole so a typo cannot pass.
 *
 * Drifting from the backend breaks the UI in two directions, both of which end
 * as the control contradicting itself:
 *  - a unit missing here that the backend converts fine makes
 *    `detectedFlowUnit` return undefined, so the note claims "no usable unit"
 *    about a working meter;
 *  - a stored unit missing here (a new HA unit, or one written by
 *    import_config or Developer Tools) matches no <option>, so the select
 *    falls back to "detected automatically" while the note right below reads
 *    "Using X — you set this". That one is display-only: `_save` sends the
 *    component's state, not the DOM's, so an untouched save round-trips it.
 */
export const FLOW_UNITS: readonly string[] = [
  "L/min",
  "L/h",
  "L/s",
  "mL/s",
  "m³/h",
  "m³/min",
  "m³/s",
  "ft³/min",
  "gal/h",
  "gal/min",
  "gal/d",
];

export type FlowUnitSource = "override" | "detected" | "unknown";

/** The unit the entity declares, if the backend could convert it. */
export function detectedFlowUnit(hass: HomeAssistant, entityId: string): string | undefined {
  const unit = asString(hass.states?.[entityId]?.attributes["unit_of_measurement"]);
  return unit && FLOW_UNITS.includes(unit) ? unit : undefined;
}

/** Which unit will actually be used, and who decided it. */
export function effectiveFlowUnit(
  override: string | undefined,
  detected: string | undefined,
): { unit: string | undefined; source: FlowUnitSource } {
  if (override) return { unit: override, source: "override" };
  if (detected) return { unit: detected, source: "detected" };
  return { unit: undefined, source: "unknown" };
}

const NOTE_KEYS: Record<FlowUnitSource, TranslationKey> = {
  override: "zone.flow_unit_from_override",
  detected: "zone.flow_unit_from_entity",
  unknown: "zone.flow_unit_unknown",
};

/**
 * The sentence under the picker: which unit will actually be used, and who
 * decided it. Both the zone editor and the hub's sensors section render it,
 * so the source -> key mapping lives here rather than in each of them. The
 * spec named these keys under `zone.`; the strings are not zone-specific.
 */
export function flowUnitNote(
  lang: string,
  override: string | undefined,
  detected: string | undefined,
): string {
  const { unit, source } = effectiveFlowUnit(override, detected);
  return localize(lang, NOTE_KEYS[source], unit ? { unit } : undefined);
}
