import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useGocharKundaliChart, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  grahas: GocharGrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** When true, omit title (shown in GocharRashyadiBlock header row). */
  hideTitle?: boolean;
};

export function GocharKundaliChart({ className, hideTitle, ...props }: Props) {
  const colors = useThemeColors();
  const chart = useGocharKundaliChart(props);

  return (
    <View className={cn(dainikKrantiClasses.chartCard, className)}>
      {!hideTitle ? (
        <View className={dainikKrantiClasses.chartTitle}>
          <Ionicons name="sparkles-outline" size={16} color={colors.secondary} />
          <Text className={dainikKrantiClasses.chartTitleText} style={nepaliTextStyle()}>
            {chart.title}
          </Text>
        </View>
      ) : null}

      <View className={cn("gap-2", hideTitle ? undefined : dainikKrantiClasses.chartLines)}>
        {chart.lines.map((line, i) => (
          <View key={i} className={dainikKrantiClasses.chartLine}>
            <Text className={dainikKrantiClasses.chartLineText} style={nepaliTextStyle()}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      {chart.houses ? (
        <D1Chart houses={chart.houses} />
      ) : (
        <Text className={dainikKrantiClasses.chartState} style={nepaliTextStyle()}>
          {chart.stateText}
        </Text>
      )}

      {chart.showStatusLegend ? <GrahaStatusLegend className="mt-2" /> : null}

      {chart.dateLine ? (
        <Text className={dainikKrantiClasses.chartDate} style={nepaliTextStyle()}>
          {chart.dateLine}
        </Text>
      ) : null}
    </View>
  );
}
