"""SQLite cache for precomputed daily panchanga — avoids Swiss Ephemeris on repeat lookups."""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import date, datetime, timezone
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.paths import KATHMANDU_CITY_ID, panchanga_db_path
from engine.astronomy.timescale import resolve_observer_timezone

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
CACHE_PAYLOAD_VERSION = 13

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

    PRIMARY KEY (location_key, date)
);
CREATE INDEX IF NOT EXISTS idx_panchanga_cache_city_date
    ON panchanga_cache(city_id, date);
"""


def cache_enabled() -> bool:
    return os.environ.get("PANCHANGA_CACHE", "true").lower() not in {"0", "false", "no"}


def _connect() -> sqlite3.Connection:
    db_path = panchanga_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def ensure_schema() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def resolve_cache_keys(location: ObserverLocation) -> tuple[str, int]:
    """Return (location_key, city_id) for cache lookup."""
    if location.city_id is not None:
        return f"city:{location.city_id}", location.city_id

    if (
        abs(location.lat - DEFAULT_LOCATION.lat) < 0.02
        and abs(location.lon - DEFAULT_LOCATION.lon) < 0.02
        and location.timezone == DEFAULT_LOCATION.timezone
    ):
        return f"city:{KATHMANDU_CITY_ID}", KATHMANDU_CITY_ID

    return location.cache_key(), 0


def _local_element_end(block: dict[str, Any], timezone_name: str) -> str | None:
    end_time = block.get("end_time")
    if not end_time:
        return None
    dt = datetime.fromisoformat(end_time)
    local = dt.astimezone(resolve_observer_timezone(timezone_name))
    return local.strftime("%Y-%m-%d %H:%M")


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
    greg: date,
) -> dict[str, Any]:
    tz = raw["location"]["timezone"]
    muhurta = raw.get("muhurta") or {}
    moonrise = raw.get("moonrise") or {}
    moonset = raw.get("moonset") or {}

    return {
        "city_id": city_id,
        "location_key": location_key,
        "date": greg.isoformat(),
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
        "payload_json": json.dumps(
            {**raw, "_cache_version": CACHE_PAYLOAD_VERSION},
            ensure_ascii=False,
        ),
        "computed_at": datetime.now(timezone.utc).isoformat(),
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

    payload = json.loads(row["payload_json"])
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
    row = _row_from_panchanga(raw, location_key=location_key, city_id=city_id, greg=greg)

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO panchanga_cache (
                city_id, location_key, date,
                tithi, tithi_end, nakshatra, nakshatra_end,
                yoga, yoga_end, karana, karana_end,
                sunrise, sunset, moonrise, moonset,
                rahu_kalam, yama_ganda, gulika, abhijit,
                festivals, payload_json, computed_at
            ) VALUES (
                :city_id, :location_key, :date,
                :tithi, :tithi_end, :nakshatra, :nakshatra_end,
                :yoga, :yoga_end, :karana, :karana_end,
                :sunrise, :sunset, :moonrise, :moonset,
                :rahu_kalam, :yama_ganda, :gulika, :abhijit,
                :festivals, :payload_json, :computed_at
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
                computed_at = excluded.computed_at
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
