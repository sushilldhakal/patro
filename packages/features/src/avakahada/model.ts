/** Avakahada chakra — the 27 nakshatra rows, their columns, search and sort. */
import { AVAKAHADA, type Gana } from "@vedic-patro/domain/avakahada-data";
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
  sanjnaTitle,
} from "@vedic-patro/domain/avakahada-locale";

export interface AvakahadaRow {
  index: number;
  ne: string;
  en: string;
  /** Nakshatra name in the reader's language. */
  label: string;
  aksharas: string[];
  charanRashis: string[];
  aksharaText: string;
  swami: string;
  jati: string;
  sanjnaMukha: string;
  /** Explains the sanjna (tooltip on the website). */
  sanjnaHint?: string;
  rashiSwami: string;
  varnaVashya: string;
  yoniVairi: string;
  gana: Gana;
  ganaLabel: string;
  nadi: string;
}

export type AvakahadaColumnKey =
  | "nakshatra"
  | "swami"
  | "jati"
  | "sanjnaMukha"
  | "akshara"
  | "rashiSwami"
  | "varnaVashya"
  | "yoniVairi"
  | "gana"
  | "nadi";

export type AvakahadaColumn = { key: AvakahadaColumnKey; labelKey: string; width: number; sortable: boolean };

export const AVAKAHADA_COLUMNS: readonly AvakahadaColumn[] = [
  { key: "nakshatra", labelKey: "avakahada.col_nakshatra", width: 168, sortable: true },
  { key: "swami", labelKey: "avakahada.col_swami", width: 84, sortable: true },
  { key: "jati", labelKey: "avakahada.col_jati", width: 96, sortable: true },
  { key: "sanjnaMukha", labelKey: "avakahada.col_sanjna_mukha", width: 132, sortable: true },
  { key: "akshara", labelKey: "avakahada.col_akshara", width: 168, sortable: false },
  { key: "rashiSwami", labelKey: "avakahada.col_rashi_swami", width: 196, sortable: true },
  { key: "varnaVashya", labelKey: "avakahada.col_varna_vashya", width: 196, sortable: true },
  { key: "yoniVairi", labelKey: "avakahada.col_yoni_vairi", width: 148, sortable: true },
  { key: "gana", labelKey: "avakahada.col_gana", width: 84, sortable: true },
  { key: "nadi", labelKey: "avakahada.col_nadi", width: 84, sortable: true },
];

export function avakahadaRows(lang: string): AvakahadaRow[] {
  return AVAKAHADA.map((r) => ({
    index: r.index,
    ne: r.ne,
    en: r.en,
    label: localizeNakshatra(r, lang),
    aksharas: r.aksharas,
    charanRashis: r.charanRashis,
    aksharaText: r.aksharas.join(" "),
    swami: localizeLord(r.swami, lang),
    jati: localizeJati(r.jati, lang),
    sanjnaMukha: formatSanjnaMukha(r.sanjna, r.mukha, lang),
    sanjnaHint: r.sanjna ? sanjnaTitle(r.sanjna, lang) : undefined,
    rashiSwami: formatRashiSwami(r.charanRashis, lang),
    varnaVashya: formatVarnaVashya(r.charanRashis, lang),
    yoniVairi: formatYoniPair(r.yoni, r.vairiYoni, lang),
    gana: r.gana,
    ganaLabel: localizeGana(r.gana, lang),
    nadi: localizeNadi(r.nadi, lang),
  }));
}

/** The rashi each charan of a row falls in, for the syllable chips' titles. */
export function charanRashiLabel(row: AvakahadaRow, charan: number, lang: string): string {
  return localizeRashi(row.charanRashis[charan]!, lang);
}

/** Rows whose text contains the search in either language (case-insensitive). */
export function filterAvakahada(rows: readonly AvakahadaRow[], query: string): AvakahadaRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) =>
    [r.ne, r.en, r.label, r.swami, r.jati, r.sanjnaMukha, r.aksharaText, r.rashiSwami, r.varnaVashya, r.yoniVairi, r.gana, localizeGana(r.gana, "en"), r.nadi]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export type AvakahadaSort = { key: Exclude<AvakahadaColumnKey, "akshara">; dir: "asc" | "desc" } | null;

/** Nakshatra order until a column is chosen. */
export function sortAvakahada(rows: readonly AvakahadaRow[], sort: AvakahadaSort): AvakahadaRow[] {
  if (!sort) return [...rows];
  const dir = sort.dir === "asc" ? 1 : -1;
  const value = (r: AvakahadaRow) => (sort.key === "nakshatra" ? r.index : r[sort.key]);
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
  });
}

/** Header press: ascending, then descending, then back to nakshatra order. */
export function nextAvakahadaSort(current: AvakahadaSort, key: AvakahadaColumnKey): AvakahadaSort {
  if (key === "akshara") return current;
  if (!current || current.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}
