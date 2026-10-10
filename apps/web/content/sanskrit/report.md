# Sanskrit Śloka Inventory — Discovery Report

**Project:** VedicPatro (`dhakal-patro` frontend + `nepali-holiday-api` backend)
**Generated:** 2026-07-16
**Purpose:** Canonical inventory of every Sanskrit śloka / mantra / verse in the
codebase, to serve as the master source for future Vāgdhenu TTS generation.
**Master file:** [`content/sanskrit/shlokas.yaml`](./shlokas.yaml)

> This pass only **discovers and organizes**. No Sanskrit was rewritten,
> translated, spell-corrected, re-worded, or de-duplicated. No application code
> was modified.

---

## Totals

| Metric | Count |
|---|---|
| **Unique ślokas / mantras catalogued** | **30** |
| Total in-code occurrences (incl. reuse) | 38 |
| Duplicate/reused occurrences (occurrence − unique) | 8 |
| Source files containing catalogued verses | 3 |
| Incomplete / abridged verses (contain `...`) | 7 |
| Entries flagged for manual review | 3 |

The gap between 30 unique and 38 occurrences comes entirely from four shared
`sait-rules-content.ts` verses reused across ceremonies (see **Duplicates**).

---

## Categories

Only categories that actually appear are listed. Each of the nine Navagraha bīja
mantras was filed under its **specific graha** category rather than the generic
`navagraha`, since per-graha categories exist in the required taxonomy.

| Category | Count | Notes |
|---|---|---|
| `surya` | 1 | Sūrya bīja mantra |
| `chandra` | 1 | Chandra bīja mantra |
| `mangala` | 1 | Maṅgala/Bhauma bīja mantra |
| `budha` | 1 | Budha bīja mantra |
| `guru` | 1 | Guru/Bṛhaspati bīja mantra |
| `shukra` | 1 | Śukra bīja mantra |
| `shani` | 1 | Śani bīja mantra |
| `rahu` | 1 | Rāhu bīja mantra |
| `ketu` | 1 | Ketu bīja mantra |
| `marriage` | 13 | Vivāha muhūrta verses + 3 Bhauma-doṣa (Māngali) verses + shared muhūrta verses |
| `bratabandha` | 5 | Upanayana-specific verses |
| `grihapravesh` | 3 | Gṛha-ārambha (house-construction start) verses — mapped to the nearest listed category |

Categories in the required taxonomy with **zero** matches in the codebase today:
`ganesha, shiva, vishnu, krishna, rama, devi, navagraha, panchanga, tithi,
nakshatra, yoga, karana, shraddha, festivals, ekadashi, sankranti, puja, aarati,
stotra, mantra, bhagavad_gita, upanishad, purana, miscellaneous`.
No full ślokas/stotras/aaratis for deities, festivals, ekādaśī, śrāddha, gītā,
upaniṣad or purāṇa currently exist in code.

---

## Source files (where verses live)

| File | Verses | What |
|---|---|---|
| `src/lib/shanti/navagraha-shanti.ts` | 9 | Navagraha bīja mantras (rendered by `ShantiVidhiPanel.tsx`) |
| `src/lib/avakahada-data.ts` | 3 | Bhauma-doṣa (Māngali) ślokas (`BHAUMA_DOSHA_SHLOKAS`) |
| `src/lib/sait-rules-content.ts` | 18 | Muhūrta/sāit rule ślokas for vivāha, bratabandha, gṛha-ārambha |

All three are frontend (`dhakal-patro/src/lib`). The backend
(`nepali-holiday-api`) contains **no** Sanskrit verses — only Nepali/Sanskrit
term labels and prose.

---

## Duplicate detection

No verse text was deleted. Four verses in `sait-rules-content.ts` are defined
once (or as a shared constant) and referenced by multiple ceremony rules. Because
every reuse is **within the same file**, each has a single `location`; the reuse
count is recorded in the YAML as `occurrences`.

| id | Reused for | occurrences |
|---|---|---|
| `mc_1_34_mahadosha` | vivāha (yoga), bratabandha (yoga + karaṇa), gṛha-ārambha (yoga + karaṇa) — via `MC_1_34_SHLOKA` constant | 5 |
| `graha_tatrastat_prak` | vivāha, bratabandha, gṛha-ārambha (graha bāla/vṛddha) | 3 |
| `latta_saptashta_bana` | vivāha, bratabandha (Latta doṣa) | 2 |
| `simhastha_magha_nakshatra` | vivāha, bratabandha (Simhastha Guru) | 2 |

No identical verse was found spread across **different files**, so no
multi-file `locations:` lists were required.

---

## Scan methodology

Searched both working trees (`dhakal-patro`, `nepali-holiday-api`), excluding
`node_modules`, `.git`, `dist`, `.venv`, `cache`, `__pycache__`, compiled `*.db`
and `package-lock.json`. Passes run:

1. **Devanāgarī block** `U+0900–U+097F` — surfaced ~120 files (mostly single-word
   UI labels: tithi/nakṣatra/month/city names — **not** verses).
2. **Danda `।` / double danda `॥`** — narrowed to files with verse-like text;
   danda alone is also a Nepali sentence separator, so prose files were
   read and excluded manually (e.g. `surya-siddhanta-history.ts`,
   `learn-articles.tsx`, `learn-topics.tsx`, `panchanga-element-descriptions.ts`,
   `sait_about.json` — all Nepali prose, no ślokas).
3. **Double danda `॥` only** — isolated true verse blocks →
   `avakahada-data.ts`, `sait-rules-content.ts`.
4. **Structured fields** `shloka:` / `mantra:` / `beejMantra:` — captured the
   sait-rules and shanti verses.
5. **Mantra markers `ॐ` and `नमः`** — both appear only in
   `navagraha-shanti.ts`, confirming the nine bīja mantras are the sole
   "…namaḥ" mantras in the tree.

`public/`, `docs/`, `@/`, festival catalog JSONs (`rules/catalog/*.json`) and all
backend Python were checked and contain **no** Sanskrit verses.

---

## Possible OCR / malformed-Unicode issues

None appear to be encoding corruption (no mojibake, no stray combining marks).
The following are **spelling/sandhi oddities** worth a scholar's eye — left
**unchanged** per instructions:

| Entry | Text fragment | Note |
|---|---|---|
| `bhauma_dosha_chandra_bhrigu` | `र्न मङ्गली` | A leading `र्` (reph) with no base consonant before `न` is irregular; likely intended `न मङ्गली`. Also compare the more common recension `चन्द्रे भृगौ द्वितीये…` vs. the in-code `चन्द्रभृगू द्वितीये…`. |
| `vivah_tithi_pakshrandhra` | `पक्षरन्ध्रसंज्ञिस्ततियो` | Compound sandhi looks off (possibly `…संज्ञास्तिथयो`). |
| `griha_adhikmasa_upakarma` | `मौञ्जीबंध…` | Uses anusvāra `बं` where `मौञ्जीबन्ध` (half-form) is more standard — cosmetic, not an encoding fault. |

---

## Incomplete / abridged verses (require completion before TTS)

Seven catalogued strings are deliberately abridged in-code with an ellipsis
(`...`) — they are UI citations, not full recitation text. Each must be sourced
to its **full** verse before audio generation:

| Entry | Citation | Abridged form |
|---|---|---|
| `vivah_month_mrig_magha` | Muhūrta Chintāmaṇi 6 (comm. 14) | `मृग-माघ-…-आषाढेषु... विवाहः शुभः` |
| `vivah_solar_month_mesha_vrisha` | Muhūrta Chintāmaṇi 6.14 | `मेषवृष…स्थिते सवितरि... विवाहः शुभः ॥` |
| `latta_saptashta_bana` | Muhūrta Chintāmaṇi 6.59 | `सप्ताष्टबाण…वेदेषु... लत्ताख्याः` |
| `vivah_kshaya_paksha` | Muhūrta Chintāmaṇi 1 (comm. 48) | `त्रयोदश दिने पक्षे … विनष्टमित्याहुराचार्याः समस्ताः ॥` |
| `bratabandha_season_magha` | Muhūrta Chintāmaṇi (Upanayana) | `माघफल्गुन…शोभनम्। उदीच्यगेऽर्के...` |
| `bratabandha_nakshatra_hastashvi` | Muhūrta Chintāmaṇi (Upanayana nakṣatra) | `हस्ताश्वि…त्रयं... मूलं चरं च खलु पुष्यपुनर्वसू च।` |
| `griha_nakshatra_mridu` | Muhūrta Chintāmaṇi — Vāstu 12.15 | `मृदुकु…तिष्यैः । गृहमारम्भणं शुभदं...` |

---

## Verses requiring manual review (summary for the scholar)

1. **Complete the 7 abridged verses** above from primary editions of *Muhūrta
   Chintāmaṇi* / *Dharma Sindhu* before TTS.
2. **Resolve the 3 sandhi/spelling oddities** (`र्न मङ्गली`, `पक्षरन्ध्रसंज्ञि…`,
   `मौञ्जीबंध`) — decide whether to keep the in-app text verbatim for the audio or
   record from a corrected critical text.
3. **Meters are unknown** for every entry (`meter:` left blank). Most muhūrta
   citations are Anuṣṭubh (śloka) or partial prose; confirm per verse.
4. **Category placement of shared muhūrta verses** (`mc_1_34_mahadosha`,
   `graha_tatrastat_prak`, `latta_saptashta_bana`, `simhastha_magha_nakshatra`)
   was assigned to `marriage` (first/primary use) but each spans multiple
   ceremonies — see each entry's `source:` field.
5. **`grihapravesh` mapping:** the three gṛha-ārambha (house-construction-start)
   verses were filed under `grihapravesh`, the nearest category in the required
   taxonomy; the app itself distinguishes *gṛha-ārambha* from *gṛha-praveśa*.

---

## Coverage note

This inventory reflects Sanskrit **verse/mantra** content only. The codebase
additionally contains extensive single-word Devanāgarī terminology (nakṣatra,
tithi, yoga, karaṇa, rāśi, month, deity and city names) across ~120 files; those
are labels, not recitable ślokas, and are intentionally excluded from this TTS
source. If future TTS scope expands to term pronunciation, those term tables
(`engine/vedic/constants.py`, `names_ne.py`, `src/lib/panchanga-*.ts`,
`wheel-locale.ts`, etc.) would be the next inventory pass.
