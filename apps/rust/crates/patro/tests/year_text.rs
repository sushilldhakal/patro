//! The streamed year writer gives exactly the bytes of the tree it replaces, plain
//! and rendered for each era.

use common::pyjson::{Style, dumps};
use panchanga::daily::Location;
use patro::{
    era::render_for_era,
    year::{YearShape, YearText, year_calendar, year_calendar_text},
};

fn check(bs_year: i32, shape: YearShape, era: Option<(&str, &str)>) {
    let location = Location::kathmandu();
    let tree = year_calendar(bs_year, &location, shape).expect("tree");
    let want = match era {
        None => dumps(&tree, Style::Compact),
        Some((e, language)) => dumps(&render_for_era(&tree, e, language), Style::Default),
    };
    let got = year_calendar_text(bs_year, &location, shape, YearText { era }).expect("text");
    if got != want {
        let at = got
            .bytes()
            .zip(want.bytes())
            .position(|(a, b)| a != b)
            .unwrap_or(got.len().min(want.len()));
        panic!(
            "{bs_year} {shape:?} {era:?}: differs at byte {at}\n text: …{}…\n tree: …{}…",
            got.get(at.saturating_sub(80)..(at + 80).min(got.len()))
                .unwrap_or(""),
            want.get(at.saturating_sub(80)..(at + 80).min(want.len()))
                .unwrap_or("")
        );
    }
}

#[test]
fn lite_and_wheel_years_match_the_tree_in_every_era() {
    for era in [
        None,
        Some(("bs", "ne")),
        Some(("ad", "en")),
        Some(("bs", "en")),
    ] {
        check(2082, YearShape::Lite, era);
        check(2083, YearShape::Wheel, era);
    }
}

#[test]
fn a_full_year_matches_the_tree() {
    check(2081, YearShape::Full, None);
    check(2081, YearShape::Full, Some(("bs", "ne")));
}
