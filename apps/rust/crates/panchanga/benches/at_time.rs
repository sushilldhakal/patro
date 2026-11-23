//! The birth-instant graha table, as kundali detail/report build it: nine grahas
//! with speeds, latitude, RA/Dec and the instant lagna, at one fixed instant.
//! Criterion iterates, so after the first call the per-JD memo is warm —
//! this measures the repeated same-JD cost, the case the memo exists for.
//! The first table at a fresh JD still pays the full 24 evaluations.
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use panchanga::at_time::planetary_snapshot;
use timescale::{PyInstant, UtcInstant};

fn bench(c: &mut Criterion) {
    let system = astronomy::System::SuryaSiddhanta;
    let instant = UtcInstant::from_jd(2_460_000.5).expect("valid JD");
    let (lat, lon) = (27.7, 85.3);
    c.bench_function("planetary_snapshot, one instant", |b| {
        b.iter(|| planetary_snapshot(black_box(system), black_box(instant), lat, lon));
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);
