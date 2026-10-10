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
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

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
  const { lang, pick } = useLocale();
  const colors = useThemeColors();
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
      <View className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
        <Text
          className="text-caption border-b border-border px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {pick("कुण्डली खण्ड", "Chart sections")}
        </Text>
        <View className="gap-1 p-2">
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
                  className={cn("rounded-xl px-3 py-2.5", active ? "bg-secondary/12" : "active:bg-muted")}
                  style={active ? { borderWidth: 1, borderColor: `${colors.secondary}40` } : undefined}
                >
                  <Text
                    className={cn("text-body", active ? "font-semibold text-secondary" : "text-foreground")}
                    style={nepaliTextStyle(14)}
                  >
                    {kundaliSectionLabel(group, lang)}
                    {hasChildren ? (expanded ? " ▾" : " ▸") : ""}
                  </Text>
                </Pressable>
                {hasChildren && expanded
                  ? children.map((child) => {
                      const childActive = isChildActive(child.id, activeId);
                      return (
                        <Pressable
                          key={child.id}
                          onPress={() => onNavigate(child.id)}
                          className="ml-4 rounded-lg py-2 pl-3 pr-2"
                          style={
                            childActive
                              ? { backgroundColor: `${colors.primary}18` }
                              : undefined
                          }
                        >
                          <Text
                            className={cn(
                              "text-body",
                              childActive ? "font-semibold text-primary" : "text-muted-foreground",
                            )}
                            style={nepaliTextStyle(13)}
                          >
                            {kundaliSectionLabel(child, lang)}
                          </Text>
                        </Pressable>
                      );
                    })
                  : null}
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
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
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
              style={{
                backgroundColor: active ? `${colors.secondary}18` : colors.card,
                borderColor: active ? `${colors.secondary}66` : colors.border,
              }}
              className="rounded-full border px-3 py-1.5 active:opacity-80"
            >
              <Text
                className={cn("text-caption whitespace-nowrap", active ? "font-semibold text-secondary" : "text-foreground")}
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
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {children.map((child) => {
            const active = isChildActive(child.id, activeId);
            return (
              <Pressable
                key={child.id}
                onPress={() => onNavigate(child.id)}
                style={{
                  backgroundColor: active ? `${colors.primary}18` : colors.card,
                  borderColor: active ? `${colors.primary}66` : colors.border,
                }}
                className="rounded-full border border-dashed px-3 py-1.5 active:opacity-80"
              >
                <Text
                  className={cn("text-caption whitespace-nowrap", active ? "font-semibold text-primary" : "text-foreground")}
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
