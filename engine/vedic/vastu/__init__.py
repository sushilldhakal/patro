"""Vāstu house-planning engine — pure calculation, no FastAPI imports.

Mirrors the ``engine/astronomy`` vs ``engine/vedic`` split: this package is
the Vāstu-specific calculation layer, HTTP-facing formatting lives in
``services/vastu_api.py``, and the thin route handlers live in ``api/vastu.py``.
"""
