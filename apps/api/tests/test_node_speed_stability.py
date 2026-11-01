"""Rahu's speed must print the same on every machine.

swisseph's FLG_SPEED value for the mean node moves in ~6.6e-8 °/day steps, so its
6th decimal (the one the payload prints) depended on the environment: on 10 Jun 1500
CI printed -0.052993 where a local run printed -0.052992, failing the julian_1500
byte-identical fixture. Changing swisseph's tidal acceleration alone reproduces that
flip, so this test uses it as the stand-in for "a different machine".
"""

from __future__ import annotations

import pytest
import swisseph as swe

from engine.astronomy.engine import AstronomyEngine
from engine.astronomy.jd_calendar import CivilDay

JULIAN_1500 = CivilDay(1500, 6, 10).to_jd_ut()


@pytest.mark.parametrize("tid_acc", [swe.TIDAL_DE431, swe.TIDAL_DE406, -25.8, -25.82])
def test_rahu_speed_does_not_depend_on_the_tidal_acceleration(tid_acc: float) -> None:
    try:
        swe.set_tid_acc(tid_acc)
        position = AstronomyEngine().planet_position(JULIAN_1500, "rahu")
    finally:
        swe.set_tid_acc(swe.TIDAL_AUTOMATIC)
    assert position.speed == -0.052992


def test_rahu_speed_matches_its_longitude_rate() -> None:
    """The central difference is the rate of the longitude the payload prints."""
    engine = AstronomyEngine()
    before = engine.planet_longitude(JULIAN_1500 - 1, "rahu")
    after = engine.planet_longitude(JULIAN_1500 + 1, "rahu")
    speed = engine.planet_position(JULIAN_1500, "rahu").speed
    assert speed == pytest.approx((after - before) / 2, abs=1e-6)
