"""Replace ``grahaHouseSaravali["venus"]`` with a corrected, complete
12-house table sourced from a user-supplied document, in the same
"four citations + one unified reading per house" shape
``ingest_mercury_house_multi_source.py`` introduced.

Like budha's document, शुक्र's document gives all **four** classical
citations per house — सारावली, फलदीपिका, होरासार and जातक पारिजात, every
house, every source — followed by a single "एकीकृत नेपाली अर्थ र विस्तृत
ज्योतिषीय व्याख्या" covering all four shlokas together. So each
``entries[]`` object here carries only ``shloka``/``shlokaSourceNe``/
``shlokaSourceEn`` (no meaning/explanation keys), and the unified reading
is stored once per house on ``summaryNe``/``summaryEn``. This also
replaces the previous table's short generic ("वैदिक ज्योतिष सन्दर्भ")
single-citation entries and fills in house 4, which previously had none.

`rating` isn't labelled in the source document, so each house's rating is
inferred from its content's overall sentiment, same as mercury's table.

English (`summaryEn`) is hand-translated from the Nepali summary, same
convention as sun's/mercury's tables.

Run from the repo root: ``python scripts/ingest_venus_house_multi_source.py``
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

# Not labelled in the source; inferred from each house's content sentiment.
HOUSE_RATING = {
    1: "uttam",    # मालव्य योग सरह — रूप, आकर्षण, दीर्घायु, वैभव
    2: "shubh",    # स्वोपार्जित धनी, दानी, राजाश्रय
    3: "mishrit",  # तेजस्वी/शूर तर कृपण र भ्रातृहीनताको सङ्केत
    4: "uttam",    # दिग्बली — गृह-वाहन सुख, मातृसुख पूर्ण
    5: "uttam",    # महाधनी, मन्त्री/राजपूज्य, मेधावी
    6: "mishrit",  # शत्रुहन्ता तर कामुकता/क्लेश/रोगको सङ्केत
    7: "shubh",    # सुन्दर-धनी जीवनसाथी तर कामुकताप्रति सतर्कताको सङ्केत
    8: "uttam",    # राजयोग सरह — दीर्घायु, भूमिपति, महाधनी
    9: "uttam",    # महाभाग्यशाली, धार्मिक, विद्वान्
    10: "uttam",   # उच्च सफलता, राजपूज्य/मन्त्री, यशस्वी
    11: "uttam",   # सर्वलाभप्रद, विपुल धन, सर्वसमृद्धि
    12: "mishrit", # शुभ भए राम्रो फल, पीडित भए कष्ट — दुवैतिर सशर्त
}

SOURCE_EN = {
    "सारावली": "Saravali",
    "फलदीपिका": "Phaladeepika",
    "होरासार": "Horasara",
    "जातक पारिजात": "Jataka Parijata",
}


def citation(source_ne: str, shloka: str) -> dict:
    return {
        "shloka": shloka,
        "shlokaSourceNe": source_ne,
        "shlokaSourceEn": SOURCE_EN[source_ne],
    }


VENUS_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "कामी कान्तिमान् सुभगः वस्त्रभूषणभूषितः।\nतनौ शुक्रे जातो ज्ञानी चित्रकाव्यरतः सुखी॥"),
            citation("फलदीपिका", "सुतनुः कान्तेक्षणश्चारुदेहः सुखी चिरायुः।\nलग्ने शुक्रे जनवल्लभः चित्रकाव्यरतः श्रीमान्॥"),
            citation("होरासार", "सुतनुः कान्तिमान् सुभगः वस्त्रभूषणभूषितः।\nलग्नस्थे भृगुपुत्रे तु ज्ञानी चित्रकाव्यरतः॥"),
            citation("जातक पारिजात", "लग्ने शुक्रे सुतनुः कान्तो दीर्घायुः जनवल्लभः।\nचित्रकाव्यरतः श्रीमान् वस्त्रभूषणभूषितः॥"),
        ],
        "summaryNe": "प्रथम भाव (लग्न) मा शुक्र स्थित हुनु (विशेष गरी स्वगृही वा उच्च भई मालव्य योग बन्दा) अत्यन्त शुभ र वैभवशाली मानिन्छ। चारै ग्रन्थहरूको एकीकृत निष्कर्ष अनुसार लग्नस्थ शुक्रले जातकलाई अत्यन्त सुन्दर, कान्तिमान्, आकर्षक नेत्र र शरीर भएको, दीर्घायु, र सर्वजनप्रिय बनाउँछ। व्यक्ति वस्त्र, आभूषण, सुगन्ध र सजावटका सामानहरूले युक्त रहन्छ। कला, सङ्गीत, चित्रकला र काव्यमा विशेष रुचि हुन्छ र जीवनभर भौतिक सुख-सुविधा, वैभव र वैवाहिक आनन्द प्राप्त गर्दछ।",
        "summaryEn": "Venus placed in the 1st house (Lagna) — especially when it forms Malavya yoga (own or exalted sign) — is considered highly auspicious and glamorous. The combined verdict of all four texts is that Venus in the Lagna makes the native very beautiful, radiant, with attractive eyes and body, long-lived, and popular with everyone. The person is well provided with clothes, jewelry, fragrances and adornments. They have a particular fondness for art, music, painting and poetry, and enjoy material comfort, splendor and marital happiness throughout life.",
    },
    2: {
        "entries": [
            citation("सारावली", "दाता दयावान् सुतवान् मिष्टान्नपानभुक् धनी।\nद्वितीयस्थे भृगौ जातो राजाश्रयो जनप्रियः॥"),
            citation("फलदीपिका", "कविरमलवचाः स्वोपार्जितविभवः धनगतः।\nमिष्टान्नपानभोक्ता ससकलमहिमा जनप्रियः॥"),
            citation("होरासार", "दाता धनवान् सुतवान् मिष्टान्नपानभुक् सुखी।\nद्वितीयस्थे भृगौ जातो राजाश्रयो जनप्रियः॥"),
            citation("जातक पारिजात", "द्वितीयगे भृगुसुते बहुवित्तवान् कविरमलवचा वाग्मी।\nस्वोपार्जितार्थाविभवः सुभगश्च दाता जनप्रियः॥"),
        ],
        "summaryNe": "दोस्रो भाव (धन भाव) मा शुक्र स्थित हुँदा व्यक्ति आफ्नै बुद्धि, कला र परिश्रमले प्रचुर धन आर्जन (स्वोपार्जित धन) गर्दछ। जातक कवि, सुवक्ता वा निर्मल र मिठासपूर्ण वाणी बोल्ने हुन्छ। व्यक्ति दानी, दयालु, स्वादिष्ट र मीठो भोजनको शौकीन, र राज्य वा उच्च वर्गबाट सहयोग पाउने हुन्छ। परिवारमा सुख-शान्ति रहन्छ र धनधान्यको कहिल्यै कमी हुँदैन।",
        "summaryEn": "With Venus placed in the 2nd house (house of wealth), the native earns abundant wealth through their own intellect, artistry and effort (self-earned wealth). The native is a poet or eloquent speaker with clear, sweet speech. The person is charitable, kind, fond of tasty and sweet food, and receives support from the state or the upper class. Peace and happiness prevail in the family, and there is never a shortage of wealth and grain.",
    },
    3: {
        "entries": [
            citation("सारावली", "कृपणः सुतवान् शूरः भ्रातृहीनश्च साहसी।\nसहजस्थे भृगौ जातो तेजस्वी जनपूजितः॥"),
            citation("फलदीपिका", "अकृपणः सुखदः स्त्रीरहितः सहजगे।\nअल्पभ्रातृयुतः शूरः तेजस्वी जनपूजितः॥"),
            citation("होरासार", "कृपणः सुतवान् शूरः भ्रातृहीनश्च साहसी।\nतृतीयस्थे भृगौ जातो तेजस्वी जनपूजितः॥"),
            citation("जातक पारिजात", "सहजस्थिते भृगुपुत्रे कृपणः शूरः सुतवान् साहसी।\nभ्रातृहीनश्च तेजस्वी जनपूजितः सुवेषः॥"),
        ],
        "summaryNe": "तेस्रो भाव (सहज भाव) मा शुक्र रहँदा मध्यम-शुभ फल मिल्छ। जातक शूरवीर, साहसी, तेजस्वी र जनपूजित हुन्छ। यद्यपि, धनको मामिलामा केही कृपण (कन्जुस) वा धन सञ्चयमा विशेष ध्यान दिने स्वभाव हुन सक्छ। दाजुभाइ वा सहोदरको सुखमा केही कमी वा मतभेद हुन सक्छ। कला, लेखन, सञ्चार र ललितकलामा विशेष सफलता मिल्छ।",
        "summaryEn": "With Venus in the 3rd house (house of valor/siblings), the results are moderately auspicious. The native is valorous, courageous, radiant and respected by people. However, they may be somewhat stingy about money, or particularly focused on accumulating it. There may be some reduction in, or friction with, the happiness of siblings. Particular success comes through art, writing, communication and the fine arts.",
    },
    4: {
        "entries": [
            citation("सारावली", "मातृसौख्यसमायुक्तः सुहृद्वान् बन्धुपूजितः।\nसुखस्थे भृगौ जातो वाहनवान् जनप्रियः॥"),
            citation("फलदीपिका", "सुवाहनगृहाभरणवस्त्रसुगन्धयुतः सुहृदि।\nमातृप्रियः सुखी शान्तः बहुद्रव्यसमन्वितः॥"),
            citation("होरासार", "मातृसौख्यसमायुक्तः सुहृद्वान् बन्धुपूजितः।\nचतुर्थस्थे भृगौ जातो वाहनवान् जनप्रियः॥"),
            citation("जातक पारिजात", "चतुर्थगे भृगुसुते मातृसौख्यसमायुक्तः सुहृद्वान्।\nवाहनधान्यसमन्वितः विविधसुखैः समृद्धः॥"),
        ],
        "summaryNe": "चौथो भाव (सुख भाव) मा शुक्र रहनु (दिग्बली हुनु) अत्यन्त उत्तम मानिन्छ। यसले जातकलाई उत्तम गृह, जग्गाजमिन, राम्रा वाहनहरू (गाडी), वस्त्र, आभूषण र सुगन्धित वस्तुहरूको पूर्ण सुख दिन्छ। आमाको पूर्ण स्नेह र आशीर्वाद मिल्छ। इष्टमित्र र नातेदारहरूमा प्रिय भई व्यक्तिले जीवनमा अनेक प्रकारका भौतिक र मानसिक सुख-सुविधा उपभोग गर्दछ।",
        "summaryEn": "Venus in the 4th house (house of comfort) — where it has directional strength — is considered highly excellent. It grants the native a fine home, land, good vehicles, clothing, jewelry and fragrant possessions in full measure. They receive the mother's complete affection and blessing. Being dear to close friends and relatives, the native enjoys many kinds of material and mental comfort throughout life.",
    },
    5: {
        "entries": [
            citation("सारावली", "अतिलौल्प्यवान् सुतस्थे भृगौ तु मेधावी महाधनी।\nमन्त्री जनप्रियः श्रीमान् सुतवान् जनवल्लभः॥"),
            citation("फलदीपिका", "महाधनो नृपतिसमः सुतवान् पञ्चमस्थे।\nप्रचुरसुतयुतः धीमान् मान्त्रिकः काव्यकृत्सुखी॥"),
            citation("होरासार", "नृपमन्त्री नेता वा स्त्रीजनको ज्ञानवान् सिते धीस्थे।\nकुशाग्रबुद्धिः सुतवान् काव्यशास्त्रकलाप्रवीणः॥"),
            citation("जातक पारिजात", "पञ्चमगे भृगुपुत्रे बहुधनो नृपतिसमः सुतवान्।\nमन्त्री वा राजपूज्यो महाप्रतिभासमेतः॥"),
        ],
        "summaryNe": "पाँचौँ भावमा शुक्र स्थित हुनाले जातक कुशाग्र बुद्धि, तीव्र मेधाशक्ति र काव्य-साहित्यमा निपुण हुन्छ। व्यक्ति महाधनी, राजा वा सरकारको मन्त्री वा मुख्य सल्लाहकार सरह उच्च पद प्राप्त गर्ने हुन्छ। असल सन्तान (विशेष गरी सुलक्षणा पुत्री तथा सुपुत्र) को सुख मिल्छ। बुद्धि र प्रतिभाका बलमा समाजमा ठूलो मान-सम्मान र प्रसिद्धि कमाउँछ।",
        "summaryEn": "With Venus in the 5th house, the native has a sharp intellect, keen intelligence, and skill in poetry and literature. The person is greatly wealthy and attains a high position, akin to a minister or chief advisor to a ruler or government. They enjoy the happiness of good children (especially a well-endowed daughter or son). Through intellect and talent, they earn great honor and fame in society.",
    },
    6: {
        "entries": [
            citation("सारावली", "शत्रुहीनः कृपणः क्रोधी दुःखितः परिभूषितः।\nषष्ठस्थे भृगुपुत्रे तु स्त्रीहेतोः क्लेशभाग् भवेत्॥"),
            citation("फलदीपिका", "अरिहा धनहीनः कामुकः षष्ठगे दुःखितः।\nस्त्रीहेतोः कलहप्रिया परिभवसहितः चापि प्रजायते॥"),
            citation("होरासार", "शत्रुक्षयी च षष्ठे मायावी रोगवान् गतार्थसुतः।\nकपटपरो व्ययशीलः स्त्रीहेतोः दुःखभाग् भवेत्॥"),
            citation("जातक पारिजात", "षष्ठस्थिते भृगुसुते अरिहन्ता धनहीनः कामुकः।\nस्त्रीहेतोः क्लेशभाग् रोगी दुःखितश्च प्रजायते॥"),
        ],
        "summaryNe": "छैटौँ भावमा शुक्र रहँदा मिश्रित फल मिल्छ। एकातिर जातक शत्रुहन्ता (शत्रुहरूलाई परास्त गर्ने) हुन्छ भने अर्कातिर अत्यधिक कामुकता वा विपरीत लिङ्गीका कारण जीवनमा तनाव, विवाद वा अपमान झेल्नुपर्ने हुन सक्छ। धन सञ्चयमा बाधा, स्वास्थ्यमा गुप्त रोग वा कफ-वातको समस्या र स्त्री-पक्षबाट क्लेश वा विवाद हुन सक्ने योग बन्दछ।",
        "summaryEn": "Venus in the 6th house brings mixed results. On one hand the native destroys enemies, but on the other, excessive passion or entanglements with the opposite sex can bring stress, conflict or humiliation into life. There can be obstacles to accumulating wealth, hidden illness or a phlegm-wind type health issue, and a tendency toward distress or dispute originating from women.",
    },
    7: {
        "entries": [
            citation("सारावली", "कामी कान्तिमान् सुभगः सुन्दरभार्यासमन्वितः।\nअस्ते भृगौ तु जातो जनप्रियः सर्वपूजितः॥"),
            citation("फलदीपिका", "सुभार्यः असतीरतः मृतकलत्रः मदगे।\nअतिरागी चारुवेषः बहुस्त्रीसङ्गरतः धनी॥"),
            citation("होरासार", "स्मरणनिपुणो जामित्रे मित्रद्वेषी प्रधानजनबन्धुः।\nअतिरागी सुन्दरस्त्रीसहितः लोकविश्रुतः॥"),
            citation("जातक पारिजात", "सप्तमगे भृगुपुत्रे चारुवेषो अतितेजस्वी प्राज्ञः।\nरूपवतीं गुणयुक्तां लभते भार्यां सवित्तां च॥"),
        ],
        "summaryNe": "सातौँ भाव (विवाह भाव) मा शुक्र रहनु अत्यन्त शुभ र आकर्षक योग हो। जातक आफैँ सुन्दर, आकर्षक, सुवेषधारी र प्रख्यात हुन्छ। उसको विवाह अत्यन्त रूपवती, गुणी, र धनी परिवारकी स्त्रीसँग हुन्छ। यद्यपि, केही ग्रन्थहरूका अनुसार अत्यधिक कामुकता वा परस्त्री/परपुरुषप्रतिको आकर्षणले वैवाहिक जीवनमा सतर्कता अपनाउनुपर्ने सङ्केत गर्दछ। व्यापार र साझेदारीमा विशेष लाभ मिल्छ।",
        "summaryEn": "Venus in the 7th house (house of marriage) is a highly auspicious and attractive yoga. The native is themselves beautiful, attractive, well-dressed and renowned. Their marriage is to a very beautiful, virtuous spouse from a wealthy family. However, some texts note that excessive passion or attraction to others outside the marriage signals a need for caution in married life. Particular gains come through business and partnerships.",
    },
    8: {
        "entries": [
            citation("सारावली", "दीर्घायुः ख्यातकीर्तिश्च बहुवित्तसमन्वितः।\nअष्टमस्थे भृगुपुत्रे भूपतिरुपजायते॥"),
            citation("फलदीपिका", "चिरञ्जीवी अष्टमे धनवान् भूमीपतिः।\nख्यातकीर्तिः गुणवान् महान् कुलश्रेष्ठः॥"),
            citation("होरासार", "निधने स्वभावबहुलो रोगी सुतदारवांश्च सन्तुष्टः।\nदीर्घायुश्च महाधनी भूपतिरुपजायते॥"),
            citation("जातक पारिजात", "अष्टमगे भृगुपुत्रे दीर्घायुः ख्यातकीर्तिमान् सुकृती।\nबहुवित्तवान् भूमीपतिः सन्तुष्टश्च प्रजायते॥"),
        ],
        "summaryNe": "आठौँ भावमा शुक्र रहनु ज्योतिषीय दृष्टिले अत्यन्त शुभ मानिन्छ (शुक्र अष्टममा रहँदा राजयोग सरह फल दिन्छ)। चारै ग्रन्थका अनुसार अष्टमस्थ शुक्रले व्यक्तिलाई दीर्घायु (चिरञ्जीवी), अत्यन्त धनी, प्रख्यात, भूमिपति (जग्गाजमिन र सम्पत्तिको मालिक), र राजा वा उच्च प्रशासक बनाउँछ। सन्तान र परिवारको सुख मिल्छ तथा गुप्त धन वा पैतृक सम्पत्ति प्राप्त हुने प्रबल योग बन्दछ।",
        "summaryEn": "Venus in the 8th house is regarded, astrologically, as highly auspicious (Venus here gives results akin to a raja yoga). Per all four texts, Venus in the 8th makes the person long-lived, very wealthy, renowned, a landowner (master of land and property), and a ruler or high administrator. They enjoy the happiness of children and family, and there is a strong likelihood of gaining hidden wealth or ancestral property.",
    },
    9: {
        "entries": [
            citation("सारावली", "धार्मिकः सुकृती विद्वान् धनवान् धर्मसंस्रितः।\nधर्मस्थे भृगुपुत्रे तु महाभाग्यसमन्वितः॥"),
            citation("फलदीपिका", "सदारसुहृदात्मजः क्षितिपललब्धभाग्यः शुभे।\nविद्याचारधर्मैः सहितः अतिवाग्मी सुखी॥"),
            citation("होरासार", "धीधर्मभोगयुक्तो नवमे सुतदारवान् सिते बलिनि।\nमहाभाग्यसमन्वितः सत्यवादी जनप्रियः॥"),
            citation("जातक पारिजात", "नवमस्थे भृगुपुत्रे धार्मिक आचारवान् महाविद्वान्।\nसदारसुहृदात्मजः क्षितिपललब्धभाग्यः सुखी॥"),
        ],
        "summaryNe": "नवौँ भाव (भाग्य भाव) मा शुक्र स्थित हुनाले व्यक्ति महाभाग्यशाली, धार्मिक र सदाचारी हुन्छ। जातक विद्वान्, प्रचुर धनले युक्त, सत्यवादी, जनप्रिय, र सरकार वा राज्यबाट भाग्यविभव पाउने हुन्छ। व्यक्तिले असल जीवनसाथी, उत्तम सन्तान र सच्चा मित्रहरूको सुख पाउँछ। धर्म, तीर्थाटन, र परोपकारी कार्यहरूमा विशेष रुचि रहन्छ।",
        "summaryEn": "With Venus in the 9th house (house of fortune), the native is greatly fortunate, religious and virtuous. They are learned, abundantly wealthy, truthful, popular, and gain fortune and standing through the state or government. The native enjoys a good spouse, fine children and true friends. They take a particular interest in dharma, pilgrimage and charitable work.",
    },
    10: {
        "entries": [
            citation("सारावली", "सुविद्याबलमतिसुखकीर्तिसत्कर्मान्वितः खे।\nदशमे भृगौ स्थिते जातो राजमान्यो महामतिः॥"),
            citation("फलदीपिका", "नभस्यतियशः सुहृत्सुखितवृत्तिः नृपप्रियः।\nसिद्धारम्भः महामतिः सत्कर्मनिरतः सुखी॥"),
            citation("होरासार", "स्त्रीदयितो नृपमन्त्री दशमे शुक्रे जलादिधर्मपरः।\nसत्कर्मनिरतो धीमान् यशोयुक्तो धनी॥"),
            citation("जातक पारिजात", "दशमे भृगुपुत्रे अतियशः सुहृत्सुखितवृत्तिः।\nनृपमन्त्री राजपूज्यो जलादिधर्मपरः॥"),
        ],
        "summaryNe": "दशौँ भाव (कर्म भाव) मा शुक्र हुनाले व्यक्ति आफ्नो कार्यक्षेत्रमा उच्च सफलता, मान-सम्मान र प्रतिष्ठा प्राप्त गर्दछ। व्यक्ति सुविद्या, कुशाग्र बुद्धि, सत्कर्म र जनहितका सार्वजनिक कार्यहरूमा संलग्न हुन्छ। व्यक्ति सरकार वा राज्यद्वारा सम्मानित (राजपूज्य/मन्त्री सरह), महिला वर्गमा प्रिय, र व्यापार वा कलात्मक व्यवसायबाट अभूतपूर्व धन आर्जन गर्ने हुन्छ।",
        "summaryEn": "Venus in the 10th house (house of career) brings great success, honor and standing in the native's professional field. The person engages in good learning, sharp intellect, virtuous conduct and public welfare work. They are honored by the state or government (akin to a minister or a ruler's confidant), popular among women, and earn extraordinary wealth through business or artistic ventures.",
    },
    11: {
        "entries": [
            citation("सारावली", "विपुलधनवान् सुखी जनप्रियः सत्यसन्धः।\nएकादशे भृगौ स्थिते सर्वलाभप्रदो भवेत्॥"),
            citation("फलदीपिका", "धनाढ्यः परस्त्रीरतः अनेकसौख्यः भवेत्।\nबहुप्रकारैर्धनवान् भृत्यवान् सत्यसन्धः॥"),
            citation("होरासार", "प्राज्ञो धनी दयावाँल्लाभे शुक्रेऽतिलाभसन्तुष्टः।\nबहुप्रकारैर्धनवान् सर्वसमृद्धिसंयुतः॥"),
            citation("जातक पारिजात", "एकादशगे भृगुपुत्रे धनाढ्यो परस्त्रीरतः।\nअनेकसौख्यसम्पन्नः प्राज्ञो दयावान् सुखी॥"),
        ],
        "summaryNe": "एघारौँ भाव (लाभ भाव) मा शुक्र स्थित हुनु अत्यन्त शुभ र सर्वलाभप्रद मानिन्छ। जातक विपुल धनको स्वामी, अतिशय सुखी, दयालु, प्राज्ञ र जनप्रिय हुन्छ। विभिन्न स्रोत र व्यवसायहरू (कला, व्यापार, लगानी) बाट निरन्तर धन लाभ भइरहन्छ। यद्यपि, केही ग्रन्थहरूका अनुसार परस्त्री वा विपरीत लिङ्गीहरूप्रति बढी आकर्षित हुने प्रवृत्ति रहन सक्छ, तर आर्थिक दृष्टिले यो स्थान अत्यन्त फलदायी हुन्छ।",
        "summaryEn": "Venus in the 11th house (house of gains) is considered highly auspicious and all-round beneficial. The native is master of abundant wealth, exceedingly happy, kind, wise and popular. Wealth keeps flowing in through various sources and ventures (art, business, investment). Some texts note a tendency toward attraction to others outside marriage, but financially this placement is extremely fruitful.",
    },
    12: {
        "entries": [
            citation("सारावली", "दीनो विद्याविहीनः व्ययशीलः सुदुःखितः।\nद्वादशस्थे भृगुपुत्रे कामुकः परिभूषितः॥"),
            citation("फलदीपिका", "भृगुर्जयति व्यये सुरतिसौख्यवित्तद्युतिम्।\nमहाधनी स्वोपार्जितविभवः शयनसुखप्रदः॥"),
            citation("होरासार", "स्त्रीलोलो व्ययसंस्थे धर्मव्यसनी स्वकर्मपरिहीनः।\nक्षेत्रोच्चव्ययभवने धनवान् प्रसिद्धयुवतीशः॥"),
            citation("जातक पारिजात", "द्वादशगे भृगुपुत्रे सुरतिसौख्यवित्तद्युतिम्।\nस्वोपार्जितार्थाविभवः क्षेत्रोच्चगे महाधनी॥"),
        ],
        "summaryNe": "बाह्रौँ भाव (व्यय भाव) मा शुक्र रहनु अन्य ग्रहहरूको तुलनामा विशेष फलदायी मानिन्छ (शुक्र बाह्रौँ भावमा व्ययकारक भई शुभ फल दिन्छ)। यदि अकारक वा पीडित भएमा विद्यामा बाधा, अधिक खर्च (व्ययशील) वा कामुकताले कष्ट दिन्छ; तर यदि शुक्र शुभ राशि, आफ्नै वा उच्च राशिमा भएमा व्यक्तिलाई शयन सुख (उत्तम शय्या र कामसुख), अपार धन, र वैदेशिक क्षेत्र वा विलासिताका साधनहरूबाट ठूलो समृद्धि प्राप्त हुन्छ।",
        "summaryEn": "Venus in the 12th house (house of expenditure) is considered especially fruitful compared to other grahas here (Venus, as natural karaka of expenditure and pleasure, gives good results in this house). If afflicted or poorly placed, it hinders learning, causes excessive spending, or brings trouble through passion; but if Venus sits in an auspicious, own, or exalted sign, it grants the native comfort in bed and intimacy, immense wealth, and great prosperity through foreign connections or luxury.",
    },
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    table["venus"] = {
        str(house): {
            "house": house,
            "houseTheme": HOUSE_THEME[house],
            "rating": HOUSE_RATING[house],
            "entries": payload["entries"],
            "summaryNe": payload["summaryNe"],
            "summaryEn": payload["summaryEn"],
        }
        for house, payload in VENUS_HOUSES.items()
    }

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
