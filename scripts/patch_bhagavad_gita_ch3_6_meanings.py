#!/usr/bin/env python3
"""Fill Gita ch. 3–6 meaning_en / meaning_ne. Original glosses of this recension."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH3 = {
    "3.1": {
        "meaning_ne": "अर्जुनले भने: हे जनार्दन, यदि कर्मभन्दा बुद्धि श्रेष्ठ हो भने, हे केशव, मलाई किन घोर कर्ममा लगाउँछौ?",
        "meaning_en": "Arjuna said: O Janardana, if you hold insight higher than action, why then, O Keshava, do you set me to this grim work?",
    },
    "3.2": {
        "meaning_ne": "मिश्रितजस्तो वचनले मेरो बुद्धि मोहित हुँदैछ; निश्चित एक कुरा भन, जसले म श्रेय पाऊँ।",
        "meaning_en": "With mixed speech you seem to confuse my mind. Tell me one thing for certain, by which I may attain the better course.",
    },
    "3.3": {
        "meaning_ne": "श्रीभगवान्ले भने: हे अनघ, यस लोकमा दुई निष्ठा मैले पहिले भनेको छु — साङ्ख्यहरूको ज्ञानयोग, योगीहरूको कर्मयोग।",
        "meaning_en": "The Blessed Lord said: In this world a twofold stance was declared by me of old, O sinless one: the yoga of knowledge for the Sankhyas, the yoga of action for the yogins.",
    },
    "3.4": {
        "meaning_ne": "कर्म नथालेर नैष्कर्म्य पाइँदैन; संन्यासबाट मात्र पनि सिद्धि आउँदैन।",
        "meaning_en": "Not by abstaining from works does a person win freedom from works, nor by mere renunciation does he reach perfection.",
    },
    "3.5": {
        "meaning_ne": "क्षणभर पनि कोही अकर्ममा बस्दैन; प्रकृतिज गुणले सबै अवश भएर कर्म गराइन्छन्।",
        "meaning_en": "No one can remain even for a moment without doing action; everyone is made to act helplessly by the gunas born of prakriti.",
    },
    "3.6": {
        "meaning_ne": "कर्मेन्द्रिय रोकेर मनले विषय सम्झने विमूढ मिथ्याचारी भनिन्छ।",
        "meaning_en": "He who restrains the organs of action but sits remembering sense-objects in the mind — that deluded one is called a hypocrite.",
    },
    "3.7": {
        "meaning_ne": "तर हे अर्जुन, मनले इन्द्रिय नियन्त्रण गरी आसक्तिरहित कर्मेन्द्रियले कर्मयोग थाल्ने श्रेष्ठ हुन्छ।",
        "meaning_en": "But he who, controlling the senses with the mind, O Arjuna, begins karma-yoga with the organs of action, unattached — he is the better.",
    },
    "3.8": {
        "meaning_ne": "नियत कर्म गर; अकर्मभन्दा कर्म श्रेष्ठ छ। अकर्मले शरीरयात्रा पनि सिद्ध हुँदैन।",
        "meaning_en": "Do the action that is prescribed; action is better than inaction. Even the body's journey would not succeed through inaction.",
    },
    "3.9": {
        "meaning_ne": "यज्ञार्थ बाहेकको कर्मले यो लोक बाँधिन्छ; हे कौन्तेय, सङ्गमुक्त भएर त्यसैका लागि कर्म गर।",
        "meaning_en": "This world is bound by action other than that done for yajna. For that purpose, O son of Kunti, perform action free of clinging.",
    },
    "3.10": {
        "meaning_ne": "प्रजापतिले यज्ञसहित प्रजा सृष्टि गरी भने: यसैले वृद्धि होओ; यो तिमीहरूको इष्टकामधुक् होस्।",
        "meaning_en": "Having created beings together with yajna, Prajapati said of old: By this shall you bring forth; let this be the milch-cow of your desired aims.",
    },
    "3.11": {
        "meaning_ne": "यसैले देवताहरूलाई पुष्ट पार; देवताहरूले तिमीलाई पुष्ट पारुन्; परस्पर पुष्टि गर्दै परम श्रेय पाउनेछौ।",
        "meaning_en": "Foster the gods with this, and may the gods foster you; fostering one another you shall attain the highest good.",
    },
    "3.12": {
        "meaning_ne": "यज्ञले पुष्ट देवताहरूले इष्ट भोग दिनेछन्; दिएको नदिई भोग्ने चोर नै हो।",
        "meaning_en": "The gods, fostered by yajna, will give you the enjoyments you wish. Who enjoys their gifts without offering back to them is a thief.",
    },
    "3.13": {
        "meaning_ne": "यज्ञशेष खाने सन्त सबै किल्बिषबाट मुक्त हुन्छन्; आफ्नै लागि पकाउने पापीहरू पाप खान्छन्।",
        "meaning_en": "The good who eat the remainder of yajna are released from all guilt; the wicked who cook for themselves eat sin.",
    },
    "3.14": {
        "meaning_ne": "अन्नबाट भूत हुन्छन्, पर्जन्यबाट अन्न, यज्ञबाट पर्जन्य, कर्मबाट यज्ञ।",
        "meaning_en": "From food beings come to be; from rain food arises; from yajna rain comes to be; yajna is born of action.",
    },
    "3.15": {
        "meaning_ne": "कर्म ब्रह्मबाट जान, ब्रह्म अक्षरबाट; तसर्थ सर्वगत ब्रह्म सधैं यज्ञमा प्रतिष्ठित छ।",
        "meaning_en": "Know action to spring from Brahman, and Brahman from the Imperishable. Therefore the all-pervading Brahman is ever established in yajna.",
    },
    "3.16": {
        "meaning_ne": "यसरी चलाइएको चक्र नपछ्याउने, इन्द्रियमा रमाउने, हे पार्थ, व्यर्थ बाँच्छ।",
        "meaning_en": "Who does not keep turning this wheel thus set in motion here, delighting in the senses, lives in vain, O Partha — a life of sin.",
    },
    "3.17": {
        "meaning_ne": "तर आत्मामा रति, आत्मामा तृप्त, आत्मामा सन्तुष्ट मानिसको कुनै कार्य रहँदैन।",
        "meaning_en": "But the person who delights in the Self alone, who is content in the Self, satisfied in the Self — for him there is no work that must be done.",
    },
    "3.18": {
        "meaning_ne": "उसलाई गरेकोबाट केही अर्थ छैन, नगरेकोबाट पनि होइन; कुनै भूतमा अर्थको आश्रय पनि छैन।",
        "meaning_en": "He has no stake in what is done here, nor in what is left undone; nor does he depend on any being for any purpose.",
    },
    "3.19": {
        "meaning_ne": "तसर्थ आसक्तिरहित सधैं कर्तव्य कर्म गर; आसक्तिरहित कर्म गर्ने परम पाउँछ।",
        "meaning_en": "Therefore, always unattached, perform the action that is to be done. The person who acts unattached attains the highest.",
    },
    "3.20": {
        "meaning_ne": "जनक आदिले कर्मले नै संसिद्धि पाए; लोकसंग्रह हेरेर पनि तिमी गर्न योग्य छौ।",
        "meaning_en": "It was by action that Janaka and others reached perfection. You too should act, looking also to the holding-together of the world.",
    },
    "3.21": {
        "meaning_ne": "श्रेष्ठले जे गर्छ अरू त्यही गर्छन्; उसले जे प्रमाण बनाउँछ लोक त्यही पछ्याउँछ।",
        "meaning_en": "Whatever a great one does, that others do; whatever standard he sets, the world follows.",
    },
    "3.22": {
        "meaning_ne": "हे पार्थ, तीन लोकमा मेरो केही कर्तव्य छैन, अप्राप्त केही छैन; तैपनि म कर्ममा वर्तन्छु।",
        "meaning_en": "There is nothing in the three worlds, O Partha, that I must do, nothing unattained that I should attain; and yet I move in action.",
    },
    "3.23": {
        "meaning_ne": "यदि म अतान्द्रित भई कर्ममा नवर्तें भने, हे पार्थ, सबै मानिस मेरो बाटो पछ्याउनेछन्।",
        "meaning_en": "If I did not engage in action, ever unwearied, people would follow my path in every way, O Partha.",
    },
    "3.24": {
        "meaning_ne": "मैले कर्म नगरें भने यी लोक उच्छेद हुनेछन्; म सङ्करको कर्ता हुनेछु, यी प्रजा मारिनेछन्।",
        "meaning_en": "These worlds would fall to ruin if I did not act; I would be the maker of confusion, and would destroy these peoples.",
    },
    "3.25": {
        "meaning_ne": "हे भारत, अविद्वान् आसक्त भई जस्तो गर्छन्, विद्वान् लोकसंग्रह चाहेर त्यस्तै आसक्तिरहित गरून्।",
        "meaning_en": "As the unwise act attached to work, O Bharata, so should the wise act unattached, wishing to hold the world together.",
    },
    "3.26": {
        "meaning_ne": "कर्मसङ्गी अज्ञानीहरूको बुद्धिभेद नपारोस्; विद्वान् युक्त भई सबै कर्ममा लगाओस्, स्वयं गर्दै।",
        "meaning_en": "Let him not split the minds of the ignorant attached to works. The wise, yoked, should set them to all actions, himself performing them.",
    },
    "3.27": {
        "meaning_ne": "प्रकृतिका गुणले सबै कर्म हुन्छन्; अहङ्कारले विमूढ «म कर्ता हुँ» ठान्छ।",
        "meaning_en": "Actions are done entirely by the gunas of prakriti. The self deluded by I-making thinks, \"I am the doer.\"",
    },
    "3.28": {
        "meaning_ne": "हे महाबाहो, गुण-कर्मको विभाग जान्ने तत्त्ववित् «गुण गुणमा वर्तन्छन्» मानी नअल्झिन्छ।",
        "meaning_en": "But he who knows the truth of the distinction of gunas and works, O mighty-armed, knowing that gunas move among gunas, is not attached.",
    },
    "3.29": {
        "meaning_ne": "प्रकृतिका गुणमा मोहित गुणकर्ममा अल्झिन्छन्; अपूर्णज्ञानी मन्दलाई पूर्णज्ञानीले नहल्लाओस्।",
        "meaning_en": "Those deluded by prakriti's gunas cling to guna-works. The one who knows the whole should not unsettle the dull who know only a part.",
    },
    "3.30": {
        "meaning_ne": "अध्यात्मचित्तले सबै कर्म ममा संन्यास गरेर, निराशी, निर्मम, ज्वरमुक्त भई युद्ध गर।",
        "meaning_en": "Renouncing all actions in me with a mind on the Self, without hope, without 'mine', fight, free of fever.",
    },
    "3.31": {
        "meaning_ne": "मेरो यो मत नित्य पाल्ने श्रद्धावान्, अनसूयु मानिसहरू कर्मबाट पनि मुक्त हुन्छन्।",
        "meaning_en": "Those persons who always practise this teaching of mine, full of faith, without picking faults, are released even from works.",
    },
    "3.32": {
        "meaning_ne": "असूया गरेर मेरो मत नपाल्नेहरूलाई सर्वज्ञानविमूढ, नष्ट, अचेत जान।",
        "meaning_en": "But those who find fault and do not practise this teaching of mine — know them as deluded in all knowledge, lost, without sense.",
    },
    "3.33": {
        "meaning_ne": "ज्ञानवान् पनि आफ्नै प्रकृतिका अनुसार चेष्टा गर्छ; भूतहरू प्रकृतिमा जान्छन्, निग्रहले के गर्छ?",
        "meaning_en": "Even a knower acts according to his own prakriti. Beings follow prakriti; what will restraint accomplish?",
    },
    "3.34": {
        "meaning_ne": "इन्द्रिय र तिनका अर्थमा राग-द्वेष बसेका छन्; तिनको वशमा नजाओ — तिनै बाटाका शत्रु हुन्।",
        "meaning_en": "In the senses and their objects, attraction and aversion are seated. Let one not come under their power; they are his waylayers.",
    },
    "3.35": {
        "meaning_ne": "विगुण स्वधर्म सुष्ठु परधर्मभन्दा श्रेयस्कर; स्वधर्ममा मर्नु श्रेय, परधर्म भयानक।",
        "meaning_en": "Better one's own dharma, though imperfect, than another's well performed. Death in one's own dharma is better; another's dharma is perilous.",
    },
    "3.36": {
        "meaning_ne": "अर्जुनले भने: हे वार्ष्णेय, नचाहँदा पनि बलले जस्तै लगाइएको यो पुरुष कुनले पाप गराउँछ?",
        "meaning_en": "Arjuna said: Then by what is a person impelled to do evil, O Vrishni, even unwilling, as if driven by force?",
    },
    "3.37": {
        "meaning_ne": "श्रीभगवान्ले भने: यो काम हो, यो क्रोध हो, रजोगुणबाट जन्मिएको; महाशन, महापापी — यसलाई यहाँको शत्रु जान।",
        "meaning_en": "The Blessed Lord said: It is desire, it is anger, born of the rajas-guna — all-devouring, a great evil. Know this as the enemy here.",
    },
    "3.38": {
        "meaning_ne": "धुवाँले आगो, मैलाले दर्पण, जेराले गर्भ जस्तै, यसैले यो ढाकिएको छ।",
        "meaning_en": "As fire is wrapped by smoke, a mirror by dirt, an embryo by the caul, so is this covered by that.",
    },
    "3.39": {
        "meaning_ne": "हे कौन्तेय, ज्ञानीको ज्ञान यस नित्य शत्रुले ढाकिएको छ — दुष्पूर कामरूपी अनलले।",
        "meaning_en": "Knowledge is covered by this, the knower's constant foe, O son of Kunti — by desire, insatiable as fire.",
    },
    "3.40": {
        "meaning_ne": "इन्द्रिय, मन, बुद्धि यसको अधिष्ठान भनिन्छ; यिनैले ज्ञान ढाकेर देहीलाई मोहित पार्छ।",
        "meaning_en": "The senses, mind, and insight are said to be its seat. With these it deludes the embodied one, covering knowledge.",
    },
    "3.41": {
        "meaning_ne": "तसर्थ हे भरतर्षभ, पहिले इन्द्रिय नियन्त्रण गरेर ज्ञान-विज्ञान नाश गर्ने यो पापीलाई मार।",
        "meaning_en": "Therefore, first restrain the senses, O best of Bharatas, and strike down this sinful one, the destroyer of knowledge and realization.",
    },
    "3.42": {
        "meaning_ne": "इन्द्रियहरू स्थूलभन्दा पर भनिन्छन्, इन्द्रियभन्दा मन पर, मनभन्दा बुद्धि पर, बुद्धिभन्दा पर त्यो हो।",
        "meaning_en": "The senses are said to be higher, higher than the senses is the mind, higher than the mind is insight; but that which is beyond insight is He.",
    },
    "3.43": {
        "meaning_ne": "बुद्धिभन्दा पर जानेर आत्माले आत्मालाई थाम्; हे महाबाहो, दुरासद कामरूप शत्रुलाई मार।",
        "meaning_en": "Knowing that which is beyond insight, steadying the self by the self, slay the enemy, O mighty-armed, whose form is desire, hard to approach.",
    },
}

CH4 = {
    "4.1": {
        "meaning_ne": "श्रीभगवान्ले भने: यो अव्यय योग मैले विवस्वानलाई भनेँ; विवस्वानले मनुलाई, मनुले इक्ष्वाकुलाई भने।",
        "meaning_en": "The Blessed Lord said: This imperishable yoga I declared to Vivasvat; Vivasvat told it to Manu, and Manu spoke it to Ikshvaku.",
    },
    "4.2": {
        "meaning_ne": "यसरी परम्पराबाट राजर्षिहरूले जाने; हे परन्तप, धेरै कालले यो योग यहाँ नष्ट भयो।",
        "meaning_en": "Thus received in succession, the royal sages knew it. By long lapse of time, O scorcher of foes, this yoga was lost here.",
    },
    "4.3": {
        "meaning_ne": "त्यही पुरातन योग आज मैले तिमीलाई भनेको छु; तिमी भक्त र सखा हौ — यो उत्तम रहस्य हो।",
        "meaning_en": "That same ancient yoga is declared by me to you today; you are my devotee and my friend, and this is the highest secret.",
    },
    "4.4": {
        "meaning_ne": "अर्जुनले भने: तिम्रो जन्म पछि, विवस्वानको जन्म अघि; तिमीले आदिमा भनेको मैले कसरी बुझूँ?",
        "meaning_en": "Arjuna said: Later is your birth, earlier the birth of Vivasvat. How am I to understand that you declared this in the beginning?",
    },
    "4.5": {
        "meaning_ne": "श्रीभगवान्ले भने: हे अर्जुन, मेरा र तिम्रा धेरै जन्म बिते; म सबै जान्छु, तिमी जान्दैनौ, हे परन्तप।",
        "meaning_en": "The Blessed Lord said: Many births of mine have passed, and of yours, Arjuna. I know them all; you do not, O scorcher of foes.",
    },
    "4.6": {
        "meaning_ne": "अज, अव्ययात्मा, भूतहरूको ईश्वर भएर पनि आफ्नै प्रकृतिमा अधिष्ठित भई आत्ममायाले म प्रकट हुन्छु।",
        "meaning_en": "Though unborn, of imperishable self, lord of beings, I come to be by presiding over my own prakriti, through my own maya.",
    },
    "4.7": {
        "meaning_ne": "हे भारत, जब-जब धर्मको ग्लानि र अधर्मको अभ्युत्थान हुन्छ, तब म आफूलाई सृजन्छु।",
        "meaning_en": "Whenever dharma declines, O Bharata, and adharma rises up, then I bring forth myself.",
    },
    "4.8": {
        "meaning_ne": "साधुहरूको परित्राण, दुष्कृतहरूको विनाश, धर्म संस्थापनका लागि युग-युगमा म जन्मन्छु।",
        "meaning_en": "For the protection of the good, the destruction of the evil-doers, and the establishing of dharma, I come to be from age to age.",
    },
    "4.9": {
        "meaning_ne": "मेरो दिव्य जन्म र कर्म तत्त्वतः जान्ने, हे अर्जुन, देह छाडेर पुनर्जन्म पाउँदैन, मकहाँ आउँछ।",
        "meaning_en": "Who knows in truth my divine birth and work, Arjuna, having left the body is not born again; he comes to me.",
    },
    "4.10": {
        "meaning_ne": "राग-भय-क्रोधमुक्त, मन्मय, ममा आश्रित धेरै ज्ञानतपले पूत भई मद्भावमा आए।",
        "meaning_en": "Freed from passion, fear, and anger, absorbed in me, taking refuge in me, many, purified by the tapas of knowledge, have come to my being.",
    },
    "4.11": {
        "meaning_ne": "जसले जसरी मकहाँ आउँछन्, त्यसरी नै म भज्छु; हे पार्थ, सबै मानिस मेरो बाटो पछ्याउँछन्।",
        "meaning_en": "As they approach me, so do I serve them. People follow my path in every way, O Partha.",
    },
    "4.12": {
        "meaning_ne": "कर्मको सिद्धि चाहनेहरू यहाँ देवता पूज्छन्; मानुष लोकमा कर्मज सिद्धि चाँडै हुन्छ।",
        "meaning_en": "Those who desire success of works worship the gods here; for in the human world, success born of works comes quickly.",
    },
    "4.13": {
        "meaning_ne": "गुण-कर्म विभागले चातुर्वर्ण्य मैले सृष्टि गरेको; त्यसको कर्ता भए पनि मलाई अकर्ता, अव्यय जान।",
        "meaning_en": "The fourfold order was created by me according to the division of gunas and works. Though I am its maker, know me as the non-doer, unchanging.",
    },
    "4.14": {
        "meaning_ne": "कर्महरू मलाई लिप्त गर्दैनन्, कर्मफलमा मेरो स्पृहा छैन; यसरी जान्ने कर्मले बाँधिँदैन।",
        "meaning_en": "Actions do not stain me; I have no longing for the fruit of works. Who knows me thus is not bound by actions.",
    },
    "4.15": {
        "meaning_ne": "यसरी जानेर पहिलेका मुमुक्षुहरूले पनि कर्म गरे; तसर्थ पूर्वैले गरेको जस्तै तिमी पनि कर्म गर।",
        "meaning_en": "Knowing this, action was done by the seekers of freedom of old as well. Therefore do action, as the ancients did of old.",
    },
    "4.16": {
        "meaning_ne": "कर्म के, अकर्म के — कविहरू पनि यहाँ मोहित छन्; जान्दा अशुभबाट मुक्त हुने कर्म म भन्छु।",
        "meaning_en": "What is action, what is inaction? Even the seers are confused here. I shall tell you that action, knowing which you will be freed from ill.",
    },
    "4.17": {
        "meaning_ne": "कर्म पनि जान्नुपर्छ, विकर्म पनि, अकर्म पनि; कर्मको गति गहन छ।",
        "meaning_en": "One must understand action, and understand wrong action, and understand inaction; the way of action is deep.",
    },
    "4.18": {
        "meaning_ne": "कर्ममा अकर्म देख्ने, अकर्ममा कर्म देख्ने मनुष्यहरूमा बुद्धिमान्, युक्त, कृत्स्न कर्म गर्ने हो।",
        "meaning_en": "Who sees inaction in action and action in inaction is wise among men; he is yoked, a doer of all action.",
    },
    "4.19": {
        "meaning_ne": "जसका सबै आरम्भ काम-सङ्कल्पवर्जित छन्, ज्ञानाग्निले कर्म दग्ध — बुधहरू उसलाई पण्डित भन्छन्।",
        "meaning_en": "He whose every undertaking is free of desire-intent, whose works are burned in the fire of knowledge — him the wise call a pandita.",
    },
    "4.20": {
        "meaning_ne": "कर्मफलासङ्ग त्यागेर नित्यतृप्त, निराश्रय; कर्ममा लागे पनि ऊ केही गर्दैन।",
        "meaning_en": "Having given up clinging to the fruit of works, always content, depending on nothing — though engaged in action, he does nothing at all.",
    },
    "4.21": {
        "meaning_ne": "निराशी, यतचित्त, सर्वपरिग्रह त्यागी; केवल शारीर कर्म गर्दा किल्बिष लाग्दैन।",
        "meaning_en": "Without hope, mind and self restrained, having given up all grasping — doing only bodily action, he incurs no guilt.",
    },
    "4.22": {
        "meaning_ne": "यदृच्छालाभमा सन्तुष्ट, द्वन्द्वातीत, विमत्सर, सिद्धि-असिद्धिमा सम — गरे पनि बाँधिँदैन।",
        "meaning_en": "Content with what comes unsought, beyond the pairs, without envy, even in success and failure — though acting, he is not bound.",
    },
    "4.23": {
        "meaning_ne": "गतसङ्ग, मुक्त, ज्ञानस्थित चित्तले यज्ञका लागि गरेको कर्म सबै विलीन हुन्छ।",
        "meaning_en": "Of one whose clinging is gone, who is free, whose mind is set in knowledge, action done for yajna dissolves entirely.",
    },
    "4.24": {
        "meaning_ne": "अर्पण ब्रह्म, हवि ब्रह्म, ब्रह्माग्निमा ब्रह्मद्वारा हुत; ब्रह्मकर्मसमाधिले जाने ठाउँ ब्रह्म नै हो।",
        "meaning_en": "Brahman is the offering, Brahman the oblation, offered by Brahman in the fire of Brahman. Brahman is to be reached by him who is absorbed in the action that is Brahman.",
    },
    "4.25": {
        "meaning_ne": "कति योगी देवयज्ञ उपासना गर्छन्; अरूले यज्ञैद्वारा ब्रह्माग्निमा यज्ञ होम गर्छन्।",
        "meaning_en": "Some yogins worship only the divine yajna; others offer the yajna itself by yajna into the fire of Brahman.",
    },
    "4.26": {
        "meaning_ne": "कति श्रोत्रादि इन्द्रिय संयमाग्निमा होम गर्छन्; अरू शब्द आदि विषय इन्द्रियाग्निमा होम गर्छन्।",
        "meaning_en": "Some offer the senses, hearing and the rest, into the fires of restraint; others offer the objects, sound and the rest, into the fires of the senses.",
    },
    "4.27": {
        "meaning_ne": "अरू सबै इन्द्रियकर्म र प्राणकर्म ज्ञानदीप्त आत्मसंयमयोगाग्निमा होम गर्छन्।",
        "meaning_en": "Others offer all the actions of the senses and the actions of the breaths into the yoga-fire of self-restraint, kindled by knowledge.",
    },
    "4.28": {
        "meaning_ne": "कति द्रव्ययज्ञ, तपोयज्ञ, योगयज्ञ; संशितव्रत यतिहरू स्वाध्याय-ज्ञानयज्ञ पनि।",
        "meaning_en": "Some are sacrifices of substance, of tapas, of yoga; and others, striving with sharp vows, are sacrifices of study and knowledge.",
    },
    "4.29": {
        "meaning_ne": "कति अपानमा प्राण, प्राणमा अपान होम गर्छन्; प्राणापान गति रोकेर प्राणायामपरायण हुन्छन्।",
        "meaning_en": "Others offer the out-breath into the in-breath, and the in-breath into the out-breath, stopping the courses of both, intent on pranayama.",
    },
    "4.30": {
        "meaning_ne": "अरू नियताहार प्राणलाई प्राणमा होम गर्छन्; यी सबै यज्ञवित्, यज्ञले कल्मष क्षीण।",
        "meaning_en": "Others, of measured diet, offer the breaths into the breaths. All these know yajna, their stains worn away by yajna.",
    },
    "4.31": {
        "meaning_ne": "यज्ञशेष अमृत खाने सनातन ब्रह्ममा जान्छन्; हे कुरुसत्तम, अयज्ञको यो लोक छैन, अर्को कहाँ?",
        "meaning_en": "Those who eat the nectar-remainder of yajna go to the eternal Brahman. This world is not for one without yajna; how then the other, O best of Kurus?",
    },
    "4.32": {
        "meaning_ne": "यस्ता बहुविधा यज्ञ ब्रह्मको मुखमा फैलिएका छन्; सबै कर्मज जान; यसरी जाने मुक्त हुनेछौ।",
        "meaning_en": "Thus many kinds of yajna are spread out in the mouth of Brahman. Know them all as born of action; knowing thus you will be freed.",
    },
    "4.33": {
        "meaning_ne": "हे परन्तप, द्रव्यमय यज्ञभन्दा ज्ञानयज्ञ श्रेष्ठ; हे पार्थ, सबै कर्म ज्ञानमा समाप्त हुन्छ।",
        "meaning_en": "Better than the yajna of substance is the yajna of knowledge, O scorcher of foes. All action without remainder is completed in knowledge, O Partha.",
    },
    "4.34": {
        "meaning_ne": "प्रणिपात, परिप्रश्न र सेवाले त्यो जान; तत्त्वदर्शी ज्ञानीहरू तिमीलाई ज्ञान उपदेश गर्नेछन्।",
        "meaning_en": "Learn that by homage, by inquiry, and by service. Those who know, who have seen the truth, will teach you knowledge.",
    },
    "4.35": {
        "meaning_ne": "हे पाण्डव, जान्दा फेरि यस्तो मोह हुँदैन; जसले सबै भूत आत्मामा र ममा देख्नेछौ।",
        "meaning_en": "Knowing which you will not fall into delusion again, O Pandava — by which you will see all beings without remainder in the Self, and then in me.",
    },
    "4.36": {
        "meaning_ne": "सबै पापीहरूमा सबैभन्दा पापी भए पनि ज्ञानको नाउँले सबै वृजिन तर्नेछौ।",
        "meaning_en": "Even if you are the most evil-doing of all the evil-doers, you will cross all wickedness by the boat of knowledge alone.",
    },
    "4.37": {
        "meaning_ne": "जसरी प्रज्वलित आगोले इन्धन भस्म पार्छ, हे अर्जुन, ज्ञानाग्निले सबै कर्म त्यस्तै भस्म पार्छ।",
        "meaning_en": "As a kindled fire makes fuel into ash, Arjuna, so the fire of knowledge makes all actions into ash.",
    },
    "4.38": {
        "meaning_ne": "ज्ञानसमान पवित्र यहाँ केही छैन; योगसंसिद्ध आफैं कालक्रममा आत्मामा पाउँछ।",
        "meaning_en": "Nothing here is so purifying as knowledge. One perfected in yoga finds it in due time in himself.",
    },
    "4.39": {
        "meaning_ne": "श्रद्धावान्, तत्पर, संयतेन्द्रिय ज्ञान पाउँछ; ज्ञान पाएर चाँडै परा शान्ति पाउँछ।",
        "meaning_en": "The faithful one, intent on that, with senses restrained, attains knowledge; having gained knowledge he soon reaches the highest peace.",
    },
    "4.40": {
        "meaning_ne": "अज्ञ, अश्रद्ध, संशयात्मा विनष्ट हुन्छ; संशयात्माको न यो लोक, न पर, न सुख।",
        "meaning_en": "The ignorant, the unfaithful, and the doubting self are lost. For the doubting self there is neither this world nor the next, nor happiness.",
    },
    "4.41": {
        "meaning_ne": "हे धनञ्जय, योगले कर्म संन्यस्त, ज्ञानले संशय छिन्न, आत्मवान्लाई कर्म बाँध्दैनन्।",
        "meaning_en": "Actions do not bind one who has renounced works through yoga, whose doubt is cut by knowledge, who is possessed of the Self, O Dhananjaya.",
    },
    "4.42": {
        "meaning_ne": "तसर्थ अज्ञानजन्मे हृदयस्थित संशय ज्ञानको तरवारले काटेर योगमा रह, उठ, हे भारत।",
        "meaning_en": "Therefore, with the sword of knowledge of the Self, cut this doubt born of ignorance that sits in the heart; be established in yoga, stand up, O Bharata.",
    },
}

CH5 = {
    "5.1": {
        "meaning_ne": "अर्जुनले भने: हे कृष्ण, कर्मको संन्यास फेरि योग पनि प्रशंसा गर्छौ; यी दुईमध्ये श्रेय कुन हो, सुनिश्चित भन।",
        "meaning_en": "Arjuna said: You praise the renunciation of actions, Krishna, and again yoga. Tell me for certain which one of these two is better.",
    },
    "5.2": {
        "meaning_ne": "श्रीभगवान्ले भने: संन्यास र कर्मयोग दुवै निःश्रेयसकर; तर कर्मसंन्यासभन्दा कर्मयोग श्रेष्ठ छ।",
        "meaning_en": "The Blessed Lord said: Renunciation and karma-yoga both lead to the highest good; but of the two, karma-yoga is better than the renunciation of action.",
    },
    "5.3": {
        "meaning_ne": "न द्वेष गर्ने न काङ्क्षा गर्नेलाई नित्य संन्यासी जान; निर्द्वन्द्व, हे महाबाहो, सुखपूर्वक बन्धनबाट मुक्त हुन्छ।",
        "meaning_en": "He should be known as always a renouncer who neither hates nor longs. Free of the pairs, O mighty-armed, he is easily released from bondage.",
    },
    "5.4": {
        "meaning_ne": "साङ्ख्य र योगलाई बालकहरू छुट्टै भन्छन्, पण्डित होइनन्; एकमा राम्ररी स्थित दुवैको फल पाउँछ।",
        "meaning_en": "Fools say that Sankhya and yoga are different, not the wise. Established well in even one, a person wins the fruit of both.",
    },
    "5.5": {
        "meaning_ne": "साङ्ख्यले जुन स्थान पाइन्छ, योगले पनि त्यहीं पुगिन्छ; साङ्ख्य र योग एक देख्नेले नै देख्छ।",
        "meaning_en": "The place reached by the Sankhyas is reached by the yogins too. Who sees Sankhya and yoga as one, he sees.",
    },
    "5.6": {
        "meaning_ne": "हे महाबाहो, योगबिना संन्यास दुःखले पाइन्छ; योगयुक्त मुनि चाँडै ब्रह्म पाउँछ।",
        "meaning_en": "But renunciation, O mighty-armed, is hard to attain without yoga. The sage yoked in yoga reaches Brahman before long.",
    },
    "5.7": {
        "meaning_ne": "योगयुक्त, विशुद्धात्मा, विजितात्मा, जितेन्द्रिय, सबै भूतमा आत्मा देख्ने — गर्दा पनि लिप्त हुँदैन।",
        "meaning_en": "Yoked in yoga, the self purified, the self conquered, the senses conquered, the self of all beings — though acting, he is not stained.",
    },
    "5.8": {
        "meaning_ne": "तत्त्ववित् युक्त «म केही गर्दिनँ» ठानोस् — देख्दै, सुन्दै, छुँदै, सुँघ्दै, खाँदै, हिँड्दै, सुत्दै, श्वास लिँदै।",
        "meaning_en": "\"I do nothing at all\" — so should the yoked knower of truth think, seeing, hearing, touching, smelling, eating, going, sleeping, breathing.",
    },
    "5.9": {
        "meaning_ne": "बोल्दै, त्याग्दै, ग्रहण गर्दै, आँखा खोल्दै-चिम्लँदै पनि — इन्द्रियहरू इन्द्रियार्थमा वर्तन्छन् भनी धारण गर्दै।",
        "meaning_en": "Speaking, letting go, grasping, opening and closing the eyes — holding that the senses move among the sense-objects.",
    },
    "5.10": {
        "meaning_ne": "ब्रह्ममा कर्म राखी सङ्ग त्यागेर गर्ने पापले लिप्त हुँदैन — जलले कमलपत्र जस्तै।",
        "meaning_en": "Who acts, placing actions in Brahman, abandoning clinging, is not stained by sin, as a lotus leaf by water.",
    },
    "5.11": {
        "meaning_ne": "योगीहरू काय, मन, बुद्धि, केवल इन्द्रियले पनि सङ्ग त्यागेर आत्मशुद्धिका लागि कर्म गर्छन्।",
        "meaning_en": "Yogins perform action with body, mind, insight, even with the senses alone, abandoning clinging, for the purification of the self.",
    },
    "5.12": {
        "meaning_ne": "युक्तले कर्मफल त्यागेर नैष्ठिकी शान्ति पाउँछ; अयुक्त कामले फलमा सक्त भई बाँधिन्छ।",
        "meaning_en": "The yoked one, abandoning the fruit of works, attains peace that is firm. The unyoked, acting from desire, attached to the fruit, is bound.",
    },
    "5.13": {
        "meaning_ne": "मनले सबै कर्म संन्यस्त गरी वशी नवद्वार पुरमा सुखले बस्छ — न गर्ने, न गराउने।",
        "meaning_en": "Having mentally renounced all actions, the embodied one, self-controlled, sits happily in the city of nine gates, neither acting nor causing action.",
    },
    "5.14": {
        "meaning_ne": "प्रभुले लोकको कर्तृत्व, कर्म, कर्मफलसंयोग सृष्टि गर्दैन; स्वभाव वर्तन्छ।",
        "meaning_en": "The Lord does not create agency or actions for the world, nor the joining to the fruit of works; it is own-nature that operates.",
    },
    "5.15": {
        "meaning_ne": "विभु कसैको पाप लिँदैन, सुकृत पनि होइन; अज्ञानले ज्ञान ढाकिएकाले जन्तु मोहित हुन्छन्।",
        "meaning_en": "The all-pervading takes on no one's evil, nor even good deed. Knowledge is covered by ignorance; by that, creatures are deluded.",
    },
    "5.16": {
        "meaning_ne": "जसको त्यो अज्ञान ज्ञानले नाश भएको छ, तिनको ज्ञान सूर्यजस्तै तत्परलाई प्रकाशित गर्छ।",
        "meaning_en": "But for those whose ignorance of the Self is destroyed by knowledge, that knowledge lights up the highest, like the sun.",
    },
    "5.17": {
        "meaning_ne": "त्यसमा बुद्धि, त्यसमा आत्मा, त्यसमा निष्ठा, त्यसमा परायण; ज्ञानले कल्मष धोइएका अपुनरावृत्ति जान्छन्।",
        "meaning_en": "Their insight on That, their self That, their faith That, their goal That — their stains shaken off by knowledge, they go to non-return.",
    },
    "5.18": {
        "meaning_ne": "विद्या-विनयसम्पन्न ब्राह्मण, गाई, हात्ती, कुकुर र श्वपाकमा पण्डितहरू समदर्शी हुन्।",
        "meaning_en": "In a brahmana endowed with learning and humility, in a cow, an elephant, a dog, and a dog-cooker, the wise see the same.",
    },
    "5.19": {
        "meaning_ne": "जसको मन साम्यमा स्थित, तिनले यहीं सर्ग जितेका छन्; ब्रह्म निर्दोष सम छ, तसर्थ तिन ब्रह्ममा स्थित छन्।",
        "meaning_en": "Even here creation is conquered by those whose mind is established in sameness. Brahman is flawless and even; therefore they are established in Brahman.",
    },
    "5.20": {
        "meaning_ne": "प्रिय पाएर हर्ष नमान्ने, अप्रिय पाएर उद्विग्न नहुने, स्थिरबुद्धि, असम्मूढ ब्रह्मवित् ब्रह्ममा स्थित छ।",
        "meaning_en": "He should not rejoice on gaining the pleasant, nor be shaken on gaining the unpleasant — stable in insight, undeluded, a knower of Brahman, established in Brahman.",
    },
    "5.21": {
        "meaning_ne": "बाह्य स्पर्शमा असक्त आत्माले आत्मामा जे सुख छ त्यो पाउँछ; ब्रह्मयोगयुक्त अक्षय सुख भोग्छ।",
        "meaning_en": "Unattached in outer contacts, he finds the joy that is in the Self. With self yoked in the yoga of Brahman, he enjoys joy that does not wane.",
    },
    "5.22": {
        "meaning_ne": "हे कौन्तेय, संस्पर्शज भोग दुःखका योनि हुन्, आदि-अन्तवाल; बुध तिनमा रम्दैन।",
        "meaning_en": "The enjoyments that are born of contact are wombs of pain, O son of Kunti, with beginning and end. The wise one does not delight in them.",
    },
    "5.23": {
        "meaning_ne": "शरीर छाड्नुअघि नै काम-क्रोधको वेग सहने युक्त, सुखी नर हो।",
        "meaning_en": "Who is able, even here, before release from the body, to bear the surge born of desire and anger — he is yoked, he is a happy man.",
    },
    "5.24": {
        "meaning_ne": "अन्तःसुख, अन्तराराम, अन्तर्ज्योति योगी ब्रह्मभूत भई ब्रह्मनिर्वाण पाउँछ।",
        "meaning_en": "Who has joy within, delight within, and light within — that yogin, become Brahman, attains brahma-nirvana.",
    },
    "5.25": {
        "meaning_ne": "क्षीणकल्मष, छिन्नद्वैध, यतात्मा, सर्वभूतहितरत ऋषिहरू ब्रह्मनिर्वाण पाउँछन्।",
        "meaning_en": "The seers whose stains are spent, whose dualities are cut, who are self-restrained, intent on the good of all beings, attain brahma-nirvana.",
    },
    "5.26": {
        "meaning_ne": "काम-क्रोधमुक्त, यतचेतस्, विदितात्मा यतिहरूका चारैतिर ब्रह्मनिर्वाण वर्तन्छ।",
        "meaning_en": "For striving ones free of desire and anger, with minds restrained, who know the Self, brahma-nirvana lies close on every side.",
    },
    "5.27": {
        "meaning_ne": "बाह्य स्पर्श बाहिर राखी, दृष्टि भृकुटीबीच, नासाभित्र चल्ने प्राणापानलाई सम पारी।",
        "meaning_en": "Shutting out outer contacts, the gaze set between the brows, making even the in-breath and out-breath that move within the nostrils.",
    },
    "5.28": {
        "meaning_ne": "इन्द्रिय-मन-बुद्धि वशमा, मोक्षपरायण मुनि, इच्छा-भय-क्रोधमुक्त — ऊ सधैं मुक्त नै हो।",
        "meaning_en": "With senses, mind, and insight restrained, the sage intent on release, gone desire, fear, and anger — he who is thus is forever free.",
    },
    "5.29": {
        "meaning_ne": "यज्ञ-तपको भोक्ता, सर्वलोक महेश्वर, सबै भूतको सुहृद् मलाई जानेर शान्ति पाउँछ।",
        "meaning_en": "Knowing me as the enjoyer of yajnas and tapas, the great lord of all worlds, the friend of all beings, he reaches peace.",
    },
}

CH6 = {
    "6.1": {
        "meaning_ne": "श्रीभगवान्ले भने: कर्मफलमा अनाश्रित कर्तव्य कर्म गर्ने संन्यासी र योगी हो; अग्निरहित वा अक्रिय होइन।",
        "meaning_en": "The Blessed Lord said: He who does the action that must be done, not depending on the fruit of works, is a renouncer and a yogin — not he who lights no fire and does no acts.",
    },
    "6.2": {
        "meaning_ne": "हे पाण्डव, संन्यास भनेको त्यही योग जान; संकल्प नत्यागी कोही योगी हुँदैन।",
        "meaning_en": "What they call renunciation, know that to be yoga, O Pandava. No one becomes a yogin who has not renounced the intent of desire.",
    },
    "6.3": {
        "meaning_ne": "योग चढ्न चाहने मुनिका लागि कर्म कारण भनिन्छ; योगारूढका लागि शम कारण भनिन्छ।",
        "meaning_en": "For the sage who would climb to yoga, action is said to be the means; for that same one who has climbed to yoga, stillness is said to be the means.",
    },
    "6.4": {
        "meaning_ne": "जब इन्द्रियार्थ र कर्ममा नअल्झिन्छ, सबै संकल्प संन्यस्त — त्यस बेला योगारूढ भनिन्छ।",
        "meaning_en": "When he is attached neither to sense-objects nor to actions, having renounced all intents of desire — then he is said to have climbed to yoga.",
    },
    "6.5": {
        "meaning_ne": "आत्माले आफूलाई उबारोस्, नगिराओस्; आत्मा नै आत्माको बन्धु, आत्मा नै रिपु।",
        "meaning_en": "One should lift the self by the self, and not let the self sink. The self is the self's friend, and the self is the self's enemy.",
    },
    "6.6": {
        "meaning_ne": "जसले आत्माले आत्मालाई जितेको छ, त्यसको आत्मा बन्धु हो; नजितेकोलाई आत्मा शत्रुजस्तै वर्तन्छ।",
        "meaning_en": "The self is a friend to that self by whom the self is conquered; but to the unconquered self, the self would behave with enmity, like an enemy.",
    },
    "6.7": {
        "meaning_ne": "जितात्मा, प्रशान्तको परमात्मा समाहित छ — शीत-उष्ण, सुख-दुःख, मान-अपमानमा।",
        "meaning_en": "Of one who has conquered the self and is at peace, the highest Self is gathered — in cold and heat, pleasure and pain, honour and dishonour.",
    },
    "6.8": {
        "meaning_ne": "ज्ञान-विज्ञानतृप्त, कूटस्थ, विजितेन्द्रिय, माटो-ढुङ्गा-सुनमा सम योगी युक्त भनिन्छ।",
        "meaning_en": "The self content with knowledge and realization, unmoved, senses conquered — that yogin is called yoked, to whom a clod, a stone, and gold are the same.",
    },
    "6.9": {
        "meaning_ne": "सुहृद्, मित्र, अरि, उदासीन, मध्यस्थ, द्वेष्य, बन्धु, साधु र पापीमा समबुद्धि श्रेष्ठ हो।",
        "meaning_en": "He is distinguished whose insight is even toward well-wishers, friends, foes, the indifferent, mediators, the hateful, kinsmen, the good, and even the wicked.",
    },
    "6.10": {
        "meaning_ne": "योगी एकाकी रहस्यमा स्थित, यतचित्त, निराशी, अपरिग्रह भई सधैं आत्मालाई युक्त राखोस्।",
        "meaning_en": "The yogin should continually join the self, staying in secret, alone, mind and self restrained, without hope, without grasping.",
    },
    "6.11": {
        "meaning_ne": "शुचि देशमा आफ्नो आसन स्थिर राख्नु — अति उच्च वा अति नीच होइन, वस्त्र-अजिन-कुश ओछ्याई।",
        "meaning_en": "In a clean place he should set his firm seat, neither too high nor too low, with cloth, hide, and kusha above.",
    },
    "6.12": {
        "meaning_ne": "त्यहाँ एकाग्र मन, यतचित्त-इन्द्रियक्रिया भई आसनमा बसी आत्मविशुद्धिका लागि योग युक्त राख्नु।",
        "meaning_en": "There, making the mind one-pointed, restraining the activities of thought and senses, seated on the seat, he should practise yoga for the purification of the self.",
    },
    "6.13": {
        "meaning_ne": "काय-शिर-ग्रीवा सम, अचल, स्थिर राखी आफ्नो नासिकाग्र हेर्दै दिशा नहेरी।",
        "meaning_en": "Holding body, head, and neck even, unmoving, steady, gazing at the tip of his own nose, not looking around at the quarters.",
    },
    "6.14": {
        "meaning_ne": "प्रशान्तात्मा, भयमुक्त, ब्रह्मचर्यव्रतमा स्थित, मन संयम गरी मच्चित्त, मत्पर भई युक्त बस्नु।",
        "meaning_en": "The self at peace, gone fear, established in the vow of brahmacharya, restraining the mind, thought on me, he should sit yoked, intent on me.",
    },
    "6.15": {
        "meaning_ne": "यसरी सधैं आत्मा युक्त राख्ने नियतमानस् योगी निर्वाणपरा शान्ति, मत्संस्था पाउँछ।",
        "meaning_en": "Joining the self thus always, the yogin of restrained mind attains the peace whose highest is nirvana, the state that is in me.",
    },
    "6.16": {
        "meaning_ne": "अति खानेको योग हुँदैन, बिल्कुलै नखानेको पनि होइन; अति सुत्ने वा जाग्नेको पनि होइन, हे अर्जुन।",
        "meaning_en": "Yoga is not for one who eats too much, nor for one who does not eat at all; nor for one who sleeps too much, nor for one who stays awake, Arjuna.",
    },
    "6.17": {
        "meaning_ne": "युक्त आहार-विहार, कर्ममा युक्त चेष्टा, युक्त निद्रा-जागरणको योग दुःखहन्ता हुन्छ।",
        "meaning_en": "For one moderate in food and sport, moderate in effort at works, moderate in sleep and waking, yoga becomes the destroyer of pain.",
    },
    "6.18": {
        "meaning_ne": "जब विनियत चित्त आत्मामा नै अवस्थित हुन्छ, सबै कामबाट निःस्पृह — त्यस बेला युक्त भनिन्छ।",
        "meaning_en": "When the well-restrained thought stands in the Self alone, without longing for any desires — then one is said to be yoked.",
    },
    "6.19": {
        "meaning_ne": "निवातमा दीप नहल्लिएजस्तै, यतचित्त योगी आत्माको योग गर्दाको उपमा हो।",
        "meaning_en": "As a lamp in a windless place does not flicker — that simile is remembered of the yogin of restrained thought, practising the yoga of the Self.",
    },
    "6.20": {
        "meaning_ne": "योगसेवाले निरुद्ध चित्त जहाँ उपराम हुन्छ, जहाँ आत्माले आत्मा देखेर आत्मामा तृप्त हुन्छ।",
        "meaning_en": "Where thought, restrained by the practice of yoga, comes to rest, and where, seeing the Self by the Self, one is content in the Self.",
    },
    "6.21": {
        "meaning_ne": "बुद्धिले ग्राह्य अतीन्द्रिय आत्यन्तिक सुख जहाँ जान्छ, र स्थित भई तत्त्वबाट चलित हुँदैन।",
        "meaning_en": "Where one knows that joy which is ultimate, to be grasped by insight, beyond the senses — and, established, does not stir from the real.",
    },
    "6.22": {
        "meaning_ne": "जसलाई पाएर त्यसभन्दा बढी लाभ मान्दैन; जहाँ स्थित भई गुरु दुःखले पनि विचलित हुँदैन।",
        "meaning_en": "Having gained which, one thinks no other gain greater than that; established in which, one is not shaken even by heavy sorrow.",
    },
    "6.23": {
        "meaning_ne": "दुःखसंयोगको वियोगलाई योगसंज्ञित जान्नु; अनिर्विण्ण चित्तले निश्चयपूर्वक त्यो योग युक्त राख्नु।",
        "meaning_en": "That disjunction from contact with pain should be known as named yoga. That yoga is to be practised with determination, with a mind that does not sink.",
    },
    "6.24": {
        "meaning_ne": "संकल्पबाट जन्मिएका सबै काम अशेष त्यागेर मनले नै इन्द्रियग्राम सबैतिर विनियम गर्नु।",
        "meaning_en": "Abandoning without remainder all desires born of intention, restraining the host of senses on every side by the mind alone.",
    },
    "6.25": {
        "meaning_ne": "धृतिले समातिएको बुद्धिले बिस्तारै उपराम होओस्; मन आत्मसंस्थ पारी केही पनि नसोचोस्।",
        "meaning_en": "Little by little one should come to rest by insight held with firmness; making the mind abide in the Self, one should think of nothing whatsoever.",
    },
    "6.26": {
        "meaning_ne": "चञ्चल अस्थिर मन जहाँ-जहाँ निस्किन्छ, त्यहाँ-त्यहाँ यसलाई नियन्त्रण गरी आत्माको वशमा ल्याउनु।",
        "meaning_en": "Wherever the flickering, unsteady mind runs out, from there one should restrain it and bring it into the power of the Self alone.",
    },
    "6.27": {
        "meaning_ne": "प्रशान्तमनस्, शान्तरजस्, ब्रह्मभूत, अकल्मष योगीकहाँ उत्तम सुख आउँछ।",
        "meaning_en": "For this yogin of peaceful mind, highest joy comes — his rajas stilled, become Brahman, without stain.",
    },
    "6.28": {
        "meaning_ne": "यसरी सधैं आत्मा युक्त, विगतकल्मष योगी सुखपूर्वक ब्रह्मसंस्पर्श, अत्यन्त सुख भोग्छ।",
        "meaning_en": "Joining the self thus always, the yogin whose stain is gone easily enjoys the touch of Brahman, joy without limit.",
    },
    "6.29": {
        "meaning_ne": "योगयुक्तात्मा सर्वत्र समदर्शी सबै भूतमा आत्मा र आत्मामा सबै भूत देख्छ।",
        "meaning_en": "The self yoked in yoga, seeing the same everywhere, sees the Self standing in all beings and all beings in the Self.",
    },
    "6.30": {
        "meaning_ne": "जो मलाई सर्वत्र देख्छ, सबैलाई ममा देख्छ — त्यसबाट म हराउँदिनँ, ऊ मबाट हराउँदैन।",
        "meaning_en": "Who sees me everywhere and sees all in me — I am not lost to him, nor is he lost to me.",
    },
    "6.31": {
        "meaning_ne": "सर्वभूतस्थित मलाई एकत्वमा स्थित भई भज्ने योगी जसरी वर्ते पनि ममा वर्तन्छ।",
        "meaning_en": "Who worships me as standing in all beings, established in oneness — that yogin, however he moves, moves in me.",
    },
    "6.32": {
        "meaning_ne": "हे अर्जुन, आत्मौपम्यले सर्वत्र सुख वा दुःख सम देख्ने परम योगी मानिन्छ।",
        "meaning_en": "Who sees the same everywhere by comparison with the self, whether in pleasure or in pain — that yogin is held the highest, Arjuna.",
    },
    "6.33": {
        "meaning_ne": "अर्जुनले भने: हे मधुसूदन, साम्यले भनेको यो योग चञ्चलताले स्थिर स्थिति म देख्दिनँ।",
        "meaning_en": "Arjuna said: This yoga you have declared through evenness, O Madhusudana — I do not see its steady standing, because of restlessness.",
    },
    "6.34": {
        "meaning_ne": "हे कृष्ण, मन चञ्चल, प्रमाथी, बलवान्, दृढ छ; यसको निग्रह वायु जत्तिकै सुदुष्कर ठान्छु।",
        "meaning_en": "For the mind is restless, Krishna, turbulent, strong, and stubborn. I think its restraint as hard as that of the wind.",
    },
    "6.35": {
        "meaning_ne": "श्रीभगवान्ले भने: हे महाबाहो, मन दुर्निग्रह, चल छ, असंदेह; तर हे कौन्तेय, अभ्यास र वैराग्यले गृह्य हुन्छ।",
        "meaning_en": "The Blessed Lord said: Without doubt, O mighty-armed, the mind is hard to restrain, restless. But by practice and by dispassion it is held, O son of Kunti.",
    },
    "6.36": {
        "meaning_ne": "असंयतात्माको योग दुष्प्राप मेरो मत हो; वश्यात्मा प्रयत्न गर्ने उपायले पाउन सकिन्छ।",
        "meaning_en": "Yoga is hard to reach, I hold, for one whose self is unrestrained. But by one whose self is under control, who strives, it can be reached by the means.",
    },
    "6.37": {
        "meaning_ne": "अर्जुनले भने: श्रद्धायुक्त तर अयति, योगबाट चित्त चलित, योगसंसिद्धि नपाई, हे कृष्ण, कुन गति जान्छ?",
        "meaning_en": "Arjuna said: One who is endowed with faith but unrestrained, whose mind has strayed from yoga, not reaching yoga's perfection — what way does he go, Krishna?",
    },
    "6.38": {
        "meaning_ne": "हे महाबाहो, के ऊ दुवैबाट भ्रष्ट, छिन्न बादलजस्तै नष्ट हुन्छ — अप्रतिष्ठ, ब्रह्मपथमा विमूढ?",
        "meaning_en": "Does he not perish, fallen from both, like a riven cloud, O mighty-armed — without standing, confused on the path of Brahman?",
    },
    "6.39": {
        "meaning_ne": "हे कृष्ण, मेरो यो संशय अशेष काट्न योग्य छौ; तिमीबाहेक यस संशयको छेत्ता हुँदैन।",
        "meaning_en": "This doubt of mine you should cut away completely, Krishna. Other than you, a cutter of this doubt is not to be found.",
    },
    "6.40": {
        "meaning_ne": "श्रीभगवान्ले भने: हे पार्थ, त्यसको न यहाँ न अमुत्र विनाश छ; हे तात, कल्याणकृत् कोही दुर्गति जाँदैन।",
        "meaning_en": "The Blessed Lord said: O Partha, neither here nor hereafter is there destruction for him. No one who does what is auspicious, dear one, goes to a bad end.",
    },
    "6.41": {
        "meaning_ne": "पुण्यकृत्का लोक पाएर शाश्वत वर्ष बसी, योगभ्रष्ट शुचि श्रीमान्हरूको घरमा जन्मन्छ।",
        "meaning_en": "Having reached the worlds of those who did good, dwelling there for lasting years, the fallen-from-yoga is born in the house of the pure and prosperous.",
    },
    "6.42": {
        "meaning_ne": "अथवा धीमान् योगीहरूकै कुलमा जन्मन्छ; यस्तो जन्म लोकमा दुर्लभतर हो।",
        "meaning_en": "Or he comes to be in a family of yogins themselves, who are wise. Such a birth as this is more hard to find in the world.",
    },
    "6.43": {
        "meaning_ne": "त्यहाँ पौर्वदेहिक बुद्धिसंयोग पाउँछ; हे कुरुनन्दन, त्यसपछि फेरि संसिद्धिका लागि यत्न गर्छ।",
        "meaning_en": "There he gains the joining of insight from his former body, and he strives again from there toward perfection, O joy of the Kurus.",
    },
    "6.44": {
        "meaning_ne": "त्यसै पूर्वाभ्यासले अवश भए पनि तानिन्छ; योगको जिज्ञासु पनि शब्दब्रह्म नाघ्छ।",
        "meaning_en": "By that former practice he is carried, even unwilling. Even a seeker of yoga passes beyond the brahman of word.",
    },
    "6.45": {
        "meaning_ne": "प्रयत्नपूर्वक यत्न गर्ने संशुद्धकिल्विष योगी अनेक जन्ममा संसिद्ध भई परा गति जान्छ।",
        "meaning_en": "But the yogin who strives with effort, his guilt well washed, perfected through many births, then goes to the highest course.",
    },
    "6.46": {
        "meaning_ne": "तपस्वीभन्दा योगी अधिक, ज्ञानीभन्दा पनि अधिक, कर्मीभन्दा अधिक; तसर्थ हे अर्जुन, योगी होओ।",
        "meaning_en": "The yogin is beyond the tapasvins, held beyond the knowers too, and beyond those of works. Therefore be a yogin, Arjuna.",
    },
    "6.47": {
        "meaning_ne": "सबै योगीमध्ये अन्तःआत्मा ममा गएको, श्रद्धावान् भई मलाई भज्नेलाई म युक्ततम मान्छु।",
        "meaning_en": "And of all yogins, who worships me with faith, the inner self gone to me — he is held by me the most yoked.",
    },
}

CHAPTERS = {3: CH3, 4: CH4, 5: CH5, 6: CH6}


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
