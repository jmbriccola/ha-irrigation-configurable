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


def test_stored_recipients_keep_working_when_they_carry_the_notify_prefix() -> None:
    config = {EVENT_WATCHDOG: {"enabled": True, "services": ["notify.phone"]}}
    status = evaluate_notifications(config, known_services={"phone"})
    assert status.per_event[EVENT_WATCHDOG].services == ("phone",)
    assert status.unreachable == {}
