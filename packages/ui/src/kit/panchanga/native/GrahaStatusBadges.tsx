import { useColorScheme } from "nativewind";
import { G, Path } from "react-native-svg";
import { View } from "react-native";
import { useGrahaStatusBadges, useGrahaStatusLabels } from "@vedic-patro/features/graha";
import { showAsta, showVakri } from "@vedic-patro/domain/graha-status";
import { cn } from "@vedic-patro/domain/utils";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { Icon, Text } from "@vedic-patro/ui";
import { flameIcon, rotateCcwIcon } from "../icons";
import { FLAME_PATH, ROTATE_CCW_PATHS } from "../status-marks";

export type GrahaStatusBadgesProps = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  className?: string;
  size?: number;
};

function useRoles() {
  return mobileRoles(useColorScheme().colorScheme === "dark" ? "dark" : "light");
}

export function GrahaStatusBadges({ planetKey, isRetrograde, isCombust, className, size = 14 }: GrahaStatusBadgesProps) {
  const { vakri, asta, any, labels } = useGrahaStatusBadges({ planetKey, isRetrograde, isCombust });
  if (!any) return null;
  return (
    <View className={cn("flex-row", grahaClasses.statusRow, className)}>
      {vakri ? <Icon node={rotateCcwIcon} size={size} tone="secondary" strokeWidth={2.5} label={labels.retrograde} /> : null}
      {asta ? <Icon node={flameIcon} size={size} tone="destructive" strokeWidth={2.5} label={labels.combust} /> : null}
    </View>
  );
}

export type GrahaStatusMarksProps = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  x: number;
  y: number;
  size?: number;
  vakriColor?: string;
  astaColor?: string;
};

export function GrahaStatusMarksSvg({
  planetKey,
  isRetrograde,
  isCombust,
  x,
  y,
  size = 9,
  vakriColor,
  astaColor,
}: GrahaStatusMarksProps) {
  const palette = useRoles();
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;
  const s = size / 24;
  const gap = size + 0.75;
  let offset = 0;
  const vakriStroke = vakriColor ?? palette.secondary;
  const astaStroke = astaColor ?? palette.destructive;
  return (
    <>
      {vakri ? (
        <G transform={`translate(${x + offset}, ${y}) scale(${s})`}>
          {ROTATE_CCW_PATHS.map((d, i) => (
            <Path key={i} d={d} stroke={vakriStroke} fill="none" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </G>
      ) : null}
      {asta ? (
        <G transform={`translate(${x + (vakri ? offset + gap : offset)}, ${y}) scale(${s})`}>
          <Path d={FLAME_PATH} stroke={astaStroke} fill="none" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      ) : null}
    </>
  );
}

export function GrahaStatusLegend({ className }: { className?: string }) {
  const labels = useGrahaStatusLabels();
  return (
    <View className={cn("flex-row", grahaClasses.statusLegend, className)}>
      <View className={cn("flex-row items-center", grahaClasses.statusLegendItem)}>
        <Icon node={rotateCcwIcon} size={14} tone="secondary" />
        <Text className={grahaClasses.statusLegendText}>{labels.retrograde}</Text>
      </View>
      <View className={cn("flex-row items-center", grahaClasses.statusLegendItem)}>
        <Icon node={flameIcon} size={14} tone="destructive" />
        <Text className={grahaClasses.statusLegendText}>{labels.combust}</Text>
      </View>
    </View>
  );
}
