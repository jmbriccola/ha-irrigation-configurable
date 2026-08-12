import { describe, it, expect } from "vitest";
import { parseExportedConfig } from "./config-read";

describe("parseExportedConfig", () => {
  it("parses options and zones", () => {
    const payload = JSON.stringify({
      options: { weather_entity: "weather.home", consumption_budget: { action: "reduce", reduce_pct: 40 } },
      zones: { z1: { name: "Prato", valve_entity: "valve.p", area_m2: 80 } },
    });
    const cfg = parseExportedConfig(payload);
    expect(cfg.options.weather_entity).toBe("weather.home");
    expect(cfg.options.consumption_budget?.reduce_pct).toBe(40);
    expect(cfg.zones["z1"]?.name).toBe("Prato");
  });
  it("tolerates missing options/zones", () => {
    const cfg = parseExportedConfig("{}");
    expect(cfg.options).toEqual({});
    expect(cfg.zones).toEqual({});
  });
});
