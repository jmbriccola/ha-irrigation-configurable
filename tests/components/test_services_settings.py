"""The settings services behind the panel's Advanced drawers.

Eighteen settings used to exist only inside config-flow steps, which is what
forced a user out of the dashboard to change them.
"""

import pytest
import voluptuous as vol
from custom_components.irrigation_maestro.const import DOMAIN
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError

from .test_session import setup_hub, zone_data


async def test_session_limits_writes_only_what_it_is_given(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")], {"session_max_min": 90})
    await hass.services.async_call(
        DOMAIN, "set_session_limits", {"wait_free_min": 7}, blocking=True
    )
    assert entry.options["wait_free_min"] == 7
    assert entry.options["session_max_min"] == 90  # untouched


async def test_session_limits_accepts_every_field(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_session_limits",
        {
            "session_max_min": 120,
            "must_finish_by": "06:00",
            "wait_free_min": 5,
            "manual_block_min": 30,
            "settle_pause_s": 45,
            "sentinel_time": "23:30",
        },
        blocking=True,
    )
    assert entry.options["session_max_min"] == 120
    assert entry.options["must_finish_by"] == "06:00"
    assert entry.options["settle_pause_s"] == 45
    assert entry.options["sentinel_time"] == "23:30"


async def test_session_limits_rejects_out_of_range(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "set_session_limits", {"session_max_min": 0}, blocking=True
        )


async def test_valve_safety_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_valve_safety",
        {
            "open_confirm_s": 12,
            "close_confirm_s": 20,
            "switch_confirm_s": 8,
            "startup_valve_timeout_s": 30,
            "watchdog_max_min": 45,
        },
        blocking=True,
    )
    assert entry.options["open_confirm_s"] == 12
    assert entry.options["close_confirm_s"] == 20
    assert entry.options["switch_confirm_s"] == 8
    assert entry.options["startup_valve_timeout_s"] == 30
    assert entry.options["watchdog_max_min"] == 45


async def test_concurrency_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_concurrency",
        {
            "max_concurrent": 2,
            "compatibility_groups": "drip,lawn",
            "master_pre_open_s": 5,
            "master_post_close_s": 3,
        },
        blocking=True,
    )
    assert entry.options["max_concurrent"] == 2
    assert entry.options["compatibility_groups"] == "drip,lawn"
    assert entry.options["master_pre_open_s"] == 5
    assert entry.options["master_post_close_s"] == 3


async def test_concurrency_rejects_out_of_range(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "set_concurrency", {"max_concurrent": 0}, blocking=True
        )


async def test_settings_apply_without_a_reload(hass: HomeAssistant) -> None:
    # §5: config changes are applied in place, never by reloading the entry —
    # a reload would abort a running cycle.
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(DOMAIN, "set_concurrency", {"max_concurrent": 3}, blocking=True)
    await hass.async_block_till_done()
    assert entry.runtime_data.hub.max_concurrent == 3


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


async def test_notifications_can_disable_an_event(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_notifications", {"event": "skipped", "enabled": False}, blocking=True
    )
    assert entry.options["notifications"]["skipped"]["enabled"] is False


async def test_notifications_keeps_services_when_only_toggling(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"watchdog": {"enabled": True, "services": ["notify.a"]}}},
    )
    await hass.services.async_call(
        DOMAIN, "set_notifications", {"event": "watchdog", "enabled": False}, blocking=True
    )
    stored = entry.options["notifications"]["watchdog"]
    assert stored == {"enabled": False, "services": ["notify.a"]}


async def test_notifications_rejects_an_unknown_event(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "set_notifications", {"event": "not_an_event"}, blocking=True
        )


async def test_set_program_advanced_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {
            "zone_id": zone_id,
            "program_id": "cy_pots",
            "soak_max_run_min": 10,
            "soak_pause_min": 15,
        },
        blocking=True,
    )
    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.soak_max_run_min == 10
    assert cycle.soak_pause_min == 15


async def test_set_program_advanced_sets_the_volume_timeout(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {"zone_id": zone_id, "program_id": "cy_pots", "volume_safety_timeout_min": 45},
        blocking=True,
    )
    assert entry.runtime_data.zones[zone_id].config.cycle("cy_pots").volume_safety_timeout_min == 45


async def test_soak_pause_without_a_max_run_is_rejected(hass: HomeAssistant) -> None:
    # A pause with nothing to pause between is a configuration mistake, not a
    # no-op: the run would never be split, so the pause silently does nothing.
    from homeassistant.exceptions import ServiceValidationError

    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_advanced",
            {"zone_id": zone_id, "program_id": "cy_pots", "soak_pause_min": 15},
            blocking=True,
        )


async def test_soak_pause_is_allowed_when_a_max_run_already_exists(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {"zone_id": zone_id, "program_id": "cy_pots", "soak_max_run_min": 10},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {"zone_id": zone_id, "program_id": "cy_pots", "soak_pause_min": 20},
        blocking=True,
    )
    assert entry.runtime_data.zones[zone_id].config.cycle("cy_pots").soak_pause_min == 20


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
