"""The per-meter ledger: continuous integration, gaps, unit semantics."""

from datetime import timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.accounting import MeterLedger, MeterSample
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine.metering import HUB_SCOPE, UNATTRIBUTED_KEY
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


async def test_retarget_publishes_recovery_on_the_next_sample(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A config edit that resolves an unknown unit is a recovery too.

    MeterLedger.retarget assigns unit_known directly, with no MeterSample to
    publish the edge on. Without latching it, the next _sample would compute
    `reading.unit_known and not self.unit_known` against the value retarget
    had already written -- True and not True -- and the recovery would be
    swallowed, leaving FlowMonitor's periodic guard free to judge a window
    that is part blind and part measured as if it were fully measured. Same
    transition pin as test_recovery_is_published_on_the_state_event: exactly
    one sample carries the edge, not every sample from here on.
    """
    freezer.move_to(START)
    hass.states.async_set("sensor.flow", "10", {})  # unresolvable unit throughout
    ledger, samples = await _ledger(hass)
    try:
        await advance(hass, freezer, 30, step=10.0)
        assert ledger.unit_known is False
        assert all(sample.unit_recovered is False for sample in samples)

        ledger.retarget(FlowSensorReader(hass, "sensor.flow", "L/min"))
        assert ledger.unit_known is True  # retarget itself resolves the unit

        await advance(hass, freezer, 30, step=10.0)
        assert samples[-1].unit_recovered is True

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


def _zone_day(runtime: Any, zone_id: str) -> dict[str, Any]:
    """Today's daily-history record for one zone: litres, est, gap_s, closed_l."""
    return runtime.state.daily_water()[dt_util.now().date().isoformat()][zone_id]


async def _water_through_an_outage(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, *, outage_s: float
) -> tuple[Any, str]:
    """Run a zone on its own meter, with the meter away for ``outage_s``.

    The outage is 100 s, not a round two minutes, on purpose: FlowMonitor's
    zero-flow guard judges 120 s windows, so a window can never fall entirely
    inside the outage however the trigger and the ticks line up. This test is
    about what accounting records, not about the guard.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=20, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    await advance(hass, freezer, 60, step=10.0)  # a minute nobody could miss
    if outage_s:
        hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, outage_s, step=10.0)
        hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 60, step=10.0)
    return runtime, zone_id


async def test_a_meter_outage_mid_cycle_leaves_a_gap_on_the_zones_day(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The litres it did measure, plus how long it measured nothing.

    A gap contributes zero litres by design -- no interpolation, and no zero,
    which would assert that no water passed. Recording the seconds is the only
    thing that keeps the shortfall legible: without it this day is
    indistinguishable from a day with a healthy meter that simply saw less
    water, which is exactly the reading the spec's gap rule exists to make
    possible.
    """
    runtime, zone_id = await _water_through_an_outage(hass, freezer, outage_s=100)

    record = _zone_day(runtime, zone_id)
    assert record["l"] > 15  # ~2 minutes at 10 L/min, either side of the outage
    assert 90 <= record["gap_s"] <= 130
    # The same fact on the entity the card and the user read, not only in the
    # history behind it.
    assert runtime.state.zone_last_gap_at(zone_id) is not None


async def test_a_healthy_day_of_the_same_length_records_no_gap(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The control: gap_s must mean "unobserved", not "elapsed"."""
    runtime, zone_id = await _water_through_an_outage(hass, freezer, outage_s=0)

    record = _zone_day(runtime, zone_id)
    assert record["l"] > 15
    assert record["gap_s"] == 0.0
    assert runtime.state.zone_last_gap_at(zone_id) is None


async def test_a_gap_with_nobody_watering_lands_on_the_unattributed_scope(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A gap follows the litres' own attribution rule, claimants or none.

    Nothing is open here, so there is no zone to charge -- and no litres
    either, which is precisely the path _on_sample's "nothing accrued" early
    return used to swallow whole.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    # Well before the 05:30 trigger: the meter is away and nothing is watering.
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.state.unattributed_total() == 0.0  # a gap is not water
    unattributed = _zone_day(runtime, UNATTRIBUTED_KEY)
    assert unattributed["l"] == 0.0
    assert unattributed["gap_s"] >= 200
    assert zone_id not in runtime.state.daily_water()[dt_util.now().date().isoformat()]


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


async def _report_every_second(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, seconds: int
) -> None:
    """Drive a meter that publishes faster than the store's own save delay.

    The value has to move on every write: an identical state and attribute
    set fires EVENT_STATE_REPORTED, not EVENT_STATE_CHANGED, and would never
    reach the ledger's listener at all.
    """
    for step in range(seconds):
        hass.states.async_set(
            "sensor.flow", f"{10 + step * 0.001:.3f}", {"unit_of_measurement": "L/min"}
        )
        await advance(hass, freezer, 1, step=1.0)


async def test_a_fast_meter_does_not_write_the_store_on_every_sample(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """One store write a minute from the sample path, not one per sample.

    Store.async_delay_save pushes _next_write_time to now + the delay, and
    _async_schedule_callback_delayed_write reschedules whenever its timer
    fires early -- so a meter reporting faster than that delay postpones the
    write for as long as flow continues. The store is shared: a long session
    on a fast meter would land no write at all and hold back
    set_last_completed for cycles that already finished, so a power cut
    waters those zones again on the next evaluate. Nothing wrote at meter
    frequency before 3.3.0.

    The window is 05:00 to 05:05, which contains none of the runtime's other
    writers (temp tracking is on the ten-minute marks, rain staging at minute
    55, housekeeping at midnight) and no session -- so every save counted
    here comes from the sample path. Five minutes of 1 Hz samples is 300
    opportunities and at most six permitted writes; the bound is loose enough
    to survive an off-by-one at either edge and still two orders of magnitude
    away from per-sample.
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

    saves = 0
    dispatches = 0
    real_save = runtime.state.schedule_save
    real_dispatch = runtime.dispatch_update

    def _counted_save() -> None:
        nonlocal saves
        saves += 1
        real_save()

    def _counted_dispatch() -> None:
        nonlocal dispatches
        dispatches += 1
        real_dispatch()

    monkeypatch.setattr(runtime.state, "schedule_save", _counted_save)
    monkeypatch.setattr(runtime, "dispatch_update", _counted_dispatch)

    await _report_every_second(hass, freezer, 300)

    assert runtime.state.unattributed_total() > 0.0  # the litres are still credited
    assert saves <= 8
    assert dispatches <= 8


async def test_water_accrued_outside_a_session_refreshes_its_entity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A tap left open must move the sensor's HA state, not only the store.

    Every entity on this path is push-only: it re-reads on SIGNAL_UPDATE and
    never polls. In-session litres are covered because the session dispatches
    on segment end and on phase transitions; water accrued outside one had no
    dispatcher at all, so hub_unattributed_water's state stood still until
    the midnight housekeeping and the whole delta landed on the wrong
    statistics day.
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

    sensor_id = next(
        state.entity_id
        for state in hass.states.async_all()
        if state.attributes.get("maestro_role") == "hub_unattributed_water"
    )
    assert float(hass.states.get(sensor_id).state) == 0.0

    # No session anywhere near: this is water nobody asked for.
    await _report_every_second(hass, freezer, 180)

    assert runtime.state.unattributed_total() > 0.0
    assert float(hass.states.get(sensor_id).state) > 0.0


async def test_deleting_the_sole_zone_on_a_meter_keeps_the_hub_sensor_monotonic(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A zone deletion must not walk hub_unattributed_water backwards.

    _scope_for keys the unattributed bucket by zone id whenever exactly one
    zone resolves to that meter, and hub_unattributed_water sums every scope --
    so popping the departing zone's bucket dropped a total_increasing sensor's
    state. HA's recorder reads a drop below 90% as a meter reset and re-adds
    the post-drop value to the long-term sum, permanently inflating the Water
    dashboard with no way for the user to correct it.

    This also walks _scope_for's own HUB_SCOPE branch on the deletion path: no
    zone resolves to the line meter afterwards, so the water that keeps
    flowing lands in exactly the bucket the merge went to.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "5", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10)],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    sensor_id = next(
        state.entity_id
        for state in hass.states.async_all()
        if state.attributes.get("maestro_role") == "hub_unattributed_water"
    )

    # Well before the 05:30 trigger, so nothing is watering. Exactly one zone
    # resolves to the line meter, so _scope_for books the litres under its id.
    await advance(hass, freezer, 300, step=10.0)
    scoped = runtime.state.unattributed_total(zone_id)
    assert scoped > 0.0
    assert runtime.state.unattributed_total() == scoped
    published = float(hass.states.get(sensor_id).state)
    assert published > 0.0

    hass.config_entries.async_remove_subentry(entry, zone_id)
    await hass.async_block_till_done()

    assert zone_id not in runtime.zone_ids
    assert runtime.state.unattributed_total(zone_id) == 0.0
    assert runtime.state.unattributed_total(HUB_SCOPE) == pytest.approx(scoped)
    assert float(hass.states.get(sensor_id).state) >= published

    await advance(hass, freezer, 300, step=10.0)

    assert runtime.state.unattributed_total(HUB_SCOPE) > scoped
    assert float(hass.states.get(sensor_id).state) >= published


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


@pytest.mark.parametrize("valve_state", ["opening", "closing", "unavailable"])
async def test_an_uncertain_valve_contributes_no_leak_evidence(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, valve_state: str
) -> None:
    """Not-open is not closed: an uncertain valve must not manufacture a leak.

    _all_valves_closed used to be `not any(is_open)`, which contradicts
    valves.py -- is_closed treats an uncertain state as busy, never as free.
    A `valve.` entity publishes opening/closing while it travels and a battery
    Zigbee valve publishes unavailable mid-run; in every one of those windows
    _claimants returns [] AND the weaker test returns True, so the litres were
    booked into closed_l, the only input 3.4.0's leak detection reads and
    persisted from this release onward. The water must still be seen -- it
    flowed -- but it is not evidence of anything.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a", valve_state)
    hass.states.async_set("sensor.flow", "5", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data

    # Well before the 05:30 trigger, so no session ever touches the valve --
    # and the watchdog only force-closes valves that report *open*, so the
    # uncertain state stands for the whole window.
    await advance(hass, freezer, 600, step=10.0)

    assert hass.states.get("valve.a").state == valve_state
    assert runtime.state.unattributed_total() > 40
    assert runtime.state.unattributed_closed() == 0.0


async def test_a_shared_line_meter_with_only_some_nominals_splits_equally(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One zone declares a nominal flow, the other does not: equal shares.

    The fallback used to need *every* nominal missing (total_weight <= 0), so
    a mixed configuration credited the unset zone a weight of zero -- exactly
    zero litres for a zone whose valve was demonstrably open. Water is
    conserved either way and no leak is flagged, but "you used nothing" is a
    plainly false per-zone figure, and a partial set of nominals cannot yield
    a trustworthy proportion to replace it with.
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
    assert beta_total > 0.0  # never "you used nothing"
    assert alpha_total == pytest.approx(beta_total, rel=0.05)


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
