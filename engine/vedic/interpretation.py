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

from engine.vedic.vargas import varga_rashi_from_longitude

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

# Plain, everyday personality words for each sign (0-based), so "Leo rising"
# becomes something a reader with no astrology background understands.
SIGN_TRAIT_EN = [
    "bold, energetic and quick to act",
    "steady, patient and grounded, someone who values comfort and security",
    "curious, chatty and adaptable",
    "caring, sensitive and family-minded",
    "confident, warm and proud, someone who likes to be seen and appreciated",
    "practical, careful and good with detail",
    "friendly, fair and people-oriented, someone who values balance",
    "intense, private and strong-willed",
    "optimistic, freedom-loving and big-picture",
    "disciplined, ambitious and hard-working",
    "independent, original and open-minded",
    "gentle, imaginative and kind-hearted",
]
SIGN_TRAIT_NE = [
    "साहसी, ऊर्जावान् र छिटो निर्णय लिने",
    "स्थिर, धैर्यवान् र व्यावहारिक; सुख र सुरक्षालाई महत्व दिने",
    "जिज्ञासु, कुराकानी रुचाउने र परिस्थिति अनुसार ढल्ने",
    "मायालु, संवेदनशील र परिवारप्रिय",
    "आत्मविश्वासी, न्यानो र स्वाभिमानी; चिनिन र सम्मान पाउन रुचाउने",
    "व्यावहारिक, सतर्क र सानो कुरामा पनि ध्यान दिने",
    "मिलनसार, न्यायप्रिय र मानिससँग घुलमिल हुने; सन्तुलन खोज्ने",
    "गहन, गोप्य स्वभावको र दृढ इच्छाशक्ति भएको",
    "आशावादी, स्वतन्त्रताप्रेमी र फराकिलो सोच भएको",
    "अनुशासित, महत्वाकांक्षी र परिश्रमी",
    "स्वतन्त्र, मौलिक र खुला विचार भएको",
    "कोमल, कल्पनाशील र दयालु हृदयको",
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

# Tatkalika (temporal) friendship: houses counted from a planet's own
# position that classically count as friendly; the remaining six (1st/own,
# 5th, 6th, 7th, 8th, 9th) are temporal enmity.
TATKALIKA_FRIEND_HOUSES = {2, 3, 4, 10, 11, 12}


def _tatkalika_friend(a: str, b: str, P: dict[str, "PlanetFact"]) -> Optional[bool]:
    """True when `b` sits in a temporally friendly house from `a`."""
    if a not in P or b not in P:
        return None
    return house_from(P[b].sign, P[a].sign) in TATKALIKA_FRIEND_HOUSES


def _panchadha_relation(a: str, b: str, P: dict[str, "PlanetFact"]) -> Optional[str]:
    """Panchadha Maitri (five-fold compound relation) of `b` as seen from `a`.

    Combines naisargika (natural, fixed) friendship with tatkalika (temporal,
    position-dependent) friendship per BPHS: adhi_mitra > mitra > sama >
    shatru > adhi_shatru. Returns None when either planet's position is
    unknown or a == b.
    """
    if a == b or a not in P or b not in P:
        return None
    natural = "friend" if b in FRIENDS.get(a, set()) else ("enemy" if b in ENEMIES.get(a, set()) else "neutral")
    temporal_friend = _tatkalika_friend(a, b, P)
    if temporal_friend is None:
        return None
    if natural == "friend":
        return "adhi_mitra" if temporal_friend else "sama"
    if natural == "neutral":
        return "mitra" if temporal_friend else "shatru"
    return "sama" if temporal_friend else "adhi_shatru"


def _compound_friend_or_better(a: str, b: str, P: dict[str, "PlanetFact"]) -> bool:
    """True when `b` is at least a compound (Panchadha) friend of `a`."""
    rel = _panchadha_relation(a, b, P)
    return rel in {"adhi_mitra", "mitra"}


def _compound_enemy_or_worse(a: str, b: str, P: dict[str, "PlanetFact"]) -> bool:
    """True when `b` is at least a compound (Panchadha) enemy of `a`."""
    rel = _panchadha_relation(a, b, P)
    return rel in {"shatru", "adhi_shatru"}


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
KAMA_TRIKONA = {3, 7, 11}
PANAPARA = {2, 5, 8, 11}
APOKLIMA = {3, 6, 9, 12}
# The three non-lagna trine triads (houses 12 apart in threes).
OTHER_TRIKONA_TRIADS = ({2, 6, 10}, {3, 7, 11}, {4, 8, 12})
ADJACENT_KENDRA_PAIRS = ({1, 4}, {4, 7}, {7, 10}, {10, 1})

# 0-based sign indices by modality, used by the Ashraya Nabhasa yogas
# (Rajju/Musala/Nala).
MOVABLE_SIGNS = {0, 3, 6, 9}
FIXED_SIGNS = {1, 4, 7, 10}
DUAL_SIGNS = {2, 5, 8, 11}

# Classical elemental classifications used by a handful of body/temperament
# yogas. "Dry" signs are the fire triplicity plus the malefic earthy signs
# ruled by the Sun/Mars/Saturn; watery signs are the water triplicity.
DRY_PLANETS = {"sun", "mars", "saturn"}
DRY_SIGNS = {0, 4, 7, 8, 9, 10}
WATERY_SIGNS = {3, 7, 11}
WATERY_PLANETS = {"moon", "venus"}

# Exact exaltation degree (within the exaltation sign) per planet — used to
# judge "deep"/full exaltation for yogas that require more than sign-level
# exaltation (e.g. Jaya, Vidyut).
EXALT_DEGREE = {
    "sun": 10.0, "moon": 3.0, "mars": 28.0, "mercury": 15.0,
    "jupiter": 5.0, "venus": 27.0, "saturn": 20.0,
}
DEEP_EXALT_ORB = 1.0

# The 16 classical Shodasa Vargas (BPHS). A planet's graded amsa strength
# (per B. V. Raman's "Three Hundred Important Combinations") is named by how
# many of these 16 divisional charts find it in its own sign (Swavarga).
SHODASA_VARGA_DIVISIONS = (1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60)

# Count of own-sign (Swavarga) occupations -> classical amsa name. 0-1
# occupations carry no named amsa; 13 or more is always Vaiseshikamsa, the
# highest grade ("par excellence").
AMSA_NAME_BY_COUNT = {
    2: "parijatamsa", 3: "uttamamsa", 4: "gopuramsa", 5: "simhasanamsa",
    6: "parvatamsa", 7: "devalokamsa", 8: "kunkumamsa", 9: "iravathamsa",
    10: "vaishnavamsa", 11: "saivamsa", 12: "bhaswadamsa",
}


def _own_varga_count(key: str, longitude: float) -> int:
    """How many of the 16 Shodasa Vargas find `key` in its own sign."""
    if key not in OWN_SIGNS:
        return 0
    return sum(
        1 for div in SHODASA_VARGA_DIVISIONS
        # varga_rashi_from_longitude is 1-based; OWN_SIGNS is 0-based.
        if (varga_rashi_from_longitude(div, longitude) - 1) in OWN_SIGNS[key]
    )


def _amsa_grade(key: str, longitude: float) -> Optional[str]:
    """Named graded amsa (Parijatamsa..Vaiseshikamsa) for a planet, or None."""
    count = _own_varga_count(key, longitude)
    if count >= 13:
        return "vaiseshikamsa"
    return AMSA_NAME_BY_COUNT.get(count)

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

# Plain-language life themes for each planet — everyday words a reader with no
# astrology background understands, used in place of bare planet names in the
# advice sections ("lean into Saturn" → "lean into discipline and steady work").
PLAIN_THEME_EN = {
    "sun": "confidence and leadership",
    "moon": "your emotional calm and home life",
    "mars": "energy, courage and taking action",
    "mercury": "clear thinking, communication and learning",
    "jupiter": "learning, good judgement and steady growth",
    "venus": "relationships, comfort and enjoying life",
    "saturn": "discipline, patience and steady hard work",
    "rahu": "ambition and trying new or unconventional paths",
    "ketu": "focus, letting go and inner work",
}
PLAIN_THEME_NE = {
    "sun": "आत्मविश्वास र नेतृत्व",
    "moon": "मनको शान्ति र घरजीवन",
    "mars": "जोश, साहस र काम गर्ने हिम्मत",
    "mercury": "स्पष्ट सोच, सञ्चार र सिकाइ",
    "jupiter": "ज्ञान, असल निर्णय र क्रमिक प्रगति",
    "venus": "सम्बन्ध, सुखसुविधा र जीवनको आनन्द",
    "saturn": "अनुशासन, धैर्य र लगनशील परिश्रम",
    "rahu": "महत्वाकांक्षा र नयाँ/फरक बाटो",
    "ketu": "एकाग्रता, त्याग र भित्री साधना",
}


def _plain_theme(key: str, ne: bool) -> str:
    """Everyday-language meaning of a planet, e.g. 'discipline and steady work'."""
    return PLAIN_THEME_NE.get(key, key) if ne else PLAIN_THEME_EN.get(key, key)


# Dasha year length — 360-day savana year, matching the Vimshottari engine so
# the report's reconstructed bhukti dates and chapter durations stay aligned.
DAYS_PER_YEAR = 360.0


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
# Combustion (asta) orbs — degrees of separation from the Sun, per the
# reference book. Mercury and Venus use a tighter orb when retrograde.
COMBUST_ORB = {
    "moon": 12.0, "mars": 17.0, "mercury": 13.0,
    "jupiter": 11.0, "venus": 9.0, "saturn": 15.0,
}
COMBUST_ORB_RETRO = {"mercury": 12.0, "venus": 8.0}


def combust_orb(planet: str, retrograde: bool = False) -> float | None:
    """Combustion orb for a planet, using the retrograde value where it differs."""
    if retrograde and planet in COMBUST_ORB_RETRO:
        return COMBUST_ORB_RETRO[planet]
    return COMBUST_ORB.get(planet)


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


def _ord_ne(n: int) -> str:
    """Nepali ordinal for a house number — e.g. '10 औं'."""
    return f"{int(n)} औं"


def _yoga_name(y: dict[str, Any], ne: bool) -> str:
    return y.get("name_ne", y["name"]) if ne else y["name"]


def _yoga_text(y: dict[str, Any], ne: bool) -> str:
    return y.get("text_ne", y["text"]) if ne else y["text"]


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


def _navamsa_dignity(pf: "PlanetFact") -> Optional[DignityLabel]:
    """Sign-level dignity of a planet's Navamsa placement (no exact degree —
    Navamsa is itself a discrete sign, so moolatrikona's degree band doesn't
    apply here)."""
    if pf.key not in OWN_SIGNS:
        return None
    sign = pf.navamsa
    if sign == EXALT_SIGN[pf.key]:
        return "exalted"
    if (sign + 6) % 12 == EXALT_SIGN[pf.key]:
        return "debilitated"
    if sign in OWN_SIGNS[pf.key]:
        return "own"
    dispositor = SIGN_LORD[sign]
    if dispositor == pf.key:
        return "own"
    if dispositor in FRIENDS[pf.key]:
        return "friend"
    if dispositor in ENEMIES[pf.key]:
        return "enemy"
    return "neutral"


def _deeply_exalted(pf: Optional["PlanetFact"]) -> bool:
    """True when a planet sits within ~1° of its exact exaltation degree."""
    if not pf or pf.dignity != "exalted":
        return False
    target = EXALT_DEGREE.get(pf.key)
    return target is not None and abs(pf.deg_in_sign - target) <= DEEP_EXALT_ORB


def _span_houses(start: int, length: int) -> frozenset[int]:
    """The `length` houses starting at 1-based house `start`, wrapping at 12."""
    return frozenset(((start - 1 + i) % 12) + 1 for i in range(length))


def _occupied_houses(P: dict[str, "PlanetFact"], keys: Iterable[str] = DIGNITY_PLANETS) -> set[int]:
    return {P[k].house for k in keys if k in P}


def _occupied_signs(P: dict[str, "PlanetFact"], keys: Iterable[str] = DIGNITY_PLANETS) -> set[int]:
    return {P[k].sign for k in keys if k in P}


# Dignity → a coarse strength score used by the confidence engine.
DIGNITY_SCORE = {
    "exalted": 2, "moolatrikona": 2, "own": 2, "great_friend": 1,
    "friend": 1, "neutral": 0, "enemy": -1, "debilitated": -2, None: 0,
}
DIGNITY_PHRASE = {
    "exalted": "at its very best and very strong",
    "moolatrikona": "very comfortable and strong",
    "own": "steady and self-assured",
    "friend": "well supported",
    "neutral": "in a neutral spot",
    "enemy": "a little strained",
    "debilitated": "weak and needing conscious effort",
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
    is_day: Optional[bool] = None
    gulika_house: Optional[int] = None
    gulika_sign: Optional[int] = None
    mandi_house: Optional[int] = None
    mandi_sign: Optional[int] = None

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
    # Full mahadasha chapters from birth onward — powers the life-journey
    # timeline (past → present → future). The first entry's start ≈ birth.
    full_sequence = [
        {
            "lord": q["lord"],
            "start": _parse_iso(q["start"]),
            "end": _parse_iso(q["end"]),
        }
        for q in sequence
    ]
    birth = full_sequence[0]["start"] if full_sequence else maha_start
    return {
        "maha_lord": maha_lord,
        "maha_start": maha_start,
        "maha_end": maha_end,
        "maha_index": index,
        "antar_lord": cur_bhukti["lord"] if cur_bhukti else maha_lord,
        "antar_start": cur_bhukti["start"] if cur_bhukti else maha_start,
        "antar_end": cur_bhukti["end"] if cur_bhukti else maha_end,
        "bhuktis": bhuktis,
        "upcoming_maha": upcoming_maha,
        "full_sequence": full_sequence,
        "birth": birth,
    }


def _report_yogas_from_catalog(chart: "Chart") -> list[dict[str, Any]]:
    """Formed yogas for the narrative report and Kundali Yoga checklist alike.

    Both surfaces must agree on what's actually present in a chart, so this
    reuses the same 300-item classical catalog (`full_yoga_catalog`) instead
    of a separate, narrower hand-curated list — filtered here to only the
    combinations that are actually formed. Bilingual name/description text
    comes from the same lookup tables `kundali_detail.py` uses for the
    checklist, imported lazily to avoid a module-level circular import.
    """
    from engine.vedic.kundali_detail import _yoga_desc_ne, _yoga_name_ne

    out: list[dict[str, Any]] = []
    for y in full_yoga_catalog(chart):
        if not y["present"]:
            continue
        out.append({
            "key": y["key"],
            "name": y["name"],
            "name_ne": _yoga_name_ne(y["key"], y["name"]),
            "polarity": y["polarity"],
            "text": y["text"],
            "text_ne": _yoga_desc_ne(y),
        })
    return out




# ── Extended yoga catalog helpers ─────────────────────────────────────────────

# BPHS Kuja/Mangala Dosha houses, reckoned from the Lagna only.
MANGALIK_HOUSES = {1, 4, 7, 8, 12}
CHANDRA_FLANK_SKIP = frozenset({"sun", "moon"})
# Veshi/Vasi/Ubhayachari count planets other than the Sun AND the Moon (BPHS).
SURYA_FLANK_SKIP = frozenset({"sun", "moon"})
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
    # BPHS: Mars in the 1st, 4th, 7th, 8th or 12th house from the Lagna.
    if "mars" not in P:
        return False
    return house_from(P["mars"].sign, lagna_sign) in MANGALIK_HOUSES


def _mallika_present(P: dict[str, PlanetFact]) -> bool:
    # BPHS Maala (Nabhasa): natural benefics occupy three of the four angles,
    # with no malefic in any angle.
    benefic_kendras = {
        pf.house for k, pf in P.items() if k in YOGA_BENEFICS and pf.house in KENDRA
    }
    malefic_in_kendra = any(
        pf.house in KENDRA
        for k, pf in P.items()
        if k in DIGNITY_PLANETS and k not in YOGA_BENEFICS
    )
    return len(benefic_kendras) >= 3 and not malefic_in_kendra


def _same_sign_parity(a: int, b: int, c: int) -> bool:
    return (a % 2) == (b % 2) == (c % 2)


def full_yoga_catalog(chart: "Chart") -> list[dict[str, Any]]:
    """Every fixed-identity yoga this app checks for, present or not.

    ``chart.yogas`` (built by ``_report_yogas_from_catalog``, defined above)
    filters this same catalog down to only *formed* yogas — it feeds the
    narrative report, where an absent yoga simply has nothing to say. The
    Kundali Yoga table needs the opposite: a fixed checklist a reader can
    scan in full, each row carrying an explicit ``present`` flag, so this
    walks every classical rule unconditionally instead of appending only on
    a match.
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
        "text": "Mars occupies the 1st, 4th, 7th, 8th or 12th house from the Lagna "
                "(BPHS) — a classical Manglik pattern for which marriage matching and "
                "remedial timing are traditionally considered.",
    })
    catalog.append({
        "key": "kala_sarpa", "name": "Kala Sarpa Yoga", "polarity": "caution",
        "present": _kala_sarpa_present(P),
        "text": "All seven tara grahas fall on one side of the Rahu–Ketu axis with "
                "none breaking out of the nodal hemisphere — a pattern associated "
                "with karmic intensity and sudden reversals in life direction.",
    })
    catalog.append({
        "key": "lagna_mallika", "name": "Maala (Mallika) Yoga", "polarity": "benefic",
        "present": _mallika_present(P),
        "text": "Natural benefics occupy three of the four angles with no malefic in an "
                "angle (BPHS Maala) — a garland pattern for comfort, dignity and steady "
                "support through life.",
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
        # BPHS: planets (other than the Sun) occupy the 2nd from the Moon.
        # Not exclusive of Anapha/Durdhara — see the yoga_reference.json
        # definitions, which state each side's condition independently.
        "present": bool(chandra_2),
        "text": "Planets (other than the Sun) occupy the 2nd house from the Moon — a "
                "Chandra yoga for self-made prosperity and reputation built through "
                "personal effort.",
    })
    catalog.append({
        "key": "anapha", "name": "Anapha Yoga", "polarity": "benefic",
        "present": bool(chandra_12),
        "text": "Planets occupy the 12th house from the Moon — a Chandra yoga for "
                "refinement, comfort and graceful conduct that attracts support from "
                "others.",
    })
    catalog.append({
        "key": "durdhara", "name": "Durdhara Yoga", "polarity": "benefic",
        "present": bool(chandra_2) and bool(chandra_12),
        "text": "Planets flank the Moon on both the 2nd and 12th sides — a strong Chandra "
                "yoga for wealth, vehicles and a life supported by resources on every side.",
    })
    _kemadruma_isolated = "moon" in P and not chandra_2 and not chandra_12
    _kemadruma_kendra_occupied = any(chart.house_occupants.get(h) for h in KENDRA)
    catalog.append({
        "key": "kemadruma", "name": "Kemadruma (isolated Moon)", "polarity": "caution",
        # BPHS: no planet (except Sun) flanks the Moon in the 2nd/12th AND no
        # planet occupies an angle from the Lagna. A planet in an angle
        # classically cancels (bhanga) the isolation — see kemadruma_bhanga
        # below, which fires precisely on that cancellation.
        "present": _kemadruma_isolated and not _kemadruma_kendra_occupied,
        "text": "Formed when the Moon has no planets flanking it (2nd/12th) and no planet "
                "occupies an angle from the Lagna — classically pointing to self-built "
                "emotional support. It is widely considered softened by a strong Moon or "
                "benefic aspects, so treat it as a reminder to nurture stable routines and "
                "relationships, not as a verdict.",
    })
    catalog.append({
        "key": "kemadruma_bhanga", "name": "Kemadruma Bhanga Raja Yoga", "polarity": "benefic",
        # BPHS cancellation: the Moon is structurally isolated (2nd/12th empty)
        # but a planet occupying an angle from the Lagna breaks the isolation,
        # turning the caution into a self-made-wealth Raja yoga.
        "present": _kemadruma_isolated and _kemadruma_kendra_occupied,
        "text": "The Moon is structurally isolated (2nd/12th empty) but a planet occupies "
                "an angle from the Lagna, cancelling Kemadruma — classically turning it "
                "into a Raja yoga for wealth and standing earned through one's own effort.",
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
        # Classical: each of the four angular houses (1, 4, 7, 10) is occupied
        # by at least one planet.
        "present": all(chart.house_occupants.get(h) for h in KENDRA),
        "text": "Every one of the four angular houses (1, 4, 7, 10) is occupied by a "
                "planet — a pattern for fame, stability and success across the four "
                "pillars of life.",
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
        # Classical: Jupiter, Venus, Mercury and the Moon all occupy angles.
        "present": all(
            k in P and P[k].house in KENDRA
            for k in ("jupiter", "venus", "mercury", "moon")
        ),
        "text": "Jupiter, Venus, Mercury and the Moon all occupy angular houses — a royal "
                "bearing yoga for charm, eloquence and dignified public presence.",
    })
    _kendra_trikona_lords = {chart.house_lord[h] for h in (KENDRA | TRIKONA) if h in chart.house_lord}
    catalog.append({
        "key": "vanchana_chora_bheeti", "name": "Vanchana Chora Bheeti Yoga",
        "polarity": "caution",
        # BPHS: Lagna occupied by a malefic with Gulika in a trine from it; or
        # Gulika associated with the lords of kendras/trikonas; or the lagna
        # lord joins Rahu, Saturn or Ketu.
        "present": bool(
            (
                any(k in NATURAL_MALEFICS and pf.house == 1 for k, pf in P.items())
                and chart.gulika_house in TRIKONA
            )
            or (chart.gulika_house is not None and chart.gulika_house in {P[l].house for l in _kendra_trikona_lords if l in P})
            or (lagnesh_pf and any(k in P and P[k].house == lagnesh_pf.house for k in ("rahu", "saturn", "ketu")))
        ),
        "text": "The Lagna holds a malefic with Gulika in a trine, or Gulika joins a "
                "kendra/trikona lord, or the lagna lord conjoins Rahu, Saturn or Ketu — a "
                "caution yoga classically linked to suspicion, fear of being cheated, "
                "swindled or robbed; clear boundaries and verifying people/deals directly "
                "help.",
    })
    catalog.append({
        "key": "shakata", "name": "Shakata Yoga", "polarity": "caution",
        # Classical Shakata: the Moon occupies the 6th, 8th or 12th house from
        # Jupiter (equivalently Jupiter in 6/8/12 from the Moon).
        "present": (
            "moon" in P and "jupiter" in P
            and house_from(P["moon"].sign, P["jupiter"].sign) in {6, 8, 12}
        ),
        "text": "The Moon occupies the 6th, 8th or 12th house from Jupiter — a 'cart' "
                "yoga of fluctuating fortune, where hard-won gains and setbacks tend to "
                "alternate through life.",
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
        # BPHS: benefics occupy angles, and the 6th/8th houses are empty or
        # occupied only by benefics.
        "present": bool(
            any(k in P and P[k].house in KENDRA for k in YOGA_BENEFICS)
            and all(occ in YOGA_BENEFICS for occ in chart.house_occupants.get(6, []))
            and all(occ in YOGA_BENEFICS for occ in chart.house_occupants.get(8, []))
        ),
        "text": "Benefics occupy angular houses while the 6th and 8th houses are empty "
                "or hold only benefics — a Parvata yoga for generosity, prosperity and a "
                "life that rises like a mountain despite obstacles.",
    })
    catalog.append({
        "key": "kahala", "name": "Kahala Yoga", "polarity": "benefic",
        # BPHS: lords of the 4th and 9th are in kendras from EACH OTHER, with
        # a strong Lagna lord.
        "present": bool(
            (l4 := chart.house_lord.get(4)) and (l9k := chart.house_lord.get(9))
            and l4 in P and l9k in P
            and house_from(P[l9k].sign, P[l4].sign) in KENDRA
            and lagnesh_pf and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
        ),
        "text": "The lords of the 4th and 9th houses stand in mutual angles while the "
                "lagna lord is strong — a bold, commanding yoga for property, vehicles "
                "and decisive leadership in one's community.",
    })

    # ── Sun-based (Surya) yogas ───────────────────────────────────────────────
    catalog.append({
        "key": "veshi", "name": "Veshi Yoga", "polarity": "benefic",
        # BPHS: planets (other than the Moon) occupy the 2nd from the Sun.
        # Not exclusive of Vasi/Ubhayachari — see the yoga_reference.json
        # definitions, which state each side's condition independently.
        "present": bool(surya_2),
        "text": "Planets occupy the 2nd house from the Sun — a Surya yoga for truthful "
                "speech, integrity and recognition through principled action.",
    })
    catalog.append({
        "key": "vasi", "name": "Vasi Yoga", "polarity": "benefic",
        "present": bool(surya_12),
        "text": "Planets occupy the 12th house from the Sun — a Surya yoga for charity, "
                "spiritual merit and influence through selfless service.",
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
        # BPHS ties this to day/night birth and gender (day birth + all odd
        # signs for males; night birth + all even for females). Birth gender
        # isn't part of the chart, so this uses day/night birth alone as the
        # classical proxy: day birth with all-odd signs, or night birth with
        # all-even signs.
        "present": bool(
            chart.is_day is not None
            and _same_sign_parity(lagna_sign, sun_sign, moon_sign)
            and ((chart.is_day and lagna_sign % 2 == 0) or (not chart.is_day and lagna_sign % 2 == 1))
        ),
        "text": "The lagna, Sun and Moon all fall in signs of the same parity, matching "
                "day/night birth (all odd signs by day, all even by night) — a "
                "great-fortune yoga for overall luck, health and supportive "
                "circumstances through life.",
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
        # BPHS: 9th lord dignified in an angle, with the Lagna lord strong.
        "present": bool(
            l9_pf
            and l9_pf.dignity in {"own", "exalted", "moolatrikona"}
            and l9_pf.house in KENDRA
            and lagnesh_pf
            and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
        ),
        "text": "The 9th lord is dignified in an angle while the Lagna lord is strong — a "
                "Lakshmi yoga for wealth, grace and the blessings of fortune through "
                "righteous action.",
    })
    l11_early = chart.house_lord.get(11)
    l4_early = chart.house_lord.get(4)
    l10_early = chart.house_lord.get(10)

    # Gauri: the Navamsa lord of the sign held by the 10th lord sits, itself
    # exalted, in the 10th house, conjoined with the Lagna lord.
    gauri_present = False
    l10_pf = P.get(l10_early) if l10_early else None
    if l10_pf:
        nav_lord = SIGN_LORD[l10_pf.navamsa]
        nav_lord_pf = P.get(nav_lord)
        gauri_present = bool(
            nav_lord_pf and nav_lord_pf.house == 10 and nav_lord_pf.dignity == "exalted"
            and lagnesh_pf and lagnesh_pf.house == 10
        )
    catalog.append({
        "key": "gauri", "name": "Gauri Yoga", "polarity": "benefic",
        "present": gauri_present,
        "text": "The Navamsa lord of the sign held by the 10th lord sits exalted in the "
                "10th house together with the lagna lord — a Gauri yoga for a respectable "
                "family, land, and a virtuous reputation.",
    })

    # Bharati: the Navamsa lords of the 2nd, 5th and 11th lords are all
    # exalted and combine (conjoin) with the 9th lord.
    bharati_present = False
    b_lords = [l for l in (l2, l5, l11_early) if l and l in P]
    if len(b_lords) == 3 and l9 and l9 in P:
        nav_lords = [SIGN_LORD[P[l].navamsa] for l in b_lords]
        bharati_present = all(
            nl in P and P[nl].dignity == "exalted" and P[nl].house == P[l9].house
            for nl in nav_lords
        )
    catalog.append({
        "key": "bharati", "name": "Bharati Yoga", "polarity": "benefic",
        "present": bharati_present,
        "text": "The Navamsa lords of the 2nd, 5th and 11th lords are all exalted and "
                "join the 9th lord — a Bharati yoga for world fame, scholarship and "
                "artistic refinement.",
    })

    catalog.append({
        "key": "chapa", "name": "Chapa Yoga", "polarity": "benefic",
        # BPHS: Lagna lord exalted, with the 4th and 10th lords in exchange.
        "present": bool(
            lagnesh_pf and lagnesh_pf.dignity == "exalted"
            and l4_early and l10_early and l4_early in P and l10_early in P
            and P[l4_early].house == 10 and P[l10_early].house == 4
        ),
        "text": "The lagna lord is exalted while the 4th and 10th lords exchange "
                "houses — a Chapa yoga for standing in a ruler's council, wealth and "
                "strength, often tied to controlling a treasury.",
    })
    catalog.append({
        "key": "chapa_nabhasa", "name": "Chapa (Nabhasa) Yoga", "polarity": "benefic",
        # BPHS Nabhasa: all seven planets in the seven houses from the 10th (10→4).
        "present": all(
            k in P and P[k].house in {10, 11, 12, 1, 2, 3, 4} for k in DIGNITY_PLANETS
        ),
        "text": "All seven planets occupy the seven houses counted from the 10th (the "
                "10th through the 4th) — a Nabhasa 'bow' yoga classically linked to "
                "comfort in the earlier and later phases of life.",
    })
    l7 = chart.house_lord.get(7)
    l10 = chart.house_lord.get(10)
    l7_pf = P.get(l7) if l7 else None
    catalog.append({
        "key": "shrinatha", "name": "Shrinatha Yoga", "polarity": "benefic",
        # BPHS: 7th lord exalted in the 10th house, with the 9th and 10th lords conjoined.
        "present": bool(
            l7_pf and l7_pf.dignity == "exalted" and l7_pf.house == 10
            and l9 and l10 and P.get(l9) and P.get(l10)
            and P[l9].house == P[l10].house
        ),
        "text": "The 7th lord is exalted in the 10th house while the 9th and 10th lords "
                "conjoin — a Shrinatha yoga for dharma, status and spiritual fortune.",
    })
    catalog.append({
        "key": "shankha", "name": "Shankha Yoga", "polarity": "benefic",
        # BPHS: lords of the 5th and 6th are in kendras from EACH OTHER, with
        # a strong Lagna lord.
        "present": bool(
            l5 and l6 and l5 in P and l6 in P
            and house_from(P[l6].sign, P[l5].sign) in KENDRA
            and lagnesh_pf and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
        ),
        "text": "The lords of the 5th and 6th houses stand in mutual angles while the "
                "lagna lord is strong — a Shankha yoga for pleasure, humanitarian "
                "instincts and prosperity through family, land and learning.",
    })
    catalog.append({
        "key": "bheri", "name": "Bheri Yoga", "polarity": "benefic",
        # BPHS: Lagna lord, Jupiter and Venus in angles, with the 9th lord strong.
        "present": bool(
            all(P.get(k) and P[k].house in KENDRA for k in (lagnesh, "jupiter", "venus") if k)
            and l9_pf and l9_pf.dignity in {"own", "exalted", "moolatrikona"}
        ),
        "text": "The lagna lord, Jupiter and Venus all occupy angles while the 9th lord is "
                "strong — a Bheri yoga for a rich, harmonious life with wealth, wisdom and "
                "partnership blessings combined.",
    })
    # Parijata: the dispositor of the Lagna lord's sign, or the Navamsa lord
    # of that dispositor's sign, sits in a kendra, trikona, or own/exaltation.
    def _angle_trine_own_or_exalt(pf: Optional[PlanetFact]) -> bool:
        return bool(
            pf and (pf.house in (KENDRA | TRIKONA) or pf.dignity in {"own", "exalted"})
        )

    parijata_present = False
    if lagnesh_pf:
        d1_pf = P.get(SIGN_LORD[lagnesh_pf.sign])
        d1_nav_lord_pf = P.get(SIGN_LORD[d1_pf.navamsa]) if d1_pf else None
        parijata_present = _angle_trine_own_or_exalt(d1_pf) or _angle_trine_own_or_exalt(d1_nav_lord_pf)
    catalog.append({
        "key": "parijata", "name": "Parijata Yoga", "polarity": "benefic",
        "present": parijata_present,
        "text": "The dispositor of the lagna lord's sign, or the Navamsa lord of that "
                "dispositor, falls in a kendra, trikona, or own/exaltation sign — a "
                "Parijata yoga for happiness in mid and later life, honoured by "
                "leaders.",
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

    # ── Mridanga ──────────────────────────────────────────────────────────────
    mridanga_present = False
    for _e in DIGNITY_PLANETS:
        _pf = P.get(_e)
        if _pf and _pf.dignity == "exalted":
            _nav_lord = SIGN_LORD[_pf.navamsa]
            _nav_lord_pf = P.get(_nav_lord)
            if (
                _nav_lord_pf and _nav_lord_pf.house in (KENDRA | TRIKONA)
                and _nav_lord_pf.dignity in {"friend", "exalted", "own"}
                and lagnesh_pf and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona"}
            ):
                mridanga_present = True
                break
    catalog.append({
        "key": "mridanga", "name": "Mridanga Yoga", "polarity": "benefic",
        "present": mridanga_present,
        "text": "The Navamsa lord of an exalted planet's sign sits in a kendra or "
                "trikona in a friendly, own or exalted sign while the lagna lord is "
                "strong — a Mridanga yoga for respect from rulers, fame and "
                "influence.",
    })

    # ── Malika (garland) yogas — all seven planets in 7 contiguous houses ────
    occ_houses = _occupied_houses(P)
    occ_signs = _occupied_signs(P)
    malika_defs = [
        ("lagna_malika", 1, "Lagna Malika Yoga", "King, ruler, commander, and wealthy."),
        ("dhana_malika", 2, "Dhana Malika Yoga", "Very wealthy, dutiful, resolute and unsympathetic."),
        ("vikrama_malika", 3, "Vikrama Malika Yoga", "Ruler, rich, sickly, surrounded by brave men."),
        ("sukha_malika", 4, "Sukha Malika Yoga", "Charitable and wealthy."),
        ("putra_malika", 5, "Putra Malika Yoga", "Highly religious and famous."),
        ("satru_malika", 6, "Satru Malika Yoga", "Greedy and somewhat poor."),
        ("kalatra_malika", 7, "Kalatra Malika Yoga", "Coveted by women and influential."),
        ("randhra_malika", 8, "Randhra Malika Yoga", "Poor and hen-pecked."),
        ("bhagya_malika", 9, "Bhagya Malika Yoga", "Religious, well-to-do, mighty and good."),
        ("karma_malika", 10, "Karma Malika Yoga", "Respected and virtuous."),
        ("labha_malika", 11, "Labha Malika Yoga", "Skillful and beloved of lovely women."),
        ("vyaya_malika", 12, "Vyaya Malika Yoga", "Honored, liberal, and respected."),
    ]
    for _key, _start, _name, _result in malika_defs:
        catalog.append({
            "key": _key, "name": _name, "polarity": "mixed",
            "present": bool(occ_houses) and occ_houses <= _span_houses(_start, 7),
            "text": f"All seven planets occupy the seven houses starting from the "
                    f"{_ord(_start)} house (a Malika/garland Nabhasa yoga) — "
                    f"classically: {_result}",
        })

    # ── Individually named classical combinations (Raman #48–70) ────────────
    l7_gaja = chart.house_lord.get(7)
    l11_gaja = chart.house_lord.get(11)
    catalog.append({
        "key": "gaja", "name": "Gaja Yoga", "polarity": "benefic",
        "present": bool(
            l7_gaja and l7_gaja in P and P[l7_gaja].house == 11
            and "moon" in P and P["moon"].house == 11
            and l11_gaja and l11_gaja in chart.aspects_to(11)
        ),
        "text": "The 7th lord joins the Moon in the 11th house, aspected by the 11th "
                "lord — a Gaja yoga for commanding wealth, cattle and comfort "
                "throughout life.",
    })

    kalanidhi_present = False
    if "jupiter" in P and P["jupiter"].house in {2, 5}:
        _jh = P["jupiter"].house
        def _joins_or_aspects(k: str, house: int = _jh) -> bool:
            return k in P and (P[k].house == house or k in chart.aspects_to(house))
        kalanidhi_present = _joins_or_aspects("mercury") and _joins_or_aspects("venus")
    catalog.append({
        "key": "kalanidhi", "name": "Kalanidhi Yoga", "polarity": "benefic",
        "present": kalanidhi_present,
        "text": "Jupiter in the 2nd or 5th house joins or is aspected by both Mercury "
                "and Venus — a Kalanidhi yoga for a good-natured, passionate "
                "temperament favoured by rulers.",
    })

    catalog.append({
        "key": "amsavatara", "name": "Amsavatara Yoga", "polarity": "benefic",
        "present": bool(
            "venus" in P and P["venus"].house in KENDRA
            and "jupiter" in P and P["jupiter"].house in KENDRA
            and lagna_sign in MOVABLE_SIGNS
            and "saturn" in P and P["saturn"].dignity == "exalted" and P["saturn"].house in KENDRA
        ),
        "text": "Venus and Jupiter occupy angles, the Lagna falls in a movable sign, "
                "and Saturn is exalted in an angle — an Amsavatara yoga for unsullied "
                "fame, versatile learning and philosophical depth.",
    })

    l2_hh = chart.house_lord.get(2)
    l7_hh = chart.house_lord.get(7)
    hh_clause1 = bool(
        l2_hh and l2_hh in P
        and any(b in P and house_from(P[b].sign, P[l2_hh].sign) in {8, 12} for b in YOGA_BENEFICS)
    )
    hh_clause2 = bool(
        l7_hh and l7_hh in P
        and "jupiter" in P and house_from(P["jupiter"].sign, P[l7_hh].sign) == 4
        and "moon" in P and house_from(P["moon"].sign, P[l7_hh].sign) == 9
        and "mercury" in P and house_from(P["mercury"].sign, P[l7_hh].sign) == 8
    )
    hh_clause3 = bool(
        lagnesh_pf
        and "sun" in P and house_from(P["sun"].sign, lagnesh_pf.sign) == 4
        and "venus" in P and house_from(P["venus"].sign, lagnesh_pf.sign) == 10
        and "mars" in P and house_from(P["mars"].sign, lagnesh_pf.sign) == 11
    )
    catalog.append({
        "key": "harihara_brahma", "name": "Harihara Brahma Yoga", "polarity": "benefic",
        "present": hh_clause1 or hh_clause2 or hh_clause3,
        "text": "Formed by any of three classical combinations linking the 2nd, 7th "
                "or Lagna lord with specific benefic placements — a Harihara Brahma "
                "yoga for eminent scholarship, truthfulness and a helpful nature.",
    })

    catalog.append({
        "key": "kusuma", "name": "Kusuma Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 1
            and "moon" in P and P["moon"].house == 7
            and "sun" in P and house_from(P["sun"].sign, P["moon"].sign) == 8
        ),
        "text": "Jupiter in the Lagna, the Moon in the 7th, and the Sun 8th from the "
                "Moon — a Kusuma yoga for ruling status, protecting one's kin and an "
                "unblemished reputation.",
    })

    def _malefic_in_house(h: int) -> bool:
        return any(pf.house == h for k, pf in P.items() if k in NATURAL_MALEFICS)

    def _benefic_in_house(h: int) -> bool:
        return any(pf.house == h for k, pf in P.items() if k in NATURAL_BENEFICS)

    catalog.append({
        "key": "matsya", "name": "Matsya Yoga", "polarity": "mixed",
        "present": bool(
            _malefic_in_house(1) and _malefic_in_house(9) and _malefic_in_house(5)
            and _benefic_in_house(5) and _malefic_in_house(4) and _malefic_in_house(8)
        ),
        "text": "The Lagna and 9th house are joined by malefics, the 5th by both "
                "malefics and benefics, and the 4th and 8th by malefics — a Matsya "
                "yoga for a loving, famous and religious temperament.",
    })

    kurma_navamsa = all(
        any(
            k in YOGA_BENEFICS and pf.house == h and _navamsa_dignity(pf) in {"own", "exalted", "friend"}
            for k, pf in P.items()
        )
        for h in (5, 6, 7)
    )
    kurma_rasi = all(
        any(
            k in YOGA_BENEFICS and pf.house == h and pf.dignity in {"own", "exalted", "friend", "moolatrikona"}
            for k, pf in P.items()
        )
        for h in (1, 3, 11)
    )
    catalog.append({
        "key": "kurma", "name": "Kurma Yoga", "polarity": "benefic",
        "present": bool(kurma_navamsa or kurma_rasi),
        "text": "Benefics occupy the 5th, 6th and 7th houses in their own, exalted "
                "or friendly Navamsa, or the 1st, 3rd and 11th in dignified signs — "
                "a Kurma yoga for world fame and princely enjoyment.",
    })

    l11_dev = chart.house_lord.get(11)
    l2_dev = chart.house_lord.get(2)
    l10_dev = chart.house_lord.get(10)
    catalog.append({
        "key": "devendra", "name": "Devendra Yoga", "polarity": "benefic",
        "present": bool(
            lagna_sign in FIXED_SIGNS
            and lagnesh and l11_dev and lagnesh in P and l11_dev in P
            and P[lagnesh].house == 11 and P[l11_dev].house == 1
            and l2_dev and l10_dev and l2_dev in P and l10_dev in P
            and P[l2_dev].house == 10 and P[l10_dev].house == 2
        ),
        "text": "A fixed Lagna with the lords of the Lagna and 11th, and of the 2nd "
                "and 10th, exchanging houses in pairs — a Devendra yoga for wealth, "
                "longevity and a striking personality respected by rulers.",
    })

    l9_mak = chart.house_lord.get(9)
    catalog.append({
        "key": "makuta", "name": "Makuta Yoga", "polarity": "mixed",
        "present": bool(
            l9_mak and l9_mak in P
            and "jupiter" in P and house_from(P["jupiter"].sign, P[l9_mak].sign) == 9
            and any(b in P and house_from(P[b].sign, P["jupiter"].sign) == 9 for b in YOGA_BENEFICS)
            and "saturn" in P and P["saturn"].house == 10
        ),
        "text": "Jupiter in the 9th from the 9th lord, a benefic 9th from Jupiter, "
                "and Saturn in the 10th — a Makuta yoga for power and sporting "
                "spirit, sometimes turning to a harsher disposition.",
    })

    l6_chan = chart.house_lord.get(6)
    l9_chan = chart.house_lord.get(9)
    chandika_present = False
    if l6_chan and l6_chan in P and l9_chan and l9_chan in P and "sun" in P:
        _nav_l6 = SIGN_LORD[P[l6_chan].navamsa]
        _nav_l9 = SIGN_LORD[P[l9_chan].navamsa]
        chandika_present = bool(
            _nav_l6 in P and _nav_l9 in P
            and P[_nav_l6].house == P["sun"].house and P[_nav_l9].house == P["sun"].house
            and lagna_sign in FIXED_SIGNS
            and l6_chan in chart.aspects_to(1)
        )
    catalog.append({
        "key": "chandika", "name": "Chandika Yoga", "polarity": "mixed",
        "present": chandika_present,
        "text": "The Navamsa lords of the 6th and 9th lords join the Sun while a "
                "fixed Lagna is aspected by the 6th lord — a Chandika yoga for an "
                "aggressive but charitable, wealthy and long-lived nature.",
    })

    l6_jaya = chart.house_lord.get(6)
    l10_jaya = chart.house_lord.get(10)
    catalog.append({
        "key": "jaya", "name": "Jaya Yoga", "polarity": "benefic",
        "present": bool(
            l6_jaya and l6_jaya in P and P[l6_jaya].dignity == "debilitated"
            and l10_jaya and l10_jaya in P and _deeply_exalted(P[l10_jaya])
        ),
        "text": "The 6th lord is debilitated while the 10th lord sits deeply "
                "exalted — a Jaya yoga for victory over enemies and success in "
                "every venture.",
    })

    l11_vid = chart.house_lord.get(11)
    catalog.append({
        "key": "vidyut", "name": "Vidyut Yoga", "polarity": "benefic",
        "present": bool(
            l11_vid and l11_vid in P and _deeply_exalted(P[l11_vid])
            and "venus" in P and P["venus"].house == P[l11_vid].house
            and lagnesh_pf and house_from(P[l11_vid].sign, lagnesh_pf.sign) in KENDRA
        ),
        "text": "The 11th lord sits deeply exalted, joined by Venus, in an angle "
                "from the lagna lord — a Vidyut yoga for charity, controlling "
                "wealth, and ruler-like standing.",
    })

    l10_gan = chart.house_lord.get(10)
    catalog.append({
        "key": "gandharva", "name": "Gandharva Yoga", "polarity": "benefic",
        "present": bool(
            l10_gan and l10_gan in P and P[l10_gan].house in KAMA_TRIKONA
            and lagnesh_pf and "jupiter" in P and P["jupiter"].house == lagnesh_pf.house
            and "sun" in P and P["sun"].dignity == "exalted"
            and "moon" in P and P["moon"].house == 9
        ),
        "text": "The 10th lord in a Kama Trikona (3rd, 7th or 11th) house, the "
                "lagna lord joined by Jupiter, an exalted Sun and the Moon in the "
                "9th — a Gandharva yoga for unparalleled skill in the fine arts.",
    })

    l5_siva = chart.house_lord.get(5)
    l9_siva = chart.house_lord.get(9)
    l10_siva = chart.house_lord.get(10)
    catalog.append({
        "key": "siva", "name": "Siva Yoga", "polarity": "benefic",
        "present": bool(
            l5_siva and l9_siva and l10_siva
            and l5_siva in P and l9_siva in P and l10_siva in P
            and P[l5_siva].house == 9 and P[l9_siva].house == 10 and P[l10_siva].house == 5
        ),
        "text": "The 5th lord in the 9th, the 9th lord in the 10th, and the 10th "
                "lord in the 5th — a Siva yoga for great trade, military command "
                "and divine wisdom.",
    })

    l9_vis = chart.house_lord.get(9)
    l10_vis = chart.house_lord.get(10)
    vishnu_present = False
    if l9_vis and l9_vis in P and l10_vis and l10_vis in P:
        _nav_l9_vis = SIGN_LORD[P[l9_vis].navamsa]
        vishnu_present = bool(
            _nav_l9_vis in P and P[_nav_l9_vis].house == 2
            and P[l10_vis].house == 2 and P[l9_vis].house == 2
        )
    catalog.append({
        "key": "vishnu", "name": "Vishnu Yoga", "polarity": "benefic",
        "present": vishnu_present,
        "text": "The Navamsa lord of the 9th lord and the 10th lord both join the "
                "2nd house together with the 9th lord — a Vishnu yoga for an "
                "enjoyable, wealthy and long life.",
    })

    l9_brah = chart.house_lord.get(9)
    l11_brah = chart.house_lord.get(11)
    l10_brah = chart.house_lord.get(10)
    catalog.append({
        "key": "brahma", "name": "Brahma Yoga", "polarity": "benefic",
        "present": bool(
            l9_brah and l9_brah in P and "jupiter" in P
            and house_from(P["jupiter"].sign, P[l9_brah].sign) in KENDRA
            and l11_brah and l11_brah in P and "venus" in P
            and house_from(P["venus"].sign, P[l11_brah].sign) in KENDRA
            and "mercury" in P and (
                house_from(P["mercury"].sign, lagna_sign) in KENDRA
                or (l10_brah and l10_brah in P and house_from(P["mercury"].sign, P[l10_brah].sign) in KENDRA)
            )
        ),
        "text": "Jupiter and Venus stand in angles from the 9th and 11th lords "
                "while Mercury holds an angle from the Lagna or 10th lord — a "
                "Brahma yoga for luxurious living, scholarship and a long, "
                "charitable life.",
    })

    l5_ind = chart.house_lord.get(5)
    l11_ind = chart.house_lord.get(11)
    catalog.append({
        "key": "indra", "name": "Indra Yoga", "polarity": "benefic",
        "present": bool(
            l5_ind and l11_ind and l5_ind in P and l11_ind in P
            and P[l5_ind].house == 11 and P[l11_ind].house == 5
            and "moon" in P and P["moon"].house == 5
        ),
        "text": "The lords of the 5th and 11th houses exchange places while the "
                "Moon joins the 5th — an Indra yoga for great courage and lasting "
                "fame.",
    })

    l10_ravi = chart.house_lord.get(10)
    catalog.append({
        "key": "ravi", "name": "Ravi Yoga", "polarity": "benefic",
        "present": bool(
            "sun" in P and P["sun"].house == 10
            and l10_ravi and l10_ravi in P and P[l10_ravi].house == 3
            and "saturn" in P and P["saturn"].house == 3
        ),
        "text": "The Sun joins the 10th house while the 10th lord sits in the 3rd "
                "with Saturn — a Ravi yoga for respect from rulers and expertise "
                "in the sciences.",
    })

    garuda_present = False
    if all(k in P for k in ("moon", "sun")) and chart.is_day:
        _nav_lord_moon = SIGN_LORD[P["moon"].navamsa]
        if _nav_lord_moon in P and P[_nav_lord_moon].dignity == "exalted":
            _elong = (P["moon"].longitude - P["sun"].longitude) % 360
            garuda_present = _elong < 180
    catalog.append({
        "key": "garuda", "name": "Garuda Yoga", "polarity": "mixed",
        "present": garuda_present,
        "text": "The Navamsa lord of the Moon's sign is exalted, with a day birth "
                "under a waxing Moon — a Garuda yoga for polished speech and "
                "standing that intimidates rivals.",
    })

    l2_go = chart.house_lord.get(2)
    catalog.append({
        "key": "go", "name": "Go Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].dignity == "moolatrikona"
            and l2_go and l2_go in P and P[l2_go].house == P["jupiter"].house
            and lagnesh_pf and lagnesh_pf.dignity == "exalted"
        ),
        "text": "A strong Jupiter in its Moolatrikona sign with the 2nd lord, and "
                "an exalted lagna lord — a Go yoga for a respectable family "
                "background and ruler-like wealth.",
    })

    gola_present = False
    if all(k in P for k in ("moon", "jupiter", "venus", "sun", "mercury")):
        _elong2 = (P["moon"].longitude - P["sun"].longitude) % 360
        _full_moon = 165 <= _elong2 <= 195
        _nav_lagna_sign = navamsa_sign(chart.lagna_lon)
        gola_present = bool(
            P["moon"].house == 9 and _full_moon
            and P["jupiter"].house == 9 and P["venus"].house == 9
            and P["mercury"].navamsa == _nav_lagna_sign
        )
    catalog.append({
        "key": "gola", "name": "Gola Yoga", "polarity": "benefic",
        "present": gola_present,
        "text": "A near-full Moon in the 9th joined by Jupiter and Venus, with "
                "Mercury on the Navamsa lagna — a Gola yoga for a polite, learned "
                "life as a magistrate or village head.",
    })

    catalog.append({
        "key": "thrilochana", "name": "Thrilochana Yoga", "polarity": "benefic",
        "present": bool(
            all(k in P for k in ("sun", "moon", "mars"))
            and house_from(P["moon"].sign, P["sun"].sign) in TRIKONA
            and house_from(P["mars"].sign, P["sun"].sign) in TRIKONA
        ),
        "text": "The Sun, Moon and Mars stand in mutual trines — a Thrilochana "
                "yoga for great wealth, intelligence and a formidable presence.",
    })

    catalog.append({
        "key": "kulavardhana", "name": "Kulavardhana Yoga", "polarity": "benefic",
        "present": bool(
            lagna_sign == sun_sign == moon_sign
            and all(k in P and P[k].house == 5 for k in DIGNITY_PLANETS)
        ),
        "text": "All seven planets fall in the 5th house counted from a shared "
                "Lagna/Sun/Moon sign — a Kulavardhana yoga for an unbroken family "
                "line and a wealthy, healthy life.",
    })

    # ── Nabhasa yogas (Ashraya/Dala/Akriti/Sankhya families, Raman #71–100) ──
    span_yogas = [
        ("yupa", _span_houses(1, 4), "Yupa Yoga", "benefic",
         "Liberal, self-possessed, and noted for charitable deeds."),
        ("ishu", _span_houses(4, 4), "Ishu Yoga", "benefic",
         "Successful as a superintendent or head of a jail or camp."),
        ("sakti", _span_houses(7, 4), "Sakti Yoga", "caution",
         "Lazy, slothful, devoid of riches, generally disliked."),
        ("danda", _span_houses(10, 4), "Danda Yoga", "caution",
         "Lacks happiness from wife and children, dependent."),
        ("nav", _span_houses(1, 7), "Nav Yoga", "mixed",
         "Occasionally happy, famous, and miserly."),
        ("kuta", _span_houses(4, 7), "Kuta Yoga", "caution",
         "Liar, cruel, and may earn a livelihood through prisons."),
        ("chhatra", _span_houses(7, 7), "Chhatra Yoga", "benefic",
         "Happy, prosperous, helpful to kith and kin."),
        ("chakra", frozenset({1, 3, 5, 7, 9, 11}), "Chakra Yoga", "benefic",
         "Respected, king or equal, of virtuous conduct."),
        ("sakata_nabhasa", frozenset({1, 7}), "Sakata (Nabhasa) Yoga", "caution",
         "Poor, unhappy in domestic life, earning by manual labor."),
        ("vihaga", frozenset({4, 10}), "Vihaga Yoga", "caution",
         "Vagrant, traveling agent, quarrelsome and mean."),
        ("sringhataka", frozenset(TRIKONA), "Sringhataka Yoga", "benefic",
         "Happy in later life, wealthy."),
        ("kamala", frozenset(KENDRA), "Kamala Yoga", "benefic",
         "Prestige, wide fame, and innumerable virtues."),
        ("samudra_nabhasa", frozenset({2, 4, 6, 8, 10, 12}), "Samudra (Nabhasa) Yoga", "benefic",
         "Ruler or equal, free from care and worry."),
    ]
    for _key, _allowed, _name, _polarity, _result in span_yogas:
        catalog.append({
            "key": _key, "name": _name, "polarity": _polarity,
            "present": bool(occ_houses) and occ_houses <= _allowed,
            "text": f"All seven planets confine themselves to a fixed set of houses "
                    f"(a Nabhasa yoga) — classically: {_result}",
        })

    catalog.append({
        "key": "ardha_chandra", "name": "Ardha Chandra Yoga", "polarity": "benefic",
        "present": bool(occ_houses) and any(
            occ_houses <= _span_houses(start, 7) for start in (PANAPARA | APOKLIMA)
        ),
        "text": "All seven planets occupy seven contiguous houses beginning from a "
                "Panapara or Apoklima house — an Ardha Chandra yoga for fine "
                "features, lifelong happiness and command.",
    })
    catalog.append({
        "key": "gada", "name": "Gada Yoga", "polarity": "benefic",
        "present": bool(occ_houses) and any(occ_houses <= pair for pair in ADJACENT_KENDRA_PAIRS),
        "text": "All seven planets confine themselves to two adjacent angular "
                "houses — a Gada yoga for deep religious devotion, wealth and "
                "charitable deeds.",
    })
    catalog.append({
        "key": "vajra", "name": "Vajra Yoga", "polarity": "benefic",
        "present": bool(
            occ_houses and occ_houses <= KENDRA
            and all(k in NATURAL_BENEFICS for k, pf in P.items() if k in DIGNITY_PLANETS and pf.house in {1, 7})
            and all(k in NATURAL_MALEFICS for k, pf in P.items() if k in DIGNITY_PLANETS and pf.house in {4, 10})
        ),
        "text": "Benefics occupy the 1st and 7th houses while malefics occupy the "
                "4th and 10th — a Vajra yoga for a happy, handsome and brave "
                "disposition.",
    })
    catalog.append({
        "key": "yava", "name": "Yava Yoga", "polarity": "mixed",
        "present": bool(
            occ_houses and occ_houses <= KENDRA
            and all(k in NATURAL_MALEFICS for k, pf in P.items() if k in DIGNITY_PLANETS and pf.house in {1, 7})
            and all(k in NATURAL_BENEFICS for k, pf in P.items() if k in DIGNITY_PLANETS and pf.house in {4, 10})
        ),
        "text": "Malefics occupy the 1st and 7th houses while benefics occupy the "
                "4th and 10th — a Yava yoga for happiness concentrated in the "
                "middle period of life.",
    })
    catalog.append({
        "key": "hala", "name": "Hala Yoga", "polarity": "mixed",
        "present": bool(occ_houses) and any(occ_houses <= triad for triad in OTHER_TRIKONA_TRIADS),
        "text": "All seven planets confine themselves to a trine other than the "
                "Lagna's own — a Hala yoga tied to agriculture, farming or estate "
                "management.",
    })
    catalog.append({
        "key": "vapee", "name": "Vapee Yoga", "polarity": "caution",
        "present": bool(occ_houses) and (occ_houses <= PANAPARA or occ_houses <= APOKLIMA),
        "text": "All seven planets confine themselves to only the Panapara or only "
                "the Apoklima houses — a Vapee yoga for hoarding money and a "
                "tendency toward trickery.",
    })

    sankhya_defs = [
        ("vallaki", 7, "Vallaki Yoga", "benefic",
         "Large number of friends, fond of music and fine arts, learned."),
        ("damni", 6, "Damni Yoga", "benefic",
         "Highly charitable, always helping others, protector of cattle."),
        ("pasa", 5, "Pasa Yoga", "benefic",
         "Acquires wealth righteously, surrounded by friends and relatives."),
        ("kedara", 4, "Kedara Yoga", "benefic",
         "Earns a livelihood by agriculture, helpful."),
        ("sula", 3, "Sula Yoga", "caution",
         "Devoid of wealth, courageous, sometimes cruel, prone to wounds."),
        ("yuga", 2, "Yuga Yoga", "caution",
         "Poor, ostracised by society, heretical."),
        ("gola_nabhasa", 1, "Gola (Nabhasa) Yoga", "caution",
         "Poor, unclean living, uneducated and indolent."),
    ]
    _n_signs = len(occ_signs)
    for _key, _n, _name, _polarity, _result in sankhya_defs:
        catalog.append({
            "key": _key, "name": _name, "polarity": _polarity,
            "present": bool(occ_signs) and _n_signs == _n,
            "text": f"All seven planets spread across exactly {_n} distinct sign(s) "
                    f"(a Sankhya Nabhasa yoga) — classically: {_result}",
        })

    ashraya_defs = [
        ("rajju", MOVABLE_SIGNS, "Rajju Yoga", "mixed",
         "Fond of travel, handsome, seeks wealth abroad, can be harsh."),
        ("musala", FIXED_SIGNS, "Musala Yoga", "benefic",
         "Self-respect, wealth, learning, a steady mind, famous."),
        ("nala", DUAL_SIGNS, "Nala Yoga", "caution",
         "Some bodily imperfection, shrewd, prone to disappointment."),
    ]
    for _key, _allowed_signs, _name, _polarity, _result in ashraya_defs:
        catalog.append({
            "key": _key, "name": _name, "polarity": _polarity,
            "present": bool(occ_signs) and occ_signs <= _allowed_signs,
            "text": f"All seven planets occupy signs of one modality (an Ashraya "
                    f"Nabhasa yoga) — classically: {_result}",
        })

    # ── Combinations #101–162 ────────────────────────────────────────────────
    l3 = chart.house_lord.get(3)
    l4 = chart.house_lord.get(4)
    l6 = chart.house_lord.get(6)
    l8 = chart.house_lord.get(8)
    l10 = chart.house_lord.get(10)
    l12 = chart.house_lord.get(12)

    def _joined_or_aspects(a: str, b: str) -> bool:
        """True when planet a conjoins planet b, or aspects b's house."""
        return bool(
            a in P and b in P
            and (P[a].house == P[b].house or a in chart.aspects_to(P[b].house))
        )

    catalog.append({
        "key": "srik_mala", "name": "Srik Yoga (Mala)", "polarity": "benefic",
        "present": all(k in P and P[k].house in KENDRA for k in NATURAL_BENEFICS),
        "text": "All natural benefics occupy angular houses — a Srik (Mala) yoga "
                "for a comfortable life, conveyances and many enjoyments.",
    })
    catalog.append({
        "key": "sarpa_101_200", "name": "Sarpa Yoga", "polarity": "caution",
        "present": all(k in P and P[k].house in KENDRA for k in NATURAL_MALEFICS),
        "text": "All natural malefics occupy angular houses — a Sarpa yoga for "
                "hardship in many ways, a harsher temperament and clouded "
                "judgement.",
    })
    catalog.append({
        "key": "duryoga", "name": "Duryoga", "polarity": "caution",
        "present": bool(l10 and l10 in P and P[l10].house in DUSTHANA),
        "text": "The 10th lord sits in a dusthana (6th, 8th or 12th) — a Duryoga "
                "where one's own efforts don't bring due credit, tempting "
                "shortcuts or deception.",
    })
    catalog.append({
        "key": "daridra_101_200", "name": "Daridra Yoga", "polarity": "caution",
        "present": bool(l11_early and l11_early in P and P[l11_early].house in DUSTHANA),
        "text": "The 11th lord sits in a dusthana (6th, 8th or 12th) — a Daridra "
                "yoga for financial strain, debt and a mean disposition unless "
                "corrected by other strong factors.",
    })
    catalog.append({
        "key": "harsha", "name": "Harsha Yoga", "polarity": "benefic",
        "present": bool(l6 and l6 in P and P[l6].house == 6),
        "text": "The 6th lord occupies its own 6th house — a Harsha yoga for "
                "good fortune, invincibility over rivals and physical strength.",
    })
    catalog.append({
        "key": "sarala", "name": "Sarala Yoga", "polarity": "benefic",
        "present": bool(l8 and l8 in P and P[l8].house == 8),
        "text": "The 8th lord occupies its own 8th house — a Sarala yoga for "
                "longevity, fearlessness and learning that intimidates rivals.",
    })
    catalog.append({
        "key": "vimala", "name": "Vimala Yoga", "polarity": "benefic",
        "present": bool(l12 and l12 in P and P[l12].house == 12),
        "text": "The 12th lord occupies its own 12th house — a Vimala yoga for "
                "frugality, independence and a noble character.",
    })
    catalog.append({
        "key": "sareera_soukhya", "name": "Sareera Soukhya Yoga", "polarity": "benefic",
        "present": bool(
            (lagnesh_pf and lagnesh_pf.house in KENDRA)
            or ("jupiter" in P and P["jupiter"].house in KENDRA)
            or ("venus" in P and P["venus"].house in KENDRA)
        ),
        "text": "The lagna lord, Jupiter or Venus occupies an angle — a Sareera "
                "Soukhya yoga for long life, wealth and political favour.",
    })
    catalog.append({
        "key": "dehapushti", "name": "Dehapushti Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf and lagnesh_pf.sign in MOVABLE_SIGNS
            and any(b in chart.aspects_to(lagnesh_pf.house) for b in NATURAL_BENEFICS)
        ),
        "text": "The lagna lord in a movable sign is aspected by a benefic — a "
                "Dehapushti yoga for a well-developed body, wealth and an "
                "enjoyable life.",
    })
    catalog.append({
        "key": "dehakashta", "name": "Dehakashta Yoga", "polarity": "caution",
        "present": bool(
            lagnesh_pf and (
                lagnesh_pf.house == 8
                or any(k in NATURAL_MALEFICS and pf.house == lagnesh_pf.house for k, pf in P.items())
            )
        ),
        "text": "The lagna lord joins a malefic or sits in the 8th house — a "
                "Dehakashta yoga pointing to reduced bodily comfort.",
    })
    catalog.append({
        "key": "rogagrastha", "name": "Rogagrastha Yoga", "polarity": "caution",
        "present": bool(
            lagnesh_pf and (
                (lagnesh_pf.house == 1 and any(
                    lv and lv in P and P[lv].house == 1 for lv in (l6, l8, l12)
                ))
                or (
                    lagnesh_pf.dignity not in {"own", "exalted", "moolatrikona", "friend"}
                    and lagnesh_pf.house in (KENDRA | TRIKONA)
                )
            )
        ),
        "text": "The lagna lord in the ascendant joins a 6th/8th/12th lord, or a "
                "weak lagna lord sits in an angle or trine — a Rogagrastha yoga "
                "for a delicate constitution prone to sickness.",
    })
    catalog.append({
        "key": "krisanga_1", "name": "Krisanga Yoga (I)", "polarity": "caution",
        "present": bool(
            lagnesh_pf and (
                lagnesh_pf.sign in DRY_SIGNS or SIGN_LORD[lagnesh_pf.sign] in DRY_PLANETS
            )
        ),
        "text": "The lagna lord occupies a dry sign or one owned by a dry planet "
                "— a Krisanga yoga for a lean body and bodily aches.",
    })
    nav_lagna_sign = navamsa_sign(chart.lagna_lon)
    catalog.append({
        "key": "krisanga_2", "name": "Krisanga Yoga (II)", "polarity": "caution",
        "present": bool(
            SIGN_LORD[nav_lagna_sign] in DRY_PLANETS
            and any(k in NATURAL_MALEFICS and pf.house == 1 for k, pf in P.items())
        ),
        "text": "The Navamsa Lagna is owned by a dry planet while malefics join "
                "the Lagna — a Krisanga yoga for a lean body and bodily aches.",
    })
    dehasthoulya_nav_lord = SIGN_LORD[lagnesh_pf.navamsa] if lagnesh_pf else None
    catalog.append({
        "key": "dehasthoulya_1", "name": "Dehasthoulya Yoga (I)", "polarity": "mixed",
        "present": bool(
            lagnesh_pf and lagnesh_pf.sign in WATERY_SIGNS
            and dehasthoulya_nav_lord in P and P[dehasthoulya_nav_lord].sign in WATERY_SIGNS
        ),
        "text": "The lagna lord and the lord of its Navamsa sign both occupy "
                "watery signs — a Dehasthoulya yoga for a stout, well-built "
                "physique.",
    })
    catalog.append({
        "key": "dehasthoulya_2", "name": "Dehasthoulya Yoga (II)", "polarity": "mixed",
        "present": bool(
            "jupiter" in P and (
                P["jupiter"].house == 1
                or (P["jupiter"].sign in WATERY_SIGNS and "jupiter" in chart.aspects_to(1))
            )
        ),
        "text": "Jupiter occupies the Lagna, or aspects it from a watery sign — "
                "a Dehasthoulya yoga for a stout physique.",
    })
    catalog.append({
        "key": "dehasthoulya_3", "name": "Dehasthoulya Yoga (III)", "polarity": "mixed",
        "present": bool(
            (lagna_sign in WATERY_SIGNS and any(b in P and P[b].house == 1 for b in NATURAL_BENEFICS))
            or (lagnesh in WATERY_PLANETS)
        ),
        "text": "The ascendant falls in a watery sign with benefics, or the "
                "lagna lord is itself a watery planet — a Dehasthoulya yoga for "
                "a stout physique.",
    })
    sada_dispositor = SIGN_LORD[lagnesh_pf.sign] if lagnesh_pf else None
    catalog.append({
        "key": "sada_sanchara", "name": "Sada Sanchara Yoga", "polarity": "mixed",
        "present": bool(
            lagnesh_pf and (
                lagnesh_pf.sign in MOVABLE_SIGNS
                or (sada_dispositor in P and P[sada_dispositor].sign in MOVABLE_SIGNS)
            )
        ),
        "text": "The lagna lord, or the lord of the sign it occupies, falls in "
                "a movable sign — a Sada Sanchara yoga for a life of travel, "
                "diplomacy or wandering.",
    })

    # Dhana Yoga variants #118–128 (own-sign 5th/11th combinations).
    fifth_sign = (lagna_sign + 4) % 12

    def _own_sign_dhana(sign_set: set[int], fifth_planet: str, eleventh_planets: tuple[str, ...]) -> bool:
        return bool(
            fifth_sign in sign_set
            and fifth_planet in P and P[fifth_planet].house == 5
            and all(k in P and P[k].house == 11 for k in eleventh_planets)
        )

    dhana_variants = [
        ("dhana_118", {1, 6}, "venus", ("saturn",)),
        ("dhana_119", {2, 5}, "mercury", ("moon", "mars")),
        ("dhana_120", {9, 10}, "saturn", ("mercury", "mars")),
        ("dhana_121", {4}, "sun", ("jupiter", "moon")),
        ("dhana_122", {8, 11}, "jupiter", ("mars", "moon")),
    ]
    for _key, _signs, _planet, _eleventh in dhana_variants:
        catalog.append({
            "key": _key, "name": f"Dhana Yoga ({_key.split('_')[1]})", "polarity": "benefic",
            "present": _own_sign_dhana(_signs, _planet, _eleventh),
            "text": "The 5th house is the named planet's own sign, occupied by "
                    "it, with the paired planets in the 11th — a Dhana yoga for "
                    "acquiring much wealth.",
        })

    def _lagna_own_sign_dhana(sign_set: set[int], lagna_planet: str, aspecting: tuple[str, ...]) -> bool:
        return bool(
            lagna_sign in sign_set and lagna_planet in P and P[lagna_planet].house == 1
            and all(_joined_or_aspects(a, lagna_planet) for a in aspecting)
        )

    dhana_lagna_variants = [
        ("dhana_123", {4}, "sun", ("mars", "jupiter")),
        ("dhana_124", {3}, "moon", ("jupiter", "mars")),
        ("dhana_125", {0, 7}, "mars", ("moon", "venus", "saturn")),
        ("dhana_126", {2, 5}, "mercury", ("saturn", "venus")),
        ("dhana_127", {8, 11}, "jupiter", ("mercury", "mars")),
        ("dhana_128", {1, 6}, "venus", ("saturn", "mercury")),
    ]
    for _key, _signs, _planet, _aspecting in dhana_lagna_variants:
        catalog.append({
            "key": _key, "name": f"Dhana Yoga ({_key.split('_')[1]})", "polarity": "benefic",
            "present": _lagna_own_sign_dhana(_signs, _planet, _aspecting),
            "text": "A planet in its own Lagna sign, joined or aspected by its "
                    "classical partners — a Dhana yoga for acquiring immense "
                    "wealth.",
        })

    catalog.append({
        "key": "bahudravyarjana", "name": "Bahudravyarjana Yoga", "polarity": "benefic",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house == 2
            and l2 and l2 in P and P[l2].house == 11
            and l11_early and l11_early in P and P[l11_early].house == 1
        ),
        "text": "The lagna lord in the 2nd, the 2nd lord in the 11th, and the "
                "11th lord in the Lagna — a Bahudravyarjana yoga for earning "
                "and amassing a fortune.",
    })
    catalog.append({
        "key": "swaveeryaddhana_1", "name": "Swaveeryaddhana Yoga (I)", "polarity": "benefic",
        "present": bool(
            lagnesh_pf and "jupiter" in P and lagnesh_pf.house in KENDRA
            and P["jupiter"].house == lagnesh_pf.house
            and l2 and l2 in P and _amsa_grade(l2, P[l2].longitude) == "vaiseshikamsa"
        ),
        "text": "The lagna lord joins Jupiter in an angle while the 2nd lord "
                "attains Vaiseshikamsa (its own sign in 13 or more of the 16 "
                "Shodasa Vargas) — wealth earned by one's own effort.",
    })
    swav2_nav_lord = SIGN_LORD[lagnesh_pf.navamsa] if lagnesh_pf else None
    swav2_final_lord = (
        SIGN_LORD[P[swav2_nav_lord].sign] if swav2_nav_lord in P else None
    )
    catalog.append({
        "key": "swaveeryaddhana_2", "name": "Swaveeryaddhana Yoga (II)", "polarity": "benefic",
        "present": bool(
            swav2_final_lord and swav2_final_lord in P and l2 and l2 in P
            and (
                P[swav2_final_lord].dignity in {"own", "exalted"}
                or house_from(P[swav2_final_lord].sign, P[l2].sign) in (KENDRA | TRIKONA)
            )
        ),
        "text": "The dispositor of the lagna lord's Navamsa lord is strong and "
                "angular from the 2nd lord, or dignified — a Swaveeryaddhana "
                "yoga for self-earned wealth.",
    })
    catalog.append({
        "key": "swaveeryaddhana_3", "name": "Swaveeryaddhana Yoga (III)", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and lagnesh_pf and (
                house_from(P[l2].sign, lagnesh_pf.sign) in (KENDRA | TRIKONA)
                or (
                    l2 in NATURAL_BENEFICS
                    and (
                        _deeply_exalted(P[l2])
                        or any(k != l2 and pf.house == P[l2].house and pf.dignity == "exalted" for k, pf in P.items())
                    )
                )
            )
        ),
        "text": "The 2nd lord holds an angle or trine from the lagna lord, or a "
                "benefic 2nd lord is deeply exalted or joined by an exalted "
                "planet — a Swaveeryaddhana yoga for self-earned wealth.",
    })
    catalog.append({
        "key": "madhya_vayasi_dhana", "name": "Madhya Vayasi Dhana Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l11_early and l2 in P and l11_early in P and lagnesh_pf
            and house_from(P[l2].sign, lagnesh_pf.sign) in (KENDRA | TRIKONA)
            and house_from(P[l2].sign, P[l11_early].sign) in (KENDRA | TRIKONA)
            and any(b in chart.aspects_to(P[l2].house) for b in NATURAL_BENEFICS)
        ),
        "text": "The 2nd lord stands in an angle/trine from both the lagna and "
                "11th lords, aspected by a benefic — money earned by one's own "
                "effort in the middle years.",
    })
    anthya_present = False
    if l2 and l2 in P and lagnesh_pf and P[l2].house == lagnesh_pf.house:
        _shared_sign = lagnesh_pf.sign
        _has_benefic = any(k in NATURAL_BENEFICS and pf.house == lagnesh_pf.house for k, pf in P.items())
        _dispositor = SIGN_LORD[_shared_sign]
        if _has_benefic and _dispositor in P:
            anthya_present = bool(P[_dispositor].house == 1 and P[_dispositor].dignity in {"own", "exalted"})
    catalog.append({
        "key": "anthya_vayasi_dhana", "name": "Anthya Vayasi Dhana Yoga", "polarity": "benefic",
        "present": anthya_present,
        "text": "The lagna and 2nd lords join a benefic in one house whose "
                "dispositor is strongly placed in the Lagna — wealth acquired "
                "toward the last part of life.",
    })
    balya_nav_lord = SIGN_LORD[lagnesh_pf.navamsa] if lagnesh_pf else None
    catalog.append({
        "key": "balya_dhana", "name": "Balya Dhana Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l10 and l2 in P and l10 in P and P[l2].house == P[l10].house
            and P[l2].house in KENDRA
            and balya_nav_lord in chart.aspects_to(P[l2].house)
        ),
        "text": "The 2nd and 10th lords conjoin in an angle, aspected by the "
                "Navamsa lord of the lagna lord's sign — riches acquired early "
                "in life.",
    })
    catalog.append({
        "key": "bhratrumooladdhanaprapti_1", "name": "Bhratrumooladdhanaprapti Yoga (I)",
        "polarity": "benefic",
        "present": bool(
            lagnesh_pf and l2 and l2 in P and lagnesh_pf.house == 3 and P[l2].house == 3
            and any(b in chart.aspects_to(3) for b in NATURAL_BENEFICS)
        ),
        "text": "The lagna and 2nd lords join the 3rd house, aspected by "
                "benefics — money through brothers and relatives.",
    })
    catalog.append({
        "key": "bhratrumooladdhanaprapti_2", "name": "Bhratrumooladdhanaprapti Yoga (II)",
        "polarity": "benefic",
        "present": bool(
            l3 and l3 in P and P[l3].house == 2 and "jupiter" in P and P["jupiter"].house == 2
            and lagnesh_pf and (lagnesh_pf.house == 2 or lagnesh in chart.aspects_to(2))
        ),
        "text": "The 3rd lord joins Jupiter in the 2nd, conjoined with or "
                "aspected by the lagna lord — money through brothers and "
                "relatives.",
    })
    catalog.append({
        "key": "matrumooladdhana", "name": "Matrumooladdhana Yoga", "polarity": "benefic",
        "present": _joined_or_aspects(l2, l4) if (l2 and l4) else False,
        "text": "The 2nd lord joins or is aspected by the 4th lord — money "
                "earned with a mother's help.",
    })
    catalog.append({
        "key": "putramooladdhana", "name": "Putramooladdhana Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and (
                (l5 and l5 in P and P[l2].house == P[l5].house)
                or ("jupiter" in P and P[l2].house == P["jupiter"].house)
            )
            and lagnesh_pf and _amsa_grade(lagnesh, lagnesh_pf.longitude) == "vaiseshikamsa"
        ),
        "text": "A strong 2nd lord joins the 5th lord or Jupiter while the "
                "lagna lord attains Vaiseshikamsa — wealth through one's "
                "children.",
    })
    catalog.append({
        "key": "satrumooladdhana", "name": "Satrumooladdhana Yoga", "polarity": "mixed",
        "present": bool(
            l2 and l2 in P and (
                (l6 and l6 in P and P[l2].house == P[l6].house)
                or ("mars" in P and P[l2].house == P["mars"].house)
            )
            and lagnesh_pf and _amsa_grade(lagnesh, lagnesh_pf.longitude) == "vaiseshikamsa"
        ),
        "text": "A strong 2nd lord joins the 6th lord or Mars while the lagna "
                "lord attains Vaiseshikamsa — wealth won through rivals or "
                "opponents.",
    })
    catalog.append({
        "key": "kalatramooladdhana", "name": "Kalatramooladdhana Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l7 and l2 in P and l7 in P and "venus" in P
            and (P[l2].house == P[l7].house or l7 in chart.aspects_to(P[l2].house))
            and (P[l2].house == P["venus"].house or "venus" in chart.aspects_to(P[l2].house))
            and lagnesh_pf and lagnesh_pf.dignity in {"own", "exalted", "moolatrikona", "friend"}
        ),
        "text": "A strong 2nd lord joins or is aspected by the 7th lord and "
                "Venus while the lagna lord is strong — wealth through one's "
                "spouse.",
    })
    _count_in_2nd = sum(1 for k in DIGNITY_PLANETS if k in P and P[k].house == 2)
    catalog.append({
        "key": "amaranantha_dhana", "name": "Amaranantha Dhana Yoga", "polarity": "benefic",
        "present": bool(
            _count_in_2nd >= 3
            and (
                (l2 and l2 in P and P[l2].dignity in {"own", "exalted"})
                or ("jupiter" in P and P["jupiter"].dignity in {"own", "exalted"})
            )
        ),
        "text": "Several planets crowd the 2nd house with the wealth-giving "
                "lords strongly placed — enjoyment of wealth throughout life.",
    })
    catalog.append({
        "key": "ayatnadhanalabha", "name": "Ayatnadhanalabha Yoga", "polarity": "benefic",
        "present": bool(lagnesh_pf and l2 and l2 in P and lagnesh_pf.house == 2 and P[l2].house == 1),
        "text": "The lagna and 2nd lords exchange houses — wealth acquired "
                "without much effort.",
    })
    catalog.append({
        "key": "daridra_144", "name": "Daridra Yoga (144)", "polarity": "caution",
        "present": bool(
            l12 and lagnesh_pf and l12 in P and lagnesh_pf.house == 12 and P[l12].house == 1
            and l7 and l7 in P
            and (P[l7].house in {1, 12} or l7 in chart.aspects_to(1) or l7 in chart.aspects_to(12))
        ),
        "text": "The 12th lord and lagna lord exchange houses, joined or "
                "aspected by the 7th lord — dire poverty and financial straits.",
    })
    catalog.append({
        "key": "daridra_145", "name": "Daridra Yoga (145)", "polarity": "caution",
        "present": bool(
            l6 and lagnesh_pf and l6 in P and lagnesh_pf.house == 6 and P[l6].house == 1
            and "moon" in P and l2 and l7
            and (l2 in chart.aspects_to(P["moon"].house) or l7 in chart.aspects_to(P["moon"].house))
        ),
        "text": "The 6th lord and lagna lord exchange houses while the Moon is "
                "aspected by the 2nd or 7th lord — dire poverty and want.",
    })
    catalog.append({
        "key": "daridra_146", "name": "Daridra Yoga (146)", "polarity": "caution",
        "present": bool("ketu" in P and "moon" in P and P["ketu"].house == 1 and P["moon"].house == 1),
        "text": "Ketu and the Moon conjoin in the Lagna — dire poverty and "
                "financial straits.",
    })
    catalog.append({
        "key": "daridra_147", "name": "Daridra Yoga (147)", "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house == 8 and l2 and l7
            and (
                (l2 in P and (P[l2].house == 8 or l2 in chart.aspects_to(8)))
                or (l7 in P and (P[l7].house == 8 or l7 in chart.aspects_to(8)))
            )
        ),
        "text": "The lagna lord in the 8th is joined or aspected by the 2nd or "
                "7th lord — dire poverty and want.",
    })
    catalog.append({
        "key": "daridra_148", "name": "Daridra Yoga (148)", "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house in DUSTHANA
            and any(k in NATURAL_MALEFICS and pf.house == lagnesh_pf.house for k, pf in P.items())
            and l2 and l7
            and (
                (l2 in P and (P[l2].house == lagnesh_pf.house or l2 in chart.aspects_to(lagnesh_pf.house)))
                or (l7 in P and (P[l7].house == lagnesh_pf.house or l7 in chart.aspects_to(lagnesh_pf.house)))
            )
        ),
        "text": "The lagna lord joins a malefic in a dusthana, combined with or "
                "aspected by the 2nd or 7th lord — dire poverty and misery.",
    })
    catalog.append({
        "key": "daridra_149", "name": "Daridra Yoga (149)", "polarity": "caution",
        "present": bool(
            lagnesh_pf
            and any(lv and lv in P and P[lv].house == lagnesh_pf.house for lv in (l6, l8, l12))
            and any(k in chart.aspects_to(lagnesh_pf.house) for k in NATURAL_MALEFICS)
        ),
        "text": "The lagna lord is associated with a 6th/8th/12th lord and "
                "subjected to malefic aspects — dire poverty and want.",
    })
    catalog.append({
        "key": "daridra_150", "name": "Daridra Yoga (150)", "polarity": "caution",
        "present": bool(
            l5 and l5 in P
            and any(lv and lv in P and P[lv].house == P[l5].house for lv in (l6, l8, l12))
            and not any(
                b in chart.aspects_to(P[l5].house) or (b in P and P[b].house == P[l5].house)
                for b in NATURAL_BENEFICS
            )
        ),
        "text": "The 5th lord joins a 6th/8th/12th lord without any benefic "
                "association — dire poverty and misery.",
    })
    daridra_151_present = False
    if l5 and l5 in P and P[l5].house in {6, 10}:
        _aspecting = set(chart.aspects_to(P[l5].house))
        _relevant = {lv for lv in (l2, l6, l7, l8, l12) if lv}
        daridra_151_present = bool(_aspecting & _relevant)
    catalog.append({
        "key": "daridra_151", "name": "Daridra Yoga (151)", "polarity": "caution",
        "present": daridra_151_present,
        "text": "The 5th lord in the 6th or 10th is aspected by the lords of "
                "the 2nd, 6th, 7th, 8th or 12th — dire poverty and misery.",
    })
    _daridra_152_malefics = [
        k for k in NATURAL_MALEFICS
        if k in P and P[k].house == 1 and k != chart.house_lord.get(9) and k != l10
    ]
    _maraka = {l2, l7} - {None}
    catalog.append({
        "key": "daridra_152", "name": "Daridra Yoga (152)", "polarity": "caution",
        "present": bool(
            _daridra_152_malefics
            and (
                any(m in P and P[m].house == 1 for m in _maraka)
                or any(m in chart.aspects_to(1) for m in _maraka)
            )
        ),
        "text": "Natural malefics not owning the 9th or 10th occupy the Lagna, "
                "associated with the maraka lords — dire poverty and want.",
    })
    catalog.append({
        "key": "daridra_153", "name": "Daridra Yoga (153)", "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house in DUSTHANA
            and SIGN_LORD[nav_lagna_sign] in P and P[SIGN_LORD[nav_lagna_sign]].house in DUSTHANA
            and l2 and l7 and l2 in P and l7 in P
            and (P[l2].house == lagnesh_pf.house or l2 in chart.aspects_to(lagnesh_pf.house))
            and (P[l7].house == lagnesh_pf.house or l7 in chart.aspects_to(lagnesh_pf.house))
        ),
        "text": "The lagna and Navamsa-lagna lords both sit in a dusthana, "
                "combined with or aspected by the 2nd and 7th lords — dire "
                "poverty and misery.",
    })
    catalog.append({
        "key": "yukthi_1", "name": "Yukthi Samanwithavagmi Yoga (I)", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and (
                (P[l2].house in (KENDRA | TRIKONA) and any(b in P and P[b].house == P[l2].house for b in NATURAL_BENEFICS))
                or (_deeply_exalted(P[l2]) and "jupiter" in P and P["jupiter"].house == P[l2].house)
            )
        ),
        "text": "The 2nd lord joins a benefic in an angle or trine, or is "
                "deeply exalted with Jupiter — the person becomes an eloquent, "
                "skilled speaker.",
    })
    catalog.append({
        "key": "yukthi_2", "name": "Yukthi Samanwithavagmi Yoga (II)", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and P[l2].house in KENDRA and _deeply_exalted(P[l2])
            and _amsa_grade(l2, P[l2].longitude) == "parvatamsa"
            and (
                ("jupiter" in P and _amsa_grade("jupiter", P["jupiter"].longitude) == "simhasanamsa")
                or ("venus" in P and _amsa_grade("venus", P["venus"].longitude) == "simhasanamsa")
            )
        ),
        "text": "The 2nd lord holds an angle in deep exaltation and attains "
                "Parvatamsa (own sign in 6 of the 16 Shodasa Vargas), while "
                "Jupiter or Venus attains Simhasanamsa (own sign in 5) — an "
                "eloquent, skilled speaker.",
    })
    parihasaka_nav_lord = SIGN_LORD[P["sun"].navamsa] if "sun" in P else None
    catalog.append({
        "key": "parihasaka", "name": "Parihasaka Yoga", "polarity": "mixed",
        "present": bool(
            parihasaka_nav_lord in P and P[parihasaka_nav_lord].house == 2
            and _amsa_grade(parihasaka_nav_lord, P[parihasaka_nav_lord].longitude) == "vaiseshikamsa"
        ),
        "text": "The Navamsa lord of the Sun's sign attains Vaiseshikamsa and "
                "joins the 2nd house — a humorous, witty speaker.",
    })
    catalog.append({
        "key": "asatyavadi", "name": "Asatyavadi Yoga", "polarity": "caution",
        "present": bool(
            l2 and l2 in P and P[l2].sign in ({9, 10} | {0, 7})
            and any(k in NATURAL_MALEFICS and pf.house in KENDRA for k, pf in P.items())
            and any(k in NATURAL_MALEFICS and pf.house in TRIKONA for k, pf in P.items())
        ),
        "text": "The 2nd lord sits in a sign of Saturn or Mars while malefics "
                "occupy an angle and a trine — the native tends toward "
                "untruthfulness.",
    })
    catalog.append({
        "key": "jada_101_200", "name": "Jada Yoga", "polarity": "caution",
        "present": bool(
            (l2 and l2 in P and P[l2].house == 10 and any(k in NATURAL_MALEFICS and pf.house == 10 for k, pf in P.items()))
            or (l2 and l2 in P and "sun" in P and P[l2].house == P["sun"].house == chart.mandi_house)
        ),
        "text": "The 2nd lord in the 10th house joins malefics, or the 2nd "
                "is joined by the Sun and Mandi — becomes nervous in public "
                "assemblies.",
    })
    catalog.append({
        "key": "bhaskara", "name": "Bhaskara Yoga", "polarity": "benefic",
        "present": bool(
            "mercury" in P and "sun" in P and house_from(P["mercury"].sign, P["sun"].sign) == 2
            and "moon" in P and house_from(P["moon"].sign, P["mercury"].sign) == 11
            and "jupiter" in P and house_from(P["jupiter"].sign, P["moon"].sign) in {5, 9}
        ),
        "text": "Mercury 2nd from the Sun, the Moon 11th from Mercury, and "
                "Jupiter 5th or 9th from the Moon — wealth, valour, learning "
                "in the sciences and a fine personality.",
    })
    catalog.append({
        "key": "marud", "name": "Marud Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and "venus" in P and house_from(P["jupiter"].sign, P["venus"].sign) in {5, 9}
            and "moon" in P and house_from(P["moon"].sign, P["jupiter"].sign) == 5
            and "sun" in P and house_from(P["sun"].sign, P["moon"].sign) in KENDRA
        ),
        "text": "Jupiter 5th or 9th from Venus, the Moon 5th from Jupiter, and "
                "the Sun in an angle from the Moon — a good conversationalist, "
                "rich and successful in business.",
    })
    _saraswathi_houses = {1, 2, 4, 5, 7, 9, 10}
    catalog.append({
        "key": "saraswathi", "name": "Saraswathi Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house in _saraswathi_houses
            and P["jupiter"].dignity in {"own", "exalted", "moolatrikona", "friend"}
            and "venus" in P and P["venus"].house in _saraswathi_houses
            and "mercury" in P and P["mercury"].house in _saraswathi_houses
        ),
        "text": "Jupiter, Venus and Mercury occupy the Lagna, 2nd, 4th, 5th, "
                "7th, 9th or 10th, with Jupiter dignified — a poet, famous and "
                "learned in every science.",
    })
    catalog.append({
        "key": "budha_yoga", "name": "Budha Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 1
            and "moon" in P and P["moon"].house in KENDRA
            and "rahu" in P and house_from(P["rahu"].sign, P["moon"].sign) == 2
            and "sun" in P and house_from(P["sun"].sign, P["rahu"].sign) == 3
            and "mars" in P and house_from(P["mars"].sign, P["rahu"].sign) == 3
        ),
        "text": "Jupiter in the Lagna, the Moon in an angle, Rahu 2nd from the "
                "Moon, and the Sun and Mars 3rd from Rahu — kingly comforts, "
                "power, fame and learning, without enemies.",
    })

    # ── Shared helpers for combinations #163–300 ──────────────────────────────
    def _hemmed_by_malefics(pf: PlanetFact) -> bool:
        h2 = (pf.house % 12) + 1
        h12 = ((pf.house - 2) % 12) + 1
        return (
            any(k in NATURAL_MALEFICS and p2.house == h2 for k, p2 in P.items())
            and any(k in NATURAL_MALEFICS and p2.house == h12 for k, p2 in P.items())
        )

    def _is_waxing() -> Optional[bool]:
        if "moon" not in P or "sun" not in P:
            return None
        return ((P["moon"].longitude - P["sun"].longitude) % 360) < 180

    def _is_weak(pf: Optional[PlanetFact]) -> bool:
        return bool(pf is None or pf.dignity in {"enemy", "debilitated"})

    def _linked(a: Optional[str], others: tuple[str, ...]) -> bool:
        return bool(
            a and a in P
            and any(b in P and (P[a].house == P[b].house or b in chart.aspects_to(P[a].house)) for b in others)
        )

    def _has_digbala(key: str) -> bool:
        row = chart.shadbala.get(key)
        if not row:
            return False
        dig = (row.get("breakdown") or {}).get("dig")
        return isinstance(dig, (int, float)) and dig > 30

    def _bhava_arudha(house_num: int) -> Optional[int]:
        lord = chart.house_lord.get(house_num)
        if not lord or lord not in P:
            return None
        lord_house = P[lord].house
        x = ((lord_house - house_num) % 12) + 1
        arudha = ((lord_house - 1) + (x - 1)) % 12 + 1
        seventh = ((house_num - 1 + 6) % 12) + 1
        if arudha == house_num or arudha == seventh:
            arudha = ((arudha - 1 + 9) % 12) + 1
        return arudha

    # ── Combinations #163–200 ────────────────────────────────────────────────
    eighth_sign_ref = (lagna_sign + 7) % 12
    third_sign_ref = (lagna_sign + 2) % 12

    mooka_present = False
    if l2 and l2 in P and "jupiter" in P and P[l2].house == 8 and P["jupiter"].house == 8:
        mooka_present = not (eighth_sign_ref == EXALT_SIGN["jupiter"] or eighth_sign_ref in OWN_SIGNS["jupiter"])
    catalog.append({
        "key": "mooka", "name": "Mooka Yoga", "polarity": "caution",
        "present": mooka_present,
        "text": "The 2nd lord joins the 8th with Jupiter (unless the 8th is "
                "Jupiter's own or exaltation sign) — classically linked to "
                "speech difficulty.",
    })
    catalog.append({
        "key": "netranasa", "name": "Netranasa Yoga", "polarity": "caution",
        "present": bool(
            (l10 and l6 and l2 and l10 in P and l6 in P and l2 in P and P[l10].house == 1 and P[l6].house == 1 and P[l2].house == 1)
            or (l10 and l6 and l10 in P and l6 in P and _navamsa_dignity(P[l10]) == "debilitated" and _navamsa_dignity(P[l6]) == "debilitated")
        ),
        "text": "The 10th and 6th lords join the Lagna with the 2nd lord, or "
                "sit in Neechamsa — classically linked to eyesight loss.",
    })
    catalog.append({
        "key": "andha_163", "name": "Andha Yoga", "polarity": "caution",
        "present": bool(
            ("mercury" in P and "moon" in P and P["mercury"].house == 2 and P["moon"].house == 2)
            or (lagnesh_pf and l2 and l2 in P and "sun" in P and lagnesh_pf.house == 2 and P[l2].house == 2 and P["sun"].house == 2)
        ),
        "text": "Mercury and the Moon join the 2nd, or the lagna and 2nd "
                "lords join the Sun there — classically linked to defective "
                "night vision.",
    })
    catalog.append({
        "key": "sumukha_1", "name": "Sumukha Yoga (I)", "polarity": "benefic",
        "present": bool(l2 and l2 in P and P[l2].house in KENDRA and any(b in chart.aspects_to(P[l2].house) for b in NATURAL_BENEFICS)),
        "text": "The 2nd lord in an angle is aspected by benefics — an "
                "attractive, smiling face.",
    })
    catalog.append({
        "key": "sumukha_2", "name": "Sumukha Yoga (II)", "polarity": "benefic",
        "present": bool(any(b in P and P[b].house == 2 for b in NATURAL_BENEFICS)),
        "text": "Benefics join the 2nd house — an attractive, smiling face.",
    })
    catalog.append({
        "key": "durmukha_1", "name": "Durmukha Yoga (I)", "polarity": "caution",
        "present": bool(
            any(k in NATURAL_MALEFICS and pf.house == 2 for k, pf in P.items())
            and l2 and l2 in P and (P[l2].dignity == "debilitated" or any(k in NATURAL_MALEFICS and pf.house == P[l2].house for k, pf in P.items()))
        ),
        "text": "Malefics occupy the 2nd while its lord joins an evil planet "
                "or is debilitated — an unattractive face and an irritable "
                "temper.",
    })
    catalog.append({
        "key": "durmukha_2", "name": "Durmukha Yoga (II)", "polarity": "caution",
        "present": bool(
            l2 and l2 in NATURAL_MALEFICS and l2 in P and (
                chart.gulika_house == P[l2].house
                or (_navamsa_dignity(P[l2]) in {"enemy", "debilitated"} and any(k in NATURAL_MALEFICS and pf.navamsa == P[l2].navamsa for k, pf in P.items() if k != l2))
            )
        ),
        "text": "An evil 2nd lord joins Gulika, or sits in an unfriendly/"
                "debilitated Navamsa with malefics — an unattractive face and "
                "an irritable temper.",
    })
    catalog.append({
        "key": "bhojana_soukhya", "name": "Bhojana Soukhya Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and _amsa_grade(l2, P[l2].longitude) == "vaiseshikamsa"
            and ("jupiter" in chart.aspects_to(P[l2].house) or "venus" in chart.aspects_to(P[l2].house))
        ),
        "text": "A 2nd lord in Vaiseshikamsa is aspected by Jupiter or Venus "
                "— wealth and always good, delicious food.",
    })
    catalog.append({
        "key": "annadana", "name": "Annadana Yoga", "polarity": "benefic",
        "present": bool(
            l2 and l2 in P and _amsa_grade(l2, P[l2].longitude) == "vaiseshikamsa"
            and "jupiter" in P and "mercury" in P
            and (P[l2].house == P["jupiter"].house or "jupiter" in chart.aspects_to(P[l2].house))
            and (P[l2].house == P["mercury"].house or "mercury" in chart.aspects_to(P[l2].house))
        ),
        "text": "A 2nd lord in Vaiseshikamsa joins or is aspected by Jupiter "
                "and Mercury — a hospitable nature, feeding many people.",
    })
    catalog.append({
        "key": "parannabhojana", "name": "Parannabhojana Yoga", "polarity": "caution",
        "present": bool(
            l2 and l2 in P and (P[l2].dignity == "debilitated" or _navamsa_dignity(P[l2]) == "enemy")
            and any(k in DIGNITY_PLANETS and pf.dignity == "debilitated" and k in chart.aspects_to(P[l2].house) for k, pf in P.items())
        ),
        "text": "The 2nd lord is debilitated or in an unfriendly Navamsa, "
                "aspected by a debilitated planet — living on food doled out "
                "by others.",
    })
    catalog.append({
        "key": "sraddhannabhuktha", "name": "Sraddhannabhuktha Yoga", "polarity": "caution",
        "present": bool(
            l2 == "saturn"
            or (l2 and l2 in P and "saturn" in P and P[l2].house == P["saturn"].house)
            or ("saturn" in P and P["saturn"].dignity == "debilitated" and "saturn" in chart.aspects_to(2))
        ),
        "text": "Saturn owns or joins the 2nd lord, or the 2nd is aspected by "
                "a debilitated Saturn — food from death ceremonies.",
    })
    catalog.append({
        "key": "sarpaganda_163", "name": "Sarpaganda Yoga", "polarity": "caution",
        "present": bool("rahu" in P and P["rahu"].house == 2 and chart.mandi_house == 2),
        "text": "Rahu joins Mandi in the 2nd house — bitten by a snake.",
    })
    catalog.append({
        "key": "vakchalana", "name": "Vakchalana Yoga", "polarity": "caution",
        "present": bool(
            l2 and l2 in NATURAL_MALEFICS and l2 in P and _navamsa_dignity(P[l2]) in {"enemy", "debilitated"}
            and not any(b in P and P[b].house == P[l2].house for b in NATURAL_BENEFICS)
            and not any(b in chart.aspects_to(P[l2].house) for b in NATURAL_BENEFICS)
        ),
        "text": "A malefic 2nd lord in a cruel Navamsa, without any benefic "
                "association — becomes a stammerer.",
    })
    catalog.append({
        "key": "vishaprayoga", "name": "Vishaprayoga Yoga", "polarity": "caution",
        "present": bool(
            any(k in NATURAL_MALEFICS and pf.house == 2 for k, pf in P.items())
            and any(k in chart.aspects_to(2) for k in NATURAL_MALEFICS)
            and l2 and l2 in P and _navamsa_dignity(P[l2]) in {"enemy", "debilitated"}
            and any(k in chart.aspects_to(P[l2].house) for k in NATURAL_MALEFICS)
        ),
        "text": "The 2nd house is joined and aspected by malefics while its "
                "lord sits in a cruel Navamsa aspected by a malefic — poisoned "
                "by others.",
    })
    catalog.append({
        "key": "bhratruvriddhi", "name": "Bhratruvriddhi Yoga", "polarity": "benefic",
        "present": bool(
            (l3 and l3 in P and (any(b in P and P[b].house == P[l3].house for b in NATURAL_BENEFICS) or any(b in chart.aspects_to(P[l3].house) for b in NATURAL_BENEFICS)))
            or ("mars" in P and (any(b in P and P[b].house == P["mars"].house for b in NATURAL_BENEFICS) or any(b in chart.aspects_to(P["mars"].house) for b in NATURAL_BENEFICS)))
            or any(b in P and P[b].house == 3 for b in NATURAL_BENEFICS)
        ),
        "text": "The 3rd lord, Mars, or the 3rd house is joined or aspected "
                "by benefics — happiness through prosperous brothers.",
    })
    catalog.append({
        "key": "sodaranasa", "name": "Sodaranasa Yoga", "polarity": "caution",
        "present": bool(
            "mars" in P and l3 and l3 in P and P["mars"].house == P[l3].house and P["mars"].house in {3, 5, 7, 8}
            and any(k in chart.aspects_to(P["mars"].house) for k in NATURAL_MALEFICS)
        ),
        "text": "Mars and the 3rd lord occupy the 8th (or 3rd/5th/7th), "
                "aspected by malefics — loss of almost all siblings.",
    })
    catalog.append({
        "key": "ekabhagini", "name": "Ekabhagini Yoga", "polarity": "mixed",
        "present": bool(
            "mercury" in P and P["mercury"].house == 3
            and l3 and l3 in P and "moon" in P and P[l3].house == P["moon"].house
            and "mars" in P and "saturn" in P and P["mars"].house == P["saturn"].house
        ),
        "text": "Mercury, the 3rd lord and Mars join the 3rd house, the Moon "
                "and Saturn respectively — only one sister.",
    })
    catalog.append({
        "key": "dwadasa_sahodara", "name": "Dwadasa Sahodara Yoga", "polarity": "benefic",
        "present": bool(
            l3 and l3 in P and P[l3].house in KENDRA
            and "mars" in P and P["mars"].dignity == "exalted"
            and "jupiter" in P and P["mars"].house == P["jupiter"].house
            and house_from(P["mars"].sign, P[l3].sign) in TRIKONA
        ),
        "text": "The 3rd lord in a kendra with exalted Mars joining Jupiter "
                "in a trine from it — third of twelve siblings.",
    })
    catalog.append({
        "key": "sapthasankhya_sahodara", "name": "Sapthasankhya Sahodara Yoga", "polarity": "benefic",
        "present": bool(
            l12 and l12 in P and "mars" in P and P[l12].house == P["mars"].house
            and "moon" in P and "jupiter" in P and P["moon"].house == 3 and P["jupiter"].house == 3
            and not ("venus" in P and (P["venus"].house == 3 or "venus" in chart.aspects_to(3)))
        ),
        "text": "The 12th lord joins Mars while the Moon and Jupiter share "
                "the 3rd, free of Venus — seven brothers.",
    })
    catalog.append({
        "key": "parakrama", "name": "Parakrama Yoga", "polarity": "benefic",
        "present": bool(
            l3 and l3 in P and _navamsa_dignity(P[l3]) in {"own", "exalted", "friend"}
            and (any(b in P and P[b].house == P[l3].house for b in NATURAL_BENEFICS) or any(b in chart.aspects_to(P[l3].house) for b in NATURAL_BENEFICS))
            and "mars" in P and SIGN_LORD[P["mars"].sign] in NATURAL_BENEFICS
        ),
        "text": "The 3rd lord in a benefic Navamsa, linked to benefics, with "
                "Mars in a benefic sign — much courage.",
    })
    yuddha_praveena_present = False
    if l3 and l3 in P:
        _ynl = SIGN_LORD[P[l3].navamsa]
        if _ynl in P:
            _ynl2 = SIGN_LORD[P[_ynl].navamsa]
            yuddha_praveena_present = bool(_ynl2 in P and P[_ynl2].dignity in {"own", "exalted"})
    catalog.append({
        "key": "yuddha_praveena", "name": "Yuddha Praveena Yoga", "polarity": "benefic",
        "present": yuddha_praveena_present,
        "text": "The chain of Navamsa lords from the 3rd lord resolves to a "
                "dignified planet — a capable strategist, expert in warfare.",
    })
    catalog.append({
        "key": "yuddhatpoorvadridhachitta", "name": "Yuddhatpoorvadridhachitta Yoga", "polarity": "mixed",
        "present": bool(
            l3 and l3 in P and P[l3].dignity == "exalted"
            and (P[l3].sign in MOVABLE_SIGNS or P[l3].navamsa in MOVABLE_SIGNS)
            and any(k in NATURAL_MALEFICS and pf.house == P[l3].house for k, pf in P.items())
        ),
        "text": "The exalted 3rd lord joins malefics in a movable sign or "
                "Navamsa — courageous before the fight begins.",
    })
    catalog.append({
        "key": "yuddhatpaschaddrudha", "name": "Yuddhatpaschaddrudha Yoga", "polarity": "mixed",
        "present": bool(
            l3 and l3 in P and P[l3].sign in FIXED_SIGNS and P[l3].navamsa in FIXED_SIGNS
            and SIGN_LORD[P[l3].sign] in P and P[SIGN_LORD[P[l3].sign]].dignity == "debilitated"
        ),
        "text": "The 3rd lord in a fixed sign and Navamsa, whose sign lord is "
                "debilitated — courage grows once the fight has begun.",
    })
    catalog.append({
        "key": "satkathadisravana", "name": "Satkathadisravana Yoga", "polarity": "benefic",
        "present": bool(
            SIGN_LORD[third_sign_ref] in NATURAL_BENEFICS and any(b in chart.aspects_to(3) for b in NATURAL_BENEFICS)
            and l3 and l3 in P and _navamsa_dignity(P[l3]) in {"own", "exalted", "friend"}
        ),
        "text": "The 3rd house is a benefic sign aspected by benefics, with "
                "the 3rd lord in a benefic Navamsa — a love of fine literature "
                "and religious discourse.",
    })
    catalog.append({
        "key": "uttama_griha", "name": "Uttama Griha Yoga", "polarity": "benefic",
        "present": bool(l4 and l4 in P and P[l4].house in (KENDRA | TRIKONA) and any(b in P and P[b].house == P[l4].house for b in NATURAL_BENEFICS)),
        "text": "The 4th lord joins benefics in a kendra or trikona — good "
                "houses.",
    })
    catalog.append({
        "key": "vichitra_saudha_prakara", "name": "Vichitra Saudha Prakara Yoga", "polarity": "benefic",
        "present": bool(
            l4 and l10 and l4 in P and l10 in P and "saturn" in P and "mars" in P
            and P[l4].house == P[l10].house == P["saturn"].house == P["mars"].house
        ),
        "text": "The 4th and 10th lords conjoin with Saturn and Mars — "
                "innumerable mansions.",
    })
    catalog.append({
        "key": "ayatna_griha_prapta_1", "name": "Ayatna Griha Prapta Yoga (I)", "polarity": "benefic",
        "present": bool(
            lagnesh_pf and l7 and l7 in P and lagnesh_pf.house in {1, 4} and P[l7].house in {1, 4}
            and (any(b in chart.aspects_to(lagnesh_pf.house) for b in NATURAL_BENEFICS) or any(b in chart.aspects_to(P[l7].house) for b in NATURAL_BENEFICS))
        ),
        "text": "The lagna and 7th lords occupy the Lagna or 4th, aspected by "
                "benefics — substantial house property with little effort.",
    })
    catalog.append({
        "key": "ayatna_griha_prapta_2", "name": "Ayatna Griha Prapta Yoga (II)", "polarity": "benefic",
        "present": bool(l9 and l9 in P and P[l9].house in KENDRA and l4 and l4 in P and P[l4].dignity in {"exalted", "moolatrikona", "own"}),
        "text": "The 9th lord in a kendra with the 4th lord exalted, in "
                "Moolatrikona or own house — house property with little "
                "effort.",
    })
    catalog.append({
        "key": "grihanasa_1", "name": "Grihanasa Yoga (I)", "polarity": "caution",
        "present": bool(l4 and l4 in P and P[l4].house == 12 and any(k in chart.aspects_to(12) for k in NATURAL_MALEFICS)),
        "text": "The 4th lord in the 12th, aspected by a malefic — loses all "
                "house property.",
    })
    catalog.append({
        "key": "grihanasa_2", "name": "Grihanasa Yoga (II)", "polarity": "caution",
        "present": bool(l4 and l4 in P and SIGN_LORD[P[l4].navamsa] in P and P[SIGN_LORD[P[l4].navamsa]].house == 12),
        "text": "The Navamsa lord of the 4th lord's sign is disposed in the "
                "12th — loses all house property.",
    })
    catalog.append({
        "key": "bandhu_pujya_1", "name": "Bandhu Pujya Yoga (I)", "polarity": "benefic",
        "present": bool(
            l4 and l4 in NATURAL_BENEFICS and l4 in P
            and any(b != l4 and b in chart.aspects_to(P[l4].house) for b in NATURAL_BENEFICS)
            and "mercury" in P and P["mercury"].house == 1
        ),
        "text": "A benefic 4th lord is aspected by another benefic while "
                "Mercury sits in the Lagna — respected by relatives and "
                "friends.",
    })
    catalog.append({
        "key": "bandhu_pujya_2", "name": "Bandhu Pujya Yoga (II)", "polarity": "benefic",
        "present": bool(
            ("jupiter" in P and P["jupiter"].house == 4) or "jupiter" in chart.aspects_to(4)
            or (l4 and l4 in P and "jupiter" in P and P[l4].house == P["jupiter"].house)
        ),
        "text": "The 4th house or its lord has the association or aspect of "
                "Jupiter — respected and loved by relatives and friends.",
    })
    catalog.append({
        "key": "bandhubhisthyaktha", "name": "Bandhubhisthyaktha Yoga", "polarity": "caution",
        "present": bool(
            l4 and l4 in P and (
                any(k in NATURAL_MALEFICS and pf.house == P[l4].house for k, pf in P.items())
                or P[l4].dignity in {"enemy", "debilitated"}
            )
        ),
        "text": "The 4th lord is associated with malefics or sits in an "
                "inimical/debilitated sign — deserted by relatives.",
    })
    catalog.append({
        "key": "matrudeerghayur_1", "name": "Matrudeerghayur Yoga (I)", "polarity": "benefic",
        "present": bool(
            any(b in P and P[b].house == 4 for b in NATURAL_BENEFICS)
            and l4 and l4 in P and P[l4].dignity == "exalted"
            and "moon" in P and P["moon"].dignity in {"own", "exalted", "moolatrikona", "friend"}
        ),
        "text": "A benefic occupies the 4th, the 4th lord is exalted, and "
                "the Moon is strong — the mother lives long.",
    })
    matrudeerghayur_2_present = False
    if l4 and l4 in P:
        _mnl = SIGN_LORD[P[l4].navamsa]
        if _mnl in P:
            matrudeerghayur_2_present = bool(
                P[_mnl].dignity in {"own", "exalted", "moolatrikona", "friend"}
                and P[_mnl].house in KENDRA
                and house_from(P[_mnl].sign, moon_sign) in KENDRA
            )
    catalog.append({
        "key": "matrudeerghayur_2", "name": "Matrudeerghayur Yoga (II)", "polarity": "benefic",
        "present": matrudeerghayur_2_present,
        "text": "The Navamsa lord of the 4th lord's sign is strong and holds "
                "an angle from both the Lagna and the Moon — the mother lives "
                "long.",
    })
    catalog.append({
        "key": "matrunasa_1", "name": "Matrunasa Yoga (I)", "polarity": "caution",
        "present": bool(
            "moon" in P and (
                any(k in NATURAL_MALEFICS and pf.house == P["moon"].house for k, pf in P.items())
                or any(k in chart.aspects_to(P["moon"].house) for k in NATURAL_MALEFICS)
                or _hemmed_by_malefics(P["moon"])
            )
        ),
        "text": "The Moon is hemmed in between, joined by, or aspected by "
                "malefics — a very early death of the mother.",
    })
    matrunasa_2_present = False
    if l4 and l4 in P:
        _mnl2 = SIGN_LORD[P[l4].navamsa]
        if _mnl2 in P:
            _mnl3 = SIGN_LORD[P[_mnl2].navamsa]
            matrunasa_2_present = bool(_mnl3 in P and P[_mnl3].house in DUSTHANA)
    catalog.append({
        "key": "matrunasa_2", "name": "Matrunasa Yoga (II)", "polarity": "caution",
        "present": matrunasa_2_present,
        "text": "The chain of Navamsa lords from the 4th lord resolves to a "
                "planet in a dusthana — a very early death of the mother.",
    })
    catalog.append({
        "key": "matrugami", "name": "Matrugami Yoga", "polarity": "caution",
        "present": bool(
            (
                ("moon" in P and P["moon"].house in KENDRA and (any(k in NATURAL_MALEFICS and pf.house == P["moon"].house for k, pf in P.items()) or any(k in chart.aspects_to(P["moon"].house) for k in NATURAL_MALEFICS)))
                or ("venus" in P and P["venus"].house in KENDRA and (any(k in NATURAL_MALEFICS and pf.house == P["venus"].house for k, pf in P.items()) or any(k in chart.aspects_to(P["venus"].house) for k in NATURAL_MALEFICS)))
            )
            and any(k in NATURAL_MALEFICS and pf.house == 4 for k, pf in P.items())
        ),
        "text": "The Moon or Venus joins an angle with or aspected by a "
                "malefic, while an evil planet occupies the 4th — classically "
                "linked to a serious lapse of moral conscience.",
    })

    # ── Combinations #201–300 ────────────────────────────────────────────────
    fifth_sign_ref = (lagna_sign + 4) % 12
    fourth_sign_ref = (lagna_sign + 3) % 12

    catalog.append({
        "key": "sahodareesangama", "name": "Sahodareesangama Yoga", "polarity": "caution",
        "present": bool(
            l7 and l7 in P and "venus" in P and P[l7].house == 4 and P["venus"].house == 4
            and any(k in NATURAL_MALEFICS and (pf.house == 4 or k in chart.aspects_to(4)) for k, pf in P.items())
        ),
        "text": "The 7th lord and Venus conjoin in the 4th, afflicted by malefics "
                "— classically a caution yoga associated with severe moral "
                "transgression.",
    })
    catalog.append({
        "key": "kapata_1", "name": "Kapata Yoga (I)", "polarity": "caution",
        "present": bool(
            any(k in NATURAL_MALEFICS and pf.house == 4 for k, pf in P.items())
            and l4 and l4 in P
            and any(k in NATURAL_MALEFICS and (pf.house == P[l4].house or k in chart.aspects_to(P[l4].house)) for k, pf in P.items())
        ),
        "text": "The 4th house is joined by a malefic while the 4th lord is "
                "afflicted by malefics — a Kapata yoga for a hypocritical "
                "streak.",
    })
    catalog.append({
        "key": "kapata_2", "name": "Kapata Yoga (II)", "polarity": "caution",
        "present": bool(
            all(k in P and P[k].house == 4 for k in ("saturn", "mars", "rahu"))
            and l10 and l10 in P and l10 in NATURAL_MALEFICS
            and any(k in chart.aspects_to(P[l10].house) for k in NATURAL_MALEFICS)
        ),
        "text": "Saturn, Mars and Rahu crowd the 4th with a malefic 10th lord "
                "aspected by malefics — a Kapata yoga for hypocrisy.",
    })
    catalog.append({
        "key": "kapata_3", "name": "Kapata Yoga (III)", "polarity": "caution",
        "present": bool(
            l4 and l4 in P and "saturn" in P and "rahu" in P
            and P[l4].house == P["saturn"].house == P["rahu"].house == chart.mandi_house
            and any(k in chart.aspects_to(P[l4].house) for k in NATURAL_MALEFICS)
        ),
        "text": "The 4th lord joins Saturn, Mandi and Rahu, aspected by malefics — "
                "a Kapata yoga for hypocrisy.",
    })
    catalog.append({
        "key": "nishkapata_1", "name": "Nishkapata Yoga (I)", "polarity": "benefic",
        "present": bool(
            any(k in NATURAL_BENEFICS and pf.house == 4 for k, pf in P.items())
            or any(k in DIGNITY_PLANETS and pf.house == 4 and pf.dignity in {"own", "exalted", "friend"} for k, pf in P.items())
            or SIGN_LORD[fourth_sign_ref] in NATURAL_BENEFICS
        ),
        "text": "The 4th house is occupied by a benefic, a dignified planet, or "
                "is itself a benefic sign — a Nishkapata yoga for a pure heart "
                "that hates secrecy and hypocrisy.",
    })
    catalog.append({
        "key": "nishkapata_2", "name": "Nishkapata Yoga (II)", "polarity": "benefic",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house == 4
            and any((b in P and P[b].house == 4) or b in chart.aspects_to(4) for b in NATURAL_BENEFICS)
        ),
        "text": "The lagna lord joins the 4th house with or aspected by a "
                "benefic — a Nishkapata yoga for a pure heart that hates "
                "secrecy and hypocrisy.",
    })
    catalog.append({
        "key": "matru_satrutwa", "name": "Matru Satrutwa Yoga", "polarity": "caution",
        # BPHS explicitly allows either natural OR temporal enmity.
        "present": bool(
            lagnesh and l4 and (
                l4 in ENEMIES.get(lagnesh, set()) or lagnesh in ENEMIES.get(l4, set())
                or _compound_enemy_or_worse(lagnesh, l4, P) or _compound_enemy_or_worse(l4, lagnesh, P)
            )
        ),
        "text": "The lagna and 4th lords are natural or temporal enemies — "
                "ill feeling between mother and son.",
    })
    catalog.append({
        "key": "matru_sneha", "name": "Matru Sneha Yoga", "polarity": "benefic",
        # BPHS explicitly allows either natural OR temporal friendship.
        "present": bool(
            lagnesh and l4 and (
                lagnesh == l4 or l4 in FRIENDS.get(lagnesh, set()) or lagnesh in FRIENDS.get(l4, set())
                or _compound_friend_or_better(lagnesh, l4, P) or _compound_friend_or_better(l4, lagnesh, P)
                or (l4 in P and any(b in chart.aspects_to(P[l4].house) for b in NATURAL_BENEFICS))
            )
        ),
        "text": "The lagna and 4th lords share lordship, are natural or "
                "temporal friends, or the 4th is aspected by a benefic — "
                "cordial relations between mother and son.",
    })
    catalog.append({
        "key": "vahana_1", "name": "Vahana Yoga (I)", "polarity": "benefic",
        "present": bool(lagnesh_pf and lagnesh_pf.house in {4, 9, 11}),
        "text": "The lagna lord joins the 4th, 9th, or 11th house — material "
                "comforts and conveyances.",
    })
    vahana_2_present = False
    if l4 and l4 in P and P[l4].dignity == "exalted" and l4 in EXALT_SIGN:
        _exalt_lord = SIGN_LORD[EXALT_SIGN[l4]]
        vahana_2_present = bool(_exalt_lord in P and P[_exalt_lord].house in (KENDRA | TRIKONA))
    catalog.append({
        "key": "vahana_2", "name": "Vahana Yoga (II)", "polarity": "benefic",
        "present": vahana_2_present,
        "text": "The 4th lord is exalted while its exaltation sign's lord "
                "holds an angle or trine — material comforts and conveyances.",
    })
    catalog.append({
        "key": "anapathya", "name": "Anapathya Yoga", "polarity": "caution",
        "present": bool(
            _is_weak(P.get("jupiter")) and _is_weak(lagnesh_pf)
            and _is_weak(P.get(l7) if l7 else None) and _is_weak(P.get(l5) if l5 else None)
        ),
        "text": "Jupiter and the lords of the Lagna, 7th and 5th are all weak "
                "— a caution yoga for childlessness or loss of children.",
    })
    catalog.append({
        "key": "sarpasapa_1", "name": "Sarpasapa Yoga (I)", "polarity": "caution",
        "present": bool(
            "rahu" in P and P["rahu"].house == 5
            and ("mars" in chart.aspects_to(5) or fifth_sign_ref in {0, 7})
        ),
        "text": "Rahu in the 5th, aspected by Mars or in a Mars sign — "
                "classically linked to loss of children (\"serpent's curse\").",
    })
    catalog.append({
        "key": "sarpasapa_2", "name": "Sarpasapa Yoga (II)", "polarity": "caution",
        "present": bool(
            l5 and l5 in P and "rahu" in P and P[l5].house == P["rahu"].house
            and "saturn" in P and P["saturn"].house == 5
            and "moon" in P and (P["moon"].house == 5 or "moon" in chart.aspects_to(5))
        ),
        "text": "The 5th lord joins Rahu while Saturn in the 5th is joined or "
                "aspected by the Moon — classically linked to loss of children.",
    })
    catalog.append({
        "key": "sarpasapa_3", "name": "Sarpasapa Yoga (III)", "polarity": "caution",
        "present": bool(
            "jupiter" in P and "mars" in P and P["jupiter"].house == P["mars"].house
            and "rahu" in P and P["rahu"].house == 1
            and l5 and l5 in P and P[l5].house in DUSTHANA
        ),
        "text": "Jupiter joins Mars, Rahu occupies the Lagna, and the 5th lord "
                "sits in a dusthana — classically linked to loss of children.",
    })
    catalog.append({
        "key": "sarpasapa_4", "name": "Sarpasapa Yoga (IV)", "polarity": "caution",
        "present": bool(
            fifth_sign_ref in {0, 7} and "rahu" in P and P["rahu"].house == 5
            and "mercury" in P and (P["mercury"].house == 5 or "mercury" in chart.aspects_to(5))
        ),
        "text": "The 5th (a Mars sign) is joined by Rahu and linked to Mercury "
                "— classically linked to loss of children.",
    })
    catalog.append({
        "key": "pitrusapa_sutakshaya", "name": "Pitrusapa Sutakshaya Yoga", "polarity": "caution",
        "present": bool(
            "sun" in P and P["sun"].house == 5
            and (fifth_sign_ref == 6 or fifth_sign_ref in {9, 10} or _hemmed_by_malefics(P["sun"]))
        ),
        "text": "The Sun in the 5th sits debilitated or hemmed by malefics — "
                "classically linked to loss of issue through the father's "
                "wrath.",
    })
    catalog.append({
        "key": "matrusapa_sutakshaya", "name": "Matrusapa Sutakshaya Yoga", "polarity": "caution",
        "present": bool(
            l8 and l5 and l8 in P and l5 in P and P[l8].house == 5 and P[l5].house == 8
            and "moon" in P and P["moon"].house == 6 and l4 and l4 in P and P[l4].house == 6
        ),
        "text": "The 8th and 5th lords exchange places while the Moon and 4th "
                "lord join the 6th — classically linked to loss of children "
                "through the mother's curse.",
    })
    catalog.append({
        "key": "bhratrusapa_sutakshaya", "name": "Bhratrusapa Sutakshaya Yoga", "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house == 8 and l5 and l5 in P and P[l5].house == 8
            and l3 and l3 in P and "mars" in P and "rahu" in P
            and P[l3].house == P["mars"].house == P["rahu"].house == 5
        ),
        "text": "The lagna and 5th lords join the 8th while the 3rd lord "
                "combines with Mars and Rahu in the 5th — classically linked "
                "to loss of children through a brother's curse.",
    })
    catalog.append({
        "key": "pretasapa", "name": "Pretasapa Yoga", "polarity": "caution",
        "present": bool(
            "sun" in P and "saturn" in P and P["sun"].house == 5 and P["saturn"].house == 5
            and "moon" in P and P["moon"].house == 7 and P["moon"].dignity in {"enemy", "debilitated"}
            and "rahu" in P and P["rahu"].house == 1
            and "jupiter" in P and P["jupiter"].house == 12
        ),
        "text": "Sun and Saturn in the 5th, a weak Moon in the 7th, Rahu in "
                "the Lagna and Jupiter in the 12th — classically linked to "
                "loss of children through ancestral curses.",
    })
    catalog.append({
        "key": "bahuputra_1", "name": "Bahuputra Yoga (I)", "polarity": "benefic",
        "present": bool("rahu" in P and P["rahu"].house == 5 and SIGN_LORD[P["rahu"].navamsa] != "saturn"),
        "text": "Rahu occupies the 5th in a Navamsa other than Saturn's — a "
                "large number of children.",
    })
    bahuputra_2_present = False
    if l7 and l7 in P:
        for _k, _pf in P.items():
            if _k == l7:
                continue
            if _pf.house == P[l7].house or _k in chart.aspects_to(P[l7].house):
                _nl = SIGN_LORD[_pf.navamsa]
                if _nl in P and P[_nl].house in {1, 2, 5}:
                    bahuputra_2_present = True
                    break
    catalog.append({
        "key": "bahuputra_2", "name": "Bahuputra Yoga (II)", "polarity": "benefic",
        "present": bahuputra_2_present,
        "text": "The Navamsa lord of a planet linked to the 7th lord sits in "
                "the 1st, 2nd or 5th — a large number of children.",
    })
    catalog.append({
        "key": "dattaputra_1", "name": "Dattaputra Yoga (I)", "polarity": "mixed",
        "present": bool(
            "mars" in P and "saturn" in P and P["mars"].house == 5 and P["saturn"].house == 5
            and lagnesh_pf and lagnesh_pf.sign in {2, 5}
            and "mercury" in P and (P["mercury"].house == lagnesh_pf.house or "mercury" in chart.aspects_to(lagnesh_pf.house))
        ),
        "text": "Mars and Saturn in the 5th with the lagna lord in a Mercury "
                "sign linked to Mercury — adopting children.",
    })
    catalog.append({
        "key": "dattaputra_2", "name": "Dattaputra Yoga (II)", "polarity": "mixed",
        "present": bool(
            l7 and l7 in P and P[l7].house == 11
            and l5 and l5 in P and any(b in P and P[b].house == P[l5].house for b in NATURAL_BENEFICS)
            and any(k in P and P[k].house == 5 for k in ("mars", "saturn"))
        ),
        "text": "The 7th lord in the 11th, a benefic-joined 5th lord, and "
                "Mars or Saturn in the 5th — adopting children.",
    })
    catalog.append({
        "key": "aputra", "name": "Aputra Yoga", "polarity": "caution",
        "present": bool(l5 and l5 in P and P[l5].house in DUSTHANA),
        "text": "The 5th lord sits in a dusthana — no issues at all.",
    })
    catalog.append({
        "key": "ekaputra", "name": "Ekaputra Yoga", "polarity": "benefic",
        "present": bool(l5 and l5 in P and P[l5].house in (KENDRA | TRIKONA)),
        "text": "The 5th lord joins an angle or trine — only one son.",
    })
    catalog.append({
        "key": "satputra", "name": "Satputra Yoga", "polarity": "benefic",
        "present": bool(l5 == "jupiter" and "sun" in P and P["sun"].dignity in {"own", "exalted", "friend", "moolatrikona"}),
        "text": "Jupiter rules the 5th while the Sun is favourably placed — a "
                "worthy, dutiful son.",
    })
    catalog.append({
        "key": "kalanirdesat_putra_1", "name": "Kalanirdesat Putra Yoga (I)", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 5
            and l5 and l5 in P and "venus" in P and P[l5].house == P["venus"].house
        ),
        "text": "Jupiter in the 5th with the 5th lord joined to Venus — "
                "begets a son in the 32nd or 33rd year.",
    })
    catalog.append({
        "key": "kalanirdesat_putra_2", "name": "Kalanirdesat Putra Yoga (II)", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and house_from(P["jupiter"].sign, lagna_sign) == 9
            and "venus" in P and house_from(P["venus"].sign, P["jupiter"].sign) == 9
            and lagnesh_pf and P["venus"].house == lagnesh_pf.house
        ),
        "text": "Jupiter 9th from Lagna, Venus 9th from Jupiter joined by the "
                "lagna lord — begets a son in the 40th year.",
    })
    catalog.append({
        "key": "kalanirdesat_putranasa_1", "name": "Kalanirdesat Putranasa Yoga (I)", "polarity": "caution",
        "present": bool(
            "rahu" in P and P["rahu"].house == 5
            and l5 and l5 in P and any(k in NATURAL_MALEFICS and pf.house == P[l5].house for k, pf in P.items())
            and "jupiter" in P and P["jupiter"].dignity == "debilitated"
        ),
        "text": "Rahu in the 5th, an afflicted 5th lord and debilitated "
                "Jupiter — loss of issues around the 32nd year.",
    })
    catalog.append({
        "key": "kalanirdesat_putranasa_2", "name": "Kalanirdesat Putranasa Yoga (II)", "polarity": "caution",
        "present": bool(
            "jupiter" in P
            and any(k in NATURAL_MALEFICS and house_from(pf.sign, P["jupiter"].sign) == 5 for k, pf in P.items())
            and any(k in NATURAL_MALEFICS and house_from(pf.sign, lagna_sign) == 5 for k, pf in P.items())
        ),
        "text": "Malefics disposed 5th from both Jupiter and the Lagna — "
                "loss of issues around the 40th year.",
    })
    catalog.append({
        "key": "buddhimaturya", "name": "Buddhimaturya Yoga", "polarity": "benefic",
        "present": bool(
            l5 and l5 in NATURAL_BENEFICS and l5 in P
            and (any(b != l5 and b in chart.aspects_to(P[l5].house) for b in NATURAL_BENEFICS) or SIGN_LORD[P[l5].sign] in NATURAL_BENEFICS)
        ),
        "text": "A benefic 5th lord is aspected by another benefic, or sits "
                "in a benefic sign — great intelligence and character.",
    })
    theevrabuddhi_present = False
    if l5 and l5 in P and l5 in NATURAL_BENEFICS:
        _nl2 = SIGN_LORD[P[l5].navamsa]
        if _nl2 in P:
            theevrabuddhi_present = any(b in chart.aspects_to(P[_nl2].house) for b in NATURAL_BENEFICS)
    catalog.append({
        "key": "theevrabuddhi", "name": "Theevrabuddhi Yoga", "polarity": "benefic",
        "present": theevrabuddhi_present,
        "text": "The Navamsa lord of a benefic 5th lord's sign is aspected by "
                "benefics — precocious, genius-level intelligence.",
    })
    catalog.append({
        "key": "buddhi_jada", "name": "Buddhi Jada Yoga", "polarity": "caution",
        "present": bool(
            lagnesh_pf
            and any(k in NATURAL_MALEFICS and (pf.house == lagnesh_pf.house or k in chart.aspects_to(lagnesh_pf.house)) for k, pf in P.items())
            and "saturn" in P and P["saturn"].house == 5
            and "saturn" in chart.aspects_to(lagnesh_pf.house)
        ),
        "text": "The lagna lord is afflicted by malefics while Saturn in the "
                "5th also aspects it — a dunce, mentally dull.",
    })
    catalog.append({
        "key": "thrikalagnana", "name": "Thrikalagnana Yoga", "polarity": "benefic",
        "present": bool(
            "jupiter" in P
            and (P["jupiter"].vargottama or _navamsa_dignity(P["jupiter"]) in {"own", "exalted"})
            and any(b in chart.aspects_to(P["jupiter"].house) for b in NATURAL_BENEFICS)
        ),
        "text": "Jupiter is Vargottama or dignified in Navamsa, aspected by a "
                "benefic — intuitive insight into past, present and future.",
    })
    catalog.append({
        "key": "putra_sukha", "name": "Putra Sukha Yoga", "polarity": "benefic",
        "present": bool(
            any(b in P and P[b].house == 5 for b in NATURAL_BENEFICS)
            or (l5 and l5 in P and P[l5].dignity in {"own", "exalted", "moolatrikona", "friend"} and any(b in chart.aspects_to(P[l5].house) for b in NATURAL_BENEFICS))
        ),
        "text": "Benefics occupy the 5th, or a strong 5th lord is aspected by "
                "benefics — immense happiness from children.",
    })
    catalog.append({
        "key": "jara", "name": "Jara Yoga", "polarity": "caution",
        "present": bool(
            l7 and l4 and l7 in P and l4 in P and P[l7].house == 4 and P[l4].house == 7
            and any(k in chart.aspects_to(4) for k in NATURAL_MALEFICS)
        ),
        "text": "The 7th and 4th lords exchange houses, afflicted by malefics "
                "— connections with multiple partners.",
    })
    catalog.append({
        "key": "jarajaputra", "name": "Jarajaputra Yoga", "polarity": "caution",
        "present": bool(l5 and l5 in P and "venus" in P and P[l5].house == P["venus"].house and "moon" in P and P["moon"].house == 5),
        "text": "The 5th lord joins Venus while the Moon occupies the 5th — "
                "classically linked to an heir from outside the marriage if "
                "the native is impotent.",
    })
    catalog.append({
        "key": "bahu_stree", "name": "Bahu Stree Yoga", "polarity": "mixed",
        "present": bool(l7 and l7 in P and P[l7].dignity in {"own", "exalted"} and "venus" in P and P["venus"].house == P[l7].house),
        "text": "The 7th lord is dignified and joined by Venus — many "
                "partners or female associations.",
    })
    catalog.append({
        "key": "satkalatra", "name": "Satkalatra Yoga", "polarity": "benefic",
        "present": bool(_linked(l7, ("jupiter", "mercury")) or _linked("venus", ("jupiter", "mercury"))),
        "text": "The 7th lord or Venus links to Jupiter or Mercury — a "
                "noble, chaste and virtuous spouse.",
    })
    catalog.append({
        "key": "bhaga_chumbana", "name": "Bhaga Chumbana Yoga", "polarity": "caution",
        "present": bool(
            (l7 and l7 in P and P[l7].house == 4 and "venus" in P and P["venus"].house == 4)
            or (lagnesh_pf and (lagnesh_pf.dignity == "debilitated" or _navamsa_dignity(lagnesh_pf) == "debilitated"))
        ),
        "text": "The 7th lord joins Venus in the 4th, or the lagna lord is "
                "debilitated — indulgence in sensual pleasures.",
    })
    catalog.append({
        "key": "bhagya", "name": "Bhagya Yoga", "polarity": "benefic",
        "present": bool(
            any(
                b in P and P[b].house in {1, 3, 5} and P[b].dignity in {"own", "exalted", "moolatrikona", "friend"}
                and b in chart.aspects_to(9)
                for b in NATURAL_BENEFICS
            )
        ),
        "text": "A strong benefic in the Lagna, 3rd or 5th aspects the 9th — "
                "extremely fortunate, pleasure-loving and rich.",
    })
    catalog.append({
        "key": "jananatpurvam_pitru_marana", "name": "Jananatpurvam Pitru Marana Yoga", "polarity": "caution",
        "present": bool(
            "sun" in P and P["sun"].house in DUSTHANA
            and l8 and l8 in P and P[l8].house == 9
            and l12 and l12 in P and P[l12].house == 1
            and l6 and l6 in P and P[l6].house == 5
        ),
        "text": "The Sun in a dusthana with the 8th lord in the 9th, the "
                "12th lord in the Lagna, and the 6th lord in the 5th — a "
                "posthumous child.",
    })
    catalog.append({
        "key": "dhatrutwa", "name": "Dhatrutwa Yoga", "polarity": "benefic",
        "present": bool(
            l9 and l9 in P and P[l9].dignity == "exalted"
            and any(b in chart.aspects_to(P[l9].house) for b in NATURAL_BENEFICS)
            and any(b in P and P[b].house == 9 for b in NATURAL_BENEFICS)
        ),
        "text": "The exalted 9th lord is aspected by a benefic while another "
                "benefic occupies the 9th — highly charitable and "
                "humanitarian.",
    })
    catalog.append({
        "key": "apakeerti", "name": "Apakeerti Yoga", "polarity": "caution",
        "present": bool(
            "sun" in P and "saturn" in P and P["sun"].house == 10 and P["saturn"].house == 10
            and any(k in chart.aspects_to(10) for k in NATURAL_MALEFICS)
        ),
        "text": "The Sun and Saturn conjoin in the 10th, aspected by malefics "
                "— setbacks to reputation and prestige.",
    })
    _raja1_count = sum(1 for k in DIGNITY_PLANETS if k in P and P[k].house in KENDRA and P[k].dignity in {"own", "exalted"})
    catalog.append({
        "key": "raja_1_201_300", "name": "Raja Yoga (I)", "polarity": "benefic",
        "present": _raja1_count >= 3,
        "text": "Three or more planets are exalted or in their own sign while "
                "occupying angles — a famous king or ruler.",
    })
    catalog.append({
        "key": "raja_2_201_300", "name": "Raja Yoga (II)", "polarity": "benefic",
        "present": any(
            pf.dignity == "debilitated" and pf.house in (KENDRA | TRIKONA) and (not pf.combust or pf.retrograde)
            for k, pf in P.items() if k in DIGNITY_PLANETS
        ),
        "text": "A debilitated planet, uncombust or retrograde, still holds "
                "an angle or trine — rank equal to a ruler.",
    })
    _raja3_count = sum(1 for k in DIGNITY_PLANETS if _has_digbala(k))
    catalog.append({
        "key": "raja_3_201_300", "name": "Raja Yoga (III)", "polarity": "benefic",
        "present": 2 <= _raja3_count <= 4,
        "text": "Two to four planets possess Digbala (directional strength) "
                "— a ruler even from an ordinary family.",
    })
    catalog.append({
        "key": "neechabhanga_raja_1", "name": "Neechabhanga Raja Yoga (I)", "polarity": "benefic",
        "present": bool(
            lagna_sign == 10 and "venus" in P and P["venus"].house == 1
            and sum(1 for k in DIGNITY_PLANETS if k in P and P[k].dignity == "exalted") >= 4
        ),
        "text": "An Aquarius Lagna with Venus in it, and four planets "
                "exalted — a highly powerful ruler or dictator.",
    })
    catalog.append({
        "key": "neechabhanga_raja_2", "name": "Neechabhanga Raja Yoga (II)", "polarity": "benefic",
        "present": bool(
            "moon" in P and P["moon"].house == 1
            and "jupiter" in P and P["jupiter"].house == 4
            and "venus" in P and P["venus"].house == 10
            and "saturn" in P and P["saturn"].dignity in {"exalted", "own"}
        ),
        "text": "The Moon in Lagna, Jupiter in the 4th, Venus in the 10th, "
                "and a dignified Saturn — a ruler or an equal.",
    })
    def _neecha_bhanga_generic(key: str) -> bool:
        pf = P.get(key)
        if not pf or pf.dignity != "debilitated":
            return False
        dispositor = SIGN_LORD[pf.sign]
        exalt_lord = SIGN_LORD[EXALT_SIGN[key]] if key in EXALT_SIGN else None
        cancellers = {dispositor, exalt_lord} - {None}
        return any(
            c in P and (house_from(P[c].sign, lagna_sign) in KENDRA or house_from(P[c].sign, moon_sign) in KENDRA)
            for c in cancellers
        )
    catalog.append({
        "key": "neechabhanga_raja_3", "name": "Neechabhanga Raja Yoga (III)", "polarity": "benefic",
        "present": any(_neecha_bhanga_generic(k) for k in DIGNITY_PLANETS),
        "text": "A debilitated planet's dispositor or exaltation-lord holds "
                "an angle from the Moon or Lagna — cancelling the "
                "debilitation and ushering in royal luck from humble "
                "beginnings.",
    })
    catalog.append({
        "key": "raja_4_201_300", "name": "Raja Yoga (IV)", "polarity": "benefic",
        "present": bool(
            "moon" in P and P["moon"].house == 4
            and "jupiter" in P and P["jupiter"].house == 12 and "jupiter" in chart.aspects_to(4)
            and "mars" in P and P["mars"].house == 10 and "mars" in chart.aspects_to(4)
        ),
        "text": "The Moon in the 4th, aspected by Jupiter from the 12th and "
                "Mars from the 10th — rise to great prominence and power.",
    })
    _debilitated_planets = [k for k in DIGNITY_PLANETS if k in P and P[k].dignity == "debilitated"]
    catalog.append({
        "key": "raja_5_201_300", "name": "Raja Yoga (V)", "polarity": "benefic",
        "present": bool(_debilitated_planets) and all(_navamsa_dignity(P[k]) == "exalted" for k in _debilitated_planets),
        "text": "Every Rasi-debilitated planet is exalted in the Navamsa — "
                "high political or administrative power and wealth.",
    })
    catalog.append({
        "key": "raja_6_201_300", "name": "Raja Yoga (VI)", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 1
            and "mercury" in P and P["mercury"].house == 10
            and lagnesh_pf and lagnesh_pf.house == 10
            and "mars" in P and P["mars"].house == 10
        ),
        "text": "Jupiter in Lagna with Mercury, the lagna lord and Mars all "
                "in the 10th — high authority, wealth and honours.",
    })
    catalog.append({
        "key": "raja_7_201_300", "name": "Raja Yoga (VII)", "polarity": "benefic",
        "present": bool(
            "saturn" in P and P["saturn"].dignity in {"exalted", "moolatrikona"}
            and P["saturn"].house in (KENDRA | TRIKONA)
            and l10 and l10 in chart.aspects_to(P["saturn"].house)
        ),
        "text": "A dignified Saturn in an angle or trine, aspected by the "
                "10th lord — a ruler or highly respected leader.",
    })
    catalog.append({
        "key": "raja_8_201_300", "name": "Raja Yoga (VIII)", "polarity": "mixed",
        "present": bool(
            "moon" in P and "mars" in P and P["moon"].house in {2, 3} and P["mars"].house == P["moon"].house
            and "rahu" in P and P["rahu"].house == 5
        ),
        "text": "The Moon joins Mars in the 2nd or 3rd while Rahu occupies "
                "the 5th — a strong career-rise factor, though harmful for "
                "children.",
    })
    catalog.append({
        "key": "raja_9_201_300", "name": "Raja Yoga (IX)", "polarity": "benefic",
        "present": bool(l10 and l10 in P and P[l10].house == 9 and _navamsa_dignity(P[l10]) in {"own", "exalted", "friend"}),
        "text": "The 10th lord in the 9th holds a dignified Navamsa — a "
                "ruler or an equal.",
    })
    catalog.append({
        "key": "raja_10_201_300", "name": "Raja Yoga (X)", "polarity": "benefic",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 5
            and house_from(P["jupiter"].sign, moon_sign) in KENDRA
            and lagna_sign in FIXED_SIGNS and lagnesh_pf and lagnesh_pf.house == 10
        ),
        "text": "Jupiter in the 5th from Lagna, angular from the Moon, with "
                "a fixed lagna lord in the 10th — high prosperity and power.",
    })
    raja_11_present = False
    if "moon" in P:
        _nl3 = SIGN_LORD[P["moon"].navamsa]
        if _nl3 in P:
            raja_11_present = bool(
                P[_nl3].house in (KENDRA | TRIKONA)
                or ("mercury" in P and house_from(P[_nl3].sign, P["mercury"].sign) in (KENDRA | TRIKONA))
            )
    catalog.append({
        "key": "raja_11_201_300", "name": "Raja Yoga (XI)", "polarity": "benefic",
        "present": raja_11_present,
        "text": "The Navamsa lord of the Moon's sign holds an angle or trine "
                "from the Lagna or Mercury — a highly respectable position.",
    })
    catalog.append({
        "key": "sarpaganda_2", "name": "Sarpaganda Yoga (II)", "polarity": "caution",
        "present": bool(
            "rahu" in P and P["rahu"].house == 2 and chart.mandi_house == 2
            and l2 and l2 in P and any(k in chart.aspects_to(P[l2].house) for k in NATURAL_MALEFICS)
        ),
        "text": "Rahu joins Mandi in the 2nd with the 2nd lord afflicted by "
                "malefics — danger of death or injury from venomous bites.",
    })
    raja_12_present = False
    if lagna_sign in MOVABLE_SIGNS and lagnesh_pf and lagnesh_pf.sign in MOVABLE_SIGNS:
        for _k in DIGNITY_PLANETS:
            _pf = P.get(_k)
            if _pf and _pf.dignity == "debilitated":
                _nl4 = SIGN_LORD[_pf.navamsa]
                if _nl4 in P and P[_nl4].house in (KENDRA | TRIKONA):
                    raja_12_present = True
                    break
    catalog.append({
        "key": "raja_12_201_300", "name": "Raja Yoga (XII)", "polarity": "benefic",
        "present": raja_12_present,
        "text": "In a movable Lagna with a movable-sign lagna lord, the "
                "Navamsa lord of a debilitated planet holds an angle or "
                "trine — high administrative rise and prestige.",
    })
    catalog.append({
        "key": "raja_13_201_300", "name": "Raja Yoga (XIII)", "polarity": "mixed",
        "present": bool(
            lagnesh_pf and any(k in DIGNITY_PLANETS and k != lagnesh and pf.house == lagnesh_pf.house and pf.dignity == "debilitated" for k, pf in P.items())
            and "rahu" in P and "saturn" in P and P["rahu"].house == 10 and P["saturn"].house == 10
            and l9 and l9 in chart.aspects_to(10)
        ),
        "text": "The lagna lord joins a debilitated planet while Rahu and "
                "Saturn in the 10th are aspected by the 9th lord — early "
                "hardship, then a rise to authority.",
    })
    raja_14_present = False
    if any(lv and lv in P and house_from(P[lv].sign, moon_sign) in KENDRA for lv in (l11_early, l9, l2)):
        if chart.house_lord.get(2) == "jupiter" or chart.house_lord.get(5) == "jupiter" or chart.house_lord.get(11) == "jupiter":
            raja_14_present = True
    catalog.append({
        "key": "raja_14_201_300", "name": "Raja Yoga (XIV)", "polarity": "benefic",
        "present": raja_14_present,
        "text": "One of the 11th/9th/2nd lords holds an angle from the Moon "
                "while Jupiter rules the 2nd, 5th or 11th — greatness and "
                "high leadership.",
    })
    raja_15_present = False
    for _k in ("jupiter", "mercury", "venus", "moon"):
        _pf = P.get(_k)
        if _pf and _pf.house == 9 and not _pf.combust:
            if any(
                _fr != _k and (_pf2.house == 9 or _fr in chart.aspects_to(9)) and _compound_friend_or_better(_k, _fr, P)
                for _fr, _pf2 in P.items() if _fr in DIGNITY_PLANETS
            ):
                raja_15_present = True
                break
    catalog.append({
        "key": "raja_15_201_300", "name": "Raja Yoga (XV)", "polarity": "benefic",
        "present": raja_15_present,
        "text": "Jupiter, Mercury, Venus or the Moon joins the 9th uncombust, "
                "linked to a compound (Panchadha Maitri) friendly planet — a "
                "great man or respected ruler.",
    })
    catalog.append({
        "key": "galakarna", "name": "Galakarna Yoga", "polarity": "caution",
        "present": bool("rahu" in P and P["rahu"].house == 3 and chart.mandi_house == 3),
        "text": "Mandi joins Rahu in the 3rd house — ear troubles or "
                "deafness.",
    })
    catalog.append({
        "key": "vrana", "name": "Vrana Yoga", "polarity": "caution",
        "present": bool(l6 and l6 in NATURAL_MALEFICS and l6 in P and P[l6].house in {1, 8, 10}),
        "text": "A malefic 6th lord occupies the Lagna, 8th or 10th — "
                "tumours, boils or cancer.",
    })
    catalog.append({
        "key": "sisnavyadhi", "name": "Sisnavyadhi Yoga", "polarity": "caution",
        "present": bool(
            "mercury" in P and P["mercury"].house == 1
            and l6 and l8 and l6 in P and l8 in P and P[l6].house == 1 and P[l8].house == 1
        ),
        "text": "Mercury joins the Lagna with the 6th and 8th lords — "
                "venereal disease or sexual organ disorders.",
    })
    catalog.append({
        "key": "kalatrashanda", "name": "Kalatrashanda Yoga", "polarity": "caution",
        "present": bool(l7 and l7 in P and P[l7].house == 6 and "venus" in P and P["venus"].house == 6),
        "text": "The 7th lord joins the 6th with Venus — a frigid or "
                "sexually unresponsive wife.",
    })
    catalog.append({
        "key": "kushtaroga_1", "name": "Kushtaroga Yoga (I)", "polarity": "caution",
        "present": bool(
            lagnesh_pf and lagnesh_pf.house in {4, 12}
            and "mars" in P and "mercury" in P
            and P["mars"].house == lagnesh_pf.house and P["mercury"].house == lagnesh_pf.house
        ),
        "text": "The lagna lord joins the 4th or 12th with Mars and Mercury "
                "— leprosy or severe skin disease.",
    })
    catalog.append({
        "key": "kushtaroga_2", "name": "Kushtaroga Yoga (II)", "polarity": "caution",
        "present": bool(
            "jupiter" in P and P["jupiter"].house == 6
            and "saturn" in P and P["saturn"].house == 6 and "moon" in P and P["moon"].house == 6
        ),
        "text": "Jupiter occupies the 6th with Saturn and the Moon — "
                "leprosy or skin disorders.",
    })
    catalog.append({
        "key": "kshayaroga", "name": "Kshayaroga Yoga", "polarity": "caution",
        "present": bool(
            "rahu" in P and P["rahu"].house == 6
            and chart.mandi_house in KENDRA and lagnesh_pf and lagnesh_pf.house == 8
        ),
        "text": "Rahu in the 6th, Mandi in an angle from the Lagna, with the "
                "lagna lord in the 8th — tuberculosis (consumption).",
    })
    catalog.append({
        "key": "bandhana", "name": "Bandhana Yoga", "polarity": "caution",
        "present": bool(
            lagnesh_pf and l6 and l6 in P and P[l6].house == lagnesh_pf.house
            and lagnesh_pf.house in (KENDRA | TRIKONA)
            and any(k in P and P[k].house == lagnesh_pf.house for k in ("saturn", "rahu", "ketu"))
        ),
        "text": "The lagna and 6th lords join an angle or trine with Saturn, "
                "Rahu or Ketu — imprisonment.",
    })
    catalog.append({
        "key": "karascheda", "name": "Karascheda Yoga", "polarity": "caution",
        "present": bool("saturn" in P and "jupiter" in P and {P["saturn"].house, P["jupiter"].house} == {9, 3}),
        "text": "Saturn and Jupiter occupy the 9th and 3rd houses — loss of "
                "hands or limbs to accident or severe injury.",
    })
    catalog.append({
        "key": "sirachcheda", "name": "Sirachcheda Yoga", "polarity": "caution",
        "present": bool(
            l6 and l6 in P and "venus" in P and P[l6].house == P["venus"].house
            and "rahu" in P and (("sun" in P and P["sun"].house == P["rahu"].house) or ("saturn" in P and P["saturn"].house == P["rahu"].house))
        ),
        "text": "The 6th lord joins Venus while the Sun or Saturn joins Rahu "
                "— death by decapitation.",
    })
    catalog.append({
        "key": "durmarana", "name": "Durmarana Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].house in DUSTHANA and lagnesh in chart.aspects_to(P["moon"].house)
            and (
                any(k in P and P[k].house == P["moon"].house for k in ("saturn", "rahu"))
                or chart.mandi_house == P["moon"].house
            )
        ),
        "text": "The Moon in a dusthana, aspected by the lagna lord, joins "
                "Saturn, Mandi or Rahu — an unnatural death.",
    })
    catalog.append({
        "key": "yuddhe_marana", "name": "Yuddhe Marana Yoga", "polarity": "caution",
        "present": bool(
            "mars" in P and (chart.house_lord.get(6) == "mars" or chart.house_lord.get(8) == "mars")
            and l3 and l3 in P and P[l3].house == P["mars"].house
            and (
                any(k in P and P[k].house == P["mars"].house for k in ("rahu", "saturn"))
                or chart.mandi_house == P["mars"].house
            )
        ),
        "text": "Mars, ruling the 6th or 8th, conjoins the 3rd lord and Rahu, "
                "Saturn or Mandi — killed in battle.",
    })
    _mars_signs = {0, 7}
    _count_evil_8 = sum(1 for k in NATURAL_MALEFICS if k in P and P[k].house == 8)
    catalog.append({
        "key": "sanghataka_marana_1", "name": "Sanghataka Marana Yoga (I)", "polarity": "caution",
        "present": bool(
            _count_evil_8 >= 2
            and any(k in NATURAL_MALEFICS and P[k].house == 8 and (P[k].sign in _mars_signs or P[k].navamsa in _mars_signs) for k in NATURAL_MALEFICS if k in P)
        ),
        "text": "Several malefics crowd the 8th in a Mars Rasi or Navamsa — "
                "collective/mass-casualty death.",
    })
    catalog.append({
        "key": "sanghataka_marana_2", "name": "Sanghataka Marana Yoga (II)", "polarity": "caution",
        "present": bool(l8 and l8 in P and all(k in P and l8 in chart.aspects_to(P[k].house) for k in ("sun", "rahu", "saturn"))),
        "text": "The Sun, Rahu and Saturn are all aspected by the 8th lord — "
                "collective/mass-casualty death.",
    })
    catalog.append({
        "key": "peenasaroga", "name": "Peenasaroga Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].house == 6 and "saturn" in P and P["saturn"].house == 8
            and any(k in NATURAL_MALEFICS and k != "moon" and pf.house == 12 for k, pf in P.items())
            and lagnesh_pf and SIGN_LORD[lagnesh_pf.navamsa] in NATURAL_MALEFICS
        ),
        "text": "The Moon, Saturn and a malefic occupy the 6th, 8th and "
                "12th while the lagna lord's Navamsa is malefic-ruled — "
                "chronic nasal inflammation.",
    })
    catalog.append({
        "key": "pittaroga", "name": "Pittaroga Yoga", "polarity": "caution",
        "present": bool(
            any(k in NATURAL_MALEFICS and pf.house == 6 for k, pf in P.items())
            and "sun" in P
            and any(k in NATURAL_MALEFICS and k != "sun" and pf.house == P["sun"].house for k, pf in P.items())
            and any(k in NATURAL_MALEFICS and k in chart.aspects_to(P["sun"].house) for k, pf in P.items())
        ),
        "text": "A malefic in the 6th, the Sun conjoined and aspected by "
                "malefics — severe bilious (liver) complaints.",
    })
    catalog.append({
        "key": "vikalangapatni", "name": "Vikalangapatni Yoga", "polarity": "caution",
        "present": bool("venus" in P and "sun" in P and P["venus"].house in {5, 7, 9} and P["sun"].house == P["venus"].house),
        "text": "Venus and the Sun conjoin in the 5th, 7th or 9th — a wife "
                "with deformed or weak limbs.",
    })
    catalog.append({
        "key": "putrakalatraheena", "name": "Putrakalatraheena Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].house == 5 and _is_waxing() is False
            and any(k in NATURAL_MALEFICS and pf.house == 12 for k, pf in P.items())
            and any(k in NATURAL_MALEFICS and pf.house == 7 for k, pf in P.items())
            and any(k in NATURAL_MALEFICS and pf.house == 1 for k, pf in P.items())
        ),
        "text": "A waning Moon in the 5th with malefics in the 12th, 7th "
                "and Lagna — deprived of both wife and children.",
    })
    catalog.append({
        "key": "bharyasahavyabhichara", "name": "Bharyasahavyabhichara Yoga", "polarity": "caution",
        "present": bool("moon" in P and P["moon"].house == 7 and all(k in P and P[k].house == 7 for k in ("venus", "saturn", "mars"))),
        "text": "Venus, Saturn and Mars all join the Moon in the 7th — both "
                "spouses guilty of infidelity.",
    })
    catalog.append({
        "key": "vamsacheda", "name": "Vamsacheda Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].house == 10 and "venus" in P and P["venus"].house == 7
            and any(k in NATURAL_MALEFICS and pf.house == 4 for k, pf in P.items())
        ),
        "text": "The Moon in the 10th, Venus in the 7th and a malefic in "
                "the 4th — extinguishing the family line.",
    })
    catalog.append({
        "key": "guhyaroga", "name": "Guhyaroga Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].navamsa in {3, 7}
            and any(k in NATURAL_MALEFICS and pf.navamsa == P["moon"].navamsa for k, pf in P.items() if k != "moon")
        ),
        "text": "The Moon joins malefics in the Navamsa of Cancer or "
                "Scorpio — diseases of the private parts, piles or hernia.",
    })
    catalog.append({
        "key": "angaheena", "name": "Angaheena Yoga", "polarity": "caution",
        "present": bool(
            "moon" in P and P["moon"].house == 10 and "mars" in P and P["mars"].house == 7
            and "saturn" in P and "sun" in P and house_from(P["saturn"].sign, P["sun"].sign) == 2
        ),
        "text": "The Moon in the 10th, Mars in the 7th, and Saturn 2nd from "
                "the Sun — loss of limbs or paralysis.",
    })
    catalog.append({
        "key": "swetakushta", "name": "Swetakushta Yoga", "polarity": "caution",
        "present": bool(
            "mars" in P and "saturn" in P and {P["mars"].house, P["saturn"].house} == {2, 12}
            and "moon" in P and P["moon"].house == 1 and "sun" in P and P["sun"].house == 7
        ),
        "text": "Mars and Saturn in the 2nd and 12th, the Moon in Lagna and "
                "the Sun in the 7th — white leprosy (vitiligo).",
    })
    catalog.append({
        "key": "pisacha_grastha", "name": "Pisacha Grastha Yoga", "polarity": "caution",
        "present": bool(
            "rahu" in P and "moon" in P and P["rahu"].house == 1 and P["moon"].house == 1
            and any(k in NATURAL_MALEFICS and pf.house in TRIKONA for k, pf in P.items())
        ),
        "text": "Rahu conjoins the Moon in the Lagna with malefics in a "
                "trine — mental derangement or attacks attributed to "
                "\"spirits\".",
    })
    catalog.append({
        "key": "andha_1", "name": "Andha Yoga (I)", "polarity": "caution",
        "present": bool(
            "sun" in P and "rahu" in P and P["sun"].house == 1 and P["rahu"].house == 1
            and any(k in NATURAL_MALEFICS and pf.house in TRIKONA for k, pf in P.items())
        ),
        "text": "The Sun rises in Lagna with Rahu, malefics disposed in "
                "trines — born stone-blind.",
    })
    catalog.append({
        "key": "andha_2", "name": "Andha Yoga (II)", "polarity": "caution",
        "present": bool(
            all(k in P for k in ("mars", "moon", "saturn", "sun"))
            and P["mars"].house == 2 and P["moon"].house == 6 and P["saturn"].house == 12 and P["sun"].house == 8
        ),
        "text": "Mars, Moon, Saturn and Sun in the 2nd, 6th, 12th and 8th "
                "respectively — born stone-blind.",
    })
    catalog.append({
        "key": "vatharoga", "name": "Vatharoga Yoga", "polarity": "caution",
        "present": bool("jupiter" in P and P["jupiter"].house == 1 and "saturn" in P and P["saturn"].house == 7),
        "text": "Jupiter in the Lagna and Saturn in the 7th — windy "
                "complaints, gout or rheumatism.",
    })
    catalog.append({
        "key": "matibhramana_1", "name": "Matibhramana Yoga (I)", "polarity": "caution",
        "present": bool("jupiter" in P and "mars" in P and P["jupiter"].house == 1 and P["mars"].house == 7),
        "text": "Jupiter and Mars occupy the Lagna and 7th respectively — "
                "insanity or mental derangement.",
    })
    catalog.append({
        "key": "matibhramana_2", "name": "Matibhramana Yoga (II)", "polarity": "caution",
        "present": bool("saturn" in P and P["saturn"].house == 1 and "mars" in P and P["mars"].house in {5, 7, 9}),
        "text": "Saturn in the Lagna with Mars in the 5th, 7th or 9th — "
                "insanity.",
    })
    catalog.append({
        "key": "matibhramana_3", "name": "Matibhramana Yoga (III)", "polarity": "caution",
        "present": bool("saturn" in P and P["saturn"].house == 12 and "moon" in P and P["moon"].house == 12 and _is_waxing() is False),
        "text": "Saturn occupies the 12th with a waning Moon — insanity.",
    })
    catalog.append({
        "key": "matibhramana_4", "name": "Matibhramana Yoga (IV)", "polarity": "caution",
        "present": bool(
            "moon" in P and "mercury" in P and P["moon"].house in KENDRA and P["mercury"].house == P["moon"].house
            and any(k not in ("moon", "mercury") and (pf.house == P["moon"].house or k in chart.aspects_to(P["moon"].house)) for k, pf in P.items())
        ),
        "text": "The Moon and Mercury conjoin in an angle, linked to "
                "another planet — insanity.",
    })
    catalog.append({
        "key": "khalawata", "name": "Khalawata Yoga", "polarity": "caution",
        "present": bool(SIGN_LORD[lagna_sign] in NATURAL_MALEFICS and any(k in chart.aspects_to(1) for k in NATURAL_MALEFICS)),
        "text": "The Ascendant falls in a malefic sign, aspected by malefics "
                "— early baldness.",
    })
    catalog.append({
        "key": "nishturabhashi", "name": "Nishturabhashi Yoga", "polarity": "caution",
        "present": bool("moon" in P and "saturn" in P and P["moon"].house == P["saturn"].house),
        "text": "The Moon conjoins Saturn — harsh, blunt and offensive "
                "speech.",
    })
    al_house = _bhava_arudha(1)
    a12_house = _bhava_arudha(12)
    rajabhrashta_present = False
    if al_house and a12_house:
        _al_lord = SIGN_LORD[(lagna_sign + al_house - 1) % 12]
        _a12_lord = SIGN_LORD[(lagna_sign + a12_house - 1) % 12]
        rajabhrashta_present = bool(_al_lord in P and _a12_lord in P and P[_al_lord].house == P[_a12_lord].house)
    catalog.append({
        "key": "rajabhrashta", "name": "Rajabhrashta Yoga", "polarity": "caution",
        "present": rajabhrashta_present,
        "text": "The lords of the Arudha Lagna and Arudha Dwadasa conjoin — "
                "a dramatic fall from high position and power.",
    })
    catalog.append({
        "key": "raja_yoga_bhanga_1", "name": "Raja Yoga Bhanga (I)", "polarity": "caution",
        "present": bool(
            lagna_sign == 4 and "saturn" in P and P["saturn"].sign == 6
            and P["saturn"].dignity == "exalted" and _navamsa_dignity(P["saturn"]) == "debilitated"
        ),
        "text": "A Leo Lagna with Saturn exalted in Libra but debilitated in "
                "Navamsa — born in a royal family yet bereft of fortune.",
    })
    catalog.append({
        "key": "raja_yoga_bhanga_2", "name": "Raja Yoga Bhanga (II)", "polarity": "caution",
        "present": bool("sun" in P and P["sun"].sign == 6 and abs(P["sun"].deg_in_sign - 10.0) <= 1.0),
        "text": "The Sun sits at the exact degree of deepest debilitation in "
                "Libra — destroying potential rise and prolonging misery.",
    })
    catalog.append({
        "key": "gohanta", "name": "Gohanta Yoga", "polarity": "caution",
        "present": bool(
            any(
                k in NATURAL_MALEFICS and pf.house in KENDRA and not any(b in chart.aspects_to(pf.house) for b in NATURAL_BENEFICS)
                for k, pf in P.items()
            )
            and "jupiter" in P and P["jupiter"].house == 8
        ),
        "text": "A malefic devoid of any benefic aspect sits in an angle "
                "while Jupiter is in the 8th — classically linked to cruel or "
                "slaughter-related trades.",
    })

    return catalog


def build_chart(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                now: datetime, *, is_day: Optional[bool] = None,
                gulika_lon: Optional[float] = None,
                mandi_lon: Optional[float] = None) -> Chart:
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
        retro = bool(raw.get("is_retrograde", raw.get("retrograde", False)))
        _orb = combust_orb(key, retro)
        combust = (
            _orb is not None
            and sun_lon is not None
            and _angular_sep(lon, sun_lon) < _orb
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
        yogas=[],
        maha_lord=maha_lord,
        antar_lord=antar_lord,
        maha_window=maha_window,
        dasha=dasha,
        lagna_nak=lagna_nak,
        moon_nak=moon_nak,
        is_day=is_day,
        gulika_house=house_of(sign_of(gulika_lon), lagna_sign) if gulika_lon is not None else None,
        gulika_sign=sign_of(gulika_lon) if gulika_lon is not None else None,
        mandi_house=house_of(sign_of(mandi_lon), lagna_sign) if mandi_lon is not None else None,
        mandi_sign=sign_of(mandi_lon) if mandi_lon is not None else None,
    )
    chart.yogas = _report_yogas_from_catalog(chart)
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


_SHADBALA_STATUS_NE = {
    "Exceptional": "असाधारण", "Strong": "बलियो", "Adequate": "पर्याप्त",
    "Borderline": "सीमान्त", "Weak": "कमजोर",
}


def _planet_line(chart: Chart, key: str, *, ne: bool = False) -> str:
    pf = chart.planet(key)
    if not pf:
        return ""
    deg = int(pf.deg_in_sign)
    minute = int(round((pf.deg_in_sign - deg) * 60)) % 60
    if ne:
        bits = [
            f"{PLANET_NE[key]} {RASHI_NE[pf.sign]} राशिमा {deg}°{minute:02d}′ "
            f"(जन्म तारा {NAKSHATRA_NE[pf.nakshatra]}, चरण {pf.pada}), तपाईंको "
            f"{_ord_ne(pf.house)} भावमा छ"
        ]
        if pf.dignity:
            bits.append(f"र यहाँ {DIGNITY_PHRASE_NE.get(pf.dignity, pf.dignity)} छ")
        if pf.retrograde and key not in {"rahu", "ketu"}:
            bits.append("अहिले उल्टो गति (वक्री) मा छ, त्यसैले यसका विषय भित्री रूपमा फर्किन्छन्")
        if pf.combust:
            bits.append("सूर्यको धेरै नजिक (अस्त) छ, त्यसैले बाह्य फल पाउन बढी प्रयास चाहिन्छ")
        if pf.vargottama:
            bits.append("दुवै मुख्य चार्टमा उही राशिमा (वर्गोत्तम) छ — जसले यसलाई उल्लेखनीय रूपमा बलियो बनाउँछ")
        return "; ".join(bits) + "।"
    bits = [
        f"{PLANET_EN[key]} is in {RASHI_EN[pf.sign]} at {deg}°{minute:02d}′ "
        f"(birth star {NAKSHATRA_EN[pf.nakshatra]}, quarter {pf.pada}), in your "
        f"{_ord(pf.house)} house"
    ]
    if pf.dignity:
        bits.append(f"and is {DIGNITY_PHRASE.get(pf.dignity, pf.dignity)} there")
    if pf.retrograde and key not in {"rahu", "ketu"}:
        bits.append("moving backwards for now (retrograde), so its themes turn inward and get revisited")
    if pf.combust:
        bits.append("very close to the Sun (combust), so its outer results take extra effort")
    if pf.vargottama:
        bits.append("in the same sign in both main charts (vargottama), which makes it noticeably stronger")
    return "; ".join(bits) + "."


def _signified_house_planet(chart: Chart, house: int, *, ne: bool = False) -> str:
    lord = chart.house_lord.get(house)
    lf = chart.planet(lord) if lord else None
    occ = chart.house_occupants.get(house, [])
    if ne:
        parts = [f"जीवनको यो क्षेत्र {HOUSE_THEME_NE[house]} सँग सम्बन्धित छ।"]
        if lf:
            dign = DIGNITY_PHRASE_NE.get(lf.dignity, lf.dignity or "रहेको")
            parts.append(
                f"यो क्षेत्र सम्हाल्ने ग्रह {PLANET_NE[lord]} अहिले {HOUSE_THEME_NE[lf.house].split(',')[0]} "
                f"सँग सम्बन्धित भागमा छ, र यहाँ {dign} छ"
                + (f" (समग्र बल {_SHADBALA_STATUS_NE.get(lf.shadbala_status, lf.shadbala_status)})"
                   if lf.shadbala_status else "")
                + "।"
            )
        if occ:
            parts.append("यस क्षेत्रमा अहिले रहेका ग्रह: " + ", ".join(PLANET_NE[k] for k in occ) + "।")
        return " ".join(parts)
    parts = [f"This area of life is about {HOUSE_THEME[house]}."]
    if lf:
        dign = DIGNITY_PHRASE.get(lf.dignity, lf.dignity or "placed")
        parts.append(
            f"The planet in charge of it, {PLANET_EN[lord]}, currently sits in the part of "
            f"your chart about {HOUSE_THEME[lf.house].split(',')[0]}, and is {dign} there"
            + (f" (overall strength {lf.shadbala_status.lower()})" if lf.shadbala_status else "")
            + "."
        )
    if occ:
        parts.append("Planets currently in this area: " + ", ".join(PLANET_EN[k] for k in occ) + ".")
    return " ".join(parts)


def _strength_word(level: str) -> str:
    return {
        "strong": "a strong, well-supported",
        "moderate": "a moderately supported",
        "mixed": "a mixed, conditional",
        "tentative": "a tentative",
    }[level]


def _strength_word_ne(level: str) -> str:
    return {
        "strong": "बलियो, राम्रोसँग समर्थित",
        "moderate": "मध्यम रूपमा समर्थित",
        "mixed": "मिश्रित, सशर्त",
        "tentative": "अनिश्चित",
    }[level]


def _fmt_date_ne(dt: datetime) -> str:
    """Bikram Sambat date string in Nepali — e.g. '17 चैत्र 2083'.

    Falls back to the Gregorian date (with a Nepali month abbrev) if the BS
    conversion is unavailable for that instant.
    """
    try:
        from engine.vedic.bikram_sambat import gregorian_to_bs
        from engine.vedic.constants import BS_MONTH_NAMES_NEPALI

        y, m, d = gregorian_to_bs(dt.date())
        return f"{d} {BS_MONTH_NAMES_NEPALI[m - 1]} {y}"
    except Exception:
        s = _fmt_date(dt)
        for en, ne in _EN_MONTH_NE.items():
            s = s.replace(en, ne)
        return s


def _date(dt: datetime, ne: bool) -> str:
    return _fmt_date_ne(dt) if ne else _fmt_date(dt)


def _nsec(sid: str, title_en: str, title_ne: str, body: Iterable[str],
          conf: Optional["Confidence"] = None,
          items: Optional[list[dict[str, Any]]] = None,
          optional: bool = False) -> dict[str, Any]:
    """Native (already-localized) section — bypasses the phrase translator."""
    out: dict[str, Any] = {
        "id": sid, "title_en": title_en, "title_ne": title_ne,
        "body": [p for p in body if p], "prelocalized": True,
    }
    if conf is not None:
        out["confidence"] = conf.level
        out["factors"] = conf.factors
    if items is not None:
        out["items"] = items
    if optional:
        out["optional"] = True
    return out


def _age_at(birth: datetime, when: datetime) -> int:
    """Whole years from birth to `when` (never negative)."""
    years = when.year - birth.year - (
        (when.month, when.day) < (birth.month, birth.day)
    )
    return max(0, years)


def _next_period_for(
    dasha: dict[str, Any], lord: str, now: datetime
) -> Optional[dict[str, Any]]:
    """Next dated window for a planet: its running/next antardasha inside the
    current mahadasha, else its next mahadasha. Powers 'pursue X when' timing."""
    for b in dasha.get("bhuktis", []):
        if b["lord"] == lord and b["end"] > now:
            return {
                "start": b["start"], "end": b["end"],
                "kind": "antardasha", "running": b["start"] <= now < b["end"],
            }
    for m in dasha.get("full_sequence", []):
        if m["lord"] == lord and m["end"] > now:
            return {
                "start": m["start"], "end": m["end"],
                "kind": "mahadasha", "running": m["start"] <= now < m["end"],
            }
    return None


def _window_phrase(dasha: Optional[dict[str, Any]], lord: str, now: datetime,
                   *, ne: bool) -> Optional[str]:
    """A short 'the upcoming Saturn antardasha (12 Jan 2026 → …)' timing phrase."""
    if not dasha:
        return None
    w = _next_period_for(dasha, lord, now)
    if not w:
        return None
    span = f"{_date(w['start'], ne)} → {_date(w['end'], ne)}"
    if ne:
        when = "हाल चलिरहेको अनुकूल समय" if w["running"] else "आगामी अनुकूल समय"
        return f"{when} ({span})"
    when = "a good period running now" if w["running"] else "an upcoming good period"
    return f"{when} ({span})"


def _life_journey_section(chart: Chart, now: datetime, lang: str) -> Optional[dict[str, Any]]:
    """Past → present → future mahadasha chapters, with ages, as a life arc."""
    d = chart.dasha
    if not d or not d.get("full_sequence"):
        return None
    ne = lang == "ne"
    birth = d["birth"]
    items: list[dict[str, Any]] = []
    for idx, m in enumerate(d["full_sequence"]):
        a0, a1 = _age_at(birth, m["start"]), _age_at(birth, m["end"])
        if a0 > 100:
            break
        lord = m["lord"]
        past = m["end"] <= now
        current = m["start"] <= now < m["end"]
        span = f"{_date(m['start'], ne)} → {_date(m['end'], ne)}"
        # Actual span — the first (birth-balance) chapter is only a fraction of
        # the lord's nominal length, so never print the full DASHA_YEARS there.
        span_years = (m["end"] - m["start"]).days / DAYS_PER_YEAR
        if span_years >= 1.5:
            dur = f"{round(span_years)} वर्ष" if ne else f"{round(span_years)} yrs"
        else:
            dur = f"{round(span_years * 12)} महिना" if ne else f"{round(span_years * 12)} mo"
        balance = idx == 0 and span_years < DASHA_YEARS[lord] - 0.5
        if ne:
            status = "विगत" if past else ("वर्तमान · अहिले यहीँ" if current else "आगामी")
            theme = DASHA_THEME_NE[lord]
            if past:
                gloss = f"यस अवधिले {theme} वरिपरि अनुभव र आधार निर्माण गर्‍यो।"
            elif current:
                gloss = f"अहिले तपाईं यही अध्यायमा हुनुहुन्छ — {theme} अघि सारिन्छ।"
            else:
                gloss = f"यो आउँदो अध्यायले {theme} लाई अगाडि ल्याउनेछ।"
            bal_ne = " (जन्मकालीन शेष)" if balance else ""
            label = f"{PLANET_NE[lord]} को जीवन-कालखण्ड{bal_ne} · उमेर {a0}–{a1} ({status})"
            text = f"{span} ({dur}): {gloss}"
        else:
            status = "past" if past else ("present · you are here" if current else "ahead")
            theme = DASHA_THEME[lord]
            if past:
                gloss = f"This chapter built experience around {theme}."
            elif current:
                gloss = f"You are living this chapter now — {theme} is foregrounded."
            else:
                gloss = f"This coming chapter brings {theme} to the fore."
            bal_en = " (balance at birth)" if balance else ""
            label = f"{PLANET_EN[lord]} life period{bal_en} · age {a0}–{a1} ({status})"
            text = f"{span} ({dur}): {gloss}"
        items.append({
            "label": label,
            "confidence": _planet_confidence(chart, lord).level,
            "text": text,
        })
    body = ([
        "तपाईंको जीवन ठूला-ठूला कालखण्ड (जसलाई ज्योतिषमा महादशा भनिन्छ) मा बाँडिएको हुन्छ, "
        "र हरेक कालखण्डले जीवनको फरक पक्षमा जोड दिन्छ। तल जन्मदेखि बाँचिसकेका विगतका "
        "कालखण्ड, हाल चलिरहेको कालखण्ड र आगामी कालखण्डहरू उमेरसहित दिइएको छ — कुन "
        "बेला जीवनमा के कुरामा जोड पर्छ भन्ने एकै नजरमा हेर्न।",
    ] if ne else [
        "Your life is divided into long chapters (called mahadashas in astrology), and "
        "each one emphasises a different part of life. Below are the chapters you have "
        "already lived, the one running now, and the ones ahead — with ages — so you "
        "can see at a glance which stage of life emphasises what.",
    ])
    return {
        "id": "life_journey",
        "title_en": "Life journey — past, present & future",
        "title_ne": "जीवन यात्रा — विगत, वर्तमान र भविष्य",
        "body": body,
        "items": items,
        "prelocalized": True,
    }


def _pursue_section(chart: Chart, now: datetime, lang: str) -> dict[str, Any]:
    """Actionable 'what to pursue & when' — ties life areas to their dasha windows."""
    ne = lang == "ne"
    d = chart.dasha
    items: list[dict[str, Any]] = []

    def add(area_ne: str, area_en: str, lord: str, pursue_ne: str, pursue_en: str) -> None:
        if not lord:
            return
        conf = _planet_confidence(chart, lord)
        window = _window_phrase(d, lord, now, ne=ne)
        if ne:
            timing = f" सबैभन्दा राम्रो समय: {window}।" if window else ""
            text = f"{pursue_ne}{timing}"
            label = area_ne
        else:
            timing = f" Best time for this: {window}." if window else ""
            text = f"{pursue_en}{timing}"
            label = area_en
        items.append({"label": label, "confidence": conf.level, "text": text})

    strong = _strongest(chart)
    add(
        "तपाईंको सबैभन्दा बलियो पक्ष", "Your strongest area", strong,
        f"तपाईं स्वाभाविक रूपमा {_plain_theme(strong, True)} मा राम्रो हुनुहुन्छ — यहीँ "
        "मिहिनेत सबैभन्दा छिटो फल दिन्छ, त्यसैले यसमै सबैभन्दा बढी लगानी गर्नुहोस्।",
        f"You are naturally good at {_plain_theme(strong, False)} — effort pays off "
        "fastest here, so put most of your energy into it.",
    )
    # Career (10th), wealth/gains (11th), relationships (7th), learning & dharma (9th).
    add(
        "करियर र कर्म", "Career & work", chart.house_lord.get(10, ""),
        "करियर, स्थिति र सार्वजनिक भूमिकामा ठूला कदम चाल्नुहोस्।",
        "Make your bigger moves in career, status and public role.",
    )
    add(
        "धन र लाभ", "Wealth & gains", chart.house_lord.get(11, ""),
        "आम्दानीका स्रोत, सञ्जाल र आकांक्षा विस्तार गर्नुहोस्।",
        "Expand income streams, networks and aspirations.",
    )
    add(
        "सम्बन्ध र साझेदारी", "Relationships & partnership", chart.house_lord.get(7, ""),
        "विवाह, साझेदारी वा सार्वजनिक सहकार्यलाई अघि बढाउनुहोस्।",
        "Advance marriage, partnership or public collaboration.",
    )
    add(
        "शिक्षा, धर्म र मार्गदर्शन", "Learning, dharma & mentors", chart.house_lord.get(9, ""),
        "उच्च शिक्षा, यात्रा, गुरुसंग र आध्यात्मिक अभ्यासलाई समय दिनुहोस्।",
        "Invest in higher learning, travel, mentors and spiritual practice.",
    )

    body = ([
        "यो खण्डले तपाईंले कुन कुरामा ध्यान दिने र त्यसका लागि कुन समय सबैभन्दा राम्रो "
        "छ भन्ने देखाउँछ। तल हरेक जीवन-क्षेत्रसँगै त्यसका लागि अनुकूल समय दिइएको छ — "
        "ठूला निर्णय ती समयसँग मिलाउनुहोस्।",
    ] if ne else [
        "This section shows what to focus on and the best time for each one. Every "
        "life area below comes with the period that most favours it — try to line up "
        "your bigger decisions with those good times.",
    ])
    return {
        "id": "pursue_and_when",
        "title_en": "What to pursue & when",
        "title_ne": "के कुरामा लाग्ने र कहिले",
        "body": body,
        "items": items,
        "prelocalized": True,
    }


# ── Divisional (varga) chart summaries ────────────────────────────────────────
# The classical life-domain each divisional chart is read for.
#   division: (en_label, ne_label, en_domain, ne_domain)
VARGA_DOMAIN: dict[int, tuple[str, str, str, str]] = {
    2:  ("Hora", "होरा", "wealth, resources and material sustenance",
         "धन, स्रोत र भौतिक निर्वाह"),
    3:  ("Drekkana", "द्रेष्काण", "siblings, courage and personal initiative",
         "भाइबहिनी, साहस र व्यक्तिगत पहल"),
    4:  ("Chaturthamsa", "चतुर्थांश", "home, land, property and inner contentment",
         "घर, जग्गा, सम्पत्ति र आन्तरिक सन्तुष्टि"),
    7:  ("Saptamsa", "सप्तांश", "children, progeny and creative continuity",
         "सन्तान, वंश र सिर्जनात्मक निरन्तरता"),
    9:  ("Navamsa", "नवांश",
         "marriage, dharma, fortune and the inner strength of every planet",
         "विवाह, धर्म, भाग्य र हरेक ग्रहको भित्री बल"),
    10: ("Dasamsa", "दशांश", "career, profession, status and public achievement",
         "करियर, पेशा, प्रतिष्ठा र सार्वजनिक उपलब्धि"),
    12: ("Dwadashamsa", "द्वादशांश", "parents, lineage and inherited karma",
         "आमाबुबा, वंश र पैतृक कर्म"),
    16: ("Shodashamsa", "षोडशांश", "vehicles, comforts and material pleasures",
         "सवारी, सुविधा र भौतिक सुख"),
    20: ("Vimsamsa", "विंशांश", "spiritual practice, devotion and religious merit",
         "आध्यात्मिक साधना, भक्ति र धार्मिक पुण्य"),
    24: ("Chaturvimsamsa", "चतुर्विंशांश", "education, learning and scholarship",
         "शिक्षा, विद्या र प्रज्ञा"),
    27: ("Bhamsa", "सप्तविंशांश", "innate strengths, weaknesses and stamina",
         "जन्मजात बल, कमजोरी र सहनशीलता"),
    30: ("Trimsamsa", "त्रिंशांश", "adversity, health risks and moral fibre",
         "प्रतिकूलता, स्वास्थ्य जोखिम र नैतिक बल"),
    60: ("Shashtiamsa", "षष्ट्यंश",
         "the sum of past-life karma standing behind the whole chart",
         "सम्पूर्ण कुण्डलीभित्रको पूर्वजन्म कर्मको योग"),
}

# Divisional charts summarised in the report, in reading order. D1 (the rashi
# chart) is covered by every other section, so it is not repeated here.
VARGA_REPORT_ORDER: tuple[int, ...] = (9, 10, 7, 4, 12, 24, 2, 3, 16, 20, 27, 30, 60)


def _varga_dignity(planet: str, varga_sign: int) -> Optional[str]:
    """Classical dignity of a graha judged from its sign in a divisional chart.

    Divisional dignity is a sign-level judgement (own / exalted / debilitated),
    so a representative mid-sign longitude is enough.
    """
    return _dignity(planet, varga_sign * 30 + 15)


def _divisional_item(chart: Chart, division: int, *, ne: bool) -> dict[str, Any]:
    """One card: what a D-chart reads for, and how strong it looks here."""
    en_label, ne_label, en_dom, ne_dom = VARGA_DOMAIN[division]

    dignified: list[str] = []      # own / exalted / moolatrikona in this varga
    debilitated: list[str] = []
    same_sign: list[str] = []      # repeats its rashi sign (vargottama in D9)
    factors: list[str] = []

    for key in DIGNITY_PLANETS:
        pf = chart.planet(key)
        if not pf:
            continue
        vsign = varga_rashi_from_longitude(division, pf.longitude) - 1
        dign = _varga_dignity(key, vsign)
        repeats = pf.sign == vsign
        note_bits: list[str] = []
        if dign in {"exalted", "own", "moolatrikona"}:
            dignified.append(key)
            note_bits.append(DIGNITY_PHRASE_NE.get(dign, dign) if ne
                             else DIGNITY_PHRASE.get(dign, dign))
        elif dign == "debilitated":
            debilitated.append(key)
            note_bits.append(DIGNITY_PHRASE_NE["debilitated"] if ne
                             else DIGNITY_PHRASE["debilitated"])
        if repeats:
            same_sign.append(key)
            if division == 9:
                note_bits.append("वर्गोत्तम" if ne else "vargottama")
            else:
                note_bits.append("जन्म राशि दोहोर्‍याउँछ" if ne
                                 else "keeps its natal sign")
        if note_bits:
            planet_name = PLANET_NE[key] if ne else PLANET_EN[key]
            factors.append(f"{planet_name}: {', '.join(note_bits)}")

    strong_ct = len(set(dignified) | set(same_sign))
    weak_ct = len(debilitated)
    if strong_ct >= 3 and weak_ct == 0:
        level = "strong"
    elif strong_ct - weak_ct >= 2:
        level = "moderate"
    elif strong_ct and weak_ct:
        level = "mixed"
    elif strong_ct:
        level = "moderate"
    else:
        level = "tentative"

    verdict_en = {
        "strong": "strong and well-supported",
        "moderate": "reasonably supported",
        "mixed": "mixed — some support and some challenges",
        "tentative": "average, without a standout signal",
    }[level]
    verdict_ne = {
        "strong": "बलियो र राम्रोसँग समर्थित",
        "moderate": "ठीकठाकसँग समर्थित",
        "mixed": "मिश्रित — केही समर्थन, केही चुनौती",
        "tentative": "सामान्य, कुनै विशेष संकेतबिना",
    }[level]

    strong_keys = list(dict.fromkeys(dignified + same_sign))
    if ne:
        strong_names = ", ".join(PLANET_NE[k] for k in strong_keys)
        weak_names = ", ".join(PLANET_NE[k] for k in debilitated)
        text = f"D{division} ({ne_label}) चक्रले तपाईंको {ne_dom} देखाउँछ।"
        if strong_names:
            text += f" यहाँ {strong_names} बलियो छन्, जसले यस क्षेत्रलाई सघाउँछ।"
        if weak_names:
            text += f" {weak_names} भने केही दबाबमा छन्, त्यसैले यता थप ध्यान चाहिन्छ।"
        text += f" समग्रमा यो क्षेत्र {verdict_ne} देखिन्छ।"
    else:
        strong_names = ", ".join(PLANET_EN[k] for k in strong_keys)
        weak_names = ", ".join(PLANET_EN[k] for k in debilitated)
        one_strong = len(strong_keys) == 1
        one_weak = len(debilitated) == 1
        text = f"The D{division} chart ({en_label}) shows your {en_dom}."
        if strong_names:
            text += f" {strong_names} {'is' if one_strong else 'are'} strong here, " \
                    "which helps this area."
        if weak_names:
            text += f" {weak_names} {'is' if one_weak else 'are'} under some strain, " \
                    "so this part needs more care."
        text += f" Overall, this area looks {verdict_en}."

    label = f"D{division} — {ne_label}" if ne else f"D{division} — {en_label}"
    return {
        "label": label,
        "confidence": level,
        "factors": factors,
        "text": text,
    }


def _divisional_section(chart: Chart, *, ne: bool) -> dict[str, Any]:
    items = [_divisional_item(chart, d, ne=ne) for d in VARGA_REPORT_ORDER]
    if ne:
        body = [
            "वर्ग (D) चक्रहरू जन्मकुण्डलीको हरेक राशिलाई सूक्ष्म भागमा बाँडेर बनाइन्छन्, "
            "र प्रत्येकले जीवनको एउटा निश्चित क्षेत्रलाई नजिकबाट हेर्छ। तल प्रत्येक "
            "प्रमुख वर्ग चक्रले केका लागि पढिन्छ र यस कुण्डलीमा त्यो क्षेत्र कति बलियो "
            "देखिन्छ भन्ने संक्षिप्त पढाइ दिइएको छ।",
        ]
    else:
        body = [
            "Divisional (varga) charts subdivide each rashi of the birth chart into "
            "finer parts, and each one zooms in on a specific area of life. Below is "
            "a short reading of what every major D-chart is read for and how strong "
            "that area looks in this chart.",
        ]
    return {
        "id": "divisional_charts",
        "title_en": "Divisional charts (D-charts) summary",
        "title_ne": "वर्ग चक्र (D-चार्ट) सारांश",
        "body": body,
        "items": items,
        "prelocalized": True,
    }


# ── Yoga report enrichment ────────────────────────────────────────────────────

def _yoga_involved(chart: Chart, y: dict[str, Any]) -> list[str]:
    """Grahas that form a detected yoga, derived from its key."""
    key = y.get("key", "")
    static = {
        "gajakesari": ["jupiter", "moon"],
        "budhaditya": ["sun", "mercury"],
        "chandra_mangala": ["moon", "mars"],
        "kemadruma": ["moon"],
    }
    if key in static:
        return static[key]
    if key.startswith("mahapurusha_") or key.startswith("neechabhanga_"):
        return [key.split("_", 1)[1]]
    if key.startswith("raja_"):
        return [p for p in key.split("_")[1:] if p in PLANET_EN]
    if key == "dhana_2_11":
        return [p for p in (chart.house_lord.get(2), chart.house_lord.get(11)) if p]
    return []


def _yoga_report_item(chart: Chart, y: dict[str, Any], *, ne: bool) -> dict[str, Any]:
    """A yoga card enriched with per-graha strength, dasha activation and a
    data-driven confidence grade — so the reader sees *how* the yoga sits in
    this chart, not just its textbook meaning."""
    involved = _yoga_involved(chart, y)
    pol = y["polarity"]
    factors: list[str] = []
    strong_ct = weak_ct = 0

    for key in involved:
        pf = chart.planet(key)
        if not pf:
            continue
        dscore = DIGNITY_SCORE.get(pf.dignity, 0)
        sb = pf.shadbala_status
        if dscore >= 2 or sb in {"Exceptional", "Strong"} or pf.vargottama:
            strong_ct += 1
        if dscore <= -2 or sb in {"Weak", "Borderline"} or pf.combust:
            weak_ct += 1
        if ne:
            bit = f"{PLANET_NE[key]}: {DIGNITY_PHRASE_NE.get(pf.dignity, 'स्थित')}"
            if sb:
                bit += f", षड्बल {_SHADBALA_STATUS_NE.get(sb, sb)}"
            if pf.vargottama:
                bit += ", वर्गोत्तम"
            if pf.combust:
                bit += ", अस्त"
        else:
            bit = f"{PLANET_EN[key]}: {DIGNITY_PHRASE.get(pf.dignity, 'placed')}"
            if sb:
                bit += f", Shadbala {sb}"
            if pf.vargottama:
                bit += ", vargottama"
            if pf.combust:
                bit += ", combust"
        factors.append(bit)

    activated = any(k in {chart.maha_lord, chart.antar_lord} for k in involved)
    if activated:
        factors.append("वर्तमान दशाले सक्रिय गरेको" if ne
                       else "Activated by the current dasha")

    if pol == "caution":
        level = "mixed" if weak_ct else "tentative"
    elif pol == "mixed":
        level = "mixed"
    else:  # benefic
        if strong_ct and not weak_ct:
            level = "strong" if (strong_ct >= 2 or activated) else "moderate"
        elif strong_ct and weak_ct:
            level = "mixed"
        elif weak_ct:
            level = "mixed"
        else:
            level = "moderate"

    parts: list[str] = []
    if pol != "caution":
        if strong_ct and not weak_ct:
            parts.append("यसका ग्रह यहाँ बलिया छन्, त्यसैले फल भरपर्दो छ" if ne
                         else "Its planets are strong here, so the result is dependable")
        elif weak_ct and not strong_ct:
            parts.append("यसका ग्रह कमजोर छन्, त्यसैले फल देखिन थप प्रयास चाहिन्छ" if ne
                         else "Its planets are on the weaker side, so the result "
                              "needs extra effort to show")
        elif strong_ct and weak_ct:
            parts.append("बल मिश्रित छ — केही समर्थन, केही घर्षण" if ne
                         else "Strength is mixed — some support, some friction")
    if activated:
        parts.append("अहिलेको दशाले यसलाई सक्रिय गरिरहेको छ" if ne
                     else "the running dasha is activating it now")
    base_text = _yoga_text(y, ne)
    if parts:
        synth = "; ".join(parts)
        base_text += f" {synth}।" if ne else f" {synth}."

    return {
        "label": _yoga_name(y, ne),
        "confidence": level,
        "polarity": pol,
        "text": base_text,
        "factors": factors,
    }


def build_sections(chart: Chart, *, now: datetime, lang: str = "en") -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    ne = lang == "ne"
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
    if ne:
        summary_body = [
            f"तीन कुराले तपाईंको सिंगो कुण्डलीको स्वर तय गर्छन्: तपाईंको लग्न (मानिससामु "
            f"कस्तो देखिनुहुन्छ), तपाईंको चन्द्र (भावना र मन), र तपाईंको सूर्य (भित्री मूल "
            f"स्वरूप)। यहाँ, {RASHI_NE[chart.lagna_sign]} लग्न छ, चन्द्र {RASHI_NE[chart.moon_sign]} "
            f"राशिमा (जन्म तारा {NAKSHATRA_NE[nak_i]}), र सूर्य {RASHI_NE[chart.sun_sign]} राशिमा।",
            f"सरल भाषामा भन्दा, तपाईं अरूसामु {SIGN_TRAIT_NE[chart.lagna_sign]} व्यक्तिका रूपमा "
            f"देखिनुहुन्छ।",
            f"तपाईंको लग्नको स्वामी ग्रह {PLANET_NE[lagna_lord]} "
            + (f"{_ord_ne(ll.house)} भावमा, यहाँ " if ll else "")
            + (DIGNITY_PHRASE_NE.get(ll.dignity, "रहेको") if ll else "रहेको")
            + f" — यसैले समग्रमा तपाईंको कुण्डली {_strength_word_ne(summary_conf.level)} आधारमा टिकेको छ।",
        ]
        if chart.dasha:
            d = chart.dasha
            summary_body.append(
                f"अहिलेको समय: तपाईं {PLANET_NE[d['maha_lord']]} को मुख्य जीवन-कालखण्ड (महादशा) मा "
                f"हुनुहुन्छ, जुन {_date(d['maha_end'], ne)} सम्म रहन्छ; यसभित्रको हालको उप-कालखण्ड "
                f"(अन्तर्दशा) {PLANET_NE[d['antar_lord']]} को हो, {_date(d['antar_start'], ne)} – "
                f"{_date(d['antar_end'], ne)}। मिति सहितको पूरा तालिका 'जीवन-कालखण्ड तालिका' खण्डमा छ।"
            )
        if benefic_yogas:
            summary_body.append(
                "तपाईंको कुण्डलीमा सक्रिय राम्रा संयोगहरू (योग): "
                + ", ".join(dict.fromkeys(_yoga_name(y, True) for y in benefic_yogas))
                + " — यिनको अर्थ तल 'योग' खण्डमा सजिलो भाषामा दिइएको छ।")
    else:
        summary_body = [
            f"Three things set the tone of your whole chart: your rising sign (how you come "
            f"across to others), your Moon (your emotions and mind), and your Sun (your core "
            f"self). Here, {RASHI_EN[chart.lagna_sign]} is rising, your Moon is in "
            f"{RASHI_EN[chart.moon_sign]} (birth star {NAKSHATRA_EN[nak_i]}), and your Sun is "
            f"in {RASHI_EN[chart.sun_sign]}.",
            f"In plain terms, you tend to come across to others as "
            f"{SIGN_TRAIT_EN[chart.lagna_sign]}.",
            f"The planet ruling your rising sign, {PLANET_EN[lagna_lord]}, is "
            + (f"in your {_ord(ll.house)} house and " if ll else "")
            + (DIGNITY_PHRASE.get(ll.dignity, "placed") if ll else "placed")
            + (" there" if ll else "")
            + f", so overall your chart rests on {_strength_word(summary_conf.level)} foundation.",
        ]
        if chart.dasha:
            d = chart.dasha
            summary_body.append(
                f"Where you are now: you're in {PLANET_EN[d['maha_lord']]}'s main life period "
                f"(mahadasha) until {_fmt_date(d['maha_end'])}, and the current sub-phase within "
                f"it (antardasha) belongs to {PLANET_EN[d['antar_lord']]}, running "
                f"{_fmt_date(d['antar_start'])} – {_fmt_date(d['antar_end'])}. The Life-period "
                f"timeline section gives the full schedule with dates."
            )
        if benefic_yogas:
            summary_body.append(
                "Helpful combinations (yogas) active in your chart: "
                + ", ".join(dict.fromkeys(y["name"] for y in benefic_yogas))
                + " — each is explained in plain words in the Yogas section below."
            )
    sections.append(_nsec(
        "executive_summary", "Executive summary", "सारांश",
        summary_body, summary_conf,
    ))

    # 2 — Personality -----------------------------------------------------------
    pers_conf = _planet_confidence(chart, lagna_lord)
    if ne:
        pers_body = [
            f"मानिससामु तपाईं प्रायः {SIGN_TRAIT_NE[chart.lagna_sign]} व्यक्तिका रूपमा "
            f"देखिनुहुन्छ ({RASHI_NE[chart.lagna_sign]} लग्न)।",
            f"तपाईं आफूलाई कसरी प्रस्तुत गर्नुहुन्छ भन्नेमा {PLANET_NE[lagna_lord]} ग्रहको सबैभन्दा "
            f"ठूलो हात हुन्छ, त्यसैले {_plain_theme(lagna_lord, True)} तपाईंको बाहिरी शैलीको ठूलो "
            f"हिस्सा हो।",
        ]
        if sun:
            pers_body.append(
                f"भित्री रूपमा, तपाईंको आत्म-छवि र इच्छाशक्ति {_plain_theme('sun', True)} वरिपरि "
                f"बनेको हुन्छ (सूर्य {RASHI_NE[sun.sign]} राशिमा)।")
        if "mercury" in P:
            me = P["mercury"]
            pers_body.append(
                f"तपाईं कसरी सोच्नुहुन्छ र कुरा गर्नुहुन्छ भन्ने बुधले देखाउँछ — तपाईंको मन "
                f"{_plain_theme('mercury', True)} तर्फ ढल्किन्छ।")
    else:
        pers_body = [
            f"To other people, you usually come across as {SIGN_TRAIT_EN[chart.lagna_sign]} "
            f"({RASHI_EN[chart.lagna_sign]} rising).",
            f"How you present yourself is shaped most by {PLANET_EN[lagna_lord]} (the planet "
            f"ruling your rising sign), so {_plain_theme(lagna_lord, False)} is a big part of "
            f"your outward style.",
        ]
        if sun:
            pers_body.append(
                f"Deeper down, your sense of self and drive is built around "
                f"{_plain_theme('sun', False)} (your Sun is in {RASHI_EN[sun.sign]})."
            )
        if "mercury" in P:
            pers_body.append(
                f"The way you think and communicate leans toward "
                f"{_plain_theme('mercury', False)}."
            )
    sections.append(_nsec("personality", "Personality & temperament",
                          "व्यक्तित्व", pers_body, pers_conf))

    # 3 — Emotional nature ------------------------------------------------------
    emo_conf = _planet_confidence(chart, "moon")
    emo_body = []
    if moon:
        if ne:
            emo_body.append(
                f"भावनात्मक रूपमा, तपाईं प्रायः {SIGN_TRAIT_NE[moon.sign]} हुनुहुन्छ "
                f"(चन्द्र {RASHI_NE[moon.sign]} राशिमा)।")
            emo_body.append(
                f"तपाईंलाई भावनात्मक सुरक्षा मुख्यतया {HOUSE_THEME_NE[moon.house]} सँग जोडिएको "
                f"हुन्छ। "
                + ("तपाईंको मन स्वाभाविक रूपमा स्थिर रहन्छ।"
                   if DIGNITY_SCORE.get(moon.dignity, 0) >= 1
                   else "विचारपूर्वक विश्राम, नियमित दिनचर्या र सहयोगी सङ्गतले तपाईंको मनलाई "
                        "शान्त राख्न स्पष्ट फाइदा दिन्छ।"))
        else:
            emo_body.append(
                f"Emotionally, you tend to be {SIGN_TRAIT_EN[moon.sign]} (your Moon is in "
                f"{RASHI_EN[moon.sign]}).")
            emo_body.append(
                f"Your sense of emotional security is mainly tied to {HOUSE_THEME[moon.house]}. "
                + ("Your mind tends to stay naturally steady."
                   if DIGNITY_SCORE.get(moon.dignity, 0) >= 1
                   else "Deliberate rest, a regular routine and supportive company clearly help "
                        "keep you calm and settled.")
            )
        aspectors = chart.aspects_to(moon.house)
        ben = [a for a in aspectors if a in NATURAL_BENEFICS]
        if ben:
            if ne:
                emo_body.append(", ".join(PLANET_NE[a] for a in ben)
                                + " को सहयोगी प्रभावले मनलाई अतिरिक्त सुरक्षा र आशावाद दिन्छ।")
            else:
                emo_body.append("A helpful, friendly influence from " + ", ".join(PLANET_EN[a] for a in ben)
                                + " lends the mind extra protection and optimism.")
    sections.append(_nsec("emotional_nature", "Emotional nature",
                          "भावनात्मक स्वभाव", emo_body, emo_conf))

    # 4 — Strengths -------------------------------------------------------------
    strengths = []
    str_conf = Confidence()
    strong_themes: list[str] = []
    for key, pf in sorted(P.items(), key=lambda kv: kv[1].shadbala_ratio or 0, reverse=True):
        if key not in PLAIN_THEME_EN:
            continue
        if pf.dignity in {"exalted", "own", "moolatrikona"} or pf.shadbala_status in {"Strong", "Exceptional"}:
            strong_themes.append(_plain_theme(key, ne))
            str_conf.support(f"{PLANET_EN[key]} dignified/strong")
    if strong_themes:
        joined = "; ".join(strong_themes)
        if ne:
            strengths.append(
                f"तपाईंको सबैभन्दा बलियो पक्षहरू यी हुन्: {joined}। यी कुरा तपाईंलाई स्वाभाविक "
                f"रूपमै सजिलै आउँछन्, त्यसैले तपाईं यिनमा भरोसा गरेर अगाडि बढ्न सक्नुहुन्छ।")
        else:
            strengths.append(
                f"Your strongest areas are: {joined}. These come more naturally to you, so "
                f"you can lean on them and build on them with confidence.")
    else:
        strengths.append(
            "कुनै ग्रह विशेष रूपमा बलियो छैन, तर धेरै ठीकठाक छन्; तपाईंको बल तयार भई "
            "आउनुभन्दा मिहिनेतबाट बन्दै जान्छ।" if ne else
            "No single area stands out as exceptionally strong, but several are solid; "
            "your strengths build through effort rather than arriving ready-made.")
    sections.append(_nsec("strengths", "Core strengths", "बल पक्ष",
                          strengths, str_conf))

    # 5 — Challenges ------------------------------------------------------------
    challenges = []
    ch_conf = Confidence()
    for key, pf in P.items():
        if key not in PLAIN_THEME_EN:
            continue
        if pf.dignity == "debilitated" or pf.shadbala_status in {"Weak", "Borderline"}:
            cancelled = any(y["key"].startswith(f"neechabhanga_{key}") for y in chart.yogas)
            theme = _plain_theme(key, ne)
            if ne:
                line = (f"{theme} — यी कुरा तुरुन्तै सहजै नआउन सक्छन्, र यिनमा सचेत प्रयास तथा "
                        f"अभ्यास चाहिन्छ।")
                if cancelled:
                    line += (" राम्रो कुरा — यहाँ यो कमजोरी रद्द गर्ने संयोग (नीचभंग) छ, "
                             "जसले यसलाई पछि गएर बलमा बदल्न सक्छ।")
            else:
                line = (f"{theme.capitalize()} may not come as easily to you, and can take "
                        f"conscious effort and practice.")
                if cancelled:
                    line += (" The good news: a pattern that cancels this weakness "
                             "(neecha-bhanga) tends to turn it into strength later on.")
            challenges.append(line)
            ch_conf.against(f"{PLANET_EN[key]} weak/debilitated")
    if not challenges:
        challenges.append(
            "कुनै ग्रह गम्भीर रूपमा पीडित छैन — चुनौतीहरू प्रायः परिस्थितिजन्य हुन्, गहिरो जरा गाडेका होइनन्।"
            if ne else
            "No planet is severely afflicted — challenges are likely "
            "situational rather than deep-seated.")
    challenges.append(
        "यिनलाई विकासका किनाराका रूपमा हेर्नुहोस् — धैर्य र सीप निर्माणले फल दिने क्षेत्र, स्थायी सीमा होइन।"
        if ne else
        "Treat these as growth edges: areas that reward patience and "
        "skill-building, not fixed limitations.")
    sections.append(_nsec("challenges", "Growth challenges", "चुनौती",
                          challenges, ch_conf))

    # 6 — Career ----------------------------------------------------------------
    car_conf = _house_confidence(chart, 10)
    tenth_lord = chart.house_lord[10]
    tl = chart.planet(tenth_lord)
    car_body = [_signified_house_planet(chart, 10, ne=ne)]
    if ne:
        if tl:
            car_body.append(
                f"तपाईंको करियरको दिशा, करियर हेर्ने ग्रह {PLANET_NE[tenth_lord]} तपाईंको "
                f"{_ord_ne(tl.house)} भावमा जानुले तय गर्छ — त्यसैले सार्वजनिक काम "
                f"{HOUSE_THEME_NE[tl.house].split(',')[0]} सँग मिसिन्छ।")
        if "saturn" in P and "sun" in P:
            car_body.append("सूर्य र शनि मिलेर काममा अधिकार/चिनारी र अनुशासित मिहिनेतको सन्तुलन देखाउँछन्।")
        if chart.maha_lord:
            car_body.append(
                f"अहिले तपाईं {PLANET_NE[chart.maha_lord]} को मुख्य जीवन-कालखण्डमा हुनुहुन्छ, जसले "
                f"हाल करियरलाई {DASHA_THEME_NE[chart.maha_lord]} ले रङ्ग्याउँछ।")
    else:
        if tl:
            car_body.append(
                f"Your career direction is set by the planet that rules your career area, "
                f"{PLANET_EN[tenth_lord]}, moving into your {_ord(tl.house)} house — so your "
                f"public work blends with {HOUSE_THEME[tl.house].split(',')[0]}."
            )
        if "saturn" in P and "sun" in P:
            car_body.append(
                "Sun and Saturn together describe the balance between authority/visibility "
                "and disciplined hard work in your working life.")
        if chart.maha_lord:
            car_body.append(
                f"You're currently in {PLANET_EN[chart.maha_lord]}'s main life period, which "
                f"right now colours your career with {DASHA_THEME[chart.maha_lord]}.")
    sections.append(_nsec("career", "Career & vocation", "पेशा / कर्म",
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
    fin_body = [_signified_house_planet(chart, 2, ne=ne), _signified_house_planet(chart, 11, ne=ne)]
    if ne:
        if "jupiter" in P:
            fin_body.append(
                f"धन र समृद्धिसँग सम्बन्धित ग्रह बृहस्पति {RASHI_NE[P['jupiter'].sign]} राशिको "
                f"{_ord_ne(P['jupiter'].house)} भावमा छ — यहाँ {DIGNITY_PHRASE_NE.get(P['jupiter'].dignity,'रहेको')}।")
        if dhana:
            fin_body.append("धन-निर्माण गर्ने धन योगले नियमित कमाइ र बचतको बानीबाट संचयलाई सघाउँछ।")
        fin_body.append("वित्त व्यवस्थित बचतमा राम्रो प्रतिक्रिया दिन्छ; कुण्डलीले प्रवृत्ति देखाउँछ, "
                        "बानीले नतिजा तय गर्छ।")
    else:
        if "jupiter" in P:
            fin_body.append(f"Jupiter, the planet naturally linked to wealth and good fortune, "
                            f"is in {RASHI_EN[P['jupiter'].sign]} (your {_ord(P['jupiter'].house)} "
                            f"house) — {DIGNITY_PHRASE.get(P['jupiter'].dignity,'placed')} there.")
        if dhana:
            fin_body.append("A wealth-forming Dhana yoga supports accumulation through "
                           "steady earning and saving habits.")
        fin_body.append("Finances respond best to systematic saving; the chart describes "
                       "tendencies, while habits decide outcomes.")
    sections.append(_nsec("finances", "Finances & wealth", "धन / वित्त",
                          fin_body, fin_conf))

    # 8 — Relationships ---------------------------------------------------------
    rel_conf = _house_confidence(chart, 7)
    if "venus" in P:
        v = P["venus"]
        if DIGNITY_SCORE.get(v.dignity, 0) >= 1:
            rel_conf.support(f"D1: Venus {DIGNITY_PHRASE.get(v.dignity,'well placed')}")
        elif DIGNITY_SCORE.get(v.dignity, 0) <= -2:
            rel_conf.against("D1: Venus debilitated")
    rel_body = [_signified_house_planet(chart, 7, ne=ne)]
    if ne:
        if "venus" in P:
            rel_body.append(
                f"प्रेम र साझेदारीसँग सम्बन्धित ग्रह शुक्र {RASHI_NE[P['venus'].sign]} राशिको "
                f"{_ord_ne(P['venus'].house)} भावमा छ — यहाँ {DIGNITY_PHRASE_NE.get(P['venus'].dignity,'रहेको')}। "
                "यसले तपाईंले नजिकको सम्बन्धमा के कुरालाई महत्व दिनुहुन्छ भन्ने देखाउँछ।")
        if any(a in NATURAL_MALEFICS for a in chart.aspects_to(7)):
            rel_body.append("साझेदारी भावमाथि कठोर मानिने ग्रहको प्रभाव परेकाले सम्बन्ध केही "
                            "परीक्षाबाट परिपक्व हुने सङ्केत हुन्छ — खुला सञ्चार र साझा मूल्यले बाटो सजिलो "
                            "बनाउँछन्। यो एउटा प्रवृत्ति मात्र हो, निश्चित परिणाम होइन।")
    else:
        if "venus" in P:
            rel_body.append(
                f"Venus, the planet linked to love and partnership, is in {RASHI_EN[P['venus'].sign]} "
                f"(your {_ord(P['venus'].house)} house) — {DIGNITY_PHRASE.get(P['venus'].dignity,'placed')} "
                "there. It describes what you value and look for in closeness.")
        if any(a in NATURAL_MALEFICS for a in chart.aspects_to(7)):
            rel_body.append("A challenging influence on the partnership house suggests relationships "
                           "mature through some testing — open communication and shared values "
                           "smooth the path. This is a tendency, not a fixed outcome.")
    sections.append(_nsec("relationships", "Relationships & partnership",
                          "सम्बन्ध", rel_body, rel_conf))

    # 9 — Family ----------------------------------------------------------------
    fam_conf = _house_confidence(chart, 4)
    fam_body = [
        _signified_house_planet(chart, 4, ne=ne),
        _signified_house_planet(chart, 9, ne=ne),
        _signified_house_planet(chart, 3, ne=ne),
    ]
    fam_body.append(
        "४ औं भावले माता र घर, ९ औं ले पिता र ज्येष्ठ, २ औं ले वृहत् परिवार, र ३ औं ले "
        "भाइबहिनी झल्काउँछ।" if ne else
        "The 4th reflects mother and home, the 9th the father and elders, "
        "the 2nd the wider family, and the 3rd siblings.")
    sections.append(_nsec("family", "Family & home", "परिवार",
                          fam_body, fam_conf))

    # 10 — Health ---------------------------------------------------------------
    hp_conf = _planet_confidence(chart, lagna_lord)
    if ne:
        health_body = [
            "ज्योतिषमा तपाईंको जीवनशक्ति लग्न (उदाउँदो राशि), यसको स्वामी ग्रह र चन्द्रबाट हेरिन्छ; "
            "६ औं भावले रोग, निको हुने क्रम र दैनिक दिनचर्या देखाउँछ।",
        ]
        if ll:
            health_body.append(
                f"तपाईंको लग्नको स्वामी ग्रह {PLANET_NE[lagna_lord]} ({_ord_ne(ll.house)} भावमा, "
                f"यहाँ {DIGNITY_PHRASE_NE.get(ll.dignity,'रहेको')}) "
                + ("बलियो शरीर र छिटो निको हुनेलाई सघाउँछ।"
                   if DIGNITY_SCORE.get(ll.dignity, 0) >= 1
                   else "सक्रिय आत्म-हेरचाह खोज्छ — नियमित निद्रा, चाल र तनाव व्यवस्थापनले ठूलो फाइदा दिन्छ।"))
        health_body.append(_signified_house_planet(chart, 6, ne=True))
        health_body.append("यो कुण्डलीका प्रवृत्तिबाट स्वास्थ्य मार्गदर्शन हो, चिकित्सा सल्लाह होइन; "
                           "कुनै समस्यामा योग्य पेशेवरसँग सल्लाह लिनुहोस्।")
    else:
        health_body = [
            "In Vedic astrology, your vitality is read from the rising sign, its ruling planet, "
            "and the Moon; the 6th house describes illness, recovery and daily routine.",
        ]
        if ll:
            health_body.append(
                f"Your rising-sign ruler {PLANET_EN[lagna_lord]} (in your {_ord(ll.house)} house, "
                f"{DIGNITY_PHRASE.get(ll.dignity,'placed')} there) "
                + ("supports a robust constitution and quick recovery."
                   if DIGNITY_SCORE.get(ll.dignity, 0) >= 1
                   else "asks for proactive self-care — regular sleep, movement and stress "
                        "management have outsized benefit."))
        health_body.append(_signified_house_planet(chart, 6))
        health_body.append("This is wellbeing guidance from chart tendencies, not medical "
                          "advice; consult a qualified professional for any concern.")
    sections.append(_nsec("health_wellbeing", "Health & wellbeing",
                          "स्वास्थ्य", health_body, hp_conf))

    # 11 — Spiritual growth -----------------------------------------------------
    sp_conf = _house_confidence(chart, 9)
    sp_body = [_signified_house_planet(chart, 9, ne=ne), _signified_house_planet(chart, 12, ne=ne)]
    if ne:
        if "jupiter" in P:
            sp_body.append(f"बृहस्पति {_ord_ne(P['jupiter'].house)} भावमा भएकाले ज्ञान, नैतिकता र "
                           "गुरुत्व स्वाभाविक रूपमा विकास हुने ठाउँ देखाउँछ।")
        if "ketu" in P:
            sp_body.append(f"केतु {_ord_ne(P['ketu'].house)} भावमा ({RASHI_NE[P['ketu'].sign]}) — "
                           "जहाँ तपाईंले सहज दक्षता र वैराग्यको झुकाव बोक्नुहुन्छ।")
    else:
        if "jupiter" in P:
            sp_body.append(f"Jupiter in house {P['jupiter'].house} points to where wisdom, "
                          "ethics and mentorship naturally develop.")
        if "ketu" in P:
            sp_body.append(f"Ketu in house {P['ketu'].house} ({RASHI_EN[P['ketu'].sign]}) shows "
                          "where you carry instinctive mastery and a pull toward detachment.")
    sections.append(_nsec("spiritual_growth", "Spiritual growth",
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
        if ne:
            phase_body.append(
                f"अहिले तपाईं {PLANET_NE[d['maha_lord']]} को मुख्य जीवन-कालखण्ड (महादशा) मा "
                f"हुनुहुन्छ ({_date(d['maha_end'], ne)} सम्म); यसभित्रको हालको उप-कालखण्ड "
                f"(अन्तर्दशा) {PLANET_NE[d['antar_lord']]} को हो, {_date(d['antar_start'], ne)} देखि "
                f"{_date(d['antar_end'], ne)} सम्म। यो समयले {DASHA_THEME_NE[d['maha_lord']]} मा जोड दिन्छ।")
            if ml:
                owns_txt = (f" र तपाईंको {', '.join(_ord_ne(h) for h in owns)} भावको स्वामी हो"
                            if owns else "")
                firm = ("नतिजा सजिलै आउने प्रवृत्ति हुन्छ"
                        if DIGNITY_SCORE.get(ml.dignity, 0) >= 1 or ml.shadbala_status in {"Strong", "Exceptional"}
                        else "नतिजाले धैर्य र निरन्तर प्रयास माग्छ")
                phase_body.append(
                    f"{PLANET_NE[d['maha_lord']]} तपाईंको {_ord_ne(ml.house)} भावमा छ{owns_txt}, "
                    f"त्यसैले अवधि {HOUSE_THEME_NE[ml.house].split(',')[0]} र यसले शासन गर्ने भावमा "
                    f"केन्द्रित हुन्छ। यो {DIGNITY_PHRASE_NE.get(ml.dignity, 'स्थित')} छ — {firm}।")
            if al and d["antar_lord"] != d["maha_lord"]:
                phase_body.append(
                    f"यसभित्रको {PLANET_NE[d['antar_lord']]} उप-कालखण्डले "
                    f"{DASHA_THEME_NE[d['antar_lord']].split(',')[0]} लाई थप तिखार्छ (यो तपाईंको "
                    f"{_ord_ne(al.house)} भावसँग जोडिन्छ) — {_date(d['antar_end'], ne)} सम्म।")
        else:
            phase_body.append(
                f"You're in {PLANET_EN[d['maha_lord']]}'s main life period (mahadasha) until "
                f"{_fmt_date(d['maha_end'])}, and the current sub-phase within it (antardasha) "
                f"belongs to {PLANET_EN[d['antar_lord']]}, from {_fmt_date(d['antar_start'])} to "
                f"{_fmt_date(d['antar_end'])}. This phase emphasises {DASHA_THEME[d['maha_lord']]}.")
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
                    f"Within it, the {PLANET_EN[d['antar_lord']]} sub-period sharpens the theme of "
                    f"{DASHA_THEME[d['antar_lord']].split(',')[0]} (linked to your "
                    f"{_ord(al.house)} house) until {_fmt_date(d['antar_end'])}.")
    else:
        phase_body.append("हालको मितिका लागि दशा समय निकाल्न सकिएन।" if ne else
                          "Dasha timing could not be resolved for the current date.")
    sections.append(_nsec("current_life_phase", "Current life phase",
                          "वर्तमान जीवन-कालखण्ड", phase_body, phase_conf))

    # 12b — Life journey (past → present → future chapters) ---------------------
    journey = _life_journey_section(chart, now, lang)
    if journey:
        sections.append(journey)

    # 13 — Dasha timeline (precise dates) ---------------------------------------
    if d:
        horizon = now + timedelta(days=420)
        timeline_items: list[dict[str, Any]] = []
        for b in d["bhuktis"]:
            if b["end"] < now or b["start"] > horizon:
                continue
            lf = chart.planet(b["lord"])
            running = b["start"] <= now < b["end"]
            if ne:
                house_txt = f" — तपाईंको {_ord_ne(lf.house)} भावसँग जोडिन्छ" if lf else ""
                label = f"{PLANET_NE[b['lord']]} उप-कालखण्ड" + (" · अहिले चलिरहेको" if running else "")
                text = (f"{_date(b['start'], ne)} → {_date(b['end'], ne)}: "
                        f"{DASHA_THEME_NE[b['lord']].split(',')[0]}{house_txt}।")
            else:
                house_txt = f" — linked to your {_ord(lf.house)} house" if lf else ""
                label = f"{PLANET_EN[b['lord']]} sub-period" + (" · running now" if running else "")
                text = (f"{_fmt_date(b['start'])} → {_fmt_date(b['end'])}: "
                        f"{DASHA_THEME[b['lord']].split(',')[0]}{house_txt}.")
            timeline_items.append({
                "label": label,
                "confidence": _planet_confidence(chart, b["lord"]).level if lf else "tentative",
                "text": text,
            })
        for m in d["upcoming_maha"]:
            if ne:
                label = f"{PLANET_NE[m['lord']]} जीवन-कालखण्ड (अर्को प्रमुख कालखण्ड)"
                text = (f"{_date(m['start'], ne)} देखि सुरु भई {_date(m['end'], ne)} सम्म "
                        f"({DASHA_YEARS[m['lord']]} वर्ष): {DASHA_THEME_NE[m['lord']].split(',')[0]} को अध्याय।")
            else:
                label = f"{PLANET_EN[m['lord']]} life period (next major chapter)"
                text = (f"Begins {_fmt_date(m['start'])}, lasting to {_fmt_date(m['end'])} "
                        f"({DASHA_YEARS[m['lord']]} yrs): a {DASHA_THEME[m['lord']].split(',')[0]} chapter.")
            timeline_items.append({"label": label, "confidence": "moderate", "text": text})
        timeline_body = [
            f"अहिले चलिरहेको {PLANET_NE[d['maha_lord']]} जीवन-कालखण्डभित्रका उप-कालखण्डहरूको "
            f"तालिका, अनि पछि आउने ठूला जीवन-कालखण्डहरू — तपाईंको समयको सबैभन्दा सूक्ष्म तह।" if ne else
            f"The schedule of sub-periods inside your current {PLANET_EN[d['maha_lord']]} life "
            f"period, and the big life periods that follow — the most precise timing layer of "
            f"your chart.",
        ]
        sections.append(_nsec("dasha_timeline", "Life-period timeline (with dates)",
                              "जीवन-कालखण्ड तालिका", timeline_body, items=timeline_items))

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
        if ne:
            outlook_body.append(
                f"आगामी वर्षको नेतृत्व {PLANET_NE[lead]} को उप-कालखण्डले गर्छ ({_date(d['antar_end'], ne)} "
                f"सम्म), {DASHA_THEME_NE[lead]} लाई अगाडि ल्याउँदै।")
            if lf:
                good = DIGNITY_SCORE.get(lf.dignity, 0) >= 1 or lf.shadbala_status in {"Strong", "Exceptional"}
                outlook_body.append(
                    (f"यो राम्रोसँग स्थित छ (तपाईंको {_ord_ne(lf.house)} भावमा), त्यसैले यसका "
                     "क्षेत्रका पहल अनुकूल छन् — अगाडि बढ्ने राम्रो अवसर।"
                     if good else
                     f"यो केही दबाबमा छ (तपाईंको {_ord_ne(lf.house)} भावमा), त्यसैले प्रयासलाई "
                     "गति दिनुहोस् र नतिजा जबरजस्ती नगरी तयारी गर्नुहोस्।"))
            if upcoming:
                nxt = upcoming[0]
                outlook_body.append(
                    f"आउने परिवर्तन: {PLANET_NE[nxt['lord']]} को उप-कालखण्ड {_date(nxt['start'], ne)} मा "
                    f"सुरु हुन्छ, {DASHA_THEME_NE[nxt['lord']].split(',')[0]} लाई अगाडि ल्याउँदै।")
        else:
            outlook_body.append(
                f"The year ahead is led by {PLANET_EN[lead]}'s sub-period (through "
                f"{_fmt_date(d['antar_end'])}), bringing {DASHA_THEME[lead]} to the fore.")
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
        outlook_body.append(
            "सटीक दशा-आधारित दृष्टिकोणका लागि आजको मितिको स्पष्ट तालिका आवश्यक छ।" if ne else
            "A precise dasha-based outlook needs a resolvable timeline for today's date.")
    sections.append(_nsec("outlook_12_months", "Outlook — next 12 months",
                          "आगामी १२ महिना", outlook_body, out_conf))

    # 14b — What to pursue & when (actionable, dasha-timed) ---------------------
    sections.append(_pursue_section(chart, now, lang))

    # 14 — Opportunities --------------------------------------------------------
    opp = []
    for h in (TRIKONA | {11}):
        hc = _house_confidence(chart, h)
        if hc.level in {"strong", "moderate"}:
            if ne:
                opp.append(f"{_ord_ne(h)} भाव ({HOUSE_THEME_NE[h].split(',')[0]}) राम्रोसँग "
                           "समर्थित छ — ऊर्जा लगाउने स्वाभाविक क्षेत्र।")
            else:
                opp.append(f"The {_ord(h)} house ({HOUSE_THEME[h].split(',')[0]}) is well "
                           "supported — a natural area to invest energy.")
    for y in chart.yogas:
        if y["polarity"] == "benefic":
            opp.append(f"{_yoga_name(y, ne)}: {_yoga_text(y, ne)}")
    if not opp:
        opp.append(
            "अवसर क्रमशः निर्माण हुन्छन्; आफ्नो बलियो ग्रहको क्षेत्रमा निरन्तरताले राम्रो "
            "प्रतिफल दिन्छ।" if ne else
            "Opportunities are built incrementally here; consistency in your "
            "strongest planet's domain compounds well."
        )
    sections.append({
        "id": "opportunities", "title_en": "Opportunities", "title_ne": "अवसर",
        "body": opp, "prelocalized": True,
    })

    # 15 — Cautions -------------------------------------------------------------
    caut = []
    for h in DUSTHANA:
        hc = _house_confidence(chart, h)
        if hc.level == "mixed" or hc.contradicts:
            if ne:
                caut.append(f"{HOUSE_THEME_NE[h].split(',')[0]} ({_ord_ne(h)} भाव) मा स्थिर "
                            "हात राख्नुहोस् — बल प्रयोग नगरी व्यवस्थापन गर्नुहोस्।")
            else:
                caut.append(f"Keep a steady hand with {HOUSE_THEME[h].split(',')[0]} "
                            f"(the {_ord(h)} house) — manage rather than force.")
    for y in chart.yogas:
        if y["polarity"] == "caution":
            caut.append(f"{_yoga_name(y, ne)}: {_yoga_text(y, ne)}")
    caut.append(
        "यीमध्ये कुनै पनि दुर्भाग्यको भविष्यवाणी होइनन् — सचेतना र संयमले प्रगति जोगाउने "
        "क्षेत्रहरू हुन्।" if ne else
        "None of these are predictions of misfortune — they are areas where "
        "awareness and moderation protect your progress."
    )
    sections.append({
        "id": "cautions", "title_en": "Areas for caution", "title_ne": "सावधानी",
        "body": caut, "prelocalized": True,
    })

    # 16 — Practical recommendations -------------------------------------------
    strong, weak = _strongest(chart), _weakest(chart)
    if ne:
        rec = [
            f"तपाईंको बलियो पक्ष — {_plain_theme(strong, True)} — मा ध्यान दिनुहोस्; यहाँ "
            "प्रगति सबैभन्दा सजिलो हुन्छ।",
            f"कमजोर पक्ष — {_plain_theme(weak, True)} — लाई छोड्ने होइन, बरु साना नियमित "
            "बानीबाट बिस्तारै बलियो बनाउनुहोस्; पूरै तयार भएको महसुस नभएसम्म नपर्खनुहोस्।",
            "ठूला निर्णय माथि देखाइएका अनुकूल समयमा गर्नुहोस्, ताकि समय तपाईंको साथमा हुँदा "
            "काम अघि बढोस्।",
            "तल दिइएका हरेक प्राथमिकताका लागि एउटा सानो बानी छान्नुहोस् र अर्को तीन महिना "
            "निरन्तर पछ्याउनुहोस्।",
        ]
    else:
        rec = [
            f"Play to your strengths — {_plain_theme(strong, False)}. This is where "
            "progress comes easiest for you.",
            f"Don't avoid your weaker side — {_plain_theme(weak, False)}. Build it up "
            "slowly with small, regular habits instead of waiting until you feel ready.",
            "Save big decisions for the good times highlighted above, so you act when "
            "the timing is on your side.",
            "Pick one small habit for each priority below and stick with it for the "
            "next three months.",
        ]
    sections.append(_nsec("practical_recommendations", "Practical recommendations",
                          "व्यावहारिक सुझाव", rec))

    # 17 — Traditional spiritual practices (optional) ---------------------------
    if ne:
        practices = [
            "यी पारम्परिक, आस्थामा आधारित उपाय वैकल्पिक सहयोगका रूपमा दिइएका हुन् — "
            "सांस्कृतिक अभ्यास, अनिवार्यता वा ग्यारेन्टी होइन।",
            f"{PLANET_NE[weak]} का विषय बलियो बनाउन शास्त्रले यसको वारको व्रत, {PLANET_NE[weak]} "
            "सँग सम्बन्धित दान, र त्यस क्षेत्रमा शान्त, आदरपूर्ण आचरण सुझाउँछ।",
            f"{PLANET_NE[strong]} का विषयमा कृतज्ञताको अभ्यासले भएको बललाई अझ राम्ररी प्रयोग गर्न सघाउँछ।",
            "सबैभन्दा माथि, नैतिक आचरण (सदाचार) र स्थिरता हरेक परम्पराले मान्ने उपाय हुन्।",
        ]
    else:
        practices = [
            "These are traditional, faith-based remedies offered as optional support — "
            "they are cultural practices, not requirements or guarantees.",
            f"For strengthening {PLANET_EN[weak]} themes, classical texts suggest its "
            f"weekday observance, charity associated with {PLANET_EN[weak]}, and respectful, "
            "calm conduct in that life area.",
            f"Gratitude practices around {PLANET_EN[strong]} themes help you make the most "
            "of an existing strength.",
            "Above all, ethical action (sadachara) and steadiness are the "
            "remedies every tradition agrees on.",
        ]
    sections.append(_nsec("spiritual_practices",
                          "Traditional spiritual practices (optional)",
                          "पारम्परिक उपाय (वैकल्पिक)", practices, optional=True))

    # 18 — Planet by planet -----------------------------------------------------
    planet_items = []
    for key in PLANET_KEYS:
        if key not in P:
            continue
        conf = _planet_confidence(chart, key)
        pf = P[key]
        if ne:
            text = (_planet_line(chart, key, ne=True)
                    + f" यसले जीवनमा {KARAKA_NE[key]} लाई प्रतिनिधित्व गर्छ।"
                    + (f" यसको समग्र बल {_SHADBALA_STATUS_NE.get(pf.shadbala_status, pf.shadbala_status)} "
                       "छ।" if pf.shadbala_status else ""))
            label = PLANET_NE[key]
        else:
            text = (_planet_line(chart, key)
                    + f" In life it stands for {KARAKA[key]}."
                    + (f" Its overall strength is {pf.shadbala_status.lower()}." if pf.shadbala_status else ""))
            label = f"{PLANET_EN[key]} ({PLANET_NE[key]})"
        planet_items.append({
            "label": label,
            "confidence": conf.level,
            "factors": conf.factors,
            "text": text,
        })
    sections.append(_nsec("planet_by_planet", "Planet by planet",
                          "ग्रह विश्लेषण", [], items=planet_items))

    # 19 — House by house -------------------------------------------------------
    house_items = []
    for h in range(1, 13):
        conf = _house_confidence(chart, h)
        house_items.append({
            "label": f"{HOUSE_THEME_NE[h].split(',')[0].capitalize()} ({_ord_ne(h)} भाव)" if ne
                     else f"{HOUSE_THEME[h].split(',')[0].capitalize()} (house {h})",
            "confidence": conf.level,
            "factors": conf.factors,
            "text": _signified_house_planet(chart, h, ne=ne),
        })
    sections.append(_nsec("house_by_house", "House by house",
                          "भाव विश्लेषण", [], items=house_items))

    # 20 — Divisional (D-chart) summary -----------------------------------------
    sections.append(_divisional_section(chart, ne=ne))

    # 21 — Yogas ----------------------------------------------------------------
    if chart.yogas:
        yoga_items = [_yoga_report_item(chart, y, ne=ne) for y in chart.yogas]
        yoga_body = ([
            "योग भनेको ग्रहहरूको विशेष संयोजन हो जसले जीवनमा निश्चित प्रवृत्ति ल्याउँछ। "
            "तल तपाईंको कुण्डलीमा बनेका योग, तिनमा संलग्न ग्रहको बल, र हालको दशाले "
            "तिनलाई सक्रिय गरेको छ कि छैन भन्ने सहित दिइएको छ।",
        ] if ne else [
            "A yoga is a specific planetary combination that inclines the chart "
            "toward a particular tendency. Below are the yogas formed in your chart, "
            "with the strength of the planets involved and whether the running dasha "
            "is activating them.",
        ])
        sections.append({
            "id": "yoga_explanations", "title_en": "Yogas in your chart",
            "title_ne": "योग", "body": yoga_body, "items": yoga_items,
            "prelocalized": True,
        })
    else:
        sections.append({
            "id": "yoga_explanations", "title_en": "Yogas in your chart",
            "title_ne": "योग", "prelocalized": True,
            "body": [
                "तपाईंको कुण्डलीमा छानिएका मुख्य शास्त्रीय योगमध्ये कुनै सक्रिय छैन; कुण्डली "
                "माथिका ग्रह र भाव स्थितिबाट पढिन्छ।" if ne else
                "No major classical yoga from the curated set is active; "
                "the chart reads through planet and house placements above."
            ],
        })

    # 22 — Action plan ----------------------------------------------------------
    plan = _action_plan(chart, ne=ne)
    sections.append(_nsec("action_plan", "Top 5 priorities", "मुख्य ५ प्राथमिकता", plan))

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


def _action_plan(chart: Chart, *, ne: bool = False) -> list[str]:
    strong, weak = _strongest(chart), _weakest(chart)
    if ne:
        plan = [
            f"१. तपाईं स्वाभाविक रूपमा राम्रो भएको कुरा — {_plain_theme(strong, True)} — मा "
            "आधार बनाउनुहोस्। यसले सबैभन्दा छिटो नतिजा दिन्छ।",
            f"२. कमजोर पक्ष — {_plain_theme(weak, True)} — लाई सरल साप्ताहिक दिनचर्यामा "
            "ढाल्नुहोस्, ताकि यसले तपाईंलाई रोक्न छाडोस्।",
        ]
        if chart.maha_lord:
            plan.append(
                f"३. अहिले तपाईंको जीवनमा {_plain_theme(chart.maha_lord, True)} लाई साथ दिने "
                "समय चलिरहेको छ — ठूला कदम यसै बेला चाल्नुहोस्।")
        else:
            plan.append("३. ठूला कदम माथि देखाइएका अनुकूल समयमा चाल्नुहोस्।")
        plan.append(
            "४. करियर र प्रतिष्ठाका लागि निरन्तर, अरूले देख्ने गरी काम गर्दै रहनुहोस्।")
        plan.append("५. इमानदार र स्थिर दैनिक दिनचर्या कायम राख्नुहोस् — यसैले जीवनको हरेक "
                    "पक्ष चुपचाप बलियो बनाउँछ।")
        return plan
    plan = [
        f"1. Build on what you're naturally good at — {_plain_theme(strong, False)}. "
        "This gives you the fastest results.",
        f"2. Turn your weaker side — {_plain_theme(weak, False)} — into a simple "
        "weekly routine so it stops holding you back.",
    ]
    if chart.maha_lord:
        plan.append(
            f"3. You're currently in a life phase that favours "
            f"{_plain_theme(chart.maha_lord, False)} — use this time for your bigger moves.")
    else:
        plan.append("3. Time your bigger moves for the good periods highlighted above.")
    plan.append(
        "4. For your career and reputation, keep showing up with steady, visible work.")
    plan.append("5. Keep an honest, steady daily routine — it's the one thing that "
                "quietly strengthens every part of your life.")
    return plan


# ── Public API ────────────────────────────────────────────────────────────────

def build_report(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                 shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                 *, now: Optional[datetime] = None,
                 is_day: Optional[bool] = None,
                 gulika_lon: Optional[float] = None,
                 mandi_lon: Optional[float] = None) -> dict[str, Any]:
    """Full structured report as a single dict (meta + sections)."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    chart = build_chart(
        planets_raw, lagna_raw, shadbala_raw, dasha_raw, now,
        is_day=is_day, gulika_lon=gulika_lon, mandi_lon=mandi_lon,
    )
    sections = build_sections(chart, now=now)
    return {"meta": _meta(chart, now), "sections": sections}


def iter_report(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                *, now: Optional[datetime] = None, lang: str = "en",
                is_day: Optional[bool] = None,
                gulika_lon: Optional[float] = None,
                mandi_lon: Optional[float] = None) -> Iterator[dict[str, Any]]:
    """Yield a ``meta`` record, then one record per section — for streaming."""
    lang = "en" if str(lang).startswith("en") else "ne"
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    chart = build_chart(
        planets_raw, lagna_raw, shadbala_raw, dasha_raw, now,
        is_day=is_day, gulika_lon=gulika_lon, mandi_lon=mandi_lon,
    )
    meta = _localize_meta(_meta(chart, now, ne=(lang == "ne")), lang)
    yield {"kind": "meta", **meta}
    sections = build_sections(chart, now=now, lang=lang)
    total = len(sections)
    for i, section in enumerate(sections):
        localized = {k: v for k, v in _localize_section(section, lang).items()
                     if k != "prelocalized"}
        yield {"kind": "section", "index": i, "total": total, **localized}
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
    "exalted": "उत्कृष्ट अवस्थामा, अत्यन्तै बलियो",
    "moolatrikona": "अत्यन्तै सहज र बलियो",
    "own": "स्थिर र आत्मविश्वासी",
    "friend": "राम्रोसँग समर्थित",
    "neutral": "तटस्थ अवस्थामा",
    "enemy": "अलिकति दबाबमा",
    "debilitated": "कमजोर, सचेत प्रयास चाहिने",
    "placed": "रहेको",
    "well placed": "राम्रोसँग रहेको",
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
    # Full dignity phrase values (e.g. "in its own sign (stable and self-assured)")
    # — these appear verbatim in confidence factors, so map value→value.
    for k, en_val in DIGNITY_PHRASE.items():
        if k in DIGNITY_PHRASE_NE:
            pairs.append((en_val, DIGNITY_PHRASE_NE[k]))
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


_NE_WORD_MAP: Optional[list[tuple[str, str]]] = None


def _ne_word_map() -> list[tuple[str, str]]:
    """Word-boundary EN→NE map for theme 'heads' (career, wisdom, growth …) and
    Shadbala status words that the phrase table leaves behind. Applied last with
    \\b boundaries so it never bites into a longer English word."""
    global _NE_WORD_MAP
    if _NE_WORD_MAP is None:
        m: dict[str, str] = {}
        for d_en, d_ne in ((HOUSE_THEME, HOUSE_THEME_NE),
                            (DASHA_THEME, DASHA_THEME_NE),
                            (KARAKA, KARAKA_NE)):
            for k in d_en:
                en_head = d_en[k].split(",")[0].strip()
                ne_head = d_ne[k].split(",")[0].strip()
                if en_head and ne_head:
                    m.setdefault(en_head, ne_head)
        m.update({
            "Exceptional": "असाधारण", "Strong": "बलियो", "Adequate": "पर्याप्त",
            "Borderline": "सीमान्त", "Weak": "कमजोर",
            "well supported": "राम्रोसँग समर्थित", "well-supported": "राम्रोसँग समर्थित",
            "supported": "समर्थित", "next major period": "अर्को प्रमुख अवधि",
        })
        _NE_WORD_MAP = sorted(m.items(), key=lambda kv: len(kv[0]), reverse=True)
    return _NE_WORD_MAP


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
    # Theme heads + Shadbala status words the phrase table missed.
    for en, ne in _ne_word_map():
        out = re.sub(rf"\b{re.escape(en)}\b", ne, out, flags=re.I)
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
    # Sections built natively in the requested language skip the phrase
    # translator for their prose — but their confidence `factors` are still
    # authored in English (diagnostic evidence), so translate just those.
    if section.get("prelocalized"):
        if not section.get("factors") and not section.get("items"):
            return section
        out = dict(section)
        if section.get("factors"):
            out["factors"] = [_localize_text_ne(f) for f in section["factors"]]
        if section.get("items"):
            items = []
            for it in section["items"]:
                if it.get("factors"):
                    it = {**it, "factors": [_localize_text_ne(f) for f in it["factors"]]}
                items.append(it)
            out["items"] = items
        return out
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


def _meta(chart: Chart, now: datetime, *, ne: bool = False) -> dict[str, Any]:
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
            "ends": _date(chart.dasha["maha_end"], ne),
            "antardasha": chart.dasha["antar_lord"],
            "antardasha_en": PLANET_EN[chart.dasha["antar_lord"]],
            "antardasha_ne": PLANET_NE[chart.dasha["antar_lord"]],
            "antardasha_ends": _date(chart.dasha["antar_end"], ne),
            "window": chart.maha_window,
        },
        "yoga_count": len(chart.yogas),
        "generated_at": now.isoformat(),
        "method": "Deterministic Parashari interpretation with confidence weighting",
        "disclaimer": "For reflection and cultural insight. Describes tendencies and "
                      "probabilities, not certainties; not a substitute for professional advice.",
    }
