import { NowHero } from "@vedic-patro/ui/kit/panchanga";
import { useMemo, useState } from "react";
import { TextInput } from "react-native";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as chevronUp } from "lucide-react/dist/esm/icons/chevron-up";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useLocale } from "@/lib/i18n";
import { __iconNode as flag } from "lucide-react/dist/esm/icons/flag";
import { __iconNode as partyPopper } from "lucide-react/dist/esm/icons/party-popper";
import { __iconNode as searchIcon } from "lucide-react/dist/esm/icons/search";
import { __iconNode as circleX } from "lucide-react/dist/esm/icons/circle-x";
import { useHolidaysPage, type HolidayColumnKey, type HolidayRow } from "@vedic-patro/features/holidays";
import { Box, Icon, Pressable, Table, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { holidaysClasses } from "@vedic-patro/design-tokens/classes/holidays-classes";
import { AppShell } from "@/components/AppShell";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { Staged } from "@/components/ui/Deferred";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { LoadingState } from "@/components/ui/States";
import { usePageViewMenu } from "@/lib/page-view-menu";

/**
 * Holidays — the app's drawing of `useHolidaysPage` (@vedic-patro/features).
 * What is fetched, the columns, rows, search, sort and copy are shared with the
 * website; this file only lays it out. The year and era live in screen state here.
 */
export default function HolidaysScreen() {
  const colors = useThemeColors();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const { location } = usePanchangaLocation();
  const page = useHolidaysPage({ year, era, location: location.params });
  const { t, digits } = useLocale();
  const [pastOpen, setPastOpen] = useState(false);
  // The year on now opens at today: what is still to come first, the ones over folded under one row.
  // Not while searching or sorted by a column, where the reader has asked for an order of their own.
  const split = useMemo(() => {
    const sortedByColumn = page.columns.some((c) => c.sorted);
    if (page.search.trim() || sortedByColumn) return null;
    const today = todayAdStringInTimezone(new Date(), location.params.timezone ?? "Asia/Kathmandu");
    const endOf = (row: HolidayRow) => {
      const d = new Date(`${String(row.sortValues.adDate)}T12:00:00Z`);
      if (Number.isNaN(d.getTime())) return "";
      d.setUTCDate(d.getUTCDate() + Math.max(1, Number(row.sortValues.days) || 1) - 1);
      return d.toISOString().slice(0, 10);
    };
    const past = page.rows.filter((row) => endOf(row) !== "" && endOf(row) < today);
    if (past.length === 0 || past.length === page.rows.length) return null;
    return { upcoming: page.rows.filter((row) => !past.includes(row)), past };
  }, [page.rows, page.columns, page.search, location.params.timezone]);
  // सरकारी बिदा | सबै पर्व in the header's view menu.
  usePageViewMenu([
    {
      key: "tab",
      options: page.tabs.map((tab) => ({
        key: tab.id,
        label: tab.count > 0 ? `${tab.label} · ${tab.countLabel}` : tab.label,
        active: tab.active,
        onPress: () => page.setTab(tab.id),
      })),
    },
  ]);

  const renderTable = (rows: HolidayRow[]) => (
    <Table<HolidayRow>
      className="mb-8"
      columns={page.columns.map((col) => ({
        key: col.key,
        header: col.label,
        width: col.width,
        sorted: col.sorted,
        onPress: () => page.toggleSort(col.key),
      }))}
      rows={rows}
      rowKey={(row) => row.key}
      renderCell={(row, col) => <HolidayCell row={row} column={col.key as HolidayColumnKey} yes={page.copy.yes} />}
      empty={page.copy.empty}
      classes={{
        root: holidaysClasses.table,
        head: holidaysClasses.tableHead,
        headCell: holidaysClasses.headCell,
        headText: holidaysClasses.headText,
        row: holidaysClasses.row,
        cell: holidaysClasses.cell,
        emptyCell: holidaysClasses.emptyCell,
        emptyText: holidaysClasses.emptyText,
      }}
    />
  );

  return (
    <AppShell title={page.copy.title} showHeader={false}>

      <PatroYearNavBlock
        className="mb-8"
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={page.gregorianRange}
      />
      {page.hero ? <NowHero hero={page.hero} /> : null}


      <Box className={cn("mb-8 flex-row items-center gap-2 px-3", holidaysClasses.searchBox, "max-w-full")}>
        <Icon node={searchIcon} size="md" />
        <TextInput
          className={cn("flex-1", holidaysClasses.searchInput)}
          value={page.search}
          onChangeText={page.setSearch}
          placeholder={page.copy.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
        />
        {page.search ? (
          <Pressable onPress={() => page.setSearch("")} label={page.copy.searchPlaceholder}>
            <Icon node={circleX} size="md" tone="muted" />
          </Pressable>
        ) : null}
      </Box>

      {page.status === "error" ? (
        <Box className={cn("mb-8", holidaysClasses.errorBox)}>
          <Text className={holidaysClasses.errorText}>{page.copy.error}</Text>
        </Box>
      ) : page.status === "loading" ? (
        <LoadingState label={page.copy.loading} />
      ) : (
        // A year is a few hundred rows; the first screenful draws with the page.
        <>
          <Staged items={split ? split.upcoming : page.rows} first={30}>
            {(rows) => renderTable(rows)}
          </Staged>
          {split ? (
            <>
              <Pressable onPress={() => setPastOpen((v) => !v)} label={t("holidays.past_count", { count: digits(split.past.length) })} className={cn("mb-8", holidaysClasses.pastToggle)}>
                <Text className={holidaysClasses.pastToggleText}>{t("holidays.past_count", { count: digits(split.past.length) })}</Text>
                <Icon node={pastOpen ? chevronUp : chevronDown} size="md" tone="muted" />
              </Pressable>
              {pastOpen ? renderTable(split.past) : null}
            </>
          ) : null}
        </>
      )}
      <SeoContentSection route="holidays" />
    </AppShell>
  );
}

function HolidayCell({ row, column, yes }: { row: HolidayRow; column: HolidayColumnKey; yes: string }) {
  switch (column) {
    case "name":
      return <Text className={holidaysClasses.cellName}>{row.name}</Text>;
    case "bsDate":
    case "adDate":
      return <Text className={holidaysClasses.cellMono}>{row[column]}</Text>;
    case "type":
      return (
        <Box className={cn("self-start", holidaysClasses.typeBadge)}>
          <Text className={holidaysClasses.typeBadgeText}>{row.type}</Text>
        </Box>
      );
    case "isPublic":
      return row.isPublic ? (
        <Box className={holidaysClasses.govtFlag}>
          <Icon node={flag} size="xs" tone="destructive" />
          <Text className={holidaysClasses.govtFlagText}>{yes}</Text>
        </Box>
      ) : null;
    default:
      return <Text className={holidaysClasses.cellText}>{row.days}</Text>;
  }
}
