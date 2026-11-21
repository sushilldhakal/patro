//! Saved birth profiles (`services/identity/profiles.py` over `engine/identity/profiles.py`).
//!
//! While a user has any profiles, exactly one is the default: the first saved
//! becomes it, one saved or edited as the default takes it over, and deleting
//! the default hands it to the oldest left. Another user's profile does not
//! exist for you: a foreign id fails like an unknown one.

use serde_json::{Map, Value, json};
use tokio_postgres::{Row, types::ToSql};

use crate::{
    AccountError, Accounts,
    db::{iso_z, new_id, now, sys, ts},
};

/// Every stored field of `ProfileBase`, in the response's order.
pub const FIELDS: [&str; 15] = [
    "full_name",
    "phone",
    "email",
    "gender",
    "country",
    "city",
    "location_label",
    "latitude",
    "longitude",
    "timezone",
    "birth_date",
    "birth_time",
    "birth_era",
    "notes",
    "is_default",
];

const FLOAT_FIELDS: [&str; 2] = ["latitude", "longitude"];

/// A stored profile.
#[derive(Debug, Clone)]
pub struct Profile {
    /// UUID.
    pub id: String,
    /// Owner.
    pub user_id: String,
    /// `ProfileOut` JSON.
    pub out: Value,
    /// For the guidance route: the birth fields.
    pub birth: Birth,
}

/// What the natal chart needs from a profile.
#[derive(Debug, Clone, Default)]
pub struct Birth {
    /// `YYYY-MM-DD` in `birth_era`.
    pub date: Option<String>,
    /// `HH:MM`.
    pub time: Option<String>,
    /// `bs` / `ad`.
    pub era: Option<String>,
    /// Birth latitude.
    pub latitude: Option<f64>,
    /// Birth longitude.
    pub longitude: Option<f64>,
    /// Birth zone.
    pub timezone: Option<String>,
}

fn columns() -> String {
    format!("id, user_id, {}, created_at, updated_at", FIELDS.join(", "))
}

fn from_row(row: &Row) -> Profile {
    let mut out = Map::new();
    for (i, field) in FIELDS.iter().enumerate() {
        let idx = i + 2;
        let v = if FLOAT_FIELDS.contains(field) {
            row.get::<_, Option<f64>>(idx)
                .map_or(Value::Null, |f| json!(f))
        } else if *field == "is_default" {
            json!(row.get::<_, bool>(idx))
        } else {
            row.get::<_, Option<String>>(idx)
                .map_or(Value::Null, Value::String)
        };
        out.insert((*field).to_owned(), v);
    }
    let id: String = row.get(0);
    out.insert("id".to_owned(), json!(id));
    out.insert("created_at".to_owned(), json!(iso_z(ts(row.get(17)))));
    out.insert("updated_at".to_owned(), json!(iso_z(ts(row.get(18)))));
    let text = |name: &str| out.get(name).and_then(Value::as_str).map(str::to_owned);
    let birth = Birth {
        date: text("birth_date"),
        time: text("birth_time"),
        era: text("birth_era"),
        latitude: out.get("latitude").and_then(Value::as_f64),
        longitude: out.get("longitude").and_then(Value::as_f64),
        timezone: text("timezone"),
    };
    Profile {
        id,
        user_id: row.get(1),
        out: Value::Object(out),
        birth,
    }
}

/// A field value as a SQL parameter.
fn param(field: &str, v: &Value) -> Box<dyn ToSql + Sync + Send> {
    if FLOAT_FIELDS.contains(&field) {
        Box::new(v.as_f64())
    } else if field == "is_default" {
        Box::new(v.as_bool().unwrap_or(false))
    } else {
        Box::new(v.as_str().map(str::to_owned))
    }
}

impl Accounts {
    /// The owner's profiles: the default first, then oldest first.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn list_profiles(&self, owner: &str) -> Result<Vec<Profile>, AccountError> {
        let c = self.client().await?;
        let rows = c
            .query(
                &format!(
                    "SELECT {} FROM profiles WHERE user_id = $1 ORDER BY is_default DESC, created_at",
                    columns()
                ),
                &[&owner],
            )
            .await?;
        Ok(rows.iter().map(from_row).collect())
    }

    /// One of the owner's profiles.
    ///
    /// # Errors
    ///
    /// Not the owner's (404 `Profile not found`), or the database failed.
    pub async fn get_profile(&self, owner: &str, id: &str) -> Result<Profile, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                &format!("SELECT {} FROM profiles WHERE id = $1", columns()),
                &[&id],
            )
            .await?;
        row.as_ref()
            .map(from_row)
            .filter(|p| p.user_id == owner)
            .ok_or_else(AccountError::profile_not_found)
    }

    /// Saves a profile from a validated `ProfileCreate` body.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn create_profile(
        &self,
        owner: &str,
        body: &Map<String, Value>,
    ) -> Result<Profile, AccountError> {
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        let has_any = tx
            .query_opt(
                "SELECT id FROM profiles WHERE user_id = $1 LIMIT 1",
                &[&owner],
            )
            .await?
            .is_some();
        let requested = body
            .get("is_default")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let make_default = requested || !has_any;
        let id = new_id();
        let mut params: Vec<Box<dyn ToSql + Sync + Send>> =
            vec![Box::new(id.clone()), Box::new(owner.to_owned())];
        for field in FIELDS {
            if field == "is_default" {
                params.push(Box::new(make_default));
            } else {
                params.push(param(field, body.get(field).unwrap_or(&Value::Null)));
            }
        }
        let placeholders: Vec<String> = (1..=params.len()).map(|i| format!("${i}")).collect();
        let refs: Vec<&(dyn ToSql + Sync)> = params
            .iter()
            .map(|p| p.as_ref() as &(dyn ToSql + Sync))
            .collect();
        let row = tx
            .query_one(
                &format!(
                    "INSERT INTO profiles (id, user_id, {}) VALUES ({}) RETURNING {}",
                    FIELDS.join(", "),
                    placeholders.join(", "),
                    columns()
                ),
                &refs,
            )
            .await?;
        if make_default {
            clear_other_defaults(&tx, owner, &id).await?;
        }
        tx.commit().await?;
        Ok(from_row(&row))
    }

    /// Applies the fields present in a `ProfileUpdate` body.
    ///
    /// An explicit `null` for `full_name` or `is_default` (both NOT NULL) is
    /// ignored; Python writes it and answers 500 (`rust_divergences.py` #17).
    ///
    /// # Errors
    ///
    /// Not the owner's (404), or the database failed.
    pub async fn update_profile(
        &self,
        owner: &str,
        id: &str,
        changes: &Map<String, Value>,
    ) -> Result<Profile, AccountError> {
        self.get_profile(owner, id).await?;
        let mut sets = Vec::new();
        let mut params: Vec<Box<dyn ToSql + Sync + Send>> = vec![Box::new(id.to_owned())];
        for field in FIELDS {
            let Some(v) = changes.get(field) else {
                continue;
            };
            if v.is_null() && (field == "full_name" || field == "is_default") {
                continue;
            }
            params.push(param(field, v));
            sets.push(format!("{field} = ${}", params.len()));
        }
        params.push(Box::new(sys(now())));
        sets.push(format!("updated_at = ${}", params.len()));
        let refs: Vec<&(dyn ToSql + Sync)> = params
            .iter()
            .map(|p| p.as_ref() as &(dyn ToSql + Sync))
            .collect();
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        let row = tx
            .query_one(
                &format!(
                    "UPDATE profiles SET {} WHERE id = $1 RETURNING {}",
                    sets.join(", "),
                    columns()
                ),
                &refs,
            )
            .await?;
        if changes.get("is_default").and_then(Value::as_bool) == Some(true) {
            clear_other_defaults(&tx, owner, id).await?;
        }
        tx.commit().await?;
        Ok(from_row(&row))
    }

    /// Deletes a profile; the default passes to the oldest one left.
    ///
    /// # Errors
    ///
    /// Not the owner's (404), or the database failed.
    pub async fn delete_profile(&self, owner: &str, id: &str) -> Result<(), AccountError> {
        let profile = self.get_profile(owner, id).await?;
        let was_default = profile.out.get("is_default").and_then(Value::as_bool) == Some(true);
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        tx.execute("DELETE FROM profiles WHERE id = $1", &[&id])
            .await?;
        if was_default {
            tx.execute(
                "UPDATE profiles SET is_default = true, updated_at = $2 WHERE id = \
                 (SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at LIMIT 1)",
                &[&owner, &sys(now())],
            )
            .await?;
        }
        tx.commit().await?;
        Ok(())
    }
}

async fn clear_other_defaults(
    tx: &deadpool_postgres::Transaction<'_>,
    owner: &str,
    keep: &str,
) -> Result<(), AccountError> {
    tx.execute(
        "UPDATE profiles SET is_default = false, updated_at = $3 \
         WHERE user_id = $1 AND is_default IS true AND id != $2",
        &[&owner, &keep, &sys(now())],
    )
    .await?;
    Ok(())
}
