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
from .test_session import START, mock_weather, setup_hub, zone_data


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
    runtime.state.add_consumption(150.0, period_start=date(2026, 7, 1))
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
    runtime.state.add_consumption(10.0, period_start=date(2026, 7, 1))
    assert runtime._consumption_factor() == (1.0, False)
