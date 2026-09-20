#!/usr/bin/env python3
"""Fill chapter-10 (Shanti Adhyaya) meaning_en / meaning_ne on
data/documents_source/rudrashtadhyayi.json.

This chapter strings together several of the most widely-published
Vedic peace/benediction verses: the Gayatri mantra (10.3), the
Taittiriya Upanishad's opening shanti-patha "Sham no Mitrah..."
(10.9), the "Apo hi shtha" waters hymn (RV 10.9.1-3, at 10.14-10.16),
the "Dyauh shantih" peace mantra (10.17, same text as chapter 11's
closing verse), the "Mitrasya chakshusha" friendship-vision verses
(10.18-10.19), and the closing "Tacchakshurdevahitam" longevity
invocation (10.24, from the Isha/Brihadaranyaka tradition, chanted
at the close of countless Vedic recitations). 10.4-10.8 are from a
Rigvedic hymn to Indra (RV 8.13-series "kaya nas citra" verses).
High confidence throughout — all standard, well-documented texts,
translated directly against this manifest's own Sanskrit.
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

CH10 = {
    "10.1": {
        "meaning_ne": "म वाणीको रूपमा ऋक्को शरण लिन्छु, मनको रूपमा यजुःको शरण लिन्छु, प्राणको रूपमा सामको शरण लिन्छु, र आँखा-कानको शरण लिन्छु। वाणी, ओज र सहओज, प्राण र अपान ममा स्थिर रहून्।",
        "meaning_en": "I take refuge in Rik as speech; I take refuge in Yajus as mind; I take refuge in Sama as breath; I take refuge in the eye and the ear. May speech, strength, and overpowering strength, along with the in-breath and out-breath, dwell in me.",
    },
    "10.2": {
        "meaning_ne": "मेरो आँखा, हृदय वा मनमा वायुले जुन कमजोरी वा चोट पुऱ्याएको छ, बृहस्पतिले त्यसलाई मेरो निम्ति ठीक पारून्। संसारका स्वामी हामीप्रति कल्याणकारी होऊन्।",
        "meaning_en": "Whatever flaw there is in my eye, in my heart, or in my mind, torn by the wind — may Brihaspati repair that for me. May he who is the lord of the world be auspicious to us.",
    },
    "10.3": {
        "meaning_ne": "भूः भुवः स्वः — हामी त्यस श्रेष्ठ, वरणीय देव सवितरको तेजको ध्यान गर्दछौं, जसले हाम्रो बुद्धिलाई सन्मार्गतर्फ प्रेरित गरून्।",
        "meaning_en": "Om, Bhuh Bhuvah Svah — we meditate on that most excellent, adorable light of the divine Savitar, who may inspire and guide our intellect.",
    },
    "10.4": {
        "meaning_ne": "हाम्रो सधैं वृद्धि गर्ने सखाले कुन अद्भुत सहायताका साथ हाम्रो रक्षामा आउनुहुनेछ? कुन सर्वशक्तिशाली सहायताका साथ, यसरी आह्वान गरिएर?",
        "meaning_en": "With what wondrous help will our ever-strengthening friend come to our protection? With which most potent power, thus invoked?",
    },
    "10.5": {
        "meaning_ne": "हे अत्यन्त उदार, तपाईंका हर्षहरूमध्ये कुन साँचो हर्षले तपाईंलाई सोमरसद्वारा प्रसन्न पार्नेछ, ताकि तपाईंले दृढ भण्डारहरू पनि खोलिदिनुहोस्?",
        "meaning_en": "Which true delight among your exhilarations, O most bountiful one, shall gladden you with the sacred draught, so that you may break open even the firmest treasuries?",
    },
    "10.6": {
        "meaning_ne": "तपाईं साँच्चै हामी सखा र स्तुतिकर्ताहरूका रक्षक हुनुहोस्; आफ्ना अनेकौं रक्षाका माध्यमबाट हामीलाई सयौं गुणा बन्नुहोस्।",
        "meaning_en": "Be truly the protector of us, your friends and praisers; be to us a hundredfold through your many forms of protection.",
    },
    "10.7": {
        "meaning_ne": "हे शक्तिशाली, कुन रक्षाशक्तिले तपाईं हामीमा प्रसन्न हुनुहुन्छ? त्यही उदारता आफ्ना स्तुतिकर्ताहरूलाई पनि प्रदान गर्नुहोस्।",
        "meaning_en": "With what protecting power, O mighty one, do you delight in us? Bring that same bounty to your praisers.",
    },
    "10.8": {
        "meaning_ne": "इन्द्रले सम्पूर्ण संसारमाथि राज्य गर्नुहुन्छ। हाम्रा दुईखुट्टे प्राणीहरूलाई कल्याण होस्, हाम्रा चारखुट्टे प्राणीहरूलाई पनि कल्याण होस्।",
        "meaning_en": "Indra rules over the whole world. May there be well-being for our two-footed beings, and well-being for our four-footed beings.",
    },
    "10.9": {
        "meaning_ne": "मित्र हामीप्रति कल्याणकारी होऊन्, वरुण हामीप्रति कल्याणकारी होऊन्, अर्यमा हामीप्रति कल्याणकारी होऊन्। इन्द्र र बृहस्पति हामीप्रति कल्याणकारी होऊन्, र दीर्घ पाइला हाल्ने विष्णु हामीप्रति कल्याणकारी होऊन्।",
        "meaning_en": "May Mitra be auspicious to us, may Varuna be auspicious to us, may Aryaman be auspicious to us. May Indra and Brihaspati be auspicious to us, may Vishnu of the wide stride be auspicious to us.",
    },
    "10.10": {
        "meaning_ne": "वायुले हामीमाथि कल्याणकारी भई बहून्, सूर्यले हामीमाथि कल्याणकारी भई तताऊन्, गर्जने देव पर्जन्यले हामीमाथि कल्याणकारी भई वर्षा गरून्।",
        "meaning_en": "May the wind blow auspiciously for us; may the Sun shine auspiciously for us; may the thundering god Parjanya rain down auspiciously upon us.",
    },
    "10.11": {
        "meaning_ne": "हाम्रा दिनहरू कल्याणकारी होऊन्, हाम्रा रातहरू पनि कल्याणमा स्थापित होऊन्। इन्द्र र अग्नि आफ्ना रक्षाहरूद्वारा हामीलाई कल्याण गरून्; हवि ग्रहण गर्ने इन्द्र र वरुण हामीलाई कल्याण गरून्। बल प्राप्तिमा इन्द्र र पूषा हामीलाई कल्याण गरून्; कल्याण र सुरक्षाका निम्ति इन्द्र र सोम हामीलाई कल्याण गरून्।",
        "meaning_en": "May our days be auspicious; may our nights be established in auspiciousness. May Indra and Agni be auspicious to us with their protections; may Indra and Varuna, to whom oblations are offered, be auspicious to us. May Indra and Pushan be auspicious to us in the gaining of strength; may Indra and Soma be auspicious for our well-being and safety.",
    },
    "10.12": {
        "meaning_ne": "दिव्य जलले हाम्रो सहायता र पिउनका लागि कल्याणकारी होऊन्; ती जल हामीमाथि कल्याणकारी र लाभदायी भई बगून्।",
        "meaning_en": "May the divine waters be auspicious to us for our help, and for our drink; may they flow auspiciously and beneficially for us.",
    },
    "10.13": {
        "meaning_ne": "हे पृथ्वी, तिमी हामीलाई सुखद, काँडारहित, बसोबासयोग्य होऊ; हे विस्तृत, हामीलाई फराकिलो आश्रय प्रदान गर।",
        "meaning_en": "May the earth be pleasant to us, free of thorns, a resting place; grant us shelter that is wide-spreading, O far-extending one.",
    },
    "10.14": {
        "meaning_ne": "हे जल, तिमी साँच्चै सुखदायी हौ; हामीलाई पोषण प्रदान गर, ताकि हामीले महान् आनन्द देख्न सकौं।",
        "meaning_en": "O Waters, you are indeed beneficial, bringing happiness; grant us nourishment, so that we may behold great delight.",
    },
    "10.15": {
        "meaning_ne": "तिमीहरूमा जुन अत्यन्त कल्याणकारी रस छ, त्यसको भाग हामीलाई यहाँ दिनुहोस्, स्नेही आमाहरूले झैं।",
        "meaning_en": "That most auspicious essence of yours — grant us a share of it here, like loving mothers give to their children.",
    },
    "10.16": {
        "meaning_ne": "जसको निवासका लागि तिमी सबैलाई जीवन्त बनाउँछौ, हामी त्यसैतिर उचित रूपमा जाऔं; र हे जल, तिमीले हामीलाई पुनः जन्माओ (शुद्ध पार)।",
        "meaning_en": "May we duly approach you, for whose dwelling you enliven all; and, O Waters, give birth to us anew.",
    },
    "10.17": {
        "meaning_ne": "स्वर्गमा शान्ति होस्, अन्तरिक्षमा शान्ति होस्, पृथ्वीमा शान्ति होस्, जलमा शान्ति होस्, ओषधिहरूमा शान्ति होस्, वनस्पतिहरूमा शान्ति होस्, सम्पूर्ण देवताहरूमा शान्ति होस्, ब्रह्ममा शान्ति होस्, सबैतिर शान्ति होस् — त्यो शान्ति नै शान्ति होस्, र त्यही शान्ति मलाई प्राप्त होस्।",
        "meaning_en": "May there be peace in heaven, peace in the atmosphere, peace on earth, peace in the waters, peace in the herbs, peace in the trees, peace in all the gods, peace in Brahman, peace in all creation — may that peace itself be peace, and may that peace come to me.",
    },
    "10.18": {
        "meaning_ne": "हे दृति (डोरी/पासो), मेरो निम्ति दृढ रहो। सम्पूर्ण प्राणीले मलाई मित्रको दृष्टिले हेरून्। म पनि मित्रको दृष्टिले सम्पूर्ण प्राणीलाई हेर्दछु। हामी मित्रको दृष्टिले एक-अर्कालाई हेरौं।",
        "meaning_en": "O bowstring, be firm for me. May all beings look upon me with the eye of a friend. I look upon all beings with the eye of a friend. We look upon one another with the eye of a friend.",
    },
    "10.19": {
        "meaning_ne": "हे दृति, मेरो निम्ति दृढ रहो। सम्पूर्ण प्राणीले मलाई मित्रको दृष्टिले हेरून्। म धेरै समयसम्म दृष्टि कायम राखी बाँचूँ; म धेरै समयसम्म दृष्टि कायम राखी बाँचूँ।",
        "meaning_en": "O bowstring, be firm for me. May all beings look upon me with the eye of a friend. May I live long with my sight intact; may I live long with my sight intact.",
    },
    "10.20": {
        "meaning_ne": "तपाईंको तीव्र तापलाई नमस्कार, तपाईंको ज्वालालाई नमस्कार, तपाईंको तेजलाई नमस्कार होस्। तपाईंका हतियारहरूले अरूलाई तताऊन्, हामीलाई नभई; हे पवित्र गर्ने, हामीप्रति कल्याणकारी हुनुहोस्।",
        "meaning_en": "Salutation to your fierce heat, salutation to your flame; salutation be to your radiance. Let your weapons burn others, not us; O purifying one, be gracious to us.",
    },
    "10.21": {
        "meaning_ne": "तपाईंलाई नमस्कार होस्, हे बिजुली; तपाईंलाई नमस्कार होस्, हे गर्जन। हे भगवान्, तपाईंलाई नमस्कार होस्, जहाँबाट तपाईं आकाशतर्फ आफ्नो शक्ति फैलाउनुहुन्छ।",
        "meaning_en": "Salutation to you, O lightning; salutation to you, O thunder. Salutation be to you, O Lord, from wherever you exert your power toward the heavens.",
    },
    "10.22": {
        "meaning_ne": "तपाईं जहाँ-जहाँबाट आफ्नो शक्ति फैलाउनुहुन्छ, त्यहाँ-त्यहाँबाट हामीलाई निर्भयता प्रदान गर्नुहोस्। हाम्रा सन्ततिलाई कल्याण प्रदान गर्नुहोस्, हाम्रा पशुहरूलाई निर्भयता प्रदान गर्नुहोस्।",
        "meaning_en": "From wherever you act, grant us freedom from fear from that quarter. Grant well-being to our offspring, and freedom from fear to our cattle.",
    },
    "10.23": {
        "meaning_ne": "जल र ओषधिहरू हामीप्रति मैत्रीपूर्ण होऊन्; जसले हामीलाई घृणा गर्छ र जसलाई हामी घृणा गर्छौं, तिनीहरूप्रति अमैत्रीपूर्ण होऊन्।",
        "meaning_en": "May the waters and the herbs be friendly to us; may they be unfriendly to him who hates us, and to whomever we hate.",
    },
    "10.24": {
        "meaning_ne": "देवताहरूद्वारा स्थापित त्यो नेत्र (सूर्य) पूर्वदिशामा उदाउँदै, शुद्ध र देदीप्यमान छ। हामी सय वर्षसम्म देखौं, सय वर्षसम्म बाँचौं, सय वर्षसम्म सुनौं, सय वर्षसम्म बोलौं, सय वर्षसम्म पराश्रित नभई रहौं, र सय वर्षभन्दा पनि बढी बाँचौं।",
        "meaning_en": "That eye (the sun), set in place by the gods, rising in the east, pure and radiant — may we see for a hundred autumns, may we live for a hundred years, may we hear for a hundred years, may we speak for a hundred years, may we be free from dependence for a hundred years, and even more than a hundred years.",
    },
}


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    chapter = next(c for c in data["chapters"] if c["number"] == 10)
    missing = []
    filled = 0
    for shloka in chapter["shlokas"]:
        extra = CH10.get(shloka["verse_label"])
        if extra is None:
            missing.append(shloka["verse_label"])
            continue
        shloka["meaning_ne"] = extra["meaning_ne"]
        shloka["meaning_en"] = extra["meaning_en"]
        filled += 1
    if missing:
        raise SystemExit(f"no gloss for {missing}")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"filled {filled} chapter-10 meanings in {OUT}")


if __name__ == "__main__":
    main()
