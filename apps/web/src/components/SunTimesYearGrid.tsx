import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Sunrise, Sunset } from "lucide-react";
import type { SunCell, SunTimesPage } from "@vedic-patro/features/sun-times";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { patroSkel, patroStickyHeadCell, patroStickyHeadRow } from "@/lib/patro-classes";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";

/** Fixed column widths so month headers line up with body cells (table-layout: fixed). */
const SUN_MATRIX_DAY_COL = "3rem"; // 48px
const SUN_MATRIX_MONTH_COL = "5.25rem"; // 84px — rise/set + ayana mark in Nepali digits
const sunMatrixMonthTh = cn(
  "overflow-hidden",
  sunTimesClasses.matrixMonthHead,
  sunTimesClasses.matrixMonthHeadText,
);
const sunMatrixMonthTd = cn(
  "overflow-hidden text-center align-middle leading-snug",
  sunTimesClasses.matrixCell,
);
const sunMatrixDayCorner = cn(
  "sticky left-0 z-[4]",
  sunTimesClasses.matrixDayHead,
  sunTimesClasses.matrixDayHeadText,
);
const sunMatrixDayRowHead = cn(
  "sticky left-0 z-[2]",
  sunTimesClasses.matrixDayRowHead,
  sunTimesClasses.matrixDayRowText,
);
const ayanaNorthClass = cn("mb-0.5 inline-block", sunTimesClasses.ayanaNorth);
const ayanaSouthClass = cn("mb-0.5 inline-block", sunTimesClasses.ayanaSouth);

const monthCol = createColumnHelper<SunCell>();

type Copy = SunTimesPage["copy"];

function AyanaBadge({ cell, className }: { cell: SunCell; className?: string }) {
  if (!cell.ayana) return null;
  return (
    <span className={cn(cell.ayana.north ? ayanaNorthClass : ayanaSouthClass, className)} title={cell.ayana.label}>
      {cell.ayana.short}
    </span>
  );
}

function useMonthTableColumns(copy: Copy) {
  return useMemo(
    () => [
      monthCol.accessor("dayLabel", {
        header: copy.colDay,
        cell: (info) => <span className={cn("tabular-nums", sunTimesClasses.monthDayText)}>{info.getValue()}</span>,
      }),
      monthCol.accessor("ayana", {
        header: copy.colAyana,
        cell: (info) =>
          info.getValue() ? <AyanaBadge cell={info.row.original} /> : <span className={sunTimesClasses.monthPlainText}>—</span>,
      }),
      monthCol.accessor("sunrise", {
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <Sunrise className="size-4 text-primary" />
            {copy.sunrise}
          </span>
        ),
        cell: (info) => (
          <span className={cn("font-mono tabular-nums", sunTimesClasses.monthRiseText)}>{info.getValue() ?? "—"}</span>
        ),
      }),
      monthCol.accessor("sunset", {
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <Sunset className="size-4 text-blue-500" />
            {copy.sunset}
          </span>
        ),
        cell: (info) => (
          <span className={cn("font-mono tabular-nums", sunTimesClasses.monthSetText)}>{info.getValue() ?? "—"}</span>
        ),
      }),
    ],
    [copy],
  );
}

function MonthSunDataTable({ rows, isLoading, copy }: { rows: SunCell[]; isLoading: boolean; copy: Copy }) {
  const columns = useMonthTableColumns(copy);
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <Table className="text-base">
      <TableHeader className="bg-muted">
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id} className={cn(patroStickyHeadRow, sunTimesClasses.monthHeadRow, "hover:bg-muted")}>
            {hg.headers.map((h) => (
              <TableHead key={h.id} className={cn(patroStickyHeadCell, sunTimesClasses.monthHeadCell, sunTimesClasses.monthHeadText)}>
                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isLoading && rows.every((r) => !r.sunrise && !r.sunset)
          ? rows.map((r) => (
              <TableRow key={r.day}>
                {columns.map((_, colIdx) => (
                  <TableCell key={colIdx} className={sunTimesClasses.monthCellSkeleton}>
                    <span className={cn(patroSkel, "h-5")} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={sunTimesClasses.monthCell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

function SunTimesLegend({ page, hideHeader }: { page: SunTimesPage; hideHeader: boolean }) {
  const { copy } = page;
  const item = cn("inline-flex", sunTimesClasses.legendItem, sunTimesClasses.legendLabel);
  return (
    <div className={cn("flex flex-wrap", sunTimesClasses.legend)}>
      {!hideHeader ? (
        <div>
          <h3 className={cn("m-0", sunTimesClasses.legendTitle)}>{copy.gridTitle}</h3>
          <span className={cn("block", sunTimesClasses.legendSub)}>
            {copy.subtitle} · {page.locationLabel}
          </span>
        </div>
      ) : null}
      <div className={cn("flex", sunTimesClasses.legendItems)}>
        <span className={item}>
          <Sunrise className="size-4" strokeWidth={1.8} />
          {copy.sunrise}
        </span>
        <span className={item}>
          <Sunset className="size-4" strokeWidth={1.8} />
          {copy.sunset}
        </span>
        <span className={item}>
          <span className={ayanaNorthClass}>{copy.northMark}</span>
          {copy.northLabel}
        </span>
        <span className={item}>
          <span className={ayanaSouthClass}>{copy.southMark}</span>
          {copy.southLabel}
        </span>
      </div>
    </div>
  );
}

function SunTimesYearMatrix({ page }: { page: SunTimesPage }) {
  const { copy, loading } = page;
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
      <table
        className="border-collapse table-fixed text-sm font-semibold font-num"
        style={{ width: `calc(${SUN_MATRIX_DAY_COL} + 12 * ${SUN_MATRIX_MONTH_COL})` }}
        aria-label={copy.gridAria}
      >
        <colgroup>
          <col style={{ width: SUN_MATRIX_DAY_COL }} />
          {Array.from({ length: 12 }, (_, i) => (
            <col key={i} style={{ width: SUN_MATRIX_MONTH_COL }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={sunMatrixDayCorner}>
              {copy.colDay}
            </TableHead>
            {page.monthLabels.map((name, idx) => (
              <TableHead key={`sun-month-${idx + 1}`} scope="col" className={cn(sunMatrixMonthTh, "whitespace-nowrap text-ellipsis")}>
                {name || "\u00a0"}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.matrix.map((row) => (
            <TableRow key={row.day} className="hover:bg-transparent">
              <TableHead scope="row" className={sunMatrixDayRowHead}>
                {row.dayLabel}
              </TableHead>
              {row.cells.map((cell, colIdx) => {
                if (!cell) return <TableCell key={colIdx} className={cn(sunMatrixMonthTd, sunTimesClasses.matrixCellBlank)} aria-hidden />;
                const empty = !cell.sunrise && !cell.sunset;
                return (
                  <TableCell
                    key={colIdx}
                    className={cn(sunMatrixMonthTd, loading && empty && sunTimesClasses.matrixCellLoading)}
                    title={cell.title}
                  >
                    {loading && empty ? (
                      <span className={patroSkel} />
                    ) : !empty ? (
                      <>
                        <span className={cn("block truncate", sunTimesClasses.matrixRise)}>
                          {cell.sunrise ?? "—"}
                          {cell.ayana ? (
                            <>
                              {" "}
                              <AyanaBadge cell={cell} className="mb-0 text-xs align-baseline" />
                            </>
                          ) : null}
                        </span>
                        <span className={cn("block truncate", sunTimesClasses.matrixSet)}>{cell.sunset ?? "—"}</span>
                      </>
                    ) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

function SunTimesYearAccordion({ page }: { page: SunTimesPage }) {
  const { loading } = page;
  return (
    <Accordion
      key={loading ? "loading" : `ready-${page.copy.subtitle}`}
      type="single"
      collapsible
      defaultValue={loading ? undefined : page.defaultMonth}
      className={sunTimesClasses.accordion}
    >
      {page.months.map((m) => (
        <AccordionItem key={m.key} value={m.key} className={sunTimesClasses.accordionItem}>
          <AccordionTrigger className={cn(sunTimesClasses.accordionTrigger, sunTimesClasses.accordionTriggerText, "hover:no-underline")}>
            <span>
              {m.label}
              <span className={cn("ml-2", sunTimesClasses.accordionDays)}>{m.daysLabel}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className={sunTimesClasses.accordionContent}>
            <MonthSunDataTable rows={m.rows} isLoading={loading} copy={page.copy} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** Year sun matrix (lg and up) or per-month accordion — draws `useSunTimesPage`. */
export function SunTimesYearGrid({ page, hideHeader = false }: { page: SunTimesPage; hideHeader?: boolean }) {
  if (page.status === "error") {
    return (
      <div className={cn("max-w-full shadow-ring-soft", sunTimesClasses.card, sunTimesClasses.cardClip)}>
        <p className={cn("m-0", sunTimesClasses.loadError)}>{page.copy.loadError}</p>
      </div>
    );
  }

  return (
    <div className={cn("max-w-full shadow-ring-soft", sunTimesClasses.card, sunTimesClasses.cardClip)}>
      <SunTimesLegend page={page} hideHeader={hideHeader} />
      <div className="hidden lg:block">
        <SunTimesYearMatrix page={page} />
      </div>
      <div className="lg:hidden">
        <SunTimesYearAccordion page={page} />
      </div>
    </div>
  );
}
