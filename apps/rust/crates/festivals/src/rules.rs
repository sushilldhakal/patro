//! The rule book, the public holiday ids and the MoHA overrides.

use std::sync::LazyLock;

use panchanga::lunar_month::KshayaTransfer;
use serde_json::{Map, Value};

fn parse(text: &str, what: &str) -> Value {
    serde_json::from_str(text).unwrap_or_else(|e| panic!("{what} is valid JSON: {e}"))
}

static RULE_BOOK: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../rules/festival_rules_v3.json"),
        "festival_rules_v3.json",
    )
});
static PUBLIC: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../rules/public_holidays_v1.json"),
        "public_holidays_v1.json",
    )
});
static OVERRIDES: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../rules/holiday_overrides_v1.json"),
        "holiday_overrides_v1.json",
    )
});
static MONTH_TYPES: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../rules/month_type_rules_v1.json"),
        "month_type_rules_v1.json",
    )
});
static EMPTY: LazyLock<Map<String, Value>> = LazyLock::new(Map::new);

/// The id of a rule taken from the rule book, found by identity.
pub(crate) fn id_of(rule: &Map<String, Value>) -> Option<&'static str> {
    rules()
        .iter()
        .find(|(_, v)| v.as_object().is_some_and(|o| std::ptr::eq(o, rule)))
        .map(|(id, _)| id.as_str())
}

/// What a festival does when a kshaya lunation swallows its month
/// (`month_type_rules_v1.json`, `kshaya_festival_transfer`): the rule's own override, else the
/// default, which is to follow into the lunation after the kshaya.
pub(crate) fn kshaya_transfer(id: Option<&str>) -> KshayaTransfer {
    let transfer = &MONTH_TYPES["kshaya_festival_transfer"];
    let policy = id
        .and_then(|id| transfer["overrides"][id]["policy"].as_str())
        .or_else(|| transfer["default"].as_str());
    if policy == Some("skip") {
        KshayaTransfer::Skip
    } else {
        KshayaTransfer::Follow
    }
}

/// Whether a rule is one of the festivals that belong to the adhik lunation itself.
pub(crate) fn is_adhik_only(id: Option<&str>) -> bool {
    id.is_some_and(|id| {
        MONTH_TYPES["adhik_only_festivals"]["ids"]
            .as_array()
            .is_some_and(|ids| ids.iter().any(|v| v.as_str() == Some(id)))
    })
}

/// The month-type rules (adhik before and after a kshaya, the kshaya month, vratas).
#[must_use]
pub fn month_type_rules() -> &'static Value {
    &MONTH_TYPES
}

/// Every festival rule by id, in the file's order.
pub(crate) fn rules() -> &'static Map<String, Value> {
    RULE_BOOK["festivals"].as_object().unwrap_or(&EMPTY)
}

/// One rule, or an empty object.
#[must_use]
pub fn rule(id: &str) -> &'static Map<String, Value> {
    rules().get(id).and_then(Value::as_object).unwrap_or(&EMPTY)
}

/// Whether a festival is a general public holiday.
#[must_use]
pub fn is_public_holiday(id: &str) -> bool {
    PUBLIC["holiday_ids"]
        .as_array()
        .is_some_and(|ids| ids.iter().any(|v| v.as_str() == Some(id)))
}

/// The MoHA overrides of one BS year, by festival id.
pub(crate) fn overrides(bs_year: i32) -> &'static Map<String, Value> {
    OVERRIDES["bs_years"][bs_year.to_string()]
        .as_object()
        .unwrap_or(&EMPTY)
}
