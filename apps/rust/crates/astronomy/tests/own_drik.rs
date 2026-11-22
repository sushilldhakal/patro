//! The event index against solving the same events from our own ephemeris.
//!
//! Needs the pilot files: set `PATRO_RS_EPHDATA` to a folder holding `kernel.veph` and
//! `events.vidx` (built by `ephdata extract` and `ephdata index`). Skipped without it.

#![expect(
    clippy::many_single_char_names,
    reason = "a and b are the covered span; i and s are the indexed and solved answers"
)]

use std::{path::PathBuf, sync::Arc};

use astronomy::{
    angles::Anga,
    events::{events_between, next_entry, next_event, prev_entry, prev_event},
    position::{Ephemeris, OwnDrik},
};
use ephdata::{Index, Sky};

fn engines() -> Option<(OwnDrik, OwnDrik)> {
    let dir = PathBuf::from(std::env::var_os("PATRO_RS_EPHDATA")?);
    let sky = Arc::new(Sky::open(&dir.join("kernel.veph")).ok()?);
    let index = Arc::new(Index::open(&dir.join("events.vidx")).ok()?);
    Some((
        OwnDrik::new(Arc::clone(&sky)).with_index(index),
        OwnDrik::new(sky),
    ))
}

const SECOND: f64 = 1.0 / 86_400.0;

#[test]
fn the_index_answers_what_the_solver_answers() {
    let Some((indexed, solved)) = engines() else {
        eprintln!("PATRO_RS_EPHDATA not set: skipped");
        return;
    };
    assert!(
        indexed.index().is_some() && solved.index().is_none(),
        "one reads, one solves"
    );
    let (a, b) = indexed.index().map_or((0.0, 0.0), ephdata::Index::coverage);
    let mut worst = 0.0_f64;
    for anga in Anga::ALL {
        for k in 0..300_u32 {
            let jd = a + 40.0 + (b - a - 80.0) * f64::from(k) / 300.0 + 0.317_9;
            let (i, s) = (
                next_event(&indexed, anga, jd),
                next_event(&solved, anga, jd),
            );
            assert_eq!(i.multiple, s.multiple, "{anga:?} next at {jd}");
            worst = worst.max((i.jd - s.jd).abs());
            let (i, s) = (
                prev_event(&indexed, anga, jd),
                prev_event(&solved, anga, jd),
            );
            assert_eq!(i.multiple, s.multiple, "{anga:?} prev at {jd}");
            worst = worst.max((i.jd - s.jd).abs());
            let m = k % anga.count();
            let (i, s) = (
                next_entry(&indexed, anga, m, jd),
                next_entry(&solved, anga, m, jd),
            );
            assert_eq!(i.multiple, s.multiple, "{anga:?} entry {m} at {jd}");
            worst = worst.max((i.jd - s.jd).abs());
            let (i, s) = (
                prev_entry(&indexed, anga, m, jd),
                prev_entry(&solved, anga, m, jd),
            );
            assert_eq!(i.multiple, s.multiple, "{anga:?} prev entry {m} at {jd}");
            worst = worst.max((i.jd - s.jd).abs());
        }
        let (from, to) = (a + 1000.0, a + 1060.0);
        let (i, s) = (
            events_between(&indexed, anga, from, to),
            events_between(&solved, anga, from, to),
        );
        assert_eq!(i.len(), s.len(), "{anga:?} count in 60 days");
    }
    assert!(
        worst < 0.1 * SECOND * 10.0,
        "worst difference {} s",
        worst / SECOND
    );
}
