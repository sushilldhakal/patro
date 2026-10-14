import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthLagnaMatrix } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { TableHeader, TableHeaderCell, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import { PatroTableShell } from "./PatroTableShell";

type Props = {
  rows: LagnaMatrixRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  embedded?: boolean;
};

const th = "text-sm font-semibold";
const td = cn(dainikKrantiClasses.monthTd, dainikKrantiClasses.monthTdMono);

export function MonthLagnaMatrix({ rows, todayKey, loading, empty, embedded }: Props) {
  const m = useMonthLagnaMatrix(rows, { todayKey, loading, empty });

  const table = (
    <View className="min-w-full">
      <TableHeader>
        <TableHeaderCell minWidth={48} className={cn(th, "pl-3")}>
          <Text className="text-sm font-semibold text-foreground">{m.head.date}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className="text-sm font-semibold text-foreground">{m.head.day}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className={cn(dainikKrantiClasses.th, dainikKrantiClasses.amberText)}>{m.head.rise}</Text>
        </TableHeaderCell>
        {m.rashis.map((r) => (
          <TableHeaderCell key={r.ne} minWidth={60} className={cn(th, patroStickyHeadCell, "items-center")}>
            <RashiGlyphIcon name={r.ne} number={r.number} size={20} />
            <Text className="text-sm text-center font-semibold text-foreground">{r.label}</Text>
          </TableHeaderCell>
        ))}
      </TableHeader>

      {m.stateText ? (
        <View className="py-8">
          <Text className={dainikKrantiClasses.stateText}>{m.stateText}</Text>
        </View>
      ) : (
        m.rows.map((row, rowIndex) => (
          <TableRow
            key={row.key}
            rowIndex={rowIndex}
            highlight={row.isToday}
            borderTop={false}
            className="border-b border-border/60"
          >
            <View className={cn(td, "min-w-[3rem] pl-3 text-left font-semibold")}>
              <Text className="font-num font-semibold">{row.day}</Text>
            </View>
            <View className={cn(td, "min-w-[3.5rem] text-left")}>
              <Text>{row.weekday}</Text>
            </View>
            <View className={cn(td, "min-w-[3.5rem]", dainikKrantiClasses.amberText)}>
              <Text>{row.sunrise}</Text>
            </View>
            {row.times.map((c) => (
              <View key={c.key} className={cn(td, "min-w-[3.75rem]")}>
                <Text className={cn(c.late ? dainikKrantiClasses.lateText : "text-foreground")}>{c.value}</Text>
              </View>
            ))}
          </TableRow>
        ))
      )}
    </View>
  );

  /* Embedded in an accordion there is no PatroTableShell around it, and a table
     with fifteen min-width columns needs its own horizontal scroller or it just
     clips at the screen edge. */
  if (embedded) {
    return (
      <TableScrollShell bordered={false} rounded={false} className="max-w-full">
        {table}
      </TableScrollShell>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.lagna_matrix.title" subtitleKey="dainik.shell.lagna_matrix.subtitle">
      {table}
    </PatroTableShell>
  );
}
