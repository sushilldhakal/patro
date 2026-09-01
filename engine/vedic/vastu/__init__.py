"""Vāstu house-planning engine — pure calculation, no FastAPI imports.

Mirrors the ``engine/astronomy`` vs ``engine/vedic`` split: this package is
the Vāstu-specific calculation layer, HTTP-facing formatting lives in
``services/vastu_api.py``, and the thin route handlers live in ``api/vastu.py``.

Phase 1 scope only: the canonical spatial coordinate system (``spatial.py``),
the site/plot model (``site.py``), the room-requirement model (``rooms.py``),
and the rule/zone-use data shapes (``rules.py``). No room placement, no
doors/windows/circulation/stairs, no scoring — those are later phases.
"""
