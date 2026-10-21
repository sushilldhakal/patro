/**
 * Panchanga element page — the parts that need no React: one card per span
 * (tithi, nakshatra, …: begins → ends), and the rows of a per-day table
 * (choghadiya, hora, lagna, chandrabala/tarabala tables, …). Both apps draw these.
 */
import type { ElementSpan } from "@vedic-patro/api-client";
import {
  CHOGHADIYA_TYPE_KEYS,
  TONE_BY_KEY,
  choghadiyaLegendLabel,
  choghadiyaLegendMarker,
  choghadiyaRowLabel,
  choghadiyaTone,
} from "@vedic-patro/domain/panchanga/choghadiya-display";
import { formatElementStampDisplay } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { clockFromGhati, parseHHMM } from "@vedic-patro/domain/panchanga/time-format";
import type { TFunction } from "@vedic-patro/i18n/react";

type AnyRow = Record<string, unknown>;
type Text = { t: TFunction; lang: string; digits: (v: string | number) => string };

/** Auspicious / inauspicious, as the API writes a row's quality (Nepali). */
const SHUBHA = "\u0936\u0941\u092d"; // copy-ok: API value
const ASHUBHA = "\u0905\u0936\u0941\u092d"; // copy-ok: API value

const pick = (lang: string, ne: unknown, en: unknown) => String((lang === "en" ? en : ne) ?? "");

export type SpanBoundaryView = { label: string; time: string; when: string };
export type SpanCard = { key: string; span: ElementSpan; name: string; paksha?: string; begins: SpanBoundaryView; ends: SpanBoundaryView };

export function spanCards(spans: readonly ElementSpan[], text: Text): SpanCard[] {
  const { t, lang, digits } = text;
  const boundary = (label: string, stamp: ElementSpan["begins"]): SpanBoundaryView => ({
    label,
    time: digits(stamp.time_label),
    when: formatElementStampDisplay(stamp, lang),
  });
  return spans.map((s, i) => ({
    key: `${s.name}-${i}`,
    span: s,
    name: pick(lang, s.name_ne || s.name, s.name || s.name_ne),
    paksha: s.paksha ? t(s.paksha === "shukla" ? "common.paksha_shukla" : "common.paksha_krishna") : undefined,
    begins: boundary(t("common.begins"), s.begins),
    ends: boundary(t("common.ends"), s.ends),
  }));
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
  | {
      kind: "choghadiya";
      /** `text` leads with an emoji marker (web); `label` and `tone` let the app draw its own dot. */
      legend: { key: string; text: string; label: string; tone: "good" | "bad" | "neutral" }[];
      rows: ToneRowView[];
    }
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
export function elementTable(data: unknown, sunrise: string | undefined, elementId: string, text: Text): ElementTableView {
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
    if (elementId === "choghadiya") {
      return {
        kind: "choghadiya",
        legend: CHOGHADIYA_TYPE_KEYS.map((key) => ({
          key,
          text: `${choghadiyaLegendMarker(TONE_BY_KEY[key])} ${choghadiyaLegendLabel(key, lang)}`,
          label: choghadiyaLegendLabel(key, lang),
          tone: TONE_BY_KEY[key],
        })),
        rows: rows.map((it, i) => {
          const nameNe = String(it.name_ne ?? it.name ?? "—");
          const tone = choghadiyaTone(nameNe, it.bad as boolean | undefined);
          return {
            key: String(i),
            label: choghadiyaRowLabel(nameNe, lang, it.bad as boolean | undefined),
            trailing: segmentTime(it, sunriseMin, digits),
            good: tone === "good",
            bad: tone === "bad",
            raw: it,
          };
        }),
      };
    }
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
