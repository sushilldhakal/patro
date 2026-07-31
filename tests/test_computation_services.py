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
from engine.astronomy.moon import PHASE_NAMES, moon_service
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.planets import GRAHA_KEYS, planet_service
from engine.astronomy.sun import sun_service

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
