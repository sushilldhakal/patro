"""Observer location for sunrise / udaya tithi calculations."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ObserverLocation:
    lat: float = 27.7172
    lon: float = 85.3240
    timezone: str = "Asia/Kathmandu"
    name: str = "Kathmandu"

    def cache_key(self) -> str:
        return f"{self.lat:.4f}_{self.lon:.4f}_{self.timezone}"

    def as_dict(self) -> dict:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "timezone": self.timezone,
            "name": self.name,
        }


DEFAULT_LOCATION = ObserverLocation()


def resolve_location(
    lat: float | None = None,
    lon: float | None = None,
    timezone: str | None = None,
) -> ObserverLocation:
    """Build observer location; omitted fields fall back to Kathmandu defaults."""
    if lat is None and lon is None and timezone is None:
        return DEFAULT_LOCATION

    resolved_lat = DEFAULT_LOCATION.lat if lat is None else lat
    resolved_lon = DEFAULT_LOCATION.lon if lon is None else lon
    resolved_tz = DEFAULT_LOCATION.timezone if timezone is None else timezone

    if not (-90 <= resolved_lat <= 90):
        raise ValueError("lat must be between -90 and 90")
    if not (-180 <= resolved_lon <= 180):
        raise ValueError("lon must be between -180 and 180")

    name = DEFAULT_LOCATION.name
    if lat is not None or lon is not None or (timezone is not None and timezone != DEFAULT_LOCATION.timezone):
        name = "custom"

    return ObserverLocation(
        lat=resolved_lat,
        lon=resolved_lon,
        timezone=resolved_tz,
        name=name,
    )
