"""GeoNames cities lookup — SQLite-backed search and resolution."""

from __future__ import annotations

import sqlite3
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from engine.astronomy.paths import cities_db_path, cities_source_path

GEONAMES_CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip"

# Per-country GeoNames dumps give full coverage (every village/town), unlike the
# global cities15000 file (population ≥ 15,000 only). We pull complete populated-
# place data for these countries — Nepal first, since the app targets Nepali users.
GEONAMES_COUNTRY_URL = "https://download.geonames.org/export/dump/{cc}.zip"
FULL_COVERAGE_COUNTRIES = ("NP",)

# GeoNames feature class "P" = populated places (city, town, village, …).
_POPULATED_PLACE_CLASS = "P"

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
    prioritize_country: str | None = "NP",
) -> list[dict[str, Any]]:
    """Search cities by name; results ordered by relevance, then the prioritized
    country (Nepal by default, since the app targets Nepali users), then population.
    """
    q = query.strip()
    if not q:
        return []

    like = f"%{q}%"
    exact = q.casefold()

    # Build WHERE and ORDER BY params in textual placeholder order.
    where = "(ascii_name LIKE ? OR name LIKE ?)"
    where_params: list[Any] = [like, like]
    if country:
        where += " AND country = ?"
        where_params.append(country.upper())

    order_params: list[Any] = [exact, exact]
    priority_clause = ""
    if prioritize_country:
        priority_clause = "CASE WHEN country = ? THEN 0 ELSE 1 END,"
        order_params.append(prioritize_country.upper())

    # Collapse same-name duplicates within a country (GeoNames has several ids for
    # one place) to the most populous, so autocomplete shows each place once.
    sql = f"""
        SELECT id, name, ascii_name, lat, lon, country, population, timezone
        FROM (
            SELECT id, name, ascii_name, lat, lon, country,
                   MAX(population) AS population, timezone
            FROM cities
            WHERE {where}
            GROUP BY lower(ascii_name), country
        )
        ORDER BY
            CASE
                WHEN lower(ascii_name) = ? THEN 0
                WHEN lower(name) = ? THEN 1
                ELSE 2
            END,
            {priority_clause}
            population DESC
        LIMIT ?
    """
    params = [*where_params, *order_params, limit]
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


def ensure_cities_source(source_path: Path | None = None) -> Path:
    """
    Ensure GeoNames cities15000.txt exists, downloading from geonames.org if needed.

    The source file is not committed to git (~3 MB); deploy and setup fetch it on demand.
    """
    source_path = source_path or cities_source_path()
    if source_path.is_file():
        return source_path

    source_path.parent.mkdir(parents=True, exist_ok=True)
    zip_path = source_path.with_suffix(".zip")

    print(f"Downloading GeoNames cities15000 from {GEONAMES_CITIES_URL} ...")
    urllib.request.urlretrieve(GEONAMES_CITIES_URL, zip_path)

    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        if "cities15000.txt" not in names:
            raise RuntimeError(f"Expected cities15000.txt in {GEONAMES_CITIES_URL}, got: {names}")
        archive.extract("cities15000.txt", path=source_path.parent)

    zip_path.unlink(missing_ok=True)
    if not source_path.is_file():
        raise FileNotFoundError(f"GeoNames extract failed: {source_path}")
    return source_path


def ensure_country_source(country_code: str, data_dir: Path | None = None) -> Path:
    """Ensure GeoNames <CC>.txt (all features for a country) exists, downloading if needed."""
    cc = country_code.upper()
    data_dir = data_dir or cities_source_path().parent
    txt_path = data_dir / f"{cc}.txt"
    if txt_path.is_file():
        return txt_path

    data_dir.mkdir(parents=True, exist_ok=True)
    zip_path = data_dir / f"{cc}.zip"
    url = GEONAMES_COUNTRY_URL.format(cc=cc)

    print(f"Downloading GeoNames {cc} dump from {url} ...")
    urllib.request.urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        if f"{cc}.txt" not in archive.namelist():
            raise RuntimeError(f"Expected {cc}.txt in {url}, got: {archive.namelist()}")
        archive.extract(f"{cc}.txt", path=data_dir)
    zip_path.unlink(missing_ok=True)
    return txt_path


def _iter_geonames_rows(
    path: Path,
    *,
    feature_class: str | None = None,
):
    """Yield (id, name, ascii_name, lat, lon, country, population, timezone) tuples.

    GeoNames columns: 0=id 1=name 2=ascii 4=lat 5=lon 6=fclass 8=country 14=pop 17=tz.
    When feature_class is set, only rows of that class are yielded.
    """
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 15:
                continue
            if feature_class is not None and parts[6] != feature_class:
                continue
            try:
                yield (
                    int(parts[0]),
                    parts[1],
                    parts[2],
                    float(parts[4]),
                    float(parts[5]),
                    parts[8],
                    int(parts[14]) if parts[14] else 0,
                    parts[17] if len(parts) > 17 and parts[17] else None,
                )
            except (ValueError, IndexError):
                continue


def import_cities(
    *,
    db_path: Path | None = None,
    source_path: Path | None = None,
    full_coverage_countries: tuple[str, ...] = FULL_COVERAGE_COUNTRIES,
) -> int:
    """Build cities.db from GeoNames data. Returns row count.

    Sources, merged (deduped by GeoNames id):
      * cities15000 — global cities with population ≥ 15,000.
      * full per-country dumps (e.g. Nepal) — every populated place (village/town).
    """
    db_path = db_path or cities_db_path()
    source_path = ensure_cities_source(source_path)

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

    insert_sql = """
        INSERT OR IGNORE INTO cities
        (id, name, ascii_name, lat, lon, country, population, timezone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """

    # Global cities first (best population data for the big places), then the full
    # per-country populated places. INSERT OR IGNORE dedupes by GeoNames id.
    cur.executemany(insert_sql, _iter_geonames_rows(source_path))
    for cc in full_coverage_countries:
        country_path = ensure_country_source(cc, data_dir=source_path.parent)
        cur.executemany(
            insert_sql,
            _iter_geonames_rows(country_path, feature_class=_POPULATED_PLACE_CLASS),
        )

    count = cur.execute("SELECT COUNT(*) FROM cities").fetchone()[0]
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
