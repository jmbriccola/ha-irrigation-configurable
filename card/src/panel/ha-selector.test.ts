import { describe, it, expect, afterEach } from "vitest";
import { useNativeSelector } from "./ha-selector";

const g = globalThis as unknown as { customElements?: { get: (t: string) => unknown } };

afterEach(() => { delete g.customElements; });

describe("useNativeSelector", () => {
  it("false when customElements is absent (node/test env)", () => {
    delete g.customElements;
    expect(useNativeSelector()).toBe(false);
  });
  it("false when ha-selector is not registered", () => {
    g.customElements = { get: () => undefined };
    expect(useNativeSelector()).toBe(false);
  });
  it("true when ha-selector is registered", () => {
    g.customElements = { get: (t) => (t === "ha-selector" ? class {} : undefined) };
    expect(useNativeSelector()).toBe(true);
  });
});
