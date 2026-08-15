"""date_selection and adhik_policy: real cultural knobs, unused by any rule.

Phase 7 asked whether these are required concepts or dead historical fields.
Measured, they are neither:

* **Implemented and behaviourally significant.** ``date_selection="boundary"``
  moves a festival a full day against ``"udaya"`` on every sample tried.
* **Now exercised.** ``date_selection`` was unset on all 578 rules until the
  Dashain and Tihar rules took the kaal-vyapini modes; ``adhik_policy`` is still
  ``"skip"`` on all 338 lunar rules.
* **Never tested** — until this file.

So they are not dead code to delete. They are working capability that must not be
taken up without coverage: the pin below is now "every rule that sets the knob is
covered" rather than "no rule sets it".

The distinction is genuinely Vedic, not an implementation artefact:

``udaya``     the festival falls on the civil day whose SUNRISE the tithi is
              running at — standard Nepali patro practice
``boundary``  the festival falls on the day the tithi BEGINS, regardless of
              sunrise
``madhyahna`` / ``aparahna`` / ``pradosh``
              the festival falls on the day the tithi PERVADES that part of the
              day — see engine/vedic/kaal.py and tests/test_kaal_vyapini.py

See docs/phase-7-preparation.md section 1.3.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.lunar_month import find_festival_in_lunar_month

ROOT = Path(__file__).resolve().parent.parent

SAMPLES = [
    ("Ashwin", 9, "shukla"),    # Maha Navami
    ("Kartik", 15, "krishna"),  # Laxmi Puja
    ("Shrawan", 11, "shukla"),  # an Ekadashi
    ("Poush", 11, "shukla"),    # Putrada Ekadashi (the Smarta/Vaishnava pair)
]


class TestDateSelectionIsLive:
    @pytest.mark.parametrize("month,tithi,paksha", SAMPLES)
    def test_udaya_and_boundary_give_different_dates(self, month, tithi, paksha):
        """If this ever stops differing, the branch has become inert and the
        concept really can be removed — which is the question Phase 7 asked."""
        kw = dict(
            lunar_month_name=month, tithi=tithi, paksha=paksha,
            gregorian_year=2026, adhik_policy="skip", location=DEFAULT_LOCATION,
        )
        udaya = find_festival_in_lunar_month(date_selection="udaya", **kw)
        boundary = find_festival_in_lunar_month(date_selection="boundary", **kw)
        assert udaya is not None and boundary is not None
        assert udaya != boundary, (
            f"{month} {tithi} {paksha}: date_selection no longer changes the "
            "result — the concept may now be genuinely dead"
        )
        # boundary is the day the tithi begins, so it is never later than udaya.
        assert boundary <= udaya

    def test_udaya_is_the_default(self):
        """The default must stay udaya: it is standard Nepali patro practice, and
        every one of the 578 rules relies on the default."""
        import inspect

        from rules.engine import compute_lunar_festival

        src = inspect.getsource(compute_lunar_festival)
        assert 'date_selection", "udaya"' in src or "date_selection\", \"udaya\"" in src


class TestTheKnobsStayCovered:
    """Pins the audit finding. A rule may take a knob, but only once the value
    and the rule are covered — otherwise this fails."""

    @staticmethod
    def _rules():
        path = ROOT / "rules" / "festival_rules_v3.json"
        return json.loads(path.read_text(encoding="utf-8"))["festivals"]

    def test_every_date_selection_value_is_known(self):
        from engine.vedic.kaal import KAAL_NAMES

        known = {"udaya", "boundary", *KAAL_NAMES}
        used = {
            v["date_selection"] for v in self._rules().values() if "date_selection" in v
        }
        assert used <= known, (
            f"unknown date_selection value(s) {used - known} — rules/engine.py "
            "passes the string straight through, so an unrecognised one silently "
            "falls back to udaya."
        )

    def test_every_rule_setting_date_selection_is_covered(self):
        """The knob may be used, but not without a published-date check behind
        it. tests/test_kaal_vyapini.py holds those references."""
        from tests.test_kaal_vyapini import COVERED_RULE_IDS

        setters = {k for k, v in self._rules().items() if "date_selection" in v}
        assert setters <= COVERED_RULE_IDS, (
            f"rule(s) {sorted(setters - COVERED_RULE_IDS)} set date_selection with "
            "no reference date behind them — add them to the tables in "
            "tests/test_kaal_vyapini.py before relying on the result."
        )

    def test_adhik_policy_is_uniformly_skip_where_present(self):
        values = {v.get("adhik_policy") for v in self._rules().values()}
        assert values <= {"skip", None}, (
            f"adhik_policy now takes values {values - {'skip', None}} — it was a "
            "constant, so the non-skip path needs coverage before it is relied on."
        )

    def test_adhik_policy_is_set_on_every_lunar_rule(self):
        """It is absent on non-lunar rules, where it is meaningless. That
        asymmetry is intentional; this pins it."""
        rules = self._rules()
        lunar_missing = [
            k for k, v in rules.items()
            if v.get("type") == "lunar" and "adhik_policy" not in v
        ]
        assert not lunar_missing, f"lunar rules without adhik_policy: {lunar_missing[:5]}"
