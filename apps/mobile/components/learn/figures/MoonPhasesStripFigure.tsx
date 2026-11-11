/**
 * The seven named phases in a row — the app's drawing of the website's
 * `MoonPhasesStrip`, with the same lit-limb disc at each elongation.
 */
import { View } from "react-native";
import Svg, { G } from "react-native-svg";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useStudyInk } from "@/components/learn/study/study-ink";
import { MoonPhaseDisc } from "./MoonPhaseDiscFigure";

const PHASES = [
  { key: "learn.aunsi", roman: "learn.study.phases.amavasya_roman", E: 0 },
  { key: "learn.study.phases.shukla_moon", roman: "learn.study.phases.shukla_moon_roman", E: 45 },
  { key: "learn.study.phases.first_quarter", roman: "learn.study.phases.first_quarter_roman", E: 90 },
  { key: "learn.purnima", roman: "learn.study.phases.purnima_roman", E: 180 },
  { key: "learn.study.phases.krishna_moon", roman: "learn.study.phases.krishna_moon_roman", E: 225 },
  { key: "learn.study.phases.last_quarter", roman: "learn.study.phases.last_quarter_roman", E: 270 },
  { key: "learn.study.phases.next_amavasya", roman: "learn.study.phases.next_amavasya_roman", E: 354 },
] as const;

const R = 26;

export function MoonPhasesStripFigure() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ink = useStudyInk();
  return (
    <View className="my-4 flex-row flex-wrap justify-center gap-x-3" style={{ rowGap: 18 }}>
      {PHASES.map((p, i) => (
        <View key={`${p.key}-${i}`} className="w-28 items-center gap-1.5">
          <Svg viewBox={`0 0 ${R * 2 + 8} ${R * 2 + 8}`} width={72} height={72}>
            <G transform={`translate(${R + 4},${R + 4})`}>
              <MoonPhaseDisc elongation={p.E} r={R} uid={`ss-mp-${i}`} />
            </G>
          </Svg>
          <Text className="text-center text-sm font-bold leading-tight" style={[nepaliTextStyle(14), { color: ink.ink }]}>
            {t(p.key)}
          </Text>
          {lang === "ne" ? (
            <Text className="text-center text-base tracking-wide" style={[nepaliTextStyle(14), { color: ink.faint }]}>
              {t(p.roman)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
