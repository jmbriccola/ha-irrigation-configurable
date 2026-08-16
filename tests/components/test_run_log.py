"""The run log's own store: its own file, its own limits, its own counter."""

from datetime import UTC, datetime

from custom_components.irrigation_maestro.engine import runlog
from custom_components.irrigation_maestro.storage import RunLogStore
from homeassistant.core import HomeAssistant


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
