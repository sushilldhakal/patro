import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Text } from "@/components/ui/Text";
import type { GocharGraha } from "@/lib/api";
import { grahaRashiNe } from "@/lib/dainikKranti/gochar-display";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
} from "@/lib/gochar-page-utils";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/** Left stripe colour per graha — matches the web PLANET_STRIPE palette. */
const PLANET_STRIPE: Record<GrahaKey, string> = {
  sun: "#f59e0b",
  moon: "#94a3b8",
  mars: "#ef4444",
  mercury: "#10b981",
  jupiter: "#f97316",
  venus: "#0ea5e9",
  saturn: "#6366f1",
  rahu: "#8b5cf6",
  ketu: "#e11d48",
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className="text-body" style={nepaliTextStyle(13)}>
      <Text className="text-muted-foreground">{label}</Text>{" "}
      <Text className="font-semibold text-foreground">{value}</Text>
    </Text>
  );
}

export function GocharSkySection({
  gochar,
  dateLabel,
  onSelectPlanet,
}: {
  gochar: Record<string, GocharGraha>;
  dateLabel: string;
  onSelectPlanet?: (key: GrahaKey) => void;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="border-b border-border bg-muted/30 px-4 py-4">
        <Text
          style={{ color: colors.secondary, letterSpacing: 1.2, ...nepaliTextStyle(11) }}
          className="text-caption font-bold uppercase"
        >
          {pick("आकाश एक नजरमा", "The sky at a glance")}
        </Text>
        <Text
          className="text-title mt-1.5 font-bold text-foreground"
          style={nepaliTextStyle(18)}
        >
          {pick("प्रत्यक्ष ग्रह स्थिति", "Live graha positions")}
        </Text>
        <Text className="text-body mt-1 font-semibold text-muted-foreground" style={nepaliTextStyle(13)}>
          {dateLabel}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2.5 p-3">
        {GRAHA_DETAIL_ORDER.map((key) => {
          const g = gochar[key];
          if (!g) return null;
          const name = pick(GRAHA_NAME[key].ne, GRAHA_NAME[key].en);
          const rashi = lang === "en" ? (g.rashi ?? "") : (grahaRashiNe(g) ?? g.rashi_ne ?? "");
          const deg =
            g.deg_in_rashi != null ? `${digits(g.deg_in_rashi.toFixed(1))}°` : "—";
          const exalted = grahaExalted(key, g);
          const untilAd = g.next_rashi_entry?.entry_time_local?.slice(0, 10);

          return (
            <Pressable
              key={key}
              onPress={() => onSelectPlanet?.(key)}
              style={{ width: cardWidth as never, borderColor: colors.border }}
              className="overflow-hidden rounded-xl border bg-background active:opacity-90"
            >
              <View
                style={{ backgroundColor: PLANET_STRIPE[key] }}
                className="absolute bottom-0 left-0 top-0 z-10 w-1"
              />

              <View className="flex-row items-center gap-2.5 border-b border-border bg-muted/25 py-2.5 pl-4 pr-3">
                <GrahaPlanetIcon graha={key} size={32} />
                <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-1.5">
                  <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
                    {name}
                  </Text>
                  <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
                    {rashi}
                  </Text>
                  <Text className="text-body font-num text-foreground">{deg}</Text>
                  {g.is_retrograde ? (
                    <Text style={{ color: colors.danger }} className="text-caption font-bold">
                      ℞
                    </Text>
                  ) : null}
                </View>
                {exalted ? (
                  <View
                    style={{ backgroundColor: "rgba(245,158,11,0.12)" }}
                    className="shrink-0 rounded-md px-1.5 py-0.5"
                  >
                    <Text
                      style={{ color: colors.primary, ...nepaliTextStyle(10) }}
                      className="text-caption font-bold"
                    >
                      {pick("उच्च", "Exalted")}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="gap-1 py-2.5 pl-4 pr-3">
                <MetaRow
                  label={pick("नक्षत्र", "Nakshatra")}
                  value={grahaNakshatraLine(g, lang, digits)}
                />
                <MetaRow label={pick("गति", "Motion")} value={motionLabel(g, lang)} />
              </View>

              {untilAd ? (
                <View className="border-t border-border bg-muted/15 py-2 pl-4 pr-3">
                  <Text
                    className="text-body text-muted-foreground"
                    style={nepaliTextStyle(12)}
                  >
                    {lang === "en"
                      ? `In ${rashi} until ${formatGocharPatroDate(untilAd, lang)}`
                      : `${rashi} मा ${formatGocharPatroDate(untilAd, lang)} सम्म`}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function GocharSectionIcon() {
  const colors = useThemeColors();
  return <Ionicons name="planet-outline" size={26} color={colors.secondary} />;
}
