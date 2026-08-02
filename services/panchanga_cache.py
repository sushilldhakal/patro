"""SQLite cache for precomputed daily panchanga — avoids JPL work on repeat lookups."""

from __future__ import annotations

import gzip
import json
import logging
import os
import sqlite3
from datetime import date, datetime, timezone
from typing import Any

from engine.astronomy.location import DEFAULT_ALTITUDE, DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.paths import KATHMANDU_CITY_ID, panchanga_db_path
from engine.astronomy.provenance import current_provenance
from engine.astronomy.timescale import resolve_observer_timezone
from services.payload_version import compose

logger = logging.getLogger(__name__)

# Bump when cached payload_json shape changes OR when the underlying
# calculation logic changes — a code fix alone does NOT invalidate rows
# already sitting in this (git-committed) SQLite cache; only a version bump
# forces recomputation.
# 7: paksha-resolved pūrṇimānta layer (adhik/शुद्ध month split in lunar_calendar).
# 8: Rahu/Ketu switched from mean to true node; non-Kathmandu rise/set no longer
#    computed with Kathmandu's 1400 m altitude.
# 9: hora (24 slots), tarabala_table, chandrabala_table in payload_json.
# 10: reverted #8 — verified against real Drik Panchang data that #8's premise
#     was backwards; mean node matches Drik (true node was off by ~16.7').
#     Also: pre-1986 Nepal dates now use the historically correct UTC+5:30
#     (was hardcoded to today's +5:45 for every date, mis-timing sunrise/
#     sunset and every ephemeris value by 15 minutes for historical charts).
# 13: solar_corrections.timezone_era label (KMT/IST/NPT) in cached payloads.
# 14: Nepal patro sunrise/sunset — गौरीशंकर meridian (86°15′) + देशान्तर;
#     fixes east/west ordering (e.g. Siraha before Kathmandu).
# 15: देशान्तर is longitude-only (fixed national latitude) so Jhapa→Kanchanpur
#     spans ~31.5 min, not a latitude-compressed ~23 min.
# 16: tithi block's `next` now carries end times (+ a `next.next` on kshaya-tithi
#     days) so a skipped tithi's ending shows on the panchanga page.
# 17: tithi/nakshatra/yoga/karana `*_local_time` are the observer's LOCAL wall
#     clock (were UTC) — end times now render correctly on the panchanga page.
# 18: nivas_shool block (homahuti, disha shool, agnivasa, etc.).
# 19: fix disha shool (Tue=North) + Rahu Vasa now a distinct 8-direction weekday
#     cycle (was mistakenly a copy of disha shool).
# 20: extended muhurta timings (amrit kalam, varjyam, sandhya, dur muhurtam, etc.).
# 21: sunrise/sunset at sea-level horizon (dropped unphysical ~1.1° valley dip
#     that made rise ~7 min early / set ~7 min late, a flat 14h00m day).
# 22: Dashain festival refactor — removed the 15-day "दशैं" span that painted
#     every day; individual day festivals (घटस्थापना/फूलपाती/महाअष्टमी/
#     महानवमी/विजया दशमी) now surface. Month grid now emits Nepali festival
#     names (name_ne) instead of English, and supports exclude_international
#     to drop "World day" observances from the panchanga grid. Invalidates
#     stale month/year response cache that had the span / English names baked in.
# 23: corrected Varjyam (नक्षत्र विष) start ghati for Rohini (40→4), Ardra
#     (21→11), Mula (21→20), and swapped Purva/Uttara Ashadha (24/20→20/24) to
#     match the Vish Ghatika table. Shifts the plotted अशुभ window on those days.
# 24: added Visha Ghati of the Tithi (visha_tithi, तिथि विष — 4-ghati window per
#     tithi) and Visha Ghati of the Nitya Yoga (visha_yoga, योग विष — toxic
#     opening ghatis of Vishkumbha/Atiganda/Shula/Ganda/Vyaghata/Vajra, whole
#     span for Vyatipata) to the inauspicious timings.
# 25: corrected nivas_shool per Muhurta Chintamani — Homahuti graha-mukha order
#     fixed (Sun→Moon nakshatra span in 9 groups of 3; canonical graha sequence
#     सूर्य/बुध/शुक्र/शनि/चन्द्र/मंगल/बृहस्पति/राहु/केतु; Chandra is auspicious);
#     Chandra Vasa rashi→direction table fixed (मिथुन/तुला/कुम्भ = West, वृश्चिक
#     etc. = North); Shiva Vasa remainder order fixed (rem 1 = कैलास, shubha;
#     कैलास/गौरी/सभा were scrambled).
# 26: added per-graha is_combust (अस्त) flag to the planetary positions (and the
#     gochar table) so the sunrise spashtagraha, D-charts and gochar chart can
#     show वक्री/अस्त. Invalidates stale daily/month/year cache whose planets
#     predate the field (is_retrograde was already present, is_combust was not).
# 27: paksha label now uses the pūrṇimānta month name (Nepali patro reckoning),
#     so today's śukla fortnight reads आषाढ शुक्ल पक्ष, not श्रावण. Only śukla
#     labels change; krishna already matched. Invalidates stale paksha labels.
# 28: nakshatra-pada / chandra-rashi span and panchaka-rahita *_local_time_short
#     were emitted in UTC instead of observer-local time; now localized.
#     Invalidates stale cached spans/panchaka carrying UTC clock strings.
# 29: patro-table sign fix for deshaantar (west → negative) and belaantar
#     (mean − apparent, e.g. July → positive). Sunrise physics unchanged;
#     invalidates stale solar_corrections labels and ishtakaal belaantar sign.
# 30: year/BS-year festival lists now run the same-day redundancy filter the day
#     view already ran, so alias rows (गुरु पुर्णिमा व्रत, पूर्णिमा व्रत, नवरात्र
#     आरम्भ, आमाको मुख हेर्ने दिन …) no longer repeat the named festival next to
#     it. Invalidates cached month/year patro payloads carrying the duplicate rows.
# 31: civil-day ``jd_ut`` (Julian Day at 0h UT) + ``date_ad`` ISO on daily payloads —
#     canonical ephemeris identity; AD string parsing uses ``parse_civil_iso``.
# 32: BCE/BBS daily panchanga via ``CivilDay`` + ``jd_ut`` cache keys (``date_ad``).
# 33: BCE instants serialize as expanded ISO (``-0157-06-16T09:13:39+00:00``)
#     instead of the ``jd:<float>`` sentinel. The sentinel crashed the month
#     ``full=true`` and year-wheel builders (`datetime.fromisoformat`) and, where
#     it survived, rendered as literal "jd:16" in clipped HH:MM labels.
#     Invalidates every cached BCE payload that still carries `jd:` strings.
# 34: samvatsara resolves on the signed axis. The Jovian walk moved off the
#     CE-only `date` path onto `jd_ut` and is now backed by a precomputed table
#     (engine/vedic/samvatsara_table.json), so BBS and BS < 58 days carry a
#     samvatsara instead of null. Invalidates cached days whose label was null.
# 35: BCE / early-BS civil daily payloads now include solar_corrections (belaantar,
#     deshaantar) — were hard-coded to {} in build_daily_panchanga_civil.
# 36: no payload-shape change — this number moves so the A0 / A0b engine fixes
#     reach the caches. See services/payload_version.ASTRONOMY_VERSION, which is
#     the axis that actually invalidated them; 36 records that this store's
#     contents changed too.
# 37: day payloads declare their ``anchor`` ("sunrise" | "instant" | "midnight").
#     Additive. Sunrise-, instant- and midnight-anchored views answer honestly
#     different questions about the same day, and without the field the
#     difference reads as the API contradicting itself (audit B3).
# 38: day payloads carry a ``moon_phase`` block (name, illuminated fraction,
#     phase angle, age). New surface — the backend had no phase computation at
#     all before phase 2 shipped MoonService, and nothing surfaced it until now.
# 39: BS month ``full=true`` embed copies pūrṇimānta ``lunar_calendar`` from the
#     sunrise row (was solar_month_stub when embed came from patro_bs civil path
#     or stale month response-cache gzip). Invalidates month/year response blobs.
# 40: ``solar_corrections.akshamsha`` — latitude correction on the Gaurishankar
#     meridian (reference display; rise/set already use observer latitude).
# 41: ayanamsha unified on swe.get_ayanamsa_ex_ut. The engine previously used
#     BOTH variants — FLG_SIDEREAL (== ex_ut) for every planet, but the plain
#     get_ayanamsa_ut for ascendant() and for the published `ayanamsa` field — so
#     a payload's lagna disagreed with its own planets by up to 18". Shifts
#     ayanamsa, lahiri_ayanamsa, lagna, lagna_spans, udaya_lagna and
#     panchaka_rahita by <=6.8 arcsec (<=2 s of clock time on span boundaries).
#     No rashi or nakshatra label changes. See docs/ayanamsha-variants.md.
PANCHANGA_PAYLOAD_VERSION = 41

# What every consumer keys on. Derived, not literal: an ephemeris fix must
# invalidate this store even when nothing about the payload's own shape changed.
CACHE_PAYLOAD_VERSION = compose(PANCHANGA_PAYLOAD_VERSION)

_REQUIRED_PAYLOAD_KEYS = (
    "lagna",
    "lagna_spans",
    "ritu",
    "planets",
    "tithi",
    "nakshatra",
    "yoga",
    "karana",
    "hora",
    "choghadiya",
    "tarabala_table",
    "chandrabala_table",
    "nivas_shool",
    # Rows cached before the samvatsara feature lack this key; requiring it
    # forces them to recompute so modern dates get their samvatsara label
    # (value may be None for pre-BS 1855 — the key must still be present).
    "samvatsara",
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS panchanga_cache (
    city_id INTEGER NOT NULL DEFAULT 0,
    location_key TEXT NOT NULL,
    date TEXT NOT NULL,

    tithi TEXT,
    tithi_end TEXT,
    nakshatra TEXT,
    nakshatra_end TEXT,
    yoga TEXT,
    yoga_end TEXT,
    karana TEXT,
    karana_end TEXT,

    sunrise TEXT,
    sunset TEXT,
    moonrise TEXT,
    moonset TEXT,

    rahu_kalam TEXT,
    yama_ganda TEXT,
    gulika TEXT,
    abhijit TEXT,

    festivals TEXT,
    payload_json TEXT NOT NULL,
    computed_at TEXT NOT NULL,

    -- Which astronomical environment produced this row (see
    -- engine.astronomy.provenance). Recorded, never part of the key: a cache key
    -- answers "which lookup bucket is this?", provenance answers "how was it
    -- calculated?". Keying on it would orphan every row the moment any
    -- dependency moved, including upgrades that change no number.
    -- NULL means "written before provenance existed", which is accurate and
    -- distinguishable from any real hash.
    provenance_hash TEXT,

    PRIMARY KEY (location_key, date)
);
CREATE INDEX IF NOT EXISTS idx_panchanga_cache_city_date
    ON panchanga_cache(city_id, date);
CREATE INDEX IF NOT EXISTS idx_panchanga_cache_provenance
    ON panchanga_cache(provenance_hash);
"""

# Columns added after the table's original shape. ``CREATE TABLE IF NOT EXISTS``
# is a no-op on an existing table, so a new column in _SCHEMA above reaches fresh
# databases only — an existing one needs an explicit ALTER.
#
# ``ADD COLUMN`` with no DEFAULT is metadata-only in SQLite: measured at 0.0006 s
# against a table with the production row profile (18k rows, 1.1 GB), with no
# data rewrite and no file-size change. Existing rows read NULL.
_ADDED_COLUMNS: tuple[tuple[str, str], ...] = (
    ("provenance_hash", "TEXT"),
)


# ── payload compression ──────────────────────────────────────────────────────
#
# Daily payloads are ~54 KB of highly repetitive JSON. Measured on 400 real rows:
# gzip level 6 gives **6.14x** (1005 MB -> ~164 MB for the live cache) at
# 0.051 ms/row to decompress, which is negligible next to the SQLite read it
# rides along with.
#
# Chosen over the snapshot/derived split proposed in the roadmap, which measured
# at only 4.4% (docs/cache-architecture-measurements.md): 6x for a codec beats
# 1.04x for an architecture change, with none of the risk.
#
# Backward compatible with no migration and no data rewrite. SQLite is
# dynamically typed, so gzip bytes go into the TEXT-declared column as a BLOB and
# come back as ``bytes``; pre-existing rows come back as ``str``. The reader
# branches on the type, so old and new rows coexist indefinitely and a rollback
# leaves every row readable by the previous code as long as it has not been
# rewritten.

_GZIP_LEVEL = 6


def _encode_payload(payload: dict[str, Any]) -> bytes:
    """JSON -> gzip bytes for storage."""
    return gzip.compress(
        json.dumps(payload, ensure_ascii=False).encode("utf-8"), _GZIP_LEVEL
    )


def _decode_payload(stored: Any) -> dict[str, Any]:
    """Stored payload -> dict, accepting both gzip bytes and legacy plain text."""
    if isinstance(stored, (bytes, bytearray, memoryview)):
        return json.loads(gzip.decompress(bytes(stored)).decode("utf-8"))
    return json.loads(stored)


def cache_enabled() -> bool:
    import config

    return config.panchanga_sqlite_cache_enabled()


def _connect() -> sqlite3.Connection:
    db_path = panchanga_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _migrate_added_columns(conn: sqlite3.Connection) -> list[str]:
    """Add any column in ``_ADDED_COLUMNS`` the table does not yet have.

    Additive and idempotent: nullable, no DEFAULT, no data rewritten, no row
    touched. Safe to run on every connect, and safe to run against a database
    written by an older build — that build simply never selects the new column.

    Follows the runtime column introspection ``services/cities_db`` already uses
    for its optional admin columns.
    """
    existing = {row[1] for row in conn.execute("PRAGMA table_info(panchanga_cache)")}
    if not existing:  # table not created yet; _SCHEMA carries the columns
        return []
    added: list[str] = []
    for name, coltype in _ADDED_COLUMNS:
        if name in existing:
            continue
        conn.execute(f"ALTER TABLE panchanga_cache ADD COLUMN {name} {coltype}")
        added.append(name)
    return added


def ensure_schema() -> None:
    with _connect() as conn:
        # Order matters: migrate first so the CREATE INDEX statements in _SCHEMA
        # find their columns on a pre-existing table.
        migrated = _migrate_added_columns(conn)
        conn.executescript(_SCHEMA)
        if migrated:
            logger.info(
                "panchanga_cache: added column(s) %s (additive, existing rows NULL)",
                ", ".join(migrated),
            )


def stored_provenance_hashes() -> list[tuple[str | None, int]]:
    """``[(provenance_hash, row_count)]`` present in the cache, most rows first.

    ``None`` counts rows written before the column existed. This is the query
    that makes selective invalidation possible — with only a version counter,
    the sole remedy for a bad dependency was discarding everything.
    """
    if not cache_enabled():
        return []
    ensure_schema()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT provenance_hash, COUNT(*) FROM panchanga_cache "
            "GROUP BY provenance_hash ORDER BY COUNT(*) DESC"
        ).fetchall()
    return [(r[0], r[1]) for r in rows]


def report_provenance_drift() -> dict[str, Any]:
    """Compare cached rows against the live environment and log any drift.

    **Logs only — nothing is purged and no row is invalidated.** A provenance
    change means an *input* changed, which is not the same as an *output*
    changing: a pyswisseph patch release touching an unrelated routine moves the
    hash while every number stays identical. Deciding what to do about that is a
    judgement call, and this makes the call possible instead of making it
    silently.

    Its value is turning the A0c failure mode — the API served Moshier results
    for months because nothing noticed the ephemeris files were unreachable —
    from invisible into a startup WARNING.
    """
    live = current_provenance()
    stored = stored_provenance_hashes()
    known = [(h, n) for h, n in stored if h]
    legacy = sum(n for h, n in stored if not h)
    stale = [(h, n) for h, n in known if h != live.provenance_hash]

    summary: dict[str, Any] = {
        "live_hash": live.provenance_hash,
        "rows_current": sum(n for h, n in known if h == live.provenance_hash),
        "rows_pre_provenance": legacy,
        "stale_hashes": [{"provenance_hash": h, "rows": n} for h, n in stale],
    }
    if stale:
        logger.warning(
            "Panchanga cache holds %d row(s) from %d earlier astronomical "
            "environment(s); live provenance is %s. Nothing was invalidated — "
            "inspect with services.panchanga_cache.stored_provenance_hashes(). "
            "Stale: %s",
            sum(n for _h, n in stale),
            len(stale),
            live.short_hash,
            ", ".join(f"{h[:16]} ({n} rows)" for h, n in stale),
        )
    elif legacy:
        logger.info(
            "Panchanga cache: %d row(s) predate provenance recording (hash NULL); "
            "live provenance is %s",
            legacy,
            live.short_hash,
        )
    return summary


def resolve_cache_keys(location: ObserverLocation) -> tuple[str, int]:
    """Return (location_key, city_id) for cache lookup.

    Both city shortcuts below discard latitude and longitude — deliberately, so
    that everyone in a town shares one computation. They must not also discard
    **altitude**: two observers at one town's coordinates but different
    elevations see genuinely different rise/set times (1400 m moves sunrise
    ~6.3 minutes), so collapsing them would serve one the other's day.

    Altitude is a constant ``DEFAULT_ALTITUDE`` for every observer the current
    API can construct, so in practice both guards are always taken and every key
    produced here is byte-identical to the pre-altitude ones. The guards exist so
    that stays true when altitude becomes settable, rather than silently not.
    """
    at_default_altitude = location.altitude == DEFAULT_ALTITUDE

    if location.city_id is not None:
        if at_default_altitude:
            return f"city:{location.city_id}", location.city_id
        return f"city:{location.city_id}_alt{location.altitude:.1f}", location.city_id

    if (
        abs(location.lat - DEFAULT_LOCATION.lat) < 0.02
        and abs(location.lon - DEFAULT_LOCATION.lon) < 0.02
        and location.timezone == DEFAULT_LOCATION.timezone
        and at_default_altitude
    ):
        return f"city:{KATHMANDU_CITY_ID}", KATHMANDU_CITY_ID

    return location.cache_key(), 0


def _local_element_end(block: dict[str, Any], timezone_name: str) -> str | None:
    """Anga end time as a local ``YYYY-MM-DD HH:MM`` label for the summary row.

    Not ``datetime.fromisoformat``: a pre-1 CE anga ends at an expanded-ISO
    instant like ``-0057-03-16T04:23:51+00:00``, which that parser rejects
    outright — it took a BCE day's *cache write* down, so the day computed fine
    and then 500'd on the way into SQLite. ``parse_ephemeris_instant`` reads both
    spellings, and ``local_civil_fields`` formats either without needing a
    ``datetime`` that can hold the year.
    """
    end_time = block.get("end_time")
    if not end_time:
        return None
    from engine.astronomy.ut_instant import local_civil_fields, parse_ephemeris_instant

    try:
        instant = parse_ephemeris_instant(str(end_time))
    except ValueError:
        return None
    fields = local_civil_fields(instant, timezone_name)
    return f"{fields.date_iso()} {fields.time_short()}"


def _muhurta_json(block: dict[str, Any] | None) -> str | None:
    if not block:
        return None
    return json.dumps(
        {
            "start": block.get("start_time"),
            "end": block.get("end_time"),
            "lord": block.get("lord"),
            "name": block.get("name"),
        },
        ensure_ascii=False,
    )


def _row_from_panchanga(
    raw: dict[str, Any],
    *,
    location_key: str,
    city_id: int,
    date_key: str,
) -> dict[str, Any]:
    tz = raw["location"]["timezone"]
    muhurta = raw.get("muhurta") or {}
    moonrise = raw.get("moonrise") or {}
    moonset = raw.get("moonset") or {}

    return {
        "city_id": city_id,
        "location_key": location_key,
        "date": date_key,
        "tithi": raw["tithi"]["name"],
        "tithi_end": _local_element_end(raw["tithi"], tz),
        "nakshatra": raw["nakshatra"]["name"],
        "nakshatra_end": _local_element_end(raw["nakshatra"], tz),
        "yoga": raw["yoga"]["name"],
        "yoga_end": _local_element_end(raw["yoga"], tz),
        "karana": raw["karana"]["name"],
        "karana_end": _local_element_end(raw["karana"], tz),
        "sunrise": raw["sunrise"]["local_time_short"],
        "sunset": raw["sunset"]["local_time_short"],
        "moonrise": moonrise.get("local_time_short"),
        "moonset": moonset.get("local_time_short"),
        "rahu_kalam": _muhurta_json(muhurta.get("rahu_kalam")),
        "yama_ganda": _muhurta_json(muhurta.get("yamaganda")),
        "gulika": _muhurta_json(muhurta.get("gulika")),
        "abhijit": _muhurta_json(muhurta.get("abhijit")),
        "festivals": json.dumps(raw.get("festivals", []), ensure_ascii=False),
        "payload_json": _encode_payload({**raw, "_cache_version": CACHE_PAYLOAD_VERSION}),
        "computed_at": datetime.now(timezone.utc).isoformat(),
        # Column, not part of payload_json: provenance must stay out of the
        # presentation payload, and a column is what makes
        # `SELECT DISTINCT provenance_hash` and selective invalidation possible.
        "provenance_hash": current_provenance().provenance_hash,
    }


def _payload_cache_valid(payload: dict[str, Any]) -> bool:
    if payload.get("_cache_version", 1) < CACHE_PAYLOAD_VERSION:
        return False
    for key in _REQUIRED_PAYLOAD_KEYS:
        if key not in payload:
            return False
    for element in ("tithi", "nakshatra", "yoga", "karana"):
        block = payload.get(element)
        if not isinstance(block, dict):
            return False
        nxt = block.get("next")
        if not isinstance(nxt, dict) or "name" not in nxt:
            return False
    lagna = payload.get("lagna")
    spans = payload.get("lagna_spans")
    hora = payload.get("hora")
    choghadiya = payload.get("choghadiya")
    tarabala_table = payload.get("tarabala_table")
    chandrabala_table = payload.get("chandrabala_table")
    return (
        isinstance(lagna, dict)
        and "name_ne" in lagna
        and isinstance(spans, list)
        and len(spans) == 12
        and isinstance(hora, list)
        and len(hora) >= 24
        and isinstance(choghadiya, list)
        and len(choghadiya) >= 16
        and isinstance(tarabala_table, dict)
        and isinstance(tarabala_table.get("rows"), list)
        and len(tarabala_table["rows"]) == 27
        and isinstance(chandrabala_table, dict)
        and isinstance(chandrabala_table.get("rows"), list)
        and len(chandrabala_table["rows"]) == 12
    )


def get_cached_panchanga(
    greg: date,
    location: ObserverLocation,
) -> dict[str, Any] | None:
    if not cache_enabled():
        return None

    location_key, _ = resolve_cache_keys(location)
    ensure_schema()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT payload_json FROM panchanga_cache
            WHERE location_key = ? AND date = ?
            """,
            (location_key, greg.isoformat()),
        ).fetchone()

    if row is None:
        return None

    payload = _decode_payload(row["payload_json"])
    if not _payload_cache_valid(payload):
        logger.debug(
            "Stale panchanga cache for %s @ %s — recomputing",
            greg.isoformat(),
            location_key,
        )
        return None
    return payload


def store_panchanga_cache(
    greg: date,
    location: ObserverLocation,
    raw: dict[str, Any],
) -> None:
    if not cache_enabled():
        return

    location_key, city_id = resolve_cache_keys(location)
    ensure_schema()
    row = _row_from_panchanga(
        raw, location_key=location_key, city_id=city_id, date_key=greg.isoformat()
    )

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO panchanga_cache (
                city_id, location_key, date,
                tithi, tithi_end, nakshatra, nakshatra_end,
                yoga, yoga_end, karana, karana_end,
                sunrise, sunset, moonrise, moonset,
                rahu_kalam, yama_ganda, gulika, abhijit,
                festivals, payload_json, computed_at, provenance_hash
            ) VALUES (
                :city_id, :location_key, :date,
                :tithi, :tithi_end, :nakshatra, :nakshatra_end,
                :yoga, :yoga_end, :karana, :karana_end,
                :sunrise, :sunset, :moonrise, :moonset,
                :rahu_kalam, :yama_ganda, :gulika, :abhijit,
                :festivals, :payload_json, :computed_at, :provenance_hash
            )
            ON CONFLICT(location_key, date) DO UPDATE SET
                city_id = excluded.city_id,
                tithi = excluded.tithi,
                tithi_end = excluded.tithi_end,
                nakshatra = excluded.nakshatra,
                nakshatra_end = excluded.nakshatra_end,
                yoga = excluded.yoga,
                yoga_end = excluded.yoga_end,
                karana = excluded.karana,
                karana_end = excluded.karana_end,
                sunrise = excluded.sunrise,
                sunset = excluded.sunset,
                moonrise = excluded.moonrise,
                moonset = excluded.moonset,
                rahu_kalam = excluded.rahu_kalam,
                yama_ganda = excluded.yama_ganda,
                gulika = excluded.gulika,
                abhijit = excluded.abhijit,
                festivals = excluded.festivals,
                payload_json = excluded.payload_json,
                computed_at = excluded.computed_at,
                provenance_hash = excluded.provenance_hash
            """,
            row,
        )
        conn.commit()


def get_cached_panchanga_jd(
    jd_ut: float,
    location: ObserverLocation,
) -> dict[str, Any] | None:
    if not cache_enabled():
        return None

    from engine.astronomy.jd_calendar import CivilDay, format_civil_iso

    civil = CivilDay.from_jd_ut(float(jd_ut))
    date_key = format_civil_iso(civil.year, civil.month, civil.day)
    location_key, _ = resolve_cache_keys(location)
    ensure_schema()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT payload_json FROM panchanga_cache
            WHERE location_key = ? AND date = ?
            """,
            (location_key, date_key),
        ).fetchone()

    if row is None:
        return None

    payload = _decode_payload(row["payload_json"])
    if not _payload_cache_valid(payload):
        logger.debug(
            "Stale panchanga cache for jd %s (%s) @ %s — recomputing",
            jd_ut,
            date_key,
            location_key,
        )
        return None
    return payload


def store_panchanga_cache_jd(
    jd_ut: float,
    location: ObserverLocation,
    raw: dict[str, Any],
) -> None:
    if not cache_enabled():
        return

    date_key = raw.get("date_ad") or raw.get("date")
    if not date_key:
        from engine.astronomy.jd_calendar import CivilDay, format_civil_iso

        civil = CivilDay.from_jd_ut(float(jd_ut))
        date_key = format_civil_iso(civil.year, civil.month, civil.day)

    location_key, city_id = resolve_cache_keys(location)
    ensure_schema()
    row = _row_from_panchanga(
        raw, location_key=location_key, city_id=city_id, date_key=date_key
    )

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO panchanga_cache (
                city_id, location_key, date,
                tithi, tithi_end, nakshatra, nakshatra_end,
                yoga, yoga_end, karana, karana_end,
                sunrise, sunset, moonrise, moonset,
                rahu_kalam, yama_ganda, gulika, abhijit,
                festivals, payload_json, computed_at, provenance_hash
            ) VALUES (
                :city_id, :location_key, :date,
                :tithi, :tithi_end, :nakshatra, :nakshatra_end,
                :yoga, :yoga_end, :karana, :karana_end,
                :sunrise, :sunset, :moonrise, :moonset,
                :rahu_kalam, :yama_ganda, :gulika, :abhijit,
                :festivals, :payload_json, :computed_at, :provenance_hash
            )
            ON CONFLICT(location_key, date) DO UPDATE SET
                city_id = excluded.city_id,
                tithi = excluded.tithi,
                tithi_end = excluded.tithi_end,
                nakshatra = excluded.nakshatra,
                nakshatra_end = excluded.nakshatra_end,
                yoga = excluded.yoga,
                yoga_end = excluded.yoga_end,
                karana = excluded.karana,
                karana_end = excluded.karana_end,
                sunrise = excluded.sunrise,
                sunset = excluded.sunset,
                moonrise = excluded.moonrise,
                moonset = excluded.moonset,
                rahu_kalam = excluded.rahu_kalam,
                yama_ganda = excluded.yama_ganda,
                gulika = excluded.gulika,
                abhijit = excluded.abhijit,
                festivals = excluded.festivals,
                payload_json = excluded.payload_json,
                computed_at = excluded.computed_at,
                provenance_hash = excluded.provenance_hash
            """,
            row,
        )
        conn.commit()


def cache_stats() -> dict[str, Any]:
    if not panchanga_db_path().is_file():
        return {"enabled": cache_enabled(), "rows": 0, "cities": 0}
    ensure_schema()
    with _connect() as conn:
        rows = conn.execute("SELECT COUNT(*) AS n FROM panchanga_cache").fetchone()["n"]
        cities = conn.execute(
            "SELECT COUNT(DISTINCT city_id) AS n FROM panchanga_cache WHERE city_id != 0"
        ).fetchone()["n"]
    return {"enabled": cache_enabled(), "rows": rows, "cities": cities}


def precompute_range(
    location: ObserverLocation,
    dates: list[date],
    *,
    skip_existing: bool = True,
) -> int:
    """Compute and store panchanga for many dates. Returns rows written."""
    from engine.vedic.daily import build_daily_panchanga

    location_key, _ = resolve_cache_keys(location)
    ensure_schema()
    written = 0

    existing: set[str] = set()
    if skip_existing and dates:
        with _connect() as conn:
            placeholders = ",".join("?" for _ in dates)
            rows = conn.execute(
                f"""
                SELECT date FROM panchanga_cache
                WHERE location_key = ? AND date IN ({placeholders})
                """,
                (location_key, *[d.isoformat() for d in dates]),
            ).fetchall()
            existing = {row["date"] for row in rows}

    for greg in dates:
        if greg.isoformat() in existing:
            continue
        raw = build_daily_panchanga(greg, location)
        store_panchanga_cache(greg, location, raw)
        written += 1

    return written
