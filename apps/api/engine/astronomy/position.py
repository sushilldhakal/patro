"""BodyPosition — where one body is on the ecliptic at one instant.

The Astronomy context's answer to "where is it": every position the engine,
:mod:`~engine.astronomy.planets` and :mod:`~engine.astronomy.moon` hand out is a
:class:`BodyPosition`, not a dict. Rashi, DMS notation, वक्री and the motion
label are derived from the stored longitude and speed, so they can never
disagree with them.

``longitude`` and ``speed`` are stored as the engine rounds them (6 decimals);
everything derived is computed from those stored values, which is what the old
dicts did. :meth:`BodyPosition.to_payload` is the spashta-graha row the API
returns — byte-identical to the dict ``graha_positions`` used to build.

:class:`CelestialCoordinates` is the part that costs two extra ephemeris calls
(ecliptic latitude, right ascension, declination); a position carries it only
when it was asked for.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from engine.astronomy.motion import is_retrograde, motion_label, motion_label_ne
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE, rashi_index


def dms_absolute(longitude: float) -> str:
    """``DDD°MM'SS"`` of a longitude in [0, 360)."""
    d = int(longitude)
    m_frac = (longitude - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:03d}°{m:02d}\'{s:02d}"'


def dms_in_rashi(longitude: float) -> str:
    """``DD°MM'SS"`` of a longitude within its rashi."""
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


@dataclass(frozen=True, slots=True)
class CelestialCoordinates:
    """Ecliptic latitude (शर), right ascension and declination (क्रान्ति), degrees.

    All three are ayanamsha-independent.
    """

    latitude: float
    right_ascension: float
    declination: float

    def to_payload(self) -> dict[str, float]:
        return {
            "latitude": self.latitude,
            "right_ascension": self.right_ascension,
            "declination": self.declination,
        }


@dataclass(frozen=True, slots=True)
class BodyPosition:
    """One body's ecliptic longitude (°, [0, 360)) and its rate (°/day).

    ``body`` is the engine key (``"sun"`` … ``"rahu"``, ``"ketu"``); the
    retrograde rule needs it, since the nodes are वक्री by convention.
    Sidereal or tropical is the caller's choice when asking; the object only
    holds the number.
    """

    body: str
    longitude: float
    speed: float
    coordinates: CelestialCoordinates | None = None

    # ── derived ─────────────────────────────────────────────────────────────

    @property
    def rashi_index(self) -> int:
        """0–11 index into :data:`RASHI_NAMES`."""
        return rashi_index(self.longitude)

    @property
    def rashi(self) -> int:
        """1–12."""
        return self.rashi_index + 1

    @property
    def rashi_name(self) -> str:
        return RASHI_NAMES[self.rashi_index]

    @property
    def rashi_ne(self) -> str:
        return RASHI_NAMES_NE[self.rashi_index]

    @property
    def deg_in_rashi(self) -> float:
        return round(self.longitude % 30.0, 6)

    @property
    def is_retrograde(self) -> bool:
        """वक्री — the single definition, from :mod:`engine.astronomy.motion`."""
        return is_retrograde(self.body, self.speed)

    def motion(self, *, locale: str = "en") -> str:
        """``"Vakri"``/``"Margi"``, or ``"वक्री"``/``"मार्गी"`` when ``locale="ne"``."""
        label = motion_label_ne if locale == "ne" else motion_label
        return label(self.body, self.speed)

    # ── derived positions ───────────────────────────────────────────────────

    def opposite(self, body: str) -> BodyPosition:
        """The other end of a node axis: opposite longitude, negated speed.

        Ketu is Rahu's opposite rather than a separate calculation, so the two
        can never drift out of opposition.
        """
        return BodyPosition(
            body=body,
            longitude=round((self.longitude + 180.0) % 360, 6),
            speed=round(-self.speed, 6),
        )

    def with_coordinates(self, coordinates: CelestialCoordinates) -> BodyPosition:
        return replace(self, coordinates=coordinates)

    # ── payload ─────────────────────────────────────────────────────────────

    def to_payload(self) -> dict[str, Any]:
        """The spashta-graha row: rashi, DMS and वक्री, plus coordinates if known."""
        payload: dict[str, Any] = {
            "longitude": self.longitude,
            "speed": self.speed,
            "rashi": self.rashi,
            "rashi_name": self.rashi_name,
            "rashi_ne": self.rashi_ne,
            "dms": dms_absolute(self.longitude),
            "deg_in_rashi": self.deg_in_rashi,
            "dms_in_rashi": dms_in_rashi(self.longitude),
            "is_retrograde": self.is_retrograde,
        }
        if self.coordinates is not None:
            payload.update(self.coordinates.to_payload())
        return payload
