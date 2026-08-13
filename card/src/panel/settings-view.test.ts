import { describe, expect, it } from "vitest";
import {
  buildConcurrencyPatch,
  buildSessionLimitsPatch,
  buildValveSafetyPatch,
  effectiveNotifyPriority,
} from "./settings-view";
import { buildSaveCalls } from "./notification-wizard-state";
import type { NotificationStatusResponse } from "./notification-wizard-state";

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

/** Just enough of a status to answer "what priority does this event have?". */
function statusWith(priorities: Record<string, string>): NotificationStatusResponse {
  return {
    verdict: "silent",
    groups: {},
    recommended: [],
    enabled_without_target: [],
    unreachable: {},
    available_services: [],
    events: Object.entries(priorities).map(([event, priority]) => ({
      event,
      group: "critical",
      enabled: false,
      services: [],
      missing: [],
      priority,
      essential: priority === "high",
      reachable: false,
    })),
  };
}

describe("the notifications section", () => {
  it("emits grouped set_notifications calls rather than one per event", () => {
    const calls = buildSaveCalls({
      recipients: ["mobile_app_pixel"],
      events: ["watchdog", "anomaly", "sentinel", "interrupted"],
      priorities: {},
    });
    // Two calls for nine events: the enabled group and the disabled remainder.
    expect(calls).toHaveLength(2);
    expect(calls.flatMap((call) => call.events)).toHaveLength(9);
  });

  it("shows the backend's default for an event the user never chose a priority for", () => {
    // The map stays sparse: reading through it to the status is what keeps
    // watchdog reading "high" without an entry being written for it, which
    // would make buildSaveCalls send the value and pin it forever.
    const status = statusWith({ watchdog: "high", completed: "normal" });
    const selection = { recipients: [], events: ["watchdog"], priorities: {} };
    expect(effectiveNotifyPriority(selection, status, "watchdog")).toBe("high");
    expect(effectiveNotifyPriority(selection, status, "completed")).toBe("normal");
  });

  it("shows the user's own choice over the backend's default", () => {
    const status = statusWith({ watchdog: "high" });
    expect(
      effectiveNotifyPriority(
        { recipients: [], events: ["watchdog"], priorities: { watchdog: "normal" } },
        status,
        "watchdog",
      ),
    ).toBe("normal");
  });
});
