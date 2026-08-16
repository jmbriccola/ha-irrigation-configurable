import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IrrigationMaestroPanel, parseSensorDiscovery, parseTestResults } from "./panel";
import type { HomeAssistant } from "../types";
import type { NotificationStatusResponse, SetNotificationsCall } from "./notification-wizard-state";
import type { NotificationTestDetail, NotifyTestResult } from "./settings-view";

/**
 * The panel's service handlers, exercised through the events the settings
 * view dispatches at it.
 *
 * Lit 3 resolves its `node` export condition to @lit-labs/ssr-dom-shim, so
 * the element constructs and receives events under the plain node test
 * environment — the same idiom settings-view.test.ts uses. It never renders:
 * an element that was never connected never enables updating, so `render()`
 * (which would need a real `document`) is never reached. These tests are
 * about what the panel asks the hub for, and what it keeps of the answer.
 */

interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/** What the stubbed hub answers with; throwing stands for a failed call. */
type Responder = (call: ServiceCall) => unknown;

/** The panel's own state and handlers — private, with no public setters. */
interface PanelInternals {
  _notifyStatus?: NotificationStatusResponse;
  _notifyStatusFailed: boolean;
  _testResults: Record<string, NotifyTestResult>;
  _testPending: string[];
  _error?: string;
  _view: "zones" | "settings";
  _options?: Record<string, unknown>;
  _onSaveNotifications(ev: CustomEvent<SetNotificationsCall[]>): Promise<void>;
  _onTestNotification(ev: CustomEvent<NotificationTestDetail>): Promise<void>;
  _loadNotificationStatus(): Promise<void>;
  _onOpenSettings(): Promise<void>;
  _editingZone?: Record<string, unknown> | null;
  _editingZoneSensors?: Record<string, string>;
  _onEditZone(zoneId: string): Promise<void>;
}

function panelWith(respond: Responder, language = "en"): {
  panel: IrrigationMaestroPanel;
  inner: PanelInternals;
  calls: ServiceCall[];
} {
  const calls: ServiceCall[] = [];
  const hass: HomeAssistant = {
    states: {},
    language,
    // The double honours `returnResponse`, as the real thing does: Home
    // Assistant returns no `response` unless the caller asked for one. A
    // double that answers regardless makes "forgot to ask for the response"
    // invisible — every test passes while the panel reads `undefined` off a
    // service that answered perfectly.
    async callService(domain, service, data, _target, _notifyOnError, returnResponse) {
      const call: ServiceCall = { domain, service, data: data ?? {} };
      calls.push(call);
      const response = await respond(call);
      return {
        context: {},
        response: returnResponse
          ? (response as Record<string, unknown> | undefined)
          : undefined,
      };
    },
  };
  const panel = new IrrigationMaestroPanel();
  panel.hass = hass;
  return { panel, inner: panel as unknown as PanelInternals, calls };
}

/** A `notification_status` payload, tagged so one read can be told from the next. */
function statusPayload(tag: string): Record<string, unknown> {
  return {
    verdict: "silent",
    groups: {},
    recommended: [],
    enabled_without_target: [],
    unreachable: {},
    available_services: [tag],
    events: [],
  };
}

function saveEvent(calls: SetNotificationsCall[]): CustomEvent<SetNotificationsCall[]> {
  return new CustomEvent<SetNotificationsCall[]>("imc-settings-save-notifications", {
    detail: calls,
  });
}

function testEvent(services: string[]): CustomEvent<NotificationTestDetail> {
  return new CustomEvent<NotificationTestDetail>("imc-settings-test-notification", {
    detail: { services },
  });
}

/**
 * What one Save produces: the enabling calls first, the switch-everything-
 * else-off call last — the order `buildSaveCalls` guarantees, and the reason
 * the loop must stop at the first failure.
 */
const SAVE_CALLS: SetNotificationsCall[] = [
  { events: ["watchdog"], enabled: true, services: ["phone"], priority: "high" },
  { events: ["completed"], enabled: true, services: ["phone"] },
  { events: ["skipped", "cancelled"], enabled: false },
];

beforeEach(() => {
  // The toasts are driven through `window.setTimeout`, and the plain node
  // environment has no `window`. Point it at the global object and run the
  // clock under vitest, so no real 6-second handle outlives a test.
  vi.stubGlobal("window", globalThis);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("saving the notification wizard", () => {
  it("stops at the first failing call, so nothing is switched off after it", async () => {
    // `buildSaveCalls` emits the enables first and the disable-the-remainder
    // call last. Carrying on past a failed enable would switch the user's
    // previously-enabled events off while the intended enables never landed —
    // the configured-looking-but-mute state the whole feature exists to
    // prevent.
    let failures = 0;
    const { inner, calls } = panelWith((call) => {
      if (call.service === "set_notifications" && failures++ === 0) {
        throw new Error("hub unloaded");
      }
      return call.service === "notification_status" ? statusPayload("after") : undefined;
    });

    await inner._onSaveNotifications(saveEvent(SAVE_CALLS));

    const attempted = calls.filter((call) => call.service === "set_notifications");
    expect(attempted).toHaveLength(1);
    expect(attempted[0]!.data["events"]).toEqual(["watchdog"]);
    expect(
      calls.some((call) => call.service === "set_notifications" && call.data["enabled"] === false),
    ).toBe(false);
  });

  it("re-reads the status after a failed save, so the wizard shows what is stored", async () => {
    const { inner, calls } = panelWith((call) => {
      if (call.service === "set_notifications") throw new Error("hub unloaded");
      return statusPayload("after");
    });

    await inner._onSaveNotifications(saveEvent(SAVE_CALLS));

    expect(calls.at(-1)?.service).toBe("notification_status");
    expect(inner._notifyStatus?.available_services).toEqual(["after"]);
  });

  it("issues every call in order when they all land", async () => {
    const { inner, calls } = panelWith((call) =>
      call.service === "notification_status" ? statusPayload("after") : undefined,
    );

    await inner._onSaveNotifications(saveEvent(SAVE_CALLS));

    expect(calls).toEqual([
      {
        domain: "irrigation_maestro",
        service: "set_notifications",
        data: { events: ["watchdog"], enabled: true, services: ["phone"], priority: "high" },
      },
      {
        domain: "irrigation_maestro",
        service: "set_notifications",
        data: { events: ["completed"], enabled: true, services: ["phone"] },
      },
      {
        domain: "irrigation_maestro",
        service: "set_notifications",
        data: { events: ["skipped", "cancelled"], enabled: false },
      },
      { domain: "irrigation_maestro", service: "notification_status", data: {} },
    ]);
  });
});

describe("reading the notification status", () => {
  it("reports a first read that failed, rather than reading forever", async () => {
    // There is no last known status to fall back on here, so the wizard would
    // otherwise sit on its "reading…" line permanently, explained only by a
    // toast that expires in 6s.
    const { inner } = panelWith(() => {
      throw new Error("connection lost");
    });

    await inner._loadNotificationStatus();

    expect(inner._notifyStatus).toBeUndefined();
    expect(inner._notifyStatusFailed).toBe(true);
  });

  it("treats an answer with no events as no status at all", async () => {
    const { inner } = panelWith(() => ({ verdict: "ok" }));

    await inner._loadNotificationStatus();

    expect(inner._notifyStatus).toBeUndefined();
    expect(inner._notifyStatusFailed).toBe(true);
  });

  it("keeps the last known status when a re-read fails", async () => {
    // The post-save re-read: a transient failure must not replace a wizard
    // the user is standing in with its loading line.
    let reads = 0;
    const { inner } = panelWith(() => {
      if (reads++ === 0) return statusPayload("first");
      throw new Error("connection lost");
    });

    await inner._loadNotificationStatus();
    await inner._loadNotificationStatus();

    expect(inner._notifyStatus?.available_services).toEqual(["first"]);
  });

  it("clears the failure once a retry lands", async () => {
    let reads = 0;
    const { inner } = panelWith(() => {
      if (reads++ === 0) throw new Error("connection lost");
      return statusPayload("second");
    });

    await inner._loadNotificationStatus();
    await inner._loadNotificationStatus();

    expect(inner._notifyStatus?.available_services).toEqual(["second"]);
    expect(inner._notifyStatusFailed).toBe(false);
  });
});

describe("proving a recipient", () => {
  it("sends the panel's own localized strings, not the service's defaults", async () => {
    // The service defaults to the instance's language; the card follows the
    // frontend locale of whoever is logged in, which can be another one.
    const { inner, calls } = panelWith(() => ({ results: {} }), "it");

    await inner._onTestNotification(testEvent(["phone"]));

    expect(calls[0]?.data["message"]).toBe(
      "Notifica di prova. Se riesci a leggere questo messaggio, il destinatario funziona.",
    );
  });

  it("answers the row when the call itself fails", async () => {
    // The inline ✓/✗ is the entire point of the feature: with only a toast,
    // the recipient the user just clicked says nothing at all.
    const { inner } = panelWith(() => {
      throw new Error("connection lost");
    });

    await inner._onTestNotification(testEvent(["phone"]));

    expect(inner._testResults["phone"]).toEqual({ sent: false, error: "no result came back" });
  });

  it("answers the row when the payload cannot be read", async () => {
    const { inner } = panelWith(() => ({ results: { phone: { sent: "yes" } } }));

    await inner._onTestNotification(testEvent(["phone"]));

    // Not `{ sent: "yes" }` taken on trust, which renders as a failure with
    // an empty reason — and would render as a success for `sent: "no"`.
    expect(inner._testResults["phone"]).toEqual({ sent: false, error: "no result came back" });
  });

  it("keeps the verdicts of the recipients proved before this one", async () => {
    const { inner } = panelWith((call) => ({
      results: { [String((call.data["services"] as string[])[0])]: { sent: true, error: null } },
    }));

    await inner._onTestNotification(testEvent(["phone"]));
    await inner._onTestNotification(testEvent(["tablet"]));

    expect(inner._testResults).toEqual({
      phone: { sent: true, error: null },
      tablet: { sent: true, error: null },
    });
  });

  it("replaces the verdict of the recipient just retested", async () => {
    // A ✓ from a minute ago standing over a send that has just failed is a
    // lie about the recipient the user is looking at.
    let sends = 0;
    const { inner } = panelWith(() => {
      if (sends++ === 0) return { results: { phone: { sent: true, error: null } } };
      throw new Error("connection lost");
    });

    await inner._onTestNotification(testEvent(["phone"]));
    await inner._onTestNotification(testEvent(["phone"]));

    expect(inner._testResults["phone"]).toEqual({ sent: false, error: "no result came back" });
  });

  it("marks the recipient as testing while the send is outstanding", async () => {
    // `test_notification` sends with blocking=True, so a slow notify
    // integration leaves the click with no feedback at all without this.
    let release = (): void => undefined;
    const answered = new Promise<void>((resolve) => (release = () => resolve()));
    const { inner } = panelWith(async () => {
      await answered;
      return { results: { phone: { sent: true, error: null } } };
    });

    const done = inner._onTestNotification(testEvent(["phone"]));
    await Promise.resolve();
    expect(inner._testPending).toEqual(["phone"]);

    release();
    await done;
    expect(inner._testPending).toEqual([]);
    expect(inner._testResults["phone"]).toEqual({ sent: true, error: null });
  });

  it("stops marking a recipient as testing when the send fails", async () => {
    const { inner } = panelWith(() => {
      throw new Error("connection lost");
    });

    await inner._onTestNotification(testEvent(["phone"]));

    expect(inner._testPending).toEqual([]);
  });
});

describe("parseTestResults", () => {
  it("reads a well-formed payload", () => {
    expect(parseTestResults({ phone: { sent: true, error: null } })).toEqual({
      phone: { sent: true, error: null },
    });
  });

  it("refuses a payload that is not a map of results", () => {
    expect(parseTestResults(undefined)).toBeUndefined();
    expect(parseTestResults("sent")).toBeUndefined();
    expect(parseTestResults([{ sent: true }])).toBeUndefined();
    expect(parseTestResults({ phone: null })).toBeUndefined();
  });

  it("refuses a result whose verdict is not a boolean", () => {
    // `sent` decides whether the row shows ✓ or ✗; anything else there is not
    // a verdict, whatever it looks like in JavaScript.
    expect(parseTestResults({ phone: { sent: "true", error: null } })).toBeUndefined();
  });

  it("normalises a missing error to null", () => {
    expect(parseTestResults({ phone: { sent: false } })).toEqual({
      phone: { sent: false, error: null },
    });
  });
});

describe("opening the settings view", () => {
  it("drops the test results of the previous visit", async () => {
    // A ✓ next to a recipient nobody has proved since is a lie about the
    // present: the results belong to one visit.
    const { inner } = panelWith((call) =>
      call.service === "export_config"
        ? { payload: JSON.stringify({ options: { weather_entity: "weather.home" }, zones: {} }) }
        : statusPayload("open"),
    );
    inner._testResults = { phone: { sent: true, error: null } };
    inner._testPending = ["tablet"];

    await inner._onOpenSettings();

    expect(inner._testResults).toEqual({});
    expect(inner._testPending).toEqual([]);
    expect(inner._view).toBe("settings");
    expect(inner._options).toEqual({ weather_entity: "weather.home" });
  });

  it("stays where it is when the config read fails", async () => {
    // Opening settings on an empty form would look like a hub with nothing
    // configured, and saving it would then write that emptiness back.
    const { inner } = panelWith((call) => {
      if (call.service === "export_config") throw new Error("connection lost");
      return statusPayload("open");
    });

    await inner._onOpenSettings();

    expect(inner._view).toBe("zones");
    expect(inner._error).toBe("Couldn't read the current configuration.");
  });
});

describe("what discover_zone_sensors answers", () => {
  it("keeps the device's candidates and nothing else", () => {
    // The service also answers with the zone's configured sensors and its two
    // capability verdicts. The form seeds the first from `export_config` and
    // the card reads the second off `zone_state`, so keeping either here
    // would be a second copy of a value nothing reads — and one that could
    // differ from the copy actually on screen.
    expect(
      parseSensorDiscovery({
        leak_sensor: "binary_sensor.chosen_leak",
        water_supply_sensor: null,
        leak_candidate: "binary_sensor.valve_water_leak",
        supply_candidate: "binary_sensor.valve_water_supply",
        leak_detection: "configured",
        water_supply: "candidate_available",
      }),
    ).toEqual({
      leak_candidate: "binary_sensor.valve_water_leak",
      supply_candidate: "binary_sensor.valve_water_supply",
    });
  });

  it("refuses a payload that is not an object", () => {
    expect(parseSensorDiscovery(undefined)).toBeUndefined();
    expect(parseSensorDiscovery("binary_sensor.x")).toBeUndefined();
    expect(parseSensorDiscovery([])).toBeUndefined();
  });
});

describe("opening the zone editor", () => {
  const exported = {
    payload: JSON.stringify({
      options: {},
      zones: { z1: { name: "Lawn", valve_entity: "valve.lawn" } },
    }),
  };

  it("asks the backend what this zone's valve device offers", async () => {
    // The frontend cannot answer this itself: `hass` carries states only, no
    // entity or device registry, and a state's attributes never name a
    // device. Hence a service call, made once, when the editor opens.
    const { inner, calls } = panelWith((call) =>
      call.service === "export_config"
        ? exported
        : { leak_candidate: "binary_sensor.valve_water_leak", supply_candidate: null },
    );

    await inner._onEditZone("z1");

    expect(calls.map((c) => c.service)).toContain("discover_zone_sensors");
    expect(calls.find((c) => c.service === "discover_zone_sensors")?.data).toEqual({
      zone_id: "z1",
    });
    expect(inner._editingZoneSensors).toEqual({
      leak_candidate: "binary_sensor.valve_water_leak",
    });
  });

  it("still opens the editor when the discovery cannot be read", async () => {
    // A backend that cannot answer this must not make a zone uneditable —
    // and the editor must then say nothing about candidates rather than
    // reporting a device that has none.
    const { inner } = panelWith((call) => {
      if (call.service === "discover_zone_sensors") throw new Error("unknown service");
      return exported;
    });

    await inner._onEditZone("z1");

    expect(inner._editingZone).toEqual({ name: "Lawn", valve_entity: "valve.lawn" });
    expect(inner._editingZoneSensors).toBeUndefined();
    // And silently: a toast reporting "Service not found" over an editor that
    // opened correctly reports a fault the user did not cause, for a
    // convenience they never asked for. It teaches them to ignore the toast
    // that will one day matter.
    expect(inner._error).toBeUndefined();
  });

  it("does not carry one zone's candidates into the next zone's form", async () => {
    // `_editingZoneSensors` outliving its zone would offer zone A's sibling
    // sensor as zone B's, on a device that never had one.
    const { inner } = panelWith((call) => {
      if (call.service === "export_config") return exported;
      throw new Error("unknown service");
    });
    inner._editingZoneSensors = { leak_candidate: "binary_sensor.other_zone_leak" };

    await inner._onEditZone("z1");

    expect(inner._editingZoneSensors).toBeUndefined();
  });
});
