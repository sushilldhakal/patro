import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarRange,
  ChevronDown,
  CircleDot,
  Flame,
  Grid3x3,
  Home,
  Scale,
  ScrollText,
  Sparkles,
  Star,
} from "lucide-react";
import type { DashaSystem } from "@/lib/api";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

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

const ICONS = {
  overview: Sparkles,
  graha: CircleDot,
  yoga: Star,
  dasha: CalendarRange,
  shadbala: Scale,
  bhava: Home,
  ashtakavarga: Grid3x3,
  vimshopaka: Grid3x3,
  shanti: Flame,
  analysis: ScrollText,
} as const;

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

export function setKundaliSectionHash(id: KundaliSectionId) {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}${window.location.search}#${id}`;
  window.history.replaceState(null, "", url);
}

function isGroupActive(groupId: string, activeId: KundaliSectionId): boolean {
  if (groupId === "kundali-dasha") return dashaSystemFromSection(activeId) != null || activeId === "kundali-shanti";
  if (groupId === "kundali-bala") return isBalaSection(activeId);
  return activeId === groupId;
}

function isChildActive(childId: KundaliSectionId, activeId: KundaliSectionId): boolean {
  if (childId === "kundali-dasha-vimshottari") {
    return activeId === "kundali-dasha" || activeId === "kundali-dasha-vimshottari";
  }
  return activeId === childId;
}

type KundaliSectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
  className?: string;
  variant?: "sidebar" | "horizontal";
};

export function KundaliSectionNav({
  activeId,
  onNavigate,
  className,
  variant = "sidebar",
}: KundaliSectionNavProps) {
  const { t } = useTranslation();
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
    if (defaultChild && !isGroupActive(groupId, activeId)) {
      onNavigate(defaultChild);
    }
  };

  if (variant === "horizontal") {
    const expandedGroup = KUNDALI_NAV_GROUPS.find(
      (group) => "children" in group && group.id === expandedId,
    );
    const children = expandedGroup && "children" in expandedGroup ? expandedGroup.children : [];

    return (
      <nav className={cn("space-y-2", className)} aria-label={t("kundali.jump_to")}>
        <div className="overflow-x-auto">
          <ul className="flex min-w-max gap-2 pb-1">
            {KUNDALI_NAV_GROUPS.map((group) => {
              const Icon = ICONS[group.icon];
              const hasChildren = "children" in group;
              const active = isGroupActive(group.id, activeId);
              const expanded = expandedId === group.id;
              return (
                <li key={group.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren) toggleGroup(group.id);
                      else onNavigate(group.id as KundaliSectionId);
                    }}
                    aria-expanded={hasChildren ? expanded : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      kundaliDetailClasses.sectionNav.pill,
                      kundaliDetailClasses.sectionNav.pillText,
                      "inline-flex whitespace-nowrap",
                      active
                        ? cn(kundaliDetailClasses.sectionNav.pillActive, kundaliDetailClasses.sectionNav.pillActiveText)
                        : cn(kundaliDetailClasses.sectionNav.pillIdle, "hover:bg-muted hover:text-foreground"),
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {t(group.labelKey)}
                    {hasChildren ? (
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {children.length > 0 ? (
          <div className="overflow-x-auto">
            <ul className="flex min-w-max gap-2 pb-1">
              {children.map((child) => {
                const active = isChildActive(child.id, activeId);
                return (
                  <li key={child.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(child.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        kundaliDetailClasses.sectionNav.pill,
                        kundaliDetailClasses.sectionNav.pillText,
                        "inline-flex gap-0 whitespace-nowrap",
                        active
                          ? cn(kundaliDetailClasses.sectionNav.childPillActive, kundaliDetailClasses.sectionNav.childPillActiveText)
                          : cn(kundaliDetailClasses.sectionNav.childPillIdle, "hover:bg-muted hover:text-foreground"),
                      )}
                    >
                      {t(child.labelKey)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        kundaliDetailClasses.sectionNav.sideCard,
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        className,
      )}
      aria-label={t("kundali.jump_to")}
    >
      <p className={kundaliDetailClasses.sectionNav.sideTitle}>
        {t("kundali.submenu_title")}
      </p>
      <ul className={cn(kundaliDetailClasses.sectionNav.sideList, "flex flex-col")}>
        {KUNDALI_NAV_GROUPS.map((group) => {
          const Icon = ICONS[group.icon];
          const hasChildren = "children" in group;
          const active = isGroupActive(group.id, activeId);
          const expanded = expandedId === group.id;
          const children = hasChildren ? group.children : [];
          return (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => {
                  if (hasChildren) toggleGroup(group.id);
                  else onNavigate(group.id as KundaliSectionId);
                }}
                aria-expanded={hasChildren ? expanded : undefined}
                aria-current={!hasChildren && active ? "page" : undefined}
                className={cn(
                  kundaliDetailClasses.sectionNav.sideItem,
                  kundaliDetailClasses.sectionNav.sideItemText,
                  "flex w-full items-center gap-2.5 text-left transition-colors",
                  active
                    ? cn(kundaliDetailClasses.sectionNav.sideItemActive, kundaliDetailClasses.sectionNav.sideItemActiveText, "ring-1 ring-secondary/25")
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-secondary")} />
                <span className="min-w-0 flex-1">{t(group.labelKey)}</span>
                {hasChildren ? (
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")}
                    aria-hidden
                  />
                ) : null}
              </button>
              {hasChildren && expanded ? (
                <ul className={cn(kundaliDetailClasses.sectionNav.sideChildList, "flex flex-col")}>
                  {children.map((child) => {
                    const childActive = isChildActive(child.id, activeId);
                    return (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => onNavigate(child.id)}
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            kundaliDetailClasses.sectionNav.sideChild,
                            kundaliDetailClasses.sectionNav.sideChildText,
                            "w-full text-left transition-colors",
                            childActive
                              ? cn(kundaliDetailClasses.sectionNav.sideChildActive, kundaliDetailClasses.sectionNav.sideChildActiveText)
                              : cn(kundaliDetailClasses.sectionNav.sideChildIdleText, "hover:bg-muted hover:text-foreground"),
                          )}
                        >
                          {t(child.labelKey)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
