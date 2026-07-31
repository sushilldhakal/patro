"""Daily Panchanga builder — core of a Patro."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.jd_calendar import civil_day_jd_from_date, civil_iso_from_date
from engine.astronomy.lagna import lagna_service
from engine.astronomy.moon import (
    calculate_moonrise_after,
    calculate_moonset_after,
    moon_service,
)
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.planets import spashta_table
from engine.astronomy.rashi import rashi_service
from engine.astronomy.sun import calculate_sunrise, calculate_sunset, sun_service
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import as_julian_day
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


def _time_block(dt, timezone_name: str) -> dict[str, str] | None:
    if dt is None:
        return None
    from engine.astronomy.ut_instant import UtInstant, format_ut_instant_local

    if isinstance(dt, UtInstant):
        block = format_ut_instant_local(dt, timezone_name)
        # Same expanded-ISO shape the CE branch emits below, not a jd: sentinel.
        block["utc"] = dt.isoformat()
        return block
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

    # Nepali patro reckons lunar months pūrṇimānta (pūrṇimā→pūrṇimā), so the
    # month a paksha belongs to is the pūrṇimānta name — e.g. today's śukla
    # fortnight is आषाढ शुक्ल, not श्रावण (its amānta name). This matches the
    # dainik-kranti listing, which reads lunar_calendar.purnimant. In krishna
    # paksha the two models agree, so only śukla labels change.
    month_name = lunar.get("purnimanta_name") or lunar.get("name") or "Unknown"
    month_ne = lunar.get("purnimanta_name_ne")
    is_adhik = lunar.get("purnimanta_is_adhik", lunar.get("is_adhik", False))
    prefix = "अधिक " if is_adhik else ""
    if not month_ne:
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


def _display_headers_civil(
    date_ad: str,
    bs_year: int,
    bs_month: int,
    bs_day: int,
    vaara_ne: str,
    vaara_english: str,
    ns_date: dict,
) -> dict:
    bs_month_ne = BS_MONTH_NAMES_NEPALI[bs_month - 1]
    era_label = "BBS" if bs_year < 0 else "वि.सं."
    year_digits = to_nepali_digits(abs(bs_year) if bs_year < 0 else bs_year)
    prefix = f"BBS {abs(bs_year)}" if bs_year < 0 else f"वि.सं. {to_nepali_digits(bs_year)}"
    if bs_year < 0:
        bs_ne = f"BBS {year_digits} {bs_month_ne} {to_nepali_digits(bs_day)} {vaara_ne}"
    else:
        bs_ne = f"{prefix} {bs_month_ne} {to_nepali_digits(bs_day)} {vaara_ne}"
    return {
        "bs_ne": bs_ne,
        "gregorian_en": f"{date_ad} {vaara_english}",
        "ns_ne": ns_date.get("label_ne") and f"ने.सं. {to_nepali_digits(ns_date.get('year', 0))} {ns_date['label_ne']}" or "",
    }


def _assemble_udaya_panchanga(
    *,
    sunrise_utc,
    sunset_utc,
    moonrise_utc,
    moonset_utc,
    next_sunrise_utc,
    location: ObserverLocation,
    tithi_info: dict,
    vaara_num: int,
    vaara_sanskrit: str,
    vaara_english: str,
    bs_year: int,
    bs_month: int,
    bs_day: int,
    date_label: str,
    date_ad: str,
    jd_ut: float,
    display: dict,
    ns_date: dict,
    lunar: dict,
    lunar_calendar: dict,
    solar_corrections: dict,
    include_festivals: bool,
    festival_date: date | None,
) -> dict[str, Any]:
    from engine.astronomy.ut_instant import UtInstant

    display_tithi = tithi_info["display_number"]
    paksha = tithi_info["paksha"]

    # One JD for the whole sunrise-anchored block: every service below is asked
    # about this exact instant, so the payload cannot mix two sunrises.
    sunrise_jd = as_julian_day(sunrise_utc)

    lahiri_ayanamsa = sun_service.ayanamsa(sunrise_jd)
    dinamaan = compute_dinamaan(sunrise_utc, sunset_utc)

    muhurta = build_muhurta_block(sunrise_utc, sunset_utc, vaara_num, location.timezone)
    from engine.astronomy.ut_instant import local_weekday_py_from_jd

    if isinstance(sunrise_utc, UtInstant):
        weekday_py = local_weekday_py_from_jd(sunrise_utc.jd_ut, location.timezone)
    else:
        weekday_py = sunrise_utc.astimezone(
            resolve_observer_timezone(location.timezone)
        ).weekday()
    if not isinstance(sunrise_utc, UtInstant):
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
    ritu_pauranik = rashi_service.ritu(
        sunrise_jd,
        sidereal=True,
        lat=location.lat,
        timezone_name=location.timezone,
    )
    ritu_vedic = rashi_service.ritu(
        sunrise_jd,
        sidereal=False,
        lat=location.lat,
        timezone_name=location.timezone,
    )
    aayan_pauranik = rashi_service.aayan(sunrise_jd, sidereal=True)
    aayan_vedic = rashi_service.aayan(sunrise_jd, sidereal=False)
    lagna_spans = build_lagna_spans(
        sunrise_utc,
        next_sunrise_utc,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
    )
    from engine.vedic.pushkara_navamsha import enrich_lagna_spans_with_pushkara

    if not isinstance(sunrise_utc, UtInstant):
        lagna_spans = enrich_lagna_spans_with_pushkara(
            lagna_spans,
            lat=location.lat,
            lon=location.lon,
            timezone_name=location.timezone,
        )
    tz_name = location.timezone
    chandra_rashi_spans = build_chandra_rashi_spans(sunrise_utc, next_sunrise_utc, tz_name)
    nakshatra_pada_spans = build_nakshatra_pada_spans(sunrise_utc, next_sunrise_utc, tz_name)
    surya_nakshatra = get_surya_nakshatra(sunrise_utc)
    nakshatra_block = build_nakshatra_block(sunrise_utc, sunrise_utc)
    chandrabalam = build_chandrabalam(sunrise_utc, chandra_rashi_spans, tz_name)
    tarabalam = build_tarabalam(sunrise_utc, nakshatra_block, tz_name)
    chandra_rashi = rashi_service.chandra(sunrise_jd)
    tarabala_table = build_tarabala_table(nakshatra_block)
    chandrabala_table = build_chandrabalam_table(chandra_rashi)
    panchaka_rahita = build_panchaka_rahita(sunrise_utc, lagna_spans, vaara_num, tz_name)
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

    # No `bs_year >= 1` gate: the Jovian walk is JD-based and table-backed now, so
    # BBS years resolve too. The resolver already answers None for anything
    # outside the precomputed range, which is the only reason the guard existed.
    samvatsara = samvatsara_payload_for_bs_year(bs_year)

    payload: dict[str, Any] = {
        "date": date_label,
        "date_ad": date_ad,
        "jd_ut": jd_ut,
        # Which instant the moving quantities were read at. Sunrise-anchored,
        # instant-anchored and midnight-anchored payloads answer honestly
        # different questions about the same day; without this field the
        # difference reads as the API contradicting itself. See B3 in
        # docs/computation-architecture-audit.md.
        "anchor": "sunrise",
        "display": display,
        "bs_date": {
            "year": bs_year,
            "month": bs_month,
            "day": bs_day,
            "month_name": bs_month_name(bs_month),
            "month_name_ne": BS_MONTH_NAMES_NEPALI[bs_month - 1],
        },
        "samvatsara": samvatsara,
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
        # Geometric Moon phase, read at the same sunrise as everything else.
        # Cut from the Sun→Moon elongation — the identical angle the tithi comes
        # from — so the illuminated disc and the tithi can never disagree.
        "moon_phase": moon_service.phase(sunrise_jd),
        "chandra_rashi_spans": chandra_rashi_spans,
        "nakshatra_pada_spans": nakshatra_pada_spans,
        "surya_rashi": rashi_service.surya(sunrise_jd),
        "surya_nakshatra": surya_nakshatra,
        "ritu": ritu_pauranik,
        "ritu_pauranik": ritu_pauranik,
        "ritu_vedic": ritu_vedic,
        "lunar_month": lunar,
        "lunar_calendar": lunar_calendar,
        "planets": spashta_table(sunrise_jd),
        "planets_anchor": {
            "type": "udayakal",
            "local_time": sunrise_block.get("local_time_short"),
            "label_ne": "उदयकालिक स्पष्टग्रह (सूर्योदय)",
            "label_en": "Udayakalika Spashtagraha (sunrise)",
        },
        "lagna": lagna_service.lagna(
            sunrise_jd, lat=location.lat, lon=location.lon
        ),
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

    payload["ayanamsa"] = payload["lahiri_ayanamsa"]

    if include_festivals and festival_date is not None:
        from services.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(festival_date, location)
        payload["festivals"] = day_festivals["festivals"]

    return payload


# ── labelling stubs for days the CE-only calendar engines cannot reach ───────
#
# The lunar-month and Nepal-Sambat engines are built on ``datetime.date`` and the
# verified BS table, so they have nothing to say about a day on the signed patro
# axis (BBS, or BS years before the table starts). These stand in, and say so via
# ``source``/``available`` rather than inventing a label.


def _lunar_stub_for_solar_month(bs_month: int, paksha: str) -> dict[str, Any]:
    """Pūrṇimānta lunar labels from solar BS month when the lunar engine is off."""
    from engine.vedic.sankranti import BS_MONTH_NAMES

    name = BS_MONTH_NAMES[bs_month - 1]
    month_ne = name
    try:
        month_ne = BS_MONTH_NAMES_NEPALI[bs_month - 1]
    except (IndexError, ValueError):
        pass
    return {
        "name": name,
        "purnimanta_name": name,
        "purnimanta_name_ne": month_ne,
        "name_ne": month_ne,
        "is_adhik": False,
        "purnimanta_is_adhik": False,
        "source": "solar_month_stub",
        "paksha": paksha,
    }


def _lunar_calendar_stub(lunar: dict, paksha: str) -> dict[str, Any]:
    return {
        "purnimant": {
            "name": lunar.get("purnimanta_name"),
            "name_ne": lunar.get("purnimanta_name_ne"),
            "paksha": paksha,
            "is_adhik": lunar.get("purnimanta_is_adhik", False),
        },
        "amant": {
            "name": lunar.get("name"),
            "name_ne": lunar.get("name_ne"),
            "paksha": paksha,
            "is_adhik": lunar.get("is_adhik", False),
        },
        "source": "solar_month_stub",
    }


def _ns_date_stub() -> dict[str, Any]:
    return {
        "year": 0,
        "label_ne": "—",
        "label_en": "—",
        "available": False,
    }


def build_daily_panchanga_at_jd(
    jd_ut: float,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs: tuple[int, int, int] | None = None,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for the civil day named by *jd_ut*.

    The astronomy below — sunrise, sunset, the two moon events, the next
    sunrise, tithi and vara — is one path for every era. That is the half where
    a CE/BCE fork could hide a wrong number, and it is where A0 did.

    The labelling is a genuine fork, so it is explicit and the caller picks it:

    ``patro_bs=None``
        Derive everything from the Gregorian day — real lunar month, real Nepal
        Sambat, festivals. Only possible when ``datetime.date`` can hold the year.
    ``patro_bs=(year, month, day)``
        The caller resolved the day on the signed patro axis. The CE-only
        calendar engines cannot speak to it, so the lunar and NS blocks are
        stubs and the year may be negative (BBS).
    """
    from engine.astronomy.jd_calendar import (
        CivilDay,
        civil_day_add,
        format_civil_iso,
    )
    from engine.astronomy.sun import sun_service

    jd = float(jd_ut)
    civil = CivilDay.from_jd_ut(jd)

    # ── astronomy — era-free ────────────────────────────────────────────────
    sunrise_utc = sun_service.sunrise(jd, location)
    sunset_utc = sun_service.sunset(jd, location)
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
    next_sunrise_utc = sun_service.sunrise(civil_day_add(jd, 1), location)

    tithi_info = calculate_tithi(sunrise_utc)
    vara = panchanga_service.vara(as_julian_day(sunrise_utc), location.timezone)
    vaara_num, vaara_sanskrit, vaara_english = (
        vara["number"], vara["name"], vara["english"]
    )
    display_tithi = tithi_info["display_number"]
    paksha = tithi_info["paksha"]
    date_ad = format_civil_iso(civil.year, civil.month, civil.day)

    # ── labelling — the fork the caller chose ───────────────────────────────
    if patro_bs is None:
        target = civil.to_date()
        bs_year, bs_month, bs_day = gregorian_to_bs(target)
        lunar = merge_lunar_month_for_day(target, paksha)
        ns_date = gregorian_to_ns(
            target,
            bs_year,
            tithi_display=display_tithi,
            tithi_absolute=tithi_info["number"],
            tithi_name_ne=_tithi_name_ne(display_tithi, paksha),
            paksha=paksha,
            lunar_month_name=lunar.get("name"),
            is_adhik=lunar.get("is_adhik", False),
            location=location,
        )
        lunar_calendar = get_lunar_calendar_layers(target, paksha)
        display = _display_headers(
            target, bs_year, bs_month, bs_day, vaara_english, ns_date
        )
        date_label = target.isoformat()
        solar_anchor_date = target
        festival_date = target
    else:
        bs_year, bs_month, bs_day = patro_bs
        lunar = _lunar_stub_for_solar_month(bs_month, paksha)
        ns_date = _ns_date_stub()
        lunar_calendar = _lunar_calendar_stub(lunar, paksha)
        display = _display_headers_civil(
            date_ad,
            bs_year,
            bs_month,
            bs_day,
            VAARA_NAMES_NE[vaara_num],
            vaara_english,
            ns_date,
        )
        date_label = date_ad
        try:
            solar_anchor_date = civil.to_date()
        except ValueError:
            # ``datetime.date`` cannot represent a BCE civil label. Belaantar
            # only needs the ephemeris instant (sunrise); the date is read for
            # zone meridian / timezone-era metadata, so a fixed probe day serves.
            solar_anchor_date = date(2020, 6, 15)
        festival_date = None

    return _assemble_udaya_panchanga(
        sunrise_utc=sunrise_utc,
        sunset_utc=sunset_utc,
        moonrise_utc=moonrise_utc,
        moonset_utc=moonset_utc,
        next_sunrise_utc=next_sunrise_utc,
        location=location,
        tithi_info=tithi_info,
        vaara_num=vaara_num,
        vaara_sanskrit=vaara_sanskrit,
        vaara_english=vaara_english,
        bs_year=bs_year,
        bs_month=bs_month,
        bs_day=bs_day,
        date_label=date_label,
        date_ad=date_ad,
        jd_ut=jd,
        display=display,
        ns_date=ns_date,
        lunar=lunar,
        lunar_calendar=lunar_calendar,
        solar_corrections=build_solar_corrections(
            solar_anchor_date,
            local_longitude=location.lon,
            timezone_name=location.timezone,
            at=sunrise_utc,
            lat=location.lat,
        ),
        include_festivals=include_festivals,
        festival_date=festival_date,
    )


def build_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for one Gregorian day. Thin wrapper over the JD builder."""
    return build_daily_panchanga_at_jd(
        civil_day_jd_from_date(target),
        location,
        include_festivals=include_festivals,
    )


def get_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """
    Daily panchanga with SQLite cache-aside.

    Cache hit → instant return (no JPL ephemeris work).
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
