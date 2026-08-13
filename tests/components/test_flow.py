"""Unit resolution at the one boundary that reads a flow sensor.

The component used to read float(state.state) and call it L/min whatever the
sensor declared. On the field install the zone meters publish m3/h, which made
every litre 16.7x too small.
"""

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.flow import (
    CANONICAL_UNIT,
    SUPPORTED_FLOW_UNITS,
    FlowSensorReader,
)
from homeassistant.const import UnitOfVolumeFlowRate
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.util.unit_conversion import VolumeFlowRateConverter

from .test_session import setup_hub, zone_data


def test_the_canonical_unit_is_litres_per_minute() -> None:
    assert CANONICAL_UNIT == UnitOfVolumeFlowRate.LITERS_PER_MINUTE


def test_the_supported_units_are_exactly_what_the_converter_handles() -> None:
    # A hand-maintained list would drift the moment HA adds a unit.
    assert frozenset(VolumeFlowRateConverter.VALID_UNITS) == SUPPORTED_FLOW_UNITS


async def test_a_cubic_metres_per_hour_sensor_is_converted(hass: HomeAssistant) -> None:
    # The exact case from the field install.
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_litres_per_minute_sensor_passes_through(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_sensor_with_no_declared_unit_is_unknown(hass: HomeAssistant) -> None:
    # Deliberately NOT assumed to be L/min: assuming silently is the defect.
    hass.states.async_set("sensor.flow", "7.5")
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm is None
    assert reading.source == "unknown"
    assert reading.unit is None


async def test_a_unit_the_converter_cannot_handle_is_unknown(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "widgets/s"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm is None
    assert reading.source == "unknown"


async def test_an_override_wins_over_the_declared_unit(hass: HomeAssistant) -> None:
    # The sensor claims L/min, the user says it is really m3/h. The user wins,
    # and the reading says so.
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow", override="m³/h").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "override"
    assert reading.unit == "m³/h"


async def test_an_override_rescues_a_sensor_that_declares_nothing(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "0.45")
    reading = FlowSensorReader(hass, "sensor.flow", override="m³/h").read()
    assert reading.lpm == pytest.approx(7.5)


async def test_an_unsupported_override_falls_back_to_the_declared_unit(
    hass: HomeAssistant,
) -> None:
    # A stored override the converter does not know must not blind a sensor
    # that declares a unit perfectly well.
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow", override="widgets/s").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_missing_sensor_reads_unknown(hass: HomeAssistant) -> None:
    reading = FlowSensorReader(hass, "sensor.nope").read()
    assert reading.lpm is None
    assert reading.source == "unknown"


@pytest.mark.parametrize("state", ["unavailable", "unknown", "not a number"])
async def test_an_unusable_state_reads_zero_when_the_unit_is_known(
    hass: HomeAssistant, state: str
) -> None:
    # Unit known, value not: that is zero flow, which the zero-flow guard is
    # entitled to act on. It is NOT the same as an unknown unit.
    hass.states.async_set("sensor.flow", state, {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == 0.0
    assert reading.source == "declared"


async def test_a_negative_reading_is_clamped_to_zero(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "-3", {"unit_of_measurement": "L/min"})
    assert FlowSensorReader(hass, "sensor.flow").read().lpm == 0.0


async def test_unit_known_is_true_for_a_convertible_unit(hass: HomeAssistant) -> None:
    # The convenience property, exercised directly rather than via .read().
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    assert FlowSensorReader(hass, "sensor.flow").unit_known is True


async def test_unit_known_is_false_when_the_unit_cannot_be_resolved(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "7.5")  # no unit declared
    assert FlowSensorReader(hass, "sensor.flow").unit_known is False


async def test_the_unit_is_re_read_every_time(hass: HomeAssistant) -> None:
    # An upstream integration update or an entity-settings override can change
    # it while the system runs.
    reader = FlowSensorReader(hass, "sensor.flow")
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    assert reader.read().lpm == pytest.approx(7.5)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    assert reader.read().lpm == pytest.approx(0.45)
    hass.states.async_set("sensor.flow", "0.45")
    assert reader.read().lpm is None


async def test_an_install_with_a_non_canonical_meter_gets_a_scale_notice(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, "flow_unit_corrected")
    assert issue is not None
    assert issue.translation_placeholders is not None
    assert "sensor.flow" in issue.translation_placeholders["sensors"]


async def test_an_install_already_in_litres_per_minute_gets_no_notice(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_corrected") is None
