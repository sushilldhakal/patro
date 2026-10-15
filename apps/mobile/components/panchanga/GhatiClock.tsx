import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useGhatiClock } from "@vedic-patro/features/panchanga";
import { useThemeColors } from "@/lib/theme-context";

import { brand, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
const PANEL_BG = wheel.sky2;
const INK = brand.offWhite;
const INK_MUTED = withAlpha(brand.offWhite, 0.55);
const INK_DIM = withAlpha(brand.offWhite, 0.50);
const INK_SOFT = withAlpha(brand.offWhite, 0.65);
const INK_BODY = withAlpha(brand.offWhite, 0.80);

type Props = {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
};

export function GhatiClock({ sunrise, sunset, timezone }: Props) {
  const colors = useThemeColors();
  /* The display only ever shows whole seconds, so the app ticks once a second. */
  const { vedic, civil, copy } = useGhatiClock({ sunrise, timezone, tickMs: 1000 });

  const panchangAccent = colors.secondary;

  return (
    <View
      className="relative overflow-hidden rounded-xl px-4 pb-4 pt-5 shadow-lg"
      style={{ backgroundColor: PANEL_BG }}
    >
      <Text
        className="text-sm text-center font-semibold tracking-eyebrow-wide"
        style={{ color: INK_MUTED }}
      >
        {copy.title}
      </Text>
      <Text
        className="text-5xl mt-3.5 text-center font-mono font-bold leading-none tracking-tight"
        style={{ color: INK }}
      >
        {vedic.ghati}
        <Text style={{ color: withAlpha(brand.offWhite, 0.40) }}>:</Text>
        {vedic.pala}
        <Text style={{ color: withAlpha(brand.offWhite, 0.40) }}>:</Text>
        <Text className="text-sm" style={{ color: INK_SOFT }}>
          {vedic.vipala}
        </Text>
      </Text>
      <Text
        className="text-sm mt-2 text-center font-semibold tracking-wide"
        style={{ color: panchangAccent }}
      >
        {copy.vedicUnits}
      </Text>

      <View className="mx-5 my-3.5 h-px" style={{ backgroundColor: withAlpha(neutral.white, 0.12) }} />

      <Text
        className="text-xl text-center font-mono font-bold leading-none"
        style={{ color: INK }}
      >
        {civil.hour}:{civil.minute}
        <Text className="text-sm" style={{ color: INK_SOFT }}>
          :{civil.second}
        </Text>
      </Text>
      <Text
        className="text-sm mt-2 text-center font-semibold tracking-wide"
        style={{ color: INK_DIM }}
      >
        {copy.civilUnits}
      </Text>

      <View className="mt-3.5 flex-row flex-wrap items-center justify-center gap-4">
        {sunrise ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sunny-outline" size={14} color={INK_BODY} />
            <Text className="text-sm text-center font-mono" style={{ color: INK_BODY }}>
              {sunrise}
            </Text>
          </View>
        ) : null}
        {sunset ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="moon-outline" size={14} color={INK_BODY} />
            <Text className="text-sm text-center font-mono" style={{ color: INK_BODY }}>
              {sunset}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
