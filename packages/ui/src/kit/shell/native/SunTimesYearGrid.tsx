import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroSkel } from "@vedic-patro/design-tokens/classes/patro-classes";
import { sunTimesClasses as sun } from "@vedic-patro/design-tokens/classes/sun-times-classes";
import type { SunCell, SunTimesPage } from "@vedic-patro/features/sun-times";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { MatrixRow, SunTimesYearGridProps } from "../contract";
import { shellIcons } from "../icon-nodes";
import { MatrixTable } from "./MatrixTable";

const DAY = "w-12 shrink-0";
const MONTH = "w-[5.25rem] shrink-0";

function Ayana({ cell }: { cell: SunCell }) {
  if (!cell.ayana) return null;
  return <Text className={cell.ayana.north ? sun.ayanaNorth : sun.ayanaSouth}>{cell.ayana.short}</Text>;
}

function Legend({ page, hideHeader }: { page: SunTimesPage; hideHeader?: boolean }) {
  const { copy } = page;
  return (
    <Box className={cn("flex-row flex-wrap", sun.legend)}>
      {hideHeader ? null : (
        <Box className="min-w-0 flex-1">
          <Text className={sun.legendTitle}>{copy.gridTitle}</Text>
          <Text className={sun.legendSub}>{copy.subtitle}</Text>
        </Box>
      )}
      <Box className={cn("flex-row flex-wrap", sun.legendItems)}>
        <Box className={cn("flex-row", sun.legendItem)}>
          <Icon node={shellIcons.sunrise} size="sm" tone="warning" />
          <Text className={sun.legendLabel}>{copy.sunrise}</Text>
        </Box>
        <Box className={cn("flex-row", sun.legendItem)}>
          <Icon node={shellIcons.sunset} size="sm" tone="destructive" />
          <Text className={sun.legendLabel}>{copy.sunset}</Text>
        </Box>
        <Box className={cn("flex-row", sun.legendItem)}>
          <Text className={sun.ayanaNorth}>{copy.northMark}</Text>
          <Text className={sun.legendLabel}>{copy.northLabel}</Text>
        </Box>
        <Box className={cn("flex-row", sun.legendItem)}>
          <Text className={sun.ayanaSouth}>{copy.southMark}</Text>
          <Text className={sun.legendLabel}>{copy.southLabel}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function YearMatrix({ page }: { page: SunTimesPage }) {
  const header: MatrixRow = {
    key: "months",
    cells: [
      { key: "day", children: page.copy.colDay, className: cn(DAY, "sticky left-0 z-[4]", sun.matrixDayHead, sun.matrixDayHeadText) },
      ...page.monthLabels.map((name, idx) => ({
        key: `m-${idx}`,
        children: name || " ",
        className: cn(MONTH, sun.matrixMonthHead, sun.matrixMonthHeadText),
      })),
    ],
  };
  const rows: MatrixRow[] = page.matrix.map((row) => ({
    key: String(row.day),
    cells: [
      { key: "day", scope: "row" as const, children: row.dayLabel, className: cn(DAY, "sticky left-0 z-[2]", sun.matrixDayRowHead, sun.matrixDayRowText) },
      ...row.cells.map((cell, colIdx) => {
        if (!cell) return { key: `c-${colIdx}`, children: null, className: cn(MONTH, sun.matrixCell, sun.matrixCellBlank) };
        const empty = !cell.sunrise && !cell.sunset;
        return {
          key: `c-${colIdx}`,
          title: cell.title,
          className: cn(MONTH, "text-center", sun.matrixCell, page.loading && empty && sun.matrixCellLoading),
          children: page.loading && empty ? (
            <Text className={patroSkel} />
          ) : !empty ? (
            <Box>
              <Text className={cn("block", sun.matrixRise)} numberOfLines={1}>
                {cell.sunrise ?? "—"} <Ayana cell={cell} />
              </Text>
              <Text className={cn("block", sun.matrixSet)} numberOfLines={1}>{cell.sunset ?? "—"}</Text>
            </Box>
          ) : null,
        };
      }),
    ],
  }));
  return <MatrixTable label={page.copy.gridAria} headerRows={[header]} rows={rows} tableClassName="table-fixed text-sm font-semibold font-num" />;
}

function MonthTable({ rows, copy }: { rows: SunCell[]; copy: SunTimesPage["copy"] }) {
  const head = (key: string, label: string, icon?: "sunrise" | "sunset", colSpan = 1) => ({
    key,
    colSpan,
    className: cn(colSpan > 1 ? "flex-[2]" : "flex-1", sun.monthHeadCell, sun.monthHeadText),
    children: icon ? (
      <Box className="flex-row items-center gap-1.5">
        <Icon node={shellIcons[icon]} size="sm" tone={icon === "sunrise" ? "warning" : "destructive"} />
        <Text className={sun.monthHeadText}>{label}</Text>
      </Box>
    ) : (
      label
    ),
  });
  return (
    <MatrixTable
      headerRows={[{ key: "h", className: sun.monthHeadRow, cells: [head("day", copy.colDay), head("ayana", copy.colAyana), head("rise", copy.sunrise, "sunrise", 2), head("set", copy.sunset, "sunset", 2)] }]}
      rows={rows.map((row) => ({
        key: String(row.day),
        className: sun.monthRow,
        cells: [
          { key: "day", className: cn("flex-1", sun.monthCell, sun.monthDayText), children: row.dayLabel },
          { key: "ayana", className: cn("flex-1", sun.monthCell), children: row.ayana ? <Ayana cell={row} /> : "—" },
          { key: "rise", className: cn("flex-[2]", sun.monthCell, sun.monthRiseText), children: row.sunrise ?? "—", colSpan: 2 },
          { key: "set", className: cn("flex-[2]", sun.monthCell, sun.monthSetText), children: row.sunset ?? "—", colSpan: 2 },
        ],
      }))}
    />
  );
}

function Months({ page }: { page: SunTimesPage }) {
  const [open, setOpen] = useState(page.loading ? undefined : page.defaultMonth);
  return (
    <Box className={sun.accordion}>
      {page.months.map((month) => {
        const shown = open === month.key;
        return (
          <Box key={month.key} className={cn("border-b border-border", sun.accordionItem)}>
            <Pressable label={month.label} onPress={() => setOpen(shown ? undefined : month.key)} className={cn("flex-row items-center justify-between", sun.accordionTrigger)}>
              <Text className={sun.accordionTriggerText}>
                {month.label} <Text className={sun.accordionDays}>{month.daysLabel}</Text>
              </Text>
              <Icon node={shown ? shellIcons.chevronUp : shellIcons.chevronDown} size="sm" tone="muted" />
            </Pressable>
            {shown ? (
              <Box className={sun.accordionContent}>
                <MonthTable rows={month.rows} copy={page.copy} />
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

/** Year sun matrix from `lg`, and a month list below that. */
export function SunTimesYearGrid({ page, hideHeader, className }: SunTimesYearGridProps) {
  // Before the early return: a hook after it changes the hook count when a load fails and then succeeds.
  const { width } = useWindowDimensions();
  if (page.status === "error") {
    return (
      <Box className={cn(sun.card, sun.cardClip, className)}>
        <Text className={sun.loadError}>{page.copy.loadError}</Text>
      </Box>
    );
  }
  const wide = width >= 1024;
  return (
    <Box className={cn("max-w-full shadow-ring-soft", sun.card, sun.cardClip, className)}>
      <Legend page={page} hideHeader={hideHeader} />
      {wide ? <YearMatrix page={page} /> : <Months page={page} />}
    </Box>
  );
}
