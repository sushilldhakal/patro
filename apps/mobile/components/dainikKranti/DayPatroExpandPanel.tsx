import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { useState } from "react";
import { Pressable, View } from "react-native";
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
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
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
    <View className={dainikKrantiClasses.sectionHead}>
      <Ionicons name={icon} size={16} color={colors.secondary} />
      <Text className={dainikKrantiClasses.sectionHeadText} style={nepaliTextStyle()}>
        {children}
      </Text>
    </View>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const { t, lang, pick } = useLocale();
  const isEn = lang === "en";
  const { width } = useBreakpoint();
  const lagnaCols = width >= 1280 ? 12 : width >= 768 ? 6 : 4;
  const grahaCols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  const tabs = [
    lagna && { id: "lagna", label: t("kundali.report.meta_lagna") },
    graha && { id: "graha", label: t("panchanga.day_cycle.planets") },
    notes.length > 0 && { id: "notes", label: t("ui.common.notes") },
  ].filter(Boolean) as { id: string; label: string }[];
  const [picked, setPicked] = useState(tabs[0]?.id);
  const tab = tabs.some((x) => x.id === picked) ? picked : tabs[0]?.id;
  // <md: one section at a time behind tabs; md+: all stacked.
  const tabbed = width < 768 && tabs.length > 1;
  const show = (id: string) => !tabbed || tab === id;

  return (
    <View className={cn(dainikKrantiClasses.expandRoot, "gap-4")}>
      {tabbed ? (
        <View accessibilityRole="tablist" className={dainikKrantiClasses.expandTabs}>
          {tabs.map((x) => (
            <Pressable
              key={x.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === x.id }}
              onPress={() => setPicked(x.id)}
              className={cn(
                dainikKrantiClasses.expandTab,
                tab === x.id ? dainikKrantiClasses.expandTabOn : dainikKrantiClasses.expandTabOff,
              )}
            >
              <Text
                className={cn(
                  "text-center text-sm font-semibold",
                  tab === x.id ? "text-secondary" : "text-muted-foreground",
                )}
                style={nepaliTextStyle()}
              >
                {x.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {lagna && show("lagna") ? (
        <View className="w-full min-w-0">
          {tabbed ? null : <SectionHeading icon="grid-outline">
            {t("dainik.daily_lagna_start")}
          </SectionHeading>}
          <View className="-m-1 flex-row flex-wrap">
            {getRashiList("ne").map((rne, i) => {
              const num = i + 1;
              const val = lagna.times[num];
              const late =
                val?.includes(/* copy-ok */ "२५") || val?.includes(/* copy-ok */ "२६") || val?.includes(/* copy-ok */ "२७");
              return (
                <View key={rne} style={{ width: `${100 / lagnaCols}%` }} className="p-1">
                  <View className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell)}>
                    <View className="items-center">
                      <RashiGlyphIcon name={rne} number={num} size={22} />
                    </View>
                    <Text className={cn(dainikKrantiClasses.lagnaName, "text-center")} style={nepaliTextStyle()}>
                      {pick(rne, getRashiList("en")[i])}
                    </Text>
                    <Text
                      className={cn(
                        dainikKrantiClasses.lagnaTime,
                        "text-center",
                        late ? dainikKrantiClasses.lateText : "text-foreground",
                      )}
                      style={nepaliTextStyle()}
                    >
                      {val ?? "—"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {graha && show("graha") ? (
        <View className="w-full min-w-0 gap-3">
          {tabbed ? null : <SectionHeading icon="planet-outline">
            {t("dainik.planetary_positions_at_sunrise")}
          </SectionHeading>}
          <View className="-m-1 flex-row flex-wrap">
            {PATRO_PLANET_KEYS.map((key) => {
              const cell = graha.planets[key];
              if (!cell) return null;
              const grahaKey = key as GrahaKey;
              return (
                <View key={key} style={{ width: `${100 / grahaCols}%` }} className="p-1">
                  <View className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}>
                    <View className={dainikKrantiClasses.grahaNameRow}>
                      <GrahaPlanetIcon graha={grahaKey} size={20} />
                      <Text className={dainikKrantiClasses.grahaNameText} style={nepaliTextStyle()}>
                        {pick(PATRO_PLANET_NE[key], PLANET_EN[key] ?? PATRO_PLANET_NE[key])}
                      </Text>
                      <GrahaStatusBadges
                        planetKey={key}
                        isRetrograde={cell.isRetrograde}
                        isCombust={cell.isCombust}
                        size={12}
                      />
                    </View>
                    <Text className={dainikKrantiClasses.grahaCoords} style={nepaliTextStyle()}>
                      <Text className={cn(dainikKrantiClasses.grahaCoords, dainikKrantiClasses.grahaRashi, "mt-0")}>
                        {isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe}
                      </Text>{" "}
                      {cell.coords}
                    </Text>
                  </View>
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

      {notes.length > 0 && show("notes") ? (
        <View className="w-full min-w-0 gap-1.5">
          {notes.map((n) => (
            <Text key={`${n.kind}-${n.text}`} className={dainikKrantiClasses.noteText} style={nepaliTextStyle()}>
              {pick(n.text, n.textEn ?? n.text)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
