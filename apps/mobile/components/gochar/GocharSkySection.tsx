import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { Text } from "@/components/ui/Text";
import type { GocharGraha } from "@/lib/api";
import { grahaRashiNe } from "@vedic-patro/domain/dainikKranti/gochar-display";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
} from "@vedic-patro/domain/gochar-page-utils";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

import { illustration } from "@vedic-patro/design-tokens";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";
/** Left stripe colour per graha — matches the web PLANET_STRIPE palette. */
const PLANET_STRIPE: Record<GrahaKey, string> = {
  sun: illustration.orange50,
  moon: illustration.sky65,
  mars: illustration.red60,
  mercury: illustration.teal39,
  jupiter: illustration.orange53c,
  venus: illustration.teal48,
  saturn: illustration.blue67,
  rahu: illustration.violet66,
  ketu: illustration.red50,
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className={gocharClasses.metaRow} style={nepaliTextStyle()}>
      <Text className={gocharClasses.metaLabel}>{label}</Text>{" "}
      <Text className={gocharClasses.metaValue}>{value}</Text>
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
    <View className={cn(gocharClasses.skyCard, "border border-border")}>
      <View className={gocharClasses.skyHead}>
        <Text className={gocharClasses.skyEyebrow} style={nepaliTextStyle()}>
          {pick("आकाश एक नजरमा", "The sky at a glance")}
        </Text>
        <Text className={gocharClasses.skyTitle} style={nepaliTextStyle()}>
          {pick("प्रत्यक्ष ग्रह स्थिति", "Live graha positions")}
        </Text>
        <Text className={gocharClasses.skyDate} style={nepaliTextStyle()}>
          {dateLabel}
        </Text>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.skyGrid)}>
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
              style={{ width: cardWidth as never }}
              className={cn(gocharClasses.planetCard, "border border-border active:opacity-90")}
            >
              <View
                style={{ backgroundColor: PLANET_STRIPE[key] }}
                className={gocharClasses.planetStripe}
              />

              <View className={cn("flex-row", gocharClasses.planetHead)}>
                <GrahaPlanetIcon graha={key} size={32} />
                <View className={cn("min-w-0 flex-1 flex-row", gocharClasses.planetTitleWrap)}>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>
                    {name}
                  </Text>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>
                    {rashi}
                  </Text>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>{deg}</Text>
                  <GrahaStatusBadges
                    planetKey={key}
                    isRetrograde={g.is_retrograde}
                    isCombust={g.is_combust}
                    size={13}
                  />
                </View>
                {exalted ? (
                  <View className={gocharClasses.exaltedBadge}>
                    <Text
                      className={gocharClasses.exaltedBadgeText}
                      style={nepaliTextStyle()}
                    >
                      {pick("उच्च", "Exalted")}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className={gocharClasses.planetBody}>
                <MetaRow
                  label={pick("नक्षत्र", "Nakshatra")}
                  value={grahaNakshatraLine(g, lang, digits)}
                />
                <MetaRow label={pick("गति", "Motion")} value={motionLabel(g, lang)} />
              </View>

              {untilAd ? (
                <View className={gocharClasses.planetFooter}>
                  <Text className={gocharClasses.planetFooterText} style={nepaliTextStyle()}>
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
