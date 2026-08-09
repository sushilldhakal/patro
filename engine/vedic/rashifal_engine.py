"""Scored rashifal engine — gochar + vedha + ashtakavarga + sudarshana + chandrabala.

The old rashifal (``engine.vedic.rashifal``) read one thing: the navatara tone of
the transit Moon against each janma rashi, plus a Moorti label. That is a real
rule, but it is *one* rule, it is identical for everyone in a 2¼-day window, and
it cannot tell a Makar reader from a Kumbha reader on the same afternoon.

This module keeps that rule and puts six more around it, each a classical layer
that actually varies per rashi:

``gochar``
    All nine grahas' transit houses counted from the janma rashi, judged against
    the Brihat-Samhita benefic-house table, then run through **Vedha** — a
    favourable transit whose obstructing house is tenanted is cancelled, which is
    the half of the gochar rule most daily columns silently drop.

``ashtakavarga``
    Each transiting graha's own Bhinnashtakavarga bindus in the sign it stands in
    scale that graha's gochar verdict (the classical "4+ bindus and the transit
    delivers" test), and the Sarvashtakavarga total of the rashi itself is a
    per-sign strength term. The varga is cast on the day's own chart — there is no
    birth chart in a rashi column — and ``method.ashtakavarga`` says so.

``sudarshana``
    The same gochar sweep re-read from the three classical starting points of the
    Sudarshana Chakra: the **udaya lagna at the observer's sunrise**, the transit
    Moon sign, and the transit Sun sign. These are day-wide rather than per-sign,
    so they raise or lower the whole day together — which is what "today is a
    heavy day" honestly means. Note that at sunrise the lagna necessarily sits
    near the Sun's own sign, so the lagna and Surya chakras agree more often than
    not; the lagna chakra earns its weight on the days the boundary falls between
    them, and across longitudes far apart.

``rashi_lord``
    Where the sign's own lord stands today (house from the rashi), its dignity
    (exalted / moolatrikona / own / friend / enemy / debilitated), and whether it
    is combust or retrograde. This is the strongest single per-sign signal and it
    also fixes the sign's lucky colour, number, direction and hora.

``cycle``
    The period's own time-lord frame, nested the way the Sudarshana Chakra nests
    year → month → 2½ days. A graha's sign-transit *is* the natural clock for each
    band: Jupiter ≈ one sign a year, Sun exactly one sign a solar month, Moon ≈
    2¼ days a sign. So ``yearly`` reads the house Jupiter occupies from the rashi,
    ``monthly`` the Sun's, ``daily``/``weekly`` the Moon's.

``vaara_hora``
    Daily only — the naisargika relationship between the day lord (dinapati) and
    the rashi lord, which is the classical reason one weekday suits one sign.

Latitude enters through **Natonnata Bala**. The length of daylight at the
observer's latitude is what makes the diurnal grahas (Sun, Jupiter, Venus) strong
by day and the nocturnal ones (Moon, Mars, Saturn) strong by night, so the day
fraction — pure geometry from latitude and the Sun's declination — scales each
graha's say in the gochar sweep. A June day in Kanchanpur and one in Jhapa run
about half an hour apart; in Nepal that is a nudge, at high latitudes it is
decisive, and either way it is the honest size of the effect rather than a
claimed one.

Every layer returns a score in [-1, 1]; :data:`LAYER_WEIGHTS` mixes them with a
per-period profile, and :data:`GRAHA_PERIOD_WEIGHT` re-weights the grahas inside
the gochar sweep so that a yearly reading leans on Jupiter and Saturn while a
daily one leans on the Moon. Nothing here is random and nothing is time-seeded:
the same day, place and rashi always produce the same number.

All ephemeris work is Drik Ganita / Lahiri sidereal at the observer's true local
sunrise, so a rashifal is a function of (day, latitude, longitude, timezone).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Literal

from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE
from engine.vedic.interpretation import (
    ENEMIES,
    EXALT_SIGN,
    FRIENDS,
    MOOLA,
    OWN_SIGNS,
    PLANET_EN,
    PLANET_NE,
    SIGN_LORD,
)
from engine.vedic.names_ne import to_nepali_digits
from engine.vedic.navatara import NavataraTone
from engine.vedic.rashifal import (
    RASHI_NAMA_AKSHARAS_NE,
    RASHI_TITLE_EN,
    MoortiKind,
)

Period = Literal["daily", "weekly", "monthly", "yearly"]

PERIODS: tuple[Period, ...] = ("daily", "weekly", "monthly", "yearly")

#: Every graha the gochar sweep judges, in the order they are reported.
GOCHAR_GRAHAS: tuple[str, ...] = (
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
)

# ── classical tables ────────────────────────────────────────────────────────

#: Houses counted from janma rashi in which each graha's transit is favourable
#: (Brihat Samhita / Phaladeepika gochar phala). Anything not listed is adverse.
GOCHAR_BENEFIC_HOUSES: dict[str, frozenset[int]] = {
    "sun": frozenset({3, 6, 10, 11}),
    "moon": frozenset({1, 3, 6, 7, 10, 11}),
    "mars": frozenset({3, 6, 11}),
    "mercury": frozenset({2, 4, 6, 8, 10, 11}),
    "jupiter": frozenset({2, 5, 7, 9, 11}),
    "venus": frozenset({1, 2, 3, 4, 5, 8, 9, 11, 12}),
    "saturn": frozenset({3, 6, 11}),
    "rahu": frozenset({3, 6, 10, 11}),
    "ketu": frozenset({3, 6, 11}),
}

#: Vedha (obstruction). ``VEDHA[g][h]`` is the house whose tenancy by another
#: graha cancels ``g``'s result in house ``h``. The pairs are symmetric for every
#: graha except Venus, whose classical table is directional — hence the explicit
#: dict rather than a generated mirror.
_VEDHA_PAIRS: dict[str, tuple[tuple[int, int], ...]] = {
    "sun": ((3, 9), (6, 12), (10, 4), (11, 5)),
    "moon": ((1, 5), (3, 9), (6, 12), (7, 2), (10, 4), (11, 8)),
    "mars": ((3, 12), (6, 9), (11, 5)),
    "mercury": ((2, 5), (4, 3), (6, 9), (8, 1), (10, 7), (11, 12)),
    "jupiter": ((2, 12), (5, 4), (7, 3), (9, 10), (11, 8)),
    "saturn": ((3, 12), (6, 9), (11, 5)),
}

VEDHA: dict[str, dict[int, int]] = {}
for _g, _pairs in _VEDHA_PAIRS.items():
    _map: dict[int, int] = {}
    for _a, _b in _pairs:
        _map[_a] = _b
        _map.setdefault(_b, _a)
    VEDHA[_g] = _map
# Venus, unlike the other six, is given as a one-way list rather than as pairs:
# the nine auspicious transit houses 1,2,3,4,5,8,9,11,12 obstructed by 8,7,1,10,
# 9,5,11,3,6 respectively. Not mirrored — vedha here cancels Venus's *good*
# results only, and houses 6, 7 and 10 (already adverse for Venus) carry none.
VEDHA["venus"] = {1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 3, 12: 6}
# Rahu and Ketu have no vedha table in the classical sources; their transits are
# read unobstructed rather than given an invented one.
VEDHA["rahu"] = {}
VEDHA["ketu"] = {}

#: Pairs that never obstruct each other (Sun↔Saturn as father and son, Moon↔Mercury
#: as mother and son).
VEDHA_EXEMPT: frozenset[frozenset[str]] = frozenset(
    {frozenset({"sun", "saturn"}), frozenset({"moon", "mercury"})}
)

#: How far Naisargika (natural) bala is allowed to bend the period weights.
#: The classical order is Sun > Moon > Venus > Jupiter > Mercury > Mars > Saturn,
#: but it is a *natural* strength, not a temporal one — applied at full force it
#: would erase Saturn from the yearly reading, which is exactly backwards, since
#: the slow grahas are what a year turns on. So it enters as a bounded nudge on
#: top of the speed-based profile rather than as a replacement for it.
NAISARGIKA_SWING = 0.25

#: Natonnata (diurnal / nocturnal) class. Mercury is always strong, and the
#: nodes take no side.
DIURNAL_GRAHAS: frozenset[str] = frozenset({"sun", "jupiter", "venus"})
NOCTURNAL_GRAHAS: frozenset[str] = frozenset({"moon", "mars", "saturn"})

#: How far the day fraction is allowed to swing a graha's say. At 0.5 the factor
#: is 1.0 for everyone; a 14-hour day lifts the diurnal grahas to 1.12 and drops
#: the nocturnal ones to 0.88.
NATONNATA_SWING = 0.6

#: Which graha dominates each timeframe. A sign transit is the natural clock:
#: Moon ≈ 2¼ days, Sun exactly one solar month, Jupiter ≈ one year, Saturn ≈ 2½.
GRAHA_PERIOD_WEIGHT: dict[Period, dict[str, float]] = {
    "daily": {
        "sun": 1.2, "moon": 3.0, "mars": 1.0, "mercury": 1.2, "jupiter": 0.8,
        "venus": 1.2, "saturn": 0.8, "rahu": 0.6, "ketu": 0.6,
    },
    "weekly": {
        "sun": 1.4, "moon": 2.0, "mars": 1.2, "mercury": 1.4, "jupiter": 1.0,
        "venus": 1.4, "saturn": 1.0, "rahu": 0.7, "ketu": 0.7,
    },
    "monthly": {
        "sun": 2.0, "moon": 0.8, "mars": 1.5, "mercury": 1.5, "jupiter": 1.4,
        "venus": 1.5, "saturn": 1.3, "rahu": 1.0, "ketu": 1.0,
    },
    "yearly": {
        "sun": 0.8, "moon": 0.2, "mars": 1.0, "mercury": 0.6, "jupiter": 2.5,
        "venus": 0.8, "saturn": 2.5, "rahu": 1.5, "ketu": 1.5,
    },
}

def _naisargika_factor(graha: str) -> float:
    """Naisargika bala of ``graha`` as a multiplier around 1.0.

    Virupas run 8.57 (Saturn) to 60 (Sun); normalised to [0, 1] and applied with
    :data:`NAISARGIKA_SWING`, the Sun ends up ~1.12 and Saturn ~0.88.
    """
    from engine.vedic.shadbala import NAISARGIKA

    virupas = NAISARGIKA.get(graha)
    if virupas is None:
        # Rahu and Ketu carry no Naisargika bala; they take the period weight as is.
        return 1.0
    low, high = 8.57, 60.0
    share = (virupas - low) / (high - low)
    return 1.0 + (share - 0.5) * NAISARGIKA_SWING


#: How the seven layers mix, per period. Each row sums to 1.0.
LAYER_WEIGHTS: dict[Period, dict[str, float]] = {
    "daily": {
        "gochar": 0.30, "chandrabala": 0.22, "moorti": 0.10, "ashtakavarga": 0.12,
        "rashi_lord": 0.12, "sudarshana": 0.08, "cycle": 0.04, "vaara_hora": 0.02,
    },
    "weekly": {
        "gochar": 0.34, "chandrabala": 0.16, "moorti": 0.07, "ashtakavarga": 0.14,
        "rashi_lord": 0.13, "sudarshana": 0.09, "cycle": 0.07, "vaara_hora": 0.0,
    },
    "monthly": {
        "gochar": 0.38, "chandrabala": 0.08, "moorti": 0.04, "ashtakavarga": 0.16,
        "rashi_lord": 0.14, "sudarshana": 0.10, "cycle": 0.10, "vaara_hora": 0.0,
    },
    "yearly": {
        "gochar": 0.40, "chandrabala": 0.03, "moorti": 0.02, "ashtakavarga": 0.17,
        "rashi_lord": 0.14, "sudarshana": 0.09, "cycle": 0.15, "vaara_hora": 0.0,
    },
}

#: The graha whose sign transit clocks each band (see the ``cycle`` layer).
CYCLE_GRAHA: dict[Period, str] = {
    "daily": "moon", "weekly": "moon", "monthly": "sun", "yearly": "jupiter",
}

LAYER_KEYS: tuple[str, ...] = (
    "gochar", "chandrabala", "moorti", "ashtakavarga",
    "rashi_lord", "sudarshana", "cycle", "vaara_hora",
)

#: Standing of a house counted from the janma rashi, used wherever a bare house
#: has to be scored (cycle graha, rashi lord placement).
HOUSE_STANDING: dict[int, float] = {
    1: 0.45, 2: 0.35, 3: 0.25, 4: 0.30, 5: 0.60, 6: -0.40,
    7: 0.20, 8: -0.75, 9: 0.70, 10: 0.55, 11: 0.75, 12: -0.55,
}

_MOORTI_BY_HOUSE: dict[int, MoortiKind] = {
    1: "swarna", 6: "swarna", 11: "swarna",
    2: "rajata", 5: "rajata", 9: "rajata",
    3: "tamra", 7: "tamra", 10: "tamra",
    4: "loha", 8: "loha", 12: "loha",
}
_MOORTI_SCORE: dict[MoortiKind, float] = {
    "swarna": 1.0, "rajata": 0.5, "tamra": -0.25, "loha": -1.0,
}
MOORTI_NE: dict[MoortiKind, str] = {
    "swarna": "स्वर्ण", "rajata": "रजत", "tamra": "ताम्र", "loha": "लोह",
}
MOORTI_EN: dict[MoortiKind, str] = {
    "swarna": "Swarna (gold)", "rajata": "Rajata (silver)",
    "tamra": "Tamra (copper)", "loha": "Loha (iron)",
}

_TONE_SCORE: dict[NavataraTone, float] = {
    "best": 1.0, "good": 0.5, "neutral": 0.0, "bad": -0.5, "worst": -1.0,
}
TONE_RANK: dict[NavataraTone, int] = {
    "worst": 0, "bad": 1, "neutral": 2, "good": 3, "best": 4,
}

# ── the rashi lord decides colour / number / direction / hora ───────────────

LORD_NUMBER: dict[str, int] = {
    "sun": 1, "moon": 2, "jupiter": 3, "rahu": 4, "mercury": 5,
    "venus": 6, "ketu": 7, "saturn": 8, "mars": 9,
}
#: Graha colours as the classical texts give them — the Sun blood-red, Mars
#: pale-red, Mercury grass-green, Venus variegated, Saturn dark. The nodes have
#: no colour in the seven-graha list, so they keep the customary smoky pair.
LORD_COLOR_NE: dict[str, str] = {
    "sun": "रक्तवर्ण", "moon": "सेतो", "mars": "हल्का रातो",
    "mercury": "घाँसे हरियो", "jupiter": "पहेँलो", "venus": "विविधरङ्गी",
    "saturn": "कालो", "rahu": "धुम्र", "ketu": "खैरो",
}
LORD_COLOR_EN: dict[str, str] = {
    "sun": "Blood red", "moon": "White", "mars": "Pale red",
    "mercury": "Grass green", "jupiter": "Yellow", "venus": "Variegated",
    "saturn": "Dark", "rahu": "Smoke grey", "ketu": "Grey",
}
LORD_DISHA_NE: dict[str, str] = {
    "sun": "पूर्व", "venus": "आग्नेय", "mars": "दक्षिण", "rahu": "नैऋत्य",
    "saturn": "पश्चिम", "moon": "वायव्य", "mercury": "उत्तर", "jupiter": "ईशान",
    "ketu": "नैऋत्य",
}
LORD_DISHA_EN: dict[str, str] = {
    "sun": "East", "venus": "South-east", "mars": "South", "rahu": "South-west",
    "saturn": "West", "moon": "North-west", "mercury": "North", "jupiter": "North-east",
    "ketu": "South-west",
}

# ── life domains (per-sign, icon-driven in the UI) ──────────────────────────

#: Houses from the janma rashi that carry each domain, with their weight. High
#: Ashtakavarga bindus in 6/8/12 read as resilience (victory over illness, over
#: enemies, over loss) rather than as trouble, which is why ``health`` can list
#: them positively.
DOMAIN_HOUSES: dict[str, dict[int, float]] = {
    "career": {10: 1.0, 6: 0.6, 3: 0.5, 11: 0.5},
    "finance": {2: 1.0, 11: 0.9, 9: 0.5, 5: 0.4},
    "health": {1: 1.0, 6: 0.7, 8: 0.4, 12: 0.3},
    "love": {7: 1.0, 5: 0.8, 4: 0.5, 12: 0.3},
    "learning": {5: 1.0, 4: 0.7, 9: 0.7, 2: 0.4},
    "travel": {3: 1.0, 9: 0.8, 12: 0.6, 7: 0.3},
}
DOMAIN_KARAKA: dict[str, tuple[str, ...]] = {
    "career": ("saturn", "sun"),
    "finance": ("jupiter", "venus"),
    "health": ("sun", "moon"),
    "love": ("venus", "moon"),
    "learning": ("mercury", "jupiter"),
    "travel": ("mercury", "moon"),
}
DOMAIN_KEYS: tuple[str, ...] = tuple(DOMAIN_HOUSES)
DOMAIN_NE: dict[str, str] = {
    "career": "करियर", "finance": "आर्थिक", "health": "स्वास्थ्य",
    "love": "सम्बन्ध", "learning": "अध्ययन", "travel": "यात्रा",
}
DOMAIN_EN: dict[str, str] = {
    "career": "Career", "finance": "Finance", "health": "Health",
    "love": "Relationships", "learning": "Learning", "travel": "Travel",
}

# ── phrasing ────────────────────────────────────────────────────────────────

HOUSE_THEME_NE: dict[int, str] = {
    1: "शरीर र आत्मविश्वास", 2: "धन, वाणी र परिवार", 3: "साहस, प्रयास र भाइबहिनी",
    4: "घर, माता र मनको शान्ति", 5: "बुद्धि, सिर्जना र सन्तान",
    6: "प्रतिस्पर्धा, सेवा र स्वास्थ्य", 7: "साझेदारी र वैवाहिक जीवन",
    8: "परिवर्तन, गुप्त विषय र जोखिम", 9: "भाग्य, धर्म र गुरु",
    10: "कर्म, पेशा र प्रतिष्ठा", 11: "लाभ, नेटवर्क र आकांक्षा",
    12: "खर्च, विदेश र विश्राम",
}
HOUSE_THEME_EN: dict[int, str] = {
    1: "body and self-confidence", 2: "money, speech and family",
    3: "courage, effort and siblings", 4: "home, mother and peace of mind",
    5: "intellect, creativity and children", 6: "competition, service and health",
    7: "partnership and married life", 8: "change, hidden matters and risk",
    9: "fortune, dharma and mentors", 10: "work, profession and standing",
    11: "gains, networks and aspirations", 12: "expenses, foreign lands and rest",
}

PERIOD_NE: dict[Period, str] = {
    "daily": "आज", "weekly": "यो हप्ता", "monthly": "यो महिना", "yearly": "यो वर्ष",
}
PERIOD_EN: dict[Period, str] = {
    "daily": "Today", "weekly": "This week", "monthly": "This month", "yearly": "This year",
}

_TONE_OPENER_NE: dict[NavataraTone, str] = {
    "best": "{period} ग्रहयोग बलियो छ — महत्त्वपूर्ण काम, यात्रा र नयाँ सुरुवातका लागि शुभ।",
    "good": "{period} प्रायः अनुकूल — योजना र सम्बन्धमा स्थिर प्रगति हुनेछ।",
    "neutral": "{period} मिश्र फल — सामान्य काम राम्रै चल्छ, ठूला दाउ नखेल्नुहोस्।",
    "bad": "{period} ग्रहस्थिति कमजोर — ठूला निर्णय स्थगित गर्नु र जोखिम टार्नु उचित।",
    "worst": "{period} अति प्रतिकूल — जोखिमपूर्ण कार्य नगर्नुहोस्; धैर्य, साधना र विश्राम श्रेय।",
}
_TONE_OPENER_EN: dict[NavataraTone, str] = {
    "best": "{period} the transits are strong — auspicious for important work, travel and new beginnings.",
    "good": "{period} is broadly favourable — steady progress on plans and relationships.",
    "neutral": "{period} is mixed — routine work goes fine, but avoid large bets.",
    "bad": "{period} the transits are weak — postpone major decisions and sidestep risk.",
    "worst": "{period} is strongly adverse — avoid risky ventures; patience, practice and rest serve better.",
}

#: Remedy keyed by the graha doing the damage, not by a rotating list — the point
#: of an upaya is that it answers the specific affliction.
REMEDY_NE: dict[str, str] = {
    "sun": "आदित्य हृदय स्तोत्र पाठ गर्नुहोस्; बिहान सूर्यलाई जल अर्घ्य दिनुहोस्।",
    "moon": "सोमबार शिवजीलाई जल चढाउनुहोस्; मनलाई अशान्त पार्ने कुराबाट टाढा रहनुहोस्।",
    "mars": "मङ्गलबार हनुमान चालीसा पाठ गर्नुहोस्; रिस र हतारो नियन्त्रण गर्नुहोस्।",
    "mercury": "बुधबार गणेशजीको दर्शन गरी हरियो वस्तु दान गर्नुहोस्; लिखित कागजात ध्यानपूर्वक हेर्नुहोस्।",
    "jupiter": "बिहीबार गुरु/मान्यजनको सम्मान गर्नुहोस् र पहेँलो वस्तु दान गर्नुहोस्।",
    "venus": "शुक्रबार लक्ष्मीपूजा गर्नुहोस्; अनावश्यक खर्च र विलासितामा संयम राख्नुहोस्।",
    "saturn": "शनिबार तेल दान वा कालो तिल अर्पण गर्नुहोस्; श्रमिक र वृद्धहरूको सेवा गर्नुहोस्।",
    "rahu": "दुर्गा वा भैरवको स्मरण गर्नुहोस्; भ्रम फैलाउने सूचना र छोटो बाटोबाट बच्नुहोस्।",
    "ketu": "गणेश वा भैरवको दर्शन गर्नुहोस्; ध्यान र एकाग्रता बढाउनुहोस्।",
}
REMEDY_EN: dict[str, str] = {
    "sun": "Recite the Aditya Hridaya and offer water to the Sun at dawn.",
    "moon": "Offer water to Shiva on Monday; keep away from what unsettles the mind.",
    "mars": "Read the Hanuman Chalisa on Tuesday; hold anger and haste in check.",
    "mercury": "Visit Ganesh on Wednesday and give something green; read documents carefully.",
    "jupiter": "Honour teachers and elders on Thursday and donate something yellow.",
    "venus": "Perform Lakshmi puja on Friday; restrain unnecessary spending and indulgence.",
    "saturn": "Donate oil or black sesame on Saturday; serve workers and the elderly.",
    "rahu": "Remember Durga or Bhairava; avoid rumour, shortcuts and unclear information.",
    "ketu": "Visit Ganesh or Bhairava; strengthen meditation and focus.",
}


#: Classical four-grade strength scale, quoted on the 20-point Vimshopaka
#: reckoning: Full 15–20, Medium 10–15, Small 5–10, Nil below 5. Expressed here
#: as the percent floor of each grade so the UI can label a score the way a
#: printed patro does, alongside the five-band tone the colours come from.
GRADE_FLOOR: tuple[tuple[int, str, str, str], ...] = (
    (75, "full", "पूर्ण बल", "Full"),
    (50, "medium", "मध्यम बल", "Medium"),
    (25, "small", "अल्प बल", "Small"),
    (0, "nil", "निर्बल", "Nil"),
)


def grade_for_percent(percent: int) -> dict[str, str]:
    """Vimshopaka-scale grade for a 0–100 score."""
    for floor, key, label_ne, label_en in GRADE_FLOOR:
        if percent >= floor:
            return {"grade": key, "grade_ne": label_ne, "grade_en": label_en}
    return {"grade": "nil", "grade_ne": "निर्बल", "grade_en": "Nil"}


def clamp(value: float, low: float = -1.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def tone_for_score(score: float) -> NavataraTone:
    """Map a [-1, 1] score onto the five navatara tones the UI already styles."""
    if score >= 0.45:
        return "best"
    if score >= 0.15:
        return "good"
    if score > -0.15:
        return "neutral"
    if score > -0.45:
        return "bad"
    return "worst"


def house_from(target_sign: int, reference_sign: int) -> int:
    """Bhava of ``target_sign`` counted from ``reference_sign`` (1..12)."""
    return (target_sign - reference_sign) % 12 + 1


# ── the day frame ───────────────────────────────────────────────────────────


@dataclass(frozen=True)
class DayFrame:
    """Everything one sunrise contributes, computed once and read twelve times.

    Building this costs a single ephemeris batch plus a lagna and an
    Ashtakavarga (~3 ms), which is what makes a 365-day yearly sweep affordable.
    """

    date_ad: str
    jd_sunrise: float
    vaara_num: int
    positions: dict[str, dict[str, Any]]
    graha_sign: dict[str, int]
    lagna_sign: int
    lagna_longitude: float
    moon_sign: int
    sun_sign: int
    tithi_index: int
    paksha: str
    day_fraction: float
    sav: list[int]
    bav: dict[str, list[int]]
    hora: list[dict[str, Any]] | None = None

    @property
    def occupied_signs(self) -> set[int]:
        return {self.graha_sign[g] for g in GOCHAR_GRAHAS}

    @property
    def moon_is_waxing(self) -> bool:
        return self.paksha == "shukla"

    def natonnata(self, graha: str) -> float:
        """Diurnal / nocturnal strength factor for ``graha`` on this day."""
        if graha in DIURNAL_GRAHAS:
            share = self.day_fraction
        elif graha in NOCTURNAL_GRAHAS:
            share = 1.0 - self.day_fraction
        else:
            return 1.0
        return 1.0 + (share - 0.5) * NATONNATA_SWING


def day_fraction_for(latitude: float, declination: float) -> float:
    """Fraction of the 24 hours the Sun is above the horizon, from geometry alone.

    ``cos H = -tan φ · tan δ`` — the standard hour-angle solution. Computing it
    here rather than differencing a sunrise and a sunset solve keeps the yearly
    sweep to one ephemeris batch a day, and the two agree to a couple of minutes
    (the difference is refraction and solar semi-diameter, which do not matter to
    a strength factor). Polar day and polar night clamp to 1 and 0.
    """
    import math

    product = -math.tan(math.radians(latitude)) * math.tan(math.radians(declination))
    if product <= -1.0:
        return 1.0
    if product >= 1.0:
        return 0.0
    return math.degrees(math.acos(product)) / 180.0


def build_day_frame(
    greg: date,
    location: Any,
    *,
    with_hora: bool = False,
) -> DayFrame:
    """One :class:`DayFrame` for the sunrise of ``greg`` at ``location``."""
    from engine.astronomy.jd_calendar import civil_day_jd_from_date
    from engine.astronomy.lagna import lagna_service
    from engine.astronomy.planets import spashta_table
    from engine.astronomy.sun import sun_service
    from engine.astronomy.ut_instant import as_julian_day, local_weekday_py_from_jd
    from engine.vedic.ashtakavarga import GRAHAS as AV_GRAHAS
    from engine.vedic.ashtakavarga import compute_ashtakavarga

    civil_jd = civil_day_jd_from_date(greg)
    sunrise = sun_service.sunrise(civil_jd, location)
    jd_sunrise = as_julian_day(sunrise)

    positions = spashta_table(jd_sunrise)
    graha_sign = {
        g: int(positions[g]["longitude"] % 360.0 // 30.0) % 12 for g in GOCHAR_GRAHAS
    }

    lagna = lagna_service.lagna(jd_sunrise, lat=location.lat, lon=location.lon)
    lagna_longitude = float(lagna["longitude"])
    lagna_sign = int(lagna_longitude % 360.0 // 30.0) % 12

    # Tithi straight off the Sun→Moon elongation — the same angle the panchanga
    # tithi comes from, so paksha here can never disagree with the day page.
    elongation = (
        positions["moon"]["longitude"] - positions["sun"]["longitude"]
    ) % 360.0
    tithi_index = int(elongation // 12.0)
    paksha = "shukla" if tithi_index < 15 else "krishna"

    day_fraction = day_fraction_for(
        float(location.lat), sun_service.declination(jd_sunrise)
    )

    av = compute_ashtakavarga(
        {g: float(positions[g]["longitude"]) for g in AV_GRAHAS},
        lagna_longitude,
    )
    sav = [int(row["sarvashtaka"]) for row in av["raw"]]
    bav = {g: [int(row["bindus"][g]) for row in av["raw"]] for g in AV_GRAHAS}

    # ``local_weekday_py_from_jd`` is Monday-based; vaara_num is Sunday-based.
    weekday_py = local_weekday_py_from_jd(jd_sunrise, location.timezone)
    vaara_num = (weekday_py + 1) % 7

    hora: list[dict[str, Any]] | None = None
    if with_hora:
        hora = _build_hora_slots(greg, location, vaara_num)

    return DayFrame(
        date_ad=greg.isoformat(),
        jd_sunrise=jd_sunrise,
        vaara_num=vaara_num,
        positions=positions,
        graha_sign=graha_sign,
        lagna_sign=lagna_sign,
        lagna_longitude=lagna_longitude,
        moon_sign=graha_sign["moon"],
        sun_sign=graha_sign["sun"],
        tithi_index=tithi_index,
        paksha=paksha,
        day_fraction=round(day_fraction, 6),
        sav=sav,
        bav=bav,
        hora=hora,
    )


def _build_hora_slots(
    greg: date, location: Any, vaara_num: int
) -> list[dict[str, Any]] | None:
    """Twenty-four hora slots for the daily lucky-time window, or ``None``.

    Only the daily reading pays for the extra sunset / next-sunrise solves.
    """
    from datetime import timedelta

    from engine.astronomy.jd_calendar import civil_day_jd_from_date
    from engine.astronomy.sun import sun_service
    from engine.vedic.hora import build_hora

    try:
        civil_jd = civil_day_jd_from_date(greg)
        sunrise = sun_service.sunrise(civil_jd, location)
        sunset = sun_service.sunset(civil_jd, location)
        next_sunrise = sun_service.sunrise(
            civil_day_jd_from_date(greg + timedelta(days=1)), location
        )
        return build_hora(sunrise, sunset, next_sunrise, vaara_num, location.timezone)
    except (TypeError, ValueError, AttributeError):
        # Polar days and the signed pre-CE axis can fail to produce a sunset;
        # the rashifal is still valid without a lucky-hora window.
        return None


# ── layer: gochar with vedha and ashtakavarga ───────────────────────────────


def _vedha_blocked(frame: DayFrame, graha: str, house: int, reference_sign: int) -> str | None:
    """The graha obstructing ``graha``'s transit result, if any."""
    vedha_house = VEDHA.get(graha, {}).get(house)
    if not vedha_house:
        return None
    vedha_sign = (reference_sign + vedha_house - 1) % 12
    for other in GOCHAR_GRAHAS:
        if other == graha:
            continue
        if frame.graha_sign[other] != vedha_sign:
            continue
        if frozenset({graha, other}) in VEDHA_EXEMPT:
            continue
        return other
    return None


def _bindu_factor(frame: DayFrame, graha: str) -> tuple[int | None, float]:
    """Ashtakavarga scaling for a transit: 4 bindus is the classical break-even.

    Returns the bindu count in the graha's own sign and a multiplier in
    [0.4, 1.6]. Below four bindus even a favourable house under-delivers; above
    four an adverse house bites less. The nodes have no Bhinnashtakavarga.
    """
    row = frame.bav.get(graha)
    if row is None:
        return None, 1.0
    bindu = int(row[frame.graha_sign[graha]])
    return bindu, clamp(1.0 + (bindu - 4) * 0.15, 0.4, 1.6)


def gochar_rows(
    frame: DayFrame,
    reference_sign: int,
    period: Period,
) -> list[dict[str, Any]]:
    """Per-graha transit verdict counted from ``reference_sign``."""
    weights = GRAHA_PERIOD_WEIGHT[period]
    rows: list[dict[str, Any]] = []

    for graha in GOCHAR_GRAHAS:
        house = house_from(frame.graha_sign[graha], reference_sign)
        favourable = house in GOCHAR_BENEFIC_HOUSES[graha]
        base = 1.0 if favourable else -1.0

        blocker = _vedha_blocked(frame, graha, house, reference_sign)
        # Vedha does not flip a transit, it cancels it — the promised result
        # simply does not arrive, which is a muted score, not the opposite one.
        if blocker:
            base *= 0.15

        bindu, bindu_factor = _bindu_factor(frame, graha)
        score = base * bindu_factor

        pos = frame.positions[graha]
        combust = bool(pos.get("is_combust"))
        retrograde = bool(pos.get("is_retrograde"))
        if combust:
            # An अस्त graha cannot deliver; a malefic one also cannot press.
            score *= 0.45
        if retrograde and graha in ("mars", "jupiter", "saturn", "mercury", "venus"):
            # वक्री intensifies whatever the transit already meant.
            score *= 1.2
        if graha == "moon":
            # Paksha bala — the waxing Moon is benefic, the waning Moon is not.
            score *= 1.15 if frame.moon_is_waxing else 0.8

        rows.append(
            {
                "graha": graha,
                "graha_ne": PLANET_NE[graha],
                "graha_en": PLANET_EN[graha],
                "sign": frame.graha_sign[graha] + 1,
                "sign_ne": RASHI_NAMES_NE[frame.graha_sign[graha]],
                "sign_en": RASHI_NAMES[frame.graha_sign[graha]],
                "house": house,
                "favourable": favourable,
                "vedha_by": blocker,
                "vedha_by_ne": PLANET_NE[blocker] if blocker else None,
                "bindu": bindu,
                "retrograde": retrograde,
                "combust": combust,
                "weight": round(
                    weights[graha] * frame.natonnata(graha) * _naisargika_factor(graha),
                    4,
                ),
                "score": round(clamp(score), 4),
            }
        )
    return rows


def _gochar_score(rows: list[dict[str, Any]]) -> float:
    total_weight = sum(r["weight"] for r in rows) or 1.0
    return clamp(sum(r["score"] * r["weight"] for r in rows) / total_weight)


# ── layer: sudarshana chakra ────────────────────────────────────────────────


def sudarshana_block(frame: DayFrame, period: Period) -> dict[str, Any]:
    """The day read from its own three lagnas — udaya lagna, Chandra, Surya.

    Day-wide by construction: these three chakras belong to the day and the
    place, not to the reader's rashi, so they lift or press every sign together.
    The udaya-lagna chakra is the term that makes the score depend on latitude
    and longitude.
    """
    chakras = {
        "lagna": frame.lagna_sign,
        "chandra": frame.moon_sign,
        "surya": frame.sun_sign,
    }
    weights = {"lagna": 0.5, "chandra": 0.3, "surya": 0.2}
    detail: dict[str, Any] = {}
    total = 0.0
    for key, ref in chakras.items():
        value = _gochar_score(gochar_rows(frame, ref, period))
        detail[key] = {
            "reference_sign": ref + 1,
            "reference_sign_ne": RASHI_NAMES_NE[ref],
            "reference_sign_en": RASHI_NAMES[ref],
            "score": round(value, 4),
        }
        total += value * weights[key]
    return {"score": round(clamp(total), 4), "chakras": detail}


# ── layer: rashi lord ───────────────────────────────────────────────────────


def _dignity(graha: str, sign: int, degree_in_sign: float) -> tuple[str, float]:
    """Classical dignity of ``graha`` standing in ``sign``, with its score."""
    exalt = EXALT_SIGN.get(graha)
    if exalt is not None and sign == exalt:
        return "exalted", 1.0
    if exalt is not None and sign == (exalt + 6) % 12:
        return "debilitated", -1.0
    moola = MOOLA.get(graha)
    if moola and sign == moola[0] and moola[1] <= degree_in_sign <= moola[2]:
        return "moolatrikona", 0.85
    if sign in OWN_SIGNS.get(graha, set()):
        return "own", 0.7
    lord = SIGN_LORD[sign]
    if lord == graha:
        return "own", 0.7
    if lord in FRIENDS.get(graha, set()):
        return "friend", 0.4
    if lord in ENEMIES.get(graha, set()):
        return "enemy", -0.45
    return "neutral", 0.0


DIGNITY_NE: dict[str, str] = {
    "exalted": "उच्च", "moolatrikona": "मूलत्रिकोण", "own": "स्वगृही",
    "friend": "मित्रक्षेत्री", "neutral": "समक्षेत्री", "enemy": "शत्रुक्षेत्री",
    "debilitated": "नीच",
}
DIGNITY_EN: dict[str, str] = {
    "exalted": "Exalted", "moolatrikona": "Moolatrikona", "own": "Own sign",
    "friend": "Friend's sign", "neutral": "Neutral sign", "enemy": "Enemy's sign",
    "debilitated": "Debilitated",
}


def rashi_lord_block(frame: DayFrame, rashi: int) -> dict[str, Any]:
    """Where the sign's own lord stands today and how well it stands there."""
    lord = SIGN_LORD[rashi]
    pos = frame.positions[lord]
    sign = frame.graha_sign[lord]
    house = house_from(sign, rashi)
    degree = float(pos.get("deg_in_rashi", pos["longitude"] % 30.0))
    dignity, dignity_score = _dignity(lord, sign, degree)

    placement = HOUSE_STANDING[house]
    combust = bool(pos.get("is_combust"))
    retrograde = bool(pos.get("is_retrograde"))

    score = 0.55 * dignity_score + 0.45 * placement
    if combust:
        score -= 0.35
    if retrograde:
        # A retrograde lord is strong but out of step — slightly unsettling for
        # the sign it rules rather than plainly good or bad.
        score -= 0.08

    return {
        "score": round(clamp(score), 4),
        "lord": lord,
        "lord_ne": PLANET_NE[lord],
        "lord_en": PLANET_EN[lord],
        "house": house,
        "sign": sign + 1,
        "sign_ne": RASHI_NAMES_NE[sign],
        "sign_en": RASHI_NAMES[sign],
        "dignity": dignity,
        "dignity_ne": DIGNITY_NE[dignity],
        "dignity_en": DIGNITY_EN[dignity],
        "combust": combust,
        "retrograde": retrograde,
    }


# ── layer: chandrabala, moorti, ashtakavarga, cycle, vaara/hora ─────────────


def _navatara_number(moon_sign: int, rashi: int) -> int:
    """Navatara position of ``rashi`` reckoned from the transit Moon's sign."""
    diff = (moon_sign - rashi) % 12
    if diff == 0:
        return 1
    return ((9 - (diff % 9)) % 9) + 1


#: tara (ne), quality (ne), tara (en), quality (en), tone — in navatara order.
_NAVATARA_ROWS: tuple[tuple[str, str, str, str, NavataraTone], ...] = (
    ("जन्म", "मध्यम", "Janma", "Medium", "neutral"),
    ("सम्पत्", "अति शुभ", "Sampat", "Very auspicious", "best"),
    ("विपत्", "अशुभ", "Vipat", "Inauspicious", "bad"),
    ("क्षेम", "अति शुभ", "Kshema", "Very auspicious", "best"),
    ("प्रत्यक्", "अशुभ", "Pratyari", "Inauspicious", "bad"),
    ("साधना", "अति शुभ", "Sadhaka", "Very auspicious", "best"),
    ("निधन", "घातक", "Nidhana", "Fatal", "worst"),
    ("मित्र", "शुभ", "Mitra", "Auspicious", "good"),
    ("परम मित्र", "अति शुभ", "Parama Mitra", "Very auspicious", "best"),
)


def chandrabala_block(frame: DayFrame, rashi: int) -> dict[str, Any]:
    tara_num = _navatara_number(frame.moon_sign, rashi)
    tara, quality, tara_en, quality_en, tone = _NAVATARA_ROWS[tara_num - 1]
    return {
        "score": _TONE_SCORE[tone],
        "tara": tara,
        "quality": quality,
        "tara_en": tara_en,
        "quality_en": quality_en,
        "tone": tone,
        "tara_num": tara_num,
    }


def moorti_block(frame: DayFrame, rashi: int) -> dict[str, Any]:
    house = house_from(frame.moon_sign, rashi)
    moorti = _MOORTI_BY_HOUSE[house]
    return {
        "score": _MOORTI_SCORE[moorti],
        "moorti": moorti,
        "moorti_ne": MOORTI_NE[moorti],
        "moorti_en": MOORTI_EN[moorti],
        "house_from_moon": house,
    }


def ashtakavarga_block(frame: DayFrame, rashi: int) -> dict[str, Any]:
    """Sarvashtakavarga strength of the rashi and of its kendra/trikona houses.

    337 bindus spread over twelve signs average 28 a sign; a sign holding 30+ is
    carrying the day and one under 25 is thin.
    """
    own = frame.sav[rashi]
    trikona = [frame.sav[(rashi + h - 1) % 12] for h in (1, 5, 9)]
    kendra = [frame.sav[(rashi + h - 1) % 12] for h in (1, 4, 7, 10)]
    own_term = (own - 28) / 8.0
    trikona_term = (sum(trikona) / 3.0 - 28) / 8.0
    kendra_term = (sum(kendra) / 4.0 - 28) / 8.0
    score = clamp(0.5 * own_term + 0.3 * trikona_term + 0.2 * kendra_term)
    return {
        "score": round(score, 4),
        "sav": own,
        "sav_trikona": round(sum(trikona) / 3.0, 2),
        "sav_kendra": round(sum(kendra) / 4.0, 2),
    }


def cycle_block(frame: DayFrame, rashi: int, period: Period) -> dict[str, Any]:
    """The period's own time-lord: which house its clock-graha occupies today."""
    graha = CYCLE_GRAHA[period]
    house = house_from(frame.graha_sign[graha], rashi)
    return {
        "score": round(HOUSE_STANDING[house], 4),
        "graha": graha,
        "graha_ne": PLANET_NE[graha],
        "graha_en": PLANET_EN[graha],
        "house": house,
        "sign": frame.graha_sign[graha] + 1,
        "sign_ne": RASHI_NAMES_NE[frame.graha_sign[graha]],
        "sign_en": RASHI_NAMES[frame.graha_sign[graha]],
    }


_VARA_LORD: tuple[str, ...] = (
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
)


_RELATION_NE: dict[str, str] = {
    "own": "स्वयं", "friend": "मित्र", "neutral": "सम", "enemy": "शत्रु",
}
_RELATION_EN: dict[str, str] = {
    "own": "the sign lord itself", "friend": "friendly", "neutral": "neutral",
    "enemy": "hostile",
}


def vaara_hora_block(frame: DayFrame, rashi: int) -> dict[str, Any]:
    """Dinapati against the rashi lord, plus the rashi lord's own hora window."""
    lord = SIGN_LORD[rashi]
    day_lord = _VARA_LORD[frame.vaara_num % 7]

    if day_lord == lord:
        score, relation = 0.8, "own"
    elif day_lord in FRIENDS.get(lord, set()):
        score, relation = 0.5, "friend"
    elif day_lord in ENEMIES.get(lord, set()):
        score, relation = -0.5, "enemy"
    else:
        score, relation = 0.0, "neutral"

    hora_window: dict[str, Any] | None = None
    if frame.hora:
        for slot in frame.hora:
            if slot.get("planet") == lord and slot.get("phase") == "day":
                hora_window = {
                    "planet": lord,
                    "planet_ne": PLANET_NE[lord],
                    "planet_en": PLANET_EN[lord],
                    "start_local_time_short": slot.get("start_local_time_short"),
                    "end_local_time_short": slot.get("end_local_time_short"),
                    "phase": slot.get("phase"),
                }
                break

    return {
        "score": score,
        "relation": relation,
        "relation_ne": _RELATION_NE[relation],
        "relation_en": _RELATION_EN[relation],
        "day_lord": day_lord,
        "day_lord_ne": PLANET_NE[day_lord],
        "day_lord_en": PLANET_EN[day_lord],
        "rashi_lord": lord,
        "hora_window": hora_window,
    }


# ── layer: domains ──────────────────────────────────────────────────────────


def domain_scores(
    frame: DayFrame,
    rashi: int,
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Six life areas, each from its own houses' bindus and tenants.

    Three terms: the Ashtakavarga strength of the domain's houses (per-sign and
    stable), the transit verdict of whatever graha currently sits in them, and
    the condition of the domain's natural karaka.
    """
    by_house: dict[int, list[dict[str, Any]]] = {}
    for row in rows:
        by_house.setdefault(int(row["house"]), []).append(row)
    by_graha = {row["graha"]: row for row in rows}

    out: list[dict[str, Any]] = []
    for key in DOMAIN_KEYS:
        houses = DOMAIN_HOUSES[key]
        weight_total = sum(houses.values())

        sav_term = (
            sum(
                ((frame.sav[(rashi + h - 1) % 12] - 28) / 8.0) * w
                for h, w in houses.items()
            )
            / weight_total
        )

        tenant_total = 0.0
        tenant_weight = 0.0
        tenants: list[str] = []
        for house, w in houses.items():
            for row in by_house.get(house, []):
                tenant_total += row["score"] * w
                tenant_weight += w
                tenants.append(row["graha"])
        transit_term = tenant_total / tenant_weight if tenant_weight else 0.0

        karakas = DOMAIN_KARAKA[key]
        karaka_term = sum(by_graha[k]["score"] for k in karakas) / len(karakas)

        score = clamp(0.40 * sav_term + 0.40 * transit_term + 0.20 * karaka_term)
        out.append(
            {
                "key": key,
                "label_ne": DOMAIN_NE[key],
                "label_en": DOMAIN_EN[key],
                "score": round(score, 4),
                "percent": int(round((score + 1) / 2 * 100)),
                "tone": tone_for_score(score),
                "houses": sorted(houses),
                "karaka": list(karakas),
                "tenants": tenants,
            }
        )
    return out


# ── composition ─────────────────────────────────────────────────────────────


def _layer_note(key: str, block: dict[str, Any], lang: str) -> str:
    ne = lang == "ne"
    if key == "chandrabala":
        return (
            f"नवतारा {block['tara']} ({block['quality']})"
            if ne
            else f"Navatara {block['tara_en']} — {block['quality_en'].lower()}"
        )
    if key == "moorti":
        return (
            f"गोचर चन्द्र {block['house_from_moon']} भाव — मूर्ति {block['moorti_ne']}"
            if ne
            else f"Transit Moon in house {block['house_from_moon']} — {block['moorti_en']} moorti"
        )
    if key == "ashtakavarga":
        return (
            f"सर्वाष्टकवर्ग {to_nepali_digits(block['sav'])} बिन्दु"
            if ne
            else f"Sarvashtakavarga {block['sav']} bindus"
        )
    if key == "rashi_lord":
        return (
            f"राशिस्वामी {block['lord_ne']} {block['house']} भावमा, {block['dignity_ne']}"
            if ne
            else f"Sign lord {block['lord_en']} in house {block['house']}, {block['dignity_en'].lower()}"
        )
    if key == "cycle":
        return (
            f"{block['graha_ne']} {block['house']} भावमा"
            if ne
            else f"{block['graha_en']} in house {block['house']}"
        )
    if key == "vaara_hora":
        return (
            f"वारपति {block['day_lord_ne']} — राशिस्वामीसँग {block['relation_ne']}"
            if ne
            else f"Day lord {block['day_lord_en']} — {block['relation_en']} to the sign lord"
        )
    if key == "sudarshana":
        return (
            "लग्न, चन्द्र र सूर्य — तीनै चक्रको संयुक्त फल"
            if ne
            else "Combined verdict of the lagna, Chandra and Surya chakras"
        )
    return ""


LAYER_LABEL_NE: dict[str, str] = {
    "gochar": "गोचर फल", "chandrabala": "चन्द्रबल", "moorti": "मूर्ति निर्णय",
    "ashtakavarga": "अष्टकवर्ग", "rashi_lord": "राशिस्वामी",
    "sudarshana": "सुदर्शन चक्र", "cycle": "कालचक्र", "vaara_hora": "वार/होरा",
}
LAYER_LABEL_EN: dict[str, str] = {
    "gochar": "Gochar phala", "chandrabala": "Chandrabala", "moorti": "Moorti nirnaya",
    "ashtakavarga": "Ashtakavarga", "rashi_lord": "Sign lord",
    "sudarshana": "Sudarshana chakra", "cycle": "Time cycle", "vaara_hora": "Vaara / hora",
}


def _primary_house(domain: str) -> int:
    """The house a domain leans on hardest — the one weighted 1.0."""
    return max(DOMAIN_HOUSES[domain].items(), key=lambda kv: kv[1])[0]


def _compose_prediction(
    *,
    tone: NavataraTone,
    period: Period,
    rashi: int,
    rows: list[dict[str, Any]],
    domains: list[dict[str, Any]],
    lord: dict[str, Any],
    chandra: dict[str, Any],
    moorti: dict[str, Any],
    lang: str,
) -> str:
    """Assemble the reading from the layers that actually decided the score.

    Deterministic: same inputs, same sentence. Nothing is sampled and nothing is
    seeded on the clock.
    """
    ne = lang == "ne"
    period_word = PERIOD_NE[period] if ne else PERIOD_EN[period]
    opener = (_TONE_OPENER_NE if ne else _TONE_OPENER_EN)[tone].format(period=period_word)
    parts = [opener]

    ranked = sorted(domains, key=lambda d: d["score"], reverse=True)
    strong, weak = ranked[0], ranked[-1]
    if strong["score"] > 0.08:
        house = _primary_house(strong["key"])
        parts.append(
            f"{strong['label_ne']} पक्ष बलियो छ — {HOUSE_THEME_NE[house]}मा ध्यान दिँदा प्रतिफल मिल्छ।"
            if ne
            else f"{strong['label_en']} is the strong side — attention to {HOUSE_THEME_EN[house]} pays off."
        )
    if weak["score"] < -0.08:
        parts.append(
            f"{weak['label_ne']} पक्षमा भने सतर्कता चाहिन्छ।"
            if ne
            else f"Take extra care on the {weak['label_en'].lower()} side."
        )

    # The single loudest transit, favourable or not.
    loudest = max(rows, key=lambda r: abs(r["score"]) * r["weight"])
    if loudest["vedha_by"]:
        parts.append(
            f"{loudest['graha_ne']} {loudest['house']} भावमा छ तर {loudest['vedha_by_ne']}को वेध परेकाले फल रोकिन्छ।"
            if ne
            else f"{loudest['graha_en']} sits in house {loudest['house']} but {PLANET_EN[loudest['vedha_by']]} obstructs it, so the result stalls."
        )
    elif loudest["favourable"]:
        parts.append(
            f"{loudest['graha_ne']}को {loudest['house']} भाव गोचरले {HOUSE_THEME_NE[loudest['house']]}मा साथ दिन्छ।"
            if ne
            else f"{loudest['graha_en']} transiting house {loudest['house']} supports {HOUSE_THEME_EN[loudest['house']]}."
        )
    else:
        parts.append(
            f"{loudest['graha_ne']} {loudest['house']} भावमा रहेकाले {HOUSE_THEME_NE[loudest['house']]}मा दबाब पर्न सक्छ।"
            if ne
            else f"{loudest['graha_en']} in house {loudest['house']} can press on {HOUSE_THEME_EN[loudest['house']]}."
        )

    parts.append(
        f"राशिस्वामी {lord['lord_ne']} {lord['house']} भावमा {lord['dignity_ne']} अवस्थामा छन्।"
        if ne
        else f"The sign lord {lord['lord_en']} stands in house {lord['house']}, {lord['dignity_en'].lower()}."
    )

    if period in ("daily", "weekly"):
        parts.append(
            f"चन्द्रबल {chandra['tara']} ({chandra['quality']}), मूर्ति {moorti['moorti_ne']}।"
            if ne
            else f"Chandrabala is {chandra['tara_en']} ({chandra['quality_en'].lower()}); "
            f"the moorti is {moorti['moorti_en']}."
        )

    if tone in ("bad", "worst"):
        culprit = min(rows, key=lambda r: r["score"] * r["weight"])["graha"]
        parts.append((REMEDY_NE if ne else REMEDY_EN)[culprit])

    return " ".join(parts)


def _remedy_for(rows: list[dict[str, Any]], lang: str) -> str:
    culprit = min(rows, key=lambda r: r["score"] * r["weight"])["graha"]
    return (REMEDY_NE if lang == "ne" else REMEDY_EN)[culprit]


def score_sign(frame: DayFrame, rashi: int, period: Period) -> dict[str, Any]:
    """Full scored reading of one rashi against one day frame."""
    weights = LAYER_WEIGHTS[period]

    rows = gochar_rows(frame, rashi, period)
    blocks: dict[str, dict[str, Any]] = {
        "gochar": {"score": _gochar_score(rows), "rows": rows},
        "chandrabala": chandrabala_block(frame, rashi),
        "moorti": moorti_block(frame, rashi),
        "ashtakavarga": ashtakavarga_block(frame, rashi),
        "rashi_lord": rashi_lord_block(frame, rashi),
        "sudarshana": sudarshana_block(frame, period),
        "cycle": cycle_block(frame, rashi, period),
        "vaara_hora": vaara_hora_block(frame, rashi),
    }

    raw = sum(blocks[k]["score"] * weights[k] for k in LAYER_KEYS)
    score = clamp(raw)

    return {
        "index": rashi,
        "id": rashi + 1,
        "score": round(score, 4),
        "percent": int(round((score + 1) / 2 * 100)),
        "stars": TONE_RANK[tone_for_score(score)] + 1,
        "tone": tone_for_score(score),
        "blocks": blocks,
        "domains": domain_scores(frame, rashi, rows),
    }


def _sign_identity(rashi: int) -> dict[str, Any]:
    return {
        "index": rashi,
        "id": rashi + 1,
        "name": RASHI_NAMES_NE[rashi],
        "name_en": RASHI_NAMES[rashi],
        "title_en": RASHI_TITLE_EN[rashi],
        "syllables_ne": RASHI_NAMA_AKSHARAS_NE[rashi],
    }


def _lord_luck(rashi: int, hora_window: dict[str, Any] | None) -> dict[str, Any]:
    """Colour, number, direction and hora — all four from the one sign lord.

    Anchoring every "lucky" field to the rashi lord is the standard Nepali patro
    convention and keeps them from contradicting each other, which is what
    happens when the colour comes from moorti and the number from tara.
    """
    lord = SIGN_LORD[rashi]
    number = LORD_NUMBER[lord]
    return {
        "lucky_lord": lord,
        "lucky_lord_ne": PLANET_NE[lord],
        "lucky_lord_en": PLANET_EN[lord],
        "lucky_color_ne": LORD_COLOR_NE[lord],
        "lucky_color_en": LORD_COLOR_EN[lord],
        "lucky_number": number,
        "lucky_number_ne": to_nepali_digits(number),
        "lucky_number_en": str(number),
        "lucky_direction_ne": LORD_DISHA_NE[lord],
        "lucky_direction_en": LORD_DISHA_EN[lord],
        "lucky_time": hora_window,
    }


def _components(scored: dict[str, Any], period: Period) -> list[dict[str, Any]]:
    weights = LAYER_WEIGHTS[period]
    out: list[dict[str, Any]] = []
    for key in LAYER_KEYS:
        weight = weights[key]
        if weight <= 0:
            continue
        block = scored["blocks"][key]
        value = float(block["score"])
        out.append(
            {
                "key": key,
                "label_ne": LAYER_LABEL_NE[key],
                "label_en": LAYER_LABEL_EN[key],
                "score": round(value, 4),
                "percent": int(round((value + 1) / 2 * 100)),
                "weight": weight,
                "tone": tone_for_score(value),
                "note_ne": _layer_note(key, block, "ne"),
                "note_en": _layer_note(key, block, "en"),
            }
        )
    return sorted(out, key=lambda c: c["weight"], reverse=True)


def build_sign_payload(frame: DayFrame, rashi: int, period: Period) -> dict[str, Any]:
    """One rashi's public payload for a single-day period."""
    scored = score_sign(frame, rashi, period)
    blocks = scored["blocks"]
    chandra = blocks["chandrabala"]
    moorti = blocks["moorti"]
    lord = blocks["rashi_lord"]
    rows = blocks["gochar"]["rows"]
    tone: NavataraTone = scored["tone"]

    payload: dict[str, Any] = {
        **_sign_identity(rashi),
        **_lord_luck(rashi, blocks["vaara_hora"].get("hora_window")),
        "score": scored["score"],
        "percent": scored["percent"],
        "stars": scored["stars"],
        "tone": tone,
        **grade_for_percent(scored["percent"]),
        # Legacy chandrabala/moorti surface — the old cards read these directly.
        "tara": chandra["tara"],
        "quality": chandra["quality"],
        "tara_num": chandra["tara_num"],
        "house_from_moon": moorti["house_from_moon"],
        "moorti": moorti["moorti"],
        "moorti_ne": moorti["moorti_ne"],
        "moorti_en": moorti["moorti_en"],
        "rashi_lord": lord,
        "components": _components(scored, period),
        "domains": scored["domains"],
        "gochar": rows,
        "ashtakavarga": blocks["ashtakavarga"],
        "cycle": blocks["cycle"],
        "remedy_ne": _remedy_for(rows, "ne"),
        "remedy_en": _remedy_for(rows, "en"),
        "prediction_ne": _compose_prediction(
            tone=tone, period=period, rashi=rashi, rows=rows,
            domains=scored["domains"], lord=lord, chandra=chandra,
            moorti=moorti, lang="ne",
        ),
        "prediction_en": _compose_prediction(
            tone=tone, period=period, rashi=rashi, rows=rows,
            domains=scored["domains"], lord=lord, chandra=chandra,
            moorti=moorti, lang="en",
        ),
    }
    return payload


# ── multi-day aggregation ───────────────────────────────────────────────────


def _bs_label(iso: str) -> str | None:
    from engine.vedic.bikram_sambat import bs_month_name, gregorian_to_bs

    try:
        y, m, d = gregorian_to_bs(date.fromisoformat(iso))
    except (ValueError, KeyError, IndexError):
        return None
    return f"{y} {bs_month_name(m, nepali=True)} {d}"


def _day_marker(iso: str, score: float) -> dict[str, Any]:
    return {
        "date_ad": iso,
        "date_bs": _bs_label(iso),
        "score": round(score, 4),
        "percent": int(round((score + 1) / 2 * 100)),
        "tone": tone_for_score(score),
    }


#: How much of an aggregate score comes from the window's loudest day rather
#: than from its mean. A plain average is the statistically honest summary but
#: not the traditional one: a period is read by its strongest transit, good or
#: bad, and averaging thirty days pulls every sign back toward the middle until
#: the twelve are indistinguishable. Blending the extreme back in restores the
#: spread without inventing it — the number still comes from days that happened.
AGGREGATE_PEAK_WEIGHT = 0.35


def aggregate_sign(
    rashi: int,
    frames: list[DayFrame],
    period: Period,
) -> dict[str, Any]:
    """Merge a window of day frames into one reading for ``rashi``.

    The headline score is the window mean pulled :data:`AGGREGATE_PEAK_WEIGHT`
    of the way toward its most extreme day. The best and weakest days are also
    reported as dates, so the caution the old engine folded permanently into the
    summary now points at the day it actually belongs to.
    """
    scored = [score_sign(f, rashi, period) for f in frames]
    mean = sum(s["score"] for s in scored) / len(scored)

    best_i = max(range(len(scored)), key=lambda i: scored[i]["score"])
    worst_i = min(range(len(scored)), key=lambda i: scored[i]["score"])
    peak = max(
        (scored[best_i]["score"], scored[worst_i]["score"]), key=abs
    )
    score = clamp(mean * (1 - AGGREGATE_PEAK_WEIGHT) + peak * AGGREGATE_PEAK_WEIGHT)
    tone = tone_for_score(score)

    # Component and domain means over the window.
    layer_means: dict[str, float] = {}
    for key in LAYER_KEYS:
        layer_means[key] = sum(s["blocks"][key]["score"] for s in scored) / len(scored)

    domain_means: list[dict[str, Any]] = []
    for i, key in enumerate(DOMAIN_KEYS):
        value = clamp(sum(s["domains"][i]["score"] for s in scored) / len(scored))
        domain_means.append(
            {
                "key": key,
                "label_ne": DOMAIN_NE[key],
                "label_en": DOMAIN_EN[key],
                "score": round(value, 4),
                "percent": int(round((value + 1) / 2 * 100)),
                "tone": tone_for_score(value),
                "houses": sorted(DOMAIN_HOUSES[key]),
                "karaka": list(DOMAIN_KARAKA[key]),
                "tenants": [],
            }
        )

    weights = LAYER_WEIGHTS[period]
    components = [
        {
            "key": key,
            "label_ne": LAYER_LABEL_NE[key],
            "label_en": LAYER_LABEL_EN[key],
            "score": round(layer_means[key], 4),
            "percent": int(round((layer_means[key] + 1) / 2 * 100)),
            "weight": weights[key],
            "tone": tone_for_score(layer_means[key]),
            "note_ne": _layer_note(key, scored[0]["blocks"][key], "ne"),
            "note_en": _layer_note(key, scored[0]["blocks"][key], "en"),
        }
        for key in LAYER_KEYS
        if weights[key] > 0
    ]
    components.sort(key=lambda c: c["weight"], reverse=True)

    # Representative frame — the middle of the window reads the period's own
    # clock graha better than either edge does.
    mid = scored[len(scored) // 2]
    mid_blocks = mid["blocks"]
    rows = mid_blocks["gochar"]["rows"]

    payload: dict[str, Any] = {
        **_sign_identity(rashi),
        **_lord_luck(rashi, None),
        "score": round(score, 4),
        "percent": int(round((score + 1) / 2 * 100)),
        "stars": TONE_RANK[tone] + 1,
        "tone": tone,
        **grade_for_percent(int(round((score + 1) / 2 * 100))),
        "mean_score": round(clamp(mean), 4),
        "tara": mid_blocks["chandrabala"]["tara"],
        "quality": mid_blocks["chandrabala"]["quality"],
        "tara_num": mid_blocks["chandrabala"]["tara_num"],
        "house_from_moon": mid_blocks["moorti"]["house_from_moon"],
        "moorti": mid_blocks["moorti"]["moorti"],
        "moorti_ne": mid_blocks["moorti"]["moorti_ne"],
        "moorti_en": mid_blocks["moorti"]["moorti_en"],
        "rashi_lord": mid_blocks["rashi_lord"],
        "components": components,
        "domains": domain_means,
        "gochar": rows,
        "ashtakavarga": mid_blocks["ashtakavarga"],
        "cycle": mid_blocks["cycle"],
        "days_in_period": len(frames),
        "best_day": _day_marker(frames[best_i].date_ad, scored[best_i]["score"]),
        "weak_day": _day_marker(frames[worst_i].date_ad, scored[worst_i]["score"]),
        "remedy_ne": _remedy_for(rows, "ne"),
        "remedy_en": _remedy_for(rows, "en"),
    }

    for lang in ("ne", "en"):
        base = _compose_prediction(
            tone=tone,
            period=period,
            rashi=rashi,
            rows=rows,
            domains=domain_means,
            lord=mid_blocks["rashi_lord"],
            chandra=mid_blocks["chandrabala"],
            moorti=mid_blocks["moorti"],
            lang=lang,
        )
        best = payload["best_day"]
        weak = payload["weak_day"]
        window = (
            f" यस अवधिको सबैभन्दा अनुकूल दिन {best['date_bs'] or best['date_ad']}, "
            f"सबैभन्दा सतर्क रहनुपर्ने दिन {weak['date_bs'] or weak['date_ad']}।"
            if lang == "ne"
            else f" The strongest day in this window is {best['date_ad']}; "
            f"the one to watch is {weak['date_ad']}."
        )
        payload[f"prediction_{lang}"] = base + window

    return payload


def detect_ingresses(
    frames: list[DayFrame],
    grahas: tuple[str, ...],
    rashi: int | None = None,
) -> list[dict[str, Any]]:
    """Sign changes inside the window, free from the sweep that was run anyway."""
    events: list[dict[str, Any]] = []
    for prev, curr in zip(frames, frames[1:], strict=False):
        for graha in grahas:
            if prev.graha_sign[graha] == curr.graha_sign[graha]:
                continue
            to_sign = curr.graha_sign[graha]
            from_sign = prev.graha_sign[graha]
            event: dict[str, Any] = {
                "graha": graha,
                "graha_ne": PLANET_NE[graha],
                "graha_en": PLANET_EN[graha],
                "date_ad": curr.date_ad,
                "date_bs": _bs_label(curr.date_ad),
                "from_sign": from_sign + 1,
                "from_sign_ne": RASHI_NAMES_NE[from_sign],
                "to_sign": to_sign + 1,
                "to_sign_ne": RASHI_NAMES_NE[to_sign],
                "to_sign_en": RASHI_NAMES[to_sign],
            }
            if rashi is not None:
                event["from_house"] = house_from(from_sign, rashi)
                event["to_house"] = house_from(to_sign, rashi)
            events.append(event)
    return events


def method_block(period: Period, *, sample_step: int, days: int) -> dict[str, Any]:
    """What the numbers were made of — shipped with every payload."""
    return {
        "frame": "drik_ganita",
        "ayanamsa": "Lahiri",
        "anchor": "sunrise",
        "engine": "rashifal_v2",
        "layers": list(LAYER_KEYS),
        "layer_weights": LAYER_WEIGHTS[period],
        "graha_weights": GRAHA_PERIOD_WEIGHT[period],
        "cycle_graha": CYCLE_GRAHA[period],
        "gochar": "brihat_samhita_benefic_houses_with_vedha",
        "ashtakavarga": "transit_chart_bav_sav (no natal chart in a rashi column)",
        "sudarshana": "udaya_lagna + chandra + surya chakras (day-wide)",
        "chandrabala": "navatara_9_cycle",
        "moorti": "transit_moon_house_from_janma_rashi",
        "lucky_fields": "rashi_lord (colour, number, direction, hora)",
        "natonnata": "day_fraction from observer latitude x solar declination",
        "naisargika": f"natural-bala nudge of +/-{NAISARGIKA_SWING / 2:.0%} on the graha weights",
        "grade_scale": "vimshopaka four-grade (full/medium/small/nil)",
        "aggregate": (
            "daily"
            if period == "daily"
            else f"mean blended {AGGREGATE_PEAK_WEIGHT:.0%} toward the window's peak day"
        ),
        "sample_step_days": sample_step,
        "days_computed": days,
    }


__all__ = [
    "CYCLE_GRAHA",
    "DOMAIN_KEYS",
    "GRAHA_PERIOD_WEIGHT",
    "LAYER_KEYS",
    "LAYER_WEIGHTS",
    "PERIODS",
    "DayFrame",
    "Period",
    "aggregate_sign",
    "build_day_frame",
    "build_sign_payload",
    "detect_ingresses",
    "method_block",
    "score_sign",
    "tone_for_score",
]
