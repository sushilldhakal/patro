/** Solar and lunar eclipse pages — one card per eclipse of the year. */
import { useLocale } from "@vedic-patro/i18n/react";
import { fetchEclipseYear, grahaDetailKeys, type EclipseEvent } from "@vedic-patro/api-client";
import { renderedEclipseDate } from "@vedic-patro/domain/eclipse-date";
import { formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { localTimeShortFromIso } from "@vedic-patro/domain/time-format";
import { statusOf, useYearData, type PageStatus, type YearScope } from "../_shared";

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
};

type T = (key: string, values?: Record<string, unknown>) => string;

export function eclipseCardView(ev: EclipseEvent, kind: EclipseKind, lang: Lang, t: T, index: number): EclipseCardView {
  const digits = (v: string) => formatLocaleDigits(v, lang);
  const visible = eclipseVisible(ev);
  const begin = localTimeShortFromIso(ev.begin_local);
  const end = localTimeShortFromIso(ev.end_local);
  const max = eclipseMaxTime(ev);
  const lunar = kind === "lunar";
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
  };
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
    cards: (query.data?.events ?? []).map((ev, i) => eclipseCardView(ev, kind, lang, t, i)),
  };
}
