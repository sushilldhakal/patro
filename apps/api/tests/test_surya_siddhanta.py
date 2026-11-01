"""The Surya Siddhanta engine and the per-request switch between it and drik."""

from __future__ import annotations

import math
import time

import pytest
import swisseph as swe

from engine.astronomy.engine import EngineBase, NotInThisSiddhanta, SwissEphemerisEngine, default_engine
from engine.astronomy.siddhanta import (
    DRIK,
    SURYA_SIDDHANTA,
    current_siddhanta,
    resolve_siddhanta,
    siddhanta,
    use_siddhanta,
)
from engine.astronomy.siddhanta import surya_siddhanta_math as ss
from engine.astronomy.siddhanta.surya_siddhanta_engine import SuryaSiddhantaEngine
from engine.astronomy.jd_calendar import CivilDay

KALI = ss.KALI_EPOCH_JD
NOV_2026 = CivilDay(2026, 11, 1).to_jd_ut()


# ── the text ─────────────────────────────────────────────────────────────────


def test_every_mean_planet_starts_kali_yuga_at_mesha_0():
    for key in ("sun", "moon", "mars", "mercury_sighra", "jupiter", "venus_sighra", "saturn"):
        assert ss.mean_longitude(key, KALI) == pytest.approx(0.0, abs=1e-6)


def test_the_moons_apogee_and_node_at_kali_are_where_the_text_puts_them():
    assert ss.mean_longitude("moon_apogee", KALI) == pytest.approx(90.0, abs=1e-6)
    assert ss.mean_longitude("moon_node", KALI) == pytest.approx(180.0, abs=1e-6)
    assert ss.apsis_longitude("sun", KALI) == pytest.approx(77.13, abs=0.01)  # 77°8′


def test_ayanamsha_is_zero_at_kali_and_3600_years_later_and_about_23_now():
    assert ss.ayanamsha(KALI) == pytest.approx(0.0, abs=1e-9)
    assert ss.ayanamsha(KALI + 3600 * ss.YEAR_DAYS) == pytest.approx(0.0, abs=1e-6)
    assert ss.ayanamsha(NOV_2026) == pytest.approx(22.91, abs=0.01)
    assert ss.ayanamsha(KALI + 1800 * ss.YEAR_DAYS) == pytest.approx(-27.0, abs=1e-6)


def test_the_sidereal_sun_is_within_a_degree_of_drik_today():
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    drik = swe.calc_ut(NOV_2026, swe.SUN, swe.FLG_SIDEREAL)[0][0]
    assert abs(ss._signed(ss.true_position("sun", NOV_2026)[0] - drik)) < 1.0


def test_the_lagna_formula_is_the_ecliptic_horizon_intersection():
    """Same RAMC and obliquity in, same ascendant out as swisseph's houses."""
    armc, lat, eps = 211.7, 27.7, 23.44
    r, e, p = map(math.radians, (armc, eps, lat))
    ours = math.degrees(math.atan2(math.cos(r), -(math.sin(r) * math.cos(e) + math.tan(p) * math.sin(e)))) % 360
    assert ours == pytest.approx(swe.houses_armc(armc, lat, eps, b"P")[1][0], abs=1e-6)


def test_positions_exist_at_the_start_of_satya_yuga():
    for body in ss.BODIES:
        lon, _ = ss.true_position(body, ss.SATYA_YUGA_START_JD)
        assert 0.0 <= lon < 360.0


def test_sunrise_is_found_far_back_and_near_six():
    jd0 = math.floor(ss.SATYA_YUGA_START_JD) + 0.5 + 100
    rise = ss.next_rise_or_set("sun", jd0 - 85.3 / 360 - 0.25, 27.7, 85.3, rising=True)
    assert rise is not None
    local_hours = ((rise + 85.3 / 360 + 0.5) % 1.0) * 24
    assert 4.5 < local_hours < 7.5


# ── the switch ───────────────────────────────────────────────────────────────


def test_default_engine_follows_the_current_siddhanta_and_resets():
    assert current_siddhanta().id == DRIK
    drik = default_engine.sun_longitude(NOV_2026)
    with use_siddhanta(SURYA_SIDDHANTA):
        assert current_siddhanta().id == SURYA_SIDDHANTA
        assert default_engine.sun_longitude(NOV_2026) == pytest.approx(ss.true_position("sun", NOV_2026)[0])
    assert current_siddhanta().id == DRIK
    assert default_engine.sun_longitude(NOV_2026) == drik


def test_resolve_siddhanta_accepts_the_names_and_refuses_others():
    assert resolve_siddhanta(None) == DRIK
    assert resolve_siddhanta("surya-siddhanta") == SURYA_SIDDHANTA
    with pytest.raises(ValueError):
        resolve_siddhanta("bogus")


# ── each siddhanta stands alone ──────────────────────────────────────────────


def test_the_surya_siddhanta_engine_shares_only_the_base_with_drik():
    engine = siddhanta(SURYA_SIDDHANTA).engine
    assert isinstance(engine, SuryaSiddhantaEngine) and isinstance(engine, EngineBase)
    assert not isinstance(engine, SwissEphemerisEngine)


def test_each_siddhanta_resolves_its_own_ayanamsha():
    from engine.astronomy.sidereal import resolve_ayanamsha_mode

    assert resolve_ayanamsha_mode(None) == ("lahiri", swe.SIDM_LAHIRI)
    with pytest.raises(ValueError):
        resolve_ayanamsha_mode("bogus")
    with use_siddhanta(SURYA_SIDDHANTA):
        # Its own libration ayanamsha, whatever drik mode was asked for.
        assert resolve_ayanamsha_mode("raman") == ("surya_siddhanta", None)
        assert resolve_ayanamsha_mode(None) == ("surya_siddhanta", None)


def test_what_the_surya_siddhanta_does_not_compute_is_refused_not_borrowed():
    with pytest.raises(NotInThisSiddhanta):
        siddhanta(SURYA_SIDDHANTA).engine.next_solar_eclipse_max(NOV_2026)
    with pytest.raises(NotInThisSiddhanta):
        siddhanta(SURYA_SIDDHANTA).engine.fixed_star_sidereal("Spica", NOV_2026)


def test_each_siddhanta_owns_its_range_and_cache_namespace():
    drik, surya = siddhanta(DRIK), siddhanta(SURYA_SIDDHANTA)
    assert drik.computable_range().deepest_bce_year == 12998
    assert surya.computable_range().deepest_bce_year > 3_890_000
    assert drik.cache_namespace == ""
    assert surya.cache_namespace == SURYA_SIDDHANTA


def test_calendar_caches_never_hand_one_systems_month_to_the_other():
    from engine.calendar.bikram_sambat import get_bs_month_start_civil

    # Past the official table, so the month start is computed from sankrantis.
    drik = get_bs_month_start_civil(2150, 4)
    with use_siddhanta(SURYA_SIDDHANTA):
        surya = get_bs_month_start_civil(2150, 4)
    assert get_bs_month_start_civil(2150, 4) == drik
    assert surya != drik  # the text's year is longer, so its sankranti falls days later by then


def test_samvatsara_is_closed_form_under_the_surya_siddhanta():
    from engine.calendar.samvatsara import ANCHOR_BS_YEAR, ANCHOR_INDEX, samvatsara_index_for_bs_year

    with use_siddhanta(SURYA_SIDDHANTA):
        assert samvatsara_index_for_bs_year(ANCHOR_BS_YEAR) == ANCHOR_INDEX
        start = time.perf_counter()
        assert 0 <= samvatsara_index_for_bs_year(-3_891_000) < 60
        assert time.perf_counter() - start < 2.0


# ── the API ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)


DAY = "/v1/panchanga?lat=27.7&lon=85.32&tz=Asia/Kathmandu&lean=true"


def test_api_computes_in_the_requested_system_and_says_so(client):
    drik = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1")
    surya = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1&siddhanta=surya_siddhanta")
    assert drik.status_code == surya.status_code == 200
    assert drik.headers["x-siddhanta"] == "drik"
    assert surya.headers["x-siddhanta"] == "surya_siddhanta"
    assert drik.json() != surya.json()


def test_api_reaches_satya_yuga_only_under_the_surya_siddhanta(client):
    deep = "era=bbs&year=3891137&month=1&day=1"
    assert client.get(f"{DAY}&{deep}").status_code == 400
    response = client.get(f"{DAY}&{deep}&siddhanta=surya_siddhanta")
    assert response.status_code == 200, response.text
    assert response.json()["date_bs"] == "3891137-01-01"


def test_api_refuses_an_unknown_system(client):
    response = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1&siddhanta=bogus")
    assert response.status_code == 400
    assert "siddhanta" in response.json()["detail"]


def test_a_surya_siddhanta_request_never_touches_the_ephemeris(client, monkeypatch):
    """With every swisseph position, rise/set, house and ayanamsha call broken, the
    Surya Siddhanta still builds a panchanga and a kundali: it consults no drik
    position and no Lahiri. (Date arithmetic — julday/revjul — is not astronomy.)"""

    def refuse(*_args, **_kwargs):
        raise AssertionError("the Surya Siddhanta asked the Swiss Ephemeris")

    for name in (
        "calc_ut", "calc", "rise_trans", "rise_trans_true_hor", "houses", "houses_ex",
        "set_sid_mode", "get_ayanamsa_ut", "get_ayanamsa_ex_ut", "pheno_ut", "time_equ",
        "fixstar_ut", "fixstar2_ut", "cotrans",
    ):
        if hasattr(swe, name):
            monkeypatch.setattr(swe, name, refuse)
    loc = "lat=27.7&lon=85.32&tz=Asia/Kathmandu"
    day = client.get(f"/v1/panchanga?{loc}&lean=true&era=bs&year=2183&month=5&day=9&siddhanta=surya_siddhanta")
    assert day.status_code == 200, day.text
    chart = client.get(f"/v1/kundali/detail?{loc}&datetime=1990-05-15T10:30:00&siddhanta=surya_siddhanta&ayanamsha=raman")
    assert chart.status_code == 200, chart.text
