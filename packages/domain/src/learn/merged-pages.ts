/**
 * Long pages, assembled from the articles that used to be scattered.
 *
 * Shared by the website and the app (one copy — it used to be kept in sync by
 * hand in both). Pure data; each app draws a merged page with its own body
 * component (web `MergedBody`, app `components/learn/MergedArticleBody.tsx`).
 *
 * A page here is a **chapter book**: several former articles run in order on
 * one scrolling screen, under a heading each, with a jump list at the top.
 * Section numbers run continuously across the whole page rather than
 * restarting at ०१ in every chapter. Every retired slug redirects to its
 * chapter's anchor (`PART_REDIRECTS`), so an old link lands on the passage it
 * used to be rather than at the top of a long page.
 */

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
  /* ── १ · पात्रो, समय र विक्रम सम्वत् ─────────────────────────────── */
  {
    slug: "bikram-sambat",
    parts: [
      P("nepali-calendar-basics", "नेपाली पात्रो के हो?", "What is the Nepali patro?"),
      P("bikram-sambat", "विक्रम सम्वत् के हो?", "What is Bikram Sambat?"),
      P("bs-calendar", "सौर, चान्द्र र चान्द्र–सौर पात्रो", "Solar, lunar and lunisolar calendars"),
      P("bs-vs-ad", "विक्रम सम्वत् र ग्रेगोरियन पात्रो", "Bikram Sambat and the Gregorian calendar"),
      P("bs-ad-offset", "५६–५७ वर्षको अन्तर सधैँ एउटै किन हुँदैन?", "Why the 56–57-year gap is never fixed"),
    ],
  },

  /* ── २ · पृथ्वी र खगोलीय आधार ──────────────────────────────────── */
  {
    slug: "earth-rotation-day",
    parts: [
      P("what-is-a-day", "दिन र रात — एक दिन भनेको के हो?", "Day and night — what is a day?"),
      P("earth-rotation-day", "नाक्षत्र दिन र सौर दिन", "The sidereal day and the solar day"),
    ],
  },
  {
    slug: "solar-system",
    parts: [
      P("solar-system", "सूर्य, पृथ्वी र चन्द्रको आपसी गति", "How the Sun, Earth and Moon move"),
      P("geocentric-heliocentric", "भूकेन्द्रित र सूर्यकेन्द्रित दृष्टिकोण", "Geocentric and heliocentric views"),
    ],
  },
  {
    slug: "celestial-sphere",
    parts: [
      P("celestial-sphere", "खगोलीय गोला के हो?", "What is the celestial sphere?"),
      P("celestial-equator", "आकाशीय विषुवत् रेखा", "The celestial equator"),
      P("ecliptic", "क्रान्तिवृत्त", "The ecliptic"),
      P("right-ascension", "देशान्तर र विषुवांश", "Longitude and right ascension"),
      P("coordinate-systems", "खगोलीय निर्देशाङ्कका दुई प्रमुख प्रणाली", "The two main coordinate systems"),
      P("sidereal-time", "नाक्षत्र काल र लग्न", "Sidereal time and the lagna"),
    ],
  },
  {
    slug: "sky-rotation",
    parts: [
      P("sky-rotation", "आकाश घुमेको किन देखिन्छ?", "Why does the sky appear to turn?"),
      P("zodiac-belt", "ग्रहको मार्ग र राशि पट्टी", "The planets' path and the zodiac belt"),
    ],
  },
  {
    slug: "why-seasons",
    parts: [
      /* Opens this page rather than closing "Earth and its motion": that page is the
         guided day tour, which shows the tour in place of its prose. */
      P("axial-tilt", "पृथ्वीको अक्ष झुकाव — २३.४४°", "Earth's axial tilt — 23.44°"),
      P("why-seasons", "ऋतु किन परिवर्तन हुन्छन्?", "Why do the seasons change?"),
      P("equinox-solstice", "विषुव र अयनान्त", "Equinoxes and solstices"),
      P("uttarayana-dakshinayana", "उत्तरायण र दक्षिणायनको खगोलीय अर्थ", "Uttarayana and Dakshinayana in the sky"),
      P("declination", "सूर्यको उत्तर–दक्षिण गति (क्रान्ति)", "The Sun's north–south motion (declination)"),
    ],
  },

  /* ── ३ · सौरमान, राशि र विक्रम सम्वत् ──────────────────────────── */
  {
    slug: "sayana-nirayana-year",
    parts: [
      P("solar-year", "सौर वर्ष भनेको के हो?", "What is the solar year?"),
      P("sayana-nirayana-year", "सायन र निरयन वर्ष", "The tropical and sidereal year"),
      P("tropical-year-gap", "२० मिनेटको फरक कसरी जम्मा हुन्छ?", "How the 20-minute gap builds up"),
    ],
  },
  {
    slug: "sidereal-vs-tropical",
    parts: [
      P("sidereal-vs-tropical", "एउटै आकाश, दुई राशिचक्र", "One sky, two zodiacs"),
      P("sayana-nirayana-rashi", "एउटै ग्रह, दुई राशि — र २४ दिनको ऐतिहासिक फरक", "One planet, two rashis — and the 24-day gap"),
      P("ayanamsha", "अयनांश र यसका प्रमुख प्रणाली", "The ayanamsha and its main systems"),
    ],
  },
  {
    slug: "sankranti",
    parts: [
      P("sankranti", "सङ्क्रान्ति भनेको के हो?", "What is a sankranti?"),
      P("mesha-sankranti", "मेष सङ्क्रान्ति र वैशाखको सुरुवात", "Mesha Sankranti and the start of Baisakh"),
      P("karka-sankranti", "कर्क सङ्क्रान्ति", "Karka Sankranti"),
      P("makara-sankranti", "मकर सङ्क्रान्ति", "Makara Sankranti"),
    ],
  },
  {
    slug: "year-begins-baisakh",
    parts: [
      P("year-begins-baisakh", "विक्रम सम्वत्को वर्ष वैशाखमा किन सुरु हुन्छ?", "Why the BS year begins in Baisakh"),
      P("month-lengths-apsides", "सौर महिना २९–३२ दिनका किन? — उपसौर र अपसौर", "Why solar months run 29–32 days — perihelion and aphelion"),
      P("ritu-drift", "ऋतु र निरयन महिनाको सम्बन्ध", "Seasons and the sidereal months"),
      P("uttarayana-in-calendar", "उत्तरायण र दक्षिणायनको पात्रोमा प्रयोग", "Uttarayana and Dakshinayana in the calendar"),
      P("sayana-nirayana-seasons", "ऋतु र पात्रोबीचको दीर्घकालीन अन्तर", "The long-term gap between seasons and calendar"),
    ],
  },

  /* ── ४ · चन्द्रमान ──────────────────────────────────────────────── */
  {
    slug: "lunar-month",
    parts: [
      P("moon-lunar-calendar", "चन्द्रले चान्द्र पात्रो कसरी बनाउँछ", "How the Moon makes a calendar"),
      P("lunar-month", "सांयोगिक चान्द्र मास", "The synodic lunar month"),
    ],
  },
  {
    slug: "tithi",
    parts: [
      P("tithi", "तिथि भनेको के हो?", "What is a tithi?"),
      P("tithi-not-24-hours", "तिथि र २४ घण्टाको दिनबीचको फरक", "A tithi against the 24-hour day"),
      P("shukla-krishna-paksha", "शुक्ल पक्ष र कृष्ण पक्ष", "Shukla and Krishna paksha"),
    ],
  },
  {
    slug: "adhik-kshaya-maas",
    parts: [
      P("lunar-solar-drift", "सौर र चान्द्र वर्षबीचको अन्तर", "The gap between the solar and lunar years"),
      P("adhik-kshaya-maas", "अधिक मास र क्षय मास", "The extra and the skipped month"),
    ],
  },

  /* ── ५ · पञ्चाङ्ग ───────────────────────────────────────────────── */
  {
    slug: "what-is-panchang",
    parts: [
      P("what-is-panchang", "पञ्चाङ्ग भनेको के हो?", "What is a panchanga?"),
      P("five-limbs-together", "पाँच अङ्ग एकसाथ कसरी पढ्ने?", "How to read the five limbs together"),
    ],
  },
  {
    slug: "hora",
    parts: [
      P("hora", "होरा", "Hora"),
      P("choghadiya", "चौघडिया", "Choghadiya"),
    ],
  },

  /* ── ६ · गणना ───────────────────────────────────────────────────── */
  {
    slug: "solar-longitude",
    parts: [
      P("solar-longitude", "सूर्यको वास्तविक देशान्तर", "The Sun's true longitude"),
      P("lunar-longitude", "चन्द्रको वास्तविक देशान्तर", "The Moon's true longitude"),
      P("mean-vs-true-motion", "मध्यम गति र स्पष्ट गति", "Mean motion and true motion"),
    ],
  },
  {
    slug: "calc-sunrise",
    parts: [
      P("calc-sunrise", "सूर्योदयको गणना", "Computing sunrise"),
      P("calc-sunset", "सूर्यास्त, दिनमान र सन्ध्याकाल", "Sunset, day length and twilight"),
    ],
  },
  {
    slug: "calc-tithi",
    parts: [
      P("calc-tithi", "तिथिको सङ्ख्या र समाप्ति समय", "The tithi's number and end time"),
      P("calc-nakshatra", "नक्षत्र र पदको गणना", "Computing the nakshatra and pada"),
      P("calc-yoga", "योगको गणना", "Computing the yoga"),
      P("calc-karana", "करणको गणना", "Computing the karana"),
    ],
  },
  {
    slug: "why-location-matters",
    parts: [
      P("why-location-matters", "पञ्चाङ्ग स्थाननिरपेक्ष हुँदैन", "A panchanga is not location-independent"),
      P("location-different-results", "एउटै क्षण, फरक स्थान", "One instant, different places"),
    ],
  },

  /* ── ७ · उन्नत खगोलशास्त्र ─────────────────────────────────────── */
  {
    slug: "pole-star-changes",
    parts: [
      P("pole-star-changes", "ध्रुव तारा किन परिवर्तन हुन्छ?", "Why does the pole star change?"),
      P("ancient-sky", "हजारौँ वर्षअघि आकाश कस्तो देखिन्थ्यो?", "How the sky looked thousands of years ago"),
    ],
  },
  {
    slug: "eclipses",
    parts: [
      P("rahu-ketu-nodes", "राहु, केतु र पात बिन्दु", "Rahu, Ketu and the lunar nodes"),
      P("eclipses", "सूर्यग्रहण र चन्द्रग्रहण", "Solar and lunar eclipses"),
      P("eclipse-seasons", "ग्रहण ऋतु, जोडी ग्रहण र सरोस चक्र", "Eclipse seasons, eclipse pairs and the saros"),
    ],
  },

  /* ── ८ · इतिहास र तुलना ─────────────────────────────────────────── */
  {
    slug: "calendar-differences",
    parts: [
      P("calendar-differences", "नेपाली, वैदिक र ग्रेगोरियन पात्रो", "The Nepali, Vedic and Gregorian calendars"),
      P("calendars-aligned-with-nature", "पात्रोलाई प्रकृतिसँग कसरी मिलाइन्छ", "How a calendar is kept in step with nature"),
    ],
  },
  {
    slug: "leap-years",
    parts: [
      P("leap-years", "लीप वर्ष किन आवश्यक भयो?", "Why leap years became necessary"),
      P("calendar-drift", "ग्रेगोरियन सुधार र मिति सर्ने कारण", "The Gregorian reform and why dates drift"),
    ],
  },
  {
    slug: "surya-siddhanta",
    parts: [P("history", "मयासुरको सूर्य सिद्धान्त", "Mayasura's Surya Siddhanta")],
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

/**
 * Legacy top-level slugs merged wholesale into another guide — as opposed to
 * `PART_REDIRECTS`, which is generated from the chapter list above, these are
 * topics that existed as their own page before a merge and have no chapter
 * entry to derive from. Mirrors web's `MERGED_SLUGS` map 1:1.
 */
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  "lunar-eclipse": "eclipses#eclipses",
  "solar-eclipse": "eclipses#eclipses",
  equinoxes: "why-seasons#equinox-solstice",
  solstices: "why-seasons#equinox-solstice",
  "sankranti-vs-solstice": "why-seasons#uttarayana-dakshinayana",
  "twelve-rashis": "rashi",
  "solar-vs-lunar-calendar": "bikram-sambat#bs-calendar",
  "sidereal-vs-tropical-year": "sayana-nirayana-year",
  "tithi-vriddhi": "tithi-vriddhi-kshaya",
  "tithi-kshaya": "tithi-vriddhi-kshaya",
  "adhik-maas": "adhik-kshaya-maas#adhik-kshaya-maas",
  "kshaya-maas": "adhik-kshaya-maas#adhik-kshaya-maas",
  /* Full reckonings used to sit inside the patro page and repeat the Sun and Moon guides. */
  sauramana: "sankranti",
  chandramana: "lunar-month",
  /* The sky primer repeated rashi, tithi, nakshatra, yoga and karana. The sky guide keeps the motions. */
  "astronomy-basics": "earth-rotation-day",
};

/** Every retired slug either app has ever used, in one lookup. */
export const RETIRED_SLUG_REDIRECTS: Record<string, string> = {
  ...LEGACY_SLUG_REDIRECTS,
  ...PART_REDIRECTS,
};
