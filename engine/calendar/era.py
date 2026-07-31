"""The one place a calendar era becomes a Julian Day, and a Julian Day a label.

Four eras, all with **positive** years:

===== ============================== ==================================
era    meaning                        anchor
===== ============================== ==================================
``ad``  Gregorian CE                   AD 1 = astronomical year 1
``bc``  Gregorian BCE                  BC 1 = astronomical year 0,
                                       BC ``N`` = astronomical ``1 - N``
``bs``  Vikram Samvat                  BS 1 = 57 BCE (signed axis ``+N``)
``bbs`` Before Bikram Sambat           BBS 1 = 58 BCE (signed axis ``-N``)
===== ============================== ==================================

``bc`` and ``bbs`` are two different numberings of the same stretch of time and
must not be conflated: BC 4 is astronomical −3, while BBS 4 is 61 BCE. There is
no year zero on the BS/BBS axis — BS 1 and BBS 1 are consecutive.

**Nothing else in the codebase should convert between a calendar label and a
Julian Day.** Request handling converts once on the way in (:func:`to_jd`,
:func:`year_span_jd`), the engine works only in JD, and the response layer
converts once on the way out (:func:`from_jd`, :func:`render_jd`). The year-axis
bounds themselves live in :mod:`engine.vedic.patro_year_axis`; this module is the
codec on top of them, not a second copy of the rules.
"""

from __future__ import annotations

from typing import Literal, NamedTuple, get_args

from engine.astronomy.jd_calendar import (
    CivilDay,
    civil_day_add,
    civil_day_jd_ut,
    civil_parts_from_jd_ut,
    format_civil_iso,
)

EraCode = Literal["ad", "bc", "bs", "bbs"]

ERA_CODES: tuple[str, ...] = get_args(EraCode)

# Localisation follows the era, per product rule: the Vikram eras render Nepali,
# the Gregorian ones English. This is labels and numerals only — never arithmetic.
_ERA_LANGUAGE: dict[str, str] = {"bs": "ne", "bbs": "ne", "ad": "en", "bc": "en"}


class EraLabels(NamedTuple):
    """Every representation of one civil day, produced from its Julian Day."""

    jd_ut: float
    #: Astronomical (proleptic Gregorian) parts — negative year means BCE.
    civil: CivilDay
    #: Gregorian label: ``("ad", 2026)`` or ``("bc", 4)``.
    gregorian_era: str
    gregorian_year: int
    #: Vikram label: ``("bs", 2083)`` or ``("bbs", 4)``.
    vikram_era: str
    vikram_year: int
    vikram_month: int
    vikram_day: int

    def as_dict(self) -> dict[str, object]:
        return {
            "jd_ut": self.jd_ut,
            "civil_iso": format_civil_iso(
                self.civil.year, self.civil.month, self.civil.day
            ),
            self.gregorian_era: self._gregorian_label(),
            self.vikram_era: self._vikram_label(),
        }

    def _gregorian_label(self) -> str:
        if self.gregorian_era == "bc":
            return f"{self.gregorian_year} BC"
        return f"{self.gregorian_year:04d}-{self.civil.month:02d}-{self.civil.day:02d}"

    def _vikram_label(self) -> str:
        return f"{self.vikram_year}-{self.vikram_month:02d}-{self.vikram_day:02d}"

    def label_for(self, era: str) -> str:
        """The label a caller asked for, whichever side of the epoch it lands on."""
        if era in ("ad", "bc"):
            return self._gregorian_label()
        return self._vikram_label()


def era_language(era: str) -> str:
    """``ne`` for the Vikram eras, ``en`` for the Gregorian ones."""
    return _ERA_LANGUAGE.get(_normalise(era), "en")


def _normalise(era: str) -> str:
    text = (era or "").strip().lower()
    if text not in ERA_CODES:
        raise ValueError(f"era must be one of {', '.join(ERA_CODES)}; got {era!r}")
    return text


def _astronomical_year(era: str, year: int) -> int:
    """Gregorian eras → astronomical year. ``bc`` has no year zero, ``ad`` starts at 1."""
    if era == "ad":
        if year < 1:
            raise ValueError(f"ad year must be >= 1 (use era=bc for BCE); got {year}")
        return year
    if year < 1:
        raise ValueError(f"bc year must be >= 1; got {year}")
    return 1 - year


def _signed_patro_year(era: str, year: int) -> int:
    """Vikram eras → the signed axis in :mod:`engine.vedic.patro_year_axis`."""
    from engine.vedic.patro_year_axis import validate_patro_signed_year

    if year < 1:
        raise ValueError(
            f"{era} year must be >= 1 — the eras carry the sign, not the number; got {year}"
        )
    signed = year if era == "bs" else -year
    try:
        validate_patro_signed_year(signed)
    except ValueError as exc:
        # The axis validator speaks in signed years because that is the engine's
        # internal representation. Re-frame it before it reaches a caller: an
        # error is part of the public surface, and no signed year belongs there.
        from engine.vedic.patro_year_axis import (
            PATRO_SIGNED_YEAR_MAX,
            PATRO_SIGNED_YEAR_MIN,
        )

        limit = -PATRO_SIGNED_YEAR_MIN if era == "bbs" else PATRO_SIGNED_YEAR_MAX
        raise ValueError(
            f"{era} year must be 1..{limit}; got {year}"
        ) from exc
    return signed


def to_jd(era: str, year: int, month: int | None = None, day: int | None = None) -> float:
    """Any era's (year, month, day) → Julian Day at 0h UT of that civil day.

    ``month``/``day`` default to the first of the year in that era's own calendar,
    so a year-scoped request needs only ``era`` and ``year``.
    """
    code = _normalise(era)
    m = 1 if month is None else int(month)
    d = 1 if day is None else int(day)
    if not 1 <= m <= 12:
        raise ValueError(f"month must be 1..12; got {month}")
    if d < 1:
        raise ValueError(f"day must be >= 1; got {day}")

    if code in ("ad", "bc"):
        return civil_day_jd_ut(_astronomical_year(code, int(year)), m, d)

    from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start_civil

    signed = _signed_patro_year(code, int(year))
    length = get_bs_month_length(signed, m)
    if d > length:
        raise ValueError(f"day must be 1..{length} for {code} {year}/{m}; got {day}")
    start = get_bs_month_start_civil(signed, m)
    return civil_day_add(start.to_jd_ut(), d - 1)


def year_span_jd(era: str, year: int) -> tuple[float, float]:
    """Inclusive ``(first_day_jd, last_day_jd)`` of a year in the requested era."""
    code = _normalise(era)
    if code in ("ad", "bc"):
        astro = _astronomical_year(code, int(year))
        return civil_day_jd_ut(astro, 1, 1), civil_day_jd_ut(astro, 12, 31)

    from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start_civil

    signed = _signed_patro_year(code, int(year))
    start = get_bs_month_start_civil(signed, 1).to_jd_ut()
    last_month = get_bs_month_start_civil(signed, 12).to_jd_ut()
    end = civil_day_add(last_month, get_bs_month_length(signed, 12) - 1)
    return start, end


def from_jd(jd_ut: float) -> EraLabels:
    """Julian Day → every era label for that civil day."""
    from engine.vedic.bikram_sambat import locate_patro_day_for_civil

    year, month, day = civil_parts_from_jd_ut(float(jd_ut))
    civil = CivilDay(year, month, day)
    if year >= 1:
        greg_era, greg_year = "ad", year
    else:
        greg_era, greg_year = "bc", 1 - year

    signed, v_month, v_day = locate_patro_day_for_civil(civil)
    vik_era = "bs" if signed >= 1 else "bbs"
    vik_year = signed if signed >= 1 else -signed

    return EraLabels(
        jd_ut=civil.to_jd_ut(),
        civil=civil,
        gregorian_era=greg_era,
        gregorian_year=greg_year,
        vikram_era=vik_era,
        vikram_year=vik_year,
        vikram_month=v_month,
        vikram_day=v_day,
    )


def render_jd(jd_ut: float, era: str) -> str:
    """Julian Day → the single label string for the era the caller requested."""
    return from_jd(jd_ut).label_for(_normalise(era))
