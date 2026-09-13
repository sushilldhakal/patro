"""Replace ``grahaHouseSaravali["sun"]`` with a corrected, multi-source
12-house table, and migrate every graha's ``grahaHouseSaravali[graha][house]``
entry from a single classical citation to an ``entries`` array of citations.

Why: the previous ``grahaHouseSaravali["sun"]`` table (from
``ingest_graha_saravali_phaladesh.py``) carried exactly one classical
citation per house, silently dropping the second source the user's
original per-graha document actually gave for most houses, and had no
entry at all for house 4 (the dialog force-hides house 4 for this reason —
see ``BhavaDetailDialog.tsx``'s ``GrahaKarakatvaCard``). The user has now
supplied a corrected, complete 12-house document for सूर्य with **two**
classical citations per house (सारावली, फलदीपिका, होरासार and जातक
पारिजात, mixed per house) including house 4, and asked that the dialog
show both citations for a house instead of only one.

Schema change: ``grahaHouseSaravali[graha][house]`` used to be a single
citation object (``shloka``/``shlokaSourceNe``/``meaningNe``/
``explanationNe``/... + ``rating``). It is now::

    {
      "house": int,
      "houseTheme": str,
      "rating": "uttam" | "shubh" | "mishrit" | "kamjor",
      "entries": [
        {
          "shloka": str,
          "shlokaSourceNe": str, "shlokaSourceEn": str,
          "meaningNe": str, "meaningEn": str,
          "explanationNe": str, "explanationEn": str,
        },
        ...
      ]
    }

``rating`` and ``houseTheme`` move up a level (they describe the house
placement itself, not any one citation of it) while ``entries`` holds one
object per classical source. Every other graha's existing single citation
is wrapped as a 1-element ``entries`` list so the shape is uniform across
``grahaHouseSaravali`` — only सूर्य gets a second entry per house in this
pass; the module docstring in ``engine/vedic/bhava_reference.py`` already
notes moon/mercury/jupiter/rahu are still pending from the user for this
table, unaffected here.

English (`meaningEn`/`explanationEn`) is hand-translated to match the
existing sun entries' quality (real English, not a Nepali mirror) since
sun already set that bar; houseTheme is unchanged from the existing table
(``HOUSE_THEME`` below, mirroring ``ingest_graha_saravali_phaladesh.py``).

Run from the repo root: ``python scripts/ingest_sun_house_multi_source.py``
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

HOUSE_THEME = {
    1: "लग्न",
    2: "धन भाव",
    3: "सहज भाव",
    4: "सुख भाव",
    5: "सन्तान/बुद्धि",
    6: "रिपु भाव",
    7: "दाम्पत्य भाव",
    8: "आयु भाव",
    9: "भाग्य भाव",
    10: "कर्म भाव",
    11: "आय भाव",
    12: "व्यय भाव",
}

# rating carried over from the previous single-citation table (house 4 is
# new; classified from its own content, both citations being negative).
HOUSE_RATING = {
    1: "mishrit",
    2: "kamjor",
    3: "shubh",
    4: "kamjor",
    5: "kamjor",
    6: "shubh",
    7: "kamjor",
    8: "kamjor",
    9: "shubh",
    10: "uttam",
    11: "uttam",
    12: "kamjor",
}

SOURCE_EN = {
    "सारावली": "Saravali",
    "फलदीपिका": "Phaladeepika",
    "होरासार": "Horasara",
    "जातक पारिजात": "Jataka Parijata",
}


def entry(source_ne: str, shloka: str, meaning_ne: str, meaning_en: str, explanation_ne: str, explanation_en: str) -> dict:
    return {
        "shloka": shloka,
        "shlokaSourceNe": source_ne,
        "shlokaSourceEn": SOURCE_EN[source_ne],
        "meaningNe": meaning_ne,
        "meaningEn": meaning_en,
        "explanationNe": explanation_ne,
        "explanationEn": explanation_en,
    }


SUN_HOUSES: dict[int, list[dict]] = {
    1: [
        entry(
            "सारावली",
            "अल्पकेशोऽलसः क्रोधी दृप्तः पङ्गुः प्रतापावान्।\nउष्णगात्रोऽभयः शूरो धनपुत्रविवर्जितः॥",
            "प्रथम भाव (लग्न) मा सूर्य स्थित हुँदा व्यक्ति कम कपाल भएको, अल्छी, क्रोधी, अभिमानी, प्रतापी, उष्ण शरीर भएको, निडर, शूरवीर तथा धन र सन्तानको सुखमा कमी भोग्ने हुन्छ।",
            "With the Sun placed in the 1st house (Lagna), the person has thin hair, is lazy, hot-tempered, proud, of great valor, hot-bodied, fearless and courageous, but sees less happiness from wealth and children.",
            "सूर्य लग्नमा हुनाले आत्मबल र तेज बढाउँछ तर क्रोधी स्वभाव र शारीरिक पित्त विकार पनि दिन्छ।",
            "The Sun in the Lagna raises self-confidence and radiance, but also brings a hot temper and bile-type physical disorders.",
        ),
        entry(
            "होरासार",
            "तीक्ष्णः शूरः प्रतापी च स्थिरचित्तोऽभयः सुखी।\nलग्ने रवौ भवेज्जातो पित्तरोगादितो नरः॥",
            "लग्नमा सूर्य भएमा जातक तीक्ष्ण स्वभावको, शूरवीर, प्रतापी, स्थिर चित्त भएको, निडर र सुखी हुन्छ, तर पित्त सम्बन्धी रोगले पीडित रहन्छ।",
            "With the Sun in the Lagna, the native is sharp-natured, valorous, of great might, steady-minded, fearless and happy, yet troubled by bile-related ailments.",
            "होरासार अनुसार यो स्थितिले मान-प्रतिष्ठा दिन्छ तर स्वास्थ्यमा पित्त दोष बढाउँछ।",
            "Per the Horasara, this placement brings honor and standing, but aggravates the bile constitution.",
        ),
    ],
    2: [
        entry(
            "सारावली",
            "धनधान्यपरिभ्रष्टो मुखरोगी सर्वदा भवेत्।\nराजदण्डभयाक्रान्तो धनस्थे तिमिरारिहन्तारि॥",
            "दोस्रो भावमा सूर्य हुँदा व्यक्ति धन र धान्यमा बाधा भोग्ने, मुख वा आँखाको रोगी र सरकारी कारबाही वा दण्डको भय रहने हुन्छ।",
            "With the Sun in the 2nd house, the person faces obstacles to wealth and grain, suffers ailments of the mouth or eyes, and lives in fear of government action or punishment.",
            "धन भावमा पापग्रह/क्रूर ग्रह सूर्य हुनाले सञ्चित धन र पारिवारिक सुखमा बाधा पुर्‍याउँछ।",
            "The Sun, a fiery/malefic graha, in the house of wealth obstructs accumulated wealth and family happiness.",
        ),
        entry(
            "फलदीपिका",
            "श्रीविद्याविनयैर्हीनः स्वल्पवाक् नेत्ररोगी च।\nधनस्थे भास्करे जातो भवेच्चापि दरिद्रता॥",
            "द्वितीय भावमा सूर्य भएमा जातक धन, विद्या र नम्रतामा कमी भोग्ने, कम बोल्ने, आँखाको रोगी र धनको कमी झेल्ने हुन्छ।",
            "With the Sun in the 2nd house, the native lacks prosperity, learning and humility, speaks little, suffers eye ailments, and faces poverty.",
            "फलदीपिकाका अनुसार यसले बोलीमा कडापन र दाहिने आँखामा कमजोरी ल्याउँछ।",
            "Per the Phaladeepika, this brings harshness of speech and weakness in the right eye.",
        ),
    ],
    3: [
        entry(
            "जातक पारिजात",
            "भ्रातृहीनो महावीर्यो रणधीरः प्रतापवान्।\nधनी मानी यशस्वी च सहजेऽर्के सुखी नरः॥",
            "तेस्रो भावमा सूर्य हुँदा जातक दाजुभाइको सुखमा कमी भए पनि महापराक्रमी, युद्धमा धैर्यवान्, प्रतापी, धनी, मानी, यशस्वी र सुखी हुन्छ।",
            "With the Sun in the 3rd house, the native sees less happiness from siblings but is greatly valorous, steadfast in battle, of great might, wealthy, respected, famed and happy.",
            "३ औँ भाव सूर्यको लागि उत्तम उपचय भाव हो, जसले अद्भूत साहस र विजय दिन्छ।",
            "The 3rd house is an excellent upachaya placement for the Sun, granting remarkable courage and victory.",
        ),
        entry(
            "होरासार",
            "तेजोबलान्वितः शूरः सुखी बन्धुविवर्जितः।\nसहजे भास्करे जातो ज्ञानी च बहुवित्तवान्॥",
            "तेस्रो भावमा सूर्य भए जातक तेजस्वी, बलवान्, शूरवीर, सुखी, ज्ञानी र धनी हुन्छ तर बान्धवहरूसँग मतभेद रहन्छ।",
            "With the Sun in the 3rd house, the native is radiant, strong, valorous, happy, knowledgeable and wealthy, but has discord with relatives.",
            "यसले व्यक्तिलाई आत्मनिर्भर र पराक्रमी बनाउँछ।",
            "This makes the person self-reliant and courageous.",
        ),
    ],
    4: [
        entry(
            "फलदीपिका",
            "सुखहीनो निष्परिग्रहो हृद्रोगी विकलः सदा।\nबन्धुस्थाने स्थिते सूर्ये नरः कर्मरतो भवेत्॥",
            "चौथो भावमा सूर्य हुँदा व्यक्ति सुखहीन, सम्पत्तिविहीन, हृदय रोगी, सधैँ बेचैन तर निरन्तर काममा लागिरहने हुन्छ।",
            "With the Sun in the 4th house, the person lacks comfort, owns little property, suffers heart ailments, stays perpetually restless, but remains constantly occupied with work.",
            "चौथो भावमा सूर्य दिग्बलहीन हुने हुनाले मानसिक शान्ति र आमाको सुखमा असर पार्छ।",
            "The Sun lacks directional strength in the 4th house, which affects peace of mind and happiness from the mother.",
        ),
        entry(
            "सारावली",
            "मातुलसुखहीनश्च बान्धवप्रतिकूलकः।\nचतुर्थे तिग्मरश्मौ तु बन्धुहीनः सुतान्वितः॥",
            "चौथो भावमा सूर्य भए मामाको सुख नहुने, बन्धु-बान्धव अनुकूल नरहने, तर सन्तानको सुख प्राप्त हुने हुन्छ।",
            "With the Sun in the 4th house, there is no happiness from maternal uncles, relatives are unfavorable, yet the native gains the happiness of children.",
            "यसले घरेलु वातावरणमा केही उष्णता र अशान्ति उत्पन्न गराउँछ।",
            "This brings some heat and unrest into the domestic environment.",
        ),
    ],
    5: [
        entry(
            "सारावली",
            "मन्दमतिः सुतहीनः कान्तारवनप्रियो धनविहीनः।\nजीवति चाल्पायुष्मान् सुतभवने भास्करो यस्य॥",
            "पाँचौँ भावमा सूर्य हुँदा व्यक्ति सन्तान सुखमा कमी भोग्ने, एकान्त वा वनप्रिय हुने र पेट/पित्त सम्बन्धी समस्या देखिने हुन्छ।",
            "With the Sun in the 5th house, the person sees less happiness from children, is drawn to solitude or forest-like retreats, and shows stomach or bile-related trouble.",
            "५ औँ भावमा सूर्यको तापले गर्दा सन्तान प्राप्तिमा ढिलाइ वा बाधा हुनसक्छ।",
            "The Sun's heat in the 5th house can delay or obstruct the matter of children.",
        ),
        entry(
            "होरासार",
            "त्वरितवक्ता तीव्रमेधा स्वल्पपुत्रो न धनावान्।\nसुतभवने सूर्यस्थे पित्तरोगादितो भवेत्॥",
            "पाँचौँ भावमा सूर्य भए जातक छिटो बोल्ने, तीव्र बुद्धि भएको, कम सन्तान हुने र पेट/पित्तको रोगी हुन्छ।",
            "With the Sun in the 5th house, the native speaks quickly, is sharp-witted, has few children, and is not wealthy, and suffers from bile-related ailments.",
            "बुद्धिको विकास तीव्र भए पनि सन्तान र सञ्चित धनमा उतारचढाव रहन्छ।",
            "Though intellect develops sharply, children and accumulated wealth stay unsteady.",
        ),
    ],
    6: [
        entry(
            "जातक पारिजात",
            "नीरोगः बलवान् शूरो धनवान् भूपतिप्रियः।\nजितारिर्विख्यातो रिपुस्थाने दिवाकरे॥",
            "छैटौँ भावमा सूर्य हुँदा व्यक्ति निरोगी, बलवान्, शूरवीर, धनी, राजा/सरकारको प्रिय, शत्रुमाथि विजय पाउने र प्रसिद्ध हुन्छ।",
            "With the Sun in the 6th house, the person is healthy, strong, valorous, wealthy, favored by rulers and government, victorious over enemies, and renowned.",
            "छैटौँ भावमा सूर्यले शत्रुहन्ता योग बनाउँछ र आरोग्यता प्रदान गर्छ।",
            "The Sun in the 6th house forms a shatru-hanta (enemy-destroying) yoga and grants good health.",
        ),
        entry(
            "फलदीपिका",
            "नृपमान्यो महातेजाः ख्यातकर्मा जिताहवः।\nषष्ठे दिवाकरे जातो बलवान् धनवान् भवेत्॥",
            "छैटौँ भावमा सूर्य भए जातक राजाबाट सम्मानित, महातेजस्वी, प्रसिद्ध कर्म गर्ने, युद्धमा विजयी, बलवान् र धनी हुन्छ।",
            "With the Sun in the 6th house, the native is honored by rulers, greatly radiant, known for notable deeds, victorious in conflict, strong and wealthy.",
            "प्रशासनिक क्षेत्र वा प्रतिस्पर्धात्मक परीक्षामा सफलताका लागि यो उत्तम स्थान हो।",
            "This is an excellent placement for success in administrative work or competitive examinations.",
        ),
    ],
    7: [
        entry(
            "फलदीपिका",
            "कलत्रगामी परदारसक्तो दरिद्रो दुःखी परिभूतश्च।\nद्यूनस्थिते भास्करसूनुपित्रा जाया विनाशं कुरुते च पुंसाम्॥",
            "सातौँ भावमा सूर्य हुँदा वैवाहिक जीवनमा कलह, पत्नीको स्वास्थ्यमा कष्ट, अपमान र वैवाहिक सुखमा कमी आउँछ।",
            "With the Sun in the 7th house, there is discord in married life, distress to the spouse's health, humiliation, and a decline in marital happiness.",
            "सातौँ भावमा सूर्यको उपस्थिति र तापले साझेदारी र दाम्पत्य जीवनमा मतभेद ल्याउँछ।",
            "The Sun's presence and heat in the 7th house brings friction into partnerships and married life.",
        ),
        entry(
            "सारावली",
            "मदने विनोदशीलो दारेद्वेषी न शान्तबुद्धिः स्यात्।\nसप्तमे तिग्मरश्मौ तु कामी चाटुकल्पो भवेत्॥",
            "सातौँ भावमा सूर्य भए व्यक्ति चञ्चल, पत्नीप्रति रुष्ट रहने, अशान्त बुद्धि भएको र कामुक स्वभावको हुन्छ।",
            "With the Sun in the 7th house, the person is fickle, resentful toward the spouse, restless-minded, and of a passionate disposition.",
            "वैवाहिक तालमेल मिलाउन दुवै पक्षमा धैर्यको आवश्यकता पर्छ।",
            "Both partners need patience to keep the marriage in harmony.",
        ),
    ],
    8: [
        entry(
            "सारावली",
            "विकलाक्षो धनहीनः सुतहीनः स्वल्पजीवितो भवति।\nअष्टमभवने सूर्ये नृपती कोपादपगतश्रीः॥",
            "आठौँ भावमा सूर्य हुँदा दृष्टिमा कमजोरी, धन र सन्तानमा कष्ट, र राजा/सरकारको कोपका कारण श्री (सम्पत्ति) नाश हुने भय रहन्छ।",
            "With the Sun in the 8th house, there is weakness of eyesight, distress regarding wealth and children, and the risk of losing prosperity through a ruler's or government's displeasure.",
            "आठौँ भावमा सूर्यले आँखाको समस्या र अचानक मान-हानि गराउन सक्छ।",
            "The Sun in the 8th house can cause eye trouble and a sudden loss of standing.",
        ),
        entry(
            "होरासार",
            "विकलेक्षणः स्वल्पसुतो व्याधितोऽतिविख्यातः।\nनिधने भास्करे जातो जनप्रियश्चापि जायते॥",
            "आठौँ भावमा सूर्य भए जातक कमजोर दृष्टियुक्त, कम सन्तान भएको, रोगी तर समाजमा प्रसिद्ध र जनप्रिय हुन्छ।",
            "With the Sun in the 8th house, the native has weak eyesight, few children, is prone to illness, yet becomes very well-known and popular among people.",
            "यसले गुप्त अध्ययन र खोजमुलक कार्यमा भने सफलता प्रदान गर्छ।",
            "This still grants success in occult study and research-oriented work.",
        ),
    ],
    9: [
        entry(
            "जातक पारिजात",
            "धर्मे धर्मरतः सुतार्थसहितो भूपालपूजाङ्कितः।\nभ्रातृद्वेषपरो गुरुद्विजपरो नो सत्यवादी रवेः॥",
            "नवौँ भावमा सूर्य हुँदा व्यक्ति धर्ममा लीन, सन्तान र धनले युक्त, राजा/सरकारबाट सम्मानित र गुरु-ब्राह्मणको भक्त हुन्छ।",
            "With the Sun in the 9th house, the person is devoted to dharma, blessed with children and wealth, honored by rulers or government, and devoted to teachers and brahmins.",
            "नवौँ भावमा सूर्यले भाग्य वृद्धि र उच्च प्रतिष्ठा दिलाउँछ, यद्यपि पितासँग वैचारिक मतभेद हुनसक्छ।",
            "The Sun in the 9th house raises fortune and standing, though it can bring differences of opinion with the father.",
        ),
        entry(
            "फलदीपिका",
            "पितृद्वेषी सुतधनी धर्मिष्ठो देवपूजकः।\nनवमे तिग्मरश्मौ तु सुभगः सुसुतो भवेत्॥",
            "नवौँ भावमा सूर्य भए जातक धर्मिष्ठ, देवताको पूजक, भाग्यशाली, सुखी र सुपुत्रवान् हुन्छ तर पितासँग मतभेद हुनसक्छ।",
            "With the Sun in the 9th house, the native is righteous, devoted to the gods, fortunate, happy and blessed with good children, though there may be friction with the father.",
            "यो आध्यात्मिक र धार्मिक उन्नतिका लागि शुभ योग हो।",
            "This is an auspicious yoga for spiritual and religious progress.",
        ),
    ],
    10: [
        entry(
            "सारावली",
            "मतिविक्रमप्रतापैः श्रीमान् नृपसदृशो भवति जातः।\nदशमे रवौ विशोको मतिमान् हयवाहनोपेतः॥",
            "दशौँ भावमा सूर्य हुँदा जातक बुद्धि, विक्रम र प्रतापले युक्त, धनी, राजा समान सम्मानित, शोकरहित र सवारी साधनले पूर्ण हुन्छ।",
            "With the Sun in the 10th house, the native is endowed with intellect, valor and majesty, wealthy, honored like a ruler, free of grief, and possesses fine vehicles.",
            "दशम भावमा सूर्य दिग्बली हुन्छ। यो कुलदीपक र राजयोग कारक स्थान हो।",
            "The Sun has directional strength in the 10th house — its best placement, making one the pride of the family and a cause of raja yoga.",
        ),
        entry(
            "फलदीपिका",
            "सुखी कीर्तिमान् विजयी नृपमान्यो महाधनः।\nपितृसौख्ययुतो जातो दशमेऽह्नो यदा पतिः॥",
            "दशौँ भावमा सूर्य भए व्यक्ति सुखी, कीर्तिमान्, विजयी, सरकारबाट सम्मानित, महाधनी र पिताको पूर्ण सुख पाउने हुन्छ।",
            "With the Sun in the 10th house, the person is happy, renowned, victorious, honored by government, greatly wealthy, and enjoys full happiness from the father.",
            "यसले कार्यक्षेत्रमा उच्च पद, नेतृत्व र सफलता प्रदान गर्दछ।",
            "This grants a high position, leadership and success in one's career.",
        ),
    ],
    11: [
        entry(
            "सारावली",
            "प्रभूतधनवान् मानी वीर्यवान् विगतक्लम्।\nलाभेऽर्के शत्रुहन्ता च जायते सेवानृपप्रियः॥",
            "एघारौँ भावमा सूर्य हुँदा जातक प्रचुर धनवान्, मानी, पराक्रमी, दुःखरहित, शत्रुको नाश गर्ने र राजा/सरकारको प्रिय हुन्छ।",
            "With the Sun in the 11th house, the native is abundantly wealthy, self-respecting, valorous, free of sorrow, destroys enemies, and is favored by rulers or government.",
            "एकादश भावमा सूर्यले सबै मनोकांक्षा पूरा गराउँछ र निरन्तर लाभ दिन्छ।",
            "The Sun in the 11th house fulfils every wish and brings continuous gains.",
        ),
        entry(
            "फलदीपिका",
            "धनवान् दीर्घजीवी च शोकरहितः सुखी जनः।\nलाभस्थे तिग्मरश्मौ तु बहुभृत्यवृतो भवेत्॥",
            "एघारौँ भावमा सूर्य भए व्यक्ति धनवान्, दीर्घायु, शोकरहित, सुखी र धेरै सेवक तथा सहयोगीहरूले घेरिएको हुन्छ।",
            "With the Sun in the 11th house, the person is wealthy, long-lived, free of grief, happy, and surrounded by many servants and helpers.",
            "व्यापार, लगानी र समाजमा ठूलो सफलताका लागि यो अत्यन्त शुभ छ।",
            "This is highly auspicious for great success in business, investment and society.",
        ),
    ],
    12: [
        entry(
            "सारावली",
            "पतितः सुतहीनश्च विकलाङ्गो धनविहीनश्च।\nनृपकोपादपगतश्रीः व्यये रवौ भवति जातः॥",
            "बाह्रौँ भावमा सूर्य हुँदा व्यक्ति अत्यधिक खर्च गर्ने, बायाँ आँखा वा अंगमा कमजोरी भोग्ने, र राज्य/सरकारबाट धनहानि हुनसक्ने हुन्छ।",
            "With the Sun in the 12th house, the person spends excessively, suffers weakness in an eye or limb, and may lose wealth through the displeasure of a ruler or government.",
            "व्यय भावमा सूर्यले अनावश्यक खर्च र आँखाको समस्या दिन्छ तर विदेश यात्राका लागि बाटो खोल्छ।",
            "The Sun in the house of expenditure brings needless spending and eye trouble, but opens the way for travel abroad.",
        ),
        entry(
            "फलदीपिका",
            "पितृद्वेषी नेत्ररोगी सुतहीनो बलोज्झितः।\nपतितो विकलो व्योमगतेऽर्के जायते नरः॥",
            "बाह्रौँ भावमा सूर्य भए व्यक्ति पितासँग मतभेद राख्ने, आँखाको रोगी, सन्तान वा बलमा कमी र देश/विदेशमा भ्रमणशील हुन्छ।",
            "With the Sun placed in the 12th house, the person has friction with the father, suffers eye ailments, lacks children or strength, and travels widely at home and abroad.",
            "यसले अध्यात्म र वैदेशिक क्षेत्रबाट भने लाभ दिलाउन सक्छ।",
            "This can still bring benefit through spirituality and foreign connections.",
        ),
    ],
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    # Migrate every graha's existing single-citation entries to the new
    # {house, houseTheme, rating, entries: [...]} shape.
    for graha, houses in table.items():
        if graha == "sun":
            continue
        for house_key, old in houses.items():
            houses[house_key] = {
                "house": old["house"],
                "houseTheme": old.get("houseTheme") or HOUSE_THEME.get(int(house_key), ""),
                "rating": old["rating"],
                "entries": [
                    {
                        "shloka": old["shloka"],
                        "shlokaSourceNe": old["shlokaSourceNe"],
                        "shlokaSourceEn": old["shlokaSourceEn"],
                        "meaningNe": old["meaningNe"],
                        "meaningEn": old["meaningEn"],
                        "explanationNe": old["explanationNe"],
                        "explanationEn": old["explanationEn"],
                    }
                ],
            }

    # Replace sun entirely with the corrected, complete, two-citation table.
    table["sun"] = {
        str(house): {
            "house": house,
            "houseTheme": HOUSE_THEME[house],
            "rating": HOUSE_RATING[house],
            "entries": entries,
        }
        for house, entries in SUN_HOUSES.items()
    }

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
