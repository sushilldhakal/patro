/**
 * Per-ceremony sāit explanation — the "how these dates are computed" paragraph
 * and the classical rule list — shown on every /sait page and the vivāha page.
 *
 * This lives in the frontend on purpose: the text must ALWAYS render, with no
 * dependency on a backend deploy. These dates are our own system's ephemeris
 * computation — NOT the Nepal Panchanga Nirnayak Samiti list or any external
 * listing. Keep the wording in sync with the engine (patro).
 */
import type { SaitCategoryId } from "./sait-data";

export interface BilingualText {
  ne: string;
  en: string;
}

/** Muhūrta Chintāmaṇi 1.34 — mahā-doṣa list (Vyatīpāta, Bhadrā/Viṣṭi, Vaidhṛti, …). */
const MC_1_34_SHLOKA =
  "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥ ३४ ॥";

const MC_1_34_GLOSS = "sait.x.mc_1_34_gloss";

/** Muhūrta Chintāmaṇi 2.36 — Agni-vāsa (abode of fire) for havana/homa. */
const MC_2_36_AGNIVASA_SHLOKA =
  "सैका तिथिवारयुता कृताप्ता शेषे गुणेऽग्ने भुवि वह्निवासः । सौख्याय होमे शशिगुग्मशेषे प्राणार्थनाशौ दिवि भूतले च ॥ ३६ ॥ [४५८]";

const MC_2_36_AGNIVASA_GLOSS = "sait.x.mc_2_36_agnivasa_gloss";

/**
 * Muhūrta Chintāmaṇi 2.36 — Pīyūṣadhārā commentary: detailed remainder → abode → fruit.
 */
const MC_2_36_AGNIVASA_PHALA_SHLOKA =
  "तिथिवारयुतिः सैका वेदभक्तावशेषकात् । निवासोऽग्नेर्व्यौम्नि रूपे वित्तप्राणविनाशकः ॥ पाताले द्विकशेषेण धनसंचयनाशकः । गुणवेदावशेषेण भूमौ विपुलसौख्यदः ॥ [४५८]";

const MC_2_36_AGNIVASA_PHALA_GLOSS = "sait.x.mc_2_36_agnivasa_phala_gloss";

/** Muhūrta Chintāmaṇi 1.3 — presiding deities (lords) of the tithis. */
const MC_1_3_TITHISHA_SHLOKA =
  "तिथ्यीश वह्निर्द्द्वौ गौरी गणेशोऽहिगुहो रविः । शिवो दुर्गांतको विश्वे हरिः कामः शिवः शशी ॥ ३ ॥";

const MC_1_3_TITHISHA_GLOSS = "sait.x.mc_1_3_tithisha_gloss";

/**
 * Muhūrta Chintāmaṇi 2.36 (commentary/expansion) — for Nitya (regular) and
 * Naimittika (occasional) rites the Agni-vāsa check is not strictly mandatory.
 */
const MC_2_36_NITYA_SHLOKA =
  "नित्ये नैमित्तिके कार्ये न चाब्दे मुनिभिः स्मृतः । संस्कारेषु विचारोऽस्य न कार्यो नापि वैष्णवे ॥";

const MC_2_36_NITYA_GLOSS = "sait.x.mc_2_36_nitya_gloss";

/**
 * Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa) — annaprāśana month/age,
 * nakṣatra class, barred tithis and barred weekdays in a single verse.
 */
const MC_5_16_SHLOKA =
  "युग्ममासे पुंसोऽयुग्मे स्त्रीणां मृदुलघुचरस्थिरोडुषु । रिक्तानन्दाष्टमीदर्शद्वादशीार्ककुजार्किभिर्विना ॥ १६ ॥";

const MC_5_16_GLOSS = "sait.x.mc_5_16_gloss";

/** Muhūrta Chintāmaṇi 5.17 — lagna-śuddhi (planetary placement) for annaprāśana. */
const MC_5_17_SHLOKA =
  "केन्द्रत्रिकोणायगतैः शुभैः खेटैः खशून्यगे । पापैरुपचयस्थैश्च लग्नेन्दुमृतिषष्ठगैः ॥ १७ ॥";

const MC_5_17_GLOSS = "sait.x.mc_5_17_gloss";

/**
 * Muhūrta Chintāmaṇi 5 (commentary on 46–47) — time-bound saṃskāras are
 * exempt from the Guru/Śukra combustion (asta) doṣa.
 */
const MC_5_ASTA_CONTEXT =
  "सीमन्त-जातकर्म-नामकरण-अन्नप्राशनादिकं कर्म गुरु-शुक्रास्तादावपि कार्यम् ।";

const MC_5_ASTA_GLOSS = "sait.x.mc_5_asta_gloss";

/** Muhūrta Chintāmaṇi — gṛha-praveśa months, ayana, lagna and nakṣatra classes. */
const MC_GP_MONTH_SHLOKA =
  "ज्येष्ठे माघे फाल्गुने वैशाखे सौम्ययने स्थिरे लग्ने । मृदुध्रुवमिश्रक्षिप्रचरोडुषु गृहप्रवेशः स्यात् ॥";

const MC_GP_MONTH_GLOSS = "sait.x.mc_gp_month_gloss";

/** Muhūrta Chintāmaṇi — the Sun-sign result (lābha/mṛti/dhana) for house rites. */
const MC_GP_SUN_SHLOKA =
  "चैत्रेऽर्के मेषगे लाभो ज्येष्ठे वृषगते मृतिः । भाद्रे सिंहाशगे लाभः कार्त्तिके तुळगे मृतिः ॥ मृगशीर्षे वृश्चिकगे मृतिः पौषे मकरगे धनम् । माघे कुम्भगते लाभः फाल्गुने मीनगे मृतिः ॥";

const MC_GP_SUN_GLOSS = "sait.x.mc_gp_sun_gloss";

/** Muhūrta Chintāmaṇi — tithis barred in the gṛha-chakra (rikta, Amāvasyā, Pratipadā). */
const MC_GP_TITHI_SHLOKA = "वर्ज्या रिक्तामाप्रतिपदोऽपि गृहचक्रे ॥";

const MC_GP_TITHI_GLOSS = "sait.x.mc_gp_tithi_gloss";

/** Nakṣatra pāda of the gṛha-praveśa verse — the auspicious star classes. */
const MC_GP_NAK_SHLOKA = "मृदुध्रुवमिश्रक्षिप्रचरोडुषु गृहप्रवेशः स्यात् ॥";

const MC_GP_NAK_GLOSS = "sait.x.mc_gp_nak_gloss";

/** Muhūrta Chintāmaṇi 12 (Vāstu, quoting Vasiṣṭha) — fixed lagna for house works. */
const MC_GP_LAGNA_SHLOKA =
  "स्थिरलग्ने गृहं कार्यं चरं च न कदाचन । द्विस्वभावं भवेच्छस्तं लग्नदोषविवर्जितम् ॥";

const MC_GP_LAGNA_GLOSS = "sait.x.mc_gp_lagna_gloss";

/** Muhūrta Chintāmaṇi 1.32 — avoid the days around an eclipse for auspicious work. */
const MC_GP_GRAHANA_SHLOKA =
  "सर्वस्मिन्विधुपापयुक्तनलवाधर्चे निशार्धाटीत्र्यंशं वै कुनवांशकं ग्रहणतः पूर्वं दिनानां त्रयम् ।";

const MC_GP_GRAHANA_GLOSS = "sait.x.mc_gp_grahana_gloss";

/**
 * One rule the engine applies. Every field except `shloka` holds a catalogue
 * key, not text — the copy lives in src/i18n/strings.ts and is resolved with
 * `t()` where the rule is rendered. `shloka` is the Sanskrit verse itself
 * (Devanāgarī), which reads the same in either UI language.
 */
export interface SaitRuleEntry {
  /**
   * Stable id matching the backend's `muhurta_engine.TOGGLEABLE_RULE_IDS`. When
   * present, the rule can be switched off on the page and the engine recomputes
   * the dates without it. Rules without an id are always applied.
   */
  id?: string;
  /** Catalogue key for the plain-language rule. */
  text: string;
  /** Catalogue key for the short citation. */
  source?: string;
  shloka?: string;
  /** Catalogue key for the translation of `shloka`. */
  gloss?: string;
}

export interface SaitContent {
  /** Catalogue key for the ceremony blurb. */
  description: string;
  /** The "text line" explaining how the dates are calculated (intro paragraph). */
  method: BilingualText;
  /** The classical rules the engine applies for this ceremony. */
  rules: SaitRuleEntry[];
  requiresBirthDate?: boolean;
}

const MUHURTA_INTRO: BilingualText = {
  ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले जेपीएल (NASA को Jet Propulsion Laboratory) बाट गणना गर्छ — कुनै बाह्य सूची पछ्याइएको छैन। प्रत्येक दिनको सूर्योदयदेखि अर्को सूर्योदयसम्म हरेक अन्तरालमा तिथि, नक्षत्र, योग, करण, वार र लग्न निकालेर तलका शास्त्रीय नियमहरू लगाइन्छ। कुनै एक शुद्ध लग्न विण्डो भेटिए मात्र दिन प्रकाशित हुन्छ।",
  en: "These dates are computed by our own system from JPL (NASA's Jet Propulsion Laboratory) — no external list is followed. For each day the engine derives tithi, nakṣatra, yoga, karaṇa, vāra and lagna at every interval from sunrise to the next sunrise, then applies the classical rules below. A day is published only if at least one clean lagna window survives.",
};

const DAYTIME_INTRO: BilingualText = {
  ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले जेपीएल (NASA को Jet Propulsion Laboratory) बाट गणना गर्छ — कुनै बाह्य सूची पछ्याइएको छैन। प्रत्येक दिनको सूर्योदयदेखि सूर्यास्तसम्म हरेक अन्तरालमा तिथि, नक्षत्र, योग, करण, वार र लग्न निकालेर तलका नियमहरू लगाइन्छ। दिनको शुद्ध मुहूर्त भेटिए मात्र दिन प्रकाशित हुन्छ।",
  en: "These dates are computed by our own system from JPL (NASA's Jet Propulsion Laboratory) — no external list is followed. For each day the engine derives tithi, nakṣatra, yoga, karaṇa, vāra and lagna at every interval from sunrise to sunset, then applies the rules below. A day is published only if a clean daytime muhūrta survives.",
};

export const SAIT_RULES_CONTENT: Record<SaitCategoryId, SaitContent> = {
  vivah: {
    description: "sait.descriptions.vivah",
    method: MUHURTA_INTRO,
    rules: [
      {
        id: "month",
        text: "sait.x.vivah_month",
        source: "sait.x.vivah_month_source",
        shloka: "मृगमाघफल्गुनवैशाखज्येष्ठाषाढेषु शोभनम् । मेषवृषमिथुनवृश्चिकमकरकुम्भे स्थिते सवितरि ॥ १ ॥ [६८०]",
        gloss: "sait.x.vivah_month_gloss",
      },
      {
        id: "solar-month",
        text: "sait.x.vivah_solar_month",
        source: "sait.x.vivah_month_source",
        shloka: "मेषवृषमिथुनवृश्चिकमकरकुम्भे स्थिते सवितरि ॥",
        gloss: "sait.x.vivah_solar_month_gloss",
      },
      {
        id: "tithi",
        text: "sait.x.vivah_tithi",
        source: "sait.x.vivah_tithi_source",
        shloka: "चतुर्थी षष्ठी अष्टमी नवमी द्वादशी चतुर्दशी एताः पक्षरन्ध्रसंज्ञिस्ततियो ज्ञेयाः ।",
        gloss: "sait.x.vivah_tithi_gloss",
      },
      {
        id: "nakshatra",
        text: "sait.x.vivah_nakshatra",
        source: "sait.x.vivah_nakshatra_source",
        shloka: "मृगशीर्षहस्तमूलानुराधा मघारोहिणी रेवती । उत्तरात्रयस्वात्यः स्युर्विवाहे दश सप्त च ॥",
        gloss: "sait.x.vivah_nakshatra_gloss",
      },
      {
        id: "yoga",
        text: "sait.x.vivah_yoga",
        source: "sait.x.vivah_yoga_source",
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        id: "karana",
        text: "sait.x.vivah_karana",
        source: "sait.x.vivah_karana_source",
        shloka: "शुक्ले पूर्वार्धोऽष्टम्यर्कैकदश्या चतुर्ध्या परार्धं । कृष्णेऽन्त्यार्धं स्यात्तृतीयादशम्योः पूर्वभागे सप्तमीशम्भुतिथ्योः ॥",
        gloss: "sait.x.vivah_karana_gloss",
      },
      {
        id: "vara",
        text: "sait.x.vivah_vara",
        source: "sait.x.vivah_vara_source",
        shloka: "क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: "sait.x.vivah_vara_gloss",
      },
      {
        id: "dosha",
        text: "sait.x.vivah_dosha",
        source: "sait.x.vivah_dosha_source",
        shloka: "सप्ताष्टबाणनगाब्धिभूतवेदेषु द्वादशसु च। सूर्यादीनां पुरः पश्चाल्लत्ताख्याः स्युरमी क्रमात् ॥ १९ ॥ [७३७]",
        gloss: "sait.x.vivah_dosha_gloss",
      },
      {
        id: "graha",
        text: "sait.x.vivah_graha",
        source: "sait.x.vivah_graha_source",
        shloka: "तत्रास्तात्प्राक् सप्ताहं वार्धक्यम् । उदयोत्तरं सप्ताहं बाल्यमिति मध्यमः पक्षः ॥",
        gloss: "sait.x.vivah_graha_gloss",
      },
      {
        id: "simhastha",
        text: "sait.x.vivah_simhastha",
        source: "sait.x.vivah_simhastha_source",
        shloka: "मघानक्षत्रगते सिंहाशगते च गुरौ सर्वदेशेषु सर्वमाङ्गलिककर्मणां निषेधः ॥",
        gloss: "sait.x.vivah_simhastha_gloss",
      },
      {
        id: "kshaya-paksha",
        text: "sait.x.vivah_kshaya_paksha",
        source: "sait.x.vivah_kshaya_paksha_source",
        shloka: "त्रयोदशदिने पक्षे यस्मिन् पक्षे तिथिक्षयद्वयम् स त्रयोदशादिनात्मकः पक्षोतिनिन्द्यः। तदुक्तं ज्योतिर्निबन्धे— पक्षस्य मध्ये द्वितिथी पतेतां तदा भवेद्रौरवकालयोगः। पक्षे विनष्टे सकलं विनष्टमित्याहुराचार्याः समस्ताः ॥ [३७६]",
        gloss: "sait.x.vivah_kshaya_paksha_gloss",
      },
    ],
  },
  bratabandha: {
    description: "sait.descriptions.bratabandha",
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले जेपीएल (NASA को Jet Propulsion Laboratory) बाट गणना गर्छ — कुनै बाह्य सूची पछ्याइएको छैन। प्रत्येक दिनको सूर्योदयदेखि मध्याह्नसम्म हरेक अन्तरालमा तिथि, नक्षत्र, योग, करण, वार र लग्न निकालेर तलका उपनयन नियमहरू लगाइन्छ। मध्याह्नअघि शुद्ध मुहूर्त भेटिए मात्र दिन प्रकाशित हुन्छ।",
      en: "These dates are computed by our own system from JPL (NASA's Jet Propulsion Laboratory) — no external list is followed. For each day the engine derives tithi, nakṣatra, yoga, karaṇa, vāra and lagna at every interval from sunrise to madhyāhna, then applies the Upanayana rules below. A day is published only if a clean pre-noon muhūrta survives.",
    },
    rules: [
      {
        text: "sait.x.bratabandha_season",
        source: "sait.x.bratabandha_season_source",
        shloka: "माघफल्गुनवैशाखज्येष्ठाषाढेषु शोभनम्। उदीच्यगेऽर्के विप्राणां सति चन्द्रे च शुद्धितः॥",
        gloss: "sait.x.bratabandha_season_gloss",
      },
      {
        id: "tithi",
        text: "sait.x.bratabandha_tithi",
        source: "sait.x.bratabandha_tithi_source",
        shloka: "दशैकादशी द्वादशी द्वितीया तृतीया पञ्चमी दशमीषु।",
        gloss: "sait.x.bratabandha_tithi_gloss",
      },
      {
        id: "galagraha",
        text: "sait.x.bratabandha_galagraha",
        source: "sait.x.bratabandha_galagraha_source",
        shloka:
          "प्रतिपच्च चतुर्थी च सप्तम्यष्टमी तथा । नवमी च त्रयोदश्योश्चतुर्दश्योश्च पूर्णिमा ॥ अमावस्या तथा प्रोक्ता गलग्रहास्तिथयो ज्ञेयाः ।",
        gloss: "sait.x.bratabandha_galagraha_gloss",
      },
      {
        text: "sait.x.bratabandha_nakshatra",
        source: "sait.x.bratabandha_nakshatra_source",
        shloka: "हस्ताश्विपुष्यमृगसौम्यमघोत्तरात्रयं सौम्यमैत्रं मूलं चरं च खलु पुष्यपुनर्वसू च।",
        gloss: "sait.x.bratabandha_nakshatra_gloss",
      },
      {
        id: "vara",
        text: "sait.x.bratabandha_vara",
        source: "sait.x.vivah_vara_source",
        shloka: "रविवारबुधगुरुशुक्रसोमवारेषु क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते।",
        gloss: "sait.x.bratabandha_vara_gloss",
      },
      {
        id: "time-window",
        text: "sait.x.bratabandha_time_window",
        source: "sait.x.bratabandha_galagraha_source",
        shloka: "उपनयनमपराह्वे न कार्यम्।",
        gloss: "sait.x.bratabandha_time_window_gloss",
      },
      {
        id: "graha",
        text: "sait.x.bratabandha_graha",
        source: "sait.x.bratabandha_graha_source",
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: "sait.x.bratabandha_graha_gloss",
      },
      {
        id: "simhastha",
        text: "sait.x.bratabandha_simhastha",
        source: "sait.x.vivah_simhastha_source",
        shloka: "मघानक्षत्रगते सिंहाशगते च गुरौ सर्वदेशेषु सर्वमाङ्गलिककर्मणां निषेधः ॥",
        gloss: "sait.x.vivah_simhastha_gloss",
      },
      {
        id: "yoga",
        text: "sait.x.bratabandha_yoga",
        source: "sait.x.vivah_yoga_source",
        shloka: MC_1_34_SHLOKA,
        gloss: "sait.x.bratabandha_yoga_gloss",
      },
      {
        id: "karana",
        text: "sait.x.bratabandha_karana",
        source: "sait.x.bratabandha_karana_source",
        shloka: MC_1_34_SHLOKA,
        gloss: "sait.x.bratabandha_karana_gloss",
      },
      {
        text: "sait.x.bratabandha_sankranti_eclipse",
        source: "sait.x.bratabandha_sankranti_eclipse_source",
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: "sait.x.bratabandha_sankranti_eclipse_gloss",
      },
      {
        id: "dosha",
        text: "sait.x.bratabandha_dosha",
        source: "sait.x.bratabandha_dosha_source",
        shloka: "सप्ताष्टबाणनगाब्धिभूतवेदेषु द्वादशसु च। सूर्यादीनां पुरः पश्चाल्लत्ताख्याः स्युरमी क्रमात् ॥ १९ ॥ [७३७]",
        gloss: "sait.x.bratabandha_dosha_gloss",
      },
    ],
  },
  "griha-aarambha": {
    description: "sait.descriptions.griha-aarambha",
    method: DAYTIME_INTRO,
    rules: [
      {
        text: "sait.x.griha_aarambha_adhikmasa",
        source: "sait.x.griha_aarambha_adhikmasa_source",
        shloka:
          "उपाकर्मोत्सर्जने अष्टकाश्राद्धानि गृहप्रवेशचूडामौञ्जीबंधविवाहास्तीर्थादि-यात्रा वास्तुकर्मैतान्यधिवर्ज्यानि ।",
        gloss: "sait.x.griha_aarambha_adhikmasa_gloss",
      },
      {
        text: "sait.x.griha_aarambha_time_window",
        source: "sait.x.griha_aarambha_time_window_source",
        shloka:
          "भौमार्कवाररहितैस्तिथिभिश्च शिष्टै- रिक्ताममानुजपितृन् विरजैस्तु विष्टिम् । नक्तं च विद्धमपहाय सुलग्नयोगै- स्तद्वद्विधाय खननादि गृहारम्भणम् ॥ १८ ॥ [९३४]",
        gloss: "sait.x.griha_aarambha_time_window_gloss",
      },
      {
        id: "solar-month",
        text: "sait.x.griha_aarambha_solar_month",
        source: "sait.x.griha_aarambha_solar_month_source",
        shloka:
          "चैत्रेऽर्के मेषगे लाभो ज्येष्ठे वृषगते मृतिः । भाद्रे सिंहाशगे लाभः कार्त्तिके तुळगे मृतिः ॥ मृगशीर्षे वृश्चिकगे मृतिः पौषे मकरगे धनम् । माघे कुम्भगते लाभः फाल्गुने मीनगे मृतिः ॥",
        gloss: "sait.x.griha_aarambha_solar_month_gloss",
      },
      {
        id: "tithi",
        text: "sait.x.griha_aarambha_tithi",
        source: "sait.x.griha_aarambha_tithi_source",
        shloka: MC_GP_TITHI_SHLOKA,
        gloss: "sait.x.griha_aarambha_tithi_gloss",
      },
      {
        id: "nakshatra",
        text: "sait.x.griha_aarambha_nakshatra",
        source: "sait.x.griha_aarambha_nakshatra_source",
        shloka: "मृदुकुध्रुववारुणमारुतधनिष्ठाकरतिष्यैः । गृहमारम्भणं शुभदं खातविधेर्वास्तुपूजा च ॥ १५ ॥",
        gloss: "sait.x.griha_aarambha_nakshatra_gloss",
      },
      {
        id: "vara",
        text: "sait.x.griha_aarambha_vara",
        source: "sait.x.griha_aarambha_vara_source",
        shloka: "वर्ज्या रविभौमरिताः पर्वामाप्रतिपदोऽपि गृहचक्रे । क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: "sait.x.griha_aarambha_vara_gloss",
      },
      {
        id: "graha",
        text: "sait.x.griha_aarambha_graha",
        source: "sait.x.griha_aarambha_graha_source",
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: "sait.x.griha_aarambha_graha_gloss",
      },
      {
        id: "yoga",
        text: "sait.x.griha_aarambha_yoga",
        source: "sait.x.vivah_yoga_source",
        shloka:
          "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥",
        gloss: "sait.x.griha_aarambha_yoga_gloss",
      },
      {
        id: "karana",
        text: "sait.x.griha_aarambha_karana",
        source: "sait.x.vivah_yoga_source",
        shloka:
          "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥",
        gloss: "sait.x.bratabandha_karana_gloss",
      },
      {
        id: "lagna",
        text: "sait.x.griha_aarambha_lagna",
        source: "sait.x.griha_aarambha_lagna_source",
        shloka:
          "स्थिरलग्ने गृहं कार्यं चरं च न कदाचन । द्विस्वभावं भवेच्छस्तं लग्नदोषविवर्जितम् ॥",
        gloss: "sait.x.griha_aarambha_lagna_gloss",
      },
      {
        id: "lagna-strength",
        text: "sait.x.griha_aarambha_lagna_strength",
        source: "sait.x.griha_aarambha_lagna_strength_source",
        shloka:
          "लग्ने सुरेज्ये सप्तमगे च सूर्ये बुधे चतुर्थे भृगुजे त्रिजेऽर्के। शतं भवेत्तत्र गृहस्य चायुस्तथापरं वर्षशतं वदन्ति ॥ २२ ॥",
        gloss: "sait.x.griha_aarambha_lagna_strength_gloss",
      },
      {
        text: "sait.x.griha_aarambha_durmuhurta",
        source: "sait.x.griha_aarambha_durmuhurta_source",
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: "sait.x.griha_aarambha_durmuhurta_gloss",
      },
      {
        text: "sait.x.griha_aarambha_chaturmasa",
        source: "sait.x.griha_aarambha_chaturmasa_source",
        gloss: "sait.x.griha_aarambha_chaturmasa_gloss",
      },
    ],
  },
  "griha-pravesh": {
    description: "sait.descriptions.griha-pravesh",
    method: MUHURTA_INTRO,
    rules: [
      {
        text: "sait.x.griha_pravesh_month",
        source: "sait.x.griha_pravesh_month_source",
        shloka: MC_GP_MONTH_SHLOKA,
        gloss: MC_GP_MONTH_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_surya_bala",
        source: "sait.x.griha_pravesh_surya_bala_source",
        shloka: MC_GP_SUN_SHLOKA,
        gloss: MC_GP_SUN_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_tithi",
        source: "sait.x.griha_pravesh_tithi_source",
        shloka: MC_GP_TITHI_SHLOKA,
        gloss: MC_GP_TITHI_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_nakshatra",
        source: "sait.x.griha_pravesh_nakshatra_source",
        shloka: MC_GP_NAK_SHLOKA,
        gloss: MC_GP_NAK_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_yoga_karana",
        source: "sait.x.vivah_yoga_source",
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_graha",
        source: "sait.x.griha_pravesh_graha_source",
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: "sait.x.griha_pravesh_graha_gloss",
      },
      {
        text: "sait.x.griha_pravesh_lagna",
        source: "sait.x.griha_pravesh_lagna_source",
        shloka: MC_GP_LAGNA_SHLOKA,
        gloss: MC_GP_LAGNA_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_dosha",
        source: "sait.x.griha_pravesh_dosha_source",
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: MC_GP_GRAHANA_GLOSS,
      },
    ],
  },
  "byaparik-pratisthan": {
    description: "sait.descriptions.byaparik-pratisthan",
    method: DAYTIME_INTRO,
    rules: [
      {
        text: "sait.x.byaparik_pratisthan_month",
        source: "sait.x.byaparik_pratisthan_month_source",
        shloka:
          "वृद्धत्वस्तशिशुत्वइज्यसितयोर्योनाधिमासे तथा ॥ ४७ ॥ [३३८]  विवाहादिषु कार्येषु नाड्यः षोडश षोडश ॥ [२७२]",
        gloss: "sait.x.byaparik_pratisthan_month_gloss",
      },
      {
        text: "sait.x.byaparik_pratisthan_tithi",
        source: "sait.x.byaparik_pratisthan_tithi_source",
        shloka:
          "नंदा भद्रा च जया च रिक्ता पूर्णेति तिथ्योऽशुभमध्यशस्ताः ॥ [२८५]  चतुर्थी षष्ठी अष्टमी नवमी द्वादशी चतुर्दशी एताः पक्षरन्ध्रसंज्ञिस्ततियो ज्ञेयाः ॥ [३१०]",
        gloss: "sait.x.byaparik_pratisthan_tithi_gloss",
      },
      {
        text: "sait.x.byaparik_pratisthan_nakshatra",
        source: "sait.x.byaparik_pratisthan_nakshatra_source",
        shloka:
          "पूर्वाद्वित्रयकृशानुपार्यमभे केन्द्रत्रिकोणे शुभैः षट्त्र्यायप्रयवश्विभैर्विना घटतनुं स्रग्विक्रयः सत्तिथौ । रिक्ताभौमघटालमन्विना च विपणिसैंन्ध्रुवक्षिप्रमै- लग्ने चन्द्रसिते व्ययाष्टरहितैः पापैः शुभैद्र्व्यार्यखे ॥ १७ ॥ [३४२]",
        gloss: "sait.x.byaparik_pratisthan_nakshatra_gloss",
      },
      {
        text: "sait.x.byaparik_pratisthan_vara",
        source: "sait.x.byaparik_pratisthan_vara_source",
        shloka: "क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: "sait.x.byaparik_pratisthan_vara_gloss",
      },
      {
        text: "sait.x.byaparik_pratisthan_lagna",
        source: "sait.x.byaparik_pratisthan_lagna_source",
        shloka:
          "रिक्ताभौमघटालमन्विना च विपणिसैंन्ध्रुवक्षिप्रमै- लग्ने चन्द्रसिते व्ययाष्टरहितैः पापैः शुभैद्र्व्यार्यखे ॥ १७ ॥ [३४२]",
        gloss: "sait.x.byaparik_pratisthan_lagna_gloss",
      },
      {
        text: "sait.x.griha_pravesh_yoga_karana",
        source: "sait.x.vivah_yoga_source",
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        text: "sait.x.byaparik_pratisthan_dosha",
        source: "sait.x.griha_aarambha_durmuhurta_source",
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: MC_GP_GRAHANA_GLOSS,
      },
      {
        text: "sait.x.byaparik_pratisthan_graha",
        source: "sait.x.byaparik_pratisthan_graha_source",
        shloka:
          "वाप्यारामडागतडागकूपभवनारम्भप्रतिष्ठे व्रता- रम्भोत्सर्गवधूप्रवेशनमहादानानि सोमाष्टके ॥ ४६ ॥  वृद्धत्वस्तशिशुत्वइज्यसितयोर्योनाधिमासे तथा ॥ ४७ ॥ [३३८]",
        gloss: "sait.x.byaparik_pratisthan_graha_gloss",
      },
    ],
  },
  "rudri-jurne": {
    description: "sait.descriptions.rudri-jurne",
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले गणना गर्छ। यो साइत लग्नमा आधारित होइन — रुद्री हवनसहित हुने भएकाले प्रत्येक दिनको तिथिबाट शिववास र तिथि-वारबाट अग्निवास दुवै हेरी शुभ दिन निकालिन्छ।",
      en: "These dates are computed by our own system. This sāit is not lagna-based — since Rudri includes a homa, each day is judged by BOTH the Śiva-vāsa formula (deity's abode) and the Agni-vāsa formula (fire's abode).",
    },
    rules: [
      {
        text: "sait.x.rudri_shiva_vasa",
        source: "sait.x.rudri_shiva_vasa_source",
        shloka:
          "पक्षस्य द्विगुणीं तिथिं पञ्चभिस्तु समन्वितम्। सप्तभिस्तु हरेद्भागं शेषं शिवनिवासकम् ॥ [३३८]",
        gloss: "sait.x.rudri_shiva_vasa_gloss",
      },
      {
        text: "sait.x.rudri_shiva_vasa_barred",
        source: "sait.x.rudri_shiva_vasa_barred_source",
        shloka:
          "पक्षस्य द्विगुणीं तिथिं पञ्चभिस्तु समन्वितम्। सप्तभिस्तु हरेद्भागं शेषं शिवनिवासकम् ॥ [३३८]",
        gloss: "sait.x.rudri_shiva_vasa_barred_gloss",
      },
      {
        text: "sait.x.rudri_agni_vasa",
        source: "sait.x.rudri_agni_vasa_source",
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_GLOSS,
      },
      {
        text: "sait.x.rudri_nitya_naimittika",
        source: "sait.x.rudri_nitya_naimittika_source",
        shloka: MC_2_36_NITYA_SHLOKA,
        gloss: MC_2_36_NITYA_GLOSS,
      },
      {
        text: "sait.x.griha_pravesh_yoga_karana",
        source: "sait.x.rudri_yoga_karana_source",
        shloka:
          "व्यतीपाते तथा पाते… वर्जयेच्छुभम् ॥ [३६२]  न कुर्यान्मङ्गलं विष्ट्यां जीवितार्थी कदाचन ॥ [३७१]",
        gloss: "sait.x.rudri_yoga_karana_gloss",
      },
      {
        text: "sait.x.rudri_tithi_month_preference",
        source: "sait.x.rudri_tithi_month_preference_source",
        shloka: MC_1_3_TITHISHA_SHLOKA,
        gloss: MC_1_3_TITHISHA_GLOSS,
      },
      {
        text: "sait.x.rudri_sunrise_panchanga",
        source: "sait.x.rudri_sunrise_panchanga_source",
        gloss: "sait.x.rudri_sunrise_panchanga_gloss",
      },
    ],
  },
  "agni-jurne": {
    description: "sait.descriptions.agni-jurne",
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले गणना गर्छ। यो साइत लग्नमा आधारित होइन — प्रत्येक दिनको तिथि र वारबाट तलको अग्निवास सूत्र लगाएर शुभ दिन निकालिन्छ।",
      en: "These dates are computed by our own system. This sāit is not lagna-based — for each day the Agni-vāsa formula below is applied to the tithi and weekday.",
    },
    rules: [
      {
        text: "sait.x.agni_vasa_formula",
        source: "sait.x.agni_vasa_formula_source",
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_GLOSS,
      },
      {
        text: "sait.x.agni_vasa_remainder",
        source: "sait.x.agni_vasa_remainder_source",
        shloka: MC_2_36_AGNIVASA_PHALA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_PHALA_GLOSS,
      },
      {
        text: "sait.x.agni_absolute_tithi",
        source: "sait.x.agni_absolute_tithi_source",
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: "sait.x.agni_absolute_tithi_gloss",
      },
      {
        text: "sait.x.agni_nitya_naimittika",
        source: "sait.x.rudri_nitya_naimittika_source",
        shloka: MC_2_36_NITYA_SHLOKA,
        gloss: MC_2_36_NITYA_GLOSS,
      },
      {
        text: "sait.x.agni_computation_basis",
        source: "sait.x.agni_computation_basis_source",
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: "sait.x.agni_computation_basis_gloss",
      },
    ],
  },
  annaprasan: {
    description: "sait.descriptions.annaprasan",
    method: DAYTIME_INTRO,
    requiresBirthDate: true,
    rules: [
      {
        text: "sait.x.annaprasan_month_age",
        source: "sait.x.annaprasan_month_age_source",
        shloka: MC_5_16_SHLOKA,
        gloss: MC_5_16_GLOSS,
      },
      {
        text: "sait.x.annaprasan_tithi",
        source: "sait.x.annaprasan_month_age_source",
        shloka: MC_5_16_SHLOKA,
        gloss: "sait.x.annaprasan_tithi_gloss",
      },
      {
        text: "sait.x.annaprasan_nakshatra",
        source: "sait.x.annaprasan_month_age_source",
        shloka: MC_5_16_SHLOKA,
        gloss: "sait.x.annaprasan_nakshatra_gloss",
      },
      {
        text: "sait.x.annaprasan_vara",
        source: "sait.x.annaprasan_month_age_source",
        shloka: MC_5_16_SHLOKA,
        gloss: "sait.x.annaprasan_vara_gloss",
      },
      {
        text: "sait.x.annaprasan_lagna_shuddhi",
        source: "sait.x.annaprasan_lagna_shuddhi_source",
        shloka: MC_5_17_SHLOKA,
        gloss: MC_5_17_GLOSS,
      },
      {
        text: "sait.x.annaprasan_guru_shukra_asta",
        source: "sait.x.annaprasan_guru_shukra_asta_source",
        shloka: MC_5_ASTA_CONTEXT,
        gloss: MC_5_ASTA_GLOSS,
      },
      {
        text: "sait.x.annaprasan_janma_tara",
        source: "sait.x.annaprasan_janma_tara_source",
        shloka: MC_1_34_SHLOKA,
        gloss: "sait.x.annaprasan_janma_tara_gloss",
      },
      {
        text: "sait.x.annaprasan_safeguard_dosha",
        source: "sait.x.annaprasan_safeguard_dosha_source",
        shloka: MC_1_34_SHLOKA,
        gloss: "sait.x.annaprasan_safeguard_dosha_gloss",
      },
      {
        text: "sait.x.annaprasan_daytime",
        source: "sait.x.annaprasan_daytime_source",
        shloka: "पूर्वाह्णे दैवकृत्यं स्यान्मध्याह्ने मानुषं तथा ॥ [६८२]",
        gloss: "sait.x.annaprasan_daytime_gloss",
      },
      {
        text: "sait.x.annaprasan_birth_date",
        source: "sait.x.annaprasan_birth_date_source",
        shloka: MC_5_16_SHLOKA,
        gloss: "sait.x.annaprasan_birth_date_gloss",
      },
    ],
  },
};
