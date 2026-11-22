//! The engine's boundaries are right on their own terms, whatever Python answered:
//! a span ends on the first second the next anga is in force, and starts on the
//! first second its own anga is.

use panchanga::{
    karana, karana_end, karana_start, moon_pada_end, moon_rashi_end, nakshatra, nakshatra_end,
    nakshatra_start, sun_nakshatra_end, tithi, tithi_end, tithi_start, yoga, yoga_end, yoga_start,
};
use timescale::UtcInstant;

fn instants(n: usize) -> impl Iterator<Item = UtcInstant> {
    let mut x: u64 = 0x9E37_79B9_7F4A_7C15;
    (0..n).filter_map(move |_| {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        UtcInstant::from_jd_truncated(2_299_161.0 + u * 225_000.0)
    })
}

type Index = fn(f64) -> u32;
type Finder = (
    &'static str,
    Index,
    fn(astronomy::System, UtcInstant) -> UtcInstant,
);

#[test]
fn a_span_ends_when_the_next_anga_first_holds() {
    let finders: [Finder; 4] = [
        ("tithi", |jd| tithi(SS, jd).number, tithi_end),
        ("nakshatra", |jd| nakshatra(SS, jd).number, nakshatra_end),
        ("yoga", |jd| yoga(SS, jd).number, yoga_end),
        ("karana", |jd| karana(SS, jd).number, karana_end),
    ];
    for at in instants(600) {
        for (name, index, end) in finders {
            let e = end(SS, at);
            assert!(e > at, "{name} ends after {at}: {e}");
            assert_ne!(
                index(e.to_jd()),
                index(at.to_jd()),
                "{name}: new anga holds at {e}"
            );
            assert_eq!(
                index(e.add_seconds(-1).to_jd()),
                index(at.to_jd()),
                "{name}: old anga still holds a second earlier ({e})"
            );
        }
    }
}

#[test]
fn a_span_starts_when_its_own_anga_first_holds() {
    let finders: [Finder; 4] = [
        ("tithi", |jd| tithi(SS, jd).number, tithi_start),
        ("nakshatra", |jd| nakshatra(SS, jd).number, nakshatra_start),
        ("yoga", |jd| yoga(SS, jd).number, yoga_start),
        ("karana", |jd| karana(SS, jd).number, karana_start),
    ];
    for at in instants(600) {
        for (name, index, start) in finders {
            let s = start(SS, at);
            assert!(s <= at, "{name} starts by {at}: {s}");
            assert_eq!(
                index(s.to_jd()),
                index(at.to_jd()),
                "{name}: anga holds at its start {s}"
            );
            assert_ne!(
                index(s.add_seconds(-1).to_jd()),
                index(at.to_jd()),
                "{name}: a different anga a second before {s}"
            );
        }
    }
}

#[test]
fn a_tithi_and_a_karana_that_end_together_print_the_same_second() {
    // Every tithi end is a karana end; both read the same table, so never a second apart.
    for at in instants(600) {
        let t = tithi_end(SS, at);
        assert_eq!(
            karana_end(SS, t.add_seconds(-2)),
            t,
            "tithi and karana end together at {t}"
        );
    }
}

#[test]
fn the_moon_and_sun_spans_run_to_their_real_ends() {
    for at in instants(300) {
        // A Moon rashi lasts about two and a quarter days, a nakshatra about a day.
        let rashi = moon_rashi_end(SS, at).micros_since(at) / 3_600_000_000;
        assert!(
            (0..=64).contains(&rashi),
            "moon rashi ends within 64 h, took {rashi} h at {at}"
        );
        let pada = moon_pada_end(SS, at).micros_since(at) / 3_600_000_000;
        assert!(
            (0..=9).contains(&pada),
            "a pada ends within 9 h, took {pada} h at {at}"
        );
        // The Sun stays in a nakshatra about 13 days: the real end, not a 30 h window's edge.
        let sun_days = sun_nakshatra_end(SS, at).micros_since(at) / 86_400_000_000;
        assert!(
            (0..=15).contains(&sun_days),
            "sun nakshatra ends within 15 d, took {sun_days} d at {at}"
        );
    }
}

const SS: astronomy::System = astronomy::System::SuryaSiddhanta;
