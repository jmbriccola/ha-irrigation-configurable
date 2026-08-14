"""The notification taxonomy and the mute verdict.

The verdict has exactly one implementation because four things depend on it:
the Repairs issues, the diagnostics payload, the notification_status service
and the panel banner. A second copy is how they drift apart.
"""

from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
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
    Notifier,
    default_priority,
    evaluate_notifications,
    normalize_service,
)
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import issue_registry as ir

from .test_session import setup_hub, zone_data


def test_the_groups_partition_every_event() -> None:
    grouped = [event for events in EVENT_GROUPS.values() for event in events]
    assert sorted(grouped) == sorted(ALL_EVENTS)
    assert len(grouped) == len(set(grouped))  # no event in two groups


def test_the_essential_events_are_the_four_an_irrigation_system_cannot_miss() -> None:
    assert ESSENTIAL_EVENTS == frozenset(  # noqa: SIM300
        {EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED}
    )
    assert ESSENTIAL_EVENTS <= set(ALL_EVENTS)  # noqa: SIM300


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
    config = {event: {"enabled": True, "services": ["phone"]} for event in sorted(ESSENTIAL_EVENTS)}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.verdict == "ok"


def test_some_essentials_covered_is_partial() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["phone"]}}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.verdict == "partial"


def test_a_recipient_that_is_not_registered_does_not_count_as_covered() -> None:
    config = {event: {"enabled": True, "services": ["gone"]} for event in sorted(ESSENTIAL_EVENTS)}
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


def test_an_unconfigured_event_reports_a_default_priority_but_no_stored_one() -> None:
    # The wizard re-saves what it reads. If the resolved default were the only
    # priority reported, the first Save would write it back as an explicit
    # choice -- and Notifier treats a stored priority as beating
    # default_priority from then on, freezing today's default forever.
    status = evaluate_notifications({EVENT_WATCHDOG: {"enabled": True, "services": ["phone"]}})
    watchdog = status.per_event[EVENT_WATCHDOG]
    assert watchdog.priority == PRIORITY_HIGH
    assert watchdog.stored_priority is None
    assert watchdog.as_dict()["stored_priority"] is None


def test_a_stored_priority_is_reported_as_both_stored_and_resolved() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["phone"], "priority": "normal"}}
    watchdog = evaluate_notifications(config).per_event[EVENT_WATCHDOG]
    assert watchdog.priority == PRIORITY_NORMAL
    assert watchdog.stored_priority == PRIORITY_NORMAL


def test_stored_recipients_keep_working_when_they_carry_the_notify_prefix() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["notify.phone"]}}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.per_event[EVENT_WATCHDOG].services == ("phone",)
    assert status.unreachable == {}


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


async def test_a_missing_recipient_does_not_stop_the_rest_of_the_list(
    hass: HomeAssistant,
) -> None:
    # One bad recipient must not shadow the others configured on the same
    # event -- the loop has to keep going past it, not return early.
    calls = _record_notify(hass, "phone")
    notifier = _notifier(hass, {EVENT_WATCHDOG: {"enabled": True, "services": ["gone", "phone"]}})
    await notifier.async_notify(EVENT_WATCHDOG, title="t", message="m")
    await hass.async_block_till_done()
    assert len(calls) == 1
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


async def test_the_two_repair_issues_can_both_be_true_at_once(hass: HomeAssistant) -> None:
    # One event enabled with no recipients is at once "configured-looking but
    # mute" (enabled_without_target) AND, since it is the only essential event
    # touched, covers zero of the essentials (silent). The two issues are
    # raised from separate conditions in evaluate_notifications, not an
    # if/elif of each other, so both must be able to stand at the same time.
    await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notifications_enabled_without_target") is not None
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is not None


async def test_fixing_one_repair_condition_leaves_the_other_standing(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "notifications_enabled_without_target") is not None
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is not None

    # Disabling the event fixes the "configured-looking but mute" shape, but
    # the install is still silent: nothing else was ever turned on.
    await hass.services.async_call(
        DOMAIN, "set_notifications", {"event": "interrupted", "enabled": False}, blocking=True
    )
    await hass.async_block_till_done()
    assert registry.async_get_issue(DOMAIN, "notifications_enabled_without_target") is None
    assert registry.async_get_issue(DOMAIN, "notifications_silent") is not None
    assert entry.options["notifications"]["interrupted"]["enabled"] is False
