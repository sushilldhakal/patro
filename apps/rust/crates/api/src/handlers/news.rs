//! News headlines grouped into stories: a feed and a single story.

use axum::{
    Json,
    extract::{Path, Query, State},
    http::header,
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::json;

use common::{AppError, AppResult};

use crate::{
    news::{CATEGORIES, Story},
    state::AppState,
};

/// Shared caches (Redis, Cloudflare) keep a response this long; the feeds change slowly.
const CACHE_CONTROL: &str = "public, max-age=120";
/// Top stories: reported by at least this many outlets…
const TOP_MIN_SOURCES: usize = 2;
/// …within this many seconds.
const TOP_WINDOW_SECS: i64 = 24 * 3600;
const TOP_COUNT: usize = 6;

/// Query parameters of the news feed.
#[derive(Debug, Deserialize)]
pub struct FeedQuery {
    /// `ne` or `en`; both languages when absent.
    pub lang: Option<String>,
    /// One category slug; every category when absent.
    pub category: Option<String>,
    /// `next_cursor` of the previous page.
    pub cursor: Option<String>,
    /// Stories per page, 1–100 (default 30).
    pub limit: Option<usize>,
}

/// `GET /v1/news/feed` — top stories (first page only), then the latest stories.
///
/// # Errors
///
/// An unknown language or category, a bad cursor, or a limit out of range.
pub async fn feed(
    State(state): State<AppState>,
    Query(query): Query<FeedQuery>,
) -> AppResult<impl IntoResponse> {
    let lang = query.lang.as_deref().filter(|l| !l.is_empty());
    if lang.is_some_and(|l| l != "ne" && l != "en") {
        return Err(AppError::BadRequest("lang must be ne or en".into()));
    }
    let category = query.category.as_deref().filter(|c| !c.is_empty());
    if category.is_some_and(|c| !CATEGORIES.contains(&c)) {
        return Err(AppError::BadRequest(format!(
            "category must be one of {}",
            CATEGORIES.join(", ")
        )));
    }
    let limit = query.limit.unwrap_or(30);
    if !(1..=100).contains(&limit) {
        return Err(AppError::BadRequest("limit must be 1-100".into()));
    }
    let cursor = match query.cursor.as_deref().filter(|c| !c.is_empty()) {
        None => None,
        Some(text) => Some(
            text.split_once('-')
                .and_then(|(at, id)| Some((at.parse::<i64>().ok()?, id.to_owned())))
                .ok_or_else(|| AppError::BadRequest("bad cursor".into()))?,
        ),
    };

    let snapshot = state.news.snapshot().await;
    let in_lang: Vec<&Story> = snapshot
        .stories
        .iter()
        .filter(|s| lang.is_none_or(|l| s.language == l))
        .collect();
    let categories: Vec<_> = CATEGORIES
        .iter()
        .map(|slug| {
            let count = in_lang.iter().filter(|s| s.category == *slug).count();
            json!({ "slug": slug, "count": count })
        })
        .collect();
    let stories: Vec<&Story> = in_lang
        .into_iter()
        .filter(|s| category.is_none_or(|c| s.category == c))
        .collect();

    // Top stories come out of the latest list, so no card shows twice.
    let mut top: Vec<&Story> = stories
        .iter()
        .copied()
        .filter(|s| {
            s.sources.len() >= TOP_MIN_SOURCES
                && snapshot.fetched_at - s.updated_at <= TOP_WINDOW_SECS
        })
        .collect();
    top.sort_by(|a, b| {
        b.sources
            .len()
            .cmp(&a.sources.len())
            .then(b.updated_at.cmp(&a.updated_at))
    });
    top.truncate(TOP_COUNT);
    let latest: Vec<&Story> = stories
        .into_iter()
        .filter(|s| !top.iter().any(|t| t.id == s.id))
        .filter(|s| {
            cursor
                .as_ref()
                .is_none_or(|(at, id)| (s.updated_at, s.id.as_str()) < (*at, id.as_str()))
        })
        .take(limit + 1)
        .collect();
    let next_cursor = (latest.len() > limit)
        .then(|| latest.get(limit - 1))
        .flatten()
        .map(|s| format!("{}-{}", s.updated_at, s.id));
    let latest = &latest[..latest.len().min(limit)];
    let top: &[&Story] = if cursor.is_none() { &top } else { &[] };

    Ok((
        [(header::CACHE_CONTROL, CACHE_CONTROL)],
        Json(json!({
            "top_stories": top,
            "stories": latest,
            "next_cursor": next_cursor,
            "categories": categories,
            "fetched_at": snapshot.fetched_at,
        })),
    ))
}

/// `GET /v1/news/stories/{id}` — one story with every outlet's link.
///
/// # Errors
///
/// No story with that id (it is older than three days, or never existed).
pub async fn story(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let snapshot = state.news.snapshot().await;
    let story = snapshot
        .stories
        .iter()
        .find(|s| s.id == id)
        .ok_or_else(|| AppError::NotFound("story not found".into()))?;
    Ok(([(header::CACHE_CONTROL, CACHE_CONTROL)], Json(json!(story))))
}
