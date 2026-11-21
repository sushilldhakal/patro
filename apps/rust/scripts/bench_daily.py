#!/usr/bin/env python3
"""Python side of crates/panchanga/benches/daily.rs, memos cleared (the lunar-year cache is
kept warm on both sides, as it is on a running server).

    cd apps/api && ../../.venv/bin/python ../rust/scripts/bench_daily.py
"""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.engine import default_engine as engine  # noqa: E402
from engine.astronomy.jd_calendar import civil_day_jd_from_date  # noqa: E402
from engine.astronomy.location import DEFAULT_LOCATION as LOC  # noqa: E402
from engine.astronomy.moon import calculate_moonrise_after, calculate_moonset_after, moon_service  # noqa: E402
from engine.astronomy.rashi import rashi_service  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.astronomy.sun import sun_service  # noqa: E402
from engine.astronomy.ut_instant import as_julian_day  # noqa: E402
from engine.calendar import bikram_sambat as bs  # noqa: E402
from engine.panchanga import daily  # noqa: E402
from engine.panchanga.angas import panchanga_service  # noqa: E402
from engine.panchanga.element_boundaries import (  # noqa: E402
    build_karana_block, build_nakshatra_block, build_tithi_block, build_yoga_block,
)
from engine.panchanga.ghati_time import compute_dinamaan  # noqa: E402
from engine.panchanga.rashi_spans import (  # noqa: E402
    build_chandra_rashi_spans, build_nakshatra_pada_spans, get_surya_nakshatra,
)
from engine.panchanga.tithi import calculate_tithi  # noqa: E402


def clear():
    engine.cache_clear()
    engine._rise_cache.clear()
    bs._solve_bs_month_start_civil.cache_clear()


def tier_a(d: date) -> None:
    jd = civil_day_jd_from_date(d)
    tz = LOC.timezone
    sr = sun_service.sunrise(jd, LOC)
    ss = sun_service.sunset(jd, LOC)
    nsr = sun_service.sunrise(jd + 1, LOC)
    calculate_moonrise_after(sr, latitude=LOC.lat, longitude=LOC.lon, timezone_name=tz)
    calculate_moonset_after(sr, latitude=LOC.lat, longitude=LOC.lon, timezone_name=tz)
    info = calculate_tithi(sr)
    sjd = as_julian_day(sr)
    panchanga_service.vara(sjd, tz)
    bs.gregorian_to_bs(d)
    compute_dinamaan(sr, ss), compute_dinamaan(ss, nsr)
    daily._time_block(sr, tz, nearest_minute=True), daily._time_block(ss, tz, nearest_minute=True)
    build_tithi_block(sr, sr, info, tz), build_nakshatra_block(sr, sr, timezone_name=tz)
    build_yoga_block(sr, sr, timezone_name=tz), build_karana_block(sr, sr, tz)
    rashi_service.chandra(sjd).to_payload(), rashi_service.surya(sjd).to_payload(), moon_service.phase(sjd)
    build_chandra_rashi_spans(sr, nsr, tz), build_nakshatra_pada_spans(sr, nsr, tz), get_surya_nakshatra(sr)


def best(fn, repeat=5):
    times = []
    for _ in range(repeat):
        clear()
        t = time.perf_counter()
        fn()
        times.append(time.perf_counter() - t)
    return min(times)


day = date(2026, 11, 1)
month = [day + timedelta(days=i) for i in range(30)]
with use_siddhanta(SURYA_SIDDHANTA):
    print(f"{'tier A, one day':30s} {best(lambda: tier_a(day)) * 1e3:9.2f} ms")
    print(f"{'tier A, 30-day month':30s} {best(lambda: [tier_a(d) for d in month], 3) * 1e3:9.2f} ms")
    print(f"{'full daily payload, one day':30s} {best(lambda: daily.build_daily_panchanga(day, LOC), 5) * 1e3:9.2f} ms")
    print(f"{'full daily, 30-day month':30s} {best(lambda: [daily.build_daily_panchanga(d, LOC) for d in month], 3) * 1e3:9.2f} ms")
