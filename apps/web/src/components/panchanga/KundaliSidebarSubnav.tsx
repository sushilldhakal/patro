import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  KUNDALI_NAV_GROUPS,
  dashaSystemFromSection,
  defaultChildForGroup,
  isBalaSection,
  parseKundaliSectionFromHash,
  type KundaliSectionId,
} from "@/components/kundali/KundaliSectionNav";
import { cn } from "@/lib/utils";

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

/** Section tabs nested under जन्मकुण्डली निर्माण in the panchanga sidebar. */
export function KundaliSidebarSubnav({
  profileId,
  activeSectionId,
}: {
  profileId: string;
  activeSectionId: KundaliSectionId;
}) {
  const { t } = useTranslation();
  const activeGroup =
    dashaSystemFromSection(activeSectionId) != null || activeSectionId === "kundali-shanti"
      ? "kundali-dasha"
      : isBalaSection(activeSectionId)
        ? "kundali-bala"
        : null;
  const [expandedId, setExpandedId] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setExpandedId(activeGroup);
  }, [activeGroup]);

  return (
    <ul className="ml-2 flex flex-col gap-0.5 border-l border-border/70 pl-2 pb-1">
      {KUNDALI_NAV_GROUPS.map((group) => {
        const hasChildren = "children" in group;
        const active = isGroupActive(group.id, activeSectionId);
        const expanded = expandedId === group.id;
        const children = hasChildren ? group.children : [];
        if (!hasChildren) {
          return (
            <li key={group.id}>
              <Link
                to="/kundali/$profileId"
                params={{ profileId }}
                hash={group.id}
                className={cn(
                  "block rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-snug transition-colors",
                  active
                    ? "bg-secondary/12 text-secondary ring-1 ring-secondary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "true" : undefined}
              >
                {t(group.labelKey)}
              </Link>
            </li>
          );
        }

        const defaultChild = defaultChildForGroup(group.id) ?? children[0]?.id;
        return (
          <li key={group.id}>
            <div
              className={cn(
                "flex items-center rounded-lg",
                active
                  ? "bg-secondary/12 text-secondary ring-1 ring-secondary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Link
                to="/kundali/$profileId"
                params={{ profileId }}
                hash={defaultChild}
                onClick={() => setExpandedId(group.id)}
                className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm font-medium leading-snug"
              >
                {t(group.labelKey)}
              </Link>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={t(group.labelKey)}
                onClick={() => setExpandedId(expanded ? null : group.id)}
                className="shrink-0 px-2 py-1.5"
              >
                <ChevronDown
                  className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
            </div>
            {expanded ? (
              <ul className="mt-0.5 ml-2 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                {children.map((child) => {
                  const childActive = isChildActive(child.id, activeSectionId);
                  return (
                    <li key={child.id}>
                      <Link
                        to="/kundali/$profileId"
                        params={{ profileId }}
                        hash={child.id}
                        className={cn(
                          "block rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-snug transition-colors",
                          childActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        aria-current={childActive ? "true" : undefined}
                      >
                        {t(child.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export { parseKundaliSectionFromHash };
