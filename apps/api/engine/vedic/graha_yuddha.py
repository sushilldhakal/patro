"""Graha Yuddha (planetary war): two tara grahas within 1° of longitude."""

from __future__ import annotations

from typing import Any

# Tara grahas that may enter planetary war.
_TARA_GRAHAS = ["mars", "mercury", "jupiter", "venus", "saturn"]

# Disc diameter in arc-seconds (Bimba Parimana) per B.V. Raman Art. 77.
_DISC_ARCSEC = {
    "mars": 9.4,
    "mercury": 6.6,
    "jupiter": 190.4,
    "venus": 16.6,
    "saturn": 158.0,
}

_WAR_ORB_DEG = 1.0


def _kala_for_yuddha(planet: dict[str, Any]) -> float:
    """Kala bala components used in yuddha tri-bala (ayana excluded)."""
    kala = (planet.get("sub_balas") or {}).get("kala")
    if not kala:
        return float(planet["breakdown"]["kala"])
    return sum(
        float(kala.get(k) or 0.0)
        for k in (
            "nathonnatha", "paksha", "tribhaga",
            "varshadhipati", "masadhipati", "varadhipati", "horadhipati",
        )
    )


def _tri_bala(planet: dict[str, Any]) -> float:
    b = planet["breakdown"]
    return float(b["sthana"]) + float(b["dig"]) + _kala_for_yuddha(planet)


def compute_yuddha_bala(
    planets: list[dict[str, Any]],
    longitudes: dict[str, float],
) -> dict[str, Any]:
    """Victor = lower longitude; yuddha virupas = |tri-bala diff| / |disc diff|."""
    by_planet: dict[str, float] = {}
    wars: list[dict[str, Any]] = []

    tara: list[tuple[str, dict[str, Any], float]] = []
    for key in _TARA_GRAHAS:
        planet = next((p for p in planets if p.get("key") == key), None)
        lon = longitudes.get(key)
        if planet is not None and lon is not None:
            tara.append((key, planet, lon))

    for i in range(len(tara)):
        for j in range(i + 1, len(tara)):
            a_key, a_planet, a_lon = tara[i]
            b_key, b_planet, b_lon = tara[j]
            sep = abs(a_lon - b_lon) % 360.0
            if sep > 180.0:
                sep = 360.0 - sep
            if sep >= _WAR_ORB_DEG:
                continue

            if a_lon <= b_lon:
                winner_key, winner, loser_key, loser = a_key, a_planet, b_key, b_planet
            else:
                winner_key, winner, loser_key, loser = b_key, b_planet, a_key, a_planet

            tri_diff = abs(_tri_bala(winner) - _tri_bala(loser))
            disc_diff = abs(_DISC_ARCSEC.get(winner_key, 1.0) - _DISC_ARCSEC.get(loser_key, 1.0))
            virupas = tri_diff / disc_diff if disc_diff > 0 else 0.0

            wars.append(
                {
                    "winner": winner_key,
                    "loser": loser_key,
                    "yuddhaVirupas": round(virupas, 2),
                    "separationDeg": round(sep, 4),
                }
            )
            by_planet[winner_key] = round(by_planet.get(winner_key, 0.0) + virupas, 2)
            by_planet[loser_key] = round(by_planet.get(loser_key, 0.0) - virupas, 2)

    return {"wars": wars, "byPlanet": by_planet}
