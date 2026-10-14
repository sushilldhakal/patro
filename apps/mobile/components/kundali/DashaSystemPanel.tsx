import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { DashaTree } from "@/components/kundali/DashaTree";
import type { DashaSystem, DashaTreeResponse } from "@/lib/api";
import { useDashaSystemPanel } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";

import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  /** Controlled tab — used when the kundali section nav names a dasha system. */
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
};

export function DashaSystemPanel({ timeZone, ...input }: Props) {
  const { isTablet } = useBreakpoint();
  const panel = useDashaSystemPanel(input);

  if (!panel.hasAny) return null;

  return (
    <View className={kundaliDetailClasses.dashaSystem.root}>
      <View className={kundaliDetailClasses.subTabs.tabsBar} accessibilityRole="tablist" accessibilityLabel={panel.tabsLabel}>
        {panel.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => panel.setActive(tab.id)}
            accessibilityState={{ selected: tab.selected }}
            className={cn(
              kundaliDetailClasses.subTabs.tab,
              "border active:opacity-80",
              tab.selected
                ? cn(kundaliDetailClasses.subTabs.tabActive, "border-border/60 shadow-sm")
                : "border-transparent",
            )}
          >
            <Text
              className={cn(
                kundaliDetailClasses.subTabs.tabText,
                kundaliDetailClasses.subTabs.tabActiveText,
              )}
              style={nepaliTextStyle(13)}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {panel.birth ? (
        <View className={isTablet ? "flex-row flex-wrap gap-3" : "gap-3"}>
          <View
            className={kundaliDetailClasses.dashaSystem.card}
            style={
              isTablet
                ? { flex: 1, flexBasis: "48%", maxWidth: "100%" }
                : { width: "100%" }
            }
          >
            <Text
              className={kundaliDetailClasses.dashaSystem.cardLabel}
              style={nepaliTextStyle(11)}
              numberOfLines={1}
            >
              {panel.birth.label}
            </Text>
            <View className={cn(kundaliDetailClasses.dashaSystem.lordRow, "flex-wrap")}>
              {panel.birth.grahaKey ? <GrahaPlanetIcon graha={panel.birth.grahaKey} size={28} /> : null}
              <Text className={kundaliDetailClasses.dashaSystem.lord} style={nepaliTextStyle(16)}>
                {panel.birth.lord}
              </Text>
            </View>
            <Text className={kundaliDetailClasses.dashaSystem.balance} style={nepaliTextStyle(12)}>
              {panel.birth.balance}
            </Text>
          </View>
        </View>
      ) : null}

      {panel.tree ? (
        <DashaTree
          tree={panel.tree}
          timeZone={timeZone}
          system={panel.system}
          maxLevel={panel.maxLevel}
          cycleYears={panel.cycleYears}
        />
      ) : (
        <Text className={kundaliDetailClasses.dashaSystem.empty} style={nepaliTextStyle(14)}>
          {panel.empty}
        </Text>
      )}
    </View>
  );
}
