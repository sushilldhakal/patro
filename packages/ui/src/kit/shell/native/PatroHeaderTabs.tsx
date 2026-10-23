import { useWindowDimensions } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { breakpoints } from "@vedic-patro/design-tokens";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { Box, Icon, Pressable, SelectionFill, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { PatroHeaderSwapProps, PatroHeaderTabsProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Below `md` (the website's breakpoint) a two-option toggle becomes one button offering the other view. */
export function PatroHeaderTabs({ tabs, label, className }: PatroHeaderTabsProps) {
  const { width } = useWindowDimensions();
  if (width < breakpoints.md && tabs.length === 2) {
    return <PatroHeaderSwap tabs={tabs} className={className} />;
  }
  return (
    <Box className={cn(cls.segment, cls.nativeSegmentRow, className)} label={label}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          label={tab.label}
          role="tab"
          selected={tab.active}
          onPress={() => {
            if (!tab.active) haptics.tick();
            tab.onPress();
          }}
          className={cls.nativeSegmentRowItem}
        >
          <SelectionFill active={tab.active} className={cn("rounded-xl", cls.segmentItemActive)} />
          <Text className={cn(cls.segmentLabel, tab.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{tab.label}</Text>
        </Pressable>
      ))}
    </Box>
  );
}

export function PatroHeaderSwap({ tabs, className }: PatroHeaderSwapProps) {
  const dense = useWindowDimensions().width < 420;
  const other = tabs.find((tab) => !tab.active);
  if (!other || tabs.length !== 2) return null;
  return (
    <Pressable
      label={other.label}
      onPress={() => {
        haptics.tick();
        other.onPress();
      }}
      className={cn(cls.swapButton, cls.nativeDenseControl, dense && cls.nativeDenseSwap, className)}
    >
      <Icon node={shellIcons.arrowLeftRight} size="sm" tone="secondary" />
      <Text className={cn(cls.swapLabel, dense && cls.nativeDenseSwapLabel)}>{other.label}</Text>
    </Pressable>
  );
}
