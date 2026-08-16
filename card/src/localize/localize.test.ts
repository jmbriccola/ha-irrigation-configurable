import { describe, it, expect } from "vitest";
import { en } from "./en";
import { it as itDict } from "./it";
import { DEGRADED_KEYS, LEAK_SOURCE_KEYS, REASON_KEYS } from "../types";

/**
 * `en.ts` is the reference dictionary; the TypeScript type on `it.ts`
 * (`Record<keyof typeof en, string>`) already forces the two key *sets* to
 * match at compile time. It says nothing about key *order*, though, and a
 * diff that reorders or partially reorders one file while touching the
 * other is easy to miss on review. Keeping both files in the same order is
 * a repo convention (see the two files themselves) that only a human
 * reading the whole diff was enforcing until now.
 */
describe("locale parity: en.ts vs it.ts", () => {
  it("have the same set of keys", () => {
    const enKeys = new Set(Object.keys(en));
    const itKeys = new Set(Object.keys(itDict));

    const missingFromIt = [...enKeys].filter((k) => !itKeys.has(k));
    const extraInIt = [...itKeys].filter((k) => !enKeys.has(k));

    expect(missingFromIt).toEqual([]);
    expect(extraInIt).toEqual([]);
  });

  it("declare their keys in the same order", () => {
    expect(Object.keys(itDict)).toEqual(Object.keys(en));
  });
});

/**
 * An outcome whose `reason_key` has no label renders as the raw string the
 * integration sent -- `leak`, in the panel, for every cycle refused by the
 * `close_and_block` action, from the day that reason shipped until the day
 * this test was written. The type union alone cannot catch it: adding a key
 * to `REASON_KEYS` compiles perfectly well without a dictionary entry.
 */
describe("every reason key the card can render has a label", () => {
  // `restart` is excluded on purpose, not by oversight: the card contract
  // states that a restart leaves no per-cycle outcome by design, so the key
  // cannot reach a rendered outcome and has deliberately never been given a
  // label. Do not "fix" this by inventing one.
  const RENDERED = REASON_KEYS.filter((key) => key !== "restart");

  it.each(RENDERED)("localizes reason.%s in both locales", (key) => {
    expect(en[`reason.${key}` as keyof typeof en]).toBeTruthy();
    expect(itDict[`reason.${key}` as keyof typeof en]).toBeTruthy();
  });
});

/**
 * `degraded` reaches the row as raw keys and is rendered through
 * `localizeDynamic`, which falls back to the raw key rather than hiding it —
 * so a missing label ships as `leak_never_observable` on a user's screen,
 * visibly and silently at once. Same failure mode as the reason keys above,
 * same guard.
 */
describe("every degraded key the row can render has a label", () => {
  it.each(DEGRADED_KEYS)("localizes degraded.%s in both locales", (key) => {
    expect(en[`degraded.${key}` as keyof typeof en]).toBeTruthy();
    expect(itDict[`degraded.${key}` as keyof typeof en]).toBeTruthy();
  });
});

/**
 * `sources` and `describing_source` arrive as unlocalised contract keys, the
 * way `reason_key` does. A raw `no_flow_closed` on screen is the same defect
 * `reason.leak` was before it had a label.
 */
describe("every leak source key has a label", () => {
  it.each(LEAK_SOURCE_KEYS)("localizes leak_source.%s in both locales", (key) => {
    expect(en[`leak_source.${key}` as keyof typeof en]).toBeTruthy();
    expect(itDict[`leak_source.${key}` as keyof typeof en]).toBeTruthy();
  });

  it("words them as observations rather than as conclusions", () => {
    // `valve_sensor` covers BOTH readings of a `moisture` device class: the
    // SWV firmware's "water passed while I was closed" and a genuine ground
    // probe. "Water detected on the ground" is false on the reference
    // hardware, so the label names the reporter, not the puddle.
    expect(en["leak_source.valve_sensor"]).toMatch(/sensor/i);
    expect(itDict["leak_source.valve_sensor"]).toMatch(/sensore/i);
  });
});

/**
 * The alarm's `since` is when the leak was CONFIRMED — the evidence
 * completing, not the water starting. A label reading "leaking since 05:30"
 * would put a time on screen that nothing measured.
 */
describe("the leak alarm's timestamp says what it is", () => {
  it("is worded as a confirmation in both locales", () => {
    expect(en["zone.leak_confirmed_at"]).toMatch(/confirmed/i);
    expect(itDict["zone.leak_confirmed_at"]).toMatch(/confermat/i);
  });
});
