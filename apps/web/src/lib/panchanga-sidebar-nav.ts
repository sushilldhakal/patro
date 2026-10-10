import { CEREMONY_META, ELEMENT_META } from "@/lib/panchanga-elements";

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
        { id: "ritu", to: "/ritu", labelKey: "sidebar_nav.items.ritu.label" },
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
