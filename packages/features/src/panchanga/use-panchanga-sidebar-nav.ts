/**
 * The panchanga sidebar, shared by the website's and the app's
 * `components/panchanga/PanchangaSidebarNav.tsx` (and the website's mobile
 * nav menu): the sections and items as catalogue keys, which item is active,
 * the expanded section (the active one opens by itself), each section's
 * visible items (all when open, only the active one when closed), labels,
 * blurbs, and copy. Each app turns an item into its own link.
 */
import { useState } from "react";
import { isKundaliRoute } from "@vedic-patro/domain/jyotish/kundali/kundali-routes";
import { CEREMONY_META, ELEMENT_META } from "@vedic-patro/domain/panchanga/panchanga-elements";
import { useLocale } from "@vedic-patro/i18n/react";

export interface PanchangaSidebarItem {
  id: string;
  to: string;
  params?: Record<string, string>;
  /** i18n key under sidebar_nav.items.* or panchanga_elements.* */
  labelKey: string;
  blurbKey?: string;
}

export interface PanchangaSidebarSection {
  id: string;
  titleKey: string;
  items: PanchangaSidebarItem[];
}

const GRAHA_SIDEBAR_ITEMS: PanchangaSidebarItem[] = [
  { id: "gochar", to: "/gochar", labelKey: "sidebar_nav.items.gochar.label", blurbKey: "sidebar_nav.items.gochar.blurb" },
  { id: "graha-asta", to: "/panchanga/graha-asta", labelKey: "sidebar_nav.items.graha-asta.label", blurbKey: "sidebar_nav.items.graha-asta.blurb" },
  { id: "graha-vakri", to: "/panchanga/graha-vakri", labelKey: "sidebar_nav.items.graha-vakri.label", blurbKey: "sidebar_nav.items.graha-vakri.blurb" },
  { id: "chandra-grahan", to: "/panchanga/chandra-grahan", labelKey: "sidebar_nav.items.chandra-grahan.label", blurbKey: "sidebar_nav.items.chandra-grahan.blurb" },
  { id: "surya-grahan", to: "/panchanga/surya-grahan", labelKey: "sidebar_nav.items.surya-grahan.label", blurbKey: "sidebar_nav.items.surya-grahan.blurb" },
];

function elementItems(kind: "span" | "table"): PanchangaSidebarItem[] {
  return ELEMENT_META.filter((e) => e.kind === kind).map((e) => ({
    id: e.id,
    to: "/panchanga/element/$name",
    params: { name: e.id },
    labelKey: `panchanga_elements.${e.id}.title`,
    blurbKey: `panchanga_elements.${e.id}.blurb`,
  }));
}

function ceremonyItems(): PanchangaSidebarItem[] {
  return CEREMONY_META.map((c) => ({
    id: c.id,
    to: "/sait/$category",
    params: { category: c.id },
    labelKey: `sait.categories.${c.id}`,
    blurbKey: "sidebar_nav.items.sait_moment.blurb",
  }));
}

/** Static sidebar sections — dynamic search (dainik kranti, panchak) added in the component. */
export function getPanchangaSidebarSections(): PanchangaSidebarSection[] {
  return [
    {
      id: "patro",
      titleKey: "sidebar_nav.sections.patro.title",
      items: [
        { id: "holidays", to: "/holidays", labelKey: "sidebar_nav.items.holidays.label" },
        { id: "converter", to: "/converter", labelKey: "sidebar_nav.items.converter.label" },
        { id: "suryakranti", to: "/suryakranti", labelKey: "sidebar_nav.items.suryakranti.label" },
        { id: "panchanga-year", to: "/panchanga/year", labelKey: "sidebar_nav.items.panchanga-year.label" },
        { id: "dainikkranti", to: "/dainikkranti", labelKey: "sidebar_nav.items.dainikkranti.label" },
        { id: "panchak-patro", to: "/panchak-patro", labelKey: "sidebar_nav.items.panchak-patro.label" },
        { id: "adhik-maas", to: "/adhik-maas", labelKey: "sidebar_nav.items.adhik-maas.label" },
        { id: "ritu", to: "/ritu", labelKey: "sidebar_nav.items.ritu.label" },
        { id: "brahma-mana", to: "/brahma-mana", labelKey: "sidebar_nav.items.brahma-mana.label" },
      ],
    },
    {
      id: "jyotish",
      titleKey: "sidebar_nav.sections.jyotish.title",
      items: [
        { id: "avakahada", to: "/panchanga/avakahada-chakra", labelKey: "sidebar_nav.items.avakahada.label" },
        { id: "abhijit", to: "/abhijit-muhurta", labelKey: "sidebar_nav.items.abhijit.label" },
        { id: "kundali", to: "/kundali", labelKey: "sidebar_nav.items.kundali.label" },
        { id: "kundali-milan", to: "/jyotish/kundali-milan", labelKey: "sidebar_nav.items.kundali-milan.label" },
        { id: "rashifal", to: "/jyotish/rashifal", labelKey: "rashifal.title" },
      ],
    },
    {
      id: "spans",
      titleKey: "sidebar_nav.sections.spans.title",
      items: elementItems("span"),
    },
    {
      id: "graha",
      titleKey: "sidebar_nav.sections.graha.title",
      items: GRAHA_SIDEBAR_ITEMS,
    },
    {
      id: "tables",
      titleKey: "sidebar_nav.sections.tables.title",
      items: elementItems("table"),
    },
    {
      id: "sait",
      titleKey: "sidebar_nav.sections.sait.title",
      items: ceremonyItems(),
    },
  ];
}

export function isPanchangaSidebarItemActive(pathname: string, item: PanchangaSidebarItem): boolean {
  if (item.id === "kundali") return isKundaliRoute(pathname);
  if (item.to === "/panchanga/element/$name" && item.params?.name) {
    return pathname === `/panchanga/element/${item.params.name}`;
  }
  if (item.to === "/sait/$category" && item.params?.category) {
    return pathname === `/sait/${item.params.category}`;
  }
  return pathname === item.to;
}

export type PanchangaSidebarEntry = {
  item: PanchangaSidebarItem;
  label: string;
  blurb?: string;
  active: boolean;
};

export function usePanchangaSidebarNav({
  pathname,
  isActive = (item) => isPanchangaSidebarItemActive(pathname, item),
  withReminders = false,
}: {
  pathname: string;
  /** How the platform matches an item to the current route (defaults to the website's paths). */
  isActive?: (item: PanchangaSidebarItem) => boolean;
  /** The app also lists its reminders screen under the patro section. */
  withReminders?: boolean;
}) {
  const { t } = useLocale();
  const sections = getPanchangaSidebarSections().map((section) =>
    withReminders && section.id === "patro"
      ? { ...section, items: [...section.items, { id: "reminders", to: "/reminders", labelKey: "" }] }
      : section,
  );
  const labelFor = (item: PanchangaSidebarItem) =>
    item.id === "reminders"
        ? t("ui.reminders.reminders")
        : t(item.labelKey);

  const activeSectionId = sections.find((s) => s.items.some(isActive))?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(activeSectionId);
  const [trackedActiveSectionId, setTrackedActiveSectionId] = useState(activeSectionId);
  if (activeSectionId && activeSectionId !== trackedActiveSectionId) {
    setTrackedActiveSectionId(activeSectionId);
    setExpandedId(activeSectionId);
  }

  return {
    navTitle: t("sidebar_nav.nav_title"),
    navAria: t("sidebar_nav.nav_aria"),
    sections: sections.map((section) => {
      const expanded = expandedId === section.id;
      const entries: PanchangaSidebarEntry[] = section.items.map((item) => ({
        item,
        label: labelFor(item),
        blurb: item.blurbKey ? t(item.blurbKey) : undefined,
        active: isActive(item),
      }));
      const hasActive = entries.some((e) => e.active);
      return {
        id: section.id,
        title: t(section.titleKey),
        expanded,
        hasActive,
        toggle: () => setExpandedId((current) => (current === section.id ? null : section.id)),
        /** All items while open; only the active one while closed. */
        items: expanded ? entries : entries.filter((e) => e.active),
      };
    }),
  };
}
