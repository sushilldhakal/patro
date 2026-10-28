/**
 * Panchanga element page — the parts that need no React: one card per span
 * (tithi, nakshatra, …: begins → ends), and the rows of a per-day table
 * (choghadiya, hora, lagna, chandrabala/tarabala tables, …). Both apps draw these.
 */
import type { ElementSpan } from "@vedic-patro/api-client";
import { choghadiyaBoard, horaBoard, lagnaBoard, panchakaBoard, pushkaraBoard, type MuhurtaBoard } from "./muhurta-board";

export * from "./muhurta-board";
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

/** The per-day tables drawn as a muhurta board. */
const BOARDS: Record<string, typeof choghadiyaBoard> = {
  choghadiya: choghadiyaBoard,
  hora: horaBoard,
  lagna: lagnaBoard,
  "panchaka-rahita": panchakaBoard,
  pushkara: pushkaraBoard,
};

/** One element's per-day payload as rows. */
/** `nowMin` is the clock (minutes after midnight) when the browsed day is today: the boards mark the slot it falls in. */
export function elementTable(
  data: unknown,
  sunrise: string | undefined,
  elementId: string,
  text: Text,
  nowMin?: number,
  sunset?: string,
): ElementTableView {
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
    const board = BOARDS[elementId];
    if (board) return { kind: "board", board: board({ rows, sunrise, sunset, nowMin }, text) };
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

