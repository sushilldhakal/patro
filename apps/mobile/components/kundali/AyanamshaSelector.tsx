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
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
};

export function AyanamshaSelector({ mode, onModeChange }: Props) {
  const { t, pick } = useLocale();
  const current = getAyanamshaModeInfo(mode);

  return (
    <View className={cn(kundaliDetailClasses.ayanamsha.card, "mb-4 overflow-hidden border border-border")}>
      <View className={cn(kundaliDetailClasses.ayanamsha.header, "bg-secondary/10")}>
        <Text
          className={kundaliDetailClasses.ayanamsha.heading}
          style={nepaliTextStyle(12)}
        >
          {t("kundali.ayanamsha")}
        </Text>
      </View>
      <View className={kundaliDetailClasses.ayanamsha.body}>
        <View className={kundaliDetailClasses.ayanamsha.chips}>
          {AYANAMSHA_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => onModeChange(m.id)}
                className={cn(
                  kundaliDetailClasses.ayanamsha.chip,
                  "active:opacity-80",
                  active ? kundaliDetailClasses.ayanamsha.chipActive : kundaliDetailClasses.ayanamsha.chipIdle,
                )}
              >
                <Text
                  style={nepaliTextStyle(13)}
                  className={cn(
                    kundaliDetailClasses.ayanamsha.chipText,
                    active ? kundaliDetailClasses.ayanamsha.chipActiveText : kundaliDetailClasses.ayanamsha.chipIdleText,
                  )}
                >
                  {pick(m.labelNe, m.label)}
                  {m.id === "nepal" ? " ⭐" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className={kundaliDetailClasses.ayanamsha.note} style={nepaliTextStyle(13)}>
          {pick(current.labelNe, current.label)} — {pick(current.taglineNe, current.tagline)}
          {!matchesPanchangaAngas(mode)
            ? t("ui.kundali.grahas_lagna_and_nakshatra_are_recomputed")
            : ""}
        </Text>
      </View>
    </View>
  );
}
