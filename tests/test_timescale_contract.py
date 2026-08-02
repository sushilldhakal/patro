"""The timescale contract: every ephemeris call takes Universal Time.

Swiss Ephemeris offers both ``calc`` (Terrestrial Time) and ``calc_ut``
(Universal Time). Mixing them silently offsets results by ΔT — 64 seconds today,
**21 hours** at 3000 BCE. The engine is uniformly UT-based today; these tests
keep it that way, because the failure is invisible at modern dates and enormous
at historical ones.

See docs/timescale-contract.md.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import swisseph as swe

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.paths import ephemeris_path

ROOT = Path(__file__).resolve().parent.parent

# TT-taking swisseph entry points. Each has a ``_ut`` sibling that this engine
# uses instead. ``swe.deltat`` is exempt: it *converts between* the scales, which
# is the one legitimate reason to name ΔT directly.
_TT_VARIANTS = re.compile(r"\bswe\.(calc|get_ayanamsa|houses_ex|fixstar|fixstar2)\s*\(")


class TestUniversalTimeContract:
    def test_no_terrestrial_time_calls_anywhere(self):
        """A ``swe.calc(...)`` where ``swe.calc_ut(...)`` was meant is a silent
        ΔT-sized error. At modern dates it is 64 s and easy to miss in review;
        at 3000 BCE it is 21 hours."""
        offenders: list[str] = []
        for pkg in ("engine", "services", "api", "app", "rules"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts:
                    continue
                for lineno, line in enumerate(path.read_text().splitlines(), start=1):
                    code = line.split("#", 1)[0]
                    if _TT_VARIANTS.search(code):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}")
        assert not offenders, (
            "Terrestrial-Time swisseph call(s) found. This engine's contract is "
            "Universal Time everywhere — use the _ut variant. See "
            "docs/timescale-contract.md: " + ", ".join(offenders)
        )

    def test_swisseph_is_still_confined_to_the_astronomy_layer(self):
        """The UT contract is only enforceable while every ephemeris call lives
        behind one boundary."""
        importers: set[str] = set()
        for pkg in ("engine", "services", "api", "app", "rules"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts:
                    continue
                if re.search(r"^\s*import swisseph", path.read_text(), re.M):
                    importers.add(str(path.relative_to(ROOT)))
        assert importers == {
            "engine/astronomy/engine.py",
            "engine/astronomy/jd_calendar.py",
            "engine/astronomy/ut_instant.py",
            "engine/astronomy/provenance.py",
            "services/startup.py",
        }, f"swisseph import surface changed: {sorted(importers)}"


class TestDeltaTSensitivity:
    """Pins the error bars published in docs/timescale-contract.md §3.

    These are the numbers a consumer of BCE data needs. If a library upgrade
    changes them materially, that is a scientific fact worth failing a build over.
    """

    @staticmethod
    def _elongation(jd: float) -> float:
        sun = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]
        moon = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]
        return (moon - sun) % 360

    @pytest.fixture(autouse=True)
    def _ephemeris(self):
        swe.set_ephe_path(str(ephemeris_path()))
        yield
        swe.set_delta_t_userdef(swe.DELTAT_AUTOMATIC)

    def test_delta_t_magnitudes_at_probe_epochs(self):
        for jd, expected_hours, tol in [
            (2451545.0, 0.0177, 0.002),   # 2000 CE — 63.8 s
            (1721423.5, 2.94, 0.05),      # 1 CE
            (1355807.5, 7.09, 0.10),      # 1001 BCE
            (625673.5, 20.92, 0.20),      # 3001 BCE
        ]:
            assert swe.deltat(jd) * 24 == pytest.approx(expected_hours, abs=tol)

    def test_sunrise_is_robust_to_delta_t_error(self):
        """The reassuring half. A 2 h ΔT error moves sunrise ~5 s, because the
        Sun's declination shift partly cancels its hour-angle shift. The udaya
        anchor is not the weak link at BCE dates."""
        jd = CivilDay(-2999, 3, 16).to_jd_ut()
        base = swe.deltat(jd)
        geo = (85.3240, 27.7172, 0.0)

        def sunrise(dt_days: float) -> float:
            swe.set_delta_t_userdef(dt_days)
            return swe.rise_trans_true_hor(
                jd - 0.5, swe.SUN, swe.CALC_RISE, geo, 0.0, 0.0, 0.0
            )[1][0]

        shift_seconds = abs(sunrise(base + 2 / 24) - sunrise(base)) * 86400
        assert shift_seconds < 30, f"sunrise moved {shift_seconds:.1f} s"

    def test_moon_absorbs_the_delta_t_error(self):
        """The concerning half. The Moon moves 0.55°/h, so a 2 h ΔT error shifts
        the elongation ~1°, which is 8.3% of a tithi. This is why BCE tithi *end
        times* carry roughly ±2 h."""
        jd = CivilDay(-2999, 3, 16).to_jd_ut()
        base = swe.deltat(jd)

        swe.set_delta_t_userdef(base)
        centre = self._elongation(jd)
        swe.set_delta_t_userdef(base + 2 / 24)
        plus = self._elongation(jd)

        drift = abs(plus - centre)
        assert drift == pytest.approx(1.0, abs=0.25), f"elongation moved {drift:.3f}°"
        assert drift / 12.0 < 0.12  # under 12% of a tithi

    def test_modern_dates_are_insensitive(self):
        """ΔT is known to the second at modern dates, so the historical
        uncertainty simply does not apply."""
        jd = CivilDay(2026, 6, 10).to_jd_ut()
        assert abs(swe.deltat(jd) * 86400) < 200  # ~70 s
