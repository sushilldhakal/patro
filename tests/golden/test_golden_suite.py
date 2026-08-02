"""Golden suite: the engine against external authority.

Populated datasets are compared. `todo` datasets are **skipped with a reason**,
never quietly passed — an empty golden suite that reports green is the failure
mode this package exists to prevent.

See tests/golden/schema.py for the distinction between golden and regression
tests, and tests/golden/data/README.md for how to add a dataset.
"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import ObserverLocation
from engine.astronomy.provenance import current_provenance
from tests.golden import schema


def observer_from(spec: dict) -> ObserverLocation:
    return ObserverLocation(
        lat=spec["lat"],
        lon=spec["lon"],
        timezone=spec.get("timezone", "Asia/Kathmandu"),
        name=spec.get("name", "custom"),
        altitude=spec.get("altitude", 0.0),
    )


def _hhmm_delta_seconds(actual: datetime, expected_hhmm: str, tz: str) -> float:
    """Signed seconds between a computed instant and an ``HH:MM`` local label."""
    local = actual.astimezone(ZoneInfo(tz))
    want_h, want_m = (int(p) for p in expected_hhmm.split(":"))
    want = local.replace(hour=want_h, minute=want_m, second=0, microsecond=0)
    return (local - want).total_seconds()


# ── structural guards: these run whether or not any data is populated ─────────


class TestDatasetIntegrity:
    def test_every_dataset_is_wellformed(self):
        """``load`` runs ``validate``, which enforces the anti-manufacture rule."""
        datasets = schema.load_all()
        assert datasets, "no golden datasets found"

    @pytest.mark.parametrize("name", schema.dataset_names())
    def test_populated_datasets_cite_an_external_authority(self, name):
        """A golden value's authority comes from its source. A dataset filled
        from this engine's own output is a regression baseline, and belongs in
        tests/test_byte_identical_payloads.py instead."""
        ds = schema.load(name)
        if ds.status != "populated":
            pytest.skip(f"{name} is not populated")
        assert ds.source.is_external(), (
            f"{name} claims to be populated but its authority "
            f"({ds.source.authority!r}) looks self-referential"
        )

    @pytest.mark.parametrize("name", schema.dataset_names())
    def test_todo_datasets_say_what_they_need(self, name):
        ds = schema.load(name)
        if ds.status != "todo":
            pytest.skip(f"{name} is populated")
        assert len(ds.todo) > 40, f"{name}: todo must describe the source needed"
        assert "entry_shape" in (
            schema.DATA_DIR / f"{name}.json"
        ).read_text(), f"{name}: a todo dataset must declare its entry shape"

    def test_suite_reports_its_own_coverage(self):
        """Visibility, not a gate. Prints what is verified and what is not, so
        an unpopulated suite cannot look like a passing one."""
        populated = [d for d in schema.load_all() if d.is_runnable]
        todo = [d for d in schema.load_all() if not d.is_runnable]
        print(f"\n  golden coverage: {len(populated)} populated, {len(todo)} awaiting sources")
        for d in populated:
            print(f"    [ok]   {d.name:26s} {len(d.entries)} entries  <- {d.source.authority}")
        for d in todo:
            print(f"    [TODO] {d.name:26s} {d.todo[:60]}...")
        assert populated, "no golden dataset is populated — the suite verifies nothing"


# ── comparisons against populated data ───────────────────────────────────────


class TestSunriseSunset:
    DATASET = "sunrise_sunset"

    def test_matches_published_almanac(self):
        from engine.astronomy.sun import calculate_sunrise, calculate_sunset

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            loc = observer_from(entry["observer"])
            d = date.fromisoformat(entry["date"])
            got_rise = calculate_sunrise(
                d, loc.lat, loc.lon, altitude=loc.altitude, timezone_name=loc.timezone
            )
            got_set = calculate_sunset(
                d, loc.lat, loc.lon, altitude=loc.altitude, timezone_name=loc.timezone
            )
            for label, got, want in (
                ("sunrise", got_rise, entry["expected"]["sunrise_local"]),
                ("sunset", got_set, entry["expected"]["sunset_local"]),
            ):
                delta = _hhmm_delta_seconds(got, want, loc.timezone)
                if abs(delta) > ds.tolerance.value:
                    failures.append(
                        f"{entry['id']} {label}: got "
                        f"{got.astimezone(ZoneInfo(loc.timezone)):%H:%M:%S}, "
                        f"{ds.source.authority} says {want} "
                        f"({delta:+.0f}s, tolerance {ds.tolerance.value}s)"
                    )
        assert not failures, "\n  ".join(["golden mismatch:"] + failures)


class TestGrahaLongitudes:
    DATASET = "graha_longitudes"

    def test_matches_published_longitude(self):
        from engine.astronomy.planets import spashta_table
        from engine.astronomy.sidereal import resolve_ayanamsha_mode
        from engine.astronomy.ut_instant import as_julian_day
        from engine.vedic.at_time import parse_query_datetime

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            loc = observer_from(entry["observer"])
            instant = parse_query_datetime(
                entry["instant_local"], timezone_name=loc.timezone
            )
            _key, mode = resolve_ayanamsha_mode(entry["ayanamsha"])
            table = spashta_table(as_julian_day(instant), ayanamsa=mode)
            got = table[entry["graha"]]["longitude"]
            want = entry["expected"]["longitude_deg"]
            delta_arcsec = (((got - want + 540) % 360) - 180) * 3600
            if abs(delta_arcsec) > ds.tolerance.value:
                failures.append(
                    f"{entry['id']} {entry['graha']}: got {got:.5f} deg, "
                    f"{ds.source.authority} says {want:.5f} deg "
                    f"({delta_arcsec:+.1f} arcsec, tolerance {ds.tolerance.value})"
                )
        assert not failures, "\n  ".join(["golden mismatch:"] + failures)


class TestWeekdayDirectionTables:
    DATASET = "weekday_direction_tables"

    def test_matches_published_tables(self):
        from engine.astronomy.location import DEFAULT_LOCATION
        from engine.vedic.daily import build_daily_panchanga

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            d = date.fromisoformat(entry["date"])
            block = build_daily_panchanga(d, DEFAULT_LOCATION)["nivas_shool"]
            got = {
                "disha_shool": block["disha_shool"]["direction_key"],
                "rahu_vasa": block["rahu_vasa"]["direction_key"],
            }
            for key, want in entry["expected"].items():
                if got[key] != want:
                    failures.append(
                        f"{entry['id']} ({entry['weekday']}) {key}: "
                        f"got {got[key]!r}, {ds.source.authority} says {want!r}"
                    )
        assert not failures, "\n  ".join(["golden mismatch:"] + failures)


class TestProvenanceIsRecorded:
    def test_populated_datasets_record_when_they_were_reconciled(self):
        """Recorded, never asserted. The environment legitimately changes, and a
        golden value's authority comes from its source, not from our ephemeris.
        Its use is diagnostic: 'last checked under a different environment' is
        worth knowing when a comparison starts failing."""
        for ds in schema.load_all():
            if ds.is_runnable:
                assert len(ds.reconciled_under_provenance) == 64, (
                    f"{ds.name}: expected a full provenance hash"
                )

    def test_current_environment_is_reported(self, capsys):
        live = current_provenance()
        stale = [
            d.name
            for d in schema.load_all()
            if d.is_runnable and d.reconciled_under_provenance != live.provenance_hash
        ]
        if stale:
            print(
                f"\n  note: {len(stale)} golden dataset(s) were last reconciled under a "
                f"different environment (live is {live.short_hash}): {', '.join(stale)}"
            )
