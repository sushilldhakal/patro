#!/usr/bin/env python3
"""Fill chapter-1 meaning_en / meaning_ne on data/documents_source/bhagavad-gita.json.

English and Nepali glosses follow this recension's 1.1–1.47 Sanskrit
(not a copyrighted published translation). Combined groups in some
editions (1.21–22, 1.32–35, 1.37–38) are split to match our verse rows.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

CH1 = {
    "1.1": {
        "meaning_ne": "धृतराष्ट्रले भने: हे सञ्जय, धर्मभूमि कुरुक्षेत्रमा युद्धको इच्छाले जम्मा भएका मेरा र पाण्डुका पुत्रहरूले के गरे?",
        "meaning_en": "Dhritarashtra said: O Sanjaya, assembled on the sacred field of Kurukshetra, eager for battle, what did my sons and the sons of Pandu do?",
    },
    "1.2": {
        "meaning_ne": "सञ्जयले भने: पाण्डवहरूको व्यूहबद्ध सेना देखेर राजा दुर्योधन आचार्य (द्रोण) कहाँ गएर यसो भने।",
        "meaning_en": "Sanjaya said: Seeing the Pandava army drawn up in array, King Duryodhana approached his teacher and spoke these words.",
    },
    "1.3": {
        "meaning_ne": "हे आचार्य, तपाईंका बुद्धिमान् शिष्य द्रुपदपुत्रले व्यूह रचेको पाण्डुपुत्रहरूको विशाल सेना हेर्नुहोस्।",
        "meaning_en": "O teacher, behold this great army of the sons of Pandu, arrayed by your own gifted disciple, the son of Drupada.",
    },
    "1.4": {
        "meaning_ne": "यस सेनामा भीम र अर्जुनसमान वीर धनुर्धरहरू छन् — युयुधान, विराट र महारथी द्रुपद।",
        "meaning_en": "Here are heroes, mighty archers equal to Bhima and Arjuna in battle — Yuyudhana, Virata, and the great warrior Drupada.",
    },
    "1.5": {
        "meaning_ne": "धृष्टकेतु, चेकितान, वीर्यवान् काशिराज, पुरुजित्, कुन्तिभोज र नरश्रेष्ठ शैब्य पनि छन्।",
        "meaning_en": "There are also Dhrishtaketu, Chekitana, the valiant king of Kashi, Purujit, Kuntibhoja, and Shaibya, foremost among men.",
    },
    "1.6": {
        "meaning_ne": "विक्रमी युधामन्यु, वीर्यवान् उत्तमौजा, सुभद्राका पुत्र र द्रौपदीका पुत्रहरू — यी सबै महारथी हुन्।",
        "meaning_en": "The mighty Yudhamanyu, powerful Uttamaujas, the son of Subhadra, and the sons of Draupadi — all of them are great chariot-warriors.",
    },
    "1.7": {
        "meaning_ne": "हे द्विजोत्तम, हाम्रा तर्फ विशेष योग्य जो छन्, मेरो सेनाका नायकहरू, चिन्नलाई म तपाईंलाई भन्दछु।",
        "meaning_en": "Hear also, O best of brahmanas, those on our side who are distinguished. I name the captains of my army so you may know them.",
    },
    "1.8": {
        "meaning_ne": "तपाईं स्वयं, भीष्म, कर्ण, युद्धजयी कृप, अश्वत्थामा, विकर्ण र सौमदत्ति पनि छन्।",
        "meaning_en": "Yourself, Bhishma, Karna, Kripa ever-victorious in assembly, Ashvatthama, Vikarna, and the son of Somadatta as well.",
    },
    "1.9": {
        "meaning_ne": "मेरो निम्ति जीवन त्याग्न तयार अरू धेरै शूरहरू छन्, नाना शस्त्र लिएका, सबै युद्धमा निपुण।",
        "meaning_en": "And many other heroes have given up their lives for my sake, armed with many weapons, all skilled in war.",
    },
    "1.10": {
        "meaning_ne": "भीष्मले रक्षा गरेको हाम्रो बल अपर्याप्त छैन; भीमले रक्षा गरेको यिनको बल चाहिँ सीमित छ।",
        "meaning_en": "Our force, guarded by Bhishma, is more than enough; their force, guarded by Bhima, is limited.",
    },
    "1.11": {
        "meaning_ne": "अब सबै आ-आफ्नो स्थानमा रहेर भीष्मको नै रक्षा गर्नुहोस्।",
        "meaning_en": "So all of you, stationed in your own places in the ranks, must guard Bhishma above all.",
    },
    "1.12": {
        "meaning_ne": "कुरुवृद्ध पितामह भीष्मले उनलाई हर्षित पार्दै सिंहनाद गर्दै जोडले शङ्ख फुके।",
        "meaning_en": "Then the aged grandsire of the Kurus, the valiant grandfather, roared like a lion and blew his conch, filling Duryodhana with joy.",
    },
    "1.13": {
        "meaning_ne": "त्यसपछि शङ्ख, भेरी, ढोल र गोमुख एकसाथ बज्न थाले; त्यो शब्द तुमुल भयो।",
        "meaning_en": "Then conches, kettledrums, tabors, drums and horns were sounded all at once, and the noise became a tumult.",
    },
    "1.14": {
        "meaning_ne": "अर्कोतर्फ सेतो घोडा जोतेको ठूलो रथमा बसेका माधव र पाण्डवले दिव्य शङ्ख फुके।",
        "meaning_en": "Then Madhava and the son of Pandu, standing in a great chariot yoked with white horses, blew their divine conches.",
    },
    "1.15": {
        "meaning_ne": "हृषीकेशले पाञ्चजन्य, धनञ्जयले देवदत्त, र भीमकर्मा वृकोदरले महान् पौण्ड्र शङ्ख फुके।",
        "meaning_en": "Hrishikesha blew Panchajanya, Dhananjaya blew Devadatta, and Bhima of terrible deeds, the wolf-bellied, blew the great conch Paundra.",
    },
    "1.16": {
        "meaning_ne": "कुन्तीपुत्र राजा युधिष्ठिरले अनन्तविजय, नकुल र सहदेवले सुघोष र मणिपुष्पक फुके।",
        "meaning_en": "King Yudhishthira, son of Kunti, blew Anantavijaya; Nakula and Sahadeva blew Sughosha and Manipushpaka.",
    },
    "1.17": {
        "meaning_ne": "काशीका श्रेष्ठ धनुर्धर, महारथी शिखण्डी, धृष्टद्युम्न, विराट र अपराजित सात्यकि;",
        "meaning_en": "The king of Kashi, supreme among archers, the great warrior Shikhandi, Dhrishtadyumna, Virata, and unconquered Satyaki;",
    },
    "1.18": {
        "meaning_ne": "हे पृथ्वीपते, द्रुपद, द्रौपदीका पुत्रहरू र महाबाहु सौभद्रले आ-आफ्नो शङ्ख छुट्टै फुके।",
        "meaning_en": "O lord of the earth, Drupada, the sons of Draupadi, and the mighty-armed son of Subhadra each blew their own conches.",
    },
    "1.19": {
        "meaning_ne": "त्यो घोषले धार्तराष्ट्रहरूका हृदय चिर्यो; आकाश र पृथ्वीमा तुमुल प्रतिध्वनि फैलियो।",
        "meaning_en": "That sound tore the hearts of Dhritarashtra's sons, and the tumult echoed through sky and earth.",
    },
    "1.20": {
        "meaning_ne": "शस्त्रपात सुरु हुन लाग्दा कपिध्वज पाण्डवले व्यूहमा उभिएका धार्तराष्ट्रहरू देखेर धनु उठाए।",
        "meaning_en": "Then, seeing Dhritarashtra's men arrayed as the clash of weapons began, the Pandava whose banner was the monkey raised his bow.",
    },
    "1.21": {
        "meaning_ne": "अर्जुनले भने: हे महीपते, त्यस बेला हृषीकेशलाई यसो भने — हे अच्युत, दुवै सेनाको बीचमा मेरो रथ राखिदिनुहोस्।",
        "meaning_en": "Arjuna said: O king, he then spoke this to Hrishikesha — O Achyuta, place my chariot between the two armies.",
    },
    "1.22": {
        "meaning_ne": "योद्धु चाहने यी उभिएकाहरूलाई मैले हेर्न सकूँ, र यस रणमा मसँग को-को लड्नुपर्छ भनेर जानूँ।",
        "meaning_en": "So that I may look upon these who stand here longing to fight, and see with whom I must contend in this rising battle.",
    },
    "1.23": {
        "meaning_ne": "दुर्बुद्धि धार्तराष्ट्रलाई युद्धमा प्रसन्न तुल्याउन यहाँ आएका यी लड्न आउनेहरूलाई म हेर्न चाहन्छु।",
        "meaning_en": "I would look upon those who have gathered here to fight, wishing to please the ill-minded son of Dhritarashtra in war.",
    },
    "1.24": {
        "meaning_ne": "सञ्जयले भने: हे भारत, गुडाकेशले यसो भनेपछि हृषीकेशले दुवै सेनाको बीचमा उत्तम रथ राखिदिए।",
        "meaning_en": "Sanjaya said: O Bharata, thus addressed by Gudakesha, Hrishikesha drew up the excellent chariot between the two armies.",
    },
    "1.25": {
        "meaning_ne": "भीष्म, द्रोण र सबै भूमिपतिहरूका सामुन्ने उनले भने: हे पार्थ, जम्मा भएका यी कुरुहरूलाई हेर।",
        "meaning_en": "Before Bhishma, Drona, and all the chiefs of the earth he said: O Partha, behold these Kurus assembled here.",
    },
    "1.26": {
        "meaning_ne": "त्यहाँ पार्थले पिता, पितामह, आचार्य, मामा, भाइ, छोरा, नाति र सखाहरू उभिएको देखे।",
        "meaning_en": "There Partha saw standing fathers, grandfathers, teachers, maternal uncles, brothers, sons, grandsons, and companions.",
    },
    "1.27": {
        "meaning_ne": "दुवै सेनामा ससुरा र सुहृद्हरू पनि। ती सबै बन्धु उभिएको देखेर कौन्तेयले...",
        "meaning_en": "Fathers-in-law and dear friends too, in both armies. Seeing all those kinsmen standing there, the son of Kunti...",
    },
    "1.28": {
        "meaning_ne": "अर्जुनले भने: गहिरो करुणाले ग्रस्त भई विषाद गर्दै यसो भने — हे कृष्ण, लड्न उभिएका आफन्त देखेर।",
        "meaning_en": "Arjuna said, overcome with deep pity, sinking in grief: Krishna, seeing my own people standing here eager to fight,",
    },
    "1.29": {
        "meaning_ne": "मेरा अङ्ग शिथिल हुँदैछन्, मुख सुक्दैछ; शरीर काम्दैछ, रौं ठाडो हुँदैछ।",
        "meaning_en": "My limbs give way, my mouth is dry; my body trembles, and my hair stands on end.",
    },
    "1.30": {
        "meaning_ne": "गाण्डीव हातबाट खस्दैछ, छाला पोल्दैछ; म उभिन सक्तैनँ, मन भ्रमिरहेको छ।",
        "meaning_en": "Gandiva slips from my hand, my skin burns; I cannot stand, and my mind seems to whirl.",
    },
    "1.31": {
        "meaning_ne": "हे केशव, म उल्टा निमित्त मात्र देख्छु। आफन्त मारेर युद्धमा कुनै श्रेय देख्दिनँ।",
        "meaning_en": "I see omens of ill, O Keshava, and I see no good in killing my own people in battle.",
    },
    "1.32": {
        "meaning_ne": "हे कृष्ण, म विजय, राज्य वा सुख चाहन्नँ। हे गोविन्द, राज्य, भोग वा जीवनले हामीलाई के लाभ?",
        "meaning_en": "I desire no victory, Krishna, nor kingdom, nor pleasures. O Govinda, of what use to us is kingdom, or enjoyments, or life itself?",
    },
    "1.33": {
        "meaning_ne": "जसका लागि हामी राज्य, भोग र सुख चाहन्थ्यौं, ती नै प्राण र धन त्यागेर युद्धमा उभिएका छन्।",
        "meaning_en": "Those for whose sake we wanted kingdom, enjoyments and happiness now stand here in battle, having given up life and wealth.",
    },
    "1.34": {
        "meaning_ne": "आचार्य, पिता, पुत्र, पितामह, मामा, ससुरा, नाति, ज्वाइँ र अन्य नातादारहरू।",
        "meaning_en": "Teachers, fathers, sons, and grandfathers as well; maternal uncles, fathers-in-law, grandsons, brothers-in-law and kinsmen.",
    },
    "1.35": {
        "meaning_ne": "हे मधुसूदन, यिनीहरू मलाई मारुन् भने पनि म मार्न चाहन्नँ — तीन लोकको राज्यका लागि पनि, यो पृथ्वी त के कुरा।",
        "meaning_en": "These I do not wish to kill, O Madhusudana, even if they kill me — not for the kingship of the three worlds, still less for the earth.",
    },
    "1.36": {
        "meaning_ne": "हे जनार्दन, धार्तराष्ट्रहरू मारेर हामीलाई के प्रीति? यस्ता आततायी मारेर पाप नै हामीमा लाग्छ।",
        "meaning_en": "What joy should we have, O Janardana, in slaying the sons of Dhritarashtra? Sin alone would come upon us if we killed these aggressors.",
    },
    "1.37": {
        "meaning_ne": "तसर्थ आफ्ना बन्धु धार्तराष्ट्रहरूलाई हामी मार्न योग्य छैनौं। हे माधव, स्वजन मारेर हामी कसरी सुखी होऔं?",
        "meaning_en": "Therefore we ought not to kill the sons of Dhritarashtra, our own kin. How could we be happy, O Madhava, having killed our own people?",
    },
    "1.38": {
        "meaning_ne": "यिनीहरू लोभले ग्रस्त भई कुलक्षयको दोष र मित्रद्रोहको पाप देख्दैनन्।",
        "meaning_en": "Even if these, their minds stolen by greed, see no fault in destroying the family or in treachery to friends,",
    },
    "1.39": {
        "meaning_ne": "हे जनार्दन, कुलक्षयको दोष देख्ने हामीले यस पापबाट किन नहट्ने?",
        "meaning_en": "Why should we not know to turn back from this sin, O Janardana, we who see the wrong in destroying the family?",
    },
    "1.40": {
        "meaning_ne": "कुल नाश हुँदा सनातन कुलधर्म नाश हुन्छन्; धर्म नष्ट भएपछि सम्पूर्ण कुलमा अधर्म छाउँछ।",
        "meaning_en": "When the family is destroyed, the ancient family dharmas perish; when dharma is lost, adharma overruns the whole house.",
    },
    "1.41": {
        "meaning_ne": "हे कृष्ण, अधर्म बढेपछि कुलकी स्त्रीहरू दूषित हुन्छन्; हे वार्ष्णेय, स्त्री दूषित भए वर्णसङ्कर जन्मन्छ।",
        "meaning_en": "From the rise of adharma, Krishna, the women of the family are corrupted; when women are corrupted, O Vrishni, mixed caste is born.",
    },
    "1.42": {
        "meaning_ne": "सङ्कर कुलघाती र कुल दुवैलाई नरकतिर लैजान्छ; पिण्ड-उदक क्रिया लुप्त भएर पितृहरू खस्छन्।",
        "meaning_en": "Mixture leads only to hell for the family-destroyers and for the family; the fathers fall, deprived of the offerings of rice-ball and water.",
    },
    "1.43": {
        "meaning_ne": "कुलघातीहरूका यिनै दोषले वर्णसङ्कर जन्माउँदा शाश्वत जातिधर्म र कुलधर्म उच्छेद हुन्छन्।",
        "meaning_en": "By these misdeeds of those who destroy the family, causing mixture of varnas, the everlasting duties of caste and family are wiped out.",
    },
    "1.44": {
        "meaning_ne": "हे जनार्दन, कुलधर्म नष्ट भएका मानिसहरूको नरकमा सधैं वास हुन्छ भनी हामीले सुनेका छौं।",
        "meaning_en": "We have heard, O Janardana, that those whose family dharmas have been destroyed dwell inevitably in hell.",
    },
    "1.45": {
        "meaning_ne": "अहो, राज्यसुखको लोभले आफन्त मार्न उभिएका हामी कत्रो महान् पाप गर्न लागेका छौं।",
        "meaning_en": "Alas — we have set ourselves to do a great sin, ready to kill our own people out of greed for the joy of kingship.",
    },
    "1.46": {
        "meaning_ne": "यदि शस्त्रधारी धार्तराष्ट्रहरूले मलाई निःशस्त्र र अप्रतिकार अवस्थामा युद्धमा मार्छन् भने त्यो मेरो लागि श्रेयस्कर हुनेछ।",
        "meaning_en": "If the armed sons of Dhritarashtra should kill me in battle, unarmed and unresisting, that would be better for me.",
    },
    "1.47": {
        "meaning_ne": "सञ्जयले भने: यसो भनेर अर्जुन युद्धभूमिमा रथको आसनमा बसे, धनु-बाण छाडेर, शोकले व्याकुल मन लिएर।",
        "meaning_en": "Sanjaya said: Having spoken thus on the field, Arjuna sat down on the chariot-seat, laying aside bow and arrows, his mind shaken by grief.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 1)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH1.get(shloka["verse_label"])
        if extra is None:
            if shloka["verse_label"].startswith("इति"):
                continue
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-1 meanings in {OUT}")


if __name__ == "__main__":
    main()
