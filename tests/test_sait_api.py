from services.sait_api import get_sait_month_entries, list_sait_categories, list_sait_years


def test_list_sait_categories():
    cats = list_sait_categories()
    ids = {c["id"] for c in cats}
    assert "vivah" in ids
    assert "bratabandha" in ids


def test_list_sait_years():
    years = list_sait_years()
    assert 2080 in years
    assert 2083 in years


def test_get_sait_2083_vivah():
    payload = get_sait_month_entries(2083, "vivah")
    assert payload["bs_year"] == 2083
    assert payload["category"] == "vivah"
    months = {m["month"]: m["days"] for m in payload["months"]}
    assert months[1] == [20, 21, 23]
    assert months[3] == [10]
    assert months[10] == [25]
    assert months[11] == [10, 13, 26]
    assert months[12] == [3, 4, 10, 25, 28]
