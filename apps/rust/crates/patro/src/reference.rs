//! Static kundali reference content: Raman's 300 combinations
//! (`services/jyotish/yoga_reference_db.py`) and the bhava reference blob
//! (`engine/jyotish/bhava_reference.py`), both read from the data directory.

use std::path::Path;

use rusqlite::{Connection, params};
use serde_json::{Value, json};

/// Why a reference could not be served.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum ReferenceError {
    /// The source file is missing (503).
    #[error("{0}")]
    Missing(String),
    /// The catalog failed to load (500).
    #[error("Yoga reference catalog failed to load: {0}")]
    Load(String),
}

/// `bhava_reference_payload()`: the JSON file as it stands.
///
/// # Errors
///
/// [`ReferenceError`] when the file is missing or unreadable.
pub fn bhava_reference(data_dir: &Path) -> Result<Value, ReferenceError> {
    let path = data_dir.join("bhava_reference.json");
    let text = std::fs::read_to_string(&path).map_err(|e| ReferenceError::Load(e.to_string()))?;
    serde_json::from_str(&text).map_err(|e| ReferenceError::Load(e.to_string()))
}

/// Which combinations to list.
#[derive(Debug, Clone, Copy)]
pub enum YogaQuery<'a> {
    /// The whole catalog.
    All,
    /// One exact id.
    Id(&'a str),
    /// `LIKE %q%` over the names, definitions and results.
    Search(&'a str),
}

fn seed(data_dir: &Path) -> Result<Connection, ReferenceError> {
    let source = data_dir.join("yoga_reference.json");
    if !source.is_file() {
        return Err(ReferenceError::Missing(format!(
            "Yoga reference source missing: {}. Commit data/yoga_reference.json and redeploy.",
            source.display()
        )));
    }
    let load = |e: &dyn std::fmt::Display| ReferenceError::Load(e.to_string());
    let text = std::fs::read_to_string(&source).map_err(|e| load(&e))?;
    let data: Value = serde_json::from_str(&text).map_err(|e| load(&e))?;
    let conn = Connection::open_in_memory().map_err(|e| load(&e))?;
    conn.execute_batch(
        "CREATE TABLE yoga_combinations (yoga_id TEXT PRIMARY KEY, sort_order INTEGER NOT NULL,
         name TEXT NOT NULL, name_ne TEXT NOT NULL, definition TEXT NOT NULL,
         definition_ne TEXT NOT NULL, result TEXT NOT NULL, result_ne TEXT NOT NULL,
         source TEXT NOT NULL, part TEXT NOT NULL);",
    )
    .map_err(|e| load(&e))?;
    let text_of = |v: &Value| v.as_str().unwrap_or_default().to_owned();
    let (source_s, part_s) = (text_of(&data["source"]), text_of(&data["part"]));
    for c in data["combinations"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
    {
        let or = |k: &str, fallback: &str| {
            c.get(k)
                .and_then(Value::as_str)
                .map_or_else(|| text_of(&c[fallback]), str::to_owned)
        };
        let sort = c["sort"]
            .as_i64()
            .or_else(|| c["sort"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        conn.execute(
            "INSERT INTO yoga_combinations VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                text_of(&c["yoga_id"]),
                sort,
                text_of(&c["name"]),
                or("name_ne", "name"),
                text_of(&c["definition"]),
                or("definition_ne", "definition"),
                text_of(&c["result"]),
                or("result_ne", "result"),
                source_s,
                part_s
            ],
        )
        .map_err(|e| load(&e))?;
    }
    Ok(conn)
}

/// `get_all` / `get_by_id` / `search`. `Ok(None)` for an unknown id.
///
/// # Errors
///
/// [`ReferenceError`] when the source is missing or fails to load.
pub fn yoga_reference(
    data_dir: &Path,
    query: YogaQuery<'_>,
) -> Result<Option<Vec<Value>>, ReferenceError> {
    let conn = seed(data_dir)?;
    let load = |e: rusqlite::Error| ReferenceError::Load(e.to_string());
    let (sql, args): (&str, Vec<String>) = match query {
        YogaQuery::All => (
            "SELECT * FROM yoga_combinations ORDER BY sort_order",
            vec![],
        ),
        YogaQuery::Id(id) => (
            "SELECT * FROM yoga_combinations WHERE yoga_id = ?1",
            vec![id.to_owned()],
        ),
        YogaQuery::Search(q) => (
            "SELECT * FROM yoga_combinations WHERE name LIKE ?1 COLLATE NOCASE
             OR definition LIKE ?1 COLLATE NOCASE OR result LIKE ?1 COLLATE NOCASE
             OR name_ne LIKE ?1 OR definition_ne LIKE ?1 OR result_ne LIKE ?1
             ORDER BY sort_order",
            vec![format!("%{}%", q.trim())],
        ),
    };
    let mut stmt = conn.prepare(sql).map_err(load)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(args.iter()), |r| {
            let s = |i: usize| r.get::<_, String>(i);
            Ok(json!({
                "yogaId": s(0)?, "name": s(2)?, "nameNe": s(3)?, "definition": s(4)?,
                "definitionNe": s(5)?, "result": s(6)?, "resultNe": s(7)?,
                "source": s(8)?, "part": s(9)?,
            }))
        })
        .map_err(load)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(load)?;
    if matches!(query, YogaQuery::Id(_)) && rows.is_empty() {
        return Ok(None);
    }
    Ok(Some(rows))
}
