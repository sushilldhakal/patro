//! Devices and reminder rules (`services/identity/reminders.py` over
//! `engine/identity/reminders.py`). A reminder is a rule ("10 min before Rahu
//! Kaal on Mondays"); weekdays are 0 (Sunday) to 6, sorted, once each. A device
//! is known by its push token: registering it again moves it to the caller.

use serde_json::{Map, Value, json};
use tokio_postgres::Row;

use crate::{
    AccountError, Accounts,
    db::{new_id, now, sys},
};

fn reminder_not_found() -> AccountError {
    AccountError::NotFound("Reminder not found".to_owned())
}

/// `encode_weekdays`: `[3, 1, 3]` → `"1,3"`.
///
/// # Errors
///
/// A day outside 0..=6 (422 `weekdays must be 0 (Sunday) to 6`).
pub fn encode_weekdays(days: &[i64]) -> Result<String, AccountError> {
    if days.iter().any(|d| !(0..=6).contains(d)) {
        return Err(AccountError::Unprocessable(
            "weekdays must be 0 (Sunday) to 6".to_owned(),
        ));
    }
    let mut sorted = days.to_vec();
    sorted.sort_unstable();
    sorted.dedup();
    Ok(sorted
        .iter()
        .map(i64::to_string)
        .collect::<Vec<_>>()
        .join(","))
}

/// `decode_weekdays`.
#[must_use]
pub fn decode_weekdays(stored: &str) -> Vec<i64> {
    stored
        .split(',')
        .filter(|d| !d.is_empty())
        .filter_map(|d| d.parse().ok())
        .collect()
}

const REMINDER_COLUMNS: &str =
    "id, profile_id, window_kind, window_key, lead_minutes, weekdays, label, enabled, user_id";

/// `ReminderOut` JSON from a row.
fn reminder_out(row: &Row) -> (String, Value) {
    let weekdays: String = row.get(5);
    let lead: i32 = row.get(4);
    (
        row.get(8),
        json!({
            "id": row.get::<_, String>(0),
            "profile_id": row.get::<_, Option<String>>(1),
            "window_kind": row.get::<_, String>(2),
            "window_key": row.get::<_, String>(3),
            "lead_minutes": lead,
            "weekdays": decode_weekdays(&weekdays),
            "label": row.get::<_, Option<String>>(6),
            "enabled": row.get::<_, bool>(7),
        }),
    )
}

fn str_field(body: &Map<String, Value>, key: &str) -> Option<String> {
    body.get(key).and_then(Value::as_str).map(str::to_owned)
}

fn weekdays_of(body: &Map<String, Value>) -> Vec<i64> {
    body.get("weekdays")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(Value::as_i64).collect())
        .unwrap_or_default()
}

impl Accounts {
    /// Registers (or moves) a device from a validated `DeviceIn`; `DeviceOut` JSON.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn register_device(
        &self,
        owner: &str,
        body: &Map<String, Value>,
    ) -> Result<Value, AccountError> {
        let token = str_field(body, "push_token").unwrap_or_default();
        let platform = str_field(body, "platform").unwrap_or_default();
        let zone = str_field(body, "timezone");
        let locale = str_field(body, "locale");
        let c = self.client().await?;
        let row = c
            .query_one(
                "INSERT INTO devices (id, user_id, push_token, platform, timezone, locale) \
                 VALUES ($1, $2, $3, $4, $5, $6) \
                 ON CONFLICT (push_token) DO UPDATE SET user_id = EXCLUDED.user_id, \
                 platform = EXCLUDED.platform, timezone = EXCLUDED.timezone, \
                 locale = EXCLUDED.locale, updated_at = $7 \
                 RETURNING push_token, platform, timezone, locale, id",
                &[
                    &new_id(),
                    &owner,
                    &token,
                    &platform,
                    &zone,
                    &locale,
                    &sys(now()),
                ],
            )
            .await?;
        Ok(json!({
            "push_token": row.get::<_, String>(0),
            "platform": row.get::<_, String>(1),
            "timezone": row.get::<_, Option<String>>(2),
            "locale": row.get::<_, Option<String>>(3),
            "id": row.get::<_, String>(4),
        }))
    }

    /// Removes one of the owner's devices.
    ///
    /// # Errors
    ///
    /// Not the owner's (404 `Device not found`), or the database failed.
    pub async fn unregister_device(&self, owner: &str, id: &str) -> Result<(), AccountError> {
        let c = self.client().await?;
        let n = c
            .execute(
                "DELETE FROM devices WHERE id = $1 AND user_id = $2",
                &[&id, &owner],
            )
            .await?;
        if n == 0 {
            return Err(AccountError::NotFound("Device not found".to_owned()));
        }
        Ok(())
    }

    /// The owner's reminder rules, oldest first.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn list_reminders(&self, owner: &str) -> Result<Vec<Value>, AccountError> {
        let c = self.client().await?;
        let rows = c
            .query(
                &format!("SELECT {REMINDER_COLUMNS} FROM reminders WHERE user_id = $1 ORDER BY created_at"),
                &[&owner],
            )
            .await?;
        Ok(rows.iter().map(|r| reminder_out(r).1).collect())
    }

    async fn check_profile(
        &self,
        owner: &str,
        body: &Map<String, Value>,
    ) -> Result<(), AccountError> {
        if let Some(id) = str_field(body, "profile_id") {
            self.get_profile(owner, &id).await?;
        }
        Ok(())
    }

    /// Saves a rule from a validated `ReminderIn`.
    ///
    /// # Errors
    ///
    /// A foreign profile (404), bad weekdays (422), or the database failed.
    pub async fn create_reminder(
        &self,
        owner: &str,
        body: &Map<String, Value>,
    ) -> Result<Value, AccountError> {
        self.check_profile(owner, body).await?;
        let weekdays = encode_weekdays(&weekdays_of(body))?;
        let c = self.client().await?;
        let row = c
            .query_one(
                &format!(
                    "INSERT INTO reminders (id, user_id, profile_id, window_kind, window_key, lead_minutes, weekdays, label, enabled) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING {REMINDER_COLUMNS}"
                ),
                &[
                    &new_id(),
                    &owner,
                    &str_field(body, "profile_id"),
                    &str_field(body, "window_kind"),
                    &str_field(body, "window_key"),
                    &lead(body),
                    &weekdays,
                    &str_field(body, "label"),
                    &body.get("enabled").and_then(Value::as_bool).unwrap_or(true),
                ],
            )
            .await?;
        Ok(reminder_out(&row).1)
    }

    /// Replaces a rule from a validated `ReminderIn`.
    ///
    /// # Errors
    ///
    /// Not the owner's (404), a foreign profile (404), bad weekdays (422).
    pub async fn update_reminder(
        &self,
        owner: &str,
        id: &str,
        body: &Map<String, Value>,
    ) -> Result<Value, AccountError> {
        self.owned_reminder(owner, id).await?;
        self.check_profile(owner, body).await?;
        let weekdays = encode_weekdays(&weekdays_of(body))?;
        let c = self.client().await?;
        let row = c
            .query_one(
                &format!(
                    "UPDATE reminders SET profile_id = $2, window_kind = $3, window_key = $4, lead_minutes = $5, \
                     label = $6, enabled = $7, weekdays = $8, updated_at = $9 WHERE id = $1 RETURNING {REMINDER_COLUMNS}"
                ),
                &[
                    &id,
                    &str_field(body, "profile_id"),
                    &str_field(body, "window_kind"),
                    &str_field(body, "window_key"),
                    &lead(body),
                    &str_field(body, "label"),
                    &body.get("enabled").and_then(Value::as_bool).unwrap_or(true),
                    &weekdays,
                    &sys(now()),
                ],
            )
            .await?;
        Ok(reminder_out(&row).1)
    }

    async fn owned_reminder(&self, owner: &str, id: &str) -> Result<(), AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt("SELECT user_id FROM reminders WHERE id = $1", &[&id])
            .await?;
        match row {
            Some(r) if r.get::<_, String>(0) == owner => Ok(()),
            _ => Err(reminder_not_found()),
        }
    }

    /// Deletes one of the owner's rules.
    ///
    /// # Errors
    ///
    /// Not the owner's (404 `Reminder not found`), or the database failed.
    pub async fn delete_reminder(&self, owner: &str, id: &str) -> Result<(), AccountError> {
        self.owned_reminder(owner, id).await?;
        let c = self.client().await?;
        c.execute("DELETE FROM reminders WHERE id = $1", &[&id])
            .await?;
        Ok(())
    }
}

fn lead(body: &Map<String, Value>) -> i32 {
    body.get("lead_minutes")
        .and_then(Value::as_i64)
        .and_then(|v| i32::try_from(v).ok())
        .unwrap_or(10)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn weekdays_round_trip() {
        assert_eq!(encode_weekdays(&[3, 1, 3]).as_deref(), Ok("1,3"));
        assert_eq!(encode_weekdays(&[]).as_deref(), Ok(""));
        assert!(encode_weekdays(&[7]).is_err());
        assert_eq!(decode_weekdays("1,3"), vec![1, 3]);
        assert_eq!(
            decode_weekdays(""),
            Vec::<i64>::new(),
            "empty means every day"
        );
    }
}
