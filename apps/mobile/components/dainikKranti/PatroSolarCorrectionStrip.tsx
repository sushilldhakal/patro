import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ITEMS = [
  {
    key: "deshaantar" as const,
    ne: "देशान्तर",
    en: "Deshaantar",
    icon: "globe-outline" as const,
  },
  {
    key: "akshamsha" as const,
    ne: "अक्षांश",
    en: "Latitude",
    icon: "navigate-outline" as const,
  },
  {
    key: "belaantar" as const,
    ne: "बेलान्तर",
    en: "Belaantar",
    icon: "time-outline" as const,
  },
];

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const values = { deshaantar, akshamsha, belaantar };
  const visible = SOLAR_ITEMS.filter((item) => values[item.key]);
  if (visible.length === 0) return null;

  return (
    <View className={cn("w-full flex-row flex-wrap gap-2", className)}>
      {visible.map((item) => (
        <View
          key={item.key}
          className={cn(
            "min-w-[30%] flex-1 rounded-md border px-2.5 py-2",
            item.key === "belaantar"
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border/80 bg-background/80",
          )}
          style={{ maxWidth: "48%" }}
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name={item.icon}
              size={14}
              color={item.key === "belaantar" ? colors.secondary : colors.mutedForeground}
            />
            <Text className="text-caption font-semibold text-foreground">
              {pick(item.ne, item.en)}
            </Text>
          </View>
          <Text
            className={cn(
              "text-body mt-1 font-num tabular-nums",
              item.key === "belaantar"
                ? "text-amber-800 dark:text-amber-200"
                : "text-foreground",
            )}
          >
            {values[item.key]}
          </Text>
        </View>
      ))}
    </View>
  );
}
