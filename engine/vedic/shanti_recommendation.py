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
  3. Affliction check — two parts, both feeding the same pacification
     remedy (japa + homa + daan, never a gem) for the malefic, plus a
     "soothe" remedy for the luminary/Lagnesha it afflicts:
       (a) is Rahu, Ketu or Saturn conjunct (same rashi as) a
           Lagnesha/5th/9th-lord planet?
       (b) is a luminary or the mind directly hit by a named classical
           yoga — Vish Yoga (Saturn-Moon, by conjunction or Saturn's
           3rd/7th/10th aspect), Grahan Yoga (Rahu/Ketu-Sun or
           Rahu/Ketu-Moon), Angarak Yoga (Mars-Rahu), or Guru-Chandal
           Yoga (Jupiter-Rahu)?
  4. Saturn's transit — is transiting Saturn in Sade Sati (12th/1st/2nd
     from natal Moon), Dhaiya/Ardhashtama (4th/8th from natal Moon), or
     the 8th house from Lagna?
     -> Saturn's shami-samidha homa, mustard-oil daan and japa.

Each finding also carries a `tier` — "critical" (an active dasha/transit, or
a yoga landing on a luminary or the Lagnesha) or "core" (a real but less
time-pressured affliction, e.g. a secondary stellium yuti or a weak trikona
lord) — so the UI can show the headline items expanded and group the rest,
without pretending to a finer per-rule severity score this app has no
methodology to defend.

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
from engine.vedic.interpretation import Chart, DUSTHANA, PLANET_NE, TRIKONA

MARAKA_HOUSES = {2, 7}
BENEFIC_HOUSES = TRIKONA  # {1, 5, 9} — Lagnesha, Panchamesha, Navamesha


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


def _conjunct(chart: Chart, a: str, b: str) -> bool:
    """Classical yuti: the two grahas share a rashi (house), the standard
    textbook test for Vish/Grahan/Angarak/Guru-Chandal Yoga — not a tight
    degree orb. A same-house pair can stand 0-30° apart; e.g. Saturn at
    6°33′ and Moon at 27°04′ in the same rashi are ~20° apart and still a
    textbook Vish Yoga.
    """
    pa, pb = chart.planets.get(a), chart.planets.get(b)
    if pa is None or pb is None:
        return False
    return pa.house == pb.house


def _finding(
    step: int, title_ne: str, title_en: str, graha: str, remedy: str,
    reason_ne: str, reason_en: str, tier: str,
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
        # "critical" — active dasha/transit, or a yoga landing on a luminary
        # (Sun/Moon) or the Lagnesha; "core" — everything else real but less
        # time-pressured (a secondary stellium yuti, a weak trikona lord).
        # Not a fine-grained 1-10 score: this app has no defensible
        # methodology to rank dozens of rule branches against each other at
        # that resolution, so it sticks to a boundary it can actually justify.
        "tier": tier,
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
            "critical",
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
            "core",
        ))

    # ── Step 3 — functional-benefic affliction + luminary/mind yogas ──────
    # "अत्यधिक पीडित" (severely afflicted) is read as the classical yuti
    # test (`_conjunct` — same rashi/house), scoped to specific, named
    # two-planet pairs rather than a broad watch-set-plus-aspects sweep,
    # which (checked against several houses across three malefics) would
    # overlap on almost every chart by chance and carry no real signal.
    step3_ne = "राहु/केतु/शनि/मङ्गल/बृहस्पतिद्वारा शुभ ग्रह, चन्द्र वा सूर्यको पीडा परीक्षण"
    step3_en = "Rahu/Ketu/Saturn/Mars/Jupiter Affliction Check (incl. Vish/Grahan/Angarak/Guru-Chandal Yoga)"

    # Tracks (malefic, afflicted-graha) pairs already reported as "pacify" —
    # e.g. Ketu conjunct the Sun is both "afflicts the Lagnesha" (a) and
    # "Grahan Yoga on the Sun" (c) when the Sun is itself the Lagnesha; (c)
    # then adds only the new "soothe" finding for the Sun, not a second
    # near-identical "pacify Ketu" card.
    reported_pacify: set[tuple[str, str]] = set()

    # (a) Rahu/Ketu/Saturn conjunct a Lagnesha/5th/9th-lord planet.
    for graha in ("rahu", "ketu", "saturn"):
        pf = chart.planets.get(graha)
        if pf is None:
            continue
        afflicted_lord = next(
            (b for b in benefic_lords if _conjunct(chart, graha, b)),
            None,
        )
        if afflicted_lord is None:
            continue
        reported_pacify.add((graha, afflicted_lord))
        findings.append(_finding(
            3, step3_ne, step3_en, graha, "pacify",
            f"{PLANET_NE.get(graha, graha)} लग्नेश/पञ्चमेश/नवमेश {PLANET_NE.get(afflicted_lord, afflicted_lord)}सँग "
            "एउटै भावमा युति गरी पीडित गरिरहेको छ — यसको वैदिक जप, हवन र दानद्वारा शान्त गर्नुपर्छ "
            "(रत्न कहिल्यै लगाइँदैन)।",
            f"{graha.title()} is conjunct {afflicted_lord.title()} (Lagnesha/5th/9th lord) "
            "in the same house, afflicting it — pacify with Vedic japa, homa and daan "
            "(never wear this planet's gem).",
            "critical" if afflicted_lord in ("sun", "moon") else "core",
        ))

    # (b) Vish Yoga — Saturn conjunct, or special-aspecting (3rd/7th/10th), the Moon.
    moon = chart.planets.get("moon")
    if moon is not None and chart.planets.get("saturn") is not None:
        vish = _conjunct(chart, "saturn", "moon") or "saturn" in chart.aspects_to(moon.house)
        if vish:
            if ("saturn", "moon") not in reported_pacify:
                reported_pacify.add(("saturn", "moon"))
                findings.append(_finding(
                    3, step3_ne, step3_en, "saturn", "pacify",
                    "शनि र चन्द्रको युति/दृष्टिले विष योग बनेको छ (मानसिक अशान्ति, चिन्ता, ढिलाइ) — "
                    "शनिको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                    "Saturn's conjunction or aspect on the Moon forms Vish Yoga (mental unrest, "
                    "anxiety, delays) — pacify Saturn with japa, homa and daan (never wear its gem).",
                    "critical",
                ))
            findings.append(_finding(
                3, step3_ne, step3_en, "moon", "soothe",
                "शनिसँगको विष योगले चन्द्र (मन) पीडित भएको छ — चन्द्रको जप र रुद्राभिषेकद्वारा शान्ति गर्नुपर्छ।",
                "Saturn's Vish Yoga is afflicting the Moon (the mind) — soothe it with Moon "
                "japa and Rudrabhishek.",
                "critical",
            ))

    # (c) Grahan Yoga — Rahu or Ketu conjunct the Sun or Moon.
    for node in ("rahu", "ketu"):
        for luminary in ("sun", "moon"):
            if not _conjunct(chart, node, luminary):
                continue
            node_ne, lum_ne = PLANET_NE.get(node, node), PLANET_NE.get(luminary, luminary)
            if (node, luminary) not in reported_pacify:
                reported_pacify.add((node, luminary))
                findings.append(_finding(
                    3, step3_ne, step3_en, node, "pacify",
                    f"{node_ne}ले {lum_ne}सँग ग्रहण योग बनाएको छ — {node_ne}को वैदिक जप, हवन र "
                    "दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                    f"{node.title()}'s conjunction with {luminary.title()} forms Grahan (eclipse) "
                    f"Yoga — pacify {node.title()} with japa, homa and daan (never wear its gem).",
                    "critical",
                ))
            findings.append(_finding(
                3, step3_ne, step3_en, luminary, "soothe",
                f"{node_ne}सँगको ग्रहण योगले {lum_ne} पीडित भएको छ — यसको आफ्नै शान्ति/जपद्वारा सुधार्नुपर्छ।",
                f"{node.title()}'s Grahan Yoga is afflicting {luminary.title()} — soothe it "
                "with its own japa and shanti.",
                "critical",
            ))

    # (d) Angarak Yoga — Mars conjunct Rahu.
    if _conjunct(chart, "mars", "rahu"):
        if ("rahu", "mars") not in reported_pacify:
            reported_pacify.add(("rahu", "mars"))
            findings.append(_finding(
                3, step3_ne, step3_en, "rahu", "pacify",
                "राहु र मङ्गलको युतिले अङ्गारक योग बनेको छ (दुर्घटना, आवेश, विवाद) — राहुको वैदिक जप, "
                "हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                "Rahu's conjunction with Mars forms Angarak Yoga (accidents, impulsiveness, "
                "disputes) — pacify Rahu with japa, homa and daan (never wear its gem).",
                "core",
            ))
        findings.append(_finding(
            3, step3_ne, step3_en, "mars", "soothe",
            "अङ्गारक योगले मङ्गल पीडित/उग्र भएको छ — मङ्गलको जप र दानद्वारा सुधार्नुपर्छ।",
            "Angarak Yoga leaves Mars afflicted and volatile — soothe it with its own japa "
            "and daan.",
            "core",
        ))

    # (e) Guru-Chandal Yoga — Jupiter conjunct Rahu.
    if _conjunct(chart, "jupiter", "rahu"):
        if ("rahu", "jupiter") not in reported_pacify:
            reported_pacify.add(("rahu", "jupiter"))
            findings.append(_finding(
                3, step3_ne, step3_en, "rahu", "pacify",
                "राहु र बृहस्पतिको युतिले गुरु-चाण्डाल योग बनेको छ (सल्लाह/नैतिकतामा भ्रम) — राहुको "
                "वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                "Rahu's conjunction with Jupiter forms Guru-Chandal Yoga (confused judgement/"
                "ethics) — pacify Rahu with japa, homa and daan (never wear its gem).",
                "core",
            ))
        findings.append(_finding(
            3, step3_ne, step3_en, "jupiter", "soothe",
            "गुरु-चाण्डाल योगले बृहस्पति पीडित भएको छ — बृहस्पतिको जप र दानद्वारा सुधार्नुपर्छ।",
            "Guru-Chandal Yoga leaves Jupiter afflicted — soothe it with its own japa and "
            "daan.",
            "core",
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
                "critical",
            ))

    return {"findings": findings}
