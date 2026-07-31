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
    Ephemeris span (11 Aug 13000 BCE, JD −3026604.5 … 7 Jan 17000 CE), i.e. the
    deepest the library can ever go once every ``.se1`` file is installed.

``PATRO_EPHEMERIS_SIGNED_MIN/MAX``
    What **this host** can actually compute, measured against the installed
    ``data/ephemeris/*.se1`` set (currently ``seplm/semom`` out to ``…72``, plus
    ``sepl_/semo_`` to ``…24``). Positions outside it raise, so month/day builds
    are gated on this, not on the axis.

Re-measure the ephemeris pair after adding or removing ``.se1`` files — probe
``swe.calc_ut`` for the full graha set and take the widest whole patro years
inside the working JD window.
"""

from __future__ import annotations

# ── The axis: full Swiss Ephemeris span ───────────────────────────────────────
# JD −3026604.5 = 11 Aug 13000 BCE (civil −12999); the first *whole* patro year
# inside that is BBS 12942. JD 7930188.5 = 7 Jan 17000 CE; last whole year BS 17055.
PATRO_SIGNED_YEAR_MIN = -12942  # BBS 12942 ≈ 12999 BCE
PATRO_SIGNED_YEAR_MAX = 17055  # BS 17055 ≈ 16998 CE

# ── What the installed .se1 files actually cover ──────────────────────────────
# Measured two ways, because raw positions reach further than a whole patro year
# does: ``swe.calc_ut`` resolves the full graha set over JD ≈ −908744 (3 Nov 7202
# BCE) … 2818000.5 (28 Apr 3003 CE), but a *year* also needs the lunar-month and
# festival searches that run ~35 days past its edges. These two are the widest
# years whose month 1 and month 12 both actually build end to end; BS 3058 fails
# in the festival stack at JD 2818000.86, just past the upper limit.
PATRO_EPHEMERIS_SIGNED_MIN = -7144  # BBS 7144 ≈ 7200 BCE
PATRO_EPHEMERIS_SIGNED_MAX = 3057  # BS 3057 ≈ 3000 CE

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


def patro_year_supports_full_panchanga(signed: int) -> bool:
    """Full tithi/nakshatra grid — same requirement as the month boundaries.

    Both ends matter: the axis reaches BS 17055 but positions stop resolving
    after BS 3059, and an unguarded year there raises out of Swiss Ephemeris
    rather than degrading.
    """
    return patro_year_within_ephemeris(signed)


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
