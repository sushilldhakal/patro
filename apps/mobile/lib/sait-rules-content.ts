/**
 * Per-ceremony sāit explanation — the "how these dates are computed" paragraph
 * and the classical rule list — shown on every /sait page and the vivāha page.
 *
 * This lives in the frontend on purpose: the text must ALWAYS render, with no
 * dependency on a backend deploy. These dates are our own system's ephemeris
 * computation — NOT the Nepal Panchanga Nirnayak Samiti list or any external
 * listing. Keep the wording in sync with the engine (patro).
 */
import type { SaitCategoryId } from "@/lib/sait-data";

export interface BilingualText {
  ne: string;
  en: string;
}

/** Muhūrta Chintāmaṇi 1.34 — mahā-doṣa list (Vyatīpāta, Bhadrā/Viṣṭi, Vaidhṛti, …). */
const MC_1_34_SHLOKA =
  "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥ ३४ ॥";

const MC_1_34_GLOSS: BilingualText = {
  ne: "जन्म नक्षत्र/मास/तिथि, व्यतीपात, भद्रा (विष्टि), वैधृति, अमावस्या, पितृ-मृत्यु दिन, दुई तिथि क्षय भएको पक्ष (१३ दिनको पक्ष), अधिकमास आदि वर्ज्य — शुभ कार्यमा महादोष।",
  en: "Birth star/month/tithi, Vyatīpāta, Bhadrā (Viṣṭi), Vaidhṛti, Amāvasyā, parental-death days, a fortnight with two lost tithis (13-day pakṣa), Adhik-māsa and related defects are barred as mahā-doṣa for auspicious rites.",
};

/** Muhūrta Chintāmaṇi 2.36 — Agni-vāsa (abode of fire) for havana/homa. */
const MC_2_36_AGNIVASA_SHLOKA =
  "सैका तिथिवारयुता कृताप्ता शेषे गुणेऽग्ने भुवि वह्निवासः । सौख्याय होमे शशिगुग्मशेषे प्राणार्थनाशौ दिवि भूतले च ॥ ३६ ॥ [४५८]";

const MC_2_36_AGNIVASA_GLOSS: BilingualText = {
  ne: "तिथिमा १ जोडी वार थप्ने; ४ ले भाग गर्दा शेष ३ (गुण) वा ० आए अग्नि पृथ्वी (भुवि) मा — होम सुखदायी। शेष १ (शशि) स्वर्गमा प्राणनाश; शेष २ (गुग्म) पातालमा अर्थनाश।",
  en: "Add 1 to the tithi, then the weekday; divide by 4. Remainder 3 (guṇa) or 0 places Agni on Earth (bhūvi) — the homa brings happiness. Remainder 1 (śaśi) = Heaven (loss of life); remainder 2 (gugma) = Pātāla (loss of wealth).",
};

/**
 * Muhūrta Chintāmaṇi 2.36 — Pīyūṣadhārā commentary: detailed remainder → abode → fruit.
 */
const MC_2_36_AGNIVASA_PHALA_SHLOKA =
  "तिथिवारयुतिः सैका वेदभक्तावशेषकात् । निवासोऽग्नेर्व्यौम्नि रूपे वित्तप्राणविनाशकः ॥ पाताले द्विकशेषेण धनसंचयनाशकः । गुणवेदावशेषेण भूमौ विपुलसौख्यदः ॥ [४५८]";

const MC_2_36_AGNIVASA_PHALA_GLOSS: BilingualText = {
  ne: "शेष १ (रूपे) — अग्नि व्यौम्नि/स्वर्गमा, वित्त–प्राण विनाश। शेष २ (द्विक) — पातालमा, धनसञ्चय नाश। शेष ३ वा ० (गुण–वेद) — भूमौ, विपुल सौख्य।",
  en: "Remainder 1 (rūpe) — Agni in Heaven (vyoman), destroys wealth and life. Remainder 2 (dvik) — in Pātāla, destroys accumulated wealth. Remainder 3 or 0 (guṇa–veda) — on Earth (bhūmi), gives abundant happiness.",
};

/** Muhūrta Chintāmaṇi 1.3 — presiding deities (lords) of the tithis. */
const MC_1_3_TITHISHA_SHLOKA =
  "तिथ्यीश वह्निर्द्द्वौ गौरी गणेशोऽहिगुहो रविः । शिवो दुर्गांतको विश्वे हरिः कामः शिवः शशी ॥ ३ ॥";

const MC_1_3_TITHISHA_GLOSS: BilingualText = {
  ne: "तिथिका अधिपति देवता क्रमशः — अष्टमी र चतुर्दशीका अधिपति शिव हुन्, त्यसैले यी तिथि शिव आराधनाका लागि स्वाभाविक अनुकूल मानिन्छन्।",
  en: "The presiding deities of the tithis in order — Aṣṭamī and Chaturdaśī are ruled by Śiva, so these tithis are held naturally suited to Śiva worship.",
};

/**
 * Muhūrta Chintāmaṇi 2.36 (commentary/expansion) — for Nitya (regular) and
 * Naimittika (occasional) rites the Agni-vāsa check is not strictly mandatory.
 */
const MC_2_36_NITYA_SHLOKA =
  "नित्ये नैमित्तिके कार्ये न चाब्दे मुनिभिः स्मृतः । संस्कारेषु विचारोऽस्य न कार्यो नापि वैष्णवे ॥";

const MC_2_36_NITYA_GLOSS: BilingualText = {
  ne: "मुनिहरूका अनुसार नित्य र नैमित्तिक कर्म (जस्तै सामान्य रुद्राभिषेक), वार्षिक अनुष्ठान, संस्कार तथा वैष्णव कार्यमा यस अग्निवासको विचार अनिवार्य छैन।",
  en: "Per the sages, for Nitya (regular) and Naimittika (occasional) rites — such as a general Rudrābhiṣeka — for annual observances, saṃskāras and Vaiṣṇava acts, this Agni-vāsa need not be strictly considered.",
};

/**
 * Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa) — annaprāśana month/age,
 * nakṣatra class, barred tithis and barred weekdays in a single verse.
 */
const MC_5_16_SHLOKA =
  "युग्ममासे पुंसोऽयुग्मे स्त्रीणां मृदुलघुचरस्थिरोडुषु । रिक्तानन्दाष्टमीदर्शद्वादशीार्ककुजार्किभिर्विना ॥ १६ ॥";

const MC_5_16_GLOSS: BilingualText = {
  ne: "बालकको अन्नप्रासन सम महिना (जन्मपछि ६,८,१०,१२) मा र बालिकाको विषम महिना (५,७,९,११) मा; मृदु, लघु, चर र स्थिर वर्गका नक्षत्रमा; रिक्ता (४,९,१४), नन्द (१,६,११), अष्टमी, अमावस्या र द्वादशी बाहेक; आइत (अर्क), मंगल (कुज) र शनि (अर्कि) बाहेकका वारमा।",
  en: "A boy's annaprāśana falls in an even month after birth (6,8,10,12) and a girl's in an odd month (5,7,9,11); in Mṛdu, Laghu, Chara and Sthira nakṣatras; excluding Rikta (4,9,14), Nanda (1,6,11), Aṣṭamī, Amāvasyā and Dvādaśī; and avoiding Sun (Arka), Tue (Kuja) and Sat (Arki).",
};

/** Muhūrta Chintāmaṇi 5.17 — lagna-śuddhi (planetary placement) for annaprāśana. */
const MC_5_17_SHLOKA =
  "केन्द्रत्रिकोणायगतैः शुभैः खेटैः खशून्यगे । पापैरुपचयस्थैश्च लग्नेन्दुमृतिषष्ठगैः ॥ १७ ॥";

const MC_5_17_GLOSS: BilingualText = {
  ne: "शुभ ग्रह केन्द्र (१,४,७,१०), त्रिकोण (५,९) वा आय (११) मा; दशम भाव (ख) रिक्त; पाप ग्रह उपचय (३,६,११) मा; चन्द्रमा लग्न (१), षष्ठ वा अष्टम (मृत्यु) मा नहोस् — यस्तो लग्नशुद्धि आदर्श।",
  en: "Benefics in a kendra (1,4,7,10), trikoṇa (5,9) or the 11th (āya); the 10th house (kha) empty; malefics in the upachaya houses (3,6,11); and the Moon NOT in the 1st (lagna), 6th or 8th (mṛtyu) — such lagna-śuddhi is ideal.",
};

/**
 * Muhūrta Chintāmaṇi 5 (commentary on 46–47) — time-bound saṃskāras are
 * exempt from the Guru/Śukra combustion (asta) doṣa.
 */
const MC_5_ASTA_CONTEXT =
  "सीमन्त-जातकर्म-नामकरण-अन्नप्राशनादिकं कर्म गुरु-शुक्रास्तादावपि कार्यम् ।";

const MC_5_ASTA_GLOSS: BilingualText = {
  ne: "सीमन्त, जातकर्म, नामकरण, अन्नप्रासन आदि काल-सापेक्ष (नित्य) संस्कार गुरु वा शुक्र अस्त भएको बेला पनि गर्न सकिन्छ — यी अस्त-दोषका अपवाद हुन्।",
  en: "Sīmanta, Jātakarma, Nāmakaraṇa, Annaprāśana and similar time-bound (nitya) saṃskāras may be performed even when Jupiter or Venus is combust (asta) — they are exceptions to the asta-doṣa.",
};

/** Muhūrta Chintāmaṇi — gṛha-praveśa months, ayana, lagna and nakṣatra classes. */
const MC_GP_MONTH_SHLOKA =
  "ज्येष्ठे माघे फाल्गुने वैशाखे सौम्ययने स्थिरे लग्ने । मृदुध्रुवमिश्रक्षिप्रचरोडुषु गृहप्रवेशः स्यात् ॥";

const MC_GP_MONTH_GLOSS: BilingualText = {
  ne: "ज्येष्ठ, माघ, फाल्गुन, वैशाख (र मार्गशीर्ष) मा, उत्तरायण (सौम्ययन) मा, स्थिर लग्नमा तथा मृदु/ध्रुव/मिश्र/क्षिप्र/चर नक्षत्रमा गृहप्रवेश शुभ हुन्छ। (छानो/खरले ढाकिएको घरमा भने दक्षिणायनमा पनि प्रवेश गर्न सकिने अपवाद छ।)",
  en: "Gṛha-praveśa is auspicious in Jyeṣṭha, Māgha, Phālguna, Vaiśākha (and Mārgaśīrṣa), during Uttarāyaṇa (Saumyāyana), in a fixed (sthira) lagna, and in the Mṛdu/Dhruva/Miśra/Kṣipra/Chara nakṣatras. (For a house covered in grass/straw, entry may also be done in Dakṣiṇāyana.)",
};

/** Muhūrta Chintāmaṇi — the Sun-sign result (lābha/mṛti/dhana) for house rites. */
const MC_GP_SUN_SHLOKA =
  "चैत्रेऽर्के मेषगे लाभो ज्येष्ठे वृषगते मृतिः । भाद्रे सिंहाशगे लाभः कार्त्तिके तुळगे मृतिः ॥ मृगशीर्षे वृश्चिकगे मृतिः पौषे मकरगे धनम् । माघे कुम्भगते लाभः फाल्गुने मीनगे मृतिः ॥";

const MC_GP_SUN_GLOSS: BilingualText = {
  ne: "सूर्यको राशि–फल: मेष (चैत्र) लाभ, वृष (ज्येष्ठ) मृत्यु, सिंह (भाद्र) लाभ, तुला (कार्तिक) मृत्यु, वृश्चिक (मार्गशीर्ष) मृत्यु, मकर (पौष) धन, कुम्भ (माघ) लाभ, मीन (फाल्गुन) मृत्यु। यसैले प्रणालीले सूर्य मिथुन, वृश्चिक वा मीनमा (मलमास-तुल्य/मृत्युफल) हुँदा वर्ज्य गर्छ।",
  en: "The Sun-sign result: Meṣa (Chaitra) gain, Vṛṣabha (Jyeṣṭha) death, Siṃha (Bhādra) gain, Tulā (Kārtika) death, Vṛśchika (Mārgaśīrṣa) death, Makara (Pauṣa) wealth, Kumbha (Māgha) gain, Mīna (Phālguna) death. Accordingly the system bars the Sun in Mithuna, Vṛśchika or Mīna (Malamas-like / death-result).",
};

/** Muhūrta Chintāmaṇi — tithis barred in the gṛha-chakra (rikta, Amāvasyā, Pratipadā). */
const MC_GP_TITHI_SHLOKA = "वर्ज्या रिक्तामाप्रतिपदोऽपि गृहचक्रे ॥";

const MC_GP_TITHI_GLOSS: BilingualText = {
  ne: "गृहचक्रमा रिक्ता (४,९,१४), अमावस्या र प्रतिपदा तिथि वर्ज्य। प्रणालीले यसबाहेक शुक्ल पक्षका वृद्धि तिथि २,३,५,७,१०,११,१३ मात्र लिन्छ।",
  en: "In the gṛha-chakra, rikta (4,9,14), Amāvasyā and Pratipadā are barred. Beyond these the system keeps only the śukla-pakṣa growth tithis 2,3,5,7,10,11,13.",
};

/** Nakṣatra pāda of the gṛha-praveśa verse — the auspicious star classes. */
const MC_GP_NAK_SHLOKA = "मृदुध्रुवमिश्रक्षिप्रचरोडुषु गृहप्रवेशः स्यात् ॥";

const MC_GP_NAK_GLOSS: BilingualText = {
  ne: "मृदु, ध्रुव (स्थिर), मिश्र, क्षिप्र (लघु) र चर वर्गका नक्षत्रमा गृहप्रवेश शुभ मानिन्छ।",
  en: "Gṛha-praveśa is auspicious in the Mṛdu, Dhruva (fixed), Miśra, Kṣipra (Laghu) and Chara nakṣatra classes.",
};

/** Muhūrta Chintāmaṇi 12 (Vāstu, quoting Vasiṣṭha) — fixed lagna for house works. */
const MC_GP_LAGNA_SHLOKA =
  "स्थिरलग्ने गृहं कार्यं चरं च न कदाचन । द्विस्वभावं भवेच्छस्तं लग्नदोषविवर्जितम् ॥";

const MC_GP_LAGNA_GLOSS: BilingualText = {
  ne: "गृहनिर्माण र प्रवेश सधैं स्थिर लग्नमा गर्नुपर्छ, चर लग्नमा कहिल्यै होइन; द्विस्वभाव लग्न अन्य दोषरहित भए स्वीकार्य। (वसिष्ठ-वचन)",
  en: "Construction and entry should always be done in a fixed (sthira) lagna, never in a movable (chara) one; a dual (dvisvabhāva) sign is acceptable if free of other defects. (attributed to Sage Vasiṣṭha)",
};

/** Muhūrta Chintāmaṇi 1.32 — avoid the days around an eclipse for auspicious work. */
const MC_GP_GRAHANA_SHLOKA =
  "सर्वस्मिन्विधुपापयुक्तनलवाधर्चे निशार्धाटीत्र्यंशं वै कुनवांशकं ग्रहणतः पूर्वं दिनानां त्रयम् ।";

const MC_GP_GRAHANA_GLOSS: BilingualText = {
  ne: "ग्रहण (सूर्य/चन्द्र) को अगाडि–पछाडिको अवधि — सामान्यतः तीन दिन — शुभ कार्यका लागि वर्ज्य।",
  en: "The period around an eclipse (solar/lunar) — typically three days before and after — is barred for auspicious work.",
};

/**
 * One rule the engine applies. `ne`/`en` are the plain-language rule; the
 * optional `source` (short citation), `shloka` (Sanskrit verse, Devanāgarī) and
 * `gloss` (a bilingual translation of the verse) let a rule cite the classical
 * text it comes from. Only vivāha carries shlokas today.
 */
export interface SaitRuleEntry extends BilingualText {
  /**
   * Stable id matching the backend's `muhurta_engine.TOGGLEABLE_RULE_IDS`. When
   * present, the rule can be switched off on the page and the engine recomputes
   * the dates without it. Rules without an id are always applied.
   */
  id?: string;
  source?: BilingualText;
  shloka?: string;
  gloss?: BilingualText;
}

export interface SaitContent {
  description: BilingualText;
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
    description: {
      ne: "विवाह संस्कारका लागि शुभ साइत — शुभ तिथि, नक्षत्र र लग्न विचार गरी गणना गरिएका शुद्ध विवाह मुहूर्तहरू।",
      en: "Auspicious dates for the marriage ceremony — clean vivāha muhūrtas computed on favourable tithi, nakṣatra and lagna.",
    },
    method: MUHURTA_INTRO,
    rules: [
      {
        id: "month",
        ne: "महिना — विवाहका लागि शास्त्रसम्मत चन्द्रमास मात्र (मार्गशीर्ष, माघ, फाल्गुन, वैशाख, ज्येष्ठ, आषाढ); अधिकमास र चातुर्मास वर्जित।",
        en: "Month — only the śāstra vivāha lunar months (Mārgaśīrṣa, Māgha, Phālguna, Vaiśākha, Jyeṣṭha, Āṣāḍha); Adhik-māsa & Chaturmāsa barred.",
        source: { ne: "मुहूर्त चिन्तामणि ६.१ (विवाह प्रकरण)", en: "Muhūrta Chintāmaṇi 6.1 (Vivāha Prakaraṇa)" },
        shloka: "मृगमाघफल्गुनवैशाखज्येष्ठाषाढेषु शोभनम् । मेषवृषमिथुनवृश्चिकमकरकुम्भे स्थिते सवितरि ॥ १ ॥ [६८०]",
        gloss: {
          ne: "मार्गशीर्ष, माघ, फाल्गुन, वैशाख, ज्येष्ठ र आषाढमा विवाह शुभ हुन्छ।",
          en: "In Mārgaśīrṣa, Māgha, Phālguna, Vaiśākha, Jyeṣṭha and Āṣāḍha, marriage is auspicious.",
        },
      },
      {
        id: "solar-month",
        ne: "सौर मास — सूर्य मेष, वृष, मिथुन, वृश्चिक, मकर वा कुम्भ राशिमा हुनुपर्छ (शास्त्रले पहिले सौर मास हेर्छ)।",
        en: "Solar month — the Sun must be in Meṣa, Vṛṣabha, Mithuna, Vṛśchika, Makara or Kumbha (the śāstra checks the Sun-sign first).",
        source: { ne: "मुहूर्त चिन्तामणि ६.१ (विवाह प्रकरण)", en: "Muhūrta Chintāmaṇi 6.1 (Vivāha Prakaraṇa)" },
        shloka: "मेषवृषमिथुनवृश्चिकमकरकुम्भे स्थिते सवितरि ॥",
        gloss: {
          ne: "सूर्य मेष, वृष, मिथुन, वृश्चिक, मकर वा कुम्भमा रहँदा विवाह शुभ हुन्छ।",
          en: "Marriage is auspicious when the Sun stands in Meṣa, Vṛṣabha, Mithuna, Vṛśchika, Makara or Kumbha.",
        },
      },
      {
        id: "tithi",
        ne: "तिथि — शुभ तिथि मात्र (२,३,५,७,१०,११,१३); रिक्ता (४,९,१४), अष्टमी, षष्ठी, अमावस्या, पूर्णिमा वर्जित।",
        en: "Tithi — only śubha tithis (2,3,5,7,10,11,13); rikta (4,9,14), Aṣṭamī, Ṣaṣṭhī, Amāvasyā, Pūrṇimā out.",
        source: { ne: "मुहूर्त चिन्तामणि १.३६ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.36 (Śubhāśubha Prakaraṇa)" },
        shloka: "चतुर्थी षष्ठी अष्टमी नवमी द्वादशी चतुर्दशी एताः पक्षरन्ध्रसंज्ञिस्ततियो ज्ञेयाः ।",
        gloss: {
          ne: "चतुर्थी, षष्ठी, अष्टमी, नवमी, द्वादशी र चतुर्दशी — पक्षरन्ध्र तिथि हुन् (वर्जित)।",
          en: "The 4th, 6th, 8th, 9th, 12th and 14th are the Pakṣa-randhra tithis (and are barred).",
        },
      },
      {
        id: "nakshatra",
        ne: "नक्षत्र — शास्त्रीय विवाह नक्षत्र मात्र: रोहिणी, मृगशिरा, मघा, उत्तराफाल्गुनी, हस्त, स्वाती, अनुराधा, मूल, उत्तराषाढा, उत्तरभाद्रपदा, रेवती।",
        en: "Nakṣatra — the classical 11: Rohiṇī, Mṛgaśira, Maghā, U.Phalgunī, Hasta, Svātī, Anurādhā, Mūla, U.Aṣāḍhā, U.Bhādrapada, Revatī.",
        source: { ne: "मुहूर्त चिन्तामणि ६.५५ (विवाह प्रकरण)", en: "Muhūrta Chintāmaṇi 6.55 (Vivāha Prakaraṇa)" },
        shloka: "मृगशीर्षहस्तमूलानुराधा मघारोहिणी रेवती । उत्तरात्रयस्वात्यः स्युर्विवाहे दश सप्त च ॥",
        gloss: {
          ne: "मृगशिरा, हस्त, मूल, अनुराधा, मघा, रोहिणी, रेवती, तीन उत्तरा र स्वाती — विवाहका नक्षत्र हुन्।",
          en: "Mṛgaśira, Hasta, Mūla, Anurādhā, Maghā, Rohiṇī, Revatī, the three Uttarās and Svātī are the marriage stars.",
        },
      },
      {
        id: "yoga",
        ne: "योग — नवै अशुभ योग (विष्कुम्भ, अतिगण्ड, शूल, गण्ड, व्याघात, वज्र, व्यतीपात, परिघ, वैधृति) वर्जित।",
        en: "Yoga — all nine aśubha yogas (Viṣkambha, Atigaṇḍa, Śūla, Gaṇḍa, Vyāghāta, Vajra, Vyatīpāta, Parigha, Vaidhṛti) barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        id: "karana",
        ne: "करण — विष्टि (भद्रा) र चार स्थिर करण (शकुनि, चतुष्पाद, नाग, किंस्तुघ्न) वर्जित।",
        en: "Karaṇa — Viṣṭi (Bhadrā) and the four fixed karaṇas (Śakuni, Catuṣpāda, Nāga, Kiṃstughna) barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.४३ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.43 (Śubhāśubha Prakaraṇa)" },
        shloka: "शुक्ले पूर्वार्धोऽष्टम्यर्कैकदश्या चतुर्ध्या परार्धं । कृष्णेऽन्त्यार्धं स्यात्तृतीयादशम्योः पूर्वभागे सप्तमीशम्भुतिथ्योः ॥",
        gloss: {
          ne: "अष्टमी, पूर्णिमा, चतुर्थी, एकादशी, तृतीया, दशमी, सप्तमी र चतुर्दशीका भद्रा (विष्टि) पर्ने भाग वर्जित।",
          en: "Defines the portions of the 8th, 15th, 4th, 11th, 3rd, 10th, 7th and 14th tithis occupied by Bhadrā (Viṣṭi), which must be barred.",
        },
      },
      {
        id: "vara",
        ne: "वार — मंगलबार र शनिबार वर्जित।",
        en: "Vāra — Tuesday and Saturday barred.",
        source: { ne: "बृहत्संहिता १.४ · मुहूर्त चिन्तामणि", en: "Bṛhat Saṃhitā 1.4 · Muhūrta Chintāmaṇi" },
        shloka: "क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: {
          ne: "बृहत्संहिता (१.४) अनुसार ब्रह्माले नै मंगलबारलाई अशुभ भनेका; शनि र मंगल 'क्रूर वार' हुन् — मुहूर्त चिन्तामणिले विवाहका लागि सोम, बुध, बिहीबार र शुक्रबार मात्र प्रशस्त मानेको छ (रवि-कुज-शनि विशेष त्याज्य)।",
          en: "Per the Bṛhat Saṃhitā (1.4), Brahmā himself declared Tuesday inauspicious; Saturday and Tuesday are 'krūra vāra' — the Muhūrta Chintāmaṇi admits only Mon, Wed, Thu and Fri for marriage (Ravi-Kuja-Śani especially avoided).",
        },
      },
      {
        id: "dosha",
        ne: "दोष — दग्धा, शून्य, भद्रा र मलेफिक लत्ता (सूर्य/मंगल/शनि/राहु/केतु) परेको दिन पूरै त्याज्य; गोधूलिले पनि छुट दिँदैन।",
        en: "Doṣa — Dagdha, Śūnya, Bhadrā, and malefic Latta (Sun/Mars/Saturn/Rāhu/Ketu) scrub the whole day; no Godhūli rescue.",
        source: { ne: "मुहूर्त चिन्तामणि ६.१९ (विवाह प्रकरण · लत्ता)", en: "Muhūrta Chintāmaṇi 6.19 (Vivāha Prakaraṇa · Latta)" },
        shloka: "सप्ताष्टबाणनगाब्धिभूतवेदेषु द्वादशसु च। सूर्यादीनां पुरः पश्चाल्लत्ताख्याः स्युरमी क्रमात् ॥ १९ ॥ [७३७]",
        gloss: {
          ne: "लत्ता दोष — ग्रहले आफ्नो स्थानबाट निश्चित नक्षत्रलाई 'लात हान्छ'; त्यस्तो दिन त्याज्य।",
          en: "Defines the Latta defect, where a planet 'kicks' specific nakṣatras from its position — such days are scrubbed.",
        },
      },
      {
        id: "graha",
        ne: "ग्रह — गुरु र शुक्र अस्त हुनुहुँदैन, न त बाल्य/वृद्ध (उदय वा अस्तको सन्निकट कमजोर); संक्रान्तिको सन्निकट समय र ग्रहण ±३ दिन वर्जित।",
        en: "Graha — Jupiter & Venus must be udaya — neither combust nor bāla/vṛddha (weak just after rising or before setting); Sankrānti buffers and eclipse ±3 days excluded.",
        source: { ne: "धर्मसिन्धु १ (प्रथम परिच्छेद)", en: "Dharma Sindhu 1 (Prathama Pariccheda)" },
        shloka: "तत्रास्तात्प्राक् सप्ताहं वार्धक्यम् । उदयोत्तरं सप्ताहं बाल्यमिति मध्यमः पक्षः ॥",
        gloss: {
          ne: "अस्त हुनुभन्दा सात दिन अघि वृद्ध, उदय भएपछि सात दिन बाल्य — मध्यम पक्ष।",
          en: "Seven days before setting is old age (vṛddha); seven days after rising is infancy (bāla) — the medium rule.",
        },
      },
      {
        id: "simhastha",
        ne: "सिंहस्थ गुरु — बृहस्पति सिंह राशिमा रहेको सम्पूर्ण अवधि विवाह वर्जित।",
        en: "Simhastha Guru — marriage is barred for the whole transit of Jupiter through Siṃha (Leo).",
        source: { ne: "धर्मसिन्धु १ (प्रथम परिच्छेद · सिंहस्थ)", en: "Dharma Sindhu 1 (Prathama Pariccheda · Simhastha)" },
        shloka: "मघानक्षत्रगते सिंहाशगते च गुरौ सर्वदेशेषु सर्वमाङ्गलिककर्मणां निषेधः ॥",
        gloss: {
          ne: "बृहस्पति मघा नक्षत्र वा सिंह राशिमा हुँदा सबै देशमा सम्पूर्ण मांगलिक कर्म निषेध।",
          en: "When Jupiter is in Maghā nakṣatra or the sign Siṃha, all auspicious rites are prohibited in every region.",
        },
      },
      {
        id: "kshaya-paksha",
        ne: "क्षय पक्ष — एउटै पक्षमा दुई तिथि क्षय भई १३ तिथिको पक्ष बन्यो भने (अतिनिन्द्य) पूरै अवधि वर्जित; यसलाई अरू कुनै शुभ योगले पनि काट्दैन।",
        en: "Kṣaya Pakṣa — if a fortnight loses two tithis and becomes a 13-tithi pakṣa (atinindya), the whole period is barred; no other favourable factor overrides it.",
        source: { ne: "मुहूर्त चिन्तामणि १.४८ भाष्य (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.48 comm. (Śubhāśubha Prakaraṇa)" },
        shloka: "त्रयोदशदिने पक्षे यस्मिन् पक्षे तिथिक्षयद्वयम् स त्रयोदशादिनात्मकः पक्षोतिनिन्द्यः। तदुक्तं ज्योतिर्निबन्धे— पक्षस्य मध्ये द्वितिथी पतेतां तदा भवेद्रौरवकालयोगः। पक्षे विनष्टे सकलं विनष्टमित्याहुराचार्याः समस्ताः ॥ [३७६]",
        gloss: {
          ne: "दुई तिथि क्षय भई १३ दिनको पक्ष बन्दा 'पक्ष नष्ट भए सबै नष्ट' भनी सबै आचार्य भन्छन्।",
          en: "In a 13-day fortnight where two tithis are lost, 'when the pakṣa is destroyed, all is destroyed,' say all the Ācāryas.",
        },
      },
    ],
  },
  bratabandha: {
    description: {
      ne: "उपनयन (ब्रतबन्ध) संस्कारका लागि शुभ मिति — बालकको विद्यारम्भ र यज्ञोपवीत धारणका शुभ दिन।",
      en: "Auspicious dates for the Upanayana (Bratabandha) sacred-thread rite marking the start of a boy's formal study.",
    },
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले जेपीएल (NASA को Jet Propulsion Laboratory) बाट गणना गर्छ — कुनै बाह्य सूची पछ्याइएको छैन। प्रत्येक दिनको सूर्योदयदेखि मध्याह्नसम्म हरेक अन्तरालमा तिथि, नक्षत्र, योग, करण, वार र लग्न निकालेर तलका उपनयन नियमहरू लगाइन्छ। मध्याह्नअघि शुद्ध मुहूर्त भेटिए मात्र दिन प्रकाशित हुन्छ।",
      en: "These dates are computed by our own system from JPL (NASA's Jet Propulsion Laboratory) — no external list is followed. For each day the engine derives tithi, nakṣatra, yoga, karaṇa, vāra and lagna at every interval from sunrise to madhyāhna, then applies the Upanayana rules below. A day is published only if a clean pre-noon muhūrta survives.",
    },
    rules: [
      {
        ne: "काल — सूर्य उत्तरायण राशिमा हुनुपर्छ (मकरदेखि मिथुन: माघ–असार); चातुर्मास र अधिकमास वर्जित।",
        en: "Season — Sun in an Uttarāyaṇa rāśi (Makara→Mithuna: Māgha–Āṣāḍha); Chaturmāsa & Adhik-māsa barred.",
        source: { ne: "मुहूर्त चिन्तामणि ५.३९ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.39 (Saṃskāra Prakaraṇa)" },
        shloka: "माघफल्गुनवैशाखज्येष्ठाषाढेषु शोभनम्। उदीच्यगेऽर्के विप्राणां सति चन्द्रे च शुद्धितः॥",
        gloss: {
          ne: "माघ, फाल्गुन, वैशाख, ज्येष्ठ र आषाढमा शुभ; सूर्य उत्तरतिर (उत्तरायण) हुँदा। अधिकमास र चातुर्मास वर्जित।",
          en: "Auspicious in Māgha, Phālguna, Vaiśākha, Jyeṣṭha and Āṣāḍha when the Sun is in the northern course (Uttarāyaṇa). Adhik-māsa and Chaturmāsa are barred.",
        },
      },
      {
        id: "tithi",
        ne: "तिथि — शुक्ल २,३,५,१०,११,१२ वा कृष्ण २,३,५।",
        en: "Tithi — śukla 2,3,5,10,11,12 or kṛṣṇa 2,3,5.",
        source: { ne: "मुहूर्त चिन्तामणि ५.४० (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.40 (Saṃskāra Prakaraṇa)" },
        shloka: "दशैकादशी द्वादशी द्वितीया तृतीया पञ्चमी दशमीषु।",
        gloss: {
          ne: "दशमी, एकादशी, द्वादशी, द्वितीया, तृतीया र पञ्चमी — उपनयनका शुभ तिथि।",
          en: "Daśamī, Ekādaśī, Dvādaśī, Dvitīyā, Tṛtīyā and Pañcamī are the favourable Upanayana tithis.",
        },
      },
      {
        id: "galagraha",
        ne: "गलग्रह तिथि — १,४,७,८,९,१३,१४,१५ (पूर्णिमा/अमावस्या) वर्जित।",
        en: "Galagraha tithis — 1,4,7,8,9,13,14,15 (Pūrṇimā/Amāvasyā) barred.",
        source: { ne: "मुहूर्त चिन्तामणि ५ (संस्कार प्रकरण · भाष्य)", en: "Muhūrta Chintāmaṇi 5 (Saṃskāra Prakaraṇa, comm.)" },
        shloka:
          "प्रतिपच्च चतुर्थी च सप्तम्यष्टमी तथा । नवमी च त्रयोदश्योश्चतुर्दश्योश्च पूर्णिमा ॥ अमावस्या तथा प्रोक्ता गलग्रहास्तिथयो ज्ञेयाः ।",
        gloss: {
          ne: "प्रतिपदा, चतुर्थी, सप्तमी, अष्टमी, नवमी, त्रयोदशी, चतुर्दशी र पूर्णिमा/अमावस्या — गलग्रह दोषले उपनयनमा वर्जित।",
          en: "Pratipadā, Caturthī, Saptamī, Aṣṭamī, Navamī, Trayodaśī, Caturdaśī and Pūrṇimā/Amāvasyā are barred as Galagraha defects for Upanayana.",
        },
      },
      {
        ne: "नक्षत्र — तलको परम्परा मोड अनुसार: शास्त्रीय उपनयन (क्षिप्र/ध्रुव/चर/मृदु + मघा/मूल), नेपाली पञ्चाङ्ग (भरणी/कृत्तिका/मघा/विशाखा/ज्येष्ठा बाहेक), वा उदार (मघा पनि स्वीकार्य)।",
        en: "Nakṣatra — per tradition mode below: Classical Upanayana (Kṣipra/Dhruva/Cara/Mṛdu + Maghā/Mūla), Nepali Panchāṅga (all except Bharaṇī/Kṛttikā/Maghā/Viśākhā/Jyeṣṭhā), or Liberal (Maghā also allowed).",
        source: { ne: "मुहूर्त चिन्तामणि ५.३९–४० (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.39–40 (Saṃskāra Prakaraṇa)" },
        shloka: "हस्ताश्विपुष्यमृगसौम्यमघोत्तरात्रयं सौम्यमैत्रं मूलं चरं च खलु पुष्यपुनर्वसू च।",
        gloss: {
          ne: "शास्त्रले हस्त, अश्विनी, पुष्य, मृगशिरा, पुनर्वसु, मघा, तीन उत्तरा, मूल र चर नक्षत्र आदि — करिब १९ नक्षत्रलाई शुभ मान्छ (शास्त्रीय मोड)।",
          en: "The śāstra favours Hasta, Aśvinī, Puṣya, Mṛgaśira, Punarvasu, Maghā, the three Uttarās, Mūla and the cara stars — about 19 nakṣatras (Classical mode).",
        },
      },
      {
        id: "vara",
        ne: "वार — सोम, बुध, बिहि, शुक्र मात्र (मंगलबार र शनिबार वर्जित)।",
        en: "Vāra — Mon, Wed, Thu, Fri only (Tuesday & Saturday barred).",
        source: { ne: "बृहत्संहिता १.४ · मुहूर्त चिन्तामणि", en: "Bṛhat Saṃhitā 1.4 · Muhūrta Chintāmaṇi" },
        shloka: "रविवारबुधगुरुशुक्रसोमवारेषु क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते।",
        gloss: {
          ne: "पितामह (ब्रह्मा) का अनुसार मङ्गलबार अशुभ; शनि र मंगल क्रूर वार हुन् — ब्रतबन्धमा वर्जित। रविवार, बुधवार, गुरुवार, शुक्रवार र सोमवार शुभ।",
          en: "Per Pitāmaha (Brahmā), Tuesday is not auspicious; Saturday and Tuesday are krūra vāra — barred for Bratabandha. Sunday, Wednesday, Thursday, Friday and Monday are auspicious.",
        },
      },
      {
        id: "time-window",
        ne: "समय — सूर्योदय–मध्याह्न मात्र (अपराह्न/रात्रि वर्जित)।",
        en: "Time — sunrise→madhyāhna only (aparāhna/night rejected).",
        source: { ne: "मुहूर्त चिन्तामणि ५ (संस्कार प्रकरण · भाष्य)", en: "Muhūrta Chintāmaṇi 5 (Saṃskāra Prakaraṇa, comm.)" },
        shloka: "उपनयनमपराह्वे न कार्यम्।",
        gloss: {
          ne: "उपनयन अपराह्नमा गर्नु हुँदैन — पूर्वाह्न वा मध्याह्न मात्र।",
          en: "Upanayana must not be done in the afternoon — only forenoon or midday.",
        },
      },
      {
        id: "graha",
        ne: "ग्रह — गुरु र शुक्र अस्त, बाल्य वा वृद्ध हुनुहुँदैन।",
        en: "Graha — Jupiter & Venus must be udaya — neither combust nor bāla/vṛddha.",
        source: { ne: "धर्मसिन्धु — शुक्रास्तादि वर्ज्याणि (प्रथम परिच्छेद)", en: "Dharma Sindhu — Śukrāstādi Varjyāṇi (Prathama Pariccheda)" },
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: {
          ne: "गुरु वा शुक्र अस्त, बाल्य, वृद्ध र मलिम्लुच अवस्थामा हुँदा शुभ कार्य वर्जित। अस्त हुनुभन्दा सात दिन अघि वृद्ध, उदय भएपछि सात दिन बाल्य — मध्यम पक्ष।",
          en: "When Jupiter or Venus is combust (asta), bāla (infant), vṛddha (old) or during malimluca, auspicious works are barred. Seven days before setting is vṛddha; seven days after rising is bāla — the medium rule.",
        },
      },
      {
        id: "simhastha",
        ne: "सिंहस्थ गुरु — बृहस्पति सिंह राशिमा रहेको अवधि वर्जित (नेपाली समुदायले नमान्ने भए बन्द गर्न सकिन्छ)।",
        en: "Simhastha Guru — Jupiter in Siṃha (Leo) barred (toggle off if your community does not enforce it).",
        source: { ne: "धर्मसिन्धु १ (प्रथम परिच्छेद · सिंहस्थ)", en: "Dharma Sindhu 1 (Prathama Pariccheda · Simhastha)" },
        shloka: "मघानक्षत्रगते सिंहाशगते च गुरौ सर्वदेशेषु सर्वमाङ्गलिककर्मणां निषेधः ॥",
        gloss: {
          ne: "बृहस्पति मघा नक्षत्र वा सिंह राशिमा हुँदा सबै देशमा सम्पूर्ण मांगलिक कर्म निषेध।",
          en: "When Jupiter is in Maghā nakṣatra or the sign Siṃha, all auspicious rites are prohibited in every region.",
        },
      },
      {
        id: "yoga",
        ne: "योग — व्यतीपात र वैधृति वर्जित।",
        en: "Yoga — Vyatīpāta & Vaidhṛti barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_1_34_SHLOKA,
        gloss: {
          ne: "यस श्लोकमा व्यतीपात, भद्रा र वैधृति लगायत शुभकार्यमा त्याज्य दोषहरूको उल्लेख छ। शास्त्रीय आधारमा हाम्रो प्रणालीले यसमध्ये व्यतीपात र वैधृतिलाई योगदोषका रूपमा लागू गर्छ।",
          en: "This verse lists several defects to avoid in auspicious work, including Vyatīpāta, Bhadrā and Vaidhṛti. On that classical basis, our system applies Vyatīpāta and Vaidhṛti as yoga defects.",
        },
      },
      {
        id: "karana",
        ne: "करण — विष्टि (भद्रा) वर्जित।",
        en: "Karaṇa — Viṣṭi (Bhadrā) barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ · १.४३ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 · 1.43 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_1_34_SHLOKA,
        gloss: {
          ne: "यस श्लोकमा उल्लिखित 'भद्रा' ले विष्टि करण जनाउँछ। प्रणालीले सम्पूर्ण विष्टि करणलाई वर्जित मान्छ।",
          en: "The word 'Bhadrā' in this verse denotes Viṣṭi karaṇa. The system treats the entire Viṣṭi karaṇa as barred.",
        },
      },
      {
        ne: "संक्रान्ति र ग्रहण (±३ दिन) वर्जित; दुर्मुहूर्त परेको अवधि मात्र छाडिन्छ (पूरै दिन होइन)।",
        en: "Sankrānti and eclipse (±3 days) barred; Dur-muhūrta skips only the affected period (not the whole day).",
        source: { ne: "मुहूर्त चिन्तामणि — ग्रहण १.३२, दुर्मुहूर्त १.३७–४० (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi — eclipse 1.32, Dur-muhūrta 1.37–40 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: {
          ne: "संक्रान्ति र ग्रहणका वरिपरिको समय त्याज्य; दुर्मुहूर्त भनेको केवल त्यो घडी छाडिन्छ — दिन पूरै होइन।",
          en: "Time around Sankrānti and eclipse is rejected; Dur-muhūrta drops only the affected clock slice — not the whole day.",
        },
      },
      {
        id: "dosha",
        ne: "दोष — दग्धा, शून्य र मंगल/राहुको लत्ता परेको दिन वर्जित।",
        en: "Doṣa — Dagdha, Śūnya, and Mars/Rāhu Latta days excluded.",
        source: { ne: "मुहूर्त चिन्तामणि — लत्ता ६.१९, दग्धा १.८, शून्य १.१० (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi — Latta 6.19, Dagdha 1.8, Śūnya 1.10 (Śubhāśubha Prakaraṇa)" },
        shloka: "सप्ताष्टबाणनगाब्धिभूतवेदेषु द्वादशसु च। सूर्यादीनां पुरः पश्चाल्लत्ताख्याः स्युरमी क्रमात् ॥ १९ ॥ [७३७]",
        gloss: {
          ne: "दग्धा र शून्य तिथि दोष, तथा मंगल/राहुको लत्ताले नक्षत्र बिग्रेको दिन — दिन-शुद्धि अन्तर्गत हटाइन्छ।",
          en: "Dagdha and Śūnya tithi defects, and days whose nakṣatra is struck by Mars/Rāhu Latta, are scrubbed under day-śuddhi.",
        },
      },
    ],
  },
  "griha-aarambha": {
    description: {
      ne: "घर निर्माण आरम्भ (जग हाल्ने) का लागि शुभ मिति — भवन निर्माणको मंगलमय शुरुवात।",
      en: "Auspicious dates to begin house construction (laying the foundation).",
    },
    method: DAYTIME_INTRO,
    rules: [
      {
        ne: "अधिकमास (मलमास) — वास्तुकर्म (घर निर्माण) वर्जित; मलिम्लुच चल्दा शिलान्यास हुँदैन।",
        en: "Adhik-māsa (Malmāsa) — vāstu karma (house construction) is barred; no foundation-laying during malimluca.",
        source: {
          ne: "धर्मसिन्धु १ — मलमासे वर्ज्यानि (प्रथम परिच्छेद)",
          en: "Dharma Sindhu 1 — Malmāse Varjyāni (Prathama Pariccheda)",
        },
        shloka:
          "उपाकर्मोत्सर्जने अष्टकाश्राद्धानि गृहप्रवेशचूडामौञ्जीबंधविवाहास्तीर्थादि-यात्रा वास्तुकर्मैतान्यधिवर्ज्यानि ।",
        gloss: {
          ne: "उपाकर्म, उत्सर्जन, अष्टका श्राद्ध, गृहप्रवेश, चूडाकर्म, ब्रतबन्ध (मौञ्जीबन्धन), विवाह, तीर्थयात्रा र वास्तुकर्म — यी सबै मलमासमा निषेध। गुरु–शुक्र अस्त/बाल्य/वृद्ध र मलिम्लुच हुँदा वास्तुकर्म त्याज्य।",
          en: "Upākarma, utsarjana, aṣṭakā-śrāddha, gṛha-praveśa, cūḍākarma, bratabandha (mauñjī-bandhana), vivāha, tīrtha-yātrā and vāstu karma — all barred in Malmāsa. When Guru/Śukra are combust, bāla or vṛddha, and malimluca runs, vāstu karma is prohibited.",
        },
      },
      {
        ne: "समय — शिलान्यास (जग हाल्ने) दिनको समयमा मात्र (सूर्योदय–सूर्यास्त)।",
        en: "Time — foundation-laying is a daytime rite (sunrise→sunset only).",
        source: { ne: "मुहूर्त चिन्तामणि १२ (वास्तु प्रकरण · दिवाकाल निर्देश)", en: "Muhūrta Chintāmaṇi 12 (Vāstu Prakaraṇa · daytime instruction)" },
        shloka:
          "भौमार्कवाररहितैस्तिथिभिश्च शिष्टै- रिक्ताममानुजपितृन् विरजैस्तु विष्टिम् । नक्तं च विद्धमपहाय सुलग्नयोगै- स्तद्वद्विधाय खननादि गृहारम्भणम् ॥ १८ ॥ [९३४]",
        gloss: {
          ne: "मुहूर्त चिन्तामणिले शिलान्यास रात्रिमा नगरी दिवाकालमा गर्न निर्देश गर्छ। प्रणालीले यसलाई सूर्योदय–सूर्यास्तसम्मको स्क्यानका रूपमा लागू गर्छ।",
          en: "Muhūrta Chintāmaṇi directs that foundation-laying be done in daytime, not at night. The system applies this as a sunrise→sunset scan.",
        },
      },
      {
        id: "solar-month",
        ne: "सूर्य राशि — मेष, वृष, सिंह, वृश्चिक, मकर वा कुम्भ (वसिष्ठ मत)।",
        en: "Sun-sign — Meṣa, Vṛṣabha, Siṃha, Vṛśchika, Makara or Kumbha (Vasiṣṭha’s view).",
        source: {
          ne: "मुहूर्त चिन्तामणि — वास्तु १२.१६ · वसिष्ठ मत (व्याख्या)",
          en: "Muhūrta Chintāmaṇi — Vāstu 12.16 · Vasiṣṭha’s view (commentary)",
        },
        shloka:
          "चैत्रेऽर्के मेषगे लाभो ज्येष्ठे वृषगते मृतिः । भाद्रे सिंहाशगे लाभः कार्त्तिके तुळगे मृतिः ॥ मृगशीर्षे वृश्चिकगे मृतिः पौषे मकरगे धनम् । माघे कुम्भगते लाभः फाल्गुने मीनगे मृतिः ॥",
        gloss: {
          ne: "यो वसिष्ठ मत प्रणालीको मुख्य आधार हो — मेष, वृष, सिंह, वृश्चिक, मकर, कुम्भमा सूर्य हुँदा गृह आरम्भ धन–सुखप्रद। अध्याय १२ श्लोक १६ ले सामान्य सूर्य-फल भन्छ («चैत्रेऽर्के मेषगे लाभो… माघे कुम्भगते लाभः…»); त्यहाँ वृष/वृश्चिकलाई सामान्यतया त्यागिएको भए तापनि चिन्तामणिकै व्याख्यामा वसिष्ठ (र मन्थर आदि) ले यी ६ राशि अत्यन्त शुभ मानेका छन् — हाम्रो सूची त्यसैमा आधारित।",
          en: "Vasiṣṭha’s verse is the system’s main basis — Sun in Meṣa, Vṛṣabha, Siṃha, Vṛśchika, Makara or Kumbha makes starting a house wealth- and comfort-giving. Ch. 12 verse 16 states general Sun-fruits («caitre’rke meṣage lābho… māghe kumbhagate lābhaḥ…»); though Vṛṣabha/Vṛśchika are often dropped in that general fruit scheme, Chintāmaṇi’s own commentary cites Vasiṣṭha (and Manthara et al.) favouring these six signs — our list follows that.",
        },
      },
      {
        id: "tithi",
        ne: "तिथि — प्रतिपदा (१), रिक्ता (४,९,१४) र अमावस्या मात्र वर्जित; बाँकी सबै (पूर्णिमासहित) ग्राह्य। विवाहजस्तो कडा संस्कार नभएकाले तिथि उदार।",
        en: "Tithi — only Pratipadā (1), rikta (4,9,14) and Amāvasyā are barred; all the rest (Pūrṇimā included) are allowed. The gate is lenient — a house-start is not a marriage-grade saṃskāra.",
        source: {
          ne: "मुहूर्त चिन्तामणि १२.१८ (वास्तु प्रकरण)",
          en: "Muhūrta Chintāmaṇi 12.18 (Vāstu Prakaraṇa)",
        },
        shloka: MC_GP_TITHI_SHLOKA,
        gloss: {
          ne: "शास्त्रीय निषेधमा आइत/मंगल, रिक्ता (४,९,१४), पर्व (८,१४,१५), औंसी र प्रतिपदा पर्छन्। हाम्रो उदार नियम: प्रतिपदा, रिक्ता र अमावस्या मात्र वर्जित — बाँकी ग्राह्य (शास्त्रबाट प्रेरित भएर प्रणालीले यसरी लागू गर्छ)।",
          en: "The classical prohibition covers Sunday/Tuesday, rikta (4,9,14), parva (8,14,15), Amāvasyā and Pratipadā. Our lenient gate: only Pratipadā, rikta and Amāvasyā are barred — the rest qualify (inspired by the śāstra, applied this way by the system).",
        },
      },
      {
        id: "nakshatra",
        ne: "नक्षत्र — मृदु/ध्रुव/चर/क्षिप्र श्रेणी: रोहिणी, मृगशिरा, पुनर्वसु, उत्तराफाल्गुनी, हस्त, चित्रा, स्वाती, अनुराधा, उत्तराषाढा, श्रवण, धनिष्ठा, उत्तरभाद्रपदा, रेवती।",
        en: "Nakṣatra — mṛdu/dhruva/cara/kṣipra set: Rohiṇī, Mṛgaśira, Punarvasu, U.Phalgunī, Hasta, Chitrā, Svātī, Anurādhā, U.Aṣāḍhā, Śravaṇa, Dhaniṣṭhā, U.Bhādrapada, Revatī.",
        source: {
          ne: "मुहूर्त चिन्तामणि — वास्तु प्रकरण अध्याय १२, श्लोक १५ (आचार्य श्रीराम / राम दैवज्ञ)",
          en: "Muhūrta Chintāmaṇi — Vāstu prakaraṇa ch. 12, verse 15 (Ācārya Śrīrāma / Rāma Daivajña)",
        },
        shloka: "मृदुकुध्रुववारुणमारुतधनिष्ठाकरतिष्यैः । गृहमारम्भणं शुभदं खातविधेर्वास्तुपूजा च ॥ १५ ॥",
        gloss: {
          ne: "श्लोकअनुसार: मृदु (मृगशिरा, रेवती, चित्रा, अनुराधा), कु/रोहिणी, ध्रुव (तीन उत्तरा), वारुण (शतभिषा), मारुत (स्वाती), धनिष्ठा, कर (हस्त), तिष्य (पुष्य) — यी १३ नक्षत्रमा गृहारम्भ 'शुभद' (सुखदायी)। श्लोकको उत्तरार्धले खात (जग खन्ने) र वास्तुपूजा पनि यिनै नक्षत्रमा शुभ भन्छ। पुनर्वसु र श्रवण नेपाली पञ्चाङ्ग तथा अन्य वास्तु परम्परामा ग्राह्य मानिएकाले प्रणालीले पनि स्वीकार गर्छ — यी दुई उक्त श्लोकबाट लिइएका होइनन्।",
          en: "From the verse: Mṛdu (Mṛgaśira, Revatī, Chitrā, Anurādhā), Ku/Rohiṇī, Dhruva (the three Uttarās), Vāruṇa (Śatabhiṣā), Māruta (Svātī), Dhaniṣṭhā, Kara (Hasta), Tiṣya (Puṣya) — house-start in these 13 stars is 'śubhada' (giver of happiness). The verse's second half adds that foundation-digging (khāta) and the Vāstu Pūjā are likewise auspicious in these stars. Punarvasu and Śravaṇa are accepted because Nepali panchāṅga and other vāstu traditions admit them — they are not taken from this quoted verse.",
        },
      },
      {
        id: "vara",
        ne: "वार — शास्त्रीय सूचीमा मंगलबार र शनिबार वर्जित; अन्य सबै वार ग्राह्य।",
        en: "Vāra — in the classical list, Tuesday and Saturday are barred; all other weekdays are acceptable.",
        source: { ne: "बृहत्संहिता १.४ · मुहूर्त चिन्तामणि १२.१८", en: "Bṛhat Saṃhitā 1.4 · Muhūrta Chintāmaṇi 12.18" },
        shloka: "वर्ज्या रविभौमरिताः पर्वामाप्रतिपदोऽपि गृहचक्रे । क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: {
          ne: "पितामह (ब्रह्मा) का अनुसार मङ्गलबार अशुभ; शनि र मंगल क्रूर वार हुन् — गृहचक्रमा (भवन निर्माण) रवि, मंगलवार र पर्व, अमावस्या, प्रतिपदा वर्जित। यद्यपि यहाँ रविवार पनि निषेधमा उल्लिखित छ, नेपाली परम्परा र प्रणालीको व्यावहारिक नियममा आइतवार स्वीकार्य मानिएको छ; मंगल र शनि मात्र वर्जित।",
          en: "Per Pitāmaha (Brahmā), Tuesday is inauspicious; Saturn and Mars are krūra vāras — in gṛha-cakra (house construction) Sunday, Tuesday, parva, Amāvasyā and Pratipadā are barred. Though Sunday is also mentioned in the prohibition, in Nepali tradition and the system's practical rule, Sunday is accepted; only Tuesday and Saturday are barred.",
        },
      },
      {
        id: "graha",
        ne: "ग्रह — गुरु र शुक्र अस्त, बाल्य वा वृद्ध हुनुहुँदैन (धर्मसिन्धुले वास्तुकर्ममा यही नियम लगाउँछ)।",
        en: "Graha — Jupiter & Venus must not be combust (ast), bāla or vṛddha (Dharma Sindhu applies this to vāstu karma).",
        source: { ne: "धर्मसिन्धु १ (प्रथम परिच्छेद · शुक्रास्त) · मुहूर्त चिन्तामणि १.४७", en: "Dharma Sindhu 1 (Prathama Pariccheda · Śukrāsta) · Muhūrta Chintāmaṇi 1.47" },
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: {
          ne: "गुरु वा शुक्र अस्त, बाल्य, वृद्ध र मलिम्लुच अवस्थामा हुँदा शुभ कार्य वर्जित। अस्त हुनुभन्दा सात दिन अघि वृद्ध, उदय भएपछि सात दिन बाल्य — मध्यम पक्ष। प्रणालीले वास्तुकर्ममा पनि यही बाल्य/वृद्ध र अस्त फिल्टर लागू गर्छ।",
          en: "When Jupiter or Venus is combust (asta), bāla, vṛddha or during malimluca, auspicious works are barred. Seven days before setting is vṛddha; seven days after rising is bāla — the medium rule. The system applies the same combust and bāla/vṛddha filter to vāstu karma.",
        },
      },
      {
        id: "yoga",
        ne: "योग — व्यतीपात र वैधृति योग वर्जित।",
        en: "Yoga — Vyatīpāta & Vaidhṛti yoga barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka:
          "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥",
        gloss: {
          ne: "यस श्लोकमा व्यतीपात, भद्रा र वैधृति लगायत शुभकार्यमा त्याज्य दोषहरूको उल्लेख गरिएको छ। शास्त्रीय आधारमा हाम्रो प्रणालीले यसमध्ये व्यतीपात र वैधृतिलाई योगदोषका रूपमा लागू गर्छ।",
          en: "This verse lists several defects to avoid in auspicious work, including Vyatīpāta, Bhadrā and Vaidhṛti. On that classical basis, our system applies Vyatīpāta and Vaidhṛti as yoga defects.",
        },
      },
      {
        id: "karana",
        ne: "करण — विष्टि (भद्रा) करण वर्जित।",
        en: "Karaṇa — Viṣṭi (Bhadrā) karaṇa barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka:
          "जन्मार्क्षमासतिथयो व्यतिपातभद्रा वैधृत्यमापितृदिनानि तिथिक्षयद्वौ । न्यूनार्द्धिमासकुलिकप्रहराधपाता विष्कम्भमृद्व्यतिगतित्रयमेव वर्ज्यम् ॥",
        gloss: {
          ne: "यस श्लोकमा उल्लिखित 'भद्रा' ले विष्टि करण जनाउँछ। प्रणालीले सम्पूर्ण विष्टि करणलाई वर्जित मान्छ।",
          en: "The word 'Bhadrā' in this verse denotes Viṣṭi karaṇa. The system treats the entire Viṣṭi karaṇa as barred.",
        },
      },
      {
        id: "lagna",
        ne: "लग्न — स्थिर (वृष, सिंह, वृश्चिक, कुम्भ) प्राथमिकता, द्विस्वभाव स्वीकार्य; चर लग्न वर्जित — भवन स्थिर रहोस्।",
        en: "Lagna — fixed (Vṛṣa, Siṃha, Vṛśchika, Kumbha) preferred, dual accepted; movable lagnas barred — so the building is stable.",
        source: { ne: "मुहूर्त चिन्तामणि १२ (वास्तु प्रकरण · वसिष्ठ)", en: "Muhūrta Chintāmaṇi 12 (Vāstu Prakaraṇa · Vasiṣṭha)" },
        shloka:
          "स्थिरलग्ने गृहं कार्यं चरं च न कदाचन । द्विस्वभावं भवेच्छस्तं लग्नदोषविवर्जितम् ॥",
        gloss: {
          ne: "स्थिर लग्नमा गृहकार्य गर्नुपर्छ; चर लग्न कहिल्यै छनोट गर्नु हुँदैन। द्विस्वभाव लग्न स्वीकार्य हुन्छ यदि लग्न दोषबाट रहित छ भने। वास्तुशास्त्रीय परम्पराअनुसार स्थिर लग्नमा जग हाल्दा भवनको स्थिरता बढ्ने मानिन्छ। प्रणालीले चर लग्न त्याग्छ; द्विस्वभाव स्वीकार्य राख्छ।",
          en: "House construction should be done in a fixed lagna; movable lagna must never be chosen. Dual-natured lagna is acceptable if free from lagna defects. Per vāstu tradition, a fixed lagna is favoured for the building's stability. The system drops movable lagnas and keeps dual (dvisvabhāva) acceptable.",
        },
      },
      {
        id: "lagna-strength",
        ne: "लग्न बल र ग्रह योग — सूर्य सप्तम, बुध चतुर्थ, शुक्र तृतीय र गुरु लग्नमा भए शत–शत वर्ष स्थायित्व।",
        en: "Lagna strength & planetary yoga — Sun in 7th, Mercury in 4th, Venus in 3rd and Jupiter in lagna ensure hundred-hundred years' stability.",
        source: { ne: "मुहूर्त चिन्तामणि १२.२२ (वास्तु प्रकरण · आचार्य श्रीराम)", en: "Muhūrta Chintāmaṇi 12.22 (Vāstu Prakaraṇa · Ācārya Śrīrāma)" },
        shloka:
          "लग्ने सुरेज्ये सप्तमगे च सूर्ये बुधे चतुर्थे भृगुजे त्रिजेऽर्के। शतं भवेत्तत्र गृहस्य चायुस्तथापरं वर्षशतं वदन्ति ॥ २२ ॥",
        gloss: {
          ne: "गुरु लग्नमा, सूर्य सप्तममा, बुध चतुर्थमा र शुक्र तृतीयमा हुँदा त्यस गृहको आयु सय वर्ष; तथा अर्को सय वर्ष भनिन्छ (अर्थात् शत–शत = दुई सय)। शास्त्रीय योगले गृहको दीर्घायु र समृद्धि सुनिश्चित गर्छ।",
          en: "When Jupiter is in lagna, Sun in the 7th, Mercury in the 4th and Venus in the 3rd, that house's lifespan is one hundred years; and another hundred years is said (i.e. hundred-hundred = two hundred). This classical yoga ensures the house's longevity and prosperity.",
        },
      },
      {
        ne: "दुर्मुहूर्त परेको अवधि छाडिन्छ (पूरै दिन होइन); संक्रान्ति (साधारण ±६ घण्टा, प्रमुख ±१६ घण्टा) र ग्रहणको दिन वर्जित।",
        en: "Dur-muhūrta skips only the affected period (not the whole day); Sankrānti (ordinary ±6h, cardinal ±16h) and the eclipse day are barred.",
        source: {
          ne: "मुहूर्त चिन्तामणि — ग्रहण १.३२ · दुर्मुहूर्त १.३७–४० (शुभाशुभ प्रकरण)",
          en: "Muhūrta Chintāmaṇi — eclipse 1.32 · Dur-muhūrta 1.37–40 (Śubhāśubha Prakaraṇa)",
        },
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: {
          ne: "शास्त्रमा संक्रान्ति आसपासको अवधि त्याज्य मानिएको छ (संस्करणअनुसार घटी फरक हुन सक्छ)। प्रणालीले त्यसलाई व्यावहारिक रूपमा साधारण ±६ र प्रमुख ±१६ घण्टाको सुरक्षा अवधिका रूपमा लागू गर्छ; दुर्मुहूर्त घडी र ग्रहणको दिन पनि छाडिन्छ।",
          en: "Classically, time around Sankrānti is rejected (ghaṭī values vary by edition). The system applies this practically as ±6h ordinary and ±16h cardinal buffers; Dur-muhūrta slices and the eclipse day are also skipped.",
        },
      },
      {
        ne: "निर्माणकार्य चातुर्मासमा रोकिँदैन — त्यसैले चातुर्मास वर्जित छैन।",
        en: "Construction is not paused during Chaturmāsa, so it is not barred here.",
        source: {
          ne: "धर्मसिन्धु १ — मलमासे वर्ज्यानि (प्रथम परिच्छेद · निषेध सूचीको सीमा)",
          en: "Dharma Sindhu 1 — Malmāse Varjyāni (Prathama Pariccheda · scope of the ban list)",
        },
        gloss: {
          ne: "धर्मसिन्धुले चातुर्मासमा निर्माण रोक्न स्पष्ट निषेध गरेको छैन — चातुर्मास विशेष गरी विवाह, ब्रतबन्ध, प्रतिष्ठा जस्ता संस्कारमा कडा हेरिन्छ। प्रणालीले वास्तुकर्ममा चातुर्मास फिल्टर लगाउँदैन; नयाँ गृहप्रवेशमा भने चातुर्मास/अधिकमास विचार गरिन्छ।",
          en: "Dharma Sindhu does not explicitly ban continuing construction in Chaturmāsa — that season is strict mainly for vivāha, bratabandha and pratiṣṭhā. The system does not apply a Chaturmāsa filter to vāstu construction; new gṛha-praveśa still weighs Chaturmāsa/Adhik-māsa.",
        },
      },
    ],
  },
  "griha-pravesh": {
    description: {
      ne: "नयाँ घरमा प्रवेश (गृह प्रवेश) का लागि शुभ मिति — सपरिवार नयाँ निवासमा बसाइँ सर्ने शुभ दिन।",
      en: "Auspicious dates for entering and settling into a new home.",
    },
    method: MUHURTA_INTRO,
    rules: [
      {
        ne: "महिना — माघ, फागुन, चैत, वैशाख, ज्येष्ठ, मंसिर मात्र; अधिकमास र चातुर्मास वर्जित।",
        en: "Month — only Māgha, Phālguna, Chaitra, Vaiśākha, Jyeṣṭha, Mārgaśīrṣa; Adhik-māsa & Chaturmāsa barred.",
        source: { ne: "मुहूर्त चिन्तामणि १३.१ (गृहप्रवेश प्रकरण)", en: "Muhūrta Chintāmaṇi 13.1 (Gṛhapraveśa Prakaraṇa)" },
        shloka: MC_GP_MONTH_SHLOKA,
        gloss: MC_GP_MONTH_GLOSS,
      },
      {
        ne: "सूर्यबल — सूर्य मिथुन, वृश्चिक वा मीनमा हुनुहुँदैन (मलमास तुल्य)।",
        en: "Surya Bala — Sun not in Mithuna, Vṛśchika or Mīna (Malamas-like).",
        source: { ne: "मुहूर्त चिन्तामणि १२.१६ (वास्तु प्रकरण)", en: "Muhūrta Chintāmaṇi 12.16 (Vāstu Prakaraṇa)" },
        shloka: MC_GP_SUN_SHLOKA,
        gloss: MC_GP_SUN_GLOSS,
      },
      {
        ne: "तिथि — शुक्ल पक्षका वृद्धि तिथि २,३,५,७,१०,११,१३ मात्र; रिक्ता, अमावस्या र प्रतिपदा वर्ज्य।",
        en: "Tithi — only the śukla-pakṣa growth tithis 2,3,5,7,10,11,13; rikta, Amāvasyā and Pratipadā barred.",
        source: { ne: "मुहूर्त चिन्तामणि १३.५ (गृहप्रवेश प्रकरण)", en: "Muhūrta Chintāmaṇi 13.5 (Gṛhapraveśa Prakaraṇa)" },
        shloka: MC_GP_TITHI_SHLOKA,
        gloss: MC_GP_TITHI_GLOSS,
      },
      {
        ne: "नक्षत्र — स्थिर/मृदु ८ नक्षत्र: रोहिणी, मृगशिरा, उत्तराफाल्गुनी, चित्रा, अनुराधा, उत्तराषाढा, उत्तरभाद्रपदा, रेवती। (कुनै वर्षमा १२ भन्दा कम दिन भए हस्त, स्वाती, श्रवण, धनिष्ठा पनि थपिन्छन्।)",
        en: "Nakṣatra — the conservative 8 (sthira/mṛdu): Rohiṇī, Mṛgaśira, U.Phalgunī, Chitrā, Anurādhā, U.Aṣāḍhā, U.Bhādrapada, Revatī. (If a year has fewer than 12 days, Hasta, Svātī, Śravaṇa & Dhaniṣṭhā are also admitted.)",
        source: { ne: "मुहूर्त चिन्तामणि १३.१ (सूची १३.३/भाष्य)", en: "Muhūrta Chintāmaṇi 13.1 (list in 13.3 / comm.)" },
        shloka: MC_GP_NAK_SHLOKA,
        gloss: MC_GP_NAK_GLOSS,
      },
      {
        ne: "योग/करण — व्यतीपात र वैधृति योग तथा विष्टि (भद्रा) करण वर्जित।",
        en: "Yoga/Karaṇa — Vyatīpāta & Vaidhṛti yoga and Viṣṭi (Bhadrā) karaṇa barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        ne: "ग्रह — गुरु र शुक्र अस्त, बाल्य वा वृद्ध हुनुहुँदैन (धर्मसिन्धुले वास्तुकर्ममा यही नियम लगाउँछ); चन्द्रमा लग्नबाट २/४/५/८/९/१२ भावमा हुनुहुँदैन।",
        en: "Graha — Jupiter & Venus must not be combust (ast), bāla or vṛddha (Dharma Sindhu applies this to vāstu karma); Moon not in the 2/4/5/8/9/12 house from the lagna.",
        source: { ne: "धर्मसिन्धु (वास्तुकर्म)", en: "Dharma Sindhu (vāstu karma)" },
        shloka: "अस्ते च गुरौ शुक्रे बाले वृद्धे मलिम्लुचे।",
        gloss: {
          ne: "गुरु वा शुक्र अस्त, बाल्य, वृद्ध र मलिम्लुच अवस्थामा हुँदा शुभ कार्य वर्जित। अस्त हुनुभन्दा सात दिन अघि वृद्ध, उदय भएपछि सात दिन बाल्य — मध्यम पक्ष। प्रणालीले गृहप्रवेशमा पनि यही बाल्य/वृद्ध र अस्त फिल्टर लागू गर्छ।",
          en: "When Jupiter or Venus is combust (asta), bāla, vṛddha or during malimluca, auspicious works are barred. Seven days before setting is vṛddha; seven days after rising is bāla — the medium rule. The system applies the same combust and bāla/vṛddha filter to gṛha-praveśa.",
        },
      },
      {
        ne: "लग्न — स्थिर र द्विस्वभाव लग्न मात्र स्वीकार्य; चर लग्न वर्जित।",
        en: "Lagna — only fixed (sthira) and dual (dvisvabhāva) ascendants accepted; movable ascendants rejected.",
        source: { ne: "मुहूर्त चिन्तामणि १२ (वास्तु प्रकरण · वसिष्ठ-वचन)", en: "Muhūrta Chintāmaṇi 12 (Vāstu Prakaraṇa · Vasiṣṭha)" },
        shloka: MC_GP_LAGNA_SHLOKA,
        gloss: MC_GP_LAGNA_GLOSS,
      },
      {
        ne: "दोष — दग्धा, शून्य, मलेफिक लत्ता (सूर्य/मंगल/शनि/राहु/केतु), दुर्मुहूर्त (अवधि मात्र), संक्रान्ति र ग्रहणको दिन वर्जित।",
        en: "Doṣa — Dagdha, Śūnya, malefic Latta (Sun/Mars/Saturn/Rāhu/Ketu), Dur-muhūrta (period only), Sankrānti and the eclipse day excluded.",
        source: { ne: "मुहूर्त चिन्तामणि — ग्रहण १.३२, दग्धा १.८, शून्य १.१०, महादोष १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi — eclipse 1.32, Dagdha 1.8, Śūnya 1.10, mahā-doṣa 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: MC_GP_GRAHANA_GLOSS,
      },
    ],
  },
  "byaparik-pratisthan": {
    description: {
      ne: "नयाँ व्यापार, पसल वा प्रतिष्ठान उद्घाटनका लागि शुभ मिति।",
      en: "Auspicious dates for opening a new business, shop or establishment.",
    },
    method: DAYTIME_INTRO,
    rules: [
      {
        ne: "महिना — अधिकमास बाहेक सबै चन्द्रमास (चातुर्मास पनि स्वीकार्य); संक्रान्तिको दिन वर्जित।",
        en: "Month — all lunar months except Adhik-māsa (Chaturmāsa is allowed); the Sankrānti day is barred.",
        source: {
          ne: "मुहूर्त चिन्तामणि १.४७ · १.१८ (शुभाशुभ प्रकरण)",
          en: "Muhūrta Chintāmaṇi 1.47 · 1.18 (Śubhāśubha Prakaraṇa)",
        },
        shloka:
          "वृद्धत्वस्तशिशुत्वइज्यसितयोर्योनाधिमासे तथा ॥ ४७ ॥ [३३८]  विवाहादिषु कार्येषु नाड्यः षोडश षोडश ॥ [२७२]",
        gloss: {
          ne: "अधिमास (मलमास) मा नयाँ व्यापार वा भवनारम्भ जस्ता कार्य वर्जित। संक्रान्तिको अघिल्लो र पछिल्लो १६–१६ घडी (कुल ३२ घडी / संक्रान्तिको दिन) सबै शुभ कार्यका लागि त्याज्य — प्रणालीले संक्रान्तिको दिन नै वर्जित गर्छ।",
          en: "Adhimāsa (Malmāsa) bars new trade and building rites. Around Sankrānti, 16 nāḍīs before and after (32 nāḍīs / the Sankrānti day) are barred for auspicious work — the system excludes the Sankrānti day itself.",
        },
      },
      {
        ne: "तिथि — दुवै पक्षका २,३,५,७,१०,११,१३; पूर्णिमा पनि स्वीकार्य।",
        en: "Tithi — 2,3,5,7,10,11,13 of both pakṣas; Pūrṇimā also accepted.",
        source: {
          ne: "मुहूर्त चिन्तामणि १.४ · १.३६ (शुभाशुभ प्रकरण)",
          en: "Muhūrta Chintāmaṇi 1.4 · 1.36 (Śubhāśubha Prakaraṇa)",
        },
        shloka:
          "नंदा भद्रा च जया च रिक्ता पूर्णेति तिथ्योऽशुभमध्यशस्ताः ॥ [२८५]  चतुर्थी षष्ठी अष्टमी नवमी द्वादशी चतुर्दशी एताः पक्षरन्ध्रसंज्ञिस्ततियो ज्ञेयाः ॥ [३१०]",
        gloss: {
          ne: "रिक्ता (४,९,१४) शुभ कार्यमा अशुभ; पक्षरन्ध्र (४,६,८,९,१२,१४) पनि त्याज्य। यी कटाउँदा २,३,५,७,१०,११,१३ र पूर्णिमा (१५) मात्र बाँकी रहन्छन् — यही प्रणालीको तिथि सूची हो।",
          en: "Riktā (4,9,14) are inauspicious for śubha work; Pakṣa-randhra (4,6,8,9,12,14) are likewise dropped. What remains are 2,3,5,7,10,11,13 and Pūrṇimā (15) — the system's tithi list.",
        },
      },
      {
        ne: "नक्षत्र — व्यापारका लागि उपयुक्त निश्चित सूची: अश्विनी, रोहिणी, मृगशिरा, पुनर्वसु, पुष्य, उत्तराफाल्गुनी, हस्त, चित्रा, स्वाती, अनुराधा, उत्तराषाढा, श्रवण, धनिष्ठा, शतभिषा, उत्तरभाद्रपदा, रेवती।",
        en: "Nakṣatra — a fixed list of trade-favourable nakṣatras: Aśvinī, Rohiṇī, Mṛgaśira, Punarvasu, Puṣya, U.Phalgunī, Hasta, Chitrā, Svātī, Anurādhā, U.Aṣāḍhā, Śravaṇa, Dhaniṣṭhā, Śatabhiṣā, U.Bhādrapada, Revatī.",
        source: {
          ne: "मुहूर्त चिन्तामणि २.१७ (नक्षत्र प्रकरणम्)",
          en: "Muhūrta Chintāmaṇi 2.17 (Nakṣatra Prakaraṇam)",
        },
        shloka:
          "पूर्वाद्वित्रयकृशानुपार्यमभे केन्द्रत्रिकोणे शुभैः षट्त्र्यायप्रयवश्विभैर्विना घटतनुं स्रग्विक्रयः सत्तिथौ । रिक्ताभौमघटालमन्विना च विपणिसैंन्ध्रुवक्षिप्रमै- लग्ने चन्द्रसिते व्ययाष्टरहितैः पापैः शुभैद्र्व्यार्यखे ॥ १७ ॥ [३४२]",
        gloss: {
          ne: "व्यापार (स्रग्विक्रय / विपणि) का लागि ध्रुव (रोहिणी, तीन उत्तरा), मृदु (मृगशिरा, रेवती, चित्रा, अनुराधा), क्षिप्र (हस्त, अश्विनी, पुष्य) र चर (स्वाती, पुनर्वसु, श्रवण, धनिष्ठा, शतभिषा) — जम्मा १६ नक्षत्र शुभ। श्लोकमै रिक्ता र भौम (मंगलवार) पनि निषेधमा उल्लिखित छन्।",
          en: "For trade (srag-vikraya / vipaṇi) the auspicious stars are Dhruva (Rohiṇī, the three Uttarās), Mṛdu (Mṛgaśira, Revatī, Chitrā, Anurādhā), Kṣipra (Hasta, Aśvinī, Puṣya) and Chara (Svātī, Punarvasu, Śravaṇa, Dhaniṣṭhā, Śatabhiṣā) — 16 in all. The same verse also names Riktā and Bhauma (Tuesday) among the prohibitions.",
        },
      },
      {
        ne: "वार — सोम, बुध, बिहि, शुक्र मात्र (आइत/मंगल/शनि वर्जित)।",
        en: "Vāra — only Mon/Wed/Thu/Fri (Sun/Tue/Sat barred).",
        source: {
          ne: "बृहत्संहिता १.४ · मुहूर्त चिन्तामणि २.१७",
          en: "Bṛhat Saṃhitā 1.4 · Muhūrta Chintāmaṇi 2.17",
        },
        shloka: "क्षितितनयदिवसवारो न शुभकृदिति यदि पितामहोक्ते ।",
        gloss: {
          ne: "पितामह (ब्रह्मा) का अनुसार मङ्गलबार अशुभ; शनि र मंगल क्रूर वार — व्यापार आरम्भमा आइत/मंगल/शनि त्यागी सोम, बुध, बिहीबार र शुक्रबार लिइन्छ। मुहूर्त चिन्तामणि २.१७ ले पनि भौम (मंगलवार) निषेध गर्छ।",
          en: "Per Pitāmaha (Brahmā), Tuesday is inauspicious; Saturn and Mars are krūra vāra — for a business opening Sun/Tue/Sat are dropped, keeping Mon, Wed, Thu and Fri. Muhūrta Chintāmaṇi 2.17 likewise bars Bhauma (Tuesday).",
        },
      },
      {
        ne: "लग्न — स्थिर र द्विस्वभाव लग्न मात्र स्वीकार्य; चर लग्न वर्जित।",
        en: "Lagna — only fixed (sthira) and dual (dvisvabhāva) ascendants accepted; movable rejected.",
        source: {
          ne: "मुहूर्त चिन्तामणि २.१७ (नक्षत्र प्रकरणम् · लग्न निर्देश)",
          en: "Muhūrta Chintāmaṇi 2.17 (Nakṣatra Prakaraṇam · lagna instruction)",
        },
        shloka:
          "रिक्ताभौमघटालमन्विना च विपणिसैंन्ध्रुवक्षिप्रमै- लग्ने चन्द्रसिते व्ययाष्टरहितैः पापैः शुभैद्र्व्यार्यखे ॥ १७ ॥ [३४२]",
        gloss: {
          ne: "श्लोकले 'घट' (कुम्भ) लग्न र त्यसको नवांशलाई 'विना' भन्दै निषेध गर्छ। व्यापार टिकिरहोस् भन्नका लागि स्थिर लग्न (वृष, सिंह, वृश्चिक) र द्विस्वभाव लग्न (मिथुन, कन्या, धनु, मीन) उत्तम; चर लग्न (मेष, कर्कट, तुला, मकर) चलायमान भएकाले वर्जित। प्रणालीले स्थिर/द्विस्वभाव मात्र स्वीकार्छ।",
          en: "The verse explicitly bars 'ghaṭa' (Kumbha) lagna and its navāṃśa with 'vinā' (except). For lasting trade, fixed lagnas (Vṛṣabha, Siṃha, Vṛśchika) and dual ones (Mithuna, Kanyā, Dhanu, Mīna) are preferred; movable lagnas (Meṣa, Karkaṭa, Tulā, Makara) bring instability and are barred. The system accepts only sthira/dvisvabhāva.",
        },
      },
      {
        ne: "योग/करण — व्यतीपात र वैधृति योग तथा विष्टि (भद्रा) करण वर्जित।",
        en: "Yoga/Karaṇa — Vyatīpāta & Vaidhṛti yoga and Viṣṭi (Bhadrā) karaṇa barred.",
        source: { ne: "मुहूर्त चिन्तामणि १.३४ (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi 1.34 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_1_34_SHLOKA,
        gloss: MC_1_34_GLOSS,
      },
      {
        ne: "दोष — दुर्मुहूर्त (अवधि मात्र), संक्रान्ति र ग्रहणको दिन वर्जित।",
        en: "Doṣa — Dur-muhūrta (period only), Sankrānti and the eclipse day excluded.",
        source: { ne: "मुहूर्त चिन्तामणि — ग्रहण १.३२ · दुर्मुहूर्त १.३७–४० (शुभाशुभ प्रकरण)", en: "Muhūrta Chintāmaṇi — eclipse 1.32 · Dur-muhūrta 1.37–40 (Śubhāśubha Prakaraṇa)" },
        shloka: MC_GP_GRAHANA_SHLOKA,
        gloss: MC_GP_GRAHANA_GLOSS,
      },
      {
        ne: "ग्रह — व्यापार आरम्भ अन्य संस्कारभन्दा उदार भएकाले गुरु/शुक्र उदय अनिवार्य छैन; दिनको समय (सूर्योदय–सूर्यास्त) मात्र।",
        en: "Graha — business opening is more lenient than other rites, so Guru/Śukra udaya is NOT required; daytime only (sunrise→sunset).",
        source: {
          ne: "मुहूर्त चिन्तामणि १.४६–४७ (शुभाशुभ प्रकरण)",
          en: "Muhūrta Chintāmaṇi 1.46–47 (Śubhāśubha Prakaraṇa)",
        },
        shloka:
          "वाप्यारामडागतडागकूपभवनारम्भप्रतिष्ठे व्रता- रम्भोत्सर्गवधूप्रवेशनमहादानानि सोमाष्टके ॥ ४६ ॥  वृद्धत्वस्तशिशुत्वइज्यसितयोर्योनाधिमासे तथा ॥ ४७ ॥ [३३८]",
        gloss: {
          ne: "श्लोक ४६–४७ ले गुरु/शुक्र अस्त वा मलमासमा त्याग्नुपर्ने कार्य सूची दिन्छ — विवाह, व्रतबन्ध, भवनारम्भ, प्रतिष्ठा आदि। त्यस निषेध सूचीमा 'विपणि' (व्यापार आरम्भ) उल्लेख छैन, त्यसैले गुरु–शुक्र उदय अनिवार्य मानिँदैन — अन्य संस्कारभन्दा उदार। समय भने दिवाकाल (सूर्योदय–सूर्यास्त) मा सीमित छ।",
          en: "Verses 46–47 list rites barred when Guru/Śukra are combust or during Malmāsa — vivāha, bratabandha, building-start, pratiṣṭhā, etc. 'Vipaṇi' (opening a shop/trade) is not on that prohibition list, so Guru/Śukra udaya is not mandatory — more lenient than other saṃskāras. Timing is still limited to daytime (sunrise→sunset).",
        },
      },
    ],
  },
  "rudri-jurne": {
    description: {
      ne: "रुद्री पाठ तथा हवनका लागि शुभ मिति — शिव आराधनासम्बन्धी अनुष्ठानका दिन।",
      en: "Auspicious dates for the Rudri recitation and homa in worship of Śiva.",
    },
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले गणना गर्छ। यो साइत लग्नमा आधारित होइन — रुद्री हवनसहित हुने भएकाले प्रत्येक दिनको तिथिबाट शिववास र तिथि-वारबाट अग्निवास दुवै हेरी शुभ दिन निकालिन्छ।",
      en: "These dates are computed by our own system. This sāit is not lagna-based — since Rudri includes a homa, each day is judged by BOTH the Śiva-vāsa formula (deity's abode) and the Agni-vāsa formula (fire's abode).",
    },
    rules: [
      {
        ne: "शिववास सूत्र — पूर्ण तिथि (१–३०) मा (२×तिथि+५) लाई ७ ले भाग गर्दा शेष १/२/३ (कैलाश/गौरी/नन्दी) भए शुभ।",
        en: "Śiva-vāsa — on the absolute tithi (1–30), (2×tithi+5) mod 7 ∈ {1,2,3} (Kailāsa/Gaurī/Nandi) is auspicious.",
        source: {
          ne: "मुहूर्त चिन्तामणि / धर्मसिन्धु (शिववास सूत्र)",
          en: "Muhūrta Chintāmaṇi / Dharma Sindhu (Śiva-vāsa formula)",
        },
        shloka:
          "पक्षस्य द्विगुणीं तिथिं पञ्चभिस्तु समन्वितम्। सप्तभिस्तु हरेद्भागं शेषं शिवनिवासकम् ॥ [३३८]",
        gloss: {
          ne: "वर्तमान तिथिलाई २ ले गुणा गरी ५ जोड्ने; योगफललाई ७ ले भाग गर्दा आउने शेषले शिवको निवास जनाउँछ। शेष १ कैलाश, २ गौरी-सन्निधि, ३ वृषभारूढ/नन्दी — तीनै अत्यन्त/शुभ। गणना सूर्योदयकालीन तिथिमा गरिन्छ।",
          en: "Double the current tithi and add 5; divide by 7 — the remainder is Śiva's abode. Remainder 1 = Kailāsa, 2 = with Gaurī, 3 = mounted on the bull/Nandi — all three auspicious. Computed on the sunrise tithi.",
        },
      },
      {
        ne: "सभा, भोजन, क्रीडा, श्मशान (शेष ४/५/६/०) वर्जित; अमावस्या वर्जित।",
        en: "Sabhā, Bhojana, Krīḍā, Śmaśāna (remainders 4/5/6/0) avoided; Amāvasyā excluded.",
        source: {
          ne: "मुहूर्त चिन्तामणि / धर्मसिन्धु (शिववास फल · अमावस्या)",
          en: "Muhūrta Chintāmaṇi / Dharma Sindhu (Śiva-vāsa fruits · Amāvasyā)",
        },
        shloka:
          "पक्षस्य द्विगुणीं तिथिं पञ्चभिस्तु समन्वितम्। सप्तभिस्तु हरेद्भागं शेषं शिवनिवासकम् ॥ [३३८]",
        gloss: {
          ne: "शेष ४ सभा (सन्तानकष्ट), ५ भोजन (धनहानि), ६ क्रीडा (रोग/कष्ट), ० वा ७ श्मशान (मृत्युतुल्य अमङ्गल) — सबै वर्जित। अमावस्या (औंसी) रुद्रीका लागि सधैं त्याज्य।",
          en: "Remainder 4 = Sabhā (progeny trouble), 5 = Bhojana (wealth loss), 6 = Krīḍā (illness), 0 or 7 = Śmaśāna (death-like inauspiciousness) — all barred. Amāvasyā is always excluded for Rudri.",
        },
      },
      {
        ne: "अग्निवास सूत्र — हवनका लागि अग्नि पृथ्वीमा हुनुपर्छ: (तिथि + वार + १) लाई ४ ले भाग गर्दा शेष ० वा ३ भए शुभ (शेष १ स्वर्ग, २ पाताल — अशुभ)।",
        en: "Agni-vāsa — for the homa the fire must be on Earth: (tithi + vāra + 1) mod 4 ∈ {0,3} is auspicious (remainder 1 = Heaven, 2 = Pātāla — inauspicious).",
        source: { ne: "मुहूर्त चिन्तामणि २.३६", en: "Muhūrta Chintāmaṇi 2.36" },
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_GLOSS,
      },
      {
        ne: "नित्य/नैमित्तिक कर्म (सामान्य रुद्राभिषेक) मा अग्निवासको विचार अनिवार्य छैन — मुनिमत।",
        en: "For Nitya/Naimittika rites (a general Rudrābhiṣeka) the Agni-vāsa check is not strictly mandatory — per the sages.",
        source: { ne: "मुहूर्त चिन्तामणि २.३६ (भाष्य)", en: "Muhūrta Chintāmaṇi 2.36 (comm.)" },
        shloka: MC_2_36_NITYA_SHLOKA,
        gloss: MC_2_36_NITYA_GLOSS,
      },
      {
        ne: "योग/करण — व्यतीपात र वैधृति योग तथा विष्टि (भद्रा) करण वर्जित।",
        en: "Yoga/Karaṇa — Vyatīpāta & Vaidhṛti yoga and Viṣṭi (Bhadrā) karaṇa barred.",
        source: {
          ne: "मुहूर्त चिन्तामणि · धर्मसिन्धु (महादोष · भद्रा)",
          en: "Muhūrta Chintāmaṇi · Dharma Sindhu (mahā-doṣa · Bhadrā)",
        },
        shloka:
          "व्यतीपाते तथा पाते… वर्जयेच्छुभम् ॥ [३६२]  न कुर्यान्मङ्गलं विष्ट्यां जीवितार्थी कदाचन ॥ [३७१]",
        gloss: {
          ne: "व्यतीपात र वैधृति (पात) सबै शुभ कार्यमा महादोष। भद्रा (विष्टि करण) मा मङ्गलकार्य नगर्ने — अभिषेकले कार्यको नाश गर्छ भन्ने शास्त्रीय चेतावनी।",
          en: "Vyatīpāta and Vaidhṛti (Pāta) are mahā-doṣa for all auspicious rites. Never do a maṅgala act in Viṣṭi (Bhadrā) — abhiṣeka in that karaṇa destroys the work.",
        },
      },
      {
        ne: "अष्टमी/चतुर्दशी तिथि र श्रावण/कार्तिक महिना विशेष उत्तम (वरीयता मात्र, अनिवार्य होइन); चन्द्र/तारा बल जातक-सापेक्ष।",
        en: "Aṣṭamī/Chaturdaśī tithi and the Śrāvaṇa/Kārtika months are especially favoured (a preference, not a gate); Chandra/Tārā Bala is native-specific.",
        source: { ne: "मुहूर्त चिन्तामणि १.३", en: "Muhūrta Chintāmaṇi 1.3" },
        shloka: MC_1_3_TITHISHA_SHLOKA,
        gloss: MC_1_3_TITHISHA_GLOSS,
      },
      {
        ne: "यो दिनको सूर्योदय पञ्चाङ्गमा गणना हुन्छ — लग्न विण्डो आवश्यक पर्दैन।",
        en: "Evaluated on the day's sunrise panchāṅga — no lagna window is needed.",
        source: {
          ne: "शिववास गणना विधि (सूर्योदय तिथि)",
          en: "Śiva-vāsa method (sunrise tithi)",
        },
        gloss: {
          ne: "शिववास दिनको सूर्योदयकालीन तिथिमा आधारित हुन्छ। विवाह/व्रतबन्ध जस्तो विशेष लग्न विण्डो चाहिँदैन — शिववास अनुकूल भएको दिनभरि रुद्री गर्न सकिन्छ।",
          en: "Śiva-vāsa is based on the day's sunrise tithi. No special lagna window (as for vivāha/bratabandha) is required — Rudri may be done throughout a day when Śiva-vāsa is favourable.",
        },
      },
    ],
  },
  "agni-jurne": {
    description: {
      ne: "यज्ञ/हवनका लागि अग्नि स्थापना गर्ने शुभ मिति।",
      en: "Auspicious dates for establishing the sacred fire (Agni) to begin a yajña or homa.",
    },
    method: {
      ne: "यी मितिहरू हाम्रो आफ्नै प्रणालीले गणना गर्छ। यो साइत लग्नमा आधारित होइन — प्रत्येक दिनको तिथि र वारबाट तलको अग्निवास सूत्र लगाएर शुभ दिन निकालिन्छ।",
      en: "These dates are computed by our own system. This sāit is not lagna-based — for each day the Agni-vāsa formula below is applied to the tithi and weekday.",
    },
    rules: [
      {
        ne: "अग्निवास सूत्र — (तिथि + वार + १) लाई ४ ले भाग गर्दा शेष ० वा ३ आए अग्नि पृथ्वी (भूमि) मा हुन्छ, जुन हवनका लागि शुभ मानिन्छ।",
        en: "Agni-vāsa — (tithi + vāra + 1) mod 4: a remainder of 0 or 3 puts Agni on Earth (Bhūmi), which is auspicious for havan.",
        source: {
          ne: "मुहूर्त चिन्तामणि २.३६ (अग्न्याधान प्रकरण)",
          en: "Muhūrta Chintāmaṇi 2.36 (Agnyādhāna Prakaraṇa)",
        },
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_GLOSS,
      },
      {
        ne: "शेष १ आए अग्नि स्वर्गमा (प्राणनाश) र शेष २ आए पातालमा (धननाश) — दुवै अशुभ मानिन्छ।",
        en: "Remainder 1 puts Agni in Heaven (loss of life) and remainder 2 in Pātāla (loss of wealth) — both inauspicious.",
        source: {
          ne: "मुहूर्त चिन्तामणि २.३६ · पीयूषधारा टीका",
          en: "Muhūrta Chintāmaṇi 2.36 · Pīyūṣadhārā commentary",
        },
        shloka: MC_2_36_AGNIVASA_PHALA_SHLOKA,
        gloss: MC_2_36_AGNIVASA_PHALA_GLOSS,
      },
      {
        ne: "पूर्ण तिथि (शुक्ल १–१५, कृष्ण १६–३०) र वार (आइत=१ … शनि=७) मा गणना।",
        en: "Computed on the absolute tithi (śukla 1–15, kṛṣṇa 16–30) and vāra (Sun=1 … Sat=7).",
        source: {
          ne: "मुहूर्त चिन्तामणि २.३६ · पीयूषधारा (गणना विधि)",
          en: "Muhūrta Chintāmaṇi 2.36 · Pīyūṣadhārā (computation method)",
        },
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: {
          ne: "शुक्ल प्रतिपदादेखि कृष्ण अमावस्यासम्म ३० तिथि गनिन्छ — शुक्ल १–१५, कृष्णलाई १६–३०। वर्तमान तिथिमा १ जोडी वार संख्या (रवि=१ … शनि=७) थप्ने; ४ ले भाग दिएर शेष हेर्ने।",
          en: "Count absolute tithis from śukla Pratipadā through kṛṣṇa Amāvasyā (30) — śukla 1–15, kṛṣṇa as 16–30. Add 1 plus the weekday number (Sun=1 … Sat=7) to the current tithi; divide by 4 and read the remainder.",
        },
      },
      {
        ne: "नित्य, नैमित्तिक र आब्दिक (वार्षिक) कर्ममा अग्निवासको विचार अनिवार्य छैन — यो मुख्यतः काम्य कर्मका लागि हो; उपनयन/विवाह जस्ता संस्कारमा पनि अनिवार्य छैन।",
        en: "For Nitya, Naimittika and Ābdika (annual) rites the Agni-vāsa check is not mandatory — it applies mainly to Kāmya (desire-driven) rites; major saṃskāras such as Upanayana/marriage also do not strictly require it.",
        source: { ne: "मुहूर्त चिन्तामणि २.३६ (भाष्य)", en: "Muhūrta Chintāmaṇi 2.36 (comm.)" },
        shloka: MC_2_36_NITYA_SHLOKA,
        gloss: MC_2_36_NITYA_GLOSS,
      },
      {
        ne: "अग्निवास तिथि र वारबाट मात्र गणना हुन्छ (यो प्रणालीको गणना विधि हो, श्लोकको छुट्टै नियम होइन)।",
        en: "Agni-vāsa is computed from the tithi and vāra alone (our system's method, not a separate clause of the verse).",
        source: {
          ne: "मुहूर्त चिन्तामणि २.३६ (गणना आधार)",
          en: "Muhūrta Chintāmaṇi 2.36 (computation basis)",
        },
        shloka: MC_2_36_AGNIVASA_SHLOKA,
        gloss: {
          ne: "मूल श्लोकले नै तिथि–वार योगबाट अग्निवास निकाल्छ — लग्न वा अन्य पञ्चाङ्ग अङ्गको छुट्टै नियम होइन; प्रणालीले त्यही दुई आधार मात्र प्रयोग गर्छ।",
          en: "The root verse itself derives Agni-vāsa from tithi + weekday alone — not a separate lagna/panchāṅga rule; the system uses only those two inputs.",
        },
      },
    ],
  },
  annaprasan: {
    description: {
      ne: "शिशुलाई पहिलो पटक अन्न ख्वाउने (अन्नप्रासन) संस्कारका लागि शुभ मिति।",
      en: "Auspicious dates for a baby's first feeding of solid food (Annaprasan).",
    },
    method: DAYTIME_INTRO,
    requiresBirthDate: true,
    rules: [
      {
        ne: "महिना/उमेर — अन्नप्रासनको मुख्य आधार शिशुको जन्मपछिको चन्द्रमहिना हो: बालकलाई सम महिना (६,८,१०,१२) र बालिकालाई विषम महिना (५,७,९,११)। अधिकमासमा संस्कार नगर्ने परम्परा मानिन्छ।",
        en: "Month/age — annaprāśana is governed by the child's age in lunar months after birth: even months (6,8,10,12) for a boy and odd months (5,7,9,11) for a girl. By tradition it is not performed in Adhik-māsa.",
        source: { ne: "मुहूर्त चिन्तामणि ५.१६ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa)" },
        shloka: MC_5_16_SHLOKA,
        gloss: MC_5_16_GLOSS,
      },
      {
        ne: "तिथि — शुभ तिथि २,३,५,७,१०,१३ र पूर्णिमा (शुक्ल १५); नन्द (१,६,११), रिक्ता (४,९,१४), अष्टमी (८), द्वादशी (१२) र अमावस्या वर्ज्य।",
        en: "Tithi — the śubha tithis 2,3,5,7,10,13 and Pūrṇimā (śukla 15); Nanda (1,6,11), Rikta (4,9,14), Aṣṭamī (8), Dvādaśī (12) and Amāvasyā are barred.",
        source: { ne: "मुहूर्त चिन्तामणि ५.१६ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa)" },
        shloka: MC_5_16_SHLOKA,
        gloss: {
          ne: "श्लोकको «रिक्तानन्दाष्टमीदर्शद्वादशी…विना» ले रिक्ता (४,९,१४), नन्द (१,६,११), अष्टमी, अमावस्या (दर्श) र द्वादशी वर्जित गर्छ — बाँकी २,३,५,७,१०,१३ र पूर्णिमा शुभ।",
          en: "The clause «riktānandāṣṭamīdarśadvādaśī…vinā» bars Riktā (4,9,14), Nanda (1,6,11), Aṣṭamī, Amāvasyā (darśa) and Dvādaśī — leaving 2,3,5,7,10,13 and Pūrṇimā as śubha.",
        },
      },
      {
        ne: "नक्षत्र — मृदु, लघु, चर र स्थिर वर्गका १६ नक्षत्र: अश्विनी, रोहिणी, मृगशिरा, पुनर्वसु, पुष्य, उत्तराफाल्गुनी, हस्त, चित्रा, स्वाती, अनुराधा, उत्तराषाढा, श्रवण, धनिष्ठा, शतभिषा, उत्तरभाद्रपदा, रेवती।",
        en: "Nakṣatra — the 16 Mṛdu/Laghu/Chara/Sthira stars: Aśvinī, Rohiṇī, Mṛgaśira, Punarvasu, Puṣya, U.Phalgunī, Hasta, Chitrā, Svātī, Anurādhā, U.Aṣāḍhā, Śravaṇa, Dhaniṣṭhā, Śatabhiṣā, U.Bhādrapada, Revatī.",
        source: { ne: "मुहूर्त चिन्तामणि ५.१६ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa)" },
        shloka: MC_5_16_SHLOKA,
        gloss: {
          ne: "«मृदुलघुचरस्थिरोडुषु» — मृदु (मृगशिरा, रेवती, चित्रा, अनुराधा), लघु/क्षिप्र (हस्त, अश्विनी, पुष्य), चर (स्वाती, पुनर्वसु, श्रवण, धनिष्ठा, शतभिषा), स्थिर/ध्रुव (रोहिणी, तीन उत्तरा) — जम्मा १६ नक्षत्र।",
          en: "«mṛdulaghucarasthiroḍuṣu» — Mṛdu (Mṛgaśira, Revatī, Chitrā, Anurādhā), Laghu/Kṣipra (Hasta, Aśvinī, Puṣya), Chara (Svātī, Punarvasu, Śravaṇa, Dhaniṣṭhā, Śatabhiṣā), Sthira/Dhruva (Rohiṇī, the three Uttarās) — 16 stars in all.",
        },
      },
      {
        ne: "वार — सोम, बुध, बिहि, शुक्र मात्र (आइत, मंगल, शनि वर्ज्य)।",
        en: "Vāra — Mon/Wed/Thu/Fri only (Sun, Tue, Sat barred).",
        source: { ne: "मुहूर्त चिन्तामणि ५.१६ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.16 (Saṃskāra Prakaraṇa)" },
        shloka: MC_5_16_SHLOKA,
        gloss: {
          ne: "«अर्ककुजार्किभिर्विना» — अर्क (आइत), कुज (मंगल) र अर्कि (शनि) बाहेकका वारमा अन्नप्रासन शुभ; सोम, बुध, बिही, शुक्र लिइन्छ।",
          en: "«arkakujārkibhirvinā» — excluding Arka (Sun), Kuja (Tue) and Arki (Sat); Mon, Wed, Thu and Fri are kept.",
        },
      },
      {
        ne: "लग्नशुद्धि — शुभ ग्रह केन्द्र/त्रिकोण/आय (११) मा, पाप ग्रह उपचय (३,६,११) मा, दशम भाव रिक्त, चन्द्रमा लग्न/षष्ठ/अष्टममा नहोस् — शास्त्रीय आदर्श। सामान्य पात्रोमा मेष, वृश्चिक र मीन लग्न मात्र वर्ज्य; पूर्ण ग्रह-लग्नशुद्धि जातक-सापेक्ष।",
        en: "Lagna-śuddhi — benefics in kendra/trikoṇa/11th, malefics in the upachaya (3,6,11), the 10th empty, and the Moon not in the 1st/6th/8th — the classical ideal. The general calendar applies only the sign bar (Meṣa, Vṛśchika, Mīna), since full graha-lagna-śuddhi is native-specific.",
        source: { ne: "मुहूर्त चिन्तामणि ५.१७ (संस्कार प्रकरण)", en: "Muhūrta Chintāmaṇi 5.17 (Saṃskāra Prakaraṇa)" },
        shloka: MC_5_17_SHLOKA,
        gloss: MC_5_17_GLOSS,
      },
      {
        ne: "गुरु/शुक्र अस्त — अन्नप्रासन काल-सापेक्ष (नित्य) संस्कार भएकाले गुरु वा शुक्र अस्त भए पनि गर्न बाधा छैन।",
        en: "Guru/Śukra asta — as a time-bound (nitya) saṃskāra, annaprāśana is not barred by the combustion of Jupiter or Venus.",
        source: { ne: "मुहूर्त चिन्तामणि ५ (श्लोक ४६–४७ भाष्य)", en: "Muhūrta Chintāmaṇi 5 (comm. on 46–47)" },
        shloka: MC_5_ASTA_CONTEXT,
        gloss: MC_5_ASTA_GLOSS,
      },
      {
        ne: "जन्मतारा — शिशुको जन्मनक्षत्रबाट १, १०, १९, २५ औं तारा वर्ज्य (जातक-सापेक्ष; सामान्य सूचीमा लागू गरिएको छैन)।",
        en: "Janma-tārā — the 1st, 10th, 19th and 25th tārā from the child's birth star are avoided (native-specific; not applied in the general list).",
        source: {
          ne: "मुहूर्त चिन्तामणि १.३४ / नक्षत्र प्रकरण (जन्मर्क्ष · तारा)",
          en: "Muhūrta Chintāmaṇi 1.34 / Nakṣatra Prakaraṇa (janmarkṣa · tārā)",
        },
        shloka: MC_1_34_SHLOKA,
        gloss: {
          ne: "«जन्मार्क्ष…» — आफ्नै जन्मनक्षत्र (१), अनुजन्म (१०), त्रिजन्म (१९) र मानस (२५) शुभ कार्यमा वर्ज्य। यो जातक-सापेक्ष भएकाले सामान्य अन्नप्रासन सूचीमा लागू गरिएको छैन — व्यक्तिगत कुण्डलीमा हेर्नुपर्छ।",
          en: "«janmārkṣa…» — own birth star (1), anujanma (10), trijanma (19) and mānasa (25) are barred for śubha work. Being native-specific, this is not applied in the general annaprāśana list — check the child's chart.",
        },
      },
      {
        ne: "सुरक्षा दोष — व्यतीपात/वैधृति योग, विष्टि (भद्रा) करण, दुर्मुहूर्त (अवधि मात्र) र ग्रहणको दिन हटाइन्छ (सामान्य मुहूर्त सुरक्षा; उद्धृत श्लोकको अंश होइन)।",
        en: "Safeguard doṣas — Vyatīpāta/Vaidhṛti yoga, Viṣṭi (Bhadrā) karaṇa, Dur-muhūrta (period only) and the eclipse day are removed (general muhūrta safeguards, not part of the cited verses).",
        source: {
          ne: "मुहूर्त चिन्तामणि १.३४ · ग्रहण १.३२ (शुभाशुभ प्रकरण)",
          en: "Muhūrta Chintāmaṇi 1.34 · eclipse 1.32 (Śubhāśubha Prakaraṇa)",
        },
        shloka: MC_1_34_SHLOKA,
        gloss: {
          ne: "व्यतीपात, भद्रा (विष्टि) र वैधृति महादोष; ग्रहणको दिन र दुर्मुहूर्त अवधि पनि सामान्य मुहूर्त सुरक्षाका रूपमा हटाइन्छ — ५.१६ को छुट्टै खण्ड होइन।",
          en: "Vyatīpāta, Bhadrā (Viṣṭi) and Vaidhṛti are mahā-doṣa; the eclipse day and Dur-muhūrta period are also dropped as general muhūrta safeguards — not a separate clause of 5.16.",
        },
      },
      {
        ne: "दिनको समय — गणना सूर्योदयदेखि सूर्यास्तसम्म गरिन्छ (प्रणालीको विधि; श्लोकको छुट्टै नियम होइन)।",
        en: "Daytime — computed from sunrise to sunset (our system's method, not a separate clause of the verses).",
        source: {
          ne: "मुहूर्त चिन्तामणि (संस्कार · पूर्वाह्न निर्देश) · पीयूषधारा",
          en: "Muhūrta Chintāmaṇi (saṃskāra · pūrvāhṇa) · Pīyūṣadhārā",
        },
        shloka: "पूर्वाह्णे दैवकृत्यं स्यान्मध्याह्ने मानुषं तथा ॥ [६८२]",
        gloss: {
          ne: "दैव/संस्कार कार्य पूर्वाह्नमा उत्तम; अन्नप्रासन राति गर्ने विधान छैन। प्रणालीले दिवाकाल (सूर्योदय–सूर्यास्त) स्क्यान गर्छ — दिवा लग्न शोधन; पूर्वाह्न वरीयता शास्त्रीय आदर्श हो।",
          en: "Divine/saṃskāra rites are best in the forenoon (pūrvāhṇa); annaprāśana is not done at night. The system scans daytime (sunrise→sunset) — diurnal lagna search; pūrvāhṇa preference is the classical ideal.",
        },
      },
      {
        ne: "यसको सटीक मिति शिशुको जन्ममितिमा भर पर्छ (उमेर विण्डो); सूचीले उपयुक्त दिन देखाउँछ।",
        en: "The exact date depends on the child's birth (the age window); the list shows the suitable days.",
        source: { ne: "मुहूर्त चिन्तामणि ५.१६ (युग्म/अयुग्म मास)", en: "Muhūrta Chintāmaṇi 5.16 (even/odd month)" },
        shloka: MC_5_16_SHLOKA,
        gloss: {
          ne: "«युग्ममासे पुंसोऽयुग्मे स्त्रीणां» — बालक सम महिना, बालिका विषम महिना। त्यसैले जन्ममिति बिना उमेर विण्डो मिलाउन सकिँदैन।",
          en: "«yugmamāse puṃso'yugme strīṇām» — even months for a boy, odd for a girl. Without the birth date the age window cannot be fixed.",
        },
      },
    ],
  },
};
