"""नामाङ्कित वैदिक तारा — named bright stars, the ones classical texts single
out by name rather than only as नक्षत्र members.

Positions are computed live from the Swiss Ephemeris fixed-star catalogue
(``data/ephemeris/sefstars.txt``, the same file and source as the app's
planetary ``.se1`` binaries) via :meth:`AstronomyEngine.fixed_star_sidereal` —
real precession, proper motion, aberration and nutation, in the same Lahiri
sidereal frame every graha in ``gochar`` is already expressed in. There is no
hand-rolled precession formula here; the ephemeris does that work.

A few of these are the same physical star a नक्षत्र is already named for
(चित्रा *is* Spica, आर्द्रा *is* Betelgeuse) and a few are traditions pointing
at the same star under two names (प्रस्वा and लुब्धक-बन्धु both name
Procyon). Both are kept as separate catalogue entries: a reader searching for
लुब्धक-बन्धु should find it under its own name rather than have to already
know it is Procyon under another one.

Three entries — प्रजापति (the Orion figure), सप्तर्षि (the Big Dipper) and
त्रिशङ्कु (the Southern Cross) — plus मिथुन and अश्विनौ, name a whole
asterism rather than one star, and have no single catalogue star to sit on.
Their position is the geometric centroid (on the unit sphere, to sidestep any
0°/360° wrap) of the figure's own bright stars, each resolved the same way as
any other entry here.

शिशुमार (the Purāṇic dolphin figure — tail, waist and jaw) is different
again: every body part it names is a real, already-individually-catalogued
star, not a centroid, so it needs no composite entry here at all. The client
draws the lines joining them (see ``vedic-constellations.ts``); this module
only has to make sure each star it needs is present under its own name.
"""

from __future__ import annotations

import math
from typing import Any

from engine.astronomy.engine import EphemerisError, default_engine

# Search keys are the sefstars.txt "nomenclature" field (Bayer/Flamsteed),
# looked up with a leading comma — which searches that field only, so a
# traditional-name collision (the file lists several stars twice, under two
# traditions) can never resolve the wrong star.
_SINGLE_STARS: tuple[tuple[str, str, str, str], ...] = (
    ("अगस्त्य", "Canopus", "α Carinae — HIP 30438", ",alCar"),
    ("मृगव्याध / लुब्धक", "Sirius", "α Canis Majoris — HIP 32349", ",alCMa"),
    ("अग्नि / हुतभुक्", "Elnath", "β Tauri — HIP 25428", ",beTau"),
    ("ब्रह्महृदय", "Capella", "α Aurigae — HIP 24608", ",alAur"),
    ("अपाम्वत्स", "Spica", "α Virginis — HIP 65474", ",alVir"),
    ("आप / आपः", "Auva", "δ Virginis — HIP 63608", ",deVir"),
    ("अभिजित्", "Vega", "α Lyrae — HIP 91262", ",alLyr"),
    ("मरीचि", "Alkaid", "η Ursae Majoris — HIP 67301", ",etUMa"),
    ("वसिष्ठ", "Mizar", "ζ Ursae Majoris — HIP 65378", ",zeUMa"),
    ("अरुन्धती", "Alcor", "80 Ursae Majoris — HIP 65477", ",80UMa"),
    ("अङ्गिरा", "Alioth", "ε Ursae Majoris — HIP 62956", ",epUMa"),
    ("अत्रि", "Megrez", "δ Ursae Majoris — HIP 59774", ",deUMa"),
    ("पुलस्त्य", "Phecda", "γ Ursae Majoris — HIP 58001", ",gaUMa"),
    ("पुलह", "Merak", "β Ursae Majoris — HIP 53910", ",beUMa"),
    ("क्रतु", "Dubhe", "α Ursae Majoris — HIP 54061", ",alUMa"),
    ("मित्र", "Alpha Centauri", "α Centauri — HIP 71683", ",alCen"),
    ("मित्रक", "Beta Centauri / Hadar", "β Centauri — HIP 68702", ",beCen"),
    ("हंस", "Deneb", "α Cygni — HIP 102098", ",alCyg"),
    ("मीनास्य", "Fomalhaut", "α Piscis Austrini — HIP 113368", ",alPsA"),
    ("राजन्य", "Rigel", "β Orionis — HIP 24436", ",beOri"),
    ("प्रस्वा / प्रसू", "Procyon", "α Canis Minoris — HIP 37279", ",alCMi"),
    ("आर्द्रा", "Betelgeuse", "α Orionis — HIP 27989", ",alOri"),
    ("आधार", "Adhara", "ε Canis Majoris — HIP 33579", ",epCMa"),
    ("कार्तवीर्य", "Saiph", "κ Orionis — HIP 27366", ",kaOri"),
    ("चित्रलेखा", "Mintaka", "δ Orionis — HIP 25930", ",deOri"),
    ("अनिरुद्ध", "Alnilam", "ε Orionis — HIP 26311", ",epOri"),
    ("उषा", "Alnitak", "ζ Orionis — HIP 26727", ",zeOri"),
    ("मृगशिरासँग सम्बन्धित ताराहरू", "Meissa / Lambda Orionis region", "λ Orionis — HIP 26207", ",laOri"),
    ("लुब्धक-बन्धु", "Procyon", "α Canis Minoris — HIP 37279", ",alCMi"),
    ("दिति", "Pollux", "Diti — β Geminorum — HIP 37826", ",beGem"),
    ("अदिति", "Castor", "Aditi — α Geminorum — HIP 36850", ",alGem"),
    # शिशुमार (the Purāṇic dolphin/porpoise figure) — तारा not already above.
    # Two of its names repeat ones used elsewhere in this catalogue for a
    # different physical star (प्रजापति also names the Orion figure below;
    # अग्नि also names Elnath above) — both are real, separately attested
    # traditions naming different stars the same thing, kept as given rather
    # than invented apart.
    ("ध्रुवतारा", "Polaris", "α Ursae Minoris — the tail's tip", ",alUMi"),
    ("प्रजापति", "Thuban", "α Draconis — शिशुमारको पुच्छर", ",alDra"),
    ("अग्नि", "Rastaban", "β Draconis — शिशुमारको पुच्छर", ",beDra"),
    ("इन्द्र", "Eltanin", "γ Draconis — शिशुमारको पुच्छर", ",gaDra"),
    ("धर्म", "Altais", "δ Draconis — शिशुमारको पुच्छर", ",deDra"),
    ("धाता", "Kochab", "β Ursae Minoris — पुच्छरको जरा", ",beUMi"),
    ("विधाता", "Pherkad", "γ Ursae Minoris — पुच्छरको जरा", ",gaUMi"),
    ("उत्तानपाद", "Edasich", "ι Draconis — शिशुमारको माथिल्लो बङ्गारा", ",ioDra"),
    ("यज्ञ", "Alsafi", "σ Draconis — शिशुमारको तल्लो बङ्गारा", ",siDra"),
    ("ब्रह्मा", "Zeta Draconis", "ζ Draconis — शिशुमारको टाउको", ",zeDra"),
)

# Whole-asterism entries: no single catalogue star, so the position is the
# centroid of these member keys (each resolved individually, same as above).
_COMPOSITE_STARS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "प्रजापति",
        "Orion",
        "Orion — traditional identification; no single star",
        (",alOri", ",beOri", ",gaOri", ",deOri", ",epOri", ",zeOri", ",kaOri"),
    ),
    (
        "सप्तर्षि",
        "Ursa Major / Big Dipper",
        "Ursa Major — 7-star asterism",
        (",alUMa", ",beUMa", ",gaUMa", ",deUMa", ",epUMa", ",zeUMa", ",etUMa"),
    ),
    (
        "त्रिशङ्कु",
        "Southern Cross / Crux",
        "Crux — constellation/asterism",
        (",alCru", ",beCru", ",gaCru", ",deCru"),
    ),
    (
        "अश्विनौ",
        "Ashvinau",
        "Castor & Pollux — α + β Geminorum",
        (",alGem", ",beGem"),
    ),
    (
        "मिथुन",
        "Gemini",
        "Mithuna — Gemini / The Twins",
        (",alGem", ",beGem", ",gaGem", ",deGem", ",epGem", ",muGem"),
    ),
)


def _centroid(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Mean direction of ecliptic (lon, lat) points, on the unit sphere.

    Averaging longitude directly breaks the moment a figure straddles the
    0°/360° seam; going through Cartesian unit vectors sidesteps that
    entirely, at the cost of no accuracy the display needs.
    """
    x = y = z = 0.0
    for lon, lat in points:
        lo = math.radians(lon)
        la = math.radians(lat)
        cl = math.cos(la)
        x += cl * math.cos(lo)
        y += cl * math.sin(lo)
        z += math.sin(la)
    n = len(points)
    x /= n
    y /= n
    z /= n
    lon = math.degrees(math.atan2(y, x)) % 360.0
    lat = math.degrees(math.atan2(z, math.hypot(x, y)))
    return lon, lat


def _place(key: str, jd: float) -> tuple[float, float, float] | None:
    try:
        return default_engine.fixed_star_sidereal(key, jd)
    except (EphemerisError, Exception):
        return None


def build_vedic_stars(jd: float) -> list[dict[str, Any]]:
    """The named-star catalogue, positioned for *jd* (Julian Day, UT).

    Each entry: ``ne``/``en`` names, ``designation`` hint, sidereal ecliptic
    ``lon``/``lat`` in degrees, and ``mag`` (apparent visual magnitude — the
    brightest member's, for whole-asterism entries).
    """
    out: list[dict[str, Any]] = []
    for ne, en, designation, key in _SINGLE_STARS:
        placed = _place(key, jd)
        if placed is None:
            continue
        lon, lat, mag = placed
        out.append(
            {"ne": ne, "en": en, "designation": designation, "lon": round(lon, 4), "lat": round(lat, 4), "mag": round(mag, 2)}
        )
    for ne, en, designation, keys in _COMPOSITE_STARS:
        placed = [p for p in (_place(key, jd) for key in keys) if p is not None]
        if len(placed) < 2:
            continue
        lon, lat = _centroid([(p[0], p[1]) for p in placed])
        mag = min(p[2] for p in placed)
        out.append(
            {"ne": ne, "en": en, "designation": designation, "lon": round(lon, 4), "lat": round(lat, 4), "mag": round(mag, 2)}
        )
    return out
