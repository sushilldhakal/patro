/** Section tabs on `/kundali/:profileId` — mirrors web `KundaliSectionNav`. */

import { kundaliLabel } from "@/lib/kundali/kundali-i18n";

export const KUNDALI_SECTIONS = [
  { id: "kundali-overview", i18nKey: "nav_overview" as const },
  { id: "kundali-graha", i18nKey: "nav_graha_details" as const },
  { id: "kundali-yoga", i18nKey: "nav_yoga" as const },
  { id: "kundali-dasha", i18nKey: "nav_dasha" as const },
  { id: "kundali-dasha-vimshottari", i18nKey: "dasha_system_vimshottari" as const },
  { id: "kundali-dasha-tribhagi", i18nKey: "dasha_system_tribhagi" as const },
  { id: "kundali-dasha-yogini", i18nKey: "dasha_system_yogini" as const },
  { id: "kundali-shanti", i18nKey: "nav_shanti_vidhi" as const },
  { id: "kundali-shadbala", i18nKey: "nav_shadbala" as const },
  { id: "kundali-bhava-bala", i18nKey: "nav_bhava_bala" as const },
  { id: "kundali-ashtakavarga", i18nKey: "nav_ashtakavarga" as const },
  { id: "kundali-vimshopaka", i18nKey: "nav_vimshopaka" as const },
  { id: "kundali-report", i18nKey: "nav_analysis" as const },
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

export type DashaSystemId = "vimshottari" | "tribhagi" | "yogini";

export const DASHA_TAB_SECTIONS = [
  { id: "kundali-dasha-vimshottari" as const, system: "vimshottari" as const, i18nKey: "dasha_system_vimshottari" as const },
  { id: "kundali-dasha-tribhagi" as const, system: "tribhagi" as const, i18nKey: "dasha_system_tribhagi" as const },
  { id: "kundali-dasha-yogini" as const, system: "yogini" as const, i18nKey: "dasha_system_yogini" as const },
];

export const BALA_TAB_SECTIONS = [
  { id: "kundali-shadbala" as const, i18nKey: "nav_shadbala" as const },
  { id: "kundali-bhava-bala" as const, i18nKey: "nav_bhava_bala" as const },
  { id: "kundali-ashtakavarga" as const, i18nKey: "nav_ashtakavarga" as const },
  { id: "kundali-vimshopaka" as const, i18nKey: "nav_vimshopaka" as const },
];

export const KUNDALI_NAV_GROUPS = [
  { id: "kundali-overview", i18nKey: "nav_overview" as const },
  { id: "kundali-graha", i18nKey: "nav_graha_details" as const },
  { id: "kundali-yoga", i18nKey: "nav_yoga" as const },
  {
    id: "kundali-dasha",
    i18nKey: "nav_dasha" as const,
    children: [
      ...DASHA_TAB_SECTIONS.map(({ id, i18nKey }) => ({ id, i18nKey })),
      { id: "kundali-shanti" as const, i18nKey: "nav_shanti_vidhi" as const },
    ],
  },
  {
    id: "kundali-bala",
    i18nKey: "nav_bala" as const,
    children: BALA_TAB_SECTIONS.map(({ id, i18nKey }) => ({ id, i18nKey })),
  },
  { id: "kundali-report", i18nKey: "nav_analysis" as const },
] as const;

export function kundaliSectionLabel(
  section: { i18nKey: Parameters<typeof kundaliLabel>[0] },
  lang: "ne" | "en",
): string {
  return kundaliLabel(section.i18nKey, lang);
}

export function isBalaSection(id: string): id is BalaSectionId {
  return (BALA_SECTION_IDS as readonly string[]).includes(id);
}

export function dashaSystemFromSection(id: string): DashaSystemId | null {
  if (id === "kundali-dasha" || id === "kundali-dasha-vimshottari") return "vimshottari";
  if (id === "kundali-dasha-tribhagi") return "tribhagi";
  if (id === "kundali-dasha-yogini") return "yogini";
  return null;
}

export function dashaSectionId(system: DashaSystemId): KundaliSectionId {
  return DASHA_TAB_SECTIONS.find((tab) => tab.system === system)?.id ?? "kundali-dasha-vimshottari";
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

export function isGroupActive(groupId: string, activeId: KundaliSectionId): boolean {
  if (groupId === "kundali-dasha") return dashaSystemFromSection(activeId) != null || activeId === "kundali-shanti";
  if (groupId === "kundali-bala") return isBalaSection(activeId);
  return activeId === groupId;
}

export function isChildActive(childId: KundaliSectionId, activeId: KundaliSectionId): boolean {
  if (childId === "kundali-dasha-vimshottari") {
    return activeId === "kundali-dasha" || activeId === "kundali-dasha-vimshottari";
  }
  return activeId === childId;
}

export function parseKundaliSectionFromHash(hash: string): KundaliSectionId {
  const id = hash.replace(/^#/, "");
  return KUNDALI_SECTIONS.some((s) => s.id === id) ? (id as KundaliSectionId) : DEFAULT_KUNDALI_SECTION;
}
