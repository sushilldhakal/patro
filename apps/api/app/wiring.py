"""Composition root: plug implementations into the ports the code declares.

The engine never imports ``services/``, and an upstream context never imports a
downstream one (tests/test_layer_dependencies.py, tests/test_context_map.py).
Where one needs the other it names a ``Protocol`` and is handed an
implementation here: the Vastu engine's zone-rule store, and the festivals the
Panchanga views list. ``configure()`` runs once per process: ``app/main.py`` at import, and
``tests/conftest.py`` for tests that call the engine directly.
"""

from __future__ import annotations


def configure() -> None:
    from engine.vastu import zone_rules
    from services.vastu import vastu_rules_db

    zone_rules.use_zone_rule_index(vastu_rules_db)

    from services.festivals.festival_calendar import GeneratedFestivalCalendar
    from services.panchanga.festival_port import use_festival_calendar

    use_festival_calendar(GeneratedFestivalCalendar())
