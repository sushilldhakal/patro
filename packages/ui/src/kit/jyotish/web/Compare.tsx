import { useDivisionalChartCompare, useDivisionalTableToggle, type DivisionalChartSlot } from "@vedic-patro/features/kundali";
import type { ChartAnchor } from "@vedic-patro/domain/jyotish/varga-display";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { DivisionalChartCompareProps } from "../contract";
import { GrahaDetailsList } from "./Cards";

const c = kundaliDetailClasses.compare;

function SlotView({ compare, slot, props }: { compare: ReturnType<typeof useDivisionalChartCompare>; slot: DivisionalChartSlot; props: DivisionalChartCompareProps }) {
  const toggle = useDivisionalTableToggle();
  const { panel, houses } = slot;
  return (
    <Box className={c.root}>
      <Box className={cn(c.controls, slot.side === "right" && "sm:justify-end")}>
        <label className={c.field}>
          <Text className={c.fieldLabel}>{compare.anchorLabel}</Text>
          <select className={kundaliDetailClasses.parts.selectControl} value={panel.anchor} onChange={(e) => slot.setAnchor(e.target.value as ChartAnchor)}>
            {compare.anchorSelect.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className={c.field}>
          <Text className={c.fieldLabel}>{compare.divisionLabel}</Text>
          <select className={kundaliDetailClasses.parts.selectControl} value={panel.division} onChange={(e) => slot.setDivision(Number(e.target.value))}>
            {compare.divisionSelect.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </Box>
      <Box className={cn(c.chartCard, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
        <Text className={c.chartTitle}>{slot.anchorName} · {slot.vargaShort} — {slot.vargaName}</Text>
        {houses.length > 0 ? props.renderChart(houses) : <Text className={c.empty}>{compare.empty}</Text>}
        {houses.length > 0 && slot.showStatusLegend ? props.renderLegend?.() : null}
      </Box>
      {slot.showTables ? (
        <Box className={c.tableCard}>
          <Box className={c.tableHead}>
            <Box className={c.toggle}>
              {toggle.tabs.map((tab) => (
                <Pressable key={tab.id} role="tab" selected={tab.active} onPress={tab.select} className={cn(c.toggleTab, c.toggleText, tab.active ? cn(c.toggleActive, c.toggleActiveText) : undefined)}>
                  <Text>{tab.label}</Text>
                </Pressable>
              ))}
            </Box>
            <Text className={c.caption}>{slot.anchorName} · {slot.vargaShort}</Text>
          </Box>
          {toggle.tab === "graha" ? (
            <GrahaDetailsList division={panel.division} anchorKey={panel.anchor} vargaCharts={props.vargaCharts} renderGraha={props.renderGraha} />
          ) : props.renderBhava({ division: panel.division, anchorKey: panel.anchor, vargaCharts: props.vargaCharts })}
        </Box>
      ) : null}
    </Box>
  );
}

export function DivisionalChartCompare(props: DivisionalChartCompareProps) {
  const compare = useDivisionalChartCompare(props);
  if (!compare.hasAnchors) return null;
  const body = (
    <Box className="grid gap-4 p-4 lg:grid-cols-2">
      {compare.slots.map((slot) => <SlotView key={slot.side} compare={compare} slot={slot} props={props} />)}
    </Box>
  );
  return props.renderShell ? props.renderShell({ title: compare.sectionTitle, subtitle: compare.sectionSubtitle, children: body }) : body;
}
