"""The consumption budget gate: notify, reduce, suspend.

runtime._consumption_factor drives real duration changes and real session
suspension, and had no end-to-end test. test_session.py's
test_budget_skip_records_outcome_and_aggregates_notification is a false
friend -- it asserts reason_key == "budget_sufficient", which is the rain
budget in millimetres, an unrelated mechanism.
"""

from datetime import date

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def _hub_over_budget(hass: HomeAssistant, freezer: FrozenDateTimeFactory, action: str):
    """A hub whose monthly counter already sits above a 100 L budget."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=5.0)],
        {"consumption_budget": {"liters_per_month": 100, "action": action, "reduce_pct": 50}},
    )
    runtime = entry.runtime_data
    runtime.state.set_carried_over(date(2026, 7, 1), 150.0)
    return entry, runtime, park


async def test_budget_notify_fires_once_per_period(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "notify")
    events: list[dict] = []
    hass.bus.async_listen("irrigation_maestro_consumption_budget", lambda e: events.append(e.data))

    runtime._consumption_factor()
    runtime._consumption_factor()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0]["liters"] == 150.0


async def test_budget_reduce_halves_the_factor(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "reduce")
    factor, suspend = runtime._consumption_factor()
    assert factor == 0.5
    assert suspend is False


async def test_budget_suspend_sets_the_suspend_flag(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "suspend")
    factor, suspend = runtime._consumption_factor()
    assert factor == 1.0
    assert suspend is True


async def test_budget_under_the_limit_does_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10)],
        {"consumption_budget": {"liters_per_month": 1000, "action": "suspend"}},
    )
    runtime = entry.runtime_data
    runtime.state.set_carried_over(date(2026, 7, 1), 10.0)
    assert runtime._consumption_factor() == (1.0, False)


async def test_the_budget_total_is_the_sum_of_the_zones(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One number, derived, so a zone total and the budget cannot diverge."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)],
        {"consumption_budget": {"liters_per_month": 1000, "action": "notify"}},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    assert runtime.consumption_used_liters() == runtime.state.zone_water_total(zone_id)


async def test_the_carried_balance_is_included_then_expires(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)  # July 2026
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data
    runtime.state.set_carried_over(date(2026, 7, 1), 250.0)

    assert runtime.consumption_used_liters() == 250.0

    freezer.move_to("2026-08-02 05:00:00+00:00")
    assert runtime.consumption_used_liters() == 0.0


async def test_unattributed_water_stays_out_of_the_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A leak must not suspend irrigation through the budget action."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10)],
        {"consumption_budget": {"liters_per_month": 100, "action": "suspend"}},
    )
    runtime = entry.runtime_data
    runtime.state.add_unattributed("__hub__", 5000.0, day=date(2026, 7, 17), valves_closed=True)

    assert runtime.consumption_used_liters() == 0.0
    assert runtime._consumption_factor() == (1.0, False)


async def test_the_consumption_gate_reports_without_notifying(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The notifying half and the reporting half are different jobs.

    The next-run verdict is computed inside a sensor attribute read, so a gate
    that notified would dispatch a budget notification because a card was
    rendered -- a moment at which nothing about the budget happened.
    """
    _entry, runtime, _park = await _hub_over_budget(hass, freezer, "suspend")
    events: list[dict] = []
    hass.bus.async_listen("irrigation_maestro_consumption_budget", lambda e: events.append(e.data))

    gate = runtime._consumption_gate()
    await hass.async_block_till_done()

    assert gate == (1.0, True), "an over-budget suspend hub must still report suspend_all"
    assert events == [], "the gate must not fire the budget event"

    runtime._consumption_factor()
    await hass.async_block_till_done()

    assert len(events) == 1, "the notifying half must still notify"
