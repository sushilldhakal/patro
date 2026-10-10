import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  fetchYogaReference,
  type YogaReferenceEntry,
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-2 text-sm align-top";

export type YogaReferenceCatalogProps = {
  /** 162-ids present in this chart, hidden here so they aren't shown twice. */
  excludeIds?: ReadonlySet<string>;
};

/**
 * Reference catalog of Raman's 162 combinations (Part I), showing the ones that
 * are NOT formed in this chart. Present combinations live in the "कुण्डली योग"
 * table instead; their ids arrive via `excludeIds` and are filtered out here.
 * Fetched once from the CDN-cached `/kundali/yogas/reference` endpoint.
 */
export function YogaReferenceCatalog({ excludeIds }: YogaReferenceCatalogProps = {}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [entries, setEntries] = useState<YogaReferenceEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || entries || error) return;
    let alive = true;
    fetchYogaReference()
      .then((res) => alive && setEntries(res.combinations))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [open, entries, error]);

  // Base list = the 162 minus whatever is already present in the chart.
  const available = useMemo(
    () =>
      entries?.filter((e) => !(excludeIds?.has(e.yogaId) ?? false)) ?? [],
    [entries, excludeIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((e) =>
      [e.name, e.nameNe, e.yogaId, e.definition, e.definitionNe, e.result, e.resultNe]
        // Guard: an older API payload may lack the Nepali fields (undefined).
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [available, query]);

  return (
    <div className="mt-4 rounded-xl border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {t("kundali.yoga_reference_catalog_162_combinations")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("kundali.x.yoga_catalog_source")}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border/60 p-3">
          {error ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              {t("kundali.could_not_load_the_reference_catalog")}
            </p>
          ) : !entries ? (
            <p className="flex items-center justify-center gap-2 px-1 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("kundali.loading")}
            </p>
          ) : (
            <>
              <label className="mb-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("kundali.x.yoga_catalog_search_placeholder")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn(th, "pl-3.5")}>ID</TableHead>
                      <TableHead className={th}>{t("kundali.yoga")}</TableHead>
                      <TableHead className={th}>{t("kundali.rule")}</TableHead>
                      <TableHead className={cn(th, "pr-3.5")}>{t("kundali.result")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e, i) => (
                      <TableRow
                        key={e.yogaId}
                        className={cn(i % 2 === 1 && "bg-muted/20")}
                      >
                        <TableCell className={cn(td, "pl-3.5 whitespace-nowrap font-mono text-xs text-muted-foreground")}>
                          {e.yogaId}
                        </TableCell>
                        <TableCell className={cn(td, "whitespace-nowrap font-semibold text-foreground")}>
                          {bilingualText(lang, e.nameNe?.trim() ? e.nameNe : e.name, e.name)}
                        </TableCell>
                        <TableCell className={cn(td, "min-w-[14rem] whitespace-normal leading-snug")}>
                          {bilingualText(lang, e.definitionNe?.trim() ? e.definitionNe : e.definition, e.definition)}
                        </TableCell>
                        <TableCell className={cn(td, "min-w-[12rem] whitespace-normal pr-3.5 leading-snug")}>
                          {bilingualText(lang, e.resultNe?.trim() ? e.resultNe : e.result, e.result)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="px-3.5 py-6 text-center text-sm text-muted-foreground"
                        >
                          {t("kundali.no_matching_combination")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                {t("kundali.grouped_ids_e_g_33_44_75_106_are_kept_as_in_the_source_")}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
