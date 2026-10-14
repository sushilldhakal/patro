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
import { useKundaliSectionNav, type KundaliNavIcon, type KundaliSectionId } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export {
  BALA_SECTION_IDS,
  BALA_TAB_SECTIONS,
  DASHA_TAB_SECTIONS,
  DEFAULT_KUNDALI_SECTION,
  KUNDALI_NAV_GROUPS,
  KUNDALI_SECTIONS,
  contentSectionId,
  dashaSectionId,
  dashaSystemFromSection,
  defaultChildForGroup,
  isBalaSection,
  navGroupIdForSection,
  parseKundaliSectionFromHash,
  type BalaSectionId,
  type KundaliContentSectionId,
  type KundaliSectionId,
} from "@vedic-patro/features/kundali";

const ICONS: Record<KundaliNavIcon, typeof Sparkles> = {
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
};

export function setKundaliSectionHash(id: KundaliSectionId) {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}${window.location.search}#${id}`;
  window.history.replaceState(null, "", url);
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
  const nav = useKundaliSectionNav({ activeId, onNavigate });

  if (variant === "horizontal") {
    return (
      <nav className={cn("space-y-2", className)} aria-label={nav.jumpLabel}>
        <div className="overflow-x-auto">
          <ul className="flex min-w-max gap-2 pb-1">
            {nav.groups.map((group) => {
              const Icon = ICONS[group.icon];
              return (
                <li key={group.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={group.press}
                    aria-expanded={group.hasChildren ? group.expanded : undefined}
                    aria-current={group.active ? "page" : undefined}
                    className={cn(
                      kundaliDetailClasses.sectionNav.pill,
                      kundaliDetailClasses.sectionNav.pillText,
                      "inline-flex whitespace-nowrap",
                      group.active
                        ? cn(kundaliDetailClasses.sectionNav.pillActive, kundaliDetailClasses.sectionNav.pillActiveText)
                        : cn(kundaliDetailClasses.sectionNav.pillIdle, "hover:bg-muted hover:text-foreground"),
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {group.label}
                    {group.hasChildren ? (
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", group.expanded && "rotate-180")}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {nav.expandedChildren.length > 0 ? (
          <div className="overflow-x-auto">
            <ul className="flex min-w-max gap-2 pb-1">
              {nav.expandedChildren.map((child) => (
                <li key={child.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={child.press}
                    aria-current={child.active ? "page" : undefined}
                    className={cn(
                      kundaliDetailClasses.sectionNav.pill,
                      kundaliDetailClasses.sectionNav.pillText,
                      "inline-flex gap-0 whitespace-nowrap",
                      child.active
                        ? cn(kundaliDetailClasses.sectionNav.childPillActive, kundaliDetailClasses.sectionNav.childPillActiveText)
                        : cn(kundaliDetailClasses.sectionNav.childPillIdle, "hover:bg-muted hover:text-foreground"),
                    )}
                  >
                    {child.label}
                  </button>
                </li>
              ))}
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
      aria-label={nav.jumpLabel}
    >
      <p className={kundaliDetailClasses.sectionNav.sideTitle}>{nav.title}</p>
      <ul className={cn(kundaliDetailClasses.sectionNav.sideList, "flex flex-col")}>
        {nav.groups.map((group) => {
          const Icon = ICONS[group.icon];
          return (
            <li key={group.id}>
              <button
                type="button"
                onClick={group.press}
                aria-expanded={group.hasChildren ? group.expanded : undefined}
                aria-current={!group.hasChildren && group.active ? "page" : undefined}
                className={cn(
                  kundaliDetailClasses.sectionNav.sideItem,
                  kundaliDetailClasses.sectionNav.sideItemText,
                  "flex w-full items-center gap-2.5 text-left transition-colors",
                  group.active
                    ? cn(kundaliDetailClasses.sectionNav.sideItemActive, kundaliDetailClasses.sectionNav.sideItemActiveText, "ring-1 ring-secondary/25")
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", group.active && "text-secondary")} />
                <span className="min-w-0 flex-1">{group.label}</span>
                {group.hasChildren ? (
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition-transform", group.expanded && "rotate-180")}
                    aria-hidden
                  />
                ) : null}
              </button>
              {group.hasChildren && group.expanded ? (
                <ul className={cn(kundaliDetailClasses.sectionNav.sideChildList, "flex flex-col")}>
                  {group.children.map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={child.press}
                        aria-current={child.active ? "page" : undefined}
                        className={cn(
                          kundaliDetailClasses.sectionNav.sideChild,
                          kundaliDetailClasses.sectionNav.sideChildText,
                          "w-full text-left transition-colors",
                          child.active
                            ? cn(kundaliDetailClasses.sectionNav.sideChildActive, kundaliDetailClasses.sectionNav.sideChildActiveText)
                            : cn(kundaliDetailClasses.sectionNav.sideChildIdleText, "hover:bg-muted hover:text-foreground"),
                        )}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
