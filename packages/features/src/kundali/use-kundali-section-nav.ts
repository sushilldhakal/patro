/**
 * The kundali detail page's section menu, shared by the website's and the
 * app's `components/kundali/KundaliSectionNav.tsx`: the section ids (they are
 * also the URL hash), the grouped menu (dasha systems and shanti vidhi under
 * dasha, the four balas under bala), which group / child is active, and the
 * expand / collapse state (opening a group jumps to its first child). Each
 * app draws the sidebar or the horizontal pills.
 */
import { useState } from "react";
import type { DashaSystem } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

export const KUNDALI_SECTIONS = [
  { id: "kundali-overview", labelKey: "kundali.nav_overview", icon: "overview" as const },
  { id: "kundali-graha", labelKey: "kundali.nav_graha_details", icon: "graha" as const },
  { id: "kundali-yoga", labelKey: "kundali.nav_yoga", icon: "yoga" as const },
  { id: "kundali-dasha", labelKey: "kundali.nav_dasha", icon: "dasha" as const },
  {
    id: "kundali-dasha-vimshottari",
    labelKey: "kundali.x.dasha_system_vimshottari",
    icon: "dasha" as const,
  },
  {
    id: "kundali-dasha-tribhagi",
    labelKey: "kundali.x.dasha_system_tribhagi",
    icon: "dasha" as const,
  },
  {
    id: "kundali-dasha-yogini",
    labelKey: "kundali.x.dasha_system_yogini",
    icon: "dasha" as const,
  },
  { id: "kundali-shanti", labelKey: "kundali.nav_shanti_vidhi", icon: "shanti" as const },
  { id: "kundali-shadbala", labelKey: "kundali.nav_shadbala", icon: "shadbala" as const },
  { id: "kundali-bhava-bala", labelKey: "kundali.nav_bhava_bala", icon: "bhava" as const },
  { id: "kundali-ashtakavarga", labelKey: "kundali.nav_ashtakavarga", icon: "ashtakavarga" as const },
  { id: "kundali-vimshopaka", labelKey: "kundali.nav_vimshopaka", icon: "vimshopaka" as const },
  { id: "kundali-report", labelKey: "kundali.nav_analysis", icon: "analysis" as const },
] as const;

export type KundaliSectionId = (typeof KUNDALI_SECTIONS)[number]["id"];

export type KundaliContentSectionId =
  | "kundali-overview"
  | "kundali-graha"
  | "kundali-yoga"
  | "kundali-dasha"
  | "kundali-shadbala"
  | "kundali-bhava-bala"
  | "kundali-ashtakavarga"
  | "kundali-vimshopaka"
  | "kundali-shanti"
  | "kundali-report";

export const DEFAULT_KUNDALI_SECTION: KundaliSectionId = "kundali-overview";

export const BALA_SECTION_IDS = [
  "kundali-shadbala",
  "kundali-bhava-bala",
  "kundali-ashtakavarga",
  "kundali-vimshopaka",
] as const;

export type BalaSectionId = (typeof BALA_SECTION_IDS)[number];

export const DASHA_TAB_SECTIONS: { id: KundaliSectionId; system: DashaSystem; labelKey: string }[] = [
  {
    id: "kundali-dasha-vimshottari",
    system: "vimshottari",
    labelKey: "kundali.x.dasha_system_vimshottari",
  },
  {
    id: "kundali-dasha-tribhagi",
    system: "tribhagi",
    labelKey: "kundali.x.dasha_system_tribhagi",
  },
  { id: "kundali-dasha-yogini", system: "yogini", labelKey: "kundali.x.dasha_system_yogini" },
];

export const BALA_TAB_SECTIONS: { id: BalaSectionId; labelKey: string }[] = [
  { id: "kundali-shadbala", labelKey: "kundali.nav_shadbala" },
  { id: "kundali-bhava-bala", labelKey: "kundali.nav_bhava_bala" },
  { id: "kundali-ashtakavarga", labelKey: "kundali.nav_ashtakavarga" },
  { id: "kundali-vimshopaka", labelKey: "kundali.nav_vimshopaka" },
];

export const KUNDALI_NAV_GROUPS = [
  { id: "kundali-overview", labelKey: "kundali.nav_overview", icon: "overview" as const },
  { id: "kundali-graha", labelKey: "kundali.nav_graha_details", icon: "graha" as const },
  { id: "kundali-yoga", labelKey: "kundali.nav_yoga", icon: "yoga" as const },
  {
    id: "kundali-dasha",
    labelKey: "kundali.nav_dasha",
    icon: "dasha" as const,
    children: [
      ...DASHA_TAB_SECTIONS.map(({ id, labelKey }) => ({ id, labelKey })),
      { id: "kundali-shanti" as const, labelKey: "kundali.nav_shanti_vidhi" },
    ],
  },
  {
    id: "kundali-bala",
    labelKey: "kundali.nav_bala",
    icon: "shadbala" as const,
    children: BALA_TAB_SECTIONS.map(({ id, labelKey }) => ({ id, labelKey })),
  },
  { id: "kundali-report", labelKey: "kundali.nav_analysis", icon: "analysis" as const },
] as const;

export function isBalaSection(id: string): id is BalaSectionId {
  return (BALA_SECTION_IDS as readonly string[]).includes(id);
}

export function dashaSystemFromSection(id: string): DashaSystem | null {
  if (id === "kundali-dasha" || id === "kundali-dasha-vimshottari") return "vimshottari";
  if (id === "kundali-dasha-tribhagi") return "tribhagi";
  if (id === "kundali-dasha-yogini") return "yogini";
  return null;
}

export function dashaSectionId(system: DashaSystem): KundaliSectionId {
  const match = DASHA_TAB_SECTIONS.find((tab) => tab.system === system);
  return match?.id ?? "kundali-dasha-vimshottari";
}

export function contentSectionId(id: KundaliSectionId): KundaliContentSectionId {
  if (dashaSystemFromSection(id)) return "kundali-dasha";
  return id as KundaliContentSectionId;
}

export function navGroupIdForSection(id: KundaliSectionId): string | null {
  if (dashaSystemFromSection(id) || id === "kundali-shanti") return "kundali-dasha";
  if (isBalaSection(id)) return "kundali-bala";
  return null;
}

export function defaultChildForGroup(groupId: string): KundaliSectionId | null {
  if (groupId === "kundali-dasha") return "kundali-dasha-vimshottari";
  if (groupId === "kundali-bala") return "kundali-shadbala";
  return null;
}

export function parseKundaliSectionFromHash(hash: string): KundaliSectionId {
  const id = hash.replace(/^#/, "");
  return KUNDALI_SECTIONS.some((s) => s.id === id) ? (id as KundaliSectionId) : DEFAULT_KUNDALI_SECTION;
}


export function isKundaliNavGroupActive(groupId: string, activeId: KundaliSectionId): boolean {
  if (groupId === "kundali-dasha") return dashaSystemFromSection(activeId) != null || activeId === "kundali-shanti";
  if (groupId === "kundali-bala") return isBalaSection(activeId);
  return activeId === groupId;
}

export function isKundaliNavChildActive(childId: KundaliSectionId, activeId: KundaliSectionId): boolean {
  if (childId === "kundali-dasha-vimshottari") {
    return activeId === "kundali-dasha" || activeId === "kundali-dasha-vimshottari";
  }
  return activeId === childId;
}

export type KundaliNavIcon = (typeof KUNDALI_SECTIONS)[number]["icon"];

export function useKundaliSectionNav({ activeId, onNavigate }: { activeId: KundaliSectionId; onNavigate: (id: KundaliSectionId) => void }) {
  const { t } = useLocale();
  const activeGroup = navGroupIdForSection(activeId);
  const [expandedId, setExpandedId] = useState<string | null>(activeGroup);

  // Opening a section expands its group. Adjusting state while rendering (not in
  // an effect) means the group is already open on the render that shows the section.
  const [seenActiveGroup, setSeenActiveGroup] = useState(activeGroup);
  if (activeGroup !== seenActiveGroup) {
    setSeenActiveGroup(activeGroup);
    if (activeGroup) setExpandedId(activeGroup);
  }

  const toggleGroup = (groupId: string) => {
    const defaultChild = defaultChildForGroup(groupId);
    if (expandedId === groupId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(groupId);
    if (defaultChild && !isKundaliNavGroupActive(groupId, activeId)) {
      onNavigate(defaultChild);
    }
  };

  const groups = KUNDALI_NAV_GROUPS.map((group) => {
    const hasChildren = "children" in group;
    return {
      id: group.id,
      label: t(group.labelKey),
      icon: group.icon as KundaliNavIcon,
      hasChildren,
      active: isKundaliNavGroupActive(group.id, activeId),
      expanded: expandedId === group.id,
      press: () => {
        if (hasChildren) toggleGroup(group.id);
        else onNavigate(group.id as KundaliSectionId);
      },
      children: (hasChildren ? group.children : []).map((child) => ({
        id: child.id,
        label: t(child.labelKey),
        active: isKundaliNavChildActive(child.id, activeId),
        press: () => onNavigate(child.id),
      })),
    };
  });

  return {
    title: t("kundali.submenu_title"),
    jumpLabel: t("kundali.jump_to"),
    groups,
    /** The open group's children (the horizontal variant's second row). */
    expandedChildren: groups.find((g) => g.hasChildren && g.expanded)?.children ?? [],
  };
}
