import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { parseKundaliSectionFromHash, useKundaliSidebarSubnav, type KundaliSectionId } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";

/** Section tabs nested under the kundali item in the panchanga sidebar. */
export function KundaliSidebarSubnav({ profileId, activeSectionId }: { profileId: string; activeSectionId: KundaliSectionId }) {
  const groups = useKundaliSidebarSubnav(activeSectionId);

  return (
    <ul className="ml-2 flex flex-col gap-0.5 border-l border-border/70 pl-2 pb-1">
      {groups.map((group) => {
        if (!group.hasChildren) {
          return (
            <li key={group.id}>
              <Link
                to="/kundali/$profileId"
                params={{ profileId }}
                hash={group.target}
                className={cn(
                  "block rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-snug transition-colors",
                  group.active
                    ? "bg-secondary/12 text-secondary ring-1 ring-secondary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={group.active ? "true" : undefined}
              >
                {group.label}
              </Link>
            </li>
          );
        }

        return (
          <li key={group.id}>
            <div
              className={cn(
                "flex items-center rounded-lg",
                group.active
                  ? "bg-secondary/12 text-secondary ring-1 ring-secondary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Link
                to="/kundali/$profileId"
                params={{ profileId }}
                hash={group.target}
                onClick={group.open}
                className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm font-medium leading-snug"
              >
                {group.label}
              </Link>
              <button type="button" aria-expanded={group.expanded} aria-label={group.label} onClick={group.toggle} className="shrink-0 px-2 py-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", group.expanded && "rotate-180")} aria-hidden />
              </button>
            </div>
            {group.expanded ? (
              <ul className="mt-0.5 ml-2 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                {group.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to="/kundali/$profileId"
                      params={{ profileId }}
                      hash={child.id}
                      className={cn(
                        "block rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-snug transition-colors",
                        child.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={child.active ? "true" : undefined}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export { parseKundaliSectionFromHash };
