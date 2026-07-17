import { en } from "./en";
import { it } from "./it";
import type { HomeAssistant } from "../types";

export type TranslationKey = keyof typeof en;

const DICTIONARIES: Record<string, Record<TranslationKey, string>> = {
  en,
  it,
};

/** Pick the card language from hass, falling back to English. */
export function pickLanguage(hass?: HomeAssistant): string {
  const raw = hass?.locale?.language ?? hass?.language ?? "en";
  const primary = raw.toLowerCase().split(/[-_]/)[0] ?? "en";
  return primary in DICTIONARIES ? primary : "en";
}

function substitute(
  text: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/** Translate a known key. */
export function localize(
  lang: string,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[lang] ?? en;
  return substitute(dict[key] ?? en[key], vars);
}

/**
 * Translate a dynamic key coming from entity data (reason_key, states,
 * degraded keys, queue item states…). Unknown keys fall back to the raw
 * key so nothing is ever hidden.
 */
export function localizeDynamic(
  lang: string,
  prefix: string,
  raw: string,
): string {
  const key = `${prefix}.${raw}`;
  const dict = (DICTIONARIES[lang] ?? en) as Record<string, string>;
  const fallback = en as Record<string, string>;
  return dict[key] ?? fallback[key] ?? raw;
}

/**
 * Localize a queue item state: try queue-specific labels, then zone
 * states, then outcomes, then show the raw value.
 */
export function localizeQueueState(lang: string, raw: string): string {
  const dict = (DICTIONARIES[lang] ?? en) as Record<string, string>;
  const fallback = en as Record<string, string>;
  for (const prefix of ["queue_state", "zone_state", "outcome"]) {
    const key = `${prefix}.${raw}`;
    const hit = dict[key] ?? fallback[key];
    if (hit !== undefined) return hit;
  }
  return raw;
}
