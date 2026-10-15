import { __iconNode as arrowLeftRight } from "lucide-react/dist/esm/icons/arrow-left-right.mjs";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";

export type PatroHeaderTab = { key: string; label: string; active: boolean; onPress: () => void };

/** The segmented toggle of the calendar headers (e.g. वि.सं. | पञ्चाङ्ग, अहोरात्र | दिन-रात). */
export function PatroHeaderTabs({ tabs, label, className }: { tabs: PatroHeaderTab[]; label?: string; className?: string }) {
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

/** Phone form of {@link PatroHeaderTabs}: one button that offers the view that is not active. */
export function PatroHeaderSwap({ tabs, className }: { tabs: PatroHeaderTab[]; className?: string }) {
  const other = tabs.find((tab) => !tab.active);
  if (!other || tabs.length !== 2) return null;
  return (
    <Box className={className}>
      <Pressable label={other.label} onPress={other.onPress} className={cls.swapButton} webClassName="hover:bg-muted">
        <Icon node={arrowLeftRight} size="sm" tone="secondary" />
        <Text className={cls.swapLabel}>{other.label}</Text>
      </Pressable>
    </Box>
  );
}
