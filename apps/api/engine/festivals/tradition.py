"""Observing tradition — which community's reckoning a festival list follows.

Some vrata dates differ by tradition. The clearest case is Ekadashi: Smarta
practice observes it on the ekadashi tithi (11), Vaishnava practice defers to
dwadashi (12) when the ekadashi is *viddha* (overlapped by dashami at sunrise).
The engine encodes that as two rules with different tithi values, which is
correct and stays.

What was missing was the *selector*. Both variants were emitted together, so a
Vaishnava user saw Smarta dates and vice versa, with no way to choose.

Design, and why it is a filter rather than a computation:

    A tradition does not change the astronomy and does not change how a rule is
    evaluated. It changes **which rules apply**. So it belongs at the edge of the
    rule layer as a filter over an already-computed list, not threaded through
    the matchers. That keeps ``rules/engine.py`` tradition-unaware and means a
    new tradition is a data change plus a name here, never new code.

``ALL`` is the default and reproduces the previous behaviour exactly — every
rule, both variants — so nothing changes for a caller that does not ask.
"""

from __future__ import annotations

from typing import Any, Final, Literal

#: Emit every rule regardless of tradition. The default, and what the service
#: did before a selector existed.
ALL: Final = "all"

SMARTA: Final = "smarta"
VAISHNAVA: Final = "vaishnava"

Tradition = Literal["all", "smarta", "vaishnava"]

#: Every accepted value. ``all`` included so it can be passed explicitly.
TRADITIONS: Final[frozenset[str]] = frozenset({ALL, SMARTA, VAISHNAVA})

#: The default, chosen to preserve existing behaviour rather than to express a
#: preference. Nepali practice is predominantly Smarta, but switching the default
#: would silently change every existing consumer's festival list, so that is a
#: product decision and not one this module makes.
DEFAULT: Final = ALL


def normalize(value: str | None) -> str:
    """Accept ``None``/empty as the default; reject anything unrecognised."""
    if value is None or not str(value).strip():
        return DEFAULT
    key = str(value).strip().lower()
    if key not in TRADITIONS:
        raise ValueError(
            f"Unknown tradition {value!r}. Use one of: {', '.join(sorted(TRADITIONS))}"
        )
    return key


def rule_applies(rule: dict[str, Any], tradition: str) -> bool:
    """Whether a rule should be emitted for *tradition*.

    A rule with no ``tradition`` field is tradition-neutral and always applies —
    which is all but four of the 578 rules. A tagged rule applies only to its own
    tradition, or to everything under ``ALL``.
    """
    if tradition == ALL:
        return True
    rule_tradition = rule.get("tradition")
    return rule_tradition is None or rule_tradition == tradition


def filter_entries(
    entries: list[dict[str, Any]], tradition: str, rules: dict[str, Any]
) -> list[dict[str, Any]]:
    """Drop already-computed entries that do not apply to *tradition*."""
    if tradition == ALL:
        return entries
    return [e for e in entries if rule_applies(rules.get(e["id"], {}), tradition)]
