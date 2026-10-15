import { ScrollView, View } from "react-native";
import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthLagnaMatrix } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell } from "@vedic-patro/design-tokens/classes/patro-classes";
import { RashiGlyphIcon } from "./ElementGlyphIcon";
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
      <Box className="w-full flex-row border-b border-border bg-muted">
        <Box className={cn(th, "min-w-[3rem] pl-3")}>
          <Text className="text-sm font-semibold text-foreground">{m.head.date}</Text>
        </Box>
        <Box className={cn(th, patroStickyHeadCell, "min-w-[3.5rem]")}>
          <Text className="text-sm font-semibold text-foreground">{m.head.day}</Text>
        </Box>
        <Box className={cn(th, patroStickyHeadCell, "min-w-[3.5rem]")}>
          <Text className={cn(dainikKrantiClasses.th, dainikKrantiClasses.amberText)}>{m.head.rise}</Text>
        </Box>
        {m.rashis.map((r) => (
          <Box key={r.ne} className={cn(th, patroStickyHeadCell, "min-w-[3.75rem] items-center")}>
            <RashiGlyphIcon name={r.ne} number={r.number} size={20} />
            <Text className="text-center text-sm font-semibold text-foreground">{r.label}</Text>
          </Box>
        ))}
      </Box>
      {m.stateText ? (
        <Box className="py-8">
          <Text className={dainikKrantiClasses.stateText}>{m.stateText}</Text>
        </Box>
      ) : (
        m.rows.map((row) => (
          <Box
            key={row.key}
            className={cn("w-full flex-row border-b border-border/60", row.isToday && dainikKrantiClasses.rowToday)}
          >
            <Box className={cn(td, "min-w-[3rem] pl-3")}>
              <Text className="font-num font-semibold">{row.day}</Text>
            </Box>
            <Box className={cn(td, "min-w-[3.5rem]")}>
              <Text>{row.weekday}</Text>
            </Box>
            <Box className={cn(td, "min-w-[3.5rem]")}>
              <Text className={dainikKrantiClasses.amberText}>{row.sunrise}</Text>
            </Box>
            {row.times.map((c) => (
              <Box key={c.key} className={cn(td, "min-w-[3.75rem]")}>
                <Text className={c.late ? dainikKrantiClasses.lateText : "text-foreground"}>{c.value}</Text>
              </Box>
            ))}
          </Box>
        ))
      )}
    </View>
  );

  if (embedded) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator className="max-w-full">
        {table}
      </ScrollView>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.lagna_matrix.title" subtitleKey="dainik.shell.lagna_matrix.subtitle">
      {table}
    </PatroTableShell>
  );
}
