# Golden datasets

Values here come from **published external authorities**. They answer "is the engine
right?", which is a different question from "did the engine change?".

| | compares against | catches |
|---|---|---|
| `tests/test_byte_identical_payloads.py` (regression) | the engine's own earlier output | unintended change |
| **this directory** (golden) | a published almanac / observatory | **being wrong** |

The distinction is load-bearing. The migration audit records four live bugs, every one
found by scaffolding and none by a 458-test suite — because the suite's baselines had been
captured *from the code that had the bugs*.

---

## The one rule

> **A dataset may only be `"populated"` if it names a real external source.**
> Otherwise it stays `"todo"` and is skipped, loudly.

Manufacturing plausible values is worse than having none: it turns an open question into a
confidently wrong baseline that all future work is measured against. `schema.validate()`
enforces this — a `"populated"` dataset whose `source.authority` looks self-referential
(contains `commit `, `engine/`, `services/`, …) fails to load.

**Never fill a dataset from this engine's own output.** If you want to pin current
behaviour, that is the regression harness, not this directory.

---

## Status

| Dataset | Status | Entries | Authority |
|---|---|---|---|
| `sunrise_sunset` | ✅ populated | 2 | Drik Panchang; published Nepali panchang |
| `graha_longitudes` | ✅ populated | 1 | Drik Panchang |
| `weekday_direction_tables` | ✅ populated | 7 | DrikPanchang |
| `equinox_solstice` | ⬜ todo | — | **highest priority** — gates the `tropical_seasons` migration |
| `sankranti` | ⬜ todo | — | needs an authoritative Nepali patro |
| `eclipses` | ⬜ todo | — | needs NASA GSFC canon or equivalent |
| `ayanamsha` | ⬜ todo | — | needs a published Lahiri table |
| `tithi_boundaries` | ⬜ todo | — | needs an authoritative Nepali patro |

The populated three were promoted from values already verified in this repository — they
were established while fixing real bugs (the valley-dip regression, the mean-vs-true node
reversal, the Rahu Vasa table copy), so their provenance is the repository's own history.

---

## File format

```jsonc
{
  "schema_version": 1,
  "status": "populated",          // or "todo"
  "description": "one line: what this verifies and why it matters",

  "source": {
    "authority":   "Drik Panchang",              // a PUBLISHER, never a code path
    "reference":   "URL / ISBN / edition / table name",
    "retrieved":   "2026-08-02",                 // when it was read from the source
    "verified_by": "who checked it, and how",
    "notes":       "caveats — conventions, horizon model, which edition"
  },

  "tolerance": {
    "value": 90,
    "unit": "seconds",            // seconds | degrees | arcseconds | days | exact
    "rationale": "REQUIRED. Why this number, and what error it still catches."
  },

  // EnvironmentProvenance hash when this was last reconciled. Recorded, never
  // asserted: a golden value's authority is its source, not our ephemeris. Used
  // diagnostically — "last checked under a different environment" is worth
  // knowing when a comparison starts failing.
  "reconciled_under_provenance": "<64 hex chars>",

  "entries": [ { "id": "...", "expected": { } } ]
}
```

A `"todo"` dataset additionally carries `todo` (what source would fill it) and
`entry_shape` (the schema, so a contributor knows what to collect), and **must** have an
empty `entries`.

### Tolerance

Every dataset states one, with a rationale. An unexplained tolerance is where a real
disagreement hides. State what it *accepts* (printed-minute rounding, ayanamsha formula
spread) and what it still *catches* — a tolerance that would not have caught the bug the
dataset exists for is too loose.

---

## Adding a dataset

1. Get values from a published source. **Do not compute them here.**
2. Fill `source` completely — a later reader must be able to re-check it.
3. Choose a tolerance and justify it.
4. Set `status: "populated"`, add `entries`, set `reconciled_under_provenance` to
   `current_provenance().provenance_hash`.
5. Add a comparator class in `../test_golden_suite.py` if the dataset needs one.
6. Run `pytest tests/golden/ -s` and read the coverage report.

If the engine disagrees with the source, **do not adjust the golden value to match.** That
defeats the purpose. Investigate; if the source is wrong or uses a different convention,
record that in `notes` and either widen the tolerance with a rationale or drop the entry.

---

## Known open question

`swe.get_ayanamsa_ut` and `swe.get_ayanamsa_ex_ut` differ by **~13.9 arcseconds** at J2000.
The engine uses the former. This sits inside the ~40 arcsec spread already documented
against Drik Panchang, so it is tolerated rather than resolved. The `ayanamsha` dataset is
the intended way to settle it.
