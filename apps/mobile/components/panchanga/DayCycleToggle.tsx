import { Pressable, View, type TextStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { dayCycleToggleMetrics } from "@/lib/day-cycle-toggle-metrics";
import { NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { useThemeColors } from "@/lib/theme-context";

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
    paddingTop: 0,
    paddingVertical: 0,
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
        className="items-center justify-center rounded-md border border-border bg-card active:bg-muted"
        style={[shell, { paddingHorizontal: padX }]}
      >
        <Text className="font-semibold text-foreground" style={labelStyle}>
          {pick(inactive.ne, inactive.en)}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      className="flex-row overflow-hidden rounded-md border border-border"
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
              active ? "bg-primary" : "bg-card active:bg-muted",
            )}
            style={{ height, maxHeight: height, paddingHorizontal: padX }}
          >
            <Text
              className={cn("font-semibold", active ? "text-primary-foreground" : "text-foreground")}
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
