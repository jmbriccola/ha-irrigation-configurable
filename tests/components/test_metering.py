"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from datetime import timedelta

from custom_components.irrigation_maestro.accounting import MeterLedger, MeterSample
from custom_components.irrigation_maestro.flow import FlowSensorReader
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import BEHAVIOR_STUCK, MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


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


async def test_litres_go_to_the_zone_whose_valve_is_open(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.state.zone_water_total(zone_id) > 40
    assert runtime.state.unattributed_total() == 0.0


async def test_litres_with_every_valve_closed_are_unattributed_and_suspect(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "5", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    # Well before the 05:30 trigger: nothing is open.
    await advance(hass, freezer, 600, step=10.0)

    assert runtime.state.zone_water_total(zone_id) == 0.0
    assert runtime.state.unattributed_closed(zone_id) > 40
    assert runtime.state.unattributed_total(zone_id) == runtime.state.unattributed_closed(zone_id)


async def test_a_shared_line_meter_splits_by_nominal_flow(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Two zones on one meter: proportional, not double.

    Before this, both zones integrated the full line flow and both added it to
    the monthly total -- the same water counted twice.

    The zones share a compatibility_group: _gather_batch only ever lets zones
    coexist within the same non-empty group, so max_concurrent alone would not
    open both valves at once.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                nominal_flow_lpm=10.0,
                order=1,
                compatibility_group="shared",
            ),
            zone_data(
                "Beta",
                "valve.b",
                minutes=10,
                nominal_flow_lpm=30.0,
                order=2,
                compatibility_group="shared",
            ),
        ],
        {"line_flow_sensor": "sensor.line", "max_concurrent": 2},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids[0], runtime.zone_ids[1]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    assert hass.states.get("valve.b").state == "open"
    hass.states.async_set("sensor.line", "40", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    total = runtime.state.zone_water_total(alpha) + runtime.state.zone_water_total(beta)
    assert 180 <= total <= 220  # 40 L/min x ~5 min, once
    ratio = runtime.state.zone_water_total(beta) / runtime.state.zone_water_total(alpha)
    assert 2.5 <= ratio <= 3.5  # 30:10


async def test_a_zone_without_a_meter_gets_a_marked_estimate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    assert 70 <= runtime.state.zone_water_total(zone_id) <= 80
    assert runtime.state.zone_water_estimated(zone_id) == runtime.state.zone_water_total(zone_id)


async def test_rebuild_keeps_a_live_subscription_when_the_meter_is_unaffected(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A config change to an unrelated setting must not deafen a running meter.

    Before this fix, rebuild() called stop(), which stops every ledger and
    clears every listener -- including a live FlowMonitor's subscription on a
    meter the change never touched. Its zero-flow guard would then see zero
    litres accrue on a perfectly healthy run and interrupt it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone = runtime.zones[runtime.zone_ids[0]]
    ledger = runtime.accountant.ledger_for(zone)
    assert ledger is not None
    samples: list[MeterSample] = []
    ledger.subscribe(samples.append)

    # A config change that does not touch this zone's meter.
    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 45})
    await hass.async_block_till_done()

    assert runtime.accountant.ledger_for(zone) is ledger  # same object, not rebuilt from scratch

    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    assert samples, "listener registered before rebuild() must still receive samples after it"


async def test_a_stuck_open_valve_keeps_claiming_its_water_after_close_fails(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The worst case from the module docstring, made concrete.

    _execute() clears the zone from active_runs right after attempting to
    close its valve, whether or not the close actually succeeded. A rule keyed
    off active_runs (run phase) would therefore stop crediting this zone's
    water the instant the close attempt fails -- while the valve is still
    physically open -- and hand the flowing water to the unattributed bucket
    instead, misdiagnosing a stuck-open valve as a system leak. Attribution by
    valve state must keep crediting the zone for as long as its valve reports
    open, close attempt or no.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=5, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})

    # The valve stops responding to commands from here on: the close at the
    # end of the cycle will be attempted, twice, and never confirm.
    park.set_behavior("valve.a", BEHAVIOR_STUCK)

    # Watering duration (5 min) + two close-confirm attempts (120 s each,
    # the default) + margin.
    await advance(hass, freezer, 5 * 60 + 260, step=10.0)

    # The close genuinely failed and the zone was cleared from active_runs
    # anyway -- the defect this test exists to catch, made observable.
    assert hass.states.get("valve.a").state == "open"
    assert zone_id not in runtime.session.active_runs

    total_after_clear = runtime.state.zone_water_total(zone_id)
    assert total_after_clear > 0.0
    assert runtime.state.unattributed_total() == 0.0

    # The valve is still open and water still flows; more must still land on
    # the zone, not on the unattributed bucket.
    await advance(hass, freezer, 120, step=10.0)

    assert runtime.state.zone_water_total(zone_id) > total_after_clear
    assert runtime.state.unattributed_total() == 0.0
