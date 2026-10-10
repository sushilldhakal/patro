// Extracts the static, chart-independent bhava/graha reference content
// (drishti summaries, per-house theme text, bhavesh-phala, karakatva +
// saravali, Lal Kitab signals) from its TS source-of-truth files in this
// repo into one checked-in JSON for the nepali-holiday-api backend, so the
// content lives in exactly one place instead of being hand-duplicated into
// both dhakal-patro and dhakal-patro-mobile.
//
// Mirrors the existing extract-vastu-content.mjs pipeline (same "extract
// from the web client's TS content into a sibling-repo data/*.json" pattern).
//
// Run: TSX_TSCONFIG_PATH=tsconfig.app.json npx tsx scripts/extract-bhava-reference-content.mjs [outDir]
// Default outDir: ../nepali-holiday-api/data (sibling repo).
//
// Needs TSX_TSCONFIG_PATH=tsconfig.app.json because the root tsconfig.json
// is references-only (no "paths") — see tsconfig.app.json for the "@/*" alias.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { GRAHA_DRISHTI } from "../src/lib/kundali/graha-drishti.ts";
import { HOUSE_INFO, RASHI_LORD } from "../src/lib/kundali/bhava-detail.ts";
import { BHAVESH_PHALA } from "../src/lib/kundali/bhavesh-phala.ts";
import { GRAHA_KARAKATVA, GRAHA_HOUSE_SARAVALI, RATING_LABEL } from "../src/lib/kundali/graha-karakatva.ts";
import { LAL_KITAB_HOUSE, LAL_KITAB_FIXED_LORD } from "../src/lib/kundali/lal-kitab.ts";

const VERSION = "2026.09.10.1";

const payload = {
  version: VERSION,
  grahaDrishti: GRAHA_DRISHTI,
  houseInfo: HOUSE_INFO,
  rashiLord: RASHI_LORD,
  bhaveshPhala: BHAVESH_PHALA,
  grahaKarakatva: GRAHA_KARAKATVA,
  grahaHouseSaravali: GRAHA_HOUSE_SARAVALI,
  ratingLabel: RATING_LABEL,
  lalKitabHouse: LAL_KITAB_HOUSE,
  lalKitabFixedLord: LAL_KITAB_FIXED_LORD,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, process.argv[2] ?? "../../nepali-holiday-api/data");
mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "bhava_reference.json");
writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);
