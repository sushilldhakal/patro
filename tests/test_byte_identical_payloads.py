"""Byte-identical regression proof for the daily panchanga builders.

This is the harness that carried Phase 1: it captures the full daily-panchanga
payload for five scenarios spanning every era path the engine has, and fails if a
single byte moves. It exists so that a refactor claiming "no behaviour change"
can be *verified* rather than argued.

It found nothing in Phase 1 — which is the point. Four live bugs in the prior
migration (see docs/computation-architecture-audit.md, A0–A0d) were all found by
migration scaffolding rather than by the 458-test suite, because the suite had
been captured from the code that had the bugs. A fixture pinned to an explicit
before-state cannot do that.

Scenarios — chosen so every distinct code path through the day builders is
covered, not for variety:

===================  ==================================================
modern_ktm           ``datetime.date`` path, default observer
modern_jhapa         same day, *different observer* — the raw lat/lon
                     ``cache_key()`` path rather than the ``city:`` snap
pre_1943             Nepal's IST era (+05:30, not today's +05:45) — the
                     historical-timezone path, and the era A0 lived in
julian_1500          pre-Gregorian-cutover Julian label; ``CivilDay``
                     only, no ``datetime.date`` can hold it
bce_57               signed astronomical year; ``UtInstant`` throughout
===================  ==================================================

Regenerating
------------
Only when a payload change is *intended*. Run::

    REGENERATE_BYTE_IDENTICAL=1 pytest tests/test_byte_identical_payloads.py

then read the git diff on ``tests/data/byte_identical/`` before committing it.
That diff is the change under review — if it is larger than expected, the change
was larger than intended.
"""

from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path
from typing import Any, Callable

import pytest

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.daily import build_daily_panchanga, build_daily_panchanga_at_jd

FIXTURE_DIR = Path(__file__).parent / "data" / "byte_identical"

# A second observer, far enough from Kathmandu to miss the 0.02-degree cache
# snap, so the raw-coordinate path is exercised alongside the city path.
JHAPA = ObserverLocation(
    lat=26.5833, lon=88.0667, timezone="Asia/Kathmandu", name="Jhapa"
)

# patro_bs labels for the two pre-Gregorian scenarios: the astronomy is era-free
# but the *labelling* is a caller choice (see build_daily_panchanga_at_jd), and
# pinning it keeps these payloads stable and comparable.
SCENARIOS: dict[str, Callable[[], dict[str, Any]]] = {
    "modern_ktm": lambda: build_daily_panchanga(date(2026, 6, 10), DEFAULT_LOCATION),
    "modern_jhapa": lambda: build_daily_panchanga(date(2026, 6, 10), JHAPA),
    "pre_1943": lambda: build_daily_panchanga(date(1930, 3, 15), DEFAULT_LOCATION),
    "julian_1500": lambda: build_daily_panchanga_at_jd(
        CivilDay(1500, 6, 10).to_jd_ut(), DEFAULT_LOCATION, patro_bs=(1557, 2, 28)
    ),
    "bce_57": lambda: build_daily_panchanga_at_jd(
        CivilDay(-56, 3, 16).to_jd_ut(), DEFAULT_LOCATION, patro_bs=(-113, 12, 3)
    ),
    # ── cultural surface ────────────────────────────────────────────────────
    #
    # The five scenarios above call the builder with its default
    # ``include_festivals=False``, so none of them carried a ``festivals`` key
    # and the entire festival/rule surface — ~2,700 lines across rules/engine.py,
    # sait_rules, lunar_month, sankranti and holiday_generator — had no
    # regression cover at all.
    #
    # That matters most for a *cultural rule extraction*, which is by definition
    # a refactor that must not change which festivals land on which day. These
    # days are chosen to exercise the distinct rule kinds rather than to be
    # representative: lunar-month resolution, solar sankranti anchoring, the
    # Newari calendar, and a deliberately empty day so a rule that starts
    # over-matching is caught too.
    "festival_dashain": lambda: build_daily_panchanga(
        date(2026, 10, 20), DEFAULT_LOCATION, include_festivals=True
    ),
    "festival_new_year": lambda: build_daily_panchanga(
        date(2026, 4, 14), DEFAULT_LOCATION, include_festivals=True
    ),
    "festival_tihar": lambda: build_daily_panchanga(
        date(2026, 11, 8), DEFAULT_LOCATION, include_festivals=True
    ),
    "festival_quiet_day": lambda: build_daily_panchanga(
        date(2026, 6, 10), DEFAULT_LOCATION, include_festivals=True
    ),
}


def serialize(payload: dict[str, Any]) -> str:
    """The canonical on-disk form: sorted keys, 2-space indent, trailing newline.

    Deliberately **strict** JSON — no ``default=`` fallback. Every builder output
    is JSON-native today (verified across all five scenarios), so a type that is
    not should fail loudly here rather than be quietly stringified into a fixture
    that then looks stable.
    """
    return json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def fixture_path(name: str) -> Path:
    return FIXTURE_DIR / f"{name}.json"


def _regenerating() -> bool:
    return os.environ.get("REGENERATE_BYTE_IDENTICAL", "").lower() in {"1", "true", "yes"}


def _first_difference(expected: str, actual: str) -> str:
    """Line-level report of the first divergence, for a readable failure."""
    exp_lines = expected.splitlines()
    act_lines = actual.splitlines()
    for i, (e, a) in enumerate(zip(exp_lines, act_lines), start=1):
        if e != a:
            start = max(0, i - 4)
            context = "\n".join(f"    {n + 1:5d} | {line}" for n, line in enumerate(exp_lines[start : i - 1], start))
            return (
                f"first difference at line {i}\n"
                f"{context}\n"
                f"    {i:5d} | - {e.strip()}\n"
                f"    {i:5d} | + {a.strip()}"
            )
    if len(exp_lines) != len(act_lines):
        return f"payload length changed: {len(exp_lines)} -> {len(act_lines)} lines"
    return "byte difference with no line difference (trailing whitespace?)"


@pytest.mark.parametrize("name", sorted(SCENARIOS))
def test_payload_is_byte_identical(name: str) -> None:
    """The built payload must match its fixture exactly.

    A failure here is not automatically a bug — it means a computed value moved.
    Either that was intended (regenerate, and review the diff as the change) or it
    was not (a refactor changed a number it should not have).
    """
    actual = serialize(SCENARIOS[name]())
    path = fixture_path(name)

    if _regenerating():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(actual, encoding="utf-8")
        pytest.skip(f"regenerated {path.name}")

    assert path.is_file(), (
        f"missing fixture {path}. Generate it with "
        f"REGENERATE_BYTE_IDENTICAL=1 pytest {Path(__file__).name}"
    )
    expected = path.read_text(encoding="utf-8")
    assert actual == expected, (
        f"{name}: daily panchanga payload changed.\n"
        f"{_first_difference(expected, actual)}\n\n"
        f"If this change is intended, regenerate with "
        f"REGENERATE_BYTE_IDENTICAL=1 pytest {Path(__file__).name} "
        f"and review the fixture diff as part of the change."
    )


def test_every_era_path_is_covered() -> None:
    """Guard the *reason* the scenarios exist.

    Deleting a scenario would silently shrink the proof, and the remaining tests
    would still pass. This pins the coverage claim itself.
    """
    assert set(SCENARIOS) == {
        "modern_ktm",
        "modern_jhapa",
        "pre_1943",
        "julian_1500",
        "bce_57",
        "festival_dashain",
        "festival_new_year",
        "festival_tihar",
        "festival_quiet_day",
    }

    # Two distinct observers, so a location-dependent change cannot hide.
    assert JHAPA.lat != DEFAULT_LOCATION.lat and JHAPA.lon != DEFAULT_LOCATION.lon

    # pre_1943 must land in Nepal's IST era (+05:30), not today's +05:45 —
    # otherwise the historical-timezone path is not actually exercised.
    payload = json.loads(fixture_path("pre_1943").read_text(encoding="utf-8"))
    assert payload["sunrise"]["local"].endswith("+05:30")

    # julian_1500 and bce_57 must be on the CivilDay path: datetime.date cannot
    # represent either, which is exactly what makes them worth pinning.
    from engine.astronomy.jd_calendar import date_if_supported

    assert date_if_supported(1500, 6, 10) is None
    assert date_if_supported(-56, 3, 16) is None


def test_fixtures_are_strict_json_and_canonical() -> None:
    """Fixtures must round-trip through the canonical serializer unchanged.

    Stops a hand-edited fixture from drifting out of canonical form, which would
    make a later regeneration produce a spurious whitespace-only diff.
    """
    for name in SCENARIOS:
        text = fixture_path(name).read_text(encoding="utf-8")
        assert serialize(json.loads(text)) == text, (
            f"{name}.json is not in canonical form — regenerate it rather than "
            "editing it by hand"
        )


def test_cultural_surface_is_actually_covered() -> None:
    """The festival scenarios must carry real festival data.

    Added because the original five fixtures all had ``include_festivals``
    defaulted to False, so the entire festival/rule surface was uncovered while
    the harness looked comprehensive. This asserts the cover is real — a
    ``festivals`` key present, multiple rule *kinds* exercised, and at least one
    deliberately empty day so a rule that starts over-matching is caught too.
    """
    import json as _json

    festival_scenarios = [n for n in SCENARIOS if n.startswith("festival_")]
    assert len(festival_scenarios) >= 4

    populated = 0
    categories: set[str] = set()
    for name in festival_scenarios:
        payload = _json.loads(fixture_path(name).read_text(encoding="utf-8"))
        assert "festivals" in payload, f"{name} carries no festivals key"
        for entry in payload["festivals"]:
            categories.add(entry.get("category", ""))
        if payload["festivals"]:
            populated += 1

    assert populated >= 3, "at least three festival days must actually be populated"
    assert len(categories) >= 2, (
        f"only one festival category covered ({categories}) — the extraction this "
        "protects spans lunar, solar and Newari rule kinds"
    )
    empty = [
        n
        for n in festival_scenarios
        if not _json.loads(fixture_path(n).read_text(encoding="utf-8"))["festivals"]
    ]
    assert empty, (
        "no empty-festival day is covered, so a rule that starts matching every "
        "day would not be caught"
    )
