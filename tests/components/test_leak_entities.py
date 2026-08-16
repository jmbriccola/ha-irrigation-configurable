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

from pathlib import Path
from typing import Any

from custom_components.irrigation_maestro.const import (
    DEGRADED_LEAK_EVIDENCE_UNRESOLVED,
    DEGRADED_LEAK_NEVER_OBSERVABLE,
    DOMAIN,
)
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

from .mocks import BEHAVIOR_STUCK, MockValvePark
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
    configuration live, so wiring a leak sensor to a zone that had none is
    answered without a reload -- though not instantly, and deliberately. That
    zone has been watched by nothing at all up to this moment, so its window
    starts when the source does, exactly as it does at start-up. A window
    counted from the detector's age would let a sensor configured at ten in
    the morning take the entity from ``unavailable`` straight to ``off``,
    having observed nothing.

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
    # A source now exists, and its window starts here rather than at the
    # detector's birth: nothing was watching this zone before this instant.
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"
    # The zone's sensor says nothing about the shared line, so the hub scope
    # is still without a source of its own.
    assert _leak_entity(hass, entry).state == "unavailable"

    hass.states.async_set("sensor.line", "0.0", {"unit_of_measurement": "L/min"})
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "line_flow_sensor": "sensor.line"}
    )
    await hass.async_block_till_done()

    # The zone's source set has changed -- it now has a meter as well as a
    # sensor -- so its window is earned again against the new set, and the
    # meter it just gained has watched nothing. One window later it answers.
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"
    # A meter existing somewhere is still not a source for THIS scope. One zone
    # falls back to this line, so the line's scope is that zone (scope_for
    # names the sole owner) and the hub is without evidence of its own -- it
    # gains a source only when a meter genuinely reports under HUB_SCOPE,
    # which is the two-zones-behind-one-line case in the test above.
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

    # Halfway through Beta's own window: still nothing, while the sibling that
    # served its window keeps answering. A window shared across the
    # installation would have Beta answering here on Alpha's minutes.
    await advance(hass, freezer, 150, step=10.0)
    # A blip on the settled sibling, which changes nothing for Alpha (it is
    # settled) but does make every scope's book-keeping run at this instant --
    # without which Beta's part-filled window is never computed at all, and the
    # difference between its own minutes and the installation's cannot show.
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    await hass.async_block_till_done()
    assert _leak_entity(hass, entry, beta.subentry_id).state == "unavailable"
    assert _leak_entity(hass, entry, alpha).state == "off"

    await advance(hass, freezer, 200, step=10.0)

    assert _leak_entity(hass, entry, beta.subentry_id).state == "off"

    # Removed while ALARMING, which is the case worth pinning: a zone that
    # leaves takes its entity, its detector and its repair notice with it, and
    # an entity left behind holding a scope nothing reports for any more would
    # publish an alarm no automation could ever see cleared.
    hass.states.async_set("binary_sensor.b_leak", *_moisture("on"))
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, beta.subentry_id).state == "on"

    hass.config_entries.async_remove_subentry(entry, beta.subentry_id)
    await hass.async_block_till_done()

    # Gone from the registry, not merely unavailable -- the two are different
    # states and only the registry can tell them apart.
    assert _leak_entity_id(hass, entry, beta.subentry_id) is None
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"leak_{beta.subentry_id}") is None
    assert _leak_entity(hass, entry, alpha).state == "off"


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


async def test_a_source_that_reports_late_starts_the_window_late(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The window measures observation, not elapsed time since boot.

    A Zigbee sensor a minute late leaves four minutes of evidence under a five
    minute bar, so a leak present since start-up is still unconfirmed at the
    instant a detector-timed window would have us publish ``off`` -- and that
    boot transition, ``unavailable`` to ``off``, is itself the clearing edge
    that reopens a mains valve. Timed from the source's first usable report,
    those minutes are actually watched.

    The sensor starts at ``unknown``, which is what a device that has paired
    and not yet spoken looks like, and is exactly the state a "has it
    reported" test written against the state machine's contents would get
    wrong.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("unknown"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, 60, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))

    # A window counted from the detector would be over here; this one has 60 s
    # of it still to run, because that is how long nothing was reporting.
    await advance(hass, freezer, 260, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, 60, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_a_sensor_that_restores_off_and_goes_quiet_earns_no_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Hold what withholds; never hold what permits.

    A Zigbee sensor restores ``off`` when Home Assistant loads and its
    coordinator is then down for five minutes. The reading is remembered --
    it has to be, or an assertion that goes silent would be retracted -- but
    remembering the ``off`` and counting observation from it would let this
    scope publish "there is no problem" over a window in which its only source
    said nothing at all, having genuinely observed about one second.

    So the ``off`` branch is read LIVE and the clock stops when the sensor
    does. The ``on`` branch keeps the remembered reading, where holding can
    only withhold an answer rather than manufacture one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    # One second of a sensor that then goes off the air entirely.
    await advance(hass, freezer, 1, step=1.0)
    hass.states.async_set("binary_sensor.a_leak", *_moisture("unavailable"))
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    # It comes back, and the window fills from there.
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    await advance(hass, freezer, 200, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, 150, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_a_configured_source_that_never_reports_never_says_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The cost of the rule, and it is the honest answer rather than a bug.

    A sensor that has been configured and has never once said ``on`` or ``off``
    leaves the entity unavailable for as long as that lasts -- an hour here,
    indefinitely in principle. The alternative is to publish "there is no
    problem" on behalf of a device that has never spoken, which is the claim
    this whole entity refuses to make.

    Worth being exact about where the reason shows, because this case is the
    one with the least of it: a sensor that has VANISHED is reported as
    ``leak_sensor_missing`` in ``zone_state.degraded``, and a meter whose unit
    will not resolve as ``flow_unit_unknown`` -- but a sensor that exists and
    has never spoken is neither of those, and this entity's ``unavailable`` is
    the only thing that says so.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("unknown"))
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, 3600, step=60.0)

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    # Configured, so the entity exists and the scope counts as covered; it is
    # the reporting that has not happened.
    assert entry.runtime_data.leak_sources_configured(zone_id) is True


async def test_a_meter_with_no_resolvable_unit_never_starts_the_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A source "reports" only when it reports something USABLE, and the two
    readings of that word differ here.

    This meter publishes a fresh number every tick, so any test of "has this
    source reported anything" passes -- and it contributes no measured seconds
    at all, because litres cannot be derived from a unit nobody can name. Source
    2 can never confirm from it, so a window counted against it would be five
    minutes of watching nothing, ending in an ``off`` no reading supports.

    The stricter reading is taken deliberately: this is the same trap
    ``zone_flow_meter_usable`` set once already at one level down, where it
    asks about the unit and not about the reading.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0")  # no unit_of_measurement
    mock_weather(hass)
    # No cycle inside this test's half hour: the window counts only time in
    # which a source could conclude something, and a zone that is watering is
    # not such a time -- see the boot-mid-cycle test. Here the meter is the
    # subject, so the schedule is moved out of the way rather than reasoned
    # about.
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 900, step=10.0)
    hass.states.async_set("sensor.flow", "3.0")
    await advance(hass, freezer, 900, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    # Name the unit and the same meter starts saying something.
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_the_window_does_not_expire_while_a_confirmation_is_in_flight(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The two clocks are not the same clock, and the gap is a clearing edge.

    The observation window is wall clock from the first usable report. Source
    2's is MEASURED seconds: an unmeasured interval -- the flaky meter this
    whole branch is built around -- stops its clock without stopping ours. So
    ours can run out first, with an alarm minutes from being confirmed, and
    publishing ``off`` there gives an automation exactly the
    ``unavailable -> off -> on`` it must never see.

    Here the meter measures 150 s of above-threshold flow with every valve
    shut, goes unreadable for 200 s, and comes back still flowing. At the
    350 s mark the wall-clock window is well past and the detector has only
    ~150 measured seconds of the 300 it needs. The entity must say nothing,
    and then say ``on`` when the evidence completes.

    Nothing about a healthy installation is delayed by this: "in flight" means
    seconds are on the books right now, and a dry meter resets them to zero.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 150, step=10.0)
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 200, step=10.0)

    # Not yet enough measured seconds to raise, and the entity must not fill
    # the silence with an answer -- asserted through what it publishes, not
    # through the detector's internals.
    assert runtime.leak_state(zone_id).active is False
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "on"


async def test_an_asserting_sensor_over_an_unreported_valve_never_says_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Held evidence, not a running countdown -- the worst of the three.

    The sensor reads ``on``; the valve has not reported at all, which on cloud
    hardware is minutes of rate-limited backoff after a restart.
    ``_evaluate_valve_sensor`` cancels its wake and returns, because there is
    no confirmed closure to count from, so a gate that asked "is a countdown
    running" would find none, latch, and publish ``off`` while this zone's own
    leak sensor is reading ``on``. Then the valve reports shut, source 1 starts
    from that instant, and the alarm arrives ``leak_confirm_s`` later:
    ``unavailable -> off -> on``, the clearing edge, during a leak the sensor
    was asserting throughout.

    The evidence is what counts, so the entity holds its tongue until the alarm
    it was always going to raise.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    # No valve state at all: the entity exists in the configuration and has
    # never reported, which is not the same as reporting "open".
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert hass.states.get("valve.a") is None
    assert runtime.leak_state(zone_id).active is False  # nothing to count from
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    park.add("valve.a")  # the valve finally reports, and reports closed
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "on"


async def test_an_assertion_that_goes_silent_still_holds_the_window_open(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Silence does not retract a pending window, exactly as it does not
    retract a raised alarm -- the same rule one level down.

    The sensor asserts, then goes unavailable before its window completes. The
    detector cancels the wake and holds; the entity must hold too, because the
    last thing this scope heard was ``on`` and nothing has said otherwise.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 60, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", *_moisture("unavailable"))
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(zone_id).active is False
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    # A reading is the only thing that retracts it.
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_a_meter_whose_evidence_lags_the_window_never_publishes_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Where the flow gate earns its keep: the window fills first.

    Observable time accrues whenever the meter is measuring with every valve
    shut -- whatever the reading says. Source 2's own seconds accrue only while
    that reading is ABOVE the threshold. So a line that trickles below the bar
    and then starts leaking fills this entity's window well before the detector
    has the evidence to raise, and closing the window on time alone publishes
    ``off`` in the minutes before the ``on`` that was already coming.

    Every state published is captured, not just the last, because the defect is
    a frame the end state does not remember.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    # Below the 0.5 L/min default threshold: measured, so the window counts it,
    # but no evidence of a leak accrues from it.
    hass.states.async_set("sensor.flow", "0.2", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.flow")]
    )
    zone_id = entry.runtime_data.zone_ids[0]
    entity_id = _leak_entity(hass, entry, zone_id).entity_id

    published: list[str] = []

    @callback
    def _record(event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        if event.data["entity_id"] == entity_id and new_state is not None:
            published.append(new_state.state)

    hass.bus.async_listen(EVENT_STATE_CHANGED, _record)

    # Two hundred seconds of observation that establishes nothing about a leak,
    # then a real one. The window is full long before the evidence is.
    await advance(hass, freezer, 200, step=10.0)
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 200, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert "off" not in published

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "on"
    assert "off" not in published


async def test_a_sensor_asserting_while_its_zone_waters_earns_no_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A probe under a running sprinkler tells us nothing, so it counts as
    nothing.

    ``leak.py`` gates source 1 on the zone's own valve being closed for exactly
    this reason: on hardware where ``moisture`` is a real ground probe, the
    probe is wet for the whole of its zone's cycle. Those minutes are not
    observation, and crediting them would let a zone that watered through its
    whole window answer ``off`` the instant the sensor cleared -- having
    concluded nothing at all.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a", "open")  # watering throughout
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    park.force_state("valve.a", "open")
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    park.force_state("valve.a", "open")
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert hass.states.get("valve.a").state == "open"
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    # The sprinkler stops and the probe dries: the scope starts its window HERE,
    # with a source that is finally in a position to say something.
    park.force_state("valve.a", "closed")
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    await advance(hass, freezer, 200, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    await advance(hass, freezer, 150, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_a_boot_in_the_middle_of_a_cycle_earns_no_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Time in which no source could conclude anything is not observation.

    Boot with a cycle running and a meter as the only source: every sample is
    discarded because a valve is open (water through an open valve is
    watering), so source 2 cannot reach a conclusion at any point. A window
    counted on wall clock expires anyway and publishes "no problem" about a
    period in which nothing could have been established. Counted on observable
    time it does not move until the valves are shut again.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a", "open")  # already watering when we come up
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    # The watchdog closes what it finds open at startup; keep it open for the
    # length of this test, which is what a cycle in progress looks like.
    park.force_state("valve.a", "open")
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    park.force_state("valve.a", "open")
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert hass.states.get("valve.a").state == "open"
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"


async def test_a_drainage_window_does_not_retract_a_settled_answer(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The confirmation gate holds the window OPEN; it never re-closes one.

    Every cycle ends with the line draining, which puts measured
    above-threshold seconds on the books with the valves shut -- a
    confirmation window in flight, on an entity that settled hours ago. If the
    gate were read as "available unless confirming", each drainage would take
    a settled ``off`` to ``unavailable`` and back, on every zone, for ever.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"

    # Drainage: flow with everything shut, well short of the confirmation bar,
    # and decaying as a draining line does. The changing reading matters: it is
    # what drives the bookkeeping, so a scope that quietly un-settled itself
    # would be visible here rather than hidden behind a stale publication.
    for lpm in ("2.0", "1.8", "1.6", "1.5"):
        hass.states.async_set("sensor.flow", lpm, {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, 20, step=10.0)
    runtime.dispatch_update()
    await hass.async_block_till_done()

    assert _leak_entity(hass, entry, zone_id).state == "off"

    # And the premise, proved by what happens next rather than by reading the
    # detector: those seconds were evidence accumulating, because leaving them
    # to accumulate raises the alarm.
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "on"


async def test_changing_a_scope_s_sources_makes_it_earn_the_window_again(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The window belongs to the sources that served it, not to the scope.

    Two ways to reach the same defect if it did not. Clear the meter and pick
    a leak sensor that has never spoken: the scope has a configured source
    again, and a stale stamp would have it publish ``off`` on evidence nothing
    ever produced. Swap one sensor for another in a single edit and it never
    even passes through ``unavailable``.

    Both are the same case as a source configured long after start-up,
    arriving through the configuration door rather than through the clock.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", *_moisture("unknown"))
    hass.states.async_set("binary_sensor.spare_leak", *_moisture("unknown"))
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"

    # The meter goes, a never-heard-from sensor arrives, in one edit.
    await _reconfigure_zone(
        hass, entry, zone_id, flow_sensor="", leak_sensor="binary_sensor.a_leak"
    )

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"

    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, zone_id).state == "off"

    # And the swap, which never passes through a configuration with no source.
    await _reconfigure_zone(hass, entry, zone_id, leak_sensor="binary_sensor.spare_leak")

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"


def _degraded(hass: HomeAssistant, zone_id: str) -> list[str]:
    """The zone's declared degradations, as the card reads them."""
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    return list(state.attributes["degraded"])


async def test_a_scope_that_can_never_observe_says_so_in_degraded(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An entity silent for ever is indistinguishable from a broken one.

    A meter-only zone whose valve never reports closed can conclude nothing:
    every interval is discarded as watering, so the window never fills and the
    leak entity stays unavailable, correctly and permanently. A user cannot
    tell that refusal from a component that has fallen over, and will assume
    the second -- so after an hour of idle time unable to conclude, the zone
    declares why, in the same list that already carries "configured, and here
    is why it cannot do its job".
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a", "open")
    # Stuck open: it ignores the startup close-all and every command after it,
    # so it never reports closed -- which is what blocks every metered scope,
    # since a meter's seconds only count with the whole system shut.
    park.set_behavior("valve.a", BEHAVIOR_STUCK)
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.flow")]
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, 600, step=60.0)
    # Asked again before the negative assertion, or it would read whatever the
    # zone last published and pass under any threshold at all -- including one
    # short enough to declare a stall after ten minutes.
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    # Ten minutes in it is silent but not yet remarkable: an ordinary slow boot
    # looks exactly like this.
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert "leak_never_observable" not in _degraded(hass, zone_id)

    await advance(hass, freezer, 3600, step=60.0)
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert "leak_never_observable" in _degraded(hass, zone_id)
    assert "leak_evidence_unresolved" not in _degraded(hass, zone_id)


async def test_a_scope_holding_evidence_it_cannot_finish_says_which(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The other cause, and it sends the user somewhere else entirely.

    Here something IS reporting a leak and nothing can finish judging it: the
    sensor asserts, its valve never reports closed. "Nothing is watching" would
    be the wrong thing to say about a zone whose sensor is shouting, so the two
    causes are declared separately -- one points at the plumbing, the other at
    a valve that never reports.
    """
    freezer.move_to(START)
    MockValvePark(hass)  # valve.a exists in the configuration and never reports
    hass.states.async_set("binary_sensor.a_leak", *_moisture("on"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await advance(hass, freezer, 4000, step=60.0)
    entry.runtime_data.dispatch_update()
    await hass.async_block_till_done()

    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert "leak_evidence_unresolved" in _degraded(hass, zone_id)
    assert "leak_never_observable" not in _degraded(hass, zone_id)


async def test_a_long_watering_session_is_not_a_stall(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The refusal that keeps the notice honest: watering is not a fault.

    A zone that is watering cannot conclude anything about leaks, by design --
    every metered interval with a valve open is discarded. If the stall clock
    ran through that, every installation with a long session would accuse
    itself once an hour. It counts idle seconds only, so an hour of watering
    earns no notice at all, and the zone settles normally once the run ends.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    # Watering starts immediately, so the zone is still owing its window when
    # the run begins: a zone that had already settled would never run the stall
    # clock at all, and this test would prove nothing.
    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone_id": zone_id, "duration": 60}, blocking=True
    )
    await advance(hass, freezer, 30, step=10.0)  # gather window, then the valve opens
    assert hass.states.get("valve.a").state == "open"
    assert runtime.session.active_runs != {}
    # Water actually flowing while it waters, or the zero-flow guard would cut
    # the run short and hand this test a much shorter session than it needs.
    hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})

    # Just past the end of the hour-long run: an hour of wall clock has gone by
    # with this zone unable to conclude anything, and none of it counts.
    await advance(hass, freezer, 3660, step=30.0)
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})

    assert runtime.session.active_runs == {}
    assert _leak_entity(hass, entry, zone_id).state == "unavailable"
    assert "leak_never_observable" not in _degraded(hass, zone_id)
    assert "leak_evidence_unresolved" not in _degraded(hass, zone_id)

    # And it settles a window after the water stops, as any idle zone does.
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _leak_entity(hass, entry, zone_id).state == "off"
    assert "leak_never_observable" not in _degraded(hass, zone_id)


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

    Both sensors report from the start, because a window only begins once its
    source has: a scope waiting on a sensor that has never spoken arms no
    timer at all, which is a different (and correct) zero.

    The last stretch is the one that matters most for a running system: a
    scope whose alarm is STANDING arms nothing either. Its entity publishes
    the alarm whatever the window says, so a recheck would dispatch the whole
    integration on a timer -- every entity rewritten, recorder included -- for
    the length of an alarm that can last hours. The clearing hook re-arms it.
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

    assert _pending_observation_wakes(hass) == 1

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert _pending_observation_wakes(hass) == 0

    beta = ConfigSubentry(
        data=zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        subentry_type="zone",
        title="Beta",
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(entry, beta)
    await hass.async_block_till_done()

    assert _pending_observation_wakes(hass) == 1

    # Beta alarms before its own window has filled: no timer while it stands.
    hass.states.async_set("binary_sensor.b_leak", *_moisture("on"))
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert _leak_entity(hass, entry, beta.subentry_id).state == "on"
    assert _pending_observation_wakes(hass) == 0

    # When the alarm ends the scope is settled rather than waiting again: an
    # asserting sensor over a closed valve is a source in a position to
    # conclude, so those minutes counted as observation -- and they concluded.
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    await hass.async_block_till_done()
    assert _leak_entity(hass, entry, beta.subentry_id).state == "off"
    assert _pending_observation_wakes(hass) == 0

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


async def test_leak_watch_names_the_scope_that_watches_each_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Three zones, three different answers, in one installation.

    `capabilities.leak_detection` cannot carry this: it reports on the valve's
    own leak SENSOR and knows nothing about flow, so a zone watched entirely
    by its own meter reads `unavailable` there. Telling that user "no leak
    sensor" is true and leaves them believing nothing is watching -- which is
    worse than a false statement, because there is nothing to catch by
    reading it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    for valve in ("valve.a", "valve.b", "valve.c"):
        park.add(valve)
    hass.states.async_set("sensor.a_flow", "0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.c_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            # Its own meter: its own scope watches it, sensor or no sensor.
            zone_data("Alpha", "valve.a", flow_sensor="sensor.a_flow"),
            # Nothing at all.
            zone_data("Beta", "valve.b"),
            # A leak sensor and nothing else.
            zone_data("Gamma", "valve.c", leak_sensor="binary_sensor.c_leak"),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta, gamma = runtime.zone_ids

    assert runtime.leak_watch(alpha) == "zone"
    assert runtime.leak_watch(beta) == "none"
    assert runtime.leak_watch(gamma) == "zone"

    # Published where the card reads it, beside the sensor-only verdict it is
    # deliberately NOT folded into: Alpha is watched and has no sensor, and
    # both facts are legible at once.
    state = role_state(hass, "zone_state", alpha)
    assert state is not None
    assert state.attributes["capabilities"]["leak_watch"] == "zone"
    assert state.attributes["capabilities"]["leak_detection"] == "unavailable"


async def test_leak_watch_says_system_for_zones_behind_a_shared_line_meter(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The awkward state, answered rather than rounded off.

    Two zones on one line meter have no source on their own scopes --
    `scope_for` sends that meter's water to HUB_SCOPE, because which of the
    two leaked is unanswerable -- so `zone_leak` for each stays unavailable
    for ever. But their water IS measured and a leak in it WILL raise an
    alarm, on `hub_leak`. "Not watched" would be false; "watched" alone would
    promise a zone-named alarm that can never arrive. The value names the
    scope doing the watching, so a card can say where.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a"), zone_data("Beta", "valve.b")],
        options={"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    assert runtime.leak_watch(alpha) == "system"
    assert runtime.leak_watch(beta) == "system"
    # And the entity agrees about which scope can actually answer: the zones'
    # own alarms are unavailable while the hub's is the one with a source.
    assert runtime.leak_sources_configured(alpha) is False
    assert runtime.leak_sources_configured(beta) is False
    assert runtime.leak_sources_configured("__hub__") is True

    state = role_state(hass, "zone_state", alpha)
    assert state is not None
    assert state.attributes["capabilities"]["leak_watch"] == "system"


async def test_leak_watch_prefers_a_zones_own_scope_over_the_shared_one(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A leak sensor on a zone behind the shared meter still says `zone`.

    Its own scope has a source, so its own alarm can name it -- which is a
    stronger statement than "the system is watching your water", and the card
    must show the stronger one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", *_moisture("off"))
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b"),
        ],
        options={"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    assert runtime.leak_watch(alpha) == "zone"
    assert runtime.leak_watch(beta) == "system"


async def test_leak_watch_agrees_with_the_entity_about_every_scope(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """`zone` is `leak_sources_configured` itself, not a second opinion on it.

    That predicate is what `leak_state_established` gates the binary sensor's
    availability on. If this attribute were derived separately the card could
    say "watched by this zone" beside an entity that will never publish
    anything, which is the disagreement the whole field exists to prevent.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    for valve in ("valve.a", "valve.b", "valve.c"):
        park.add(valve)
    hass.states.async_set("sensor.a_flow", "0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.b_leak", *_moisture("off"))
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", flow_sensor="sensor.a_flow"),
            zone_data("Beta", "valve.b", leak_sensor="binary_sensor.b_leak"),
            zone_data("Gamma", "valve.c"),
        ],
        options={"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data

    for zone_id in runtime.zone_ids:
        assert (runtime.leak_watch(zone_id) == "zone") is runtime.leak_sources_configured(
            zone_id
        ), zone_id


def test_the_card_branches_on_the_stall_keys_by_name() -> None:
    """The two stall keys are read BY NAME on the other side of the boundary.

    Every other `degraded` key reaches the card as data: it is looked up in a
    dictionary and, if the label is missing, rendered as the raw key -- ugly,
    but self-announcing the first time anyone looks. These two are different.
    `discovery.ts`'s `leakStatus` matches them literally to decide that a zone
    has an explanation of its own for a silent leak entity; rename one here
    and that branch simply stops firing, so a stalled zone is reported as
    "still checking" for ever. Nothing on either side fails, and nothing on
    screen looks wrong -- it just says something untrue.

    **The keys come from the PRODUCER, imported, never retyped here.** The
    first version of this test carried its own copy of the two names, which
    made it green through exactly the rename it exists to catch: nothing
    forces a renamer to edit a tuple in a test file, and the six other
    assertions around it would have gone red and been fixed while this one
    sat there promising a guarantee it no longer gave. Importing the
    constants `leak_observation_stall` actually returns is what makes the
    promise true -- rename the value and this asserts the NEW name against
    the card, which is precisely the failure wanted.

    Deliberately NARROW. A parity test over the whole degraded list was
    considered and rejected: it would mean parsing TypeScript from Python, it
    would break on a formatting change with a message about a regex rather
    than about a key, and the defect it guards is the visible kind. These two
    are the only degraded keys whose divergence is silent, so these two are
    the ones pinned -- by substring, so no reformatting of the card can
    break it.
    """
    discovery_ts = (Path(__file__).parents[2] / "card" / "src" / "discovery.ts").read_text(
        encoding="utf-8"
    )
    for key in (DEGRADED_LEAK_NEVER_OBSERVABLE, DEGRADED_LEAK_EVIDENCE_UNRESOLVED):
        assert f'"{key}"' in discovery_ts, (
            f"{key} is matched by name in discovery.ts's leakStatus; renaming it "
            "here without renaming it there silently stops that branch firing"
        )
