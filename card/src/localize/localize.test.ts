import { describe, it, expect } from "vitest";
import { en } from "./en";
import { it as itDict } from "./it";

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
