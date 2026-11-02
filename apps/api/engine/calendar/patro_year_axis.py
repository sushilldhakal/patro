"""Signed patro year axis: negative = BBS (before Bikram Sambat 1), positive = BS.

Convention (matches UI / URL ``year`` when ``era=bs``):

- ``year == 0`` — invalid. **There is no year zero on this axis**, so BS 1 and
  BBS 1 are consecutive years and every offset must account for that; see
  ``_gregorian_year_for_bs_month``.
- ``year >= 1`` — Vikram Samvat BS ``year``; **BS 1 = 57 BCE**.
- ``year <= -1`` — **BBS** ``|year|``; **BBS 1 = 58 BCE**, BBS 2 = 59 BCE, …

Two different limits live here, and conflating them is what made the earlier
numbers wrong:

``PATRO_SIGNED_YEAR_MIN/MAX``
    The **axis** — what a URL, picker or label may name: the computable years
    plus one invalid year each side.

``PATRO_EPHEMERIS_SIGNED_MIN/MAX``
    What the **request's siddhanta** can compute: the whole years whose every
    month builds. For drik that is the installed Swiss Ephemeris set, measured
    (BBS 12941 … BS 17052); for the Surya Siddhanta, back to सत्य युग. Positions
    outside it raise, so month/day builds are gated on this, not on the axis.

Both are read live from the siddhanta's ``ComputableRange`` (see
``engine.astronomy.siddhanta``); this module only turns days into patro years.
"""

from __future__ import annotations

# ── The axis, from the request's siddhanta ────────────────────────────────────
# Which days can be computed is the siddhanta's to say (its ComputableRange: drik's
# measured Swiss Ephemeris window, 12998 BCE … 16995 CE; the Surya Siddhanta's
# back to the start of सत्य युग). The calendar only turns that into patro years:
# Vikram years run 57 ahead of the proleptic year (BBS = BCE − 57, BS = CE + 57),
# and the browse axis reaches one step past the computable years on each side.
VIKRAM_OFFSET = 57


def _range():
    from engine.astronomy.siddhanta import current_siddhanta

    return current_siddhanta().computable_range()


def ephemeris_signed_min() -> int:
    """First whole patro year (signed: BBS negative) every month of which builds."""
    return -(_range().deepest_bce_year - VIKRAM_OFFSET)


def ephemeris_signed_max() -> int:
    return _range().last_ce_year + VIKRAM_OFFSET


def signed_year_min() -> int:
    """Axis floor: one step below the computable floor (an invalid browse)."""
    return ephemeris_signed_min() - 1


def signed_year_max() -> int:
    return ephemeris_signed_max() + 1


def ephemeris_jd_min() -> float:
    return _range().jd_min


def ephemeris_jd_max() -> float:
    return _range().jd_max


def bc_year_max() -> int:
    return _range().deepest_bce_year


_DYNAMIC = {
    "PATRO_SIGNED_YEAR_MIN": signed_year_min,
    "PATRO_SIGNED_YEAR_MAX": signed_year_max,
    "PATRO_EPHEMERIS_SIGNED_MIN": ephemeris_signed_min,
    "PATRO_EPHEMERIS_SIGNED_MAX": ephemeris_signed_max,
    "EPHEMERIS_JD_MIN": ephemeris_jd_min,
    "EPHEMERIS_JD_MAX": ephemeris_jd_max,
}


def __getattr__(name: str):
    """The old constant names, read live: each siddhanta has its own range."""
    if name in _DYNAMIC:
        return _DYNAMIC[name]()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def jd_span_within_ephemeris(jd_start: float, jd_end: float) -> bool:
    """True when the request's siddhanta can compute this whole civil-day span."""
    return ephemeris_jd_min() <= float(jd_start) and float(jd_end) <= ephemeris_jd_max()


# Years with a hand-maintained BS month-length table + festival stack. Outside
# it the grid is derived from sankranti moments instead; both give a full
# panchanga, so this gates festivals only, not tithi/nakshatra.
BS_PANCHANGA_SIGNED_MIN = 60


def validate_patro_signed_year(year: int) -> None:
    if year == 0 or year < signed_year_min() or year > signed_year_max():
        raise ValueError(
            f"patro year must be {signed_year_min()}..-1 or 1..{signed_year_max()} (0 invalid), got {year}"
        )


def is_bbs_signed(signed: int) -> bool:
    return signed <= -1


def is_bs_signed(signed: int) -> bool:
    return signed >= 1


def bbs_number(signed: int) -> int:
    """BBS label for a negative signed year (e.g. −6722 → 6722)."""
    if signed >= 0:
        raise ValueError("bbs_number expects signed year <= -1")
    return -signed


def signed_from_bbs(bbs: int) -> int:
    if bbs < 1:
        raise ValueError("bbs must be >= 1")
    return -bbs


def patro_year_within_ephemeris(signed: int) -> bool:
    """True when this host's ``.se1`` set covers the whole patro year."""
    validate_patro_signed_year(signed)
    return ephemeris_signed_min() <= signed <= ephemeris_signed_max()


def patro_year_supports_sankranti_grid(signed: int) -> bool:
    """Month boundaries need sankranti moments, so they need the ephemeris."""
    return patro_year_within_ephemeris(signed)


def patro_year_supports_gregorian_festival_rules(signed: int) -> bool:
    """True when the BS year's civil span fits ``datetime.date`` (festival rules)."""
    if signed < BS_PANCHANGA_SIGNED_MIN:
        return False
    from engine.astronomy.jd_calendar import CivilDay, date_if_supported
    from engine.calendar.bikram_sambat import get_bs_month_length, get_bs_month_start_civil

    start = get_bs_month_start_civil(signed, 1)
    total = sum(get_bs_month_length(signed, m) for m in range(1, 13))
    end = CivilDay.from_jd_ut(start.to_jd_ut() + total - 1)
    return (
        date_if_supported(start.year, start.month, start.day) is not None
        and date_if_supported(end.year, end.month, end.day) is not None
    )


def patro_year_supports_full_panchanga(signed: int) -> bool:
    """Full tithi/nakshatra grid — same requirement as the month boundaries.

    Both ends matter: the axis reaches BS 17055 but positions stop resolving
    after BS 3059, and an unguarded year there raises out of Swiss Ephemeris
    rather than degrading.
    """
    return patro_year_within_ephemeris(signed)


def browse_limits() -> dict[str, int]:
    """Ephemeris / picker bounds — the API's single copy of what the UI may offer.

    Clients fetch this (``GET /meta/capabilities`` or the ``limits`` block on
    month calendars) instead of mirroring these constants.
    """
    from engine.calendar.constants import (
        AD_YEAR_MAX,
        AD_YEAR_MIN,
        BC_YEAR_MIN,
    )

    return {
        "signed_year_min": signed_year_min(),
        "signed_year_max": signed_year_max(),
        "ephemeris_signed_min": ephemeris_signed_min(),
        "ephemeris_signed_max": ephemeris_signed_max(),
        "ad_year_min": AD_YEAR_MIN,
        "ad_year_max": AD_YEAR_MAX,
        "bc_year_min": BC_YEAR_MIN,
        "bc_year_max": bc_year_max(),
        "bbs_url_year_max": -ephemeris_signed_min(),
        "festival_stack_min_year": BS_PANCHANGA_SIGNED_MIN,
    }


def ephemeris_range_message(signed: int) -> str:
    """Operator-facing explanation for a year the installed files can't reach."""
    which = "before" if signed < ephemeris_signed_min() else "after"
    lo, hi = ephemeris_signed_min(), ephemeris_signed_max()
    return (
        f"patro year {signed} is {which} the Swiss Ephemeris files installed on this host "
        f"(computable range {lo}..-1 / 1..{hi}). The axis itself allows "
        f"{signed_year_min()}..{signed_year_max()}; install the remaining "
        f"seplm*/semom*.se1 (deep BCE) or sepl_*/semo_*.se1 (far CE) files to widen it."
    )
