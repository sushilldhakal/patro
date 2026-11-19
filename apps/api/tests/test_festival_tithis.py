"""Every festival falls on a day its own definition names — read from that day's panchanga.

A lunar festival is a tithi in a paksha, a solar one a sankranti, a fixed one a BS date: none
is ever an English date. So the check here is the day itself, under each calculation:

* lunar — the rule's tithi runs on the day (between its sunrise and the next). A festival read
  at sunrise (the default ``udaya``) that is not on its sunrise tithi must be a kshaya tithi, one
  that touches no sunrise at all; other rules (aparahna, pradosh, …) only need the tithi that day.
* solar — the day is the first of its BS month: the Kathmandu day of that month's sankranti.
* BS-fixed — the day is that BS date.
"""

from __future__ import annotations

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.siddhanta import use_ayanamsha, use_siddhanta
from services.festivals.holiday_generator import clear_year_payload_memo, generate_bs_festivals, load_rules
from tests.panchanga_facts import off_its_definition

BS_YEAR = 2083


@pytest.mark.parametrize("siddhanta_id, ayanamsha", [("drik", None), ("drik", "kp"), ("surya_siddhanta", None)])
def test_every_festival_is_on_a_day_its_definition_names(siddhanta_id, ayanamsha):
    rules = load_rules()
    wrong: list[str] = []
    with use_siddhanta(siddhanta_id), use_ayanamsha(ayanamsha):
        clear_year_payload_memo()
        for festival in generate_bs_festivals(BS_YEAR, DEFAULT_LOCATION)["festivals"]:
            why = off_its_definition(festival, rules.get(festival["id"], {}))
            if why:
                wrong.append(f"{festival['id']}: {why}")
        clear_year_payload_memo()
    assert not wrong, "\n".join(wrong)
