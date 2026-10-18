import { TextInput } from "react-native";
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
import { LoadingState } from "@/components/ui/States";

/**
 * Holidays — the app's drawing of `useHolidaysPage` (@vedic-patro/features).
 * What is fetched, the columns, rows, search, sort and copy are shared with the
 * website; this file only lays it out. The year and era live in screen state here.
 */
export default function HolidaysScreen() {
  const colors = useThemeColors();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useHolidaysPage({ year, era });

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <PatroPageHeader
        className="mb-8"
        icon={<Icon node={partyPopper} size="2xl" tone="secondary" />}
        title={page.copy.title}
        subtitle={page.copy.subtitle}
      />

      <PatroYearNavBlock
        className="mb-8"
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={page.gregorianRange}
      />

      <Box className={cn("mb-8", holidaysClasses.tabBar)} label={page.copy.title}>
        {page.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            role="tab"
            selected={tab.active}
            onPress={() => page.setTab(tab.id)}
            className={cn(holidaysClasses.tab, tab.active ? holidaysClasses.tabActive : holidaysClasses.tabIdle)}
          >
            <Icon node={tab.id === "holidays" ? flag : partyPopper} size="md" tone={tab.active ? "secondary" : "foreground"} />
            <Text className={cn(holidaysClasses.tabLabel, tab.active ? holidaysClasses.tabLabelActive : holidaysClasses.tabLabelIdle)}>
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <Box className={holidaysClasses.tabCount}>
                <Text className={holidaysClasses.tabCountText}>{tab.countLabel}</Text>
              </Box>
            ) : null}
          </Pressable>
        ))}
      </Box>

      <Box className={cn("mb-8 flex-row items-center gap-2 px-3", holidaysClasses.searchBox)}>
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
        <Staged items={page.rows} first={30}>
          {(rows) => (
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
          )}
        </Staged>
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
