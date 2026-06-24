from datetime import datetime, timezone

from panchanga.vimshottari import vimshottari_dasha


def test_vimshottari_balance_and_sequence():
    birth = datetime(1990, 5, 15, 6, 30, tzinfo=timezone.utc)
    result = vimshottari_dasha(45.0, birth, cycles=1)
    assert result["mahadasha_lord"] in {
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"
    }
    assert 0 < result["balance_years"] <= 20
    assert len(result["sequence"]) == 9
    assert result["sequence"][0]["lord"] == result["mahadasha_lord"]
