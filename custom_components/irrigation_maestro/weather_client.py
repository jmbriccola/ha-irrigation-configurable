"""Weather snapshot: one forecast fetch per irrigation session (§2).

The client reads the weather entity's current attributes, calls
``weather.get_forecasts`` (hourly, with a daily fallback and a conservative
estimate) and produces a frozen snapshot shared by every zone of the session.
The last good snapshot is kept for the stale-weather policy.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from homeassistant.util.unit_conversion import SpeedConverter

from .models import HubConfig

_LOGGER = logging.getLogger(__name__)

_UNCERTAIN = ("unavailable", "unknown", None)


@dataclass(frozen=True, slots=True)
class WeatherSnapshot:
    """Everything the engine needs from the weather, frozen at fetch time."""

    at: datetime
    condition: str | None
    current_temp: float | None
    wind_kmh: float | None
    today_forecast_max: float | None
    tomorrow_max: float | None
    rain_0_24: float
    rain_24_48: float
    next_hour_mm: float
    hourly: bool
    stale: bool = False


def _as_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class WeatherClient:
    """Fetches and caches weather snapshots for one hub."""

    def __init__(self, hass: HomeAssistant, hub_getter: Callable[[], HubConfig]) -> None:
        self._hass = hass
        self._hub_getter = hub_getter
        self.last_snapshot: WeatherSnapshot | None = None

    async def async_snapshot(self, now: datetime) -> WeatherSnapshot | None:
        """A fresh snapshot, the stale one within policy, or None."""
        hub = self._hub_getter()
        snapshot = await self._fetch(now, hub)
        if snapshot is not None:
            self.last_snapshot = snapshot
            return snapshot
        last = self.last_snapshot
        if last is not None and now - last.at <= timedelta(hours=hub.stale_weather_max_h):
            return replace(last, stale=True)
        return None

    async def _fetch(self, now: datetime, hub: HubConfig) -> WeatherSnapshot | None:
        state = self._hass.states.get(hub.weather_entity)
        if state is None or state.state in _UNCERTAIN:
            return None
        condition = state.state
        current_temp = _as_float(state.attributes.get("temperature"))
        wind_kmh = self._wind_kmh(state.attributes)

        forecast = await self._get_forecast(hub.weather_entity, "hourly")
        if forecast:
            parsed = self._parse_hourly(forecast, now)
        else:
            forecast = await self._get_forecast(hub.weather_entity, "daily")
            if not forecast:
                return None
            parsed = self._parse_daily(forecast, now)

        return WeatherSnapshot(
            at=now,
            condition=condition,
            current_temp=current_temp,
            wind_kmh=wind_kmh,
            **parsed,
        )

    async def _get_forecast(self, entity_id: str, forecast_type: str) -> list[dict[str, Any]]:
        try:
            response = await self._hass.services.async_call(
                "weather",
                "get_forecasts",
                {"entity_id": entity_id, "type": forecast_type},
                blocking=True,
                return_response=True,
            )
        except Exception:
            _LOGGER.warning("weather.get_forecasts (%s) failed", forecast_type, exc_info=True)
            return []
        if not isinstance(response, dict):
            return []
        entry = response.get(entity_id)
        if not isinstance(entry, dict):
            return []
        forecast = entry.get("forecast")
        if not isinstance(forecast, list):
            return []
        return [item for item in forecast if isinstance(item, dict)]

    def _wind_kmh(self, attributes: dict[str, Any]) -> float | None:
        speed = _as_float(attributes.get("wind_speed"))
        if speed is None:
            return None
        unit = attributes.get("wind_speed_unit") or "km/h"
        if unit == "km/h":
            return speed
        try:
            return SpeedConverter.convert(speed, unit, "km/h")
        except Exception:
            return None

    def _parse_hourly(self, forecast: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
        local_now = dt_util.as_local(now)
        today = local_now.date()
        tomorrow = today + timedelta(days=1)
        next_hour_start = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)

        today_max: float | None = None
        tomorrow_max: float | None = None
        rain_0_24 = 0.0
        rain_24_48 = 0.0
        next_hour_mm = 0.0

        for item in forecast:
            when = dt_util.parse_datetime(str(item.get("datetime")))
            if when is None:
                continue
            when = dt_util.as_utc(when)
            temp = _as_float(item.get("temperature"))
            rain = _as_float(item.get("precipitation")) or 0.0
            local_day = dt_util.as_local(when).date()
            if temp is not None and when >= now:
                if local_day == today:
                    today_max = temp if today_max is None else max(today_max, temp)
                elif local_day == tomorrow:
                    tomorrow_max = temp if tomorrow_max is None else max(tomorrow_max, temp)
            if now < when <= now + timedelta(hours=24):
                rain_0_24 += rain
            elif now + timedelta(hours=24) < when <= now + timedelta(hours=48):
                rain_24_48 += rain
            if when == next_hour_start:
                next_hour_mm = rain
        return {
            "today_forecast_max": today_max,
            "tomorrow_max": tomorrow_max,
            "rain_0_24": round(rain_0_24, 1),
            "rain_24_48": round(rain_24_48, 1),
            "next_hour_mm": next_hour_mm,
            "hourly": True,
        }

    def _parse_daily(self, forecast: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
        """Conservative estimate from a daily forecast (degradation path).

        Today's remaining rain is prorated by the hours left in the day; the
        hourly staging estimator is disabled (next_hour_mm = 0).
        """
        local_now = dt_util.as_local(now)
        today = local_now.date()
        tomorrow = today + timedelta(days=1)
        today_max: float | None = None
        tomorrow_max: float | None = None
        rain_today = 0.0
        rain_tomorrow = 0.0
        for item in forecast:
            when = dt_util.parse_datetime(str(item.get("datetime")))
            if when is None:
                continue
            local_day = dt_util.as_local(dt_util.as_utc(when)).date()
            temp = _as_float(item.get("temperature"))
            rain = _as_float(item.get("precipitation")) or 0.0
            if local_day == today:
                today_max = temp
                rain_today = rain
            elif local_day == tomorrow:
                tomorrow_max = temp
                rain_tomorrow = rain
        hours_left = max(24 - local_now.hour, 0)
        return {
            "today_forecast_max": today_max,
            "tomorrow_max": tomorrow_max,
            "rain_0_24": round(
                rain_today * hours_left / 24 + rain_tomorrow * (1 - hours_left / 24), 1
            ),
            "rain_24_48": round(rain_tomorrow * hours_left / 24, 1),
            "next_hour_mm": 0.0,
            "hourly": False,
        }
