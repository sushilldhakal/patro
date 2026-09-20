#!/usr/bin/env python3
"""Fill chapter-11 (Svasti Prarthana) meaning_en / meaning_ne on
data/documents_source/rudrashtadhyayi.json.

11.1-11.11 are individually well-known, widely-published Vedic mantras
(the Rigvedic Svasti Sukta at 11.1; the five Panchabrahma mantras —
Sadyojata, Vamadeva, Aghora, Tatpurusha/Rudra-Gayatri, Ishana — at
11.5/11.6/11.7/11.8/11.9; the Yajurvedic "Vishvani deva savitah" at
11.11) and are translated directly from this manifest's Sanskrit.

11.12-11.14 were cross-checked against a translation the user sourced
externally (NotebookLM) for "adhyaya 11" of a Rudrashtadhyayi edition
that splits the closing section differently from this manifest — its
chapter 10/11 boundary and this file's chapter-11 boundary don't line
up 1:1, and two of its five mantras (a kshama-prarthana verse and a
Rudrabhisheka-dedication verse) aren't part of this manifest's text at
all. Only the three mantras that do match this manifest's Sanskrit
verbatim (11.12, 11.13, and the shorter 11.14 as it actually reads
here) are used, re-tightened to this project's literal per-clause
style rather than the external source's freer phrasing.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH11 = {
    "11.1": {
        "meaning_ne": "ॐ! महाकीर्तिवान् इन्द्रले हामीलाई कल्याण प्रदान गरून्। सर्वज्ञ पूषाले हामीलाई कल्याण प्रदान गरून्। अक्षतरथचक्र भएका तार्क्ष्य (गरुड)ले हामीलाई कल्याण प्रदान गरून्। बृहस्पतिले हामीलाई कल्याण प्रदान गरून्।",
        "meaning_en": "Om! May Indra of great renown grant us well-being. May all-knowing Pushan grant us well-being. May Tarkshya, whose chariot-wheel is unharmed, grant us well-being. May Brihaspati grant us well-being.",
    },
    "11.2": {
        "meaning_ne": "ॐ! पृथ्वीमा रस छ, ओषधिहरूमा रस छ, दिव्य अन्तरिक्षमा रस छ — त्यो रस हामीमाथि प्रदान गर्नुहोस्। सबै दिशाहरू मेरो निम्ति रसयुक्त होऊन्।",
        "meaning_en": "Om! There is nourishing essence in the earth, nourishing essence in the herbs, nourishing essence in the divine atmosphere — bestow that essence upon us. May all the directions be filled with abundance for me.",
    },
    "11.3": {
        "meaning_ne": "ॐ! तिमी विष्णुको शिरोभाग हौ; तिमी विष्णुका बाँध्ने डोरी हौ; तिमी विष्णुको बन्धन हौ; तिमी विष्णुको दृढ आधार हौ। तिमी वैष्णव हौ — तिमीलाई विष्णुका निम्ति समर्पण गरिन्छ।",
        "meaning_en": "Om! You are the crown of Vishnu; you are the binding cords of Vishnu; you are the tether of Vishnu; you are the firm foundation of Vishnu. You belong to Vishnu — you are dedicated unto Vishnu.",
    },
    "11.4": {
        "meaning_ne": "ॐ! अग्नि देवता हुन्, वायु देवता हुन्, सूर्य देवता हुन्, चन्द्रमा देवता हुन्, वसुहरू देवता हुन्, रुद्रहरू देवता हुन्, आदित्यहरू देवता हुन्, मरुत्हरू देवता हुन्, सम्पूर्ण विश्वेदेवाहरू देवता हुन्, बृहस्पति देवता हुन्, इन्द्र देवता हुन्, वरुण देवता हुन्।",
        "meaning_en": "Om! Agni is the deity, Vayu is the deity, Surya is the deity, the Moon is the deity, the Vasus are deities, the Rudras are deities, the Adityas are deities, the Maruts are deities, all the Vishvedevas are the deity, Brihaspati is the deity, Indra is the deity, Varuna is the deity.",
    },
    "11.5": {
        "meaning_ne": "ॐ! सद्योजातको म शरण लिन्छु; सद्योजातलाई पुनः पुनः नमस्कार। जन्म-जन्ममा संसार-बन्धनले मलाई अत्यधिक नथिचोस्, मलाई कृपा गर्नुहोस्। सम्पूर्ण अस्तित्व जन्मने स्रोत भवोद्भवलाई नमस्कार।",
        "meaning_en": "Om! I take refuge in Sadyojata; salutations again and again to Sadyojata. In birth after birth, let me not be overcome by worldly becoming — be gracious unto me. Salutations to Him, the source from whom all existence arises.",
    },
    "11.6": {
        "meaning_ne": "वामदेवलाई नमस्कार; ज्येष्ठलाई नमस्कार; श्रेष्ठलाई नमस्कार; रुद्रलाई नमस्कार; काललाई नमस्कार; कालविकरणलाई नमस्कार; बलविकरणलाई नमस्कार; बल(शक्ति)लाई नमस्कार; बलप्रमथनलाई नमस्कार; सर्वभूतदमनलाई नमस्कार; मनोन्मनलाई नमस्कार।",
        "meaning_en": "Salutations to Vamadeva; salutations to the Eldest; salutations to the Most Excellent; salutations to Rudra; salutations to Kala (Time); salutations to Him who manifests through time; salutations to Him who manifests strength; salutations to Strength itself; salutations to the subduer of demonic power; salutations to the tamer of all beings; salutations to Manonmana, He who is beyond the mind.",
    },
    "11.7": {
        "meaning_ne": "हे शर्व! तपाईंका अघोर (कोमल), घोर (डरलाग्दा) र घोरतर (अझ बढी डरलाग्दा) — यी सबै रूपहरूलाई नमस्कार; तपाईंका यी सम्पूर्ण रुद्ररूपहरूलाई नमस्कार होस्।",
        "meaning_en": "Salutations to You in Your gentle forms, in Your terrifying forms, and in Your most terrifying forms — salutations to You, O Sharva, in all these forms; salutations to all these Rudra-forms of Yours.",
    },
    "11.8": {
        "meaning_ne": "हामी त्यस तत्पुरुषलाई चिन्दछौं; महादेवको ध्यान गर्दछौं; त्यो रुद्रले हाम्रो बुद्धिलाई प्रेरित गरून्।",
        "meaning_en": "We know that Supreme Purusha; we meditate upon Mahadeva; may that Rudra illumine and guide our intellect.",
    },
    "11.9": {
        "meaning_ne": "ईशान सम्पूर्ण विद्याहरूका ईश्वर हुनुहुन्छ, सबै प्राणीहरूका शासक हुनुहुन्छ, ब्रह्माका अधिपति र ब्रह्मका स्वामी हुनुहुन्छ — त्यो शिव मप्रति कल्याणकारी होऊन्; सदाशिवले मलाई आशीर्वाद दिऊन्।",
        "meaning_en": "Ishana is the Lord of all knowledge, the ruler of all beings, the overlord of Brahma, the master of sacred wisdom — may He be gracious unto me; may that ever-auspicious Sadashiva bless me.",
    },
    "11.10": {
        "meaning_ne": "ॐ! तिम्रो नाम शिव हो; स्वधिति (बन्चरो) तिम्रो पिता हो; तिमीलाई नमस्कार; मलाई हानि नगर। म तिमीलाई दीर्घायु, अन्न-पोषण, सन्तानवृद्धि, धनसमृद्धि, असल सन्तान र बल-वीर्यतर्फ निर्देशित गर्दछु।",
        "meaning_en": "Om! Your name is Shiva; the axe is your father — salutations to you; may you not harm me. I direct you toward long life, toward nourishment, toward progeny, toward abundance of wealth, toward good offspring, and toward strength and vitality.",
    },
    "11.11": {
        "meaning_ne": "ॐ! हे देव सवितः! हाम्रा सबै पाप र अशुभहरू टाढा पुऱ्याउनुहोस्; जे-जति कल्याणकारी छ, त्यो हामीलाई प्रदान गर्नुहोस्।",
        "meaning_en": "Om! O Divine Savitar, drive away all our evils; bestow upon us whatever is good and auspicious.",
    },
    "11.12": {
        "meaning_ne": "स्वर्गमा शान्ति होस्, अन्तरिक्षमा शान्ति होस्, पृथ्वीमा शान्ति होस्, जलमा शान्ति होस्, ओषधिहरूमा शान्ति होस्, वनस्पतिहरूमा शान्ति होस्, सम्पूर्ण देवताहरूमा शान्ति होस्, ब्रह्ममा शान्ति होस्, सबैतिर शान्ति होस् — त्यो शान्ति नै शान्ति होस्, र त्यही शान्ति मलाई प्राप्त होस्।",
        "meaning_en": "May there be peace in heaven, peace in the atmosphere, peace on earth, peace in the waters, peace in the herbs, peace in the trees, peace in all the gods, peace in Brahman, peace in all creation — may that peace itself be peace, and may that peace come to me.",
    },
    "11.13": {
        "meaning_ne": "यो साम सम्पूर्ण वेदहरूको सार हो; सम्पूर्ण वेदहरूको यसै साररूपी अंशले यसलाई अभिषेक गरिन्छ।",
        "meaning_en": "This chant is indeed the essence of all the Vedas; with this very essence of all the Vedas, it is consecrated.",
    },
    "11.14": {
        "meaning_ne": "ॐ! शान्ति, शान्ति, शान्ति!",
        "meaning_en": "Om! Peace, peace, peace!",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 11)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH11.get(shloka["verse_label"])
        if extra is None:
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-11 meanings in {OUT}")


if __name__ == "__main__":
    main()
