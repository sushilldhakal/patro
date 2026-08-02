"""What astronomical environment produced a calculation.

``ASTRONOMY_VERSION`` (services/payload_version.py) answers *"did an output
change?"* — a human bumps it after judging that a fix moved a number. That is
useful and stays. It cannot answer the other question:

    "A cached value from six months ago disagrees with today's. What was
     different about the machine that produced it?"

Nothing recorded that. A ``pip install -U pyswisseph`` could change every BCE
answer with no version moving and no way to detect it afterward — which is the
shape of the A0c bug, where the API silently served Moshier results for months
(see docs/computation-architecture-audit.md).

:class:`EnvironmentProvenance` records the answer, derived by *observing the
running system* rather than by anyone typing what they believe is installed.
During the Phase 2 investigation that distinction was not academic: the live
tidal acceleration is −25.936, while the value documented as the default is
−25.8. A hand-written provenance record would have been wrong on its first day.

Scope — two tiers, and the boundary is the whole design
-------------------------------------------------------
**In:** facts that are constant for a deployment — swisseph build, the ``.se1``
inventory, the JPL DE number, ΔT configuration and behaviour, tidal
acceleration, and the astronomy correction constants.

**Out:** anything chosen per request. Ayanamsha is the important one: every
``AstronomyEngine`` call may override it, and five ``api/kundali.py`` endpoints
do, from a query parameter. Lahiri and Krishnamurti differ by 0.0968° at J2000 —
same environment, different answer. Folding it in would make the hash vary per
request and destroy its only job, being stable for a deployment. It is already
keyed where it varies (``kundali_report_cache``).

**Also out:** cultural rules, timezone eras, cache bucketing constants and
presentation versions. Including them would make the environment hash move when
a festival rule or a display string changed — exactly the axis confusion
``payload_version.py`` exists to prevent.

Machine independence
--------------------
The hash must match across two machines running the same environment, so
absolute paths are deliberately excluded from it: the ephemeris directory is
``/Users/…`` on a laptop and ``/app/…`` in a container, and the compiled library
lives inside a venv. Both are kept as *diagnostics* — useful when explaining a
mismatch, never part of the identity. Only ``.se1`` **basenames** are hashed.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

import swisseph as swe

from engine.astronomy import engine as _engine
from engine.astronomy.paths import ephemeris_path

# ── ΔT probes ────────────────────────────────────────────────────────────────
#
# swisseph exposes no getter for the ΔT model in use — only the
# ``MOD_DELTAT_DEFAULT`` constant, which is a statement about the build, not
# about behaviour. ``set_delta_t_userdef()`` overrides ΔT completely while that
# constant keeps reading 5 (verified). So the constant alone would be a *claim*.
#
# These probes are the *observation*. Sampling ΔT at fixed instants records what
# the model actually did, so a library upgrade — or a userdef override — shows up
# as a changed hash even when every configuration field is identical.
#
# Spread deliberately across the range the engine serves: modern, the start of
# the Common Era, and the deep BCE end where ΔT is both largest and least
# certain.
DELTA_T_PROBE_JD: tuple[float, ...] = (
    2451545.0,   # 2000-01-01 — ΔT ≈ 64 s
    2415020.5,   # 1900-01-01 — ΔT ≈ −2 s (near the zero crossing)
    1721423.5,   # 0001-01-01 — ΔT ≈ 2.9 h
    625673.5,    # 3001 BCE   — ΔT ≈ 20.9 h, the accuracy frontier
)

# swisseph has ``get_ayanamsa_name()`` but no equivalent for ΔT models, so these
# five names are the one hand-written table in this module. Guarded:
# ``test_provenance`` asserts the map covers exactly ``1..swe.MOD_NDELTAT``, so a
# library upgrade that adds a sixth model fails loudly instead of silently
# mislabelling it.
DELTA_T_MODEL_NAMES: dict[int, str] = {
    1: "stephenson_morrison_1984",
    2: "stephenson_1997",
    3: "stephenson_morrison_2004",
    4: "espenak_meeus_2006",
    5: "stephenson_etc_2016",
}

# Astronomy correction constants, by *name*. The values are always read from
# ``engine.astronomy.engine`` at capture time — never copied here — so this list
# cannot drift from the code it describes. Adding a constant is a deliberate edit
# to this tuple; changing one is not.
#
# Excluded on purpose, with reasons recorded at the constants themselves:
# ``_CACHE_MAX`` and the ``round(jd, 9)`` memo granularity (no value effect), the
# ``b"P"`` house-system flag (measured identical across five house systems), and
# the cache snap radius (bucketing, not astronomy).
CORRECTION_CONSTANT_NAMES: tuple[str, ...] = (
    "ASCENDANT_SPEED_STEP_DAYS",
    "ECLIPSE_LOCAL_MATCH_TOLERANCE_DAYS",
    "ECLIPSE_LOCAL_SEARCH_BACKOFF_DAYS",
    "HORIZON_DIP_COEFFICIENT",
    "REFRACTION_PRESSURE",
    "REFRACTION_TEMPERATURE",
)

# Fixed instant used to ask swisseph which ephemeris file — and therefore which
# JPL DE number — it is serving. ``get_current_file_data`` reports the
# *last-used* file, which is mutable global state, so provenance runs its own
# calculation at this JD immediately before reading. Without that, the answer
# would depend on whichever date the process happened to compute last.
_DENUM_PROBE_JD = 2451545.0


def _ephemeris_inventory(directory: Path) -> list[tuple[str, int]]:
    """Sorted ``(basename, size)`` for the installed ``.se1`` files.

    Sorted explicitly: ``Path.glob`` returns filesystem order (verified
    unsorted — ``sepl_54, seplm132, seplm126, …``), which would make the hash
    depend on the order a directory happened to be written.

    Basenames only — see the module docstring on machine independence.
    """
    try:
        files = sorted(directory.glob("*.se1"), key=lambda p: p.name)
    except OSError:
        return []
    out: list[tuple[str, int]] = []
    for path in files:
        try:
            out.append((path.name, path.stat().st_size))
        except OSError:
            continue
    return out


def _ephemeris_content_digest(directory: Path, inventory: list[tuple[str, int]]) -> str:
    """SHA-256 over the full bytes of every ``.se1`` file, in sorted name order.

    Full content rather than a cheaper fingerprint: measured at **0.10 s** for
    the 102 shipped files (98 MB), paid once per process and lazily, which is not
    worth trading for name+size guesswork that cannot see a rebuilt file.

    Each file contributes ``name`` + NUL + ``bytes``. The separator makes the
    stream unambiguous, so no rename can be disguised as a content change.

    Returns the digest of an empty stream when no files are installed — a fresh
    checkout running on the Moshier fallback is a legitimate, hashable state.
    """
    digest = hashlib.sha256()
    for name, _size in inventory:
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        try:
            digest.update((directory / name).read_bytes())
        except OSError:
            # Unreadable mid-scan: record the fact rather than crash, so
            # provenance still produces a (different, honest) hash.
            digest.update(b"<unreadable>")
    return digest.hexdigest()


def _jpl_denum() -> int | None:
    """JPL DE number of the ephemeris actually serving ``_DENUM_PROBE_JD``.

    ``None`` when swisseph reports 0, which is what it returns with no ``.se1``
    files installed — the built-in Moshier model is not a JPL ephemeris and must
    not be recorded as ``DE0``.
    """
    try:
        swe.calc_ut(_DENUM_PROBE_JD, swe.SUN, swe.FLG_SWIEPH)
        denum = int(swe.get_current_file_data(0)[3])
    except (swe.Error, IndexError, TypeError, ValueError):
        return None
    return denum or None


def _delta_t_probes() -> tuple[tuple[str, float], ...]:
    """(jd, ΔT seconds) at each probe instant. ``swe.deltat`` returns days."""
    probes: list[tuple[str, float]] = []
    for jd in DELTA_T_PROBE_JD:
        try:
            probes.append((repr(jd), float(swe.deltat(jd)) * 86400.0))
        except (swe.Error, TypeError, ValueError):
            probes.append((repr(jd), float("nan")))
    return tuple(probes)


def _correction_constants() -> tuple[tuple[str, float], ...]:
    """Current value of each named correction constant, read from the engine."""
    return tuple(
        (name, float(getattr(_engine, name)))
        for name in sorted(CORRECTION_CONSTANT_NAMES)
    )


@dataclass(frozen=True)
class EnvironmentProvenance:
    """An immutable description of the astronomical environment.

    Build with :meth:`current`; the constructor is not meant to be called with
    hand-supplied values, which is the failure mode this class exists to avoid.
    """

    # ── hashed: identity of the environment, machine-independent ──────────
    swisseph_version: str
    pyswisseph_build: str
    ephemeris_configured: bool
    ephemeris_file_count: int
    ephemeris_total_bytes: int
    ephemeris_content_sha256: str
    jpl_denum: int | None
    delta_t_model_id: int
    delta_t_model_name: str
    tidal_acceleration: float
    delta_t_probes: tuple[tuple[str, float], ...]
    correction_constants: tuple[tuple[str, float], ...]

    # ── not hashed: diagnostics only ──────────────────────────────────────
    # Machine-specific by nature. Recorded because they are the first thing
    # anyone wants when explaining a mismatch, excluded from the hash because
    # two containers of the same image must agree.
    ephemeris_dir: str = field(compare=False, default="")
    library_path: str = field(compare=False, default="")

    #: Exactly the fields the hash covers. Machine-specific diagnostics are
    #: absent by design — see the module docstring.
    HASHED_FIELDS: ClassVar[tuple[str, ...]] = (
        "swisseph_version",
        "pyswisseph_build",
        "ephemeris_configured",
        "ephemeris_file_count",
        "ephemeris_total_bytes",
        "ephemeris_content_sha256",
        "jpl_denum",
        "delta_t_model_id",
        "delta_t_model_name",
        "tidal_acceleration",
        "delta_t_probes",
        "correction_constants",
    )

    @classmethod
    def current(cls) -> EnvironmentProvenance:
        """Observe the running environment."""
        directory = ephemeris_path()
        inventory = _ephemeris_inventory(directory)
        model_id = int(swe.MOD_DELTAT_DEFAULT)
        return cls(
            swisseph_version=str(swe.version),
            pyswisseph_build=str(swe.__version__),
            ephemeris_configured=bool(inventory),
            ephemeris_file_count=len(inventory),
            ephemeris_total_bytes=sum(size for _n, size in inventory),
            ephemeris_content_sha256=_ephemeris_content_digest(directory, inventory),
            jpl_denum=_jpl_denum(),
            delta_t_model_id=model_id,
            delta_t_model_name=DELTA_T_MODEL_NAMES.get(model_id, f"unknown_{model_id}"),
            tidal_acceleration=float(swe.get_tid_acc()),
            delta_t_probes=_delta_t_probes(),
            correction_constants=_correction_constants(),
            ephemeris_dir=str(directory),
            library_path=str(getattr(swe, "get_library_path", lambda: "")()),
        )

    def hash_payload(self) -> dict[str, Any]:
        """Exactly the fields the hash is taken over — nothing implicit."""
        payload: dict[str, Any] = {}
        for name in self.HASHED_FIELDS:
            value = getattr(self, name)
            payload[name] = [list(item) for item in value] if isinstance(value, tuple) else value
        return payload

    def canonical_json(self) -> str:
        """Stable serialization of the hashed fields."""
        return json.dumps(self.hash_payload(), sort_keys=True, separators=(",", ":"))

    @property
    def provenance_hash(self) -> str:
        """SHA-256 of :meth:`canonical_json` — the deployment fingerprint."""
        return hashlib.sha256(self.canonical_json().encode("utf-8")).hexdigest()

    @property
    def short_hash(self) -> str:
        """First 16 hex characters — for logs and human comparison."""
        return self.provenance_hash[:16]

    def as_dict(self) -> dict[str, Any]:
        """Full record including diagnostics and the hash. For inspection only.

        Not a public API payload and not stored in ``payload_json``: provenance
        must not mix with presentation.
        """
        return {
            **self.hash_payload(),
            "ephemeris_dir": self.ephemeris_dir,
            "library_path": self.library_path,
            "provenance_hash": self.provenance_hash,
        }

    def differences(self, other: EnvironmentProvenance) -> dict[str, tuple[Any, Any]]:
        """Hashed fields that differ, as ``{field: (self, other)}``.

        The point of recording twelve fields rather than one digest: a mismatch
        should say *what* changed, not merely that something did.
        """
        mine, theirs = self.hash_payload(), other.hash_payload()
        return {
            name: (mine[name], theirs[name])
            for name in self.HASHED_FIELDS
            if mine[name] != theirs[name]
        }


_CACHED: EnvironmentProvenance | None = None


def current_provenance(*, refresh: bool = False) -> EnvironmentProvenance:
    """Process-wide provenance, computed once.

    Memoised because the ephemeris content hash reads 98 MB (~0.10 s). Lazy, so
    a process that never asks never pays, and it is never on a request path.

    ``refresh=True`` re-observes the environment — for tests, and for a future
    operator endpoint that wants to re-check a long-running process.
    """
    global _CACHED
    if refresh or _CACHED is None:
        _CACHED = EnvironmentProvenance.current()
    return _CACHED
