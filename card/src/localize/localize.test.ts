import { describe, it, expect } from "vitest";
import { en } from "./en";
import { it as itDict } from "./it";
import { REASON_KEYS } from "../types";

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
 *
 * `restart` is the documented exception: the card contract states that a
 * restart leaves no per-cycle outcome by design, so the key can never reach
 * a rendered outcome and has deliberately never been given a label.
 */
describe("every reason key the card can render has a label", () => {
  const RENDERED = REASON_KEYS.filter((key) => key !== "restart");

  it.each(RENDERED)("localizes reason.%s in both locales", (key) => {
    expect(en[`reason.${key}` as keyof typeof en]).toBeTruthy();
    expect(itDict[`reason.${key}` as keyof typeof en]).toBeTruthy();
  });
});
