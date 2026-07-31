"""AstronomyEngine — single point of contact between Vedic logic and the ephemeris backend.

All swisseph calls live here. Nothing outside this file should import swisseph directly.
To swap backends (e.g. DE431, VSOP87) replace this class; callers stay unchanged.
"""

from __future__ import annotations

import math
from collections import OrderedDict
from datetime import date, datetime, time, timezone
from typing import Any

import threading

import swisseph as swe

from engine.astronomy.jd_calendar import CivilDay, date_if_supported
from engine.astronomy.paths import ephemeris_path
from engine.astronomy.timescale import resolve_observer_timezone


def _configure_ephemeris() -> bool:
    """Point swisseph at the bundled ``.se1`` files if they're present.

    The engine never passes an explicit ``FLG_SWIEPH``/``FLG_MOSEPH`` flag, so
    swisseph uses its default: try the Swiss binary ephemeris, fall back to the
    built-in Moshier analytical model per-date when a file is missing. Setting
    the path therefore upgrades in-range dates from Moshier to Swiss precision
    automatically, with no flag or call-site changes. When the directory has no
    ``.se1`` files (e.g. a fresh checkout before provisioning) we skip the call
    and keep the transparent Moshier fallback rather than pointing swisseph at
    an empty directory.

    Returns True when a populated ephemeris directory was configured.
    """
    ephe_dir = ephemeris_path()
    try:
        has_files = ephe_dir.is_dir() and any(ephe_dir.glob("*.se1"))
    except OSError:
        has_files = False
    if has_files:
        swe.set_ephe_path(str(ephe_dir))
    return has_files


EPHEMERIS_CONFIGURED = _configure_ephemeris()

# swisseph keeps its state — including the ephemeris path — *per thread*
# (pyswisseph 2.10 builds with thread-local storage). The module-level call above
# therefore configures only the thread that imported this module.
#
# That is not an academic detail: FastAPI runs sync endpoints in a starlette
# threadpool, so every request was served by a thread whose path was still
# swisseph's compiled-in default (``.:/users/ephe2/:/users/ephe/``). The .se1
# files were never found, every position silently fell back to the built-in
# Moshier model, and any date outside Moshier's JD 625000.5 … 2818000.5 window
# (3000 BCE … 3000 CE) failed outright — which is what made every BCE/BBS
# request 400 with "outside the installed ephemeris range" while the same call
# succeeded from a test importing the engine directly.
_THREAD_STATE = threading.local()


def _ensure_ephemeris_for_thread() -> None:
    """Point *this* thread's swisseph at the bundled ``.se1`` files, once.

    Cheap enough to call on every ephemeris entry point: after the first call
    per thread it is a single attribute read.
    """
    if getattr(_THREAD_STATE, "configured", False):
        return
    _configure_ephemeris()
    _THREAD_STATE.configured = True


def _is_ephe_file_missing(exc: Exception) -> bool:
    """True when a swisseph error means the required ``.se1`` file is absent.

    Once an ephemeris path is set, swisseph raises (rather than silently using
    Moshier) for a date outside the installed file range. The supported BS range
    is fully covered by the shipped files, so this only fires for internal
    over-steps — e.g. an eclipse or rise/set search that walks just past a file
    boundary — where a Moshier fallback keeps the old always-return-an-answer
    behaviour instead of crashing.
    """
    return "not found" in str(exc).lower()


def _horizon_dip_degrees(altitude_m: float) -> float:
    """Geometric dip of the visible horizon for an observer elevated
    ``altitude_m`` above sea level, in degrees (negative — the horizon sits
    below the astronomical horizontal plane, so rise comes earlier and set
    comes later). Standard geodetic approximation: dip = 1.76 * sqrt(h).

    ``swe.rise_trans``'s ``geopos`` altitude only feeds the auto-computed
    atmospheric pressure (thinner air -> less refraction) — it does *not*
    add this geometric dip. Only ``rise_trans_true_hor``'s explicit
    ``horhgt`` parameter does, which is what an elevated city like Kathmandu
    (~1400 m) needs to match published rise/set tables.
    """
    if altitude_m <= 0:
        return 0.0
    return -1.76 * math.sqrt(altitude_m) / 60.0

# ── body identifiers exposed as class attributes so callers never touch swe ──
_SUN = swe.SUN
_MOON = swe.MOON
_MERCURY = swe.MERCURY
_VENUS = swe.VENUS
_MARS = swe.MARS
_JUPITER = swe.JUPITER
_SATURN = swe.SATURN
_MEAN_NODE = swe.MEAN_NODE
_TRUE_NODE = swe.TRUE_NODE
_ECL_NUT = swe.ECL_NUT

_SIDEREAL_SPEED = swe.FLG_SIDEREAL | swe.FLG_SPEED
_TROPICAL_SPEED = swe.FLG_SPEED
# Phenomena are geometric (phase, elongation, disc) — no ayanamsha involved.
_PHENO_FLAGS = swe.FLG_SWIEPH

PLANET_KEYS = ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu")

# Rahu uses the mean node — matches Drik Panchang (verified against its
# published longitude for a real chart: mean node landed within the same
# ~40 arcsecond ayanamsha-formula tolerance seen on every other graha, while
# the true/osculating node was off by ~16.7 arcminutes). True node can differ
# from mean by up to ~1.75° and shift the rashi, nakshatra, or house near
# boundaries — some KP-style software prefers it, but it is not what
# Drik Panchang uses.
_BODY_MAP: dict[str, int] = {
    "sun": _SUN,
    "moon": _MOON,
    "mercury": _MERCURY,
    "venus": _VENUS,
    "mars": _MARS,
    "jupiter": _JUPITER,
    "saturn": _SATURN,
    "rahu": _MEAN_NODE,
}

SIDM_LAHIRI = swe.SIDM_LAHIRI
SIDM_RAMAN = swe.SIDM_RAMAN
SIDM_KRISHNAMURTI = swe.SIDM_KRISHNAMURTI
SIDM_TRUE_CITRA = swe.SIDM_TRUE_CITRA

CALC_RISE = swe.CALC_RISE
CALC_SET = swe.CALC_SET


class EphemerisError(Exception):
    pass


class AstronomyEngine:
    """Thin, swappable wrapper around an ephemeris backend.

    Usage::

        engine = AstronomyEngine()          # Lahiri sidereal by default
        engine = AstronomyEngine(ayanamsa=AstronomyEngine.RAMAN)

        jd  = engine.julian_day(utc_dt)
        lon = engine.sun_longitude(jd)
    """

    LAHIRI = SIDM_LAHIRI
    RAMAN = SIDM_RAMAN
    KP = SIDM_KRISHNAMURTI
    TRUE_CITRA = SIDM_TRUE_CITRA

    # Bound on the in-process astronomy memo. ~16k entries ≈ a full year of
    # sub-second instants across the bodies a panchanga build touches.
    _CACHE_MAX = 16384

    def __init__(self, ayanamsa: int = SIDM_LAHIRI) -> None:
        self._ayanamsa = ayanamsa
        swe.set_sid_mode(ayanamsa)
        # Global (location-independent) astronomy cache: (body, jd, sidereal) → (lon, speed).
        # Sun/Moon/planet longitudes depend only on time, so this is shared across every
        # observer. Location-dependent results (lagna, sunrise) are cached one layer up.
        self._calc_cache: "OrderedDict[tuple[int, float, bool], tuple[float, float]]" = OrderedDict()
        self._cache_hits = 0
        self._cache_misses = 0
        # Rise/set memo: a given (body, date, lat, lon, flag, alt, tz) is
        # deterministic, yet a single daily build asks for the same sunrise
        # ~11× (tithi, muhurta, hora, spans, nepal-sambat, …). Each miss is a
        # swe.rise_trans_true_hor search (~1 ms), so memoizing collapses a
        # whole-year build's rise/set cost several-fold. Location-independent
        # correctness is preserved — the key includes every geometry input.
        self._rise_cache: "OrderedDict[tuple, datetime | None]" = OrderedDict()
        # Phase / illumination memo — same (body, jd) reuse pattern as _calc.
        self._pheno_cache: "OrderedDict[tuple[int, float], dict[str, float]]" = OrderedDict()

    def _calc(
        self, body: int, jd: float, *, sidereal: bool, ayanamsa: int | None = None
    ) -> tuple[float, float]:
        """Cached (longitude % 360, speed) for one body — the single calc_ut hot path."""
        _ensure_ephemeris_for_thread()
        mode = self._ayanamsa if ayanamsa is None else ayanamsa
        key = (body, round(jd, 9), sidereal, mode if sidereal else -1)
        cached = self._calc_cache.get(key)
        if cached is not None:
            self._cache_hits += 1
            self._calc_cache.move_to_end(key)
            return cached

        self._cache_misses += 1
        flags = _SIDEREAL_SPEED if sidereal else _TROPICAL_SPEED
        if sidereal:
            swe.set_sid_mode(mode)
        try:
            values = swe.calc_ut(jd, body, flags)[0]
        except swe.Error as exc:
            if _is_ephe_file_missing(exc):
                # Date outside the installed .se1 range — compute this one date
                # with the built-in Moshier model rather than crashing. See
                # _is_ephe_file_missing for why this stays a rare edge path.
                try:
                    values = swe.calc_ut(jd, body, flags | swe.FLG_MOSEPH)[0]
                except (swe.Error, IndexError, TypeError, ValueError) as exc2:
                    raise EphemerisError(f"calc_ut failed for body {body}: {exc2}") from exc2
            elif not sidereal:
                raise EphemerisError(f"calc_ut failed for body {body}: {exc}") from exc
            else:
                # pyswisseph fails on FLG_SIDEREAL for the lunar nodes under
                # star-anchored sid modes (e.g. SIDM_TRUE_CITRA). Sidereal
                # longitude = tropical − ayanamsha, so compute it manually.
                try:
                    tropical = swe.calc_ut(jd, body, _TROPICAL_SPEED)[0]
                    values = (
                        (tropical[0] - swe.get_ayanamsa_ut(jd)) % 360,
                        tropical[1],
                        tropical[2],
                        tropical[3],
                    )
                except (swe.Error, IndexError, TypeError, ValueError) as exc2:
                    raise EphemerisError(f"calc_ut failed for body {body}: {exc2}") from exc2
        except (IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"calc_ut failed for body {body}: {exc}") from exc

        result = (values[0] % 360, values[3])
        self._calc_cache[key] = result
        if len(self._calc_cache) > self._CACHE_MAX:
            self._calc_cache.popitem(last=False)
        return result

    def cache_info(self) -> dict[str, int]:
        """Hits / misses / size for the in-process astronomy memo."""
        return {
            "hits": self._cache_hits,
            "misses": self._cache_misses,
            "size": len(self._calc_cache),
            "max_size": self._CACHE_MAX,
        }

    def cache_clear(self) -> None:
        self._calc_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0

    # ── time ────────────────────────────────────────────────────────────────

    def julian_day(self, dt: datetime) -> float:
        """UTC datetime → Julian Day Number."""
        from engine.astronomy.ut_instant import UtInstant

        if isinstance(dt, UtInstant):
            return dt.jd_ut
        if dt.tzinfo is None:
            raise EphemerisError(f"Datetime must have timezone info: {dt}")
        utc = dt.astimezone(timezone.utc)
        hour = utc.hour + utc.minute / 60.0 + utc.second / 3600.0
        return swe.julday(utc.year, utc.month, utc.day, hour)

    def datetime_from_jd(self, jd: float) -> datetime:
        """Julian Day Number → UTC datetime (BCE uses ``UtInstant``)."""
        year, month, day, hour = swe.revjul(jd)
        if year >= 1:
            h = int(hour)
            m = int((hour - h) * 60)
            s = int(((hour - h) * 60 - m) * 60)
            return datetime(year, month, day, h, m, s, tzinfo=timezone.utc)
        from engine.astronomy.ut_instant import UtInstant

        return UtInstant(float(jd))  # type: ignore[return-value]

    # ── longitudes ──────────────────────────────────────────────────────────

    def sun_longitude(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Sun ecliptic longitude in degrees [0, 360)."""
        return self._longitude(_SUN, jd, sidereal=sidereal, ayanamsa=ayanamsa)

    def moon_longitude(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Moon ecliptic longitude in degrees [0, 360)."""
        return self._longitude(_MOON, jd, sidereal=sidereal, ayanamsa=ayanamsa)

    def sun_moon_longitudes(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> tuple[float, float]:
        """(sun_lon, moon_lon) in a single round-trip."""
        return (
            self._calc(_SUN, jd, sidereal=sidereal, ayanamsa=ayanamsa)[0],
            self._calc(_MOON, jd, sidereal=sidereal, ayanamsa=ayanamsa)[0],
        )

    def planet_longitude(
        self, jd: float, planet: str, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Named planet ecliptic longitude. planet ∈ PLANET_KEYS."""
        body = _BODY_MAP.get(planet)
        if body is None:
            raise EphemerisError(f"Unknown planet: {planet!r}")
        return self._longitude(body, jd, sidereal=sidereal, ayanamsa=ayanamsa)

    def planet_position(
        self, jd: float, planet: str, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> dict[str, Any]:
        """longitude, speed (°/day), rashi (1-12) for one named planet."""
        body = _BODY_MAP.get(planet)
        if body is None:
            raise EphemerisError(f"Unknown planet: {planet!r}")
        lon, speed = self._calc(body, jd, sidereal=sidereal, ayanamsa=ayanamsa)
        return {
            "longitude": round(lon, 6),
            "speed": round(speed, 6),
            "rashi": int(lon / 30) % 12 + 1,
        }

    def all_planet_positions(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> dict[str, dict[str, Any]]:
        """Sun through Rahu + derived Ketu."""
        return {
            name: self.planet_position(jd, name, sidereal=sidereal, ayanamsa=ayanamsa)
            for name in PLANET_KEYS
        }

    # ── equatorial / astro extras ────────────────────────────────────────────

    def _obliquity(self, jd: float) -> float:
        """True obliquity of the ecliptic (degrees)."""
        _ensure_ephemeris_for_thread()
        try:
            return swe.calc_ut(jd, _ECL_NUT, 0)[0][0]
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"obliquity failed: {exc}") from exc

    def equatorial_from_ecliptic(
        self, jd: float, tropical_lon: float, ecl_lat: float = 0.0
    ) -> tuple[float, float]:
        """(right ascension, declination) in degrees from tropical ecliptic coords."""
        eps = self._obliquity(jd)
        try:
            ra, dec, _ = swe.cotrans((tropical_lon, ecl_lat, 1.0), -eps)
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"cotrans failed: {exc}") from exc
        return ra % 360, dec

    def planet_astro_extras(self, jd: float, planet: str) -> dict[str, Any]:
        """Ecliptic latitude (shara), right ascension and declination (kranti).

        Equatorial values are ayanamsha-independent. 'ketu' is derived from the
        node axis: opposite tropical longitude, mirrored latitude.
        """
        if planet == "ketu":
            ecl = self._calc_raw(_BODY_MAP["rahu"], jd)
            lon = (ecl[0] + 180.0) % 360
            lat = -ecl[1]
            ra, dec = self.equatorial_from_ecliptic(jd, lon, lat)
            return {
                "latitude": round(lat, 4),
                "right_ascension": round(ra, 4),
                "declination": round(dec, 4),
            }
        body = _BODY_MAP.get(planet)
        if body is None:
            raise EphemerisError(f"Unknown planet: {planet!r}")
        ecl = self._calc_raw(body, jd)
        equ = self._calc_raw(body, jd, equatorial=True)
        return {
            "latitude": round(ecl[1], 4),
            "right_ascension": round(equ[0] % 360, 4),
            "declination": round(equ[1], 4),
        }

    def phenomena(self, jd: float, planet: str) -> dict[str, float]:
        """Phase angle, illuminated fraction, elongation, diameter, magnitude.

        The only ``pheno_ut`` call in the codebase. ``phase_angle`` and
        ``elongation`` are degrees, ``illuminated_fraction`` is 0–1, ``diameter``
        is apparent diameter in degrees.

        'ketu' has no disc, so it has no phenomena; it raises rather than
        returning a plausible-looking zero.
        """
        _ensure_ephemeris_for_thread()
        body = _BODY_MAP.get(planet)
        if body is None or planet == "ketu":
            raise EphemerisError(f"No phenomena for body: {planet!r}")
        cached = self._pheno_cache.get((body, round(jd, 9)))
        if cached is not None:
            self._pheno_cache.move_to_end((body, round(jd, 9)))
            return cached
        try:
            values = swe.pheno_ut(jd, body, _PHENO_FLAGS)
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"pheno_ut failed for {planet!r}: {exc}") from exc
        result = {
            "phase_angle": values[0] % 360.0,
            "illuminated_fraction": values[1],
            "elongation": values[2],
            "diameter": values[3],
            "magnitude": values[4],
        }
        self._pheno_cache[(body, round(jd, 9))] = result
        if len(self._pheno_cache) > self._CACHE_MAX:
            self._pheno_cache.popitem(last=False)
        return result

    def _calc_raw(
        self, body: int, jd: float, *, equatorial: bool = False
    ) -> tuple[float, ...]:
        """Uncached tropical calc — (lon/RA, lat/dec, dist, speeds…)."""
        _ensure_ephemeris_for_thread()
        flags = _TROPICAL_SPEED | (swe.FLG_EQUATORIAL if equatorial else 0)
        try:
            return swe.calc_ut(jd, body, flags)[0]
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"calc_ut failed for body {body}: {exc}") from exc

    def ascendant_astro_extras(
        self, jd: float, lat: float, lon: float
    ) -> dict[str, Any]:
        """Lagna shara (0 by definition), RA, kranti and speed in °/day."""
        _ensure_ephemeris_for_thread()
        try:
            _, ascmc = swe.houses(jd, lat, lon, b"P")
            tropical_asc = ascmc[0]
            step_days = 60.0 / 86400.0
            _, ascmc_next = swe.houses(jd + step_days, lat, lon, b"P")
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"houses failed: {exc}") from exc
        speed = (((ascmc_next[0] - tropical_asc + 540.0) % 360.0) - 180.0) / step_days
        ra, dec = self.equatorial_from_ecliptic(jd, tropical_asc, 0.0)
        return {
            "latitude": 0.0,
            "right_ascension": round(ra, 4),
            "declination": round(dec, 4),
            "speed": round(speed, 4),
        }

    # ── ascendant ────────────────────────────────────────────────────────────

    def ascendant(
        self, jd: float, lat: float, lon: float, *, ayanamsa: int | None = None
    ) -> float:
        """Sidereal ascendant longitude in degrees [0, 360)."""
        _ensure_ephemeris_for_thread()
        mode = self._ayanamsa if ayanamsa is None else ayanamsa
        swe.set_sid_mode(mode)
        try:
            _, ascmc = swe.houses(jd, lat, lon, b"P")
            tropical_asc = ascmc[0]
            return (tropical_asc - swe.get_ayanamsa_ut(jd)) % 360
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"Ascendant calculation failed: {exc}") from exc

    # ── ayanamsa ─────────────────────────────────────────────────────────────

    def ayanamsa(self, jd: float, *, mode: int | None = None) -> float:
        """Ayanamsa in degrees at the given JD."""
        _ensure_ephemeris_for_thread()
        swe.set_sid_mode(self._ayanamsa if mode is None else mode)
        return swe.get_ayanamsa_ut(jd)

    # ── obliquity ────────────────────────────────────────────────────────────

    def obliquity(self, jd: float) -> float:
        """True obliquity of the ecliptic in degrees."""
        _ensure_ephemeris_for_thread()
        try:
            return swe.calc_ut(jd, _ECL_NUT)[0][0]
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"Obliquity calculation failed: {exc}") from exc

    # ── equation of time ─────────────────────────────────────────────────────

    def equation_of_time(self, jd: float) -> float:
        """Equation of time in days (apparent − mean solar time)."""
        _ensure_ephemeris_for_thread()
        try:
            return float(swe.time_equ(jd))
        except (swe.Error, TypeError, ValueError) as exc:
            raise EphemerisError(f"Equation of time failed: {exc}") from exc

    # ── eclipses ─────────────────────────────────────────────────────────────

    def next_solar_eclipse_max(self, jd: float, *, backward: bool = False) -> float | None:
        """JD of the next (or previous) global solar-eclipse maximum."""
        _ensure_ephemeris_for_thread()
        try:
            _retflag, tret = swe.sol_eclipse_when_glob(
                jd, swe.FLG_SWIEPH, 0, backward
            )
            return float(tret[0])
        except (swe.Error, IndexError, TypeError, ValueError):
            return None

    def next_lunar_eclipse_max(self, jd: float, *, backward: bool = False) -> float | None:
        """JD of the next (or previous) lunar-eclipse maximum."""
        _ensure_ephemeris_for_thread()
        try:
            _retflag, tret = swe.lun_eclipse_when(
                jd, swe.FLG_SWIEPH, 0, backward
            )
            return float(tret[0])
        except (swe.Error, IndexError, TypeError, ValueError):
            return None

    @staticmethod
    def _solar_eclipse_kind(retflag: int) -> str:
        """Map a swisseph solar-eclipse retflag to a coarse type key."""
        if retflag & swe.ECL_TOTAL:
            return "total"
        if retflag & swe.ECL_ANNULAR_TOTAL:
            return "hybrid"
        if retflag & swe.ECL_ANNULAR:
            return "annular"
        if retflag & swe.ECL_PARTIAL:
            return "partial"
        return "partial"

    @staticmethod
    def _lunar_eclipse_kind(retflag: int) -> str:
        """Map a swisseph lunar-eclipse retflag to a coarse type key."""
        if retflag & swe.ECL_TOTAL:
            return "total"
        if retflag & swe.ECL_PARTIAL:
            return "partial"
        if retflag & swe.ECL_PENUMBRAL:
            return "penumbral"
        return "penumbral"

    def next_solar_eclipse(
        self, jd: float, *, backward: bool = False, geopos: tuple[float, float, float] | None = None
    ) -> dict[str, Any] | None:
        """Next/previous global solar eclipse with type + optional local visibility.

        ``geopos`` = (lon, lat, altitude). When given, local contact times and a
        ``visible`` flag are attached (whether the eclipse is seen from that place).
        """
        _ensure_ephemeris_for_thread()
        try:
            retflag, tret = swe.sol_eclipse_when_glob(jd, swe.FLG_SWIEPH, 0, backward)
        except (swe.Error, IndexError, TypeError, ValueError):
            return None
        max_jd = float(tret[0])
        out: dict[str, Any] = {
            "kind": "solar",
            "type": self._solar_eclipse_kind(int(retflag)),
            "max_jd": max_jd,
            "visible": False,
        }
        if geopos is not None:
            out.update(self._solar_eclipse_local(max_jd, geopos))
        return out

    def next_lunar_eclipse(
        self, jd: float, *, backward: bool = False, geopos: tuple[float, float, float] | None = None
    ) -> dict[str, Any] | None:
        """Next/previous lunar eclipse with type + optional local visibility."""
        _ensure_ephemeris_for_thread()
        try:
            retflag, tret = swe.lun_eclipse_when(jd, swe.FLG_SWIEPH, 0, backward)
        except (swe.Error, IndexError, TypeError, ValueError):
            return None
        max_jd = float(tret[0])
        out: dict[str, Any] = {
            "kind": "lunar",
            "type": self._lunar_eclipse_kind(int(retflag)),
            "max_jd": max_jd,
            # tret indices: 0 max, 2 partial begin, 3 partial end,
            # 4 penumbral begin, 5 penumbral end (total begin/end at 6/7).
            "partial_begin_jd": float(tret[2]) or None,
            "partial_end_jd": float(tret[3]) or None,
            "penumbral_begin_jd": float(tret[4]) or None,
            "penumbral_end_jd": float(tret[5]) or None,
            "visible": False,
        }
        if geopos is not None:
            out.update(self._lunar_eclipse_local(max_jd, geopos))
        return out

    def _solar_eclipse_local(
        self, near_jd: float, geopos: tuple[float, float, float]
    ) -> dict[str, Any]:
        """Local circumstances of the solar eclipse whose maximum is near ``near_jd``."""
        _ensure_ephemeris_for_thread()
        try:
            retflag, tret, _attr = swe.sol_eclipse_when_loc(
                near_jd - 1.0, geopos, swe.FLG_SWIEPH, False
            )
        except (swe.Error, IndexError, TypeError, ValueError):
            return {}
        local_max = float(tret[0])
        # The local search may skip to a later eclipse if this one is invisible here.
        if abs(local_max - near_jd) > 0.75:
            return {"visible": False}
        return {
            "visible": bool(retflag & (swe.ECL_VISIBLE)),
            "local_type": self._solar_eclipse_kind(int(retflag)),
            "local_max_jd": local_max,
            # tret: 0 max, 1 first contact, 4 last contact (partial phase edges).
            "local_begin_jd": float(tret[1]) or None,
            "local_end_jd": float(tret[4]) or None,
        }

    def _lunar_eclipse_local(
        self, near_jd: float, geopos: tuple[float, float, float]
    ) -> dict[str, Any]:
        """Whether the lunar eclipse near ``near_jd`` is above the horizon locally."""
        _ensure_ephemeris_for_thread()
        try:
            retflag, tret, _attr = swe.lun_eclipse_when_loc(
                near_jd - 1.0, geopos, swe.FLG_SWIEPH, False
            )
        except (swe.Error, IndexError, TypeError, ValueError):
            return {}
        local_max = float(tret[0])
        if abs(local_max - near_jd) > 0.75:
            return {"visible": False}
        return {
            "visible": bool(retflag & swe.ECL_VISIBLE),
            "local_max_jd": local_max,
        }

    # ── rise / set ───────────────────────────────────────────────────────────

    def rise(
        self,
        date_val: date,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
        *,
        timezone_name: str | None = None,
    ) -> datetime | None:
        """Next rise of body on date_val. Returns UTC datetime or None (circumpolar)."""
        return self._rise_set(date_val, body, CALC_RISE, lat, lon, alt, timezone_name=timezone_name)

    def set(
        self,
        date_val: date,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
        *,
        timezone_name: str | None = None,
    ) -> datetime | None:
        """Next set of body on date_val. Returns UTC datetime or None (circumpolar)."""
        return self._rise_set(date_val, body, CALC_SET, lat, lon, alt, timezone_name=timezone_name)

    def rise_after(
        self,
        after_dt: datetime,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
    ) -> datetime | None:
        """Rise of body at or after after_dt (panchanga day = sunrise to sunrise)."""
        return self._rise_set_after(after_dt, body, CALC_RISE, lat, lon, alt)

    def set_after(
        self,
        after_dt: datetime,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
    ) -> datetime | None:
        """Set of body at or after after_dt."""
        return self._rise_set_after(after_dt, body, CALC_SET, lat, lon, alt)

    def rise_civil(
        self,
        civil: CivilDay,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
        *,
        timezone_name: str | None = None,
    ) -> datetime | None:
        """Rise on a proleptic civil day (BCE-safe — no ``datetime.date``)."""
        return self._rise_set_civil(
            civil, body, CALC_RISE, lat, lon, alt, timezone_name=timezone_name
        )

    def set_civil(
        self,
        civil: CivilDay,
        body: str,
        lat: float,
        lon: float,
        alt: float = 0.0,
        *,
        timezone_name: str | None = None,
    ) -> datetime | None:
        """Set on a proleptic civil day (BCE-safe)."""
        return self._rise_set_civil(
            civil, body, CALC_SET, lat, lon, alt, timezone_name=timezone_name
        )

    # ── private helpers ──────────────────────────────────────────────────────

    def _longitude(
        self, body: int, jd: float, *, sidereal: bool, ayanamsa: int | None = None
    ) -> float:
        return self._calc(body, jd, sidereal=sidereal, ayanamsa=ayanamsa)[0]

    def _rise_set(
        self,
        date_val: date,
        body: str,
        calc_flag: int,
        lat: float,
        lon: float,
        alt: float,
        *,
        timezone_name: str | None,
    ) -> datetime | None:
        _ensure_ephemeris_for_thread()
        # A pre-1 CE day arrives as a ``CivilDay``, which ``datetime.combine``
        # below cannot take. The JD-native twin computes the same instant (both
        # agree to 0.0s on CE days), so route those straight to it.
        if not isinstance(date_val, date):
            return self._rise_set_civil(
                date_val, body, calc_flag, lat, lon, alt, timezone_name=timezone_name
            )
        body_id = _BODY_MAP.get(body)
        if body_id is None:
            raise EphemerisError(f"Unknown body: {body!r}")
        observer_tz = resolve_observer_timezone(timezone_name, lat=lat, lon=lon)
        cache_key = (
            body_id, calc_flag, date_val,
            round(lat, 6), round(lon, 6), round(alt, 3),
            str(observer_tz),
        )
        cached = self._rise_cache.get(cache_key)
        if cached is not None or cache_key in self._rise_cache:
            self._rise_cache.move_to_end(cache_key)
            return cached
        local_midnight = datetime.combine(date_val, time(0, 0), tzinfo=observer_tz)
        jd_start = self.julian_day(local_midnight.astimezone(timezone.utc))
        try:
            result = swe.rise_trans_true_hor(
                jd_start, body_id, calc_flag, (lon, lat, alt), 0.0, 0.0, _horizon_dip_degrees(alt)
            )
            value = None if result[0] < 0 else self.datetime_from_jd(result[1][0])
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"Rise/set failed for {body!r} on {date_val}: {exc}") from exc
        self._rise_cache[cache_key] = value
        if len(self._rise_cache) > self._CACHE_MAX:
            self._rise_cache.popitem(last=False)
        return value

    @staticmethod
    def _utc_offset_days(civil: CivilDay, observer_tz: Any) -> float:
        """Observer's UTC offset on *civil*, in days — the local-midnight anchor.

        A CE day gets the real zone offset for that date (so DST and historical
        zone changes are honoured and the result matches ``datetime.combine``
        exactly). A BCE day has no tz-database coverage, so it takes the zone's
        modern standard offset — the same approximation ``local_wall_instant``
        makes for pre-1 CE wall-clock times.
        """
        real_date = date_if_supported(civil.year, civil.month, civil.day)
        ref = (
            datetime.combine(real_date, time(0, 0), tzinfo=observer_tz)
            if real_date is not None
            else datetime(2000, 6, 15, 12, 0, tzinfo=observer_tz)
        )
        offset = ref.utcoffset()
        return 0.0 if offset is None else offset.total_seconds() / 86400.0

    def _rise_set_civil(
        self,
        civil: CivilDay,
        body: str,
        calc_flag: int,
        lat: float,
        lon: float,
        alt: float,
        *,
        timezone_name: str | None,
    ) -> datetime | None:
        _ensure_ephemeris_for_thread()
        body_id = _BODY_MAP.get(body)
        if body_id is None:
            raise EphemerisError(f"Unknown body: {body!r}")
        observer_tz = resolve_observer_timezone(timezone_name, lat=lat, lon=lon)
        cache_key = (
            body_id,
            calc_flag,
            civil.year,
            civil.month,
            civil.day,
            round(lat, 6),
            round(lon, 6),
            round(alt, 3),
            str(observer_tz),
            "civil",
        )
        cached = self._rise_cache.get(cache_key)
        if cached is not None or cache_key in self._rise_cache:
            self._rise_cache.move_to_end(cache_key)
            return cached
        # Search from LOCAL midnight on the civil day — the same anchor the
        # ``date`` path uses, so the two agree to 0.0s wherever both can express
        # the day. Anchoring at UT instead (``to_jd_ut() - 0.5``) silently
        # shifted the window by the observer's offset: east of Greenwich it
        # opened early enough to catch the *previous* day's event and return it
        # as this day's, which is a whole-day error, not a rounding one.
        jd_start = civil.to_jd_ut() - self._utc_offset_days(civil, observer_tz)
        try:
            result = swe.rise_trans_true_hor(
                jd_start, body_id, calc_flag, (lon, lat, alt), 0.0, 0.0, _horizon_dip_degrees(alt)
            )
            value = None if result[0] < 0 else self.datetime_from_jd(result[1][0])
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(
                f"Rise/set failed for {body!r} on civil {civil}: {exc}"
            ) from exc
        self._rise_cache[cache_key] = value
        if len(self._rise_cache) > self._CACHE_MAX:
            self._rise_cache.popitem(last=False)
        return value

    def _rise_set_after(
        self,
        after_dt: datetime,
        body: str,
        calc_flag: int,
        lat: float,
        lon: float,
        alt: float,
    ) -> datetime | None:
        _ensure_ephemeris_for_thread()
        body_id = _BODY_MAP.get(body)
        if body_id is None:
            raise EphemerisError(f"Unknown body: {body!r}")
        jd_start = self.julian_day(after_dt.astimezone(timezone.utc))
        try:
            result = swe.rise_trans_true_hor(
                jd_start, body_id, calc_flag, (lon, lat, alt), 0.0, 0.0, _horizon_dip_degrees(alt)
            )
            if result[0] < 0:
                return None
            return self.datetime_from_jd(result[1][0])
        except (swe.Error, IndexError, TypeError, ValueError) as exc:
            raise EphemerisError(f"Rise/set after {after_dt} failed for {body!r}: {exc}") from exc


# Module-level singleton — existing code can import this directly
# while the migration to passing the engine instance is in progress.
default_engine = AstronomyEngine()
