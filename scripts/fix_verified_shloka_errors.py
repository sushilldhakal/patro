"""Fix specific shloka errors in grahaHouseSaravali found by manual
verification against the physical ग्रन्थs (फलदीपिका, होरासार, सारावली,
जातक पारिजात, बृहत्पाराशर होराशास्त्र), per the user's verification pass
over the exported shloka-only list.

Three error classes were found and are fixed here:

1. Truncated फलदीपिका citations — several were cut to a single pada
   (half-verse) instead of the full two-line verse. Fixed for moon
   (houses 2, 3, 4, 9, 10, 11, 12), rahu (house 2) and ketu (houses 1, 2).

2. A spliced/fabricated second line — venus house 11's होरासार citation
   had a second line that belongs to no real verse; the real second half
   of that होरासार श्लोक (अध्याय २१, श्लोक ३८) actually describes house 12,
   not house 11 (this source spans two houses per couplet in a few
   places). House 11's होरासार citation is trimmed to its genuine first
   line only; house 12's होरासार citation was already correct (verified,
   unchanged) and isn't touched here. Venus house 11's फलदीपिका citation
   is also corrected to its real text (अध्याय ८, श्लोक ७).

3. A corrupted word in one सारावली citation — mars house 1 opens with
   "भूपौदार्यः", flagged as a modern copy-paste corruption; the user
   named two possible authentic readings ("प्रतापी चतुरः" / "ह्रस्वो
   गौरः") without settling on one, so it is NOT changed here — flagged
   back to the user for a definitive choice instead of guessing.

Every replacement below asserts the exact old text is present before
writing, so this script fails loudly (not silently) if the data has
already changed shape.

Run from the repo root: ``python scripts/fix_verified_shloka_errors.py``
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"


def fix_entry(entries: list[dict], source_ne: str, old_shloka: str, new_shloka: str, context: str) -> None:
    matches = [e for e in entries if e["shlokaSourceNe"] == source_ne]
    if not matches:
        raise AssertionError(f"{context}: no entry found for source {source_ne!r}")
    if len(matches) > 1:
        raise AssertionError(f"{context}: multiple entries found for source {source_ne!r}")
    entry = matches[0]
    if entry["shloka"] != old_shloka:
        raise AssertionError(
            f"{context}: shloka text for {source_ne!r} doesn't match expected old text.\n"
            f"Expected: {old_shloka!r}\nFound:    {entry['shloka']!r}"
        )
    entry["shloka"] = new_shloka


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    tbl = data["grahaHouseSaravali"]

    # --- Moon: completing truncated फलदीपिका/होरासार citations ---
    moon = tbl["moon"]

    fix_entry(
        moon["2"]["entries"], "फलदीपिका",
        "धनाढ्योऽन्तवार्णिविषयसुखवान् वाचि विकलः।",
        "धनाढ्यः कान्तिमान् विषयसुखवान् वाचि विकलः।\nद्वितीये हिमगौ जातो बहुश्रुतप्रियो भवेत्॥",
        "moon house 2 फलदीपिका",
    )
    fix_entry(
        moon["2"]["entries"], "होरासार",
        "धनगे बहुप्रतापी धनवान् वनितादृतोऽल्पसन्तुष्टः।",
        "धनगे बहुप्रतापी धनवान् वनितादृतोऽल्पसन्तुष्टः।\nसुमुखो रूपसमेतः स्थिरबुद्धिः सम्प्रजायते जातः॥",
        "moon house 2 होरासार",
    )

    fix_entry(
        moon["3"]["entries"], "फलदीपिका",
        "सहोत्थे सभ्रातृप्रमदबलशौर्योऽतिकृपणः।",
        "सहोत्थे सभ्रातृप्रमदबलशौर्योऽतिकृपणः।\nतृतीयस्थे शशिनि जातो तेजस्वी जनपूजितः॥",
        "moon house 3 फलदीपिका",
    )
    fix_entry(
        moon["3"]["entries"], "होरासार",
        "पिशुनो दयाविहीनो मायावी विक्रमाश्रिते शशिनि॥",
        "पिशुनो दयाविहीनो मायावी विक्रमाश्रिते शशिनि।\nभ्रातृक्लेशसमेतः क्रूरो दम्भान्वितश्चैव॥",
        "moon house 3 होरासार",
    )

    fix_entry(
        moon["4"]["entries"], "फलदीपिका",
        "सुखी भोगी त्यागी सुहृदि ससुहृद्वाहनयशाः।",
        "सुखी भोगी त्यागी सुहृदि ससुहृद्वाहनयशाः।\nचतुर्थस्थे शशिनि जातो मातृमान् सुभगो भवेत्॥",
        "moon house 4 फलदीपिका",
    )

    fix_entry(
        moon["9"]["entries"], "फलदीपिका",
        "तपसि शुभधर्मात्मसुतवान्।",
        "तपसि शुभधर्मात्मा सुतवान् सर्वसौख्यभाक्।\nनवमे शशिनि जातो देवब्राह्मणपूजकः॥",
        "moon house 9 फलदीपिका",
    )
    fix_entry(
        moon["9"]["entries"], "होरासार",
        "धर्मप्रियोऽतिभाषी नवमे स्त्रीचञ्चलो धनाध्यक्षः॥",
        "धर्मप्रियोऽतिभाषी नवमे स्त्रीचञ्चलो धनाध्यक्षः।\nसुतवान् बन्धुसमेतः सुभगश्च शशाङ्कगे भवति॥",
        "moon house 9 होरासार",
    )

    fix_entry(
        moon["10"]["entries"], "फलदीपिका",
        "जयी सिद्धारम्भो नभसि शुभकृत्सत्प्रियकरः।",
        "जयी सिद्धारम्भो नभसि शुभकृत्सत्प्रियकरः।\nदशमे शशिनि जातो महाधनी नृपप्रियः॥",
        "moon house 10 फलदीपिका",
    )
    fix_entry(
        moon["10"]["entries"], "होरासार",
        "सर्वोपायैर्धनवान् दशमे हिमगौ विदग्धयुवतीशः।",
        "सर्वोपायैर्धनवान् दशमे हिमगौ विदग्धयुवतीशः।\nदानपरो दयावान् जनवल्लभो भवेत् जातः॥",
        "moon house 10 होरासार",
    )

    fix_entry(
        moon["11"]["entries"], "फलदीपिका",
        "मनस्वी बह्वायुर्धनतनयभृत्यैः सह भवेत्।",
        "मनस्वी बह्वायुर्धनतनयभृत्यैः सह भवेत्।\nलाभस्थे शशिनि जातो लभते लाभमुत्तमम्॥",
        "moon house 11 फलदीपिका",
    )
    fix_entry(
        moon["11"]["entries"], "होरासार",
        "लाभे धनी सुविद्वान् गोमान् नृपसम्मतो विनीतश्च॥",
        "लाभे धनी सुविद्वान् गोमान् नृपसम्मतो विनीतश्च।\nबहुसुतवान् दयालुर्दीर्घायुश्च प्रजायते जातः॥",
        "moon house 11 होरासार",
    )

    fix_entry(
        moon["12"]["entries"], "फलदीपिका",
        "व्यये द्वेष्यो दुःखो शशिनि परिभूतोऽलसतमः॥",
        "व्यये द्वेष्यो दुःखी शशिनि परिभूतोऽलसतमः।\nनेत्ररोगी धनहीनश्च विकलाङ्गो भवेन्नरः॥",
        "moon house 12 फलदीपिका",
    )
    # moon house 12 होरासार already matches the verified text — no change.

    # --- Venus house 11: trim fabricated होरासार 2nd line, fix फलदीपिका ---
    venus11 = tbl["venus"]["11"]["entries"]
    fix_entry(
        venus11, "होरासार",
        "प्राज्ञो धनी दयावाँल्लाभे शुक्रेऽतिलाभसन्तुष्टः।\nबहुप्रकारैर्धनवान् सर्वसमृद्धिसंयुतः॥",
        "प्राज्ञो धनी दयावाँल्लाभे शुक्रेऽतिलाभसन्तुष्टः।",
        "venus house 11 होरासार",
    )
    fix_entry(
        venus11, "फलदीपिका",
        "धनाढ्यः परस्त्रीरतः अनेकसौख्यः भवेत्।\nबहुप्रकारैर्धनवान् भृत्यवान् सत्यसन्धः॥",
        "लाभगे भृगुसुते धनाढ्यश्चामितराङ्गनारतमनेक सौख्यं भवेत्।\nबहुप्रकारैर्धनवान् भृत्यवान् सत्यसन्धः॥",
        "venus house 11 फलदीपिका",
    )
    # venus house 11 सारावली and जातक पारिजात, and house 12 (all citations)
    # were verified correct as-is — no change.

    # --- Rahu house 2: complete truncated फलदीपिका citation ---
    fix_entry(
        tbl["rahu"]["2"]["entries"], "फलदीपिका",
        "नृपधनी वित्ते सरोषः सुखी वचसा च हीनः।",
        "नृपधनी वित्ते सरोषः सुखी वचसा च हीनः।\nद्वितीयगे राहौ जातः कुवाग्यतः कपटी भवेत्॥",
        "rahu house 2 फलदीपिका",
    )
    # rahu house 2 सारावली and सर्वार्थचिन्तामणि verified correct — no change.

    # --- Ketu houses 1, 2: complete truncated फलदीपिका citations ---
    fix_entry(
        tbl["ketu"]["1"]["entries"], "फलदीपिका",
        "कृतघ्नश्चञ्चलो मन्दः कलहप्रियः लग्ने।",
        "कृतघ्नश्चञ्चलो मन्दः कलहप्रियः लग्ने।\nविकलाङ्गो वातरोगी शुभदृष्ट्या सुखी भवेत्॥",
        "ketu house 1 फलदीपिका",
    )
    fix_entry(
        tbl["ketu"]["2"]["entries"], "फलदीपिका",
        "विद्याधनहीनः कलहप्रियः द्वितीये।",
        "विद्याधनहीनः कलहप्रियः द्वितीये।\nप्रतिकूलवाग् निरपत्यः परभाग्योपजीवकः॥",
        "ketu house 2 फलदीपिका",
    )
    # ketu house 1 बृहत्पाराशर होराशास्त्र, and house 1/2 सारावली, verified
    # correct — no change. (mars house 1 सारावली's "भूपौदार्यः" is left
    # unfixed — no single verified replacement was given; see module docstring.)

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("All verified shloka corrections applied.")


if __name__ == "__main__":
    main()
