//! The patro's calendar: sankrantis and the Bikram Sambat month grid.
//!
//! A port of the Python server's `sankranti.py` (Julian-Day functions) and
//! `bikram_sambat.py`. Every BS month opens on the Kathmandu civil day its Surya
//! Siddhanta sankranti falls on, for every calculation system; see `PORTING.md`.

mod bikram_sambat;
mod sankranti;

pub use bikram_sambat::{
    BsDate, BsError, SIGNED_YEAR_MAX, SIGNED_YEAR_MIN, bs_to_civil, civil_to_bs, locate_patro_day,
    month_length, month_start, month_starts,
};
pub use sankranti::{find_sankranti_after_jd, sun_rashi_at_jd};
