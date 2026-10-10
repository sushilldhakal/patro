import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons/Ionicons";

import type { Bi } from "@vedic-patro/domain/learn/article-schema";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The Learn library — the single source of truth for what exists in the
 * knowledge section, in reading order.
 *
 * Native port of web's `src/lib/learn/learn-library.ts` — same slugs,
 * sections, titles and summaries (kept in sync by hand), Ionicons names in
 * place of Lucide components since that is the icon set the rest of the app's
 * native screens use.
 *
 * The section runs as one course rather than a bag of loose pages: a reader
 * who starts at "sky basics" and follows prev/next moves Earth → Sun →
 * zodiac → Moon → panchanga → how a BS date is built → how we compute it →
 * eclipses → deeper astronomy → comparison. Array order *is* that path.
 *
 * `status` separates the map from the territory. `planned` entries hold a
 * slug and title so the outline stays visible in one place while the article
 * is written, but are filtered out of the hub and the router — nothing ships
 * as an empty page.
 */

export type TopicStatus = "published" | "planned";

export interface LibraryTopic {
  slug: string;
  section: string;
  title: Bi;
  summary: Bi;
  icon: IoniconName;
  status: TopicStatus;
}

export interface LibrarySection {
  id: string;
  title: Bi;
  blurb: Bi;
  icon: IoniconName;
}

export const LEARN_SECTIONS: LibrarySection[] = [
  {
    id: "start",
    icon: "compass-outline",
    title: { ne: "सुरुवात", en: "Start Here" },
    blurb: {
      ne: "पात्रो भनेको के हो, दिन कसरी नापिन्छ, विक्रम सम्वत् र पञ्चाङ्ग के हुन् — बाँकी सबै यहीँबाट सुरु हुन्छ।",
      en: "What a calendar is, how a day is measured, what Bikram Sambat and a panchanga are — everything else starts here.",
    },
  },
  {
    id: "earth-sky",
    icon: "sync-outline",
    title: { ne: "पृथ्वी र आकाश", en: "Earth and Sky" },
    blurb: {
      ne: "पृथ्वीको घुर्णन र परिक्रमा, २३.४४° अक्ष झुकाव, ऋतु, विषुव र अयनान्त — सबै गतिको स्रोत।",
      en: "Earth's rotation and orbit, the 23.44° tilt, seasons, equinoxes and solstices — where every motion begins.",
    },
  },
  {
    id: "sun",
    icon: "sunny-outline",
    title: { ne: "सूर्य र सौरमान", en: "The Sun and the Solar Month" },
    blurb: {
      ne: "राशि, सङ्क्रान्ति, अयन र सायन–निरयन राशिचक्र — सौर पात्रोको सम्पूर्ण आधार।",
      en: "Rashi, sankranti, the ayanas and the two zodiacs — everything the solar calendar rests on.",
    },
  },
  {
    id: "moon",
    icon: "moon-outline",
    title: { ne: "चन्द्र र चान्द्रमान", en: "The Moon and the Lunar Month" },
    blurb: {
      ne: "तिथि, पक्ष, चान्द्र मास र अधिक–क्षय मास — चन्द्रले पात्रोमा ल्याउने लय।",
      en: "Tithi, paksha, the lunar month and the extra or skipped month the Moon brings.",
    },
  },
  {
    id: "panchanga",
    icon: "document-text-outline",
    title: { ne: "पञ्चाङ्ग", en: "The Panchanga" },
    blurb: {
      ne: "वार, नक्षत्र, योग, करण — पाँच अङ्ग, तिनको पारस्परिक सम्बन्ध र दिनभित्रका परम्परागत समय एकाइ।",
      en: "Vara, nakshatra, yoga and karana — the five limbs, how they interlock, and the traditional units inside a day.",
    },
  },
  {
    id: "calculation",
    icon: "calculator-outline",
    title: { ne: "गणना", en: "How a Date Is Calculated" },
    blurb: {
      ne: "सूर्योदय, सङ्क्रान्ति, तिथि र नक्षत्र — प्रत्येक अङ्क कुन सूत्र र कुन ग्रहपातबाट आउँछ।",
      en: "Sunrise, sankranti, tithi and nakshatra — which formula and which ephemeris each number comes from.",
    },
  },
  {
    id: "deeper",
    icon: "telescope-outline",
    title: { ne: "गहिराइ", en: "Going Deeper" },
    blurb: {
      ne: "भूकेन्द्रित र सूर्यकेन्द्रित दृष्टि, वक्री गति, अयन चलन, ग्रहण — पात्रोभन्दा पर खगोलशास्त्र।",
      en: "Geocentric and heliocentric views, retrograde motion, precession and eclipses — the astronomy beyond the calendar.",
    },
  },
  {
    id: "comparison",
    icon: "git-compare-outline",
    title: { ne: "तुलना र इतिहास", en: "Comparison and History" },
    blurb: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रो आमनेसामने — लीप वर्ष, चलन र प्राचीन पात्रोको इतिहास।",
      en: "The Nepali, Vedic and Gregorian calendars side by side — leap years, drift, and where ancient calendars came from.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Topics, in reading order — mirrors web's LEARN_LIBRARY 1:1           */
/* ------------------------------------------------------------------ */

export const LEARN_LIBRARY: LibraryTopic[] = [
  {
    slug: "bikram-sambat",
    section: "start",
    status: "published",
    icon: "calendar-outline",
    title: { ne: "नेपाली पात्रो र विक्रम सम्वत्", en: "The Nepali Calendar and Bikram Sambat" },
    summary: {
      ne: "बि.सं. के हो, वर्ष बैशाखमा किन सुरु हुन्छ, ई.सं.सँगको फरक किन स्थिर हुँदैन, र सौर–चान्द्र–चान्द्रसौर गणना कसरी छुट्टिन्छन्।",
      en: "What Bikram Sambat is, why the year opens in Baisakh, why its offset from AD is never fixed, and how the solar, lunar and lunisolar reckonings differ.",
    },
  },
  {
    slug: "what-is-panchang",
    section: "start",
    status: "published",
    icon: "document-text-outline",
    title: { ne: "पञ्चाङ्ग भनेको के हो", en: "What a Panchanga Is" },
    summary: {
      ne: "पञ्चाङ्ग भनेको के हो, नेपाली पात्रो कसरी चल्छ, र त्यसका पछाडिको खगोलीय आधार — सबै एकै ठाउँमा।",
      en: "What a panchanga is, how the Nepali calendar runs, and the sky it rests on — in one place.",
    },
  },
  {
    slug: "earth-rotation-day",
    section: "earth-sky",
    status: "published",
    icon: "refresh-outline",
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
    icon: "sync-outline",
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
    icon: "ellipse-outline",
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
    icon: "compass-outline",
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
    icon: "time-outline",
    title: { ne: "चन्द्र मास, पक्ष र कला", en: "The Lunar Month, the Pakshas and the Phases" },
    summary: {
      ne: "चन्द्रले पात्रो कसरी बनाउँछ — चान्द्र मास, औंसी–पूर्णिमा र दुई पक्ष।",
      en: "How the Moon builds a calendar — the lunar month, new and full, and the two pakshas.",
    },
  },
  {
    slug: "tithi",
    section: "moon",
    status: "published",
    icon: "moon-outline",
    title: { ne: "तिथि र अधिक/क्षय मास", en: "Tithi, and the Extra or Skipped Month" },
    summary: {
      ne: "तिथि कसरी बन्छ, किन २४ घण्टाको हुँदैन, किन कुनै दोहोरिन्छ; अनि वर्षेनि ११ दिनको फरक अधिक वा क्षय मासले कसरी मिलाउँछ।",
      en: "How a tithi forms, why it is never 24 hours, why some repeat while others vanish — and how the 11-day annual shortfall is settled by an extra or a dropped month.",
    },
  },
  {
    slug: "five-limbs-together",
    section: "panchanga",
    status: "published",
    icon: "layers-outline",
    title: { ne: "पञ्चाङ्गका पाँच अङ्ग", en: "The Five Limbs of the Panchanga" },
    summary: {
      ne: "वार, तिथि, नक्षत्र, योग र करण — पाँचै अङ्ग, तिनको सम्बन्ध र ग्रहीय होरा।",
      en: "Vāra, tithi, nakshatra, yoga and karana — all five, how they interlock, and the planetary hora.",
    },
  },
  {
    slug: "how-we-calculate",
    section: "calculation",
    status: "published",
    icon: "server-outline",
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
    icon: "telescope-outline",
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
    icon: "globe-outline",
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

export const LEARN_LIBRARY_BY_SLUG: Record<string, LibraryTopic | undefined> = Object.fromEntries(
  LEARN_LIBRARY.map((t) => [t.slug, t]),
);

/** Everything a reader can actually open, in reading order. */
export const PUBLISHED_TOPICS: LibraryTopic[] = LEARN_LIBRARY.filter((t) => t.status === "published");

export const LEARN_SECTIONS_BY_ID: Record<string, LibrarySection | undefined> = Object.fromEntries(
  LEARN_SECTIONS.map((s) => [s.id, s]),
);

export function publishedInSection(sectionId: string): LibraryTopic[] {
  return PUBLISHED_TOPICS.filter((t) => t.section === sectionId);
}

export function adjacentPublishedTopics(slug: string): {
  prev: LibraryTopic | null;
  next: LibraryTopic | null;
} {
  const i = PUBLISHED_TOPICS.findIndex((t) => t.slug === slug);
  return {
    prev: i > 0 ? PUBLISHED_TOPICS[i - 1]! : null,
    next: i >= 0 && i < PUBLISHED_TOPICS.length - 1 ? PUBLISHED_TOPICS[i + 1]! : null,
  };
}

/**
 * Outlined-but-unwritten articles per section — web keeps these as `planned`
 * entries; the hub only needs the count for its "N more being written" line.
 */
const PLANNED_COUNT_BY_SECTION: Record<string, number> = { start: 8, panchanga: 3 };

export function plannedCountInSection(sectionId: string): number {
  return PLANNED_COUNT_BY_SECTION[sectionId] ?? 0;
}
