//! The moving angas of a civil day re-read at local midnight
//! (`build_panchanga_civil_day` in `services/panchanga/panchanga_at_time.py`).
//!
//! Midnight is both the reference moment and the ghati origin, and the day-window
//! spans run midnight → next midnight. Python hands the builders zone-aware local
//! bounds, so every instant here prints on the observer's clock
//! ([`ZonedInstant`]).

use astronomy::engine::{moon_longitude, sun_longitude};
use serde_json::{Map, Value};
use timescale::{CivilDay, PyInstant, ZonedInstant};

use crate::{
    angas::tithi,
    blocks_bala::{chandrabala_table, chandrabalam, tarabala_table, tarabalam},
    blocks_lagna::{
        lagna, lagna_rows_value, lagna_spans_with_pushkara, panchaka_rahita, udaya_lagna,
    },
    daily::{
        DailyError, Location, chandra_rashi_spans, karana_block, nakshatra_block,
        nakshatra_pada_spans, paksha_block, rashi_payload, tithi_block, yoga_block,
    },
};

/// The blocks `build_panchanga_civil_day` overlays onto the daily detail, in its
/// `detail.update` order.
#[derive(Debug, Clone, PartialEq)]
pub struct MidnightOverlay {
    /// `(key, value)` pairs in Python's overlay order.
    pub detail: Vec<(&'static str, Value)>,
}

impl MidnightOverlay {
    /// One overlay block by key.
    #[must_use]
    pub fn get(&self, key: &str) -> &Value {
        self.detail
            .iter()
            .find(|(k, _)| *k == key)
            .map_or(&Value::Null, |(_, v)| v)
    }
}

/// The midnight overlay of a civil day. `lunar` is the day's `lunar_month` block
/// and `vaara` its weekday number (from the sunrise state).
///
/// # Errors
///
/// [`DailyError::BeforeGregorian`] when local midnight cannot be placed.
pub fn midnight_overlay(
    day: CivilDay,
    location: &Location,
    lunar: &Value,
    vaara: u32,
) -> Result<MidnightOverlay, DailyError> {
    let zone = &location.zone;
    let midnight =
        ZonedInstant::local_midnight(day, zone).ok_or(DailyError::BeforeGregorian(day))?;
    let next_midnight = midnight.add_hours(24);
    let jd = midnight.to_jd();

    let tithi_info = tithi(jd);
    let tithi = tithi_block(midnight, midnight, zone, &tithi_info);
    let nakshatra = nakshatra_block(midnight, midnight, zone);
    let yoga = yoga_block(midnight, midnight, zone);
    let karana = karana_block(midnight, midnight, zone);
    let paksha = paksha_block(lunar, tithi_info.paksha);
    let chandra_rashi = rashi_payload(moon_longitude(jd));
    let surya_rashi = rashi_payload(sun_longitude(jd));
    let lagna_now = lagna(jd, location.lat, location.lon);

    let spans =
        lagna_spans_with_pushkara(midnight, next_midnight, location.lat, location.lon, zone);
    let rashi_spans = chandra_rashi_spans(midnight, next_midnight, zone);
    let pada_spans = nakshatra_pada_spans(midnight, next_midnight, zone);

    let tara = tarabalam(midnight, &nakshatra, zone);
    let chandra = chandrabalam(midnight, &rashi_spans, zone);
    let tara_table = tarabala_table(&nakshatra);
    let chandra_table = chandrabala_table(&chandra_rashi);
    let panchaka = panchaka_rahita(midnight, &spans, vaara, zone);
    let udaya = crate::payload::to_value(&udaya_lagna(&spans));
    let lagna_spans = lagna_rows_value(&spans);

    Ok(MidnightOverlay {
        detail: vec![
            ("tithi", tithi),
            ("nakshatra", nakshatra),
            ("yoga", yoga),
            ("karana", karana),
            ("paksha", paksha),
            ("chandra_rashi", chandra_rashi),
            ("surya_rashi", surya_rashi),
            ("chandra_rashi_spans", rashi_spans),
            ("nakshatra_pada_spans", pada_spans),
            ("lagna", lagna_now),
            ("lagna_spans", lagna_spans),
            ("udaya_lagna", udaya),
            ("tarabalam", tara),
            ("chandrabalam", chandra),
            ("tarabala_table", tara_table),
            ("chandrabala_table", chandra_table),
            ("panchaka_rahita", panchaka),
        ],
    })
}

/// `detail.update(overlay)` on a daily detail object.
pub fn apply_to_detail(detail: &mut Map<String, Value>, overlay: &MidnightOverlay) {
    for (key, value) in &overlay.detail {
        detail.insert((*key).to_owned(), value.clone());
    }
}
