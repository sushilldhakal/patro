//! Festivals: the day each rule in `rules/festival_rules_v3.json` names in a year, the
//! MoHA overrides, and the year and day festival lists the patro shows.
//!
//! A port of `engine/festivals/festival_rules.py`, `occurrence.py` and the festival half
//! of `services/festivals/holiday_generator.py`. The rule files are embedded from
//! `apps/api/rules`, the same files the Python server reads.

mod compute;
pub mod details;
mod lists;
mod rules;
pub mod sait;

pub use compute::compute_festival_dates;
pub use details::{attach_festival_details, festival_details};
pub use lists::{
    festival_location, festivals_for_day, filter_day as filter_redundant_day_festivals,
    generate_bs_festivals, generate_festivals,
};
pub use rules::{is_public_holiday, rule};
pub use sait::{
    CEREMONY_SAITS, CeremonyWindows, attach_festival_saits, ceremony_saits, festival_saits,
};
