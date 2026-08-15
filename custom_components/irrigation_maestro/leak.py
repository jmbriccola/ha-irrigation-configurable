"""One leak alarm per scope, from sources that may see the same event twice.

Source 1 is the valve's own sensor; source 2 is flow measured while every
managed valve reports closed, which only this component can check because only
it commanded the closure. On SONOFF SWV hardware they are the same physical
detection -- that valve's "moisture" sensor is an alarm derived from its
internal flow meter, not a ground probe -- so they converge into one state with
one notification. Which source noticed first is kept, because "the valve told
me" and "I measured it" are different diagnostic facts at equal alarm, and on
hardware without the firmware alarm only one of them can ever fire first.

A *scope* is a zone id, or HUB_SCOPE for water no zone can be blamed for. It is
the same key the unattributed bucket is organised by, and for the same reason:
a meter serving two zones cannot say which of them leaks, but it can say the
system does, and that alarm must exist. Keying leak detection by zone instead
would have left every shared-line-meter installation with no source 2 at all
while the documentation promised one.

Anything this module reports about source 1 has to be true for BOTH readings of
``moisture``: "the valve of zone X reports a leak", never "water detected on
the ground". On other hardware that device class really is a ground probe, and
either wording is false for half of all installations. That difference is not
only about wording: a ground probe under a sprinkler is wet every time its own
zone waters, so source 1 is gated on that zone's own valve reporting closed and
shares source 2's confirmation window. On SWV the gate costs nothing -- that
firmware only speaks while it is shut -- and on probe hardware it removes an
alarm on every single cycle.

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
    from .runtime import IrrigationRuntime, ZoneRuntime

#: The valve said so.
SOURCE_VALVE_SENSOR: Final = "valve_sensor"
#: We measured water moving while every managed valve reported closed.
SOURCE_NO_FLOW_CLOSED: Final = "no_flow_closed"

_STATE_LEAK: Final = "on"
_STATE_NO_LEAK: Final = "off"


@dataclass(frozen=True, slots=True)
class LeakState:
    """One scope's alarm. One alarm, however many sources agree."""

    active: bool = False
    since: datetime | None = None
    #: Which source raised it. Never overwritten by a later one.
    first_source: str | None = None
    sources: frozenset[str] = field(default_factory=frozenset)


class LeakDetector:
    """Watches one scope's sources and keeps a single alarm state.

    Resolved from that scope's own configuration and its own meter: a mixed
    installation where one zone has a leak sensor, another has only a meter and
    a third shares the line must behave correctly for each.

    Source 2 applies to every scope, because every scope can have a meter
    reporting for it. Source 1 applies to a zone scope only: a leak sensor
    belongs to a particular valve, and there is no hub-level equivalent to
    resolve -- so a HUB_SCOPE detector simply never subscribes to one.

    Memory only, deliberately. The confirmation window and the alarm both
    restart from nothing after a Home Assistant restart, which is the safe
    direction: a restart is not evidence that a leak is still running, and
    re-confirming costs five minutes of a condition that by definition
    persists. A leak still present is re-detected by whichever source saw it,
    including a sensor that is already reporting one when we start.
    """

    def __init__(self, runtime: IrrigationRuntime, scope: str) -> None:
        self._runtime = runtime
        self._scope = scope
        self.state = LeakState()
        #: Seconds of flow above the threshold, with every managed valve
        #: closed, that the meter actually MEASURED since the last reset.
        #: Accumulated seconds rather than the difference of two timestamps:
        #: the difference would silently count an outage as confirmation,
        #: which would raise an alarm from data nobody read.
        self._above_threshold_s = 0.0
        self._unsubs: list[CALLBACK_TYPE] = []
        self._repeat_unsub: CALLBACK_TYPE | None = None
        self._sensor_wake_unsub: CALLBACK_TYPE | None = None

    # Lifecycle --------------------------------------------------------------

    def start(self, *, has_meter: bool) -> None:
        """Re-attach both sources to the configuration as it stands now.

        Idempotent, and safe to call again after a configuration change: the
        subscriptions are rebuilt against whatever the zone declares now, while
        the alarm itself survives. An edit to an unrelated setting must not
        silently clear a live alarm, exactly as WaterAccountant.rebuild refuses
        to drop a ledger it did not have to touch. Nor does it restart a
        confirmation window in progress: source 1's elapsed time is derived
        from the entities' own ``last_changed``, never from a clock of ours
        that a rebuild would reset.

        A source that has been DE-CONFIGURED is a different matter, and this is
        the only place either can be noticed. An alarm is withdrawn by evidence
        that the water stopped, and that evidence arrives through the source
        itself -- so a source removed while its alarm stands leaves an alarm
        nothing can ever clear, repeating on its timer until Home Assistant
        restarts, and (from Task 8) capable of blocking every cycle under
        ``close_and_block``. Removing the source is the user's own statement,
        so it withdraws: see ``_evaluate_valve_sensor`` for source 1 and
        ``has_meter`` here for source 2.

        ``has_meter`` says whether any running ledger still reports for this
        scope, and must come from WaterAccountant.metered_scopes -- the
        accountant owns which meter serves whom, including the case that makes
        this worse than a plain removal: put a second zone behind a zone's
        meter and its scope becomes HUB_SCOPE, so a stale zone alarm and a
        fresh hub alarm would otherwise stand together for one physical leak.
        """
        self._unsubscribe_sources()
        zone = self._zone
        sensor = zone.config.leak_sensor if zone else None
        if zone is not None and sensor:
            # Truthiness, not ``is not None``: update_zone stores "" as a way
            # of clearing the key, and subscribing to that would bind a
            # listener to nothing. A HUB_SCOPE detector never gets here -- it
            # has no zone, so it has no leak sensor and no valve of its own.
            #
            # The valve matters as much as the sensor: source 1 only counts
            # while this zone's own valve reports closed, so a valve transition
            # can start or invalidate a confirmation window without the sensor
            # moving at all.
            self._unsubs.append(
                async_track_state_change_event(
                    self._runtime.hass, [sensor, zone.valve.entity_id], self._on_source_1_input
                )
            )
        # Judge source 1 from live state, whether or not it still exists. A
        # sensor ALREADY reporting a leak when we start would otherwise never
        # be noticed -- it has no further state change left to make, which is
        # the leak that began while Home Assistant was down -- and a sensor
        # just removed would never be withdrawn.
        self._evaluate_valve_sensor()
        if not has_meter:
            self._forget_flow()

    def stop(self) -> None:
        self._unsubscribe_sources()
        self._cancel_repeat()
        self._cancel_sensor_wake()

    def _unsubscribe_sources(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @property
    def _zone(self) -> ZoneRuntime | None:
        """The zone this scope names, or None for HUB_SCOPE."""
        return self._runtime.zones.get(self._scope)

    # Source 1: the valve's own sensor ----------------------------------------

    @callback
    def _on_source_1_input(self, _event: Event[EventStateChangedData]) -> None:
        self._evaluate_valve_sensor()

    def _evaluate_valve_sensor(self) -> None:
        """Re-judge source 1 from the current sensor and valve states.

        ``on`` raises, ``off`` withdraws, anything else says nothing --
        "unavailable" and "unknown" are not "no leak", and withdrawing the
        alarm on a sensor's silence would assert exactly that.

        A raise additionally needs THIS ZONE'S valve to report closed, and the
        pair to have stood that way for ``leak_confirm_s``. Deliberately this
        zone's valve and not every valve: all-closed would mute a legitimate
        SWV alarm on zone A merely because zone B happens to be watering, which
        is precisely when a seeping A is most worth knowing about. And
        deliberately confirmed rather than instant, because on hardware where
        ``moisture`` is a real ground probe the probe under a sprinkler is wet
        for the whole of its own zone's cycle.

        The elapsed time is read from the two entities' own ``last_changed``
        rather than a timer of ours, so it needs no state to keep honest: the
        window starts at whichever happened later, the sensor asserting or the
        valve closing. A cycle that ends with the probe still wet therefore
        starts counting at the close, not at the moment the probe went wet.
        After a restart both timestamps are the restore, so the window restarts
        -- the same safe direction as everything else here.
        """
        self._cancel_sensor_wake()
        zone = self._zone
        sensor = zone.config.leak_sensor if zone else None
        if zone is None or not sensor:
            # No sensor configured any more (or none ever, for a hub scope).
            # Withdrawn rather than merely unwatched: nothing else will ever
            # call this again for that source, so a bare return would strand an
            # alarm raised by a sensor the user has since removed. A no-op when
            # the source was not among the alarm's own.
            self._withdraw(SOURCE_VALVE_SENSOR)
            return
        state = self._runtime.hass.states.get(sensor)
        value = None if state is None else state.state
        if value == _STATE_NO_LEAK:
            self._withdraw(SOURCE_VALVE_SENSOR)
            return
        if state is None or value != _STATE_LEAK:
            return
        closed_since = self._valve_closed_since(zone)
        if closed_since is None:
            # Watering, travelling, or unreachable. Not evidence of a leak --
            # and not evidence against one either, so an alarm already raised
            # stands: a valve opening does not prove a leak stopped.
            return
        confirm_s = self._runtime.hub.leak_confirm_s
        elapsed_s = (dt_util.utcnow() - max(state.last_changed, closed_since)).total_seconds()
        if elapsed_s >= confirm_s:
            self._raise(SOURCE_VALVE_SENSOR)
            return
        # Nothing else will fire when the window merely runs out, so ask to be
        # woken exactly then and judge again from live state.
        self._sensor_wake_unsub = async_call_later(
            self._runtime.hass, confirm_s - elapsed_s, self._on_sensor_wake
        )

    def _valve_closed_since(self, zone: ZoneRuntime) -> datetime | None:
        """When this zone's valve last became closed, or None if it is not.

        ``is_closed``, so an uncertain valve answers None: valves.py treats a
        travelling or unavailable valve as busy and never as free, and a leak
        alarm must not be confirmed against a position nobody can vouch for.
        """
        if not zone.valve.is_closed:
            return None
        state = self._runtime.hass.states.get(zone.valve.entity_id)
        return None if state is None else state.last_changed

    @callback
    def _on_sensor_wake(self, _now: datetime) -> None:
        self._sensor_wake_unsub = None
        self._evaluate_valve_sensor()

    def _cancel_sensor_wake(self) -> None:
        if self._sensor_wake_unsub is not None:
            self._sensor_wake_unsub()
            self._sensor_wake_unsub = None

    # Source 2: flow with everything shut -------------------------------------

    def note_flow(
        self, *, liters: float, measured_s: float, elapsed_s: float, all_closed: bool
    ) -> None:
        """Feed source 2 with one closed interval of this scope's meter.

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

        Every managed valve, not just this scope's: water moving anywhere in
        the system while one zone waters is that zone's water until proven
        otherwise, and this source exists precisely to judge the system at
        rest. Source 1 is the one that narrows to a single valve, because it
        has a single valve's own report to go on.

        Litres over measured seconds, never the sample's ``lpm``: that field
        is the instantaneous reading opening the NEXT interval, and flow.py
        reports a known-unit meter that has gone unavailable as ``lpm=0.0``,
        which an alarm must not read as "no water passed". The pair used here
        cannot say that -- an unmeasured interval carries no seconds at all.

        The verdicts, and why each is what it is:

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

    def _forget_flow(self) -> None:
        """No ledger reports for this scope any more, so source 2 has gone mute.

        The counterpart of the sensor withdrawal in ``_evaluate_valve_sensor``,
        and for the same reason: ``note_flow`` is the only path that can ever
        withdraw ``no_flow_closed``, so a meter removed or repointed away would
        otherwise leave that source asserted for good.

        Deliberately different from a meter that is merely UNREADABLE, which
        holds the alarm because absence of evidence is not evidence of absence.
        Here the user has removed the source: there is no longer any mechanism
        that could ever produce the evidence, and an alarm that can never clear
        is worse than one cleared a little eagerly.
        """
        self._above_threshold_s = 0.0
        self._withdraw(SOURCE_NO_FLOW_CLOSED)

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
        self._runtime.on_leak_raised(self._scope, self.state)

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
        cleared = self.state
        self.state = LeakState()
        self._cancel_repeat()
        # The state as it was, not the empty one that replaced it: an
        # automation (and Task 8's clearing notice) has to be able to say what
        # kind of leak just ended, and "first_source: null, sources: []" tells
        # it nothing at all.
        self._runtime.on_leak_cleared(self._scope, cleared)

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
        self._runtime.on_leak_repeated(self._scope, self.state)
        self._arm_repeat()

    def _cancel_repeat(self) -> None:
        if self._repeat_unsub is not None:
            self._repeat_unsub()
            self._repeat_unsub = None
