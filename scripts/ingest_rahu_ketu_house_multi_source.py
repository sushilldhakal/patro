"""Replace ``grahaHouseSaravali["rahu"]`` and ``["ketu"]`` with a
corrected, complete 12-house table each, sourced from a single combined
user-supplied document covering both grahas.

The document gives, per house, three or four classical citations (from
सारावली, फलदीपिका, सर्वार्थचिन्तामणि, बृहत्पाराशर होराशास्त्र and जातक
पारिजात, mixed per house — never the same fixed set twice) followed by
a "संयुक्त अर्थ" (combined meaning) paragraph and a separate "संयुक्त
विस्तृत व्याख्या" (combined detailed explanation) paragraph. Per the
now-established uniform shape (``normalize_grahaHouseSaravali_shape.py``),
those two paragraphs are concatenated into one ``summaryNe``/``summaryEn``
rather than kept as two labelled parts, and ``entries[]`` holds only the
citations (shloka + source, no per-citation meaning) — same rule as every
other graha's table, all shlokas first, one combined reading last.

Two new classical sources appear here for the first time —
सर्वार्थचिन्तामणि (Sarvartha Chintamani, वेङ्कटेश दैवज्ञ) and
बृहत्पाराशर होराशास्त्र (Brihat Parashara Hora Shastra, महर्षि पराशर) —
added to `SOURCE_EN`. Author names given alongside each ग्रन्थ in the
source document are dropped from `shlokaSourceNe`/`En`, matching every
other graha's table (bare book name only, no author or chapter/verse
citation).

`rating` isn't labelled in the source document, so each house's rating is
inferred from its combined meaning's overall sentiment, same convention
as mercury/venus's tables. This also fills in house 4 for both grahas,
which their previous (short, generic) tables didn't have.

English (`summaryEn`) is hand-translated from the concatenated Nepali
summary, same convention as every other graha's table.

Run from the repo root:
``python scripts/ingest_rahu_ketu_house_multi_source.py``
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

RAHU_RATING = {
    1: "mishrit",  # प्रतापी/जितशत्रु तर अल्पायु/रोगको सङ्केत पनि
    2: "kamjor",   # धनहीन, कपटी, मुखरोगी
    3: "uttam",    # "अत्यन्त शुभ मानिन्छ" — स्रोतको आफ्नै शब्द
    4: "kamjor",   # मातृहीन, दुःखी, चञ्चल, भयपीडित
    5: "mishrit",  # पुत्रहीन/दुर्बुद्धि तर कहिलेकाहीँ तीक्ष्णबुद्धि पनि
    6: "uttam",    # "अत्यन्त शुभ योग मानिन्छ"
    7: "mishrit",  # वैवाहिक तनाव तर जनप्रिय पक्ष पनि
    8: "kamjor",   # अल्पायु, दुःखी, रोगार्त
    9: "kamjor",   # धर्महीन, दुःखी, जनद्वेष्य
    10: "uttam",   # "अत्यन्त उच्च कोटिको राजयोगकारक मानिन्छ"
    11: "uttam",   # "अपार धनलाभ र समृद्धिको द्योतक"
    12: "kamjor",  # कृपण, दुःखी, व्ययी, दरिद्र, नेत्ररोगी
}

KETU_RATING = {
    1: "mishrit",  # चञ्चल/भय तर शुभदृष्टिमा सुखी
    2: "kamjor",   # धनहीन, कपटी, मुखरोगी
    3: "uttam",    # "अत्यन्त शुभ र शक्तिशाली फलदायी मानिन्छ"
    4: "kamjor",   # मातृहीन, दुःखी, चञ्चल, भयपीडित
    5: "kamjor",   # सन्तान बाधा, पेट रोग, बुद्धि भ्रम
    6: "uttam",    # "अत्यन्त श्रेष्ठ मानिन्छ"
    7: "kamjor",   # अलगाव, तनाव, स्वास्थ्य कष्ट
    8: "kamjor",   # शस्त्रक्षत भय, वात रोग, अल्पायु
    9: "mishrit",  # असन्तोष/ढिलाइ तर वैदेशिक/आध्यात्मिक उपलब्धि पनि
    10: "uttam",   # "अत्यन्त शुभ मानिन्छ"
    11: "uttam",   # "सर्व-कार्य सिद्धि र अपार लाभको सूचक"
    12: "uttam",   # "मोक्ष प्राप्तिको उत्तम योग"
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


RAHU_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "प्रतापी चतुरः कूटः परदेशरतः सुखी।\nलग्ने राहौ जातो जितशत्रुः प्रजायते॥"),
            citation("फलदीपिका", "लग्नेऽह्नावचिरायुर्थबलावानूर्ध्वाङ्गरोगान्वित-\nश्च्छन्नोक्तिः खरगुह्यणी नृपधनी॥"),
            citation("सर्वार्थचिन्तामणि", "लग्ने राहौ दयाहीनः विशीर्णः रोगपीडितः।\nशूरश्चतुरवाग्वादी जितशत्रुश्च जायते॥"),
            citation("बृहत्पाराशर होराशास्त्र", "लग्ने राहौ च प्रतापी सुखी वा कूटकृद् भवेत्।\nविदेशगामी चतुरो जितशत्रुश्च मानवः॥"),
        ],
        **summary(
            "प्रथम भाव (लग्न) मा राहु स्थित हुँदा जातक अत्यन्त प्रतापी, चतुर, कूटनीतिज्ञ, साहसी र शत्रुलाई परास्त गर्ने (जितशत्रु) हुन्छ। यद्यपि शारीरिक रूपमा केही अल्पायु वा शिर/माथिल्लो अङ्गमा रोग, दयाको कमी र गुप्त बोली व्यक्त गर्ने स्वभाव हुन सक्छ, तर वैदेशिक भूमिमा सफलता, राजकीय सम्मान, चातुर्य र धन-समृद्धि मिल्दछ।",
            "लग्न भाव व्यक्ति स्वयंको शरीर, व्यक्तित्व, स्वाभिमान र समग्र जीवन दिशाको कारक हो। छायाग्रह राहु लग्नमा बस्दा जातकमा अद्भूत महत्त्वकांक्षा, रहस्यमयी व्यक्तित्व र परम्पराभन्दा बाहिर गएर काम गर्ने आधुनिक कूटनीतिक सोच पैदा हुन्छ। सारावली र पराशर अनुसार लग्नको राहुले जातकलाई 'कूट' (चालबाज/रणनीतिक) र विदेशमा सफलता दिने बनाउँछ। फलदीपिका र सर्वार्थचिन्तामणिले शारीरिक दृष्टिले टाउको वा माथिल्लो भागमा स्वास्थ्य समस्या र केही कठोर व्यवहार हुनसक्ने सङ्केत गर्छन्। यदि राहु मेष, वृष वा कर्कट लग्नमा छ वा शुभ ग्रहको दृष्टि छ भने जातक उच्च राजनैतिक पद, विदेश यात्रा र शत्रु विजय प्राप्त गर्दछ।",
            "With Rahu placed in the 1st house (Lagna), the native is highly powerful, clever, a strategist, bold, and victorious over enemies. Physically, there can be a shortened lifespan or ailments of the head/upper body, a lack of compassion, and secretive speech — yet success abroad, royal honor, cleverness and wealth also come. The Lagna represents the native's own body, personality, self-respect and overall life direction. A shadow graha like Rahu here creates extraordinary ambition, a mysterious personality, and a modern, unconventional strategic mindset. Per Saravali and Parashara, Rahu in the Lagna makes the native crafty/strategic and successful abroad. Phaladeepika and Sarvartha Chintamani indicate trouble in the head or upper body and somewhat harsh behavior. If Rahu is in Aries, Taurus or Cancer, or aspected by a benefic, the native attains a high political position, foreign travel, and victory over enemies.",
        ),
    },
    2: {
        "entries": [
            citation("सारावली", "धनहीनः कपटी क्रोधी मुखरोगी सर्वदा भवेत्।\nधनस्थे राहौ जातो वञ्चको जनवर्जितः॥"),
            citation("फलदीपिका", "नृपधनी वित्ते सरोषः सुखी वचसा च हीनः।"),
            citation("सर्वार्थचिन्तामणि", "द्वितीयगे राहौ धनधान्यहीनः कुवाग्यतः क्रूरमतिश्च पापी।\nनृपाद्भयं रोगयुतश्च जातश्चौरः सुहृद्वर्जित एष मर्त्यः॥"),
        ],
        **summary(
            "द्वितीय भाव (धन र वाणी) मा राहु रहँदा जातकको वाणीमा कडापन/तीक्ष्णता (सरोष/कुवाक्), धन सञ्चयमा उतारचढाव, मुख वा दाँतको रोग र कपट वा छलपूर्ण व्यवहार हुनसक्छ। तर केही परिस्थितिमा राजा/सरकारबाट धन प्राप्त हुने र अचानक धनलाभको योग पनि बन्दछ।",
            "द्वितीय भावले धन, परिवार, वाणी र खानपानको प्रतिनिधित्व गर्दछ। यहाँ राहुको उपस्थिति हुनु भनेको वाणीमा उग्रता र पारिवारिक सदस्यहरूसँग मतभेद उत्पन्न हुनु हो। सारावली र सर्वार्थचिन्तामणि अनुसार द्वितीय भावको राहुले धन स्थिर हुन दिँदैन र मुखसम्बन्धी विकार वा अशुद्ध खानपानतर्फ लैजान्छ। तर फलदीपिकाको भनाइ अनुसार राहु यदि शुभ राशि वा शुभ ग्रहको दृष्टिमा छ भने जातकले कूटनीति, प्रविधि वा विदेशी माध्यमबाट राजा (सरकार) बाट ठूलो धन आर्जन गर्दछ। जातकले वाणीमा नियन्त्रण र सञ्चयको सही व्यवस्थापन गर्नु आवश्यक हुन्छ।",
            "With Rahu in the 2nd house (wealth and speech), the native's speech can turn harsh or sharp, wealth accumulation fluctuates, there can be ailments of the mouth or teeth, and deceptive behavior. But in some circumstances wealth comes from the state/government and a sudden-gain yoga also forms. The 2nd house represents wealth, family, speech and diet. Rahu here brings harshness to speech and friction with family members. Per Saravali and Sarvartha Chintamani, Rahu in the 2nd keeps wealth unsteady and inclines toward mouth ailments or impure diet. But per Phaladeepika, if Rahu is in an auspicious sign or aspected by a benefic, the native earns great wealth from the state through diplomacy, technology or foreign channels. The native needs to control their speech and manage savings properly.",
        ),
    },
    3: {
        "entries": [
            citation("सारावली", "शूरः पराक्रमी श्रीमान् भ्रातृहीनः सुतवान् धनी।\nसहजस्थे राहौ जातो तेजस्वी जनपूजितः॥"),
            citation("फलदीपिका", "मानी भ्रातृविरोधको दृढमतिः शौर्ये चिरायुर्धनी।"),
            citation("जातक पारिजात", "सहजे राहौ सुप्रतापी भ्रातृशोकसमन्वितः।\nधनवान् गुणवान् शूरो दीर्घायुः सुखमेधते॥"),
        ],
        **summary(
            "तृतीय भावमा राहु अत्यन्त शुभ मानिन्छ। यस स्थानमा राहु हुँदा जातक अत्यन्त शूर, पराक्रमी, तेजस्वी, धनवान्, दृढनिश्चयी, दीर्घायु र समाजमा पूजित हुन्छ। यद्यपि दाजुभाइ वा दिदीबहिनीहरूसँग मतभेद वा भ्रातृसुखमा कमी हुन सक्छ।",
            "तृतीय भाव उपचय स्थान भएकाले पापग्रह राहु यहाँ बस्दा अत्यन्त शुभ र शक्तिशाली फल दिन्छ। सारावली, फलदीपिका र जातक पारिजात तीनै ग्रन्थले तृतीय राहुको भूरि-भूरि प्रशंसा गरेका छन्। यसले जातकलाई अदम्य साहस, मिडिया, लेखन, प्रविधि, सञ्चार र जोखिमपूर्ण कार्यमा अभूतपूर्व सफलता दिन्छ। जातक शत्रुका अगाडि कहिल्यै झुक्दैन र दीर्घायु हुन्छ। केवल एउटै नकारात्मक पक्ष भनेको दाजुभाइहरूसँगको सम्बन्धमा कटुता वा भ्रातृसुखमा कमी आउनु हो।",
            "Rahu in the 3rd house is considered highly auspicious. It makes the native highly valorous, powerful, radiant, wealthy, resolute, long-lived, and respected in society. However, there can be discord with siblings or reduced happiness from them. Since the 3rd is an upachaya house, a malefic like Rahu gives extremely auspicious and powerful results here. Saravali, Phaladeepika and Jataka Parijata all praise Rahu in the 3rd extensively. It grants indomitable courage and extraordinary success in media, writing, technology, communication and risk-taking ventures. The native never bows before enemies and is long-lived. The one drawback is bitterness in the relationship with siblings, or reduced sibling happiness.",
        ),
    },
    4: {
        "entries": [
            citation("सारावली", "मातृहीनो दुःखी कृपणः गृहवाहनादिरहितः।\nसुखस्थे राहौ जातो चञ्चलो भयपीडितः॥"),
            citation("फलदीपिका", "मूर्खो वेश्मनि दुःखकृत्सुसुहृदल्पायुः कदाचित्सुखी।"),
            citation("सर्वार्थचिन्तामणि", "बन्धावहीनः सुखमातृहीनः स्वदेशहीनः परगेहवासी।\nचतुर्थगे राहौ दुःखी जनैश्चैवानृतप्रियः॥"),
        ],
        **summary(
            "चौथो भावमा राहु रहँदा जातकको मानसिक शान्तिमा खलल, आमाको स्वास्थ्यमा कष्ट, गृह र वाहन सुखमा बाधा तथा मातृभूमि छाडेर परदेशमा वा अर्कैको घरमा बस्नुपर्ने योग बन्दछ। जातक चञ्चल स्वभाव, मनमा भय र कहिलेकाहीँ असत्य बोल्ने प्रवृत्तिवाला हुन्छ।",
            "चतुर्थ भाव मन, आमा, गृह, भूमि र सुखको स्थान हो। चतुर्थमा राहु बस्दा मनमा अशान्ति, भ्रम र घरभित्र गृहक्लेश गराउँछ। सारावली र सर्वार्थचिन्तामणि अनुसार यस्तो जातक आफ्नो जन्मस्थान छाडेर विदेश वा टाढा गएर बस्दा बढी सफल हुन्छ। यदि चतुर्थ राहु शुभ ग्रह (गुरु वा शुक्र) बाट दृष्ट छ भने जातकले विदेशी शैलीको भव्य घर वा वाहन सुख प्राप्त गर्न सक्छ, तर आमाको स्वास्थ्य र आन्तरिक मानसिक शान्तिको लागि यो placement चुनौतीपूर्ण नै रहन्छ।",
            "Rahu in the 4th house disturbs the native's peace of mind, causes distress to the mother's health, obstructs comfort from home and vehicles, and creates a yoga for leaving one's homeland to live abroad or in another's house. The native tends to be restless, fearful, and occasionally untruthful. The 4th house governs the mind, mother, home, land and comfort. Rahu here brings mental unrest, confusion and domestic discord. Per Saravali and Sarvartha Chintamani, such a native finds more success leaving their birthplace to live far away or abroad. If the 4th-house Rahu is aspected by a benefic (Jupiter or Venus), the native can gain a grand foreign-style home or vehicle comfort, but this placement remains challenging for the mother's health and inner peace of mind.",
        ),
    },
    5: {
        "entries": [
            citation("सारावली", "पुत्रहीनो दुःखी क्रोधी जठररोगी च मानवः।\nसुतस्थे राहौ जातो दुर्बुद्धिः परवञ्चकः॥"),
            citation("फलदीपिका", "मन्दप्रज्ञः सुतविहीनः क्रूरहृत्स्तब्धवाक् सुते।"),
            citation("बृहत्पाराशर होराशास्त्र", "पञ्चमे राहौ जातो हि सुतहीनश्च मन्दधीः।\nतीक्ष्णबुद्धिः कचिद्वापि जठराग्निप्रपीडितः॥"),
        ],
        **summary(
            "पञ्चम भावमा राहु हुँदा सन्तति (छोराछोरी) सम्बन्धी चिन्ता वा बाधा, पेट/पाचन प्रणालीमा रोग (जठररोगी), मतिभ्रम वा भ्रमपूर्ण बुद्धि हुन सक्छ। तर पराशर अनुसार कहिलेकाहीँ जातक अत्यन्त तीक्ष्ण, कूटनीतिक र गूढ ज्ञानमा निपुण पनि हुन्छ।",
            "पञ्चम भाव बुद्धि, विद्या, मन्त्र र सन्ततिको भाव हो। पञ्चममा राहु बस्दा 'सर्प दोष' वा 'पुत्र बाधा' को शास्त्रीय कथन छ, जसले गर्दा पहिलो सन्तान प्राप्तिमा ढिलाइ वा कष्ट हुन सक्छ। बुद्धिमा भ्रम, सेयर बजार वा जुवा/सट्टापट्टितर्फ आकर्षण बढ्छ। यद्यपि पराशर र आधुनिक अनुभव अनुसार पञ्चमको राहुले रिसर्च, कम्प्युटर सफ्टवेयर, AI, र गूढ शास्त्रमा असाधारण चातुर्य दिन्छ।",
            "With Rahu in the 5th house, there can be worry or obstacles regarding children, stomach/digestive ailments, and confused or delusional thinking. But per Parashara, the native can sometimes also be exceptionally sharp, strategic, and skilled in esoteric knowledge. The 5th house governs intellect, learning, mantra and children. Classical texts speak of a 'sarpa dosha' or 'putra badha' (obstacle to children) when Rahu occupies the 5th, which can delay or trouble the first child. Confusion in the intellect and attraction toward speculation or gambling increase. Yet per Parashara and modern experience, Rahu in the 5th grants extraordinary aptitude in research, computer software, AI, and occult study.",
        ),
    },
    6: {
        "entries": [
            citation("सारावली", "शत्रुहन्ता सुखी मानी दृढाङ्गो बलवान् धनी।\nषष्ठस्थे राहौ जातो दीर्घायुश्च प्रजायते॥"),
            citation("फलदीपिका", "दीर्घायुः षष्ठगे राहौ श्रीमान् जितरिपुश्च सः।"),
            citation("जातक पारिजात", "षष्ठे राहौ जितारिश्च धनवान् जनपूजितः।\nकामातुरः सुखी शूरो दीर्घायुश्च महीपतिः॥"),
        ],
        **summary(
            "छैटौँ भावमा राहु रहनु ज्योतिषशास्त्रमा अत्यन्त शुभ योग मानिन्छ। यस्तो जातक शत्रुहन्ता (शत्रुलाई परास्त गर्ने), सुखी, मानी, दृढ शरीर भएको, बलवान्, अपार धनवान्, दीर्घायु र राजा समान अधिकार पाउने हुन्छ।",
            "छैटौँ भाव उपचय र त्रिषडाय भाव हो, जहाँ पापग्रह राहुले आफ्नो सर्वोत्तम शुभ फल प्रकटीकरण गर्छ। सारावली, फलदीपिका र जातक पारिजात तीनै ग्रन्थले यसको मुक्तकण्ठले प्रशंसा गरेका छन्। यस्तो जातकले मुद्दा-मामिला, प्रतिस्पर्धा, कोर्ट-कचहरी र ऋणमा सधैँ विजय हासिल गर्छ। शत्रुहरू उसको अगाडि स्वतः परास्त हुन्छन्। जातक राजनीति, कानुन वा प्रशासनिक क्षेत्रमा उच्च पद प्राप्त गरी दीर्घायु बन्दछ।",
            "Rahu in the 6th house is considered an extremely auspicious yoga in astrology. Such a native destroys enemies, is happy, self-respecting, sturdy-bodied, strong, immensely wealthy, long-lived, and gains authority akin to a ruler. The 6th is both an upachaya and a trishadaya house, where a malefic like Rahu manifests its best, most auspicious results. Saravali, Phaladeepika and Jataka Parijata all praise this placement wholeheartedly. Such a native always wins in litigation, competition, court proceedings and matters of debt. Enemies are automatically defeated before them. The native attains a high position in politics, law or administration and lives long.",
        ),
    },
    7: {
        "entries": [
            citation("सारावली", "स्त्रीहीनो दुःखी कामी च कलत्ररहितो भवेत्।\nसप्तमस्थे राहौ जातो धनहीनो जनप्रियः॥"),
            citation("फलदीपिका", "स्त्रीसङ्गाद्धननाशी स्यात्स्वतन्त्रः कलत्रे स्थिते।"),
            citation("सर्वार्थचिन्तामणि", "सप्तमगे राहौ नष्टस्त्रीको जनद्वेष्यः कृपणः।\nविदेशवासी दुःखी च कलहप्रियश्च मर्त्यः॥"),
        ],
        **summary(
            "सप्तम भावमा राहु रहँदा वैवाहिक जीवनमा तनाव, ढिलाइ वा जीवनसाथीको स्वास्थ्यमा समस्या आउन सक्छ। जातक अत्यन्त कामुक, स्वतन्त्र विचारको, विपरीत लिङ्गीको सङ्गतले धन नाश गर्ने र कहिलेकाहीँ वैवाहिक सुखमा बाधा भोग्ने हुन्छ। व्यापार र साझेदारीमा विशेष सावधानी अपनाउनुपर्छ।",
            "सप्तम भाव विवाह, जीवनसाथी र दैनिक व्यापारको घर हो। यहाँ राहुको उपस्थिति हुनाले जातकले अन्तरजातीय, गैर-परम्परागत वा विदेशी जीवनसाथी प्राप्त गर्ने सम्भावना हुन्छ। सारावली र सर्वार्थचिन्तामणिले वैवाहिक सम्बन्धमा कलह र जीवनसाथीको हानि हुनसक्ने चेतावनी दिएका छन्। फलदीपिका अनुसार परस्त्री/परपुरुष सङ्गतले धन हानि हुने खतरा रहन्छ। यदि सप्तमेश बलियो छ र शुभ दृष्टि छ भने वैदेशिक व्यापार र व्यापारिक साझेदारीबाट ठूलो लाभ मिल्छ।",
            "Rahu in the 7th house can bring tension or delay in married life, or trouble in the spouse's health. The native tends to be very passionate, independent-minded, prone to losing wealth through relations with the opposite sex, and can face obstacles to marital happiness. Special caution is needed in business and partnerships. The 7th house is the house of marriage, spouse and daily trade. Rahu's presence here raises the likelihood of an inter-caste, unconventional or foreign spouse. Saravali and Sarvartha Chintamani warn of discord in the marriage and possible harm to the spouse. Per Phaladeepika, involvement with others outside the marriage risks financial loss. If the 7th lord is strong and well-aspected, great gains come through foreign trade and business partnerships.",
        ),
    },
    8: {
        "entries": [
            citation("सारावली", "अल्पायुः दुःखी कृपणः रोगार्तो कलहप्रियः।\nअष्टमस्थे राहौ जातो विकलाङ्गो भवेन्नरः॥"),
            citation("फलदीपिका", "कुक्षिभोगी तथाऽल्पायुरष्टमे दुःखी कलहप्रियः।"),
            citation("बृहत्पाराशर होराशास्त्र", "अष्टमे राहौ जातो हि वातरोगी च कृच्छ्रभाक्।\nअल्पायुः पापकर्मा च गुह्यरोगाभिपीडितः॥"),
        ],
        **summary(
            "अष्टम भावमा राहु स्थित हुँदा पेट/नाभिमुनिका अङ्गमा रोग (कुक्षिभोगी/गुह्यरोग), वात विकार, अचानक दुर्घटना, मानसिक दुःख र आयुष्यमा बाधा हुनसक्छ। जातक भित्री रूपमा दुःखी र कलहप्रिय हुन सक्छ।",
            "अष्टम भाव रन्ध्र स्थान (आयु, मृत्यु, दुर्घटना र गुप्त ज्ञान) हो। अष्टममा राहु बस्दा स्वास्थ्यमा अचानक उतारचढाव र पत्ता नलाग्ने गुप्त रोग वा वात रोगको सम्भावना रहन्छ। ग्रन्थहरूले अल्पायु वा दुर्घटनाको सङ्केत गरे तापनि यदि अष्टमेश वा लग्नपति बलियो छ भने राहुले अकाल मृत्युबाट बचाउँछ। अष्टमको राहुले जातकलाई तन्त्र, मन्त्र, ज्योतिष, अनुसन्धान र गुप्त धन (इन्हेरिटेन्स/बीमा) तर्फ भने अनपेक्षित लाभ दिलाउँछ।",
            "With Rahu in the 8th house, there can be ailments below the navel, wind-related disorders, sudden accidents, mental distress, and obstacles to longevity. The native can be inwardly troubled and prone to conflict. The 8th house governs danger, death, accidents and hidden knowledge. Rahu here brings sudden health fluctuations and the possibility of undiagnosable hidden or wind-related illness. Though the texts point to a shortened life or accidents, if the 8th lord or Lagna lord is strong, Rahu can protect against untimely death. Rahu in the 8th grants unexpected gains through tantra, mantra, astrology, research, and hidden wealth (inheritance/insurance).",
        ),
    },
    9: {
        "entries": [
            citation("सारावली", "धर्महीनो दुःखी कृपणः भ्रातृहीनः सुतवर्जितः।\nनवमस्थे राहौ जातो जनद्वेष्यो भवेन्नरः॥"),
            citation("फलदीपिका", "दुष्टात्मा भाग्यहीनोऽपि नवमे राहौ स्थिते।"),
            citation("जातक पारिजात", "नवमे राहौ धर्मघ्नः पिशुनः तीर्थगाम्यपि।\nविदेशनिरतो दुःखी भ्रातृपुत्रविवर्जितः॥"),
        ],
        **summary(
            "नवम भावमा राहु हुँदा परम्परागत धर्मप्रति अनास्था, बुबासँग वैचारिक मतभेद र भाग्यमा ढिलाइ वा उतारचढाव आउँछ। यद्यपि जातक तीर्थयात्रा गर्ने, विदेशमा बसोबास गर्ने र गैर-परम्परागत दर्शनतर्फ आकर्षित हुने हुन्छ।",
            "नवम भाव धर्म, भाग्य, गुरु र पिताको स्थान हो। नवममा राहु बस्दा जातकले परम्परागत अन्धविश्वासलाई मान्दैन र धर्मका स्थापित मान्यताहरूमा प्रश्न उठाउँछ। बुबाको स्वास्थ्य वा बुबासँगको सम्बन्धमा कटुता आउन सक्छ। जातक विदेश यात्रा र वैदेशिक क्षेत्रमा निकै सफल हुन्छ। यदि शुभ ग्रहको दृष्टि पर्यो भने जातकले विदेशमा तीर्थयात्रा, अनुसन्धान र नयाँ क्रान्तिकारी विचारको नेतृत्व गर्दछ।",
            "With Rahu in the 9th house, there can be disbelief in traditional dharma, differences of opinion with the father, and delays or fluctuations in fortune. The native, however, is drawn to pilgrimage, living abroad, and unconventional philosophy. The 9th house governs dharma, fortune, the guru and the father. Rahu here makes the native question established religious beliefs rather than accept superstition. There can be friction with, or health issues for, the father. The native finds great success in foreign travel and overseas fields. If aspected by a benefic, the native leads pilgrimage, research, and revolutionary new ideas abroad.",
        ),
    },
    10: {
        "entries": [
            citation("सारावली", "प्रसिद्धः चतुरः शूरो राजपूज्यो धनी सुखी।\nकर्मस्थे राहौ जातो परोपकारी भवेन्नरः॥"),
            citation("फलदीपिका", "गङ्गास्नायी प्रतापी च दशमे कर्मकृद् भवेत्।"),
            citation("सर्वार्थचिन्तामणि", "दशमगे राहौ मन्त्रिः प्रतापी चतुरः सुखी।\nराजमान्यो यशस्वी च दानवीरो विचक्षणः॥"),
        ],
        **summary(
            "दशम भावमा राहु हुनु अत्यन्त उच्च कोटिको राजयोगकारक मानिन्छ। जातक समाजमा सुप्रसिद्ध, प्रतापी, चतुर, शूरवीर, सरकार/राजाबाट पूजित, धनी, सुखी, परोपकारी र उच्च मन्त्री वा प्रबन्धक पद प्राप्त गर्ने हुन्छ।",
            "दशम भाव राज्य, कर्म र प्रतिष्ठाको केन्द्र स्थान हो। दशममा राहु बस्दा मानिसलाई करियरको सर्वोच्च शिखरमा पुर्याउँछ। सारावली, फलदीपिका र सर्वार्थचिन्तामणि सबै ग्रन्थले दशमको राहुको प्रशंसा गरेका छन्। जातकले राजनीति, सरकारी प्रशासन, विदेशी व्यापार, मिडिया र प्राविधिक क्षेत्रमा ठूलो सफलता र यश आर्जन गर्दछ। 'गङ्गास्नायी' को अर्थ जातकले धार्मिक वा सामाजिक रूपमा ठूला प्रतिष्ठित कार्य गर्दछ।",
            "Rahu in the 10th house is considered an exceptionally high-grade raja yoga. The native becomes widely famous, powerful, clever, valorous, honored by the government or ruler, wealthy, happy, charitable, and attains a high ministerial or managerial position. The 10th house is the seat of authority, career and standing. Rahu here carries a person to the very peak of their career. Saravali, Phaladeepika and Sarvartha Chintamani all praise Rahu in the 10th. The native achieves great success and fame in politics, government administration, foreign trade, media and technical fields, and undertakes grand, prestigious religious or social works.",
        ),
    },
    11: {
        "entries": [
            citation("सारावली", "दीर्घायुः श्रीमान् शूरो गुणवान् सुतवान् धनी।\nलाभस्थे राहौ जातो शत्रुहन्ता भवेन्नरः॥"),
            citation("फलदीपिका", "दीर्घायुः श्रीमान् पुत्रवान् लाभगे राहौ।"),
            citation("जातक पारिजात", "एकादशे राहौ जातो बहुलाभो बहुप्रजः।\nदीर्घायुः श्रीयुतो धीरः शत्रुघ्नो नृपवल्लभः॥"),
        ],
        **summary(
            "एकादश भावमा राहु हुनु अपार धनलाभ र समृद्धिको द्योतक हो। जातक दीर्घायु, अत्यन्त धनी, पराक्रमी, गुणवान्, सन्तानवान्, शत्रुहन्ता, धीर र सरकारको प्रिय (नृपवल्लभ) हुन्छ।",
            "एकादश भाव सर्व-लाभको भाव हो। त्रिषडाय भाव ११ मा राहुले संसारका समस्त सुख-सुविधा र धन आर्जनका अनेकौँ स्रोतहरू (बहुलाभ) खुला गरिदिन्छ। सारावली र जातक पारिजात अनुसार ११ औँ भावको राहुले जातकलाई अपार धनवान् र दीर्घायु बनाउँछ। शत्रुहरू आफैँ नष्ट हुन्छन्। शेयर, प्रविधि, वैदेशिक व्यापार वा राजनीतिबाट निरन्तर धन बगिरहन्छ।",
            "Rahu in the 11th house signals immense wealth gain and prosperity. The native is long-lived, very wealthy, powerful, virtuous, blessed with children, victorious over enemies, steady, and favored by the government. The 11th is the house of all gains. Rahu in this trishadaya house opens up countless sources of worldly comfort and wealth. Per Saravali and Jataka Parijata, Rahu in the 11th makes the native immensely wealthy and long-lived. Enemies destroy themselves. Wealth flows continuously through stocks, technology, foreign trade, or politics.",
        ),
    },
    12: {
        "entries": [
            citation("सारावली", "कृपणः दुःखी गुप्तपापी व्ययी चैव दरिद्रवान्।\nद्वादशस्थे राहौ जातो नेत्ररोगी भवेन्नरः॥"),
            citation("फलदीपिका", "गुप्तपापी व्ययी दुःखी द्वादशे नेत्ररोगी भवेत्।"),
            citation("सर्वार्थचिन्तामणि", "द्वादशगे राहौ व्ययवान् पतितो गुप्तपापकर्मरतः।\nअक्षिरोगी विकलाङ्गः परदेसरतो दुःखी भवेन्नरः॥"),
        ],
        **summary(
            "द्वादश भावमा राहु रहँदा अत्यधिक फजुल खर्च (व्ययी), गुप्त कार्य वा पापमा रुचि, आँखाको समस्या (नेत्ररोगी), र केही हदसम्म दुःख वा दरिद्रता हुन सक्छ। तर जातक वैदेशिक भूमिमा बसोबास (परदेसरतः) गर्ने र त्यहाँ धन आर्जन गर्ने हुन्छ।",
            "द्वादश भाव व्यय, अस्पताल, जेल, विदेश र मोक्षको घर हो। यहाँ राहु बस्दा फजुल खर्च गराउँछ र निद्रामा समस्या वा आँखामा विकार दिन्छ। सर्वार्थचिन्तामणि र सारावलीले गुप्त क्रियाकलाप वा नैतिक रूपमा गलत कार्यतर्फ सचेत गराएका छन्। तर आधुनिक ज्योतिषीय सन्दर्भमा द्वादश राहुले व्यक्तिलाई स्थायी रूपमा विदेशमा बसाउन र मल्टिनेशनल कम्पनीमा सफलता दिलाउन मुख्य भूमिका खेल्छ।",
            "With Rahu in the 12th house, there can be excessive wasteful spending, an inclination toward secretive or sinful activity, eye trouble, and some measure of distress or poverty. However, the native tends to settle in a foreign land and earn wealth there. The 12th house is the house of expenditure, hospitals, imprisonment, foreign lands and liberation. Rahu here causes wasteful spending and gives sleep trouble or eye disorders. Sarvartha Chintamani and Saravali caution against secretive or morally questionable activity. But in modern astrological practice, Rahu in the 12th plays a key role in permanent settlement abroad and success in multinational companies.",
        ),
    },
}

KETU_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "कृतघ्नो दुःखितश्चैव चञ्चलो भयरोगवान्।\nलग्ने केतौ जातो मन्दः कलहप्रियः॥"),
            citation("फलदीपिका", "कृतघ्नश्चञ्चलो मन्दः कलहप्रियः लग्ने।"),
            citation("बृहत्पाराशर होराशास्त्र", "लग्ने केतौ दरिद्रश्च कृपणः कपटी भवेत्।\nविकलाङ्गो वातरोगी शुभदृष्ट्या सुखी भवेत्॥"),
        ],
        **summary(
            "प्रथम भाव (लग्न) मा केतु रहँदा जातक चञ्चल, मनमा भय, वात विकार वा स्वास्थ्य समस्या, कलहप्रिय र अलि सुस्त (मन्द) स्वभावको हुन सक्छ। तर महर्षि पराशर अनुसार यदि लग्नको केतुमा शुभ ग्रह (गुरु वा शुक्र) को दृष्टि परेमा जातक सुखी, अध्यात्मवादी र समृद्ध हुन्छ।",
            "केतु मोक्ष, वैराग्य र सूक्ष्मज्ञानको कारक हो। लग्नमा केतु बस्दा मानिसमा भौतिक जगत्प्रति अलगाव वा पहिचानको सङ्कट आउन सक्छ। सारावली र फलदीपिकाले शारीरिक दुबलोपन, चञ्चलता र वात रोगको सङ्केत गरेका छन्। यद्यपि लग्नको केतुले व्यक्तिलाई उच्च छठी इन्द्रिय, सहजज्ञान र आध्यात्मिक गम्भीरता प्रदान गर्दछ।",
            "With Ketu in the 1st house (Lagna), the native can be restless, fearful, prone to wind-related ailments or health issues, argumentative, and somewhat dull in nature. But per Maharishi Parashara, if the Lagna Ketu is aspected by a benefic (Jupiter or Venus), the native is happy, spiritually inclined, and prosperous. Ketu governs liberation, detachment and subtle knowledge. Ketu in the Lagna can bring a sense of detachment from the material world or an identity crisis. Saravali and Phaladeepika indicate physical weakness, restlessness and wind-related illness. Yet Ketu in the Lagna also grants a heightened sixth sense, intuition, and spiritual depth.",
        ),
    },
    2: {
        "entries": [
            citation("सारावली", "धनहीनः कपटी क्रोधी मुखरोगी च मानवः।\nद्वितीयस्थे केतौ जातो जनवर्जितः॥"),
            citation("फलदीपिका", "विद्याधनहीनः कलहप्रियः द्वितीये।"),
            citation("सर्वार्थचिन्तामणि", "द्वितीयगे केतौ धनधान्यहीनो वाग्विहीनः कुमुखी च पापः।\nपरान्नभोजी कलहप्रियश्च नृपाद्भयेन प्रपीडितश्च॥"),
        ],
        **summary(
            "द्वितीय भावमा केतु रहँदा धन सञ्चयमा कठिनाइ, वाणीमा रुखोपना/कलहप्रियता, मुख वा दाँतको रोग र विद्या/शिक्षामा अवरोध आउन सक्छ। जातक परिवारभन्दा अलि अलग्गै (जनवर्जित) बस्न रुचाउँछ।",
            "द्वितीय भाव धन, वाणी र कुटुम्बको हो। यहाँ केतुको उपस्थिति हुनाले धन स्थिर रहन पाउँदैन—अचानक धन आउने र खर्च हुने क्रम चलिरहन्छ। वाणीमा स्पष्टता र कटुता हुने भएकाले परिवारमा मतभेद हुन सक्छ। सर्वार्थचिन्तामणि र फलदीपिकाले धन र विद्यामा बाधाको उल्लेख गरे तापनि यदि द्वितीयेश शुभ स्थितिमा छ भने केतुले गूढ शास्त्र, ज्योतिष वा अनुसन्धानमूलक कार्यबाट धन दिन्छ।",
            "With Ketu in the 2nd house, there can be difficulty in accumulating wealth, harshness or argumentativeness in speech, ailments of the mouth or teeth, and obstacles in education. The native tends to prefer being somewhat apart from family. The 2nd house governs wealth, speech and family. Ketu's presence here keeps wealth unsteady — money keeps arriving and being spent. Speech can be blunt and cutting, causing friction within the family. Though Sarvartha Chintamani and Phaladeepika note obstacles to wealth and learning, if the 2nd lord is well placed, Ketu grants wealth through occult study, astrology, or research work.",
        ),
    },
    3: {
        "entries": [
            citation("सारावली", "शूरः पराक्रमी श्रीमान् भ्रातृहीनः सुतवान् धनी।\nतृतीयस्थे केतौ जातो तेजस्वी जनपूजितः॥"),
            citation("फलदीपिका", "शूरः पराक्रमी धनी भ्रातृहीनः तृतीये।"),
            citation("जातक पारिजात", "तृतीये केतौ तेजस्वी भ्रातृशोकसमन्वितः।\nधनवान् पराक्रमी शूरो दीर्घायुः सुखमेधते॥"),
        ],
        **summary(
            "तृतीय भावमा केतु हुनु अत्यन्त शुभ र शक्तिशाली फलदायी मानिन्छ। जातक अत्यन्त शूर, पराक्रमी, तेजस्वी, धनवान्, दीर्घायु, सुखी र जनपूजित हुन्छ। केवल दाजुभाइसँगको सम्बन्धमा भने केही दूरी वा कष्ट हुन सक्छ।",
            "तृतीय भाव (उपचय स्थान) मा केतु बस्दा जातकमा अभूतपूर्व मानसिक र शारीरिक बल उत्पन्न हुन्छ। सारावली, फलदीपिका र जातक पारिजात तीनै ग्रन्थले तृतीय केतुको एकस्वरले प्रशंसा गरेका छन्। जातकले आफ्नै बलबुतामा अपार धन र मान-सम्मान आर्जन गर्दछ। शत्रुहरू उसँग डराउँछन्। आध्यात्मिक वा प्राविधिक कार्यमा जातकको पराक्रम चम्किन्छ।",
            "Ketu in the 3rd house is considered highly auspicious and powerfully fruitful. The native is very valorous, powerful, radiant, wealthy, long-lived, happy, and respected in society. Only the relationship with siblings may see some distance or difficulty. Ketu in the 3rd (an upachaya house) generates extraordinary mental and physical strength. Saravali, Phaladeepika and Jataka Parijata all praise Ketu in the 3rd with one voice. The native earns immense wealth and honor through their own strength. Enemies fear them. The native's valor shines in spiritual or technical work.",
        ),
    },
    4: {
        "entries": [
            citation("सारावली", "मातृहीनो दुःखी कृपणः गृहवाहनादिरहितः।\nचौथे केतौ जातो चञ्चलो भयपीडितः॥"),
            citation("फलदीपिका", "मातृहीनः सुखहीनः वाहनहीनः चतुर्थे।"),
            citation("सर्वार्थचिन्तामणि", "चतुर्थगे केतौ बन्धुहीनः सुखमातृहीनः स्वदेशहीनः।\nपरगेहवासी दुःखी जनैश्चैवानृतप्रियः॥"),
        ],
        **summary(
            "चौथो भावमा केतु रहँदा पारिवारिक सुखमा कमी, आमाको स्वास्थ्यमा चिन्ता, गृह र वाहन सुखमा बाधा तथा जन्मस्थान छाडेर विदेश वा पराइको घरमा (परगेहवासी) बस्नुपर्ने अवस्था आउँछ। मनमा अशान्ति र भय रहन्छ।",
            "चौथो भाव मन र घरको सुख हो। केतुले कटौती र अलगाव गराउने भएकाले चौथो भावमा बस्दा घरको वातावरणमा अशान्ति वा आमासँग दूरी गराउँछ। ग्रन्थहरूका अनुसार जातक आफ्नो जन्मथलो छाडेर बाहिर जाँदा मानसिक रूपमा शान्त रहन सक्छ। यदि गुरु वा शुक्रको प्रभाव चौथो भावमा छ भने जातकले साधना वा अध्यात्मका लागि अनुकूल वातावरण प्राप्त गर्छ।",
            "With Ketu in the 4th house, there can be reduced family happiness, concern over the mother's health, obstacles to home and vehicle comfort, and a situation of leaving one's birthplace to live abroad or in another's house. There is unrest and fear in the mind. The 4th house is the house of the mind and home comfort. Since Ketu causes detachment and separation, its presence in the 4th brings unrest in the home environment or distance from the mother. Per the texts, the native can find mental peace by leaving their birthplace to live elsewhere. If Jupiter or Venus influences the 4th house, the native finds an environment favorable for spiritual practice.",
        ),
    },
    5: {
        "entries": [
            citation("सारावली", "पुत्रहीनो दुःखी क्रोधी जठररोगी च मानवः।\nपंचमस्थे केतौ जातो दुर्बुद्धिः परवञ्चकः॥"),
            citation("फलदीपिका", "पुत्रहीनः जठररोगी पञ्चमे।"),
            citation("बृहत्पाराशर होराशास्त्र", "पञ्चमे केतौ जातो सुतहीनश्च मन्दधीः।\nकुक्षिभोगी पापमतिः चञ्चलो भयपीडितः॥"),
        ],
        **summary(
            "पञ्चम भावमा केतु रहँदा सन्तान प्राप्तिमा बाधा वा चिन्ता, पेटको रोग (जठर/कुक्षि रोग) र बुद्धिमा चञ्चलता वा भ्रम हुन सक्छ।",
            "पञ्चम भाव पूर्वजन्मको पुण्य, बुद्धि र सन्तानको घर हो। यहाँ केतु बस्दा पहिलो सन्तानमा बाधा वा गर्भपातको जोखिम रहन्छ। पाचन प्रक्रियामा गडबडी भइरहन्छ। तर पञ्चमको केतुले जातकलाई गूढ ज्ञान, मन्त्र सिद्धि, ज्योतिष, गणित र अध्यात्ममा भने असाधारण अन्तर्दृष्टि प्रदान गर्दछ।",
            "With Ketu in the 5th house, there can be obstacles or worry regarding children, stomach ailments, and restlessness or confusion in the intellect. The 5th house is the house of past-life merit, intellect and children. Ketu here carries a risk of obstacles to the first child or miscarriage. Digestion tends to be disturbed. Yet Ketu in the 5th grants the native extraordinary insight into esoteric knowledge, mantra siddhi, astrology, mathematics and spirituality.",
        ),
    },
    6: {
        "entries": [
            citation("सारावली", "शत्रुहन्ता सुखी मानी दृढाङ्गो बलवान् धनी।\nषष्ठस्थे केतौ जातो दीर्घायुश्च प्रजायते॥"),
            citation("फलदीपिका", "उदारः शत्रुहन्ता षष्ठे।"),
            citation("जातक पारिजात", "षष्ठे केतौ जितारिश्च धनवान् जनपूजितः।\nउदारगुणसम्पन्नः दीर्घायुश्च महीपतिः॥"),
        ],
        **summary(
            "छैटौँ भावमा केतुको फल अत्यन्त श्रेष्ठ मानिन्छ। जातक शत्रुहन्ता, उदार, सुखी, मानी, बलवान्, धनवान्, दीर्घायु र राजा समान प्रतिष्ठित हुन्छ।",
            "छैटौँ भाव उपचय भाव भएकाले यहाँ केतुले शत्रु र रोगहरूलाई समूल नष्ट गर्दछ। जातकले प्रतिस्पर्धामा ठूलो सफलता प्राप्त गर्छ। जातकको व्यक्तित्व उदार र प्रभावशाली हुन्छ। कार्यक्षेत्रमा आउने बाधाहरूलाई जातकले आफ्नो बुद्धि र साहसले पन्छाउँछ।",
            "Ketu's effect in the 6th house is considered excellent. The native destroys enemies, is generous, happy, self-respecting, strong, wealthy, long-lived, and honored like a ruler. Since the 6th is an upachaya house, Ketu here eradicates enemies and disease at the root. The native achieves great success in competition. Their personality is generous and influential. The native clears obstacles in their career through intellect and courage.",
        ),
    },
    7: {
        "entries": [
            citation("सारावली", "स्त्रीहीनो दुःखी कामी च कलत्ररहितो भवेत्।\nसप्तमस्थे केतौ जातो धनहीनो जनप्रियः॥"),
            citation("फलदीपिका", "स्त्रीहीनः दुःखी सप्तमे।"),
            citation("सर्वार्थचिन्तामणि", "सप्तमगे केतौ कलत्रहीनः कलहप्रियश्च।\nअपमानितो दुःखी चापि परदेशरतो भवेत्॥"),
        ],
        **summary(
            "सप्तम भावमा केतु रहँदा वैवाहिक जीवनमा अलगाव, तनाव वा जीवनसाथीको स्वास्थ्य खराब हुनसक्छ। जातक अलि कलहप्रिय, मनमा असन्तोष र परदेशमा रहने प्रवृत्तिवाला हुन्छ।",
            "सप्तम भाव साझेदारी र विवाहको हो। यहाँ केतु बस्दा जीवनसाथीसँग भावनात्मक अलगाव वा दूरी आउन सक्छ। जातकले जीवनसाथीबाट उच्च अपेक्षा राख्छ तर वास्तविक जीवनमा असन्तुष्ट रहन्छ। यदि सप्तमेश शुभ छ भने जीवनसाथी धार्मिक वा अध्यात्मप्रेमी हुन्छ। व्यापारमा साझेदारी गर्दा सतर्क हुनुपर्छ।",
            "With Ketu in the 7th house, there can be estrangement, tension in married life, or poor health for the spouse. The native tends to be somewhat argumentative, discontented, and inclined to live abroad. The 7th house governs partnership and marriage. Ketu here can bring emotional detachment or distance from the spouse. The native holds high expectations of the spouse but remains dissatisfied in real life. If the 7th lord is auspicious, the spouse tends to be religious or spiritually inclined. Caution is needed in business partnerships.",
        ),
    },
    8: {
        "entries": [
            citation("सारावली", "अल्पायुः दुःखी कृपणः रोगार्तो कलहप्रियः।\nअष्टमस्थे केतौ जातो विकलाङ्गो भवेन्नरः॥"),
            citation("फलदीपिका", "अल्पायुः शस्त्रक्षतभाग् अष्टमे।"),
            citation("बृहत्पाराशर होराशास्त्र", "अष्टमे केतौ जातो हि वातरोगी च कृच्छ्रभाक्।\nशस्त्रघाताद्भयं चापि अल्पायुश्चैव जायते॥"),
        ],
        **summary(
            "अष्टम भावमा केतु रहँदा शस्त्र वा चोटपटकको भय, वात रोग, अल्पायु वा दुर्घटनाको जोखिम र स्वास्थ्यमा उतारचढाव हुन सक्छ।",
            "अष्टम भाव सङ्कट र आयुको स्थान हो। अष्टममा केतु बस्दा चोटपटक वा सवारी दुर्घटनाबाट जोगिनुपर्छ। यद्यपि अष्टमको केतु आध्यात्मिक दृष्टिले अत्यन्त प्रबल मानिन्छ। यसले जातकलाई तन्त्र, मन्त्र, कुण्डलिनी जागरण, ज्योतिष र अनुसन्धानमा गहिरो ज्ञान दिलाउँछ।",
            "With Ketu in the 8th house, there can be fear of injury from weapons or accidents, wind-related illness, a risk to longevity or accidents, and fluctuating health. The 8th house is the house of danger and longevity. Ketu here requires caution against injury or vehicle accidents. Yet Ketu in the 8th is considered extremely powerful from a spiritual standpoint, granting the native deep knowledge in tantra, mantra, kundalini awakening, astrology and research.",
        ),
    },
    9: {
        "entries": [
            citation("सारावली", "धर्महीनो दुःखी कृपणः भ्रातृहीनः सुतवर्जितः।\nनवमस्थे केतौ जातो जनद्वेष्यो भवेन्नरः॥"),
            citation("फलदीपिका", "पापमतिः धर्महीनो नवमे।"),
            citation("जातक पारिजात", "नवमे केतौ धर्मघ्नः पिशुनः पापकर्मा च।\nभ्रातृपुत्रविहीनश्च परदेशरतो भवेत्॥"),
        ],
        **summary(
            "नवम भावमा केतु हुँदा धर्मको स्थापित परम्पराप्रति असन्तोष, भाग्यमा ढिलाइ र पितासँग मतभेद हुन सक्छ। तर जातक वैदेशिक यात्रा र गूढ धर्म-दर्शनमा लीन हुन्छ।",
            "नवम भाव धर्म र पिताको घर हो। केतु यहाँ बस्दा कर्मकाण्डी धर्मभन्दा माथि उठेर आत्मज्ञान वा मोक्षको खोजमा व्यक्तिलाई लैजान्छ। यद्यपि बाह्य रूपमा ग्रन्थहरूले 'धर्महीन' भनेका छन्, तर वास्तवमा यसले आडम्बरयुक्त धर्मको विरोध र सच्चा अध्यात्मको खोजी गराउँछ। जातक विदेश यात्राबाट लाभान्वित हुन्छ।",
            "With Ketu in the 9th house, there can be discontent with established religious tradition, delays in fortune, and differences of opinion with the father. However, the native becomes absorbed in foreign travel and esoteric religious philosophy. The 9th house is the house of dharma and the father. Ketu here takes the native beyond ritualistic religion toward self-knowledge or liberation. Though the texts outwardly call this 'dharma-hin' (irreligious), it actually manifests as opposition to hollow ritualism and a search for genuine spirituality. The native benefits from foreign travel.",
        ),
    },
    10: {
        "entries": [
            citation("सारावली", "प्रसिद्धः चतुरः शूरो राजपूज्यो धनी सुखी।\nकर्मस्थे केतौ जातो परोपकारी भवेन्नरः॥"),
            citation("फलदीपिका", "सत्कर्महीनः प्रतापी दशमे।"),
            citation("सर्वार्थचिन्तामणि", "दशमगे केतौ प्रतापी चतुरः सुखी।\nकर्मसिद्धिकरश्चैव परोपकारिणां वरः॥"),
        ],
        **summary(
            "दशम भावमा केतु हुनु अत्यन्त शुभ मानिन्छ। जातक प्रतापी, चतुर, सुखी, कर्मसिद्धिकर (काममा सफलता पाउने), परोपकारी र प्रसिद्ध हुन्छ।",
            "दशम भाव कर्मको स्थान हो। दशममा केतु बस्दा जातकले आफ्नो क्षेत्रमा अद्वितीय काम गरेर नाम र दाम कमाउँछ। परोपकार र समाजसेवामा जातकको ठूलो योगदान हुन्छ। जातक प्राविधिक, अनुसन्धान वा धार्मिक/आध्यात्मिक सङ्गठनमा उच्च पद प्राप्त गर्दछ।",
            "Ketu in the 10th house is considered highly auspicious. The native is powerful, clever, happy, successful in undertakings, charitable, and renowned. The 10th house is the house of career. Ketu here lets the native earn fame and fortune through unique work in their field. The native contributes greatly to charity and social service, and attains a high position in technical, research, or religious/spiritual organizations.",
        ),
    },
    11: {
        "entries": [
            citation("सारावली", "दीर्घायुः श्रीमान् शूरो गुणवान् सुतवान् धनी।\nलाभस्थे केतौ जातो शत्रुहन्ता भवेन्नरः॥"),
            citation("फलदीपिका", "सञ्चयी श्रीमान् लाभगे।"),
            citation("जातक पारिजात", "एकादशे केतौ जातो बहुलाभो सुभाग्यवान्।\nसर्वकार्याणि सिद्धिश्च सर्वसम्पत्समन्वितः॥"),
        ],
        **summary(
            "एकादश भावमा केतु रहनु सर्व-कार्य सिद्धि र अपार लाभको सूचक हो। जातक सञ्चयी (धन जम्मा गर्ने), श्रीमान् (ऐश्वर्यशाली), सौभाग्यवान्, बहुलाभ प्राप्त गर्ने र दीर्घायु हुन्छ।",
            "एकादश भावमा केतुले सबै इच्छा पूर्ति गराउँछ। जातकले कम मिहिनेतमा पनि धेरै धन र सफलता हासिल गर्छ। शेयर, गूढ व्यवसाय वा वैदेशिक स्रोतबाट निरन्तर आय भइरहन्छ। सन्तान र भाइभतिजाबाट पनि सहयोग मिल्छ।",
            "Ketu in the 11th house indicates the fulfilment of every undertaking and immense gain. The native accumulates wealth, is prosperous, fortunate, gains through multiple sources, and is long-lived. Ketu in the 11th fulfils every desire. The native achieves great wealth and success with comparatively little effort. Continuous income flows in from stocks, occult ventures, or foreign sources, and support also comes from children and relatives.",
        ),
    },
    12: {
        "entries": [
            citation("सारावली", "कृपणः दुःखी गुप्तपापी व्ययी चैव दरिद्रवान्।\nद्वादशस्थे केतौ जातो नेत्ररोगी भवेन्नरः॥"),
            citation("फलदीपिका", "मोक्षकाङ्क्षी च द्वादशे।"),
            citation("सर्वार्थचिन्तामणि", "द्वादशगे केतौ मोक्षगामी व्ययी शुचिः।\nनेत्ररोगी च विकलो गुप्तपापी कदाचन॥"),
        ],
        **summary(
            "द्वादश भावमा केतु रहनु मोक्ष प्राप्तिको उत्तम योग हो। जातक पवित्र मन भएको, धार्मिक खर्च गर्ने र अध्यात्मवादी हुन्छ। यद्यपि आँखाको दृष्टिमा अलि समस्या वा फजुल खर्च हुनसक्छ।",
            "ज्योतिषशास्त्रमा १२ औँ भावको केतुलाई 'मोक्षकारक' मानिन्छ। फलदीपिका र सर्वार्थचिन्तामणि अनुसार यस्तो जातक संसारका मायामोहबाट मुक्त भई अन्तिममा मोक्ष वा परम गति प्राप्त गर्दछ। जातकले धार्मिक वा परोपकारी कार्यमा धन खर्च गर्छ। विदेश यात्रा र ध्यान/योग साधनाका लागि यो स्थिति सर्वोत्कृष्ट मानिन्छ।",
            "Ketu in the 12th house is an excellent yoga for attaining liberation. The native has a pure mind, spends on religious causes, and is spiritually inclined. There can, however, be some eye trouble or wasteful spending. In astrology, Ketu in the 12th house is considered a 'moksha-karaka'. Per Phaladeepika and Sarvartha Chintamani, such a native ultimately becomes free of worldly illusion and attains liberation or the supreme state. The native spends money on religious or charitable work. This placement is considered ideal for foreign travel and meditation/yoga practice.",
        ),
    },
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    for graha, houses_data, rating_map in (
        ("rahu", RAHU_HOUSES, RAHU_RATING),
        ("ketu", KETU_HOUSES, KETU_RATING),
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
