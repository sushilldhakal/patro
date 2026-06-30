"""Observer location for sunrise / udaya tithi calculations."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ObserverLocation:
    lat: float = 27.7172
    lon: float = 85.3240
    timezone: str = "Asia/Kathmandu"
    name: str = "Kathmandu"
    city_id: int | None = None

    def cache_key(self) -> str:
        return f"{self.lat:.4f}_{self.lon:.4f}_{self.timezone}"

    def as_dict(self) -> dict:
        payload = {
            "lat": self.lat,
            "lon": self.lon,
            "timezone": self.timezone,
            "name": self.name,
        }
        if self.city_id is not None:
            payload["city_id"] = self.city_id
        return payload


DEFAULT_LOCATION = ObserverLocation()


def resolve_location(
    lat: float | None = None,
    lon: float | None = None,
    timezone: str | None = None,
    *,
    name: str | None = None,
) -> ObserverLocation:
    """Build observer location; omitted fields fall back to Kathmandu defaults."""
    if lat is None and lon is None and timezone is None and name is None:
        return DEFAULT_LOCATION

    resolved_lat = DEFAULT_LOCATION.lat if lat is None else lat
    resolved_lon = DEFAULT_LOCATION.lon if lon is None else lon
    resolved_tz = DEFAULT_LOCATION.timezone if timezone is None else timezone

    if not (-90 <= resolved_lat <= 90):
        raise ValueError("lat must be between -90 and 90")
    if not (-180 <= resolved_lon <= 180):
        raise ValueError("lon must be between -180 and 180")

    # Match cache_key precision (~11 m) so geolocation coords don't fragment cache rows.
    resolved_lat = round(resolved_lat, 4)
    resolved_lon = round(resolved_lon, 4)

    resolved_name = name or DEFAULT_LOCATION.name
    if name is None and (
        lat is not None or lon is not None or (timezone is not None and timezone != DEFAULT_LOCATION.timezone)
    ):
        resolved_name = "custom"

    return ObserverLocation(
        lat=resolved_lat,
        lon=resolved_lon,
        timezone=resolved_tz,
        name=resolved_name,
        city_id=None,
    )


def resolve_location_from_query(
    lat: float | None = None,
    lon: float | None = None,
    timezone: str | None = None,
    city: str | None = None,
    city_id: int | None = None,
) -> ObserverLocation:
    """
    Resolve observer location from explicit coordinates and/or GeoNames city lookup.

    City lookup supplies lat, lon, and IANA timezone; explicit query params override.
    """
    base_lat: float | None = lat
    base_lon: float | None = lon
    base_tz: str | None = timezone
    base_name: str | None = None
    resolved_city_id: int | None = city_id

    if city_id is not None or city:
        from services.cities_db import get_city_by_id, resolve_city

        row = get_city_by_id(city_id) if city_id is not None else resolve_city(city or "")
        if row is None:
            label = f"city_id={city_id}" if city_id is not None else f"city={city!r}"
            raise ValueError(f"City not found ({label})")
        resolved_city_id = row["id"]
        if lat is None:
            base_lat = row["lat"]
        if lon is None:
            base_lon = row["lon"]
        if timezone is None:
            base_tz = row.get("timezone") or DEFAULT_LOCATION.timezone
        base_name = row["ascii_name"] or row["name"]

    if base_lat is None and base_lon is None and base_tz is None:
        return DEFAULT_LOCATION

    loc = resolve_location(
        lat=base_lat,
        lon=base_lon,
        timezone=base_tz,
        name=base_name,
    )
    if resolved_city_id is not None:
        return ObserverLocation(
            lat=loc.lat,
            lon=loc.lon,
            timezone=loc.timezone,
            name=loc.name,
            city_id=resolved_city_id,
        )
    return loc
