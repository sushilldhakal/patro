import { ScrollView } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
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
  return (
    <Box className="ml-2 gap-0.5 border-l border-border/70 py-1 pl-2">
      {groups.map((group) => (
        <Box key={group.id}>
          {renderLink({
            hash: group.hasChildren ? group.target : group.target,
            label: group.label,
            active: group.active,
            onPress: group.hasChildren ? group.open : undefined,
            className: cn("rounded-lg px-2 py-1.5", group.active ? "bg-secondary/12" : undefined),
          })}
          {group.hasChildren ? (
            <Pressable onPress={group.toggle} label={group.label} className="px-2 py-1.5">
              <Icon node={group.expanded ? iconChevronUp : iconChevronDown} size={14} tone="muted" />
            </Pressable>
          ) : null}
          {group.expanded ? group.children.map((child) => (
            <Box key={child.id}>
              {renderLink({ hash: child.id, label: child.label, active: child.active, className: cn("ml-2 rounded-lg py-1.5 pl-3", child.active ? "bg-primary/10" : undefined) })}
            </Box>
          )) : null}
        </Box>
      ))}
    </Box>
  );
}
