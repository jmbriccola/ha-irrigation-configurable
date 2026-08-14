"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from datetime import timedelta

import pytest
from custom_components.irrigation_maestro.accounting import MeterLedger, MeterSample
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.flow import FlowSensorReader
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

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


async def test_a_cycles_tail_is_charged_to_the_zone_not_closed_l(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The interval spanning a valve's close is attributed to who was open at ITS START.

    _on_sample attributes the interval it is closing using the claimant set
    remembered from the previous sample, not the claimants at its own
    instant -- symmetric with test_the_closed_interval_is_charged_at_the_old_rate,
    which pins the same left-Riemann ordering for the rate. Without it, a
    cycle's tail -- up to one 30 s tick's worth, integrated after
    _close_valve has already completed -- would find no claimants right now
    and land in add_unattributed(..., valves_closed=True): a false
    contribution to closed_l, the only input the next PR's leak detection
    reads, on every single cycle.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=1, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    started_at = runtime.session.active_runs[zone_id].started_at
    assert started_at is not None

    async def advance_to(elapsed_s: float) -> None:
        remaining = elapsed_s - (dt_util.utcnow() - started_at).total_seconds()
        assert remaining > 0, "the checkpoint is already behind us"
        await advance(hass, freezer, remaining, step=1.0)

    # Flow stays at a steady, known rate straight through the 1-minute
    # cycle's close, so the ledger's next sample integrates an interval that
    # straddles it.
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance_to(61)  # 1 s past the duration -- close is near-instant in mocks
    assert hass.states.get("valve.a").state == "closed"

    # Nothing is watering from here: resetting the sensor immediately, at
    # 1 s granularity, bounds how much of a genuinely-still-flowing artifact
    # this test's own timing can introduce (at most ~1 s * 10 L/min = 0.17 L)
    # to well under what even a single un-fixed 30 s tick would misattribute
    # (up to 5 L). The reset itself publishes the sample that closes the tail
    # interval spanning the valve's actual close -- still charged to the
    # zone, per the fix, since that is who was watering at the tail's start.
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 60, step=10.0)

    assert runtime.state.unattributed_closed() < 1.0
    assert runtime.state.zone_water_total(zone_id) > 0.0


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


async def test_editing_a_running_meters_override_does_not_deafen_its_monitor(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A unit override edited mid-cycle must not interrupt the cycle.

    Config changes are applied in place precisely so a reload cannot abort a
    running cycle. But rebuild() used to drop and recreate the ledger of any
    meter whose resolved override changed, and MeterLedger.stop() clears its
    listeners -- including the running FlowMonitor's, which holds the ledger
    object and never re-resolves it. Its litres would freeze while unit_known
    stayed True, so `blind` stayed False, the periodic check's delta was 0,
    and within two grace windows the guard interrupted a perfectly healthy
    run as no_flow. The ledger is retargeted in place instead.

    The override written here is the unit the sensor already declares, so the
    litres per minute are identical before and after: what the test isolates
    is the deafening, not a change of scale.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    ledger = runtime.accountant.ledger_for(runtime.zones[zone_id])
    assert ledger is not None
    await advance(hass, freezer, 30, step=10.0)
    total_at_edit = runtime.state.zone_water_total(zone_id)
    assert total_at_edit > 0.0

    subentry = entry.subentries[zone_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, "flow_sensor_unit": "L/min"}
    )
    await hass.async_block_till_done()

    # Same object, so the monitor's subscription and its baseline still mean
    # what they meant: the litres carry on rather than restarting at zero.
    assert runtime.accountant.ledger_for(runtime.zones[zone_id]) is ledger

    # Well past two ZERO_FLOW_GRACE_S windows, and past the cycle's end.
    await advance(hass, freezer, 11 * 60, step=10.0)

    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"
    assert outcome["reason_key"] != "no_flow"
    assert runtime.state.zone_water_total(zone_id) > total_at_edit


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


async def test_a_no_flow_interrupt_on_a_usable_meter_books_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A no-flow interrupt measures a real, true zero -- not "no usable meter".

    add_consumption used to guard on liters > 0, which conflates "this cycle
    measured no litres" with "this zone has no usable meter". A zone whose
    meter is perfectly readable, interrupted by the zero-flow guard because
    nothing actually flowed, would still get the nominal estimate booked onto
    zone_water_total -- a device_class: water / total_increasing sensor the
    user has chosen to expose on HA's Water dashboard -- as if that water had
    been delivered. The guard must be "is there a usable meter", not "did
    this cycle tally anything".
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                flow_sensor="sensor.flow",
                nominal_flow_lpm=10.0,
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # Flow never starts: after the grace period the cycle is interrupted.
    await advance(hass, freezer, 3 * 60)
    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_flow"

    assert runtime.state.zone_water_total(zone_id) == 0.0
    assert runtime.state.zone_water_estimated(zone_id) == 0.0


async def test_a_shared_line_meter_without_nominals_splits_equally(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Neither zone declares a nominal flow: the equal-split fallback, not a crash.

    Without the total_weight <= 0 guard, liters * weight / total_weight
    divides by zero inside _on_sample -- which MeterLedger._sample's own
    `except Exception` swallows into a log line, so every litre on that meter
    would be dropped forever while the run looked perfectly healthy.
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
            zone_data("Alpha", "valve.a", minutes=10, order=1, compatibility_group="shared"),
            zone_data("Beta", "valve.b", minutes=10, order=2, compatibility_group="shared"),
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

    alpha_total = runtime.state.zone_water_total(alpha)
    beta_total = runtime.state.zone_water_total(beta)
    assert 180 <= alpha_total + beta_total <= 220  # 40 L/min x ~5 min, once
    assert alpha_total == pytest.approx(beta_total, rel=0.05)  # 50/50


async def test_a_zone_vs_zone_override_conflict_is_reported_then_cleared(
    hass: HomeAssistant,
) -> None:
    """The placeholders must stay bare zone names, not pre-formatted labels.

    A prior round replaced these with labels like "zone Alpha" and dropped
    "zone"/"zona" from both locale templates to make room for a hub label --
    which silently broke the Italian wording for this, the common case,
    which had been correct. Asserting the placeholders are bare data is what
    would have caught that regression: a template can only supply its own
    word for "zone" in each locale if the placeholder does not already carry
    one.
    """
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.shared",
                flow_sensor_unit="L/min",
                order=1,
            ),
            zone_data(
                "Beta",
                "valve.b",
                flow_sensor="sensor.shared",
                flow_sensor_unit="m³/h",
                order=2,
            ),
        ],
    )
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, "flow_unit_override_conflict_sensor.shared")
    assert issue is not None
    assert issue.translation_placeholders == {
        "entity_id": "sensor.shared",
        "first": "Alpha",
        "second": "Beta",
    }

    # Align the two zones' overrides; the next rebuild retires the warning.
    beta_id = entry.runtime_data.zone_ids[1]
    subentry = entry.subentries[beta_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, "flow_sensor_unit": "L/min"}
    )
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, "flow_unit_override_conflict_sensor.shared") is None


async def test_a_zone_vs_hub_override_conflict_on_the_line_meter_is_reported(
    hass: HomeAssistant,
) -> None:
    """Same entity, two interpretations: a zone's own override on the shared
    line meter must not silently disagree with the hub's line_flow_sensor_unit.

    flow_reader_for builds a reader under the hub's override for any zone
    that falls back to the line meter, while the ledger (via _resolved_meters)
    reads it under the winning zone's override -- the zone-wins precedence is
    correct and stays, but the disagreement must be visible. This is its own
    issue id and translation key (flow_unit_override_conflict_line), not the
    zone-vs-zone one: the claimant here is the hub, not a second zone, and a
    single static template cannot correctly say "zone" in one case and "the
    hub" in another across two languages via a placeholder alone.
    """
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.line",
                flow_sensor_unit="m³/h",
            )
        ],
        {"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "L/min"},
    )
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, "flow_unit_override_conflict_line_sensor.line")
    assert issue is not None
    assert issue.translation_placeholders == {"entity_id": "sensor.line", "zone": "Alpha"}

    # Align the hub's override with the zone's; the next rebuild clears it.
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "line_flow_sensor_unit": "m³/h"}
    )
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, "flow_unit_override_conflict_line_sensor.line") is None


async def test_zone_vs_zone_and_zone_vs_hub_conflicts_on_one_entity_clear_independently(
    hass: HomeAssistant,
) -> None:
    """Both conflict shapes can fire on the same entity at once.

    Two zones both point at the hub's own line meter, with three different
    overrides between them (Alpha vs Beta, and the winning zone, Alpha, vs
    the hub): a zone-vs-zone conflict and a zone-vs-hub conflict on the very
    same entity, simultaneously. Distinct issue ids for the two shapes exist
    precisely so that resolving one can never clear the other; this proves it
    by resolving only the zone-vs-zone side and asserting the zone-vs-hub
    issue is untouched.
    """
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.line",
                flow_sensor_unit="m³/h",
                order=1,
            ),
            zone_data(
                "Beta",
                "valve.b",
                flow_sensor="sensor.line",
                flow_sensor_unit="L/min",
                order=2,
            ),
        ],
        {"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "L/min"},
    )
    registry = ir.async_get(hass)
    zone_issue_id = "flow_unit_override_conflict_sensor.line"
    line_issue_id = "flow_unit_override_conflict_line_sensor.line"
    assert registry.async_get_issue(DOMAIN, zone_issue_id) is not None
    assert registry.async_get_issue(DOMAIN, line_issue_id) is not None

    # Resolve only the zone-vs-zone conflict: align Beta with Alpha, who
    # wins the line meter (order=1). The hub's own override (L/min) still
    # disagrees with Alpha's (m³/h) -- that conflict must remain.
    beta_id = entry.runtime_data.zone_ids[1]
    subentry = entry.subentries[beta_id]
    hass.config_entries.async_update_subentry(
        entry, subentry, data={**subentry.data, "flow_sensor_unit": "m³/h"}
    )
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, zone_issue_id) is None
    assert registry.async_get_issue(DOMAIN, line_issue_id) is not None
