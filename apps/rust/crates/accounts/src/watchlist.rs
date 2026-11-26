//! A user's market watchlist: starred NEPSE scrips, currencies and metals, kept as one ordered
//! list (`share:NABIL`, `forex:USD`, `metal:gold`) so it follows the user to every device.

use crate::{AccountError, Accounts};

/// Longest list kept.
const MAX_ITEMS: usize = 300;

impl Accounts {
    /// The list in the order the user starred it; empty when they never saved one.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn get_watchlist(&self, owner: &str) -> Result<Vec<String>, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                "SELECT items FROM user_watchlists WHERE user_id = $1",
                &[&owner],
            )
            .await?;
        Ok(row
            .and_then(|r| serde_json::from_str::<Vec<String>>(&r.get::<_, String>(0)).ok())
            .unwrap_or_default())
    }

    /// Replaces the list after checking every entry.
    ///
    /// # Errors
    ///
    /// A malformed entry or too many (422), or the database failed.
    pub async fn set_watchlist(&self, owner: &str, items: &[String]) -> Result<(), AccountError> {
        validate(items)?;
        let json =
            serde_json::to_string(items).map_err(|e| AccountError::Unprocessable(e.to_string()))?;
        let c = self.client().await?;
        c.execute(
            "INSERT INTO user_watchlists (user_id, items, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (user_id) DO UPDATE SET items = $2, updated_at = now()",
            &[&owner, &json],
        )
        .await?;
        Ok(())
    }
}

/// `kind:id` with a known kind and a short alphanumeric id, at most [`MAX_ITEMS`] of them.
///
/// # Errors
///
/// The first entry that breaks the rule (422).
pub fn validate(items: &[String]) -> Result<(), AccountError> {
    if items.len() > MAX_ITEMS {
        return Err(AccountError::Unprocessable(format!(
            "at most {MAX_ITEMS} items"
        )));
    }
    for item in items {
        let ok = item.split_once(':').is_some_and(|(kind, id)| {
            matches!(kind, "share" | "forex" | "metal")
                && (1..=20).contains(&id.len())
                && id.bytes().all(|b| b.is_ascii_alphanumeric())
        });
        if !ok {
            return Err(AccountError::Unprocessable(format!(
                "bad watchlist item {item:?}"
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate;

    #[test]
    fn checks_items() {
        assert!(
            validate(&[
                "share:NABIL".into(),
                "forex:USD".into(),
                "metal:gold22".into()
            ])
            .is_ok(),
            "known kinds pass"
        );
        assert!(validate(&["stock:NABIL".into()]).is_err(), "unknown kind");
        assert!(validate(&["share:NA BIL".into()]).is_err(), "space in id");
        assert!(validate(&["share:".into()]).is_err(), "empty id");
    }
}
