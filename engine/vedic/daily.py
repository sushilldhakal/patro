"""Daily Panchanga builder — core of a Patro."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.swiss_eph import (
    calculate_moonrise_after,
    calculate_moonset_after,
    calculate_sunrise,
    calculate_sunset,
    get_all_planetary_positions,
    get_ayanamsa,
)
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import BS_MONTH_NAMES_NEPALI, bs_month_name, gregorian_to_bs
from engine.vedic.element_boundaries import (
    build_karana_block,
    build_nakshatra_block,
    build_tithi_block,
    build_yoga_block,
)
from engine.vedic.ghati_time import compute_dinamaan
from engine.vedic.solar_corrections import build_solar_corrections
from engine.vedic.lagna_spans import build_lagna_spans
from engine.vedic.balam_panchaka import (
    build_chandrabalam,
    build_panchaka_rahita,
    build_tarabalam,
    build_udaya_lagna,
)
from engine.vedic.rashi_spans import (
    build_chandra_rashi_spans,
    build_nakshatra_pada_spans,
    get_surya_nakshatra,
)
from engine.vedic.lunar_month import get_lunar_calendar_layers, merge_lunar_month_for_day
from engine.vedic.muhurta import build_muhurta_block
from engine.vedic.muhurta_timings import enrich_muhurta_block
from engine.vedic.nivas_shool import build_nivas_shool_block
from engine.vedic.names_ne import (
    PAKSHA_NAMES_NE,
    TITHI_NAMES_NE,
    VAARA_NAMES_NE,
    to_nepali_digits,
)
from engine.vedic.nepal_sambat import gregorian_to_ns
from engine.vedic.samvatsara import samvatsara_payload_for_bs_year
from engine.vedic.choghadiya import build_choghadiya, day_ghati_from_sun_times
from engine.vedic.hora import build_hora
from engine.vedic.navatara import build_chandrabalam_table, build_tarabala_table
from engine.vedic.tithi import calculate_tithi
from engine.astronomy.positions import (
    get_aayan,
    get_chandra_rashi,
    get_lagna,
    get_ritu,
    get_surya_rashi,
    get_vaara,
)


def _time_block(dt, timezone_name: str) -> dict[str, str] | None:
    if dt is None:
        return None
    local_tz = resolve_observer_timezone(timezone_name)
    local = dt.astimezone(local_tz)
    return {
        "utc": dt.isoformat(),
        "local": local.isoformat(),
        "local_time": local.strftime("%H:%M:%S"),
        "local_time_short": local.strftime("%H:%M"),
    }


def _tithi_name_ne(display: int, paksha: str) -> str:
    if display == 15:
        return "पूर्णिमा" if paksha == "shukla" else "औंसी"
    return TITHI_NAMES_NE[display - 1]


def _paksha_block(lunar: dict, paksha: str) -> dict:
    from engine.vedic.sankranti import BS_MONTH_NAMES

    month_name = lunar.get("name") or "Unknown"
    is_adhik = lunar.get("is_adhik", False)
    prefix = "अधिक " if is_adhik else ""
    try:
        month_ne = BS_MONTH_NAMES_NEPALI[BS_MONTH_NAMES.index(month_name)]
    except ValueError:
        month_ne = month_name

    paksha_ne = PAKSHA_NAMES_NE[paksha]
    label_ne = f"{prefix}{month_ne} {paksha_ne}"
    return {
        "name": paksha,
        "name_ne": paksha_ne,
        "lunar_month": month_name,
        "lunar_month_ne": month_ne,
        "is_adhik": is_adhik,
        "label_ne": label_ne,
        "label_en": f"{'Adhik ' if is_adhik else ''}{month_name} {paksha} paksha",
    }


def _display_headers(
    target: date,
    bs_year: int,
    bs_month: int,
    bs_day: int,
    vaara_english: str,
    ns_date: dict,
) -> dict:
    bs_month_ne = BS_MONTH_NAMES_NEPALI[bs_month - 1]
    vaara_ne = VAARA_NAMES_NE[(target.weekday() + 1) % 7]
    return {
        "bs_ne": (
            f"वि.सं. {to_nepali_digits(bs_year)} {bs_month_ne} "
            f"{to_nepali_digits(bs_day)} {vaara_ne}"
        ),
        "gregorian_en": target.strftime("%Y %b %-d, ") + vaara_english,
        "ns_ne": f"ने.सं. {to_nepali_digits(ns_date['year'])} {ns_date['label_ne']}",
    }


def build_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for one civil day at the observer location."""
    sunrise_utc = calculate_sunrise(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    sunset_utc = calculate_sunset(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    moonrise_utc = calculate_moonrise_after(
        sunrise_utc,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    moonset_utc = calculate_moonset_after(
        sunrise_utc,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )

    tithi_info = calculate_tithi(sunrise_utc)
    vaara_num, vaara_sanskrit, vaara_english = get_vaara(sunrise_utc, location.timezone)

    bs_year, bs_month, bs_day = gregorian_to_bs(target)

    display_tithi = tithi_info["display_number"]
    paksha = tithi_info["paksha"]
    tithi_name_ne = _tithi_name_ne(display_tithi, paksha)

    lunar = merge_lunar_month_for_day(target, paksha)

    ns_date = gregorian_to_ns(
        target,
        bs_year,
        tithi_display=display_tithi,
        tithi_absolute=tithi_info["number"],
        tithi_name_ne=tithi_name_ne,
        paksha=paksha,
        lunar_month_name=lunar.get("name"),
        is_adhik=lunar.get("is_adhik", False),
        location=location,
    )

    lahiri_ayanamsa = get_ayanamsa(sunrise_utc)
    dinamaan = compute_dinamaan(sunrise_utc, sunset_utc)

    muhurta = build_muhurta_block(sunrise_utc, sunset_utc, vaara_num, location.timezone)
    next_sunrise_utc = calculate_sunrise(
        target + timedelta(days=1),
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    weekday_py = sunrise_utc.astimezone(resolve_observer_timezone(location.timezone)).weekday()
    muhurta = enrich_muhurta_block(
        muhurta,
        sunrise_utc=sunrise_utc,
        sunset_utc=sunset_utc,
        next_sunrise_utc=next_sunrise_utc,
        vaara_index=vaara_num,
        weekday_py=weekday_py,
        timezone_name=location.timezone,
        tithi_info=tithi_info,
    )
    ratrimana = compute_dinamaan(sunset_utc, next_sunrise_utc)
    ritu_pauranik = get_ritu(
        sunrise_utc,
        sidereal=True,
        lat=location.lat,
        timezone_name=location.timezone,
    )
    ritu_vedic = get_ritu(
        sunrise_utc,
        sidereal=False,
        lat=location.lat,
        timezone_name=location.timezone,
    )
    aayan_pauranik = get_aayan(sunrise_utc, sidereal=True)
    aayan_vedic = get_aayan(sunrise_utc, sidereal=False)
    lagna_spans = build_lagna_spans(
        sunrise_utc,
        next_sunrise_utc,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
    )
    from engine.vedic.pushkara_navamsha import enrich_lagna_spans_with_pushkara

    lagna_spans = enrich_lagna_spans_with_pushkara(
        lagna_spans,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
    )
    chandra_rashi_spans = build_chandra_rashi_spans(sunrise_utc, next_sunrise_utc)
    nakshatra_pada_spans = build_nakshatra_pada_spans(sunrise_utc, next_sunrise_utc)
    surya_nakshatra = get_surya_nakshatra(sunrise_utc)
    nakshatra_block = build_nakshatra_block(sunrise_utc, sunrise_utc)
    chandrabalam = build_chandrabalam(sunrise_utc, chandra_rashi_spans)
    tarabalam = build_tarabalam(sunrise_utc, nakshatra_block)
    chandra_rashi = get_chandra_rashi(sunrise_utc)
    tarabala_table = build_tarabala_table(nakshatra_block)
    chandrabala_table = build_chandrabalam_table(chandra_rashi)
    panchaka_rahita = build_panchaka_rahita(sunrise_utc, lagna_spans, vaara_num)
    udaya_lagna = build_udaya_lagna(lagna_spans)
    nivas_shool = build_nivas_shool_block(
        sunrise_utc,
        next_sunrise_utc,
        weekday_py=weekday_py,
        timezone_name=location.timezone,
    )
    sunrise_block = _time_block(sunrise_utc, location.timezone)
    sunset_block = _time_block(sunset_utc, location.timezone)
    day_ghati = day_ghati_from_sun_times(
        sunrise_block.get("local_time_short"),
        sunset_block.get("local_time_short"),
    )
    choghadiya = (
        build_choghadiya(day_ghati, vaara_num)
        if day_ghati is not None
        else []
    )
    hora = build_hora(
        sunrise_utc,
        sunset_utc,
        next_sunrise_utc,
        vaara_num,
        location.timezone,
        sunrise_short=sunrise_block.get("local_time_short"),
        sunset_short=sunset_block.get("local_time_short"),
    )
    solar_corrections = build_solar_corrections(
        target,
        local_longitude=location.lon,
        timezone_name=location.timezone,
        at=sunrise_utc,
        lat=location.lat,
    )

    payload: dict[str, Any] = {
        "date": target.isoformat(),
        "display": _display_headers(target, bs_year, bs_month, bs_day, vaara_english, ns_date),
        "bs_date": {
            "year": bs_year,
            "month": bs_month,
            "day": bs_day,
            "month_name": bs_month_name(bs_month),
            "month_name_ne": BS_MONTH_NAMES_NEPALI[bs_month - 1],
        },
        "samvatsara": samvatsara_payload_for_bs_year(bs_year),
        "ns_date": ns_date,
        "location": location.as_dict(),
        "sunrise": sunrise_block,
        "sunset": sunset_block,
        "day_ghati": day_ghati,
        "choghadiya": choghadiya,
        "hora": hora,
        "solar_corrections": solar_corrections,
        "moonrise": _time_block(moonrise_utc, location.timezone),
        "moonset": _time_block(moonset_utc, location.timezone),
        "dinamaan": dinamaan,
        "ratrimana": ratrimana,
        "madhyahna": _time_block(
            sunrise_utc + (sunset_utc - sunrise_utc) / 2,
            location.timezone,
        ),
        "lahiri_ayanamsa": {
            "name": "Lahiri",
            "degrees": round(lahiri_ayanamsa, 6),
        },
        "aayan": aayan_pauranik,
        "aayan_pauranik": aayan_pauranik,
        "aayan_vedic": aayan_vedic,
        "vaara": {
            "number": vaara_num,
            "name_sanskrit": vaara_sanskrit,
            "name_english": vaara_english,
            "name_ne": VAARA_NAMES_NE[vaara_num],
        },
        "tithi": build_tithi_block(sunrise_utc, sunrise_utc, tithi_info, location.timezone),
        "nakshatra": build_nakshatra_block(sunrise_utc, sunrise_utc, timezone_name=location.timezone),
        "yoga": build_yoga_block(sunrise_utc, sunrise_utc, timezone_name=location.timezone),
        "karana": build_karana_block(sunrise_utc, sunrise_utc, location.timezone),
        "paksha": _paksha_block(lunar, paksha),
        "chandra_rashi": chandra_rashi,
        "chandra_rashi_spans": chandra_rashi_spans,
        "nakshatra_pada_spans": nakshatra_pada_spans,
        "surya_rashi": get_surya_rashi(sunrise_utc),
        "surya_nakshatra": surya_nakshatra,
        "ritu": ritu_pauranik,
        "ritu_pauranik": ritu_pauranik,
        "ritu_vedic": ritu_vedic,
        "lunar_month": lunar,
        "lunar_calendar": get_lunar_calendar_layers(target, paksha),
        "planets": get_all_planetary_positions(sunrise_utc),
        "planets_anchor": {
            "type": "udayakal",
            "local_time": sunrise_block.get("local_time_short"),
            "label_ne": "उदयकालिक स्पष्टग्रह (सूर्योदय)",
            "label_en": "Udayakalika Spashtagraha (sunrise)",
        },
        "lagna": get_lagna(sunrise_utc, lat=location.lat, lon=location.lon),
        "lagna_spans": lagna_spans,
        "udaya_lagna": udaya_lagna,
        "chandrabalam": chandrabalam,
        "tarabalam": tarabalam,
        "tarabala_table": tarabala_table,
        "chandrabala_table": chandrabala_table,
        "panchaka_rahita": panchaka_rahita,
        "muhurta": muhurta,
        "nivas_shool": nivas_shool,
        "markers": {
            "is_purnima": paksha == "shukla" and display_tithi == 15,
            "is_Aausi": paksha == "krishna" and display_tithi == 15,
            "is_ekadashi": display_tithi == 11,
        },
    }

    # Backward-compatible alias (was ayanamsa = Lahiri degrees)
    payload["ayanamsa"] = payload["lahiri_ayanamsa"]

    if include_festivals:
        from services.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(target, location)
        payload["festivals"] = day_festivals["festivals"]

    return payload


def get_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """
    Daily panchanga with SQLite cache-aside.

    Cache hit → instant return (no Swiss Ephemeris).
    Cache miss → compute, store, return.
    """
    from services.panchanga_cache import get_cached_panchanga, store_panchanga_cache

    cached = get_cached_panchanga(target, location)
    if cached is not None:
        payload = dict(cached)
        payload.pop("_from_cache", None)
        payload["_from_cache"] = True
    else:
        payload = build_daily_panchanga(target, location)
        store_panchanga_cache(target, location, payload)
        payload["_from_cache"] = False

    if include_festivals:
        from services.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(target, location)
        payload = {**payload, "festivals": day_festivals["festivals"]}

    return payload
