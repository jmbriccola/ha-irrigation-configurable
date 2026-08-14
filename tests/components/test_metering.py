"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from custom_components.irrigation_maestro.accounting import MeterLedger, MeterSample
from custom_components.irrigation_maestro.flow import FlowSensorReader
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .test_session import START, advance


async def _ledger(hass: HomeAssistant) -> tuple[MeterLedger, list[MeterSample]]:
    ledger = MeterLedger(hass, FlowSensorReader(hass, "sensor.flow"))
    samples: list[MeterSample] = []
    ledger.subscribe(samples.append)
    ledger.start()
    return ledger, samples


async def test_the_ledger_integrates_between_ticks(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, _samples = await _ledger(hass)

    await advance(hass, freezer, 120, step=10.0)

    assert 110 <= ledger.total_l <= 130  # 60 L/min for ~2 min
    ledger.stop()


async def test_the_ledger_converts_at_the_boundary(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m3/h is 7.5 L/min, not 0.45."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    ledger, _samples = await _ledger(hass)

    await advance(hass, freezer, 600, step=10.0)

    assert 70 <= ledger.total_l <= 80
    ledger.stop()


async def test_an_unavailable_meter_is_a_gap_not_a_zero(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No interpolation and no phantom zero: the counter simply falls behind."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)

    await advance(hass, freezer, 60, step=10.0)
    before = ledger.total_l
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)

    assert ledger.total_l == before  # nothing accrued across the gap
    assert samples[-1].available is False
    assert samples[-1].measured_s == 0.0
    ledger.stop()


async def test_an_unknown_unit_freezes_the_total(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 60, step=10.0)
    before = ledger.total_l

    hass.states.async_set("sensor.flow", "60", {})  # unit gone
    await advance(hass, freezer, 120, step=10.0)

    assert ledger.total_l == before
    assert ledger.unit_known is False
    assert samples[-1].lpm is None
    ledger.stop()


async def test_recovery_is_published_on_the_state_event(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The zero-flow guard learns of recovery now, not on its next tick."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {})  # unit unknown from the start
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 30, step=10.0)

    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    assert samples[-1].unit_recovered is True
    assert ledger.unit_known is True
    ledger.stop()


async def test_the_total_never_decreases(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    await advance(hass, freezer, 120, step=10.0)
    hass.states.async_set("sensor.flow", "-100", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 60, step=10.0)

    totals = [sample.total_l for sample in samples]
    assert totals == sorted(totals)
    ledger.stop()
