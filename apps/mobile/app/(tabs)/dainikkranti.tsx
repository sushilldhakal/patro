import { Fragment, useMemo, useState } from "react";
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { Trans } from "@vedic-patro/i18n/react";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { AppShell } from "@/components/AppShell";
import { DayPatroCard } from "@/components/dainikKranti/DayPatroCard";
import { DayPatroExpandPanel, MonthCalcNotes, MonthGrahaSpashta, MonthLagnaMatrix } from "@vedic-patro/ui/kit/panchanga";
import { DainikKrantiHeader } from "@/components/dainikKranti/DainikKrantiHeader";
import { GocharRashyadiBlock } from "@/components/dainikKranti/GocharRashyadiBlock";
import { SunriseSunsetIcon } from "@/components/panchanga/SunriseSunsetIcon";
import { PatroAccordion, PatroAccordionItem } from "@/components/dainikKranti/PatroAccordion";
import {
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import { apiKeys } from "@/lib/api";
import {
  useDainikKrantiPage,
  type DainikDayRow,
  type DainikPakshaFilter,
} from "@vedic-patro/features/dainik-kranti";
import { getCurrentBs, shiftBsMonth } from "@vedic-patro/domain/calendar/bs-calendar";
import { BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR } from "@/lib/bs-range";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { Deferred, useStagedList } from "@/components/ui/Deferred";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/design-tokens/cn";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { illustration } from "@vedic-patro/design-tokens";
import { useBrowsedBsMonth } from "@vedic-patro/features/patro-date";

type PageCopy = ReturnType<typeof useDainikKrantiPage>["copy"];

/** Fixed column widths — header and body must use the same `TableHeaderCell` / `TableCell` props. */
const DAINIK_COL_EXPAND = 36;
const DAINIK_COL_GATE = 88;
const DAINIK_COL_TITHI = 96;
const DAINIK_COL_NAK = 96;
const DAINIK_COL_YOGA = 72;
const DAINIK_COL_KARANA = 72;
const DAINIK_SUN_COL_W = 116;
const DAINIK_MOON_COL_W = 88;
const DAINIK_COL_TRANSIT = 218;
const DAINIK_FESTIVAL_COL_W = 330;

/** Day rows drawn before the screen has settled. */
const FIRST_PAINT_ROWS = 8;

const DAINIK_TABLE_WIDTH =
  DAINIK_COL_EXPAND +
  DAINIK_COL_GATE +
  DAINIK_COL_TITHI +
  DAINIK_COL_NAK +
  DAINIK_COL_YOGA +
  DAINIK_COL_KARANA +
  DAINIK_SUN_COL_W +
  DAINIK_MOON_COL_W +
  DAINIK_COL_TRANSIT +
  DAINIK_FESTIVAL_COL_W;

export default function DainikKrantiScreen() {
  const { t } = useLocale();
  const { isCompact, width: screenWidth } = useBreakpoint();
  const colors = useThemeColors();
  const grahaCols = screenWidth >= 1024 ? 4 : screenWidth >= 640 ? 3 : 2;
  const { location, setLocation } = usePanchangaLocation();
  const today = useMemo(() => getCurrentBs(), []);
  const { year, setYear, month, setMonth } = useBrowsedBsMonth(today);
  const [paksha, setPaksha] = useState<DainikPakshaFilter>("all");

  const page = useDainikKrantiPage({
    browse: { era: "bs", year, month },
    location,
    paksha,
    setPaksha,
    compact: isCompact,
    monthSource: {
      // Full per-day embed, trimmed to what this page reads (`slim`).
      queryKey: [...apiKeys.month(year, month, location.params), "full-slim"] as const,
      queryFn: () => fetchMonthCalendarOffline(year, month, location.params, { slim: true }),
    },
  });
  const { status, copy, rows, tables, gochar, header } = page;

  const goMonth = (delta: number) => {
    const next = shiftBsMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const goToday = () => {
    const c = getCurrentBs();
    setYear(c.year);
    setMonth(c.month);
  };

  const firstLoad = status.pageLoading && !status.hasMonth;

  return (
    <AppShell title={t("sidebar_nav.items.dainikkranti.label")} showHeader={false}>
      <View className={dainikKrantiClasses.pageBody}>
      <DainikKrantiHeader
        year={year}
        month={month}
        paksha={paksha}
        mobilePakshaDisplay={page.compactPaksha}
        onPakshaChange={setPaksha}
        pakshaOptions={copy.pakshaOptions}
        pakshaAria={copy.pakshaAria}
        onToday={goToday}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onPrev={() => goMonth(-1)}
        onNext={() => goMonth(1)}
        prevDisabled={month === 1 && year <= BS_SUPPORTED_START_YEAR}
        nextDisabled={month === 12 && year >= BS_SUPPORTED_END_YEAR}
        location={location}
        onLocationChange={setLocation}
      />

      <View className={cn(dainikKrantiClasses.monthHead, "gap-1")}>
        <Text className={dainikKrantiClasses.monthTitle} style={nepaliTextStyle()}>
          {header.title}
        </Text>
        {/* One meta line under the title: as separate texts beside it they wrapped
            one by one and the "·" separators landed at the starts of lines. */}
        {header.yearBs || header.ritu || header.dayCount ? (
          <Text className={dainikKrantiClasses.metaText} style={nepaliTextStyle()}>
            {[header.yearBs, header.ritu, header.dayCount].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <Text className={dainikKrantiClasses.metaText} style={nepaliTextStyle()}>
          {header.intro}
        </Text>
      </View>

      {page.adhikNotice ? (
        <View className={dainikKrantiClasses.adhikBox}>
          <Text className={dainikKrantiClasses.adhikText} style={nepaliTextStyle()}>
            <Trans
              i18nKey={page.adhikNotice.i18nKey}
              values={page.adhikNotice.values}
              components={{ b: <Text className={cn(dainikKrantiClasses.adhikText, dainikKrantiClasses.adhikStrong)} /> }}
            />
          </Text>
        </View>
      ) : null}

      {firstLoad ? (
        <View className="py-16">
          <VedicPatroLoader />
        </View>
      ) : (
        <View className={dainikKrantiClasses.pageBody}>
          <View className="gap-4">
          {isCompact ? (
            <View className="gap-3">
              {status.monthError ? (
                <View className={dainikKrantiClasses.stateBox}>
                  <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
                    {copy.loadError}
                  </Text>
                </View>
              ) : rows.length === 0 ? (
                <View className={dainikKrantiClasses.stateBox}>
                  <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
                    {copy.noDays}
                  </Text>
                </View>
              ) : (
                <StagedDayCards rows={rows} copy={copy} />
              )}
            </View>
          ) : (
            <DesktopPatroTable rows={rows} copy={copy} isError={status.monthError} />
          )}

          <PatroAccordion>
            <PatroAccordionItem value="lagna-month" title={copy.lagnaMonth}>
              <Text className={dainikKrantiClasses.accordionIntro} style={nepaliTextStyle()}>
                {copy.lagnaMonthIntro}
              </Text>
              <View className={cn(dainikKrantiClasses.accordionTable, "overflow-hidden")}>
                <MonthLagnaMatrix
                  embedded
                  rows={tables.lagnaMatrix}
                  todayKey={page.todayKey}
                  loading={status.monthLoading}
                  empty={status.empty}
                />
              </View>
            </PatroAccordionItem>

            <PatroAccordionItem value="graha-month" title={copy.grahaMonth}>
              <Text className={dainikKrantiClasses.accordionIntro} style={nepaliTextStyle()}>
                {copy.grahaMonthIntro}
              </Text>
              <MonthGrahaSpashta
                embedded
                rows={tables.grahaMatrix}
                todayKey={page.todayKey}
                loading={status.monthLoading}
                empty={status.empty}
              />
            </PatroAccordionItem>

            <PatroAccordionItem value="calc-notes" title={copy.calcNotes}>
              <MonthCalcNotes embedded notes={tables.calcNotes} loading={status.monthLoading || status.ingressLoading} />
            </PatroAccordionItem>
          </PatroAccordion>

          </View>

          <View className="gap-5">
          {page.sunRef ? (
            <View className="flex-row gap-3">
              <View className={cn(dainikKrantiClasses.sunBox, "flex-1")}>
                <SunriseSunsetIcon variant="rise" size={20} color={illustration.orange50} />
                <View>
                  <Text className={dainikKrantiClasses.sunLabel} style={nepaliTextStyle()}>{copy.sunrise}</Text>
                  <Text className={dainikKrantiClasses.sunValue} style={nepaliTextStyle()}>{page.sunRef.sunrise}</Text>
                </View>
              </View>
              <View className={cn(dainikKrantiClasses.sunBox, "flex-1")}>
                <SunriseSunsetIcon variant="set" size={20} color={illustration.blue67} />
                <View>
                  <Text className={dainikKrantiClasses.sunLabel} style={nepaliTextStyle()}>{copy.sunset}</Text>
                  <Text className={dainikKrantiClasses.sunValue} style={nepaliTextStyle()}>{page.sunRef.sunset}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <GocharRashyadiBlock
            rashyadiRange={tables.rashyadiRange}
            grahas={gochar.grahas}
            papanshaLine={tables.papanshaLine}
            gapanshaLine={tables.gapanshaLine}
            dateBs={gochar.dateBs}
            dateAd={gochar.dateAd}
            gocharLoading={status.gocharLoading}
            rashyadiLoading={status.monthLoading || status.ingressLoading}
          />

          <View className={dainikKrantiClasses.panel}>
            <Text className={dainikKrantiClasses.panelTitle} style={nepaliTextStyle()}>
              {copy.gocharTitle}
            </Text>
            {gochar.rows.length === 0 ? (
              <Text className={dainikKrantiClasses.panelText} style={nepaliTextStyle()}>
                {gochar.emptyText}
              </Text>
            ) : (
              <View className="gap-1.5">
                {gochar.rows.map((g) => (
                  <View key={g.key} className={dainikKrantiClasses.gocharRow}>
                    <Text className={cn("flex-1 text-sm", dainikKrantiClasses.gocharName)} style={nepaliTextStyle()}>
                      {g.name}
                      <Text className="text-sm"> {g.rashi}</Text>
                    </Text>
                    {g.next ? (
                      <Text className={dainikKrantiClasses.gocharNext} style={nepaliTextStyle()}>
                        {g.next.label}
                        {"\n"}
                        {g.next.time}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className={dainikKrantiClasses.panelMuted}>
            <Text className={dainikKrantiClasses.panelTitle} style={nepaliTextStyle()}>
              {page.kartavya.title}
            </Text>
            <View className="gap-2">
              {page.kartavya.paragraphs.map((text) => (
                <Text key={text} className={dainikKrantiClasses.kartavyaText} style={nepaliTextStyle()}>
                  {text}
                </Text>
              ))}
            </View>
          </View>
          </View>
        </View>
      )}

      {!firstLoad ? (
        <Deferred>
        <View className={dainikKrantiClasses.legendCard}>
          <View className={dainikKrantiClasses.legendHead}>
            <Ionicons name="sparkles-outline" size={16} color={colors.secondary} />
            <Text className={dainikKrantiClasses.legendTitle} style={nepaliTextStyle()}>
              {copy.legendTitle}
            </Text>
            {gochar.legendDate ? (
              <Text className={dainikKrantiClasses.legendDate} style={nepaliTextStyle()}>
                {gochar.legendDate}
              </Text>
            ) : null}
          </View>

          <View className={cn(dainikKrantiClasses.legendBody, "gap-y-6")}>
            <View>
              <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                {copy.legendPositions}
              </Text>
              {gochar.rows.length === 0 ? (
                <Text className={dainikKrantiClasses.panelText} style={nepaliTextStyle()}>
                  {gochar.emptyText}
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-y-1.5">
                  {gochar.rows.map((g) => (
                    <View key={g.key} style={{ width: `${100 / grahaCols}%` }} className="pr-4">
                      <View className={dainikKrantiClasses.legendPlanetRow}>
                        <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>
                          {g.name}
                        </Text>
                        <Text className={dainikKrantiClasses.legendPlanetText} style={nepaliTextStyle()}>{g.rashi}</Text>
                        {g.dms ? (
                          <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>{g.dms}</Text>
                        ) : null}
                        <View
                          className={cn(
                            dainikKrantiClasses.motionPill,
                            g.vakri ? dainikKrantiClasses.motionVakriBg : dainikKrantiClasses.motionMargiBg,
                          )}
                        >
                          <Text
                            className={cn(
                              dainikKrantiClasses.metaSmall,
                              g.vakri ? dainikKrantiClasses.motionVakriText : dainikKrantiClasses.motionMargiText,
                            )}
                            style={nepaliTextStyle()}
                          >
                            {g.motion}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <Text className={cn(dainikKrantiClasses.legendNote, "mt-2")} style={nepaliTextStyle()}>
                <Trans
                  i18nKey={page.legends.positionsNoteKey}
                  components={{
                    vakri: <Text className={cn(dainikKrantiClasses.legendNote, dainikKrantiClasses.motionVakriText)} />,
                    margi: <Text className={cn(dainikKrantiClasses.legendNote, dainikKrantiClasses.motionMargiText)} />,
                  }}
                />
              </Text>
            </View>

            <View className="gap-6 md:flex-row md:gap-x-8">
              <View className="flex-1">
                <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                  {copy.legendUdayast}
                </Text>
                <View className="gap-1.5">
                  {page.legends.udayast.map((it) => (
                    <View key={it.code} className={dainikKrantiClasses.legendRow}>
                      <View className={cn("w-24 items-start", dainikKrantiClasses.legendCodeCol)}>
                        <View className={dainikKrantiClasses.legendCodeChip}>
                          <Text className={dainikKrantiClasses.legendCodeText} style={nepaliTextStyle()}>{it.code}</Text>
                        </View>
                      </View>
                      <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
                        <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)}>{it.full}</Text> — {it.meaning}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-1">
                <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                  {copy.legendGochar}
                </Text>
                <View className="gap-1.5">
                  {page.legends.gochar.map((it) => (
                    <View key={it.code} className={dainikKrantiClasses.legendRow}>
                      <View className={cn("w-20 items-start", dainikKrantiClasses.legendCodeCol)}>
                        <View className={dainikKrantiClasses.legendCodeChip}>
                          <Text className={dainikKrantiClasses.legendCodeText} style={nepaliTextStyle()}>{it.code}</Text>
                        </View>
                      </View>
                      <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
                        {it.meaning}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className={cn(dainikKrantiClasses.legendNote, "mt-3")} style={nepaliTextStyle()}>
                  <Trans
                    i18nKey={page.legends.dashaNoteKey}
                    components={{ b: <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendStrong)} /> }}
                  />
                </Text>
              </View>
            </View>
          </View>
        </View>
        </Deferred>
      ) : null}
      </View>
    </AppShell>
  );
}

function AngaCell({ anga, width }: { anga: DainikDayRow["moon"]; width: number }) {
  return (
    <TableCell width={width}>
      <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>{anga.value}</Text>
      {anga.until ? <Text className={dainikKrantiClasses.subLine} style={nepaliTextStyle()}>{anga.until}</Text> : null}
    </TableCell>
  );
}

/**
 * A month is ~30 day cards plus the long legend. Mounting them all in one frame
 * held the screen blank on mid-range phones, so the first screenful draws at
 * once and the rest follows as soon as it has.
 */
function StagedDayCards({ rows, copy }: { rows: DainikDayRow[]; copy: PageCopy }) {
  const shown = useStagedList(rows, FIRST_PAINT_ROWS);
  return (
    <>
      {shown.map((row) => (
        <Fragment key={row.key}>
          {row.segLabel ? (
            <Text className={dainikKrantiClasses.segLabel} style={nepaliTextStyle()}>
              {row.segLabel}
            </Text>
          ) : null}
          <DayPatroCard row={row} copy={copy} />
        </Fragment>
      ))}
    </>
  );
}

function DesktopPatroTable({ rows: allRows, copy, isError }: { rows: DainikDayRow[]; copy: PageCopy; isError: boolean }) {
  const rows = useStagedList(allRows, FIRST_PAINT_ROWS);
  const colors = useThemeColors();
  const th = cn(dainikKrantiClasses.th, "text-foreground");
  const thWrap = cn(dainikKrantiClasses.thWrap, "text-foreground");
  const subLine = dainikKrantiClasses.subLine;

  return (
    <TableScrollShell stretch={false} className="w-full rounded-xl">
      <View style={{ width: DAINIK_TABLE_WIDTH }}>
        <TableHeader>
          <TableHeaderCell width={DAINIK_COL_EXPAND} className={patroStickyHeadCell}>
            {null}
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_GATE} className={patroStickyHeadCell}>
            <Text className={th}>{copy.colDay}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_TITHI} className={patroStickyHeadCell}>
            <Text className={th}>{copy.tithi}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_NAK} className={patroStickyHeadCell}>
            <Text className={th}>{copy.nakshatra}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_YOGA} className={patroStickyHeadCell}>
            <Text className={th}>{copy.yoga}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_KARANA} className={patroStickyHeadCell}>
            <Text className={th}>{copy.karana}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_SUN_COL_W} className={cn(patroStickyHeadCell, "min-h-10")}>
            <Text className={thWrap}>{copy.sunRiseSet}</Text>
            <Text className={thWrap}>{copy.sign}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_MOON_COL_W} className={cn(patroStickyHeadCell, "min-h-10")}>
            <Text className={thWrap}>{copy.moon}</Text>
            <Text className={thWrap}>{copy.sign}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_TRANSIT} className={patroStickyHeadCell}>
            <Text className={thWrap}>{copy.transits}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_FESTIVAL_COL_W} className={patroStickyHeadCell}>
            <Text className={th}>{copy.festival}</Text>
          </TableHeaderCell>
        </TableHeader>

        {isError ? (
          <View className="py-8">
            <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
              {copy.loadError}
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <View className="py-8">
            <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
              {copy.noDays}
            </Text>
          </View>
        ) : (
          rows.map((row, dayIndex) => (
            <Fragment key={row.key}>
              {row.segLabel ? (
                <View className={cn("border-b border-border px-3", dainikKrantiClasses.segRow)}>
                  <Text className={dainikKrantiClasses.segRowText} style={nepaliTextStyle()}>
                    {row.segLabel}
                  </Text>
                </View>
              ) : null}
              <TableRow
                rowIndex={dayIndex}
                highlight={row.isToday}
                borderTop={false}
                className="border-b border-border"
                onPress={row.toggle}
                accessibilityState={{ expanded: row.expanded }}
                accessibilityLabel={row.ariaLabel}
              >
                <TableCell width={DAINIK_COL_EXPAND} align="center">
                  <View className="h-7 w-7 items-center justify-center" accessibilityElementsHidden>
                    <Ionicons
                      name={row.expanded ? "chevron-down" : "chevron-forward"}
                      size={16}
                      color={colors.foreground}
                    />
                  </View>
                </TableCell>
                <TableCell width={DAINIK_COL_GATE} className={cn(row.isSaturday && dainikKrantiClasses.saturday)}>
                  <View className={cn(dainikKrantiClasses.dateCell, "flex-row items-center")}>
                    {row.isToday ? (
                      <View className={dainikKrantiClasses.todayDot} accessibilityElementsHidden />
                    ) : null}
                    <Text
                      className={cn(dainikKrantiClasses.dayNumBs, row.holiday ? dainikKrantiClasses.saturday : "text-foreground")}
                      style={nepaliTextStyle()}
                    >
                      {row.dayNumber}
                      {row.adDay != null ? (
                        <>
                          {" "}
                          <Text className={dainikKrantiClasses.dayNumAdSmall} style={nepaliTextStyle()}>{row.adDay}</Text>
                        </>
                      ) : null}
                    </Text>
                  </View>
                  <Text className={cn(subLine, row.isSaturday && dainikKrantiClasses.saturday)} style={nepaliTextStyle()}>
                    {row.weekday}
                  </Text>
                </TableCell>
                <AngaCell anga={row.tithi} width={DAINIK_COL_TITHI} />
                <AngaCell anga={row.nakshatra} width={DAINIK_COL_NAK} />
                <AngaCell anga={row.yoga} width={DAINIK_COL_YOGA} />
                <AngaCell anga={row.karana} width={DAINIK_COL_KARANA} />
                <TableCell width={DAINIK_SUN_COL_W}>
                  <View className={dainikKrantiClasses.field}>
                    <Text className={cn(dainikKrantiClasses.sunRiseSetTimes, "font-num leading-snug")} style={nepaliTextStyle()}>{row.sun.times}</Text>
                    <Text className={cn(subLine, "leading-snug")} style={nepaliTextStyle()}>{row.sun.sign}</Text>
                  </View>
                </TableCell>
                <AngaCell anga={row.moon} width={DAINIK_MOON_COL_W} />
                <TableCell width={DAINIK_COL_TRANSIT}>
                  {row.transits.length > 0 ? (
                    row.transits.map((ev, i) => (
                      <Text key={i} className={dainikKrantiClasses.transitRow} style={nepaliTextStyle()}>
                        {ev.label} {ev.planet}
                        {ev.time ? ` ${ev.time}` : ""}
                      </Text>
                    ))
                  ) : (
                    <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>—</Text>
                  )}
                </TableCell>
                <TableCell width={DAINIK_FESTIVAL_COL_W}>
                  <Text numberOfLines={2} className={row.festivals ? dainikKrantiClasses.festivalText : dainikKrantiClasses.cellText} style={nepaliTextStyle()}>
                    {row.festivals ?? "—"}
                  </Text>
                </TableCell>
              </TableRow>
              {row.expanded ? (
                <View className={cn("border-b border-border px-4 py-2", dainikKrantiClasses.expandRow)}>
                  <DayPatroExpandPanel lagna={row.lagna} graha={row.graha} notes={row.notes} />
                </View>
              ) : null}
            </Fragment>
          ))
        )}
      </View>
    </TableScrollShell>
  );
}
