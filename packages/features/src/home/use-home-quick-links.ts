/**
 * The home page's shortcut tiles under the calendar, shared by the
 * website's and the app's `components/home/HomeQuickLinks.tsx`: two groups
 * (patro, jyotish), their order, routes and labels. `feature` is the
 * shared icon identity (`FEATURE_ICON` in @vedic-patro/icons) each app
 * draws; `search` says which URL state the website carries into the link.
 */
import { useLocale } from "@vedic-patro/i18n/react";

export type HomeQuickLinkFeature =
  | "holidays"
  | "converter"
  | "suryakranti"
  | "panchanga-year"
  | "dainikkranti"
  | "panchak-patro"
  | "adhik-maas"
  | "ritu"
  | "avakahada"
  | "abhijit"
  | "kundali"
  | "kundali-milan"
  | "documents";

/** Which location / era search the website adds: the route's own, the current month's or year's, or none. */
export type HomeQuickLinkSearch = "route" | "month" | "year" | "none";

export type HomeQuickLink = {
  to: string;
  feature: HomeQuickLinkFeature;
  label: string;
  search: HomeQuickLinkSearch;
};

type LinkDef = { to: string; feature: HomeQuickLinkFeature; label: string; search: HomeQuickLinkSearch };

const PATRO: LinkDef[] = [
  { to: "/holidays", feature: "holidays", label: "nav.holidays", search: "route" },
  { to: "/converter", feature: "converter", label: "nav.converter", search: "route" },
  { to: "/suryakranti", feature: "suryakranti", label: "nav.suryakranti", search: "route" },
  { to: "/panchanga/year", feature: "panchanga-year", label: "panchanga_year.title", search: "route" },
  { to: "/dainikkranti", feature: "dainikkranti", label: "nav.dainikkranti", search: "month" },
  // No year in the label: the page opens on the year being browsed, which the label could not know.
  { to: "/panchak-patro", feature: "panchak-patro", label: "sidebar_nav.items.panchak-patro.label", search: "year" },
  { to: "/adhik-maas", feature: "adhik-maas", label: "sidebar_nav.items.adhik-maas.label", search: "year" },
  { to: "/ritu", feature: "ritu", label: "ritu.title", search: "route" },
];

const JYOTISH: LinkDef[] = [
  { to: "/panchanga/avakahada-chakra", feature: "avakahada", label: "nav.avakahada_chakra", search: "route" },
  { to: "/abhijit-muhurta", feature: "abhijit", label: "nav.abhijit_muhurta", search: "route" },
  { to: "/kundali", feature: "kundali", label: "home_quick.kundali_build_title", search: "route" },
  { to: "/jyotish/kundali-milan", feature: "kundali-milan", label: "home_quick.kundali_milan_title", search: "route" },
  // Not a patro/era route: no location or year search to carry.
  { to: "/documents", feature: "documents", label: "nav.documents", search: "none" },
];

export function useHomeQuickLinks() {
  const { t } = useLocale();
  const links = (defs: LinkDef[]): HomeQuickLink[] => defs.map((d) => ({ ...d, label: t(d.label) }));

  return {
    groups: [
      { id: "patro" as const, title: t("sidebar_nav.sections.patro.title"), links: links(PATRO) },
      { id: "jyotish" as const, title: t("sidebar_nav.sections.jyotish.title"), links: links(JYOTISH) },
    ],
  };
}
