//! Password hashes, opaque tokens and JWT access tokens
//! (`services/identity/credentials.py`).

use base64::Engine as _;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// bcrypt's input limit. Python's bcrypt 5 raises past it (a 500 on sign-up);
/// the port hashes the first 72 bytes as bcrypt 4 did (`rust_divergences.py` #16).
const BCRYPT_MAX: usize = 72;

fn bcrypt_input(password: &str) -> &[u8] {
    let b = password.as_bytes();
    &b[..b.len().min(BCRYPT_MAX)]
}

/// `bcrypt.hashpw(password, bcrypt.gensalt())`: cost 12, `$2b$`.
///
/// # Panics
///
/// Never in practice: bcrypt fails only on a cost outside 4..=31.
#[must_use]
pub fn hash_password(password: &str) -> String {
    bcrypt::hash(bcrypt_input(password), 12).expect("cost 12 is valid")
}

/// `bcrypt.checkpw`; a malformed hash is a mismatch.
#[must_use]
pub fn verify_password(password: &str, hash: &str) -> bool {
    bcrypt::verify(bcrypt_input(password), hash).unwrap_or(false)
}

/// `secrets.token_urlsafe(32)`: 32 random bytes, URL-safe base64 without padding.
///
/// # Panics
///
/// When the OS random source fails.
#[must_use]
pub fn opaque_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("the OS random source is available");
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// SHA-256 hex of a token, as stored at rest.
#[must_use]
pub fn hash_token(token: &str) -> String {
    use std::fmt::Write as _;
    let digest = Sha256::digest(token.as_bytes());
    digest.iter().fold(String::with_capacity(64), |mut out, b| {
        let _ = write!(out, "{b:02x}");
        out
    })
}

/// The access token's claims, in `PyJWT`'s key order.
#[derive(Debug, Serialize, Deserialize)]
pub struct AccessClaims {
    /// The user id.
    pub sub: String,
    /// The account email.
    pub email: String,
    /// Always `"access"`.
    #[serde(rename = "type")]
    pub kind: String,
    /// Issued at (Unix seconds).
    pub iat: i64,
    /// Expires at (Unix seconds).
    pub exp: i64,
}

/// An HS256 access token for `user_id` / `email`, valid `ttl_minutes`.
///
/// # Panics
///
/// Never: HS256 encoding of plain claims cannot fail.
#[must_use]
pub fn create_access_token(
    secret: &str,
    user_id: &str,
    email: &str,
    now: i64,
    ttl_minutes: i64,
) -> String {
    let claims = AccessClaims {
        sub: user_id.to_owned(),
        email: email.to_owned(),
        kind: "access".to_owned(),
        iat: now,
        exp: now + ttl_minutes * 60,
    };
    jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("HS256 encoding cannot fail")
}

/// The user id of a valid access token at Unix second `now`, as
/// `get_current_user` reads it with `PyJWT`: the signature, `exp` (expired when
/// `exp <= now`), `iat` not in the future, `type == "access"` and a `sub`.
#[must_use]
pub fn access_subject(secret: &str, token: &str, now: i64) -> Option<String> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.leeway = 0;
    validation.validate_exp = false;
    validation.required_spec_claims.clear();
    validation.validate_aud = false;
    let data = jsonwebtoken::decode::<serde_json::Value>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .ok()?;
    let claims = data.claims;
    if let Some(exp) = claims.get("exp")
        && exp.as_i64().is_none_or(|exp| exp <= now)
    {
        return None;
    }
    if let Some(iat) = claims.get("iat")
        && iat.as_i64().is_none_or(|iat| iat > now)
    {
        return None;
    }
    if claims.get("type").and_then(serde_json::Value::as_str) != Some("access") {
        return None;
    }
    match claims.get("sub")? {
        serde_json::Value::String(s) => Some(s.clone()),
        other => Some(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_round_trip() {
        let token = create_access_token("s3cret", "u1", "a@b.com", 2_000_000_000, 30);
        let now = 2_000_000_100;
        assert_eq!(access_subject("s3cret", &token, now).as_deref(), Some("u1"));
        assert_eq!(access_subject("other", &token, now), None);
        assert_eq!(access_subject("s3cret", &token, 2_000_001_800), None);
        assert_eq!(access_subject("s3cret", &token, 1_999_999_999), None);
        assert_eq!(opaque_token().len(), 43);
        assert_eq!(
            hash_token("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn python_hashes_verify() {
        // bcrypt.hashpw(b"password123", bcrypt.gensalt(4))
        let h = bcrypt::hash("password123", 4).expect("hash");
        assert!(verify_password("password123", &h));
        assert!(!verify_password("password124", &h));
        assert!(!verify_password("x", "not-a-hash"));
    }
}
