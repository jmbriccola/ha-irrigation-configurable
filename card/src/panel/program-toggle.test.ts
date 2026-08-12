import { describe, expect, it } from "vitest";
import { toggleState } from "./program-toggle";

describe("toggleState", () => {
  it("reports enabled when the switch is on", () => {
    expect(toggleState({ state: "on" } as never)).toEqual({ on: true, available: true });
  });

  it("reports disabled when the switch is off", () => {
    expect(toggleState({ state: "off" } as never)).toEqual({ on: false, available: true });
  });

  it("stays visible but unavailable when the entity is missing", () => {
    // It used to render nothing at all: no control, no explanation. That
    // matters more since 2.0.0, whose migration can DISABLE a program whose
    // calendar could never water and then ask the user to enable it again.
    expect(toggleState(undefined)).toEqual({ on: false, available: false });
  });

  it("is unavailable when the entity itself is unavailable", () => {
    expect(toggleState({ state: "unavailable" } as never)).toEqual({
      on: false,
      available: false,
    });
  });

  it("is unavailable when the entity state is unknown", () => {
    expect(toggleState({ state: "unknown" } as never)).toEqual({ on: false, available: false });
  });
});
