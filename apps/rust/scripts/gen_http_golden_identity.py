#!/usr/bin/env python3
"""Golden HTTP responses for every route family, asked without gzip (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_identity.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()
import app.response_cache as rc  # noqa: E402

# Keep request-time route output (no Redis/disk payload reuse) while preserving
# route behavior and headers.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)

# One request per route family and status, from the other goldens, asked
# WITHOUT gzip: GZip's identity path still adds Vary to large bodies.
REQUESTS = [
 "/v1/panchanga/at-time?jd=2461365.5&clock=10:30&cv=6506&city_id=1283240",
 "/v1/panchanga/at-time?era=bs&year=2083&month=13&day=5&clock=10:30&city_id=1283240",
 "/v1/panchanga/at-time?jd=abc&clock=10:00&city_id=1283240",
 "/v1/panchanga/rashifal?date=2026-11-21&era=ad&period=daily&city_id=1283240&ayanamsha=kp",
 "/v1/panchanga/rashifal/janma?birth_tz=Asia/Kathmandu&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10&birth_clock=14:30&ayanamsha=true_citra",
 "/v1/kundali/vimshottari?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=lahiri",
 "/v1/planetary/positions?jd=2461365.5&clock=10:00&city_id=1283240&ayanamsha=raman",
 "/v1/shadbala?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=kp",
 "/v1/kundali/2083-08-05?era=bs&city_id=1283240&ayanamsha=nepal",
 "/v1/kundali/milan?boy_era=bs&boy_year=2050&boy_month=5&boy_day=10&boy_clock=14:30&girl_era=bs&girl_year=2052&girl_month=1&girl_day=3&girl_clock=06:15&ayanamsha=raman",
 "/meta/capabilities",
 "/about",
 "/v1/cities/search?q=kat&limit=10&language=ne&cv=6506",
 "/v1/nepal/cities/search?q=pok&limit=5&country=NP",
 "/v1/cities/nearest?lat=27.7172&lon=85.324",
 "/v1/nepal/cities/nearest?lat=28.2096&lon=83.9856&country=NP",
 "/v1/cities/nearest?lat=27.7172&lon=85.324&country=ZZ",
 "/v1/cities/popular",
 "/v1/nepal/cities/popular",
 "/v1/documents",
 "/v1/documents/bhagavad-gita",
 "/v1/documents/sri-rudram",
 "/v1/documents/not-a-slug",
 "/v1/documents/bhagavad-gita/chapters/1",
 "/v1/documents/bhagavad-gita/chapters/1?direction=sideways",
 "/v1/documents/bhagavad-gita/chapters/999",
 "/v1/documents/sri-rudram/chapters/1",
 "/v1/veda/details/devata/values",
 "/v1/veda/details/rishi/values?slug=rigveda",
 "/v1/veda/details/chhanda/values?slug=atharvaveda",
 "/v1/veda/details/devata?value=%E0%A4%B5%E0%A4%BE%E0%A4%9A%E0%A4%B8%E0%A5%8D%E0%A4%AA%E0%A4%A4%E0%A4%BF%E0%A4%83&slug=atharvaveda&limit=3",
 "/v1/veda/details/rishi?value=%E0%A4%85%E0%A4%A5%E0%A4%B0%E0%A5%8D%E0%A4%B5%E0%A4%BE&slug=atharvaveda&limit=3&offset=2",
 "/v1/veda/details/svara?value=%E0%A4%AE%E0%A5%87%E0%A4%A7%E0%A4%BE+%E0%A4%9C%E0%A4%A8%E0%A4%95&slug=atharvaveda&limit=2",
 "/v1/veda/details/unknown/values",
 "/v1/veda/daily?date=2024-06-01",
 "/v1/panchanga/elements",
 "/v1/panchanga/element/tithi/day/2083-08-15?era=bs&language=ne&cv=6506&city_id=1283240",
 "/v1/panchanga/element/chandra-rashi/day/2026-05-12?era=ad&language=en&cv=6506&city_id=5128581",
 "/v1/panchanga/element/nakshatra/day/2083-01-01?era=bs&city_id=1282898",
 "/v1/panchanga/element/unknown/day/2083-08-15?era=bs&city_id=1283240",
 "/v1/panchanga/element/tithi/day/not-a-date?era=ad&city_id=1283240",
 "/v1/panchanga/element/tithi/spans?era=bs&year=2083&month=8&city_id=1283240",
 "/v1/panchanga/element/nakshatra/spans?era=bs&year=2083&month=8&city_id=1282898",
 "/v1/panchanga/element/yoga/spans?start_jd=2461500&end_jd=2461530&city_id=5128581",
 "/v1/panchanga/element/karana/spans?start_jd=2461500&end_jd=2461505&city_id=1283240",
 "/v1/panchanga/element/chandra-rashi/spans?era=bs&year=2082&month=12&city_id=1283240",
 "/v1/panchanga/element/lagna/spans?era=bs&year=2083&month=8&city_id=1283240",
 "/v1/panchanga/element/tithi/spans?city_id=1283240",
 "/v1/panchanga/element/tithi/month/2083/8?city_id=1283240",
 "/v1/panchanga/element/chandra-rashi/month/2083/8?city_id=1282898",
 "/v1/panchanga/element/lagna/month/2083/8?city_id=1283240",
 "/v1/panchanga/element/tithi/month/2083/13?city_id=1283240",
 "/v1/panchanga/element/unknown/month/2083/8?city_id=1283240",
 "/v1/panchanga/element/yoga/day/2025-10-20?era=ad&language=ne&city_id=1283240",
 "/v1/panchanga/element/nakshatra/month/2082/12?city_id=5128581&language=en",
 "/v1/documents/rigveda",
 "/v1/documents/rigveda/chapters/1?limit=3&verse=1.1.1",
 "/v1/convert/bs-to-ad/13-01-03",
 "/v1/convert/bs-to-ad/-100-05-10",
 "/v1/calendar/header/13/1?city_id=1283240",
 "/v1/panchanga/-0044-03-15?era=ad&city_id=1283240",
 "/v1/panchanga/1500-01-01?era=ad&city_id=1283240&detail=false",
 "/v1/panchanga/jd/1705060.5?era=bbs&detail=false",
 "/v1/panchanga?era=bbs&year=100&month=5&day=10&city_id=5128581&detail=false",
 "/v1/panchanga/-0044-03-15?era=ad&reference=midnight&city_id=1283240",
 "/v1/panchanga/rashifal?era=ad&date=1500-01-01&city_id=1283240",
 "/v1/nepal/sait/2083/vivah/personalize?birth_era=ad&birth_year=1500&birth_month=1&birth_day=1&birth_clock=10:00",
 "/v1/nepal/sait/2083/annaprashan/personalize?birth_era=ad&birth_year=1500&birth_month=1&birth_day=1&gender=male",
 "/v1/panchanga/year/13/sun?city_id=1283240",
 "/v1/panchanga/element/tithi/month/13/1?city_id=1283240",
 "/v1/panchanga/element/nakshatra/month/1556/10",
 "/v1/nepal/gochar/-0044-03-15?era=ad",
 "/v1/nepal/gochar/jd/1705060.5?upcoming=true&city_id=5128581",
 "/v1/nepal/gochar/1556-10-05?era=bs&city_id=1282898",
 "/v1/nepal/gochar/year/13",
 "/v1/nepal/gochar/ingress?era=ad&from=1500-01-01&to=1500-03-01",
 "/v1/nepal/panchak/year/13",
 "/v1/nepal/graha-asta/year/13",
 "/v1/nepal/graha-vakri/year/13",
 "/v1/nepal/graha-sthiti/-0044-03-15?era=ad",
 "/v1/nepal/graha-sthiti/1500-01-01?era=ad&city_id=5128581",
 "/v1/nepal/eclipse/solar/year/13",
 "/v1/nepal/eclipse/lunar/year/1556",
 "/v1/panchanga/13/1?city_id=1283240",
 "/v1/panchanga/ad/1500/2?city_id=1283240",
 "/v1/panchanga/bc/45/3?city_id=1283240",
 "/v1/panchanga/2083-13-01?city_id=1283240&detail=true&slim=true",
 "/v1/nepal/sankranti/2083-13-01?era=bs",
 "/v1/panchanga/element/tithi/day/2083-13-01?city_id=1283240",
 "/v1/nepal/sankranti/२०८३-०८-१५?era=bs",
 "/v1/panchanga/abc?city_id=1283240&detail=true&slim=true",
 "/v1/nepal/sankranti/abc?era=bs",
 "/v1/panchanga/element/tithi/day/abc?city_id=1283240",
 "/v1/nepal/sankranti/-0044-03-15?era=bs",
 "/v1/panchanga/element/tithi/day/-0044-03-15?city_id=1283240",
 "/v1/calendar/header/2083/11?city_id=1283240",
 "/v1/convert/ad-to-bs/2026-03-12",
 "/v1/convert/bs-to-ad/not-a-date",
 "/v1/panchanga/jd/1705060.5?era=ad&city_id=1283240&reference=midnight",
 "/v1/nepal/eclipse/moon/year/2083",
 "/v1/nepal/eclipse/solar/year/0",
 "/v1/nepal/holidays?year=2083&era=bs&city_id=1283240",
 "/v1/nepal/special-months/2083?city_id=1283240",
 "/v1/nepal/sankranti/year/2026?city_id=1283240",
 "/v1/nepal/panchanga/year/2083?city_id=1283240",
 "/v1/nepal/holidays?year=2083&era=xyz&city_id=1283240",
 "/v1/nepal/sankranti/not-a-date?era=bs&city_id=1283240",
 "/v1/nepal/sankranti/2083-01-01?era=bbs&city_id=1283240",
 "/v1/nepal/special-months/0?city_id=1283240",
 "/v1/nepal/gochar/ingress?from=2026-11-30&to=2026-11-01&era=ad",
 "/v1/nepal/gochar/ingress?from=2026-11-01&level=hour",
 "/v1/nepal/gochar/2083-13-05?era=bs",
 "/v1/nepal/gochar/abc?era=ad",
 "/v1/nepal/gochar/jd/xyz",
 "/v1/nepal/gochar/year/0",
 "/v1/nepal/gochar/2026-11-21?era=ad&upcoming=maybe",
 "/v1/nepal/graha-sthiti/abc",
 "/v1/nepal/graha-asta/year/0?era=ad",
 "/v1/nepal/graha-vakri/year/0",
 "/v1/nepal/graha-vakri/year/x",
 "/v1/kundali/vimshottari?jd=2449220.5&clock=14:30&cycles=0",
 "/v1/kundali/vimshottari?jd=2449220.5",
 "/v1/planetary/positions?jd=abc&clock=10:00",
 "/v1/kundali/yogas/reference?v=3",
 "/v1/kundali/yogas/reference?id=999",
 "/v1/kundali/reference/bhava?v=2",
 "/v1/kundali/2026-11-21?era=bc",
 "/v1/kundali/2083-13-01?era=bs",
 "/v1/kundali/dasha/expand?lord=jupiter&start=2020-04-23T20:44:04.283502%2B00:00&end=2036-04-23T17:51:16.283502%2B00:00",
 "/v1/kundali/dasha/expand?lord=pluto&start=2020-01-01&end=2021-01-01",
 "/v1/kundali/dasha/expand?lord=sun",
 "/v1/kundali/milan?boy_jd=2449220.5&boy_clock=14:30",
 "/v1/kundali/milan?boy_year=0&boy_month=13&girl_jd=x",
 "/v1/panchanga/2083/7?clock=25:00&city_id=1283240",
 "/v1/panchanga/ad/2026/7?clock=06:00&city_id=1283240",
 "/v1/nepal/panchanga/2083-08-01?city_id=1283240",
 "/v1/nepal/panchanga/2081-11-30?city_id=1282898&format=canonical&language=ne",
 "/v1/nepal/panchanga/hello",
 "/v1/nepal/panchanga/2083-08-01?format=html",
 "/v1/nepal/panchanga/month/2083/8?city_id=1283240",
 "/v1/nepal/panchanga/month/2083/13",
 "/v1/nepal/panchanga/month/2083/8?format=x",
 "/v1/nepal/patro/2083/8?cv=6506",
 "/v1/nepal/patro/2083/13",
 "/v1/nepal/patro/2083/8?format=xx&locale=fr",
 "/v1/nepal/patro/abc/1",
 "/v1/nepal/patro/ad/2026/4?city_id=1283240",
 "/v1/nepal/patro/ad/2026/13",
 "/v1/nepal/patro/ad/x/1",
 "/v1/nepal/panchak/year/0?era=bs&language=ne",
 "/v1/nepal/panchak/year/abc",
 "/v1/panchanga/rashifal?date=2083-08-05&jd=abc&city_id=1283240",
 "/v1/panchanga/rashifal/janma",
 "/v1/panchanga/rashifal/janma?birth_year=abc&birth_month=1&birth_day=1",
 "/v1/panchanga/rashifal/personal?date=2026-11-21&era=ad&period=daily&cv=6506&city_id=1283240&birth_lat=27.7&birth_lon=85.3&birth_tz=Asia/Kathmandu&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10&birth_clock=14:30",
 "/v1/panchanga/rashifal/personal?date=2026-11-21&era=ad&city_id=1283240&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10",
 "/v1/panchanga/rashifal/personal?date=2026-11-21&era=ad&city_id=1283240&birth_lat=27.7&birth_lon=85.3",
 "/v1/nepal/sait/categories?era=bs&language=ne&cv=6506",
 "/v1/nepal/sait/years?era=ad&language=en&cv=6506",
 "/v1/nepal/sait/about?era=bs&language=ne",
 "/v1/nepal/sait/vivah/about?era=bs&language=ne",
 "/v1/nepal/sait/annaprasan/about?era=ad&language=en",
 "/v1/nepal/sait/unknown/about?era=bs&language=ne",
 "/v1/nepal/sait/2083/month/7?era=bs&language=ne&cv=6506&city_id=1283240",
 "/v1/nepal/sait/2083/month/13?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/month/7?era=bs&city_id=abc",
 "/v1/nepal/sait/2083/vivah?era=bs&language=ne&cv=6506&city_id=1283240",
 "/v1/nepal/sait/2083/griha-pravesh?era=bs&language=ne&city_id=1283240",
 "/v1/nepal/sait/2083/rudri-jurne?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/agni-jurne?era=ad&language=en&city_id=1282898",
 "/v1/nepal/sait/2083/annaprasan?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/unknown?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/vivah/detail?era=bs&language=ne&city_id=1283240",
 "/v1/nepal/sait/2083/bratabandha/detail?era=bs&city_id=1283240&nakshatra_mode=nepali",
 "/v1/nepal/sait/2083/griha-aarambha/detail?era=bs&language=en&city_id=5128581",
 "/v1/nepal/sait/2083/rudri-jurne/detail?era=bs&city_id=1283240",
 "/v1/nepal/sait/0/vivah/detail?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/bratabandha/detail?era=bs&city_id=1283240&nakshatra_mode=bogus",
 "/v1/nepal/sait/2083/annaprasan/personalize?era=bs&city_id=1283240&birth_era=bs&birth_year=2082&birth_month=10&birth_day=5&gender=female",
 "/v1/nepal/sait/2083/griha-pravesh/personalize?era=bs&city_id=1282898&janma_nakshatra=10&janma_rashi=5",
 "/v1/nepal/sait/2083/vivah/personalize?era=bs&city_id=1283240",
 "/v1/nepal/sait/2083/vivah/personalize?era=bs&city_id=1283240&janma_nakshatra=x&janma_rashi=2",
 "/v1/vastu/zones",
 "/v1/vastu/zones?kind=bogus",
 "/v1/vastu/zones/dir8/north",
 "/v1/vastu/zones/dir8/center",
 "/v1/vastu/zones/dir16/nne",
 "/v1/vastu/zones/pada32/aditi",
 "/v1/vastu/zones/inner4/aryama",
 "/v1/vastu/zones/pada32/nothing",
 "/v1/vastu/zones/dir32/north",
 "/v1/vastu/rooms",
 "/v1/vastu/rooms/puja/detail",
 "/v1/vastu/rooms/kitchen/detail",
 "/v1/vastu/rooms/master_bedroom/detail",
 "/v1/vastu/rooms/main_door/detail",
 "/v1/vastu/rooms/living/detail",
 "/v1/vastu/rooms/septic/detail",
 "/v1/vastu/rooms/nothing/detail",
 "/v1/panchanga/year/2083?wheel=true&language=ne&cv=6506&city_id=1283240",
 "/v1/panchanga/year/abc?city_id=1283240",
 "/v1/panchanga/year/0?city_id=1283240",
 "/v1/panchanga/year/2083?wheel=maybe",
 "/v1/panchanga/year/2083/sun?era=xx",
 "/v1/panchanga/ad/abc/1",
 "/v1/panchanga/bc/0/1",
 "/v1/panchanga/bc/x/1"
]

KEEP = (
    "cache-control",
    "cdn-cache-control",
    "vary",
    "content-type",
    "x-siddhanta",
    "x-ayanamsha",
)

client = TestClient(app)
out = []
for path in REQUESTS:
    response = client.get(path, headers={"Accept-Encoding": "identity"})
    out.append(
        {
            "path": path,
            "status": response.status_code,
            "headers": {k: response.headers[k] for k in KEEP if k in response.headers},
            "body": response.text,
        }
    )
    print(response.status_code, len(response.text), path)

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_identity.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
