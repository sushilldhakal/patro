/**
 * The muhurta board both apps draw for the per-day time tables: choghadiya,
 * hora, lagna, panchaka-rahita, pushkara navamsha, chandrabala and tarabala.
 * Each table turns its rows into timed slots; the board splits them into day
 * and night, and on today finds the slot the clock is in (or the next one).
 */
import {
  CHOGHADIYA_TYPE_KEYS,
  TONE_BY_KEY,
  choghadiyaName,
  choghadiyaQuality,
  choghadiyaTone,
  type ChoghadiyaTone,
} from "@vedic-patro/domain/panchanga/choghadiya-display";
import { formatNavataraQuality, formatNavataraTara } from "@vedic-patro/domain/panchanga/navatara-bala";
import { rashiNumberFromName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { parseHHMM } from "@vedic-patro/domain/panchanga/time-format";
import type { BalamCardItem } from "@vedic-patro/read-models/panchanga/balam-cards";
import type { TFunction } from "@vedic-patro/i18n/react";

type AnyRow = Record<string, unknown>;
type Text = { t: TFunction; lang: string; digits: (v: string | number) => string };

const pick = (lang: string, ne: unknown, en: unknown) => String((lang === "en" ? en : ne) ?? "");

/** Good / neutral / bad, or `plain` for slots that are neither (the lagnas). */
export type MuhurtaTone = ChoghadiyaTone | "plain";

export type MuhurtaSlot = {
  key: string;
  name: string;
  quality: string;
  tone: MuhurtaTone;
  /** `06:12–07:36`, or one clock for a moment. */
  time: string;
  /** Share of the whole sunrise-to-sunrise day, for the strip. */
  share: number;
  /** Only on today: before, at or after the clock. */
  state?: "past" | "now" | "next";
  /** A small tag after the name (pushkara navamsha times in a lagna). */
  badge?: string;
  /** Rashi or nakshatra glyph to draw before the name. */
  glyph?: { kind: "rashi" | "nakshatra"; name: string; number: number };
  /** The API row (hora rows draw their planet from it). */
  raw: AnyRow;
};

export type MuhurtaPhase = { id: "day" | "night"; title: string; range: string; slots: MuhurtaSlot[] };

export type MuhurtaBoard = {
  phases: MuhurtaPhase[];
  /** On today: the slot the clock is in, or else the next one to come. */
  now?: {
    label: string;
    slot: MuhurtaSlot;
    /** 0..1 through the slot; absent when the slot is still to come. */
    progress?: number;
    left: string;
    /** What follows: the next good slot, or simply the next one. */
    next?: { label: string; slot: MuhurtaSlot };
  };
  /** The kinds with the names in each: the legend, in one line. Empty: no legend. */
  groups: { tone: MuhurtaTone; title: string; names: string }[];
  /** Under the strip: sunrise, sunset, the next sunrise. Absent: no strip (the slots are moments, not a day). */
  marks?: { sunrise: string; sunset: string; nextSunrise: string };
  /** A line above everything (the moon sign or nakshatra the table counts from). */
  note?: string;
  nowLabel: string;
};

type Entry = {
  start: number;
  end: number;
  /** Shown instead of start–end (a moment). */
  time?: string;
  night?: boolean;
  name: string;
  quality: string;
  tone: MuhurtaTone;
  badge?: string;
  glyph?: MuhurtaSlot["glyph"];
  raw: AnyRow;
};

type Spec = {
  titles: { day: string; night: string };
  groups: MuhurtaBoard["groups"];
  /** `good`: point at the next good slot; `any`: at the next slot. */
  next: "good" | "any";
  strip: boolean;
  note?: string;
};

const TONE_TITLE: Record<ChoghadiyaTone, string> = {
  good: "choghadiya.quality_good",
  neutral: "choghadiya.quality_neutral",
  bad: "choghadiya.quality_bad",
};

function clockOf(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function duration(min: number, t: TFunction, digits: Text["digits"]): string {
  const total = Math.max(1, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t("choghadiya.minutes", { m: digits(m) });
  if (m === 0) return t("choghadiya.hours", { h: digits(h) });
  return t("choghadiya.hours_minutes", { h: digits(h), m: digits(m) });
}

/** A clock on the sunrise-to-sunrise day: times before sunrise belong to the night after. */
function dayMinute(clock: unknown, sunriseMin: number): number {
  const m = parseHHMM(typeof clock === "string" ? clock : undefined);
  if (m == null) return NaN;
  return m < sunriseMin - 60 ? m + 1440 : m;
}

/** A row's start and end from its ghati (choghadiya, hora) or its local clock (the lagna tables). */
function rowSpan(it: AnyRow, sunriseMin: number): { start: number; end: number } {
  if (typeof it.start_g === "number" && typeof it.end_g === "number") {
    return { start: sunriseMin + it.start_g * 24, end: sunriseMin + it.end_g * 24 };
  }
  const start = dayMinute(it.start_local_time_short ?? it.start_local_time, sunriseMin);
  let end = dayMinute(it.end_local_time_short ?? it.end_local_time, sunriseMin);
  if (end < start) end += 1440;
  return { start, end };
}

function build(entries: Entry[], sunriseMin: number, sunsetMin: number | null, nowMin: number | undefined, text: Text, spec: Spec): MuhurtaBoard {
  const { t, digits } = text;
  const timed = entries.filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));
  const first = timed[0]?.start ?? sunriseMin;
  const last = timed[timed.length - 1]?.end ?? sunriseMin + 1440;
  const span = last - first || 1440;
  // Before sunrise the clock is still in yesterday's night.
  const now = nowMin != null && nowMin >= Math.min(first, sunriseMin) ? nowMin : undefined;

  const slots = timed.map((e, i) => {
    const state: MuhurtaSlot["state"] = now == null ? undefined : now >= e.end ? "past" : now >= e.start ? "now" : "next";
    const slot: MuhurtaSlot = {
      key: String(i),
      name: e.name,
      quality: e.quality,
      tone: e.tone,
      time: e.time ?? `${digits(clockOf(e.start))}–${digits(clockOf(e.end))}`,
      share: (e.end - e.start) / span,
      state,
      badge: e.badge,
      glyph: e.glyph,
      raw: e.raw,
    };
    const night = e.night ?? (sunsetMin != null ? e.start >= sunsetMin - 1 : false);
    // A moment's range ends where it starts.
    return { slot, start: e.start, end: e.end, last: e.time ? e.start : e.end, night };
  });

  const phase = (id: "day" | "night"): MuhurtaPhase => {
    const list = slots.filter((s) => s.night === (id === "night"));
    const range = list.length ? `${digits(clockOf(list[0]!.start))}–${digits(clockOf(list[list.length - 1]!.last))}` : "";
    return { id, title: spec.titles[id], range, slots: list.map((s) => s.slot) };
  };

  const at = slots.findIndex((s) => s.slot.state === "now");
  const ahead = slots.findIndex((s) => s.slot.state === "next");
  const nextAfter = (from: number) =>
    slots.slice(from + 1).find((s) => s.slot.state === "next" && (spec.next === "any" || s.slot.tone === "good"));
  const nextLabel = (s: (typeof slots)[number]) =>
    t(spec.next === "good" ? "choghadiya.next_good" : "muhurta_board.then", { time: duration(s.start - now!, t, digits) });

  let card: MuhurtaBoard["now"];
  if (now != null && at >= 0) {
    const cur = slots[at]!;
    const next = nextAfter(at);
    card = {
      label: t("choghadiya.now"),
      slot: cur.slot,
      progress: Math.min(1, Math.max(0, (now - cur.start) / (cur.end - cur.start || 1))),
      left: t("choghadiya.left", { time: duration(cur.end - now, t, digits) }),
      next: next ? { label: nextLabel(next), slot: next.slot } : undefined,
    };
  } else if (now != null && ahead >= 0) {
    const up = slots[ahead]!;
    const next = nextAfter(ahead);
    card = {
      label: t("muhurta_board.upcoming"),
      slot: up.slot,
      left: t("muhurta_board.starts_in", { time: duration(up.start - now, t, digits) }),
      next: next ? { label: nextLabel(next), slot: next.slot } : undefined,
    };
  }

  const sunset = sunsetMin ?? slots.find((s) => s.night)?.start;
  const phases = [phase("day"), phase("night")].filter((p) => p.slots.length > 0);
  return {
    phases,
    now: card,
    groups: spec.groups,
    marks: spec.strip
      ? { sunrise: digits(clockOf(first)), sunset: sunset != null ? digits(clockOf(sunset)) : "", nextSunrise: digits(clockOf(last)) }
      : undefined,
    note: spec.note,
    nowLabel: t("choghadiya.now"),
  };
}

const dayNight = (t: TFunction, key: string) => ({ day: t(`${key}.day`), night: t(`${key}.night`) });

/* ── the tables ────────────────────────────────────────────────────────── */

export type BoardInput = { rows: readonly AnyRow[]; sunrise?: string; sunset?: string; nowMin?: number };

export function choghadiyaBoard({ rows, sunrise, sunset, nowMin }: BoardInput, text: Text): MuhurtaBoard {
  const { t, lang } = text;
  const rise = parseHHMM(sunrise) ?? 360;
  const entries = rows.map((it): Entry => {
    const nameNe = String(it.name_ne ?? it.name ?? "—");
    const bad = it.bad as boolean | undefined;
    return {
      ...rowSpan(it, rise),
      night: it.phase ? it.phase === "night" : undefined,
      name: choghadiyaName(nameNe, lang),
      quality: choghadiyaQuality(nameNe, lang, bad),
      tone: choghadiyaTone(nameNe, bad),
      raw: it,
    };
  });
  return build(entries, rise, parseHHMM(sunset), nowMin, text, {
    titles: dayNight(t, "choghadiya"),
    next: "good",
    strip: true,
    groups: (["good", "neutral", "bad"] as const).map((tone) => ({
      tone,
      title: t(TONE_TITLE[tone]),
      names: CHOGHADIYA_TYPE_KEYS.filter((k) => TONE_BY_KEY[k] === tone)
        .map((k) => t(`choghadiya.types.${k}.name`))
        .join(" · "),
    })),
  });
}

/** The seven hora lords, Sun first, with the tone the API gives each. */
const HORA_LORDS = [
  ["sun", "bad"],
  ["moon", "good"],
  ["mars", "bad"],
  ["mercury", "good"],
  ["jupiter", "good"],
  ["venus", "good"],
  ["saturn", "bad"],
] as const;

export function horaBoard({ rows, sunrise, sunset, nowMin }: BoardInput, text: Text): MuhurtaBoard {
  const { t, lang } = text;
  const rise = parseHHMM(sunrise) ?? 360;
  const entries = rows.map((it): Entry => {
    const key = String(it.planet ?? "");
    const bad = it.bad === true || it.tone === "bad";
    const known = HORA_LORDS.some(([k]) => k === key);
    return {
      ...rowSpan(it, rise),
      night: it.phase ? it.phase === "night" : undefined,
      name: pick(lang, it.planet_ne ?? it.name_ne, it.planet_en ?? it.name),
      quality: known ? t(`hora_board.use.${key}`) : t(bad ? TONE_TITLE.bad : TONE_TITLE.good),
      tone: bad ? "bad" : "good",
      raw: it,
    };
  });
  return build(entries, rise, parseHHMM(sunset), nowMin, text, {
    titles: dayNight(t, "hora_board"),
    next: "good",
    strip: true,
    groups: (["good", "bad"] as const).map((tone) => ({
      tone,
      title: t(TONE_TITLE[tone]),
      names: HORA_LORDS.filter(([, tn]) => tn === tone)
        .map(([k]) => t(`hora_board.lords.${k}`))
        .join(" · "),
    })),
  });
}

/** Chara (movable), sthira (fixed) or dvisvabhava (dual) — what a lagna suits. */
function lagnaNature(num: number): "chara" | "sthira" | "dvi" {
  return (["chara", "sthira", "dvi"] as const)[(num - 1) % 3]!;
}

type PushkaraMark = { local_time_short?: string; local_time?: string; degree_dms?: string };

export function lagnaBoard({ rows, sunrise, sunset, nowMin }: BoardInput, text: Text): MuhurtaBoard {
  const { t, lang, digits } = text;
  const rise = parseHHMM(sunrise) ?? 360;
  const entries = rows.map((it): Entry => {
    const num = typeof it.number === "number" ? it.number : (rashiNumberFromName(String(it.name_ne ?? it.name ?? "")) ?? 1);
    const marks = (Array.isArray(it.pushkara_navamsha) ? it.pushkara_navamsha : []) as PushkaraMark[];
    const times = marks.map((m) => digits(String(m.local_time_short ?? m.local_time ?? "").slice(0, 5))).filter(Boolean);
    return {
      ...rowSpan(it, rise),
      name: pick(lang, it.name_ne ?? it.name, it.name ?? it.name_ne),
      quality: t(`muhurta_board.lagna.${lagnaNature(num)}`),
      tone: "plain",
      badge: times.length ? `${t("common.pushkara")} ${times.join(", ")}` : undefined,
      glyph: { kind: "rashi", name: String(it.name_ne ?? it.name ?? ""), number: num },
      raw: it,
    };
  });
  return build(entries, rise, parseHHMM(sunset), nowMin, text, {
    titles: dayNight(t, "muhurta_board.lagna"),
    next: "any",
    strip: true,
    groups: [],
  });
}

/** Panchaka names as the API writes them (English) → string key. */
const PANCHAKA_KEY: Record<string, string> = {
  "Shubha Muhurta": "shubha",
  "Mrityu Panchaka": "mrityu",
  "Agni Panchaka": "agni",
  "Raja Panchaka": "raja",
  "Chora Panchaka": "chora",
  "Roga Panchaka": "roga",
};

export function panchakaBoard({ rows, sunrise, sunset, nowMin }: BoardInput, text: Text): MuhurtaBoard {
  const { t, lang } = text;
  const rise = parseHHMM(sunrise) ?? 360;
  const entries = rows.map((it): Entry => {
    const key = PANCHAKA_KEY[String(it.name ?? "")];
    const good = it.good === true;
    return {
      ...rowSpan(it, rise),
      name: key ? t(`muhurta_board.panchaka.${key}.name`) : pick(lang, it.name_ne ?? it.name, it.name ?? it.name_ne),
      quality: key ? t(`muhurta_board.panchaka.${key}.use`) : t(good ? TONE_TITLE.good : TONE_TITLE.bad),
      tone: good ? "good" : "bad",
      raw: it,
    };
  });
  return build(entries, rise, parseHHMM(sunset), nowMin, text, {
    titles: dayNight(t, "muhurta_board.panchaka"),
    next: "good",
    strip: true,
    groups: [
      { tone: "good", title: t(TONE_TITLE.good), names: t("muhurta_board.panchaka.shubha.name") },
      {
        tone: "bad",
        title: t(TONE_TITLE.bad),
        names: ["mrityu", "agni", "raja", "chora", "roga"].map((k) => t(`muhurta_board.panchaka.${k}.name`)).join(" · "),
      },
    ],
  });
}

/** Each pushkara navamsha is one ninth of its lagna (3°20′ of 30°). */
export function pushkaraBoard({ rows, sunrise, sunset, nowMin }: BoardInput, text: Text): MuhurtaBoard {
  const { t, lang, digits } = text;
  const rise = parseHHMM(sunrise) ?? 360;
  const entries = rows.flatMap((it): Entry[] => {
    const lagna = rowSpan(it, rise);
    const name = pick(lang, it.lagna_ne ?? it.lagna, it.lagna ?? it.lagna_ne);
    const num = rashiNumberFromName(String(it.lagna_ne ?? it.lagna ?? "")) ?? 1;
    const marks = (Array.isArray(it.pushkara_navamsha) ? it.pushkara_navamsha : []) as PushkaraMark[];
    return marks.map((m) => {
      const start = dayMinute(m.local_time_short ?? m.local_time, rise);
      return {
        start,
        end: start + (lagna.end - lagna.start) / 9,
        time: digits(clockOf(start)),
        name,
        quality: t("muhurta_board.pushkara_at", { name, deg: digits(String(m.degree_dms ?? "")) }),
        tone: "good",
        glyph: { kind: "rashi", name: String(it.lagna_ne ?? it.lagna ?? ""), number: num },
        raw: it,
      };
    });
  });
  entries.sort((a, b) => a.start - b.start);
  return build(entries, rise, parseHHMM(sunset), nowMin, text, {
    titles: dayNight(t, "muhurta_board.pushkara"),
    next: "any",
    strip: false,
    groups: [],
  });
}

const BALAM_TONE: Record<string, ChoghadiyaTone> = { best: "good", good: "good", neutral: "neutral", bad: "bad", worst: "bad" };

/** Chandrabala (the lagna spans) and tarabala (the nakshatra spans), each graded from the moon. */
export function balamBoard(
  cards: readonly BalamCardItem[],
  variant: "chandrabala" | "tarabala",
  formatName: (card: BalamCardItem) => string,
  input: { sunrise?: string; sunset?: string; nowMin?: number; note?: string },
  text: Text,
): MuhurtaBoard {
  const { t, lang } = text;
  const rise = parseHHMM(input.sunrise) ?? 360;
  const minute = (m: number | null) => (m == null ? NaN : m < rise - 60 ? m + 1440 : m);
  const entries = cards.map((c): Entry => {
    const start = minute(c.startMin);
    let end = minute(c.endMin);
    if (end < start) end += 1440;
    return {
      start,
      end,
      name: formatName(c),
      quality: `${formatNavataraTara(c.tara, lang)} · ${formatNavataraQuality(c.quality, lang)}`,
      tone: BALAM_TONE[c.tone] ?? "neutral",
      glyph: { kind: variant === "tarabala" ? "nakshatra" : "rashi", name: c.name, number: c.number },
      raw: c as unknown as AnyRow,
    };
  });
  return build(entries, rise, parseHHMM(input.sunset), input.nowMin, text, {
    titles: dayNight(t, `muhurta_board.${variant}`),
    next: "good",
    strip: true,
    note: input.note,
    groups: [
      { tone: "good", title: t("muhurta_board.balam.good"), names: "" },
      { tone: "neutral", title: t("muhurta_board.balam.neutral"), names: "" },
      { tone: "bad", title: t("muhurta_board.balam.bad"), names: "" },
    ],
  });
}
