"""date_selection and adhik_policy: real cultural knobs, unused by any rule.

Phase 7 asked whether these are required concepts or dead historical fields.
Measured, they are neither:

* **Implemented and behaviourally significant.** ``date_selection="boundary"``
  moves a festival a full day against ``"udaya"`` on every sample tried.
* **Never exercised.** All 578 rules in festival_rules_v3.json leave
  ``date_selection`` unset, and all 338 lunar rules set ``adhik_policy="skip"``.
* **Never tested** — until this file.

So they are not dead code to delete. They are working capability with no consumer
and no coverage, which is a latent liability: the first rule to set one would get
untested behaviour. These tests pin the branches so that cannot happen.

The distinction is genuinely Vedic, not an implementation artefact:

``udaya``     the festival falls on the civil day whose SUNRISE the tithi is
              running at — standard Nepali patro practice
``boundary``  the festival falls on the day the tithi BEGINS, regardless of
              sunrise

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


class TestNoRuleUsesTheKnobs:
    """Pins the audit finding. If a rule starts setting one, this fails and the
    knob needs the coverage above extended to that rule's shape."""

    @staticmethod
    def _rules():
        path = ROOT / "rules" / "festival_rules_v3.json"
        return json.loads(path.read_text(encoding="utf-8"))["festivals"]

    def test_no_rule_sets_date_selection(self):
        setters = [k for k, v in self._rules().items() if "date_selection" in v]
        assert not setters, (
            f"{len(setters)} rule(s) now set date_selection: {setters[:5]}. The "
            "branch is live but was previously unexercised — extend "
            "TestDateSelectionIsLive to cover the new shape."
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
