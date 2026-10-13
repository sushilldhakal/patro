import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { RashifalGocharRow } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { toNepaliDigits } from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

/**
 * The nine-graha gochar strip inside "why this reading?" — one chip per graha
 * with its house from the sign, the three transit flags, and a legend for the
 * flags actually shown. Same colours as the web: secondary = वक्री,
 * destructive = अस्त, so one icon means one thing across the app.
 */
export function RashifalGocharChips({ rows }: { rows: RashifalGocharRow[] }) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const ne = lang === "ne";
  if (!rows.length) return null;

  const anyVedha = rows.some((r) => Boolean(r.vedha_by));
  const anyRetro = rows.some((r) => r.retrograde);
  const anyCombust = rows.some((r) => r.combust);

  const flag = (name: keyof typeof Ionicons.glyphMap, color: string, size = 12) => (
    <Ionicons name={name} size={size} color={color} />
  );

  return (
    <View className={cn("mt-3", rashifalClasses.gochar.wrap)}>
      <View className={cn("flex-row flex-wrap", rashifalClasses.gochar.list)}>
        {rows.map((row) => {
          const vedhaName = (ne ? row.vedha_by_ne : row.vedha_by) ?? row.vedha_by;
          return (
            <View
              key={row.graha}
              accessibilityLabel={t("rashifal.gochar_hint", {
                graha: ne ? row.graha_ne : row.graha_en,
                house: toNepaliDigits(row.house, lang),
                sign: ne ? row.sign_ne : row.sign_en,
              })}
              className={cn(
                "flex-row",
                rashifalClasses.gochar.chip,
                row.vedha_by
                  ? rashifalClasses.gochar.toneVedha
                  : row.favourable
                    ? rashifalClasses.gochar.toneGood
                    : rashifalClasses.gochar.toneBad,
              )}
            >
              <Text className={rashifalClasses.gochar.chipText}>{ne ? row.graha_ne : row.graha_en}</Text>
              <Text className={cn(rashifalClasses.gochar.chipText, rashifalClasses.gochar.house)}>{toNepaliDigits(row.house, lang)}</Text>
              {row.vedha_by ? (
                <View accessibilityLabel={vedhaName ? t("rashifal.flags.vedha_by", { graha: vedhaName }) : t("rashifal.flags.vedha")}>
                  {flag("shield-outline", colors.mutedForeground)}
                </View>
              ) : null}
              {row.retrograde ? (
                <View accessibilityLabel={t("rashifal.flags.retrograde")}>{flag("refresh-outline", colors.secondary)}</View>
              ) : null}
              {row.combust ? (
                <View accessibilityLabel={t("rashifal.flags.combust")}>{flag("flame-outline", colors.destructive)}</View>
              ) : null}
            </View>
          );
        })}
      </View>

      {anyVedha || anyRetro || anyCombust ? (
        <View className={cn("flex-row flex-wrap items-center", rashifalClasses.gochar.legend)}>
          {anyVedha ? (
            <View className={cn("flex-row", rashifalClasses.gochar.legendItem)}>
              {flag("shield-outline", colors.mutedForeground)}
              <Text className={rashifalClasses.gochar.legendText}>{t("rashifal.flags.vedha")}</Text>
            </View>
          ) : null}
          {anyRetro ? (
            <View className={cn("flex-row", rashifalClasses.gochar.legendItem)}>
              {flag("refresh-outline", colors.secondary)}
              <Text className={rashifalClasses.gochar.legendText}>{t("rashifal.flags.retrograde")}</Text>
            </View>
          ) : null}
          {anyCombust ? (
            <View className={cn("flex-row", rashifalClasses.gochar.legendItem)}>
              {flag("flame-outline", colors.destructive)}
              <Text className={rashifalClasses.gochar.legendText}>{t("rashifal.flags.combust")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
