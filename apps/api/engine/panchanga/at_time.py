"""Ephemeris-mode panchanga at an arbitrary civil instant."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from engine.astronomy.engine import SIDM_LAHIRI as AYANAMSA_LAHIRI
from engine.panchanga.lagna import lagna_service
from engine.astronomy.location import ObserverLocation
from engine.panchanga.spashta import spashta_table
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import UtInstant, as_julian_day
from engine.panchanga.element_boundaries import (
    build_karana_block,
    build_nakshatra_block,
    build_tithi_block,
    build_yoga_block,
)
from engine.panchanga.muhurta import (
    compute_abhijit_muhurta,
    compute_gulika,
    compute_rahu_kalam,
    compute_yamaganda,
)
from engine.panchanga.tithi import calculate_tithi


def parse_query_datetime(
    raw: str | None,
    *,
    timezone_name: str,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
) -> datetime:
    """Parse ISO datetime; naive values use the observer timezone; omit for now."""
    from engine.astronomy.ut_instant import UtInstant, format_ut_instant_local, parse_ephemeris_instant

    tz = resolve_observer_timezone(
        timezone_name, lat=lat, lon=lon, country=country,
    )
    if not raw:
        return datetime.now(tz)
    text = raw.strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        instant = parse_ephemeris_instant(text)
    except ValueError:
        instant = datetime.fromisoformat(text)
    if isinstance(instant, UtInstant):
        local = format_ut_instant_local(instant, timezone_name)["local"]
        # Re-parse as CE wall clock when possible; BCE falls back to anchor via expanded ISO.
        try:
            instant = parse_ephemeris_instant(local)
        except ValueError:
            instant = parse_ephemeris_instant(text)
    if isinstance(instant, UtInstant):
        # Last resort: UTC expanded instant as datetime (year may clamp — avoid for BCE callers).
        return datetime.fromisoformat(instant.isoformat())
    if instant.tzinfo is None:
        return instant.replace(tzinfo=tz)
    return instant.astimezone(tz)


def parse_clock_on_date(
    clock: str,
    greg: date,
    *,
    timezone_name: str,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
) -> datetime:
    """Apply HH:MM (or HH:MM:SS) on a civil date in the observer timezone."""
    from engine.astronomy.ut_instant import local_wall_instant

    tz = resolve_observer_timezone(
        timezone_name, lat=lat, lon=lon, country=country,
    )
    parts = clock.strip().split(":")
    if len(parts) < 2:
        raise ValueError("clock must be HH:MM or HH:MM:SS")
    hour = int(parts[0])
    minute = int(parts[1])
    second = int(parts[2]) if len(parts) > 2 else 0
    if isinstance(greg, date):
        return datetime.combine(greg, time(hour, minute, second), tzinfo=tz)
    # Pre-1 CE: resolve the same wall clock on the JD axis instead.
    return local_wall_instant(
        greg, timezone_name, hour=hour, minute=minute, second=second
    )


def resolve_vedic_day_anchor(
    instant_local: datetime,
    location: ObserverLocation,
) -> tuple[date, datetime, datetime, datetime]:
    """
    Panchanga day = sunrise → next sunrise.

    Instants before today's sunrise belong to the previous vedic day.
    Returns (anchor_date, sunrise_utc, sunset_utc, next_sunrise_utc).
    """
    from engine.astronomy.jd_calendar import CivilDay, civil_day_jd_from_date
    from engine.astronomy.sun import sun_service
    from engine.astronomy.ut_instant import UtInstant, local_civil_fields

    tz = resolve_observer_timezone(location.timezone, lat=location.lat, lon=location.lon)

    if isinstance(instant_local, UtInstant):
        fields = local_civil_fields(instant_local, location.timezone)
        civil = CivilDay(fields.year, fields.month, fields.day)
        local = instant_local
    else:
        local = instant_local.astimezone(tz)
        civil_raw = local.date()
        civil = (
            civil_raw
            if isinstance(civil_raw, date)
            else CivilDay(civil_raw.year, civil_raw.month, civil_raw.day)
        )

    # sun_service picks the CE or BCE rise helper from the JD, which is the
    # branch these two used to spell out by hand.
    def _day_jd(day: date | CivilDay) -> float:
        return (
            day.to_jd_ut()
            if isinstance(day, CivilDay)
            else civil_day_jd_from_date(day)
        )

    def _sunrise(day: date | CivilDay) -> datetime:
        return sun_service.sunrise(_day_jd(day), location)

    def _sunset(day: date | CivilDay) -> datetime:
        return sun_service.sunset(_day_jd(day), location)

    sunrise_today = _sunrise(civil).astimezone(tz)

    if local < sunrise_today:
        anchor = civil - timedelta(days=1)
    else:
        anchor = civil

    sunrise_utc = _sunrise(anchor)
    sunset_utc = _sunset(anchor)
    next_sunrise_utc = _sunrise(anchor + timedelta(days=1))
    return anchor, sunrise_utc, sunset_utc, next_sunrise_utc


def _parse_window_bounds(
    block: dict[str, Any],
    timezone_name: str,
) -> tuple[datetime | UtInstant, datetime | UtInstant]:
    from engine.astronomy.ut_instant import parse_local_wall_iso

    start = parse_local_wall_iso(block["start_local"], timezone_name)
    end = parse_local_wall_iso(block["end_local"], timezone_name)
    return start, end


def compute_muhurta_now(
    instant_local: datetime,
    sunrise_utc: datetime,
    sunset_utc: datetime,
    vaara_num: int,
    timezone_name: str,
) -> dict[str, Any]:
    """Whether Rahu Kalam / Yamaganda / Gulika / Abhijit is active at instant."""
    tz = resolve_observer_timezone(timezone_name)
    local = instant_local.astimezone(tz)

    windows = {
        "rahu_kalam": compute_rahu_kalam(sunrise_utc, sunset_utc, vaara_num, timezone_name),
        "yamaganda": compute_yamaganda(sunrise_utc, sunset_utc, vaara_num, timezone_name),
        "gulika": compute_gulika(sunrise_utc, sunset_utc, vaara_num, timezone_name),
        "abhijit": compute_abhijit_muhurta(sunrise_utc, sunset_utc, timezone_name),
    }

    result: dict[str, Any] = {}
    for key, block in windows.items():
        start, end = _parse_window_bounds(block, timezone_name)
        result[key] = {
            **block,
            "active": start <= local < end,
        }
    return result


def build_instant_anga_snapshot(
    instant_utc: datetime,
    sunrise_utc: datetime,
    *,
    ayanamsa: int | None = None,
    timezone_name: str | None = None,
) -> dict[str, Any]:
    """Tithi / nakshatra / yoga / karana running at instant with span boundaries.

    Nakshatra and yoga depend on the Moon's (and Sun's) *absolute* sidereal
    longitude, so they need the same ayanamsha used elsewhere in this
    request — tithi and karana depend only on the Sun-Moon elongation, which
    is ayanamsha-invariant, so they're left on the default.
    """
    tithi_info = calculate_tithi(instant_utc)
    return {
        "tithi": build_tithi_block(instant_utc, sunrise_utc, tithi_info, timezone_name),
        "nakshatra": build_nakshatra_block(
            instant_utc, sunrise_utc, ayanamsa=ayanamsa, timezone_name=timezone_name
        ),
        "yoga": build_yoga_block(
            instant_utc, sunrise_utc, ayanamsa=ayanamsa, timezone_name=timezone_name
        ),
        "karana": build_karana_block(instant_utc, sunrise_utc, timezone_name),
    }


def enrich_snapshot_astro(
    planets: dict[str, Any],
    lagna: dict[str, Any] | None,
    instant_utc: datetime,
    *,
    lat: float,
    lon: float,
) -> None:
    """Attach shara / right ascension / kranti (and lagna speed) in place.

    These are ayanamsha-independent equatorial values used by the graha
    details table; failures leave the snapshot without the extra fields.
    """
    from engine.astronomy.engine import EphemerisError, default_engine

    try:
        jd = default_engine.julian_day(instant_utc)
        for name, pos in planets.items():
            if isinstance(pos, dict):
                pos.update(default_engine.planet_astro_extras(jd, name))
        if lagna is not None:
            lagna.update(default_engine.ascendant_astro_extras(jd, lat, lon))
    except EphemerisError:
        pass


def build_planetary_snapshot(
    instant_utc: datetime,
    *,
    lat: float,
    lon: float,
    ayanamsa: int | None = None,
) -> dict[str, Any]:
    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    instant_jd = as_julian_day(instant_utc)
    planets = spashta_table(instant_jd, ayanamsa=mode)
    lagna = lagna_service.lagna(instant_jd, lat=lat, lon=lon, ayanamsa=mode)
    enrich_snapshot_astro(planets, lagna, instant_utc, lat=lat, lon=lon)
    from engine.astronomy.moon import moon_service

    return {
        "planets": planets,
        "lagna": {**lagna, "anchor": "instant"},
        "moon_phase": moon_service.phase(instant_jd),
        "anchor": "instant",
        "computed_at": instant_utc.isoformat(),
    }
