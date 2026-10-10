#!/usr/bin/env python3
"""Fill chapter-3 (Purusha Suktam) meaning_en / meaning_ne on
data/documents_source/rudrashtadhyayi.json.

The Purusha Sukta (RV 10.90, with its standard liturgical appendix
verses 3.17-3.22 from the Narayana/Sri Sukta tradition) is one of the
most widely published Vedic hymns; this follows the standard,
well-established rendering (in the vein of Griffith's Rig Veda),
translated directly against this manifest's own Sanskrit. High
confidence throughout.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH3 = {
    "3.1": {
        "meaning_ne": "पुरुष (विराट पुरुष) सहस्रशिरयुक्त, सहस्रनेत्रयुक्त र सहस्रपादयुक्त हुनुहुन्छ। उहाँले पृथ्वीलाई सबैतिरबाट व्याप्त गरेर पनि दश औंलाभन्दा बढी परसम्म फैलिनुभयो।",
        "meaning_en": "The Purusha (Cosmic Being) has a thousand heads, a thousand eyes, a thousand feet. Pervading the earth on every side, he extended beyond it by ten fingers' breadth.",
    },
    "3.2": {
        "meaning_ne": "पुरुष नै यो सबै हो — जे भइसकेको छ र जे हुने छ। उहाँ अमरत्वका ईश्वर पनि हुनुहुन्छ, किनकि अन्न (सृष्टि)द्वारा उहाँ माथि उठ्नुहुन्छ।",
        "meaning_en": "Purusha alone is all this — whatever has been and whatever is yet to be. He is also the ruler of immortality, since he transcends all through the created world of nourishment.",
    },
    "3.3": {
        "meaning_ne": "यति उहाँको महिमा छ, तर पुरुष यसभन्दा पनि महान् हुनुहुन्छ। उहाँको एक चौथाइ भाग सम्पूर्ण प्राणी हुन्, र तीन चौथाइ अमर भाग स्वर्गमा छ।",
        "meaning_en": "Such is his greatness, yet Purusha is even greater than this. One quarter of him is all beings; three-quarters, immortal, are in heaven.",
    },
    "3.4": {
        "meaning_ne": "तीन चौथाइले पुरुष माथि उठ्नुभयो; उहाँको एक चौथाइ भाग यहाँ पुनः बन्यो। त्यसपछि उहाँ चारैतिर फैलिनुभयो, खाने र नखाने दुवैतिर।",
        "meaning_en": "With three-quarters, Purusha rose upward; one-quarter of him came to be here again. From that he spread out in all directions, into that which eats and that which does not eat.",
    },
    "3.5": {
        "meaning_ne": "त्यसबाट विराट उत्पन्न भयो, र विराटबाट पुरुष पुनः उत्पन्न भयो। जन्मेपछि उहाँ पृथ्वीभन्दा पर, अगाडि र पछाडि दुवैतिर फैलिनुभयो।",
        "meaning_en": "From him Viraj (the manifest cosmic form) was born; from Viraj, Purusha again. Once born, he extended beyond the earth, both behind and before.",
    },
    "3.6": {
        "meaning_ne": "त्यो सम्पूर्ण अर्पित यज्ञबाट दहीमिश्रित घ्यू सङ्कलन भयो। त्यसबाट उहाँले हावाका, वनका र गाउँका पशुहरू सृष्टि गर्नुभयो।",
        "meaning_en": "From that sacrifice, wholly offered, the sprinkled ghee was gathered. From it he made the creatures of the air, the creatures of the forest, and those of the village.",
    },
    "3.7": {
        "meaning_ne": "त्यो सम्पूर्ण अर्पित यज्ञबाट ऋक् र साम मन्त्रहरू उत्पन्न भए। त्यसबाट छन्दहरू उत्पन्न भए, र त्यसबाटै यजुः उत्पन्न भयो।",
        "meaning_en": "From that sacrifice, wholly offered, the Rig and Sama verses were born; from it the meters were born; from it the Yajus was born.",
    },
    "3.8": {
        "meaning_ne": "त्यसबाट घोडाहरू उत्पन्न भए, र दुवै जबडामा दाँत भएका जनावरहरू पनि। त्यसबाट गाईहरू उत्पन्न भए, र त्यसैबाट बाख्रा र भेडाहरू उत्पन्न भए।",
        "meaning_en": "From it the horses were born, and whatever animals have teeth in both jaws; from it cattle were born; from it goats and sheep were born.",
    },
    "3.9": {
        "meaning_ne": "सुरुमा जन्मेको त्यो पुरुषलाई देवताहरूले कुशासनमा यज्ञका रूपमा सिञ्चन गरे। उहाँद्वारा नै देवता, साध्य र ऋषिहरूले यज्ञ सम्पन्न गरे।",
        "meaning_en": "That Purusha, born in the beginning, they sprinkled as the sacrifice upon the sacred grass. With him the gods performed the sacrifice, and the Sadhyas and the sages.",
    },
    "3.10": {
        "meaning_ne": "जब उनीहरूले पुरुषलाई विभाजन गरे, कतिवटा भागमा उहाँलाई विभक्त गरे? उहाँको मुख के भनियो? उहाँका बाहु के भनिए? उहाँका जाँघ र खुट्टा के भनिन्छन्?",
        "meaning_en": "When they divided Purusha, into how many parts did they arrange him? What was his mouth called? What his arms? What are his thighs and feet called?",
    },
    "3.11": {
        "meaning_ne": "ब्राह्मण उहाँको मुख थियो; बाहुबाट क्षत्रिय बनाइयो। उहाँको जाँघबाट वैश्य भयो; खुट्टाबाट शूद्र उत्पन्न भयो।",
        "meaning_en": "The Brahmin was his mouth; the Kshatriya was made from his arms; his thighs became the Vaishya; from his feet the Shudra was born.",
    },
    "3.12": {
        "meaning_ne": "चन्द्रमा उहाँको मनबाट जन्मियो, आँखाबाट सूर्य उत्पन्न भयो। कानबाट वायु र प्राण, र मुखबाट अग्नि उत्पन्न भयो।",
        "meaning_en": "The Moon was born from his mind; the Sun was born from his eye; from his ears, Vayu and Prana; from his mouth, Agni was born.",
    },
    "3.13": {
        "meaning_ne": "नाभिबाट अन्तरिक्ष भयो, शिरबाट आकाश उत्पन्न भयो। खुट्टाबाट पृथ्वी, कानबाट दिशाहरू — यसरी उनीहरूले लोकहरू रचना गरे।",
        "meaning_en": "From his navel came the atmosphere; from his head the heavens evolved; from his feet, the earth; from his ears, the quarters — thus they fashioned the worlds.",
    },
    "3.14": {
        "meaning_ne": "जब देवताहरूले पुरुषलाई हवि बनाएर यज्ञ विस्तार गरे, वसन्त त्यसको घ्यू थियो, ग्रीष्म दाउरा थियो, र शरद हवि थियो।",
        "meaning_en": "When the gods extended the sacrifice with Purusha as the oblation, spring was its clarified butter, summer its fuel, and autumn its offering.",
    },
    "3.15": {
        "meaning_ne": "सात परिधि (घेर्ने काठ) थिए, र एक्काइस दाउरा बनाइए, जब देवताहरूले यज्ञ विस्तार गर्दै पुरुषरूपी पशुलाई बाँधे।",
        "meaning_en": "Seven were the enclosing sticks, thrice seven the fuel-sticks made, when the gods, performing the sacrifice, bound Purusha as the victim.",
    },
    "3.16": {
        "meaning_ne": "यज्ञद्वारा देवताहरूले यज्ञकै पूजा गरे; यी नै पहिलो धर्म (नियम) थिए। ती महान् देवताहरूले स्वर्गलोक प्राप्त गरे, जहाँ प्राचीन साध्य देवताहरू बस्छन्।",
        "meaning_en": "With the sacrifice, the gods worshipped the sacrifice; these were the first sacred ordinances. Those great ones attained the heavenly realm, where the ancient Sadhyas, the gods, dwell.",
    },
    "3.17": {
        "meaning_ne": "जलबाट र पृथ्वीको रसबाट सङ्कलित भई विश्वकर्मा सुरुमा प्रकट भए। उनको त्वष्टाले रूप निर्माण गर्दछन्; त्यही सुरुदेखिको दिव्यता मर्त्यले जान्दछ।",
        "meaning_en": "Gathered from the waters and from the essence of the earth, Vishvakarma came into being at the beginning. Tvashta, fashioning his form, comes forth; that, in the beginning, is the divine nature known to mortal man.",
    },
    "3.18": {
        "meaning_ne": "म यस महान् पुरुषलाई जान्दछु, जो सूर्यसमान वर्णका र अन्धकारभन्दा परका हुनुहुन्छ। उहाँलाई जानेर मात्र मृत्युलाई नाघ्न सकिन्छ; मुक्तिको निम्ति अर्को कुनै मार्ग छैन।",
        "meaning_en": "I know this great Purusha, radiant like the sun, beyond all darkness. Only by knowing him does one go beyond death; there is no other path for attaining liberation.",
    },
    "3.19": {
        "meaning_ne": "प्रजापति गर्भभित्र विचरण गर्नुहुन्छ, अजन्मै भई पनि धेरै रूपमा जन्मनुहुन्छ। धीरहरूले उहाँको उत्पत्तिस्थल देख्दछन्; उहाँमै सम्पूर्ण लोकहरू अवस्थित छन्।",
        "meaning_en": "Prajapati moves within the womb, unborn yet born in many forms. The wise behold his source; in him all the worlds abide.",
    },
    "3.20": {
        "meaning_ne": "जो देवताहरूका निम्ति प्रकाशमान हुनुहुन्छ, जो देवताहरूका पुरोहित हुनुहुन्छ, जो देवताहरूभन्दा पहिले जन्मनुभयो — त्यो ब्राह्मी ज्योतिलाई नमस्कार।",
        "meaning_en": "He who shines forth for the gods, who is the high priest of the gods, who was born before the gods — salutation to that radiant, divine light.",
    },
    "3.21": {
        "meaning_ne": "त्यो ब्राह्मी ज्योति उत्पन्न गर्दै देवताहरूले सुरुमा भने: जसले यसरी ब्राह्मणलाई (ब्रह्मज्ञानलाई) जान्दछ, त्यसको वशमा देवताहरू रहनेछन्।",
        "meaning_en": "The gods, giving birth to that divine radiance in the beginning, declared: whoever, being a knower of Brahman, understands this thus — the gods shall be under his control.",
    },
    "3.22": {
        "meaning_ne": "श्री र लक्ष्मी तपाईंका दुई पत्नी हुन्; दिन र रात तपाईंका दुई छेउ हुन्; नक्षत्रहरू तपाईंको रूप हुन्; दुई अश्विनीकुमार तपाईंको खुला मुख हुन्। इच्छा गर्दै मलाई (मागेको वर) प्रदान गर्नुहोस्; मलाई त्यो प्रदान गर्नुहोस्; मलाई सम्पूर्ण लोक प्रदान गर्नुहोस्।",
        "meaning_en": "Sri and Lakshmi are your two consorts; day and night are your two sides; the stars are your form; the two Ashvins are your open mouth. Desiring, grant me what I ask; grant me that; grant me the whole world.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 3)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH3.get(shloka["verse_label"])
        if extra is None:
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-3 meanings in {OUT}")


if __name__ == "__main__":
    main()
