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

`bhaveshPhalaSupplementary` runs this the other way: its source is 100%
English (translation + analysis, no Nepali at all in any of the five
rounds), so its `ne`/`translationNe` fields are the ones mirroring the
English as translation debt, not the reverse — the only field in this
whole module where that's the case.
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
