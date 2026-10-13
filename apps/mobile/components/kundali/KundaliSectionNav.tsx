import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import {
  KUNDALI_NAV_GROUPS,
  defaultChildForGroup,
  isChildActive,
  isGroupActive,
  kundaliSectionLabel,
  navGroupIdForSection,
  type KundaliSectionId,
} from "@/lib/kundali/kundali-section-nav";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { space } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
  variant?: "sidebar" | "horizontal";
  className?: string;
};

export function KundaliSectionNav({
  activeId,
  onNavigate,
  variant = "horizontal",
  className,
}: Props) {
  const { t, lang } = useLocale();
  const activeGroup = navGroupIdForSection(activeId);
  const [expandedId, setExpandedId] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setExpandedId(activeGroup);
  }, [activeGroup]);

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

  if (variant === "sidebar") {
    return (
      <View className={cn(kundaliDetailClasses.sectionNav.sideCard, "overflow-hidden", className)}>
        <Text
          className={kundaliDetailClasses.sectionNav.sideTitle}
          style={nepaliTextStyle(12)}
        >
          {t("ui.kundali.chart_sections")}
        </Text>
        <View className={kundaliDetailClasses.sectionNav.sideList}>
          {KUNDALI_NAV_GROUPS.map((group) => {
            const hasChildren = "children" in group;
            const active = isGroupActive(group.id, activeId);
            const expanded = expandedId === group.id;
            const children = hasChildren ? group.children : [];
            return (
              <View key={group.id}>
                <Pressable
                  onPress={() => {
                    if (hasChildren) toggleGroup(group.id);
                    else onNavigate(group.id as KundaliSectionId);
                  }}
                  className={cn(
                    kundaliDetailClasses.sectionNav.sideItem,
                    "border",
                    active ? cn(kundaliDetailClasses.sectionNav.sideItemActive, "border-secondary/25") : "border-transparent active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(kundaliDetailClasses.sectionNav.sideItemText, active ? kundaliDetailClasses.sectionNav.sideItemActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
                    style={nepaliTextStyle(14)}
                  >
                    {kundaliSectionLabel(group, lang)}
                    {hasChildren ? (expanded ? " ▾" : " ▸") : ""}
                  </Text>
                </Pressable>
                {hasChildren && expanded ? (
                  <View className={kundaliDetailClasses.sectionNav.sideChildList}>
                  {children.map((child) => {
                      const childActive = isChildActive(child.id, activeId);
                      return (
                        <Pressable
                          key={child.id}
                          onPress={() => onNavigate(child.id)}
                          className={cn(kundaliDetailClasses.sectionNav.sideChild, childActive && kundaliDetailClasses.sectionNav.sideChildActive)}
                        >
                          <Text
                            className={cn(
                              kundaliDetailClasses.sectionNav.sideChildText,
                              childActive ? kundaliDetailClasses.sectionNav.sideChildActiveText : kundaliDetailClasses.sectionNav.sideChildIdleText,
                            )}
                            style={nepaliTextStyle(13)}
                          >
                            {kundaliSectionLabel(child, lang)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const expandedGroup = KUNDALI_NAV_GROUPS.find(
    (group) => "children" in group && group.id === expandedId,
  );
  const children = expandedGroup && "children" in expandedGroup ? expandedGroup.children : [];

  return (
    <View className={cn("mb-4 gap-2", className)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }}
      >
        {KUNDALI_NAV_GROUPS.map((group) => {
          const hasChildren = "children" in group;
          const active = isGroupActive(group.id, activeId);
          const expanded = expandedId === group.id;
          return (
            <Pressable
              key={group.id}
              onPress={() => {
                if (hasChildren) toggleGroup(group.id);
                else onNavigate(group.id as KundaliSectionId);
              }}
              className={cn(
                kundaliDetailClasses.sectionNav.pill,
                "active:opacity-80",
                active ? kundaliDetailClasses.sectionNav.pillActive : kundaliDetailClasses.sectionNav.pillIdle,
              )}
            >
              <Text
                className={cn(kundaliDetailClasses.sectionNav.pillText, active ? kundaliDetailClasses.sectionNav.pillActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
                style={nepaliTextStyle(12)}
              >
                {kundaliSectionLabel(group, lang)}
                {hasChildren ? (expanded ? " ▾" : " ▸") : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {children.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }}
        >
          {children.map((child) => {
            const active = isChildActive(child.id, activeId);
            return (
              <Pressable
                key={child.id}
                onPress={() => onNavigate(child.id)}
                className={cn(
                  kundaliDetailClasses.sectionNav.pill,
                  "active:opacity-80",
                  active ? kundaliDetailClasses.sectionNav.childPillActive : kundaliDetailClasses.sectionNav.childPillIdle,
                )}
              >
                <Text
                  className={cn(kundaliDetailClasses.sectionNav.pillText, active ? kundaliDetailClasses.sectionNav.childPillActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
                  style={nepaliTextStyle(12)}
                >
                  {kundaliSectionLabel(child, lang)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
