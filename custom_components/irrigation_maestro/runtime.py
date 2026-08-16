"""Per-entry runtime: configuration, triggers, evaluation and the session.

This is the owner object stored in ``entry.runtime_data``. Configuration
changes are applied here in place — never by reloading the entry — so a
running cycle is never aborted by an options edit (§5).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import replace
from datetime import datetime, timedelta
from functools import partial
from typing import Any, Final

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, State, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers import sun
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_time,
    async_track_state_change_event,
    async_track_time_change,
)
from homeassistant.util import dt as dt_util

from .accounting import WaterAccountant
from .const import (
    CONF_LEAK_ACTION,
    DEGRADED_LEAK_EVIDENCE_UNRESOLVED,
    DEGRADED_LEAK_NEVER_OBSERVABLE,
    DOMAIN,
    LEAK_ACTION_CLOSE,
    LEAK_ACTION_CLOSE_AND_BLOCK,
    LEAK_ACTIONS,
    LEAK_WATCH_NONE,
    LEAK_WATCH_SYSTEM,
    LEAK_WATCH_ZONE,
    SUBENTRY_TYPE_ZONE,
)
from .engine.curves import CurveKind, curve_value
from .engine.evaluate import evaluate_session
from .engine.metering import HUB_SCOPE
from .engine.model import SessionEvaluation, SkipReason
from .engine.planner import PlannedRun, build_session_plan
from .engine.scheduling import split_soak
from .flow import CANONICAL_UNIT, FlowSensorReader
from .leak import SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR, LeakDetector, LeakState
from .models import CycleConfig, HubConfig, ZoneConfig
from .notify import (
    EVENT_ANOMALY,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_CONSUMPTION_BUDGET,
    EVENT_INTERRUPTED,
    EVENT_LEAK,
    EVENT_SENTINEL,
    EVENT_SESSION_OVERRUN,
    EVENT_SKIPPED,
    EVENT_WATCHDOG,
    Notifier,
    evaluate_notifications,
)
from .sentinel import Sentinel
from .session import (
    REASON_LEAK,
    REASON_MANUAL_STOP_BLOCK,
    REASON_NO_WATER_SUPPLY,
    RESULT_CANCELLED,
    RESULT_COMPLETED,
    RESULT_INTERRUPTED,
    RESULT_SKIPPED,
    SessionRunner,
)
from .storage import RuntimeState
from .valves import ValveController
from .watchdog import Watchdog
from .weather_client import WeatherClient

_LOGGER = logging.getLogger(__name__)

SIGNAL_UPDATE = f"{DOMAIN}_update"
SIGNAL_ZONES_CHANGED = f"{DOMAIN}_zones_changed"

# Fallback expiry only: entries are normally retired by their own state
# transition (see SessionRunner._on_valve_change). Keep it short so an entry
# whose command never actuated cannot mask a later manual intervention.
_LEDGER_TTL_S = 60
_EVALUATION_REUSE_S = 120
#: Notification titles. The raise and the reminder share one, so a phone that
#: groups by title groups a standing condition with its own reminders.
_LEAK_TITLE = "🚨 Irrigation: possible leak"
_LEAK_CLEARED_TITLE = "💧 Irrigation: leak condition cleared"
#: How each source reads in a message. Deliberately descriptions of what was
#: OBSERVED, not of what it means: "the valve's own sensor" is true whether
#: that sensor is a ground probe or the SWV's internal flow alarm.
_LEAK_SOURCE_PHRASES = {
    SOURCE_VALVE_SENSOR: "the valve's own sensor",
    SOURCE_NO_FLOW_CLOSED: "flow measured with every valve closed",
}
#: A leak sensor's two real readings. What each MEANS for the alarm is
#: leak.py's business and stays there; here they answer two questions of the
#: observation window's own -- has this sensor spoken at all, and was the last
#: thing it said the alarm. Anything else ("unknown" from a device that has
#: paired and not yet reported, "unavailable" from a flat battery) is a sensor
#: that exists without reporting, which is exactly what the window waits for.
_LEAK_SENSOR_ALARM = "on"
_LEAK_SENSOR_CLEAR = "off"
_LEAK_SENSOR_REPORTING = frozenset({_LEAK_SENSOR_ALARM, _LEAK_SENSOR_CLEAR})
#: How often to look again at a scope whose observation window has run out but
#: whose detector is still confirming. The meter's own sample cadence, because
#: that is the granularity at which source 2's answer can change at all; a
#: faster poll would read the same numbers. Runs only while evidence is
#: accumulating, which on a healthy installation is post-cycle drainage and
#: nothing else -- with one exception worth knowing before you go looking for
#: it: a meter that dies with above-threshold seconds on its books holds that
#: evidence for ever, so this is the one timer here that does not terminate on
#: its own. It ends when the meter reads again, when the alarm raises, or at
#: shutdown. Cheap by construction (one timer, one state read per meter), and
#: the alternative is concluding "no problem" from evidence nobody finished.
_LEAK_CONFIRMING_RECHECK_S = 30.0
#: The least observation any scope must collect before it may assert that there
#: is no problem, whatever ``leak_confirm_s`` is set to. Zero was chosen to mean
#: "do not wait before believing an alarm"; without this floor it silently also
#: meant "do not wait before asserting the absence of one", which is a different
#: promise and one nobody made -- ``0.0 < 0`` is False, so the window closed on
#: the first bookkeeping run of setup and a zone whose leak sensor had never
#: reported and whose meter was dead published ``off`` with nothing behind it.
#: The two questions are separated here rather than by refusing the setting,
#: because the setting is right and only its second reading was wrong.
#: Thirty seconds is the meter's own sample cadence -- the granularity at which
#: source 2's answer can change at all -- so it is the shortest interval in
#: which either source could have said anything.
_LEAK_MIN_OBSERVATION_S = 30.0
#: The Repairs id prefix every scope's leak alarm carries, and the ids that
#: share it WITHOUT naming a scope. ``_reconcile_leak_issues`` sweeps by prefix
#: -- it has to, because the scope of a zone deleted while the entry was
#: unloaded is unknowable from the configuration that remains -- and a
#: non-scope id is indistinguishable from a scope's by shape alone. Anything
#: new that starts with the prefix must be named here or it will be swept.
#: How each start-gate reads in a message, keyed by the reason
#: ``SessionRunner.start_blocks`` returns. Present tense and no undertaking
#: about how long it lasts, like every other note this module builds.
#:
#: One phrase per reason, and a test asserts this covers ``START_BLOCK_RESULTS``
#: exactly -- which is what makes the named-reason design safe to extend. A new
#: gate that reaches a user as a raw key would be the kind of defect nobody
#: reports and everybody sees.
_START_BLOCK_PHRASES: Final[dict[str, str]] = {
    REASON_MANUAL_STOP_BLOCK: "watering was stopped by hand a short while ago",
    REASON_LEAK: "a leak alarm is standing",
    REASON_NO_WATER_SUPPLY: "the water supply is reported missing",
}
_LEAK_ISSUE_PREFIX = "leak_"
_LEAK_ACTION_ISSUE_ID = "leak_action_invalid"
_LEAK_NON_SCOPE_ISSUE_IDS = frozenset({_LEAK_ACTION_ISSUE_ID})
#: How long a scope may go without being able to conclude anything before the
#: zone says so out loud. Counted in IDLE seconds only -- a zone that is
#: watering cannot conclude and is not supposed to -- so no session length can
#: reach it. An hour is twelve times the confirmation window and far beyond any
#: plausible start-up: a Zigbee re-pair, a cloud integration's rate-limit
#: backoff and a restart are all minutes. Long enough that an ordinary slow
#: boot never trips it, short enough that a user who notices a silent entity in
#: the morning finds the reason beside it.
_LEAK_STALL_NOTICE_S = 3600.0
#: The reading of a ``device_class: problem`` supply sensor that means the
#: water is GONE. "on" is the problem, which is the opposite of how the
#: entity's name reads, and the mistake everyone makes on the first attempt.
_SUPPLY_MISSING = "on"
#: And the reading that means it is there. Named separately, and checked
#: for explicitly, because "not missing" is a third thing: an unavailable
#: sensor is neither.
_SUPPLY_PRESENT = "off"
_SKIP_NOTICE_DEBOUNCE_S = 5
_TEMP_TRACK_MINUTES = 10
_INDEFINITE = datetime(2999, 1, 1, tzinfo=dt_util.UTC)


def _declared_unit(state: State | None) -> str | None:
    """The unit an entity declares, or None if it declares (or is) nothing."""
    return None if state is None else state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)


class ZoneRuntime:
    """A zone's live objects: parsed config + valve controller."""

    def __init__(self, config: ZoneConfig, valve: ValveController) -> None:
        self.config = config
        self.valve = valve


class IrrigationRuntime:
    """Everything alive for one hub config entry."""

    def __init__(self, hass: Any, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.hub = HubConfig.from_options(dict(entry.options))
        self.state = RuntimeState(hass, entry.entry_id)
        self.zones: dict[str, ZoneRuntime] = {}
        #: The name of every zone in the configuration, plus the names of those
        #: removed by the MOST RECENT rebuild and no earlier one. A notice about
        #: a zone's removal is written after ``_build_zones`` has already
        #: forgotten it -- an alarm cleared BY the deletion, a supply notice
        #: taken down with it -- and "01J7…: the leak condition has cleared" is
        #: not a sentence to send anyone. Bounded by construction: it is rebuilt
        #: from the previous set each time, so it never accumulates.
        self._zone_names: dict[str, str] = {}
        self.master_controller: ValveController | None = None
        self.notifier = Notifier(hass, lambda: self.hub.notifications)
        self.weather = WeatherClient(hass, lambda: self.hub)
        self.session = SessionRunner(self)
        self.watchdog = Watchdog(self)
        self.sentinel = Sentinel(self)
        self.accountant = WaterAccountant(self)
        self._leak_detectors: dict[str, LeakDetector] = {}
        #: Seconds each scope has been OBSERVABLE -- time in which one of its
        #: sources could have concluded something -- closed intervals only.
        #: Not a second copy of the alarm's own clock: this one answers "have
        #: we watched for long enough to be entitled to say no", which nothing
        #: else records, because the detector's state cannot distinguish "no
        #: leak" from "not yet looked". See ``leak_state_established``.
        self._leak_observed_s: dict[str, float] = {}
        #: When the currently open observable interval began, per scope, or
        #: absent while that scope cannot observe anything.
        self._leak_observing_since: dict[str, datetime] = {}
        #: The last ``on``/``off`` each CONFIGURED LEAK SENSOR reported, and
        #: nothing else -- the same subscription also carries every managed
        #: valve, and a switch-backed valve publishes ``on``/``off`` too, so
        #: the write is filtered and the dict is pruned to the sensors that are
        #: configured now. Held rather than re-read, because an assertion that
        #: goes silent is still an assertion and the state machine keeps no
        #: history of its own. Only ever consulted where holding WITHHOLDS: see
        #: ``_leak_can_observe`` for the half that is read live instead.
        self._leak_sensor_reading: dict[str, str] = {}
        #: Which source entities each scope's window was earned against, so
        #: that changing the set drops the credit: the window belongs to the
        #: sources that served it, not to the scope's name.
        self._leak_source_ids: dict[str, frozenset[str]] = {}
        #: Scopes whose window has been served. Latched, so a confirmation
        #: window starting later cannot take a settled answer back.
        self._leak_observation_done: set[str] = set()
        #: Idle seconds each unsettled scope has spent unable to conclude
        #: anything, and the open interval of the same, so that a refusal that
        #: lasts can be reported rather than merely endured. Idle only: a zone
        #: that is watering cannot conclude and is not meant to.
        self._leak_stalled_s: dict[str, float] = {}
        self._leak_stalled_since: dict[str, datetime] = {}
        self._leak_observation_unsub: CALLBACK_TYPE | None = None
        self._leak_source_unsub: CALLBACK_TYPE | None = None
        #: When each managed valve last became unable to say where it is, for
        #: as long as it still cannot. Per VALVE and not per scope, because the
        #: cause is one entity while the cost is the whole installation:
        #: ``all_valves_closed()`` is strict across every managed valve plus the
        #: master, so one flat battery or one cloud integration in backoff
        #: freezes source 2 for EVERY meter-backed scope at once. Nothing else
        #: records it, and until it did, the only symptom was a degraded badge
        #: an hour later on a surface the hub scope does not have.
        self._valve_unreported_since: dict[str, datetime] = {}
        #: Zones whose outage has been ANNOUNCED -- confirmed, notified and
        #: carrying a repair notice. Memory only, and edge detection only:
        #: it decides whether a transition still has to be said out loud,
        #: never whether a cycle may start. That question is answered from
        #: live state every time it is asked.
        self._supply_announced: set[str] = set()
        self._supply_tracker_unsub: CALLBACK_TYPE | None = None
        #: One per zone whose window is running: nothing else fires when a
        #: confirmation window merely runs out.
        self._supply_wake_unsubs: dict[str, CALLBACK_TYPE] = {}
        self._session_lock = asyncio.Lock()
        self._ledger: dict[tuple[str, str], list[datetime]] = {}
        self._trigger_unsubs: list[CALLBACK_TYPE] = []
        self._tracker_unsubs: list[CALLBACK_TYPE] = []
        self._flow_tracker_unsub: CALLBACK_TYPE | None = None
        self._skip_notices: dict[str, list[str]] = {}
        self._skip_flush_unsub: CALLBACK_TYPE | None = None
        self._last_evaluation: tuple[datetime, SessionEvaluation] | None = None
        self._budget_notified_period: str | None = None

    # Setup / teardown -------------------------------------------------------

    async def async_setup(self) -> None:
        await self.state.async_load()
        self._build_zones()
        # v2: the watering marker is keyed per program. Idempotent — already
        # migrated keys pass through untouched.
        self.state.migrate_markers(
            {
                zone_id: [cycle.cycle_id for cycle in zone.config.cycles]
                for zone_id, zone in self.zones.items()
            }
        )
        # 3.3.0: the standalone monthly counter becomes an opening balance,
        # once. A migration that has already run reports nothing dropped and
        # nothing seeded, so neither the write nor the notice repeats on a
        # later setup. The save is scheduled on the removal alone -- the fact
        # of having migrated must survive a restart on its own, rather than by
        # luck of some unrelated write landing first -- while the notice is
        # gated on a balance actually having been carried: every 3.2.x install
        # has the key, and telling a user who never had a budget that their
        # total was carried forward would state a fact that did not happen.
        migrated = self.state.migrate_consumption(dt_util.now().date())
        if migrated.dropped:
            self.state.schedule_save()
        if migrated.seeded:
            self.report_consumption_history_restarted()
        self._schedule_triggers()
        self._start_trackers()
        self.accountant.start()
        # After the accountant, which owns which meter serves which scope. No
        # sample can be missed in between: every call from here to the end of
        # setup is synchronous, and a ledger publishes nothing until its first
        # tick or state event.
        self._rebuild_leak_detectors()
        self._restore_supply_announcements()
        self._track_water_supply_sensors()
        self.watchdog.start()
        self.sentinel.start()
        self._refresh_notification_issues()
        self._report_rescaled_flow_meters()
        self._report_invalid_leak_action()

    async def async_shutdown(self) -> None:
        """Entry unload: stop everything and leave the valves closed."""
        if self.session.active:
            await self.session.async_stop_all(reason="shutdown", manual=False)
        self.watchdog.stop()
        self.sentinel.stop()
        self._clear_triggers()
        for unsub in self._tracker_unsubs:
            unsub()
        self._tracker_unsubs.clear()
        if self._flow_tracker_unsub is not None:
            self._flow_tracker_unsub()
            self._flow_tracker_unsub = None
        self.accountant.stop()
        for detector in self._leak_detectors.values():
            detector.stop()
        self._leak_detectors.clear()
        self._leak_observed_s.clear()
        self._leak_observing_since.clear()
        self._leak_stalled_s.clear()
        self._leak_stalled_since.clear()
        self._leak_sensor_reading.clear()
        self._leak_source_ids.clear()
        self._leak_observation_done.clear()
        self._valve_unreported_since.clear()
        self._cancel_leak_observation_wake()
        if self._leak_source_unsub is not None:
            self._leak_source_unsub()
            self._leak_source_unsub = None
        if self._supply_tracker_unsub is not None:
            self._supply_tracker_unsub()
            self._supply_tracker_unsub = None
        self._cancel_supply_wakes()
        if self._skip_flush_unsub is not None:
            self._skip_flush_unsub()
            self._skip_flush_unsub = None
        await self.state.async_save()

    def _build_zones(self) -> None:
        zones: dict[str, ZoneRuntime] = {}
        for subentry in self.entry.subentries.values():
            if subentry.subentry_type != SUBENTRY_TYPE_ZONE:
                continue
            config = ZoneConfig.from_subentry(
                subentry.subentry_id,
                dict(subentry.data),
                templates=self.hub.curve_templates,
            )
            zones[config.zone_id] = ZoneRuntime(
                config, ValveController(self.hass, config.valve_entity)
            )
        # The names as they stood BEFORE this rebuild, kept for exactly one
        # rebuild: everything that reports a zone's REMOVAL runs after this
        # line, by which point self.zones can no longer name it.
        self._zone_names = {
            **{zone_id: zone.config.name for zone_id, zone in self.zones.items()},
            **{zone_id: zone.config.name for zone_id, zone in zones.items()},
        }
        self.zones = zones
        self.master_controller = (
            ValveController(self.hass, self.hub.master_valve) if self.hub.master_valve else None
        )

    async def async_config_updated(self) -> None:
        """Apply config changes in place — never reload mid-cycle (§5)."""
        old_zone_ids = set(self.zones)
        old_cycles = {
            zone_id: {cycle.cycle_id for cycle in zone.config.cycles}
            for zone_id, zone in self.zones.items()
        }
        self.hub = HubConfig.from_options(dict(self.entry.options))
        self._build_zones()
        removed = old_zone_ids - set(self.zones)
        for zone_id in removed:
            if zone_id in self.session.active_runs:
                await self.session.async_stop_all(reason="zone_removed", manual=False)
            self.state.drop_zone(zone_id)
        self._schedule_triggers()
        self._track_flow_sensors()  # a repointed or new meter, watched at once
        # After _track_flow_sensors, which rebuilds the ledgers: the detectors
        # ask the accountant which scopes still have a meter, and asking before
        # would answer from the configuration that has just been replaced.
        self._rebuild_leak_detectors()
        self._track_water_supply_sensors()
        self.sentinel.start()  # re-arm at the (possibly new) sentinel time
        self.state.schedule_save()
        # Signal the platforms to add/remove entities when the zone set OR any
        # zone's cycle set changed (new/removed cycle => new/removed switch),
        # so a reconfigure needs no reload.
        cycles_changed = any(
            old_cycles.get(zone_id, set()) != {cycle.cycle_id for cycle in zone.config.cycles}
            for zone_id, zone in self.zones.items()
        )
        self._refresh_notification_issues()
        self._report_rescaled_flow_meters()
        self._report_invalid_leak_action()
        if removed or (set(self.zones) - old_zone_ids) or cycles_changed:
            async_dispatcher_send(self.hass, SIGNAL_ZONES_CHANGED, self.entry.entry_id)
        self.dispatch_update()

    # Introspection ------------------------------------------------------------

    @property
    def last_evaluation(self) -> SessionEvaluation | None:
        """The most recent engine evaluation, if any (hub sensors)."""
        return None if self._last_evaluation is None else self._last_evaluation[1]

    @property
    def zone_ids(self) -> list[str]:
        return list(self.zones)

    def zone_configs(self) -> list[ZoneConfig]:
        return [zone.config for zone in self.zones.values()]

    def managed_valve_entities(self) -> list[str]:
        entities = [zone.valve.entity_id for zone in self.zones.values()]
        if self.hub.master_valve:
            entities.append(self.hub.master_valve)
        return entities

    def all_valve_controllers(self) -> list[ValveController]:
        controllers = [zone.valve for zone in self.zones.values()]
        if self.master_controller is not None:
            controllers.append(self.master_controller)
        return controllers

    def resolved_meter_entity(self, zone: ZoneConfig) -> str | None:
        """The entity id that feeds this zone's water, or None if none does.

        The zone's own meter if it has one, else the hub's shared line meter,
        else no meter at all. The single definition of "which meter serves
        this zone" -- every caller that needs the entity id, or just needs to
        know whether one resolves, goes through this instead of repeating the
        fallback rule.

        Truthiness, not ``is not None``: update_zone writes flow_sensor
        unconditionally, so an empty string is a reachable way of saying "no
        meter". Reading it as one would suppress the fallback to the line
        meter for a zone whose meter was cleared.
        """
        return zone.flow_sensor or self.hub.line_flow_sensor or None

    def flow_reader_for(self, zone: ZoneRuntime) -> FlowSensorReader | None:
        """A reader for whichever meter serves this zone, with its own override.

        The override that applies belongs to the sensor being read: a zone
        falling back to the shared line meter takes the hub's override, not its
        own — its own describes a sensor it does not have. Which entity that is
        resolves through resolved_meter_entity; this only has to pick the
        matching override once that entity is known.
        """
        entity_id = self.resolved_meter_entity(zone.config)
        if entity_id is None:
            return None
        if zone.config.flow_sensor:
            return FlowSensorReader(self.hass, entity_id, zone.config.flow_sensor_unit)
        return FlowSensorReader(self.hass, entity_id, self.hub.line_flow_sensor_unit)

    def zone_has_flow_meter(self, zone: ZoneConfig) -> bool:
        return self.resolved_meter_entity(zone) is not None

    def zone_flow_meter_usable(self, zone: ZoneRuntime) -> bool:
        """Is there a meter AND can its unit be determined right now?

        Deliberately separate from zone_has_flow_meter, which is configuration
        only: this one reads live state, so it belongs at plan time and in the
        zone's declared status, not in the services that create a volume curve
        (a momentarily unavailable sensor must not make an edit fail).
        """
        reader = self.flow_reader_for(zone)
        return reader is not None and reader.read().unit_known

    def expected_flow_range(self) -> tuple[float, float] | None:
        """Expected line flow = Σ nominal flows of the open zones ± tolerance."""
        nominals: list[tuple[float, float]] = []
        for zone in self.zones.values():
            if zone.valve.is_open:
                if zone.config.nominal_flow_lpm is None:
                    return None  # can't judge the range without every nominal
                nominals.append((zone.config.nominal_flow_lpm, zone.config.flow_tolerance_pct))
        if not nominals:
            return None
        total = sum(nominal for nominal, _ in nominals)
        tolerance = max(tol for _, tol in nominals) / 100
        return (total * (1 - tolerance), total * (1 + tolerance))

    def manual_block_active(self) -> bool:
        stopped_at = self.state.manual_stop_at
        if stopped_at is None:
            return False
        return dt_util.utcnow() - stopped_at < timedelta(minutes=self.hub.manual_block_min)

    def zone_status(self, zone_id: str) -> str:
        active = self.session.active_runs.get(zone_id)
        if active is not None:
            # Map internal phases onto the card-contract state set:
            # waiting/settling are pre-watering queue states; opening/closing
            # bracket the actual watering.
            if active.phase in ("watering", "opening", "closing"):
                return "watering"
            if active.phase in ("waiting", "settling"):
                return "queued"
            return active.phase  # soaking
        if any(segment_zone == zone_id for segment_zone in self.session.queued_zone_ids):
            queued = [
                segment
                for segment in self.session.queue_snapshot()
                if segment["zone_id"] == zone_id
            ]
            return "soaking" if queued and self._is_soak_wait(zone_id) else "queued"
        if not self.state.zone_enabled(zone_id):
            return "disabled"
        now = dt_util.utcnow()
        suspended = self.state.suspended_until(zone_id)
        if suspended is not None and suspended > now:
            return "suspended"
        paused = self.state.paused_until(zone_id) or self.state.paused_until(None)
        if paused is not None and paused > now:
            return "paused"
        return "idle"

    def _is_soak_wait(self, zone_id: str) -> bool:
        return any(
            segment.zone_id == zone_id and segment.segment_index > 0
            for segment in self.session._queue
        )

    # Command ledger (distinguishes our commands from manual intervention) ------

    def ledger_expect(self, entity_id: str, action: str) -> None:
        self._ledger.setdefault((entity_id, action), []).append(dt_util.utcnow())

    def ledger_consume(self, entity_id: str, action: str) -> bool:
        entries = self._ledger.get((entity_id, action), [])
        cutoff = dt_util.utcnow() - timedelta(seconds=_LEDGER_TTL_S)
        fresh = [entry for entry in entries if entry >= cutoff]
        if not fresh:
            self._ledger.pop((entity_id, action), None)
            return False
        fresh.pop(0)
        self._ledger[(entity_id, action)] = fresh
        return True

    def ledger_pending(self, entity_id: str, action: str) -> bool:
        """Is a command of ours still waiting for the transition that retires it?

        Read-only, and deliberately not folded into ``ledger_expect``: a second
        entry is correct whenever a second command will produce a second
        transition. It is wrong only where one transition can retire at most
        one entry however many commands were sent -- re-closing a valve that
        two alarms both want closed -- and that caller asks here first.
        """
        cutoff = dt_util.utcnow() - timedelta(seconds=_LEDGER_TTL_S)
        return any(entry >= cutoff for entry in self._ledger.get((entity_id, action), []))

    def ledger_discard(self, entity_id: str, action: str) -> None:
        """Drop pending entries for a command that never actuated, so they
        cannot absorb a genuine manual transition later."""
        self._ledger.pop((entity_id, action), None)

    async def async_close_all_valves(self) -> None:
        """Close every managed valve, ledger-registered (not 'manual')."""
        for controller in self.all_valve_controllers():
            if not controller.is_closed:
                self.ledger_expect(controller.entity_id, "close")
                await controller.async_close()

    async def async_sleep(self, seconds: float) -> None:
        future: asyncio.Future[None] = self.hass.loop.create_future()

        @callback
        def _done(_now: Any) -> None:
            if not future.done():
                future.set_result(None)

        async_call_later(self.hass, seconds, _done)
        await future

    # Triggers -------------------------------------------------------------------

    def _clear_triggers(self) -> None:
        for unsub in self._trigger_unsubs:
            unsub()
        self._trigger_unsubs.clear()

    def _schedule_triggers(self) -> None:
        self._clear_triggers()
        for zone in self.zones.values():
            for cycle in zone.config.cycles:
                self._schedule_cycle(zone.config.zone_id, cycle)

    def _schedule_cycle(self, zone_id: str, cycle: CycleConfig) -> None:
        if cycle.trigger.kind == "time" and cycle.trigger.at is not None:
            at = cycle.trigger.at

            @callback
            def _fire(
                _now: datetime, zone_id: str = zone_id, cycle_id: str = cycle.cycle_id
            ) -> None:
                self._create_trigger_task(zone_id, cycle_id)

            self._trigger_unsubs.append(
                async_track_time_change(self.hass, _fire, hour=at.hour, minute=at.minute, second=0)
            )
        elif cycle.trigger.kind == "sun" and cycle.trigger.event is not None:
            self._schedule_sun_cycle(zone_id, cycle)

    def _schedule_sun_cycle(self, zone_id: str, cycle: CycleConfig) -> None:
        assert cycle.trigger.event is not None
        next_fire = sun.get_astral_event_next(
            self.hass, cycle.trigger.event, offset=timedelta(seconds=cycle.trigger.offset_s)
        )

        @callback
        def _fire(_now: datetime) -> None:
            self._create_trigger_task(zone_id, cycle.cycle_id)
            # Re-arm for the next day (a fresh astral computation each time).
            if zone_id in self.zones and self.zones[zone_id].config.cycle(cycle.cycle_id):
                self._schedule_sun_cycle(zone_id, cycle)

        self._trigger_unsubs.append(async_track_point_in_time(self.hass, _fire, next_fire))

    def _create_trigger_task(self, zone_id: str, cycle_id: str) -> None:
        self.entry.async_create_background_task(
            self.hass,
            self.async_handle_trigger(zone_id, cycle_id),
            name=f"irrigation_maestro_trigger_{zone_id}_{cycle_id}",
        )

    # Evaluation -------------------------------------------------------------------

    async def async_evaluate(self) -> SessionEvaluation:
        """One engine evaluation from a fresh (or policy-stale) snapshot."""
        now = dt_util.utcnow()
        if self._last_evaluation is not None and now - self._last_evaluation[0] < timedelta(
            seconds=_EVALUATION_REUSE_S
        ):
            return self._last_evaluation[1]

        local_now = dt_util.now()
        today = local_now.date()
        self.state.prune(today)
        snapshot = await self.weather.async_snapshot(now)
        temp_d3, temp_d2, temp_d1, temp_today = self.state.temps_for(today)
        rain_today, rain_d1, rain_d2, rain_d3 = self.state.rains_for(today)

        if snapshot is None:
            self._report_weather_unavailable()
            if self.hub.stale_weather_policy == "fail_closed":
                evaluation = SessionEvaluation(
                    weighted_temp=None,
                    forecast_credit=0.0,
                    water_budget=0.0,
                    skip_threshold=self.hub.engine_params.threshold_base_mm,
                    skip_reason=SkipReason.WEATHER_UNAVAILABLE,
                    stale_weather=True,
                )
            else:
                # Fail-open: curve duration from the last known weighted
                # temperature (observed history only), budget = 0.
                evaluation = evaluate_session(
                    self.hub.engine_params,
                    now=local_now,
                    season_months=self.hub.engine_params.season_months,
                    condition=None,
                    current_temp=None,
                    wind_kmh=None,
                    temp_d3=temp_d3,
                    temp_d2=temp_d2,
                    temp_d1=temp_d1,
                    temp_today_observed=temp_today,
                    temp_today_forecast_max=None,
                    temp_tomorrow_max=None,
                    rain_committed_today=0.0,
                    rain_staging_mm=0.0,
                    rain_d1=0.0,
                    rain_d2=0.0,
                    rain_d3=0.0,
                    forecast_0_24=0.0,
                    forecast_24_48=0.0,
                    stale_weather=True,
                )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "weather_unavailable")
            evaluation = evaluate_session(
                self.hub.engine_params,
                now=local_now,
                season_months=self.hub.engine_params.season_months,
                condition=snapshot.condition,
                current_temp=snapshot.current_temp,
                wind_kmh=snapshot.wind_kmh,
                temp_d3=temp_d3,
                temp_d2=temp_d2,
                temp_d1=temp_d1,
                temp_today_observed=temp_today,
                temp_today_forecast_max=snapshot.today_forecast_max,
                temp_tomorrow_max=snapshot.tomorrow_max,
                rain_committed_today=rain_today,
                rain_staging_mm=self.state.staging_mm if self.hub.rain_sensor is None else 0.0,
                rain_d1=rain_d1,
                rain_d2=rain_d2,
                rain_d3=rain_d3,
                forecast_0_24=snapshot.rain_0_24,
                forecast_24_48=snapshot.rain_24_48,
                stale_weather=snapshot.stale,
            )
        self._last_evaluation = (now, evaluation)
        self.dispatch_update()
        return evaluation

    def consumption_used_liters(self) -> float:
        """Attributed litres this period: the carried balance plus the daily sum.

        Derived, never stored: one number for the water, so a per-zone total and
        the budget cannot drift apart. Unattributed water is excluded on
        purpose -- letting a leak into the budget would let it suspend
        irrigation, the right consequence from the wrong cause.
        """
        today = dt_util.now().date()
        period_start = today.replace(day=1)
        return self.state.carried_over_for(period_start) + self.state.water_for_period(
            period_start, today
        )

    def _consumption_factor(self) -> tuple[float, bool]:
        """(duration_factor, suspend_all) from the consumption budget."""
        budget = self.hub.consumption_budget_liters
        used = self.consumption_used_liters()
        if budget is None or used < budget:
            return 1.0, False
        self._notify_budget_exceeded_once()
        if self.hub.consumption_action == "reduce":
            return self.hub.consumption_reduce_pct / 100, False
        if self.hub.consumption_action == "suspend":
            return 1.0, True
        return 1.0, False

    def _notify_budget_exceeded_once(self) -> None:
        used = self.consumption_used_liters()
        period = dt_util.now().date().replace(day=1).isoformat()
        if self._budget_notified_period == period:
            return
        self._budget_notified_period = period
        self.fire_event(EVENT_CONSUMPTION_BUDGET, {"liters": used})
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_CONSUMPTION_BUDGET,
                title="💧 Irrigation Maestro",
                message=(
                    f"Monthly water budget exceeded ({used:.0f} L used). "
                    f"Configured action: {self.hub.consumption_action}."
                ),
            ),
            name="irrigation_maestro_budget_notice",
        )

    def _zone_spec(self, zone: ZoneRuntime, cycles: list[CycleConfig]) -> Any:
        dt_util.utcnow()
        config = zone.config
        return config.to_spec(
            enabled=self.state.zone_enabled(config.zone_id),
            cycles=tuple(
                cycle.to_spec(
                    enabled=self.state.cycle_enabled(config.zone_id, cycle.cycle_id),
                    last_completed=self.state.last_completed(config.zone_id, cycle.cycle_id),
                )
                for cycle in cycles
            ),
            suspended_until=self.state.suspended_until(config.zone_id),
            paused_until=self.state.paused_until(config.zone_id) or self.state.paused_until(None),
            skip_today=self.state.skip_today_date(config.zone_id) == dt_util.now().date(),
            has_flow_meter=self.zone_flow_meter_usable(zone),
        )

    # Session entry points ----------------------------------------------------------

    async def async_handle_trigger(self, zone_id: str, cycle_id: str) -> None:
        """A scheduled cycle trigger fired."""
        zone = self.zones.get(zone_id)
        cycle = zone.config.cycle(cycle_id) if zone else None
        if zone is None or cycle is None:
            return
        async with self._session_lock:
            evaluation, factor, suspend_all = await self._session_evaluation()
            if suspend_all:
                evaluation = replace(evaluation, skip_reason=SkipReason.CONSUMPTION_BUDGET)
            plan = build_session_plan(
                self.hub.engine_params,
                evaluation,
                [self._zone_spec(zone, [cycle])],
                now=dt_util.now(),
                duration_factor=factor,
            )
            for skipped in plan.skipped:
                self.record_run_outcome(
                    zone_id=skipped.zone_id,
                    zone_name=skipped.zone_name,
                    cycle_id=skipped.cycle_id,
                    result=RESULT_SKIPPED,
                    reason=str(skipped.reason),
                    scheduled=True,
                )
                if not skipped.reason.silent:
                    self._buffer_skip_notice(str(skipped.reason), skipped.zone_name)
            if plan.runs:
                self.session.enqueue(plan.runs, manual=False)

    async def _session_evaluation(self) -> tuple[SessionEvaluation, float, bool]:
        """The active session's frozen evaluation, or a fresh one."""
        if self.session.active and self.session.evaluation is not None:
            return self.session.evaluation, self.session.duration_factor, False
        evaluation = await self.async_evaluate()
        factor, suspend_all = self._consumption_factor()
        self.session.start_session(evaluation, factor)
        return evaluation, factor, suspend_all

    async def async_run_zone(self, zone_id: str, duration_min: int | None = None) -> None:
        """Manual run: bypasses decision gates; safety gates still apply."""
        zone = self.zones.get(zone_id)
        if zone is None:
            return
        async with self._session_lock:
            evaluation, _factor, _ = await self._session_evaluation()
            run = self._manual_run(zone.config, evaluation, duration_min)
            self.session.enqueue([run], manual=True)

    def _manual_run(
        self,
        zone: ZoneConfig,
        evaluation: SessionEvaluation,
        duration_min: int | None,
    ) -> PlannedRun:
        cycle = next(
            (
                candidate
                for candidate in zone.cycles
                if self.state.cycle_enabled(zone.zone_id, candidate.cycle_id)
            ),
            zone.cycles[0] if zone.cycles else None,
        )
        if duration_min is None:
            if cycle is not None and cycle.curve.kind is CurveKind.VOLUME:
                # A volume curve yields liters, not minutes: run for the
                # cycle's safety timeout instead of misreading the target.
                duration_min = cycle.volume_safety_timeout_min or 10
            elif cycle is not None and evaluation.weighted_temp is not None:
                # Mirror the engine's scaling (planner._cycle_target) so a manual
                # run agrees with a scheduled one: fold today's per-day intensity
                # (falling back to the cycle's overall intensity) into the zone's
                # adjustment before evaluating the curve. Weekday is read from
                # local time, matching how the schedule is authored.
                weekday = dt_util.now().weekday()
                factor = cycle.day_intensity_pct.get(weekday, cycle.intensity_pct)
                duration_min = max(
                    round(
                        curve_value(
                            cycle.curve,
                            evaluation.weighted_temp,
                            zone.adjustment_pct * factor / 100.0,
                        )
                    ),
                    1,
                )
            else:
                duration_min = 10  # deliberate fallback for a curve-less manual run
        soak_max = cycle.soak_max_run_min if cycle else None
        return PlannedRun(
            zone_id=zone.zone_id,
            zone_name=zone.name,
            cycle_id=cycle.cycle_id if cycle else "manual",
            duration_min=duration_min,
            volume_l=None,
            runs=split_soak(duration_min, max_run_min=soak_max),
            soak_pause_min=cycle.soak_pause_min if cycle else 0,
            safety_timeout_min=duration_min,
        )

    async def async_run_all(self) -> None:
        for zone_id in self.zone_ids:
            if not self.state.zone_enabled(zone_id):
                continue
            suspended = self.state.suspended_until(zone_id)
            if suspended is not None and suspended > dt_util.utcnow():
                continue
            await self.async_run_zone(zone_id)

    async def async_stop_all(self, *, manual: bool = True) -> None:
        if manual:
            self.state.set_manual_stop(dt_util.utcnow())
            self.state.schedule_save()
        await self.session.async_stop_all(reason="manual_intervention", manual=manual)
        self.dispatch_update()

    def skip_today(self, zone_id: str | None) -> None:
        today = dt_util.now().date()
        for target in [zone_id] if zone_id else self.zone_ids:
            self.state.set_skip_today(target, today)
        self.state.schedule_save()
        self.dispatch_update()

    def pause(self, hours: float, zone_id: str | None) -> None:
        until = dt_util.utcnow() + timedelta(hours=hours)
        self.state.set_paused_until(zone_id, until)
        self.state.schedule_save()
        self.dispatch_update()

    def set_global_pause(self, paused: bool) -> None:
        if paused:
            self.state.set_paused_until(None, _INDEFINITE)
        else:
            self.state.clear_pause(None)
        self.state.schedule_save()
        self.dispatch_update()

    @property
    def globally_paused(self) -> bool:
        paused = self.state.paused_until(None)
        return paused is not None and paused > dt_util.utcnow()

    def suspend_until(self, until: datetime, zone_id: str | None) -> None:
        for target in [zone_id] if zone_id else self.zone_ids:
            self.state.set_suspended_until(target, until)
        self.state.schedule_save()
        self.dispatch_update()

    def resume(self, zone_id: str | None) -> None:
        targets = [zone_id] if zone_id else [*self.zone_ids, None]
        for target in targets:
            if target is not None:
                self.state.set_suspended_until(target, None)
            self.state.clear_pause(target)
        self.state.schedule_save()
        self.dispatch_update()

    async def async_evaluate_plan(self) -> dict[str, Any]:
        """The `evaluate` service response: the full computed plan."""
        evaluation = await self.async_evaluate()
        factor, suspend_all = self._consumption_factor()
        if suspend_all:
            evaluation = replace(evaluation, skip_reason=SkipReason.CONSUMPTION_BUDGET)
        specs = [self._zone_spec(zone, list(zone.config.cycles)) for zone in self.zones.values()]
        plan = build_session_plan(
            self.hub.engine_params,
            evaluation,
            specs,
            now=dt_util.now(),
            duration_factor=factor,
        )
        return {
            "weighted_temp": evaluation.weighted_temp,
            "water_budget": evaluation.water_budget,
            "skip_threshold": evaluation.skip_threshold,
            "forecast_credit": evaluation.forecast_credit,
            "skip_reason": str(evaluation.skip_reason) if evaluation.skip_reason else None,
            "stale_weather": evaluation.stale_weather,
            "runs": [
                {
                    "zone_id": run.zone_id,
                    "zone_name": run.zone_name,
                    "cycle_id": run.cycle_id,
                    "duration_min": run.duration_min,
                    "volume_l": run.volume_l,
                }
                for run in plan.runs
            ],
            "skipped": [
                {
                    "zone_id": item.zone_id,
                    "zone_name": item.zone_name,
                    "cycle_id": item.cycle_id,
                    "reason": str(item.reason),
                }
                for item in plan.skipped
            ],
        }

    # Outcome recording ------------------------------------------------------------

    def record_run_outcome(
        self,
        *,
        zone_id: str,
        zone_name: str,
        cycle_id: str,
        result: str,
        reason: str | None = None,
        minutes: int | None = None,
        liters: float | None = None,
        partial: bool = False,
        scheduled: bool = True,
    ) -> None:
        now = dt_util.utcnow()
        today = dt_util.as_local(now).date()
        outcome = {
            "result": result,
            "reason_key": reason,
            "at": now.isoformat(),
            "cycle_id": cycle_id,
            "duration_min": minutes,
            "volume_l": liters,
            "partial": partial,
        }
        self.state.set_last_outcome(zone_id, outcome)
        self.state.record_outcome(today, zone_id, cycle_id, result)
        if result == RESULT_COMPLETED and scheduled:
            self.state.set_last_completed(zone_id, cycle_id, today)
        self.state.schedule_save()

        event_map = {
            RESULT_COMPLETED: "cycle_finished",
            RESULT_SKIPPED: "cycle_skipped",
            RESULT_CANCELLED: "cycle_cancelled",
            RESULT_INTERRUPTED: "cycle_interrupted",
        }
        self.fire_event(
            event_map.get(result, "cycle_finished"),
            {
                "zone_id": zone_id,
                "zone_name": zone_name,
                "cycle_id": cycle_id,
                "result": result,
                "reason_key": reason,
                "duration_min": minutes,
                "volume_l": liters,
                "partial": partial,
            },
        )
        if result == RESULT_COMPLETED:
            self.entry.async_create_background_task(
                self.hass,
                self.notifier.async_notify(
                    EVENT_COMPLETED,
                    title="💧 Irrigation Maestro",
                    message=f"{zone_name}: cycle completed ({minutes} min).",
                ),
                name="irrigation_maestro_notify_completed",
            )
        self.dispatch_update()

    # Aggregated notifications -------------------------------------------------------

    def _buffer_skip_notice(self, reason: str, zone_name: str) -> None:
        names = self._skip_notices.setdefault(reason, [])
        if zone_name not in names:
            names.append(zone_name)
        if self._skip_flush_unsub is not None:
            self._skip_flush_unsub()
        self._skip_flush_unsub = async_call_later(
            self.hass, _SKIP_NOTICE_DEBOUNCE_S, self._flush_skip_notices
        )

    @callback
    def _flush_skip_notices(self, _now: Any) -> None:
        self._skip_flush_unsub = None
        notices, self._skip_notices = self._skip_notices, {}
        for reason, names in notices.items():
            self.entry.async_create_background_task(
                self.hass,
                self.notifier.async_notify(
                    EVENT_SKIPPED,
                    title="💧 Irrigation skipped",
                    message=f"Skipped ({reason}): {', '.join(names)}.",
                ),
                name="irrigation_maestro_notify_skipped",
            )

    async def notify_cancelled(self, reason: str, zone_names: list[str]) -> None:
        event = EVENT_INTERRUPTED if reason in ("manual_intervention",) else EVENT_CANCELLED
        await self.notifier.async_notify(
            event,
            title="💧 Irrigation not completed",
            message=f"Cycle not completed ({reason}): {', '.join(zone_names)}.",
        )

    async def notify_session_overrun(self, zone_names: list[str]) -> None:
        await self.notifier.async_notify(
            EVENT_SESSION_OVERRUN,
            title="💧 Irrigation session limit",
            message=(f"Session time limit reached; skipped zones: {', '.join(zone_names)}."),
        )

    async def notify_anomaly(self, message: str) -> None:
        self.fire_event(EVENT_ANOMALY, {"message": message})
        await self.notifier.async_notify(
            EVENT_ANOMALY,
            title="⚠️ Irrigation anomaly",
            message=message,
            force_priority="high",
        )

    async def notify_watchdog(self, message: str) -> None:
        await self.notifier.async_notify(
            EVENT_WATCHDOG,
            title="⚠️ Irrigation watchdog",
            message=message,
            force_priority="high",
        )

    async def notify_sentinel(self, missing: list[str]) -> None:
        await self.notifier.async_notify(
            EVENT_SENTINEL,
            title="⚠️ Irrigation not executed",
            message=(
                "No outcome recorded today for: "
                f"{', '.join(missing)}. The trigger probably never ran "
                "(Home Assistant off at trigger time, or an unexpected error)."
            ),
            force_priority="high",
        )

    # Repairs ---------------------------------------------------------------------

    def _refresh_notification_issues(self) -> None:
        """Surface a configuration that will not reach anyone.

        Judged from the configuration alone -- known_services is not passed.
        At setup time another integration's notify services may not have
        registered yet, and calling their recipients missing then would be a
        false alarm. A recipient that has genuinely vanished is caught by
        Notifier at send time, where its absence is certain.
        """
        status = evaluate_notifications(self.hub.notifications)
        if status.enabled_without_target:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_enabled_without_target",
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="notifications_enabled_without_target",
                translation_placeholders={"events": ", ".join(status.enabled_without_target)},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_enabled_without_target")

        if status.verdict == "silent":
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "notifications_silent",
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="notifications_silent",
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "notifications_silent")

    def _report_rescaled_flow_meters(self) -> None:
        """State which meters are being converted, and from what.

        A standing fact, not an event: there is no version gate and no
        one-shot flag, so this runs on every setup and config update and the
        issue is present exactly while some meter reads non-canonically. The
        text says so -- it describes the conversion in force, and mentions the
        understated history only as a conditional for an install upgraded from
        before 3.2.0. Anchoring it to "the current period" instead was false
        on a fresh install, false again once the month rolled over, and back
        at every HA version bump that reset the issue's dismissal.

        The litres already recorded -- now split between the carried-over
        opening balance and the per-zone daily history -- are deliberately
        NOT rewritten: they mix litres measured through the meter with litres
        estimated as nominal x minutes, which the defect never touched.
        Multiplying them by a single factor would be exactly the
        plausible-but-false number this feature removes.
        """
        rescaled: dict[str, str] = {}
        for zone in self.zones.values():
            reader = self.flow_reader_for(zone)
            if reader is None:
                continue
            reading = reader.read()
            if (
                reading.unit is not None
                and reading.unit != CANONICAL_UNIT
                and reader.entity_id not in rescaled
            ):
                rescaled[reader.entity_id] = reading.unit
        if not rescaled:
            ir.async_delete_issue(self.hass, DOMAIN, "flow_unit_corrected")
            return
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "flow_unit_corrected",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_corrected",
            translation_placeholders={
                "sensors": ", ".join(
                    f"{entity_id} ({unit})" for entity_id, unit in rescaled.items()
                )
            },
        )

    def report_consumption_history_restarted(self) -> None:
        """The monthly total now derives from per-zone daily litres (3.3.0).

        Modelled on the 3.2.0 rescale notice: the carried balance mixes
        litres measured through a meter with litres estimated as nominal x
        minutes and has no daily breakdown, so this month's chart starts at
        the upgrade while the budget total still includes the balance. Both
        self-heal at the next period boundary.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "consumption_history_restarted",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="consumption_history_restarted",
        )

    def _report_weather_unavailable(self) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "weather_unavailable",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="weather_unavailable",
        )
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_ANOMALY,
                title="⚠️ Irrigation Maestro",
                message=(
                    "Weather data unavailable at evaluation time; applied the "
                    f"configured policy ({self.hub.stale_weather_policy})."
                ),
            ),
            name="irrigation_maestro_weather_notice",
        )

    async def report_close_failure(self, entity_id: str, zone_name: str) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"close_failed_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="close_failed",
            translation_placeholders={"entity_id": entity_id},
        )
        self.fire_event(EVENT_ANOMALY, {"message": f"close failed: {entity_id}"})
        await self.notifier.async_notify(
            EVENT_ANOMALY,
            title="🚨 Irrigation: valve close FAILED",
            message=(
                f"The valve {entity_id} ({zone_name}) did not confirm closure "
                "after a retry. The watchdog will keep trying; if water still "
                "flows, close the tap manually!"
            ),
            force_priority="high",
        )

    def report_valve_unreachable(self, entity_id: str) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"valve_unreachable_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="valve_unreachable",
            translation_placeholders={"entity_id": entity_id},
        )

    def report_sentinel_missing(self, missing: list[str]) -> None:
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "sentinel_missing_outcome",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="sentinel_missing_outcome",
            translation_placeholders={"cycles": ", ".join(missing)},
        )

    def report_flow_out_of_range(self, actual: float, low: float, high: float) -> None:
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(
                f"Flow out of expected range: {actual:.1f} L/min "
                f"(expected {low:.1f}-{high:.1f} L/min)."
            ),
            name="irrigation_maestro_flow_range",
        )

    def report_flow_unit_unknown(self, entity_id: str) -> None:
        """The meter's unit cannot be determined, so its readings are unusable.

        Not an assumption of L/min: a plausible number that is silently wrong
        is worse than a declared absence (see the degradation matrix).
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_unknown_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_unknown",
            translation_placeholders={"entity_id": entity_id},
        )

    def clear_flow_unit_unknown(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_unknown_{entity_id}")

    def report_flow_unit_override_conflict(self, entity_id: str, first: str, second: str) -> None:
        """Two zones read one meter under different unit overrides.

        One ledger per meter means one interpretation; this names both zones
        rather than silently applying whichever was resolved first. ``first``/
        ``second`` are bare zone names -- proper nouns, not English prose --
        so each locale template supplies its own word for "zone" around them.
        Placeholders are plain string substitution with no per-locale
        conditional, so anything that describes the *kind* of claimant, not
        just its name, cannot live here; see
        ``report_flow_line_override_conflict`` for the other claimant shape
        this fact forces into its own translation key.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_override_conflict_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_override_conflict",
            translation_placeholders={
                "entity_id": entity_id,
                "first": first,
                "second": second,
            },
        )

    def clear_flow_unit_override_conflict(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_override_conflict_{entity_id}")

    def report_flow_line_override_conflict(self, entity_id: str, zone: str) -> None:
        """A zone's own override on the shared line meter disagrees with the hub's.

        A zone that points its own flow_sensor at the hub's line meter, with
        its own flow_sensor_unit, wins the ledger (mandated, unchanged) --
        but flow_reader_for builds a reader under the hub's own
        line_flow_sensor_unit for any zone that falls back to the line, so
        the disagreement must not be silent. A distinct issue id and
        translation key from ``report_flow_unit_override_conflict``, on
        purpose: that repair's template says "zone X and zone Y" in each
        locale, and this claimant is the hub, not a second zone -- a
        placeholder cannot make one static template correctly say "zone" in
        one case and "the hub" in another across languages, so this shape
        gets its own template, authored in full, per locale. Keyed
        separately from the zone-vs-zone issue on the same entity so
        resolving one conflict cannot clear the other.
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_override_conflict_line_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_override_conflict_line",
            translation_placeholders={"entity_id": entity_id, "zone": zone},
        )

    def clear_flow_line_override_conflict(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_override_conflict_line_{entity_id}")

    def report_flow_unit_lost(self, entity_id: str) -> None:
        """A meter that was readable stopped being so during a cycle.

        The repair states the standing condition; this pushes the change,
        because a run silently losing volume mode and flow anomaly detection
        halfway through is something the user has to be told about now.

        Two causes reach here, and the message must fit both: a unit that
        stopped resolving, and a meter retired mid-run because it left the
        configuration (MeterLedger.retire publishes a unit-less farewell
        sample, which is this same transition from the monitor's point of
        view). So the remedy stays general -- "set its unit" is no remedy at
        all for a sensor that is no longer configured, and handing someone a
        fix that cannot work, mid-cycle, is worse than handing them none.
        """
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(
                f"The flow sensor {entity_id} became unreadable mid-cycle "
                "(no usable unit, or no longer configured), so this run has "
                "lost its flow readings. Volume mode and flow anomaly "
                "detection are off for it until a usable flow meter is "
                "configured again."
            ),
            name="irrigation_maestro_flow_unit_lost",
        )

    # Leak detection ------------------------------------------------------------------

    def leak_scopes(self) -> list[str]:
        """Every scope a leak alarm can name: each zone, plus the hub itself.

        The same key set the unattributed water bucket uses, and deliberately
        so. HUB_SCOPE is not a fallback for "no zone configured": it is the
        answer whenever a meter serves more than one zone, where which zone
        leaks is genuinely unanswerable but whether the SYSTEM leaks is not.
        Without it, every installation on a shared line meter would have no
        source 2 at all while the documentation promised it a flow meter was
        enough -- a false claim about a safety feature.

        Always present, even when no meter currently resolves to it, so the
        state is queryable at all times and a configuration change cannot
        silently remove an alarm's home.
        """
        return [*self.zones, HUB_SCOPE]

    def _rebuild_leak_detectors(self) -> None:
        """One detector per scope, rebuilt by diffing rather than by replacing.

        A detector holds a live alarm and a confirmation window in progress.
        Dropping and recreating the whole set on every configuration change --
        even one that touches no leak setting -- would silently clear an active
        alarm and restart a window that was seconds from confirming, which is
        the same defect WaterAccountant.rebuild avoids for its ledgers. So a
        surviving scope keeps its detector and is only told to re-resolve its
        sources; only a scope that left the configuration is stopped and
        dropped.

        The ORDER of the steps below is a safety property rather than tidiness,
        and it was wrong in both directions. ``start()`` can WITHDRAW a source
        -- a meter that has left the configuration, a leak sensor cleared or
        repointed -- and a withdrawal dispatches synchronously, so whatever the
        entities would publish at that instant is what an automation acts on.
        Everything that decides what they may say therefore runs BEFORE the
        first ``start()``:

        * ``_resolve_leak_source_ids`` drops the observation window of a scope
          whose source set changed. Run after the start loop, as it was, a
          withdrawal found the OLD window still latched and the entity
          published ``off`` -- "there is no problem" -- for a scope whose
          alarming source the user had just removed, settling at
          ``unavailable`` only a moment later. That ``off`` is the exact edge
          the shipped "leak cleared -> reopen the mains" automation fires on,
          in the middle of a live leak. It can lead safely because it reads
          only ``self.zones`` and the accountant, and nothing a detector sets;
        * ``_track_leak_sources`` and ``_seed_leak_sensor_readings`` put the
          runtime's own bookkeeping IN FRONT of the detectors' subscriptions.
          Home Assistant fires state listeners in registration order, so
          registering the recorder first is what makes the runtime see a
          sensor's new reading before a withdrawal is judged against it.
          Registered second, a genuine clear published
          ``on -> unavailable -> off``: ``_leak_evidence_pending`` was still
          holding the remembered ``on`` when the alarm came down, so the latch
          could not close in the same turn and the safe automation, which
          triggers ``from: "on"``, never fired at all.
        """
        scopes = self.leak_scopes()
        metered = self.accountant.metered_scopes()
        cleared: list[tuple[str, LeakState]] = []
        for scope in list(self._leak_detectors):
            if scope not in scopes:
                state = self._drop_leak_detector(scope)
                if state is not None:
                    cleared.append((scope, state))
        for scope in scopes:
            if scope not in self._leak_detectors:
                self._leak_detectors[scope] = LeakDetector(self, scope)
        # A scope that has just GAINED its first source starts collecting here
        # rather than at whatever state change happens to come next, and one
        # whose sources changed at all starts again from zero.
        self._resolve_leak_source_ids()
        self._track_leak_sources()
        self._seed_leak_sensor_readings()
        for scope in scopes:
            self._leak_detectors[scope].start(has_meter=scope in metered)
        for scope, state in cleared:
            # After the rebuild, never inside it. This hook dispatches, and a
            # dispatch is where an automation reads every leak entity -- so all
            # of them must already be answering from the configuration as it
            # now stands, not from a half-applied one.
            self.on_leak_cleared(scope, state)
        self._note_leak_observation()
        self._reconcile_leak_issues()

    def _drop_leak_detector(self, scope: str) -> LeakState | None:
        """This scope has left the configuration. Returns an alarm still owed.

        ``stop()`` is cancel-only by its own documentation, so a zone deleted
        mid-alarm used to leave every consumer of that alarm holding it for
        ever: no ``cleared`` event, no clearing notification, and an entity
        removed outright -- and Home Assistant fires no state trigger on a
        removal, so the automation that closed the mains had nothing whatever
        to act on. The integration's own block released, because
        ``leak_blocked_zone_ids`` iterates live detectors: the component
        recovered and the user was left with the water off and nothing to say
        why.

        So the clearing transition is owed, and the caller fires it once the
        rebuild is complete. The event matters most of the three: Ruling L32
        moves the clearing side of every shipped automation onto
        ``EVENT_LEAK``, and a surface with a hole in precisely the case that
        leaves the mains shut is not a surface.

        The detector is popped before anything is told, so
        ``leak_blocked_zone_ids`` and the resume clause of the clearing message
        answer from the alarms that actually remain rather than counting this
        one among them.
        """
        detector = self._leak_detectors.pop(scope)
        detector.stop()
        # With the detector, so a zone id reused later serves its own
        # observation window rather than inheriting the elapsed one of the zone
        # that had that id.
        self._forget_leak_observation(scope)
        self._leak_source_ids.pop(scope, None)
        if detector.state.active:
            return detector.state
        # Nothing is owed, so no hook will run and nothing else will ever look
        # at this scope again: without this, a stale issue would have no path
        # left that could delete it.
        ir.async_delete_issue(self.hass, DOMAIN, self._leak_issue_id(scope))
        return None

    def _resolve_leak_source_ids(self) -> None:
        """Re-read each scope's source entities, dropping credit if they moved.

        A window is earned by particular sources, not by a scope: it says
        "these have been reporting long enough for their silence to mean
        something". Swap the sensor, or clear the meter and pick a sensor that
        has never spoken, and the old credit would have the entity publish
        ``off`` on evidence this scope has never had. It is the same case as a
        source configured hours after start-up, reached through the
        configuration door instead of the clock -- and it must answer the same
        way, by watching before it speaks.

        Set equality, so any change drops it: a source LEAVING is as much a
        change of what is being watched as one arriving, and a second source
        joining brings something that has not been watched at all. The cost is
        one window after an edit that touches leak sources; the alternative is
        publishing an answer nothing measured.

        Inert for silence, deliberately: this reads configuration only, and a
        sensor going quiet does not change it. That is what keeps "silence
        does not re-open a served window" true.
        """
        for scope in self._leak_detectors:
            ids = frozenset(self._leak_source_entities(scope))
            if self._leak_source_ids.get(scope) != ids:
                self._forget_leak_observation(scope)
                self._leak_source_ids[scope] = ids

    def _leak_source_entities(self, scope: str) -> set[str]:
        """Every entity this scope's leak detection reads, sensor and meters."""
        entities: set[str] = set()
        zone = self.zones.get(scope)
        if zone is not None and zone.config.leak_sensor:
            entities.add(zone.config.leak_sensor)
        entities.update(self.accountant.scope_entity_ids(scope))
        return entities

    def _forget_leak_observation(self, scope: str) -> None:
        """This scope must earn its observation window again from scratch."""
        self._leak_observed_s.pop(scope, None)
        self._leak_observing_since.pop(scope, None)
        self._leak_stalled_s.pop(scope, None)
        self._leak_stalled_since.pop(scope, None)
        self._leak_observation_done.discard(scope)

    def _reconcile_leak_issues(self) -> None:
        """Delete every leak issue no live alarm is standing behind.

        The alarm lives in memory and the issue registry does not, so a restart
        (or an alarm that ended while Home Assistant was down) would otherwise
        leave an issue standing with nothing behind it and no path left that
        could delete it. Run after ``start()``, which re-judges every source
        from live state and can raise on the spot, so a leak that is still
        present keeps the issue it just re-created.

        Swept by PREFIX rather than by iterating the detectors, which is the
        narrower case iterating them could not reach: a zone deleted while the
        entry was unloaded -- or while Home Assistant was stopped -- has no
        detector left to reconcile its issue, and its scope is unknowable from
        the configuration that remains. Nothing else can take that issue down.

        The prefix cannot tell a scope's alarm from ``leak_action_invalid``,
        which is not one and has its own lifecycle, so the exceptions are named
        (``_LEAK_NON_SCOPE_ISSUE_IDS``) rather than inferred.

        Deletion only: an issue is created by the raise, together with the
        notification that belongs to the same transition. Creating one here
        would be a second author for the same fact.
        """
        standing = {
            self._leak_issue_id(scope)
            for scope, detector in self._leak_detectors.items()
            if detector.state.active
        }
        for domain, issue_id in list(ir.async_get(self.hass).issues):
            if domain != DOMAIN or not issue_id.startswith(_LEAK_ISSUE_PREFIX):
                continue
            if issue_id in _LEAK_NON_SCOPE_ISSUE_IDS or issue_id in standing:
                continue
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)

    def leak_detector(self, scope: str) -> LeakDetector | None:
        """The detector for a scope, or None when the scope names nothing.

        WaterAccountant feeds source 2 through this, keyed by the scope of the
        meter that reported -- a zone id when exactly one zone is behind that
        meter, HUB_SCOPE otherwise.
        """
        return self._leak_detectors.get(scope)

    def leak_state(self, scope: str) -> LeakState:
        """A scope's alarm. A scope with no detector is simply not alarming."""
        detector = self._leak_detectors.get(scope)
        return detector.state if detector is not None else LeakState()

    def leak_state_established(self, scope: str) -> bool:
        """Has this scope an answer worth publishing at all?

        Three states, and only the third is publishable:

        * an alarm is standing -- publishable, always and immediately. An
          answer is an answer whenever it arrives, and withholding one we
          already hold would retract a live warning;
        * no source could ever raise one -- see ``leak_sources_configured``;
        * a source exists but this scope has not been watched for a full
          confirmation window yet.

        The third is the one this method exists for, and it is the second
        state's own logic one step further along. ``LeakDetector`` keeps its
        alarm in memory only, so at start-up every scope begins with no alarm
        and a confirmation window that has not run: for the first
        ``leak_confirm_s`` we have not established that there is no leak, we
        have only just started looking. Publishing ``off`` there is the same
        unsupported assertion, and worse in its consequences than anywhere
        else -- the natural automation pair is "leak -> close the mains" and
        "leak cleared -> reopen it", and the second has a ``to: "off"``
        trigger. A restart during a live leak would fire it and put the water
        back on, because we told it the leak had stopped when in truth we had
        forgotten. A transition into ``unavailable`` fires no such trigger.

        Measured over the time a source was actually IN A POSITION to
        conclude something, not over wall clock. See
        ``_leak_observation_satisfied``.

        Not persistence in disguise. A restored alarm can be stale, fixed
        while the system was down; this is about not speaking before we know,
        not about remembering.
        """
        if self.leak_state(scope).active:
            return True
        if not self.leak_sources_configured(scope):
            return False
        return scope in self._leak_observation_done

    # The observation window -----------------------------------------------------------

    def _leak_observation_satisfied(self, scope: str) -> bool:
        """May this scope's window close now? Two questions, both necessary.

        **Has it been watched for long enough** -- counted as QUALIFYING
        seconds, not wall clock. A wall clock measures the wrong interval: boot
        in the middle of a cycle and every valve is open, so source 2 resets on
        every sample and source 1 arms nothing, and five minutes later a
        clock-based window would find nothing in flight and publish "no
        problem" about a period in which no source could have concluded
        anything at all. Only time in which a source could speak counts here
        (``_leak_can_observe``), so the window measures observation rather than
        elapsed time.

        **Is any evidence still held** -- ``_leak_evidence_pending``. Held, not
        counting down: a sensor reading ``on`` over a valve that is absent,
        travelling or not yet reported arms no timer at all, and a timer-based
        gate would have this entity publish ``off`` while its own leak sensor
        says ``on``, then raise ``leak_confirm_s`` after the valve finally
        reports shut. That is the clearing edge, during a leak the sensor was
        asserting the whole time.

        Latched by the caller once both hold: a confirmation window opening
        later -- every post-cycle drainage opens one -- must not take a settled
        answer back to ``unavailable``. This gates the CLOSING of the window,
        never the answer afterwards.
        """
        if self._leak_qualified_s(scope) < self._leak_observation_window_s():
            return False
        return not self._leak_evidence_pending(scope)

    def _leak_observation_window_s(self) -> float:
        """How much observation a scope must collect before it may say "off".

        ``leak_confirm_s`` with a floor under it, and the floor is the whole
        point: the setting answers "how long before an alarm is believed", and
        it was being read as the answer to "how long before the ABSENCE of one
        is asserted" as well. At every value but zero the two coincide, so the
        second reading was invisible; at zero it made ``leak_state_established``
        unconditionally true, because ``0.0 < 0`` is False. A scope whose leak
        sensor had never reported and whose meter was dead then published
        ``off`` -- "there is no problem" -- on the first bookkeeping run of
        setup, with not one reading behind it. See ``_LEAK_MIN_OBSERVATION_S``.

        The alarm's own side is untouched: ``LeakDetector`` compares against
        ``leak_confirm_s`` directly, so zero still means an alarm is believed
        the instant it is seen.
        """
        return max(float(self.hub.leak_confirm_s), _LEAK_MIN_OBSERVATION_S)

    def _leak_qualified_s(self, scope: str) -> float:
        """Seconds this scope has been observable, including the open period."""
        total = self._leak_observed_s.get(scope, 0.0)
        since = self._leak_observing_since.get(scope)
        if since is not None:
            total += (dt_util.utcnow() - since).total_seconds()
        return total

    def _leak_can_observe(self, scope: str) -> bool:
        """Could one of this scope's sources conclude "no leak" right now?

        Each half is that source's own gate, asked from the outside, and BOTH
        readings of the valve sensor are gated on this zone's own valve being
        closed:

        * a meter counts only while it is measuring AND every managed valve is
          closed, because ``note_flow`` discards any interval with a valve open
          -- water through an open valve is watering, so no amount of it moves
          this scope toward a conclusion;
        * the valve sensor is the same rule narrowed to one valve, because it
          has one valve's own report to go on. Reading ``on`` counts only while
          this zone's valve reports closed, which is exactly when that source
          is timing its own window. Reading ``off`` counts under the same
          condition and NOT unconditionally, which is what this used to do:
          ``leak.py``'s standing rule is that anything reported about source 1
          must be true for both readings of ``moisture``, and on the reference
          hardware that sensor is the valve's own alarm -- "water is passing
          while I am shut" -- which only speaks while the valve IS shut. Its
          ``off`` over an open valve is the firmware saying nothing, not the
          firmware saying no leak, so crediting those minutes would let a zone
          that watered through its whole window answer "there is no problem"
          having concluded nothing at all. On probe hardware the same minutes
          are a probe under a running sprinkler.

        ``_evaluate_valve_sensor`` still withdraws on ``off`` whatever the
        valves are doing, and that asymmetry is deliberate: withdrawing an
        alarm early errs toward saying less, while crediting observation early
        errs toward asserting more.

        Both read the predicates that own those questions rather than copies:
        ``ValveController.is_closed`` and ``WaterAccountant.all_valves_closed``.

        **Which readings are held and which are read live is the whole of the
        care here, and the rule is: hold what withholds, never hold what
        permits.** The ``off`` branch PERMITS -- it is what lets the window
        fill and, at the end of it, publish "there is no problem". Answering it
        from a remembered reading would accrue five minutes of observation
        from a sensor that restored ``off`` at load and then said nothing at
        all, which is exactly the assertion this entity exists to refuse. So it
        is read live, and a sensor that has gone quiet stops the clock.

        The ``on`` branch is the opposite: it only ever WITHHOLDS, because a
        scope whose sensor asserts cannot close its window anyway (see
        ``_leak_evidence_pending``). Holding it there costs nothing and keeps
        the two halves of an assertion consistent.

        The meter half has always been live -- ``scope_is_measuring`` reads the
        meter -- and this makes the sensor half match it.
        """
        zone = self.zones.get(scope)
        sensor = zone.config.leak_sensor if zone is not None else None
        if sensor and zone is not None and zone.valve.is_closed:
            state = self.hass.states.get(sensor)
            if state is not None and state.state == _LEAK_SENSOR_CLEAR:
                return True
            if self._leak_sensor_reading.get(sensor) == _LEAK_SENSOR_ALARM:
                return True
        return self.accountant.scope_is_measuring(scope) and self.accountant.all_valves_closed()

    def _leak_evidence_pending(self, scope: str) -> bool:
        """Is this scope holding leak evidence it has not resolved?

        Two halves again, and each is HELD rather than ticking. The sensor's
        last known reading is the leak state -- silence does not retract it,
        for the same reason a raised alarm survives a source going quiet, which
        ``leak.py`` argues at length for the alarm and which is no less true of
        a window still forming. And ``LeakDetector.flow_evidence_pending``, the
        measured seconds only that module can see.

        A wake being armed is not part of this on purpose: it was, and it was
        the defect. A sensor asserting over a valve that has not reported
        closed arms nothing, and that is the state where publishing ``off`` is
        least defensible, not most.
        """
        zone = self.zones.get(scope)
        sensor = zone.config.leak_sensor if zone is not None else None
        if sensor and self._leak_sensor_reading.get(sensor) == _LEAK_SENSOR_ALARM:
            return True
        detector = self._leak_detectors.get(scope)
        return detector is not None and detector.flow_evidence_pending

    def _note_leak_observation(self) -> None:
        """Integrate observable time, latch what is settled, re-arm the wake.

        The one place the window moves, and deliberately NOT inside the
        entity's own availability read. A latch that only advances when
        something asks it stops advancing when nothing does: disable the leak
        entity in the registry and the wake would re-arm for ever, and while an
        alarm stands the availability read short-circuits before the latch, so
        the recheck would re-dispatch the whole integration every 30 s for the
        life of the alarm -- recorder included.

        Called from every place that can change either answer: the rebuild, a
        source or valve reporting, the wake, and the alarm hooks.
        """
        now = dt_util.utcnow()
        settled: list[str] = []
        for scope in self._leak_detectors:
            if scope in self._leak_observation_done:
                continue
            since = self._leak_observing_since.get(scope)
            if since is not None:
                self._leak_observed_s[scope] = (
                    self._leak_observed_s.get(scope, 0.0) + (now - since).total_seconds()
                )
            if self._leak_can_observe(scope):
                self._leak_observing_since[scope] = now
            else:
                self._leak_observing_since.pop(scope, None)
            self._note_leak_stall(scope, now)
            if self._leak_observation_satisfied(scope):
                self._leak_observation_done.add(scope)
                self._leak_observing_since.pop(scope, None)
                self._leak_stalled_s.pop(scope, None)
                self._leak_stalled_since.pop(scope, None)
                settled.append(scope)
        # Beside the window and not inside the loop: this is a fact about the
        # installation, not about any one scope, and every caller that can
        # change what a scope concludes can change it too.
        self._note_valve_reporting(now)
        self._evaluate_valve_notices()
        self._arm_leak_observation_wake()
        if settled:
            self.dispatch_update()

    def _note_valve_reporting(self, now: datetime) -> None:
        """Track which managed valves cannot say where they are, and since when.

        "Cannot say" is neither ``is_closed`` nor ``is_open``, both of which are
        strict -- so this is exactly ``unavailable``, ``unknown``, a valve
        travelling, and an entity that is not there at all. Deliberately not
        "is not closed": a valve that reports OPEN is watering, which is a
        legitimate reason for ``all_valves_closed()`` to be False and no fault
        of anybody's. Only uncertainty is a fault, and only uncertainty is
        recorded here.

        The timestamp is when this runtime first saw the valve uncertain, not
        when the device fell over -- a restart resets it, the same safe
        direction the rest of this feature takes: we do not know how long it
        has been out and must not assert an hour we did not watch.

        Pruned to the valves the configuration names now, so a valve removed
        from the installation leaves nothing behind.
        """
        managed = self.managed_valve_entities()
        for controller in self.all_valve_controllers():
            if controller.is_closed or controller.is_open:
                self._valve_unreported_since.pop(controller.entity_id, None)
            else:
                self._valve_unreported_since.setdefault(controller.entity_id, now)
        for entity_id in set(self._valve_unreported_since) - set(managed):
            del self._valve_unreported_since[entity_id]

    def leak_unreported_valves(self) -> list[str]:
        """Every managed valve that currently cannot say where it is.

        Sorted, so a diagnostics dump and a repair notice list them the same
        way every time rather than by dict order.
        """
        return sorted(self._valve_unreported_since)

    def _leak_blocking_valves(self, scope: str) -> list[str]:
        """Which valves are the reason this scope can conclude nothing.

        Empty when the scope CAN observe, and empty when it cannot for a reason
        that is not a valve -- a meter that is not measuring, a sensor that has
        never spoken. The question this answers is the one a support dump is
        opened to answer: not "is something wrong" but "which of eight valves
        is it", which until now had to be deduced from ``can_observe: false``
        and a hunch.

        Both halves, because both are gated on a valve. Source 1 is blocked by
        this zone's own valve going uncertain; source 2 by ANY managed valve
        doing so, because ``all_valves_closed()`` is strict across the whole
        installation -- which is why the hub scope, whose only half is the
        meter, gets a complete answer here and has no other surface that could
        give it one.

        Only uncertainty is named. A valve that reports open is watering, and
        listing it would report every running cycle as a fault.
        """
        if self._leak_can_observe(scope):
            return []
        blocking: set[str] = set()
        zone = self.zones.get(scope)
        sensor = zone.config.leak_sensor if zone is not None else None
        if sensor and zone is not None and zone.valve.entity_id in self._valve_unreported_since:
            blocking.add(zone.valve.entity_id)
        if self.accountant.scope_is_measuring(scope):
            blocking.update(self._valve_unreported_since)
        return sorted(blocking)

    def _evaluate_valve_notices(self) -> None:
        """Say out loud which valve has switched flow-based leak detection off.

        The refusal itself is right -- a system nobody can see at rest cannot be
        judged at rest -- and this changes none of it. What it changes is that
        the refusal stops being silent. A flat battery, a cloud integration in
        backoff, or a master valve deleted from Home Assistant but left in the
        options turns source 2 off for EVERY scope at once, and the only symptom
        was ``leak_never_observable`` an hour later, on ``zone_state`` -- a
        surface the hub scope does not have, which is the scope most likely to
        be meter-only.

        ONE NOTICE PER VALVE, never one per blocked scope. The cause is a single
        entity and the cost is uniform, so N notices for one flat battery would
        be the alarm fatigue this design refuses everywhere else. Two failing
        valves genuinely are two things to go and fix, and each gets its own
        lifecycle rather than one notice whose text mutates underneath a
        dismissal.

        Raised only where it costs something: no meter anywhere means source 2
        was never running, and announcing that it has stopped would be false.
        Source 1's own blocking is not announced here -- it is one zone's
        problem, it already has ``leak_never_observable`` on a surface that zone
        HAS, and one notice cannot truthfully say two different things.

        The delete path is reached from three directions, which is what the
        branch requires of a repair: the valve reporting again (its own state
        change calls this), the valve leaving the configuration (the rebuild
        calls this, and ``_note_valve_reporting`` has already pruned it), and a
        notice left by an earlier runtime whose valve is fine now (this runs at
        setup, and the registry is what it reconciles against -- there is no
        memory of "announced" to go stale, which is the defect the supply side
        had).

        Nothing is re-announced across a reload: a valve still uncertain keeps
        its notice untouched, because the raise is gated on the threshold while
        the delete is gated on the valve, and after a reload the threshold has
        not been re-earned. A notice restored INACTIVE by a restart and still
        deserved is re-created, which upserts and preserves its creation time
        and the user's dismissal.
        """
        registry = ir.async_get(self.hass)
        now = dt_util.utcnow()
        costs_something = bool(self.accountant.metered_scopes())
        managed = set(self.managed_valve_entities())
        for entity_id in managed:
            issue_id = self._valve_unreported_issue_id(entity_id)
            since = self._valve_unreported_since.get(entity_id)
            if since is None:
                ir.async_delete_issue(self.hass, DOMAIN, issue_id)
                continue
            if not costs_something:
                continue
            existing = registry.async_get_issue(DOMAIN, issue_id)
            if existing is not None and existing.active:
                continue
            if (now - since).total_seconds() < _LEAK_STALL_NOTICE_S:
                continue
            _LOGGER.warning(
                "%s has not reported open or closed for %d minutes; leak detection by "
                "flow is not running while that lasts",
                entity_id,
                int(_LEAK_STALL_NOTICE_S // 60),
            )
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="valve_unreported",
                translation_placeholders={"valve": entity_id},
            )
        prefix = self._valve_unreported_issue_id("")
        for domain, issue_id in list(registry.issues):
            # A valve that left the configuration while this entry was unloaded
            # has no entry in the loop above and nothing else will ever look at
            # it again.
            if (
                domain == DOMAIN
                and issue_id.startswith(prefix)
                and issue_id.removeprefix(prefix) not in managed
            ):
                ir.async_delete_issue(self.hass, DOMAIN, issue_id)

    def _valve_notice_delays_s(self) -> list[float]:
        """When each not-yet-announced uncertain valve reaches the threshold.

        Nothing else fires when the hour merely runs out -- an entity that has
        gone quiet makes no further state change, which is the whole shape of
        this failure -- so the delays join the observation window's own timer
        rather than arming a second one.

        Gated on a meter existing for the same reason the notice is: an
        installation with no flow meter must not carry an hourly timer for a
        notice that can never be raised.
        """
        if not self.accountant.metered_scopes():
            return []
        now = dt_util.utcnow()
        delays = []
        for since in self._valve_unreported_since.values():
            remaining_s = _LEAK_STALL_NOTICE_S - (now - since).total_seconds()
            if remaining_s > 0.0:
                delays.append(remaining_s)
        return delays

    @staticmethod
    def _valve_unreported_issue_id(entity_id: str) -> str:
        """Deliberately NOT under the ``leak_`` prefix.

        ``_reconcile_leak_issues`` sweeps that prefix for scopes that no longer
        exist, and a valve id is not a scope id. Sharing the prefix would put
        this notice one rebuild away from being deleted by a sweep that has no
        idea what it is.
        """
        return f"valve_unreported_{entity_id}"

    def _note_leak_stall(self, scope: str, now: datetime) -> None:
        """Integrate the idle time this scope has spent unable to conclude.

        Idle only, and that is the whole of why this measure is trustworthy: a
        zone that is watering cannot conclude anything, by design, and counting
        those minutes would report every long session as a fault. What is left
        is time in which a healthy scope would have settled within one window.
        """
        since = self._leak_stalled_since.get(scope)
        if since is not None:
            self._leak_stalled_s[scope] = (
                self._leak_stalled_s.get(scope, 0.0) + (now - since).total_seconds()
            )
        session = self.session
        if session.active or session.active_runs:
            self._leak_stalled_since.pop(scope, None)
        else:
            self._leak_stalled_since[scope] = now

    def leak_observation_stall(self, scope: str) -> str | None:
        """Why this scope has been unable to conclude, once that has lasted.

        ``None`` while the scope is settled, alarming, sourceless, or simply
        has not been stuck long enough to be worth saying. Otherwise one of two
        keys, because the two send a user to different places:

        * ``leak_evidence_unresolved`` -- something IS reporting a leak and
          nothing can finish judging it: a sensor asserting over a valve that
          never reports closed, or measured seconds frozen by a meter that
          stopped reading. Look at the sensor, the meter, or that valve;
        * ``leak_never_observable`` -- nothing has been in a position to say
          anything at all: a sensor that has never reported, a meter that is
          not measuring, or a valve somewhere that never reports closed, which
          blocks every meter-scope in the installation.

        This exists because an entity stuck at ``unavailable`` for ever is
        indistinguishable from a broken integration, and a user will reasonably
        assume the second. The refusal is correct; being silent about it is
        not.
        """
        if scope in self._leak_observation_done or not self.leak_sources_configured(scope):
            return None
        if self.leak_state(scope).active:
            return None
        stalled_s = self._leak_stalled_s.get(scope, 0.0)
        since = self._leak_stalled_since.get(scope)
        if since is not None:
            stalled_s += (dt_util.utcnow() - since).total_seconds()
        if stalled_s < _LEAK_STALL_NOTICE_S:
            return None
        if self._leak_evidence_pending(scope):
            return DEGRADED_LEAK_EVIDENCE_UNRESOLVED
        return DEGRADED_LEAK_NEVER_OBSERVABLE

    def leak_diagnostics(self) -> dict[str, dict[str, Any]]:
        """What this runtime believes about each leak scope, for a support dump.

        A READ, and deliberately nothing else. Every value is produced by the
        predicate the rest of the component already consumes -- ``leak_state``,
        ``leak_sources_configured``, ``leak_state_established``,
        ``leak_observation_stall``, and the three the observation window itself
        is built on -- so a diagnostics payload cannot disagree with the entity
        the user is looking at while they read it. Nothing is decided here. A
        second place that decided what a leak is would be the two-sources-of-
        truth defect this design has spent its whole life refusing, and it
        would be worse in diagnostics than anywhere else, because a support
        dump is believed precisely when the entity is not.

        It exists because the mechanism is in memory BY DESIGN. The alarm is
        deliberately not persisted (a restored alarm can be stale), and neither
        is the observation window, so ``state.as_dict()`` -- everything
        diagnostics carried until now -- says nothing whatsoever about any of
        it. The failure mode this feature has is silence: a scope that has
        never been observable and a broken integration look identical from
        outside, and until now the only thing that could tell them apart was a
        degraded badge an hour late, in a card the user may not have.

        Two values are worth reading carefully rather than at a glance:

        * ``observed_s`` counts only seconds the scope could have concluded in,
          so it is not wall clock and will sit still for a scope that is never
          in a position to observe. It keeps accruing past the window on a
          latched scope -- the accumulator is not rewound once the window
          closes -- so ``observed_s >= window_s`` is not by itself the latch.
          ``latched`` is. It is compared against ``window_s`` and not against
          ``confirm_s``: the two differ exactly when ``leak_confirm_s`` is set
          below the floor that keeps "no problem" from being asserted out of
          nothing, and ``confirm_s`` is reported beside it because that is the
          number the alarm itself is timed against;
        * ``evidence_pending`` is HELD, not counting down. A sensor whose last
          reading was the alarm holds it with no timer running anywhere, which
          is the state that made a countdown-shaped predicate wrong.
        """
        out: dict[str, dict[str, Any]] = {}
        for scope in self.leak_scopes():
            state = self.leak_state(scope)
            zone = self.zones.get(scope)
            sensor = zone.config.leak_sensor if zone is not None else None
            out[scope] = {
                "zone_ids": self.leak_zone_ids(scope),
                "sources_configured": self.leak_sources_configured(scope),
                "state_established": self.leak_state_established(scope),
                "alarm": {
                    "active": state.active,
                    "since": state.since.isoformat() if state.since is not None else None,
                    "sources": sorted(state.sources),
                    "first_source": state.first_source,
                    "describing_source": state.describing_source,
                },
                "observation": {
                    "latched": scope in self._leak_observation_done,
                    "observed_s": round(self._leak_qualified_s(scope), 1),
                    "window_s": self._leak_observation_window_s(),
                    "confirm_s": self.hub.leak_confirm_s,
                    "can_observe": self._leak_can_observe(scope),
                    # WHICH valve, not merely that one is the reason. A strict
                    # all_valves_closed() means any single uncertain valve
                    # freezes every meter-backed scope, and deducing which of
                    # eight it is from can_observe alone is the support
                    # conversation this field exists to end.
                    "blocking_valves": self._leak_blocking_valves(scope),
                    "evidence_pending": self._leak_evidence_pending(scope),
                    "stall": self.leak_observation_stall(scope),
                },
                "leak_sensor": sensor or None,
                # The remembered reading, which is the one piece of this that
                # is memory rather than live state: it is what "hold what
                # withholds, never hold what permits" operates on, so a support
                # dump that omitted it could not explain why a window is open.
                "leak_sensor_reading": (self._leak_sensor_reading.get(sensor) if sensor else None),
                "meters": sorted(self.accountant.scope_entity_ids(scope)),
            }
        return out

    def _track_leak_sources(self) -> None:
        """Watch everything that can change what this scope could conclude.

        Its sources, and every managed valve. Nothing else can tell us: the
        detector's own subscription speaks through raises and withdrawals, and
        a sensor moving from ``unknown`` to ``off`` is neither; a meter that
        becomes readable at zero flow books no litres and dispatches nothing;
        and a valve opening or closing changes whether a meter's seconds count
        at all, while belonging to no leak source. Without the valves the
        window would credit watering time and lose it again only at the next
        unrelated event.
        """
        if self._leak_source_unsub is not None:
            self._leak_source_unsub()
            self._leak_source_unsub = None
        entities: set[str] = set()
        for ids in self._leak_source_ids.values():
            entities.update(ids)
        if entities:
            # Valves only matter where a source exists to be gated by them.
            entities.update(self.managed_valve_entities())
        if not entities:
            return
        self._leak_source_unsub = async_track_state_change_event(
            self.hass, sorted(entities), self._on_leak_source_state
        )

    @callback
    def _on_leak_source_state(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data["entity_id"]
        new_state = event.data["new_state"]
        if (
            new_state is not None
            and new_state.state in _LEAK_SENSOR_REPORTING
            and entity_id in self._configured_leak_sensors()
        ):
            # Remember the reading itself, not merely that one arrived: an
            # assertion that goes silent is still an assertion, and the state
            # machine keeps no history for us to ask later. Filtered to leak
            # sensors because this subscription also carries the valves, and a
            # switch-backed valve reports ``on``/``off`` like any binary state.
            self._leak_sensor_reading[entity_id] = new_state.state
        self._note_leak_observation()

    def _configured_leak_sensors(self) -> set[str]:
        """Every leak sensor the configuration names right now."""
        return {zone.config.leak_sensor for zone in self.zones.values() if zone.config.leak_sensor}

    def _seed_leak_sensor_readings(self) -> None:
        """Read each configured leak sensor once, in case it spoke before us.

        A sensor already reporting when the integration loads -- the restored
        state after a restart, or a sensor configured onto a running system --
        has no state change left to make, exactly as ``LeakDetector.start``
        judges live state rather than waiting for a transition.
        """
        configured = self._configured_leak_sensors()
        # Nothing is remembered about a sensor no zone names any more. The
        # entry could not be read (every read is keyed by a configured sensor)
        # but it would outlive its configuration for the life of the process,
        # and an unbounded dict is a poor thing to leave behind.
        for entity_id in set(self._leak_sensor_reading) - configured:
            del self._leak_sensor_reading[entity_id]
        for sensor in configured:
            state = self.hass.states.get(sensor)
            if state is not None and state.state in _LEAK_SENSOR_REPORTING:
                self._leak_sensor_reading[sensor] = state.state

    def _arm_leak_observation_wake(self) -> None:
        """Wake when the earliest unsettled scope could next settle.

        Nothing else fires when a window merely fills up. An installation with
        a quiet sensor and no meter receives no update for hours, so without
        this the entity would sit at ``unavailable`` long after it was entitled
        to answer -- the same reason the water-supply window has a wake.

        One timer for the whole set rather than one per scope: scopes whose
        sources report together fill together, so N timers would fire in the
        same event-loop pass and dispatch N identical updates.
        """
        self._cancel_leak_observation_wake()
        pending = [
            delay
            for scope in self._leak_detectors
            if (delay := self._leak_wake_delay_s(scope)) is not None
        ]
        pending.extend(self._valve_notice_delays_s())
        if not pending:
            return
        self._leak_observation_unsub = async_call_later(
            self.hass, min(pending), self._on_leak_observation_wake
        )

    def _leak_wake_delay_s(self, scope: str) -> float | None:
        """When to look at this scope again, or None if there is no point.

        None in three cases, each for its own reason. A settled scope needs
        nothing. A scope that is not observable right now accrues nothing, so
        no clock of ours can move it -- the valve or the sensor that would
        change that is subscribed, and will call us. And a scope whose alarm is
        STANDING needs nothing either: the entity publishes it whatever this
        window says, and re-checking would dispatch the whole integration on a
        timer for the length of the alarm. Its clearing hook calls us back.

        The recheck exists for one case: enough observable time has been
        collected and evidence is still held. That evidence usually resolves
        through a subscribed entity, but ``note_flow`` can also clear it on a
        meter's own tick with no state change to notice, so it is looked at
        again rather than waited on for ever.
        """
        if scope in self._leak_observation_done:
            return None
        if self.leak_state(scope).active:
            return None
        remaining_s = self._leak_observation_window_s() - self._leak_qualified_s(scope)
        if remaining_s > 0.0:
            return remaining_s if scope in self._leak_observing_since else None
        return _LEAK_CONFIRMING_RECHECK_S

    @callback
    def _on_leak_observation_wake(self, _now: datetime) -> None:
        self._leak_observation_unsub = None
        self._note_leak_observation()

    def _cancel_leak_observation_wake(self) -> None:
        if self._leak_observation_unsub is not None:
            self._leak_observation_unsub()
            self._leak_observation_unsub = None

    def leak_sources_configured(self, scope: str) -> bool:
        """Could anything here ever raise a leak alarm on this scope?

        Configuration only, and that is the whole point rather than an
        oversight. The obvious alternative -- asking whether a source is
        answering right NOW, as ``zone_flow_meter_usable`` does -- describes a
        source that has gone quiet, not one that is gone, and LeakDetector
        deliberately holds an alarm through exactly that silence: neither
        source withdraws on ``unavailable``. A liveness-based answer would
        therefore say "nothing here can tell you anything" at the very moment
        the component is telling the user something, which is the one state
        where being believed matters.

        Both halves are the sources' own gates, read where each already lives
        rather than re-derived. Source 1 is subscribed only when the zone
        declares a ``leak_sensor``, by truthiness because update_zone stores
        "" for a cleared key. Source 2 only ever speaks for a scope some
        ledger reports for, which is ``metered_scopes`` -- the same set
        ``_rebuild_leak_detectors`` hands each detector as ``has_meter``, so a
        scope this call says is unsourced is precisely a scope whose sources
        have just been withdrawn. A hub scope has no zone and so no leak
        sensor, leaving flow as its only possible half.

        One half of ``leak_state_established``, which is what the leak binary
        sensors publish as availability: ``device_class: problem`` gives
        ``off`` the meaning "there is no problem", and a scope with no source
        has established no such thing.
        """
        zone = self.zones.get(scope)
        if zone is not None and zone.config.leak_sensor:
            return True
        return scope in self.accountant.metered_scopes()

    def leak_watch(self, zone_id: str) -> str:
        """WHERE this zone's water is watched for leaks -- its scope, or the hub's.

        A different question from ``capabilities.leak_detection``, which
        reports on the valve's own leak SENSOR and knows nothing about flow.
        The two answers diverge on ordinary hardware, and the divergence is
        the reason this exists: an installation of three metered zones and no
        leak sensors has full source-2 coverage on every zone while
        ``leak_detection`` says ``unavailable`` for all three. A card built on
        that alone tells such a user "no leak sensor" -- true, and it produces
        the belief that nothing is watching, which is worse than a false
        statement because there is nothing to catch by reading it.

        The ``zone`` answer is ``leak_sources_configured`` itself, not a copy
        of it: that is the same predicate ``leak_state_established`` gates the
        binary sensor's availability on, so this attribute and that entity
        cannot disagree about whether a zone is watched.

        ``system`` is the shared-line-meter case, and it is the honest answer
        to a genuinely awkward state. Two zones behind one line meter have no
        source on their own scopes -- ``scope_for`` sends that meter's water to
        HUB_SCOPE, because which of the two leaked is unanswerable -- yet their
        water is measured and a leak in it WILL raise an alarm, on
        ``hub_leak``. "Not watched" would be false; "watched" without saying
        where would promise a zone-named alarm that can never arrive. So the
        value names the scope that is watching, and the card says so.

        ``scope_for(meter) == HUB_SCOPE`` cannot be False where it is
        evaluated, and the step that carries that is easy to skip: every
        entity ``resolved_meter_entity`` can return is necessarily a ledger
        key. ``WaterAccountant._resolved_meters`` collects exactly the zones'
        ``flow_sensor`` values plus the hub's ``line_flow_sensor`` -- from
        CONFIGURATION, with no usability test -- and a ledger is opened for
        each, so ``metered_scopes`` covers this meter's scope whatever that
        scope turns out to be. Only that makes "absent from ``metered_scopes``"
        mean "my meter's scope is not me": reaching this line therefore means
        this zone is not its own meter's scope, and ``scope_for`` answers
        either the meter's sole owner or the hub.

        It is written out anyway rather than inferred, because "a meter that
        is not mine belongs to the hub" is precisely the rule ``scope_for``
        owns, and this branch consumes that one definition instead of keeping
        a second copy of it that could drift if the answer set ever grew.
        Deliberate, and it fails to ``none`` rather than to a false ``system``
        if it ever does.
        """
        if self.leak_sources_configured(zone_id):
            return LEAK_WATCH_ZONE
        zone = self.zones.get(zone_id)
        if zone is None:
            return LEAK_WATCH_NONE
        meter = self.resolved_meter_entity(zone.config)
        if meter is None:
            return LEAK_WATCH_NONE
        if self.accountant.scope_for(meter) == HUB_SCOPE:
            return LEAK_WATCH_SYSTEM
        return LEAK_WATCH_NONE

    def _leak_subject(self, scope: str) -> str:
        """Who an alarm is about, for a log line: a zone's name, or the system.

        HUB_SCOPE must never be printed as though it were a zone id. It means
        the water was seen on a meter shared by several zones (or by none), so
        the honest subject is the installation itself.
        """
        if scope == HUB_SCOPE:
            return "the system (shared meter)"
        return self._zone_name(scope)

    def on_leak_raised(self, scope: str, state: LeakState) -> None:
        """The alarm went false -> true, once, for however many sources agree.

        Everything the user sees hangs off this one transition: the event, the
        notification, the Repairs issue that outlives it, and the configured
        action. A second source arriving later adds itself to ``sources`` and
        reaches none of them, which is the whole point of one alarm per scope.
        """
        _LOGGER.warning(
            "Leak alarm raised on %s by %s", self._leak_subject(scope), state.first_source
        )
        self._fire_leak_event(scope, state, "active")
        self._create_leak_issue(scope, state)
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_TITLE, message=self._leak_raised_message(scope, state)
        )
        if self.hub.leak_action in (LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK):
            self.entry.async_create_background_task(
                self.hass,
                self.async_close_for_leak(scope),
                name="irrigation_maestro_leak_close",
            )
        # The alarm outranks the observation window, so this scope needs no
        # recheck timer for as long as it stands; the bookkeeping drops it.
        self._note_leak_observation()
        self.dispatch_update()

    def on_leak_repeated(self, scope: str, state: LeakState) -> None:
        """Still leaking, one leak_repeat_min later.

        No event is fired: an automation consuming the event stream counts
        alarms, and a reminder is not a second alarm -- that is the whole point
        of unifying the sources. No second re-close either: the action is one
        attempt per alarm, not a retry loop against a valve that has already
        been told.
        """
        _LOGGER.warning(
            "%s is still reporting a leak (sources: %s)",
            self._leak_subject(scope),
            ", ".join(sorted(state.sources)),
        )
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_TITLE, message=self._leak_repeated_message(scope, state)
        )

    def on_leak_cleared(self, scope: str, state: LeakState) -> None:
        """The last source withdrew: close the event, the issue and the notice.

        ``state`` is the alarm as it was immediately before clearing, so the
        event says what kind of leak has ended rather than only that one has.
        """
        _LOGGER.warning("Leak alarm cleared on %s", self._leak_subject(scope))
        self._fire_leak_event(scope, state, "cleared")
        ir.async_delete_issue(self.hass, DOMAIN, self._leak_issue_id(scope))
        self._notify_leak(
            EVENT_LEAK, title=_LEAK_CLEARED_TITLE, message=self._leak_cleared_message(scope)
        )
        # And back the other way: the window this scope may still owe becomes
        # visible again the moment the alarm stops covering for it, so it is
        # re-armed here rather than waiting on the next unrelated event.
        self._note_leak_observation()
        self.dispatch_update()

    def on_leak_sources_changed(self, scope: str, state: LeakState) -> None:
        """A source stopped contributing, and the alarm survived on another.

        Not a new alarm and not the end of one, so it fires no event, sends no
        notification, and touches neither ``since`` nor the reminder cadence --
        that timer is armed in ``LeakDetector._raise`` and re-armed only by its
        own expiry, and nothing here goes near it. What can change is the
        DESCRIPTION, and only when the source the standing text cites is the
        one that has gone quiet: see ``LeakState.describing_source``.

        Deleted and recreated rather than updated in place. Home Assistant's
        ``async_create_issue`` upserts, but the upsert preserves both the
        issue's creation time and its DISMISSAL -- so a notice the user
        dismissed under the old diagnosis would stay dismissed under the new
        one, and the correction they most need to read is the one they would
        never see. It reads as new because it genuinely is new evidence.

        Guarded on the key actually changing, so a source merely joining (which
        cannot change the description while the first one still contributes)
        costs nothing.
        """
        if not state.active:
            return
        issue_id = self._leak_issue_id(scope)
        existing = ir.async_get(self.hass).async_get_issue(DOMAIN, issue_id)
        if existing is None or existing.translation_key != self._leak_translation_key(scope, state):
            _LOGGER.warning(
                "Leak alarm on %s now rests on %s; re-describing the repair notice",
                self._leak_subject(scope),
                ", ".join(sorted(state.sources)),
            )
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)
            self._create_leak_issue(scope, state)
        self.dispatch_update()

    def _create_leak_issue(self, scope: str, state: LeakState) -> None:
        """The one place a leak repair notice is built."""
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            self._leak_issue_id(scope),
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key=self._leak_translation_key(scope, state),
            translation_placeholders=self._leak_placeholders(scope),
        )

    def _notify_leak(self, event: str, *, title: str, message: str) -> None:
        """Push one leak notice. The hooks are callbacks; this cannot await."""
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(event, title=title, message=message),
            name="irrigation_maestro_notify_leak",
        )

    @staticmethod
    def _leak_issue_id(scope: str) -> str:
        return f"leak_{scope}"

    @staticmethod
    def _leak_translation_key(scope: str, state: LeakState) -> str:
        """Which authored template this alarm gets.

        Three of them, not one with placeholders, for the reason
        ``flow_unit_override_conflict_line`` already exists separately from
        ``flow_unit_override_conflict``: a placeholder is plain string
        substitution, so a template cannot say "zone Alpha" in one case and
        "the system" in another, nor name a different sensor per source,
        across two languages. Each shape is authored in full, per locale.

        A hub scope has no leak sensor to resolve -- ``LeakDetector`` never
        subscribes to one without a zone -- so its only reachable source is
        flow, and it takes the system template whatever the sources say.

        Keyed on ``describing_source``, not on ``first_source``: the template
        names a sensor and tells the user what makes the notice go away, so it
        has to describe evidence that still exists. ``first_source`` remains
        the honest answer to "who noticed first" -- it is what the leak event
        carries -- but a zone whose meter has been removed while its valve
        sensor holds the alarm up would otherwise keep a template about flow
        measurement, promising to clear when the meter is removed, which is
        exactly what already happened.
        """
        if scope == HUB_SCOPE:
            return "leak_system_flow"
        if state.describing_source == SOURCE_VALVE_SENSOR:
            return "leak_zone_valve_sensor"
        return "leak_zone_flow"

    def _leak_placeholders(self, scope: str) -> dict[str, str]:
        """The system template names no zone, so it is given no placeholder.

        Home Assistant renders the template it is handed; an unused
        placeholder is harmless, but a template written with none must not be
        handed a zone name it might one day be tempted to interpolate.
        """
        if scope == HUB_SCOPE:
            return {}
        zone = self.zones.get(scope)
        return {"zone": zone.config.name if zone else scope}

    def _leak_raised_message(self, scope: str, state: LeakState) -> str:
        """What is KNOWN, in wording true for both readings of the sensor.

        A ``device_class: moisture`` sensor on a valve is not necessarily a
        ground probe: on the SONOFF SWV it is an alarm derived from the valve's
        own internal flow meter -- "water is passing while I am closed" --
        mapped to the nearest available class, while on other hardware it
        really is a probe. "Water detected on the ground" would be false for
        half of all installations, so the message says the valve reports a
        leak and stops there.

        The scope decides the subject. A hub alarm cannot name a zone, because
        water on a meter serving more than one zone genuinely does not say
        which of them leaks -- and claiming one would send the user digging in
        the wrong flowerbed.
        """
        if scope == HUB_SCOPE:
            detail = (
                "Possible leak in the irrigation system -- water is flowing while "
                "every valve reports closed. The meter that measured it does not "
                "belong to a single zone, so which zone is leaking cannot be told."
            )
        elif state.describing_source == SOURCE_VALVE_SENSOR:
            # Same rule as the repair template, and identical to first_source
            # at the only moment this is sent: a description cites evidence
            # that exists, so the two must not diverge if this is ever reused.
            detail = (
                f"{self._zone_name(scope)}: possible leak -- the valve of this zone "
                "reports a leak while it is closed."
            )
        else:
            detail = (
                f"{self._zone_name(scope)}: possible leak -- water is flowing while "
                "every valve reports closed."
            )
        return f"{detail} {self._leak_action_note()}"

    def _leak_repeated_message(self, scope: str, state: LeakState) -> str:
        """The reminder, and the only place a second source ever surfaces.

        It stayed silent when it arrived -- one alarm, one notification -- so
        the reminder lists every source currently reporting rather than only
        the one that raised the alarm.

        The timestamp is when detection CONFIRMED the leak, which is not when
        the water started and must never be offered as though it were: the
        alarm is memory-only, so a restart or a de-configure-and-restore yields
        a fresh one for a leak that never stopped. It carries its date as well
        as its time, because at the default six-hour interval the second
        reminder already shows a time a reader would otherwise take for today.

        It carries the action note too. This is the one message a standing
        alarm keeps sending, so a close_and_block user who reads only reminders
        would otherwise never be told that cycles are being refused.
        """
        sources = ", ".join(
            _LEAK_SOURCE_PHRASES.get(source, source) for source in sorted(state.sources)
        )
        confirmed = (
            ""
            if state.since is None
            else f" Confirmed at {dt_util.as_local(state.since):%Y-%m-%d %H:%M} "
            "(when detection confirmed it, not when the water started)."
        )
        subject = "The irrigation system" if scope == HUB_SCOPE else self._zone_name(scope)
        return (
            f"{subject}: still reporting a leak ({sources}).{confirmed} {self._leak_action_note()}"
        )

    def _leak_cleared_message(self, scope: str) -> str:
        """Deliberately says only that the alarm ended.

        An alarm is withdrawn by evidence that the water stopped OR by its last
        source leaving the configuration, and a message claiming the sensor now
        reports no leak would be false in the second case.

        The resume clause is gated on the zones this alarm implicated actually
        becoming free, not merely on the action being close_and_block. One
        physical leak on an ordinary topology -- a zone with its own leak
        sensor behind a shared line meter -- raises a zone alarm AND a hub
        alarm; the zone's sensor recovering clears only the first, and telling
        the user cycles resume while the hub alarm still blocks that zone and
        its neighbours would be false at the instant it is sent. The detector
        has already reset its state before calling this, so the question is
        answered against the alarms that remain.
        """
        subject = "The irrigation system" if scope == HUB_SCOPE else self._zone_name(scope)
        if self.hub.leak_action != LEAK_ACTION_CLOSE_AND_BLOCK:
            blocking = ""
        elif reasons := self._start_block_reasons(*self.leak_zone_ids(scope)):
            blocking = f" New cycles are still blocked: {reasons}."
        else:
            blocking = " New cycles are allowed again."
        return f"{subject}: the leak condition has cleared.{blocking}"

    def _start_block_reasons(self, *zone_ids: str) -> str:
        """Why these zones still cannot start a cycle, or "" if they can.

        Every message that says anything about cycles starting goes through
        here, and through ``SessionRunner.start_blocks`` beneath it, because the
        alternative was each feature asserting about the other's block from
        inside its own module. That is not a hypothetical: the supply notice
        claimed "cycles still start" whenever its own gate was off, and the leak
        clearing message promised resumption whenever no other LEAK alarm stood,
        and one ordinary sequence made both false at once.

        The phrases are checked against ``START_BLOCK_RESULTS`` by a test, so a
        new gate cannot reach a user as a bare key. Every reason is listed
        rather than the first: sending someone to fix one of two blocks and
        leaving them blocked is the failure this whole class of message has
        already been corrected for once.

        Read in the caller's own turn, which is the ordering that matters here:
        these messages are built by the hook that the state change triggered, so
        the answer has to describe the world AFTER that change. Both gates do --
        the detector resets its alarm before calling ``on_leak_cleared``, and
        the supply predicates read the sensor's live state -- and neither
        consults an "announced" flag, which is the memory that would still be
        describing the world before.
        """
        return "; ".join(
            _START_BLOCK_PHRASES.get(reason, reason)
            for reason in self.session.start_blocks(*zone_ids)
        )

    def _leak_action_note(self) -> str:
        """What the configured action WILL do, in the mood the fact deserves.

        Two things it must not claim. Closing a valve that is already closed is
        a no-op, and the component cannot stop a leak it detects while idle --
        it can only report it and re-assert the closure; the user chose this
        default after being shown that trade-off, and a message implying the
        water has been dealt with would undo it.

        And it must not assert a close that is not performed, which is what the
        indicative cost it. ``async_close_for_leak`` skips a controller already
        closed, and a ``no_flow_closed`` alarm can only raise when every managed
        valve has been shut for the whole confirmation window -- so on the
        commonest alarm this feature has, "the master and the implicated valve
        are commanded closed again" described something that was never done at
        all. The Repairs notice on the same fact has always been modal ("can
        re-close"), so the two surfaces disagreed about one action.

        Modal also dissolves a race rather than documenting it. The indicative
        needed ``session.active`` read here and read AGAIN when the background
        close runs, with the claim resting on nothing intervening between the
        two; a sentence that says what the action does when it finds a valve
        open, and what it does while a cycle runs, is true whichever way that
        reading falls.
        """
        action = self.hub.leak_action
        if action not in (LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK):
            return "Configured action: notify only."
        prefix = (
            "Configured action: close and block"
            if action == LEAK_ACTION_CLOSE_AND_BLOCK
            else "Configured action: close"
        )
        attempt = (
            " -- the master and the implicated valve are commanded closed again if "
            "either is still open, and not at all while a cycle is running, since "
            "re-asserting the closure would abort a cycle on a zone nothing has "
            "implicated. That recovers a valve left open by a command that never "
            "landed; it cannot stop water passing a valve already shut."
        )
        # Present tense, and no undertaking about how long it will last. The
        # block follows the alarm AND the configured action, and the action is
        # a setting the user can change while the alarm still stands -- so a
        # message promising the block for the alarm's whole duration is one
        # they can falsify from the settings page a minute later.
        blocked = (
            " No new cycle starts for the zones concerned."
            if action == LEAK_ACTION_CLOSE_AND_BLOCK
            else ""
        )
        return f"{prefix}{attempt}{blocked}"

    def _zone_name(self, zone_id: str) -> str:
        """This zone's name -- including just after it stopped being a zone.

        Every notice about a zone's REMOVAL is written after ``_build_zones``
        has replaced ``self.zones``: an alarm cleared BY the deletion, a supply
        notice taken down with it. The fallback keeps those sentences readable
        rather than sending the user an opaque subentry id. See
        ``_zone_names``, which is bounded to one rebuild's worth of history.
        """
        zone = self.zones.get(zone_id)
        if zone is not None:
            return zone.config.name
        return self._zone_names.get(zone_id, zone_id)

    # What the alarm does ---------------------------------------------------------------

    def leak_zone_ids(self, scope: str) -> list[str]:
        """Which zones an alarm on this scope implicates.

        A zone scope implicates that zone. A hub scope implicates every zone
        whose meter reports under HUB_SCOPE -- exactly the set that could be
        leaking, resolved through the accountant's own scope rule so the zones
        an alarm names can never disagree with the zones its litres came from.

        When no zone resolves to such a meter at all (every zone has its own,
        and a line meter measures the whole installation on top), the honest
        answer is every zone: that meter sits upstream of all of them, and an
        empty set would make the alarm's consequences vanish on precisely the
        topology where it is least able to point at anyone.
        """
        if scope != HUB_SCOPE:
            return [scope] if scope in self.zones else []
        served = [
            zone_id
            for zone_id, zone in self.zones.items()
            if (meter := self.resolved_meter_entity(zone.config)) is not None
            and self.accountant.scope_for(meter) == HUB_SCOPE
        ]
        return served or list(self.zones)

    def leak_blocked_zone_ids(self) -> set[str]:
        """Every zone close_and_block currently refuses to start a cycle for.

        Empty under any other action, so the block is a property of the
        configuration and the live alarms together -- changing the action
        releases the block at once, with no state to unwind.
        """
        if self.hub.leak_action != LEAK_ACTION_CLOSE_AND_BLOCK:
            return set()
        blocked: set[str] = set()
        for scope, detector in self._leak_detectors.items():
            if detector.state.active:
                blocked.update(self.leak_zone_ids(scope))
        return blocked

    def leak_block_active(self, zone_id: str) -> bool:
        """Is this zone currently refused a new cycle by a leak alarm?

        The session's own gate. Asked per segment rather than per session, so a
        zone blocked by an alarm that raised while the queue was running is
        refused at the moment it would open a valve.
        """
        return zone_id in self.leak_blocked_zone_ids()

    async def async_close_for_leak(self, scope: str) -> None:
        """One re-close attempt of the master and the implicated valves.

        Honestly bounded: closing a valve that is already closed is a no-op,
        and the component cannot stop a leak it detects while idle. What this
        genuinely recovers is a valve left open by a command that never landed
        -- most plausibly the master, since source 2 needs every valve closed
        before it will confirm anything, while a zone's own sensor needs only
        its own. It does not repair a seeping seat and must not pretend to.

        Skipped entirely while a session is running. ``close`` promises that
        cycles continue, the session owns every managed valve while it runs,
        and a zone's sensor can alarm while a DIFFERENT zone waters -- so
        closing the master here would abort a legitimate cycle on a zone
        nothing has implicated. The alarm persists and says so; the water does
        not become our excuse for stopping someone else's watering.

        Ledger-registered, and guarded on ``is_closed`` for the same reason
        every other close path is: a command to an already-closed valve
        produces no transition, so its entry would sit for the whole TTL and
        absorb the next genuine manual close.

        Guarded on a pending entry for the same reason, one step further out.
        Two zone alarms can raise in the same turn -- the shared-line topology
        makes that ordinary -- and both would find the master open and both arm
        an entry, while the single close that follows can retire only one. The
        survivor is exactly the trap the ``is_closed`` guard exists to avoid,
        arriving through a second alarm instead of a second call.
        """
        if self.session.active:
            _LOGGER.warning(
                "Leak alarm on %s: not re-closing while a cycle is running",
                self._leak_subject(scope),
            )
            return
        controllers = [self.zones[zone_id].valve for zone_id in self.leak_zone_ids(scope)]
        if self.master_controller is not None:
            controllers.append(self.master_controller)
        for controller in controllers:
            if controller.is_closed or self.ledger_pending(controller.entity_id, "close"):
                continue
            self.ledger_expect(controller.entity_id, "close")
            await controller.async_close()

    def _report_invalid_leak_action(self) -> None:
        """A rejected leak_action must leave a trace.

        ``leak_action_from_config`` falls back to ``close`` rather than
        refusing to load the integration, which is right -- but silently, so a
        user who mistypes the action believes they configured one thing and
        gets another, with the failure least visible exactly where it matters
        most. The service schema cannot be the whole answer: options also
        arrive through import_config and through a hand-edited entry.
        """
        raw = self.entry.options.get(CONF_LEAK_ACTION)
        if raw is None or str(raw) in LEAK_ACTIONS:
            ir.async_delete_issue(self.hass, DOMAIN, _LEAK_ACTION_ISSUE_ID)
            return
        _LOGGER.warning(
            "Unrecognised leak_action %r; using %s instead", str(raw), self.hub.leak_action
        )
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            _LEAK_ACTION_ISSUE_ID,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="leak_action_invalid",
            translation_placeholders={"value": str(raw)},
        )

    def _fire_leak_event(self, scope: str, state: LeakState, phase: str) -> None:
        """The one place the leak payload is built.

        ``zone_id`` is None for a hub-scope alarm rather than carrying
        HUB_SCOPE, so an automation that reads it cannot address a zone that
        was never implicated. ``scope`` always carries the real key.
        """
        self.fire_event(
            EVENT_LEAK,
            {
                "scope": scope,
                "zone_id": None if scope == HUB_SCOPE else scope,
                "state": phase,
                "first_source": state.first_source,
                "sources": sorted(state.sources),
            },
        )

    # The water supply: source 3, and not a leak ---------------------------------------

    def water_supply_sensor(self, zone_id: str) -> str | None:
        """This zone's supply sensor entity id, or None where there is none.

        Truthiness, not ``is not None``: ``update_zone`` stores "" as the way of
        clearing the key, so an empty string means the user has no sensor here.

        One resolver, because "has this zone a supply sensor" and "which sensor"
        are the same question and were being spelled out separately at every
        site that asked either. A caller that only needs the first asks
        ``is not None``.
        """
        zone = self.zones.get(zone_id)
        sensor = zone.config.water_supply_sensor if zone else None
        return sensor or None

    def water_supply_missing(self, zone_id: str) -> bool:
        """True only on hard evidence that the water is gone.

        ``device_class: problem`` inverts the polarity the entity's name
        suggests: ``on`` is the PROBLEM, so on means NO water. Every use of
        this predicate has to read correctly against that, and the name of the
        sensor is not the thing to read it against.

        Anything else -- no sensor configured, an entity that never turned up,
        ``unavailable``, ``unknown`` -- is not evidence and answers False.
        Uncertainty resolves to the side that keeps watering, because the
        alternative is a flaky sensor drying the garden: the failure this
        feature must not introduce while removing another.
        """
        return self._water_supply_alarm(zone_id) is not None

    def water_supply_block_active(self, zone_id: str) -> bool:
        """Is this zone currently refused a new cycle for want of water?

        Prolonged confirmation, chosen over both "block immediately" and
        "never block": a single flaky reading must not withhold water, and a
        genuine outage should not cost a pointless valve actuation and an
        interrupted cycle either.

        The elapsed time is the sensor state's own ``last_changed``, so there
        is nothing of ours to keep, restart or drift. After a restart a
        restored state's ``last_changed`` is the restore, so the clock starts
        again -- the safe direction, since we do not know how long the supply
        has been out and must not withhold water on a guess.

        ``require_water_supply`` switches this gate off, because a flaky sensor
        must not be able to stop the system without appeal. It does not switch
        off the repair notice or its notification: those report a condition,
        and a user who has chosen to keep watering through it is still entitled
        to know it is there.

        The window is shared with that notice and with nothing else. Explaining
        a zero-flow interrupt (see SessionRunner) reads ``water_supply_missing``
        directly: that describes an event that has already happened, and the
        reading at that moment is the evidence for it.
        """
        return self.hub.require_water_supply and self._water_supply_confirmed(zone_id)

    def _water_supply_confirmed(self, zone_id: str) -> bool:
        """Has the outage stood long enough to be asserted as a present fact?

        The bar for saying "the supply is out", whether the saying withholds
        water (the gate above) or merely tells the user (the repair notice and
        its notification). Both assert the same present fact, so both need the
        same evidence; only the diagnosis of an interruption that has already
        happened is exempt, because there the reading at that moment IS the
        evidence and a window would blur a precise answer into a generic one.
        """
        remaining_s = self._water_supply_remaining_s(zone_id)
        return remaining_s is not None and remaining_s <= 0

    def _water_supply_remaining_s(self, zone_id: str) -> float | None:
        """Seconds still to run before this zone's outage may be asserted.

        ``None`` when there is nothing to assert -- no sensor, or a sensor not
        reporting the water gone. Zero or below means confirmed.

        One expression of the threshold, not two. The announcement needs the
        remaining seconds anyway, to arm the wake that fires when the window
        merely runs out, and a second comparison written beside it is a second
        place for the two answers to drift apart.

        Read from the sensor state's own ``last_changed``, so there is nothing
        of ours to keep, restart or drift. After a restart a restored state's
        ``last_changed`` is the restore, so the clock starts again.
        """
        state = self._water_supply_alarm(zone_id)
        if state is None:
            return None
        elapsed_s = (dt_util.utcnow() - state.last_changed).total_seconds()
        return self.hub.water_supply_confirm_s - elapsed_s

    def _water_supply_alarm(self, zone_id: str) -> State | None:
        """This zone's supply sensor, but only while it reports no water.

        One resolver for both questions above, so "is the water gone" and "how
        long has it been gone" can never be answered from different readings.
        """
        sensor = self.water_supply_sensor(zone_id)
        if sensor is None:
            # A zone that says it has no supply sensor can never be one whose
            # supply is known to be missing.
            return None
        state = self.hass.states.get(sensor)
        return state if state is not None and state.state == _SUPPLY_MISSING else None

    def _water_supply_restored(self, zone_id: str) -> bool:
        """Evidence that an announced outage is over. Silence is not evidence.

        Two things qualify: the sensor saying the water is there, and the
        sensor being de-configured -- the user's own statement, and the only
        thing that could ever take down a notice raised by a source they have
        since removed.

        ``unavailable``, ``unknown`` and an entity that has vanished do NOT
        qualify, and this is the whole reason the check is written as "reads
        present" rather than "does not read missing". A sensor going quiet is
        not the water coming back, and a notice withdrawn on silence would
        assert exactly that -- while the message announcing it would be false
        at the instant it was sent.
        """
        sensor = self.water_supply_sensor(zone_id)
        if sensor is None:
            return True
        state = self.hass.states.get(sensor)
        return state is not None and state.state == _SUPPLY_PRESENT

    def _water_supply_entities(self) -> list[str]:
        """Every configured supply sensor, de-duplicated, in a stable order."""
        entity_ids: list[str] = []
        for zone_id in self.zones:
            sensor = self.water_supply_sensor(zone_id)
            if sensor is not None and sensor not in entity_ids:
                entity_ids.append(sensor)
        return entity_ids

    def _restore_supply_announcements(self) -> None:
        """Re-learn which outages were already announced, from their own notices.

        ``_supply_announced`` is memory of one runtime, and the issue registry
        is not: an entry reload builds a new runtime while every issue it
        created stays exactly where it was. Both halves of that were wrong.
        An outage still standing was announced a SECOND time -- a repeat push
        notification for a condition nothing re-detected, from a sensor that
        never changed -- and one that had ended while the entry was unloaded
        left its notice active for good, because the withdrawal is gated on
        having announced it and nothing remembered that we had. The leak side
        has ``_reconcile_leak_issues`` for exactly this reason; this is the
        same reconciliation from the other direction, restoring the edge
        detector instead of deleting what it no longer covers.

        ACTIVE issues only, which is what makes a reload and a restart differ
        correctly. Home Assistant restores a non-persistent issue as inactive
        -- invisible in Repairs, and carrying neither severity nor translation
        key -- so after a real restart nothing is restored here and the outage
        is confirmed again from the sensor's own ``last_changed``, which the
        restart has reset. That is the same safe direction the rest of this
        feature takes: after a restart we do not know how long the water has
        been gone, and we say so by looking again rather than by remembering.
        """
        prefix = self._water_supply_issue_id("")
        for (domain, issue_id), issue in ir.async_get(self.hass).issues.items():
            if domain == DOMAIN and issue.active and issue_id.startswith(prefix):
                self._supply_announced.add(issue_id.removeprefix(prefix))

    def _track_water_supply_sensors(self) -> None:
        """Watch every configured supply sensor; rebuilt on every config change.

        Rebuilt rather than added to, like the meters and the triggers, so a
        repointed sensor takes effect without a reload (§5).

        The re-evaluation that follows is what makes the notice honest in the
        two cases a subscription alone cannot cover: a supply already missing
        when Home Assistant starts has no transition left to make, and a sensor
        the user has just REMOVED would otherwise leave a repair notice with
        nothing behind it that could ever take it down.
        """
        if self._supply_tracker_unsub is not None:
            self._supply_tracker_unsub()
            self._supply_tracker_unsub = None
        entity_ids = self._water_supply_entities()
        if entity_ids:
            self._supply_tracker_unsub = async_track_state_change_event(
                self.hass, entity_ids, self._on_water_supply_sensor
            )
        self._cancel_supply_wakes()
        for zone_id in list(self._supply_announced - set(self.zones)):
            # A zone that has left the configuration cannot clear its own
            # notice: nothing subscribes for it any more and nothing will ever
            # evaluate it again. This is the only place it can be taken down.
            self._supply_announced.discard(zone_id)
            ir.async_delete_issue(self.hass, DOMAIN, self._water_supply_issue_id(zone_id))
        for zone_id in self.zones:
            self._evaluate_water_supply(zone_id)

    @callback
    def _on_water_supply_sensor(self, _event: Event[EventStateChangedData]) -> None:
        """Re-judge every zone, not only the one whose sensor moved.

        Two zones behind one supply sensor is an ordinary topology -- a single
        mains-pressure switch for the whole garden -- and mapping the entity
        back to its zones would be a second copy of a relation the zone configs
        already hold. Re-reading a handful of states costs nothing.
        """
        for zone_id in self.zones:
            self._evaluate_water_supply(zone_id)

    def _evaluate_water_supply(self, zone_id: str) -> None:
        """Announce a confirmed outage, and take the notice down when it ends.

        A supply anomaly, not a leak: it goes on the anomaly channel and gets
        its own repair. Routing it through the leak event would count an outage
        as a leak in every automation that consumes that stream, and the two
        are opposites -- one is water where it should not be, the other is no
        water at all.

        Announced only once the outage has been confirmed, on the same window
        that gates the refusal to start. Both assert "the supply is out" as a
        present fact, so both need the same evidence: a sensor flapping every
        half minute would otherwise produce a notification pair every half
        minute, which is the alarm fatigue the rest of this feature's design
        exists to prevent.

        Withdrawn promptly, with no window at all, because the water returning
        is itself the evidence -- and withdrawn only on evidence: see
        ``_water_supply_restored``.
        """
        self._cancel_supply_wake(zone_id)
        announced = zone_id in self._supply_announced
        remaining_s = self._water_supply_remaining_s(zone_id)
        if remaining_s is None:
            if announced and self._water_supply_restored(zone_id):
                self._withdraw_water_supply(zone_id)
            return
        if announced:
            return  # already said, and a standing condition says it once
        if remaining_s <= 0:
            self._announce_water_supply(zone_id)
            return
        # Nothing else fires when the window merely runs out -- the sensor has
        # already made the only state change it is going to make -- so ask to
        # be woken exactly then and judge again from live state.
        self._supply_wake_unsubs[zone_id] = async_call_later(
            self.hass, remaining_s, partial(self._on_supply_wake, zone_id)
        )

    @callback
    def _on_supply_wake(self, zone_id: str, _now: datetime) -> None:
        self._supply_wake_unsubs.pop(zone_id, None)
        self._evaluate_water_supply(zone_id)

    def _cancel_supply_wake(self, zone_id: str) -> None:
        unsub = self._supply_wake_unsubs.pop(zone_id, None)
        if unsub is not None:
            unsub()

    def _cancel_supply_wakes(self) -> None:
        for unsub in self._supply_wake_unsubs.values():
            unsub()
        self._supply_wake_unsubs.clear()

    def _announce_water_supply(self, zone_id: str) -> None:
        name = self._zone_name(zone_id)
        self._supply_announced.add(zone_id)
        _LOGGER.warning("No water supply reported for %s", name)
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            self._water_supply_issue_id(zone_id),
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="water_supply_missing",
            translation_placeholders={"zone": name},
        )
        # Present tense, and no promise about what happens next. The refusal
        # ends when the water returns, but it also ends if this sensor simply
        # goes quiet -- withholding water needs positive evidence that there is
        # none -- and a snapshot must not undertake to keep refusing.
        # "Cycles still start" was an assertion about the whole start decision
        # made from inside one gate, and it is false whenever another gate is
        # holding -- a close_and_block leak alarm above all, which is the state
        # a careful user produces by shutting the mains by hand. The gate being
        # off is still worth saying; what it entails is asked of the reader.
        if self.hub.require_water_supply:
            gate = " No new cycle starts for this zone."
        elif reasons := self._start_block_reasons(zone_id):
            gate = (
                " The water-supply gate is switched off, so this alone refuses "
                f"nothing -- but new cycles are blocked anyway: {reasons}."
            )
        else:
            gate = " Cycles still start: the water-supply gate is switched off."
        self._notify_water_supply(
            f"{name}: no water supply -- the zone's sensor reports the water is gone.{gate}"
        )

    def _withdraw_water_supply(self, zone_id: str) -> None:
        """The notice comes down, and the message says which of the two ended it.

        A sensor the user removed is not the water coming back, and one
        message for both would be false in the second case -- the same defect
        the leak notices were corrected for.
        """
        name = self._zone_name(zone_id)
        self._supply_announced.discard(zone_id)
        _LOGGER.warning("The no-water condition has ended for %s", name)
        ir.async_delete_issue(self.hass, DOMAIN, self._water_supply_issue_id(zone_id))
        if self.water_supply_sensor(zone_id) is not None:
            ended = f"{name}: the water supply is back."
        else:
            ended = (
                f"{name}: the water-supply sensor has been removed, so the "
                "missing supply is no longer reported."
            )
        # The third consumer, found by sweeping rather than by being reported.
        # "no longer refused FOR LACK OF WATER" was already scoped to its own
        # feature and so was never false -- but a reader takes it for
        # resumption, and it is read at exactly the moment another gate is most
        # likely to be holding: the water coming back is what a user does after
        # dealing with the leak that made them shut the mains.
        if not self.hub.require_water_supply:
            resumed = ""
        elif reasons := self._start_block_reasons(zone_id):
            resumed = (
                " Cycles are no longer refused for lack of water, but they are "
                f"still blocked: {reasons}."
            )
        else:
            resumed = " Cycles are no longer refused for lack of water."
        self._notify_water_supply(f"{ended}{resumed}")

    def _notify_water_supply(self, message: str) -> None:
        """One supply notice. The callers are callbacks; they cannot await."""
        self.entry.async_create_background_task(
            self.hass,
            self.notify_anomaly(message),
            name="irrigation_maestro_water_supply",
        )
        self.dispatch_update()

    @staticmethod
    def _water_supply_issue_id(zone_id: str) -> str:
        return f"water_supply_missing_{zone_id}"

    # Consumption -------------------------------------------------------------------

    def add_consumption(
        self, zone: ZoneRuntime, liters: float, *, minutes: float, had_usable_unit: bool
    ) -> None:
        """Close out a cycle's accounting for a zone with no usable meter.

        Metered litres are already in the ledger, continuously: adding them
        again here would count the same water twice. What is left is the
        estimate for a zone that has nothing to integrate -- which is a
        property of whether a meter is usable right now, not of whether this
        particular cycle happened to measure zero litres. Those are not the
        same thing: a no-flow interrupt on a zone with a perfectly usable
        meter measures a real, true zero, and booking the nominal estimate on
        top of it would put a false number on zone_water_total, a
        device_class: water / total_increasing sensor the user has chosen to
        expose on HA's own Water dashboard -- precisely the kind of
        plausible-but-false number this feature exists to remove. ``liters``
        is accepted (session.py's call site is fixed) but no longer
        consulted: usability, not this cycle's tally, decides.

        ``had_usable_unit`` is the run's own frozen answer
        (``FlowMonitor.had_usable_unit``), not a live re-read via
        ``zone_flow_meter_usable``: this is called after the valve close and
        after the monitor's own ``stop()``, a gap in which the unit can
        resolve or stop resolving without ever having mattered to the litres
        this run actually put into the ledger. A zone with no meter at all
        (no monitor was ever built) passes False here, same as before.
        """
        if had_usable_unit:
            return
        if zone.config.nominal_flow_lpm is None:
            return
        self.accountant.record_estimate(zone.config.zone_id, zone.config.nominal_flow_lpm * minutes)

    # Trackers -----------------------------------------------------------------------

    def _start_trackers(self) -> None:
        # Daily-maximum temperature tracking (persisted, restart-safe).
        self._tracker_unsubs.append(
            async_track_time_change(
                self.hass,
                self._track_temp,
                minute=list(range(0, 60, _TEMP_TRACK_MINUTES)),
                second=0,
            )
        )
        # Hourly stage-and-commit rain estimation at minute 55 (only used
        # without a physical rain sensor).
        self._tracker_unsubs.append(
            async_track_time_change(self.hass, self._stage_commit, minute=55, second=0)
        )
        # Midnight housekeeping.
        self._tracker_unsubs.append(
            async_track_time_change(self.hass, self._midnight, hour=0, minute=5, second=0)
        )
        if self.hub.rain_sensor:
            self._tracker_unsubs.append(
                async_track_state_change_event(
                    self.hass, [self.hub.rain_sensor], self._on_rain_sensor
                )
            )
        self._track_flow_sensors()

    def _flow_sensor_entities(self) -> list[str]:
        """Every configured meter, de-duplicated, in a stable order.

        Truthiness, not ``is not None``, and for the same reason as
        flow_reader_for: an empty string is a reachable way of saying "no
        meter", and subscribing to it would bind a listener to nothing.
        """
        entity_ids: list[str] = []
        for zone in self.zones.values():
            if zone.config.flow_sensor and zone.config.flow_sensor not in entity_ids:
                entity_ids.append(zone.config.flow_sensor)
        if self.hub.line_flow_sensor and self.hub.line_flow_sensor not in entity_ids:
            entity_ids.append(self.hub.line_flow_sensor)
        return entity_ids

    def _track_flow_sensors(self) -> None:
        """Watch every configured meter's state; rebuilt on every config change.

        A meter's live state feeds two things that have no other reason to
        re-run: the zone's declared degradation (rendered only on
        SIGNAL_UPDATE, since the entities do not poll) and the rescale notice.
        Without this subscription a meter that appears *after* setup -- the
        normal case for Zigbee/MQTT, whose restored states are written at
        EVENT_HOMEASSISTANT_START, i.e. after the config entries are set up --
        leaves a perfectly good meter accused of having no usable unit, and
        leaves the upgrade notice unfired on the very install it exists for.

        Rebuilt rather than added to, like _schedule_triggers, so repointing a
        zone's meter takes effect without a reload (§5). The accountant's own
        ledgers are rebuilt here too, at the end, so a config change updates
        both together -- WaterAccountant.rebuild() diffs rather than dropping
        every ledger, so a meter this change did not touch keeps its running
        total and its live subscriptions.
        """
        if self._flow_tracker_unsub is not None:
            self._flow_tracker_unsub()
            self._flow_tracker_unsub = None
        entity_ids = self._flow_sensor_entities()
        if entity_ids:
            self._flow_tracker_unsub = async_track_state_change_event(
                self.hass, entity_ids, self._on_flow_sensor
            )
        self.accountant.rebuild()

    @callback
    def _on_flow_sensor(self, event: Event[EventStateChangedData]) -> None:
        """A meter appeared, vanished, or changed the unit it declares.

        Filtered on the declared unit, not on the event: both consumers depend
        on the unit the reader resolves and on nothing else -- a running
        cycle's litres come from the meter's ledger, which the reader feeds
        continuously, not from this signal. A meter reporting every second
        would otherwise re-render every entity of the integration and rewrite
        the issue registry at 1 Hz, all to reach the same two conclusions.

        Both consumers re-read live state themselves, so this only has to tell
        them to look again.
        """
        if _declared_unit(event.data["old_state"]) == _declared_unit(event.data["new_state"]):
            return
        self.dispatch_update()
        self._report_rescaled_flow_meters()

    @callback
    def _track_temp(self, _now: Any) -> None:
        value = self._current_outdoor_temp()
        if value is None:
            return
        self.state.record_temp(dt_util.now().date(), value)
        self.state.schedule_save()

    def _current_outdoor_temp(self) -> float | None:
        if self.hub.outdoor_temp_sensor:
            state = self.hass.states.get(self.hub.outdoor_temp_sensor)
            if state is not None and state.state not in ("unavailable", "unknown"):
                try:
                    return float(state.state)
                except ValueError:
                    return None
            return None
        state = self.hass.states.get(self.hub.weather_entity)
        if state is None:
            return None
        try:
            return float(state.attributes.get("temperature"))
        except (TypeError, ValueError):
            return None

    @callback
    def _stage_commit(self, _now: Any) -> None:
        if self.hub.rain_sensor is not None:
            return
        self.entry.async_create_background_task(
            self.hass, self._async_stage_commit(), name="irrigation_maestro_stage"
        )

    async def _async_stage_commit(self) -> None:
        today = dt_util.now().date()
        self.state.commit_staging(today, self.hub.engine_params)
        snapshot = await self.weather.async_snapshot(dt_util.utcnow())
        if snapshot is not None and snapshot.hourly:
            self.state.set_staging(
                min(snapshot.next_hour_mm, self.hub.engine_params.hourly_staging_cap_mm)
            )
        self.state.schedule_save()
        self.dispatch_update()

    @callback
    def _on_rain_sensor(self, event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        if new_state is None or new_state.state in ("unavailable", "unknown"):
            return
        try:
            value = float(new_state.state)
        except ValueError:
            return
        self.state.set_rain_total(dt_util.now().date(), value, self.hub.engine_params)
        self.state.schedule_save()

    @callback
    def _midnight(self, _now: Any) -> None:
        today = dt_util.now().date()
        self.state.prune(today)
        self.state.prune_water(today)
        self.state.schedule_save()
        self.dispatch_update()

    # Misc -----------------------------------------------------------------------------

    def fire_event(self, event: str, payload: dict[str, Any]) -> None:
        self.hass.bus.async_fire(f"{DOMAIN}_{event}", payload)

    def dispatch_update(self) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATE, self.entry.entry_id)

    async def async_save_state(self) -> None:
        await self.state.async_save()
