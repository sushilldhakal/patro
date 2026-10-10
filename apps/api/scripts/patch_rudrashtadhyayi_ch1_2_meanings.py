#!/usr/bin/env python3
"""Fill chapter-1 (मङ्गलाचरणम्) and chapter-2 (Ganapati + Shiva Sankalpa)
meaning_en / meaning_ne on data/documents_source/rudrashtadhyayi.json.

Chapter 1 is the standard classical Ganesha-vandana verse plus the
widely-used "Dhyayennityam Mahesham" Shiva dhyana shloka that opens most
Rudra recitations. Chapter 2 opens with the Rigvedic Ganapati-invocation
verse (RV 2.23.1, "Gananam tva Ganapatim havamahe" — also the opening of
Ganapati Atharvashirsha), a short chandas (meter)-naming passage, and the
Shiva Sankalpa Suktam (Shukla Yajurveda 34.1-6), one of the most
widely-published Vedic hymns. All translated directly from this
manifest's own Sanskrit.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

MEANINGS = {
    "1.1": {
        "meaning_ne": "सिद्धि प्रदान गर्नुहुने देव गणेश, प्रिय संरक्षकलाई नमस्कार; विश्वको गर्भस्वरूप, विघ्नहरूका स्वामीलाई नमस्कार — अनादि, मङ्गलमय र सर्वव्यापीलाई नमस्कार।",
        "meaning_en": "I bow to Ganesha, the God who bestows success, the beloved protector — the womb of the universe, the Lord of obstacles — beginningless, auspicious, and all-pervading.",
    },
    "1.2": {
        "meaning_ne": "अब ध्यानश्लोक: सधैं महेशको ध्यान गर्नुपर्छ — जो रजतगिरि (चाँदीको पर्वत) जस्तै देदीप्यमान हुनुहुन्छ, सुन्दर चन्द्रमाले सुशोभित हुनुहुन्छ, रत्नाभूषणले चम्किलो अङ्गयुक्त हुनुहुन्छ, हातमा फर्सी, मृग, वरमुद्रा र अभयमुद्रा धारण गर्नुहुन्छ, सधैं प्रसन्न हुनुहुन्छ।",
        "meaning_en": "Now the meditation-verse: One should ever meditate upon Mahesha (the Great Lord), resplendent like a silver mountain, beautifully crowned with the moon, His limbs radiant with jeweled ornaments, holding in his hands the axe, the deer, and the gestures of boon-granting and fearlessness, ever gracious.",
    },
    "1.3": {
        "meaning_ne": "पद्मासनमा विराजमान, चारैतिर देवगणहरूद्वारा स्तुति गरिएका, बाघको छाला धारण गर्नुहुने, विश्वका आदि स्रोत, सम्पूर्ण लोकद्वारा वन्दनीय, सम्पूर्ण भयको नाश गर्नुहुने, पञ्चमुखी र त्रिनेत्रधारी।",
        "meaning_en": "Seated on a lotus, praised on every side by hosts of immortals, clad in a tiger skin, the primeval source of the universe, worthy of worship by all the worlds, the destroyer of every fear, five-faced and three-eyed.",
    },
    "2.1": {
        "meaning_ne": "हरि ॐ! हे गणपति, गणहरूमाझका स्वामी, हामी तपाईंलाई आह्वान गर्दछौं। हे प्रियपति, प्रियजनहरूमाझका स्वामी, हामी तपाईंलाई आह्वान गर्दछौं। हे निधिपति, निधिहरूमाझका स्वामी, हे वसु, मेरा आफ्नै, हामी तपाईंलाई आह्वान गर्दछौं। म तपाईंलाई सृष्टिको स्रोतको रूपमा चिनूँ, र तपाईं आफैं त्यही स्रोतको रूपमा प्रकट हुनुहोस्।",
        "meaning_en": "Hari Om! We invoke You, Ganapati, the Lord among the celestial hosts. We invoke You, Priyapati, the Lord among the beloved. We invoke You, Nidhipati, the Lord among treasures, O Vasu, my very own. May I recognize You as the source of all creation, and may You reveal Yourself as that very source.",
    },
    "2.2": {
        "meaning_ne": "गायत्री, त्रिष्टुभ्, जगती, अनुष्टुभ् पङ्क्तिसहित, तथा बृहती, उष्णिहा, ककुप् — यी छन्दहरूले आफ्ना सूचीहरूद्वारा तिमीलाई शान्ति प्रदान गरून्।",
        "meaning_en": "May Gayatri, Trishtubh, Jagati, Anushtubh, along with Pankti, Brihati, Ushnih, and Kakup — through their sacred threads — grant you peace.",
    },
    "2.3": {
        "meaning_ne": "द्विपद, चतुष्पद, त्रिपद र षट्पद छन्दहरू, तथा विशेष छन्द नभएका र सुनिश्चित छन्द भएका सबैले आफ्ना सूचीहरूद्वारा तिमीलाई शान्ति प्रदान गरून्।",
        "meaning_en": "May the two-footed, four-footed, three-footed, and six-footed meters, and those without regular meter as well as those with proper meter — through their sacred threads — grant you peace.",
    },
    "2.4": {
        "meaning_ne": "स्तोम (स्तुति), छन्द र सत्यमापनसहित सप्त दिव्य ऋषिहरूले पूर्वजहरूको मार्ग देखेर, ती धीर ऋषिहरूले त्यसलाई समाते, जसरी सारथिले लगामलाई समात्छ।",
        "meaning_en": "The seven divine sages, together with the sacred hymns of praise, the meters, and the true measures, beholding the path of those who came before, the wise ones seized it, as charioteers seize the reins.",
    },
    "2.5": {
        "meaning_ne": "जुन दिव्य मन जागा हुँदा टाढा-टाढा पुग्छ, र सुतेको बेला पनि त्यत्तिकै टाढा पुग्छ — त्यो टाढासम्म जाने, ज्योतिहरूमध्ये एक ज्योति — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "That divine mind which travels far away when one is awake, and travels just as far when one is asleep — that far-going one, the single light among lights — may that mind of mine be of auspicious resolve.",
    },
    "2.6": {
        "meaning_ne": "जुनद्वारा कर्ममा कुशल बुद्धिमानहरूले यज्ञमा आफ्ना कर्म गर्छन्, र सभाहरूमा धीरहरूले पनि गर्छन् — सम्पूर्ण प्राणीहरूभित्र रहेको त्यो अपूर्व रहस्य — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "That by which the wise, skilled in action, perform their works in the sacrifice, and the resolute in the assemblies — the unprecedented mystery dwelling within all beings — may that mind of mine be of auspicious resolve.",
    },
    "2.7": {
        "meaning_ne": "जुन प्रज्ञान, चेत र धृति हो, र सबै प्राणीभित्र रहेको अमृत ज्योति हो — जसबिना कुनै पनि कर्म हुनै सक्दैन — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "That which is wisdom, consciousness, and steadfastness, the immortal light within all beings — without which no action at all can be performed — may that mind of mine be of auspicious resolve.",
    },
    "2.8": {
        "meaning_ne": "जुनद्वारा यो भूत, वर्तमान र भविष्य सम्पूर्ण संसार अमृतले व्याप्त छ, र जुनद्वारा सप्त होताको यज्ञ सम्पन्न हुन्छ — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "By which this entire world — past, present and future — is wholly pervaded by the immortal, and by which the sacrifice with its seven priests is carried forward — may that mind of mine be of auspicious resolve.",
    },
    "2.9": {
        "meaning_ne": "जसमा ऋक्, साम र यजुः स्थापित छन्, जसरी रथको नाभिमा दाँतीहरू जोडिएका हुन्छन्, र जसमा सम्पूर्ण प्राणीहरूको चित्त उनिएको छ — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "In which the verses of Rig, Sama, and Yajur are fixed, as spokes are fixed in the hub of a chariot wheel, and in which the consciousness of all beings is woven together — may that mind of mine be of auspicious resolve.",
    },
    "2.10": {
        "meaning_ne": "जुनले, कुशल सारथिले घोडालाई लगामले डोऱ्याए जस्तै, मानिसहरूलाई डोऱ्याउँछ; जुन हृदयमा प्रतिष्ठित छ, सधैं गतिशील छ, र सबैभन्दा वेगवान् छ — त्यो मेरो मन शुभ सङ्कल्पयुक्त होस्।",
        "meaning_en": "That which, like a skilled charioteer with the reins, guides men just as one guides swift horses; that which is enthroned in the heart, ever-moving, and swiftest of all — may that mind of mine be of auspicious resolve.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    filled = 0
    missing = []
    for chnum in (1, 2):
        chapter = next(c for c in data["chapters"] if c["number"] == chnum)
        for shloka in chapter["shlokas"]:
            extra = MEANINGS.get(shloka["verse_label"])
            if extra is None:
                missing.append(shloka["verse_label"])
                continue
            shloka["meaning_ne"] = extra["meaning_ne"]
            shloka["meaning_en"] = extra["meaning_en"]
            filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-1/2 meanings in {OUT}")


if __name__ == "__main__":
    main()
