import type { DrawerIconName } from "@/lib/drawer-icons";

/** All public routes aligned with vedicpatro.com sitemap. Icons match the web drawer (Lucide). */
export type SitemapRoute = {
  path: string;
  ne: string;
  en: string;
  icon: DrawerIconName;
  group: "main" | "panchanga" | "jyotish" | "learn" | "sait" | "tools";
};

export const SITEMAP_ROUTES: SitemapRoute[] = [
  { path: "/", ne: "गृह", en: "Home", icon: "home", group: "main" },
  { path: "/panchanga", ne: "पञ्चाङ्ग", en: "Panchanga", icon: "star", group: "main" },
  { path: "/panchanga/year", ne: "वार्षिक चक्र", en: "Year wheel", icon: "calendar-range", group: "panchanga" },
  { path: "/panchanga/details", ne: "पञ्चाङ्ग विवरण", en: "Panchanga details", icon: "grid-3x3", group: "panchanga" },
  { path: "/panchanga/avakahada-chakra", ne: "अवकहडा चक्र", en: "Avakahada", icon: "grid-3x3", group: "panchanga" },
  { path: "/gochar", ne: "गोचर", en: "Gochar", icon: "route", group: "panchanga" },
  { path: "/aakash-gochar", ne: "३D आकाश गोचर", en: "3D Aakash Gochar", icon: "orbit", group: "panchanga" },
  { path: "/panchanga/graha-asta", ne: "ग्रह अस्त", en: "Heliacal set", icon: "sunrise", group: "panchanga" },
  { path: "/panchanga/graha-vakri", ne: "ग्रह वक्री", en: "Retrograde", icon: "rotate-ccw", group: "panchanga" },
  { path: "/panchanga/surya-grahan", ne: "सूर्य ग्रहण", en: "Solar eclipse", icon: "eclipse", group: "panchanga" },
  { path: "/panchanga/chandra-grahan", ne: "चन्द्र ग्रहण", en: "Lunar eclipse", icon: "moon-star", group: "panchanga" },
  { path: "/dainikkranti", ne: "दैनिक क्रान्ति", en: "Daily transit", icon: "moon", group: "main" },
  { path: "/shanti-vidhi", ne: "शान्ति विधि", en: "Shanti vidhi", icon: "flower-2", group: "tools" },
  { path: "/converter", ne: "रूपान्तरण", en: "Converter", icon: "arrow-left-right", group: "tools" },
  { path: "/holidays", ne: "बिदा", en: "Holidays", icon: "party-popper", group: "tools" },
  { path: "/ritu", ne: "ऋतु", en: "Seasons", icon: "sprout", group: "tools" },
  { path: "/kundali", ne: "कुण्डली", en: "Kundali", icon: "sparkles", group: "jyotish" },
  { path: "/rashifal", ne: "राशिफल", en: "Rashifal", icon: "sun", group: "jyotish" },
  { path: "/jyotish/rashifal", ne: "राशिफल (ज्योतिष)", en: "Rashifal (Jyotish)", icon: "sun", group: "jyotish" },
  { path: "/jyotish/kundali-milan", ne: "कुण्डली मिलान", en: "Kundali milan", icon: "heart", group: "jyotish" },
  { path: "/vastu", ne: "वास्तु", en: "Vastu", icon: "compass", group: "tools" },
  { path: "/learn", ne: "सिकाइ", en: "Learn", icon: "book-open", group: "learn" },
  { path: "/documents", ne: "ई-पाठ", en: "Documents", icon: "file-text", group: "tools" },
  { path: "/suryakranti", ne: "सूर्यक्रान्ति", en: "Sun times", icon: "sunrise", group: "panchanga" },
  { path: "/abhijit-muhurta", ne: "अभिजित्", en: "Abhijit", icon: "sparkles", group: "panchanga" },
  { path: "/panchak-patro", ne: "पञ्चक", en: "Panchak", icon: "calendar-clock", group: "panchanga" },
  { path: "/vivah-sait", ne: "विवाह साइत", en: "Marriage muhurta", icon: "heart-handshake", group: "sait" },
];

/** The 12 published Learn guides — mirrors `LEARN_LIBRARY`'s reading order. */
export const SITEMAP_LEARN_SLUGS = [
  "bikram-sambat",
  "what-is-panchang",
  "earth-rotation-day",
  "axial-tilt",
  "rashi",
  "sidereal-vs-tropical",
  "lunar-month",
  "tithi",
  "five-limbs-together",
  "how-we-calculate",
  "geocentric-heliocentric",
  "calendar-differences",
] as const;

export const SITEMAP_ELEMENT_IDS = [
  "tithi",
  "nakshatra",
  "yoga",
  "karana",
  "chandra-rashi",
  "choghadiya",
  "hora",
  "lagna",
  "chandrabala",
  "tarabala",
  "panchaka-rahita",
  "pushkara",
] as const;

export const SITEMAP_SAIT_CATEGORIES = [
  "vivah",
  "bratabandha",
  "griha-aarambha",
  "griha-pravesh",
  "byaparik-pratisthan",
  "rudri-jurne",
  "agni-jurne",
  "annaprasan",
] as const;
