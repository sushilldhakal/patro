/**
 * The yoga reference catalogue, shared by the website's and the app's
 * `components/kundali/YogaReferenceCatalog.tsx`: Raman's 162 combinations
 * (Part I) that are NOT formed in this chart. Present combinations live in
 * the chart's yoga table instead; their ids arrive via `excludeIds` and are
 * filtered out here. Fetched once (when first opened) from the CDN-cached
 * `/kundali/yogas/reference` endpoint, then searched locally.
 */
import { useEffect, useMemo, useState } from "react";
import { fetchYogaReference, type YogaReferenceEntry } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export function useYogaReferenceCatalog({ excludeIds }: { excludeIds?: ReadonlySet<string> } = {}) {
  const { t, lang } = useLocale();
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
  const available = useMemo(() => entries?.filter((e) => !(excludeIds?.has(e.yogaId) ?? false)) ?? [], [entries, excludeIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((e) =>
      [e.name, e.nameNe, e.yogaId, e.definition, e.definitionNe, e.result, e.resultNe]
        // Guard: an older API payload may lack the Nepali fields (undefined).
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [available, query]);

  const pickNe = (ne: string | undefined, en: string) => bilingualText(lang, ne?.trim() ? ne : en, en);

  return {
    open,
    toggle: () => setOpen((v) => !v),
    status: error ? ("error" as const) : !entries ? ("loading" as const) : ("ready" as const),
    query,
    setQuery,
    title: t("kundali.yoga_reference_catalog_162_combinations"),
    source: t("kundali.x.yoga_catalog_source"),
    errorText: t("kundali.could_not_load_the_reference_catalog"),
    loadingText: t("kundali.loading"),
    searchPlaceholder: t("kundali.x.yoga_catalog_search_placeholder"),
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: t("kundali.yoga") },
      { key: "rule", label: t("kundali.rule") },
      { key: "result", label: t("kundali.result") },
    ],
    rows: filtered.map((e) => ({
      id: e.yogaId,
      name: pickNe(e.nameNe, e.name),
      definition: pickNe(e.definitionNe, e.definition),
      result: pickNe(e.resultNe, e.result),
    })),
    noMatch: t("kundali.no_matching_combination"),
    note: t("kundali.grouped_ids_e_g_33_44_75_106_are_kept_as_in_the_source_"),
  };
}
