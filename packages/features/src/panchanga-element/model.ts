/**
 * Panchanga element page — the parts that need no React: one card per span
 * (tithi, nakshatra, …: begins → ends), and the rows of a per-day table
 * (choghadiya, hora, lagna, chandrabala/tarabala tables, …). Both apps draw these.
 */
import type { ElementSpan } from "@vedic-patro/api-client";
import {
  CHOGHADIYA_TYPE_KEYS,
  TONE_BY_KEY,
  choghadiyaName,
  choghadiyaQuality,
  choghadiyaTone,
  type ChoghadiyaTone,
} from "@vedic-patro/domain/panchanga/choghadiya-display";
import { formatElementStampDisplay } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { formatEventDate } from "@vedic-patro/domain/panchanga/panchanga-format";
import { clockFromGhati, parseHHMM } from "@vedic-patro/domain/panchanga/time-format";
import type { TFunction } from "@vedic-patro/i18n/react";
import type { CalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";

type AnyRow = Record<string, unknown>;
type Text = { t: TFunction; lang: string; digits: (v: string | number) => string; calendar?: CalendarSystem };

/** Auspicious / inauspicious, as the API writes a row's quality (Nepali). */
const SHUBHA = "\u0936\u0941\u092d"; // copy-ok: API value
const ASHUBHA = "\u0905\u0936\u0941\u092d"; // copy-ok: API value

const pick = (lang: string, ne: unknown, en: unknown) => String((lang === "en" ? en : ne) ?? "");

export type SpanBoundaryView = { label: string; time: string; when: string };
export type SpanCard = {
  key: string;
  span: ElementSpan;
  name: string;
  paksha?: string;
  /** Tithi only: the patro day(s) it names — one, two (adhik) or none (kshaya). */
  days?: { label: string; list: string[]; empty?: string };
  /** "Adhik tithi" / "Kshaya tithi" badge, with a one-line why. */
  udaya?: { kind: "vriddhi" | "kshaya"; label: string; note: string };
  begins: SpanBoundaryView;
  ends: SpanBoundaryView;
};

/** Adhik and kshaya tithis of the browsed month, for the summary above the cards. */
export type UdayaSummary = { title: string; groups: { kind: "vriddhi" | "kshaya"; label: string; items: string[] }[] };

function patroDay(iso: string | undefined, text: Text): string | null {
  if (!iso) return null;
  try {
    return formatEventDate(iso, text.lang, text.calendar);
  } catch {
    return null;
  }
}

function joinDays(days: string[], t: TFunction): string {
  return days.join(t("common.tithi_day_join"));
}

export function spanCards(spans: readonly ElementSpan[], text: Text): SpanCard[] {
  const { t, lang, digits, calendar } = text;
  const boundary = (label: string, stamp: ElementSpan["begins"]): SpanBoundaryView => ({
    label,
    time: digits(stamp.time_label),
    when: formatElementStampDisplay(stamp, lang, calendar),
  });
  return spans.map((s, i) => {
    const days = s.udaya_days?.map((d) => patroDay(d, text)).filter((d): d is string => Boolean(d));
    const inside = patroDay(s.kshaya_day, text);
    return {
      key: `${s.name}-${i}`,
      span: s,
      name: pick(lang, s.name_ne || s.name, s.name || s.name_ne),
      paksha: s.paksha ? t(s.paksha === "shukla" ? "common.paksha_shukla" : "common.paksha_krishna") : undefined,
      days: days
        ? { label: t("common.tithi_patro_day"), list: days, empty: days.length ? undefined : t("common.tithi_no_day") }
        : undefined,
      udaya: s.udaya
        ? {
            kind: s.udaya,
            label: t(`common.tithi_${s.udaya}`),
            note:
              s.udaya === "kshaya"
                ? t("common.tithi_kshaya_note", { day: inside ?? "—" })
                : t("common.tithi_vriddhi_note", { days: joinDays(days ?? [], t) }),
          }
        : undefined,
      begins: boundary(t("common.begins"), s.begins),
      ends: boundary(t("common.ends"), s.ends),
    };
  });
}

export function udayaSummary(cards: readonly SpanCard[], text: Text): UdayaSummary | null {
  const { t } = text;
  const groups = (["vriddhi", "kshaya"] as const)
    .map((kind) => ({
      kind,
      label: t(`common.tithi_${kind}`),
      items: cards
        .filter((c) => c.udaya?.kind === kind)
        .map((c) =>
          kind === "vriddhi"
            ? t("common.tithi_summary_vriddhi", { name: c.name, days: joinDays(c.days?.list ?? [], t) })
            : t("common.tithi_summary_kshaya", { name: c.name, day: patroDay(c.span.kshaya_day, text) ?? "—" }),
        ),
    }))
    .filter((g) => g.items.length > 0);
  return groups.length ? { title: t("common.tithi_summary_title"), groups } : null;
}

export type ToneRowView = {
  key: string;
  label: string;
  trailing?: string;
  good: boolean;
  bad: boolean;
  /** "Pushkara" badge. */
  badge?: string;
  /** Glyph for moon/star strength rows. */
  glyph?: { kind: "rashi" | "nakshatra"; name: string; number: number };
  /** The raw API row (each app's row icon reads it). */
  raw: AnyRow;
};

export type ElementTableView =
  | { kind: "strength"; anchor?: { label: string; value: string }; rows: ToneRowView[] }
  | { kind: "board"; board: MuhurtaBoard }
  | { kind: "segments"; rows: ToneRowView[] }
  | { kind: "message"; text: string };

function segmentTime(it: AnyRow, sunriseMin: number | null, digits: Text["digits"]): string | undefined {
  if (it.start_local_time_short) return `${digits(String(it.start_local_time_short))}–${digits(String(it.end_local_time_short ?? ""))}`;
  if (typeof it.start_g === "number") {
    const a = clockFromGhati(sunriseMin, it.start_g);
    const b = clockFromGhati(sunriseMin, it.end_g as number);
    if (a && b) return `${digits(a)}–${digits(b)}`;
  }
  return undefined;
}

/** One element's per-day payload as rows. */
/** `nowMin` is the clock (minutes after midnight) when the browsed day is today: the choghadiya and hora boards mark the slot it falls in. */
export function elementTable(data: unknown, sunrise: string | undefined, elementId: string, text: Text, nowMin?: number): ElementTableView {
  const { t, lang, digits } = text;
  const sunriseMin = parseHHMM(sunrise);

  // Object with a `rows` array → moon/star strength table (chandrabala/tarabala).
  if (data && typeof data === "object" && Array.isArray((data as AnyRow).rows)) {
    const obj = data as AnyRow;
    const anchor = pick(lang, obj.moon_label ?? obj.label_ne, obj.moon_label_en ?? obj.label_en);
    return {
      kind: "strength",
      anchor: anchor ? { label: t("common.moon_sign"), value: anchor } : undefined,
      rows: (obj.rows as AnyRow[]).map((r, i) => ({
        key: String(i),
        label: pick(lang, r.name, r.name_en ?? r.name),
        trailing: `${String(r.tara ?? "")}${r.quality ? ` · ${String(r.quality)}` : ""}`.trim() || undefined,
        good: r.tone === "good" || r.quality === SHUBHA,
        bad: r.tone === "bad" || r.quality === ASHUBHA,
        glyph: { kind: elementId === "tarabala" ? "nakshatra" : "rashi", name: String(r.name ?? ""), number: typeof r.number === "number" ? r.number : i + 1 },
        raw: r,
      })),
    };
  }

  // Array of time segments (choghadiya / hora / lagna / panchaka / pushkara).
  if (Array.isArray(data)) {
    const rows = data as AnyRow[];
    if (rows.length === 0) return { kind: "message", text: t("element_page.no_entries_day") };
    if (elementId === "choghadiya") return { kind: "board", board: muhurtaBoard(rows, sunriseMin, nowMin, text, choghadiyaKind(text)) };
    if (elementId === "hora") return { kind: "board", board: muhurtaBoard(rows, sunriseMin, nowMin, text, horaKind(text)) };
    return {
      kind: "segments",
      rows: rows.map((it, i) => ({
        key: String(i),
        label: pick(
          lang,
          it.name_ne ?? it.planet_ne ?? it.lagna_ne ?? it.name ?? it.lagna ?? "—",
          it.name ?? it.planet_en ?? it.lagna ?? it.name_ne ?? "—",
        ),
        trailing: segmentTime(it, sunriseMin, digits),
        good: it.good === true || it.tone === "good",
        bad: it.bad === true || it.good === false,
        badge: Array.isArray(it.pushkara_navamsha) && it.pushkara_navamsha.length > 0 ? t("common.pushkara") : undefined,
        raw: it,
      })),
    };
  }

  return { kind: "message", text: t("common.no_data") };
}

/* ── muhurta board (choghadiya, hora) ──────────────────────────────────── */

export type MuhurtaSlot = {
  key: string;
  name: string;
  quality: string;
  tone: ChoghadiyaTone;
  /** `06:12–07:36`. */
  time: string;
  /** Share of the whole sunrise-to-sunrise day, for the strip. */
  share: number;
  /** Only on today: before, at or after the clock. */
  state?: "past" | "now" | "next";
  /** The API row (the hora rows draw their planet from it). */
  raw: AnyRow;
};

export type MuhurtaPhase = { id: "day" | "night"; title: string; range: string; slots: MuhurtaSlot[] };

export type MuhurtaBoard = {
  phases: MuhurtaPhase[];
  /** Today, between sunrise and the next sunrise: the slot the clock is in. */
  now?: {
    label: string;
    slot: MuhurtaSlot;
    /** 0..1 through the slot. */
    progress: number;
    left: string;
    /** The next good slot after this one, if the day has one left. */
    nextGood?: { label: string; slot: MuhurtaSlot };
  };
  /** The kinds with the names in each: the legend, in one line. */
  groups: { tone: ChoghadiyaTone; title: string; names: string }[];
  /** Under the strip: sunrise, sunset, the next sunrise. */
  marks: { sunrise: string; sunset: string; nextSunrise: string };
  nowLabel: string;
};

const TONE_TITLE: Record<ChoghadiyaTone, string> = {
  good: "choghadiya.quality_good",
  neutral: "choghadiya.quality_neutral",
  bad: "choghadiya.quality_bad",
};

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

type SlotLabel = { name: string; quality: string; tone: ChoghadiyaTone };
type BoardKind = { titles: { day: string; night: string }; label: (it: AnyRow) => SlotLabel; groups: MuhurtaBoard["groups"] };

function choghadiyaKind(text: Text): BoardKind {
  const { t, lang } = text;
  return {
    titles: { day: t("choghadiya.day"), night: t("choghadiya.night") },
    label: (it) => {
      const nameNe = String(it.name_ne ?? it.name ?? "—");
      const bad = it.bad as boolean | undefined;
      return { name: choghadiyaName(nameNe, lang), quality: choghadiyaQuality(nameNe, lang, bad), tone: choghadiyaTone(nameNe, bad) };
    },
    groups: (["good", "neutral", "bad"] as const).map((tone) => ({
      tone,
      title: t(TONE_TITLE[tone]),
      names: CHOGHADIYA_TYPE_KEYS.filter((k) => TONE_BY_KEY[k] === tone)
        .map((k) => t(`choghadiya.types.${k}.name`))
        .join(" · "),
    })),
  };
}

function horaKind(text: Text): BoardKind {
  const { t, lang } = text;
  const lordName = (key: string, row?: AnyRow) =>
    row ? pick(lang, row.planet_ne ?? row.name_ne, row.planet_en ?? row.name) : t(`hora_board.lords.${key}`);
  return {
    titles: { day: t("hora_board.day"), night: t("hora_board.night") },
    label: (it) => {
      const key = String(it.planet ?? "");
      const bad = it.bad === true || it.tone === "bad";
      const known = HORA_LORDS.some(([k]) => k === key);
      return {
        name: lordName(key, it),
        quality: known ? t(`hora_board.use.${key}`) : t(bad ? TONE_TITLE.bad : TONE_TITLE.good),
        tone: bad ? "bad" : "good",
      };
    },
    groups: (["good", "bad"] as const).map((tone) => ({
      tone,
      title: t(TONE_TITLE[tone]),
      names: HORA_LORDS.filter(([, tn]) => tn === tone)
        .map(([k]) => lordName(k))
        .join(" · "),
    })),
  };
}

/**
 * A day of muhurtas as a board: the day slots and the night slots, each with
 * its name, what it is good for and its time; on today, the slot the clock is
 * in, how long it has left and the next good one.
 */
function muhurtaBoard(rows: readonly AnyRow[], sunriseMin: number | null, nowMin: number | undefined, text: Text, kind: BoardKind): MuhurtaBoard {
  const { t, digits } = text;
  const base = sunriseMin ?? 360;
  const minOf = (it: AnyRow, edge: "start" | "end") => {
    const g = it[`${edge}_g`];
    return typeof g === "number" ? base + g * 24 : NaN;
  };
  const first = rows[0] ? minOf(rows[0], "start") : base;
  const last = rows.length ? minOf(rows[rows.length - 1]!, "end") : base + 1440;
  const span = last - first || 1440;
  // Before sunrise the clock is still in yesterday's night.
  const now = nowMin != null && nowMin >= first ? nowMin : undefined;
  const half = Math.ceil(rows.length / 2);

  const slots = rows.map((it, i) => {
    const start = minOf(it, "start");
    const end = minOf(it, "end");
    const timed = Number.isFinite(start) && Number.isFinite(end);
    const state: MuhurtaSlot["state"] = now == null || !timed ? undefined : now >= end ? "past" : now >= start ? "now" : "next";
    const slot: MuhurtaSlot = {
      key: String(i),
      ...kind.label(it),
      time: timed ? `${digits(clockOf(start))}–${digits(clockOf(end))}` : (segmentTime(it, sunriseMin, digits) ?? ""),
      share: timed ? (end - start) / span : 1 / rows.length,
      state,
      raw: it,
    };
    return { slot, start, end, night: it.phase === "night" || (it.phase == null && i >= half) };
  });

  const phase = (id: "day" | "night"): MuhurtaPhase => {
    const list = slots.filter((s) => s.night === (id === "night"));
    const range = list.length ? `${digits(clockOf(list[0]!.start))}–${digits(clockOf(list[list.length - 1]!.end))}` : "";
    return { id, title: kind.titles[id], range, slots: list.map((s) => s.slot) };
  };

  const at = slots.findIndex((s) => s.slot.state === "now");
  const cur = at >= 0 ? slots[at] : undefined;
  const good = cur ? slots.slice(at + 1).find((s) => s.slot.tone === "good") : undefined;
  const sunset = slots.find((s) => s.night)?.start;

  return {
    phases: [phase("day"), phase("night")],
    now:
      cur && now != null
        ? {
            label: t("choghadiya.now"),
            slot: cur.slot,
            progress: Math.min(1, Math.max(0, (now - cur.start) / (cur.end - cur.start || 1))),
            left: t("choghadiya.left", { time: duration(cur.end - now, t, digits) }),
            nextGood: good ? { label: t("choghadiya.next_good", { time: duration(good.start - now, t, digits) }), slot: good.slot } : undefined,
          }
        : undefined,
    groups: kind.groups,
    marks: {
      sunrise: digits(clockOf(first)),
      sunset: sunset != null ? digits(clockOf(sunset)) : "",
      nextSunrise: digits(clockOf(last)),
    },
    nowLabel: t("choghadiya.now"),
  };
}
