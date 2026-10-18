import { Grid3x3, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useAvakahadaPage, charanRashiLabel, type AvakahadaRow, type AvakahadaColumnKey } from "@vedic-patro/features/avakahada";
import { useLocale } from "@/i18n/locale";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroStickyHeadCell, patroStickyHeadCorner, patroStickyHeadRow } from "@/lib/patro-classes";
import { findNakshatraIcon } from "@vedic-patro/domain/panchanga/nakshatra-icons";
import { AvakahadaWheel } from "@/components/avakahada/AvakahadaWheel";
import { avakahadaClasses } from "@vedic-patro/design-tokens/classes/avakahada-classes";

const NAK_ICON_SVG = "inline-block h-5 w-5 [&>svg]:h-full [&>svg]:w-full [&_path]:fill-current";
const SEARCH_ICON = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2";
const STICKY_CELL = "sticky left-0 z-10 bg-background";

/** Avakahada chakra — the website's drawing of `useAvakahadaPage` (@vedic-patro/features). */
export function AvakahadaChakra() {
  useRouteLoading(false);
  const page = useAvakahadaPage();

  return (
    <PageShell>
      <PageHeader icon={<Grid3x3 className="h-7 w-7 text-secondary" />} title={page.copy.title} subtitle={page.copy.subtitle} />

      <p className={cn(avakahadaClasses.note, avakahadaClasses.noteText)}>{page.copy.note}</p>

      <div className={cn(avakahadaClasses.searchWrap, "relative")}>
        <Search className={SEARCH_ICON} />
        <Input value={page.search} onChange={(e) => page.setSearch(e.target.value)} placeholder={page.copy.searchPlaceholder} className="pl-9" />
      </div>

      <div className={cn(avakahadaClasses.tableWrap, "overflow-x-auto")}>
        <Table>
          <TableHeader>
            <TableRow className={cn(patroStickyHeadRow, "bg-muted/60 hover:bg-muted/60")}>
              {page.columns.map((col, i) => (
                <TableHead
                  key={col.key}
                  onClick={col.sortable ? () => page.toggleSort(col.key) : undefined}
                  className={cn(
                    avakahadaClasses.headLabel,
                    "whitespace-nowrap",
                    i === 0 ? cn(patroStickyHeadCorner, "bg-muted/60") : cn(patroStickyHeadCell, "bg-muted/60"),
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                  )}
                >
                  <span className={cn(avakahadaClasses.headInner, "flex")}>
                    {col.label}
                    {col.sortable &&
                      (col.sorted === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : col.sorted === "desc" ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      ))}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={page.columns.length} className={cn(avakahadaClasses.emptyCell, avakahadaClasses.emptyText)}>
                  {page.copy.noResults}
                </TableCell>
              </TableRow>
            ) : (
              page.rows.map((row) => (
                <TableRow key={row.index} className="group">
                  {page.columns.map((col, i) => (
                    <TableCell key={col.key} className={cn("align-middle", i === 0 && cn(STICKY_CELL, "group-hover:bg-muted/40"))}>
                      <Cell row={row} column={col.key} charanTitle={page.charanTitle} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AvakahadaWheel highlighted={page.highlighted} />

      <section className={cn(avakahadaClasses.notes, "flex flex-col")}>
        <h2 className={avakahadaClasses.notesTitle}>{page.copy.bhoomadoshaTitle}</h2>
        <div className={cn(avakahadaClasses.notesGrid, "grid sm:grid-cols-2")}>
          <div className={avakahadaClasses.notesCard}>
            <h3 className={avakahadaClasses.notesCardTitle}>{page.copy.nameGroups}</h3>
            <ul className={cn(avakahadaClasses.vargaList, "flex flex-col text-sm")}>
              {page.vargas.map((v) => (
                <li key={v.key} className={cn(avakahadaClasses.vargaRow, "flex")}>
                  <span className={avakahadaClasses.vargaName}>{v.varga}</span>
                  <span className={avakahadaClasses.vargaVs}>⚔</span>
                  <span className={avakahadaClasses.vargaName}>{v.shatru}</span>
                </li>
              ))}
            </ul>
            <p className={avakahadaClasses.vargaNote}>{page.copy.bhoomadoshaNote}</p>
          </div>
          <div className={avakahadaClasses.notesCard}>
            <h3 className={avakahadaClasses.notesCardTitle}>{page.copy.shloka}</h3>
            <div className={cn(avakahadaClasses.shlokaList, "flex flex-col")}>
              {page.shlokas.map((s, i) => (
                <p key={i} className={avakahadaClasses.shloka}>
                  {s}
                </p>
              ))}
            </div>
          </div>
        </div>
        <p className={avakahadaClasses.footnote}>{page.copy.footnote}</p>
      </section>
    </PageShell>
  );
}

function Cell({ row, column, charanTitle }: { row: AvakahadaRow; column: AvakahadaColumnKey; charanTitle: (n: number, rashi: string) => string }) {
  const { lang } = useLocale();
  switch (column) {
    case "nakshatra": {
      const icon = findNakshatraIcon(row.en);
      return (
        <div className={cn(avakahadaClasses.nakCell, "flex")}>
          <span className={cn(avakahadaClasses.nakIcon, "grid place-items-center")}>
            {icon?.svg ? (
              <span className={NAK_ICON_SVG} aria-hidden dangerouslySetInnerHTML={{ __html: icon.svg }} />
            ) : (
              <span className={avakahadaClasses.nakIndex}>{row.index}</span>
            )}
          </span>
          <span className={cn(avakahadaClasses.nakLabel, "whitespace-nowrap")}>
            {row.index}. {row.label}
          </span>
        </div>
      );
    }
    case "sanjnaMukha":
      return (
        <span className="whitespace-nowrap text-sm" title={row.sanjnaHint}>
          {row.sanjnaMukha}
        </span>
      );
    case "akshara":
      return (
        <div className={cn(avakahadaClasses.aksharaList, "flex")}>
          {row.aksharas.map((a, i) => (
            <span
              key={i}
              title={charanTitle(i + 1, charanRashiLabel(row, i, lang))}
              className={cn(avakahadaClasses.aksharaChip, avakahadaClasses.aksharaText, "inline-flex")}
            >
              {a}
            </span>
          ))}
        </div>
      );
    case "gana":
      return (
        <span
          className={cn(
            avakahadaClasses.ganaBadge,
            avakahadaClasses.ganaBadgeText,
            avakahadaClasses.ganaBg[row.gana],
            avakahadaClasses.ganaFg[row.gana],
            "inline-block",
          )}
        >
          {row.ganaLabel}
        </span>
      );
    default:
      return <span className="whitespace-nowrap">{row[column]}</span>;
  }
}

export default AvakahadaChakra;
