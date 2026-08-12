import { describe, expect, it } from "vitest";
import { buildAdvancedPatch } from "./program-editor";

describe("buildAdvancedPatch", () => {
  it("omits advanced fields the user did not set", () => {
    expect(buildAdvancedPatch({ soakMaxRunMin: 10, soakPauseMin: undefined })).toEqual({
      soak_max_run_min: 10,
    });
  });

  it("keeps a zero soak pause, which is a real value", () => {
    expect(buildAdvancedPatch({ soakMaxRunMin: 10, soakPauseMin: 0 })).toEqual({
      soak_max_run_min: 10,
      soak_pause_min: 0,
    });
  });

  it("maps the volume safety timeout", () => {
    expect(buildAdvancedPatch({ volumeSafetyTimeoutMin: 45 })).toEqual({
      volume_safety_timeout_min: 45,
    });
  });

  it("returns nothing when the drawer was never touched", () => {
    expect(buildAdvancedPatch({})).toEqual({});
  });
});
