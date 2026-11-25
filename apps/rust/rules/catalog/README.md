# `rules/catalog/` — authoring source, not runtime data

**Nothing in this directory is read at runtime.** Verified: zero references from any Python
file, and `rules/engine.py`'s own docstring says *"no DSL, no v4 catalog"*.

## What these files are

Transcriptions of a printed Nepali patro month grid for BS 2083 — one file per month or
month-pair, each row carrying `bs_day`, `tithi`, `paksha` and the festival ids that fall
there:

```jsonc
"lunar_baishakh": [
  {"bs_day": 2, "tithi": 12, "paksha": "krishna",
   "festivals": [{"id": "tokha-sapan-tirtha-snan", "name_ne": "टोखा सपन तीर्थस्नान"}, …]}
]
```

They are the **source material the rules in `../festival_rules_v3.json` were authored
from** — the record of which printed almanac day each rule was derived to match.

## Why they are kept

Authoring provenance. When a festival date is disputed, these show what the printed patro
said, which is the only way to tell "the rule is wrong" from "the rule is right and the
almanac uses a different convention".

## What they are not

- **Not authoritative at runtime.** `services/holiday_generator.py` loads exactly three
  files: `festival_rules_v3.json`, `public_holidays_v1.json`, `holiday_overrides_v1.json`.
- **Not an override layer.** Nothing merges them over the computed rules.
- **Not golden test data.** They are convention comparisons, not astronomical truth — see
  `tests/golden/data/README.md` for that distinction. They could legitimately seed an
  `external_publication` dataset, which is the one place a printed calendar belongs.

## If you edit them

Editing these changes nothing at runtime. To change a festival's date, edit
`../festival_rules_v3.json`, and expect the byte-identical harness
(`tests/test_byte_identical_payloads.py`, four festival scenarios) to catch it.
