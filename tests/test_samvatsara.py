"""Nepal samvatsara cycle — true Jupiter with kshaya skips."""

from engine.vedic.samvatsara import samvatsara_for_bs_year


def test_bs_2080_pingala():
    data = samvatsara_for_bs_year(2080)
    assert data["key"] == "pingala"
    assert data["name_ne"] == "पिङ्गल"
    assert data["cycle"] == 51


def test_bs_2081_skips_kalayukta_uses_siddharthi():
    data = samvatsara_for_bs_year(2081)
    assert data["key"] == "siddharthi"
    assert data["name_ne"] == "सिद्धार्थी"
    assert data["cycle"] == 53


def test_bs_2082_repeats_siddharthi():
    data = samvatsara_for_bs_year(2082)
    assert data["key"] == "siddharthi"


def test_bs_2083_raudra():
    data = samvatsara_for_bs_year(2083)
    assert data["key"] == "raudra"
    assert data["name_ne"] == "रौद्र"


def test_bs_2078_rakshasa():
    data = samvatsara_for_bs_year(2078)
    assert data["key"] == "rakshasa"


def test_bs_2077_pramadi():
    data = samvatsara_for_bs_year(2077)
    assert data["key"] == "pramadi"
