//! Documents and Veda catalog views backed by `documents.db`.

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use rusqlite::{Connection, OpenFlags, OptionalExtension, Row, params};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha512};
use timescale::CivilDay;

use crate::{catalog::CatalogError, r2_signing::R2Signing};

const DEFAULT_DOC_CACHE: &str =
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
const LIST_CACHE: &str = "no-cache, max-age=0, must-revalidate";
const LIST_CDN_CACHE: &str = "public, s-maxage=30";
const VEDA_DAILY_CACHE: &str = "public, max-age=3600, s-maxage=3600";
// With signed audio links on, Python keeps these payloads out of its permanent cache tier and
// does not add `stale-if-error`: a stale copy would carry expired links. A leading `=` tells the
// response layer (`with_stale_if_error` in the api crate) to send the directive as written.
const LIST_CACHE_SIGNED: &str = "=no-cache, max-age=0, must-revalidate";
const LIST_CDN_CACHE_SIGNED: &str = "=public, s-maxage=30";
const VEDA_DAILY_CACHE_SIGNED: &str = "=public, max-age=3600, s-maxage=3600";
const CHAPTER_PAGE_DEFAULT: i64 = 25;
const CHAPTER_PAGE_MAX: i64 = 100;
const DAILY_MIN_CHARS: i64 = 20;
const DAILY_MAX_CHARS: i64 = 260;
const VEDA_SLUGS: [&str; 4] = ["rigveda", "yajurveda", "samaveda", "atharvaveda"];

const PAGE_DROP: [&str; 3] = ["verse_number", "global_order", "audio_duration_seconds"];
const OWN_DETAIL: [&str; 4] = ["devata", "rishi", "chhanda", "svara"];
const SUKTA_META: [&str; 3] = ["sukta_rishi", "sukta_devata", "sukta_chhanda"];

const DEVA_DIGITS: [char; 10] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const LATIN_DIGITS: [char; 10] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

#[derive(Debug, Clone)]
struct DocumentRecord {
    summary: Map<String, Value>,
    source_ne: Value,
    source_en: Value,
    chapter_images: BTreeMap<String, Vec<String>>,
    chapter_full_audio: BTreeMap<String, String>,
}

/// Reads scripture content from `documents.db`.
#[derive(Debug, Clone)]
pub struct DocumentsService {
    db_path: PathBuf,
    r2_public_base_url: Option<String>,
    /// Set when the four R2 S3 settings are present: audio links are then signed and expire.
    r2_signing: Option<R2Signing>,
    /// Cache-Control for document payloads; bounded by the signed links' life when signing is on.
    document_cache: &'static str,
    /// When set, asset links are `{base}/{key}` (the `/v1/asset/{key}` redirect) instead of signed
    /// ones: for the static export, whose files outlive any signature.
    asset_link_base: Option<String>,
}

impl DocumentsService {
    /// Service rooted at `../api/data`.
    #[must_use]
    pub fn new(data_dir: &Path) -> Self {
        let r2_signing = discover_r2_signing(data_dir);
        let document_cache = r2_signing.as_ref().map_or(DEFAULT_DOC_CACHE, |signing| {
            // Built once per service and kept for the life of the process.
            Box::leak(format!("={}", signing.document_cache_control()).into_boxed_str())
        });
        Self {
            db_path: data_dir.join("documents.db"),
            r2_public_base_url: discover_r2_public_base_url(data_dir),
            r2_signing,
            document_cache,
            asset_link_base: None,
        }
    }

    /// The same service, linking assets through `{base}/{key}` (see `asset_link_base`).
    #[must_use]
    pub fn with_asset_link_base(mut self, base: &str) -> Self {
        self.asset_link_base = Some(base.trim_end_matches('/').to_owned());
        self
    }

    /// Where an asset key can be fetched right now: a fresh signed link, or the public bucket URL.
    #[must_use]
    pub fn asset_location(&self, key: &str) -> Option<String> {
        // The bucket is private: a recording is only reachable through a signed, expiring link.
        if let Some(signing) = &self.r2_signing {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_or(0, |d| d.as_secs());
            return Some(signing.signed_url(key, now));
        }
        self.r2_public_base_url
            .as_ref()
            .map(|base| format!("{base}/{key}"))
    }

    /// `(global_order, verse_label)` of every verse in a chapter, in reading order (static export).
    ///
    /// # Errors
    ///
    /// SQLite failures as 503.
    pub fn chapter_verse_index(
        &self,
        slug: &str,
        chapter_number: i64,
    ) -> Result<Vec<(i64, Option<String>)>, CatalogError> {
        let conn = self.connect()?;
        let mut stmt = conn
            .prepare(
                "SELECT global_order, verse_label FROM shlokas WHERE document_slug = ? AND chapter_number = ? ORDER BY global_order ASC",
            )
            .map_err(CatalogError::from)?;
        stmt.query_map(params![slug, chapter_number], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)
    }

    fn connect(&self) -> Result<Connection, CatalogError> {
        if !self.db_path.is_file() {
            return Err(CatalogError::ServiceUnavailable(format!(
                "Documents database not found at {}",
                self.db_path.display()
            )));
        }
        Connection::open_with_flags(
            &self.db_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|e| CatalogError::ServiceUnavailable(e.to_string()))
    }

    /// Cache headers for `/documents`.
    #[must_use]
    pub fn list_cache_headers(&self) -> (&'static str, &'static str) {
        if self.r2_signing.is_some() {
            (LIST_CACHE_SIGNED, LIST_CDN_CACHE_SIGNED)
        } else {
            (LIST_CACHE, LIST_CDN_CACHE)
        }
    }

    /// Cache header for document detail routes.
    #[must_use]
    pub fn document_cache_header(&self) -> &'static str {
        self.document_cache
    }

    /// Cache header for `/veda/daily`.
    #[must_use]
    pub fn veda_daily_cache_header(&self) -> &'static str {
        if self.r2_signing.is_some() {
            VEDA_DAILY_CACHE_SIGNED
        } else {
            VEDA_DAILY_CACHE
        }
    }

    /// `GET /documents`.
    /// # Errors
    ///
    /// [`CatalogError::ServiceUnavailable`] when the database is missing or unreadable.
    pub fn list_documents(&self) -> Result<Value, CatalogError> {
        let conn = self.connect()?;
        let mut stmt = conn
            .prepare("SELECT * FROM documents ORDER BY order_index ASC, title_en ASC")
            .map_err(CatalogError::from)?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Value::Object(
                    self.resolve_document_summary(summary_row(row)?),
                ))
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CatalogError::from)?;
        Ok(json!({
            "count": rows.len(),
            "documents": rows,
        }))
    }

    /// `GET /documents/{slug}`.
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] for an unknown slug; SQLite failures as 503.
    pub fn document_detail(&self, slug: &str) -> Result<Value, CatalogError> {
        let conn = self.connect()?;
        let record = get_document_record(&conn, slug)?
            .ok_or_else(|| CatalogError::NotFound(format!("No such document: {slug}")))?;
        let embed = !record
            .summary
            .get("has_chapters")
            .and_then(Value::as_bool)
            .unwrap_or(false)
            || record
                .summary
                .get("inline_chapters")
                .and_then(Value::as_bool)
                .unwrap_or(false);
        let mut chapters = if embed {
            chapters_with_shlokas(self, &conn, slug)?
        } else {
            chapter_metadata(&conn, slug)?
        };
        attach_chapter_images(&mut chapters, &record.chapter_images);
        let mut detail = record.detail_map();
        detail.insert(
            "chapters".to_owned(),
            Value::Array(chapters.into_iter().map(Value::Object).collect()),
        );
        Ok(Value::Object(self.resolve_document_summary(detail)))
    }

    /// `GET /documents/{slug}/chapters/{chapter_number}` without page params.
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] for an unknown document or chapter; SQLite failures as 503.
    pub fn chapter_detail(&self, slug: &str, chapter_number: i64) -> Result<Value, CatalogError> {
        let conn = self.connect()?;
        let record = get_document_record(&conn, slug)?
            .ok_or_else(|| CatalogError::NotFound(format!("No such document: {slug}")))?;
        let chapter = chapter_with_shlokas(self, &conn, slug, chapter_number)?
            .ok_or_else(|| CatalogError::NotFound(format!("No such chapter: {chapter_number}")))?;
        let mut summary = record.summary_lite_map();
        use_chapter_recording(&mut summary, &record.chapter_full_audio, chapter_number);
        let mut out = self.resolve_document_summary(summary);
        out.insert("chapter".to_owned(), Value::Object(chapter));
        Ok(Value::Object(out))
    }

    /// `GET /documents/{slug}/chapters/{chapter_number}` with paging.
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] for an unknown document, chapter, or verse; SQLite failures as 503.
    pub fn chapter_page(
        &self,
        slug: &str,
        chapter_number: i64,
        cursor: Option<i64>,
        direction: &str,
        limit: Option<i64>,
        verse: Option<&str>,
    ) -> Result<Value, CatalogError> {
        let conn = self.connect()?;
        let record = get_document_record(&conn, slug)?
            .ok_or_else(|| CatalogError::NotFound(format!("No such document: {slug}")))?;
        let clamped = clamp_page_limit(limit);
        let page = chapter_page_conn(
            &conn,
            slug,
            chapter_number,
            cursor,
            direction,
            clamped,
            verse,
        )?
        .ok_or_else(|| CatalogError::NotFound(format!("No such chapter: {chapter_number}")))?;
        let mut summary = record.summary_lite_map();
        use_chapter_recording(&mut summary, &record.chapter_full_audio, chapter_number);
        let mut out = self.resolve_document_summary(summary);
        out.insert(
            "chapter".to_owned(),
            Value::Object(resolve_chapter_meta(
                self,
                page.chapter_meta,
                &record.chapter_images,
            )),
        );
        out.insert(
            "verses".to_owned(),
            Value::Array(
                page.shlokas
                    .into_iter()
                    .map(|s| Value::Object(reader_verse(self, s)))
                    .collect(),
            ),
        );
        out.insert(
            "next_cursor".to_owned(),
            page.next_cursor.map_or(Value::Null, Value::from),
        );
        out.insert(
            "prev_cursor".to_owned(),
            page.prev_cursor.map_or(Value::Null, Value::from),
        );
        out.insert("total".to_owned(), Value::from(page.total));
        Ok(Value::Object(out))
    }

    /// `GET /veda/details/{kind}`.
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] for an unknown detail kind; SQLite failures as 503.
    pub fn veda_detail(
        &self,
        kind: &str,
        value: &str,
        slug: Option<&str>,
        offset: i64,
        limit: i64,
    ) -> Result<Value, CatalogError> {
        validate_detail_kind(kind)?;
        let mut payload = verses_with_detail(self, kind, value.trim(), slug, offset, limit)?;
        if let Some(list) = payload.get_mut("verses").and_then(Value::as_array_mut) {
            for verse in list.iter_mut() {
                if let Some(map) = verse.as_object_mut() {
                    let resolved = resolve_shloka(self, map.clone());
                    *map = resolved;
                }
            }
        }
        Ok(payload)
    }

    /// `GET /veda/details/{kind}/values`.
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] for an unknown detail kind; SQLite failures as 503.
    pub fn veda_detail_values(
        &self,
        kind: &str,
        slug: Option<&str>,
    ) -> Result<Value, CatalogError> {
        validate_detail_kind(kind)?;
        Ok(json!({
            "kind": kind,
            "values": detail_values(self, kind, slug)?,
        }))
    }

    /// `GET /veda/daily`.
    ///
    /// # Errors
    ///
    /// [`CatalogError::NotFound`] when no eligible mantra exists; SQLite failures as 503.
    pub fn veda_daily(&self, day: CivilDay) -> Result<Value, CatalogError> {
        let mut shloka = daily_veda_shloka(self, day)?
            .ok_or_else(|| CatalogError::NotFound("No mantra available".to_owned()))?;
        let slug = take_required_string(&mut shloka, "document_slug")?;
        let chapter_number = take_required_i64(&mut shloka, "chapter_number")?;
        let source_parts = veda_source_parts(&slug, &shloka);
        let _ = shloka.shift_remove("chapter_title_ne");
        let _ = shloka.shift_remove("chapter_title_en");
        let record = self
            .document_summary_lite(&slug)?
            .ok_or_else(|| CatalogError::NotFound(format!("No such document: {slug}")))?;
        let (name_ne, name_en) = veda_names(&slug)
            .ok_or_else(|| CatalogError::Internal("unknown veda slug".to_owned()))?;
        Ok(json!({
            "date": day.to_string(),
            "veda": {"slug": slug, "name_ne": name_ne, "name_en": name_en},
            "source_ne": record.get("source_ne").cloned().unwrap_or(Value::Null),
            "source_en": record.get("source_en").cloned().unwrap_or(Value::Null),
            "source_parts": source_parts,
            "read_slug": slug,
            "read_chapter": chapter_number,
            "read_verse": shloka.get("verse_label").cloned().unwrap_or(Value::Null),
            "shloka": Value::Object(resolve_shloka(self, shloka)),
        }))
    }

    fn document_summary_lite(
        &self,
        slug: &str,
    ) -> Result<Option<Map<String, Value>>, CatalogError> {
        let conn = self.connect()?;
        let Some(record) = get_document_record(&conn, slug)? else {
            return Ok(None);
        };
        Ok(Some(record.summary_lite_map()))
    }

    fn resolve_document_summary(&self, mut doc: Map<String, Value>) -> Map<String, Value> {
        // `Map::remove` is swap-remove and reorders keys; Python `dict.pop` preserves order.
        let _ = doc.shift_remove("chapter_full_audio");
        let cover = doc
            .shift_remove("cover_image")
            .and_then(|v| v.as_str().map(str::to_owned));
        let full_audio = doc
            .shift_remove("full_audio_key")
            .and_then(|v| v.as_str().map(str::to_owned));
        doc.insert(
            "cover_image_url".to_owned(),
            self.resolve_asset_url(cover.as_deref()),
        );
        doc.insert(
            "full_audio_url".to_owned(),
            self.resolve_asset_url(full_audio.as_deref()),
        );
        doc
    }

    fn resolve_asset_url(&self, key: Option<&str>) -> Value {
        let Some(raw) = key.filter(|k| !k.is_empty()) else {
            return Value::Null;
        };
        if raw.starts_with("http://") || raw.starts_with("https://") {
            return Value::String(raw.to_owned());
        }
        if let Some(base) = &self.asset_link_base {
            return Value::String(format!("{base}/{raw}"));
        }
        self.asset_location(raw).map_or(Value::Null, Value::String)
    }
}

impl DocumentRecord {
    fn detail_map(&self) -> Map<String, Value> {
        let mut detail = self.summary.clone();
        detail.insert("source_ne".to_owned(), self.source_ne.clone());
        detail.insert("source_en".to_owned(), self.source_en.clone());
        detail
    }

    fn summary_lite_map(&self) -> Map<String, Value> {
        let mut detail = self.detail_map();
        if !self.chapter_full_audio.is_empty() {
            detail.insert(
                "chapter_full_audio".to_owned(),
                Value::Object(
                    self.chapter_full_audio
                        .iter()
                        .map(|(k, v)| (k.clone(), Value::String(v.clone())))
                        .collect(),
                ),
            );
        }
        detail
    }
}

#[derive(Debug)]
struct ChapterPage {
    chapter_meta: Map<String, Value>,
    shlokas: Vec<Map<String, Value>>,
    prev_cursor: Option<i64>,
    next_cursor: Option<i64>,
    total: i64,
}

fn get_document_record(
    conn: &Connection,
    slug: &str,
) -> Result<Option<DocumentRecord>, CatalogError> {
    let mut stmt = conn
        .prepare("SELECT * FROM documents WHERE slug = ?")
        .map_err(CatalogError::from)?;
    stmt.query_row([slug], |row| {
        let chapter_images = parse_images(row.get::<_, Option<String>>("chapter_images")?);
        let chapter_full_audio =
            parse_audio_map(row.get::<_, Option<String>>("chapter_full_audio")?);
        Ok(DocumentRecord {
            summary: summary_row(row)?,
            source_ne: row
                .get::<_, Option<String>>("source_ne")?
                .map_or(Value::Null, Value::String),
            source_en: row
                .get::<_, Option<String>>("source_en")?
                .map_or(Value::Null, Value::String),
            chapter_images,
            chapter_full_audio,
        })
    })
    .optional()
    .map_err(CatalogError::from)
}

fn summary_row(row: &Row<'_>) -> rusqlite::Result<Map<String, Value>> {
    let mut out = Map::new();
    put_str(&mut out, "slug", row.get::<_, String>("slug")?);
    put_i64(&mut out, "order_index", row.get::<_, i64>("order_index")?);
    put_str(&mut out, "category", row.get::<_, String>("category")?);
    put_opt_str(
        &mut out,
        "subcategory",
        row.get::<_, Option<String>>("subcategory")?,
    );
    put_str(&mut out, "title_sa", row.get::<_, String>("title_sa")?);
    put_str(&mut out, "title_ne", row.get::<_, String>("title_ne")?);
    put_str(&mut out, "title_en", row.get::<_, String>("title_en")?);
    put_opt_str(
        &mut out,
        "subtitle_ne",
        row.get::<_, Option<String>>("subtitle_ne")?,
    );
    put_opt_str(
        &mut out,
        "subtitle_en",
        row.get::<_, Option<String>>("subtitle_en")?,
    );
    put_opt_str(
        &mut out,
        "description_ne",
        row.get::<_, Option<String>>("description_ne")?,
    );
    put_opt_str(
        &mut out,
        "description_en",
        row.get::<_, Option<String>>("description_en")?,
    );
    put_opt_str(
        &mut out,
        "cover_image",
        row.get::<_, Option<String>>("cover_image")?,
    );
    out.insert(
        "has_chapters".to_owned(),
        Value::Bool(row.get::<_, i64>("has_chapters")? != 0),
    );
    out.insert(
        "inline_chapters".to_owned(),
        Value::Bool(row.get::<_, i64>("inline_chapters")? != 0),
    );
    put_i64(
        &mut out,
        "chapter_count",
        row.get::<_, i64>("chapter_count")?,
    );
    put_i64(&mut out, "shloka_count", row.get::<_, i64>("shloka_count")?);
    put_opt_str(
        &mut out,
        "full_audio_key",
        row.get::<_, Option<String>>("full_audio_key")?,
    );
    Ok(out)
}

fn parse_images(raw: Option<String>) -> BTreeMap<String, Vec<String>> {
    let Some(raw) = raw else {
        return BTreeMap::new();
    };
    let Ok(value) = serde_json::from_str::<Value>(&raw) else {
        return BTreeMap::new();
    };
    let Some(map) = value.as_object() else {
        return BTreeMap::new();
    };
    map.iter()
        .filter_map(|(k, v)| {
            v.as_array().map(|arr| {
                (
                    k.clone(),
                    arr.iter()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect::<Vec<_>>(),
                )
            })
        })
        .collect()
}

fn parse_audio_map(raw: Option<String>) -> BTreeMap<String, String> {
    let Some(raw) = raw else {
        return BTreeMap::new();
    };
    let Ok(value) = serde_json::from_str::<Value>(&raw) else {
        return BTreeMap::new();
    };
    let Some(map) = value.as_object() else {
        return BTreeMap::new();
    };
    map.iter()
        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_owned())))
        .collect()
}

fn put_str(map: &mut Map<String, Value>, key: &str, value: String) {
    map.insert(key.to_owned(), Value::String(value));
}

fn put_opt_str(map: &mut Map<String, Value>, key: &str, value: Option<String>) {
    map.insert(key.to_owned(), value.map_or(Value::Null, Value::String));
}

fn put_i64(map: &mut Map<String, Value>, key: &str, value: i64) {
    map.insert(key.to_owned(), Value::from(value));
}

fn chapters_with_shlokas(
    service: &DocumentsService,
    conn: &Connection,
    slug: &str,
) -> Result<Vec<Map<String, Value>>, CatalogError> {
    let mut stmt = conn
        .prepare("SELECT * FROM shlokas WHERE document_slug = ? ORDER BY global_order ASC")
        .map_err(CatalogError::from)?;
    let rows = stmt
        .query_map([slug], chapter_grouped_shloka)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?;
    Ok(group_shlokas(service, rows))
}

fn chapter_with_shlokas(
    service: &DocumentsService,
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
) -> Result<Option<Map<String, Value>>, CatalogError> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? ORDER BY global_order ASC",
        )
        .map_err(CatalogError::from)?;
    let rows = stmt
        .query_map(params![slug, chapter_number], chapter_grouped_shloka)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?;
    if rows.is_empty() {
        return Ok(None);
    }
    let mut groups = group_shlokas(service, rows);
    Ok(groups.pop())
}

struct GroupedShloka {
    chapter_number: Value,
    title_ne: Value,
    title_en: Value,
    shloka: Map<String, Value>,
}

fn chapter_grouped_shloka(row: &Row<'_>) -> rusqlite::Result<GroupedShloka> {
    Ok(GroupedShloka {
        chapter_number: row
            .get::<_, Option<i64>>("chapter_number")?
            .map_or(Value::Null, Value::from),
        title_ne: row
            .get::<_, Option<String>>("chapter_title_ne")?
            .map_or(Value::Null, Value::String),
        title_en: row
            .get::<_, Option<String>>("chapter_title_en")?
            .map_or(Value::Null, Value::String),
        shloka: shloka_row(row)?,
    })
}

fn group_shlokas(service: &DocumentsService, rows: Vec<GroupedShloka>) -> Vec<Map<String, Value>> {
    let mut groups: BTreeMap<String, Map<String, Value>> = BTreeMap::new();
    let mut order = Vec::new();
    for row in rows {
        let key = row.chapter_number.to_string();
        if !groups.contains_key(&key) {
            let mut chapter = Map::new();
            chapter.insert("number".to_owned(), row.chapter_number.clone());
            chapter.insert("title_ne".to_owned(), row.title_ne);
            chapter.insert("title_en".to_owned(), row.title_en);
            chapter.insert("shlokas".to_owned(), Value::Array(Vec::new()));
            groups.insert(key.clone(), chapter);
            order.push(key.clone());
        }
        if let Some(arr) = groups
            .get_mut(&key)
            .and_then(|g| g.get_mut("shlokas"))
            .and_then(Value::as_array_mut)
        {
            arr.push(Value::Object(resolve_shloka(service, row.shloka)));
        }
    }
    order
        .into_iter()
        .filter_map(|k| groups.remove(&k))
        .collect()
}

fn chapter_metadata(
    conn: &Connection,
    slug: &str,
) -> Result<Vec<Map<String, Value>>, CatalogError> {
    let mut stmt = conn
        .prepare(
            "SELECT chapter_number, chapter_title_ne, chapter_title_en, COUNT(*) AS shloka_count, \
             MIN(global_order) AS first_order, verse_label AS first_label \
             FROM shlokas WHERE document_slug = ? GROUP BY chapter_number ORDER BY MIN(global_order) ASC",
        )
        .map_err(CatalogError::from)?;
    stmt.query_map([slug], |row| {
        let mut out = Map::new();
        out.insert(
            "number".to_owned(),
            row.get::<_, Option<i64>>("chapter_number")?
                .map_or(Value::Null, Value::from),
        );
        out.insert(
            "title_ne".to_owned(),
            row.get::<_, Option<String>>("chapter_title_ne")?
                .map_or(Value::Null, Value::String),
        );
        out.insert(
            "title_en".to_owned(),
            row.get::<_, Option<String>>("chapter_title_en")?
                .map_or(Value::Null, Value::String),
        );
        out.insert(
            "shloka_count".to_owned(),
            Value::from(row.get::<_, i64>("shloka_count")?),
        );
        out.insert(
            "verse_prefix".to_owned(),
            verse_prefix(
                row.get::<_, Option<String>>("first_label")?.as_deref(),
                row.get::<_, Option<i64>>("chapter_number")?,
            ),
        );
        Ok(out)
    })?
    .collect::<Result<Vec<_>, _>>()
    .map_err(CatalogError::from)
}

fn attach_chapter_images(
    chapters: &mut [Map<String, Value>],
    images: &BTreeMap<String, Vec<String>>,
) {
    for chapter in chapters {
        let Some(number) = chapter.get("number").and_then(Value::as_i64) else {
            continue;
        };
        let Some(keys) = images.get(&number.to_string()) else {
            continue;
        };
        chapter.insert(
            "images".to_owned(),
            Value::Array(keys.iter().map(|k| Value::String(k.clone())).collect()),
        );
    }
}

fn resolve_chapter_meta(
    service: &DocumentsService,
    mut chapter: Map<String, Value>,
    images: &BTreeMap<String, Vec<String>>,
) -> Map<String, Value> {
    if let Some(number) = chapter.get("number").and_then(Value::as_i64) {
        if let Some(keys) = images.get(&number.to_string()) {
            let urls = keys
                .iter()
                .map(|k| service.resolve_asset_url(Some(k)))
                .filter(|v| !v.is_null())
                .collect::<Vec<_>>();
            if !urls.is_empty() {
                chapter.insert("image_urls".to_owned(), Value::Array(urls));
            }
        }
    }
    chapter
}

fn use_chapter_recording(
    summary: &mut Map<String, Value>,
    recordings: &BTreeMap<String, String>,
    chapter_number: i64,
) {
    if let Some(value) = recordings.get(&chapter_number.to_string()) {
        summary.insert("full_audio_key".to_owned(), Value::String(value.clone()));
    }
}

#[expect(
    clippy::too_many_lines,
    reason = "row mapping mirrors Python _shloka_row_to_dict field-for-field"
)]
fn shloka_row(row: &Row<'_>) -> rusqlite::Result<Map<String, Value>> {
    let mut out = Map::new();
    out.insert("id".to_owned(), Value::from(row.get::<_, i64>("id")?));
    out.insert(
        "global_order".to_owned(),
        Value::from(row.get::<_, i64>("global_order")?),
    );
    out.insert(
        "verse_number".to_owned(),
        Value::from(row.get::<_, i64>("verse_number")?),
    );
    out.insert(
        "verse_label".to_owned(),
        Value::String(row.get::<_, String>("verse_label")?),
    );
    put_opt_i64(
        &mut out,
        "sukta_number",
        row.get::<_, Option<i64>>("sukta_number")?,
    );
    put_opt_str(
        &mut out,
        "sukta_rishi",
        row.get::<_, Option<String>>("sukta_rishi")?,
    );
    put_opt_str(
        &mut out,
        "sukta_devata",
        row.get::<_, Option<String>>("sukta_devata")?,
    );
    put_opt_str(
        &mut out,
        "sukta_chhanda",
        row.get::<_, Option<String>>("sukta_chhanda")?,
    );
    put_opt_str(
        &mut out,
        "group_title",
        row.get::<_, Option<String>>("group_title")?,
    );
    put_opt_str(
        &mut out,
        "veda_cite",
        row.get::<_, Option<String>>("veda_cite")?,
    );
    put_opt_str(&mut out, "devata", row.get::<_, Option<String>>("devata")?);
    put_opt_str(&mut out, "rishi", row.get::<_, Option<String>>("rishi")?);
    put_opt_str(
        &mut out,
        "chhanda",
        row.get::<_, Option<String>>("chhanda")?,
    );
    put_opt_str(&mut out, "svara", row.get::<_, Option<String>>("svara")?);
    put_opt_str(
        &mut out,
        "padapatha",
        row.get::<_, Option<String>>("padapatha")?,
    );
    put_opt_str(
        &mut out,
        "meaning_hi",
        row.get::<_, Option<String>>("meaning_hi")?,
    );
    put_opt_str(
        &mut out,
        "sanskrit_swara",
        row.get::<_, Option<String>>("sanskrit_swara")?,
    );
    out.insert(
        "sanskrit".to_owned(),
        Value::String(row.get::<_, String>("sanskrit")?),
    );
    put_opt_str(
        &mut out,
        "transliteration",
        row.get::<_, Option<String>>("transliteration")?,
    );
    put_opt_str(
        &mut out,
        "meaning_ne",
        row.get::<_, Option<String>>("meaning_ne")?,
    );
    put_opt_str(
        &mut out,
        "meaning_en",
        row.get::<_, Option<String>>("meaning_en")?,
    );
    put_opt_str(
        &mut out,
        "working_ne",
        row.get::<_, Option<String>>("working_ne")?,
    );
    put_opt_str(
        &mut out,
        "working_en",
        row.get::<_, Option<String>>("working_en")?,
    );
    put_opt_str(
        &mut out,
        "commentary_ne",
        row.get::<_, Option<String>>("commentary_ne")?,
    );
    put_opt_str(
        &mut out,
        "commentary_en",
        row.get::<_, Option<String>>("commentary_en")?,
    );
    let comments = row.get::<_, Option<String>>("commentaries")?;
    out.insert(
        "commentaries".to_owned(),
        comments
            .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            .unwrap_or(Value::Null),
    );
    put_opt_str(
        &mut out,
        "audio_key",
        row.get::<_, Option<String>>("audio_key")?,
    );
    put_opt_f64(
        &mut out,
        "audio_duration_seconds",
        row.get::<_, Option<f64>>("audio_duration_seconds")?,
    );
    put_opt_f64(
        &mut out,
        "full_audio_start",
        row.get::<_, Option<f64>>("full_audio_start")?,
    );
    put_opt_f64(
        &mut out,
        "full_audio_end",
        row.get::<_, Option<f64>>("full_audio_end")?,
    );
    Ok(out)
}

fn put_opt_i64(map: &mut Map<String, Value>, key: &str, value: Option<i64>) {
    map.insert(key.to_owned(), value.map_or(Value::Null, Value::from));
}

fn put_opt_f64(map: &mut Map<String, Value>, key: &str, value: Option<f64>) {
    map.insert(key.to_owned(), value.map_or(Value::Null, Value::from));
}

fn validate_detail_kind(kind: &str) -> Result<(), CatalogError> {
    if matches!(kind, "devata" | "rishi" | "chhanda" | "svara") {
        Ok(())
    } else {
        Err(CatalogError::NotFound(format!("No such detail: {kind}")))
    }
}

fn detail_values(
    service: &DocumentsService,
    kind: &str,
    slug: Option<&str>,
) -> Result<Vec<Value>, CatalogError> {
    let conn = service.connect()?;
    let mut where_sql = format!("{kind} IS NOT NULL AND {kind} != ''");
    if slug.is_some() {
        where_sql.push_str(" AND document_slug = ?");
    }
    let sql = format!(
        "SELECT {kind} AS value, COUNT(*) AS count FROM shlokas WHERE {where_sql} GROUP BY {kind} ORDER BY count DESC, value"
    );
    let mut stmt = conn.prepare(&sql).map_err(CatalogError::from)?;
    let rows = if let Some(slug) = slug {
        stmt.query_map([slug], |r| {
            Ok(json!({
                "value": r.get::<_, String>(0)?,
                "count": r.get::<_, i64>(1)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?
    } else {
        stmt.query_map([], |r| {
            Ok(json!({
                "value": r.get::<_, String>(0)?,
                "count": r.get::<_, i64>(1)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?
    };
    Ok(rows)
}

fn verses_with_detail(
    service: &DocumentsService,
    kind: &str,
    value: &str,
    slug: Option<&str>,
    offset: i64,
    limit: i64,
) -> Result<Value, CatalogError> {
    let conn = service.connect()?;
    let mut where_sql = format!("s.{kind} = ?");
    if slug.is_some() {
        where_sql.push_str(" AND s.document_slug = ?");
    }
    let total_sql = format!("SELECT COUNT(*) FROM shlokas s WHERE {where_sql}");
    let total = if let Some(slug) = slug {
        conn.query_row(&total_sql, params![value, slug], |r| r.get::<_, i64>(0))
            .map_err(CatalogError::from)?
    } else {
        conn.query_row(&total_sql, [value], |r| r.get::<_, i64>(0))
            .map_err(CatalogError::from)?
    };
    let sql = format!(
        "SELECT s.*, d.title_ne AS document_title_ne, d.title_en AS document_title_en \
         FROM shlokas s JOIN documents d ON d.slug = s.document_slug \
         WHERE {where_sql} ORDER BY d.order_index, s.global_order LIMIT ? OFFSET ?"
    );
    let mut stmt = conn.prepare(&sql).map_err(CatalogError::from)?;
    let verses = if let Some(slug) = slug {
        stmt.query_map(params![value, slug, limit, offset], |r| {
            let mut row = shloka_row(r)?;
            row.insert(
                "document_slug".to_owned(),
                Value::String(r.get::<_, String>("document_slug")?),
            );
            row.insert(
                "document_title_ne".to_owned(),
                r.get::<_, Option<String>>("document_title_ne")?
                    .map_or(Value::Null, Value::String),
            );
            row.insert(
                "document_title_en".to_owned(),
                r.get::<_, Option<String>>("document_title_en")?
                    .map_or(Value::Null, Value::String),
            );
            row.insert(
                "chapter_number".to_owned(),
                r.get::<_, Option<i64>>("chapter_number")?
                    .map_or(Value::Null, Value::from),
            );
            Ok(Value::Object(row))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?
    } else {
        stmt.query_map(params![value, limit, offset], |r| {
            let mut row = shloka_row(r)?;
            row.insert(
                "document_slug".to_owned(),
                Value::String(r.get::<_, String>("document_slug")?),
            );
            row.insert(
                "document_title_ne".to_owned(),
                r.get::<_, Option<String>>("document_title_ne")?
                    .map_or(Value::Null, Value::String),
            );
            row.insert(
                "document_title_en".to_owned(),
                r.get::<_, Option<String>>("document_title_en")?
                    .map_or(Value::Null, Value::String),
            );
            row.insert(
                "chapter_number".to_owned(),
                r.get::<_, Option<i64>>("chapter_number")?
                    .map_or(Value::Null, Value::from),
            );
            Ok(Value::Object(row))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?
    };
    Ok(json!({
        "kind": kind,
        "value": value,
        "total": total,
        "offset": offset,
        "verses": verses,
    }))
}

fn chapter_page_conn(
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
    cursor: Option<i64>,
    direction: &str,
    limit: i64,
    verse: Option<&str>,
) -> Result<Option<ChapterPage>, CatalogError> {
    let meta = conn
        .query_row(
            "SELECT chapter_number, chapter_title_ne, chapter_title_en, COUNT(*) AS total \
             FROM shlokas WHERE document_slug = ? AND chapter_number = ?",
            params![slug, chapter_number],
            |r| {
                Ok((
                    r.get::<_, Option<i64>>("chapter_number")?,
                    r.get::<_, Option<String>>("chapter_title_ne")?,
                    r.get::<_, Option<String>>("chapter_title_en")?,
                    r.get::<_, i64>("total")?,
                ))
            },
        )
        .optional()
        .map_err(CatalogError::from)?;
    let Some((number, title_ne, title_en, total)) = meta else {
        return Ok(None);
    };
    if total == 0 {
        return Ok(None);
    }
    let shlokas = if let Some(verse) = verse.filter(|v| !v.trim().is_empty()) {
        let forms = verse_label_forms(verse.trim());
        let placeholders = vec!["?"; forms.len()].join(",");
        let sql = format!(
            "SELECT global_order FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND verse_label IN ({placeholders}) ORDER BY global_order ASC LIMIT 1"
        );
        let mut args: Vec<&dyn rusqlite::ToSql> = vec![&slug, &chapter_number];
        for form in &forms {
            args.push(form);
        }
        let mut stmt = conn.prepare(&sql).map_err(CatalogError::from)?;
        let found = stmt
            .query_row(rusqlite::params_from_iter(args), |r| r.get::<_, i64>(0))
            .optional()
            .map_err(CatalogError::from)?;
        let Some(anchor) = found else {
            return Err(CatalogError::NotFound(format!(
                "No such verse: {}",
                verse.trim()
            )));
        };
        page_around(conn, slug, chapter_number, anchor, limit)?
    } else if direction == "prev" {
        rows_before(conn, slug, chapter_number, cursor, limit)?
    } else {
        rows_after(conn, slug, chapter_number, cursor, limit)?
    };
    let (prev_cursor, next_cursor) = page_cursors(conn, slug, chapter_number, &shlokas)?;
    let chapter_meta = json_to_map(&json!({
        "number": number,
        "title_ne": title_ne,
        "title_en": title_en,
    }));
    Ok(Some(ChapterPage {
        chapter_meta,
        shlokas,
        prev_cursor,
        next_cursor,
        total,
    }))
}

fn rows_after(
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
    cursor: Option<i64>,
    limit: i64,
) -> Result<Vec<Map<String, Value>>, CatalogError> {
    let sql = if cursor.is_some() {
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ? ORDER BY global_order ASC LIMIT ?"
    } else {
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? ORDER BY global_order ASC LIMIT ?"
    };
    let mut stmt = conn.prepare(sql).map_err(CatalogError::from)?;
    if let Some(cursor) = cursor {
        stmt.query_map(params![slug, chapter_number, cursor, limit], shloka_row)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CatalogError::from)
    } else {
        stmt.query_map(params![slug, chapter_number, limit], shloka_row)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CatalogError::from)
    }
}

fn rows_before(
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
    cursor: Option<i64>,
    limit: i64,
) -> Result<Vec<Map<String, Value>>, CatalogError> {
    let sql = if cursor.is_some() {
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ? ORDER BY global_order DESC LIMIT ?"
    } else {
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? ORDER BY global_order DESC LIMIT ?"
    };
    let mut stmt = conn.prepare(sql).map_err(CatalogError::from)?;
    let mut rows = if let Some(cursor) = cursor {
        stmt.query_map(params![slug, chapter_number, cursor, limit], shloka_row)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CatalogError::from)?
    } else {
        stmt.query_map(params![slug, chapter_number, limit], shloka_row)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CatalogError::from)?
    };
    rows.reverse();
    Ok(rows)
}

fn page_cursors(
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
    rows: &[Map<String, Value>],
) -> Result<(Option<i64>, Option<i64>), CatalogError> {
    let Some(first) = rows
        .first()
        .and_then(|r| r.get("global_order"))
        .and_then(Value::as_i64)
    else {
        return Ok((None, None));
    };
    let Some(last) = rows
        .last()
        .and_then(|r| r.get("global_order"))
        .and_then(Value::as_i64)
    else {
        return Ok((None, None));
    };
    let has_prev = conn
        .query_row(
            "SELECT 1 FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ? LIMIT 1",
            params![slug, chapter_number, first],
            |r| r.get::<_, i64>(0),
        )
        .optional()
        .map_err(CatalogError::from)?
        .is_some();
    let has_next = conn
        .query_row(
            "SELECT 1 FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ? LIMIT 1",
            params![slug, chapter_number, last],
            |r| r.get::<_, i64>(0),
        )
        .optional()
        .map_err(CatalogError::from)?
        .is_some();
    Ok((has_prev.then_some(first), has_next.then_some(last)))
}

fn page_around(
    conn: &Connection,
    slug: &str,
    chapter_number: i64,
    anchor: i64,
    limit: i64,
) -> Result<Vec<Map<String, Value>>, CatalogError> {
    let before = (limit - 1) / 2;
    let n_before = conn
        .query_row(
            "SELECT COUNT(*) FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ?",
            params![slug, chapter_number, anchor],
            |r| r.get::<_, i64>(0),
        )
        .map_err(CatalogError::from)?;
    let n_after = conn
        .query_row(
            "SELECT COUNT(*) FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ?",
            params![slug, chapter_number, anchor],
            |r| r.get::<_, i64>(0),
        )
        .map_err(CatalogError::from)?;
    let mut take_before = before.min(n_before);
    let mut take_after = limit - 1 - take_before;
    if take_after > n_after {
        take_before = n_before.min(take_before + (take_after - n_after));
        take_after = n_after;
    }
    let anchor_row = conn
        .query_row(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order = ?",
            params![slug, chapter_number, anchor],
            shloka_row,
        )
        .optional()
        .map_err(CatalogError::from)?;
    let Some(anchor_row) = anchor_row else {
        return Ok(Vec::new());
    };
    let mut out = Vec::new();
    if take_before > 0 {
        out.extend(rows_before(
            conn,
            slug,
            chapter_number,
            Some(anchor),
            take_before,
        )?);
    }
    out.push(anchor_row);
    if take_after > 0 {
        out.extend(rows_after(
            conn,
            slug,
            chapter_number,
            Some(anchor),
            take_after,
        )?);
    }
    Ok(out)
}

fn clamp_page_limit(limit: Option<i64>) -> i64 {
    limit
        .unwrap_or(CHAPTER_PAGE_DEFAULT)
        .clamp(1, CHAPTER_PAGE_MAX)
}

fn verse_prefix(first_label: Option<&str>, chapter_number: Option<i64>) -> Value {
    let Some(label) = first_label else {
        return Value::Null;
    };
    if label.matches('.').count() < 2 {
        return Value::Null;
    }
    let Some((prefix, _)) = label.rsplit_once('.') else {
        return Value::Null;
    };
    if chapter_number.is_some_and(|n| prefix.split('.').next().is_some_and(|p| p == n.to_string()))
    {
        Value::Null
    } else {
        Value::String(prefix.to_owned())
    }
}

fn resolve_shloka(
    service: &DocumentsService,
    mut shloka: Map<String, Value>,
) -> Map<String, Value> {
    let audio_key = shloka
        .shift_remove("audio_key")
        .and_then(|v| v.as_str().map(str::to_owned));
    let _ = shloka.shift_remove("meaning_hi");
    let _ = shloka.shift_remove("padapatha");
    let mut out = shloka;
    out.insert(
        "audio_url".to_owned(),
        service.resolve_asset_url(audio_key.as_deref()),
    );
    if let Some(key) = sukta_audio_key(audio_key.as_deref(), out.get("sukta_number")) {
        out.insert(
            "sukta_audio_url".to_owned(),
            service.resolve_asset_url(Some(&key)),
        );
    }
    out
}

fn reader_verse(service: &DocumentsService, shloka: Map<String, Value>) -> Map<String, Value> {
    let resolved = resolve_shloka(service, shloka);
    let own = OWN_DETAIL.iter().any(|key| {
        resolved
            .get(*key)
            .is_some_and(|v| !v.is_null() && v.as_str().is_some_and(|s| !s.is_empty()))
    });
    let mut out = Map::new();
    for (key, value) in resolved {
        if PAGE_DROP.contains(&key.as_str()) {
            continue;
        }
        if own && SUKTA_META.contains(&key.as_str()) {
            continue;
        }
        if value.is_null() || value.as_str().is_some_and(str::is_empty) {
            continue;
        }
        out.insert(key, value);
    }
    out
}

fn take_required_string(map: &mut Map<String, Value>, key: &str) -> Result<String, CatalogError> {
    map.shift_remove(key)
        .and_then(|v| v.as_str().map(str::to_owned))
        .ok_or_else(|| CatalogError::Internal(format!("missing key {key}")))
}

fn take_required_i64(map: &mut Map<String, Value>, key: &str) -> Result<i64, CatalogError> {
    map.shift_remove(key)
        .and_then(|v| v.as_i64())
        .ok_or_else(|| CatalogError::Internal(format!("missing key {key}")))
}

fn detail_ordinal(day: CivilDay) -> Result<i64, CatalogError> {
    if day.year < 1 {
        return Err(CatalogError::BadRequest(
            "date must be CE (year >= 1)".to_owned(),
        ));
    }
    let y = i64::from(day.year);
    let m = i64::from(day.month);
    let d = i64::from(day.day);
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    // Match Python `datetime.date.toordinal()` (1 == 0001-01-01).
    Ok(era * 146_097 + doe - 305)
}

fn daily_veda_shloka(
    service: &DocumentsService,
    day: CivilDay,
) -> Result<Option<Map<String, Value>>, CatalogError> {
    let conn = service.connect()?;
    let ordinal = detail_ordinal(day)?;
    let slug = VEDA_SLUGS[usize::try_from(
        ordinal.rem_euclid(i64::try_from(VEDA_SLUGS.len()).unwrap_or(1)),
    )
    .unwrap_or(0)];
    let eligible = "document_slug = ? AND audio_key IS NOT NULL AND audio_key != '' AND length(sanskrit) BETWEEN ? AND ?";
    let mut stmt = conn
        .prepare(
            &format!(
                "SELECT chapter_number, COUNT(*) AS n FROM shlokas WHERE {eligible} GROUP BY chapter_number ORDER BY chapter_number"
            ),
        )
        .map_err(CatalogError::from)?;
    let chapters = stmt
        .query_map(params![slug, DAILY_MIN_CHARS, DAILY_MAX_CHARS], |r| {
            Ok((r.get::<_, Option<i64>>(0)?, r.get::<_, i64>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CatalogError::from)?;
    let total: i64 = chapters.iter().map(|(_, n)| *n).sum();
    if total <= 0 {
        return Ok(None);
    }
    let mut rng = PyRandom::new_from_seed_str(&format!("veda-daily:{day}"));
    let mut pick = i64::try_from(rng.randrange(u64::try_from(total).unwrap_or(1))).unwrap_or(0);
    let mut chapter_number = chapters.last().and_then(|(v, _)| *v).unwrap_or(1);
    for (ch, n) in chapters {
        if pick < n {
            chapter_number = ch.unwrap_or(1);
            break;
        }
        pick -= n;
    }
    let row = conn
        .query_row(
            &format!(
                "SELECT * FROM shlokas WHERE {eligible} AND chapter_number = ? ORDER BY global_order ASC LIMIT 1 OFFSET ?"
            ),
            params![slug, DAILY_MIN_CHARS, DAILY_MAX_CHARS, chapter_number, pick],
            |r| {
                let mut shloka = shloka_row(r)?;
                shloka.insert("document_slug".to_owned(), Value::String(slug.to_owned()));
                shloka.insert("chapter_number".to_owned(), Value::from(chapter_number));
                put_opt_str(
                    &mut shloka,
                    "chapter_title_ne",
                    r.get::<_, Option<String>>("chapter_title_ne")?,
                );
                put_opt_str(
                    &mut shloka,
                    "chapter_title_en",
                    r.get::<_, Option<String>>("chapter_title_en")?,
                );
                Ok(shloka)
            },
        )
        .optional()
        .map_err(CatalogError::from)?;
    Ok(row)
}

fn veda_names(slug: &str) -> Option<(&'static str, &'static str)> {
    match slug {
        "rigveda" => Some(("ऋग्वेद", "Rigveda")),
        "yajurveda" => Some(("यजुर्वेद", "Yajurveda")),
        "samaveda" => Some(("सामवेद", "Samaveda")),
        "atharvaveda" => Some(("अथर्ववेद", "Atharvaveda")),
        _ => None,
    }
}

fn veda_source_parts(slug: &str, shloka: &Map<String, Value>) -> Vec<Value> {
    let mut parts = vec![json!({
        "label_ne": shloka.get("chapter_title_ne").cloned().unwrap_or(Value::Null),
        "label_en": shloka.get("chapter_title_en").cloned().unwrap_or(Value::Null),
        "value": Value::Null,
    })];
    let label = shloka
        .get("verse_label")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let bits = if label.is_empty() {
        Vec::new()
    } else {
        label.split('.').map(str::to_owned).collect::<Vec<_>>()
    };
    if matches!(slug, "rigveda" | "atharvaveda")
        && shloka.get("sukta_number").and_then(Value::as_i64).is_some()
    {
        parts.push(json!({
            "label_ne": "सूक्त",
            "label_en": "Sukta",
            "value": shloka.get("sukta_number").cloned().unwrap_or(Value::Null),
        }));
    }
    if slug == "atharvaveda" && bits.len() == 4 {
        parts.push(json!({
            "label_ne": "पर्याय",
            "label_en": "Paryaya",
            "value": bits[2],
        }));
    }
    let mantra = bits
        .last()
        .cloned()
        .or_else(|| shloka.get("verse_number").map(Value::to_string))
        .unwrap_or_default();
    parts.push(json!({
        "label_ne": "मन्त्र",
        "label_en": "Mantra",
        "value": mantra,
    }));
    parts
}

fn verse_label_key(label: &str) -> String {
    label
        .chars()
        .map(map_deva_to_latin)
        .collect::<String>()
        .trim()
        .to_owned()
}

fn verse_label_forms(label: &str) -> Vec<String> {
    let raw = label.trim().to_owned();
    let latin = verse_label_key(label);
    let deva = latin.chars().map(map_latin_to_deva).collect::<String>();
    let mut forms = Vec::new();
    for candidate in [raw, latin, deva] {
        if !candidate.is_empty() && !forms.contains(&candidate) {
            forms.push(candidate);
        }
    }
    forms
}

fn map_deva_to_latin(c: char) -> char {
    for (idx, deva) in DEVA_DIGITS.iter().enumerate() {
        if *deva == c {
            return LATIN_DIGITS[idx];
        }
    }
    c
}

fn map_latin_to_deva(c: char) -> char {
    for (idx, latin) in LATIN_DIGITS.iter().enumerate() {
        if *latin == c {
            return DEVA_DIGITS[idx];
        }
    }
    c
}

fn json_to_map(value: &Value) -> Map<String, Value> {
    value.as_object().cloned().unwrap_or_default()
}

fn sukta_audio_key(audio_key: Option<&str>, sukta: Option<&Value>) -> Option<String> {
    let key = audio_key?;
    let slash = key.rfind('/')?;
    let (prefix, name) = key.split_at(slash + 1);
    let base = name.strip_suffix(".mp3")?;
    let parts = base.split('_').collect::<Vec<_>>();
    if parts.len() != 4 || parts[0] != "rigveda" || parts[1].len() != 2 {
        return None;
    }
    let sukta = sukta.and_then(Value::as_i64)?;
    Some(format!("{prefix}rigveda_{}_sukta_{sukta:03}.mp3", parts[1]))
}

/// A setting from the process environment, else from the `.env` files next to the data folder.
fn r2_setting(name: &str, data_dir: &Path) -> Option<String> {
    if let Ok(value) = std::env::var(name) {
        if !value.trim().is_empty() {
            return Some(value);
        }
    }
    let api_dir = data_dir.parent()?;
    [
        api_dir.join(".env.local"),
        api_dir.join(".env"),
        api_dir.join("../../.env.local"),
        api_dir.join("../../.env"),
    ]
    .iter()
    .find_map(|path| read_env_value(path, name).filter(|v| !v.trim().is_empty()))
}

/// The signer, when `R2_S3_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
/// are all set (what Python's `config.r2_signing()` needs).
fn discover_r2_signing(data_dir: &Path) -> Option<R2Signing> {
    let get = |name: &str| r2_setting(name, data_dir);
    let hours = |name: &str| get(name).and_then(|v| v.trim().parse::<f64>().ok());
    R2Signing::new(
        &get("R2_S3_ENDPOINT")?,
        &get("R2_BUCKET")?,
        &get("R2_ACCESS_KEY_ID")?,
        &get("R2_SECRET_ACCESS_KEY")?,
        hours("R2_SIGNING_WINDOW_HOURS"),
        hours("R2_SIGNED_URL_TTL_HOURS"),
    )
}

fn discover_r2_public_base_url(data_dir: &Path) -> Option<String> {
    if let Ok(env) = std::env::var("R2_PUBLIC_BASE_URL") {
        let trimmed = env.trim().trim_end_matches('/').to_owned();
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }
    let api_dir = data_dir.parent()?;
    for path in [
        api_dir.join(".env.local"),
        api_dir.join(".env"),
        api_dir.join("../../.env.local"),
        api_dir.join("../../.env"),
    ] {
        let Some(value) = read_env_value(&path, "R2_PUBLIC_BASE_URL") else {
            continue;
        };
        let trimmed = value.trim().trim_end_matches('/').to_owned();
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }
    None
}

fn read_env_value(path: &Path, key: &str) -> Option<String> {
    let text = fs::read_to_string(path).ok()?;
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let (name, value) = trimmed.split_once('=')?;
        if name.trim() != key {
            continue;
        }
        return Some(value.trim().trim_matches('"').trim_matches('\'').to_owned());
    }
    None
}

#[derive(Debug, Clone)]
struct PyRandom {
    mt: [u32; 624],
    index: usize,
}

impl PyRandom {
    fn new_from_seed_str(seed: &str) -> Self {
        let mut bytes = seed.as_bytes().to_vec();
        let digest = Sha512::digest(seed.as_bytes());
        bytes.extend_from_slice(&digest);
        let mut key = Vec::new();
        let mut idx = bytes.len();
        while idx > 0 {
            let start = idx.saturating_sub(4);
            let mut value = 0_u32;
            for b in &bytes[start..idx] {
                value = (value << 8) | u32::from(*b);
            }
            key.push(value);
            idx = start;
        }
        if key.is_empty() {
            key.push(0);
        }
        Self::init_by_array(&key)
    }

    fn init_by_array(key: &[u32]) -> Self {
        let mut out = Self {
            mt: [0; 624],
            index: 624,
        };
        out.mt[0] = 19_650_218;
        for i in 1..624 {
            let x = out.mt[i - 1] ^ (out.mt[i - 1] >> 30);
            out.mt[i] = 1_812_433_253_u32
                .wrapping_mul(x)
                .wrapping_add(u32::try_from(i).unwrap_or(0));
        }
        let mut i = 1_usize;
        let mut j = 0_usize;
        let mut k = 624.max(key.len());
        while k > 0 {
            let x = out.mt[i - 1] ^ (out.mt[i - 1] >> 30);
            out.mt[i] = (out.mt[i] ^ x.wrapping_mul(1_664_525))
                .wrapping_add(key[j])
                .wrapping_add(u32::try_from(j).unwrap_or(0));
            i += 1;
            j += 1;
            if i >= 624 {
                out.mt[0] = out.mt[623];
                i = 1;
            }
            if j >= key.len() {
                j = 0;
            }
            k -= 1;
        }
        for _ in (1..624).rev() {
            let x = out.mt[i - 1] ^ (out.mt[i - 1] >> 30);
            out.mt[i] = (out.mt[i] ^ x.wrapping_mul(1_566_083_941))
                .wrapping_sub(u32::try_from(i).unwrap_or(0));
            i += 1;
            if i >= 624 {
                out.mt[0] = out.mt[623];
                i = 1;
            }
        }
        out.mt[0] = 0x8000_0000;
        out
    }

    fn randrange(&mut self, n: u64) -> u64 {
        if n <= 1 {
            return 0;
        }
        let bits = 64 - (n - 1).leading_zeros();
        loop {
            let r = self.getrandbits(bits);
            if r < n {
                return r;
            }
        }
    }

    fn getrandbits(&mut self, bits: u32) -> u64 {
        if bits == 0 {
            return 0;
        }
        if bits <= 32 {
            return u64::from(self.gen_u32() >> (32 - bits));
        }
        let mut remaining = bits;
        let mut out = 0_u64;
        let mut shift = 0_u32;
        while remaining > 0 {
            let next = self.gen_u32();
            let take = remaining.min(32);
            let value = if take == 32 {
                u64::from(next)
            } else {
                u64::from(next >> (32 - take))
            };
            out |= value << shift;
            remaining -= take;
            shift += take;
        }
        out
    }

    fn gen_u32(&mut self) -> u32 {
        if self.index >= 624 {
            self.twist();
        }
        let mut y = self.mt[self.index];
        self.index += 1;
        y ^= y >> 11;
        y ^= (y << 7) & 0x9d2c_5680;
        y ^= (y << 15) & 0xefc6_0000;
        y ^= y >> 18;
        y
    }

    fn twist(&mut self) {
        const UPPER: u32 = 0x8000_0000;
        const LOWER: u32 = 0x7fff_ffff;
        for i in 0..624 {
            let y = (self.mt[i] & UPPER) | (self.mt[(i + 1) % 624] & LOWER);
            self.mt[i] = self.mt[(i + 397) % 624] ^ (y >> 1);
            if y & 1 != 0 {
                self.mt[i] ^= 0x9908_b0df;
            }
        }
        self.index = 0;
    }
}
