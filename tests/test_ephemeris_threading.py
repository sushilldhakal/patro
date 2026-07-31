"""The ephemeris path must be configured per *thread*, not once per process.

pyswisseph 2.10 keeps swisseph's state — including the ephemeris path set by
``swe.set_ephe_path`` — in thread-local storage. ``engine.astronomy.engine``
configures the path at import, which covers only the importing thread.

FastAPI serves sync endpoints from a starlette threadpool, so every HTTP request
ran on a thread whose path was still swisseph's compiled-in default. Two things
followed, neither of them visible from a test that imported the engine directly:

* every position silently fell back to the built-in Moshier model, losing Swiss
  precision on *all* dates; and
* any date outside Moshier's JD 625000.5 … 2818000.5 window (3000 BCE … 3000 CE)
  failed outright, which is why every BCE / BBS request returned 400 "outside the
  installed ephemeris range" while the same computation succeeded in-process.

These tests fail loudly if the per-thread guard is removed.
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor

import pytest

from engine.astronomy.engine import EPHEMERIS_CONFIGURED, default_engine

# 19 Mar 5499 BCE — inside the installed .se1 files, far outside Moshier's range,
# so it can only be answered when this thread found the ephemeris files.
DEEP_BCE_JD = -287331.5

# A modern instant, to show the fix is not only about the extremes.
MODERN_JD = 2461252.75

pytestmark = pytest.mark.skipif(
    not EPHEMERIS_CONFIGURED,
    reason="no .se1 files installed — run scripts/install_ephemeris.py",
)


def _sun_longitude(jd: float) -> float:
    return default_engine.sun_longitude(jd)


class TestWorkerThreadsSeeTheEphemeris:
    def test_a_fresh_thread_can_reach_the_se1_files(self):
        """The regression itself: this raised EphemerisError before the guard."""
        result: dict[str, object] = {}

        def work() -> None:
            try:
                result["value"] = _sun_longitude(DEEP_BCE_JD)
            except Exception as exc:  # noqa: BLE001
                result["error"] = exc

        thread = threading.Thread(target=work)
        thread.start()
        thread.join()

        assert "error" not in result, result.get("error")
        assert result["value"] == pytest.approx(_sun_longitude(DEEP_BCE_JD), abs=1e-9)

    def test_every_thread_in_a_pool_agrees_with_the_main_thread(self):
        """A threadpool is how the API actually serves sync endpoints."""
        expected = _sun_longitude(MODERN_JD)
        with ThreadPoolExecutor(max_workers=8) as pool:
            values = list(pool.map(_sun_longitude, [MODERN_JD] * 16))
        assert all(v == pytest.approx(expected, abs=1e-12) for v in values)

    def test_rise_set_also_works_off_the_main_thread(self):
        """Rise/set goes through a different swisseph entry point (rise_trans)."""
        from engine.astronomy.location import DEFAULT_LOCATION
        from engine.astronomy.sun import sun_service

        expected = sun_service.sunrise(MODERN_JD, DEFAULT_LOCATION)
        with ThreadPoolExecutor(max_workers=4) as pool:
            got = list(
                pool.map(
                    lambda _: sun_service.sunrise(MODERN_JD, DEFAULT_LOCATION),
                    range(4),
                )
            )
        assert all(g == expected for g in got)


class TestApiServesPreEpochEras:
    """End to end, through the threadpool the real server uses."""

    @pytest.mark.parametrize(
        "query",
        [
            "era=bbs&year=1&month=1&day=1",
            "era=bbs&year=1000&month=7&day=7",
            "era=bbs&year=2999&month=1&day=1",
            "era=bc&year=44&month=3&day=15",
        ],
    )
    def test_pre_epoch_days_compute(self, query: str):
        from fastapi.testclient import TestClient

        from app.main import app

        client = TestClient(app)
        resp = client.get(f"/v1/panchanga?{query}&city_id=1283240&lean=true")
        assert resp.status_code == 200, resp.text
