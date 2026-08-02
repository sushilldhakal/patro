"""EnvironmentProvenance: derived from reality, deterministic, correctly bounded.

Three properties, each with a way to fail:

1. **Derived, not typed.** Every field is read from the running system. The
   guard that matters is #3 below — during investigation the live tidal
   acceleration turned out to be -25.936 while the documented default is -25.8,
   so a hand-written record would have been wrong immediately.
2. **Deterministic**, across calls, processes, and machines with the same
   environment.
3. **Correctly bounded.** Ayanamsha is a request input, not an environment fact.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from dataclasses import replace
from pathlib import Path

import pytest
import swisseph as swe

from engine.astronomy import engine as engine_module
from engine.astronomy.provenance import (
    CORRECTION_CONSTANT_NAMES,
    DELTA_T_MODEL_NAMES,
    DELTA_T_PROBE_JD,
    EnvironmentProvenance,
    current_provenance,
)

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def prov() -> EnvironmentProvenance:
    return current_provenance()


class TestDerivedFromRuntime:
    """Values must come from the running system, not from literals."""

    def test_swisseph_identity_matches_the_library(self, prov):
        assert prov.swisseph_version == str(swe.version)
        assert prov.pyswisseph_build == str(swe.__version__)

    def test_tidal_acceleration_is_read_not_assumed(self, prov):
        """The finding that motivates this whole module.

        ``swe.TIDAL_DEFAULT`` is -25.8; the value actually in force is -25.936,
        auto-selected to match the DE441 files. Anyone writing provenance from
        documentation would have recorded the wrong number on day one.
        """
        assert prov.tidal_acceleration == swe.get_tid_acc()
        assert prov.tidal_acceleration != swe.TIDAL_DEFAULT

    def test_jpl_denum_is_read_from_the_loaded_file(self, prov):
        swe.calc_ut(2451545.0, swe.SUN, swe.FLG_SWIEPH)
        assert prov.jpl_denum == int(swe.get_current_file_data(0)[3])

    def test_denum_is_stable_regardless_of_prior_calculations(self):
        """``get_current_file_data`` is mutable global state — it reports the
        *last-used* file. Provenance runs its own fixed probe first, so the
        answer cannot depend on which date the process happened to compute."""
        swe.calc_ut(625673.5, swe.SUN, swe.FLG_SWIEPH)  # 3000 BCE file
        a = EnvironmentProvenance.current().jpl_denum
        swe.calc_ut(2461201.5, swe.SUN, swe.FLG_SWIEPH)  # modern file
        b = EnvironmentProvenance.current().jpl_denum
        assert a == b

    def test_ephemeris_inventory_matches_the_directory(self, prov):
        from engine.astronomy.paths import ephemeris_path

        files = list(ephemeris_path().glob("*.se1"))
        assert prov.ephemeris_file_count == len(files)
        assert prov.ephemeris_total_bytes == sum(f.stat().st_size for f in files)
        assert prov.ephemeris_configured is bool(files)

    def test_correction_constants_are_read_from_the_engine(self, prov):
        """The anti-drift guard: values must *be* the engine's, not copies."""
        captured = dict(prov.correction_constants)
        assert set(captured) == set(CORRECTION_CONSTANT_NAMES)
        for name in CORRECTION_CONSTANT_NAMES:
            assert captured[name] == float(getattr(engine_module, name)), (
                f"{name} in provenance does not match engine.astronomy.engine"
            )

    def test_provenance_module_hardcodes_no_constant_values(self):
        """Every correction constant must be referenced by *name* and read from
        the engine. A literal here would be a second source of truth that
        silently diverges the moment someone edits engine.py."""
        source = (ROOT / "engine" / "astronomy" / "provenance.py").read_text()
        body = source.split("CORRECTION_CONSTANT_NAMES")[1].split(")")[0]
        for value in ("1.76", "0.75", "86400.0"):
            assert value not in body, (
                f"provenance.py appears to hardcode {value} in the constant list"
            )


class TestDeltaT:
    def test_model_identity_is_read_from_the_library(self, prov):
        assert prov.delta_t_model_id == int(swe.MOD_DELTAT_DEFAULT)
        assert prov.delta_t_model_name == "stephenson_etc_2016"

    def test_model_name_map_covers_every_model_the_library_has(self):
        """Upgrade tripwire. swisseph has no ``get_delta_t_model_name``, so these
        names are hand-written. If a future release adds a sixth model this fails
        rather than silently labelling it ``unknown_6``."""
        assert set(DELTA_T_MODEL_NAMES) == set(range(1, int(swe.MOD_NDELTAT) + 1))

    def test_probes_match_the_library(self, prov):
        captured = dict(prov.delta_t_probes)
        for jd in DELTA_T_PROBE_JD:
            assert captured[repr(jd)] == pytest.approx(swe.deltat(jd) * 86400.0)

    def test_probes_grow_going_back_in_time(self, prov):
        """Sanity on the physics: ΔT is ~64 s now and ~21 h at 3000 BCE."""
        captured = dict(prov.delta_t_probes)
        assert captured["2451545.0"] == pytest.approx(63.8, abs=1.0)
        assert captured["625673.5"] > 70_000  # ~20.9 h

    def test_probes_observe_a_userdef_override_the_constant_cannot(self):
        """Why probes exist at all.

        ``set_delta_t_userdef`` replaces ΔT wholesale while
        ``MOD_DELTAT_DEFAULT`` keeps reporting 5. Recording only the constant
        would therefore be a claim about configuration that the behaviour
        contradicts. The probes catch it; the hash changes.
        """
        before = EnvironmentProvenance.current()
        try:
            swe.set_delta_t_userdef(0.5)
            during = EnvironmentProvenance.current()
            assert during.delta_t_model_id == before.delta_t_model_id  # constant blind
            assert during.delta_t_probes != before.delta_t_probes      # probes see it
            assert during.provenance_hash != before.provenance_hash
        finally:
            swe.set_delta_t_userdef(swe.DELTAT_AUTOMATIC)
        assert EnvironmentProvenance.current().provenance_hash == before.provenance_hash


class TestHashDeterminism:
    def test_same_environment_same_hash(self, prov):
        assert EnvironmentProvenance.current().provenance_hash == prov.provenance_hash

    def test_hash_is_stable_across_processes(self, prov):
        """A container restart, or a second replica, must agree."""
        out = subprocess.run(
            [sys.executable, "-c",
             "from engine.astronomy.provenance import current_provenance;"
             "print(current_provenance().provenance_hash)"],
            cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        assert out.returncode == 0, out.stderr
        assert out.stdout.strip() == prov.provenance_hash

    def test_hash_excludes_machine_specific_paths(self, prov):
        """Two hosts running the same image must agree, so absolute paths are
        diagnostics only. They are recorded, but never hashed."""
        assert "ephemeris_dir" not in prov.hash_payload()
        assert "library_path" not in prov.hash_payload()
        assert prov.ephemeris_dir  # still captured for diagnosis
        moved = replace(prov, ephemeris_dir="/somewhere/else", library_path="/other")
        assert moved.provenance_hash == prov.provenance_hash

    def test_hash_covers_exactly_the_declared_fields(self, prov):
        payload = prov.hash_payload()
        assert set(payload) == set(prov.HASHED_FIELDS)
        recomputed = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        assert recomputed == prov.provenance_hash

    @pytest.mark.parametrize("field_name,new_value", [
        ("swisseph_version", "9.9.9"),
        ("pyswisseph_build", "19700101"),
        ("ephemeris_file_count", 7),
        ("ephemeris_total_bytes", 1),
        ("ephemeris_content_sha256", "deadbeef"),
        ("jpl_denum", 431),
        ("delta_t_model_id", 4),
        ("delta_t_model_name", "espenak_meeus_2006"),
        ("tidal_acceleration", -25.8),
        ("ephemeris_configured", False),
    ])
    def test_changing_any_input_changes_the_hash(self, prov, field_name, new_value):
        mutated = replace(prov, **{field_name: new_value})
        assert mutated.provenance_hash != prov.provenance_hash
        assert field_name in prov.differences(mutated)

    def test_changing_a_correction_constant_changes_the_hash(self, prov):
        bumped = tuple(
            (n, 15.0 if n == "REFRACTION_TEMPERATURE" else v)
            for n, v in prov.correction_constants
        )
        mutated = replace(prov, correction_constants=bumped)
        assert mutated.provenance_hash != prov.provenance_hash
        assert "correction_constants" in prov.differences(mutated)

    def test_file_ordering_does_not_affect_the_hash(self, tmp_path):
        """``Path.glob`` returns filesystem order — verified unsorted on this
        tree. The digest must depend on the file *set*, not on the order the
        directory happened to be written."""
        from engine.astronomy.provenance import (
            _ephemeris_content_digest,
            _ephemeris_inventory,
        )

        for name, data in [("semo_00.se1", b"aaa"), ("sepl_18.se1", b"bbb"), ("seplm30.se1", b"ccc")]:
            (tmp_path / name).write_bytes(data)
        inventory = _ephemeris_inventory(tmp_path)
        assert [n for n, _ in inventory] == sorted(n for n, _ in inventory)
        shuffled = list(reversed(inventory))
        assert _ephemeris_content_digest(tmp_path, inventory) != _ephemeris_content_digest(
            tmp_path, shuffled
        ), "digest must be order-sensitive, which is why the inventory is sorted first"
        # …and the sorted inventory is reproducible regardless of scan order.
        assert _ephemeris_inventory(tmp_path) == inventory

    def test_content_change_changes_the_digest(self, tmp_path):
        from engine.astronomy.provenance import (
            _ephemeris_content_digest,
            _ephemeris_inventory,
        )

        f = tmp_path / "sepl_18.se1"
        f.write_bytes(b"original")
        inv = _ephemeris_inventory(tmp_path)
        before = _ephemeris_content_digest(tmp_path, inv)
        f.write_bytes(b"modifiedX")
        after = _ephemeris_content_digest(tmp_path, _ephemeris_inventory(tmp_path))
        assert before != after

    def test_empty_ephemeris_directory_is_hashable(self, tmp_path):
        """A fresh checkout with no .se1 files runs on the Moshier fallback.
        That is a legitimate environment and must produce a hash, not a crash."""
        from engine.astronomy.provenance import (
            _ephemeris_content_digest,
            _ephemeris_inventory,
        )

        inv = _ephemeris_inventory(tmp_path)
        assert inv == []
        assert _ephemeris_content_digest(tmp_path, inv) == hashlib.sha256().hexdigest()


class TestBoundary:
    """Environment vs request. The line this module is built around."""

    def test_ayanamsha_is_not_part_of_environment_provenance(self, prov):
        payload = json.dumps(prov.as_dict()).lower()
        assert "ayanam" not in payload
        assert "lahiri" not in payload
        assert "krishnamurti" not in payload

    def test_computing_with_a_different_ayanamsha_does_not_change_the_hash(self, prov):
        """Lahiri and KP differ by 0.0968 degrees at J2000 — a real difference in
        output, from the same environment. If it moved the hash, the hash would
        stop being a deployment fingerprint."""
        from engine.astronomy.engine import (
            SIDM_KRISHNAMURTI,
            SIDM_LAHIRI,
            default_engine,
        )

        lahiri = default_engine.sun_longitude(2451545.0, ayanamsa=SIDM_LAHIRI)
        kp = default_engine.sun_longitude(2451545.0, ayanamsa=SIDM_KRISHNAMURTI)
        assert lahiri != kp
        assert EnvironmentProvenance.current().provenance_hash == prov.provenance_hash

    def test_no_cultural_or_presentation_data_enters_the_hash(self, prov):
        """Cultural constants, timezone eras, cache bucketing and presentation
        versions must not move an *astronomy environment* fingerprint."""
        payload = json.dumps(prov.hash_payload()).lower()
        for forbidden in (
            "gaurishankar", "kathmandu", "nepal", "festival", "timezone",
            "kmt", "ist", "npt", "snap", "payload_version",
        ):
            assert forbidden not in payload, f"{forbidden!r} leaked into the hash"


class TestDiagnostics:
    def test_differences_names_what_changed(self, prov):
        mutated = replace(prov, jpl_denum=431, tidal_acceleration=-25.8)
        diff = prov.differences(mutated)
        assert set(diff) == {"jpl_denum", "tidal_acceleration"}
        assert diff["jpl_denum"] == (prov.jpl_denum, 431)

    def test_identical_provenance_has_no_differences(self, prov):
        assert prov.differences(EnvironmentProvenance.current()) == {}

    def test_short_hash_prefixes_the_full_hash(self, prov):
        assert len(prov.short_hash) == 16
        assert prov.provenance_hash.startswith(prov.short_hash)

    def test_memoised_but_refreshable(self):
        assert current_provenance() is current_provenance()
        assert current_provenance(refresh=True) is not None


class TestCacheStorage:
    """provenance_hash is recorded as a queryable column — never a cache key."""

    @pytest.fixture()
    def db(self, tmp_path, monkeypatch):
        import services.panchanga_cache as pc

        path = tmp_path / "panchanga.db"
        monkeypatch.setattr(pc, "panchanga_db_path", lambda: path)
        monkeypatch.setenv("PANCHANGA_CACHE", "true")
        return path

    def _legacy_table(self, path):
        """A table in the pre-provenance shape, with one row in it."""
        import sqlite3

        conn = sqlite3.connect(path)
        conn.executescript(
            """CREATE TABLE panchanga_cache (
                 city_id INTEGER NOT NULL DEFAULT 0, location_key TEXT NOT NULL,
                 date TEXT NOT NULL, payload_json TEXT NOT NULL,
                 computed_at TEXT NOT NULL, PRIMARY KEY (location_key, date));"""
        )
        conn.execute(
            "INSERT INTO panchanga_cache VALUES (1,'city:1283240','2026-06-10','{}','now')"
        )
        conn.commit()
        conn.close()

    def test_migration_adds_the_column_to_an_existing_table(self, db):
        import sqlite3

        import services.panchanga_cache as pc

        self._legacy_table(db)
        conn = sqlite3.connect(db)
        assert "provenance_hash" not in {
            r[1] for r in conn.execute("PRAGMA table_info(panchanga_cache)")
        }
        conn.close()

        pc.ensure_schema()

        conn = sqlite3.connect(db)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(panchanga_cache)")}
        assert "provenance_hash" in cols
        # Existing data untouched; the new column reads NULL.
        row = conn.execute(
            "SELECT payload_json, provenance_hash FROM panchanga_cache"
        ).fetchone()
        assert row == ("{}", None)
        conn.close()

    def test_migration_is_idempotent(self, db):
        import services.panchanga_cache as pc

        self._legacy_table(db)
        pc.ensure_schema()
        pc.ensure_schema()  # must not raise "duplicate column name"
        import sqlite3

        conn = sqlite3.connect(db)
        assert conn.execute("SELECT COUNT(*) FROM panchanga_cache").fetchone()[0] == 1
        conn.close()

    def test_index_exists_for_selective_invalidation(self, db):
        import sqlite3

        import services.panchanga_cache as pc

        pc.ensure_schema()
        conn = sqlite3.connect(db)
        names = {
            r[0]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index' "
                "AND tbl_name='panchanga_cache'"
            )
        }
        assert "idx_panchanga_cache_provenance" in names
        conn.close()

    def test_null_provenance_rows_are_still_served(self, db):
        """Pre-provenance rows mean 'written before this existed'. They must not
        be treated as stale — that would be an invalidation, which this phase is
        explicitly not doing."""
        import services.panchanga_cache as pc

        self._legacy_table(db)
        pc.ensure_schema()
        import sqlite3

        conn = sqlite3.connect(db)
        n = conn.execute(
            "SELECT COUNT(*) FROM panchanga_cache WHERE provenance_hash IS NULL"
        ).fetchone()[0]
        conn.close()
        assert n == 1

    def test_written_rows_carry_the_live_hash(self, db):
        import sqlite3
        from datetime import date

        import services.panchanga_cache as pc
        from engine.astronomy.location import DEFAULT_LOCATION
        from engine.vedic.daily import get_daily_panchanga

        if not pc.cache_enabled():
            # PATRO_LOCAL_DEV=true (.env.local) disables the SQLite cache, so
            # nothing is written and there is no table to inspect. Same reason
            # tests/test_panchanga_cache.py cannot run on such a checkout.
            pytest.skip("panchanga SQLite cache disabled in this environment")

        get_daily_panchanga(date(2026, 6, 10), DEFAULT_LOCATION)
        conn = sqlite3.connect(db)
        stored = conn.execute(
            "SELECT DISTINCT provenance_hash FROM panchanga_cache"
        ).fetchall()
        conn.close()
        assert stored == [(current_provenance().provenance_hash,)]

    def test_provenance_is_not_in_the_cache_key(self):
        """The distinction the design rests on: a cache key answers 'which
        bucket?', provenance answers 'how was it produced?'. Keying on it would
        orphan every row whenever any dependency moved."""
        from engine.astronomy.location import DEFAULT_LOCATION
        from services.panchanga_cache import resolve_cache_keys

        key, _city = resolve_cache_keys(DEFAULT_LOCATION)
        assert key == "city:1283240"
        assert current_provenance().provenance_hash not in key

    def test_provenance_is_not_in_the_payload(self, db):
        """Provenance must not mix with presentation. It lives in a column."""
        from datetime import date

        from engine.astronomy.location import DEFAULT_LOCATION
        from engine.vedic.daily import build_daily_panchanga

        payload = build_daily_panchanga(date(2026, 6, 10), DEFAULT_LOCATION)
        assert "provenance_hash" not in payload
        assert "provenance" not in json.dumps(payload).lower()


class TestDriftDetection:
    """Detection is logging-only. Nothing is ever purged."""

    @pytest.fixture()
    def seeded(self, tmp_path, monkeypatch):
        import sqlite3

        import services.panchanga_cache as pc

        path = tmp_path / "panchanga.db"
        monkeypatch.setattr(pc, "panchanga_db_path", lambda: path)
        monkeypatch.setattr(pc, "cache_enabled", lambda: True)
        pc.ensure_schema()
        live = current_provenance().provenance_hash
        conn = sqlite3.connect(path)
        rows = [
            ("city:1", "2026-01-01", live),
            ("city:1", "2026-01-02", live),
            ("city:1", "2020-01-01", "0" * 64),   # a different environment
            ("city:1", "2019-01-01", None),        # pre-provenance
        ]
        conn.executemany(
            "INSERT INTO panchanga_cache "
            "(city_id, location_key, date, payload_json, computed_at, provenance_hash) "
            "VALUES (1,?,?,'{}','x',?)",
            rows,
        )
        conn.commit()
        conn.close()
        return pc, path

    def test_stored_hashes_are_queryable(self, seeded):
        pc, _ = seeded
        counts = dict(pc.stored_provenance_hashes())
        assert counts[current_provenance().provenance_hash] == 2
        assert counts["0" * 64] == 1
        assert counts[None] == 1

    def test_drift_is_reported_with_counts(self, seeded):
        pc, _ = seeded
        report = pc.report_provenance_drift()
        assert report["live_hash"] == current_provenance().provenance_hash
        assert report["rows_current"] == 2
        assert report["rows_pre_provenance"] == 1
        assert report["stale_hashes"] == [{"provenance_hash": "0" * 64, "rows": 1}]

    def test_drift_logs_a_warning(self, seeded, caplog):
        pc, _ = seeded
        with caplog.at_level("WARNING"):
            pc.report_provenance_drift()
        assert any("earlier astronomical environment" in r.message for r in caplog.records)

    def test_drift_detection_purges_nothing(self, seeded):
        """The rule: detection and invalidation are separate decisions. A
        provenance change means an *input* moved, which is not the same as an
        *output* moving."""
        import sqlite3

        pc, path = seeded
        before = sqlite3.connect(path).execute(
            "SELECT COUNT(*) FROM panchanga_cache"
        ).fetchone()[0]
        pc.report_provenance_drift()
        after = sqlite3.connect(path).execute(
            "SELECT COUNT(*) FROM panchanga_cache"
        ).fetchone()[0]
        assert before == after == 4

    def test_matching_environment_reports_no_drift(self, tmp_path, monkeypatch):
        import sqlite3

        import services.panchanga_cache as pc

        path = tmp_path / "p.db"
        monkeypatch.setattr(pc, "panchanga_db_path", lambda: path)
        monkeypatch.setattr(pc, "cache_enabled", lambda: True)
        pc.ensure_schema()
        conn = sqlite3.connect(path)
        conn.execute(
            "INSERT INTO panchanga_cache "
            "(city_id, location_key, date, payload_json, computed_at, provenance_hash) "
            "VALUES (1,'city:1','2026-01-01','{}','x',?)",
            (current_provenance().provenance_hash,),
        )
        conn.commit()
        conn.close()
        assert pc.report_provenance_drift()["stale_hashes"] == []
