"""Observer location for sunrise / udaya tithi calculations."""

from __future__ import annotations

from dataclasses import dataclass

from engine.astronomy.timescale import normalize_observer_timezone


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

# Reference location for the *candidate day-list* of a sāit listing — the days
# whose geocentric angas (tithi/nakṣatra/yoga/karaṇa, sun/planet rāśis, the lunar
# month) qualify. Those are the same at a given instant everywhere, and across
# Nepal's one +5:45 timezone the local-sunrise sampling barely shifts, so the
# candidate set is effectively city-independent — computing it once here lets
# every city share one cached list instead of re-scanning 365 days.
#
# This does NOT flatten the dates to one city: the muhūrta *lagna windows* are
# still recomputed at the viewer's own location (see get_sait_detail), and any
# candidate day that has no clean window there drops out. So the window times —
# and the resulting per-city date list — remain location-specific; only the
# expensive geocentric scan is reused. (The deterministic Vās categories — rudri
# / agni — are purely geocentric, so their lists are identical for every city.)
SAIT_LIST_LOCATION = DEFAULT_LOCATION


def _snap_to_nearest_city_enabled() -> bool:
    import os

    return os.environ.get("SNAP_TO_NEAREST_CITY", "true").lower() not in {"0", "false", "no"}


def resolve_location(
    lat: float | None = None,
    lon: float | None = None,
    timezone: str | None = None,
    *,
    name: str | None = None,
    country: str | None = None,
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

    # Snap raw coordinates to a ~1.1 km grid (2 decimals) so many phones in one
    # spot collapse to a single cache bucket. This is the coarse fallback for
    # coordinates with no nearby town; requests near a town are snapped to that
    # town's id upstream (see resolve_location_from_query). 0.01° of longitude is
    # ~2.4 s of solar time, so grid-snapping shifts sunrise by only a few seconds.
    resolved_lat = round(resolved_lat, 2)
    resolved_lon = round(resolved_lon, 2)
    resolved_tz = normalize_observer_timezone(
        resolved_tz, lat=resolved_lat, lon=resolved_lon, country=country,
    )

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

    if base_lat is None and base_lon is None and base_tz is None:
        return DEFAULT_LOCATION

    loc = resolve_location(
        lat=base_lat,
        lon=base_lon,
        timezone=base_tz,
        name=base_name,
        country=country,
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
