#!/usr/bin/env python3
"""Fill meaning_en / meaning_ne for chapters 4, 5, 7, 8 on
data/documents_source/rudrashtadhyayi.json.

Chapter 4 (Apratiratha Suktam, RV 10.103) and chapter 5's Surya/Mitra
verses draw on well-published Rigvedic hymns (Griffith-style renderings
of RV 10.103, 1.50, 1.115, 1.35, 2.27) translated directly against this
manifest's own Sanskrit; a handful of chapter 5's verses (5.1, 5.4-5.6,
5.8-5.9, 5.13-5.15) are less commonly anthologized combinations and are
translated as literally/faithfully as possible rather than matched
against one canonical published source.

Chapter 7 carries several of the most famous mantras in the Rudra
corpus verbatim (the Tryambakam/Mahamrityunjaya mantra at 7.5, the
Tryayusham long-life mantra at 7.6, the Rudra-avasana dismissal at
7.6) — all standard, high-confidence renderings.

Chapter 8 (Jata Adhyaya) is a technical anatomical/ritual offering
litany. 8.4-8.7 (plain svaha-lists of body parts and abstract states)
are straightforward; 8.2-8.3 map deity names to specific anatomical
parts of the sacrificial offering in vocabulary that is genuinely
ambiguous even in specialist literature, so those two verses are a
best-effort literal rendering, lower-confidence than the rest of this
chapter.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH4 = {
    "4.1": {
        "meaning_ne": "स्विफ्ट, साँढेजस्तै भयङ्कर आफूलाई तिखार्दै, गर्जदै, जनसमुदायलाई हल्लाउँदै — जोडले गर्जने, नटिपिने, एक्लो वीर — इन्द्रले एकैचोटि सय सेनाहरू जिते।",
        "meaning_en": "Swift, sharpening himself like a fierce bull, thundering, stirring the peoples — the loud-roaring, unwinking, sole hero — Indra alone has conquered a hundred armies at once.",
    },
    "4.2": {
        "meaning_ne": "जोडले गर्जने, नटिपिने, विजयी, युद्धघोष गर्ने, हल्लाउन नसकिने, साहसी इन्द्रसँग — त्यही इन्द्रद्वारा विजय हासिल गर, हे वीर योद्धाहरू, बाण-हातका शक्तिशाली उहाँसँगै युद्धमा टिकिरहो।",
        "meaning_en": "With Indra — the loud-roaring, unwinking, victorious, the raiser of the war-cry, hard to shake, the bold — with Him, O warriors, gain victory; with him, arrow-handed and mighty, hold your ground in battle.",
    },
    "4.3": {
        "meaning_ne": "बाण र तुणीर बोकेका आफ्ना सेनासहित, स्वतन्त्र, युद्धमा मिसिने — इन्द्र आफ्नो गणसहित; विजयी, सोमपान गर्ने, बलियो बाहुधारी, उग्र धनुर्धारी, प्रत्यञ्चामा तयार बाणले प्रहार गर्ने।",
        "meaning_en": "He, with his host of arrow-bearing, quiver-wearing warriors, self-ruling, joining the fray with His troop — Indra, victorious in battle, the Soma-drinker, mighty of arm, fierce-bowed, who strikes with arrows fitted to the string.",
    },
    "4.4": {
        "meaning_ne": "हे बृहस्पति, आफ्नो रथमा हामीलाई घेरेर उड्नुहोस्, राक्षस र शत्रुहरूलाई धपाउँदै; सेनाहरू ध्वस्त पार्दै, युद्धमा नाश गर्दै, विजयी हुँदै — हाम्रा रथहरूको रक्षक बन्नुहोस्।",
        "meaning_en": "O Brihaspati, circle round us in thy chariot, driving away demons and enemies, shattering armies, crushing them in battle, victorious — be the protector of our chariots at the rite.",
    },
    "4.5": {
        "meaning_ne": "बलका लागि परिचित, प्राचीन, सर्वाधिक वीर, सधैं विजयी, अजेय, उग्र; हरेक वीर र योद्धालाई उछिन्ने, बलमा महान् — हे गोविद् इन्द्र, आफ्नो विजयी रथमा चढ्नुहोस्।",
        "meaning_en": "Known for thy strength, ancient, most heroic, all-conquering, ever-prevailing, fierce; surpassing every hero and every warrior, mighty in strength — mount, O Indra, finder of cattle, thy victorious chariot.",
    },
    "4.6": {
        "meaning_ne": "हे बन्धुहरू, साहसका साथ उहाँलाई पछ्याओ — इन्द्र, गाईहरूको बथान खोल्ने, गाईविद्, वज्रबाहु, युद्धमा विजयी, बलले कुल्चने; हे मित्रहरू, इन्द्रसँगै दृढतापूर्वक जोडिइराख।",
        "meaning_en": "Follow him with valor, O kinsmen — Indra, the cleaver of the fold, the finder of the herds, the thunder-armed, the conqueror in the fray, who crushes by his might; cling fast to him, O comrades.",
    },
    "4.7": {
        "meaning_ne": "सय क्रोधका इन्द्र, जो बलका साथ सेनाहरूमाथि हान्नुहुन्छ र कसैसँग हार्नुहुन्न, हल्लाउन नसकिने, सेनाहरूलाई जित्ने, अजेय — उहाँले युद्धमा हाम्रा सेनाहरूको रक्षा गरून्।",
        "meaning_en": "Indra, the hero of a hundred furies, who plunges upon the ranks with force and yields to none, hard to overthrow, the vanquisher of hosts, unconquerable in war — may he protect our armies in the fight.",
    },
    "4.8": {
        "meaning_ne": "इन्द्र तिनीहरूका नेता होऊन्; बृहस्पति, दक्षिणा, यज्ञ र सोम अगाडि जाऊन्; देवताहरूका ध्वस्त पार्ने र सधैं विजयी हुने सेनाहरूको अगाडि मरुत्हरू गइहालून्।",
        "meaning_en": "Let Indra be their leader; let Brihaspati, Dakshina, the sacrifice, and Soma go before; may the Maruts march at the forefront of the gods' armies, ever-shattering, ever-victorious.",
    },
    "4.9": {
        "meaning_ne": "साँढे इन्द्र, राजा वरुण, आदित्यहरू र उग्र मरुत्सेनाको, महान् मनवाला र लोक हल्लाउने विजयी देवताहरूको घोष उठ्यो।",
        "meaning_en": "The war-cry of the conquering gods has arisen — of Indra the mighty bull, of Varuna the king, of the Adityas, and the fierce host of the Maruts, the great-minded, world-shaking ones.",
    },
    "4.10": {
        "meaning_ne": "हे मघवन् (इन्द्र), हाम्रा हतियारहरूलाई तीखो बनाइदिनुहोस् र हाम्रा योद्धाहरूको मन उत्साहित पारिदिनुहोस्; हे वृत्रहन्ता, हाम्रा घोडाहरूको बल बढाइदिनुहोस्, र हाम्रा विजयी रथहरूको घोष गुञ्जियोस्।",
        "meaning_en": "O bounteous Indra, sharpen our weapons and rouse up the spirits of our warriors; O slayer of Vritra, rouse the vigor of our steeds, and let the roar of our conquering chariots go forth.",
    },
    "4.11": {
        "meaning_ne": "ध्वजाहरू भिड्दा इन्द्र हाम्रो पक्षमा होऊन्; हाम्रै बाणहरूले विजय पाऊन्; हाम्रा वीरहरू माथिल्लो हात पाऊन्; र हे देवताहरू, हाम्रा पुकारमा हामीलाई रक्षा गर्नुहोस्।",
        "meaning_en": "May Indra be ours when the banners clash in battle; may it be our arrows that win; may our warriors gain the upper hand; and may you gods protect us when we call on you.",
    },
    "4.12": {
        "meaning_ne": "यी (शत्रु)हरूको चित्त भ्रमित पार्दै, हे अप्वा (त्रासकी देवी), तिनका अङ्गहरू समात, अगाडि बढ; तिनका हृदयमा शोकले जलाइदेऊ, र हाम्रा शत्रुहरू अन्धकारमा नै अल्झिरहून्।",
        "meaning_en": "Confounding the will of these enemies, seize their limbs, O Apva (the demoness of terror), advance; press upon them, burn their hearts with sorrows, and let our foes cling to blinding darkness.",
    },
    "4.13": {
        "meaning_ne": "हे बाण, मन्त्रले तीखो पारिएर, छोडिएपछि उड्; शत्रुहरूकहाँ पुग् र तिनलाई ढाल्; एउटा पनि नछोडी सबैलाई नष्ट पार्।",
        "meaning_en": "Released, fly forth, O Arrow, sharpened by sacred formula; go unto our foes, strike them down, and leave not a single one of them remaining.",
    },
    "4.14": {
        "meaning_ne": "हे वीरहरू, अगाडि बढ र विजयी होऊ; इन्द्रले तिमीलाई शरण दिऊन्। तिम्रा बाहुहरू शक्तिशाली र अजेय होऊन्।",
        "meaning_en": "Go forth and conquer, O warriors; may Indra grant you shelter. May your arms be mighty, so that you remain unassailable.",
    },
    "4.15": {
        "meaning_ne": "हे मरुत्हरू, बलका साथ हामीसँग प्रतिस्पर्धा गर्दै आउने त्यो शत्रु सेनालाई अन्धकारमा लुकाइदेऊ, ताकि तिनीहरूले एक-अर्कालाई नचिनून्।",
        "meaning_en": "O Maruts, that enemy army which advances against us, contending in might — shroud it in a lawless darkness, so that they may not recognize one another.",
    },
    "4.16": {
        "meaning_ne": "जहाँ बाणहरू घना भएर खस्छन्, टुप्पी नकाटिएका बालकहरूजस्तै — त्यहाँ इन्द्र, बृहस्पति र अदितिले हामीलाई शरण दिऊन्; सधैंभरि शरण दिऊन्।",
        "meaning_en": "Where arrows fly thick as shaven-headed boys in close ranks — there may Indra, Brihaspati, and Aditi grant us shelter; may they grant us shelter forever.",
    },
    "4.17": {
        "meaning_ne": "म तिम्रा मर्मस्थलहरूलाई कवचले ढाक्दछु; राजा सोमले तिमीलाई अमृतले वस्त्र पहिराऊन्; वरुणले तिमीलाई फराकिलोभन्दा फराकिलो ठाउँ दिऊन्; र तिमी विजयी हुँदा देवताहरू हर्षित होऊन्।",
        "meaning_en": "I cover your vital points with armor; may King Soma clothe you with immortality; may Varuna grant you space wider than wide; and may the gods rejoice in you as you win.",
    },
}

CH5 = {
    "5.1": {
        "meaning_ne": "त्यो विशाल र देदीप्यमान तत्त्वले सोम्य मधुर रस पिऊन्, यज्ञपतिलाई अखण्ड आयु प्रदान गर्दै; वायुद्वारा प्रेरित भई आफ्नै बलले सबैको रक्षा गर्ने त्यसैले प्राणीहरूलाई विविध रूपमा पोषण गरेको छ र सर्वत्र देदीप्यमान भई राज गर्छ।",
        "meaning_en": "May the vast and radiant One drink the sweet, Soma-related nectar, granting unbroken life to the lord of the sacrifice. Impelled by the wind, protecting all creatures by his own power, he has nourished all beings manifoldly and shines gloriously everywhere.",
    },
    "5.2": {
        "meaning_ne": "किरणहरूले सबै प्राणीलाई चिन्ने त्यो देव सूर्यलाई माथि उठाउँछन्, ताकि सम्पूर्ण संसारले उहाँलाई देख्न सकोस्।",
        "meaning_en": "The rays bear aloft that god who knows all beings — Surya — so that the whole world may behold him.",
    },
    "5.3": {
        "meaning_ne": "हे पवित्र गर्ने देव, जुन आँखाले तपाईं परिश्रम गर्ने जनतालाई हेर्नुहुन्छ, त्यसैले हे वरुण, तपाईं सबैलाई देख्नुहुन्छ।",
        "meaning_en": "With that purifying eye of thine, O radiant one, with which thou watchest over the toiling people — with that, O Varuna, thou seest all.",
    },
    "5.4": {
        "meaning_ne": "हे दिव्य दुई अध्वर्यु, सूर्यको वर्णको रथमा चढेर आउनुहोस्; यज्ञलाई मधुले अभिषेक गर्नुहोस्। प्राचीनकालदेखिझैं यो देदीप्यमान द्रष्टाले देवताहरूको अद्भुत रूप देख्दछ।",
        "meaning_en": "O ye two divine Adhvaryus, come by your sun-hued chariot; anoint the sacrifice with sweetness. As of old, this radiant seer beholds the wondrous form of the gods.",
    },
    "5.5": {
        "meaning_ne": "प्राचीनकालदेखि, पहिलेदेखि, सधैंझैं — कुशासनमा विराजमान, स्वर्गको ज्योति फेला पार्ने, सबैतिर फर्किने त्यो श्रेष्ठलाई; जसमा तिमी बढ्दछौ, त्यो द्रुत र विजयी गतिशीललाई।",
        "meaning_en": "Him, as in ancient times, as of old, as always, the foremost one, seated on the sacred grass, the finder of heavenly light, facing all things — the swift, resounding conqueror, amid the waters wherein thou growest.",
    },
    "5.6": {
        "meaning_ne": "यो वेनले दागी किरणहरूलाई अगाडि बढाउँछ, ज्योतिलाई ज्योतिमय गर्भमा बेरेर, अन्तरिक्षको विस्तारमा। विद्वानहरूले आफ्ना स्तुतिले जलको यो सन्तान, सूर्यको मिलनस्थलमा रहेकोलाई सुम्सुम्याउँछन्।",
        "meaning_en": "This Vena stirs forth the dappled rays, light wrapped as if in a luminous womb, amid the vastness of the mid-region. The wise, with their hymns, caress this child of the waters at the meeting-place of the sun.",
    },
    "5.7": {
        "meaning_ne": "देवताहरूको देदीप्यमान मुखाकृति उदाएको छ — मित्र, वरुण र अग्निको नेत्र। चराचर जगतको आत्मा सूर्यले आकाश, पृथ्वी र अन्तरिक्षलाई भरिदिएका छन्।",
        "meaning_en": "The radiant countenance of the gods has arisen — the eye of Mitra, Varuna, and Agni. Surya, the soul of all that moves and moves not, has filled heaven, earth, and the atmosphere.",
    },
    "5.8": {
        "meaning_ne": "सबैका हितैषी देव सवितालाई पोषणसहित हाम्रो सभामा शुभ स्तुतिका साथ आउन दिनुहोस्, ताकि तरुणहरूले झैं तपाईंहरू हामीलाई प्रसन्न पार्नुहोस्, र सम्पूर्ण जगत मिलनको बेला विचारसहित हामीतिर फर्कोस्।",
        "meaning_en": "May Savitar, the god belonging to all men, come to us with nourishing gifts and fair praise in the assembly, so that, like young men, you may gladden us, and the whole world may turn to us in thought at the time of gathering.",
    },
    "5.9": {
        "meaning_ne": "हे वृत्रहन्ता, आज सूर्यसँगै जे-जति उदायो, त्यो सबै, हे इन्द्र, तपाईंकै वशमा छ।",
        "meaning_en": "Whatever has arisen today, O Vritra-slayer, along with the Sun — all that, O Indra, is in thy control.",
    },
    "5.10": {
        "meaning_ne": "हे सूर्य, तिमी सबैले देख्न सक्ने द्रुत यात्री, ज्योति उत्पन्न गर्ने हौ; तिमी सम्पूर्ण देदीप्यमान लोकमा प्रकाश छर्दछौ।",
        "meaning_en": "Thou art the swift crosser, visible to all, the maker of light, O Surya; thou shinest upon the whole luminous realm.",
    },
    "5.11": {
        "meaning_ne": "त्यही सूर्यको देवत्व हो, त्यही उहाँको महिमा हो — कार्यको बीचैमा फैलिएकोलाई उहाँले समेट्नुभयो; जब उहाँले आफ्ना हरित घोडाहरूलाई ठाउँबाट फुकाल्नुहुन्छ, तब रात्रिले सबैमाथि आफ्नो वस्त्र फिँजाउँछिन्।",
        "meaning_en": "That is Surya's godhead, that his greatness — he gathers together what had spread out in the midst of his work; when he unyokes his bay steeds from their place, straightway Night spreads her garment over all.",
    },
    "5.12": {
        "meaning_ne": "मित्र र वरुणले देख्नका लागि, सूर्यले आकाशको काखमा त्यो रूप धारण गर्छन्; उहाँको एउटा तेज असीम र उज्यालो छ, अर्को अँध्यारो छ — हरित घोडाहरूले यी दुवैलाई एकसाथ बोक्छन्।",
        "meaning_en": "In heaven's lap, Surya assumes that form for Mitra and Varuna to behold; one aspect of his radiance is boundless and bright, the other dark — the bay steeds bear these onward together.",
    },
    "5.13": {
        "meaning_ne": "हे सूर्य, निश्चय नै तिमी महान् हौ; हे आदित्य, निश्चय नै तिमी महान् हौ। तिम्रो सत् स्वरूपको महिमा साँच्चै प्रशंसनीय छ; हे देव, निश्चय नै तिमी महान् हौ।",
        "meaning_en": "Verily, great art thou, O Surya! Verily, great art thou, O Aditya! The greatness of thy true being is praised indeed; truly, O god, great art thou.",
    },
    "5.14": {
        "meaning_ne": "हे सूर्य, यशले निश्चय नै तिमी महान् हौ; हे देव, पूर्णतया तिमी महान् हौ। महिमाले तिमी देवताहरूका असुर्य (दिव्य) पुरोहित हौ, सर्वव्यापी र अखण्ड ज्योति हौ।",
        "meaning_en": "Verily, O Surya, great art thou in renown; wholly great art thou, O god. By thy greatness thou art the divine high-priest of the gods, the pervading, unassailable light.",
    },
    "5.15": {
        "meaning_ne": "सूर्यतिर झुकेजस्तै, सबैले इन्द्रको भाग ग्रहण गरून्; उत्पन्न भएका प्राणीहरूमाझ धनसम्पत्ति, आफ्नो बलले हामी पनि आफ्नो भाग प्राप्त गरौं झैं ध्यान गरौं।",
        "meaning_en": "As if leaning toward the Sun, let all partake of Indra's share; among the treasures born at creation, by his might, we too hold forth our portion, as it were.",
    },
    "5.16": {
        "meaning_ne": "हे देवताहरू, आज सूर्यको उदयमा हामीलाई पाप र दोषबाट मुक्त गर्नुहोस्। मित्र र वरुणले हामीलाई यो वरदान दिऊन्, र अदिति, सिन्धु, पृथ्वी र आकाशले पनि।",
        "meaning_en": "O gods, at the rising of the Sun today, deliver us from sin and from reproach. May Mitra and Varuna grant us this, and Aditi, Sindhu, Earth, and Heaven as well.",
    },
    "5.17": {
        "meaning_ne": "काला अन्तरिक्षमा विचरण गर्दै, अमर र मर्त्य दुवैलाई विश्राम दिँदै, देव सविता आफ्नो सुनौलो रथमा सबै लोकहरूलाई हेर्दै आउनुहुन्छ।",
        "meaning_en": "Moving through the dark expanse, laying to rest both the immortal and the mortal, the god Savitar comes in his golden chariot, beholding all the worlds.",
    },
}

CH7 = {
    "7.1": {
        "meaning_ne": "हे सोम, तपाईंको व्रतमा रहेर, तपाईंको मन आफ्नै शरीरमा धारण गर्दै, सन्तानवान् भई हामी तपाईंसँगै रहौं।",
        "meaning_en": "O Soma, abiding under thy sacred ordinance, bearing it within our very bodies, may we, blessed with offspring, remain devoted to thee.",
    },
    "7.2": {
        "meaning_ne": "हे रुद्र, यो तपाईंको भाग हो, तपाईंकी बहिनी अम्बिकासहित; यसलाई ग्रहण गर्नुहोस्, स्वाहा! यो तपाईंको भाग हो, हे रुद्र; मुसा तपाईंको वाहन हो।",
        "meaning_en": "This is your portion, O Rudra, along with your sister Ambika — accept it, svaha! This is your share, O Rudra; the mouse is your creature.",
    },
    "7.3": {
        "meaning_ne": "हामीले रुद्र, देव त्र्यम्बकलाई प्रसन्न पारेका छौं, ताकि उहाँले हामीलाई अझ समृद्ध बनाऊन्, अझ कल्याणकारी बनाऊन्, र हाम्रा कार्यहरूमा सफलता दिऊन्।",
        "meaning_en": "We have propitiated Rudra, the god Tryambaka, so that he may make us more prosperous, make us more blessed, and grant us success in our undertakings.",
    },
    "7.4": {
        "meaning_ne": "तपाईं औषधि हुनुहुन्छ — गाई, घोडा र मानिसका निम्ति औषधि; भेडा र भेडीका निम्ति सुख।",
        "meaning_en": "You are a remedy — a healing balm for cow, horse, and man; comfort and ease for the ram and the ewe.",
    },
    "7.5": {
        "meaning_ne": "हामी त्र्यम्बक (त्रिनेत्रधारी शिव)को पूजा गर्दछौं, जो सुगन्धित हुनुहुन्छ र सबैलाई पुष्ट पार्नुहुन्छ। काँक्रो आफ्नो बोटबाट पाकेर छुट्टिए झैं, उहाँले हामीलाई मृत्युबाट मुक्त गरून्, अमरताका लागि — मृत्युबाट होइन। हामी त्र्यम्बकको पूजा गर्दछौं, जो सुगन्धित हुनुहुन्छ र असल रक्षक प्रदान गर्नुहुन्छ। काँक्रो आफ्नो बोटबाट छुट्टिए झैं, उहाँले हामीलाई यस बन्धनबाट मुक्त गरून् — तर अमरताबाट होइन।",
        "meaning_en": "We worship Tryambaka, the fragrant one who nourishes and enriches all. As the ripe cucumber is freed from its binding stem, may He free us from death, for the sake of immortality — not from immortality itself. We worship Tryambaka, the fragrant one, the giver of a true protector; as the cucumber is freed from its bondage, may He free us from this bondage — but not from immortality.",
    },
    "7.6": {
        "meaning_ne": "हे रुद्र, यो तपाईंको आवास हो; यसका साथ मूजवत् पर्वतभन्दा पर जानुहोस्। धनुष खोलेर, हे पिनाकधारी, छाला-वस्त्रधारी, हामीलाई हानि नगरी, हे शिव, शान्तिपूर्वक जानुहोस्।",
        "meaning_en": "This, O Rudra, is your abode; with it, go beyond Mount Mujavat. With your bow unstrung, O wielder of the Pinaka, clad in a hide, harming us not, pass on in your gracious form.",
    },
    "7.7": {
        "meaning_ne": "जमदग्निको त्रिआयु (त्रिगुण दीर्घायु), कश्यपको त्रिआयु — देवताहरूमा जुन त्रिआयु छ, त्यही त्रिआयु हामीलाई पनि प्राप्त होस्।",
        "meaning_en": "The threefold lifespan of Jamadagni, the threefold lifespan of Kashyapa — whatever threefold lifespan exists among the gods, may that same threefold lifespan be granted to us.",
    },
    "7.8": {
        "meaning_ne": "तिम्रो नाम शिव हो; स्वधिति (बन्चरो) तिम्रो पिता हो; तिमीलाई नमस्कार; मलाई हानि नगर। म तिमीलाई दीर्घायु, अन्न-पोषण, सन्तानवृद्धि, धनसमृद्धि, असल सन्तान र बल-वीर्यतर्फ निर्देशित गर्दछु।",
        "meaning_en": "Your name is Shiva; the axe is your father — salutations to you; may you not harm me. I direct you toward long life, toward nourishment, toward progeny, toward abundance of wealth, toward good offspring, and toward strength and vitality.",
    },
}

CH8 = {
    "8.1": {
        "meaning_ne": "उग्र, भीषण, अन्धकारमय र गर्जने देवतालाई; सबैलाई पराजित गर्ने र आक्रमण गर्ने, छरपष्ट पार्नेलाई — स्वाहा!",
        "meaning_en": "To the Fierce One, the Terrible One, the Obscuring One, and the Roaring One; to the All-Conquering One and the Assailing One, the Scatterer — svaha!",
    },
    "8.2": {
        "meaning_ne": "हृदयद्वारा अग्निलाई, हृदयको अगिल्लो भागद्वारा अशनि (वज्र)लाई, सम्पूर्ण हृदयद्वारा पशुपतिलाई, कलेजोद्वारा भवलाई; दुई फोक्सोद्वारा शर्वलाई, क्रोध (पित्त)द्वारा ईशानलाई, भित्री पाँजरको मासुद्वारा महादेवलाई, वसाद्वारा उग्र देवलाई — यो अनुसार अङ्ग-अङ्गमा देवताहरूको आहुति दिइन्छ। (यो अत्यन्त प्राविधिक, अङ्गसम्बन्धी यज्ञसूत्र भएकाले यसको अनुवाद अनुमानित छ।)",
        "meaning_en": "To Agni by the heart, to Ashani (the thunderbolt) by the tip of the heart, to Pashupati by the whole heart, to Bhava by the liver; to Sharva by the two lungs, to Ishana by the wrath, to Mahadeva by the inner rib-flesh, to the fierce god by the omentum — a technical anatomical offering-formula; this rendering is a best-effort approximation.",
    },
    "8.3": {
        "meaning_ne": "रगतद्वारा उग्रलाई, असल व्रतद्वारा मित्रलाई, दुष्ट व्रतद्वारा रुद्रलाई, क्रीडाद्वारा इन्द्रलाई, बलद्वारा मरुत्हरूलाई, हर्षद्वारा साध्यहरूलाई; भवको घाँटीको भाग, रुद्रको भित्री कोखको भाग, महादेवको कलेजो, शर्वको फोक्सो, पशुपतिको आन्द्रा — यसरी अङ्ग-अङ्ग देवतालाई अर्पण गरिन्छ। (यो पनि प्राविधिक अङ्गसूत्र भएकाले अनुवाद अनुमानित छ।)",
        "meaning_en": "By blood to the Fierce One, by good conduct to Mitra, by ill conduct to Rudra, by sport to Indra, by strength to the Maruts, by joy to the Sadhyas; the throat-portion of Bhava, the inner flank of Rudra, Mahadeva's liver, Sharva's lung, Pashupati's intestines — another technical anatomical offering-formula, likewise a best-effort approximation.",
    },
    "8.4": {
        "meaning_ne": "रौंहरूलाई स्वाहा, रौंहरूलाई स्वाहा; छालालाई स्वाहा, छालालाई स्वाहा; रगतलाई स्वाहा, रगतलाई स्वाहा; बोसोलाई स्वाहा, बोसोलाई स्वाहा; मासुलाई स्वाहा, मासुलाई स्वाहा; नसालाई स्वाहा, नसालाई स्वाहा; हड्डीलाई स्वाहा, हड्डीलाई स्वाहा; मज्जालाई स्वाहा, मज्जालाई स्वाहा; वीर्यलाई स्वाहा, उत्सर्ग-अङ्गलाई स्वाहा।",
        "meaning_en": "To the hairs, svaha; to the hairs, svaha; to the skin, svaha; to the skin, svaha; to the blood, svaha; to the blood, svaha; to the fat, svaha; to the fat, svaha; to the flesh, svaha; to the flesh, svaha; to the sinews, svaha; to the sinews, svaha; to the bones, svaha; to the bones, svaha; to the marrow, svaha; to the marrow, svaha; to the semen, svaha; to the excretory organ, svaha.",
    },
    "8.5": {
        "meaning_ne": "परिश्रमलाई स्वाहा, अझ बढी परिश्रमलाई स्वाहा, संयुक्त परिश्रमलाई स्वाहा, वियुक्त परिश्रमलाई स्वाहा, उदय हुने परिश्रमलाई स्वाहा; शुद्धतालाई स्वाहा, जल्नेलाई स्वाहा, जलिरहेकोलाई स्वाहा, शोकलाई स्वाहा।",
        "meaning_en": "To exertion, svaha; to further exertion, svaha; to combined exertion, svaha; to separated exertion, svaha; to rising exertion, svaha; to purity, svaha; to the burning one, svaha; to the one who burns, svaha; to sorrow, svaha.",
    },
    "8.6": {
        "meaning_ne": "तपस्यालाई स्वाहा, तप्तहुनेलाई स्वाहा, तप्त भइरहेकोलाई स्वाहा, तप्त भइसकेकोलाई स्वाहा, गर्मीलाई स्वाहा; प्रायश्चित्तलाई स्वाहा, शुद्धिकरणलाई स्वाहा, औषधिलाई स्वाहा।",
        "meaning_en": "To austerity, svaha; to the one being heated, svaha; to the one heating, svaha; to the heated one, svaha; to heat, svaha; to atonement, svaha; to expiation, svaha; to medicine, svaha.",
    },
    "8.7": {
        "meaning_ne": "यमलाई स्वाहा, अन्तक (मृत्यु)लाई स्वाहा, मृत्युलाई स्वाहा, ब्रह्मलाई स्वाहा, ब्रह्महत्यालाई स्वाहा; सम्पूर्ण देवताहरूलाई स्वाहा, आकाश र पृथ्वीलाई स्वाहा।",
        "meaning_en": "To Yama, svaha; to Antaka (death), svaha; to Mrityu (death), svaha; to Brahma, svaha; to the sin of killing a Brahmin, svaha; to all the gods, svaha; to heaven and earth, svaha.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    filled = 0
    missing: list[str] = []
    for chnum, table in ((4, CH4), (5, CH5), (7, CH7), (8, CH8)):
        chapter = next(c for c in data["chapters"] if c["number"] == chnum)
        for shloka in chapter["shlokas"]:
            extra = table.get(shloka["verse_label"])
            if extra is None:
                missing.append(shloka["verse_label"])
                continue
            shloka["meaning_ne"] = extra["meaning_ne"]
            shloka["meaning_en"] = extra["meaning_en"]
            filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-4/5/7/8 meanings in {OUT}")


if __name__ == "__main__":
    main()
