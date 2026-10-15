import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useKundaliSidebarSubnav, type KundaliSectionId } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

/** Section tabs nested under the kundali item — mirrors web `KundaliSidebarSubnav`. */
export function KundaliSidebarSubnav({
  activeSectionId,
  onNavigate,
}: {
  activeSectionId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
}) {
  const colors = useThemeColors();
  const groups = useKundaliSidebarSubnav(activeSectionId);
  const activeStyle = {
    backgroundColor: colorWithAlpha(colors.secondary, 0.12),
    borderWidth: 1,
    borderColor: colorWithAlpha(colors.secondary, 0.2),
  };

  return (
    <View className="ml-2 gap-0.5 border-l border-border/70 py-1 pl-2">
      {groups.map((group) => {
        const label = (
          <Text className={cn("text-caption", group.active ? "font-semibold text-secondary" : "text-muted-foreground")} style={nepaliTextStyle(12)}>
            {group.label}
          </Text>
        );
        if (!group.hasChildren) {
          return (
            <Pressable key={group.id} onPress={() => onNavigate(group.target)} className="rounded-lg px-2 py-1.5" style={group.active ? activeStyle : undefined}>
              {label}
            </Pressable>
          );
        }

        return (
          <View key={group.id}>
            <View className="flex-row items-center rounded-lg" style={group.active ? activeStyle : undefined}>
              <Pressable
                onPress={() => {
                  onNavigate(group.target);
                  group.open();
                }}
                className="min-w-0 flex-1 px-2 py-1.5"
              >
                {label}
              </Pressable>
              <Pressable onPress={group.toggle} accessibilityLabel={group.label} className="px-2 py-1.5">
                <Text className="text-caption text-muted-foreground">{group.expanded ? "▾" : "▸"}</Text>
              </Pressable>
            </View>
            {group.expanded
              ? group.children.map((child) => (
                  <Pressable
                    key={child.id}
                    onPress={() => onNavigate(child.id)}
                    className="ml-2 rounded-lg py-1.5 pl-3 pr-2"
                    style={child.active ? { backgroundColor: colorWithAlpha(colors.primary, 0.12) } : undefined}
                  >
                    <Text className={cn("text-caption", child.active ? "font-semibold text-primary" : "text-muted-foreground")} style={nepaliTextStyle(12)}>
                      {child.label}
                    </Text>
                  </Pressable>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}
