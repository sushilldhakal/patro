#!/usr/bin/env python3
"""Golden files for the Rust engine layer: timescale, engine, panchanga, calendar.

Every value comes from the production Python modules, computed under the Surya
Siddhanta (the system a request gets without ``siddhanta=``).

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_engine_golden.py

Writes ``crates/<crate>/tests/fixtures/*_golden.json`` under apps/rust.
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path.cwd()))

import swisseph as swe  # noqa: E402

from engine.astronomy.engine import default_engine as engine  # noqa: E402
from engine.astronomy.jd_calendar import CivilDay  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.astronomy.timescale import resolve_observer_timezone  # noqa: E402
from engine.astronomy.ut_instant import local_civil_fields, UtInstant  # noqa: E402

RUST = Path(__file__).resolve().parents[1]
rng = random.Random(20261121)
ZONES = ["Asia/Kathmandu", "America/New_York", "Australia/Sydney", "Europe/London", "Asia/Kolkata", "UTC"]
PLACES = [
    (27.7172, 85.324, "Asia/Kathmandu"),
    (28.2096, 83.9856, "Asia/Kathmandu"),
    (26.4525, 87.2718, "Asia/Kathmandu"),
    (40.7143, -74.006, "America/New_York"),
    (-33.8679, 151.2073, "Australia/Sydney"),
    (51.5085, -0.1257, "Europe/London"),
    (28.6519, 77.2315, "Asia/Kolkata"),
]


def iso(value) -> str:
    return f"jd:{value.jd_ut!r}" if isinstance(value, UtInstant) else value.isoformat()


def rand_datetime(lo_year: int = 1700, hi_year: int = 2200) -> datetime:
    start = datetime(lo_year, 1, 1, tzinfo=timezone.utc)
    span = (datetime(hi_year, 1, 1, tzinfo=timezone.utc) - start).total_seconds()
    return start + timedelta(seconds=rng.uniform(0, span), microseconds=rng.randrange(1_000_000))


def write(crate: str, name: str, data: dict) -> None:
    out = RUST / "crates" / crate / "tests" / "fixtures" / f"{name}_golden.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"wrote {out.relative_to(RUST)} ({out.stat().st_size // 1024} KB, {sum(len(v) for v in data.values())} cases)")


def timescale_golden() -> dict:
    days = [(rng.randint(-5000, 9999), rng.randint(1, 12), rng.randint(1, 28)) for _ in range(400)]
    days += [(1582, 10, d) for d in range(1, 20)] + [(y, 2, 29) for y in (-400, -100, 0, 4, 1600, 1700, 2000)]
    jds = [rng.uniform(-1_000_000, 5_373_484) for _ in range(400)] + [2299160.5, 2299159.5, 1830691.5, 0.0, -0.5]
    dts = [rand_datetime(1, 9999) for _ in range(300)] + [rand_datetime(1900, 2100) for _ in range(300)]
    civil_days = [CivilDay(rng.randint(1583, 2200), rng.randint(1, 12), rng.randint(1, 28)) for _ in range(150)]
    civil_days += [CivilDay(1986, 1, 1), CivilDay(1920, 1, 1), CivilDay(2026, 3, 8), CivilDay(2026, 11, 1),
                   CivilDay(-300, 6, 1), CivilDay(1500, 1, 1)]
    return {
        "julday": [[y, m, d, h, cal, swe.julday(y, m, d, h, cal)]
                   for (y, m, d), h in zip(days, (rng.uniform(0, 24) for _ in days)) for cal in (swe.JUL_CAL, swe.GREG_CAL)],
        "revjul": [[jd, cal, *swe.revjul(jd, cal)] for jd in jds for cal in (swe.JUL_CAL, swe.GREG_CAL)],
        "civil_to_jd": [[y, m, d, CivilDay(y, m, d).to_jd_ut()] for y, m, d in days],
        "civil_from_jd": [[jd, *CivilDay.from_jd_ut(jd)] for jd in jds],
        "julian_day": [[dt.isoformat(), engine.julian_day(dt)] for dt in dts],
        "datetime_from_jd": [[jd, iso(engine.datetime_from_jd(jd))] for jd in jds + [engine.julian_day(dt) for dt in dts[:200]]],
        "midnight_offset_days": [[z, c.year, c.month, c.day, engine._utc_offset_days(c, resolve_observer_timezone(z))]
                                 for z in ZONES for c in civil_days],
        "local_day": [[z, jd, *local_civil_fields(engine.datetime_from_jd(jd), z)[:3]]
                      for z in ZONES for jd in [rng.uniform(1_000_000, 2_600_000) for _ in range(60)]],
    }


def engine_golden() -> dict:
    jds = [rng.uniform(1_000_000, 2_600_000) for _ in range(300)]
    out = {
        "longitudes": [[jd, *engine.sun_moon_longitudes(jd)] for jd in jds],
        "rise_set": [],
    }
    for lat, lon, zone in PLACES:
        for _ in range(25):
            jd = rng.choice([rng.uniform(2_200_000, 2_500_000), rng.uniform(2_440_000, 2_480_000)])
            civil = CivilDay.from_jd_ut(jd)
            for body in ("sun", "moon"):
                for kind, fn in (("rise", engine.rise), ("set", engine.set)):
                    date_val = civil.to_date() if civil.year >= 1 and civil >= CivilDay(1582, 10, 15) else civil
                    got = fn(date_val, body, lat, lon, 0.0, timezone_name=zone)
                    out["rise_set"].append([body, kind, civil.year, civil.month, civil.day, lat, lon, zone,
                                            None if got is None else iso(got)])
    return out


def panchanga_golden() -> dict:
    from engine.panchanga import element_boundaries as eb
    from engine.panchanga import tithi_boundaries as tb
    from engine.panchanga.angas import panchanga_service as ps

    jds = [rng.uniform(1_000_000, 2_600_000) for _ in range(400)] + [rng.uniform(2_440_000, 2_480_000) for _ in range(200)]
    dts = [rand_datetime(1600, 2200) for _ in range(120)]
    finders = {
        "tithi_end": tb.find_tithi_end, "tithi_start": tb.find_tithi_start,
        "nakshatra_end": eb.find_nakshatra_end, "nakshatra_start": eb.find_nakshatra_start,
        "yoga_end": eb.find_yoga_end, "yoga_start": eb.find_yoga_start,
        "karana_end": eb.find_karana_end, "karana_start": eb.find_karana_start,
        "moon_rashi_end": eb.find_moon_rashi_end, "moon_pada_end": eb.find_moon_pada_end,
        "sun_nakshatra_end": eb.find_sun_nakshatra_end,
    }
    return {
        "angas": [[jd, ps.tithi(jd), ps.nakshatra(jd), ps.yoga(jd), ps.karana(jd)] for jd in jds],
        "vara": [[jd, z, ps.vara(jd, z)["number"]] for jd in jds[:200] for z in ZONES],
        "finders": [[name, dt.isoformat(), fn(dt).isoformat()] for dt in dts for name, fn in finders.items()],
    }


def calendar_golden() -> dict:
    from engine.calendar.bikram_sambat import (
        bs_to_gregorian, get_bs_month_length, get_bs_month_start_civil, gregorian_to_bs,
    )
    from engine.calendar.sankranti import find_sankranti_after_jd

    years = list(range(1970, 2111)) + [rng.randint(1700, 2800) for _ in range(40)] + [-1, 1, 2, 100, -500, -3000]
    starts = [[y, m, *get_bs_month_start_civil(y, m)] for y in years for m in range(1, 13)]
    lengths = [[y, m, get_bs_month_length(y, m)] for y in years[:141] for m in range(1, 13)]
    greg = []
    for _ in range(300):
        d = datetime(rng.randint(1700, 2150), rng.randint(1, 12), rng.randint(1, 28)).date()
        greg.append([d.year, d.month, d.day, *gregorian_to_bs(d)])
    bs = []
    for y, m, length in lengths[:600]:
        day = rng.randint(1, length)
        g = bs_to_gregorian(y, m, day)
        bs.append([y, m, day, g.year, g.month, g.day])
    sankranti = [[r, jd, find_sankranti_after_jd(r, jd, max_days=45)]
                 for jd in [rng.uniform(1_000_000, 2_600_000) for _ in range(150)] for r in (rng.randrange(12),)]
    return {"month_start": starts, "month_length": lengths, "civil_to_bs": greg, "bs_to_civil": bs, "sankranti": sankranti}


with use_siddhanta(SURYA_SIDDHANTA):
    write("timescale", "timescale", timescale_golden())
    write("astronomy", "engine", engine_golden())
    write("panchanga", "panchanga", panchanga_golden())
    write("calendar", "calendar", calendar_golden())
