import { describe, it, expect } from "vitest";
import budgetMeterSource from "./budget-meter?raw";
import waterChartSource from "./water-chart?raw";

/**
 * "Respect the theme: no forced colours, it must work on light and dark" is a
 * non-negotiable requirement, and it is the one requirement no rendering test
 * can check — a test cannot see a colour. What it *can* check is the thing
 * that causes the failure: a literal colour written outside a custom
 * property's fallback position.
 *
 * `var(--primary-color, #03a9f4)` is fine — the literal is the fallback for a
 * theme that does not define the token. `fill: #03a9f4` is not: it wins over
 * every theme, and on Frosted Glass Dark it is exactly the thing that looks
 * wrong. Stripping every `var(...)` first and then scanning what remains
 * distinguishes the two mechanically.
 */

/**
 * Sources are pulled in through Vite's `?raw` import rather than `node:fs`, so
 * the check needs no Node type declarations and no new dependency — the same
 * bundler that builds the card reads the file.
 *
 * Components added for the zone card. Existing files predate this rule and are
 * not retrofitted here.
 */
const NEW_COMPONENTS: [name: string, source: string][] = [
  ["water-chart.ts", waterChartSource],
  ["budget-meter.ts", budgetMeterSource],
];

const NAMED_COLOURS = [
  "red",
  "blue",
  "green",
  "black",
  "white",
  "orange",
  "yellow",
  "purple",
  "grey",
  "gray",
];

/**
 * Remove every `var(...)` expression, fallback and all.
 *
 * Depth-counted rather than regex-matched, because a fallback legitimately
 * contains parentheses — `var(--divider-color, rgba(127, 127, 127, 0.25))` is
 * exactly the shape this whole file exists to permit, and a `[^()]*` pattern
 * silently fails to match it and then reports the fallback as a violation.
 */
function stripVars(css: string): string {
  let out = "";
  let index = 0;
  while (index < css.length) {
    const start = css.indexOf("var(", index);
    if (start === -1) {
      out += css.slice(index);
      break;
    }
    out += css.slice(index, start) + "VAR";
    let depth = 0;
    let cursor = start + 3; // at the "("
    for (; cursor < css.length; cursor += 1) {
      if (css[cursor] === "(") depth += 1;
      else if (css[cursor] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    index = cursor + 1;
  }
  return out;
}

function stylesOf(name: string, source: string): string {
  const match = /static override styles = css`([\s\S]*?)`;/.exec(source);
  expect(match, `${name} has no styles block to check`).not.toBeNull();
  return match![1]!;
}

describe.each(NEW_COMPONENTS)("%s forces no colours", (name, source) => {
  it("writes no hex literal outside a custom property's fallback", () => {
    const bare = stripVars(stylesOf(name, source));
    expect(bare.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  it("writes no rgb()/hsl() literal outside a custom property's fallback", () => {
    const bare = stripVars(stylesOf(name, source));
    expect(bare.match(/\b(rgba?|hsla?)\(/g) ?? []).toEqual([]);
  });

  it("writes no named colour outside a custom property's fallback", () => {
    const bare = stripVars(stylesOf(name, source));
    const declarations = bare
      .split(/[;{}]/)
      .filter((line) => /(^|[\s:])(color|background|fill|stroke|border)/.test(line));
    for (const declaration of declarations) {
      for (const name of NAMED_COLOURS) {
        expect(
          new RegExp(`(^|[\\s:])${name}([\\s;]|$)`).test(declaration),
          `"${declaration.trim()}" hardcodes the colour "${name}"`,
        ).toBe(false);
      }
    }
  });

  it("still uses custom properties at all — an empty styles block would pass the checks above", () => {
    expect(stylesOf(name, source)).toMatch(/var\(--/);
  });
});
