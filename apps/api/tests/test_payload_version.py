"""Phase 4: every cache derives its identity from the astronomy axis.

The A0 rise/set bug sat in the caches after it was fixed in the engine, because
invalidation required somebody to work out, per store, whether that particular
ephemeris change could reach it. Nobody did, and the answer was "yes" for the
panchanga stores.

These tests pin the property that removes the reasoning step: bump
``ASTRONOMY_VERSION`` and *every* cache namespace's stored identity changes.

See docs/computation-architecture-audit.md (section B2, phase 4).
"""

from __future__ import annotations

import pytest

from services.payload_version import (
    ASTRONOMY_VERSION,
    _MAX_ASTRONOMY_VERSION,
    compose,
    stamp,
)


class TestCompose:
    def test_monotonic_in_both_axes(self):
        """Staleness is checked with ``<``, so the fold must never go backwards."""
        assert compose(36, 2) > compose(36, 1)
        assert compose(36, 1) > compose(35, 99)
        assert compose(2, 0) > compose(1, 99)

    def test_astronomy_bump_alone_invalidates(self):
        """The A0 case: payload shape unchanged, computed values changed."""
        assert compose(36, 2) > compose(36, 1)

    def test_rejects_an_astronomy_version_that_would_break_the_packing(self):
        with pytest.raises(ValueError):
            compose(36, _MAX_ASTRONOMY_VERSION + 1)
        with pytest.raises(ValueError):
            compose(36, -1)

    def test_stamp_is_stable_and_carries_the_axis(self):
        assert stamp("4.10.0", 2) == "4.10.0+a2"
        assert stamp("4.10.0", 2) != stamp("4.10.0", 3)


class TestEveryCacheDerivesFromTheAstronomyAxis:
    """Bumping ASTRONOMY_VERSION must move all four namespaces at once."""

    def test_panchanga_response_caches(self):
        from services.panchanga_cache import (
            CACHE_PAYLOAD_VERSION,
            PANCHANGA_PAYLOAD_VERSION,
        )

        assert CACHE_PAYLOAD_VERSION == compose(
            PANCHANGA_PAYLOAD_VERSION, ASTRONOMY_VERSION
        )
        assert CACHE_PAYLOAD_VERSION != compose(
            PANCHANGA_PAYLOAD_VERSION, ASTRONOMY_VERSION - 1
        )

    def test_kundali_report_cache(self):
        from services.kundali_report_cache import (
            CACHE_PAYLOAD_VERSION,
            KUNDALI_REPORT_VERSION,
        )

        assert CACHE_PAYLOAD_VERSION == compose(
            KUNDALI_REPORT_VERSION, ASTRONOMY_VERSION
        )

    def test_sait_cache(self):
        from services.sait_generator import SAIT_ENGINE_VERSION

        assert SAIT_ENGINE_VERSION.endswith(f"+a{ASTRONOMY_VERSION}")

    def test_festival_cache(self):
        from services.cache_meta import ENGINE_VERSION

        assert ENGINE_VERSION.endswith(f"+a{ASTRONOMY_VERSION}")

    def test_the_response_layers_share_one_constant(self):
        """response_cache / year_cache / blob_db_cache must not hold their own copy."""
        from services import panchanga_cache, response_cache, year_cache

        assert response_cache.CACHE_PAYLOAD_VERSION is panchanga_cache.CACHE_PAYLOAD_VERSION
        assert year_cache.CACHE_PAYLOAD_VERSION is panchanga_cache.CACHE_PAYLOAD_VERSION


class TestPreFixRowsAreStale:
    """The concrete A0 outcome: rows written before the fix must not be served."""

    # The literal versions in the git history at the branch point.
    PRE_FIX_PANCHANGA = 35
    PRE_FIX_KUNDALI = 10

    def test_pre_fix_panchanga_rows_lose_the_version_check(self):
        from services.panchanga_cache import CACHE_PAYLOAD_VERSION

        assert self.PRE_FIX_PANCHANGA < CACHE_PAYLOAD_VERSION

    def test_pre_fix_kundali_rows_lose_the_version_check(self):
        from services.kundali_report_cache import CACHE_PAYLOAD_VERSION

        assert self.PRE_FIX_KUNDALI < CACHE_PAYLOAD_VERSION

    def test_pre_fix_string_versions_no_longer_match(self):
        from services.cache_meta import ENGINE_VERSION
        from services.sait_generator import SAIT_ENGINE_VERSION

        assert SAIT_ENGINE_VERSION != "4.10.0"
        assert ENGINE_VERSION != "1.0.4"

    def test_disk_and_blob_keys_carry_the_new_version(self):
        """Old ``v35_…`` files and blobs are orphaned, not read."""
        from engine.astronomy.location import DEFAULT_LOCATION
        from services.panchanga_cache import CACHE_PAYLOAD_VERSION
        from services.year_cache import year_cache_path

        path = year_cache_path(2083, DEFAULT_LOCATION, variant="full")
        assert f"year_v{CACHE_PAYLOAD_VERSION}_" in path.name
        assert f"year_v{self.PRE_FIX_PANCHANGA}_" not in path.name
