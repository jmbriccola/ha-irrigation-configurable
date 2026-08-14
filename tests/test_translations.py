"""Guard en.json and it.json against key-set drift.

Nothing under `custom_components` cross-checks the two locale files against
each other: hassfest validates the English source against a schema, it does
not compare it against sibling locales. An implementer and reviewers have
had to check this parity by hand more than once; this test automates it.

Key *order* is deliberately not asserted here: unlike the card's en.ts/it.ts
(where insertion order is a documented convention enforced by its own test),
no such convention exists for these JSON files.
"""

import json
from pathlib import Path
from typing import Any

TRANSLATIONS_DIR = (
    Path(__file__).parent.parent / "custom_components" / "irrigation_maestro" / "translations"
)


def _flatten_keys(data: dict[str, Any], prefix: str = "") -> set[str]:
    """Return the dotted path of every leaf key in a nested translation dict."""
    keys: set[str] = set()
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys |= _flatten_keys(value, path)
        else:
            keys.add(path)
    return keys


def test_en_and_it_translations_have_the_same_keys() -> None:
    en = json.loads((TRANSLATIONS_DIR / "en.json").read_text(encoding="utf-8"))
    it = json.loads((TRANSLATIONS_DIR / "it.json").read_text(encoding="utf-8"))

    en_keys = _flatten_keys(en)
    it_keys = _flatten_keys(it)

    missing_from_it = sorted(en_keys - it_keys)
    extra_in_it = sorted(it_keys - en_keys)

    assert not missing_from_it, f"Keys in en.json but missing from it.json: {missing_from_it}"
    assert not extra_in_it, f"Keys in it.json but missing from en.json: {extra_in_it}"


def test_the_zone_override_conflict_message_still_supplies_its_own_noun() -> None:
    """Regression: a placeholder is plain string substitution, never a word.

    A round of fixes once replaced the bare zone names {first}/{second} with
    pre-formatted Python labels ("zone Alpha") to make room for a second
    claimant shape (the hub), and dropped "zone"/"zona" from both templates
    to avoid saying it twice. That silently broke the Italian wording for
    the common zone-vs-zone case, which had been correct: the English word
    "zone" ended up embedded in the Italian sentence, in the exact spot
    "zona" used to be. A test that only checks the repair issue exists,
    without reading what the template actually says, would not catch this --
    which is exactly how it slipped through review once already. The fix
    puts the noun back in the template, in each language, and gives the
    hub-claimant shape (flow_unit_override_conflict_line) its own template
    instead of trying to share this one.
    """
    en = json.loads((TRANSLATIONS_DIR / "en.json").read_text(encoding="utf-8"))
    it = json.loads((TRANSLATIONS_DIR / "it.json").read_text(encoding="utf-8"))

    en_desc = en["issues"]["flow_unit_override_conflict"]["description"]
    it_desc = it["issues"]["flow_unit_override_conflict"]["description"]

    assert "zone {first}" in en_desc
    assert "zone {second}" in en_desc
    assert "zona {first}" in it_desc
    assert "zona {second}" in it_desc


def test_the_flow_meter_translations_say_flussometro_never_a_synonym() -> None:
    """Terminology rule: in Italian, a flow meter is "flussometro", always --
    never "contatore di portata", "misuratore di portata", or any other
    synonym. "Contatore" alone is reserved for an actual counter."""
    it = json.loads((TRANSLATIONS_DIR / "it.json").read_text(encoding="utf-8"))

    for key in (
        "flow_unit_unknown",
        "flow_unit_corrected",
        "flow_unit_override_conflict",
        "flow_unit_override_conflict_line",
    ):
        issue = it["issues"][key]
        text = issue["title"] + " " + issue["description"]
        # Stem, not the exact singular: "flussometro" and "flussometri" (the
        # plural, used where a message names more than one) both count.
        assert "flussometr" in text, f"{key} does not mention 'flussometro'"
        assert "contatore di portata" not in text
        assert "misuratore di portata" not in text
