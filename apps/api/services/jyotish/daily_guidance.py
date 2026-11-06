"""Per-profile daily guidance: what to do, what not to do, what to be careful of.

The text is rule-driven (``rules/daily_guidance_v1.json``) so wording can change
without a release, and the same payload feeds the mobile app's local
notifications today and server push later. Everything here is deterministic for a
(profile, date, location) — the app caches it for offline use.
"""

from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.panchanga.balam_panchaka import CHANDRA_GOOD_HOUSES
from engine.panchanga.navatara import TARA_NAMES_EN, TARA_NAMES_NE

GUIDANCE_VERSION = "1"
MAX_DAYS = 31

_RULES_PATH = Path(__file__).resolve().parents[2] / "rules" / "daily_guidance_v1.json"


@lru_cache(maxsize=1)
def _rules() -> dict[str, Any]:
    with _RULES_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def _lines(rule: dict[str, Any] | None, field: str) -> tuple[list[str], list[str]]:
    if not rule:
        return [], []
    return list(rule.get(f"{field}_ne", [])), list(rule.get(f"{field}_en", []))


def _hhmm(value: Any) -> str | None:
    if not value:
        return None
    text = str(value)
    return text[:5] if len(text) >= 5 and text[2] == ":" else None


def _windows(muhurta: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Every शुभ / अशुभ window of the day, exactly as the panchanga page lists them.

    The group a timing arrives in decides its kind, so a window the engine adds
    later (Bhadra, Ganda Moola, Sarvartha Siddhi …) is reminder-able without a
    change here.
    """
    out: list[dict[str, Any]] = []
    for group, kind in (("auspicious_timings", "shubh"), ("inauspicious_timings", "ashubh")):
        for timing in (muhurta or {}).get(group, []) or []:
            key = timing.get("key")
            if not key:
                continue
            for seg in timing.get("segments", []) or []:
                start = _hhmm(seg.get("start_local_time_short"))
                end = _hhmm(seg.get("end_local_time_short"))
                if not start:
                    continue
                out.append(
                    {
                        "kind": kind,
                        "key": key,
                        "name_ne": timing.get("name_ne"),
                        "name_en": timing.get("name_en"),
                        "start": start,
                        "end": end,
                    }
                )
    out.sort(key=lambda w: w["start"])
    return out


def _tithi_rule_key(name: str | None) -> str | None:
    lowered = (name or "").lower()
    for key in _rules()["tithi"]:
        if key in lowered:
            return key
    return None


# जन्म is caution. विपत्, प्रत्यक् and निधन are bad. The other five are good.
_TARA_PERSONAL = {1: "caution", 3: "bad", 5: "bad", 7: "bad"}


def _clock_from_midnight(moment: datetime, day: date, timezone_name: str) -> str:
    """Minutes from ``day``'s local midnight, so a time after midnight is past 24:00."""
    from engine.astronomy.timescale import resolve_observer_timezone

    tz = resolve_observer_timezone(timezone_name)
    local = moment.astimezone(tz)
    midnight = datetime.combine(day, time.min, tzinfo=tz)
    minutes = int(round((local - midnight).total_seconds() / 60))
    if minutes < 0:
        minutes = 0
    hour, minute = divmod(minutes, 60)
    return f"{hour:02d}:{minute:02d}"


def _chandra_state(moon_idx: int, janma_idx: int) -> tuple[int, str]:
    house = (moon_idx - janma_idx) % 12 + 1
    if house == 8:
        return house, "ashtama"
    if house in CHANDRA_GOOD_HOUSES:
        return house, "good"
    return house, "weak"


def _tara_state(transit_idx: int, janma_idx: int) -> dict[str, Any]:
    num = ((transit_idx - janma_idx) % 27) % 9 + 1
    return {
        "num": num,
        "name_ne": TARA_NAMES_NE[num - 1],
        "name_en": TARA_NAMES_EN[num - 1],
        "state": _TARA_PERSONAL.get(num, "good"),
    }


def _lord_motion(lord: str, jd: float) -> tuple[bool, bool]:
    """(अस्त, वक्री) at ``jd``. राहु and केतु are never counted वक्री here."""
    from engine.astronomy.motion import is_retrograde
    from engine.astronomy.planets import planet_service
    from engine.jyotish.interpretation import combust_orb

    vakri = False if lord in ("rahu", "ketu") else is_retrograde(lord, planet_service.speed(jd, lord))
    orb = combust_orb(lord, retrograde=vakri)
    if orb is None:
        return False, vakri
    sun = planet_service.longitude(jd, "sun")
    lon = planet_service.longitude(jd, lord)
    sep = abs(sun - lon) % 360.0
    sep = min(sep, 360.0 - sep)
    return sep <= orb, vakri


def _split_points(sunrise: datetime, next_sunrise: datetime) -> list[datetime]:
    """Sunrise, next sunrise, and each Moon rashi or nakshatra change between them."""
    from engine.panchanga.element_boundaries import find_moon_rashi_end, find_nakshatra_end

    points = [sunrise, next_sunrise]
    cursor = sunrise
    for _ in range(8):
        if cursor >= next_sunrise - timedelta(seconds=45):
            break
        nxt = min(find_moon_rashi_end(cursor), find_nakshatra_end(cursor))
        if nxt <= cursor + timedelta(seconds=20):
            cursor = cursor + timedelta(minutes=30)
            continue
        if nxt < next_sunrise - timedelta(seconds=45):
            points.append(nxt)
            cursor = nxt + timedelta(seconds=90)
        else:
            break
    points.sort()
    merged: list[datetime] = []
    for point in points:
        if merged and (point - merged[-1]).total_seconds() < 60:
            continue
        merged.append(point)
    if merged[-1] < next_sunrise - timedelta(seconds=30):
        merged.append(next_sunrise)
    else:
        merged[-1] = next_sunrise
    return merged


def _personal_block(natal: Any, greg: date, location: Any) -> dict[str, Any]:
    """Chandrabala, tarabala and dasha for one panchanga day, read at its sunrise."""
    from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE, rashi_service
    from engine.astronomy.sun import calculate_sunrise
    from engine.astronomy.ut_instant import as_julian_day
    from engine.jyotish.rashifal_personal import dasha_block
    from engine.panchanga.angas import NAKSHATRA_NAMES, NAKSHATRA_SPAN
    from engine.panchanga.names_ne import NAKSHATRA_NAMES_NE
    from engine.astronomy.moon import moon_service

    sunrise = calculate_sunrise(greg, location.lat, location.lon, timezone_name=location.timezone)
    nxt = calculate_sunrise(greg + timedelta(days=1), location.lat, location.lon, timezone_name=location.timezone)
    jd = as_julian_day(sunrise)
    dasha = dasha_block(natal, sunrise)

    def lord_row(period: dict[str, Any]) -> dict[str, Any]:
        asta, vakri = _lord_motion(period["lord"], jd)
        return {
            "lord": period["lord"],
            "lord_ne": period["lord_ne"],
            "lord_en": period["lord_en"],
            "asta": asta,
            "vakri": vakri,
        }

    rashi_idx = int(natal.moon_sign)
    nak_idx = int(natal.chart.moon_nak[0])
    points = _split_points(sunrise, nxt)
    segments: list[dict[str, Any]] = []
    for start, end in zip(points, points[1:]):
        if end <= start:
            continue
        probe = start + timedelta(seconds=30)
        if probe >= end:
            probe = start
        moon = rashi_service.chandra(as_julian_day(probe))
        moon_long = moon_service.longitude(as_julian_day(probe))
        transit_nak = int(moon_long / NAKSHATRA_SPAN) % 27
        house, state = _chandra_state(int(moon.number) - 1, rashi_idx)
        segments.append(
            {
                "start": _clock_from_midnight(start, greg, location.timezone),
                "end": _clock_from_midnight(end, greg, location.timezone),
                "chandra": {"house": house, "state": state},
                "tara": _tara_state(transit_nak, nak_idx),
            }
        )

    return {
        "janma_rashi": {
            "number": rashi_idx + 1,
            "name_ne": RASHI_NAMES_NE[rashi_idx],
            "name_en": RASHI_NAMES[rashi_idx],
        },
        "janma_nakshatra": {
            "number": nak_idx + 1,
            "name_ne": NAKSHATRA_NAMES_NE[nak_idx],
            "name_en": NAKSHATRA_NAMES[nak_idx],
        },
        "dasha": {"maha": lord_row(dasha["mahadasha"]), "antar": lord_row(dasha["antardasha"])},
        "segments": segments,
    }


def _day_reading(personal: dict[str, Any]) -> dict[str, Any]:
    """The profile's own reading of the day: the personal rashifal (natal chart read against the day's
    sky) trimmed to what a day's dialog shows. Nothing new is computed here — ``build_day_guidance``
    already scores this for the tone.

    The paragraph ties the day to the kundali (where the running dasha lords sit in the birth chart,
    the transits by house from the natal Moon); the domains are the six life areas scored for the day.
    """
    def lord(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None
        return {"lord": row.get("lord"), "lord_ne": row.get("lord_ne"), "lord_en": row.get("lord_en"), "end": row.get("end")}

    dasha = personal.get("dasha") or {}
    return {
        "percent": personal.get("percent"),
        "prediction_ne": personal.get("prediction_ne") or "",
        "prediction_en": personal.get("prediction_en") or "",
        "dasha": {"maha": lord(dasha.get("mahadasha")), "antar": lord(dasha.get("antardasha"))},
        "domains": [
            {
                "key": d.get("key"),
                "label_ne": d.get("label_ne"),
                "label_en": d.get("label_en"),
                "tone": d.get("tone"),
                "percent": d.get("percent"),
            }
            for d in personal.get("domains") or []
        ],
        "gochar": [
            {
                "graha": g.get("graha"),
                "graha_ne": g.get("graha_ne"),
                "graha_en": g.get("graha_en"),
                "sign_ne": g.get("sign_ne"),
                "sign_en": g.get("sign_en"),
                "house": g.get("house"),
                "favourable": bool(g.get("favourable")),
                "retrograde": bool(g.get("retrograde")),
                "bindu": g.get("bindu"),
            }
            for g in personal.get("gochar") or []
        ],
    }


def build_day_guidance(
    greg: date,
    location: ObserverLocation,
    natal: Any | None = None,
) -> dict[str, Any]:
    """One day's guidance. ``natal`` (a ``NatalChart``) adds the personal tone."""
    from services.panchanga.panchanga_api import build_daily_state

    rules = _rules()
    state = build_daily_state(greg, location, include_detail=False)

    do_ne: list[str] = []
    do_en: list[str] = []
    dont_ne: list[str] = []
    dont_en: list[str] = []
    careful_ne: list[str] = []
    careful_en: list[str] = []

    def add(rule: dict[str, Any] | None) -> None:
        for field, (ne, en) in (
            ("do", (do_ne, do_en)),
            ("dont", (dont_ne, dont_en)),
            ("careful", (careful_ne, careful_en)),
        ):
            a, b = _lines(rule, field)
            ne.extend(a)
            en.extend(b)

    add(rules["weekday"].get(state.get("weekday_en") or ""))
    tithi_key = _tithi_rule_key((state.get("tithi") or {}).get("name"))
    if tithi_key:
        add(rules["tithi"][tithi_key])
    karana_name = ((state.get("karana") or {}).get("name") or "").lower()
    if "vishti" in karana_name:
        add(rules["karana"]["vishti"])

    windows = _windows(state.get("muhurta"))
    window_keys = {w["key"] for w in windows}
    for key in ("abhijit", "rahu_kalam", "yamaganda", "gulika"):
        if key in window_keys:
            add(rules["windows"][key])

    personal_tone: str | None = None
    reading: dict[str, Any] | None = None
    if natal is not None:
        from services.jyotish.rashifal_api import personal_rashifal_for_gregorian

        personal = personal_rashifal_for_gregorian(natal, greg, location, period="daily")
        personal_tone = personal.get("tone")
        reading = _day_reading(personal)
        add(rules["personal"].get(personal_tone or ""))

    summary_ne = " ".join((do_ne[:1] + careful_ne[:1] + dont_ne[:1])[:2])
    summary_en = " ".join((do_en[:1] + careful_en[:1] + dont_en[:1])[:2])

    payload = {
        "date": greg.isoformat(),
        "date_bs": state.get("date_bs"),
        "weekday_ne": state.get("weekday"),
        "weekday_en": state.get("weekday_en"),
        "tithi_ne": (state.get("tithi") or {}).get("name_ne"),
        "tithi_en": (state.get("tithi") or {}).get("name"),
        "nakshatra_ne": (state.get("nakshatra") or {}).get("name_ne"),
        "nakshatra_en": (state.get("nakshatra") or {}).get("name"),
        "personal_tone": personal_tone,
        "summary_ne": summary_ne,
        "summary_en": summary_en,
        "do_ne": do_ne,
        "do_en": do_en,
        "dont_ne": dont_ne,
        "dont_en": dont_en,
        "careful_ne": careful_ne,
        "careful_en": careful_en,
        "windows": windows,
    }
    if natal is not None:
        payload["personal"] = _personal_block(natal, greg, location)
        payload["reading"] = reading
    return payload


def build_guidance_range(
    start: date,
    days: int,
    location: ObserverLocation,
    natal: Any | None = None,
) -> dict[str, Any]:
    days = max(1, min(int(days), MAX_DAYS))
    return {
        "version": GUIDANCE_VERSION,
        "location": {"lat": location.lat, "lon": location.lon, "timezone": location.timezone},
        "days": [build_day_guidance(start + timedelta(days=i), location, natal) for i in range(days)],
    }


def natal_chart_for_profile(profile: Any):
    """A saved profile's natal chart, or ``None`` when it has no usable birth moment."""
    from engine.jyotish.rashifal_personal import build_natal_chart
    from engine.panchanga.instants import birth_instant_from_query

    if not (profile.birth_date and profile.latitude is not None and profile.longitude is not None):
        return None
    try:
        year, month, day = (int(part) for part in profile.birth_date.split("-")[:3])
        instant = birth_instant_from_query(
            birth_tz=profile.timezone or "Asia/Kathmandu",
            birth_era=profile.birth_era or "bs",
            birth_year=year,
            birth_month=month,
            birth_day=day,
            birth_clock=profile.birth_time or "12:00",
            lat=profile.latitude,
            lon=profile.longitude,
        )
        return build_natal_chart(instant, lat=profile.latitude, lon=profile.longitude)
    except (ValueError, TypeError):
        return None
