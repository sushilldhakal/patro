#!/usr/bin/env python3
"""Fill Gita ch. 13–15 meaning_en / meaning_ne. Original glosses of this recension."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH13 = {
    "13.1": {
        "meaning_ne": "अर्जुनले भने: हे केशव, प्रकृति र पुरुष, क्षेत्र र क्षेत्रज्ञ, ज्ञान र ज्ञेय — यो जान्न चाहन्छु।",
        "meaning_en": "Arjuna said: I wish to know prakriti and purusha, the field and the knower of the field, knowledge and what is to be known, O Keshava.",
    },
    "13.2": {
        "meaning_ne": "श्रीभगवान्ले भने: हे कौन्तेय, यो शरीर क्षेत्र भनिन्छ; यसलाई जान्नेलाई तत्त्ववित्हरू क्षेत्रज्ञ भन्छन्।",
        "meaning_en": "The Blessed Lord said: This body, O son of Kunti, is called the field; who knows it, those who know that call the knower of the field.",
    },
    "13.3": {
        "meaning_ne": "हे भारत, सबै क्षेत्रमा क्षेत्रज्ञ मलाई पनि जान; क्षेत्र र क्षेत्रज्ञको ज्ञान त्यो ज्ञान मेरो मत हो।",
        "meaning_en": "Know me also as the knower of the field in all fields, O Bharata. Knowledge of the field and of the knower of the field — that is knowledge, in my view.",
    },
    "13.4": {
        "meaning_ne": "त्यो क्षेत्र के, कस्तो, के विकार, कहाँबाट के; र ऊ को, के प्रभाव — त्यो संक्षेपमा मसँग सुन।",
        "meaning_en": "What that field is, of what kind, what its changes, from what and what; and who he is, of what power — hear that from me in brief.",
    },
    "13.5": {
        "meaning_ne": "ऋषिहरूले बहुधा गाइएको, विविध छन्दले पृथक्, हेतुमत् निश्चित ब्रह्मसूत्र पदले पनि।",
        "meaning_en": "Sung in many ways by seers, separately in various metres, and also in the words of the Brahma-sutras, reasoned and decided.",
    },
    "13.6": {
        "meaning_ne": "महाभूत, अहङ्कार, बुद्धि, अव्यक्त; दश इन्द्रिय र एक, पाँच इन्द्रियगोचर।",
        "meaning_en": "The great elements, I-making, insight, and the unmanifest; the ten senses and the one, and the five ranges of the senses.",
    },
    "13.7": {
        "meaning_ne": "इच्छा, द्वेष, सुख, दुःख, सङ्घात, चेतना, धृति — यो क्षेत्र विकारसहित संक्षेपमा उदाहृत।",
        "meaning_en": "Wanting, aversion, pleasure, pain, the aggregate, awareness, firmness — this field is declared in brief, together with its changes.",
    },
    "13.8": {
        "meaning_ne": "अमानित्व, अदम्भित्व, अहिंसा, क्षान्ति, आर्जव, आचार्योपासन, शौच, स्थैर्य, आत्मविनिग्रह।",
        "meaning_en": "Unpretentiousness, absence of display, non-harm, forbearance, straightforwardness, sitting at a teacher's feet, purity, steadiness, restraint of the self.",
    },
    "13.9": {
        "meaning_ne": "इन्द्रियार्थमा वैराग्य, अनहङ्कार; जन्म-मृत्यु-जरा-व्याधिको दुःखदोष अनुदर्शन।",
        "meaning_en": "Dispassion toward sense-objects, and absence of I-making; seeing the fault of pain in birth, death, old age, and disease.",
    },
    "13.10": {
        "meaning_ne": "असक्ति, पुत्र-दार-गृहादिमा अनभिष्वङ्ग; इष्ट-अनिष्ट उपपत्तिमा नित्य समचित्तत्व।",
        "meaning_en": "Non-clinging, and not wrapping oneself in children, wife, house and the rest; evenness of mind always in the coming of the wished and the unwished.",
    },
    "13.11": {
        "meaning_ne": "ममा अनन्य योगले अव्यभिचारिणी भक्ति; विविक्त देश सेवन, जनसंसद्मा अरति।",
        "meaning_en": "And unswerving bhakti to me with a yoga that has no other; dwelling in a solitary place, no delight in the crowd of people.",
    },
    "13.12": {
        "meaning_ne": "अध्यात्मज्ञानमा नित्यता, तत्त्वज्ञानार्थ दर्शन — यो ज्ञान भनिएको; यसभन्दा अन्य अज्ञान।",
        "meaning_en": "Constancy in knowledge of the inner self, seeing the aim of knowledge of the real — this is declared as knowledge; what is other than this is ignorance.",
    },
    "13.13": {
        "meaning_ne": "ज्ञेय म भन्छु, जान्दा अमृत खाइन्छ; अनादि पर ब्रह्म — त्यो सत् भनिँदैन, असत् पनि होइन।",
        "meaning_en": "I shall tell that which is to be known, knowing which one tastes the deathless. The beginningless highest Brahman is said to be neither being nor non-being.",
    },
    "13.14": {
        "meaning_ne": "सर्वत्र पाणि-पाद, सर्वत्र अक्षि-शिर-मुख; लोकमा सर्वत्र श्रुतिमान्, सब आवृत गरी स्थित।",
        "meaning_en": "Everywhere hands and feet, everywhere eyes, heads, and faces; having ears everywhere in the world, it stands wrapping all.",
    },
    "13.15": {
        "meaning_ne": "सर्वेन्द्रियगुणको आभास, सर्वेन्द्रियविवर्जित; असक्त, सर्वभृत्, निर्गुण, गुणभोक्ता पनि।",
        "meaning_en": "Seeming to have the qualities of all the senses, yet without all the senses; unattached, yet supporting all; without gunas, yet the enjoyer of the gunas.",
    },
    "13.16": {
        "meaning_ne": "भूतहरूको बाहिर र भित्र, अचर र चर; सूक्ष्म भएकाले अविज्ञेय, दूरस्थ र अन्तिक पनि।",
        "meaning_en": "Outside and inside beings, the unmoving and the moving; because it is subtle it is unknowable, standing far and near as well.",
    },
    "13.17": {
        "meaning_ne": "भूतहरूमा अविभक्त, विभक्तजस्तै स्थित; भूतभर्ता त्यो ज्ञेय, ग्रसिष्णु र प्रभविष्णु पनि।",
        "meaning_en": "Undivided in beings, yet standing as if divided. That is to be known as the supporter of beings, devouring and bringing forth.",
    },
    "13.18": {
        "meaning_ne": "ज्योतिहरूको पनि त्यो ज्योति, तमभन्दा पर भनिन्छ; ज्ञान, ज्ञेय, ज्ञानगम्य, सबैको हृदयमा विष्ठित।",
        "meaning_en": "That light of lights too is said to be beyond darkness. Knowledge, the knowable, reachable by knowledge, seated in the heart of all.",
    },
    "13.19": {
        "meaning_ne": "यसरी क्षेत्र, ज्ञान र ज्ञेय संक्षेपमा भनियो; मद्भक्त यो विज्ञाय मद्भावमा पुग्छ।",
        "meaning_en": "Thus the field, knowledge, and the knowable have been told in brief. My devotee, knowing this, is fit for my being.",
    },
    "13.20": {
        "meaning_ne": "प्रकृति र पुरुष दुवै अनादि जान; विकार र गुणहरू प्रकृतिसम्भव जान।",
        "meaning_en": "Know prakriti and purusha both as beginningless. Know the changes and the gunas as born of prakriti.",
    },
    "13.21": {
        "meaning_ne": "कार्य-कारणको कर्तृत्वमा हेतु प्रकृति भनिन्छ; सुख-दुःखको भोक्तृत्वमा हेतु पुरुष भनिन्छ।",
        "meaning_en": "Prakriti is said to be the cause in the agency of effect and instrument. Purusha is said to be the cause in the enjoyership of pleasure and pain.",
    },
    "13.22": {
        "meaning_ne": "प्रकृतिस्थ पुरुष प्रकृतिज गुण भोग्छ; गुणसङ्ग नै सत्-असत् योनिजन्मको कारण हो।",
        "meaning_en": "For purusha, standing in prakriti, enjoys the gunas born of prakriti. Clinging to the gunas is the cause of his births in good and ill wombs.",
    },
    "13.23": {
        "meaning_ne": "उपद्रष्टा, अनुमन्ता, भर्ता, भोक्ता, महेश्वर, परमात्मा पनि भनिएको — यस देहमा पर पुरुष।",
        "meaning_en": "The overseer and consenter, supporter, enjoyer, great lord, called the highest Self as well — the highest Person in this body.",
    },
    "13.24": {
        "meaning_ne": "यसरी पुरुष र गुणसहित प्रकृति जान्ने, जसरी वर्ते पनि, फेरि जन्मँदैन।",
        "meaning_en": "Who knows thus the Person and prakriti together with the gunas is not born again, however he may move.",
    },
    "13.25": {
        "meaning_ne": "कति ध्यानले आत्मामा आत्माले आत्मा देख्छन्; अरू साङ्ख्ययोगले, अरू कर्मयोगले।",
        "meaning_en": "Some see the Self in the self by the self through meditation; others by the yoga of Sankhya, and others by the yoga of action.",
    },
    "13.26": {
        "meaning_ne": "अरू यसरी नजानी अरूबाट सुनेर उपासना गर्छन्; श्रुतिपरायण तिनै पनि मृत्यु तर्छन्।",
        "meaning_en": "But others, not knowing thus, worship having heard from others. They too cross death, intent upon what is heard.",
    },
    "13.27": {
        "meaning_ne": "हे भरतर्षभ, स्थावर-जङ्गम जुनसुकै सत्त्व जन्मन्छ, त्यो क्षेत्र-क्षेत्रज्ञ संयोगबाट जान।",
        "meaning_en": "Whatever being is born, standing or moving, know that to be from the joining of field and knower of the field, O best of Bharatas.",
    },
    "13.28": {
        "meaning_ne": "सबै भूतमा सम स्थित परमेश्वर, विनश्यत्मा अविनश्यन् देख्नेले नै देख्छ।",
        "meaning_en": "Who sees the highest Lord standing the same in all beings, not perishing when they perish — he sees.",
    },
    "13.29": {
        "meaning_ne": "सर्वत्र समवस्थित ईश्वर सम देख्ने आत्माले आत्मालाई हानि गर्दैन; त्यसैले परा गति जान्छ।",
        "meaning_en": "Seeing the Lord standing the same everywhere, he does not injure the self by the self; therefore he goes to the highest course.",
    },
    "13.30": {
        "meaning_ne": "सबै कर्म प्रकृतिले नै सर्वशः गरिन्छन् देख्ने, र आत्मालाई अकर्ता — ऊ देख्छ।",
        "meaning_en": "Who sees that actions are done in every way by prakriti alone, and the self as non-doer — he sees.",
    },
    "13.31": {
        "meaning_ne": "जब भूतहरूको पृथग्भाव एकस्थ अनुपश्य गर्छ, र त्यहीबाट विस्तार — तब ब्रह्म सम्पद्य हुन्छ।",
        "meaning_en": "When he sees the several being of beings as standing in the One, and from that alone the spreading-out, then he becomes Brahman.",
    },
    "13.32": {
        "meaning_ne": "अनादित्व र निर्गुणत्वले यो परमात्मा अव्यय; हे कौन्तेय, शरीरस्थ भए पनि नगर्छ, नलिप्त।",
        "meaning_en": "This highest Self is unchanging, because beginningless and without gunas. Though standing in the body, O son of Kunti, he neither acts nor is stained.",
    },
    "13.33": {
        "meaning_ne": "सर्वगत आकाश सौक्ष्म्यले नलिप्त जस्तै, देहमा सर्वत्र अवस्थित आत्मा पनि नलिप्त।",
        "meaning_en": "As all-going space is not stained, because of subtlety, so the self, standing everywhere in the body, is not stained.",
    },
    "13.34": {
        "meaning_ne": "एक रविले यो कृत्स्न लोक प्रकाश पारेजस्तै, हे भारत, क्षेत्रीले कृत्स्न क्षेत्र प्रकाश पार्छ।",
        "meaning_en": "As one sun lights up this whole world, so the owner of the field lights up the whole field, O Bharata.",
    },
    "13.35": {
        "meaning_ne": "क्षेत्र-क्षेत्रज्ञको यो अन्तर ज्ञानचक्षुले, र भूतप्रकृति मोक्ष जान्नेहरू पर जान्छन्।",
        "meaning_en": "Those who know thus, with the eye of knowledge, the distinction of field and knower of the field, and the release of being from prakriti, go to the highest.",
    },
}

CH14 = {
    "14.1": {
        "meaning_ne": "श्रीभगवान्ले भने: ज्ञानहरूमा उत्तम पर ज्ञान फेरि भन्छु; जान्दा सबै मुनि यहाँबाट परा सिद्धि गए।",
        "meaning_en": "The Blessed Lord said: I shall tell again the highest knowledge, highest of knowledges, knowing which all sages have gone from here to the highest perfection.",
    },
    "14.2": {
        "meaning_ne": "यो ज्ञान उपाश्रित मम साधर्म्यमा आएका सर्गमा पनि जन्मँदैनन्, प्रलयमा व्यथित हुँदैनन्।",
        "meaning_en": "Having resorted to this knowledge, come to a sameness of dharma with me, they are not born even at a creation, nor do they tremble at a dissolution.",
    },
    "14.3": {
        "meaning_ne": "मेरी योनि महद् ब्रह्म हो; त्यसमा गर्भ म राख्छु; त्यसबाट सबै भूतको सम्भव हुन्छ, हे भारत।",
        "meaning_en": "Great Brahman is my womb; in it I place the germ. From that is the coming-to-be of all beings, O Bharata.",
    },
    "14.4": {
        "meaning_ne": "हे कौन्तेय, सबै योनिमा जुन मूर्ति सम्भव हुन्छन्, तिनको महद् ब्रह्म योनि, बीजप्रद पिता म।",
        "meaning_en": "Whatever forms come to be in all wombs, O son of Kunti, great Brahman is their womb; I am the father who gives the seed.",
    },
    "14.5": {
        "meaning_ne": "सत्त्व, रजस्, तमस् — प्रकृतिसम्भव गुण; हे महाबाहो, देहमा अव्यय देहीलाई बाँध्छन्।",
        "meaning_en": "Sattva, rajas, tamas — the gunas born of prakriti bind the unchanging embodied one in the body, O mighty-armed.",
    },
    "14.6": {
        "meaning_ne": "त्यहाँ सत्त्व निर्मल भएकाले प्रकाशक, अनामय; हे अनघ, सुखसङ्ग र ज्ञानसङ्गले बाँध्छ।",
        "meaning_en": "Of these, sattva, being stainless, is illuminating and without ill. It binds by clinging to joy and by clinging to knowledge, O sinless one.",
    },
    "14.7": {
        "meaning_ne": "रजस् रागात्मक जान, तृष्णा-सङ्गबाट समुद्भव; हे कौन्तेय, कर्मसङ्गले देहीलाई बाँध्छ।",
        "meaning_en": "Know rajas as of the nature of passion, arising from thirst and clinging. It binds the embodied one by clinging to action, O son of Kunti.",
    },
    "14.8": {
        "meaning_ne": "तमस् अज्ञानजन्मे, सबै देहीलाई मोहन जान; हे भारत, प्रमाद, आलस्य, निद्राले बाँध्छ।",
        "meaning_en": "Know tamas as born of ignorance, the deluder of all the embodied. It binds by heedlessness, sloth, and sleep, O Bharata.",
    },
    "14.9": {
        "meaning_ne": "हे भारत, सत्त्व सुखमा सञ्जय गर्छ, रजस् कर्ममा; तमस् ज्ञान ढाकेर प्रमादमा सञ्जय गर्छ।",
        "meaning_en": "Sattva causes attachment in joy, rajas in action, O Bharata; but tamas, covering knowledge, causes attachment in heedlessness.",
    },
    "14.10": {
        "meaning_ne": "हे भारत, रजस्-तमस्लाई अभिभूत गरी सत्त्व हुन्छ; रजस् सत्त्व-तमस्लाई; तमस् सत्त्व-रजस्लाई।",
        "meaning_en": "Sattva comes to be, O Bharata, overpowering rajas and tamas; rajas, overpowering sattva and tamas; tamas, overpowering sattva and rajas.",
    },
    "14.11": {
        "meaning_ne": "यस देहका सबै द्वारमा प्रकाश उपजन्छ — ज्ञान — तब सत्त्व विवृद्ध जान।",
        "meaning_en": "When light is born at all the gates in this body, knowledge — then one should know that sattva has increased.",
    },
    "14.12": {
        "meaning_ne": "लोभ, प्रवृत्ति, कर्मको आरम्भ, अशम, स्पृहा — रजस् विवृद्ध हुँदा यी जन्मन्छन्, हे भरतर्षभ।",
        "meaning_en": "Greed, activity, the starting of works, unrest, longing — these are born when rajas has increased, O best of Bharatas.",
    },
    "14.13": {
        "meaning_ne": "अप्रकाश, अप्रवृत्ति, प्रमाद, मोह — तमस् विवृद्ध हुँदा यी जन्मन्छन्, हे कुरुनन्दन।",
        "meaning_en": "Non-light, non-activity, heedlessness, and delusion — these are born when tamas has increased, O joy of the Kurus.",
    },
    "14.14": {
        "meaning_ne": "सत्त्व प्रवृद्ध हुँदा देहभृत् प्रलय जान्छ भने उत्तमवित्हरूका अमल लोक पाउँछ।",
        "meaning_en": "When the embodied one goes to dissolution with sattva increased, then he attains the stainless worlds of those who know the highest.",
    },
    "14.15": {
        "meaning_ne": "रजस्मा प्रलय गएर कर्मसङ्गीहरूमा जन्मन्छ; तमस्मा प्रलीन मूढ योनिमा जन्मन्छ।",
        "meaning_en": "Going to dissolution in rajas, he is born among those clinging to works. Likewise, dissolved in tamas, he is born in wombs of the deluded.",
    },
    "14.16": {
        "meaning_ne": "सुकृत कर्मको फल सात्त्विक निर्मल भनिन्छ; रजस्को फल दुःख, तमस्को फल अज्ञान।",
        "meaning_en": "The fruit of well-done action they say is sattvic, stainless. The fruit of rajas is pain; the fruit of tamas is ignorance.",
    },
    "14.17": {
        "meaning_ne": "सत्त्वबाट ज्ञान जन्मन्छ, रजस्बाट लोभ; तमस्बाट प्रमाद-मोह र अज्ञान हुन्छ।",
        "meaning_en": "From sattva knowledge is born, and from rajas greed; heedlessness and delusion come from tamas, and ignorance as well.",
    },
    "14.18": {
        "meaning_ne": "सत्त्वस्थ ऊर्ध्व जान्छन्, राजस मध्ये रहन्छन्; जघन्य गुणवृत्तिस्थ तामस अधो जान्छन्।",
        "meaning_en": "Those standing in sattva go upward; the rajasic stay in the middle; those standing in the working of the lowest guna, the tamasic, go below.",
    },
    "14.19": {
        "meaning_ne": "गुणभन्दा अन्य कर्ता द्रष्टाले नदेख्दा, गुणभन्दा पर जानेर मद्भाव अधिगमन गर्छ।",
        "meaning_en": "When the seer sees no doer other than the gunas, and knows what is beyond the gunas, he attains my being.",
    },
    "14.20": {
        "meaning_ne": "देहसमुद्भव यी तीन गुण अतिक्रम गरी देही जन्म-मृत्यु-जरा दुःखबाट विमुक्त अमृत खान्छ।",
        "meaning_en": "Having crossed these three gunas, born of the body, the embodied one, released from the pains of birth, death, and old age, tastes the deathless.",
    },
    "14.21": {
        "meaning_ne": "अर्जुनले भने: हे प्रभो, यी तीन गुण अतीत कुन लिङ्गले हुन्छ? के आचार, कसरी यी तीन गुण अतिक्रम गर्छ?",
        "meaning_en": "Arjuna said: By what marks, O Lord, is one beyond these three gunas? What is his conduct, and how does he pass beyond these three gunas?",
    },
    "14.22": {
        "meaning_ne": "श्रीभगवान्ले भने: हे पाण्डव, प्रकाश, प्रवृत्ति र मोह प्रवृत्त हुँदा द्वेष गर्दैन, निवृत्त हुँदा काङ्क्षा गर्दैन।",
        "meaning_en": "The Blessed Lord said: Light and activity and delusion, O son of Pandu — he hates them not when they have come forth, nor longs for them when they have ceased.",
    },
    "14.23": {
        "meaning_ne": "उदासीन जस्तै बसी गुणले नविचलित; «गुण वर्तन्छन्» भनी अवस्थित, नहल्लिने।",
        "meaning_en": "Sitting as one indifferent, who is not shaken by the gunas, who stands, thinking \"the gunas operate,\" and does not stir.",
    },
    "14.24": {
        "meaning_ne": "समदुःखसुख, स्वस्थ, लोष्ट-अश्म-काञ्चन सम; तुल्य प्रिय-अप्रिय, धीर, निन्दा-आत्मसंस्तुति तुल्य।",
        "meaning_en": "Even in pain and pleasure, abiding in the self; to whom a clod, a stone, and gold are the same; the same to dear and undear, firm, the same in blame and praise of self.",
    },
    "14.25": {
        "meaning_ne": "मान-अपमानमा तुल्य, मित्र-अरि पक्षमा तुल्य, सर्वारम्भ परित्यागी — गुणातीत भनिन्छ।",
        "meaning_en": "The same in honour and dishonour, the same toward the parties of friend and foe, abandoning all undertakings — he is called one beyond the gunas.",
    },
    "14.26": {
        "meaning_ne": "अव्यभिचार भक्तियोगले मलाई सेवन गर्ने यी गुण समतीत्य ब्रह्मभूयका लागि कल्पित हुन्छ।",
        "meaning_en": "And who serves me with the yoga of bhakti, unswerving, having crossed these gunas, is fit for becoming Brahman.",
    },
    "14.27": {
        "meaning_ne": "ब्रह्मको प्रतिष्ठा म हुँ, अव्यय अमृतको, शाश्वत धर्मको, एकान्तिक सुखको पनि।",
        "meaning_en": "For I am the standing-place of Brahman, of the deathless and unchanging, of everlasting dharma, and of the joy that is one-pointed.",
    },
}

CH15 = {
    "15.1": {
        "meaning_ne": "श्रीभगवान्ले भने: ऊर्ध्वमूल अधःशाख अव्यय अश्वत्थ भन्छन्; जसका पर्ण छन्द हुन् — त्यो जान्ने वेदवित् हो।",
        "meaning_en": "The Blessed Lord said: They speak of an unchanging asvattha, roots above, branches below, whose leaves are the metres. Who knows it is a knower of the Veda.",
    },
    "15.2": {
        "meaning_ne": "यसका शाखा अध र ऊर्ध्व प्रसृत, गुणप्रवृद्ध, विषयप्रवाल; मनुष्यलोकमा कर्मानुबन्धी मूलहरू पनि अध अनुसन्तत।",
        "meaning_en": "Its branches spread below and above, grown by the gunas, with sense-objects as twigs. Roots also stretch below, binding to action, in the world of men.",
    },
    "15.3": {
        "meaning_ne": "यसको रूप यहाँ त्यस्तो पाइँदैन — न अन्त, न आदि, न सम्प्रतिष्ठा; सुविरूढमूल यो अश्वत्थ दृढ असङ्गशस्त्रले छेदन गरेर।",
        "meaning_en": "Its form is not found thus here — not the end, nor the beginning, nor the standing-ground. Having cut this asvattha, with roots well grown, with the firm weapon of non-clinging.",
    },
    "15.4": {
        "meaning_ne": "त्यसपछि त्यो पद खोज्नु, जहाँ गएर फेरि फर्कँदैनन्; «जसबाट पुराणी प्रवृत्ति प्रसृत, त्यही आद्य पुरुषमा शरण पर्छु।»",
        "meaning_en": "Then that place is to be sought, gone to which they do not return again: \"I take refuge in that first Person himself, from whom the ancient going-forth has spread.\"",
    },
    "15.5": {
        "meaning_ne": "निर्मान-मोह, जितसङ्गदोष, अध्यात्मनित्य, विनिवृत्तकाम, सुख-दुःखसंज्ञ द्वन्द्वबाट विमुक्त अमूढ त्यो अव्यय पद जान्छन्।",
        "meaning_en": "Without pride or delusion, the faults of clinging conquered, constant in the inner self, desires turned back, freed from the pairs named pleasure and pain, undeluded, they go to that unchanging place.",
    },
    "15.6": {
        "meaning_ne": "त्यहाँ सूर्य भास्दैन, शशाङ्क होइन, पावक होइन; गएर नफर्किने — त्यो मेरो परम धाम।",
        "meaning_en": "The sun does not light that, nor the moon, nor fire. Going to which they do not return — that is my highest abode.",
    },
    "15.7": {
        "meaning_ne": "जीवलोकमा सनातन जीवभूत मेरो अंश नै; प्रकृतिस्थ मनषष्ठ इन्द्रिय कर्षण गर्छ।",
        "meaning_en": "An eternal portion of me alone has become a living being in the world of the living. It draws the senses, with the mind as sixth, that stand in prakriti.",
    },
    "15.8": {
        "meaning_ne": "ईश्वर जुन शरीर पाउँछ, जुनबाट उत्क्रामण गर्छ — यी लिएर जान्छ, आशयबाट गन्ध वायुले जस्तै।",
        "meaning_en": "When the lord takes on a body, and when he goes forth from it, he goes taking these, as the wind takes scents from their seat.",
    },
    "15.9": {
        "meaning_ne": "श्रोत्र, चक्षु, स्पर्शन, रसन, घ्राण र मन अधिष्ठित गरी यो विषय सेवन गर्छ।",
        "meaning_en": "Presiding over ear, eye, touch, taste, and smell, and the mind, this one consorts with the objects.",
    },
    "15.10": {
        "meaning_ne": "उत्क्रामण गर्दा, स्थित, भुञ्जान, गुणान्वित — विमूढ देख्दैनन्; ज्ञानचक्षुवालाले देख्छन्।",
        "meaning_en": "The deluded do not see him going forth or standing or enjoying, endowed with the gunas. Those of the eye of knowledge see.",
    },
    "15.11": {
        "meaning_ne": "यत्न गर्ने योगीहरू आत्मामा अवस्थित यसलाई देख्छन्; अकृतात्मा अचेतस् यत्न गर्दा पनि देख्दैनन्।",
        "meaning_en": "Yogins who strive see him standing in the self. The unmade selves, without sense, do not see him, though they strive.",
    },
    "15.12": {
        "meaning_ne": "आदित्यगत तेजले अखिल जगत् भास्छ, चन्द्रमामा र अग्निमा जुन तेज — त्यो मेरो तेज जान।",
        "meaning_en": "The brilliance that has gone to the sun and lights the whole world, and that in the moon and in fire — know that brilliance as mine.",
    },
    "15.13": {
        "meaning_ne": "गौमा पसी ओजले भूतहरू धारण गर्छु; रसात्मक सोम भई सबै औषधि पुष्ट पार्छु।",
        "meaning_en": "Entering the earth, I support beings with energy; and becoming soma, whose nature is sap, I nourish all herbs.",
    },
    "15.14": {
        "meaning_ne": "प्राणीहरूको देहमा आश्रित वैश्वानर भई प्राणापानयुक्त चारथरी अन्न पच्दछु।",
        "meaning_en": "Becoming Vaishvanara, dwelling in the body of living things, joined with the out-breath and in-breath, I cook the fourfold food.",
    },
    "15.15": {
        "meaning_ne": "सबैको हृदयमा म सन्निविष्ट; मबाट स्मृति, ज्ञान, अपोहन; सबै वेदले वेद्य म, वेदान्तकृत् र वेदवित् म।",
        "meaning_en": "And I am seated in the heart of all. From me memory, knowledge, and their taking-away. I alone am to be known by all the Vedas; I am the maker of Vedanta and the knower of the Veda.",
    },
    "15.16": {
        "meaning_ne": "लोकमा यी दुई पुरुष — क्षर र अक्षर; क्षर सबै भूत, कूटस्थलाई अक्षर भनिन्छ।",
        "meaning_en": "There are these two persons in the world, the perishable and the imperishable. The perishable is all beings; the unchanging is called the Imperishable.",
    },
    "15.17": {
        "meaning_ne": "तर उत्तम पुरुष अर्कै, परमात्मा उदाहृत; लोकत्रयमा पसी बिभर्ने अव्यय ईश्वर।",
        "meaning_en": "But other is the highest Person, called the highest Self — the unchanging Lord who, entering the three worlds, supports them.",
    },
    "15.18": {
        "meaning_ne": "क्षरभन्दा अतीत र अक्षरभन्दा पनि उत्तम भएकाले लोक र वेदमा पुरुषोत्तम प्रथित छु।",
        "meaning_en": "Because I am beyond the perishable and higher even than the Imperishable, therefore I am celebrated in the world and in the Veda as the highest Person.",
    },
    "15.19": {
        "meaning_ne": "असम्मूढ यसरी मलाई पुरुषोत्तम जान्ने सर्ववित् सबै भावले मलाई भज्छ, हे भारत।",
        "meaning_en": "Who, undeluded, knows me thus as the highest Person, the all-knower worships me with his whole being, O Bharata.",
    },
    "15.20": {
        "meaning_ne": "हे अनघ, यो गुह्यतम शास्त्र मैले भनें; यो बुझेर बुद्धिमान् हुन्छ र कृतकृत्य, हे भारत।",
        "meaning_en": "This most secret teaching has been told by me, O sinless one. Knowing this, one would be insightful, and have done what was to be done, O Bharata.",
    },
}

CHAPTERS = {13: CH13, 14: CH14, 15: CH15}


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
