//! Writes the read-only API data guests ask for as static JSON files for R2
//! (static.vedicpatro.com), so those reads never reach the server.
//!
//! Every file is the body the API itself returns: the exporter drives the real router in
//! process, so the files cannot drift from the API. The client (packages/api-client/src/static-data.ts)
//! reads `manifest.json`, then `v{version}/…`, and falls back to the API on any miss.
//!
//! Usage: `cargo run --bin export_static -- <out_dir> <version> [first_year last_year]`
//! (run from apps/rust, with the data DBs in config's `data_dir`). See scripts/export-static.sh.

use std::{collections::BTreeMap, path::PathBuf};

use anyhow::{Context, bail, ensure};
use api::AppState;
use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use common::AppConfig;
use geography::Cities;
use serde_json::{Value, json};
use tower::ServiceExt;

/// Tile edge in degrees for the nearest-city files (the client reads it from `manifest.json`).
const TILE_DEG: f64 = 0.5;

struct Export {
    app: Router,
    dir: PathBuf,
    files: usize,
}

impl Export {
    /// The API's answer to `GET uri`, or `None` for a 4xx (a date or slug that does not exist).
    async fn get(&self, uri: &str) -> anyhow::Result<Option<Vec<u8>>> {
        let response = self
            .app
            .clone()
            .oneshot(Request::get(uri).body(Body::empty())?)
            .await?;
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX).await?;
        if status.is_client_error() {
            return Ok(None);
        }
        ensure!(status == StatusCode::OK, "{uri}: {status}");
        Ok(Some(body.to_vec()))
    }

    fn write(&mut self, file: &str, bytes: &[u8]) -> anyhow::Result<()> {
        let path = self.dir.join(file);
        std::fs::create_dir_all(path.parent().context("file has a parent")?)?;
        std::fs::write(&path, bytes).with_context(|| path.display().to_string())?;
        self.files += 1;
        Ok(())
    }

    /// `GET uri` saved as `file`; a 4xx is an error here (these routes always answer).
    async fn copy(&mut self, uri: &str, file: &str) -> anyhow::Result<Value> {
        let Some(bytes) = self.get(uri).await? else {
            bail!("{uri}: not found");
        };
        self.write(file, &bytes)?;
        Ok(serde_json::from_slice(&bytes)?)
    }
}

fn tile_key(lat: f64, lon: f64) -> String {
    // Tile indexes are small integers (|lat| <= 90 / 0.5).
    #[expect(clippy::cast_possible_truncation, reason = "bounded by ±360")]
    let (a, b) = (
        (lat / TILE_DEG).floor() as i32,
        (lon / TILE_DEG).floor() as i32,
    );
    format!("{a}_{b}")
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (Some(out), Some(version)) = (args.first(), args.get(1)) else {
        bail!("usage: export_static <out_dir> <version> [first_year last_year]");
    };
    ensure!(
        version
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-'),
        "version must be [A-Za-z0-9-]"
    );
    let this_year = i32::try_from(
        1970 + std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs()
            / 31_556_952,
    )?;
    let first_year: i32 = args.get(2).map_or(Ok(this_year - 1), |s| s.parse())?;
    let last_year: i32 = args.get(3).map_or(Ok(this_year + 2), |s| s.parse())?;

    let config = AppConfig::load("config").context("loading configuration")?;
    let cities = Cities::new(config.cities_db());
    let root = PathBuf::from(out);
    let mut ex = Export {
        app: api::router(AppState::new(config)),
        dir: root.join(format!("v{version}")),
        files: 0,
    };

    // Not exported: /meta/capabilities and the kundali references follow the server code (the
    // client pins their versions), so a file left from an older export would answer wrongly.
    ex.copy("/v1/nepal/cities/popular", "cities/popular.json")
        .await?;
    export_city_tiles(&mut ex, &cities)?;
    export_documents(&mut ex).await?;
    export_veda_daily(&mut ex, first_year, last_year).await?;

    let manifest = json!({
        "version": version,
        "tile_deg": TILE_DEG,
        "veda_daily_years": [first_year, last_year],
    });
    std::fs::write(root.join("manifest.json"), manifest.to_string())?;
    println!("exported {} files to {}", ex.files, ex.dir.display());
    Ok(())
}

/// `cities/tile/{a}_{b}.json`: every city in a 0.5° cell, as rows in `City::to_json` field order.
fn export_city_tiles(ex: &mut Export, cities: &Cities) -> anyhow::Result<()> {
    let mut tiles: BTreeMap<String, Vec<Value>> = BTreeMap::new();
    for c in cities.all()? {
        tiles
            .entry(tile_key(c.lat, c.lon))
            .or_default()
            .push(json!([
                c.id,
                c.name,
                c.ascii_name,
                c.lat,
                c.lon,
                c.country,
                c.population,
                c.timezone,
                c.admin1,
                c.admin1_name
            ]));
    }
    ensure!(!tiles.is_empty(), "cities.db has no cities");
    for (key, rows) in tiles {
        ex.write(
            &format!("cities/tile/{key}.json"),
            Value::Array(rows).to_string().as_bytes(),
        )?;
    }
    Ok(())
}

/// The document list, every document, every whole chapter, and the verse-detail value lists.
async fn export_documents(ex: &mut Export) -> anyhow::Result<()> {
    let list = ex.copy("/v1/documents", "documents/index.json").await?;
    let slugs: Vec<String> = list["documents"]
        .as_array()
        .context("documents list")?
        .iter()
        .filter_map(|d| d["slug"].as_str().map(str::to_owned))
        .collect();
    for slug in &slugs {
        ensure!(is_safe_segment(slug), "unexpected slug {slug:?}");
        let doc = ex
            .copy(
                &format!("/v1/documents/{slug}"),
                &format!("documents/{slug}.json"),
            )
            .await?;
        for number in doc["chapters"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|c| c["number"].as_i64())
        {
            ex.copy(
                &format!("/v1/documents/{slug}/chapters/{number}"),
                &format!("documents/{slug}/{number}.json"),
            )
            .await?;
        }
    }
    for kind in ["devata", "rishi", "chhanda", "svara"] {
        ex.copy(
            &format!("/v1/veda/details/{kind}/values"),
            &format!("veda/details/{kind}/values.json"),
        )
        .await?;
        for slug in &slugs {
            if let Some(bytes) = ex
                .get(&format!("/v1/veda/details/{kind}/values?slug={slug}"))
                .await?
            {
                ex.write(&format!("veda/details/{kind}/values-{slug}.json"), &bytes)?;
            }
        }
    }
    Ok(())
}

/// `veda/daily/{yyyy}-{mm}.json`: `{ "yyyy-mm-dd": <the /veda/daily answer> }` for each day.
async fn export_veda_daily(ex: &mut Export, first: i32, last: i32) -> anyhow::Result<()> {
    for year in first..=last {
        for month in 1..=12 {
            let mut days = serde_json::Map::new();
            for day in 1..=31 {
                let date = format!("{year:04}-{month:02}-{day:02}");
                if let Some(bytes) = ex.get(&format!("/v1/veda/daily?date={date}")).await? {
                    days.insert(date, serde_json::from_slice(&bytes)?);
                }
            }
            ensure!(
                days.len() >= 28,
                "{year}-{month:02}: only {} days",
                days.len()
            );
            ex.write(
                &format!("veda/daily/{year:04}-{month:02}.json"),
                Value::Object(days).to_string().as_bytes(),
            )?;
        }
    }
    Ok(())
}

/// A slug that is safe as one path segment of a file and a URL.
fn is_safe_segment(s: &str) -> bool {
    !s.is_empty()
        && s != "."
        && s != ".."
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiles_floor_toward_minus_infinity() {
        assert_eq!(tile_key(27.7, 85.3), "55_170");
        assert_eq!(tile_key(-0.1, -0.1), "-1_-1");
        assert_eq!(tile_key(0.0, 0.5), "0_1");
    }

    #[test]
    fn slugs_stay_one_segment() {
        assert!(is_safe_segment("rig-veda"));
        assert!(!is_safe_segment("../x"));
        assert!(!is_safe_segment(".."));
    }
}
