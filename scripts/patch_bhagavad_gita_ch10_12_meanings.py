#!/usr/bin/env python3
"""Fill Gita ch. 10–12 meaning_en / meaning_ne. Original glosses of this recension."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH10 = {
    "10.1": {
        "meaning_ne": "श्रीभगवान्ले भने: हे महाबाहो, फेरि मेरो परम वचन सुन; प्रीतिमान् तिमीलाई हितकाम्याले भन्छु।",
        "meaning_en": "The Blessed Lord said: Hear again my highest word, O mighty-armed, which I shall speak to you who are pleased, wishing your good.",
    },
    "10.2": {
        "meaning_ne": "मेरो प्रभव सुरगणहरू जान्दैनन्, महर्षिहरू पनि होइनन्; म नै देवता र महर्षिहरूको आदि हुँ सबै प्रकारले।",
        "meaning_en": "Neither the hosts of the gods nor the great seers know my arising; for I am the beginning of the gods and of the great seers in every way.",
    },
    "10.3": {
        "meaning_ne": "अज, अनादि, लोकमहेश्वर मलाई जान्ने मर्त्यहरूमा असम्मूढ सबै पापबाट मुक्त हुन्छ।",
        "meaning_en": "Who knows me as unborn, without beginning, the great lord of the worlds — he, undeluded among mortals, is released from all evils.",
    },
    "10.4": {
        "meaning_ne": "बुद्धि, ज्ञान, असम्मोह, क्षमा, सत्य, दम, शम, सुख, दुःख, भव, अभाव, भय र अभय।",
        "meaning_en": "Insight, knowledge, non-delusion, forbearance, truth, restraint of the senses, stillness of mind, pleasure, pain, becoming, non-becoming, fear, and fearlessness.",
    },
    "10.5": {
        "meaning_ne": "अहिंसा, समता, तुष्टि, तप, दान, यश, अयश — भूतहरूका यी पृथग्विध भाव मबाटै हुन्छन्।",
        "meaning_en": "Non-harm, evenness, contentment, tapas, giving, fame and infamy — the various states of beings come from me alone.",
    },
    "10.6": {
        "meaning_ne": "पूर्वका सात महर्षि र चार मनु मद्भाव मानस जन्मिए; यस लोकका यी प्रजा तिनैका हुन्।",
        "meaning_en": "The seven great seers of old, and the four Manus, were born of my being, of mind; from them are these peoples in the world.",
    },
    "10.7": {
        "meaning_ne": "मेरो यो विभूति र योग तत्त्वतः जान्ने अविकम्प योगले युक्त हुन्छ; यहाँ सन्देह छैन।",
        "meaning_en": "Who knows in truth this majesty of mine and this yoga is joined by unshaken yoga. Of this there is no doubt.",
    },
    "10.8": {
        "meaning_ne": "म सबैको प्रभव हुँ, मबाट सब प्रवृत्त हुन्छ; यसरी मानेर भावसहित बुधहरू मलाई भज्छन्।",
        "meaning_en": "I am the arising of all; from me all comes forth. Knowing this, the wise worship me, endowed with feeling.",
    },
    "10.9": {
        "meaning_ne": "मच्चित्त, मद्गतप्राण, परस्पर बोध गराउँदै, नित्य मलाई कथन् गर्दै तृप्त हुन्छन् र रम्छन्।",
        "meaning_en": "Their thought on me, their life gone to me, awakening one another and speaking of me always, they are content and they delight.",
    },
    "10.10": {
        "meaning_ne": "प्रीतिपूर्वक भज्ने सततयुक्तहरूलाई त्यो बुद्धियोग दिन्छु, जसले मकहाँ पुग्छन्।",
        "meaning_en": "To those always yoked, who worship with love, I give that yoga of insight by which they come to me.",
    },
    "10.11": {
        "meaning_ne": "तिनैको अनुकम्पाका लागि आत्मभावमा स्थित म ज्ञानको भास्वत् दीपले अज्ञानजन्मे तम नाश गर्छु।",
        "meaning_en": "Out of compassion for them alone, standing in their own being, I destroy the darkness born of ignorance with the shining lamp of knowledge.",
    },
    "10.12": {
        "meaning_ne": "अर्जुनले भने: तपाईं पर ब्रह्म, पर धाम, परम पवित्र हुनुहुन्छ — शाश्वत दिव्य पुरुष, आदिदेव, अज, विभु।",
        "meaning_en": "Arjuna said: You are the highest Brahman, the highest abode, the highest purifier — the everlasting divine Person, the first god, unborn, all-pervading.",
    },
    "10.13": {
        "meaning_ne": "सबै ऋषिहरू, देवर्षि नारद, असित, देवल, व्यासले भनेका छन्; तपाईं स्वयं पनि मलाई भन्दै हुनुहुन्छ।",
        "meaning_en": "All the seers say this of you, and the divine seer Narada, Asita, Devala, and Vyasa; and you yourself declare it to me.",
    },
    "10.14": {
        "meaning_ne": "हे केशव, मलाई भन्नुभएको सब ऋत ठान्छु; हे भगवन्, तिम्रो व्यक्ति देवता वा दानवले जान्दैनन्।",
        "meaning_en": "I hold as true all that you say to me, O Keshava. Neither gods nor danavas know your manifestation, O Blessed One.",
    },
    "10.15": {
        "meaning_ne": "हे पुरुषोत्तम, भूतभावन, भूतेश, देवदेव, जगत्पते — तिमी स्वयं आत्माले आत्मालाई जान्दछौ।",
        "meaning_en": "You yourself know the self by the self, O highest Person, bringer-forth of beings, lord of beings, god of gods, lord of the world.",
    },
    "10.16": {
        "meaning_ne": "जिन विभूतिले यी लोक व्याप्त भई बस्नुहुन्छ, ती दिव्य आत्मविभूति अशेष भन्न योग्य छौ।",
        "meaning_en": "You should tell, without remainder, the divine majesties of the self by which you stand pervading these worlds.",
    },
    "10.17": {
        "meaning_ne": "हे योगिन्, सधैं परिचिन्तन गर्दै तिमीलाई कसरी जानूँ? हे भगवन्, कुन-कुन भावमा मैले चिन्तन गर्ने?",
        "meaning_en": "How am I to know you, O yogin, always meditating on you? And in what states, O Blessed One, are you to be thought of by me?",
    },
    "10.18": {
        "meaning_ne": "हे जनार्दन, आफ्नो योग र विभूति विस्तरले फेरि भन; अमृत सुन्दा मेरो तृप्ति हुँदैन।",
        "meaning_en": "Tell again at length your yoga and your majesty, O Janardana. Hearing the nectar, I have no satiety.",
    },
    "10.19": {
        "meaning_ne": "श्रीभगवान्ले भने: हेर, दिव्य आत्मविभूति प्राधान्यतः भन्छु, हे कुरुश्रेष्ठ; मेरो विस्तरको अन्त छैन।",
        "meaning_en": "The Blessed Lord said: Come, I shall tell you the divine majesties of the self, according to their eminence, O best of Kurus. There is no end to my extent.",
    },
    "10.20": {
        "meaning_ne": "हे गुडाकेश, सबै भूतको आशयमा स्थित आत्मा म हुँ; भूतहरूको आदि, मध्य र अन्त पनि म।",
        "meaning_en": "I am the self, O Gudakesha, standing in the heart of all beings. I am the beginning, the middle, and the end of beings as well.",
    },
    "10.21": {
        "meaning_ne": "आदित्यहरूमा विष्णु म, ज्योतिहरूमा अंशुमान् रवि, मरुत्हरूमा मरीचि, नक्षत्रहरूमा शशी म।",
        "meaning_en": "Of the Adityas I am Vishnu, of lights the radiant sun; I am Marichi of the Maruts, and of the stars the moon.",
    },
    "10.22": {
        "meaning_ne": "वेदहरूमा सामवेद म, देवताहरूमा वासव, इन्द्रियहरूमा मन म, भूतहरूमा चेतना म।",
        "meaning_en": "Of the Vedas I am the Sama Veda, of the gods I am Vasava; of the senses I am the mind, of beings I am awareness.",
    },
    "10.23": {
        "meaning_ne": "रुद्रहरूमा शङ्कर म, यक्ष-रक्षसमा वित्तेश, वसुहरूमा पावक म, शिखरीहरूमा मेरु म।",
        "meaning_en": "Of the Rudras I am Shankara, of yakshas and rakshasas the lord of wealth; of the Vasus I am fire, of peaks I am Meru.",
    },
    "10.24": {
        "meaning_ne": "हे पार्थ, पुरोहितहरूमा मुख्य बृहस्पति मलाई जान; सेनापतिहरूमा स्कन्द म, सरहरूमा सागर म।",
        "meaning_en": "Know me as Brihaspati, chief of household priests, O Partha. Of war-leaders I am Skanda, of waters I am the ocean.",
    },
    "10.25": {
        "meaning_ne": "महर्षिहरूमा भृगु म, वाणीहरूमा एक अक्षर, यज्ञहरूमा जपयज्ञ म, स्थावरहरूमा हिमालय।",
        "meaning_en": "Of great seers I am Bhrigu, of speeches the one syllable. Of yajnas I am the yajna of japa, of things that stand I am Himalaya.",
    },
    "10.26": {
        "meaning_ne": "सबै वृक्षमा अश्वत्थ, देवर्षिहरूमा नारद, गन्धर्वहरूमा चित्ररथ, सिद्धहरूमा कपिल मुनि।",
        "meaning_en": "Of all trees the asvattha, of divine seers Narada; of gandharvas Chitraratha, of the perfected Kapila the sage.",
    },
    "10.27": {
        "meaning_ne": "अश्वहरूमा अमृतोद्भव उच्चैःश्रवस् मलाई जान; गजेन्द्रहरूमा ऐरावत, नरहरूमा नराधिप।",
        "meaning_en": "Of horses know me as Uccaihshravas, born of the deathless; of lordly elephants Airavata, and of men the lord of men.",
    },
    "10.28": {
        "meaning_ne": "आयुधहरूमा वज्र म, धेनुहरूमा कामधुक्, प्रजनमा कन्दर्प म, सर्पहरूमा वासुकि म।",
        "meaning_en": "Of weapons I am the vajra, of cows the wish-milker; of begetting I am Kandarpa, of serpents I am Vasuki.",
    },
    "10.29": {
        "meaning_ne": "नागहरूमा अनन्त म, यादस्मा वरुण म, पितृहरूमा अर्यमा म, संयमीहरूमा यम म।",
        "meaning_en": "Of nagas I am Ananta, of water-creatures I am Varuna; of the fathers I am Aryaman, of restrainers I am Yama.",
    },
    "10.30": {
        "meaning_ne": "दैत्यहरूमा प्रह्लाद म, कलयिताहरूमा काल म, मृगहरूमा मृगेन्द्र म, पक्षीहरूमा वैनतेय।",
        "meaning_en": "Of daityas I am Prahlada, of reckoners I am Time; of beasts I am the lord of beasts, of birds the son of Vinata.",
    },
    "10.31": {
        "meaning_ne": "पवित्र पार्नेहरूमा पवन म, शस्त्रभृत्मा राम म, झषहरूमा मकर म, स्रोतहरूमा जाह्नवी म।",
        "meaning_en": "Of purifiers I am the wind, of weapon-bearers I am Rama; of fishes I am the makara, of streams I am Jahnavi.",
    },
    "10.32": {
        "meaning_ne": "हे अर्जुन, सर्गहरूको आदि, अन्त र मध्य म नै; विद्याहरूमा अध्यात्मविद्या, वाद गर्नेहरूमा वाद म।",
        "meaning_en": "Of creations I am the beginning, the end, and the middle, Arjuna. Of knowledges, the knowledge of the Self; of those who argue, I am the argument.",
    },
    "10.33": {
        "meaning_ne": "अक्षरहरूमा अकार म, समासहरूमा द्वन्द्व; अक्षय काल म नै, विश्वतोमुख धाता म।",
        "meaning_en": "Of letters I am a, of compounds the copulative. I myself am inexhaustible Time, the dispenser facing every way.",
    },
    "10.34": {
        "meaning_ne": "सर्वहर मृत्यु म, भविष्यत्हरूको उद्भव म; नारीहरूमा कीर्ति, श्री, वाक्, स्मृति, मेधा, धृति, क्षमा।",
        "meaning_en": "I am all-seizing death, and the arising of what will be. Of feminine powers: fame, shri, speech, memory, insight, firmness, forbearance.",
    },
    "10.35": {
        "meaning_ne": "सामहरूमा बृहत्साम, छन्दहरूमा गायत्री म; मासहरूमा मार्गशीर्ष म, ऋतुहरूमा कुसुमाकर।",
        "meaning_en": "Of the Saman chants I am Brihatsaman, of metres Gayatri. Of months I am Margashirsha, of seasons the flower-maker.",
    },
    "10.36": {
        "meaning_ne": "छल गर्नेहरूमा द्यूत म, तेजस्वीहरूको तेज म; जय म, व्यवसाय म, सत्त्ववत्हरूको सत्त्व म।",
        "meaning_en": "Of cheats I am the dice-game, of the brilliant their brilliance. I am victory, I am resolve, I am the sattva of those who have sattva.",
    },
    "10.37": {
        "meaning_ne": "वृष्णिहरूमा वासुदेव म, पाण्डवहरूमा धनञ्जय; मुनिहरूमा व्यास म, कविहरूमा उशना कवि।",
        "meaning_en": "Of the Vrishnis I am Vasudeva, of the Pandavas Dhananjaya; of sages I am Vyasa, of seers the seer Ushanas.",
    },
    "10.38": {
        "meaning_ne": "दम गर्नेहरूमा दण्ड म, जित्ने इच्छा गर्नेहरूमा नीति म; गुह्यहरूमा मौन म, ज्ञानवत्हरूको ज्ञान म।",
        "meaning_en": "Of those who punish I am the rod, of those who would conquer I am policy. Of secrets I am silence, of those who know I am knowledge.",
    },
    "10.39": {
        "meaning_ne": "हे अर्जुन, सबै भूतको बीज जुन छ त्यो म; म बिना चर-अचर कुनै भूत हुँदैन।",
        "meaning_en": "And whatever is the seed of all beings, that am I, Arjuna. There is no being, moving or unmoving, that could be without me.",
    },
    "10.40": {
        "meaning_ne": "हे परन्तप, मेरा दिव्य विभूतिको अन्त छैन; यो त उद्देश्यतः विभूतिको विस्तर मैले भनेको।",
        "meaning_en": "There is no end to my divine majesties, O scorcher of foes. This extent of majesty has been declared by me as a pointing-out.",
    },
    "10.41": {
        "meaning_ne": "जुन-जुन विभूतिमत्, श्रीमत् वा ऊर्जित सत्त्व छ, त्यो-त्यो मेरो तेजको अंशबाट सम्भव जान।",
        "meaning_en": "Whatever being has majesty, or beauty, or strength, know that to have come to be from a share of my brilliance.",
    },
    "10.42": {
        "meaning_ne": "अथवा हे अर्जुन, यति धेरै जानेर के काम? यो कृत्स्न जगत् एक अंशले विष्टम्भ गरी म स्थित छु।",
        "meaning_en": "Or what is the use of this much knowing to you, Arjuna? Supporting this whole world with a single portion, I stand.",
    },
}

CH11 = {
    "11.1": {
        "meaning_ne": "अर्जुनले भने: मदनुग्रहका लागि भन्नुभएको अध्यात्मसंज्ञित परम गुह्य वचनले मेरो यो मोह गएको छ।",
        "meaning_en": "Arjuna said: By the word you spoke as a favour to me, the highest secret named the inner self, this delusion of mine has gone.",
    },
    "11.2": {
        "meaning_ne": "हे कमलपत्राक्ष, भूतहरूको भव-अप्यय तिमीबाट विस्तरले सुनें, अव्यय माहात्म्य पनि।",
        "meaning_en": "The arising and passing of beings have been heard by me at length from you, O lotus-eyed, and your unchanging greatness too.",
    },
    "11.3": {
        "meaning_ne": "हे परमेश्वर, आफूलाई जस्तो भन्नुहुन्छ त्यस्तै हो; हे पुरुषोत्तम, तिम्रो ऐश्वर रूप देख्न चाहन्छु।",
        "meaning_en": "So it is, as you say of yourself, O highest Lord. I wish to see your lordly form, O highest Person.",
    },
    "11.4": {
        "meaning_ne": "हे प्रभो, यदि त्यो मैले देख्न सकिन्छ ठान्नुहुन्छ भने, हे योगेश्वर, अव्यय आत्मालाई देखाऊ।",
        "meaning_en": "If you think it possible for me to see that, O Lord, then, O lord of yoga, show me your unchanging self.",
    },
    "11.5": {
        "meaning_ne": "श्रीभगवान्ले भने: हे पार्थ, मेरा रूप शयौं हजारौं हेर — नानाविध दिव्य, नाना वर्ण-आकृति।",
        "meaning_en": "The Blessed Lord said: Behold my forms, O Partha, by hundreds and by thousands — various, divine, of various colours and shapes.",
    },
    "11.6": {
        "meaning_ne": "आदित्य, वसु, रुद्र, अश्विनी, मरुत् हेर; हे भारत, पहिले नदेखिएका धेरै आश्चर्य हेर।",
        "meaning_en": "Behold the Adityas, the Vasus, the Rudras, the two Ashvins, and the Maruts. Behold many wonders not seen before, O Bharata.",
    },
    "11.7": {
        "meaning_ne": "हे गुडाकेश, मेरो देहमा आज एकत्र सचराचर कृत्स्न जगत् हेर, र अरू जे देख्न चाहन्छौ।",
        "meaning_en": "Behold now the whole world, moving and unmoving, standing as one here in my body, O Gudakesha, and whatever else you wish to see.",
    },
    "11.8": {
        "meaning_ne": "तर यस आफ्नै चक्षुले मलाई देख्न सक्दैनौ; दिव्य चक्षु दिन्छु — मेरो ऐश्वर योग हेर।",
        "meaning_en": "But you cannot see me with this your own eye. I give you a divine eye; behold my lordly yoga.",
    },
    "11.9": {
        "meaning_ne": "सञ्जयले भने: हे राजन्, यसो भनेर महायोगेश्वर हरिले पार्थलाई परम ऐश्वर रूप देखाए।",
        "meaning_en": "Sanjaya said: Having spoken thus, O king, Hari, the great lord of yoga, then showed Partha the highest lordly form.",
    },
    "11.10": {
        "meaning_ne": "अनेक वक्त्र-नयन, अनेक अद्भुत दर्शन, अनेक दिव्य आभरण, दिव्य अनेक उद्यत आयुध।",
        "meaning_en": "Many mouths and eyes, many wondrous sights, many divine ornaments, many divine weapons raised.",
    },
    "11.11": {
        "meaning_ne": "दिव्य माल्य-अम्बर धारण, दिव्य गन्ध अनुलेपन; सर्वाश्चर्यमय, अनन्त, विश्वतोमुख देव।",
        "meaning_en": "Wearing divine garlands and garments, anointed with divine fragrances — a god made of all wonders, endless, facing every way.",
    },
    "11.12": {
        "meaning_ne": "यदि दिवि सूर्यसहस्रको भा एकसाथ उठी समान हुन्थ्यो भने, त्यो महात्माको भाससदृश हुन्थ्यो।",
        "meaning_en": "If the radiance of a thousand suns were to rise at once in the sky, that might be like the radiance of that great-souled one.",
    },
    "11.13": {
        "meaning_ne": "त्यस बेला पाण्डवले देवदेवको शरीरमा अनेकधा विभक्त कृत्स्न जगत् एकत्र देखे।",
        "meaning_en": "There the son of Pandu saw the whole world standing as one, divided in many ways, in the body of the god of gods.",
    },
    "11.14": {
        "meaning_ne": "त्यसपछि विस्मयले ग्रस्त, रोमाञ्चित धनञ्जयले शिरले देवलाई प्रणिपात गरी कृताञ्जलि भने।",
        "meaning_en": "Then Dhananjaya, seized with wonder, hair standing, bowing with the head to the god, spoke with joined palms.",
    },
    "11.15": {
        "meaning_ne": "अर्जुनले भने: हे देव, तिम्रो देहमा सबै देवता, भूतविशेष संघ, कमलासनस्थ ब्रह्मा ईश, सबै ऋषि र दिव्य उरग देख्छु।",
        "meaning_en": "Arjuna said: I see the gods in your body, O God, and all the hosts of kinds of beings — Brahma the lord seated on the lotus, all the seers, and the divine serpents.",
    },
    "11.16": {
        "meaning_ne": "अनेक बाहु-उदर-वक्त्र-नेत्र, सर्वत्र अनन्तरूप तिमी देख्छु; हे विश्वेश्वर विश्वरूप, तिम्रो अन्त, मध्य, आदि देख्दिनँ।",
        "meaning_en": "I see you everywhere, of endless form, with many arms, bellies, mouths, and eyes. I see no end, no middle, nor your beginning, O lord of the all, all-form.",
    },
    "11.17": {
        "meaning_ne": "किरीटी, गदी, चक्री, सर्वत्र दीप्तिमान् तेजोराशि तिमी देख्छु — दुर्निरीक्ष्य, दीप्तानल-अर्कद्युति, अप्रमेय।",
        "meaning_en": "I see you with crown, mace, and discus, a mass of brilliance, shining on every side — hard to look at, glowing like blazing fire and the sun, beyond measure.",
    },
    "11.18": {
        "meaning_ne": "तिमी वेदितव्य परम अक्षर, यस विश्वको पर निधान, अव्यय शाश्वतधर्मगोप्ता; तिमी सनातन पुरुष मेरो मत।",
        "meaning_en": "You are the Imperishable, the highest to be known; you are the highest treasure-house of this all. You are the unchanging guardian of everlasting dharma; you are the ancient Person, I hold.",
    },
    "11.19": {
        "meaning_ne": "अनादि-मध्य-अन्त, अनन्तवीर्य, अनन्तबाहु, शशि-सूर्य नेत्र तिमी देख्छु — दीप्त हुताशवक्त्र, स्वतेजले यो विश्व ताप्दै।",
        "meaning_en": "Without beginning, middle, or end, of endless valour, endless arms, moon and sun for eyes — I see you, mouth a blazing fire, heating this all with your own brilliance.",
    },
    "11.20": {
        "meaning_ne": "द्यौ र पृथ्वीको अन्तर र सबै दिशा तिमी एकले व्याप्त; यो अद्भुत उग्र रूप देखेर लोकत्रय प्रव्यथित, हे महात्मन्।",
        "meaning_en": "This space between heaven and earth is filled by you alone, and all the quarters. Seeing this wondrous, fierce form of yours, the triple world trembles, O great-souled one.",
    },
    "11.21": {
        "meaning_ne": "यी सुरसंघ तिमीमा पस्छन्; कोही भीत प्राञ्जलि स्तुति गर्छन्; स्वस्ति भनी महर्षि-सिद्धसंघ पुष्कल स्तुतिले स्तुति गर्छन्।",
        "meaning_en": "These hosts of gods enter you; some, afraid, praise with joined palms. Crying \"svasti,\" hosts of great seers and perfected ones praise you with abundant hymns.",
    },
    "11.22": {
        "meaning_ne": "रुद्र, आदित्य, वसु, साध्य, विश्वे, अश्विनी, मरुत्, ऊष्मप, गन्धर्व-यक्ष-असुर-सिद्ध संघ सबै विस्मित भई तिमी हेर्छन्।",
        "meaning_en": "The Rudras, Adityas, Vasus, Sadhyas, Vishvedevas, the two Ashvins, the Maruts, and the steam-drinkers, and hosts of gandharvas, yakshas, asuras, and perfected ones — all look on you, astonished.",
    },
    "11.23": {
        "meaning_ne": "हे महाबाहो, बहुवक्त्र-नेत्र महत् रूप, बहुबाहु-ऊरु-पाद, बहूदर, बहुदंष्ट्राकराल देखेर लोक प्रव्यथित, म पनि।",
        "meaning_en": "Seeing your great form, many-mouthed, many-eyed, O mighty-armed, many-armed, many-thighed, many-footed, many-bellied, terrible with many tusks — the worlds tremble, and so do I.",
    },
    "11.24": {
        "meaning_ne": "नभःस्पृश्, दीप्त अनेकवर्ण, व्यात्तानन, दीप्त विशाल नेत्र तिमी देखेर अन्तरात्मा प्रव्यथित; धृति र शम पाउँदिनँ, हे विष्णो।",
        "meaning_en": "Touching the sky, blazing, many-coloured, mouth gaping, eyes vast and burning — seeing you my inner self trembles; I find no firmness and no peace, O Vishnu.",
    },
    "11.25": {
        "meaning_ne": "कालानलसन्निभ दंष्ट्राकराल मुख देखेर दिशा जान्दिनँ, शर्म पाउँदिनँ; प्रसन्न होओ, हे देवेश जगन्निवास।",
        "meaning_en": "Seeing your mouths terrible with tusks, like the fires of time, I know not the quarters and find no ease. Be gracious, O lord of gods, dwelling of the world.",
    },
    "11.26": {
        "meaning_ne": "यी धृतराष्ट्रका सबै पुत्र अवनिपालसंघसहित, भीष्म, द्रोण, त्यो सूतपुत्र, हाम्रा योधमुख्यहरूसहित पनि।",
        "meaning_en": "And these sons of Dhritarashtra, all of them, together with hosts of earth-protectors — Bhishma, Drona, and that son of the charioteer, together with our chief warriors too.",
    },
    "11.27": {
        "meaning_ne": "तिम्रा भयानक दंष्ट्राकराल वक्त्रमा त्वरित पस्छन्; कोही दशनबीच विलग्न, चूर्णित उत्तमाङ्ग देखिन्छन्।",
        "meaning_en": "They rush into your mouths, terrible, dreadful with tusks. Some are seen stuck between the teeth, their heads crushed.",
    },
    "11.28": {
        "meaning_ne": "नदीका अनेक जलवेग समुद्रतिर बगेजस्तै, यी नरलोक वीर तिम्रा अभिविज्वलित वक्त्रमा पस्छन्।",
        "meaning_en": "As many torrents of rivers run toward the ocean, so these heroes of the world of men enter your flaming mouths.",
    },
    "11.29": {
        "meaning_ne": "प्रदीप्त ज्वलनमा पतङ्ग नाशका लागि वेगले पसेजस्तै, लोकहरू नाशका लागि तिम्रा वक्त्रमा समृद्धवेगले पस्छन्।",
        "meaning_en": "As moths enter a blazing flame to their destruction, at full speed, so the worlds enter your mouths too, at full speed, to destruction.",
    },
    "11.30": {
        "meaning_ne": "ज्वलित वदनले समग्र लोक ग्रसँदै सबैतिर लेल्छौ; तेजले समग्र जगत् भरी तिम्रा उग्र भास तपन्छन्, हे विष्णो।",
        "meaning_en": "You lick up, devouring on every side the complete worlds with blazing mouths. Filling the whole world with brilliance, your fierce radiances burn, O Vishnu.",
    },
    "11.31": {
        "meaning_ne": "उग्ररूप तपाईं को हो भन; नमन होस्, हे देववर, प्रसन्न होओ। आद्य तपाईं जान्न चाहन्छु; तिम्रो प्रवृत्ति जान्दिनँ।",
        "meaning_en": "Tell me who you are, of fierce form. Homage to you, O best of gods; be gracious. I wish to know you, the first; I do not understand your working.",
    },
    "11.32": {
        "meaning_ne": "श्रीभगवान्ले भने: लोकक्षयकारी प्रवृद्ध काल म हुँ; यहाँ लोक समाहरण गर्न प्रवृत्त। तिमीबाहेक प्रत्यनीकका योद्धा सबै रहनेछैनन्।",
        "meaning_en": "The Blessed Lord said: I am Time, grown, the maker of the worlds' ending, set forth here to gather the worlds. Even without you, all the warriors standing in the opposing ranks will not be.",
    },
    "11.33": {
        "meaning_ne": "तसर्थ उठ, यश पाऊ; शत्रु जितेर समृद्ध राज्य भोग। यी पहिले नै मैले मारिएका; निमित्तमात्र होओ, हे सव्यसाचिन्।",
        "meaning_en": "Therefore stand up, win fame; conquering enemies, enjoy a prosperous kingdom. These are already slain by me; be the mere occasion, O left-handed archer.",
    },
    "11.34": {
        "meaning_ne": "द्रोण, भीष्म, जयद्रथ, कर्ण र अरू योधवीर — मैले मारेका मार; नडरा; युद्ध गर, रणमा सपत्न जित्नेछौ।",
        "meaning_en": "Drona and Bhishma and Jayadratha and Karna, and other warrior-heroes as well — slay them, slain by me; do not tremble. Fight; you will conquer rivals in battle.",
    },
    "11.35": {
        "meaning_ne": "सञ्जयले भने: केशवको यो वचन सुनेर किरीटी कृताञ्जलि काम्दै, नमस्कार गरी फेरि भीत भीत प्रणम्य सगद्गद कृष्णलाई भने।",
        "meaning_en": "Sanjaya said: Hearing this speech of Keshava, the crowned one, palms joined, trembling, having bowed, spoke again to Krishna, stammering, afraid, having paid homage.",
    },
    "11.36": {
        "meaning_ne": "अर्जुनले भने: हे हृषीकेश, ठाउँ छ — तिम्रो कीर्तिले जगत् प्रहर्षित र अनुरक्त हुन्छ; राक्षस भीत दिशातिर भाग्छन्, सिद्धसंघ सबै नमस्कार गर्छन्।",
        "meaning_en": "Arjuna said: It is fitting, O Hrishikesha, that the world rejoices and is drawn in love at your fame. Rakshasas flee in fear to the quarters, and all hosts of the perfected bow.",
    },
    "11.37": {
        "meaning_ne": "हे महात्मन्, ब्रह्माभन्दा पनि गरीयान् आदिकर्तालाई किन नमन नगरून्? हे अनन्त देवेश जगन्निवास, तिमी अक्षर, सत्-असत् र त्यसभन्दा पर।",
        "meaning_en": "And why should they not bow to you, O great-souled, greater even than Brahma, first maker? O endless one, lord of gods, dwelling of the world, you are the Imperishable, being and non-being and what is beyond that.",
    },
    "11.38": {
        "meaning_ne": "तिमी आदिदेव, पुराण पुरुष, यस विश्वको पर निधान; वेत्ता र वेद्य, पर धाम; अनन्तरूप, विश्व तिमीले तत छ।",
        "meaning_en": "You are the first god, the ancient Person, the highest treasure-house of this all. You are the knower and the knowable, and the highest abode. By you the all is spread, O you of endless form.",
    },
    "11.39": {
        "meaning_ne": "वायु, यम, अग्नि, वरुण, शशाङ्क, प्रजापति, प्रपितामह तिमी; हजार पटक नमन, फेरि फेरि पनि नमन नमन।",
        "meaning_en": "You are Vayu, Yama, Agni, Varuna, the moon, Prajapati, and the great-grandfather. Homage, homage to you a thousand times, and again and yet again homage, homage.",
    },
    "11.40": {
        "meaning_ne": "अगाडि नमन, पछाडि पनि; सर्वत्र सर्व तिमीलाई नमन। अनन्तवीर्य अमितविक्रम, सब समाप्न गर्छौ त्यसैले सर्व हौ।",
        "meaning_en": "Homage from in front and from behind; homage to you on every side, O All. Of endless valour, measureless stride, you complete all, therefore you are all.",
    },
    "11.41": {
        "meaning_ne": "सखा ठानी प्रसभ भनेको — हे कृष्ण, हे यादव, हे सखा — तिम्रो यो महिमा नजानी प्रमाद वा प्रणयले।",
        "meaning_en": "Thinking you a friend, what was said rashly — \"O Krishna, O Yadava, O friend\" — not knowing this majesty of yours, by me from heedlessness or from affection.",
    },
    "11.42": {
        "meaning_ne": "विहार, शय्या, आसन, भोजनमा अवहासार्थ असत्कृत भए पनि — एक्लै वा त्यसको सामु, हे अच्युत — त्यो अप्रमेय तिमीलाई क्षमा माग्छु।",
        "meaning_en": "And if you were treated without honour in jest, at play, lying down, sitting, eating, alone or before others, O Acyuta — I ask pardon of you, the immeasurable.",
    },
    "11.43": {
        "meaning_ne": "चर-अचर लोकको पिता तिमी, पूज्य, गरीयान् गुरु; हे अप्रतिमप्रभाव, लोकत्रयमा तिम्रो सम छैन, अधिक कहाँ?",
        "meaning_en": "You are the father of the world, moving and unmoving; you are to be worshipped, the teacher more weighty. There is none equal to you; how then another greater, in the three worlds, O you of matchless power?",
    },
    "11.44": {
        "meaning_ne": "तसर्थ काय प्रणिधान गरी प्रणम्य, ईड्य ईश तिमीलाई प्रसाद माग्छु; पिताले पुत्र, सखाले सखा, प्रियले प्रियालाई जस्तै सहने योग्य, हे देव।",
        "meaning_en": "Therefore, bowing, prostrating the body, I ask grace of you, the lord to be praised. As a father his son, a friend his friend, a lover his beloved, you should bear with me, O God.",
    },
    "11.45": {
        "meaning_ne": "अदृष्टपूर्व देखेर हर्षित छु, भयले मन प्रव्यथित पनि; त्यही रूप देखाऊ, हे देव; प्रसन्न होओ, हे देवेश जगन्निवास।",
        "meaning_en": "I am glad, having seen what was not seen before, and my mind is shaken with fear. Show me that same form, O God; be gracious, O lord of gods, dwelling of the world.",
    },
    "11.46": {
        "meaning_ne": "किरीटी, गदी, चक्रहस्त त्यस्तै देख्न चाहन्छु; हे सहस्रबाहो विश्वमूर्ते, त्यही चतुर्भुज रूपले होओ।",
        "meaning_en": "I wish to see you thus, with crown, with mace, discus in hand. With that four-armed form be, O thousand-armed, all-bodied one.",
    },
    "11.47": {
        "meaning_ne": "श्रीभगवान्ले भने: हे अर्जुन, प्रसन्न भई आत्मयोगले यो पर रूप देखाएँ — तेजोमय विश्व अनन्त आद्य, तिमीबाहेक कसैले नदेखेको।",
        "meaning_en": "The Blessed Lord said: By my grace, Arjuna, this highest form has been shown you through the yoga of the self — the all, made of brilliance, endless, first, which no other than you has seen before.",
    },
    "11.48": {
        "meaning_ne": "हे कुरुप्रवीर, वेद-यज्ञ-अध्ययन, दान, क्रिया, उग्र तपले नृलोकमा यस्तो रूप म तिमीबाहेक कसैबाट देखिन सकिन्न।",
        "meaning_en": "Not by Vedas or yajnas or study, not by gifts, not by rites, not by fierce tapas can I be seen in this form in the world of men by any other than you, O hero of the Kurus.",
    },
    "11.49": {
        "meaning_ne": "मेरो यस्तो घोर रूप देखेर व्यथा र विमूढभाव नहोस्; भय गएर प्रीतमना फेरि त्यही मेरो यो रूप हेर।",
        "meaning_en": "Let there be no distress for you, nor a bewildered state, seeing this terrible form of mine as it is. Free of fear, with gladdened mind, see again that same form of mine.",
    },
    "11.50": {
        "meaning_ne": "सञ्जयले भने: अर्जुनलाई यसो भनेर वासुदेवले फेरि आफ्नो रूप देखाए; भीतलाई आश्वासन दिए, महात्मा फेरि सौम्यवपु भए।",
        "meaning_en": "Sanjaya said: Having spoken thus to Arjuna, Vasudeva showed his own form again, and reassured this frightened one, the great-souled becoming once more of gentle body.",
    },
    "11.51": {
        "meaning_ne": "अर्जुनले भने: हे जनार्दन, तिम्रो यो सौम्य मानुष रूप देखेर अब सचेत भएँ, प्रकृतिमा आएको छु।",
        "meaning_en": "Arjuna said: Seeing this gentle human form of yours, O Janardana, I have now become collected, restored to my nature.",
    },
    "11.52": {
        "meaning_ne": "श्रीभगवान्ले भने: मेरो यो रूप तिमीले देखेको सुदुर्दर्श हो; देवताहरू पनि यस रूपको दर्शन नित्य काङ्क्षा गर्छन्।",
        "meaning_en": "The Blessed Lord said: This form of mine which you have seen is very hard to see. Even the gods are ever desirous of the seeing of this form.",
    },
    "11.53": {
        "meaning_ne": "वेदले, तपले, दानले, इज्याले यस्तो म देखिन सकिन्न — जस्तो तिमीले मलाई देखेका छौ।",
        "meaning_en": "I cannot be seen in this way, as you have seen me, by the Vedas, nor by tapas, nor by giving, nor by sacrifice.",
    },
    "11.54": {
        "meaning_ne": "हे अर्जुन, अनन्य भक्तिले मात्र यस्तो म जान्न, तत्त्वले देख्न र प्रवेश गर्न सकिन्छ, हे परन्तप।",
        "meaning_en": "But by bhakti that has no other I can be known and seen in this way in truth, and entered, Arjuna, O scorcher of foes.",
    },
    "11.55": {
        "meaning_ne": "मत्कर्मकृत्, मत्परम, मद्भक्त, सङ्गवर्जित, सबै भूतमा निर्वैर — ऊ मकहाँ आउँछ, हे पाण्डव।",
        "meaning_en": "Who does my work, who holds me highest, my devotee, free of clinging, without enmity to all beings — he comes to me, O son of Pandu.",
    },
}

CH12 = {
    "12.1": {
        "meaning_ne": "अर्जुनले भने: यसरी सततयुक्त भक्तहरू तिमीलाई पर्युपासना गर्छन्, र अव्यक्त अक्षरलाई पनि — तिनमा को योगवित्तम?",
        "meaning_en": "Arjuna said: Those devotees who, always yoked thus, worship you, and those who worship the unmanifest Imperishable — which of them are the most knowing of yoga?",
    },
    "12.2": {
        "meaning_ne": "श्रीभगवान्ले भने: मन ममा आवेश गरी नित्ययुक्त, परा श्रद्धाले युक्त मलाई उपासना गर्ने मलाई युक्ततम हुन्।",
        "meaning_en": "The Blessed Lord said: Those who, fixing the mind on me, always yoked, worship me, endowed with the highest faith — they are held by me the most yoked.",
    },
    "12.3": {
        "meaning_ne": "तर अनिर्देश्य अव्यक्त अक्षरलाई पर्युपासना गर्ने — सर्वत्रग, अचिन्त्य, कूटस्थ, अचल, ध्रुव।",
        "meaning_en": "But those who worship the Imperishable, the indefinable, the unmanifest — all-going, unthinkable, unchanging, unmoving, constant.",
    },
    "12.4": {
        "meaning_ne": "इन्द्रियग्राम संयम गरी सर्वत्र समबुद्धि, सर्वभूतहितमा रत — तिनै मलाई नै पाउँछन्।",
        "meaning_en": "Restraining the host of senses, even-minded everywhere, intent on the good of all beings — they reach me as well.",
    },
    "12.5": {
        "meaning_ne": "अव्यक्तमा आसक्त चित्तहरूको क्लेश अधिकतर हुन्छ; अव्यक्त गति देहवालाहरूलाई दुःखले पाइन्छ।",
        "meaning_en": "The trouble of those whose thought clings to the unmanifest is greater; for the unmanifest course is reached with pain by the embodied.",
    },
    "12.6": {
        "meaning_ne": "तर सबै कर्म ममा संन्यस्त, मत्पर, अनन्य योगले मलाई ध्यान गर्दै उपासना गर्ने।",
        "meaning_en": "But those who, renouncing all actions in me, intent on me, worship meditating on me with a yoga that has no other.",
    },
    "12.7": {
        "meaning_ne": "चित्त ममा आवेशित तिनका लागि, हे पार्थ, मृत्युसंसारसागरबाट म चाँडै समुद्धर्ता हुन्छु।",
        "meaning_en": "Of those whose thought is entered into me, I become the lifter-out before long from the ocean of death-wandering, O Partha.",
    },
    "12.8": {
        "meaning_ne": "मन ममा नै राख, बुद्धि ममा निवेश गर; त्यसपछि ममा नै बस्नेछौ, सन्देह छैन।",
        "meaning_en": "Set the mind on me alone; lodge insight in me. You will dwell in me alone hereafter; there is no doubt.",
    },
    "12.9": {
        "meaning_ne": "यदि चित्त ममा स्थिर समाधा गर्न सक्दैनौ भने, हे धनञ्जय, अभ्यासयोगले मलाई प्राप्त गर्न इच्छा गर।",
        "meaning_en": "If you cannot set the thought on me in steadiness, then seek to reach me by the yoga of practice, O Dhananjaya.",
    },
    "12.10": {
        "meaning_ne": "अभ्यासमा पनि असमर्थ छौ भने मत्कर्मपरम होओ; मदर्थ कर्म गर्दै पनि सिद्धि पाउनेछौ।",
        "meaning_en": "If you are unable even in practice, be one who holds my work highest. Doing actions for my sake, you will attain perfection.",
    },
    "12.11": {
        "meaning_ne": "यो पनि गर्न अशक्त छौ भने मद्योगमा आश्रित भई यतात्मा सबै कर्मफल त्याग गर।",
        "meaning_en": "If you are unable to do even this, then, taking refuge in my yoga, with self restrained, abandon the fruit of all action.",
    },
    "12.12": {
        "meaning_ne": "अभ्यासभन्दा ज्ञान श्रेयस्कर, ज्ञानभन्दा ध्यान विशिष्ट; ध्यानबाट कर्मफलत्याग, त्यागबाट तत्काल शान्ति।",
        "meaning_en": "Knowledge is better than practice; meditation is distinguished from knowledge. From meditation, abandonment of the fruit of works; from abandonment, peace at once.",
    },
    "12.13": {
        "meaning_ne": "सबै भूतको अद्वेष्टा, मैत्र, करुण, निर्मम, निरहङ्कार, समदुःखसुख, क्षमी।",
        "meaning_en": "Unhating toward all beings, friendly, and compassionate, without 'mine', without I-making, even in pain and pleasure, forbearing.",
    },
    "12.14": {
        "meaning_ne": "सधैं सन्तुष्ट योगी, यतात्मा, दृढनिश्चय, मन-बुद्धि ममा अर्पित — जो मद्भक्त ऊ मलाई प्रिय।",
        "meaning_en": "The yogin always content, self-restrained, of firm resolve, mind and insight offered to me — that devotee of mine is dear to me.",
    },
    "12.15": {
        "meaning_ne": "जसबाट लोक उद्विग्न हुँदैन, जो लोकबाट उद्विग्न हुँदैन; हर्ष-अमर्ष-भय-उद्वेगबाट मुक्त — ऊ पनि मलाई प्रिय।",
        "meaning_en": "He from whom the world does not shrink, and who does not shrink from the world, freed from joy, impatience, fear, and agitation — he too is dear to me.",
    },
    "12.16": {
        "meaning_ne": "अनपेक्ष, शुचि, दक्ष, उदासीन, गतव्यथ, सर्वारम्भ परित्यागी मद्भक्त मलाई प्रिय।",
        "meaning_en": "Without wants, clean, able, indifferent, gone from distress, abandoning all undertakings — that devotee of mine is dear to me.",
    },
    "12.17": {
        "meaning_ne": "नहर्ष मान्ने, नद्वेष गर्ने, नशोक गर्ने, नकाङ्क्षा गर्ने, शुभाशुभ परित्यागी भक्तिमान् मलाई प्रिय।",
        "meaning_en": "Who does not rejoice, does not hate, does not grieve, does not long, who has given up the fair and the foul — that one of bhakti is dear to me.",
    },
    "12.18": {
        "meaning_ne": "शत्रु र मित्रमा सम, मान-अपमानमा पनि, शीत-उष्ण सुख-दुःखमा सम, सङ्गविवर्जित।",
        "meaning_en": "The same to foe and friend, and so in honour and dishonour; the same in cold and heat, pleasure and pain, free of clinging.",
    },
    "12.19": {
        "meaning_ne": "निन्दा-स्तुति तुल्य, मौनी, येनकेन सन्तुष्ट, अनिकेत, स्थिरमति भक्तिमान् नर मलाई प्रिय।",
        "meaning_en": "To whom blame and praise are alike, silent, content with anything whatever, without a home, of steady mind — that man of bhakti is dear to me.",
    },
    "12.20": {
        "meaning_ne": "यथोक्त यो धर्म्यामृत पर्युपासना गर्ने श्रद्धावान् मत्परम भक्तहरू मलाई अतीव प्रिय।",
        "meaning_en": "But those who worship this deathless dharma as declared, full of faith, holding me highest — those devotees are exceedingly dear to me.",
    },
}

CHAPTERS = {10: CH10, 11: CH11, 12: CH12}


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
