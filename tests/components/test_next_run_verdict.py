"""Today's verdict: would this zone water if its programs fired right now.

Deliberately not a claim about the instant ``zone_next_run`` reports. That
sensor already resolves every gate that can be projected forward -- calendar,
season, suspension, pause, skip-today. What this adds is the layer that only
exists in the present, and the tests below pin the difference rather than
blurring it.
"""

from typing import Any

from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_entities import role_state
from .test_session import START, mock_weather, setup_hub, zone_data


def _verdict(hass: HomeAssistant, zone_id: str) -> dict[str, Any]:
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None, "the zone has no zone_state sensor"
    return dict(state.attributes["next_run"])


async def _evaluated_hub(hass: HomeAssistant, zones: list[dict[str, Any]]) -> Any:
    """A hub that has run one evaluation, so the verdict is not `unknown`."""
    park = MockValvePark(hass)
    for zone in zones:
        park.add(zone["valve_entity"])
    mock_weather(hass)
    entry = await setup_hub(hass, zones)
    await hass.services.async_call(DOMAIN, "evaluate", {}, blocking=True, return_response=True)
    await hass.async_block_till_done()
    return entry


async def _refresh(hass: HomeAssistant, entry: Any) -> None:
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()


async def test_a_due_program_in_good_weather_would_run(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])

    verdict = _verdict(hass, next(iter(entry.subentries)))

    assert verdict["verdict"] == "would_run"
    assert verdict["reason_key"] is None
    assert verdict["evaluated_at"] is not None
    assert [program["verdict"] for program in verdict["programs"]] == ["would_run"]


async def test_before_any_evaluation_the_verdict_is_unknown_and_not_a_guess(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """`unknown` is not `weather_unavailable`.

    That reason means an evaluation ran and could not reach the weather. This
    means none has run at all, and asserting either verdict on no information
    would be an answer nobody has earned.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])

    verdict = _verdict(hass, next(iter(entry.subentries)))

    assert verdict["verdict"] == "unknown"
    assert verdict["reason_key"] is None
    assert verdict["evaluated_at"] is None
    assert verdict["programs"] == []


async def test_a_disabled_zone_explains_itself_where_zone_next_run_says_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The case this design exists for, stated as it actually behaves.

    ``zone_next_run`` stays *available* with a state of ``unknown`` -- it does
    not go unavailable, so its attributes are still published. What it loses is
    its contents: ``_role_attributes`` returns an empty dict whenever there is
    no next occurrence, so on a disabled zone it carries no ``cycle_id``, no
    ``cycle_name``, and nothing that could name a reason. It is silent exactly
    when the explanation is the only thing left to say.
    """
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_zone_enabled(zone_id, False)
    await _refresh(hass, entry)

    next_run = role_state(hass, "zone_next_run", zone_id)
    verdict = _verdict(hass, zone_id)

    assert next_run is not None and next_run.state == "unknown"
    assert "cycle_id" not in next_run.attributes
    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] == "zone_disabled"


async def test_a_program_not_scheduled_today_says_so(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """START is a Friday; this program runs on Mondays."""
    freezer.move_to(START)
    entry = await _evaluated_hub(
        hass,
        [zone_data("Vasi", "valve.vasi", at="23:59", calendar={"mode": "weekdays", "days": [0]})],
    )

    verdict = _verdict(hass, next(iter(entry.subentries)))

    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] == "calendar_not_today"


def _two_programs() -> list[dict[str, Any]]:
    curve = {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0}
    return [
        {
            "id": "cy_monday",
            "name": "Monday only",
            "enabled": True,
            "trigger": {"kind": "time", "at": "23:59"},
            "calendar": {"mode": "weekdays", "days": [0]},
            "curve": curve,
        },
        {
            "id": "cy_off",
            "name": "Switched off",
            "enabled": True,
            "trigger": {"kind": "time", "at": "23:59"},
            "curve": curve,
        },
    ]


async def test_two_programs_blocked_for_different_reasons_name_neither_at_zone_level(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Naming one of two would send the user to the wrong setting."""
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", cycles=_two_programs())])
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_cycle_enabled(zone_id, "cy_off", False)
    await _refresh(hass, entry)

    verdict = _verdict(hass, zone_id)

    assert verdict["verdict"] == "blocked"
    assert verdict["reason_key"] is None
    assert {program["reason_key"] for program in verdict["programs"]} == {
        "calendar_not_today",
        "cycle_disabled",
    }


async def test_two_programs_blocked_for_the_same_reason_name_it_once(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", cycles=_two_programs())])
    zone_id = next(iter(entry.subentries))
    entry.runtime_data.state.set_zone_enabled(zone_id, False)
    await _refresh(hass, entry)

    verdict = _verdict(hass, zone_id)

    assert verdict["reason_key"] == "zone_disabled"
    assert all(program["reason_key"] == "zone_disabled" for program in verdict["programs"])


async def test_one_program_running_carries_the_zone_even_when_another_is_blocked(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """ "Will this zone water" is an any, not an all."""
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", cycles=_two_programs())])

    verdict = _verdict(hass, next(iter(entry.subentries)))

    assert verdict["verdict"] == "would_run"
    assert verdict["reason_key"] is None
    by_id = {program["cycle_id"]: program for program in verdict["programs"]}
    assert by_id["cy_monday"]["verdict"] == "blocked"
    assert by_id["cy_off"]["verdict"] == "would_run"


async def test_evaluated_at_is_the_instant_of_the_evaluation_actually_used(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    entry = await _evaluated_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    stamp, _evaluation = entry.runtime_data._last_evaluation

    assert _verdict(hass, next(iter(entry.subentries)))["evaluated_at"] == stamp.isoformat()


async def test_reading_the_attributes_of_an_over_budget_hub_notifies_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The defect stated where a user would meet it, not at the helper.

    A card refreshing is not a moment at which anything about the budget
    happened, so it must not be the moment the budget notification fires.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Vasi", "valve.vasi", at="23:59")],
        {"consumption_budget": {"liters_per_month": 1, "action": "suspend"}},
    )
    entry.runtime_data.state.set_carried_over(dt_util.now().date().replace(day=1), 500.0)
    await hass.services.async_call(DOMAIN, "evaluate", {}, blocking=True, return_response=True)
    await hass.async_block_till_done()

    events: list[dict[str, Any]] = []
    hass.bus.async_listen("irrigation_maestro_consumption_budget", lambda e: events.append(e.data))
    for _ in range(3):
        await _refresh(hass, entry)

    assert events == [], "rendering a card must not fire a budget event"
    assert _verdict(hass, next(iter(entry.subentries)))["reason_key"] == "consumption_budget"
