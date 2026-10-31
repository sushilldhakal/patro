

import type { Bi } from "./article-schema";

/**
 * The Learn library — the single source of truth for what exists in the
 * knowledge section, in reading order.
 *
 * The section runs as one course rather than a bag of loose pages, each part
 * laying the ground the next one needs: the calendar and Bikram Sambat, then
 * Earth and the sky (astronomy only), then the solar reckoning, the lunar
 * reckoning, the five panchanga limbs, how all of it is computed, advanced
 * astronomy, and history last. A topic is explained in one place; later
 * parts compute or extend it rather than define it again.
 * Array order *is* that path, so insert a topic where it belongs in the sequence.
 *
 * `status` separates the map from the territory:
 *
 *   - `published` — written, reviewed and visible.
 *   - `draft` — the body exists but is not ready to show.
 *   - `planned` — the slug and title are reserved; nothing is written yet.
 *
 * Only `published` topics reach the hub, the router, the sitemap and SEO
 * metadata, so nothing ships as an empty or half-finished page. The other two
 * keep the outline visible in one place and count towards the hub's "more
 * coming" line. A new article goes `planned` → `draft` → `published`.
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

export type TopicStatus = "published" | "draft" | "planned";

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
    title: { ne: "पात्रो, समय र विक्रम सम्वत्को परिचय", en: "The Calendar, Time and Bikram Sambat" },
    blurb: {
      ne: "पात्रो के हो, किन चाहिन्छ, र नेपालमा प्रयोग हुने विक्रम सम्वत्को आधार के हो — हामी समय र वर्ष कसरी नाप्छौँ।",
      en: "What a calendar is, why we need one, and what Nepal's Bikram Sambat rests on — how we measure time and the year.",
    },
  },
  {
    id: "earth-sky",
    icon: "Rotate3d",
    title: { ne: "पृथ्वी र खगोलीय आधार", en: "Earth and the Astronomical Basis" },
    blurb: {
      ne: "आकाश, पृथ्वी, कक्षा, गति र कोण कसरी बुझ्ने — पात्रोको व्याख्या नगरी, सूर्य, चन्द्र र राशिको खगोलीय जग मात्र।",
      en: "How to read the sky, Earth, orbits, motion and angles — only the astronomy under the Sun, Moon and rashis, before any calendar.",
    },
  },
  {
    id: "sun",
    icon: "Sun",
    title: { ne: "सौरमान, राशि र विक्रम सम्वत्", en: "The Solar Reckoning, Rashi and Bikram Sambat" },
    blurb: {
      ne: "सूर्यको आधारमा वर्ष, राशि, अयनांश, सङ्क्रान्ति र विक्रम सम्वत्का महिना एउटै क्रममा।",
      en: "The year, the rashis, the ayanamsha, the sankrantis and the months of Bikram Sambat — all from the Sun, in one sequence.",
    },
  },
  {
    id: "moon",
    icon: "Moon",
    title: { ne: "चन्द्रमान र चान्द्र पात्रो", en: "The Lunar Reckoning and the Lunar Calendar" },
    blurb: {
      ne: "चन्द्रको गति र कलाबाट तिथि, पक्ष, चान्द्र मास र अधिक–क्षय माससम्म।",
      en: "From the Moon's motion and phases to the tithi, the paksha, the lunar month and the extra or skipped month.",
    },
  },
  {
    id: "panchanga",
    icon: "ScrollText",
    title: { ne: "पञ्चाङ्गका पाँच अङ्ग", en: "The Five Limbs of the Panchanga" },
    blurb: {
      ne: "सूर्य र चन्द्रको गतिबाट तिथि, नक्षत्र, योग, करण र वार कसरी निर्धारण हुन्छन् — अनि होरा र चौघडिया।",
      en: "How tithi, nakshatra, yoga, karana and vara follow from the motions of the Sun and Moon — plus hora and choghadiya.",
    },
  },
  {
    id: "calculation",
    icon: "Calculator",
    title: { ne: "पञ्चाङ्ग तथा खगोलीय गणना", en: "Computing the Panchanga" },
    blurb: {
      ne: "सिद्धान्त, सूत्र र वास्तविक गणना — परिभाषा दोहोर्‍याउँदैन, वेदिक पात्रोले प्रत्येक अङ्क कसरी निकाल्छ भन्ने मात्र।",
      en: "Theory, formulas and the real computation — no definitions repeated, only how Vedic Patro arrives at each number.",
    },
  },
  {
    id: "deeper",
    icon: "Telescope",
    title: { ne: "उन्नत खगोलशास्त्र", en: "Advanced Astronomy" },
    blurb: {
      ne: "अयन चलन, ग्रहगति, ग्रहण र दीर्घकालीन परिवर्तन — गहिरो अध्ययन गर्न चाहनेका लागि।",
      en: "Precession, planetary motion, eclipses and long-term change — for readers who want to go deeper.",
    },
  },
  {
    id: "comparison",
    icon: "GitCompare",
    title: { ne: "पात्रोको इतिहास, विकास र तुलना", en: "History, Development and Comparison" },
    blurb: {
      ne: "यी प्रणाली कसरी विकसित भए, विश्वका अन्य पात्रोसँग कसरी तुलना हुन्छन्, र आजसम्म कसरी प्रयोगमा छन्।",
      en: "How these systems developed, how they compare with the world's other calendars, and how they are still in use today.",
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
    title: { ne: "नेपाली पात्रो र यसको आधार", en: "The Nepali Calendar and Its Basis" },
    summary: {
      ne: "पात्रो के हो, विक्रम सम्वत् के हो, सौर–चान्द्र–चान्द्रसौर पात्रो कसरी छुट्टिन्छन्, ई.सं.सँगको ५६–५७ वर्षको फरक किन सधैँ एउटै हुँदैन, र पात्रोमा वर्ष, महिना र दिन कसरी तय हुन्छन्।",
      en: "What a calendar is, what Bikram Sambat is, how solar, lunar and lunisolar calendars differ, why its 56–57-year gap from AD is never fixed, and how the calendar fixes its years, months and days.",
    },
  },
  {
    slug: "earth-rotation-day",
    section: "earth-sky",
    status: "published",
    icon: "RotateCw",
    title: { ne: "पृथ्वी र यसको गति", en: "Earth and Its Motion" },
    summary: {
      ne: "पृथ्वीको घूर्णन र परिक्रमा, दिन र रात, एक दिन २४ घण्टाको किन, र नाक्षत्र दिन र सौर दिन — निर्देशित भ्रमणसहित।",
      en: "Earth's rotation and orbit, day and night, why a day is 24 hours, and the sidereal and solar day — as a guided tour.",
    },
  },
  {
    slug: "solar-system",
    section: "earth-sky",
    status: "published",
    icon: "Globe",
    title: { ne: "सौर्यमण्डल र खगोलीय पिण्ड", en: "The Solar System and the Bodies in It" },
    summary: {
      ne: "सूर्य, पृथ्वी र चन्द्रको आपसी गति, चन्द्रका कला, र भूकेन्द्रित र सूर्यकेन्द्रित दृष्टिकोण।",
      en: "How the Sun, Earth and Moon move around each other, the Moon's phases, and the geocentric and heliocentric views.",
    },
  },
  {
    slug: "celestial-sphere",
    section: "earth-sky",
    status: "published",
    icon: "Compass",
    title: { ne: "आकाशीय गोला र निर्देशाङ्क प्रणाली", en: "The Celestial Sphere and Coordinates" },
    summary: {
      ne: "खगोलीय गोला, आकाशीय विषुवत् रेखा, क्रान्तिवृत्त, विषुवांश, दुई निर्देशाङ्क प्रणाली, र नाक्षत्र काल र लग्न।",
      en: "The celestial sphere, the celestial equator, the ecliptic, right ascension, the two coordinate systems, and sidereal time and the lagna.",
    },
  },
  {
    slug: "sky-rotation",
    section: "earth-sky",
    status: "published",
    icon: "Locate",
    title: { ne: "आकाशमा सूर्य र ग्रहको देखिने गति", en: "How the Sun and Planets Appear to Move" },
    summary: {
      ne: "आकाश घुमेको किन देखिन्छ, अक्षांशले दृश्य कसरी बदल्छ, र ग्रहहरू राशि पट्टीभित्रै किन हिँड्छन्।",
      en: "Why the sky appears to turn, how latitude changes the view, and why the planets keep to the zodiac belt.",
    },
  },
  {
    slug: "why-seasons",
    section: "earth-sky",
    status: "published",
    icon: "Axis3d",
    title: { ne: "ऋतु र सूर्यको वार्षिक यात्रा", en: "The Seasons and the Sun's Yearly Journey" },
    summary: {
      ne: "२३.४४° को अक्ष झुकाव र त्यो पनि स्थिर नहुनु, ऋतु किन फेरिन्छन्, विषुव र अयनान्त, उत्तरायण–दक्षिणायनको खगोलीय अर्थ, र सूर्यको क्रान्ति।",
      en: "The 23.44° axial tilt (which is not fixed either), why the seasons change, the equinoxes and solstices, the astronomy of Uttarayana and Dakshinayana, and the Sun's declination.",
    },
  },
  {
    slug: "sayana-nirayana-year",
    section: "sun",
    status: "published",
    icon: "Hourglass",
    title: { ne: "सौर वर्ष र यसको मापन", en: "The Solar Year and How It Is Measured" },
    summary: {
      ne: "सौर वर्ष के हो, सायन र निरयन वर्ष, बीचको २० मिनेटको फरक कसरी जम्मा हुन्छ, र वि.सं. कुन वर्षमा चल्छ।",
      en: "What the solar year is, the tropical and sidereal years, how the 20-minute gap between them builds up, and which year Bikram Sambat keeps.",
    },
  },
  {
    slug: "rashi",
    section: "sun",
    status: "published",
    icon: "CircleDot",
    title: { ne: "राशि र राशिचक्र", en: "Rashi and the Zodiac" },
    summary: {
      ne: "राशि के हो, राशि र तारापुञ्जको फरक, बाह्र राशि र महिना, वर्गीकरण र स्वामी ग्रह।",
      en: "What a rashi is, how it differs from a constellation, the twelve rashis and months, how they are grouped, and their ruling grahas.",
    },
  },
  {
    slug: "sidereal-vs-tropical",
    section: "sun",
    status: "published",
    icon: "Compass",
    title: { ne: "सायन, निरयन र अयनांश", en: "Tropical, Sidereal and the Ayanamsha" },
    summary: {
      ne: "एउटै आकाश, दुई राशिचक्र — सायन र निरयन शून्य बिन्दु, अयनांश र त्यो किन बढ्छ, प्रमुख प्रणाली र २४ दिनको ऐतिहासिक फरक।",
      en: "One sky, two zodiacs — the tropical and sidereal zero points, the ayanamsha and why it grows, the main systems, and the 24-day historical gap.",
    },
  },
  {
    slug: "sankranti",
    section: "sun",
    status: "published",
    icon: "Milestone",
    title: { ne: "सङ्क्रान्ति र सौर महिना", en: "Sankranti and the Solar Month" },
    summary: {
      ne: "सूर्य राशि फेर्ने क्षण, बाह्र सङ्क्रान्ति, र मेष, कर्क र मकर सङ्क्रान्ति।",
      en: "The moment the Sun changes rashi, the twelve sankrantis, and Mesha, Karka and Makara Sankranti.",
    },
  },
  {
    slug: "year-begins-baisakh",
    section: "sun",
    status: "published",
    icon: "CalendarClock",
    title: { ne: "विक्रम सम्वत् र ऋतुको सम्बन्ध", en: "Bikram Sambat and the Seasons" },
    summary: {
      ne: "वर्ष वैशाखमा किन सुरु हुन्छ, महिना २९–३२ दिनका किन, उपसौर–अपसौर, ऋतु र निरयन महिना, उत्तरायण पात्रोमा, र भविष्यको वि.सं.।",
      en: "Why the year opens in Baisakh, why months run 29–32 days, perihelion and aphelion, seasons against sidereal months, Uttarayana in the calendar, and where BS is heading.",
    },
  },
  {
    slug: "baisakh-1",
    section: "sun",
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
    section: "sun",
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
    section: "sun",
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
    section: "sun",
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
    section: "sun",
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
    section: "sun",
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
    section: "sun",
    status: "planned",
    icon: "Layers",
    title: { ne: "एउटै महिनाका दिन वर्षैपिच्छे किन फरक हुन्छन्", en: "Why the Same Month Has Different Day Counts" },
    summary: {
      ne: "गत वर्ष ३१ दिनको भदौ यस वर्ष ३२ दिनको किन — सङ्क्रान्तिको क्षण सर्दै जाने कारण।",
      en: "Why a 31-day Bhadau becomes 32 days the next year — the sankranti instant keeps shifting.",
    },
  },
  {
    slug: "lunar-month",
    section: "moon",
    status: "published",
    icon: "CalendarClock",
    title: { ne: "चन्द्रको गति र चान्द्र मास", en: "The Moon's Motion and the Lunar Month" },
    summary: {
      ne: "चन्द्रले चान्द्र पात्रो कसरी बनाउँछ, सांयोगिक मास, ३० तिथि तर ३० दिन होइन, र मासका नाम।",
      en: "How the Moon makes a calendar, the synodic month, thirty tithis but not thirty days, and the month names.",
    },
  },
  {
    slug: "tithi",
    section: "moon",
    status: "published",
    icon: "Sigma",
    title: { ne: "तिथि र पक्षको खगोलीय आधार", en: "The Astronomy of Tithi and Paksha" },
    summary: {
      ne: "तिथि = सूर्य र चन्द्रबीचको १२°, तिथि २४ घण्टाको किन हुँदैन, र शुक्ल र कृष्ण पक्ष।",
      en: "A tithi is 12° between the Sun and the Moon, why it is never 24 hours, and the bright and dark pakshas.",
    },
  },
  {
    slug: "amavasya-purnima",
    section: "moon",
    status: "published",
    icon: "SunMoon",
    title: { ne: "औंसी, पूर्णिमा र चन्द्रका सन्धि बिन्दु", en: "New Moon, Full Moon and the Month's Hinges" },
    summary: {
      ne: "चान्द्र मासका दुई सन्धि बिन्दु, हरेक औंसी–पूर्णिमामा ग्रहण किन लाग्दैन, र पात्रोमा तिनको भूमिका।",
      en: "The lunar month's two hinge points, why not every new or full moon brings an eclipse, and their role in the calendar.",
    },
  },
  {
    slug: "adhik-kshaya-maas",
    section: "moon",
    status: "published",
    icon: "Layers",
    title: { ne: "अधिक मास र क्षय मास", en: "The Extra and the Skipped Month" },
    summary: {
      ne: "सौर र चान्द्र वर्षबीचको ११ दिनको फरक, अधिक मास किन थपिन्छ, क्षय मास किन हुन्छ र किन दुर्लभ छ।",
      en: "The 11-day gap between the solar and lunar years, why an extra month is added, why a month is sometimes dropped, and why that is rare.",
    },
  },
  {
    slug: "what-is-panchang",
    section: "panchanga",
    status: "published",
    icon: "ScrollText",
    title: { ne: "पञ्चाङ्गको परिचय", en: "Introducing the Panchanga" },
    summary: {
      ne: "पञ्चाङ्ग के हो, पाँच अङ्ग किन, एउटै दिनका पाँच खगोलीय नाप, र तिनलाई सँगै कसरी पढ्ने।",
      en: "What a panchanga is, why five limbs, five astronomical measurements of one day, and how to read them together.",
    },
  },
  {
    slug: "tithi-vriddhi-kshaya",
    section: "panchanga",
    status: "published",
    icon: "Sigma",
    title: { ne: "तिथि — वृद्धि, क्षय र सूर्योदय", en: "Tithi — Repeats, Skips and Sunrise" },
    summary: {
      ne: "एउटै तिथि दुई दिन पर्ने वृद्धि, हराउने क्षय, र दुवै सूर्योदयको एउटै नियमबाट कसरी आउँछन्।",
      en: "A tithi that covers two days, one that disappears, and how both follow from the one sunrise rule.",
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
    slug: "hora",
    section: "panchanga",
    status: "published",
    icon: "Timer",
    title: { ne: "होरा र चौघडिया", en: "Hora and Choghadiya" },
    summary: {
      ne: "पाँच अङ्गबाहेकका समय विभाजन — सूर्योदयदेखिका चौबीस होरा, र दिन–रातका आठ–आठ चौघडिया।",
      en: "The time divisions beyond the five limbs — twenty-four horas from sunrise, and the eight choghadiyas of the day and of the night.",
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
    slug: "time-scales",
    section: "calculation",
    status: "published",
    icon: "Timer",
    title: { ne: "खगोलीय गणनाको आधार", en: "The Basis of Astronomical Computation" },
    summary: {
      ne: "कुन घडीमा गणना गर्ने (UT, TT, ΔT), पृथ्वीको घूर्णन किन सुस्ताउँदै छ, जुलियन डे, समय क्षेत्र र UTC — र वेदिक पात्रोले मितिलाई JD मा कसरी बदल्छ।",
      en: "Which clock to compute in (UT, TT, ΔT), why Earth's rotation is slowing, the Julian Day, time zones and UTC — and how Vedic Patro turns a date into a JD.",
    },
  },
  {
    slug: "solar-longitude",
    section: "calculation",
    status: "published",
    icon: "Sun",
    title: { ne: "सूर्य र चन्द्रको स्थिति गणना", en: "Computing the Sun's and Moon's Positions" },
    summary: {
      ne: "सूर्य र चन्द्रको देशान्तर, चन्द्र गणना किन गाह्रो, मध्यम र स्पष्ट गति, र सिद्धान्तदेखि स्विस एफेमेरिससम्म।",
      en: "The Sun's and Moon's longitudes, why the Moon is hard to compute, mean and true motion, and from the siddhantas to Swiss Ephemeris.",
    },
  },
  {
    slug: "calc-sunrise",
    section: "calculation",
    status: "published",
    icon: "SunMoon",
    title: { ne: "सूर्योदय र सूर्यास्तको गणना", en: "Computing Sunrise and Sunset" },
    summary: {
      ne: "सूर्योदय कहिले गनिन्छ, आधारभूत सूत्र, सूर्यास्त, दिनमान–रातिमान र सन्ध्याकाल।",
      en: "When sunrise counts, the underlying formula, sunset, the lengths of day and night, and twilight.",
    },
  },
  {
    slug: "calc-moonrise",
    section: "calculation",
    status: "published",
    icon: "Moon",
    title: { ne: "चन्द्रोदय र चन्द्रास्तको गणना", en: "Computing Moonrise and Moonset" },
    summary: {
      ne: "चन्द्रोदय सूर्योदयभन्दा किन गाह्रो, कुनै दिन चन्द्रोदय किन हुँदैन, र पर्वमा यसको भूमिका।",
      en: "Why moonrise is harder than sunrise, why some days have none, and its role in festivals.",
    },
  },
  {
    slug: "calc-tithi",
    section: "calculation",
    status: "published",
    icon: "Sigma",
    title: { ne: "पञ्चाङ्गका पाँच अङ्गको गणना", en: "Computing the Five Limbs" },
    summary: {
      ne: "तिथि, नक्षत्र, योग र करणको सङ्ख्या र सन्धि समय कसरी निकालिन्छ, र दिनमा कसरी राखिन्छ।",
      en: "How the number and boundary times of the tithi, nakshatra, yoga and karana are found, and how each is assigned to a day.",
    },
  },
  {
    slug: "calc-sankranti",
    section: "calculation",
    status: "published",
    icon: "Milestone",
    title: { ne: "सौरमान र चान्द्रमानको गणना", en: "Computing the Solar and Lunar Reckonings" },
    summary: {
      ne: "सङ्क्रान्तिको सटीक क्षण र क्षणबाट गतेसम्म, अनि चान्द्र मासको सीमा, नाम, अधिक मास र क्षय मास कसरी गणना हुन्छन्।",
      en: "The exact sankranti instant and how it becomes a gate, then how the lunar month's edges, its name, the adhik maas and the kshaya maas are computed.",
    },
  },
  {
    slug: "why-location-matters",
    section: "calculation",
    status: "published",
    icon: "Locate",
    title: { ne: "स्थानअनुसार पञ्चाङ्ग किन फरक हुन्छ", en: "Why the Panchanga Changes with Place" },
    summary: {
      ne: "पञ्चाङ्ग स्थाननिरपेक्ष किन हुँदैन, सूर्योदयको भूमिका, एउटै क्षणका फरक उत्तर, र वेदिक पात्रोले कसरी सम्हाल्छ।",
      en: "Why a panchanga depends on place, the role of sunrise, one instant with different answers, and how Vedic Patro handles it.",
    },
  },
  {
    slug: "gochar-eclipse-calc",
    section: "calculation",
    status: "published",
    icon: "Telescope",
    title: { ne: "ग्रह गोचर र ग्रहणको गणना", en: "Computing Transits and Eclipses" },
    summary: {
      ne: "ग्रहको राशि, नक्षत्र र वक्री अवस्था, अनि सूर्य र चन्द्र ग्रहणको समय कसरी गणना हुन्छ।",
      en: "How a graha's rashi, nakshatra and retrograde state are computed, and the timing of solar and lunar eclipses.",
    },
  },
  {
    slug: "how-we-calculate",
    section: "calculation",
    status: "published",
    icon: "Server",
    title: { ne: "वेदिक पात्रोको गणना प्रणाली", en: "How Vedic Patro Computes" },
    summary: {
      ne: "इनपुटदेखि परिणामसम्म — सर्भरले प्रयोग गर्ने भाग, स्थान–समय–ग्रहपात, पञ्चाङ्ग कसरी बन्छ, र यो वेबसाइटले के देखाउँछ।",
      en: "From input to result — the divisions the server uses, place, time and ephemeris, how the panchanga is built, and what this site shows.",
    },
  },
  {
    slug: "bs-ad-conversion",
    section: "calculation",
    status: "planned",
    icon: "ArrowLeftRight",
    title: { ne: "वि.सं. र ई.सं. मिति कसरी रूपान्तरण हुन्छ", en: "How BS and AD Dates Are Converted" },
    summary: {
      ne: "तालिका होइन, गणना — जुलियन दिनमार्फत दुई पात्रोबीच मिति कसरी सारिन्छ।",
      en: "Not a lookup table but a computation — how a date moves between the two calendars via the Julian Day.",
    },
  },
  {
    slug: "retrograde-motion",
    section: "deeper",
    status: "published",
    icon: "RotateCw",
    title: { ne: "ग्रहहरूको गति र कक्षा", en: "Planetary Motion and Orbits" },
    summary: {
      ne: "ग्रह पछाडि हिँडेको किन देखिन्छ — उछिन्ने कारको उदाहरण, र सिद्धान्तले वक्री गतिलाई कसरी सम्हाल्यो।",
      en: "Why a planet appears to move backwards — the overtaking-car picture, and how the siddhantas handled retrograde motion.",
    },
  },
  {
    slug: "precession",
    section: "deeper",
    status: "published",
    icon: "Axis3d",
    title: { ne: "पृथ्वीको अक्ष र अयन चलन", en: "Earth's Axis and Precession" },
    summary: {
      ne: "पृथ्वी लट्टुझैँ किन डगमगाउँछ, अयन चलनले के–के सार्छ, र प्राचीन ज्योतिषीलाई यो थाहा थियो।",
      en: "Why Earth wobbles like a top, what precession moves, and what the ancient astronomers knew of it.",
    },
  },
  {
    slug: "pole-star-changes",
    section: "deeper",
    status: "published",
    icon: "Telescope",
    title: { ne: "ध्रुव तारा र प्राचीन आकाश", en: "The Pole Star and the Ancient Sky" },
    summary: {
      ne: "ध्रुव तारा किन फेरिन्छ, दक्षिणी आकाश, र हजारौँ वर्षअघि विषुव कुन नक्षत्रमा थियो।",
      en: "Why the pole star changes, the southern sky, and which nakshatra held the equinox thousands of years ago.",
    },
  },
  {
    slug: "eclipses",
    section: "deeper",
    status: "published",
    icon: "SunMoon",
    title: { ne: "राहु, केतु र ग्रहण", en: "Rahu, Ketu and Eclipses" },
    summary: {
      ne: "राहु–केतु पात बिन्दु, चन्द्र कक्षको ५° झुकाव, सूर्य र चन्द्र ग्रहण, ग्रहण ऋतु र सरोस चक्र।",
      en: "Rahu and Ketu as the lunar nodes, the Moon's 5° tilted orbit, solar and lunar eclipses, eclipse seasons and the saros.",
    },
  },
  {
    slug: "ancient-planetary-motion",
    section: "deeper",
    status: "published",
    icon: "Ruler",
    title: { ne: "परम्परागत खगोलशास्त्र र आधुनिक विज्ञान", en: "Traditional Astronomy and Modern Science" },
    summary: {
      ne: "प्राचीन गणितले ग्रहको स्थिति कसरी निकाल्थ्यो — मन्द र शीघ्र सुधार, र ज्या तालिका।",
      en: "How the old mathematics found a planet's place — the manda and shighra corrections, and the sine tables.",
    },
  },
  {
    slug: "calendar-differences",
    section: "comparison",
    status: "published",
    icon: "Globe",
    title: { ne: "विश्वका पात्रो प्रणाली", en: "The World's Calendar Systems" },
    summary: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रोका आधार र भिन्नता, र पात्रोलाई प्रकृतिसँग मिलाइराख्ने उपाय।",
      en: "The bases and differences of the Nepali, Vedic and Gregorian calendars, and the devices that keep a calendar in step with nature.",
    },
  },
  {
    slug: "leap-years",
    section: "comparison",
    status: "published",
    icon: "CalendarRange",
    title: { ne: "ग्रेगोरियन पात्रोको विकास", en: "How the Gregorian Calendar Developed" },
    summary: {
      ne: "लीप वर्ष किन चाहियो, जुलियनबाट ग्रेगोरियनसम्म, १५८२ का दस दिन, र मिति बिस्तारै किन सर्छ।",
      en: "Why leap years were needed, from Julian to Gregorian, the ten days of 1582, and why dates slowly drift.",
    },
  },
  {
    slug: "nepali-calendar-history",
    section: "comparison",
    status: "planned",
    icon: "ScrollText",
    title: { ne: "नेपाली पात्रोको ऐतिहासिक विकास", en: "How the Nepali Calendar Developed" },
    summary: {
      ne: "नेपालमा कालगणनाको इतिहास, नेपाल सम्वत्, पञ्चाङ्ग प्रकाशन, र आधुनिक पात्रोको सरकारी मान्यता।",
      en: "The history of time reckoning in Nepal, Nepal Sambat, panchanga publishing, and the official calendar today.",
    },
  },
  {
    slug: "surya-siddhanta",
    section: "comparison",
    status: "published",
    icon: "ScrollText",
    title: { ne: "वैदिक खगोलशास्त्रका मूल ग्रन्थ", en: "The Founding Texts of Vedic Astronomy" },
    summary: {
      ne: "मयासुरको सूर्य सिद्धान्त — युग चक्र, नक्षत्रको स्थानान्तरण, सात दिने हप्ता, लाटदेव र उज्जयिनी, र वेदाङ्ग ज्योतिष।",
      en: "Mayasura's Surya Siddhanta — the yuga cycle, the shifting nakshatras, the seven-day week, Latadeva and Ujjayini, and the Vedanga Jyotisha.",
    },
  },
  {
    slug: "ancient-calendars",
    section: "comparison",
    status: "published",
    icon: "Hourglass",
    title: { ne: "कालगणना र युग प्रणाली", en: "Time Reckoning and the Yugas" },
    summary: {
      ne: "घडी बिना समय नाप्नु, परम्परागत समय एकाइ, र ती कति शुद्ध थिए।",
      en: "Measuring time without a clock, the traditional units of time, and how accurate they were.",
    },
  },
  {
    slug: "ghati-pala",
    section: "comparison",
    status: "planned",
    icon: "Hourglass",
    title: { ne: "घटी, पला र विपला", en: "Ghati, Pala and Vipala" },
    summary: {
      ne: "पञ्चाङ्गमा समय लेख्ने परम्परागत एकाइ — घटी–पलालाई घण्टा–मिनेटमा कसरी पढ्ने।",
      en: "The traditional units a panchanga writes time in — how to read ghati and pala as hours and minutes.",
    },
  },
  {
    slug: "ancient-astronomy-evidence",
    section: "comparison",
    status: "planned",
    icon: "Telescope",
    title: { ne: "प्राचीन खगोलीय ज्ञानको ऐतिहासिक अध्ययन", en: "The Historical Study of Ancient Astronomy" },
    summary: {
      ne: "प्राचीन अवलोकन र ग्रहण अभिलेखका प्रमाण, उज्जयिनीको देशान्तर परम्परा, र सभ्यताबीच ज्ञानको आदानप्रदान।",
      en: "The evidence of ancient observations and eclipse records, the Ujjayini meridian, and how knowledge moved between civilisations.",
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
  const upcoming = topics.filter((t) => t.status !== "published");
  return {
    bySlug: Object.fromEntries(topics.map((t) => [t.slug, t])) as Record<string, T | undefined>,
    sectionsById: Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, S | undefined>,
    published,
    planned,
    publishedInSection: (sectionId: string): T[] => published.filter((t) => t.section === sectionId),
    plannedInSection: (sectionId: string): T[] => planned.filter((t) => t.section === sectionId),
    /** Drafts and planned topics — everything not yet shown. */
    upcomingInSection: (sectionId: string): T[] => upcoming.filter((t) => t.section === sectionId),
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
    title: { ne: "तह १ · आधारभूत ज्ञान", en: "Level 1 · The Basics" },
    blurb: {
      ne: "पात्रो कसरी चल्छ भन्ने बुझ्न चाहने सबैका लागि — समय, पृथ्वी र आकाश, सौरमान, चन्द्रमान र पञ्चाङ्ग।",
      en: "For anyone who wants to understand how the calendar works — time, Earth and sky, the solar and lunar reckonings, and the panchanga.",
    },
    sections: ["start", "earth-sky", "sun", "moon", "panchanga"],
  },
  {
    id: "calculation",
    title: { ne: "तह २ · गणित र प्रयोग", en: "Level 2 · The Mathematics" },
    blurb: {
      ne: "पात्रोमा देखिने प्रत्येक परिणाम कसरी निकालिन्छ — सूत्र, विधि र वास्तविक गणना।",
      en: "How every number on the calendar is worked out — the formulas, the methods and the real computation.",
    },
    sections: ["calculation"],
  },
  {
    id: "advanced",
    title: { ne: "तह ३ · उन्नत अध्ययन", en: "Level 3 · Advanced Study" },
    blurb: {
      ne: "खगोलशास्त्र, ज्योतिष गणित, इतिहास र सिद्धान्तमा गहिरो अध्ययन।",
      en: "Deeper study of astronomy, the mathematics of jyotisha, history and the siddhantas.",
    },
    sections: ["deeper", "comparison"],
  },
];
