"""Ashtakuta (36-guna) kundali milan — varna, vashya, tara, yoni, maitri,
gana, bhakuta and nadi kutas with dosha analysis and recommendation."""

from __future__ import annotations

from typing import Any

from engine.astronomy.positions import RASHI_NAMES
from engine.vedic.avakahada import (
    ASHTA_VASHYA_EN,
    ASHTA_VASHYA_NE,
    AVAKAHADA,
    NADI_EN,
    RASHI_KEYS_NE,
    RASHI_VARNA_NE,
    VARNA_EN,
    VARNA_RANK,
    YONI_EN,
    GANA_EN,
    janma_tara_from_nak_index,
)

_RASHI_LORD = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
]

_LORD_FRIENDS = {
    "sun": ["moon", "mars", "jupiter"],
    "moon": ["sun", "mercury"],
    "mars": ["sun", "moon", "jupiter"],
    "mercury": ["sun", "venus"],
    "jupiter": ["sun", "moon", "mars"],
    "venus": ["mercury", "saturn"],
    "saturn": ["mercury", "venus"],
}

_LORD_ENEMIES = {
    "sun": ["venus", "saturn"],
    "moon": [],
    "mars": ["mercury"],
    "mercury": ["moon"],
    "jupiter": ["mercury", "venus"],
    "venus": ["sun", "moon"],
    "saturn": ["sun", "moon", "mars"],
}

_LORD_NE = {
    "sun": "सूर्य", "moon": "चन्द्र", "mars": "मंगल", "mercury": "बुध",
    "jupiter": "गुरु", "venus": "शुक्र", "saturn": "शनि",
}
_LORD_EN = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
}

# 2-point matrix for वश्य कूट (rows = boy, cols = girl).
_VASHYA_POINTS = {
    "चतुष्पद": {"चतुष्पद": 2, "मानव": 1, "जलचर": 1, "वनचर": 1.5, "कीट": 1},
    "मानव": {"चतुष्पद": 1, "मानव": 2, "जलचर": 1.5, "वनचर": 0, "कीट": 1},
    "जलचर": {"चतुष्पद": 1, "मानव": 1.5, "जलचर": 2, "वनचर": 1.5, "कीट": 1},
    "वनचर": {"चतुष्पद": 0, "मानव": 0, "जलचर": 0, "वनचर": 2, "कीट": 0},
    "कीट": {"चतुष्पद": 1, "मानव": 0, "जलचर": 1, "वनचर": 0, "कीट": 2},
}

_YONI_FRIENDS = {
    "अश्व": ["गज", "मेष"],
    "गज": ["अश्व", "मेष"],
    "सिंह": ["मार्जार"],
    "मार्जार": ["सिंह", "मूषक"],
    "मूषक": ["मार्जार"],
    "सर्प": ["मृग"],
    "मृग": ["सर्प"],
    "श्वान": ["मृग"],
    "गौ": ["महिष"],
    "महिष": ["गौ"],
    "वानर": ["नकुल"],
    "नकुल": ["वानर"],
}

_KUTA_META = {
    "varna": {
        "max": 1,
        "areaEn": "Obedience", "areaNe": "आज्ञापालन",
        "infoEn": "Varna Kuta is assigned 1 point. Varna Kuta represents mutual love, comfort and obedience. Grade of spiritual development also depends on Varna Kuta.",
        "infoNe": "वर्ण कूट १ अङ्कको हुन्छ। यसले पारस्परिक प्रेम, सुख र आज्ञापालन देखाउँछ। आध्यात्मिक विकासको स्तर पनि वर्ण कूटमा निर्भर गर्दछ।",
    },
    "vashya": {
        "max": 2,
        "areaEn": "Mutual Control", "areaNe": "पारस्परिक नियन्त्रण",
        "infoEn": "Vashya Kuta is assigned 2 points. Vashya Kuta represents mutual control or dominance. It also shows friendship and amenability between the couple.",
        "infoNe": "वश्य कूट २ अङ्कको हुन्छ। यसले पारस्परिक नियन्त्रण वा प्रभुत्व देखाउँछ र दम्पतीबीच मित्रता तथा अनुनय-मनुनय पनि।",
    },
    "tara": {
        "max": 3,
        "areaEn": "Luck", "areaNe": "भाग्य",
        "infoEn": "Tara Kuta is assigned 3 points. Tara Kuta represents luck, auspiciousness and transmission of mutual beneficence between the couple.",
        "infoNe": "तारा कूट ३ अङ्कको हुन्छ। यसले भाग्य, शुभता र दम्पतीबीच पारस्परिक कल्याणको संचार देखाउँछ।",
    },
    "yoni": {
        "max": 4,
        "areaEn": "Sexual Aspects", "areaNe": "काम सम्बन्ध",
        "infoEn": "Yoni Kuta is assigned 4 points. Yoni Kuta, as name suggests, represents sexual aspects including sexual urge and copulatory organs.",
        "infoNe": "योनि कूट ४ अङ्कको हुन्छ। यसले यौन इच्छा र यौन अङ्गसम्बन्धी पक्ष देखाउँछ।",
    },
    "maitri": {
        "max": 5,
        "areaEn": "Affection", "areaNe": "स्नेह",
        "infoEn": "Maitri Kuta is assigned 5 points. Graha Maitri represents psychological disposition, mental qualities and affection between the couple.",
        "infoNe": "मैत्री कूट ५ अङ्कको हुन्छ। ग्रह मैत्रीले मानसिक स्वभाव, गुण र दम्पतीबीच स्नेह देखाउँछ।",
    },
    "gana": {
        "max": 6,
        "areaEn": "Nature", "areaNe": "स्वभाव",
        "infoEn": "Gana Kuta is assigned 6 points. Gana Kuta represents nature, longevity, wealth, prosperity and love.",
        "infoNe": "गण कूट ६ अङ्कको हुन्छ। यसले स्वभाव, दीर्घायु, धन, समृद्धि र प्रेम देखाउँछ।",
    },
    "bhakuta": {
        "max": 7,
        "areaEn": "Love", "areaNe": "प्रेम",
        "infoEn": "Bhakuta Kuta is assigned 7 points. Bhakuta Kuta represents children, wealth, comforts, good luck and growth of the family.",
        "infoNe": "भकूट कूट ७ अङ्कको हुन्छ। यसले सन्तान, धन, सुख, भाग्य र परिवारको वृद्धि देखाउँछ।",
    },
    "nadi": {
        "max": 8,
        "areaEn": "Health", "areaNe": "स्वास्थ्य",
        "infoEn": "Nadi Kuta is assigned 8 points. Nadi Kuta represents temperament, nervous energy, and affliction.",
        "infoNe": "नाडी कूट ८ अङ्कको हुन्छ। यसले स्वभाव, स्नायु ऊर्जा र पीडा देखाउँछ।",
    },
}

_NOTES_EN = [
    "In Ashta-Kuta system of match making, the maximum number of Gunas are 36. If total Gunas between the couple are between 31 and 36 (both inclusive) then the union is excellent, Gunas between 21 and 30 (both inclusive) are very good, Gunas between 17 and 20 (both inclusive) are middling and Gunas between 0 and 16 (both inclusive) are inauspicious.",
    "It is also opined that the above grouping is applicable when Bhakuta Kuta is favorable. If Bhakuta Kuta is unfavorable then union is never excellent, Gunas between 26 and 29 (both inclusive) are very good, Gunas between 21 and 25 (both inclusive) are middling and Gunas between 0 and 20 (both inclusive) are inauspicious.",
    "Nadi Kuta carries high importance in many Ashtakuta traditions. When both partners share the same Nadi, Nadi Dosha is noted—but schools differ on whether this alone forbids marriage. Cancellation and mitigation are often considered (e.g. different padas, Moon strength, Navamsa, aspects). Consult a qualified astrologer for a full judgment.",
    "Note - Mangal Dosha which is also known as Kuja Dosha is NOT considered while Ashtakuta match making. If Mangal Dosha is present then both Vara and Kanya should have Mangal Dosha. It is advised not to perform match making between Mangalik and Non-Mangalik couple.",
]

_NOTES_NE = [
    "अष्टकूट मिलनमा अधिकतम ३६ गुण हुन्छन्। ३१ देखि ३६ सम्म उत्कृष्ट, २१ देखि ३० सम्म अत्यन्त राम्रो, १७ देखि २० सम्म मध्यम र ० देखि १६ सम्म अशुभ मानिन्छ।",
    "भकूट कूट अनुकूल नभएमा माथिको वर्गीकरण लागू हुँदैन — २६–२९ अत्यन्त राम्रो, २१–२५ मध्यम, ०–२० अशुभ।",
    "धेरै परम्परामा नाडी कूटलाई विशेष महत्त्व दिइन्छ। दुवै पक्षको नाडी एकै भए नाडी दोष देखिन्छ, तर यसले मात्रै मिलन रोक्छ भन्ने सबै मान्दैनन् — शिथिल/शमन (फरक पाद, चन्द्र बल, नवांश, दृष्टि आदि) पनि हेर्न सकिन्छ। पूर्ण निर्णयका लागि योग्य ज्योतिषीसँग परामर्श गर्नुहोस्।",
    "अष्टकूट मिलनमा मंगल दोष विचार गरिँदैन। मंगल दोष भए दुवै पक्षमा हुनुपर्छ; मंगलीक र अ-मंगलीकबीच मिलन नगर्न सल्लाह दिइन्छ।",
]


def _is_en(lang: str | None) -> bool:
    return (lang or "ne").startswith("en")


def _varna_ne(rashi_num: int) -> str | None:
    if not 1 <= rashi_num <= 12:
        return None
    return RASHI_VARNA_NE[rashi_num - 1]


def _lord_of_rashi(rashi_num: int) -> str:
    return _RASHI_LORD[rashi_num - 1] if 1 <= rashi_num <= 12 else "moon"


def _is_friend(a: str, b: str) -> bool:
    return a == b or b in _LORD_FRIENDS.get(a, [])


def _is_enemy(a: str, b: str) -> bool:
    return b in _LORD_ENEMIES.get(a, [])


def _maitri_points(boy_rashi: int, girl_rashi: int) -> float:
    a = _lord_of_rashi(boy_rashi)
    b = _lord_of_rashi(girl_rashi)
    if a == b:
        return 5
    a_friend_b, b_friend_a = _is_friend(a, b), _is_friend(b, a)
    a_enemy_b, b_enemy_a = _is_enemy(a, b), _is_enemy(b, a)
    if a_friend_b and b_friend_a:
        return 5
    if a_enemy_b and b_enemy_a:
        return 0
    if (a_friend_b and b_enemy_a) or (a_enemy_b and b_friend_a):
        return 0
    if a_friend_b or b_friend_a:
        return 4
    return 3


def _varna_points(boy_rashi: int, girl_rashi: int) -> float:
    boy_v, girl_v = _varna_ne(boy_rashi), _varna_ne(girl_rashi)
    if not boy_v or not girl_v:
        return 0
    return 1 if VARNA_RANK[boy_v] <= VARNA_RANK[girl_v] else 0


def _vashya_points(boy_rashi: int, girl_rashi: int) -> float:
    boy_v = ASHTA_VASHYA_NE[boy_rashi - 1] if 1 <= boy_rashi <= 12 else None
    girl_v = ASHTA_VASHYA_NE[girl_rashi - 1] if 1 <= girl_rashi <= 12 else None
    if boy_v is None or girl_v is None:
        return 0
    return _VASHYA_POINTS.get(boy_v, {}).get(girl_v, 0)


def _tara_count(from_nak: int, to_nak: int) -> int:
    if from_nak == to_nak:
        return 27
    return (to_nak - from_nak) % 27 + 1


def _tara_remainder(from_nak: int, to_nak: int) -> int:
    rem = _tara_count(from_nak, to_nak) % 9
    return 9 if rem == 0 else rem


def _is_tara_malefic(from_nak: int, to_nak: int) -> bool:
    """Saravali / Maitreya: malefic taras are Vipat (3), Pratyak (5), Vadha (7)."""
    return _tara_remainder(from_nak, to_nak) in (3, 5, 7)


def _tara_points(boy_nak: int, girl_nak: int, boy_pada: int, girl_pada: int) -> float:
    if boy_nak == girl_nak and boy_pada != girl_pada:
        return 3
    m1 = _is_tara_malefic(boy_nak, girl_nak)
    m2 = _is_tara_malefic(girl_nak, boy_nak)
    if not m1 and not m2:
        return 3
    if m1 and m2:
        return 0
    return 1.5


def _yoni_points(boy_yoni: str, girl_yoni: str) -> float:
    if boy_yoni == girl_yoni:
        return 4
    if girl_yoni in _YONI_FRIENDS.get(boy_yoni, []) or boy_yoni in _YONI_FRIENDS.get(girl_yoni, []):
        return 3
    boy_row = next((r for r in AVAKAHADA if r["yoni"] == boy_yoni), None)
    if boy_row and boy_row["vairi_yoni"] == girl_yoni:
        return 0
    return 2


def _gana_points(boy_gana: str, girl_gana: str) -> float:
    if boy_gana == girl_gana:
        return 6
    if {boy_gana, girl_gana} == {"देव", "नर"}:
        return 6
    return 0


def _bhakuta_points(boy_rashi: int, girl_rashi: int) -> float:
    """Maitreya / Saravali Rasi Koota: 7 for 1/3/4/7/10/11, else 0."""
    pos = (girl_rashi - boy_rashi) % 12 + 1
    return 7 if pos in (1, 3, 4, 7, 10, 11) else 0


def _nadi_points(boy_nak: int, girl_nak: int) -> float:
    boy_nadi = AVAKAHADA[boy_nak]["nadi"]
    girl_nadi = AVAKAHADA[girl_nak]["nadi"]
    return 0 if boy_nadi == girl_nadi else 8


def _format_score(score: float) -> str:
    if score == int(score):
        return str(int(score))
    return f"{score:.1f}"


def _compat_phrase(score: float, bhakuta_unfavorable: bool, en: bool) -> str:
    if not bhakuta_unfavorable:
        if score >= 31:
            return "Excellent compatibility" if en else "उत्कृष्ट मिलान"
        if score >= 21:
            return "Good compatibility" if en else "राम्रो मिलान"
        if score >= 17:
            return "Moderate compatibility" if en else "मध्यम मिलान"
        return "Low compatibility" if en else "कमजोर मिलान"
    if score >= 26:
        return "Good compatibility" if en else "राम्रो मिलान"
    if score >= 21:
        return "Moderate compatibility" if en else "मध्यम मिलान"
    return "Low compatibility" if en else "कमजोर मिलान"


def _recommendation(score: float, bhakuta_unfavorable: bool) -> dict[str, str]:
    if not bhakuta_unfavorable:
        if score >= 31:
            return {"recommendation": "excellent", "recommendationLabel": "Excellent match",
                    "recommendationLabelNe": "उत्कृष्ट मिलन"}
        if score >= 21:
            return {"recommendation": "very_good", "recommendationLabel": "Very good match",
                    "recommendationLabelNe": "अत्यन्त राम्रो मिलन"}
        if score >= 17:
            return {"recommendation": "middling", "recommendationLabel": "Middling match",
                    "recommendationLabelNe": "मध्यम मिलन"}
        return {"recommendation": "inauspicious", "recommendationLabel": "Inauspicious match",
                "recommendationLabelNe": "अशुभ मिलन"}
    if score >= 26:
        return {"recommendation": "very_good",
                "recommendationLabel": "Very good match (Bhakuta unfavorable)",
                "recommendationLabelNe": "अत्यन्त राम्रो मिलन (भकूट अनुकूल छैन)"}
    if score >= 21:
        return {"recommendation": "middling",
                "recommendationLabel": "Middling match (Bhakuta unfavorable)",
                "recommendationLabelNe": "मध्यम मिलन (भकूट अनुकूल छैन)"}
    return {"recommendation": "inauspicious",
            "recommendationLabel": "Inauspicious match (Bhakuta unfavorable)",
            "recommendationLabelNe": "अशुभ मिलन (भकूट अनुकूल छैन)"}


def _nadi_advisory(nak_index: int, score: float, bhakuta_unfavorable: bool) -> dict[str, str]:
    nadi_ne = AVAKAHADA[nak_index]["nadi"]
    nadi_en = NADI_EN.get(nadi_ne, nadi_ne)
    score_str = _format_score(score)
    compat_en = _compat_phrase(score, bhakuta_unfavorable, True)
    compat_ne = _compat_phrase(score, bhakuta_unfavorable, False)
    return {
        "en": (
            f"Overall Guna Milan: {score_str}/36 ({compat_en}). However, both charts belong to the "
            f"same Nadi ({nadi_en}), resulting in Nadi Dosha according to traditional Ashtakoota "
            "matching. Different traditions treat Nadi Dosha differently; many astrologers check "
            "cancellation rules—such as same nakshatra but different padas, strength of the Moon, "
            "Navamsa compatibility, planetary aspects, and other mitigating factors—before advising "
            "against a union. Additional horoscope analysis is recommended to determine whether this "
            "dosha is cancelled or mitigated."
        ),
        "ne": (
            f"कुल गुण मिलन: {score_str}/३६ ({compat_ne})। तर दुवै कुण्डली एउटै नाडी ({nadi_ne}) मा "
            "पर्छन्, जसले परम्परागत अष्टकूट अनुसार नाडी दोष बनाउँछ। विभिन्न परम्पराले नाडी दोषलाई "
            "फरक तरिकाले हेर्छन्; धेरै ज्योतिषीहरू मिलन अस्वीकार गर्नुअघि शिथिल नियम जाँच्छन् — जस्तै "
            "एउटै नक्षत्र तर फरक पाद, चन्द्र बल, नवांश मिलान, ग्रह दृष्टि र अन्य शमनकारी कारक। यो दोष "
            "शिथिल वा न्यूनीकरण भएको छ कि छैन भनेर थप कुण्डली विश्लेषण सिफारिस गरिन्छ।"
        ),
    }


def compute_ashtakuta(
    boy: dict[str, Any],
    girl: dict[str, Any],
    lang: str | None = None,
) -> dict[str, Any]:
    """Full ashtakuta result.

    boy/girl: {"moonRashiNum": 1-12, "nakshatraIndex": 0-26, "pada": 1-4}
    Values in kuta rows are localized to `lang` ("ne" default / "en").
    """
    en = _is_en(lang)
    boy_rashi = int(boy["moonRashiNum"])
    girl_rashi = int(girl["moonRashiNum"])
    boy_nak = int(boy["nakshatraIndex"])
    girl_nak = int(girl["nakshatraIndex"])
    boy_pada = int(boy.get("pada", 1))
    girl_pada = int(girl.get("pada", 1))

    boy_row = AVAKAHADA[boy_nak]
    girl_row = AVAKAHADA[girl_nak]

    def varna_value(rashi: int) -> str:
        v = _varna_ne(rashi)
        if not v:
            return "—"
        return VARNA_EN[v] if en else v

    def vashya_value(rashi: int) -> str:
        if not 1 <= rashi <= 12:
            return "—"
        return ASHTA_VASHYA_EN[rashi - 1] if en else ASHTA_VASHYA_NE[rashi - 1]

    def tara_value(nak: int) -> str:
        tara = janma_tara_from_nak_index(nak)
        return tara["en"] if en else tara["ne"]

    def yoni_value(row: dict[str, Any]) -> str:
        return YONI_EN.get(row["yoni"], row["yoni"]) if en else row["yoni"]

    def lord_value(rashi: int) -> str:
        lord = _lord_of_rashi(rashi)
        return _LORD_EN[lord] if en else _LORD_NE[lord]

    def gana_value(row: dict[str, Any]) -> str:
        return GANA_EN[row["gana"]] if en else row["gana"]

    def rashi_value(rashi: int) -> str:
        if not 1 <= rashi <= 12:
            return "—"
        return RASHI_NAMES[rashi - 1] if en else RASHI_KEYS_NE[rashi - 1]

    def nadi_value(nak: int) -> str:
        nadi = AVAKAHADA[nak]["nadi"]
        return NADI_EN.get(nadi, nadi) if en else nadi

    def kuta(kid: str, obtained: float, boy_value: str, girl_value: str) -> dict[str, Any]:
        meta = _KUTA_META[kid]
        return {
            "id": kid,
            "max": meta["max"],
            "obtained": obtained,
            "boyValue": boy_value,
            "girlValue": girl_value,
            "areaOfLife": meta["areaEn"],
            "areaOfLifeNe": meta["areaNe"],
            "info": meta["infoEn"],
            "infoNe": meta["infoNe"],
        }

    kutas = [
        kuta("varna", _varna_points(boy_rashi, girl_rashi),
             varna_value(boy_rashi), varna_value(girl_rashi)),
        kuta("vashya", _vashya_points(boy_rashi, girl_rashi),
             vashya_value(boy_rashi), vashya_value(girl_rashi)),
        kuta("tara", _tara_points(boy_nak, girl_nak, boy_pada, girl_pada),
             tara_value(boy_nak), tara_value(girl_nak)),
        kuta("yoni", _yoni_points(boy_row["yoni"], girl_row["yoni"]),
             yoni_value(boy_row), yoni_value(girl_row)),
        kuta("maitri", _maitri_points(boy_rashi, girl_rashi),
             lord_value(boy_rashi), lord_value(girl_rashi)),
        kuta("gana", _gana_points(boy_row["gana"], girl_row["gana"]),
             gana_value(boy_row), gana_value(girl_row)),
        kuta("bhakuta", _bhakuta_points(boy_rashi, girl_rashi),
             rashi_value(boy_rashi), rashi_value(girl_rashi)),
        kuta("nadi", _nadi_points(boy_nak, girl_nak),
             nadi_value(boy_nak), nadi_value(girl_nak)),
    ]

    total = sum(k["obtained"] for k in kutas)
    if total == int(total):
        total = int(total)
    by_id = {k["id"]: k["obtained"] for k in kutas}
    bhakuta_unfavorable = by_id["bhakuta"] == 0
    nadi_dosha = by_id["nadi"] == 0

    advisory = _nadi_advisory(boy_nak, total, bhakuta_unfavorable) if nadi_dosha else None

    dosha_analysis = [
        {"id": "nadi", "labelEn": "Nadi Dosha", "labelNe": "नाडी दोष", "present": by_id["nadi"] == 0},
        {"id": "bhakuta", "labelEn": "Bhakoot Dosha", "labelNe": "भकूट दोष", "present": by_id["bhakuta"] == 0},
        {"id": "gana", "labelEn": "Gana Dosha", "labelNe": "गण दोष", "present": by_id["gana"] == 0},
        {"id": "tara", "labelEn": "Tara Dosha", "labelNe": "तारा दोष", "present": by_id["tara"] == 0},
        {"id": "yoni", "labelEn": "Yoni Dosha", "labelNe": "योनि दोष", "present": by_id["yoni"] == 0},
        {"id": "varna", "labelEn": "Varna Dosha", "labelNe": "वर्ण दोष", "present": by_id["varna"] == 0},
    ]

    return {
        "kutas": kutas,
        "totalObtained": total,
        "totalMax": 36,
        **_recommendation(total, bhakuta_unfavorable),
        "bhakutaUnfavorable": bhakuta_unfavorable,
        "nadiDosha": nadi_dosha,
        "nadiDoshaAdvisory": advisory["en"] if advisory else None,
        "nadiDoshaAdvisoryNe": advisory["ne"] if advisory else None,
        "doshaAnalysis": dosha_analysis,
        "notes": _NOTES_EN,
        "notesNe": _NOTES_NE,
    }
