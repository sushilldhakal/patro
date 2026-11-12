import { ScrollView } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useKundaliSectionNav, useKundaliSidebarSubnav } from "@vedic-patro/features/kundali";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { KundaliSectionNavProps, KundaliSidebarSubnavProps } from "../contract";
import { iconChevronDown, iconChevronUp } from "../icons";

const navCls = kundaliDetailClasses.sectionNav;

export function KundaliSectionNav({ activeId, onNavigate, className, variant = "sidebar", renderIcon }: KundaliSectionNavProps) {
  const nav = useKundaliSectionNav({ activeId, onNavigate });
  if (variant === "horizontal") {
    return (
      <Box className={cn("mb-4 gap-2", className)} label={nav.jumpLabel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box nativeClassName="flex-row" className="gap-2 pb-1">
            {nav.groups.map((group) => (
              <Pressable key={group.id} onPress={group.press} selected={group.active} className={cn(navCls.pill, group.active ? navCls.pillActive : navCls.pillIdle)}>
                {renderIcon?.(group.icon)}
                <Text className={cn(navCls.pillText, group.active ? navCls.pillActiveText : navCls.pillIdleText)}>{group.label}{group.hasChildren ? (group.expanded ? " ▾" : " ▸") : ""}</Text>
              </Pressable>
            ))}
          </Box>
        </ScrollView>
        {nav.expandedChildren.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Box nativeClassName="flex-row" className="gap-2 pb-1">
              {nav.expandedChildren.map((child) => (
                <Pressable key={child.id} onPress={child.press} selected={child.active} className={cn(navCls.pill, child.active ? navCls.childPillActive : navCls.childPillIdle)}>
                  <Text className={cn(navCls.pillText, child.active ? navCls.childPillActiveText : navCls.pillIdleText)}>{child.label}</Text>
                </Pressable>
              ))}
            </Box>
          </ScrollView>
        ) : null}
      </Box>
    );
  }
  return (
    <Box className={cn(navCls.sideCard, className)} label={nav.jumpLabel}>
      <Text className={navCls.sideTitle}>{nav.title}</Text>
      <Box className={navCls.sideList}>
        {nav.groups.map((group) => (
          <Box key={group.id}>
            <Pressable onPress={group.press} selected={group.active} className={cn(navCls.sideItem, group.active ? navCls.sideItemActive : undefined)}>
              {renderIcon?.(group.icon)}
              <Text className={cn(navCls.sideItemText, group.active ? navCls.sideItemActiveText : navCls.pillIdleText)}>{group.label}</Text>
              {group.hasChildren ? <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={16} tone="muted" /> : null}
            </Pressable>
            {group.hasChildren && group.expanded ? (
              <Box className={navCls.sideChildList}>
                {group.children.map((child) => (
                  <Pressable key={child.id} onPress={child.press} selected={child.active} className={cn(navCls.sideChild, child.active && navCls.sideChildActive)}>
                    <Text className={cn(navCls.sideChildText, child.active ? navCls.sideChildActiveText : navCls.sideChildIdleText)}>{child.label}</Text>
                  </Pressable>
                ))}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function KundaliSidebarSubnav({ activeSectionId, renderLink }: KundaliSidebarSubnavProps) {
  const groups = useKundaliSidebarSubnav(activeSectionId);
  const sub = kundaliDetailClasses.sidebarSubnav;
  return (
    <Box className={sub.list}>
      {groups.map((group) => {
        /* A group with an open child is shown by its open list, not a second highlight. */
        const childActive = group.children.some((child) => child.active);
        const rowActive = group.active && !childActive;
        return (
          <Box key={group.id}>
            {/* The chevron sits on the label's row: as a block of its own it dropped onto an empty line. */}
            <Box className={cn(sub.row, rowActive && sub.rowActive)}>
              {renderLink({
                hash: group.target,
                label: group.label,
                active: rowActive,
                onPress: group.hasChildren ? group.open : undefined,
                className: sub.link,
              })}
              {group.hasChildren ? (
                <Pressable onPress={group.toggle} label={group.label} className={sub.toggle}>
                  <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={14} tone="muted" />
                </Pressable>
              ) : null}
            </Box>
            {group.hasChildren && group.expanded ? (
              <Box className={sub.children}>
                {group.children.map((child) => (
                  <Box key={child.id}>
                    {renderLink({ hash: child.id, label: child.label, active: child.active, child: true, className: cn(sub.child, child.active && sub.childActive) })}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
