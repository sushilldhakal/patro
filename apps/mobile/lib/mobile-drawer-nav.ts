import { elementBlurb, elementTitle } from "@vedic-patro/domain/panchanga-i18n";
import { translateKey } from "@vedic-patro/domain/locale";
import { CEREMONY_META, ELEMENT_META } from "@vedic-patro/domain/panchanga-elements";
import { elementHref } from "@/lib/element-routes";
import { resolveDrawerIcon, type DrawerIconName } from "@/lib/drawer-icons";
import { tFor } from "@vedic-patro/i18n/runtime";

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
  { id: "holidays", href: "/holidays", get labelNe() { return tFor("ne", "nav.holidays"); }, get labelEn() { return tFor("en", "nav.holidays"); }, icon: resolveDrawerIcon("patro", "holidays") },
  { id: "converter", href: "/converter", get labelNe() { return tFor("ne", "nav.converter"); }, get labelEn() { return tFor("en", "nav.converter"); }, icon: resolveDrawerIcon("patro", "converter") },
  { id: "suryakranti", href: "/suryakranti", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.sun_times"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.sun_times"); }, icon: resolveDrawerIcon("patro", "suryakranti") },
  { id: "panchak-patro", href: "/panchak-patro", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.panchak"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.panchak"); }, icon: resolveDrawerIcon("patro", "panchak-patro") },
  { id: "ritu", href: "/ritu", get labelNe() { return tFor("ne", "sidebar_nav.items.ritu.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.ritu.label"); }, icon: resolveDrawerIcon("patro", "ritu") },
  { id: "reminders", href: "/reminders", get labelNe() { return tFor("ne", "ui.reminders.reminders"); }, get labelEn() { return tFor("en", "ui.reminders.reminders"); }, icon: "calendar-clock" },
];

const jyotishItems: DrawerNavItem[] = [
  { id: "avakahada", href: "/panchanga/avakahada-chakra", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.avakahada"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.avakahada"); }, icon: resolveDrawerIcon("jyotish", "avakahada") },
  { id: "abhijit", href: "/abhijit-muhurta", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.abhijit"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.abhijit"); }, icon: resolveDrawerIcon("jyotish", "abhijit") },
];

const grahaItems: DrawerNavItem[] = [
  { id: "aakash-gochar", href: "/aakash-gochar", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.n_3_d_sky_gochar"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.n_3_d_sky_gochar"); }, icon: resolveDrawerIcon("graha", "aakash-gochar") },
  { id: "gochar", href: "/gochar", get labelNe() { return tFor("ne", "ui.gochar.gochar"); }, get labelEn() { return tFor("en", "ui.gochar.gochar"); }, icon: resolveDrawerIcon("graha", "gochar") },
  { id: "graha-asta", href: "/panchanga/graha-asta", get labelNe() { return tFor("ne", "sidebar_nav.items.graha-asta.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.graha-asta.label"); }, icon: resolveDrawerIcon("graha", "graha-asta") },
  { id: "graha-vakri", href: "/panchanga/graha-vakri", get labelNe() { return tFor("ne", "sidebar_nav.items.graha-vakri.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.graha-vakri.label"); }, icon: resolveDrawerIcon("graha", "graha-vakri") },
  { id: "chandra-grahan", href: "/panchanga/chandra-grahan", get labelNe() { return tFor("ne", "graha_pages.eclipse_lunar.title"); }, get labelEn() { return tFor("en", "graha_pages.eclipse_lunar.title"); }, icon: resolveDrawerIcon("graha", "chandra-grahan") },
  { id: "surya-grahan", href: "/panchanga/surya-grahan", get labelNe() { return tFor("ne", "graha_pages.eclipse_solar.title"); }, get labelEn() { return tFor("en", "graha_pages.eclipse_solar.title"); }, icon: resolveDrawerIcon("graha", "surya-grahan") },
];

function elementItems(kind: "span" | "table"): DrawerNavItem[] {
  const section = kind === "span" ? "spans" : "tables";
  return ELEMENT_META.filter((e) => e.kind === kind).map((e) => ({
    id: e.id,
    href: elementHref(e.id),
    labelNe: elementTitle(e.id, "ne"),
    labelEn: elementTitle(e.id, "en"),
    icon: resolveDrawerIcon(section, e.id),
  }));
}

function saitItems(): DrawerNavItem[] {
  return CEREMONY_META.map((c) => ({
    id: c.id,
    href: c.id === "vivah" ? "/vivah-sait" : `/sait/${c.id}`,
    labelNe: translateKey(`sait.categories.${c.id}`, "ne"),
    labelEn: translateKey(`sait.categories.${c.id}`, "en"),
    icon: resolveDrawerIcon("sait", c.id),
  }));
}

/** Drawer sections — mirrors web `MobileNavMenu` + sidebar sections. */
export function getMobileDrawerSections(): DrawerNavSection[] {
  return [
    { id: "patro", titleNe: tFor("ne", "sidebar_nav.sections.patro.title"), titleEn: tFor("en", "sidebar_nav.sections.patro.title"), items: patroItems },
    { id: "jyotish", titleNe: tFor("ne", "ui.mobile_drawer_nav.jyotish_muhurta"), titleEn: tFor("en", "ui.mobile_drawer_nav.jyotish_muhurta"), items: jyotishItems },
    { id: "spans", titleNe: tFor("ne", "ui.mobile_drawer_nav.transition_elements"), titleEn: tFor("en", "ui.mobile_drawer_nav.transition_elements"), items: elementItems("span") },
    { id: "graha", titleNe: tFor("ne", "sidebar_nav.sections.graha.title"), titleEn: tFor("en", "sidebar_nav.sections.graha.title"), items: grahaItems },
    { id: "tables", titleNe: tFor("ne", "sidebar_nav.sections.tables.title"), titleEn: tFor("en", "sidebar_nav.sections.tables.title"), items: elementItems("table") },
    { id: "sait", titleNe: tFor("ne", "ui.mobile_drawer_nav.auspicious_muhurta"), titleEn: tFor("en", "ui.mobile_drawer_nav.auspicious_muhurta"), items: saitItems() },
  ];
}

export const DRAWER_MAIN_LINKS: DrawerNavItem[] = [
  { id: "home", href: "/", get labelNe() { return tFor("ne", "ui.mobile_bottom_nav.home"); }, get labelEn() { return tFor("en", "ui.mobile_bottom_nav.home"); }, icon: resolveDrawerIcon("main", "home") },
  { id: "panchanga", href: "/panchanga", get labelNe() { return tFor("ne", "ui.mobile_drawer_nav.panchanga"); }, get labelEn() { return tFor("en", "ui.mobile_drawer_nav.panchanga"); }, icon: resolveDrawerIcon("main", "panchanga") },
  { id: "kundali", href: "/kundali", get labelNe() { return tFor("ne", "sidebar_nav.items.kundali.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.kundali.label"); }, icon: resolveDrawerIcon("jyotish", "kundali") },
  { id: "dainikkranti", href: "/dainikkranti", get labelNe() { return tFor("ne", "nav.dainikkranti"); }, get labelEn() { return tFor("en", "nav.dainikkranti"); }, icon: resolveDrawerIcon("patro", "dainikkranti") },
  { id: "kundali-milan", href: "/jyotish/kundali-milan", get labelNe() { return tFor("ne", "sidebar_nav.items.kundali-milan.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.kundali-milan.label"); }, icon: resolveDrawerIcon("jyotish", "kundali-milan") },
  { id: "rashifal", href: "/rashifal", get labelNe() { return tFor("ne", "nav.jyotish_rashifal"); }, get labelEn() { return tFor("en", "nav.jyotish_rashifal"); }, icon: resolveDrawerIcon("jyotish", "rashifal") },
  { id: "panchanga-year", href: "/panchanga/year", get labelNe() { return tFor("ne", "sidebar_nav.items.panchanga-year.label"); }, get labelEn() { return tFor("en", "sidebar_nav.items.panchanga-year.label"); }, icon: resolveDrawerIcon("patro", "panchanga-year") },
  { id: "vastu", href: "/vastu", get labelNe() { return tFor("ne", "nav.vastu"); }, get labelEn() { return tFor("en", "nav.vastu"); }, icon: resolveDrawerIcon("main", "vastu") },
  { id: "learn", href: "/learn", get labelNe() { return tFor("ne", "nav.learn"); }, get labelEn() { return tFor("en", "nav.learn"); }, icon: resolveDrawerIcon("main", "learn") },
  { id: "documents", href: "/documents", get labelNe() { return tFor("ne", "nav.documents"); }, get labelEn() { return tFor("en", "nav.documents"); }, icon: resolveDrawerIcon("main", "documents") },
  { id: "shanti", href: "/shanti-vidhi", get labelNe() { return tFor("ne", "nav.shanti_vidhi"); }, get labelEn() { return tFor("en", "nav.shanti_vidhi"); }, icon: resolveDrawerIcon("main", "shanti") },
  { id: "more", href: "/more", get labelNe() { return tFor("ne", "ui.more.more"); }, get labelEn() { return tFor("en", "ui.more.more"); }, icon: resolveDrawerIcon("main", "more") },
];
