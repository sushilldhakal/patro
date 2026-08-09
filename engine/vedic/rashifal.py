"""Daily rashifal from sunrise panchanga — चन्द्रबल (navatara) + Moorti Nirnaya.

Transit Moon at local sunrise is taken from Drik Ganita (Lahiri sidereal). For each
janma rashi (moon sign), navatara tara/quality comes from the same algorithm as
``chandrabala_table``; Moorti classifies the transit Moon's house counted from
that janma sign (Swarna / Rajata / Tamra / Loha).
"""

from __future__ import annotations

from typing import Any, Literal

from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE
from engine.vedic.navatara import NavataraTone

MoortiKind = Literal["swarna", "rajata", "tamra", "loha"]

# Nama-rashi syllables (janma name sounds) — one line per rashi, Mesha → Meena.
RASHI_NAMA_AKSHARAS_NE: list[str] = [
    "चु चे चो ला लि लु ले लो अ",
    "इ उ ए ओ वा वि वु वे वो",
    "का कि कु घ ङ छ के को हा",
    "हि हु हे हो डा डि डु डे डो",
    "मा मि मु मे मो टा ति टु टे",
    "टो पा पि पु ष ण ठ पे पो",
    "रा रि रु रे रो ता ति तु ते",
    "तो ना नि नु ने नो या यि यु",
    "ये यो भा भि भु धा फा ढा भे",
    "भो जा जि जु जे जो ख खि खु खे खो गा गि",
    "गु गे गो सा सि सु से सो दा",
    "दि दु थ झ ञ दे दो चा चि",
]

RASHI_TITLE_EN: list[str] = [
    "Mesh", "Vrish", "Mithun", "Karkat", "Simha", "Kanya",
    "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbha", "Meen",
]

_MOORTI_BY_HOUSE: dict[int, MoortiKind] = {}
for _h in (1, 6, 11):
    _MOORTI_BY_HOUSE[_h] = "swarna"
for _h in (2, 5, 9):
    _MOORTI_BY_HOUSE[_h] = "rajata"
for _h in (3, 7, 10):
    _MOORTI_BY_HOUSE[_h] = "tamra"
for _h in (4, 8, 12):
    _MOORTI_BY_HOUSE[_h] = "loha"

_MOORTI_NE: dict[MoortiKind, str] = {
    "swarna": "स्वर्ण",
    "rajata": "रजत",
    "tamra": "ताम्र",
    "loha": "लोह",
}
_MOORTI_EN: dict[MoortiKind, str] = {
    "swarna": "Swarna (gold)",
    "rajata": "Rajata (silver)",
    "tamra": "Tamra (copper)",
    "loha": "Loha (iron)",
}

_LUCKY_COLOR_NE: dict[MoortiKind, str] = {
    "swarna": "पहेलो",
    "rajata": "सेतो",
    "tamra": "हरियो",
    "loha": "रातो",
}
_LUCKY_COLOR_EN: dict[MoortiKind, str] = {
    "swarna": "Yellow",
    "rajata": "White",
    "tamra": "Green",
    "loha": "Red",
}

_DIGIT_NE = "०१२३४५६७८९"

_TONE_PHALA_NE: dict[NavataraTone, str] = {
    "best": "चन्द्रबल अनुकूल — महत्त्वपूर्ण काम, यात्रा र नयाँ सुरुवातका लागि शुभ।",
    "good": "प्रायः अनुकूल दिन — योजना र सम्बन्धमा स्थिर प्रगति।",
    "neutral": "मध्यम वा मिश्र फल — सावधानी अपनाउनुहोस्; दैनिक काम ठीक छ।",
    "bad": "चन्द्रबल कमजोर — ठूला निर्णय स्थगित गर्नुहोस्; जोखिम टाढा राख्नुहोला।",
    "worst": "अति अशुभ चन्द्रबल — जोखिमपूर्ण कार्य नगर्नुहोस्; साधना र विश्राम श्रेय।",
}
_TONE_PHALA_EN: dict[NavataraTone, str] = {
    "best": "Strong chandrabala — auspicious for important work, travel and new beginnings.",
    "good": "Generally favourable — steady progress on plans and relationships.",
    "neutral": "Mixed or moderate — proceed with care; routine work is fine.",
    "bad": "Weak chandrabala — delay major decisions; avoid unnecessary risk.",
    "worst": "Very inauspicious chandrabala — avoid risky ventures; rest and spiritual practice help.",
}

_MOORTI_PHALA_NE: dict[MoortiKind, str] = {
    "swarna": "गोचर चन्द्रको मूर्ति स्वर्ण — फलदायी।",
    "rajata": "मूर्ति रजत — शुभ फल प्राप्त हुनेछ।",
    "tamra": "मूर्ति ताम्र — सामान्य; धैर्य र सावधानी राख्नुहोस्।",
    "loha": "मूर्ति लोह — फल कमजोर; उपाय र संयम अपनाउनुहोला।",
}
_MOORTI_PHALA_EN: dict[MoortiKind, str] = {
    "swarna": "Transit Moorti is Swarna — highly fruitful.",
    "rajata": "Rajata Moorti — favourable results.",
    "tamra": "Tamra Moorti — average; stay patient and careful.",
    "loha": "Loha Moorti — results may fall short; remedies and restraint help.",
}

_REMEDY_NE: list[str] = [
    "सबै प्रकारका जोखिमपूर्ण कार्यबाट टाढै रहनुहोला।",
    "आफ्नो इष्टदेव वा कुलदेवताको स्मरण गरी दिनको प्रारम्भ गर्नुहोला।",
    "घरमा शान्ति कायम राख्न रिसलाई नियन्त्रण गर्नुहोला।",
    "नजिकको मन्दिरमा दियो बाल्नु वा दानपुण्य गर्नु शान्तिदायक हुनेछ।",
    "खानपानमा ध्यान दिनुहोला।",
    "भगवान गणेशको दर्शन गरी दान गर्नु शुभ रहनेछ।",
    "कार्यक्षेत्रमा सम्मानजनक व्यवहार गर्नुहोला।",
    "महामृत्युञ्जय जप वा शिवजीको उपासना गर्नुहोला।",
    "लगनशीलता र धैर्यता कायम राख्नुहोला।",
    "मान्यजन र गुरुहरूको सम्मान गर्नुहोला।",
    "पिपलमा जल चढाउनु वा विष्णुको दर्शन गर्नुहोला।",
    "सवारी साधनमा सावधानी अपनाउनुहोला।",
]
_REMEDY_EN: list[str] = [
    "Stay away from all risky undertakings.",
    "Begin the day remembering your ishta or kuladevata.",
    "Keep peace at home and hold anger in check.",
    "Light a lamp at a nearby temple or give charity for calm.",
    "Mind what you eat.",
    "Visit Ganesh and give a small donation.",
    "Treat colleagues with respect.",
    "Chant Mahamrityunjaya or worship Shiva.",
    "Stay diligent and patient.",
    "Honour elders and teachers.",
    "Offer water at a pipal tree or visit Vishnu.",
    "Be careful in vehicles.",
]


def _house_from_janma(transit_moon_idx: int, janma_rashi_idx: int) -> int:
    """Bhava counted from janma rashi (transit Moon sign as gochar house)."""
    return (transit_moon_idx - janma_rashi_idx) % 12 + 1


def _moorti_for_house(house: int) -> MoortiKind:
    return _MOORTI_BY_HOUSE.get(house, "tamra")


def _to_ne_digit(n: int) -> str:
    return "".join(_DIGIT_NE[int(c)] for c in str(n))


def _prediction(
    tone: NavataraTone,
    moorti: MoortiKind,
    rashi_idx: int,
    *,
    lang: Literal["ne", "en"],
) -> str:
    if lang == "ne":
        parts = [_TONE_PHALA_NE[tone], _MOORTI_PHALA_NE[moorti]]
        if tone in ("bad", "worst"):
            parts.append(_REMEDY_NE[rashi_idx % len(_REMEDY_NE)])
        return " ".join(parts)
    parts = [_TONE_PHALA_EN[tone], _MOORTI_PHALA_EN[moorti]]
    if tone in ("bad", "worst"):
        parts.append(_REMEDY_EN[rashi_idx % len(_REMEDY_EN)])
    return " ".join(parts)


def _tone_score(tone: NavataraTone) -> int:
    return {"worst": 0, "bad": 1, "neutral": 2, "good": 3, "best": 4}[tone]


def build_daily_rashifal(
    chandrabala_table: dict[str, Any],
    *,
    vaara_num: int | None = None,
) -> dict[str, Any]:
    """Twelve-sign daily rashifal from an existing chandrabala table."""
    rows = chandrabala_table.get("rows") or []
    if len(rows) != 12:
        raise ValueError("chandrabala_table must have 12 rows")

    transit_idx = int(chandrabala_table.get("moon_index", 0))
    signs: list[dict[str, Any]] = []

    for row in rows:
        idx = int(row["index"])
        tone: NavataraTone = row.get("tone") or "neutral"
        tara_num = int(row.get("tara_num") or 1)
        house = _house_from_janma(transit_idx, idx)
        moorti = _moorti_for_house(house)

        signs.append(
            {
                "index": idx,
                "id": idx + 1,
                "name": row.get("name") or RASHI_NAMES_NE[idx],
                "name_en": row.get("name_en") or RASHI_NAMES[idx],
                "title_en": RASHI_TITLE_EN[idx],
                "syllables_ne": RASHI_NAMA_AKSHARAS_NE[idx],
                "tara": row.get("tara"),
                "quality": row.get("quality"),
                "tone": tone,
                "tara_num": tara_num,
                "house_from_moon": house,
                "moorti": moorti,
                "moorti_ne": _MOORTI_NE[moorti],
                "moorti_en": _MOORTI_EN[moorti],
                "lucky_color_ne": _LUCKY_COLOR_NE[moorti],
                "lucky_color_en": _LUCKY_COLOR_EN[moorti],
                "lucky_number_ne": _to_ne_digit(tara_num),
                "lucky_number_en": str(tara_num),
                "prediction_ne": _prediction(tone, moorti, idx, lang="ne"),
                "prediction_en": _prediction(tone, moorti, idx, lang="en"),
            }
        )

    meta: dict[str, Any] = {
        "period": "daily",
        "anchor": "sunrise",
        "vaara_num": vaara_num,
        "method": {
            "frame": "drik_ganita",
            "ayanamsa": "Lahiri",
            "chandrabala": "navatara_9_cycle",
            "moorti": "transit_moon_house_from_janma_rashi",
        },
        "moon_index": transit_idx,
        "moon_label": chandrabala_table.get("moon_label"),
        "moon_label_en": chandrabala_table.get("moon_label_en"),
        "signs": signs,
    }
    return meta


def aggregate_rashifal_signs(
    daily_blocks: list[dict[str, Any]],
    *,
    period: Literal["weekly", "monthly"],
) -> dict[str, Any]:
    """Merge multiple daily rashifal blocks into one period summary per sign."""
    if not daily_blocks:
        raise ValueError("daily_blocks required")

    by_id: dict[int, list[dict[str, Any]]] = {i: [] for i in range(1, 13)}
    for block in daily_blocks:
        for sign in block.get("signs") or []:
            by_id[int(sign["id"])].append(sign)

    merged: list[dict[str, Any]] = []
    for rashi_idx in range(12):
        rid = rashi_idx + 1
        parts = by_id[rid]
        if not parts:
            continue
        # Weakest tone in the window drives caution; tara_num mode for lucky number.
        worst = min(parts, key=lambda s: _tone_score(s.get("tone") or "neutral"))
        tara_nums = [int(s.get("tara_num") or 1) for s in parts]
        mode_tara = max(set(tara_nums), key=tara_nums.count)
        moorti_counts: dict[MoortiKind, int] = {}
        for s in parts:
            m = s.get("moorti") or "tamra"
            moorti_counts[m] = moorti_counts.get(m, 0) + 1
        dominant_moorti = max(moorti_counts, key=moorti_counts.get)

        tone: NavataraTone = worst.get("tone") or "neutral"
        sample = parts[0]
        if period == "weekly":
            intro_ne = f"यो हप्तामा {len(parts)} दिनको चन्द्रबल — सबैभन्दा कमजोर दिन अनुसार सावधानी।"
            intro_en = f"This week spans {len(parts)} days — guidance follows the weakest chandrabala day."
        else:
            intro_ne = f"यो महिनामा {len(parts)} दिनको चन्द्रबल — सबैभन्दा कमजोर दिन अनुसार सावधानी।"
            intro_en = f"This month spans {len(parts)} days — guidance follows the weakest chandrabala day."

        merged.append(
            {
                **{k: sample[k] for k in (
                    "index", "id", "name", "name_en", "title_en", "syllables_ne",
                ) if k in sample},
                "tara": worst.get("tara"),
                "quality": worst.get("quality"),
                "tone": tone,
                "tara_num": mode_tara,
                "house_from_moon": worst.get("house_from_moon"),
                "moorti": dominant_moorti,
                "moorti_ne": _MOORTI_NE[dominant_moorti],
                "moorti_en": _MOORTI_EN[dominant_moorti],
                "lucky_color_ne": _LUCKY_COLOR_NE[dominant_moorti],
                "lucky_color_en": _LUCKY_COLOR_EN[dominant_moorti],
                "lucky_number_ne": _to_ne_digit(mode_tara),
                "lucky_number_en": str(mode_tara),
                "prediction_ne": f"{intro_ne} {_prediction(tone, dominant_moorti, rashi_idx, lang='ne')}",
                "prediction_en": f"{intro_en} {_prediction(tone, dominant_moorti, rashi_idx, lang='en')}",
                "days_in_period": len(parts),
            }
        )

    first = daily_blocks[0]
    return {
        "period": period,
        "anchor": "sunrise",
        "method": first.get("method"),
        "moon_label": first.get("moon_label"),
        "moon_label_en": first.get("moon_label_en"),
        "days_computed": len(daily_blocks),
        "signs": merged,
    }
