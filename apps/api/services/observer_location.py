"""Observer location from a request: coordinates, a city name or a GeoNames id.

Geography application layer. The engine's ``resolve_location`` builds an
``ObserverLocation`` from coordinates alone; this module adds the city store in
front of it (lookup by id or name, and snapping raw GPS to the nearest town so
one town shares one cache key).
"""

from __future__ import annotations

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation, resolve_location


def _snap_to_nearest_city_enabled() -> bool:
    import os

    return os.environ.get("SNAP_TO_NEAREST_CITY", "true").lower() not in {"0", "false", "no"}


def resolve_location_from_query(
    lat: float | None = None,
    lon: float | None = None,
    timezone: str | None = None,
    city: str | None = None,
    city_id: int | None = None,
    altitude: float | None = None,
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
        country = row.get("country")
    else:
        country = None
        # Raw phone GPS: snap to the nearest town so everyone standing in that
        # town shares one cached computation (cache key becomes city:<id>). A
        # town's coordinates replace the metre-precise ones; coordinates with no
        # town in range fall through to resolve_location's coarse grid snap.
        if _snap_to_nearest_city_enabled() and lat is not None and lon is not None:
            from services.cities_db import nearest_city

            snapped = nearest_city(lat, lon)
            if snapped is not None:
                resolved_city_id = snapped["id"]
                base_lat = snapped["lat"]
                base_lon = snapped["lon"]
                if timezone is None:
                    base_tz = snapped.get("timezone") or DEFAULT_LOCATION.timezone
                base_name = snapped["ascii_name"] or snapped["name"]
                country = snapped.get("country")

    if base_lat is None and base_lon is None and base_tz is None and altitude is None:
        return DEFAULT_LOCATION

    loc = resolve_location(
        lat=base_lat,
        lon=base_lon,
        timezone=base_tz,
        name=base_name,
        country=country,
        altitude=altitude,
    )
    if resolved_city_id is not None:
        return ObserverLocation(
            lat=loc.lat,
            lon=loc.lon,
            timezone=loc.timezone,
            name=loc.name,
            city_id=resolved_city_id,
            altitude=loc.altitude,
        )
    return loc
