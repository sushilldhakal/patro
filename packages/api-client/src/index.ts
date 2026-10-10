/**
 * API response types and pure helpers shared by the website and the mobile app.
 * Moved here from the two apps' lib/api.ts, where they had been kept as
 * identical hand-copied twins. Each app's api.ts re-exports them.
 */

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
