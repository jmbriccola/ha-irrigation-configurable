"""The run log's own store: its own file, its own limits, its own counter."""

import asyncio
from datetime import UTC, datetime

from custom_components.irrigation_maestro.engine import runlog
from custom_components.irrigation_maestro.runtime import IrrigationRuntime
from custom_components.irrigation_maestro.storage import RunLogStore
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


def _entry(hour: int, day: int = 16) -> runlog.RunEntry:
    return runlog.build_entry(
        at=datetime(2026, 8, day, hour, 0, tzinfo=UTC),
        zone_id="z1",
        zone_name="Vasi",
        program_id="p1",
        program_name="Mattino",
        result="completed",
        reason_key=None,
        duration_min=12,
        volume_l=40.0,
        partial=False,
        scheduled=True,
    )


async def test_a_fresh_store_is_empty_and_has_dropped_nothing(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()

    assert store.entries == []
    assert store.cap_dropped == 0
    assert store.oldest_at() is None


async def test_appending_keeps_append_order(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()

    store.append(_entry(6))
    store.append(_entry(7))

    assert [run["at"] for run in store.entries] == [
        "2026-08-16T06:00:00+00:00",
        "2026-08-16T07:00:00+00:00",
    ]
    assert store.oldest_at() == "2026-08-16T06:00:00+00:00"


def _fill_to_cap(store: RunLogStore) -> None:
    """Seed a full log directly.

    Appending MAX_RUNS entries one at a time would copy the list 8000 times for
    no extra coverage: append_run's own cap behaviour is proved in
    tests/engine/test_runlog.py against a small max_runs. What is under test
    here is that the counter accumulates and persists.
    """
    store._data["runs"] = [
        _entry(0) | {"at": f"2026-08-16T00:{index // 60:02d}:{index % 60:02d}+00:00"}
        for index in range(runlog.MAX_RUNS)
    ]


async def test_the_cap_accumulates_into_a_monotonic_counter(hass: HomeAssistant) -> None:
    """The counter is the only thing that later tells a truncated log apart
    from a young one -- both have an oldest entry newer than a caller's start."""
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    _fill_to_cap(store)

    store.append(_entry(6, day=17))
    store.append(_entry(7, day=17))
    store.append(_entry(8, day=17))

    assert len(store.entries) == runlog.MAX_RUNS
    assert store.cap_dropped == 3


async def test_prune_drops_what_precedes_the_cutoff(hass: HomeAssistant) -> None:
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    store.append(_entry(6, day=1))
    store.append(_entry(6, day=16))

    store.prune(datetime(2026, 8, 10, tzinfo=UTC))

    assert [run["at"] for run in store.entries] == ["2026-08-16T06:00:00+00:00"]


async def test_entries_and_the_counter_both_survive_a_reload(hass: HomeAssistant) -> None:
    """cap_dropped must persist, or the truncation flag would go false on
    every reboot."""
    store = RunLogStore(hass, "entry1")
    await store.async_load()
    _fill_to_cap(store)
    store.append(_entry(6, day=17))
    await store.async_save()

    reloaded = RunLogStore(hass, "entry1")
    await reloaded.async_load()

    assert len(reloaded.entries) == runlog.MAX_RUNS
    assert reloaded.cap_dropped == 1


async def test_the_run_log_uses_a_file_of_its_own(hass: HomeAssistant) -> None:
    """Not a section of the state store: that one is rewritten on every meter
    sample, and this series reaches megabytes."""
    store = RunLogStore(hass, "entry1")

    assert store.store_key == "irrigation_maestro.runs.entry1"


# ---------------------------------------------------------------------------
# Through the runtime: record_run_outcome is the single writer, and these
# drive it rather than the store, so that claim is what is under test.
# ---------------------------------------------------------------------------


def _runtime(hass: HomeAssistant) -> IrrigationRuntime:
    entry = hass.config_entries.async_entries("irrigation_maestro")[0]
    return entry.runtime_data


async def test_program_name_is_none_for_an_unknown_zone_or_program(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The write-time lookup record_run_outcome feeds -- no session needed,
    just the two branches ZoneConfig.cycle() collapses _program_name onto."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert runtime._program_name("nope", "nope") is None
    assert runtime._program_name(zone_id, "nope") is None


async def test_a_completed_run_lands_in_the_log_with_its_minutes_and_litres(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])

    await advance(hass, freezer, 2400, step=10.0)

    entries = _runtime(hass).run_log.entries
    completed = [entry for entry in entries if entry["result"] == "completed"]
    assert completed, f"no completed run recorded, log holds {entries}"
    assert completed[-1]["zone_name"] == "Vasi"
    assert completed[-1]["program_name"] == "Morning"
    assert completed[-1]["scheduled"] is True
    assert "duration_min" in completed[-1]
    assert "reason_key" not in completed[-1]


async def test_a_skip_records_the_reason_the_component_would_otherwise_forget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """outcome_log keeps a bare result string for four days. This is the only
    place the *why* survives."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    # Rain enough to make the budget sufficient: the zone is skipped, not run.
    mock_weather(hass, condition="rainy", temp=14.0)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])

    await advance(hass, freezer, 2400, step=10.0)

    skipped = [entry for entry in _runtime(hass).run_log.entries if entry["result"] == "skipped"]
    assert skipped, "no skip recorded"
    assert skipped[-1]["reason_key"]
    assert "duration_min" not in skipped[-1]
    assert "volume_l" not in skipped[-1]


async def test_a_manual_run_is_recorded_as_unscheduled(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59", minutes=1.0)])
    zone_id = next(iter(entry.subentries))

    await hass.services.async_call(
        "irrigation_maestro", "run_zone", {"zone_id": zone_id}, blocking=True
    )
    await advance(hass, freezer, 300, step=10.0)

    entries = _runtime(hass).run_log.entries
    assert entries, "no run recorded"
    assert entries[-1]["scheduled"] is False


async def test_removing_a_zone_leaves_its_runs_with_the_name_it_had(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The daily water history keeps a removed zone's litres for the same
    reason: deleting them would rewrite past months."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])
    zone_id = next(iter(entry.subentries))
    await advance(hass, freezer, 2400, step=10.0)
    before = len(_runtime(hass).run_log.entries)
    assert before > 0

    await hass.services.async_call(
        "irrigation_maestro", "remove_zone", {"zone_id": zone_id}, blocking=True
    )
    await hass.async_block_till_done()

    entries = _runtime(hass).run_log.entries
    assert len(entries) >= before
    assert entries[0]["zone_name"] == "Vasi"


async def test_an_outcome_recorded_inside_the_debounce_survives_a_config_entry_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """async_shutdown must flush both stores, not just the state one.

    A full Home Assistant stop is safe: Store registers an
    EVENT_HOMEASSISTANT_FINAL_WRITE listener for it. A config-entry reload --
    a HACS update, a disable/re-enable, an async_reload -- is not: it runs
    async_shutdown and nothing else. This records an outcome and reloads with
    no advance() in between, so the run log's 10-second debounced save has
    not fired -- exactly the window a real reload can land in. The entry must
    still be there afterwards, or a reload silently loses it from the run log
    while it survives in state.outcome_log: two persisted records of one
    event disagreeing across a restart.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", "valve.vasi", minutes=1.0)])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    cycle_id = next(iter(runtime.zones[zone_id].config.cycles)).cycle_id

    runtime.record_run_outcome(
        zone_id=zone_id,
        zone_name="Vasi",
        cycle_id=cycle_id,
        result="completed",
        minutes=12,
        liters=40.0,
    )
    assert runtime.run_log.entries, "outcome not recorded before reload"

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    reloaded = entry.runtime_data
    assert reloaded.run_log.entries, "the run log lost its entry across a reload"
    assert reloaded.run_log.entries[-1]["zone_name"] == "Vasi"


async def test_midnight_prunes_the_run_log(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.vasi")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Vasi", "valve.vasi", at="23:59", minutes=1.0)])
    runtime = _runtime(hass)
    runtime.run_log.append(
        runlog.build_entry(
            at=datetime(2020, 1, 1, tzinfo=UTC),
            zone_id="gone",
            zone_name="Old",
            program_id="p",
            program_name=None,
            result="completed",
            reason_key=None,
            duration_min=1,
            volume_l=None,
            partial=False,
            scheduled=True,
        )
    )
    assert any(entry["zone_id"] == "gone" for entry in runtime.run_log.entries)

    runtime._midnight(None)
    await asyncio.sleep(0)

    assert not any(entry["zone_id"] == "gone" for entry in runtime.run_log.entries)
