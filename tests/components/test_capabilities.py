"""Per-zone capability detection from the entity and device registries.

Structured like test_flow.py, which is the closest existing analogue and is
itself capability detection in miniature: pure resolution first -- by
device_class, never by name, including override precedence and the domain
filter -- then late appearance and withdrawal, proving nothing here is
cached, then the configured/candidate/unavailable states through the full
zone and service path.
"""

from custom_components.irrigation_maestro.capabilities import (
    discover_sibling_sensors,
    resolve_zone_capabilities,
)
from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


def _valve_with_siblings(
    hass: HomeAssistant, *, moisture: bool = True, problem: bool = True, decoy: bool = False
) -> str:
    """A device carrying a valve plus optionally its two binary sensors.

    Sibling object ids are opaque (``swv1_b1``/``swv1_b2``): nothing in the
    id may hint at its class, or a name-matching implementation would pass
    these fixtures by accident. ``decoy`` adds a third binary_sensor whose
    object id *looks* like a leak sensor but carries an unrelated
    device_class, to prove the opposite -- that a plausible name earns a
    sensor nothing here.
    """
    foreign = MockConfigEntry(domain="demo")
    foreign.add_to_hass(hass)
    devices = dr.async_get(hass)
    device = devices.async_get_or_create(
        config_entry_id=foreign.entry_id,
        identifiers={("demo", "swv1")},
        name="Irrigazione Vasi",
    )
    entities = er.async_get(hass)
    entities.async_get_or_create(
        "valve",
        "demo",
        "swv1_valve",
        device_id=device.id,
        suggested_object_id="irrigazione_vasi",
    )
    if moisture:
        entities.async_get_or_create(
            "binary_sensor",
            "demo",
            "swv1_b1",
            device_id=device.id,
            suggested_object_id="swv1_b1",
            original_device_class="moisture",
        )
    if problem:
        entities.async_get_or_create(
            "binary_sensor",
            "demo",
            "swv1_b2",
            device_id=device.id,
            suggested_object_id="swv1_b2",
            original_device_class="problem",
        )
    if decoy:
        # Named like the real thing, classed like nothing this module wants:
        # a substring matcher on "_water_leak" would grab this instead of the
        # real (opaquely named) moisture sensor above.
        entities.async_get_or_create(
            "binary_sensor",
            "demo",
            "swv1_decoy",
            device_id=device.id,
            suggested_object_id="irrigazione_vasi_water_leak",
            original_device_class="battery",
        )
    return "valve.irrigazione_vasi"


async def test_siblings_are_found_by_device_class_not_by_name(
    hass: HomeAssistant,
) -> None:
    valve = _valve_with_siblings(hass, decoy=True)
    leak, supply = discover_sibling_sensors(hass, valve)
    assert leak == "binary_sensor.swv1_b1"
    assert supply == "binary_sensor.swv1_b2"


async def test_a_valve_without_siblings_offers_no_candidate(hass: HomeAssistant) -> None:
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    assert discover_sibling_sensors(hass, valve) == (None, None)


async def test_a_valve_with_no_device_at_all_is_handled(hass: HomeAssistant) -> None:
    """A valve that is not in the registry must not raise."""
    hass.states.async_set("valve.orphan", "closed")
    assert discover_sibling_sensors(hass, "valve.orphan") == (None, None)


async def test_a_user_override_wins_over_the_integrations_original(
    hass: HomeAssistant,
) -> None:
    """The user's own device_class setting is what they meant; the
    integration's original_device_class is only a fallback."""
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    registry = er.async_get(hass)
    valve_entry = registry.async_get(valve)
    assert valve_entry is not None
    entry = registry.async_get_or_create(
        "binary_sensor",
        "demo",
        "swv1_override",
        device_id=valve_entry.device_id,
        suggested_object_id="swv1_override",
        original_device_class="battery",
    )
    registry.async_update_entity(entry.entity_id, device_class="moisture")

    leak, supply = discover_sibling_sensors(hass, valve)
    assert leak == entry.entity_id
    assert supply is None


async def test_a_sensor_domain_entity_is_never_offered_as_a_candidate(
    hass: HomeAssistant,
) -> None:
    """The domain filter matters as much as the device_class: a `sensor`
    reporting a moisture level is not a `binary_sensor` alarm."""
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    registry = er.async_get(hass)
    valve_entry = registry.async_get(valve)
    assert valve_entry is not None
    registry.async_get_or_create(
        "sensor",
        "demo",
        "swv1_moisture_pct",
        device_id=valve_entry.device_id,
        suggested_object_id="swv1_moisture_level",
        original_device_class="moisture",
    )
    assert discover_sibling_sensors(hass, valve) == (None, None)


async def test_a_sibling_that_appears_after_the_first_check_is_found_next_time(
    hass: HomeAssistant,
) -> None:
    """No cache: a Zigbee sibling that joins after the first read is found on
    the next call -- the same ordering test_flow.py's meters rely on."""
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    assert discover_sibling_sensors(hass, valve) == (None, None)

    registry = er.async_get(hass)
    valve_entry = registry.async_get(valve)
    assert valve_entry is not None
    entry = registry.async_get_or_create(
        "binary_sensor",
        "demo",
        "swv1_b1",
        device_id=valve_entry.device_id,
        suggested_object_id="swv1_b1",
        original_device_class="moisture",
    )

    leak, supply = discover_sibling_sensors(hass, valve)
    assert leak == entry.entity_id
    assert supply is None


async def test_a_withdrawn_sibling_stops_being_offered(hass: HomeAssistant) -> None:
    """Removing the sibling from the registry (a device deleted, a Zigbee
    re-pair) retires the candidate on the very next read: there is nothing
    cached to go stale."""
    valve = _valve_with_siblings(hass, problem=False)
    leak, _supply = discover_sibling_sensors(hass, valve)
    assert leak is not None

    er.async_get(hass).async_remove(leak)

    assert discover_sibling_sensors(hass, valve) == (None, None)


async def test_capability_is_unavailable_when_nothing_is_found_or_configured(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Declared absent, not an alarm that will silently never fire."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "unavailable"
    assert caps.water_supply == "unavailable"


async def test_a_configured_sensor_on_another_device_is_accepted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A ground probe near the bed is legitimate and needs no special case."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.somewhere_else")],
    )
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "configured"
    assert caps.leak_sensor == "binary_sensor.somewhere_else"


async def test_an_unconfigured_zone_with_a_candidate_says_so(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """ "Your hardware could do this, you have not told it to" is its own state."""
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", valve)])
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "candidate_available"
    assert caps.leak_candidate == "binary_sensor.swv1_b1"


async def test_the_discovery_service_returns_both_candidates(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", valve)])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN,
        "discover_zone_sensors",
        {"zone_id": zone_id},
        blocking=True,
        return_response=True,
    )

    assert response["leak_candidate"] == "binary_sensor.swv1_b1"
    assert response["supply_candidate"] == "binary_sensor.swv1_b2"


async def test_add_zone_writes_the_detected_sensors(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The creating service writes the defaults (the 3.0.0 convention).

    A zone created on hardware that exposes both sensors is covered from
    birth, with no extra step and no schema change: they are written, not
    accepted as input.
    """
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    park.add("valve.seed")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Seed", "valve.seed")])

    await hass.services.async_call(
        DOMAIN, "add_zone", {"name": "Vasi", "valve_entity": valve}, blocking=True
    )
    runtime = entry.runtime_data
    created = next(zone.config for zone in runtime.zones.values() if zone.config.name == "Vasi")

    assert created.leak_sensor == "binary_sensor.swv1_b1"
    assert created.water_supply_sensor == "binary_sensor.swv1_b2"


async def test_add_zone_leaves_the_keys_absent_when_nothing_is_detected(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.plain")
    park.add("valve.seed")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Seed", "valve.seed")])

    await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Plain", "valve_entity": "valve.plain"},
        blocking=True,
    )
    runtime = entry.runtime_data
    created = next(zone.config for zone in runtime.zones.values() if zone.config.name == "Plain")

    assert created.leak_sensor is None
    assert created.water_supply_sensor is None


async def test_mixed_installation_resolves_each_zone_independently(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One zone's device offers siblings, the other's does not -- same hub,
    two different verdicts, neither borrowed from the other."""
    freezer.move_to(START)
    valve_with = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve_with)
    park.add("valve.plain")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Vasi", valve_with, order=1),
            zone_data("Plain", "valve.plain", order=2),
        ],
    )
    runtime = entry.runtime_data
    zones_by_valve = {
        runtime.zones[zid].config.valve_entity: runtime.zones[zid].config
        for zid in runtime.zone_ids
    }

    with_caps = resolve_zone_capabilities(hass, zones_by_valve[valve_with])
    plain_caps = resolve_zone_capabilities(hass, zones_by_valve["valve.plain"])

    assert with_caps.leak_detection == "candidate_available"
    assert with_caps.leak_candidate == "binary_sensor.swv1_b1"
    assert plain_caps.leak_detection == "unavailable"
    assert plain_caps.leak_candidate is None
