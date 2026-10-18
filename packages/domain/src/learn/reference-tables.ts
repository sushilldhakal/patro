import { NAKSHATRA_ICONS } from "../panchanga/nakshatra-icons";
import {
  KAR_FIX_NAMES,
  KAR_MOV,
  KARANA_EN,
  WHEEL_TITHIS,
  WHEEL_YOGAS,
} from "../panchanga/tithi-wheel-data";
import { NAK_LORD_EN, TATTVA_EN } from "../panchanga/wheel-locale";
import { PADA_AKSHAR, RASHI_ELEM, RASHI_LORDS, getWheelRashis } from "../panchanga/wheel-data";

/** English yoga names, in the same order as {@link WHEEL_YOGAS}. */
export const YOGA_EN = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
  "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
] as const;

/** Catalogue keys, not text. */
export const GRAHA_ROWS = [
  { name: "grahas.sun", meaning: "learn.diagrams.graha_meaning_sun" },
  { name: "grahas.moon", meaning: "learn.diagrams.graha_meaning_moon" },
  { name: "learn.diagrams.graha_mars", meaning: "learn.diagrams.graha_meaning_mars" },
  { name: "grahas.mercury", meaning: "learn.diagrams.graha_meaning_mercury" },
  { name: "grahas.jupiter", meaning: "learn.diagrams.graha_meaning_jupiter" },
  { name: "grahas.venus", meaning: "learn.diagrams.graha_meaning_venus" },
  { name: "grahas.saturn", meaning: "learn.diagrams.graha_meaning_saturn" },
  { name: "grahas.rahu", meaning: "learn.diagrams.graha_meaning_rahu" },
  { name: "grahas.ketu", meaning: "learn.diagrams.graha_meaning_ketu" },
] as const;

export type LearnRefKind = "rashi" | "graha" | "nakshatra" | "tithi" | "yoga" | "karana";

export type LearnRefTone = "num" | "deg" | "pada" | "sym";

export type LearnRefCell = { text: string; tone?: LearnRefTone };

export type LearnRefRow = {
  key: string;
  cells: Record<string, LearnRefCell>;
  highlight?: boolean;
};

export type LearnRefColumn = { key: string; header: string; width: number };

export type LearnRefTable = {
  caption: string;
  columns: LearnRefColumn[];
  rows: LearnRefRow[];
  note?: string;
};

export type LearnRefCopy = {
  t: (key: string) => string;
  pick: (ne: string, en: string) => string;
  digits: (n: number) => string;
};

function named(copy: LearnRefCopy, ne: string | undefined, en: Record<string, string> | ((key: string) => string | undefined)) {
  const name = ne ?? "";
  const english = typeof en === "function" ? en(name) : en[name];
  return copy.pick(name, english ?? name);
}

function karanaKey(english: string): string {
  return Object.keys(KARANA_EN).find((key) => KARANA_EN[key] === english) ?? "";
}

/** The six catalogue tables. Copy and digits come from the caller so this stays free of i18n. */
export function learnReferenceTable(kind: LearnRefKind, copy: LearnRefCopy): LearnRefTable {
  const { t, pick, digits } = copy;
  if (kind === "rashi") {
    return {
      caption: t("learn.12_rashis_each_30_360_total"),
      columns: [
        { key: "n", header: "#", width: 48 },
        { key: "name", header: t("learn.rashi"), width: 140 },
        { key: "deg", header: "°", width: 120 },
        { key: "lord", header: t("learn.lord"), width: 120 },
        { key: "element", header: t("learn.element"), width: 110 },
      ],
      rows: getWheelRashis().map((rashi, i) => ({
        key: rashi.en,
        cells: {
          n: { text: digits(i + 1), tone: "num" },
          name: { text: pick(rashi.ne, rashi.en) },
          deg: { text: `${digits(i * 30)}°–${digits((i + 1) * 30)}°`, tone: "deg" },
          lord: { text: named(copy, RASHI_LORDS[i], NAK_LORD_EN) },
          element: { text: named(copy, RASHI_ELEM[i], TATTVA_EN) },
        },
      })),
    };
  }
  if (kind === "graha") {
    return {
      caption: t("learn.nava_graha_9_used_in_panchanga_and_kundali"),
      columns: [
        { key: "n", header: "#", width: 48 },
        { key: "name", header: t("learn.graha"), width: 140 },
        { key: "meaning", header: t("learn.brief_meaning"), width: 280 },
      ],
      rows: GRAHA_ROWS.map((graha, i) => ({
        key: graha.name,
        cells: {
          n: { text: digits(i + 1), tone: "num" },
          name: { text: t(graha.name) },
          meaning: { text: t(graha.meaning) },
        },
      })),
    };
  }
  if (kind === "nakshatra") {
    return {
      caption: t("learn.27_nakshatras_each_13_20_four_padas_3_20_per_pada"),
      columns: [
        { key: "n", header: "#", width: 44 },
        { key: "name", header: t("learn.nakshatra"), width: 130 },
        { key: "deg", header: "°", width: 150 },
        { key: "lord", header: t("learn.lord"), width: 110 },
        { key: "symbol", header: t("learn.symbol"), width: 120 },
        { key: "p1", header: t("learn.pada_1"), width: 64 },
        { key: "p2", header: t("learn.pada_2"), width: 64 },
        { key: "p3", header: t("learn.pada_3"), width: 64 },
        { key: "p4", header: t("learn.pada_4"), width: 64 },
      ],
      rows: NAKSHATRA_ICONS.map((nak, i) => {
        const padas = PADA_AKSHAR[i] ?? [];
        const start = i * 13;
        return {
          key: nak.en,
          cells: {
            n: { text: digits(i + 1), tone: "num" },
            name: { text: pick(nak.ne, nak.en) },
            deg: { text: `${digits(start)}°${digits(20)}′–${digits(start + 13)}°${digits(20)}′`, tone: "deg" },
            lord: { text: pick(nak.lord_ne, NAK_LORD_EN[nak.lord_ne] ?? nak.lord_ne) },
            symbol: { text: nak.sym_ne, tone: "sym" },
            p1: { text: padas[0] ?? "", tone: "pada" },
            p2: { text: padas[1] ?? "", tone: "pada" },
            p3: { text: padas[2] ?? "", tone: "pada" },
            p4: { text: padas[3] ?? "", tone: "pada" },
          },
        };
      }),
    };
  }
  if (kind === "tithi") {
    return {
      caption: t("learn.30_tithis_the_12_angular_gap_between_moon_and_sun"),
      columns: [
        { key: "n", header: "#", width: 48 },
        { key: "name", header: t("learn.tithi"), width: 150 },
        { key: "paksha", header: t("learn.paksha"), width: 140 },
        { key: "angle", header: t("learn.angle"), width: 120 },
      ],
      rows: WHEEL_TITHIS.map((row, i) => ({
        key: `${row.en}-${i}`,
        highlight: Boolean(row.moon),
        cells: {
          n: { text: digits(i + 1), tone: "num" },
          name: { text: pick(row.ne, row.en) },
          paksha: { text: pick(row.paksha, row.pakshaEn ? `${row.pakshaEn} Paksha` : row.paksha) },
          angle: { text: `${digits(i * 12)}°–${digits((i + 1) * 12)}°`, tone: "deg" },
        },
      })),
    };
  }
  if (kind === "yoga") {
    return {
      caption: t("learn.27_yogas_sum_of_sun_moon_longitude_each_13_20"),
      columns: [
        { key: "n", header: "#", width: 48 },
        { key: "name", header: t("learn.yoga"), width: 160 },
        { key: "span", header: t("learn.text"), width: 180 },
      ],
      rows: WHEEL_YOGAS.map((yoga, i) => ({
        key: yoga,
        cells: {
          n: { text: digits(i + 1), tone: "num" },
          name: { text: pick(yoga, YOGA_EN[i] ?? yoga) },
          span: { text: `${digits(i * 13)}°${digits(20)}′–${digits((i + 1) * 13)}°${digits(20)}′`, tone: "deg" },
        },
      })),
    };
  }
  const kimstughna = karanaKey("Kimstughna");
  const vishti = karanaKey("Vishti");
  const movable = t("learn.movable_7");
  const fixed = t("learn.fixed_4");
  const rows: LearnRefRow[] = [
    {
      key: "kimstughna",
      highlight: true,
      cells: {
        n: { text: digits(1), tone: "num" },
        name: { text: pick(t("ui.learn.x_91824d34"), KARANA_EN[kimstughna] ?? "Kimstughna") },
        type: { text: t("learn.fixed") },
        note: { text: t("learn.first_half_of_shukla_pratipada_once_a_year") },
      },
    },
    ...KAR_MOV.map((name, i): LearnRefRow => ({
      key: KARANA_EN[name] ?? String(i),
      cells: {
        n: { text: digits(i + 2), tone: "num" },
        name: { text: `${pick(name, KARANA_EN[name] ?? name)}${name === vishti ? t("learn.bhadra") : ""}` },
        type: { text: movable },
        note: { text: t("learn.repeats_throughout_the_month") },
      },
    })),
    ...KAR_FIX_NAMES.slice(1).map((name, i): LearnRefRow => ({
      key: `fixed-${KARANA_EN[name] ?? i}`,
      cells: {
        n: { text: digits(i + 9), tone: "num" },
        name: { text: pick(name, KARANA_EN[name] ?? name) },
        type: { text: fixed },
        note: { text: t("learn.once_each_per_month_krishna_chaturdashi_aaushi_shukla_p") },
      },
    })),
  ];
  return {
    caption: t("learn.11_karanas_half_a_tithi_6_angle_60_karanas_per_month"),
    columns: [
      { key: "n", header: "#", width: 48 },
      { key: "name", header: t("learn.karana"), width: 150 },
      { key: "type", header: t("learn.type"), width: 120 },
      { key: "note", header: t("learn.note"), width: 280 },
    ],
    rows,
    note: t("learn.order_kimstughna_bava_vishti_8_shakuni_chatushpada_naga"),
  };
}
