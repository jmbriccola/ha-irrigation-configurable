import { describe, expect, it } from "vitest";
import {
  buildSaveCalls,
  discoverRecipients,
  presetSelection,
  selectionFromStatus,
} from "./notification-wizard-state";
import type { NotificationStatusResponse } from "./notification-wizard-state";

const STATUS: NotificationStatusResponse = {
  verdict: "silent",
  groups: {
    critical: ["watchdog", "anomaly"],
    operational: ["skipped", "interrupted", "cancelled"],
    informational: ["completed", "sentinel", "session_overrun", "consumption_budget"],
  },
  recommended: ["anomaly", "interrupted", "sentinel", "watchdog"],
  enabled_without_target: [],
  unreachable: {},
  available_services: ["casabrangi", "mobile_app_pixel"],
  events: [
    "watchdog",
    "anomaly",
    "skipped",
    "interrupted",
    "cancelled",
    "completed",
    "sentinel",
    "session_overrun",
    "consumption_budget",
  ].map((event) => ({
    event,
    group: "critical",
    enabled: false,
    services: [],
    missing: [],
    priority: "normal",
    essential: ["watchdog", "anomaly", "sentinel", "interrupted"].includes(event),
    reachable: false,
  })),
};

describe("presetSelection", () => {
  it("proposes exactly the four events an irrigation system must not miss", () => {
    expect(presetSelection("recommended", STATUS).sort()).toEqual([
      "anomaly",
      "interrupted",
      "sentinel",
      "watchdog",
    ]);
  });

  it("proposes only the critical group for the bare minimum", () => {
    expect(presetSelection("critical", STATUS).sort()).toEqual(["anomaly", "watchdog"]);
  });

  it("proposes every event for everything", () => {
    expect(presetSelection("all", STATUS)).toHaveLength(9);
  });
});

describe("selectionFromStatus", () => {
  it("starts from the recommendation when nothing is configured", () => {
    expect(selectionFromStatus(STATUS).events.sort()).toEqual([
      "anomaly",
      "interrupted",
      "sentinel",
      "watchdog",
    ]);
  });

  it("starts from what is already configured when something is", () => {
    const configured: NotificationStatusResponse = {
      ...STATUS,
      verdict: "partial",
      events: STATUS.events.map((event) =>
        event.event === "completed"
          ? { ...event, enabled: true, services: ["casabrangi"], reachable: true }
          : event,
      ),
    };
    const selection = selectionFromStatus(configured);
    expect(selection.events).toEqual(["completed"]);
    expect(selection.recipients).toEqual(["casabrangi"]);
  });
});

describe("buildSaveCalls", () => {
  it("writes the chosen events on and every other event off, in two calls", () => {
    const calls = buildSaveCalls({
      recipients: ["mobile_app_pixel"],
      events: ["watchdog", "anomaly", "sentinel", "interrupted"],
      priorities: {},
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({
      events: ["watchdog", "anomaly", "sentinel", "interrupted"],
      enabled: true,
      services: ["mobile_app_pixel"],
    });
    expect(calls[1]).toEqual({
      events: ["skipped", "cancelled", "completed", "session_overrun", "consumption_budget"],
      enabled: false,
    });
  });

  it("splits a call per distinct priority so one high event does not raise the rest", () => {
    const calls = buildSaveCalls({
      recipients: ["phone"],
      events: ["watchdog", "completed"],
      priorities: { watchdog: "high", completed: "normal" },
    });
    const enabling = calls.filter((call) => call.enabled);
    expect(enabling).toHaveLength(2);
    expect(enabling.find((call) => call.priority === "high")?.events).toEqual(["watchdog"]);
    expect(enabling.find((call) => call.priority === "normal")?.events).toEqual(["completed"]);
  });

  it("refuses to build a call that would enable an event with no recipient", () => {
    expect(() =>
      buildSaveCalls({ recipients: [], events: ["watchdog"], priorities: {} }),
    ).toThrow(/recipient/i);
  });

  it("disables everything when the user selects no event", () => {
    const calls = buildSaveCalls({ recipients: ["phone"], events: [], priorities: {} });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.enabled).toBe(false);
    expect(calls[0]!.events).toHaveLength(9);
  });
});

describe("discoverRecipients", () => {
  it("lists the notify services the instance actually has", () => {
    const hass = {
      services: {
        notify: {
          persistent_notification: { name: "Persistent notification" },
          mobile_app_pixel_10_pro_xl: {},
        },
        light: { turn_on: {} },
      },
    };
    expect(discoverRecipients(hass as never)).toEqual([
      { service: "mobile_app_pixel_10_pro_xl", label: "mobile_app_pixel_10_pro_xl" },
      { service: "persistent_notification", label: "Persistent notification" },
    ]);
  });

  it("survives an instance with no notify domain at all", () => {
    expect(discoverRecipients({ services: {} } as never)).toEqual([]);
  });
});
