//! Anonymous install counting and its admin read-outs (`app/routers/install_analytics.py`).
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::HashMap, net::SocketAddr, time::Instant};

use accounts::{
    AccountError, Accounts,
    analytics::{self, Report},
};
use axum::{
    Extension,
    body::Bytes,
    extract::{ConnectInfo, Query as AxumQuery, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::Response,
};
use serde_json::{Map, Value, json};

use crate::{
    body::{Field, Kind},
    handlers::account::{bearer, error, json_status, layer, validated},
    respond::{detail, detail_json},
    state::AppState,
};

type Q = AxumQuery<HashMap<String, String>>;

const PLATFORMS: &[&str] = &["ios", "android"];
const INSTALL_REPORT: &[Field] = &[
    Field {
        name: "installation_id",
        kind: Kind::Uuid4,
        default: None,
    },
    Field {
        name: "platform",
        kind: Kind::Lit(PLATFORMS),
        default: None,
    },
    Field {
        name: "app_version",
        kind: Kind::OptStrLen {
            min: 0,
            max: Some(32),
        },
        default: Some("null"),
    },
    Field {
        name: "os_version",
        kind: Kind::OptStrLen {
            min: 0,
            max: Some(32),
        },
        default: Some("null"),
    },
    Field {
        name: "session_start",
        kind: Kind::Bool,
        default: Some("false"),
    },
];
const PRESENCE_PING: &[Field] = &[
    Field {
        name: "installation_id",
        kind: Kind::Uuid4,
        default: None,
    },
    Field {
        name: "platform",
        kind: Kind::Lit(PLATFORMS),
        default: None,
    },
];

/// The caller's address, for the rate count only (never stored).
fn address(headers: &HeaderMap, peer: Option<SocketAddr>) -> String {
    let get = |name: &str| {
        headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(str::to_owned)
    };
    get("cf-connecting-ip")
        .filter(|v| !v.is_empty())
        .or_else(|| {
            get("x-forwarded-for")
                .map(|v| v.split(',').next().unwrap_or_default().trim().to_owned())
                .filter(|v| !v.is_empty())
        })
        .or_else(|| peer.map(|p| p.ip().to_string()))
        .unwrap_or_else(|| "unknown".to_owned())
}

/// `_optional_user_id`: the account behind a valid access token, else `None`.
fn optional_user(acc: &Accounts, headers: &HeaderMap) -> Option<String> {
    bearer(headers).and_then(|t| acc.token_subject(&t))
}

fn too_many() -> Response {
    error(&AccountError::TooManyRequests)
}

fn text(b: &Map<String, Value>, key: &str) -> Option<String> {
    b.get(key).and_then(Value::as_str).map(str::to_owned)
}

async fn report(
    state: &AppState,
    q: &HashMap<String, String>,
    headers: &HeaderMap,
    peer: Option<SocketAddr>,
    bytes: &[u8],
) -> Result<Response, Response> {
    let started = Instant::now();
    let acc = layer(state)?;
    let user_id = optional_user(acc, headers);
    let (b, _) = validated(headers, bytes, INSTALL_REPORT)?;
    let id = text(&b, "installation_id").unwrap_or_default();
    let platform = text(&b, "platform").unwrap_or_default();
    if !analytics::within_limit(
        &format!("install:{}", address(headers, peer)),
        analytics::PER_ADDRESS_PER_HOUR,
        3600,
    )
    .await
    {
        return Err(too_many());
    }
    analytics::record_presence(&id, &platform).await;
    if b.get("session_start").and_then(Value::as_bool) == Some(true)
        && analytics::claim_once(&format!("install-session:{id}"), analytics::REPORT_EVERY_S).await
    {
        acc.record_session(&platform).await.map_err(|e| error(&e))?;
    }
    if !analytics::claim_once(&format!("install-seen:{id}"), analytics::REPORT_EVERY_S).await {
        return Ok(json_status(
            StatusCode::OK,
            &json!({"ok": true, "new": false}),
            q,
            headers,
            started,
        ));
    }
    let country = headers.get("cf-ipcountry").and_then(|v| v.to_str().ok());
    let app_version = text(&b, "app_version");
    let os_version = text(&b, "os_version");
    let new = acc
        .record_seen(&Report {
            installation_id: &id,
            platform: &platform,
            app_version: app_version.as_deref(),
            os_version: os_version.as_deref(),
            country_code: country,
            user_id,
        })
        .await
        .map_err(|e| error(&e))?;
    Ok(json_status(
        StatusCode::OK,
        &json!({"ok": true, "new": new}),
        q,
        headers,
        started,
    ))
}

/// `POST /v1/analytics/install/register`.
pub async fn register(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    report(&state, &q, &headers, peer.map(|p| p.0.0), &bytes)
        .await
        .unwrap_or_else(|r| r)
}

/// `POST /v1/analytics/install/heartbeat`.
pub async fn heartbeat(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    report(&state, &q, &headers, peer.map(|p| p.0.0), &bytes)
        .await
        .unwrap_or_else(|r| r)
}

/// `POST /v1/analytics/install/ping`: live presence only; nothing is stored.
pub async fn ping(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        layer(&state)?;
        let (b, _) = validated(&headers, &bytes, PRESENCE_PING)?;
        let id = text(&b, "installation_id").unwrap_or_default();
        let platform = text(&b, "platform").unwrap_or_default();
        if !analytics::within_limit(
            &format!("install-ping:{}", address(&headers, peer.map(|p| p.0.0))),
            analytics::PINGS_PER_ADDRESS_PER_HOUR,
            3600,
        )
        .await
        {
            return Err(too_many());
        }
        if analytics::claim_once(&format!("install-ping:{id}"), analytics::PING_EVERY_S).await {
            analytics::record_presence(&id, &platform).await;
        }
        Ok(json_status(
            StatusCode::OK,
            &json!({"ok": true, "new": false}),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

fn no_store(mut response: Response) -> Response {
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

/// `_admin`: the admin key, or a signed-in, verified account in `ADMIN_EMAILS`.
async fn admin(acc: &Accounts, headers: &HeaderMap) -> Result<(), Response> {
    let config = acc.config();
    if config.admin_api_key.is_none() && config.admin_emails.is_empty() {
        return Err(detail(StatusCode::NOT_FOUND, "Not found"));
    }
    if let (Some(key), Some(given)) = (
        &config.admin_api_key,
        headers.get("x-admin-key").and_then(|v| v.to_str().ok()),
    ) && constant_time_eq(given.as_bytes(), key.as_bytes())
    {
        return Ok(());
    }
    let user = match optional_user(acc, headers) {
        Some(id) => acc.user(&id).await.map_err(|e| error(&e))?,
        None => None,
    };
    let Some(user) = user.filter(|u| u.is_active) else {
        return Err(no_store(detail(
            StatusCode::UNAUTHORIZED,
            "Not authenticated",
        )));
    };
    if !user.is_verified || !config.admin_emails.contains(&user.email.to_lowercase()) {
        return Err(no_store(detail(StatusCode::FORBIDDEN, "Not an admin")));
    }
    Ok(())
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// `GET /v1/admin/analytics/installs/overview`.
pub async fn overview(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        admin(acc, &headers).await?;
        let out = acc.analytics_overview().await.map_err(|e| error(&e))?;
        Ok(no_store(json_status(
            StatusCode::OK,
            &out,
            &q,
            &headers,
            started,
        )))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /v1/admin/analytics/installs/daily?days=`.
pub async fn daily(State(state): State<AppState>, AxumQuery(q): Q, headers: HeaderMap) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        admin(acc, &headers).await?;
        let days = match q.get("days") {
            None => 30,
            Some(raw) => {
                let mut errors = Vec::new();
                let parsed = crate::body::validate(
                    &Value::String(raw.clone()),
                    Kind::Int {
                        ge: Some(1),
                        le: Some(366),
                    },
                    &[json!("query"), json!("days")],
                    &mut errors,
                );
                match parsed.and_then(|v| v.as_i64()) {
                    Some(d) if errors.is_empty() => d,
                    _ => {
                        return Err(detail_json(
                            StatusCode::UNPROCESSABLE_ENTITY,
                            &Value::Array(errors),
                        ));
                    }
                }
            }
        };
        let out = acc.analytics_daily(days).await.map_err(|e| error(&e))?;
        Ok(no_store(json_status(
            StatusCode::OK,
            &out,
            &q,
            &headers,
            started,
        )))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /v1/admin/analytics/installs/platforms`.
pub async fn platforms(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        admin(acc, &headers).await?;
        let out = acc.analytics_platforms().await.map_err(|e| error(&e))?;
        Ok(no_store(json_status(
            StatusCode::OK,
            &out,
            &q,
            &headers,
            started,
        )))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /v1/admin/analytics/installs/live`.
pub async fn live(State(state): State<AppState>, AxumQuery(q): Q, headers: HeaderMap) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        admin(acc, &headers).await?;
        Ok(no_store(json_status(
            StatusCode::OK,
            &analytics::live().await,
            &q,
            &headers,
            started,
        )))
    };
    run.await.unwrap_or_else(|r: Response| r)
}
