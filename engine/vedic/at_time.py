"""Ephemeris-mode panchanga at an arbitrary civil instant."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from engine.astronomy.engine import SIDM_LAHIRI as AYANAMSA_LAHIRI
from engine.astronomy.lagna import lagna_service
from engine.astronomy.location import ObserverLocation
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.planets import spashta_table
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import as_julian_day
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
    from engine.astronomy.ut_instant import UtInstant, parse_local_wall_iso

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


def build_panchanga_at_time(
    instant_local: datetime,
    location: ObserverLocation,
    *,
    ayanamsa: int | None = None,
) -> dict[str, Any]:
    """Ephemeris-mode panchanga: full udaya day layout + instant angas/planets."""
    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    from engine.astronomy.jd_calendar import CivilDay, date_if_supported
    from engine.vedic.bikram_sambat import gregorian_to_bs
    from services.panchanga_api import build_daily_state, build_daily_state_civil

    anchor, sunrise_utc, sunset_utc, next_sunrise_utc = resolve_vedic_day_anchor(
        instant_local, location
    )
    instant_utc = instant_local.astimezone(timezone.utc)
    tz = location.timezone

    vara = panchanga_service.vara(as_julian_day(sunrise_utc), tz)
    vaara_num, vaara_sanskrit, vaara_english = (
        vara["number"], vara["name"], vara["english"]
    )
    angas = build_instant_anga_snapshot(
        instant_utc, sunrise_utc, ayanamsa=mode, timezone_name=location.timezone
    )
    muhurta = build_muhurta_block(sunrise_utc, sunset_utc, vaara_num, tz)
    instant_jd = as_julian_day(instant_utc)
    instant_planets = spashta_table(instant_jd, ayanamsa=mode)
    instant_lagna = lagna_service.lagna(
        instant_jd, lat=location.lat, lon=location.lon, ayanamsa=mode
    )
    instant_lagna["anchor"] = "instant"
    enrich_snapshot_astro(
        instant_planets, instant_lagna, instant_utc, lat=location.lat, lon=location.lon
    )
    from engine.vedic.upagraha import build_upagraha_block

    upagrahas = build_upagraha_block(
        instant_utc,
        sunrise_utc,
        sunset_utc,
        next_sunrise_utc,
        vaara_num,
        instant_planets["sun"]["longitude"],
        lat=location.lat,
        lon=location.lon,
        ayanamsa=mode,
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
    if isinstance(anchor, CivilDay) and date_if_supported(
        anchor.year, anchor.month, anchor.day
    ) is None:
        bs_y, bs_m, bs_d = gregorian_to_bs(anchor)
        state = build_daily_state_civil(
            anchor,
            location,
            patro_bs_year=bs_y,
            patro_bs_month=bs_m,
            patro_bs_day=bs_d,
            include_festivals=True,
            include_detail=True,
        )
    else:
        greg_anchor = anchor.to_date() if isinstance(anchor, CivilDay) else anchor
        state = build_daily_state(
            greg_anchor,
            location,
            include_festivals=True,
            include_detail=True,
        )
    detail = dict(state.get("detail") or {})

    # Instant overlays for cards + graha row; keep daily spans in detail for chart tracks.
    detail["planets"] = instant_planets
    detail["planets_anchor"] = planets_anchor
    detail["muhurta_now"] = muhurta_now
    detail["instant_lagna"] = instant_lagna
    detail["lagna_spans"] = lagna_spans
    if upagrahas is not None:
        detail["upagrahas"] = upagrahas

    state.update(
        {
            "mode": "ephemeris",
            # Overrides the "sunrise" the udaya day state carried: the moving
            # angas below were re-read at the queried instant, not at sunrise.
            "anchor": "instant",
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
            "planets": instant_planets,
            "planets_anchor": planets_anchor,
            "muhurta_now": muhurta_now,
            "detail": detail,
        }
    )
    return state


def build_panchanga_civil_day(
    greg: date,
    location: ObserverLocation,
    *,
    ayanamsa: int | None = None,
) -> dict[str, Any]:
    """Civil-day (midnight→midnight) panchanga: full civil-date state with the
    reference-moment angas recomputed at **00:00 of ``greg``**.

    The default daily state is anchored at sunrise (udaya). This variant keeps
    every property that belongs to the calendar date itself — festivals, ritu,
    ayana, samvatsara, sun/moon times, weekday, muhurta, choghadiya, hora — but
    re-reads the *moving* angas (तिथि/नक्षत्र/योग/करण, chandra/surya rashi, lagna,
    tara/chandra bala, panchaka) at local midnight, and re-projects the day-window
    spans (lagna, chandra-rashi, nakshatra-pada) onto midnight→next-midnight. This
    keeps the page's headline values consistent with the दिन-रात chart, which is
    also midnight-anchored.
    """
    from engine.astronomy.rashi import rashi_service
    from engine.vedic.lagna_spans import build_lagna_spans
    from engine.vedic.pushkara_navamsha import enrich_lagna_spans_with_pushkara
    from engine.vedic.rashi_spans import (
        build_chandra_rashi_spans,
        build_nakshatra_pada_spans,
    )
    from engine.vedic.balam_panchaka import (
        build_chandrabalam,
        build_panchaka_rahita,
        build_tarabalam,
        build_udaya_lagna,
    )
    from engine.vedic.navatara import build_chandrabalam_table, build_tarabala_table
    from engine.vedic.daily import _paksha_block
    from services.panchanga_api import _element_state, build_daily_state

    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    tz = resolve_observer_timezone(
        location.timezone, lat=location.lat, lon=location.lon
    )
    # Midnight is BOTH the reference moment and the ghati/day origin in this mode
    # — the span builders use their first argument as the elapsed-time origin and
    # the day-window start, and format local `*_local_time_short` from the passed
    # datetime's tzinfo, so we hand them observer-local-aware bounds to keep every
    # displayed clock in local time (not UTC) and every "भोलि/पर्सि" day-offset
    # counted from midnight (the FE mirrors this with a midnight origin).
    midnight_local = datetime(greg.year, greg.month, greg.day, tzinfo=tz)
    next_midnight_local = midnight_local + timedelta(days=1)
    midnight_utc = midnight_local.astimezone(timezone.utc)

    # Civil-date base — festivals / ritu / ayana / samvat / sun-moon / weekday etc.
    state = build_daily_state(
        greg, location, include_festivals=True, include_detail=True
    )
    detail = dict(state.get("detail") or {})
    vaara_num = int((detail.get("vaara") or {}).get("number") or 0)
    lunar = detail.get("lunar_month") or {}

    # Point angas at local midnight; midnight is the ghati origin so an anga that
    # ends before sunrise reads as "today HH:MM", not tomorrow.
    angas = build_instant_anga_snapshot(
        midnight_local, midnight_local, ayanamsa=mode, timezone_name=location.timezone
    )
    nak_block = angas["nakshatra"]
    tithi_info = calculate_tithi(midnight_utc)
    paksha = _paksha_block(lunar, tithi_info["paksha"])
    midnight_jd = as_julian_day(midnight_utc)
    chandra_rashi = rashi_service.chandra(midnight_jd)
    surya_rashi = rashi_service.surya(midnight_jd)
    lagna = lagna_service.lagna(
        midnight_jd, lat=location.lat, lon=location.lon, ayanamsa=mode
    )

    # Day-window spans over midnight → next midnight (local-aware bounds).
    lagna_spans = build_lagna_spans(
        midnight_local,
        next_midnight_local,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
        ayanamsa=mode,
    )
    lagna_spans = enrich_lagna_spans_with_pushkara(
        lagna_spans,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
        ayanamsa=mode,
    )
    tz_name = location.timezone
    chandra_rashi_spans = build_chandra_rashi_spans(
        midnight_local, next_midnight_local, tz_name
    )
    nakshatra_pada_spans = build_nakshatra_pada_spans(
        midnight_local, next_midnight_local, tz_name
    )

    # Derived balam / panchaka from the midnight references (origin = midnight).
    tarabalam = build_tarabalam(midnight_local, nak_block, tz_name)
    chandrabalam = build_chandrabalam(midnight_local, chandra_rashi_spans, tz_name)
    tarabala_table = build_tarabala_table(nak_block)
    chandrabala_table = build_chandrabalam_table(chandra_rashi)
    panchaka_rahita = build_panchaka_rahita(midnight_local, lagna_spans, vaara_num, tz_name)
    udaya_lagna = build_udaya_lagna(lagna_spans)

    # Overlay onto the detail (raw daily payload shape the FE reads first).
    detail.update(
        {
            "tithi": angas["tithi"],
            "nakshatra": angas["nakshatra"],
            "yoga": angas["yoga"],
            "karana": angas["karana"],
            "paksha": paksha,
            "chandra_rashi": chandra_rashi,
            "surya_rashi": surya_rashi,
            "chandra_rashi_spans": chandra_rashi_spans,
            "nakshatra_pada_spans": nakshatra_pada_spans,
            "lagna": lagna,
            "lagna_spans": lagna_spans,
            "udaya_lagna": udaya_lagna,
            "tarabalam": tarabalam,
            "chandrabalam": chandrabalam,
            "tarabala_table": tarabala_table,
            "chandrabala_table": chandrabala_table,
            "panchaka_rahita": panchaka_rahita,
        }
    )

    # Overlay the mapped top-level fields build_daily_state exposes.
    state.update(
        {
            "mode": "civil",
            "boundary": "midnight",
            # Same override as the instant path: the moving angas here were
            # re-read at local midnight, not at the udaya day's sunrise.
            "anchor": "midnight",
            "panchanga_date_ad": greg.isoformat(),
            "tithi": _element_state(angas["tithi"], location.timezone),
            "nakshatra": _element_state(angas["nakshatra"], location.timezone),
            "yoga": _element_state(angas["yoga"], location.timezone),
            "karana": _element_state(angas["karana"], location.timezone),
            "paksha": paksha["label_en"],
            "paksha_ne": paksha["label_ne"],
            "chandra_rashi": chandra_rashi["name"],
            "chandra_rashi_ne": chandra_rashi["name_ne"],
            "surya_rashi": surya_rashi["name"],
            "surya_rashi_ne": surya_rashi["name_ne"],
            "lagna": lagna["name"],
            "lagna_ne": lagna["name_ne"],
            "lagna_spans": lagna_spans,
            "udaya_lagna": udaya_lagna,
            "tarabala_table": tarabala_table,
            "chandrabala_table": chandrabala_table,
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
    instant = parse_clock_on_date(
        clock, greg, timezone_name=location.timezone, lat=location.lat, lon=location.lon,
    )
    snap = build_panchanga_at_time(instant, location)
    bs_day = gregorian_to_bs(greg)[2]
    row: dict[str, Any] = {
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
    abhijit = snap.get("abhijit") or (snap.get("muhurta") or {}).get("abhijit")
    if isinstance(abhijit, dict) and abhijit.get("start_time") and abhijit.get("end_time"):
        row["abhijit"] = {
            "start_time": abhijit["start_time"],
            "end_time": abhijit["end_time"],
            **({"solar_noon": abhijit["solar_noon"]} if abhijit.get("solar_noon") else {}),
        }
    return row
