import { describe, it, expect } from "vitest";
import { disagreeingPrograms, todayVerdict, verdictAge } from "./next-run-block";

const NOW = Date.parse("2026-08-17T12:00:00Z");

describe("disagreeingPrograms", () => {
  it("lists the blocked programs when the zone-level reason is empty", () => {
    // A null zone reason with a blocked verdict is the contract's way of
    // saying "the programs disagree" -- the card must show them rather than
    // invent a summary that would send the user to the wrong setting.
    const programs = disagreeingPrograms({
      verdict: "blocked",
      reason_key: null,
      programs: [
        { cycle_id: "a", verdict: "blocked", reason_key: "calendar_not_today" },
        { cycle_id: "b", verdict: "blocked", reason_key: "cycle_disabled" },
      ],
    });

    expect(programs.map((p) => p.reason_key)).toEqual(["calendar_not_today", "cycle_disabled"]);
  });

  it("lists nothing when the zone-level reason already names it", () => {
    expect(
      disagreeingPrograms({
        verdict: "blocked",
        reason_key: "zone_disabled",
        programs: [{ cycle_id: "a", verdict: "blocked", reason_key: "zone_disabled" }],
      }),
    ).toEqual([]);
  });

  it("lists nothing when the zone would run", () => {
    expect(
      disagreeingPrograms({
        verdict: "would_run",
        reason_key: null,
        programs: [
          { cycle_id: "a", verdict: "would_run", reason_key: null },
          { cycle_id: "b", verdict: "blocked", reason_key: "calendar_not_today" },
        ],
      }),
    ).toEqual([]);
  });

  it("lists nothing for an unknown verdict or a missing one", () => {
    expect(disagreeingPrograms({ verdict: "unknown", programs: [] })).toEqual([]);
    expect(disagreeingPrograms(undefined)).toEqual([]);
  });

  it("skips programs that would run, even inside a blocked zone's list", () => {
    const programs = disagreeingPrograms({
      verdict: "blocked",
      reason_key: null,
      programs: [
        { cycle_id: "a", verdict: "blocked", reason_key: "wind" },
        { cycle_id: "b", verdict: "would_run", reason_key: null },
      ],
    });

    expect(programs).toHaveLength(1);
    expect(programs[0]?.cycle_id).toBe("a");
  });
});

describe("verdictAge", () => {
  it("says nothing when there is nothing to age", () => {
    expect(verdictAge("en", null, NOW)).toBeNull();
    expect(verdictAge("en", undefined, NOW)).toBeNull();
    expect(verdictAge("en", "not-a-date", NOW)).toBeNull();
  });

  it("scales from minutes to days, because the value is routinely hours old", () => {
    // Nothing re-evaluates on a timer: between sessions the cached evaluation
    // is as old as the last session, and the reader has to see that.
    expect(verdictAge("it", "2026-08-17T11:59:40Z", NOW)).toBe("valutato ora");
    expect(verdictAge("it", "2026-08-17T11:30:00Z", NOW)).toBe("valutato 30 min fa");
    expect(verdictAge("it", "2026-08-17T10:00:00Z", NOW)).toBe("valutato 2 h fa");
    expect(verdictAge("it", "2026-08-15T12:00:00Z", NOW)).toBe("valutato 2 g fa");
    expect(verdictAge("en", "2026-08-17T10:00:00Z", NOW)).toBe("evaluated 2 h ago");
  });

  it("never reports a negative age from a clock that ran backwards", () => {
    expect(verdictAge("it", "2026-08-17T12:30:00Z", NOW)).toBe("valutato ora");
  });
});

describe("todayVerdict", () => {
  it("reads a verdict the backend actually produced", () => {
    expect(todayVerdict({ verdict: "would_run" })).toBe("would_run");
    expect(todayVerdict({ verdict: "blocked", reason_key: "wind" })).toBe("blocked");
    expect(todayVerdict({ verdict: "unknown" })).toBe("unknown");
  });

  it("falls back to unknown when the zone published no verdict at all", () => {
    // An older backend, or an attribute lost to a partial refresh. Falling
    // through to "blocked" would render "it would not water" on the strength
    // of nothing — a verdict nobody produced, which is the one thing this
    // feature exists to refuse. A mutation matrix caught this unpinned.
    expect(todayVerdict(undefined)).toBe("unknown");
    expect(todayVerdict({})).toBe("unknown");
  });

  it("treats a value it has never seen as unknown rather than as a refusal", () => {
    expect(todayVerdict({ verdict: "deferred" })).toBe("unknown");
  });
});
