import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { PatroHeaderSwapProps, PatroHeaderTabsProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Segmented toggle (era, day cycle). The phone swap is a sibling the header shows with CSS. */
export function PatroHeaderTabs({ tabs, label, className }: PatroHeaderTabsProps) {
  return (
    <Box className={cn(cls.segment, className)} label={label}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          label={tab.label}
          role="tab"
          selected={tab.active}
          onPress={tab.onPress}
          className={cn(cls.segmentItem, tab.active && cls.segmentItemActive)}
          webClassName={tab.active ? undefined : "hover:bg-muted"}
        >
          <Text className={cn(cls.segmentLabel, tab.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{tab.label}</Text>
        </Pressable>
      ))}
    </Box>
  );
}

/** One button that offers the view that is not active. Shown below the xs breakpoint. */
export function PatroHeaderSwap({ tabs, className }: PatroHeaderSwapProps) {
  const other = tabs.find((tab) => !tab.active);
  if (!other || tabs.length !== 2) return null;
  return (
    <Box className={className}>
      <Pressable label={other.label} onPress={other.onPress} className={cls.swapButton} webClassName="hover:bg-muted">
        <Icon node={shellIcons.arrowLeftRight} size="sm" tone="secondary" />
        <Text className={cls.swapLabel}>{other.label}</Text>
      </Pressable>
    </Box>
  );
}
