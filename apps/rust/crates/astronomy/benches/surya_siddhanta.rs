//! Speed of the Surya Siddhanta maths, matched by `scripts/bench_surya_siddhanta.py`
//! running the same workloads through the Python module.
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use astronomy::surya_siddhanta::{
    Body, Crossing, Direction, EclipseKind, next_eclipse, next_rise_or_set, true_position,
};
use criterion::{Criterion, criterion_group, criterion_main};

/// 1 Nov 2026, 0h UT.
const JD: f64 = 2_461_345.5;

fn bench(c: &mut Criterion) {
    c.bench_function("true_position: 8 bodies", |b| {
        b.iter(|| {
            for body in Body::ALL {
                black_box(true_position(body, black_box(JD)));
            }
        });
    });
    c.bench_function("sunrise: Kathmandu", |b| {
        b.iter(|| {
            next_rise_or_set(
                Body::Sun,
                black_box(JD),
                27.7172,
                85.324,
                Crossing::Rise,
                0.0,
            )
        });
    });
    c.bench_function("moonrise: Kathmandu", |b| {
        b.iter(|| {
            next_rise_or_set(
                Body::Moon,
                black_box(JD),
                27.7172,
                85.324,
                Crossing::Rise,
                0.0,
            )
        });
    });
    c.bench_function("next lunar eclipse", |b| {
        b.iter(|| next_eclipse(black_box(JD), EclipseKind::Lunar, Direction::Forward));
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);
