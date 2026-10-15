import type { ReactNode } from "react";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useDayPatroExpand } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
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

const LAGNA_GRID = "grid w-full min-w-0 grid-cols-4 gap-1.5 sm:gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12";
const GRAHA_GRID = "grid w-full min-w-0 grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4";

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Box className={cn(dainikKrantiClasses.sectionHead, dainikKrantiClasses.sectionHeadText, "hidden md:flex")}>
      <Text as="span" className="text-secondary [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </Text>
      {children}
    </Box>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const panel = useDayPatroExpand({ lagna, graha, notes });
  const pane = (id: string) => (panel.tab === id ? "block" : "hidden md:block");
  return (
    <Box className={cn(dainikKrantiClasses.expandRoot, "space-y-4")}>
      {panel.hasTabs ? (
        <Box className={cn(dainikKrantiClasses.expandTabs, "md:hidden")}>
          {panel.tabs.map((x) => (
            <Pressable
              key={x.id}
              role="tab"
              selected={x.active}
              onPress={x.select}
              className={cn(dainikKrantiClasses.expandTab, x.active ? dainikKrantiClasses.expandTabOn : dainikKrantiClasses.expandTabOff)}
            >
              {x.label}
            </Pressable>
          ))}
        </Box>
      ) : null}
      {panel.lagna ? (
        <Box className={cn("w-full min-w-0", pane("lagna"))}>
          <SectionHeading icon={<Icon node={layoutGridIcon} size={16} tone="secondary" />}>{panel.lagna.title}</SectionHeading>
          <Box className={LAGNA_GRID}>
            {panel.lagna.cells.map((c) => (
              <Box key={c.key} className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell, "text-center")}>
                <Box className="flex justify-center">
                  <RashiGlyphIcon name={c.rashiNe} number={c.number} size={22} />
                </Box>
                <Text as="div" className={dainikKrantiClasses.lagnaName}>
                  {c.name}
                </Text>
                <Text
                  as="div"
                  className={cn(dainikKrantiClasses.lagnaTime, "break-all", c.late ? dainikKrantiClasses.lateText : "text-foreground")}
                >
                  {c.time}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      {panel.graha ? (
        <Box className={cn("w-full min-w-0 space-y-3", pane("graha"))}>
          <SectionHeading icon={<Icon node={sunriseIcon} size={16} tone="secondary" />}>{panel.graha.title}</SectionHeading>
          <Box className={GRAHA_GRID}>
            {panel.graha.cells.map((cell) => (
              <Box key={cell.key} className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}>
                <Box className={cn(dainikKrantiClasses.grahaNameRow, dainikKrantiClasses.grahaNameText)}>
                  <GrahaPlanetIcon graha={cell.key as GrahaKey} size={20} />
                  {cell.name}
                  <GrahaStatusBadges planetKey={cell.key} isRetrograde={cell.isRetrograde} isCombust={cell.isCombust} size={12} />
                </Box>
                <Text as="div" className={cn(dainikKrantiClasses.grahaCoords, "break-words")}>
                  <Text as="span" className={dainikKrantiClasses.grahaRashi}>
                    {cell.rashi}
                  </Text>{" "}
                  {cell.coords}
                </Text>
              </Box>
            ))}
          </Box>
          <PatroSolarCorrectionStrip {...panel.graha.solar} />
        </Box>
      ) : null}
      {panel.notes.length > 0 ? (
        <Box as="ul" className={cn("w-full min-w-0 space-y-1.5 text-sm", pane("notes"))}>
          {panel.notes.map((n) => (
            <Box as="li" key={n.key} className="break-words">
              <Text as="span" className={dainikKrantiClasses.noteText}>
                {n.text}
              </Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
