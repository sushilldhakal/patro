import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableHeader, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import type { GrahaSpashtaRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthGrahaSpashta } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  patroStickyHeadCell,
  patroStickySubHeadCell,
} from "@/lib/patro-classes";
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
      <TableHeader>
          <View className={cn(th, "min-w-[3rem] pl-3")}>
            <Text className="text-sm font-semibold">{m.head.date}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[3.5rem]")}>
            <Text className="text-sm font-semibold">{m.head.day}</Text>
          </View>
          {m.planets.map((p) => (
            <View key={p.key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] items-center")}>
              <Text className="text-sm text-center font-semibold">{p.label}</Text>
            </View>
          ))}
          <View className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-sm text-center font-semibold">{m.head.deshaantar}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-sm text-center font-semibold">{m.head.akshamsha}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] items-center")}>
            <Text className="text-sm text-center font-semibold">{m.head.belaantar}</Text>
          </View>
      </TableHeader>

      <TableHeader>
          <View className="min-w-[6.5rem]" />
          {m.planets.map((p) => (
            <View key={`sub-${p.key}`} className={cn(th, patroStickySubHeadCell, "min-w-[5.5rem] items-center")}>
              <Text className="text-center text-sm font-normal">{m.subHead.planet}</Text>
            </View>
          ))}
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-center text-sm font-normal">{m.subHead.deshaantar}</Text>
          </View>
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-center text-sm font-normal">{m.subHead.akshamsha}</Text>
          </View>
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4.5rem] items-center")}>
            <Text className="text-center text-sm font-normal">{m.subHead.belaantar}</Text>
          </View>
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
              <View className={cn(td, "min-w-[3rem] pl-3 font-semibold")}>
                <Text className="font-num font-semibold">{row.day}</Text>
              </View>
              <View className={cn(td, "min-w-[3.5rem]")}>
                <Text>{row.weekday}</Text>
              </View>
              {row.cells.map((cell) => (
                <View key={cell.key} className={cn(td, "min-w-[5.5rem] flex-row items-center justify-center gap-1")}>
                  <Text className="font-num text-center tabular-nums">{cell.value}</Text>
                  <GrahaStatusBadges
                    planetKey={cell.key}
                    isRetrograde={cell.isRetrograde}
                    isCombust={cell.isCombust}
                    size={12}
                  />
                </View>
              ))}
              <View className={cn(td, "min-w-[4rem] items-center")}>
                <Text className="font-num text-center tabular-nums">{row.deshaantar}</Text>
              </View>
              <View className={cn(td, "min-w-[4rem] items-center")}>
                <Text className="font-num text-center tabular-nums">{row.akshamsha}</Text>
              </View>
              <View className={cn(td, "min-w-[4.5rem] items-center")}>
                <Text className="font-num text-center tabular-nums">{row.belaantar}</Text>
              </View>
            </TableRow>
          ))
        )}
    </View>
  );

  const footnote = (
    <Text className={dainikKrantiClasses.monthFootnote} style={nepaliTextStyle()}>
      {m.footnote.map((run, i) => (
        <Text key={i} className={cn(run.mono && "font-mono", run.strong && "text-foreground")}>
          {run.text}
        </Text>
      ))}
    </Text>
  );

  if (embedded) {
    return (
      <View className={cn(dainikKrantiClasses.accordionTable, "overflow-hidden")}>
        {/* Own horizontal scroller — see MonthLagnaMatrix; the footnote stays put. */}
        <TableScrollShell bordered={false} rounded={false} className="max-w-full">
          {table}
        </TableScrollShell>
        {footnote}
      </View>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.graha_spashta.title" subtitleKey="dainik.shell.graha_spashta.subtitle">
      {table}
      {footnote}
    </PatroTableShell>
  );
}
