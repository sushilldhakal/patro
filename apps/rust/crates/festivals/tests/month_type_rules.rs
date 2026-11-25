//! The owner's rules for adhik and kshaya months (`apps/rust/rules/month_type_rules_v1.json`),
//! checked against the dates the owner stated for BS 2039 and BS 2085.

use festivals::{compute_festival_dates, rule};
use panchanga::daily::Location;
use timescale::CivilDay;

fn start(id: &str, gregorian_year: i32) -> Option<String> {
    let observer = Location::kathmandu().observer();
    compute_festival_dates(rule(id), gregorian_year, &observer).map(|(s, _)| s.to_string())
}

fn day(y: i32, m: u32, d: u32) -> String {
    CivilDay::new(y, m, d).to_string()
}

/// BS 2039: Magha is lost (Poush-Magha kshaya, 14 Jan to 13 Feb 1983). Its festivals follow
/// into the first lunation after it, Adhik Phalguna.
#[test]
fn bs_2039_lost_magha_festivals_follow_into_adhik_phalguna() {
    assert_eq!(
        start("swasthani-brata-arambha", 1983),
        Some(day(1983, 1, 28)),
        "Poush is kept, so the vrata opens on Poush Purnima"
    );
    assert_eq!(start("saraswati-puja", 1983), Some(day(1983, 2, 18)));
    assert_eq!(
        start("swasthani-brata-samapti", 1983),
        Some(day(1983, 2, 26))
    );
    assert_eq!(start("magh-purnima", 1983), Some(day(1983, 2, 27)));
}

/// A year without a kshaya month is untouched: Magha has its own Shukla.
#[test]
fn an_ordinary_year_keeps_magha_where_it_was() {
    assert!(start("saraswati-puja", 1982).is_some());
    assert!(start("saraswati-puja", 1984).is_some());
}

/// BS 2085: Poush is lost (Mangsir-Poush kshaya, 16 Dec 2028 to 14 Jan 2029). Swasthani opens
/// on Poush Purnima, so its opening is skipped; the closing stays on Magha Purnima.
#[test]
fn bs_2085_lost_poush_skips_the_swasthani_opening() {
    assert_eq!(start("swasthani-brata-arambha", 2029), None);
    assert!(
        start("swasthani-brata-arambha", 2028).is_some(),
        "Poush of January 2028 was a real month"
    );
    assert!(start("magh-purnima", 2029).is_some());
    assert!(start("swasthani-brata-samapti", 2029).is_some());
}

/// BS 2085: the adhik months own their Ekadashis, wherever they fall (the rule book names Jestha).
#[test]
fn padmini_and_parama_belong_to_the_adhik_month() {
    assert_eq!(start("padmini-ekadashi", 2028), Some(day(2028, 10, 28)));
    assert_eq!(start("parama-ekadashi", 2028), Some(day(2028, 11, 12)));
    // A year with no adhik masa has neither.
    assert_eq!(start("padmini-ekadashi", 2027), None);
}
