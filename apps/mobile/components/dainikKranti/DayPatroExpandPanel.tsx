import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { PatroSolarCorrectionStrip } from "@/components/dainikKranti/PatroSolarCorrectionStrip";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useDayPatroExpand } from "@vedic-patro/features/dainik-kranti";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

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
  const panel = useDayPatroExpand({ lagna, graha, notes });
  const { width } = useBreakpoint();
  const lagnaCols = width >= 1280 ? 12 : width >= 768 ? 6 : 4;
  const grahaCols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  // <md: one section at a time behind tabs; md+: all stacked.
  const tabbed = width < 768 && panel.hasTabs;
  const show = (id: string) => !tabbed || panel.tab === id;

  return (
    <View className={cn(dainikKrantiClasses.expandRoot, "gap-4")}>
      {tabbed ? (
        <View accessibilityRole="tablist" className={dainikKrantiClasses.expandTabs}>
          {panel.tabs.map((x) => (
            <Pressable
              key={x.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: x.active }}
              onPress={x.select}
              className={cn(
                dainikKrantiClasses.expandTab,
                x.active ? dainikKrantiClasses.expandTabOn : dainikKrantiClasses.expandTabOff,
              )}
            >
              <Text
                className={cn(
                  "text-center text-sm font-semibold",
                  x.active ? "text-secondary" : "text-muted-foreground",
                )}
                style={nepaliTextStyle()}
              >
                {x.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {panel.lagna && show("lagna") ? (
        <View className="w-full min-w-0">
          {tabbed ? null : <SectionHeading icon="grid-outline">{panel.lagna.title}</SectionHeading>}
          <View className="-m-1 flex-row flex-wrap">
            {panel.lagna.cells.map((c) => (
              <View key={c.key} style={{ width: `${100 / lagnaCols}%` }} className="p-1">
                <View className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell)}>
                  <View className="items-center">
                    <RashiGlyphIcon name={c.rashiNe} number={c.number} size={22} />
                  </View>
                  <Text className={cn(dainikKrantiClasses.lagnaName, "text-center")} style={nepaliTextStyle()}>
                    {c.name}
                  </Text>
                  <Text
                    className={cn(
                      dainikKrantiClasses.lagnaTime,
                      "text-center",
                      c.late ? dainikKrantiClasses.lateText : "text-foreground",
                    )}
                    style={nepaliTextStyle()}
                  >
                    {c.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {panel.graha && show("graha") ? (
        <View className="w-full min-w-0 gap-3">
          {tabbed ? null : <SectionHeading icon="planet-outline">{panel.graha.title}</SectionHeading>}
          <View className="-m-1 flex-row flex-wrap">
            {panel.graha.cells.map((cell) => (
              <View key={cell.key} style={{ width: `${100 / grahaCols}%` }} className="p-1">
                <View className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}>
                  <View className={dainikKrantiClasses.grahaNameRow}>
                    <GrahaPlanetIcon graha={cell.key as GrahaKey} size={20} />
                    <Text className={dainikKrantiClasses.grahaNameText} style={nepaliTextStyle()}>
                      {cell.name}
                    </Text>
                    <GrahaStatusBadges
                      planetKey={cell.key}
                      isRetrograde={cell.isRetrograde}
                      isCombust={cell.isCombust}
                      size={12}
                    />
                  </View>
                  <Text className={dainikKrantiClasses.grahaCoords} style={nepaliTextStyle()}>
                    <Text className={cn(dainikKrantiClasses.grahaCoords, dainikKrantiClasses.grahaRashi, "mt-0")}>
                      {cell.rashi}
                    </Text>{" "}
                    {cell.coords}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <PatroSolarCorrectionStrip {...panel.graha.solar} />
        </View>
      ) : null}

      {panel.notes.length > 0 && show("notes") ? (
        <View className="w-full min-w-0 gap-1.5">
          {panel.notes.map((n) => (
            <Text key={n.key} className={dainikKrantiClasses.noteText} style={nepaliTextStyle()}>
              {n.text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
