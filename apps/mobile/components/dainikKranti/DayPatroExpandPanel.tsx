import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { PatroSolarCorrectionStrip } from "@/components/dainikKranti/PatroSolarCorrectionStrip";
import {
  PATRO_PLANET_KEYS,
  PATRO_PLANET_NE,
  type CalcNote,
  type GrahaSpashtaRow,
  type LagnaMatrixRow,
} from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

const PLANET_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu",
};

type Props = {
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
};

function SectionHeading({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-2 flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={colors.secondary} />
      <Text className="text-body font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const { lang, pick } = useLocale();
  const isEn = lang === "en";

  return (
    <View className="w-full min-w-0 gap-4 py-2">
      {lagna ? (
        <View className="w-full min-w-0">
          <SectionHeading icon="grid-outline">
            {pick("दैनिक लग्न आरम्भ (बजे)", "Daily lagna start")}
          </SectionHeading>
          <View className="flex-row flex-wrap gap-2">
            {getRashiList("ne").map((rne, i) => {
              const num = i + 1;
              const val = lagna.times[num];
              const late =
                val?.includes("२५") || val?.includes("२६") || val?.includes("२७");
              return (
                <View
                  key={rne}
                  className="min-w-[4.5rem] flex-1 rounded-md border border-border/80 bg-background/80 px-1.5 py-1.5"
                  style={{ maxWidth: "31%" }}
                >
                  <View className="items-center">
                    <RashiGlyphIcon name={rne} number={num} size={22} />
                  </View>
                  <Text className="text-caption text-center text-muted-foreground">
                    {pick(rne, getRashiList("en")[i])}
                  </Text>
                  <Text
                    className={cn(
                      "text-body mt-1 text-center font-num tabular-nums",
                      late ? "text-amber-700 dark:text-amber-300" : "text-foreground",
                    )}
                  >
                    {val ?? "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {graha ? (
        <View className="w-full min-w-0 gap-3">
          <SectionHeading icon="planet-outline">
            {pick("उदयकालिक ग्रहस्पष्ट (सूर्योदय)", "Planetary positions at sunrise")}
          </SectionHeading>
          <View className="flex-row flex-wrap gap-2">
            {PATRO_PLANET_KEYS.map((key) => {
              const cell = graha.planets[key];
              if (!cell) return null;
              const grahaKey = key as GrahaKey;
              return (
                <View
                  key={key}
                  className="min-w-[45%] flex-1 rounded-md border border-border/80 bg-background/80 px-2.5 py-2"
                  style={{ maxWidth: "48%" }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <GrahaPlanetIcon graha={grahaKey} size={20} />
                    <Text className="text-body font-semibold text-foreground">
                      {pick(PATRO_PLANET_NE[key], PLANET_EN[key] ?? PATRO_PLANET_NE[key])}
                    </Text>
                    <GrahaStatusBadges
                      planetKey={key}
                      isRetrograde={cell.isRetrograde}
                      isCombust={cell.isCombust}
                      size={11}
                    />
                  </View>
                  <Text className="text-body mt-0.5 font-num tabular-nums">
                    <Text className="text-foreground">
                      {isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe}
                    </Text>{" "}
                    {cell.coords}
                  </Text>
                </View>
              );
            })}
          </View>
          <PatroSolarCorrectionStrip
            deshaantar={graha.deshaantar}
            akshamsha={graha.akshamsha}
            belaantar={graha.belaantar}
          />
        </View>
      ) : null}

      {notes.length > 0 ? (
        <View className="w-full min-w-0 gap-1.5">
          {notes.map((n) => (
            <Text key={`${n.kind}-${n.text}`} className="text-body text-foreground">
              {pick(n.text, n.textEn ?? n.text)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
