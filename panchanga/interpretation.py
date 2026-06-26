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
stays importable (and unit-testable) without the Swiss Ephemeris native
dependency.
"""

from __future__ import annotations

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
    shadbala_status: Optional[str] = None
    shadbala_ratio: Optional[float] = None


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


def _current_dasha(sequence: list[dict[str, Any]], now: datetime) -> tuple[
    Optional[str], Optional[str], Optional[tuple[str, str]]
]:
    """Running mahadasha lord, current antardasha (bhukti) lord, and window.

    The antardasha is derived by mapping ``now`` onto the standard bhukti
    proportions of the mahadasha. This works for full mahadashas and for the
    shorter birth-balance period (we align the proportion to the period's end).
    """
    for period in sequence:
        start = _parse_iso(period["start"])
        end = _parse_iso(period["end"])
        if start <= now < end:
            maha_lord = period["lord"]
            full = timedelta(days=DASHA_YEARS[maha_lord] * DAYS_PER_YEAR)
            visible = end - start
            # Fraction of a full mahadasha that this (possibly partial) window
            # represents; the visible window is its tail.
            f0 = max(0.0, 1.0 - (visible / full if full else 1.0))
            frac = f0 + (now - start) / full if full else 0.0
            antar = _bhukti_lord(maha_lord, frac)
            return maha_lord, antar, (period["start"], period["end"])
    return None, None, None


def _bhukti_lord(maha_lord: str, frac: float) -> str:
    """Bhukti lord at fractional position ``frac`` (0..1) of the mahadasha."""
    frac = min(max(frac, 0.0), 0.999999)
    start_idx = DASHA_ORDER.index(maha_lord)
    cumulative = 0.0
    for step in range(len(DASHA_ORDER)):
        lord = DASHA_ORDER[(start_idx + step) % len(DASHA_ORDER)]
        span = DASHA_YEARS[lord] / 120.0
        if cumulative <= frac < cumulative + span:
            return lord
        cumulative += span
    return maha_lord


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


def build_chart(planets_raw: dict[str, Any], lagna_raw: dict[str, Any],
                shadbala_raw: dict[str, Any], dasha_raw: dict[str, Any],
                now: datetime) -> Chart:
    """Assemble all derived facts from the raw API payloads."""
    lagna_lon = float(lagna_raw["longitude"])
    lagna_sign = sign_of(lagna_lon)
    sb_index = _shadbala_index(shadbala_raw)

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
        sb = sb_index.get(key)
        planets[key] = PlanetFact(
            key=key,
            longitude=lon,
            sign=sign,
            house=house,
            retrograde=bool(raw.get("is_retrograde", raw.get("retrograde", False))),
            dignity=_dignity(key, lon),
            navamsa=d9,
            vargottama=(sign == d9),
            shadbala_status=sb["status"] if sb else None,
            shadbala_ratio=sb["ratio"] if sb else None,
        )
        house_occupants[house].append(key)

    moon_sign = planets["moon"].sign if "moon" in planets else lagna_sign
    sun_sign = planets["sun"].sign if "sun" in planets else lagna_sign

    house_lord: dict[int, str] = {}
    house_lord_house: dict[int, int] = {}
    for h in range(1, 13):
        sign = (lagna_sign + (h - 1)) % 12
        lord = SIGN_LORD[sign]
        house_lord[h] = lord
        if lord in planets:
            house_lord_house[h] = planets[lord].house

    yogas = _detect_yogas(planets, lagna_sign, moon_sign)

    maha_lord, antar_lord, maha_window = _current_dasha(
        dasha_raw.get("sequence", []), now
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
    bits = [f"{PLANET_EN[key]} ({PLANET_NE[key]}) is in {RASHI_EN[pf.sign]}, "
            f"in the {_ord(pf.house)} house"]
    if pf.dignity:
        bits.append(DIGNITY_PHRASE.get(pf.dignity, pf.dignity))
    if pf.retrograde and key not in {"rahu", "ketu"}:
        bits.append("retrograde (its themes turn inward and are revisited)")
    if pf.vargottama:
        bits.append("vargottama")
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
    summary_body = [
        f"This is a {RASHI_EN[chart.lagna_sign]} lagna chart with the Moon in "
        f"{RASHI_EN[chart.moon_sign]} and the Sun in {RASHI_EN[chart.sun_sign]}. "
        f"Read the rising sign for how you meet the world, the Moon for your inner "
        f"emotional climate, and the Sun for your core sense of self.",
        f"The ascendant lord {PLANET_EN[lagna_lord]} is "
        + (DIGNITY_PHRASE.get(ll.dignity, "placed") if ll else "placed")
        + (f" in the {_ord(ll.house)} house" if ll else "")
        + ". Overall the chart shows "
        + _strength_word(summary_conf.level)
        + " foundation; the sections below weigh each life area on its own evidence "
        "and flag where signals agree or pull in different directions.",
    ]
    if benefic_yogas:
        summary_body.append(
            "Notable supportive patterns: "
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
    if chart.maha_lord:
        phase_conf = _planet_confidence(chart, chart.maha_lord)
        ml = chart.planet(chart.maha_lord)
        owns = [h for h, lord in chart.house_lord.items() if lord == chart.maha_lord]
        phase_body.append(
            f"You are currently in the {PLANET_EN[chart.maha_lord]} mahadasha"
            + (f" with {PLANET_EN[chart.antar_lord]} antardasha" if chart.antar_lord else "")
            + f". This phase emphasises {DASHA_THEME[chart.maha_lord]}.")
        if ml:
            phase_body.append(
                f"Because {PLANET_EN[chart.maha_lord]} sits in your {_ord(ml.house)} house"
                + (f" and rules your {', '.join(_ord(h) for h in owns)} house(s)" if owns else "")
                + f", the period channels into {HOUSE_THEME[ml.house].split(',')[0]} and "
                f"related matters. Its dignity ({DIGNITY_PHRASE.get(ml.dignity,'placed')}) "
                "indicates how smoothly those results arrive.")
        if chart.antar_lord and chart.antar_lord != chart.maha_lord:
            phase_body.append(
                f"The {PLANET_EN[chart.antar_lord]} antardasha adds a sub-theme of "
                f"{DASHA_THEME[chart.antar_lord].split(',')[0]} within the larger period.")
    else:
        phase_body.append("Dasha timing could not be resolved for the current date.")
    sections.append(_section("current_life_phase", "Current life phase",
                             "वर्तमान दशा", phase_body, phase_conf))

    # 13 — 12-month outlook -----------------------------------------------------
    out_conf = phase_conf
    outlook_body = []
    if chart.maha_lord:
        lead = chart.antar_lord or chart.maha_lord
        lf = chart.planet(lead)
        outlook_body.append(
            f"Over the next 12 months the {PLANET_EN[lead]} sub-period leads. Favourable "
            f"focus areas: {DASHA_THEME[lead]}.")
        if lf:
            good = DIGNITY_SCORE.get(lf.dignity, 0) >= 1 or lf.shadbala_status in {"Strong", "Exceptional"}
            outlook_body.append(
                ("Because this planet is well placed, initiatives in its areas are "
                 "more likely to flow." if good else
                 "Because this planet is under some pressure, pace efforts and avoid "
                 "over-commitment in its areas; preparation beats haste.")
                + f" It touches your {_ord(lf.house)} house themes ({HOUSE_THEME[lf.house].split(',')[0]}).")
        outlook_body.append("Outlook describes probabilities and timing tendencies — your "
                           "choices remain the deciding factor.")
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
                *, now: Optional[datetime] = None) -> Iterator[dict[str, Any]]:
    """Yield a ``meta`` record, then one record per section — for streaming."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    chart = build_chart(planets_raw, lagna_raw, shadbala_raw, dasha_raw, now)
    meta = _meta(chart, now)
    yield {"kind": "meta", **meta}
    sections = build_sections(chart, now=now)
    total = len(sections)
    for i, section in enumerate(sections):
        yield {"kind": "section", "index": i, "total": total, **section}
    yield {"kind": "done", "total": total}


def _meta(chart: Chart, now: datetime) -> dict[str, Any]:
    return {
        "lagna": {"sign": chart.lagna_sign + 1, "name_en": RASHI_EN[chart.lagna_sign],
                  "name_ne": RASHI_NE[chart.lagna_sign]},
        "moon_sign": {"sign": chart.moon_sign + 1, "name_en": RASHI_EN[chart.moon_sign],
                      "name_ne": RASHI_NE[chart.moon_sign]},
        "sun_sign": {"sign": chart.sun_sign + 1, "name_en": RASHI_EN[chart.sun_sign],
                     "name_ne": RASHI_NE[chart.sun_sign]},
        "mahadasha": chart.maha_lord and {
            "lord": chart.maha_lord, "lord_en": PLANET_EN[chart.maha_lord],
            "lord_ne": PLANET_NE[chart.maha_lord],
            "antardasha": chart.antar_lord, "window": chart.maha_window,
        },
        "yoga_count": len(chart.yogas),
        "generated_at": now.isoformat(),
        "method": "Deterministic Parashari interpretation with confidence weighting",
        "disclaimer": "For reflection and cultural insight. Describes tendencies and "
                      "probabilities, not certainties; not a substitute for professional advice.",
    }
