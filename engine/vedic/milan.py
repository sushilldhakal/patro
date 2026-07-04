"""Kundali Milan — Ashtakoota (Guna Milan) compatibility, computed server-side.

Everything the /kundali/milan endpoint returns is derived here from the two
birth moments: each partner's sidereal Moon longitude gives the janma rashi and
nakshatra, and the eight kutas (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana,
Bhakuta, Nadi — 36 points total) follow from those. The frontend only renders
this payload; it does no astrological arithmetic of its own.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy.sidereal import resolve_ayanamsha_mode
from engine.astronomy.swiss_eph import get_all_planetary_positions
from engine.vedic.interpretation import (
    NAKSHATRA_EN,
    NAKSHATRA_NE,
    RASHI_EN,
    RASHI_NE,
    SIGN_LORD,
    nakshatra_of,
    sign_of,
)

# ── Per-nakshatra attributes (0-based nakshatra index) ───────────────────────

# Yoni (animal) of each nakshatra. Two nakshatras share a yoni (male/female).
YONI_OF_NAKSHATRA = [
    0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10,
    10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
]
YONI_LABELS_EN = [
    "Horse", "Elephant", "Goat", "Serpent", "Dog", "Cat", "Rat",
    "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion",
]
YONI_LABELS_NE = [
    "अश्व", "गज", "अज", "सर्प", "श्वान", "मार्जार", "मूषक",
    "गौ", "महिष", "व्याघ्र", "मृग", "वानर", "नकुल", "सिंह",
]

# Classical 14×14 Yoni compatibility table (points 0–4). Diagonal (same yoni) = 4;
# the seven sworn-enemy pairs score 0; the rest are friendly (3) or neutral (2).
# Order follows YONI_LABELS_EN above.
_YONI_MATRIX = [
    # Ho El Sh Se Do Ca Ra Co Bu Ti De Mo Mn Li
    [4, 2, 2, 3, 2, 2, 2, 3, 0, 2, 3, 2, 2, 3],  # Horse
    [2, 4, 3, 3, 2, 2, 2, 2, 3, 2, 2, 3, 2, 0],  # Elephant
    [2, 3, 4, 2, 2, 2, 2, 3, 3, 2, 2, 0, 3, 2],  # Sheep
    [3, 3, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 0, 2],  # Serpent
    [2, 2, 2, 2, 4, 2, 2, 2, 2, 2, 0, 2, 2, 2],  # Dog
    [2, 2, 2, 2, 2, 4, 0, 2, 2, 3, 3, 3, 2, 2],  # Cat
    [2, 2, 2, 2, 2, 0, 4, 2, 2, 2, 2, 2, 3, 2],  # Rat
    [3, 2, 3, 2, 2, 2, 2, 4, 3, 0, 3, 2, 2, 2],  # Cow
    [0, 3, 3, 2, 2, 2, 2, 3, 4, 2, 2, 2, 2, 2],  # Buffalo
    [2, 2, 2, 2, 2, 3, 2, 0, 2, 4, 2, 2, 2, 3],  # Tiger
    [3, 2, 2, 2, 0, 3, 2, 3, 2, 2, 4, 2, 2, 2],  # Deer
    [2, 3, 0, 2, 2, 3, 2, 2, 2, 2, 2, 4, 2, 3],  # Monkey
    [2, 2, 3, 0, 2, 2, 3, 2, 2, 2, 2, 2, 4, 2],  # Mongoose
    [3, 0, 2, 2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 4],  # Lion
]

# Gana (temperament) of each nakshatra: 0=Deva, 1=Manushya, 2=Rakshasa.
GANA_OF_NAKSHATRA = [
    0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0,
    2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
]
GANA_LABELS_EN = ["Deva", "Manushya", "Rakshasa"]
GANA_LABELS_NE = ["देव", "मनुष्य", "राक्षस"]
# Symmetric Gana Koota table (max 6).
_GANA_MATRIX = [
    [6, 6, 1],  # Deva
    [6, 6, 0],  # Manushya
    [1, 0, 6],  # Rakshasa
]

# Nadi of each nakshatra: 0=Aadi (Vata), 1=Madhya (Pitta), 2=Antya (Kapha).
# Follows the classical 6-step cycle [Aadi, Madhya, Antya, Antya, Madhya, Aadi].
_NADI_CYCLE = [0, 1, 2, 2, 1, 0]
NADI_OF_NAKSHATRA = [_NADI_CYCLE[i % 6] for i in range(27)]
NADI_LABELS_EN = ["Aadi", "Madhya", "Antya"]
NADI_LABELS_NE = ["आद्य", "मध्य", "अन्त्य"]

# ── Per-rashi attributes (0-based sign index) ────────────────────────────────

# Varna of each sign, with rank Brahmin=4 > Kshatriya=3 > Vaishya=2 > Shudra=1.
VARNA_OF_SIGN = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]
VARNA_LABELS_EN = {1: "Shudra", 2: "Vaishya", 3: "Kshatriya", 4: "Brahmin"}
VARNA_LABELS_NE = {1: "शूद्र", 2: "वैश्य", 3: "क्षत्रिय", 4: "विप्र"}

# Vashya class of each sign: 0=Chatushpada, 1=Manava, 2=Jalachara, 3=Vanachara, 4=Keeta.
VASHYA_CLASS_OF_SIGN = [0, 0, 1, 2, 3, 1, 1, 4, 1, 0, 1, 2]
VASHYA_LABELS_EN = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"]
VASHYA_LABELS_NE = ["चतुष्पद", "मानव", "जलचर", "वनचर", "कीट"]
# Signs that fall under each sign's control (0-based). Mutual → 2, one-way → 1.
VASHYA_CONTROLS = {
    0: {4, 7},       # Mesha
    1: {3, 6},       # Vrishabha
    2: {5},          # Mithuna
    3: {7, 8},       # Karka
    4: {6},          # Simha
    5: {2, 11},      # Kanya
    6: {9, 5},       # Tula
    7: {3},          # Vrishchika
    8: {11},         # Dhanu
    9: {10, 0},      # Makara
    10: {0},         # Kumbha
    11: {9},         # Meena
}

# Natural planetary friendship for Graha Maitri (relation of A toward B).
_FRIENDS = {
    "sun": {"moon", "mars", "jupiter"},
    "moon": {"sun", "mercury"},
    "mars": {"sun", "moon", "jupiter"},
    "mercury": {"sun", "venus"},
    "jupiter": {"sun", "moon", "mars"},
    "venus": {"mercury", "saturn"},
    "saturn": {"mercury", "venus"},
}
_ENEMIES = {
    "sun": {"venus", "saturn"},
    "moon": set(),
    "mars": {"mercury"},
    "mercury": {"moon"},
    "jupiter": {"mercury", "venus"},
    "venus": {"sun", "moon"},
    "saturn": {"sun", "moon", "mars"},
}
PLANET_EN = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
}
PLANET_NE = {
    "sun": "सूर्य", "moon": "चन्द्र", "mars": "मंगल", "mercury": "बुध",
    "jupiter": "बृहस्पति", "venus": "शुक्र", "saturn": "शनि",
}

# Bhakuta (sign-distance) pairs that carry a dosha and score 0.
_BHAKUTA_DOSHA_DIFFS = {1, 4, 5, 7, 8, 11}


def _relation(a: str, b: str) -> int:
    """+1 friend, 0 neutral, -1 enemy — planet ``a``'s natural view of ``b``."""
    if b in _FRIENDS.get(a, set()):
        return 1
    if b in _ENEMIES.get(a, set()):
        return -1
    return 0


def _bi(ne: str, en: str) -> dict[str, str]:
    return {"ne": ne, "en": en}


def _person_from_moon(moon_lon: float, birth_instant: str,
                      location: dict[str, Any] | None) -> dict[str, Any]:
    rashi = sign_of(moon_lon)              # 0-based
    nak_idx, pada = nakshatra_of(moon_lon)  # 0-based, 1-based pada
    return {
        "moonLongitude": round(moon_lon, 6),
        "moonRashiNum": rashi + 1,
        "moonRashiNe": RASHI_NE[rashi],
        "moonRashiEn": RASHI_EN[rashi],
        "nakshatraIndex": nak_idx,
        "nakshatraNe": NAKSHATRA_NE[nak_idx],
        "nakshatraEn": NAKSHATRA_EN[nak_idx],
        "pada": pada,
        "birth_instant": birth_instant,
        "location": location,
        # convenience fields used internally by the kuta math
        "_rashi": rashi,
        "_nak": nak_idx,
    }


def _moon_longitude(instant: datetime, mode_id: int) -> float:
    planets = get_all_planetary_positions(instant.astimezone(timezone.utc), ayanamsa=mode_id)
    return float(planets["moon"]["longitude"])


# ── Individual kutas ─────────────────────────────────────────────────────────

def _varna(boy: dict, girl: dict) -> dict:
    b, g = VARNA_OF_SIGN[boy["_rashi"]], VARNA_OF_SIGN[girl["_rashi"]]
    obtained = 1.0 if b >= g else 0.0
    return {
        "id": "varna", "max": 1, "obtained": obtained,
        "boyValue": VARNA_LABELS_EN[b], "girlValue": VARNA_LABELS_EN[g],
        "_boyNe": VARNA_LABELS_NE[b], "_girlNe": VARNA_LABELS_NE[g],
        "areaOfLife": "Ego & spiritual growth", "areaOfLifeNe": "अहंकार तथा आध्यात्मिक विकास",
        "info": ("Varna reflects the couple's spiritual compatibility and work ethic. "
                 "The point is granted when the groom's varna is equal to or higher than the bride's."),
        "infoNe": ("वर्णले दम्पतीको आध्यात्मिक अनुकूलता र कार्यशैली देखाउँछ। "
                   "वरको वर्ण वधूको बराबर वा माथिल्लो भएमा अङ्क प्राप्त हुन्छ।"),
    }


def _vashya(boy: dict, girl: dict) -> dict:
    br, gr = boy["_rashi"], girl["_rashi"]
    if br == gr:
        obtained = 2.0
    else:
        b_ctrl = gr in VASHYA_CONTROLS.get(br, set())
        g_ctrl = br in VASHYA_CONTROLS.get(gr, set())
        obtained = 2.0 if (b_ctrl and g_ctrl) else 1.0 if (b_ctrl or g_ctrl) else 0.0
    bc, gc = VASHYA_CLASS_OF_SIGN[br], VASHYA_CLASS_OF_SIGN[gr]
    return {
        "id": "vashya", "max": 2, "obtained": obtained,
        "boyValue": VASHYA_LABELS_EN[bc], "girlValue": VASHYA_LABELS_EN[gc],
        "_boyNe": VASHYA_LABELS_NE[bc], "_girlNe": VASHYA_LABELS_NE[gc],
        "areaOfLife": "Mutual attraction & control", "areaOfLifeNe": "पारस्परिक आकर्षण तथा नियन्त्रण",
        "info": ("Vashya measures the magnetic pull and influence the partners hold over "
                 "each other, shaping harmony in the relationship."),
        "infoNe": ("वश्यले दुवै साझेदारबीचको आकर्षण र एकअर्कामाथिको प्रभाव मापन गर्छ, "
                   "जसले सम्बन्धमा सामञ्जस्य निर्माण गर्छ।"),
    }


def _tara(boy: dict, girl: dict) -> dict:
    def _half(from_nak: int, to_nak: int) -> float:
        count = ((to_nak - from_nak) % 27) + 1
        tara = count % 9 or 9
        return 0.0 if tara in (3, 5, 7) else 1.5

    obtained = _half(boy["_nak"], girl["_nak"]) + _half(girl["_nak"], boy["_nak"])
    return {
        "id": "tara", "max": 3, "obtained": obtained,
        "boyValue": NAKSHATRA_EN[boy["_nak"]], "girlValue": NAKSHATRA_EN[girl["_nak"]],
        "_boyNe": NAKSHATRA_NE[boy["_nak"]], "_girlNe": NAKSHATRA_NE[girl["_nak"]],
        "areaOfLife": "Destiny & wellbeing", "areaOfLifeNe": "भाग्य तथा कल्याण",
        "info": ("Tara (Dina) checks the birth-star compatibility that governs the couple's "
                 "health, fortune and longevity together."),
        "infoNe": ("तारा (दिन) कूटले दम्पतीको स्वास्थ्य, भाग्य र दीर्घायु सम्बन्धी "
                   "जन्मनक्षत्र अनुकूलता जाँच्छ।"),
    }


def _yoni(boy: dict, girl: dict) -> dict:
    by, gy = YONI_OF_NAKSHATRA[boy["_nak"]], YONI_OF_NAKSHATRA[girl["_nak"]]
    obtained = float(_YONI_MATRIX[by][gy])
    return {
        "id": "yoni", "max": 4, "obtained": obtained,
        "boyValue": YONI_LABELS_EN[by], "girlValue": YONI_LABELS_EN[gy],
        "_boyNe": YONI_LABELS_NE[by], "_girlNe": YONI_LABELS_NE[gy],
        "areaOfLife": "Physical & sexual harmony", "areaOfLifeNe": "शारीरिक तथा यौन सामञ्जस्य",
        "info": ("Yoni denotes the physical and intimate compatibility of the couple, based "
                 "on the animal symbol of each birth star."),
        "infoNe": ("योनिले जन्मनक्षत्रको पशु प्रतीकका आधारमा दम्पतीको शारीरिक र "
                   "आत्मीय अनुकूलता बुझाउँछ।"),
    }


def _maitri(boy: dict, girl: dict) -> dict:
    bl, gl = SIGN_LORD[boy["_rashi"]], SIGN_LORD[girl["_rashi"]]
    if bl == gl:
        obtained = 5.0
    else:
        r1, r2 = _relation(bl, gl), _relation(gl, bl)
        table = {
            (1, 1): 5.0, (1, 0): 4.0, (0, 1): 4.0, (0, 0): 3.0,
            (1, -1): 1.0, (-1, 1): 1.0, (0, -1): 0.5, (-1, 0): 0.5, (-1, -1): 0.0,
        }
        obtained = table[(r1, r2)]
    return {
        "id": "maitri", "max": 5, "obtained": obtained,
        "boyValue": PLANET_EN[bl], "girlValue": PLANET_EN[gl],
        "_boyNe": PLANET_NE[bl], "_girlNe": PLANET_NE[gl],
        "areaOfLife": "Mental & intellectual bond", "areaOfLifeNe": "मानसिक तथा बौद्धिक सम्बन्ध",
        "info": ("Graha Maitri weighs the friendship between the lords of the two Moon signs, "
                 "indicating mental affinity and mutual affection."),
        "infoNe": ("ग्रह मैत्रीले दुवै चन्द्रराशिका स्वामीबीचको मित्रता तौलिन्छ, जसले "
                   "मानसिक निकटता र पारस्परिक स्नेह देखाउँछ।"),
    }


def _gana(boy: dict, girl: dict) -> dict:
    bg, gg = GANA_OF_NAKSHATRA[boy["_nak"]], GANA_OF_NAKSHATRA[girl["_nak"]]
    obtained = float(_GANA_MATRIX[bg][gg])
    return {
        "id": "gana", "max": 6, "obtained": obtained,
        "boyValue": GANA_LABELS_EN[bg], "girlValue": GANA_LABELS_EN[gg],
        "_boyNe": GANA_LABELS_NE[bg], "_girlNe": GANA_LABELS_NE[gg],
        "areaOfLife": "Temperament & conduct", "areaOfLifeNe": "स्वभाव तथा आचरण",
        "info": ("Gana compares the temperament (Deva, Manushya or Rakshasa) of the partners, "
                 "reflecting behavioural harmony in married life."),
        "infoNe": ("गणले साझेदारहरूको स्वभाव (देव, मनुष्य वा राक्षस) तुलना गर्छ, जसले "
                   "वैवाहिक जीवनमा व्यवहारगत सामञ्जस्य झल्काउँछ।"),
    }


def _bhakuta(boy: dict, girl: dict) -> dict:
    diff = (girl["_rashi"] - boy["_rashi"]) % 12
    unfavorable = diff in _BHAKUTA_DOSHA_DIFFS
    obtained = 0.0 if unfavorable else 7.0
    return {
        "id": "bhakuta", "max": 7, "obtained": obtained,
        "boyValue": RASHI_EN[boy["_rashi"]], "girlValue": RASHI_EN[girl["_rashi"]],
        "_boyNe": RASHI_NE[boy["_rashi"]], "_girlNe": RASHI_NE[girl["_rashi"]],
        "areaOfLife": "Love, wealth & family", "areaOfLifeNe": "प्रेम, धन तथा परिवार",
        "info": ("Bhakuta examines the relative placement of the two Moon signs; adverse "
                 "6-8, 5-9 or 2-12 positions bring a Bhakuta dosha."),
        "infoNe": ("भकूटले दुवै चन्द्रराशिको पारस्परिक स्थिति जाँच्छ; प्रतिकूल ६-८, ५-९ "
                   "वा २-१२ स्थितिले भकूट दोष ल्याउँछ।"),
        "_unfavorable": unfavorable,
    }


def _nadi(boy: dict, girl: dict) -> dict:
    bn, gn = NADI_OF_NAKSHATRA[boy["_nak"]], NADI_OF_NAKSHATRA[girl["_nak"]]
    dosha = bn == gn
    obtained = 0.0 if dosha else 8.0
    return {
        "id": "nadi", "max": 8, "obtained": obtained,
        "boyValue": NADI_LABELS_EN[bn], "girlValue": NADI_LABELS_EN[gn],
        "_boyNe": NADI_LABELS_NE[bn], "_girlNe": NADI_LABELS_NE[gn],
        "areaOfLife": "Health & progeny", "areaOfLifeNe": "स्वास्थ्य तथा सन्तान",
        "info": ("Nadi carries the most weight; a shared Nadi (Nadi dosha) is held to affect "
                 "the couple's health and children and needs remedies before marriage."),
        "infoNe": ("नाडीको सबैभन्दा बढी महत्त्व हुन्छ; एउटै नाडी (नाडी दोष) ले दम्पतीको "
                   "स्वास्थ्य र सन्तानमा असर पार्ने मानिन्छ र विवाहअघि उपाय आवश्यक हुन्छ।"),
        "_dosha": dosha,
    }


def _round(value: float) -> float:
    """Trim trailing zeros so 1.0 → 1 and 1.5 stays 1.5 in JSON."""
    return int(value) if float(value).is_integer() else round(value, 1)


def compute_ashtakuta(boy: dict, girl: dict, lang: str = "ne") -> dict[str, Any]:
    """The eight-kuta Guna Milan result for two Moon positions."""
    kutas_raw = [
        _varna(boy, girl), _vashya(boy, girl), _tara(boy, girl), _yoni(boy, girl),
        _maitri(boy, girl), _gana(boy, girl), _bhakuta(boy, girl), _nadi(boy, girl),
    ]

    total = sum(k["obtained"] for k in kutas_raw)
    nadi_row = next(k for k in kutas_raw if k["id"] == "nadi")
    bhakuta_row = next(k for k in kutas_raw if k["id"] == "bhakuta")
    gana_row = next(k for k in kutas_raw if k["id"] == "gana")
    nadi_dosha = nadi_row["_dosha"]
    bhakuta_unfavorable = bhakuta_row["_unfavorable"]

    if total >= 32:
        rec, rec_en, rec_ne = "excellent", "Excellent match", "उत्तम मिलन"
    elif total >= 25:
        rec, rec_en, rec_ne = "very_good", "Very good match", "धेरै राम्रो मिलन"
    elif total >= 18:
        rec, rec_en, rec_ne = "middling", "Acceptable match", "स्वीकार्य मिलन"
    else:
        rec, rec_en, rec_ne = "inauspicious", "Not recommended", "मिलन उपयुक्त छैन"

    kutas = [
        {
            "id": k["id"], "max": k["max"], "obtained": _round(k["obtained"]),
            "boyValue": k["boyValue"] if lang == "en" else k["_boyNe"],
            "girlValue": k["girlValue"] if lang == "en" else k["_girlNe"],
            "areaOfLife": k["areaOfLife"], "areaOfLifeNe": k["areaOfLifeNe"],
            "info": k["info"], "infoNe": k["infoNe"],
        }
        for k in kutas_raw
    ]

    dosha_analysis = [
        {"id": "nadi", "labelEn": "Nadi Dosha", "labelNe": "नाडी दोष", "present": nadi_dosha},
        {"id": "bhakuta", "labelEn": "Bhakuta Dosha", "labelNe": "भकूट दोष",
         "present": bhakuta_unfavorable},
        {"id": "gana", "labelEn": "Gana Dosha", "labelNe": "गण दोष",
         "present": gana_row["obtained"] <= 1},
    ]

    notes: list[str] = []
    notes_ne: list[str] = []
    notes.append(f"Total compatibility score is {_round(total)} out of 36 gunas.")
    notes_ne.append(f"कुल मिलन अङ्क ३६ मध्ये {_round(total)} गुण।")
    if nadi_dosha:
        notes.append("Nadi dosha is present as both share the same Nadi; a qualified "
                     "astrologer should be consulted for remedies.")
        notes_ne.append("दुवैको नाडी एउटै भएकाले नाडी दोष छ; उपायका लागि योग्य "
                        "ज्योतिषीसँग परामर्श गर्नुहोस्।")
    if bhakuta_unfavorable:
        notes.append("Bhakuta is unfavorable, which can affect prosperity and family harmony.")
        notes_ne.append("भकूट प्रतिकूल छ, जसले समृद्धि र पारिवारिक सामञ्जस्यमा असर पार्न सक्छ।")
    if total < 18:
        notes.append("A score below 18 gunas is traditionally considered insufficient for marriage.")
        notes_ne.append("१८ गुणभन्दा कम अङ्कलाई परम्परागत रूपमा विवाहका लागि अपर्याप्त मानिन्छ।")

    nadi_advisory = None
    nadi_advisory_ne = None
    if nadi_dosha:
        nadi_advisory = ("Both partners fall in the same Nadi, forming a Nadi dosha. It is the "
                         "most significant koota (8 points) and its remedies are advised before "
                         "finalising the marriage.")
        nadi_advisory_ne = ("दुवै साझेदार एउटै नाडीमा पर्नाले नाडी दोष बनेको छ। यो सबैभन्दा "
                            "महत्त्वपूर्ण कूट (८ अङ्क) हो र विवाह अन्तिम गर्नुअघि यसको उपाय "
                            "गर्न सल्लाह दिइन्छ।")

    return {
        "kutas": kutas,
        "totalObtained": _round(total),
        "totalMax": 36,
        "recommendation": rec,
        "recommendationLabel": rec_en,
        "recommendationLabelNe": rec_ne,
        "nadiDosha": nadi_dosha,
        "nadiDoshaAdvisory": nadi_advisory,
        "nadiDoshaAdvisoryNe": nadi_advisory_ne,
        "bhakutaUnfavorable": bhakuta_unfavorable,
        "doshaAnalysis": dosha_analysis,
        "notes": notes,
        "notesNe": notes_ne,
    }


def _strip_internal(person: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in person.items() if not k.startswith("_")}


def build_kundali_milan(
    boy_instant: datetime,
    girl_instant: datetime,
    *,
    boy_location: dict[str, Any] | None = None,
    girl_location: dict[str, Any] | None = None,
    ayanamsha: str | None = None,
    lang: str = "ne",
) -> dict[str, Any]:
    """Full /kundali/milan payload from two birth instants (timezone-aware)."""
    mode_key, mode_id = resolve_ayanamsha_mode(ayanamsha)
    lang = "en" if str(lang).startswith("en") else "ne"

    boy = _person_from_moon(
        _moon_longitude(boy_instant, mode_id), boy_instant.isoformat(), boy_location)
    girl = _person_from_moon(
        _moon_longitude(girl_instant, mode_id), girl_instant.isoformat(), girl_location)

    result = compute_ashtakuta(boy, girl, lang=lang)
    return {
        "result": result,
        "boy": _strip_internal(boy),
        "girl": _strip_internal(girl),
        "ayanamsha": mode_key,
        "lang": lang,
    }
