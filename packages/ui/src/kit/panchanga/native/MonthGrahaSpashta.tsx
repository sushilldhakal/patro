import { ScrollView, View } from "react-native";
import type { GrahaSpashtaRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthGrahaSpashta } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell, patroStickySubHeadCell } from "@vedic-patro/design-tokens/classes/patro-classes";
import { GrahaStatusBadges } from "./GrahaStatusBadges";
import { PatroTableShell } from "./PatroTableShell";

const th = dainikKrantiClasses.monthTh;
const td = dainikKrantiClasses.monthTd;

type Props = {
  rows: GrahaSpashtaRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  embedded?: boolean;
};

export function MonthGrahaSpashta({ rows, todayKey, loading, empty, embedded }: Props) {
  const m = useMonthGrahaSpashta(rows, { todayKey, loading, empty });

  const table = (
    <View className="min-w-full">
      <Box className="w-full flex-row border-b border-border bg-muted">
        <Box className={cn(th, "min-w-[3rem] pl-3")}>
          <Text className="text-sm font-semibold">{m.head.date}</Text>
        </Box>
        <Box className={cn(th, patroStickyHeadCell, "min-w-[3.5rem]")}>
          <Text className="text-sm font-semibold">{m.head.day}</Text>
        </Box>
        {m.planets.map((p) => (
          <Box key={p.key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] items-center")}>
            <Text className="text-center text-sm font-semibold">{p.label}</Text>
          </Box>
        ))}
        <Box className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
          <Text className="text-center text-sm font-semibold">{m.head.deshaantar}</Text>
        </Box>
        <Box className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
          <Text className="text-center text-sm font-semibold">{m.head.akshamsha}</Text>
        </Box>
        <Box className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] items-center")}>
          <Text className="text-center text-sm font-semibold">{m.head.belaantar}</Text>
        </Box>
      </Box>
      <Box className="w-full flex-row border-b border-border bg-muted/60">
        <Box className="min-w-[6.5rem]" />
        {m.planets.map((p) => (
          <Box key={`sub-${p.key}`} className={cn(th, patroStickySubHeadCell, "min-w-[5.5rem] items-center")}>
            <Text className="text-center text-sm font-normal">{m.subHead.planet}</Text>
          </Box>
        ))}
        <Box className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
          <Text className="text-center text-sm font-normal">{m.subHead.deshaantar}</Text>
        </Box>
        <Box className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
          <Text className="text-center text-sm font-normal">{m.subHead.akshamsha}</Text>
        </Box>
        <Box className={cn(th, patroStickySubHeadCell, "min-w-[4.5rem] items-center")}>
          <Text className="text-center text-sm font-normal">{m.subHead.belaantar}</Text>
        </Box>
      </Box>
      {m.stateText ? (
        <Box className="py-8">
          <Text className={dainikKrantiClasses.stateText}>{m.stateText}</Text>
        </Box>
      ) : (
        m.rows.map((row) => (
          <Box key={row.key} className={cn("w-full flex-row border-b border-border/60", row.isToday && dainikKrantiClasses.rowToday)}>
            <Box className={cn(td, "min-w-[3rem] pl-3")}>
              <Text className="font-num font-semibold">{row.day}</Text>
            </Box>
            <Box className={cn(td, "min-w-[3.5rem]")}>
              <Text>{row.weekday}</Text>
            </Box>
            {row.cells.map((cell) => (
              <Box key={cell.key} className={cn(td, "min-w-[5.5rem] flex-row items-center justify-center gap-1")}>
                <Text className="text-center font-num tabular-nums">{cell.value}</Text>
                <GrahaStatusBadges planetKey={cell.key} isRetrograde={cell.isRetrograde} isCombust={cell.isCombust} size={12} />
              </Box>
            ))}
            <Box className={cn(td, "min-w-[4rem] items-center")}>
              <Text className="text-center font-num tabular-nums">{row.deshaantar}</Text>
            </Box>
            <Box className={cn(td, "min-w-[4rem] items-center")}>
              <Text className="text-center font-num tabular-nums">{row.akshamsha}</Text>
            </Box>
            <Box className={cn(td, "min-w-[4.5rem] items-center")}>
              <Text className="text-center font-num tabular-nums">{row.belaantar}</Text>
            </Box>
          </Box>
        ))
      )}
    </View>
  );

  const footnote = (
    <Text className={dainikKrantiClasses.monthFootnote}>
      {m.footnote.map((run, i) => (
        <Text key={i} className={cn(run.mono && "font-mono", run.strong && "text-foreground")}>
          {run.text}
        </Text>
      ))}
    </Text>
  );

  const scrolled = (
    <ScrollView horizontal showsHorizontalScrollIndicator className="max-w-full">
      {table}
    </ScrollView>
  );

  if (embedded) {
    return (
      <Box className={cn(dainikKrantiClasses.accordionTable, "overflow-hidden")}>
        {scrolled}
        {footnote}
      </Box>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.graha_spashta.title" subtitleKey="dainik.shell.graha_spashta.subtitle">
      {table}
      {footnote}
    </PatroTableShell>
  );
}
