

import type { Bi } from "./article-schema";

/**
 * The Learn library — the single source of truth for what exists in the
 * knowledge section, in reading order.
 *
 * The section runs as one course rather than a bag of loose pages. A reader
 * who follows prev/next meets the Nepali patro and Bikram Sambat first, then
 * a short account of the five panchanga limbs, then each limb on its own
 * (tithi, nakshatra, yoga, karana, vara) plus choghadiya and hora. Only after
 * that come the sky, the Sun, the Moon, the computation and the comparisons.
 * Array order *is* that path, so insert a topic where it belongs in the sequence.
 *
 * `status` separates the map from the territory. `planned` entries hold a
 * slug and title so the outline stays visible in one place while the article
 * is written, but they are filtered out of the hub, the router, the sitemap
 * and SEO metadata — nothing ships as an empty page. Writing the body and
 * flipping `planned` → `published` is all a new article needs.
 */

/** Icon names the library uses; each app maps them to its own icon set. */
export const LEARN_ICON_KEYS = [
  "ArrowLeftRight",
  "Axis3d",
  "Calculator",
  "CalendarClock",
  "CalendarRange",
  "CircleDot",
  "Compass",
  "GitCompare",
  "Globe",
  "Hourglass",
  "Layers",
  "Locate",
  "Milestone",
  "Moon",
  "Rotate3d",
  "RotateCw",
  "Ruler",
  "ScrollText",
  "Server",
  "Sigma",
  "Sun",
  "SunMoon",
  "Telescope",
  "Timer",
  "Workflow",
] as const;

export type LearnIconKey = (typeof LEARN_ICON_KEYS)[number];

export type TopicStatus = "published" | "planned";

export interface LibraryTopic<I = LearnIconKey> {
  slug: string;
  section: string;
  title: Bi;
  summary: Bi;
  icon: I;
  status: TopicStatus;
  /** Set when the topic renders from its own page instead of the article shell. */
  path?: string;
}

export interface LibrarySection<I = LearnIconKey> {
  id: string;
  title: Bi;
  /** One line on what the section covers, shown on the hub. */
  blurb: Bi;
  icon: I;
}

export const LEARN_SECTIONS: LibrarySection[] = [
  {
    id: "start",
    icon: "Compass",
    title: { ne: "सुरुवात", en: "Start Here" },
    blurb: {
      ne: "नेपाली पात्रो के हो, विक्रम सम्वत् के हो, र वर्ष बैशाखमा किन सुरु हुन्छ।",
      en: "What the Nepali patro is, what Bikram Sambat is, and why the year opens in Baisakh.",
    },
  },
  {
    id: "panchanga",
    icon: "ScrollText",
    title: { ne: "पञ्चाङ्ग", en: "The Panchanga" },
    blurb: {
      ne: "पाँच अङ्गको छोटो परिचय, त्यसपछि तिथि, नक्षत्र, योग, करण र चौघडिया — प्रत्येक आफ्नै लेखमा।",
      en: "A short look at the five limbs, then tithi, nakshatra, yoga, karana and choghadiya — each in its own article.",
    },
  },
  {
    id: "earth-sky",
    icon: "Rotate3d",
    title: { ne: "पृथ्वी र आकाश", en: "Earth and Sky" },
    blurb: {
      ne: "पृथ्वीको घुर्णन र परिक्रमा, २३.४४° अक्ष झुकाव, ऋतु, विषुव र अयनान्त — सबै गतिको स्रोत।",
      en: "Earth's rotation and orbit, the 23.44° tilt, seasons, equinoxes and solstices — where every motion begins.",
    },
  },
  {
    id: "sun",
    icon: "Sun",
    title: { ne: "सूर्य र सौरमान", en: "The Sun and the Solar Month" },
    blurb: {
      ne: "राशि, सङ्क्रान्ति, अयन र सायन–निरयन राशिचक्र — सौर पात्रोको सम्पूर्ण आधार।",
      en: "Rashi, sankranti, the ayanas and the two zodiacs — everything the solar calendar rests on.",
    },
  },
  {
    id: "moon",
    icon: "Moon",
    title: { ne: "चन्द्र र चान्द्रमान", en: "The Moon and the Lunar Month" },
    blurb: {
      ne: "पक्ष, औंसी–पूर्णिमा, चान्द्र मास, र अधिक वा क्षय मास — तिथिको विस्तार होइन, महिनाको कथा।",
      en: "Paksha, new and full moon, the lunar month, and the extra or skipped month — the month's story, not a second tithi article.",
    },
  },
  {
    id: "calculation",
    icon: "Calculator",
    title: { ne: "गणना", en: "How a Date Is Calculated" },
    blurb: {
      ne: "सूर्योदय, सङ्क्रान्ति, तिथि र नक्षत्र — प्रत्येक अङ्क कुन सूत्र र कुन ग्रहपातबाट आउँछ।",
      en: "Sunrise, sankranti, tithi and nakshatra — which formula and which ephemeris each number comes from.",
    },
  },
  {
    id: "deeper",
    icon: "Telescope",
    title: { ne: "गहिराइ", en: "Going Deeper" },
    blurb: {
      ne: "भूकेन्द्रित र सूर्यकेन्द्रित दृष्टि, वक्री गति, अयन चलन, ग्रहण — पात्रोभन्दा पर खगोलशास्त्र।",
      en: "Geocentric and heliocentric views, retrograde motion, precession and eclipses — the astronomy beyond the calendar.",
    },
  },
  {
    id: "comparison",
    icon: "GitCompare",
    title: { ne: "तुलना र इतिहास", en: "Comparison and History" },
    blurb: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रो आमनेसामने — लीप वर्ष, चलन र प्राचीन पात्रोको इतिहास।",
      en: "The Nepali, Vedic and Gregorian calendars side by side — leap years, drift, and where ancient calendars came from.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Topics, in reading order                                            */
/* ------------------------------------------------------------------ */

export const LEARN_LIBRARY: LibraryTopic[] = [
  {
    slug: "bikram-sambat",
    section: "start",
    status: "published",
    icon: "CalendarRange",
    title: { ne: "नेपाली पात्रो र विक्रम सम्वत्", en: "The Nepali Calendar and Bikram Sambat" },
    summary: {
      ne: "वि.सं. के हो, वर्ष बैशाखमा किन सुरु हुन्छ, ई.सं.सँगको फरक किन स्थिर हुँदैन, र सौर–चान्द्र–चान्द्रसौर गणना कसरी छुट्टिन्छन्।",
      en: "What Bikram Sambat is, why the year opens in Baisakh, why its offset from AD is never fixed, and how the solar, lunar and lunisolar reckonings differ.",
    },
  },
  {
    slug: "sayana-nirayana-year",
    section: "start",
    status: "published",
    icon: "Hourglass",
    title: { ne: "सायन र निरयन वर्ष", en: "Tropical and Sidereal Year" },
    summary: {
      ne: "ऋतुले नापिने सायन वर्ष र ताराले नापिने निरयन वर्ष — अर्थ, राम्रा र कमजोर पक्ष, २० मिनेटको फरक किन, वि.सं.ले कुन मान्छ, र बैशाख १, सङ्क्रान्ति र चाडपर्वमा त्यसको नतिजा।",
      en: "The tropical year (measured by the seasons) and the sidereal year (measured by the stars) — what each means, their pros and cons, why they differ by 20 minutes, which one Bikram Sambat keeps, and what that does to Baisakh 1, the sankrantis and the festivals.",
    },
  },
  {
    slug: "baisakh-1",
    section: "start",
    status: "planned",
    icon: "Milestone",
    title: { ne: "बैशाख १ कसरी तय हुन्छ", en: "How Baisakh 1 Is Fixed" },
    summary: {
      ne: "मेष सङ्क्रान्तिको क्षण र सूर्योदयको नियमले वर्षको पहिलो गते कसरी छान्छ।",
      en: "How the instant of Mesha Sankranti and the sunrise rule together pick the first day of the year.",
    },
  },
  {
    slug: "solar-month-first-gate",
    section: "start",
    status: "planned",
    icon: "CalendarClock",
    title: { ne: "सौर महिनाको पहिलो गते कसरी आउँछ", en: "How the First Gate of a Solar Month Arrives" },
    summary: {
      ne: "सङ्क्रान्ति दिनको कुन समयमा पर्‍यो भन्नेले गते १ त्यही दिन कि भोलि हुन्छ भन्ने तय गर्छ।",
      en: "Where the sankranti falls within a day decides whether gate 1 is that day or the next.",
    },
  },
  {
    slug: "sankranti-to-month",
    section: "start",
    status: "planned",
    icon: "Workflow",
    title: { ne: "सङ्क्रान्तिबाट महिना कसरी बन्छ", en: "From Sankranti to a Calendar Month" },
    summary: {
      ne: "दुई सङ्क्रान्तिबीचको अवधि नै एक नेपाली महिना — गते गन्ती यसैभित्र चल्छ।",
      en: "The span between two sankrantis is one Nepali month, and the gate count runs inside it.",
    },
  },
  {
    slug: "nepali-month-length",
    section: "start",
    status: "planned",
    icon: "Ruler",
    title: { ne: "नेपाली महिनाको लम्बाइ किन फरक हुन्छ", en: "Why Nepali Months Have Different Lengths" },
    summary: {
      ne: "पृथ्वीको अण्डाकार कक्षले सूर्यको गति बदल्छ, त्यसैले महिना २९ देखि ३२ दिनसम्मको हुन्छ।",
      en: "Earth's elliptical orbit changes the Sun's apparent speed, so months run from 29 to 32 days.",
    },
  },
  {
    slug: "bs-year-formation",
    section: "start",
    status: "planned",
    icon: "CalendarRange",
    title: { ne: "वि.सं. को वर्ष कसरी बन्छ", en: "How a Bikram Sambat Year Is Formed" },
    summary: {
      ne: "बाह्र सौर महिना जोडिएर एक वि.सं. वर्ष बन्छ — र त्यो वर्ष सधैँ ३६५ दिनको हुँदैन।",
      en: "Twelve solar months make one BS year — and that year is not always 365 days long.",
    },
  },
  {
    slug: "bs-date-determination",
    section: "start",
    status: "planned",
    icon: "Locate",
    title: { ne: "एक वि.सं. मिति कसरी निर्धारण हुन्छ", en: "How a Single BS Date Is Determined" },
    summary: {
      ne: "वर्ष, महिना र गते — तीनवटै छुट्टै नियमबाट आउँछन्, र सँगै एउटा मिति बनाउँछन्।",
      en: "Year, month and gate each come from a separate rule, and together they make one date.",
    },
  },
  {
    slug: "month-days-vary",
    section: "start",
    status: "planned",
    icon: "Layers",
    title: { ne: "एउटै महिनाका दिन वर्षैपिच्छे किन फरक हुन्छन्", en: "Why the Same Month Has Different Day Counts" },
    summary: {
      ne: "गत वर्ष ३१ दिनको भदौ यस वर्ष ३२ दिनको किन — सङ्क्रान्तिको क्षण सर्दै जाने कारण।",
      en: "Why a 31-day Bhadau becomes 32 days the next year — the sankranti instant keeps shifting.",
    },
  },
  {
    slug: "bs-ad-conversion",
    section: "start",
    status: "planned",
    icon: "ArrowLeftRight",
    title: { ne: "वि.सं. र ई.सं. मिति कसरी रूपान्तरण हुन्छ", en: "How BS and AD Dates Are Converted" },
    summary: {
      ne: "तालिका होइन, गणना — जुलियन दिनमार्फत दुई पात्रोबीच मिति कसरी सारिन्छ।",
      en: "Not a lookup table but a computation — how a date moves between the two calendars via the Julian Day.",
    },
  },
  {
    slug: "what-is-panchang",
    section: "panchanga",
    status: "published",
    icon: "ScrollText",
    title: { ne: "पञ्चाङ्ग — पाँच अङ्ग एक दृष्टिमा", en: "The Panchanga — the Five Limbs at a Glance" },
    summary: {
      ne: "तिथि, वार, नक्षत्र, योग र करण — प्रत्येकले के नाप्छ, सूत्र नखोलीकन। विस्तार पछिका छुट्टाछुट्टै लेखमा।",
      en: "Tithi, vara, nakshatra, yoga and karana — what each measures, without the formulas. The detail is the article that follows each one.",
    },
  },
  {
    slug: "tithi",
    section: "panchanga",
    status: "published",
    icon: "Sigma",
    title: { ne: "तिथि", en: "Tithi" },
    summary: {
      ne: "तिथि के हो, कसरी बन्छ, किन २४ घण्टाको हुँदैन, र कहिले दोहोरिन्छ वा हराउँछ।",
      en: "What a tithi is, how it is formed, why it is never 24 hours, and when one repeats or disappears.",
    },
  },
  {
    slug: "nakshatra",
    section: "panchanga",
    status: "published",
    icon: "Moon",
    title: { ne: "नक्षत्र", en: "Nakshatra" },
    summary: {
      ne: "नक्षत्र के हो र कसरी बन्छ — ३६०° लाई २७ भागमा बाँड्ने नियम, पद, र चन्द्रको देशान्तर।",
      en: "What a nakshatra is and how it is formed — the rule that splits 360° into 27 parts, the padas, and the Moon's longitude.",
    },
  },
  {
    slug: "yoga",
    section: "panchanga",
    status: "published",
    icon: "Workflow",
    title: { ne: "योग", en: "Yoga" },
    summary: {
      ne: "योग के हो र कसरी बन्छ — सूर्य र चन्द्रको देशान्तर जोडेर २७ योग।",
      en: "What a yoga is and how it is formed — the 27 yogas from the sum of the Sun's and Moon's longitudes.",
    },
  },
  {
    slug: "karana",
    section: "panchanga",
    status: "published",
    icon: "Layers",
    title: { ne: "करण", en: "Karana" },
    summary: {
      ne: "करण के हो — आधा तिथि, ६° को खण्ड, सात चर र चार स्थिर नाम।",
      en: "What a karana is — half a tithi, a 6° slot, seven movable names and four fixed ones.",
    },
  },
  {
    slug: "vara",
    section: "panchanga",
    status: "published",
    icon: "CalendarClock",
    title: { ne: "वार", en: "Vāra" },
    summary: {
      ne: "वार के हो — सूर्योदयदेखि सूर्योदयसम्मको बार, र दिनको नाम पहिलो होराबाट कसरी आउँछ।",
      en: "What a vāra is — the weekday from sunrise to sunrise, and how the day's name comes from the first hora.",
    },
  },
  {
    slug: "choghadiya",
    section: "panchanga",
    status: "published",
    icon: "Hourglass",
    title: { ne: "चौघडिया", en: "Choghadiya" },
    summary: {
      ne: "चौघडिया के हो र कसरी बन्छ — दिन आठ र रात आठ खण्ड, वारअनुसार सुरु हुने क्रम।",
      en: "What choghadiya is and how it is formed — eight parts of the day and eight of the night, starting from the weekday.",
    },
  },
  {
    slug: "hora",
    section: "panchanga",
    status: "published",
    icon: "Timer",
    title: { ne: "होरा", en: "Hora" },
    summary: {
      ne: "होरा के हो — सूर्योदयदेखि चौबीस ग्रहीय घण्टा, र त्यो चौघडियाभन्दा कसरी फरक छ।",
      en: "What a hora is — twenty-four planetary hours from sunrise, and how that differs from choghadiya.",
    },
  },
  {
    slug: "day-night-divisions",
    section: "panchanga",
    status: "planned",
    icon: "SunMoon",
    title: { ne: "दिन र रात कसरी बाँडिन्छ", en: "How Day and Night Are Divided" },
    summary: {
      ne: "सूर्योदयदेखि सूर्यास्तसम्मको दिनमान र रात्रिमान — वैदिक दिन घडीको २४ घण्टासँग किन मिल्दैन।",
      en: "Dinamana and ratrimana, from sunrise to sunset — why the Vedic day does not match a 24-hour clock.",
    },
  },
  {
    slug: "muhurta",
    section: "panchanga",
    status: "planned",
    icon: "Timer",
    title: { ne: "मुहूर्त", en: "Muhurta" },
    summary: {
      ne: "दिनलाई ३० भागमा बाँड्ने वैदिक समय एकाइ र शुभ–अशुभ मुहूर्तको आधार।",
      en: "The Vedic time unit that splits the day into thirty parts, and the basis of auspicious timing.",
    },
  },
  {
    slug: "ghati-pala",
    section: "panchanga",
    status: "planned",
    icon: "Hourglass",
    title: { ne: "घटी, पला र विपला", en: "Ghati, Pala and Vipala" },
    summary: {
      ne: "पञ्चाङ्गमा समय लेख्ने परम्परागत एकाइ — घटी–पलालाई घण्टा–मिनेटमा कसरी पढ्ने।",
      en: "The traditional units a panchanga writes time in — how to read ghati and pala as hours and minutes.",
    },
  },
  {
    slug: "earth-rotation-day",
    section: "earth-sky",
    status: "published",
    icon: "RotateCw",
    title: { ne: "पृथ्वी, दिन र आकाश", en: "Earth, the Day and the Sky" },
    summary: {
      ne: "दिन के हो, पृथ्वी कसरी घुम्छ, र खगोलीय गोला, क्रान्तिवृत्त र निर्देशांकले आकाशमा स्थान कसरी नापिन्छ।",
      en: "What a day is, how Earth turns and orbits, and how the celestial sphere, the ecliptic and its coordinates pin a position in the sky.",
    },
  },
  {
    slug: "axial-tilt",
    section: "earth-sky",
    status: "published",
    icon: "Axis3d",
    title: { ne: "ऋतु, अक्ष झुकाव र सूर्यको बाटो", en: "The Seasons, the Tilt and the Sun's Path" },
    summary: {
      ne: "२३.४४° को झुकावले ऋतु बनाउँछ — विषुव, अयनान्त र क्रान्तिको पूरा कथा।",
      en: "The 23.44° tilt that makes the seasons — equinoxes, solstices and declination, end to end.",
    },
  },
  {
    slug: "rashi",
    section: "sun",
    status: "published",
    icon: "CircleDot",
    title: { ne: "राशि, सौर वर्ष र सङ्क्रान्ति", en: "Rashi, the Solar Year and the Sankrantis" },
    summary: {
      ne: "सूर्यले वर्ष कसरी तय गर्छ, राशि के हो, सङ्क्रान्ति कहिले हुन्छ — अनि मेष, मकर र कर्क सङ्क्रान्तिका पर्व।",
      en: "How the Sun fixes the year, what a rashi is, when a sankranti happens — and the Mesha, Makara and Karka festivals.",
    },
  },
  {
    slug: "sidereal-vs-tropical",
    section: "sun",
    status: "published",
    icon: "Compass",
    title: { ne: "निरयन, सायन र अयनांश", en: "Sidereal, Tropical and the Ayanamsha" },
    summary: {
      ne: "दुई राशिचक्र, बीचको अयनांश, अयनको सन्धि र ऋतु किन सर्दै जान्छ।",
      en: "The two zodiacs, the ayanamsha between them, where the ayanas turn, and why the ṛtus drift.",
    },
  },
  {
    slug: "lunar-month",
    section: "moon",
    status: "published",
    icon: "CalendarClock",
    title: { ne: "चन्द्र मास, पक्ष र कला", en: "The Lunar Month, the Pakshas and the Phases" },
    summary: {
      ne: "चन्द्रले महिना कसरी बनाउँछ — पक्ष, औंसी–पूर्णिमा, र वर्षेनि ११ दिन मिलाउने अधिक वा क्षय मास।",
      en: "How the Moon builds a month — the pakshas, new and full, and the extra or skipped month that settles the 11-day gap.",
    },
  },
  {
    slug: "how-we-calculate",
    section: "calculation",
    status: "published",
    icon: "Server",
    title: { ne: "पञ्चाङ्ग गणना कसरी हुन्छ", en: "How the Panchanga Is Computed" },
    summary: {
      ne: "ग्रहपात र काल मापनदेखि सूर्योदय, सङ्क्रान्ति, तिथि, नक्षत्र, योग र करणसम्म — अनि स्थानले उत्तर किन बदल्छ।",
      en: "From ephemeris and time scales to sunrise, sankranti, tithi, nakshatra, yoga and karana — and why location changes the answer.",
    },
  },
  {
    slug: "geocentric-heliocentric",
    section: "deeper",
    status: "published",
    icon: "Telescope",
    title: { ne: "गहिरो खगोल — गति, अयन चलन र ग्रहण", en: "Deeper Sky — Motion, Precession and Eclipses" },
    summary: {
      ne: "भूकेन्द्रित र सूर्यकेन्द्रित दृष्टि, वक्री गति, २६,००० वर्षे अयन चलन, र राहु–केतुका ग्रहण चक्र।",
      en: "Geocentric and heliocentric views, retrograde motion, the 26,000-year precession, and the Rahu–Ketu eclipse cycles.",
    },
  },
  {
    slug: "calendar-differences",
    section: "comparison",
    status: "published",
    icon: "Globe",
    title: { ne: "पात्रो तुलना र इतिहास", en: "Comparing Calendars, and Their History" },
    summary: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन आमनेसामने — लीप वर्ष, चलन, प्राचीन पात्रो, र सूर्य सिद्धान्तको इतिहास।",
      en: "Nepali, Vedic and Gregorian side by side — leap years, drift, ancient calendars, and the history of the Surya Siddhanta.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Derived lookups                                                     */
/* ------------------------------------------------------------------ */

/** Route for a topic — a few topics render from their own page. */
export function topicPath(topic: { slug: string; path?: string }): string {
  return topic.path ?? `/learn/${topic.slug}`;
}

type TopicLike = { slug: string; section: string; status: TopicStatus };

/**
 * Lookups over a library whose icons an app has already mapped to its own icon
 * type — the filtering and ordering is the same on the site and in the app.
 */
export function buildLearnViews<S extends { id: string }, T extends TopicLike>(
  sections: S[],
  topics: T[],
) {
  const published = topics.filter((t) => t.status === "published");
  const planned = topics.filter((t) => t.status === "planned");
  return {
    bySlug: Object.fromEntries(topics.map((t) => [t.slug, t])) as Record<string, T | undefined>,
    sectionsById: Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, S | undefined>,
    published,
    planned,
    publishedInSection: (sectionId: string): T[] => published.filter((t) => t.section === sectionId),
    plannedInSection: (sectionId: string): T[] => planned.filter((t) => t.section === sectionId),
    adjacentPublished: (slug: string): { prev: T | null; next: T | null } => {
      const i = published.findIndex((t) => t.slug === slug);
      return {
        prev: i > 0 ? published[i - 1]! : null,
        next: i >= 0 && i < published.length - 1 ? published[i + 1]! : null,
      };
    },
  };
}

/**
 * Guards the two mistakes this registry invites: a topic filed under a
 * section that does not exist (it would vanish from the hub, since the hub
 * iterates sections) and a duplicated slug (the later entry would shadow the
 * earlier one in every lookup). Both are silent in production, so apps call
 * this in development to fail loudly.
 */
export function assertLearnLibrary(sections: { id: string }[], topics: TopicLike[]): void {
  const known = new Set(sections.map((s) => s.id));
  const seen = new Set<string>();
  for (const topic of topics) {
    if (seen.has(topic.slug)) throw new Error(`Learn library: duplicate slug "${topic.slug}"`);
    seen.add(topic.slug);
    if (!known.has(topic.section)) {
      throw new Error(`Learn library: topic "${topic.slug}" has unknown section "${topic.section}"`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Learning paths on the hub                                           */
/* ------------------------------------------------------------------ */

/** A learning path on the Learn hub: a few library sections read together. */
export interface LearnModule {
  id: string;
  title: Bi;
  blurb: Bi;
  sections: string[];
}

/** The hub's learning paths, in order (both apps). */
export const LEARN_MODULES: LearnModule[] = [
  {
    id: "basics",
    title: { ne: "नेपाली पात्रो र विक्रम सम्वत्", en: "Nepali Patro and Bikram Sambat" },
    blurb: {
      ne: "पात्रो के हो, वि.सं. के हो, र वर्ष बैशाखमा किन सुरु हुन्छ।",
      en: "What the patro is, what Bikram Sambat is, and why the year opens in Baisakh.",
    },
    sections: ["start"],
  },
  {
    id: "panchanga",
    title: { ne: "पञ्चाङ्ग र अङ्गहरू", en: "The Panchanga and its Limbs" },
    blurb: {
      ne: "पाँच अङ्गको छोटो परिचय, त्यसपछि तिथि, नक्षत्र, योग, करण, चौघडिया र होरा छुट्टाछुट्टै।",
      en: "A short look at the five limbs, then tithi, nakshatra, yoga, karana, choghadiya and hora each on their own.",
    },
    sections: ["panchanga"],
  },
  {
    id: "sky-sun",
    title: { ne: "आकाश, पृथ्वी र सूर्य", en: "Sky, Earth and Sun" },
    blurb: {
      ne: "दिन, ऋतु, राशि, सङ्क्रान्ति र अयनांश एउटै प्रवाहमा।",
      en: "Day, seasons, rashi, sankranti and ayanamsha in one flow.",
    },
    sections: ["earth-sky", "sun"],
  },
  {
    id: "moon",
    title: { ne: "चन्द्र र चान्द्र मास", en: "The Moon and the Lunar Month" },
    blurb: {
      ne: "पक्ष, औंसी–पूर्णिमा, र अधिक–क्षय मास।",
      en: "Paksha, new and full moon, and the extra or skipped month.",
    },
    sections: ["moon"],
  },
  {
    id: "calculation",
    title: { ne: "गणना कसरी हुन्छ", en: "How Calculation Works" },
    blurb: {
      ne: "सूर्योदय र प्रत्येक अङ्गको सूत्र — परिभाषा होइन, गणना।",
      en: "Sunrise and the formula for each limb — the arithmetic, not another definition.",
    },
    sections: ["calculation"],
  },
  {
    id: "deeper",
    title: { ne: "अलि गहिरो खगोल", en: "Deeper Astronomy" },
    blurb: {
      ne: "वक्री गति, अयन चलन, ध्रुव तारा र ग्रहण।",
      en: "Retrograde motion, precession, pole stars and eclipses.",
    },
    sections: ["deeper"],
  },
  {
    id: "comparison",
    title: { ne: "तुलना र इतिहास", en: "Comparison and History" },
    blurb: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रो, अनि सूर्य सिद्धान्त।",
      en: "Nepali, Vedic and Gregorian calendars, plus Surya Siddhanta.",
    },
    sections: ["comparison"],
  },
];
