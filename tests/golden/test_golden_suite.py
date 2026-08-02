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


# ── definition-based comparisons ─────────────────────────────────────────────
#
# Swiss Ephemeris is this engine's astronomical authority, so these datasets are
# solved from a stated mathematical definition rather than transcribed from a
# printed calendar. The reference solvers in tests/golden/definitions.py share no
# code with production: they use plain bisection directly on swe.calc_ut, where
# production uses Brent's method with its own bracketing. What that catches is
# bracketing errors, convergence failures and rashi off-by-ones.


class TestEquinoxSolstice:
    DATASET = "equinox_solstice"

    def test_reference_solver_still_reproduces_the_stored_values(self):
        """Ephemeris-drift detector. The stored values are frozen; re-solving
        them under the current environment must agree. If this fails while the
        production test passes, the ephemeris changed, not the engine."""
        from tests.golden import definitions as D

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        for entry in ds.entries:
            got = D.equinox_solstice_jd(entry["year"], entry["event"])
            drift = abs(got - entry["expected"]["jd_ut"]) * 86400
            assert drift < ds.tolerance.value, (
                f"{entry['id']}: reference solver drifted {drift:.1f}s from the "
                "stored value — the ephemeris environment changed"
            )

    def test_solved_longitudes_hit_the_definition(self):
        """The definition itself: tropical longitude is 0/90/180/270 at these
        instants. Independent of both solvers."""
        from tests.golden import definitions as D

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        targets = {"march_equinox": 0.0, "june_solstice": 90.0,
                   "september_equinox": 180.0, "december_solstice": 270.0}
        for entry in ds.entries:
            lon = D.tropical_sun_longitude(entry["expected"]["jd_ut"])
            off = abs(((lon - targets[entry["event"]] + 180) % 360) - 180)
            assert off < 1e-4, f"{entry['id']}: longitude off by {off:.6f}°"


class TestSankranti:
    DATASET = "sankranti"

    def test_production_solver_matches_the_definition(self):
        """The real check: engine/vedic/sankranti.find_sankranti_after_jd against
        an independently-solved sidereal ingress."""
        from engine.vedic.sankranti import find_sankranti_after_jd

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            want_jd = entry["expected"]["jd_ut"]
            # Production takes a ZERO-based rashi index (target_degree =
            # target_rashi * 30), while the dataset uses the conventional
            # 1-based numbering where rashi 1 = Mesh = 0 deg. An off-by-one here
            # shows up as a clean ~30-day error, which is how it was caught.
            got_jd = find_sankranti_after_jd(entry["rashi"] - 1, want_jd - 45.0)
            if got_jd is None:
                failures.append(f"{entry['id']}: production returned None")
                continue
            delta = abs(got_jd - want_jd) * 86400
            if delta > ds.tolerance.value:
                failures.append(
                    f"{entry['id']}: production {got_jd:.6f} vs definition "
                    f"{want_jd:.6f} ({delta:.1f}s, tolerance {ds.tolerance.value}s)"
                )
        assert not failures, "\n  ".join(["definition mismatch:"] + failures)

    def test_solved_longitudes_hit_the_definition(self):
        from tests.golden import definitions as D

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        for entry in ds.entries:
            lon = D.sidereal_sun_longitude(entry["expected"]["jd_ut"])
            target = entry["expected"]["sidereal_longitude_deg"]
            off = abs(((lon - target + 180) % 360) - 180)
            assert off < 1e-3, f"{entry['id']}: sidereal longitude off by {off:.6f}°"


class TestTithiBoundaries:
    DATASET = "tithi_boundaries"

    def test_reference_solver_still_reproduces_the_stored_values(self):
        from tests.golden import definitions as D

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        for entry in ds.entries:
            got = D.tithi_boundary_jd(entry["after_jd_ut"])
            drift = abs(got - entry["expected"]["jd_ut"]) * 86400
            assert drift < ds.tolerance.value, (
                f"{entry['id']}: reference drifted {drift:.1f}s from stored"
            )

    def test_elongation_is_a_multiple_of_twelve_degrees(self):
        """The definition: a tithi boundary is where elongation crosses n*12°."""
        from tests.golden import definitions as D

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        for entry in ds.entries:
            elong = D.elongation(entry["expected"]["jd_ut"])
            off = min(elong % 12.0, 12.0 - (elong % 12.0))
            assert off < 1e-3, (
                f"{entry['id']}: elongation {elong:.6f}° is {off:.6f}° from a "
                "multiple of 12"
            )

    def test_boundaries_span_a_synodic_month(self):
        """Sanity on the physics: 30 tithis fill one synodic month, so the mean
        boundary spacing must be ~29.53/30 = 0.984 days."""
        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")
        jds = [e["expected"]["jd_ut"] for e in ds.entries]
        mean = (jds[-1] - jds[0]) / (len(jds) - 1)
        assert 0.90 < mean < 1.06, f"mean tithi length {mean:.4f} d is implausible"

    def test_astronomical_boundary_carries_no_calendar_assignment(self):
        """Layering guard. A tithi boundary is an astronomical instant; which
        civil day it is credited to is the udaya rule, which is cultural. This
        dataset must never grow a date-assignment field."""
        ds = schema.load(self.DATASET)
        forbidden = {"bs_date", "civil_date", "udaya_tithi", "festival", "date"}
        for entry in ds.entries:
            leaked = forbidden & set(entry) | forbidden & set(entry.get("expected", {}))
            assert not leaked, (
                f"{entry['id']}: calendar-assignment field(s) {leaked} leaked into "
                "an astronomy dataset — that belongs in the calendar-rule layer"
            )


class TestAyanamsha:
    DATASET = "ayanamsha"

    MODES = {"lahiri": "SIDM_LAHIRI", "raman": "SIDM_RAMAN",
             "krishnamurti": "SIDM_KRISHNAMURTI", "true_citra": "SIDM_TRUE_CITRA"}

    def test_production_matches_the_definition(self):
        """After the unification, the engine's published ayanamsa must equal the
        independently-derived value. See docs/ayanamsha-variants.md."""
        import swisseph as swe

        from engine.astronomy.engine import default_engine

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            mode = getattr(swe, self.MODES[entry["mode"]])
            got = default_engine.ayanamsa(entry["jd_ut"], mode=mode)
            want = entry["expected"]["ayanamsha_deg"]
            delta = abs(got - want) * 3600
            if delta > ds.tolerance.value:
                failures.append(
                    f"{entry['id']}: engine {got:.9f} vs definition {want:.9f} "
                    f"({delta:.3f} arcsec)"
                )
        assert not failures, "\n  ".join(["ayanamsha mismatch:"] + failures)

    def test_lahiri_grows_monotonically_with_time(self):
        """Precession is one-directional: the ayanamsha increases ~50.3"/year.

        swisseph returns it modulo 360, so the raw values wrap (356.06 deg at
        1 CE becomes 9.92 deg at 1000 CE). Unwrap before checking — the physical
        quantity is continuous even though its representation is not. Over the
        3000 BCE - 3000 CE span the total is ~83 deg, well under one full turn
        of the 25,772-year cycle.
        """
        ds = schema.load(self.DATASET)
        rows = sorted(
            (e for e in ds.entries if e["mode"] == "lahiri"), key=lambda e: e["jd_ut"]
        )
        raw = [e["expected"]["ayanamsha_deg"] for e in rows]
        unwrapped = [raw[0]]
        for value in raw[1:]:
            turns = round((unwrapped[-1] - value) / 360.0)
            unwrapped.append(value + 360.0 * turns)

        assert unwrapped == sorted(unwrapped), (
            f"Lahiri ayanamsha is not monotonic in time: {unwrapped}"
        )
        span_years = (rows[-1]["jd_ut"] - rows[0]["jd_ut"]) / 365.2422
        rate = (unwrapped[-1] - unwrapped[0]) * 3600 / span_years
        assert 45 < rate < 55, f"precession rate {rate:.1f} arcsec/yr is implausible"

    def test_modes_disagree_as_they_should(self):
        """There is no single universal ayanamsha — the mode is part of the
        question. If every mode agreed, the selector would be meaningless."""
        ds = schema.load(self.DATASET)
        at_j2000 = {
            e["mode"]: e["expected"]["ayanamsha_deg"]
            for e in ds.entries
            if e["jd_ut"] == 2451545.0
        }
        assert len(set(at_j2000.values())) == len(at_j2000), "modes are not distinct"


class TestEclipses:
    DATASET = "eclipses"

    def test_production_matches_the_definition(self):
        from engine.astronomy.engine import default_engine

        ds = schema.load(self.DATASET)
        if not ds.is_runnable:
            pytest.skip(f"{self.DATASET}: {ds.todo}")

        failures: list[str] = []
        for entry in ds.entries:
            if entry["kind"] == "solar":
                got = default_engine.next_solar_eclipse(entry["after_jd_ut"])
            else:
                got = default_engine.next_lunar_eclipse(entry["after_jd_ut"])
            assert got is not None, f"{entry['id']}: engine found no eclipse"
            delta = abs(got["max_jd"] - entry["expected"]["jd_ut"]) * 86400
            if delta > ds.tolerance.value:
                failures.append(
                    f"{entry['id']}: engine {got['max_jd']:.6f} vs definition "
                    f"{entry['expected']['jd_ut']:.6f} ({delta:.1f}s)"
                )
            if got["type"] != entry["expected"]["type"]:
                failures.append(
                    f"{entry['id']}: type {got['type']!r} vs "
                    f"{entry['expected']['type']!r}"
                )
        assert not failures, "\n  ".join(["eclipse mismatch:"] + failures)

    def test_eclipses_recur_on_the_eclipse_season_cycle(self):
        """Sanity on the physics: successive eclipses of one kind fall ~6 months
        apart, the eclipse-season interval."""
        ds = schema.load(self.DATASET)
        for kind in ("solar", "lunar"):
            jds = sorted(
                e["expected"]["jd_ut"] for e in ds.entries if e["kind"] == kind
            )
            gaps = [b - a for a, b in zip(jds, jds[1:])]
            assert all(130 < g < 220 for g in gaps), f"{kind} gaps {gaps} implausible"
