/**
 * Library taxonomy for /documents.
 *
 * Ten top-level groups, each with the topics a reader can filter by.
 * A topic with `opens` jumps to another group (Upanishads are listed under
 * Veda, where they traditionally belong, and also have their own group).
 */

export interface DocumentTopic {
  id: string;
  ne: string;
  en: string;
  /** Jump to this group instead of filtering the current one. */
  opens?: DocumentCategoryId;
  /** Which of the group's `sets` this topic is listed under (the first set when absent). */
  set?: string;
}

/** A titled run of topics inside a group, e.g. the eighteen Mahapuranas. */
export interface DocumentTopicSet {
  id: string;
  ne: string;
  en: string;
  /** A canonical, counted list: draw every topic as a numbered tile, filed or not. */
  numbered?: boolean;
}

export interface DocumentCategoryGroup {
  id: DocumentCategoryId;
  emoji: string;
  ne: string;
  en: string;
  /** One-line blurb for the library hub cards. */
  blurb?: { ne: string; en: string };
  /** Small heading above the topic chips, when the topics share a label. */
  lead?: { ne: string; en: string };
  /** Titled sub-lists of `topics`; a group without them shows its topics as one list under `lead`. */
  sets?: DocumentTopicSet[];
  topics: DocumentTopic[];
}

export type DocumentCategoryId =
  | "veda"
  | "upanishad"
  | "mantra"
  | "stotram"
  | "puja"
  | "katha"
  | "shraddha"
  | "gita"
  | "purana"
  | "darshana"
  | "shastra";

export const DOCUMENT_CATEGORY_GROUPS: DocumentCategoryGroup[] = [
  {
    id: "veda",
    emoji: "🕉️",
    ne: "वेद / श्रुति",
    en: "Veda / Shruti",
    blurb: { ne: "ऋग्, यजुर्, साम र अथर्व — श्रुतिको मूल पाठ", en: "Rig, Yajur, Sama and Atharva — the root of Shruti" },
    topics: [
      { id: "rigveda", ne: "ऋग्वेद", en: "Rigveda" },
      { id: "yajurveda", ne: "यजुर्वेद", en: "Yajurveda" },
      { id: "samaveda", ne: "सामवेद", en: "Samaveda" },
      { id: "atharvaveda", ne: "अथर्ववेद", en: "Atharvaveda" },
      { id: "shakha", ne: "वेदका शाखा", en: "Vedic shakhas" },
      { id: "brahmana", ne: "ब्राह्मण", en: "Brahmana" },
      { id: "aranyaka", ne: "आरण्यक", en: "Aranyaka" },
      { id: "upanishad", ne: "उपनिषद्", en: "Upanishad", opens: "upanishad" },
    ],
  },
  {
    id: "upanishad",
    emoji: "📖",
    ne: "उपनिषद्",
    en: "Upanishad",
    blurb: { ne: "प्रमुख उपनिषद् — ज्ञानका मूल ग्रन्थ", en: "The principal Upanishads — the root texts of knowledge" },
    lead: { ne: "प्रमुख उपनिषद्", en: "Principal Upanishads" },
    topics: [
      { id: "isha", ne: "ईश", en: "Isha" },
      { id: "kena", ne: "केन", en: "Kena" },
      { id: "katha", ne: "कठ", en: "Katha" },
      { id: "prasna", ne: "प्रश्न", en: "Prashna" },
      { id: "mundaka", ne: "मुण्डक", en: "Mundaka" },
      { id: "mandukya", ne: "माण्डूक्य", en: "Mandukya" },
      { id: "taittiriya", ne: "तैत्तिरीय", en: "Taittiriya" },
      { id: "aitareya", ne: "ऐतरेय", en: "Aitareya" },
      { id: "chandogya", ne: "छान्दोग्य", en: "Chandogya" },
      { id: "brihadaranyaka", ne: "बृहदारण्यक", en: "Brihadaranyaka" },
      { id: "shvetashvatara", ne: "श्वेताश्वतर", en: "Shvetashvatara" },
      { id: "adi", ne: "आदि", en: "Others" },
    ],
  },
  {
    id: "mantra",
    emoji: "📜",
    ne: "मन्त्र",
    en: "Mantra",
    blurb: { ne: "गायत्री, मृत्युञ्जय र अन्य वैदिक मन्त्र", en: "Gayatri, Mrityunjaya and other Vedic mantras" },
    topics: [
      { id: "vaidik", ne: "वैदिक मन्त्र", en: "Vedic mantras" },
      { id: "bija", ne: "बीज मन्त्र", en: "Bija mantras" },
      { id: "devata", ne: "देवता मन्त्र", en: "Deity mantras" },
      { id: "gayatri", ne: "गायत्री मन्त्र", en: "Gayatri mantra" },
      { id: "mahamrityunjaya", ne: "महामृत्युञ्जय मन्त्र", en: "Mahamrityunjaya mantra" },
      { id: "shanti", ne: "शान्ति मन्त्र", en: "Shanti mantras" },
      { id: "graha", ne: "ग्रह मन्त्र", en: "Graha mantras" },
      { id: "nakshatra", ne: "नक्षत्र मन्त्र", en: "Nakshatra mantras" },
      { id: "prayojana", ne: "स्त्री/पुरुष/आयु आदि प्रयोजनका मन्त्र", en: "Mantras by purpose" },
    ],
  },
  {
    id: "stotram",
    emoji: "🙏",
    ne: "स्तोत्र",
    en: "Stotra",
    blurb: { ne: "स्तोत्र, अष्टक, चालीसा र सहस्रनाम", en: "Stotras, ashtakams, chalisas and sahasranamas" },
    topics: [
      { id: "shiva", ne: "शिव स्तोत्र", en: "Shiva stotra" },
      { id: "vishnu", ne: "विष्णु स्तोत्र", en: "Vishnu stotra" },
      { id: "devi", ne: "देवी स्तोत्र", en: "Devi stotra" },
      { id: "ganesha", ne: "गणेश स्तोत्र", en: "Ganesha stotra" },
      { id: "surya", ne: "सूर्य स्तोत्र", en: "Surya stotra" },
      { id: "hanuman", ne: "हनुमान स्तोत्र", en: "Hanuman stotra" },
      { id: "lakshmi", ne: "लक्ष्मी स्तोत्र", en: "Lakshmi stotra" },
      { id: "saraswati", ne: "सरस्वती स्तोत्र", en: "Saraswati stotra" },
      { id: "navagraha", ne: "नवग्रह स्तोत्र", en: "Navagraha stotra" },
      { id: "sahasranama", ne: "सहस्रनाम", en: "Sahasranama" },
      { id: "kavacha", ne: "कवच", en: "Kavacha" },
      { id: "ashtakam", ne: "अष्टकम्", en: "Ashtakam" },
      { id: "chalisa", ne: "चालीसा", en: "Chalisa" },
    ],
  },
  {
    id: "puja",
    emoji: "🪔",
    ne: "पूजा तथा कर्मकाण्ड",
    en: "Puja and ritual",
    blurb: { ne: "पूजा विधि, रुद्री, होम र गृहशान्ति", en: "Puja procedures, Rudri, homa and home rites" },
    topics: [
      { id: "nityakarma", ne: "नित्यकर्म", en: "Daily rites" },
      { id: "puja-vidhi", ne: "पूजा विधि", en: "Puja procedure" },
      { id: "karmakanda", ne: "कर्मकाण्ड", en: "Karmakanda" },
      { id: "svasti-shanti", ne: "स्वस्ति शान्ति", en: "Svasti Shanti" },
      { id: "griha-shanti", ne: "गृह शान्ति", en: "Griha Shanti" },
      { id: "vastu-shanti", ne: "वास्तु शान्ति", en: "Vastu Shanti" },
      { id: "graha-shanti", ne: "ग्रह शान्ति", en: "Graha Shanti" },
      { id: "nakshatra-shanti", ne: "नक्षत्र शान्ति", en: "Nakshatra Shanti" },
      { id: "rudri", ne: "रुद्री", en: "Rudri" },
      { id: "rudrabhisheka", ne: "रुद्राभिषेक", en: "Rudrabhisheka" },
      { id: "homa", ne: "होम / हवन", en: "Homa / havan" },
      { id: "agnihotra", ne: "अग्निहोत्र", en: "Agnihotra" },
      { id: "shraddha", ne: "श्राद्ध", en: "Shraddha", opens: "shraddha" },
      { id: "katha", ne: "व्रतकथा", en: "Vrat katha", opens: "katha" },
      { id: "sanskara", ne: "संस्कार", en: "Samskara" },
      { id: "vivaha", ne: "विवाह कर्म", en: "Marriage rites" },
      { id: "grihapravesh", ne: "गृहप्रवेश", en: "Grihapravesha" },
      { id: "ayushya", ne: "आयुष्य कर्म", en: "Ayushya rites" },
      { id: "pitri", ne: "पितृ कर्म", en: "Pitri rites" },
    ],
  },
  {
    id: "katha",
    emoji: "📕",
    ne: "कथा",
    en: "Katha",
    blurb: { ne: "व्रतकथा — सत्यनारायण, हरितालिका, ऋषिपञ्चमी", en: "Vrat kathas — Satyanarayan, Haritalika, Rishi Panchami" },
    topics: [
      { id: "vrat-katha", ne: "व्रतकथा", en: "Vrat katha" },
      { id: "purana-katha", ne: "पौराणिक कथा", en: "Puranic katha" },
      { id: "satyanarayan", ne: "सत्यनारायण", en: "Satyanarayan" },
      { id: "haritalika", ne: "हरितालिका", en: "Haritalika" },
      { id: "rishi-panchami", ne: "ऋषिपञ्चमी", en: "Rishi Panchami" },
    ],
  },
  {
    id: "shraddha",
    emoji: "🕊️",
    ne: "श्राद्ध",
    en: "Shraddha",
    blurb: { ne: "पार्वण, एकोद्दिष्ट, एकैकपार्वण र त्रिपिण्डी", en: "Parvana, Ekoddishta, Ekaikaparvana and Tripindi" },
    topics: [
      { id: "parvana", ne: "पार्वण श्राद्ध", en: "Parvana Shraddha" },
      { id: "ekoddishta", ne: "एकोद्दिष्ट श्राद्ध", en: "Ekoddishta Shraddha" },
      { id: "ekaikaparvana", ne: "एकैकपार्वण श्राद्ध", en: "Ekaikaparvana Shraddha" },
      { id: "tripindi", ne: "त्रिपिण्डी श्राद्ध", en: "Tripindi Shraddha" },
      { id: "tarpan", ne: "तर्पण", en: "Tarpan" },
      { id: "pitri", ne: "पितृ कर्म", en: "Pitri rites" },
    ],
  },
  {
    id: "gita",
    emoji: "📗",
    ne: "गीता",
    en: "Gita",
    blurb: { ne: "भगवद्गीता र अन्य गीताहरू", en: "The Bhagavad Gita and the other Gitas" },
    topics: [
      { id: "bhagavad", ne: "श्रीमद्भगवद्गीता", en: "Bhagavad Gita" },
      { id: "bhashya", ne: "गीता विभिन्न भाष्य", en: "Gita commentaries" },
      { id: "nepali", ne: "गीता नेपाली", en: "Gita in Nepali" },
      { id: "sanskrit", ne: "गीता संस्कृत", en: "Gita in Sanskrit" },
      { id: "by-chapter", ne: "अध्यायअनुसार", en: "By chapter" },
      { id: "other", ne: "अन्य गीता", en: "Other Gitas" },
    ],
  },
  {
    id: "purana",
    emoji: "📚",
    ne: "पुराण",
    en: "Purana",
    blurb: { ne: "अष्टादश महापुराण, रामायण, महाभारत र तन्त्र", en: "The 18 Mahapuranas, Ramayana, Mahabharata and Tantra" },
    sets: [
      { id: "mahapurana", ne: "अष्टादश महापुराण", en: "The 18 Mahapuranas", numbered: true },
      { id: "itihasa", ne: "इतिहास, उपपुराण तथा अन्य", en: "Itihasa, Upapuranas and others" },
    ],
    /* The eighteen in the Vishnu Purana's own order (3.6). The fourth is Shiva in
       some lists and Vayu in others, so it carries both names. */
    topics: [
      { id: "brahma", ne: "ब्रह्म पुराण", en: "Brahma Purana" },
      { id: "padma", ne: "पद्म पुराण", en: "Padma Purana" },
      { id: "vishnu", ne: "विष्णु पुराण", en: "Vishnu Purana" },
      { id: "shiva", ne: "शिव (वायु) पुराण", en: "Shiva (Vayu) Purana" },
      { id: "bhagavata", ne: "श्रीमद्भागवत", en: "Bhagavata Purana" },
      { id: "narada", ne: "नारद पुराण", en: "Narada Purana" },
      { id: "markandeya", ne: "मार्कण्डेय पुराण", en: "Markandeya Purana" },
      { id: "agni", ne: "अग्नि पुराण", en: "Agni Purana" },
      { id: "bhavishya", ne: "भविष्य पुराण", en: "Bhavishya Purana" },
      { id: "brahmavaivarta", ne: "ब्रह्मवैवर्त पुराण", en: "Brahmavaivarta Purana" },
      { id: "linga", ne: "लिङ्ग पुराण", en: "Linga Purana" },
      { id: "varaha", ne: "वराह पुराण", en: "Varaha Purana" },
      { id: "skanda", ne: "स्कन्द पुराण", en: "Skanda Purana" },
      { id: "vamana", ne: "वामन पुराण", en: "Vamana Purana" },
      { id: "kurma", ne: "कूर्म पुराण", en: "Kurma Purana" },
      { id: "matsya", ne: "मत्स्य पुराण", en: "Matsya Purana" },
      { id: "garuda", ne: "गरुड पुराण", en: "Garuda Purana" },
      { id: "brahmanda", ne: "ब्रह्माण्ड पुराण", en: "Brahmanda Purana" },
      { id: "valmiki", ne: "वाल्मीकि रामायण", en: "Valmiki Ramayana", set: "itihasa" },
      { id: "mahabharata", ne: "महाभारत", en: "Mahabharata", set: "itihasa" },
      { id: "devi-bhagavata", ne: "देवी भागवत", en: "Devi Bhagavata", set: "itihasa" },
      { id: "upapurana", ne: "उपपुराण", en: "Upapuranas", set: "itihasa" },
      { id: "tantra", ne: "तन्त्र", en: "Tantra", set: "itihasa" },
      { id: "adi", ne: "आदि", en: "Others", set: "itihasa" },
    ],
  },
  {
    id: "darshana",
    emoji: "🔱",
    ne: "दर्शन / शास्त्र",
    en: "Darshana",
    blurb: { ne: "षड्दर्शन, वेदान्त र तन्त्र", en: "The six darshanas, Vedanta and Tantra" },
    topics: [
      { id: "sankhya", ne: "सांख्य", en: "Sankhya" },
      { id: "yoga", ne: "योग", en: "Yoga" },
      { id: "nyaya", ne: "न्याय", en: "Nyaya" },
      { id: "vaisheshika", ne: "वैशेषिक", en: "Vaisheshika" },
      { id: "purva-mimamsa", ne: "पूर्वमीमांसा", en: "Purva Mimamsa" },
      { id: "vedanta", ne: "वेदान्त", en: "Vedanta" },
      { id: "brahmasutra", ne: "ब्रह्मसूत्र", en: "Brahma Sutra" },
      { id: "bhashya", ne: "विभिन्न भाष्य", en: "Commentaries" },
      { id: "tantra", ne: "तन्त्र", en: "Tantra" },
    ],
  },
  {
    id: "shastra",
    emoji: "🌿",
    ne: "आयुर्वेद / ज्योतिष / वास्तु",
    en: "Ayurveda, jyotisha, and vastu",
    blurb: { ne: "आयुर्वेद, ज्योतिष र वास्तुशास्त्र", en: "Ayurveda, jyotisha and Vastu shastra" },
    topics: [
      { id: "ayurveda", ne: "आयुर्वेद", en: "Ayurveda" },
      { id: "jyotish", ne: "ज्योतिष", en: "Jyotisha" },
      { id: "samhita", ne: "संहिता", en: "Samhita" },
      { id: "hora", ne: "होरा", en: "Hora" },
      { id: "ganita", ne: "गणित ज्योतिष", en: "Ganita jyotisha" },
      { id: "muhurta", ne: "मुहूर्त", en: "Muhurta" },
      { id: "prashna", ne: "प्रश्न", en: "Prashna" },
      { id: "vastu", ne: "वास्तु", en: "Vastu" },
      { id: "dharmashastra", ne: "धर्मशास्त्र", en: "Dharmashastra" },
      { id: "smriti", ne: "स्मृति", en: "Smriti" },
    ],
  },
];

const GROUP_BY_ID = new Map(DOCUMENT_CATEGORY_GROUPS.map((group) => [group.id, group]));

export function isDocumentCategoryId(value: string): value is DocumentCategoryId {
  return GROUP_BY_ID.has(value as DocumentCategoryId);
}

export function categoryGroup(id: string): DocumentCategoryGroup | undefined {
  return GROUP_BY_ID.get(id as DocumentCategoryId);
}

/** A topic that filters this group. Cross-links (`opens`) are not filters. */
export function isTopicOf(category: DocumentCategoryId, topic: string): boolean {
  const group = GROUP_BY_ID.get(category);
  return Boolean(group?.topics.some((item) => item.id === topic && !item.opens));
}
