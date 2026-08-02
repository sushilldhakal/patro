"""Independent reference solvers for the mathematically-defined instants.

Swiss Ephemeris is this engine's astronomical authority (see
docs/timescale-contract.md). So "the instant when tropical solar longitude
reaches 0°" is a **definition**, not an opinion, and a golden value for it can be
derived rather than looked up in a printed calendar.

For that to be a real test rather than a tautology, this module must be
**independent of the production code path**:

* it calls ``swe.calc_ut`` directly — never ``AstronomyEngine``, never
  ``sankranti.py``, never ``tropical_seasons.py``;
* it uses plain bisection, chosen because it is obviously correct rather than
  fast, where production uses Brent's method with its own bracketing;
* it re-derives ayanamsha via ``swe.get_ayanamsa_ut`` rather than reusing the
  engine's sidereal handling.

What that buys: these solvers catch bracketing errors, convergence failures,
rashi off-by-ones and sign errors in the production solvers. What it cannot
catch, by construction, is Swiss Ephemeris itself being wrong — which is out of
scope, because principle 1 makes it the authority.

Bisection is safe here because every quantity solved is monotonic across the
bracket used: the Sun's longitude increases monotonically over a month, and the
Moon–Sun elongation increases monotonically over a tithi.
"""

from __future__ import annotations

import swisseph as swe

from engine.astronomy.paths import ephemeris_path

#: One second, in days. Every solver below converges to this.
ONE_SECOND = 1.0 / 86400.0

_configured = False


def _ensure_ephemeris() -> None:
    """Point swisseph at the bundled files (thread-local — see engine.py)."""
    global _configured
    swe.set_ephe_path(str(ephemeris_path()))
    _configured = True


def tropical_sun_longitude(jd_ut: float) -> float:
    """Apparent geocentric TROPICAL solar longitude, degrees [0, 360)."""
    _ensure_ephemeris()
    return swe.calc_ut(jd_ut, swe.SUN, swe.FLG_SWIEPH)[0][0] % 360.0


def ayanamsha(jd_ut: float, sid_mode: int = swe.SIDM_LAHIRI) -> float:
    """Ayanamsha in degrees, via ``get_ayanamsa_ex_ut``.

    **Not** ``get_ayanamsa_ut``. The two disagree — by 5.9″ at 2026, 13.9″ at
    J2000, 17.7″ at 1 CE — and only ``get_ayanamsa_ex_ut`` reproduces what
    ``FLG_SIDEREAL`` actually applies (verified: 0.000″ difference). The plain
    ``_ut`` variant does not take ephemeris flags and follows a different
    internal path.

    This was found by this suite: the first sankranti comparison failed with a
    systematic ~150 s offset, which is 5.9″ of solar motion. The reference solver
    was wrong and production was right.

    See docs/ayanamsha-variants.md.
    """
    _ensure_ephemeris()
    swe.set_sid_mode(sid_mode)
    return swe.get_ayanamsa_ex_ut(jd_ut, swe.FLG_SWIEPH)[1]


def sidereal_sun_longitude(jd_ut: float, sid_mode: int = swe.SIDM_LAHIRI) -> float:
    """Apparent geocentric SIDEREAL solar longitude, degrees [0, 360).

    Derived as tropical − ayanamsha rather than by passing ``FLG_SIDEREAL``, so
    the ayanamsha enters explicitly and visibly. That keeps this independent of
    the production path (which uses the flag) while still agreeing with it — the
    two are different swisseph entry points that must produce the same number.
    """
    return (tropical_sun_longitude(jd_ut) - ayanamsha(jd_ut, sid_mode)) % 360.0


def moon_longitude(jd_ut: float) -> float:
    _ensure_ephemeris()
    return swe.calc_ut(jd_ut, swe.MOON, swe.FLG_SWIEPH)[0][0] % 360.0


def elongation(jd_ut: float) -> float:
    """Moon − Sun, degrees [0, 360). Tithi = floor(elongation / 12) + 1."""
    return (moon_longitude(jd_ut) - tropical_sun_longitude(jd_ut)) % 360.0


def _signed_offset(value: float, target: float) -> float:
    """``value − target`` wrapped to (−180, +180], so bisection sees a sign change."""
    return ((value - target + 180.0) % 360.0) - 180.0


def solve_crossing(
    fn,
    target_deg: float,
    low_jd: float,
    high_jd: float,
    tolerance_days: float = ONE_SECOND,
    max_iterations: int = 200,
) -> float:
    """Bisect for the instant where ``fn(jd)`` crosses ``target_deg``.

    ``low_jd``/``high_jd`` must bracket exactly one crossing, with the offset
    changing sign across them. Raises if they do not — a silent wrong answer
    from a bad bracket is the failure mode this guards.
    """
    lo_off = _signed_offset(fn(low_jd), target_deg)
    hi_off = _signed_offset(fn(high_jd), target_deg)
    if lo_off == 0.0:
        return low_jd
    if hi_off == 0.0:
        return high_jd
    if (lo_off > 0) == (hi_off > 0):
        raise ValueError(
            f"bracket [{low_jd}, {high_jd}] does not straddle {target_deg}°: "
            f"offsets {lo_off:+.6f}° and {hi_off:+.6f}° have the same sign"
        )

    for _ in range(max_iterations):
        if high_jd - low_jd < tolerance_days:
            break
        mid_jd = (low_jd + high_jd) / 2.0
        mid_off = _signed_offset(fn(mid_jd), target_deg)
        if (mid_off > 0) == (lo_off > 0):
            low_jd, lo_off = mid_jd, mid_off
        else:
            high_jd, hi_off = mid_jd, mid_off
    return (low_jd + high_jd) / 2.0


# ── the four definitions ─────────────────────────────────────────────────────


def equinox_solstice_jd(year: int, event: str) -> float:
    """Instant when the TROPICAL solar longitude reaches 0 / 90 / 180 / 270°.

    Definition only — no seasonal or cultural content.
    """
    targets = {
        "march_equinox": 0.0,
        "june_solstice": 90.0,
        "september_equinox": 180.0,
        "december_solstice": 270.0,
    }
    if event not in targets:
        raise ValueError(f"unknown event {event!r}")
    target = targets[event]

    # Bracket: the Sun covers ~30° a month, so a 40-day window centred on the
    # nominal date always contains the crossing and never a second one.
    nominal_month = {"march_equinox": 3, "june_solstice": 6,
                     "september_equinox": 9, "december_solstice": 12}[event]
    centre = swe.julday(year, nominal_month, 21, 0.0, swe.GREG_CAL)
    return solve_crossing(tropical_sun_longitude, target, centre - 20, centre + 20)


def sankranti_jd(year: int, rashi: int, sid_mode: int = swe.SIDM_LAHIRI) -> float:
    """Instant when the SIDEREAL solar longitude reaches ``(rashi - 1) * 30°``.

    ``rashi`` is 1-based: 1 = Mesh (0°), 2 = Vrisha (30°), … 12 = Meen (330°).
    """
    if not 1 <= rashi <= 12:
        raise ValueError(f"rashi must be 1..12, got {rashi}")
    target = (rashi - 1) * 30.0

    def fn(jd: float) -> float:
        return sidereal_sun_longitude(jd, sid_mode)

    # Scan month by month for the sign change rather than assuming a date: the
    # sidereal ingress drifts against the Gregorian calendar over centuries.
    start = swe.julday(year, 1, 1, 0.0, swe.GREG_CAL)
    step = 5.0
    prev_jd = start
    prev_off = _signed_offset(fn(prev_jd), target)
    for _ in range(int(400 / step)):
        cur_jd = prev_jd + step
        cur_off = _signed_offset(fn(cur_jd), target)
        if (prev_off > 0) != (cur_off > 0) and abs(cur_off - prev_off) < 180:
            return solve_crossing(fn, target, prev_jd, cur_jd)
        prev_jd, prev_off = cur_jd, cur_off
    raise ValueError(f"no sankranti for rashi {rashi} found in {year}")


def tithi_boundary_jd(after_jd: float, tolerance_days: float = ONE_SECOND) -> float:
    """Instant when the elongation next reaches a multiple of 12°.

    This is the **astronomical** tithi boundary. It carries no calendar
    assignment — which civil day a tithi is credited to is a separate, cultural
    rule (udaya), and mixing the two is the layering error this suite exists to
    prevent.
    """
    current = elongation(after_jd)
    target = ((int(current // 12.0) + 1) * 12.0) % 360.0

    def fn(jd: float) -> float:
        return elongation(jd)

    # Elongation advances ~12.2°/day, so a tithi lasts ~0.98 days; 2 days always
    # brackets the next boundary.
    return solve_crossing(fn, target, after_jd, after_jd + 2.0, tolerance_days)


def tithi_number(jd_ut: float) -> int:
    """1..30 from the elongation. The definition, stated once."""
    return int(elongation(jd_ut) // 12.0) + 1


def eclipse_jd(after_jd: float, kind: str) -> tuple[float, int]:
    """Next solar or lunar eclipse maximum at or after *after_jd*.

    ``swe.sol_eclipse_when_glob`` / ``lun_eclipse_when`` are called **directly**
    here rather than through ``AstronomyEngine``, so this is an independent path
    to the same fact. Returns ``(jd_of_maximum, retflag)``.

    An eclipse is not a root-finding problem the way an ingress is — it is a
    geometric coincidence swisseph searches for — so the "definition" here is
    swisseph's own eclipse search, and the value of the golden entry is
    regression against ephemeris change rather than adjudication between solvers.
    """
    _ensure_ephemeris()
    if kind == "solar":
        retflag, tret = swe.sol_eclipse_when_glob(after_jd, swe.FLG_SWIEPH, 0, False)
    elif kind == "lunar":
        retflag, tret = swe.lun_eclipse_when(after_jd, swe.FLG_SWIEPH, 0, False)
    else:
        raise ValueError(f"kind must be 'solar' or 'lunar', got {kind!r}")
    return float(tret[0]), int(retflag)


def eclipse_kind_label(retflag: int, kind: str) -> str:
    """Coarse eclipse type from a swisseph retflag."""
    if retflag & swe.ECL_TOTAL:
        return "total"
    if kind == "solar":
        if retflag & swe.ECL_ANNULAR_TOTAL:
            return "hybrid"
        if retflag & swe.ECL_ANNULAR:
            return "annular"
        return "partial"
    if retflag & swe.ECL_PARTIAL:
        return "partial"
    return "penumbral"
