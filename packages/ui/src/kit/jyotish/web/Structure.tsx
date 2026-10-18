import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useKundaliSectionNav, useKundaliSidebarSubnav } from "@vedic-patro/features/kundali";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { KundaliSectionNavProps, KundaliSidebarSubnavProps } from "../contract";
import { iconChevronDown, iconChevronUp } from "../icons";

const navCls = kundaliDetailClasses.sectionNav;

export function KundaliSectionNav({ activeId, onNavigate, className, variant = "sidebar", renderIcon }: KundaliSectionNavProps) {
  const nav = useKundaliSectionNav({ activeId, onNavigate });
  if (variant === "horizontal") {
    return (
      <nav className={cn("space-y-2", className)} aria-label={nav.jumpLabel}>
        <div className="overflow-x-auto">
          <ul className="flex min-w-max gap-2 pb-1">
            {nav.groups.map((group) => (
              <li key={group.id}>
                <button type="button" onClick={group.press} aria-expanded={group.hasChildren ? group.expanded : undefined} aria-current={group.active ? "page" : undefined} className={cn(navCls.pill, navCls.pillText, "inline-flex whitespace-nowrap", group.active ? cn(navCls.pillActive, navCls.pillActiveText) : navCls.pillIdle)}>
                  {renderIcon?.(group.icon)}
                  {group.label}
                  {group.hasChildren ? <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={14} tone="muted" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {nav.expandedChildren.length > 0 ? (
          <div className="overflow-x-auto">
            <ul className="flex min-w-max gap-2 pb-1">
              {nav.expandedChildren.map((child) => (
                <li key={child.id}>
                  <button type="button" onClick={child.press} aria-current={child.active ? "page" : undefined} className={cn(navCls.pill, navCls.pillText, "whitespace-nowrap", child.active ? cn(navCls.childPillActive, navCls.childPillActiveText) : navCls.childPillIdle)}>
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
    <nav className={cn(navCls.sideCard, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]", className)} aria-label={nav.jumpLabel}>
      <Text as="p" className={navCls.sideTitle}>{nav.title}</Text>
      <ul className={navCls.sideList}>
        {nav.groups.map((group) => (
          <li key={group.id}>
            <button type="button" onClick={group.press} aria-expanded={group.hasChildren ? group.expanded : undefined} className={cn(navCls.sideItem, navCls.sideItemText, "flex w-full items-center gap-2.5 text-left", group.active ? cn(navCls.sideItemActive, navCls.sideItemActiveText, "ring-1 ring-secondary/25") : undefined)}>
              {renderIcon?.(group.icon)}
              <span className="min-w-0 flex-1">{group.label}</span>
              {group.hasChildren ? <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={16} tone="muted" /> : null}
            </button>
            {group.hasChildren && group.expanded ? (
              <ul className={navCls.sideChildList}>
                {group.children.map((child) => (
                  <li key={child.id}>
                    <button type="button" onClick={child.press} aria-current={child.active ? "page" : undefined} className={cn(navCls.sideChild, navCls.sideChildText, "w-full text-left", child.active ? cn(navCls.sideChildActive, navCls.sideChildActiveText) : navCls.sideChildIdleText)}>
                      {child.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

const linkCls = "block rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-snug";

export function KundaliSidebarSubnav({ activeSectionId, renderLink }: KundaliSidebarSubnavProps) {
  const groups = useKundaliSidebarSubnav(activeSectionId);
  return (
    <ul className="ml-2 flex flex-col gap-0.5 border-l border-border/70 pb-1 pl-2">
      {groups.map((group) => {
        const row = group.active ? "bg-secondary/12 text-secondary ring-1 ring-secondary/20" : "text-muted-foreground";
        if (!group.hasChildren) {
          return <li key={group.id}>{renderLink({ hash: group.target, label: group.label, active: group.active, className: cn(linkCls, row) })}</li>;
        }
        return (
          <li key={group.id}>
            <Box className={cn("flex-row items-center rounded-lg", row)} webClassName="flex">
              {renderLink({ hash: group.target, label: group.label, active: group.active, onPress: group.open, className: "min-w-0 flex-1 px-2 py-1.5 text-left text-sm font-medium" })}
              <button type="button" aria-expanded={group.expanded} aria-label={group.label} onClick={group.toggle} className="shrink-0 px-2 py-1.5">
                <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={14} tone="muted" />
              </button>
            </Box>
            {group.expanded ? (
              <ul className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                {group.children.map((child) => (
                  <li key={child.id}>
                    {renderLink({ hash: child.id, label: child.label, active: child.active, className: cn(linkCls, child.active ? "bg-primary/10 text-primary" : "text-muted-foreground") })}
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
