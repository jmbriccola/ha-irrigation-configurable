# Guided Notification Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take a user from "I configured nothing" to "the right notifications reach me" through a guided path in the panel, and make the mute state impossible to reach silently.

**Architecture:** One event taxonomy in `notify.py` (`ESSENTIAL_EVENTS` for what must arrive, `EVENT_GROUPS` for how the wizard browses) plus one pure evaluator, `evaluate_notifications`, that produces the verdict consumed by Repairs, diagnostics, the status service and the panel banner — so "mute" has exactly one implementation. Validation moves from the payload to the merged result, closing the enabled-with-no-recipients hole for partial updates too. The panel's flat nine-row section becomes a three-step wizard whose recipient list comes from the `notify.*` services actually registered.

**Tech Stack:** Python 3.13-compatible syntax (mypy parses at 3.14), Home Assistant 2025.7+ APIs, voluptuous schemas, `homeassistant.helpers.issue_registry`, pytest + pytest-homeassistant-custom-component, Lit 3 + TypeScript + Vite + vitest for the card.

**Spec:** `docs/superpowers/specs/2026-08-13-notification-wizard-design.md`

## Global Constraints

- Branch: `feat/notification-wizard`, branched from `main`. Feature B (flow sensor units) is a separate branch and must not appear here.
- Code, comments and docstrings in **English**. Translations complete in `custom_components/irrigation_maestro/translations/en.json` **and** `it.json`; the card has its own IT+EN layer in `card/src/localize/{en,it}.ts`.
- Everything async, no blocking I/O, no YAML configuration.
- Every new service must be declared in `services.yaml` **and** registered in `async_setup_services` — two distinct places in the file.
- Backwards compatible: existing configurations keep loading. No config-entry version bump; stored `notify.`-prefixed recipients are repaired at read time, not migrated.
- **Do not touch the decision engine**: `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py`, weights, thresholds, water budget, forecast credit, weighted temperature, immediate skips, `PRESET_POTS` / `PRESET_LAWN` control points.
- Line length 100, ruff `target-version = py313`, mypy strict.
- Commands: `.venv/bin/pytest`, `.venv/bin/ruff check .`, `.venv/bin/ruff format --check .`, `.venv/bin/mypy`, `npm --prefix card run test`, `npm --prefix card run typecheck`, `npm --prefix card run build`.
- The whole existing suite must stay green. Two existing tests encode the broken `notify.`-prefixed storage convention and are corrected in Task 3 with the reason in the commit message.

---

### Task 1: Event taxonomy and the pure status evaluator

**Files:**
- Modify: `custom_components/irrigation_maestro/notify.py:20-31` (constants block)
- Test: `tests/components/test_notify.py` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `GROUP_CRITICAL`, `GROUP_OPERATIONAL`, `GROUP_INFORMATIONAL`, `EVENT_GROUPS: dict[str, tuple[str, ...]]`, `ALL_EVENTS: tuple[str, ...]`, `ESSENTIAL_EVENTS: frozenset[str]`, `PRIORITY_NORMAL: str`, `normalize_service(raw: str) -> str`, `default_priority(event_key: str) -> str`, `EventStatus`, `NotificationStatus`, `evaluate_notifications(config: Mapping[str, Any], known_services: Collection[str] | None = None) -> NotificationStatus`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_notify.py`:

```python
"""The notification taxonomy and the mute verdict.

The verdict has exactly one implementation because four things depend on it:
the Repairs issues, the diagnostics payload, the notification_status service
and the panel banner. A second copy is how they drift apart.
"""

from custom_components.irrigation_maestro.notify import (
    ALL_EVENTS,
    ESSENTIAL_EVENTS,
    EVENT_ANOMALY,
    EVENT_COMPLETED,
    EVENT_GROUPS,
    EVENT_INTERRUPTED,
    EVENT_SENTINEL,
    EVENT_WATCHDOG,
    PRIORITY_HIGH,
    PRIORITY_NORMAL,
    default_priority,
    evaluate_notifications,
    normalize_service,
)


def test_the_groups_partition_every_event() -> None:
    grouped = [event for events in EVENT_GROUPS.values() for event in events]
    assert sorted(grouped) == sorted(ALL_EVENTS)
    assert len(grouped) == len(set(grouped))  # no event in two groups


def test_the_essential_events_are_the_four_an_irrigation_system_cannot_miss() -> None:
    assert ESSENTIAL_EVENTS == frozenset(
        {EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED}
    )
    assert ESSENTIAL_EVENTS <= set(ALL_EVENTS)


def test_essential_events_default_to_high_priority() -> None:
    assert default_priority(EVENT_WATCHDOG) == PRIORITY_HIGH
    assert default_priority(EVENT_COMPLETED) == PRIORITY_NORMAL


def test_normalize_service_strips_the_domain_the_placeholder_taught_users_to_type() -> None:
    # The panel placeholder said "notify.mobile_app_phone", but Notifier calls
    # notify.<service> -- the stored value must be the bare service name.
    assert normalize_service("notify.mobile_app_phone") == "mobile_app_phone"
    assert normalize_service("  mobile_app_phone  ") == "mobile_app_phone"
    assert normalize_service("notify_group") == "notify_group"  # not a prefix


def test_no_configuration_at_all_is_silent_and_raises_nothing() -> None:
    status = evaluate_notifications({})
    assert status.verdict == "silent"
    assert status.enabled_without_target == ()


def test_enabled_with_an_empty_recipient_list_is_reported() -> None:
    # The exact shape a field install reached: configured-looking, mute.
    status = evaluate_notifications({EVENT_INTERRUPTED: {"enabled": True, "services": []}})
    assert status.enabled_without_target == (EVENT_INTERRUPTED,)
    assert status.verdict == "silent"


def test_all_four_essentials_covered_is_ok() -> None:
    config = {
        event: {"enabled": True, "services": ["phone"]} for event in sorted(ESSENTIAL_EVENTS)
    }
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.verdict == "ok"


def test_some_essentials_covered_is_partial() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["phone"]}}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.verdict == "partial"


def test_a_recipient_that_is_not_registered_does_not_count_as_covered() -> None:
    config = {
        event: {"enabled": True, "services": ["gone"]} for event in sorted(ESSENTIAL_EVENTS)
    }
    status = evaluate_notifications(config, known_services=set())
    assert status.verdict == "silent"
    assert status.unreachable == {"gone": tuple(sorted(ESSENTIAL_EVENTS))}


def test_without_a_service_registry_nothing_is_asserted_to_be_missing() -> None:
    # Called at setup, before other integrations have registered their notify
    # services: absence of proof is not proof of absence.
    config = {event: {"enabled": True, "services": ["phone"]} for event in sorted(ESSENTIAL_EVENTS)}
    status = evaluate_notifications(config)
    assert status.verdict == "ok"
    assert status.unreachable == {}


def test_stored_recipients_keep_working_when_they_carry_the_notify_prefix() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["notify.phone"]}}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.per_event[EVENT_WATCHDOG].services == ("phone",)
    assert status.unreachable == {}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_notify.py -v`
Expected: FAIL with `ImportError: cannot import name 'ALL_EVENTS'`.

- [ ] **Step 3: Implement the taxonomy and the evaluator**

In `custom_components/irrigation_maestro/notify.py`, extend the imports and replace the constants block. Keep `PRIORITY_HIGH` and the nine `EVENT_*` constants exactly as they are — they are imported elsewhere.

```python
from collections.abc import Callable, Collection, Mapping
from dataclasses import dataclass
from typing import Any, Final

PRIORITY_HIGH: Final = "high"
PRIORITY_NORMAL: Final = "normal"

# ... the nine EVENT_* constants stay unchanged ...

#: Presentation only: the three severity groups the wizard browses by.
GROUP_CRITICAL: Final = (EVENT_WATCHDOG, EVENT_ANOMALY)
GROUP_OPERATIONAL: Final = (EVENT_SKIPPED, EVENT_INTERRUPTED, EVENT_CANCELLED)
GROUP_INFORMATIONAL: Final = (
    EVENT_COMPLETED,
    EVENT_SENTINEL,
    EVENT_SESSION_OVERRUN,
    EVENT_CONSUMPTION_BUDGET,
)
EVENT_GROUPS: Final[dict[str, tuple[str, ...]]] = {
    "critical": GROUP_CRITICAL,
    "operational": GROUP_OPERATIONAL,
    "informational": GROUP_INFORMATIONAL,
}
ALL_EVENTS: Final = GROUP_CRITICAL + GROUP_OPERATIONAL + GROUP_INFORMATIONAL

#: The events that must reach the user. Deliberately NOT one of the display
#: groups: it spans all three. One set with four consumers -- the defaults the
#: wizard proposes, the events whose default priority is high, the events whose
#: vanished recipient raises a repair issue, and the definition of "mute".
ESSENTIAL_EVENTS: Final = frozenset(
    {EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED}
)

_GROUP_OF: Final = {event: group for group, events in EVENT_GROUPS.items() for event in events}


def normalize_service(raw: str) -> str:
    """The bare notify service name, however the user wrote it.

    ``Notifier`` calls ``notify.<service>``, so a stored "notify.phone" is
    invoked as ``notify.notify.phone`` and silently never arrives. Normalising
    on read as well as on write repairs configurations already stored that way
    without a migration.
    """
    return raw.strip().removeprefix("notify.")


def default_priority(event_key: str) -> str:
    """High for the events that must arrive, normal for the rest."""
    return PRIORITY_HIGH if event_key in ESSENTIAL_EVENTS else PRIORITY_NORMAL


@dataclass(frozen=True, slots=True)
class EventStatus:
    """What one event will actually do."""

    event: str
    group: str
    enabled: bool
    services: tuple[str, ...]
    missing: tuple[str, ...]
    priority: str
    essential: bool

    @property
    def reachable(self) -> bool:
        """Enabled AND at least one recipient that still exists."""
        return self.enabled and bool(set(self.services) - set(self.missing))

    def as_dict(self) -> dict[str, Any]:
        return {
            "event": self.event,
            "group": self.group,
            "enabled": self.enabled,
            "services": list(self.services),
            "missing": list(self.missing),
            "priority": self.priority,
            "essential": self.essential,
            "reachable": self.reachable,
        }


@dataclass(frozen=True, slots=True)
class NotificationStatus:
    """The one verdict Repairs, diagnostics, the service and the panel share."""

    verdict: str  # "ok" | "partial" | "silent"
    per_event: dict[str, EventStatus]
    enabled_without_target: tuple[str, ...]
    unreachable: dict[str, tuple[str, ...]]

    def as_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "groups": {group: list(events) for group, events in EVENT_GROUPS.items()},
            "recommended": sorted(ESSENTIAL_EVENTS),
            "enabled_without_target": list(self.enabled_without_target),
            "unreachable": {name: list(events) for name, events in self.unreachable.items()},
            "events": [self.per_event[event].as_dict() for event in ALL_EVENTS],
        }


def evaluate_notifications(
    config: Mapping[str, Any], known_services: Collection[str] | None = None
) -> NotificationStatus:
    """Describe what the current configuration will and will not deliver.

    ``known_services`` is optional on purpose. At setup time other integrations
    may not have registered their notify services yet, and calling a recipient
    missing then would be a false alarm; passing None asserts nothing about
    existence and only judges the configuration itself.
    """
    per_event: dict[str, EventStatus] = {}
    enabled_without_target: list[str] = []
    unreachable: dict[str, list[str]] = {}

    for event in ALL_EVENTS:
        raw = config.get(event) or {}
        enabled = bool(raw.get(CONF_NOTIFY_ENABLED, False))
        services = tuple(
            dict.fromkeys(
                normalize_service(str(name)) for name in raw.get(CONF_NOTIFY_SERVICES, [])
            )
        )
        if known_services is None:
            missing: tuple[str, ...] = ()
        else:
            missing = tuple(name for name in services if name not in known_services)
        essential = event in ESSENTIAL_EVENTS
        per_event[event] = EventStatus(
            event=event,
            group=_GROUP_OF[event],
            enabled=enabled,
            services=services,
            missing=missing,
            priority=str(raw.get(CONF_NOTIFY_PRIORITY, default_priority(event))),
            essential=essential,
        )
        if enabled and not services:
            enabled_without_target.append(event)
        if enabled and essential:
            for name in missing:
                unreachable.setdefault(name, []).append(event)

    covered = sum(1 for event in ESSENTIAL_EVENTS if per_event[event].reachable)
    if covered == 0:
        verdict = "silent"
    elif covered == len(ESSENTIAL_EVENTS):
        verdict = "ok"
    else:
        verdict = "partial"

    return NotificationStatus(
        verdict=verdict,
        per_event=per_event,
        enabled_without_target=tuple(enabled_without_target),
        unreachable={name: tuple(sorted(events)) for name, events in unreachable.items()},
    )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_notify.py -v`
Expected: PASS, 11 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/notify.py tests/components/test_notify.py
git commit -m "feat(notify): one taxonomy and one mute verdict

ESSENTIAL_EVENTS is deliberately not one of the three display groups: the
events an irrigation system must never miss span all three. Keeping them
separate lets one set drive the proposed defaults, the default priority, the
missing-recipient repair and the definition of mute, instead of four lists
that drift.

evaluate_notifications takes known_services as optional because at setup time
other integrations may not have registered their notify services yet; absence
of proof must not become a false alarm."
```

---

### Task 2: Notifier sends to the right target, and says so when it cannot

**Files:**
- Modify: `custom_components/irrigation_maestro/notify.py:40-71` (`async_notify`)
- Test: `tests/components/test_notify.py` (append)

**Interfaces:**
- Consumes: `normalize_service`, `default_priority`, `ESSENTIAL_EVENTS` from Task 1.
- Produces: repair issue id format `notify_target_missing_<service>`; `Notifier.__init__` signature unchanged (`hass`, `config_getter`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_notify.py`:

```python
from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.notify import Notifier
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import issue_registry as ir


def _notifier(hass: HomeAssistant, config: dict[str, Any]) -> Notifier:
    return Notifier(hass, lambda: config)


def _record_notify(hass: HomeAssistant, service: str) -> list[ServiceCall]:
    calls: list[ServiceCall] = []

    async def handler(call: ServiceCall) -> None:
        calls.append(call)

    hass.services.async_register("notify", service, handler)
    return calls


async def test_a_stored_notify_prefix_still_reaches_the_target(hass: HomeAssistant) -> None:
    calls = _record_notify(hass, "phone")
    notifier = _notifier(hass, {EVENT_WATCHDOG: {"enabled": True, "services": ["notify.phone"]}})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()
    assert len(calls) == 1


async def test_essential_events_carry_the_high_priority_payload_by_default(
    hass: HomeAssistant,
) -> None:
    calls = _record_notify(hass, "phone")
    notifier = _notifier(hass, {EVENT_WATCHDOG: {"enabled": True, "services": ["phone"]}})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()
    assert calls[0].data["data"]["importance"] == "high"


async def test_a_non_essential_event_stays_normal_by_default(hass: HomeAssistant) -> None:
    calls = _record_notify(hass, "phone")
    notifier = _notifier(hass, {EVENT_COMPLETED: {"enabled": True, "services": ["phone"]}})
    await notifier.async_notify(EVENT_COMPLETED, title="t", message="m")
    await hass.async_block_till_done()
    assert "data" not in calls[0].data


async def test_a_vanished_recipient_on_an_essential_event_raises_a_repair(
    hass: HomeAssistant,
) -> None:
    notifier = _notifier(hass, {EVENT_WATCHDOG: {"enabled": True, "services": ["gone"]}})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notify_target_missing_gone") is not None


async def test_a_vanished_recipient_on_an_informational_event_only_warns(
    hass: HomeAssistant,
) -> None:
    notifier = _notifier(hass, {EVENT_COMPLETED: {"enabled": True, "services": ["gone"]}})
    await notifier.async_notify(EVENT_COMPLETED, title="t", message="m")
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notify_target_missing_gone") is None


async def test_the_repair_is_withdrawn_once_the_target_is_back(hass: HomeAssistant) -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["phone"]}}
    notifier = _notifier(hass, config)
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notify_target_missing_phone") is not None

    _record_notify(hass, "phone")
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()
    assert registry.async_get_issue(DOMAIN, "notify_target_missing_phone") is None


async def test_an_event_with_no_configuration_sends_nothing_and_raises_nothing(
    hass: HomeAssistant,
) -> None:
    notifier = _notifier(hass, {})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()


@pytest.mark.parametrize("services", [[], ["phone"]])
async def test_a_disabled_event_never_sends(hass: HomeAssistant, services: list[str]) -> None:
    calls = _record_notify(hass, "phone")
    notifier = _notifier(hass, {EVENT_WATCHDOG: {"enabled": False, "services": services}})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()
    assert calls == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_notify.py -v`
Expected: the four new behaviours FAIL — no repair issue is created, and `notify.phone` is called as `notify.notify.phone`.

- [ ] **Step 3: Rewrite `async_notify`**

Replace the body of `Notifier.async_notify` in `custom_components/irrigation_maestro/notify.py`:

```python
    async def async_notify(
        self,
        event_key: str,
        *,
        title: str,
        message: str,
        force_priority: str | None = None,
    ) -> None:
        """Send one notification for an event, if configured."""
        config = self._config_getter().get(event_key, {})
        if not config.get(CONF_NOTIFY_ENABLED, False):
            return
        priority = (
            force_priority
            or config.get(CONF_NOTIFY_PRIORITY)
            or default_priority(event_key)
        )
        data: dict[str, Any] = {"title": title, "message": message}
        if priority == PRIORITY_HIGH:
            # Best-effort urgency hints (understood by mobile_app targets).
            data["data"] = {
                "tag": f"irrigation_maestro_{event_key}",
                "importance": "high",
                "priority": "high",
                "ttl": 0,
            }
        essential = event_key in ESSENTIAL_EVENTS
        for raw in config.get(CONF_NOTIFY_SERVICES, []):
            # Normalised on read as well as on write: a configuration stored
            # before the wizard may carry the "notify." prefix the old field's
            # placeholder taught, which would be invoked as notify.notify.x.
            service = normalize_service(str(raw))
            # Services are validated at send time: the target may have been
            # removed since it was configured (§4).
            if not self._hass.services.has_service("notify", service):
                _LOGGER.warning("Notify service notify.%s no longer exists; skipping", service)
                if essential:
                    # A log line is not enough for the events that exist to
                    # report that something went wrong.
                    ir.async_create_issue(
                        self._hass,
                        DOMAIN,
                        f"notify_target_missing_{service}",
                        is_fixable=False,
                        severity=ir.IssueSeverity.ERROR,
                        translation_key="notify_target_missing",
                        translation_placeholders={"service": service, "event": event_key},
                    )
                continue
            try:
                await self._hass.services.async_call("notify", service, data, blocking=False)
            except Exception:
                _LOGGER.exception("Failed to send notification via notify.%s", service)
            else:
                ir.async_delete_issue(self._hass, DOMAIN, f"notify_target_missing_{service}")
```

Add the imports this needs at the top of the file:

```python
from homeassistant.helpers import issue_registry as ir

from .const import CONF_NOTIFY_ENABLED, CONF_NOTIFY_PRIORITY, CONF_NOTIFY_SERVICES, DOMAIN
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_notify.py -v`
Expected: PASS.

- [ ] **Step 5: Run the full suite — the priority default changed for four events**

Run: `.venv/bin/pytest -q`
Expected: PASS. If a session or safety test asserts a payload without `data` for `interrupted`, `anomaly`, `watchdog` or `sentinel`, that assertion encoded the old default and must be updated to expect the high-priority payload.

- [ ] **Step 6: Lint and typecheck**

Run: `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/notify.py tests/components/test_notify.py
git commit -m "fix(notify): reach the target, and raise a repair when it is gone

Notifier calls notify.<service>, but the panel field's placeholder read
notify.mobile_app_phone -- a user following it stored a name the integration
then invoked as notify.notify.mobile_app_phone, which never arrives and only
logs a warning. Normalising on read repairs those configurations without a
migration.

A vanished recipient on watchdog/anomaly/sentinel/interrupted now opens a
Repairs issue instead of only logging: these are the events that exist to
report that something went wrong, so losing them silently defeats their
purpose. The issue is withdrawn on the first successful send."
```

---

### Task 3: `set_notifications` refuses configurations that deliver nothing

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py:368-380` (`_NOTIFY_EVENTS`), the `_SET_NOTIFICATIONS_SCHEMA` block, `_async_set_notifications:1157-1177`
- Modify: `custom_components/irrigation_maestro/services.yaml:620-644`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Modify: `tests/components/test_services_settings.py:110-155`
- Test: `tests/components/test_services_settings.py` (append)

**Interfaces:**
- Consumes: `ALL_EVENTS`, `ESSENTIAL_EVENTS`, `normalize_service`, `PRIORITY_HIGH`, `PRIORITY_NORMAL` from Task 1.
- Produces: service `irrigation_maestro.set_notifications` accepting `event` XOR `events`, plus `enabled`, `services`, `priority`; exception translation keys `notify_enabled_without_target` and `invalid_notify_service`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_services_settings.py`:

```python
from homeassistant.exceptions import ServiceValidationError


async def test_enabling_an_event_with_no_recipients_is_refused(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_notifications",
            {"event": "watchdog", "enabled": True, "services": []},
            blocking=True,
        )


async def test_enabling_an_event_whose_stored_list_is_empty_is_refused(
    hass: HomeAssistant,
) -> None:
    # The field install's exact shape. The call only flips `enabled`, so
    # validating the payload alone would let it through -- the merged result
    # is what has to be judged.
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": False, "services": []}}},
    )
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "set_notifications", {"event": "interrupted", "enabled": True}, blocking=True
        )
    assert entry.options["notifications"]["interrupted"]["enabled"] is False


async def test_a_recipient_is_stored_without_the_notify_domain(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {"event": "watchdog", "enabled": True, "services": ["notify.mobile_app_pixel"]},
        blocking=True,
    )
    assert entry.options["notifications"]["watchdog"]["services"] == ["mobile_app_pixel"]


async def test_a_recipient_that_is_not_a_service_name_is_refused(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_notifications",
            {"event": "watchdog", "enabled": True, "services": ["Mobile App!"]},
            blocking=True,
        )


async def test_several_events_can_be_set_in_one_call(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {
            "events": ["watchdog", "anomaly", "sentinel", "interrupted"],
            "enabled": True,
            "services": ["phone"],
            "priority": "high",
        },
        blocking=True,
    )
    stored = entry.options["notifications"]
    assert sorted(stored) == ["anomaly", "interrupted", "sentinel", "watchdog"]
    assert stored["anomaly"] == {"enabled": True, "services": ["phone"], "priority": "high"}


async def test_a_multi_event_call_writes_nothing_when_one_event_would_be_mute(
    hass: HomeAssistant,
) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_notifications",
            {"events": ["watchdog", "anomaly"], "enabled": True, "services": []},
            blocking=True,
        )
    assert "notifications" not in entry.options


async def test_event_and_events_together_are_refused(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "set_notifications",
            {"event": "watchdog", "events": ["anomaly"], "enabled": False},
            blocking=True,
        )


async def test_a_priority_can_be_set_per_event(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {"event": "completed", "enabled": True, "services": ["phone"], "priority": "high"},
        blocking=True,
    )
    assert entry.options["notifications"]["completed"]["priority"] == "high"
```

- [ ] **Step 2: Correct the two existing tests that encode the broken convention**

In `tests/components/test_services_settings.py`, `test_notifications_updates_one_event_only` passes `"services": ["notify.b"]` through the service and asserts it is stored verbatim. That assertion encoded the defect: a stored `notify.b` is invoked as `notify.notify.b` and never arrives. Change the expected stored value to the bare name:

```python
async def test_notifications_updates_one_event_only(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"completed": {"enabled": True, "services": ["notify.a"]}}},
    )
    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {"event": "anomaly", "enabled": True, "services": ["notify.b"]},
        blocking=True,
    )
    stored = entry.options["notifications"]
    # Stored bare: Notifier calls notify.<service>, so the domain prefix a user
    # types (or the old placeholder taught) has to come off on the way in.
    assert stored["anomaly"] == {"enabled": True, "services": ["b"]}
    # A value written straight into options by a previous version is left as
    # it is; Notifier normalises it on read.
    assert stored["completed"] == {"enabled": True, "services": ["notify.a"]}
```

`test_notifications_keeps_services_when_only_toggling` disables an event, so it does not hit the new validation and needs no change — verify it still passes.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_services_settings.py -v`
Expected: the new tests FAIL (no validation, no normalisation, `events` unknown).

- [ ] **Step 4: Implement the schema and the handler**

In `custom_components/irrigation_maestro/services.py`:

Add to the imports from `.notify`: `ALL_EVENTS`, `PRIORITY_HIGH`, `PRIORITY_NORMAL`, `normalize_service`. Delete the local `_NOTIFY_EVENTS` tuple at line 368 and use `ALL_EVENTS` — it existed to stay in sync with `notify.py`, and now there is a single tuple to import.

Add the new attribute constants next to the existing ones:

```python
ATTR_EVENTS: Final = "events"
ATTR_PRIORITY: Final = "priority"
ATTR_TITLE: Final = "title"
ATTR_MESSAGE: Final = "message"
```

Replace `_SET_NOTIFICATIONS_SCHEMA`:

```python
_NOTIFY_SERVICE_NAME = re.compile(r"[a-z0-9_]+")

_SET_NOTIFICATIONS_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Optional(ATTR_EVENT): vol.In(ALL_EVENTS),
            vol.Optional(ATTR_EVENTS): vol.All(
                cv.ensure_list, [vol.In(ALL_EVENTS)], vol.Length(min=1)
            ),
            vol.Optional(ATTR_ENABLED): cv.boolean,
            vol.Optional(ATTR_SERVICES): vol.All(cv.ensure_list, [cv.string]),
            vol.Optional(ATTR_PRIORITY): vol.In([PRIORITY_HIGH, PRIORITY_NORMAL]),
        }
    ),
    cv.has_at_least_one_key(ATTR_EVENT, ATTR_EVENTS),
    cv.has_at_most_one_key(ATTR_EVENT, ATTR_EVENTS),
)
```

Add `import re` at the top if it is not already imported.

Replace `_async_set_notifications`:

```python
def _clean_notify_services(raw: list[str]) -> list[str]:
    """Bare, de-duplicated service names, or a refusal.

    Well-formed names that are not registered yet are accepted: a notify
    integration can load after us, and refusing here would block a legitimate
    configuration.
    """
    cleaned: list[str] = []
    for item in raw:
        name = normalize_service(str(item))
        if not _NOTIFY_SERVICE_NAME.fullmatch(name):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="invalid_notify_service",
                translation_placeholders={"service": str(item)},
            )
        if name not in cleaned:
            cleaned.append(name)
    return cleaned


async def _async_set_notifications(call: ServiceCall) -> None:
    """Configure one event, or several that share a setting.

    A call only ever touches the events it names, so a caller never has to post
    the whole nested structure back and cannot clobber the rest. `events` exists
    so the wizard can save nine events in two calls without weakening that.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    options = dict(entry.options)
    notifications = {
        key: dict(value) for key, value in options.get(const.CONF_NOTIFICATIONS, {}).items()
    }
    events: list[str] = list(call.data.get(ATTR_EVENTS) or [call.data[ATTR_EVENT]])
    services = (
        _clean_notify_services(call.data[ATTR_SERVICES]) if ATTR_SERVICES in call.data else None
    )
    for event in events:
        current = dict(notifications.get(event, {}))
        if ATTR_ENABLED in call.data:
            current[const.CONF_NOTIFY_ENABLED] = call.data[ATTR_ENABLED]
        if services is not None:
            current[const.CONF_NOTIFY_SERVICES] = list(services)
        if ATTR_PRIORITY in call.data:
            current[const.CONF_NOTIFY_PRIORITY] = call.data[ATTR_PRIORITY]
        # Judge the RESULT, not the payload. A call that only flips `enabled`
        # on an event whose stored list is empty produces exactly the
        # configured-looking, mute shape this service exists to refuse -- and
        # validating the payload alone would wave it through.
        if current.get(const.CONF_NOTIFY_ENABLED) and not current.get(
            const.CONF_NOTIFY_SERVICES
        ):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="notify_enabled_without_target",
                translation_placeholders={"event": event},
            )
        notifications[event] = current
    # Nothing is persisted until every named event validated: a multi-event
    # call is all-or-nothing.
    options[const.CONF_NOTIFICATIONS] = notifications
    _write_hub_options(hass, entry, options)
```

- [ ] **Step 5: Update `services.yaml`**

Replace the `set_notifications` block in `custom_components/irrigation_maestro/services.yaml`:

```yaml
set_notifications:
  fields:
    event:
      example: completed
      selector:
        select:
          options:
            - completed
            - skipped
            - interrupted
            - cancelled
            - anomaly
            - watchdog
            - sentinel
            - session_overrun
            - consumption_budget
    events:
      example: '["watchdog", "anomaly", "sentinel", "interrupted"]'
      selector:
        select:
          multiple: true
          options:
            - completed
            - skipped
            - interrupted
            - cancelled
            - anomaly
            - watchdog
            - sentinel
            - session_overrun
            - consumption_budget
    enabled:
      example: true
      selector:
        boolean:
    services:
      example: '["mobile_app_pixel_10_pro_xl"]'
      selector:
        object:
    priority:
      example: high
      selector:
        select:
          options:
            - high
            - normal
```

- [ ] **Step 6: Update both translation files**

In `translations/en.json`, under `services.set_notifications`, replace `description` and the `fields` block, and add the two exception keys under `exceptions`:

```json
"set_notifications": {
  "name": "Set notifications",
  "description": "Enable one event (or several at once) and choose the notify services it calls.",
  "fields": {
    "event": { "name": "Event", "description": "Which event to configure. Use either this or Events, not both." },
    "events": { "name": "Events", "description": "Several events to configure with the same settings. Use either this or Event, not both." },
    "enabled": { "name": "Enabled", "description": "Whether these events notify at all." },
    "services": { "name": "Notify services", "description": "Notify service names, with or without the notify. prefix, e.g. mobile_app_phone. Enabling an event with an empty list is refused: it would look configured and send nothing." },
    "priority": { "name": "Priority", "description": "High adds urgency hints understood by mobile app targets. Defaults to high for watchdog, anomaly, sentinel and interrupted." }
  }
}
```

```json
"notify_enabled_without_target": {
  "message": "The event \"{event}\" cannot be enabled with no notify recipients: it would look configured and send nothing. Choose at least one recipient."
},
"invalid_notify_service": {
  "message": "\"{service}\" is not a valid notify service name. Use the service name, for example mobile_app_phone."
}
```

Mirror both into `translations/it.json` under the same keys:

```json
"set_notifications": {
  "name": "Imposta notifiche",
  "description": "Abilita un evento (o più insieme) e scegli i servizi notify che deve chiamare.",
  "fields": {
    "event": { "name": "Evento", "description": "Quale evento configurare. Usa questo oppure Eventi, non entrambi." },
    "events": { "name": "Eventi", "description": "Più eventi da configurare con le stesse impostazioni. Usa questo oppure Evento, non entrambi." },
    "enabled": { "name": "Abilitato", "description": "Se questi eventi devono notificare." },
    "services": { "name": "Servizi notify", "description": "Nomi dei servizi notify, con o senza il prefisso notify., ad esempio mobile_app_phone. Abilitare un evento con la lista vuota viene rifiutato: sembrerebbe configurato e non manderebbe nulla." },
    "priority": { "name": "Priorità", "description": "Alta aggiunge segnali di urgenza compresi dalle app mobili. Predefinita alta per guasto valvola, anomalia, sentinella e interruzione." }
  }
}
```

```json
"notify_enabled_without_target": {
  "message": "L'evento \"{event}\" non può essere abilitato senza destinatari: sembrerebbe configurato e non manderebbe nulla. Scegli almeno un destinatario."
},
"invalid_notify_service": {
  "message": "\"{service}\" non è un nome valido di servizio notify. Usa il nome del servizio, ad esempio mobile_app_phone."
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_services_settings.py -v`
Expected: PASS.

- [ ] **Step 8: Run the full suite, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean.

- [ ] **Step 9: Commit**

```bash
git add custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_services_settings.py
git commit -m "feat(services): set_notifications refuses a configuration that sends nothing

Validation judges the merged result rather than the payload. The service is a
partial update, so a call that only flips enabled on an event whose stored
recipient list is empty reaches exactly the state a field install reached --
one event enabled, no recipients, completely mute with the appearance of being
configured. Checking the payload alone would wave that through.

Recipients are stored bare because Notifier calls notify.<service>. The
existing test asserted a stored notify.b verbatim; that assertion encoded the
defect, since notify.notify.b is never delivered.

events (a list) lets the wizard save nine events in two calls while keeping
the property the one-event-per-call design protected: a call still only
touches the events it names, and a multi-event call is all-or-nothing."
```

---

### Task 4: `test_notification` — proof the recipient is right

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py` (constant, schema, handler, registration)
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Test: `tests/components/test_services_settings.py` (append)

**Interfaces:**
- Consumes: `normalize_service`, `ALL_EVENTS`, `default_priority` from Task 1.
- Produces: service `irrigation_maestro.test_notification`, `SupportsResponse.ONLY`, returning `{"results": {service: {"sent": bool, "error": str | None}}}`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_services_settings.py`:

```python
async def test_a_test_notification_reaches_a_real_recipient(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    calls: list[ServiceCall] = []

    async def handler(call: ServiceCall) -> None:
        calls.append(call)

    hass.services.async_register("notify", "phone", handler)
    response = await hass.services.async_call(
        DOMAIN,
        "test_notification",
        {"services": ["notify.phone"], "title": "T", "message": "M"},
        blocking=True,
        return_response=True,
    )
    assert response == {"results": {"phone": {"sent": True, "error": None}}}
    assert calls[0].data["message"] == "M"


async def test_a_test_notification_to_a_missing_recipient_reports_the_failure(
    hass: HomeAssistant,
) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    response = await hass.services.async_call(
        DOMAIN, "test_notification", {"services": ["gone"]}, blocking=True, return_response=True
    )
    assert response == {"results": {"gone": {"sent": False, "error": "unknown_service"}}}


async def test_a_test_notification_reports_a_recipient_that_raises(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])

    async def handler(call: ServiceCall) -> None:
        raise RuntimeError("smtp refused")

    hass.services.async_register("notify", "mail", handler)
    response = await hass.services.async_call(
        DOMAIN, "test_notification", {"services": ["mail"]}, blocking=True, return_response=True
    )
    assert response["results"]["mail"]["sent"] is False
    assert "smtp refused" in response["results"]["mail"]["error"]
```

Add `ServiceCall` to the `homeassistant.core` import at the top of the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_services_settings.py -k test_notification -v`
Expected: FAIL — service `test_notification` not found.

- [ ] **Step 3: Implement the service**

In `custom_components/irrigation_maestro/services.py`:

```python
SERVICE_TEST_NOTIFICATION: Final = "test_notification"

_TEST_NOTIFICATION_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_SERVICES): vol.All(cv.ensure_list, [cv.string], vol.Length(min=1)),
        vol.Optional(ATTR_EVENT): vol.In(ALL_EVENTS),
        vol.Optional(ATTR_TITLE): cv.string,
        vol.Optional(ATTR_MESSAGE): cv.string,
    }
)


async def _async_test_notification(call: ServiceCall) -> ServiceResponse:
    """Send a test message and report, per recipient, whether it arrived.

    blocking=True here, unlike the normal send path: the point of a test is to
    learn about the failure, and a fire-and-forget call would report success
    for a recipient that then refuses.
    """
    hass = call.hass
    _loaded_entry(hass)
    event = call.data.get(ATTR_EVENT, EVENT_ANOMALY)
    data: dict[str, Any] = {
        "title": call.data.get(ATTR_TITLE, "Irrigation Maestro"),
        "message": call.data.get(
            ATTR_MESSAGE, "Test notification. If you can read this, this recipient works."
        ),
    }
    if default_priority(event) == PRIORITY_HIGH:
        data["data"] = {
            "tag": f"irrigation_maestro_{event}",
            "importance": "high",
            "priority": "high",
            "ttl": 0,
        }
    results: dict[str, Any] = {}
    for raw in call.data[ATTR_SERVICES]:
        name = normalize_service(str(raw))
        if not hass.services.has_service("notify", name):
            results[name] = {"sent": False, "error": "unknown_service"}
            continue
        try:
            await hass.services.async_call("notify", name, dict(data), blocking=True)
        except Exception as err:  # noqa: BLE001 - reported to the caller, not swallowed
            results[name] = {"sent": False, "error": str(err)}
        else:
            results[name] = {"sent": True, "error": None}
    return {"results": results}
```

Add `default_priority` and `EVENT_ANOMALY` to the `.notify` imports if not already present.

Register it in `async_setup_services`, next to the other response services:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_TEST_NOTIFICATION,
        _async_test_notification,
        _TEST_NOTIFICATION_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

- [ ] **Step 4: Declare it in `services.yaml`**

```yaml
test_notification:
  fields:
    services:
      required: true
      example: '["mobile_app_pixel_10_pro_xl"]'
      selector:
        object:
    event:
      example: watchdog
      selector:
        select:
          options:
            - completed
            - skipped
            - interrupted
            - cancelled
            - anomaly
            - watchdog
            - sentinel
            - session_overrun
            - consumption_budget
    title:
      example: Irrigation Maestro
      selector:
        text:
    message:
      example: Test notification.
      selector:
        text:
```

- [ ] **Step 5: Translate it**

`en.json`, under `services`:

```json
"test_notification": {
  "name": "Send a test notification",
  "description": "Sends a test message to the chosen notify services and reports, for each one, whether it went through.",
  "fields": {
    "services": { "name": "Notify services", "description": "Recipients to test, with or without the notify. prefix." },
    "event": { "name": "Event", "description": "Shape the test like this event, so a high-priority event is tested with its urgency hints." },
    "title": { "name": "Title", "description": "Title of the test message." },
    "message": { "name": "Message", "description": "Body of the test message." }
  }
}
```

`it.json`:

```json
"test_notification": {
  "name": "Invia una notifica di prova",
  "description": "Manda un messaggio di prova ai servizi notify scelti e riferisce, per ciascuno, se è arrivato.",
  "fields": {
    "services": { "name": "Servizi notify", "description": "Destinatari da provare, con o senza il prefisso notify." },
    "event": { "name": "Evento", "description": "Dà alla prova la forma di questo evento, così un evento ad alta priorità viene provato con i suoi segnali di urgenza." },
    "title": { "name": "Titolo", "description": "Titolo del messaggio di prova." },
    "message": { "name": "Messaggio", "description": "Corpo del messaggio di prova." }
  }
}
```

- [ ] **Step 6: Run the tests, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_services_settings.py
git commit -m "feat(services): test_notification proves the recipient before it matters

The only way a user learns they picked the right target is to send something
and watch it arrive. Blocking, unlike the normal send path, because a
fire-and-forget call would report success for a recipient that then refuses."
```

---

### Task 5: `notification_status` and the readable diagnostic

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py` (constant, handler, registration)
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/diagnostics.py:22-34`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Test: `tests/components/test_services_settings.py` (append), `tests/components/test_entities.py` or a new `tests/components/test_diagnostics.py` (create)

**Interfaces:**
- Consumes: `evaluate_notifications`, `NotificationStatus.as_dict` from Task 1.
- Produces: service `irrigation_maestro.notification_status`, `SupportsResponse.ONLY`, returning `NotificationStatus.as_dict()` plus `available_services: list[str]`; diagnostics key `notifications`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_services_settings.py`:

```python
async def test_notification_status_says_mute_when_nothing_is_configured(
    hass: HomeAssistant,
) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    response = await hass.services.async_call(
        DOMAIN, "notification_status", {}, blocking=True, return_response=True
    )
    assert response["verdict"] == "silent"
    assert sorted(response["recommended"]) == ["anomaly", "interrupted", "sentinel", "watchdog"]
    assert len(response["events"]) == 9


async def test_notification_status_lists_the_discovered_recipients(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])

    async def handler(call: ServiceCall) -> None:
        return None

    hass.services.async_register("notify", "casabrangi", handler)
    hass.services.async_register("notify", "mobile_app_pixel", handler)
    response = await hass.services.async_call(
        DOMAIN, "notification_status", {}, blocking=True, return_response=True
    )
    assert "casabrangi" in response["available_services"]
    assert "mobile_app_pixel" in response["available_services"]


async def test_notification_status_reports_the_field_install_shape(hass: HomeAssistant) -> None:
    await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    response = await hass.services.async_call(
        DOMAIN, "notification_status", {}, blocking=True, return_response=True
    )
    assert response["enabled_without_target"] == ["interrupted"]
    assert response["verdict"] == "silent"
```

Create `tests/components/test_diagnostics.py`:

```python
"""The diagnostics payload makes the mute state inspectable without .storage."""

from custom_components.irrigation_maestro.diagnostics import (
    async_get_config_entry_diagnostics,
)
from homeassistant.core import HomeAssistant

from .test_session import setup_hub, zone_data


async def test_diagnostics_carry_the_notification_verdict(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    payload = await async_get_config_entry_diagnostics(hass, entry)
    assert payload["notifications"]["verdict"] == "silent"
    assert payload["notifications"]["enabled_without_target"] == ["interrupted"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_diagnostics.py tests/components/test_services_settings.py -k "notification_status or diagnostics" -v`
Expected: FAIL — service not found, `notifications` key absent.

- [ ] **Step 3: Implement the service**

In `custom_components/irrigation_maestro/services.py`:

```python
SERVICE_NOTIFICATION_STATUS: Final = "notification_status"


async def _async_notification_status(call: ServiceCall) -> ServiceResponse:
    """What is configured, where it goes, and whether it goes anywhere.

    Deliberately not folded into export_config: that payload is import_config's
    input, and derived state has no business round-tripping through it.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    available = sorted(hass.services.async_services_for_domain("notify"))
    status = evaluate_notifications(
        entry.options.get(const.CONF_NOTIFICATIONS, {}), known_services=set(available)
    )
    return {**status.as_dict(), "available_services": available}
```

Register it:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_NOTIFICATION_STATUS,
        _async_notification_status,
        _EMPTY_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

Add `evaluate_notifications` to the `.notify` imports.

- [ ] **Step 4: Add the diagnostics key**

In `custom_components/irrigation_maestro/diagnostics.py`, add the import and the key:

```python
from .notify import evaluate_notifications
```

```python
    payload: dict[str, Any] = {
        "options": dict(entry.options),
        "zones": {...},
        "runtime_state": runtime.state.as_dict(),
        # Which events are live and where they go, so "mute" is inspectable
        # without opening .storage.
        "notifications": evaluate_notifications(
            entry.options.get(CONF_NOTIFICATIONS, {}),
            known_services=set(hass.services.async_services_for_domain("notify")),
        ).as_dict(),
        "hub_version": INTEGRATION_VERSION,
    }
```

Add `CONF_NOTIFICATIONS` to the `.const` import.

- [ ] **Step 5: Declare and translate the service**

`services.yaml`:

```yaml
notification_status:
```

`en.json`, under `services`:

```json
"notification_status": {
  "name": "Notification status",
  "description": "Reports which events notify, which recipients they reach, which recipients no longer exist, and whether the system is mute."
}
```

`it.json`:

```json
"notification_status": {
  "name": "Stato notifiche",
  "description": "Riferisce quali eventi notificano, verso quali destinatari, quali destinatari non esistono più e se il sistema è muto."
}
```

- [ ] **Step 6: Run the tests, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/diagnostics.py \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_services_settings.py \
        tests/components/test_diagnostics.py
git commit -m "feat: notification_status makes the mute state inspectable

One response service is both the wizard's data source and the readable
diagnostic, so the verdict has a single implementation instead of one in
Python for Repairs and another in TypeScript for the banner.

Kept out of export_config on purpose: that payload is import_config's input,
and derived state must not round-trip through it."
```

---

### Task 6: Repairs raise the mute state where the user will meet it

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py:113-128` (`async_setup`), `:162-187` (`async_config_updated`), Repairs section around `:835`
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json` (`issues`)
- Test: `tests/components/test_notify.py` (append)

**Interfaces:**
- Consumes: `evaluate_notifications` from Task 1.
- Produces: `IrrigationRuntime._refresh_notification_issues() -> None`; issue ids `notifications_enabled_without_target`, `notifications_silent`; translation keys of the same names.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_notify.py`:

```python
from .test_session import setup_hub, zone_data


async def test_a_hub_with_no_notification_config_reports_being_mute(
    hass: HomeAssistant,
) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is not None


async def test_the_field_install_shape_raises_the_enabled_without_target_issue(
    hass: HomeAssistant,
) -> None:
    await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, "notifications_enabled_without_target")
    assert issue is not None
    assert issue.translation_placeholders is not None
    assert issue.translation_placeholders["events"] == "interrupted"


async def test_covering_the_essential_events_withdraws_both_issues(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is not None

    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {
            "events": ["watchdog", "anomaly", "sentinel", "interrupted"],
            "enabled": True,
            "services": ["phone"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is None
    assert registry.async_get_issue(DOMAIN, "notifications_enabled_without_target") is None


async def test_covering_only_some_essential_events_is_not_reported_as_mute(
    hass: HomeAssistant,
) -> None:
    await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"watchdog": {"enabled": True, "services": ["phone"]}}},
    )
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is None
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_notify.py -k issue -v`
Expected: FAIL — no issues created.

- [ ] **Step 3: Implement the refresh**

In `custom_components/irrigation_maestro/runtime.py`, add `evaluate_notifications` to the `.notify` imports and add the method in the Repairs section:

```python
    def _refresh_notification_issues(self) -> None:
        """Surface a configuration that will not reach anyone.

        Judged from the configuration alone -- known_services is not passed.
        At setup time another integration's notify services may not have
        registered yet, and calling their recipients missing then would be a
        false alarm. A recipient that has genuinely vanished is caught by
        Notifier at send time, where its absence is certain.
        """
        status = evaluate_notifications(self.hub.notifications)
        if status.enabled_without_target:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_enabled_without_target",
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="notifications_enabled_without_target",
                translation_placeholders={"events": ", ".join(status.enabled_without_target)},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_enabled_without_target")

        if status.verdict == "silent":
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_silent",
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="notifications_silent",
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_silent")
```

Call it at the end of `async_setup`:

```python
        self.watchdog.start()
        self.sentinel.start()
        self._refresh_notification_issues()
```

and at the end of `async_config_updated`, after `self.hub` has been rebuilt:

```python
        self._refresh_notification_issues()
        if removed or (set(self.zones) - old_zone_ids) or cycles_changed:
            async_dispatcher_send(self.hass, SIGNAL_ZONES_CHANGED, self.entry.entry_id)
```

- [ ] **Step 4: Translate the issues**

`en.json`, under `issues`:

```json
"notifications_enabled_without_target": {
  "title": "Notifications enabled with no recipient",
  "description": "These events are enabled but have no notify recipient, so they look configured and send nothing: {events}. Open Irrigazione → Impostazioni → Notifiche and choose a recipient, or disable them."
},
"notifications_silent": {
  "title": "Irrigation Maestro will not notify you",
  "description": "None of the events an irrigation system should never miss — valve failure, flow anomaly, irrigation not executed, interrupted cycle — reaches anyone. If the watchdog force-closes a valve or a cycle never runs, nobody is told. Open Irrigazione → Impostazioni → Notifiche to set this up."
},
"notify_target_missing": {
  "title": "Notification recipient no longer exists",
  "description": "The notify service notify.{service} is configured for the event \"{event}\" but no longer exists, so that alert is being lost. Open Irrigazione → Impostazioni → Notifiche and choose a recipient that exists."
}
```

`it.json`, under `issues`:

```json
"notifications_enabled_without_target": {
  "title": "Notifiche abilitate senza destinatario",
  "description": "Questi eventi sono abilitati ma non hanno nessun destinatario notify, quindi sembrano configurati e non mandano nulla: {events}. Apri Irrigazione → Impostazioni → Notifiche e scegli un destinatario, oppure disabilitali."
},
"notifications_silent": {
  "title": "Irrigation Maestro non ti avviserà",
  "description": "Nessuno degli eventi che un impianto di irrigazione non dovrebbe mai perdere — guasto di una valvola, anomalia di portata, irrigazione non eseguita, ciclo interrotto — raggiunge qualcuno. Se il watchdog chiude d'autorità una valvola o un ciclo non parte, nessuno lo saprà. Apri Irrigazione → Impostazioni → Notifiche per configurarle."
},
"notify_target_missing": {
  "title": "Destinatario delle notifiche non più esistente",
  "description": "Il servizio notify.{service} è configurato per l'evento \"{event}\" ma non esiste più, quindi quell'avviso si sta perdendo. Apri Irrigazione → Impostazioni → Notifiche e scegli un destinatario esistente."
}
```

- [ ] **Step 5: Run the tests, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean. Existing tests that call `setup_hub` without notification config now also create a `notifications_silent` issue; if any test asserts on the exact set of issues, scope its assertion to the issue it cares about.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/runtime.py \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_notify.py
git commit -m "feat(runtime): Repairs is where a user who gets no notifications will look

Two issues, both judged from the configuration alone: enabled-with-no-recipient
(the field install's exact state) and no-essential-event-reaches-anyone. The
service registry is deliberately not consulted here -- at setup another
integration's notify services may not have registered yet, and a false alarm
would teach the user to ignore the issue. A recipient that has genuinely
vanished is caught by Notifier at send time, where its absence is certain.

This is also the answer to findability: the guided path lives in the panel
(one editor per setting, 2.1.0), and Repairs is what leads someone there who
does not know it exists."
```

---

### Task 7: Card — the wizard's pure logic

**Files:**
- Create: `card/src/panel/notification-wizard-state.ts`
- Create: `card/src/panel/notification-wizard-state.test.ts`

**Interfaces:**
- Consumes: the `notification_status` response shape from Task 5.
- Produces: `NOTIFY_GROUP_ORDER`, `type NotificationStatusResponse`, `type WizardSelection`, `presetSelection(preset, status)`, `buildSaveCalls(selection)`, `discoverRecipients(hass)`, `selectionFromStatus(status)`.

- [ ] **Step 1: Write the failing tests**

Create `card/src/panel/notification-wizard-state.test.ts`:

```ts
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
    expect(calls[0].enabled).toBe(false);
    expect(calls[0].events).toHaveLength(9);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix card run test -- notification-wizard-state`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the state module**

Create `card/src/panel/notification-wizard-state.ts`:

```ts
import type { HomeAssistant } from "../types";

/**
 * The wizard's pure logic: which events a preset selects, and which
 * `set_notifications` calls a selection turns into.
 *
 * The verdict itself is NOT computed here — it comes from the backend's
 * `notification_status`, so "mute" has one implementation rather than one in
 * Python for Repairs and a second one here for the banner.
 */

export const NOTIFY_GROUP_ORDER = ["critical", "operational", "informational"] as const;

/** Mirrors ALL_EVENTS in notify.py, in the same order. */
export const ALL_EVENT_ORDER: readonly string[] = [
  "watchdog",
  "anomaly",
  "skipped",
  "interrupted",
  "cancelled",
  "completed",
  "sentinel",
  "session_overrun",
  "consumption_budget",
];

export type NotifyGroup = (typeof NOTIFY_GROUP_ORDER)[number];
export type NotifyPriority = "high" | "normal";
export type WizardPreset = "recommended" | "critical" | "all";

export interface EventStatusResponse {
  event: string;
  group: string;
  enabled: boolean;
  services: string[];
  missing: string[];
  priority: string;
  essential: boolean;
  reachable: boolean;
}

export interface NotificationStatusResponse {
  verdict: "ok" | "partial" | "silent";
  groups: Record<string, string[]>;
  recommended: string[];
  enabled_without_target: string[];
  unreachable: Record<string, string[]>;
  available_services: string[];
  events: EventStatusResponse[];
}

export interface WizardSelection {
  recipients: string[];
  events: string[];
  priorities: Record<string, NotifyPriority>;
}

export interface SetNotificationsCall {
  events: string[];
  enabled: boolean;
  services?: string[];
  priority?: NotifyPriority;
}

export interface Recipient {
  service: string;
  label: string;
}

/** The notify services this instance actually has, sorted by name. */
export function discoverRecipients(hass: HomeAssistant): Recipient[] {
  const notify = (hass.services as Record<string, Record<string, { name?: string }>>)?.notify;
  if (!notify) return [];
  return Object.keys(notify)
    .sort()
    .map((service) => ({ service, label: notify[service]?.name || service }));
}

export function presetSelection(preset: WizardPreset, status: NotificationStatusResponse): string[] {
  if (preset === "recommended") return [...status.recommended];
  if (preset === "critical") return [...(status.groups.critical ?? [])];
  return status.events.map((event) => event.event);
}

/**
 * What the wizard opens on: what is already configured, or — when nothing is —
 * the recommendation, so accepting the proposal is one click.
 */
export function selectionFromStatus(status: NotificationStatusResponse): WizardSelection {
  const configured = status.events.filter((event) => event.enabled);
  const recipients = [...new Set(configured.flatMap((event) => event.services))];
  const priorities: Record<string, NotifyPriority> = {};
  for (const event of status.events) {
    priorities[event.event] = event.priority === "high" ? "high" : "normal";
  }
  return {
    recipients,
    events: configured.length ? configured.map((event) => event.event) : [...status.recommended],
    priorities,
  };
}

/**
 * A selection as `set_notifications` calls: one per distinct (priority) group
 * of enabled events, plus one that switches every other event off.
 *
 * Grouped rather than one call per event because each call rewrites the hub
 * options and wakes the update listener; nine of them for one Save is nine
 * config reloads.
 */
export function buildSaveCalls(selection: WizardSelection): SetNotificationsCall[] {
  const chosen = new Set(selection.events);
  if (chosen.size > 0 && selection.recipients.length === 0) {
    // The backend refuses this too. Failing here keeps the user in the wizard
    // with an explanation instead of a service error toast.
    throw new Error("Choose at least one recipient before enabling an event.");
  }
  const calls: SetNotificationsCall[] = [];
  const byPriority = new Map<NotifyPriority, string[]>();
  for (const event of selection.events) {
    const priority = selection.priorities[event] ?? "normal";
    byPriority.set(priority, [...(byPriority.get(priority) ?? []), event]);
  }
  for (const [priority, events] of byPriority) {
    const call: SetNotificationsCall = {
      events,
      enabled: true,
      services: [...selection.recipients],
    };
    // Only send a priority the user actually chose. Omitting it lets the
    // backend apply its own default, which is high for the essential events —
    // sending "normal" here would quietly override that.
    if (events.some((event) => selection.priorities[event] !== undefined)) {
      call.priority = priority;
    }
    calls.push(call);
  }
  const rest = ALL_EVENT_ORDER.filter((event) => !chosen.has(event));
  if (rest.length) calls.push({ events: rest, enabled: false });
  return calls;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm --prefix card run test -- notification-wizard-state`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm --prefix card run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add card/src/panel/notification-wizard-state.ts card/src/panel/notification-wizard-state.test.ts
git commit -m "feat(card): the notification wizard's pure logic

The verdict is deliberately not recomputed here: it arrives from
notification_status, so mute has one implementation instead of one in Python
for Repairs and a second in TypeScript for the banner. Only the presets, the
opening selection and the save grouping live client-side.

Saving groups events into two or three calls rather than nine because each
call rewrites hub options and wakes the update listener."
```

---

### Task 8: Card — the wizard replaces the flat section

**Files:**
- Modify: `card/src/panel/settings-view.ts:96-110` (`NotificationSaveDetail`, `NOTIFY_EVENTS`), `:172`, `:400-403`, `:474`, `:769-790`, `:938-960`
- Modify: `card/src/panel/panel.ts:637-638`
- Modify: `card/src/localize/en.ts`, `card/src/localize/it.ts`
- Test: `card/src/panel/settings-view.test.ts` (append)

**Interfaces:**
- Consumes: everything from Task 7, plus the `notification_status` and `test_notification` services.
- Produces: events `imc-settings-save-notifications` (detail: `SetNotificationsCall[]`) and `imc-settings-test-notification` (detail: `{ services: string[] }`).

- [ ] **Step 1: Write the failing test**

Append to `card/src/panel/settings-view.test.ts`:

```ts
import { buildSaveCalls } from "./notification-wizard-state";

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
});
```

- [ ] **Step 2: Run it to verify the suite is green before the UI change**

Run: `npm --prefix card run test`
Expected: PASS (the assertion exercises Task 7's module).

- [ ] **Step 3: Replace the notifications section**

In `card/src/panel/settings-view.ts`:

1. Delete the `NOTIFY_EVENTS` constant and the `NotificationSaveDetail` interface; import from `./notification-wizard-state` instead.
2. Replace the `_notifications` state with the wizard's state:

```ts
  @state() private _notifyStatus?: NotificationStatusResponse;
  @state() private _wizardStep = 0;
  @state() private _selection: WizardSelection = { recipients: [], events: [], priorities: {} };
  @state() private _testResults: Record<string, { sent: boolean; error: string | null }> = {};
```

3. Replace `_renderNotificationsSection` with the banner plus the three steps. Structure:

```ts
  private _renderNotificationsSection(lang: string): TemplateResult {
    const status = this._notifyStatus;
    if (!status) return html`<div class="card"><div class="header">🔔 ${localize(lang, "settings.notifications")}</div><div class="hint">${localize(lang, "notify.loading")}</div></div>`;
    return html`
      <div class="card">
        <div class="header">🔔 ${localize(lang, "settings.notifications")}</div>
        ${status.verdict === "ok" ? nothing : this._renderMuteBanner(lang, status)}
        ${this._wizardStep === 0 ? this._renderRecipients(lang, status) : nothing}
        ${this._wizardStep === 1 ? this._renderEvents(lang, status) : nothing}
        ${this._wizardStep === 2 ? this._renderSummary(lang) : nothing}
      </div>
    `;
  }
```

- `_renderMuteBanner` states what will not arrive (`status.verdict === "silent"` → nothing at all; `partial` → the essential events with `reachable === false`), plus a button setting `_wizardStep = 0`.
- `_renderRecipients` maps `discoverRecipients(this.hass)` to checkboxes bound to `this._selection.recipients`, each with an *Invia prova* button dispatching `imc-settings-test-notification` and rendering `this._testResults[service]` as ✓ / ✗ with the error string. When the list is empty, show `notify.no_recipients` telling the user to set up a notify integration first.
- `_renderEvents` renders the preset row (`recommended` / `critical` / `all`, calling `presetSelection`) over the three groups in `NOTIFY_GROUP_ORDER`, each collapsible, each event a checkbox plus a priority chip toggling `this._selection.priorities[event]`.
- `_renderSummary` lists each chosen event and the recipients, and a Save button that calls `buildSaveCalls(this._selection)` inside a `try/catch`, dispatching `imc-settings-save-notifications` with the resulting array or showing the thrown message inline.

4. In the method that seeds state from `HubOptions` (around line 400), stop reading `opts.notifications` and instead seed from `_notifyStatus` via `selectionFromStatus` when the status arrives.

In `card/src/panel/panel.ts`:

5. Load the status alongside the existing `export_config` read, and pass it down:

```ts
  private async _loadNotificationStatus(): Promise<void> {
    const res = await this._call("irrigation_maestro", "notification_status", {}, true);
    this._notifyStatus = res?.response as NotificationStatusResponse | undefined;
  }
```

6. Replace the `imc-settings-save-notifications` handler so it issues each grouped call in sequence and then reloads the status:

```ts
        @imc-settings-save-notifications=${async (e: CustomEvent<SetNotificationsCall[]>) => {
          for (const call of e.detail) {
            await this._saveSettings("set_notifications", { ...call });
          }
          await this._loadNotificationStatus();
        }}
        @imc-settings-test-notification=${async (e: CustomEvent<{ services: string[] }>) => {
          const res = await this._call(
            "irrigation_maestro",
            "test_notification",
            { services: e.detail.services, ...this._testMessage() },
            true,
          );
          this._testResults = (res?.response as { results: Record<string, unknown> })?.results ?? {};
        }}
```

`_testMessage()` returns the localized `title` and `message` so the test arrives in the user's language.

- [ ] **Step 4: Add every string to both card locales**

Add to `card/src/localize/en.ts` and, translated, to `it.ts`:

`notify.loading`, `notify.mute_title`, `notify.mute_body`, `notify.partial_body`, `notify.configure`, `notify.step_recipients`, `notify.step_events`, `notify.step_summary`, `notify.no_recipients`, `notify.send_test`, `notify.test_ok`, `notify.test_failed`, `notify.preset_recommended`, `notify.preset_critical`, `notify.preset_all`, `notify.group_critical`, `notify.group_operational`, `notify.group_informational`, `notify.priority_high`, `notify.priority_normal`, `notify.needs_recipient`, `notify.back`, `notify.next`, `notify.save`, `notify.test_title`, `notify.test_message`, and one label per event (`notify.event_watchdog` … `notify.event_consumption_budget`).

Italian must use the voice already established in `it.ts` — e.g. `notify.mute_title`: "Non riceverai nessuna notifica"; `notify.group_critical`: "Critici"; `notify.preset_recommended`: "Consigliato".

- [ ] **Step 5: Run card tests and typecheck**

Run: `npm --prefix card run test && npm --prefix card run typecheck`
Expected: PASS and clean.

- [ ] **Step 6: Verify no locale key is missing**

Run: `npm --prefix card run test`
Expected: PASS. If the repo has a locale-parity test, it must be green; if it does not, verify by hand that `en.ts` and `it.ts` have identical key sets:

```bash
node -e "const e=require('fs').readFileSync('card/src/localize/en.ts','utf8').match(/\"[a-z_.]+\":/g).sort();const i=require('fs').readFileSync('card/src/localize/it.ts','utf8').match(/\"[a-z_.]+\":/g).sort();console.log(JSON.stringify(e)===JSON.stringify(i)?'parity ok':'MISMATCH');"
```

- [ ] **Step 7: Commit**

```bash
git add card/src/panel/settings-view.ts card/src/panel/panel.ts \
        card/src/panel/settings-view.test.ts \
        card/src/localize/en.ts card/src/localize/it.ts
git commit -m "feat(card): a guided path replaces nine flat rows

Recipients are picked from the notify services the instance actually has,
never typed: the old field's placeholder read notify.mobile_app_phone, which
the integration then invoked as notify.notify.mobile_app_phone. The recommended
four are pre-selected so accepting the proposal is one click, and a test send
is the only way to know the target is right before it matters."
```

---

### Task 9: Bundle, docs, version, release

**Files:**
- Modify: `custom_components/irrigation_maestro/frontend/*` (built output)
- Modify: `custom_components/irrigation_maestro/manifest.json`
- Modify: `CHANGELOG.md`, `README.md`, `INSTRUCTIONS.md`, `docs/it/guida-rapida.md`, `docs/it/istruzioni.md`
- Modify: `MEMORY.md`

**Interfaces:**
- Consumes: everything above.
- Produces: version 3.1.0.

- [ ] **Step 1: Rebuild the committed bundle**

Run: `npm --prefix card run build`
Expected: `custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js` and `irrigation-maestro-panel.js` regenerated.

- [ ] **Step 2: Bump the version**

In `custom_components/irrigation_maestro/manifest.json`, set `"version": "3.1.0"`.

- [ ] **Step 3: Write the changelog entry**

Add to the top of `CHANGELOG.md`:

```markdown
## 3.1.0

### Notifications are configured, not guessed

- **Guided setup in the panel.** Recipients are picked from the `notify.*`
  services the instance actually has, never typed. The four events an
  irrigation system should never miss — valve failure, flow anomaly,
  irrigation not executed, interrupted cycle — are proposed pre-selected, so
  accepting the recommendation is one click. Events browse by severity
  (critical / operational / informational) instead of nine flat rows.
- **A test send** inside the wizard, per recipient, with the failure reason.
- **`enabled: true` with no recipients is refused**, in the wizard and in
  `set_notifications`. Validation judges the merged result, so flipping
  `enabled` on an event whose recipient list is already empty fails too.
- **Recipients are stored bare.** The old field's placeholder read
  `notify.mobile_app_phone`, but the integration calls `notify.<service>` — a
  configuration written that way was invoked as
  `notify.notify.mobile_app_phone` and never arrived. New values are
  normalised on write and existing ones on read, so no migration is needed.
- **Repairs when it matters**: notifications enabled with no recipient; no
  essential event reaching anyone; a configured recipient that no longer
  exists (for essential events, where a log line was not enough).
- **Priority per event**, defaulting to high for the four essential events.
- **`notification_status`** — a new action reporting which events notify,
  where they go and whether the system is mute; the same summary is in the
  downloadable diagnostics.
- **`test_notification`** — a new action, also callable from Developer Tools.
```

- [ ] **Step 4: Update the docs**

- `README.md`: add `set_notifications` companions to the services list (`test_notification`, `notification_status`) and a short paragraph under the notifications description pointing at the panel wizard.
- `INSTRUCTIONS.md` and `docs/it/istruzioni.md`: replace the description of the flat notification rows with the three-step path; `docs/it/guida-rapida.md`: add "configura le notifiche" to the first-run sequence.

- [ ] **Step 5: Record the decisions in MEMORY.md**

Add under "Deliberate design decisions":

```markdown
- **The notification wizard lives in the panel (3.1.0).** Notifications were
  already edited there, and the 2.1.0 rule is one editor per setting — putting
  a guided path in the options flow would have been the duplicated surface
  that rule exists to prevent. Findability, which is what the request was
  really about, is solved with Repairs issues that fire exactly when the user
  has the problem, plus `notification_status` and the diagnostics payload.
  Do not add a config-flow notifications step.
- **ESSENTIAL_EVENTS is not one of the display groups (3.1.0).** The severity
  grouping is presentation; the four events that must arrive (watchdog,
  anomaly, sentinel, interrupted) span all three groups. One set drives the
  proposed defaults, the default priority, the missing-recipient repair and
  the definition of "mute" — do not re-derive any of those from a group.
- **Recipients are stored bare, and normalised on read too (3.1.0).** The old
  panel placeholder taught users to type `notify.mobile_app_phone`, which
  `Notifier` then invoked as `notify.notify.mobile_app_phone` — a third silent
  exit next to the two in the brief. Normalising on read repairs existing
  configurations without a migration; do not remove either half.
```

- [ ] **Step 6: Full verification**

Run:

```bash
.venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/mypy
npm --prefix card run test
npm --prefix card run typecheck
npm --prefix card run build
```

Expected: every command clean; `git status` shows no unexpected diff in `frontend/` beyond the rebuild.

- [ ] **Step 7: Commit and open the PR**

```bash
git add -A
git commit -m "release: 3.1.0 -- guided notification setup

Bundle rebuilt, docs and changelog updated, decisions recorded in MEMORY.md."
git push -u origin feat/notification-wizard
gh pr create --base main --title "Guided notification setup" --body "..."
```

The PR body must state where the guided path lives and why (panel, because notifications were already edited there and 2.1.0 says one editor per setting; findability solved with Repairs + `notification_status` rather than a second editor).

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Recipient discovery from real `notify.*` services | 7 (`discoverRecipients`), 8 (UI) |
| Defaults proposed, not imposed; one-click accept | 7 (`presetSelection`, `selectionFromStatus`), 8 |
| Grouping by severity | 1 (`EVENT_GROUPS`), 8 |
| Validation closing the silent exits (wizard + service) | 3 (service), 7 (`buildSaveCalls` throws), 8 |
| Test send | 4 (service), 8 (UI) |
| Priority per event, high on essentials | 1 (`default_priority`), 2 (Notifier), 3 (service field) |
| Vanished recipient → Repairs on critical events | 2 |
| Findability (Repairs + status + diagnostics) | 5, 6 |
| Readable diagnostic of what is live and where | 5 |
| The `notify.` prefix defect | 1, 2, 3 |
| Both translation files | 3, 4, 5, 6, 8 |
| Service in `services.yaml` **and** registered | 4, 5 |
| Backwards compatibility, no migration | 2 (normalise on read) |
| Version bump, changelog | 9 |

**Placeholder scan**: Task 8 Step 3 describes the Lit render methods structurally rather than giving every line of markup. This is deliberate — the rendering follows the existing `_renderRestrictionsSection` / `_renderBudgetSection` patterns in the same file, and the behaviour those methods must produce is pinned by Task 7's tested pure functions and by the listed event/detail contracts. Every other step carries the actual content. The `gh pr create --body "..."` placeholder is filled from the requirement stated immediately below it.

**Type consistency**: `NotificationStatus.as_dict()` (Task 1) produces exactly the keys `NotificationStatusResponse` declares (Task 7), with `available_services` added by the service handler (Task 5) — checked field by field. `SetNotificationsCall` (Task 7) matches the `set_notifications` schema (Task 3): `events`, `enabled`, `services`, `priority`. `evaluate_notifications` is called with `known_services` in Tasks 5 (service) and without it in Task 6 (runtime), which the Task 1 signature allows and the Task 1 tests both cover.
