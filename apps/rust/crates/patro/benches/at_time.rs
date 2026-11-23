//! The at-time fields kundali detail/report start from: the vedic day, the
//! instant blocks (graha table included) and the day's blocks, at one fixed
//! birth instant. Criterion iterates, so after the first call the per-JD memo
//! and the day memo are warm — this measures the repeated same-instant cost.
//! A first request for a fresh instant still pays the full build.
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use panchanga::daily::Location;
use patro::at_time::at_time_fields;
use timescale::{PyInstant, UtcInstant};

fn bench(c: &mut Criterion) {
    let location = Location::kathmandu();
    let instant = UtcInstant::from_jd(2_460_000.5).expect("valid JD");
    c.bench_function("at_time_fields, one instant", |b| {
        b.iter(|| at_time_fields(black_box(instant), &location));
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);
