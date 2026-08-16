"""services.yaml keeps three copies of the notification event list.

A key missing from one of them is unpickable in Developer Tools while the
service still accepts it -- a silent, one-sided divergence that nothing
caught before this test.

The same one-sidedness applies to a field: accepting it in a schema and
declaring it in services.yaml are two distinct places, and a field present in
only one of them either cannot be picked or cannot be validated.
"""

from pathlib import Path
from typing import Any

import pytest
import voluptuous as vol
import yaml
from custom_components.irrigation_maestro import services
from custom_components.irrigation_maestro.notify import ALL_EVENTS

_SERVICES_YAML = Path(__file__).parents[2] / "custom_components/irrigation_maestro/services.yaml"


def _yaml_fields(service: str) -> set[str]:
    raw = yaml.safe_load(_SERVICES_YAML.read_text(encoding="utf-8"))
    return set((raw[service] or {}).get("fields") or {})


def _schema_fields(schema: vol.Schema) -> set[str]:
    """The field names a voluptuous mapping schema accepts."""
    return {str(getattr(key, "schema", key)) for key in schema.schema}


@pytest.mark.parametrize(
    ("service", "schema"),
    [
        ("set_session_limits", services._SET_SESSION_LIMITS_SCHEMA),
        ("set_valve_safety", services._SET_VALVE_SAFETY_SCHEMA),
        ("set_concurrency", services._SET_CONCURRENCY_SCHEMA),
        ("get_water_history", services._GET_WATER_HISTORY_SCHEMA),
        ("get_run_history", services._GET_RUN_HISTORY_SCHEMA),
    ],
)
def test_the_hub_settings_services_declare_exactly_what_they_accept(
    service: str, schema: Any
) -> None:
    assert _schema_fields(schema) == _yaml_fields(service)


def test_the_run_result_options_match_what_the_schema_accepts() -> None:
    """Three copies exist: session.py's RESULT_* (the source), _RUN_RESULTS (imported
    from it), and this select list, which YAML cannot import. A value in only one of
    them either cannot be picked or cannot be validated."""
    raw = yaml.safe_load(_SERVICES_YAML.read_text(encoding="utf-8"))
    options = raw["get_run_history"]["fields"]["result"]["selector"]["select"]["options"]
    values = {option if isinstance(option, str) else option["value"] for option in options}

    assert values == set(services._RUN_RESULTS)


def test_every_event_list_in_services_yaml_is_complete() -> None:
    """Complete, and reachable -- two failures, because they are different.

    A genuine event list is identified by field name, using the same constants
    the schemas use rather than a second written-out copy of them. But a check
    that only looks at known names cannot notice a NEW event field added under
    a name it has never seen, so a second assertion catches that one by shape:
    an event list offers the whole vocabulary, while an accidental coincidence
    does not. get_run_history's ``result`` options are the coincidence this
    guards against misreading -- completed/skipped/interrupted/cancelled are
    all four members of ALL_EVENTS, because session outcomes and notification
    events describe the same four things from two angles, and an overlap-any
    heuristic read that as an event list missing six entries.
    """
    raw = yaml.safe_load(_SERVICES_YAML.read_text(encoding="utf-8"))
    event_fields = {services.ATTR_EVENT, services.ATTR_EVENTS}
    found = 0
    for service_name, service in raw.items():
        # A service with no fields at all (run_all, stop_all, ...) parses as
        # None, not {} -- yaml.safe_load drops the mapping entirely rather
        # than giving it an empty one.
        for field_name, field in ((service or {}).get("fields") or {}).items():
            options = (field.get("selector") or {}).get("select", {}).get("options")
            if not options:
                continue
            values = {option if isinstance(option, str) else option["value"] for option in options}
            if field_name in event_fields:
                found += 1
                assert values >= set(ALL_EVENTS), f"incomplete event list: {values}"
                continue
            assert len(values & set(ALL_EVENTS)) <= len(ALL_EVENTS) // 2, (
                f"{service_name}.{field_name} offers most of the event vocabulary "
                f"but is not named {' or '.join(sorted(event_fields))}, so the "
                f"completeness check above never sees it"
            )
    assert found >= 3, f"expected at least three event lists, found {found}"
