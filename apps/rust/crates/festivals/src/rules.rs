//! The rule book, the public holiday ids and the MoHA overrides.

use std::sync::LazyLock;

use serde_json::{Map, Value};

fn parse(text: &str, what: &str) -> Value {
    serde_json::from_str(text).unwrap_or_else(|e| panic!("{what} is valid JSON: {e}"))
}

static RULE_BOOK: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../../api/rules/festival_rules_v3.json"),
        "festival_rules_v3.json",
    )
});
static PUBLIC: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../../api/rules/public_holidays_v1.json"),
        "public_holidays_v1.json",
    )
});
static OVERRIDES: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../../api/rules/holiday_overrides_v1.json"),
        "holiday_overrides_v1.json",
    )
});
static EMPTY: LazyLock<Map<String, Value>> = LazyLock::new(Map::new);

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
