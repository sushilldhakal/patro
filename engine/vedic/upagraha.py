"""Upagraha (shadow point) positions for an instant.

Two families:

* Kāla-velā upagrahas (Gulika, Mandi, Kala, Mrityu, Ardha Prahara,
  Yama Ghantaka) — the sidereal ascendant rising at a planet's portion of
  the day. Day (sunrise→sunset) or night (sunset→next sunrise) is split
  into eight equal portions; portions are ruled by the weekday lords in
  order starting from the day lord (day birth) or from the fifth lord
  after it (night birth), the eighth portion being lordless. Each
  upagraha is the ascendant at the START of its lord's portion; Gulika
  uses the MIDDLE of Saturn's portion (Mandi takes the start).

* Sun-based upagrahas (Dhuma, Vyatipata, Parivesha, Indra Chapa,
  Upaketu) — fixed arcs from the Sun's sidereal longitude.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.engine import EphemerisError, default_engine

# Portion lords in weekday order; index matches vaara (0 = Sunday).
_WEEKDAY_LORDS = ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")

# Kāla-velā upagraha → the planet whose portion it rises in.
# Order here is the display order.
_KALA_VELA: tuple[tuple[str, str, bool], ...] = (
    # (key, portion lord, use middle of portion)
    ("gulika", "saturn", True),
    ("mandi", "saturn", False),
    ("kala", "sun", False),
    ("mrityu", "mars", False),
    ("ardha_prahara", "mercury", False),
    ("yama_ghantaka", "jupiter", False),
)

UPAGRAHA_NAMES: dict[str, dict[str, str]] = {
    "gulika": {"en": "Gulika", "ne": "गुलिक"},
    "mandi": {"en": "Mandi", "ne": "माण्डि"},
    "kala": {"en": "Kala", "ne": "काल"},
    "mrityu": {"en": "Mrityu", "ne": "मृत्यु"},
    "ardha_prahara": {"en": "Ardha Prahara", "ne": "अर्धप्रहर"},
    "yama_ghantaka": {"en": "Yama Ghantaka", "ne": "यमघण्टक"},
    "dhuma": {"en": "Dhuma", "ne": "धूम"},
    "vyatipata": {"en": "Vyatipata", "ne": "व्यतीपात"},
    "parivesha": {"en": "Parivesha", "ne": "परिवेष"},
    "indra_chapa": {"en": "Indra Chapa", "ne": "इन्द्रचाप"},
    "upaketu": {"en": "Upaketu", "ne": "उपकेतु"},
}


def _entry(key: str, longitude: float, at_utc: datetime | None = None) -> dict[str, Any]:
    lon = longitude % 360
    names = UPAGRAHA_NAMES[key]
    out: dict[str, Any] = {
        "key": key,
        "name": names["en"],
        "name_ne": names["ne"],
        "longitude": round(lon, 6),
        "rashi": int(lon / 30) % 12 + 1,
        "deg_in_rashi": round(lon % 30, 6),
    }
    if at_utc is not None:
        out["at_utc"] = at_utc.isoformat()
    return out


def sun_based_upagrahas(sun_longitude: float) -> list[dict[str, Any]]:
    """Dhuma → Upaketu from the Sun's sidereal longitude."""
    dhuma = (sun_longitude + 133.0 + 20.0 / 60.0) % 360
    vyatipata = (360.0 - dhuma) % 360
    parivesha = (vyatipata + 180.0) % 360
    indra_chapa = (360.0 - parivesha) % 360
    upaketu = (indra_chapa + 16.0 + 40.0 / 60.0) % 360
    return [
        _entry("dhuma", dhuma),
        _entry("vyatipata", vyatipata),
        _entry("parivesha", parivesha),
        _entry("indra_chapa", indra_chapa),
        _entry("upaketu", upaketu),
    ]


def kala_vela_upagrahas(
    instant_utc: datetime,
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_num: int,
    *,
    lat: float,
    lon: float,
    ayanamsa: int | None = None,
) -> list[dict[str, Any]]:
    """Gulika/Mandi/Kala/Mrityu/Ardha Prahara/Yama Ghantaka for the instant.

    Uses the day scheme for daytime instants and the night scheme
    otherwise; `vaara_num` is the vedic day's weekday (0 = Sunday).
    """
    is_day = sunrise_utc <= instant_utc < sunset_utc
    if is_day:
        span_start, span_end = sunrise_utc, sunset_utc
        first_lord = vaara_num % 7
    else:
        span_start, span_end = sunset_utc, next_sunrise_utc
        first_lord = (vaara_num + 4) % 7  # fifth lord from the day lord

    portion = (span_end - span_start) / 8
    # Portion index (0-6) for each lord; the eighth portion is lordless.
    portion_of = {
        _WEEKDAY_LORDS[(first_lord + i) % 7]: i for i in range(7)
    }

    out: list[dict[str, Any]] = []
    for key, lord, use_middle in _KALA_VELA:
        offset = portion_of[lord] + (0.5 if use_middle else 0.0)
        at = span_start + timedelta(seconds=portion.total_seconds() * offset)
        jd = default_engine.julian_day(at)
        asc = default_engine.ascendant(jd, lat, lon, ayanamsa=ayanamsa)
        out.append(_entry(key, asc, at))
    return out


def build_upagraha_block(
    instant_utc: datetime,
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_num: int,
    sun_longitude: float,
    *,
    lat: float,
    lon: float,
    ayanamsa: int | None = None,
) -> list[dict[str, Any]] | None:
    """Kāla-velā + sun-based upagrahas in display order; None on failure."""
    try:
        rows = kala_vela_upagrahas(
            instant_utc,
            sunrise_utc,
            sunset_utc,
            next_sunrise_utc,
            vaara_num,
            lat=lat,
            lon=lon,
            ayanamsa=ayanamsa,
        )
        rows.extend(sun_based_upagrahas(sun_longitude))
        return rows
    except EphemerisError:
        return None
