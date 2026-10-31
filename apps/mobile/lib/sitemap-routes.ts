import type { DrawerIconName } from "@/lib/drawer-icons";
import { tFor } from "@vedic-patro/i18n/runtime";

/** All public routes aligned with vedicpatro.com sitemap. Icons match the web drawer (Lucide). */
export type SitemapRoute = {
  path: string;
  ne: string;
  en: string;
  icon: DrawerIconName;
  group: "main" | "panchanga" | "jyotish" | "learn" | "sait" | "tools";
};

export const SITEMAP_ROUTES: SitemapRoute[] = [
  { path: "/", get ne() { return tFor("ne", "ui.mobile_bottom_nav.home"); }, get en() { return tFor("en", "ui.mobile_bottom_nav.home"); }, icon: "house", group: "main" },
  { path: "/panchanga", get ne() { return tFor("ne", "learn.diagrams.hierarchy_converge"); }, get en() { return tFor("en", "learn.diagrams.hierarchy_converge"); }, icon: "scroll-text", group: "main" },
  { path: "/panchanga/year", get ne() { return tFor("ne", "ui.sitemap_routes.year_wheel"); }, get en() { return tFor("en", "ui.sitemap_routes.year_wheel"); }, icon: "chart-pie", group: "panchanga" },
  { path: "/panchanga/details", get ne() { return tFor("ne", "ui.panchanga.panchanga_details"); }, get en() { return tFor("en", "ui.panchanga.panchanga_details"); }, icon: "calendar-days", group: "panchanga" },
  { path: "/panchanga/avakahada-chakra", get ne() { return tFor("ne", "ui.mobile_drawer_nav.avakahada"); }, get en() { return tFor("en", "ui.mobile_drawer_nav.avakahada"); }, icon: "grid-3x3", group: "panchanga" },
  { path: "/gochar", get ne() { return tFor("ne", "ui.gochar.gochar"); }, get en() { return tFor("en", "ui.gochar.gochar"); }, icon: "route", group: "panchanga" },
  { path: "/aakash-gochar", get ne() { return tFor("ne", "sidebar_nav.items.aakash-gochar.label"); }, get en() { return tFor("en", "sidebar_nav.items.aakash-gochar.label"); }, icon: "orbit", group: "panchanga" },
  { path: "/panchanga/graha-asta", get ne() { return tFor("ne", "sidebar_nav.items.graha-asta.label"); }, get en() { return tFor("en", "sidebar_nav.items.graha-asta.label"); }, icon: "eye-off", group: "panchanga" },
  { path: "/panchanga/graha-vakri", get ne() { return tFor("ne", "sidebar_nav.items.graha-vakri.label"); }, get en() { return tFor("en", "sidebar_nav.items.graha-vakri.label"); }, icon: "rotate-ccw", group: "panchanga" },
  { path: "/panchanga/surya-grahan", get ne() { return tFor("ne", "graha_pages.eclipse_solar.title"); }, get en() { return tFor("en", "graha_pages.eclipse_solar.title"); }, icon: "eclipse", group: "panchanga" },
  { path: "/panchanga/chandra-grahan", get ne() { return tFor("ne", "graha_pages.eclipse_lunar.title"); }, get en() { return tFor("en", "graha_pages.eclipse_lunar.title"); }, icon: "sun-moon", group: "panchanga" },
  { path: "/dainikkranti", get ne() { return tFor("ne", "nav.dainikkranti"); }, get en() { return tFor("en", "nav.dainikkranti"); }, icon: "moon", group: "main" },
  { path: "/shanti-vidhi", get ne() { return tFor("ne", "nav.shanti_vidhi"); }, get en() { return tFor("en", "nav.shanti_vidhi"); }, icon: "flower-2", group: "tools" },
  { path: "/converter", get ne() { return tFor("ne", "nav.converter"); }, get en() { return tFor("en", "nav.converter"); }, icon: "calendar-sync", group: "tools" },
  { path: "/holidays", get ne() { return tFor("ne", "ui.sitemap_routes.holidays"); }, get en() { return tFor("en", "ui.sitemap_routes.holidays"); }, icon: "calendar-heart", group: "tools" },
  { path: "/ritu", get ne() { return tFor("ne", "sidebar_nav.items.ritu.label"); }, get en() { return tFor("en", "sidebar_nav.items.ritu.label"); }, icon: "leaf", group: "tools" },
  { path: "/brahma-mana", get ne() { return tFor("ne", "sidebar_nav.items.brahma-mana.label"); }, get en() { return tFor("en", "sidebar_nav.items.brahma-mana.label"); }, icon: "hourglass", group: "tools" },
  { path: "/kundali", get ne() { return tFor("ne", "nav.jyotish_kundali"); }, get en() { return tFor("en", "nav.jyotish_kundali"); }, icon: "sparkles", group: "jyotish" },
  { path: "/rashifal", get ne() { return tFor("ne", "nav.jyotish_rashifal"); }, get en() { return tFor("en", "nav.jyotish_rashifal"); }, icon: "sun", group: "jyotish" },
  { path: "/jyotish/kundali-milan", get ne() { return tFor("ne", "home_quick.kundali_milan_title"); }, get en() { return tFor("en", "home_quick.kundali_milan_title"); }, icon: "heart", group: "jyotish" },
  { path: "/vastu", get ne() { return tFor("ne", "nav.vastu"); }, get en() { return tFor("en", "nav.vastu"); }, icon: "compass", group: "tools" },
  { path: "/learn", get ne() { return tFor("ne", "nav.learn"); }, get en() { return tFor("en", "nav.learn"); }, icon: "book-open", group: "learn" },
  { path: "/documents", get ne() { return tFor("ne", "nav.documents"); }, get en() { return tFor("en", "nav.documents"); }, icon: "file-text", group: "tools" },
  { path: "/suryakranti", get ne() { return tFor("ne", "ui.mobile_drawer_nav.sun_times"); }, get en() { return tFor("en", "ui.mobile_drawer_nav.sun_times"); }, icon: "sunrise", group: "panchanga" },
  { path: "/abhijit-muhurta", get ne() { return tFor("ne", "ui.sitemap_routes.abhijit"); }, get en() { return tFor("en", "ui.sitemap_routes.abhijit"); }, icon: "timer", group: "panchanga" },
  { path: "/panchak-patro", get ne() { return tFor("ne", "ui.sitemap_routes.panchak"); }, get en() { return tFor("en", "ui.sitemap_routes.panchak"); }, icon: "calendar-x", group: "panchanga" },
  { path: "/adhik-maas", get ne() { return tFor("ne", "sidebar_nav.items.adhik-maas.label"); }, get en() { return tFor("en", "sidebar_nav.items.adhik-maas.label"); }, icon: "calendar-plus", group: "panchanga" },
  { path: "/vivah-sait", get ne() { return tFor("ne", "ui.sitemap_routes.marriage_muhurta"); }, get en() { return tFor("en", "ui.sitemap_routes.marriage_muhurta"); }, icon: "heart-handshake", group: "sait" },
];

/** Published Learn guides — mirrors `LEARN_LIBRARY`'s reading order. */
export const SITEMAP_LEARN_SLUGS = [
  "bikram-sambat",
  "earth-rotation-day",
  "solar-system",
  "celestial-sphere",
  "sky-rotation",
  "why-seasons",
  "sayana-nirayana-year",
  "rashi",
  "sidereal-vs-tropical",
  "sankranti",
  "year-begins-baisakh",
  "lunar-month",
  "tithi",
  "amavasya-purnima",
  "adhik-kshaya-maas",
  "what-is-panchang",
  "tithi-vriddhi-kshaya",
  "nakshatra",
  "yoga",
  "karana",
  "vara",
  "hora",
  "time-scales",
  "solar-longitude",
  "calc-sunrise",
  "calc-moonrise",
  "calc-tithi",
  "calc-sankranti",
  "why-location-matters",
  "gochar-eclipse-calc",
  "how-we-calculate",
  "retrograde-motion",
  "precession",
  "pole-star-changes",
  "eclipses",
  "ancient-planetary-motion",
  "calendar-differences",
  "leap-years",
  "surya-siddhanta",
  "ancient-calendars",
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
