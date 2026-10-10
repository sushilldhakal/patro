"""Extended muhurta timings for daily panchanga."""

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga


def test_extended_muhurta_timings_present():
    payload = build_daily_panchanga(date(2026, 7, 9), DEFAULT_LOCATION)
    muhurta = payload["muhurta"]
    assert "auspicious_timings" in muhurta
    assert "inauspicious_timings" in muhurta
    assert len(muhurta["auspicious_timings"]) >= 8
    assert len(muhurta["inauspicious_timings"]) >= 8


def test_muhurta_timing_keys_jul_9_2026_kathmandu():
    payload = build_daily_panchanga(date(2026, 7, 9), DEFAULT_LOCATION)
    muhurta = payload["muhurta"]
    good_keys = {e["key"] for e in muhurta["auspicious_timings"]}
    bad_keys = {e["key"] for e in muhurta["inauspicious_timings"]}

    assert "amrit_kalam" in good_keys
    assert "vijaya_muhurta" in good_keys
    assert "brahma_muhurta" in good_keys
    assert "pratah_sandhya" in good_keys
    assert "sayahna_sandhya" in good_keys
    assert "nishita_muhurta" in good_keys
    assert "godhuli_muhurta" in good_keys
    assert "abhijit" in good_keys

    assert "varjyam" in bad_keys
    assert "dur_muhurtam" in bad_keys
    assert "rahu_kalam" in bad_keys
    assert "yamaganda" in bad_keys
    assert "gulika" in bad_keys
    assert "ganda_moola" in bad_keys
    assert "aadal_yoga" in bad_keys
    assert "vidaal_yoga" in bad_keys
    assert "baana" in bad_keys


def test_amrit_kalam_ashwini_window():
    payload = build_daily_panchanga(date(2026, 7, 9), DEFAULT_LOCATION)
    amrit = next(
        e for e in payload["muhurta"]["auspicious_timings"] if e["key"] == "amrit_kalam"
    )
    seg = amrit["segments"][0]
    start = seg["start_local_time_short"]
    end = seg["end_local_time_short"]
    assert start.startswith("08:")
    assert end.startswith("09:") or end.startswith("10:")
