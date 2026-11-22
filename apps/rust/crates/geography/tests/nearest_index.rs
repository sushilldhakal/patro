//! The in-memory nearest-city search finds the same city as the bounding-box SQL it
//! replaced, including which of two cities at the same spot wins.

use geography::Cities;
use rusqlite::{Connection, params};

const DB: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../api/data/cities.db");

fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0088;
    let (p1, p2) = (lat1.to_radians(), lat2.to_radians());
    let dphi = (lat2 - lat1).to_radians();
    let dlmb = (lon2 - lon1).to_radians();
    let a = (dphi / 2.0).sin() * (dphi / 2.0).sin()
        + p1.cos() * p2.cos() * ((dlmb / 2.0).sin() * (dlmb / 2.0).sin());
    2.0 * r * a.sqrt().asin()
}

fn round3(x: f64) -> f64 {
    (x * 1000.0).round() / 1000.0
}

/// The query the server used to run, and its loop.
fn sql_nearest(conn: &Connection, lat: f64, lon: f64, min_pop: i64, max_km: f64) -> Option<i64> {
    let (lat_q, lon_q) = (round3(lat), round3(lon));
    let dlat = max_km / 111.0;
    let dlon = max_km / (111.0 * lat_q.to_radians().cos()).max(1e-6);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM cities WHERE population >= ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
        )
        .expect("prepare");
    let rows = stmt
        .query_map(
            params![
                min_pop,
                lat_q - dlat,
                lat_q + dlat,
                lon_q - dlon,
                lon_q + dlon
            ],
            |r| {
                Ok((
                    r.get::<_, i64>("id")?,
                    r.get::<_, f64>("lat")?,
                    r.get::<_, f64>("lon")?,
                ))
            },
        )
        .expect("query");
    let mut best = None;
    let mut best_km = max_km;
    for row in rows {
        let (id, la, lo) = row.expect("row");
        let km = haversine_km(lat_q, lon_q, la, lo);
        if km <= best_km {
            best_km = km;
            best = Some(id);
        }
    }
    best
}

#[test]
fn nearest_matches_the_bounding_box_query_everywhere() {
    if !std::path::Path::new(DB).is_file() {
        return;
    }
    let conn = Connection::open(DB).expect("open");
    let cities = Cities::new(DB);
    let mut x: u64 = 0x5DEE_CE66_D1CE_4E5B;
    let mut unit = || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        u
    };
    let mut probes: Vec<(f64, f64)> = (0..400)
        .map(|_| (-60.0 + unit() * 130.0, -180.0 + unit() * 360.0))
        .collect();
    // Dense places, where ties and close calls happen.
    probes.extend((0..150).map(|_| (26.5 + unit() * 4.0, 80.0 + unit() * 8.5)));
    let mut found = 0;
    for (lat, lon) in probes {
        for (min_pop, km) in [(1, 60.0), (1000, 60.0), (1, 250.0)] {
            let got = cities
                .nearest(lat, lon, min_pop, km)
                .expect("search")
                .map(|c| c.id);
            assert_eq!(
                got,
                sql_nearest(&conn, lat, lon, min_pop, km),
                "{lat},{lon} pop {min_pop} {km} km"
            );
            found += usize::from(got.is_some());
        }
    }
    assert!(found > 150, "found {found}");
}

#[test]
fn cities_at_the_same_spot_resolve_as_the_query_did() {
    if !std::path::Path::new(DB).is_file() {
        return;
    }
    let conn = Connection::open(DB).expect("open");
    let cities = Cities::new(DB);
    let mut stmt = conn
        .prepare("SELECT lat, lon FROM cities GROUP BY lat, lon HAVING count(*) > 1")
        .expect("prepare");
    let spots: Vec<(f64, f64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .expect("query")
        .collect::<Result<_, _>>()
        .expect("rows");
    assert!(!spots.is_empty(), "the database has shared spots");
    for (lat, lon) in spots {
        let got = cities
            .nearest(lat, lon, 1, 60.0)
            .expect("search")
            .map(|c| c.id);
        assert_eq!(got, sql_nearest(&conn, lat, lon, 1, 60.0), "{lat},{lon}");
    }
}
