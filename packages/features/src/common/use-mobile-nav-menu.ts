/**
 * The navigation drawer's link tiles, shared by the website's
 * `components/MobileNavMenu.tsx` and the app's
 * `components/navigation/MobileNavMenu.tsx`: the Main row, then the sidebar
 * sections (without what Main already promoted), each item with its label.
 * Each app turns an item into its own link, icon and search params.
 */
import { useLocale } from "@vedic-patro/i18n/react";
import {
  getPanchangaSidebarSections,
  NAV_CATEGORIES,
  type NavCategoryId,
  type PanchangaSidebarItem,
} from "../panchanga/use-panchanga-sidebar-nav";

/** Promoted into the Main row so they are not repeated in later groups. */
const DRAWER_MAIN_PROMOTED_IDS = new Set([
  "kundali",
  "dainikkranti",
  "kundali-milan",
  "rashifal",
  "panchanga-year",
  "documents",
]);

export type NavMenuMainId =
  | "home"
  | "panchanga"
  | "kundali"
  | "dainikkranti"
  | "kundali-milan"
  | "rashifal"
  | "panchanga-year"
  | "vastu"
  | "learn"
  | "documents";

export type NavMenuMainLink = { id: NavMenuMainId; label: string };

export type NavMenuItem = { item: PanchangaSidebarItem; label: string };

export type NavMenuSection = { id: string; title: string; items: NavMenuItem[] };

/** One of the three tabs of the app's side menu, holding whole sidebar sections (nothing promoted out). */
export type NavMenuCategory = { id: NavCategoryId; title: string; shortTitle: string; sections: NavMenuSection[] };

export function useMobileNavMenu() {
  const { t } = useLocale();

  const main: NavMenuMainLink[] = [
    { id: "home", label: t("home") },
    { id: "panchanga", label: t("nav.surya_panchanga") },
    { id: "kundali", label: t("sidebar_nav.items.kundali.label") },
    { id: "dainikkranti", label: t("sidebar_nav.items.dainikkranti.label") },
    { id: "kundali-milan", label: t("sidebar_nav.items.kundali-milan.label") },
    { id: "rashifal", label: t("nav.jyotish_rashifal") },
    { id: "panchanga-year", label: t("sidebar_nav.items.panchanga-year.label") },
    { id: "vastu", label: t("nav.vastu") },
    { id: "learn", label: t("nav.learn") },
    { id: "documents", label: t("nav.documents") },
  ];

  const labelForItem = (item: PanchangaSidebarItem) =>
    t(item.labelKey);

  const sections: NavMenuSection[] = getPanchangaSidebarSections()
    .map((section) => ({
      id: section.id,
      title: t(section.titleKey),
      items: section.items
        .filter((item) => !DRAWER_MAIN_PROMOTED_IDS.has(item.id))
        .map((item) => ({ item, label: labelForItem(item) })),
    }))
    .filter((section) => section.items.length > 0);

  const allSections: NavMenuSection[] = getPanchangaSidebarSections().map((section) => ({
    id: section.id,
    title: t(section.titleKey),
    items: section.items.map((item) => ({ item, label: labelForItem(item) })),
  }));
  const categories: NavMenuCategory[] = NAV_CATEGORIES.map((category) => ({
    id: category.id,
    title: t(category.titleKey),
    shortTitle: t(category.shortKey),
    sections: category.sectionIds
      .map((id) => allSections.find((section) => section.id === id))
      .filter((section): section is NavMenuSection => section != null),
  }));

  return {
    navAria: t("sidebar_nav.nav_aria"),
    categories,
    mainTitle: t("ui.navigation.main"),
    main,
    sections,
    /** Entries only the app has: extra Main tiles and extra tiles in two sections. */
    appOnly: {
      mainExtra: [
        { id: "shanti", label: t("nav.shanti_vidhi") },
        { id: "more", label: t("ui.more.more") },
      ],
      reminders: t("ui.reminders.reminders"),
      aakashGochar: t("ui.mobile_drawer_nav.n_3_d_sky_gochar"),
    },
  };
}
