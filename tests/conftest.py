"""Shared test fixtures."""

import sys
from unittest.mock import MagicMock

import pytest


def pytest_configure(config: pytest.Config) -> None:
    """Configure pytest, mocking hass_frontend before any imports."""
    # Mock hass_frontend module that is required by the frontend component in HA tests.
    # This module is not installed in the test environment but is needed to set up
    # the frontend component, which is now a dependency of irrigation_maestro.
    sys.modules["hass_frontend"] = MagicMock()


@pytest.fixture(autouse=True)
def mock_hass_frontend_import() -> None:
    """Ensure hass_frontend is mocked for every test."""
    if "hass_frontend" not in sys.modules:
        sys.modules["hass_frontend"] = MagicMock()


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Enable loading custom integrations in all tests."""
    return
