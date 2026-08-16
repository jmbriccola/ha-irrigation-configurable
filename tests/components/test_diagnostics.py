"""The diagnostics payload makes in-memory state inspectable without .storage.

Two subjects: the notification verdict, and -- since 3.4.0 -- the leak picture.
The second earns a place here for a reason the first does not have. The leak
alarm and its observation window are deliberately NOT persisted, so
``runtime_state`` (which is ``state.as_dict()``) carries none of it, and the
subsystem's failure mode is silence: a scope that has never been observable
and a broken integration look identical from outside. What is asserted below
is therefore not "the keys exist" but that each value tracks the thing it
claims to, in a state where a plausible wrong implementation would differ.
"""

from datetime import timedelta
from typing import Any

from custom_components.irrigation_maestro.const import (
    DEGRADED_LEAK_EVIDENCE_UNRESOLVED,
    DEGRADED_LEAK_NEVER_OBSERVABLE,
)
from custom_components.irrigation_maestro.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.irrigation_maestro.engine import runlog
from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_leak_entities import _leak_entity, _moisture
from .test_leaks import _PAST_CONFIRM_S, _WELL_PAST_CONFIRM_S, _reconfigure_zone
from .test_session import START, advance, mock_weather, setup_hub, zone_data

_STALL_NOTICE_S = 3600


async def _leaks(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    payload = await async_get_config_entry_diagnostics(hass, entry)
    leaks: dict[str, Any] = payload["leaks"]
    return leaks


async def test_diagnostics_carry_the_notification_verdict(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"interrupted": {"enabled": True, "services": []}}},
    )
    payload = await async_get_config_entry_diagnostics(hass, entry)
    assert payload["notifications"]["verdict"] == "silent"
    assert payload["notifications"]["enabled_without_target"] == ["interrupted"]


async def test_leak_diagnostics_cite_the_evidence_the_scope_still_has(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The dump must name what the entity names, in the state where they differ.

    Ruling L15's scenario, reached the same way: flow raises first, the valve
    sensor joins, then the meter is removed from the zone. ``first_source`` is
    written once and still says flow, of a zone that no longer has a meter;
    ``describing_source`` has moved to the sensor. Publishing the first as the
    description would send a reader of the support dump to look for a meter
    that is not there, while the entity and the Repairs notice beside it name
    the sensor -- and a support dump is believed precisely when the entity is
    doubted.

    Both facts are kept and both are asserted, because they are not
    interchangeable and a dump that dropped either would lose a real one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    await _reconfigure_zone(hass, entry, zone_id, flow_sensor="")

    scope = (await _leaks(hass, entry))[zone_id]
    # Removing the meter changed the source set, so the observation credit went
    # with the sources that earned it -- while the alarm stands and is
    # published anyway. This is the one state where "established" and "latched"
    # legitimately disagree, and a dump that reported either for the other
    # would read as a settled scope that is alarming, or an alarm nobody has
    # watched long enough to believe.
    assert scope["state_established"] is True
    assert scope["observation"]["latched"] is False

    alarm = scope["alarm"]
    assert alarm["active"] is True
    assert alarm["sources"] == [SOURCE_VALVE_SENSOR]
    assert alarm["describing_source"] == SOURCE_VALVE_SENSOR
    assert alarm["first_source"] == SOURCE_NO_FLOW_CLOSED
    assert alarm["since"] is not None

    # And it agrees with the entity a user is reading in the same instant,
    # which is the property the whole read exists to preserve.
    entity = _leak_entity(hass, entry, zone_id)
    assert alarm["describing_source"] == entity.attributes["describing_source"]
    assert alarm["sources"] == entity.attributes["sources"]
    assert alarm["since"] == entity.attributes["since"]


async def test_leak_diagnostics_tell_a_settled_scope_from_one_that_never_observes(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The distinction the whole payload exists for, on one installation.

    Alpha's sensor reports ``off``, so it can conclude at any time and settles
    within one window. Beta's sensor is configured and has never said anything
    usable, so it can conclude nothing, earns no observable seconds, and stays
    unavailable indefinitely -- the state an automation silently never fires
    on. Both have a source configured, so ``sources_configured`` cannot tell
    them apart and ``state_established`` must.

    The pair is what makes each assertion discriminating: a value hardcoded
    either way is right about one zone and wrong about the other.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    hass.states.async_set("binary_sensor.b_leak", *_moisture("unknown"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", at="23:30", leak_sensor="binary_sensor.b_leak"),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids[0], runtime.zone_ids[1]

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    leaks = await _leaks(hass, entry)

    settled = leaks[alpha]
    assert settled["sources_configured"] is True
    assert settled["state_established"] is True
    assert settled["observation"]["latched"] is True
    assert settled["observation"]["can_observe"] is True
    assert settled["observation"]["evidence_pending"] is False
    assert settled["observation"]["stall"] is None
    # The denominator, without which observed_s means nothing to a reader.
    assert settled["observation"]["confirm_s"] == 300
    assert settled["observation"]["observed_s"] >= settled["observation"]["confirm_s"]
    assert settled["leak_sensor"] == "binary_sensor.a_leak"
    assert settled["leak_sensor_reading"] == "off"

    silent = leaks[beta]
    assert silent["sources_configured"] is True
    assert silent["state_established"] is False
    assert silent["observation"]["latched"] is False
    assert silent["observation"]["can_observe"] is False
    # Never in a position to conclude, so the window earned nothing at all --
    # which is the number that separates this from a scope merely waiting.
    assert silent["observation"]["observed_s"] == 0.0
    assert silent["leak_sensor"] == "binary_sensor.b_leak"

    assert _leak_entity(hass, entry, alpha).state == "off"
    assert _leak_entity(hass, entry, beta).state == "unavailable"

    # And once it has lasted, the dump names the reason the badge names.
    await advance(hass, freezer, _STALL_NOTICE_S, step=60.0)
    stalled = (await _leaks(hass, entry))[beta]
    assert stalled["observation"]["stall"] == DEGRADED_LEAK_NEVER_OBSERVABLE
    assert stalled["observation"]["observed_s"] == 0.0


async def test_leak_diagnostics_show_evidence_held_over_a_valve_that_never_reports(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Held evidence is why the window is open, and the dump has to say so.

    The sensor reads ``on`` while its valve has never reported at all, so
    source 1 arms no countdown and nothing anywhere is ticking. ``latched``
    stays false and ``evidence_pending`` is the only value that explains why --
    the distinction that cost this design a redesign, and the one a support
    reader most needs, because from outside it is indistinguishable from the
    silent scope in the test above.

    ``leak_sensor_reading`` is the remembered reading rather than a live one,
    and it is included for the same reason: it is what holds the window open.
    """
    freezer.move_to(START)
    MockValvePark(hass)  # the valve entity never reports
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    scope = (await _leaks(hass, entry))[zone_id]

    assert hass.states.get("valve.a") is None
    assert scope["alarm"]["active"] is False
    assert scope["state_established"] is False
    assert scope["observation"]["latched"] is False
    assert scope["observation"]["evidence_pending"] is True
    assert scope["leak_sensor_reading"] == "on"

    await advance(hass, freezer, _STALL_NOTICE_S, step=60.0)
    held = (await _leaks(hass, entry))[zone_id]
    assert held["observation"]["stall"] == DEGRADED_LEAK_EVIDENCE_UNRESOLVED
    assert held["observation"]["evidence_pending"] is True


async def test_leak_diagnostics_cover_the_hub_scope_and_a_zone_with_no_source(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The two scopes no entity attribute can explain.

    A line meter behind two zones reports for the hub scope, so each zone's own
    scope has nothing and the hub has the meter. That is the shape whose
    silence is explained nowhere in the UI -- ``degraded`` lives on
    ``zone_state`` and the hub has none -- which is exactly why the dump must
    carry it.

    ``meters`` is asserted per scope rather than merely non-empty: it is the
    routing decision (``scope_for``) that put the meter on the hub, and reading
    it back is how a support session confirms the topology it was told about.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00"),
            zone_data("Beta", "valve.b", at="23:30"),
        ],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    alpha = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    leaks = await _leaks(hass, entry)

    hub = leaks["__hub__"]
    assert hub["meters"] == ["sensor.line"]
    assert hub["sources_configured"] is True
    assert hub["leak_sensor"] is None
    assert hub["leak_sensor_reading"] is None
    assert sorted(hub["zone_ids"]) == sorted(runtime.zone_ids)

    zone = leaks[alpha]
    assert zone["meters"] == []
    assert zone["sources_configured"] is False
    assert zone["state_established"] is False
    assert zone["observation"]["stall"] is None  # sourceless, never a stall
    assert zone["zone_ids"] == [alpha]


async def test_diagnostics_carries_a_bounded_tail_of_the_run_log(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The full series would bury everything else -- the same reasoning the
    water daily history already gets in this file."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59")])
    log = entry.runtime_data.run_log
    now = dt_util.utcnow()
    for index in range(60):
        log.append(
            runlog.build_entry(
                at=now - timedelta(minutes=60 - index),
                zone_id="z1",
                zone_name="Vasi",
                program_id="p1",
                program_name="Mattino",
                result="completed",
                reason_key=None,
                duration_min=1,
                volume_l=None,
                partial=False,
                scheduled=True,
            )
        )

    payload = await async_get_config_entry_diagnostics(hass, entry)

    assert payload["run_log"]["count"] == 60
    assert len(payload["run_log"]["recent"]) == 50
    assert payload["run_log"]["oldest_kept"] is not None
    assert payload["run_log"]["newest"] == payload["run_log"]["recent"][-1]["at"]
