"""services.yaml keeps three copies of the notification event list.

A key missing from one of them is unpickable in Developer Tools while the
service still accepts it -- a silent, one-sided divergence that nothing
caught before this test.
"""

from pathlib import Path

import yaml
from custom_components.irrigation_maestro.notify import ALL_EVENTS


def test_every_event_list_in_services_yaml_is_complete() -> None:
    raw = yaml.safe_load(
        (
            Path(__file__).parents[2] / "custom_components/irrigation_maestro/services.yaml"
        ).read_text(encoding="utf-8")
    )
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
