/**
 * The home page's shortcut tiles under the calendar, shared by the
 * website's and the app's `components/home/HomeQuickLinks.tsx`. They are the
 * navigation itself: the three categories (calendar & time, jyotish & muhurta,
 * daily auspicious times) with every sidebar entry in sidebar order, so home
 * and the side menu can never list different things. `feature` is the entry's
 * id and `section` its sidebar section: each app draws the icon with
 * `resolveNavIcon(section, feature)` from @vedic-patro/icons. `search` says
 * which URL state the website carries into the link.
 */
import { useLocale } from "@vedic-patro/i18n/react";
import {
  getPanchangaSidebarSections,
  NAV_CATEGORIES,
  type NavCategoryId,
  type PanchangaSidebarItem,
} from "../panchanga/use-panchanga-sidebar-nav";

/** Which location / era search the website adds: the route's own, the current month's or year's, or none. */
export type HomeQuickLinkSearch = "route" | "month" | "year" | "none";

export type HomeQuickLink = {
  to: string;
  /** The sidebar entry id (also the icon identity). */
  feature: string;
  /** The sidebar section the entry sits in, for the icon fallback. */
  section: string;
  label: string;
  search: HomeQuickLinkSearch;
};

/** Entries whose website link carries something other than the route's own search. */
const SEARCH: Record<string, HomeQuickLinkSearch> = {
  dainikkranti: "month",
  // No year in the label: the page opens on the year being browsed, which the label could not know.
  "panchak-patro": "year",
  "adhik-maas": "year",
  // Not patro/era routes: no location or year search to carry.
  kundali: "none",
  "kundali-milan": "none",
  documents: "none",
};

/** Home's wording where it reads better as a tile than the sidebar's ("जन्मकुण्डली निर्माण"). */
const LABEL: Record<string, string> = {
  kundali: "home_quick.kundali_build_title",
  "kundali-milan": "home_quick.kundali_milan_title",
};

/** `/panchanga/element/$name` → `/panchanga/element/tithi`. */
function resolvePath(item: PanchangaSidebarItem): string {
  return item.to.replace(/\$(\w+)/g, (_, key: string) => item.params?.[key] ?? key);
}

export function useHomeQuickLinks() {
  const { t } = useLocale();
  const sections = getPanchangaSidebarSections();

  return {
    groups: NAV_CATEGORIES.map((category) => ({
      id: category.id as NavCategoryId,
      title: t(category.titleKey),
      links: category.sectionIds.flatMap((sectionId): HomeQuickLink[] => {
        const section = sections.find((s) => s.id === sectionId);
        if (!section) return [];
        return section.items.map((item) => ({
          to: resolvePath(item),
          feature: item.id,
          section: section.id,
          label: t(LABEL[item.id] ?? item.labelKey),
          search: SEARCH[item.id] ?? "route",
        }));
      }),
    })),
  };
}
