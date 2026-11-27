//! A user's saved places (the app's place picker and weather pages): `{places: [...], primaryId}`,
//! kept whole as the app wrote it so the list follows the user to every device.

use serde_json::Value;

use crate::{AccountError, Accounts};

/// Most places kept.
const MAX_PLACES: usize = 50;
/// Longest id or label.
const MAX_TEXT: usize = 160;

impl Accounts {
    /// The saved list, or `None` when the user never saved one.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn get_places(&self, owner: &str) -> Result<Option<Value>, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt("SELECT data FROM user_places WHERE user_id = $1", &[&owner])
            .await?;
        Ok(row.and_then(|r| serde_json::from_str(&r.get::<_, String>(0)).ok()))
    }

    /// Replaces the list after checking its shape.
    ///
    /// # Errors
    ///
    /// A malformed list (422), or the database failed.
    pub async fn set_places(&self, owner: &str, data: &Value) -> Result<(), AccountError> {
        validate(data)?;
        let json = data.to_string();
        let c = self.client().await?;
        c.execute(
            "INSERT INTO user_places (user_id, data, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()",
            &[&owner, &json],
        )
        .await?;
        Ok(())
    }
}

fn short_text(v: &Value) -> bool {
    v.as_str().is_some_and(|s| s.chars().count() <= MAX_TEXT)
}

/// `{places: [{id, label, params: {...}}], primaryId}`, at most [`MAX_PLACES`], short strings,
/// and `params` holding only numbers, short strings or nulls.
///
/// # Errors
///
/// The first part that breaks the rule (422).
pub fn validate(data: &Value) -> Result<(), AccountError> {
    let bad = |why: &str| Err(AccountError::Unprocessable(format!("bad places: {why}")));
    let Some(places) = data.get("places").and_then(Value::as_array) else {
        return bad("places must be a list");
    };
    if places.len() > MAX_PLACES {
        return bad("too many places");
    }
    if !data.get("primaryId").is_some_and(short_text) {
        return bad("primaryId");
    }
    for p in places {
        if !p.get("id").is_some_and(short_text) || !p.get("label").is_some_and(short_text) {
            return bad("id or label");
        }
        let Some(params) = p.get("params").and_then(Value::as_object) else {
            return bad("params");
        };
        let ok = params.len() <= 12
            && params
                .iter()
                .all(|(k, v)| k.len() <= 32 && (v.is_null() || v.is_number() || short_text(v)));
        if !ok {
            return bad("params");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate;
    use serde_json::json;

    #[test]
    fn checks_places() {
        let good = json!({
            "places": [{ "id": "city:1283240", "label": "Kathmandu", "params": { "city_id": 1_283_240, "lat": 27.7, "lon": 85.3, "timezone": "Asia/Kathmandu" } }],
            "primaryId": "here"
        });
        assert!(validate(&good).is_ok(), "a city passes");
        assert!(
            validate(&json!({ "places": [], "primaryId": "here" })).is_ok(),
            "empty list"
        );
        assert!(validate(&json!({ "places": [] })).is_err(), "no primary");
        assert!(
            validate(&json!({ "places": [{ "id": "x", "label": "y", "params": { "a": { "deep": 1 } } }], "primaryId": "here" })).is_err(),
            "nested params"
        );
        let many: Vec<_> = (0..51)
            .map(|i| json!({ "id": i.to_string(), "label": "p", "params": {} }))
            .collect();
        assert!(
            validate(&json!({ "places": many, "primaryId": "here" })).is_err(),
            "too many"
        );
    }
}
