"""PlanetService — planetary positions, speed and motion, keyed by Julian Day.

Retrograde is *not* re-derived here: it delegates to
:mod:`engine.astronomy.motion`, which is the single definition (phase 1). This
service exposes it so routes and builders never have to reach for the raw speed
and decide for themselves — which is how five inline copies happened.

:func:`spashta_table` is the full स्पष्ट ग्रह row set — every graha with its
rashi, DMS notation, वक्री flag and अस्त (combustion) flag. It came from
``swiss_eph.get_all_planetary_positions``; the only change is that it takes a JD
rather than a ``datetime``.

See docs/computation-architecture-audit.md (sections A3, C, phase 2).
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import PLANET_KEYS, SIDM_LAHIRI, default_engine
from engine.astronomy.motion import is_retrograde, motion_label, motion_label_ne
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE, rashi_index

# Sun through Saturn, plus both nodes. Ketu is derived (Rahu + 180°), so it is
# not in the engine's PLANET_KEYS but is a graha everywhere above this layer.
GRAHA_KEYS: tuple[str, ...] = (*PLANET_KEYS, "ketu")

# Planet name → the string key AstronomyEngine understands. Kept as a mapping
# rather than a bare tuple because call sites index it by name.
PLANET_IDS: dict[str, str] = {name: name for name in PLANET_KEYS}


class PlanetService:
    """Graha quantities at a Julian Day. Stateless — see ``planet_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    def longitude(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> float:
        """Ecliptic longitude in degrees [0, 360)."""
        if graha == "ketu":
            return (
                self.longitude(jd, "rahu", sidereal=sidereal, ayanamsa=ayanamsa) + 180.0
            ) % 360.0
        return self._engine.planet_longitude(
            jd, graha, sidereal=sidereal, ayanamsa=ayanamsa
        )

    def speed(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> float:
        """Longitude rate in degrees/day. Negative means retrograde motion —
        but ask :meth:`is_retrograde`, not the sign, for the display answer."""
        if graha == "ketu":
            return -self.speed(jd, "rahu", sidereal=sidereal, ayanamsa=ayanamsa)
        return float(
            self._engine.planet_position(
                jd, graha, sidereal=sidereal, ayanamsa=ayanamsa
            )["speed"]
        )

    def is_retrograde(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> bool:
        """वक्री at this instant — the single definition, from ``motion``."""
        return is_retrograde(
            graha, self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        )

    def motion(
        self,
        jd: float,
        graha: str,
        *,
        locale: str = "en",
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> str:
        """``"Vakri"``/``"Margi"``, or ``"वक्री"``/``"मार्गी"`` when ``locale="ne"``."""
        speed = self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        label = motion_label_ne if locale == "ne" else motion_label
        return label(graha, speed)

    def position(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> dict[str, Any]:
        """longitude, speed, rashi and motion — one cached ephemeris call.

        Deliberately excludes latitude / RA / declination: those come from
        ``planet_astro_extras``, which is *not* memoised and costs two extra
        ``calc_ut`` calls per body. Callers that need them ask for
        :meth:`position_with_extras` explicitly rather than paying for them on
        every sunrise table.
        """
        longitude = self.longitude(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        speed = self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        return {
            "graha": graha,
            "longitude": round(longitude, 6),
            "speed": round(speed, 6),
            "rashi": rashi_index(longitude) + 1,
            "is_retrograde": is_retrograde(graha, speed),
            "motion": motion_label(graha, speed),
        }

    def position_with_extras(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> dict[str, Any]:
        """:meth:`position` plus ecliptic latitude (शर), RA and declination (क्रान्ति)."""
        base = self.position(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        return {**base, **self._engine.planet_astro_extras(jd, graha)}

    def all_positions(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> dict[str, dict[str, Any]]:
        """Every graha at this instant, keyed by name."""
        return {
            graha: self.position(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
            for graha in GRAHA_KEYS
        }


# ── spashta graha table ──────────────────────────────────────────────────────


def _dms_absolute(longitude: float) -> str:
    d = int(longitude)
    m_frac = (longitude - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:03d}°{m:02d}\'{s:02d}"'


def _dms_in_sign(longitude: float) -> str:
    deg_in_sign = longitude % 30.0
    d = int(deg_in_sign)
    m_frac = (deg_in_sign - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:02d}°{m:02d}\'{s:02d}"'


def _enrich_planet_position(pos: dict[str, Any], *, body: str) -> dict[str, Any]:
    longitude = float(pos["longitude"])
    index = rashi_index(longitude)
    speed = float(pos.get("speed", 0.0))
    return {
        **pos,
        "rashi": index + 1,
        "rashi_name": RASHI_NAMES[index],
        "rashi_ne": RASHI_NAMES_NE[index],
        "dms": _dms_absolute(longitude),
        "deg_in_rashi": round(longitude % 30.0, 6),
        "dms_in_rashi": _dms_in_sign(longitude),
        "is_retrograde": is_retrograde(body, speed),
    }


def _annotate_combustion(positions: dict[str, Any]) -> None:
    """Flag each body ``is_combust`` (अस्त) using the SAME heliacal definition as
    the standalone /graha-asta page, so the sunrise spashtagraha, D-charts and
    gochar tables agree with it date-for-date.

    Planets (mars, mercury, jupiter, venus, saturn) reuse the Surya-Siddhanta
    arcus-visionis orbs from ``engine.vedic.udayast`` (direction- and
    retrograde-aware); the Moon uses the चन्द्र तारा अस्त elongation orb from
    ``engine.vedic.graha_detail``. The Sun and the shadow nodes (Rahu/Ketu)
    never combust.

    The orbs live in ``engine.vedic`` and are imported lazily: they are a
    siddhantic convention, not ephemeris geometry, so they belong above this
    layer even though the table that consumes them is built here."""
    from engine.vedic.graha_detail import MOON_ASTA_ORB
    from engine.vedic.udayast import UDAYAST_GRAHAS, combustion_threshold

    sun_lon = positions.get("sun", {}).get("longitude")
    for key, pos in positions.items():
        pos["is_combust"] = False
        if sun_lon is None:
            continue
        lon = pos.get("longitude")
        if lon is None:
            continue
        # Geocentric sidereal elongation from the Sun (ayanamsha-independent).
        diff = (lon - sun_lon) % 360.0
        separation = min(diff, 360.0 - diff)
        if key in UDAYAST_GRAHAS:
            east_of_sun = diff < 180.0
            retro = bool(pos.get("is_retrograde", False))
            pos["is_combust"] = separation < combustion_threshold(key, retro, east_of_sun)
        elif key == "moon":
            pos["is_combust"] = separation < MOON_ASTA_ORB


def spashta_table(
    jd: float,
    *,
    sidereal: bool = True,
    ayanamsa: int = SIDM_LAHIRI,
) -> dict[str, Any]:
    """स्पष्ट ग्रह — every graha at *jd* with rashi, DMS, वक्री and अस्त flags.

    Ketu is derived from Rahu (opposite longitude, negated speed) rather than
    calculated: they are the two ends of one node axis, so computing them
    separately is both wasted work and a way for them to drift out of opposition.
    """
    raw = default_engine.all_planet_positions(jd, sidereal=sidereal, ayanamsa=ayanamsa)

    positions: dict[str, Any] = {
        name: _enrich_planet_position(raw[name], body=name) for name in PLANET_IDS
    }

    # The nodes' वक्री-by-convention rule lives in engine.astronomy.motion and is
    # applied by _enrich_planet_position above — no post-hoc overwrite here.
    rahu_long = positions["rahu"]["longitude"]
    ketu_long = (rahu_long + 180.0) % 360
    positions["ketu"] = _enrich_planet_position(
        {
            "longitude": round(ketu_long, 6),
            "speed": round(-positions["rahu"]["speed"], 6),
            "rashi": rashi_index(ketu_long) + 1,
        },
        body="ketu",
    )

    _annotate_combustion(positions)
    return positions


planet_service = PlanetService()
