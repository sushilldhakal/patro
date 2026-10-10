import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import {
  AYANAMSHA_MODES,
  getAyanamshaModeInfo,
  matchesPanchangaAngas,
  type AyanamshaMode,
} from "@vedic-patro/domain/ayanamsha";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type Props = {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
};

export function AyanamshaSelector({ mode, onModeChange }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const current = getAyanamshaModeInfo(mode);

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <View className="border-b border-border bg-secondary/10 px-3.5 py-2.5">
        <Text
          className="text-caption font-semibold uppercase tracking-wider text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {pick("अयनांश", "Ayanamsha")}
        </Text>
      </View>
      <View className="gap-2.5 px-3.5 py-3">
        <View className="flex-row flex-wrap gap-1.5">
          {AYANAMSHA_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => onModeChange(m.id)}
                style={{
                  backgroundColor: active ? colors.secondary : colors.background,
                  borderColor: active ? colors.secondary : colors.border,
                }}
                className="rounded-lg border px-3 py-2 active:opacity-80"
              >
                <Text
                  style={{ color: active ? "#ffffff" : colors.foreground, ...nepaliTextStyle(13) }}
                  className="text-body"
                >
                  {pick(m.labelNe, m.label)}
                  {m.id === "nepal" ? " ⭐" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick(current.labelNe, current.label)} — {pick(current.taglineNe, current.tagline)}
          {!matchesPanchangaAngas(mode)
            ? pick(
                " यस अयनांशमा ग्रह, लग्न र नक्षत्र पुनः गणना हुन्छ।",
                " Grahas, lagna and nakshatra are recomputed in this ayanamsha.",
              )
            : ""}
        </Text>
      </View>
    </View>
  );
}
