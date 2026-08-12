import { describe, expect, it } from "vitest";
import {
  buildConcurrencyPatch,
  buildSessionLimitsPatch,
  buildValveSafetyPatch,
} from "./settings-view";

describe("settings patches", () => {
  it("omits fields the user left empty, so absent means unchanged", () => {
    expect(buildSessionLimitsPatch({ sessionMaxMin: undefined, waitFreeMin: 7 })).toEqual({
      wait_free_min: 7,
    });
  });

  it("passes zero through rather than treating it as empty", () => {
    // 0 is a meaningful value for a pause or a confirmation delay; dropping it
    // as falsy would make the field impossible to set back to zero.
    expect(buildValveSafetyPatch({ openConfirmS: 0 })).toEqual({ open_confirm_s: 0 });
  });

  it("maps every session field to its service key", () => {
    expect(
      buildSessionLimitsPatch({
        sessionMaxMin: 120,
        mustFinishBy: "06:00",
        waitFreeMin: 5,
        manualBlockMin: 30,
        settlePauseS: 60,
        sentinelTime: "23:30",
      }),
    ).toEqual({
      session_max_min: 120,
      must_finish_by: "06:00",
      wait_free_min: 5,
      manual_block_min: 30,
      settle_pause_s: 60,
      sentinel_time: "23:30",
    });
  });

  it("maps every valve-safety field to its service key", () => {
    expect(
      buildValveSafetyPatch({
        openConfirmS: 10,
        closeConfirmS: 15,
        switchConfirmS: 8,
        startupValveTimeoutS: 30,
        watchdogMaxMin: 45,
      }),
    ).toEqual({
      open_confirm_s: 10,
      close_confirm_s: 15,
      switch_confirm_s: 8,
      startup_valve_timeout_s: 30,
      watchdog_max_min: 45,
    });
  });

  it("maps every concurrency field to its service key", () => {
    expect(
      buildConcurrencyPatch({
        maxConcurrent: 2,
        compatibilityGroups: "drip,lawn",
        masterPreOpenS: 5,
        masterPostCloseS: 3,
      }),
    ).toEqual({
      max_concurrent: 2,
      compatibility_groups: "drip,lawn",
      master_pre_open_s: 5,
      master_post_close_s: 3,
    });
  });

  it("drops an empty compatibility-groups string", () => {
    expect(buildConcurrencyPatch({ compatibilityGroups: "  " })).toEqual({});
  });
});
