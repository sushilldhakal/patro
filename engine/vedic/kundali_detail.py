"""Full kundali detail payload for /kundali/detail."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.astronomy.sidereal import resolve_ayanamsha_mode
from engine.vedic.ashtakavarga import compute_ashtakavarga
from engine.vedic.bhava_bala import compute_bhava_bala
from engine.vedic.at_time import build_panchanga_at_time, build_planetary_snapshot
from engine.vedic.choghadiya import build_choghadiya, day_ghati_from_sun_times
from engine.vedic.graha_yuddha import compute_yuddha_bala
from engine.vedic.interpretation import (
    COMBUST_ORB,
    DASHA_ORDER,
    DASHA_YEARS,
    ENEMIES,
    FRIENDS,
    NAK_LORD,
    OWN_SIGNS,
    PLANET_KEYS,
    PLANET_EN,
    PLANET_NE,
    SIGN_LORD,
    _angular_sep,
    _dignity,
    build_chart,
    full_yoga_catalog,
    nakshatra_of,
    sign_of,
)
from engine.vedic.shadbala import compute_shadbala
from engine.vedic.vargas import VARGA_DIVISIONS, varga_rashi_from_longitude
from engine.vedic.vimshottari import DASHA_LORD_NE, vimshottari_dasha

CHOGHADIYA_EN = {
    "उद्वेग": "Udvega",
    "चर": "Chara",
    "लाभ": "Labha",
    "अमृत": "Amrita",
    "काल": "Kala",
    "शुभ": "Shubha",
    "रोग": "Roga",
}

RASHI_ELEM_NE = [
    "अग्नि", "पृथ्वी", "वायु", "जल", "अग्नि", "पृथ्वी",
    "वायु", "जल", "अग्नि", "पृथ्वी", "वायु", "जल",
]
RASHI_ELEM_EN = [
    "Fire", "Earth", "Air", "Water", "Fire", "Earth",
    "Air", "Water", "Fire", "Earth", "Air", "Water",
]

RASHI_VARNA_NE = {
    1: "क्षत्रिय", 2: "वैश्य", 3: "शूद्र", 4: "विप्र", 5: "क्षत्रिय", 6: "वैश्य",
    7: "शूद्र", 8: "विप्र", 9: "क्षत्रिय", 10: "वैश्य", 11: "शूद्र", 12: "विप्र",
}
RASHI_VARNA_EN = {
    1: "Kshatriya", 2: "Vaishya", 3: "Shudra", 4: "Brahmin", 5: "Kshatriya", 6: "Vaishya",
    7: "Shudra", 8: "Brahmin", 9: "Kshatriya", 10: "Vaishya", 11: "Shudra", 12: "Brahmin",
}

PAYA_NE = ["सुवर्ण", "रजत", "ताम्र", "लोह"]
PAYA_EN = ["Gold", "Silver", "Copper", "Iron"]
NAKSHATRA_PAYA_IDX = [
    0, 0, 3, 3, 3,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2,
    0,
]
YUNJA_NE = ["आदि", "मध्य", "अन्त्य"]
YUNJA_EN = ["Adi", "Madhya", "Antya"]
NADI_NE = ["आद्य", "मध्य", "अन्त्य"]
NADI_EN = ["Aadi", "Madhya", "Antya"]
TARA_NE = [
    "जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यक्", "साधना", "निधन", "मित्र", "परम मित्र",
]
TARA_EN = [
    "Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Param Mitra",
]
PATRIKA_VASHYA_NE = [
    "चतुष्पद", "चतुष्पद", "मानव", "जलचर", "वनचर", "मानव",
    "मानव", "कीट", "मानव", "जलचर", "मानव", "जलचर",
]
PATRIKA_VASHYA_EN = [
    "Quadruped", "Quadruped", "Manava", "Aquatic", "Wild", "Manava",
    "Manava", "Insect", "Manava", "Aquatic", "Manava", "Aquatic",
]
ASANA_NE = ["खट्वाङ्ग", "मञ्च", "भद्रपीठ", "शयन"]
ASANA_EN = ["Khattvanga", "Mancha", "Bhadrasana", "Shayana"]
GANA_NE = {"देव": "देव", "नर": "मनुष्य", "राक्षस": "राक्षस"}
GANA_EN = {"देव": "Deva", "नर": "Manushya", "राक्षस": "Rakshasa"}

_AVAKAHADA_ROWS: list[tuple[str, str, tuple[str, ...], tuple[int, ...], str, str]] = [
    ("अश्विनी", "Ashwini", ("चू", "चे", "चो", "ला"), (1, 1, 1, 1), "अश्व", "देव"),
    ("भरणी", "Bharani", ("ली", "लू", "ले", "लो"), (1, 1, 1, 1), "गज", "नर"),
    ("कृत्तिका", "Krittika", ("अ", "ई", "उ", "ए"), (1, 2, 2, 2), "अज", "राक्षस"),
    ("रोहिणी", "Rohini", ("ओ", "वा", "वी", "वू"), (2, 2, 2, 2), "सर्प", "नर"),
    ("मृगशिरा", "Mrigashira", ("वे", "वो", "का", "की"), (2, 2, 3, 3), "सर्प", "देव"),
    ("आर्द्रा", "Ardra", ("कु", "घ", "ङ", "छ"), (3, 3, 3, 3), "श्वान", "नर"),
    ("पुनर्वसु", "Punarvasu", ("के", "को", "हा", "ही"), (3, 3, 3, 4), "मार्जार", "देव"),
    ("पुष्य", "Pushya", ("हु", "हे", "हो", "डा"), (4, 4, 4, 4), "अज", "देव"),
    ("आश्लेषा", "Ashlesha", ("डी", "डू", "डे", "डो"), (4, 4, 4, 4), "मार्जार", "राक्षस"),
    ("मघा", "Magha", ("मा", "मी", "मू", "मे"), (5, 5, 5, 5), "मूषक", "राक्षस"),
    ("पूर्वाफाल्गुनी", "Purva Phalguni", ("मो", "टा", "टी", "टू"), (5, 5, 5, 5), "मूषक", "नर"),
    ("उत्तराफाल्गुनी", "Uttara Phalguni", ("टे", "टो", "पा", "पी"), (5, 6, 6, 6), "गौ", "नर"),
    ("हस्त", "Hasta", ("पू", "ष", "ण", "ठ"), (6, 6, 6, 6), "महिष", "देव"),
    ("चित्रा", "Chitra", ("पे", "पो", "रा", "री"), (6, 6, 7, 7), "व्याघ्र", "राक्षस"),
    ("स्वाती", "Swati", ("रू", "रे", "रो", "ता"), (7, 7, 7, 7), "महिष", "देव"),
    ("विशाखा", "Vishakha", ("ती", "तू", "ते", "तो"), (7, 7, 7, 8), "व्याघ्र", "राक्षस"),
    ("अनुराधा", "Anuradha", ("ना", "नी", "नू", "ने"), (8, 8, 8, 8), "मृग", "देव"),
    ("ज्येष्ठा", "Jyeshtha", ("नो", "या", "यी", "यू"), (8, 8, 8, 8), "मृग", "राक्षस"),
    ("मूल", "Mula", ("ये", "यो", "भा", "भी"), (9, 9, 9, 9), "श्वान", "राक्षस"),
    ("पूर्वाषाढा", "Purva Ashadha", ("भू", "धा", "फा", "ढा"), (9, 9, 9, 9), "वानर", "नर"),
    ("उत्तराषाढा", "Uttara Ashadha", ("भे", "भो", "जा", "जी"), (9, 10, 10, 10), "नकुल", "नर"),
    ("श्रवण", "Shravana", ("खी", "खू", "खे", "खो"), (10, 10, 10, 10), "वानर", "देव"),
    ("धनिष्ठा", "Dhanishta", ("गा", "गी", "गु", "गे"), (10, 10, 11, 11), "सिंह", "राक्षस"),
    ("शतभिषा", "Shatabhisha", ("गो", "सा", "सी", "सू"), (11, 11, 11, 11), "अश्व", "राक्षस"),
    ("पूर्वाभाद्रपदा", "Purva Bhadrapada", ("से", "सो", "दा", "दी"), (11, 11, 11, 12), "सिंह", "नर"),
    ("उत्तराभाद्रपदा", "Uttara Bhadrapada", ("दू", "थ", "झ", "ञ"), (12, 12, 12, 12), "गौ", "नर"),
    ("रेवती", "Revati", ("दे", "दो", "च", "ची"), (12, 12, 12, 12), "गज", "देव"),
]

YOGA_NAME_NE = {
    "mangala_dosha": "मंगल दोष",
    "kala_sarpa": "कालसर्प योग",
    "lagna_mallika": "लग्न मल्लिका योग",
    "gajakesari": "गजकेसरी योग",
    "sunapha": "सुनाफा योग",
    "anapha": "अनाफा योग",
    "durdhara": "दुर्धरा योग",
    "kemadruma": "केमद्रुम योग",
    "chandra_mangala": "चन्द्रमङ्गल योग",
    "adhi": "अधि योग",
    "chatussagara": "चतुस्सागर योग",
    "vasumati": "वसुमती योग",
    "rajalakshana": "राजलक्षण योग",
    "vanchana_chora_bheeti": "वञ्चना चोर भीति योग",
    "shakata": "शकट योग",
    "amala": "अमला योग",
    "parvata": "पर्वत योग",
    "kahala": "कहाल योग",
    "veshi": "वेशी योग",
    "vasi": "वासी योग",
    "ubhayachari": "उभयचारी योग",
    "budhaditya": "बुधादित्य योग",
    "mahabhagya": "महाभाग्य योग",
    "pushkala": "पुष्कल योग",
    "lakshmi": "लक्ष्मी योग",
    "gauri": "गौरी योग",
    "bharati": "भारती योग",
    "chapa": "चाप योग",
    "shrinatha": "श्रीनाथ योग",
    "shankha": "शङ्ख योग",
    "bheri": "भेरी योग",
    "parijata": "पारिजात योग",
    "dhana_2_11": "धन योग",
}

YOGA_DESC_NE: dict[str, str] = {
    "mangala_dosha": (
        "मंगल लग्न, चन्द्र वा शुक्रबाट १, २, ४, ७, ८ वा १२ मा हुँदा — "
        "विवाह मिलान र उपायका लागि परम्परागत रूपमा विचार गरिने माङ्गलिक योग।"
    ),
    "kala_sarpa": (
        "सात ताराग्रह राहु–केतु अक्षको एकैतर्फ मात्र भएमा — "
        "कर्मगत तीव्रता र जीवनमा अचानक परिवर्तनसँग सम्बन्धित योग।"
    ),
    "lagna_mallika": (
        "सात ताराग्रह लगातार सात भावमा भएमा — "
        "ग्रह बलियो भए उन्नति र स्थिर प्रगतिका लागि मल्लिका योग।"
    ),
    "gajakesari": (
        "चन्द्रबाट केन्द्र (१, ४, ७, १०) मा बृहस्पति हुँदा बन्छ — "
        "विवेक, सम्मान र स्थिर सौभाग्यका लागि परम्परागत योग; परिपक्व उमेरमा फल दिन्छ।"
    ),
    "sunapha": (
        "चन्द्रको २ मा ग्रह (सूर्य बाहेक) र १२ खाली हुँदा — "
        "आफैंले कमाएको सम्पत्ति र प्रतिष्ठाका लागि सुनाफा योग।"
    ),
    "anapha": (
        "चन्द्रको १२ मा ग्रह र २ खाली हुँदा — "
        "सुसमाचार, आराम र सुन्दर आचरणका लागि अनाफा योग।"
    ),
    "durdhara": (
        "चन्द्रका दुवै छेउ (२ र १२) मा ग्रह हुँदा — "
        "धन, वाहन र सबैतर्फ सहयोगका लागि दुर्धरा योग।"
    ),
    "budhaditya": (
        "सूर्य र बुध एउटै राशिमा हुँदा बन्छ — बुद्धि, स्पष्ट अभिव्यक्ति र "
        "विश्लेषणात्मक/प्रशासनिक क्षमताका लागि शुभ (बुध अत्यन्त नजिक/combust नभएमा बलियो)।"
    ),
    "chandra_mangala": (
        "चन्द्र र मंगल एउटै राशिमा हुँदा बन्छ — उद्यमशीलता र कमाइको ऊर्जा; "
        "शान्त आउटलेट भए उत्तम, नभए अधीरता हुन सक्छ।"
    ),
    "kemadruma": (
        "चन्द्रका छेउमा (२ र १२) कुनै ग्रह नभएमा बन्छ — भावनात्मक सहारा आफैं निर्माण "
        "गर्नुपर्ने संकेत। बलियो चन्द्र, शुभ दृष्टि वा केन्द्रमा ग्रहले यसलाई "
        "कमजोर पार्छ; नियमित दिनचarya र सम्बन्ध दृढ गर्नुहोस्।"
    ),
    "adhi": (
        "चन्द्रबाट ६, ७, ८ मा बुध, बृहस्पति र शुक्र (प्रत्येक भावमा) — "
        "नेतृत्व, अधिकार र सार्वजनिक सम्मानका लागि अधि योग।"
    ),
    "chatussagara": (
        "चारै केन्द्र (१, ४, ७, १०) मा कम्तीमा एक ग्रह — "
        "यश, स्थिरता र चार स्तम्भमा सफलताका लागि चतुस्सागर योग।"
    ),
    "vasumati": (
        "चन्द्रबाट ३, ६, १०, ११ उपचयमा शुभग्रह — "
        "परिश्रम र सञ्जालबाट बढ्ने धनका लागि वसुमती योग।"
    ),
    "rajalakshana": (
        "बुध र शुक्र दुवै केन्द्रमा — "
        "वाक्पटुता, आकर्षण र गरिमापूर्ण उपस्थितिका लागि राजलक्षण योग।"
    ),
    "vanchana_chora_bheeti": (
        "लग्नेश दुष्ठान (६/८/१२) मा र चन्द्रमा पापग्रहले पीडित — "
        "छल, चोरी वा गुप्त शत्रुको चिन्तासँग सम्बन्धित सावधानी योग।"
    ),
    "shakata": (
        "चन्द्र बृहस्पतिबाट ६, ८ वा १२ मा — "
        "उतारचढाव भएको भाग्य; बृहस्पति र चन्द्र बलियो भए कम हुन्छ।"
    ),
    "amala": (
        "चन्द्रबाट १० मा शुभग्रह — "
        "निष्कलङ्क प्रतिष्ठा र नैतिक आचरणका लागि अमला योग।"
    ),
    "parvata": (
        "लग्नेश र १२ औं स्वामी दुवै केन्द्रमा — "
        "उदारता, समृद्धि र बाधा पार गरी उन्नतिका लागि पर्वत योग।"
    ),
    "kahala": (
        "लग्नेश बलियो, ४ औं स्वामी र बृहस्पति केन्द्रमा — "
        "सम्पत्ति, वाहन र निर्णायक नेतृत्वका लागि कहाल योग।"
    ),
    "veshi": (
        "सूर्यको २ मा ग्रह र १२ खाली — "
        "सत्य वचन र नैतिक कार्यबाट मान्यताका लागि वेशी योग।"
    ),
    "vasi": (
        "सूर्यको १२ मा ग्रह र २ खाली — "
        "दान, धर्म र निःस्वार्थ सेवाबाट प्रभावका लागि वासी योग।"
    ),
    "ubhayachari": (
        "सूर्यका दुवै छेउ (२ र १२) मा ग्रह — "
        "संसार र धर्म दुवैमा सफलताका लागि उभयचारी योग।"
    ),
    "mahabhagya": (
        "लग्न, सूर्य र चन्द्र सबै विषम वा सबै सम राशिमा — "
        "समग्र सौभाग्य, स्वास्थ्य र अनुकूल परिस्थितिका लागि महाभाग्य योग।"
    ),
    "pushkala": (
        "लग्नेश र चन्द्र एउटै राशिमा — "
        "यश, लोकप्रियता र अवसर आकर्षणका लागि पुष्कल योग।"
    ),
    "lakshmi": (
        "९ औं स्वामी बलियो र केन्द्र/त्रिकोणमा — "
        "धन, कृपा र धर्मपूर्वक कर्मबाट सौभाग्यका लागि लक्ष्मी योग।"
    ),
    "gauri": (
        "शुक्र बलियो र चन्द्र केन्द्रमा — "
        "सौन्दर्य, वैवाहिक सुख र सुख-सुविधाका लागि गौरी योग।"
    ),
    "bharati": (
        "२ औं स्वामी केन्द्रमा र बृहस्पति बलियो — "
        "विद्या, वाक्पटुता र भाषा/शास्त्रमा निपुणताका लागि भारती योग।"
    ),
    "chapa": (
        "लग्नेश बलियो र त्यसको स्वामी चन्द्रबाट केन्द्रमा — "
        "राजकीय अनुग्रह र अधिकारका लागि चाप योग।"
    ),
    "shrinatha": (
        "९ औं स्वामी ५ मा र ५ औं स्वामी ९ मा — "
        "धर्म र पुण्य जोड्ने श्रीनाथ योग; ज्ञान, सन्तान र आध्यात्मिक सौभाग्य।"
    ),
    "shankha": (
        "५ औं स्वामी ६ मा र ६ औं स्वामी १२ मा — "
        "दीर्घायु, धर्मपूर्ण जीवन र अनुशासित सेवाबाट समृद्धिका लागि शङ्ख योग।"
    ),
    "bheri": (
        "लग्नेश, बृहस्पति र शुक्र सबै केन्द्रमा — "
        "धन, ज्ञान र सम्बन्धको संयोजनका लागि भेरी योग।"
    ),
    "parijata": (
        "लग्नेश बलियो र त्यसको स्वामी केन्द्र/त्रिकोणमा — "
        "कष्ट पछि फल्ने समृद्धिका लागि पारिजात योग।"
    ),
    "dhana_2_11": (
        "आय (२) र लाभ (११) का स्वामी एक भावमा मिल्दा बन्छ — "
        "नियमित कमाइ र बचत गर्ने बानीले धन योग फल दिन्छ।"
    ),
}

KARAKA_NE = {
    "sun": "आत्मा, जीवनशक्ति, पिता, अधिकार",
    "moon": "मन, भावना, माता, सार्वजनिक सम्बन्ध",
    "mars": "ऊर्जा, साहस, भाइबहini, सम्पत्ति",
    "mercury": "बुद्धि, संचार, व्यापार, शिक्षा",
    "jupiter": "ज्ञान, नैतिकता, धन, गुरु, सन्तान",
    "venus": "प्रेम, विवाह, सौन्दary, कला",
    "saturn": "अनुशासन, धैर्य, कर्म, दीर्घायu",
}

MAHAPURUSHA_NE = {
    "mars": "रुचक",
    "mercury": "भद्र",
    "jupiter": "हंस",
    "venus": "मालavya",
    "saturn": "शश",
}


def _yoga_desc_ne(y: dict[str, Any]) -> str:
    key = y["key"]
    if key in YOGA_DESC_NE:
        return YOGA_DESC_NE[key]
    if key.startswith("mahapurusha_"):
        planet_key = key.split("_", 1)[1]
        pn = PLANET_NE.get(planet_key, planet_key)
        karaka = KARAKA_NE.get(planet_key, "")
        return (
            f"{pn} स्वकीय/उच्च राशिमा केन्द्रमा हुँदा {MAHAPURUSHA_NE.get(planet_key, '')} "
            f"महापुरुष योग — {karaka} सम्बन्धी बलियो गुणको संकेत।"
        )
    if key.startswith("neechabhanga_"):
        planet_key = key.split("_", 1)[1]
        pn = PLANET_NE.get(planet_key, planet_key)
        return (
            f"{pn} नीचमा भए पनि शास्त्रीय नीचभङ्गले शक्ति फर्काउँछ — "
            f"सम्बन्धित स्वामी वा उच्च स्वामी केन्द्रमा भएमा प्रारम्भिक कठिनाइ "
            f"पछि उल्लेखनीय बल देखिन्छ।"
        )
    if key.startswith("raja_"):
        parts = key[len("raja_"):].split("_")
        if len(parts) == 2:
            kl, tl = parts
            return (
                f"केन्द्र स्वामी ({PLANET_NE.get(kl, kl)}) र त्रिकोण स्वामी "
                f"({PLANET_NE.get(tl, tl)}) एक भावमा मिल्दा राज योग — "
                f"ग्रहहरू पर्याप्त बलियो भए उन्नति र प्रतिष्ठाका लागि शुभ।"
            )
        return "केन्द्र र त्रिकोण स्वामी एक भावमा मिल्दा राज योग — उन्नति का लागि शुभ।"
    return y.get("text", "")


def _yoga_nature(polarity: str | None) -> str:
    if polarity == "benefic":
        return "auspicious"
    if polarity == "mixed":
        return "mixed"
    if polarity == "caution":
        return "caution"
    return "inauspicious"


def _bi(ne: str, en: str) -> dict[str, str]:
    return {"ne": ne, "en": en}


def _parse_clock_minutes(clock: str | None) -> int | None:
    if not clock:
        return None
    parts = clock.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def _ghadi_pala_vipala(total_minutes: float) -> dict[str, int]:
    total_sec = round(total_minutes * 60)
    ghadi = total_sec // (24 * 60)
    rem = total_sec % (24 * 60)
    pala = rem // 24
    vipala = int((rem % 24) * (60 / 24))
    return {"ghadi": ghadi, "pala": pala, "vipala": vipala}


def _signed_solar_minutes(block: dict[str, Any] | None) -> float:
    if not block:
        return 0.0
    total = float(block.get("minutes", 0)) + float(block.get("seconds", 0)) / 60.0
    return -total if block.get("sign") == "rin" else total


def _dms_parts(longitude: float) -> dict[str, int]:
    lon = longitude % 360.0
    rashi_num = int(lon // 30) + 1
    d = lon % 30.0
    deg = int(d)
    m_float = (d - deg) * 60.0
    minute = int(m_float)
    sec = int(round((m_float - minute) * 60))
    if sec >= 60:
        sec -= 60
        minute += 1
    if minute >= 60:
        minute -= 60
        deg += 1
    return {"rashiNum": rashi_num, "deg": deg, "min": minute, "sec": sec}


def _kp_sub_lord(longitude: float) -> str:
    lon = longitude % 360.0
    nak_span = 360.0 / 27.0
    nak_index = min(int(lon // nak_span), 26)
    pos_in_nak = lon - nak_index * nak_span
    elapsed_years = (pos_in_nak / nak_span) * 120.0
    start_idx = nak_index % 9
    cumulative = 0.0
    for i in range(9):
        lord = DASHA_ORDER[(start_idx + i) % 9]
        cumulative += DASHA_YEARS[lord]
        if elapsed_years < cumulative:
            return lord
    return DASHA_ORDER[start_idx]


def _dignity_api(planet: str, longitude: float, varga_rashi: int, division: int) -> str | None:
    if planet not in OWN_SIGNS:
        return None
    if division == 1:
        raw = _dignity(planet, longitude)
    else:
        raw = _dignity(planet, (varga_rashi - 1) * 30.0 + 1.0)
    mapping = {
        "exalted": "exalted",
        "debilitated": "debilitated",
        "moolatrikona": "moolatrikona",
        "own": "own",
        "friend": "friend_house",
        "enemy": "enemy_house",
        "neutral": "neutral_house",
    }
    return mapping.get(raw or "")


def _relation(planet: str, owner: str) -> str | None:
    if planet not in FRIENDS:
        return None
    if planet == owner:
        return "self"
    if owner in FRIENDS[planet]:
        return "friend"
    if owner in ENEMIES[planet]:
        return "enemy"
    return "neutral"


def _owned_rashis() -> dict[str, list[int]]:
    owned: dict[str, list[int]] = {k: [] for k in PLANET_KEYS}
    for rashi in range(1, 13):
        lord = SIGN_LORD[rashi - 1]
        owned[lord].append(rashi)
    return owned


def _choghadiya_at_birth(panchanga: dict[str, Any], birth_clock: str) -> dict[str, Any] | None:
    sunrise = panchanga.get("sunrise", {}).get("local_time_short")
    sunset = panchanga.get("sunset", {}).get("local_time_short")
    sunrise_min = _parse_clock_minutes(sunrise)
    birth_min = _parse_clock_minutes(birth_clock)
    if sunrise_min is None or birth_min is None:
        return None
    day_g = day_ghati_from_sun_times(sunrise, sunset)
    if day_g is None:
        return None
    vaara_num = int((panchanga.get("vaara") or {}).get("number", 0))
    segments = build_choghadiya(day_g, vaara_num)
    g = (birth_min - sunrise_min) / 24.0
    while g < 0:
        g += 60.0
    g = min(g, 60.0)
    seg = next((s for s in segments if s["start_g"] <= g < s["end_g"]), None)
    if seg is None:
        return None
    name_ne = seg["name_ne"]
    bad = bool(seg.get("bad"))
    if bad:
        quality = "अशुभ"
    elif name_ne in {"लाभ", "अमृत", "शुभ"}:
        quality = "शुभ"
    else:
        quality = "सामान्य"
    return {
        "nameNe": name_ne,
        "nameEn": CHOGHADIYA_EN.get(name_ne),
        "quality": quality,
        "bad": bad,
    }


def _format_upagrahas(raw_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in raw_rows:
        lon = float(row["longitude"])
        nak_idx, pada = nakshatra_of(lon)
        rows.append({
            "key": row["key"],
            "name": row.get("name"),
            "name_ne": row.get("name_ne"),
            "longitude": lon,
            "dms": _dms_parts(lon),
            "nakshatraIndex": nak_idx,
            "pada": pada,
            "nakshatraLord": NAK_LORD[nak_idx],
        })
    return rows


def _moon_bhava(moon_rashi: int, lagna_rashi: int) -> int:
    return ((moon_rashi - lagna_rashi + 12) % 12) + 1


def _rashi_paya(bhava: int) -> tuple[str, str]:
    if bhava in {1, 6, 11}:
        idx = 0
    elif bhava in {2, 5, 9}:
        idx = 1
    elif bhava in {3, 7, 10}:
        idx = 2
    else:
        idx = 3
    return PAYA_NE[idx], PAYA_EN[idx]


def _build_avakahada(moon_lon: float, moon_rashi: int, lagna_rashi: int) -> dict[str, Any]:
    nak_idx, pada = nakshatra_of(moon_lon)
    row = _AVAKAHADA_ROWS[nak_idx]
    ne, en, aksharas, charan_rashis, yoni, gana = row
    pada_i = max(0, min(3, pada - 1))
    charan_rashi = charan_rashis[pada_i]
    varna = RASHI_VARNA_NE.get(charan_rashi, RASHI_VARNA_NE[moon_rashi])
    varna_en = RASHI_VARNA_EN.get(charan_rashi, RASHI_VARNA_EN[moon_rashi])
    rashi_paya_ne, rashi_paya_en = _rashi_paya(_moon_bhava(moon_rashi, lagna_rashi))
    pay_idx = NAKSHATRA_PAYA_IDX[nak_idx]
    yunja_i = 0 if nak_idx < 9 else (1 if nak_idx < 18 else 2)
    tara_i = nak_idx % 9
    return {
        "nakshatra": _bi(ne, en),
        "nakshatraIndex": nak_idx,
        "pada": pada,
        "rashiPaya": _bi(rashi_paya_ne, rashi_paya_en),
        "nakshatraPaya": _bi(PAYA_NE[pay_idx], PAYA_EN[pay_idx]),
        "tattva": _bi(RASHI_ELEM_NE[moon_rashi - 1], RASHI_ELEM_EN[moon_rashi - 1]),
        "yunja": _bi(YUNJA_NE[yunja_i], YUNJA_EN[yunja_i]),
        "vashya": _bi(PATRIKA_VASHYA_NE[moon_rashi - 1], PATRIKA_VASHYA_EN[moon_rashi - 1]),
        "tara": _bi(TARA_NE[tara_i], TARA_EN[tara_i]),
        "gana": _bi(GANA_NE.get(gana, gana), GANA_EN.get(gana, gana)),
        "akshara": _bi(aksharas[pada_i], aksharas[pada_i]),
        "nadi": _bi(NADI_NE[nak_idx % 3], NADI_EN[nak_idx % 3]),
        "asana": _bi(ASANA_NE[pada_i], ASANA_EN[pada_i]),
        "yoni": _bi(yoni, yoni),
        "jati": _bi(varna, varna_en),
    }


def _yogas_to_api(chart_yogas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for y in chart_yogas:
        key = y["key"]
        name_en = y["name"]
        name_ne = YOGA_NAME_NE.get(key)
        if name_ne is None and key.startswith("mahapurusha_"):
            name_ne = f"{name_en} (महापुरुष)"
        elif name_ne is None and key.startswith("neechabhanga_"):
            name_ne = name_en.replace("Neecha-Bhanga", "नीचभङ्ग")
        elif name_ne is None and key.startswith("raja_"):
            name_ne = "राज योग"
        else:
            name_ne = name_ne or name_en
        nature = _yoga_nature(y.get("polarity"))
        text = y.get("text", "")
        out.append({
            "key": key,
            "nameEn": name_en,
            "nameNe": name_ne,
            "nature": nature,
            "present": y["present"],
            "descEn": text,
            "descNe": _yoga_desc_ne(y),
        })
    return out


def _parse_iso(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def subdivide_dasha_period(lord: str, start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Antardasha children proportional to Vimshottari within [start, end)."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    total = end - start
    start_idx = DASHA_ORDER.index(lord)
    cursor = start
    children: list[dict[str, Any]] = []
    for step in range(9):
        sub_lord = DASHA_ORDER[(start_idx + step) % 9]
        frac = DASHA_YEARS[sub_lord] / 120.0
        sub_end = end if step == 8 else cursor + total * frac
        children.append({
            "lord": sub_lord,
            "lord_ne": DASHA_LORD_NE[sub_lord],
            "start": cursor.isoformat(),
            "end": sub_end.isoformat(),
        })
        cursor = sub_end
    return children


def _tree_node(lord: str, start: datetime, end: datetime, depth: int) -> dict[str, Any]:
    node = {
        "lord": lord,
        "lord_ne": DASHA_LORD_NE[lord],
        "start": start.isoformat(),
        "end": end.isoformat(),
    }
    if depth > 1:
        node["children"] = [
            _tree_node(
                child["lord"],
                _parse_iso(child["start"]),
                _parse_iso(child["end"]),
                depth - 1,
            )
            for child in subdivide_dasha_period(lord, start, end)
        ]
    return node


def _build_dasha_tree(dasha: dict[str, Any], *, tree_depth: int = 3, maha_count: int = 3) -> dict[str, Any]:
    tree: list[dict[str, Any]] = []
    for period in dasha["sequence"][:maha_count]:
        start = _parse_iso(period["start"])
        end = _parse_iso(period["end"])
        tree.append(_tree_node(period["lord"], start, end, tree_depth))
    return {**dasha, "tree": tree, "tree_depth": tree_depth}


def _build_varga_charts(points: dict[str, dict[str, Any]]) -> dict[str, Any]:
    owned = _owned_rashis()
    entries: dict[str, list[dict[str, Any]]] = {}
    for division in VARGA_DIVISIONS:
        div_key = str(division)
        rows: list[dict[str, Any]] = []
        for key, info in points.items():
            lon = float(info["longitude"])
            varga_rashi = varga_rashi_from_longitude(division, lon)
            nak_idx, pada = nakshatra_of(lon)
            owner_key = SIGN_LORD[varga_rashi - 1]
            planet_key = None if key == "lagna" else key
            rows.append({
                "key": key,
                "vargaRashi": varga_rashi,
                "dms": _dms_parts(lon),
                "nakshatraIndex": nak_idx,
                "pada": pada,
                "nakshatraLord": NAK_LORD[nak_idx],
                "subLord": _kp_sub_lord(lon),
                "ownerKey": owner_key,
                "relation": _relation(planet_key, owner_key) if planet_key else None,
                "dignity": _dignity_api(planet_key, lon, varga_rashi, division) if planet_key else None,
                "retrograde": bool(info.get("retrograde")) if key != "lagna" else False,
            })
        entries[div_key] = rows
    return {
        "divisions": list(VARGA_DIVISIONS),
        "points": {
            k: {
                "longitude": v["longitude"],
                **({"retrograde": v["retrograde"]} if v.get("retrograde") else {}),
            }
            for k, v in points.items()
        },
        "entries": entries,
        "ownedRashis": owned,
    }


def build_kundali_detail(
    instant_local: datetime,
    location: ObserverLocation,
    ayanamsha: str | None = None,
) -> dict[str, Any]:
    """Assemble the full /kundali/detail JSON payload."""
    ayanamsha_label, mode_id = resolve_ayanamsha_mode(ayanamsha)
    instant_utc = instant_local.astimezone(timezone.utc)

    panchanga = build_panchanga_at_time(instant_local, location, ayanamsa=mode_id)
    snapshot = build_planetary_snapshot(
        instant_utc, lat=location.lat, lon=location.lon, ayanamsa=mode_id,
    )
    planets = snapshot["planets"]
    lagna = snapshot["lagna"]
    lagna_lon = float(lagna["longitude"])
    lagna_rashi = sign_of(lagna_lon) + 1

    shadbala = compute_shadbala(
        instant_utc,
        lat=location.lat,
        lon=location.lon,
        timezone_name=location.timezone,
        ayanamsa=mode_id,
    )

    moon_lon = float(planets["moon"]["longitude"])
    dasha = vimshottari_dasha(moon_lon, instant_utc, cycles=1)
    dasha_tree = _build_dasha_tree(dasha, tree_depth=3, maha_count=3)

    chart = build_chart(planets, lagna, shadbala, dasha, datetime.now(timezone.utc))

    points: dict[str, dict[str, Any]] = {"lagna": {"longitude": lagna_lon, "retrograde": False}}
    for key in PLANET_KEYS:
        raw = planets.get(key)
        if not raw:
            continue
        points[key] = {
            "longitude": float(raw["longitude"]),
            "retrograde": bool(raw.get("is_retrograde", raw.get("retrograde", False))),
        }

    varga_charts = _build_varga_charts(points)

    detail = panchanga.get("detail") or {}
    upagrahas = _format_upagrahas(detail.get("upagrahas") or [])

    birth_clock = instant_local.strftime("%H:%M")
    sunrise_short = (panchanga.get("sunrise") or {}).get("local_time_short")
    sunrise_min = _parse_clock_minutes(sunrise_short)
    birth_min = _parse_clock_minutes(birth_clock)
    solar = detail.get("solar_corrections") or {}
    correction_min = _signed_solar_minutes(solar.get("belaantar")) + _signed_solar_minutes(
        solar.get("deshaantar")
    )
    ishta = None
    ahoratri_ishta = None
    if sunrise_min is not None and birth_min is not None:
        delta = birth_min - sunrise_min
        if delta < 0:
            delta += 24 * 60
        ahoratri_ishta = _ghadi_pala_vipala(delta)
        ishta = _ghadi_pala_vipala(max(0.0, delta - correction_min))

    moon_nak_idx, moon_pada = nakshatra_of(moon_lon)
    yoga_block = panchanga.get("yoga") or {}
    # The yoga block carries a 1-based "number" (no "index" key), so this
    # must be derived from it — reading a nonexistent "index" key silently
    # defaulted to 0 (Vishkambha) for every single chart.
    yoga_index = int(yoga_block.get("number", 1)) - 1

    sun_lon = float(planets["sun"]["longitude"])
    is_day = None
    try:
        from engine.vedic.at_time import resolve_vedic_day_anchor

        _, sunrise_utc, sunset_utc, _ = resolve_vedic_day_anchor(instant_local, location)
        is_day = sunrise_utc <= instant_utc < sunset_utc
    except Exception:
        pass

    planet_lons = {
        key: float(planets[key]["longitude"])
        for key in ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")
        if planets.get(key)
    }
    ashtakavarga = compute_ashtakavarga(planet_lons, lagna_lon)
    bhava_bala = compute_bhava_bala(lagna_rashi, planet_lons, shadbala)
    yuddha = compute_yuddha_bala(shadbala.get("planets") or [], planet_lons)

    combustion: dict[str, bool | None] = {}
    for key in PLANET_KEYS:
        if key not in COMBUST_ORB:
            combustion[key] = None
        elif key == "moon":
            combustion[key] = _angular_sep(moon_lon, sun_lon) < COMBUST_ORB["moon"]
        else:
            raw = planets.get(key)
            lon = float(raw["longitude"]) if raw else None
            combustion[key] = (
                lon is not None and _angular_sep(lon, sun_lon) < COMBUST_ORB[key]
            )

    return {
        "panchanga": panchanga,
        "shadbala": shadbala,
        "dasha": dasha_tree,
        "yuddha": yuddha,
        "bhavaBala": bhava_bala,
        "ashtakavarga": ashtakavarga,
        "yogas": _yogas_to_api(full_yoga_catalog(chart)),
        "vargaCharts": varga_charts,
        "upagrahas": upagrahas,
        "avakahada": _build_avakahada(moon_lon, sign_of(moon_lon) + 1, lagna_rashi),
        "birthMeta": {
            "birthClock": birth_clock,
            "isDayBirth": is_day,
            "ishtaKala": ishta,
            "ahoratriIshtaKala": ahoratri_ishta,
            "choghadiyaAtBirth": _choghadiya_at_birth(panchanga, birth_clock),
            "solarCorrectionMinutes": round(correction_min, 4),
            "moonNakshatra": {
                "index": moon_nak_idx,
                "number": moon_nak_idx + 1,
                "pada": moon_pada,
            },
            "yoga": {"index": yoga_index, "number": yoga_index + 1},
        },
        "combustion": combustion,
        "lagnaRashi": lagna_rashi,
        "ayanamsha": ayanamsha_label,
        "location": location.as_dict(),
        "birth_instant": instant_local.isoformat(),
    }
