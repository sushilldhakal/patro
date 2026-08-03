"""Observing tradition: Smarta vs Vaishnava Ekadashi selection.

Before this existed, both variants of the tradition-specific vratas were emitted
together with no way to choose, so a Vaishnava user saw Smarta dates and vice
versa. The distinction was already encoded as data (two rules, tithi 11 vs 12);
what was missing was the selector.

Design under test: a tradition is a FILTER over computed entries, not a change to
how rules are evaluated. It changes which rules apply, never the astronomy. The
default ("all") reproduces the previous behaviour exactly.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from engine.vedic import tradition as T
from services.holiday_generator import generate_festivals, load_rules

ROOT = Path(__file__).resolve().parent.parent
TAGGED = {
    "yogini-ekadashi-smarta": "smarta",
    "yogini-ekadashi-vaishnava": "vaishnava",
    "putrada-ekadashi-smarta": "smarta",
    "putrada-ekadashi-vaishnava": "vaishnava",
}


class TestTraditionModel:
    def test_default_is_all_and_preserves_previous_behaviour(self):
        assert T.DEFAULT == T.ALL
        assert T.normalize(None) == T.ALL
        assert T.normalize("") == T.ALL

    def test_unknown_tradition_is_rejected(self):
        with pytest.raises(ValueError, match="Unknown tradition"):
            T.normalize("orthodox")

    def test_untagged_rules_apply_to_every_tradition(self):
        """All but four of the 578 rules are tradition-neutral."""
        for trad in (T.ALL, T.SMARTA, T.VAISHNAVA):
            assert T.rule_applies({}, trad) is True

    def test_tagged_rules_apply_only_to_their_own_tradition(self):
        smarta_rule = {"tradition": "smarta"}
        assert T.rule_applies(smarta_rule, T.SMARTA) is True
        assert T.rule_applies(smarta_rule, T.VAISHNAVA) is False
        assert T.rule_applies(smarta_rule, T.ALL) is True


class TestRuleData:
    def test_exactly_the_known_rules_carry_a_tradition(self):
        """If a new rule gains a tradition, it needs coverage here first."""
        rules = json.loads(
            (ROOT / "rules" / "festival_rules_v3.json").read_text(encoding="utf-8")
        )["festivals"]
        tagged = {k: v["tradition"] for k, v in rules.items() if "tradition" in v}
        assert tagged == TAGGED

    def test_the_two_variants_differ_by_tithi(self):
        """The domain fact the split encodes: Vaishnava defers to dwadashi."""
        rules = load_rules()
        for base in ("yogini-ekadashi", "putrada-ekadashi"):
            assert rules[f"{base}-smarta"]["tithi"] == 11
            assert rules[f"{base}-vaishnava"]["tithi"] == 12


class TestGeneratorFiltering:
    def test_default_emits_both_variants(self):
        ids = {f["id"] for f in generate_festivals(2026)["festivals"]}
        assert "yogini-ekadashi-smarta" in ids
        assert "yogini-ekadashi-vaishnava" in ids

    def test_smarta_drops_only_vaishnava_rules(self):
        allf = generate_festivals(2026, tradition=T.ALL)
        smarta = generate_festivals(2026, tradition=T.SMARTA)
        dropped = {f["id"] for f in allf["festivals"]} - {
            f["id"] for f in smarta["festivals"]
        }
        assert dropped and all(TAGGED.get(d) == "vaishnava" for d in dropped)

    def test_vaishnava_drops_only_smarta_rules(self):
        allf = generate_festivals(2026, tradition=T.ALL)
        vaish = generate_festivals(2026, tradition=T.VAISHNAVA)
        dropped = {f["id"] for f in allf["festivals"]} - {
            f["id"] for f in vaish["festivals"]
        }
        assert dropped and all(TAGGED.get(d) == "smarta" for d in dropped)

    def test_default_payload_is_unchanged(self):
        """The key must stay ABSENT under the default, so existing consumers see
        a byte-identical payload."""
        assert "tradition" not in generate_festivals(2026)
        assert generate_festivals(2026, tradition=T.SMARTA)["tradition"] == "smarta"

    def test_tradition_never_changes_a_kept_festival_date(self):
        """A tradition selects rules; it must not move a date."""
        allf = {f["id"]: f for f in generate_festivals(2026, tradition=T.ALL)["festivals"]}
        smarta = generate_festivals(2026, tradition=T.SMARTA)["festivals"]
        for f in smarta:
            assert f["start_date"] == allf[f["id"]]["start_date"]
            assert f["end_date"] == allf[f["id"]]["end_date"]


class TestApiSurface:
    @pytest.fixture(scope="class")
    def client(self):
        from app.main import app

        return TestClient(app)

    def test_omitting_the_parameter_leaves_the_payload_unchanged(self, client):
        r = client.get("/v1/nepal/festivals", params={"year": 2083, "era": "bs"})
        if r.status_code == 404:
            pytest.skip("festival cache not built in this environment")
        assert r.status_code == 200
        assert "tradition" not in r.json()

    def test_invalid_tradition_is_a_400(self, client):
        r = client.get(
            "/v1/nepal/festivals", params={"year": 2083, "era": "bs", "tradition": "bogus"}
        )
        assert r.status_code == 400
        assert "Unknown tradition" in r.json()["detail"]
