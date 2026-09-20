#!/usr/bin/env python3
"""Fill chapter-9 (Chamaka Prashna) meaning_en / meaning_ne on
data/documents_source/rudrashtadhyayi.json.

The Chamakam (Taittiriya Samhita 4.7), chanted immediately after the
Namakam in every Rudrabhisheka, is one of the most widely published
Vedic texts (Sivananda, Ramakrishna Math, Chinmaya Mission editions
all carry near-identical standard English glosses for its 11
anuvakas). This follows that standard rendering, translated directly
against this manifest's own Sanskrit and verse breaks.

Several anuvakas (9.19-9.23) name specific soma-cups and ritual
implements whose English equivalents are technical/transliterated in
every published translation (e.g. "upamshu", "agrayana",
"nishkevalya") — kept as such here rather than invented literal
glosses, matching how every mainstream translation handles them.
9.24-9.27 are literal number sequences and sacrificial-animal
age-categories, translated as plain enumerations.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH9 = {
    "9.1": {
        "meaning_ne": "मलाई अन्न र त्यसको उत्पादन, प्रयत्न र त्यसको सिद्धि, चिन्तन र सङ्कल्प, उच्च घोष र स्तुति, यश र वेदज्ञान, ज्योति र स्वर्ग — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May food and its increase, effort and its accomplishment, contemplation and the will to act, the uttered chant and praise, fame and revealed wisdom, light and heaven — all come to me through the sacrifice.",
    },
    "9.2": {
        "meaning_ne": "मलाई प्राण, अपान, व्यान, जीवनशक्ति, चित्त, ज्ञान, वाणी, मन, आँखा, कान, दक्षता र बल — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May prana, apana, and vyana (the vital breaths), life-force, consciousness, learning, speech, mind, eye, ear, skill, and strength — all come to me through the sacrifice.",
    },
    "9.3": {
        "meaning_ne": "मलाई ओज, बल, आत्मा, शरीर, कल्याण, रक्षा-कवच, अङ्गहरू, हड्डीहरू, जोर्नीहरू, शरीरहरू, आयु र वृद्धावस्था — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May vigor, power, the self, the body, well-being, protective armor, the limbs, the bones, the joints, the bodies, longevity, and old age — all come to me through the sacrifice.",
    },
    "9.4": {
        "meaning_ne": "मलाई ज्येष्ठता, आधिपत्य, क्रोध (नियन्त्रित शक्ति), तेज, बल, जल (वीर्य), विजय, महिमा, विस्तार, फैलावट, उचाइ, लम्बाइ, वृद्धि र वृद्धिशीलता — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May seniority, sovereignty, controlled wrath, splendor, force, vital fluid, victory, greatness, extensiveness, breadth, height, length, growth, and increase — all come to me through the sacrifice.",
    },
    "9.5": {
        "meaning_ne": "मलाई सत्य, श्रद्धा, जगत्, धन, विश्व, महिमा, क्रीडा, आनन्द, जन्मेको र जन्मिने सबै, असल सूक्त र सुकर्म — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May truth, faith, the world, wealth, the universe, glory, play, joy, what is born and what will be born, good hymns, and good deeds — all come to me through the sacrifice.",
    },
    "9.6": {
        "meaning_ne": "मलाई ऋत (सृष्टिको नियम), अमृत, क्षय-रोगरहितता, नीरोगता, जीवनशक्ति, दीर्घायु, शत्रुरहितता, निर्भयता, सुख, सुखद निद्रा, असल उषा र असल दिन — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May cosmic order, immortality, freedom from wasting disease, freedom from illness, vitality, long life, freedom from enmity, fearlessness, happiness, comfortable rest, a good dawn, and a good day — all come to me through the sacrifice.",
    },
    "9.7": {
        "meaning_ne": "मलाई नियन्ता, धारक, कुशलक्षेम, धैर्य, विश्व, महिमा, बोध, ज्ञान, स्रोत, सन्तति, कृषि र विश्राम — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the guide, the sustainer, security, steadfastness, the universe, glory, comprehension, knowledge, the source, its offshoots, cultivation, and repose — all come to me through the sacrifice.",
    },
    "9.8": {
        "meaning_ne": "मलाई शान्ति, सुख, प्रियता, गौण इच्छा, प्रमुख इच्छा, प्रसन्नचित्तता, सौभाग्य, धन, कल्याण, श्रेष्ठता, बढ्दो समृद्धि र यश — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May peace, comfort, what is dear, secondary desire, primary desire, cheerfulness, good fortune, riches, auspiciousness, excellence, increasing prosperity, and fame — all come to me through the sacrifice.",
    },
    "9.9": {
        "meaning_ne": "मलाई पोषण, मधुर वाणी, दूध, रस, घ्यू, मह, सँगै खाने र पिउने अवसर, कृषि, वर्षा, विजय र पृथ्वीबाट उम्रने सबथोक — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May nourishment, pleasant speech, milk, sap, ghee, honey, eating and drinking together, cultivation, rain, victory, and all that sprouts from the earth — all come to me through the sacrifice.",
    },
    "9.10": {
        "meaning_ne": "मलाई सम्पत्ति, धन, पुष्टि, पुष्टिको वृद्धि, सर्वव्यापी प्रभुत्व, आधिपत्य, पूर्णता, अझ बढी पूर्णता, फसलको सुरक्षा, अक्षय सम्पत्ति, अन्न र भोकरहितता — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May wealth, riches, robustness, its increase, all-pervading abundance, mastery, fullness, more than fullness, protection of the harvest, imperishable wealth, food, and freedom from hunger — all come to me through the sacrifice.",
    },
    "9.11": {
        "meaning_ne": "मलाई ज्ञात धन, अज्ञात धन, भूत, भविष्य, सुगम मार्ग, असल मार्ग, समृद्धि, समृद्धिको वृद्धि, सम्पन्न कार्य, त्यसको सिद्धि, बुद्धि र असल बुद्धि — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May known wealth, wealth yet to be known, the past, the future, an easy path, a good path, prosperity, its increase, accomplishment, the power to accomplish, understanding, and good understanding — all come to me through the sacrifice.",
    },
    "9.12": {
        "meaning_ne": "मलाई धान, जौ, उड्द, तिल, मूंग, कलाई, कागुनो, सानो अन्न, स्याउलो बाजरा, जङ्गली धान, गहुँ र मसुरो — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May rice, barley, black gram, sesame, green gram, kidney beans, Italian millet, fine grain, panic millet, wild rice, wheat, and lentils — all come to me through the sacrifice.",
    },
    "9.13": {
        "meaning_ne": "मलाई ढुङ्गा, माटो, पहाड, पर्वत, बालुवा, वनस्पति, सुन, फलाम, कालो धातु, तामा, सिसा र टिन — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May stone, clay, hills, mountains, sand, trees, gold, iron, a dark metal, copper, lead, and tin — all come to me through the sacrifice.",
    },
    "9.14": {
        "meaning_ne": "मलाई अग्नि, जल, लहरा, ओषधि, खेती गरिएका र नखेती गरिएका अन्न, गाउँका पशु, वनका पशु, सम्पत्ति, त्यसको प्राप्ति, उत्पन्न भएको र समृद्धि — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May fire, water, creepers, herbs, cultivated and uncultivated crops, village animals, forest animals, wealth, the getting of wealth, what has come to be, and prosperity — all come to me through the sacrifice.",
    },
    "9.15": {
        "meaning_ne": "मलाई धन, वासस्थान, कर्म, सामर्थ्य, प्रयोजन, गमन, प्रस्थान र गति — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May wealth, dwelling, action, capacity, purpose, going forth, departure, and movement — all come to me through the sacrifice.",
    },
    "9.16": {
        "meaning_ne": "मलाई अग्नि र इन्द्र, सोम र इन्द्र, सविता र इन्द्र, सरस्वती र इन्द्र, पूषा र इन्द्र, बृहस्पति र इन्द्र — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May Agni and Indra, Soma and Indra, Savitar and Indra, Sarasvati and Indra, Pushan and Indra, and Brihaspati and Indra — all come to me through the sacrifice.",
    },
    "9.17": {
        "meaning_ne": "मलाई मित्र र इन्द्र, वरुण र इन्द्र, धाता र इन्द्र, त्वष्टा र इन्द्र, मरुत्हरू र इन्द्र, सम्पूर्ण विश्वेदेवा र इन्द्र — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May Mitra and Indra, Varuna and Indra, Dhata and Indra, Tvashta and Indra, the Maruts and Indra, and all the Vishvedevas together with Indra — all come to me through the sacrifice.",
    },
    "9.18": {
        "meaning_ne": "मलाई पृथ्वी र इन्द्र, अन्तरिक्ष र इन्द्र, आकाश र इन्द्र, ऋतुहरू र इन्द्र, नक्षत्रहरू र इन्द्र, दिशाहरू र इन्द्र — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the earth and Indra, the atmosphere and Indra, heaven and Indra, the seasons and Indra, the stars and Indra, and the quarters and Indra — all come to me through the sacrifice.",
    },
    "9.19": {
        "meaning_ne": "मलाई सोमको डाँठ, त्यसको किरण, अदाभ्य (अवश्यम्भावी) सोम, अधिपति सोम, उपांशु सोम, अन्तर्याम सोम, ऐन्द्रवायव आहुति, मैत्रावरुण आहुति, आश्विन आहुति, प्रतिप्रस्थान आहुति, शुक्र सोम र मन्थी सोम — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the soma-stalk, its ray, the unfailing soma, the overlord soma, the secretly-pressed (upamshu) soma, the inner-pervading (antaryama) soma, the offering to Indra-Vayu, to Mitra-Varuna, to the Ashvins, the substitute-priest's offering, the bright soma, and the churned soma — all come to me through the sacrifice.",
    },
    "9.20": {
        "meaning_ne": "मलाई आग्रयण आहुति, वैश्वदेव आहुति, ध्रुव आहुति, वैश्वानर आहुति, ऐन्द्राग्न आहुति, महावैश्वदेव आहुति, मरुत्वतीय आहुति, निष्केवल्य आहुति, सावित्र आहुति, सारस्वत आहुति, पात्नीवत आहुति, हरियोजन आहुति — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the agrayana offering, the vaishvadeva offering, the fixed (dhruva) offering, the vaishvanara offering, the Indra-Agni offering, the great vaishvadeva offering, the marutvatiya offering, the sole (nishkevalya) offering, the savitra offering, the sarasvata offering, the wives' (patnivata) offering, and the hariyojana offering — all come to me through the sacrifice.",
    },
    "9.21": {
        "meaning_ne": "मलाई यज्ञका चम्चाहरू, कचौराहरू, वायुसम्बन्धी पात्रहरू, घडा र कलश, पेराइका ढुङ्गाहरू, दुई पेराइ पाटा, शुद्ध गर्ने पात्र, अग्नि बोक्ने पात्र, वेदी, कुश-आसन, अन्तिम स्नान र समापन-घोष — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the sacrificial ladles, the cups, the wind-related vessels, the pot and jar, the pressing stones, the two pressing boards, the purifying vessel, the fire-carrying vessel, the altar, the sacred grass, the final ablution, and the concluding utterance — all come to me through the sacrifice.",
    },
    "9.22": {
        "meaning_ne": "मलाई अग्नि, घर्म (तताइएको पात्र), सूर्यकिरण, सूर्य, प्राण, अश्वमेध, पृथ्वी, अदिति, दिति, आकाश, औंलाहरू, शक्वरी छन्दहरू र दिशाहरू — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May Agni, the heated ritual vessel, the sun's ray, the sun, breath, the horse-sacrifice, the earth, Aditi, Diti, heaven, the fingers, the Shakvari verses, and the quarters — all come to me through the sacrifice.",
    },
    "9.23": {
        "meaning_ne": "मलाई व्रत, ऋतुहरू, तप, संवत्सर, दिन र रात, तथा बृहत् र रथन्तर साम — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the sacred vow, the seasons, austerity, the year, day and night, and the Brihat and Rathantara chants — all come to me through the sacrifice.",
    },
    "9.24": {
        "meaning_ne": "मलाई एक, तीन, तीन, पाँच, पाँच, सात, सात, नौ, नौ, एघार, एघार, तेह्र, तेह्र, पन्ध्र, पन्ध्र, सत्र, सत्र, उन्नाइस, उन्नाइस, एक्काइस, एक्काइस, तेइस, तेइस, पच्चीस, पच्चीस, सत्ताइस, सत्ताइस, उनन्तीस, उनन्तीस, एकतीस, एकतीस, तेत्तीस (विषम सङ्ख्याहरूको यो शृङ्खला) — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May one, three, three, five, five, seven, seven, nine, nine, eleven, eleven, thirteen, thirteen, fifteen, fifteen, seventeen, seventeen, nineteen, nineteen, twenty-one, twenty-one, twenty-three, twenty-three, twenty-five, twenty-five, twenty-seven, twenty-seven, twenty-nine, twenty-nine, thirty-one, thirty-one, thirty-three — this sequence of odd numbers — come to me through the sacrifice.",
    },
    "9.25": {
        "meaning_ne": "मलाई चार, आठ, आठ, बाह्र, बाह्र, सोह्र, सोह्र, बीस, बीस, चौबीस, चौबीस, अठ्ठाइस, अठ्ठाइस, बत्तीस, बत्तीस, छत्तीस, छत्तीस, चालीस, चालीस, चवालीस, चवालीस, अठचालीस (यो सम सङ्ख्याहरूको शृङ्खला) — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May four, eight, eight, twelve, twelve, sixteen, sixteen, twenty, twenty, twenty-four, twenty-four, twenty-eight, twenty-eight, thirty-two, thirty-two, thirty-six, thirty-six, forty, forty, forty-four, forty-four, forty-eight — this sequence of even numbers — come to me through the sacrifice.",
    },
    "9.26": {
        "meaning_ne": "मलाई एक वर्षे भेडी र त्यसको जोडी, दुई वर्षे र त्यसको जोडी, पाँच वर्षे भेडी र त्यसको जोडी, तीन वर्षे बाछो र त्यसको जोडी, चार वर्षे र त्यसको जोडी — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the one-year-old ewe and her pair, the two-year-old and its pair, the five-year-old ewe and her pair, the three-year-old calf and its pair, and the four-year-old and its pair — all come to me through the sacrifice.",
    },
    "9.27": {
        "meaning_ne": "मलाई छ वर्षे र त्यसको जोडी, साँढे, बाँझी गाई, वृषभ, गर्भवती गाई, हलो जोत्ने गोरु र दुहुनी गाई — यज्ञद्वारा प्राप्त होऊन्।",
        "meaning_en": "May the six-year-old and its pair, the bull, the barren cow, the breeding bull, the pregnant cow, the draft ox, and the milch cow — all come to me through the sacrifice.",
    },
    "9.28": {
        "meaning_ne": "वाजलाई स्वाहा, प्रसवलाई स्वाहा, वृद्धिलाई स्वाहा, क्रतुलाई स्वाहा, वसुलाई स्वाहा, दिनका स्वामीलाई स्वाहा, दिनलाई स्वाहा; मुग्ध (भ्रमित)लाई स्वाहा, मुग्धका स्वामीलाई स्वाहा; विनाशकलाई स्वाहा, विनाशका स्वामीलाई स्वाहा; अन्त्यलाई स्वाहा, अन्त्यका स्वामीलाई स्वाहा; भुवनलाई स्वाहा, भुवनपतिलाई स्वाहा; अधिपतिलाई स्वाहा, प्रजापतिलाई स्वाहा। यो तपाईंको राज्य हो, तपाईं मित्रताका लागि नियन्ता हुनुहुन्छ, नियन्त्रणका लागि नियामक; तपाईंलाई बल, वर्षा, सन्तति र तिनको आधिपत्यका लागि (ग्रहण गर्दछु)।",
        "meaning_en": "Svaha to vigor, svaha to its stimulation, svaha to its increase, svaha to the sacred will, svaha to the indwelling one, svaha to the lord of the day, svaha to the day; svaha to the bewildered one, svaha to its lord; svaha to the destroyer, svaha to its lord; svaha to the end, svaha to its lord; svaha to the earthly one, svaha to the lord of the world; svaha to the overlord, svaha to Prajapati. This dominion is yours; you are the controller for friendship, the regulator for control — I take you for vigor, for rain, for offspring, and for their sovereignty.",
    },
    "9.29": {
        "meaning_ne": "आयु यज्ञद्वारा सिद्ध होस्, प्राण यज्ञद्वारा सिद्ध होस्, आँखा यज्ञद्वारा सिद्ध होस्, कान यज्ञद्वारा सिद्ध होस्, वाणी यज्ञद्वारा सिद्ध होस्, मन यज्ञद्वारा सिद्ध होस्, आत्मा यज्ञद्वारा सिद्ध होस्, ब्रह्म यज्ञद्वारा सिद्ध होस्, ज्योति यज्ञद्वारा सिद्ध होस्, स्वर्ग यज्ञद्वारा सिद्ध होस्, आधार यज्ञद्वारा सिद्ध होस्, यज्ञ नै यज्ञद्वारा सिद्ध होस्। स्तोम, यजुः, ऋक्, साम, बृहत् र रथन्तर सामसमेत — हामी स्वर्ग पुगेका छौं, अमर भएका छौं, प्रजापतिका सन्तान भएका छौं। हे वासी, स्वाहा!",
        "meaning_en": "May life be accomplished through the sacrifice; may breath be accomplished through the sacrifice; may sight be accomplished through the sacrifice; may hearing be accomplished through the sacrifice; may speech be accomplished through the sacrifice; may mind be accomplished through the sacrifice; may the self be accomplished through the sacrifice; may Brahman be accomplished through the sacrifice; may light be accomplished through the sacrifice; may heaven be accomplished through the sacrifice; may the support be accomplished through the sacrifice; may the sacrifice itself be accomplished through the sacrifice. And the Stoma-hymn, the Yajus, the Rik, the Sama, and the Brihat and Rathantara chants — we have gone to heaven, we have become immortal, we have become the offspring of Prajapati. O indwelling one, svaha!",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 9)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH9.get(shloka["verse_label"])
        if extra is None:
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-9 meanings in {OUT}")


if __name__ == "__main__":
    main()
