"""Shadbala — the sixfold strength of the seven classical planets, in Virupas.

Computed with the live Swiss-Ephemeris positions (sidereal Lahiri longitudes and
true daily speeds) plus the day's sunrise/sunset and weekday, following the
Parashari method. A handful of components that classically need data the modern
ephemeris doesn't expose directly (notably the Cheshta seeghra-kendra) use a
documented speed-based approximation; everything else is exact.

All strengths are returned in Virupas (1 Rupa = 60 Virupas).
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

from engine.astronomy.positions import get_vaara, get_sidereal_asc_longitude
from engine.astronomy.swiss_eph import (
    AYANAMSA_LAHIRI,
    calculate_sunrise,
    calculate_sunset,
    get_all_planetary_positions,
    get_julian_day,
    get_sun_longitude,
)
from engine.astronomy.engine import default_engine

PLANETS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

PLANET_NAMES = {
    "sun": ("Sun", "सूर्य"),
    "moon": ("Moon", "चन्द्र"),
    "mars": ("Mars", "मंगल"),
    "mercury": ("Mercury", "बुध"),
    "jupiter": ("Jupiter", "बृहस्पति"),
    "venus": ("Venus", "शुक्र"),
    "saturn": ("Saturn", "शनि"),
}

# Naisargika (natural) bala — fixed, in Virupas.
NAISARGIKA = {
    "sun": 60.0, "moon": 51.43, "venus": 42.86, "jupiter": 34.29,
    "mercury": 25.71, "mars": 17.14, "saturn": 8.57,
}

# Classical minimum required Shadbala, in Virupas (Rupas × 60).
REQUIRED = {
    "sun": 300.0, "moon": 360.0, "mars": 300.0, "mercury": 420.0,
    "jupiter": 390.0, "venus": 330.0, "saturn": 300.0,
}

# Deep-exaltation longitudes (sidereal degrees, 0–360).
EXALT_DEG = {
    "sun": 10.0, "moon": 33.0, "mars": 298.0, "mercury": 165.0,
    "jupiter": 95.0, "venus": 357.0, "saturn": 200.0,
}

# 0-based sign → ruling planet.
SIGN_LORD = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
]

OWN_SIGNS = {
    "sun": {4}, "moon": {3}, "mars": {0, 7}, "mercury": {2, 5},
    "jupiter": {8, 11}, "venus": {1, 6}, "saturn": {9, 10},
}
# Moolatrikona sign (0-based) and degree range within it.
MOOLA = {
    "sun": (4, 0, 20), "moon": (1, 4, 30), "mars": (0, 0, 12),
    "mercury": (5, 16, 20), "jupiter": (8, 0, 10), "venus": (6, 0, 15),
    "saturn": (10, 0, 20),
}

FRIENDS = {
    "sun": {"moon", "mars", "jupiter"},
    "moon": {"sun", "mercury"},
    "mars": {"sun", "moon", "jupiter"},
    "mercury": {"sun", "venus"},
    "jupiter": {"sun", "moon", "mars"},
    "venus": {"mercury", "saturn"},
    "saturn": {"mercury", "venus"},
}
ENEMIES = {
    "sun": {"venus", "saturn"},
    "moon": set(),
    "mars": {"mercury"},
    "mercury": {"moon"},
    "jupiter": {"mercury", "venus"},
    "venus": {"sun", "moon"},
    "saturn": {"sun", "moon", "mars"},
}

BENEFICS = {"moon", "mercury", "jupiter", "venus"}  # for Paksha / Drik
MALE = {"sun", "mars", "jupiter"}
NEUTER = {"mercury", "saturn"}
FEMALE = {"moon", "venus"}

VARA_LORD = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]  # 0 = Sunday
CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"]

# Mean daily motion (deg/day) for the five star planets — Cheshta speed bands.
MEAN_SPEED = {
    "mars": 0.524, "mercury": 1.383, "jupiter": 0.083, "venus": 1.2, "saturn": 0.033,
}

BALA_LABELS = {
    "sthana": "Sthana", "dig": "Dig", "kala": "Kala",
    "cheshta": "Cheshta", "naisargika": "Naisargika", "drik": "Drik",
}


def _norm(d: float) -> float:
    return d % 360.0


def _sign(lon: float) -> int:
    return int(_norm(lon) // 30) % 12


# ── Divisional signs (0-based) for Saptavargaja ───────────────────────────────
def _d1(lon: float) -> int:
    return _sign(lon)


def _d2_hora(lon: float) -> int:
    s = _sign(lon)
    first = (lon % 30) < 15
    odd = s % 2 == 0  # Aries(0) is the 1st (odd) sign
    if odd:
        return 4 if first else 3  # Leo / Cancer
    return 3 if first else 4


def _d3(lon: float) -> int:
    s = _sign(lon)
    d = int((lon % 30) // 10)
    return (s + d * 4) % 12


def _d7(lon: float) -> int:
    s = _sign(lon)
    part = int((lon % 30) // (30 / 7))
    start = s if s % 2 == 0 else s + 6
    return (start + part) % 12


def _d9(lon: float) -> int:
    return int(_norm(lon) * 9 // 30) % 12


def _d12(lon: float) -> int:
    s = _sign(lon)
    part = int((lon % 30) // 2.5)
    return (s + part) % 12


def _d30_lord(lon: float) -> str:
    s = _sign(lon)
    within = lon % 30
    if s % 2 == 0:  # odd sign
        bounds = [(5, "mars"), (10, "saturn"), (18, "jupiter"), (25, "mercury"), (30, "venus")]
    else:
        bounds = [(5, "venus"), (12, "mercury"), (20, "jupiter"), (25, "saturn"), (30, "mars")]
    for limit, lord in bounds:
        if within < limit:
            return lord
    return bounds[-1][1]


def _natural_rel(p: str, other: str) -> int:
    if other in FRIENDS[p]:
        return 1
    if other in ENEMIES[p]:
        return -1
    return 0


def _temporal_rel(p: str, other: str, d1_signs: dict[str, int]) -> int:
    dist = ((d1_signs[other] - d1_signs[p]) % 12) + 1
    return 1 if dist in (2, 3, 4, 10, 11, 12) else -1


_COMPOUND = {2: 22.5, 1: 15.0, 0: 7.5, -1: 3.75, -2: 1.875}


def _dignity(p: str, lord: str, d1_signs: dict[str, int], *, is_d1: bool, lon: float) -> float:
    if lord == p:
        if is_d1:
            ms, lo, hi = MOOLA[p]
            if _sign(lon) == ms and lo <= (lon % 30) < hi:
                return 45.0
        return 30.0
    return _COMPOUND[_natural_rel(p, lord) + _temporal_rel(p, lord, d1_signs)]


def _saptavargaja(p: str, lon: float, d1_signs: dict[str, int]) -> float:
    total = 0.0
    for vf in (_d1, _d2_hora, _d3, _d7, _d9, _d12):
        sign = vf(lon)
        total += _dignity(p, SIGN_LORD[sign], d1_signs, is_d1=(vf is _d1), lon=lon)
    lord30 = _d30_lord(lon)
    if lord30 == p:
        total += 30.0
    else:
        total += _COMPOUND[_natural_rel(p, lord30) + _temporal_rel(p, lord30, d1_signs)]
    return total


def _uchcha(p: str, lon: float) -> float:
    debil = _norm(EXALT_DEG[p] + 180)
    arc = abs(_norm(lon - debil))
    if arc > 180:
        arc = 360 - arc
    return arc / 3.0


def _oja(p: str, lon: float) -> float:
    pref_odd = p not in ("moon", "venus")
    b = 0.0
    for sign in (_d1(lon), _d9(lon)):
        if (sign % 2 == 0) == pref_odd:
            b += 15.0
    return b


def _kendradi(p_sign: int, lagna_sign: int) -> float:
    house = ((p_sign - lagna_sign) % 12) + 1
    if house in (1, 4, 7, 10):
        return 60.0
    if house in (2, 5, 8, 11):
        return 30.0
    return 15.0


def _drekkana(p: str, lon: float) -> float:
    idx = int((lon % 30) // 10)
    if (p in MALE and idx == 0) or (p in NEUTER and idx == 1) or (p in FEMALE and idx == 2):
        return 15.0
    return 0.0


# ── Dig bala ──────────────────────────────────────────────────────────────────
# Offset added to the lagna longitude to reach each planet's point of full strength.
DIG_STRONG = {
    "mercury": 0.0, "jupiter": 0.0,   # East / Lagna
    "sun": 270.0, "mars": 270.0,      # South / 10th cusp
    "saturn": 180.0,                  # West / 7th
    "moon": 90.0, "venus": 90.0,      # North / 4th cusp
}


def _dig(p: str, lon: float, lagna_lon: float) -> float:
    strong = _norm(lagna_lon + DIG_STRONG[p])
    diff = abs(_norm(lon - strong))
    if diff > 180:
        diff = 360 - diff
    return (180 - diff) / 3.0


# ── Kala bala components ──────────────────────────────────────────────────────
def _nathonnatha(p: str, birth_min: float, noon_min: float) -> float:
    day_strength = 60.0 * (1 - min(abs(birth_min - noon_min), 720) / 720)
    if p == "mercury":
        return 60.0
    if p in ("sun", "jupiter", "venus"):
        return day_strength
    return 60.0 - day_strength


def _paksha(p: str, sun_lon: float, moon_lon: float) -> float:
    sep = _norm(moon_lon - sun_lon)
    if sep > 180:
        sep = 360 - sep
    benefic_val = sep / 3.0
    val = benefic_val if p in BENEFICS else 60.0 - benefic_val
    if p == "moon":
        val *= 2
    return val


def _tribhaga(p: str, birth_min: float, sunrise_min: float, sunset_min: float) -> float:
    jup = 60.0 if p == "jupiter" else 0.0
    if sunrise_min <= birth_min < sunset_min:
        length = (sunset_min - sunrise_min) / 3
        third = min(int((birth_min - sunrise_min) / length), 2) if length else 0
        lords = ["mercury", "sun", "saturn"]
    else:
        elapsed = birth_min - sunset_min if birth_min >= sunset_min else birth_min + (1440 - sunset_min)
        length = ((1440 - sunset_min) + sunrise_min) / 3
        third = min(int(elapsed / length), 2) if length else 0
        lords = ["moon", "venus", "mars"]
    return (60.0 if lords[third] == p else 0.0) + jup


def _hora(p: str, birth_min: float, sunrise_min: float, weekday: int) -> float:
    idx = int(((birth_min - sunrise_min) % 1440) // 60)
    start = CHALDEAN.index(VARA_LORD[weekday])
    return 60.0 if CHALDEAN[(start + idx) % 7] == p else 0.0


def _ayana(p: str, sidereal_lon: float, ayanamsa: float, obliquity: float) -> float:
    trop = _norm(sidereal_lon + ayanamsa)
    decl = math.degrees(math.asin(math.sin(math.radians(obliquity)) * math.sin(math.radians(trop))))
    if p in ("moon", "saturn"):
        decl = -decl
    val = max(0.0, min(60.0, (decl + 24.0) / 48.0 * 60.0))
    if p == "sun":
        val *= 2  # the Sun's Ayana bala is doubled
    return val


_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _weekday_of(dt: datetime, tz_name: str) -> int:
    _, _, eng = get_vaara(dt, tz_name)
    return _WEEKDAYS.index(eng)


def _ingress_weekday(birth_utc: datetime, target_deg: float, tz_name: str, max_days: int) -> int:
    """Weekday (0=Sun) of the day the Sun most recently crossed `target_deg` — the
    sign cusp that began the current solar month (masa) or year (varsha)."""
    day = birth_utc
    for _ in range(max_days):
        prev = day - timedelta(days=1)
        rel_day = (get_sun_longitude(day) - target_deg) % 360
        rel_prev = (get_sun_longitude(prev) - target_deg) % 360
        if rel_prev > 300 and rel_day < 60:  # boundary fell between prev and day
            break
        day = prev
    return _weekday_of(day, tz_name)


# ── Cheshta & Drik ────────────────────────────────────────────────────────────
def _cheshta(p: str, speeds: dict[str, float]) -> float:
    if p in ("sun", "moon"):
        return 0.0
    v = speeds[p]
    if v < 0:  # retrograde (vakra) — maximal motional strength
        return 60.0
    vm = MEAN_SPEED.get(p, 1.0)
    ratio = v / vm if vm else 1.0
    if ratio <= 1.0:
        return 45.0 - 15.0 * ratio       # stationary ≈ 45 → mean = 30
    return max(15.0, 30.0 - 15.0 * (ratio - 1.0))  # fast (atichara) → 15


def _base_drishti(x: float) -> float:
    x = _norm(x)
    if x <= 30 or x >= 300:
        return 0.0 if x <= 30 else _base_drishti(360 - x)  # symmetric backward gaze tiny
    if x <= 60:
        return (x - 30) / 2.0
    if x <= 90:
        return (x - 60) + 15.0
    if x <= 120:
        return 45.0 - (x - 90) / 2.0
    if x <= 180:
        return 30.0 + (x - 120) / 2.0
    # 180..300 mirror of 60..180
    return _base_drishti(360 - x)


def _special_full(planet: str, x: float) -> float:
    x = _norm(x)
    specials = {
        "mars": (90, 210), "jupiter": (120, 240), "saturn": (60, 270),
    }
    for centre in specials.get(planet, ()):  # full 60 within the special house
        if abs((x - centre + 180) % 360 - 180) <= 15:
            return 60.0
    return 0.0


def _drishti(aspecting: str, x: float) -> float:
    return max(_base_drishti(x), _special_full(aspecting, x))


def _drik(p: str, lons: dict[str, float]) -> float:
    total = 0.0
    for o in PLANETS:
        if o == p:
            continue
        angle = _norm(lons[p] - lons[o])  # aspected − aspecting
        d = _drishti(o, angle)
        total += d if o in BENEFICS else -d
    return total / 4.0


def _status(ratio: float) -> str:
    if ratio >= 1.5:
        return "Exceptional"
    if ratio >= 1.2:
        return "Strong"
    if ratio >= 1.0:
        return "Adequate"
    if ratio >= 0.9:
        return "Borderline"
    return "Weak"


def compute_shadbala(
    instant_utc: datetime,
    *,
    lat: float,
    lon: float,
    timezone_name: str,
    ayanamsa: int | None = None,
) -> dict[str, Any]:
    """Full sixfold strength of the seven planets at an instant."""
    from engine.astronomy.swiss_eph import AYANAMSA_LAHIRI

    mode = ayanamsa if ayanamsa is not None else AYANAMSA_LAHIRI
    jd = get_julian_day(instant_utc)
    obliquity = default_engine.obliquity(jd)

    positions = get_all_planetary_positions(instant_utc, ayanamsa=mode)
    lons = {p: float(positions[p]["longitude"]) for p in PLANETS}
    speeds = {p: float(positions[p]["speed"]) for p in PLANETS}
    d1_signs = {p: _sign(lons[p]) for p in PLANETS}
    lagna_lon = get_sidereal_asc_longitude(instant_utc, lat=lat, lon=lon, ayanamsa=mode)
    lagna_sign = _sign(lagna_lon)

    # Day frame: sunrise / sunset / weekday in the observer's timezone.
    local = instant_utc.astimezone(_tz(timezone_name))
    sunrise = calculate_sunrise(local.date(), lat, lon, timezone_name=timezone_name).astimezone(_tz(timezone_name))
    sunset = calculate_sunset(local.date(), lat, lon, timezone_name=timezone_name).astimezone(_tz(timezone_name))
    birth_min = local.hour * 60 + local.minute + local.second / 60
    sunrise_min = sunrise.hour * 60 + sunrise.minute + sunrise.second / 60
    sunset_min = sunset.hour * 60 + sunset.minute + sunset.second / 60
    noon_min = (sunrise_min + sunset_min) / 2
    weekday = _weekday_now(sunrise, timezone_name)
    masa_lord_wd = _ingress_weekday(instant_utc, target_deg=(d1_signs["sun"] * 30.0), tz_name=timezone_name, max_days=40)
    varsha_lord_wd = _ingress_weekday(instant_utc, target_deg=0.0, tz_name=timezone_name, max_days=400)

    rows: list[dict[str, Any]] = []
    for p in PLANETS:
        lp = lons[p]
        uchcha = _uchcha(p, lp)
        saptavargaja = _saptavargaja(p, lp, d1_signs)
        oja = _oja(p, lp)
        kendradi = _kendradi(d1_signs[p], lagna_sign)
        drekkana = _drekkana(p, lp)
        sthana = uchcha + saptavargaja + oja + kendradi + drekkana

        dig = _dig(p, lp, lagna_lon)

        nathonnatha = _nathonnatha(p, birth_min, noon_min)
        paksha = _paksha(p, lons["sun"], lons["moon"])
        tribhaga = _tribhaga(p, birth_min, sunrise_min, sunset_min)
        varadhipati = 45.0 if VARA_LORD[weekday] == p else 0.0
        masadhipati = 30.0 if VARA_LORD[masa_lord_wd] == p else 0.0
        varshadhipati = 15.0 if VARA_LORD[varsha_lord_wd] == p else 0.0
        hora = _hora(p, birth_min, sunrise_min, weekday)
        ayana = _ayana(p, lp, mode, obliquity)
        # Graha yuddha adjustment not modelled — exposed as 0 for table parity.
        yuddha = 0.0
        kala = (
            nathonnatha + paksha + tribhaga
            + varadhipati + masadhipati + varshadhipati
            + hora + ayana + yuddha
        )

        # BPHS: the Sun's Cheshta bala is its (undoubled) Ayana bala; the
        # Moon's is its (undoubled) Paksha bala.
        if p == "sun":
            cheshta = min(60.0, ayana / 2.0)
        elif p == "moon":
            cheshta = paksha / 2.0
        else:
            cheshta = _cheshta(p, speeds)
        naisargika = NAISARGIKA[p]
        drik = _drik(p, lons)

        breakdown = {
            "sthana": round(sthana, 2),
            "dig": round(dig, 2),
            "kala": round(kala, 2),
            "cheshta": round(cheshta, 2),
            "naisargika": round(naisargika, 2),
            "drik": round(drik, 2),
        }
        total = sum(breakdown.values())
        required = REQUIRED[p]
        ratio = total / required if required else 0.0
        top = max(breakdown, key=breakdown.get)
        weakest = min(breakdown, key=breakdown.get)
        name, name_ne = PLANET_NAMES[p]

        # Ishta / Kashta phala from Uchcha and Cheshta (virupas, 0–60 each).
        u = max(0.0, min(60.0, uchcha))
        c = max(0.0, min(60.0, cheshta))
        ishta = math.sqrt(u * c)
        kashta = math.sqrt((60.0 - u) * (60.0 - c))

        rows.append({
            "key": p,
            "name": name,
            "name_ne": name_ne,
            "total_virupas": round(total, 2),
            "rupas": round(total / 60.0, 2),
            "required": required,
            "ratio": round(ratio, 4),
            "status": _status(ratio),
            "top_bala": BALA_LABELS[top],
            "weakest_bala": BALA_LABELS[weakest],
            "breakdown": breakdown,
            "ishta_phala": round(ishta, 2),
            "kashta_phala": round(kashta, 2),
            "sub_balas": {
                "sthana": {
                    "uchcha": round(uchcha, 2),
                    "saptavargaja": round(saptavargaja, 2),
                    "oja_yugma": round(oja, 2),
                    "kendradi": round(kendradi, 2),
                    "drekkana": round(drekkana, 2),
                },
                "kala": {
                    "nathonnatha": round(nathonnatha, 2),
                    "paksha": round(paksha, 2),
                    "tribhaga": round(tribhaga, 2),
                    "varshadhipati": round(varshadhipati, 2),
                    "masadhipati": round(masadhipati, 2),
                    "varadhipati": round(varadhipati, 2),
                    "horadhipati": round(hora, 2),
                    "ayana": round(ayana, 2),
                    "yuddha": round(yuddha, 2),
                },
            },
        })

    rows.sort(key=lambda r: r["ratio"], reverse=True)

    counts = {k: 0 for k in ("Exceptional", "Strong", "Adequate", "Borderline", "Weak")}
    for r in rows:
        counts[r["status"]] += 1
    meeting = sum(1 for r in rows if r["ratio"] >= 1.0)
    avg_virupas = sum(r["total_virupas"] for r in rows) / len(rows)
    strongest, weakest_planet = rows[0], rows[-1]

    return {
        "planets": rows,
        "summary": {
            "strongest": _summary_ref(strongest),
            "weakest": _summary_ref(weakest_planet),
            "average_rupas": round(avg_virupas / 60.0, 2),
            "average_virupas": round(avg_virupas, 2),
            "meeting_threshold": meeting,
            "total_planets": len(rows),
            "counts": counts,
        },
        "method": "Parashari Shadbala (Lahiri sidereal, Swiss Ephemeris)",
    }


def _summary_ref(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": row["key"],
        "name": row["name"],
        "name_ne": row["name_ne"],
        "status": row["status"],
        "ratio": row["ratio"],
    }


def _tz(name: str):
    from zoneinfo import ZoneInfo

    try:
        return ZoneInfo(name)
    except Exception:
        return timezone.utc


def _weekday_now(sunrise_local: datetime, tz_name: str) -> int:
    return _weekday_of(sunrise_local, tz_name)
