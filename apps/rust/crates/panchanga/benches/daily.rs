//! The full daily panchanga, matched by `scripts/bench_daily.py`.
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use panchanga::daily::{Location, build_daily};
use timescale::CivilDay;

fn bench(c: &mut Criterion) {
    let location = Location::kathmandu();
    let day = CivilDay::new(2026, 11, 1);
    c.bench_function("full daily payload, one day", |b| {
        b.iter(|| build_daily(black_box(day), &location));
    });
    c.bench_function("full daily, 30-day month", |b| {
        b.iter(|| {
            (0..30)
                .map(|i| build_daily(black_box(day.add_days(i)), &location))
                .collect::<Vec<_>>()
        });
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);
