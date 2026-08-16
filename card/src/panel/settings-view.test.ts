import { describe, expect, it } from "vitest";
import {
  ImcSettingsView,
  activateOnKey,
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

  it("maps every leak and water-supply field to its service key", () => {
    expect(
      buildValveSafetyPatch({
        leakAction: "close_and_block",
        leakThresholdLpm: 0.5,
        leakConfirmS: 300,
        leakRepeatMin: 360,
        requireWaterSupply: true,
        waterSupplyConfirmS: 180,
      }),
    ).toEqual({
      leak_action: "close_and_block",
      leak_threshold_lpm: 0.5,
      leak_confirm_s: 300,
      leak_repeat_min: 360,
      require_water_supply: true,
      water_supply_confirm_s: 180,
    });
  });

  it("passes `false` through rather than treating it as empty", () => {
    // The boolean's version of the zero trap above, and it points the
    // dangerous way: dropping `false` as falsy would leave the gate switched
    // ON while the form showed it off, so the user would think they had
    // stopped the component refusing to water and it would carry on.
    expect(buildValveSafetyPatch({ requireWaterSupply: false })).toEqual({
      require_water_supply: false,
    });
  });

  it("passes a zero reminder interval through, which switches reminders off", () => {
    expect(buildValveSafetyPatch({ leakRepeatMin: 0 })).toEqual({ leak_repeat_min: 0 });
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

/** The valve-safety drawer's save, and the state it saves from. */
function savedValveSafety(options: Record<string, unknown>): Record<string, unknown> | undefined {
  const element = new ImcSettingsView();
  element.options = options;
  (element as unknown as { willUpdate(changed: Map<string, unknown>): void }).willUpdate(
    new Map([["options", undefined]]),
  );
  let detail: Record<string, unknown> | undefined;
  element.addEventListener("imc-settings-save-valve-safety", (event) => {
    detail = (event as CustomEvent<Record<string, unknown>>).detail;
  });
  (element as unknown as { _saveValveSafety(): void })._saveValveSafety();
  return detail;
}

describe("the leak settings in the advanced drawer", () => {
  it("round-trips what is stored through seeding, untouched", () => {
    // Both of these are sent on EVERY save of this drawer — a select always
    // has a value and a checkbox always has a state — so they are only safe
    // because seeding puts the stored values back into the form first. Drop
    // the seeding lines and saving an unrelated field in this drawer rewrites
    // the hub's leak behaviour.
    const detail = savedValveSafety({
      leak_action: "close_and_block",
      require_water_supply: false,
      leak_repeat_min: 0,
      leak_confirm_s: 600,
    });
    expect(detail?.["leak_action"]).toBe("close_and_block");
    expect(detail?.["require_water_supply"]).toBe(false);
    expect(detail?.["leak_repeat_min"]).toBe(0);
    expect(detail?.["leak_confirm_s"]).toBe(600);
  });

  it("shows the backend's own defaults, so an untouched save changes nothing", () => {
    // A hub that has never been told: `leak_action` defaults to `close` and
    // `require_water_supply` to True in models.py. The form must display the
    // same two values, or the first save of anything in this drawer silently
    // moves the installation onto a different leak policy.
    const detail = savedValveSafety({});
    expect(detail?.["leak_action"]).toBe("close");
    expect(detail?.["require_water_supply"]).toBe(true);
  });

  it("keeps an unrecognised stored action out of the form", () => {
    // `leak_action` falls back to the default silently in the backend too,
    // so a value written by import_config or Developer Tools must not be
    // offered back as if it were a real choice — the select would show
    // nothing selected and save whatever the first option happened to be.
    expect(savedValveSafety({ leak_action: "explode" })?.["leak_action"]).toBe("close");
  });
});

/**
 * Every value bound to a `step=` attribute anywhere in a lit template tree,
 * in render order.
 *
 * Reading the template rather than a DOM: these tests run without jsdom, and
 * a `TemplateResult`'s `strings`/`values` pair is exactly what lit will
 * commit. The chunk preceding a binding ends with `step=` for precisely the
 * one attribute we are after, so this cannot be fooled by another numeric
 * binding on the same element.
 */
function stepsIn(node: unknown): unknown[] {
  const found: unknown[] = [];
  if (Array.isArray(node)) {
    for (const item of node) found.push(...stepsIn(item));
    return found;
  }
  if (!node || typeof node !== "object") return found;
  const template = node as { strings?: readonly string[]; values?: unknown[] };
  if (!template.strings || !template.values) return found;
  template.values.forEach((value, index) => {
    if (template.strings?.[index]?.trimEnd().endsWith("step=")) found.push(value);
    found.push(...stepsIn(value));
  });
  return found;
}

describe("the number fields' step", () => {
  const drawer = (): unknown =>
    (new ImcSettingsView() as unknown as { _renderLeakFields(lang: string): unknown })
      ._renderLeakFields("en");

  it("lets the litres-per-minute threshold hold its own default", () => {
    // `<input type="number">` defaults to step="1". The leak threshold's
    // default is 0.5, so under that step the field is `:stepMismatch` — the
    // browser marks it invalid and the spinner steps straight over the value
    // the backend actually ships with. Every other field in this drawer is
    // whole seconds or minutes, which is why this went unnoticed until a
    // decimal arrived.
    expect(stepsIn(drawer())).toContain(0.1);
  });

  it("leaves the whole-number fields stepping in whole numbers", () => {
    // The counterpart: a blanket 0.1 would offer a spinner running in tenths
    // of a second through the confirmation windows beside it.
    const steps = stepsIn(drawer());
    expect(steps.filter((step) => step === 1).length).toBeGreaterThanOrEqual(3);
  });
});

describe("a control that is not a real button", () => {
  /** A keydown carrying the one method the handler is allowed to call on it. */
  function keydown(key: string): { event: KeyboardEvent; prevented: () => boolean } {
    let prevented = false;
    const event = {
      key,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as KeyboardEvent;
    return { event, prevented: () => prevented };
  }

  it("activates on the two keys its role promises", () => {
    // The preset chips, the priority chips and the group headers are spans and
    // divs carrying role="button" and tabindex="0". That promise is only kept
    // if Enter and Space actually do what a click does.
    for (const key of ["Enter", " "]) {
      let activated = 0;
      const { event, prevented } = keydown(key);
      activateOnKey(() => (activated += 1))(event);
      expect(activated).toBe(1);
      // Space scrolls the page otherwise, out from under the control just used.
      expect(prevented()).toBe(true);
    }
  });

  it("ignores every other key, so typing and tabbing still work", () => {
    let activated = 0;
    const { event, prevented } = keydown("Tab");
    activateOnKey(() => (activated += 1))(event);
    expect(activated).toBe(0);
    expect(prevented()).toBe(false);
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
            "leak",
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

  it("asks for the status again when the read that failed is retried", () => {
    // The only way out of a failed first read: without this event the
    // notifications section is stuck on its message until the user leaves
    // settings and comes back.
    const element = new ImcSettingsView();
    let fired = 0;
    element.addEventListener("imc-settings-retry-notifications", () => (fired += 1));

    (element as unknown as { _retryNotifyStatus(): void })._retryNotifyStatus();

    expect(fired).toBe(1);
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
