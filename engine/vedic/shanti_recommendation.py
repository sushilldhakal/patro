"""Server-side Navagraha Shanti recommendation.

Implements the classical 4-step decision process for which graha(s) need
shanti (per Brihat Parashara Hora Shastra / Phaladeepika / Laghu Parashari
convention):

  1. Dasha assessment — is the current mahadasha/antardasha lord a
     dusthana (6/8/12) lord, a maraka (2/7) lord, combust, or debilitated?
     -> mandatory japa/daan/navagraha shanti for that lord.
  2. Lagnesha/yogakaraka check — is the 1st/5th/9th house lord weak
     (below its Shadbala floor), debilitated, or combust?
     -> strengthening remedy (gem + mantra, no daan).
  3. Affliction check — is Rahu, Ketu or Saturn occupying/aspecting a
     benefic house (1st/5th/9th) or a benefic-group planet?
     -> pacification remedy (japa + homa + daan, never a gem) for that
     malefic.
  4. Saturn's transit — is transiting Saturn in Sade Sati (12th/1st/2nd
     from natal Moon), Dhaiya/Ardhashtama (4th/8th from natal Moon), or
     the 8th house from Lagna?
     -> Saturn's shami-samidha homa, mustard-oil daan and japa.

All four steps reuse data already computed for the rest of /kundali/detail —
chart.house_lord, chart.planets[*].dignity/combust/shadbala_ratio,
chart.maha_lord/antar_lord, chart.aspects_to, and engine.vedic.gochar for
Saturn's current transit position — nothing here recomputes astrology math
the engine doesn't already do.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.vedic.gochar import get_gochar_table
from engine.vedic.interpretation import Chart, DUSTHANA, PLANET_NE, TRIKONA, _angular_sep

MARAKA_HOUSES = {2, 7}
BENEFIC_HOUSES = TRIKONA  # {1, 5, 9} — Lagnesha, Panchamesha, Navamesha

# Orb for a "severe" (close) conjunction between a malefic and a benefic-group
# planet in Step 3. Same-house/same-sign alone is too broad a net — against a
# multi-house watch set it fires on almost any chart by chance, so this
# requires the planets to actually stand close together in longitude, the
# same magnitude of orb this engine already uses for combustion (8-17°).
STEP3_CONJUNCTION_ORB_DEG = 10.0

_REASON_LABEL_NE = {
    "dusthana": "६, ८ वा १२ भावको स्वामी",
    "maraka": "मारक (२ वा ७ भावको स्वामी)",
    "debilitated": "नीच राशिमा",
    "combust": "सूर्यसँग अस्त",
}
_REASON_LABEL_EN = {
    "dusthana": "owns house 6, 8 or 12",
    "maraka": "a maraka (owns house 2 or 7)",
    "debilitated": "debilitated",
    "combust": "combust with the Sun",
}

_SADE_SATI_PHASES = {
    12: ("sadesati_first", "साढेसातीको पहिलो ढैया", "First phase of Sade Sati"),
    1: ("sadesati_peak", "साढेसातीको उत्कर्ष (चन्द्र राशिमाथि)", "Peak phase of Sade Sati (over natal Moon)"),
    2: ("sadesati_last", "साढेसातीको अन्तिम ढैया", "Final phase of Sade Sati"),
    4: ("kantak_shani", "कण्टक शनि (चतुर्थ ढैया)", "Kantak Shani (4th-from-Moon Dhaiya)"),
    8: ("ardhashtama", "अर्धाष्टम शनि (अष्टम ढैया)", "Ardhashtama Shani (8th-from-Moon Dhaiya)"),
}


def _lord_set(chart: Chart, houses: set[int]) -> set[str]:
    return {chart.house_lord.get(h) for h in houses} - {None}


def _affliction_reasons(chart: Chart, graha: str, dusthana_lords: set[str], maraka_lords: set[str]) -> list[str]:
    pf = chart.planets.get(graha)
    reasons: list[str] = []
    if graha in dusthana_lords:
        reasons.append("dusthana")
    if graha in maraka_lords:
        reasons.append("maraka")
    if pf is not None and pf.dignity == "debilitated":
        reasons.append("debilitated")
    if pf is not None and pf.combust:
        reasons.append("combust")
    return reasons


def _finding(
    step: int, title_ne: str, title_en: str, graha: str, remedy: str,
    reason_ne: str, reason_en: str,
) -> dict[str, Any]:
    return {
        "step": step,
        "stepTitleNe": title_ne,
        "stepTitleEn": title_en,
        "graha": graha,
        "grahaNe": PLANET_NE.get(graha, graha),
        "remedy": remedy,
        "reasonNe": reason_ne,
        "reasonEn": reason_en,
    }


def compute_shanti_recommendation(
    chart: Chart,
    now_utc: datetime,
) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    dusthana_lords = _lord_set(chart, DUSTHANA)
    maraka_lords = _lord_set(chart, MARAKA_HOUSES)
    benefic_lords = _lord_set(chart, BENEFIC_HOUSES)

    # ── Step 1 — current dasha/antardasha lord ────────────────────────────
    step1_ne, step1_en = "महादशा/अन्तर्दशा स्वामी परीक्षण", "Dasha / Antardasha Lord Assessment"
    for lord in {chart.maha_lord, chart.antar_lord} - {None}:
        reasons = _affliction_reasons(chart, lord, dusthana_lords, maraka_lords)
        if not reasons:
            continue
        reason_ne = " र ".join(_REASON_LABEL_NE[r] for r in reasons)
        reason_en = " and ".join(_REASON_LABEL_EN[r] for r in reasons)
        findings.append(_finding(
            1, step1_ne, step1_en, lord, "shanti",
            f"वर्तमान दशा/अन्तर्दशा स्वामी {PLANET_NE.get(lord, lord)} {reason_ne} — "
            "यसको जप, दान र नवग्रह शान्ति अनिवार्य।",
            f"The current dasha/antardasha lord {lord.title()} is {reason_en} — "
            "its japa, daan and navagraha shanti are mandatory.",
        ))

    # ── Step 2 — Lagnesha / Panchamesha / Navamesha (yogakaraka) strength ─
    step2_ne, step2_en = "लग्नेश/योगकारक बल परीक्षण", "Lagnesha / Yogakaraka Strength Assessment"
    for graha in benefic_lords:
        pf = chart.planets.get(graha)
        if pf is None:
            continue
        weak = (
            (pf.shadbala_ratio is not None and pf.shadbala_ratio < 1.0)
            or pf.dignity == "debilitated"
            or pf.combust
        )
        if not weak:
            continue
        findings.append(_finding(
            2, step2_ne, step2_en, graha, "strengthen",
            f"{PLANET_NE.get(graha, graha)} लग्नेश/पञ्चमेश/नवमेश भई कमजोर छ — "
            "रत्न धारण र मन्त्र पाठद्वारा सबल बनाउनुपर्छ (दान गरिँदैन)।",
            f"{graha.title()}, a Lagnesha/5th/9th lord, is weak — strengthen with "
            "a gem and mantra japa (no daan for this planet).",
        ))

    # ── Step 3 — Rahu/Ketu/Saturn afflicting a benefic graha or bhava ─────
    # "अत्यधिक पीडित" (severely afflicted) is read as a close (tight-orb)
    # conjunction with a Lagnesha/5th/9th-lord planet — not merely sharing a
    # house/sign, which spans up to 30° and, checked against a multi-planet
    # watch set with three candidate malefics, overlaps on almost every
    # chart by chance and carries no real signal.
    step3_ne, step3_en = "राहु/केतु/शनिद्वारा शुभ ग्रह वा भाव पीडा परीक्षण", "Rahu/Ketu/Saturn Affliction Check"
    for graha in ("rahu", "ketu", "saturn"):
        pf = chart.planets.get(graha)
        if pf is None:
            continue
        afflicted_lord = next(
            (
                b for b in benefic_lords
                if (bp := chart.planets.get(b)) is not None
                and _angular_sep(pf.longitude, bp.longitude) < STEP3_CONJUNCTION_ORB_DEG
            ),
            None,
        )
        if afflicted_lord is None:
            continue
        findings.append(_finding(
            3, step3_ne, step3_en, graha, "pacify",
            f"{PLANET_NE.get(graha, graha)} लग्नेश/पञ्चमेश/नवमेश {PLANET_NE.get(afflicted_lord, afflicted_lord)}सँग "
            "नजिकबाट युति गरी पीडित गरिरहेको छ — यसको वैदिक जप, हवन र दानद्वारा शान्त गर्नुपर्छ "
            "(रत्न कहिल्यै लगाइँदैन)।",
            f"{graha.title()} stands in close conjunction with {afflicted_lord.title()} "
            "(Lagnesha/5th/9th lord), afflicting it — pacify with Vedic japa, homa and "
            "daan (never wear this planet's gem).",
        ))

    # ── Step 4 — Saturn's Sade Sati / Dhaiya / 8th-from-Lagna transit ─────
    step4_ne, step4_en = "शनिको गोचर (साढेसाती/ढैया/अष्टम)", "Saturn's Transit (Sade Sati / Dhaiya / 8th-from-Lagna)"
    try:
        saturn_rashi_no = get_gochar_table(now_utc)["saturn"]["rashi_no"]
    except Exception:
        saturn_rashi_no = None
    if saturn_rashi_no is not None:
        natal_moon_rashi = chart.moon_sign + 1
        houses_from_moon = ((saturn_rashi_no - natal_moon_rashi) % 12) + 1
        lagna_rashi = chart.lagna_sign + 1
        houses_from_lagna = ((saturn_rashi_no - lagna_rashi) % 12) + 1

        phase = _SADE_SATI_PHASES.get(houses_from_moon)
        if phase is None and houses_from_lagna == 8:
            phase = ("ashtama_lagna", "लग्नबाट अष्टम शनि गोचर", "Saturn transiting the 8th from Lagna")

        if phase is not None:
            _key, phase_ne, phase_en = phase
            findings.append(_finding(
                4, step4_ne, step4_en, "saturn", "pacify_transit",
                f"शनि हाल {phase_ne} अवस्थामा गोचर गरिरहेका छन् — "
                "शमी समिधा हवन, तोरीको तेल दान र जपद्वारा शान्ति गर्नुपर्छ।",
                f"Saturn is currently transiting in {phase_en} — pacify with Shami-wood "
                "homa, mustard-oil daan and japa.",
            ))

    return {"findings": findings}
