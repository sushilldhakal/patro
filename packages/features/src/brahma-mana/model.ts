/**
 * Brahma Māna page — the parts that need no React: the tree of time units as rows each app draws,
 * the pāda table, the solar-year table and the "where we are now" path. Numbers come from
 * `@vedic-patro/domain/calendar/brahma-mana`; all wording from `t()`.
 */
import {
  AHORATRA_YEARS,
  BRAHMA_LIFESPAN_YEARS,
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
  SOLAR_YEARS_PER_DIVYA,
  TIME_ROOT,
  timeChildren,
  type TimeKind,
  type TimeNode,
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
  key: string;
  kind: TimeKind;
  /** Depth in the tree: 0 is Brahmā's life. */
  depth: number;
  hasChildren: boolean;
  open: boolean;
  /** Last child of its parent: its rail stops at its own elbow. */
  last: boolean;
  /** Per ancestor column except the nearest: whether that branch's rail runs on past this row. */
  rails: boolean[];
  /** On the path to now. */
  current: boolean;
  /** "Prājāpatya māna" above the first Manvantara of a Kalpa, "divya māna" above the first Mahāyuga. */
  mana?: string;
  name: string;
  /** "12,000,000 divya varṣa". */
  divya: string;
  /** "≈ 4.32 billion solar years" — the exact figure is in the tables. */
  solar: string;
};

function instanceName(n: TimeNode, text: Text): string {
  const { t, digits } = text;
  const num = n.index != null ? digits(n.index) : "";
  switch (n.kind) {
    case "kalpa":
      // The 30 Kalpas of a Brahma month, Śveta to Pitṛ.
      return t("brahma_mana.inst.kalpa_named", { n: num, name: t(`brahma_mana.kalpa_name.${n.index}`) });
    case "manvantara_full":
      return t("brahma_mana.inst.manvantara_full", { n: num, name: t(`brahma_mana.manvantara_name.${n.index}`) });
    case "yuga":
      return t(`brahma_mana.node.${n.yuga}.name`);
    default:
      return t(`brahma_mana.inst.${n.kind}`, { n: num });
  }
}

function manaLabel(n: TimeNode, firstOfKind: boolean, text: Text): string | undefined {
  if (!firstOfKind) return undefined;
  if (n.kind === "manvantara_full") return text.t("brahma_mana.mana.prajapatya");
  if (n.kind === "mahayuga") return text.t("brahma_mana.mana.divya");
  return undefined;
}

/** The rows to draw: every node whose ancestors are all open, in reading order. */
export function brahmaTreeRows(open: ReadonlySet<string>, text: Text): BrahmaTreeRow[] {
  const { t } = text;
  const rows: BrahmaTreeRow[] = [];
  const walk = (n: TimeNode, depth: number, last: boolean, lasts: boolean[], firstOfKind: boolean) => {
    const isOpen = n.hasChildren && open.has(n.key);
    const solarYears = n.divya * SOLAR_YEARS_PER_DIVYA;
    rows.push({
      key: n.key,
      kind: n.kind,
      depth,
      hasChildren: n.hasChildren,
      open: isOpen,
      last,
      rails: lasts.slice(0, -1).map((l) => !l),
      current: n.current,
      mana: manaLabel(n, firstOfKind, text),
      name: instanceName(n, text),
      divya: t("brahma_mana.divya", { n: groupedYears(n.divya, text) }),
      solar: t("brahma_mana.rough_solar", { rough: roughYears(solarYears, text) }),
    });
    if (!isOpen) return;
    const kids = timeChildren(n);
    const seen = new Set<TimeKind>();
    kids.forEach((c, i) => {
      const childLast = i === kids.length - 1;
      const first = !seen.has(c.kind);
      seen.add(c.kind);
      walk(c, depth + 1, childLast, depth === 0 ? [childLast] : [...lasts, childLast], first);
    });
  };
  walk(TIME_ROOT, 0, true, [], false);
  return rows;
}

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

export type YearsRow = { key: string; unit: string; divya: string; years: string; rough: string };

export function yearsRows(text: Text): YearsRow[] {
  const { t } = text;
  const row = (key: string, unit: string, years: number): YearsRow => ({
    key,
    unit,
    divya: groupedYears(years / SOLAR_YEARS_PER_DIVYA, text),
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
