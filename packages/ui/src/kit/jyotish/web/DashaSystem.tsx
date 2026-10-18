import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useDashaSystemPanel } from "@vedic-patro/features/kundali";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { DashaSystemPanelProps } from "../contract";
import { DashaTree } from "./DashaTree";

export function DashaSystemPanel({ timeZone, renderGraha, ...input }: DashaSystemPanelProps) {
  const panel = useDashaSystemPanel(input);
  if (!panel.hasAny) return null;
  const d = kundaliDetailClasses.dashaSystem;
  const tabs = kundaliDetailClasses.subTabs;
  return (
    <Box className={d.root}>
      <Box className={tabs.tabsBar} label={panel.tabsLabel}>
        {panel.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            role="tab"
            selected={tab.selected}
            onPress={() => panel.setActive(tab.id)}
            className={cn(tabs.tab, tabs.tabText, tab.selected ? cn(tabs.tabActive, tabs.tabActiveText, "shadow-sm ring-1 ring-border/60") : undefined)}
          >
            <Text>{tab.label}</Text>
          </Pressable>
        ))}
      </Box>
      {panel.birth ? (
        <Box className={cn(d.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]")}>
          <Text className={d.cardLabel}>{panel.birth.label}</Text>
          <Box className="flex-row items-center gap-1">{panel.birth.grahaKey ? renderGraha({ graha: panel.birth.grahaKey, size: 28 }) : null}<Text className={d.lord}>{panel.birth.lord}</Text></Box>
          <Text className={d.balance}>{panel.birth.balance}</Text>
        </Box>
      ) : null}
      {panel.tree ? (
        <DashaTree tree={panel.tree} timeZone={timeZone} system={panel.system} maxLevel={panel.maxLevel} cycleYears={panel.cycleYears} renderGraha={renderGraha} />
      ) : (
        <Text className={d.empty}>{panel.empty}</Text>
      )}
    </Box>
  );
}
