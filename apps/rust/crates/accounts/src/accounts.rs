//! Account use cases (`services/identity/accounts.py` over `engine/identity/accounts.py`).
//!
//! An account is found by its email (stored lower-case) or, for Sign in with
//! Apple, by Apple's subject. A provider that verified the email may create
//! the account or claim an unverified one. A disabled account never gets a
//! session. Refresh tokens are used once (rotated) and all end on a password
//! reset; email links are single-use and expire.

use jiff::{SignedDuration, Timestamp};
use tokio_postgres::Row;

use crate::{
    AccountError, Accounts,
    credentials::{create_access_token, hash_password, hash_token, opaque_token, verify_password},
    db::{iso_z, new_id, now, sys, ts},
};

const VERIFY_TTL: SignedDuration = SignedDuration::from_hours(24);
const RESET_TTL: SignedDuration = SignedDuration::from_hours(1);

/// A row of `users`.
#[derive(Debug, Clone)]
pub struct User {
    /// UUID.
    pub id: String,
    /// Lower-case email.
    pub email: String,
    /// bcrypt hash.
    pub password_hash: String,
    /// Email verified.
    pub is_verified: bool,
    /// Not disabled.
    pub is_active: bool,
    /// Sign in with Apple subject.
    pub apple_user_id: Option<String>,
    /// When it was made.
    pub created_at: Timestamp,
}

impl User {
    const COLUMNS: &'static str =
        "id, email, password_hash, is_verified, is_active, apple_user_id, created_at";

    fn from_row(row: &Row) -> Self {
        Self {
            id: row.get(0),
            email: row.get(1),
            password_hash: row.get(2),
            is_verified: row.get(3),
            is_active: row.get(4),
            apple_user_id: row.get(5),
            created_at: ts(row.get(6)),
        }
    }

    /// `UserOut`: `{id, email, is_verified, created_at}`.
    #[must_use]
    pub fn out(&self) -> serde_json::Value {
        serde_json::json!({
            "id": self.id,
            "email": self.email,
            "is_verified": self.is_verified,
            "created_at": iso_z(self.created_at),
        })
    }
}

/// A fresh access + refresh pair (`TokenPair`).
#[derive(Debug, Clone)]
pub struct IssuedTokens {
    /// The JWT.
    pub access_token: String,
    /// The opaque refresh token.
    pub refresh_token: String,
    /// Seconds until the access token expires.
    pub expires_in: i64,
}

impl IssuedTokens {
    /// `TokenPair` JSON.
    #[must_use]
    pub fn out(&self) -> serde_json::Value {
        serde_json::json!({
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "token_type": "bearer",
            "expires_in": self.expires_in,
        })
    }
}

/// A link to mail: the recipient and the raw token.
#[derive(Debug, Clone)]
pub struct EmailLink {
    /// Recipient.
    pub to: String,
    /// The unhashed token.
    pub token: String,
}

struct Session {
    id: String,
    user_id: String,
    expires_at: Timestamp,
    revoked_at: Option<Timestamp>,
    replaced_by_id: Option<String>,
}

impl Session {
    const COLUMNS: &'static str = "id, user_id, expires_at, revoked_at, replaced_by_id";

    fn from_row(row: &Row) -> Self {
        Self {
            id: row.get(0),
            user_id: row.get(1),
            expires_at: ts(row.get(2)),
            revoked_at: row.get::<_, Option<std::time::SystemTime>>(3).map(ts),
            replaced_by_id: row.get(4),
        }
    }

    fn is_valid(&self, at: Timestamp) -> bool {
        self.revoked_at.is_none() && self.expires_at > at
    }
}

/// Whether a new account starts with its email verified.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Verified {
    Yes,
    No,
}

fn require_active(user: User) -> Result<User, AccountError> {
    if user.is_active {
        Ok(user)
    } else {
        Err(AccountError::AccountDisabled)
    }
}

/// `apple_account_email`: Apple's email, the client's, or a private address from the subject.
#[must_use]
pub fn apple_account_email(claim: Option<&str>, fallback: Option<&str>, subject: &str) -> String {
    let email = claim.filter(|e| !e.is_empty()).or(fallback);
    match email.map(str::trim) {
        Some(e) if !e.is_empty() => e.to_lowercase(),
        _ => format!("apple.{subject}@users.vedicpatro.com"),
    }
}

impl Accounts {
    async fn by_email(&self, email: &str) -> Result<Option<User>, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                &format!("SELECT {} FROM users WHERE email = $1", User::COLUMNS),
                &[&email],
            )
            .await?;
        Ok(row.as_ref().map(User::from_row))
    }

    /// The account with this id.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn user(&self, id: &str) -> Result<Option<User>, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                &format!("SELECT {} FROM users WHERE id = $1", User::COLUMNS),
                &[&id],
            )
            .await?;
        Ok(row.as_ref().map(User::from_row))
    }

    async fn add_account(
        &self,
        email: &str,
        password_hash: &str,
        verified: Verified,
        apple_user_id: Option<&str>,
    ) -> Result<User, AccountError> {
        let is_verified = verified == Verified::Yes;
        let c = self.client().await?;
        let row = c
            .query_one(
                &format!(
                    "INSERT INTO users (id, email, password_hash, is_verified, is_active, apple_user_id) \
                     VALUES ($1, $2, $3, $4, true, $5) RETURNING {}",
                    User::COLUMNS
                ),
                &[&new_id(), &email, &password_hash, &is_verified, &apple_user_id],
            )
            .await
            .map_err(|e| {
                if crate::is_unique_violation(&e) {
                    AccountError::EmailAlreadyRegistered
                } else {
                    e.into()
                }
            })?;
        Ok(User::from_row(&row))
    }

    async fn set_verified(
        &self,
        id: &str,
        apple_user_id: Option<&str>,
    ) -> Result<(), AccountError> {
        let c = self.client().await?;
        match apple_user_id {
            Some(subject) => {
                c.execute(
                    "UPDATE users SET is_verified = true, apple_user_id = $2 WHERE id = $1",
                    &[&id, &subject],
                )
                .await?
            }
            None => {
                c.execute("UPDATE users SET is_verified = true WHERE id = $1", &[&id])
                    .await?
            }
        };
        Ok(())
    }

    /// An access JWT and a persisted refresh token, linked from the one it replaces.
    async fn start_session(
        &self,
        user: &User,
        rotated_from: Option<&str>,
    ) -> Result<IssuedTokens, AccountError> {
        let raw = opaque_token();
        let at = now();
        let expires = at + SignedDuration::from_hours(24 * self.config.refresh_ttl_days);
        let id = new_id();
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        tx.execute(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
            &[&id, &user.id, &hash_token(&raw), &sys(expires)],
        )
        .await?;
        if let Some(old) = rotated_from {
            tx.execute(
                "UPDATE refresh_tokens SET replaced_by_id = $2 WHERE id = $1",
                &[&old, &id],
            )
            .await?;
        }
        tx.commit().await?;
        Ok(IssuedTokens {
            access_token: create_access_token(
                &self.config.jwt_secret,
                &user.id,
                &user.email,
                at.as_second(),
                self.config.access_ttl_minutes,
            ),
            refresh_token: raw,
            expires_in: self.config.access_ttl_minutes * 60,
        })
    }

    async fn new_link(
        &self,
        user: &User,
        kind: &str,
        ttl: SignedDuration,
    ) -> Result<EmailLink, AccountError> {
        let raw = opaque_token();
        let c = self.client().await?;
        c.execute(
            "INSERT INTO email_tokens (id, user_id, kind, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
            &[&new_id(), &user.id, &kind, &hash_token(&raw), &sys(now() + ttl)],
        )
        .await?;
        Ok(EmailLink {
            to: user.email.clone(),
            token: raw,
        })
    }

    /// A new account, signed in, with the verification link to mail.
    ///
    /// # Errors
    ///
    /// The email is taken, or the database failed.
    pub async fn sign_up(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(IssuedTokens, EmailLink), AccountError> {
        let email = email.to_lowercase();
        if self.by_email(&email).await?.is_some() {
            return Err(AccountError::EmailAlreadyRegistered);
        }
        let user = self
            .add_account(&email, &hash_password(password), Verified::No, None)
            .await?;
        let link = self.new_link(&user, "verify", VERIFY_TTL).await?;
        Ok((self.start_session(&user, None).await?, link))
    }

    /// Email and password sign-in.
    ///
    /// # Errors
    ///
    /// Unknown email or wrong password (401), a disabled account (403).
    pub async fn sign_in(&self, email: &str, password: &str) -> Result<IssuedTokens, AccountError> {
        let user = self.by_email(&email.to_lowercase()).await?;
        let Some(user) = user.filter(|u| verify_password(password, &u.password_hash)) else {
            return Err(AccountError::InvalidCredentials);
        };
        let user = require_active(user)?;
        self.start_session(&user, None).await
    }

    /// Google / Facebook: the provider vouched for the email.
    ///
    /// # Errors
    ///
    /// A disabled account, or the database failed.
    pub async fn sign_in_verified_email(&self, email: &str) -> Result<IssuedTokens, AccountError> {
        let email = email.to_lowercase();
        let user = match self.by_email(&email).await? {
            None => {
                self.add_account(&email, &hash_password(&opaque_token()), Verified::Yes, None)
                    .await?
            }
            Some(mut user) => {
                if !user.is_verified {
                    self.set_verified(&user.id, None).await?;
                    user.is_verified = true;
                }
                user
            }
        };
        let user = require_active(user)?;
        self.start_session(&user, None).await
    }

    /// Apple: the subject is the identity; the email links an existing account once.
    ///
    /// # Errors
    ///
    /// A disabled account, or the database failed.
    pub async fn sign_in_with_apple(
        &self,
        subject: &str,
        email: &str,
    ) -> Result<IssuedTokens, AccountError> {
        let c = self.client().await?;
        let by_subject = c
            .query_opt(
                &format!(
                    "SELECT {} FROM users WHERE apple_user_id = $1",
                    User::COLUMNS
                ),
                &[&subject],
            )
            .await?
            .as_ref()
            .map(User::from_row);
        drop(c);
        let user = match by_subject {
            None => match self.by_email(email).await? {
                None => {
                    self.add_account(
                        email,
                        &hash_password(&opaque_token()),
                        Verified::Yes,
                        Some(subject),
                    )
                    .await?
                }
                Some(mut user) => {
                    self.set_verified(&user.id, Some(subject)).await?;
                    user.is_verified = true;
                    user.apple_user_id = Some(subject.to_owned());
                    user
                }
            },
            Some(mut user) => {
                if !user.is_verified {
                    self.set_verified(&user.id, None).await?;
                    user.is_verified = true;
                }
                user
            }
        };
        let user = require_active(user)?;
        self.start_session(&user, None).await
    }

    async fn session_where(
        &self,
        column: &str,
        value: &str,
    ) -> Result<Option<Session>, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                &format!(
                    "SELECT {} FROM refresh_tokens WHERE {column} = $1",
                    Session::COLUMNS
                ),
                &[&value],
            )
            .await?;
        Ok(row.as_ref().map(Session::from_row))
    }

    async fn revoke(&self, session_id: &str) -> Result<(), AccountError> {
        let c = self.client().await?;
        c.execute(
            "UPDATE refresh_tokens SET revoked_at = $2 WHERE id = $1",
            &[&session_id, &sys(now())],
        )
        .await?;
        Ok(())
    }

    /// Rotates a refresh token: the used one is revoked and a new pair issued.
    ///
    /// A client that lost the reply to a rotation may present the old token
    /// again while its successor was never used; that successor is retired.
    ///
    /// # Errors
    ///
    /// An unknown, revoked or expired token, or a gone/disabled account (401).
    pub async fn refresh_session(&self, raw: &str) -> Result<IssuedTokens, AccountError> {
        let Some(stored) = self.session_where("token_hash", &hash_token(raw)).await? else {
            return Err(invalid_session());
        };
        let at = now();
        if stored.is_valid(at) {
            self.revoke(&stored.id).await?;
        } else {
            let successor = match (&stored.replaced_by_id, stored.expires_at > at) {
                (Some(next), true) => self.session_where("id", next).await?,
                _ => None,
            };
            match successor {
                Some(next) if next.is_valid(at) && next.replaced_by_id.is_none() => {
                    self.revoke(&next.id).await?;
                }
                _ => return Err(invalid_session()),
            }
        }
        let user = self.user(&stored.user_id).await?;
        let Some(user) = user.filter(|u| u.is_active) else {
            return Err(AccountError::InvalidSession("User not found".to_owned()));
        };
        self.start_session(&user, Some(&stored.id)).await
    }

    /// Revokes a live refresh token; an unknown one is not an error.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn sign_out(&self, raw: &str) -> Result<(), AccountError> {
        if let Some(stored) = self.session_where("token_hash", &hash_token(raw)).await?
            && stored.revoked_at.is_none()
        {
            self.revoke(&stored.id).await?;
        }
        Ok(())
    }

    /// Deletes the account and everything that belongs to it.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn delete_account(&self, user: &User) -> Result<(), AccountError> {
        let c = self.client().await?;
        c.execute("DELETE FROM users WHERE id = $1", &[&user.id])
            .await?;
        Ok(())
    }

    /// A usable email link of `kind` and its account.
    async fn redeem(&self, raw: &str, kind: &str) -> Result<(String, User), AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                "SELECT id, user_id, expires_at, used_at FROM email_tokens WHERE token_hash = $1 AND kind = $2",
                &[&hash_token(raw), &kind],
            )
            .await?;
        drop(c);
        let Some(row) = row else {
            return Err(invalid_link());
        };
        let used: Option<std::time::SystemTime> = row.get(3);
        if used.is_some() || ts(row.get(2)) <= now() {
            return Err(invalid_link());
        }
        let owner: String = row.get(1);
        let Some(account) = self.user(&owner).await? else {
            return Err(AccountError::InvalidLink("User not found".to_owned()));
        };
        Ok((row.get(0), account))
    }

    /// Marks the email verified.
    ///
    /// # Errors
    ///
    /// An unknown, used or expired link (400).
    pub async fn verify_email(&self, raw: &str) -> Result<(), AccountError> {
        let (link_id, user) = self.redeem(raw, "verify").await?;
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        tx.execute(
            "UPDATE users SET is_verified = true WHERE id = $1",
            &[&user.id],
        )
        .await?;
        tx.execute(
            "UPDATE email_tokens SET used_at = $2 WHERE id = $1",
            &[&link_id, &sys(now())],
        )
        .await?;
        tx.commit().await?;
        Ok(())
    }

    /// A fresh verification link, or `None` when already verified.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn resend_verification(
        &self,
        user: &User,
    ) -> Result<Option<EmailLink>, AccountError> {
        if user.is_verified {
            return Ok(None);
        }
        self.new_link(user, "verify", VERIFY_TTL).await.map(Some)
    }

    /// A reset link for an active account, `None` otherwise.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn request_password_reset(
        &self,
        email: &str,
    ) -> Result<Option<EmailLink>, AccountError> {
        match self.by_email(&email.to_lowercase()).await? {
            Some(user) if user.is_active => {
                self.new_link(&user, "reset", RESET_TTL).await.map(Some)
            }
            _ => Ok(None),
        }
    }

    /// Sets the new password and ends every session.
    ///
    /// # Errors
    ///
    /// An unknown, used or expired link (400).
    pub async fn reset_password(&self, raw: &str, password: &str) -> Result<(), AccountError> {
        let (link_id, user) = self.redeem(raw, "reset").await?;
        let hash = hash_password(password);
        let at = sys(now());
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        tx.execute(
            "UPDATE users SET password_hash = $2 WHERE id = $1",
            &[&user.id, &hash],
        )
        .await?;
        tx.execute(
            "UPDATE email_tokens SET used_at = $2 WHERE id = $1",
            &[&link_id, &at],
        )
        .await?;
        tx.execute(
            "UPDATE refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL",
            &[&user.id, &at],
        )
        .await?;
        tx.commit().await?;
        Ok(())
    }

    /// The signed-in user for a bearer token, as `get_current_user` decides.
    ///
    /// # Errors
    ///
    /// `Err(None)`: an invalid token (401 `Invalid or expired token`);
    /// `Err(Some(..))`: no such active user (401 `User not found`) or a database failure.
    pub async fn current_user(&self, token: &str) -> Result<User, Option<AccountError>> {
        let subject = crate::credentials::access_subject(
            &self.config.jwt_secret,
            token,
            Timestamp::now().as_second(),
        )
        .ok_or(None)?;
        match self.user(&subject).await {
            Ok(Some(user)) if user.is_active => Ok(user),
            Ok(_) => Err(Some(AccountError::InvalidSession(
                "User not found".to_owned(),
            ))),
            Err(e) => Err(Some(e)),
        }
    }

    /// The user id of a valid access token (no database read).
    #[must_use]
    pub fn token_subject(&self, token: &str) -> Option<String> {
        crate::credentials::access_subject(
            &self.config.jwt_secret,
            token,
            Timestamp::now().as_second(),
        )
    }
}

fn invalid_session() -> AccountError {
    AccountError::InvalidSession("Invalid or expired refresh token".to_owned())
}

fn invalid_link() -> AccountError {
    AccountError::InvalidLink("Invalid or expired link".to_owned())
}
