"""Ingest Lal Kitab's foundational classical-astrology reference tables
into data/bhava_reference.json — rashi classification, exaltation/
debilitation degrees, natural planetary friendship, Kalapurusha body
parts, graha animals/birds, grains/metals/tastes, remedies, and the
age-of-manifestation table.

Source: a submission titled "सम्पूर्ण लाल किताब — १५ भाग / ७८८ सूत्र",
archived verbatim at ``../../lal-kitab-foundational-tables.md`` (sibling to
this repo) — see that file's header for what was deliberately left out
(three sections that duplicate content already ingested by
``ingest_lal_kitab.py`` and ``ingest_phaladeepika.py``) and why.

These tables are chart-independent and mostly NOT house/graha-in-this-chart
specific (they're foundational classifications, not predictions), so unlike
this repo's other reference content they're hand-transcribed directly into
Python dicts here rather than regex-parsed from markdown — the source is
compact tables, not prose, and transcription is the lower-risk path for
tabular data. Values were cross-checked against standard Parashari
classical astrology (exaltation degrees, natural friendship) and match
textbook figures.

Only `grahaManifestationAge` and the Kalapurusha `houseBodyPart` map are
currently surfaced in the per-house detail dialog (small, directly
relevant additions); the rest are stored for a future general "classical
reference" page — see this session's conversation for that open item.

Run from the repo root: ``python scripts/ingest_lal_kitab_tables.py``
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"


def bilingual(ne: str) -> dict[str, str]:
    return {"ne": ne, "en": ne}


RASHI_NE = [
    "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

RASHI_CLASSIFICATION_ROWS = [
    ("चर", "द्वार", "धातु", "क्रूर/विषम", "पूर्व"),
    ("स्थिर", "बहि", "मूल", "सौम्य/सम", "दक्षिण"),
    ("द्विस्वभाव", "गर्भ", "जीव", "क्रूर/विषम", "पश्चिम"),
    ("चर", "द्वार", "धातु", "सौम्य/सम", "उत्तर"),
    ("स्थिर", "बहि", "मूल", "क्रूर/विषम", "पूर्व"),
    ("द्विस्वभाव", "गर्भ", "जीव", "सौम्य/सम", "दक्षिण"),
    ("चर", "द्वार", "धातु", "क्रूर/विषम", "पश्चिम"),
    ("स्थिर", "बहि", "मूल", "सौम्य/सम", "उत्तर"),
    ("द्विस्वभाव", "गर्भ", "जीव", "क्रूर/विषम", "पूर्व"),
    ("चर", "द्वार", "धातु", "सौम्य/सम", "दक्षिण"),
    ("स्थिर", "बहि", "मूल", "क्रूर/विषम", "पश्चिम"),
    ("द्विस्वभाव", "गर्भ", "जीव", "सौम्य/सम", "उत्तर"),
]

EXALTATION_DEBILITATION = {
    "sun": ("मेष", "१०°", "तुला", "१०°"),
    "moon": ("वृष", "३°", "वृश्चिक", "३°"),
    "mars": ("मकर", "२८°", "कर्कट", "२८°"),
    "mercury": ("कन्या", "१५°", "मीन", "१५°"),
    "jupiter": ("कर्कट", "५°", "मकर", "५°"),
    "venus": ("मीन", "२७°", "कन्या", "२७°"),
    "saturn": ("तुला", "२०°", "मेष", "२०°"),
}

NATURAL_FRIENDSHIP = {
    "sun": (["moon", "mars", "jupiter"], ["mercury"], ["venus", "saturn"]),
    "moon": (["sun", "mercury"], ["mars", "jupiter", "venus", "saturn"], []),
    "mars": (["sun", "moon", "jupiter"], ["venus", "saturn"], ["mercury"]),
    "mercury": (["sun", "venus"], ["mars", "jupiter", "saturn"], ["moon"]),
    "jupiter": (["sun", "moon", "mars"], ["saturn"], ["mercury", "venus"]),
    "venus": (["mercury", "saturn"], ["mars", "jupiter"], ["sun", "moon"]),
    "saturn": (["mercury", "venus"], ["jupiter"], ["sun", "moon", "mars"]),
}

HOUSE_BODY_PART_NE = [
    "सिर", "चेहरा (अनुहार र दाहिने आँखा)", "छाती र दाहिने हात", "हृदय",
    "जठर (पेट)", "कटी (कम्मर)", "बस्ति (तल्लो पेट/मूत्रथैली)",
    "प्रजनन् (गुप्त अंग)", "उरु (जाँघ)", "जानु (घुँडा)", "जंघा (पिँडौला)",
    "पदद्वय (दुवै खुट्टा)",
]

GRAHA_ANIMAL_BIRD = {
    "sun": ("सिंह, व्याघ्र", "चकोर"),
    "moon": ("हरिण (मृग), खरायो", "बकुल्ला, चकोर"),
    "mars": ("बाँदर, भेँडा", "गिद्ध"),
    "mercury": ("बिरालो", "सुगा (तोता), गरुड"),
    "jupiter": ("घोडा", "परेवा, हाँस"),
    "venus": ("गाई, भैँसी", "मयूर, सुगा"),
    "saturn": ("हात्ती", "काग, कोइली"),
    "rahu": ("गधा, ऊँट, ब्वाँसो", "लाटोकोसेरो"),
    "ketu": ("गधा, ऊँट, ब्वाँसो", "लाटोकोसेरो"),
}

GRAHA_GRAIN_METAL_TASTE = {
    "sun": ("गहुँ", "तामा", "तीतो"),
    "moon": ("चामल", "काँसो", "नुनिलो"),
    "mars": ("मुसुरो", "तामा", "पिरो"),
    "mercury": ("मुगी", "सीसा", "मिश्रित"),
    "jupiter": ("चना", "सुन", "गुलियो"),
    "venus": ("सेतो मुगी (सिमी)", "चाँदी", "अमिलो"),
    "saturn": ("तिल", "फलाम", "टर्रो"),
    "rahu": ("मास (उड़द)", "सीसा", None),
    "ketu": ("मास", None, None),
}

GRAHA_REMEDY = {
    "sun": ("शिव", "कलिंग देश"),
    "moon": ("अम्बा (पार्वती)", "यवन देश"),
    "mars": ("कार्तिक स्वामी", "अवन्ती देश"),
    "mercury": ("विष्णु", "मगध देश"),
    "jupiter": ("ब्रह्मा", "सिन्धु देश"),
    "venus": ("लक्ष्मी", "कीकट देश"),
    "saturn": ("यमराज", "सौराष्ट्र देश"),
    "rahu": ("शेषनाग/ब्रह्मा", "अम्बर/पर्वत क्षेत्र"),
    "ketu": ("शेषनाग/ब्रह्मा", "अम्बर/पर्वत क्षेत्र"),
}

GRAHA_MANIFESTATION_AGE = {
    "sun": 50, "moon": 70, "mars": 16, "mercury": 20, "jupiter": 30,
    "venus": 7, "saturn": 100, "rahu": 100, "ketu": 100,
}

NAPUNSAK_NOTE_NE = (
    "बुध, शनि र केतुलाई लाल किताबमा \"नपुंसक\" (eunuch/neuter) ग्रह मानिन्छ — "
    "अन्य ग्रहसँग युति हुँदा यिनीहरूले आफ्नो स्वभाव उल्लेखनीय रूपमा बदल्न "
    "सक्छन्; विशेष गरी बुध-शनि संयोगले \"मिश्रित\" (मसनुई) शक्ति उत्पन्न "
    "गर्छ जसले कुण्डलीको निर्णायक फल दिन्छ भन्ने मानिन्छ।"
)

LAL_KITAB_TABLES_SOURCE = (
    "लाल किताब — आधारभूत व्याकरण र सिद्धान्त (राशि वर्गीकरण, उच्च-नीच अंश, "
    "नैसर्गिक मैत्री, कालपुरुष, पशुपक्षी, अन्न-धातु-स्वाद, उपचार, उन्नतिको उमेर)"
)


def main() -> None:
    rashi_classification = {}
    for i, rashi_ne in enumerate(RASHI_NE):
        gati, dwar, tattva, guna, disha = RASHI_CLASSIFICATION_ROWS[i]
        rashi_classification[str(i + 1)] = {
            "rashiNe": rashi_ne,
            "gatiNe": gati,
            "dwarNe": dwar,
            "tattvaNe": tattva,
            "gunaNe": guna,
            "dishaNe": disha,
        }

    exaltation_debilitation = {}
    for graha, (exalt_rashi, exalt_deg, debil_rashi, debil_deg) in EXALTATION_DEBILITATION.items():
        exaltation_debilitation[graha] = {
            "exaltRashiNe": exalt_rashi,
            "exaltDegree": exalt_deg,
            "debilRashiNe": debil_rashi,
            "debilDegree": debil_deg,
        }

    natural_friendship = {}
    for graha, (friends, neutral, enemies) in NATURAL_FRIENDSHIP.items():
        natural_friendship[graha] = {"friends": friends, "neutral": neutral, "enemies": enemies}

    house_body_part = {str(i + 1): bilingual(part) for i, part in enumerate(HOUSE_BODY_PART_NE)}

    graha_animal_bird = {
        graha: {"animalNe": animal, "birdNe": bird}
        for graha, (animal, bird) in GRAHA_ANIMAL_BIRD.items()
    }

    graha_grain_metal_taste = {
        graha: {"grainNe": grain, "metalNe": metal, "tasteNe": taste}
        for graha, (grain, metal, taste) in GRAHA_GRAIN_METAL_TASTE.items()
    }

    graha_remedy = {
        graha: {"deityNe": deity, "regionNe": region}
        for graha, (deity, region) in GRAHA_REMEDY.items()
    }

    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["rashiClassification"] = rashi_classification
    data["grahaExaltationDebilitation"] = exaltation_debilitation
    data["grahaNaturalFriendship"] = natural_friendship
    data["houseBodyPart"] = house_body_part
    data["grahaAnimalBird"] = graha_animal_bird
    data["grahaGrainMetalTaste"] = graha_grain_metal_taste
    data["grahaRemedy"] = graha_remedy
    data["grahaManifestationAge"] = GRAHA_MANIFESTATION_AGE
    data["lalKitabNapunsakNote"] = bilingual(NAPUNSAK_NOTE_NE)
    data["lalKitabTablesSource"] = LAL_KITAB_TABLES_SOURCE

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"rashiClassification: {len(rashi_classification)}")
    print(f"grahaExaltationDebilitation: {len(exaltation_debilitation)}")
    print(f"grahaNaturalFriendship: {len(natural_friendship)}")
    print(f"houseBodyPart: {len(house_body_part)}")
    print(f"grahaAnimalBird: {len(graha_animal_bird)}")
    print(f"grahaGrainMetalTaste: {len(graha_grain_metal_taste)}")
    print(f"grahaRemedy: {len(graha_remedy)}")
    print(f"grahaManifestationAge: {len(GRAHA_MANIFESTATION_AGE)}")


if __name__ == "__main__":
    main()
