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
    The **axis** — what a URL, picker or label may name. Sized to the full Swiss
    Ephemeris span (11 Aug 13000 BCE, JD −3026604.5 … 7 Jan 17000 CE), the
    deepest the library can ever go, plus one invalid year each side.

``PATRO_EPHEMERIS_SIGNED_MIN/MAX``
    What **this host** can actually compute, measured against the installed
    ``data/ephemeris/*.se1`` set: the whole years whose every month builds.
    Positions outside it raise, so month/day builds are gated on this, not on
    the axis.

Re-measure the ephemeris pair after adding or removing ``.se1`` files — probe
``swe.calc_ut`` for the full graha set and take the widest whole patro years
inside the working JD window.
"""

from __future__ import annotations

# ── The axis: one year past the computable window on each side ────────────────
# Swiss Ephemeris stops at 11 Aug 13000 BCE (JD −3026604.5) and 7 Jan 17000 CE
# whatever .se1 files are installed; DE431-based files cannot go further.
PATRO_SIGNED_YEAR_MIN = -12942  # one step below the floor (invalid browse)
PATRO_SIGNED_YEAR_MAX = 17053  # one step above the ceiling (invalid browse)

# ── What the ephemeris actually computes ─────────────────────────────────────
# Measured on the production host (29 Oct 2026): the at-time panchanga answers
# from BBS 12942-01-09 (27 Dec 13000 BCE) to BS 17053-03-31 (30 Jan 16997 CE),
# and month calendars for every month of BBS 12941 … BS 17052. Those are the
# whole years offered; the old BBS 13201 … BS 17247 target was never reachable.
PATRO_EPHEMERIS_SIGNED_MIN = -12941  # BBS 12941 ≈ 12998 BCE
PATRO_EPHEMERIS_SIGNED_MAX = 17052  # BS 17052 ≈ AD 16995 CE

# JD window for ``era=ad``/``era=bc`` range checks: the measured first and last
# at-time days, 35 days in.
EPHEMERIS_JD_MIN = -3026431.5
EPHEMERIS_JD_MAX = 7929081.5


def jd_span_within_ephemeris(jd_start: float, jd_end: float) -> bool:
    """True when the installed ``.se1`` files cover this whole civil-day span."""
    return EPHEMERIS_JD_MIN <= float(jd_start) and float(jd_end) <= EPHEMERIS_JD_MAX

# Years with a hand-maintained BS month-length table + festival stack. Outside
# it the grid is derived from sankranti moments instead; both give a full
# panchanga, so this gates festivals only, not tithi/nakshatra.
BS_PANCHANGA_SIGNED_MIN = 60


def validate_patro_signed_year(year: int) -> None:
    if year == 0 or year < PATRO_SIGNED_YEAR_MIN or year > PATRO_SIGNED_YEAR_MAX:
        raise ValueError(
            f"patro year must be {PATRO_SIGNED_YEAR_MIN}..-1 or 1..{PATRO_SIGNED_YEAR_MAX} (0 invalid), got {year}"
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
    return PATRO_EPHEMERIS_SIGNED_MIN <= signed <= PATRO_EPHEMERIS_SIGNED_MAX


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
        BC_YEAR_MAX,
        BC_YEAR_MIN,
    )

    return {
        "signed_year_min": PATRO_SIGNED_YEAR_MIN,
        "signed_year_max": PATRO_SIGNED_YEAR_MAX,
        "ephemeris_signed_min": PATRO_EPHEMERIS_SIGNED_MIN,
        "ephemeris_signed_max": PATRO_EPHEMERIS_SIGNED_MAX,
        "ad_year_min": AD_YEAR_MIN,
        "ad_year_max": AD_YEAR_MAX,
        "bc_year_min": BC_YEAR_MIN,
        "bc_year_max": BC_YEAR_MAX,
        "bbs_url_year_max": -PATRO_EPHEMERIS_SIGNED_MIN,
        "festival_stack_min_year": BS_PANCHANGA_SIGNED_MIN,
    }


def ephemeris_range_message(signed: int) -> str:
    """Operator-facing explanation for a year the installed files can't reach."""
    which = "before" if signed < PATRO_EPHEMERIS_SIGNED_MIN else "after"
    lo, hi = PATRO_EPHEMERIS_SIGNED_MIN, PATRO_EPHEMERIS_SIGNED_MAX
    return (
        f"patro year {signed} is {which} the Swiss Ephemeris files installed on this host "
        f"(computable range {lo}..-1 / 1..{hi}). The axis itself allows "
        f"{PATRO_SIGNED_YEAR_MIN}..{PATRO_SIGNED_YEAR_MAX}; install the remaining "
        f"seplm*/semom*.se1 (deep BCE) or sepl_*/semo_*.se1 (far CE) files to widen it."
    )
