//! Saved events and the private calendar feed (`app/routers/events.py`).
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::HashMap, time::Instant};

use accounts::{
    Accounts,
    events::{FeedToken, Invite},
    pydt::{self, PyDateTime},
};
use axum::{
    body::Bytes,
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode, header},
    response::Response,
};
use serde_json::{Map, Value, json};

use crate::{
    body::{Field, Kind},
    handlers::account::{current_user, error, json_status, layer, no_content, validated},
    respond::{detail, detail_json, raw_payload},
    state::AppState,
};

type Q = AxumQuery<HashMap<String, String>>;

const fn opt_str(max: usize) -> Kind {
    Kind::OptStrLen {
        min: 0,
        max: Some(max),
    }
}

const EVENT_IN: &[Field] = &[
    Field {
        name: "kind",
        kind: Kind::Str { min: 0, max: None },
        default: Some("\"event\""),
    },
    Field {
        name: "priority",
        kind: Kind::Int {
            ge: Some(0),
            le: Some(3),
        },
        default: Some("0"),
    },
    Field {
        name: "title",
        kind: Kind::Str {
            min: 1,
            max: Some(200),
        },
        default: None,
    },
    Field {
        name: "location",
        kind: opt_str(200),
        default: Some("null"),
    },
    Field {
        name: "notes",
        kind: opt_str(4000),
        default: Some("null"),
    },
    Field {
        name: "all_day",
        kind: Kind::Bool,
        default: Some("false"),
    },
    Field {
        name: "starts_at",
        kind: Kind::DateTime,
        default: None,
    },
    Field {
        name: "ends_at",
        kind: Kind::OptDateTime,
        default: Some("null"),
    },
    Field {
        name: "timezone",
        kind: Kind::Str {
            min: 0,
            max: Some(64),
        },
        default: Some("\"Asia/Kathmandu\""),
    },
    Field {
        name: "repeat",
        kind: Kind::Str { min: 0, max: None },
        default: Some("\"never\""),
    },
    Field {
        name: "alerts",
        kind: Kind::ListInt { max_items: Some(2) },
        default: Some("[]"),
    },
    Field {
        name: "source_kind",
        kind: opt_str(16),
        default: Some("null"),
    },
    Field {
        name: "source_key",
        kind: opt_str(64),
        default: Some("null"),
    },
    Field {
        name: "invitees",
        kind: Kind::ListStrMax {
            max_items: Some(20),
        },
        default: Some("[]"),
    },
    Field {
        name: "profile_id",
        kind: Kind::OptStr,
        default: Some("null"),
    },
];

/// The body's two datetimes (already validated).
fn times(b: &Map<String, Value>) -> Result<(PyDateTime, Option<PyDateTime>), Response> {
    let parse =
        |v: &Value| pydt::parse_value(v).map_err(|_| crate::handlers::account::internal_error());
    let starts = parse(b.get("starts_at").unwrap_or(&Value::Null))?;
    let ends = match b.get("ends_at") {
        None | Some(Value::Null) => None,
        Some(v) => Some(parse(v)?),
    };
    Ok((starts, ends))
}

fn send(acc: &Accounts, invites: Vec<Invite>) {
    let invites: Vec<Invite> = invites
        .into_iter()
        .filter(|i| {
            !acc.capture(json!({
                "kind": "invite", "to": i.to, "title": i.title, "ics": i.ics,
                "organizer_name": i.organizer_name, "cancelled": i.cancelled,
            }))
        })
        .collect();
    if invites.is_empty() {
        return;
    }
    let acc = acc.clone();
    tokio::spawn(async move {
        for invite in &invites {
            acc.send_event_invite(invite).await;
        }
    });
}

/// `since` as a query `datetime` (422 in pydantic's shape when it is not one).
fn since(q: &HashMap<String, String>) -> Result<Option<jiff::Timestamp>, Response> {
    let Some(raw) = q.get("since") else {
        return Ok(None);
    };
    let fail = |kind: &str, msg: String, ctx: Option<Value>| {
        let mut item = json!({"type": kind, "loc": ["query", "since"], "msg": msg, "input": raw});
        if let Some(ctx) = ctx {
            item["ctx"] = ctx;
        }
        detail_json(StatusCode::UNPROCESSABLE_ENTITY, &json!([item]))
    };
    match pydt::parse_str(raw) {
        Ok(PyDateTime::Aware(t)) => Ok(Some(t)),
        // A naive `since` compares as UTC in Postgres (the session zone of the Python app).
        Ok(PyDateTime::Naive(dt)) => Ok(dt
            .to_zoned(jiff::tz::TimeZone::UTC)
            .ok()
            .map(|z| z.timestamp())),
        Err(pydt::DateTimeError::Parsing(why)) => Err(fail(
            "datetime_from_date_parsing",
            format!("Input should be a valid datetime or date, {why}"),
            Some(json!({ "error": why })),
        )),
        Err(pydt::DateTimeError::Type) => Err(fail(
            "datetime_type",
            "Input should be a valid datetime".to_owned(),
            None,
        )),
    }
}

/// `GET /events`.
pub async fn list_events(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let since = since(&q)?;
        let list = acc
            .list_events(&user.id, since)
            .await
            .map_err(|e| error(&e))?;
        let out = Value::Array(list.iter().map(accounts::events::Event::out).collect());
        Ok(json_status(StatusCode::OK, &out, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `POST /events`.
pub async fn create_event(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let (b, _) = validated(&headers, &bytes, EVENT_IN)?;
        let (starts, ends) = times(&b)?;
        let (event, invites) = acc
            .create_event(&user.id, &b, starts, ends)
            .await
            .map_err(|e| error(&e))?;
        send(acc, invites);
        Ok(json_status(
            StatusCode::CREATED,
            &event.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `PUT /events/{id}`.
pub async fn update_event(
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
        let (b, _) = validated(&headers, &bytes, EVENT_IN)?;
        let (starts, ends) = times(&b)?;
        let (event, invites) = acc
            .update_event(&user.id, &id, &b, starts, ends)
            .await
            .map_err(|e| error(&e))?;
        send(acc, invites);
        Ok(json_status(
            StatusCode::OK,
            &event.out(),
            &q,
            &headers,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

/// `DELETE /events/{id}`.
pub async fn delete_event(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let user = current_user(acc, &headers).await?;
        let invites = acc
            .delete_event(&user.id, &id)
            .await
            .map_err(|e| error(&e))?;
        send(acc, invites);
        Ok(no_content(started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}

async fn feed(
    state: &AppState,
    q: &HashMap<String, String>,
    headers: &HeaderMap,
    mode: FeedToken,
) -> Result<Response, Response> {
    let started = Instant::now();
    let acc = layer(state)?;
    let user = current_user(acc, headers).await?;
    let token = acc
        .feed_token(&user.id, mode)
        .await
        .map_err(|e| error(&e))?;
    let out = acc
        .feed_out(&user.id, &token)
        .await
        .map_err(|e| error(&e))?;
    Ok(json_status(StatusCode::OK, &out, q, headers, started))
}

/// `GET /events/feed`.
pub async fn get_feed(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    feed(&state, &q, &headers, FeedToken::Current)
        .await
        .unwrap_or_else(|r| r)
}

/// `POST /events/feed/reset`.
pub async fn reset_feed(
    State(state): State<AppState>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    feed(&state, &q, &headers, FeedToken::Replace)
        .await
        .unwrap_or_else(|r| r)
}

/// `GET /calendar/{token}.ics`: the subscribed calendar; the token is the key.
pub async fn calendar_feed(
    State(state): State<AppState>,
    Path(file): Path<String>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        let Some(token) = file.strip_suffix(".ics").filter(|t| !t.is_empty()) else {
            return Err(detail(StatusCode::NOT_FOUND, "Not Found"));
        };
        let Some(owner) = acc.feed_owner(token).await.map_err(|e| error(&e))? else {
            return Err(detail(StatusCode::NOT_FOUND, "Calendar not found"));
        };
        let agent = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default();
        acc.mark_feed_fetched(&owner, agent)
            .await
            .map_err(|e| error(&e))?;
        let body = acc.build_feed(&owner).await.map_err(|e| error(&e))?;
        Ok(raw_payload(
            body,
            "text/calendar; charset=utf-8",
            &[
                (
                    "content-disposition",
                    "inline; filename=\"vedic-patro.ics\"",
                ),
                ("cache-control", "private, max-age=900"),
            ],
            &headers,
            1024,
            started,
        ))
    };
    run.await.unwrap_or_else(|r: Response| r)
}
