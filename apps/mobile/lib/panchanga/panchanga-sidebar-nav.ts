import { elementBlurb, elementTitle } from "@vedic-patro/domain/panchanga-i18n";
import { translateKey } from "@vedic-patro/domain/locale";
import { ELEMENT_META, CEREMONY_META } from "@vedic-patro/domain/panchanga-elements";
import { elementHref } from "@/lib/element-routes";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { tFor } from "@vedic-patro/i18n/runtime";

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
    labelNe: elementTitle(e.id, "ne"),
    labelEn: elementTitle(e.id, "en"),
    blurbNe: elementBlurb(e.id, "ne"),
    blurbEn: elementBlurb(e.id, "en"),
  }));
}

function ceremonyItems(): PanchangaSidebarItem[] {
  return CEREMONY_META.map((c) => ({
    id: c.id,
    href: c.id === "vivah" ? "/vivah-sait" : `/sait/${c.id}`,
    labelNe: translateKey(`sait.categories.${c.id}`, "ne"),
    labelEn: translateKey(`sait.categories.${c.id}`, "en"),
  }));
}

/** Panchanga screen sidebar — same sections as web drawer (no home quick-link cards). */
export const PANCHANGA_SIDEBAR_SECTIONS: PanchangaSidebarSection[] = [
  {
    id: "patro",
    get titleNe() { return tFor("ne", "sidebar_nav.sections.patro.title"); },
    get titleEn() { return tFor("en", "sidebar_nav.sections.patro.title"); },
    items: [
      { id: "holidays", href: "/holidays", get labelNe() { return tFor("ne", "nav.holidays"); }, get labelEn() { return tFor("en", "nav.holidays"); } },
      { id: "converter", href: "/converter", get labelNe() { return tFor("ne", "nav.converter"); }, get labelEn() { return tFor("en", "nav.converter"); } },
      { id: "suryakranti", href: "/suryakranti", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.sun_times"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.sun_times"); } },
      { id: "panchanga-year", href: "/panchanga/year", get labelNe() { return tFor("ne", "ui.panchanga.annual_panchanga_wheel"); }, get labelEn() { return tFor("en", "ui.panchanga.annual_panchanga_wheel"); } },
      { id: "dainikkranti", href: "/dainikkranti", get labelNe() { return tFor("ne", "sidebar_nav.items.dainikkranti.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.dainikkranti.label"); } },
      { id: "panchak-patro", href: "/panchak-patro", get labelNe() { return tFor("ne", "sidebar_nav.items.panchak-patro.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.panchak-patro.label"); } },
      { id: "ritu", href: "/ritu", get labelNe() { return tFor("ne", "sidebar_nav.items.ritu.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.ritu.label"); } },
      { id: "reminders", href: "/reminders", get labelNe() { return tFor("ne", "ui.reminders.reminders"); }, get labelEn() { return tFor("en", "ui.reminders.reminders"); } },
    ],
  },
  {
    id: "jyotish",
    get titleNe() { return tFor("ne", "ui.mobile_drawer_nav.jyotish_muhurta"); },
    get titleEn() { return tFor("en", "ui.mobile_drawer_nav.jyotish_muhurta"); },
    items: [
      { id: "avakahada", href: "/panchanga/avakahada-chakra", get labelNe() { return tFor("ne", "sidebar_nav.items.avakahada.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.avakahada.label"); } },
      { id: "abhijit", href: "/abhijit-muhurta", get labelNe() { return tFor("ne", "ui.panchanga.abhijit_muhurta"); }, get labelEn() { return tFor("en", "ui.panchanga.abhijit_muhurta"); } },
      { id: "kundali", href: "/kundali", get labelNe() { return tFor("ne", "sidebar_nav.items.kundali.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.kundali.label"); } },
      { id: "kundali-milan", href: "/jyotish/kundali-milan", get labelNe() { return tFor("ne", "sidebar_nav.items.kundali-milan.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.kundali-milan.label"); } },
    ],
  },
  {
    id: "spans",
    get titleNe() { return tFor("ne", "ui.mobile_drawer_nav.transition_elements"); },
    get titleEn() { return tFor("en", "ui.mobile_drawer_nav.transition_elements"); },
    items: elementItems("span"),
  },
  {
    id: "graha",
    get titleNe() { return tFor("ne", "sidebar_nav.sections.graha.title"); },
    get titleEn() { return tFor("en", "sidebar_nav.sections.graha.title"); },
    items: [
      {
        id: "gochar",
        href: "/gochar",
        get labelNe() { return tFor("ne", "ui.gochar.gochar"); },
        get labelEn() { return tFor("en", "ui.gochar.gochar"); },
        get blurbNe() { return tFor("ne", "ui.panchanga.transits_ingress"); },
        get blurbEn() { return tFor("en", "ui.panchanga.transits_ingress"); },
      },
      { id: "graha-asta", href: "/panchanga/graha-asta", get labelNe() { return tFor("ne", "sidebar_nav.items.graha-asta.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.graha-asta.label"); } },
      { id: "graha-vakri", href: "/panchanga/graha-vakri", get labelNe() { return tFor("ne", "sidebar_nav.items.graha-vakri.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.graha-vakri.label"); } },
      { id: "chandra-grahan", href: "/panchanga/chandra-grahan", get labelNe() { return tFor("ne", "graha_pages.eclipse_lunar.title"); }, get labelEn() { return tFor("en", "graha_pages.eclipse_lunar.title"); } },
      { id: "surya-grahan", href: "/panchanga/surya-grahan", get labelNe() { return tFor("ne", "graha_pages.eclipse_solar.title"); }, get labelEn() { return tFor("en", "graha_pages.eclipse_solar.title"); } },
    ],
  },
  {
    id: "tables",
    get titleNe() { return tFor("ne", "sidebar_nav.sections.tables.title"); },
    get titleEn() { return tFor("en", "sidebar_nav.sections.tables.title"); },
    items: elementItems("table"),
  },
  {
    id: "sait",
    get titleNe() { return tFor("ne", "ui.mobile_drawer_nav.auspicious_muhurta"); },
    get titleEn() { return tFor("en", "ui.mobile_drawer_nav.auspicious_muhurta"); },
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
