"""Nepal Bikram Sambat samvatsara (60-year Jovian cycle) names.

Uses true Jupiter at Mesh Sankranti (Nepal Panchanga Nirnayak Samiti convention),
including kshaya (skipped) years such as BS 2081 where Kalayukta is omitted and
Siddharthi is used instead.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from engine.vedic.bikram_sambat import get_bs_month_start
from engine.vedic.sankranti import find_mesh_sankranti

SAMVATSARA_ENTRIES: tuple[dict[str, str | int], ...] = (
    {"key": "prabhava", "name_en": "Prabhava", "name_ne": "प्रभव", "cycle": 1, "deity": "brahma"},
    {"key": "vibhava", "name_en": "Vibhava", "name_ne": "विभव", "cycle": 2, "deity": "brahma"},
    {"key": "shukla", "name_en": "Shukla", "name_ne": "शुक्ल", "cycle": 3, "deity": "brahma"},
    {"key": "pramoda", "name_en": "Pramoda", "name_ne": "प्रमोद", "cycle": 4, "deity": "brahma"},
    {"key": "prajapati", "name_en": "Prajapati", "name_ne": "प्रजापति", "cycle": 5, "deity": "brahma"},
    {"key": "angira", "name_en": "Angira", "name_ne": "अङ्गिरा", "cycle": 6, "deity": "brahma"},
    {"key": "shrimukha", "name_en": "Shrimukha", "name_ne": "श्रीमुख", "cycle": 7, "deity": "brahma"},
    {"key": "bhava", "name_en": "Bhava", "name_ne": "भाव", "cycle": 8, "deity": "brahma"},
    {"key": "yuva", "name_en": "Yuva", "name_ne": "युव", "cycle": 9, "deity": "brahma"},
    {"key": "dhatri", "name_en": "Dhatri", "name_ne": "धात्री", "cycle": 10, "deity": "brahma"},
    {"key": "ishvara", "name_en": "Ishvara", "name_ne": "ईश्वर", "cycle": 11, "deity": "brahma"},
    {"key": "bahudhanya", "name_en": "Bahudhanya", "name_ne": "बहुधान्य", "cycle": 12, "deity": "brahma"},
    {"key": "pramathi", "name_en": "Pramathi", "name_ne": "प्रमाथी", "cycle": 13, "deity": "brahma"},
    {"key": "vikrama", "name_en": "Vikrama", "name_ne": "विक्रम", "cycle": 14, "deity": "brahma"},
    {"key": "vrisha", "name_en": "Vrisha", "name_ne": "वृष", "cycle": 15, "deity": "brahma"},
    {"key": "chitrabhanu", "name_en": "Chitrabhanu", "name_ne": "चित्रभानु", "cycle": 16, "deity": "brahma"},
    {"key": "subhanu", "name_en": "Subhanu", "name_ne": "शुभानु", "cycle": 17, "deity": "brahma"},
    {"key": "tarana", "name_en": "Tarana", "name_ne": "तारण", "cycle": 18, "deity": "brahma"},
    {"key": "parthiva", "name_en": "Parthiva", "name_ne": "पार्थिव", "cycle": 19, "deity": "brahma"},
    {"key": "vyaya", "name_en": "Vyaya", "name_ne": "व्यय", "cycle": 20, "deity": "brahma"},
    {"key": "sarvajit", "name_en": "Sarvajit", "name_ne": "सर्वजित", "cycle": 21, "deity": "vishnu"},
    {"key": "sarvadhari", "name_en": "Sarvadhari", "name_ne": "सर्वधारी", "cycle": 22, "deity": "vishnu"},
    {"key": "virodhi", "name_en": "Virodhi", "name_ne": "विरोधी", "cycle": 23, "deity": "vishnu"},
    {"key": "vikriti", "name_en": "Vikriti", "name_ne": "विकृति", "cycle": 24, "deity": "vishnu"},
    {"key": "khara", "name_en": "Khara", "name_ne": "खर", "cycle": 25, "deity": "vishnu"},
    {"key": "nandana", "name_en": "Nandana", "name_ne": "नन्दन", "cycle": 26, "deity": "vishnu"},
    {"key": "vijaya", "name_en": "Vijaya", "name_ne": "विजय", "cycle": 27, "deity": "vishnu"},
    {"key": "jaya", "name_en": "Jaya", "name_ne": "जय", "cycle": 28, "deity": "vishnu"},
    {"key": "manmatha", "name_en": "Manmatha", "name_ne": "मन्मथ", "cycle": 29, "deity": "vishnu"},
    {"key": "durmukha", "name_en": "Durmukha", "name_ne": "दुर्मुख", "cycle": 30, "deity": "vishnu"},
    {"key": "hemalambi", "name_en": "Hemalambi", "name_ne": "हेमालम्बी", "cycle": 31, "deity": "vishnu"},
    {"key": "vilambi", "name_en": "Vilambi", "name_ne": "विलम्बी", "cycle": 32, "deity": "vishnu"},
    {"key": "vikari", "name_en": "Vikari", "name_ne": "विकारी", "cycle": 33, "deity": "vishnu"},
    {"key": "sharvari", "name_en": "Sharvari", "name_ne": "शार्वरी", "cycle": 34, "deity": "vishnu"},
    {"key": "plava", "name_en": "Plava", "name_ne": "प्लव", "cycle": 35, "deity": "vishnu"},
    {"key": "shubhakrit", "name_en": "Shubhakrit", "name_ne": "शुभकृत", "cycle": 36, "deity": "vishnu"},
    {"key": "shobhana", "name_en": "Shobhana", "name_ne": "शोभन", "cycle": 37, "deity": "vishnu"},
    {"key": "krodhi", "name_en": "Krodhi", "name_ne": "क्रोधी", "cycle": 38, "deity": "vishnu"},
    {"key": "vishvavasu", "name_en": "Vishvavasu", "name_ne": "विश्वावसु", "cycle": 39, "deity": "vishnu"},
    {"key": "parabhava", "name_en": "Parabhava", "name_ne": "पराभव", "cycle": 40, "deity": "vishnu"},
    {"key": "plavanga", "name_en": "Plavanga", "name_ne": "प्लवङ्ग", "cycle": 41, "deity": "shiva"},
    {"key": "kilaka", "name_en": "Kilaka", "name_ne": "किलक", "cycle": 42, "deity": "shiva"},
    {"key": "saumya", "name_en": "Saumya", "name_ne": "सौम्य", "cycle": 43, "deity": "shiva"},
    {"key": "sadharana", "name_en": "Sadharana", "name_ne": "साधारण", "cycle": 44, "deity": "shiva"},
    {"key": "virodhikrit", "name_en": "Virodhikrit", "name_ne": "विरोधकृत", "cycle": 45, "deity": "shiva"},
    {"key": "paridhavi", "name_en": "Paridhavi", "name_ne": "परिधावी", "cycle": 46, "deity": "shiva"},
    {"key": "pramadi", "name_en": "Pramadi", "name_ne": "प्रमादी", "cycle": 47, "deity": "shiva"},
    {"key": "ananda", "name_en": "Ananda", "name_ne": "आनन्द", "cycle": 48, "deity": "shiva"},
    {"key": "rakshasa", "name_en": "Rakshasa", "name_ne": "राक्षस", "cycle": 49, "deity": "shiva"},
    {"key": "nala", "name_en": "Nala", "name_ne": "नल", "cycle": 50, "deity": "shiva"},
    {"key": "pingala", "name_en": "Pingala", "name_ne": "पिङ्गल", "cycle": 51, "deity": "shiva"},
    {"key": "kalayukta", "name_en": "Kalayukta", "name_ne": "कालयुक्त", "cycle": 52, "deity": "shiva"},
    {"key": "siddharthi", "name_en": "Siddharthi", "name_ne": "सिद्धार्थी", "cycle": 53, "deity": "shiva"},
    {"key": "raudra", "name_en": "Raudra", "name_ne": "रौद्र", "cycle": 54, "deity": "shiva"},
    {"key": "durmati", "name_en": "Durmati", "name_ne": "दुर्मति", "cycle": 55, "deity": "shiva"},
    {"key": "dundubhi", "name_en": "Dundubhi", "name_ne": "दुन्दुभि", "cycle": 56, "deity": "shiva"},
    {"key": "rudhirodgari", "name_en": "Rudhirodgari", "name_ne": "रुधिरोद्गारी", "cycle": 57, "deity": "shiva"},
    {"key": "raktakshi", "name_en": "Raktakshi", "name_ne": "रक्ताक्षी", "cycle": 58, "deity": "shiva"},
    {"key": "krodhana", "name_en": "Krodhana", "name_ne": "क्रोधन", "cycle": 59, "deity": "shiva"},
    {"key": "akshaya", "name_en": "Akshaya", "name_ne": "अक्षय", "cycle": 60, "deity": "shiva"},
)

ANCHOR_BS_YEAR = 2080
ANCHOR_INDEX = 50  # Pingala


@lru_cache(maxsize=None)
def _jupiter_longitude_at_bs_new_year(bs_year: int) -> float:
    """True sidereal Jupiter longitude at this patro year's Mesh Sankranti.

    Julian Day throughout: the old version went through ``get_bs_month_start``
    (a ``datetime.date``) and ``find_mesh_sankranti(year: int)``, both of which
    raise for years starting before 1 CE. That made the whole Jovian walk die on
    its first step below **BS 58**, so every BBS date silently had no samvatsara.
    """
    from engine.astronomy.engine import default_engine
    from engine.vedic.bikram_sambat import get_bs_month_start_civil
    from engine.vedic.sankranti import find_sankranti_after_jd

    year_start_jd = get_bs_month_start_civil(bs_year, 1).to_jd_ut()
    # The patro year opens on the sankranti day, so start the search a few days
    # earlier and take the first Mesh ingress at or after that point.
    mesh_jd = find_sankranti_after_jd(0, year_start_jd - 5.0, max_days=40)
    if mesh_jd is None:
        raise ValueError(f"Mesh sankranti not found for patro year {bs_year}")
    return float(
        default_engine.planet_position(mesh_jd, "jupiter", sidereal=True)["longitude"]
    )


def _advance_samvatsara_index(prev_idx: int, prev_lon: float, cur_lon: float) -> int:
    prev_rashi = int(prev_lon / 30) % 12
    cur_rashi = int(cur_lon / 30) % 12
    prev_deg = prev_lon % 30
    cur_deg = cur_lon % 30
    delta = (cur_rashi - prev_rashi) % 12

    if delta == 0:
        return 1
    # Kshaya: Jupiter leaves late Meena before Mesh Sankranti (e.g. BS 2081 skips Kalayukta).
    if prev_rashi == 11 and cur_rashi == 0 and prev_deg > 25:
        return 2
    # Kshaya: early Dhanu -> early Makara transition (e.g. BS 2078 skips Ananda).
    if prev_rashi == 9 and cur_rashi == 10 and prev_deg < 5:
        return 2
    # Siddharthi can span two BS years when Jupiter is still in early Mesha.
    if delta == 1 and cur_deg < 26 and prev_idx == 52 and prev_rashi == 0:
        return 0
    if delta == 1:
        return 1
    return delta


def _rashi_ingress_delta(prev_lon: float, cur_lon: float) -> int:
    """Plain Jupiter rashi advance (0/1/2…) between two Mesh Sankrantis.

    The astronomical fallback for years below the tuned range: monotonic,
    always invertible, and independent of the previous samvatsara index.
    """
    return (int(cur_lon / 30) - int(prev_lon / 30)) % 12


def _backward_samvatsara_step(idx_next: int, year: int) -> int | None:
    """Resolve samvatsara index of ``year`` given ``year+1``'s index.

    Inverts the forward step; returns ``None`` when the tuned kshaya/spanning
    corrections leave no self-consistent predecessor (happens below ~BS 1855),
    signalling the caller to switch to the plain-astronomy continuation.
    """
    prev_lon = _jupiter_longitude_at_bs_new_year(year)
    cur_lon = _jupiter_longitude_at_bs_new_year(year + 1)
    for advance in range(13):
        candidate = (idx_next - advance) % 60
        if _advance_samvatsara_index(candidate, prev_lon, cur_lon) == advance:
            return candidate
    return None


_TABLE_PATH = Path(__file__).resolve().parent / "samvatsara_table.json"


@lru_cache(maxsize=1)
def _samvatsara_table() -> dict[int, int]:
    """Precomputed index per patro year, or empty when the file is absent.

    Generated by ``scripts/generate_samvatsara_table.py``. Without it a deep
    lookup walks Jupiter year by year from the BS 2080 anchor — 14.3 s cold for
    BBS 7144, which blocks the worker for a decorative label.
    """
    if not _TABLE_PATH.exists():
        return {}
    with _TABLE_PATH.open(encoding="utf-8") as fh:
        data = json.load(fh)
    return {int(year): int(idx) for year, idx in (data.get("indices") or {}).items()}


@lru_cache(maxsize=1024)
def samvatsara_index_for_bs_year(bs_year: int) -> int:
    table = _samvatsara_table()
    cached = table.get(bs_year)
    if cached is not None:
        return cached
    return _samvatsara_index_by_walk(bs_year)


@lru_cache(maxsize=1024)
def _samvatsara_index_by_walk(bs_year: int) -> int:
    """Samvatsara index (0–59) for a BS year.

    At/above the anchor the tuned forward walk (with Nepal's kshaya/spanning
    corrections) is authoritative. Below it we invert the walk year by year;
    once its corrections stop yielding a consistent predecessor (below ~BS
    1855, where no published almanac exists to tune against), we continue with
    plain Jupiter-rashi progression so any historical year still resolves.
    """
    if bs_year == ANCHOR_BS_YEAR:
        return ANCHOR_INDEX
    if bs_year > ANCHOR_BS_YEAR:
        idx = ANCHOR_INDEX
        for year in range(ANCHOR_BS_YEAR + 1, bs_year + 1):
            idx = (
                idx
                + _advance_samvatsara_index(
                    idx,
                    _jupiter_longitude_at_bs_new_year(year - 1),
                    _jupiter_longitude_at_bs_new_year(year),
                )
            ) % 60
        return idx

    # Step year by year, skipping the nonexistent year 0. A plain
    # `range(ANCHOR - 1, bs_year - 1, -1)` walked *through* 0 and stopped there,
    # so every negative target came out one cycle position off (BBS 1 resolved as
    # Pramadi instead of Ananda) and BBS years deeper than that never resolved at
    # all — it never stepped past 0 to reach them.
    idx = ANCHOR_INDEX
    year = ANCHOR_BS_YEAR
    while year != bs_year:
        prev = -1 if year == 1 else year - 1
        step = _backward_samvatsara_step(idx, prev)
        if step is None:
            step = (
                idx
                - _rashi_ingress_delta(
                    _jupiter_longitude_at_bs_new_year(prev),
                    _jupiter_longitude_at_bs_new_year(year),
                )
            ) % 60
        idx, year = step, prev
    return idx


def samvatsara_for_bs_year(bs_year: int) -> dict[str, str | int]:
    idx = samvatsara_index_for_bs_year(bs_year)
    entry = dict(SAMVATSARA_ENTRIES[idx])
    entry["index"] = idx + 1
    return entry


def samvatsara_payload_for_bs_year(bs_year: int) -> dict[str, str | int] | None:
    """Samvatsara name for a BS year, or ``None`` when unresolvable.

    The Jovian-cycle name is a decorative label; the true-Jupiter walk cannot
    resolve years far below the anchor (pre-BS 1855). Returning ``None`` there
    keeps the whole panchanga/kundali usable for historical dates instead of
    failing the request over a single missing chip — clients already treat a
    missing samvatsara as "don't show it".
    """
    try:
        data = samvatsara_for_bs_year(bs_year)
    except ValueError:
        return None
    return {
        "key": data["key"],
        "name_en": data["name_en"],
        "name_ne": data["name_ne"],
        "cycle": data["cycle"],
        "deity": data["deity"],
        "index": data["index"],
    }
