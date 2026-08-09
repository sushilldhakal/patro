"""Personal Rashifal — a single reading cast on one person's own birth chart.

The twelve-sign rashifal in :mod:`engine.vedic.rashifal_engine` is deliberately
a Moon-sign shortcut: it is what a general column can offer a reader who only
knows their birth date, not their exact birth time and place. A signed-in
profile supplies both, which is exactly what the classical sources ask for
before treating a transit as personal rather than general:

* the **Lagna** (rising sign at the exact birth instant and latitude) rather
  than the Moon sign standing in for it,
* **Ashtakavarga bindus cast from the birth chart** — a transiting graha's
  bindu count in the sign it stands in today is what decides whether a
  "good house" transit actually delivers *for this person*, and that count
  only exists once there is a natal chart to cast it from,
* the **Vimshottari Mahadasha / Antardasha** running at the moment being
  read — the layer the general engine has no birth time to build at all.

This module reuses every scoring primitive from ``rashifal_engine`` (gochar
rows, dignity, house standing, the six life domains) rather than duplicating
them — the only things that change are *which sign each layer is counted
from* (Lagna instead of a tested rashi) and *which Ashtakavarga* backs the
bindu scaling (the natal chart's own, not the day's transit chart).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Any

from engine.astronomy.lagna import lagna_service
from engine.astronomy.planets import spashta_table
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import as_julian_day
from engine.vedic.ashtakavarga import GRAHAS as AV_GRAHAS
from engine.vedic.ashtakavarga import compute_ashtakavarga
from engine.vedic.interpretation import PLANET_EN, PLANET_NE, SIGN_LORD
from engine.vedic.kundali_detail import subdivide_dasha_period
from engine.vedic.names_ne import to_nepali_digits
from engine.vedic.rashifal_engine import (
    DOMAIN_KEYS,
    GOCHAR_GRAHAS,
    HOUSE_STANDING,
    LAYER_LABEL_EN,
    LAYER_LABEL_NE,
    LORD_COLOR_EN,
    LORD_COLOR_NE,
    LORD_DISHA_EN,
    LORD_DISHA_NE,
    LORD_NUMBER,
    TONE_RANK,
    DayFrame,
    Period,
    _dignity,
    ashtakavarga_block,
    chandrabala_block,
    clamp,
    cycle_block,
    domain_scores,
    gochar_rows,
    house_from,
    moorti_block,
    rashi_lord_block,
    tone_for_score,
    vaara_hora_block,
)
from engine.vedic.vimshottari import DASHA_LORD_NE, DASHA_YEARS, vimshottari_dasha

#: The general engine's LAYER_LABEL tables have no "dasha" entry — it is a
#: layer only the personal engine has. Extend rather than mutate the shared
#: dicts, so the general engine's own copies stay untouched.
LAYER_LABEL_NE = {**LAYER_LABEL_NE, "dasha": "विंशोत्तरी दशा"}
LAYER_LABEL_EN = {**LAYER_LABEL_EN, "dasha": "Vimshottari dasha"}

DASHA_LORD_EN: dict[str, str] = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
    "rahu": "Rahu", "ketu": "Ketu",
}

#: Personal Sudarshana Chakra weights — Lagna is the primary axis once an
#: exact birth time exists; Chandra and Surya round it out, same proportions
#: the general engine already uses for its (day-wide) three-chakra blend.
NATAL_CHAKRA_WEIGHTS: dict[str, float] = {"lagna": 0.5, "moon": 0.3, "sun": 0.2}

#: Mahadasha 60 / Antardasha 40 — the classical emphasis: the Mahadasha sets
#: the period's theme, the Antardasha modulates it.
DASHA_BLEND = {"mahadasha": 0.6, "antardasha": 0.4}

#: Per-period layer mix. Unlike the general engine's profile, this one carries
#: a ``dasha`` layer and drops the "which graha clocks this band" framing in
#: favour of "how much has the running dasha period settled in" — a Mahadasha
#: runs years, so it dominates the yearly reading and barely moves the daily
#: one; chandrabala is the reverse. Each row sums to 1.0.
PERSONAL_LAYER_WEIGHTS: dict[Period, dict[str, float]] = {
    "daily": {
        "gochar": 0.30, "chandrabala": 0.18, "moorti": 0.08, "ashtakavarga": 0.12,
        "rashi_lord": 0.11, "dasha": 0.15, "cycle": 0.04, "vaara_hora": 0.02,
    },
    "weekly": {
        "gochar": 0.32, "chandrabala": 0.13, "moorti": 0.06, "ashtakavarga": 0.14,
        "rashi_lord": 0.12, "dasha": 0.18, "cycle": 0.05, "vaara_hora": 0.0,
    },
    "monthly": {
        "gochar": 0.34, "chandrabala": 0.06, "moorti": 0.03, "ashtakavarga": 0.15,
        "rashi_lord": 0.13, "dasha": 0.25, "cycle": 0.04, "vaara_hora": 0.0,
    },
    "yearly": {
        "gochar": 0.32, "chandrabala": 0.02, "moorti": 0.01, "ashtakavarga": 0.15,
        "rashi_lord": 0.11, "dasha": 0.35, "cycle": 0.04, "vaara_hora": 0.0,
    },
}

LAYER_KEYS: tuple[str, ...] = (
    "gochar", "chandrabala", "moorti", "ashtakavarga",
    "rashi_lord", "dasha", "cycle", "vaara_hora",
)

AGGREGATE_PEAK_WEIGHT = 0.35


# ── the natal chart ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class NatalChart:
    """Everything a personal reading needs from one birth — cast once, reused
    for every day/period query against it (a birth instant never changes)."""

    birth_instant_utc: datetime
    lagna_sign: int
    lagna_longitude: float
    moon_sign: int
    sun_sign: int
    graha_sign: dict[str, int]
    graha_degree: dict[str, float]
    sav: list[int]
    bav: dict[str, list[int]]


def build_natal_chart(birth_instant_utc: datetime, *, lat: float, lon: float) -> NatalChart:
    """Cast the birth chart: Lagna, all nine grahas, and the natal Ashtakavarga.

    Ashtakavarga cast here — from the birth positions — is what the classical
    "does this transit have bindus for *this* person" test actually reads;
    the general engine's Ashtakavarga (cast on the day's own transit chart,
    for lack of any birth chart to use) is a different, honestly-labelled
    approximation.
    """
    jd = as_julian_day(birth_instant_utc)
    positions = spashta_table(jd)
    lagna = lagna_service.lagna(jd, lat=lat, lon=lon)
    lagna_longitude = float(lagna["longitude"])
    lagna_sign = int(lagna_longitude % 360.0 // 30.0) % 12

    graha_sign = {
        g: int(positions[g]["longitude"] % 360.0 // 30.0) % 12 for g in GOCHAR_GRAHAS
    }
    graha_degree = {
        g: float(positions[g].get("deg_in_rashi", positions[g]["longitude"] % 30.0))
        for g in GOCHAR_GRAHAS
    }

    av = compute_ashtakavarga(
        {g: float(positions[g]["longitude"]) for g in AV_GRAHAS}, lagna_longitude
    )
    sav = [int(row["sarvashtaka"]) for row in av["raw"]]
    bav = {g: [int(row["bindus"][g]) for row in av["raw"]] for g in AV_GRAHAS}

    return NatalChart(
        birth_instant_utc=birth_instant_utc,
        lagna_sign=lagna_sign,
        lagna_longitude=lagna_longitude,
        moon_sign=graha_sign["moon"],
        sun_sign=graha_sign["sun"],
        graha_sign=graha_sign,
        graha_degree=graha_degree,
        sav=sav,
        bav=bav,
    )


def birth_instant_from_local(birth: str, birth_tz: str) -> datetime:
    """Naive local birth datetime (``YYYY-MM-DDTHH:MM``) → a UTC instant.

    Same convention as :func:`services.sait_personalize.compute_janma_points`
    — kept as a separate one-liner here rather than imported, since that
    function only ever needed the Moon's geocentric position and this one
    also needs the birth place for the Lagna.
    """
    tz = resolve_observer_timezone(birth_tz)
    local = datetime.fromisoformat(birth)
    if local.tzinfo is None:
        local = local.replace(tzinfo=tz)
    return local.astimezone(timezone.utc)


# ── Vimshottari dasha, running at a given instant ───────────────────────────


def _parse_iso(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _find_running(periods: list[dict[str, Any]], as_of: datetime) -> dict[str, Any]:
    for period in periods:
        if _parse_iso(period["start"]) <= as_of < _parse_iso(period["end"]):
            return period
    return periods[-1]


def _dasha_score_for_lord(natal: NatalChart, lord: str) -> float:
    """How favourably a dasha lord sits in the birth chart: dignity + house
    from Lagna. The nodes have no classical dignity table, so their score
    comes from placement alone."""
    house = house_from(natal.graha_sign[lord], natal.lagna_sign)
    placement = HOUSE_STANDING[house]
    if lord in ("rahu", "ketu"):
        return placement
    _dignity_key, dignity_score = _dignity(
        lord, natal.graha_sign[lord], natal.graha_degree[lord]
    )
    return clamp(0.6 * dignity_score + 0.4 * placement)


def _period_label(lang: str, period: dict[str, Any]) -> dict[str, Any]:
    lord = period["lord"]
    return {
        "lord": lord,
        "lord_ne": DASHA_LORD_NE[lord],
        "lord_en": DASHA_LORD_EN[lord],
        "start": period["start"],
        "end": period["end"],
    }


def dasha_block(natal: NatalChart, as_of: datetime) -> dict[str, Any]:
    """Currently-running Mahadasha and Antardasha, scored from the birth chart."""
    cycle_years = sum(DASHA_YEARS.values())
    elapsed_years = max(
        0.0, (as_of - natal.birth_instant_utc).total_seconds() / (365.2425 * 86400)
    )
    cycles = max(1, math.ceil((elapsed_years + 5.0) / cycle_years))
    dasha = vimshottari_dasha(
        _sign_lon(natal, "moon"), natal.birth_instant_utc, cycles=cycles
    )
    maha = _find_running(dasha["sequence"], as_of)
    antardashas = subdivide_dasha_period(
        maha["lord"], _parse_iso(maha["start"]), _parse_iso(maha["end"])
    )
    antar = _find_running(antardashas, as_of)

    maha_score = _dasha_score_for_lord(natal, maha["lord"])
    antar_score = _dasha_score_for_lord(natal, antar["lord"])
    score = clamp(DASHA_BLEND["mahadasha"] * maha_score + DASHA_BLEND["antardasha"] * antar_score)

    return {
        "score": round(score, 4),
        "mahadasha": _period_label("ne", maha),
        "antardasha": _period_label("ne", antar),
    }


def _sign_lon(natal: NatalChart, graha: str) -> float:
    return (natal.graha_sign[graha] * 30.0) + natal.graha_degree[graha]


# ── scoring one instant against the natal chart ─────────────────────────────


def _lucky_from_sign(sign: int) -> dict[str, Any]:
    """Colour / number / direction from the Lagna's own lord — the personal
    reading's equivalent of the general engine's per-rashi lucky fields."""
    lord = SIGN_LORD[sign]
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
    }


def score_personal(
    natal: NatalChart,
    frame: DayFrame,
    period: Period,
    as_of: datetime,
) -> dict[str, Any]:
    """One scored personal reading for ``frame``'s day against ``natal``."""
    weights = PERSONAL_LAYER_WEIGHTS[period]

    # Same transit positions as the general engine's frame, but the natal
    # chart's own Ashtakavarga stands in for the day-chart's — bindus now
    # answer "does this transit have strength for *this person*".
    personal_frame = replace(frame, sav=natal.sav, bav=natal.bav)

    chakra_signs = {"lagna": natal.lagna_sign, "moon": natal.moon_sign, "sun": natal.sun_sign}
    gochar_by_chakra = {
        key: gochar_rows(personal_frame, sign, period) for key, sign in chakra_signs.items()
    }

    def _chakra_score(rows: list[dict[str, Any]]) -> float:
        total_weight = sum(r["weight"] for r in rows) or 1.0
        return clamp(sum(r["score"] * r["weight"] for r in rows) / total_weight)

    chakra_scores = {key: _chakra_score(rows) for key, rows in gochar_by_chakra.items()}
    gochar_score = clamp(
        sum(chakra_scores[key] * weight for key, weight in NATAL_CHAKRA_WEIGHTS.items())
    )
    # Lagna is the primary axis — its transit rows drive the domains and the
    # "loudest transit" line in the composed reading.
    rows = gochar_by_chakra["lagna"]

    blocks: dict[str, dict[str, Any]] = {
        "gochar": {"score": gochar_score, "rows": rows, "chakra_scores": chakra_scores},
        "chandrabala": chandrabala_block(frame, natal.moon_sign),
        "moorti": moorti_block(frame, natal.moon_sign),
        "ashtakavarga": ashtakavarga_block(personal_frame, natal.lagna_sign),
        "rashi_lord": rashi_lord_block(frame, natal.lagna_sign),
        "cycle": cycle_block(frame, natal.lagna_sign, period),
        "vaara_hora": vaara_hora_block(frame, natal.lagna_sign),
        "dasha": dasha_block(natal, as_of),
    }

    raw = sum(blocks[key]["score"] * weights[key] for key in LAYER_KEYS)
    score = clamp(raw)
    tone = tone_for_score(score)

    return {
        "score": round(score, 4),
        "percent": int(round((score + 1) / 2 * 100)),
        "stars": TONE_RANK[tone] + 1,
        "tone": tone,
        "blocks": blocks,
        "domains": domain_scores(personal_frame, natal.lagna_sign, rows),
    }


# ── phrasing ─────────────────────────────────────────────────────────────

PERIOD_NE = {"daily": "आज", "weekly": "यो हप्ता", "monthly": "यो महिना", "yearly": "यो वर्ष"}
PERIOD_EN = {"daily": "Today", "weekly": "This week", "monthly": "This month", "yearly": "This year"}

_TONE_OPENER_NE = {
    "best": "{period} तपाईंको जन्मकुण्डलीअनुसार अत्यन्त अनुकूल छ — महत्त्वपूर्ण काम अगाडि बढाउनुहोस्।",
    "good": "{period} तपाईंको कुण्डलीका हिसाबले प्रायः अनुकूल छ।",
    "neutral": "{period} मिश्र फल दिन्छ — सामान्य काम राम्रै चल्छ।",
    "bad": "{period} तपाईंको कुण्डलीअनुसार सावधानी आवश्यक छ — ठूला निर्णय स्थगित गर्नुहोस्।",
    "worst": "{period} तपाईंको जन्मकुण्डलीका हिसाबले अति प्रतिकूल छ — जोखिमपूर्ण काम नगर्नुहोस्।",
}
_TONE_OPENER_EN = {
    "best": "{period} reads very strong against your birth chart — a good window to push important work forward.",
    "good": "{period} is broadly favourable by your chart.",
    "neutral": "{period} is mixed — routine work goes fine.",
    "bad": "{period} calls for care by your chart — postpone major decisions.",
    "worst": "{period} is strongly adverse by your birth chart — avoid risky ventures.",
}

HOUSE_THEME_NE = {
    1: "शरीर र आत्मविश्वास", 2: "धन, वाणी र परिवार", 3: "साहस, प्रयास र भाइबहिनी",
    4: "घर, माता र मनको शान्ति", 5: "बुद्धि, सिर्जना र सन्तान",
    6: "प्रतिस्पर्धा, सेवा र स्वास्थ्य", 7: "साझेदारी र वैवाहिक जीवन",
    8: "परिवर्तन, गुप्त विषय र जोखिम", 9: "भाग्य, धर्म र गुरु",
    10: "कर्म, पेशा र प्रतिष्ठा", 11: "लाभ, नेटवर्क र आकांक्षा",
    12: "खर्च, विदेश र विश्राम",
}
HOUSE_THEME_EN = {
    1: "body and self-confidence", 2: "money, speech and family",
    3: "courage, effort and siblings", 4: "home, mother and peace of mind",
    5: "intellect, creativity and children", 6: "competition, service and health",
    7: "partnership and married life", 8: "change, hidden matters and risk",
    9: "fortune, dharma and mentors", 10: "work, profession and standing",
    11: "gains, networks and aspirations", 12: "expenses, foreign lands and rest",
}


def _compose_prediction(
    *, tone: str, period: Period, scored: dict[str, Any], lang: str
) -> str:
    ne = lang == "ne"
    period_word = (PERIOD_NE if ne else PERIOD_EN)[period]
    parts = [(_TONE_OPENER_NE if ne else _TONE_OPENER_EN)[tone].format(period=period_word)]

    blocks = scored["blocks"]
    dasha = blocks["dasha"]
    maha_lord = dasha["mahadasha"]["lord_ne" if ne else "lord_en"]
    antar_lord = dasha["antardasha"]["lord_ne" if ne else "lord_en"]
    parts.append(
        f"हाल {maha_lord} महादशामा {antar_lord} अन्तर्दशा चलिरहेको छ।"
        if ne
        else f"You are currently running {maha_lord} Mahadasha, {antar_lord} Antardasha."
    )

    domains = scored["domains"]
    ranked = sorted(domains, key=lambda d: d["score"], reverse=True)
    strong, weak = ranked[0], ranked[-1]
    if strong["score"] > 0.08:
        house = max(strong["houses"])
        parts.append(
            f"{strong['label_ne']} पक्ष बलियो देखिन्छ।" if ne else f"{strong['label_en']} looks strong."
        )
        _ = house
    if weak["score"] < -0.08:
        parts.append(
            f"{weak['label_ne']}मा भने सतर्कता चाहिन्छ।"
            if ne
            else f"{weak['label_en']} needs more care."
        )

    lord = blocks["rashi_lord"]
    parts.append(
        f"लग्नेश {lord['lord_ne']} {lord['house']} भावमा {lord['dignity_ne']} अवस्थामा छन्।"
        if ne
        else f"Your Lagna lord {lord['lord_en']} stands in house {lord['house']}, {lord['dignity_en'].lower()}."
    )

    return " ".join(parts)


def _components(scored: dict[str, Any], period: Period) -> list[dict[str, Any]]:
    weights = PERSONAL_LAYER_WEIGHTS[period]
    out: list[dict[str, Any]] = []
    for key in LAYER_KEYS:
        weight = weights[key]
        if weight <= 0:
            continue
        block = scored["blocks"][key]
        value = float(block["score"])
        note_ne = note_en = ""
        if key == "dasha":
            note_ne = f"{block['mahadasha']['lord_ne']} / {block['antardasha']['lord_ne']}"
            note_en = f"{block['mahadasha']['lord_en']} / {block['antardasha']['lord_en']}"
        elif key == "rashi_lord":
            note_ne = f"लग्नेश {block['lord_ne']} {block['house']} भावमा"
            note_en = f"Lagna lord {block['lord_en']} in house {block['house']}"
        elif key == "ashtakavarga":
            note_ne = f"जन्म सर्वाष्टकवर्ग {to_nepali_digits(block['sav'])} बिन्दु"
            note_en = f"Natal Sarvashtakavarga {block['sav']} bindus"
        elif key == "chandrabala":
            note_ne = f"नवतारा {block['tara']}"
            note_en = f"Navatara {block['tara_num']}"
        out.append(
            {
                "key": key,
                "label_ne": LAYER_LABEL_NE.get(key, key),
                "label_en": LAYER_LABEL_EN.get(key, key),
                "score": round(value, 4),
                "percent": int(round((value + 1) / 2 * 100)),
                "weight": weight,
                "tone": tone_for_score(value),
                "note_ne": note_ne,
                "note_en": note_en,
            }
        )
    return sorted(out, key=lambda c: c["weight"], reverse=True)


def _natal_summary(natal: NatalChart) -> dict[str, Any]:
    return {
        "lagna_sign": natal.lagna_sign + 1,
        "lagna_sign_ne": RASHI_NAMES_NE[natal.lagna_sign],
        "lagna_sign_en": RASHI_NAMES[natal.lagna_sign],
        "moon_sign": natal.moon_sign + 1,
        "moon_sign_ne": RASHI_NAMES_NE[natal.moon_sign],
        "moon_sign_en": RASHI_NAMES[natal.moon_sign],
        "sun_sign": natal.sun_sign + 1,
        "sun_sign_ne": RASHI_NAMES_NE[natal.sun_sign],
        "sun_sign_en": RASHI_NAMES[natal.sun_sign],
    }


def build_personal_sign_payload(
    natal: NatalChart, frame: DayFrame, period: Period, as_of: datetime
) -> dict[str, Any]:
    scored = score_personal(natal, frame, period, as_of)
    tone = scored["tone"]
    payload: dict[str, Any] = {
        **_natal_summary(natal),
        **_lucky_from_sign(natal.lagna_sign),
        "score": scored["score"],
        "percent": scored["percent"],
        "stars": scored["stars"],
        "tone": tone,
        "dasha": scored["blocks"]["dasha"],
        "rashi_lord": scored["blocks"]["rashi_lord"],
        "components": _components(scored, period),
        "domains": scored["domains"],
        "gochar": scored["blocks"]["gochar"]["rows"],
        "prediction_ne": _compose_prediction(tone=tone, period=period, scored=scored, lang="ne"),
        "prediction_en": _compose_prediction(tone=tone, period=period, scored=scored, lang="en"),
    }
    return payload


def aggregate_personal(
    natal: NatalChart, frames: list[DayFrame], period: Period, as_of: datetime
) -> dict[str, Any]:
    """Window average pulled toward its most extreme day — same rationale as
    :func:`engine.vedic.rashifal_engine.aggregate_sign`."""
    scored = [score_personal(natal, f, period, as_of) for f in frames]
    mean = sum(s["score"] for s in scored) / len(scored)
    best_i = max(range(len(scored)), key=lambda i: scored[i]["score"])
    worst_i = min(range(len(scored)), key=lambda i: scored[i]["score"])
    peak = max((scored[best_i]["score"], scored[worst_i]["score"]), key=abs)
    score = clamp(mean * (1 - AGGREGATE_PEAK_WEIGHT) + peak * AGGREGATE_PEAK_WEIGHT)
    tone = tone_for_score(score)

    mid = scored[len(scored) // 2]
    weights = PERSONAL_LAYER_WEIGHTS[period]
    layer_means = {
        key: sum(s["blocks"][key]["score"] for s in scored) / len(scored) for key in LAYER_KEYS
    }
    domain_means: list[dict[str, Any]] = []
    for i, key in enumerate(DOMAIN_KEYS):
        value = clamp(sum(s["domains"][i]["score"] for s in scored) / len(scored))
        base = mid["domains"][i]
        domain_means.append({**base, "score": round(value, 4), "percent": int(round((value + 1) / 2 * 100)), "tone": tone_for_score(value)})

    components = []
    for key in LAYER_KEYS:
        weight = weights[key]
        if weight <= 0:
            continue
        value = layer_means[key]
        src = mid["blocks"][key]
        note_ne = note_en = ""
        if key == "dasha":
            note_ne = f"{src['mahadasha']['lord_ne']} / {src['antardasha']['lord_ne']}"
            note_en = f"{src['mahadasha']['lord_en']} / {src['antardasha']['lord_en']}"
        components.append(
            {
                "key": key,
                "label_ne": LAYER_LABEL_NE.get(key, key),
                "label_en": LAYER_LABEL_EN.get(key, key),
                "score": round(value, 4),
                "percent": int(round((value + 1) / 2 * 100)),
                "weight": weight,
                "tone": tone_for_score(value),
                "note_ne": note_ne,
                "note_en": note_en,
            }
        )
    components.sort(key=lambda c: c["weight"], reverse=True)

    payload: dict[str, Any] = {
        **_natal_summary(natal),
        **_lucky_from_sign(natal.lagna_sign),
        "score": round(score, 4),
        "percent": int(round((score + 1) / 2 * 100)),
        "stars": TONE_RANK[tone] + 1,
        "tone": tone,
        "dasha": mid["blocks"]["dasha"],
        "rashi_lord": mid["blocks"]["rashi_lord"],
        "components": components,
        "domains": domain_means,
        "gochar": mid["blocks"]["gochar"]["rows"],
        "days_in_period": len(frames),
    }
    for lang in ("ne", "en"):
        payload[f"prediction_{lang}"] = _compose_prediction(
            tone=tone, period=period, scored=mid, lang=lang
        )
    return payload


__all__ = [
    "NatalChart",
    "aggregate_personal",
    "birth_instant_from_local",
    "build_natal_chart",
    "build_personal_sign_payload",
    "dasha_block",
    "score_personal",
]
