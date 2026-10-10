/**
 * API response types and pure helpers shared by the website and the mobile app.
 * Moved here from the two apps' lib/api.ts, where they had been kept as
 * identical hand-copied twins. Each app's api.ts re-exports them.
 */

import type { Era, InstantQuery } from "@vedic-patro/domain/era";
import type { VastuDirectionId } from "@vedic-patro/domain/vastu";
import type { PlannedSpace, SpaceAssignment } from "@vedic-patro/domain/vastu-plan";

export const patroCapabilitiesKey = ["meta", "capabilities"] as const;
// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationParams {
  city_id?: number;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}

export interface JanmaRashi {
  janma_nakshatra: number;
  janma_rashi: number;
}

/** One end of a running Vimshottari period (Mahadasha or Antardasha). */
export interface RashifalDashaPeriod {
  lord: string;
  lord_ne: string;
  lord_en: string;
  start: string;
  end: string;
}

export interface RashifalDasha {
  score: number;
  mahadasha: RashifalDashaPeriod;
  antardasha: RashifalDashaPeriod;
}

/**
 * A reading cast on one person's own birth chart — Lagna (not a Moon-sign
 * stand-in), natal Ashtakavarga, and the running Vimshottari dasha — rather
 * than the general engine's twelve-sign, Moon-sign-only sweep.
 */
export interface RashifalPersonal {
  period: RashifalPeriod;
  anchor?: string;
  date_ad?: string;
  range_start_ad?: string;
  range_end_ad?: string;
  bs_year?: number;
  bs_month?: number;
  bs_month_name_ne?: string;
  bs_month_name_en?: string;
  days_in_period?: number;
  lagna_sign: number;
  lagna_sign_ne: string;
  lagna_sign_en: string;
  moon_sign: number;
  moon_sign_ne: string;
  moon_sign_en: string;
  sun_sign: number;
  sun_sign_ne: string;
  sun_sign_en: string;
  lucky_lord: string;
  lucky_lord_ne: string;
  lucky_lord_en: string;
  lucky_color_ne: string;
  lucky_color_en: string;
  lucky_number: number;
  lucky_number_ne: string;
  lucky_number_en: string;
  lucky_direction_ne: string;
  lucky_direction_en: string;
  score: number;
  percent: number;
  stars: number;
  tone: NavataraTone;
  dasha: RashifalDasha;
  rashi_lord: RashifalLordBlock;
  components: RashifalComponent[];
  domains: RashifalDomain[];
  gochar: RashifalGocharRow[];
  prediction_ne: string;
  prediction_en: string;
}

/** Civil-day (midnight→midnight) timeline — minutes-from-midnight positions. */
export interface CivilTimelineSeg {
  name_ne?: string | null;
  name?: string | null;
  end_min: number;
}

export interface CivilTimelineBand {
  name_ne?: string | null;
  bad?: boolean;
  start_min: number;
  end_min: number;
}

export interface CivilTimelineHora {
  planet_ne?: string | null;
  planet_en?: string | null;
  bad?: boolean;
  start_min: number;
  end_min: number;
}

export interface CivilTimelineLagna {
  name_ne?: string | null;
  name?: string | null;
  start_min: number;
  end_min: number;
}

// ─── Tropical seasons ─────────────────────────────────────────────────────────

export interface TropicalSeasonBoundary {
  slot: number;
  angle: number;
  start_instant_utc: string;
  start_ad: string;
  start_bs: string;
  is_current: boolean;
}

// ─── Vimshottari dasha ───────────────────────────────────────────────────────

export interface VimshottariPeriod {
  lord: string;
  lord_ne: string;
  start: string;
  end: string;
  years: number;
}

export interface VimshottariResponse {
  ayanamsha: string;
  moon_longitude: number;
  nakshatra_index: number;
  mahadasha_lord: string;
  mahadasha_lord_ne: string;
  balance_years: number;
  balance_label: string;
  sequence: VimshottariPeriod[];
  query_instant?: string;
}

// ─── Gochar (planetary transits) ─────────────────────────────────────────────

export interface GocharNextEntry {
  to_rashi?: string;
  to_rashi_ne?: string;
  to_nakshatra?: string;
  to_nakshatra_ne?: string;
  to_pada?: number;
  to_pada_ne?: string;
  label_ne?: string;
  entry_time_local: string;
  entry_time_local_short?: string;
  entry_time_utc?: string;
}

/**
 * One of the named वैदिक तारा — अगस्त्य, अभिजित्, सप्तर्षि and the rest —
 * positioned server-side from the Swiss Ephemeris fixed-star catalogue
 * (sefstars.txt). `lon`/`lat` are already sidereal ecliptic degrees for the
 * date this response was computed for; the client plots them as-is; it does
 * not re-derive or precess them.
 */
export interface VedicStarPosition {
  ne: string;
  en: string;
  /** Bayer designation and catalogue number, for a hint line. */
  designation: string;
  /** Sidereal ecliptic longitude, degrees. */
  lon: number;
  /** Ecliptic latitude, degrees. */
  lat: number;
  /** Apparent visual magnitude. */
  mag: number;
}

/** One yearly वक्री/मार्गी motion-station event. */
export interface GrahaVakriEvent {
  graha: string;
  graha_ne: string;
  motion?: string;
  is_retrograde?: boolean;
  label_ne?: string;
  entry_time_local?: string;
  entry_time_local_short?: string;
  entry_jd?: number;
  /** Era-rendered civil day label from {@link entry_jd} (EraMiddleware). */
  entry_jd_date?: string;
}

// ─── Year sun times (सूर्यक्रान्ति) ───────────────────────────────────────────
// Slim per-day payload (sunrise/sunset/ayana only) — ~4 KB for a whole year
// and served from the API's year cache in milliseconds.

export interface SunYearDay {
  day: number;
  date_ad: string;
  sunrise?: string;
  sunset?: string;
  aayan?: string;
  aayan_ne?: string;
  ayana_mark?: "उ" | "द";
}

export interface SunYearMonth {
  month_bs: number;
  month_name: string;
  month_name_ne: string;
  month_start_ad: string;
  month_length: number;
  calendar: SunYearDay[];
}

// ─── Sait (auspicious dates) ──────────────────────────────────────────────────

export interface SaitMonthEntry {
  month: number;
  month_name_ne: string;
  days: number[];
}

export interface SaitResponse {
  bs_year: number;
  category: string;
  category_label_ne: string;
  months: SaitMonthEntry[];
}

export type BratabandhaNakshatraMode = "classical" | "nepali" | "liberal";
/** Native (profile-based) verdict overlaid on the general listing. */
export type SaitSuitability = "favourable" | "neutral" | "avoid";
export type SaitShuddhiTone = "good" | "shanti" | "avoid";
/** One planet's Graha Śuddhi: its house from the native's janma rāśi. */
export interface SaitShuddhiPlanet {
  planet: "sun" | "moon" | "guru" | "shukra";
  house: number;
  tone: SaitShuddhiTone;
  rashi_ne: string;
  rashi_en: string;
}

/** Graha Śuddhi over the ceremony's relevant planets (bratabandha, griha-aarambha). */
export interface SaitShuddhi {
  tone: SaitShuddhiTone;
  planets: SaitShuddhiPlanet[];
}

/** Kumbha Chakra limb for a gṛha-praveśa entry day (Sun→day nakṣatra count). */
export interface SaitKumbha {
  count: number;
  sun_nakshatra: number;
  zone: string;
  zone_ne: string;
  zone_en: string;
  effect_ne: string;
  effect_en: string;
  tone: SaitShuddhiTone;
}

/** Agni-mukha — the graha that receives the oblation (agni-jurne). */
export interface SaitAgniMukha {
  count: number;
  sun_nakshatra: number;
  planet: string;
  planet_ne: string;
  planet_en: string;
  benefic: boolean;
  tone: SaitShuddhiTone;
}

/** Annaprāśana age-month check (needs the child's birth date + gender). */
export interface SaitAnnaMonth {
  ordinal_month: number;
  gender: "male" | "female";
  matches: boolean;
  tone: SaitShuddhiTone;
}

export interface SaitPersonalizeDay {
  bs_month: number;
  bs_day: number;
  suitability: SaitSuitability;
  tara_num: number;
  tara_tone: string;
  tara_ne: string;
  chandra_num: number;
  chandra_tone: string;
  moon_house: number;
  /** Graha Śuddhi (bratabandha, griha-aarambha); null for other ceremonies. */
  shuddhi?: SaitShuddhi | null;
  /** Kumbha Chakra (griha-pravesh); null for other ceremonies. */
  kumbha?: SaitKumbha | null;
  /** Agni-mukha (agni-jurne); null for other ceremonies. */
  agni_mukha?: SaitAgniMukha | null;
  /** Annaprāśana age-month (annaprasan, when gender+birth known); else null. */
  anna_month?: SaitAnnaMonth | null;
  transit_nakshatra_ne: string;
  transit_nakshatra_en: string;
  transit_rashi_ne: string;
  transit_rashi_en: string;
}

export interface SaitPersonalizeResponse {
  bs_year: number;
  category: string;
  janma: { nakshatra: number; rashi: number };
  counts: { favourable: number; neutral: number; avoid: number };
  days: SaitPersonalizeDay[];
}

/** Auspicious days for EVERY ceremony type in one BS month (home-page list). The
 * server computes only that month. `categories` maps category id → BS days. */
export interface SaitMonthAllResponse {
  bs_year: number;
  bs_month: number;
  month_name_ne: string;
  categories: Record<string, number[]>;
}

// ─── Panchanga elements (per-element addressable pages) ───────────────────────

export type ElementKind = "span" | "table";
/** A boundary instant — machine ISO plus pre-formatted display strings. */
export interface ElementStamp {
  iso: string;
  weekday: string;
  date_label: string;
  time_label: string;
  display: string;
}

export interface ElementSpan {
  number: number;
  name: string;
  name_ne: string;
  begins: ElementStamp;
  ends: ElementStamp;
  paksha?: string;
  progress?: number;
}

export interface ElementSpansResponse {
  element: string;
  kind: "span";
  label_ne: string;
  label_en: string;
  timezone: string;
  window: { start: string; end: string };
  spans: ElementSpan[];
}

// ─── Special months (adhik / kshaya maas) ─────────────────────────────────────

export interface SpecialMonthsResponse {
  bs_year: number;
  adhik_maas?: {
    has_adhik_maas?: boolean;
    month_name?: string;
    full_name_en?: string;
    full_name_ne?: string;
    start_date?: string;
    end_date?: string;
    purnima_date?: string;
    note?: string;
  };
  kshaya_maas?: {
    is_kshaya?: boolean;
    month_name?: string;
  };
}

export const specialMonthsKeys = {
  year: (year: number) => ["special-months", year] as const,
};

// ─── Shadbala ─────────────────────────────────────────────────────────────────

export type ShadbalaStatus =
  | "Exceptional"
  | "Strong"
  | "Adequate"
  | "Borderline"
  | "Weak";
export interface ShadbalaBreakdown {
  sthana: number;
  dig: number;
  kala: number;
  cheshta: number;
  naisargika: number;
  drik: number;
}

export interface ShadbalaSubBalas {
  sthana: Record<string, number>;
  kala: Record<string, number>;
}

export interface ShadbalaSummaryRef {
  key: string;
  name: string;
  name_ne: string;
  status: ShadbalaStatus;
  ratio: number;
}

// ─── Kundali detail — full server-computed jyotish payload ───────────────────
// All astrology math (vargas, ashtakavarga, bhava bala, yuddha, yogas,
// avakahada, dasha tree, birth kalas) is computed by the API; the client
// only renders these blocks.

export interface DmsParts {
  rashiNum: number;
  deg: number;
  min: number;
  sec: number;
}

export type GrahaRelation = "self" | "friend" | "enemy" | "neutral";
export type GrahaDignity =
  | "exalted"
  | "moolatrikona"
  | "own"
  | "friend_house"
  | "neutral_house"
  | "enemy_house"
  | "debilitated";
export interface VargaChartEntry {
  key: string;
  vargaRashi: number;
  dms: DmsParts;
  nakshatraIndex: number;
  pada: number;
  nakshatraLord: string;
  subLord: string;
  ownerKey: string;
  relation: GrahaRelation | null;
  dignity: GrahaDignity | null;
  retrograde?: boolean;
}

export interface VargaCharts {
  divisions: number[];
  points: Record<string, { longitude: number; retrograde?: boolean }>;
  /** Keyed by division as a string ("1", "9", …). */
  entries: Record<string, VargaChartEntry[]>;
  ownedRashis: Record<string, number[]>;
}

export interface AshtakavargaSignRow {
  rashi: number;
  rashiEn: string;
  rashiNe: string;
  bindus: Record<string, number>;
  sarvashtaka: number;
}

export interface ShodhyaPindaRow {
  target: string;
  rashiPinda: number;
  grahaPinda: number;
  shodhyaPinda: number;
}

export interface AshtakavargaData {
  raw: AshtakavargaSignRow[];
  reduced: AshtakavargaSignRow[];
  shodhyaPinda: ShodhyaPindaRow[];
  signs: Record<string, number>;
}

export interface BhavaBalaHouse {
  house: number;
  madhyaLongitude: number;
  lordKey: string;
  lordName: string;
  bhavadhipati: number;
  disha: number;
  drishti: number;
  totalVirupas: number;
  totalPinda: number;
  rupas: number;
  percent: number;
}

export interface BhavaBalaData {
  houses: BhavaBalaHouse[];
  strongest: BhavaBalaHouse;
  weakest: BhavaBalaHouse;
  /** Mean house-strength % across houses ruled by each graha. */
  rulershipPercent: Record<string, number>;
  referenceVirupas: number;
}

export interface YuddhaWar {
  winner: string;
  loser: string;
  yuddhaVirupas: number;
  separationDeg: number;
}

export interface YuddhaData {
  wars: YuddhaWar[];
  byPlanet: Record<string, number>;
}

export interface KundaliYoga {
  key: string;
  nameEn: string;
  nameNe: string;
  nature: "auspicious" | "inauspicious" | "mixed" | "caution";
  present: boolean;
  descEn: string;
  descNe: string;
}

/** One row of the static B. V. Raman combinations catalog. */
export interface YogaReferenceEntry {
  yogaId: string;
  name: string;
  nameNe: string;
  definition: string;
  definitionNe: string;
  result: string;
  resultNe: string;
  source: string;
  part: string;
}

export interface YogaReferenceResponse {
  source: string;
  part: string;
  count: number;
  combinations: YogaReferenceEntry[];
}

// ── Bhava/graha static reference content (drishti, karakatva, Lal Kitab) ──
// Chart-independent — same for every kundali. Lives server-side as the
// single source of truth (see nepali-holiday-api's engine/vedic/
// bhava_reference.py); this app used to duplicate it as local .ts files.

export interface BhavaReferenceGrahaDrishti {
  isMalefic: boolean;
  /** राहु/केतु — shadow points rather than physical bodies. */
  isChaya: boolean;
  summaryNe: string;
  summaryEn: string;
}

export interface BhavaReferenceHouseInfo {
  themeNe: string;
  themeEn: string;
  summaryNe: string;
  summaryEn: string;
  medicalNe: string;
  medicalEn: string;
  beneficEffectNe: string;
  beneficEffectEn: string;
  maleficEffectNe: string;
  maleficEffectEn: string;
}

/** Full-length per-house reference (sign, lord, natural significator, a
 * classical description paragraph, a cited shloka, and separate benefic vs
 * malefic effect notes) — richer than `houseInfo`'s short summary, sourced
 * from the user's own house-by-house notes rather than a generic blurb. */
export interface BhavaReferenceHouseDetail {
  titlesNe: string;
  titlesEn: string;
  signNe: string;
  signEn: string;
  lordNe: string;
  lordEn: string;
  naturalNe: string;
  naturalEn: string;
  descriptionNe: string;
  descriptionEn: string;
  shloka: string;
  shlokaSourceNe: string;
  shlokaSourceEn: string;
  beneficGrahasNe: string;
  beneficGrahasEn: string;
  beneficEffectNe: string;
  beneficEffectEn: string;
  maleficGrahasNe: string;
  maleficGrahasEn: string;
  maleficEffectNe: string;
  maleficEffectEn: string;
}

export interface BhavaReferenceGrahaKarakatva {
  shloka: string;
  shlokaSourceNe: string;
  shlokaSourceEn: string;
  subjectsNe: string;
  subjectsEn: string;
  significanceNe: string;
  significanceEn: string;
}

export type BhavaReferenceRating = "uttam" | "shubh" | "mishrit" | "kamjor";
/** One classical citation (a single grantha's shloka only, no meaning of
 * its own) for a graha-in-house placement — a house lists every citation
 * it has (सारावली, फलदीपिका, होरासार, जातक पारिजात, ...) together, then a
 * single combined reading (`BhavaReferenceHouseSaravali.summaryNe`/
 * `summaryEn`) once at the end — always this shape, never a meaning per
 * citation, so every graha's table reads the same way. */
export interface BhavaReferenceHouseSaravaliEntry {
  shloka: string;
  shlokaSourceNe: string;
  shlokaSourceEn: string;
}

export interface BhavaReferenceHouseSaravali {
  house: number;
  /** Only present on entries sourced from the newer full 12-house table. */
  houseTheme?: string;
  rating: BhavaReferenceRating;
  /** Every classical citation for this graha-in-house placement, listed
   * together — `rating`/`houseTheme` describe the placement itself, not
   * any one citation of it, so they live here rather than per-entry. */
  entries: BhavaReferenceHouseSaravaliEntry[];
  /** The single combined अर्थ+व्याख्या reading for this house, covering
   * every citation in `entries` together — rendered once, after all of
   * them, never split per citation. */
  summaryNe: string;
  summaryEn: string;
}

/** 2- or 3-graha yuti (conjunction) result — shown when a house has that many occupants. */
export interface BhavaReferenceYuti {
  grahas: string[];
  yogaNameNe?: string | null;
  yogaNameEn?: string | null;
  textNe: string;
  textEn: string;
}

export interface BhavaReferenceNaadiSutra {
  number: number;
  part: string;
  titleNe: string;
  titleEn: string;
  categoryNe: string;
  categoryEn: string;
  bodyNe: string;
  bodyEn: string;
  /** Every graha this sutra mentions — a house's occupant(s) match against this. */
  grahas: string[];
}

export interface BhavaReferenceBhaveshEntry extends BilingualValue {
  /** Present when this pair is sourced from the actual BPHS ch. 13 text;
   * null for the handful of pairs that chapter doesn't cover. */
  shloka: string | null;
}

/** A second, separately-cited house-lord-placement source (BPHS /
 * Phaladeepika, collected across several rounds) — shown alongside, not
 * instead of, `bhaveshPhala`. `ne`/`en` hold the analysis text and
 * `translationNe`/`translationEn` the shloka's literal translation — both
 * pairs hand-translated to real Nepali (source was 100% English).
 * `shloka`/`iast` are null for the 38 of 144 pairs this source only has a
 * short prose summary for (no verse), and those pairs' `translationNe`/
 * `translationEn` are empty strings rather than translated. */
export interface BhavaReferenceBhaveshSupplementaryEntry {
  shloka: string | null;
  iast: string | null;
  ne: string;
  en: string;
  translationNe: string;
  translationEn: string;
}

/** A 2- or 3-graha Lal Kitab conjunction effect — same shape as
 * `BhavaReferenceYuti` minus the (unused here) yoga name. */
export interface BhavaReferenceLalKitabYuti {
  grahas: string[];
  textNe: string;
  textEn: string;
}

/** Per-graha Phaladeepika (ch. 2) karakatva — real cited verses, distinct
 * from `grahaKarakatva`'s Uttara Kalamrita source. Sparse (`shloka: ""`,
 * `translation*: ""`) for rahu/ketu, which the source only gives a physical
 * nature for. */
export interface BhavaReferencePhaladeepikaKarakatva {
  shloka: string;
  shlokaSourceNe: string;
  shlokaSourceEn: string;
  karakatvaLineNe: string;
  karakatvaLineEn: string;
  translationNe: string;
  translationEn: string;
  natureNe: string;
  natureEn: string;
}

/** The general "dusstha vs susstha" planetary-strength principle (combust /
 * debilitated / enemy-sign / 6-8-12 house => can't give its full result) —
 * chart-wide, not keyed by house or graha. */
export interface BhavaReferenceDusthaSusthaRule extends BilingualValue {
  shloka: string;
  shlokaSourceNe: string;
  shlokaSourceEn: string;
}

/** Lal Kitab foundational classification for one rashi (1-12) — gati
 * (motion), dwar/garbha (door/womb position), tattva (element), guna
 * (nature), disha (direction). Chart-independent. */
export interface BhavaReferenceRashiClassification {
  rashiNe: string;
  gatiNe: string;
  dwarNe: string;
  tattvaNe: string;
  gunaNe: string;
  dishaNe: string;
}

/** Classical exaltation/debilitation sign + degree for one graha (7:
 * sun-saturn; rahu/ketu not classically assigned one in this source). */
export interface BhavaReferenceExaltationDebilitation {
  exaltRashiNe: string;
  exaltDegree: string;
  debilRashiNe: string;
  debilDegree: string;
}

/** Naisargika (natural, chart-independent) friendship — graha keys in
 * each bucket. Defined only for the 7 classical grahas. */
export interface BhavaReferenceNaturalFriendship {
  friends: string[];
  neutral: string[];
  enemies: string[];
}

export interface BhavaReferenceGrahaAnimalBird {
  animalNe: string;
  birdNe: string;
}

/** null fields where the source gives no value (rahu has no taste; ketu
 * has neither metal nor taste). */
export interface BhavaReferenceGrahaGrainMetalTaste {
  grainNe: string | null;
  metalNe: string | null;
  tasteNe: string | null;
}

export interface BhavaReferenceGrahaRemedy {
  deityNe: string;
  regionNe: string;
}

export interface BhavaReferencePayload {
  version: string;
  grahaDrishti: Record<string, BhavaReferenceGrahaDrishti>;
  houseInfo: Record<string, BhavaReferenceHouseInfo>;
  /** Classical Sanskrit house names (तनु, धन, सहज, ... व्यय) — Phaladeepika ch. 2. */
  houseClassicalName: Record<string, BilingualValue>;
  /** Full-length house-by-house notes (sign, lord, natural significator,
   * description, shloka, benefic/malefic effects) — one entry per house (1-12). */
  houseDetail: Record<string, BhavaReferenceHouseDetail>;
  /** Lal Kitab's foundational reference tables — mostly chart-independent
   * classification, not house/chart-specific, so only `grahaManifestationAge`
   * and `houseBodyPart` are currently surfaced in the per-house dialog; the
   * rest await a future general classical-reference page. */
  rashiClassification: Record<string, BhavaReferenceRashiClassification>;
  grahaExaltationDebilitation: Record<string, BhavaReferenceExaltationDebilitation>;
  grahaNaturalFriendship: Record<string, BhavaReferenceNaturalFriendship>;
  /** Kalapurusha body part per house (1-12). */
  houseBodyPart: Record<string, BilingualValue>;
  grahaAnimalBird: Record<string, BhavaReferenceGrahaAnimalBird>;
  grahaGrainMetalTaste: Record<string, BhavaReferenceGrahaGrainMetalTaste>;
  grahaRemedy: Record<string, BhavaReferenceGrahaRemedy>;
  /** Lal Kitab's age (in years) at which a graha's effect fully activates. */
  grahaManifestationAge: Record<string, number>;
  lalKitabNapunsakNote: BilingualValue;
  lalKitabTablesSource: string;
  rashiLord: Record<string, string>;
  bhaveshPhala: Record<string, Record<string, BhavaReferenceBhaveshEntry>>;
  bhaveshPhalaSource: string;
  bhaveshPhalaSupplementary: Record<string, Record<string, BhavaReferenceBhaveshSupplementaryEntry>>;
  bhaveshPhalaSupplementarySource: string;
  grahaKarakatva: Record<string, BhavaReferenceGrahaKarakatva>;
  grahaHouseSaravali: Record<string, Record<string, BhavaReferenceHouseSaravali>>;
  ratingLabel: Record<BhavaReferenceRating, BilingualValue>;
  lalKitabHouse: Record<string, Record<string, BilingualValue>>;
  lalKitabFixedLord: Record<string, string[]>;
  /** One practical "safe behaviour" tip per graha, from the end of each
   * Lal Kitab house-part (भाग २–१०). */
  lalKitabSafetyTips: Record<string, BilingualValue>;
  /** 2- and 3-graha Lal Kitab conjunction effects (भाग ११). */
  lalKitabYuti: BhavaReferenceLalKitabYuti[];
  /** Chart-independent Lal Kitab ground rules (भाग १) — not house-specific. */
  lalKitabBasics: BilingualValue[];
  /** भाग १२: traditional debt-view (ऋण-विचार) rules. */
  lalKitabRinVichar: BilingualValue[];
  /** भाग १३: annual chart (वर्षफल) rules. */
  lalKitabVarshaphal: BilingualValue[];
  /** भाग १४: traditional health signals — not a diagnosis. */
  lalKitabHealthSignals: BilingualValue[];
  /** भाग १५: wealth, prosperity and vastu guidance. */
  lalKitabWealthVastu: BilingualValue[];
  /** Lal Kitab's own Sustha/Dustha (well-placed/ill-placed) logic — Pakka
   * Ghar + exaltation/debilitation based, distinct from (never merged
   * with) Phaladeepika's `grahaDusthaSusthaRule`. Chart-independent. */
  lalKitabSusthaDustha: BilingualValue[];
  /** 10 general closing aphorisms from the same submission. */
  lalKitabMahaSutraSummary: BilingualValue[];
  /** Citation for the revised remedy table + Sustha/Dustha rules. */
  lalKitabRevisionSource: string;
  /** Keyed by grahas sorted + joined with "+", e.g. "jupiter+venus". */
  grahaYuti2: Record<string, BhavaReferenceYuti>;
  grahaYuti3: Record<string, BhavaReferenceYuti>;
  grahaYutiGeneralRule: BilingualValue;
  /** Phaladeepika ch. 2 karakatva, keyed by graha (9). */
  phaladeepikaKarakatva: Record<string, BhavaReferencePhaladeepikaKarakatva>;
  /** Phaladeepika-sourced traditional house-placement summary, per graha (7:
   * sun-saturn only) x house (12) — the source has no rahu/ketu entries. */
  phaladeepikaHouseResults: Record<string, Record<string, BilingualValue>>;
  grahaDusthaSusthaRule: BhavaReferenceDusthaSusthaRule;
  phaladeepikaSource: string;
  naadiSutras: BhavaReferenceNaadiSutra[];
  naadiSutraSource: string;
}

export const bhavaReferenceKeys = {
  all: ["bhava-reference"] as const,
};

export interface BilingualValue {
  ne: string;
  en: string;
}

export interface JanmaAvakahadaData {
  nakshatra: BilingualValue;
  nakshatraIndex: number;
  pada: number;
  rashiPaya: BilingualValue;
  nakshatraPaya: BilingualValue;
  tattva: BilingualValue;
  yunja: BilingualValue;
  vashya: BilingualValue;
  tara: BilingualValue;
  gana: BilingualValue;
  akshara: BilingualValue;
  nadi: BilingualValue;
  asana: BilingualValue;
  yoni: BilingualValue;
  jati: BilingualValue;
}

export interface GhadiPalaVipala {
  ghadi: number;
  pala: number;
  vipala: number;
}

export interface KundaliBirthMeta {
  birthClock: string;
  isDayBirth: boolean | null;
  ishtaKala: GhadiPalaVipala | null;
  ahoratriIshtaKala: GhadiPalaVipala | null;
  choghadiyaAtBirth: {
    nameNe: string;
    nameEn?: string;
    quality: "शुभ" | "अशुभ" | "सामान्य";
    bad: boolean;
  } | null;
  solarCorrectionMinutes: number;
  moonNakshatra: { index: number; number: number; pada: number } | null;
  yoga: { index: number; number: number } | null;
}

export interface DashaTreeNode {
  lord: string;
  lord_ne: string;
  start: string;
  end: string;
  children?: DashaTreeNode[];
}

export interface DashaTreeResponse extends VimshottariResponse {
  tree: DashaTreeNode[];
  tree_depth: number;
  system?: string;
  cycle_years?: number;
  tribhaga?: number;
}

export interface UpagrahaDetailRow {
  key: string;
  name?: string;
  name_ne?: string;
  longitude: number;
  dms: DmsParts;
  nakshatraIndex: number;
  pada: number;
  nakshatraLord: string;
}

/** Vimshopaka Bala — 20-point divisional strength. */
export type VimshopakaGrade = "full" | "mediocre" | "little" | "incapable";
export interface VimshopakaClassification {
  key: string;
  label: string;
  label_ne: string;
  divisions: number[];
}

export interface VimshopakaPlanet {
  key: string;
  name: string;
  name_ne: string;
  /** classification key → { score (0–20), grade }. */
  scores: Record<string, { score: number; grade: VimshopakaGrade }>;
}

export interface VimshopakaData {
  classifications: VimshopakaClassification[];
  planets: VimshopakaPlanet[];
  max_score: number;
  method: string;
}

/** Remedy shape for one `GrahaShantiFinding` — never mix a gem into a "pacify" remedy or a daan into "strengthen". */
export type GrahaShantiRemedy = "shanti" | "strengthen" | "pacify" | "pacify_transit" | "soothe";
/**
 * "critical" — an active dasha/transit, or a yoga landing on a luminary or
 * the Lagnesha. "core" — a real but less time-pressured affliction (a
 * secondary stellium yuti, a weak trikona lord). Not a fine-grained 1-10
 * score: the engine has no defensible methodology to rank dozens of rule
 * branches against each other at that resolution.
 */
export type GrahaShantiTier = "critical" | "core";
/**
 * One trigger of the classical 4-step Graha Shanti decision process
 * (Dasha assessment / Lagnesha-Yogakaraka strength / Rahu-Ketu-Saturn-Mars-
 * Jupiter affliction incl. Vish/Grahan/Angarak/Guru-Chandal Yoga / Saturn's
 * Sade Sati-Dhaiya transit) — server-computed from the same chart used for
 * shadbala/yogas, not a client-side heuristic.
 */
export interface GrahaShantiFinding {
  step: 1 | 2 | 3 | 4;
  stepTitleNe: string;
  stepTitleEn: string;
  graha: string;
  grahaNe: string;
  remedy: GrahaShantiRemedy;
  reasonNe: string;
  reasonEn: string;
  tier: GrahaShantiTier;
}

export interface GrahaShantiRecommendation {
  findings: GrahaShantiFinding[];
}

export const dashaExpandKeys = {
  span: (lord: string, start: string, end: string, system = "vimshottari") =>
    ["dasha", "expand", lord, start, end, system] as const,
};

export type DashaSystem = "vimshottari" | "tribhagi" | "yogini";
// ─── Kundali milan (ashtakuta) — server-computed ─────────────────────────────

export type KutaId =
  | "varna"
  | "vashya"
  | "tara"
  | "yoni"
  | "maitri"
  | "gana"
  | "bhakuta"
  | "nadi";
export interface KutaRow {
  id: KutaId;
  max: number;
  obtained: number;
  boyValue: string;
  girlValue: string;
  areaOfLife: string;
  areaOfLifeNe: string;
  info: string;
  infoNe: string;
}

export interface MilanDoshaRow {
  id: "nadi" | "bhakuta" | "gana" | "tara" | "yoni" | "varna";
  labelEn: string;
  labelNe: string;
  present: boolean;
}

export interface AshtakutaResult {
  kutas: KutaRow[];
  totalObtained: number;
  totalMax: 36;
  recommendation: "excellent" | "very_good" | "middling" | "inauspicious";
  recommendationLabel: string;
  recommendationLabelNe: string;
  nadiDosha: boolean;
  nadiDoshaAdvisory?: string | null;
  nadiDoshaAdvisoryNe?: string | null;
  bhakutaUnfavorable: boolean;
  doshaAnalysis: MilanDoshaRow[];
  notes: string[];
  notesNe: string[];
}

export interface MilanPerson {
  moonLongitude: number;
  moonRashiNum: number;
  moonRashiNe: string;
  moonRashiEn: string;
  nakshatraIndex: number;
  nakshatraNe: string;
  nakshatraEn: string;
  pada: number;
  birth_instant: string;
  location?: Record<string, unknown>;
}

export interface KundaliMilanResponse {
  result: AshtakutaResult;
  boy: MilanPerson;
  girl: MilanPerson;
  ayanamsha: string;
  lang: string;
}

// ─── Kundali interpretation report (streamed, deterministic) ──────────────────

/** How strongly the supporting factors agree for one insight. */
export type ReportConfidence = "strong" | "moderate" | "mixed" | "tentative";
export interface ReportItem {
  label: string;
  confidence: ReportConfidence;
  factors?: string[];
  text: string;
  polarity?: "benefic" | "mixed" | "caution";
}

export interface ReportSection {
  kind: "section";
  index: number;
  total: number;
  id: string;
  title_en: string;
  title_ne: string;
  body: string[];
  confidence?: ReportConfidence;
  factors?: string[];
  items?: ReportItem[];
  optional?: boolean;
}

export interface ReportRashiRef {
  sign: number;
  name_en: string;
  name_ne: string;
}

export interface ReportMeta {
  kind: "meta";
  lagna: ReportRashiRef;
  moon_sign: ReportRashiRef;
  sun_sign: ReportRashiRef;
  nakshatra?: {
    name_en: string;
    name_ne: string;
    pada: number;
    lord_en: string;
  };
  mahadasha: {
    lord: string;
    lord_en: string;
    lord_ne: string;
    ends?: string;
    antardasha?: string;
    antardasha_en?: string;
    antardasha_ne?: string;
    antardasha_ends?: string;
    window?: [string, string];
  } | null;
  yoga_count: number;
  generated_at: string;
  method: string;
  disclaimer: string;
}

export interface ReportHeader {
  kind: "header";
  ayanamsha: string;
  location: Record<string, unknown>;
  birth_instant: string;
}

export type ReportRecord =
  | ReportHeader
  | ReportMeta
  | ReportSection
  | { kind: "done"; total: number };
// ─── Types ────────────────────────────────────────────────────────────────────

export interface PushkaraNavamshaHit {
  degree?: number;
  degree_dms?: string;
  local_time?: string;
  local_time_short?: string;
}

export interface LagnaSpan {
  number?: number;
  name?: string;
  name_ne?: string;
  degree_in_rashi?: number;
  longitude?: number;
  start_time?: string;
  end_time?: string;
  start_ghati_clock?: string;
  start_hours_clock?: string;
  start_local_time?: string;
  start_local_time_short?: string;
  end_ghati_clock?: string;
  end_hours_clock?: string;
  end_local_time?: string;
  end_local_time_short?: string;
  pushkara_navamsha?: PushkaraNavamshaHit[];
}

export interface RashiSpan {
  number?: number;
  name?: string;
  name_ne?: string;
  end_local_time?: string;
  end_local_time_short?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
}

export interface NakshatraPadaSpan {
  nakshatra_number?: number;
  nakshatra_name?: string;
  nakshatra_name_ne?: string;
  pada?: number;
  pada_ne?: string;
  end_local_time?: string;
  end_local_time_short?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
}

export interface BalamChip {
  number?: number;
  name?: string;
  name_ne?: string;
}

export interface BalamTill {
  end_local_time_short?: string;
  end_local_time?: string;
  end_hours_clock?: string;
}

export interface BalamBlock {
  till?: BalamTill | null;
  set1?: BalamChip[];
  set2?: BalamChip[];
}

export type NavataraTone = "best" | "good" | "neutral" | "bad" | "worst";
export interface NavataraRow {
  index: number;
  name: string;
  name_en?: string;
  tara: string;
  quality: string;
  tone: NavataraTone;
  tara_num: number;
}

export interface NavataraTableBlock {
  moon_index: number;
  moon_label: string;
  moon_label_en?: string;
  rows: NavataraRow[];
}

export const RASHIFAL_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type RashifalPeriod = (typeof RASHIFAL_PERIODS)[number];
/** The six life areas the server scores from each sign's own houses. */
export const RASHIFAL_DOMAINS = [
  "career",
  "finance",
  "health",
  "love",
  "learning",
  "travel",
] as const;

export type RashifalDomainKey = (typeof RASHIFAL_DOMAINS)[number];
/** One scoring layer (gochar, chandrabala, ashtakavarga, …) behind a sign. */
export interface RashifalComponent {
  key: string;
  label_ne: string;
  label_en: string;
  score: number;
  percent: number;
  weight: number;
  tone: NavataraTone;
  note_ne: string;
  note_en: string;
}

export interface RashifalDomain {
  key: RashifalDomainKey;
  label_ne: string;
  label_en: string;
  score: number;
  percent: number;
  tone: NavataraTone;
  houses: number[];
  karaka: string[];
  tenants: string[];
}

/** One graha's transit verdict counted from the sign. */
export interface RashifalGocharRow {
  graha: string;
  graha_ne: string;
  graha_en: string;
  sign: number;
  sign_ne: string;
  sign_en: string;
  house: number;
  favourable: boolean;
  vedha_by: string | null;
  vedha_by_ne: string | null;
  bindu: number | null;
  retrograde: boolean;
  combust: boolean;
  weight: number;
  score: number;
}

export interface RashifalLordBlock {
  score: number;
  lord: string;
  lord_ne: string;
  lord_en: string;
  house: number;
  sign: number;
  sign_ne: string;
  sign_en: string;
  dignity: string;
  dignity_ne: string;
  dignity_en: string;
  combust: boolean;
  retrograde: boolean;
}

export interface RashifalHoraWindow {
  planet: string;
  planet_ne: string;
  planet_en: string;
  start_local_time_short?: string | null;
  end_local_time_short?: string | null;
  phase?: string;
}

export interface RashifalDayMarker {
  date_ad: string;
  date_bs?: string | null;
  score: number;
  percent: number;
  tone: NavataraTone;
}

/** Day-wide state every sign was read against — shown once above the grid. */
export interface RashifalFrame {
  date_ad: string;
  jd_sunrise: number;
  vaara_num: number;
  paksha: string;
  tithi_index: number;
  day_fraction: number;
  moon_sign: number;
  moon_sign_ne: string;
  moon_sign_en: string;
  sun_sign: number;
  sun_sign_ne: string;
  sun_sign_en: string;
  lagna_sign: number;
  lagna_sign_ne: string;
  lagna_sign_en: string;
  sarvashtakavarga: number[];
}

export interface ApiHoraSlot {
  index: number;
  phase: "day" | "night";
  phase_ne: string;
  planet: string;
  planet_ne: string;
  planet_en: string;
  quality_ne: "शुभ" | "अशुभ";
  tone: "good" | "bad";
  bad: boolean;
  start_local_time_short: string;
  end_local_time_short: string;
  start_g: number;
  end_g: number;
}

export interface UdayaLagnaRow {
  number?: number;
  name?: string;
  name_ne?: string;
  start_local_time_short?: string;
  end_local_time_short?: string;
  start_local_time?: string;
  end_local_time?: string;
  start_hours_clock?: string;
  end_hours_clock?: string;
  pushkara_navamsha?: PushkaraNavamshaHit[];
}

export interface MuhurtaNowBlock {
  active?: boolean;
  start_time?: string;
  end_time?: string;
  start_local?: string;
  end_local?: string;
  label_ne?: string;
  label_en?: string;
}

export interface PlanetInfo {
  rashi?: string;
  rashi_ne?: string;
  rashi_name?: string;
  rashi_no?: number;
  degrees?: number;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  retrograde?: boolean;
  is_retrograde?: boolean;
  /** अस्त — combust (within the Sun's combustion orb). */
  is_combust?: boolean;
  longitude?: number;
  speed?: number;
  motion?: string;
}

export interface Festival {
  id: string;
  name?: string;
  name_en?: string;
  name_ne?: string;
  type?: string;
  category?: string;
  is_public_holiday?: boolean;
  start_date?: string;
  end_date?: string;
  bs_start_date?: string;
  bs_end_date?: string;
  duration_days?: number;
  importance?: string;
  notes?: string;
}

export interface LunarLayer {
  name?: string;
  full_name?: string;
  is_adhik?: boolean;
  type?: string;
  paksha_model?: string;
  window_start?: string;
  window_end?: string;
  solar_name?: string;
  festival_masa?: string;
}

export interface Holiday {
  id: string;
  name_en?: string;
  name_ne?: string;
  start_date: string;
  end_date: string;
  bs_start_date?: string;
  bs_end_date?: string;
  duration_days?: number;
  type?: string;
  category?: string;
  importance?: string;
  is_public_holiday?: boolean;
  notes?: string;
}

export interface ConvertAdToBs {
  ad_date: string;
  bs_year: number;
  bs_month: number;
  bs_day: number;
  bs_date: string;
  bs_month_name: string;
  bs_month_name_ne: string;
  weekday: string;
}

export interface ConvertBsToAd {
  bs_date: string;
  bs_year: number;
  bs_month: number;
  bs_day: number;
  bs_month_name: string;
  bs_month_name_ne: string;
  ad_date: string;
  weekday: string;
}

// ─── Vastu plot sketch ───────────────────────────────────────────────────────
// Which compass zone each requested room sits in, the Āyādi width check and the
// preferred entrance corner are all computed by `POST /vastu/sketch`; the
// client only draws the result.

export interface VastuSketchRequest {
  /** East–West plot size, metres. */
  plot_width: number;
  /** North–South plot size, metres. */
  plot_depth: number;
  facing: "north" | "east" | "south" | "west";
  plan: {
    bedrooms: number;
    toilets: number;
    bathrooms: number;
    combined: number;
    master_bedroom: number;
    extras: string[];
    mode: "strict" | "flexible";
    storeys: number;
    floors: Record<string, string>;
  };
}

export interface VastuAyadi {
  length_hasta: number;
  width_hasta: number;
  remainder: number;
  auspicious: boolean;
  suggested_hasta: number | null;
  suggested_meters: number | null;
}

// ─── Response types reconciled from both apps (web base + app-only fields) ───

export interface PatroApiLimits {
  signed_year_min: number;
  signed_year_max: number;
  ephemeris_signed_min: number;
  ephemeris_signed_max: number;
  ad_year_min: number;
  ad_year_max: number;
  bc_year_min: number;
  bc_year_max: number;
  bbs_url_year_max: number;
  festival_stack_min_year: number;
  cache_payload_version?: number;
  /** Widest BS-year window a client may download for offline use. */
  offline_max_span_years?: number;
}

export interface City {
  id: number;
  name: string;
  ascii_name: string;
  lat: number;
  lon: number;
  country: string;
  population: number;
  timezone: string;
  admin1?: string | null;
  admin1_name?: string | null;
  /** Curated Nepal entry — location is built from lat/lon, not a backend city_id. */
  local?: boolean;
}

export interface CitiesSearchResponse {
  query: string;
  count: number;
  cities: City[];
}

export interface NearestCityResponse {
  lat: number;
  lon: number;
  city: City;
}

export interface CivilTimeline {
  anchor: "civil";
  date_ad: string;
  sunrise_min: number;
  sunset_min: number | null;
  moonrise_min: number | null;
  moonset_min: number | null;
  weekday_ne?: string | null;
  weekday_en?: string | null;
  paksha_ne?: string | null;
  rows: {
    tithi: CivilTimelineSeg[];
    nakshatra: CivilTimelineSeg[];
    yoga: CivilTimelineSeg[];
    karana: CivilTimelineSeg[];
  };
  choghadiya: CivilTimelineBand[];
  hora: CivilTimelineHora[];
  lagna: CivilTimelineLagna[];
  planets?: PanchangaDay["planets"];
  planets_anchor?: unknown;
}

export interface TropicalSeasonsResponse {
  timezone: string;
  latitude?: number;
  southern_hemisphere: boolean;
  boundaries: TropicalSeasonBoundary[];
  /** @deprecated */
  segments?: TropicalSeasonSegment[];
}

export interface GocharIngressEvent {
  graha: string;
  graha_ne: string;
  level: string;
  to_rashi?: string;
  to_rashi_ne?: string;
  from_rashi?: string;
  from_rashi_ne?: string;
  to_nakshatra?: string;
  to_nakshatra_ne?: string;
  to_pada?: number;
  to_pada_ne?: string;
  label_ne?: string;
  entry_time_local: string;
  entry_time_local_short?: string;
  entry_time_utc?: string;
  entry_date_ad?: string;
  /** Vedic day (sunrise–sunrise) civil date — patro गते row key. */
  entry_vedic_date_ad?: string;
  /** BS patro date key when the civil AD fields are omitted (BCE / JD path). */
  entry_jd_date?: string;
  entry_vedic_jd_date?: string;
  entry_jd?: number;
  entry_vedic_jd?: number;
  /** udayast only */
  event?: "udaya" | "asta";
  hemisphere?: "east" | "west";
  motion_ne?: string;
  is_retrograde?: boolean;
}

export interface GocharIngressResponse {
  from_date_ad: string;
  to_date_ad: string;
  level: string;
  location?: Record<string, unknown>;
  events: GocharIngressEvent[];
}

export interface GocharGraha {
  name_ne: string;
  name_vedic?: string;
  symbol: string;
  rashi?: string;
  rashi_ne?: string;
  rashi_no?: number;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  dms_absolute?: string;
  longitude?: number;
  speed_deg_day?: number;
  /** "Margi" (direct) or "Vakri" (retrograde). */
  motion?: string;
  is_retrograde?: boolean;
  /** अस्त — combust (within the Sun's combustion orb). */
  is_combust?: boolean;
  next_rashi_entry?: GocharNextEntry | null;
  next_nakshatra_entry?: GocharNextEntry | null;
  next_pada_entry?: GocharNextEntry | null;
  nakshatra_no?: number;
  nakshatra?: string;
  nakshatra_ne?: string;
  pada?: number;
  nakshatra_lord?: string;
  nakshatra_lord_ne?: string;
  nakshatra_lord_en?: string;
  sub_lord?: string;
  sub_lord_ne?: string;
  sub_lord_en?: string;
  is_exalted?: boolean;
}

export interface GocharResponse {
  date_ad: string;
  date_bs?: string;
  /**
   * The frame the longitudes below are sidereal in — where the start of मेष
   * stands against the equinox on this date. Optional: older cached responses
   * predate the field.
   */
  ayanamsa?: { name: string; degrees: number };
  gochar: Record<string, GocharGraha>;
  /** Optional: older cached responses predate the field. */
  vedic_stars?: VedicStarPosition[];
}

// ─── Graha detail (sthiti / asta / vakri) + eclipses ──────────────────────────

/** One row of the daily sphuta table — a graha or लग्न. */
export interface GrahaSthitiRow {
  graha: string;
  name_ne: string;
  name_vedic: string;
  symbol: string;
  /** `21° कन्या 53′ 14″` — degree in sign with Nepali rashi name. */
  rekhamsha: string;
  rashi_ne: string;
  nakshatra: string;
  nakshatra_ne: string;
  pada: number;
  pada_ne: string;
  nakshatra_lord_ne: string;
  sub_lord_ne: string;
  full_degree: number;
  /** `04° द. 45′ 02″` — signed ecliptic latitude (शर), north/south. */
  shara: string;
  shara_deg: number;
  speed_deg_day: number;
  is_retrograde: boolean;
  is_combust: boolean;
  right_ascension: number;
  declination: number;
}

export interface GrahaSthitiResponse {
  date_ad: string;
  date_bs: string;
  timezone: string;
  sunrise_local: string;
  location?: Record<string, unknown>;
  rows: GrahaSthitiRow[];
}

/** A localized timestamp for an asta period boundary. */
export interface AstaStamp {
  iso: string;
  jd?: number;
  /** Era-rendered day label from {@link jd} (EraMiddleware). */
  date?: string;
  date_ad?: string;
  date_bs?: string | null;
  time_short: string;
}

/** One combustion (asta) period — moon Tara Asta or a planet's asta window. */
export interface GrahaAstaPeriod {
  graha: string;
  graha_ne: string;
  /** null until the moon rises / period opens before the year (open_start). */
  start: AstaStamp | null;
  end: AstaStamp | null;
  duration_days: number | null;
  /** "east" (morning/पूर्व) or "west" (evening/पश्चिम) for planets; null for the moon. */
  hemisphere?: "east" | "west" | null;
}

export interface GrahaAstaResponse {
  bs_year: number;
  gregorian_range: { start: string; end: string };
  grahas: string[];
  periods: GrahaAstaPeriod[];
  ad_year?: number;
}

export interface GrahaVakriResponse {
  bs_year: number;
  gregorian_range: { start: string; end: string };
  grahas: string[];
  events: GrahaVakriEvent[];
}

/** One eclipse (solar or lunar) within a BS year. */
export interface EclipseEvent {
  kind: "solar" | "lunar";
  type: string;
  type_ne: string;
  type_en: string;
  max_utc: string;
  max_local: string;
  /** Civil day of maximum (era middleware from ``date_jd``). */
  date_jd_date?: string;
  date_ad?: string;
  date_bs?: string | null;
  visible: boolean;
  begin_local?: string | null;
  end_local?: string | null;
  penumbral_begin_local?: string | null;
  penumbral_end_local?: string | null;
  /** @deprecated use max_local */
  maximum_time_local_short?: string;
  /** @deprecated use visible boolean */
  visible_ne?: string;
  visible_en?: string;
}

export interface EclipseYearResponse {
  bs_year: number;
  kind: "solar" | "lunar";
  gregorian_range: { start: string; end: string };
  events: EclipseEvent[];
}

export interface PanchakMomentResponse {
  /** Full AD instant with the Nepal offset, e.g. "2026-04-13T04:03:00+05:45". */
  iso: string;
  bs_year: number;
  bs_month: number;
  bs_day: number;
  time_en: string;
  time_ne: string;
  time_short?: string;
  /** Legacy; prefer `iso`. */
  date_ad?: string;
}

export interface PanchakPeriodResponse {
  start: PanchakMomentResponse;
  end: PanchakMomentResponse;
  duration_en: string;
  duration_ne: string;
}

export interface PanchakYearResponse {
  era: Era;
  bs_year?: number;
  ad_year?: number;
  count: number;
  gregorian_range: { start: string; end: string };
  periods: PanchakPeriodResponse[];
}

export type RawMonthDay = CalendarDay;

export interface SunYearResponse {
  year_bs: number;
  location?: PanchangaDay["location"];
  months: SunYearMonth[];
}

/** Festival with countdown, as returned by /nepal/festivals/upcoming. */
export interface UpcomingFestival extends Festival {
  days_until: number;
}

export interface UpcomingFestivalsResponse {
  from: string;
  days: number;
  count: number;
  festivals: UpcomingFestival[];
}

/** Per-day muhūrta reason for each qualifying day (why it was selected). */
export interface SaitDetailDay {
  bs_month: number;
  bs_day: number;
  bs_month_name_ne: string;
  gregorian: string;
  weekday_en: string;
  weekday_ne: string;
  window_start: string;
  window_end: string;
  tithi_num: number;
  tithi_en: string;
  tithi_ne: string;
  paksha: string;
  paksha_ne: string;
  nakshatra_num: number;
  nakshatra_en: string;
  nakshatra_ne: string;
  yoga_en: string;
  yoga_ne: string;
  karana_en: string;
  karana_ne: string;
  lagna_en: string;
  lagna_ne?: string;
  lunar_month_en: string | null;
  lunar_month_ne: string | null;
}

export interface SaitDetailResponse {
  bs_year: number;
  category: string;
  category_label_ne: string;
  engine_version?: string;
  /** Community rule ids the engine dropped for this response (echoed back). */
  excluded_rules?: string[];
  /** Bratabandha only — classical | nepali | liberal. */
  nakshatra_mode?: string | null;
  days: SaitDetailDay[];
}

export interface SaitRuleItem {
  ne: string;
  en: string;
}

export interface SaitAboutCategory {
  id: string;
  label_ne: string;
  label_en: string;
  description_ne?: string;
  description_en?: string;
  requires_birth_date?: boolean;
  source?: string;
  method?: { ne?: string; en?: string };
  /** Classical rules the engine applies for this ceremony (per-category). */
  rules?: SaitRuleItem[];
}

export interface SaitAboutResponse {
  source: string;
  method: { ne?: string; en?: string };
  categories: SaitAboutCategory[];
}

export interface ElementInfo {
  id: string;
  label_ne: string;
  label_en: string;
  kind: ElementKind;
}

export interface ElementMonthDay {
  date_ad: string;
  bs_day: number;
  weekday_ne?: string;
  weekday_en?: string;
  sunrise?: string;
  sunset?: string;
  data: unknown;
}

export interface ElementMonthResponse {
  element: string;
  kind: ElementKind;
  label_ne: string;
  label_en: string;
  bs_year: number;
  bs_month: number;
  start_ad: string;
  days: ElementMonthDay[];
}

export interface ElementDayResponse {
  element: string;
  kind: ElementKind;
  label_ne: string;
  label_en: string;
  date_ad: string;
  sunrise?: string;
  sunset?: string;
  data: unknown;
}

/** A month, named in an era. The backend resolves it to a Julian Day span. */
export type ElementSpanRange = { era: Era; year: number; month: number };

export interface ShadbalaPlanet {
  key: string;
  name: string;
  name_ne: string;
  total_virupas: number;
  rupas: number;
  required: number;
  ratio: number;
  status: ShadbalaStatus;
  top_bala: string;
  weakest_bala: string;
  breakdown: ShadbalaBreakdown;
  /** Component virupas within sthana and kala (newer API). */
  sub_balas?: ShadbalaSubBalas;
  ishta_phala?: number;
  kashta_phala?: number;
}

export interface ShadbalaResponse {
  planets: ShadbalaPlanet[];
  summary: {
    strongest: ShadbalaSummaryRef;
    weakest: ShadbalaSummaryRef;
    average_rupas: number;
    average_virupas: number;
    meeting_threshold: number;
    total_planets: number;
    counts: Record<ShadbalaStatus, number>;
  };
  method: string;
  location?: Record<string, unknown>;
  query_instant?: string;
}

export interface KundaliDetailResponse {
  panchanga: PanchangaDay;
  shadbala: ShadbalaResponse;
  dasha: DashaTreeResponse | null;
  tribhagiDasha: DashaTreeResponse | null;
  yoginiDasha: DashaTreeResponse | null;
  yuddha: YuddhaData;
  bhavaBala: BhavaBalaData | null;
  vimshopaka: VimshopakaData | null;
  ashtakavarga: AshtakavargaData | null;
  yogas: KundaliYoga[];
  grahaShanti: GrahaShantiRecommendation;
  vargaCharts: VargaCharts;
  upagrahas: UpagrahaDetailRow[];
  avakahada: JanmaAvakahadaData | null;
  birthMeta: KundaliBirthMeta;
  combustion: Record<string, boolean | null>;
  lagnaRashi: number | null;
  ayanamsha: string;
  location?: Record<string, unknown>;
  birth_instant: string;
  bhavaReference?: BhavaReferencePayload;
}

export interface MilanPersonQuery {
  /** Birth moment: a civil day in some era plus the local clock. */
  moment: InstantQuery;
  lat?: number;
  lon?: number;
  timezone?: string;
}

export interface SuryaNakshatra {
  number?: number;
  name?: string;
  name_ne?: string;
}

export interface RashifalSignBlock {
  index: number;
  id: number;
  name: string;
  name_en: string;
  title_en: string;
  syllables_ne: string;
  score: number;
  percent: number;
  stars: number;
  tone?: NavataraTone;
  /** Vimshopaka four-grade band (Full / Medium / Small / Nil). */
  grade?: "full" | "medium" | "small" | "nil";
  grade_ne?: string;
  grade_en?: string;
  /** Aggregate periods only: the plain window mean, before the peak blend. */
  mean_score?: number;
  tara?: string;
  quality?: string;
  tara_num?: number;
  house_from_moon?: number;
  moorti?: string;
  moorti_ne?: string;
  moorti_en?: string;
  lucky_lord?: string;
  lucky_lord_ne?: string;
  lucky_lord_en?: string;
  lucky_color_ne: string;
  lucky_color_en: string;
  lucky_number_ne: string;
  lucky_number_en: string;
  lucky_direction_ne?: string;
  lucky_direction_en?: string;
  lucky_time?: RashifalHoraWindow | null;
  rashi_lord?: RashifalLordBlock;
  components?: RashifalComponent[];
  domains?: RashifalDomain[];
  gochar?: RashifalGocharRow[];
  ashtakavarga?: { score: number; sav: number; sav_trikona: number; sav_kendra: number };
  cycle?: { score: number; graha: string; graha_ne: string; graha_en: string; house: number };
  days_in_period?: number;
  best_day?: RashifalDayMarker;
  weak_day?: RashifalDayMarker;
  remedy_ne?: string;
  remedy_en?: string;
  prediction_ne: string;
  prediction_en: string;
}

export interface RashifalIngress {
  graha: string;
  graha_ne: string;
  graha_en: string;
  date_ad: string;
  date_bs?: string | null;
  from_sign: number;
  from_sign_ne: string;
  to_sign: number;
  to_sign_ne: string;
  to_sign_en: string;
}

export interface RashifalBlock {
  period: RashifalPeriod;
  anchor?: string;
  method?: Record<string, unknown>;
  moon_index?: number;
  moon_label?: string;
  moon_label_en?: string;
  signs: RashifalSignBlock[];
  frame?: RashifalFrame;
  ingress?: RashifalIngress[];
  range_start_ad?: string;
  range_end_ad?: string;
  bs_year?: number;
  bs_month?: number;
  bs_month_name_ne?: string;
  bs_month_name_en?: string;
  days_computed?: number;
}

export interface PanchakaSegment {
  name?: string;
  name_ne?: string;
  good?: boolean;
  start_local_time_short?: string;
  end_local_time_short?: string;
  start_local_time?: string;
  end_local_time?: string;
  start_hours_clock?: string;
  end_hours_clock?: string;
  label_ne?: string;
  label_en?: string;
}

export interface NivasShoolDirection {
  direction_key?: string;
  name_en?: string;
  name_ne?: string;
  direction_ne?: string;
  direction_en?: string;
}

export interface NivasShoolSegment extends NivasShoolDirection {
  key?: string;
  symbol?: string;
  name_en?: string;
  name_ne?: string;
  subtitle_en?: string;
  subtitle_ne?: string;
  is_auspicious?: boolean;
  end_local_time_short?: string;
  until_full_night?: boolean;
  start_local_time_short?: string;
  loka?: string;
  till_full_night?: boolean;
}

export interface NivasShoolBlock {
  homahuti?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  disha_shool?: NivasShoolDirection & { auspicious_directions?: NivasShoolDirection[] };
  rahu_vasa?: NivasShoolDirection;
  agnivasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  shivavasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  chandra_vasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  bhadravasa?: { active?: boolean; segments?: NivasShoolSegment[] };
  kumbha_chakra?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
}

export interface PanchangaAtTime {
  mode: "ephemeris";
  query_instant: string;
  query_instant_local?: string;
  panchanga_date_ad?: string;
  date_ad?: string;
  date_bs?: string;
  before_sunrise_of_civil_day?: boolean;
  bs_date?: { year: number; month: number; day: number };
  vaara?: { name_ne?: string; name_english?: string };
  weekday?: string;
  sunrise?: { local_time_short?: string } | string;
  sunset?: { local_time_short?: string } | string;
  tithi?: PanchangaDay["tithi"];
  nakshatra?: PanchangaDay["nakshatra"];
  yoga?: PanchangaDay["yoga"];
  karana?: PanchangaDay["karana"];
  planets?: Record<string, PlanetInfo | string>;
  lagna?: PanchangaDay["lagna"];
  muhurta?: PanchangaDay["muhurta"];
  muhurta_now?: {
    rahu_kalam?: MuhurtaNowBlock;
    yamaganda?: MuhurtaNowBlock;
    gulika?: MuhurtaNowBlock;
    abhijit?: MuhurtaNowBlock;
  };
  planets_anchor?: { type?: string; local_time?: string; label_ne?: string; label_en?: string };
  location?: PanchangaDay["location"];
}

/** One day in one era. `year` is always >= 1 — the era carries the sign. */
export interface EraDateSpelling {
  era: Era;
  year: number;
  month: number;
  day: number;
}

/**
 * The backend's era-correct rendering of a day, keyed by its Julian Day.
 *
 * The top-level `era`/`year`/`month`/`day` are the requested display era;
 * `vikram` and `gregorian` are the same instant in both systems, so the client
 * never has to convert between them.
 */
export interface EraDateParts extends EraDateSpelling {
  jd: number;
  vikram: EraDateSpelling;
  gregorian: EraDateSpelling;
}

export interface PanchangaDay {
  mode?: "ephemeris" | "udaya" | "civil";
  /** "midnight" for the civil-day (दिन-रात) payload — ghati/day-offset origin is 00:00. */
  boundary?: "midnight";
  query_instant?: string;
  query_instant_local?: string;
  panchanga_date_ad?: string;
  before_sunrise_of_civil_day?: boolean;
  muhurta_now?: PanchangaAtTime["muhurta_now"];
  planets_anchor?: PanchangaAtTime["planets_anchor"];
  location?: { name?: string; lat?: number; lon?: number; timezone?: string; city_id?: number };
  date_bs?: string;
  date_ad?: string;
  /** Civil day at 0h UT — canonical ephemeris identity (Swiss Ephemeris JD). */
  jd_ut?: number;
  /**
   * The day rendered the way the eras actually work: every year positive, with
   * `era` carrying which side of which epoch it falls on.
   *
   * Prefer this over `date_bs`/`date_ad`, which are the engine's machine fields
   * and spell pre-epoch days on a signed axis (`-4-01-01`, `-0060-03-16`).
   */
  date_parts?: EraDateParts;
  bs_date?: { year: number; month: number; day: number; month_name_ne?: string };
  samvatsara?: {
    key: string;
    name_en: string;
    name_ne: string;
    cycle: number;
    deity: string;
    index: number;
  };
  display?: { bs_ne?: string; gregorian_en?: string; ns_ne?: string };
  weekday?: string;
  sunrise?: { local_time_short?: string } | string;
  sunset?: { local_time_short?: string } | string;
  moonrise?: { local?: string; local_time_short?: string };
  moonset?: { local?: string; local_time_short?: string };
  tithi?: PanchangaAnga;
  nakshatra?: PanchangaAnga;
  yoga?: PanchangaAnga;
  karana?: PanchangaAnga;
  paksha?: { label_ne?: string; label_en?: string; is_adhik?: boolean };
  paksha_ne?: string;
  chandra_rashi?: { name_ne?: string; number?: number; name?: string };
  chandra_rashi_spans?: RashiSpan[];
  nakshatra_pada_spans?: NakshatraPadaSpan[];
  surya_rashi?: { name_ne?: string; number?: number; name?: string };
  surya_rashi_ne?: string;
  surya_nakshatra?: SuryaNakshatra;
  chandrabalam?: BalamBlock;
  tarabalam?: BalamBlock;
  tarabala_table?: NavataraTableBlock;
  chandrabala_table?: NavataraTableBlock;
  rashifal?: RashifalBlock;
  hora?: ApiHoraSlot[];
  hora_day?: ApiHoraSlot[];
  choghadiya?: Array<{
    name_ne: string;
    start_g: number;
    end_g: number;
    bad?: boolean;
    phase?: string;
  }>;
  panchaka_rahita?: PanchakaSegment[];
  udaya_lagna?: UdayaLagnaRow[];
  ritu?: { name?: string; name_ne?: string; season?: string } | string;
  ritu_ne?: string;
  ritu_pauranik?: { name?: string; name_ne?: string; season?: string };
  ritu_vedic?: { name?: string; name_ne?: string; season?: string };
  lagna?: { name?: string; name_ne?: string; degree_in_rashi?: number; longitude?: number };
  lagna_spans?: LagnaSpan[];
  detail?: {
    tithi?: PanchangaAnga;
    nakshatra?: PanchangaAnga;
    yoga?: PanchangaAnga;
    karana?: PanchangaAnga;
    sunrise?: { local_time_short?: string };
    sunset?: { local_time_short?: string };
    moonrise?: { local?: string; local_time_short?: string };
    moonset?: { local?: string; local_time_short?: string };
    planets?: Record<string, PlanetBlock | string>;
    planets_anchor?: { type?: string };
    solar_corrections?: {
      belaantar?: SolarCorrection;
      deshaantar?: SolarCorrection;
    };
    muhurta?: PanchangaDay["muhurta"];
    ritu?: { name?: string; name_ne?: string; season?: string };
    ritu_pauranik?: { name?: string; name_ne?: string; season?: string };
    choghadiya?: Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean; phase?: string }>;
    hora?: ApiHoraSlot[];
    hora_day?: ApiHoraSlot[];
    tarabala_table?: NavataraTableBlock;
    chandrabala_table?: NavataraTableBlock;
    udaya_lagna?: UdayaLagnaRow[];
    lagna_spans?: LagnaSpan[];
    day_ghati?: number;
    vaara?: { name_ne?: string; name_english?: string; number?: number };
    paksha?: { name?: string; label_ne?: string; label_en?: string };
    weekday?: { name_ne?: string; name_english?: string };
    muhurta_now?: PanchangaDay["muhurta_now"];
    instant_lagna?: PanchangaDay["lagna"];
    nivas_shool?: NivasShoolBlock;
    chandrabalam?: BalamBlock;
    tarabalam?: BalamBlock;
    panchaka_rahita?: PanchakaSegment[];
    chandra_rashi?: PanchangaDay["chandra_rashi"];
    lagna?: PanchangaDay["lagna"];
    [key: string]: unknown;
  };
  dinamaan?: {
    label_en?: string;
    label_ne?: string;
    label_en_full?: string;
    label_ne_full?: string;
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  ratrimana?: {
    label_en?: string;
    label_ne?: string;
    label_en_full?: string;
    label_ne_full?: string;
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  madhyahna?: { local_time_short?: string; local_time?: string };
  aayan?: { name?: string; name_ne?: string };
  aayan_pauranik?: { name?: string; name_ne?: string };
  aayan_vedic?: { name?: string; name_ne?: string };
  lahiri_ayanamsa?: { degrees?: number };
  festivals?: Festival[];
  is_public_holiday?: boolean;
  sun?: { sunrise?: string; sunset?: string };
  moon?: { rise?: string; set?: string };
  muhurta?: {
    rahu_kalam?: { start_time?: string; end_time?: string };
    abhijit?: { start_time?: string; end_time?: string; solar_noon?: string; is_auspicious?: boolean };
    yamaganda?: { start_time?: string; end_time?: string };
    gulika?: { start_time?: string; end_time?: string };
    inauspicious_timings?: Array<{
      key?: string;
      name_ne?: string;
      name_en?: string;
      segments?: Array<{
        start_local_time_short?: string;
        end_local_time_short?: string;
        until_full_night?: boolean;
      }>;
    }>;
  };
  nivas_shool?: NivasShoolBlock;
  planets?: Record<string, PlanetInfo | string>;
  solar_corrections?: {
    belaantar?: SolarCorrection;
    deshaantar?: SolarCorrection;
  };
  chandra_balam?: BalamBlock | unknown;
  tara_balam?: BalamBlock | unknown;
  panchaka?: unknown;
  din_vishesh?: unknown;
}

export interface MonthCalendar {
  year_bs: number;
  month_bs: number;
  /** Absent on months rebuilt from an offline year download. */
  month_name?: string;
  month_name_ne?: string;
  /** Absent on months rebuilt from an offline year download. */
  month_start_ad?: string;
  month_length: number;
  first_weekday?: number;
  limits?: PatroApiLimits;
  mode?: "ephemeris" | "udaya";
  clock?: string;
  calendar: CalendarDay[];
}

export interface YearCalendar {
  year_bs: number;
  year_length: number;
  location?: PanchangaDay["location"];
  months: MonthCalendar[];
  calendar: CalendarDay[];
}

/**
 * A panchanga aṅga (tithi / nakshatra / yoga / karaṇa) as returned in the
 * month-calendar nested `panchanga` block. Unlike `PanchangaDay`'s aṅga shape,
 * the calendar endpoint carries plain `start`/`end` datetime strings
 * (e.g. "2026-06-20 16:02") and string `next`/`next_ne` names — including
 * end-times for yoga and karaṇa.
 */
export interface CalendarDayAnga {
  name?: string;
  name_ne?: string;
  start?: string;
  end?: string;
  next?: string;
  next_ne?: string;
  end_local_time?: string;
  end_hours_clock?: string;
}

/** Full per-day detail embedded under each month-calendar day when `full=true`. */
export interface CalendarDayDetail {
  paksha?: string;
  paksha_ne?: string;
  aayan?: string;
  aayan_ne?: string;
  ayana_mark?: "उ" | "द";
  tithi?: CalendarDayAnga;
  nakshatra?: CalendarDayAnga;
  yoga?: CalendarDayAnga;
  karana?: CalendarDayAnga;
  surya_rashi?: string;
  surya_rashi_ne?: string;
  chandra_rashi?: string;
  chandra_rashi_ne?: string;
  chandra_rashi_spans?: RashiSpan[];
  sun?: { sunrise?: string; sunset?: string; noon?: string };
  moon?: { rise?: string; set?: string };
  dinamaan?: string;
  ritu_ne?: string;
  lunar_month?: LunarLayer & { name_ne?: string };
  lagna_spans?: LagnaSpan[];
  udaya_lagna?: UdayaLagnaRow[];
  planets?: Record<string, PlanetInfo>;
  planets_anchor?: {
    type?: string;
    local_time?: string;
    label_ne?: string;
    label_en?: string;
  };
  jd_ut?: number;
  solar_corrections?: {
    belaantar?: {
      minutes?: number;
      seconds?: number;
      sign?: "dhan" | "rin";
      sign_ne?: string;
      label_ne?: string;
      name_ne?: string;
    };
    deshaantar?: {
      minutes?: number;
      seconds?: number;
      sign?: "dhan" | "rin";
      sign_ne?: string;
      label_ne?: string;
      name_ne?: string;
    };
    akshamsha?: {
      minutes?: number;
      seconds?: number;
      sign?: "dhan" | "rin";
      sign_ne?: string;
      label_ne?: string;
      name_ne?: string;
    };
    ishtakaal_note_ne?: string;
    ishtakaal_note_en?: string;
    sunrise_includes_corrections?: boolean;
  };
  /**
   * Both lunar reckonings, as merged by the backend's
   * `merge_lunar_month_for_day()`. `purnimant` is the model Nepali patro uses
   * (months run pūrṇimā→pūrṇimā); `amanta` runs new-moon→new-moon.
   */
  lunar_calendar?: {
    adhik_maas?: { year_has_adhik?: boolean; name?: string; name_ne?: string };
    amanta?: LunarLayer;
    purnimant?: LunarLayer;
    festival_masa?: string;
  };
}

export interface CalendarDay {
  day: number;
  date_ad: string;
  weekday: string;
  weekday_en?: string;
  weekday_ne?: string;
  tithi: string;
  tithi_ne?: string;
  paksha?: string;
  paksha_ne?: string;
  nakshatra?: string;
  nakshatra_ne?: string;
  yoga?: string;
  yoga_ne?: string;
  karana?: string;
  karana_ne?: string;
  chandra_rashi?: string;
  chandra_rashi_ne?: string;
  sunrise?: string;
  sunset?: string;
  aayan?: string;
  aayan_ne?: string;
  ayana_mark?: "उ" | "द";
  moonrise?: string;
  moonrise_local?: string;
  moonset?: string;
  moonset_local?: string;
  festivals: string[];
  abhijit?: {
    start_time: string;
    end_time: string;
    solar_noon?: string;
  };
  /** Embedded full panchanga (present when the month is fetched with `full=true`). */
  panchanga?: CalendarDayDetail;
  mode?: "ephemeris";
  query_instant?: string;
  /** Leading/trailing cells from adjacent BS months in the home grid. */
  outsideMonth?: boolean;
  /** BS day-of-month when enriched from nested panchanga (API alias). */
  day_bs?: number;
  is_public_holiday?: boolean;
}

export interface PatroMonth {
  bs_year: number;
  bs_month: number;
  bs_month_name: string;
  bs_month_name_ne?: string;
  month_start: string;
  month_length: number;
  location: object;
  days: PatroDay[];
}

export interface PatroDay {
  bs_day: number;
  date: string;
  festivals: Festival[];
  panchanga?: {
    vaara?: { name_ne?: string; name_english?: string };
    tithi?: { name?: string; name_ne?: string };
    nakshatra?: { name?: string };
    sunrise?: string;
    sunset?: string;
    markers?: { is_public_holiday?: boolean };
  };
  weekday?: string;
  weekday_ne?: string;
  tithi?: string;
  tithi_ne?: string;
  nakshatra?: string;
  sunrise?: string;
  sunset?: string;
}

export interface HolidaysResponse {
  bs_year?: number;
  era: string;
  gregorian_range?: { start: string; end: string };
  count: number;
  holidays: Holiday[];
}

export interface FestivalsResponse {
  bs_year?: number;
  era: string;
  gregorian_range?: { start: string; end: string };
  count: number;
  festivals: Festival[];
}

export interface KundaliResponse {
  date_bs?: string;
  date_ad?: string;
  location?: PanchangaDay["location"];
  sunrise?: { local_time_short?: string };
  planets?: Record<string, PlanetInfo | string>;
  planets_detail?: Record<string, PlanetInfo & { rashi_name?: string; is_retrograde?: boolean }>;
  lagna_note?: string;
}

export interface CalendarHeader {
  bikram_sambat: string;
  bikram_sambat_month: string;
  gregorian: string;
  lunar_month: string;
  shaka_sambat: string;
  nepal_sambat: string;
}

export interface VastuSketchResponse {
  storeys: 1 | 2 | 3;
  assignments: SpaceAssignment[];
  leftover: PlannedSpace[];
  ayadi: VastuAyadi;
  entrance: { facing: VastuSketchRequest["facing"]; preferred_corner: VastuDirectionId };
}

export type PatroSolarCorrection = {
  minutes?: number;
  seconds?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
  label_ne?: string;
  name_ne?: string;
};

export type PanchangaAnga = {
  name?: string;
  name_ne?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
  next?: PanchangaAnga;
};

export type PlanetBlock = {
  longitude?: number;
  rashi?: number;
  rashi_name?: string;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
};

export type SolarCorrection = {
  minutes?: number;
  seconds?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
};

export type MonthBrowseEra = Era;

/** One BS month's metadata in the year-wheel payload (no per-day grid). */
export interface YearWheelMonth {
  year_bs: number;
  month_bs: number;
  month_name?: string;
  month_name_ne?: string;
  month_start_ad?: string;
  month_length: number;
  first_weekday?: number;
  limits?: PatroApiLimits;
}

/** One day of the year-wheel payload — the trimmed wheel state, nothing else. */
export interface YearWheelCalendarDay {
  day: number;
  date_ad: string;
  sunrise?: string;
  sunset?: string;
  panchanga?: PanchangaDay;
}

/**
 * A whole BS year of wheel state in one response. `wheel=true` trims each day to
 * what the wheel actually draws (angas, planets, lagna, rashi spans) and drops
 * the duplicated per-day month grids — the difference between ~2 MB and ~20 MB.
 */
export interface YearWheelCalendar {
  year_bs: number;
  year_length: number;
  location?: PanchangaDay["location"];
  months: YearWheelMonth[];
  calendar: YearWheelCalendarDay[];
}

/** @deprecated Legacy shape; API returns {@link TropicalSeasonsResponse.boundaries}. */
export interface TropicalSeasonSegment {
  name_ne?: string;
  name_en?: string;
  start_ad?: string;
  end_ad?: string;
}
