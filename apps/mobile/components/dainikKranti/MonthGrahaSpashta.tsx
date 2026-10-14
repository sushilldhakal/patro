import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableHeader, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import {
  PATRO_PLANET_KEYS,
  PATRO_PLANET_NE,
  type GrahaSpashtaRow,
} from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  patroStickyHeadCell,
  patroStickySubHeadCell,
} from "@/lib/patro-classes";
import { PatroTableShell } from "./PatroTableShell";
import { tFor } from "@vedic-patro/i18n/runtime";

const th = dainikKrantiClasses.monthTh;
const td = dainikKrantiClasses.monthTd;

const PLANET_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu",
};

type Props = {
  rows: GrahaSpashtaRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  embedded?: boolean;
};

function formatPlanetCell(
  cell: { rashiNe: string; rashiEn?: string; coords: string } | undefined,
  isEn: boolean,
): string {
  if (!cell) return "—";
  return `${isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe} ${cell.coords}`;
}

export function MonthGrahaSpashta({ rows, todayKey, loading, empty, embedded }: Props) {
  const { t, lang, pick, digits } = useLocale();
  const isEn = lang === "en";

  const table = (
    <View className="min-w-full">
      <TableHeader>
          <View className={cn(th, "min-w-[3rem] pl-3")}>
            <Text className="text-sm font-semibold">{t("dainik.date")}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[3.5rem]")}>
            <Text className="text-sm font-semibold">{t("ui.dainik_kranti.day")}</Text>
          </View>
          {PATRO_PLANET_KEYS.map((key) => (
            <View key={key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] items-center")}>
              <Text className="text-sm text-center font-semibold">
                {pick(PATRO_PLANET_NE[key], PLANET_EN[key] ?? PATRO_PLANET_NE[key])}
              </Text>
            </View>
          ))}
          <View className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-sm text-center font-semibold">{t("aside.deshaantar")}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-sm text-center font-semibold">{t("milan.latitude")}</Text>
          </View>
          <View className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] items-center")}>
            <Text className="text-sm text-center font-semibold">
              {t("aside.belaantar")}
            </Text>
          </View>
      </TableHeader>

      <TableHeader>
          <View className="min-w-[6.5rem]" />
          {PATRO_PLANET_KEYS.map((key) => (
            <View key={`sub-${key}`} className={cn(th, patroStickySubHeadCell, "min-w-[5.5rem] items-center")}>
              <Text className="text-center text-sm font-normal">
                {t("dainik.ra_deg_ka_vi")}
              </Text>
            </View>
          ))}
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-center text-sm font-normal">
              {t("ui.dainik_kranti.long")}
            </Text>
          </View>
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4rem] items-center")}>
            <Text className="text-center text-sm font-normal">
              {t("ui.dainik_kranti.lat")}
            </Text>
          </View>
          <View className={cn(th, patroStickySubHeadCell, "min-w-[4.5rem] items-center")}>
            <Text className="text-center text-sm font-normal">
              {t("dainik.time_corr")}
            </Text>
          </View>
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
            const hasPlanets = PATRO_PLANET_KEYS.some((k) => row.planets[k]);
            return (
              <TableRow
                key={row.dateAd}
                rowIndex={rowIndex}
                highlight={isToday}
                borderTop={false}
                className="border-b border-border/60"
              >
                <View className={cn(td, "min-w-[3rem] pl-3 font-semibold")}>
                  <Text className="font-num font-semibold">{digits(row.day)}</Text>
                </View>
                <View className={cn(td, "min-w-[3.5rem]")}>
                  <Text>{pick(row.weekdayNe ?? "—", row.weekdayEn ?? row.weekdayNe ?? "—")}</Text>
                </View>
                {PATRO_PLANET_KEYS.map((key) => (
                  <View key={key} className={cn(td, "min-w-[5.5rem] items-center")}>
                    <Text className="font-num text-center tabular-nums">
                      {formatPlanetCell(row.planets[key], isEn)}
                    </Text>
                  </View>
                ))}
                <View className={cn(td, "min-w-[4rem] items-center")}>
                  <Text className="font-num text-center tabular-nums">{row.deshaantar ?? "—"}</Text>
                </View>
                <View className={cn(td, "min-w-[4rem] items-center")}>
                  <Text className="font-num text-center tabular-nums">{row.akshamsha ?? "—"}</Text>
                </View>
                <View className={cn(td, "min-w-[4.5rem] items-center")}>
                  <Text className="font-num text-center tabular-nums">
                    {row.belaantar ?? (hasPlanets ? "—" : "—")}
                  </Text>
                </View>
              </TableRow>
            );
          })
        )}
    </View>
  );

  const footnote = (
    <Text className={dainikKrantiClasses.monthFootnote} style={nepaliTextStyle()}>
      {pick(
        tFor(undefined, "ui.dainik_kranti.x_9c4c2ea7", { v0: getRashiList("ne").join(", ") }),
        `Signs: ${getRashiList("en").join(", ")}. Each planet's bracket shows sign deg|kala|vikala — e.g. Vrishabha 13|6|29 = Vrishabha sign, 13 deg 6 kala 29 vikala.`,
      )}
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
