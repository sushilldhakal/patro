"""Pushya-paksha ayanamsha: δ Cancri held at 16° Karka, zero point 27 Oct 368 CE."""

import swisseph as swe

from engine.astronomy.engine import SIDM_TRUE_PUSHYA, _ayanamsa_degrees, _ensure_ephemeris_for_thread
from engine.astronomy.sidereal import resolve_ayanamsha_mode


def _ayanamsa(jd: float) -> float:
    swe.set_sid_mode(SIDM_TRUE_PUSHYA)
    a = _ayanamsa_degrees(jd)
    return ((a + 180) % 360) - 180


def test_mode_resolves():
    assert resolve_ayanamsha_mode("true_pushya") == ("true_pushya", SIDM_TRUE_PUSHYA)


def test_delta_cancri_sits_at_16_karka():
    _ensure_ephemeris_for_thread()
    swe.set_sid_mode(SIDM_TRUE_PUSHYA)
    for year in (500, 1900, 2026):
        lon = swe.fixstar2_ut(",deCnc", swe.julday(year, 1, 1, 0), swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]
        assert abs(lon - 106.0) < 1e-6


def test_zero_point_is_27_october_368():
    lo, hi = swe.julday(300, 1, 1), swe.julday(450, 1, 1)
    for _ in range(50):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if _ayanamsa(mid) > 0 else (mid, hi)
    y, m, d, _ = swe.revjul(lo, swe.GREG_CAL)
    assert (y, m, d) == (368, 10, 27)


def test_value_today_is_about_a_degree_below_lahiri():
    # 1 Nov 2026: Lahiri 24°14′, Pushya-paksha 23°06′.
    assert abs(_ayanamsa(swe.julday(2026, 11, 1)) - 23.0996) < 0.001
