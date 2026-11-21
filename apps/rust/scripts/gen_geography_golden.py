#!/usr/bin/env python3
"""Golden city lookups and location resolution from the production Python.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_geography_golden.py
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from services.geography import cities_db as cdb  # noqa: E402
from services.geography.observer_location import resolve_location_from_query  # noqa: E402

rng = random.Random(7)
searches = ["Ka", "Po", "Bh", "Dh", "Bi", "Ja", "Bu", "Ne", "La", "Hetauda", "kanchanpur", "कञ्चनपुर", "mahendranagar",
            "Kathmandu", "new york", "Sydney", "lal", "zzzz", "Patan", "bhimdatta"]
queries = [
    {}, {"city_id": 1283240}, {"city_id": 5128581}, {"city": "Pokhara"}, {"city": "kanchanpur"},
    {"lat": 27.7172, "lon": 85.324}, {"lat": 27.70012, "lon": 85.33333}, {"lat": 28.2, "lon": 83.98},
    {"lat": 40.71, "lon": -74.0, "timezone": "America/New_York"}, {"lat": 51.5, "lon": -0.12, "timezone": "Europe/London"},
    {"timezone": "Asia/Kolkata"}, {"lat": 0.0, "lon": -160.0, "timezone": "Pacific/Honolulu"},
    {"city_id": 1283240, "lat": 27.0}, {"lat": 29.9, "lon": 81.5},
]
queries += [{"lat": round(rng.uniform(26.4, 30.4), 5), "lon": round(rng.uniform(80.1, 88.1), 5)} for _ in range(40)]
out = {
    "search": [[q, [c for c in cdb.search_cities(q, limit=15)]] for q in searches],
    "popular": cdb.get_popular_cities(),
    "nearest": [[q["lat"], q["lon"], cdb.nearest_city(q["lat"], q["lon"])] for q in queries if "lat" in q and "lon" in q],
    "resolve": [[q, resolve_location_from_query(**q).as_dict()] for q in queries],
}
path = Path(__file__).resolve().parents[1] / "crates/geography/tests/fixtures/geography_golden.json"
path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
print("wrote", path.name, {k: len(v) for k, v in out.items()})
