import { CEREMONY_META, ELEMENT_META, elementHref } from "@/lib/panchanga-elements";
import { resolveDrawerIcon, type DrawerIconName } from "@/lib/drawer-icons";

export type DrawerNavItem = {
  id: string;
  href: string;
  labelNe: string;
  labelEn: string;
  icon: DrawerIconName;
};

export type DrawerNavSection = {
  id: string;
  titleNe: string;
  titleEn: string;
  items: DrawerNavItem[];
};

const patroItems: DrawerNavItem[] = [
  { id: "holidays", href: "/holidays", labelNe: "बिदा तथा पर्व", labelEn: "Holidays", icon: resolveDrawerIcon("patro", "holidays") },
  { id: "converter", href: "/converter", labelNe: "रूपान्तरण", labelEn: "Converter", icon: resolveDrawerIcon("patro", "converter") },
  { id: "suryakranti", href: "/suryakranti", labelNe: "सूर्यक्रान्ति", labelEn: "Sun times", icon: resolveDrawerIcon("patro", "suryakranti") },
  { id: "panchak-patro", href: "/panchak-patro", labelNe: "पञ्चक पात्रो", labelEn: "Panchak", icon: resolveDrawerIcon("patro", "panchak-patro") },
  { id: "ritu", href: "/ritu", labelNe: "ऋतु", labelEn: "Seasons", icon: resolveDrawerIcon("patro", "ritu") },
];

const jyotishItems: DrawerNavItem[] = [
  { id: "avakahada", href: "/panchanga/avakahada-chakra", labelNe: "अवकहडा चक्र", labelEn: "Avakahada", icon: resolveDrawerIcon("jyotish", "avakahada") },
  { id: "abhijit", href: "/abhijit-muhurta", labelNe: "अभिजित् मुहूर्त", labelEn: "Abhijit", icon: resolveDrawerIcon("jyotish", "abhijit") },
];

const grahaItems: DrawerNavItem[] = [
  { id: "aakash-gochar", href: "/aakash-gochar", labelNe: "३D आकाश गोचर", labelEn: "3D sky gochar", icon: resolveDrawerIcon("graha", "aakash-gochar") },
  { id: "gochar", href: "/gochar", labelNe: "गोचर", labelEn: "Gochar", icon: resolveDrawerIcon("graha", "gochar") },
  { id: "graha-asta", href: "/panchanga/graha-asta", labelNe: "ग्रह अस्त", labelEn: "Heliacal set", icon: resolveDrawerIcon("graha", "graha-asta") },
  { id: "graha-vakri", href: "/panchanga/graha-vakri", labelNe: "ग्रह वक्री", labelEn: "Retrograde", icon: resolveDrawerIcon("graha", "graha-vakri") },
  { id: "chandra-grahan", href: "/panchanga/chandra-grahan", labelNe: "चन्द्र ग्रहण", labelEn: "Lunar eclipse", icon: resolveDrawerIcon("graha", "chandra-grahan") },
  { id: "surya-grahan", href: "/panchanga/surya-grahan", labelNe: "सूर्य ग्रहण", labelEn: "Solar eclipse", icon: resolveDrawerIcon("graha", "surya-grahan") },
];

function elementItems(kind: "span" | "table"): DrawerNavItem[] {
  const section = kind === "span" ? "spans" : "tables";
  return ELEMENT_META.filter((e) => e.kind === kind).map((e) => ({
    id: e.id,
    href: elementHref(e.id),
    labelNe: e.titleNe,
    labelEn: e.titleEn,
    icon: resolveDrawerIcon(section, e.id),
  }));
}

function saitItems(): DrawerNavItem[] {
  return CEREMONY_META.map((c) => ({
    id: c.id,
    href: c.id === "vivah" ? "/vivah-sait" : `/sait/${c.id}`,
    labelNe: c.titleNe,
    labelEn: c.titleEn,
    icon: resolveDrawerIcon("sait", c.id),
  }));
}

/** Drawer sections — mirrors web `MobileNavMenu` + sidebar sections. */
export function getMobileDrawerSections(): DrawerNavSection[] {
  return [
    { id: "patro", titleNe: "पात्रो तथा मिति", titleEn: "Patro & dates", items: patroItems },
    { id: "jyotish", titleNe: "ज्योतिष तथा मुहूर्त", titleEn: "Jyotish & muhurta", items: jyotishItems },
    { id: "spans", titleNe: "संक्रमण तत्त्व", titleEn: "Transition elements", items: elementItems("span") },
    { id: "graha", titleNe: "ग्रह विवरण", titleEn: "Planet details", items: grahaItems },
    { id: "tables", titleNe: "दैनिक तालिका", titleEn: "Daily tables", items: elementItems("table") },
    { id: "sait", titleNe: "शुभ मुहूर्त", titleEn: "Auspicious muhurta", items: saitItems() },
  ];
}

export const DRAWER_MAIN_LINKS: DrawerNavItem[] = [
  { id: "home", href: "/", labelNe: "गृह", labelEn: "Home", icon: resolveDrawerIcon("main", "home") },
  { id: "panchanga", href: "/panchanga", labelNe: "सूर्य पञ्चाङ्ग", labelEn: "Panchanga", icon: resolveDrawerIcon("main", "panchanga") },
  { id: "kundali", href: "/kundali", labelNe: "जन्मकुण्डली निर्माण", labelEn: "Birth chart builder", icon: resolveDrawerIcon("jyotish", "kundali") },
  { id: "dainikkranti", href: "/dainikkranti", labelNe: "दैनिक क्रान्ति", labelEn: "Daily transit", icon: resolveDrawerIcon("patro", "dainikkranti") },
  { id: "kundali-milan", href: "/jyotish/kundali-milan", labelNe: "कुण्डली मिलान", labelEn: "Chart matching", icon: resolveDrawerIcon("jyotish", "kundali-milan") },
  { id: "rashifal", href: "/rashifal", labelNe: "राशिफल", labelEn: "Rashifal", icon: resolveDrawerIcon("jyotish", "rashifal") },
  { id: "panchanga-year", href: "/panchanga/year", labelNe: "वार्षिक पञ्चाङ्ग चक्र", labelEn: "Annual almanac wheel", icon: resolveDrawerIcon("patro", "panchanga-year") },
  { id: "vastu", href: "/vastu", labelNe: "वास्तु", labelEn: "Vastu", icon: resolveDrawerIcon("main", "vastu") },
  { id: "learn", href: "/learn", labelNe: "सिकाइ", labelEn: "Learn", icon: resolveDrawerIcon("main", "learn") },
  { id: "documents", href: "/documents", labelNe: "ई-पाठ", labelEn: "Documents", icon: resolveDrawerIcon("main", "documents") },
  { id: "shanti", href: "/shanti-vidhi", labelNe: "शान्ति विधि", labelEn: "Shanti vidhi", icon: resolveDrawerIcon("main", "shanti") },
  { id: "more", href: "/more", labelNe: "थप", labelEn: "More", icon: resolveDrawerIcon("main", "more") },
];
