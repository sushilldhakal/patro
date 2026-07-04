"""Full computed kundali payload — everything a client renders, in one response.

All jyotish derivations (vargas, ashtakavarga, bhava bala, yuddha, yogas,
avakahada, dasha tree, birth-time kalas) happen here so web and mobile clients
stay presentation-only.
"""

from __future__ import annotations

from datetime import datetime, timezone as _tz
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.vedic.ashtakavarga import compute_ashtakavarga
from engine.vedic.avakahada import build_janma_avakahada
from engine.vedic.bhava_bala import compute_bhava_bala
from engine.vedic.graha_details import (
    GRAHA_DETAIL_ORDER,
    graha_dignity,
    is_combust,
    kp_sub_lord_from_longitude,
    nakshatra_lord_key,
    nakshatra_pada_from_longitude,
    natural_relation,
    owned_rashis,
    rashi_from_longitude,
    rashi_lord_key,
)
from engine.vedic.graha_yuddha import compute_yuddha_bala
from engine.vedic.vargas import (
    VARGA_DIVISIONS,
    varga_dms_parts,
    varga_rashi_from_longitude,
)
from engine.vedic.yogas import compute_kundali_yogas


def _clock_minutes(clock: str | None) -> int | None:
    if not clock:
        return None
    parts = clock.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def _ghadi_pala_vipala(total_minutes: float) -> dict[str, int]:
    """1 ghadi = 24 min, 1 pala = 24 sec."""
    total_sec = round(total_minutes * 60)
    ghadi = total_sec // (24 * 60)
    rem = total_sec % (24 * 60)
    return {
        "ghadi": int(ghadi),
        "pala": int(rem // 24),
        "vipala": int((rem % 24) * (60 / 24)),
    }


def compute_birth_kalas(
    sunrise_short: str | None,
    birth_clock: str,
    solar_correction_min: float = 0.0,
) -> dict[str, Any] | None:
    """Drik-style birth-time ghati clocks (ishta kala / ahoratri ishta kala)."""
    sunrise_min = _clock_minutes(sunrise_short)
    birth_min = _clock_minutes(birth_clock)
    if sunrise_min is None or birth_min is None:
        return None
    ahoratri_min = birth_min - sunrise_min
    if ahoratri_min < 0:
        ahoratri_min += 24 * 60
    ishta_min = max(0.0, ahoratri_min - solar_correction_min)
    return {
        "ahoratriIshta": _ghadi_pala_vipala(ahoratri_min),
        "ishta": _ghadi_pala_vipala(ishta_min),
    }


def _varga_point_entry(key: str, longitude: float, division: int) -> dict[str, Any]:
    varga_rashi = varga_rashi_from_longitude(division, longitude)
    nak_index, pada = nakshatra_pada_from_longitude(longitude)
    owner_key = rashi_lord_key(varga_rashi)
    is_graha = key != "lagna"
    return {
        "key": key,
        "vargaRashi": varga_rashi,
        "dms": varga_dms_parts(division, longitude),
        "nakshatraIndex": nak_index,
        "pada": pada,
        "nakshatraLord": nakshatra_lord_key(longitude),
        "subLord": kp_sub_lord_from_longitude(longitude),
        "ownerKey": owner_key,
        "relation": natural_relation(key, owner_key) if is_graha else None,
        "dignity": (
            graha_dignity(key, varga_rashi, longitude % 30 if division == 1 else None)
            if is_graha
            else None
        ),
    }


def build_varga_charts(
    lagna_longitude: float | None,
    planet_longitudes: dict[str, float],
    retrograde: dict[str, bool],
) -> dict[str, Any]:
    """All divisional placements + detail rows for lagna and the nine grahas."""
    points: dict[str, dict[str, Any]] = {}
    if lagna_longitude is not None:
        points["lagna"] = {"longitude": lagna_longitude}
    for key in GRAHA_DETAIL_ORDER:
        lon = planet_longitudes.get(key)
        if lon is not None:
            points[key] = {"longitude": lon, "retrograde": bool(retrograde.get(key))}

    entries: dict[str, list[dict[str, Any]]] = {}
    for division in VARGA_DIVISIONS:
        rows: list[dict[str, Any]] = []
        for key, point in points.items():
            row = _varga_point_entry(key, point["longitude"], division)
            if point.get("retrograde"):
                row["retrograde"] = True
            rows.append(row)
        entries[str(division)] = rows

    return {
        "divisions": VARGA_DIVISIONS,
        "points": points,
        "entries": entries,
        "ownedRashis": {key: owned_rashis(key) for key in GRAHA_DETAIL_ORDER},
    }


def _sunrise_short(state: dict[str, Any]) -> str | None:
    """Sunrise HH:MM from the day state (top-level sun block, else raw detail)."""
    sun = state.get("sun") or {}
    if sun.get("sunrise"):
        return sun["sunrise"]
    detail = state.get("detail") or {}
    return ((detail.get("sunrise") or {}).get("local_time_short"))


def _sunset_short(state: dict[str, Any]) -> str | None:
    sun = state.get("sun") or {}
    if sun.get("sunset"):
        return sun["sunset"]
    detail = state.get("detail") or {}
    return ((detail.get("sunset") or {}).get("local_time_short"))


def _choghadiya_at_birth(
    state: dict[str, Any],
    birth_clock: str,
) -> dict[str, Any] | None:
    """चौघडिया segment active at the birth clock on this panchanga day."""
    detail = state.get("detail") or {}
    segments = detail.get("choghadiya") or []
    sunrise_min = _clock_minutes(_sunrise_short(state))
    birth_min = _clock_minutes(birth_clock)
    if not segments or sunrise_min is None or birth_min is None:
        return None
    g = (birth_min - sunrise_min) / 24.0
    while g < 0:
        g += 60
    g = min(g, 60.0)
    for seg in segments:
        if seg["start_g"] <= g < seg["end_g"]:
            name = seg["name_ne"]
            good = name in ("लाभ", "अमृत", "शुभ")
            quality = "अशुभ" if seg.get("bad") else ("शुभ" if good else "सामान्य")
            en = {
                "उद्वेग": "Udvega", "चर": "Chara", "लाभ": "Labha", "अमृत": "Amrita",
                "काल": "Kala", "शुभ": "Shubha", "रोग": "Roga",
            }.get(name)
            return {"nameNe": name, "nameEn": en, "quality": quality, "bad": bool(seg.get("bad"))}
    return None


def build_kundali_detail(
    instant_local: datetime,
    location: ObserverLocation,
    *,
    ayanamsa_mode_id: int | None,
    ayanamsha_label: str,
) -> dict[str, Any]:
    """Assemble the complete kundali payload for one birth instant."""
    from engine.vedic.at_time import build_panchanga_at_time
    from engine.vedic.shadbala import compute_shadbala
    from engine.vedic.vimshottari import vimshottari_tree

    state = build_panchanga_at_time(instant_local, location, ayanamsa=ayanamsa_mode_id)
    detail = state.get("detail") or {}
    planets: dict[str, Any] = detail.get("planets") or {}
    instant_lagna: dict[str, Any] = detail.get("instant_lagna") or {}

    planet_longitudes: dict[str, float] = {}
    retrograde: dict[str, bool] = {}
    for key, info in planets.items():
        if isinstance(info, dict) and info.get("longitude") is not None:
            planet_longitudes[key] = float(info["longitude"])
            retrograde[key] = bool(info.get("is_retrograde"))

    lagna_longitude = instant_lagna.get("longitude")
    lagna_rashi = (
        rashi_from_longitude(float(lagna_longitude)) if lagna_longitude is not None else None
    )
    moon_lon = planet_longitudes.get("moon")
    sun_lon = planet_longitudes.get("sun")
    instant_utc = instant_local.astimezone(_tz.utc)

    # ── shadbala + derived strengths ─────────────────────────────────────────
    shadbala = compute_shadbala(
        instant_utc, lat=location.lat, lon=location.lon, timezone_name=location.timezone
    )
    shadbala_planets = shadbala.get("planets") or []
    yuddha = compute_yuddha_bala(shadbala_planets, planet_longitudes)
    bhava_bala = (
        compute_bhava_bala(lagna_rashi, shadbala_planets, planet_longitudes)
        if lagna_rashi is not None
        else None
    )

    # ── day/night birth + yogas ──────────────────────────────────────────────
    birth_clock = instant_local.strftime("%H:%M")
    sunrise_short = _sunrise_short(state)
    sunset_short = _sunset_short(state)
    birth_min = _clock_minutes(birth_clock)
    sunrise_min = _clock_minutes(sunrise_short)
    sunset_min = _clock_minutes(sunset_short)
    is_day_birth = (
        sunrise_min <= birth_min < sunset_min
        if None not in (birth_min, sunrise_min, sunset_min)
        else None
    )

    upagrahas = detail.get("upagrahas") or []
    upagraha_rows: list[dict[str, Any]] = []
    for u in upagrahas:
        if not isinstance(u, dict) or u.get("longitude") is None:
            continue
        u_lon = float(u["longitude"])
        u_nak, u_pada = nakshatra_pada_from_longitude(u_lon)
        upagraha_rows.append(
            {
                **u,
                "dms": varga_dms_parts(1, u_lon),
                "nakshatraIndex": u_nak,
                "pada": u_pada,
                "nakshatraLord": nakshatra_lord_key(u_lon),
            }
        )
    gulika_lon = next(
        (u.get("longitude") for u in upagrahas if isinstance(u, dict) and u.get("key") == "gulika"),
        None,
    )

    yogas = (
        compute_kundali_yogas(
            lagna_rashi,
            planet_longitudes,
            is_day_birth=is_day_birth,
            gulika_longitude=gulika_lon,
        )
        if lagna_rashi is not None
        else []
    )

    # ── ashtakavarga / vargas ────────────────────────────────────────────────
    ashtakavarga = (
        compute_ashtakavarga(lagna_rashi, planet_longitudes) if lagna_rashi is not None else None
    )
    varga_charts = build_varga_charts(
        float(lagna_longitude) if lagna_longitude is not None else None,
        planet_longitudes,
        retrograde,
    )

    # ── avakahada + birth meta ───────────────────────────────────────────────
    avakahada = None
    if moon_lon is not None:
        moon_rashi = rashi_from_longitude(moon_lon)
        nak_index, pada = nakshatra_pada_from_longitude(moon_lon)
        avakahada = build_janma_avakahada(
            moon_lon,
            moon_rashi=moon_rashi,
            lagna_rashi=lagna_rashi,
            nakshatra_index=nak_index,
            pada=pada,
        )

    solar = detail.get("solar_corrections") or {}
    correction_min = 0.0
    for part in ("belaantar", "deshaantar"):
        block = solar.get(part) or {}
        correction_min += float(block.get("minutes_total") or 0.0)
    kalas = compute_birth_kalas(sunrise_short, birth_clock, correction_min)

    combustion = {
        key: is_combust(key, lon, sun_lon, retrograde.get(key, False))
        for key, lon in planet_longitudes.items()
        if sun_lon is not None and key != "sun"
    }

    # Moon nakshatra + Sun/Moon yoga under the requested ayanamsha (the
    # instant anga blocks in the panchanga state stay Lahiri).
    moon_nakshatra = None
    yoga_at_birth = None
    if moon_lon is not None:
        nak_index, pada = nakshatra_pada_from_longitude(moon_lon)
        moon_nakshatra = {"index": nak_index, "number": nak_index + 1, "pada": pada}
        if sun_lon is not None:
            yoga_index = int(((sun_lon + moon_lon) % 360) // (360 / 27))
            yoga_at_birth = {"index": yoga_index, "number": yoga_index + 1}

    birth_meta: dict[str, Any] = {
        "birthClock": birth_clock,
        "isDayBirth": is_day_birth,
        "ishtaKala": (kalas or {}).get("ishta"),
        "ahoratriIshtaKala": (kalas or {}).get("ahoratriIshta"),
        "choghadiyaAtBirth": _choghadiya_at_birth(state, birth_clock),
        "solarCorrectionMinutes": round(correction_min, 4),
        "moonNakshatra": moon_nakshatra,
        "yoga": yoga_at_birth,
    }

    # ── dasha tree ───────────────────────────────────────────────────────────
    dasha = (
        vimshottari_tree(moon_lon, instant_utc, cycles=1, depth=2)
        if moon_lon is not None
        else None
    )

    return {
        "panchanga": state,
        "shadbala": shadbala,
        "dasha": dasha,
        "yuddha": yuddha,
        "bhavaBala": bhava_bala,
        "ashtakavarga": ashtakavarga,
        "yogas": yogas,
        "vargaCharts": varga_charts,
        "upagrahas": upagraha_rows,
        "avakahada": avakahada,
        "birthMeta": birth_meta,
        "combustion": combustion,
        "lagnaRashi": lagna_rashi,
        "ayanamsha": ayanamsha_label,
        "location": location.as_dict(),
        "birth_instant": instant_local.isoformat(),
    }
