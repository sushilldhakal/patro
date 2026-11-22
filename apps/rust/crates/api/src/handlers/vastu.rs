//! Vastu routes (`api/vastu.py`): zones, room rules, requirement analysis, the
//! plot sketch and the full house plan.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::HashMap, sync::Arc, time::Instant};

use axum::{
    body::Bytes,
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};
use vastu::{
    Rules,
    house_plan::{self, Facing, Plot, Requirement, Unit},
    sketch,
};

use crate::{
    body::{self, BodyError, Bounds, Field, Kind},
    respond::{
        DEFAULT, Query, detail, detail_json, detail_json_gzip, json_cached_post, json_plain_payload,
    },
    state::AppState,
};

const GRANULARITIES: &[&str] = &["dir8", "dir16", "pada32", "inner4"];

fn rules(state: &AppState) -> Result<Arc<Rules>, Response> {
    state.vastu().map_err(|_| internal_error())
}

/// Starlette's bare 500, as an unhandled exception is answered.
fn internal_error() -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "Internal Server Error",
    )
        .into_response()
}

fn literal_422(loc: &str, name: &str, input: &str) -> Response {
    let expected = "'dir8', 'dir16', 'pada32' or 'inner4'";
    detail_json(
        StatusCode::UNPROCESSABLE_ENTITY,
        &json!([{
            "type": "literal_error", "loc": [loc, name],
            "msg": format!("Input should be {expected}"), "input": input,
            "ctx": {"expected": expected},
        }]),
    )
}

/// `GET /vastu/zones`.
pub async fn zones(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let kind = q.get("kind");
    if let Some(k) = kind
        && !GRANULARITIES.contains(&k.as_str())
    {
        return literal_422("query", "kind", k);
    }
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    let zones = rules.all_zones(kind.map(String::as_str));
    let payload = json!({"rule_version": rules.version(), "count": zones.len(), "zones": zones});
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /vastu/zones/{granularity}/{zone_id}`.
pub async fn zone_detail(
    State(state): State<AppState>,
    Path((granularity, zone_id)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if !GRANULARITIES.contains(&granularity.as_str()) {
        return literal_422("path", "granularity", &granularity);
    }
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    match rules.zone(&granularity, &zone_id) {
        Some(zone) => json_plain_payload(&zone, &q, &headers, started),
        None => detail(
            StatusCode::NOT_FOUND,
            &format!("No such zone: {granularity}:{zone_id}"),
        ),
    }
}

/// `GET /vastu/rooms`.
pub async fn rooms(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    let subjects: Vec<String> = match q.get("subject").filter(|s| !s.is_empty()) {
        Some(s) => vec![s.clone()],
        None => rules.subjects().to_vec(),
    };
    let payload = json!({
        "rule_version": rules.version(),
        "rooms": subjects.iter().map(|s| house_plan::room_zones(&rules, s)).collect::<Vec<_>>(),
    });
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /vastu/rooms/{subject}/detail`.
pub async fn room_detail(
    State(state): State<AppState>,
    Path(subject): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    let mappings: Vec<Value> = rules
        .by_subject(&subject)
        .into_iter()
        .map(Rules::mapping_json)
        .collect();
    if mappings.is_empty() {
        return detail(
            StatusCode::NOT_FOUND,
            &format!("No Vastu data for subject: {subject}"),
        );
    }
    json_plain_payload(
        &json!({"subject": subject, "mappings": mappings}),
        &q,
        &headers,
        started,
    )
}

// ── Request models (services/vastu/vastu_schemas.py) ───────────────────────────

const FACINGS: &[&str] = &["north", "east", "south", "west"];
const DEFAULT_EXTRAS: &str = r#"["living","kitchen","dining","puja"]"#;

const fn int(ge: i64, le: i64) -> Kind {
    Kind::Int {
        ge: Some(ge),
        le: Some(le),
    }
}

const fn field(name: &'static str, kind: Kind, default: Option<&'static str>) -> Field {
    Field {
        name,
        kind,
        default,
    }
}

const POSITIVE: Bounds = Bounds {
    gt: Some((0.0, "0")),
    ge: None,
    lt: None,
    le: None,
};

const SITE: &[Field] = &[
    field("plot_width", Kind::Float(POSITIVE), None),
    field("plot_depth", Kind::Float(POSITIVE), None),
    field("unit", Kind::Lit(&["m", "ft"]), Some(r#""ft""#)),
    field("facing", Kind::Lit(FACINGS), Some(r#""east""#)),
    field(
        "north_bearing",
        Kind::Float(Bounds {
            gt: None,
            ge: Some((0.0, "0")),
            lt: Some((360.0, "360")),
            le: None,
        }),
        Some("0.0"),
    ),
    field("entrance_preference", Kind::OptStr, Some("null")),
    field("floors", int(1, 3), Some("1")),
];

const REQUIREMENT: &[Field] = &[
    field("bedrooms", int(1, 5), Some("3")),
    field("master_bedroom_index", int(1, 5), Some("1")),
    field("toilets", int(1, 5), Some("1")),
    field("bathrooms", int(0, 5), Some("0")),
    field("combined_toilet_bath", int(0, 5), Some("0")),
    field("extras", Kind::ListStr, Some(DEFAULT_EXTRAS)),
    field(
        "mode",
        Kind::Lit(&["strict", "balanced", "flexible"]),
        Some(r#""flexible""#),
    ),
    field("storeys", int(1, 3), Some("1")),
    field(
        "floors",
        Kind::DictLit(&["ground", "first", "third", "any"]),
        Some("{}"),
    ),
];

const HOUSE: &[Field] = &[
    field("site", Kind::Model(SITE), None),
    field("requirement", Kind::Model(REQUIREMENT), None),
];

const SKETCH_PLAN: &[Field] = &[
    field("bedrooms", int(1, 5), Some("3")),
    field("toilets", int(1, 5), Some("1")),
    field("bathrooms", int(0, 5), Some("0")),
    field("combined", int(0, 5), Some("0")),
    field("master_bedroom", int(1, 5), Some("1")),
    field("extras", Kind::ListStr, Some(DEFAULT_EXTRAS)),
    field(
        "mode",
        Kind::Lit(&["strict", "flexible"]),
        Some(r#""flexible""#),
    ),
    field("storeys", int(1, 3), Some("1")),
    field(
        "floors",
        Kind::DictLit(&["any", "ground", "first", "third"]),
        Some("{}"),
    ),
];

const SKETCH_BOUNDS: Bounds = Bounds {
    gt: Some((0.0, "0")),
    ge: None,
    lt: None,
    le: Some((1000.0, "1000")),
};

const SKETCH: &[Field] = &[
    field("plot_width", Kind::Float(SKETCH_BOUNDS), None),
    field("plot_depth", Kind::Float(SKETCH_BOUNDS), None),
    field("facing", Kind::Lit(FACINGS), Some(r#""east""#)),
    field(
        "plan",
        Kind::Model(SKETCH_PLAN),
        Some(
            r#"{"bedrooms":3,"toilets":1,"bathrooms":0,"combined":0,"master_bedroom":1,"extras":["living","kitchen","dining","puja"],"mode":"flexible","storeys":1,"floors":{}}"#,
        ),
    ),
];

fn read_body(
    headers: &HeaderMap,
    bytes: &Bytes,
    model: &'static [Field],
) -> Result<Value, Response> {
    body::validate_body(body::read(headers, bytes), model).map_err(|e| match e {
        BodyError::Invalid(errors) => detail_json_gzip(
            StatusCode::UNPROCESSABLE_ENTITY,
            &Value::Array(errors),
            headers,
        ),
        BodyError::Unreadable => detail(
            StatusCode::BAD_REQUEST,
            "There was an error parsing the body",
        ),
        BodyError::Internal => internal_error(),
    })
}

fn num(v: &Value, key: &str) -> f64 {
    v.get(key).and_then(Value::as_f64).unwrap_or(f64::NAN)
}

fn count(v: &Value, key: &str) -> i64 {
    v.get(key).and_then(Value::as_i64).unwrap_or(0)
}

fn text<'a>(v: &'a Value, key: &str) -> &'a str {
    v.get(key).and_then(Value::as_str).unwrap_or("")
}

fn strings(v: &Value, key: &str) -> Vec<String> {
    v.get(key)
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

fn floors_map(v: &Value) -> HashMap<String, String> {
    v.get("floors")
        .and_then(Value::as_object)
        .map(|m| {
            m.iter()
                .filter_map(|(k, x)| x.as_str().map(|s| (k.clone(), s.to_owned())))
                .collect()
        })
        .unwrap_or_default()
}

/// `values` without repeats, first occurrence kept.
fn unique(values: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    values
        .into_iter()
        .filter(|v| seen.insert(v.clone()))
        .collect()
}

fn requirement(r: &Value) -> Requirement {
    let bedrooms = count(r, "bedrooms");
    Requirement {
        bedrooms,
        master_bedroom_index: count(r, "master_bedroom_index").min(bedrooms),
        toilets: count(r, "toilets"),
        bathrooms: count(r, "bathrooms"),
        combined_toilet_bath: count(r, "combined_toilet_bath"),
        // A kind listed twice is still one room: the planner keys rooms by kind, and
        // Python answered 500 when the band search deleted the same key twice.
        extras: unique(strings(r, "extras")),
        mode: text(r, "mode").to_owned(),
        storeys: count(r, "storeys"),
        floors: floors_map(r),
    }
}

fn unit_of(site: &Value) -> Unit {
    if text(site, "unit") == "ft" {
        Unit::Feet
    } else {
        Unit::Metres
    }
}

/// Input Python would accept but the port cannot follow (infinite or NaN sizes).
fn finite(values: &[f64]) -> Result<(), Response> {
    if values.iter().all(|v| v.is_finite()) {
        Ok(())
    } else {
        Err(internal_error())
    }
}

/// `POST /vastu/analyze`.
pub async fn analyze(State(state): State<AppState>, headers: HeaderMap, bytes: Bytes) -> Response {
    let started = Instant::now();
    let body = match read_body(&headers, &bytes, HOUSE) {
        Ok(b) => b,
        Err(e) => return e,
    };
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    let site = &body["site"];
    let (w, d) = (num(site, "plot_width"), num(site, "plot_depth"));
    if let Err(e) = finite(&[w, d]) {
        return e;
    }
    let payload = house_plan::analyze(
        &rules,
        &requirement(&body["requirement"]),
        w,
        d,
        unit_of(site),
    );
    json_plain_payload(&payload, &HashMap::new(), &headers, started)
}

/// `POST /vastu/house-plan`.
pub async fn house_plan_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    bytes: Bytes,
) -> Response {
    let started = Instant::now();
    let body = match read_body(&headers, &bytes, HOUSE) {
        Ok(b) => b,
        Err(e) => return e,
    };
    let rules = match rules(&state) {
        Ok(r) => r,
        Err(e) => return e,
    };
    let site = &body["site"];
    let plot = Plot {
        width: num(site, "plot_width"),
        depth: num(site, "plot_depth"),
        unit: unit_of(site),
        facing: Facing::parse(text(site, "facing")).unwrap_or(Facing::East),
    };
    if let Err(e) = finite(&[plot.width, plot.depth]) {
        return e;
    }
    let req = requirement(&body["requirement"]);
    match house_plan::build(&rules, plot, &req, site) {
        Ok(payload) => json_cached_post(&payload, &headers, DEFAULT, started),
        Err(_) => internal_error(),
    }
}

/// `POST /vastu/sketch`.
pub async fn sketch_route(headers: HeaderMap, bytes: Bytes) -> Response {
    let started = Instant::now();
    let body = match read_body(&headers, &bytes, SKETCH) {
        Ok(b) => b,
        Err(e) => return e,
    };
    let plan = &body["plan"];
    let mut unknown: Vec<String> = strings(plan, "extras")
        .into_iter()
        .filter(|k| !sketch::known_kind(k))
        .collect();
    unknown.sort();
    unknown.dedup();
    if !unknown.is_empty() {
        return detail(
            StatusCode::UNPROCESSABLE_ENTITY,
            &format!("Unknown room kind(s): {}", unknown.join(", ")),
        );
    }
    let floors = floors_map(plan);
    let mut bad: Vec<&String> = floors.keys().filter(|k| !sketch::known_kind(k)).collect();
    bad.sort();
    if !bad.is_empty() {
        let names: Vec<&str> = bad.iter().map(|s| s.as_str()).collect();
        return detail(
            StatusCode::UNPROCESSABLE_ENTITY,
            &format!("Unknown room kind(s) in floors: {}", names.join(", ")),
        );
    }
    let (w, d) = (num(&body, "plot_width"), num(&body, "plot_depth"));
    if let Err(e) = finite(&[w, d]) {
        return e;
    }
    let house = sketch::HousePlan {
        bedrooms: count(plan, "bedrooms"),
        toilets: count(plan, "toilets"),
        bathrooms: count(plan, "bathrooms"),
        combined: count(plan, "combined"),
        master_bedroom: count(plan, "master_bedroom"),
        extras: strings(plan, "extras"),
        mode: if text(plan, "mode") == "strict" {
            sketch::Mode::Strict
        } else {
            sketch::Mode::Flexible
        },
        storeys: count(plan, "storeys"),
        floors,
    };
    let payload = sketch::build_sketch(&house, w, d, text(&body, "facing"));
    json_plain_payload(&payload, &HashMap::new(), &headers, started)
}
