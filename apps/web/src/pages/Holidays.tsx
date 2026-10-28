import { NowHero } from "@vedic-patro/ui/kit/panchanga";
import { getRouteApi } from "@tanstack/react-router";
import { __iconNode as flag } from "lucide-react/dist/esm/icons/flag.mjs";
import { __iconNode as partyPopper } from "lucide-react/dist/esm/icons/party-popper.mjs";
import { __iconNode as searchIcon } from "lucide-react/dist/esm/icons/search.mjs";
import { useHolidaysPage, type HolidayColumnKey, type HolidayRow } from "@vedic-patro/features/holidays";
import { Box, Icon, Pressable, Table, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { holidaysClasses } from "@vedic-patro/design-tokens/classes/holidays-classes";
import { PageShell, PageHeader } from "../components/PageShell";
import { SeoContentSection } from "../components/seo/SeoContentSection";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/holidays");

/**
 * Holidays — the website's drawing of `useHolidaysPage` (@vedic-patro/features).
 * What is fetched, the columns, rows, search, sort and copy are shared with the
 * app; this file only lays it out. The year and era live in the URL here.
 */
export function Holidays() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useHolidaysPage({ year: yearBrowse.year, era: yearBrowse.era, location: location?.params });

  useRouteLoading(page.status === "loading");

  return (
    <PageShell>
      <PageHeader icon={<Icon node={partyPopper} size="2xl" tone="secondary" />} title={page.copy.title} subtitle={page.copy.subtitle} />

      <PatroYearNavBlock
        era={yearBrowse.era}
        year={yearBrowse.year}
        onYearChange={yearBrowse.setYear}
        onEraChange={yearBrowse.setEra}
        gregorianRange={page.gregorianRange}
        location={location}
        onLocationChange={setLocation}
        className=""
      />
      {page.hero ? <NowHero hero={page.hero} /> : null}

      <Box className={cn("flex", holidaysClasses.tabBar)} label={page.copy.title}>
        {page.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            role="tab"
            selected={tab.active}
            onPress={() => page.setTab(tab.id)}
            className={cn("flex", holidaysClasses.tab, tab.active ? holidaysClasses.tabActive : holidaysClasses.tabIdle)}
            webClassName={cn("transition-colors", !tab.active && "hover:text-foreground")}
          >
            <Icon node={tab.id === "holidays" ? flag : partyPopper} size="md" tone={tab.active ? "secondary" : "foreground"} />
            <Text className={cn(holidaysClasses.tabLabel, tab.active ? holidaysClasses.tabLabelActive : holidaysClasses.tabLabelIdle)}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <span className={holidaysClasses.tabCount}>
                <Text className={holidaysClasses.tabCountText}>{tab.countLabel}</Text>
              </span>
            )}
          </Pressable>
        ))}
      </Box>

      <div className="relative max-w-sm">
        <Icon node={searchIcon} size="md" className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={page.search}
          onChange={(e) => page.setSearch(e.target.value)}
          placeholder={page.copy.searchPlaceholder}
          className={cn("w-full pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/40", holidaysClasses.searchBox, holidaysClasses.searchInput)}
        />
      </div>

      {page.status === "error" && (
        <Box className={holidaysClasses.errorBox}>
          <Text className={holidaysClasses.errorText}>{page.copy.error}</Text>
        </Box>
      )}

      {page.status === "ready" && (
        <Table<HolidayRow>
          columns={page.columns.map((col) => ({
            key: col.key,
            header: col.label,
            width: col.width,
            sorted: col.sorted,
            onPress: () => page.toggleSort(col.key),
          }))}
          rows={page.rows}
          rowKey={(row) => row.key}
          renderCell={(row, col) => <HolidayCell row={row} column={col.key as HolidayColumnKey} yes={page.copy.yes} />}
          empty={page.copy.empty}
          classes={{
            root: holidaysClasses.table,
            head: holidaysClasses.tableHead,
            headCell: holidaysClasses.headCell,
            headText: holidaysClasses.headText,
            row: holidaysClasses.row,
            cell: cn(holidaysClasses.cell, "text-foreground"),
            emptyCell: holidaysClasses.emptyCell,
            emptyText: holidaysClasses.emptyText,
          }}
        />
      )}

      <SeoContentSection route="holidays" />
    </PageShell>
  );
}

function HolidayCell({ row, column, yes }: { row: HolidayRow; column: HolidayColumnKey; yes: string }) {
  switch (column) {
    case "name":
      return <Text className={holidaysClasses.cellName}>{row.name}</Text>;
    case "bsDate":
    case "adDate":
      return <Text className={cn(holidaysClasses.cellMono, "whitespace-nowrap")}>{row[column]}</Text>;
    case "type":
      return (
        <span className={cn("inline-block", holidaysClasses.typeBadge)}>
          <Text className={cn(holidaysClasses.typeBadgeText, "whitespace-nowrap")}>{row.type}</Text>
        </span>
      );
    case "isPublic":
      return row.isPublic ? (
        <span className={cn("flex", holidaysClasses.govtFlag)}>
          <Icon node={flag} size="xs" tone="destructive" />
          <Text className={holidaysClasses.govtFlagText}>{yes}</Text>
        </span>
      ) : null;
    default:
      return <Text className={holidaysClasses.cellText}>{row.days}</Text>;
  }
}
