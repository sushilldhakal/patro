#!/usr/bin/env python3
"""Fill Gita ch. 16–18 meaning_en / meaning_ne. Original glosses of this recension."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH16 = {
    "16.1": {
        "meaning_ne": "श्रीभगवान्ले भने: अभय, सत्त्वसंशुद्धि, ज्ञानयोग व्यवस्थिति, दान, दम, यज्ञ, स्वाध्याय, तप, आर्जव।",
        "meaning_en": "The Blessed Lord said: Fearlessness, purity of sattva, standing in the yoga of knowledge, giving, restraint, yajna, study, tapas, straightforwardness.",
    },
    "16.2": {
        "meaning_ne": "अहिंसा, सत्य, अक्रोध, त्याग, शान्ति, अपैशुन, भूतमा दया, अलोलुप्त्व, मार्दव, ह्री, अचापल।",
        "meaning_en": "Non-harm, truth, absence of anger, relinquishing, peace, not speaking ill, compassion for beings, absence of greed, gentleness, modesty, lack of restlessness.",
    },
    "16.3": {
        "meaning_ne": "तेज, क्षमा, धृति, शौच, अद्रोह, नातिमानिता — हे भारत, दैवी सम्पद्मा अभिजातको यी हुन्छन्।",
        "meaning_en": "Vigour, forbearance, firmness, purity, absence of malice, not too much pride — these belong to one born to a divine endowment, O Bharata.",
    },
    "16.4": {
        "meaning_ne": "दम्भ, दर्प, अभिमान, क्रोध, पारुष्य र अज्ञान — हे पार्थ, आसुरी सम्पद्मा अभिजातका हुन्।",
        "meaning_en": "Display, arrogance, self-conceit, anger, harshness, and ignorance belong to one born to an asuric endowment, O Partha.",
    },
    "16.5": {
        "meaning_ne": "दैवी सम्पद् विमोक्षका लागि, आसुरी निबन्धका लागि मानिन्छ; नशोक गर, हे पाण्डव, तिमी दैवी सम्पद्मा अभिजात हौ।",
        "meaning_en": "The divine endowment is held to be for release, the asuric for bondage. Do not grieve, O son of Pandu; you are born to the divine endowment.",
    },
    "16.6": {
        "meaning_ne": "यस लोकमा दुई भूतसर्ग — दैव र आसुर; दैव विस्तरले भनियो, हे पार्थ, आसुर सुन।",
        "meaning_en": "Two kinds of created beings are in this world, the divine and the asuric. The divine has been told at length; hear from me the asuric, O Partha.",
    },
    "16.7": {
        "meaning_ne": "आसुर जन प्रवृत्ति र निवृत्ति जान्दैनन्; तिनमा शौच छैन, आचार छैन, सत्य छैन।",
        "meaning_en": "Asuric people do not know going-forth or turning-back. There is in them neither purity nor right conduct nor truth.",
    },
    "16.8": {
        "meaning_ne": "जगत् असत्य, अप्रतिष्ठ, अनीश्वर भन्छन्; अपरस्पर सम्भूत, कामहेतुक बाहेक अरू के?",
        "meaning_en": "They say the world is untrue, without a ground, without a lord, come to be from mutual joining — what else, with desire as cause?",
    },
    "16.9": {
        "meaning_ne": "यो दृष्टि अवलम्बन गरी नष्टात्मा अल्पबुद्धि, उग्रकर्मा जगत्को क्षयका लागि अहिता प्रभव हुन्छन्।",
        "meaning_en": "Holding this view, lost selves of small insight, of fierce works, come forth as enemies for the world's destruction.",
    },
    "16.10": {
        "meaning_ne": "दुष्पूर काम आश्रित, दम्भ-मान-मदयुक्त; मोहले असद्ग्राह लिएर अशुचिव्रत प्रवृत्त हुन्छन्।",
        "meaning_en": "Resorting to desire hard to fill, endowed with display, pride, and intoxication; taking unsound holds through delusion, they set forth with impure vows.",
    },
    "16.11": {
        "meaning_ne": "प्रलयसम्मको अपरिमेय चिन्ता उपाश्रित; कामोपभोग परम, «यति नै» निश्चय।",
        "meaning_en": "Given over to immeasurable cares that end only at dissolution, holding enjoyment of desires as highest, sure that this is all.",
    },
    "16.12": {
        "meaning_ne": "आशापाशशतैर्बद्ध, काम-क्रोध परायण; कामभोगार्थ अन्यायले अर्थसञ्चय ईहन्ते।",
        "meaning_en": "Bound by hundreds of snares of hope, intent on desire and anger, they seek hoards of wealth by injustice for the enjoyment of desires.",
    },
    "16.13": {
        "meaning_ne": "«आज मैले यो लभें, यो मनोरथ पाउनेछु; यो छ, यो धन पनि फेरि मेरो हुनेछ।»",
        "meaning_en": "\"This has been gained by me today; this wish I shall obtain. This is mine, and this wealth too will be mine again.\"",
    },
    "16.14": {
        "meaning_ne": "«त्यो शत्रु मैले मारें, अरू पनि मार्नेछु; म ईश्वर, म भोगी, म सिद्ध, बलवान्, सुखी।»",
        "meaning_en": "\"That enemy has been slain by me, and I shall slay others too. I am the lord, I am the enjoyer, I am perfected, strong, happy.\"",
    },
    "16.15": {
        "meaning_ne": "«आढ्य, अभिजनवान् छु, मसदृश अरू को? यज्ञ गर्नेछु, दिनेछु, मोद गर्नेछु» — अज्ञानविमोहित।",
        "meaning_en": "\"I am rich, well-born; who else is my like? I shall sacrifice, I shall give, I shall rejoice\" — thus deluded by ignorance.",
    },
    "16.16": {
        "meaning_ne": "अनेक चित्तविभ्रान्त, मोहजालसमावृत, कामभोगमा प्रसक्त भई अशुचि नरकमा पर्छन्।",
        "meaning_en": "Whirled about by many thoughts, wrapped in the net of delusion, clinging to the enjoyments of desire, they fall into a foul hell.",
    },
    "16.17": {
        "meaning_ne": "आत्मसम्भावित, स्तब्ध, धन-मान-मदयुक्त; दम्भले नामयज्ञ अविधिपूर्वक यजन गर्छन्।",
        "meaning_en": "Self-honoured, stiff, endowed with the pride of wealth and honour, they sacrifice with yajnas that are so in name, out of display, not according to ordinance.",
    },
    "16.18": {
        "meaning_ne": "अहङ्कार, बल, दर्प, काम, क्रोध संश्रित; आत्म र पर देहमा मलाई द्वेष गर्ने अभ्यसूयक।",
        "meaning_en": "Resorting to I-making, strength, arrogance, desire, and anger, hating me in their own and others' bodies, they are fault-finders.",
    },
    "16.19": {
        "meaning_ne": "ती द्वेषी क्रूर नराधमहरूलाई संसारमा अजस्र अशुभ आसुरी योनिमा नै क्षेपण गर्छु।",
        "meaning_en": "Those haters, cruel, lowest of men, I hurl continually into asuric wombs in the wanderings, the inauspicious.",
    },
    "16.20": {
        "meaning_ne": "आसुरी योनि पाएका मूढ जन्म-जन्ममा मलाई नपाई, हे कौन्तेय, त्यसपछि अधम गति जान्छन्।",
        "meaning_en": "Having come to an asuric womb, deluded birth after birth, not reaching me, O son of Kunti, they then go to the lowest course.",
    },
    "16.21": {
        "meaning_ne": "नरकको यो त्रिविध द्वार आत्माको नाश — काम, क्रोध र लोभ; तसर्थ यो तीन त्याग।",
        "meaning_en": "This threefold gate of hell is the self's destruction: desire, anger, and greed. Therefore one should abandon this triad.",
    },
    "16.22": {
        "meaning_ne": "हे कौन्तेय, यी तीन तमोद्वारबाट विमुक्त नर आफ्नो श्रेय आचर गर्छ; त्यसपछि परा गति जान्छ।",
        "meaning_en": "Released from these three gates of darkness, O son of Kunti, a man practises what is better for the self; then he goes to the highest course.",
    },
    "16.23": {
        "meaning_ne": "शास्त्रविधि छाडेर कामकारतः वर्तने सिद्धि पाउँदैन, सुख होइन, परा गति होइन।",
        "meaning_en": "Who, casting aside the ordinance of shastra, lives from the prompting of desire, attains neither perfection nor joy nor the highest course.",
    },
    "16.24": {
        "meaning_ne": "तसर्थ कार्य-अकार्य व्यवस्थितिमा शास्त्र तेरो प्रमाण; शास्त्रविधानोक्त जानेर यहाँ कर्म गर्न योग्य छौ।",
        "meaning_en": "Therefore let shastra be your measure in the settling of what is to be done and not done. Knowing what is said in the ordinance of shastra, you should act here.",
    },
}

CH17 = {
    "17.1": {
        "meaning_ne": "अर्जुनले भने: शास्त्रविधि छाडेर श्रद्धायुक्त यजन गर्नेहरूको निष्ठा के हो, हे कृष्ण — सत्त्व, रजस् कि तमस्?",
        "meaning_en": "Arjuna said: Those who, casting aside the ordinance of shastra, sacrifice endowed with faith — what is their standing, Krishna: sattva, or rajas, or tamas?",
    },
    "17.2": {
        "meaning_ne": "श्रीभगवान्ले भने: देहीहरूकी श्रद्धा स्वभावजा त्रिविधा हुन्छ — सात्त्विकी, राजसी र तामसी; त्यो सुन।",
        "meaning_en": "The Blessed Lord said: The faith of the embodied is threefold, born of their own-nature: sattvic, rajasic, and tamasic. Hear of it.",
    },
    "17.3": {
        "meaning_ne": "हे भारत, सबैकी श्रद्धा सत्त्वानुरूप हुन्छ; यो पुरुष श्रद्धामय हो — जुन श्रद्धा, त्यही ऊ हो।",
        "meaning_en": "The faith of each is according to his sattva, O Bharata. This person is made of faith; who he is, that is his faith.",
    },
    "17.4": {
        "meaning_ne": "सात्त्विक देवता यजन गर्छन्, राजस यक्ष-रक्षस्; तामस जन प्रेत र भूतगण यजन गर्छन्।",
        "meaning_en": "The sattvic sacrifice to the gods, the rajasic to yakshas and rakshasas; other people, tamasic, sacrifice to pretas and hosts of beings.",
    },
    "17.5": {
        "meaning_ne": "अशास्त्रविहित घोर तप जसले तपस्या गर्छन् — दम्भ-अहङ्कारयुक्त, काम-राग-बलान्वित।",
        "meaning_en": "Those people who practise fierce tapas not ordained by shastra, joined with display and I-making, endowed with the force of desire and passion.",
    },
    "17.6": {
        "meaning_ne": "अचेतस् शरीरस्थ भूतग्राम कर्षण गर्दै, अन्तःशरीरस्थ मलाई पनि — तिनीहरूलाई आसुरनिश्चय जान।",
        "meaning_en": "Starving the host of elements in the body, without sense, and me too who dwell within the body — know them as of asuric resolve.",
    },
    "17.7": {
        "meaning_ne": "सबैको प्रिय आहार पनि त्रिविध हुन्छ; यज्ञ, तप, दान पनि — तिनको यो भेद सुन।",
        "meaning_en": "Food too, dear to each, is of three kinds, and yajna, tapas, and giving. Hear this distinction of them.",
    },
    "17.8": {
        "meaning_ne": "आयु, सत्त्व, बल, आरोग्य, सुख, प्रीति बढाउने; रस्य, स्निग्ध, स्थिर, हृद्य आहार सात्त्विकप्रिय।",
        "meaning_en": "Foods that increase life, sattva, strength, health, joy, and delight, that are tasty, rich, lasting, and heart-pleasing, are dear to the sattvic.",
    },
    "17.9": {
        "meaning_ne": "कटु, अम्ल, लवण, अत्युष्ण, तीक्ष्ण, रूक्ष, विदाहि; दुःख-शोक-आमयप्रद आहार राजसको इष्ट।",
        "meaning_en": "Foods that are bitter, sour, salty, very hot, pungent, dry, and burning, that give pain, grief, and illness, are desired by the rajasic.",
    },
    "17.10": {
        "meaning_ne": "यातयाम, गतरस, पूति, पर्युषित, उच्छिष्ट र अमेध्य भोजन तामसप्रिय।",
        "meaning_en": "Food that is stale, drained of taste, putrid, leftover, and also what is leftover from eating, and unfit — that food is dear to the tamasic.",
    },
    "17.11": {
        "meaning_ne": "फल नकाङ्क्षा गर्नेहरूले विधिदृष्ट यज्ञ «यष्टव्य नै» मन समाधाएर इज्य हुन्छ भने सात्त्विक।",
        "meaning_en": "The yajna that is offered by those who do not long for fruit, seen in the ordinance, setting the mind that it simply ought to be offered — that is sattvic.",
    },
    "17.12": {
        "meaning_ne": "फल अभिसन्धि गरी वा दम्भार्थ इज्य हुने, हे भरतश्रेष्ठ, त्यो यज्ञ राजस जान।",
        "meaning_en": "But what is offered with fruit in view, or again for the sake of display, O best of Bharatas — know that yajna as rajasic.",
    },
    "17.13": {
        "meaning_ne": "विधिहीन, असृष्टान्न, मन्त्रहीन, अदक्षिण, श्रद्धाविरहित यज्ञलाई तामस भन्छन्।",
        "meaning_en": "The yajna without ordinance, without food given, without mantra, without gift to the priests, without faith, they reckon as tamasic.",
    },
    "17.14": {
        "meaning_ne": "देव, द्विज, गुरु, प्राज्ञ पूजन, शौच, आर्जव, ब्रह्मचर्य, अहिंसा — शारीर तप भनिन्छ।",
        "meaning_en": "Worship of gods, the twice-born, teachers, and the wise; purity, straightforwardness, brahmacharya, and non-harm — this is called tapas of the body.",
    },
    "17.15": {
        "meaning_ne": "अनुद्वेगकर, सत्य, प्रिय-हित वाक्य र स्वाध्यायाभ्यसन — वाङ्मय तप भनिन्छ।",
        "meaning_en": "Speech that causes no agitation, that is true, pleasant, and beneficial, and the practice of study — this is called tapas of speech.",
    },
    "17.16": {
        "meaning_ne": "मनःप्रसाद, सौम्यत्व, मौन, आत्मविनिग्रह, भावसंशुद्धि — यो मानस तप भनिन्छ।",
        "meaning_en": "Clarity of mind, gentleness, silence, restraint of the self, purity of being — this is called tapas of mind.",
    },
    "17.17": {
        "meaning_ne": "परा श्रद्धाले युक्त, अफलाकाङ्क्षी नरहरूले तप्त यो त्रिविध तप सात्त्विक भन्छन्।",
        "meaning_en": "This threefold tapas, practised with the highest faith by yoked people who do not long for fruit, they reckon as sattvic.",
    },
    "17.18": {
        "meaning_ne": "सत्कार-मान-पूजाका लागि र दम्भले गरिने तप यहाँ राजस भनिएको — चल, अध्रुव।",
        "meaning_en": "Tapas that is done for honour, respect, and worship, and with display, is declared here as rajasic — unsteady, not lasting.",
    },
    "17.19": {
        "meaning_ne": "मूढग्रहले आफ्नो पीडाले वा परको उत्सादनार्थ गरिने तप तामस उदाहृत।",
        "meaning_en": "Tapas undertaken with a deluded grasp, by torment of oneself, or for the overthrow of another, is declared tamasic.",
    },
    "17.20": {
        "meaning_ne": "«दिनुपर्छ» भनी अनुपकारीलाई देश-काल-पात्रमा दिइने दान सात्त्विक स्मृत।",
        "meaning_en": "The gift that is given because it ought to be given, to one who does not give back, in the right place, time, and recipient, is remembered as sattvic.",
    },
    "17.21": {
        "meaning_ne": "प्रत्युपकारार्थ वा फल उद्दिष्ट गरी परिक्लिष्ट दिइने दान राजस स्मृत।",
        "meaning_en": "But the gift that is given for a return, or again aiming at fruit, and given grudgingly, is remembered as rajasic.",
    },
    "17.22": {
        "meaning_ne": "अदेशकालमा अपात्रलाई दिइने, असत्कृत, अवज्ञात दान तामस उदाहृत।",
        "meaning_en": "The gift that is given at the wrong place and time, and to unworthy recipients, without honour, with scorn, is declared tamasic.",
    },
    "17.23": {
        "meaning_ne": "ॐ तत् सत् — ब्रह्मको यो त्रिविध निर्देश स्मृत; त्यसैले पुरा ब्राह्मण, वेद र यज्ञ विहित भए।",
        "meaning_en": "Om tat sat — this is remembered as the threefold designation of Brahman. By that the brahmanas, the Vedas, and the yajnas were ordained of old.",
    },
    "17.24": {
        "meaning_ne": "तसर्थ ॐ उच्चारण गरी ब्रह्मवादीहरूका विधानोक्त यज्ञ-दान-तप क्रिया सधैं प्रवृत्त हुन्छन्।",
        "meaning_en": "Therefore, uttering Om, the acts of yajna, giving, and tapas ordained in the rule always go forth for those who speak of Brahman.",
    },
    "17.25": {
        "meaning_ne": "तत् भनी फल नअभिसन्धि मोक्षकाङ्क्षीहरूले विविध यज्ञ-तप-दान क्रिया गर्छन्।",
        "meaning_en": "Uttering tat, without aiming at fruit, acts of yajna and tapas and various acts of giving are done by those who long for release.",
    },
    "17.26": {
        "meaning_ne": "सद्भाव र साधुभावमा सत् प्रयोग हुन्छ; हे पार्थ, प्रशस्त कर्ममा पनि सत् शब्द युज्य हुन्छ।",
        "meaning_en": "In the sense of real being and of being good, sat is used. In a praiseworthy work too, O Partha, the word sat is joined.",
    },
    "17.27": {
        "meaning_ne": "यज्ञ, तप, दानमा स्थितिलाई सत् भनिन्छ; तदर्थीय कर्मलाई पनि सत् नै अभिधान गरिन्छ।",
        "meaning_en": "Steadfastness in yajna, in tapas, and in giving is also called sat; and action for that purpose is designated sat as well.",
    },
    "17.28": {
        "meaning_ne": "अश्रद्धाले हुत, दत्त, तप्त, कृत जे छ, हे पार्थ, असत् भनिन्छ; त्यो न प्रेत्य, न यहाँ।",
        "meaning_en": "Whatever is offered, given, practised as tapas, or done without faith is called asat, O Partha — neither hereafter nor here.",
    },
}

CH18 = {
    "18.1": {
        "meaning_ne": "अर्जुनले भने: हे महाबाहो, संन्यासको तत्त्व जान्न चाहन्छु, त्यागको पनि, हे हृषीकेश केशिनिषूदन, पृथक्।",
        "meaning_en": "Arjuna said: I wish to know the truth of renunciation, O mighty-armed, and of relinquishing, separately, O Hrishikesha, slayer of Keshi.",
    },
    "18.2": {
        "meaning_ne": "श्रीभगवान्ले भने: काम्य कर्मको न्यासलाई कविहरू संन्यास जान्दछन्; सबै कर्मफल त्यागलाई विचक्षणहरू त्याग भन्छन्।",
        "meaning_en": "The Blessed Lord said: The seers know the laying-down of desired works as renunciation. The clear-sighted call relinquishing the abandonment of the fruit of all action.",
    },
    "18.3": {
        "meaning_ne": "कति मनीषी कर्म दोषवत् त्याज्य भन्छन्; अरू यज्ञ-दान-तप कर्म त्याज्य होइन भन्छन्।",
        "meaning_en": "Some thoughtful ones say action should be abandoned as faulty; others, that the works of yajna, giving, and tapas should not be abandoned.",
    },
    "18.4": {
        "meaning_ne": "हे भरतसत्तम, त्यागमा मेरो निश्चय सुन; हे पुरुषव्याघ्र, त्याग त्रिविध सम्प्रकीर्तित छ।",
        "meaning_en": "Hear my settled view on relinquishing, O best of Bharatas. Relinquishing is declared to be of three kinds, O tiger among men.",
    },
    "18.5": {
        "meaning_ne": "यज्ञ-दान-तप कर्म त्याज्य होइन, कार्य नै हो; यज्ञ, दान, तप मनीषीहरूलाई पावन हुन्।",
        "meaning_en": "The works of yajna, giving, and tapas are not to be abandoned; they are to be done. Yajna, giving, and tapas are purifiers of the thoughtful.",
    },
    "18.6": {
        "meaning_ne": "यी कर्म पनि सङ्ग र फल त्यागेर कर्तव्य हुन् — हे पार्थ, यो मेरो निश्चित उत्तम मत।",
        "meaning_en": "But even these actions should be done, abandoning clinging and fruits. That is my settled highest view, O Partha.",
    },
    "18.7": {
        "meaning_ne": "नियत कर्मको संन्यास उपपन्न हुँदैन; मोहले त्यसको परित्याग तामस परिकीर्तित।",
        "meaning_en": "The renunciation of prescribed action is not fitting. Abandonment of it from delusion is declared tamasic.",
    },
    "18.8": {
        "meaning_ne": "कर्म दुःख हो भनी कायक्लेशको भयले त्याग्ने राजस त्याग गरेर त्यागफल पाउँदैन।",
        "meaning_en": "Who abandons action as pain, from fear of bodily distress, doing a rajasic relinquishing, does not gain the fruit of relinquishing.",
    },
    "18.9": {
        "meaning_ne": "हे अर्जुन, नियत कर्म «कार्य» भनी सङ्ग र फल त्यागेर गरिन्छ भने त्यो त्याग सात्त्विक मानिन्छ।",
        "meaning_en": "When prescribed action is done, Arjuna, simply as what ought to be done, abandoning clinging and fruit, that relinquishing is held sattvic.",
    },
    "18.10": {
        "meaning_ne": "अकुशल कर्म द्वेष गर्दैन, कुशलमा अनुषङ्ग गर्दैन; सत्त्वसमाविष्ट मेधावी छिन्नसंशय त्यागी।",
        "meaning_en": "He does not hate unskilled action, nor cling to the skilled. The relinquisher, filled with sattva, is insightful, his doubt cut.",
    },
    "18.11": {
        "meaning_ne": "देहभृत्ले कर्म अशेष त्याग्न सकिँदैन; कर्मफलत्यागीलाई त्यागी अभिधान गरिन्छ।",
        "meaning_en": "For it is not possible for one who bears a body to abandon actions without remainder. Who abandons the fruit of action is designated a relinquisher.",
    },
    "18.12": {
        "meaning_ne": "अनिष्ट, इष्ट, मिश्र — कर्मको त्रिविध फल अत्यागीलाई प्रेत्य हुन्छ; संन्यासीलाई कहिल्यै होइन।",
        "meaning_en": "The threefold fruit of action — unwished, wished, and mixed — comes after death to those who do not relinquish, but nowhere to those who have renounced.",
    },
    "18.13": {
        "meaning_ne": "हे महाबाहो, सबै कर्मको सिद्धिका लागि साङ्ख्य कृतान्तमा प्रोक्त यी पाँच कारण मसँग जान।",
        "meaning_en": "Learn from me these five causes, O mighty-armed, declared in the Sankhya that ends action, for the accomplishment of all works.",
    },
    "18.14": {
        "meaning_ne": "अधिष्ठान, कर्ता, पृथग्विध करण, विविध पृथक् चेष्टा, र यहाँ पाँचौं दैव।",
        "meaning_en": "The basis, and the doer, and the various kinds of instrument, and the several movements of many kinds, and fate here as the fifth.",
    },
    "18.15": {
        "meaning_ne": "शरीर-वाक्-मनले नर जुन कर्म आरम्भ गर्छ — न्याय्य वा विपरीत — यी पाँच त्यसका हेतु हुन्।",
        "meaning_en": "Whatever action a man undertakes with body, speech, and mind, right or the reverse, these five are its causes.",
    },
    "18.16": {
        "meaning_ne": "यस्तो हुँदा केवल आत्मालाई कर्ता देख्ने, अकृतबुद्धि भएकाले, दुर्मति देख्दैन।",
        "meaning_en": "That being so, who sees the self alone as the doer, from unmade insight — that ill-minded one does not see.",
    },
    "18.17": {
        "meaning_ne": "जसको अहङ्कृत भाव छैन, बुद्धि लिप्त हुँदैन — यी लोक मारे पनि मार्दैन, बाँधिँदैन।",
        "meaning_en": "Whose being is not I-made, whose insight is not stained — though he slay these worlds, he does not slay, and is not bound.",
    },
    "18.18": {
        "meaning_ne": "ज्ञान, ज्ञेय, परिज्ञाता — त्रिविधा कर्मचोदना; करण, कर्म, कर्ता — त्रिविध कर्मसङ्ग्रह।",
        "meaning_en": "Knowledge, the knowable, and the knower are the threefold goad of action. Instrument, action, and doer are the threefold gathering of action.",
    },
    "18.19": {
        "meaning_ne": "ज्ञान, कर्म र कर्ता गुणभेदले त्रिधै प्रोच्य हुन्छ गुणसङ्ख्यानमा; यथावत् पृथक् सुन, ती पनि।",
        "meaning_en": "Knowledge, action, and doer are declared as threefold by the difference of gunas in the counting of the gunas. Hear them also as they are, separately.",
    },
    "18.20": {
        "meaning_ne": "सबै भूतमा एक अव्यय भाव, विभक्तमा अविभक्त हेर्ने ज्ञान सात्त्विक जान।",
        "meaning_en": "That knowledge by which one sees in all beings a single unchanging being, undivided in the divided — know that knowledge as sattvic.",
    },
    "18.21": {
        "meaning_ne": "पृथक्त्वले नानाभाव पृथग्विध सबै भूतमा जान्ने ज्ञान राजस जान।",
        "meaning_en": "But that knowledge which, by separateness, knows in all beings various beings of various kinds — know that knowledge as rajasic.",
    },
    "18.22": {
        "meaning_ne": "एक कार्यमा कृत्स्नवत् सक्त, अहैतुक, अतत्त्वार्थवत्, अल्प — त्यो तामस उदाहृत।",
        "meaning_en": "But that which is attached to a single effect as if it were the whole, without reason, not reaching the real, and slight — that is declared tamasic.",
    },
    "18.23": {
        "meaning_ne": "नियत, सङ्गरहित, अरागद्वेष, अफलप्रेप्सुले कृत कर्म सात्त्विक भनिन्छ।",
        "meaning_en": "Prescribed action, done without clinging, without attraction or aversion, by one who does not seek fruit — that is called sattvic.",
    },
    "18.24": {
        "meaning_ne": "कामेप्सु वा साहङ्कार, बहुलायासले गरिने कर्म राजस उदाहृत।",
        "meaning_en": "But action that is done by one seeking desire, or again with I-making, with much labour — that is declared rajasic.",
    },
    "18.25": {
        "meaning_ne": "अनुबन्ध, क्षय, हिंसा, पौरुष नहेरी मोहले आरम्भ गरिने कर्म तामस भनिन्छ।",
        "meaning_en": "Action undertaken from delusion, without regard to consequence, loss, harm, or one's own power — that is called tamasic.",
    },
    "18.26": {
        "meaning_ne": "मुक्तसङ्ग, अनहंवादी, धृति-उत्साहसमन्वित, सिद्धि-असिद्धिमा निर्विकार कर्ता सात्त्विक भनिन्छ।",
        "meaning_en": "Free of clinging, not saying \"I\", endowed with firmness and energy, unchanged in success and failure — the doer is called sattvic.",
    },
    "18.27": {
        "meaning_ne": "रागी, कर्मफलप्रेप्सु, लुब्ध, हिंसात्मक, अशुचि, हर्ष-शोकान्वित कर्ता राजस परिकीर्तित।",
        "meaning_en": "Passionate, seeking the fruit of works, greedy, harmful by nature, impure, joined to elation and grief — the doer is declared rajasic.",
    },
    "18.28": {
        "meaning_ne": "अयुक्त, प्राकृत, स्तब्ध, शठ, नैष्कृतिक, अलस, विषादी, दीर्घसूत्री कर्ता तामस भनिन्छ।",
        "meaning_en": "Unyoked, vulgar, stiff, deceitful, malicious, lazy, despondent, and dilatory — the doer is called tamasic.",
    },
    "18.29": {
        "meaning_ne": "हे धनञ्जय, बुद्धि र धृतिको गुणतः त्रिविध भेद अशेष पृथक्त्वले प्रोच्यमान सुन।",
        "meaning_en": "Hear the threefold distinction of insight and of firmness according to the gunas, being told without remainder, separately, O Dhananjaya.",
    },
    "18.30": {
        "meaning_ne": "प्रवृत्ति-निवृत्ति, कार्य-अकार्य, भय-अभय, बन्ध-मोक्ष जान्ने बुद्धि, हे पार्थ, सात्त्विकी।",
        "meaning_en": "The insight that knows going-forth and turning-back, what is to be done and not done, fear and fearlessness, bondage and release — that insight, O Partha, is sattvic.",
    },
    "18.31": {
        "meaning_ne": "जसले धर्म-अधर्म, कार्य-अकार्य अयथावत् जान्दछ, हे पार्थ, त्यो बुद्धि राजसी।",
        "meaning_en": "The insight by which one knows dharma and adharma, and what is to be done and not done, not as they are — that insight, O Partha, is rajasic.",
    },
    "18.32": {
        "meaning_ne": "तमले आवृत अधर्मलाई धर्म ठान्ने, सब अर्थ विपरीत, हे पार्थ, त्यो बुद्धि तामसी।",
        "meaning_en": "The insight which, wrapped in tamas, thinks adharma to be dharma, and all things reversed — that insight, O Partha, is tamasic.",
    },
    "18.33": {
        "meaning_ne": "योगले अव्यभिचारिणी धृतिले मन-प्राण-इन्द्रिय क्रिया धारण गर्ने, हे पार्थ, सात्त्विकी धृति।",
        "meaning_en": "The firmness by which one holds the activities of mind, breaths, and senses, unswerving, through yoga — that firmness, O Partha, is sattvic.",
    },
    "18.34": {
        "meaning_ne": "हे अर्जुन, धर्म-काम-अर्थ धृतिले धारण गर्ने, प्रसङ्गले फलाकाङ्क्षी, हे पार्थ, राजसी धृति।",
        "meaning_en": "But the firmness by which one holds dharma, desire, and gain, O Arjuna, wanting fruit from attachment — that firmness, O Partha, is rajasic.",
    },
    "18.35": {
        "meaning_ne": "स्वप्न, भय, शोक, विषाद, मद नछाड्ने दुर्मेधा, हे पार्थ, तामसी धृति।",
        "meaning_en": "The firmness by which a dull-minded one does not give up sleep, fear, grief, despondency, and intoxication — that firmness, O Partha, is tamasic.",
    },
    "18.36": {
        "meaning_ne": "हे भरतर्षभ, अब त्रिविध सुख सुन — जहाँ अभ्यासले रम्छ र दुःखको अन्त जान्छ।",
        "meaning_en": "And now hear from me the threefold joy, O best of Bharatas, in which one delights by practice and goes to the end of pain.",
    },
    "18.37": {
        "meaning_ne": "अग्रमा विषजस्तो, परिणाममा अमृतोपम; आत्मबुद्धिप्रसादज त्यो सुख सात्त्विक प्रोक्त।",
        "meaning_en": "That which is like poison at first, like deathless nectar in its ripening — that joy is declared sattvic, born of the clarity of self-insight.",
    },
    "18.38": {
        "meaning_ne": "विषय-इन्द्रिय संयोगबाट अग्रमा अमृतोपम, परिणाममा विषजस्तो — त्यो सुख राजस स्मृत।",
        "meaning_en": "That which from the joining of senses and objects is like deathless nectar at first, like poison in its ripening — that joy is remembered as rajasic.",
    },
    "18.39": {
        "meaning_ne": "अग्रमा र अनुबन्धमा आत्मा मोहन गर्ने सुख; निद्रा-आलस्य-प्रमादबाट उठेको तामस उदाहृत।",
        "meaning_en": "The joy that, at first and in its following, deludes the self, arising from sleep, sloth, and heedlessness, is declared tamasic.",
    },
    "18.40": {
        "meaning_ne": "पृथ्वीमा वा दिवि देवताहरूमा पनि यी तीन प्रकृतिज गुणबाट मुक्त सत्त्व छैन।",
        "meaning_en": "There is no being on earth, or again among the gods in heaven, that could be free of these three gunas born of prakriti.",
    },
    "18.41": {
        "meaning_ne": "हे परन्तप, ब्राह्मण, क्षत्रिय, विश् र शूद्रका कर्म स्वभावप्रभव गुणले प्रविभक्त छन्।",
        "meaning_en": "The actions of brahmanas, kshatriyas, vaishyas, and shudras, O scorcher of foes, are apportioned by the gunas that arise from their own-nature.",
    },
    "18.42": {
        "meaning_ne": "शम, दम, तप, शौच, क्षान्ति, आर्जव, ज्ञान, विज्ञान, आस्तिक्य — ब्राह्मणकर्म स्वभावज।",
        "meaning_en": "Stillness, restraint, tapas, purity, forbearance, straightforwardness, knowledge, realization, and trust — the work of a brahmana, born of own-nature.",
    },
    "18.43": {
        "meaning_ne": "शौर्य, तेज, धृति, दाक्ष्य, युद्धमा अपलायन, दान, ईश्वरभाव — क्षात्र कर्म स्वभावज।",
        "meaning_en": "Valour, brilliance, firmness, skill, and not fleeing in battle, giving, and lordliness — the work of a kshatriya, born of own-nature.",
    },
    "18.44": {
        "meaning_ne": "कृषि, गौरक्ष्य, वाणिज्य वैश्यकर्म स्वभावज; परिचर्यात्मक कर्म शूद्रको पनि स्वभावज।",
        "meaning_en": "Farming, cow-keeping, and trade are the work of a vaishya, born of own-nature. Work whose nature is service is also born of the shudra's own-nature.",
    },
    "18.45": {
        "meaning_ne": "आ-आफ्नो कर्ममा अभिरत नर संसिद्धि पाउँछ; स्वकर्मनिरत कसरी सिद्धि पाउँछ त्यो सुन।",
        "meaning_en": "Devoted to his own action, a man gains complete perfection. Hear how one devoted to his own action finds perfection.",
    },
    "18.46": {
        "meaning_ne": "जसबाट भूतहरूको प्रवृत्ति, जसले यो सब तत छ — स्वकर्मले त्यसलाई अभ्यर्च्य मानव सिद्धि पाउँछ।",
        "meaning_en": "From whom is the going-forth of beings, by whom all this is spread — worshipping him with his own action, a human being finds perfection.",
    },
    "18.47": {
        "meaning_ne": "विगुण स्वधर्म सुष्ठु परधर्मभन्दा श्रेयस्कर; स्वभावनियत कर्म गर्दा किल्बिष लाग्दैन।",
        "meaning_en": "Better one's own dharma, though imperfect, than another's well performed. Doing action determined by own-nature, one does not incur guilt.",
    },
    "18.48": {
        "meaning_ne": "हे कौन्तेय, सहज कर्म सदोष भए पनि नत्याग्नु; सबै आरम्भ दोषले आवृत छन् — धुवाँले आगो जस्तै।",
        "meaning_en": "The action born with one, O son of Kunti, even if faulty, one should not abandon. All undertakings are wrapped in fault, as fire by smoke.",
    },
    "18.49": {
        "meaning_ne": "सर्वत्र असक्तबुद्धि, जितात्मा, विगतस्पृह संन्यासले परम नैष्कर्म्यसिद्धि अधिगमन गर्छ।",
        "meaning_en": "Insight unattached everywhere, the self conquered, longing gone — by renunciation he attains the highest perfection of freedom from works.",
    },
    "18.50": {
        "meaning_ne": "सिद्धि पाएर ब्रह्म कसरी पाउँछ जान, हे कौन्तेय, संक्षेपमा — ज्ञानको परा निष्ठा जुन हो।",
        "meaning_en": "How one who has reached perfection attains Brahman, learn from me, O son of Kunti, in brief — that which is the highest standing of knowledge.",
    },
    "18.51": {
        "meaning_ne": "विशुद्ध बुद्धिले युक्त, धृतिले आत्मा नियम गरी, शब्दादि विषय त्यागी, राग-द्वेष व्युदस्त।",
        "meaning_en": "Yoked with a purified insight, restraining the self with firmness, abandoning objects, sound and the rest, and putting off attraction and aversion.",
    },
    "18.52": {
        "meaning_ne": "विविक्तसेवी, लघ्वाशी, यतवाक्-काय-मानस, नित्य ध्यानयोगपर, वैराग्य उपाश्रित।",
        "meaning_en": "Dwelling in solitude, eating lightly, speech, body, and mind restrained, always intent on the yoga of meditation, taking refuge in dispassion.",
    },
    "18.53": {
        "meaning_ne": "अहङ्कार, बल, दर्प, काम, क्रोध, परिग्रह विमुच्य, निर्मम, शान्त — ब्रह्मभूयका लागि कल्पित।",
        "meaning_en": "Released from I-making, strength, arrogance, desire, anger, grasping, without 'mine', at peace — he is fit for becoming Brahman.",
    },
    "18.54": {
        "meaning_ne": "ब्रह्मभूत प्रसन्नात्मा नशोक गर्छ नकाङ्क्षा; सबै भूतमा सम भई परा मद्भक्ति पाउँछ।",
        "meaning_en": "Become Brahman, the self clear, he neither grieves nor longs. Even toward all beings, he attains the highest bhakti to me.",
    },
    "18.55": {
        "meaning_ne": "भक्तिले मलाई तत्त्वतः जान्दछ — जति र जस्तो छु; तत्त्वतः जानेर त्यसपछि ममा विशत हुन्छ।",
        "meaning_en": "By bhakti he knows me in truth, how great I am and who. Then, knowing me in truth, he enters immediately after.",
    },
    "18.56": {
        "meaning_ne": "सधैं सबै कर्म गर्दै पनि मद्व्यपाश्रय मत्प्रसादले शाश्वत अव्यय पद पाउँछ।",
        "meaning_en": "Even performing all actions always, taking refuge in me, by my grace he attains the everlasting, unchanging place.",
    },
    "18.57": {
        "meaning_ne": "चित्तले सबै कर्म ममा संन्यस्त, मत्पर, बुद्धियोग उपाश्रित, सतत मच्चित्त होओ।",
        "meaning_en": "Mentally renouncing all actions in me, intent on me, taking refuge in the yoga of insight, be one whose thought is on me always.",
    },
    "18.58": {
        "meaning_ne": "मच्चित्त मत्प्रसादले सबै दुर्गा तर्नेछौ; यदि अहङ्कारले नसुन्नेछौ भने विनष्ट हुनेछौ।",
        "meaning_en": "With thought on me you will cross all hard passes by my grace. But if from I-making you will not hear, you will perish.",
    },
    "18.59": {
        "meaning_ne": "अहङ्कार आश्रित «युद्ध गर्दिनँ» ठान्छौ भने त्यो व्यवसाय मिथ्या; प्रकृति तिमीलाई नियुक्त गर्नेछ।",
        "meaning_en": "If, resorting to I-making, you think \"I will not fight,\" this resolve of yours is false; prakriti will set you to it.",
    },
    "18.60": {
        "meaning_ne": "हे कौन्तेय, स्वभावज आफ्नै कर्मले निबद्ध; मोहले गर्न नचाहेको पनि अवश भएर गर्नेछौ।",
        "meaning_en": "Bound by your own action born of own-nature, O son of Kunti, what you do not wish to do from delusion you will do even helplessly.",
    },
    "18.61": {
        "meaning_ne": "हे अर्जुन, सबै भूतको ईश्वर हृदयदेशमा स्थित; मायाले यन्त्रारूढ सबै भूत भ्रामण गर्छ।",
        "meaning_en": "The Lord stands in the heart-region of all beings, Arjuna, causing all beings to revolve by maya, as if mounted on a machine.",
    },
    "18.62": {
        "meaning_ne": "हे भारत, सर्वभावले त्यही शरण जाओ; तत्प्रसादले परा शान्ति र शाश्वत स्थान पाउनेछौ।",
        "meaning_en": "Go to him alone for refuge with your whole being, O Bharata. By his grace you will attain the highest peace, the everlasting place.",
    },
    "18.63": {
        "meaning_ne": "यसरी गुह्यभन्दा गुह्यतर ज्ञान मैले तिमीलाई आख्यात गरें; यो अशेष विमर्श गरी जस्तो इच्छा त्यस्तै गर।",
        "meaning_en": "Thus knowledge more secret than secret has been declared by me to you. Having reflected on this without remainder, act as you wish.",
    },
    "18.64": {
        "meaning_ne": "सर्वगुह्यतम फेरि मेरो परम वचन सुन; तिमी मलाई दृढ इष्ट हौ, त्यसैले हित भन्छु।",
        "meaning_en": "Hear again my highest word, the most secret of all. You are firmly dear to me; therefore I shall speak what is for your good.",
    },
    "18.65": {
        "meaning_ne": "मन्मना होओ, मद्भक्त, मद्याजी, मलाई नमस्कार गर; मकहाँ नै आउनेछौ — सत्य प्रतिज्ञा गर्छु, तिमी मलाई प्रिय हौ।",
        "meaning_en": "Be one whose mind is on me, my devotee, my sacrificer; bow to me. You will come to me; I promise you truly, for you are dear to me.",
    },
    "18.66": {
        "meaning_ne": "सबै धर्म परित्यज्य म एकमा शरण जाओ; म तिमीलाई सबै पापबाट मोक्ष गर्नेछु, नशोक गर।",
        "meaning_en": "Abandoning all dharmas, go for refuge to me alone. I shall release you from all evils; do not grieve.",
    },
    "18.67": {
        "meaning_ne": "यो अतपस्कलाई, अभक्तलाई कहिल्यै नभन्नू; अशुश्रूषुलाई होइन, मलाई अभ्यसूया गर्नेलाई होइन।",
        "meaning_en": "This is not to be told by you to one without tapas, nor to one without bhakti, nor to one who does not wish to hear, nor to one who finds fault with me.",
    },
    "18.68": {
        "meaning_ne": "यो परम गुह्य मद्भक्तहरूमा अभिधान गर्ने परा भक्ति ममा गरी सन्देहरहित मकहाँ आउँछ।",
        "meaning_en": "Who will declare this highest secret among my devotees, having made the highest bhakti to me, will come to me without doubt.",
    },
    "18.69": {
        "meaning_ne": "मनुष्यहरूमा त्यसभन्दा मलाई प्रियकृत्तम कोही छैन; भुवि त्यसभन्दा प्रियतर अरू हुनेछैन।",
        "meaning_en": "Nor is there among men anyone who does more dear work for me than he; nor will there be another dearer than he on earth.",
    },
    "18.70": {
        "meaning_ne": "हाम्रो यो धर्म्य संवाद अध्ययन गर्ने ज्ञानयज्ञले मैले इष्ट हुनेछु — यो मेरो मति।",
        "meaning_en": "And who will study this dialogue of ours, in accord with dharma — by him I shall be worshipped with the yajna of knowledge. That is my view.",
    },
    "18.71": {
        "meaning_ne": "श्रद्धावान् अनसूयु नर सुने पनि मुक्त भई पुण्यकर्मीहरूका शुभ लोक पाउँछ।",
        "meaning_en": "The man full of faith, without finding fault, who would even hear it, he too, released, would reach the fair worlds of those of good works.",
    },
    "18.72": {
        "meaning_ne": "हे पार्थ, के यो एकाग्र चित्तले सुनियो? हे धनञ्जय, के तिम्रो अज्ञानसम्मोह प्रणष्ट भयो?",
        "meaning_en": "Has this been heard by you, O Partha, with a one-pointed mind? Has the delusion of ignorance been destroyed for you, O Dhananjaya?",
    },
    "18.73": {
        "meaning_ne": "अर्जुनले भने: हे अच्युत, तिम्रो प्रसादले मोह नष्ट, स्मृति लब्ध; स्थित छु, सन्देह गएको, तिम्रो वचन गर्नेछु।",
        "meaning_en": "Arjuna said: Delusion is destroyed, memory is gained by me through your grace, O Acyuta. I stand with doubt gone; I shall do your word.",
    },
    "18.74": {
        "meaning_ne": "सञ्जयले भने: वासुदेव र महात्मा पार्थको यो अद्भुत रोमहर्षण संवाद मैले यसरी सुनें।",
        "meaning_en": "Sanjaya said: Thus I have heard this wondrous dialogue of Vasudeva and of the great-souled Partha, making the hair stand.",
    },
    "18.75": {
        "meaning_ne": "व्यासप्रसादले यो पर गुह्य सुनें — योगेश्वर कृष्णबाट स्वयं साक्षात् कथन् गर्दै योग।",
        "meaning_en": "By Vyasa's grace I have heard this highest secret, yoga from Krishna the lord of yoga, himself speaking it in presence.",
    },
    "18.76": {
        "meaning_ne": "हे राजन्, केशव-अर्जुनको यो अद्भुत पुण्य संवाद संस्मरण-संस्मरण गर्दै मुहुर्मुहु हर्षित हुन्छु।",
        "meaning_en": "O king, remembering again and again this wondrous, holy dialogue of Keshava and Arjuna, I rejoice again and again.",
    },
    "18.77": {
        "meaning_ne": "हरेको त्यो अत्यद्भुत रूप पनि संस्मरण-संस्मरण गर्दै, हे राजन्, महान् विस्मय हुन्छ, फेरि फेरि हर्षित।",
        "meaning_en": "And remembering again and again that most wondrous form of Hari, great wonder is mine, O king, and I rejoice again and again.",
    },
    "18.78": {
        "meaning_ne": "जहाँ योगेश्वर कृष्ण, जहाँ धनुर्धर पार्थ — त्यहाँ श्री, विजय, भूति, ध्रुवा नीति छ भन्ने मेरो मति।",
        "meaning_en": "Where Krishna is, lord of yoga, where Partha is, bearer of the bow — there is shri, victory, well-being, and lasting right, so I hold.",
    },
}

CHAPTERS = {16: CH16, 17: CH17, 18: CH18}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    for n, table in CHAPTERS.items():
        chapter = next(c for c in data["chapters"] if c["number"] == n)
        missing = []
        filled = 0
        for shloka in chapter["shlokas"]:
            extra = table.get(shloka["verse_label"])
            if extra is None:
                if shloka["verse_label"].startswith("इति") or shloka["verse_label"] == "ध्यानम्":
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
