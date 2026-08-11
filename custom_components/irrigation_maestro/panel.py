"""Register the Irrigation Maestro sidebar panel (custom panel)."""

from __future__ import annotations

import logging

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN, FRONTEND_URL_BASE, PANEL_FILENAME

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "irrigation"
PANEL_WEBCOMPONENT_NAME = "irrigation-maestro-panel"

_PANEL_REGISTERED_KEY = f"{DOMAIN}_panel_registered"


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the sidebar panel once per HA instance (idempotent).

    A registration failure (e.g. another integration already owns the
    "irrigation" url_path) must never abort the whole hub setup over a
    cosmetic sidebar panel — the dashboard card keeps working either way.
    """
    if hass.data.get(_PANEL_REGISTERED_KEY):
        return

    integration = await async_get_integration(hass, DOMAIN)
    version = integration.version or "0"
    try:
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=PANEL_WEBCOMPONENT_NAME,
            sidebar_title="Irrigazione",
            sidebar_icon="mdi:sprinkler-variant",
            module_url=f"{FRONTEND_URL_BASE}/{PANEL_FILENAME}?v={version}",
            embed_iframe=False,
            trust_external=False,
            require_admin=False,
        )
    except Exception:  # must not abort hub setup for a sidebar panel
        _LOGGER.warning(
            "Could not register the Irrigazione sidebar panel; "
            "the dashboard card remains available",
            exc_info=True,
        )
        return

    hass.data[_PANEL_REGISTERED_KEY] = True


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the sidebar panel (sync callback — never await)."""
    if not hass.data.pop(_PANEL_REGISTERED_KEY, False):
        return
    async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
