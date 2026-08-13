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

/** Mirrors SUPPORTED_FLOW_UNITS in flow.py, canonical first. A Python test
 *  pins that set against VolumeFlowRateConverter.VALID_UNITS. */
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
 * so the source -> key mapping lives here rather than in each of them (the
 * `zone.` prefix is historical: the strings are not zone-specific).
 */
export function flowUnitNote(
  lang: string,
  override: string | undefined,
  detected: string | undefined,
): string {
  const { unit, source } = effectiveFlowUnit(override, detected);
  return localize(lang, NOTE_KEYS[source], unit ? { unit } : undefined);
}
