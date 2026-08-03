"""Golden dataset schema, loader and validation.

A **golden test** compares the engine against an *external authority*. That is a
different thing from a regression test, which compares the engine against its own
earlier output, and the two must not be confused:

===================  =======================================  ==================
                     compares against                         catches
===================  =======================================  ==================
regression           this engine's previous output            unintended change
  (tests/test_byte_identical_payloads.py)
golden               a published almanac / observatory table   *being wrong*
  (this package)
===================  =======================================  ==================

The distinction is not academic here. The prior migration audit records four live
bugs, every one found by migration scaffolding and none by a 458-test suite —
because the suite's baselines had been captured *from the code that had the bugs*
(see docs/computation-architecture-audit.md, A0–A0d, and the `_source` field of
tests/data/golden_astronomy_services.json, which honestly names a commit rather
than an authority).

So this package enforces one rule above all others:

    **A dataset may only claim `status: "populated"` if it names a real external
    source. Otherwise it is `status: "todo"` and is skipped, loudly.**

Manufacturing plausible-looking values and calling them golden is worse than
having no golden file: it converts an open question into a confidently wrong
baseline that future work will be measured against.

Adding a dataset
----------------
See ``tests/golden/data/README.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

DATA_DIR = Path(__file__).parent / "data"

SCHEMA_VERSION = 1

Status = Literal["populated", "todo"]

#: How a dataset's expected values were obtained. The distinction is the whole
#: point of this package.
#:
#: ``mathematical_definition``
#:     Solved from a stated mathematical definition against Swiss Ephemeris by an
#:     **independent** reference solver in ``tests/golden/definitions.py`` — one
#:     that calls ``swe.calc_ut`` directly rather than going through the
#:     production code path. Swiss Ephemeris is this engine's astronomical
#:     authority, so "the instant where tropical solar longitude reaches 0" is a
#:     definition, not an opinion. This is NOT self-capture: the reference solver
#:     shares no code with the production solver, so it catches convergence bugs,
#:     bracketing errors and rashi off-by-ones.
#:
#: ``external_publication``
#:     A printed almanac or observatory table. Used to compare CONVENTIONS —
#:     which day a festival is assigned to, which horizon model an almanac
#:     assumes — never to define astronomy.
SourceKind = Literal["mathematical_definition", "external_publication"]

#: Units a tolerance may be expressed in. Every dataset must pick one and give a
#: rationale — an unexplained tolerance is a place for a real disagreement to
#: hide.
TOLERANCE_UNITS = frozenset({"seconds", "degrees", "arcseconds", "days", "exact"})


class GoldenDataError(AssertionError):
    """A dataset is malformed, or claims authority it does not have."""


@dataclass(frozen=True)
class Source:
    """Where the expected values came from.

    ``authority`` must name a publisher, not a code path. "Drik Panchang" or
    "Nepal Panchanga Nirnayak Samiti" qualify; "engine/astronomy/sun.py at
    commit abc123" does not — that is a regression baseline wearing a lab coat.

    ``convention`` is the field most likely to be skipped and most likely to
    cause a false failure. Two almanacs can both be right and still disagree,
    because they answer slightly different questions: udaya-tithi versus
    instant-tithi, sea-level versus elevation-adjusted horizon, Lahiri versus
    Drik ayanamsha, madhyama versus spashta positions. A golden entry without a
    stated convention cannot be adjudicated when it disagrees with the engine.
    """

    authority: str
    kind: str = "external_publication"
    definition: str = ""         # the mathematics, when kind is mathematical_definition
    method: str = ""             # solver + tolerance used to evaluate the definition
    reference: str = ""          # URL, ISBN, edition, table name
    publication_year: str = ""   # edition/almanac year, when the source states one
    convention: str = ""         # the calculation convention the source follows
    retrieved: str = ""          # ISO date the value was read from the source
    verified_by: str = ""        # who/what checked it, and how
    notes: str = ""

    #: Substrings that indicate a self-captured baseline rather than an
    #: external authority.
    _SELF_MARKERS = ("commit ", "engine/", "services/", "captured from", "this engine")

    def is_definition_based(self) -> bool:
        return self.kind == "mathematical_definition"

    def is_external(self) -> bool:
        """True when this is a defensible authority rather than a self-capture.

        A definition-based source is authoritative by construction: it states the
        mathematics and evaluates it against the ephemeris independently of the
        production path. An external publication is authoritative by publisher.
        Anything that merely records what this engine happened to output is
        neither, and is rejected.
        """
        lowered = self.authority.lower()
        if not lowered.strip():
            return False
        if any(marker in lowered for marker in self._SELF_MARKERS):
            return False
        return True


@dataclass(frozen=True)
class Tolerance:
    value: float
    unit: str
    rationale: str

    def __post_init__(self) -> None:
        if self.unit not in TOLERANCE_UNITS:
            raise GoldenDataError(
                f"unknown tolerance unit {self.unit!r}; expected one of "
                f"{sorted(TOLERANCE_UNITS)}"
            )
        if not self.rationale.strip():
            raise GoldenDataError(
                "tolerance needs a rationale — an unexplained tolerance is where "
                "a real disagreement hides"
            )


@dataclass(frozen=True)
class GoldenDataset:
    name: str
    status: Status
    description: str
    source: Source
    tolerance: Tolerance
    entries: tuple[dict[str, Any], ...] = ()
    #: Fields every entry in this dataset must carry. Declared per dataset
    #: because what identifies a calculation differs: a sankranti needs an
    #: observer and an ayanamsha, an equinox instant needs neither.
    required_entry_fields: tuple[str, ...] = ()
    #: EnvironmentProvenance hash at the time the dataset was last reconciled
    #: against the engine. Recorded, never asserted — the environment legitimately
    #: changes, and a golden value's authority comes from its source, not from
    #: our environment. Its use is diagnostic: "this was last checked under a
    #: different ephemeris" is worth knowing when a comparison starts failing.
    reconciled_under_provenance: str = ""
    schema_version: int = SCHEMA_VERSION
    todo: str = ""

    @property
    def is_runnable(self) -> bool:
        return self.status == "populated" and bool(self.entries)

    def validate(self) -> None:
        """Structural checks, plus the anti-manufacture rule."""
        if self.schema_version != SCHEMA_VERSION:
            raise GoldenDataError(
                f"{self.name}: schema_version {self.schema_version} != {SCHEMA_VERSION}"
            )
        if self.status not in ("populated", "todo"):
            raise GoldenDataError(f"{self.name}: bad status {self.status!r}")

        if self.status == "populated":
            if not self.entries:
                raise GoldenDataError(
                    f"{self.name}: status is 'populated' but there are no entries"
                )
            if not self.source.is_external():
                raise GoldenDataError(
                    f"{self.name}: status is 'populated' but the source "
                    f"({self.source.authority!r}) is not an external authority. "
                    "A golden value must come from a published source. If this is "
                    "a self-captured baseline it belongs in the regression suite "
                    "(tests/test_byte_identical_payloads.py), not here."
                )
            if not self.source.reference and not self.source.notes:
                raise GoldenDataError(
                    f"{self.name}: external source needs a reference or notes so a "
                    "later reader can re-check it"
                )
            if self.source.is_definition_based():
                if not self.source.definition.strip():
                    raise GoldenDataError(
                        f"{self.name}: a mathematical_definition source must state "
                        "the definition it evaluates (e.g. 'tropical solar longitude "
                        "= 0/90/180/270 degrees')"
                    )
                if not self.source.method.strip():
                    raise GoldenDataError(
                        f"{self.name}: a mathematical_definition source must state "
                        "its solving method and tolerance, so the value can be "
                        "reproduced independently"
                    )
            if not self.source.convention.strip():
                raise GoldenDataError(
                    f"{self.name}: source must state its calculation convention "
                    "(udaya vs instant tithi, sea-level vs elevation horizon, "
                    "which ayanamsha, madhyama vs spashta). Two almanacs can both "
                    "be right and still disagree; without the convention a "
                    "disagreement cannot be adjudicated."
                )
            for entry in self.entries:
                missing = [f for f in self.required_entry_fields if f not in entry]
                if missing:
                    raise GoldenDataError(
                        f"{self.name}: entry {entry.get('id', '?')!r} is missing "
                        f"required field(s) {missing}. Declared in the dataset's "
                        "'required_entry_fields'."
                    )
        else:
            if self.entries:
                raise GoldenDataError(
                    f"{self.name}: status is 'todo' but carries {len(self.entries)} "
                    "entries — set status to 'populated' and name the source, or "
                    "remove them"
                )
            if not self.todo.strip():
                raise GoldenDataError(
                    f"{self.name}: a 'todo' dataset must say what is needed to fill it"
                )


def _dataset_from_dict(name: str, raw: dict[str, Any]) -> GoldenDataset:
    src = raw.get("source", {})
    tol = raw.get("tolerance", {})
    return GoldenDataset(
        name=name,
        status=raw.get("status", "todo"),
        description=raw.get("description", ""),
        source=Source(
            authority=src.get("authority", ""),
            kind=src.get("kind", "external_publication"),
            definition=src.get("definition", ""),
            method=src.get("method", ""),
            reference=src.get("reference", ""),
            publication_year=str(src.get("publication_year", "")),
            convention=src.get("convention", ""),
            retrieved=src.get("retrieved", ""),
            verified_by=src.get("verified_by", ""),
            notes=src.get("notes", ""),
        ),
        tolerance=Tolerance(
            value=float(tol.get("value", 0)),
            unit=tol.get("unit", "exact"),
            rationale=tol.get("rationale", "n/a"),
        ),
        entries=tuple(raw.get("entries", ())),
        required_entry_fields=tuple(raw.get("required_entry_fields", ())),
        reconciled_under_provenance=raw.get("reconciled_under_provenance", ""),
        schema_version=int(raw.get("schema_version", SCHEMA_VERSION)),
        todo=raw.get("todo", ""),
    )


def load(name: str) -> GoldenDataset:
    path = DATA_DIR / f"{name}.json"
    if not path.is_file():
        raise GoldenDataError(f"no golden dataset {name!r} at {path}")
    dataset = _dataset_from_dict(name, json.loads(path.read_text(encoding="utf-8")))
    dataset.validate()
    return dataset


def load_all() -> list[GoldenDataset]:
    return [load(p.stem) for p in sorted(DATA_DIR.glob("*.json"))]


def dataset_names() -> list[str]:
    return [p.stem for p in sorted(DATA_DIR.glob("*.json"))]
