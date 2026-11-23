//! Kundali detail assembly at one fixed birth instant: the at-time Fields
//! (built once, outside the timed loop, as the route does) plus `assemble`,
//! which used to recompute the nine-graha table and shadbala's positions a
//! second and third time. Criterion iterates, so the per-JD memo is warm;
//! this measures the repeated same-instant cost of the whole detail build.
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use jyotish::kundali_detail::{DetailInputs, assemble};
use panchanga::daily::Location;
use patro::at_time::{at_time_fields, observer_zone};
use timescale::{PyInstant, UtcInstant};

fn bench(c: &mut Criterion) {
    let location = Location::kathmandu();
    let instant = UtcInstant::from_jd(2_460_000.5).expect("valid JD");
    let now = UtcInstant::from_jd(2_461_345.5).expect("valid JD");
    let panchanga = at_time_fields(instant, &location)
        .expect("at-time fields")
        .to_value();
    let zone = observer_zone(&location);
    let inputs = DetailInputs {
        instant,
        location: &location,
        zone: &zone,
        now,
    };
    c.bench_function("kundali detail assemble, one instant", |b| {
        b.iter(|| assemble(black_box(&inputs), black_box(&panchanga)));
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);
