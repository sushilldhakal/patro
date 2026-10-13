import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { GocharGraha } from "@/lib/api";
import { buildGocharBhavaHouses, formatGocharBsLabel } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";

type GrahaRow = GocharGraha & { key: string };

type Props = {
  grahas: GrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** When true, omit title (shown in GocharRashyadiBlock header row). */
  hideTitle?: boolean;
};

export function GocharKundaliChart({
  grahas,
  papanshaLine = "",
  gapanshaLine = "",
  dateBs,
  dateAd,
  loading,
  className,
  hideTitle,
}: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const dateLabel = formatGocharBsLabel(dateBs, dateAd);

  return (
    <View className={cn(dainikKrantiClasses.chartCard, className)}>
      {!hideTitle ? (
        <View className={dainikKrantiClasses.chartTitle}>
          <Ionicons name="sparkles-outline" size={16} color={colors.secondary} />
          <Text className={dainikKrantiClasses.chartTitleText} style={nepaliTextStyle()}>
            {pick("गोचर कुण्डली", "Transit Chart")}
          </Text>
        </View>
      ) : null}

      <View className={cn("gap-2", hideTitle ? undefined : dainikKrantiClasses.chartLines)}>
        <View className={dainikKrantiClasses.chartLine}>
          <Text className={dainikKrantiClasses.chartLineText} style={nepaliTextStyle()}>
            {papanshaLine || pick("पापाशाः—", "Papashah —")}
          </Text>
        </View>
        {gapanshaLine ? (
          <View className={dainikKrantiClasses.chartLine}>
            <Text className={dainikKrantiClasses.chartLineText} style={nepaliTextStyle()}>{gapanshaLine}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <Text className={dainikKrantiClasses.chartState} style={nepaliTextStyle()}>
          {pick("लोड हुँदैछ…", "Loading…")}
        </Text>
      ) : grahas.length === 0 ? (
        <Text className={dainikKrantiClasses.chartState} style={nepaliTextStyle()}>
          {pick("विवरण उपलब्ध छैन।", "No details available.")}
        </Text>
      ) : (
        <D1Chart houses={buildGocharBhavaHouses(grahas)} />
      )}

      {dateLabel ? (
        <Text className={dainikKrantiClasses.chartDate} style={nepaliTextStyle()}>
          {pick(`${dateLabel} को स्थिति`, `Position on ${dateLabel}`)}
        </Text>
      ) : null}
    </View>
  );
}
