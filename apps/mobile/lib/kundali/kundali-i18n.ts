/**
 * Kundali copy aligned with web `src/i18n/{ne,en}.json` → `kundali.*`.
 * Keep in sync when web strings change.
 */
export const KUNDALI_I18N = {
  birth_panchanga: ["जन्म पञ्चाङ्ग", "Birth almanac"],
  tithi: ["तिथि", "Tithi"],
  nakshatra: ["नक्षत्र", "Nakshatra"],
  yoga: ["योग", "Yoga"],
  karana: ["करण", "Karana"],
  choghadiya: ["चौघडिया", "Choghadiya"],
  lagna: ["लग्न", "Lagna"],
  navamsha_lagna: ["नवांश लग्न", "Navamsha Lagna"],
  rashi_moon: ["राशि (चन्द्र)", "Rashi (Moon)"],
  sunrise: ["सूर्योदय", "Sunrise"],
  sunset: ["सूर्यास्त", "Sunset"],
  ishta_kala: ["इष्ट काल", "Ishta Kala"],
  ahoratri_ishta_kala: ["अहोरात्र इष्ट काल", "Ahoratri Ishta Kala"],
  sun_sign: ["सूर्य राशि", "Sun sign"],
  avakahada: ["अवकहडा", "Avakahada"],
  rashi_paya: ["राशि पाय", "Rashi Paya"],
  nakshatra_paya: ["नक्षत्र पाय", "Nakshatra Paya"],
  tattva: ["तत्त्व", "Tattva"],
  yunja: ["युञ्ज", "Yunja"],
  vashya: ["वश्य", "Vashya"],
  tara: ["तारा", "Tara"],
  akshara: ["अक्षर", "Akshara"],
  gana: ["गण", "Gana"],
  nadi: ["नाडी", "Nadi"],
  asana: ["आसन", "Asana"],
  yoni: ["योनी", "Yoni"],
  jati: ["जात", "Jati"],
  pada: ["पद", "Pada"],
  choghadiya_shubha: ["शुभ", "auspicious"],
  choghadiya_ashubha: ["अशुभ", "inauspicious"],
  choghadiya_samanya: ["सामान्य", "neutral"],
  weekday: ["वार", "Weekday"],
  ayana: ["अयन", "Ayana"],
  surya_nakshatra: ["सूर्य नक्षत्र", "Sun nakshatra"],
  nav_overview: ["जन्म पञ्चाङ्ग / कुण्डली चक्र", "Birth Almanac / Charts"],
  nav_graha_details: ["ग्रह विवरण", "Graha Details"],
  nav_yoga: ["कुण्डली योग", "Kundali Yoga"],
  yoga_reference_catalog: ["योग सन्दर्भ सूची (१६२ संयोग)", "Yoga reference catalog (162 combinations)"],
  yoga_reference_load_error: ["सन्दर्भ सूची लोड हुन सकेन।", "Could not load the reference catalog."],
  yoga_reference_no_match: ["कुनै मिल्ने संयोग भेटिएन।", "No matching combination."],
  yoga_reference_grouped_ids_note: [
    "स्रोतअनुसार समूह ID (जस्तै ३३–४४, ७५–१०६) यथावत् राखिएको छ।",
    "Grouped IDs (e.g. 33–44, 75–106) are kept as in the source.",
  ],
  loading: ["लोड हुँदै…", "Loading…"],
  dasha_begin: ["आरम्भ", "Begin"],
  dasha_end: ["अन्त", "End"],
  dasha_from: ["देखि", "From"],
  dasha_to: ["सम्म", "To"],
  dasha_maha: ["महादशा", "Maha Dasha"],
  dasha_running: ["चलिरहेको", "Running"],
  dasha_running_now: ["चलिरहेको दशा", "Running dasha"],
  dasha_total: ["कुल", "Total"],
  dasha_left: ["बाँकी", "Left"],
  dasha_full_timeline: ["पूरा समयरेखा", "Full timeline"],
  mahadasha_at_birth: ["जन्मकालीन महादशा", "Mahadasha at birth"],
  dasha_balance: ["बाँकी अवधि", "Balance"],
  dasha_unavailable: ["दशा विवरण उपलब्ध छैन।", "Dasha details are not available."],
  nav_dasha: ["दशा", "Dasha"],
  nav_bala: ["बल", "Bala"],
  dasha_system_vimshottari: ["विंशोत्तरी", "Vimshottari"],
  dasha_system_tribhagi: ["त्रिभागि", "Tribhagi"],
  dasha_system_yogini: ["योगिनी", "Yogini"],
  nav_shadbala: ["षड्बल", "Shadbala"],
  shadbala_planetary_strength_virupas: ["षड्बल — ग्रह शक्ति (विरुप)", "Shadbala — Planetary Strength (Virupas)"],
  strongest_planet: ["सबैभन्दा बलियो ग्रह", "Strongest planet"],
  weakest_planet: ["सबैभन्दा कमजोर ग्रह", "Weakest planet"],
  average_rupas: ["औसत रूप", "Average Rupas"],
  virupas: ["विरुप", "Virupas"],
  planets_meeting_threshold: ["न्यूनतम पूरा गर्ने ग्रह", "Planets meeting threshold"],
  adequate_or_stronger: ["पर्याप्त वा बलियो", "Adequate or stronger"],
  shadbala_table: ["षड्बल तालिका", "Shadbala table"],
  strength_skyline: ["ग्रह बल तुलना", "Strength skyline"],
  strength_skyline_hint: [
    "प्रत्येक स्तम्भ एउटा ग्रह हो, छ वटा बलले थुपारिएको। सुनौलो थोप्लो रेखा त्यस ग्रहको आफ्नै न्यूनतम आवश्यकता हो। तल विवरण हेर्न स्तम्भ थिच्नुहोस्।",
    "Each column is one planet, stacked by the six balas. The dashed gold tick is that planet's own required minimum. Tap a column to inspect it below.",
  ],
  scale_virupas: ["विरुप", "Virupas"],
  scale_rupas: ["रूप", "Rupas"],
  scale_absolute: ["पूर्ण अनुपात", "Absolute"],
  scale_vs_required: ["आवश्यकता अनुसार", "vs Requirement"],
  meets_required: ["आवश्यकता पूरा", "Meets required minimum"],
  below_required: ["आवश्यकताभन्दा कम", "Below required minimum"],
  required_minimum: ["न्यूनतम आवश्यक", "Required minimum"],
  select_a_planet: ["ग्रह छान्नुहोस्", "Select a planet"],
  of_required: ["{{virupas}} विरुप · आवश्यकताको {{percent}}%", "{{virupas}} virupas · {{percent}}% of required"],
  bala: ["बल", "Bala"],
  status: ["स्थिति", "Status"],
  virupas_per_bala_note: [
    "प्रत्येक बलका विरुप; स्थान र काल विस्तार गर्नुहोस् (काल अन्तर्गत युद्ध)। दुई tara graha १° भित्र हुँदा युद्ध गणना हुन्छ — धेरैजसो कुण्डलीमा ०.०० देखिन्छ किनभने युद्ध दुर्लभ हुन्छ।",
    "Virupas per bala; expand Sthana and Kala for component strengths (Yuddha under Kala). Yuddha is computed when two tara grahas are within 1° — most charts show 0.00 because wars are rare.",
  ],
  bhava_pct_row_note: [
    "भाव (%) ले प्रत्येक ग्रहले शासन गर्ने भावको औसत शक्ति देखाउँछ; पूर्ण तालिकाका लागि भाव बल हेर्नुहोस्।",
    "Bhava (in %) is the mean house-strength of bhavas ruled by each planet; see the Bhava Bala submenu for the full house table.",
  ],
  graha_yuddha_detected: ["ग्रह युद्ध भयो:", "Graha Yuddha detected:"],
  nav_bhava_bala: ["भाव बल", "Bhava Bala"],
  bhava_bala_house_strength_virupas: ["भाव बल — भाव शक्ति (विरुप)", "Bhava Bala — House Strength (Virupas)"],
  bhava_bala_intro: [
    "भावाधिपति (स्वामीको षड्बल) + भाव दिशा + भाव दृष्टि। समपूर्ण राशि भाव; {{ref}} विरुप (७ रूप) = १००%।",
    "Bhavadhipati (lord's Shadbala) + Bhava Disha + Bhava Drishti. Whole-sign houses; {{ref}} virupas (7 rupas) = 100%.",
  ],
  strongest_house: ["सबैभन्दा बलियो भाव", "Strongest house"],
  weakest_house: ["सबैभन्दा कमजोर भाव", "Weakest house"],
  house: ["भाव", "House"],
  lord: ["स्वामी", "Lord"],
  bhavadhipati: ["भावाधिपति", "Bhavadhipati"],
  disha: ["दिशा", "Disha"],
  drishti: ["दृष्टि", "Drishti"],
  total_pinda: ["कुल पिण्ड", "Total Pinda"],
  rupas: ["रूप", "Rupas"],
  bhava_percent: ["भाव (%)", "Bhava (%)"],
  explore_houses: ["आफ्ना भावहरू हेर्नुहोस्", "Explore your houses"],
  explore_houses_hint: [
    "कुनै पनि भावमा थिचेर त्यसको शक्ति, स्वामी, अर्थ र बासिन्दा हेर्नुहोस्।",
    "Tap any house in the chart to inspect its strength, its lord, what it signifies, and who occupies it.",
  ],
  explore_houses_legend: [
    "प्रत्येक भाव आफ्नो कुल भाव बलले रङ्गिएको छ — केसरिया बलियो, मध्यम औसत, र सिन्दूर कमजोर। पूरा विवरण हेर्न कुनै भाव थिच्नुहोस्।",
    "Each house is tinted by its total Bhava Bala — saffron where the house is well-supported, muted where it is average, and vermilion where it is comparatively weak. Tap any house to read its full breakdown.",
  ],
  ruled_by: ["स्वामी", "Ruled by"],
  house_rank: ["क्रम #{{rank}} / {{total}}", "Rank #{{rank}} / {{total}}"],
  kendra: ["केन्द्र", "Kendra"],
  trikona: ["त्रिकोण", "Trikona"],
  dusthana: ["दुःस्थान", "Dusthana"],
  upachaya: ["उपचय", "Upachaya"],
  very_strong: ["अति बलियो", "Very strong"],
  average_strength: ["औसत", "Average"],
  signifies: ["अर्थ", "Signifies"],
  occupants: ["बासिन्दा", "Occupants"],
  no_occupants: ["यस भावमा कुनै ग्रह छैन", "No planets occupy this house"],
  previous_house: ["अघिल्लो भाव", "Previous house"],
  next_house: ["अर्को भाव", "Next house"],
  bhava_disha: ["भाव दिशा", "Bhava Disha"],
  bhava_drishti: ["भाव दृष्टि", "Bhava Drishti"],
  bhava_bala_chart: ["भाव बल चक्र", "Bhava Bala chart"],
  virupas_rupas: ["{{virupas}} विरुप · {{rupas}} रूप", "{{virupas}} virupas · {{rupas}} rupas"],
  nav_ashtakavarga: ["अष्टकवर्ग", "Ashtakavarga"],
  ashtakavarga: ["अष्टकवर्ग", "Ashtakavarga"],
  ashtakavarga_intro: [
    "पाराशरी बिन्दु तालिका प्रति राशि। सर्व* ले सात ग्रहको योग जोड्छ (लग्न बाहेक)। शोध्य चартमा त्रिकोण र एकाधिपत्य शोधन लागू हुन्छ।",
    "Parashari bindu tables per rashi. Sarv* sums the seven grahas (excludes Lagna). Reduced charts apply Trikona then Ekadhipatya Shodhana.",
  ],
  reduced_ashtakavarga: ["शोध्य अष्टकवर्ग", "Reduced Ashtakavarga"],
  shodhya_pinda: ["शोध्य पिण्ड", "Shodhya Pinda"],
  rashi: ["राशि", "Rashi"],
  sarv: ["सर्व*", "Sarv*"],
  sarvashtaka: ["*सर्वाष्टक", "*Sarvashtaka"],
  nav_vimshopaka: ["विंशोपक बल", "Vimshopaka Bala"],
  vimshopaka_bala: ["विंशोपक बल", "Vimshopaka Bala"],
  nav_shanti_vidhi: ["शान्ति विधि", "Shanti Vidhi"],
  nav_analysis: ["ज्योतिष विश्लेषण", "Astrological Analysis"],
  report_title: ["ज्योतिष विश्लेषण", "Astrological Analysis"],
  report_intro: [
    "तपाईंको जन्म मिति, समय र स्थानबाट स्वतः तयार पारिएको सरल, सन्तुलित विश्लेषण — स्वभाव, करियर, सम्बन्ध, स्वास्थ्य, समय र योग। हरेक खण्डमा कति भरपर्दो छ भन्ने देखाइन्छ।",
    "A balanced reading built automatically from birth date, time and place — nature, career, relationships, health, timing and yogas. Each section shows how dependable it is.",
  ],
  report_regenerate: ["पुन: बनाउनुहोस्", "Regenerate"],
  report_streaming_progress: ["{{total}} मध्ये {{done}} लेखिँदै…", "Writing {{done}}/{{total}}…"],
  report_streaming_reading: ["कुण्डली पढिँदै…", "Reading the chart…"],
  report_confidence_label: ["कति भरपर्दो:", "Confidence:"],
  report_confidence_strong: ["बलियो", "Strong"],
  report_confidence_moderate: ["मध्यम", "Moderate"],
  report_confidence_mixed: ["मिश्रित / सशर्त", "Mixed / conditional"],
  report_confidence_tentative: ["अनिश्चित", "Tentative"],
  report_factors_based: ["{{count}} कुरामा आधारित", "Based on {{count}} factors"],
  report_idle_hint: [
    "व्यक्तित्व, करियर, सम्बन्ध, स्वास्थ्य, दशा-समय र योग — प्रत्येक अन्तर्दृष्टि विश्वास स्तरसहित।",
    "Personality, career, relationships, health, dasha timing and yogas — each insight with a confidence level.",
  ],
  report_loaded_from_cache: [
    "सुरक्षित विवरणबाट लोड — जन्म मिति, समय र स्थान उही छ।",
    "Loaded from saved report — birth date, time and place unchanged.",
  ],
  report_error_generic: ["विवरण बनाउन सकिएन।", "Could not generate the report."],
  report_meta_lagna: ["लग्न", "Lagna"],
  report_meta_nakshatra: ["नक्षत्र", "Nakshatra"],
  report_meta_sun: ["सूर्य", "Sun"],
  report_meta_mahadasha: ["महादशा", "Mahadasha"],
  report_meta_moon_sign: ["चन्द्र राशि", "Moon sign"],
  report_meta_pada: ["चरण {{pada}}", "pada {{pada}}"],
  report_meta_antar_ends: ["अन्तर समाप्त {{date}}", "antar ends {{date}}"],
} as const;

export type KundaliI18nKey = keyof typeof KUNDALI_I18N;

export function kundaliLabel(key: KundaliI18nKey, lang: "ne" | "en"): string {
  const pair = KUNDALI_I18N[key];
  return lang === "en" ? pair[1] : pair[0];
}

export function kundaliLabelVars(
  key: KundaliI18nKey,
  lang: "ne" | "en",
  vars: Record<string, string | number>,
): string {
  let s = kundaliLabel(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
  }
  return s;
}

export function bilingualKundali(
  lang: "ne" | "en",
  ne: string,
  en: string,
): string {
  return lang === "en" ? en : ne;
}

export function formatChoghadiyaAtBirth(
  lang: "ne" | "en",
  row: { nameNe: string; nameEn?: string; quality: string },
): string {
  const name = lang === "en" ? row.nameEn ?? row.nameNe : row.nameNe;
  let qualityLabel = row.quality;
  if (row.quality === "शुभ") qualityLabel = kundaliLabel("choghadiya_shubha", lang);
  else if (row.quality === "अशुभ") qualityLabel = kundaliLabel("choghadiya_ashubha", lang);
  else if (row.quality === "सामान्य") qualityLabel = kundaliLabel("choghadiya_samanya", lang);
  return `${name} (${qualityLabel})`;
}
