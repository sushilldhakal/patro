"""Ephemeris-mode panchanga at an arbitrary civil instant."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from engine.astronomy.location import ObserverLocation
from engine.astronomy.positions import get_lagna, get_vaara
from engine.astronomy.swiss_eph import (
    calculate_sunrise,
    calculate_sunset,
    get_all_planetary_positions,
)
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs
from engine.vedic.daily import _time_block
from engine.vedic.element_boundaries import (
    build_karana_block,
    build_nakshatra_block,
    build_tithi_block,
    build_yoga_block,
)
from engine.vedic.muhurta import (
    build_muhurta_block,
    compute_abhijit_muhurta,
    compute_gulika,
    compute_rahu_kalam,
    compute_yamaganda,
)
from engine.vedic.names_ne import VAARA_NAMES_NE
from engine.vedic.tithi import calculate_tithi


def parse_query_datetime(
    raw: str | None,
    *,
    timezone_name: str,
) -> datetime:
    """Parse ISO datetime; naive values use the observer timezone; omit for now."""
    tz = resolve_observer_timezone(timezone_name)
    if not raw:
        return datetime.now(tz)
    text = raw.strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def parse_clock_on_date(clock: str, greg: date, *, timezone_name: str) -> datetime:
    """Apply HH:MM (or HH:MM:SS) on a civil date in the observer timezone."""
    tz = resolve_observer_timezone(timezone_name)
    parts = clock.strip().split(":")
    if len(parts) < 2:
        raise ValueError("clock must be HH:MM or HH:MM:SS")
    hour = int(parts[0])
    minute = int(parts[1])
    second = int(parts[2]) if len(parts) > 2 else 0
    return datetime.combine(greg, time(hour, minute, second), tzinfo=tz)


def resolve_vedic_day_anchor(
    instant_local: datetime,
    location: ObserverLocation,
) -> tuple[date, datetime, datetime, datetime]:
    """
    Panchanga day = sunrise → next sunrise.

    Instants before today's sunrise belong to the previous vedic day.
    Returns (anchor_date, sunrise_utc, sunset_utc, next_sunrise_utc).
    """
    tz = resolve_observer_timezone(location.timezone)
    local = instant_local.astimezone(tz)
    civil = local.date()
    sunrise_today = calculate_sunrise(
        civil,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    ).astimezone(tz)

    if local < sunrise_today:
        anchor = civil - timedelta(days=1)
    else:
        anchor = civil

    sunrise_utc = calculate_sunrise(
        anchor,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    sunset_utc = calculate_sunset(
        anchor,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    next_sunrise_utc = calculate_sunrise(
        anchor + timedelta(days=1),
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    return anchor, sunrise_utc, sunset_utc, next_sunrise_utc


def _parse_window_bounds(block: dict[str, Any], tz: ZoneInfo) -> tuple[datetime, datetime]:
    start = datetime.fromisoformat(block["start_local"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(block["end_local"].replace("Z", "+00:00"))
    if start.tzinfo is None:
        start = start.replace(tzinfo=tz)
    if end.tzinfo is None:
        end = end.replace(tzinfo=tz)
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
        start, end = _parse_window_bounds(block, tz)
        result[key] = {
            **block,
            "active": start <= local < end,
        }
    return result


def build_instant_anga_snapshot(
    instant_utc: datetime,
    sunrise_utc: datetime,
) -> dict[str, Any]:
    """Tithi / nakshatra / yoga / karana running at instant with span boundaries."""
    tithi_info = calculate_tithi(instant_utc)
    return {
        "tithi": build_tithi_block(instant_utc, sunrise_utc, tithi_info),
        "nakshatra": build_nakshatra_block(instant_utc, sunrise_utc),
        "yoga": build_yoga_block(instant_utc, sunrise_utc),
        "karana": build_karana_block(instant_utc, sunrise_utc),
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
    from engine.astronomy.swiss_eph import AYANAMSA_LAHIRI

    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    planets = get_all_planetary_positions(instant_utc, ayanamsa=mode)
    lagna = get_lagna(instant_utc, lat=lat, lon=lon, ayanamsa=mode)
    enrich_snapshot_astro(planets, lagna, instant_utc, lat=lat, lon=lon)
    return {
        "planets": planets,
        "lagna": {**lagna, "anchor": "instant"},
        "computed_at": instant_utc.isoformat(),
    }


def build_panchanga_at_time(
    instant_local: datetime,
    location: ObserverLocation,
    *,
    ayanamsa: int | None = None,
) -> dict[str, Any]:
    """Ephemeris-mode panchanga: full udaya day layout + instant angas/planets."""
    from engine.astronomy.swiss_eph import AYANAMSA_LAHIRI

    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    from services.panchanga_api import build_daily_state

    anchor, sunrise_utc, sunset_utc, next_sunrise_utc = resolve_vedic_day_anchor(
        instant_local, location
    )
    instant_utc = instant_local.astimezone(timezone.utc)
    tz = location.timezone

    vaara_num, vaara_sanskrit, vaara_english = get_vaara(sunrise_utc, tz)
    angas = build_instant_anga_snapshot(instant_utc, sunrise_utc)
    muhurta = build_muhurta_block(sunrise_utc, sunset_utc, vaara_num, tz)
    instant_planets = get_all_planetary_positions(instant_utc, ayanamsa=mode)
    instant_lagna = get_lagna(
        instant_utc, lat=location.lat, lon=location.lon, ayanamsa=mode
    )
    instant_lagna["anchor"] = "instant"
    enrich_snapshot_astro(
        instant_planets, instant_lagna, instant_utc, lat=location.lat, lon=location.lon
    )
    muhurta_now = compute_muhurta_now(
        instant_local, sunrise_utc, sunset_utc, vaara_num, tz
    )
    from engine.vedic.lagna_spans import build_lagna_spans

    lagna_spans = build_lagna_spans(
        sunrise_utc,
        next_sunrise_utc,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
        ayanamsa=mode,
    )
    from engine.vedic.pushkara_navamsha import enrich_lagna_spans_with_pushkara

    lagna_spans = enrich_lagna_spans_with_pushkara(
        lagna_spans,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
        ayanamsa=mode,
    )
    planets_anchor = {
        "type": "instant",
        "local_time": instant_local.strftime("%H:%M"),
        "label_ne": "क्षणिक स्पष्टग्रह",
        "label_en": "Instantaneous positions",
    }

    # Full udaya day state for timeline, rashi spans, balam, festivals, etc.
    state = build_daily_state(
        anchor, location, include_festivals=True, include_detail=True
    )
    detail = dict(state.get("detail") or {})

    # Instant overlays for cards + graha row; keep daily spans in detail for chart tracks.
    detail["planets"] = instant_planets
    detail["planets_anchor"] = planets_anchor
    detail["muhurta_now"] = muhurta_now
    detail["instant_lagna"] = instant_lagna
    detail["lagna_spans"] = lagna_spans

    state.update(
        {
            "mode": "ephemeris",
            "query_instant": instant_local.isoformat(),
            "query_instant_local": instant_local.strftime("%Y-%m-%d %H:%M:%S"),
            "panchanga_date_ad": anchor.isoformat(),
            "before_sunrise_of_civil_day": instant_local.date() > anchor,
            "lagna_spans": lagna_spans,
            "tithi": angas["tithi"],
            "nakshatra": angas["nakshatra"],
            "yoga": angas["yoga"],
            "karana": angas["karana"],
            "lagna": instant_lagna.get("name") or state.get("lagna"),
            "lagna_ne": instant_lagna.get("name_ne") or state.get("lagna_ne"),
            "muhurta": muhurta,
            "planets_anchor": planets_anchor,
            "muhurta_now": muhurta_now,
            "detail": detail,
        }
    )
    return state


def instant_row_from_date(
    greg: date,
    clock: str,
    location: ObserverLocation,
) -> dict[str, Any]:
    """One month-grid row: panchanga elements at clock on greg."""
    instant = parse_clock_on_date(clock, greg, timezone_name=location.timezone)
    snap = build_panchanga_at_time(instant, location)
    bs_day = gregorian_to_bs(greg)[2]
    return {
        "day": bs_day,
        "date_ad": greg.isoformat(),
        "weekday": snap["vaara"]["name_ne"],
        "weekday_ne": snap["vaara"]["name_ne"],
        "weekday_en": snap["vaara"]["name_english"],
        "tithi": snap["tithi"]["name"],
        "tithi_ne": snap["tithi"].get("name_ne"),
        "nakshatra": snap["nakshatra"]["name"],
        "nakshatra_ne": snap["nakshatra"].get("name_ne"),
        "yoga": snap["yoga"]["name"],
        "yoga_ne": snap["yoga"].get("name_ne"),
        "karana": snap["karana"]["name"],
        "karana_ne": snap["karana"].get("name_ne"),
        "sunrise": snap["sunrise"]["local_time_short"],
        "sunset": snap["sunset"]["local_time_short"],
        "mode": "ephemeris",
        "query_instant": snap["query_instant"],
        "panchanga": snap,
    }
