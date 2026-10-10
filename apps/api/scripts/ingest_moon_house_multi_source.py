"""Replace ``grahaHouseSaravali["moon"]`` with a corrected, complete
12-house table sourced from a user-supplied document — a third distinct
shape, combining sun's ("per-citation meaning") and mercury/venus's
("unified summary") patterns in the same table.

चन्द्र's document gives, per house: a full फलदीपिका citation (shloka +
its own नेपाली अर्थ + ज्योतिषीय व्याख्या) and a full होरासार citation
(same three parts) — exactly sun's per-entry shape — **plus** a third,
combined "सारावली एवं जातक पारिजात दृष्टिकोण" paragraph that discusses
both texts together in prose, only occasionally quoting an actual
Sanskrit fragment inline, without ever cleanly separating which words are
सारावली's and which are जातक पारिजात's, and without स्रोत-worthy meaning/
explanation of its own. So each house's ``entries`` holds exactly the two
clean citations (फलदीपिका, होरासार), each carrying its own
meaning/explanation like sun's entries; the सारावली/जातक-पारिजात prose
goes into the house's ``summaryNe``/``summaryEn`` fields (the mechanism
``ingest_mercury_house_multi_source.py`` added) — reused here not because
the entries lack their own meaning (they don't), but because this third
perspective simply isn't attached to one clean citation. The dialog
renders both without conflict: per-entry meanings, then the summary once
at the end.

This also fills in house 4, which the previous (short, generic) moon
table didn't have.

`rating` **is** given this time — the source document's own "शास्त्रीय
फल श्रेणी" summary column, mapped word-for-word to the existing
``ratingLabel`` vocabulary (अति शुभ/शुभ -> uttam/shubh, मध्यम/मिश्रित ->
mishrit, सावधानी -> kamjor, translating each house's classification
rather than inferring it from sentiment as mercury/venus's tables did).

Reference-list bracket markers (e.g. ``[1]``, ``[3, 9]``) from the source
document are stripped — they cite sources not available to us and carry
no meaning on their own.

English (`meaningEn`/`explanationEn`/`summaryEn`) is hand-translated,
same convention as every other graha's table.

Run from the repo root: ``python scripts/ingest_moon_house_multi_source.py``
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

# From the source document's own "शास्त्रीय फल श्रेणी" summary column.
HOUSE_RATING = {
    1: "uttam",    # 🌟 अति शुभ (शुक्लपक्षे)
    2: "shubh",    # 💰 शुभ
    3: "mishrit",  # ⚔️ मध्यम / उपचय शुभ
    4: "uttam",    # 🏠 अति शुभ (दिग्बली)
    5: "uttam",    # 🎓 अति शुभ
    6: "kamjor",   # ⚠️ सावधानी (शुभदृष्टिमा शुभ)
    7: "uttam",    # 💖 अति शुभ
    8: "mishrit",  # ⚠️ मिश्रित / बालारिष्ट विचार्य
    9: "uttam",    # 🕉️ अति शुभ
    10: "uttam",   # 👑 अति शुभ
    11: "uttam",   # 💎 सर्वोत्कृष्ट लाभ
    12: "mishrit", # ✈️ मिश्रित (विदेश/मोक्ष)
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


MOON_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            entry(
                "फलदीपिका",
                "शुक्लपक्षे शशी लग्ने निर्भयो दृढगात्रवान्।\nबलिष्ठश्च तथा लक्ष्मीवान् दीर्घायुश्च भवेन्नरः॥",
                "यदि जन्मकुण्डलीको प्रथम भाव (लग्न) मा शुक्ल पक्षको चन्द्रमा स्थित छ भने जातक निर्भय, सुदृढ शरीर भएको, बलवान्, धनधान्य एवं लक्ष्मीले युक्त र दीर्घायु हुन्छ। (यदि कृष्ण पक्षको क्षीण चन्द्रमा लग्नमा भए शरीर दुर्बल, अल्पायु र चञ्चल स्वभाव दिन्छ)।",
                "If a waxing (shukla paksha) Moon is placed in the 1st house (Lagna) of the birth chart, the native is fearless, has a sturdy body, is strong, endowed with wealth and prosperity, and long-lived. (A weak, waning Moon in the Lagna instead gives a frail body, a short life, and a restless nature.)",
                "चन्द्रमा मन र शरीरको कारक ग्रह हो। प्रथम भावमा बलिष्ठ (शुक्ल पक्षको) चन्द्रमा रहँदा जातकको व्यक्तित्व प्रभावशाली, सौम्य र दयालु हुन्छ। मेष, वृष वा कर्कट लग्न भएमा लग्नस्थ चन्द्रमाले राजयोग समान फल दिन्छ।",
                "The Moon governs the mind and body. A strong (waxing) Moon in the 1st house gives an impressive, gentle and compassionate personality. With Aries, Taurus or Cancer as the ascendant, a Lagna-placed Moon can give results akin to a raja yoga.",
            ),
            entry(
                "होरासार",
                "मेषवृषकर्कलग्ने हिमगौ धनवान् सुखी नृपालसमः।\nवाग्बुद्धिवित्तरहितो लग्नस्थे नोक्तभेषु बलरहिते॥",
                "यदि मेष, वृष वा कर्कट राशि लग्न भई त्यसमा चन्द्रमा बसेको छ भने जातक धनवान्, सुखी र राजा समान वैभवशाली हुन्छ। तर यी तीन राशिबाहेक अन्य राशिमा बलहीन चन्द्रमा लग्नमा बसेमा जातक वाणी, बुद्धि, धन र शारीरिक बलबाट हीन हुन्छ।",
                "If Aries, Taurus or Cancer is the ascendant and the Moon sits there, the native is wealthy, happy and as splendid as a king. But a weak Moon in the Lagna in any other sign leaves the native lacking in speech, intellect, wealth and physical strength.",
                "होरासारकार पृथुयसका अनुसार चन्द्रमाको लग्नस्थिति राशि र बलमा निर्भर गर्दछ। स्वराशि (कर्कट) वा उच्च राशि (वृष) तथा मित्र राशि मेषमा लग्नस्थ चन्द्रमाले उच्च राजकीय पद र सुख प्रदान गर्दछ।",
                "Per Horasara's author Prithuyashas, the Moon's Lagna effect depends on its sign and strength. A Lagna Moon in its own sign (Cancer), exaltation (Taurus), or friendly sign (Aries) grants high, royal-level position and comfort.",
            ),
        ],
        "summaryNe": "सारावली र जातक पारिजात अनुसार चन्द्रमा दिग्बली हुने स्थान चतुर्थ भाव भए तापनि लग्नमा चन्द्रमा रहँदा जातकको सौन्दर्य र जनप्रियता उच्च हुन्छ। जातक पारिजात (अध्याय १०) अनुसार चन्द्रमा १, ४, ७, १० केन्द्र स्थान वा शुभ ग्रहको दृष्टिमा रहँदा शुभ फल गुणात्मक रूपमा वृद्धि हुन्छ।",
        "summaryEn": "Per Saravali and Jataka Parijata, even though the 4th house is where the Moon gains directional strength, a Moon in the Lagna still gives the native great beauty and popularity. Per Jataka Parijata (ch. 10), when the Moon occupies an angle (1st, 4th, 7th, 10th) or is aspected by benefics, its auspicious results increase further.",
    },
    2: {
        "entries": [
            entry(
                "फलदीपिका",
                "धनाढ्योऽन्तवार्णिविषयसुखवान् वाचि विकलः।",
                "द्वितीय भावमा चन्द्रमा स्थित भए जातक अत्यन्त धनवान्, धेरै कुटुम्ब/परिवार भएको, सांसारिक विषय-भोग र सुख भोग्ने हुन्छ, तर वाणीमा केही विकलता वा अस्पष्टता हुन सक्छ।",
                "With the Moon in the 2nd house, the native is very wealthy, has a large family, enjoys worldly pleasures and comforts, but may show some hesitancy or lack of clarity in speech.",
                "दोस्रो भाव धन, वाणी र कुटुम्बको हो। चन्द्रमा शुभ ग्रह भएकाले यहाँ बस्दा धन सञ्चय र पारिवारिक सुख राम्रो दिन्छ। यदि पापिग्रहको प्रभाव परेमा वाणीमा चञ्चलता वा दोहोरो अर्थ लाग्ने बोली हुन सक्छ।",
                "The 2nd house governs wealth, speech and family. Being a benefic, the Moon here brings good wealth accumulation and family happiness. If afflicted by a malefic, speech may become erratic or double-edged.",
            ),
            entry(
                "होरासार",
                "धनगे बहुप्रतापी धनवान् वनितादृतोऽल्पसन्तुष्टः।",
                "द्वितीय भावमा चन्द्रमा भए जातक ठूलो प्रतापी, धनी, स्त्रीहरूको प्रिय (स्त्रीहरूबाट आदर पाउने) र थोरै वस्तुमा पनि सन्तुष्ट रहने स्वभावको हुन्छ।",
                "With the Moon in the 2nd house, the native is highly influential, wealthy, favored by women, and content even with little.",
                "होरासार अनुसार दोस्रो भावको चन्द्रमाले मानिसलाई शान्त, सन्तोषी र स्त्री वर्गबाट आर्थिक वा सामाजिक लाभ दिलाउने योग बनाउँछ।",
                "Per the Horasara, the Moon in the 2nd house makes a person calm and contented, and forms a yoga for financial or social gain through women.",
            ),
        ],
        "summaryNe": "सारावली अनुसार द्वितीय भावमा चन्द्रमा स्वराशि (कर्कट) वा उच्च (वृष) भएमा जातकको मातृकुल र स्वअर्जित धनमा निरन्तर वृद्धि हुन्छ। जातक पारिजात अनुसार यदि २औं भावको स्वामी र चन्द्रमाको सम्बन्ध शुभ वर्गमा भए जातक बहुमूल्य रत्न, मोती र मिष्टान्न भोजनको भोक्ता हुन्छ।",
        "summaryEn": "Per Saravali, a 2nd-house Moon in its own sign (Cancer) or exalted (Taurus) brings steady growth in the native's maternal lineage and self-earned wealth. Per Jataka Parijata, if the 2nd lord and the Moon share an auspicious relationship, the native enjoys precious gems, pearls, and fine sweets.",
    },
    3: {
        "entries": [
            entry(
                "फलदीपिका",
                "सहोत्थे सभ्रातृप्रमदबलशौर्योऽतिकृपणः।",
                "तृतीय भावमा चन्द्रमा भए जातक भाइ-बहिनीले युक्त, स्त्री सुख पाउने, बलवान् र पराक्रमी हुन्छ, तर स्वभावले केही धन सञ्चय गर्न रुचाउने (कन्जुस/कृपण) हुन्छ।",
                "With the Moon in the 3rd house, the native is blessed with siblings, enjoys the happiness of women, is strong and valorous, but tends to be somewhat frugal about accumulating wealth.",
                "तेस्रो भाव उपचय भाव हो। जातक पारिजात र फलदीपिका दुवैका अनुसार उपचय भाव (३, ६, १०, ११) मा चन्द्रमा रहनु शुभ मानिन्छ। यसले जातकमा कलात्मक पराक्रम र सञ्चार क्षमता बढाउँछ।",
                "The 3rd house is an upachaya house. Both Jataka Parijata and Phaladeepika consider the Moon auspicious in the upachaya houses (3, 6, 10, 11). This increases the native's artistic valor and communication ability.",
            ),
            entry(
                "होरासार",
                "पिशुनो दयाविहीनो मायावी विक्रमाश्रिते शशिनि॥",
                "यदि तेस्रो भावमा चन्द्रमा स्थित छ भने जातक अलि कुरा लगाउने (पिशुन), दयारहित र मायावी (चतुर/छली) स्वभावको हुन सक्छ।",
                "If the Moon is placed in the 3rd house, the native may be somewhat backbiting, lacking in compassion, and cunning (crafty) by nature.",
                "होरासारले तेस्रो भावको चन्द्रमालाई मानिसको मानसिक चञ्चलता र कुटिलतासँग जोडेर हेरेको छ। तर यदि चन्द्रमा पूर्ण (बलवान्) छ भने यसले दाजुभाइ र कला क्षेत्रबाट ठूलो सफलता दिन्छ।",
                "The Horasara links the 3rd-house Moon to mental restlessness and cunning. However, if the Moon is full (strong), it brings great success through siblings and the arts.",
            ),
        ],
        "summaryNe": "जातक पारिजात (अध्याय १०) ले स्पष्ट रूपमा भनेको छ: \"तृतीयषष्ठलाभे षु शशिनश्च शुभप्रदाः\" अर्थात् लग्नबाट तेस्रो, छैठौं, दशौँ र एघारौँ भावमा चन्द्रमा अति शुभ र फलदायी हुन्छ। सारावली अनुसार तेस्रो चन्द्रमाले यात्रा, लेखन र सङ्गीत कलामा विशेष रुचि जगाउँछ।",
        "summaryEn": "Jataka Parijata (ch. 10) states clearly: \"tṛtīya-ṣaṣṭha-lābhe ṣu śaśinaśca śubhapradāḥ\" — the Moon is highly auspicious in the 3rd, 6th, 10th and 11th houses from the Lagna. Per Saravali, a 3rd-house Moon awakens a special interest in travel, writing and music.",
    },
    4: {
        "entries": [
            entry(
                "फलदीपिका",
                "सुखी भोगी त्यागी सुहृदि ससुहृद्वाहनयशाः।",
                "चतुर्थ भावमा चन्द्रमा भए जातक सुखी, विविध सुख-भोग प्राप्त गर्ने, दानी/त्यागी, असल मित्रहरू भएको, वाहन (सवारी साधन) र यशले युक्त हुन्छ।",
                "With the Moon in the 4th house, the native is happy, enjoys various comforts, is charitable, has good friends, and is endowed with vehicles and fame.",
                "चौथो भाव चन्द्रमाको कारक भाव हो र यहाँ चन्द्रमा दिग्बली हुन्छ। त्यसैले चतुर्थस्थ चन्द्रमाले आमाको पूर्ण सुख, घर-जग्गा, सवारी साधन र मानसिक शान्ति प्रदान गर्दछ।",
                "The 4th house is the Moon's own significator house, and the Moon has directional strength here. A 4th-house Moon grants full happiness from the mother, home and land, vehicles, and peace of mind.",
            ),
            entry(
                "होरासार",
                "मृष्टान्नभुग्विनीतः स्त्रीलोकः सौख्यभाक् सुखस्थेन्दौ।",
                "चौथो भावमा चन्द्रमा भए जातक स्वादिष्ट र मीठो भोजन गर्ने, नम्र/विनीत स्वभावको, स्त्री वर्गबाट सुख पाउने र सधैं प्रसन्न रहने हुन्छ।",
                "With the Moon in the 4th house, the native enjoys delicious, sweet food, is humble by nature, gains happiness through women, and stays cheerful.",
                "होरासारका अनुसार चतुर्थ चन्द्रमाले जातकको जीवनमा जलसम्बन्धी, दूध, कृषि वा वाहनसम्बन्धी सुखमा वृद्धि गराउँछ।",
                "Per the Horasara, a 4th-house Moon increases comforts related to water, dairy, agriculture or vehicles in the native's life.",
            ),
        ],
        "summaryNe": "सारावली अनुसार चतुर्थ भावमा चन्द्रमा स्वराशि (कर्कट) मा वा उच्च (वृष) मा भएमा जातक विशाल महल, जलसम्बन्धी वैभव र लोकप्रिय व्यक्तित्वको धनी हुन्छ। जातक पारिजात (अध्याय १२) अनुसार चतुर्थेश र चन्द्रमा शुभ ग्रहबाट दृष्ट भए जातकले जीवनभर अखण्ड वाहन र भूमि सुख प्राप्त गर्दछ।",
        "summaryEn": "Per Saravali, a 4th-house Moon in its own sign (Cancer) or exalted (Taurus) makes the native the owner of a grand mansion, water-related splendor, and a widely popular personality. Per Jataka Parijata (ch. 12), if the 4th lord and the Moon are aspected by benefics, the native enjoys uninterrupted comfort of vehicles and land throughout life.",
    },
    5: {
        "entries": [
            entry(
                "फलदीपिका",
                "सुपुत्रो मेधावी मृदुगतिरमात्यः सुतगते।",
                "पञ्चम भावमा चन्द्रमा भए जातक उत्तम सन्तान (सुपुत्र) भएको, मेधावी (तीक्ष्ण बुद्धिमान्), कोमल/मन्द चाल भएको र राजा वा सरकारको मन्त्री/सल्लाहकार पद प्राप्त गर्ने हुन्छ।",
                "With the Moon in the 5th house, the native has an excellent child, is highly intelligent, gentle in gait, and attains a position as minister or advisor to a ruler or government.",
                "पाँचौं भाव बुद्धि, मन्त्र र सन्तानको हो। चन्द्रमा जस्तो सौम्य ग्रह पञ्चममा बस्दा जातकमा उच्च कल्पनाशीलता, मन्त्र सिद्धि र शुभ सन्तति योग बन्दछ।",
                "The 5th house governs intellect, mantra, and children. A gentle graha like the Moon here creates high imaginative power, mastery of mantra, and an auspicious progeny yoga.",
            ),
            entry(
                "होरासार",
                "स्त्रीबुद्धिसत्त्वयुक्तो बहुश्रुतोत्पन्नवित्तवान् सुतगे॥",
                "पञ्चम भावमा चन्द्रमा रहे जातक सुन्दर पत्नी, बुद्धि र सात्त्विक गुणले युक्त, बहुश्रुत (शास्त्रज्ञ/विद्वान्) र आफ्नै परिश्रमले धन आर्जन गर्ने हुन्छ।",
                "With the Moon in the 5th house, the native has a beautiful spouse, intellect and sattvic qualities, is widely learned, and earns wealth through their own effort.",
                "होरासार अनुसार ५औं भावको चन्द्रमाले जातकलाई ज्ञान र विवेक त दिन्छ, तर धन कमाउन केही कडा मेहनत गर्नुपर्ने हुन्छ।",
                "Per the Horasara, the Moon in the 5th house grants knowledge and wisdom, but earning wealth requires considerable hard work.",
            ),
        ],
        "summaryNe": "सारावली अनुसार पञ्चम भावमा चन्द्रमा स्थिर राशिमा भए पुत्र सन्तान र चर वा द्विस्वभाव राशिमा भए कन्या सन्तानको बाहुल्य हुन सक्छ। जातक पारिजात अनुसार यदि पञ्चम भावमा चन्द्रमा गुरु वा शुक्रको वर्गमा छ भने जातक उच्च कोटिको ज्ञानी र विद्वान् हुन्छ।",
        "summaryEn": "Per Saravali, if the 5th-house Moon is in a fixed sign, sons predominate among the children; in a movable or dual sign, daughters may predominate. Per Jataka Parijata, if the 5th-house Moon is in Jupiter's or Venus's varga, the native becomes a highly learned scholar.",
    },
    6: {
        "entries": [
            entry(
                "फलदीपिका",
                "क्षतेऽल्पायुश्चन्द्रेऽमतिरुदररोगी परिभवी।",
                "छैठौं भावमा चन्द्रमा भए जातक शरीरमा चोटपटक लाग्ने, अल्पायु, मन्दबुद्धि, पेटको रोगी र अरूबाट पराजित वा अपमानित हुने सम्भावना रहन्छ।",
                "With the Moon in the 6th house, the native may suffer bodily injury, have a short life, dull intellect, stomach ailments, and be prone to defeat or humiliation by others.",
                "छैठौं भाव दुस्थान (त्रिक भाव) भएकाले यहाँ चन्द्रमा बस्दा कफ, पेट वा जलसम्बन्धी रोग उत्पन्न हुन सक्छ। तर उपचय भाव भएकाले यदि चन्द्रमा पूर्ण बली छ भने शत्रुमाथि विजय पनि दिलाउँछ।",
                "The 6th house is a dusthana, so the Moon here can cause phlegm, stomach or water-related illness. But being an upachaya house too, a strong (full) Moon here can also grant victory over enemies.",
            ),
            entry(
                "होरासार",
                "षष्ठेऽलसो दरिद्रो बहुशत्रुः सोदरादिदमनश्च।",
                "छैठौं भावमा चन्द्रमा भए जातक आलसी, दरिद्र, धेरै शत्रु भएको र आफ्ना दाजुभाइहरूलाई दबाउने वा उनीहरूसँग विरोध गर्ने हुन्छ।",
                "With the Moon in the 6th house, the native is lazy, poor, has many enemies, and suppresses or conflicts with their own siblings.",
                "होरासारका अनुसार ६ठौं भावमा चन्द्रमा रहँदा जातकको पाचन प्रणाली कमजोर हुन सक्छ र भाइभाइमा मतभेद हुन सक्छ।",
                "Per the Horasara, a 6th-house Moon can weaken the native's digestive system and cause discord among siblings.",
            ),
        ],
        "summaryNe": "सारावली र बृहज्जातक अनुसार ६ठौं वा ८औं भावमा चन्द्रमा रहनु बालारिष्ट (बाल्यकालमा अस्वस्थता) को कारक बन्न सक्छ। तर जातक पारिजात र सारावली दुवैले स्पष्ट पारेका छन् कि यदि ६ठौं चन्द्रमामा शुभ ग्रह (गुरु, शुक्र, बुध) को दृष्टि छ भने बालारिष्ट भङ्ग भई जातक दीर्घायु हुन्छ।",
        "summaryEn": "Per Saravali and the Brihat Jataka, a Moon in the 6th or 8th house can be a factor in bala-arishta (childhood ill health). But both Jataka Parijata and Saravali make clear that if the 6th-house Moon is aspected by a benefic (Jupiter, Venus or Mercury), the bala-arishta is cancelled and the native becomes long-lived.",
    },
    7: {
        "entries": [
            entry(
                "फलदीपिका",
                "स्मरे दृष्टेः सौम्यो वरयुवतिकांतोऽतिसुभगः॥",
                "सप्तम भावमा चन्द्रमा भए जातक स्वयं सौम्य, सुन्दर, रूपवती र श्रेष्ठ पत्नीको प्रिय (र पत्नी पनि अत्यन्त सुन्दरी हुने) र अति सौभाग्यशाली हुन्छ।",
                "With the Moon in the 7th house, the native is themselves gentle and handsome, dear to a beautiful and excellent spouse (who is likewise very beautiful), and exceedingly fortunate.",
                "सातौं भाव विवाह र साझेदारीको हो। चन्द्रमा यहाँ बस्दा जीवनसाथी सुन्दर, भावुक र दयालु मिल्छ। दम्पतीबीच आपसी प्रेम र मधुरता कायम रहन्छ।",
                "The 7th house governs marriage and partnership. The Moon here brings a beautiful, emotionally warm and kind spouse, with mutual love and sweetness enduring between the couple.",
            ),
            entry(
                "होरासार",
                "स्त्रीदयितो नृपनेता प्रदानशीलोऽस्तगे निशानाथे॥",
                "सातौं (अस्त) भावमा चन्द्रमा भए जातक स्त्रीको अत्यन्त प्रिय, राजा/सरकारको नेता वा मुख्य अधिकारी र उदार एवं दानशील हुन्छ।",
                "With the Moon in the 7th (setting) house, the native is greatly loved by women, becomes a leader or chief official for a ruler or government, and is generous and charitable.",
                "होरासारका अनुसार सप्तमस्थ चन्द्रमाले जातकलाई व्यापार, विदेश यात्रा र समाजमा प्रतिष्ठा दिलाउँछ।",
                "Per the Horasara, a 7th-house Moon brings the native success in business, foreign travel, and standing in society.",
            ),
        ],
        "summaryNe": "सारावली अनुसार सप्तम भावमा पूर्ण चन्द्रमा भएमा जातकको विवाह द्रुत गतिमा हुन्छ र पत्नी समृद्ध कुलकी हुन्छिन्। जातक पारिजात (अध्याय ११) अनुसार यदि सप्तम भावमा चन्द्रमा र शुक्रको शुभ योग छ भने जातकको दाम्पत्य जीवन अत्यन्त सुखद रहन्छ।",
        "summaryEn": "Per Saravali, a full Moon in the 7th house brings a swift marriage, with the spouse coming from a prosperous family. Per Jataka Parijata (ch. 11), if the Moon and Venus form an auspicious yoga in the 7th house, the native's married life stays exceptionally happy.",
    },
    8: {
        "entries": [
            entry(
                "फलदीपिका",
                "मृतौ रोग्यल्पायुः...",
                "आठौं भावमा चन्द्रमा भए जातक रोगी र अल्पायु हुन सक्छ। (तर यदि चन्द्रमा पूर्ण, उच्च वा शुभग्रहबाट दृष्ट छ भने दोष हट्छ)।",
                "With the Moon in the 8th house, the native may be sickly and short-lived. (But if the Moon is full, exalted, or aspected by a benefic, this affliction is removed.)",
                "आठौं भाव सङ्कट र आयुको हो। चन्द्रमा यहाँ वृश्चिक (नीच) वा पाप प्रभावमा भए मानसिक तनाव, जलभय र अस्वस्थता दिन्छ।",
                "The 8th house governs danger and longevity. A Moon here in Scorpio (debilitation) or under malefic influence brings mental stress, fear of water, and poor health.",
            ),
            entry(
                "होरासार",
                "धनवान् निधने भोगी हिमगौ ज्ञानी प्रतापबहुलः स्यात्।",
                "(विशेष परिस्थिति अनुसार) आठौं भावमा चन्द्रमा भए जातक धनवान्, विविध भोग भोग्ने, ज्ञानी र ठूलो प्रतापी पनि हुन सक्छ।",
                "(Under specific circumstances) with the Moon in the 8th house, the native can also be wealthy, enjoy varied comforts, be knowledgeable, and greatly powerful.",
                "होरासारले अष्टम चन्द्रमाको एउटा विशिष्ट पक्ष उजागर गरेको छ— यदि अष्टमस्थ चन्द्रमा शुभ प्रभावमा छ वा आफ्नै उच्च/स्वराशिमा छ भने यसले गूढ ज्ञान (ज्योतिष/अनुसन्धान) र गुप्त धन दिलाउँछ।",
                "The Horasara highlights a special side of the 8th-house Moon — if it is under benefic influence or in its own exaltation or own sign, it grants occult knowledge (astrology/research) and hidden wealth.",
            ),
        ],
        "summaryNe": "शास्त्रीय ग्रन्थहरूमा आठौं चन्द्रमालाई बालारिष्ट विचार गर्दा विशेष ध्यान दिइन्छ। सारावली र बृहज्जातक अनुसार: \"अथापि वा पापनिरीक्षितश्चन्द्रः षष्ठाष्टमगो मरणाय।\" अर्थात् पापग्रहबाट दृष्ट अष्टम चन्द्रमाले कष्ट दिन्छ, तर यदि गुरु वा शुक्रले देखेमा मानिस दीर्घायु र सुखी हुन्छ।",
        "summaryEn": "Classical texts pay special attention to bala-arishta when assessing an 8th-house Moon. Per Saravali and the Brihat Jataka: \"athāpi vā pāpanirīkṣitaścandraḥ ṣaṣṭhāṣṭamago maraṇāya\" — an 8th-house Moon aspected by malefics brings hardship, but if seen by Jupiter or Venus, the person becomes long-lived and happy.",
    },
    9: {
        "entries": [
            entry(
                "फलदीपिका",
                "तपसि शुभधर्मात्मसुतवान्।",
                "नवम भावमा चन्द्रमा भए जातक शुभ आचरण गर्ने, धार्मिक, परोपकारी, भाग्यशाली र असल सन्तान (पुत्र) ले युक्त हुन्छ।",
                "With the Moon in the 9th house, the native behaves righteously, is religious, charitable, fortunate, and blessed with a good child.",
                "नवम भाव त्रिकोण भाव (भाग्य र धर्मको) हो। यहाँ चन्द्रमा बस्दा जातकको भाग्योदय विवाह र सन्तान प्राप्तिपछि तीव्र गतिमा हुन्छ।",
                "The 9th house is a trikona house (of fortune and dharma). The Moon here accelerates the native's rise in fortune, especially after marriage and having children.",
            ),
            entry(
                "होरासार",
                "धर्मप्रियोऽतिभाषी नवमे स्त्रीचञ्चलो धनाध्यक्षः॥",
                "नवम भावमा चन्द्रमा भए जातक धर्ममा रुचि राख्ने, प्रगल्भ वक्ता (धेरै/प्रभावशाली बोल्ने), स्त्रीप्रति केही चञ्चल तर कोषको अध्यक्ष (धनाध्यक्ष/बैंक वा वित्त अधिकारी) हुन्छ।",
                "With the Moon in the 9th house, the native takes interest in dharma, is a bold and impactful speaker, somewhat restless regarding women, but becomes a treasurer (a finance official).",
                "होरासार अनुसार नवमस्थ चन्द्रमाले जातकलाई धार्मिक तीर्थयात्रा, परोपकार र धन व्यवस्थापनमा शीर्ष स्थानमा पुर्‍याउँछ।",
                "Per the Horasara, a 9th-house Moon brings the native to the top through religious pilgrimage, charity, and financial administration.",
            ),
        ],
        "summaryNe": "सारावली अनुसार नवम भावमा चन्द्रमा हुनु भाग्य वृद्धि र देव-ब्राह्मण भक्ति प्रदान गर्ने उत्तम योग हो। जातक पारिजात अनुसार यदि नवमेश र चन्द्रमाको शुभ सम्बन्ध छ भने जातक जीवनभर अखण्ड भाग्य भोग गर्दछ।",
        "summaryEn": "Per Saravali, the Moon in the 9th house is an excellent yoga that increases fortune and devotion to gods and brahmins. Per Jataka Parijata, if the 9th lord and the Moon share an auspicious relationship, the native enjoys unbroken good fortune throughout life.",
    },
    10: {
        "entries": [
            entry(
                "फलदीपिका",
                "जयी सिद्धारम्भो नभसि शुभकृत्सत्प्रियकरः।",
                "दशम भावमा चन्द्रमा भए जातक विजयी (प्रतिस्पर्धामा जित्ने), जे काम सुरु गर्छ त्यसमा प्रारम्भमै सफलता पाउने, शुभ कर्म गर्ने र सज्जन पुरुषहरूको प्रिय हुन्छ।",
                "With the Moon in the 10th house, the native is victorious, finds success right from the start of any undertaking, performs righteous deeds, and is dear to virtuous people.",
                "दशम भाव उपचय र केन्द्र दुवै हो। यहाँ चन्द्रमा बस्दा जातक राज्य/सरकारबाट सम्मानित, व्यापार वा सार्वजनिक सेवामा उच्च स्थान प्राप्त गर्ने हुन्छ।",
                "The 10th house is both an upachaya and a kendra. The Moon here brings honor from the state or government, and a high position in business or public service.",
            ),
            entry(
                "होरासार",
                "सर्वोपायैर्धनवान् दशमे हिमगौ विदग्धयुवतीशः।",
                "दशम भावमा चन्द्रमा भए जातक सबै धर्मसम्मत/उचित उपायहरूद्वारा धन उपार्जन गर्ने र चतुर एवं कलाकुशल पत्नीको पति हुन्छ।",
                "With the Moon in the 10th house, the native earns wealth through all righteous means and becomes the husband of a clever, artistically accomplished wife.",
                "होरासारका अनुसार १०औं भावको चन्द्रमाले कार्यक्षेत्रमा बहुमुखी प्रतिभा र व्यापारिक सफलता प्रदान गर्दछ।",
                "Per the Horasara, a 10th-house Moon grants versatile talent and business success in the native's career.",
            ),
        ],
        "summaryNe": "जातक पारिजात (अध्याय १०) र सारावली अनुसार दशम भावमा सूर्य वा चन्द्रमा हुनु कार्यकुशलता र राजकीय वैभवको प्रतीक हो। यदि चन्द्रमा अमला योग (दशममा केवल शुभग्रह) बनाउँछ भने जातक निष्कलङ्क कीर्तिवान् हुन्छ।",
        "summaryEn": "Per Jataka Parijata (ch. 10) and Saravali, the Sun or Moon in the 10th house is a symbol of professional skill and royal splendor. If the Moon forms an Amala yoga (only benefics in the 10th from the Moon/Lagna), the native attains a spotless reputation.",
    },
    11: {
        "entries": [
            entry(
                "फलदीपिका",
                "मनस्वी बह्वायुर्धनतनयभृत्यैः सह भवेत्।",
                "एकादश भावमा चन्द्रमा भए जातक मनस्वी (दृढ सङ्कल्प भएको), दीर्घायु, धन, पुत्र र सेवकहरू (नौकर-चाकर) को सुख प्राप्त गर्ने हुन्छ।",
                "With the Moon in the 11th house, the native is strong-willed, long-lived, and enjoys wealth, children and servants.",
                "११औं भाव सर्वोत्तम उपचय भाव हो। यहाँ सबै ग्रहले शुभ फल दिन्छन्। चन्द्रमा एकादशमा हुँदा इच्छा पूर्ति, निरन्तर आम्दानी र समाजमा ठूलो प्रतिष्ठा मिल्छ।",
                "The 11th house is the best of the upachaya houses — every graha gives auspicious results here. The Moon in the 11th brings fulfillment of desires, steady income, and great standing in society.",
            ),
            entry(
                "होरासार",
                "लाभे धनी सुविद्वान् गोमान् नृपसम्मतो विनीतश्च॥",
                "एकादश (लाभ) भावमा चन्द्रमा भए जातक अत्यन्त धनी, ठूलो विद्वान्, पशु/गोधन वा सम्पत्तियुक्त, राजा/सरकारबाट सम्मानित र नम्र स्वभावको हुन्छ।",
                "With the Moon in the 11th (gains) house, the native is extremely wealthy, greatly learned, endowed with cattle/property, honored by rulers or government, and humble.",
                "होरासारका अनुसार लाभ भावको चन्द्रमाले मानिसलाई समाजप्रिय, विद्वान् र व्यावसायिक रूपमा सफल बनाउँछ।",
                "Per the Horasara, the Moon in the house of gains makes a person sociable, learned, and professionally successful.",
            ),
        ],
        "summaryNe": "जातक पारिजात (अध्याय १०) अनुसार: \"इन्दोस्तु तृतीये षष्ठे दशमे एकादशे शुभदः।\" अर्थात् ११औं भावमा चन्द्रमा रहँदा जातकले जीवनमा कहिल्यै आर्थिक अभाव भोग्नु पर्दैन। सारावली अनुसार एकादश चन्द्रमाले मित्रहरूबाट अपार लाभ दिलाउँछ।",
        "summaryEn": "Per Jataka Parijata (ch. 10): \"indostu tṛtīye ṣaṣṭhe daśame ekādaśe śubhadaḥ\" — with the Moon in the 11th house, the native never suffers financial want in life. Per Saravali, an 11th-house Moon brings immense gain through friends.",
    },
    12: {
        "entries": [
            entry(
                "फलदीपिका",
                "व्यये द्वेष्यो दुःखो शशिनि परिभूतोऽलसतमः॥",
                "द्वादश भावमा चन्द्रमा भए जातक अरूको द्वेषपात्र (घृणाको पात्र), दुःखी, अपमानित वा पराजित हुने र अत्यन्त आलसी हुन्छ।",
                "With the Moon in the 12th house, the native becomes an object of others' resentment, is unhappy, subject to humiliation or defeat, and extremely lazy.",
                "१२औं भाव खर्च र हानि/एकान्तको हो। यहाँ चन्द्रमा कमजोर भए मानसिक चिन्ता, आँखाको समस्या र व्यर्थको खर्च हुन सक्छ।",
                "The 12th house governs expenditure and loss/solitude. A weak Moon here can bring mental anxiety, eye trouble, and wasteful spending.",
            ),
            entry(
                "होरासार",
                "नयनातुरोऽङ्गहीनो व्ययगे स्त्रीदोषवानेकमतिः।\nक्षेत्रोच्चशस्तपक्षे व्ययगे हिमगौ सुखी धनी भवति॥",
                "१२औं भावमा चन्द्रमा भए मानिस आँखाको रोगी, अङ्गहीन वा दुर्बल, स्त्रीका कारण कष्ट पाउने र चञ्चल मति भएको हुन्छ। विशेष नियम: तर यदि द्वादश भाव चन्द्रमाको आफ्नै घर (कर्कट), उच्च राशि (वृष) वा शुक्ल पक्षको बलवान् चन्द्रमा छ भने जातक सुखी र धनी हुन्छ।",
                "With the Moon in the 12th house, the person suffers eye ailments, is weak or deficient in a limb, faces trouble because of women, and is fickle-minded. Special rule: but if the 12th-house Moon is in its own sign (Cancer), exalted (Taurus), or a strong waxing Moon, the native is happy and wealthy.",
                "होरासारले द्वादश चन्द्रमाको अपवाद स्पष्ट रूपमा प्रस्तुत गरेको छ— यदि १२औं भावमा चन्द्रमा स्वराशियुक्त वा पूर्ण बली छ भने विदेश यात्रा, वैदेशिक व्यापार र परोपकारबाट ठूलो धन प्राप्त हुन्छ।",
                "The Horasara clearly lays out the exception for the 12th-house Moon — if it is in its own sign or fully strong there, it brings great wealth through foreign travel, overseas trade, and charitable work.",
            ),
        ],
        "summaryNe": "सारावली अनुसार द्वादश भावको क्षीण चन्द्रमाले नेत्रविकार वा शयन सुखमा बाधा दिन्छ, तर पूर्ण चन्द्रमा भएमा धार्मिक कार्यमा खर्च गर्ने र मोक्ष मार्गमा लाग्ने उच्च विचार दिन्छ।",
        "summaryEn": "Per Saravali, a waning 12th-house Moon causes eye disorders or disturbed rest, but a full Moon there instead inclines the native toward spending on religious works and elevated thoughts leaning toward the path of liberation (moksha).",
    },
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    table["moon"] = {
        str(house): {
            "house": house,
            "houseTheme": HOUSE_THEME[house],
            "rating": HOUSE_RATING[house],
            "entries": payload["entries"],
            "summaryNe": payload["summaryNe"],
            "summaryEn": payload["summaryEn"],
        }
        for house, payload in MOON_HOUSES.items()
    }

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
