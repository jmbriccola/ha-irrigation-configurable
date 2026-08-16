"""The run log's arithmetic: what an entry omits, and what the two limits drop."""

from datetime import UTC, datetime

from custom_components.irrigation_maestro.engine import runlog


def _at(hour: int, day: int = 16) -> datetime:
    return datetime(2026, 8, day, hour, 0, tzinfo=UTC)


def _entry(hour: int, day: int = 16, **overrides: object) -> runlog.RunEntry:
    fields: dict[str, object] = {
        "at": _at(hour, day),
        "zone_id": "z1",
        "zone_name": "Vasi",
        "program_id": "p1",
        "program_name": "Mattino",
        "result": "completed",
        "reason_key": None,
        "duration_min": 12,
        "volume_l": 40.0,
        "partial": False,
        "scheduled": True,
    }
    fields.update(overrides)
    return runlog.build_entry(**fields)  # type: ignore[arg-type]


def test_an_entry_omits_every_optional_field_that_has_nothing_to_say() -> None:
    """A skip has no duration and no litres; null would cost bytes to say nothing."""
    entry = _entry(
        6, result="skipped", reason_key="budget_sufficient", duration_min=None, volume_l=None
    )

    assert entry == {
        "at": "2026-08-16T06:00:00+00:00",
        "zone_id": "z1",
        "zone_name": "Vasi",
        "program_id": "p1",
        "program_name": "Mattino",
        "result": "skipped",
        "reason_key": "budget_sufficient",
        "scheduled": True,
    }


def test_partial_is_stored_only_when_true() -> None:
    assert "partial" not in _entry(6)
    assert _entry(6, partial=True)["partial"] is True


def test_a_program_that_no_longer_exists_records_no_name_rather_than_raising() -> None:
    assert "program_name" not in _entry(6, program_name=None)


def test_append_below_the_cap_drops_nothing() -> None:
    runs, dropped = runlog.append_run([_entry(6)], _entry(7), max_runs=10)

    assert dropped == 0
    assert [run["at"] for run in runs] == [
        "2026-08-16T06:00:00+00:00",
        "2026-08-16T07:00:00+00:00",
    ]


def test_the_cap_drops_from_the_head_and_reports_how_many() -> None:
    """Oldest first, so the survivors are the newest -- and the count is what
    later tells a capped log apart from a young one."""
    runs, dropped = runlog.append_run([_entry(6), _entry(7)], _entry(8), max_runs=2)

    assert dropped == 1
    assert [run["at"] for run in runs] == [
        "2026-08-16T07:00:00+00:00",
        "2026-08-16T08:00:00+00:00",
    ]


def test_prune_keeps_the_boundary_instant_and_drops_what_precedes_it() -> None:
    runs = [_entry(6, day=1), _entry(6, day=10), _entry(6, day=16)]

    kept = runlog.prune_runs(runs, _at(6, day=10))

    assert [run["at"] for run in kept] == [
        "2026-08-10T06:00:00+00:00",
        "2026-08-16T06:00:00+00:00",
    ]


def test_prune_of_an_empty_log_is_empty_not_an_error() -> None:
    assert runlog.prune_runs([], _at(6)) == []


def test_prune_that_removes_everything_returns_an_empty_list() -> None:
    assert runlog.prune_runs([_entry(6, day=1)], _at(6, day=10)) == []


def test_select_is_half_open_so_the_last_local_day_is_included_whole() -> None:
    runs = [_entry(6, day=15), _entry(6, day=16), _entry(6, day=17)]

    selected, truncated = runlog.select_runs(
        runs, start_at=_at(0, day=16), end_at=_at(0, day=17), limit=100
    )

    assert truncated is False
    assert [run["at"] for run in selected] == ["2026-08-16T06:00:00+00:00"]


def test_the_exclusive_end_instant_is_excluded_and_the_inclusive_start_is_not() -> None:
    """Both edges, exactly. The window is half-open, and nothing else in this
    file places an entry ON either boundary -- so `<` reads as correct while
    being unpinned, which is how an off-by-one survives a green suite."""
    runs = [_entry(0, day=16), _entry(0, day=17)]  # exactly start_at, exactly end_at

    selected, _ = runlog.select_runs(
        runs, start_at=_at(0, day=16), end_at=_at(0, day=17), limit=100
    )

    assert [run["at"] for run in selected] == ["2026-08-16T00:00:00+00:00"]


def test_select_filters_by_zone_and_by_result_together() -> None:
    runs = [
        _entry(6, zone_id="z1", result="completed"),
        _entry(7, zone_id="z1", result="skipped", duration_min=None, volume_l=None),
        _entry(8, zone_id="z2", result="skipped", duration_min=None, volume_l=None),
    ]

    selected, _ = runlog.select_runs(
        runs,
        start_at=_at(0),
        end_at=_at(0, day=17),
        zone_ids=frozenset({"z1"}),
        results=frozenset({"skipped"}),
        limit=100,
    )

    assert [run["at"] for run in selected] == ["2026-08-16T07:00:00+00:00"]


def test_the_limit_keeps_the_most_recent_and_says_so() -> None:
    """Truncating the newest would answer a question nobody asks."""
    runs = [_entry(6), _entry(7), _entry(8)]

    selected, truncated = runlog.select_runs(runs, start_at=_at(0), end_at=_at(0, day=17), limit=2)

    assert truncated is True
    assert [run["at"] for run in selected] == [
        "2026-08-16T07:00:00+00:00",
        "2026-08-16T08:00:00+00:00",
    ]


def test_a_selection_that_exactly_fills_the_limit_is_not_truncated() -> None:
    selected, truncated = runlog.select_runs(
        [_entry(6), _entry(7)], start_at=_at(0), end_at=_at(0, day=17), limit=2
    )

    assert truncated is False
    assert len(selected) == 2


def test_oldest_at_reads_the_head_and_is_none_for_an_empty_log() -> None:
    assert runlog.oldest_at([]) is None
    assert runlog.oldest_at([_entry(6), _entry(7)]) == "2026-08-16T06:00:00+00:00"
