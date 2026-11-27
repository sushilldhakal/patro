//! The account routes (`app/routers/{auth,profiles,guidance}.py`): sign-up and
//! sign-in, sessions, email links, saved profiles, devices and reminder rules.
//!
//! Mounted only when the account layer is configured (`PATRO_RS_DATABASE_URL`).
//! Dependencies resolve in `FastAPI`'s order: the bearer token first (401), then
//! the body (422), then the use case.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::HashMap, time::Instant};

use accounts::{AccountError, Accounts, accounts::User};
use axum::{
    body::Bytes,
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Map, Value};

use crate::{
    body::{self, BodyError, Bounds, Field, Kind},
    respond::{Query, detail, detail_json_gzip, json_plain_payload},
    state::AppState,
};

// ── shared ──────────────────────────────────────────────────────────────────

/// The account layer; the routes are mounted only when it is configured.
pub(crate) fn layer(state: &AppState) -> Result<&Accounts, Response> {
    state
        .accounts
        .as_ref()
        .ok_or_else(|| detail(StatusCode::NOT_FOUND, "Not Found"))
}

pub(crate) fn internal_error() -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "Internal Server Error",
    )
        .into_response()
}

/// An [`AccountError`] as the router's `HTTPException`.
pub(crate) fn error(e: &AccountError) -> Response {
    if let AccountError::Database(why) = e {
        tracing::error!(error = %why, "account database error");
        return internal_error();
    }
    let status = StatusCode::from_u16(e.status()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    detail(status, &e.to_string())
}

fn with_bearer_challenge(mut response: Response) -> Response {
    response
        .headers_mut()
        .insert(header::WWW_AUTHENTICATE, HeaderValue::from_static("Bearer"));
    response
}

/// `HTTPBearer(auto_error=False)`: the token, or `None` (missing, empty or not Bearer).
pub(crate) fn bearer(headers: &HeaderMap) -> Option<String> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    if value.is_empty() {
        return None;
    }
    let (scheme, param) = value.split_once(' ').unwrap_or((value, ""));
    let param = param.trim();
    if scheme.is_empty() || param.is_empty() || !scheme.eq_ignore_ascii_case("bearer") {
        return None;
    }
    Some(param.to_owned())
}

/// `get_current_user`.
pub(crate) async fn current_user(acc: &Accounts, headers: &HeaderMap) -> Result<User, Response> {
    let Some(token) = bearer(headers) else {
        return Err(with_bearer_challenge(detail(
            StatusCode::UNAUTHORIZED,
            "Not authenticated",
        )));
    };
    match acc.current_user(&token).await {
        Ok(user) => Ok(user),
        Err(None) => Err(with_bearer_challenge(detail(
            StatusCode::UNAUTHORIZED,
            "Invalid or expired token",
        ))),
        Err(Some(e)) => Err(error(&e)),
    }
}

/// The validated body model, and the keys the client actually sent.
pub(crate) fn validated(
    headers: &HeaderMap,
    bytes: &[u8],
    model: &'static [Field],
) -> Result<(Map<String, Value>, Vec<String>), Response> {
    let raw = body::read(headers, bytes);
    let sent: Vec<String> = match &raw {
        body::Raw::Value(Value::Object(m)) => m.keys().cloned().collect(),
        _ => Vec::new(),
    };
    match body::validate_body(raw, model) {
        Ok(Value::Object(map)) => Ok((map, sent)),
        Ok(_) | Err(BodyError::Internal) => Err(internal_error()),
        Err(BodyError::Invalid(errors)) => Err(detail_json_gzip(
            StatusCode::UNPROCESSABLE_ENTITY,
            &Value::Array(errors),
            headers,
        )),
        Err(BodyError::Unreadable) => Err(detail(
            StatusCode::BAD_REQUEST,
            "There was an error parsing the body",
        )),
    }
}

/// A JSON answer with `status`, as the route's `response_model` renders it.
pub(crate) fn json_status(
    status: StatusCode,
    payload: &Value,
    q: &Query,
    headers: &HeaderMap,
    started: Instant,
) -> Response {
    let mut response = json_plain_payload(payload, q, headers, started);
    *response.status_mut() = status;
    response
}

/// `status_code=204`: no body, but `FastAPI` still labels it JSON.
pub(crate) fn no_content(started: Instant) -> Response {
    let mut response = StatusCode::NO_CONTENT.into_response();
    let h = response.headers_mut();
    h.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    h.insert("x-siddhanta", HeaderValue::from_static("surya_siddhanta"));
    h.insert("x-ayanamsha", HeaderValue::from_static("surya_siddhanta"));
    if let Ok(v) = HeaderValue::from_str(&format!(
        "app;dur={:.1}",
        started.elapsed().as_secs_f64() * 1000.0
    )) {
        h.insert("server-timing", v);
    }
    response
}

fn message(text: &str) -> Value {
    serde_json::json!({ "message": text })
}

fn text(map: &Map<String, Value>, key: &str) -> String {
    map.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}

macro_rules! field {
    ($name:literal, $kind:expr) => {
        Field {
            name: $name,
            kind: $kind,
            default: None,
        }
    };
    ($name:literal, $kind:expr, $default:literal) => {
        Field {
            name: $name,
            kind: $kind,
            default: Some($default),
        }
    };
}

const fn opt_str(max: usize) -> Kind {
    Kind::OptStrLen {
        min: 0,
        max: Some(max),
    }
}

const ANY_STR: Kind = Kind::Str { min: 0, max: None };

// ── auth ────────────────────────────────────────────────────────────────────

const SIGNUP: &[Field] = &[
    field!("email", Kind::Email),
    field!(
        "password",
        Kind::Str {
            min: 8,
            max: Some(128)
        }
    ),
    field!("full_name", opt_str(120), "null"),
];
const LOGIN: &[Field] = &[
    field!("email", Kind::Email),
    field!(
        "password",
        Kind::Str {
            min: 1,
            max: Some(128)
        }
    ),
];
const REFRESH: &[Field] = &[field!("refresh_token", ANY_STR)];
const GOOGLE: &[Field] = &[field!("id_token", ANY_STR)];
const FACEBOOK: &[Field] = &[field!("access_token", ANY_STR)];
const APPLE: &[Field] = &[
    field!("identity_token", ANY_STR),
    field!("email", Kind::OptStr, "null"),
];
const FORGOT: &[Field] = &[field!("email", Kind::Email)];
const RESET: &[Field] = &[
    field!("token", ANY_STR),
    field!(
        "password",
        Kind::Str {
            min: 8,
            max: Some(128)
        }
    ),
];
const VERIFY: &[Field] = &[field!("token", ANY_STR)];

type Q = AxumQuery<HashMap<String, String>>;

/// Mails a link in the background (`BackgroundTasks`).
fn mail(acc: &Accounts, link: accounts::accounts::EmailLink, kind: Mail) {
    let name = match kind {
        Mail::Verify => "verify",
        Mail::Reset => "reset",
    };
    if acc.capture(serde_json::json!({"kind": name, "to": link.to, "token": link.token})) {
        return;
    }
    let acc = acc.clone();
    tokio::spawn(async move {
        match kind {
            Mail::Verify => acc.send_verification_email(&link).await,
            Mail::Reset => acc.send_password_reset_email(&link).await,
        }
    });
}

#[derive(Debug, Clone, Copy)]
enum Mail {
    Verify,
    Reset,
}

/// `POST /auth/signup`.
pub async fn signup(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, SIGNUP)?;
        let (tokens, link) = acc
            .sign_up(&text(&b, "email"), &text(&b, "password"))
            .await
            .map_err(|e| error(&e))?;
        mail(acc, link, Mail::Verify);
        Ok(json_status(
            StatusCode::CREATED,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/login`.
pub async fn login(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, LOGIN)?;
        let tokens = acc
            .sign_in(&text(&b, "email"), &text(&b, "password"))
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/google`.
pub async fn google(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, GOOGLE)?;
        let email = acc
            .verify_google(&text(&b, "id_token"))
            .await
            .map_err(|e| error(&e))?;
        let tokens = acc
            .sign_in_verified_email(&email)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/facebook`.
pub async fn facebook(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, FACEBOOK)?;
        let email = acc
            .verify_facebook(&text(&b, "access_token"))
            .await
            .map_err(|e| error(&e))?;
        let tokens = acc
            .sign_in_verified_email(&email)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/apple`.
pub async fn apple(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, APPLE)?;
        let (subject, claim) = acc
            .verify_apple(&text(&b, "identity_token"))
            .await
            .map_err(|e| error(&e))?;
        let email = accounts::accounts::apple_account_email(
            claim.as_deref(),
            b.get("email").and_then(Value::as_str),
            &subject,
        );
        let tokens = acc
            .sign_in_with_apple(&subject, &email)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/refresh`.
pub async fn refresh(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, REFRESH)?;
        let tokens = acc
            .refresh_session(&text(&b, "refresh_token"))
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &tokens.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/logout`.
pub async fn logout(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, REFRESH)?;
        acc.sign_out(&text(&b, "refresh_token"))
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &message("Logged out"),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /auth/me`.
pub async fn me(State(state): State<AppState>, AxumQuery(q): Q, headers: HeaderMap) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        Ok(json_status(
            StatusCode::OK,
            &user.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `DELETE /auth/me`.
pub async fn delete_me(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        acc.delete_account(&user).await.map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &message("Account deleted"),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/verify-email`.
pub async fn verify_email(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, VERIFY)?;
        acc.verify_email(&text(&b, "token"))
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &message("Email verified"),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/resend-verification`.
pub async fn resend_verification(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let text = match acc
            .resend_verification(&user)
            .await
            .map_err(|e| error(&e))?
        {
            None => "Already verified",
            Some(link) => {
                mail(acc, link, Mail::Verify);
                "Verification email sent"
            }
        };
        Ok(json_status(
            StatusCode::OK,
            &message(text),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/forgot-password`: the same answer whether or not the email exists.
pub async fn forgot_password(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, FORGOT)?;
        if let Some(link) = acc
            .request_password_reset(&text(&b, "email"))
            .await
            .map_err(|e| error(&e))?
        {
            mail(acc, link, Mail::Reset);
        }
        Ok(json_status(
            StatusCode::OK,
            &message("If that email exists, a reset link has been sent"),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /auth/reset-password`.
pub async fn reset_password(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let (b, _) = validated(&headers, &bytes, RESET)?;
        acc.reset_password(&text(&b, "token"), &text(&b, "password"))
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &message("Password updated"),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

// ── profiles ────────────────────────────────────────────────────────────────

const LAT: Bounds = Bounds {
    gt: None,
    ge: Some((-90.0, "-90")),
    lt: None,
    le: Some((90.0, "90")),
};
const LON: Bounds = Bounds {
    gt: None,
    ge: Some((-180.0, "-180")),
    lt: None,
    le: Some((180.0, "180")),
};

macro_rules! profile_fields {
    ($full_name:expr, $is_default:expr, $default_flag:literal) => {
        &[
            field!("full_name", $full_name, "null"),
            field!("phone", opt_str(32), "null"),
            field!("email", Kind::OptEmail, "null"),
            field!("gender", opt_str(16), "null"),
            field!("country", opt_str(80), "null"),
            field!("city", opt_str(120), "null"),
            field!("location_label", opt_str(200), "null"),
            field!("latitude", Kind::OptFloat(LAT), "null"),
            field!("longitude", Kind::OptFloat(LON), "null"),
            field!("timezone", opt_str(64), "null"),
            field!("birth_date", opt_str(32), "null"),
            field!("birth_time", opt_str(16), "null"),
            field!("birth_era", opt_str(4), "null"),
            field!("notes", Kind::OptStr, "null"),
            field!("is_default", $is_default, $default_flag),
        ]
    };
}

const PROFILE_CREATE_ALL: &[Field] = profile_fields!(
    Kind::Str {
        min: 1,
        max: Some(120)
    },
    Kind::Bool,
    "false"
);
const PROFILE_UPDATE: &[Field] = profile_fields!(
    Kind::OptStrLen {
        min: 1,
        max: Some(120)
    },
    Kind::OptBool,
    "null"
);

/// `ProfileCreate`: `full_name` is required.
static PROFILE_CREATE: std::sync::LazyLock<Vec<Field>> = std::sync::LazyLock::new(|| {
    PROFILE_CREATE_ALL
        .iter()
        .map(|f| {
            if f.name == "full_name" {
                Field {
                    default: None,
                    ..*f
                }
            } else {
                *f
            }
        })
        .collect()
});

/// `GET /profiles`.
pub async fn list_profiles(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let list = acc.list_profiles(&user.id).await.map_err(|e| error(&e))?;
        let out = Value::Array(list.into_iter().map(|p| p.out).collect());
        Ok(json_status(StatusCode::OK, &out, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /profiles`.
pub async fn create_profile(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let model: &'static [Field] = PROFILE_CREATE.as_slice();
        let (b, _) = validated(&headers, &bytes, model)?;
        let profile = acc
            .create_profile(&user.id, &b)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::CREATED,
            &profile.out,
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /profiles/{id}`.
pub async fn get_profile(
    State(state): State<AppState>,
    Path(id): Path<String>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let profile = acc
            .get_profile(&user.id, &id)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &profile.out,
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `PATCH /profiles/{id}`: only the fields sent change.
pub async fn update_profile(
    State(state): State<AppState>,
    Path(id): Path<String>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let (b, sent) = validated(&headers, &bytes, PROFILE_UPDATE)?;
        let changes: Map<String, Value> = b.into_iter().filter(|(k, _)| sent.contains(k)).collect();
        let profile = acc
            .update_profile(&user.id, &id, &changes)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &profile.out,
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `DELETE /profiles/{id}`.
pub async fn delete_profile(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        acc.delete_profile(&user.id, &id)
            .await
            .map_err(|e| error(&e))?;
        Ok(no_content(started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

// ── devices and reminder rules ──────────────────────────────────────────────

const PLATFORMS: &[&str] = &["ios", "android"];
const DEVICE_IN: &[Field] = &[
    field!(
        "push_token",
        Kind::Str {
            min: 10,
            max: Some(255)
        }
    ),
    field!("platform", Kind::Lit(PLATFORMS)),
    field!("timezone", opt_str(64), "null"),
    field!("locale", opt_str(16), "null"),
];
const REMINDER_IN: &[Field] = &[
    field!("profile_id", Kind::OptStr, "null"),
    field!("window_kind", Kind::Lit(&["shubh", "ashubh"])),
    field!(
        "window_key",
        Kind::Str {
            min: 1,
            max: Some(48)
        }
    ),
    field!(
        "lead_minutes",
        Kind::Int {
            ge: Some(0),
            le: Some(180)
        },
        "10"
    ),
    field!("weekdays", Kind::ListInt { max_items: None }, "[]"),
    field!("label", opt_str(120), "null"),
    field!("enabled", Kind::Bool, "true"),
];

/// `POST /devices`.
pub async fn register_device(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let (b, _) = validated(&headers, &bytes, DEVICE_IN)?;
        let out = acc
            .register_device(&user.id, &b)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(StatusCode::OK, &out, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `DELETE /devices/{id}`.
pub async fn unregister_device(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        acc.unregister_device(&user.id, &id)
            .await
            .map_err(|e| error(&e))?;
        Ok(no_content(started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /watchlist` — `{"items": ["share:NABIL", …]}`, the user's starred market items.
pub async fn get_watchlist(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let items = acc.get_watchlist(&user.id).await.map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &serde_json::json!({ "items": items }),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `PUT /watchlist` with `{"items": [...]}` — replaces the whole list (the app owns the order).
pub async fn put_watchlist(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    #[derive(serde::Deserialize)]
    struct Body {
        items: Vec<String>,
    }
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let body: Body = serde_json::from_slice(&bytes)
            .map_err(|e| error(&accounts::AccountError::Unprocessable(e.to_string())))?;
        acc.set_watchlist(&user.id, &body.items)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &serde_json::json!({ "items": body.items }),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /places` — `{"places": [...], "primaryId": "..."}`, or `null` when never saved.
pub async fn get_places(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let data = acc.get_places(&user.id).await.map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &data.unwrap_or_default(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `PUT /places` with the whole saved list — replaces it (the app owns the order and primary).
pub async fn put_places(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let body: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|e| error(&accounts::AccountError::Unprocessable(e.to_string())))?;
        acc.set_places(&user.id, &body)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(StatusCode::OK, &body, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `GET /reminders`.
pub async fn list_reminders(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let list = acc.list_reminders(&user.id).await.map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::OK,
            &Value::Array(list),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /reminders`.
pub async fn create_reminder(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let (b, _) = validated(&headers, &bytes, REMINDER_IN)?;
        let out = acc
            .create_reminder(&user.id, &b)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(
            StatusCode::CREATED,
            &out,
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `PUT /reminders/{id}`.
pub async fn update_reminder(
    State(state): State<AppState>,
    Path(id): Path<String>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let (b, _) = validated(&headers, &bytes, REMINDER_IN)?;
        let out = acc
            .update_reminder(&user.id, &id, &b)
            .await
            .map_err(|e| error(&e))?;
        Ok(json_status(StatusCode::OK, &out, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `DELETE /reminders/{id}`.
pub async fn delete_reminder(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        acc.delete_reminder(&user.id, &id)
            .await
            .map_err(|e| error(&e))?;
        Ok(no_content(started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}
