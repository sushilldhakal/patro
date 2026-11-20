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
    assert resolve_siddhanta(None) == SURYA_SIDDHANTA
    assert resolve_siddhanta("drik") == DRIK
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
        siddhanta(SURYA_SIDDHANTA).engine.fixed_star_sidereal("Spica", NOV_2026)


# ── eclipses, chapters IV–V ──────────────────────────────────────────────────


def test_the_texts_shadow_and_discs_have_their_classical_size():
    m = ss.eclipse_measures(NOV_2026)
    assert 29 < m["moon"] < 36  # minutes
    assert 29 < m["sun"] < 35
    assert 75 < m["shadow"] < 92
    assert 44 < m["parallax"] < 58  # four ghatis of relative motion


def test_lunar_eclipse_of_3_march_2026_is_total_by_the_text():
    found = siddhanta(SURYA_SIDDHANTA).engine.next_lunar_eclipse(swe.julday(2026, 2, 1, 0))
    year, month, day, _ = swe.revjul(found["max_jd"])
    assert (year, month, day) == (2026, 3, 3)
    assert found["type"] == "total"
    assert found["partial_begin_jd"] < found["total_begin_jd"] < found["max_jd"] < found["total_end_jd"] < found["partial_end_jd"]


def test_solar_eclipses_fall_on_the_same_new_moons_as_drik():
    surya = siddhanta(SURYA_SIDDHANTA).engine
    drik = siddhanta(DRIK).engine
    for start in (swe.julday(2024, 1, 1, 0), swe.julday(2024, 6, 1, 0)):
        assert surya.next_solar_eclipse_max(start) == pytest.approx(drik.next_solar_eclipse_max(start), abs=0.2)


def test_the_annular_eclipse_of_june_2020_is_seen_from_kathmandu():
    found = siddhanta(SURYA_SIDDHANTA).engine.next_solar_eclipse(swe.julday(2020, 6, 15, 0), geopos=(85.32, 27.7, 0.0))
    assert found["visible"] is True
    assert found["local_begin_jd"] < found["local_max_jd"] < found["local_end_jd"]


def test_eclipses_are_found_long_before_any_ephemeris_reaches():
    deep = ss.SATYA_YUGA_START_JD + 1_000_000
    assert ss.next_eclipse(deep, "lunar") is not None
    assert ss.next_eclipse(deep, "solar", backward=True) is not None


def test_each_siddhanta_owns_its_range_and_cache_namespace():
    drik, surya = siddhanta(DRIK), siddhanta(SURYA_SIDDHANTA)
    assert drik.computable_range().deepest_bce_year == 12998
    assert surya.computable_range().deepest_bce_year > 3_890_000
    assert drik.cache_namespace == ""
    assert surya.cache_namespace == SURYA_SIDDHANTA


def test_calendar_caches_never_hand_one_systems_month_to_the_other():
    from engine.calendar.bikram_sambat import get_bs_month_start_civil

    drik = get_bs_month_start_civil(2500, 4)
    with use_siddhanta(SURYA_SIDDHANTA):
        surya = get_bs_month_start_civil(2500, 4)
    assert get_bs_month_start_civil(2500, 4) == drik
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
    default = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1")
    drik = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1&siddhanta=drik")
    surya = client.get(f"{DAY}&era=ad&year=2026&month=11&day=1&siddhanta=surya_siddhanta")
    assert default.status_code == drik.status_code == surya.status_code == 200
    # No siddhanta= means the Surya Siddhanta.
    assert default.headers["x-siddhanta"] == "surya_siddhanta"
    assert default.json() == surya.json()
    assert drik.headers["x-siddhanta"] == "drik"
    assert surya.headers["x-siddhanta"] == "surya_siddhanta"
    assert drik.json() != surya.json()


def test_api_reaches_satya_yuga_only_under_the_surya_siddhanta(client):
    deep = "era=bbs&year=3891137&month=1&day=1"
    assert client.get(f"{DAY}&{deep}&siddhanta=drik").status_code == 400
    assert client.get(f"{DAY}&{deep}").status_code == 200  # a bare URL is the Surya Siddhanta
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


# Every route that computes the sky, as the apps call it. A Surya Siddhanta request to any of
# them must be answered by the text alone: the panchanga day and month (tithi, nakshatra, yoga,
# karana), muhurta, every साइत page and its personal verdicts, festivals and holidays, sankranti,
# gochar, eclipses, the seasons and every kundali route.
_BIRTH = "birth_era=ad&birth_year=1990&birth_month=5&birth_day=15&birth_clock=10:30&birth_lat=27.7&birth_lon=85.3"
_SS_ROUTES = (
    "/v1/panchanga?era=bs&year=2083&month=5&day=9",
    "/v1/panchanga/today",
    "/v1/panchanga/2083-05-09",
    "/v1/nepal/panchanga/2083-05-09",
    "/v1/panchanga/2083/5",
    "/v1/nepal/panchanga/month/2083/5",
    "/v1/panchanga/ad/2026/9",
    "/v1/nepal/patro/2083/5",
    "/v1/nepal/patro/ad/2026/9",
    "/v1/calendar/header/2083/5",
    "/v1/panchanga/at-time?datetime=2026-09-01T10:30:00",
    "/v1/panchanga/jd/2461290.5",
    "/v1/panchanga/element/tithi/day/2083-05-09",
    "/v1/panchanga/element/nakshatra/month/2083/5",
    "/v1/panchanga/element/yoga/spans?start_jd=2461290.5&end_jd=2461295.5",
    "/v1/panchanga/rashifal",
    f"/v1/panchanga/rashifal/janma?{_BIRTH}",
    f"/v1/panchanga/rashifal/personal?{_BIRTH}",
    "/v1/panchanga/year/2083/sun",
    "/v1/panchanga/year/2083",
    "/v1/nepal/sait/2083/griha-aarambha",
    "/v1/nepal/sait/2083/griha-aarambha/detail",
    "/v1/nepal/sait/2083/vivah/detail",
    "/v1/nepal/sait/2083/month/5",
    "/v1/nepal/sait/2083/griha-aarambha/personalize?janma_nakshatra=4&janma_rashi=2",
    f"/v1/nepal/sait/2083/vivah/personalize?{_BIRTH}",
    "/v1/nepal/festivals?year=2026",
    "/v1/nepal/festivals/upcoming",
    "/v1/festivals/bs/2083",
    "/v1/festivals/2026-10-21",
    "/v1/holidays/2026",
    "/v1/nepal/holidays?year=2026",
    "/v1/nepal/sankranti/year/2026",
    "/v1/nepal/sankranti/2026-09-17",
    "/v1/nepal/special-months/2083",
    "/v1/nepal/panchak/year/2026",
    "/v1/nepal/gochar/2026-09-01",
    "/v1/nepal/gochar/ingress?from=2026-09-01&to=2026-10-01",
    "/v1/nepal/gochar/year/2083",
    "/v1/nepal/graha-sthiti/2026-09-01",
    "/v1/nepal/graha-asta/year/2026",
    "/v1/nepal/graha-vakri/year/2026",
    "/v1/nepal/eclipse/solar/year/2026",
    "/v1/nepal/eclipse/lunar/year/2026",
    "/v1/planetary/positions?datetime=2026-09-01T10:30:00",
    "/v1/seasons/tropical",
    "/v1/shadbala?datetime=1990-05-15T10:30:00",
    "/v1/kundali/detail?datetime=1990-05-15T10:30:00&ayanamsha=kp",
    "/v1/kundali/vimshottari?datetime=1990-05-15T10:30:00",
    "/v1/kundali/1990-05-15",
    "/v1/kundali/report?datetime=1990-05-15T10:30:00&lang=ne",
    "/v1/veda/daily",
)


def _fresh_place(monkeypatch, tmp_path) -> str:
    """A place no cache has seen, with every disk cache sent to *tmp_path*: each request computes."""
    import random

    import app.response_cache as response_cache
    import services.festivals.holiday_generator as holiday_generator
    import services.festivals.sait_generator as sait_generator
    import services.panchanga.year_cache as year_cache

    for module, attr in (
        (response_cache, "RESPONSE_CACHE_DIR"),
        (holiday_generator, "CACHE_DIR"),
        (sait_generator, "CACHE_DIR"),
        (year_cache, "YEAR_CACHE_DIR"),
    ):
        monkeypatch.setattr(module, attr, tmp_path / attr)
    holiday_generator.clear_year_payload_memo()
    siddhanta(DRIK).engine  # noqa: B018 — its constructor's set_sid_mode is not a computation
    rng = random.Random()
    return f"lat={rng.uniform(26.5, 29.5):.5f}&lon={rng.uniform(80.5, 88.0):.5f}&tz=Asia/Kathmandu"


def _ask_every_route(client, place: str, calculation: str, check) -> list[str]:
    failures = []
    for route in _SS_ROUTES:
        joiner = "&" if "?" in route else "?"
        try:
            response = client.get(f"{route}{joiner}{place}&{calculation}")
        except AssertionError as exc:
            failures.append(f"{route}: {exc}")
            continue
        problem = check(response)
        if problem or response.status_code != 200:
            failures.append(f"{route}: {response.status_code} {problem or ''} {response.text[:120]}")
    return failures


def test_no_surya_siddhanta_route_borrows_from_drik(client, monkeypatch, tmp_path):
    """Each route above, asked in the Surya Siddhanta from a place no cache has seen, is computed
    without one Swiss Ephemeris position, rise/set, house, eclipse or ayanamsha call — not even
    through a helper that forgot to ask the request's siddhanta. Drik's engine is built first, so
    only its constructor (which sets Lahiri once) is excused."""
    place = _fresh_place(monkeypatch, tmp_path)
    borrowed: list[str] = []

    def guard(name, real):
        def call(*args, **kwargs):
            if current_siddhanta().id != DRIK:
                borrowed.append(name)
                raise AssertionError(f"a Surya Siddhanta request called swe.{name}")
            return real(*args, **kwargs)

        return call

    for name in (
        "calc_ut", "calc", "rise_trans", "rise_trans_true_hor", "houses", "houses_ex", "set_sid_mode",
        "get_ayanamsa_ut", "get_ayanamsa_ex_ut", "pheno_ut", "time_equ", "fixstar_ut", "fixstar2_ut",
        "cotrans", "azalt", "nod_aps_ut", "sol_eclipse_when_glob", "sol_eclipse_when_loc",
        "lun_eclipse_when", "lun_eclipse_when_loc",
    ):
        if hasattr(swe, name):
            monkeypatch.setattr(swe, name, guard(name, getattr(swe, name)))

    def check(response):
        if borrowed or response.headers.get("x-siddhanta") != SURYA_SIDDHANTA:
            found = sorted(set(borrowed))
            borrowed.clear()
            return f"borrowed {found}"
        return None

    failures = _ask_every_route(client, place, "siddhanta=surya_siddhanta", check)
    assert not failures, "\n".join(failures)


@pytest.mark.parametrize("ayanamsha, mode", [("kp", swe.SIDM_KRISHNAMURTI), ("raman", swe.SIDM_RAMAN)])
def test_every_drik_route_uses_the_chosen_ayanamsha(client, monkeypatch, tmp_path, ayanamsha, mode):
    """Each route above, asked in drik with another ayanamsha, sets no other sidereal mode — not
    Lahiri through a helper that forgot the request's ayanamsha: the panchanga's nakshatra and
    yoga, the sankrantis that open BS months, festivals, साइत and the kundali all follow it."""
    place = _fresh_place(monkeypatch, tmp_path)
    modes: list[int] = []
    real_set = swe.set_sid_mode

    def record(m, *args, **kwargs):
        modes.append(m)
        return real_set(m, *args, **kwargs)

    monkeypatch.setattr(swe, "set_sid_mode", record)

    def check(response):
        wrong = sorted({m for m in modes if m != mode})
        modes.clear()
        if response.headers.get("x-ayanamsha") != ayanamsha:
            return f"x-ayanamsha {response.headers.get('x-ayanamsha')}"
        return f"sidereal modes {wrong}" if wrong else None

    failures = _ask_every_route(client, place, f"siddhanta=drik&ayanamsha={ayanamsha}", check)
    assert not failures, "\n".join(failures)
