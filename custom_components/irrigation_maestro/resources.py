"""Serve the bundled Lovelace card and register it as a resource.

The card ships inside ``custom_components/irrigation_maestro/frontend/`` (HACS
only distributes the integration folder). In storage mode the resource is
registered automatically with a version query parameter for cache busting; in
YAML mode the user adds it manually (documented in the README).
"""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import CARD_FILENAME, DOMAIN, FRONTEND_URL_BASE

_LOGGER = logging.getLogger(__name__)

_REGISTERED_KEY = f"{DOMAIN}_frontend_registered"


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the static path and (storage mode only) the Lovelace resource."""
    if hass.data.get(_REGISTERED_KEY):
        return
    hass.data[_REGISTERED_KEY] = True

    if not hasattr(hass, "http") or hass.http is None:
        _LOGGER.debug("HTTP component not available; card not served")
        return

    # Imported lazily: pulling in the http component at module import time
    # would fail in contexts where it is not loaded (e.g. unit tests). The
    # type: ignore covers HA versions that re-export StaticPathConfig without
    # listing it in the component's __all__ (mypy no-implicit-reexport);
    # warn_unused_ignores is disabled for this module (pyproject) so it stays
    # clean on versions where it IS exported.
    from homeassistant.components.http import (  # noqa: PLC0415
        StaticPathConfig,  # type: ignore[attr-defined]
    )

    integration = await async_get_integration(hass, DOMAIN)
    card_dir = integration.file_path / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_BASE, str(card_dir), cache_headers=False)]
    )

    version = integration.version or "0"
    url = f"{FRONTEND_URL_BASE}/{CARD_FILENAME}?v={version}"
    await _async_register_resource(hass, url)


def _lovelace_mode(lovelace: object) -> str | None:
    # LovelaceData grew a `resource_mode` attribute (older versions exposed
    # `mode`); support the whole 2025.7+ range.
    mode = getattr(lovelace, "resource_mode", None) or getattr(lovelace, "mode", None)
    if mode is None and isinstance(lovelace, dict):
        mode = lovelace.get("mode")
    return mode


async def _async_register_resource(hass: HomeAssistant, url: str) -> None:
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is None or _lovelace_mode(lovelace) != "storage":
        _LOGGER.info(
            "Lovelace is not in storage mode; add %s as a dashboard resource manually",
            url,
        )
        return
    try:
        if hasattr(resources, "loaded") and not resources.loaded:
            await resources.async_load()
        for item in resources.async_items():
            existing = item.get("url", "")
            if existing.startswith(f"{FRONTEND_URL_BASE}/{CARD_FILENAME}"):
                if existing != url:  # version changed: refresh for cache busting
                    await resources.async_update_item(item["id"], {"url": url})
                return
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("Registered Lovelace resource %s", url)
    except Exception:
        _LOGGER.exception("Could not register the Lovelace resource automatically")
