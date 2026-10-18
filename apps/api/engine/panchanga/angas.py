"""PanchangaService — the five angas, keyed by Julian Day.

This module owns the anga arithmetic that used to live in
:mod:`engine.astronomy.positions`. It is the one place where a Sun/Moon
longitude pair becomes a tithi, nakshatra, yoga, karana or vara:

    tithi     = (moon − sun) / 12°          → 30 per lunation
    nakshatra = moon / (360/27)             → 27 per circuit
    yoga      = (sun + moon) / (360/27)     → 27
    karana    = (moon − sun) / 6°           → 60 per lunation, 11 names
    vara      = local weekday at the JD

``positions.py`` now delegates here, so the datetime-shaped call sites keep
working unchanged while there is exactly one implementation underneath.

See docs/computation-architecture-audit.md (phase 2).
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import default_engine

TITHI_SPAN = 12.0
NAKSHATRA_SPAN = 360.0 / 27.0
YOGA_SPAN = 360.0 / 27.0
KARANA_SPAN = 6.0

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
    "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

YOGA_NAMES = [
    "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
    "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]

KARANA_NAMES = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti",
    "Shakuni", "Chatushpada", "Naga", "Kimstughna",
]

# The four fixed karanas bookend the lunation: Kimstughna occupies the first
# half-tithi, and Shakuni/Chatushpada/Naga the last three.
FIXED_KARANA_TAIL = ("Shakuni", "Chatushpada", "Naga")

VAARA_NAMES = [
    "Ravivara", "Somavara", "Mangalavara", "Budhavara",
    "Guruvara", "Shukravara", "Shanivara",
]
VAARA_ENGLISH = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
]


class PanchangaService:
    """The five angas at a Julian Day. Stateless — see ``panchanga_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    # ── the angle everything hangs off ──────────────────────────────────────

    def elongation(self, jd: float, *, ayanamsa: int | None = None) -> float:
        """Sun→Moon elongation in degrees [0, 360).

        Tithi and karana are both cuts of this one angle, so they can never
        disagree about which half of a tithi the instant falls in.
        """
        sun_lon, moon_lon = self._engine.sun_moon_longitudes(
            jd, sidereal=True, ayanamsa=ayanamsa
        )
        return (moon_lon - sun_lon) % 360.0

    # ── tithi ───────────────────────────────────────────────────────────────

    def tithi_number(self, jd: float, *, ayanamsa: int | None = None) -> int:
        """1–30, counting from Shukla Pratipada."""
        return int(self.elongation(jd, ayanamsa=ayanamsa) / TITHI_SPAN) + 1

    def tithi_progress(self, jd: float, *, ayanamsa: int | None = None) -> float:
        """How far through the current tithi, 0.0–1.0."""
        return (self.elongation(jd, ayanamsa=ayanamsa) % TITHI_SPAN) / TITHI_SPAN

    def tithi(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Number, paksha, display number (1–15) and progress."""
        elongation = self.elongation(jd, ayanamsa=ayanamsa)
        number = int(elongation / TITHI_SPAN) + 1
        return {
            "number": number,
            "paksha": "shukla" if number <= 15 else "krishna",
            "display_number": number if number <= 15 else number - 15,
            "progress": (elongation % TITHI_SPAN) / TITHI_SPAN,
            "elongation": elongation,
        }

    # ── nakshatra ───────────────────────────────────────────────────────────

    def nakshatra(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Moon's nakshatra: number 1–27, name, pada 1–4 and progress."""
        moon_lon = self._engine.moon_longitude(jd, sidereal=True, ayanamsa=ayanamsa)
        raw = moon_lon / NAKSHATRA_SPAN
        index = int(raw) % 27
        progress = raw % 1
        return {
            "number": index + 1,
            "name": NAKSHATRA_NAMES[index],
            "pada": min(int(progress * 4) + 1, 4),
            "progress": progress,
        }

    # ── yoga ────────────────────────────────────────────────────────────────

    def yoga(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Number 1–27, name and progress, from the Sun+Moon longitude sum."""
        sun_lon, moon_lon = self._engine.sun_moon_longitudes(
            jd, sidereal=True, ayanamsa=ayanamsa
        )
        raw = ((sun_lon + moon_lon) % 360.0) / YOGA_SPAN
        index = int(raw) % 27
        return {
            "number": index + 1,
            "name": YOGA_NAMES[index],
            "progress": raw % 1,
        }

    # ── karana ──────────────────────────────────────────────────────────────

    def karana(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Number 1–60 and name — 7 repeating movable karanas plus 4 fixed."""
        elongation = self.elongation(jd, ayanamsa=ayanamsa)
        index = int(elongation / KARANA_SPAN)
        if index == 0:
            name = "Kimstughna"
        elif index >= 57:
            name = FIXED_KARANA_TAIL[index - 57]
        else:
            name = KARANA_NAMES[(index - 1) % 7]
        return {
            "number": index + 1,
            "name": name,
            "progress": (elongation % KARANA_SPAN) / KARANA_SPAN,
        }

    # ── vara ────────────────────────────────────────────────────────────────

    def _utc_offset_days(self, jd: float, timezone_name: str) -> float | None:
        """Observer's UTC offset at *jd*, in days. ``None`` for pre-1 CE."""
        from datetime import datetime

        from engine.astronomy.timescale import resolve_observer_timezone

        moment = self._engine.datetime_from_jd(jd)
        if not isinstance(moment, datetime):
            return None
        offset = moment.astimezone(
            resolve_observer_timezone(timezone_name)
        ).utcoffset()
        return None if offset is None else offset.total_seconds() / 86400.0

    def vara(self, jd: float, timezone_name: str = "Asia/Kathmandu") -> dict[str, Any]:
        """Weekday at the observer's local time. Index 0 = Sunday.

        The vara is the one anga that depends on the observer rather than on
        the sky, because it is a civil-calendar quantity.
        """
        from engine.astronomy.ut_instant import local_weekday_py_from_jd

        # The weekday is derived from the JD directly rather than from a
        # datetime round-trip: ``datetime_from_jd`` truncates fractional
        # seconds, which at exactly local midnight rolls the civil date back a
        # day. Only the *offset* is read from the calendar, and that is stable
        # to the second.
        #
        # A CE instant gets the real offset for its own date, so DST and
        # historical zone changes are honoured. Pre-1 CE has no tz-database
        # coverage (and no DST), so it falls back to the fixed-offset path.
        offset_days = self._utc_offset_days(jd, timezone_name)
        if offset_days is None:
            weekday = local_weekday_py_from_jd(jd, timezone_name)
        else:
            # int(jd + 0.5) is the Julian Day Number; its residue mod 7 is
            # already Monday==0. The vara list starts at Sunday.
            weekday = int(jd + offset_days + 0.5) % 7
        index = (weekday + 1) % 7
        return {
            "number": index,
            "name": VAARA_NAMES[index],
            "english": VAARA_ENGLISH[index],
        }

    # ── everything at once ──────────────────────────────────────────────────

    def all_angas(
        self,
        jd: float,
        timezone_name: str = "Asia/Kathmandu",
        *,
        ayanamsa: int | None = None,
    ) -> dict[str, Any]:
        """All five angas at one instant, from one pair of longitudes."""
        return {
            "tithi": self.tithi(jd, ayanamsa=ayanamsa),
            "nakshatra": self.nakshatra(jd, ayanamsa=ayanamsa),
            "yoga": self.yoga(jd, ayanamsa=ayanamsa),
            "karana": self.karana(jd, ayanamsa=ayanamsa),
            "vara": self.vara(jd, timezone_name),
        }


panchanga_service = PanchangaService()
