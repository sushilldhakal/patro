import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
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
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

/** Section tabs nested under जन्मकुण्डली — mirrors web `KundaliSidebarSubnav`. */
export function KundaliSidebarSubnav({
  activeSectionId,
  onNavigate,
}: {
  activeSectionId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
}) {
  const { lang } = useLocale();
  const colors = useThemeColors();
  const activeGroup = navGroupIdForSection(activeSectionId);
  const [expandedId, setExpandedId] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setExpandedId(activeGroup);
  }, [activeGroup]);

  return (
    <View className="ml-2 gap-0.5 border-l border-border/70 py-1 pl-2">
      {KUNDALI_NAV_GROUPS.map((group) => {
        const hasChildren = "children" in group;
        const active = isGroupActive(group.id, activeSectionId);
        const expanded = expandedId === group.id;
        const children = hasChildren ? group.children : [];
        const defaultChild = defaultChildForGroup(group.id) ?? children[0]?.id;

        if (!hasChildren) {
          return (
            <Pressable
              key={group.id}
              onPress={() => onNavigate(group.id as KundaliSectionId)}
              className="rounded-lg px-2 py-1.5"
              style={
                active
                  ? {
                      backgroundColor: colorWithAlpha(colors.secondary, 0.12),
                      borderWidth: 1,
                      borderColor: colorWithAlpha(colors.secondary, 0.2),
                    }
                  : undefined
              }
            >
              <Text
                className={cn(
                  "text-caption",
                  active ? "font-semibold text-secondary" : "text-muted-foreground",
                )}
                style={nepaliTextStyle(12)}
              >
                {kundaliSectionLabel(group, lang)}
              </Text>
            </Pressable>
          );
        }

        return (
          <View key={group.id}>
            <View
              className="flex-row items-center rounded-lg"
              style={
                active
                  ? {
                      backgroundColor: colorWithAlpha(colors.secondary, 0.12),
                      borderWidth: 1,
                      borderColor: colorWithAlpha(colors.secondary, 0.2),
                    }
                  : undefined
              }
            >
              <Pressable
                onPress={() => {
                  if (defaultChild) onNavigate(defaultChild);
                  setExpandedId(group.id);
                }}
                className="min-w-0 flex-1 px-2 py-1.5"
              >
                <Text
                  className={cn(
                    "text-caption",
                    active ? "font-semibold text-secondary" : "text-muted-foreground",
                  )}
                  style={nepaliTextStyle(12)}
                >
                  {kundaliSectionLabel(group, lang)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : group.id)}
                className="px-2 py-1.5"
              >
                <Text className="text-caption text-muted-foreground">{expanded ? "▾" : "▸"}</Text>
              </Pressable>
            </View>
            {expanded
              ? children.map((child) => {
                  const childActive = isChildActive(child.id, activeSectionId);
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => onNavigate(child.id)}
                      className="ml-2 rounded-lg py-1.5 pl-3 pr-2"
                      style={
                        childActive
                          ? { backgroundColor: colorWithAlpha(colors.primary, 0.12) }
                          : undefined
                      }
                    >
                      <Text
                        className={cn(
                          "text-caption",
                          childActive ? "font-semibold text-primary" : "text-muted-foreground",
                        )}
                        style={nepaliTextStyle(12)}
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
  );
}
