import { describe, expect, it } from "vitest";
import {
  ImcSettingsView,
  buildConcurrencyPatch,
  buildSessionLimitsPatch,
  buildValveSafetyPatch,
  effectiveNotifyPriority,
  sameEventSet,
  unreachableEssentials,
} from "./settings-view";
import type { WeatherSaveDetail } from "./settings-view";
import type {
  NotificationStatusResponse,
  SetNotificationsCall,
  WizardSelection,
} from "./notification-wizard-state";

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
      // Resolved-only: what the backend reports for an event nobody has
      // chosen a priority for. effectiveNotifyPriority must still display it.
      stored_priority: null,
      essential: priority === "high",
      reachable: false,
    })),
  };
}

const ESSENTIALS = ["watchdog", "anomaly", "sentinel", "interrupted"];

/** A status whose essential events are reachable or not, as named. */
function essentialsStatus(reachable: string[]): NotificationStatusResponse {
  return {
    verdict: "silent",
    groups: {},
    recommended: [...ESSENTIALS],
    enabled_without_target: [],
    unreachable: {},
    available_services: [],
    events: [...ESSENTIALS, "completed"].map((event) => ({
      event,
      group: "critical",
      enabled: reachable.includes(event),
      services: [],
      missing: [],
      priority: "high",
      stored_priority: null,
      essential: ESSENTIALS.includes(event),
      reachable: reachable.includes(event),
    })),
  };
}

/** The weather section's own state, likewise private. */
interface WeatherInternals {
  _weatherEntity: string;
  _lineFlowSensor: string;
  _lineFlowSensorUnit: string;
  _setLineFlowSensor(value: string): void;
  _saveWeather(): void;
}

/** The one weather detail a save produced, or undefined if it sent nothing. */
function savedWeather(seed: (inner: WeatherInternals) => void): WeatherSaveDetail | undefined {
  const element = new ImcSettingsView();
  const inner = element as unknown as WeatherInternals;
  inner._weatherEntity = "weather.home";
  seed(inner);
  let detail: WeatherSaveDetail | undefined;
  element.addEventListener("imc-settings-save-weather", (event) => {
    detail = (event as CustomEvent<WeatherSaveDetail>).detail;
  });
  inner._saveWeather();
  return detail;
}

describe("the line meter's unit", () => {
  it("goes out with the rest of the weather sources", () => {
    const detail = savedWeather((inner) => {
      inner._lineFlowSensor = "sensor.line";
      inner._lineFlowSensorUnit = "m³/h";
    });
    expect(detail?.line_flow_sensor_unit).toBe("m³/h");
  });

  it("goes out as an empty string when detection is left to the entity", () => {
    // `set_weather_sources` merges its patch, so an omitted key means "leave
    // unchanged" -- omitting this one would make a stored override
    // unremovable. The empty string is what clears it.
    const detail = savedWeather((inner) => {
      inner._lineFlowSensor = "sensor.line";
      inner._lineFlowSensorUnit = "";
    });
    expect(detail?.line_flow_sensor_unit).toBe("");
  });

  it("round-trips a stored override through seeding, untouched", () => {
    // The counterpart of the zone editor's seeding test: the section sends
    // this field on every weather save, which is only safe because
    // `_seedFromOptions` puts the stored override back into the form first.
    // Drop that line -- or `line_flow_sensor_unit` from `HubOptions` -- and
    // saving anything in this section silently clears the user's override.
    const element = new ImcSettingsView();
    element.options = {
      weather_entity: "weather.home",
      line_flow_sensor: "sensor.line",
      line_flow_sensor_unit: "m³/h",
    };
    (element as unknown as { willUpdate(changed: Map<string, unknown>): void }).willUpdate(
      new Map([["options", undefined]]),
    );

    let detail: WeatherSaveDetail | undefined;
    element.addEventListener("imc-settings-save-weather", (event) => {
      detail = (event as CustomEvent<WeatherSaveDetail>).detail;
    });
    (element as unknown as WeatherInternals)._saveWeather();

    expect(detail?.line_flow_sensor_unit).toBe("m³/h");
  });

  it("is dropped when the meter it describes is cleared", () => {
    // An override that outlived its sensor would silently apply to whatever
    // sensor is configured next; the backend drops it, and so does the form.
    const detail = savedWeather((inner) => {
      inner._lineFlowSensor = "sensor.line";
      inner._lineFlowSensorUnit = "m³/h";
      inner._setLineFlowSensor("");
    });
    expect(detail?.line_flow_sensor_unit).toBe("");
  });
});

/** The wizard's own state: private, and there is no public setter for it. */
interface WizardInternals {
  _selection: WizardSelection;
  _saveError?: string;
  _saveNotifications(lang: string): void;
}

/**
 * A settings view holding one selection. Lit 3 resolves its `node` export
 * condition to @lit-labs/ssr-dom-shim, so the element constructs and
 * dispatches events under the plain node test environment — no jsdom and no
 * extra dependency needed to exercise what the view hands the panel.
 */
function viewWith(selection: WizardSelection): {
  element: ImcSettingsView;
  inner: WizardInternals;
} {
  const element = new ImcSettingsView();
  const inner = element as unknown as WizardInternals;
  inner._selection = selection;
  return { element, inner };
}

describe("the notifications section", () => {
  it("hands the panel the grouped calls, not one per event", () => {
    const { element, inner } = viewWith({
      recipients: ["phone"],
      events: ["watchdog"],
      priorities: {},
    });
    const dispatched: SetNotificationsCall[][] = [];
    element.addEventListener("imc-settings-save-notifications", (event) =>
      dispatched.push((event as CustomEvent<SetNotificationsCall[]>).detail),
    );

    inner._saveNotifications("en");

    expect(dispatched).toEqual([
      [
        { events: ["watchdog"], enabled: true, services: ["phone"] },
        {
          events: [
            "anomaly",
            "skipped",
            "interrupted",
            "cancelled",
            "completed",
            "sentinel",
            "session_overrun",
            "consumption_budget",
          ],
          enabled: false,
        },
      ],
    ]);
    expect(inner._saveError).toBeUndefined();
  });

  it("keeps the user in the wizard when an enabled event has no recipient", () => {
    const { element, inner } = viewWith({
      recipients: [],
      events: ["watchdog"],
      priorities: {},
    });
    let fired = false;
    element.addEventListener("imc-settings-save-notifications", () => (fired = true));

    inner._saveNotifications("en");

    // Nothing is sent, and the refusal is explained where the user is
    // standing rather than through a service-error toast over a form they
    // can no longer see.
    expect(fired).toBe(false);
    expect(inner._saveError).toBe("Choose at least one recipient before enabling an event.");
  });

  it("recognises a preset the selection already matches, whatever the order", () => {
    // `presetSelection` returns the backend's order and `selectionFromStatus`
    // the configured one, so the two agree as sets long before they agree as
    // lists. Comparing them as lists would leave every preset chip inert.
    expect(sameEventSet(["watchdog", "anomaly"], ["anomaly", "watchdog"])).toBe(true);
    expect(sameEventSet(["watchdog"], ["watchdog", "anomaly"])).toBe(false);
  });

  it("names the essential events that will not arrive, for every verdict", () => {
    // silent: nothing reaches anyone.
    expect(unreachableEssentials(essentialsStatus([]))).toEqual(ESSENTIALS);
    // partial: "completed" is unreachable here too, but it is not essential —
    // the banner warns about silence that matters, not every event left off.
    expect(unreachableEssentials(essentialsStatus(["watchdog"]))).toEqual([
      "anomaly",
      "sentinel",
      "interrupted",
    ]);
    // ok: nothing to say, which is exactly when the banner is not drawn.
    expect(unreachableEssentials(essentialsStatus(ESSENTIALS))).toEqual([]);
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
