# Next-Run Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish, on an entity a card can always read, whether a zone would water if its programs fired right now — and if not, why.

**Architecture:** A pure synchronous `IrrigationRuntime.zone_next_run_verdict(zone)` that calls `build_session_plan` — the one place that decides run-or-skip — with the cached evaluation and the zone's spec, then aggregates. `ZoneStateSensor` publishes the result as a `next_run` object. The consumption budget's notifying check is split so a sensor read cannot dispatch a notification.

**Tech Stack:** Python 3.13 syntax type-checked at 3.14, Home Assistant 2026.7.2, pytest + pytest-homeassistant-custom-component, freezegun.

**Spec:** [`docs/superpowers/specs/2026-08-17-next-run-gates-design.md`](../specs/2026-08-17-next-run-gates-design.md) — read it alongside this plan.

## Global Constraints

- **The decision engine is not touched.** `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py` **and `engine/planner.py`** must be byte-identical at the end. Hashes are in `/tmp/engine-hashes-b2.txt`; the planner is included because "call it, do not alter it" is this branch's central claim.
- Code, comments and docstrings in **English**. No new HA translation keys: the verdict's vocabulary is card-localized, like the zone states and `degraded` keys.
- Python **3.13** syntax (ruff `target-version = "py313"`); mypy **strict** over `custom_components.irrigation_maestro` (tests not type-checked); ruff selects `E`, `I`, `RET`.
- **Run the bare command**: `pyproject.toml` sets `addopts = "-q"`, so `.venv/bin/pytest -q` prints no summary at all.
- **No frontend change.** `custom_components/irrigation_maestro/frontend/` stays untouched.
- Baseline: **831 passing** on `main` at 3.5.0.

---

### Task 1: Split the consumption budget's notifying check from its verdict

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py` (`_consumption_factor`, ~line 756)
- Test: `tests/components/test_budget.py` (append)

**Interfaces produced:** `_over_consumption_budget() -> bool`, `_consumption_gate() -> tuple[float, bool]`. Task 2 consumes `_consumption_gate`.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_budget.py`, matching whatever fixture that file already uses to build an over-budget hub (read its existing tests first and mirror them):

```python
async def test_the_consumption_gate_reports_without_notifying(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The notifying half and the reporting half are different jobs.

    The next-run verdict is computed inside a sensor attribute read, so a gate
    that notified would dispatch a budget notification because a card
    rendered -- a moment at which nothing about the budget happened.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Vasi", "valve.vasi", at="23:59")],
        options={"consumption_budget": {"liters_per_month": 1.0, "action": "suspend"}},
    )
    runtime = entry.runtime_data
    zone_id = next(iter(entry.subentries))
    runtime.state.add_water(zone_id, 500.0, day=dt_util.now().date(), estimated=False)

    events: list[Any] = []
    hass.bus.async_listen("irrigation_maestro_consumption_budget", events.append)

    gate = runtime._consumption_gate()
    await hass.async_block_till_done()

    assert gate == (1.0, True), "an over-budget suspend hub must still report suspend_all"
    assert events == [], "the gate must not fire the budget event"

    runtime._consumption_factor()
    await hass.async_block_till_done()

    assert len(events) == 1, "the notifying half must still notify"
```

The options key is `consumption_budget` (verified against `const.CONF_CONSUMPTION_BUDGET` and the existing tests in that file). Assert the gate's tuple, not just the absence of the event: a gate that returned the wrong verdict silently would otherwise pass.

- [ ] **Step 2: Run it and see it fail**

Run: `.venv/bin/pytest tests/components/test_budget.py -k consumption_gate`
Expected: `AttributeError: 'IrrigationRuntime' object has no attribute '_consumption_gate'`.

- [ ] **Step 3: Split the function**

In `runtime.py`, replace `_consumption_factor` with these three:

```python
    def _over_consumption_budget(self) -> bool:
        """Whether the month's litres have reached the configured budget.

        Short-circuits on an unconfigured budget, so an installation without
        one pays nothing for this check -- which matters because the next-run
        verdict calls it on every sensor attribute read, and
        consumption_used_liters walks the whole daily history.
        """
        budget = self.hub.consumption_budget_liters
        return budget is not None and self.consumption_used_liters() >= budget

    def _consumption_gate(self) -> tuple[float, bool]:
        """(duration_factor, suspend_all) from the consumption budget, silently.

        The pure half. It exists because the next-run verdict runs inside a
        sensor attribute read: the notifying version below would dispatch a
        budget notification because a card rendered, which is not a moment at
        which anything about the budget happened. Callers that are *acting* on
        the budget use _consumption_factor; callers that are only *reporting*
        it use this. Do not merge them back.
        """
        if not self._over_consumption_budget():
            return 1.0, False
        if self.hub.consumption_action == "reduce":
            return self.hub.consumption_reduce_pct / 100, False
        if self.hub.consumption_action == "suspend":
            return 1.0, True
        return 1.0, False

    def _consumption_factor(self) -> tuple[float, bool]:
        """(duration_factor, suspend_all), notifying once per period when over.

        The session paths use this: crossing the budget while deciding whether
        to water genuinely is an event.
        """
        if self._over_consumption_budget():
            self._notify_budget_exceeded_once()
        return self._consumption_gate()
```

- [ ] **Step 4: Run the test and the budget suite**

```bash
.venv/bin/pytest tests/components/test_budget.py
```
Expected: all pass, including the existing tests that assert the notification still fires on the session path.

- [ ] **Step 5: Lint, type-check, commit**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
git add custom_components/irrigation_maestro/runtime.py tests/components/test_budget.py
git commit -m "refactor(budget): the half that reports, and the half that notifies

_consumption_factor did both, and the next-run verdict needs the first from
inside a sensor attribute read -- where the second would dispatch a budget
notification because a card rendered. The pure half is now _consumption_gate;
the session paths keep the notifying wrapper, because crossing the budget
while deciding whether to water genuinely is an event."
```

---

### Task 2: The verdict, and publishing it on `zone_state`

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py` (add `zone_next_run_verdict`)
- Modify: `custom_components/irrigation_maestro/sensor.py` (`ZoneStateSensor._role_attributes`, line 239-247)
- Test: `tests/components/test_next_run_verdict.py` (new)

**Interfaces:** consumes `_consumption_gate` (Task 1), `build_session_plan` and `SkipReason` (both already imported in `runtime.py` at lines 50 and 49), `self._zone_spec`, `self._last_evaluation`. Produces `zone_next_run_verdict(zone: ZoneRuntime) -> dict[str, Any]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_next_run_verdict.py`. Model the fixtures on `tests/components/test_history_api.py` — same `setup_hub` / `zone_data` / `mock_weather` / `MockValvePark` helpers.

```python
"""Today's verdict: would this zone water if its programs fired right now."""

from typing import Any

from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


def _verdict(hass: HomeAssistant, zone_name: str) -> dict[str, Any]:
    """The next_run object from the named zone's zone_state attributes."""
    for state in hass.states.async_all("sensor"):
        if (
            state.attributes.get("maestro_role") == "zone_state"
            and state.attributes.get("zone_name") == zone_name
        ):
            return dict(state.attributes["next_run"])
    raise AssertionError(f"no zone_state sensor for {zone_name}")


async def _evaluated_hub(hass: HomeAssistant, zones: list[dict[str, Any]], **kw: Any) -> Any:
    """A hub that has run one evaluation, so the verdict is not `unknown`."""
    park = MockValvePark(hass)
    for zone in zones:
        park.add(zone["valve_entity"])
    mock_weather(hass, **kw)
    entry = await setup_hub(hass, zones)
    await hass.services.async_call(DOMAIN, "evaluate", {}, blocking=True, return_response=True)
    await hass.async_block_till_done()
    return entry


async def test_a_due_program_in_good_weather_would_run(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])

    verdict = _verdict(hass, "Vasi")

    assert verdict["verdict"] == "would_run"
    assert verdict["reason_key"] is None
    assert verdict["evaluated_at"] is not None
    assert [p["verdict"] for p in verdict["programs"]] == ["would_run"]


async def test_before_any_evaluation_the_verdict_is_unknown_not_a_guess(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """`unknown` is not `weather_unavailable`: that reason means an evaluation
    ran and could not reach the weather. This means none has run."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])

    verdict = _verdict(hass, "Vasi")

    assert verdict["verdict"] == "unknown"
    assert verdict["reason_key"] is None
    assert verdict["evaluated_at"] is None
    assert verdict["programs"] == []


async def test_a_disabled_zone_explains_itself_while_its_next_run_entity_is_unavailable(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The case this design exists for: HA publishes no attributes at all while
    an entity is unavailable, so the explanation cannot live on zone_next_run."""
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_zone_enabled(zone_id, False)
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    next_run_states = [
        s
        for s in hass.states.async_all("sensor")
        if s.attributes.get("maestro_role") == "zone_next_run"
    ]
    verdict = _verdict(hass, "Vasi")

    assert next_run_states == [], "an unavailable entity publishes no attributes, role included"
    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] == "zone_disabled"


async def test_a_program_not_scheduled_today_says_so(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    # START is a Friday; schedule the program on Monday only.
    await _evaluated_hub(
        hass,
        [zone_data("Vasi", "valve.vasi", at="23:59", calendar={"mode": "weekdays", "days": [0]})],
    )

    verdict = _verdict(hass, "Vasi")

    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] == "calendar_not_today"


async def test_two_programs_blocked_for_different_reasons_name_neither_at_zone_level(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Naming one would send the user to the wrong setting."""
    freezer.move_to(START)
    entry = await _evaluated_hub(
        hass,
        [
            zone_data(
                "Vasi",
                "valve.vasi",
                at="23:59",
                cycles=[
                    {
                        "id": "cy_a",
                        "name": "Monday only",
                        "enabled": True,
                        "trigger": {"kind": "time", "at": "23:59"},
                        "calendar": {"mode": "weekdays", "days": [0]},
                        "curve": {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0},
                    },
                    {
                        "id": "cy_b",
                        "name": "Disabled",
                        "enabled": True,
                        "trigger": {"kind": "time", "at": "23:59"},
                        "curve": {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0},
                    },
                ],
            )
        ],
    )
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_cycle_enabled(zone_id, "cy_b", False)
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    verdict = _verdict(hass, "Vasi")

    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] is None
    reasons = {p["reason_key"] for p in verdict["programs"]}
    assert reasons == {"calendar_not_today", "cycle_disabled"}


async def test_two_programs_blocked_for_the_same_reason_name_it_once(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_zone_enabled(zone_id, False)
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    verdict = _verdict(hass, "Vasi")

    assert verdict["reason_key"] == "zone_disabled"
    assert all(p["reason_key"] == "zone_disabled" for p in verdict["programs"])


async def test_evaluated_at_is_the_instant_of_the_evaluation_actually_used(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    stamp = entry.runtime_data._last_evaluation[0]

    assert _verdict(hass, "Vasi")["evaluated_at"] == stamp.isoformat()


async def test_reading_the_attributes_of_an_over_budget_hub_notifies_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The defect stated where a user would meet it, not at the helper."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Vasi", "valve.vasi", at="23:59")],
        options={"consumption_budget": {"liters_per_month": 1.0, "action": "suspend"}},
    )
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.add_water(zone_id, 500.0, day=dt_util.now().date(), estimated=False)
    await hass.services.async_call(DOMAIN, "evaluate", {}, blocking=True, return_response=True)
    await hass.async_block_till_done()

    events: list[Any] = []
    hass.bus.async_listen("irrigation_maestro_consumption_budget", events.append)
    for _ in range(3):
        entry.runtime_data.dispatch_update()
        await hass.async_block_till_done()

    assert events == [], "rendering a card must not fire a budget event"
```

Add `from homeassistant.util import dt as dt_util` to the imports. `START` is a **Friday** (`weekday() == 4`), verified, so a Monday-only calendar (`[0]`) is genuinely not today.

- [ ] **Step 2: Run them and see them fail**

Run: `.venv/bin/pytest tests/components/test_next_run_verdict.py`
Expected: `KeyError: 'next_run'` on every test that reads the attribute.

- [ ] **Step 3: Add the verdict to the runtime**

In `runtime.py`, beside `_zone_spec`:

```python
    def zone_next_run_verdict(self, zone: ZoneRuntime) -> dict[str, Any]:
        """Whether this zone would water if its programs fired right now.

        Deliberately about NOW, and not about the instant zone_next_run
        reports. The weather layer -- the immediate skips, the budget against
        the threshold, the consumption budget -- only exists in the present,
        and a future day's is not knowable. Every surface rendering this must
        word it in the present tense.

        The decision comes from build_session_plan, the one place that decides
        run-or-skip, rather than from a second derivation over the same
        inputs: two implementations of one decision are two answers that drift.

        Pure and synchronous -- the cached evaluation, the zone's spec, and the
        silent consumption gate. No I/O, and nothing here notifies.
        """
        cached = self._last_evaluation
        if cached is None:
            # Nothing has been evaluated yet: start-up, before the first
            # session or `evaluate` call. This is NOT weather_unavailable,
            # which means an evaluation ran and could not reach the weather.
            # Asserting either verdict on no information would be an answer
            # nobody has earned.
            return {
                "verdict": "unknown",
                "reason_key": None,
                "evaluated_at": None,
                "programs": [],
            }

        evaluated_at, evaluation = cached
        factor, suspend_all = self._consumption_gate()
        if suspend_all:
            evaluation = replace(evaluation, skip_reason=SkipReason.CONSUMPTION_BUDGET)
        plan = build_session_plan(
            self.hub.engine_params,
            evaluation,
            [self._zone_spec(zone, list(zone.config.cycles))],
            now=dt_util.now(),
            duration_factor=factor,
        )

        blocked = {item.cycle_id: str(item.reason) for item in plan.skipped}
        programs = [
            {
                "cycle_id": cycle.cycle_id,
                "verdict": "blocked" if cycle.cycle_id in blocked else "would_run",
                "reason_key": blocked.get(cycle.cycle_id),
            }
            for cycle in zone.config.cycles
        ]
        would_run = any(entry["verdict"] == "would_run" for entry in programs)
        reasons = {entry["reason_key"] for entry in programs}
        return {
            "verdict": "would_run" if would_run else "blocked",
            # Named only when every program agrees. A zone with a morning
            # program blocked by the calendar and an evening one blocked by the
            # budget is not "blocked because of the calendar", and a compact
            # card that said so would send the user to the wrong setting. A
            # zone with no programs at all lands here too: blocked, unnamed.
            "reason_key": reasons.pop() if not would_run and len(reasons) == 1 else None,
            "evaluated_at": evaluated_at.isoformat(),
            "programs": programs,
        }
```

`replace` is already imported in `runtime.py` (used at line 818); confirm and do not add a second import.

- [ ] **Step 4: Publish it on `zone_state`**

In `sensor.py`, inside `ZoneStateSensor._role_attributes`, add one entry to the `attributes` dict literal, after `"capabilities"`:

```python
            "next_run": runtime.zone_next_run_verdict(runtime.zones[self._zone_id]),
```

`self.zone_config` is not None at this point (the method early-returns above), so the zone is in `runtime.zones`.

- [ ] **Step 5: Run the tests**

```bash
.venv/bin/pytest tests/components/test_next_run_verdict.py
.venv/bin/pytest
```
Expected: the new file passes and the whole suite stays green. `test_entities.py` asserts the `zone_state` attribute set — if it enumerates keys exactly, add `next_run` there rather than loosening the assertion.

- [ ] **Step 6: Lint, type-check, commit**

```bash
.venv/bin/ruff check custom_components/irrigation_maestro tests
.venv/bin/ruff format custom_components/irrigation_maestro tests
.venv/bin/mypy
git add custom_components/irrigation_maestro/runtime.py custom_components/irrigation_maestro/sensor.py tests/components/test_next_run_verdict.py
git commit -m "feat(sensor): today's verdict, beside the instant and not folded into it

zone_next_run already resolves every gate that can be projected -- calendar,
season, suspension, pause, skip-today. What was missing cannot be projected:
the weather skips, the budget against the threshold, the consumption budget.
So the verdict is about NOW, and every surface must word it that way.

It goes on zone_state, not zone_next_run, because Home Assistant publishes no
attributes at all while an entity is unavailable -- and zone_next_run is
unavailable for a disabled zone, which is exactly when the explanation is the
only thing worth saying.

The zone-level reason is named only when every program agrees. Naming one of
several would send the user to the wrong setting."
```

---

### Task 3: Contract, memory, changelog, 3.6.0, and the verification

**Files:**
- Modify: `docs/design/card-contract.md`, `MEMORY.md`, `CHANGELOG.md`, `custom_components/irrigation_maestro/manifest.json`, `README.md`

- [ ] **Step 1: `docs/design/card-contract.md`**

Add `next_run` to the `zone_state` row's attribute list, then a `### Next-run verdict` subsection carrying: the JSON shape; the three `verdict` values with `unknown` explained as "nothing evaluated yet, and not `weather_unavailable`"; the rule that the instant lives on `zone_next_run` and is deliberately not duplicated; that the verdict is **about now** and must be worded in the present tense, never as a promise about the instant; that `evaluated_at` is the freshness and can be hours old between sessions, exactly as the hub's own budget/threshold/temperature sensors already are; and that the zone-level `reason_key` is `null` whenever the programs disagree, so a card must fall back to `programs[]` rather than invent a summary. Add `would_run` / `blocked` / `unknown` to the "Localizable keys" list.

- [ ] **Step 2: `MEMORY.md`** — the 3.6.0 entries under "Deliberate design decisions": the verdict is about now and cannot be about a future day; it lives on `zone_state` because an unavailable entity publishes no attributes; it calls the planner rather than re-deriving; `_consumption_factor` notifies and `_consumption_gate` does not, and they must not be merged back; the zone reason is named only on agreement.

  **This step is the lesson of 3.5.0**, where the plan's touch-point table omitted this file and the release nearly shipped without its entry.

- [ ] **Step 3: `README.md`** — one row in the degradation matrix: no evaluation yet → `next_run.verdict: unknown`, and a card must render it as "not yet evaluated", never as "will not water".

- [ ] **Step 4: `manifest.json` → 3.6.0, and a `## [3.6.0] - 2026-08-17` CHANGELOG section** in the 3.5.0 section's register: what is published, why it is about now, why it sits on `zone_state`, and that no future day's weather is claimed.

- [ ] **Step 5: Verify the engine is untouched**

```bash
sha256sum -c /tmp/engine-hashes-b2.txt
git diff --stat main -- custom_components/irrigation_maestro/engine/ custom_components/irrigation_maestro/frontend/
```
Expected: five `OK` lines and an empty diff. `engine/planner.py` is in that list on purpose.

- [ ] **Step 6: The declared mutation matrix**

Snapshot first (`cp -r custom_components /tmp/pre-mutation-b2`), then run each, one at a time, reverting between:

| # | Mutation | Expected |
|---|---|---|
| 1 | `zone_next_run_verdict`: `any(...)` → `all(...)` in `would_run` | KILLED |
| 2 | `zone_next_run_verdict`: `len(reasons) == 1` → `len(reasons) >= 1` | KILLED |
| 3 | `zone_next_run_verdict`: drop the `cached is None` guard's early return | KILLED |
| 4 | `_consumption_factor`: call `_consumption_gate` without the notify branch | KILLED |
| 5 | **Declared control** — a comment reworded in `zone_next_run_verdict` | **SURVIVES** |

If a 1–4 survives, that is a finding: write the test that kills it and say so. If 5 is killed, the harness is wrong. Afterwards `diff -r custom_components /tmp/pre-mutation-b2` — **verify the revert, do not assume it**.

- [ ] **Step 7: Full verification and commit**

```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest
```
Read the output; claim nothing you have not seen.

---

## Self-Review

**Spec coverage:** §1 (where published) → Task 2 Step 4. §2 (planner, not copied) → Task 2 Step 3. §2.1 (about now) → Task 2 Step 3 docstring + Task 3 Step 1. §3 (consumption split) → Task 1. §4 (shape) → Task 2. §4.1 (three verdicts, `unknown` ≠ `weather_unavailable`) → Task 2 Steps 1 and 3. §4.2 (`evaluated_at`) → Task 2. §4.3 (agreement rule, empty zone) → Task 2 Step 3 + tests. §5 (touch points) → Tasks 1–3. §6 (tests, hashes, matrix) → Tasks 1–3.

**Placeholder scan:** clean. The three lookups an earlier draft deferred are resolved against the running code: the budget options key is `consumption_budget` (an earlier draft said `consumption`, which would have silently configured no budget and made the notify tests vacuous); `START` is a Friday; and `test_entities.py` reads individual `zone_state` attributes rather than enumerating the key set, so adding `next_run` breaks nothing there. `replace` is already imported at `runtime.py:12`.

**Type consistency:** `zone_next_run_verdict(zone: ZoneRuntime)` takes the runtime object, not an id, in both its definition and its one call site. `_consumption_gate` returns `(float, bool)` and is unpacked as such. `_over_consumption_budget` returns `bool` and is used only in boolean position.
