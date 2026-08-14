"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from datetime import timedelta

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
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 120, step=10.0)

        assert 110 <= ledger.total_l <= 130  # 60 L/min for ~2 min
        # A healthy, gap-free tick reports the interval it actually measured,
        # not a permanent zero: the last tick closed exactly the 30 s since
        # the previous one.
        assert samples[-1].measured_s == 30.0
    finally:
        ledger.stop()


async def test_the_ledger_converts_at_the_boundary(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m3/h is 7.5 L/min, not 0.45."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    ledger, _samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 600, step=10.0)

        assert 70 <= ledger.total_l <= 80
    finally:
        ledger.stop()


async def test_an_unavailable_meter_is_a_gap_not_a_zero(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No interpolation and no phantom zero: the counter simply falls behind."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 60, step=10.0)
        before = ledger.total_l
        hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, 120, step=10.0)

        assert ledger.total_l == before  # nothing accrued across the gap
        assert samples[-1].available is False
        assert samples[-1].measured_s == 0.0
    finally:
        ledger.stop()


async def test_an_unknown_unit_freezes_the_total(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 60, step=10.0)
        before = ledger.total_l

        hass.states.async_set("sensor.flow", "60", {})  # unit gone
        await advance(hass, freezer, 120, step=10.0)

        assert ledger.total_l == before
        assert ledger.unit_known is False
        assert samples[-1].lpm is None
        # The brief requires measured_s to be zero here too: an unknown unit
        # is exactly as blind a window as an unavailable meter.
        assert samples[-1].measured_s == 0.0
    finally:
        ledger.stop()


async def test_recovery_is_published_on_the_state_event(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The zero-flow guard learns of recovery now, not on its next tick.

    Also pins the transition, not just the edge: every sample before
    recovery must read False, and the sample after the recovery sample must
    read False again. A flag computed from the current state alone (ignoring
    whether the unit was previously unknown) would latch True forever once
    the unit first recovers -- and Task 9's guard would then skip every
    window for the life of the process.
    """
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {})  # unit unknown from the start
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 30, step=10.0)
        assert samples, "expected at least one sample before recovery"
        assert all(sample.unit_recovered is False for sample in samples)

        hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
        await hass.async_block_till_done()

        assert samples[-1].unit_recovered is True
        assert ledger.unit_known is True

        await advance(hass, freezer, 30, step=10.0)
        assert samples[-1].unit_recovered is False
    finally:
        ledger.stop()


async def test_the_total_never_decreases(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 120, step=10.0)
        hass.states.async_set("sensor.flow", "-100", {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, 60, step=10.0)

        totals = [sample.total_l for sample in samples]
        assert totals == sorted(totals)
    finally:
        ledger.stop()


async def test_the_closed_interval_is_charged_at_the_old_rate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Pins the left-Riemann ordering: integrate before re-reading.

    The interval just closed must be charged at the rate that was in effect
    *before* this sample (the rate held since the last sample), never the
    rate this sample just read. A swapped implementation -- re-read, then
    integrate using the freshly-read rate -- would charge the closed
    interval at the new rate instead. 60 L/min (1 L/s) for 10 s is 10 L
    under the correct ordering and 20 L under the swapped one; a further
    15 s at 120 L/min (2 L/s) adds 30 L either way, giving 40 L total under
    the correct ordering and 50 L under the swapped one -- far enough apart
    to tell them apart with a tight bound.
    """
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, _samples = await _ledger(hass)
    try:
        freezer.tick(timedelta(seconds=10))  # 10 s still at 60 L/min
        hass.states.async_set("sensor.flow", "120", {"unit_of_measurement": "L/min"})
        await hass.async_block_till_done()

        after_switch = ledger.total_l
        assert 9 <= after_switch <= 11  # charged at 60 L/min, not 120

        freezer.tick(timedelta(seconds=15))  # 15 s at the new rate, 120 L/min
    finally:
        ledger.stop()  # finalizes the second interval

    assert 38 <= ledger.total_l <= 42


async def test_start_is_idempotent(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """Task 8 rebuilds ledgers on config change; a second start() must be a no-op."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger, samples = await _ledger(hass)
    try:
        ledger.start()  # must not add a second pair of subscriptions

        hass.states.async_set("sensor.flow", "90", {"unit_of_measurement": "L/min"})
        await hass.async_block_till_done()

        assert len(samples) == 1  # one subscription, one sample per state change
    finally:
        ledger.stop()


async def test_a_raising_listener_does_not_stop_its_peers(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One subscriber's failure must not kill the ledger or starve the others."""
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "60", {"unit_of_measurement": "L/min"})
    ledger = MeterLedger(hass, FlowSensorReader(hass, "sensor.flow"))
    received: list[MeterSample] = []

    def _raising(_sample: MeterSample) -> None:
        raise RuntimeError("boom")

    ledger.subscribe(_raising)
    ledger.subscribe(received.append)
    ledger.start()
    try:
        await advance(hass, freezer, 30, step=10.0)
        assert received  # the second subscriber still got its sample
    finally:
        ledger.stop()
