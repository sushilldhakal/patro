"""One version number per *reason a payload can change*, and how they compose.

Every cache in this service stores something derived from the ephemeris. When a
calculation in ``engine/astronomy`` changes a number, every one of those stores
is stale — but until now each cache carried its own unrelated version counter,
so invalidating them meant reasoning, case by case, about which caches a given
fix could possibly reach.

That reasoning is exactly what failed for the A0 rise/set bug (see
docs/computation-architecture-audit.md): the fix landed in
``AstronomyEngine._rise_set_civil`` and no cache version moved, so pre-fix
sunset / moonrise / moonset sat in the caches for pre-1943 and BCE days,
indistinguishable from a live computation.

So there are two axes, and a cache key must depend on both:

``ASTRONOMY_VERSION``
    Bump when ``engine/astronomy`` changes a computed value. Invalidates
    **every** cache, because every cache holds ephemeris-derived data. Bumping
    this is deliberately blunt: it costs one cold rebuild and removes the need
    to work out which stores a given ephemeris fix reaches.

Domain versions (``PANCHANGA_PAYLOAD_VERSION``, ``KUNDALI_REPORT_VERSION``, …)
    Bump when *that* payload's shape or its own domain rules change. Invalidates
    only its own store, so a Kundali yoga-rule fix does not throw away a year of
    panchanga grids.

Integer cache versions compose through :func:`compose`, which stays monotonic in
both axes so the existing ``cached_version < current_version`` staleness checks
keep working. String-valued versions (sait, festivals) fold the astronomy axis in
as a ``+aN`` suffix and are compared for equality.
"""

from __future__ import annotations

# ── astronomy axis ───────────────────────────────────────────────────────────

# 1: everything up to and including the research/era-patro-api branch point.
# 2: A0  — AstronomyEngine._rise_set_civil anchored its Swiss search at 12:00 UT
#          instead of the observer's local midnight, so east of Greenwich it
#          returned the *previous* day's event. Wrong sunset on 67% of days,
#          moonrise on 26%, moonset on 24% (measured at Kathmandu over 2026),
#          on every day routed through the civil path — pre-1943 and BCE.
#    A0b — local_weekday_py_from_jd applied a bogus +6 mod 7 rotation on top of
#          the Julian Day Number's own residue, putting every pre-1 CE vara one
#          day early, along with the muhurta weekday vetoes, Choghadiya and Hora
#          that hang off it.
#          Both are fixed in the engine; this bump is what stops the caches from
#          serving the pre-fix answers.
# 3: the ephemeris path was only ever set on the importing thread (pyswisseph
#    keeps it thread-local), so every request — served from FastAPI's threadpool
#    — silently computed with the built-in Moshier model instead of the Swiss
#    .se1 files. Sub-arcsecond on modern dates, but a different number, and a
#    hard failure outside 3000 BCE … 3000 CE. Fixed in AstronomyEngine; this
#    bump retires every payload computed the old way.
ASTRONOMY_VERSION = 3

# Guards compose()'s decimal packing. Raise the multiplier below before this.
_MAX_ASTRONOMY_VERSION = 99


def compose(domain_version: int, astronomy_version: int = ASTRONOMY_VERSION) -> int:
    """Fold the two axes into one monotonically increasing integer.

    Monotonic in both arguments, so a cache row written under any earlier
    combination compares ``<`` the current one and is treated as stale — which
    is what the existing checks already do, unchanged.

    >>> compose(36, 2)
    3602
    >>> compose(36, 2) > compose(36, 1) > compose(35, 2)
    True
    """
    if not 0 <= astronomy_version <= _MAX_ASTRONOMY_VERSION:
        raise ValueError(
            f"astronomy_version must be 0..{_MAX_ASTRONOMY_VERSION}, "
            f"got {astronomy_version}"
        )
    return domain_version * (_MAX_ASTRONOMY_VERSION + 1) + astronomy_version


def stamp(version: str, astronomy_version: int = ASTRONOMY_VERSION) -> str:
    """Fold the astronomy axis into a string version — ``"4.10.0"`` → ``"4.10.0+a2"``.

    For the stores that compare versions by equality rather than by ordering.
    """
    return f"{version}+a{astronomy_version}"
