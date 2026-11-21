//! The kshaya shortcut: a kshaya month is only searched for when two adhik months fall
//! in the three lunar years around it. It must never skip a year that has one.

use panchanga::lunar_month::{kshaya_months_exhaustive, kshaya_searched};

fn check(years: std::ops::RangeInclusive<i32>) -> Vec<(i32, Vec<String>)> {
    let mut found = Vec::new();
    for year in years {
        let kshaya = kshaya_months_exhaustive(year);
        if !kshaya.is_empty() {
            assert!(
                kshaya_searched(year),
                "{year}: kshaya {kshaya:?} but the shortcut skips it"
            );
            found.push((year, kshaya));
        }
    }
    found
}

#[test]
fn the_shortcut_never_skips_a_kshaya_month() {
    let found = check(1800..=2200);
    // BS 2039: the Poush–Magha kshaya of January 1983, in the lunar year from Feb 1982.
    assert!(
        found
            .iter()
            .any(|(year, months)| *year == 1982 && months.iter().any(|m| m.starts_with("1983-01"))),
        "the 1983 kshaya month: {found:?}"
    );
}

/// The same over 6,000 years (slow; run with `--ignored`).
#[test]
#[ignore = "scans 6,000 years"]
fn the_shortcut_never_skips_a_kshaya_month_over_six_thousand_years() {
    let found = check(-3000..=3000);
    println!("{} kshaya years: {found:?}", found.len());
}

/// Owner's rule: in a kshaya year the dropped masa's lunar festivals are not observed.
/// 1983's kshaya month (Poush–Magh) drops Magh: Shree Panchami (Magh shukla 5) has no
/// date that year, and returns the next.
#[test]
fn a_kshaya_month_drops_its_skipped_masas_festivals() {
    use astronomy::engine::Observer;
    use panchanga::{
        Paksha,
        lunar_month::{DateSelection, find_festival_in_lunar_month},
    };
    use timescale::Zone;

    let kathmandu = Observer {
        latitude: 27.7172,
        longitude: 85.324,
        zone: Zone::kathmandu(),
    };
    let find = |name, year| {
        find_festival_in_lunar_month(
            name,
            5,
            Paksha::Shukla,
            year,
            DateSelection::Udaya,
            &kathmandu,
        )
    };
    assert_eq!(find("Magh", 1983), None, "Magh is dropped in 1983");
    assert!(find("Magh", 1984).is_some(), "Magh returns in 1984");
    assert!(find("Magh", 1982).is_some(), "and was there in 1982");
    assert!(
        find("Poush", 1983).is_some(),
        "the kept masa keeps its festivals"
    );
}
