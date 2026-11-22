//! Whether any object key inside a serializable value matches a test, found by walking
//! the value through serde without writing or allocating anything: numbers are never
//! formatted, and the walk stops at the first match.

use std::fmt::{self, Display};

use serde::{
    Serialize, Serializer,
    ser::{
        self, SerializeMap, SerializeSeq, SerializeStruct, SerializeStructVariant, SerializeTuple,
        SerializeTupleStruct, SerializeTupleVariant,
    },
};

/// Whether `value` holds an object key (a struct field name or a map key) that
/// `matches` accepts, at any depth. Text a value embeds as already-written JSON
/// (`pyser::RawJson`) cannot be looked into, so it counts as a match.
#[must_use]
pub fn any_key<T: Serialize + ?Sized>(value: &T, matches: &dyn Fn(&str) -> bool) -> bool {
    value.serialize(Probe { matches }).is_err()
}

/// The walk's only error: a matching key was found (or something it cannot see into).
#[derive(Debug)]
struct Found;

impl Display for Found {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("key found")
    }
}

impl std::error::Error for Found {}

impl ser::Error for Found {
    fn custom<T: Display>(_: T) -> Self {
        Self
    }
}

#[derive(Clone, Copy)]
struct Probe<'a> {
    matches: &'a dyn Fn(&str) -> bool,
}

impl Probe<'_> {
    fn key(self, key: &str) -> Result<(), Found> {
        if (self.matches)(key) {
            Err(Found)
        } else {
            Ok(())
        }
    }
}

macro_rules! scalars {
    ($($name:ident: $ty:ty),* $(,)?) => {
        $(fn $name(self, _: $ty) -> Result<(), Found> { Ok(()) })*
    };
}

impl Serializer for Probe<'_> {
    type Ok = ();
    type Error = Found;
    type SerializeSeq = Self;
    type SerializeTuple = Self;
    type SerializeTupleStruct = Self;
    type SerializeTupleVariant = Self;
    type SerializeMap = Self;
    type SerializeStruct = Self;
    type SerializeStructVariant = Self;

    scalars!(
        serialize_bool: bool, serialize_i8: i8, serialize_i16: i16, serialize_i32: i32,
        serialize_i64: i64, serialize_i128: i128, serialize_u8: u8, serialize_u16: u16,
        serialize_u32: u32, serialize_u64: u64, serialize_u128: u128, serialize_f32: f32,
        serialize_f64: f64, serialize_char: char, serialize_str: &str, serialize_bytes: &[u8],
        serialize_unit_struct: &'static str,
    );

    fn serialize_none(self) -> Result<(), Found> {
        Ok(())
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<(), Found> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<(), Found> {
        Ok(())
    }
    fn serialize_unit_variant(self, _: &'static str, _: u32, _: &'static str) -> Result<(), Found> {
        Ok(())
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        name: &'static str,
        value: &T,
    ) -> Result<(), Found> {
        // `pyser::RawJson`: JSON text already written, opaque here.
        if name.starts_with("$pyser::") {
            return Err(Found);
        }
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
        value: &T,
    ) -> Result<(), Found> {
        self.key(variant)?;
        value.serialize(self)
    }
    fn serialize_seq(self, _: Option<usize>) -> Result<Self, Found> {
        Ok(self)
    }
    fn serialize_tuple(self, _: usize) -> Result<Self, Found> {
        Ok(self)
    }
    fn serialize_tuple_struct(self, _: &'static str, _: usize) -> Result<Self, Found> {
        Ok(self)
    }
    fn serialize_tuple_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
        _: usize,
    ) -> Result<Self, Found> {
        self.key(variant)?;
        Ok(self)
    }
    fn serialize_map(self, _: Option<usize>) -> Result<Self, Found> {
        Ok(self)
    }
    fn serialize_struct(self, _: &'static str, _: usize) -> Result<Self, Found> {
        Ok(self)
    }
    fn serialize_struct_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
        _: usize,
    ) -> Result<Self, Found> {
        self.key(variant)?;
        Ok(self)
    }
}

impl SerializeSeq for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_element<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Found> {
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeTuple for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_element<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Found> {
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeTupleStruct for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_field<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Found> {
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeTupleVariant for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_field<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Found> {
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeMap for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_key<T: Serialize + ?Sized>(&mut self, key: &T) -> Result<(), Found> {
        // A key that is not a string (a number) is written as its text by JSON, which
        // can never be one a caller looks for; only string keys are tested.
        key.serialize(KeyText { probe: *self })
    }
    fn serialize_value<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Found> {
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeStruct for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_field<T: Serialize + ?Sized>(
        &mut self,
        key: &'static str,
        value: &T,
    ) -> Result<(), Found> {
        self.key(key)?;
        value.serialize(*self)
    }
    fn skip_field(&mut self, _: &'static str) -> Result<(), Found> {
        Ok(())
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

impl SerializeStructVariant for Probe<'_> {
    type Ok = ();
    type Error = Found;
    fn serialize_field<T: Serialize + ?Sized>(
        &mut self,
        key: &'static str,
        value: &T,
    ) -> Result<(), Found> {
        self.key(key)?;
        value.serialize(*self)
    }
    fn end(self) -> Result<(), Found> {
        Ok(())
    }
}

/// A map key: tested when it is a string; any other key type is never a match.
struct KeyText<'a> {
    probe: Probe<'a>,
}

impl Serializer for KeyText<'_> {
    type Ok = ();
    type Error = Found;
    type SerializeSeq = ser::Impossible<(), Found>;
    type SerializeTuple = ser::Impossible<(), Found>;
    type SerializeTupleStruct = ser::Impossible<(), Found>;
    type SerializeTupleVariant = ser::Impossible<(), Found>;
    type SerializeMap = ser::Impossible<(), Found>;
    type SerializeStruct = ser::Impossible<(), Found>;
    type SerializeStructVariant = ser::Impossible<(), Found>;

    scalars!(
        serialize_bool: bool, serialize_i8: i8, serialize_i16: i16, serialize_i32: i32,
        serialize_i64: i64, serialize_i128: i128, serialize_u8: u8, serialize_u16: u16,
        serialize_u32: u32, serialize_u64: u64, serialize_u128: u128, serialize_f32: f32,
        serialize_f64: f64, serialize_bytes: &[u8], serialize_unit_struct: &'static str,
    );

    fn serialize_char(self, c: char) -> Result<(), Found> {
        self.probe.key(c.encode_utf8(&mut [0; 4]))
    }
    fn serialize_str(self, key: &str) -> Result<(), Found> {
        self.probe.key(key)
    }
    fn serialize_none(self) -> Result<(), Found> {
        Ok(())
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<(), Found> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<(), Found> {
        Ok(())
    }
    fn serialize_unit_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
    ) -> Result<(), Found> {
        self.probe.key(variant)
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        _: &'static str,
        value: &T,
    ) -> Result<(), Found> {
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        _: &T,
    ) -> Result<(), Found> {
        Err(Found)
    }
    fn serialize_seq(self, _: Option<usize>) -> Result<Self::SerializeSeq, Found> {
        Err(Found)
    }
    fn serialize_tuple(self, _: usize) -> Result<Self::SerializeTuple, Found> {
        Err(Found)
    }
    fn serialize_tuple_struct(
        self,
        _: &'static str,
        _: usize,
    ) -> Result<Self::SerializeTupleStruct, Found> {
        Err(Found)
    }
    fn serialize_tuple_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        _: usize,
    ) -> Result<Self::SerializeTupleVariant, Found> {
        Err(Found)
    }
    fn serialize_map(self, _: Option<usize>) -> Result<Self::SerializeMap, Found> {
        Err(Found)
    }
    fn serialize_struct(self, _: &'static str, _: usize) -> Result<Self::SerializeStruct, Found> {
        Err(Found)
    }
    fn serialize_struct_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        _: usize,
    ) -> Result<Self::SerializeStructVariant, Found> {
        Err(Found)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde::Serialize;
    use serde_json::json;

    use super::any_key;

    #[derive(Serialize)]
    struct Inner {
        start_jd: f64,
    }

    #[derive(Serialize)]
    struct Outer {
        name: &'static str,
        rows: Vec<Inner>,
        extra: Option<BTreeMap<String, f64>>,
    }

    fn jd(key: &str) -> bool {
        key.ends_with("_jd")
    }

    #[test]
    fn finds_struct_fields_and_map_keys_at_any_depth() {
        let with = Outer {
            name: "x",
            rows: vec![Inner { start_jd: 1.0 }],
            extra: None,
        };
        assert!(any_key(&with, &jd));
        let empty = Outer {
            name: "x",
            rows: vec![],
            extra: Some(BTreeMap::from([("other".to_owned(), 1.0)])),
        };
        assert!(!any_key(&empty, &jd), "an empty list holds no keys");
        let in_map = Outer {
            name: "x",
            rows: vec![],
            extra: Some(BTreeMap::from([("end_jd".to_owned(), 1.0)])),
        };
        assert!(any_key(&in_map, &jd));
    }

    #[test]
    fn reads_json_trees_and_ignores_string_values() {
        assert!(any_key(&json!({"a": [{"b": {"x_jd": 2}}]}), &jd));
        assert!(!any_key(&json!({"a": ["x_jd", {"b": "y_jd"}]}), &jd));
    }

    #[test]
    fn raw_text_counts_as_a_match() {
        assert!(any_key(&crate::pyser::RawJson("{}".into()), &jd));
    }
}
