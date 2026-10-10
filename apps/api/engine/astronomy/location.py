"""Observer location for sunrise / udaya tithi calculations."""

from __future__ import annotations

from dataclasses import dataclass

from engine.astronomy.timescale import normalize_observer_timezone


# Sea level. The default every observer has always had — before this field
# existed, ``sun.default_altitude`` returned 0.0 for every latitude/longitude,
# deliberately (see its docstring). Declaring it here makes the model the single
# source of that default; ``sun.default_altitude`` now defers to it.
DEFAULT_ALTITUDE = 0.0

# Lowest habitable land on Earth is the Dead Sea shore at ~−430 m; anything
# below this is a unit error (feet, or a sign flip) rather than an observer.
# No upper bound: the horizon-dip formula is monotonic, and a caller asking for
# an aircraft or summit horizon should get one.
MIN_ALTITUDE_M = -500.0


@dataclass(frozen=True)
class ObserverLocation:
    """Where the observer stands.

    Two groups of fields, and they must not be mixed:

    **Astronomy** — ``lat``, ``lon``, ``altitude``. These, plus a UT instant, are
    the entire physical input to a rise/set or ascendant calculation. They are
    passed to swisseph as ``geopos``.

    **Civil display** — ``timezone``. Used to render an instant as a wall clock,
    and (legitimately) to pick the local-midnight anchor a rise/set search starts
    from. Never a physical input.

    ``name`` and ``city_id`` are identity/display only.

    ``altitude`` is metres above sea level and defaults to 0.0 — sea level, which
    is what every observer got before the field existed, via
    ``sun.default_altitude``. It is **not** the terrain elevation of the place:
    see that function's docstring for why Kathmandu's real 1400 m is the wrong
    number for a valley ringed by hills. Supply it only when the sea-cliff
    horizon dip is genuinely what you want.
    """

    lat: float = 27.7172
    lon: float = 85.3240
    timezone: str = "Asia/Kathmandu"
    name: str = "Kathmandu"
    city_id: int | None = None
    # Appended last, deliberately: every construction site in the tree uses
    # keyword arguments, but a trailing defaulted field is safe even if one
    # did not.
    altitude: float = 0.0

    def cache_key(self) -> str:
        """Stable identity for cache paths and DB keys.

        The altitude suffix is **conditional** so that every key produced before
        the field existed stays byte-identical: altitude was a constant 0.0 for
        every observer, so folding it in unconditionally would orphan every
        cached artifact while adding no discriminating power. A non-default
        altitude is a physically different observer (a 1400 m horizon dip moves
        sunrise ~7 minutes) and does get its own bucket.
        """
        base = f"{self.lat:.4f}_{self.lon:.4f}_{self.timezone}"
        if self.altitude != DEFAULT_ALTITUDE:
            return f"{base}_alt{self.altitude:.1f}"
        return base

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
    altitude: float | None = None,
) -> ObserverLocation:
    """Build observer location; omitted fields fall back to Kathmandu defaults."""
    if lat is None and lon is None and timezone is None and name is None and altitude is None:
        return DEFAULT_LOCATION

    resolved_lat = DEFAULT_LOCATION.lat if lat is None else lat
    resolved_lon = DEFAULT_LOCATION.lon if lon is None else lon
    resolved_tz = DEFAULT_LOCATION.timezone if timezone is None else timezone
    resolved_alt = DEFAULT_ALTITUDE if altitude is None else float(altitude)

    if not (-90 <= resolved_lat <= 90):
        raise ValueError("lat must be between -90 and 90")
    if not (-180 <= resolved_lon <= 180):
        raise ValueError("lon must be between -180 and 180")
    if resolved_alt < MIN_ALTITUDE_M:
        raise ValueError(f"altitude must be at or above {MIN_ALTITUDE_M} m")

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
        altitude=resolved_alt,
    )


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
