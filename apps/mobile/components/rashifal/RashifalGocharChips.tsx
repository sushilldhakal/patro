import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { RashifalGocharRow } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { toNepaliDigits } from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

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
    <View className="mt-3 border-t border-border/60 pt-3">
      <View className="flex-row flex-wrap gap-1.5">
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
                "flex-row items-center gap-1 rounded-md px-1.5 py-0.5",
                row.vedha_by ? "bg-tone-neutral" : row.favourable ? "bg-tone-good" : "bg-tone-bad",
              )}
            >
              <Text className="text-caption font-semibold">{ne ? row.graha_ne : row.graha_en}</Text>
              <Text className="text-caption font-semibold opacity-80">{toNepaliDigits(row.house, lang)}</Text>
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
        <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {anyVedha ? (
            <View className="flex-row items-center gap-1">
              {flag("shield-outline", colors.mutedForeground)}
              <Text className="text-caption text-muted-foreground">{t("rashifal.flags.vedha")}</Text>
            </View>
          ) : null}
          {anyRetro ? (
            <View className="flex-row items-center gap-1">
              {flag("refresh-outline", colors.secondary)}
              <Text className="text-caption text-muted-foreground">{t("rashifal.flags.retrograde")}</Text>
            </View>
          ) : null}
          {anyCombust ? (
            <View className="flex-row items-center gap-1">
              {flag("flame-outline", colors.destructive)}
              <Text className="text-caption text-muted-foreground">{t("rashifal.flags.combust")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
