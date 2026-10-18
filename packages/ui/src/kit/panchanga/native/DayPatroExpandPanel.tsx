import { View, useWindowDimensions } from "react-native";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/jyotish/dainikKranti/month-patro-tables";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { useDayPatroExpand } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { breakpoints } from "@vedic-patro/design-tokens";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { layoutGridIcon, sunriseIcon } from "../icons";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";
import { GrahaStatusBadges } from "./GrahaStatusBadges";
import { PatroSolarCorrectionStrip } from "./PatroSolarCorrectionStrip";
import { RashiGlyphIcon } from "./ElementGlyphIcon";

type Props = {
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
};

function SectionHeading({ icon, children }: { icon: typeof layoutGridIcon; children: string }) {
  return (
    <Box className={dainikKrantiClasses.sectionHead}>
      <Icon node={icon} size={16} tone="secondary" />
      <Text className={dainikKrantiClasses.sectionHeadText}>{children}</Text>
    </Box>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const panel = useDayPatroExpand({ lagna, graha, notes });
  const { width } = useWindowDimensions();
  const lagnaCols = width >= breakpoints.xl ? 12 : width >= breakpoints.md ? 6 : 4;
  const grahaCols = width >= breakpoints.lg ? 4 : width >= breakpoints.md ? 3 : 2;
  const tabbed = width < breakpoints.md && panel.hasTabs;
  const show = (id: string) => !tabbed || panel.tab === id;

  return (
    <Box className={cn(dainikKrantiClasses.expandRoot, "gap-4")}>
      {tabbed ? (
        <Box className={dainikKrantiClasses.expandTabs}>
          {panel.tabs.map((x) => (
            <Pressable
              key={x.id}
              role="tab"
              selected={x.active}
              onPress={x.select}
              className={cn(dainikKrantiClasses.expandTab, x.active ? dainikKrantiClasses.expandTabOn : dainikKrantiClasses.expandTabOff)}
            >
              <Text className={cn("text-center text-sm font-semibold", x.active ? "text-secondary" : "text-muted-foreground")}>
                {x.label}
              </Text>
            </Pressable>
          ))}
        </Box>
      ) : null}
      {panel.lagna && show("lagna") ? (
        <Box className="w-full min-w-0">
          {tabbed ? null : <SectionHeading icon={layoutGridIcon}>{panel.lagna.title}</SectionHeading>}
          <Box className="-m-1 flex-row flex-wrap">
            {panel.lagna.cells.map((c) => (
              <View key={c.key} style={{ width: `${100 / lagnaCols}%` }} className="p-1">
                <Box className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell)}>
                  <Box className="items-center">
                    <RashiGlyphIcon name={c.rashiNe} number={c.number} size={22} />
                  </Box>
                  <Text className={cn(dainikKrantiClasses.lagnaName, "text-center")}>{c.name}</Text>
                  <Text className={cn(dainikKrantiClasses.lagnaTime, "text-center", c.late ? dainikKrantiClasses.lateText : "text-foreground")}>
                    {c.time}
                  </Text>
                </Box>
              </View>
            ))}
          </Box>
        </Box>
      ) : null}
      {panel.graha && show("graha") ? (
        <Box className="w-full min-w-0 gap-3">
          {tabbed ? null : <SectionHeading icon={sunriseIcon}>{panel.graha.title}</SectionHeading>}
          <Box className="-m-1 flex-row flex-wrap">
            {panel.graha.cells.map((cell) => (
              <View key={cell.key} style={{ width: `${100 / grahaCols}%` }} className="p-1">
                <Box className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}>
                  <Box className={dainikKrantiClasses.grahaNameRow}>
                    <GrahaPlanetIcon graha={cell.key as GrahaKey} size={20} />
                    <Text className={dainikKrantiClasses.grahaNameText}>{cell.name}</Text>
                    <GrahaStatusBadges planetKey={cell.key} isRetrograde={cell.isRetrograde} isCombust={cell.isCombust} size={12} />
                  </Box>
                  <Text className={dainikKrantiClasses.grahaCoords}>
                    <Text className={cn(dainikKrantiClasses.grahaCoords, dainikKrantiClasses.grahaRashi, "mt-0")}>{cell.rashi}</Text> {cell.coords}
                  </Text>
                </Box>
              </View>
            ))}
          </Box>
          <PatroSolarCorrectionStrip {...panel.graha.solar} />
        </Box>
      ) : null}
      {panel.notes.length > 0 && show("notes") ? (
        <Box className="w-full min-w-0 gap-1.5">
          {panel.notes.map((n) => (
            <Text key={n.key} className={dainikKrantiClasses.noteText}>
              {n.text}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
