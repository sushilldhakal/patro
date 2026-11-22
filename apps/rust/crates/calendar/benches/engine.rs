//! Speed of the engine layer, matched by `scripts/bench_engine.py` (Python, caches cleared).
#![expect(
    missing_docs,
    reason = "criterion_group! generates an undocumented pub fn"
)]

use std::hint::black_box;

use astronomy::engine::{Observer, rise_set_on_day};
use astronomy::surya_siddhanta::{Body, Crossing};
use criterion::{Criterion, criterion_group, criterion_main};
use timescale::{CivilDay, UtcInstant, Zone};

fn bench(c: &mut Criterion) {
    let jd = 2_461_345.5;
    let at = UtcInstant::from_utc(CivilDay::new(2026, 11, 1), 6, 30, 15, 123_456)
        .expect("valid instant");
    let observer = Observer {
        system: astronomy::System::SuryaSiddhanta,
        latitude: 27.7172,
        longitude: 85.324,
        zone: Zone::kathmandu(),
    };
    c.bench_function("all angas at an instant", |b| {
        b.iter(|| {
            let jd = black_box(jd);
            (
                panchanga::tithi(SS, jd),
                panchanga::nakshatra(SS, jd),
                panchanga::yoga(SS, jd),
                panchanga::karana(SS, jd),
            )
        });
    });
    c.bench_function("tithi end", |b| {
        b.iter(|| panchanga::tithi_end(SS, black_box(at)));
    });
    c.bench_function("sunrise, Kathmandu", |b| {
        b.iter(|| {
            rise_set_on_day(
                Body::Sun,
                black_box(CivilDay::new(2026, 11, 1)),
                &observer,
                Crossing::Rise,
            )
        });
    });
    c.bench_function("BS year: 12 month starts", |b| {
        b.iter(|| calendar::month_starts(black_box(2083)));
    });
}

criterion_group!(benches, bench);
criterion_main!(benches);

const SS: astronomy::System = astronomy::System::SuryaSiddhanta;
