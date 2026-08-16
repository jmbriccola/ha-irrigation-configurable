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
    ],
)
def test_the_hub_settings_services_declare_exactly_what_they_accept(
    service: str, schema: Any
) -> None:
    assert _schema_fields(schema) == _yaml_fields(service)


def test_every_event_list_in_services_yaml_is_complete() -> None:
    raw = yaml.safe_load(_SERVICES_YAML.read_text(encoding="utf-8"))
    found = 0
    for service in raw.values():
        # A service with no fields at all (run_all, stop_all, ...) parses as
        # None, not {} -- yaml.safe_load drops the mapping entirely rather
        # than giving it an empty one.
        for field in ((service or {}).get("fields") or {}).values():
            options = (field.get("selector") or {}).get("select", {}).get("options")
            if not options:
                continue
            values = {option if isinstance(option, str) else option["value"] for option in options}
            if values & set(ALL_EVENTS):
                found += 1
                assert values >= set(ALL_EVENTS), f"incomplete event list: {values}"
    assert found >= 3, f"expected at least three event lists, found {found}"
