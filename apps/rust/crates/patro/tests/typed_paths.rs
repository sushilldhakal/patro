//! Every route payload held as typed fields writes exactly the bytes of the tree it
//! replaces: plain, and rendered for each era field by field (`render_fields_for_era`)
//! instead of rendering the whole tree (`render_for_era`).

use common::pyjson::{Style, dumps};
use panchanga::{daily::Location, payload::Fields};
use patro::{
    at_time::{AtInstant, InstantQuery, at_time_fields, at_time_fields_jd, resolve_instant_any},
    day::{
        DayBuildOptions, DayVariant, DetailMode, FestivalMode, SlimMode, day_fields_for_jd_with,
    },
    era::{render_fields_for_era, render_for_era},
    month::{
        Embed, GregorianEra, International, gregorian_month_calendar, month_calendar_at_clock,
    },
};
use timescale::{CivilDay, Zone};

const ERAS: [(&str, &str); 4] = [("bs", "ne"), ("ad", "en"), ("bs", "en"), ("bbs", "ne")];

fn first_difference(got: &str, want: &str) -> String {
    let at = got
        .bytes()
        .zip(want.bytes())
        .position(|(a, b)| a != b)
        .unwrap_or(got.len().min(want.len()));
    format!(
        "differs at byte {at}\n fields: …{}…\n tree:   …{}…",
        got.get(at.saturating_sub(80)..(at + 80).min(got.len()))
            .unwrap_or(""),
        want.get(at.saturating_sub(80)..(at + 80).min(want.len()))
            .unwrap_or("")
    )
}

fn check(what: &str, fields: &Fields) {
    let tree = fields.to_value();
    let (got, want) = (fields.to_text(Style::Compact), dumps(&tree, Style::Compact));
    assert!(
        got == want,
        "{what} plain: {}",
        first_difference(&got, &want)
    );
    for (era, language) in ERAS {
        let got = render_fields_for_era(fields, era, language).to_text(Style::Default);
        let want = dumps(&render_for_era(&tree, era, language), Style::Default);
        assert!(
            got == want,
            "{what} era={era} language={language}: {}",
            first_difference(&got, &want)
        );
    }
}

fn new_york() -> Location {
    Location {
        lat: 40.7128,
        lon: -74.006,
        zone: Zone::get("America/New_York").expect("zone"),
        name: "New York".to_owned(),
        city_id: Some(5_128_581),
    }
}

#[test]
fn gregorian_months_match_their_tree() {
    let ktm = Location::kathmandu();
    for (era, year, month, embed) in [
        (GregorianEra::Ad, 2026, 3, Embed::Lite),
        (GregorianEra::Ad, 2025, 10, Embed::Full),
        (GregorianEra::Ad, 1999, 12, Embed::FullSlim),
        (GregorianEra::Ad, 1200, 5, Embed::Full),
        (GregorianEra::Bc, 44, 3, Embed::Lite),
        (GregorianEra::Bc, 12, 12, Embed::FullSlim),
    ] {
        let month = gregorian_month_calendar(era, year, month, &ktm, International::Include, embed)
            .expect("month");
        check(&format!("{era:?} {year}-{month:?} {embed:?}"), &month);
    }
}

#[test]
fn clock_months_match_their_tree() {
    for (location, year, month, clock, embed) in [
        (Location::kathmandu(), 2082, 6, "06:30", Embed::Lite),
        (Location::kathmandu(), 2081, 1, "23:45", Embed::Full),
        (new_york(), 2083, 11, "00:15", Embed::FullSlim),
    ] {
        let grid =
            month_calendar_at_clock(year, month, &location, clock, International::Include, embed)
                .expect("clock month");
        check(&format!("{year}/{month} clock {clock} {embed:?}"), &grid);
    }
}

#[test]
fn midnight_and_civil_days_match_their_tree() {
    let options = |detail, festivals, slim| DayBuildOptions {
        detail,
        slim,
        festivals,
    };
    for (location, day, opts, variant) in [
        (
            Location::kathmandu(),
            CivilDay::new(2026, 10, 21),
            options(DetailMode::Include, FestivalMode::Include, SlimMode::Keep),
            DayVariant {
                midnight: true,
                civil_timeline: false,
            },
        ),
        (
            new_york(),
            CivilDay::new(2026, 3, 8),
            options(DetailMode::Exclude, FestivalMode::Exclude, SlimMode::Slim),
            DayVariant {
                midnight: true,
                civil_timeline: true,
            },
        ),
        (
            Location::kathmandu(),
            CivilDay::new(1990, 1, 1),
            options(DetailMode::Include, FestivalMode::Exclude, SlimMode::Keep),
            DayVariant {
                midnight: false,
                civil_timeline: true,
            },
        ),
        (
            Location::kathmandu(),
            CivilDay::new(1000, 6, 1),
            options(DetailMode::Include, FestivalMode::Exclude, SlimMode::Keep),
            DayVariant::default(),
        ),
    ] {
        let fields =
            day_fields_for_jd_with(day.to_jd_ut(), &location, opts, variant).expect("day state");
        check(&format!("{day} {variant:?}"), &fields);
    }
}

#[test]
fn at_time_matches_its_tree() {
    for (location, datetime, jd, clock) in [
        (
            Location::kathmandu(),
            Some("2026-11-22T05:10:00+05:45"),
            None,
            None,
        ),
        (new_york(), Some("2026-03-08T02:30:00"), None, None),
        (
            Location::kathmandu(),
            None,
            Some(2_100_000.5),
            Some("06:30"),
        ),
        (
            Location::kathmandu(),
            None,
            Some(1_500_000.5),
            Some("12:00"),
        ),
    ] {
        let query = InstantQuery {
            datetime,
            jd,
            clock,
        };
        let fields = match resolve_instant_any(query, &location).expect("instant") {
            AtInstant::Utc(utc) => at_time_fields(utc, &location),
            AtInstant::Jd(jd) => at_time_fields_jd(jd, &location),
        }
        .expect("at-time");
        check(&format!("at-time {datetime:?} {jd:?} {clock:?}"), &fields);
    }
}
