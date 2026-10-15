import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { useKundaliSectionNav } from "@vedic-patro/features/kundali";
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
  const nav = useKundaliSectionNav({ activeId, onNavigate });

  if (variant === "sidebar") {
    return (
      <View className={cn(kundaliDetailClasses.sectionNav.sideCard, "overflow-hidden", className)} accessibilityLabel={nav.jumpLabel}>
        <Text
          className={kundaliDetailClasses.sectionNav.sideTitle}
          style={nepaliTextStyle(12)}
        >
          {nav.title}
        </Text>
        <View className={kundaliDetailClasses.sectionNav.sideList}>
          {nav.groups.map((group) => (
            <View key={group.id}>
              <Pressable
                onPress={group.press}
                accessibilityState={group.hasChildren ? { expanded: group.expanded } : { selected: group.active }}
                className={cn(
                  kundaliDetailClasses.sectionNav.sideItem,
                  "border",
                  group.active ? cn(kundaliDetailClasses.sectionNav.sideItemActive, "border-secondary/25") : "border-transparent active:bg-muted",
                )}
              >
                <Text
                  className={cn(kundaliDetailClasses.sectionNav.sideItemText, group.active ? kundaliDetailClasses.sectionNav.sideItemActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
                  style={nepaliTextStyle(14)}
                >
                  {group.label}
                  {group.hasChildren ? (group.expanded ? " ▾" : " ▸") : ""}
                </Text>
              </Pressable>
              {group.hasChildren && group.expanded ? (
                <View className={kundaliDetailClasses.sectionNav.sideChildList}>
                  {group.children.map((child) => (
                    <Pressable
                      key={child.id}
                      onPress={child.press}
                      accessibilityState={{ selected: child.active }}
                      className={cn(kundaliDetailClasses.sectionNav.sideChild, child.active && kundaliDetailClasses.sectionNav.sideChildActive)}
                    >
                      <Text
                        className={cn(
                          kundaliDetailClasses.sectionNav.sideChildText,
                          child.active ? kundaliDetailClasses.sectionNav.sideChildActiveText : kundaliDetailClasses.sectionNav.sideChildIdleText,
                        )}
                        style={nepaliTextStyle(13)}
                      >
                        {child.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className={cn("mb-4 gap-2", className)} accessibilityLabel={nav.jumpLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }}
      >
        {nav.groups.map((group) => (
          <Pressable
            key={group.id}
            onPress={group.press}
            accessibilityState={group.hasChildren ? { expanded: group.expanded } : { selected: group.active }}
            className={cn(
              kundaliDetailClasses.sectionNav.pill,
              "active:opacity-80",
              group.active ? kundaliDetailClasses.sectionNav.pillActive : kundaliDetailClasses.sectionNav.pillIdle,
            )}
          >
            <Text
              className={cn(kundaliDetailClasses.sectionNav.pillText, group.active ? kundaliDetailClasses.sectionNav.pillActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
              style={nepaliTextStyle(12)}
            >
              {group.label}
              {group.hasChildren ? (group.expanded ? " ▾" : " ▸") : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {nav.expandedChildren.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.xs }}
        >
          {nav.expandedChildren.map((child) => (
            <Pressable
              key={child.id}
              onPress={child.press}
              accessibilityState={{ selected: child.active }}
              className={cn(
                kundaliDetailClasses.sectionNav.pill,
                "active:opacity-80",
                child.active ? kundaliDetailClasses.sectionNav.childPillActive : kundaliDetailClasses.sectionNav.childPillIdle,
              )}
            >
              <Text
                className={cn(kundaliDetailClasses.sectionNav.pillText, child.active ? kundaliDetailClasses.sectionNav.childPillActiveText : kundaliDetailClasses.sectionNav.pillIdleText)}
                style={nepaliTextStyle(12)}
              >
                {child.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
