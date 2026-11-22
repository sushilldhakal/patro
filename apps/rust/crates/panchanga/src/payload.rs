//! Typed payloads: ordered fields that are small JSON trees or typed blocks, shared.
//!
//! A block of the daily payload (muhurta, the lagna spans, the bala tables…) is a struct
//! whose field order is its JSON key order. A payload is an ordered list of [`Field`]s:
//! each one a small JSON tree, a typed block, or a nested payload, all behind `Arc`s, so
//! a day's state can share its payload's blocks instead of copying them, and the whole
//! thing is written straight to text ([`Fields::write`]) without ever building one big
//! tree. [`Fields::to_value`] builds the tree for the callers that still read one.

use std::{any::Any, borrow::Cow, fmt, sync::Arc};

use common::{pyjson::Style, pyser};
use serde::Serialize;
use serde_json::{Map, Value};

/// The JSON tree of a typed block. Blocks hold only strings, numbers and lists, so
/// serializing one cannot fail.
#[must_use]
pub fn to_value<T: Serialize>(block: &T) -> Value {
    serde_json::to_value(block).unwrap_or(Value::Null)
}

/// A typed block: written straight to text, turned into a tree on demand, and
/// readable as its own type.
pub trait Block: Send + Sync + fmt::Debug + Any {
    /// Appends the block's JSON text.
    fn write(&self, out: &mut String, style: Style);
    /// The block as a JSON tree.
    fn value(&self) -> Value;
    /// The block as [`Any`], to read it back as its own type.
    fn as_any(&self) -> &dyn Any;
}

impl<T: Serialize + Send + Sync + fmt::Debug + 'static> Block for T {
    fn write(&self, out: &mut String, style: Style) {
        pyser::write(out, self, style);
    }
    fn value(&self) -> Value {
        to_value(self)
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// One field of a payload.
#[derive(Debug, Clone)]
pub enum Field {
    /// A JSON tree (the small blocks, and anything read back from storage).
    Tree(Arc<Value>),
    /// A typed block.
    Typed(Arc<dyn Block>),
    /// A nested payload (a day's `detail`, a row's embedded panchanga).
    Nested(Arc<Fields>),
    /// A list of payloads (a month's rows).
    List(Arc<[Fields]>),
}

impl Field {
    /// A field holding a JSON tree.
    #[must_use]
    pub fn tree(value: Value) -> Self {
        Self::Tree(Arc::new(value))
    }

    /// A field holding a typed block.
    #[must_use]
    pub fn typed<T: Block>(block: T) -> Self {
        Self::Typed(Arc::new(block))
    }

    /// Appends the field's JSON text.
    pub fn write(&self, out: &mut String, style: Style) {
        match self {
            Self::Tree(v) => pyser::write(out, &**v, style),
            Self::Typed(b) => b.write(out, style),
            Self::Nested(f) => f.write(out, style),
            Self::List(rows) => {
                out.push('[');
                for (i, row) in rows.iter().enumerate() {
                    if i > 0 {
                        out.push_str(item_sep(style));
                    }
                    row.write(out, style);
                }
                out.push(']');
            }
        }
    }

    /// The field as a JSON tree.
    #[must_use]
    pub fn value(&self) -> Value {
        match self {
            Self::Tree(v) => (**v).clone(),
            Self::Typed(b) => b.value(),
            Self::Nested(f) => f.to_value(),
            Self::List(rows) => Value::Array(rows.iter().map(Fields::to_value).collect()),
        }
    }

    /// The field as a tree, borrowed when it is one.
    #[must_use]
    pub fn as_tree(&self) -> Cow<'_, Value> {
        match self {
            Self::Tree(v) => Cow::Borrowed(&**v),
            other => Cow::Owned(other.value()),
        }
    }

    /// The typed block inside, if it is one of type `T`.
    #[must_use]
    pub fn typed_as<T: 'static>(&self) -> Option<&T> {
        match self {
            Self::Typed(b) => b.as_any().downcast_ref(),
            _ => None,
        }
    }
}

impl From<Value> for Field {
    fn from(value: Value) -> Self {
        Self::tree(value)
    }
}

fn item_sep(style: Style) -> &'static str {
    match style {
        Style::Compact => ",",
        Style::Default => ", ",
    }
}

fn key_sep(style: Style) -> &'static str {
    match style {
        Style::Compact => ":",
        Style::Default => ": ",
    }
}

/// An ordered JSON object of [`Field`]s.
#[derive(Debug, Clone, Default)]
pub struct Fields(Vec<(Cow<'static, str>, Field)>);

impl Fields {
    /// No fields.
    #[must_use]
    pub fn new() -> Self {
        Self(Vec::new())
    }

    /// Sets `key`: in place when present (as a JSON object keeps a key's position),
    /// at the end otherwise.
    pub fn insert(&mut self, key: impl Into<Cow<'static, str>>, field: Field) {
        let key = key.into();
        match self.0.iter_mut().find(|(k, _)| *k == key) {
            Some((_, slot)) => *slot = field,
            None => self.0.push((key, field)),
        }
    }

    /// Sets `key` to a JSON tree.
    pub fn insert_tree(&mut self, key: impl Into<Cow<'static, str>>, value: Value) {
        self.insert(key, Field::tree(value));
    }

    /// Removes `key`, keeping the order of the rest; the field it held.
    pub fn remove(&mut self, key: &str) -> Option<Field> {
        let i = self.0.iter().position(|(k, _)| k == key)?;
        Some(self.0.remove(i).1)
    }

    /// The field at `key`.
    #[must_use]
    pub fn field(&self, key: &str) -> Option<&Field> {
        self.0.iter().find(|(k, _)| k == key).map(|(_, f)| f)
    }

    /// The field at `key` as a tree (borrowed when it is one).
    #[must_use]
    pub fn get(&self, key: &str) -> Option<Cow<'_, Value>> {
        self.field(key).map(Field::as_tree)
    }

    /// Whether `key` is set.
    #[must_use]
    pub fn contains(&self, key: &str) -> bool {
        self.field(key).is_some()
    }

    /// The keys, in order.
    pub fn keys(&self) -> impl Iterator<Item = &str> {
        self.0.iter().map(|(k, _)| &**k)
    }

    /// The fields, in order.
    pub fn iter(&self) -> impl Iterator<Item = (&str, &Field)> {
        self.0.iter().map(|(k, f)| (&**k, f))
    }

    /// Keeps the fields `keep` accepts.
    pub fn retain(&mut self, mut keep: impl FnMut(&str, &Field) -> bool) {
        self.0.retain(|(k, f)| keep(k, f));
    }

    /// Appends the object's JSON text.
    pub fn write(&self, out: &mut String, style: Style) {
        out.push('{');
        for (i, (key, field)) in self.0.iter().enumerate() {
            if i > 0 {
                out.push_str(item_sep(style));
            }
            pyser::write(out, &**key, style);
            out.push_str(key_sep(style));
            field.write(out, style);
        }
        out.push('}');
    }

    /// The object's JSON text.
    #[must_use]
    pub fn to_text(&self, style: Style) -> String {
        let mut out = String::with_capacity(16 * 1024);
        self.write(&mut out, style);
        out
    }

    /// The object as a JSON tree.
    #[must_use]
    pub fn to_value(&self) -> Value {
        Value::Object(
            self.0
                .iter()
                .map(|(k, f)| (k.to_string(), f.value()))
                .collect::<Map<String, Value>>(),
        )
    }

    /// Fields from a JSON object (each value a tree); a non-object gives no fields.
    #[must_use]
    pub fn from_value(value: Value) -> Self {
        match value {
            Value::Object(map) => Self(
                map.into_iter()
                    .map(|(k, v)| (Cow::Owned(k), Field::tree(v)))
                    .collect(),
            ),
            _ => Self::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use common::pyjson::dumps;
    use serde_json::json;

    use super::*;

    #[derive(Debug, Serialize)]
    struct Row {
        name: &'static str,
        degree: f64,
    }

    fn sample() -> Fields {
        let mut f = Fields::new();
        f.insert_tree("date", json!("2026-11-01"));
        f.insert(
            "row",
            Field::typed(Row {
                name: "Ashwini",
                degree: 5.0,
            }),
        );
        let mut inner = Fields::new();
        inner.insert_tree("x", json!([1, 2.5]));
        f.insert("nested", Field::Nested(Arc::new(inner.clone())));
        f.insert("rows", Field::List(vec![inner.clone(), inner].into()));
        f
    }

    #[test]
    fn writes_the_bytes_its_tree_writes() {
        let f = sample();
        for style in [Style::Compact, Style::Default] {
            assert_eq!(f.to_text(style), dumps(&f.to_value(), style), "{style:?}");
        }
    }

    #[test]
    fn insert_keeps_position_and_remove_keeps_order() {
        let mut f = sample();
        f.insert_tree("date", json!("x"));
        assert_eq!(
            f.keys().collect::<Vec<_>>(),
            ["date", "row", "nested", "rows"],
            "in place"
        );
        f.remove("row");
        assert_eq!(
            f.keys().collect::<Vec<_>>(),
            ["date", "nested", "rows"],
            "order kept"
        );
        assert!(
            f.field("nested")
                .is_some_and(|n| n.typed_as::<Row>().is_none()),
            "not a Row"
        );
    }

    #[test]
    fn a_typed_block_reads_back_as_its_type() {
        let f = sample();
        assert_eq!(
            f.field("row")
                .and_then(Field::typed_as::<Row>)
                .map(|r| r.name),
            Some("Ashwini")
        );
    }
}
