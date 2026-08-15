"""One leak alarm per zone, from sources that may see the same event twice.

Source 1 is the valve's own sensor; source 2 is flow measured while every
managed valve reports closed, which only this component can check because only
it commanded the closure. On SONOFF SWV hardware they are the same physical
detection -- that valve's "moisture" sensor is an alarm derived from its
internal flow meter, not a ground probe -- so they converge into one state with
one notification. Which source noticed first is kept, because "the valve told
me" and "I measured it" are different diagnostic facts at equal alarm, and on
hardware without the firmware alarm only one of them can ever fire first.

Anything this module reports about source 1 has to be true for BOTH readings of
``moisture``: "the valve of zone X reports a leak", never "water detected on
the ground". On other hardware that device class really is a ground probe, and
either wording is false for half of all installations.

Source 3, the water supply, is not a leak and is not handled here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Final

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .models import ZoneConfig
    from .runtime import IrrigationRuntime

#: The valve said so.
SOURCE_VALVE_SENSOR: Final = "valve_sensor"
#: We measured water moving while every managed valve reported closed.
SOURCE_NO_FLOW_CLOSED: Final = "no_flow_closed"

_STATE_LEAK: Final = "on"
_STATE_NO_LEAK: Final = "off"


@dataclass(frozen=True, slots=True)
class LeakState:
    """One zone's alarm. One alarm, however many sources agree."""

    active: bool = False
    since: datetime | None = None
    #: Which source raised it. Never overwritten by a later one.
    first_source: str | None = None
    sources: frozenset[str] = field(default_factory=frozenset)


class LeakDetector:
    """Watches one zone's sources and keeps a single alarm state.

    Per zone, and resolved from that zone's own configuration and its own
    meter: a mixed installation where one zone has a leak sensor and another
    has only a meter must behave correctly for each.

    Memory only, deliberately. The confirmation window and the alarm both
    restart from nothing after a Home Assistant restart, which is the safe
    direction: a restart is not evidence that a leak is still running, and
    re-confirming costs five minutes of a condition that by definition
    persists. A leak still present is re-detected by whichever source saw it,
    including a sensor that is already reporting one when we start.
    """

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        self._runtime = runtime
        self._zone_id = zone_id
        self.state = LeakState()
        #: Seconds of flow above the threshold, with every managed valve
        #: closed, that the meter actually MEASURED since the last reset.
        #: Accumulated seconds rather than the difference of two timestamps:
        #: the difference would silently count an outage as confirmation,
        #: which would raise an alarm from data nobody read.
        self._above_threshold_s = 0.0
        self._unsubs: list[CALLBACK_TYPE] = []
        self._repeat_unsub: CALLBACK_TYPE | None = None

    # Lifecycle --------------------------------------------------------------

    def start(self) -> None:
        """Subscribe to the zone's leak sensor and read where it stands.

        Idempotent, and safe to call again after a configuration change: the
        subscription is rebuilt against whatever sensor the zone declares now,
        while the alarm itself survives. An edit to an unrelated setting must
        not silently clear a live alarm, exactly as WaterAccountant.rebuild
        refuses to drop a ledger it did not have to touch.
        """
        self._unsubscribe_sources()
        config = self._config
        sensor = config.leak_sensor if config else None
        if not sensor:
            # Truthiness, not ``is not None``: update_zone stores "" as a way
            # of clearing the key, and subscribing to that would bind a
            # listener to nothing.
            return
        self._unsubs.append(
            async_track_state_change_event(self._runtime.hass, [sensor], self._on_leak_sensor)
        )
        # A sensor ALREADY reporting a leak when we start would otherwise never
        # be noticed: it has no further state change left to make. That is the
        # leak which began while Home Assistant was down -- the one the user
        # most needs to be told about.
        state = self._runtime.hass.states.get(sensor)
        self._judge_sensor(None if state is None else state.state)

    def stop(self) -> None:
        self._unsubscribe_sources()
        self._cancel_repeat()

    def _unsubscribe_sources(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @property
    def _config(self) -> ZoneConfig | None:
        zone = self._runtime.zones.get(self._zone_id)
        return zone.config if zone else None

    # Source 1: the valve's own sensor ----------------------------------------

    @callback
    def _on_leak_sensor(self, event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        self._judge_sensor(None if new_state is None else new_state.state)

    def _judge_sensor(self, value: str | None) -> None:
        """``on`` raises, ``off`` withdraws, anything else says nothing.

        "unavailable" and "unknown" are not "no leak". A sensor that cannot be
        read has not told us the leak stopped, and withdrawing the alarm on its
        silence would assert exactly that.
        """
        if value == _STATE_LEAK:
            self._raise(SOURCE_VALVE_SENSOR)
        elif value == _STATE_NO_LEAK:
            self._withdraw(SOURCE_VALVE_SENSOR)

    # Source 2: flow with everything shut -------------------------------------

    def note_flow(
        self, *, liters: float, measured_s: float, elapsed_s: float, all_closed: bool
    ) -> None:
        """Feed source 2 with one closed interval of the zone's own meter.

        Called once per meter sample by WaterAccountant, with the figures of
        the interval that sample just closed -- the same interval, judged by
        the same claimants, whose litres it books into ``closed_l``. Not a
        second, independent reading of the meter: there is one integrator per
        meter and this consumes it.

        ``all_closed`` must be WaterAccountant.all_valves_closed's answer for
        that interval and must not be recomputed here or anywhere else. It is
        ``all(is_closed)`` rather than ``not any(is_open)``, so a valve that is
        travelling or unavailable claims no water and is no leak evidence
        either -- the only honest reading of "we do not know", and one a
        second copy of the predicate would eventually lose.

        Litres over measured seconds, never the sample's ``lpm``: that field
        is the instantaneous reading opening the NEXT interval, and flow.py
        reports a known-unit meter that has gone unavailable as ``lpm=0.0``,
        which an alarm must not read as "no water passed". The pair used here
        cannot say that -- an unmeasured interval carries no seconds at all.

        The four verdicts, and why each is what it is:

        * nothing happened (no elapsed time) -- leave everything alone;
        * something was open -- reset the window. Water through an open valve
          is watering, whoever opened it. The alarm is NOT withdrawn: a valve
          opening is not evidence that a leak stopped;
        * nothing was measured (the meter is unreadable, or its unit is not) --
          leave everything alone. No evidence is neither confirmation nor
          denial: counting it would confirm from data nobody read, and
          resetting on it would let a flaky meter make a real leak
          unconfirmable;
        * measured, everything shut, below threshold -- reset the window AND
          withdraw. This is the one case that is genuine evidence the water has
          stopped, and the mechanism that makes post-cycle drainage harmless.
        """
        hub = self._runtime.hub
        if elapsed_s <= 0.0:
            return
        if not all_closed:
            self._above_threshold_s = 0.0
            return
        if measured_s <= 0.0:
            return
        lpm = liters / measured_s * 60.0
        # A measured zero is always below, whatever the threshold is set to.
        # ``leak_threshold_lpm = 0`` means "any flow at all is a leak", never
        # "no flow at all is a leak" -- and the second reading would put a
        # permanent alarm on a perfectly dry system.
        if lpm <= 0.0 or lpm < hub.leak_threshold_lpm:
            self._above_threshold_s = 0.0
            self._withdraw(SOURCE_NO_FLOW_CLOSED)
            return
        self._above_threshold_s += measured_s
        if self._above_threshold_s >= hub.leak_confirm_s:
            self._raise(SOURCE_NO_FLOW_CLOSED)

    # The single alarm --------------------------------------------------------

    def _raise(self, source: str) -> None:
        if self.state.active:
            if source in self.state.sources:
                return  # already known; the reminder runs on its own clock
            # A second source agreeing is not a second leak. Record it and stay
            # quiet: on the reference hardware the two sources ARE one physical
            # detection, and two notifications for one event is noise the user
            # has no way to decode. first_source is left as it was, because
            # which one noticed is a fact about the diagnosis, not about the
            # alarm.
            self.state = LeakState(
                active=True,
                since=self.state.since,
                first_source=self.state.first_source,
                sources=self.state.sources | {source},
            )
            self._runtime.dispatch_update()
            return
        self.state = LeakState(
            active=True,
            since=dt_util.utcnow(),
            first_source=source,
            sources=frozenset({source}),
        )
        self._arm_repeat()
        self._runtime.on_leak_raised(self._zone_id, self.state)

    def _withdraw(self, source: str) -> None:
        if not self.state.active or source not in self.state.sources:
            return
        remaining = self.state.sources - {source}
        if remaining:
            # One alarm, two sources: losing one of them is not the end of the
            # leak, and re-notifying about the survivor would be a second
            # notification for the same event.
            self.state = LeakState(
                active=True,
                since=self.state.since,
                first_source=self.state.first_source,
                sources=remaining,
            )
            self._runtime.dispatch_update()
            return
        self.state = LeakState()
        self._cancel_repeat()
        self._runtime.on_leak_cleared(self._zone_id)

    # The reminder ------------------------------------------------------------

    def _arm_repeat(self) -> None:
        """Say it again in leak_repeat_min, and keep saying it.

        A timer of the alarm's own rather than a counter driven by detections:
        source 2 reports on every meter sample while source 1 changes state
        once and then says nothing for as long as the leak lasts. Tying the
        reminder to detections would repeat at meter frequency for one and
        never at all for the other -- the two failure modes this exists to
        avoid, at once.
        """
        self._cancel_repeat()
        repeat_s = self._runtime.hub.leak_repeat_min * 60
        if repeat_s <= 0:
            return  # configured off: raise and clear still report
        self._repeat_unsub = async_call_later(self._runtime.hass, repeat_s, self._on_repeat)

    @callback
    def _on_repeat(self, _now: datetime) -> None:
        self._repeat_unsub = None
        if not self.state.active:
            return
        self._runtime.on_leak_repeated(self._zone_id, self.state)
        self._arm_repeat()

    def _cancel_repeat(self) -> None:
        if self._repeat_unsub is not None:
            self._repeat_unsub()
            self._repeat_unsub = None
