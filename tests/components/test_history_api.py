"""The two history services: what they return, and what they refuse to imply."""

from datetime import timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine import metering
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


async def _hub(hass: HomeAssistant) -> Any:
    park = MockValvePark(hass)
    park.add("valve.vasi")
    park.add("valve.prato")
    mock_weather(hass)
    return await setup_hub(
        hass,
        [
            zone_data("Vasi", "valve.vasi", at="23:59", order=10),
            zone_data("Prato", "valve.prato", at="23:59", order=20),
        ],
    )


def _zone_ids(entry: Any) -> list[str]:
    return list(entry.subentries)


async def _water(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(
        DOMAIN, "get_water_history", data, blocking=True, return_response=True
    )


async def test_the_default_window_is_thirty_inclusive_days_ending_today(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass)

    today = dt_util.now().date()
    assert response["end"] == today.isoformat()
    assert response["start"] == (today - timedelta(days=29)).isoformat()
    assert len(response["zones"][0]["days"]) == 30


async def test_a_configured_zone_with_no_water_is_returned_as_zeros_not_omitted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Omitted would be indistinguishable from a zone that does not exist."""
    freezer.move_to(START)
    entry = await _hub(hass)

    response = await _water(hass)

    returned = {zone["zone_id"] for zone in response["zones"]}
    assert returned == set(_zone_ids(entry))
    assert all(day["l"] == 0.0 for day in response["zones"][0]["days"])


async def test_naming_one_zone_returns_exactly_that_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    first = _zone_ids(entry)[0]

    response = await _water(hass, zone_id=first)

    assert [zone["zone_id"] for zone in response["zones"]] == [first]


async def test_naming_several_zones_returns_those_in_order_then_name(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    ids = _zone_ids(entry)

    response = await _water(hass, zone_id=list(reversed(ids)))

    assert [zone["zone_name"] for zone in response["zones"]] == ["Vasi", "Prato"]


async def test_the_unattributed_row_is_a_sibling_of_the_zones_never_a_member(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Summing the zones must stay the right operation."""
    freezer.move_to(START)
    await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    today = dt_util.now().date()
    runtime.state.add_unattributed("__hub__", 5.0, day=today, valves_closed=True)

    response = await _water(hass)

    assert all(zone["zone_id"] != metering.UNATTRIBUTED_KEY for zone in response["zones"])
    assert sum(zone["total_l"] for zone in response["zones"]) == 0.0
    assert response["unattributed"]["total_l"] == 5.0
    assert response["unattributed"]["closed_l"] == 5.0


async def test_est_and_gap_s_reach_the_response(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 12.0, day=today, estimated=True, gap_s=90.0)

    response = await _water(hass, zone_id=zone_id)

    point = response["zones"][0]["days"][-1]
    assert point["l"] == 12.0
    assert point["est"] is True
    assert point["gap_s"] == 90.0


async def test_a_blind_day_and_a_quiet_day_are_different_records(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 0.0, day=today, estimated=False, gap_s=21600.0)

    response = await _water(hass, zone_id=zone_id)

    blind, quiet = response["zones"][0]["days"][-1], response["zones"][0]["days"][-2]
    assert blind["l"] == 0.0 and blind["gap_s"] == 21600.0
    assert quiet["l"] == 0.0 and quiet["gap_s"] == 0.0


async def test_a_range_older_than_retention_is_clamped_and_declares_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _water(hass, start_date=(today - timedelta(days=900)).isoformat())

    floor = today - timedelta(days=metering.RETENTION_DAYS - 1)
    assert response["truncated_by_retention"] is True
    assert response["start"] == floor.isoformat()
    assert response["oldest_available"] == floor.isoformat()


async def test_a_range_inside_retention_declares_no_truncation(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass)

    assert response["truncated_by_retention"] is False


async def test_include_unattributed_false_omits_the_key_entirely(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An empty object would let a caller read "no unattributed water" from a
    request that never asked."""
    freezer.move_to(START)
    await _hub(hass)

    response = await _water(hass, include_unattributed=False)

    assert "unattributed" not in response


async def test_a_zone_that_no_longer_exists_keeps_its_water_with_a_null_name(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 30.0, day=today, estimated=False)

    await hass.services.async_call(DOMAIN, "remove_zone", {"zone_id": zone_id}, blocking=True)
    await hass.async_block_till_done()
    response = await _water(hass)

    gone = [zone for zone in response["zones"] if zone["zone_id"] == zone_id]
    assert gone and gone[0]["zone_name"] is None
    assert gone[0]["total_l"] == 30.0
    assert response["zones"][-1]["zone_id"] == zone_id  # unconfigured sorts last


async def test_a_future_end_date_is_clamped_to_today(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _water(hass, end_date=(today + timedelta(days=10)).isoformat())

    assert response["end"] == today.isoformat()


async def test_a_backwards_range_is_refused_rather_than_silently_swapped(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A caller with its arguments the wrong way round has a bug, and quietly
    fixing it hides the bug."""
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    with pytest.raises(ServiceValidationError):
        await _water(
            hass,
            start_date=today.isoformat(),
            end_date=(today - timedelta(days=5)).isoformat(),
        )


async def test_an_installation_with_no_zones_answers_rather_than_raising(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    await setup_hub(hass, [])

    response = await _water(hass)

    assert response["zones"] == []
    assert response["unattributed"]["total_l"] == 0.0
