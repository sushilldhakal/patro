import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
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

const th = "text-sm font-semibold";
const td = cn(dainikKrantiClasses.monthTd, dainikKrantiClasses.monthTdMono);

export function MonthLagnaMatrix({ rows, todayKey, loading, empty, embedded }: Props) {
  const { t, pick, digits } = useLocale();

  const table = (
    <View className="min-w-full">
      <TableHeader>
        <TableHeaderCell minWidth={48} className={cn(th, "pl-3")}>
          <Text className="text-sm font-semibold text-foreground">{t("dainik.date")}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className="text-sm font-semibold text-foreground">{t("ui.dainik_kranti.day")}</Text>
        </TableHeaderCell>
        <TableHeaderCell minWidth={56} className={cn(th, patroStickyHeadCell)}>
          <Text className={cn(dainikKrantiClasses.th, dainikKrantiClasses.amberText)}>
            {t("dainik.rise")}
          </Text>
        </TableHeaderCell>
        {getRashiList("ne").map((rne, i) => (
          <TableHeaderCell key={rne} minWidth={60} className={cn(th, patroStickyHeadCell, "items-center")}>
            <RashiGlyphIcon name={rne} number={i + 1} size={20} />
            <Text className="text-sm text-center font-semibold text-foreground">
              {pick(rne, getRashiList("en")[i])}
            </Text>
          </TableHeaderCell>
        ))}
      </TableHeader>

      {loading ? (
        <View className="py-8">
          <Text className={dainikKrantiClasses.stateText}>
            {t("rashifal.profile.loading")}
          </Text>
        </View>
      ) : empty || rows.length === 0 ? (
        <View className="py-8">
          <Text className={dainikKrantiClasses.stateText}>
            {t("dainik.no_days_found_in_this_paksha")}
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
              <View className={cn(td, "min-w-[3.5rem]", dainikKrantiClasses.amberText)}>
                <Text>{row.sunrise ? digits(row.sunrise) : "—"}</Text>
              </View>
              {getRashiList("ne").map((_, i) => {
                const num = i + 1;
                const val = row.times[num];
                const late = val?.includes("२५") || val?.includes("२६") || val?.includes("२७");
                return (
                  <View key={num} className={cn(td, "min-w-[3.75rem]")}>
                    <Text
                      className={cn(late ? dainikKrantiClasses.lateText : "text-foreground")}
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
    <PatroTableShell titleKey="dainik.shell.lagna_matrix.title" subtitleKey="dainik.shell.lagna_matrix.subtitle">
      {table}
    </PatroTableShell>
  );
}
