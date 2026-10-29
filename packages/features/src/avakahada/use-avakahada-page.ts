/**
 * Avakahada chakra page logic, shared by the website
 * (`apps/web/src/pages/AvakahadaChakra.tsx`) and the app
 * (`apps/mobile/app/panchanga/avakahada-chakra.tsx`).
 */
import { useMemo, useState } from "react";
import { BHAUMA_DOSHA_SHLOKAS, MANGLI_VARGAS } from "@vedic-patro/domain/jyotish/avakahada-data";
import { localizeVarga } from "@vedic-patro/domain/jyotish/avakahada-locale";
import { useLocale } from "@vedic-patro/i18n/react";
import {
  AVAKAHADA_COLUMNS,
  avakahadaRows,
  filterAvakahada,
  nextAvakahadaSort,
  sortAvakahada,
  type AvakahadaColumnKey,
  type AvakahadaSort,
} from "./model";

export * from "./model";

export function useAvakahadaPage() {
  const { t, lang } = useLocale();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AvakahadaSort>(null);
  const all = useMemo(() => avakahadaRows(lang), [lang]);
  const rows = useMemo(() => sortAvakahada(filterAvakahada(all, search), sort), [all, search, sort]);
  return {
    copy: {
      title: t("avakahada.title"),
      subtitle: t("avakahada.subtitle"),
      note: t("avakahada.abhijit_note"),
      searchPlaceholder: t("avakahada.search_placeholder"),
      noResults: t("avakahada.no_results"),
      bhoomadoshaTitle: t("avakahada.bhoomadosha_title"),
      nameGroups: t("avakahada.name_groups"),
      bhoomadoshaNote: t("avakahada.bhoomadosha_note"),
      shloka: t("avakahada.shloka"),
      footnote: t("avakahada.footnote"),
    },
    charanTitle: (n: number, rashi: string) => t("avakahada.charan_title", { n: String(n), rashi }),
    search,
    setSearch,
    columns: AVAKAHADA_COLUMNS.map((c) => ({
      ...c,
      label: t(c.labelKey),
      sorted: sort && (sort.key === c.key) ? sort.dir : null,
    })),
    toggleSort: (key: AvakahadaColumnKey) => setSort((s) => nextAvakahadaSort(s, key)),
    rows,
    /** Rows to light up on the wheel: the matches while searching, none otherwise. */
    highlighted: search.trim() ? rows : undefined,
    vargas: MANGLI_VARGAS.map((v) => ({ key: v.varga, varga: localizeVarga(v.varga, lang), shatru: localizeVarga(v.shatru, lang) })),
    shlokas: BHAUMA_DOSHA_SHLOKAS,
  };
}
