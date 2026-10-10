"""Second Lal Kitab revision pass, keyed strictly to Lal Kitab's own logic —
never cross-checked against Phaladeepika/BPHS content for "redundancy" (an
earlier round wrongly did that once; see bhava_reference.py's docstring).

Source: user-provided resolution citing "Source 9 (Jyotish Lal Kitab by
B.M. Gosvami)", covering two things the previous Lal Kitab tables round
either got wrong or left out entirely:

1. Lal Kitab's own Sustha/Dustha (well-placed/ill-placed) mechanism, which
   runs on Pakka Ghar (fixed house) and exaltation/debilitation — NOT the
   classical 6-8-12 Dusthana logic `grahaDusthaSusthaRule` (Phaladeepika)
   uses. Added as `lalKitabSusthaDustha`, a standalone list of rule
   statements, deliberately not merged with or compared to the Phaladeepika
   rule.

2. A revised graha-remedy deity table. The previous round's `grahaRemedy`
   values (from an earlier, different Lal Kitab submission) disagreed with
   this one on several grahas (moon, mars, saturn, rahu, ketu) — both
   submissions self-identified as Lal Kitab, so this isn't a
   Lal-Kitab-vs-Phaladeepika question, just two passes at the same system
   giving different specifics. Per explicit user direction, this newer,
   more specifically-cited pass wins; `grahaRemedy` and the Moon row of
   `grahaGrainMetalTaste` are patched in place (not re-derived from
   scratch, so region/grain/taste values the new source didn't touch are
   left alone).

Also adds the पितृ ऋण (ancestral debt) identifying criterion to
`lalKitabRinVichar`, and the 10 closing aphorisms (from the same
conversation, given in full there — this round's message only gestured at
two of them by example without full text, so those two aren't ingested)
as a new `lalKitabMahaSutraSummary`.

Run from the repo root: ``python scripts/ingest_lal_kitab_revision.py``
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"


def bilingual(ne: str) -> dict[str, str]:
    return {"ne": ne, "en": ne}


SUSTHA_DUSTHA_RULES_NE = [
    "लाल किताबमा ग्रहको 'सुस्थ' वा 'दुःस्थ' अवस्था शास्त्रीय षष्ठ-अष्टम-द्वादश (त्रिक) भावको आधारमा हैन, ग्रहको 'पक्का घर' (Fixed House) र उच्च/नीच राशिको आधारमा निर्धारण हुन्छ।",
    "सुस्थ (शुभ): ग्रह आफ्नो पक्का घरमा वा उच्च राशिमा भएमा सुस्थ मानिन्छ — जस्तै बृहस्पति भाव २, ५, ९, ११ र १२ मा सुस्थ हुन्छ।",
    "दुःस्थ (अशुभ): ग्रह आफ्नो नीच राशिमा वा आफ्नो शत्रुको पक्का घरमा भएमा दुःस्थ मानिन्छ — जस्तै सूर्य भाव ६, ७ वा १० मा अशुभ मानिन्छ।",
    "द्वितीय भावको अपवाद: लाल किताबमा कुनै पनि ग्रह द्वितीय भावमा नीच मानिँदैन — यो राहु-केतुको साझा स्थान भएकाले ग्रहहरूले यहाँ आफ्नो स्वतन्त्र फल दिन्छन्, बल गुमाउँदैनन्।",
    "प्रभावकारिता (Effective %): केन्द्र भाव (१, ४, ७, १०) मा ग्रह १००% प्रभावकारी हुन्छ ('सिंहासनमा'); भाव २, ६, ८ र १२ मा ग्रह जम्मा २५% मात्र प्रभावकारी हुन्छ ('नातेदारको सहारामा')।",
]

RIN_VICHAR_ADDITION_NE = (
    "पितृ ऋणको पहिचान: सूर्य वा चन्द्रमालाई राहु, केतु वा शनिले पीडित (युति वा दृष्टि) गरेमा त्यो पितृ ऋणको प्रमुख संकेत मानिन्छ।"
)

MAHA_SUTRA_SUMMARY_NE = [
    "बृहस्पति र शनिको गतिमा जीवनको गहिरो रहस्य लुकेको हुन्छ; यिनीहरूको 'बक्र' दृष्टिले अचानक ठूलो परिवर्तन ल्याउँछ।",
    "यदि मंगल बलवान् छ भने जातक 'रणशूर' र 'सेनापति' समान पराक्रमी हुन्छ।",
    "चन्द्र र बुधको खराब सम्बन्धले 'मतिभ्रम' र मानसिक रोग पैदा गर्दछ।",
    "'पितृ ऋण' को समाधान नगरेसम्म भाग्यको ढोका खोल्न कठिन हुन्छ।",
    "उच्चको ग्रहले राजा समान वैभव दिन्छ भने नीचको ग्रहले सङ्घर्ष।",
    "बृहस्पति बलवान् हुनु नै सबैभन्दा ठूलो 'रक्षा कवच' हो।",
    "शनि यदि अष्टममा भए जातकको आयु लामो हुन्छ तर उसले 'श्रमजीवी' हुनुपर्छ।",
    "सूर्य र मंगलको युतिले जातकलाई समाजमा 'प्रभावी' तर 'अहङ्कारी' बनाउन सक्छ।",
    "ग्रहको उमेर (Maturity Age) अनुसार नै जीवनका ठूला उपलब्धि प्राप्त हुन्छन्।",
    "उपाय गर्दा 'श्रद्धा' र 'सात्त्विक आहार' को पालना अनिवार्य छ।",
]

# Deity revisions — only grahas the new source actually gave a value for.
REMEDY_DEITY_REVISIONS_NE = {
    "moon": "शिव",
    "mars": "हनुमान",
    "saturn": "भैरव",
    "rahu": "सरस्वती",
    "ketu": "गणेश",
    "mercury": "दुर्गा (कन्या सेवा)",
    # jupiter already "ब्रह्मा" — new source agrees, no change.
}

MOON_METAL_REVISION_NE = "चाँदी"
RAHU_METAL_NOTE_NE = "नीलम/सीसा"
KETU_ITEM_NOTE_NE = "मिश्रित कालो-सेतो कम्बल दान"

REVISION_SOURCE = (
    "ज्योतिष लाल किताब (बि.एम. गोस्वामी) — लाल किताबको विशिष्ट सुस्थ/दुःस्थ "
    "सिद्धान्त र परिमार्जित उपचार-देवता तालिका।"
)


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["lalKitabSusthaDustha"] = [bilingual(ne) for ne in SUSTHA_DUSTHA_RULES_NE]
    data["lalKitabMahaSutraSummary"] = [bilingual(ne) for ne in MAHA_SUTRA_SUMMARY_NE]
    data["lalKitabRinVichar"].append(bilingual(RIN_VICHAR_ADDITION_NE))

    for graha, deity in REMEDY_DEITY_REVISIONS_NE.items():
        data["grahaRemedy"][graha]["deityNe"] = deity

    data["grahaGrainMetalTaste"]["moon"]["metalNe"] = MOON_METAL_REVISION_NE
    data["grahaGrainMetalTaste"]["rahu"]["metalNe"] = RAHU_METAL_NOTE_NE
    data["grahaGrainMetalTaste"]["ketu"]["grainNe"] = KETU_ITEM_NOTE_NE

    data["lalKitabRevisionSource"] = REVISION_SOURCE

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"lalKitabSusthaDustha: {len(data['lalKitabSusthaDustha'])} rules")
    print(f"lalKitabMahaSutraSummary: {len(data['lalKitabMahaSutraSummary'])} aphorisms")
    print(f"lalKitabRinVichar: {len(data['lalKitabRinVichar'])} entries (was 6)")
    print(f"grahaRemedy deities revised: {list(REMEDY_DEITY_REVISIONS_NE.keys())}")
    print("grahaGrainMetalTaste: moon metal -> चाँदी, rahu metal note, ketu item note")


if __name__ == "__main__":
    main()
