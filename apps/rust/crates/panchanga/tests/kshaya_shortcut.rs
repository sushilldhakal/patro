//! The kshaya shortcut: a kshaya month is only searched for when two adhik months fall
//! in the three lunar years around it. It must never skip a year that has one.

use panchanga::lunar_month::{kshaya_months_exhaustive, kshaya_searched};

fn check(years: std::ops::RangeInclusive<i32>) -> Vec<(i32, Vec<String>)> {
    let mut found = Vec::new();
    for year in years {
        let kshaya = kshaya_months_exhaustive(SS, year);
        if !kshaya.is_empty() {
            assert!(
                kshaya_searched(SS, year),
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

/// The raw finder still has no date for the masa a kshaya lunation swallowed: 1983's kshaya
/// month (Poush–Magh) drops Magh, so Shree Panchami (Magh shukla 5) has none that year.
///
/// This used to be the owner's rule for the festival itself. On 2026-11-24 the owner ruled that
/// a lost month's festival is not dropped but follows into the first lunation after the kshaya
/// (`month_type_rules_v1.json`); festival dates now go through `find_festival_with_kshaya_rule`
/// (Saraswati Puja 1983 is 18 Feb, see `crates/festivals/tests/month_type_rules.rs`). This test
/// keeps pinning the finder underneath it.
#[test]
fn a_kshaya_month_drops_its_skipped_masas_festivals() {
    use astronomy::engine::Observer;
    use panchanga::{
        Paksha,
        lunar_month::{DateSelection, find_festival_in_lunar_month},
    };
    use timescale::Zone;

    let kathmandu = Observer {
        system: astronomy::System::SuryaSiddhanta,
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

const SS: astronomy::System = astronomy::System::SuryaSiddhanta;
