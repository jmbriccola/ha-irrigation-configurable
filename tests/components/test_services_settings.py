"""The settings services behind the panel's Advanced drawers.

Eighteen settings used to exist only inside config-flow steps, which is what
forced a user out of the dashboard to change them.
"""

import pytest
import voluptuous as vol
from custom_components.irrigation_maestro.const import DOMAIN
from homeassistant.core import HomeAssistant

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
