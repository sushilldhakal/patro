"""Calculation identity is single-sourced, and stays separate from provenance.

Identity ("what calculation is this?") lives in cache keys. Provenance ("how was
it computed?") lives in a column. Version ("has the shape changed?") forces
recomputation. Mixing any two of them breaks the other.

See docs/calculation-identity.md.
"""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

import pytest

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.provenance import current_provenance
from services.panchanga_cache import resolve_cache_keys

ROOT = Path(__file__).resolve().parent.parent

OBSERVERS = [
    ("default", DEFAULT_LOCATION),
    ("city", ObserverLocation(lat=26.65, lon=86.20, name="Siraha", city_id=1283000)),
    ("near_ktm", ObserverLocation(lat=27.72, lon=85.33, timezone="Asia/Kathmandu")),
    ("far_raw", ObserverLocation(lat=26.5833, lon=88.0667, timezone="Asia/Kathmandu")),
    ("elevated", ObserverLocation(lat=27.7172, lon=85.3240, altitude=1400.0)),
]


class TestLocationIdentityIsSingleSourced:
    def test_response_cache_delegates_rather_than_reimplementing(self):
        """``response_cache.location_cache_key`` must be ``resolve_cache_keys``
        plus filesystem escaping — not a second set of rules. Two independent
        definitions of "same observer" would silently split caches."""
        from services.response_cache import location_cache_key

        for name, loc in OBSERVERS:
            canonical = resolve_cache_keys(loc)[0]
            escaped = canonical.replace(":", "_").replace("/", "_")
            assert location_cache_key(loc) == escaped, f"diverged for {name}"

    def test_no_third_location_key_implementation_appears(self):
        """Guard against a new module growing its own location key."""
        pattern = re.compile(r"f?[\"']\{?(lat|location\.lat)[^\"']*_\{?(lon|location\.lon)")
        offenders: list[str] = []
        for pkg in ("engine", "services", "api", "app", "rules"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts or path.name == "location.py":
                    continue
                for lineno, line in enumerate(path.read_text().splitlines(), start=1):
                    if pattern.search(line.split("#", 1)[0]):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}")
        assert not offenders, (
            "a second location-identity key is being built by hand — use "
            "services.panchanga_cache.resolve_cache_keys: " + ", ".join(offenders)
        )

    def test_altitude_participates_in_identity(self):
        """Phase 1: two observers at one town's coordinates but different
        elevations see rise/set ~6.3 min apart, so they are different
        calculations and must not share a cache row."""
        sea = ObserverLocation(lat=27.7172, lon=85.3240)
        high = ObserverLocation(lat=27.7172, lon=85.3240, altitude=1400.0)
        assert resolve_cache_keys(sea)[0] != resolve_cache_keys(high)[0]


class TestIdentityStaysSeparateFromProvenance:
    def test_provenance_hash_is_not_in_any_cache_key(self):
        live = current_provenance().provenance_hash
        for _name, loc in OBSERVERS:
            assert live not in resolve_cache_keys(loc)[0]

    def test_kundali_identity_carries_ayanamsha(self):
        """Ayanamsha varies on this path (5 endpoints accept it as a query
        parameter), so it must be part of identity. Lahiri and KP produce
        genuinely different charts."""
        from services.kundali_report_cache import make_cache_key

        a = make_cache_key("1993-06-12T10:30:00", DEFAULT_LOCATION, "lahiri", "ne")
        b = make_cache_key("1993-06-12T10:30:00", DEFAULT_LOCATION, "kp", "ne")
        assert a != b

    def test_panchanga_identity_omits_ayanamsha_because_it_is_constant(self):
        """The mirror-image rule. The daily panchanga path never passes
        ``ayanamsa=`` — every day is Lahiri — so keying it would add a constant
        to every key. Verified by inspection of the builders."""
        for module in ("engine/vedic/daily.py", "services/panchanga_api.py"):
            source = (ROOT / module).read_text()
            assert "ayanamsa=" not in source, (
                f"{module} now varies ayanamsha — it must become part of the "
                "panchanga cache identity, and this test must be updated"
            )


class TestKundaliCacheRecordsProvenance:
    @pytest.fixture()
    def db(self, tmp_path, monkeypatch):
        import services.kundali_report_cache as kc

        path = tmp_path / "kundali.db"
        monkeypatch.setattr(kc, "kundali_db_path", lambda: path)
        return kc, path

    def test_schema_has_provenance_column_and_index(self, db):
        kc, path = db
        kc.ensure_schema()
        conn = sqlite3.connect(path)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(kundali_report_cache)")}
        idx = {
            r[0]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index' "
                "AND tbl_name='kundali_report_cache'"
            )
        }
        conn.close()
        assert "provenance_hash" in cols
        assert "idx_kundali_report_cache_provenance" in idx

    def test_migration_is_additive_and_idempotent(self, db):
        kc, path = db
        conn = sqlite3.connect(path)
        conn.executescript(
            """CREATE TABLE kundali_report_cache (
                 cache_key TEXT PRIMARY KEY, birth_instant TEXT NOT NULL,
                 location_key TEXT NOT NULL, ayanamsha TEXT NOT NULL,
                 lang TEXT NOT NULL, payload_json TEXT NOT NULL,
                 computed_at TEXT NOT NULL);"""
        )
        conn.execute(
            "INSERT INTO kundali_report_cache VALUES "
            "('k','1993-06-12','city:1','lahiri','ne','{}','now')"
        )
        conn.commit()
        conn.close()

        kc.ensure_schema()
        kc.ensure_schema()  # must not raise duplicate-column

        conn = sqlite3.connect(path)
        row = conn.execute(
            "SELECT payload_json, provenance_hash FROM kundali_report_cache"
        ).fetchone()
        conn.close()
        assert row == ("{}", None)  # data preserved, new column NULL

    def test_written_reports_carry_the_live_hash(self, db):
        kc, path = db
        kc.ensure_schema()
        key = kc.make_cache_key("1993-06-12T10:30:00", DEFAULT_LOCATION, "lahiri", "ne")
        kc.store_report_cache(
            key,
            birth_instant="1993-06-12T10:30:00",
            location=DEFAULT_LOCATION,
            ayanamsha="lahiri",
            lang="ne",
            records=[{"section": "test"}],
        )
        conn = sqlite3.connect(path)
        stored = conn.execute(
            "SELECT DISTINCT provenance_hash FROM kundali_report_cache"
        ).fetchall()
        conn.close()
        assert stored == [(current_provenance().provenance_hash,)]
