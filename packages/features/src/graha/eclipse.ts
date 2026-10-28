/** Solar and lunar eclipse pages — one card per eclipse of the year. */
import { useLocale } from "@vedic-patro/i18n/react";
import { fetchEclipseYear, grahaDetailKeys, type EclipseEvent } from "@vedic-patro/api-client";
import { renderedEclipseDate } from "@vedic-patro/read-models/astronomy/eclipse-date";
import { formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { localTimeShortFromIso } from "@vedic-patro/domain/panchanga/time-format";
import { statusOf, useYearData, type PageStatus, type YearScope } from "../_shared";
import { eclipseOverview, yearRange } from "./overview";

export type EclipseKind = "solar" | "lunar";

/** Older payloads carry only `visible_ne` / `maximum_time_local_short`; read either. */
export function eclipseVisible(ev: EclipseEvent): boolean {
  if (typeof ev.visible === "boolean") return ev.visible;
  // "देखिन" (visible) in the API's own Nepali text.
  return /\u0926\u0947\u0916\u093f\u0928|visible/i.test(ev.visible_ne ?? "");
}

export function eclipseMaxTime(ev: EclipseEvent): string | null {
  return localTimeShortFromIso(ev.max_local) ?? ev.maximum_time_local_short ?? null;
}

export type EclipseCardView = {
  key: string;
  type: string;
  visible: boolean;
  visibility: string;
  rows: { label: string; value: string; strong?: boolean }[];
  /** Before or after now; the first one still to come is `next`. */
  state: "past" | "next" | "later";
  /** `३५ दिन पछि` / `आज`, for eclipses still to come. */
  countdown?: string;
};

type T = (key: string, values?: Record<string, unknown>) => string;

export function eclipseCardView(ev: EclipseEvent, kind: EclipseKind, lang: Lang, t: T, index: number, nowMs: number = Date.now()): EclipseCardView {
  const digits = (v: string) => formatLocaleDigits(v, lang);
  const visible = eclipseVisible(ev);
  const begin = localTimeShortFromIso(ev.begin_local);
  const end = localTimeShortFromIso(ev.end_local);
  const max = eclipseMaxTime(ev);
  const lunar = kind === "lunar";
  const maxUtc = (ev as { max_utc?: string | null }).max_utc;
  const at = maxUtc ? Date.parse(maxUtc) : ev.max_local ? Date.parse(ev.max_local) : NaN;
  const rows: EclipseCardView["rows"] = [
    { label: t("graha_pages.eclipse.date"), value: digits(renderedEclipseDate(ev)), strong: true },
    { label: t("graha_pages.eclipse.maximum"), value: max ? digits(max) : "—" },
  ];
  if (visible && begin) rows.push({ label: t(lunar ? "graha_pages.eclipse.partial_begins" : "graha_pages.eclipse.first_contact"), value: digits(begin) });
  if (visible && end) rows.push({ label: t(lunar ? "graha_pages.eclipse.partial_ends" : "graha_pages.eclipse.last_contact"), value: digits(end) });
  return {
    key: `${ev.date_ad ?? ev.date_jd_date ?? index}-${index}`,
    type: (lang === "en" ? (ev.type_en ?? ev.type) : (ev.type_ne ?? ev.type)) ?? "",
    visible,
    visibility: t(visible ? "graha_pages.eclipse.visible_nepal" : "graha_pages.eclipse.not_visible_nepal"),
    rows,
    state: Number.isFinite(at) && at < nowMs - 6 * 3_600_000 ? "past" : "later",
    countdown: Number.isFinite(at) && at >= nowMs - 6 * 3_600_000 ? countdown(at - nowMs, lang, t) : undefined,
  };
}

function countdown(ms: number, lang: Lang, t: T): string {
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return t("graha_pages.overview.today");
  return t("graha_pages.overview.in_days", { count: formatLocaleDigits(String(days), lang) });
}

export function useEclipsePage(kind: EclipseKind, scope: YearScope) {
  const { t, lang } = useLocale();
  const query = useYearData(scope, {
    queryKey: (year, location, era) => grahaDetailKeys.eclipse(kind, year, location, era),
    queryFn: (year, location, era) => fetchEclipseYear(kind, year, location, era),
  });
  const base = kind === "solar" ? "graha_pages.eclipse_solar" : "graha_pages.eclipse_lunar";
  return {
    copy: {
      titleKey: `${base}.title`,
      blurbKey: `${base}.blurb`,
      title: t(`${base}.title`),
      blurb: t(`${base}.blurb`),
      none: t("graha_pages.eclipse.no_eclipses_year"),
    },
    descriptionPageId: kind === "solar" ? ("surya-grahan" as const) : ("chandra-grahan" as const),
    status: statusOf(query) as PageStatus,
    gregorianRange: query.data?.gregorian_range,
    cards: markNext((query.data?.events ?? []).map((ev, i) => eclipseCardView(ev, kind, lang, t, i))),
    overview: (() => {
      const range = yearRange(query.data as Parameters<typeof yearRange>[0]);
      return range
        ? eclipseOverview(kind === "solar" ? "sun" : "moon", (query.data?.events ?? []) as Parameters<typeof eclipseOverview>[1], range, lang, t, scope.era)
        : undefined;
    })(),
    nextLabel: t("graha_pages.overview.eclipse_upcoming"),
  };
}

/** The first eclipse still to come is the one to watch for. */
function markNext(cards: EclipseCardView[]): EclipseCardView[] {
  const i = cards.findIndex((c) => c.state === "later");
  return i < 0 ? cards : cards.map((c, j) => (j === i ? { ...c, state: "next" } : c));
}
