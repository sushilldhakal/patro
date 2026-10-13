import { Pressable, View, type TextStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { dayCycleToggleMetrics } from "@/lib/day-cycle-toggle-metrics";
import { NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/domain/utils";
import { useThemeColors } from "@/lib/theme-context";
import { space } from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

export type DayCycleMode = "Day-Night" | "Calendar Day";

type Props = {
  mode: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
};

const OPTIONS: Array<{ value: DayCycleMode; ne: string; en: string }> = [
  { value: "Day-Night", ne: "अहोरात्र", en: "Day-Night" },
  { value: "Calendar Day", ne: "दिन-रात", en: "Calendar Day" },
];

function toggleLabelStyle(metrics: ReturnType<typeof dayCycleToggleMetrics>): TextStyle {
  return {
    fontFamily: NOTO_DEVANAGARI_REGULAR,
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    paddingTop: space.none,
    paddingVertical: space.none,
  };
}

/** Phone: single switch button (22px). Tablet+: segmented control (31px). */
export function DayCycleToggle({ mode, onModeChange }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const { isCompact } = useBreakpoint();
  const metrics = dayCycleToggleMetrics(isCompact);
  const { height } = metrics;
  const inactive = OPTIONS.find((o) => o.value !== mode) ?? OPTIONS[0]!;
  const shell = {
    height,
    maxHeight: height,
    alignSelf: "flex-start" as const,
    overflow: "hidden" as const,
  };
  const labelStyle = toggleLabelStyle(metrics);
  const padX = isCompact ? 8 : 10;

  if (isCompact) {
    return (
      <Pressable
        onPress={() => onModeChange?.(inactive.value)}
        accessibilityLabel={pick(`${inactive.ne} मा बदल्नुहोस्`, `Switch to ${inactive.en}`)}
        className={cn("items-center justify-center active:bg-muted", panchangaPageClasses.dayCycle.toggleRadiusMd, panchangaPageClasses.dayCycle.toggleSingle)}
        style={[shell, { paddingHorizontal: padX }]}
      >
        <Text className={cn(panchangaPageClasses.dayCycle.toggleLabel, "text-foreground")} style={labelStyle}>
          {pick(inactive.ne, inactive.en)}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      className={cn("flex-row", panchangaPageClasses.dayCycle.toggleRadiusMd, panchangaPageClasses.dayCycle.toggleGroup)}
      style={{ ...shell, borderColor: colors.border }}
    >
      {OPTIONS.map((o) => {
        const active = mode === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onModeChange?.(o.value)}
            className={cn(
              "items-center justify-center",
              active ? "bg-primary" : cn("bg-card", "active:bg-muted"),
            )}
            style={{ height, maxHeight: height, paddingHorizontal: padX }}
          >
            <Text
              className={cn(panchangaPageClasses.dayCycle.toggleLabel, active ? "text-primary-foreground" : "text-foreground")}
              style={labelStyle}
            >
              {pick(o.ne, o.en)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
