"""Composition root: plug infrastructure into the ports the engine declares.

The engine never imports ``services/`` (tests/test_layer_dependencies.py); where
it needs stored data it names a ``Protocol`` and is handed an implementation
here. ``configure()`` runs once per process: ``app/main.py`` at import, and
``tests/conftest.py`` for tests that call the engine directly.
"""

from __future__ import annotations


def configure() -> None:
    from engine.vedic.vastu import zone_rules
    from services import vastu_rules_db

    zone_rules.use_zone_rule_index(vastu_rules_db)
