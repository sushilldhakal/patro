"""Era middleware — explicit language and observer-local today JD."""

from urllib.parse import parse_qs

from app.era_middleware import _resolve


def _params(query: str) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(query).items()}


def test_explicit_language_overrides_era_default():
    ctx, err = _resolve(_params("era=ad&language=ne"))
    assert err is None
    assert ctx is not None
    assert ctx.language == "ne"
    assert ctx.julian is not None


def test_language_falls_back_to_era():
    ctx, err = _resolve(_params("era=bs"))
    assert err is None
    assert ctx is not None
    assert ctx.language == "ne"


def test_input_era_parses_display_era_labels():
    ctx, err = _resolve(
        _params("era=bs&inputEra=ad&year=2026&month=7&day=31&language=ne")
    )
    assert err is None
    assert ctx is not None
    assert ctx.era == "bs"
    assert ctx.language == "ne"
    assert ctx.julian is not None


def test_today_jd_when_year_absent():
    ctx, err = _resolve(
        _params("era=bs&language=ne&lat=27.7172&lon=85.324&timezone=Asia/Kathmandu")
    )
    assert err is None
    assert ctx is not None
    assert ctx.julian is not None
    assert ctx.year is None


def test_bs_month_path_ignores_query_ymd_for_middleware_gate():
    """Month grid handlers read path y/m; query mirrors must not to_jd()-gate the request."""
    ctx, err = _resolve(
        _params("era=bbs&year=2082&month=11&language=ne&city_id=1283240"),
        "/v1/panchanga/2077/4",
    )
    assert err is None
    assert ctx is not None
    assert ctx.era == "bbs"
    assert ctx.year is None and ctx.month is None and ctx.day is None


def test_panchanga_today_path_honors_input_era_query_parts():
    ctx, err = _resolve(
        _params("era=bs&inputEra=ad&year=2026&month=8&day=2&language=ne&city_id=1283240"),
        "/v1/panchanga/today",
    )
    assert err is None
    assert ctx is not None
    assert ctx.julian is not None
    assert ctx.year == 2026
    assert ctx.month == 8
    assert ctx.day == 2
