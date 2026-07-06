"""Tests for /kundali/detail and kundali detail builder."""

import json

from fastapi.testclient import TestClient

from app.main import app
from engine.astronomy.location import ObserverLocation
from engine.vedic.at_time import parse_query_datetime
from engine.vedic.kundali_detail import build_kundali_detail


def test_kundali_detail_endpoint():
    client = TestClient(app)
    resp = client.get(
        "/kundali/detail",
        params={
            "datetime": "1993-06-12T10:30:00",
            "ayanamsha": "nepal",
            "lat": 27.7172,
            "lon": 85.3240,
            "timezone": "Asia/Kathmandu",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "panchanga" in data
    assert data["ayanamsha"] == "nepal"
    assert "1" in data["vargaCharts"]["entries"]
    d1 = data["vargaCharts"]["entries"]["1"]
    assert any(row["key"] == "lagna" for row in d1)
    assert any(row["key"] == "moon" for row in d1)
    for row in d1:
        assert 1 <= row["vargaRashi"] <= 12
        assert row["subLord"] in {
            "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
        }


def test_build_kundali_detail_direct():
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")
    assert payload["lagnaRashi"] is not None
    assert payload["dasha"] is not None
    assert len(payload["dasha"]["tree"]) <= 3
    assert payload["dasha"]["tree_depth"] == 3
    assert payload["birth_instant"].startswith("1993-06-12")


def test_ashtakavarga_and_bhava_bala_present():
    """Both sections must be populated with valid Parashari invariants."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")

    av = payload["ashtakavarga"]
    assert av is not None
    raw = av["raw"]
    assert len(raw) == 12
    # Classical per-target bhinnashtakavarga totals (invariant across all charts).
    expected = {
        "lagna": 49, "sun": 48, "moon": 49, "mars": 39,
        "mercury": 54, "jupiter": 56, "venus": 52, "saturn": 39,
    }
    for target, total in expected.items():
        assert sum(row["bindus"][target] for row in raw) == total, target
    # Sarvashtakavarga (seven grahas, Lagna excluded) always totals 337.
    assert sum(row["sarvashtaka"] for row in raw) == 337
    assert {r["target"] for r in av["shodhyaPinda"]} == set(expected)

    bb = payload["bhavaBala"]
    assert bb is not None
    assert len(bb["houses"]) == 12
    assert bb["referenceVirupas"] == 420.0
    for h in bb["houses"]:
        assert 0.0 <= h["disha"] <= 60.0
        component_sum = h["bhavadhipati"] + h["disha"] + h["drishti"]
        assert abs(h["totalPinda"] - component_sum) < 0.05
    assert bb["strongest"]["totalPinda"] >= bb["weakest"]["totalPinda"]


def test_birth_meta_ishta_kala_present():
    """Ishta Kala and Ahoratri Ishta Kala must be computed from sunrise anchor."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")
    meta = payload["birthMeta"]
    assert meta["ishtaKala"] is not None
    assert meta["ahoratriIshtaKala"] is not None
    for key in ("ishtaKala", "ahoratriIshtaKala"):
        block = meta[key]
        assert set(block) == {"ghadi", "pala", "vipala"}
        assert block["ghadi"] >= 0
        assert 0 <= block["pala"] < 60
        assert 0 <= block["vipala"] < 60
    # Corrected (ahoratri) is never greater than uncorrected (ishta) when correction is positive.
    ishta_min = meta["ishtaKala"]["ghadi"] * 24 * 60 + meta["ishtaKala"]["pala"] * 24 / 60
    ahoratri_min = (
        meta["ahoratriIshtaKala"]["ghadi"] * 24 * 60
        + meta["ahoratriIshtaKala"]["pala"] * 24 / 60
    )
    assert ahoratri_min <= ishta_min + 0.5


def test_yogas_list_all_fixed_yogas_not_just_formed_ones():
    """The Kundali Yoga table shows the full checklist, present or absent —
    it must not silently drop rows for yogas that aren't formed in this chart."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")

    yogas = payload["yogas"]
    keys = [y["key"] for y in yogas]
    assert len(keys) == len(set(keys))  # no duplicate rows
    assert any(not y["present"] for y in yogas), "expected at least one absent yoga"
    assert {"gajakesari", "budhaditya", "chandra_mangala", "kemadruma", "dhana_2_11"} <= set(keys)
    extended = {
        "mangala_dosha", "kala_sarpa", "lagna_mallika", "sunapha", "anapha",
        "durdhara", "adhi", "chatussagara", "vasumati", "amala", "parijata",
        "veshi", "vasi", "ubhayachari", "mahabhagya", "lakshmi", "shrinatha",
    }
    assert extended <= set(keys), f"missing extended yogas: {extended - set(keys)}"
    assert len(yogas) >= 50, f"expected a broad catalog, got {len(yogas)}"
    for planet in ("mars", "mercury", "jupiter", "venus", "saturn"):
        assert f"mahapurusha_{planet}" in keys
    for row in yogas:
        assert isinstance(row["present"], bool)
        assert row["nameEn"] and row["nameNe"]
        assert row["descEn"]


def test_panchanga_yoga_and_nakshatra_respect_the_chosen_ayanamsha():
    """/kundali/detail's tithi/nakshatra/yoga must use the same ayanamsha as
    the rest of the chart (planets, lagna) — previously nakshatra and yoga
    were silently always computed under Lahiri regardless of what the
    request asked for, so switching ayanamsha left them inconsistent with
    the D1 chart and moon-nakshatra shown on the same page."""
    from engine.astronomy.engine import AstronomyEngine

    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("2000-01-10T15:00:00", timezone_name=loc.timezone)

    lahiri = build_kundali_detail(instant, loc, ayanamsha="lahiri")
    raman = build_kundali_detail(instant, loc, ayanamsha="raman")

    lahiri_panchanga = lahiri["panchanga"]
    raman_panchanga = raman["panchanga"]

    # Yoga and nakshatra depend on absolute sidereal longitude — must shift
    # with the ayanamsha, matching the D1 chart's own moon position.
    assert lahiri_panchanga["yoga"]["number"] != raman_panchanga["yoga"]["number"]
    assert lahiri_panchanga["nakshatra"]["number"] != raman_panchanga["nakshatra"]["number"]
    assert lahiri["birthMeta"]["yoga"]["index"] != raman["birthMeta"]["yoga"]["index"]

    # Tithi depends only on the Sun-Moon elongation, which cancels the
    # ayanamsha offset — must stay identical across ayanamshas.
    assert lahiri_panchanga["tithi"]["number"] == raman_panchanga["tithi"]["number"]

    # birthMeta.yoga must always agree with panchanga.yoga (same request) —
    # previously birthMeta.yoga read a nonexistent "index" key and silently
    # defaulted to 0 (Vishkambha) for every single chart.
    assert lahiri["birthMeta"]["yoga"]["number"] == lahiri_panchanga["yoga"]["number"]
    assert raman["birthMeta"]["yoga"]["number"] == raman_panchanga["yoga"]["number"]
    assert lahiri["birthMeta"]["yoga"]["index"] == lahiri_panchanga["yoga"]["number"] - 1
    assert raman["birthMeta"]["yoga"]["index"] == raman_panchanga["yoga"]["number"] - 1

    assert AstronomyEngine.LAHIRI != AstronomyEngine.RAMAN  # sanity: modes are distinct


def test_kala_sarpa_and_amala_use_whole_sign_reference_points():
    """Real chart regression: 1945-12-28 11:30 Kathmandu (Lahiri).

    Kala Sarpa previously used an exact-degree arc between Rahu and Ketu, so
    a planet sharing Ketu's own sign but a few degrees past it (here, the
    Sun at 253.04 deg vs Ketu at 246.85 deg, both in Dhanu) was judged to
    have "broken out" of the hemisphere — stricter than how this yoga is
    judged classically (by rashi, not exact degree). Amala previously only
    checked the 10th house from the Moon, missing the equally standard
    10th-from-Lagna reference point that this chart actually satisfies
    (Mercury in Vrishchika = 10th from the Meena lagna)."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1945-12-28T11:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="lahiri")

    present = {y["key"]: y["present"] for y in payload["yogas"]}
    assert present["kala_sarpa"] is True
    assert present["gajakesari"] is True
    assert present["sunapha"] is True
    assert present["amala"] is True
    assert present["vasi"] is True
    # Genuinely absent for this chart: the lagna lord (Jupiter) sits in
    # house 8 (not a kendra), so Parvata's angular-lord condition fails.
    assert present["parvata"] is False


def test_rahu_ketu_use_mean_node_matching_drikpanchang():
    """Real chart regression: 1945-12-28 11:30 Kathmandu (Lahiri).

    Rahu/Ketu previously used the true (osculating) node, with a comment
    claiming this matches Drik Panchang. Verified against Drik Panchang's
    published longitude for this exact chart that the claim was backwards:
    the mean node landed within the same ~40 arcsecond ayanamsha-formula
    tolerance seen on every other graha (Drik shows 6 deg 34' 04" Mithuna;
    mean node here is 6 deg 34' 29"), while the true node was off by a full
    16.7 arcminutes (6 deg 50' 48")."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1945-12-28T11:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="lahiri")

    d1 = payload["vargaCharts"]["entries"]["1"]
    rahu = next(r for r in d1 if r["key"] == "rahu")
    ketu = next(r for r in d1 if r["key"] == "ketu")

    assert rahu["dms"]["rashiNum"] == 3  # Mithuna
    assert rahu["dms"]["deg"] == 6
    assert rahu["dms"]["min"] == 34
    # Ketu is always exactly opposite Rahu.
    assert ketu["dms"]["rashiNum"] == 9  # Dhanu
    assert ketu["dms"]["deg"] == rahu["dms"]["deg"]
    assert ketu["dms"]["min"] == rahu["dms"]["min"]


def test_graha_yuddha_detects_a_real_planetary_war():
    """Two tara grahas within 1deg of longitude must be reported as a war,
    not silently left empty — /kundali/detail previously always returned
    yuddha: {wars: [], byPlanet: {}} regardless of the actual chart."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1982-01-10T06:00:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="lahiri")

    yuddha = payload["yuddha"]
    assert yuddha["wars"], "expected a detected planetary war for this chart"
    war = yuddha["wars"][0]
    assert war["separationDeg"] < 1.0
    assert {war["winner"], war["loser"]} <= {"mars", "mercury", "jupiter", "venus", "saturn"}
    assert yuddha["byPlanet"][war["winner"]] > 0
    assert yuddha["byPlanet"][war["loser"]] < 0


def test_graha_yuddha_empty_when_no_war_in_chart():
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")
    assert payload["yuddha"] == {"wars": [], "byPlanet": {}}


def test_kundali_report_streams_ndjson():
    """Regression: the report endpoint previously crashed on the ayanamsa arg."""
    client = TestClient(app)
    resp = client.get(
        "/kundali/report",
        params={
            "datetime": "1993-06-12T10:30:00",
            "ayanamsha": "nepal",
            "lat": 27.70169,
            "lon": 85.3206,
            "timezone": "Asia/Kathmandu",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/x-ndjson")
    lines = [line for line in resp.text.splitlines() if line.strip()]
    assert len(lines) > 1


def test_kundali_report_served_from_cache_on_repeat(tmp_path, monkeypatch):
    """Same birth inputs should hit SQLite cache on the second request."""
    import services.kundali_report_cache as report_cache

    db_path = tmp_path / "kundali.db"
    monkeypatch.setattr(report_cache, "kundali_db_path", lambda: db_path)
    monkeypatch.setattr(report_cache, "cache_enabled", lambda: True)

    params = {
        "datetime": "1993-06-12T10:30:00",
        "ayanamsha": "nepal",
        "lang": "en",
        "lat": 27.70169,
        "lon": 85.3206,
        "timezone": "Asia/Kathmandu",
    }
    client = TestClient(app)

    first = client.get("/kundali/report", params=params)
    assert first.status_code == 200
    assert first.headers.get("X-Report-Cache") == "miss"

    second = client.get("/kundali/report", params=params)
    assert second.status_code == 200
    assert second.headers.get("X-Report-Cache") == "hit"
    assert second.text == first.text


def test_kundali_report_nepali_localization():
    """Nepali lang should translate planets, rashis, and meta disclaimer."""
    client = TestClient(app)
    resp = client.get(
        "/kundali/report",
        params={
            "datetime": "1993-06-12T10:30:00",
            "ayanamsha": "nepal",
            "lang": "ne",
            "force": "true",
            "lat": 27.70169,
            "lon": 85.3206,
            "timezone": "Asia/Kathmandu",
        },
    )
    assert resp.status_code == 200
    lines = [json.loads(line) for line in resp.text.splitlines() if line.strip()]
    meta = next(r for r in lines if r.get("kind") == "meta")
    assert meta["disclaimer"] == (
        "चिन्तन र सांस्कृतिक अन्तर्दृष्टिका लागि। प्रवृत्ति र सम्भावना देखाउँछ, "
        "निश्चितता होइन; व्यावसायिक सल्लाहको विकल्प होइन।"
    )
    sections = [r for r in lines if r.get("kind") == "section"]
    assert sections
    joined = " ".join(
        p
        for s in sections
        for p in (s.get("body") or [])
    ) + " ".join(
        it.get("text", "")
        for s in sections
        for it in (s.get("items") or [])
    )
    assert "Sun" not in joined
    assert "Mesha" not in joined
    assert "सूर्य" in joined or "मेष" in joined


def test_kundali_report_force_bypasses_cache(tmp_path, monkeypatch):
    import services.kundali_report_cache as report_cache

    db_path = tmp_path / "kundali.db"
    monkeypatch.setattr(report_cache, "kundali_db_path", lambda: db_path)
    monkeypatch.setattr(report_cache, "cache_enabled", lambda: True)

    params = {
        "datetime": "1993-06-12T10:30:00",
        "ayanamsha": "nepal",
        "lang": "en",
        "lat": 27.70169,
        "lon": 85.3206,
        "timezone": "Asia/Kathmandu",
    }
    client = TestClient(app)
    client.get("/kundali/report", params=params)
    forced = client.get("/kundali/report", params={**params, "force": "true"})
    assert forced.status_code == 200
    assert forced.headers.get("X-Report-Cache") == "miss"
