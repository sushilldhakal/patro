"""GeoNames cities lookup — SQLite-backed search and resolution."""

from __future__ import annotations

import math
import os
import sqlite3
import ssl
import urllib.request
import zipfile
from functools import lru_cache
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

# GeoNames ids are globally stable; these are verified against data/cities.db
# (name + population) — see test_popular_city_ids. The curated set is NP cities
# plus a few diaspora hubs. Note: GeoNames has no populated "Lalitpur" record —
# the city is filed under its historic name "Patan" (1282931).
POPULAR_CITY_IDS = (
    1283240,   # Kathmandu, NP        pop 1,442,271
    1282898,   # Pokhara, NP         pop 600,051   (was 1282951 = Palun)
    1283613,   # Bharatpur, NP       pop 369,377   (was 1283368 = Gulariya)
    1282931,   # Lalitpur / Patan, NP pop 299,283  (was 1283678 = Baneswar)
    1283582,   # Biratnagar, NP      pop 244,750
    1283562,   # Butwal, NP          pop 195,054   (was 1283621 = Siddharthanagar)
    1283460,   # Dharan, NP          pop 173,096   (was 1283467 = Dhangadhi)
    6941099,   # Nepalgunj, NP       pop 166,258   (was 1283628 = Bhadrapur)
    1283095,   # Bhimdatta (Kanchanpur HQ / Mahendranagar), NP  pop 88,381
    1275339,   # Mumbai, IN          pop 12,691,836
    1273294,   # Delhi, IN           pop 11,034,555
    2147714,   # Sydney, AU          pop 5,557,233
    5128581,   # New York City, US   pop 8,804,190
)

# GeoNames labels several small inland places "Kanchanpur", but Nepal users
# almost always mean the far-western district HQ (Bhimdatta / Mahendranagar).
# Wrong villages (~81–87°E) shrink देशान्तर from Jhapa to ~28 min instead of ~31.5.
CITY_SEARCH_ALIASES: dict[str, tuple[str, ...]] = {
    "kanchanpur": ("bhimdatta", "mahendranagar"),
    "kañchanpur": ("bhimdatta", "mahendranagar"),
    "कञ्चनपुर": ("bhimdatta", "mahendranagar"),
    "mahendranagar": ("bhimdatta",),
    "महेन्द्रनगर": ("bhimdatta",),
}

PREFERRED_CITY_IDS_BY_QUERY: dict[str, int] = {
    "kanchanpur": 1283095,   # Bhimdatta, Sudurpashchim
    "kañchanpur": 1283095,
    "कञ्चनपुर": 1283095,
    "mahendranagar": 1283095,
    "महेन्द्रनगर": 1283095,
    "bhimdatta": 1283095,
    "भिमदत्त": 1283095,
}

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
    preferred_id = PREFERRED_CITY_IDS_BY_QUERY.get(exact) or PREFERRED_CITY_IDS_BY_QUERY.get(q)

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

    results = [_row_to_dict(row) for row in rows]
    results = _inject_alias_matches(results, query=q, country=country, limit=limit)
    return _prefer_canonical_city(results, query=q, preferred_id=preferred_id, country=country)[:limit]


def _inject_alias_matches(
    results: list[dict[str, Any]],
    *,
    query: str,
    country: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    exact = query.strip().casefold()
    aliases = CITY_SEARCH_ALIASES.get(exact) or CITY_SEARCH_ALIASES.get(query.strip())
    if not aliases:
        return results

    seen = {row["id"] for row in results}
    extras: list[dict[str, Any]] = []
    for alias in aliases:
        like = f"%{alias}%"
        with _connect() as conn:
            select_cols = _city_select_sql(conn)
            where = "(ascii_name LIKE ? OR name LIKE ? OR lower(ascii_name) = ?)"
            params: list[Any] = [like, like, alias.casefold()]
            if country:
                where += " AND country = ?"
                params.append(country.upper())
            rows = conn.execute(
                f"""
                SELECT {select_cols}
                FROM cities
                WHERE {where}
                ORDER BY population DESC
                LIMIT 3
                """,
                params,
            ).fetchall()
        for row in rows:
            item = _row_to_dict(row)
            if item["id"] in seen:
                continue
            seen.add(item["id"])
            extras.append(item)
    if not extras:
        return results
    return extras + results


def _prefer_canonical_city(
    results: list[dict[str, Any]],
    *,
    query: str,
    preferred_id: int | None,
    country: str | None,
) -> list[dict[str, Any]]:
    if preferred_id is None:
        return results
    preferred = get_city_by_id(preferred_id)
    if preferred is None:
        return results
    if country is not None and preferred["country"] != country.upper():
        return results

    exact = query.strip().casefold()
    display = dict(preferred)
    if exact in {"kanchanpur", "kañchanpur"} or query.strip() in {"कञ्चनपुर"}:
        display["name"] = "कञ्चनपुर (भिमदत्त)"
        display["ascii_name"] = "Kanchanpur (Bhimdatta)"
    elif exact in {"mahendranagar"} or query.strip() in {"महेन्द्रनगर"}:
        display["name"] = "महेन्द्रनगर (भिमदत्त)"
        display["ascii_name"] = "Mahendranagar (Bhimdatta)"

    return [display] + [row for row in results if row["id"] != preferred_id]


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


# --- Nearest-city snapping (cache bucketing) --------------------------------
#
# Raw phone GPS is metre-precise and never repeats, so caching panchanga per
# exact coordinate would recompute for every user even when they stand in the
# same town. Instead we snap arbitrary (lat, lon) to the nearest *populated*
# city and cache under that city's stable id — everyone in a town then shares
# one computation. A patro's sunrise/sunset is a town-level figure anyway, so
# collapsing sub-town coordinates to the town centre is also culturally correct.
#
# GeoNames sets a population only on real towns (in Nepal, ~84 of ~88k places);
# the other 88k are pop=0 villages/wards. Filtering to population >= floor thus
# snaps to genuine towns/district HQs and skips the noise that would otherwise
# re-fragment the cache. Coordinates with no town within MAX_KM (remote hills)
# fall back to the caller's coarse grid snap instead of a far-away city.
NEAREST_CITY_MIN_POPULATION = int(os.environ.get("NEAREST_CITY_MIN_POPULATION", "1"))
NEAREST_CITY_MAX_KM = float(os.environ.get("NEAREST_CITY_MAX_KM", "60"))

_geo_index_ready = False


def _ensure_geo_index(conn: sqlite3.Connection) -> None:
    """Lazily add a latitude index so bounding-box snaps stay fast."""
    global _geo_index_ready
    if _geo_index_ready:
        return
    try:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cities_lat ON cities(lat)")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # read-only filesystem — the bounding-box scan still works
    _geo_index_ready = True


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@lru_cache(maxsize=8192)
def _nearest_city_cached(
    lat_q: float,
    lon_q: float,
    min_population: int,
    max_km: float,
    country: str | None,
) -> dict[str, Any] | None:
    # Bounding box (a few km of slack) prefilters candidates cheaply; haversine
    # then picks the true nearest among the handful inside the box.
    dlat = max_km / 111.0
    dlon = max_km / max(111.0 * math.cos(math.radians(lat_q)), 1e-6)

    where = "population >= ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?"
    params: list[Any] = [
        min_population,
        lat_q - dlat,
        lat_q + dlat,
        lon_q - dlon,
        lon_q + dlon,
    ]
    if country:
        where += " AND country = ?"
        params.append(country.upper())

    with _connect() as conn:
        _ensure_geo_index(conn)
        select_cols = _city_select_sql(conn)
        rows = conn.execute(
            f"SELECT {select_cols} FROM cities WHERE {where}",
            params,
        ).fetchall()

    best: dict[str, Any] | None = None
    best_km = max_km
    for row in rows:
        km = _haversine_km(lat_q, lon_q, row["lat"], row["lon"])
        if km <= best_km:
            best_km = km
            best = _row_to_dict(row)
    return best


def nearest_city(
    lat: float,
    lon: float,
    *,
    min_population: int = NEAREST_CITY_MIN_POPULATION,
    max_km: float = NEAREST_CITY_MAX_KM,
    country: str | None = None,
) -> dict[str, Any] | None:
    """Nearest populated city to (lat, lon) within ``max_km``, else ``None``.

    Coordinates are rounded (~110 m) before the memoized lookup so GPS jitter
    from many phones in one spot collapses to a single cached result. The
    returned dict is shared — treat it as read-only.
    """
    return _nearest_city_cached(
        round(lat, 3), round(lon, 3), min_population, max_km, country
    )


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


def top_cities_by_population(
    limit: int = 20, *, country: str | None = "NP"
) -> list[dict[str, Any]]:
    """Most populous cities (default Nepal) — the natural cache warm-up set,
    since these are exactly the towns nearest-city snapping collapses traffic to."""
    with _connect() as conn:
        select_cols = _city_select_sql(conn)
        where = "population > 0"
        params: list[Any] = []
        if country:
            where += " AND country = ?"
            params.append(country.upper())
        params.append(limit)
        rows = conn.execute(
            f"SELECT {select_cols} FROM cities WHERE {where} "
            f"ORDER BY population DESC LIMIT ?",
            params,
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
