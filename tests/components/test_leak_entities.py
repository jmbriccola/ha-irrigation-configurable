"""The leak alarm's entity surface: one binary_sensor per scope.

A file of its own rather than more of test_leaks.py, which is about *whether*
an alarm is raised, or of test_entities.py, which is about the platforms that
existed before this one. What is tested here is what an automation sees --
above all the two things the entity must REFUSE to do, since those are the
clauses a plausible refactor breaks in silence:

* it must not report ``off`` for a scope that has no source, because
  ``device_class: problem`` makes ``off`` the claim "there is no problem";
* it must not go unavailable because a source has gone quiet, because the
  detector deliberately holds its alarm through exactly that silence.

Entities are located through the entity registry here rather than by
``maestro_role``, for a reason the card contract now states: an unavailable
entity publishes no extra attributes at all, so card-style discovery cannot
see one. That the role IS published while available -- which is what the card
needs -- is asserted where an available entity is at hand.
"""

from typing import Any

from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntry, ConfigEntryState, ConfigSubentry
from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir

from .mocks import MockValvePark
from .test_entities import role_state
from .test_leaks import _PAST_CONFIRM_S, _WELL_PAST_CONFIRM_S, _reconfigure_zone
from .test_session import START, advance, mock_weather, setup_hub, zone_data


def _leak_entity_id(hass: HomeAssistant, entry: ConfigEntry, zone_id: str | None) -> str | None:
    """The leak entity of one zone, or of the hub when no zone is named.

    Through the entity registry rather than by ``maestro_role``, which is how
    the card and the rest of this suite find entities. Deliberately, and it is
    worth stating: Home Assistant publishes NO extra state attributes while an
    entity is unavailable, so attribute discovery cannot see an unavailable
    leak entity at all -- and unavailable is the state half of these tests are
    about. The registry answers the same either way, which also makes the
    difference between "unavailable" and "gone" assertable.
    """
    unique_id = f"{zone_id}_zone_leak" if zone_id is not None else f"{entry.entry_id}_hub_leak"
    return er.async_get(hass).async_get_entity_id("binary_sensor", DOMAIN, unique_id)


def _leak_entity(hass: HomeAssistant, entry: ConfigEntry, zone_id: str | None = None) -> State:
    entity_id = _leak_entity_id(hass, entry, zone_id)
    assert entity_id is not None, f"no leak entity registered for {zone_id or 'the hub'}"
    state = hass.states.get(entity_id)
    assert state is not None, f"{entity_id} has no state"
    return state


def _moisture(value: str) -> tuple[str, dict[str, Any]]:
    return value, {"device_class": "moisture"}


async def test_a_leak_on_one_zone_turns_only_that_zones_entity_on(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One alarm on one scope, and every other scope left saying "no problem".

    The sibling zone and the hub are asserted explicitly: two alarms for one
    leak is the failure this whole design is built against, and an entity per
    scope is a new way for it to happen -- one entity reading another scope's
    state would look exactly like a leak spreading. All three scopes have a
    source here, so all three are available and the ``off``s are real answers
    rather than the absence of one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    # A line meter both zones fall back to: its scope is the hub (two owners),
    # which is what gives the hub entity a source of its own. Dry throughout,
    # so nothing here can raise a second alarm.
    hass.states.async_set("sensor.line", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        ],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    assert _leak_entity(hass, entry, alpha).state == "off"

    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    alarm = _leak_entity(hass, entry, alpha)
    assert alarm.state == "on"
    assert alarm.attributes["device_class"] == "problem"
    assert alarm.attributes["sources"] == [SOURCE_VALVE_SENSOR]
    assert alarm.attributes["describing_source"] == SOURCE_VALVE_SENSOR
    assert alarm.attributes["since"] is not None

    quiet = _leak_entity(hass, entry, beta)
    assert quiet.state == "off"
    assert quiet.attributes["sources"] == []
    assert quiet.attributes["since"] is None
    assert quiet.attributes["describing_source"] is None
    assert _leak_entity(hass, entry).state == "off"

    # The card discovers by attribute, so the same three entities have to be
    # reachable that way while they are available, zone entities keyed by
    # their zone.
    by_role = role_state(hass, "zone_leak", alpha)
    assert by_role is not None
    assert by_role.entity_id == alarm.entity_id
    sibling_by_role = role_state(hass, "zone_leak", beta)
    assert sibling_by_role is not None
    assert sibling_by_role.entity_id == quiet.entity_id
    assert role_state(hass, "hub_leak") is not None


async def test_a_scope_with_no_source_is_unavailable_rather_than_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No sensor, no meter, no claim either way -- and no reload to fix it.

    ``off`` on a ``device_class: problem`` entity states that there is no
    problem, and a scope with nothing that could ever notice one has
    established no such thing. An automation cannot doubt an entity the way a
    reader can doubt a message, so the honest answer is to say nothing at all
    until a source exists.

    The second half is the point of the first: availability follows the
    configuration live, so wiring a leak sensor to a zone that had none makes
    its entity start answering immediately -- the entity being unavailable is
    never a state a restart is needed to leave.

    The third step then pins what a source is: evidence reporting for THIS
    scope, not a meter existing anywhere in the installation.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert _leak_entity(hass, entry).state == "unavailable"

    await _reconfigure_zone(hass, entry, zone_id, leak_sensor="binary_sensor.a_leak")

    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data is runtime  # in place, not reloaded
    assert _leak_entity(hass, entry, zone_id).state == "off"
    # The zone's sensor says nothing about the shared line, so the hub scope
    # is still without a source of its own.
    assert _leak_entity(hass, entry).state == "unavailable"

    hass.states.async_set("sensor.line", "0.0", {"unit_of_measurement": "L/min"})
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "line_flow_sensor": "sensor.line"}
    )
    await hass.async_block_till_done()

    # A meter existing somewhere is not a source for THIS scope. One zone falls
    # back to this line, so the line's scope is that zone (scope_for names the
    # sole owner) and the hub is still without evidence of its own -- it gains
    # a source only when a meter genuinely reports under HUB_SCOPE, which is
    # the two-zones-behind-one-line case in the test above.
    assert _leak_entity(hass, entry, zone_id).state == "off"
    assert _leak_entity(hass, entry).state == "unavailable"


async def test_an_alarm_survives_its_meter_going_silent_without_going_unavailable(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The one rule a plausible refactor breaks: silence is not absence.

    ``note_flow`` refuses to withdraw on an unreadable meter, because absence
    of evidence is not evidence of absence -- so the alarm stands. An
    availability rule written against live usability (``zone_flow_meter_usable``
    is right there, and reads almost like the question being asked) would
    retract the entity in the same instant, taking a live warning off the
    board exactly when it matters. Availability answers "could this ever tell
    me something", never "is it speaking right now".

    Two grades of silence, because they are not equally revealing. A meter
    reporting ``unavailable`` while still declaring its unit is the everyday
    dropout -- and note that ``zone_flow_meter_usable`` would still answer True
    there, since it asks about the UNIT and not about the value. The meter
    disappearing from the state machine outright is the one that separates the
    two rules: nothing can be read, nothing can be converted, and the entity
    must still stand behind the alarm it is publishing. Neither is a
    de-configuration, which is the only silence that withdraws a source, and
    which the user performs deliberately.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "on"

    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.leak_state(zone_id).active is True
    assert _leak_entity(hass, entry, zone_id).state == "on"

    hass.states.async_remove("sensor.flow")
    await advance(hass, freezer, 300, step=10.0)
    # Asked again rather than left holding whatever it last published: an
    # entity that never re-evaluates would pass this test while answering the
    # question wrongly, and the answer is what is under test.
    runtime.dispatch_update()
    await hass.async_block_till_done()

    assert runtime.zone_flow_meter_usable(runtime.zones[zone_id]) is False
    assert runtime.leak_state(zone_id).active is True
    assert _leak_entity(hass, entry, zone_id).state == "on"


async def test_an_alarm_survives_its_sensor_vanishing_without_going_unavailable(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The same rule on source 1, against the harsher kind of silence.

    A sensor that has stopped existing altogether -- pulled out of the state
    machine, as a Zigbee re-pair does -- is still a sensor the user
    CONFIGURED, and the detector holds the alarm it raised. An availability
    rule that asked whether the entity is still there would answer "nothing
    here can tell you anything" while this entity is telling the user
    something. That a configured sensor has gone missing is real and is
    reported, but it is reported where it belongs: ``leak_sensor_missing`` in
    ``zone_state.degraded``, which describes the zone's plumbing rather than
    retracting a standing alarm.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "on"

    hass.states.async_remove("binary_sensor.a_leak")
    await advance(hass, freezer, 300, step=10.0)
    # Nothing in this installation dispatches an update on its own -- there is
    # no meter and the detector says nothing when it has nothing to say -- so
    # the entity is asked again explicitly. Without this it would pass while
    # merely holding its last published state.
    runtime.dispatch_update()
    await hass.async_block_till_done()

    assert hass.states.get("binary_sensor.a_leak") is None
    assert runtime.leak_state(zone_id).active is True
    assert _leak_entity(hass, entry, zone_id).state == "on"


async def test_the_entity_cites_the_same_source_the_repairs_notice_does(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Both are read in the same breath, so both must name the same evidence.

    The reachable state (Ruling L15): flow raises first, the valve sensor
    joins, then the meter is removed from the zone. ``first_source`` is
    written once and still says flow -- of a zone that no longer has a meter
    -- while the repair notice has been re-keyed to the valve sensor.
    ``describing_source`` is what moves with the evidence, and publishing
    ``first_source`` here instead would send the user to look at a meter that
    is not there while the notice beside it names the sensor.

    ``first_source`` keeps its own meaning and its own home: the leak event.
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
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).first_source == SOURCE_NO_FLOW_CLOSED

    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).sources == {SOURCE_VALVE_SENSOR, SOURCE_NO_FLOW_CLOSED}

    await _reconfigure_zone(hass, entry, zone_id, flow_sensor="")

    alarm = _leak_entity(hass, entry, zone_id)
    assert alarm.state == "on"
    assert alarm.attributes["sources"] == [SOURCE_VALVE_SENSOR]
    assert alarm.attributes["describing_source"] == SOURCE_VALVE_SENSOR
    # The same source the standing notice now names, which is the whole point.
    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"leak_{zone_id}")
    assert issue is not None
    assert issue.translation_key == "leak_zone_valve_sensor"
    # And the alarm still has a configured source, so it is still answerable.
    assert runtime.leak_state(zone_id).first_source == SOURCE_NO_FLOW_CLOSED


async def test_adding_and_removing_a_zone_adds_and_removes_its_leak_entity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Zones arrive and leave through subentries while the entry stays loaded.

    A list of zone entities built once at setup would leave a zone added later
    with no leak entity until the next restart -- unnoticeable in a suite that
    only ever configures zones up front, and exactly when a user is setting a
    new zone up.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data

    beta = ConfigSubentry(
        data=zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        subentry_type="zone",
        title="Beta",
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(entry, beta)
    await hass.async_block_till_done()

    assert entry.runtime_data is runtime  # no reload
    assert _leak_entity(hass, entry, beta.subentry_id).state == "off"

    hass.config_entries.async_remove_subentry(entry, beta.subentry_id)
    await hass.async_block_till_done()

    # Gone from the registry, not merely unavailable -- the two are different
    # states and only the registry can tell them apart.
    assert _leak_entity_id(hass, entry, beta.subentry_id) is None


async def test_the_alarm_is_re_detected_after_a_restart_rather_than_restored(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Stated plainly, because it is a limitation and not a feature.

    ``LeakDetector`` keeps its alarm in memory only, on purpose: a restart is
    not evidence that a leak is still running. Nothing here restores it, and
    this entity adds no persistence of its own -- it publishes what the
    detector holds, and after a restart the detector holds nothing until a
    source says so again.

    What makes that acceptable is re-detection from LIVE state: a sensor
    already asserting when we come up has no state change left to make, and
    ``start()`` judges it anyway. So the alarm comes back -- as a NEW alarm,
    which is what ``since`` moving forward proves. Had anything been restored,
    it would have carried the old timestamp.

    One honest caveat this test cannot show, because a config-entry reload is
    not a restart: after a real Home Assistant restart the sensor's own
    ``last_changed`` is the restore too, so the confirmation window runs again
    from start-up and the entity reads ``off`` for up to ``leak_confirm_s``
    before saying ``on`` again. Here those timestamps survive the reload, so
    re-confirmation is immediate.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    first = _leak_entity(hass, entry, zone_id)
    assert first.state == "on"
    confirmed_at = first.attributes["since"]

    await advance(hass, freezer, 600, step=10.0)
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    restarted = _leak_entity(hass, entry, zone_id)
    assert restarted.state == "on"
    assert restarted.attributes["since"] > confirmed_at
