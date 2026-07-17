"""Live reconfiguration tests: zones and cycles change without a reload (§5)."""

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState, ConfigSubentry
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_entities import role_state
from .test_session import START, mock_weather, setup_hub, zone_data


def _zone_subentry(name: str, valve: str, **kwargs) -> ConfigSubentry:
    return ConfigSubentry(
        data=zone_data(name, valve, **kwargs),
        subentry_type="zone",
        title=name,
        unique_id=None,
    )


async def test_add_zone_at_runtime_without_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    assert len(runtime.zone_ids) == 1

    new_sub = _zone_subentry("Beta", "valve.b")
    hass.config_entries.async_add_subentry(entry, new_sub)
    await hass.async_block_till_done()

    # No reload: same entry state and same runtime object.
    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data is runtime
    assert new_sub.subentry_id in runtime.zone_ids
    # The new zone's entities exist.
    assert role_state(hass, "zone_state", new_sub.subentry_id) is not None
    assert role_state(hass, "zone_enabled", new_sub.subentry_id) is not None


async def test_remove_zone_at_runtime_drops_entities_and_state(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a"), zone_data("Beta", "valve.b")])
    runtime = entry.runtime_data
    beta_id = runtime.zone_ids[1]
    runtime.state.set_zone_enabled(beta_id, False)  # leave some state behind

    hass.config_entries.async_remove_subentry(entry, beta_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data is runtime
    assert beta_id not in runtime.zone_ids
    assert role_state(hass, "zone_state", beta_id) is None
    # Storage state for the removed zone was dropped.
    assert runtime.state.zone_enabled(beta_id) is True  # back to the default


async def test_add_and_remove_cycle_switch_without_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    subentry = entry.subentries[zone_id]

    def cycle_switch_ids() -> set[str]:
        return {
            state.attributes["cycle_id"]
            for state in hass.states.async_all()
            if state.attributes.get("maestro_role") == "cycle_enabled"
            and state.attributes.get("zone_id") == zone_id
        }

    assert cycle_switch_ids() == {"cy_alpha"}

    # Add a second cycle.
    new_cycles = [
        *subentry.data["cycles"],
        {
            "id": "cy_evening",
            "name": "Evening",
            "enabled": True,
            "trigger": {"kind": "time", "at": "19:30"},
            "curve": {"points": [[20.0, 4.0]], "min_value": 1.0, "max_value": 60.0},
        },
    ]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, "cycles": new_cycles}
    )
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data is runtime
    assert cycle_switch_ids() == {"cy_alpha", "cy_evening"}

    # Remove the original cycle.
    hass.config_entries.async_update_subentry(
        entry,
        entry.subentries[zone_id],
        data={**entry.subentries[zone_id].data, "cycles": new_cycles[1:]},
    )
    await hass.async_block_till_done()
    assert cycle_switch_ids() == {"cy_evening"}
