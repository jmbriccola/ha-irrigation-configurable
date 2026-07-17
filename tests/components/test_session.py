"""Integration tests for the orchestrator: sessions, queue, §3 safety paths.

These tests drive the real component: mock valves respond to real service
calls, time is frozen and advanced step by step, and every scenario asserts
on actual entity states and issued commands.
"""

from datetime import timedelta
from typing import Any

from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from .mocks import BEHAVIOR_STUCK, MockValvePark

START = "2026-07-17 05:00:00+00:00"  # in season (July), before the 05:30 trigger


def zone_data(
    name: str,
    valve: str,
    *,
    at: str = "05:30",
    minutes: float = 3.0,
    order: int = 100,
    cycles: list[dict[str, Any]] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Zone subentry data with a fixed-duration curve for fast tests."""
    if cycles is None:
        cycles = [
            {
                "id": f"cy_{name.lower()}",
                "name": "Morning",
                "enabled": True,
                "trigger": {"kind": "time", "at": at},
                "curve": {
                    "points": [[20.0, minutes]],
                    "min_value": 1.0,
                    "max_value": 60.0,
                },
            }
        ]
    return {
        "name": name,
        "valve_entity": valve,
        "order": order,
        "interval_days": 1,
        "cycles": cycles,
        **extra,
    }


def mock_weather(hass: HomeAssistant, *, condition: str = "sunny", temp: float = 30.0) -> None:
    hass.states.async_set(
        "weather.test",
        condition,
        {"temperature": temp, "wind_speed": 5.0, "wind_speed_unit": "km/h"},
    )
    now = dt_util.utcnow().replace(minute=0, second=0, microsecond=0)
    forecast = [
        {
            "datetime": (now + timedelta(hours=hour)).isoformat(),
            "temperature": 30.0,
            "precipitation": 0.0,
        }
        for hour in range(1, 49)
    ]

    async def get_forecasts(call: ServiceCall) -> dict[str, Any]:
        targets = call.data["entity_id"]
        if isinstance(targets, str):
            targets = [targets]
        return {entity_id: {"forecast": forecast} for entity_id in targets}

    hass.services.async_register(
        "weather", "get_forecasts", get_forecasts, supports_response=SupportsResponse.ONLY
    )


async def setup_hub(
    hass: HomeAssistant,
    zones: list[dict[str, Any]],
    options: dict[str, Any] | None = None,
) -> MockConfigEntry:
    await hass.config.async_set_time_zone("UTC")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Irrigation Maestro",
        data={},
        options={
            "weather_entity": "weather.test",
            "settle_pause_s": 60,
            **(options or {}),
        },
        subentries_data=[
            {
                "data": zone,
                "subentry_type": "zone",
                "title": zone["name"],
                "unique_id": None,
            }
            for zone in zones
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def advance(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, seconds: float, step: float = 10.0
) -> None:
    """Advance frozen time in steps so chained timers fire in order."""
    remaining = seconds
    while remaining > 0:
        tick = min(step, remaining)
        freezer.tick(timedelta(seconds=tick))
        async_fire_time_changed(hass)
        await hass.async_block_till_done()
        remaining -= tick


def open_valves(hass: HomeAssistant) -> set[str]:
    return {
        state.entity_id
        for state in hass.states.async_all(("valve", "switch"))
        if state.state in ("open", "on")
    }


async def test_scheduled_cycle_runs_to_completion(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])

    events: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_cycle_finished", events.append)

    await advance(hass, freezer, 31 * 60)  # trigger at 05:30
    assert hass.states.get("valve.pots").state == "open"

    await advance(hass, freezer, 4 * 60)  # 3-minute duration elapses
    assert hass.states.get("valve.pots").state == "closed"
    assert len(events) == 1
    assert events[0].data["zone_name"] == "Pots"

    runtime = entry.runtime_data
    assert runtime.state.last_completed(runtime.zone_ids[0]) == dt_util.now().date()
    assert runtime.state.last_outcome(runtime.zone_ids[0])["result"] == "completed"


async def test_two_zones_never_open_together(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1),
            zone_data("Beta", "valve.b", order=2),
        ],
    )

    overlap_seen = []

    def check_overlap(*_args: Any) -> None:
        if len(open_valves(hass)) > 1:
            overlap_seen.append(open_valves(hass))

    hass.bus.async_listen("state_changed", check_overlap)

    # Trigger both; run through both cycles plus the settle pause.
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    assert hass.states.get("valve.b").state == "closed"

    await advance(hass, freezer, 12 * 60)
    assert hass.states.get("valve.a").state == "closed"
    assert hass.states.get("valve.b").state == "closed"
    assert not overlap_seen
    # Beta actually watered at some point.
    assert ("open_valve", "valve.b") in park.commands


async def test_manual_close_interrupts_and_blocks_queue(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1, minutes=10),
            zone_data("Beta", "valve.b", order=2),
        ],
    )

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    park.force_state("valve.a", "closed")  # manual intervention
    await advance(hass, freezer, 60)

    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids
    assert runtime.state.last_outcome(alpha)["result"] == "interrupted"
    assert runtime.state.manual_stop_at is not None
    # Beta never opens: queue blocked by the manual stop.
    await advance(hass, freezer, 15 * 60)
    assert ("open_valve", "valve.b") not in park.commands
    assert runtime.state.last_outcome(beta)["result"] == "cancelled"
    assert runtime.state.last_outcome(beta)["reason_key"] == "manual_stop_block"


async def test_foreign_valve_open_aborts_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1, minutes=10),
            zone_data("Beta", "valve.b", order=2, at="06:30"),
        ],
    )

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    park.force_state("valve.b", "open")  # foreign valve opens mid-cycle
    await advance(hass, freezer, 60)

    # Everything is closed immediately.
    assert ("close_valve", "valve.a") in park.commands
    assert ("close_valve", "valve.b") in park.commands
    runtime = entry.runtime_data
    assert runtime.state.last_outcome(runtime.zone_ids[0])["result"] == "interrupted"


async def test_valve_that_never_opens_cancels_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.set_behavior("valve.a", BEHAVIOR_STUCK)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])

    await advance(hass, freezer, 31 * 60)  # trigger
    await advance(hass, freezer, 3 * 60)  # open confirmation window (2 min)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "cancelled"
    assert outcome["reason_key"] == "open_failed"


async def test_busy_valves_cancel_after_wait(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.stranger")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1),
            zone_data("Stray", "valve.stranger", order=2, at="06:30"),
        ],
        options={"wait_free_min": 5},
    )

    # A managed valve gets stuck open after setup (the startup check already
    # ran, and stuck valves ignore close commands from now on).
    park.force_state("valve.stranger", "open")
    park.set_behavior("valve.stranger", BEHAVIOR_STUCK)

    await advance(hass, freezer, 31 * 60)  # Alpha triggers; stranger already open
    await advance(hass, freezer, 6 * 60)  # wait-free timeout (5 min)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "cancelled"
    assert outcome["reason_key"] == "valves_busy"
    assert ("open_valve", "valve.a") not in park.commands


async def test_budget_skip_records_outcome_and_aggregates_notification(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass, condition="cloudy")

    notifications: list[ServiceCall] = []

    async def notify(call: ServiceCall) -> None:
        notifications.append(call)

    hass.services.async_register("notify", "test_target", notify)

    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1),
            zone_data("Beta", "valve.b", order=2),
        ],
        options={"notifications": {"skipped": {"enabled": True, "services": ["test_target"]}}},
    )
    runtime = entry.runtime_data
    # Lots of recent rain: budget >= threshold.
    runtime.state.add_rain(dt_util.now().date(), 20.0, runtime.hub.engine_params)

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 2 * 60)

    assert not open_valves(hass)
    for zone_id in runtime.zone_ids:
        outcome = runtime.state.last_outcome(zone_id)
        assert outcome["result"] == "skipped"
        assert outcome["reason_key"] == "budget_sufficient"
    # ONE aggregated notification for the shared reason, naming both zones.
    assert len(notifications) == 1
    assert "Alpha" in notifications[0].data["message"]
    assert "Beta" in notifications[0].data["message"]


async def test_switch_zone_waters_with_switch_services(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("switch.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "switch.pots")])

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("switch.pots").state == "on"
    await advance(hass, freezer, 4 * 60)
    assert hass.states.get("switch.pots").state == "off"
    runtime = entry.runtime_data
    assert runtime.state.last_outcome(runtime.zone_ids[0])["result"] == "completed"


async def test_session_overrun_skips_remaining_zones(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1, minutes=10),
            zone_data("Beta", "valve.b", order=2),
        ],
        options={"session_max_min": 8},
    )

    await advance(hass, freezer, 31 * 60)  # Alpha starts (10 min planned)
    await advance(hass, freezer, 12 * 60)  # Alpha ends past the 8-min session cap

    runtime = entry.runtime_data
    beta = runtime.zone_ids[1]
    outcome = runtime.state.last_outcome(beta)
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "session_overrun"
    assert ("open_valve", "valve.b") not in park.commands


async def test_restart_closes_orphan_valves_once_available(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No legitimate cycle survives a restart: startup closes leftovers."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.force_state("valve.a", "unavailable")  # Zigbee not up yet
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Alpha", "valve.a")])

    hass.bus.async_fire("homeassistant_started")
    await hass.async_block_till_done()

    # Valve becomes available later, found open (left over from before restart).
    await advance(hass, freezer, 60)
    park.force_state("valve.a", "open")
    await advance(hass, freezer, 30)
    assert ("close_valve", "valve.a") in park.commands
    assert hass.states.get("valve.a").state == "closed"


async def test_watchdog_closes_valve_open_too_long(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00")], options={"watchdog_max_min": 70}
    )

    park.force_state("valve.a", "open")  # opened outside any session
    await advance(hass, freezer, 75 * 60, step=60.0)
    assert ("close_valve", "valve.a") in park.commands
    assert hass.states.get("valve.a").state == "closed"


async def test_config_update_midcycle_does_not_interrupt(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=6)])

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 30})
    await hass.async_block_till_done()

    # Still watering; new option visible in runtime.
    assert hass.states.get("valve.a").state == "open"
    assert entry.runtime_data.hub.settle_pause_s == 30

    await advance(hass, freezer, 7 * 60)
    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    assert runtime.state.last_outcome(runtime.zone_ids[0])["result"] == "completed"
