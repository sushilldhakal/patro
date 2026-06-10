"""GeoNames cities lookup — SQLite-backed search and resolution."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from core.paths import cities_db_path, cities_source_path

POPULAR_CITY_IDS = (
    1283240,   # Kathmandu, NP
    1275339,   # Mumbai, IN
    1273294,   # Delhi, IN
    2147714,   # Sydney, AU
    5128581,   # New York, US
    2643743,   # London, GB
    1850147,   # Tokyo, JP
    292223,    # Dubai, AE
    1880252,   # Singapore, SG
)


def _connect() -> sqlite3.Connection:
    db_path = cities_db_path()
    if not db_path.is_file():
        raise FileNotFoundError(
            f"Cities database not found at {db_path}. "
            f"Run: python scripts/import_cities.py"
        )
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def search_cities(
    query: str,
    *,
    limit: int = 10,
    country: str | None = None,
) -> list[dict[str, Any]]:
    """Search cities by name; results ordered by relevance then population."""
    q = query.strip()
    if not q:
        return []

    like = f"%{q}%"
    exact = q.casefold()
    params: list[Any] = [like, like, exact, exact]
    country_clause = ""
    if country:
        country_clause = "AND country = ?"
        params.append(country.upper())

    params.append(limit)
    sql = f"""
        SELECT id, name, ascii_name, lat, lon, country, population, timezone
        FROM cities
        WHERE (ascii_name LIKE ? OR name LIKE ?) {country_clause}
        ORDER BY
            CASE
                WHEN lower(ascii_name) = ? THEN 0
                WHEN lower(name) = ? THEN 1
                ELSE 2
            END,
            population DESC
        LIMIT ?
    """
    with _connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_city_by_id(city_id: int) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, name, ascii_name, lat, lon, country, population, timezone
            FROM cities WHERE id = ?
            """,
            (city_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def resolve_city(name: str) -> dict[str, Any] | None:
    """Best-match city for a name string (exact ascii_name preferred)."""
    matches = search_cities(name, limit=1)
    return matches[0] if matches else None


def get_popular_cities() -> list[dict[str, Any]]:
    placeholders = ",".join("?" for _ in POPULAR_CITY_IDS)
    with _connect() as conn:
        rows = conn.execute(
            f"""
            SELECT id, name, ascii_name, lat, lon, country, population, timezone
            FROM cities
            WHERE id IN ({placeholders})
            ORDER BY population DESC
            """,
            POPULAR_CITY_IDS,
        ).fetchall()
    return [_row_to_dict(row) for row in rows]


def import_cities(
    *,
    db_path: Path | None = None,
    source_path: Path | None = None,
) -> int:
    """Build cities.db from GeoNames cities15000.txt. Returns row count."""
    db_path = db_path or cities_db_path()
    source_path = source_path or cities_source_path()
    if not source_path.is_file():
        raise FileNotFoundError(f"GeoNames source not found: {source_path}")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS cities;
        CREATE TABLE cities (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            ascii_name TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            country TEXT NOT NULL,
            population INTEGER NOT NULL DEFAULT 0,
            timezone TEXT
        );
        CREATE INDEX idx_cities_ascii_name ON cities(ascii_name COLLATE NOCASE);
        CREATE INDEX idx_cities_name ON cities(name);
        CREATE INDEX idx_cities_country ON cities(country);
        CREATE INDEX idx_cities_population ON cities(population DESC);
        """
    )

    count = 0
    with source_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 15:
                continue
            city_id = int(parts[0])
            name = parts[1]
            ascii_name = parts[2]
            lat = float(parts[4])
            lon = float(parts[5])
            country = parts[8]
            population = int(parts[14]) if parts[14] else 0
            timezone = parts[17] if len(parts) > 17 and parts[17] else None
            cur.execute(
                """
                INSERT OR IGNORE INTO cities
                (id, name, ascii_name, lat, lon, country, population, timezone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (city_id, name, ascii_name, lat, lon, country, population, timezone),
            )
            count += 1

    conn.commit()
    conn.close()
    return count


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "ascii_name": row["ascii_name"],
        "lat": row["lat"],
        "lon": row["lon"],
        "country": row["country"],
        "population": row["population"],
        "timezone": row["timezone"],
    }
