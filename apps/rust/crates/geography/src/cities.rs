//! The GeoNames `cities` table.

use std::{
    path::{Path, PathBuf},
    sync::{Arc, OnceLock},
};

use rusqlite::{Connection, OpenFlags, Row, params_from_iter, types::Value as SqlValue};
use serde_json::{Value, json};

/// Curated popular cities (Nepal plus diaspora hubs), GeoNames ids.
pub const POPULAR_CITY_IDS: [i64; 13] = [
    1_283_240, 1_282_898, 1_283_613, 1_282_931, 1_283_582, 1_283_562, 1_283_460, 6_941_099,
    1_283_095, 1_275_339, 1_273_294, 2_147_714, 5_128_581,
];

const BASE_COLS: &str = "id, name, ascii_name, lat, lon, country, population, timezone";

/// One row of the `cities` table (`_row_to_dict`).
#[derive(Debug, Clone, PartialEq)]
pub struct City {
    /// GeoNames id.
    pub id: i64,
    /// Name as GeoNames gives it.
    pub name: String,
    /// ASCII name.
    pub ascii_name: String,
    /// Degrees north.
    pub lat: f64,
    /// Degrees east.
    pub lon: f64,
    /// ISO country code.
    pub country: String,
    /// Population (0 for most villages).
    pub population: i64,
    /// IANA zone, if GeoNames gives one.
    pub timezone: Option<String>,
    /// First-level admin code.
    pub admin1: Option<String>,
    /// First-level admin name.
    pub admin1_name: Option<String>,
}

impl City {
    /// The row as the API returns it.
    #[must_use]
    pub fn to_json(&self) -> Value {
        json!({
            "id": self.id, "name": self.name, "ascii_name": self.ascii_name, "lat": self.lat, "lon": self.lon,
            "country": self.country, "population": self.population, "timezone": self.timezone,
            "admin1": self.admin1, "admin1_name": self.admin1_name,
        })
    }
}

/// Why `cities.db` could not answer.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum CitiesError {
    /// The database file is missing.
    #[error("Cities database not found at {0}. Run: python scripts/import_cities.py")]
    Missing(PathBuf),
    /// `SQLite` failed.
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
}

/// Whether the table has the admin1 columns (newer imports).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Cols {
    Base,
    WithAdmin,
}

/// One city as the nearest-city search needs it.
#[derive(Debug)]
struct Point {
    id: i64,
    lat: f64,
    lon: f64,
    population: i64,
    country: Box<str>,
}

/// Every city's position, sorted by (latitude, id): the order SQLite walks its
/// `idx_cities_lat` index in, so the in-memory search breaks ties as the query did.
type Points = Arc<[Point]>;

/// Read-only access to `cities.db`.
#[derive(Debug, Clone)]
pub struct Cities {
    path: PathBuf,
    /// Loaded on the first nearest-city search (about 5 MB for 120k cities): a search
    /// is then a binary search and a short scan, where the database built a full row
    /// for every city in the latitude band, worldwide.
    points: Arc<OnceLock<Option<Points>>>,
}

fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0088;
    let (p1, p2) = (lat1.to_radians(), lat2.to_radians());
    let dphi = (lat2 - lat1).to_radians();
    let dlmb = (lon2 - lon1).to_radians();
    let a = (dphi / 2.0).sin() * (dphi / 2.0).sin()
        + p1.cos() * p2.cos() * ((dlmb / 2.0).sin() * (dlmb / 2.0).sin());
    2.0 * r * a.sqrt().asin()
}

/// Python's `round(x, n)`.
pub(crate) fn py_round(x: f64, n: usize) -> f64 {
    format!("{x:.n$}").parse().unwrap_or(x)
}

fn aliases(query: &str) -> &'static [&'static str] {
    match query {
        "kanchanpur" | "kañchanpur" | "कञ्चनपुर" => {
            &["bhimdatta", "mahendranagar"]
        }
        "mahendranagar" | "महेन्द्रनगर" => &["bhimdatta"],
        _ => &[],
    }
}

fn preferred_id(query: &str) -> Option<i64> {
    matches!(
        query,
        "kanchanpur"
            | "kañchanpur"
            | "कञ्चनपुर"
            | "mahendranagar"
            | "महेन्द्रनगर"
            | "bhimdatta"
            | "भिमदत्त"
    )
    .then_some(1_283_095)
}

impl Cities {
    /// The database at `path` (opened per query, read-only).
    #[must_use]
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self {
            path: path.as_ref().to_path_buf(),
            points: Arc::new(OnceLock::new()),
        }
    }

    fn points(&self) -> Option<&Points> {
        self.points.get_or_init(|| self.load_points().ok()).as_ref()
    }

    fn load_points(&self) -> Result<Points, CitiesError> {
        let conn = self.connect()?;
        let mut stmt =
            conn.prepare("SELECT id, lat, lon, population, country FROM cities ORDER BY lat, id")?;
        let rows = stmt.query_map([], |r| {
            Ok(Point {
                id: r.get(0)?,
                lat: r.get(1)?,
                lon: r.get(2)?,
                population: r.get(3)?,
                country: r.get::<_, String>(4)?.into_boxed_str(),
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?.into())
    }

    /// The nearest city inside a box, as the bounding-box query finds it: candidates in
    /// the order SQLite reads them (by latitude, or by id when a country index serves
    /// the query), the last one at the least distance winning.
    fn nearest_in_box(
        &self,
        (lat_q, lon_q): (f64, f64),
        min_population: i64,
        max_km: f64,
        country: Option<&str>,
    ) -> Result<Option<City>, CitiesError> {
        let Some(points) = self.points() else {
            return Err(CitiesError::Missing(self.path.clone()));
        };
        let dlat = max_km / 111.0;
        let dlon = max_km / (111.0 * lat_q.to_radians().cos()).max(1e-6);
        let (lat_lo, lat_hi) = (lat_q - dlat, lat_q + dlat);
        let (lon_lo, lon_hi) = (lon_q - dlon, lon_q + dlon);
        let start = points.partition_point(|p| p.lat < lat_lo);
        let end = points.partition_point(|p| p.lat <= lat_hi);
        let code = country.map(str::to_uppercase);
        let mut candidates: Vec<&Point> = points[start..end]
            .iter()
            .filter(|p| {
                p.population >= min_population
                    && (lon_lo..=lon_hi).contains(&p.lon)
                    && code.as_deref().is_none_or(|c| &*p.country == c)
            })
            .collect();
        if code.is_some() {
            candidates.sort_by_key(|p| p.id);
        }
        let mut best = None;
        let mut best_km = max_km;
        for p in candidates {
            let km = haversine_km(lat_q, lon_q, p.lat, p.lon);
            if km <= best_km {
                best_km = km;
                best = Some(p.id);
            }
        }
        best.map_or(Ok(None), |id| self.by_id(id))
    }

    fn connect(&self) -> Result<Connection, CitiesError> {
        if !self.path.is_file() {
            return Err(CitiesError::Missing(self.path.clone()));
        }
        Ok(Connection::open_with_flags(
            &self.path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?)
    }

    fn cols(conn: &Connection) -> Result<Cols, CitiesError> {
        Ok(if Self::has_admin(conn)? {
            Cols::WithAdmin
        } else {
            Cols::Base
        })
    }

    fn has_admin(conn: &Connection) -> Result<bool, CitiesError> {
        let mut stmt = conn.prepare("PRAGMA table_info(cities)")?;
        let cols: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(1))?
            .collect::<Result<_, _>>()?;
        Ok(cols.iter().any(|c| c == "admin1") && cols.iter().any(|c| c == "admin1_name"))
    }

    fn select_cols(conn: &Connection) -> Result<String, CitiesError> {
        Ok(if Self::has_admin(conn)? {
            format!("{BASE_COLS}, admin1, admin1_name")
        } else {
            BASE_COLS.to_owned()
        })
    }

    fn row(r: &Row<'_>, cols: Cols) -> rusqlite::Result<City> {
        let admin = cols == Cols::WithAdmin;
        Ok(City {
            id: r.get("id")?,
            name: r.get("name")?,
            ascii_name: r.get("ascii_name")?,
            lat: r.get("lat")?,
            lon: r.get("lon")?,
            country: r.get("country")?,
            population: r.get::<_, Option<i64>>("population")?.unwrap_or(0),
            timezone: r.get("timezone")?,
            admin1: if admin { r.get("admin1")? } else { None },
            admin1_name: if admin { r.get("admin1_name")? } else { None },
        })
    }

    fn query(&self, sql_tail: &str, params: Vec<SqlValue>) -> Result<Vec<City>, CitiesError> {
        let conn = self.connect()?;
        let admin = Self::cols(&conn)?;
        let cols = Self::select_cols(&conn)?;
        let mut stmt = conn.prepare(&format!("SELECT {cols} FROM cities {sql_tail}"))?;
        let rows = stmt.query_map(params_from_iter(params), |r| Self::row(r, admin))?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// A city by GeoNames id (`get_city_by_id`).
    ///
    /// # Errors
    ///
    /// When the database is missing or unreadable.
    pub fn by_id(&self, id: i64) -> Result<Option<City>, CitiesError> {
        Ok(self
            .query("WHERE id = ?", vec![SqlValue::Integer(id)])?
            .into_iter()
            .next())
    }

    /// The curated popular cities, most populous first (`get_popular_cities`).
    ///
    /// # Errors
    ///
    /// When the database is missing or unreadable.
    pub fn popular(&self) -> Result<Vec<City>, CitiesError> {
        let marks = vec!["?"; POPULAR_CITY_IDS.len()].join(",");
        self.query(
            &format!("WHERE id IN ({marks}) ORDER BY population DESC"),
            POPULAR_CITY_IDS
                .iter()
                .map(|i| SqlValue::Integer(*i))
                .collect(),
        )
    }

    /// Cities matching a name, by relevance then population (`search_cities`).
    ///
    /// # Errors
    ///
    /// When the database is missing or unreadable.
    pub fn search(
        &self,
        query: &str,
        limit: usize,
        country: Option<&str>,
        prioritize_country: Option<&str>,
    ) -> Result<Vec<City>, CitiesError> {
        let q = query.trim();
        if q.is_empty() {
            return Ok(Vec::new());
        }
        let exact = q.to_lowercase();
        let (like, prefix) = (format!("%{q}%"), format!("{q}%").to_lowercase());
        let conn = self.connect()?;
        let admin = Self::cols(&conn)?;
        let cols = Self::select_cols(&conn)?;
        let inner = cols.replacen("population", "MAX(population) AS population", 1);
        let group = if admin == Cols::WithAdmin {
            "GROUP BY lower(ascii_name), country, COALESCE(admin1, '')"
        } else {
            "GROUP BY lower(ascii_name), country"
        };
        let mut params: Vec<SqlValue> = vec![like.clone().into(), like.into()];
        let mut filter = String::from("(ascii_name LIKE ? OR name LIKE ?)");
        if let Some(c) = country {
            filter.push_str(" AND country = ?");
            params.push(c.to_uppercase().into());
        }
        params.extend([
            exact.clone().into(),
            exact.clone().into(),
            prefix.clone().into(),
            prefix.into(),
        ]);
        let priority = if let Some(p) = prioritize_country {
            params.push(p.to_uppercase().into());
            "CASE WHEN country = ? THEN 0 ELSE 1 END,"
        } else {
            ""
        };
        params.push(SqlValue::Integer(i64::try_from(limit).unwrap_or(i64::MAX)));
        let sql = format!(
            "SELECT {cols} FROM (SELECT {inner} FROM cities WHERE {filter} {group}) ORDER BY CASE WHEN lower(ascii_name) = ? THEN 0 WHEN lower(name) = ? THEN 1 WHEN lower(ascii_name) LIKE ? THEN 2 WHEN lower(name) LIKE ? THEN 3 ELSE 4 END, {priority} population DESC LIMIT ?"
        );
        let mut stmt = conn.prepare(&sql)?;
        let mut results: Vec<City> = stmt
            .query_map(params_from_iter(params), |r| Self::row(r, admin))?
            .collect::<Result<_, _>>()?;
        // `_inject_alias_matches`
        let mut extras = Vec::new();
        for alias in aliases(&exact).iter().chain(if aliases(&exact).is_empty() {
            aliases(q)
        } else {
            &[]
        }) {
            let like = format!("%{alias}%");
            let mut p: Vec<SqlValue> = vec![
                like.clone().into(),
                like.into(),
                alias.to_lowercase().into(),
            ];
            let mut w = String::from("(ascii_name LIKE ? OR name LIKE ? OR lower(ascii_name) = ?)");
            if let Some(c) = country {
                w.push_str(" AND country = ?");
                p.push(c.to_uppercase().into());
            }
            for city in self.query(&format!("WHERE {w} ORDER BY population DESC LIMIT 3"), p)? {
                if !results
                    .iter()
                    .chain(&extras)
                    .any(|c: &City| c.id == city.id)
                {
                    extras.push(city);
                }
            }
        }
        if !extras.is_empty() {
            extras.append(&mut results);
            results = extras;
        }
        // `_prefer_canonical_city`
        if let Some(pid) = preferred_id(&exact).or_else(|| preferred_id(q)) {
            if let Some(mut preferred) = self.by_id(pid)? {
                if country.is_none_or(|c| preferred.country == c.to_uppercase()) {
                    if matches!(exact.as_str(), "kanchanpur" | "kañchanpur") || q == "कञ्चनपुर"
                    {
                        "कञ्चनपुर (भिमदत्त)".clone_into(&mut preferred.name);
                        "Kanchanpur (Bhimdatta)".clone_into(&mut preferred.ascii_name);
                    } else if exact == "mahendranagar" || q == "महेन्द्रनगर" {
                        "महेन्द्रनगर (भिमदत्त)".clone_into(&mut preferred.name);
                        "Mahendranagar (Bhimdatta)".clone_into(&mut preferred.ascii_name);
                    }
                    results.retain(|c| c.id != pid);
                    results.insert(0, preferred);
                }
            }
        }
        results.truncate(limit);
        Ok(results)
    }

    /// Nearest populated city within `max_km` (`nearest_city`), coordinates rounded to 0.001°.
    ///
    /// # Errors
    ///
    /// When the database is missing or unreadable.
    pub fn nearest(
        &self,
        lat: f64,
        lon: f64,
        min_population: i64,
        max_km: f64,
    ) -> Result<Option<City>, CitiesError> {
        self.nearest_in_box(
            (py_round(lat, 3), py_round(lon, 3)),
            min_population,
            max_km,
            None,
        )
    }

    /// Nearest populated city with no distance limit (`nearest_city_global`).
    ///
    /// Widens the bounding box first, then falls back to a full scan.
    ///
    /// # Errors
    ///
    /// When the database is missing or unreadable.
    pub fn nearest_global(
        &self,
        lat: f64,
        lon: f64,
        min_population: i64,
        country: Option<&str>,
    ) -> Result<Option<City>, CitiesError> {
        for radius in [60.0_f64, 250.0, 1000.0] {
            if let Some(hit) =
                self.nearest_with_country(lat, lon, min_population, radius, country)?
            {
                return Ok(Some(hit));
            }
        }
        self.full_scan_nearest(lat, lon, min_population, country)
    }

    fn nearest_with_country(
        &self,
        lat: f64,
        lon: f64,
        min_population: i64,
        max_km: f64,
        country: Option<&str>,
    ) -> Result<Option<City>, CitiesError> {
        self.nearest_in_box(
            (py_round(lat, 3), py_round(lon, 3)),
            min_population,
            max_km,
            country,
        )
    }

    fn full_scan_nearest(
        &self,
        lat: f64,
        lon: f64,
        min_population: i64,
        country: Option<&str>,
    ) -> Result<Option<City>, CitiesError> {
        let (lat_q, lon_q) = (py_round(lat, 3), py_round(lon, 3));
        let mut params: Vec<SqlValue> = vec![min_population.into()];
        let mut where_sql = String::from("WHERE population >= ?");
        if let Some(code) = country {
            where_sql.push_str(" AND country = ?");
            params.push(code.to_uppercase().into());
        }
        let rows = self.query(&where_sql, params)?;
        let mut best = None;
        let mut best_km = f64::INFINITY;
        for city in rows {
            let km = haversine_km(lat_q, lon_q, city.lat, city.lon);
            if km < best_km {
                best_km = km;
                best = Some(city);
            }
        }
        Ok(best)
    }
}
