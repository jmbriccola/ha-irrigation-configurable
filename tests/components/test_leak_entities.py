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
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import (
    Event,
    EventStateChangedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.util.async_ import get_scheduled_timer_handles

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


def _pending_observation_wakes(hass: HomeAssistant) -> int:
    """How many start-up observation windows are armed on the event loop.

    Reaching into the loop's own scheduled handles because that is the only
    place a leaked timer exists -- nothing black-box can observe one. Same
    idiom, and same handle shape, as the supply-wake counter in test_leaks.
    """
    count = 0
    for handle in get_scheduled_timer_handles(hass.loop):
        if handle.cancelled() or not handle._args:
            continue
        target = getattr(handle._args[-1], "target", None)
        if getattr(target, "__name__", None) == "_on_leak_observation_wake":
            count += 1
    return count


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

    # Not "off" yet: nothing has been watched for a full window (see the
    # start-up test below). Only the alarm raised after it counts here.
    assert _leak_entity(hass, entry, alpha).state == "unavailable"

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

    The start-up window is stepped over first, so that everything after it
    fails for one reason only. Both reasons produce ``unavailable`` and the
    test would not be able to tell them apart otherwise.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

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

    A quiet SIBLING carries the same silence with no alarm behind it, and it
    is not decoration: an alarm that is standing is published whatever the
    availability rule says, so a zone holding one cannot by itself tell a
    configuration-based rule from a liveness-based one. Beta can. Its meter is
    just as gone, it has nothing to report, and it must still answer ``off``
    rather than withdraw -- the same principle, on the side of the pair where
    it is observable.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.flow_a", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.flow_b", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", flow_sensor="sensor.flow_a"),
            zone_data("Beta", "valve.b", order=200, flow_sensor="sensor.flow_b"),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, alpha).state == "on"
    assert _leak_entity(hass, entry, beta).state == "off"

    hass.states.async_set("sensor.flow_a", "unavailable", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.flow_b", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.leak_state(alpha).active is True
    assert _leak_entity(hass, entry, alpha).state == "on"
    assert _leak_entity(hass, entry, beta).state == "off"

    hass.states.async_remove("sensor.flow_a")
    hass.states.async_remove("sensor.flow_b")
    await advance(hass, freezer, 300, step=10.0)
    # Asked again rather than left holding whatever it last published: an
    # entity that never re-evaluates would pass this test while answering the
    # question wrongly, and the answer is what is under test.
    runtime.dispatch_update()
    await hass.async_block_till_done()

    assert runtime.zone_flow_meter_usable(runtime.zones[alpha]) is False
    assert runtime.zone_flow_meter_usable(runtime.zones[beta]) is False
    assert runtime.leak_state(alpha).active is True
    assert _leak_entity(hass, entry, alpha).state == "on"
    assert _leak_entity(hass, entry, beta).state == "off"


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

    The quiet sibling is here for the same reason as in the meter test: a
    standing alarm is published whatever the availability rule says, so only
    the zone with nothing to report can show which rule is in force.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, alpha).state == "on"
    assert _leak_entity(hass, entry, beta).state == "off"

    hass.states.async_remove("binary_sensor.a_leak")
    hass.states.async_remove("binary_sensor.b_leak")
    await advance(hass, freezer, 300, step=10.0)
    # Nothing in this installation dispatches an update on its own -- there is
    # no meter and the detector says nothing when it has nothing to say -- so
    # the entity is asked again explicitly. Without this it would pass while
    # merely holding its last published state.
    runtime.dispatch_update()
    await hass.async_block_till_done()

    assert hass.states.get("binary_sensor.a_leak") is None
    assert hass.states.get("binary_sensor.b_leak") is None
    assert runtime.leak_state(alpha).active is True
    assert _leak_entity(hass, entry, alpha).state == "on"
    assert _leak_entity(hass, entry, beta).state == "off"


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

    The new zone also serves its OWN observation window rather than inheriting
    the one the installation has already worked through: the window measures
    how long THIS scope has been watched, and nobody watched this zone before
    it existed. Asserted against an established sibling in the same instant,
    so a window keyed to the runtime rather than to the scope is visible.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    alpha = runtime.zone_ids[0]
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, alpha).state == "off"

    beta = ConfigSubentry(
        data=zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        subentry_type="zone",
        title="Beta",
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(entry, beta)
    await hass.async_block_till_done()

    assert entry.runtime_data is runtime  # no reload
    assert _leak_entity(hass, entry, beta.subentry_id).state == "unavailable"
    assert _leak_entity(hass, entry, alpha).state == "off"

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, beta.subentry_id).state == "off"

    hass.config_entries.async_remove_subentry(entry, beta.subentry_id)
    await hass.async_block_till_done()

    # Gone from the registry, not merely unavailable -- the two are different
    # states and only the registry can tell them apart.
    assert _leak_entity_id(hass, entry, beta.subentry_id) is None


async def test_a_scope_says_nothing_until_it_has_watched_for_a_full_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Just-booted is not the same as no-problem, and only one of them is off.

    The detector holds its alarm in memory only, so every scope starts with no
    alarm and a confirmation window that has not run. For that window we have
    not established that there is no leak; we have only just started looking,
    and a leak running since before the restart is one neither source has had
    time to confirm. ``off`` there asserts something nobody has checked.

    It ends by itself, with nothing else happening: this installation has no
    meter and a quiet sensor, so no sample, no state change and no
    configuration edit will dispatch an update -- only the wake armed for the
    window's own end can move this entity, and if it were missing the entity
    would sit at ``unavailable`` for hours after it had earned the right to
    answer.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    zone_id = entry.runtime_data.zone_ids[0]

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    # Just short of the window: still nothing established.
    await advance(hass, freezer, 290, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, 30, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_the_start_up_window_arms_one_timer_and_leaves_none_behind(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """It ends, and it ends for good: one wake, then nothing.

    Two refusals in one, both invisible from the outside. The window must not
    keep re-arming once every scope has served it -- a timer that never stops
    is what the ``leak_repeat_min`` reminder is FOR and this is not that -- and
    it must not survive an unload, which is the leak nothing black-box can
    see. A zone added after the first window has closed re-arms it exactly
    once, for itself.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )

    assert _pending_observation_wakes(hass) == 1

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _pending_observation_wakes(hass) == 0

    hass.config_entries.async_add_subentry(
        entry,
        ConfigSubentry(
            data=zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
            subentry_type="zone",
            title="Beta",
            unique_id=None,
        ),
    )
    await hass.async_block_till_done()

    assert _pending_observation_wakes(hass) == 1

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert _pending_observation_wakes(hass) == 0


async def test_a_standing_alarm_is_published_even_inside_the_start_up_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The start-up window withholds a silence, never an answer we hold.

    Where the two rules of this entity meet. A config-entry reload leaves the
    source entities' timestamps untouched, so the sensor has been asserting for
    longer than ``leak_confirm_s`` already and the rebuilt detector raises in
    the same instant it starts -- while this scope's observation window has
    only just begun. Ranking the window first would hide a live alarm for five
    minutes, which is the mid-alarm retraction the entity's other rule exists
    to forbid, arriving through the start-up door.

    The alarm is genuinely new, not restored -- ``since`` moves forward -- and
    that is precisely why publishing it is honest: it was re-derived from live
    state a moment ago.
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
    confirmed_at = _leak_entity(hass, entry, zone_id).attributes["since"]

    await advance(hass, freezer, 600, step=10.0)
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    # No time has passed since the rebuild: the window is at its widest and the
    # alarm outranks it anyway.
    restarted = _leak_entity(hass, entry, zone_id)
    assert restarted.state == "on"
    assert restarted.attributes["since"] > confirmed_at


async def test_a_restart_during_a_live_leak_re_earns_it_and_never_says_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The whole reason the start-up window exists, stated as an automation.

    ``LeakDetector`` keeps its alarm in memory only, on purpose: a restart is
    not evidence that a leak is still running, and a restored alarm can be
    stale -- fixed while the system was down. So the evidence is re-earned,
    which is why ``since`` moves forward here rather than coming back as it
    was. Nothing persists it and this entity adds no persistence of its own.

    What must NOT happen in the meantime is the entity saying ``off``. The
    natural pair a user writes is "leak -> close the mains" and "leak cleared
    -> reopen it", and the second triggers on ``to: "off"``. A restart in the
    middle of a live leak would fire it and put the water back on, because we
    told it the leak had stopped when in truth we had forgotten. A transition
    into ``unavailable`` fires no such trigger, so every state this entity
    publishes across the restart is asserted, not just the one at the end.

    The sensor is re-asserted immediately before the reload so its
    ``last_changed`` is the restore, which is what a real Home Assistant
    restart looks like: without that the alarm is re-raised instantly from a
    timestamp that outlived the reload, and the gap this test is about never
    opens.
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
    entity_id = first.entity_id

    published: list[str] = []

    @callback
    def _record(event: Event[EventStateChangedData]) -> None:
        if event.data["entity_id"] != entity_id:
            return
        new_state = event.data["new_state"]
        if new_state is not None:
            published.append(new_state.state)

    hass.bus.async_listen(EVENT_STATE_CHANGED, _record)

    await advance(hass, freezer, 600, step=10.0)
    # The sensor as a restart leaves it: still asserting, but with a timestamp
    # no older than the restart itself.
    hass.states.async_remove("binary_sensor.a_leak")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    restarted = _leak_entity(hass, entry, zone_id)
    assert restarted.state == "on"
    assert restarted.attributes["since"] > confirmed_at
    # Not one clearing edge anywhere across the restart.
    assert "off" not in published
