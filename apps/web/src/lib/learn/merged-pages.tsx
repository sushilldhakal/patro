/**
 * Long pages, assembled from the articles that used to be scattered.
 *
 * The section was 79 separate pages, and most of them were a single idea each:
 * "सौरमान के हो" and "चान्द्रमान के हो" sat apart from "सौर, चान्द्र र
 * चान्द्र–सौर पात्रो", which is the page that exists to explain both. A reader
 * following that had to open three pages to finish one thought. Those 79
 * became 22, and the 22 became the 12 guides here — one page per question a
 * reader actually arrives with, rather than one per paragraph we had to write.
 *
 * So a page here is a **chapter book**: several former articles run in order
 * on one scrolling page, under a heading each, with a jump list at the top.
 * The parts keep their own files untouched — nothing was rewritten to build
 * these — and section numbers run continuously across the whole page rather
 * than restarting at ०१ in every chapter.
 *
 * Every retired slug redirects to its chapter's anchor, so an old link lands
 * on the passage it used to be rather than at the top of a long page.
 */

import type { ReactNode } from "react";

import type { Bi } from "./article-schema";

/** One chapter of a merged page. */
export interface MergedPart {
  /** The slug this chapter used to live at — also its anchor and redirect target. */
  slug: string;
  /** Chapter heading. */
  title: Bi;
}

export interface MergedPage {
  slug: string;
  parts: MergedPart[];
}

const P = (slug: string, ne: string, en: string): MergedPart => ({ slug, title: { ne, en } });

/**
 * The merge map: new page slug → the chapters it is built from.
 *
 * Order inside a page is the reading order. A page whose first part shares its
 * slug keeps that URL, so the best-known address of a topic survives the merge.
 */
export const MERGED_PAGES: MergedPage[] = [
  /* ── सुरुवात ─────────────────────────────────────────────────────── */
  {
    slug: "bikram-sambat",
    parts: [
      P("bikram-sambat", "विक्रम सम्वत् के हो", "What Bikram Sambat is"),
      P("year-begins-baisakh", "वर्ष बैशाखमा किन सुरु हुन्छ", "Why the year begins in Baisakh"),
      P("bs-vs-ad", "बि.सं. र ई.सं. कसरी फरक छन्", "How BS and AD differ"),
      P("bs-ad-offset", "स्थिर फरक किन हुँदैन", "Why there is no fixed offset"),
      P("bs-calendar", "सौर, चान्द्र र चान्द्र–सौर पात्रो", "Solar, lunar and lunisolar calendars"),
      P("sauramana", "सौरमान — सौर गणना", "Sauramāna — the solar reckoning"),
      P("chandramana", "चान्द्रमान — चान्द्र गणना", "Chāndramāna — the lunar reckoning"),
    ],
  },
  {
    slug: "what-is-panchang",
    parts: [
      P("what-is-panchang", "पञ्चाङ्ग भनेको के हो", "What a panchanga is"),
      P("nepali-calendar-basics", "नेपाली पात्रो कसरी चल्छ", "How the Nepali calendar runs"),
      P("astronomy-basics", "गहिरो जानुअघि — खगोलीय आधार", "Sky basics, before going deeper"),
    ],
  },

  /* ── पृथ्वी र आकाश ───────────────────────────────────────────────── */
  {
    slug: "earth-rotation-day",
    parts: [
      P("what-is-a-day", "दिन के हो", "What a day is"),
      P("earth-rotation-day", "पृथ्वीको घुर्णन र दिनको लम्बाइ", "Earth's rotation and the length of a day"),
      P("solar-system", "सौर्यमण्डल र चन्द्र गति", "The solar system and the Moon's motion"),
      P("sky-rotation", "आकाश कसरी घुमेको देखिन्छ", "How the sky appears to turn"),
      P("celestial-sphere", "खगोलीय गोला", "The celestial sphere"),
      P("ecliptic", "क्रान्तिवृत्त", "The ecliptic"),
      P("celestial-equator", "खगोलीय विषुवत् रेखा", "The celestial equator"),
      P("zodiac-belt", "राशि पट्टी", "The zodiac belt"),
      P("right-ascension", "विषुवांश", "Right ascension"),
      P("sidereal-time", "नाक्षत्र काल", "Sidereal time"),
      P("solar-longitude", "सूर्यको देशान्तर", "Solar longitude"),
      P("lunar-longitude", "चन्द्रको देशान्तर", "Lunar longitude"),
    ],
  },
  {
    slug: "axial-tilt",
    parts: [
      P("axial-tilt", "पृथ्वीको २३.४४° अक्ष झुकाव", "Earth's 23.44° axial tilt"),
      P("why-seasons", "ऋतु किन हुन्छन्", "Why the seasons happen"),
      P("equinox-solstice", "विषुव र अयनान्त", "Equinoxes and solstices"),
      P("declination", "क्रान्ति — सूर्यको उत्तर–दक्षिण गति", "Declination — the Sun's north–south motion"),
    ],
  },

  /* ── सूर्य ───────────────────────────────────────────────────────── */
  {
    slug: "rashi",
    parts: [
      P("solar-year", "सूर्यले सौर वर्ष कसरी तय गर्छ", "How the Sun fixes the solar year"),
      P("rashi", "राशि के हो", "What a rashi is"),
      P("sankranti", "सङ्क्रान्ति", "Sankranti"),
      P("mesha-sankranti", "मेष सङ्क्रान्ति — बैशाखको आरम्भ", "Mesha Sankranti — the start of Baisakh"),
      P("makara-sankranti", "मकर सङ्क्रान्ति — माघे", "Makara Sankranti — Maghe"),
      P("karka-sankranti", "कर्क सङ्क्रान्ति — साउने", "Karka Sankranti — Shrawan"),
    ],
  },
  {
    slug: "sidereal-vs-tropical",
    parts: [
      P("sidereal-vs-tropical", "निरयन र सायन राशिचक्र", "The sidereal and tropical zodiacs"),
      P("ayanamsha", "अयनांश", "The ayanamsha"),
      P("uttarayana-dakshinayana", "उत्तरायण र दक्षिणायन", "Uttarāyaṇa and Dakṣiṇāyana"),
      P("ritu-drift", "ऋतु किन सर्छ", "Why the ṛtus drift"),
    ],
  },

  /* ── चन्द्र ──────────────────────────────────────────────────────── */
  {
    slug: "lunar-month",
    parts: [
      P("moon-lunar-calendar", "चन्द्रले चान्द्र पात्रो कसरी बनाउँछ", "How the Moon makes a calendar"),
      P("lunar-month", "चान्द्र मास के हो", "What a lunar month is"),
      P("amavasya-purnima", "औंसी र पूर्णिमा", "Amāvasyā and Pūrṇimā"),
      P("shukla-krishna-paksha", "शुक्ल र कृष्ण पक्ष", "Shukla and Krishna paksha"),
    ],
  },
  {
    slug: "tithi",
    parts: [
      P("tithi", "तिथि कसरी बन्छ", "How a tithi is formed"),
      P("tithi-not-24-hours", "तिथि २४ घण्टाको किन हुँदैन", "Why a tithi is not 24 hours"),
      P("tithi-vriddhi-kshaya", "तिथि वृद्धि र क्षय", "When a tithi repeats or skips"),
      P("lunar-solar-drift", "चान्द्र र सौर पात्रो किन छुट्टिन्छन्", "Why lunar and solar calendars drift apart"),
      P("adhik-kshaya-maas", "अधिक र क्षय मास", "The extra and the skipped month"),
    ],
  },

  /* ── पञ्चाङ्ग ────────────────────────────────────────────────────── */
  {
    slug: "five-limbs-together",
    parts: [
      P("five-limbs-together", "पाँच अङ्ग सँगै कसरी काम गर्छन्", "How the five limbs work together"),
      P("vara", "वार", "Vāra — the weekday"),
      P("nakshatra", "नक्षत्र", "Nakshatra"),
      P("yoga", "योग", "Yoga"),
      P("karana", "करण", "Karana"),
      P("hora", "होरा — ग्रहीय घडी", "Hora — the planetary hour"),
    ],
  },

  /* ── गणना ───────────────────────────────────────────────────────── */
  {
    slug: "how-we-calculate",
    parts: [
      P("how-we-calculate", "हामी यो कसरी गणना गर्छौं", "How we compute it"),
      P("time-scales", "शुद्ध काल मापन किन चाहिन्छ", "Why a precise time scale is needed"),
      P("calc-sunrise", "सूर्योदय", "Sunrise"),
      P("calc-sunset", "सूर्यास्त", "Sunset"),
      P("calc-moonrise", "चन्द्रोदय र चन्द्रास्त", "Moonrise and moonset"),
      P("calc-sankranti", "सङ्क्रान्तिको गणना", "Computing the sankranti"),
      P("calc-tithi", "तिथिको गणना", "Computing the tithi"),
      P("calc-nakshatra", "नक्षत्रको गणना", "Computing the nakshatra"),
      P("calc-yoga", "योगको गणना", "Computing the yoga"),
      P("calc-karana", "करणको गणना", "Computing the karana"),
      P("why-location-matters", "स्थानले किन फरक पार्छ", "Why location matters"),
      P("location-different-results", "दुई स्थानमा पञ्चाङ्ग किन फरक हुन्छ", "Why two places differ"),
    ],
  },

  /* ── गहिराइ ─────────────────────────────────────────────────────── */
  {
    slug: "geocentric-heliocentric",
    parts: [
      P("geocentric-heliocentric", "भूकेन्द्रित र सूर्यकेन्द्रित दृष्टिकोण", "Geocentric and heliocentric views"),
      P("mean-vs-true-motion", "मध्यम गति र स्पष्ट गति", "Mean motion and true motion"),
      P("retrograde-motion", "वक्री गति", "Retrograde motion"),
      P("ancient-planetary-motion", "प्राचीन ज्योतिषको वर्णन", "How the ancients described it"),
      P("precession", "पृथ्वीको अक्षको अयन चलन", "Precession of Earth's axis"),
      P("pole-star-changes", "ध्रुव तारा किन फेरिन्छ", "Why the pole star changes"),
      P("ancient-sky", "प्राचीन आकाश कस्तो देखिन्थ्यो", "How the ancient sky looked"),
      P("rahu-ketu-nodes", "राहु–केतु र पात रेखा", "Rahu, Ketu and the node line"),
      P("eclipses", "ग्रहण — सूर्य र चन्द्र", "Eclipses, solar and lunar"),
      P("eclipse-seasons", "ग्रहण ऋतु र चक्र", "Eclipse seasons and cycles"),
    ],
  },

  /* ── तुलना ──────────────────────────────────────────────────────── */
  {
    slug: "calendar-differences",
    parts: [
      P("calendar-differences", "नेपाली, वैदिक र ग्रेगोरियन", "Nepali, Vedic and Gregorian"),
      P("leap-years", "लीप वर्ष किन चाहिन्छ", "Why leap years exist"),
      P("calendar-drift", "मिति बिस्तारै किन सर्छ", "Why dates slowly drift"),
      P("calendars-aligned-with-nature", "पात्रो प्रकृतिसँग कसरी मिलिरहन्छ", "Keeping a calendar aligned with nature"),
      P("ancient-calendars", "प्राचीन पात्रोले समय कसरी नाप्थे", "How ancient calendars measured time"),
      P("history", "मयासुरको सूर्य सिद्धान्त", "Mayasura's Surya Siddhanta"),
    ],
  },
];

/** Chapter lookup for a merged page. */
export const MERGED_BY_SLUG: Record<string, MergedPage | undefined> = Object.fromEntries(
  MERGED_PAGES.map((p) => [p.slug, p]),
);

/**
 * Retired slug → where it went, as `page#anchor`.
 *
 * A part whose slug *is* the page slug is not a redirect — it is the page.
 */
export const PART_REDIRECTS: Record<string, string> = Object.fromEntries(
  MERGED_PAGES.flatMap((page) =>
    page.parts.filter((part) => part.slug !== page.slug).map((part) => [part.slug, `${page.slug}#${part.slug}`]),
  ),
);

/** Anchor id for a chapter. */
export const partAnchor = (slug: string) => slug;

export type { ReactNode };
