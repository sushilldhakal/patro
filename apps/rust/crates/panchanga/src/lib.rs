//! The five angas of the panchanga and the moments each one changes.
//!
//! A port of the Python server's `angas.py`, `tithi_boundaries.py` and the finders in
//! `element_boundaries.py`, answering from the Surya Siddhanta engine
//! ([`astronomy::engine`]). Values and boundary instants match the Python server bit
//! for bit; see `PORTING.md`.

mod angas;
pub mod at_time;
mod blocks_bala;
mod blocks_lagna;
mod blocks_muhurta;
mod blocks_nivas;
mod blocks_solar;
mod blocks_time;
pub use blocks_time::choghadiya as choghadiya_segments;
mod boundaries;
pub mod daily;
pub mod lunar_month;
pub mod memo;
pub mod midnight;
mod names;
mod nepal_sambat;
pub mod payload;
pub mod pyfloat;
pub mod samvatsara;
pub mod store;
mod text_tables;

pub use angas::{
    Karana, Nakshatra, Paksha, Tithi, Vara, Yoga, elongation, karana, nakshatra, tithi, vara, yoga,
};
pub use boundaries::{
    karana_end, karana_start, moon_pada_end, moon_rashi_end, nakshatra_end, nakshatra_start,
    sun_nakshatra_end, tithi_end, tithi_start, yoga_end, yoga_start,
};
/// Tropical (sayana) Sun under the Surya Siddhanta: the text's Sun turned by real precession.
#[must_use]
pub fn tropical_sun_longitude(jd: f64) -> f64 {
    blocks_time::tropical_sun(jd)
}

pub use names::{
    KARANA_NAMES, NAKSHATRA_NAMES, TITHI_NAMES, VAARA_ENGLISH, VAARA_NAMES, YOGA_NAMES,
};

pub use blocks_lagna::{GrahaPosition, ascendant_extras, graha_extras, graha_positions};
pub use blocks_muhurta::Muhurta;
pub use blocks_time::{HoraSlot, aayan, hora as hora_slots};
pub use daily::{
    NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE, SunTimes, nepali_digits, py_min, sun_times,
    sunrise_on,
};
pub use text_tables::{NAVATARA, RASHI_NAMA_AKSHARAS_NE, RASHI_TITLE_EN};
