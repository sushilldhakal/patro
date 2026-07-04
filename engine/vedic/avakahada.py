"""अवकहडा चक्र and जन्म-पत्रिका fields (paya, yunja, tara, gana, yoni, nadi…).

27 नक्षत्र × 4 चरण = 108 पद. From the राशि come स्वामी / वर्ण / वश्य; from the
नक्षत्र come योनि / गण / नाडी. Returns both Nepali and English values so any
client can render without re-deriving.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.graha_details import nakshatra_pada_from_longitude

# ── navatara (9-fold tara cycle) ─────────────────────────────────────────────

NAVATARA_TYPES = [
    {"id": 1, "ne": "जन्म", "en": "Janma", "quality_ne": "मध्यम", "tone": "neutral"},
    {"id": 2, "ne": "सम्पत्", "en": "Sampat", "quality_ne": "अति शुभ", "tone": "best"},
    {"id": 3, "ne": "विपत्", "en": "Vipat", "quality_ne": "अशुभ", "tone": "bad"},
    {"id": 4, "ne": "क्षेम", "en": "Kshema", "quality_ne": "अति शुभ", "tone": "best"},
    {"id": 5, "ne": "प्रत्यक्", "en": "Pratyak", "quality_ne": "अशुभ", "tone": "bad"},
    {"id": 6, "ne": "साधना", "en": "Sadhana", "quality_ne": "अति शुभ", "tone": "best"},
    {"id": 7, "ne": "निधन", "en": "Naidhana", "quality_ne": "घातक", "tone": "worst"},
    {"id": 8, "ne": "मित्र", "en": "Mitra", "quality_ne": "शुभ", "tone": "good"},
    {"id": 9, "ne": "परम मित्र", "en": "Param Mitra", "quality_ne": "अति शुभ", "tone": "best"},
]


def navatara_number(moon_idx: int, target_idx: int, cycle_size: int) -> int:
    """Tara number 1-9 of target counted from the moon position in a 27/12 cycle."""
    diff = (target_idx - moon_idx) % cycle_size
    if diff == 0:
        return 1
    return (9 - (diff % 9)) % 9 + 1


def janma_tara_from_nak_index(nak_index: int) -> dict[str, str]:
    """जन्म तारा — 9-fold cycle from 0-based nakshatra index (Drik)."""
    row = NAVATARA_TYPES[nak_index % 9]
    return {"ne": row["ne"], "en": row["en"]}


# ── rashi meta (वर्ण / वश्य per sign) ────────────────────────────────────────

RASHI_KEYS_NE = [
    "मेष", "वृष", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

# वर्ण per rashi (index 0 = मेष).
RASHI_VARNA_NE = [
    "क्षत्रिय", "वैश्य", "शूद्र", "विप्र", "क्षत्रिय", "वैश्य",
    "शूद्र", "विप्र", "क्षत्रिय", "वैश्य", "शूद्र", "विप्र",
]

VARNA_RANK = {"विप्र": 1, "क्षत्रिय": 2, "वैश्य": 3, "शूद्र": 4}

VARNA_EN = {"विप्र": "Brahmin", "क्षत्रिय": "Kshatriya", "वैश्य": "Vaishya", "शूद्र": "Shudra"}

# Ashtakoot वश्य groups keyed by rashi number (index 0 = मेष).
ASHTA_VASHYA_NE = [
    "चतुष्पद", "चतुष्पद", "मानव", "जलचर", "वनचर", "मानव",
    "मानव", "कीट", "मानव", "जलचर", "मानव", "जलचर",
]

ASHTA_VASHYA_EN = [
    "Chatushpad", "Chatushpad", "Manava", "Jalachara", "Vanachara", "Manava",
    "Manava", "Keet", "Manava", "Jalachara", "Manava", "Jalachara",
]

PATRIKA_VASHYA_EN = [
    "Quadruped", "Quadruped", "Manava", "Aquatic", "Wild", "Manava",
    "Manava", "Insect", "Manava", "Aquatic", "Manava", "Aquatic",
]

RASHI_TATTVA_NE = [
    "अग्नि", "पृथ्वी", "वायु", "जल", "अग्नि", "पृथ्वी",
    "वायु", "जल", "अग्नि", "पृथ्वी", "वायु", "जल",
]

TATTVA_EN = {"अग्नि": "Fire", "पृथ्वी": "Earth", "वायु": "Air", "जल": "Water"}

# ── nakshatra rows ───────────────────────────────────────────────────────────

# नाडी repeats in a fixed 6-step zig-zag across the नक्षत्र sequence.
_NADI_CYCLE = ["आध्य", "मध्य", "अन्त्य", "अन्त्य", "मध्य", "आध्य"]

NADI_EN = {"आध्य": "Adya", "मध्य": "Madhya", "अन्त्य": "Antya"}

# योनि → वैरि-योनि (natural-enemy) pairs.
_YONI_ENEMY = {
    "अश्व": "महिष", "महिष": "अश्व",
    "गज": "सिंह", "सिंह": "गज",
    "अज": "वानर", "वानर": "अज",
    "सर्प": "नकुल", "नकुल": "सर्प",
    "श्वान": "मृग", "मृग": "श्वान",
    "मार्जार": "मूषक", "मूषक": "मार्जार",
    "गौ": "व्याघ्र", "व्याघ्र": "गौ",
}

YONI_EN = {
    "अश्व": "Horse", "महिष": "Buffalo", "गज": "Elephant", "सिंह": "Lion",
    "अज": "Goat", "वानर": "Monkey", "सर्प": "Serpent", "नकुल": "Mongoose",
    "श्वान": "Dog", "मृग": "Deer", "मार्जार": "Cat", "मूषक": "Rat",
    "गौ": "Cow", "व्याघ्र": "Tiger", "मेष": "Ram",
}

GANA_EN = {"देव": "Deva", "नर": "Manushya", "राक्षस": "Rakshasa"}
GANA_PATRIKA_NE = {"देव": "देव", "नर": "मनुष्य", "राक्षस": "राक्षस"}

# (ne, aksharas, charan rashis, yoni, gana)
_RAW_NAKSHATRA: list[tuple[str, list[str], list[str], str, str]] = [
    ("अश्विनी", ["चू", "चे", "चो", "ला"], ["मेष"] * 4, "अश्व", "देव"),
    ("भरणी", ["ली", "लू", "ले", "लो"], ["मेष"] * 4, "गज", "नर"),
    ("कृत्तिका", ["अ", "ई", "उ", "ए"], ["मेष", "वृष", "वृष", "वृष"], "अज", "राक्षस"),
    ("रोहिणी", ["ओ", "वा", "वी", "वू"], ["वृष"] * 4, "सर्प", "नर"),
    ("मृगशिरा", ["वे", "वो", "का", "की"], ["वृष", "वृष", "मिथुन", "मिथुन"], "सर्प", "देव"),
    ("आर्द्रा", ["कु", "घ", "ङ", "छ"], ["मिथुन"] * 4, "श्वान", "नर"),
    ("पुनर्वसु", ["के", "को", "हा", "ही"], ["मिथुन", "मिथुन", "मिथुन", "कर्क"], "मार्जार", "देव"),
    ("पुष्य", ["हु", "हे", "हो", "डा"], ["कर्क"] * 4, "अज", "देव"),
    ("आश्रेषा", ["डी", "डू", "डे", "डो"], ["कर्क"] * 4, "मार्जार", "राक्षस"),
    ("मघा", ["मा", "मी", "मू", "मे"], ["सिंह"] * 4, "मूषक", "राक्षस"),
    ("पूर्वाफाल्गुनी", ["मो", "टा", "टी", "टू"], ["सिंह"] * 4, "मूषक", "नर"),
    ("उत्तराफाल्गुनी", ["टे", "टो", "पा", "पी"], ["सिंह", "कन्या", "कन्या", "कन्या"], "गौ", "नर"),
    ("हस्त", ["पू", "ष", "ण", "ठ"], ["कन्या"] * 4, "महिष", "देव"),
    ("चित्रा", ["पे", "पो", "रा", "री"], ["कन्या", "कन्या", "तुला", "तुला"], "व्याघ्र", "राक्षस"),
    ("स्वाती", ["रू", "रे", "रो", "ता"], ["तुला"] * 4, "महिष", "देव"),
    ("विशाखा", ["ती", "तू", "ते", "तो"], ["तुला", "तुला", "तुला", "वृश्चिक"], "व्याघ्र", "राक्षस"),
    ("अनुराधा", ["ना", "नी", "नू", "ने"], ["वृश्चिक"] * 4, "मृग", "देव"),
    ("ज्येष्ठा", ["नो", "या", "यी", "यू"], ["वृश्चिक"] * 4, "मृग", "राक्षस"),
    ("मूल", ["ये", "यो", "भा", "भी"], ["धनु"] * 4, "श्वान", "राक्षस"),
    ("पूर्वाषाढा", ["भू", "धा", "फा", "ढा"], ["धनु"] * 4, "वानर", "नर"),
    ("उत्तराषाढा", ["भे", "भो", "जा", "जी"], ["धनु", "मकर", "मकर", "मकर"], "नकुल", "नर"),
    ("श्रवण", ["खी", "खू", "खे", "खो"], ["मकर"] * 4, "वानर", "देव"),
    ("धनिष्ठा", ["गा", "गी", "गु", "गे"], ["मकर", "मकर", "कुम्भ", "कुम्भ"], "सिंह", "राक्षस"),
    ("शतभिषा", ["गो", "सा", "सी", "सू"], ["कुम्भ"] * 4, "अश्व", "राक्षस"),
    ("पूर्वाभाद्रपदा", ["से", "सो", "दा", "दी"], ["कुम्भ", "कुम्भ", "कुम्भ", "मीन"], "सिंह", "नर"),
    ("उत्तराभाद्रपदा", ["दू", "थ", "झ", "ञ"], ["मीन"] * 4, "गौ", "नर"),
    ("रेवती", ["दे", "दो", "च", "ची"], ["मीन"] * 4, "गज", "देव"),
]

AVAKAHADA: list[dict[str, Any]] = [
    {
        "index": i + 1,
        "ne": ne,
        "aksharas": aksharas,
        "charan_rashis": rashis,
        "yoni": yoni,
        "vairi_yoni": _YONI_ENEMY.get(yoni, "—"),
        "gana": gana,
        "nadi": _NADI_CYCLE[i % 6],
    }
    for i, (ne, aksharas, rashis, yoni, gana) in enumerate(_RAW_NAKSHATRA)
]

# ── जन्म-पत्रिका field rules ─────────────────────────────────────────────────

_PAYA_NE = ["सुवर्ण", "रजत", "ताम्र", "लोह"]
_PAYA_EN = ["Gold", "Silver", "Copper", "Iron"]

# Nakshatra index 0-26 → Drik-style नक्षत्र पाय.
_NAKSHATRA_PAYA_BY_INDEX = [
    0, 0, 3, 3, 3,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2,
    0,
]

_YUNJA_NE = ["आदि", "मध्य", "अन्त्य"]
_YUNJA_EN = ["Adi", "Madhya", "Antya"]

_NADI_PATRIKA_NE = ["आद्य", "मध्य", "अन्त्य"]
_NADI_PATRIKA_EN = ["Aadi", "Madhya", "Antya"]

_ASANA_BY_PADA_NE = ["खट्वाङ्ग", "मञ्च", "भद्रपीठ", "शयन"]
_ASANA_BY_PADA_EN = ["Khattvanga", "Mancha", "Bhadrasana", "Shayana"]

_JATI_NE = {"विप्र": "ब्राह्मण", "क्षत्रिय": "क्षत्रिय", "वैश्य": "वैश्य", "शूद्र": "शूद्र"}


def moon_bhava_from_lagna(moon_rashi: int, lagna_rashi: int) -> int:
    """Moon bhava from lagna (1-12)."""
    return (moon_rashi - lagna_rashi) % 12 + 1


def rashi_paya_from_bhava(bhava: int) -> dict[str, str]:
    """Drik-style राशि पाय — Moon house from Lagna."""
    if bhava in (1, 6, 11):
        idx = 0
    elif bhava in (2, 5, 9):
        idx = 1
    elif bhava in (3, 7, 10):
        idx = 2
    else:
        idx = 3
    return {"ne": _PAYA_NE[idx], "en": _PAYA_EN[idx]}


def build_janma_avakahada(
    moon_longitude: float,
    *,
    moon_rashi: int | None = None,
    lagna_rashi: int | None = None,
    nakshatra_index: int | None = None,
    pada: int | None = None,
) -> dict[str, Any] | None:
    """अवकहडा / जन्म-पत्रिका गुण from the Moon's nakshatra at birth.

    Returns every field as {"ne": …, "en": …} so clients only pick a language.
    """
    if nakshatra_index is None or pada is None:
        nakshatra_index, pada = nakshatra_pada_from_longitude(moon_longitude)
    row = AVAKAHADA[nakshatra_index] if 0 <= nakshatra_index <= 26 else None
    if row is None:
        return None

    pada = min(max(pada, 1), 4)
    pada_idx = pada - 1
    charan_rashi_ne = row["charan_rashis"][pada_idx]

    if moon_rashi is not None and 1 <= moon_rashi <= 12:
        varna_ne = RASHI_VARNA_NE[moon_rashi - 1]
        tattva_ne = RASHI_TATTVA_NE[moon_rashi - 1]
        vashya_ne = ASHTA_VASHYA_NE[moon_rashi - 1]
        vashya_en = PATRIKA_VASHYA_EN[moon_rashi - 1]
    else:
        varna_ne = RASHI_VARNA_NE[RASHI_KEYS_NE.index(charan_rashi_ne)]
        tattva_ne = None
        vashya_ne = None
        vashya_en = None

    rashi_paya = (
        rashi_paya_from_bhava(moon_bhava_from_lagna(moon_rashi, lagna_rashi))
        if moon_rashi is not None and lagna_rashi is not None
        else None
    )

    nak_paya_idx = _NAKSHATRA_PAYA_BY_INDEX[nakshatra_index]
    yunja_idx = 0 if nakshatra_index < 9 else 1 if nakshatra_index < 18 else 2
    tri_nadi_idx = nakshatra_index % 3
    tara = janma_tara_from_nak_index(nakshatra_index)

    def bilingual(ne: str | None, en: str | None) -> dict[str, str]:
        return {"ne": ne or "—", "en": en or ne or "—"}

    from engine.astronomy.positions import NAKSHATRA_NAMES

    return {
        "nakshatra": bilingual(row["ne"], NAKSHATRA_NAMES[nakshatra_index]),
        "nakshatraIndex": nakshatra_index,
        "pada": pada,
        "rashiPaya": rashi_paya or {"ne": "—", "en": "—"},
        "nakshatraPaya": bilingual(_PAYA_NE[nak_paya_idx], _PAYA_EN[nak_paya_idx]),
        "tattva": bilingual(tattva_ne, TATTVA_EN.get(tattva_ne or "")),
        "yunja": bilingual(_YUNJA_NE[yunja_idx], _YUNJA_EN[yunja_idx]),
        "vashya": bilingual(vashya_ne, vashya_en),
        "tara": bilingual(tara["ne"], tara["en"]),
        "gana": bilingual(GANA_PATRIKA_NE[row["gana"]], GANA_EN[row["gana"]]),
        "akshara": bilingual(row["aksharas"][pada_idx], row["aksharas"][pada_idx]),
        "nadi": bilingual(_NADI_PATRIKA_NE[tri_nadi_idx], _NADI_PATRIKA_EN[tri_nadi_idx]),
        "asana": bilingual(_ASANA_BY_PADA_NE[pada_idx], _ASANA_BY_PADA_EN[pada_idx]),
        "yoni": bilingual(row["yoni"], YONI_EN.get(row["yoni"])),
        "jati": bilingual(_JATI_NE[varna_ne], VARNA_EN[varna_ne]),
    }
