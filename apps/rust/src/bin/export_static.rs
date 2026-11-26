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
use patro::catalog::DocumentsService;
use serde_json::{Value, json};
use tower::ServiceExt;

/// Verses per chunk file of a chapter or a verse-detail list (the client reads it from the index).
const CHUNK: usize = 200;

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
    // Recordings and images link through the API's /v1/asset redirect, which signs them when
    // asked: a signed link in a file would expire long before the file.
    let asset_base = std::env::var("STATIC_ASSET_BASE")
        .unwrap_or_else(|_| "https://www.vedicpatro.com/api/v1/asset".to_owned());
    let mut state = AppState::new(config);
    state.documents = state.documents.clone().with_asset_link_base(&asset_base);
    let documents = state.documents.clone();
    let mut ex = Export {
        app: api::router(state),
        dir: root.join(format!("v{version}")),
        files: 0,
    };

    // Not exported: /meta/capabilities and the kundali references follow the server code (the
    // client pins their versions), so a file left from an older export would answer wrongly.
    ex.copy("/v1/nepal/cities/popular", "cities/popular.json")
        .await?;
    export_city_tiles(&mut ex, &cities)?;
    export_documents(&mut ex, &documents).await?;
    export_verse_details(&mut ex).await?;
    export_veda_daily(&mut ex, first_year, last_year).await?;
    export_festival_years(&mut ex, first_year, last_year).await?;

    let manifest = json!({
        "version": version,
        "tile_deg": TILE_DEG,
        "chunk": CHUNK,
        "veda_daily_years": [first_year, last_year],
        "festival_years": { "ad": [first_year, last_year], "bs": [first_year + 56, last_year + 57] },
    });
    std::fs::write(root.join("manifest.json"), manifest.to_string())?;
    println!("exported {} files to {}", ex.files, ex.dir.display());
    Ok(())
}

/// `cities/all.json` (every city, by id, for the search on the device) and
/// `cities/tile/{a}_{b}.json` (every city in a 0.5° cell, for the nearest city), as rows in
/// `City::to_json` field order.
fn export_city_tiles(ex: &mut Export, cities: &Cities) -> anyhow::Result<()> {
    let mut tiles: BTreeMap<String, Vec<Value>> = BTreeMap::new();
    let mut all = Vec::new();
    for c in cities.all()? {
        let row = json!([
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
        ]);
        tiles
            .entry(tile_key(c.lat, c.lon))
            .or_default()
            .push(row.clone());
        all.push(row);
    }
    ensure!(!tiles.is_empty(), "cities.db has no cities");
    ex.write("cities/all.json", Value::Array(all).to_string().as_bytes())?;
    for (key, rows) in tiles {
        ex.write(
            &format!("cities/tile/{key}.json"),
            Value::Array(rows).to_string().as_bytes(),
        )?;
    }
    Ok(())
}

/// The document list, every document, every whole chapter, and the verse-detail value lists.
async fn export_documents(ex: &mut Export, documents: &DocumentsService) -> anyhow::Result<()> {
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
            export_chapter_pages(ex, documents, slug, number).await?;
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

/// `documents/{slug}/{n}/index.json` plus `c{k}.json` chunks: what the paged chapter route
/// (`?cursor&direction&limit&verse`) needs to answer on the device. The index holds the page
/// header, every verse's `global_order` and `verse_label` (the reader's verses drop both), and
/// the chunks the reader verses themselves, `CHUNK` to a file.
async fn export_chapter_pages(
    ex: &mut Export,
    documents: &DocumentsService,
    slug: &str,
    number: i64,
) -> anyhow::Result<()> {
    let index = documents
        .chapter_verse_index(slug, number)
        .map_err(|e| anyhow::anyhow!("{slug} {number}: {e:?}"))?;
    if index.is_empty() {
        return Ok(());
    }
    let mut verses = Vec::new();
    let mut header = None;
    let mut cursor: Option<i64> = None;
    loop {
        let uri = cursor.map_or_else(
            || format!("/v1/documents/{slug}/chapters/{number}?limit=100"),
            |c| format!("/v1/documents/{slug}/chapters/{number}?limit=100&cursor={c}"),
        );
        let Some(bytes) = ex.get(&uri).await? else {
            bail!("{uri}: not found");
        };
        let mut page: serde_json::Map<String, Value> = serde_json::from_slice(&bytes)?;
        let next = page.get("next_cursor").and_then(Value::as_i64);
        if let Some(Value::Array(list)) = page.shift_remove("verses") {
            verses.extend(list);
        }
        for key in ["next_cursor", "prev_cursor", "total"] {
            page.shift_remove(key);
        }
        header.get_or_insert(page);
        match next {
            Some(c) => cursor = Some(c),
            None => break,
        }
    }
    ensure!(
        verses.len() == index.len(),
        "{slug} {number}: {} verses paged, {} in the index",
        verses.len(),
        index.len()
    );
    let (orders, labels): (Vec<i64>, Vec<Option<String>>) = index.into_iter().unzip();
    ex.write(
        &format!("documents/{slug}/{number}/index.json"),
        json!({ "header": header, "total": orders.len(), "orders": orders, "labels": labels, "chunk": CHUNK })
            .to_string()
            .as_bytes(),
    )?;
    for (k, chunk) in verses.chunks(CHUNK).enumerate() {
        ex.write(
            &format!("documents/{slug}/{number}/c{k}.json"),
            Value::Array(chunk.to_vec()).to_string().as_bytes(),
        )?;
    }
    Ok(())
}

/// `veda/details/{kind}/{hex of value}/index.json` plus `c{k}.json` chunks: every verse sharing a
/// देवता / ऋषि / छन्द / स्वर across all documents, in the route's order (document, then verse).
/// The index carries each position's document slug, so the device pages within one Veda too.
async fn export_verse_details(ex: &mut Export) -> anyhow::Result<()> {
    for kind in ["devata", "rishi", "chhanda", "svara"] {
        let Some(bytes) = ex.get(&format!("/v1/veda/details/{kind}/values")).await? else {
            bail!("{kind} values: not found");
        };
        let values: Value = serde_json::from_slice(&bytes)?;
        let mut seen = std::collections::HashSet::new();
        for value in values["values"]
            .as_array()
            .context("values")?
            .iter()
            .filter_map(|v| v["value"].as_str())
        {
            // A value the route would trim cannot be asked for as itself; the API answers it.
            if value.trim() != value {
                continue;
            }
            let mut verses = Vec::new();
            loop {
                let uri = format!(
                    "/v1/veda/details/{kind}?value={}&offset={}&limit=200",
                    percent_encode(value),
                    verses.len()
                );
                let Some(bytes) = ex.get(&uri).await? else {
                    bail!("{uri}: not found");
                };
                let mut page: Value = serde_json::from_slice(&bytes)?;
                let total = page["total"].as_u64().context("total")?;
                let list = page["verses"].take();
                let list = list.as_array().context("verses")?;
                verses.extend(list.iter().cloned());
                if list.is_empty() || verses.len() as u64 >= total {
                    break;
                }
            }
            let slugs: Vec<&str> = verses
                .iter()
                .map(|v| v["document_slug"].as_str().unwrap_or(""))
                .collect();
            let key = value_key(value);
            ensure!(seen.insert(key.clone()), "{kind}: two values hash to {key}");
            let dir = format!("veda/details/{kind}/{key}");
            ex.write(
                &format!("{dir}/index.json"),
                json!({ "value": value, "total": verses.len(), "slugs": slugs, "chunk": CHUNK })
                    .to_string()
                    .as_bytes(),
            )?;
            for (k, chunk) in verses.chunks(CHUNK).enumerate() {
                ex.write(
                    &format!("{dir}/c{k}.json"),
                    Value::Array(chunk.to_vec()).to_string().as_bytes(),
                )?;
            }
        }
    }
    Ok(())
}

/// 64-bit FNV-1a of the UTF-8 bytes, as 16 hex digits: a short file name for any value
/// (`valueKey` in static-data.ts). The export fails on a collision.
fn value_key(s: &str) -> String {
    let hash = s.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |h, b| {
        (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
    });
    format!("{hash:016x}")
}

/// A query-string value with every byte but `[A-Za-z0-9_.~-]` percent-encoded.
fn percent_encode(s: &str) -> String {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                char::from(b).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
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

/// `{festivals,holidays}/{era}/{year}-{lang}.json`: the national (Kathmandu) year listings, which
/// the apps read when the device cannot make them, before asking the server.
async fn export_festival_years(ex: &mut Export, first: i32, last: i32) -> anyhow::Result<()> {
    for (era, years) in [("ad", first..=last), ("bs", first + 56..=last + 57)] {
        for year in years {
            for lang in ["ne", "en"] {
                for kind in ["festivals", "holidays"] {
                    let uri = format!("/v1/nepal/{kind}?year={year}&era={era}&language={lang}");
                    ex.copy(&uri, &format!("{kind}/{era}/{year}-{lang}.json"))
                        .await?;
                }
            }
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

    #[test]
    fn values_become_hex_names_and_query_strings() {
        assert_eq!(value_key(""), "cbf29ce484222325");
        assert_eq!(value_key("a"), "af63dc4c8601ec8c");
        assert_eq!(percent_encode("अ b"), "%E0%A4%85%20b");
    }
}
