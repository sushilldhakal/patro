"""The Surya Siddhanta's engine: the :class:`EngineBase` primitives, from the text.

Every panchanga and kundali builder asks an engine the same handful of questions —
a graha's longitude and speed, the ayanamsha, the lagna, sunrise and sunset. This
one answers each from :mod:`.surya_siddhanta_math` and from nothing else: it
shares only the date and rise/set day logic of :class:`EngineBase` with drik,
never drik's ephemeris, ayanamsha modes or Lahiri. Positions are the text's own
निरयण longitudes; the ``ayanamsa`` argument the shared builders pass is ignored.

Eclipses and the yogatara stars are not implemented (the text has its own eclipse
chapters); asking for them raises :class:`NotInThisSiddhanta` rather than
answering from the ephemeris.
"""

from __future__ import annotations

import math

from engine.astronomy.engine import _BODY_MAP, CALC_RISE, EngineBase, _position
from engine.astronomy.siddhanta import surya_siddhanta_math as ss

_BODY_NAMES = {body_id: name for name, body_id in _BODY_MAP.items()}


class SuryaSiddhantaEngine(EngineBase):
    """Answers from the Surya Siddhanta. Valid for any day, no ephemeris files needed."""

    def _body_name(self, body: int) -> str:
        name = _BODY_NAMES.get(body)
        if name is None:
            raise ValueError(f"Surya Siddhanta has no body id {body}")
        return name

    def _calc(self, body: int, jd: float, *, sidereal: bool, ayanamsa: int | None = None) -> tuple[float, float]:
        key = (body, round(jd, 9), sidereal)
        cached = self._calc_cache.get(key)
        if cached is not None:
            self._cache_hits += 1
            self._calc_cache.move_to_end(key)
            return cached
        self._cache_misses += 1
        lon, speed = ss.true_longitude_and_speed(self._body_name(body), jd)
        if not sidereal:
            lon = (lon + ss.ayanamsha(jd)) % 360.0
        result = (lon % 360.0, speed)
        self._calc_cache[key] = result
        if len(self._calc_cache) > self._CACHE_MAX:
            self._calc_cache.popitem(last=False)
        return result

    # ── frame ────────────────────────────────────────────────────────────────

    def ayanamsa(self, jd: float, *, mode: int | None = None) -> float:
        return ss.ayanamsha(jd)

    def _obliquity(self, jd: float) -> float:
        return ss.OBLIQUITY

    def obliquity(self, jd: float) -> float:
        return ss.OBLIQUITY

    def equation_of_time(self, jd: float) -> float:
        return ss.equation_of_time_days(jd)

    def equatorial_from_ecliptic(self, jd: float, tropical_lon: float, ecl_lat: float = 0.0) -> tuple[float, float]:
        return ss.equatorial(tropical_lon, ecl_lat)

    def planet_astro_extras(self, jd: float, planet: str):
        name = "rahu" if planet == "ketu" else planet
        if name not in ss.BODIES:
            raise ValueError(f"Unknown planet: {planet!r}")
        lon, lat = ss.true_position(name, jd)
        if planet == "ketu":
            lon, lat = (lon + 180.0) % 360.0, -lat
        ra, dec = ss.equatorial(lon + ss.ayanamsha(jd), lat)
        return _position().CelestialCoordinates(
            latitude=round(lat, 4), right_ascension=round(ra, 4), declination=round(dec, 4)
        )

    def _calc_raw(self, body: int, jd: float, *, equatorial: bool = False) -> tuple[float, ...]:
        """(sayana lon or RA, lat or dec, distance 1, speed) — the shape the drik one returns."""
        name = self._body_name(body)
        lon, lat = ss.true_position(name, jd)
        sayana = (lon + ss.ayanamsha(jd)) % 360.0
        speed = ss.true_longitude_and_speed(name, jd)[1]
        if equatorial:
            ra, dec = ss.equatorial(sayana, lat)
            return (ra, dec, 1.0, speed, 0.0, 0.0)
        return (sayana, lat, 1.0, speed, 0.0, 0.0)

    def phenomena(self, jd: float, planet: str) -> dict[str, float]:
        """Elongation, phase and lit fraction from the text's own Sun and planet.

        The lit part of the Moon grows with its distance from the Sun as (1 − cos e)/2;
        the phase angle is taken as 180° − elongation (the Sun's distance is so much
        larger that the difference is negligible). The text has no magnitudes, and
        diameters it gives only for eclipses, so those two are 0.
        """
        if planet not in ss.BODIES or planet in ("sun", "rahu"):
            raise ValueError(f"No phenomena for body: {planet!r}")
        sun = ss.true_position("sun", jd)[0]
        body = ss.true_position(planet, jd)[0]
        elongation = abs(ss._signed(body - sun))
        phase_angle = 180.0 - elongation
        return {
            "phase_angle": phase_angle,
            "illuminated_fraction": (1.0 - math.cos(math.radians(elongation))) / 2.0,
            "elongation": elongation,
            "diameter": 0.0,
            "magnitude": 0.0,
        }

    # ── lagna ────────────────────────────────────────────────────────────────

    def ascendant(self, jd: float, lat: float, lon: float, *, ayanamsa: int | None = None) -> float:
        return ss.ascendant(jd, lat, lon)

    def ascendant_astro_extras(self, jd: float, lat: float, lon: float):
        from engine.astronomy.engine import ASCENDANT_SPEED_STEP_DAYS

        sayana = ss.ascendant_sayana(jd, lat, lon)
        ahead = ss.ascendant_sayana(jd + ASCENDANT_SPEED_STEP_DAYS, lat, lon)
        speed = (((ahead - sayana + 540.0) % 360.0) - 180.0) / ASCENDANT_SPEED_STEP_DAYS
        ra, dec = ss.equatorial(sayana)
        coordinates = _position().CelestialCoordinates(
            latitude=0.0, right_ascension=round(ra, 4), declination=round(dec, 4)
        )
        return coordinates, round(speed, 4)

    # ── rise / set ───────────────────────────────────────────────────────────

    def _rise_trans_jd(
        self, jd_start: float, body_id: int, calc_flag: int, lat: float, lon: float, alt: float
    ) -> float | None:
        # The text takes the centre on the true horizon: no refraction, no dip.
        return ss.next_rise_or_set(
            self._body_name(body_id), jd_start, lat, lon, rising=bool(calc_flag & CALC_RISE)
        )
