#!/usr/bin/env python3
"""Parse books/sri-rudram.txt into data/documents_source/sri-rudram.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "books/sri-rudram.txt"
OUT = Path(__file__).resolve().parents[1] / "data/documents_source/sri-rudram.json"

ANUVAKA_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)\s+Anuvaka\s*$", re.I)
SECTION_HEADERS = {
    "transliteration",
    "translation",
    "word-meanings",
    "word-meaning",
    "notes",
}
# Letters only — Devanagari danda (। ॥) also appears in IAST lines.
DEVANAGARI_LETTER_RE = re.compile(r"[\u0904-\u0939\u0958-\u0961\u0972-\u097F]")
IAST_RE = re.compile(
    r"[āīūṛṝḷḹṅñṭḍṇśṣḥṃṁēōḻṉṟĀĪŪṚṜḶḸṄÑṬḌṆŚṢḤṂĒŌ̠̱̍̎᳚́̀]"
)
ENGLISH_START_RE = re.compile(
    r"^(The |This |That |These |Those |Salutations|We |O [A-Z]|Om,|Oṃ,|"
    r"May |Let |Now |In |He |His |Praise |Release |Lower |And |To the |"
    r"One |When |Whoever |By |As |On whose |Whose |Like |I |It begins|"
    r"Your |You |Do not )",
    re.I,
)
ENGLISH_WORD_RE = re.compile(
    r"\b(the|and|to|of|with|your|you|hold|this|that|who|which|from|for|"
    r"our|their|them|not|may|let|one|all)\b",
    re.I,
)
GLOSS_DASH_RE = re.compile(r"^.{1,40}\([^)]{1,40}\)\s*[-–—]\s+\S")
SOURCE_MARKERS = ("कृष्ण यजुर्वेदीय", "तैत्तिरीय संहिता", "वैँश्वदेव", "प्रपाठकः")

CHAPTER_TITLES = {
    0: ("प्रस्तावना", "Invocation"),
    1: ("रुद्रको धनुष र शान्त रूप", "Rudra's bow and peaceful form"),
    2: ("नमो नमः — सेनापति र दिशापति", "Salutations — commander and lord of directions"),
    3: ("नमो नमः — निषङ्गी रूप", "Salutations — the armed one"),
    4: ("नमो नमः — गण, सेना र शिल्पी", "Salutations — hosts, armies and craftsmen"),
    5: ("नमो नमः — विविध रूप", "Salutations — manifold forms"),
    6: ("नमो नमः — वृद्ध, युवा र दिशा", "Salutations — the aged, the young, and the quarters"),
    7: ("नमो नमः — भूमि, वृक्ष र नदी", "Salutations — earth, trees and rivers"),
    8: ("नमो नमः — तीर्थ र प्रदेश", "Salutations — fords and regions"),
    9: ("नमो नमः — गृह, पथ र हृदय", "Salutations — homes, paths and the heart"),
    10: ("रक्षा र औषधि रूप", "Protection and the healing form"),
    11: ("सहस्र रुद्र र शान्ति", "The thousand Rudras and the peace-chant"),
}


def is_devanagari(line: str) -> bool:
    return bool(DEVANAGARI_LETTER_RE.search(line))


def is_section_header(line: str) -> bool:
    return line.strip().lower() in SECTION_HEADERS


def is_word_meaning(line: str) -> bool:
    if GLOSS_DASH_RE.match(line):
        return True
    if ":" not in line:
        return False
    left = line.split(":", 1)[0].strip()
    if not left or len(left) > 160:
        return False
    # Commentary sentences like "The word \"Oṃ\" is..." are not glosses.
    if left[0].isupper() and " " in left and not IAST_RE.search(left) and not is_devanagari(left):
        return False
    return True


def is_transliteration(line: str) -> bool:
    if is_devanagari(line) or is_word_meaning(line) or is_section_header(line):
        return False
    if ENGLISH_START_RE.match(line):
        return False
    if len(ENGLISH_WORD_RE.findall(line)) >= 3:
        return False
    if IAST_RE.search(line):
        return True
    # Bare IAST without much diacritic still uses danda / double-danda.
    if re.search(r"[.।॥]{1,2}\s*$", line) and not re.search(r"\b(the|and|to|of|with)\b", line, re.I):
        return True
    return False


def is_translation(line: str) -> bool:
    if is_devanagari(line) or is_word_meaning(line) or is_section_header(line):
        return False
    if is_transliteration(line):
        return False
    if ENGLISH_START_RE.match(line):
        return True
    # Plain English continuation (no IAST, starts with capital).
    if line[0].isupper() and not IAST_RE.search(line):
        return True
    return False


def is_source_block(sanskrit: str) -> bool:
    return any(marker in sanskrit for marker in SOURCE_MARKERS)


def join_lines(parts: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def parse_verses(text: str) -> list[dict]:
    raw_lines = [ln.strip() for ln in text.splitlines()]
    verses: list[dict] = []
    chapter = 0
    current: dict | None = None
    mode: str | None = None  # sanskrit | iast | trans | gloss
    stop = False

    def flush() -> None:
        nonlocal current, mode
        if not current:
            mode = None
            return
        sanskrit = join_lines(current["sanskrit_parts"])
        meaning_en = join_lines(current["trans_parts"])
        if (
            sanskrit
            and meaning_en
            and not is_source_block(sanskrit)
            and not GLOSS_DASH_RE.match(sanskrit)
        ):
            verses.append(
                {
                    "chapter": current["chapter"],
                    "sanskrit": sanskrit,
                    "transliteration": join_lines(current["iast_parts"]),
                    "meaning_en": meaning_en,
                }
            )
        current = None
        mode = None

    def ensure(ch: int) -> dict:
        nonlocal current, mode
        if current is None:
            current = {
                "chapter": ch,
                "sanskrit_parts": [],
                "iast_parts": [],
                "trans_parts": [],
            }
            mode = "sanskrit"
        return current

    for line in raw_lines:
        if stop:
            break
        if not line:
            continue

        anuvaka = ANUVAKA_RE.match(line)
        if anuvaka:
            chapter = int(anuvaka.group(1))
            # Duplicate header sits between Sanskrit and IAST of the same verse.
            if current and current["sanskrit_parts"] and not current["iast_parts"]:
                continue
            flush()
            chapter = int(anuvaka.group(1))
            continue

        if is_section_header(line):
            if line.lower() == "notes":
                flush()
                stop = True
                break
            if line.lower() == "transliteration" and current:
                mode = "iast"
            elif line.lower() == "translation" and current:
                mode = "trans"
            elif line.lower().startswith("word-meaning") and current:
                mode = "gloss"
            continue

        if is_word_meaning(line) or (mode == "gloss" and GLOSS_DASH_RE.match(line)):
            mode = "gloss"
            continue

        if is_devanagari(line):
            if current and (current["iast_parts"] or current["trans_parts"] or mode in {"iast", "trans", "gloss"}):
                flush()
            ensure(chapter)["sanskrit_parts"].append(line)
            mode = "sanskrit"
            continue

        if current is None:
            continue

        if mode == "gloss":
            continue

        if is_translation(line):
            current["trans_parts"].append(line)
            mode = "trans"
            continue

        if is_transliteration(line) or mode in {"sanskrit", "iast"}:
            current["iast_parts"].append(line)
            mode = "iast"
            continue

    flush()
    return verses


def nepali_for(meaning_en: str, sanskrit: str) -> str:
    """Hand translations keyed by distinctive Sanskrit openings; longest match wins."""
    mapping = [
        (
            "अथ श्रीरुद्रप्रश्नः",
            "अब श्री रुद्र प्रश्न सुरु हुन्छ। पूज्य गुरुहरूलाई नमस्कार। ॐ, हरि परब्रह्म। ॐ, हामी गणहरूका स्वामी गणपतिलाई आह्वान गर्छौं — ज्ञानीहरूमा सर्वश्रेष्ठ, सबैभन्दा यशस्वी, प्रार्थनाहरूका ज्येष्ठ राजा ब्रह्मणस्पति। हाम्रो प्रार्थना सुन्नुहोस् र आशीर्वाद दिन यहाँ विराजमान हुनुहोस्।",
        ),
        (
            "ओ-न्नमो भगवते",
            "ॐ, भगवान् रुद्रलाई नमस्कार।",
        ),
        (
            "नम॑स्ते रुद्र म॒न्यव॑",
            "रुद्रको क्रोधलाई नमस्कार, उहाँको बाणलाई पनि नमस्कार। रुद्रको धनुष र बाहुहरूलाई नमस्कार।",
        ),
        (
            "या त॒ इषुः॑ शि॒वत॑मा",
            "तपाईंको बाण अत्यन्त कल्याणकारी होस् र धनुष शान्त होस्। त्यही शान्त बाणले, हे रुद्र, हामीलाई सुख दिनुहोस्।",
        ),
        (
            "या ते॑ रुद्र शि॒वा त॒नूरघो॒रा",
            "हे रुद्र, तपाईंको त्यो मङ्गलमय, अघोर र पापनाशक रूप — त्यही अत्यन्त शान्त तनुले, हे गिरिशन्त, हामीलाई दर्शन दिनुहोस्।",
        ),
        (
            "यामिषु॑-ङ्गिरिशन्त॒",
            "हे गिरिशन्त, तपाईंले हातमा समातेको त्यो बाणलाई शान्त बनाइदिनुहोस्। पुरुष र जगत्लाई हिंसा नगर्नुहोस्।",
        ),
        (
            "शि॒वेन॒ वच॑सा त्वा॒",
            "हे गिरिश, हामी तपाईंलाई मङ्गल वचनले सम्बोधन गर्छौं, ताकि सम्पूर्ण जगत् रोगरहित र सुमनस्क होस्।",
        ),
        (
            "अध्य॑वोचदधिव॒क्ता",
            "देवताहरूका प्रथम वैद्य अधिवक्ताले भने — सबै सर्प र यातुधानहरूलाई नष्ट गरून्।",
        ),
        (
            "अ॒सौ यस्ता॒म्रो अ॑रु॒ण",
            "जो ताम्र, अरुण र बभ्रु वर्णका अत्यन्त मङ्गलमय हुनुहुन्छ, र दिशाहरूमा हजारौं रुद्र अवस्थित छन् — उनीहरूको क्रोधबाट हामी मुक्त होऔं।",
        ),
        (
            "अ॒सौ यो॑-ऽव॒सर्प॑ति॒ नील॑ग्रीवो॒",
            "नीलग्रीव र विलोहित वर्णका उहाँ संसारमा विचरण गर्नुहुन्छ। गोठाला र पानी भर्नेहरूले उहाँलाई देखे; सबै भूतले देखे। देखिएपछि उहाँ हामीलाई सुख दिनुहुन्छ।",
        ),
        (
            "नमो॑ अस्तु॒ नील॑ग्रीवाय सहस्रा॒क्षाय॑",
            "नीलग्रीव, सहस्राक्ष र वर्षा गर्ने मीढुष्लाई नमस्कार। उहाँका अनुचरहरूलाई पनि मैले नमस्कार गरें।",
        ),
        (
            "प्रमुंच धन्वनस्त्वमुभयॊरार्त्नियॊर्ज्याम्",
            "हे भगवन्, धनुषका दुवै टुप्पाबाट प्रत्यञ्चा खोलिदिनुहोस्, र हातका बाणहरू हामीबाट टाढा फालिदिनुहोस्।",
        ),
        (
            "अ॒व॒तत्य॒ धनु॒स्त्वग्ं सह॑स्राक्ष॒",
            "हे सहस्राक्ष, सयौं बाण भएका प्रभु, धनुष झुकाउनुहोस्, बाणका टुप्पा भत्काउनुहोस्, र हामीप्रति शिव तथा सुमनस्क हुनुहोस्।",
        ),
        (
            "विज्य॒-न्धनुः॑ कप॒र्दिनो॒",
            "जटाधारी कपर्दीको धनुष विज्य (प्रत्यञ्चारहित) होस्, बाणविहीन होस्; उहाँका बाण र निषङ्ग पनि निष्क्रिय रहून्।",
        ),
        (
            "या ते॑ हे॒तिर्मी॑डुष्टम॒",
            "हे अत्यन्त कृपालु, तपाईंको हातको त्यो आयुध-धनुषले सबै दिशाबाट हामीलाई रोगरहित भई रक्षा गर्नुहोस्।",
        ),
        (
            "नम॑स्ते अ॒स्त्वायु॑धा॒याना॑तताय",
            "तपाईंको शक्तिशाली आयुधलाई नमस्कार। तपाईंका दुवै बाहु र धनुषलाई पनि नमस्कार।",
        ),
        (
            "परि॑ ते॒ धन्व॑नो हे॒तिर॒स्मान्",
            "तपाईंको धनुषका बाणहरूले सबै दिशाबाट हामीलाई छेडून्। तपाईंको तरकस हामीबाट टाढा राखिदिनुहोस्।",
        ),
        (
            "श्री शम्भ॑वे॒ नमः॑",
            "श्री शम्भुलाई नमस्कार। विश्वेश्वर, महादेव, त्र्यम्बक, त्रिपुरान्तक, त्रिकाग्निकाल, कालाग्निरुद्र, नीलकण्ठ, मृत्युञ्जय, सर्वेश्वर, सदाशिव, शङ्कर — श्रीमन् महादेवलाई नमस्कार।",
        ),
        (
            "नमो॒ हिर॑ण्य बाहवे",
            "स्वर्णबाहु सेनापति, दिशाका पतिलाई नमस्कार। हरिकेश वृक्षहरू र पशुपतिलाई नमस्कार। चम्किलो कपाल भएका पथपतिकलाई नमस्कार। भोजनका पति बभ्लुशलाई नमस्कार। यज्ञोपवीतधारी पुष्टिपतिलाई नमस्कार। भवको आयुध र जगत्पतिलाई नमस्कार। तानिएको धनुषधारी क्षेत्रपति रुद्रलाई नमस्कार। वनपति सूतलाई नमस्कार। रक्तवर्ण स्थपति र वृक्षपतिलाई नमस्कार। मन्त्री, वाणिज र कक्षपतिलाई नमस्कार। जल र औषधिका पतिलाई नमस्कार। चर्को घोष गर्ने पत्तीपतिलाई नमस्कार। वेगले दौडने सत्त्वपतिलाई नमस्कार।",
        ),
        (
            "नम॒-स्सह॑मानाय",
            "सहनशील र आव्याधिनीहरूका पतिलाई नमस्कार। चोरहरूका पति निषङ्गीलाई नमस्कार। तरकसधारी तस्करपतिलाई नमस्कार। ठग्ने र परिवञ्चक स्तायुपतिलाई नमस्कार। वनमा लुकी हिँड्ने अरण्यपतिलाई नमस्कार। राति काट्ने मुष्णतापतिलाई नमस्कार। खड्गधारी निशाचर प्रकृन्तापतिलाई नमस्कार। पगडीधारी गिरिचर कुलुञ्चपतिलाई नमस्कार। बाण र धनुषधारीहरूलाई नमस्कार। धनुष तान्ने र चढाउनेहरूलाई नमस्कार। बाण छाड्नेहरूलाई नमस्कार। बस्ने, सुत्ने, जाग्ने, उभिने र दौडनेहरूलाई नमस्कार। सभा र सभापतिहरूलाई नमस्कार। अश्व र अश्वपतिहरूलाई नमस्कार।",
        ),
        (
            "नम॑ आव्या॒धिनी᳚भ्यो",
            "घाउ पार्ने र बेधन गर्ने शक्तिहरूलाई नमस्कार। उग्र गण र प्रहार गर्नेहरूलाई नमस्कार। चतुरहरू र तिनका पतिलाई नमस्कार। व्रात, गण, विरूप र विश्वरूपलाई नमस्कार। महान् र क्षुल्लकलाई नमस्कार। रथी र अरथलाई, रथ र रथपतिलाई नमस्कार। सेना र सेनानायकलाई नमस्कार। सारथि र सङ्ग्रहीतालाई नमस्कार। तक्षक, रथकार, कुमाले, कर्मार, पुञ्जिष्ट, निषाद, इषुकार, धन्वकार, मृगयु, शिकारी कुकुर र श्वपतिहरूलाई नमस्कार।",
        ),
        (
            "भ॒वाय॑ च रु॒द्राय॑",
            "भव र रुद्रलाई नमस्कार। शर्व र पशुपतिलाई नमस्कार। नीलग्रीव र शितिकण्ठलाई नमस्कार। जटाधारी र मुण्डित केशलाई नमस्कार। सहस्राक्ष र शतधन्वलाई नमस्कार। गिरिश र शिपिविष्टलाई नमस्कार। अत्यन्त दाता र बाणधारीलाई नमस्कार। होचो र वामनलाई नमस्कार। विशाल र वर्षीयस्लाई नमस्कार। वृद्ध र बढ़्नेलाई नमस्कार। अग्र र प्रथमलाई नमस्कार। शीघ्र र वेगवानलाई नमस्कार। लहर र स्रोत, द्वीपमा बस्नेलाई नमस्कार।",
        ),
        (
            "ज्ये॒ष्ठाय॑ च कनि॒ष्ठाय॑",
            "ज्येष्ठ र कनिष्ठलाई नमस्कार। पूर्वज र अपरजलाई नमस्कार। मध्यम र अपगल्भलाई नमस्कार। जघन्य र बुध्नियलाई नमस्कार। शोभ्य र प्रतिसर्यलाई नमस्कार। याम्य र क्षेम्यलाई नमस्कार। उर्वर खेत र खलिहानलाई नमस्कार। यशस्वी र अन्त्यलाई नमस्कार। वन र झाडीलाई नमस्कार। श्रवण र प्रतिश्रवणलाई नमस्कार। शीघ्र सेना र शीघ्र रथलाई नमस्कार। शूर र शत्रुनाशकलाई नमस्कार। कवचधारी र ढालधारीलाई नमस्कार। श्रुत र श्रुतसेनालाई नमस्कार।",
        ),
        (
            "दुन्दु॒भ्या॑य चाहन॒न्या॑य",
            "नगाडा र युद्धनादलाई नमस्कार। धृष्ण र प्रमृशलाई नमस्कार। दूत र पठाइएकालाई नमस्कार। खड्गधारी र तरकसधारीलाई नमस्कार। तीक्ष्ण बाण र आयुधधारीलाई नमस्कार। स्वायुध र सुधन्वालाई नमस्कार। बाटो र पथलाई नमस्कार। किनारा र उपत्यकालाई नमस्कार। घाँस र ताललाई नमस्कार। नदी र पोखरीलाई नमस्कार। कुवा र खाडललाई नमस्कार। वर्षा र अनावृष्टिलाई नमस्कार। मेघ र विद्युत्लाई नमस्कार। घाम र तापलाई नमस्कार। बतास र कुहिरोलाई नमस्कार। घर र वास्तुपाललाई नमस्कार।",
        ),
        (
            "सोमा॑य च रु॒द्राय॑",
            "सोम र रुद्रलाई नमस्कार। ताम्र र अरुणलाई नमस्कार। शङ्ग र पशुपतिलाई नमस्कार। उग्र र भीमलाई नमस्कार। नजिक र टाढाबाट नाश गर्नेलाई नमस्कार। हन्ता र हनीयस्लाई नमस्कार। हरिकेश वृक्षहरूलाई नमस्कार। तारालाई नमस्कार। शम्भु र मयोभवलाई नमस्कार। शङ्कर र मयस्करलाई नमस्कार। शिव र शिवातरलाई नमस्कार। तीर्थ र किनारामा बस्नेलाई नमस्कार। पारी र वारिमा बस्नेलाई नमस्कार। तार्ने र उतार्नेलाई नमस्कार। आतार्य र आलाद्यलाई नमस्कार। घाँस र फेनलाई नमस्कार। बालुवा र प्रवाहलाई नमस्कार।",
        ),
        (
            "नम॑ इरि॒ण्या॑य च प्रप॒थ्या॑य च॒",
            "मरुभूमि र बाटोमा बस्नेलाई नमस्कार। कंकर र बस्तीमा बस्नेलाई नमस्कार। जटाधारी कपर्दी र पुलस्तिलाई नमस्कार। गोठ र घरमा बस्नेलाई नमस्कार। शय्या र गेहमा बस्नेलाई नमस्कार। काँडे झाडी र गुफामा बस्नेलाई नमस्कार। हृदय र निवासमा बस्नेलाई नमस्कार। धूलो र रजमा बस्नेलाई नमस्कार। सुक्खा र हरियो भूमिमा बस्नेलाई नमस्कार। लोप्य र उलप्यलाई नमस्कार। पृथ्वी र लहरमा बस्नेलाई नमस्कार। पात र पर्णशय्यामा बस्नेलाई नमस्कार। आक्रमण र प्रहार गर्नेलाई नमस्कार। पीडा दिने र सताउनेलाई नमस्कार। देवताका हृदय किरिकहरूलाई नमस्कार। क्षीण र अन्वेषकलाई नमस्कार। अजेय र अबाधलाई नमस्कार।",
        ),
        (
            "द्रापे॒ अन्ध॑सस्पते॒",
            "हे कष्टहर्ता, अन्नका पति, दरिद्र, नीललोहित! यी पुरुष र पशुहरूलाई नमारिदिनुहोस्, न रोग लगाइदिनुहोस्, यिनको केही पनि नष्ट नगर्नुहोस्।",
        ),
        (
            "या ते॑ रुद्र शि॒वा त॒नू-श्शि॒वा वि॒श्वाह॑भेषजी",
            "हे रुद्र, तपाईंको त्यो शिव तनु विश्वको औषधि हो। रुद्रको त्यही कल्याणकारी भेषजले हामीलाई बाँच्न सुख दिनुहोस्।",
        ),
        (
            "इ॒माग्ं रु॒द्राय॑ त॒वसे॑ कप॒र्दिने᳚",
            "शक्तिशाली, जटाधारी, वीरनाशक रुद्रलाई हामी मन अर्पण गर्छौं, ताकि यस ग्राममा दुईखुट्टे र चारखुट्टे सबै पुष्ट र निरोग रहून्।",
        ),
        (
            "मृ॒डा नो॑ रुद्रो॒त नो॒ मय॑स्कृधि",
            "हे रुद्र, हामीलाई सुख दिनुहोस्, कल्याण गर्नुहोस्। वीरनाशकलाई नमस्कार गर्छौं। पिता मनुले जुन शं र योस् मागे, तपाईंको मार्गदर्शनमा हामी त्यो पाऔं।",
        ),
        (
            "मा नो॑ म॒हान्त॑मु॒त मा नो॑ अर्भ॒क",
            "हाम्रा वृद्ध, बालक, युवा वा गर्भस्थलाई नमारिदिनुहोस्। पिता, माता र प्रियजनलाई नमारिदिनुहोस्। हे रुद्र, हाम्रो शरीरलाई पीडा नदिनुहोस्।",
        ),
        (
            "मा न॑स्तो॒के तन॑ये॒",
            "हाम्रा सन्तान, आयु, गाई र घोडालाई पीडा नदिनुहोस्। हे रुद्र, क्रोधमा आएर हाम्रा वीरहरूलाई नमारिदिनुहोस्। हवि लिएर हामी तपाईंलाई नमस्कार गर्छौं।",
        ),
        (
            "आ॒रात्ते॑ गो॒घ्न उ॒त पू॑रुष॒घ्ने",
            "टाढैबाट गाई र पुरुष नाश गर्ने वीरनाशकलाई हाम्रो सुम्न होस्। हे देव, हामीलाई रक्षा गर्नुहोस्, भन्नुहोस्, र दोहोरो शरण दिनुहोस्।",
        ),
        (
            "स्तु॒हि श्रु॒त-ङ्ग॑र्त॒सदं॒",
            "गुफामा बस्ने, युवा, मृगजस्तै भीम, उग्र रुद्रको स्तुति गर। स्तुति गर्दा, हे रुद्र, गाउनेलाई सुख देऊ; तपाईंका सेनाहरू अरूतिर जाऊन्, हामीतिर होइन।",
        ),
        (
            "परि॑णो रु॒द्रस्य॑ हे॒तिर्वृ॑णक्तु॒",
            "रुद्रको आयुधले हामीलाई छेडोस्, उहाँको तीक्ष्ण दुर्मतिले पनि। हे मीढ्वस्, धनीहरूका लागि स्थिर आयुध झुकाऊ, र सन्तानलाई सुख देऊ।",
        ),
        (
            "मीढु॑ष्टम॒ शिव॑तम",
            "हे अत्यन्त दाता, अत्यन्त शिव, हामीप्रति शिव र सुमनस्क हुनुहोस्। उच्चतम वृक्षमा आयुध राखेर, व्याघ्रचर्म ओढेर, पिनाक लिएर हामीकहाँ आउनुहोस्।",
        ),
        (
            "विकि॑रिद॒ विलो॑हित॒",
            "हे शत्रुलाई छर्ने विलोहित भगवन्, तपाईंलाई नमस्कार। तपाईंका हजारौं आयुध अरूतिर जाऊन्, हामीतिर होइन।",
        ),
        (
            "स॒हस्रा॑णि सहस्र॒धा बा॑हु॒वोस्तव॑",
            "तपाईंका बाहुमा हजारौं-हजार आयुध छन्। हे तिनका ईशान भगवन्, तिनका मुख हामीबाट टाढा फर्काइदिनुहोस्।",
        ),
        (
            "स॒हस्रा॑णि सहस्र॒शो ये रु॒द्रा",
            "पृथ्वीमा हजारौं-हजार रुद्र हुनुहुन्छ। उनीहरूका धनुष हामी हजार योजन टाढा राख्छौं।",
        ),
        (
            "अ॒स्मिन्म॑ह॒त्य॑र्ण॒वें",
            "यस विशाल अन्तरिक्ष-समुद्रमा भव बस्नुहुन्छ। नीलग्रीव, शितिकण्ठ शर्वहरू तल पृथ्वीमा विचरण गर्छन्।",
        ),
        (
            "दिवग्ं॑ रु॒द्रा उप॑श्रिताः",
            "आकाशमा नीलग्रीव शितिकण्ठ रुद्र बस्नुहुन्छ। वृक्षमा पहेंलो-रातो नीलग्रीव रुद्रहरू पनि हुनुहुन्छ।",
        ),
        (
            "ये भू॒ताना॒मधि॑पतयो",
            "भूतहरूका अधिपति, विशिख र कपर्दी रुद्रहरू; अन्न र पात्रमा बेधन गर्नेहरू; पथका रक्षक; तीर्थमा तरवार-बाण लिएर हिँड्नेहरू — यति र अझ बढी रुद्र सबै दिशामा फैलिएका छन्। उनीहरूका धनुष हामी हजार योजन टाढा राख्छौं। पृथ्वी, अन्तरिक्ष र द्यौसमा बस्ने, वायु-वर्षालाई बाण बनाउने रुद्रलाई पूर्व-दक्षिण-पश्चिम-उत्तर-माथि दस-दस नमस्कार। उनीहरू हामीलाई सुख देऊन्। जसलाई हामी द्वेष गर्छौं र जसले हामीलाई द्वेष गर्छ, त्यसलाई तपाईंका जबडामा राख्छौं।",
        ),
        (
            "त्र्य॑म्बकं-यँजामहे",
            "सुगन्धित र पुष्टिवर्धक त्र्यम्बकको हामी यजन गर्छौं। काँक्रो लहराबाट छुटेजस्तै मृत्युबाट मुक्त होऔं, अमृतबाट होइन।",
        ),
        (
            "यो रु॒द्रो अ॒ग्नौ यो अ॒प्सु",
            "जो रुद्र अग्नि, जल, ओषधि र सम्पूर्ण भुवनमा प्रवेश गर्नुभएको छ, त्यस रुद्रलाई नमस्कार। सुधन्वा र भेषजका स्वामीको स्तुति गरौं। यो हात भगवत् छ, विश्वभेषज र शिवाभिमर्शन छ। हे मृत्यु, तिम्रा हजार-अयुत पाश यज्ञको मायाले हामी हटाउँछौं। मृत्युलाई स्वाहा। ॐ, रुद्र-विष्णुलाई नमस्कार; मृत्युबाट मलाई रक्षा गर। प्राणको ग्रन्थि हो रुद्र, अन्तक भएर नछिर। यस अन्नले पुष्ट होऊ।",
        ),
        (
            "सदाशि॒वोम्",
            "सदाशिव ॐ। ॐ शान्तिः शान्तिः शान्तिः।",
        ),
    ]
    hits = [(needle, ne) for needle, ne in mapping if needle in sanskrit]
    if hits:
        return max(hits, key=lambda item: len(item[0]))[1]
    return meaning_en


def build_document(verses: list[dict]) -> dict:
    chapters_map: dict[int, list[dict]] = {}
    for verse in verses:
        chapters_map.setdefault(verse["chapter"], []).append(verse)

    # Fold the opening invocation into Anuvaka 1 so chapter numbers match tradition.
    if 0 in chapters_map:
        chapters_map[1] = chapters_map.pop(0) + chapters_map.get(1, [])

    chapters = []
    for number in sorted(chapters_map):
        title_ne, title_en = CHAPTER_TITLES.get(number, (f"अनुवाक {number}", f"Anuvaka {number}"))
        shlokas = []
        for i, verse in enumerate(chapters_map[number], start=1):
            verse_label = f"{number}.{i}"
            shlokas.append(
                {
                    "verse_number": i,
                    "verse_label": verse_label,
                    "sanskrit": verse["sanskrit"],
                    "transliteration": verse["transliteration"] or None,
                    "meaning_ne": nepali_for(verse["meaning_en"], verse["sanskrit"]) or None,
                    "meaning_en": verse["meaning_en"] or None,
                    "audio_file": None,
                }
            )
        chapters.append(
            {
                "number": number,
                "title_ne": title_ne,
                "title_en": title_en,
                "shlokas": shlokas,
            }
        )

    return {
        "slug": "sri-rudram",
        "order_index": 3,
        "category": "scripture",
        "title_sa": "श्रीरुद्रप्रश्नः",
        "title_ne": "श्री रुद्रम्",
        "title_en": "Sri Rudram",
        "subtitle_ne": "कृष्ण यजुर्वेद, तैत्तिरीय संहिता · ११ अनुवाक",
        "subtitle_en": "Krishna Yajurveda, Taittiriya Samhita · 11 Anuvakas",
        "description_ne": "रुद्र (शिव) लाई समर्पित वैदिक स्तोत्र — नमस्कारका सहस्र नाम र शान्त रूपको प्रार्थना। तैत्तिरीय संहिताको चौथो काण्ड, पाँचौं प्रपाठक (नमकम्)।",
        "description_en": "The Vedic hymn to Rudra (Shiva) — salutations to his thousand forms and a prayer for his peaceful aspect. From Taittiriya Samhita, Kanda 4, Prapathaka 5 (Namakam).",
        "source_ne": "कृष्ण यजुर्वेदीय तैत्तिरीय संहिता, चतुर्थ काण्ड, पञ्चम प्रपाठक",
        "source_en": "Krishna Yajurveda, Taittiriya Samhita 4.5 (Sri Rudra Prasna / Namakam)",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": True,
        "audio_prefix": "documents/sri-rudram",
        "full_audio_file": "sri-rudram.mp3",
        "chapters": chapters,
    }


def main() -> None:
    verses = parse_verses(SRC.read_text(encoding="utf-8"))
    missing = [v for v in verses if not v["meaning_en"] or not v["transliteration"]]
    print(f"parsed {len(verses)} verses")
    from collections import Counter

    counts = Counter(v["chapter"] for v in verses)
    for ch in sorted(counts):
        print(f"  chapter {ch}: {counts[ch]}")
    if missing:
        print(f"incomplete verses: {len(missing)}")
        for v in missing[:12]:
            print(" -", v["chapter"], v["sanskrit"][:80], "| iast:", bool(v["transliteration"]), "| en:", bool(v["meaning_en"]))
    doc = build_document(verses)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    print("chapters:", [(c["number"], len(c["shlokas"])) for c in doc["chapters"]])


if __name__ == "__main__":
    main()
