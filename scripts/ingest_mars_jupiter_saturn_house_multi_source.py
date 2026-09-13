"""Replace ``grahaHouseSaravali["mars"]``, ``["jupiter"]`` and
``["saturn"]`` with a corrected, complete 12-house table each, sourced
from one combined user-supplied document covering all three grahas.

Same document shape as ``ingest_rahu_ketu_house_multi_source.py``'s: four
classical citations per house (सारावली, फलदीपिका, होरासार, and either
बृहत्पाराशर होराशास्त्र — house 1 only, for all three grahas — or जातक
पारिजात — houses 2-12) followed by a separate "संयुक्त अर्थ" and "संयुक्त
विस्तृत व्याख्या" paragraph, concatenated here into one `summaryNe`/
`summaryEn` per the uniform shape every graha's table now uses. Author
names given alongside each ग्रन्थ in the source document are dropped
(bare book name only, matching every other graha's table).

This is jupiter's *first* real content for this table (previously a
short, generic single-citation placeholder) — jupiter was the last graha
still pending after rahu/ketu were completed. Mars and saturn already had
sun-style real content from an earlier round (`ingest_graha_saravali_
phaladesh.py`) but only one citation per house; this replaces that
entirely with the fuller four-citation document, matching the depth every
other graha's table now has, and fills in house 4 for all three grahas
(mars/saturn's previous tables didn't have it either).

`rating` isn't labelled in the source document, so each house's rating is
inferred from its combined meaning's sentiment, same convention as
mercury/venus/rahu/ketu's tables. Jupiter, a natural benefic, reads
positively in nearly every house per this document — that's the source's
own framing, not smoothed over here.

English (`summaryEn`) is hand-translated from the concatenated Nepali
summary, same convention as every other graha's table.

Run from the repo root:
``python scripts/ingest_mars_jupiter_saturn_house_multi_source.py``
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

MARS_RATING = {
    1: "mishrit", 2: "mishrit", 3: "uttam", 4: "kamjor", 5: "mishrit",
    6: "uttam", 7: "mishrit", 8: "kamjor", 9: "mishrit", 10: "uttam",
    11: "uttam", 12: "kamjor",
}

JUPITER_RATING = {
    1: "uttam", 2: "uttam", 3: "mishrit", 4: "uttam", 5: "uttam",
    6: "uttam", 7: "uttam", 8: "shubh", 9: "uttam", 10: "uttam",
    11: "uttam", 12: "shubh",
}

SATURN_RATING = {
    1: "mishrit", 2: "mishrit", 3: "uttam", 4: "kamjor", 5: "kamjor",
    6: "uttam", 7: "mishrit", 8: "mishrit", 9: "mishrit", 10: "uttam",
    11: "uttam", 12: "mishrit",
}

SOURCE_EN = {
    "सारावली": "Saravali",
    "फलदीपिका": "Phaladeepika",
    "होरासार": "Horasara",
    "जातक पारिजात": "Jataka Parijata",
    "सर्वार्थचिन्तामणि": "Sarvartha Chintamani",
    "बृहत्पाराशर होराशास्त्र": "Brihat Parashara Hora Shastra",
}


def citation(source_ne: str, shloka: str) -> dict:
    return {
        "shloka": shloka,
        "shlokaSourceNe": source_ne,
        "shlokaSourceEn": SOURCE_EN[source_ne],
    }


def summary(ne_meaning: str, ne_explanation: str, en: str) -> dict:
    return {
        "summaryNe": f"{ne_meaning.strip()} {ne_explanation.strip()}",
        "summaryEn": en,
    }


MARS_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "भूपौदार्यः शूरवान् वाग्मी भौमे १ भावगे सति।\nसाहसी रणधीरश्च तेजस्वी जायते नरः॥"),
            citation("फलदीपिका", "लग्ने मङ्गले व्रणाङ्किततनुः शूरः क्रोधी चाल्पायुरुद्यमी।\nपरदेशरतः सुमानवान् परदाररतोऽप्यथवा भवेत्॥"),
            citation("होरासार", "भौमोदये क्षताङ्गः शूरो बलवान् स्वमानशौर्ययुतः।\nचपलोऽल्पायुः क्रोधी पित्तरुगार्तोऽलसो भवेज्जातः॥"),
            citation("बृहत्पाराशर होराशास्त्र", "लग्ने भौमे व्रणी शूरो महाक्रोधी सुसाहसी।\nतेजस्त्री बाल्यावस्थायां रोगवान् सुप्रतानिमान्॥"),
        ],
        **summary(
            "प्रथम भाव (लग्न) मा मङ्गल स्थित हुँदा जातक अत्यन्त साहसी, प्रतापी, तेजस्वी, अडिग (रणधीर), उद्योगी र शूरवीर हुन्छ। यद्यपि शरीरमा चोटपटक वा दाग (व्रणाङ्कित/क्षताङ्ग), क्रोधी स्वभाव, पित्तविकार, बाल्यावस्थामा स्वास्थ्य कष्ट र चञ्चलता हुनसक्छ, तर जातकले आफ्नो पराक्रम र हिम्मतका बलमा उच्च मानसम्मान र सफलता प्राप्त गर्दछ।",
            "लग्न भाव व्यक्ति स्वयंको शरीर, ऊर्जा र व्यक्तित्वको प्रतीक हो भने मङ्गल अग्नि तत्त्व, साहस, सेना र रक्तको कारक हो। सारावली अनुसार लग्नको मङ्गलले जातकलाई राजा जस्तै उदार, वाग्मी र रणधीर बनाउँछ। फलदीपिका र होरासारले शारीरिक रूपमा चोटपटकको दाग वा अग्नि/अस्त्रबाट हुनसक्ने क्षतिको सङ्केत गर्छन्। यदि मङ्गल मेष, वृश्चिक वा मकर (स्वगृही/उच्च) मा छ भने 'रुचक नामको महापुरुष योग' बन्दछ, जसले जातकलाई सेना, प्रहरी, शल्यक्रिया वा नेतृत्व क्षेत्रमा उच्च पद र अभूतपूर्व कीर्ति प्रदान गर्दछ।",
            "With Mars in the 1st house (Lagna), the native is highly bold, powerful, radiant, steadfast in battle, industrious and valorous. There can be scars or injuries on the body, a hot temper, bile disorders, childhood health trouble, and restlessness — yet the native achieves great honor and success through their own valor and courage. The Lagna represents the native's body, energy and personality, while Mars governs fire, courage, the military and blood. Per Saravali, Mars in the Lagna makes the native generous like a king, eloquent, and steadfast in battle. Phaladeepika and Horasara indicate physical scarring or injury from fire or weapons. If Mars is in Aries, Scorpio or Capricorn (own/exalted sign), it forms the 'Ruchaka' Mahapurusha yoga, granting a high position and extraordinary fame in the military, police, surgery, or leadership.",
        ),
    },
    2: {
        "entries": [
            citation("सारावली", "धनस्थे मङ्गले जातो धनधान्यविवर्जितः।\nकुवाग्यतो निष्ठुरश्च परान्ननिरतो भवेत्॥"),
            citation("फलदीपिका", "कुरूपः सुकविः स्वल्पविद्यालाभो धनच्युतः।\nद्वितीयस्थे धरापुत्रे प्रतिकूलवाग् निरपत्यकः॥"),
            citation("होरासार", "धनगे बहुव्ययार्तो विकृताङ्गो निष्ठुरोक्तिमान् प्रोक्तः।\nभ्रातृद्वेषी सहजे क्लेशात् सम्प्राप्तवित्तवान् सुभगः॥"),
            citation("जातक पारिजात", "द्वितीये भूमिजे जातो धनहीनः कुवाग्यतः।\nनिष्ठुरः पापकृद् वापि परभाग्योपजीवकः॥"),
        ],
        **summary(
            "द्वितीय भाव (धन र वाणी) मा मङ्गल रहँदा जातकको वाणीमा कठोरता/कटुता (निष्ठुरोक्ति), धन सञ्चयमा समस्या, परिवारसँग मतभेद र व्यर्थको खर्च हुनसक्छ। जातकको विद्या वा धनार्जनमा संघर्ष भए तापनि कडा परिश्रम, प्राविधिक/भूमि सम्बन्धी कार्य वा साहसिक प्रयासबाट धन प्राप्त हुन्छ।",
            "द्वितीय भाव वाणी, कुटुम्ब र सञ्चित धनको घर हो। मारक ग्रह मङ्गल यहाँ बस्दा वाणीमा उग्रता र तीक्ष्णता ल्याउँछ। सारावली र फलदीपिका अनुसार द्वितीय मङ्गलले पारिवारिक सुखमा बाधा र सञ्चित धनमा खर्च गराउँछ। होरासारले भ्रातृ विरोध वा खर्च बढी हुने सङ्केत गर्छ। यद्यपि यदि मङ्गल स्वगृही (मेष/वृश्चिक) वा उच्च (मकर) छ भने जातकले भूमि, निर्माण, धातु वा इन्जिनियरिङ व्यवसायबाट प्रचुर धन आर्जन गर्दछ। जातकले वाणीमा संयम राख्नु हितकर हुन्छ।",
            "With Mars in the 2nd house (wealth and speech), the native's speech can turn harsh, wealth accumulation can suffer, there can be family discord, and wasteful spending. Though education or earning may involve struggle, wealth still comes through hard work, technical/land-related work, or bold ventures. The 2nd house is the house of speech, family and accumulated wealth. Mars, a marака graha here, brings harshness and sharpness to speech. Per Saravali and Phaladeepika, Mars in the 2nd obstructs family happiness and drains accumulated wealth. Horasara indicates sibling conflict or excessive spending. However, if Mars is in its own sign (Aries/Scorpio) or exalted (Capricorn), the native earns abundant wealth through land, construction, metals, or engineering. The native benefits from restraint in speech.",
        ),
    },
    3: {
        "entries": [
            citation("सारावली", "सहजस्थे धरापुत्रे विक्रमी गुणवान् सुखी।\nशूरः पराक्रमी श्रीमान् जनपूज्यो भवेन्नरः॥"),
            citation("फलदीपिका", "गुणवान् विक्रमी मानी प्राप्तसौख्यः प्रतापेढ्यः।\nसहजे मङ्गले जातो भ्रातृहीनश्च जायते॥"),
            citation("होरासार", "भ्रातृद्वेषी सहजे क्लेशात् सम्प्राप्तवित्तवान् सुभगः।\nशौर्येण लब्धकीर्तिश्च तेजस्वी शत्रुनाशनः॥"),
            citation("जातक पारिजात", "सहजे भूमिजे शूरो दीर्घायुः कान्तिमान् सुखी।\nभ्रातृशोकसमायुक्तो बहुमित्रसमन्वितः॥"),
        ],
        **summary(
            "तृतीय भावमा मङ्गल अत्यन्त शुभ र शक्तिशाली मानिन्छ। यस स्थानमा मङ्गल हुँदा जातक अत्यन्त पराक्रमी, गुणवान्, तेजस्वी, दीर्घायु, शत्रुहन्ता र आफ्नो पराक्रमबाट धन तथा कीर्ति आर्जन गर्ने हुन्छ। यद्यपि दाजुभाइहरूसँग वैचारिक मतभेद वा भ्रातृकष्ट हुनसक्छ।",
            "तृतीय भाव उपचय र पराक्रमको स्थान हो। पापग्रह मङ्गल यहाँ बस्दा आफ्नो कारकत्व (साहस, हिम्मत, ऊर्जा) को पूर्ण प्रस्फुटन गराउँछ। सारावली, फलदीपिका र जातक पारिजात अनुसार तृतीयको मङ्गलले जातकलाई कहिल्यै नझुक्ने हिम्मत, खेलकुद, सेना वा साहसिक क्षेत्रमा उच्च सफलता दिन्छ। होरासार अनुसार जातकले आफ्नै बलबुत्तामा साम्राज्य खडा गर्छ। केवल भ्रातृ स्थान भएकाले दाजुभाइहरूसँगको सम्बन्धमा केही तनाव वा दूरी रहनसक्छ।",
            "Mars in the 3rd house is considered highly auspicious and powerful. It makes the native very valorous, virtuous, radiant, long-lived, victorious over enemies, and earning wealth and fame through their own valor. There can, however, be discord with, or hardship regarding, siblings. The 3rd house is an upachaya house of valor. A malefic like Mars here fully manifests its own significations of courage, boldness and energy. Per Saravali, Phaladeepika and Jataka Parijata, Mars in the 3rd grants unyielding courage and great success in sports, the military, or bold ventures. Per Horasara, the native builds an empire through their own strength. Only the house of siblings sees some tension or distance in that relationship.",
        ),
    },
    4: {
        "entries": [
            citation("सारावली", "सुखस्थे मङ्गले जातो बन्धुहीनो दुरात्मवान्।\nगृहवाहनादिरहितः मातृहीनो दुःखी भवेत्॥"),
            citation("फलदीपिका", "सुहृन्मातृभूमिगृहापत्यहीनो महारोगवान्।\nचतुर्थे धरापुत्रे भवेत् क्लेशभाजनः॥"),
            citation("होरासार", "परगृहसंश्रयशीलो रोगी सुखगे धनान्वितो भौमे।\nबन्धुसुहृद्विरहितः चञ्चलचित्तश्च जायते॥"),
            citation("जातक पारिजात", "चतुर्थगे धरापुत्रे मातृशोकसमन्वितः।\nगृहादि सुखहीनश्च परदेशरतः सुखी॥"),
        ],
        **summary(
            "चौथो भावमा मङ्गल रहँदा गृहसुखमा कमी, आमाको स्वास्थ्यमा चिन्ता, मानसिक अशान्ति र आफन्तहरूसँग मतभेद गराउँछ। जातकले जन्मस्थान छाडेर टाढा वा परदेशमा बस्दा बढी सफलता पाउँछ।",
            "चतुर्थ भाव सुख, मन, आमा र भूमि/भवनको हो। चतुर्थमा क्रूर ग्रह मङ्गल चतुर्थ कुजदोष (माङ्गलिक योग) को कारक बन्दछ। यसले पारिवारिक जीवनमा तनाव उत्पन्न गराउन सक्छ। यद्यपि मङ्गल भूमिकारक भएकाले यदि स्वगृही वा उच्च छ भने जातकसँग ठूलो भूमि, अचल सम्पत्ति र भवन हुन्छ। जन्मस्थानभन्दा बाहिर वा विदेशी भूमिमा यस्तो मङ्गलले विशेष उन्नति दिन्छ।",
            "Mars in the 4th house reduces domestic comfort, brings worry over the mother's health, mental unrest, and discord with relatives. The native finds greater success leaving their birthplace to live far away or abroad. The 4th house governs comfort, the mind, the mother and land/home. A malefic like Mars here is a cause of the 4th-house Kuja dosha (Mangalik yoga), which can create tension in family life. However, since Mars is the natural karaka of land, if it is in its own sign or exalted, the native owns large tracts of land, property and buildings. Such a Mars grants special advancement outside the birthplace or on foreign soil.",
        ),
    },
    5: {
        "entries": [
            citation("सारावली", "पञ्चमे मङ्गले जातो सुतहीनो दुःखान्वितः।\nपिशुनो मन्दबुद्धिश्च चञ्चलो दुर्जनः भवेत्॥"),
            citation("फलदीपिका", "सुतहीनो धनरहितो दुर्जनश्चञ्चलो नरः।\nपञ्चमस्थे धरापुत्रे नृपकोपात् पीडितः॥"),
            citation("होरासार", "दुःखात्मको विशाल मेधावी पञ्चमेऽतितीक्ष्णकरः।\nमन्दसुतो धनहीनः क्रूरो जायते जनः॥"),
            citation("जातक पारिजात", "पञ्चमगे भूमिपुत्रे सुतशोकसमन्वितः।\nबुद्धिमान् साहसी चैव तीक्ष्णबुद्धिः प्रजायते॥"),
        ],
        **summary(
            "पञ्चम भावमा मङ्गल रहँदा जातक अत्यन्त तीक्ष्ण बुद्धिवाला र साहसी हुन्छ, तर सन्तान प्राप्तिमा ढिलाइ वा सन्तानसम्बन्धी चिन्ता हुनसक्छ। पेट वा पाचन प्रणालीमा उष्णता/समस्या र सेयर/सट्टाबाजीमा नोक्सानीको जोखिम रहन्छ।",
            "पञ्चम भाव बुद्धि, मन्त्र, सन्तान र पूर्वपुण्यको हो। मङ्गल जस्तो उष्ण ग्रह पञ्चममा बस्दा बुद्धिलाई अत्यन्त तीव्र र आक्रामक (तीक्ष्ण) बनाउँछ। होरासार र जातक पारिजात अनुसार जातक प्राविधिक र कूटनीतिक विषयमा चतुर हुन्छ। प्रथम सन्तान प्राप्तिमा केही कष्ट वा गर्भसम्बन्धी समस्या हुनसक्ने भएकाले सावधान रहनुपर्छ। शुभ ग्रहको दृष्टि भएमा जातकले इन्जिनियरिङ, प्रविधि वा प्रशासनिक परीक्षामा ठूलो सफलता प्राप्त गर्छ।",
            "With Mars in the 5th house, the native has a very sharp intellect and is bold, but there can be delay or worry regarding children. There can be heat-related stomach or digestive trouble, and a risk of loss through speculation. The 5th house governs intellect, mantra, children and past-life merit. A fiery graha like Mars here makes the intellect extremely sharp and aggressive. Per Horasara and Jataka Parijata, the native is clever in technical and strategic matters. Caution is needed around the first child, as there can be difficulty or pregnancy-related issues. If aspected by a benefic, the native achieves great success in engineering, technology, or competitive examinations.",
        ),
    },
    6: {
        "entries": [
            citation("सारावली", "जितशत्रुः प्रतापी च बलवान् कान्तिमान् सुखी।\nषष्ठे मङ्गले जातो राजा वा तत्समो भवेत्॥"),
            citation("फलदीपिका", "कामी बलवान् श्रीमान् नृपप्रतिभयान्वितः।\nषष्ठस्थे धरापुत्रे प्रसिद्धः सर्वपूजितः॥"),
            citation("होरासार", "प्रबलरिपुहन्ता शूरो बहुभुक सुरूपवान् धीरः।\nषष्ठे धरापुत्रे नृपतिसमः सम्प्रजायते॥"),
            citation("जातक पारिजात", "षष्ठे भूमिजे जातो रिपुहन्ता महाधनी।\nनीरोगो बलवान् शूरो लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "छैटौँ भावमा मङ्गल अत्यन्त श्रेष्ठ मानिन्छ। यहाँ स्थित मङ्गलले जातकलाई शत्रुहन्ता, अत्यन्त बलवान्, निरोगी, प्रतापी, धनवान् र राजकाज/प्रशासनमा राजा सरह सम्मान र अधिकार दिलाउँछ।",
            "छैटौँ भाव त्रिषडाय र उपचय स्थान हो, जहाँ पाप ग्रहहरूले अत्यन्त शुभ फल दिन्छन्। सारावली, फलदीपिका, होरासार र जातक पारिजात चारै ग्रन्थहरूले षष्ठ मङ्गलको एकै स्वरमा प्रशंसा गरेका छन्। यसले जातकका सम्पूर्ण शत्रु, ऋण र रोगलाई नष्ट गर्दछ। प्रतिस्पर्धात्मक परीक्षा, अदालत-मुद्दा, सेना, प्रहरी र शल्य चिकित्सा क्षेत्रमा जातक अभूतपूर्व सफल हुन्छ।",
            "Mars in the 6th house is considered excellent. Mars here makes the native an enemy-destroyer, extremely strong, healthy, powerful, wealthy, and honored with authority akin to a ruler in government or administration. The 6th is a trishadaya and upachaya house, where malefics give highly auspicious results. Saravali, Phaladeepika, Horasara and Jataka Parijata all praise Mars in the 6th with one voice. It destroys all the native's enemies, debts and diseases. The native achieves extraordinary success in competitive examinations, litigation, the military, police, and surgery.",
        ),
    },
    7: {
        "entries": [
            citation("सारावली", "भार्याहीनो दुःखी कृपणः परस्त्रीरतः सदा।\nसप्तमे मङ्गले जातो वञ्चको जनवर्जितः॥"),
            citation("फलदीपिका", "कलत्रनाशी कामी च विकलो दुःखितो नरः।\nसप्तमस्थे धरापुत्रे कुदारो विदेशगः॥"),
            citation("होरासार", "नष्टदारो दुःखी मन्दमतिः व्याधितश्च सप्तमगे।\nपरदेशरतः क्रूरो भौमे जातो न संशयः॥"),
            citation("जातक पारिजात", "सप्तमगे भूमिपुत्रे दारशोकसमन्वितः।\nविदेशगामी चतुरः साहसी च प्रजायते॥"),
        ],
        **summary(
            "सप्तम भावमा मङ्गल रहँदा दाम्पत्य जीवनमा तनाव, जीवनसाथीको स्वास्थ्यमा कष्ट वा विवाहमा ढिलाइ गराउन सक्छ (माङ्गल्य दोष)। जातक अत्यन्त कामुक, साहसी, कूटनीतिज्ञ र वैदेशिक व्यापार वा यात्रामा सफल हुने योग बन्दछ।",
            "सप्तम भाव विवाह र साझेदारको हो। मङ्गलको यहाँ उपस्थिति (सप्तम कुजदोष) ले जीवनसाथीसँग उग्रता र वैचारिक मतभेद उत्पन्न गराउँछ। सारावली र फलदीपिकाले दाम्पत्य सुखमा बाधाको सङ्केत गर्छन्। तर यदि मङ्गल स्वगृही (मेष/वृश्चिक) वा उच्च (मकर) छ वा शुभ ग्रहको दृष्टि छ भने जातकले व्यवसाय र वैदेशिक कार्यमा ठूलो सफलता प्राप्त गर्दछ।",
            "Mars in the 7th house can bring tension in married life, distress to the spouse's health, or delay in marriage (Mangalik dosha). The native tends to be passionate, bold, strategic, and successful in foreign trade or travel. The 7th house is the house of marriage and partnership. Mars's presence here (a 7th-house Kuja dosha) brings harshness and differences of opinion with the spouse. Saravali and Phaladeepika indicate obstacles to marital happiness. But if Mars is in its own sign (Aries/Scorpio) or exalted (Capricorn), or aspected by a benefic, the native achieves great success in business and foreign affairs.",
        ),
    },
    8: {
        "entries": [
            citation("सारावली", "अल्पायुः रोगपीडितः सर्वदा दुःखी जायते।\nअष्टमे मङ्गले जातो कुदारो जनवर्जितः॥"),
            citation("फलदीपिका", "अल्पायुः विकलाङ्गश्च निधनः पापकृत् सदा।\nअष्टमस्थे धरापुत्रे रोगार्तो नृपपीडितः॥"),
            citation("होरासार", "अल्पायुः रोगयुक्तश्च कुजगेऽष्टमे भवेत्।\nदुःखी कृपणः क्रूरो जनवर्जितश्च जायते॥"),
            citation("जातक पारिजात", "अष्टमगे भूमिजे जातो नयनरोगी दुरात्मवान्।\nस्वल्पायुश्च दरिद्रश्च पापकर्मा भवेन्नरः॥"),
        ],
        **summary(
            "अष्टम भावमा मङ्गल रहँदा स्वास्थ्यमा विशेष ध्यान दिनुपर्छ। यसले आँखा वा रक्तसम्बन्धी रोग, चोटपटकको भय र धन सञ्चयमा बाधा दिन सक्छ। तर गूढ ज्ञान, खोज, अनुसन्धान र गुप्त धन प्राप्तिका लागि यो अनुकूल रहन सक्छ।",
            "अष्टम भाव अष्टम कुजदोषको मुख्य घर हो। मङ्गल अष्टममा रहँदा अग्नि, वाहन वा अस्त्रबाट चोटपटक लाग्न सक्ने सम्भावना रहने हुँदा सावधानी अपनाउनुपर्छ। सारावली र फलदीपिका अनुसार यसले स्वास्थ्यमा उतारचढाव गराउँछ। यदि अष्टम मङ्गलमा शुभ ग्रहको दृष्टि छ वा मङ्गल स्वगृही छ भने जातकले गूढ विज्ञान, अनुसन्धान र बीमा/पैतृक सम्पत्तिबाट अचानक धन प्राप्त गर्दछ।",
            "Mars in the 8th house calls for special attention to health. It can cause ailments of the eyes or blood, fear of injury, and obstacles to accumulating wealth. It can, however, be favorable for occult knowledge, research and hidden wealth. The 8th house is the primary house of the 8th-house Kuja dosha. Mars here carries a risk of injury from fire, vehicles or weapons, calling for caution. Per Saravali and Phaladeepika, this causes fluctuating health. If the 8th-house Mars is aspected by a benefic, or is in its own sign, the native gains sudden wealth through occult science, research, or insurance/inheritance.",
        ),
    },
    9: {
        "entries": [
            citation("सारावली", "धर्महीनो दुःखी कृपणः पितृद्रोही भवेन्नरः।\nनवमे मङ्गले जातो हन्त सर्वजनप्रियः॥"),
            citation("फलदीपिका", "पितृहन्ता दुराचारो जनद्वेष्यो दयाहीनः।\nनवमस्थे धरापुत्रे हिंसापरो भवेत्॥"),
            citation("होरासार", "धर्मे प्रतापबहुलो धनधान्यसमन्वितो महोत्साही।\nपितृद्वेषी च नवमे भौमे जातो जनप्रभुः॥"),
            citation("जातक पारिजात", "नवमगे भूमिपुत्रे भाग्यहीनो दुरात्मवान्।\nविदेशगामी प्रतापी सुतवान् प्रजायते॥"),
        ],
        **summary(
            "नवम भावमा मङ्गल रहँदा बुबासँग वैचारिक मतभेद वा बुबाको स्वास्थ्यमा कष्ट हुनसक्छ। जातक अत्यन्त प्रतापी, महोत्साही, पराक्रमी, वैदेशिक यात्रामा सफल र आफ्नै प्रयासले भाग्य निर्माण गर्ने हुन्छ।",
            "नवम भाव धर्म, भाग्य र पिताको हो। यहाँ मङ्गलको उपस्थितिले परम्परागत धार्मिक मान्यतामा प्रश्न उठाउने वा आफ्नै तार्किक बाटो रोज्ने बनाउँछ। होरासार अनुसार नवम मङ्गलले जातकलाई अत्यन्त महोत्साही र जनप्रभु (नेता) बनाउँछ। विदेश यात्रा, सेना, कानून र प्रशासनिक क्षेत्रमा जातकले ठूलो उचाइ हासिल गर्दछ।",
            "Mars in the 9th house can bring differences of opinion with the father, or distress to the father's health. The native is highly powerful, enthusiastic, valorous, successful in foreign travel, and builds their own fortune through effort. The 9th house governs dharma, fortune and the father. Mars's presence here inclines the native to question traditional religious belief and follow their own reasoned path. Per Horasara, Mars in the 9th makes the native highly enthusiastic and a leader of people. The native reaches great heights in foreign travel, the military, law, and administration.",
        ),
    },
    10: {
        "entries": [
            citation("सारावली", "शूरश्चतुरः धीरश्च नृपमान्यो महाधनी।\nदशमे मङ्गले जातो राजा वा तत्समो भवेत्॥"),
            citation("फलदीपिका", "नृपप्रियः प्रतापी च यशस्वी सुतवान् धनी।\nदशमस्थे धरापुत्रे धीरः सर्वजनप्रियः॥"),
            citation("होरासार", "दशमे वित्ताधीशो दानपरो ज्ञानवान् यशस्वी च।\nमङ्गले सम्भवति नरो भूपतिसदृशो न संशयः॥"),
            citation("जातक पारिजात", "दशमगे भूमिपुत्रे प्रतापी नृपपूजितः।\nमहाधनी यशस्वी च लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "दशम भावमा मङ्गल (दिग्बली) अत्यन्त कुलदीपक र श्रेष्ठ मानिन्छ। यहाँ मङ्गल हुँदा जातक महाप्रतापी, चतुर, धीर, यशस्वी, राजा वा सरकारबाट सम्मानित, महाधनी र उच्च पदवी प्राप्त गर्ने हुन्छ।",
            "दशम भावमा मङ्गललाई पूर्ण दिग्बल प्राप्त हुन्छ। चारै ग्रन्थहरू (सारावली, फलदीपिका, होरासार, जातक पारिजात) ले दशम मङ्गलको मुक्तकण्ठले प्रशंसा गरेका छन्। यसले 'कुलदीपक योग' र 'रुचक योग' (यदि स्व/उच्च राशिमा भए) निर्माण गर्छ। जातक सरकार, सेना, प्रहरी, प्रशासनिक सेवा, शल्यचिकित्सा वा घरजग्गा व्यवसायमा सर्वोच्च शिखरमा पुग्छ।",
            "Mars in the 10th house — where it has directional strength — is considered exceptionally excellent, the pride of the family. Mars here makes the native greatly powerful, clever, steady, renowned, honored by the government, extremely wealthy, and holding a high position. Mars gains full directional strength in the 10th house. All four texts (Saravali, Phaladeepika, Horasara, Jataka Parijata) praise Mars in the 10th wholeheartedly. It forms the 'Kuladipaka yoga' and 'Ruchaka yoga' (if in its own/exalted sign). The native reaches the very peak in government, the military, police, administrative service, surgery, or real estate.",
        ),
    },
    11: {
        "entries": [
            citation("सारावली", "लाभस्थे मङ्गले जातो बह्वपत्यो महाधनी।\nनिरोगी गुणवान् शूरो यशस्वी जायते नरः॥"),
            citation("फलदीपिका", "धनाढ्यः सर्वसौख्याढ्यः पुत्रवान् धीरविक्रमः।\nएकादशे धरापुत्रे शोकहीनश्च जायते॥"),
            citation("होरासार", "लाभे बहुप्रकारैर्धनवान् वनितादृतः सुशीलश्च।\nभूमिजे भवति नरो नृपपूजितः सत्यसन्धश्च॥"),
            citation("जातक पारिजात", "एकादशगे भूमिजे जातो बहुलाभसमन्वितः।\nमहाप्रतापी सुतवान् दीर्घायुश्च सुखी भवेत्॥"),
        ],
        **summary(
            "एकादश भावमा मङ्गल हुनु अभूतपूर्व धनलाभको योग हो। यस स्थानमा मङ्गल हुँदा जातक सर्वसौख्याढ्य, महाधनी, निरोगी, धीर-विक्रमी, सुतवान्, दीर्घायु र अनेकौँ माध्यमबाट निरन्तर लाभ प्राप्त गर्ने हुन्छ।",
            "एकादश भाव इच्छा पूर्ति र लाभको उपचय स्थान हो। यहाँ मङ्गलको स्थितिले जातकका सम्पूर्ण आर्थिक आकाङ्क्षाहरू पूरा गराउँछ। होरासार अनुसार जातकले विभिन्न मार्गबाट धन आर्जन गर्छ। भूमि, भवन, प्रविधि र व्यवसायबाट निरन्तर नाफा मिल्छ। सन्तान सुख र दीर्घायुका लागि पनि यो placement अत्यन्त शुभ मानिन्छ।",
            "Mars in the 11th house is a yoga of extraordinary wealth gain. Mars here makes the native full of every comfort, extremely wealthy, healthy, steady and valorous, blessed with children, long-lived, and continuously gaining through many channels. The 11th house is the upachaya house of desire fulfilment and gains. Mars's placement here fulfils all the native's financial aspirations. Per Horasara, the native earns wealth through various means. Continuous profit comes from land, property, technology and business. This placement is also considered highly auspicious for the happiness of children and longevity.",
        ),
    },
    12: {
        "entries": [
            citation("सारावली", "व्ययस्थे मङ्गले जातो नेत्रातुरोऽल्पवित्तवान्।\nकुदारो जनवर्जितः पापकृद् दुःखी भवेत्॥"),
            citation("फलदीपिका", "नेत्ररोगी क्रूरमतिः भ्रातृघ्नो धनवर्जितः।\nद्वादशे धरापुत्रे पतितश्च जायते॥"),
            citation("होरासार", "व्ययगे भौमे नृशंसः कृपाविहीनो व्ययान्यस्तचण्डः।\nनेत्ररोगी चञ्चलश्च परदेशरतो भवेत्॥"),
            citation("जातक पारिजात", "द्वादशगे भूमिपुत्रे नेत्ररोगी दुरात्मवान्।\nव्ययशीलो विदेशस्थो लभते कष्टमुत्तमम्॥"),
        ],
        **summary(
            "द्वादश भावमा मङ्गल रहँदा खर्चमा वृद्धि, आँखामा समस्या वा दृष्टि दोष, र शयन सुखमा कमी हुन सक्छ (द्वादश कुजदोष)। यद्यपि वैदेशिक भूमिमा व्यापार, विदेशी सम्पर्क वा हस्पिटल/प्रहरी/सेना जस्ता क्षेत्रमा काम गर्दा यसले राम्रो सफलता दिन्छ।",
            "द्वादश भाव व्यय र विदेशको हो। मङ्गल यहाँ बस्दा आकस्मिक खर्च र आँखा वा टाउकोमा चोटपटकको योग बनाउँछ। होरासार र जातक पारिजात अनुसार स्वदेशमा भन्दा विदेशमा यस्तो जातक बढी सफल हुन्छ। यदि मङ्गल शुभ ग्रहबाट दृष्ट छ वा उच्च राशिमा छ भने जातकले विदेशी हस्पिटल, सेना वा आयात-निर्यात व्यवसायबाट ठूलो धन कमाउँछ।",
            "Mars in the 12th house can increase expenditure, cause eye or vision trouble, and reduce comfort of rest (a 12th-house Kuja dosha). Yet it grants good success in foreign trade, foreign contacts, or fields like hospitals, police, or the military. The 12th house governs expenditure and foreign lands. Mars here creates sudden expenses and a risk of injury to the eyes or head. Per Horasara and Jataka Parijata, such a native succeeds more abroad than at home. If Mars is aspected by a benefic or exalted, the native earns great wealth through foreign hospitals, the military, or import-export business.",
        ),
    },
}

JUPITER_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "दीर्घायुः बुद्धिमान् श्रीमान् कान्तिमान् मतिमान् सुखी।\nलग्ने देवगुरौ जातो रूपवान् जनपूजितः॥"),
            citation("फलदीपिका", "सुन्दरः धीरः दीर्घायुः निरोगी धर्मसंयुतः।\nलग्ने जीवे सुरूपश्च विद्वान् नृपप्रियः भवेत्॥"),
            citation("होरासार", "जीवोदये चिरायुज्ञानी सुखवान् न नीचराशिस्थे।\nधर्मस्थो भूपतिसदृशः कान्तिमान् जायते नरः॥"),
            citation("बृहत्पाराशर होराशास्त्र", "लग्ने जीवे सुकान्तिश्च ज्ञानवान् दीर्घजीविकः।\nसर्वशास्त्रप्रवेत्ता च जितशत्रुश्च मानवः॥"),
        ],
        **summary(
            "प्रथम भाव (लग्न) मा गुरु स्थित हुनु अत्यन्त दिव्य र शुभ मानिन्छ। यहाँ गुरु रहँदा जातक सुन्दर, धीर, दीर्घायु, निरोगी, परम ज्ञानी, धर्मपरायण, सर्वशास्त्रवेत्ता, राजा वा सरकारबाट सम्मानित र शत्रुमाथि विजय प्राप्त गर्ने हुन्छ। (यदि गुरु नीच राशि मकरमा छैन भने)।",
            "लग्नमा गुरु हुनुलाई ज्योतिषमा 'लाखौँ दोष निवारण गर्ने' कारक मानिन्छ। गुरु लग्नमा दिग्बली हुन्छ। सारावली र पराशर अनुसार यसले जातकलाई उच्च व्यक्तित्व, गम्भीर सोच र निष्कलंक प्रतिष्ठा दिन्छ। यदि धनु, मीन वा कर्कट राशिमा लग्न गुरु छ भने 'हंस नामको महापुरुष योग' बन्दछ, जसले जातकलाई समाजमा सर्वोच्च गुरु, न्यायाधीश, मन्त्री वा विद्वान्‌को स्थान दिलाउँछ।",
            "Jupiter placed in the 1st house (Lagna) is considered highly divine and auspicious. Jupiter here makes the native handsome, steady, long-lived, healthy, deeply wise, devout, versed in every scripture, honored by the state, and victorious over enemies (provided Jupiter is not in its debilitation sign, Capricorn). Jupiter in the Lagna is considered, in astrology, a factor that 'removes countless afflictions.' Jupiter has directional strength in the Lagna. Per Saravali and Parashara, it gives the native a commanding presence, serious thinking, and spotless reputation. If the Lagna Jupiter is in Sagittarius, Pisces or Cancer, it forms the 'Hamsa' Mahapurusha yoga, granting the native the position of a supreme teacher, judge, minister or scholar in society.",
        ),
    },
    2: {
        "entries": [
            citation("सारावली", "धनवान् मधुरभाषी सर्वजनप्रियः सुखी।\nधनस्थे देवगुरौ जातो भोजनसौख्यान्वितः॥"),
            citation("फलदीपिका", "वाग्मी भोजनसौख्याढ्यो धनवान् सुमुखो नरः।\nद्वितीये देवपूज्ये तु शास्त्रज्ञो जनपूजितः॥"),
            citation("होरासार", "धनगे धनी सुवक्ता दयापरो देवतार्चनाभिरतः।\nविद्वान् सुखी सुकान्तिः जीवे धनगे प्रजायते॥"),
            citation("जातक पारिजात", "द्वितीये देवगुरौ जातो धनधान्यसमन्वितः।\nमिष्टान्नभोजी सुमुखो वाग्मी पंडितपूजितः॥"),
        ],
        **summary(
            "द्वितीय भाव (धन र वाणी) मा गुरु रहँदा जातक अत्यन्त मीठो र प्रभावकारी बोल्ने (मधुरभाषी/वाग्मी), विशाल धन र सम्पत्तिको मालिक, उत्तम मिष्टान्न भोजन पाउने, धार्मिक र विद्वान्‌हरूबाट सम्मानित हुने हुन्छ।",
            "द्वितीय भाव वाणी र सञ्चित धनको घर हो भने गुरु धन र ज्ञानको कारक ग्रह हो। यहाँ गुरुको उपस्थिति हुनु भनेको वाणीमा सरस्वतीको वास हुनु र धन सञ्चय निरन्तर वृद्धि हुनु हो। चारै ग्रन्थहरू (सारावली, फलदीपिका, होरासार, जातक पारिजात) ले द्वितीय गुरुलाई धनधान्य र मिष्टान्न भोजनको कारक मानेका छन्। जातकले बैंक, वित्त, अध्यापन, कानून वा धार्मिक क्षेत्रबाट प्रचुर धन आर्जन गर्दछ।",
            "With Jupiter in the 2nd house (wealth and speech), the native speaks sweetly and persuasively, owns vast wealth and property, enjoys fine sweets, and is honored by the pious and the learned. The 2nd house is the house of speech and accumulated wealth, and Jupiter is the karaka of wealth and knowledge. Jupiter's presence here means eloquence dwells in the native's speech and their savings keep growing. All four texts (Saravali, Phaladeepika, Horasara, Jataka Parijata) consider Jupiter in the 2nd a cause of wealth, grain and fine food. The native earns abundant wealth through banking, finance, teaching, law, or religious work.",
        ),
    },
    3: {
        "entries": [
            citation("सारावली", "भ्रातृहीनः कृपणश्च मन्दबुद्धिश्च पापकृत्।\nसहजस्थे देवगुरौ जातो जनद्वेष्यो भवेत्॥"),
            citation("फलदीपिका", "कृपणो विक्रमी मानी भ्रातृहीनः सुतवान् धनी।\nसहजे देवपूज्ये तु कुबुद्धिश्च प्रजायते॥"),
            citation("होरासार", "दुःशीलो धनहीनो दुश्चिक्ये भ्रातृबन्धुदोषकरः।\nजीवे जातो नरो नित्यं परकार्यपर भवेत्॥"),
            citation("जातक पारिजात", "सहजे देवगुरौ जातो भ्रातृसुखविवर्जितः।\nकृपणो बुद्धिहीनश्च लभते कष्टमुत्तमम्॥"),
        ],
        **summary(
            "तृतीय भावमा गुरु रहँदा जातक केही कञ्जुस (कृपण), स्वाभिमानी र आफ्नै सोच अनुसार चल्ने हुन्छ। दाजुभाइहरूसँगको सुखमा केही कमी वा मतभेद हुनसक्छ। यद्यपि जातक धार्मिक कार्य, अध्ययन र परोपकारमा संलग्न हुन्छ।",
            "तृतीय भाव पराक्रम र दाजुभाइको हो। शुभ ग्रह गुरु तृतीयमा बस्दा जातकलाई शान्त र सौम्य बनाउँछ, जसले गर्दा भौतिक आक्रामकता केही कम हुनसक्छ। सारावली र फलदीपिकाले यसलाई भ्रातृ सुखका लागि केही चुनौतीपूर्ण मानेका छन्। तर जातक बुद्धिमान्, लेखक, सम्पादक र धार्मिक सञ्चारमा सफल हुन्छ।",
            "With Jupiter in the 3rd house, the native tends to be somewhat frugal, self-respecting, and follows their own thinking. There can be some reduction in, or friction with, sibling happiness. However, the native engages in religious work, study, and charity. The 3rd house is the house of valor and siblings. A benefic like Jupiter here makes the native calm and gentle, which can somewhat reduce physical aggression. Saravali and Phaladeepika consider this somewhat challenging for sibling happiness. But the native succeeds as a scholar, writer, editor, and in religious communication.",
        ),
    },
    4: {
        "entries": [
            citation("सारावली", "मातृमान्यो गृही श्रीमान् वाहनैः सहितः सुखी।\nसुखस्थे देवगुरौ जातो बन्धुमान्यो महाधनी॥"),
            citation("फलदीपिका", "सुखी मातुरपत्यस्य बन्धुवाहनसम्पदः।\nचतुर्थे देवपूज्ये तु लभते स्थानमुत्तमम्॥"),
            citation("होरासार", "सुखगे सुखी सुदारो भोक्तासनयानवाहनाध्यक्षः।\nजीवे सम्भवति नरो बन्धुप्रियः सत्यसन्धश्च॥"),
            citation("जातक पारिजात", "चतुर्थगे सुरगुरौ मातृसौख्यसमन्वितः।\nगृहवाहनसम्पन्नो लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "चौथो भावमा गुरु रहँदा जातकले आमाको पूर्ण माया, भव्य गृह, भूमि, वाहन, आफन्तहरूको साथ र उच्च मानसिक शान्ति प्राप्त गर्दछ। जातक समाजमा अत्यन्त प्रतिष्ठित र उच्च स्थान प्राप्त गर्ने हुन्छ।",
            "चतुर्थ भाव सुख, गृह र आमाको हो। यहाँ गुरु बस्दा घरमा धार्मिक र आध्यात्मिक वातावरण रहन्छ। सारावली, फलदीपिका, होरासार र जातक पारिजात चारै ग्रन्थहरूले चतुर्थ गुरुलाई उत्तम गृह, सवारी साधन र मातृ सुखको कारक भनेका छन्। जातकको उच्च शिक्षा राम्रो हुन्छ र उसले अचल सम्पत्तिबाट ठूलो लाभ पाउँछ।",
            "With Jupiter in the 4th house, the native receives the mother's full affection, a grand home, land, vehicles, the company of relatives, and deep peace of mind. The native attains high standing and prestige in society. The 4th house governs comfort, home and the mother. Jupiter here maintains a religious and spiritual atmosphere at home. All four texts (Saravali, Phaladeepika, Horasara, Jataka Parijata) consider Jupiter in the 4th a cause of a fine home, vehicles, and maternal happiness. The native's higher education goes well, and they gain greatly from real estate.",
        ),
    },
    5: {
        "entries": [
            citation("सारावली", "सुतवान् बुद्धिमान् विद्वान् मन्त्री नृपप्रियः सदा।\nपञ्चमे देवगुरौ जातो तेजस्वी जनपूजितः॥"),
            citation("फलदीपिका", "सुतवान् बुद्धिमान् विद्वान् मन्त्री नृपप्रियः सदा।\nपञ्चमस्थे देवगुरौ लभते ज्ञानमुत्तमम्॥"),
            citation("होरासार", "सत्सुतदारः सुभगो मेधावी वाक्पटुश्च बुद्धिस्थे।\nजीवे जातो नरो मानी विद्वान् नृपमन्त्री भवेत्॥"),
            citation("जातक पारिजात", "पञ्चमगे सुरगुरौ बहुपुत्रसमन्वितः।\nमन्त्री विद्वान् प्रतापी च लभते ज्ञानमुत्तमम्॥"),
        ],
        **summary(
            "पञ्चम भावमा गुरु हुनु महाभाग्यको सङ्केत हो। यहाँ गुरु रहँदा जातक उत्तम सन्तान (सुपुत्र) बाट युक्त, अत्यन्त बुद्धिमान्, विद्वान्, राजा वा सरकारको मन्त्री/सलाहकार, वाक्पटु र उच्च ज्ञान प्राप्त गर्ने हुन्छ।",
            "पञ्चम भाव पूर्वपुण्य, बुद्धि र सन्तानको हो। पञ्चममा ज्ञानकारक गुरु रहँदा जातकको बुद्धि अत्यन्त सात्त्विक, दूरदर्शी र मन्त्र-सिद्धिदायक हुन्छ। सारावली र फलदीपिका अनुसार जातक उच्च प्रशासनिक पद, मन्त्री वा ठूलो संस्थाको प्रमुख बन्छ। सन्तानबाट उच्च सुख र मान-प्रतिष्ठा मिल्दछ।",
            "Jupiter in the 5th house signals great fortune. Jupiter here blesses the native with excellent children, great intelligence, learning, a position as minister or advisor to a ruler or government, eloquence, and high wisdom. The 5th house governs past-life merit, intellect and children. Jupiter, the karaka of wisdom, here makes the intellect deeply sattvic, far-sighted, and capable of mantra siddhi. Per Saravali and Phaladeepika, the native becomes a high administrator, minister, or head of a large institution. Great happiness and honor come through children.",
        ),
    },
    6: {
        "entries": [
            citation("सारावली", "रिपुहन्ता अलसो नम्रः कूटकृद् धर्मवर्जितः।\nषष्ठे देवगुरौ जातो मन्त्रयन्त्रविशारदः॥"),
            citation("फलदीपिका", "शत्रुघ्नो मन्दबुद्धिश्च कूटकृत् चतुरः सुखी।\nषष्ठस्थे देवगुरौ जातो नृपमन्त्री प्रजायते॥"),
            citation("होरासार", "अरिगे शत्रुविहीनो नृपस्य मन्त्री नयान्वितो जीवे।\nजितशत्रुः सुप्रसिद्धो लभते जयमुत्तमम्॥"),
            citation("जातक पारिजात", "षष्ठे देवगुरौ जातो जितशत्रुः सुकीर्तिमान्।\nनीरोगो बलवान् शूरो लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "छैटौँ भावमा गुरु रहँदा जातकका सम्पूर्ण शत्रुहरू स्वतः परास्त हुन्छन् (शत्रुघ्न)। जातक राजा वा सरकारको नीतिगत मन्त्री/सलाहकार, नम्र, कूटनीतिज्ञ, निरोगी र न्यायप्रिय हुन्छ।",
            "छैटौँ भाव शत्रु र रोगको हो। यहाँ शुभ ग्रह गुरु बस्दा शत्रुहरू सम्झौता गर्न बाध्य हुन्छन् वा मित्रमा परिणत हुन्छन्। फलदीपिका र होरासार अनुसार जातक आफ्नो बुद्धि र कूटनीतिका बलमा शत्रुमाथि विजय प्राप्त गर्छ। कानून, प्रशासन र स्वास्थ्य क्षेत्रमा जातकले ठूलो सफलता हासिल गर्छ।",
            "With Jupiter in the 6th house, all the native's enemies are automatically defeated. The native becomes a policy advisor or minister to a ruler or government, humble, diplomatic, healthy, and just. The 6th house governs enemies and disease. A benefic like Jupiter here forces enemies into compromise or turns them into friends. Per Phaladeepika and Horasara, the native triumphs over enemies through intellect and diplomacy. The native achieves great success in law, administration, and healthcare.",
        ),
    },
    7: {
        "entries": [
            citation("सारावली", "सुभगः सुकलत्रश्च श्रीमान् अतिमतिमान् सुखी।\nसप्तमे देवगुरौ जातो सुतवान् जनपूजितः॥"),
            citation("फलदीपिका", "शोभनस्त्रीपुत्रयुक्तः कामी मन्त्री नृपप्रियः।\nसप्तमस्थे देवगुरौ लभते धनमुत्तमम्॥"),
            citation("होरासार", "शुभदारपुत्रयुक्तो जामित्रे पूर्वतोऽधिको विद्वान्।\nजीवे जातो नरो श्रीमान् लभते सुखमुत्तमम्॥"),
            citation("जातक पारिजात", "सप्तमगे सुरगुरौ अतिसुन्दरदारवान्।\nविद्वान् सुखी प्रतापी च लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "सप्तम भावमा गुरु हुनु अत्यन्त सुखी दाम्पत्य जीवनको प्रतीक हो। यहाँ गुरु रहँदा जातकले अत्यन्त सुन्दरी, गुणी र सुलक्षणा पत्नी/पति पाउँछ। जातक स्वयं विद्वान्, मन्त्री, समृद्धशाली, पुत्रवान् र समाजमा पूजित हुन्छ।",
            "सप्तम भाव विवाह र व्यापारिक साझेदारको हो। यहाँ गुरुको उपस्थिति हुनु भनेको जीवनसाथी ज्ञानी, धार्मिक र सम्भ्रान्त परिवारको हुनु हो। सारावली, फलदीपिका, होरासार र जातक पारिजात चारै ग्रन्थहरूले सप्तम गुरुलाई वैवाहिक सुख र व्यापारिक समृद्धिको लागि सर्वोत्तम मानेका छन्। जातकको विवाहपछि भाग्य उदय हुन्छ।",
            "Jupiter in the 7th house is a symbol of an exceptionally happy married life. Jupiter here brings the native a very beautiful, virtuous, and well-endowed spouse. The native themselves is learned, ministerial in stature, prosperous, blessed with children, and respected in society. The 7th house governs marriage and business partnership. Jupiter's presence here means the spouse is wise, religious, and from a distinguished family. All four texts (Saravali, Phaladeepika, Horasara, Jataka Parijata) consider Jupiter in the 7th ideal for marital happiness and business prosperity. The native's fortune rises after marriage.",
        ),
    },
    8: {
        "entries": [
            citation("सारावली", "दीर्घायुः सुखी धीरः भूपालः स्थिरसम्पदः।\nअष्टमे देवगुरौ जातो लभते सिद्धिमुत्तमाम्॥"),
            citation("फलदीपिका", "अल्पायुः नीचकर्मा च नीचगामी जितेन्द्रियः।\nअष्टमस्थे देवगुरौ गृही वा न भवेत् सुखी॥"),
            citation("होरासार", "चिरजीवी निधनस्थे भूपालो ज्ञानवान् गतारिगणः।\nअष्टमगे सुरगुरौ लभते स्थानमुत्तमम्॥"),
            citation("जातक पारिजात", "अष्टमगे सुरगुरौ दीर्घायुः स्थिरसम्पदः।\nगूढज्ञानी सुखी धीरो लभते सिद्धिमुत्तमाम्॥"),
        ],
        **summary(
            "अष्टम भावमा गुरु रहँदा जातक दीर्घायु, धीर, गूढ ज्ञान (ज्योतिष/अध्यात्म) को ज्ञाता, जितेन्द्रिय र स्थिर सम्पत्तिको मालिक हुन्छ। केही परिस्थितिमा गृहसुखमा उदासीनता हुनसक्छ, तर आध्यात्मिक दृष्टिले यो placement सिद्धिकारक मानिन्छ।",
            "अष्टम भाव आयु र गूढ रहस्यको हो। यहाँ गुरु बस्दा जातकलाई अकाल मृत्युबाट बचाउँछ र दीर्घायु प्रदान गर्दछ (होरासार र जातक पारिजात)। जातकले गुप्त धन, बीमा, वा पैतृक सम्पत्ति प्राप्त गर्छ। गूढ शास्त्र, अनुसन्धान र वेद-वेदान्तको अध्ययनमा जातकको गहिरो रुचि रहन्छ।",
            "With Jupiter in the 8th house, the native is long-lived, steady, versed in occult knowledge (astrology/spirituality), self-controlled, and owns stable assets. There can, in some circumstances, be indifference to domestic comfort, but spiritually this placement is considered one of accomplishment. The 8th house governs longevity and hidden mysteries. Jupiter here protects the native from untimely death and grants long life (per Horasara and Jataka Parijata). The native gains hidden wealth, insurance, or inheritance. The native takes a deep interest in occult scripture, research, and the study of the Vedas and Vedanta.",
        ),
    },
    9: {
        "entries": [
            citation("सारावली", "धर्मिष्ठः सुतवान् श्रीमान् सर्वपूज्यो महाधनी।\nनवमे देवगुरौ जातो राजा वा तत्समो भवेत्॥"),
            citation("फलदीपिका", "धर्मिष्ठः पुत्रवान् श्रीमान् विख्यातश्च महीपतिः।\nनवमस्थे देवगुरौ लभते भाग्यमुत्तमम्॥"),
            citation("होरासार", "बहुभाग्युतो धीमांस्तेजस्वी धर्मवान् धनी धर्मे।\nजीवे जातो नरो नित्यं देवब्राह्मणपूजकः॥"),
            citation("जातक पारिजात", "नवमगे सुरगुरौ महाभाग्यसमन्वितः।\nधर्मिष्ठः पुत्रवान् श्रीमान् लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "नवम भाव (भाग्य) मा गुरु हुनु सर्वाधिक शुभ योग हो। यहाँ गुरु रहँदा जातक परम धर्मिष्ठ, महाभाग्यशाली, सुतवान्, राजा वा सरकारबाट सम्मानित, सर्वपूज्य र महाधनी हुन्छ।",
            "नवम भाव धर्म र भाग्यको कारक घर हो भने गुरु त्यस भावको नैसर्गिक कारक हो। कारक ग्रह आफ्नै कारक भावमा बस्दा जातकको भाग्य चम्किन्छ। सारावली र फलदीपिका अनुसार जातक धार्मिक तीर्थयात्रा, मन्दिर निर्माण र परोपकारमा प्रसिद्ध हुन्छ। गुरुको नवम स्थितिले जातकलाई जीवनका हरेक मोडमा ईश्वरीय कृपा र मार्गदर्शन दिलाउँछ।",
            "Jupiter in the 9th house (house of fortune) is the most auspicious yoga. Jupiter here makes the native deeply righteous, greatly fortunate, blessed with children, honored by the state, respected by all, and immensely wealthy. The 9th house is the karaka house of dharma and fortune, and Jupiter is that house's natural karaka — a karaka graha in its own karaka house makes the native's fortune shine. Per Saravali and Phaladeepika, the native becomes renowned for pilgrimage, temple-building, and charity. Jupiter's 9th-house placement brings divine grace and guidance at every turn of the native's life.",
        ),
    },
    10: {
        "entries": [
            citation("सारावली", "मन्त्री भूपालपूज्यश्च प्रतापी कीर्तिमान् धनी।\nदशमे देवगुरौ जातो लभते स्थानमुत्तमम्॥"),
            citation("फलदीपिका", "कर्मसिद्धो महाकीर्तिः धर्मवान् नृपपूजितः।\nदशमस्थे देवगुरौ लभते धनमुत्तमम्॥"),
            citation("होरासार", "विख्यातो दशमस्थे सत्कर्मरतो धनाधिनाथश्च।\nजीवे सम्भवति नरो नृपमन्त्री प्रजायते॥"),
            citation("जातक पारिजात", "दशमगे सुरगुरौ महाकर्मकरो धनी।\nधर्मवान् कीर्तिमांश्चैव राजा वा तत्समो भवेत्॥"),
        ],
        **summary(
            "दशम भावमा गुरु रहँदा जातक सत्कर्ममा निरत, महाकीर्तिवान्, राज्यमन्त्री वा उच्च अधिकारी, धर्मवान्, कर्मसिद्ध र ठूलो धन-वैभवको मालिक हुन्छ।",
            "दशम भाव कर्म र अधिकारको हो। दशममा गुरु रहँदा जातकले गर्ने हरेक कर्म न्यायपूर्ण, सात्त्विक र समाजोपयोगी हुन्छन्। फलदीपिका अनुसार जातक 'कर्मसिद्ध' बन्छ अर्थात् उसले हात हालेका कामहरू सफलतापूर्वक सम्पन्न हुन्छन्। शिक्षा, न्याय, वित्त र सरकारी प्रशासनमा जातकले उच्च नेतृत्व सम्हाल्छ।",
            "With Jupiter in the 10th house, the native is engaged in righteous work, greatly renowned, a state minister or high official, devout, successful in every undertaking, and owner of great wealth and splendor. The 10th house governs career and authority. Jupiter in the 10th makes every action the native undertakes just, sattvic and beneficial to society. Per Phaladeepika, the native becomes 'karma-siddha' — every task they take up is successfully completed. The native holds high leadership in education, justice, finance, and government administration.",
        ),
    },
    11: {
        "entries": [
            citation("सारावली", "लाभस्थे देवगुरौ जातो लब्धधनो बहुसुतो धनी।\nनिरोगी गुणवान् शूरो लभते लाभमुत्तमम्॥"),
            citation("फलदीपिका", "धनाढ्यः सुखी दीर्घायुः वाहनैश्च समन्वितः।\nएकादशे देवगुरौ बहुलाभप्रदो भवेत्॥"),
            citation("होरासार", "बहुविधलाभो लाभे कोशाधिपतिः कुलाधिको विद्वान्।\nजीवे जातो नरो नित्यं लभते धनमुत्तमम्॥"),
            citation("जातक पारिजात", "एकादशगे सुरगुरौ महालाभसमन्वितः।\nकोशाध्यक्षो धनी शूरो लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "एकादश भावमा गुरु हुनु अपार धन प्राप्तिको योग हो। यहाँ गुरु रहँदा जातक महाधनी, सुखी, दीर्घायु, सरकारी ढुकुटीको अध्यक्ष (कोशाध्यक्ष), वाहन सुखले युक्त र अनेकौँ स्रोतबाट लाभ पाउने हुन्छ।",
            "एकादश भाव लाभ र समृद्धिको हो। यहाँ गुरुको उपस्थिति हुनु भनेको जातकको धनको ढुकुटी कहिल्यै खाली नहुनु हो। होरासार र जातक पारिजातले जातकलाई 'कोशाधिपति' भनेका छन्। जातकका सन्तानहरू पनि अत्यन्त सफल र भाग्यशाली हुन्छन्।",
            "Jupiter in the 11th house is a yoga of immense wealth gain. Jupiter here makes the native greatly wealthy, happy, long-lived, a treasurer of state finances, endowed with vehicles, and gaining from many sources. The 11th house governs gains and prosperity. Jupiter's presence here means the native's treasury never runs empty. Horasara and Jataka Parijata call the native a 'koshadhipati' (treasurer/banker). The native's children are also highly successful and fortunate.",
        ),
    },
    12: {
        "entries": [
            citation("सारावली", "व्ययस्थे अमरेज्ये जातो दुराचारोऽल्पवित्तवान्।\nआलस्यभाक् दुःखी च परदेशरतो भवेत्॥"),
            citation("फलदीपिका", "वेदद्वेषी व्ययी दम्भः कृपणः पापकृत् सदा।\nद्वादशे देवपूज्ये तु पतितश्च प्रजायते॥"),
            citation("होरासार", "व्ययगे देवाचार्ये हीनाङ्गो धर्मनृत्यगतवित्तः।\nधार्मिकः परोपकारी च लभते मोक्षमुत्तमम्॥"),
            citation("जातक पारिजात", "द्वादशगे सुरगुरौ धर्मकार्यव्ययी सुखी।\nविदेशगामी ज्ञानवान् लभते मोक्षमुत्तमम्॥"),
        ],
        **summary(
            "द्वादश भावमा गुरु रहँदा जातक आफ्नो धन धार्मिक कार्य, यज्ञ, परोपकार र समाजसेवामा खर्च गर्दछ। जातक वैदेशिक भूमिमा बस्ने, मोक्षको अभिलाषी र आध्यात्मिक ज्ञानले पूर्ण हुन्छ।",
            "द्वादश भाव मोक्ष र व्ययको हो। यहाँ गुरुको स्थिति हुनु भनेको जातकको खर्च सधैँ शुभ र धार्मिक काममा हुनु हो (धर्मव्ययी)। होरासार र जातक पारिजात अनुसार द्वादश गुरुले जातकलाई जीवनको अन्त्यमा परम मोक्ष र सद्गति दिलाउँछ। विदेश यात्रा र अध्यात्मका लागि यो स्थान अत्यन्त फलदायी हुन्छ।",
            "With Jupiter in the 12th house, the native spends their wealth on religious works, rituals, charity and social service. The native tends to live abroad, aspires to liberation, and is full of spiritual knowledge. The 12th house governs liberation and expenditure. Jupiter's placement here means the native's spending is always directed toward auspicious, religious causes. Per Horasara and Jataka Parijata, Jupiter in the 12th grants the native supreme liberation and a good afterlife at the end of their days. This placement is highly fruitful for foreign travel and spirituality.",
        ),
    },
}

SATURN_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "स्वोच्चे स्वकीयभवने क्षितिपालतुल्यो लग्नेऽर्कजे भवति देशपुराधिनाथः।\nशेषेषु दुःखपरिपीड़ित एव बाल्ये दारिद्र्यदुःखवशगो मलि नोऽलसश्च॥"),
            citation("फलदीपिका", "लग्ने मन्दे स्वोच्चगते स्वगृहे वा राजा वा तत्समो भवेत्।\nअन्यराशौ व्याधितः दुःखार्तो बाल्यावस्थायां दरिद्रश्च॥"),
            citation("होरासार", "सौरोदयेऽतिरोगी बाल्ये मलि नोऽटनो नृशंसश्च।\nस्वोच्चे स्वकीयभवने कुलाधिको ज्ञानवान् नरेन्द्रधनी॥"),
            citation("बृहत्पाराशर होराशास्त्र", "लग्ने शनौ स्वोच्चगे वा स्वगृहे भूपालसम्भवः।\nअन्यराशौ स्थितो मन्दः बाल्ये रोगी दुःखी भवेत्॥"),
        ],
        **summary(
            "प्रथम भाव (लग्न) मा शनि यदि उच्च (तुला) वा स्वगृही (मकर/कुम्भ) छ भने जातक राजा वा देश/शहरको नायक (शश महापुरुष योग) बन्दछ। तर अन्य साधारण राशिमा भए बाल्यावस्थामा स्वास्थ्य कष्ट, आलस्य, रोग र सङ्घर्ष हुनसक्छ। उत्तरार्धमा जातक अत्यन्त गम्भीर, अनुभवी र प्रतापी हुन्छ।",
            "लग्नमा शनि ढिलाइ र अनुशासनको कारक हो। सारावली र फलदीपिका अनुसार शनि उच्च वा स्वगृही हुँदा 'शश योग' निर्माण भई जातकलाई उच्च राजनीतिक पद, नायकत्व र अपार सम्पत्ति दिन्छ। तर सामान्य राशिमा भए बाल्यावस्थामा शारीरिक कष्ट र गरिबी देखाए तापनि ३६ वर्षपछि जातकले स्थायित्व र ठूलो सफलता हासिल गर्छ।",
            "With Saturn in the 1st house (Lagna), if exalted (Libra) or in its own sign (Capricorn/Aquarius), the native becomes a ruler or a leading figure of a country or city (a 'Shasha' Mahapurusha yoga). In any other sign, however, there can be childhood health trouble, laziness, illness and struggle. In later life the native becomes deeply serious, experienced, and powerful. Saturn in the Lagna is the karaka of delay and discipline. Per Saravali and Phaladeepika, an exalted or own-sign Saturn forms the 'Shasha yoga', granting the native a high political position, leadership, and immense wealth. In an ordinary sign, though it shows physical hardship and poverty in childhood, the native achieves stability and great success after age 36.",
        ),
    },
    2: {
        "entries": [
            citation("सारावली", "विमुखमधनमर्थेऽन्यायवन्तं च पश्चादितरजनपदस्थं यानभोगार्थयुक्तम्।\nधनस्थे रविपुत्रे जातो वञ्चको जनवर्जितः॥"),
            citation("फलदीपिका", "विकृतमुखोऽधर्मरतः परदेशस्थः सुखी नृपधनी च।\nद्वितीये अर्कपुत्रे तु पश्चात् धनसमन्वितः॥"),
            citation("होरासार", "धनगे चञ्चलचित्तो न्यायविरुद्धोऽल्पवित्तवान् मन्दे।\nपरदेशे सम्प्राप्तधनः चतुरो भवति न संशयः॥"),
            citation("जातक पारिजात", "द्वितीये सूर्यपुत्रे तु धनहीनः कुवाग्यतः।\nपरदेशरतो धीरः पश्चाद् धनसमन्वितः॥"),
        ],
        **summary(
            "द्वितीय भावमा शनि रहँदा प्रारम्भिक जीवनमा धन सञ्चयमा सङ्घर्ष र वाणीमा कडापन/तीक्ष्णता हुनसक्छ। तर उमेर ढल्किँदै जाँदा (पश्चात्) वा परदेश/विदेशमा गएर जातकले न्यायपूर्ण वा प्राविधिक माध्यमबाट प्रचुर धन सञ्चय गर्दछ।",
            "द्वितीय भाव वाणी र सञ्चित धनको हो। शनि यहाँ बस्दा धनार्जनमा ढिलाइ गराउँछ तर ढिला भए पनि स्थायी धन दिन्छ। फलदीपिका र जातक पारिजात अनुसार 'पश्चात् धनसमन्वितः' अर्थात् जीवनको उत्तरार्धमा वा परदेशमा जातक धनी र सुखी बन्छ। धातु, भूमि, तेल, खानी र कडा परिश्रमबाट धन मिल्छ।",
            "With Saturn in the 2nd house, early life can involve struggle to accumulate wealth and harshness in speech. But as age advances, or after moving abroad, the native accumulates substantial wealth through just or technical means. The 2nd house governs speech and accumulated wealth. Saturn here delays wealth accumulation, but what comes, comes to stay. Per Phaladeepika and Jataka Parijata, the native becomes wealthy and happy 'later' — in the latter half of life or abroad. Wealth comes through metals, land, oil, mining, and hard labor.",
        ),
    },
    3: {
        "entries": [
            citation("सारावली", "शूरः पराक्रमी श्रीमान् भ्रातृहीनः सुतवान् धनी।\nसहजस्थे मन्दे जातो तेजस्वी जनपूजितः॥"),
            citation("फलदीपिका", "अतिबुद्धिमान् प्रतापी भ्रातृविहीनः सुखी शूरः।\nतृतीयस्थे सूर्यपुत्रे लभते जयमुत्तमम्॥"),
            citation("होरासार", "सहजे मन्दे शूरो प्रतापी सुतवान् धनी।\nभ्रातृशोकसमायुक्तः लभते स्थानमुत्तमम्॥"),
            citation("जातक पारिजात", "सहजे अर्कपुत्रे तु अतितेजस्वी सुतवान् धनी।\nभ्रातृहीनः पराक्रमी लभते विजयमुत्तमम्॥"),
        ],
        **summary(
            "तृतीय भावमा शनि अत्यन्त शुभ र शक्तिशाली मानिन्छ। यहाँ शनि रहँदा जातक अति बुद्धिमान्, प्रतापी, पराक्रमी, तेजस्वी, धनवान्, शत्रुमाथि विजय पाउने र दीर्घायु हुन्छ। यद्यपि दाजुभाइहरूसँगको सुखमा कमी हुनसक्छ।",
            "तृतीय भाव उपचय स्थान भएकाले पापग्रह शनि यहाँ बस्दा अत्यन्त अनुकूल फल दिन्छ। सारावली, फलदीपिका, होरासार र जातक पारिजात चारै ग्रन्थहरूले तृतीय शनिको भूरि-भूरि प्रशंसा गरेका छन्। यसले जातकलाई अद्भूत धैर्य, कडा परिश्रम गर्ने क्षमता, राजनीति वा संगठनमा उच्च सफलता दिन्छ।",
            "Saturn in the 3rd house is considered highly auspicious and powerful. Saturn here makes the native very intelligent, powerful, valorous, radiant, wealthy, victorious over enemies, and long-lived. There can, however, be reduced happiness from siblings. Since the 3rd is an upachaya house, a malefic like Saturn gives highly favorable results here. Saravali, Phaladeepika, Horasara and Jataka Parijata all praise Saturn in the 3rd extensively. It grants the native remarkable patience, capacity for hard work, and great success in politics or organizations.",
        ),
    },
    4: {
        "entries": [
            citation("सारावली", "मातृहीनो दुःखी कृपणः गृहवाहनादिरहितः।\nसुखस्थे मन्दे जातो चञ्चलो भयपीडितः॥"),
            citation("फलदीपिका", "मातृविहीनः सुहृद्विहीनो दुःखी गृहयानहीनश्च।\nचतुर्थे अर्कपुत्रे तु रोगार्तो दुरात्मवान्॥"),
            citation("होरासार", "सुखगे मन्दे दुःखी मातृविहीनश्च चञ्चलश्चैव।\nपरदेशवासी रोगी लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "चतुर्थगे अर्कपुत्रे तु मातृशोकसमन्वितः।\nगृहादि सुखहीनश्च परगेहवासी भवेत्॥"),
        ],
        **summary(
            "चौथो भावमा शनि रहँदा गृहसुख र मानसिक शान्तिमा कमी, आमाको स्वास्थ्यमा कष्ट, र जन्मस्थान छाडेर अन्यत्र वा अर्कैको घरमा (परगेहवासी) बस्नुपर्ने योग बन्दछ। यद्यपि शनि स्वगृही वा उच्च भए पुराना घर वा भूमिको ठूलो लाभ मिल्छ।",
            "चतुर्थ भाव मन र गृहसुखको हो। शनि चिसो र सुष्क ग्रह भएकाले चतुर्थमा बस्दा मनमा गम्भीरता र टोलाउने प्रवृत्ति दिन्छ। सारावली र फलदीपिका अनुसार यसले जन्मस्थानबाट टाढा लैजान्छ। तर यदि शनि तुला, मकर वा कुम्भ राशिमा छ भने जातकसँग ठूला-ठूला पुराना भवन, खानी र भूमिको स्वामित्व हुन्छ।",
            "With Saturn in the 4th house, there can be reduced domestic comfort and peace of mind, worry over the mother's health, and a yoga for leaving one's birthplace to live elsewhere or in another's house. However, if Saturn is in its own sign or exalted, there is great gain from old houses or land. The 4th house governs the mind and domestic comfort. Saturn, being a cold and dry graha, brings seriousness and brooding to the mind here. Per Saravali and Phaladeepika, this takes the native away from their birthplace. But if Saturn is in Libra, Capricorn or Aquarius, the native owns large, old buildings, mines, and land.",
        ),
    },
    5: {
        "entries": [
            citation("सारावली", "सुतहीनो दुःखार्तः मन्दबुद्धिश्च पापकृत्।\nपञ्चमे मन्दे जातो जनद्वेष्यो भवेत् सदा॥"),
            citation("फलदीपिका", "मन्दबुद्धिः सुतहीनः दरिद्रो दुःखी च चञ्चलो नरः।\nपञ्चमस्थे सूर्यपुत्रे लभते शोकमुत्तमम्॥"),
            citation("होरासार", "पञ्चमगे अर्कपुत्रे सुतहीनो दुःखी च निर्धनश्चैव।\nमन्दबुद्धिः कृपणश्च लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "पञ्चमगे मन्दे जातो सुतशोकसमन्वितः।\nविद्याहीनश्च चञ्चलो लभते दुःखमुत्तमम्॥"),
        ],
        **summary(
            "पञ्चम भावमा शनि रहँदा सन्तान प्राप्तिमा ढिलाइ वा सन्तानसम्बन्धी चिन्ता, विद्या प्राप्तिका क्रममा बाधा र मनमा गम्भीर/चिन्तित भाव हुनसक्छ। तर प्राविधिक, मन्त्र, दर्शन वा अनुसन्धानमूलक अध्ययनमा जातक सफल हुन्छ।",
            "पञ्चम भाव बुद्धि र सन्तानको हो। शनिले ढिलाइ गराउने हुँदा पञ्चमको शनिले सन्तान र शिक्षामा विलम्ब गराउँछ। सारावली र फलदीपिकाले यसलाई सन्तान सुखका लागि अध्ययन गर्नुपर्ने सङ्केत मानेका छन्। यदि शनिमा गुरुको दृष्टि छ वा शनि स्वगृही छ भने जातक मन्त्र शास्त्र, ज्योतिष, इन्जिनियरिङ र दर्शन शास्त्रको मर्मज्ञ बन्छ।",
            "With Saturn in the 5th house, there can be delay or worry regarding children, obstacles in education, and a serious, anxious cast of mind. But the native succeeds in technical study, mantra, philosophy, or research. The 5th house governs intellect and children. Since Saturn causes delay, Saturn in the 5th delays children and education. Saravali and Phaladeepika treat this as a signal to attend carefully to the matter of children's happiness. If Saturn is aspected by Jupiter, or is in its own sign, the native becomes an expert in mantra-shastra, astrology, engineering and philosophy.",
        ),
    },
    6: {
        "entries": [
            citation("सारावली", "बहुभुग् द्रविणान्वितो रिपुहतो धृष्टश्च मानी रिपौ।\nषष्ठे मन्दे जातो राजा वा तत्समो भवेत्॥"),
            citation("फलदीपिका", "महाकामी सुप्रतापी सर्वशत्रुविनाशनः।\nषष्ठस्थे सूर्यपुत्रे तु सुखी धीरो महाधनी॥"),
            citation("होरासार", "रिपुहन्ता षष्ठस्थे मन्दे शूरो प्रतापी सुतवान् धनी।\nनृपमान्यो महायोगी लभते स्थानमुत्तमम्॥"),
            citation("जातक पारिजात", "षष्ठे अर्कपुत्रे जातो जितशत्रुः महाधनी।\nनिरोगी बलवान् शूरो लभते विजयमुत्तमम्॥"),
        ],
        **summary(
            "छैटौँ भावमा शनि हुनु अत्यन्त श्रेष्ठ योग हो। यहाँ शनि रहँदा जातक महाप्रतापी, सम्पूर्ण शत्रुको नाश गर्ने (सर्वशत्रुविनाशनः), महाधनी, निरोगी, धीर, बलवान् र राजा वा सरकारबाट सम्मानित हुन्छ।",
            "छैटौँ भाव उपचय स्थान हो। यहाँ शनि बस्दा जातकलाई 'शत्रुहन्ता' बनाउँछ। सारावली, फलदीपिका, होरासार र जातक पारिजात चारै ग्रन्थहरूले षष्ठ शनिको उच्च प्रशंसा गरेका छन्। जातकले अदालत-मुद्दा, ऋण र रोगमाथि पूर्ण विजय पाउँछ। राजनीति, श्रम संगठन, कानून र प्रशासनिक क्षेत्रमा जातकले सर्वोच्च पद प्राप्त गर्दछ।",
            "Saturn in the 6th house is an excellent yoga. Saturn here makes the native greatly powerful, a destroyer of all enemies, immensely wealthy, healthy, steady, strong, and honored by the state or government. The 6th is an upachaya house. Saturn here makes the native an 'enemy-destroyer.' Saravali, Phaladeepika, Horasara and Jataka Parijata all praise Saturn in the 6th highly. The native gains complete victory in litigation, debt, and disease. The native attains the highest positions in politics, labor organizations, law, and administration.",
        ),
    },
    7: {
        "entries": [
            citation("सारावली", "कामस्थे रविजे कुदारनिरतो निःसबोध्वगो विह्वलः।\nसप्तमे मन्दे जातो वञ्चको जनवर्जितः॥"),
            citation("फलदीपिका", "कुदाररतः कृपणो मलिनः परदेशगो दुःखी।\nसप्तमस्थे अर्कपुत्रे लभते क्लेशमुत्तमम्॥"),
            citation("होरासार", "सप्तमगे मन्दे तु नष्टदारो दुःखी मन्दमतिः।\nपरदेशरतः क्रूरो लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "सप्तमगे अर्कपुत्रे तु वृद्धदाररतो भवेत्।\nविदेशगामी चतुरः लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "सप्तम भावमा शनि रहँदा विवाहमा ढिलाइ, जीवनसाथी उमेरमा अलि पाको वा गम्भीर स्वभावको हुने, र दाम्पत्य जीवनमा ढिलाइ गरी स्थायित्व आउने योग बन्दछ। जातक विदेश यात्रा वा व्यापारमा चतुर हुन्छ।",
            "सप्तम भाव विवाह र दिग्बलको घर हो। शनि दिग्बली हुने भाव भएकाले यहाँ शनि बलियो हुन्छ तर ढिलाइ गराउने स्वभावका कारण विवाह ३० वर्षपछि हुनु हितकर मानिन्छ। यदि शनि तुला, मकर वा कुम्भ राशिमा छ भने 'शश योग' बनेर जातकले वैदेशिक व्यापार, साझेदारी र राजनीतिमा ठूलो सफलता पाउँछ।",
            "With Saturn in the 7th house, marriage can be delayed, the spouse tends to be somewhat mature or serious in nature, and married life gains stability only after a slow start. The native is skilled in foreign travel or trade. The 7th house is the house of marriage and Saturn's directional strength. Since the 7th is Saturn's exaltation-house of directional strength, Saturn is strong here, but its delaying nature makes marriage after age 30 favorable. If Saturn is in Libra, Capricorn or Aquarius, it forms the 'Shasha yoga', and the native finds great success in foreign trade, partnerships, and politics.",
        ),
    },
    8: {
        "entries": [
            citation("सारावली", "शनैश्चरे मृतिस्थिते मलीमसोधशंसोडवसुः।\nकरालाक्षीक्षुधितः सुहृज्जनवमानितः॥"),
            citation("फलदीपिका", "मलीमसश्च कुष्ठी च अल्पायुः दुःखी च निर्धनः।\nअष्टमस्थे सूर्यपुत्रे लभते रोगमुत्तमम्॥"),
            citation("होरासार", "अष्टमगे सूर्यपुत्रे दीर्घायुः रोगयुक्तश्च।\nकृपणो मन्दबुद्धिश्च लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "अष्टमगे अर्कपुत्रे तु दीर्घायुः रोगपीडितः।\nगूढज्ञानी सुखी धीरः लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "अष्टम भावमा शनि रहँदा जातक दीर्घायु हुन्छ (शनि आयुको कारक भएकाले)। यद्यपि शारीरिक स्वास्थ्य (आँखा, पायल्स वा छालासम्बन्धी विषय) मा ध्यान दिनुपर्छ। जातक गूढ ज्ञान, रहस्यमयी विषय र पुरातत्त्वमा पोख्त हुन्छ।",
            "अष्टम भाव आयुको हो र शनि आयुको नैसर्गिक कारक हो। 'कारको भाव नाशाय' को अपवाद स्वरूप अष्टममा शनिले मानिसलाई दीर्घायु बनाउँछ (होरासार र जातक पारिजात)। होरासार अनुसार जातकले लामो उमेर पाउँछ। गुप्त विज्ञान, अनुसन्धान र पुराना वस्तु/खानीको अध्ययनमा जातक सफल हुन्छ।",
            "With Saturn in the 8th house, the native is long-lived (since Saturn is the karaka of longevity). Attention to physical health (eyes, piles, or skin-related matters) is needed. The native becomes skilled in occult knowledge, mysterious subjects, and antiquity. The 8th house governs longevity and Saturn is its natural karaka. As an exception to the rule that 'a karaka graha is weakened in its own significative house', Saturn in the 8th grants long life (per Horasara and Jataka Parijata). Per Horasara, the native attains a long lifespan. The native succeeds in occult science, research, and the study of antiques or mining.",
        ),
    },
    9: {
        "entries": [
            citation("सारावली", "धर्मस्थिते रविपुत्रे धर्महीनो दुःखी जायते।\nनवमे मन्दे जातो पितृद्रोही भवेन्नरः॥"),
            citation("फलदीपिका", "धर्महीनः दुःखी कृपणः पितृद्रोही पापकृत्।\nनवमस्थे अर्कपुत्रे लभते क्लेशमुत्तमम्॥"),
            citation("होरासार", "नवमे मन्दे धर्महीनः दुःखी च निर्धनश्चैव।\nपरदेशरतः क्रूरो लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "नवमगे अर्कपुत्रे तु पश्चाद् धर्मसमन्वितः।\nतीर्थाटनपरो धीरः लभते भाग्यमुत्तमम्॥"),
        ],
        **summary(
            "नवम भावमा शनि रहँदा प्रारम्भिक जीवनमा भाग्यमा विलम्ब वा बुबासँग मतभेद हुनसक्छ। तर जीवनको उत्तरार्धमा (पश्चात्) जातक अत्यन्त धार्मिक, तीर्थाटन गर्ने, गम्भीर, वैराग्यवान् र आफ्नै निरन्तर मेहनतले भाग्य चम्काउने हुन्छ।",
            "नवम भाव भाग्य र धर्मको हो। शनि यहाँ बस्दा परम्परागत अन्धविश्वासलाई मान्दैन, बरु व्यावहारिक र सामाजिक धर्ममा विश्वास गर्छ। जातक पारिजात अनुसार ३६ वर्षपछि जातकको भाग्य चम्किन्छ र उसले ठूला धार्मिक वा सामाजिक कार्यहरू सम्पन्न गर्छ।",
            "With Saturn in the 9th house, early life can involve delay in fortune or differences with the father. But in the latter half of life, the native becomes deeply religious, drawn to pilgrimage, serious, detached, and builds their fortune through sustained effort. The 9th house governs fortune and dharma. Saturn here does not accept traditional superstition, instead believing in practical, socially grounded dharma. Per Jataka Parijata, the native's fortune shines after age 36, and they accomplish great religious or social works.",
        ),
    },
    10: {
        "entries": [
            citation("सारावली", "कर्मस्थे रविजे नरो भवति नृपमन्त्री वा नेता।\nधनवान् सुखी प्रतापी लभते स्थानमुत्तमम्॥"),
            citation("फलदीपिका", "नृपमन्त्री चतुरश्च धीरो महाधनी यशस्वी।\nदशमस्थे अर्कपुत्रे लभते कर्मसिद्धिमुत्तमाम्॥"),
            citation("होरासार", "दशमगे अर्कपुत्रे नृपमन्त्री नेता चतुरश्चैव।\nमहाधनी प्रतापी च लभते स्थानमुत्तमम्॥"),
            citation("जातक पारिजात", "दशमगे सूर्यपुत्रे तु राजा वा तत्समो भवेत्।\nमहाकर्मकरो धनी लभते कीर्तिमुत्तमाम्॥"),
        ],
        **summary(
            "दशम भावमा शनि रहनु अत्यन्त उच्च पद र सफलताको प्रतीक हो। यहाँ शनि रहँदा जातक राज्यमन्त्री, ठूलो दल वा संस्थाको नेता, चतुर, धीर, महाधनी, कर्मसिद्ध र राजा सरह अधिकार पाउने हुन्छ।",
            "दशम भाव कर्मको हो र शनि कर्मकारक ग्रह हो। चारै ग्रन्थहरू (सारावली, फलदीपिका, होरासार, जातक पारिजात) ले दशम शनिको उच्च प्रशंसा गरेका छन्। यसले जातकलाई तल्लो स्तरबाट उठाएर सर्वोच्च कार्यपालिका, राजनीति, निर्माण वा औद्योगिक क्षेत्रको प्रमुख बनाउँछ।",
            "Saturn in the 10th house is a symbol of an exceptionally high position and success. Saturn here makes the native a state minister, leader of a large party or institution, clever, steady, immensely wealthy, successful in every undertaking, and holding authority akin to a ruler. The 10th house governs career, and Saturn is the karaka of karma. All four texts (Saravali, Phaladeepika, Horasara, Jataka Parijata) highly praise Saturn in the 10th. It lifts the native from a low starting point to become the head of the highest executive, political, construction, or industrial fields.",
        ),
    },
    11: {
        "entries": [
            citation("सारावली", "लाभस्थे मन्दे जातो महाधनी स्थिरसम्पदः।\nनिरोगी गुणवान् शूरो लभते लाभमुत्तमम्॥"),
            citation("फलदीपिका", "दीर्घायुः सुखी श्रीमान् स्थिरलक्ष्मीसमन्वितः।\nएकादशे अर्कपुत्रे तु लभते लाभमुत्तमम्॥"),
            citation("होरासार", "लाभे बहुविधलाभो दीर्घायुः स्थिरसम्पदः।\nमन्दे सम्भवति नरो लभते स्थानमुत्तमम्॥"),
            citation("जातक पारिजात", "एकादशगे सूर्यपुत्रे तु स्थिरलक्ष्मीसमन्वितः।\nमहाप्रतापी दीर्घायुः लभते सम्पदमुत्तमाम्॥"),
        ],
        **summary(
            "एकादश भावमा शनि हुनु स्थिर लक्ष्मीको द्योतक हो। यहाँ शनि रहँदा जातक महाधनी, दीर्घायु, सुखी, निरोगी, धीर र कहिल्यै नष्ट नहुने अचल सम्पत्ति (स्थिरलक्ष्मी) को मालिक हुन्छ।",
            "एकादश भाव लाभको उपचय स्थान हो। शनि ११ औँ भावमा रहँदा जातकले दीर्घकालीन, स्थायी र निरन्तर लाभ प्राप्त गर्दछ। फलदीपिका र जातक पारिजात अनुसार जातकसँग घरजग्गा, उद्योग वा व्यवसायबाट आउने धन सधैँ स्थिर रहन्छ।",
            "Saturn in the 11th house signals stable, enduring wealth. Saturn here makes the native immensely wealthy, long-lived, happy, healthy, steady, and owner of assets (real estate, in particular) that never diminish. The 11th house is the upachaya house of gains. Saturn in the 11th brings the native long-term, permanent, continuous gains. Per Phaladeepika and Jataka Parijata, the native's income from property, industry, or business always stays stable.",
        ),
    },
    12: {
        "entries": [
            citation("सारावली", "व्ययस्थे रविजे जातो नेत्रातुरोऽल्पवित्तवान्।\nकुदारो जनवर्जितः पापकृद् दुःखी भवेत्॥"),
            citation("फलदीपिका", "नेत्ररोगी व्ययी दुःखी पतितश्च दुराचारः।\nद्वादशे अर्कपुत्रे तु लभते क्लेशमुत्तमम्॥"),
            citation("होरासार", "व्ययगे अर्कपुत्रे तु चञ्चलश्च व्ययान्वितः।\nनेत्ररोगी विदेशस्थो लभते कष्टमुत्तमम्॥"),
            citation("जातक पारिजात", "द्वादशगे सूर्यपुत्रे तु धर्मकार्यव्ययी सुखी।\nविदेशगामी धीरश्च लभते स्थानमुत्तमम्॥"),
        ],
        **summary(
            "द्वादश भावमा शनि रहँदा खर्चमा वृद्धि, आँखामा समस्या वा दृष्टि दोष हुनसक्छ। तर जातक पारिजात अनुसार यदि शनि शुभ प्रभावमा छ भने जातकले विदेशमा गएर वा एकान्तमा बसेर ठूलो उन्नति गर्छ र धर्मकार्यमा धन खर्च गर्दछ।",
            "द्वादश भाव एकान्त, विदेश र व्ययको हो। यहाँ शनि रहँदा स्वदेशमा सङ्घर्ष भए पनि वैदेशिक व्यापार, विदेशी नागरिकता वा अध्यात्ममा जातकले राम्रो प्रगति गर्छ। जातकले खर्चमा नियन्त्रण र स्वास्थ्यमा सावधानी अपनाउनु आवश्यक हुन्छ।",
            "With Saturn in the 12th house, expenditure can increase and there can be eye or vision trouble. But per Jataka Parijata, if Saturn is under benefic influence, the native makes great progress living abroad or in solitude, and spends wealth on religious works. The 12th house governs solitude, foreign lands and expenditure. Though Saturn here brings struggle at home, the native makes good progress in foreign trade, foreign citizenship, or spirituality. The native needs to control spending and be mindful of health.",
        ),
    },
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    for graha, houses_data, rating_map in (
        ("mars", MARS_HOUSES, MARS_RATING),
        ("jupiter", JUPITER_HOUSES, JUPITER_RATING),
        ("saturn", SATURN_HOUSES, SATURN_RATING),
    ):
        table[graha] = {
            str(house): {
                "house": house,
                "houseTheme": HOUSE_THEME[house],
                "rating": rating_map[house],
                "entries": payload["entries"],
                "summaryNe": payload["summaryNe"],
                "summaryEn": payload["summaryEn"],
            }
            for house, payload in houses_data.items()
        }

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
