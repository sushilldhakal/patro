"""Replace ``grahaHouseSaravali["mercury"]`` with a corrected, complete
12-house table sourced from a user-supplied document, using the
``entries`` schema ``ingest_sun_house_multi_source.py`` introduced.

Unlike sun's document (a separate अर्थ + व्याख्या per grantha, per house),
budha's document gives **four** classical citations per house — सारावली,
फलदीपिका, होरासार and जातक पारिजात, every house, every source, no source
ever skipped — followed by a single "एकीकृत नेपाली अर्थ र विस्तृत
ज्योतिषीय व्याख्या" (a unified reading) covering all four shlokas
together, not a separate reading per shloka. So each `entries[]` object
here carries only `shloka`/`shlokaSourceNe`/`shlokaSourceEn` (no
`meaningNe`/`explanationNe` — those keys are simply absent, matching the
now-optional fields on `BhavaReferenceHouseSaravaliEntry`), and the
unified reading is stored once per house on the new `summaryNe`/
`summaryEn` fields the dialog renders after listing all four shlokas.

`rating` isn't labelled in the source document, so each house's rating is
inferred from its content's overall sentiment (see inline comments below)
using the same `ratingLabel` vocabulary as every other graha's table.

English (`summaryEn`) is hand-translated from the Nepali summary, same
convention as sun's `meaningEn`/`explanationEn`.

Run from the repo root: ``python scripts/ingest_mercury_house_multi_source.py``
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
    1: "uttam",    # दीर्घायु, महाविद्वान्, प्रियदर्शन — uniformly glowing across all 4 sources
    2: "shubh",    # स्वोपार्जित धनी, धार्मिक, सुखी
    3: "mishrit",  # पराक्रमी तर कडा परिश्रम आवश्यक, मध्यम आयु
    4: "uttam",    # पूर्ण सुख, मातृसुख, वाहन-धनधान्य
    5: "uttam",    # महामेधावी, राजपूजित/मन्त्री
    6: "mishrit",  # क्रोधी/निष्ठुर/विवाद तर शत्रुनाशक पनि
    7: "uttam",    # प्राज्ञ, धनी-गुणी जीवनसाथी, महिमा
    8: "shubh",    # दीर्घायु, ख्यातकीर्ति, राजसम्मान — अष्टम भएपनि बुधलाई शुभ
    9: "uttam",    # महाभाग्यशाली, धार्मिक, विद्वान्
    10: "uttam",   # सिद्धारम्भ, राजमान्य, यशस्वी
    11: "uttam",   # प्रचुर धनदायक, दीर्घायु, सेवकयुक्त
    12: "kamjor",  # दीन, विद्याविहीन, क्रूर, दुःखित
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


MERCURY_HOUSES: dict[int, dict] = {
    1: {
        "entries": [
            citation("सारावली", "विद्वान् सुवक्ता निपुणः कार्यज्ञः प्रियदर्शनः।\nदीर्घायुः प्रथितो धीमान् तनौ सौम्ये स्थिते भवेत्॥"),
            citation("फलदीपिका", "दीर्घायुर्जन्मनि ज्ञे मधुरचतुरवाक् सर्वशास्त्रार्थबोधः।"),
            citation("होरासार", "विद्वान् धनी दयावान् बुधलग्ने धर्मवान् सुवेषश्च।\nप्रथितः प्रवीणबुद्धिः प्रियवागपगतभयो गुणज्ञश्च॥"),
            citation("जातक पारिजात", "विद्वान् कलाकुशलकर्मपटुः सुरूपो धीमान् तनौ शशिसुते सुकृती विनीतः।\nदीर्घायुषं जनयति प्रथितं प्रशान्तं धर्मान्वितं च बहुशास्त्रकलाप्रवीणम्॥"),
        ],
        "summaryNe": "प्रथम भाव (लग्न) मा बुध स्थित हुनु अत्यन्त शुभ र गुणकारी मानिन्छ। चारै शास्त्रीय ग्रन्थहरूको एकीकृत निष्कर्ष अनुसार लग्नस्थ बुधले जातकलाई दीर्घायु, महाविद्वान्, मिठासपूर्ण र चतुर वाणी भएको, तथा सर्वशास्त्रको मर्म बुझ्ने तीक्ष्ण बुद्धि प्रदान गर्दछ। व्यक्ति हेर्नमा सुन्दर, प्रियदर्शन र शान्त स्वभावको हुन्छ। कला, गणित, लेखन, व्यापार र कार्यसम्पादनमा निपुण भई समाजमा उच्च मान-प्रतिष्ठा तथा दीर्घजीवन प्राप्त गर्दछ।",
        "summaryEn": "Mercury placed in the 1st house (Lagna) is considered highly auspicious and beneficial. The combined verdict of all four classical texts is that Mercury in the Lagna gives the native long life, deep learning, sweet and clever speech, and a sharp intellect that grasps the essence of every scripture. The person is good-looking, pleasant to behold, and calm in temperament. Skilled in the arts, mathematics, writing, business and getting things done, they attain high standing in society along with a long life.",
    },
    2: {
        "entries": [
            citation("सारावली", "धनवान् धार्मिकः सुखी मिष्टभाषी जितेन्द्रियः।\nसुमुखः सर्वविद्यावित् वित्ते सौम्ये स्थिते भवेत्॥"),
            citation("फलदीपिका", "स्याद्बुद्धयोगार्जितस्वः कविरमलवचा वाग्मी मिष्टान्नभोक्ता॥"),
            citation("होरासार", "वित्ते धनी सुभगः सुवाक् प्रसन्नात्मा।\nबहुशास्त्रकलावेत्ता बुधगे वित्ते स्थिरप्रज्ञः॥"),
            citation("जातक पारिजात", "वित्ते बुधे बहुधनो विबुधप्रकाश्यो वाग्मी कविरमलवचाः सुमुखी सुशीलः।\nस्वोपार्जितार्थाविभवः सुभगश्च दाता शास्त्रानुरक्तमतिरभ्युदयञ्च याति॥"),
        ],
        "summaryNe": "दोस्रो भाव (धन भाव) मा बुध स्थित हुँदा जातकले आफ्नै बुद्धि, विवेक र योग्यताद्वारा धन आर्जन गर्दछ (स्वोपार्जित धन)। यस्ता व्यक्ति धनी, धार्मिक, जितेन्द्रिय, सुखी र सुमुखी हुन्छन्। यिनीहरूको वाणी निर्मल, सुमधुर, तर्कपूर्ण र प्रभावकारी हुन्छ। जातक कवि, लेखक वा प्रख्यात वक्ता हुन सक्छ, मीठो भोजनको शौकीन हुन्छ, र परिवार तथा समाजमा शास्त्रज्ञका रूपमा सम्मानित रहन्छ।",
        "summaryEn": "With Mercury placed in the 2nd house (house of wealth), the native earns wealth through their own intellect, judgment and skill (self-earned wealth). Such people are wealthy, righteous, self-controlled, happy and pleasant-faced. Their speech is clear, sweet, logical and persuasive. The native may become a poet, writer or renowned speaker, has a fondness for good food, and is respected in family and society as a scholar.",
    },
    3: {
        "entries": [
            citation("सारावली", "भ्रातृमान् साहसी शूरः सुतवान् ज्ञानसंयुतः।\nसहजस्थे बुधे जातो तेजस्वी धार्मिको भवेत्॥"),
            citation("फलदीपिका", "शौर्ये शूरः समायुः सुसहजसहितः सश्रमो दैन्ययुक्तः।"),
            citation("होरासार", "स्वगुणोपार्जितविभवो दुश्चिक्ये ज्ञानवान् धनी।\nभ्रातृयुक्तः सुशीलश्च बुधगे सहजस्थिते॥"),
            citation("जातक पारिजात", "सहजस्थिते शशिसुते सुसहोदराढ्यो धीमान् दयालुरतिधैर्युतः सुवेषः।\nस्वोपार्जितविभववान् परिपूर्णकामो धार्मिक्यपुण्यचरितो भुवि मानवः स्यात्॥"),
        ],
        "summaryNe": "तेस्रो भाव (सहज भाव) मा बुध रहँदा मध्यम-शुभ फल मिल्छ। जातक शूरवीर, साहसी, पराक्रमी, दाजुभाइ-भगिनीले युक्त र ज्ञानवान् हुन्छ। आफ्नै गुण र पुरुषार्थले धन आर्जन गर्दछ। यद्यपि, जीवनमा कडा परिश्रम (सश्रम) गर्नुपर्ने हुन्छ। जातकको आयु मध्यम रहन्छ, सञ्चार, सम्पादन र लेखन कार्यमा विशेष निपुणता रहन्छ।",
        "summaryEn": "With Mercury in the 3rd house (house of valor/siblings), the results are moderately auspicious. The native is valorous, courageous, mighty, blessed with siblings, and knowledgeable. They earn wealth through their own merit and effort. However, life demands considerable hard work. Lifespan stays moderate, with particular skill in communication, editing and writing.",
    },
    4: {
        "entries": [
            citation("सारावली", "विद्वान् चाटुवाक्यकुशलः बान्धवप्रियः सुखी।\nमातृसौख्यसमायुक्तः चतुर्थस्थे बुधे भवेत्॥"),
            citation("फलदीपिका", "संज्ञावान् चाटुवाक्यः सुहृदि सुखसुहृत्क्षेत्रधान्यार्थभोगी॥"),
            citation("होरासार", "सुखे विद्वान् सुहृद् बन्धुयुतः सुखी।\nवाहनधान्यसमन्वितः सौम्ये चतुर्थगे॥"),
            citation("जातक पारिजात", "बंधूढ्यो विविधसुखैः सुहृदां समृद्धो मातृप्रियो विविधयानपरिच्छदाढ्यः।\nविद्वान् विनीतचतुरश्चतुर्थगे ज्ञे तुष्टो नरो भवति सत्यरतः प्रतापी॥"),
        ],
        "summaryNe": "चौथो भाव (सुख भाव) मा बुध हुनु अत्यन्त सुखद र अनुकूल मानिन्छ। चतुर्थस्थ बुधले व्यक्तिलाई विद्वान्, अरूलाई प्रसन्न गराउने बोली (चाटुवाक्य) बोल्ने, र आमाको पूर्ण सुख दिने बनाउँछ। व्यक्ति असल मित्र, गृह, जग्गाजमिन, वाहन, र धनधान्यको पूर्ण भोग गर्ने हुन्छ। इष्टमित्र र बान्धवहरूका बीच प्रिय भई पारिवारिक जीवन आनन्दमय रहन्छ।",
        "summaryEn": "Mercury in the 4th house (house of comfort) is considered highly pleasant and favorable. Mercury here makes the person learned, pleasant-spoken (able to charm others with words), and grants full happiness from the mother. The native fully enjoys good friends, home, land, vehicles, and wealth and grain. Being dear to close friends and relatives, family life stays joyful.",
    },
    5: {
        "entries": [
            citation("सारावली", "सुतवान् ज्ञानसम्पन्नः मन्त्री वा राजपूजितः।\nसुतस्थे शशिसूनौ च मेधावी च नरो भवेत्॥"),
            citation("फलदीपिका", "विद्यासौख्यप्रतापः प्रचुरसुतयुतो मान्त्रिकः पञ्चमस्थे।"),
            citation("होरासार", "मेधावी वाङ्मधुरो बुद्धिस्थे सोमजे बुधनुमतः।\nसुतवान् महाप्रतापः कविश्च भवति प्रकृष्टश्च॥"),
            citation("जातक पारिजात", "सुतगे शशिसूनौ तु सुतवान् ज्ञानसंयुतः।\nमन्त्री वा राजपूज्यो वा मेधावी प्रतिभासमेतः॥"),
        ],
        "summaryNe": "पाँचौँ भावमा बुध हुनाले जातक कुशाग्र बुद्धि, तीक्ष्ण प्रतिभा र तीव्र स्मरणशक्तिले युक्त हुन्छ। शास्त्रीय निष्कर्ष अनुसार यस्तो जातक महामेधावी, कवि, मन्त्रशास्त्र वा गूढ विद्याको ज्ञाता (मान्त्रिक), विद्या र सुखले परिपूर्ण, तथा राज्य वा सरकारबाट सम्मानित (मन्त्री वा मुख्य सल्लाहकार सरह) हुन्छ। जातकले असल सन्तानको सुख र आफ्नै बौद्धिक बलमा जीवनमा उच्च सफलता प्राप्त गर्दछ।",
        "summaryEn": "With Mercury in the 5th house, the native is endowed with sharp intellect, keen talent and a strong memory. Classical texts conclude that such a native is highly intelligent, a poet, versed in mantra-shastra or esoteric knowledge, full of learning and happiness, and honored by the state or government (akin to a minister or chief advisor). The native attains great success in life through good children and their own intellectual strength.",
    },
    6: {
        "entries": [
            citation("सारावली", "अलसः निष्ठुरवाक् विवादप्रियः शत्रुहन्ता।\nषष्ठे बुधे स्थितवती क्रोधी चापि प्रजायते॥"),
            citation("फलदीपिका", "जाताक्रोधो विवादद्विषि रिपुबलहन्तालसो निष्ठुरोक्तिः।"),
            citation("होरासार", "षष्ठे विवादशीलो लोकद्वेषी विदेशवासी च।\nअल्पतनुः शत्रुरिपुः सौम्ये षष्ठे तु मन्दमतिः॥"),
            citation("जातक पारिजात", "षष्ठे बुधे स्थितवती रिपुहन्ता मानवान् विवादपटुः।\nक्रोधोद्दीप्तो निष्ठुरवाक् कलालुब्धो विदेशवासी स्यात्॥"),
        ],
        "summaryNe": "छैटौँ भावमा बुध रहँदा केही प्रतिकूल र केही सकारात्मक प्रभाव मिश्रित रूपमा देखिन्छन्। यसले व्यक्तिलाई छिटो रिस उठ्ने (जाताक्रोध), निष्ठुर वा कडा शब्द बोल्ने, र तर्क-विवादमा संलग्न हुने बनाउँछ। यद्यपि, जातकले आफ्नो तीक्ष्ण बुद्धि र तर्कशक्तिद्वारा शत्रु र विरोधीहरूको बललाई पूर्ण रूपमा नाश (रिपुबलहन्ता) गर्दछ। कार्यक्षेत्रमा केही आलस्य, विवाद वा विदेश बसोबासको योग बन्न सक्छ।",
        "summaryEn": "Mercury in the 6th house brings a mix of unfavorable and favorable effects. It makes the person quick to anger, harsh or blunt in speech, and prone to argument and dispute. However, the native fully destroys the strength of enemies and rivals through sharp intellect and reasoning (a true enemy-destroyer). Some laziness, conflict, or a tendency to live abroad may appear in their work life.",
    },
    7: {
        "entries": [
            citation("सारावली", "प्राज्ञोऽस्ते चारुवेषः मतिमद्विभववान् भवेत्।\nसप्तमे शशिसूनौ तु सुन्दरभार्यासमन्वितः॥"),
            citation("फलदीपिका", "प्राज्ञोऽस्ते चारुवेषः ससकलमहिमा याति भार्यां सवित्तां।"),
            citation("होरासार", "धर्मज्ञोदारमतिः सप्तमगे लोकविश्रुतः सौम्ये।\nचारुतनुरुत्तमस्त्रीसहितो दाता च मतिमांश्च॥"),
            citation("जातक पारिजात", "सप्तमगे शशिसूनौ प्राज्ञश्चारुवेषो अतितेजस्वी।\nरूपवतीं गुणयुक्तां लभते भार्यां सवित्तां च॥"),
        ],
        "summaryNe": "सातौँ भावमा बुध हुनु अत्यन्त शुभ योग मानिन्छ। जातक बुद्धिमान् (प्राज्ञ), सुन्दर पहिरन र आकर्षक व्यक्तित्व भएको, र ठूलो महिमा तथा प्रतिष्ठा प्राप्त गर्ने हुन्छ। धर्मज्ञ र उदार स्वभाव रहन्छ। जातकको विवाह धनी, सुन्दर, गुणी र सुशिक्षित जीवनसाथीसँग हुन्छ। व्यापार, साझेदारी र वैवाहिक जीवनमा ठूलो समृद्धि र सुख मिल्छ।",
        "summaryEn": "Mercury in the 7th house is considered a highly auspicious yoga. The native is wise (a scholar), well-dressed, has an attractive personality, and attains great honor and standing. They are righteous and generous by nature. The native's marriage is to a wealthy, beautiful, virtuous and well-educated spouse. Great prosperity and happiness come through business, partnerships and married life.",
    },
    8: {
        "entries": [
            citation("सारावली", "दीर्घायुः ख्यातकीर्तिश्च नृपतिः बहुवित्तवान्।\nअष्टमस्थे शशिसूनौ गुणवान् जायते नरः॥"),
            citation("फलदीपिका", "विख्यातायुश्चिरायुः कुलभृदधिपतिर्ज्येष्ठम् दण्डनेता॥"),
            citation("होरासार", "ख्यातो धनाधिनाथो निधने सौम्ये नृपालको धीमान्।\nदीर्घायुश्च सुवेषो बहुवित्तवान् सन्नरो भवति॥"),
            citation("जातक पारिजात", "अष्टमगे शशिसूनौ दीर्घायुः ख्यातकीर्तिमान् सुकृती।\nदण्डनेता सुविख्यात कुलश्रेष्ठो बहुश्रुतः॥"),
        ],
        "summaryNe": "आठौँ भावमा बुध रहनु ज्योतिषीय दृष्टिकोणले अत्यन्त शुभ मानिन्छ। अष्टमस्थ बुधले व्यक्तिलाई दीर्घायु (चिरञ्जीवी), प्रख्यात (ख्यातकीर्ति), प्रचुर धनी, राजा वा उच्च अधिकारी (दण्डनेता/अधिपति), र आफ्ना कुलको पालनपोषण गर्ने श्रेष्ठ पुरुष बनाउँछ। व्यक्तिमा गुप्त विद्या, अनुसन्धान र न्याय क्षेत्रमा ठूलो क्षमता हुन्छ।",
        "summaryEn": "Mercury in the 8th house is regarded, astrologically, as highly auspicious. Mercury here grants the person long life (great longevity), fame, abundant wealth, and rank as a ruler or high official (a chief or commander), and makes them the finest sustainer of their lineage. The person has great ability in occult knowledge, research, and the field of justice.",
    },
    9: {
        "entries": [
            citation("सारावली", "विद्वान् धनवान् आचारवान् सत्यवादी जनप्रियः।\nधर्मस्थे शशिसूनौ तु महाभाग्यसमन्वितः॥"),
            citation("फलदीपिका", "विद्यार्थीचारधर्मैः सह तपसि बुधे स्यात्प्रवीणोऽतिवाग्मी।"),
            citation("होरासार", "धर्मे प्रतापबहुलो धनधान्यसमन्वितो महोत्साही।\nशास्त्रार्थज्ञः सुमती बुधगे धर्मस्थिते चतुरः॥"),
            citation("जातक पारिजात", "नवमस्थे शशिसूनौ धार्मिक आचारवान् महाविद्वान्।\nबहुभाग्यसम्पन्नः सत्यवादी जनप्रियः सुखी॥"),
        ],
        "summaryNe": "नवौँ भावमा बुध स्थित हुँदा व्यक्ति महाभाग्यशाली र धार्मिक हुन्छ। जातक विद्वान्, प्रचुर धनले युक्त, सदाचारी, सत्यवादी, जनप्रिय, र अत्यन्त वाक्पटु (अतिवाग्मी) हुन्छ। विद्या, धर्म, अध्ययन र शास्त्रार्थमा विशेष निपुणता रहन्छ। पिता र गुरुजनको आशीर्वादले जीवनमा उच्च पद, धनधान्य र समृद्धि प्राप्त हुन्छ।",
        "summaryEn": "With Mercury in the 9th house, the native is greatly fortunate and religious. They are learned, abundantly wealthy, virtuous, truthful, popular, and highly eloquent. They show particular skill in learning, dharma, study and scriptural debate. Through the blessings of father and teachers, they attain high position, wealth and grain, and prosperity in life.",
    },
    10: {
        "entries": [
            citation("सारावली", "सुविद्याबलमतिसुखसत्कर्मसत्यान्वितः खे।\nदशमे बुधे स्थितवतो राजमान्यो महामतिः॥"),
            citation("फलदीपिका", "सिद्धारम्भः सुविद्याबलमतिसुखसत्कर्मसत्यान्वितः खे।"),
            citation("होरासार", "दशमे वित्ताधीशो दानपरो ज्ञानवान् यशस्वी च।\nसत्कर्मनिरतमतिरपि सौम्ये कर्मस्थिते सुरूपश्च॥"),
            citation("जातक पारिजात", "दशमे शशिसूनौ तु सर्वसिद्धारम्भो महामतिः सुकृती।\nराजपूज्यो यशोयुक्तः सत्यसन्धो धनप्रदः॥"),
        ],
        "summaryNe": "दशौँ भाव (कर्म भाव) मा बुध हुनाले व्यक्ति कार्यक्षेत्रमा अभूतपूर्व सफलता पाउँछ। जातकले सुरु गरेका सबै कामहरू सिद्ध (सिद्धारम्भ) हुन्छन्। व्यक्ति सुविद्या, आत्मबल, कुशाग्र बुद्धि, सत्कर्म, र सत्यवादी गुणले युक्त हुन्छ। दानवीर, ज्ञानवान् र यशस्वी भई राज्य वा सरकारद्वारा सम्मानित (राजमान्य) हुन्छ।",
        "summaryEn": "Mercury in the 10th house (house of career) brings unprecedented success in the native's professional field. Every undertaking the native begins reaches completion. The person is endowed with good learning, self-confidence, sharp intellect, virtuous conduct and truthfulness. Charitable, knowledgeable and renowned, they are honored by the state or government.",
    },
    11: {
        "entries": [
            citation("सारावली", "बह्वायुः सत्यसन्धो विपुलधनसुखी लाभगे भृत्ययुक्तो।\nएकादशे शशिसूनौ सर्वलाभप्रदो भवेत्॥"),
            citation("फलदीपिका", "बह्वायुः सत्यसन्धो विपुलधनसुखी लाभगे भृत्ययुक्तो।"),
            citation("होरासार", "लाभै बहुप्रकारैर्धनवान् वनितादृतः सुशीलश्च।\nसौम्ये लाभस्थिते जातकः सुतवान् महामतिः॥"),
            citation("जातक पारिजात", "एकादशगे सौम्ये बहुप्रकारैर्धनार्जनप्रवीणः।\nदीर्घायुः सुतसहितः सर्व समृद्धिं लभेत जातकः॥"),
        ],
        "summaryNe": "एघारौँ भाव (लाभ भाव) मा बुध हुनु अत्यन्त शुभ र प्रचुर धनदायक मानिन्छ। जातक दीर्घायु (बह्वायु), सत्य प्रतिज्ञा पालना गर्ने (सत्यसन्ध), अपार धन र सुख भोग्ने, र धेरै सेवक तथा सहयोगीहरूले युक्त हुन्छ। व्यापार, लगानी, र बौद्धिक कार्यहरूबाट विभिन्न माध्यमले धन लाभ भइरहन्छ।",
        "summaryEn": "Mercury in the 11th house (house of gains) is considered highly auspicious and richly wealth-giving. The native is long-lived, true to their word, enjoys immense wealth and happiness, and is attended by many servants and helpers. Wealth keeps flowing in through multiple channels — business, investment, and intellectual work.",
    },
    12: {
        "entries": [
            citation("सारावली", "दीनो विद्याविहीनः निन्दितः आलसी क्रूरः।\nद्वादशस्थे शशिसूनौ व्ययशीलः सुदुःखितः॥"),
            citation("फलदीपिका", "दीनो विद्याविहीनः परिभवसहितोऽन्त्ये नृशंसोऽलसश्च॥"),
            citation("होरासार", "व्ययगे बुधे नृशंसः कृपाविहीनो व्ययान्वितश्चण्डः।\nदीनो विद्याविहीनः परहेतुनिबन्धकृद्भवति॥"),
            citation("जातक पारिजात", "द्वादशगे शशिसूनौ विद्याहीनः कुत्सितोऽलसः क्रूरः।\nअत्यन्तव्ययशीलः परिभवसहितः सुदुःखितो भवति॥"),
        ],
        "summaryNe": "बाह्रौँ भाव (व्यय भाव) मा बुध रहँदा केही प्रतिकूल फल प्राप्त हुन्छ। बाह्रौँ भावको बुधले व्यक्तिलाई दीन (दुःखी), दयाविहीन वा क्रूर, विद्यामा बाधा भोग्ने, अपमान झेल्नुपर्ने, आलसी, र अत्यधिक खर्च गर्ने (व्ययशील) बनाउँछ। यद्यपि, शुभ ग्रहको दृष्टि वा शुभ राशिमा भएमा अध्यात्म, अनुसन्धान र वैदेशिक क्षेत्रमा व्यय गरी सफलता पाउन सकिन्छ।",
        "summaryEn": "Mercury in the 12th house (house of expenditure) brings somewhat unfavorable results. Mercury here makes the person distressed, unkind or harsh, hindered in learning, subject to humiliation, lazy, and prone to excessive spending. However, with a benefic aspect or placement in an auspicious sign, success can still be found by directing that expenditure into spirituality, research and foreign pursuits.",
    },
}


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]

    table["mercury"] = {
        str(house): {
            "house": house,
            "houseTheme": HOUSE_THEME[house],
            "rating": HOUSE_RATING[house],
            "entries": payload["entries"],
            "summaryNe": payload["summaryNe"],
            "summaryEn": payload["summaryEn"],
        }
        for house, payload in MERCURY_HOUSES.items()
    }

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
