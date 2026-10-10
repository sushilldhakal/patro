import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type FilterFn,
} from "@tanstack/react-table";
import { Grid3x3, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "../lib/utils";
import {
  patroStickyHeadCell,
  patroStickyHeadCorner,
  patroStickyHeadRow,
} from "@/lib/patro-classes";
import { findNakshatraIcon } from "@/lib/nakshatra-icons";
import {
  AVAKAHADA,
  MANGLI_VARGAS,
  BHAUMA_DOSHA_SHLOKAS,
  type Gana,
} from "@/lib/avakahada-data";
import {
  formatRashiSwami,
  formatSanjnaMukha,
  formatVarnaVashya,
  formatYoniPair,
  localizeGana,
  localizeJati,
  localizeLord,
  localizeNadi,
  localizeNakshatra,
  localizeRashi,
  localizeVarga,
  sanjnaTitle,
} from "@/lib/avakahada-locale";
import { AvakahadaWheel } from "@/components/avakahada/AvakahadaWheel";

const ganaTone: Record<Gana, string> = {
  देव: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  नर: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  राक्षस: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

interface Row {
  index: number;
  ne: string;
  en: string;
  aksharas: string[];
  charanRashis: string[];
  aksharaText: string;
  swami: string;
  jati: string;
  sanjnaMukha: string;
  rashiSwami: string;
  varnaVashya: string;
  yoniVairi: string;
  gana: Gana;
  nadi: string;
}

function buildRows(lang: string): Row[] {
  return AVAKAHADA.map((r) => ({
    index: r.index,
    ne: r.ne,
    en: r.en,
    aksharas: r.aksharas,
    charanRashis: r.charanRashis,
    aksharaText: r.aksharas.join(" "),
    swami: localizeLord(r.swami, lang),
    jati: localizeJati(r.jati, lang),
    sanjnaMukha: formatSanjnaMukha(r.sanjna, r.mukha, lang),
    rashiSwami: formatRashiSwami(r.charanRashis, lang),
    varnaVashya: formatVarnaVashya(r.charanRashis, lang),
    yoniVairi: formatYoniPair(r.yoni, r.vairiYoni, lang),
    gana: r.gana,
    nadi: localizeNadi(r.nadi, lang),
  }));
}

const fuzzy: FilterFn<Row> = (row, _id, value: string) => {
  const q = String(value).trim().toLowerCase();
  if (!q) return true;
  const o = row.original;
  return [
    o.ne,
    o.en,
    o.swami,
    o.jati,
    o.sanjnaMukha,
    o.aksharaText,
    o.rashiSwami,
    o.varnaVashya,
    o.yoniVairi,
    o.gana,
    localizeGana(o.gana, "en"),
    o.nadi,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
};

function NakshatraCell({ row, lang }: { row: Row; lang: string }) {
  const icon = findNakshatraIcon(row.en);
  const label = localizeNakshatra(row, lang);
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center text-secondary">
        {icon?.svg ? (
          <span
            className="inline-block h-5 w-5 [&>svg]:h-full [&>svg]:w-full [&_path]:fill-current"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: icon.svg }}
          />
        ) : (
          <span className="text-xs">{row.index}</span>
        )}
      </span>
      <span className="whitespace-nowrap text-base text-foreground">
        {row.index}. {label}
      </span>
    </div>
  );
}

function useColumns(lang: string, t: (key: string, opts?: Record<string, string>) => string): ColumnDef<Row>[] {
  return useMemo(
    () => [
      {
        id: "nakshatra",
        header: t("avakahada.col_nakshatra"),
        accessorFn: (r) => r.index,
        cell: ({ row }) => <NakshatraCell row={row.original} lang={lang} />,
      },
      {
        id: "swami",
        header: t("avakahada.col_swami"),
        accessorKey: "swami",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.swami}</span>
        ),
      },
      {
        id: "jati",
        header: t("avakahada.col_jati"),
        accessorKey: "jati",
        cell: (c) => <span className="whitespace-nowrap">{c.getValue<string>()}</span>,
      },
      {
        id: "sanjnaMukha",
        header: t("avakahada.col_sanjna_mukha"),
        accessorKey: "sanjnaMukha",
        cell: ({ row }) => {
          const raw = AVAKAHADA[row.original.index - 1]?.sanjna;
          const hint = raw ? sanjnaTitle(raw, lang) : undefined;
          return (
            <span className="whitespace-nowrap text-sm" title={hint}>
              {row.original.sanjnaMukha}
            </span>
          );
        },
      },
      {
        id: "akshara",
        header: t("avakahada.col_akshara"),
        accessorFn: (r) => r.aksharaText,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.aksharas.map((a, i) => (
              <span
                key={i}
                title={t("avakahada.charan_title", {
                  n: String(i + 1),
                  rashi: localizeRashi(row.original.charanRashis[i]!, lang),
                })}
                className="inline-flex min-w-7 items-center justify-center rounded-md border border-border bg-card px-1.5 py-0.5 text-base text-foreground"
              >
                {a}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "rashiSwami",
        header: t("avakahada.col_rashi_swami"),
        accessorKey: "rashiSwami",
        cell: (c) => <span className="whitespace-nowrap">{c.getValue<string>()}</span>,
      },
      {
        id: "varnaVashya",
        header: t("avakahada.col_varna_vashya"),
        accessorKey: "varnaVashya",
        cell: (c) => <span className="whitespace-nowrap">{c.getValue<string>()}</span>,
      },
      {
        id: "yoniVairi",
        header: t("avakahada.col_yoni_vairi"),
        accessorKey: "yoniVairi",
        cell: (c) => <span className="whitespace-nowrap">{c.getValue<string>()}</span>,
      },
      {
        id: "gana",
        header: t("avakahada.col_gana"),
        accessorKey: "gana",
        cell: ({ getValue }) => {
          const g = getValue<Gana>();
          return (
            <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs text-base", ganaTone[g])}>
              {localizeGana(g, lang)}
            </span>
          );
        },
      },
      {
        id: "nadi",
        header: t("avakahada.col_nadi"),
        accessorKey: "nadi",
        cell: (c) => <span className="whitespace-nowrap">{c.getValue<string>()}</span>,
      },
    ],
    [lang, t],
  );
}

export function AvakahadaChakra() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  useRouteLoading(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo(() => buildRows(lang), [lang]);
  const columns = useColumns(lang, t);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzy,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const stickyHead = patroStickyHeadCorner;
  const stickyHeadCell = patroStickyHeadCell;
  const stickyCell = "sticky left-0 z-10 bg-background";
  const rows = table.getRowModel().rows;

  return (
    <PageShell>
      <PageHeader
        icon={<Grid3x3 className="h-7 w-7 text-secondary" />}
        title={t("avakahada.title")}
        subtitle={t("avakahada.subtitle")}
      />

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        {t("avakahada.abhijit_note")}
      </p>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={t("avakahada.search_placeholder")}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className={cn(patroStickyHeadRow, "bg-muted/60 hover:bg-muted/60")}>
                {hg.headers.map((h, i) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead
                      key={h.id}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        "whitespace-nowrap font-semibold",
                        i === 0 ? cn(stickyHead, "bg-muted/60") : cn(stickyHeadCell, "bg-muted/60"),
                        canSort && "cursor-pointer select-none hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort &&
                          (sorted === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                          ))}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center">
                  {t("avakahada.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map((cell, i) => (
                    <TableCell
                      key={cell.id}
                      className={cn("align-middle", i === 0 && cn(stickyCell, "group-hover:bg-muted/40"))}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AvakahadaWheel highlighted={globalFilter.trim() ? rows.map((r) => r.original) : undefined} />

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{t("avakahada.bhoomadosha_title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t("avakahada.name_groups")}</h3>
            <ul className="space-y-1.5 text-sm">
              {MANGLI_VARGAS.map((v) => (
                <li key={v.varga} className="flex items-center gap-2">
                  <span className="text-base text-foreground">{localizeVarga(v.varga, lang)}</span>
                  <span className="text-xs">⚔</span>
                  <span className="text-base text-foreground">{localizeVarga(v.shatru, lang)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs">{t("avakahada.bhoomadosha_note")}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t("avakahada.shloka")}</h3>
            <div className="space-y-3">
              {BHAUMA_DOSHA_SHLOKAS.map((s, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {s}
                </p>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs">{t("avakahada.footnote")}</p>
      </section>
    </PageShell>
  );
}

export default AvakahadaChakra;
