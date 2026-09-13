"""Static, chart-independent bhava/graha reference content — graha-drishti
summaries, per-house theme text, bhavesh-phala lord-placement results,
karakatva + a full 12-house saravali table per graha, 2- and 3-planet yuti
(conjunction) rules, Lal Kitab per-house signals, and the Brighu Naadi
Sangraha sutra collection.

The source of truth is the checked-in ``data/bhava_reference.json``. The
first slice (graha-drishti, house themes, bhavesh-phala, one saravali
example per graha, Lal Kitab) was produced by
``dhakal-patro/scripts/extract-bhava-reference-content.mjs`` from the web
client's TS content files (same "extract from the web client into a
sibling-repo data/*.json" pattern as ``services/vastu_rules_db.py``).
The later additions (the full saravali table, `grahaYuti2`/`grahaYuti3`,
and `naadiSutras`) were authored directly against this backend from two
source documents (`vedic_astrology_app_data-v3.md` and
`bhrigu-naadi-sangraha-sutra.md`) — deliberately never duplicated into
either frontend, per the "put rules on the server, not the client" call
made after the first round of content went to both repos by hand.

`bhaveshPhala` was later re-sourced from `bphs_bhavesha_phaladhyaya.md` —
an actual transcription of BPHS chapter 13 (भावेशफलाध्यायः, "Bhavesha
Phaladhyaya"), with real shlokas — replacing most of the original
paraphrased Hindi-derived entries (which also mis-cited the source as
"chapter 27"; there was no real citation in the original text to check
against). Where a lord→house pair isn't covered by the chapter 13 text
(5 pairs, as of this writing — see git history for `bhaveshPhala`'s exact
gaps), the original paraphrased entry is kept as a fallback with `shloka:
null`.

Unlike the yoga catalog or vastu content, this data is looked up only by an
exact known key (a graha, a graha+house pair, or a sorted graha-pair id for
yuti) — never searched or filtered — so it's loaded straight into memory as
plain dicts rather than seeded into a SQLite table. It is reference data,
kept out of both the Postgres user store and the kundali report cache.

`lalKitabHouse` was later fully replaced — and `lalKitabSafetyTips`,
`lalKitabYuti`, `lalKitabBasics`, `lalKitabRinVichar`, `lalKitabVarshaphal`,
`lalKitabHealthSignals` and `lalKitabWealthVastu` added — by
``scripts/ingest_lal_kitab.py``, parsed from a 15-part, 788-rule Lal Kitab
source doc (sibling ``lal-kitab.md``). The last five of those are
chart-independent Lal Kitab guidance (not keyed by house), so they aren't
surfaced in the per-house detail dialog — kept here for a future general
Lal Kitab reference surface.

`rashiClassification`, `grahaExaltationDebilitation`,
`grahaNaturalFriendship`, `houseBodyPart`, `grahaAnimalBird`,
`grahaGrainMetalTaste`, `grahaRemedy`, `grahaManifestationAge`,
`lalKitabNapunsakNote` and `lalKitabTablesSource` were added by
``scripts/ingest_lal_kitab_tables.py``, hand-transcribed (not regex-parsed
— the source is compact tables, not prose) from a second Lal Kitab
submission's foundational-grammar section (sibling
``lal-kitab-foundational-tables.md``). Three sections of that submission
were skipped as literally redundant with content already ingested (same
system, near-identical text) — see that markdown file's header. One of the
three, the sustha/dustha rule, was WRONGLY skipped on the reasoning that
Phaladeepika's `grahaDusthaSusthaRule` already covered "the same idea" —
that was a mistake (comparing across two different systems, not within
Lal Kitab), corrected by `ingest_lal_kitab_revision.py` below. Like the
general Lal Kitab guidance above, `rashiClassification` through
`grahaManifestationAge` are chart-independent classifications rather than
predictions, so only `grahaManifestationAge` and `houseBodyPart` are
currently surfaced (small, directly relevant additions to the per-house
dialog); the rest await a future general reference surface.

`lalKitabSusthaDustha`, `lalKitabMahaSutraSummary` and
`lalKitabRevisionSource` were added, and `grahaRemedy` +
`grahaGrainMetalTaste`'s moon/rahu/ketu rows revised, by
``scripts/ingest_lal_kitab_revision.py`` — a follow-up citing "Source 9,
Jyotish Lal Kitab by B.M. Gosvami". `lalKitabSusthaDustha` is Lal Kitab's
OWN sustha/dustha mechanism (Pakka Ghar + exaltation/debilitation based)
and must stay conceptually separate from `grahaDusthaSusthaRule`
(Phaladeepika's classical 6-8-12 Dusthana logic) — never merge or treat
either as making the other redundant; they're different systems with
different rules that happen to share an English gloss ("well/ill-placed").
The `grahaRemedy` revision resolves a disagreement between two Lal-Kitab-
labeled submissions (not a Lal-Kitab-vs-Phaladeepika question) on a few
grahas' deities and Moon's metal — the newer, more specifically-cited pass
was taken as authoritative per explicit user direction; see git history on
`ingest_lal_kitab_tables.py` for the values it replaced.

`houseClassicalName`, `phaladeepikaKarakatva`, `phaladeepikaHouseResults`,
`grahaDusthaSusthaRule` and `phaladeepikaSource` were added by
``scripts/ingest_phaladeepika.py``, parsed from a real, cited Phaladeepika
source doc (sibling ``phaladeepika-navagraha-bhava-phala.md`` — ch. 2
karakatva verses with citations, author-attributed to Mantreshwara).
`phaladeepikaKarakatva` is a *second*, differently-sourced karakatva table
alongside the existing Uttara-Kalamrita-based `grahaKarakatva` — shown
together in the per-house dialog rather than one replacing the other.
`phaladeepikaHouseResults` only covers grahas sun through saturn (7): the
source itself states rahu/ketu's house result depends on rashi and drishti
and gives none, and for the same reason (Phaladeepika ch. 8's actual
verses weren't available to the source) these are traditional summaries,
not per-house shlokas — kept separate from `grahaHouseSaravali`, which does
have (differently-sourced) per-house shlokas. `grahaDusthaSusthaRule` is
chart-wide (combust/debilitated/enemy-sign/6-8-12-house => a graha can't
give its full result), not house-keyed.

`bhaveshPhalaSupplementary` and `bhaveshPhalaSupplementarySource` were
added by ``scripts/ingest_bhavesha_phala.py``, parsed from
``bhavesha-phala-collected.md`` (sibling) — five rounds of NotebookLM
extraction collected across a conversation, covering all 144 house-lord
placements (106 with a full shloka+IAST+translation+analysis, 38 with only
a short prose summary — see that markdown file's own "Status" section).
Deliberately kept separate from, not merged into, the existing
`bhaveshPhala` (an actual BPHS ch. 13 transcription, already 139/144 with
verified shlokas): this supplementary set's citations are less rigorous
("Source Image N" / "Source 16" references, inconsistent across rounds,
occasional verse reuse across houses) and it's sourced from a different
mix (BPHS + Phaladeepika, not cleanly attributed per entry). Shown as a
second citation in the per-house dialog, same pattern as
`phaladeepikaKarakatva` alongside `grahaKarakatva`.

Translation note: `naadiSutras`, `grahaYuti2`, `grahaYuti3`, the newly
added (non-12th-house) `grahaHouseSaravali` entries, the BPHS-sourced
`bhaveshPhala` entries, every `lalKitab*` field added by
`ingest_lal_kitab.py`, and every `phaladeepika*`/`grahaDusthaSusthaRule`
field added by `ingest_phaladeepika.py` currently have their `*En` field
set equal to the Nepali text — English translation for this content is a
known follow-up, not yet done (the one exception is `phaladeepikaKarakatva`'s
`shlokaSourceEn` and `houseClassicalName`'s `en`, which carry real English:
a transliterated chapter.verse citation for the former, real English house
names straight from the source for the latter). `houseInfo` and the
handful of `bhaveshPhala`/`grahaHouseSaravali` entries retained from the
original hand-authored round already carry real English.

`bhaveshPhalaSupplementary`'s source was 100% English (translation +
analysis, no Nepali at all in any of the five rounds), so it briefly ran
the translation-debt direction the other way (`ne`/`translationNe`
mirroring `en`/`translationEn`) until ``scripts/translate_bhavesh_
supplementary_ne.py`` hand-translated all 144 entries' `ne` and (where a
shloka exists) `translationNe` into real Nepali — this field no longer has
any translation debt. `translationNe`/`translationEn` stay empty strings
(not translated) for the 38 of 144 pairs that never had a shloka to
translate in the first place (Round 1's prose-only fallback).

`grahaHouseSaravali`'s sun/mars/venus/saturn/ketu entries were added by
``scripts/ingest_graha_saravali_phaladesh.py`` from user-supplied per-graha
"ग्रह फलादेश" markdown files (sibling ``graha-phaladesh-src/*.md``,
not committed here) — real Saravali/Jataka-Parijata/Phaladeepika-cited
content, replacing `grahaHouseSaravali`'s previous short, generically-
sourced ("वैदिक ज्योतिष सन्दर्भ") one-liners for those five grahas. Those
same source files' "भावेश फल"/"भावेश फलम्" sub-sections were briefly
ingested too, into two now-removed tables (`grahaBhaveshPhala`/
`grahaBhaveshPhalaSupplementary`, keyed by graha + house) — reverted once
it became clear they frame the graha as owning and occupying house N for
every N, which isn't a real (chart-independent) fact, unlike `bhaveshPhala`
/`bhaveshPhalaSupplementary`'s actual BPHS/collected-source house-lordship
data (keyed by house-ownership pairs, real for every ascendant). The
dialog surfaces that real data — computed per chart from `rashiLord` plus
`bhaveshPhala`/`bhaveshPhalaSupplementary`, exactly as the "भावेश सम्बन्ध"
section already did — inside the "ग्रह फलादेश" per-occupant card too now,
instead of the reverted tables. See ``ingest_graha_saravali_phaladesh.py``'s
module docstring for the full history. Jupiter/rahu are still pending
from the user for `grahaHouseSaravali` (mercury, venus and moon were
completed below).

`grahaHouseSaravali[graha][house]` was reshaped by
``scripts/ingest_sun_house_multi_source.py`` from a single classical
citation per house to `{house, houseTheme, rating, entries: [...]}`, where
`entries` holds one or more `{shloka, shlokaSourceNe/En, meaningNe/En,
explanationNe/En}` citations — `houseTheme`/`rating` moved up a level since
they describe the house placement itself, not any one citation of it. Sun's
table was corrected and completed at the same time: it now carries **two**
classical citations per house (सारावली/फलदीपिका/होरासार/जातक पारिजात, mixed
per house, matching a corrected user-supplied document) including a house 4
entry that didn't exist before (the dialog had force-hidden house 4 pending
this). Every other graha's existing single citation was wrapped as a
1-element `entries` list, unaffected in content.

``scripts/ingest_mercury_house_multi_source.py`` then completed mercury's
table from a differently-shaped user document: **four** classical citations
per house (सारावली, फलदीपिका, होरासार, जातक पारिजात — every source, every
house) followed by one unified अर्थ+व्याख्या reading covering all four
shlokas together, rather than a separate reading per shloka. To carry that
shape, `entries[].meaningNe/meaningEn/explanationNe/explanationEn` became
optional (absent for mercury's entries) and the table gained per-house
`summaryNe`/`summaryEn` fields for that unified reading — present exactly
when the entries carry no meaning of their own. Mercury's `rating` values
aren't from the source document (it doesn't label one); they're inferred
per house from that house's content sentiment, same rating vocabulary as
every other graha's table.

``scripts/ingest_venus_house_multi_source.py`` completed venus's table the
same way, from a शुक्र document shaped exactly like mercury's (four
citations per house + one unified summary, rating inferred from
sentiment) — also filling in house 4, which venus's previous table
(short, generic single citations) didn't have either.

``scripts/ingest_moon_house_multi_source.py`` completed moon's table from
a third document shape: a full फलदीपिका citation and a full होरासार
citation per house — each with its **own** meaningNe/explanationNe, sun's
style, not mercury/venus's meaning-less style — plus a third "सारावली
एवं जातक पारिजात दृष्टिकोण" paragraph that never cleanly separates which
words are सारावली's vs जातक पारिजात's and only occasionally quotes an
actual Sanskrit fragment inline, so it isn't a citable third `entries`
item; it goes into `summaryNe`/`summaryEn` instead — reusing that field
for "a reading not attached to one clean citation" rather than strictly
"the entries' only reading", which is why the dialog renders per-entry
meanings and the summary together without treating them as alternatives.
Unlike mercury/venus, moon's `rating` values are lifted directly from the
source document's own "शास्त्रीय फल श्रेणी" classification (not
sentiment-inferred). Also fills in house 4, which moon's previous
(short, generic) table didn't have. jupiter/rahu are still pending a
`grahaHouseSaravali` table of their own.
"""

from __future__ import annotations

import json
import threading
from functools import lru_cache
from typing import Any

from engine.astronomy.paths import bhava_reference_source_path

_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load() -> dict[str, Any]:
    with _lock:
        with bhava_reference_source_path().open("r", encoding="utf-8") as f:
            return json.load(f)


def bhava_reference_payload() -> dict[str, Any]:
    """The full reference blob, in the shape the frontend already expects
    (see dhakal-patro's src/lib/kundali/{graha-drishti,bhava-detail,
    bhavesh-phala,graha-karakatva,lal-kitab}.ts, which this mirrors)."""
    return _load()
