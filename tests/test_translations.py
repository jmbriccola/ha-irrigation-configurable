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
