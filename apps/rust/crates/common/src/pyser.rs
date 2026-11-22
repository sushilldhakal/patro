//! Typed values to JSON text exactly as [`pyjson::dumps`](crate::pyjson::dumps) writes
//! the same value as a tree: Python's float `repr`, its string escaping, its separators.
//!
//! A response built from structs is written straight to text, without first building a
//! `serde_json::Value` tree (a hash-map insert and a key allocation per field) only to
//! walk it once and drop it. [`RawJson`] embeds text already written this way, so a
//! large response can be assembled from pieces written (and freed) one at a time.

use std::fmt::{self, Display, Write as _};

use serde::{
    Serialize, Serializer,
    ser::{
        self, SerializeMap, SerializeSeq, SerializeStruct, SerializeStructVariant, SerializeTuple,
        SerializeTupleStruct, SerializeTupleVariant,
    },
};

use crate::pyjson::{Style, float_repr, write_str};

/// The marker under which [`RawJson`] hands its text to [`to_string`].
const RAW_TOKEN: &str = "$pyser::RawJson";

/// JSON text already written by [`to_string`] in [`Style::Compact`], embedded as is.
///
/// Only this module's writer understands it: through any other serializer it comes out
/// as a string. Use it where the whole response is written here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawJson(pub String);

impl Serialize for RawJson {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_newtype_struct(RAW_TOKEN, self.0.as_str())
    }
}

/// Serialize like `json.dumps(value, ensure_ascii=False, separators=…)`.
#[must_use]
pub fn to_string<T: Serialize + ?Sized>(value: &T, style: Style) -> String {
    let mut out = String::with_capacity(4096);
    write(&mut out, value, style);
    out
}

/// Appends `value` to `out`, as [`to_string`] writes it.
pub fn write<T: Serialize + ?Sized>(out: &mut String, value: &T, style: Style) {
    let mut ser = Writer { out, style };
    // Strings, numbers, lists and string-keyed maps cannot fail; a map with a key that
    // is not a string or a number writes what it could, as no payload has one.
    let _ = value.serialize(&mut ser);
}

/// The only error: a map key that is not a string or a number.
#[derive(Debug)]
pub struct Error(String);

impl Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

impl ser::Error for Error {
    fn custom<M: Display>(msg: M) -> Self {
        Self(msg.to_string())
    }
}

struct Writer<'a> {
    out: &'a mut String,
    style: Style,
}

impl Writer<'_> {
    fn item_sep(&self) -> &'static str {
        match self.style {
            Style::Compact => ",",
            Style::Default => ", ",
        }
    }

    fn key_sep(&self) -> &'static str {
        match self.style {
            Style::Compact => ":",
            Style::Default => ": ",
        }
    }
}

/// A list or object being written: whether the next item needs a separator.
struct Compound<'w, 'a> {
    w: &'w mut Writer<'a>,
    first: bool,
    /// Closes an extra `{` opened for an enum variant.
    variant: bool,
}

impl Compound<'_, '_> {
    fn sep(&mut self) {
        if self.first {
            self.first = false;
        } else {
            let sep = self.w.item_sep();
            self.w.out.push_str(sep);
        }
    }

    fn key(&mut self, key: &str) {
        self.sep();
        write_str(self.w.out, key);
        let sep = self.w.key_sep();
        self.w.out.push_str(sep);
    }

    fn close(self, bracket: char) {
        self.w.out.push(bracket);
        if self.variant {
            self.w.out.push('}');
        }
    }
}

impl<'w, 'a> Serializer for &'w mut Writer<'a> {
    type Ok = ();
    type Error = Error;
    type SerializeSeq = Compound<'w, 'a>;
    type SerializeTuple = Compound<'w, 'a>;
    type SerializeTupleStruct = Compound<'w, 'a>;
    type SerializeTupleVariant = Compound<'w, 'a>;
    type SerializeMap = Compound<'w, 'a>;
    type SerializeStruct = Compound<'w, 'a>;
    type SerializeStructVariant = Compound<'w, 'a>;

    fn serialize_bool(self, v: bool) -> Result<(), Error> {
        self.out.push_str(if v { "true" } else { "false" });
        Ok(())
    }
    fn serialize_i8(self, v: i8) -> Result<(), Error> {
        self.serialize_i64(i64::from(v))
    }
    fn serialize_i16(self, v: i16) -> Result<(), Error> {
        self.serialize_i64(i64::from(v))
    }
    fn serialize_i32(self, v: i32) -> Result<(), Error> {
        self.serialize_i64(i64::from(v))
    }
    fn serialize_i64(self, v: i64) -> Result<(), Error> {
        let _ = write!(self.out, "{v}");
        Ok(())
    }
    fn serialize_u8(self, v: u8) -> Result<(), Error> {
        self.serialize_u64(u64::from(v))
    }
    fn serialize_u16(self, v: u16) -> Result<(), Error> {
        self.serialize_u64(u64::from(v))
    }
    fn serialize_u32(self, v: u32) -> Result<(), Error> {
        self.serialize_u64(u64::from(v))
    }
    fn serialize_u64(self, v: u64) -> Result<(), Error> {
        let _ = write!(self.out, "{v}");
        Ok(())
    }
    fn serialize_f32(self, v: f32) -> Result<(), Error> {
        self.serialize_f64(f64::from(v))
    }
    fn serialize_f64(self, v: f64) -> Result<(), Error> {
        self.out.push_str(&float_repr(v));
        Ok(())
    }
    fn serialize_char(self, v: char) -> Result<(), Error> {
        let mut buf = [0; 4];
        self.serialize_str(v.encode_utf8(&mut buf))
    }
    fn serialize_str(self, v: &str) -> Result<(), Error> {
        write_str(self.out, v);
        Ok(())
    }
    fn serialize_bytes(self, v: &[u8]) -> Result<(), Error> {
        let mut seq = self.serialize_seq(Some(v.len()))?;
        for b in v {
            SerializeSeq::serialize_element(&mut seq, b)?;
        }
        SerializeSeq::end(seq)
    }
    fn serialize_none(self) -> Result<(), Error> {
        self.serialize_unit()
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<(), Error> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<(), Error> {
        self.out.push_str("null");
        Ok(())
    }
    fn serialize_unit_struct(self, _name: &'static str) -> Result<(), Error> {
        self.serialize_unit()
    }
    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _index: u32,
        variant: &'static str,
    ) -> Result<(), Error> {
        self.serialize_str(variant)
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        name: &'static str,
        value: &T,
    ) -> Result<(), Error> {
        if name == RAW_TOKEN {
            return value.serialize(RawText { out: self.out });
        }
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        _index: u32,
        variant: &'static str,
        value: &T,
    ) -> Result<(), Error> {
        self.out.push('{');
        write_str(self.out, variant);
        let sep = self.key_sep();
        self.out.push_str(sep);
        value.serialize(&mut *self)?;
        self.out.push('}');
        Ok(())
    }
    fn serialize_seq(self, _len: Option<usize>) -> Result<Compound<'w, 'a>, Error> {
        self.out.push('[');
        Ok(Compound {
            w: self,
            first: true,
            variant: false,
        })
    }
    fn serialize_tuple(self, len: usize) -> Result<Compound<'w, 'a>, Error> {
        self.serialize_seq(Some(len))
    }
    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        len: usize,
    ) -> Result<Compound<'w, 'a>, Error> {
        self.serialize_seq(Some(len))
    }
    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _index: u32,
        variant: &'static str,
        _len: usize,
    ) -> Result<Compound<'w, 'a>, Error> {
        self.out.push('{');
        write_str(self.out, variant);
        let sep = self.key_sep();
        self.out.push_str(sep);
        self.out.push('[');
        Ok(Compound {
            w: self,
            first: true,
            variant: true,
        })
    }
    fn serialize_map(self, _len: Option<usize>) -> Result<Compound<'w, 'a>, Error> {
        self.out.push('{');
        Ok(Compound {
            w: self,
            first: true,
            variant: false,
        })
    }
    fn serialize_struct(self, _name: &'static str, len: usize) -> Result<Compound<'w, 'a>, Error> {
        self.serialize_map(Some(len))
    }
    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _index: u32,
        variant: &'static str,
        _len: usize,
    ) -> Result<Compound<'w, 'a>, Error> {
        self.out.push('{');
        write_str(self.out, variant);
        let sep = self.key_sep();
        self.out.push_str(sep);
        self.out.push('{');
        Ok(Compound {
            w: self,
            first: true,
            variant: true,
        })
    }
}

impl SerializeSeq for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_element<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Error> {
        self.sep();
        value.serialize(&mut *self.w)
    }
    fn end(self) -> Result<(), Error> {
        self.close(']');
        Ok(())
    }
}

impl SerializeTuple for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_element<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Error> {
        SerializeSeq::serialize_element(self, value)
    }
    fn end(self) -> Result<(), Error> {
        SerializeSeq::end(self)
    }
}

impl SerializeTupleStruct for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Error> {
        SerializeSeq::serialize_element(self, value)
    }
    fn end(self) -> Result<(), Error> {
        SerializeSeq::end(self)
    }
}

impl SerializeTupleVariant for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Error> {
        SerializeSeq::serialize_element(self, value)
    }
    fn end(self) -> Result<(), Error> {
        SerializeSeq::end(self)
    }
}

impl SerializeMap for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_key<T: Serialize + ?Sized>(&mut self, key: &T) -> Result<(), Error> {
        self.sep();
        key.serialize(KeyText { out: self.w.out })?;
        let sep = self.w.key_sep();
        self.w.out.push_str(sep);
        Ok(())
    }
    fn serialize_value<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), Error> {
        value.serialize(&mut *self.w)
    }
    fn end(self) -> Result<(), Error> {
        self.close('}');
        Ok(())
    }
}

impl SerializeStruct for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: Serialize + ?Sized>(
        &mut self,
        key: &'static str,
        value: &T,
    ) -> Result<(), Error> {
        self.key(key);
        value.serialize(&mut *self.w)
    }
    fn end(self) -> Result<(), Error> {
        self.close('}');
        Ok(())
    }
}

impl SerializeStructVariant for Compound<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: Serialize + ?Sized>(
        &mut self,
        key: &'static str,
        value: &T,
    ) -> Result<(), Error> {
        SerializeStruct::serialize_field(self, key, value)
    }
    fn end(self) -> Result<(), Error> {
        SerializeStruct::end(self)
    }
}

/// Writes a map key: a string as is, a number or bool as its text (as `json.dumps`
/// turns `{1: …}` into `{"1": …}`).
struct KeyText<'a> {
    out: &'a mut String,
}

fn key_error() -> Error {
    Error("map keys must be strings or numbers".into())
}

macro_rules! key_number {
    ($($name:ident: $t:ty),*) => {
        $(fn $name(self, v: $t) -> Result<(), Error> {
            write_str(self.out, &v.to_string());
            Ok(())
        })*
    };
}

impl Serializer for KeyText<'_> {
    type Ok = ();
    type Error = Error;
    type SerializeSeq = ser::Impossible<(), Error>;
    type SerializeTuple = ser::Impossible<(), Error>;
    type SerializeTupleStruct = ser::Impossible<(), Error>;
    type SerializeTupleVariant = ser::Impossible<(), Error>;
    type SerializeMap = ser::Impossible<(), Error>;
    type SerializeStruct = ser::Impossible<(), Error>;
    type SerializeStructVariant = ser::Impossible<(), Error>;

    key_number!(serialize_i8: i8, serialize_i16: i16, serialize_i32: i32, serialize_i64: i64,
        serialize_u8: u8, serialize_u16: u16, serialize_u32: u32, serialize_u64: u64);

    fn serialize_bool(self, v: bool) -> Result<(), Error> {
        write_str(self.out, if v { "true" } else { "false" });
        Ok(())
    }
    fn serialize_f32(self, v: f32) -> Result<(), Error> {
        self.serialize_f64(f64::from(v))
    }
    fn serialize_f64(self, v: f64) -> Result<(), Error> {
        write_str(self.out, &float_repr(v));
        Ok(())
    }
    fn serialize_char(self, v: char) -> Result<(), Error> {
        let mut buf = [0; 4];
        self.serialize_str(v.encode_utf8(&mut buf))
    }
    fn serialize_str(self, v: &str) -> Result<(), Error> {
        write_str(self.out, v);
        Ok(())
    }
    fn serialize_bytes(self, _v: &[u8]) -> Result<(), Error> {
        Err(key_error())
    }
    fn serialize_none(self) -> Result<(), Error> {
        Err(key_error())
    }
    fn serialize_some<T: Serialize + ?Sized>(self, value: &T) -> Result<(), Error> {
        value.serialize(self)
    }
    fn serialize_unit(self) -> Result<(), Error> {
        Err(key_error())
    }
    fn serialize_unit_struct(self, _name: &'static str) -> Result<(), Error> {
        Err(key_error())
    }
    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _index: u32,
        variant: &'static str,
    ) -> Result<(), Error> {
        self.serialize_str(variant)
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        value: &T,
    ) -> Result<(), Error> {
        value.serialize(self)
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _value: &T,
    ) -> Result<(), Error> {
        Err(key_error())
    }
    fn serialize_seq(self, _len: Option<usize>) -> Result<Self::SerializeSeq, Error> {
        Err(key_error())
    }
    fn serialize_tuple(self, _len: usize) -> Result<Self::SerializeTuple, Error> {
        Err(key_error())
    }
    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleStruct, Error> {
        Err(key_error())
    }
    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleVariant, Error> {
        Err(key_error())
    }
    fn serialize_map(self, _len: Option<usize>) -> Result<Self::SerializeMap, Error> {
        Err(key_error())
    }
    fn serialize_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStruct, Error> {
        Err(key_error())
    }
    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStructVariant, Error> {
        Err(key_error())
    }
}

/// Writes the text of a [`RawJson`] unquoted.
struct RawText<'a> {
    out: &'a mut String,
}

impl Serializer for RawText<'_> {
    type Ok = ();
    type Error = Error;
    type SerializeSeq = ser::Impossible<(), Error>;
    type SerializeTuple = ser::Impossible<(), Error>;
    type SerializeTupleStruct = ser::Impossible<(), Error>;
    type SerializeTupleVariant = ser::Impossible<(), Error>;
    type SerializeMap = ser::Impossible<(), Error>;
    type SerializeStruct = ser::Impossible<(), Error>;
    type SerializeStructVariant = ser::Impossible<(), Error>;

    fn serialize_str(self, v: &str) -> Result<(), Error> {
        self.out.push_str(v);
        Ok(())
    }

    fn serialize_bool(self, _v: bool) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_i8(self, _v: i8) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_i16(self, _v: i16) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_i32(self, _v: i32) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_i64(self, _v: i64) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_u8(self, _v: u8) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_u16(self, _v: u16) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_u32(self, _v: u32) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_u64(self, _v: u64) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_f32(self, _v: f32) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_f64(self, _v: f64) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_char(self, _v: char) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_bytes(self, _v: &[u8]) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_none(self) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_some<T: Serialize + ?Sized>(self, _value: &T) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_unit(self) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_unit_struct(self, _name: &'static str) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
    ) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_newtype_struct<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        _value: &T,
    ) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_newtype_variant<T: Serialize + ?Sized>(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _value: &T,
    ) -> Result<(), Error> {
        Err(raw_error())
    }
    fn serialize_seq(self, _len: Option<usize>) -> Result<Self::SerializeSeq, Error> {
        Err(raw_error())
    }
    fn serialize_tuple(self, _len: usize) -> Result<Self::SerializeTuple, Error> {
        Err(raw_error())
    }
    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleStruct, Error> {
        Err(raw_error())
    }
    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleVariant, Error> {
        Err(raw_error())
    }
    fn serialize_map(self, _len: Option<usize>) -> Result<Self::SerializeMap, Error> {
        Err(raw_error())
    }
    fn serialize_struct(
        self,
        _name: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStruct, Error> {
        Err(raw_error())
    }
    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStructVariant, Error> {
        Err(raw_error())
    }
}

fn raw_error() -> Error {
    Error("RawJson holds text only".into())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::pyjson::dumps;

    #[derive(Serialize)]
    struct Row {
        name: &'static str,
        degree: f64,
        count: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        missing: Option<bool>,
        nested: Vec<serde_json::Value>,
    }

    #[test]
    fn writes_what_the_tree_writer_writes() {
        let v = json!({"a": [1, 2.0, "नेपाल", -0.0, 1e-5, 1.5e16], "b": null, "c": "q\"\\\n\u{1}",
            "d": {"x": true, "y": 2_461_345.5}, "e": []});
        for style in [Style::Compact, Style::Default] {
            assert_eq!(to_string(&v, style), dumps(&v, style), "{style:?}");
        }
    }

    #[test]
    fn a_struct_writes_as_its_tree_would() {
        let row = Row {
            name: "Ashwini",
            degree: 13.333_333_333_333_334,
            count: 3,
            missing: None,
            nested: vec![json!({"k": 5.0})],
        };
        let tree = serde_json::to_value(&row).expect("tree");
        for style in [Style::Compact, Style::Default] {
            assert_eq!(to_string(&row, style), dumps(&tree, style), "{style:?}");
        }
    }

    #[test]
    fn raw_text_is_embedded_as_is() {
        let parts = (RawJson(r#"{"a":1}"#.into()), 2);
        assert_eq!(to_string(&parts, Style::Compact), r#"[{"a":1},2]"#);
    }
}
