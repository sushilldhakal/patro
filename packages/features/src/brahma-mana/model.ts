/**
 * Brahma Māna page — the parts that need no React: the tree of time units as rows each app draws,
 * the pāda table, the solar-year table and the "where we are now" path. Numbers come from
 * `@vedic-patro/domain/calendar/brahma-mana`; all wording from `t()`.
 */
import {
  AHORATRA_YEARS,
  BRAHMA_LIFESPAN_YEARS,
  BRAHMA_TREE,
  BRAHMA_YEAR_YEARS,
  KALPA_SANDHI_YEARS,
  KALPA_YEARS,
  MAHAYUGAS_PER_KALPA,
  MAHAYUGAS_PER_MANVANTARA,
  MAHAYUGA_YEARS,
  MANVANTARAS_PER_KALPA,
  MANVANTARA_YEARS,
  NOW,
  PADA_YEARS,
  PARARDHA_YEARS,
  YUGAS,
  kaliYearsElapsed,
  kalpaYearsElapsed,
  type BrahmaNode,
  type BrahmaNodeId,
  type YugaId,
} from "@vedic-patro/domain/calendar/brahma-mana";
import type { TFunction } from "@vedic-patro/i18n/react";

type Text = { t: TFunction; lang: string; digits: (v: string | number) => string };

/** 4320000 → "4,320,000", in the reader's digits. */
export function groupedYears(n: number, text: Text): string {
  return text.digits(n.toLocaleString("en-US"));
}

/**
 * A spoken-size reading of a big number: "43 lakh 20 thousand" / "३१ नील १० खर्ब ४० अर्ब" in Nepali,
 * "4.32 billion" in English. The tables show the exact figure beside it.
 */
export function roughYears(n: number, text: Text): string {
  const { t, lang, digits } = text;
  if (lang === "en") {
    const scales: [number, string][] = [
      [1e15, "quadrillion"],
      [1e12, "trillion"],
      [1e9, "billion"],
      [1e6, "million"],
      [1e3, "thousand"],
    ];
    for (const [size, key] of scales) {
      if (n >= size) return `${Number((n / size).toPrecision(6))} ${t(`brahma_mana.scale.${key}`)}`;
    }
    return String(n);
  }
  const scales: [number, string][] = [
    [1e13, "nil"],
    [1e11, "kharab"],
    [1e9, "arab"],
    [1e7, "crore"],
    [1e5, "lakh"],
    [1e3, "thousand"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, key] of scales) {
    const q = Math.floor(rest / size);
    if (q > 0) {
      parts.push(`${digits(q)} ${t(`brahma_mana.scale.${key}`)}`);
      rest -= q * size;
    }
  }
  if (rest > 0) parts.push(digits(rest));
  return parts.join(" ");
}

export type BrahmaTreeRow = {
  id: BrahmaNodeId;
  /** Depth in the tree: 0 is Brahmā's life. */
  depth: number;
  /** Ids from the root down to this row's parent — a row shows while all of them are open. */
  ancestors: BrahmaNodeId[];
  hasChildren: boolean;
  /** Last child of its parent: its rail stops at its own dot. */
  last: boolean;
  /** Per ancestor column except the nearest: whether that branch's rail runs on past this row. */
  rails: boolean[];
  current: boolean;
  name: string;
  /** What one of these holds ("12 Brahma months = 360 day-nights"), or the yuga's pādas. */
  holds: string;
  /** "× 14" — how many its parent holds; absent when one. */
  count?: string;
  years: string;
  rough: string;
  /** Yugas: dawn · yuga · dusk. */
  split?: string;
};

function nodeHolds(node: BrahmaNode, text: Text): string {
  const { t, digits } = text;
  const yuga = YUGAS.find((y) => y.id === node.id);
  if (yuga) return yuga.padas === 1 ? t("brahma_mana.pada_one") : t("brahma_mana.padas", { n: digits(yuga.padas) });
  return t(`brahma_mana.node.${node.id}.holds`);
}

/** Every row of the tree in reading order; each app hides the ones under a closed node. */
export function brahmaTreeRows(text: Text): BrahmaTreeRow[] {
  const { t, digits } = text;
  const rows: BrahmaTreeRow[] = [];
  const walk = (node: BrahmaNode, depth: number, ancestors: BrahmaNodeId[], last: boolean, lasts: boolean[]) => {
    const yuga = YUGAS.find((y) => y.id === node.id);
    rows.push({
      id: node.id,
      depth,
      ancestors,
      hasChildren: Boolean(node.children?.length),
      last,
      rails: lasts.slice(0, -1).map((l) => !l),
      current: Boolean(node.current),
      name: t(`brahma_mana.node.${node.id}.name`),
      holds: nodeHolds(node, text),
      count: node.count > 1 ? t("brahma_mana.times", { n: digits(node.count) }) : undefined,
      years: t("brahma_mana.solar_years", { years: groupedYears(node.years, text) }),
      rough: roughYears(node.years, text),
      split: yuga
        ? t("brahma_mana.yuga_split", {
            dawn: groupedYears(yuga.sandhya, text),
            core: groupedYears(yuga.core, text),
            dusk: groupedYears(yuga.sandhya, text),
          })
        : undefined,
    });
    const kids = node.children ?? [];
    kids.forEach((child, i) => {
      const childLast = i === kids.length - 1;
      walk(child, depth + 1, [...ancestors, node.id], childLast, depth === 0 ? [childLast] : [...lasts, childLast]);
    });
  };
  walk(BRAHMA_TREE, 0, [], true, []);
  return rows;
}

/** Ids of every node that has children — what "expand all" opens. */
export const BRAHMA_BRANCH_IDS: BrahmaNodeId[] = (() => {
  const ids: BrahmaNodeId[] = [];
  const walk = (n: BrahmaNode) => {
    if (n.children?.length) {
      ids.push(n.id);
      n.children.forEach(walk);
    }
  };
  walk(BRAHMA_TREE);
  return ids;
})();

export type PadaRow = { key: YugaId | "mahayuga"; name: string; padas: string; calc: string; years: string; total?: boolean };

export function padaRows(text: Text): PadaRow[] {
  const { t, digits } = text;
  const pada = groupedYears(PADA_YEARS, text);
  const rows: PadaRow[] = YUGAS.map((y) => ({
    key: y.id,
    name: t(`brahma_mana.node.${y.id}.name`),
    padas: digits(y.padas),
    calc: `${digits(y.padas)} × ${pada}`,
    years: groupedYears(y.years, text),
  }));
  rows.push({
    key: "mahayuga",
    name: t("brahma_mana.node.mahayuga.name"),
    padas: digits(10),
    calc: `${digits(10)} × ${pada}`,
    years: groupedYears(MAHAYUGA_YEARS, text),
    total: true,
  });
  return rows;
}

export type YearsRow = { key: string; unit: string; years: string; rough: string };

export function yearsRows(text: Text): YearsRow[] {
  const { t } = text;
  const row = (key: string, unit: string, years: number): YearsRow => ({
    key,
    unit,
    years: groupedYears(years, text),
    rough: roughYears(years, text),
  });
  return [
    ...[...YUGAS].reverse().map((y) => row(y.id, t(`brahma_mana.node.${y.id}.name`), y.years)),
    row("mahayuga", t("brahma_mana.node.mahayuga.name"), MAHAYUGA_YEARS),
    row("manvantara", t("brahma_mana.node.manvantara.name"), MANVANTARA_YEARS),
    row("kalpa", t("brahma_mana.node.day.name"), KALPA_YEARS),
    row("ahoratra", t("brahma_mana.node.ahoratra.name"), AHORATRA_YEARS),
    row("year", t("brahma_mana.node.year.name"), BRAHMA_YEAR_YEARS),
    row("parardha", t("brahma_mana.node.parardha.name"), PARARDHA_YEARS),
    row("lifespan", t("brahma_mana.node.lifespan.name"), BRAHMA_LIFESPAN_YEARS),
  ];
}

/** The path to now, top to bottom, for the "Where we are now" card. */
export function nowLines(ceYear: number, text: Text): string[] {
  const { t, digits } = text;
  return [
    t("brahma_mana.now_year", { year: digits(NOW.brahmaYear) }),
    t("brahma_mana.now_kalpa"),
    t("brahma_mana.now_manvantara", { n: digits(NOW.manvantara) }),
    t("brahma_mana.now_mahayuga", { n: digits(NOW.mahayuga) }),
    t("brahma_mana.now_kali", { years: groupedYears(kaliYearsElapsed(ceYear), text) }),
    t("brahma_mana.now_kalpa_elapsed", { years: groupedYears(kalpaYearsElapsed(ceYear), text) }),
  ];
}

export function brahmaNotes(text: Text): string[] {
  const { t, digits } = text;
  const core = MANVANTARAS_PER_KALPA * MAHAYUGAS_PER_MANVANTARA;
  return [
    t("brahma_mana.note_month"),
    t("brahma_mana.note_sandhi", {
      core: digits(core),
      rest: digits(MAHAYUGAS_PER_KALPA - core),
      sandhi: groupedYears(KALPA_SANDHI_YEARS, text),
      total: groupedYears(MAHAYUGAS_PER_KALPA, text),
    }),
    t("brahma_mana.note_night", { years: groupedYears(AHORATRA_YEARS, text) }),
    t("brahma_mana.note_year"),
  ];
}
