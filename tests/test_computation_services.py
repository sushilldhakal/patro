"""Phase 2: the JD-keyed computation services.

Three things are pinned here:

1. The services agree with the datetime-shaped functions they replaced, so the
   ~56 modules still importing ``positions`` / ``swiss_eph`` can migrate in
   batches without a payload changing underneath them.
2. Julian Day really is the only input — the same instant spelled two ways
   gives one answer.
3. The Moon-phase surface, which is new (the backend had no ``pheno`` call at
   all before this), behaves correctly at the points where it is checkable
   against independent quantities.

See docs/computation-architecture-audit.md (sections C, phase 2).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from engine.astronomy.engine import default_engine
from engine.astronomy.lagna import lagna_service
from engine.astronomy.moon import PHASE_NAMES, moon_service
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.planets import GRAHA_KEYS, planet_service, spashta_table
from engine.astronomy.rashi import RASHI_NAMES, RITU_DATA, rashi_service
from engine.astronomy.sun import sun_service

KATHMANDU = (27.7172, 85.3240)

DT = datetime(2026, 7, 31, 6, 0, tzinfo=timezone.utc)
JD = default_engine.julian_day(DT)

# A spread of instants, so a coincidence at one longitude can't pass.
SAMPLE_JDS = [
    default_engine.julian_day(DT + timedelta(days=37 * i)) for i in range(10)
]


class TestServicesMatchTheFunctionsTheyReplace:
    """Phase 2 must not change a single number."""

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_panchanga_service_matches_positions(self, jd: float):
        from engine.astronomy import positions

        dt = default_engine.datetime_from_jd(jd)

        assert panchanga_service.elongation(jd) == pytest.approx(
            positions.get_tithi_angle(dt), abs=1e-9
        )

        number, name, progress = positions.get_nakshatra(dt)
        nak = panchanga_service.nakshatra(jd)
        assert (nak["number"], nak["name"]) == (number, name)
        assert nak["progress"] == pytest.approx(progress, abs=1e-9)

        number, name, progress = positions.get_yoga(dt)
        yoga = panchanga_service.yoga(jd)
        assert (yoga["number"], yoga["name"]) == (number, name)
        assert yoga["progress"] == pytest.approx(progress, abs=1e-9)

        number, name = positions.get_karana(dt)
        karana = panchanga_service.karana(jd)
        assert (karana["number"], karana["name"]) == (number, name)

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_tithi_matches_the_legacy_index_math(self, jd: float):
        from engine.astronomy import positions

        elongation = panchanga_service.elongation(jd)
        tithi = panchanga_service.tithi(jd)
        assert tithi["number"] == positions.get_tithi_number(elongation)
        assert tithi["paksha"] == positions.get_paksha(tithi["number"])
        assert tithi["display_number"] == positions.get_display_tithi(
            tithi["number"]
        )
        assert tithi["progress"] == pytest.approx(
            positions.get_tithi_progress(elongation), abs=1e-12
        )

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_vara_matches_positions(self, jd: float):
        from engine.astronomy import positions

        dt = default_engine.datetime_from_jd(jd)
        number, name, english = positions.get_vaara(dt, "Asia/Kathmandu")
        vara = panchanga_service.vara(jd, "Asia/Kathmandu")
        assert (vara["number"], vara["name"], vara["english"]) == (
            number,
            name,
            english,
        )

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_planet_service_matches_swiss_eph(self, jd: float):
        from engine.astronomy.swiss_eph import get_all_planetary_positions

        dt = default_engine.datetime_from_jd(jd)
        legacy = get_all_planetary_positions(dt)
        for graha in GRAHA_KEYS:
            new = planet_service.position(jd, graha)
            assert new["longitude"] == pytest.approx(
                legacy[graha]["longitude"], abs=1e-6
            ), graha
            assert new["rashi"] == legacy[graha]["rashi"], graha
            assert new["is_retrograde"] == legacy[graha]["is_retrograde"], graha

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_sun_and_moon_longitudes_match(self, jd: float):
        from engine.astronomy import positions

        dt = default_engine.datetime_from_jd(jd)
        assert sun_service.longitude(jd) == pytest.approx(
            positions.get_sun_longitude(dt), abs=1e-9
        )
        assert moon_service.longitude(jd) == pytest.approx(
            positions.get_moon_longitude(dt), abs=1e-9
        )


class TestJulianDayIsTheOnlyInput:
    def test_same_instant_two_spellings_one_answer(self):
        """A JD built from UTC and the same JD built from a local wall clock."""
        from zoneinfo import ZoneInfo

        utc_dt = datetime(2026, 7, 31, 6, 0, tzinfo=timezone.utc)
        ktm_dt = utc_dt.astimezone(ZoneInfo("Asia/Kathmandu"))
        assert default_engine.julian_day(utc_dt) == default_engine.julian_day(
            ktm_dt
        )

        jd = default_engine.julian_day(utc_dt)
        assert panchanga_service.all_angas(jd) == panchanga_service.all_angas(jd)

    def test_services_never_accept_a_calendar_date(self):
        """Passing a date where a JD belongs must fail loudly, not silently."""
        from datetime import date

        with pytest.raises(TypeError):
            panchanga_service.elongation(date(2026, 7, 31))  # type: ignore[arg-type]


class TestMoonPhase:
    """New surface — nothing to compare against, so check internal consistency."""

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_illuminated_fraction_is_a_fraction(self, jd: float):
        assert 0.0 <= moon_service.illuminated_fraction(jd) <= 1.0

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_phase_index_names_agree(self, jd: float):
        phase = moon_service.phase(jd)
        assert phase["name"] == PHASE_NAMES[phase["phase_index"]]
        assert 0 <= phase["phase_index"] <= 7

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_phase_and_tithi_come_from_one_elongation(self, jd: float):
        """The bug this whole migration exists to prevent, in miniature."""
        assert moon_service.elongation(jd) == pytest.approx(
            panchanga_service.elongation(jd), abs=1e-12
        )

    @pytest.mark.parametrize("jd", SAMPLE_JDS)
    def test_waxing_matches_shukla_paksha(self, jd: float):
        """Waxing is exactly the shukla half — same angle, two vocabularies."""
        assert moon_service.is_waxing(jd) == (
            panchanga_service.tithi(jd)["paksha"] == "shukla"
        )

    def test_full_moon_is_bright_and_new_moon_is_dark(self):
        """Walk a lunation and check illumination tracks the tithi."""
        jd = default_engine.julian_day(datetime(2026, 1, 1, tzinfo=timezone.utc))
        brightest = max(
            (moon_service.illuminated_fraction(jd + i * 0.25), jd + i * 0.25)
            for i in range(120)
        )
        darkest = min(
            (moon_service.illuminated_fraction(jd + i * 0.25), jd + i * 0.25)
            for i in range(120)
        )
        assert brightest[0] > 0.99
        assert darkest[0] < 0.01
        # Purnima at the bright end, Amavasya at the dark end.
        assert panchanga_service.tithi(brightest[1])["number"] in (15, 16)
        assert panchanga_service.tithi(darkest[1])["number"] in (30, 1)

    def test_moon_latitude_is_now_exposed(self):
        """Was computed and discarded before this service existed."""
        lat = moon_service.latitude(JD)
        assert -6.0 < lat < 6.0  # lunar orbit is inclined ~5.15°

    def test_moon_never_retrogrades(self):
        for jd in SAMPLE_JDS:
            assert planet_service.is_retrograde(jd, "moon") is False
            assert moon_service.speed(jd) > 0.0


class TestSunService:
    def test_declination_tracks_the_solstices(self):
        jun = default_engine.julian_day(
            datetime(2026, 6, 21, 12, tzinfo=timezone.utc)
        )
        dec = default_engine.julian_day(
            datetime(2026, 12, 21, 12, tzinfo=timezone.utc)
        )
        assert sun_service.declination(jun) > 23.0
        assert sun_service.declination(dec) < -23.0

    def test_equation_of_time_stays_within_its_known_bounds(self):
        """|EoT| never exceeds ~16.5 minutes."""
        jd = default_engine.julian_day(datetime(2026, 1, 1, tzinfo=timezone.utc))
        values = [sun_service.equation_of_time_minutes(jd + d) for d in range(365)]
        assert max(values) < 17.0
        assert min(values) > -17.0

    def test_sunrise_matches_the_legacy_helper(self):
        from engine.astronomy.location import resolve_location_from_query
        from engine.astronomy.swiss_eph import calculate_sunrise

        location = resolve_location_from_query(
            lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu"
        )
        jd = default_engine.julian_day(
            datetime(2026, 7, 31, 12, tzinfo=timezone.utc)
        )
        legacy = calculate_sunrise(
            datetime(2026, 7, 31).date(),
            latitude=location.lat,
            longitude=location.lon,
            timezone_name=location.timezone,
        )
        assert sun_service.sunrise(jd, location) == legacy


class TestPlanetService:
    def test_ketu_is_opposite_rahu(self):
        for jd in SAMPLE_JDS:
            rahu = planet_service.longitude(jd, "rahu")
            ketu = planet_service.longitude(jd, "ketu")
            assert (ketu - rahu) % 360 == pytest.approx(180.0, abs=1e-6)

    def test_retrograde_delegates_to_motion(self):
        """PlanetService must not re-derive the rule — nodes prove it."""
        for jd in SAMPLE_JDS:
            assert planet_service.is_retrograde(jd, "rahu") is True
            assert planet_service.is_retrograde(jd, "ketu") is True
            assert planet_service.is_retrograde(jd, "sun") is False

    def test_motion_labels_both_locales(self):
        assert planet_service.motion(JD, "rahu") == "Vakri"
        assert planet_service.motion(JD, "rahu", locale="ne") == "वक्री"

    def test_extras_are_a_superset_of_the_lean_position(self):
        """``position`` stays cheap; the uncached extras are opt-in."""
        lean = planet_service.position(JD, "mars")
        full = planet_service.position_with_extras(JD, "mars")
        assert lean.items() <= full.items()
        assert {"latitude", "right_ascension", "declination"} <= full.keys()


class TestSpashtaTable:
    """The स्पष्ट ग्रह table — moved here from ``swiss_eph`` unchanged."""

    def test_every_graha_is_present(self):
        table = spashta_table(JD)
        assert set(table) == set(GRAHA_KEYS)

    def test_ketu_is_derived_from_rahu_not_calculated(self):
        table = spashta_table(JD)
        rahu, ketu = table["rahu"], table["ketu"]
        assert (ketu["longitude"] - rahu["longitude"]) % 360 == pytest.approx(
            180.0, abs=1e-5
        )
        assert ketu["speed"] == pytest.approx(-rahu["speed"], abs=1e-6)

    def test_rashi_name_agrees_with_the_longitude(self):
        for graha, pos in spashta_table(JD).items():
            expected = RASHI_NAMES[int(pos["longitude"] / 30) % 12]
            assert pos["rashi_name"] == expected, graha
            assert pos["rashi"] == int(pos["longitude"] / 30) % 12 + 1, graha

    def test_dms_is_consistent_with_the_longitude(self):
        for graha, pos in spashta_table(JD).items():
            degrees = int(pos["dms"][:3])
            assert degrees == int(pos["longitude"]), graha
            assert pos["deg_in_rashi"] == pytest.approx(pos["longitude"] % 30, abs=1e-6)

    def test_sun_and_nodes_never_combust(self):
        """अस्त is a heliacal setting — the Sun cannot set in its own glare."""
        for jd in SAMPLE_JDS:
            table = spashta_table(jd)
            assert table["sun"]["is_combust"] is False
            assert table["rahu"]["is_combust"] is False
            assert table["ketu"]["is_combust"] is False

    def test_nodes_are_retrograde_by_convention(self):
        for jd in SAMPLE_JDS:
            table = spashta_table(jd)
            assert table["rahu"]["is_retrograde"] is True
            assert table["ketu"]["is_retrograde"] is True


class TestRashiService:
    def test_surya_and_chandra_read_their_own_longitudes(self):
        for jd in SAMPLE_JDS:
            surya = rashi_service.surya(jd)
            assert surya["longitude"] == pytest.approx(
                round(sun_service.longitude(jd), 6), abs=1e-6
            )
            assert surya["name"] == RASHI_NAMES[int(surya["longitude"] / 30) % 12]

            chandra = rashi_service.chandra(jd)
            assert chandra["longitude"] == pytest.approx(
                round(moon_service.longitude(jd), 6), abs=1e-6
            )

    def test_ritu_follows_the_sun_two_signs_at_a_time(self):
        for jd in SAMPLE_JDS:
            ritu = rashi_service.ritu(jd, sidereal=True)
            assert ritu["number"] == RITU_DATA[(ritu["sun_rashi"] - 1) // 2]["number"]

    def test_southern_hemisphere_gets_the_inverted_season(self):
        """Sydney in July is winter, Kathmandu in July is monsoon."""
        july = default_engine.julian_day(datetime(2026, 7, 15, 6, tzinfo=timezone.utc))
        north = rashi_service.ritu(july, lat=27.7, timezone_name="Asia/Kathmandu")
        south = rashi_service.ritu(july, lat=-33.9, timezone_name="Australia/Sydney")
        assert north["basis"] != "southern_local"
        assert south["basis"] == "southern_local"
        assert south["name"] == "Shishira"

    def test_aayan_flips_at_the_makara_boundary(self):
        """Uttarayana is Makara→Mithuna; the mark must agree with the name."""
        for jd in SAMPLE_JDS:
            aayan = rashi_service.aayan(jd)
            uttara = aayan["sun_rashi"] in (10, 11, 12, 1, 2, 3)
            assert (aayan["name"] == "Uttarayana") is uttara
            assert aayan["kranti_mark"] == ("उ" if uttara else "द")


class TestLagnaService:
    def test_next_boundary_lands_in_the_following_rashi(self):
        """The search converges from above: the answer is inside the next sign,
        by at most the 30-second bisection tolerance."""
        from engine.astronomy.lagna import _TOLERANCE_DAYS

        lat, lon = KATHMANDU
        for jd in SAMPLE_JDS:
            here = lagna_service.rashi_index(jd, lat=lat, lon=lon)
            end = lagna_service.next_boundary(jd, lat=lat, lon=lon)
            assert end > jd
            assert lagna_service.rashi_index(end, lat=lat, lon=lon) == (here + 1) % 12
            assert (
                lagna_service.rashi_index(end - 2 * _TOLERANCE_DAYS, lat=lat, lon=lon)
                == here
            )

    def test_a_full_circuit_of_boundaries_takes_a_sidereal_day(self):
        """The ascendant sweeps all twelve signs once per sidereal day.

        Measured boundary-to-boundary, not from an arbitrary instant: starting
        mid-sign, twelve boundaries later is one circuit *minus* the part of the
        first sign already elapsed.
        """
        lat, lon = KATHMANDU
        start = lagna_service.next_boundary(JD, lat=lat, lon=lon)
        jd = start
        for _ in range(12):
            jd = lagna_service.next_boundary(jd, lat=lat, lon=lon)
        assert jd - start == pytest.approx(0.99727, abs=0.005)

    def test_lagna_block_agrees_with_its_own_longitude(self):
        lat, lon = KATHMANDU
        lagna = lagna_service.lagna(JD, lat=lat, lon=lon)
        assert lagna["name"] == RASHI_NAMES[int(lagna["longitude"] / 30) % 12]
        assert lagna["degree_in_rashi"] == pytest.approx(
            lagna["longitude"] % 30, abs=1e-4
        )


class TestMoonRiseSet:
    def test_moonrise_after_is_within_a_day_and_a_bit(self):
        """The Moon rises once every ~24h50m, so a 26h window always contains one."""
        from engine.astronomy.location import ObserverLocation

        location = ObserverLocation()
        for jd in SAMPLE_JDS:
            rise = moon_service.moonrise_after(jd, location)
            assert rise is not None
            assert 0 <= default_engine.julian_day(rise) - jd < 26 / 24
