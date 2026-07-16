"""Deterministic Vedic (Parashari) kundali interpretation engine.

Given a birth chart — D1 planetary positions, lagna, Shadbala, and the
Vimshottari dasha sequence — this module produces a structured, balanced,
plain-language report covering personality, career, finances, relationships,
health, the current life phase, a 12-month outlook, and a planet-/house-/
yoga-by-yoga breakdown.

It is **rule based, not an LLM**. Every statement is derived from chart facts
(house placement, dignity, navamsa corroboration, Shadbala, yogas, and the
running dasha) so reports are reproducible and explainable.

Confidence indicator
--------------------
Most astrology reports state every line with equal certainty. Here, each
insight internally weighs independent supporting and contradicting factors
(D1 placement, D9/navamsa, Shadbala, yogas, current dasha). When several agree
the insight is graded a *strong* tendency; when they conflict it is presented
as *mixed / conditional*; thin evidence is *tentative*. The grade and the
factors behind it travel with every section so the reader can see the
reasoning rather than trust a flat assertion.

The tables below mirror the classical values also used by
``panchanga.shadbala``; they are duplicated here deliberately so this module
stays importable (and unit-testable) without the JPL ephemeris native
dependency.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Iterator, Optional

# ── Classical reference tables ────────────────────────────────────────────────

PLANET_KEYS = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]

# Seven graha that carry dignity / Shadbala (Rahu & Ketu are shadow nodes).
DIGNITY_PLANETS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

PLANET_EN = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
    "rahu": "Rahu", "ketu": "Ketu",
}
PLANET_NE = {
    "sun": "सूर्य", "moon": "चन्द्र", "mars": "मंगल", "mercury": "बुध",
    "jupiter": "बृहस्पति", "venus": "शुक्र", "saturn": "शनि",
    "rahu": "राहु", "ketu": "केतु",
}

RASHI_EN = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]
RASHI_NE = [
    "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

# 0-based sign → ruling planet.
SIGN_LORD = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
]

# Deep-exaltation sign (0-based) per planet; debilitation is the opposite sign.
EXALT_SIGN = {
    "sun": 0, "moon": 1, "mars": 9, "mercury": 5,
    "jupiter": 3, "venus": 11, "saturn": 6,
}
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

NATURAL_BENEFICS = {"jupiter", "venus", "mercury", "moon"}
NATURAL_MALEFICS = {"sun", "mars", "saturn", "rahu", "ketu"}

# Special aspects (graha drishti), as house offsets counted from the planet's
# own house. Every planet aspects the 7th; these add the classical specials.
SPECIAL_ASPECTS = {
    "mars": {4, 7, 8},
    "jupiter": {5, 7, 9},
    "saturn": {3, 7, 10},
    "rahu": {5, 7, 9},
    "ketu": {5, 7, 9},
}

KARAKA = {
    "sun": "soul, vitality, father, authority and self-confidence",
    "moon": "mind, emotions, mother, comfort and the public",
    "mars": "energy, courage, drive, siblings and property",
    "mercury": "intellect, communication, commerce and learning",
    "jupiter": "wisdom, ethics, wealth, teachers, children and grace",
    "venus": "love, partnership, beauty, comfort and the arts",
    "saturn": "discipline, endurance, work, service and longevity",
    "rahu": "ambition, foreign and unconventional paths, obsession",
    "ketu": "detachment, intuition, past mastery and liberation",
}

HOUSE_THEME = {
    1: "self, body, vitality and overall life direction",
    2: "wealth, speech, family lineage and nourishment",
    3: "courage, effort, siblings, communication and skill",
    4: "home, mother, inner peace, property and education",
    5: "intelligence, creativity, children and past merit",
    6: "work, service, health, competition and obstacles",
    7: "partnership, marriage, business and public dealings",
    8: "transformation, shared resources, research and longevity",
    9: "fortune, dharma, higher learning, mentors and the father",
    10: "career, status, public role and worldly action",
    11: "gains, networks, aspirations and elder siblings",
    12: "release, expenses, retreat, foreign lands and liberation",
}
HOUSE_NE = {
    1: "तनु", 2: "धन", 3: "सहज", 4: "सुख", 5: "सुत", 6: "रिपु",
    7: "जाया", 8: "आयु", 9: "भाग्य", 10: "कर्म", 11: "लाभ", 12: "व्यय",
}

KENDRA = {1, 4, 7, 10}
TRIKONA = {1, 5, 9}
DUSTHANA = {6, 8, 12}
UPACHAYA = {3, 6, 10, 11}

DASHA_ORDER = [
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
]
DASHA_YEARS = {
    "ketu": 7, "venus": 20, "sun": 6, "moon": 10, "mars": 7,
    "rahu": 18, "jupiter": 16, "saturn": 19, "mercury": 17,
}
DASHA_THEME = {
    "sun": "leadership, recognition, dealings with authority and matters of the father",
    "moon": "emotional life, home, public contact and care-giving",
    "mars": "drive, property, technical or competitive effort and bold initiative",
    "mercury": "study, communication, trade, writing and analytical work",
    "jupiter": "growth, wisdom, teaching, finances, children and good counsel",
    "venus": "relationships, comfort, creativity, the arts and material ease",
    "saturn": "discipline, hard work, responsibility, structure and patience",
    "rahu": "ambition, unconventional or foreign avenues and rapid change",
    "ketu": "detachment, specialisation, inner work and spiritual turns",
}

KARAKA_NE = {
    "sun": "आत्मा, जीवन शक्ति, पिता, अधिकार र आत्मविश्वास",
    "moon": "मन, भावना, माता, आराम र जनसम्पर्क",
    "mars": "ऊर्जा, साहस, प्रेरणा, भाइबहिनी र सम्पत्ति",
    "mercury": "बुद्धि, संचार, व्यापार र शिक्षा",
    "jupiter": "ज्ञान, नैतिकता, धन, गुरु, सन्तान र कृपा",
    "venus": "प्रेम, साझेदारी, सौन्दर्य, आराम र कला",
    "saturn": "अनुशासन, धैर्य, कर्म, सेवा र दीर्घायु",
    "rahu": "महत्वाकांक्षा, विदेश/अपरम्परागत मार्ग, आसक्ति",
    "ketu": "वैराग्य, विशेषज्ञता, आन्तरिक साधना र मोक्ष",
}

DASHA_THEME_NE = {
    "sun": "नेतृत्व, मान्यता, अधिकार सम्बन्ध र पितासँग सम्बन्धित विषय",
    "moon": "भावनात्मक जीवन, घर, जनसम्पर्क र हेरचाह",
    "mars": "प्रेरणा, सम्पत्ति, प्राविधिक/प्रतिस्पर्धात्मक प्रयास र साहसिक पहल",
    "mercury": "अध्ययन, संचार, व्यापार, लेखन र विश्लेषणात्मक काम",
    "jupiter": "वृद्धि, ज्ञान, शिक्षण, वित्त, सन्तान र उत्तम सल्लाह",
    "venus": "सम्बन्ध, आराम, सिर्जनशीलता, कला र भौतिक सुविधा",
    "saturn": "अनुशासन, कडा परिश्रम, जिम्मेवारी, संरचना र धैर्य",
    "rahu": "महत्वाकांक्षा, अपरम्परागत/विदेशी मार्ग र द्रुत परिवर्तन",
    "ketu": "वैराग्य, विशेषज्ञता, आन्तरिक साधना र आध्यात्मिक मोड",
}

DAYS_PER_YEAR = 365.2425


# ── Small helpers ─────────────────────────────────────────────────────────────

def _norm(d: float) -> float:
    return d % 360.0


def sign_of(longitude: float) -> int:
    """0-based sign index for an ecliptic longitude."""
    return int(_norm(longitude) // 30) % 12


def navamsa_sign(longitude: float) -> int:
    """0-based D9 (navamsa) sign — 108 padas of 3°20′ across the zodiac."""
    return int(_norm(longitude) / (10.0 / 3.0)) % 12


NAKSHATRA_EN = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]
NAKSHATRA_NE = [
    "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु",
    "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी", "हस्त",
    "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढा",
    "उत्तराषाढा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्वाभाद्रपदा",
    "उत्तराभाद्रपदा", "रेवती",
]
# Vimshottari ruling planet of each nakshatra (drives the dasha at birth).
NAK_LORD = [
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
] * 3


def nakshatra_of(longitude: float) -> tuple[int, int]:
    """0-based nakshatra index and 1-based pada for an ecliptic longitude."""
    span = 360.0 / 27.0
    lon = _norm(longitude)
    idx = int(lon / span) % 27
    pada = int((lon % span) / (span / 4.0)) + 1
    return idx, pada


# Classical combustion orbs (degrees from the Sun) — a planet within this arc of
# the Sun is "combust" (astangata) and its significations are said to weaken.
COMBUST_ORB = {
    "moon": 12.0, "mars": 17.0, "mercury": 14.0,
    "jupiter": 11.0, "venus": 10.0, "saturn": 15.0,
}


def _angular_sep(a: float, b: float) -> float:
    d = abs(_norm(a) - _norm(b)) % 360.0
    return min(d, 360.0 - d)


def _fmt_date(dt: datetime) -> str:
    """Human date like '12 Jun 2027' (cross-platform, no %-d)."""
    return f"{dt.day} {dt:%b %Y}"


def _fmt_month(dt: datetime) -> str:
    return f"{dt:%b %Y}"


def house_of(planet_sign: int, lagna_sign: int) -> int:
    """1-based whole-sign house of a planet relative to the lagna."""
    return ((planet_sign - lagna_sign) % 12) + 1


def house_from(target_sign: int, reference_sign: int) -> int:
    return ((target_sign - reference_sign) % 12) + 1


def _parse_iso(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


_ORDINALS = {
    1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
    7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th",
}


def _ord(n: int) -> str:
    """English ordinal for a house number (1..12)."""
    return _ORDINALS.get(int(n), f"{int(n)}th")


# ── Confidence model ──────────────────────────────────────────────────────────

CONFIDENCE_RANK = {"strong": 3, "moderate": 2, "mixed": 1, "tentative": 0}


@dataclass
class Confidence:
    """Weighs independent supporting vs. contradicting factors for one insight.

    The factor strings are surfaced to the reader so the grade is explainable
    ("strong — based on D1, D9, Shadbala") rather than an opaque assertion.
    """

    supports: list[str] = field(default_factory=list)
    contradicts: list[str] = field(default_factory=list)

    def support(self, factor: str) -> "Confidence":
        self.supports.append(factor)
        return self

    def against(self, factor: str) -> "Confidence":
        self.contradicts.append(factor)
        return self

    @property
    def level(self) -> str:
        s, c = len(self.supports), len(self.contradicts)
        if s == 0 and c == 0:
            return "tentative"
        # Independent factors point both ways → genuinely conditional.
        if s >= 1 and c >= 1 and abs(s - c) <= 1:
            return "mixed"
        net = s - c
        if net >= 3:
            return "strong"
        if net == 2:
            return "moderate"
        if net <= -2:
            return "mixed"
        return "tentative"

    @property
    def factors(self) -> list[str]:
        return [*self.supports, *self.contradicts]

    def as_dict(self) -> dict[str, Any]:
        return {
            "level": self.level,
            "supports": self.supports,
            "contradicts": self.contradicts,
        }


# ── Chart fact extraction ─────────────────────────────────────────────────────

DignityLabel = str  # exalted | moolatrikona | own | great_friend | friend | neutral | enemy | debilitated


def _dignity(planet: str, longitude: float) -> Optional[DignityLabel]:
    """Classical dignity of one of the seven graha at a longitude."""
    if planet not in OWN_SIGNS:
        return None
    sign = sign_of(longitude)
    deg = _norm(longitude) % 30
    if sign == EXALT_SIGN[planet]:
        return "exalted"
    if sign == (EXALT_SIGN[planet] + 6) % 12:
        return "debilitated"
    moola_sign, lo, hi = MOOLA[planet]
    if sign == moola_sign and lo <= deg < hi:
        return "moolatrikona"
    if sign in OWN_SIGNS[planet]:
        return "own"
    dispositor = SIGN_LORD[sign]
    if dispositor == planet:
        return "own"
    if dispositor in FRIENDS[planet]:
        return "friend"
    if dispositor in ENEMIES[planet]:
        return "enemy"
    return "neutral"


# Dignity → a coarse strength score used by the confidence engine.
DIGNITY_SCORE = {
    "exalted": 2, "moolatrikona": 2, "own": 2, "great_friend": 1,
    "friend": 1, "neutral": 0, "enemy": -1, "debilitated": -2, None: 0,
}
DIGNITY_PHRASE = {
    "exalted": "exalted (deeply dignified)",
    "moolatrikona": "in moolatrikona (very comfortable)",
    "own": "in its own sign (stable and self-assured)",
    "friend": "in a friendly sign (supported)",
    "neutral": "in a neutral sign",
    "enemy": "in an enemy sign (somewhat strained)",
    "debilitated": "debilitated (under pressure, needing conscious effort)",
}


@dataclass
class PlanetFact:
    key: str
    longitude: float
    sign: int
    house: int
    retrograde: bool
    dignity: Optional[str]
    navamsa: int
    vargottama: bool
    deg_in_sign: float = 0.0
    nakshatra: int = 0
    pada: int = 1
    combust: bool = False
    shadbala_status: Optional[str] = None
    shadbala_ratio: Optional[float] = None

    def position_label(self) -> str:
        """Precise placement, e.g. 'Tula 12°34′, Swati pada 2, house 1'."""
        deg = int(self.deg_in_sign)
        minute = int(round((self.deg_in_sign - deg) * 60))
        if minute == 60:
            deg, minute = deg + 1, 0
        return (
            f"{RASHI_EN[self.sign]} {deg}°{minute:02d}′, "
            f"{NAKSHATRA_EN[self.nakshatra]} pada {self.pada}, "
            f"house {self.house}"
        )


@dataclass
class Chart:
    lagna_sign: int
    lagna_lon: float
    moon_sign: int
    sun_sign: int
    planets: dict[str, PlanetFact]
    house_occupants: dict[int, list[str]]
    house_lord_house: dict[int, int]   # bhava → house its lord occupies
    house_lord: dict[int, str]
    shadbala: dict[str, dict[str, Any]]
    yogas: list[dict[str, Any]] = field(default_factory=list)
    maha_lord: Optional[str] = None
    antar_lord: Optional[str] = None
    maha_window: Optional[tuple[str, str]] = None
    dasha: Optional[dict[str, Any]] = None
    lagna_nak: tuple[int, int] = (0, 1)
    moon_nak: tuple[int, int] = (0, 1)

    def planet(self, key: str) -> Optional[PlanetFact]:
        return self.planets.get(key)

    def aspects_to(self, target_house: int) -> list[str]:
        """Planets casting a graha drishti onto a house."""
        out = []
        for key, pf in self.planets.items():
            offsets = {7} | SPECIAL_ASPECTS.get(key, set())
            for off in offsets:
                if (pf.house - 1 + (off - 1)) % 12 + 1 == target_house:
                    out.append(key)
                    break
        return out


def _shadbala_index(shadbala: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for row in (shadbala or {}).get("planets", []):
        out[row["key"]] = row
    return out


def _dasha_detail(sequence: list[dict[str, Any]], now: datetime) -> Optional[dict[str, Any]]:
    """Precise running dasha: mahadasha window, the antardasha (bhukti) schedule
    with real dates, the current bhukti, and the next mahadasha transitions.

    Bhukti dates are reconstructed from the mahadasha's theoretical full span
    (``maha_end − full_length``), so they stay exact for full periods and for the
    shorter birth-balance period alike.
    """
    current = None
    index = -1
    for i, period in enumerate(sequence):
        if _parse_iso(period["start"]) <= now < _parse_iso(period["end"]):
            current, index = period, i
            break
    if current is None:
        return None

    maha_lord = current["lord"]
    maha_start = _parse_iso(current["start"])
    maha_end = _parse_iso(current["end"])
    full = timedelta(days=DASHA_YEARS[maha_lord] * DAYS_PER_YEAR)
    theo_start = maha_end - full

    bhuktis: list[dict[str, Any]] = []
    cursor = theo_start
    start_idx = DASHA_ORDER.index(maha_lord)
    for step in range(len(DASHA_ORDER)):
        lord = DASHA_ORDER[(start_idx + step) % len(DASHA_ORDER)]
        dur = timedelta(
            days=DASHA_YEARS[lord] * DASHA_YEARS[maha_lord] / 120.0 * DAYS_PER_YEAR
        )
        b_start, b_end = cursor, cursor + dur
        cursor = b_end
        if b_end <= maha_start:
            continue  # consumed before birth (balance period)
        bhuktis.append({"lord": lord, "start": b_start, "end": b_end})

    cur_bhukti = next(
        (b for b in bhuktis if b["start"] <= now < b["end"]),
        bhuktis[0] if bhuktis else None,
    )
    upcoming_maha = [
        {
            "lord": q["lord"],
            "start": _parse_iso(q["start"]),
            "end": _parse_iso(q["end"]),
        }
        for q in sequence[index + 1: index + 4]
    ]
    return {
        "maha_lord": maha_lord,
        "maha_start": maha_start,
        "maha_end": maha_end,
        "antar_lord": cur_bhukti["lord"] if cur_bhukti else maha_lord,
        "antar_start": cur_bhukti["start"] if cur_bhukti else maha_start,
        "antar_end": cur_bhukti["end"] if cur_bhukti else maha_end,
        "bhuktis": bhuktis,
        "upcoming_maha": upcoming_maha,
    }


def _detect_yogas(chart_planets: dict[str, PlanetFact], lagna_sign: int,
                  moon_sign: int) -> list[dict[str, Any]]:
    """A curated set of classically common yogas detectable from D1 facts."""
    yogas: list[dict[str, Any]] = []
    P = chart_planets

    def house_from_moon(key: str) -> int:
        return house_from(P[key].sign, moon_sign)

    # Gajakesari — Jupiter in a kendra from the Moon.
    if "jupiter" in P and "moon" in P and house_from_moon("jupiter") in KENDRA:
        yogas.append({
            "key": "gajakesari", "name": "Gaja-Kesari Yoga", "polarity": "benefic",
            "text": "Jupiter sits in an angle from the Moon, a classic combination "
                    "for good judgement, respect and steady fortune that tends to "
                    "ripen with maturity.",
        })
    # Budha-Aditya — Sun and Mercury in the same sign.
    if "sun" in P and "mercury" in P and P["sun"].sign == P["mercury"].sign:
        yogas.append({
            "key": "budhaditya", "name": "Budha-Aditya Yoga", "polarity": "benefic",
            "text": "Sun and Mercury share a sign, favouring intelligence, clear "
                    "expression and analytical or administrative ability "
                    "(strongest when Mercury is not too close/combust).",
        })
    # Chandra-Mangala — Moon and Mars together.
    if "moon" in P and "mars" in P and P["moon"].sign == P["mars"].sign:
        yogas.append({
            "key": "chandra_mangala", "name": "Chandra-Mangala Yoga", "polarity": "mixed",
            "text": "Moon with Mars gives enterprise and earning drive; the same "
                    "energy benefits from a calm outlet so initiative doesn't turn "
                    "into impatience.",
        })
    # Pancha Mahapurusha — Mars/Mercury/Jupiter/Venus/Saturn own/exalted in a kendra.
    mahapurusha = {
        "mars": "Ruchaka", "mercury": "Bhadra", "jupiter": "Hamsa",
        "venus": "Malavya", "saturn": "Sasa",
    }
    for key, name in mahapurusha.items():
        pf = P.get(key)
        if pf and pf.house in KENDRA and pf.dignity in {"exalted", "own", "moolatrikona"}:
            yogas.append({
                "key": f"mahapurusha_{key}", "name": f"{name} Mahapurusha Yoga",
                "polarity": "benefic",
                "text": f"{PLANET_EN[key]} is dignified in an angle, forming {name} "
                        f"Yoga — a signature of strong character traits tied to "
                        f"{KARAKA[key].split(',')[0]}.",
            })
    # Kemadruma — Moon isolated (2nd & 12th from Moon empty of other planets).
    second_moon = (moon_sign + 1) % 12
    twelfth_moon = (moon_sign - 1) % 12
    neighbours = [
        k for k, pf in P.items()
        if k != "moon" and pf.sign in {second_moon, twelfth_moon}
    ]
    if "moon" in P and not neighbours:
        yogas.append({
            "key": "kemadruma", "name": "Kemadruma (isolated Moon)", "polarity": "caution",
            "text": "The Moon has no planets flanking it, which classically points "
                    "to needing self-built emotional support structures. It is "
                    "widely considered softened by a strong Moon, benefic aspects, "
                    "or planets in angles — so treat it as a reminder to nurture "
                    "stable routines and relationships, not as a verdict.",
        })
    # Neecha-bhanga — a debilitated planet whose dispositor or exaltation-lord
    # sits in a kendra from the lagna (a common cancellation rule).
    for key, pf in P.items():
        if pf.dignity != "debilitated":
            continue
        dispositor = SIGN_LORD[pf.sign]
        exalt_lord = SIGN_LORD[EXALT_SIGN[key]] if key in EXALT_SIGN else None
        cancellers = {dispositor, exalt_lord} - {None}
        if any(P[c].house in KENDRA for c in cancellers if c in P):
            yogas.append({
                "key": f"neechabhanga_{key}", "name": f"Neecha-Bhanga ({PLANET_EN[key]})",
                "polarity": "benefic",
                "text": f"{PLANET_EN[key]} is debilitated but its strength is "
                        f"classically restored (neecha-bhanga) because a related "
                        f"lord holds an angle — early friction in this area often "
                        f"converts into notable later strength.",
            })
    # Raja yoga — a trikona lord and a kendra lord occupying the same house.
    return yogas


def _detect_raja_dhana(chart: "Chart") -> list[dict[str, Any]]:
    """Yogas that need house-lord placements (run after the Chart is built)."""
    yogas: list[dict[str, Any]] = []
    lord_house = chart.house_lord_house

    kendra_lords = {chart.house_lord[h] for h in KENDRA if h in chart.house_lord}
    trikona_lords = {chart.house_lord[h] for h in TRIKONA if h in chart.house_lord}
    # Raja yoga — kendra & trikona lords sharing a house (excluding pure 1st-1st).
    seen = set()
    for kl in kendra_lords:
        for tl in trikona_lords:
            if kl == tl:
                continue
            if kl in chart.planets and tl in chart.planets:
                if chart.planets[kl].house == chart.planets[tl].house:
                    pair = frozenset({kl, tl})
                    if pair in seen:
                        continue
                    seen.add(pair)
                    yogas.append({
                        "key": "raja_" + "_".join(sorted(pair)),
                        "name": "Raja Yoga", "polarity": "benefic",
                        "text": f"An angular lord ({PLANET_EN[kl]}) and a trine lord "
                                f"({PLANET_EN[tl]}) join in one house — a Raja-yoga "
                                f"pattern supporting rise in status, provided the "
                                f"planets involved are reasonably strong.",
                    })
    # Dhana yoga — lords of 2 and 11 (wealth & gains) together.
    l2 = chart.house_lord.get(2)
    l11 = chart.house_lord.get(11)
    if l2 and l11 and l2 in chart.planets and l11 in chart.planets:
        if chart.planets[l2].house == chart.planets[l11].house:
            yogas.append({
                "key": "dhana_2_11", "name": "Dhana Yoga", "polarity": "benefic",
                "text": "The lords of income (2nd) and gains (11th) combine, a "
                        "wealth-forming pattern that rewards consistent earning "
                        "and saving habits.",
            })
    return yogas


# ── Extended yoga catalog helpers ─────────────────────────────────────────────

MANGALIK_HOUSES = {1, 2, 4, 7, 8, 12}
CHANDRA_FLANK_SKIP = frozenset({"sun", "moon"})
SURYA_FLANK_SKIP = frozenset({"sun"})
YOGA_BENEFICS = frozenset({"jupiter", "venus", "mercury", "moon"})


def _sign_in_arc(sign: int, start_sign: int, end_sign: int) -> bool:
    """Whole-sign hemisphere containment, inclusive of both boundary signs."""
    if start_sign <= end_sign:
        return start_sign <= sign <= end_sign
    return sign >= start_sign or sign <= end_sign


def _kala_sarpa_present(P: dict[str, PlanetFact]) -> bool:
    """All seven tara grahas confined to one side of the Rahu-Ketu axis.

    Classical practice judges this by rashi (whole sign), not exact degree —
    a planet sharing Rahu's or Ketu's own sign is still standing at the node,
    not breaking out of the hemisphere. An exact-degree check would call the
    yoga broken by a planet that's merely a couple of degrees past the node
    while still in the very same sign as it — far stricter than how this
    yoga is judged in practice.
    """
    if "rahu" not in P:
        return False
    rahu_sign = P["rahu"].sign
    ketu_sign = P["ketu"].sign if "ketu" in P else (rahu_sign + 6) % 12
    signs = [P[k].sign for k in DIGNITY_PLANETS if k in P]
    if not signs:
        return False
    return (
        all(_sign_in_arc(s, rahu_sign, ketu_sign) for s in signs)
        or all(_sign_in_arc(s, ketu_sign, rahu_sign) for s in signs)
    )


def _planets_in_house_from_sign(
    ref_sign: int,
    house_num: int,
    P: dict[str, PlanetFact],
    skip: frozenset[str] = frozenset(),
) -> list[str]:
    target_sign = (ref_sign + house_num - 1) % 12
    return [k for k, pf in P.items() if k not in skip and pf.sign == target_sign]


def _chandra_flank(moon_sign: int, P: dict[str, PlanetFact]) -> tuple[list[str], list[str]]:
    second = _planets_in_house_from_sign(moon_sign, 2, P, CHANDRA_FLANK_SKIP)
    twelfth = _planets_in_house_from_sign(moon_sign, 12, P, CHANDRA_FLANK_SKIP)
    return second, twelfth


def _surya_flank(sun_sign: int, P: dict[str, PlanetFact]) -> tuple[list[str], list[str]]:
    second = _planets_in_house_from_sign(sun_sign, 2, P, SURYA_FLANK_SKIP)
    twelfth = _planets_in_house_from_sign(sun_sign, 12, P, SURYA_FLANK_SKIP)
    return second, twelfth


def _mangala_dosha_present(
    P: dict[str, PlanetFact], lagna_sign: int, moon_sign: int,
) -> bool:
    if "mars" not in P:
        return False
    mars_sign = P["mars"].sign
    refs = [lagna_sign, moon_sign]
    if "venus" in P:
        refs.append(P["venus"].sign)
    return any(house_from(mars_sign, ref) in MANGALIK_HOUSES for ref in refs)


def _mallika_present(P: dict[str, PlanetFact]) -> bool:
    if not all(k in P for k in DIGNITY_PLANETS):
        return False
    for start in range(1, 14):
        block = {(start + i - 1) % 12 + 1 for i in range(7)}
        if all(P[k].house in block for k in DIGNITY_PLANETS):
            return True
    return False


def _same_sign_parity(a: int, b: int, c: int) -> bool:
    return (a % 2) == (b % 2) == (c % 2)


def full_yoga_catalog(chart: "Chart") -> list[dict[str, Any]]:
    """Every fixed-identity yoga this app checks for, present or not.

    ``chart.yogas`` (built by ``_detect_yogas``/``_detect_raja_dhana`` above)
    only ever contains *formed* yogas — it feeds the narrative report, where
    an absent yoga simply has nothing to say. The Kundali Yoga table needs
    the opposite: a fixed checklist a reader can scan in full, each row
    carrying an explicit ``present`` flag, so this walks the same classical
    rules unconditionally instead of appending only on a match.
    """
    P = chart.planets
    moon_sign = chart.moon_sign
    sun_sign = chart.sun_sign
    lagna_sign = chart.lagna_sign
    catalog: list[dict[str, Any]] = []

    def house_from_moon(key: str) -> int:
        return house_from(P[key].sign, moon_sign) if key in P else -1

    def house_from_lagna(key: str) -> int:
        return house_from(P[key].sign, lagna_sign) if key in P else -1

    lagnesh = chart.house_lord.get(1)
    lagnesh_pf = P.get(lagnesh) if lagnesh else None

    chandra_2, chandra_12 = _chandra_flank(moon_sign, P)
    surya_2, surya_12 = _surya_flank(sun_sign, P)

    # ── Dosha & major patterns ────────────────────────────────────────────────
    catalog.append({
        "key": "mangala_dosha", "name": "Mangala Dosha", "polarity": "caution",
        "present": _mangala_dosha_present(P, lagna_sign, moon_sign),
        "text": "Mars occupies the 1st, 2nd, 4th, 7th, 8th or 12th house from "
                "the lagna, Moon or Venus — a classical Manglik pattern for which "
                "marriage matching and remedial timing are traditionally considered.",
    })
    catalog.append({
        "key": "kala_sarpa", "name": "Kala Sarpa Yoga", "polarity": "caution",
        "present": _kala_sarpa_present(P),
        "text": "All seven tara grahas fall on one side of the Rahu–Ketu axis with "
                "none breaking out of the nodal hemisphere — a pattern associated "
                "with karmic intensity and sudden reversals in life direction.",
    })
    catalog.append({
        "key": "lagna_mallika", "name": "Lagna Mallika Yoga", "polarity": "benefic",
        "present": _mallika_present(P),
        "text": "All seven tara grahas occupy seven consecutive whole-sign houses — "
                "a Mallika pattern supporting steady rise when the involved planets "
                "are reasonably strong.",
    })

    # ── Moon-based (Chandra) yogas ────────────────────────────────────────────
    catalog.append({
        "key": "gajakesari", "name": "Gaja-Kesari Yoga", "polarity": "benefic",
        "present": "jupiter" in P and "moon" in P and house_from_moon("jupiter") in KENDRA,
        "text": "Formed when Jupiter sits in an angle (kendra) from the Moon — a classic "
                "combination for good judgement, respect and steady fortune that tends to "
                "ripen with maturity.",
    })
    catalog.append({
        "key": "sunapha", "name": "Sunapha Yoga", "polarity": "benefic",
        "present": bool(chandra_2) and not chandra_12,
        "text": "Planets (other than the Sun) occupy the 2nd house from the Moon while "
                "the 12th from the Moon is empty — a Chandra yoga for self-made prosperity "
                "and reputation built through personal effort.",
    })
    catalog.append({
        "key": "anapha", "name": "Anapha Yoga", "polarity": "benefic",
        "present": bool(chandra_12) and not chandra_2,
        "text": "Planets occupy the 12th house from the Moon while the 2nd from the Moon "
                "is empty — a Chandra yoga for refinement, comfort and graceful conduct "
                "that attracts support from others.",
    })
    catalog.append({
        "key": "durdhara", "name": "Durdhara Yoga", "polarity": "benefic",
        "present": bool(chandra_2) and bool(chandra_12),
        "text": "Planets flank the Moon on both the 2nd and 12th sides — a strong Chandra "
                "yoga for wealth, vehicles and a life supported by resources on every side.",
    })
    catalog.append({
        "key": "kemadruma", "name": "Kemadruma (isolated Moon)", "polarity": "caution",
        "present": "moon" in P and not chandra_2 and not chandra_12,
        "text": "Formed when the Moon has no planets flanking it, which classically "
                "points to needing self-built emotional support structures. It is widely "
                "considered softened by a strong Moon, benefic aspects, or planets in "
                "angles — so treat it as a reminder to nurture stable routines and "
                "relationships, not as a verdict.",
    })
    catalog.append({
        "key": "chandra_mangala", "name": "Chandra-Mangala Yoga", "polarity": "mixed",
        "present": "moon" in P and "mars" in P and P["moon"].sign == P["mars"].sign,
        "text": "Formed when the Moon and Mars share a sign, giving enterprise and "
                "earning drive; the same energy benefits from a calm outlet so "
                "initiative doesn't turn into impatience.",
    })
    catalog.append({
        "key": "adhi", "name": "Adhi Yoga", "polarity": "benefic",
        "present": {6, 7, 8} <= {
            house_from_moon(k) for k in ("mercury", "jupiter", "venus") if k in P
        },
        "text": "Mercury, Jupiter and Venus each occupy one of the 6th, 7th and 8th "
                "houses from the Moon — a leadership yoga for authority, command and "
                "respect in public life.",
    })
    catalog.append({
        "key": "chatussagara", "name": "Chatussagara Yoga", "polarity": "benefic",
        "present": all(chart.house_occupants.get(h) for h in KENDRA),
        "text": "All four angular houses (1, 4, 7, 10) contain at least one planet — "
                "a pattern for fame, stability and success across the four pillars of life.",
    })
    catalog.append({
        "key": "vasumati", "name": "Vasumati Yoga", "polarity": "benefic",
        "present": {3, 6, 10, 11} <= {
            house_from_moon(k) for k in YOGA_BENEFICS if k in P
        },
        "text": "Natural benefics occupy all four upachaya houses (3, 6, 10, 11) from "
                "the Moon — a wealth yoga that grows through effort, skill and expanding "
                "networks over time.",
    })
    catalog.append({
        "key": "rajalakshana", "name": "Rajalakshana Yoga", "polarity": "benefic",
        "present": (
            "mercury" in P and P["mercury"].house in KENDRA
            and "venus" in P and P["venus"].house in KENDRA
        ),
        "text": "Mercury and Venus both occupy angular houses — a royal bearing yoga "
                "for charm, eloquence and dignified public presence.",
    })
    catalog.append({
        "key": "vanchana_chora_bheeti", "name": "Vanchana Chora Bheeti Yoga",
        "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house in DUSTHANA
            and any(
                house_from_moon(m) in {2, 6, 8, 12}
                for m in ("mars", "saturn", "rahu", "ketu") if m in P
            ),
        ),
        "text": "The lagna lord sits in a dusthana (6, 8 or 12) while malefics afflict "
                "the Moon — a caution yoga classically linked to anxiety about deception, "
                "theft or hidden enemies; remedial calm and clear boundaries help.",
    })
    catalog.append({
        "key": "shakata", "name": "Shakata Yoga", "polarity": "caution",
        "present": (
            "jupiter" in P and "moon" in P
            and house_from(P["moon"].sign, P["jupiter"].sign) in {6, 8, 12}
        ),
        "text": "The Moon occupies the 6th, 8th or 12th house from Jupiter — a pattern "
                "of fluctuating fortune where gains may be followed by setbacks unless "
                "Jupiter and the Moon are otherwise strengthened.",
    })
    catalog.append({
        "key": "amala", "name": "Amala Yoga", "polarity": "benefic",
        "present": any(
            house_from_lagna(k) == 10 or house_from_moon(k) == 10
            for k in ("jupiter", "venus", "mercury") if k in P
        ),
        "text": "A natural benefic occupies the 10th house from the Lagna or the Moon — "
                "a spotless (amala) reputation yoga for ethical conduct and lasting "
                "public respect.",
    })
    catalog.append({
        "key": "parvata", "name": "Parvata Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf
            and P.get(chart.house_lord.get(12))
            and lagnesh_pf.house in KENDRA
            and P[chart.house_lord[12]].house in KENDRA
        ),
        "text": "The lagna lord and the 12th lord both occupy angular houses — a Parvata "
                "yoga for generosity, prosperity and a life that rises like a mountain "
                "despite obstacles.",
    })
    catalog.append({
        "key": "kahala", "name": "Kahala Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf
            and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
            and P.get(chart.house_lord.get(4))
            and P.get("jupiter")
            and P[chart.house_lord[4]].house in KENDRA
            and P["jupiter"].house in KENDRA
        ),
        "text": "The lagna lord is dignified while the 4th lord and Jupiter both hold "
                "angles — a bold, commanding yoga for property, vehicles and decisive "
                "leadership in one's community.",
    })

    # ── Sun-based (Surya) yogas ───────────────────────────────────────────────
    catalog.append({
        "key": "veshi", "name": "Veshi Yoga", "polarity": "benefic",
        "present": bool(surya_2) and not surya_12,
        "text": "Planets occupy the 2nd house from the Sun while the 12th from the Sun "
                "is empty — a Surya yoga for truthful speech, integrity and recognition "
                "through principled action.",
    })
    catalog.append({
        "key": "vasi", "name": "Vasi Yoga", "polarity": "benefic",
        "present": bool(surya_12) and not surya_2,
        "text": "Planets occupy the 12th house from the Sun while the 2nd from the Sun "
                "is empty — a Surya yoga for charity, spiritual merit and influence "
                "through selfless service.",
    })
    catalog.append({
        "key": "ubhayachari", "name": "Ubhayachari Yoga", "polarity": "benefic",
        "present": bool(surya_2) and bool(surya_12),
        "text": "Planets flank the Sun on both the 2nd and 12th sides — a balanced Surya "
                "yoga for all-round ability, balanced temperament and success in both "
                "worldly and dharmic pursuits.",
    })

    # ── Pancha Mahapurusha ────────────────────────────────────────────────────
    mahapurusha = {
        "mars": "Ruchaka", "mercury": "Bhadra", "jupiter": "Hamsa",
        "venus": "Malavya", "saturn": "Sasa",
    }
    for key, name in mahapurusha.items():
        pf = P.get(key)
        present = bool(pf and pf.house in KENDRA and pf.dignity in {"exalted", "own", "moolatrikona"})
        catalog.append({
            "key": f"mahapurusha_{key}", "name": f"{name} Mahapurusha Yoga",
            "polarity": "benefic", "present": present,
            "text": f"Formed when {PLANET_EN[key]} is dignified (own sign or exalted) in "
                    f"an angle — a signature of strong character traits tied to "
                    f"{KARAKA[key].split(',')[0]}.",
        })

    catalog.append({
        "key": "budhaditya", "name": "Budha-Aditya Yoga", "polarity": "benefic",
        "present": "sun" in P and "mercury" in P and P["sun"].sign == P["mercury"].sign,
        "text": "Formed when the Sun and Mercury share a sign, favouring intelligence, "
                "clear expression and analytical or administrative ability (strongest "
                "when Mercury is not too close/combust).",
    })
    catalog.append({
        "key": "mahabhagya", "name": "Mahabhagya Yoga", "polarity": "benefic",
        "present": _same_sign_parity(lagna_sign, sun_sign, moon_sign),
        "text": "The lagna, Sun and Moon all fall in signs of the same parity (all odd "
                "or all even) — a great-fortune yoga for overall luck, health and "
                "supportive circumstances through life.",
    })
    catalog.append({
        "key": "pushkala", "name": "Pushkala Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh and lagnesh in P and "moon" in P
            and P[lagnesh].sign == P["moon"].sign
        ),
        "text": "The lagna lord and the Moon share a sign — a Pushkala yoga for fame, "
                "popularity and a personality that draws people and opportunities.",
    })

    l9 = chart.house_lord.get(9)
    l9_pf = P.get(l9) if l9 else None
    l2 = chart.house_lord.get(2)
    l5 = chart.house_lord.get(5)
    l6 = chart.house_lord.get(6)

    catalog.append({
        "key": "lakshmi", "name": "Lakshmi Yoga", "polarity": "benefic",
        "present": bool(
            l9_pf
            and l9_pf.dignity in {"own", "exalted", "moolatrikona"}
            and l9_pf.house in KENDRA | TRIKONA
        ),
        "text": "The 9th lord is dignified in an angle or trine — a Lakshmi yoga for "
                "wealth, grace and the blessings of fortune through righteous action.",
    })
    catalog.append({
        "key": "gauri", "name": "Gauri Yoga", "polarity": "benefic",
        "present": bool(
            "venus" in P and P["venus"].dignity in {"own", "exalted", "moolatrikona"}
            and "moon" in P and P["moon"].house in KENDRA
        ),
        "text": "Venus is dignified while the Moon occupies an angle — a Gauri yoga for "
                "beauty, marital happiness and refined enjoyment of life's comforts.",
    })
    catalog.append({
        "key": "bharati", "name": "Bharati Yoga", "polarity": "benefic",
        "present": bool(
            l2 and P.get(l2) and P[l2].house in KENDRA
            and P.get("jupiter")
            and P["jupiter"].dignity in {"own", "exalted", "moolatrikona"}
        ),
        "text": "The 2nd lord occupies an angle while Jupiter is dignified — a Bharati "
                "yoga for scholarship, eloquence and mastery of language or learning.",
    })
    catalog.append({
        "key": "chapa", "name": "Chapa Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf
            and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
            and (disp_pf := P.get(SIGN_LORD[lagnesh_pf.sign]))
            and house_from(disp_pf.sign, moon_sign) in KENDRA
        ),
        "text": "The lagna lord is dignified and its dispositor occupies an angle from "
                "the Moon — a Chapa yoga for royal favour, authority and command over "
                "resources.",
    })
    catalog.append({
        "key": "shrinatha", "name": "Shrinatha Yoga", "polarity": "benefic",
        "present": bool(
            l9 and l5 and P.get(l9) and P.get(l5)
            and P[l9].house == 5 and P[l5].house == 9
        ),
        "text": "The 9th lord sits in the 5th house and the 5th lord in the 9th — a "
                "Shrinatha yoga linking dharma and merit (punya) for wisdom, children "
                "and spiritual fortune.",
    })
    catalog.append({
        "key": "shankha", "name": "Shankha Yoga", "polarity": "benefic",
        "present": bool(
            l5 and l6 and P.get(l5) and P.get(l6)
            and P[l5].house == 6 and P[l6].house == 12
        ),
        "text": "The 5th lord occupies the 6th and the 6th lord the 12th — a Shankha "
                "yoga for longevity, righteous living and prosperity through disciplined "
                "service.",
    })
    catalog.append({
        "key": "bheri", "name": "Bheri Yoga", "polarity": "benefic",
        "present": all(
            P.get(k) and P[k].house in KENDRA
            for k in (lagnesh, "jupiter", "venus") if k
        ),
        "text": "The lagna lord, Jupiter and Venus all occupy angular houses — a Bheri "
                "yoga for a rich, harmonious life with wealth, wisdom and partnership "
                "blessings combined.",
    })
    catalog.append({
        "key": "parijata", "name": "Parijata Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf
            and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
            and (disp_pf := P.get(SIGN_LORD[lagnesh_pf.sign]))
            and disp_pf.house in KENDRA | TRIKONA
        ),
        "text": "The lagna lord is dignified and its dispositor occupies an angle or "
                "trine — a Parijata yoga for recovery from adversity and eventual "
                "prosperity like the celestial tree that blooms after hardship.",
    })

    # ── Neecha-bhanga (per planet) ────────────────────────────────────────────
    for key in DIGNITY_PLANETS:
        pf = P.get(key)
        debilitated = bool(pf and pf.dignity == "debilitated")
        cancelled = False
        if debilitated:
            dispositor = SIGN_LORD[pf.sign]
            exalt_lord = SIGN_LORD[EXALT_SIGN[key]] if key in EXALT_SIGN else None
            cancellers = {dispositor, exalt_lord} - {None}
            cancelled = any(P[c].house in KENDRA for c in cancellers if c in P)
        catalog.append({
            "key": f"neechabhanga_{key}", "name": f"Neecha-Bhanga ({PLANET_EN[key]})",
            "polarity": "benefic", "present": debilitated and cancelled,
            "text": f"Formed when {PLANET_EN[key]} is debilitated but its strength is "
                    f"classically restored (neecha-bhanga) because a related lord — its "
                    f"sign dispositor or exaltation-lord — holds an angle. Early friction "
                    f"in this area then tends to convert into notable later strength.",
        })

    # ── Raja & Dhana yogas ────────────────────────────────────────────────────
    kendra_lords = {chart.house_lord[h] for h in KENDRA if h in chart.house_lord}
    trikona_lords = {chart.house_lord[h] for h in TRIKONA if h in chart.house_lord}
    seen: set[frozenset] = set()
    for kl in sorted(kendra_lords):
        for tl in sorted(trikona_lords):
            if kl == tl:
                continue
            pair = frozenset({kl, tl})
            if pair in seen:
                continue
            seen.add(pair)
            present = bool(
                kl in chart.planets and tl in chart.planets
                and chart.planets[kl].house == chart.planets[tl].house
            )
            catalog.append({
                "key": "raja_" + "_".join(sorted(pair)), "name": "Raja Yoga",
                "polarity": "benefic", "present": present,
                "text": f"Formed when the angular lord ({PLANET_EN[kl]}) and the trine "
                        f"lord ({PLANET_EN[tl]}) join in one house — a Raja-yoga pattern "
                        f"supporting rise in status, provided the planets involved are "
                        f"reasonably strong.",
            })

    l2 = chart.house_lord.get(2)
    l11 = chart.house_lord.get(11)
    dhana_present = bool(
        l2 and l11 and l2 in chart.planets and l11 in chart.planets
        and chart.planets[l2].house == chart.planets[l11].house
    )
    catalog.append({
        "key": "dhana_2_11", "name": "Dhana Yoga", "polarity": "benefic",
        "present": dhana_present,
        "text": "Formed when the lords of income (2nd) and gains (11th) combine in one "
                "house — a wealth-forming pattern that rewards consistent earning and "
                "saving habits.",
    })

    return catalog


def build_chart(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                now: datetime) -> Chart:
    """Assemble all derived facts from the raw API payloads."""
    lagna_lon = float(lagna_raw["longitude"])
    lagna_sign = sign_of(lagna_lon)
    sb_index = _shadbala_index(shadbala_raw)

    sun_lon = float(planets_raw["sun"]["longitude"]) if planets_raw.get("sun") else None

    planets: dict[str, PlanetFact] = {}
    house_occupants: dict[int, list[str]] = {h: [] for h in range(1, 13)}
    for key in PLANET_KEYS:
        raw = planets_raw.get(key)
        if not raw:
            continue
        lon = float(raw["longitude"])
        sign = sign_of(lon)
        house = house_of(sign, lagna_sign)
        d9 = navamsa_sign(lon)
        nak, pada = nakshatra_of(lon)
        sb = sb_index.get(key)
        combust = (
            key in COMBUST_ORB
            and sun_lon is not None
            and _angular_sep(lon, sun_lon) < COMBUST_ORB[key]
        )
        planets[key] = PlanetFact(
            key=key,
            longitude=lon,
            sign=sign,
            house=house,
            retrograde=bool(raw.get("is_retrograde", raw.get("retrograde", False))),
            dignity=_dignity(key, lon),
            navamsa=d9,
            vargottama=(sign == d9),
            deg_in_sign=_norm(lon) % 30.0,
            nakshatra=nak,
            pada=pada,
            combust=combust,
            shadbala_status=sb["status"] if sb else None,
            shadbala_ratio=sb["ratio"] if sb else None,
        )
        house_occupants[house].append(key)

    moon_sign = planets["moon"].sign if "moon" in planets else lagna_sign
    sun_sign = planets["sun"].sign if "sun" in planets else lagna_sign
    moon_nak = (planets["moon"].nakshatra, planets["moon"].pada) if "moon" in planets else (0, 1)
    lagna_nak = nakshatra_of(lagna_lon)

    house_lord: dict[int, str] = {}
    house_lord_house: dict[int, int] = {}
    for h in range(1, 13):
        sign = (lagna_sign + (h - 1)) % 12
        lord = SIGN_LORD[sign]
        house_lord[h] = lord
        if lord in planets:
            house_lord_house[h] = planets[lord].house

    yogas = _detect_yogas(planets, lagna_sign, moon_sign)

    dasha = _dasha_detail(dasha_raw.get("sequence", []), now)
    maha_lord = dasha["maha_lord"] if dasha else None
    antar_lord = dasha["antar_lord"] if dasha else None
    maha_window = (
        (dasha["maha_start"].isoformat(), dasha["maha_end"].isoformat())
        if dasha
        else None
    )

    chart = Chart(
        lagna_sign=lagna_sign,
        lagna_lon=lagna_lon,
        moon_sign=moon_sign,
        sun_sign=sun_sign,
        planets=planets,
        house_occupants=house_occupants,
        house_lord_house=house_lord_house,
        house_lord=house_lord,
        shadbala=sb_index,
        yogas=yogas,
        maha_lord=maha_lord,
        antar_lord=antar_lord,
        maha_window=maha_window,
        dasha=dasha,
        lagna_nak=lagna_nak,
        moon_nak=moon_nak,
    )
    chart.yogas = yogas + _detect_raja_dhana(chart)
    return chart


# ── Confidence helpers tied to chart facts ────────────────────────────────────

def _planet_confidence(chart: Chart, key: str, *, theme_house: Optional[int] = None) -> Confidence:
    """Standard confidence build for a planet-centred insight."""
    conf = Confidence()
    pf = chart.planet(key)
    if not pf:
        return conf
    # D1 dignity.
    score = DIGNITY_SCORE.get(pf.dignity, 0)
    if score >= 2:
        conf.support(f"D1: {PLANET_EN[key]} {DIGNITY_PHRASE.get(pf.dignity, pf.dignity)}")
    elif score == 1:
        conf.support(f"D1: {PLANET_EN[key]} in a friendly sign")
    elif score <= -2:
        conf.against(f"D1: {PLANET_EN[key]} {DIGNITY_PHRASE['debilitated']}")
    elif score == -1:
        conf.against(f"D1: {PLANET_EN[key]} in an enemy sign")
    # D9 corroboration.
    if pf.vargottama:
        conf.support("D9: vargottama (same sign in navamsa — reinforced)")
    else:
        d9_dignity = _dignity(key, pf.navamsa * 30 + 1)  # representative deg in D9 sign
        if d9_dignity in {"exalted", "own", "moolatrikona"}:
            conf.support(f"D9: {PLANET_EN[key]} dignified in navamsa")
        elif d9_dignity == "debilitated":
            conf.against(f"D9: {PLANET_EN[key]} weak in navamsa")
    # Shadbala.
    if pf.shadbala_status in {"Exceptional", "Strong"}:
        conf.support(f"Shadbala: {pf.shadbala_status}")
    elif pf.shadbala_status in {"Weak", "Borderline"}:
        conf.against(f"Shadbala: {pf.shadbala_status}")
    # Dasha activation.
    if key in {chart.maha_lord, chart.antar_lord}:
        role = "mahadasha" if key == chart.maha_lord else "antardasha"
        conf.support(f"Dasha: {PLANET_EN[key]} runs the current {role}")
    return conf


def _house_confidence(chart: Chart, house: int) -> Confidence:
    conf = Confidence()
    lord = chart.house_lord.get(house)
    lf = chart.planet(lord) if lord else None
    if lf:
        score = DIGNITY_SCORE.get(lf.dignity, 0)
        if score >= 2:
            conf.support(f"D1: {_ord(house)} lord {PLANET_EN[lord]} well dignified")
        elif score <= -2:
            conf.against(f"D1: {_ord(house)} lord {PLANET_EN[lord]} debilitated")
        if lf.house in DUSTHANA:
            conf.against(f"D1: {_ord(house)} lord falls in the {_ord(lf.house)} (a difficult house)")
        elif lf.house in KENDRA | TRIKONA:
            conf.support(f"D1: {_ord(house)} lord in a strong angle/trine (the {_ord(lf.house)})")
        if lf.shadbala_status in {"Exceptional", "Strong"}:
            conf.support(f"Shadbala: {_ord(house)} lord {lf.shadbala_status}")
        elif lf.shadbala_status in {"Weak", "Borderline"}:
            conf.against(f"Shadbala: {_ord(house)} lord {lf.shadbala_status}")
    # Occupants.
    occ = chart.house_occupants.get(house, [])
    benefics = [k for k in occ if k in NATURAL_BENEFICS]
    malefics = [k for k in occ if k in NATURAL_MALEFICS]
    if benefics:
        conf.support("D1: natural benefic(s) present — " + ", ".join(PLANET_EN[k] for k in benefics))
    if malefics and house not in UPACHAYA:
        conf.against("D1: natural malefic(s) present — " + ", ".join(PLANET_EN[k] for k in malefics))
    elif malefics and house in UPACHAYA:
        conf.support("D1: malefic(s) in an upachaya house (strengthening here) — "
                     + ", ".join(PLANET_EN[k] for k in malefics))
    return conf


# ── Section composition ───────────────────────────────────────────────────────

def _section(sid: str, title_en: str, title_ne: str, body: Iterable[str],
             conf: Optional[Confidence] = None,
             items: Optional[list[dict[str, Any]]] = None,
             optional: bool = False) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": sid,
        "title_en": title_en,
        "title_ne": title_ne,
        "body": [p for p in body if p],
    }
    if conf is not None:
        out["confidence"] = conf.level
        out["factors"] = conf.factors
    if items is not None:
        out["items"] = items
    if optional:
        out["optional"] = True
    return out


def _planet_line(chart: Chart, key: str) -> str:
    pf = chart.planet(key)
    if not pf:
        return ""
    deg = int(pf.deg_in_sign)
    minute = int(round((pf.deg_in_sign - deg) * 60)) % 60
    bits = [
        f"{PLANET_EN[key]} ({PLANET_NE[key]}) is at {RASHI_EN[pf.sign]} "
        f"{deg}°{minute:02d}′ in {NAKSHATRA_EN[pf.nakshatra]} nakshatra "
        f"(pada {pf.pada}), occupying the {_ord(pf.house)} house"
    ]
    if pf.dignity:
        bits.append(DIGNITY_PHRASE.get(pf.dignity, pf.dignity))
    if pf.retrograde and key not in {"rahu", "ketu"}:
        bits.append("retrograde (its themes turn inward and are revisited)")
    if pf.combust:
        bits.append("combust — close to the Sun, so its outer results need extra effort")
    if pf.vargottama:
        bits.append("vargottama (same sign in D1 and D9 — notably reinforced)")
    return ", ".join(bits) + "."


def _signified_house_planet(chart: Chart, house: int) -> str:
    lord = chart.house_lord.get(house)
    lf = chart.planet(lord) if lord else None
    occ = chart.house_occupants.get(house, [])
    parts = [f"The {_ord(house)} house ({HOUSE_NE.get(house,'')}) governs {HOUSE_THEME[house]}."]
    if lf:
        dign = DIGNITY_PHRASE.get(lf.dignity, lf.dignity or "placed")
        parts.append(
            f"Its lord {PLANET_EN[lord]} sits in the {_ord(lf.house)} house, {dign}"
            + (f", and is graded {lf.shadbala_status} in Shadbala" if lf.shadbala_status else "")
            + "."
        )
    if occ:
        parts.append("Occupied by " + ", ".join(PLANET_EN[k] for k in occ) + ".")
    return " ".join(parts)


def _strength_word(level: str) -> str:
    return {
        "strong": "a strong, well-supported",
        "moderate": "a moderately supported",
        "mixed": "a mixed, conditional",
        "tentative": "a tentative",
    }[level]


def build_sections(chart: Chart, *, now: datetime) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    P = chart.planets
    lagna_lord = chart.house_lord[1]
    ll = chart.planet(lagna_lord)
    moon = chart.planet("moon")
    sun = chart.planet("sun")

    # 1 — Executive summary -----------------------------------------------------
    summary_conf = Confidence()
    if ll:
        if DIGNITY_SCORE.get(ll.dignity, 0) >= 2:
            summary_conf.support(f"D1: lagna lord {PLANET_EN[lagna_lord]} dignified")
        elif DIGNITY_SCORE.get(ll.dignity, 0) <= -2:
            summary_conf.against(f"D1: lagna lord {PLANET_EN[lagna_lord]} debilitated")
        if ll.vargottama:
            summary_conf.support("D9: lagna lord vargottama")
        if ll.shadbala_status in {"Strong", "Exceptional"}:
            summary_conf.support("Shadbala: lagna lord strong")
        elif ll.shadbala_status in {"Weak", "Borderline"}:
            summary_conf.against("Shadbala: lagna lord weak")
    benefic_yogas = [y for y in chart.yogas if y["polarity"] == "benefic"]
    if benefic_yogas:
        summary_conf.support(f"Yogas: {len(benefic_yogas)} supportive combination(s)")
    nak_i, nak_p = chart.moon_nak
    summary_body = [
        f"{RASHI_EN[chart.lagna_sign]} ascendant; the Moon (the mind) is in "
        f"{RASHI_EN[chart.moon_sign]} in {NAKSHATRA_EN[nak_i]} nakshatra, pada {nak_p} "
        f"— your janma nakshatra — and the Sun is in {RASHI_EN[chart.sun_sign]}. "
        f"The rising sign shows how you meet the world, the Moon your inner climate, "
        f"the Sun your core self.",
        f"The ascendant lord {PLANET_EN[lagna_lord]} is "
        + (DIGNITY_PHRASE.get(ll.dignity, "placed") if ll else "placed")
        + (f" in the {_ord(ll.house)} house" if ll else "")
        + ", so the chart rests on "
        + _strength_word(summary_conf.level)
        + " foundation.",
    ]
    if chart.dasha:
        d = chart.dasha
        summary_body.append(
            f"Timing now: the {PLANET_EN[d['maha_lord']]} mahadasha runs until "
            f"{_fmt_date(d['maha_end'])}, and within it the {PLANET_EN[d['antar_lord']]} "
            f"antardasha runs {_fmt_date(d['antar_start'])} – {_fmt_date(d['antar_end'])}. "
            f"The Dasha timeline section gives the full schedule with dates."
        )
    if benefic_yogas:
        summary_body.append(
            "Supportive patterns active: "
            + ", ".join(y["name"] for y in benefic_yogas) + "."
        )
    sections.append(_section(
        "executive_summary", "Executive summary", "सारांश",
        summary_body, summary_conf,
    ))

    # 2 — Personality -----------------------------------------------------------
    pers_conf = _planet_confidence(chart, lagna_lord)
    pers_body = [
        f"Your outward personality is coloured by a {RASHI_EN[chart.lagna_sign]} "
        f"ascendant and shaped most by its ruler {PLANET_EN[lagna_lord]}.",
        _planet_line(chart, lagna_lord),
    ]
    if sun:
        pers_body.append(
            f"The Sun in {RASHI_EN[sun.sign]} (house {sun.house}) describes the will "
            f"and self-image you grow into — themes of {KARAKA['sun']}."
        )
    if "mercury" in P:
        me = P["mercury"]
        pers_body.append(
            f"Mercury in {RASHI_EN[me.sign]} shapes how you think and communicate; "
            + (f"placed in the {_ord(me.house)}, it leans toward {HOUSE_THEME[me.house].split(',')[0]}."
               if me.house else "")
        )
    sections.append(_section("personality", "Personality & temperament",
                             "व्यक्तित्व", pers_body, pers_conf))

    # 3 — Emotional nature ------------------------------------------------------
    emo_conf = _planet_confidence(chart, "moon")
    emo_body = []
    if moon:
        emo_body.append(_planet_line(chart, "moon"))
        emo_body.append(
            f"With the Moon in the {_ord(moon.house)} house, your emotional security is "
            f"tied to {HOUSE_THEME[moon.house]}. "
            + ("A dignified Moon supports natural steadiness of mind."
               if DIGNITY_SCORE.get(moon.dignity, 0) >= 1
               else "Because the Moon is under some pressure here, deliberate rest, "
                    "routine and supportive company pay off noticeably.")
        )
        aspectors = chart.aspects_to(moon.house)
        ben = [a for a in aspectors if a in NATURAL_BENEFICS]
        if ben:
            emo_body.append("Benefic aspect(s) from " + ", ".join(PLANET_EN[a] for a in ben)
                            + " lend the mind extra protection and optimism.")
    sections.append(_section("emotional_nature", "Emotional nature",
                             "भावनात्मक स्वभाव", emo_body, emo_conf))

    # 4 — Strengths -------------------------------------------------------------
    strengths = []
    str_conf = Confidence()
    for key, pf in sorted(P.items(), key=lambda kv: kv[1].shadbala_ratio or 0, reverse=True):
        if pf.dignity in {"exalted", "own", "moolatrikona"} or pf.shadbala_status in {"Strong", "Exceptional"}:
            strengths.append(
                f"{PLANET_EN[key]} is a strong asset — {KARAKA[key].split(',')[0]} comes "
                f"more easily ({DIGNITY_PHRASE.get(pf.dignity, 'well placed')}"
                + (f", {pf.shadbala_status} in Shadbala" if pf.shadbala_status else "") + ")."
            )
            str_conf.support(f"{PLANET_EN[key]} dignified/strong")
    if not strengths:
        strengths.append("No planet is classically exalted, but several are workable; "
                         "your strengths build through effort rather than arriving ready-made.")
    sections.append(_section("strengths", "Core strengths", "बल पक्ष",
                             strengths, str_conf))

    # 5 — Challenges ------------------------------------------------------------
    challenges = []
    ch_conf = Confidence()
    for key, pf in P.items():
        if pf.dignity == "debilitated" or pf.shadbala_status in {"Weak", "Borderline"}:
            cancelled = any(y["key"].startswith(f"neechabhanga_{key}") for y in chart.yogas)
            line = (f"{PLANET_EN[key]} needs conscious support — {KARAKA[key].split(',')[0]} "
                    f"can feel effortful ({DIGNITY_PHRASE.get(pf.dignity, 'under pressure')}"
                    + (f", {pf.shadbala_status} in Shadbala" if pf.shadbala_status else "") + ").")
            if cancelled:
                line += " Encouragingly, a neecha-bhanga pattern tends to convert this into later strength."
            challenges.append(line)
            ch_conf.against(f"{PLANET_EN[key]} weak/debilitated")
    if not challenges:
        challenges.append("No planet is severely afflicted — challenges are likely "
                         "situational rather than deep-seated.")
    challenges.append("Treat these as growth edges: areas that reward patience and "
                     "skill-building, not fixed limitations.")
    sections.append(_section("challenges", "Growth challenges", "चुनौती",
                             challenges, ch_conf))

    # 6 — Career ----------------------------------------------------------------
    car_conf = _house_confidence(chart, 10)
    tenth_lord = chart.house_lord[10]
    tl = chart.planet(tenth_lord)
    car_body = [_signified_house_planet(chart, 10)]
    drivers = [k for k in ("sun", "saturn", "mercury", "mars") if k in P]
    if tl:
        car_body.append(
            f"Career direction follows the 10th lord {PLANET_EN[tenth_lord]} into the "
            f"{_ord(tl.house)} house — blending public work with "
            f"{HOUSE_THEME[tl.house].split(',')[0]}."
        )
    if "saturn" in P and "sun" in P:
        car_body.append(
            "Sun and Saturn together describe the balance between authority/visibility "
            "and disciplined service in your work life.")
    if chart.maha_lord:
        car_body.append(
            f"The running {PLANET_EN[chart.maha_lord]} mahadasha currently colours career "
            f"with {DASHA_THEME[chart.maha_lord]}.")
    sections.append(_section("career", "Career & vocation", "पेशा / कर्म",
                             car_body, car_conf))

    # 7 — Finances --------------------------------------------------------------
    fin_conf = _house_confidence(chart, 2)
    fin_conf2 = _house_confidence(chart, 11)
    for f in fin_conf2.supports:
        fin_conf.support(f)
    for f in fin_conf2.contradicts:
        fin_conf.against(f)
    dhana = [y for y in chart.yogas if "dhana" in y["key"]]
    if dhana:
        fin_conf.support("Yoga: Dhana yoga present")
    fin_body = [_signified_house_planet(chart, 2), _signified_house_planet(chart, 11)]
    if "jupiter" in P:
        fin_body.append(f"Jupiter (natural significator of wealth and grace) is in "
                        f"{RASHI_EN[P['jupiter'].sign]}, house {P['jupiter'].house} — "
                        f"{DIGNITY_PHRASE.get(P['jupiter'].dignity,'placed')}.")
    if dhana:
        fin_body.append("A wealth-forming Dhana yoga supports accumulation through "
                       "steady earning and saving habits.")
    fin_body.append("Finances respond best to systematic saving; the chart describes "
                   "tendencies, while habits decide outcomes.")
    sections.append(_section("finances", "Finances & wealth", "धन / वित्त",
                             fin_body, fin_conf))

    # 8 — Relationships ---------------------------------------------------------
    rel_conf = _house_confidence(chart, 7)
    if "venus" in P:
        v = P["venus"]
        if DIGNITY_SCORE.get(v.dignity, 0) >= 1:
            rel_conf.support(f"D1: Venus {DIGNITY_PHRASE.get(v.dignity,'well placed')}")
        elif DIGNITY_SCORE.get(v.dignity, 0) <= -2:
            rel_conf.against("D1: Venus debilitated")
    rel_body = [_signified_house_planet(chart, 7)]
    if "venus" in P:
        rel_body.append(
            f"Venus, the significator of love and partnership, is in {RASHI_EN[P['venus'].sign]} "
            f"(house {P['venus'].house}) — {DIGNITY_PHRASE.get(P['venus'].dignity,'placed')}. "
            "It describes what you value and seek in closeness.")
    seventh_aspectors = chart.aspects_to(7)
    if any(a in NATURAL_MALEFICS for a in seventh_aspectors):
        rel_body.append("Malefic aspect to the partnership house suggests relationships "
                       "mature through some testing — communication and shared values "
                       "smooth the path. This is a tendency, not a fixed outcome.")
    sections.append(_section("relationships", "Relationships & partnership",
                             "सम्बन्ध", rel_body, rel_conf))

    # 9 — Family ----------------------------------------------------------------
    fam_conf = _house_confidence(chart, 4)
    fam_body = [
        _signified_house_planet(chart, 4),
        _signified_house_planet(chart, 9),
        _signified_house_planet(chart, 3),
    ]
    fam_body.append("The 4th reflects mother and home, the 9th the father and elders, "
                   "the 2nd the wider family, and the 3rd siblings.")
    sections.append(_section("family", "Family & home", "परिवार",
                             fam_body, fam_conf))

    # 10 — Health ---------------------------------------------------------------
    hp_conf = _planet_confidence(chart, lagna_lord)
    sixth = _house_confidence(chart, 6)
    health_body = [
        "In Jyotisha, vitality is read from the lagna, its lord, and the Moon; the "
        "6th house describes illness, recovery and daily regimen.",
    ]
    if ll:
        health_body.append(
            f"The lagna lord {PLANET_EN[lagna_lord]} ({DIGNITY_PHRASE.get(ll.dignity,'placed')}, "
            f"house {ll.house}) "
            + ("supports robust constitution and quick recovery."
               if DIGNITY_SCORE.get(ll.dignity, 0) >= 1
               else "asks for proactive self-care — regular sleep, movement and stress "
                    "management have outsized benefit."))
    health_body.append(_signified_house_planet(chart, 6))
    health_body.append("This is wellbeing guidance from chart tendencies, not medical "
                      "advice; consult a qualified professional for any concern.")
    sections.append(_section("health_wellbeing", "Health & wellbeing",
                             "स्वास्थ्य", health_body, hp_conf))

    # 11 — Spiritual growth -----------------------------------------------------
    sp_conf = _house_confidence(chart, 9)
    sp_body = [_signified_house_planet(chart, 9), _signified_house_planet(chart, 12)]
    if "jupiter" in P:
        sp_body.append(f"Jupiter in house {P['jupiter'].house} points to where wisdom, "
                      "ethics and mentorship naturally develop.")
    if "ketu" in P:
        sp_body.append(f"Ketu in house {P['ketu'].house} ({RASHI_EN[P['ketu'].sign]}) shows "
                      "where you carry instinctive mastery and a pull toward detachment.")
    sections.append(_section("spiritual_growth", "Spiritual growth",
                             "आध्यात्मिक विकास", sp_body, sp_conf))

    # 12 — Current life phase ---------------------------------------------------
    phase_conf = Confidence()
    phase_body = []
    d = chart.dasha
    if d:
        phase_conf = _planet_confidence(chart, d["maha_lord"])
        ml = chart.planet(d["maha_lord"])
        al = chart.planet(d["antar_lord"])
        owns = [h for h, lord in chart.house_lord.items() if lord == d["maha_lord"]]
        phase_body.append(
            f"You are running the {PLANET_EN[d['maha_lord']]} mahadasha (until "
            f"{_fmt_date(d['maha_end'])}), and within it the {PLANET_EN[d['antar_lord']]} "
            f"antardasha from {_fmt_date(d['antar_start'])} to {_fmt_date(d['antar_end'])}. "
            f"This phase emphasises {DASHA_THEME[d['maha_lord']]}.")
        if ml:
            owns_txt = (
                f" and rules your {', '.join(_ord(h) for h in owns)} house"
                + ("s" if len(owns) > 1 else "")
                if owns else ""
            )
            firm = (
                "These results tend to arrive readily"
                if DIGNITY_SCORE.get(ml.dignity, 0) >= 1
                or ml.shadbala_status in {"Strong", "Exceptional"}
                else "These results reward patience and steady effort"
            )
            phase_body.append(
                f"{PLANET_EN[d['maha_lord']]} sits in your {_ord(ml.house)} house"
                f"{owns_txt}, so the period concentrates on "
                f"{HOUSE_THEME[ml.house].split(',')[0]} and the houses it rules. "
                f"It is {DIGNITY_PHRASE.get(ml.dignity, 'placed')} — {firm}.")
        if al and d["antar_lord"] != d["maha_lord"]:
            phase_body.append(
                f"The {PLANET_EN[d['antar_lord']]} antardasha sharpens the sub-theme of "
                f"{DASHA_THEME[d['antar_lord']].split(',')[0]} (it holds your "
                f"{_ord(al.house)} house) until {_fmt_date(d['antar_end'])}.")
    else:
        phase_body.append("Dasha timing could not be resolved for the current date.")
    sections.append(_section("current_life_phase", "Current life phase",
                             "वर्तमान दशा", phase_body, phase_conf))

    # 13 — Dasha timeline (precise dates) ---------------------------------------
    if d:
        horizon = now + timedelta(days=420)
        timeline_items: list[dict[str, Any]] = []
        for b in d["bhuktis"]:
            if b["end"] < now or b["start"] > horizon:
                continue
            lf = chart.planet(b["lord"])
            running = b["start"] <= now < b["end"]
            house_txt = f" — touches your {_ord(lf.house)} house" if lf else ""
            timeline_items.append({
                "label": f"{PLANET_EN[b['lord']]} antardasha"
                         + (" · running now" if running else ""),
                "confidence": _planet_confidence(chart, b["lord"]).level if lf else "tentative",
                "text": f"{_fmt_date(b['start'])} → {_fmt_date(b['end'])}: "
                        f"{DASHA_THEME[b['lord']].split(',')[0]}{house_txt}.",
            })
        for m in d["upcoming_maha"]:
            timeline_items.append({
                "label": f"{PLANET_EN[m['lord']]} mahadasha (next major period)",
                "confidence": "moderate",
                "text": f"Begins {_fmt_date(m['start'])}, lasting to {_fmt_date(m['end'])} "
                        f"({DASHA_YEARS[m['lord']]} yrs): a {DASHA_THEME[m['lord']].split(',')[0]} chapter.",
            })
        timeline_body = [
            f"Antardasha schedule inside the running {PLANET_EN[d['maha_lord']]} mahadasha, "
            f"then the mahadashas that follow — the chart's most precise timing layer.",
        ]
        sections.append(_section("dasha_timeline", "Dasha timeline (dated)",
                                 "दशा तालिका", timeline_body, items=timeline_items))

    # 14 — 12-month outlook -----------------------------------------------------
    out_conf = phase_conf
    outlook_body = []
    if d:
        year_end = now + timedelta(days=365)
        upcoming = [
            b for b in d["bhuktis"]
            if b["start"] > now and b["start"] <= year_end
        ]
        lead = d["antar_lord"]
        lf = chart.planet(lead)
        outlook_body.append(
            f"The {PLANET_EN[lead]} antardasha leads the year (through "
            f"{_fmt_date(d['antar_end'])}), foregrounding {DASHA_THEME[lead]}.")
        if lf:
            good = DIGNITY_SCORE.get(lf.dignity, 0) >= 1 or lf.shadbala_status in {"Strong", "Exceptional"}
            outlook_body.append(
                (f"It is well placed (in your {_ord(lf.house)} house), so initiatives in "
                 "its areas are favoured — a good window to push forward."
                 if good else
                 f"It is under some pressure (in your {_ord(lf.house)} house), so pace "
                 "efforts and prepare rather than force outcomes in its areas."))
        if upcoming:
            nxt = upcoming[0]
            outlook_body.append(
                f"A shift to come: the {PLANET_EN[nxt['lord']]} sub-period opens "
                f"{_fmt_date(nxt['start'])}, bringing {DASHA_THEME[nxt['lord']].split(',')[0]} "
                "to the foreground.")
    else:
        outlook_body.append("A precise dasha-based outlook needs a resolvable timeline for today's date.")
    sections.append(_section("outlook_12_months", "Outlook — next 12 months",
                             "आगामी १२ महिना", outlook_body, out_conf))

    # 14 — Opportunities --------------------------------------------------------
    opp = []
    for h in (TRIKONA | {11}):
        hc = _house_confidence(chart, h)
        if hc.level in {"strong", "moderate"}:
            opp.append(f"The {_ord(h)} house ({HOUSE_THEME[h].split(',')[0]}) is well supported "
                      f"— a natural area to invest energy.")
    for y in chart.yogas:
        if y["polarity"] == "benefic":
            opp.append(f"{y['name']}: {y['text']}")
    if not opp:
        opp.append("Opportunities are built incrementally here; consistency in your "
                  "strongest planet's domain compounds well.")
    sections.append(_section("opportunities", "Opportunities", "अवसर", opp))

    # 15 — Cautions -------------------------------------------------------------
    caut = []
    for h in DUSTHANA:
        hc = _house_confidence(chart, h)
        if hc.level == "mixed" or hc.contradicts:
            caut.append(f"Keep a steady hand with {HOUSE_THEME[h].split(',')[0]} (the {_ord(h)} "
                       "house) — manage rather than force.")
    for y in chart.yogas:
        if y["polarity"] == "caution":
            caut.append(f"{y['name']}: {y['text']}")
    caut.append("None of these are predictions of misfortune — they are areas where "
               "awareness and moderation protect your progress.")
    sections.append(_section("cautions", "Areas for caution", "सावधानी", caut))

    # 16 — Practical recommendations -------------------------------------------
    rec = [
        f"Lean into {PLANET_EN[_strongest(chart)]} themes — that is where momentum is "
        "cheapest to build.",
        f"Give structure to {PLANET_EN[_weakest(chart)]} themes through routine and "
        "small, repeated effort rather than waiting to feel ready.",
        f"Align major moves with the supportive sub-periods noted in the outlook.",
        "Track one concrete habit per priority below for the next quarter.",
    ]
    sections.append(_section("practical_recommendations", "Practical recommendations",
                             "व्यावहारिक सुझाव", rec))

    # 17 — Traditional spiritual practices (optional) ---------------------------
    practices = [
        "These are traditional, faith-based remedies offered as optional support — "
        "they are cultural practices, not requirements or guarantees.",
    ]
    weak = _weakest(chart)
    practices.append(
        f"For strengthening {PLANET_EN[weak]} themes, classical texts suggest its "
        f"weekday observance, charity associated with {PLANET_EN[weak]}, and respectful, "
        "calm conduct in that life area.")
    strong = _strongest(chart)
    practices.append(
        f"Gratitude practices around {PLANET_EN[strong]} themes help you make the most "
        "of an existing strength.")
    practices.append("Above all, ethical action (sadachara) and steadiness are the "
                   "remedies every tradition agrees on.")
    sections.append(_section("spiritual_practices",
                             "Traditional spiritual practices (optional)",
                             "पारम्परिक उपाय (वैकल्पिक)", practices, optional=True))

    # 18 — Planet by planet -----------------------------------------------------
    planet_items = []
    for key in PLANET_KEYS:
        if key not in P:
            continue
        conf = _planet_confidence(chart, key)
        pf = P[key]
        text = (_planet_line(chart, key)
                + f" It signifies {KARAKA[key]}."
                + (f" Shadbala grades it {pf.shadbala_status}." if pf.shadbala_status else ""))
        planet_items.append({
            "label": f"{PLANET_EN[key]} ({PLANET_NE[key]})",
            "confidence": conf.level,
            "factors": conf.factors,
            "text": text,
        })
    sections.append(_section("planet_by_planet", "Planet by planet",
                             "ग्रह विश्लेषण", [], items=planet_items))

    # 19 — House by house -------------------------------------------------------
    house_items = []
    for h in range(1, 13):
        conf = _house_confidence(chart, h)
        house_items.append({
            "label": f"House {h} ({HOUSE_NE.get(h,'')})",
            "confidence": conf.level,
            "factors": conf.factors,
            "text": _signified_house_planet(chart, h),
        })
    sections.append(_section("house_by_house", "House by house",
                             "भाव विश्लेषण", [], items=house_items))

    # 20 — Yogas ----------------------------------------------------------------
    if chart.yogas:
        yoga_items = []
        for y in chart.yogas:
            pol = y["polarity"]
            conf = "moderate" if pol == "benefic" else "mixed" if pol == "mixed" else "tentative"
            yoga_items.append({
                "label": y["name"],
                "confidence": conf,
                "polarity": pol,
                "text": y["text"],
            })
        sections.append(_section("yoga_explanations", "Yogas in your chart",
                                 "योग", [], items=yoga_items))
    else:
        sections.append(_section("yoga_explanations", "Yogas in your chart", "योग",
                                 ["No major classical yoga from the curated set is active; "
                                  "the chart reads through planet and house placements above."]))

    # 21 — Action plan ----------------------------------------------------------
    plan = _action_plan(chart)
    sections.append(_section("action_plan", "Top 5 priorities", "मुख्य ५ प्राथमिकता", plan))

    return sections


def _strongest(chart: Chart) -> str:
    ranked = sorted(
        (p for p in chart.planets.values() if p.key in DIGNITY_PLANETS),
        key=lambda p: (p.shadbala_ratio or 0, DIGNITY_SCORE.get(p.dignity, 0)),
        reverse=True,
    )
    return ranked[0].key if ranked else "jupiter"


def _weakest(chart: Chart) -> str:
    ranked = sorted(
        (p for p in chart.planets.values() if p.key in DIGNITY_PLANETS),
        key=lambda p: (p.shadbala_ratio or 99, DIGNITY_SCORE.get(p.dignity, 0)),
    )
    return ranked[0].key if ranked else "saturn"


def _action_plan(chart: Chart) -> list[str]:
    strong, weak = _strongest(chart), _weakest(chart)
    plan = [
        f"1. Build your platform on {PLANET_EN[strong]} strengths "
        f"({KARAKA[strong].split(',')[0]}) — this is your fastest leverage.",
        f"2. Put a simple weekly routine around {PLANET_EN[weak]} themes "
        f"({KARAKA[weak].split(',')[0]}) so they stop being a drag.",
    ]
    if chart.maha_lord:
        plan.append(
            f"3. Work with the current {PLANET_EN[chart.maha_lord]} period — favour "
            f"{DASHA_THEME[chart.maha_lord].split(',')[0]} for major initiatives.")
    else:
        plan.append("3. Time major initiatives with your supportive sub-periods.")
    tenth = chart.house_lord.get(10)
    plan.append(
        f"4. For career, develop the 10th-house path led by {PLANET_EN[tenth]} "
        "with consistent, visible work.")
    plan.append("5. Keep an ethical, steady daily rhythm — the one remedy that "
               "strengthens every area of the chart.")
    return plan


# ── Public API ────────────────────────────────────────────────────────────────

def build_report(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                 shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                 *, now: Optional[datetime] = None) -> dict[str, Any]:
    """Full structured report as a single dict (meta + sections)."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    chart = build_chart(planets_raw, lagna_raw, shadbala_raw, dasha_raw, now)
    sections = build_sections(chart, now=now)
    return {"meta": _meta(chart, now), "sections": sections}


def iter_report(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                *, now: Optional[datetime] = None, lang: str = "en") -> Iterator[dict[str, Any]]:
    """Yield a ``meta`` record, then one record per section — for streaming."""
    lang = "en" if str(lang).startswith("en") else "ne"
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    chart = build_chart(planets_raw, lagna_raw, shadbala_raw, dasha_raw, now)
    meta = _localize_meta(_meta(chart, now), lang)
    yield {"kind": "meta", **meta}
    sections = build_sections(chart, now=now)
    total = len(sections)
    for i, section in enumerate(sections):
        yield {"kind": "section", "index": i, "total": total, **_localize_section(section, lang)}
    yield {"kind": "done", "total": total}


# ── Nepali localization (term replacement for streamed report text) ───────────

METHOD_NE = "पराशरी नियममा आधारित निष्कर्ष — विश्वास स्तर सहित"
DISCLAIMER_NE = (
    "चिन्तन र सांस्कृतिक अन्तर्दृष्टिका लागि। प्रवृत्ति र सम्भावना देखाउँछ, "
    "निश्चितता होइन; व्यावसायिक सल्लाहको विकल्प होइन।"
)

HOUSE_THEME_NE = {
    1: "आत्म, शरीर, जीवन शक्ति र समग्र जीवन दिशा",
    2: "धन, वाणी, वंश र पोषण",
    3: "साहस, परिश्रम, भाइबहिनी, संचार र सीप",
    4: "घर, माता, आन्तरिक शान्ति, सम्पत्ति र शिक्षा",
    5: "बुद्धि, सिर्जनशीलता, सन्तान र पुण्य",
    6: "कर्म, सेवा, स्वास्थ्य, प्रतिस्पर्धा र बाधा",
    7: "साझेदारी, विवाह, व्यापार र सार्वजनिक सम्बन्ध",
    8: "परिवर्तन, साझा सम्पत्ति, अनुसन्धान र दीर्घायु",
    9: "भाग्य, धर्म, उच्च शिक्षा, गुरु र पिता",
    10: "करियर, स्थिति, सार्वजनिक भूमिका र कर्म",
    11: "लाभ, सञ्जाल, आकांक्षा र ठूला भाइबहिनी",
    12: "मोचन, खर्च, एकान्त, विदेश र मुक्ति",
}

DIGNITY_PHRASE_NE = {
    "exalted": "उच्च (गहिरो गरिमा)",
    "moolatrikona": "मूलत्रिकोणमा (अत्यन्त सहज)",
    "own": "स्वराशिमा (स्थिर र आत्मविश्वासी)",
    "friend": "मित्र राशिमा (समर्थित)",
    "neutral": "सम राशिमा",
    "enemy": "शत्रु राशिमा (केही तनाव)",
    "debilitated": "नीच (दबाब, सचेत प्रयास चाहिन्छ)",
    "placed": "स्थित",
    "well placed": "राम्रो स्थित",
    "under pressure": "दबाबमा",
}


def _build_ne_replacements() -> list[tuple[str, str]]:
    """Longest-first English → Nepali replacements for report prose."""
    pairs: list[tuple[str, str]] = []
    for key, en in PLANET_EN.items():
        pairs.append((en, PLANET_NE[key]))
    for i, en in enumerate(RASHI_EN):
        pairs.append((en, RASHI_NE[i]))
    for i, en in enumerate(NAKSHATRA_EN):
        pairs.append((en, NAKSHATRA_NE[i]))
    for h, en in HOUSE_THEME.items():
        pairs.append((en, HOUSE_THEME_NE[h]))
    for key, en in KARAKA.items():
        pairs.append((en, KARAKA_NE[key]))
    for key, en in DASHA_THEME.items():
        pairs.append((en, DASHA_THEME_NE[key]))
    for en, ne in DIGNITY_PHRASE.items():
        pairs.append((en, DIGNITY_PHRASE_NE.get(en, en)))
    for en, ne in DIGNITY_PHRASE_NE.items():
        if en not in DIGNITY_PHRASE:
            pairs.append((en, ne))
    phrase_map = {
        # Meta / labels
        "Deterministic Parashari interpretation with confidence weighting": METHOD_NE,
        "For reflection and cultural insight. Describes tendencies and "
        "probabilities, not certainties; not a substitute for professional advice.": DISCLAIMER_NE,
        # Yoga names
        "Gaja-Kesari Yoga": "गजकेसरी योग",
        "Budha-Aditya Yoga": "बुधादित्य योग",
        "Chandra-Mangala Yoga": "चन्द्रमंगल योग",
        "Ruchaka Mahapurusha Yoga": "रुचक महापुरुष योग",
        "Bhadra Mahapurusha Yoga": "भद्र महापुरुष योग",
        "Hamsa Mahapurusha Yoga": "हंस महापुरुष योग",
        "Malavya Mahapurusha Yoga": "मालव्य महापुरुष योग",
        "Sasa Mahapurusha Yoga": "शश महापुरुष योग",
        "Kemadruma (isolated Moon)": "केमद्रुम (एकान्त चन्द्र)",
        "Raja Yoga": "राज योग",
        "Dhana Yoga": "धन योग",
        "Neecha-Bhanga": "नीचभंग",
        # Executive summary & core phrases
        " ascendant; the Moon (the mind) is in ": " लग्न; मन (चन्द्र) ",
        " in ": " मा ",
        " nakshatra, pada ": " नक्षत्र, चरण ",
        " — your janma nakshatra — and the Sun is in ": " — जन्म नक्षत्र — र सूर्य ",
        " मा ": " मा ",
        ". The rising sign shows how you meet the world, the Moon your inner climate, "
        "the Sun your core self.": "। लग्नले संसारसँग कसरी भेट्नुहुन्छ, चन्द्रले भित्री मन, सूर्यले मूल स्व भन्छ।",
        "The ascendant lord ": "लग्नका स्वामी ",
        " is ": " ",
        " in the ": " ",
        " house": " औं भावमा",
        ", so the chart rests on ": ", यसैले कुण्डली ",
        " foundation.": " आधारमा टिकेको छ।",
        "a strong, well-supported": "बलियो, राम्रोसँग समर्थित",
        "a moderately supported": "मध्यम रूपमा समर्थित",
        "a mixed, conditional": "मिश्रित, सशर्त",
        "a tentative": "अनिश्चित",
        "Timing now: the ": "समय अहिले: ",
        " mahadasha runs until ": " महादशा ",
        " सम्म चलिरहेको छ, र यसभitr ": " सम्म; यसभित्र ",
        " antardasha runs ": " अन्तर्दशा ",
        " – ": " – ",
        ". The Dasha timeline section gives the full schedule with dates.": "। दशा तालिका खण्डमा पूर्ण मिति सहित तालिका छ।",
        "Supportive patterns active: ": "सहायक योग सक्रिय: ",
        "Your outward personality is coloured by a ": "बाह्य व्यक्तित्व ",
        " ascendant and shaped most by its ruler ": " लग्नले र यसका स्वामी ",
        "The Sun in ": "सूर्य ",
        " (house ": " (",
        ") describes the will and self-image you grow into — themes of ": " औं भावमा) इच्छाशक्ति र आत्म-छवि — ",
        ".": "।",
        "Mercury in ": "बुध ",
        " shapes how you think and communicate; placed in the ": "ले सोच र संचारलाई आकार दिन्छ; ",
        " औं भावमा, ": " औं भावमा, ",
        " it leans toward ": " यसले ",
        "With the Moon in the ": "चन्द्र ",
        " house, your emotional security is tied to ": " औं भावमा भएकाले भावनात्मक सुरक्षा ",
        "A dignified Moon supports natural steadiness of mind.": "गरिमामान चन्द्रले मनको स्वाभाविक स्थिरता समर्थन गर्छ।",
        "Because the Moon is under some pressure here, deliberate rest, "
        "routine and supportive company pay off noticeably.": "यहाँ चन्द्र केही दबाबमा भएकाले, विचारपूर्वक विश्राम, दिनचर्या र सहयोगी साथीहरू स्पष्ट रूपमा फलदायी हुन्छन्।",
        "Benefic aspect(s) from ": "शुभ दृष्टि — ",
        " lend the mind extra protection and optimism.": " — ले मनलाई अतिरिक्त सुरक्षा र आशावाद दिन्छ।",
        " is a strong asset — ": " बलियो सम्पत्ति हो — ",
        " comes more easily (": " सजिलै आउँछ (",
        ", ": ", ",
        " in Shadbala": " षड्बलमा",
        ").": ")।",
        "No planet is classically exalted, but several are workable; "
        "your strengths build through effort rather than arriving ready-made.": "कुनै ग्रह उच्च छैन, तर धेरै कार्ययोग्य छन्; बल परिश्रमबाट बन्दै जान्छ।",
        " needs conscious support — ": " ले सचेत सहयोग चाहिन्छ — ",
        " can feel effortful (": " प्रयासपूर्ण लाग्न सक्छ (",
        " Encouragingly, a neecha-bhanga pattern tends to convert this into later strength.": " उत्साहजनक रूपमा, नीचभंग ढाँचाले पछि बलमा बदल्न सक्छ।",
        "No planet is severely afflicted — challenges are likely "
        "situational rather than deep-seated.": "कुनै ग्रह गम्भीर रूपमा पीडित छैन — चुनौतीहरू प्रायः परिस्थितिजन्य हुन्।",
        "Treat these as growth edges: areas that reward patience and "
        "skill-building, not fixed limitations.": "यिनलाई विकासका क्षेत्रका रूपमा हेर्नुहोस् — धैर्य र सीपले फल दिन्छन्।",
        "Career direction follows the 10th lord ": "करियर दिशा १० औं भावका स्वामी ",
        " into the ": " ",
        " — blending public work with ": " औं भावमा — सार्वजनिक काम ",
        "Sun and Saturn together describe the balance between authority/visibility "
        "and disciplined service in your work life.": "सूर्य र शनि मिलेर काममा अधिकार/दृश्यता र अनुशासित सेवाको सन्तुलन देखाउँछन्।",
        "The running ": "चलिरहेको ",
        " mahadasha currently colours career with ": " महादशाले करियरलाई ",
        ".": "।",
        "Jupiter (natural significator of wealth and grace) is in ": "बृहस्पति (धन र कृपाको कारक) ",
        ", house ": ", ",
        " औं भाव — ": " औं भाव — ",
        "A wealth-forming Dhana yoga supports accumulation through "
        "steady earning and saving habits.": "धन योगले नियमित कमाइ र बचतबाट संचय समर्थन गर्छ।",
        "Finances respond best to systematic saving; the chart describes "
        "tendencies, while habits decide outcomes.": "वित्तमा व्यवस्थित बचत राम्रो; कुण्डली प्रवृत्ति, बानी नतिजा तय गर्छ।",
        "Venus, the significator of love and partnership, is in ": "शुक्र, प्रेम र साझेदारीका कारक, ",
        " — ": " — ",
        "It describes what you value and seek in closeness.": "नजिकको सम्बन्धमा के महत्व दिन्छ भन्छ।",
        "Malefic aspect to the partnership house suggests relationships "
        "mature through some testing — communication and shared values "
        "smooth the path. This is a tendency, not a fixed outcome.": "साझेदारी भावमा पाप ग्रहको दृष्टिले सम्बन्ध परीक्षाबाट परिपक्व हुन्छ — संचार र साझा मूल्यहरूले बाटो सजिलो बनाउँछन्।",
        "The 4th reflects mother and home, the 9th the father and elders, "
        "the 2nd the wider family, and the 3rd siblings.": "४ औं माता/घर, ९ औं पिता/ज्येष्ठ, २ औं परिवार, ३ औं भाइबहिनी देखाउँछ।",
        "In Jyotisha, vitality is read from the lagna, its lord, and the Moon; the "
        "6th house describes illness, recovery and daily regimen.": "ज्योतिषमा जीवन शक्ति लग्न, स्वामी र चन्द्रबाट; ६ औं भाव रोग, निको र दैनिक दिनचर्या।",
        "supports robust constitution and quick recovery.": "बलियो स्वास्थ्य र छिटो निको समर्थन गर्छ।",
        "asks for proactive self-care — regular sleep, movement and stress "
        "management have outsized benefit.": "सचेत आत्म-हेरचाह चाहिन्छ — नियमित निद्रा, चाल र तनाव व्यवस्थापन अत्यन्त फलदायी।",
        "This is wellbeing guidance from chart tendencies, not medical "
        "advice; consult a qualified professional for any concern.": "यो कुण्डली प्रवृत्तिको मार्गदर्शन हो, चिकित्सा सल्लाह होइन।",
        "Jupiter in house ": "बृहस्पति ",
        " points to where wisdom, ethics and mentorship naturally develop.": " औं भावमा ज्ञान, नैतिकता र गुरुत्व विकास हुन्छ।",
        "Ketu in house ": "केतु ",
        " (": " (",
        ") shows where you carry instinctive mastery and a pull toward detachment.": ") ले वैराग्य र अन्तर्ज्ञानको क्षेत्र देखाउँछ।",
        "You are running the ": "तपाईं ",
        " mahadasha (until ": " महादशामा हुनुहुन्छ (",
        "), and within it the ": " सम्म), र यसभित्र ",
        " antardasha from ": " अन्तर्दशा ",
        " to ": " देखि ",
        ". This phase emphasises ": " सम्म। यो चरण ",
        " emphasises ": " मा जोड दिन्छ। ",
        " and rules your ": " र तपाईंको ",
        " house": " औं भाव",
        "s": "हरू",
        "These results tend to arrive readily": "नतिजा सजिलै आउँछ",
        "These results reward patience and steady effort": "नतिजाले धैर्य र निरन्तर प्रयास माग्छ",
        " sits in your ": " तपाईंको ",
        ", so the period concentrates on ": " औं भावमा, अवधि ",
        " and the houses it rules. ": " र शासित भावहरूमा केन्द्रित। ",
        "It is ": "",
        " — ": " — ",
        ".": "।",
        "The ": "",
        " antardasha sharpens the sub-theme of ": " अन्तर्दशाले ",
        " (it holds your ": " (तपाईंको ",
        " house) until ": " औं भाव) ",
        " सम्म।": " सम्म।",
        "Dasha timing could not be resolved for the current date.": "हालको मितिका लागि दशा समय निकाल्न सकिएन।",
        " antardasha": " अन्तर्दशा",
        " · running now": " · अहिले चलिरहेको",
        " — touches your ": " — तपाईंको ",
        " mahadasha (next major period)": " महादशा (अर्को प्रमुख अवधि)",
        "Begins ": "सुरु ",
        ", lasting to ": ", ",
        " सम्म (": " सम्म (",
        " yrs): a ": " वर्ष): ",
        " chapter.": " अध्याय।",
        "Antardasha schedule inside the running ": "चलिरहेको ",
        " mahadasha, then the mahadashas that follow — the chart's most precise timing layer.": " महादशाभित्र अन्तर्दशा, त्यसपछि आउने महादशा — कुण्डलीको सबैभन्दा सटीक समय तह।",
        " antardasha leads the year (through ": " अन्तर्दशाले वर्ष नेतृत्व (",
        "), foregrounding ": " सम्म), ",
        "It is well placed (in your ": "राम्रो स्थित (",
        " house), so initiatives in its areas are favoured — a good window to push forward.": " औं भाव), यसका क्षेत्रमा पहल सफल — अगाडि बढ्न राम्रो समय।",
        "It is under some pressure (in your ": "केही दबाब (",
        " house), so pace efforts and prepare rather than force outcomes in its areas.": " औं भाव), बलजुती नगरी तयारी र गति राख्नुहोस्।",
        "A shift to come: the ": "आउने परिवर्तन: ",
        " sub-period opens ": " उप-अवधि सुरु ",
        ", bringing ": ", ",
        " to the foreground.": " अगाडि।",
        "A precise dasha-based outlook needs a resolvable timeline for today's date.": "सटीक दशा-आधारित दृष्टिकोणका लागि आजको मिति चाहिन्छ।",
        " — a natural area to invest energy.": " — ऊर्जा लगाउने प्राकृतिक क्षेत्र।",
        "Opportunities are built incrementally here; consistency in your "
        "strongest planet's domain compounds well.": "अवसर बिस्तारै बन्दै जान्छ; बलियो ग्रहको क्षेत्रमा निरन्तरता राम्रो फल दिन्छ।",
        "Keep a steady hand with ": "",
        " (the ": " (",
        " house) — manage rather than force.": " औं भाव) — व्यवस्थापन, बलजुती होइन।",
        "None of these are predictions of misfortune — they are areas where "
        "awareness and moderation protect your progress.": "यी दुर्भाग्यको भविष्यवाणी होइन — सचेतता र संयमले प्रगति जोगाउँछ।",
        "Lean into ": "",
        " themes — that is where momentum is cheapest to build.": " का विषय — यहाँ गति सजिलै बन्दै जान्छ।",
        "Give structure to ": "",
        " themes through routine and small, repeated effort rather than waiting to feel ready.": " का विषयमा दिनचर्या र सानो नियमित प्रयास।",
        "Align major moves with the supportive sub-periods noted in the outlook.": "ठूला कदमहरू दृष्टिकोणमा उल्लेखित सहायक उप-अवधिसँग मिलाउनुहोस्।",
        "Track one concrete habit per priority below for the next quarter.": "अर्को त्रैमासिकका लागि प्रत्येक प्राथमिकतामा एउटा बानी ट्र्याक गर्नुहोस्।",
        "These are traditional, faith-based remedies offered as optional support — "
        "they are cultural practices, not requirements or guarantees.": "यी पारम्परिक, विश्वास-आधारित वैकल्पिक उपाय हुन् — संस्कृति हो, ग्यारेन्टी होइन।",
        "For strengthening ": "",
        " themes, classical texts suggest its weekday observance, charity associated with ": " बलियो बनाउन, शास्त्रले वार व्रत, दान ",
        ", and respectful, calm conduct in that life area.": " र शान्त आचरण सुझाउँछ।",
        "Gratitude practices around ": "",
        " themes help you make the most of an existing strength.": " का क्षेत्रमा कृतज्ञताले बलको पूर्ण उपयोग गर्छ।",
        "Above all, ethical action (sadachara) and steadiness are the "
        "remedies every tradition agrees on.": "सबै परम्परा सदाचार र स्थिरतालाई उपाय मान्छन्।",
        " It signifies ": " यसले संकेत गर्छ ",
        " Shadbala grades it ": " षड्बल ",
        ".": "।",
        "No major classical yoga from the curated set is active; "
        "the chart reads through planet and house placements above.": "मुख्य शास्त्रीय योग सक्रिय छैन; माथिका ग्रह/भाव placements बाट पढिन्छ।",
        " — this is your fastest leverage.": " — यो सबैभन्दा छिटो leverage हो।",
        " so they stop being a drag.": " ताकि बोझ नबन्न।",
        "3. Work with the current ": "३. हालको ",
        " period — favour ": " अवधिसँग — ",
        " for major initiatives.": " ठूला कदमका लागि।",
        "3. Time major initiatives with your supportive sub-periods.": "३. ठूला कदम सहायक उप-अवधिमा।",
        "4. For career, develop the 10th-house path led by ": "४. करियर, १० औं भावका स्वामी ",
        " with consistent, visible work.": " को नेतृत्वमा निरन्तर, देखिने काम।",
        "5. Keep an ethical, steady daily rhythm — the one remedy that "
        "strengthens every area of the chart.": "५. नैतिक, स्थिर दैनिक दिनचर्या — सबै क्षेत्र बलियो बनाउने उपाय।",
        # Planet / house lines
        " is at ": " ",
        "°": "°",
        "′ in ": "′ ",
        " nakshatra (pada ": " नक्षत्र (चरण ",
        "), occupying the ": "), ",
        " house": " औं भावमा",
        "retrograde (its themes turn inward and are revisited)": "वक्री (विषय भित्र मोडिन्छ)",
        "combust — close to the Sun, so its outer results need extra effort": "अस्त — सूर्य नजिक, बाह्य फलमा अतिरिक्त प्रयास",
        "vargottama (same sign in D1 and D9 — notably reinforced)": "वर्गोत्तम (D1 र D9 एउटै राशि — बलियो)",
        "The ": "",
        " house (": " ",
        ") governs ": " औं भाव (",
        ").": ") ले शासन गर्छ ",
        "Its lord ": "स्वामी ",
        " sits in the ": " ",
        ", and is graded ": " औं भावमा, ",
        " in Shadbala": " षड्बलमा",
        "Occupied by ": "मा बसेका: ",
        # Confidence factors
        " in a friendly sign": " मित्र राशिमा",
        " in an enemy sign": " शत्रु राशिमा",
        "dignified in navamsa": "नवांशमा गरिमामान",
        "weak in navamsa": "नवांशमा कमजोर",
        "vargottama (same sign in navamsa — reinforced)": "वर्गोत्तम (नवांशमा पनि — बलियो)",
        " runs the current mahadasha": " हालको महादशा चलाउँछ",
        " runs the current antardasha": " हालको अन्तर्दशा चलाउँछ",
        " lord ": " स्वामी ",
        " well dignified": " राम्रो गरिमामान",
        " lord falls in the ": " स्वामी ",
        " (a difficult house)": " (कठिन भाव)",
        " lord in a strong angle/trine (the ": " स्वामी बलियो केन्द्र/त्रिकोण (",
        ")": ")",
        "natural benefic(s) present — ": "प्राकृतिक शुभ ग्रह — ",
        "natural malefic(s) present — ": "प्राकृतिक पाप ग्रह — ",
        "malefic(s) in an upachaya house (strengthening here) — ": "उपचय भावमा पाप ग्रह (यहाँ बलियो) — ",
        "supportive combination(s)": "सहायक योग(हरू)",
        "Yoga: Dhana yoga present": "योग: धन योग उपस्थित",
        "lagna lord ": "लग्न स्वामी ",
        "lagna lord strong": "लग्न स्वामी बलियो",
        "lagna lord weak": "लग्न स्वामी कमजोर",
        "debilitated": "नीच",
        "weak/debilitated": "कमजोर/नीच",
        "dignified/strong": "गरिमामान/बलियो",
        # Terms
        "ascendant": "लग्न",
        "mahadasha": "महादशा",
        "antardasha": "अन्तर्दशा",
        "nakshatra": "नक्षत्र",
        "retrograde": "वक्री",
        "combust": "अस्त",
        "vargottama": "वर्गोत्तम",
        "Shadbala": "षड्बल",
        "Strong": "बलियो",
        "Exceptional": "अत्यन्त बलियो",
        "Weak": "कमजोर",
        "Borderline": "सीमान्त",
        "house": "भाव",
        "Dasha:": "दशा:",
        "Yogas:": "योग:",
        "D1:": "D1:",
        "D9:": "D9:",
        "→": "→",
        "running now": "अहिले चलिरहेको",
        "well placed": "राम्रो स्थित",
        "placed": "स्थित",
        "the mind": "मन",
        "the Sun": "सूर्य",
        "the Moon": "चन्द्र",
    }
    pairs.extend((en, ne) for en, ne in phrase_map.items() if ne)
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    return pairs


_NE_REPLACEMENTS: list[tuple[str, str]] | None = None


def _ne_replacements() -> list[tuple[str, str]]:
    global _NE_REPLACEMENTS
    if _NE_REPLACEMENTS is None:
        _NE_REPLACEMENTS = _build_ne_replacements()
    return _NE_REPLACEMENTS


_EN_MONTH_NE = {
    "Jan": "जन", "Feb": "फेब", "Mar": "मार्च", "Apr": "अप्र", "May": "मे",
    "Jun": "जुन", "Jul": "जुल", "Aug": "अग", "Sep": "सेप", "Oct": "अक्ट",
    "Nov": "नोभ", "Dec": "डिस",
}


def _apply_ne_regex(text: str) -> str:
    out = text
    out = re.sub(r"\b(\d+)(?:st|nd|rd|th) house\b", r"\1 औं भाव", out, flags=re.I)
    out = re.sub(r"\bHouse (\d+)\b", r"\1 औं भाव", out, flags=re.I)
    out = re.sub(r"\b(\d+)(?:st|nd|rd|th) lord\b", r"\1 औं भावका स्वामी", out, flags=re.I)
    out = re.sub(r"\b(\d+)(?:st|nd|rd|th)\b", r"\1 औं", out, flags=re.I)
    out = re.sub(r"\bpada (\d+)\b", r"चरण \1", out, flags=re.I)
    out = re.sub(r"\bis at\b", "मा अवस्थित छ", out, flags=re.I)
    out = re.sub(r"\boccupying the\b", "", out, flags=re.I)
    out = re.sub(r"\bhouse (\d+)\b", r"\1 औं भाव", out, flags=re.I)
    out = re.sub(r"\bin the\b", "मा", out, flags=re.I)
    out = re.sub(r"\band the Sun is in\b", "र सूर्य", out, flags=re.I)
    out = re.sub(r"\bto the foreground\b", "अगाडि", out, flags=re.I)
    out = re.sub(r"\bwith dates\b", "मिति सहित", out, flags=re.I)
    for en, ne in _EN_MONTH_NE.items():
        out = re.sub(rf"\b{en}\b", ne, out)
    out = out.replace("भitr", "भित्र").replace("यसभitr", "यसभित्र")
    out = re.sub(r"\s+", " ", out).strip()
    return out


def _localize_text_ne(text: str) -> str:
    out = text
    for en, ne in _ne_replacements():
        if en and en in out:
            out = out.replace(en, ne)
    return _apply_ne_regex(out)


def _localize_item_label_ne(label: str) -> str:
    paired = re.match(r"^(.+?) \((.+)\)$", label)
    if paired:
        return paired.group(2).strip()
    house = re.match(r"^House (\d+) \((.+)\)$", label, re.I)
    if house:
        return f"{house.group(2)} भाव"
    return _localize_text_ne(label)


def _localize_section(section: dict[str, Any], lang: str) -> dict[str, Any]:
    if lang != "ne":
        return section
    out = dict(section)
    out["body"] = [_localize_text_ne(p) for p in section.get("body", [])]
    if section.get("factors"):
        out["factors"] = [_localize_text_ne(f) for f in section["factors"]]
    if section.get("items"):
        items = []
        for it in section["items"]:
            item = dict(it)
            item["text"] = _localize_text_ne(it["text"])
            item["label"] = _localize_item_label_ne(it["label"])
            if it.get("factors"):
                item["factors"] = [_localize_text_ne(f) for f in it["factors"]]
            items.append(item)
        out["items"] = items
    return out


def _localize_meta(meta: dict[str, Any], lang: str) -> dict[str, Any]:
    if lang != "ne":
        return meta
    out = dict(meta)
    out["method"] = METHOD_NE
    out["disclaimer"] = DISCLAIMER_NE
    return out


def _meta(chart: Chart, now: datetime) -> dict[str, Any]:
    return {
        "lagna": {"sign": chart.lagna_sign + 1, "name_en": RASHI_EN[chart.lagna_sign],
                  "name_ne": RASHI_NE[chart.lagna_sign]},
        "moon_sign": {"sign": chart.moon_sign + 1, "name_en": RASHI_EN[chart.moon_sign],
                      "name_ne": RASHI_NE[chart.moon_sign]},
        "sun_sign": {"sign": chart.sun_sign + 1, "name_en": RASHI_EN[chart.sun_sign],
                     "name_ne": RASHI_NE[chart.sun_sign]},
        "nakshatra": {
            "name_en": NAKSHATRA_EN[chart.moon_nak[0]],
            "name_ne": NAKSHATRA_NE[chart.moon_nak[0]],
            "pada": chart.moon_nak[1],
            "lord_en": PLANET_EN[NAK_LORD[chart.moon_nak[0]]],
        },
        "mahadasha": chart.dasha and {
            "lord": chart.dasha["maha_lord"],
            "lord_en": PLANET_EN[chart.dasha["maha_lord"]],
            "lord_ne": PLANET_NE[chart.dasha["maha_lord"]],
            "ends": _fmt_date(chart.dasha["maha_end"]),
            "antardasha": chart.dasha["antar_lord"],
            "antardasha_en": PLANET_EN[chart.dasha["antar_lord"]],
            "antardasha_ne": PLANET_NE[chart.dasha["antar_lord"]],
            "antardasha_ends": _fmt_date(chart.dasha["antar_end"]),
            "window": chart.maha_window,
        },
        "yoga_count": len(chart.yogas),
        "generated_at": now.isoformat(),
        "method": "Deterministic Parashari interpretation with confidence weighting",
        "disclaimer": "For reflection and cultural insight. Describes tendencies and "
                      "probabilities, not certainties; not a substitute for professional advice.",
    }
