import { ELEMENT_META, CEREMONY_META, elementHref } from "@/lib/panchanga-elements";
import { normalizeMobilePathname } from "@/lib/mobile-nav";

export type PanchangaSidebarItem = {
  id: string;
  href: string;
  labelNe: string;
  labelEn: string;
  blurbNe?: string;
  blurbEn?: string;
};

export type PanchangaSidebarSection = {
  id: string;
  titleNe: string;
  titleEn: string;
  items: PanchangaSidebarItem[];
};

function elementItems(kind: "span" | "table"): PanchangaSidebarItem[] {
  return ELEMENT_META.filter((e) => e.kind === kind).map((e) => ({
    id: e.id,
    href: elementHref(e.id),
    labelNe: e.titleNe,
    labelEn: e.titleEn,
    blurbNe: e.blurbNe,
    blurbEn: e.blurbEn,
  }));
}

function ceremonyItems(): PanchangaSidebarItem[] {
  return CEREMONY_META.map((c) => ({
    id: c.id,
    href: c.id === "vivah" ? "/vivah-sait" : `/sait/${c.id}`,
    labelNe: c.titleNe,
    labelEn: c.titleEn,
  }));
}

/** Panchanga screen sidebar — same sections as web drawer (no home quick-link cards). */
export const PANCHANGA_SIDEBAR_SECTIONS: PanchangaSidebarSection[] = [
  {
    id: "patro",
    titleNe: "पात्रो तथा मिति",
    titleEn: "Patro & dates",
    items: [
      { id: "holidays", href: "/holidays", labelNe: "बिदा तथा पर्व", labelEn: "Holidays" },
      { id: "converter", href: "/converter", labelNe: "रूपान्तरण", labelEn: "Converter" },
      { id: "suryakranti", href: "/suryakranti", labelNe: "सूर्यक्रान्ति", labelEn: "Sun times" },
      { id: "panchanga-year", href: "/panchanga/year", labelNe: "वार्षिक पञ्चाङ्ग चक्र", labelEn: "Annual panchanga wheel" },
      { id: "dainikkranti", href: "/dainikkranti", labelNe: "दैनिक क्रान्ति", labelEn: "Daily transits" },
      { id: "panchak-patro", href: "/panchak-patro", labelNe: "पञ्चक पात्रो", labelEn: "Panchak calendar" },
      { id: "ritu", href: "/ritu", labelNe: "ऋतु", labelEn: "Seasons" },
    ],
  },
  {
    id: "jyotish",
    titleNe: "ज्योतिष तथा मुहूर्त",
    titleEn: "Jyotish & muhurta",
    items: [
      { id: "avakahada", href: "/panchanga/avakahada-chakra", labelNe: "अवकहडा चक्र", labelEn: "Avakahada chakra" },
      { id: "abhijit", href: "/abhijit-muhurta", labelNe: "अभिजित् मुहूर्त", labelEn: "Abhijit muhurta" },
      { id: "kundali", href: "/kundali", labelNe: "जन्मकुण्डली निर्माण", labelEn: "Birth chart builder" },
      { id: "kundali-milan", href: "/jyotish/kundali-milan", labelNe: "कुण्डली मिलान", labelEn: "Chart matching" },
    ],
  },
  {
    id: "spans",
    titleNe: "संक्रमण तत्त्व",
    titleEn: "Transition elements",
    items: elementItems("span"),
  },
  {
    id: "graha",
    titleNe: "ग्रह विवरण",
    titleEn: "Planet details",
    items: [
      {
        id: "gochar",
        href: "/gochar",
        labelNe: "गोचर",
        labelEn: "Gochar",
        blurbNe: "ग्रह गोचर र प्रवेश",
        blurbEn: "Transits & ingress",
      },
      { id: "graha-asta", href: "/panchanga/graha-asta", labelNe: "ग्रह अस्त", labelEn: "Heliacal set" },
      { id: "graha-vakri", href: "/panchanga/graha-vakri", labelNe: "ग्रह वक्री", labelEn: "Retrograde" },
      { id: "chandra-grahan", href: "/panchanga/chandra-grahan", labelNe: "चन्द्र ग्रहण", labelEn: "Lunar eclipse" },
      { id: "surya-grahan", href: "/panchanga/surya-grahan", labelNe: "सूर्य ग्रहण", labelEn: "Solar eclipse" },
    ],
  },
  {
    id: "tables",
    titleNe: "दैनिक तालिका",
    titleEn: "Daily tables",
    items: elementItems("table"),
  },
  {
    id: "sait",
    titleNe: "शुभ मुहूर्त",
    titleEn: "Auspicious muhurta",
    items: ceremonyItems(),
  },
];

export function isPanchangaSidebarItemActive(pathname: string, item: PanchangaSidebarItem): boolean {
  pathname = normalizeMobilePathname(pathname);
  if (item.id === "kundali") {
    return pathname === "/kundali" || pathname.startsWith("/kundali/");
  }
  if (item.id === "kundali-milan") {
    return pathname === "/kundali-milan" || pathname === "/jyotish/kundali-milan";
  }
  if (item.href === "/") return pathname === "/" || pathname === "/index";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActivePanchangaSidebarSection(pathname: string): string | null {
  for (const section of PANCHANGA_SIDEBAR_SECTIONS) {
    if (section.items.some((item) => isPanchangaSidebarItemActive(pathname, item))) {
      return section.id;
    }
  }
  return null;
}
