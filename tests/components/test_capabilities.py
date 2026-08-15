"""Per-zone capability detection from the entity and device registries.

Structured like test_flow.py, which is the closest existing analogue and is
itself capability detection in miniature: pure resolution first, then late
appearance, then config change without reload, then withdrawal.
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
    hass: HomeAssistant, *, moisture: bool = True, problem: bool = True
) -> str:
    """A device carrying a valve plus optionally its two binary sensors."""
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
            "swv1_leak",
            device_id=device.id,
            suggested_object_id="irrigazione_vasi_water_leak",
            original_device_class="moisture",
        )
    if problem:
        entities.async_get_or_create(
            "binary_sensor",
            "demo",
            "swv1_supply",
            device_id=device.id,
            suggested_object_id="irrigazione_vasi_water_supply",
            original_device_class="problem",
        )
    return "valve.irrigazione_vasi"


async def test_siblings_are_found_by_device_class_not_by_name(
    hass: HomeAssistant,
) -> None:
    valve = _valve_with_siblings(hass)
    leak, supply = discover_sibling_sensors(hass, valve)
    assert leak == "binary_sensor.irrigazione_vasi_water_leak"
    assert supply == "binary_sensor.irrigazione_vasi_water_supply"


async def test_a_valve_without_siblings_offers_no_candidate(hass: HomeAssistant) -> None:
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    assert discover_sibling_sensors(hass, valve) == (None, None)


async def test_a_valve_with_no_device_at_all_is_handled(hass: HomeAssistant) -> None:
    """A valve that is not in the registry must not raise."""
    hass.states.async_set("valve.orphan", "closed")
    assert discover_sibling_sensors(hass, "valve.orphan") == (None, None)


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


async def test_an_unconfigured_zone_with_a_candidate_says_so(hass: HomeAssistant) -> None:
    """ "Your hardware could do this, you have not told it to" is its own state."""
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", valve)])
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "candidate_available"
    assert caps.leak_candidate == "binary_sensor.irrigazione_vasi_water_leak"


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

    assert response["leak_candidate"] == "binary_sensor.irrigazione_vasi_water_leak"
    assert response["supply_candidate"] == "binary_sensor.irrigazione_vasi_water_supply"


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
    assert with_caps.leak_candidate == "binary_sensor.irrigazione_vasi_water_leak"
    assert plain_caps.leak_detection == "unavailable"
    assert plain_caps.leak_candidate is None
