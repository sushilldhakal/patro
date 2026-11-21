//! Typed payload blocks and their one conversion to JSON.
//!
//! Each block of the daily payload is a struct whose field order is its JSON key
//! order. Building a struct costs a few moves; building the same block as a JSON
//! tree costs a hash-map insert and a key allocation per field. The tree is only
//! made where a caller still needs one ([`to_value`]); [`write`](common::pyjson)
//! serializes the struct directly.

use serde::Serialize;
use serde_json::Value;

/// The JSON tree of a typed block. Blocks hold only strings, numbers and lists, so
/// serializing one cannot fail.
#[must_use]
pub fn to_value<T: Serialize>(block: &T) -> Value {
    serde_json::to_value(block).unwrap_or(Value::Null)
}
