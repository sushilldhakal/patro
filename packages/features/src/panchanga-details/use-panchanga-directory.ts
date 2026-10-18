/**
 * Panchanga details hub logic, shared by the website
 * (`apps/web/src/pages/PanchangaDetailsHub.tsx` + `components/panchanga/PanchangaDirectory.tsx`)
 * and the app (`apps/mobile/app/(tabs)/panchanga/details.tsx` +
 * `components/panchanga/PanchangaDirectoryMobile.tsx`): which links, in which
 * sections, with which text. Each app turns a link into its own route.
 */
import { CEREMONY_META, ELEMENT_META } from "@vedic-patro/domain/panchanga/panchanga-elements";
import { useLocale } from "@vedic-patro/i18n/react";

/** Lucide icon name (kebab case); each app maps it to its icon component. */
export type DirectoryIcon = "moon-star" | "calendar-clock" | "heart-handshake" | "route" | "sunrise" | "rotate-ccw" | "eclipse";

export type DirectoryLink =
  | { kind: "element"; id: string; label: string; description: string; icon: DirectoryIcon }
  | { kind: "graha"; id: GrahaPageId; path: string; label: string; description: string; icon: DirectoryIcon }
  | { kind: "sait"; id: string; label: string; description: string; icon: DirectoryIcon };

export type DirectorySection = { id: "spans" | "graha" | "tables" | "sait"; title: string; links: DirectoryLink[] };

export type GrahaPageId = "gochar" | "graha-asta" | "graha-vakri" | "chandra-grahan" | "surya-grahan";

const GRAHA_PAGES: { id: GrahaPageId; path: string; icon: DirectoryIcon }[] = [
  { id: "gochar", path: "/gochar", icon: "route" },
  { id: "graha-asta", path: "/panchanga/graha-asta", icon: "sunrise" },
  { id: "graha-vakri", path: "/panchanga/graha-vakri", icon: "rotate-ccw" },
  { id: "chandra-grahan", path: "/panchanga/chandra-grahan", icon: "moon-star" },
  { id: "surya-grahan", path: "/panchanga/surya-grahan", icon: "eclipse" },
];

/** The categorised link grid: transition elements → graha pages → daily tables → sait. */
export function usePanchangaDirectory(): DirectorySection[] {
  const { t } = useLocale();
  const element = (id: string, icon: DirectoryIcon): DirectoryLink => ({
    kind: "element",
    id,
    label: t(`panchanga_elements.${id}.title`),
    description: t(`panchanga_elements.${id}.blurb`),
    icon,
  });
  return [
    {
      id: "spans",
      title: t("sidebar_nav.sections.spans.title"),
      links: ELEMENT_META.filter((e) => e.kind === "span").map((e) => element(e.id, "moon-star")),
    },
    {
      id: "graha",
      title: t("sidebar_nav.sections.graha.title"),
      links: GRAHA_PAGES.map((g) => ({
        kind: "graha" as const,
        id: g.id,
        path: g.path,
        label: t(`sidebar_nav.items.${g.id}.label`),
        description: t(`sidebar_nav.items.${g.id}.blurb`),
        icon: g.icon,
      })),
    },
    {
      id: "tables",
      title: t("sidebar_nav.sections.tables.title"),
      links: ELEMENT_META.filter((e) => e.kind === "table").map((e) => element(e.id, "calendar-clock")),
    },
    {
      id: "sait",
      title: t("sidebar_nav.sections.sait.title"),
      links: CEREMONY_META.map((c) => ({
        kind: "sait" as const,
        id: c.id,
        label: t(`sait.categories.${c.id}`),
        description: t("sidebar_nav.items.sait_moment.blurb"),
        icon: "heart-handshake" as const,
      })),
    },
  ];
}

/** The details hub page: its heading and the directory. */
export function usePanchangaDetailsPage() {
  const { t } = useLocale();
  return {
    copy: { title: t("ui.panchanga.panchanga_details"), subtitle: t("ui.panchanga.every_element_on_its_own_page") },
    sections: usePanchangaDirectory(),
  };
}
