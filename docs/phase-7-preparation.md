# Phase 7 preparation — cultural rule layer

**Status: analysis only. No code moved, no imports changed, no outputs touched.**

Phase 7 execution is **blocked** on the golden datasets in `tests/golden/data/`
(`sankranti`, `tithi_boundaries`). This document is the allowed preparation.

> ## Headline: the extraction is largely already done
>
> The roadmap (W8) described cultural rules as "welded to computation" and stated that
> **"no Ekadashi Smarta/Vaishnava split exists anywhere."** Both claims are wrong, and the
> second is wrong in a way that changes what Phase 7 should build. Corrections in §1.

---

## 1. Corrections to roadmap W8

### 1.1 The rules are already declarative

`rules/festival_rules_v3.json` holds **578 declarative rules**. `rules/engine.py` is
**189 lines** of thin matchers over them — not embedded logic.

| Rule type | Count | Matcher |
|---|---|---|
| `lunar` | 338 | `compute_lunar_festival` — lunar month + tithi + paksha |
| `ad_fixed` | 143 | `compute_ad_fixed_festival` — Gregorian month/day |
| `bs_fixed` | 73 | `compute_bs_fixed_festival` — BS month/day |
| `solar` | 23 | `compute_solar_festival` — sankranti-anchored |
| `adhik_arambha` | 1 | `compute_adhik_arambha` |

| Category | Count |
|---|---|
| hindu | 249 |
| international | 137 |
| cultural | 90 |
| newari | 51 |
| national | 48 |
| buddhist / christian | 3 |

Rule fields already carry the cultural knobs: `lunar_month`, `tithi`, `paksha`,
`adhik_policy`, `solar_day`, `importance`, `category`.

**Implication:** "extract festival rules into explicit rule modules" is ~95% complete. Phase
7 should not re-do it.

### 1.2 The Smarta/Vaishnava split *does* exist — as data

My W8 claim came from grepping `.py` files. The split is in the JSON:

| Rule | Month | Tithi | Paksha |
|---|---|---|---|
| `yogini-ekadashi-smarta` | Ashadh | **11** | krishna |
| `yogini-ekadashi-vaishnava` | Ashadh | **12** | krishna |
| `putrada-ekadashi-smarta` | Poush | **11** | shukla |
| `putrada-ekadashi-vaishnava` | Poush | **12** | shukla |

`putrada-ekadashi-vaishnava` even carries the note *"Usually the day after the Smarta
vrata; collapses when both land together"* — the domain distinction is understood and
encoded.

**But it is encoded by *enumeration*, not *parameterisation*.** Both variants are emitted
simultaneously; there is no tradition selector, so a Vaishnava user sees Smarta dates and
vice versa. Confirmed: no `tradition` parameter exists on any API surface.

**This is the real Phase 7 gap** — not extraction, but *parameterisation*.

### 1.3 Two knobs exist and are never varied

| Knob | Read at | Values across 578 rules |
|---|---|---|
| `date_selection` | `rules/engine.py:35` — `rule.get("date_selection", "udaya")` | **`(default)` for all 578** — no rule ever sets it |
| `adhik_policy` | `rules/engine.py:16` | `"skip"` for all 338 lunar rules, absent otherwise — effectively a constant |

Both are parameters in name only. They are either the seam Phase 7 should use, or dead
weight to delete. Deciding needs the golden data (§4).

---

## 2. Ownership map

| Module | LOC | Layer | Verdict |
|---|---|---|---|
| `rules/festival_rules_v3.json` | 6,602 | **cultural data** | ✅ correct |
| `rules/holiday_overrides_v1.json` | 964 | **cultural data** | ✅ correct |
| `rules/catalog/*.json` (8 files) | — | cultural data (per-month BS 2083) | ⚠️ overlaps `festival_rules_v3` — relationship undocumented |
| `rules/engine.py` | 189 | **rule matcher** | ✅ correct — thin, declarative-driven |
| `services/holiday_generator.py` | 851 | orchestration + cache | ⚠️ mixes rule application with caching and dedup |
| `engine/vedic/lunar_month.py` | 730 | **calendar math** | ✅ astronomy-adjacent, correct |
| `engine/vedic/sankranti.py` | 331 | **calendar math** | ✅ correct |
| `engine/vedic/adhik_maas.py` / `kshaya_maas.py` | 161 | **calendar math** | ✅ correct |
| `engine/vedic/sait_rules.py` | 614 | **cultural rules in CODE** | ❌ **the genuinely un-extracted module** |

### `sait_rules.py` — the real target

36 module-level constants and ~20 predicate functions encoding muhurta convention directly
in Python:

```
JUPITER_COMBUST_ORB = 11.0      VIVAH_SUN_RASHIS = frozenset({1,2,3,8,10,11})
VENUS_COMBUST_ORB = 10.0        SIMHASTHA_GURU_RASHI = 5
MERCURY_COMBUST_ORB = 14.0      VYATIPATA_YOGA = 17 / VAIDHRITI_YOGA = 27
```

These are *cultural* thresholds (which orb counts as combust for marriage timing, which
rashis permit vivah), not astronomy. Its own docstring says the rules are "conservative and
traditionally defensible" — an authored interpretation.

**However:** these constants are consumed by predicates that also do astronomy, and there is
no golden coverage for sait at all. Extraction here is the highest-risk part of Phase 7 and
should come last.

---

## 3. Dependency map

```
api/panchanga.py, api/patro.py
        │
        ▼
services/holiday_generator.py ──── cache (disk + blob, keyed by location+year)
        │
        ▼
rules/engine.py ─────────────────── rules/festival_rules_v3.json   (578 rules)
        │                           rules/holiday_overrides_v1.json
        │                           rules/public_holidays_v1.json
        ├──► engine/vedic/lunar_month.find_festival_in_lunar_month
        │         └──► tithi / udaya  ──► engine/astronomy/panchanga.py
        ├──► engine/vedic/sankranti.find_sankranti
        │         └──► sun longitude ──► engine/astronomy/engine.py
        └──► engine/vedic/bikram_sambat.bs_to_gregorian

engine/vedic/sait_rules.py ──► sait_generator ──► sait_db_cache   (separate stack)
```

Only **three** modules import `rules.engine`: `services/holiday_generator.py` and two test
files. The blast radius of changing the matcher is small; the blast radius of changing rule
*data* is every cached year payload.

---

## 4. Extraction boundaries

Four candidates, ranked by (value ÷ risk):

| # | Boundary | Value | Risk | Gated on |
|---|---|---|---|---|
| **B1** | **Tradition selector.** Turn enumerated `-smarta`/`-vaishnava` rules into a `tradition` field + a request-level selector. | **High** — the actual missing capability | Medium — changes which festivals a response contains | `sankranti` + `tithi_boundaries` goldens |
| **B2** | Resolve `date_selection` / `adhik_policy`: use them or delete them. | Medium — removes two fake parameters | Low if deleted, medium if activated | `tithi_boundaries` (the udaya rule is what `date_selection` selects) |
| **B3** | Split `holiday_generator.py` — rule application vs caching/dedup. | Medium — clarifies ownership | Low — pure structure, harness-covered | nothing; safe once Phase 7 opens |
| **B4** | Extract `sait_rules.py` constants into a declarative muhurta rule set. | High long-term | **High** — 614 lines, no golden coverage, orb thresholds change real answers | A `sait` golden dataset that does not yet exist |

### Recommended order: **B3 → B2 → B1 → B4**

B3 first because it is pure structure and already protected by the extended byte-identical
harness. B4 last, and only after a sait golden dataset exists — extracting authored muhurta
thresholds with no external reference is exactly the "verify against the code being
replaced" trap.

---

## 5. Migration plan (draft — do not execute)

**Pre-flight (blocking):** `sankranti` and `tithi_boundaries` populated from an
authoritative Nepali patro. Without them, an extraction can only prove "unchanged", never
"correct".

| Commit | Change | Protection |
|---|---|---|
| 1 | Document the `rules/catalog/*.json` ↔ `festival_rules_v3.json` relationship (analysis only) | — |
| 2 | **B3** — separate rule application from caching in `holiday_generator` | harness (4 festival scenarios) + full suite |
| 3 | **B2** — decide `date_selection` / `adhik_policy`: activate or delete, with the golden data to justify it | `tithi_boundaries` golden |
| 4 | **B1a** — add a `tradition` field to the 4 tradition-specific rules; **no behaviour change** (both still emitted) | harness |
| 5 | **B1b** — add an optional `tradition` request parameter, defaulting to today's "emit both". **Additive API change → needs approval** | golden + harness |
| 6 | **B4** — sait extraction, only if a sait golden dataset exists | sait golden |

Every commit: byte-identical harness + golden suite + full suite. Any change to which
festivals a day carries is a payload change and needs a `PANCHANGA_PAYLOAD_VERSION` bump.

---

## 6. Open questions

1. **`rules/catalog/*.json`** — eight per-month BS 2083 files that overlap
   `festival_rules_v3.json`. Which is authoritative? Are the catalog files an import
   staging area, an override layer, or dead? Not determinable from the code; needs the
   maintainer.
2. **Should `-smarta`/`-vaishnava` remain separate rule ids** once a `tradition` field
   exists, or collapse into one rule with per-tradition tithi? Collapsing is cleaner but
   changes rule ids, which appear in cached payloads.
3. **Is "emit both traditions" the intended default?** It is what happens today. If Nepali
   practice follows one, the default should be that one, and this is a product decision.

---

## 7. What Phase 7 is actually for

Not "extract cultural rules" — that is done. The remaining work is:

- **parameterise** what is currently enumerated (B1),
- **resolve** two knobs that pretend to be parameters (B2),
- **separate** rule application from caching (B3),
- **extract** the one module that genuinely embeds cultural constants in code (B4).

That is a materially smaller and better-targeted phase than the roadmap describes, and it
is blocked on correctness references rather than on effort.
