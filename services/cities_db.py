"""GeoNames cities lookup — SQLite-backed search and resolution."""

from __future__ import annotations

import sqlite3
import ssl
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from engine.astronomy.paths import (
    cities_db_path,
    cities_db_version_path,
    cities_source_path,
)

GEONAMES_CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip"
GEONAMES_ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"

# Per-country GeoNames dumps give full coverage (every village/town), unlike the
# global cities15000 file (population ≥ 15,000 only). We pull complete populated-
# place data for these countries — Nepal first, since the app targets Nepali users.
GEONAMES_COUNTRY_URL = "https://download.geonames.org/export/dump/{cc}.zip"
FULL_COVERAGE_COUNTRIES = ("NP",)

# Bump when the import schema or sources change so deploy rebuilds cities.db.
CITIES_DB_VERSION = 2

# GeoNames feature class "P" = populated places (city, town, village, …).
_POPULATED_PLACE_CLASS = "P"

POPULAR_CITY_IDS = (
    1283240,   # Kathmandu, NP
    1282951,   # Pokhara, NP
    1283582,   # Biratnagar, NP
    1283467,   # Dharan, NP
    1283368,   # Bharatpur, NP
    1283621,   # Butwal, NP
    1283628,   # Nepalgunj, NP
    1283678,   # Lalitpur, NP
    1275339,   # Mumbai, IN
    1273294,   # Delhi, IN
    2147714,   # Sydney, AU
    5128581,   # New York, US
)

_BASE_CITY_COLS = "id, name, ascii_name, lat, lon, country, population, timezone"


def _table_columns(conn: sqlite3.Connection) -> set[str]:
    return {row[1] for row in conn.execute("PRAGMA table_info(cities)")}


def _has_admin_columns(conn: sqlite3.Connection) -> bool:
    cols = _table_columns(conn)
    return "admin1" in cols and "admin1_name" in cols


def _city_select_sql(conn: sqlite3.Connection) -> str:
    if _has_admin_columns(conn):
        return f"{_BASE_CITY_COLS}, admin1, admin1_name"
    return _BASE_CITY_COLS


def _search_group_by_sql(conn: sqlite3.Connection) -> str:
    if _has_admin_columns(conn):
        return "GROUP BY lower(ascii_name), country, COALESCE(admin1, '')"
    return "GROUP BY lower(ascii_name), country"


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


def _geonames_urlretrieve(url: str, dest: Path) -> None:
    """Download a GeoNames dump with a default SSL context."""
    context = ssl.create_default_context()
    with urllib.request.urlopen(url, context=context) as response, dest.open("wb") as out:
        out.write(response.read())


def needs_cities_reimport() -> bool:
    """True when cities.db is missing or built with an older import version."""
    if not cities_db_path().is_file():
        return True
    try:
        with _connect() as conn:
            if not _has_admin_columns(conn):
                return True
    except sqlite3.Error:
        return True
    version_path = cities_db_version_path()
    if not version_path.is_file():
        return True
    try:
        return int(version_path.read_text().strip()) < CITIES_DB_VERSION
    except ValueError:
        return True


def search_cities(
    query: str,
    *,
    limit: int = 10,
    country: str | None = None,
    prioritize_country: str | None = "NP",
) -> list[dict[str, Any]]:
    """Search cities by name; results ordered by relevance, then population."""
    q = query.strip()
    if not q:
        return []

    like = f"%{q}%"
    prefix = f"{q}%"
    exact = q.casefold()

    where = "(ascii_name LIKE ? OR name LIKE ?)"
    where_params: list[Any] = [like, like]
    if country:
        where += " AND country = ?"
        where_params.append(country.upper())

    order_params: list[Any] = [exact, exact, prefix.casefold(), prefix.casefold()]
    priority_clause = ""
    if prioritize_country:
        priority_clause = "CASE WHEN country = ? THEN 0 ELSE 1 END,"
        order_params.append(prioritize_country.upper())

    with _connect() as conn:
        select_cols = _city_select_sql(conn)
        inner_cols = select_cols.replace("population", "MAX(population) AS population", 1)
        group_by = _search_group_by_sql(conn)
        sql = f"""
            SELECT {select_cols}
            FROM (
                SELECT {inner_cols}
                FROM cities
                WHERE {where}
                {group_by}
            )
            ORDER BY
                CASE
                    WHEN lower(ascii_name) = ? THEN 0
                    WHEN lower(name) = ? THEN 1
                    WHEN lower(ascii_name) LIKE ? THEN 2
                    WHEN lower(name) LIKE ? THEN 3
                    ELSE 4
                END,
                {priority_clause}
                population DESC
            LIMIT ?
        """
        params = [*where_params, *order_params, limit]
        rows = conn.execute(sql, params).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_city_by_id(city_id: int) -> dict[str, Any] | None:
    with _connect() as conn:
        select_cols = _city_select_sql(conn)
        row = conn.execute(
            f"SELECT {select_cols} FROM cities WHERE id = ?",
            (city_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def resolve_city(name: str, *, country: str | None = None) -> dict[str, Any] | None:
    """Best-match city for a name string (exact ascii_name preferred)."""
    matches = search_cities(name, limit=1, country=country)
    return matches[0] if matches else None


def get_popular_cities() -> list[dict[str, Any]]:
    placeholders = ",".join("?" for _ in POPULAR_CITY_IDS)
    with _connect() as conn:
        select_cols = _city_select_sql(conn)
        rows = conn.execute(
            f"""
            SELECT {select_cols}
            FROM cities
            WHERE id IN ({placeholders})
            ORDER BY population DESC
            """,
            POPULAR_CITY_IDS,
        ).fetchall()
    return [_row_to_dict(row) for row in rows]


def count_cities(*, country: str | None = None) -> int:
    with _connect() as conn:
        if country:
            row = conn.execute(
                "SELECT COUNT(*) FROM cities WHERE country = ?",
                (country.upper(),),
            ).fetchone()
        else:
            row = conn.execute("SELECT COUNT(*) FROM cities").fetchone()
    return int(row[0]) if row else 0


def ensure_cities_source(source_path: Path | None = None) -> Path:
    """Ensure GeoNames cities15000.txt exists, downloading from geonames.org if needed."""
    source_path = source_path or cities_source_path()
    if source_path.is_file():
        return source_path

    source_path.parent.mkdir(parents=True, exist_ok=True)
    zip_path = source_path.with_suffix(".zip")

    print(f"Downloading GeoNames cities15000 from {GEONAMES_CITIES_URL} ...")
    _geonames_urlretrieve(GEONAMES_CITIES_URL, zip_path)

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
    _geonames_urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        if f"{cc}.txt" not in archive.namelist():
            raise RuntimeError(f"Expected {cc}.txt in {url}, got: {archive.namelist()}")
        archive.extract(f"{cc}.txt", path=data_dir)
    zip_path.unlink(missing_ok=True)
    return txt_path


def ensure_admin1_codes(data_dir: Path | None = None) -> Path:
    """Download GeoNames admin1CodesASCII.txt if missing."""
    data_dir = data_dir or cities_source_path().parent
    path = data_dir / "admin1CodesASCII.txt"
    if path.is_file():
        return path
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"Downloading GeoNames admin1 codes from {GEONAMES_ADMIN1_URL} ...")
    _geonames_urlretrieve(GEONAMES_ADMIN1_URL, path)
    return path


def _load_admin1_names(path: Path) -> dict[tuple[str, str], str]:
    """Map (country, admin1_code) -> admin1 display name."""
    names: dict[tuple[str, str], str] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2:
                continue
            code_parts = parts[0].split(".", 1)
            if len(code_parts) != 2:
                continue
            country, admin1 = code_parts
            names[(country.upper(), admin1)] = parts[1]
    return names


def _iter_geonames_rows(
    path: Path,
    *,
    feature_class: str | None = None,
    admin1_names: dict[tuple[str, str], str] | None = None,
):
    """Yield city tuples from a GeoNames TSV dump."""
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 15:
                continue
            if feature_class is not None and parts[6] != feature_class:
                continue
            try:
                country = parts[8]
                admin1 = parts[10] if len(parts) > 10 and parts[10] else None
                admin1_name = None
                if admin1 and admin1_names:
                    admin1_name = admin1_names.get((country.upper(), admin1))
                yield (
                    int(parts[0]),
                    parts[1],
                    parts[2],
                    float(parts[4]),
                    float(parts[5]),
                    country,
                    int(parts[14]) if parts[14] else 0,
                    parts[17] if len(parts) > 17 and parts[17] else None,
                    admin1,
                    admin1_name,
                )
            except (ValueError, IndexError):
                continue


def import_cities(
    *,
    db_path: Path | None = None,
    source_path: Path | None = None,
    full_coverage_countries: tuple[str, ...] = FULL_COVERAGE_COUNTRIES,
) -> int:
    """Build cities.db from GeoNames data. Returns row count."""
    db_path = db_path or cities_db_path()
    source_path = ensure_cities_source(source_path)
    admin1_path = ensure_admin1_codes(data_dir=source_path.parent)
    admin1_names = _load_admin1_names(admin1_path)

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
            timezone TEXT,
            admin1 TEXT,
            admin1_name TEXT
        );
        CREATE INDEX idx_cities_ascii_name ON cities(ascii_name COLLATE NOCASE);
        CREATE INDEX idx_cities_name ON cities(name);
        CREATE INDEX idx_cities_country ON cities(country);
        CREATE INDEX idx_cities_population ON cities(population DESC);
        CREATE INDEX idx_cities_country_ascii ON cities(country, ascii_name COLLATE NOCASE);
        """
    )

    insert_sql = """
        INSERT OR IGNORE INTO cities
        (id, name, ascii_name, lat, lon, country, population, timezone, admin1, admin1_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    cur.executemany(
        insert_sql,
        _iter_geonames_rows(source_path, admin1_names=admin1_names),
    )
    for cc in full_coverage_countries:
        country_path = ensure_country_source(cc, data_dir=source_path.parent)
        cur.executemany(
            insert_sql,
            _iter_geonames_rows(
                country_path,
                feature_class=_POPULATED_PLACE_CLASS,
                admin1_names=admin1_names,
            ),
        )

    count = cur.execute("SELECT COUNT(*) FROM cities").fetchone()[0]
    np_count = cur.execute(
        "SELECT COUNT(*) FROM cities WHERE country = 'NP'"
    ).fetchone()[0]
    conn.commit()
    conn.close()

    cities_db_version_path().write_text(str(CITIES_DB_VERSION), encoding="utf-8")
    print(f"Nepal cities imported: {np_count}")
    return count


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    keys = row.keys()
    return {
        "id": row["id"],
        "name": row["name"],
        "ascii_name": row["ascii_name"],
        "lat": row["lat"],
        "lon": row["lon"],
        "country": row["country"],
        "population": row["population"],
        "timezone": row["timezone"],
        "admin1": row["admin1"] if "admin1" in keys else None,
        "admin1_name": row["admin1_name"] if "admin1_name" in keys else None,
    }
