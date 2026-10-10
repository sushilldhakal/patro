import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
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

const th = "text-body font-semibold";
const td = "text-body px-2 py-2 text-center font-num tabular-nums";

export function MonthLagnaMatrix({ rows, todayKey, loading, empty, embedded }: Props) {
  const { pick, digits } = useLocale();

  const table = (
    <View className="min-w-full">
      <TableHeader>
        <TableHeaderCell minWidth={48} className={cn(th, "pl-3")}>
          <Text className="text-body font-semibold text-foreground">{pick("गते", "Date")}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className="text-body font-semibold text-foreground">{pick("बा.", "Day")}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className="text-body font-semibold text-amber-600 dark:text-amber-400">
            {pick("सु.उ.", "Rise")}
          </Text>
        </TableHeaderCell>
        {getRashiList("ne").map((rne, i) => (
          <TableHeaderCell key={rne} minWidth={60} className={cn(th, patroStickyHeadCell, "items-center")}>
            <RashiGlyphIcon name={rne} number={i + 1} size={20} />
            <Text className="text-body text-center font-semibold text-foreground">
              {pick(rne, getRashiList("en")[i])}
            </Text>
          </TableHeaderCell>
        ))}
      </TableHeader>

      {loading ? (
        <View className="py-8">
          <Text className="text-body text-center text-muted-foreground">
            {pick("लोड हुँदैछ…", "Loading…")}
          </Text>
        </View>
      ) : empty || rows.length === 0 ? (
        <View className="py-8">
          <Text className="text-body text-center text-muted-foreground">
            {pick("यो पक्षमा कुनै दिन भेटिएन।", "No days found in this paksha.")}
          </Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => {
          const isToday = row.dateAd === todayKey;
          return (
            <TableRow
              key={row.dateAd}
              rowIndex={rowIndex}
              highlight={isToday}
              borderTop={false}
              className="border-b border-border/60"
            >
              <View className={cn(td, "min-w-[3rem] pl-3 text-left font-semibold")}>
                <Text className="font-num font-semibold">{digits(row.day)}</Text>
              </View>
              <View className={cn(td, "min-w-[3.5rem] text-left")}>
                <Text>{pick(row.weekdayNe ?? "—", row.weekdayEn ?? row.weekdayNe ?? "—")}</Text>
              </View>
              <View className={cn(td, "min-w-[3.5rem] text-amber-600 dark:text-amber-400")}>
                <Text>{row.sunrise ? digits(row.sunrise) : "—"}</Text>
              </View>
              {getRashiList("ne").map((_, i) => {
                const num = i + 1;
                const val = row.times[num];
                const late = val?.includes("२५") || val?.includes("२६") || val?.includes("२७");
                return (
                  <View key={num} className={cn(td, "min-w-[3.75rem]")}>
                    <Text
                      className={cn(late ? "text-amber-700 dark:text-amber-300" : "text-foreground")}
                    >
                      {val ?? "—"}
                    </Text>
                  </View>
                );
              })}
            </TableRow>
          );
        })
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
    <PatroTableShell
      titleNe="दैनिक लग्न आरम्भ समयतालिका"
      titleEn="Daily Lagna (Ascendant) Start Time Table"
      subtitle="प्रत्येक गते सूर्योदयदेखि अर्को सूर्योदयसम्म कुन राशि कहिले लग्नमा आउँछ — समय सूर्योदयभन्दा अगाडि भए २४ घण्टा थपिएको देखाइन्छ।"
      subtitleEn="For each day, which rashi rises as the lagna and when, from sunrise to the next sunrise — times before sunrise are shown with 24 hours added."
    >
      {table}
    </PatroTableShell>
  );
}
