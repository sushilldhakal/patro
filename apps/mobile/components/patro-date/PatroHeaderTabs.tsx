import { __iconNode as arrowLeftRight } from "lucide-react/dist/esm/icons/arrow-left-right";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useBreakpoint } from "@/lib/responsive";

export type PatroHeaderTab = { key: string; label: string; active: boolean; onPress: () => void };

/**
 * The segmented toggle of the calendar headers (वि.सं. | पञ्चाङ्ग, अहोरात्र | दिन-रात).
 * Below 420px a two-option toggle becomes one button offering the other view.
 */
export function PatroHeaderTabs({ tabs, label, className }: { tabs: PatroHeaderTab[]; label?: string; className?: string }) {
  const { width } = useBreakpoint();
  if (width < 420 && tabs.length === 2) {
    const other = tabs.find((tab) => !tab.active);
    if (!other) return null;
    return (
      <Pressable label={other.label} onPress={other.onPress} className={cn(cls.swapButton, cls.nativeDenseControl, className)}>
        <Icon node={arrowLeftRight} size="sm" tone="secondary" />
        <Text className={cls.swapLabel}>{other.label}</Text>
      </Pressable>
    );
  }
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
        >
          <Text className={cn(cls.segmentLabel, tab.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{tab.label}</Text>
        </Pressable>
      ))}
    </Box>
  );
}
