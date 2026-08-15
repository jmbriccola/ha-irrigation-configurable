import { describe, expect, it } from "vitest";
import {
  buildSaveCalls,
  discoverRecipients,
  presetSelection,
  recipientRows,
  selectionFromStatus,
} from "./notification-wizard-state";
import type { NotificationStatusResponse, WizardSelection } from "./notification-wizard-state";

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
  ].map((event) => {
    const essential = ["watchdog", "anomaly", "sentinel", "interrupted"].includes(event);
    return {
      event,
      group: "critical",
      enabled: false,
      services: [],
      missing: [],
      // notify.py reports default_priority(event) as the RESOLVED priority of
      // an unconfigured event, which is "high" for the essential ones — not
      // "normal" for everything, which is the impossible state this fixture
      // used to encode. Nothing is stored, so stored_priority is null.
      priority: essential ? "high" : "normal",
      stored_priority: null,
      essential,
      reachable: false,
    };
  }),
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

  it("seeds no priority for an enabled event that has none stored", () => {
    // The four essentials resolve to "high" for display, but nothing is
    // stored for them. Seeding from the resolved value would make the very
    // first Save pin "high" explicitly, and notify.py lets a stored priority
    // beat default_priority forever after.
    const configured: NotificationStatusResponse = {
      ...STATUS,
      verdict: "ok",
      events: STATUS.events.map((event) =>
        event.essential
          ? { ...event, enabled: true, services: ["casabrangi"], reachable: true }
          : event,
      ),
    };
    expect(selectionFromStatus(configured).priorities).toEqual({});
  });

  it("keeps a priority the user did store", () => {
    const configured: NotificationStatusResponse = {
      ...STATUS,
      events: STATUS.events.map((event) =>
        event.event === "watchdog"
          ? {
              ...event,
              enabled: true,
              services: ["casabrangi"],
              reachable: true,
              priority: "normal",
              stored_priority: "normal",
            }
          : event,
      ),
    };
    expect(selectionFromStatus(configured).priorities).toEqual({ watchdog: "normal" });
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
      events: [
        "leak",
        "skipped",
        "cancelled",
        "completed",
        "session_overrun",
        "consumption_budget",
      ],
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

  it("sends a duplicated event once", () => {
    // Not reachable from the wizard — `_toggleEvent` removes what is already
    // chosen — but this function is pure and takes whatever selection it is
    // handed, and a repeated entry would go out repeated inside `events`.
    const calls = buildSaveCalls({
      recipients: ["phone"],
      events: ["watchdog", "watchdog"],
      priorities: {},
    });
    const enabling = calls.filter((call) => call.enabled);
    expect(enabling).toHaveLength(1);
    expect(enabling[0]!.events).toEqual(["watchdog"]);
  });

  it("disables everything when the user selects no event", () => {
    const calls = buildSaveCalls({ recipients: ["phone"], events: [], priorities: {} });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.enabled).toBe(false);
    expect(calls[0]!.events).toHaveLength(10);
  });
});

describe("selectionFromStatus piped into buildSaveCalls", () => {
  it("omits priority for the recommended events, so the backend's own default applies", () => {
    // Nothing is configured, so selectionFromStatus proposes the
    // recommendation with no stored priorities. The wizard would still
    // need the user to pick a recipient before Save is enabled; that step
    // is not this module's job, so it's added here to exercise the call.
    const selection: WizardSelection = {
      ...selectionFromStatus(STATUS),
      recipients: ["mobile_app_pixel"],
    };
    const calls = buildSaveCalls(selection);
    const enabling = calls.find((call) => call.enabled);
    expect(enabling?.events.sort()).toEqual(["anomaly", "interrupted", "sentinel", "watchdog"]);
    expect(enabling).not.toHaveProperty("priority");
  });

  it("re-saves an already-configured install without pinning its resolved defaults", () => {
    // The round trip a returning user makes: open the wizard on a working
    // configuration, change something else, Save. The four essentials are
    // enabled and display "high", but none of them has a stored priority, so
    // none may be written back — that would freeze today's default.
    const configured: NotificationStatusResponse = {
      ...STATUS,
      verdict: "ok",
      events: STATUS.events.map((event) =>
        event.essential
          ? { ...event, enabled: true, services: ["mobile_app_pixel"], reachable: true }
          : event,
      ),
    };
    const calls = buildSaveCalls(selectionFromStatus(configured));
    const enabling = calls.filter((call) => call.enabled);
    expect(enabling).toHaveLength(1);
    expect(enabling[0]!.events.sort()).toEqual(["anomaly", "interrupted", "sentinel", "watchdog"]);
    expect(enabling[0]).not.toHaveProperty("priority");
  });

  it("keeps an event with no explicit priority out of a call that carries one", () => {
    // watchdog and completed would both resolve to "normal" under a
    // default-resolved bucketing (watchdog explicitly, completed by
    // fallback) — the point of this test is that only the explicit one may
    // carry the priority field.
    const calls = buildSaveCalls({
      recipients: ["phone"],
      events: ["watchdog", "completed"],
      priorities: { watchdog: "normal" },
    });
    const enabling = calls.filter((call) => call.enabled);
    expect(enabling).toHaveLength(2);
    const withPriority = enabling.find((call) => call.events.includes("watchdog"));
    const withoutPriority = enabling.find((call) => call.events.includes("completed"));
    expect(withPriority?.priority).toBe("normal");
    expect(withoutPriority).not.toHaveProperty("priority");
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

  it("never offers notify.send_message, which is registered everywhere and delivers nothing", () => {
    // It is an entity service: with only a title and a message it resolves to
    // zero entities and reports success. Choosing it would produce exactly the
    // configured-looking-but-mute state the wizard exists to prevent.
    const hass = {
      services: { notify: { send_message: {}, persistent_notification: {}, phone: {} } },
    };
    expect(discoverRecipients(hass as never).map((r) => r.service)).toEqual([
      "persistent_notification",
      "phone",
    ]);
  });
});

describe("recipientRows", () => {
  it("keeps a stored recipient that has vanished, so it can be unchecked", () => {
    // Without a row of its own the dead recipient has no checkbox, buildSaveCalls
    // writes it back on every Save, and its ERROR repair never clears.
    const hass = { services: { notify: { phone: { name: "Phone" } } } };
    expect(recipientRows(hass as never, ["phone", "old_tablet"])).toEqual([
      { service: "phone", label: "Phone" },
      { service: "old_tablet", label: "old_tablet", missing: true },
    ]);
  });

  it("marks nothing when every selected recipient still exists", () => {
    const hass = { services: { notify: { phone: {} } } };
    expect(recipientRows(hass as never, ["phone"])).toEqual([
      { service: "phone", label: "phone" },
    ]);
  });

  it("lists a vanished recipient even on an instance with no notify service left", () => {
    expect(recipientRows({ services: {} } as never, ["old_tablet"])).toEqual([
      { service: "old_tablet", label: "old_tablet", missing: true },
    ]);
  });
});
