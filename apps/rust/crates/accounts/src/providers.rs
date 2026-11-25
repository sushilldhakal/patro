//! Sign-in providers: Google and Apple ID tokens (RS256 against the provider's
//! published keys) and Facebook access tokens (the Graph API's `debug_token` and `me`),
//! as `services/identity/{google,apple,facebook}_auth.py` check them.

use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

use jsonwebtoken::{Algorithm, DecodingKey, Validation, jwk::JwkSet};
use serde_json::Value;

use crate::{AccountError, Accounts};

const GOOGLE_CERTS_URL: &str = "https://www.googleapis.com/oauth2/v3/certs";
const APPLE_KEYS_URL: &str = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER: &str = "https://appleid.apple.com";
const GRAPH: &str = "https://graph.facebook.com/v25.0";
/// `PyJWKClient`'s default key-set lifespan.
const JWKS_LIFESPAN: Duration = Duration::from_secs(300);
/// A token naming an unknown key refetches the key set at most this often, so made-up tokens
/// cannot turn into one Google or Apple download each.
const JWKS_MIN_REFRESH: Duration = Duration::from_secs(60);

/// Whether a key set may come from the cache.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Fetch {
    Cached,
    Fresh,
}

/// The HTTP client and the cached key sets.
#[derive(Debug)]
pub struct Providers {
    http: reqwest::Client,
    keys: Mutex<HashMap<&'static str, (Instant, JwkSet)>>,
}

impl Default for Providers {
    fn default() -> Self {
        Self::new()
    }
}

fn provider(message: &str) -> AccountError {
    AccountError::Provider {
        message: message.to_owned(),
        not_configured: message.contains("not configured"),
    }
}

impl Providers {
    /// A client with Python's 10-second Graph timeout.
    #[must_use]
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
            keys: Mutex::new(HashMap::new()),
        }
    }

    async fn key_set(&self, url: &'static str, fetch: Fetch) -> Option<JwkSet> {
        let fresh_for = match fetch {
            Fetch::Cached => JWKS_LIFESPAN,
            Fetch::Fresh => JWKS_MIN_REFRESH,
        };
        if let Some((at, set)) = self.keys.lock().ok()?.get(url)
            && at.elapsed() < fresh_for
        {
            return Some(set.clone());
        }
        let set: JwkSet = self.http.get(url).send().await.ok()?.json().await.ok()?;
        self.keys
            .lock()
            .ok()?
            .insert(url, (Instant::now(), set.clone()));
        Some(set)
    }

    /// The token's claims after the signature, audience, expiry (and issuer) checks.
    async fn verify_rs256(
        &self,
        url: &'static str,
        token: &str,
        audiences: &[String],
        issuer: Option<&str>,
    ) -> Option<serde_json::Map<String, Value>> {
        let kid = jsonwebtoken::decode_header(token).ok()?.kid?;
        let mut set = self.key_set(url, Fetch::Cached).await?;
        if set.find(&kid).is_none() {
            set = self.key_set(url, Fetch::Fresh).await?;
        }
        let key = DecodingKey::from_jwk(set.find(&kid)?).ok()?;
        let mut v = Validation::new(Algorithm::RS256);
        v.leeway = 0;
        v.set_audience(audiences);
        if let Some(iss) = issuer {
            v.set_issuer(&[iss]);
        }
        jsonwebtoken::decode::<serde_json::Map<String, Value>>(token, &key, &v)
            .ok()
            .map(|d| d.claims)
    }
}

impl Accounts {
    /// `verify_google_id_token`: the verified email.
    ///
    /// # Errors
    ///
    /// Not configured (503) or an untrusted token (401).
    pub async fn verify_google(&self, token: &str) -> Result<String, AccountError> {
        let audiences = &self.config.google_client_ids;
        if audiences.is_empty() {
            return Err(provider("Google sign-in is not configured"));
        }
        let Some(claims) = self
            .providers
            .verify_rs256(GOOGLE_CERTS_URL, token, audiences, None)
            .await
        else {
            tracing::warn!("Google ID token verification failed");
            return Err(provider("Invalid or expired Google token"));
        };
        let iss = claims.get("iss").and_then(Value::as_str);
        if !matches!(
            iss,
            Some("https://accounts.google.com" | "accounts.google.com")
        ) {
            return Err(provider("Untrusted token issuer"));
        }
        let email = match claims.get("email") {
            Some(Value::String(e)) if !e.is_empty() => e.clone(),
            _ => return Err(provider("Google token did not include an email")),
        };
        if claims.get("email_verified") == Some(&Value::Bool(false)) {
            return Err(provider("Google account email is not verified"));
        }
        Ok(email)
    }

    /// `verify_apple_identity_token`: the subject and the email claim.
    ///
    /// # Errors
    ///
    /// Not configured (503) or an untrusted token (401).
    pub async fn verify_apple(
        &self,
        token: &str,
    ) -> Result<(String, Option<String>), AccountError> {
        let audiences = &self.config.apple_client_ids;
        if audiences.is_empty() {
            return Err(provider("Apple sign-in is not configured"));
        }
        let Some(claims) = self
            .providers
            .verify_rs256(APPLE_KEYS_URL, token, audiences, Some(APPLE_ISSUER))
            .await
        else {
            tracing::warn!("Apple identity token verification failed");
            return Err(provider("Invalid or expired Apple token"));
        };
        let sub = match claims.get("sub") {
            Some(Value::String(s)) if !s.is_empty() => s.clone(),
            _ => return Err(provider("Apple token did not include a user identifier")),
        };
        let email = match claims.get("email") {
            Some(Value::String(e)) => Some(e.clone()),
            _ => None,
        };
        Ok((sub, email))
    }

    async fn graph_get(&self, path: &str, params: &[(&str, &str)]) -> Result<Value, AccountError> {
        let resp = self
            .providers
            .http
            .get(format!("{GRAPH}/{path}"))
            .query(params)
            .send()
            .await
            .map_err(|_| provider("Could not reach Facebook"))?;
        let status = resp.status();
        let body: Option<Value> = resp.json().await.ok();
        if !status.is_success() {
            let message = body
                .as_ref()
                .and_then(|b| b.get("error"))
                .and_then(|e| e.get("message"))
                .and_then(Value::as_str)
                .unwrap_or("Facebook API error");
            return Err(provider(message));
        }
        body.ok_or_else(|| provider("Could not reach Facebook"))
    }

    /// `verify_facebook_access_token`: the shared email.
    ///
    /// # Errors
    ///
    /// Not configured (503) or an untrusted token (401).
    pub async fn verify_facebook(&self, token: &str) -> Result<String, AccountError> {
        let Some((app_id, secret)) = self.config.facebook.clone() else {
            return Err(provider("Facebook sign-in is not configured"));
        };
        let app_token = format!("{app_id}|{secret}");
        let debug = self
            .graph_get(
                "debug_token",
                &[("input_token", token), ("access_token", &app_token)],
            )
            .await?;
        let data = debug.get("data").cloned().unwrap_or(Value::Null);
        if !data.get("is_valid").is_some_and(truthy) {
            return Err(provider("Invalid or expired Facebook token"));
        }
        let issued_for = match data.get("app_id") {
            Some(Value::String(s)) => s.clone(),
            Some(other) => other.to_string(),
            None => "None".to_owned(),
        };
        if issued_for != app_id {
            return Err(provider("Facebook token was not issued for this app"));
        }
        let profile = self
            .graph_get(
                "me",
                &[("fields", "id,name,email"), ("access_token", token)],
            )
            .await?;
        match profile.get("email") {
            Some(v) if truthy(v) => Ok(v.as_str().map_or_else(|| v.to_string(), str::to_owned)),
            _ => Err(provider(
                "Facebook account did not share an email. Grant email permission or use another sign-in method.",
            )),
        }
    }
}

/// Python truthiness of a JSON value.
fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
    }
}
