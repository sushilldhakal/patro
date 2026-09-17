#!/usr/bin/env python3
"""Fill Gita ch. 7–9 meaning_en / meaning_ne. Original glosses of this recension."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH7 = {
    "7.1": {
        "meaning_ne": "श्रीभगवान्ले भने: हे पार्थ, ममा आसक्त मन, मदाश्रय भई योग गर्दै, सन्देहरहित समग्र मलाई जसरी जान्नेछौ त्यो सुन।",
        "meaning_en": "The Blessed Lord said: Hear, O Partha, how, with mind attached to me, practising yoga, taking refuge in me, you shall know me wholly, without doubt.",
    },
    "7.2": {
        "meaning_ne": "विज्ञानसहित यो ज्ञान म तिमीलाई अशेष भन्छु; जान्दा यहाँ फेरि जान्न बाँकी केही रहँदैन।",
        "meaning_en": "I shall tell you this knowledge together with its realization, without remainder. Knowing it, nothing further remains here to be known.",
    },
    "7.3": {
        "meaning_ne": "हजारौं मनुष्यमध्ये कोही सिद्धिका लागि यत्न गर्छ; यत्न गर्ने सिद्धहरूमा पनि कोही मलाई तत्त्वतः जान्दछ।",
        "meaning_en": "Among thousands of men, one strives for perfection; among those who strive and even among the perfected, one knows me in truth.",
    },
    "7.4": {
        "meaning_ne": "भूमि, जल, अनल, वायु, आकाश, मन, बुद्धि र अहङ्कार — यो मेरो आठ भागमा भिन्ना प्रकृति हो।",
        "meaning_en": "Earth, water, fire, air, space, mind, insight, and I-making — this is my prakriti, divided eightfold.",
    },
    "7.5": {
        "meaning_ne": "यो अपरा हो; यसभन्दा अर्को मेरी परा प्रकृति जान, हे महाबाहो — जीवभूता, जसले यो जगत् धारण गर्छ।",
        "meaning_en": "This is the lower. Know my other prakriti as higher than this, O mighty-armed — the living being by which this world is upheld.",
    },
    "7.6": {
        "meaning_ne": "सबै भूत यिनै दुईको योनि हुन् भनी धारण गर; म नै कृत्स्न जगत्को प्रभव र प्रलय हुँ।",
        "meaning_en": "Hold that all beings have their womb in these two. I am the arising of the whole world, and its dissolution as well.",
    },
    "7.7": {
        "meaning_ne": "हे धनञ्जय, मभन्दा परतर केही छैन; यो सब ममा प्रोत छ — सूत्रमा मणिहरू जस्तै।",
        "meaning_en": "There is nothing else higher than me, O Dhananjaya. All this is strung on me as gems on a thread.",
    },
    "7.8": {
        "meaning_ne": "हे कौन्तेय, जलमा रस म हुँ, शशि-सूर्यको प्रभा म, सबै वेदमा प्रणव, आकाशमा शब्द, मनुष्यमा पौरुष।",
        "meaning_en": "I am the taste in water, O son of Kunti, the radiance of moon and sun, the pranava in all the Vedas, sound in space, and manhood in men.",
    },
    "7.9": {
        "meaning_ne": "पृथ्वीमा पुण्य गन्ध म, अग्निमा तेज म, सबै भूतमा जीवन म, तपस्वीहरूमा तप म।",
        "meaning_en": "I am the pure fragrance in the earth and the heat in fire. I am the life in all beings, and tapas in those who practise tapas.",
    },
    "7.10": {
        "meaning_ne": "हे पार्थ, सबै भूतको सनातन बीज मलाई जान; बुद्धिमान्हरूको बुद्धि म, तेजस्वीहरूको तेज म।",
        "meaning_en": "Know me as the eternal seed of all beings, O Partha. I am the insight of the insightful, the brilliance of the brilliant.",
    },
    "7.11": {
        "meaning_ne": "काम-रागरहित बलवान्हरूको बल म हुँ; हे भरतर्षभ, भूतहरूमा धर्मविरुद्ध नभएको काम म हुँ।",
        "meaning_en": "I am the strength of the strong, free of desire and clinging. In beings I am desire that does not run against dharma, O best of Bharatas.",
    },
    "7.12": {
        "meaning_ne": "सात्त्विक, राजस, तामस जति भाव छन्, ती मबाटै हुन् जान; तर म तिनमा छैन, ती ममा छन्।",
        "meaning_en": "Whatever states are of sattva, of rajas, or of tamas, know them as from me alone. I am not in them; they are in me.",
    },
    "7.13": {
        "meaning_ne": "यी तीन गुणमय भावले मोहित यो सब जगत्, यिनभन्दा पर अव्यय मलाई चिन्दैन।",
        "meaning_en": "Deluded by these three states made of the gunas, this whole world does not know me, who am beyond them, unchanging.",
    },
    "7.14": {
        "meaning_ne": "गुणमयी यो दैवी मेरी माया दुरत्यय छ; मकहाँ नै शरण पर्नेहरू यो माया तर्छन्।",
        "meaning_en": "This divine maya of mine, made of the gunas, is hard to cross. Those who take refuge in me alone cross this maya.",
    },
    "7.15": {
        "meaning_ne": "दुष्कृती, मूढ, नराधमहरू मकहाँ आउँदैनन् — मायाले ज्ञान हरेका, आसुर भावमा आश्रित।",
        "meaning_en": "The evil-doers, the deluded, the lowest of men do not take refuge in me — their knowledge stolen by maya, they rest in an asuric nature.",
    },
    "7.16": {
        "meaning_ne": "हे अर्जुन, चारथरी सुकृती जन मलाई भज्छन् — आर्त, जिज्ञासु, अर्थार्थी र ज्ञानी, हे भरतर्षभ।",
        "meaning_en": "Four kinds of people who have done good worship me, Arjuna: the distressed, the seeker of knowledge, the seeker of gain, and the knower, O best of Bharatas.",
    },
    "7.17": {
        "meaning_ne": "तिनमध्ये नित्ययुक्त एकभक्त ज्ञानी श्रेष्ठ हो; ज्ञानीलाई म अत्यन्त प्रिय, ऊ पनि मलाई प्रिय।",
        "meaning_en": "Of these the knower, always yoked, of single devotion, is distinguished. I am exceedingly dear to the knower, and he is dear to me.",
    },
    "7.18": {
        "meaning_ne": "यी सबै उदार हुन्; तर ज्ञानीलाई म आत्मा नै ठान्छु। ऊ युक्तात्मा ममा नै स्थित, अनुत्तम गति म नै।",
        "meaning_en": "All these are generous; but the knower I hold as my very self. He, the yoked self, is established in me, the unsurpassed goal.",
    },
    "7.19": {
        "meaning_ne": "धेरै जन्मको अन्त्यमा ज्ञानवान् मकहाँ आउँछ — «वासुदेव नै सब» भनी; त्यो महात्मा सुदुर्लभ हो।",
        "meaning_en": "At the end of many births the one who knows takes refuge in me, thinking \"Vasudeva is all.\" Such a great-souled one is very hard to find.",
    },
    "7.20": {
        "meaning_ne": "ति-ति कामले ज्ञान हरेका अरू देवताकहाँ जान्छन्; आफ्नै प्रकृतिले नियत भई त्यही-त्यही नियम अपनाउँछन्।",
        "meaning_en": "Those whose knowledge is carried off by this or that desire take refuge in other gods, following this or that rule, constrained by their own prakriti.",
    },
    "7.21": {
        "meaning_ne": "भक्त जुन-जुन रूप श्रद्धाले पूज्ने इच्छा गर्छ, त्यसैको अचला श्रद्धा म नै दिन्छु।",
        "meaning_en": "Whatever form a devotee wishes to worship with faith, that very faith I make unshaken for him.",
    },
    "7.22": {
        "meaning_ne": "त्यस श्रद्धाले युक्त भई त्यसको आराधना गर्छ; त्यहाँबाट काम पाउँछ — ती मैले नै विहित।",
        "meaning_en": "Yoked with that faith he strives in that worship, and from it he obtains his desires — those indeed appointed by me.",
    },
    "7.23": {
        "meaning_ne": "अल्पमेधाहरूको त्यो फल अन्तवत् हुन्छ; देवपूजक देवताकहाँ जान्छन्, मद्भक्त मकहाँ जान्छन्।",
        "meaning_en": "But that fruit of theirs is finite, for those of small understanding. Worshippers of the gods go to the gods; my devotees go to me as well.",
    },
    "7.24": {
        "meaning_ne": "अबुद्धिहरू मलाई अव्यक्त व्यक्तिमा आएको ठान्छन्; मेरो अव्यय अनुत्तम पर भाव जान्दैनन्।",
        "meaning_en": "The unwise think I have come from the unmanifest into manifestation, not knowing my higher being, unchanging and unsurpassed.",
    },
    "7.25": {
        "meaning_ne": "योगमायाले ढाकिएको म सबैलाई प्रकाश हुँदिनँ; यो मूढ लोक अज अव्यय मलाई चिन्दैन।",
        "meaning_en": "I am not revealed to all, wrapped in yoga-maya. This deluded world does not know me, unborn, unchanging.",
    },
    "7.26": {
        "meaning_ne": "हे अर्जुन, बितेका, वर्तमान र हुने सबै भूत म जान्छु; तर मलाई कोही जान्दैन।",
        "meaning_en": "I know the beings that are past, that are present, and that are yet to be, Arjuna; but no one knows me.",
    },
    "7.27": {
        "meaning_ne": "हे भारत, इच्छा-द्वेषबाट उठेको द्वन्द्वमोहले, हे परन्तप, सर्गमा सबै भूत सम्मोहमा जान्छन्।",
        "meaning_en": "By the delusion of the pairs, sprung from wanting and aversion, all beings go to bewilderment at birth, O Bharata, scorcher of foes.",
    },
    "7.28": {
        "meaning_ne": "पुण्यकर्मी जनहरूको पाप अन्त्य भएपछि द्वन्द्वमोहबाट मुक्त भई दृढव्रतले मलाई भज्छन्।",
        "meaning_en": "But those whose evil has come to an end, people of good works, freed from the delusion of the pairs, worship me with firm vows.",
    },
    "7.29": {
        "meaning_ne": "जरा-मरण मोक्षका लागि ममा आश्रित यत्न गर्नेहरू त्यो ब्रह्म, कृत्स्न अध्यात्म र सबै कर्म जान्दछन्।",
        "meaning_en": "Those who strive, taking refuge in me, for release from old age and death, know that Brahman, the whole of the inner self, and all action.",
    },
    "7.30": {
        "meaning_ne": "अधिभूत, अधिदैव र अधियज्ञसहित मलाई जान्ने युक्तचित्तहरू प्रयाणकालमा पनि मलाई जान्दछन्।",
        "meaning_en": "Those who know me together with what pertains to beings, to the gods, and to yajna, know me even at the hour of going forth, their minds yoked.",
    },
}

CH8 = {
    "8.1": {
        "meaning_ne": "अर्जुनले भने: हे पुरुषोत्तम, त्यो ब्रह्म के, अध्यात्म के, कर्म के? अधिभूत के भनिएको, अधिदैव के भनिन्छ?",
        "meaning_en": "Arjuna said: What is that Brahman, what the inner self, what action, O highest Person? What is called that which pertains to beings, and what is said to be that which pertains to the gods?",
    },
    "8.2": {
        "meaning_ne": "हे मधुसूदन, यस देहमा अधियज्ञ कसरी, को हो? नियतात्माहरूले प्रयाणकालमा तिमीलाई कसरी जानिन्छ?",
        "meaning_en": "How and who is the lord of yajna here in this body, O Madhusudana? And how are you to be known at the hour of going forth by those of restrained self?",
    },
    "8.3": {
        "meaning_ne": "श्रीभगवान्ले भने: परम अक्षर ब्रह्म हो; स्वभावलाई अध्यात्म भनिन्छ; भूतभावको उद्भव गराउने विसर्ग कर्मसंज्ञित हो।",
        "meaning_en": "The Blessed Lord said: Brahman is the highest Imperishable; own-nature is called the inner self. The issuing that causes the arising of the being of beings is named action.",
    },
    "8.4": {
        "meaning_ne": "क्षयशील भाव अधिभूत हो, पुरुष अधिदैवत; हे देहभृत् श्रेष्ठ, यस देहमा अधियज्ञ म नै हुँ।",
        "meaning_en": "That which pertains to beings is the perishable state; the Person is that which pertains to the gods. I myself am the lord of yajna here in the body, O best of the embodied.",
    },
    "8.5": {
        "meaning_ne": "अन्तकालमा मलाई नै सम्झेर कलेवर छाडी जाने मद्भावमा जान्छ; यहाँ सन्देह छैन।",
        "meaning_en": "Who at the last hour, remembering me alone, goes forth leaving the body, goes to my being. Of this there is no doubt.",
    },
    "8.6": {
        "meaning_ne": "हे कौन्तेय, अन्त्यमा जुन-जुन भाव सम्झेर कलेवर छाड्छ, त्यही-त्यहीमा जान्छ — सधैं त्यस भावले भावित भएकाले।",
        "meaning_en": "Whatever state one remembers as he leaves the body at the end, that very state he reaches, O son of Kunti, always formed by that state.",
    },
    "8.7": {
        "meaning_ne": "तसर्थ सबै कालमा मलाई अनुस्मरण गर र युद्ध गर; मन-बुद्धि ममा अर्पण गरेर सन्देहरहित मकहाँ आउनेछौ।",
        "meaning_en": "Therefore at all times remember me and fight. With mind and insight offered to me you will come to me without doubt.",
    },
    "8.8": {
        "meaning_ne": "अभ्यासयोगले युक्त, अन्यत्र नजाने चित्तले दिव्य परम पुरुषलाई अनुचिन्तन गर्दै हे पार्थ, जान्छ।",
        "meaning_en": "With thought yoked by the yoga of practice, going nowhere else, he goes to the divine highest Person, O Partha, meditating on him.",
    },
    "8.9": {
        "meaning_ne": "कवि, पुराण, अनुशास्ता, अणुभन्दा अणु, सबैको धाता, अचिन्त्यरूप, आदित्यवर्ण, तमभन्दा पर — जसले अनुस्मरण गर्छ।",
        "meaning_en": "Who remembers the Seer, the Ancient, the Ordainer, smaller than the small, the supporter of all, of unthinkable form, sun-coloured, beyond darkness.",
    },
    "8.10": {
        "meaning_ne": "प्रयाणकालमा अचल मन, भक्ति र योगबलले युक्त, भ्रुकुटिबीच प्राण राम्ररी राखी त्यो दिव्य परम पुरुषलाई पाउँछ।",
        "meaning_en": "At the hour of going forth, with unmoving mind, yoked with bhakti and the strength of yoga, setting the breath well between the brows, he reaches that divine highest Person.",
    },
    "8.11": {
        "meaning_ne": "वेदवित्हरूले अक्षर भन्ने, वीतराग यतिहरू प्रवेश गर्ने, चाहेर ब्रह्मचर्य गर्ने — त्यो पद म संक्षेपमा भन्छु।",
        "meaning_en": "That Imperishable which knowers of the Veda speak of, which striving ones free of passion enter, desiring which they practise brahmacharya — that place I shall tell you in brief.",
    },
    "8.12": {
        "meaning_ne": "सबै द्वार संयम गरी मन हृदयमा निरुद्ध पारी, आफ्नो प्राण मूर्धामा राखी योगधारणामा स्थित।",
        "meaning_en": "Closing all the gates, restraining the mind in the heart, placing one's own breath in the head, established in yoga-holding.",
    },
    "8.13": {
        "meaning_ne": "ॐ यो एकाक्षर ब्रह्म उच्चारण गर्दै मलाई अनुस्मरण गर्दै देह छाडी जाने परम गति जान्छ।",
        "meaning_en": "Uttering Om, the one-syllable Brahman, remembering me, who goes forth leaving the body, he goes to the highest course.",
    },
    "8.14": {
        "meaning_ne": "अनन्य चित्तले सधैं नित्य मलाई सम्झने नित्ययुक्त योगीलाई, हे पार्थ, म सुलभ छु।",
        "meaning_en": "I am easy to reach, O Partha, for that yogin always yoked who remembers me constantly, his thought on no other.",
    },
    "8.15": {
        "meaning_ne": "मलाई पाएर महात्माहरू, परम संसिद्धि गएका, दुःखालय अशाश्वत पुनर्जन्म पाउँदैनन्।",
        "meaning_en": "Having reached me, the great-souled ones who have gone to the highest perfection do not gain rebirth, that transient house of pain.",
    },
    "8.16": {
        "meaning_ne": "हे अर्जुन, ब्रह्मलोकसम्मका लोक पुनरावर्ती हुन्; हे कौन्तेय, मलाई पाएपछि पुनर्जन्म हुँदैन।",
        "meaning_en": "Worlds up to the realm of Brahma are returns, Arjuna. But having reached me, O son of Kunti, there is no rebirth.",
    },
    "8.17": {
        "meaning_ne": "ब्रह्माको दिन हजार युगसम्म जान्ने, रात्रि पनि हजार युगको अन्त्यसम्म — तिनी अहोरत्रवित् हुन्।",
        "meaning_en": "Those who know that Brahma's day ends at a thousand yugas, and the night at a thousand yugas, are the knowers of day and night.",
    },
    "8.18": {
        "meaning_ne": "दिन आएपछि अव्यक्तबाट सबै व्यक्त उत्पन्न हुन्छन्; रात्रि आएपछि त्यही अव्यक्तसंज्ञकमा लीन हुन्छन्।",
        "meaning_en": "From the unmanifest all manifestations arise at the coming of day; at the coming of night they dissolve there, in what is called the unmanifest.",
    },
    "8.19": {
        "meaning_ne": "यही भूतसमूह भएर-भएर लीन हुन्छ; हे पार्थ, रात्रिमा अवश, दिन आएपछि फेरि प्रभव हुन्छ।",
        "meaning_en": "This same host of beings, coming to be again and again, is dissolved at the coming of night, helpless, O Partha, and comes forth at the coming of day.",
    },
    "8.20": {
        "meaning_ne": "तर त्यस अव्यक्तभन्दा पर अर्को सनातन अव्यक्त भाव छ; सबै भूत नष्ट हुँदा पनि त्यो विनष्ट हुँदैन।",
        "meaning_en": "But beyond that is another being, unmanifest, eternal, higher than the unmanifest, which does not perish when all beings perish.",
    },
    "8.21": {
        "meaning_ne": "त्यसलाई अव्यक्त अक्षर भनिन्छ, परम गति भनिन्छ; पाएर नफर्किने — त्यो मेरो परम धाम हो।",
        "meaning_en": "It is called the unmanifest Imperishable; they call it the highest course. Reaching which they do not return — that is my highest abode.",
    },
    "8.22": {
        "meaning_ne": "हे पार्थ, त्यो पर पुरुष अनन्य भक्तिले पाइन्छ; जसभित्र भूतहरू स्थित छन्, जसले यो सब तत छ।",
        "meaning_en": "That highest Person, O Partha, is to be reached by bhakti that has no other. Within him beings stand; by him all this is spread.",
    },
    "8.23": {
        "meaning_ne": "हे भरतर्षभ, योगीहरू अनावृत्ति वा आवृत्ति जाने काल म भन्छु — प्रयाण गर्दा जुन कालमा जान्छन्।",
        "meaning_en": "The time in which yogins who have gone forth go to non-return, and to return, I shall tell you, O best of Bharatas.",
    },
    "8.24": {
        "meaning_ne": "अग्नि, ज्योति, अहन्, शुक्ल, छ महिना उत्तरायण — त्यहाँ प्रयाण गर्ने ब्रह्मवित् जन ब्रह्ममा जान्छन्।",
        "meaning_en": "Fire, light, day, the bright fortnight, the six months of the northern course — those who have gone forth then, knowers of Brahman, go to Brahman.",
    },
    "8.25": {
        "meaning_ne": "धूम, रात्रि, कृष्णपक्ष, छ महिना दक्षिणायन — त्यहाँ चान्द्रमस ज्योति पाएर योगी फर्कन्छ।",
        "meaning_en": "Smoke, night, the dark fortnight, the six months of the southern course — the yogin, reaching the lunar light there, returns.",
    },
    "8.26": {
        "meaning_ne": "शुक्ल र कृष्ण यी दुई जगत्की शाश्वत गति मानिएका छन्; एकले अनावृत्ति, अर्कोले फेरि आवृत्ति।",
        "meaning_en": "These two courses of the world, the bright and the dark, are held eternal. By one he goes to non-return; by the other he returns again.",
    },
    "8.27": {
        "meaning_ne": "हे पार्थ, यी दुई सृति जाने कुनै योगी मोहित हुँदैन; तसर्थ सबै कालमा योगयुक्त होओ, हे अर्जुन।",
        "meaning_en": "Knowing these two paths, O Partha, no yogin is deluded. Therefore at all times be yoked in yoga, Arjuna.",
    },
    "8.28": {
        "meaning_ne": "वेद, यज्ञ, तप, दानमा जुन पुण्यफल निर्दिष्ट छ, यो जानेर योगी त्यो सब नाघ्छ र आद्य परम स्थान पाउँछ।",
        "meaning_en": "Whatever merit-fruit is declared in the Vedas, in yajnas, in tapas, and in gifts — knowing this the yogin passes beyond all that and reaches the primal highest place.",
    },
}

CH9 = {
    "9.1": {
        "meaning_ne": "श्रीभगवान्ले भने: अनसूयु तिमीलाई यो गुह्यतम ज्ञान विज्ञानसहित भन्छु; जान्दा अशुभबाट मुक्त हुनेछौ।",
        "meaning_en": "The Blessed Lord said: To you who do not find fault I shall tell this most secret knowledge, together with realization, knowing which you will be freed from ill.",
    },
    "9.2": {
        "meaning_ne": "यो राजविद्या, राजगुह्य, पवित्र, उत्तम, प्रत्यक्षले बुझिने, धर्म्य, गर्न सुखद, अव्यय हो।",
        "meaning_en": "This is the royal knowledge, the royal secret, purifying, highest, known in direct seeing, in accord with dharma, easy to practise, unchanging.",
    },
    "9.3": {
        "meaning_ne": "हे परन्तप, यस धर्ममा अश्रद्धा गर्ने पुरुष मलाई नपाई मृत्युसंसारको बाटोमा फर्कन्छन्।",
        "meaning_en": "Persons without faith in this dharma, O scorcher of foes, not reaching me, return on the path of death and wandering.",
    },
    "9.4": {
        "meaning_ne": "अव्यक्त मूर्तिले मैले यो सब जगत् तत छ; सबै भूत ममा स्थित छन्, तर म तिनमा अवस्थित छैन।",
        "meaning_en": "By me this whole world is spread, in my unmanifest form. All beings stand in me, and I do not stand in them.",
    },
    "9.5": {
        "meaning_ne": "भूतहरू ममा स्थित पनि छैनन् — मेरो ऐश्वर योग हेर। भूतभृत्, भूतस्थ होइन, मेरो आत्मा भूतभावन हो।",
        "meaning_en": "And beings do not stand in me — behold my lordly yoga. Supporting beings, not standing in beings, my self is the bringer-forth of beings.",
    },
    "9.6": {
        "meaning_ne": "आकाशमा नित्य स्थित सर्वत्रगामी महान् वायु जस्तै, सबै भूत ममा स्थित जान।",
        "meaning_en": "As the great wind, going everywhere, always stands in space, so all beings stand in me — hold this.",
    },
    "9.7": {
        "meaning_ne": "हे कौन्तेय, सबै भूत कल्पक्षयमा मेरी प्रकृतिमा जान्छन्; कल्पको आदिमा म तिनीहरूलाई फेरि विसृजन्छु।",
        "meaning_en": "All beings, O son of Kunti, go to my prakriti at the waning of the kalpa; I send them forth again at the beginning of the kalpa.",
    },
    "9.8": {
        "meaning_ne": "आफ्नै प्रकृति अवलम्बन गरी यो कृत्स्न भूतसमूह प्रकृतिवशले अवश, म बारम्बार विसृजन्छु।",
        "meaning_en": "Resting on my own prakriti, I send forth again and again this whole host of beings, helpless under prakriti's power.",
    },
    "9.9": {
        "meaning_ne": "हे धनञ्जय, ती कर्मले म बाँधिँदिनँ; तिनमा आसक्तिरहित, उदासीन जस्तै बसेको।",
        "meaning_en": "Nor do those acts bind me, O Dhananjaya, sitting as one indifferent, unattached in those works.",
    },
    "9.10": {
        "meaning_ne": "मेरो अध्यक्षतामा प्रकृतिले सचराचर सूजन गर्छ; हे कौन्तेय, यस हेतुले जगत् परिवर्तित हुन्छ।",
        "meaning_en": "With me as overseer, prakriti brings forth the moving and the unmoving. By this cause, O son of Kunti, the world revolves.",
    },
    "9.11": {
        "meaning_ne": "मानुषी तनु लिएको मलाई मूढहरू अवज्ञा गर्छन्; भूतमहेश्वर मेरो पर भाव जान्दैनन्।",
        "meaning_en": "Fools scorn me who have taken a human body, not knowing my higher being, the great lord of beings.",
    },
    "9.12": {
        "meaning_ne": "मोघ आशा, मोघ कर्म, मोघ ज्ञान, विचेतस्; राक्षसी, आसुरी मोहिनी प्रकृतिमा आश्रित।",
        "meaning_en": "Vain their hopes, vain their works, vain their knowledge, without sense; they have resorted to a deluding rakshasa and asura nature.",
    },
    "9.13": {
        "meaning_ne": "हे पार्थ, दैवी प्रकृतिमा आश्रित महात्माहरू अनन्य मनले मलाई भज्छन् — भूतादि अव्यय जानेर।",
        "meaning_en": "But the great-souled, O Partha, taking refuge in the divine prakriti, worship me with minds on no other, knowing me as the unchanging origin of beings.",
    },
    "9.14": {
        "meaning_ne": "सधैं कीर्तन गर्दै, दृढव्रतले यत्न गर्दै, नमस्कार गर्दै भक्तिले नित्ययुक्त उपासना गर्छन्।",
        "meaning_en": "Always singing of me, striving with firm vows, bowing to me with bhakti, always yoked, they worship.",
    },
    "9.15": {
        "meaning_ne": "अरू ज्ञानयज्ञले पनि मलाई यजन-उपासना गर्छन् — एकत्वले, पृथक्त्वले, बहुधा विश्वतोमुख रूपमा।",
        "meaning_en": "Others too worship me, sacrificing with the yajna of knowledge — as one, as distinct, as many-faced in many ways.",
    },
    "9.16": {
        "meaning_ne": "म क्रतु हुँ, म यज्ञ, म स्वधा, म औषध; मन्त्र म, आज्य म, अग्नि म, हुत म।",
        "meaning_en": "I am the rite, I am the yajna, I am the svadha, I am the herb. I am the mantra, I the ghee, I the fire, I the offering.",
    },
    "9.17": {
        "meaning_ne": "यस जगत्को पिता म, माता, धाता, पितामह; वेद्य, पवित्र ॐकार, ऋक्, साम, यजुष् पनि म।",
        "meaning_en": "I am the father of this world, the mother, the supporter, the grandfather; the knowable, the purifying Om, the Rik, the Saman, and the Yajus as well.",
    },
    "9.18": {
        "meaning_ne": "गति, भर्ता, प्रभु, साक्षी, निवास, शरण, सुहृद्; प्रभव, प्रलय, स्थान, निधान, अव्यय बीज म।",
        "meaning_en": "The goal, the upholder, the lord, the witness, the dwelling, the refuge, the friend; the arising, the dissolution, the standing-place, the treasure-house, the unchanging seed.",
    },
    "9.19": {
        "meaning_ne": "म ताप्छु, म वर्षा रोक्छु र छोड्छु; अमृत र मृत्यु पनि म, सत् र असत् पनि म, हे अर्जुन।",
        "meaning_en": "I give heat, I hold back the rain and send it forth. I am deathlessness and death, and being and non-being, Arjuna.",
    },
    "9.20": {
        "meaning_ne": "त्रैविद्या सोमपा, पापपूत, यज्ञले इष्टि गरी स्वर्ग चाहन्छन्; पुण्य पाएर सुरेन्द्रलोकमा दिव्य देवभोग खान्छन्।",
        "meaning_en": "The knowers of the three Vedas, soma-drinkers, cleansed of evil, having worshipped with yajnas, pray for the course to heaven. Reaching merit they eat the divine enjoyments of the gods in Indra's world.",
    },
    "9.21": {
        "meaning_ne": "त्यो विशाल स्वर्गलोक भोगी पुण्य क्षीण भएपछि मर्त्यलोकमा पस्छन्; त्रयीधर्ममा लागेका कामकामी आउजाउ पाउँछन्।",
        "meaning_en": "Having enjoyed that wide heaven-world, when merit is spent they enter the mortal world. Thus those who follow the dharma of the three, desiring desires, gain going and coming.",
    },
    "9.22": {
        "meaning_ne": "अनन्य भई मलाई चिन्तन गर्दै पर्युपासना गर्ने नित्याभियुक्तहरूको योग-क्षेम म वहन गर्छु।",
        "meaning_en": "Those people who worship me, thinking of me with no other, always joined to me — I carry their yoga and their kshema.",
    },
    "9.23": {
        "meaning_ne": "अन्य देवताका भक्त श्रद्धायुक्त यजन गर्नेहरू पनि, हे कौन्तेय, मलाई नै यजन गर्छन् — विधिपूर्वक होइन।",
        "meaning_en": "Even those devoted to other gods who sacrifice, endowed with faith, sacrifice to me alone, O son of Kunti, though not according to the ordinance.",
    },
    "9.24": {
        "meaning_ne": "सबै यज्ञको भोक्ता र प्रभु म नै हुँ; तर मलाई तत्त्वले चिन्दैनन्, त्यसैले च्युत हुन्छन्।",
        "meaning_en": "For I am the enjoyer and the lord of all yajnas. They do not know me in truth, and so they fall.",
    },
    "9.25": {
        "meaning_ne": "देवव्रती देवताकहाँ, पितृव्रती पितृकहाँ, भूतेज्य भूतकहाँ जान्छन्; मद्याजी मकहाँ जान्छन्।",
        "meaning_en": "Votaries of the gods go to the gods; votaries of the fathers go to the fathers; worshippers of beings go to beings; those who sacrifice to me go to me as well.",
    },
    "9.26": {
        "meaning_ne": "पत्र, पुष्प, फल, जल जो भक्तिले मलाई दिन्छ, प्रयतात्माको भक्ति-उपहार त्यो म खान्छु।",
        "meaning_en": "A leaf, a flower, a fruit, water — who offers it to me with bhakti, that offering of bhakti I eat, from one of striving self.",
    },
    "9.27": {
        "meaning_ne": "जे गर्छौ, जे खान्छौ, जे होम गर्छौ, जे दिन्छौ, जे तप गर्छौ, हे कौन्तेय, त्यो मदर्पण गर।",
        "meaning_en": "Whatever you do, whatever you eat, whatever you offer in fire, whatever you give, whatever tapas you do, O son of Kunti, do that as an offering to me.",
    },
    "9.28": {
        "meaning_ne": "यसरी शुभाशुभ फलरूप कर्मबन्धनबाट मुक्त हुनेछौ; संन्यासयोगयुक्तात्मा विमुक्त मकहाँ आउनेछौ।",
        "meaning_en": "Thus you will be freed from the bonds of action, whose fruits are fair and foul. With self yoked in the yoga of renunciation, released, you will come to me.",
    },
    "9.29": {
        "meaning_ne": "सबै भूतमा म सम छु; मेरो द्वेष्य छैन, प्रिय पनि होइन। तर भक्तिले भज्ने ममा छन्, म पनि तिनमा।",
        "meaning_en": "I am the same in all beings; none is hated by me, none dear. But those who worship me with bhakti are in me, and I too in them.",
    },
    "9.30": {
        "meaning_ne": "सुदुराचारी भए पनि अनन्य भई मलाई भज्ने साधु नै मानिनुपर्छ; ऊ सम्यक् व्यवसित छ।",
        "meaning_en": "Even if one of very bad conduct worships me with no other share, he is to be thought a sadhu; he is rightly resolved.",
    },
    "9.31": {
        "meaning_ne": "चाँडै धर्मात्मा हुन्छ, शाश्वत शान्ति पाउँछ; हे कौन्तेय, प्रतिज्ञा गर — मेरो भक्त नष्ट हुँदैन।",
        "meaning_en": "Quickly he becomes one whose self is dharma; he goes to lasting peace. Declare it, O son of Kunti: my devotee is not lost.",
    },
    "9.32": {
        "meaning_ne": "हे पार्थ, ममा आश्रित जो पापयोनि भए पनि — स्त्री, वैश्य, शूद्र — तिनै परा गति जान्छन्।",
        "meaning_en": "For those who take refuge in me, O Partha, even if they be of inauspicious birth — women, vaishyas, and shudras — they too go to the highest course.",
    },
    "9.33": {
        "meaning_ne": "पुण्य ब्राह्मण, भक्त राजर्षिहरूको कुरा के? यो अनित्य असुख लोक पाएर मलाई भज।",
        "meaning_en": "How much more, then, holy brahmanas, and devoted royal sages. Having reached this transient, joyless world, worship me.",
    },
    "9.34": {
        "meaning_ne": "मन्मना होओ, मद्भक्त, मद्याजी, मलाई नमस्कार गर; आत्मा युक्त गरी मत्परायण भई मकहाँ नै आउनेछौ।",
        "meaning_en": "Be one whose mind is on me, my devotee, my sacrificer; bow to me. Yoking the self thus, intent on me as the highest, you will come to me.",
    },
}

CHAPTERS = {7: CH7, 8: CH8, 9: CH9}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    for n, table in CHAPTERS.items():
        chapter = next(c for c in data["chapters"] if c["number"] == n)
        missing = []
        filled = 0
        for shloka in chapter["shlokas"]:
            extra = table.get(shloka["verse_label"])
            if extra is None:
                if shloka["verse_label"].startswith("इति"):
                    continue
                missing.append(shloka["verse_label"])
                continue
            shloka["meaning_ne"] = extra["meaning_ne"]
            shloka["meaning_en"] = extra["meaning_en"]
            filled += 1
        if missing:
            raise SystemExit(f"ch {n} no gloss for {missing}")
        print(f"filled {filled} chapter-{n} meanings")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
