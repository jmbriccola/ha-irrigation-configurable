"""The two history services: what they return, and what they refuse to imply."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro import services
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine import metering, runlog
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


async def _hub(hass: HomeAssistant, *, time_zone: str | None = "UTC") -> Any:
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
        time_zone=time_zone,
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


async def test_the_reserved_unattributed_key_cannot_be_requested_as_a_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """sum_period skips it unconditionally while daily_series does not, so a
    zones row for it would report a total of zero over days holding real
    litres. Summing the zones has to stay the right operation."""
    freezer.move_to(START)
    await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    runtime.state.add_unattributed("__hub__", 5.0, day=dt_util.now().date(), valves_closed=True)

    response = await _water(hass, zone_id=metering.UNATTRIBUTED_KEY)

    assert response["zones"] == []
    assert response["unattributed"]["total_l"] == 5.0


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


async def test_total_l_is_summed_from_the_same_days_it_labels(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """total_l must equal the sum of the returned days, not an independently
    rounded figure: a card draws the bars and prints the total beside them,
    and the two must never disagree about what they add up to."""
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    # Five sub-millilitre days: each rounds to 0.0 individually, while their
    # raw sum (0.002) would round to a nonzero figure -- exactly the split
    # that a "sum-then-round" computation of total_l would expose.
    for offset in range(5):
        runtime.state.add_water(
            zone_id, 0.0004, day=today - timedelta(days=offset), estimated=False
        )

    response = await _water(hass, zone_id=zone_id)

    zone = response["zones"][0]
    assert zone["total_l"] == round(sum(day["l"] for day in zone["days"]), 3)


async def test_oldest_recorded_is_not_the_retention_floor(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """oldest_available is the retention floor (today - 729); oldest_recorded
    is the oldest day the history actually holds data for. Collapsing the two
    would let a card draw confident zeros for the stretch before this
    installation existed."""
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    zone_id = _zone_ids(entry)[0]
    today = dt_util.now().date()
    runtime.state.add_water(zone_id, 5.0, day=today, estimated=False)

    response = await _water(hass)

    floor = today - timedelta(days=metering.RETENTION_DAYS - 1)
    assert response["oldest_available"] == floor.isoformat()
    assert response["oldest_recorded"] == today.isoformat()
    assert response["oldest_recorded"] != response["oldest_available"]


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


async def test_a_range_starting_exactly_at_the_retention_floor_is_not_truncated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Asking for precisely everything the component holds has truncated
    nothing, and must not say it has. One day earlier must."""
    freezer.move_to(START)
    await _hub(hass)
    floor = dt_util.now().date() - timedelta(days=metering.RETENTION_DAYS - 1)

    at_floor = await _water(hass, start_date=floor.isoformat())
    below_floor = await _water(hass, start_date=(floor - timedelta(days=1)).isoformat())

    assert at_floor["truncated_by_retention"] is False
    assert at_floor["start"] == floor.isoformat()
    assert below_floor["truncated_by_retention"] is True


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

    with pytest.raises(ServiceValidationError) as err:
        await _water(
            hass,
            start_date=today.isoformat(),
            end_date=(today - timedelta(days=5)).isoformat(),
        )
    assert err.value.translation_key == "invalid_history_range"


async def test_an_installation_with_no_zones_answers_rather_than_raising(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    await setup_hub(hass, [])

    response = await _water(hass)

    assert response["zones"] == []
    assert response["unattributed"]["total_l"] == 0.0
    assert response["oldest_recorded"] is None


# ---------------------------------------------------------------------------
# get_run_history
# ---------------------------------------------------------------------------


async def _runs(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(
        DOMAIN, "get_run_history", data, blocking=True, return_response=True
    )


def _seed(hass: HomeAssistant, *entries: runlog.RunEntry) -> None:
    log = hass.config_entries.async_entries(DOMAIN)[0].runtime_data.run_log
    for entry in entries:
        log.append(entry)


def _run(
    at: datetime, *, zone_id: str = "z1", result: str = "completed", name: str = "Vasi"
) -> runlog.RunEntry:
    return runlog.build_entry(
        at=at,
        zone_id=zone_id,
        zone_name=name,
        program_id="p1",
        program_name="Mattino",
        result=result,
        reason_key=None if result == "completed" else "budget_sufficient",
        duration_min=12 if result == "completed" else None,
        volume_l=40.0 if result == "completed" else None,
        partial=False,
        scheduled=True,
    )


async def test_runs_come_back_oldest_first_so_the_two_series_share_an_axis(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(hass, _run(now - timedelta(hours=2)), _run(now - timedelta(hours=1)))

    response = await _runs(hass)

    assert [entry["at"] for entry in response["runs"]] == sorted(
        entry["at"] for entry in response["runs"]
    )
    assert response["count"] == 2


async def test_a_skip_reports_its_reason_and_null_figures(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    _seed(hass, _run(dt_util.utcnow(), result="skipped"))

    entry = (await _runs(hass))["runs"][0]

    assert entry["result"] == "skipped"
    assert entry["reason_key"] == "budget_sufficient"
    assert entry["duration_min"] is None
    assert entry["volume_l"] is None
    assert entry["partial"] is False


async def test_the_zone_and_result_filters_combine(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(
        hass,
        _run(now - timedelta(hours=3), zone_id="z1", result="completed"),
        _run(now - timedelta(hours=2), zone_id="z1", result="skipped"),
        _run(now - timedelta(hours=1), zone_id="z2", result="skipped"),
    )

    response = await _runs(hass, zone_id="z1", result="skipped")

    assert response["count"] == 1
    assert response["runs"][0]["zone_id"] == "z1"
    assert response["runs"][0]["result"] == "skipped"


async def test_the_limit_keeps_the_most_recent_and_declares_itself(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    now = dt_util.utcnow()
    _seed(hass, *[_run(now - timedelta(hours=hours)) for hours in (5, 4, 3, 2, 1)])

    response = await _runs(hass, limit=2)

    assert response["truncated_by_limit"] is True
    assert response["count"] == 2
    assert response["runs"][-1]["at"] == (now - timedelta(hours=1)).isoformat()


async def test_a_young_log_is_not_reported_as_truncated_by_the_cap(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A fresh install has an oldest entry newer than the requested start and
    has truncated nothing. Only cap_dropped tells the two apart."""
    freezer.move_to(START)
    await _hub(hass)
    _seed(hass, _run(dt_util.utcnow()))

    response = await _runs(hass)

    assert response["truncated_by_cap"] is False
    assert response["oldest_kept"] is not None


async def test_a_capped_log_whose_window_starts_earlier_is_reported_as_truncated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    log = hass.config_entries.async_entries(DOMAIN)[0].runtime_data.run_log
    now = dt_util.utcnow()
    # Seeded directly rather than appended MAX_RUNS times: append_run's cap is
    # proved in tests/engine/test_runlog.py. What matters here is that a log
    # the cap HAS bitten reports differently from one it has not, for a window
    # that starts before the oldest surviving entry.
    log._data["runs"] = [
        _run(now - timedelta(seconds=runlog.MAX_RUNS - index)) for index in range(runlog.MAX_RUNS)
    ]
    log.append(_run(now))

    response = await _runs(hass, start_date=(dt_util.now().date() - timedelta(days=5)).isoformat())

    assert log.cap_dropped == 1
    assert response["truncated_by_cap"] is True


async def test_an_empty_log_answers_with_a_null_oldest_rather_than_raising(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)

    response = await _runs(hass)

    assert response["runs"] == []
    assert response["count"] == 0
    assert response["oldest_kept"] is None
    assert response["truncated_by_cap"] is False


async def test_a_run_range_older_than_retention_is_clamped_and_declares_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Same name as the get_water_history test above would collide -- Python
    would silently rebind the module-level name to this one and the earlier
    test would never run again (ruff F811 catches exactly this)."""
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    response = await _runs(hass, start_date=(today - timedelta(days=900)).isoformat())

    assert response["truncated_by_retention"] is True
    assert response["start"] == (today - timedelta(days=runlog.RETENTION_DAYS - 1)).isoformat()


async def test_a_run_range_starting_exactly_at_the_retention_floor_is_not_truncated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Same reasoning as the get_water_history version above, and its own test
    because the two services own separate comparisons against separate
    RETENTION_DAYS constants that happen to share a value."""
    freezer.move_to(START)
    await _hub(hass)
    floor = dt_util.now().date() - timedelta(days=runlog.RETENTION_DAYS - 1)

    at_floor = await _runs(hass, start_date=floor.isoformat())
    below_floor = await _runs(hass, start_date=(floor - timedelta(days=1)).isoformat())

    assert at_floor["truncated_by_retention"] is False
    assert at_floor["start"] == floor.isoformat()
    assert below_floor["truncated_by_retention"] is True


async def test_a_run_recorded_before_the_local_offset_is_filed_on_its_local_day(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """00:30 in CEST carries the previous UTC date. Filtering on the raw string
    would file it a day early -- an off-by-one that reads as correct until a
    chart's first or last day is wrong."""
    freezer.move_to("2026-08-15 22:30:00+00:00")  # 2026-08-16 00:30 local
    await _hub(hass, time_zone="Europe/Rome")
    _seed(hass, _run(datetime(2026, 8, 15, 22, 30, tzinfo=UTC)))

    same_day = await _runs(hass, start_date="2026-08-16", end_date="2026-08-16")
    day_before = await _runs(hass, start_date="2026-08-15", end_date="2026-08-15")

    assert same_day["count"] == 1
    assert day_before["count"] == 0


async def test_the_run_prune_cutoff_and_the_water_retention_floor_agree(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Both derive RETENTION_DAYS - 1 days before today, independently. If
    either drifted, the prune would drop a day the service still advertises
    in oldest_available, and truncated_by_retention would go false all-clear
    -- the one direction this design forbids."""
    freezer.move_to(START)
    entry = await _hub(hass)
    runtime = entry.runtime_data
    today = dt_util.now().date()

    cutoff = dt_util.as_local(runtime._run_retention_cutoff(today)).date()
    floor = services._retention_floor(runlog.RETENTION_DAYS)
    assert cutoff == floor


async def test_a_backwards_range_is_refused_here_too(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    await _hub(hass)
    today = dt_util.now().date()

    with pytest.raises(ServiceValidationError) as err:
        await _runs(
            hass,
            start_date=today.isoformat(),
            end_date=(today - timedelta(days=5)).isoformat(),
        )
    assert err.value.translation_key == "invalid_history_range"
