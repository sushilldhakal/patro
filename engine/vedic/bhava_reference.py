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

Unlike the yoga catalog or vastu content, this data is looked up only by an
exact known key (a graha, a graha+house pair, or a sorted graha-pair id for
yuti) — never searched or filtered — so it's loaded straight into memory as
plain dicts rather than seeded into a SQLite table. It is reference data,
kept out of both the Postgres user store and the kundali report cache.

Translation note: `naadiSutras`, `grahaYuti2`, `grahaYuti3`, and the newly
added (non-12th-house) `grahaHouseSaravali` entries currently have their
`*En` field set equal to the Nepali text — English translation for this
batch is a known follow-up, not yet done. Every other field in this payload
(graha-drishti, houseInfo, bhaveshPhala, the pre-existing house-12 saravali
entries, lalKitabHouse) already carries real English.
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
