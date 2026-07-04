"""Bhava Bala (B.V. Raman Ch. IX) and Sripathi drishti values.

Bhava Bala = Bhavadhipati + Bhava Disha + Bhava Drishti over whole-sign houses,
using the planet Shadbala totals.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.graha_details import norm_lon, rashi_lord_key

# Reference virupas (7 rupas) for comparative Bhava Bala %.
BHAVA_BALA_REFERENCE_VIRUPAS = 420

_LORD_LABEL = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
}

_ASPECT_KEYS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]


# ── Sripathi / Raman drishti ─────────────────────────────────────────────────

def drishti_kendra(aspected_lon: float, aspecting_lon: float) -> float:
    """Aspect angle: aspected minus aspecting longitude (0-360)."""
    return (norm_lon(aspected_lon) - norm_lon(aspecting_lon)) % 360.0


def drishti_value(kendra_deg: float) -> float:
    """Drishti strength in virupas for an aspect angle (30°-300° window)."""
    k = kendra_deg
    if k < 30 or k > 300:
        return 0.0
    if k < 60:
        return (k - 30) / 2
    if k < 90:
        return k - 60 + 15
    if k < 120:
        return (120 - k) / 2 + 30
    if k < 150:
        return 150 - k
    if k < 180:
        return (k - 150) * 2
    return (300 - k) / 2


def visesha_drishti(planet_key: str, kendra_deg: float) -> float:
    """Special (full) aspects of Mars, Jupiter and Saturn per classical rules."""
    k = kendra_deg
    if k < 30 or k > 300:
        return 0.0
    if planet_key == "mars" and (90 <= k < 120 or 210 <= k < 240):
        return 15.0
    if planet_key == "jupiter" and (120 <= k < 150 or 240 <= k < 270):
        return 30.0
    if planet_key == "saturn" and (60 <= k < 90 or 270 <= k < 300):
        return 45.0
    return 0.0


def total_drishti_on_point(aspected_lon: float, aspecting_lon: float, aspecting_key: str) -> float:
    kendra = drishti_kendra(aspected_lon, aspecting_lon)
    return drishti_value(kendra) + visesha_drishti(aspecting_key, kendra)


# ── Bhava Bala ───────────────────────────────────────────────────────────────

def _rashi_from_lon(longitude: float) -> int:
    return int(norm_lon(longitude) // 30) + 1


def _sign_kind(longitude: float) -> str:
    """Sign group at a sidereal longitude (B.V. Raman Art. 127-130)."""
    rashi = _rashi_from_lon(longitude)
    deg = norm_lon(longitude) % 30
    if rashi == 8:
        return "keeta"
    if rashi in (4, 12) or (rashi == 10 and deg >= 15):
        return "jala"
    if rashi in (1, 2, 5) or (rashi == 9 and deg >= 15) or (rashi == 10 and deg < 15):
        return "chatushpada"
    return "nara"


def bhava_dig_bala(house: int, madhya_lon: float) -> float:
    """Bhava Digbala per BPHS 27.26-29 / Raman Art. 131."""
    kind = _sign_kind(madhya_lon)
    reference = {"keeta": 1, "chatushpada": 4, "nara": 7, "jala": 10}[kind]
    diff = abs(house - reference)
    if diff > 6:
        diff = 12 - diff
    return diff * 10.0


def bhava_madhya_longitude(lagna_rashi: int, house: int) -> float:
    """Whole-sign bhava madhya: centre of the sign occupying the house."""
    rashi = (lagna_rashi - 1 + house - 1) % 12 + 1
    return (rashi - 1) * 30.0 + 15.0


def _is_benefic_for_bhava_drishti(key: str, moon_paksha: float | None) -> bool:
    if key in ("jupiter", "venus", "mercury"):
        return True
    if key == "moon":
        # Waxing Moon (higher paksha bala) counts as benefic; waning as malefic.
        return moon_paksha is None or moon_paksha >= 45
    return False


def _bhava_drishti_bala(
    madhya_lon: float,
    planet_longitudes: dict[str, float],
    moon_paksha: float | None,
) -> float:
    subha = 0.0
    papa = 0.0
    for key in _ASPECT_KEYS:
        lon = planet_longitudes.get(key)
        if lon is None:
            continue
        raw = total_drishti_on_point(madhya_lon, lon, key)
        if raw <= 0:
            continue
        weighted = raw if key in ("jupiter", "mercury") else raw / 4.0
        if _is_benefic_for_bhava_drishti(key, moon_paksha):
            subha += weighted
        else:
            papa += weighted
    return subha - papa


def compute_bhava_bala(
    lagna_rashi: int,
    shadbala_planets: list[dict[str, Any]],
    planet_longitudes: dict[str, float],
) -> dict[str, Any]:
    """Whole-sign Bhava Bala table with strongest / weakest houses."""
    virupas_by_key = {p["key"]: p.get("total_virupas", 0.0) for p in shadbala_planets}
    moon = next((p for p in shadbala_planets if p["key"] == "moon"), None)
    moon_paksha = ((moon or {}).get("sub_balas") or {}).get("kala", {}).get("paksha")

    houses: list[dict[str, Any]] = []
    for house in range(1, 13):
        madhya = bhava_madhya_longitude(lagna_rashi, house)
        lord_key = rashi_lord_key(_rashi_from_lon(madhya))
        bhavadhipati = virupas_by_key.get(lord_key, 0.0)
        disha = bhava_dig_bala(house, madhya)
        drishti = _bhava_drishti_bala(madhya, planet_longitudes, moon_paksha)
        total = bhavadhipati + disha + drishti
        houses.append(
            {
                "house": house,
                "madhyaLongitude": madhya,
                "lordKey": lord_key,
                "lordName": _LORD_LABEL.get(lord_key, lord_key),
                "bhavadhipati": round(bhavadhipati, 2),
                "disha": round(disha, 2),
                "drishti": round(drishti, 2),
                "totalVirupas": round(total, 2),
                "totalPinda": round(total, 2),
                "rupas": round(total / 60.0, 4),
                "percent": round(total / BHAVA_BALA_REFERENCE_VIRUPAS * 100.0, 2),
            }
        )

    ordered = sorted(houses, key=lambda h: h["totalVirupas"], reverse=True)

    # Mean Bhava (%) across the houses each graha rules (Shadbala matrix row).
    rulership_percent: dict[str, float] = {}
    for key in _ASPECT_KEYS:
        ruled = [h for h in houses if h["lordKey"] == key]
        if ruled:
            rulership_percent[key] = round(sum(h["percent"] for h in ruled) / len(ruled), 2)

    return {
        "houses": houses,
        "strongest": ordered[0],
        "weakest": ordered[-1],
        "rulershipPercent": rulership_percent,
        "referenceVirupas": BHAVA_BALA_REFERENCE_VIRUPAS,
    }
