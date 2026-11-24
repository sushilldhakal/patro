//! Short-lived signed links to the private R2 bucket that holds the reader's audio.
//!
//! A port of `services/scripture/media_signing.py`, byte for byte: the bucket is not public, so a
//! recording is only reachable through a `SigV4` query-signed `GET` link built here with no network
//! call. A link names one object and stops working `R2_SIGNED_URL_TTL_HOURS` after the start of
//! the window it was issued in (2 h windows, 8 h links by default), so a link copied out of the
//! JSON stops working the same day. Links are signed at the window's start, not at request time,
//! so a payload is identical for everyone inside a window and can be cached for less than
//! `ttl - window`.

use std::fmt::Write as _;

use sha2::{Digest, Sha256};

const REGION: &str = "auto";
const SERVICE: &str = "s3";

/// The credentials and bucket, from `R2_S3_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` and
/// `R2_SECRET_ACCESS_KEY` (a read-only key for the bucket).
#[derive(Debug, Clone)]
pub(crate) struct R2Signing {
    host: String,
    bucket: String,
    access_key_id: String,
    secret_access_key: String,
    window_seconds: u64,
    ttl_seconds: u64,
}

impl R2Signing {
    /// Builds the signer from the four settings, or `None` when any is missing (then callers fall
    /// back to the public base URL, as Python does). `window_hours` and `ttl_hours` are the
    /// optional `R2_SIGNING_WINDOW_HOURS` and `R2_SIGNED_URL_TTL_HOURS` (defaults 2 and 8).
    #[must_use]
    pub(crate) fn new(
        endpoint: &str,
        bucket: &str,
        access_key_id: &str,
        secret_access_key: &str,
        window_hours: Option<f64>,
        ttl_hours: Option<f64>,
    ) -> Option<Self> {
        let endpoint = endpoint.trim().trim_end_matches('/');
        let (bucket, id, secret) = (
            bucket.trim(),
            access_key_id.trim(),
            secret_access_key.trim(),
        );
        if endpoint.is_empty() || bucket.is_empty() || id.is_empty() || secret.is_empty() {
            return None;
        }
        let host = endpoint
            .split_once("://")
            .map_or(endpoint, |(_, rest)| rest)
            .split('/')
            .next()
            .unwrap_or_default()
            .to_owned();
        let window_seconds = seconds(window_hours.unwrap_or(2.0)).max(60);
        // SigV4 caps a link at seven days; a link must outlive its window by an hour.
        let ttl_seconds = seconds(ttl_hours.unwrap_or(8.0))
            .max(window_seconds + 3600)
            .min(7 * 86_400);
        Some(Self {
            host,
            bucket: bucket.to_owned(),
            access_key_id: id.to_owned(),
            secret_access_key: secret.to_owned(),
            window_seconds,
            ttl_seconds,
        })
    }

    /// The Cache-Control for payloads that carry these links: the edge may keep one for less than
    /// `ttl - window`, or a cached chapter would hand out dead audio links (the same bound as
    /// `_document_cache_control` in Python).
    #[must_use]
    pub(crate) fn document_cache_control(&self) -> String {
        let safe = self.ttl_seconds.saturating_sub(self.window_seconds);
        // 0.66 of the safe time, kept in 300 s ..= 86400 s.
        let edge = ((safe * 66) / 100).clamp(300, 86_400);
        let swr = safe
            .saturating_sub(edge)
            .saturating_sub(600)
            .clamp(60, 3600);
        format!(
            "public, max-age={}, s-maxage={edge}, stale-while-revalidate={swr}",
            edge.min(3600)
        )
    }

    /// A time-limited `GET` link to `key`, signed at the start of the window holding `now`.
    #[must_use]
    pub(crate) fn signed_url(&self, key: &str, now_unix: u64) -> String {
        let start = (now_unix / self.window_seconds) * self.window_seconds;
        let (year, month, day, hour, minute, second) = civil(start);
        let amz_date = format!("{year:04}{month:02}{day:02}T{hour:02}{minute:02}{second:02}Z");
        let date = format!("{year:04}{month:02}{day:02}");
        let scope = format!("{date}/{REGION}/{SERVICE}/aws4_request");
        let path = format!(
            "/{}/{}",
            quote(&self.bucket, ""),
            key.split('/')
                .map(|segment| quote(segment, "-_.~"))
                .collect::<Vec<_>>()
                .join("/")
        );
        let credential = format!("{}/{scope}", self.access_key_id);
        let expires = self.ttl_seconds.to_string();
        // Sorted by name, as Python's `sorted(query.items())`.
        let query = [
            ("X-Amz-Algorithm", "AWS4-HMAC-SHA256"),
            ("X-Amz-Credential", credential.as_str()),
            ("X-Amz-Date", amz_date.as_str()),
            ("X-Amz-Expires", expires.as_str()),
            ("X-Amz-SignedHeaders", "host"),
        ];
        let canonical_query = query
            .iter()
            .map(|(k, v)| format!("{}={}", quote(k, "-_.~"), quote(v, "-_.~")))
            .collect::<Vec<_>>()
            .join("&");
        let canonical_request = format!(
            "GET\n{path}\n{canonical_query}\nhost:{}\n\nhost\nUNSIGNED-PAYLOAD",
            self.host
        );
        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{}",
            hex(&Sha256::digest(canonical_request.as_bytes()))
        );
        let mut k = hmac_sha256(
            format!("AWS4{}", self.secret_access_key).as_bytes(),
            date.as_bytes(),
        );
        k = hmac_sha256(&k, REGION.as_bytes());
        k = hmac_sha256(&k, SERVICE.as_bytes());
        k = hmac_sha256(&k, b"aws4_request");
        let signature = hex(&hmac_sha256(&k, string_to_sign.as_bytes()));
        format!(
            "https://{}{path}?{canonical_query}&X-Amz-Signature={signature}",
            self.host
        )
    }
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "hours are small and positive"
)]
fn seconds(hours: f64) -> u64 {
    (hours * 3600.0).max(0.0) as u64
}

/// Python's `urllib.parse.quote(s, safe)`: every byte but letters, digits, `_.-~` and `safe`
/// becomes `%XX` in upper-case hex.
fn quote(s: &str, safe: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for byte in s.bytes() {
        if byte.is_ascii_alphanumeric()
            || b"_.-~".contains(&byte)
            || safe.as_bytes().contains(&byte)
        {
            out.push(char::from(byte));
        } else {
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}

fn hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .fold(String::with_capacity(bytes.len() * 2), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

/// HMAC-SHA256 (RFC 2104) from the hash, so no new dependency is needed.
fn hmac_sha256(key: &[u8], message: &[u8]) -> Vec<u8> {
    const BLOCK: usize = 64;
    let mut key_block = [0_u8; BLOCK];
    if key.len() > BLOCK {
        key_block[..32].copy_from_slice(&Sha256::digest(key));
    } else {
        key_block[..key.len()].copy_from_slice(key);
    }
    let inner_pad: Vec<u8> = key_block.iter().map(|b| b ^ 0x36).collect();
    let outer_pad: Vec<u8> = key_block.iter().map(|b| b ^ 0x5c).collect();
    let mut inner = Sha256::new();
    inner.update(&inner_pad);
    inner.update(message);
    let mut outer = Sha256::new();
    outer.update(&outer_pad);
    outer.update(inner.finalize());
    outer.finalize().to_vec()
}

/// (year, month, day, hour, minute, second) in UTC of a Unix time (Hinnant's civil-from-days).
#[expect(
    clippy::cast_possible_wrap,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "Unix times here are well inside i64 and the date parts are small"
)]
fn civil(unix: u64) -> (i64, u32, u32, u32, u32, u32) {
    let days = (unix / 86_400) as i64;
    let rest = unix % 86_400;
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let year = yoe + era * 400 + i64::from(month <= 2);
    (
        year,
        month,
        day,
        (rest / 3600) as u32,
        ((rest % 3600) / 60) as u32,
        (rest % 60) as u32,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signer() -> R2Signing {
        R2Signing::new(
            "https://acct123.r2.cloudflarestorage.com",
            "vedicpatro",
            "AKIDEXAMPLE",
            "SECRETEXAMPLEKEY",
            None,
            None,
        )
        .expect("all four settings are given")
    }

    /// Reference links produced by `services/scripture/media_signing.py` for the same inputs.
    #[test]
    fn matches_the_python_signer_byte_for_byte() {
        let s = signer();
        assert_eq!(
            s.signed_url("documents/rigveda/08/rigveda_08_53_03.mp3", 1_763_985_000),
            "https://acct123.r2.cloudflarestorage.com/vedicpatro/documents/rigveda/08/rigveda_08_53_03.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIDEXAMPLE%2F20251124%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20251124T100000Z&X-Amz-Expires=28800&X-Amz-SignedHeaders=host&X-Amz-Signature=992087ab0db4c1a0c0eabcc1130e7c1048143cf2f9e99f7c769ad91020a0be02"
        );
        // a space, an accented letter and a plus sign in the key
        assert_eq!(
            s.signed_url("documents/a b/é+x.mp3", 1_763_992_345),
            "https://acct123.r2.cloudflarestorage.com/vedicpatro/documents/a%20b/%C3%A9%2Bx.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIDEXAMPLE%2F20251124%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20251124T120000Z&X-Amz-Expires=28800&X-Amz-SignedHeaders=host&X-Amz-Signature=e8f82d61c572c49b7a3af73c94b659a62d451edfa57d4b02aecfe38cb7d7b92c"
        );
        // the Unix epoch
        assert_eq!(
            s.signed_url("x.mp3", 0),
            "https://acct123.r2.cloudflarestorage.com/vedicpatro/x.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIDEXAMPLE%2F19700101%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=19700101T000000Z&X-Amz-Expires=28800&X-Amz-SignedHeaders=host&X-Amz-Signature=d86ff204afa784edadea2fe9cbb3335553a5303598d4bc818c4f109a2e6aae10"
        );
    }

    #[test]
    fn a_link_is_the_same_all_window_and_new_in_the_next() {
        let s = signer();
        let a = s.signed_url("k.mp3", 1_763_985_000);
        assert_eq!(
            a,
            s.signed_url("k.mp3", 1_763_985_000 + 7_199 - 1_763_985_000 % 7_200)
        );
        assert_ne!(a, s.signed_url("k.mp3", 1_763_985_000 + 7_200));
    }

    #[test]
    fn missing_settings_mean_no_signing() {
        assert!(R2Signing::new("", "b", "i", "s", None, None).is_none());
        assert!(R2Signing::new("https://h", "b", "", "s", None, None).is_none());
    }

    /// With the defaults (2 h window, 8 h links) Python's header is
    /// `public, max-age=3600, s-maxage=14256, stale-while-revalidate=3600`.
    #[test]
    fn the_cache_header_stays_inside_the_links_life() {
        assert_eq!(
            signer().document_cache_control(),
            "public, max-age=3600, s-maxage=14256, stale-while-revalidate=3600"
        );
    }
}
