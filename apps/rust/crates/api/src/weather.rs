//! Open-Meteo forecast fetching with a process-wide, location-keyed shared cache.
//!
//! Cache entries retain the complete 16-day forecast. They are refreshed after 20
//! minutes and may be served stale for up to two hours while a background refresh runs.

use std::{collections::HashMap, sync::Arc, time::Duration};

use serde_json::Value;
use tokio::sync::{Mutex, RwLock};

const REFRESH_AFTER: Duration = Duration::from_secs(20 * 60);
const MAX_STALE: Duration = Duration::from_secs(2 * 60 * 60);

#[derive(Debug, Clone)]
struct ForecastEntry {
    payload: Value,
    fetched_at: tokio::time::Instant,
    fetched_unix: u64,
}

/// Shared Open-Meteo client. Clones share the same local cache and in-flight locks.
#[derive(Debug, Clone)]
pub struct WeatherService {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    client: reqwest::Client,
    endpoint: String,
    cache: RwLock<HashMap<String, ForecastEntry>>,
    locks: Mutex<HashMap<String, Arc<Mutex<()>>>>,
}

impl WeatherService {
    /// Builds the service. `PATRO_RS_OPEN_METEO_URL` can point at a self-hosted
    /// Open-Meteo API; the public API is used when it is unset.
    #[must_use]
    pub fn from_env() -> Self {
        let endpoint = std::env::var("PATRO_RS_OPEN_METEO_URL")
            .unwrap_or_else(|_| "https://api.open-meteo.com/v1/forecast".into());
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent("vedic-patro-weather/0.1")
            .build()
            .unwrap_or_default();
        Self {
            inner: Arc::new(Inner {
                client,
                endpoint,
                cache: RwLock::new(HashMap::new()),
                locks: Mutex::new(HashMap::new()),
            }),
        }
    }

    /// Returns one cached 16-day forecast for a canonicalized location key.
    /// Concurrent misses for the same key are coalesced to a single upstream fetch.
    ///
    /// # Errors
    ///
    /// Returns an upstream or response-decoding error when no usable cached entry exists.
    pub async fn forecast(
        &self,
        key: String,
        lat: f64,
        lon: f64,
    ) -> Result<(Value, u64, bool), reqwest::Error> {
        if let Some(entry) = self.inner.cache.read().await.get(&key).cloned() {
            let age = entry.fetched_at.elapsed();
            if age < REFRESH_AFTER {
                return Ok((entry.payload, entry.fetched_unix, true));
            }
            if age < MAX_STALE {
                let service = self.clone();
                let refresh_key = key.clone();
                tokio::spawn(async move {
                    if let Err(error) = service.refresh(&refresh_key, lat, lon).await {
                        tracing::warn!(%error, key = %refresh_key, "background weather refresh failed");
                    }
                });
                return Ok((entry.payload, entry.fetched_unix, true));
            }
        }
        let entry = self.refresh(&key, lat, lon).await?;
        Ok((entry.payload, entry.fetched_unix, false))
    }

    async fn refresh(
        &self,
        key: &str,
        lat: f64,
        lon: f64,
    ) -> Result<ForecastEntry, reqwest::Error> {
        let key_lock = {
            let mut locks = self.inner.locks.lock().await;
            Arc::clone(
                locks
                    .entry(key.to_owned())
                    .or_insert_with(|| Arc::new(Mutex::new(()))),
            )
        };
        let guard = key_lock.lock().await;
        if let Some(entry) = self.inner.cache.read().await.get(key).cloned() {
            if entry.fetched_at.elapsed() < REFRESH_AFTER {
                return Ok(entry);
            }
        }

        let payload_result = async {
            self.inner
                .client
                .get(&self.inner.endpoint)
                .query(&[
                    ("latitude", lat.to_string()),
                    ("longitude", lon.to_string()),
                    ("forecast_days", "16".to_owned()),
                    ("timezone", "auto".to_owned()),
                    (
                        "current",
                        "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
                            .to_owned(),
                    ),
                    (
                        "hourly",
                        "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day"
                            .to_owned(),
                    ),
                    (
                        "daily",
                        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant".to_owned(),
                    ),
                ])
                .send()
                .await?
                .error_for_status()?
                .json::<Value>()
                .await
        }
        .await;
        let payload = match payload_result {
            Ok(payload) => payload,
            Err(error) => {
                drop(guard);
                self.remove_idle_lock(key, &key_lock).await;
                return Err(error);
            }
        };

        let fetched_unix = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |duration| duration.as_secs());
        let entry = ForecastEntry {
            payload,
            fetched_at: tokio::time::Instant::now(),
            fetched_unix,
        };
        let mut cache = self.inner.cache.write().await;
        if cache.len() >= 512 && !cache.contains_key(key) {
            if let Some(oldest) = cache
                .iter()
                .min_by_key(|(_, item)| item.fetched_at)
                .map(|(key, _)| key.clone())
            {
                cache.remove(&oldest);
            }
        }
        cache.insert(key.to_owned(), entry.clone());
        drop(cache);
        drop(guard);
        self.remove_idle_lock(key, &key_lock).await;
        Ok(entry)
    }

    async fn remove_idle_lock(&self, key: &str, key_lock: &Arc<Mutex<()>>) {
        let mut locks = self.inner.locks.lock().await;
        if Arc::strong_count(key_lock) == 2
            && locks
                .get(key)
                .is_some_and(|stored| Arc::ptr_eq(stored, key_lock))
        {
            locks.remove(key);
        }
    }
}
