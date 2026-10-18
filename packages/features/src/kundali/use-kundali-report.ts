/**
 * The streamed astrological analysis, shared by the website's and the app's
 * `components/kundali/KundaliReport.tsx`: it streams /kundali/report (meta,
 * then one section at a time), restarts when the chart or language changes,
 * and returns every label the cards draw. Each app draws the cards.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  streamKundaliReport,
  type LocationParams,
  type ReportConfidence,
  type ReportItem,
  type ReportMeta,
  type ReportSection,
} from "@vedic-patro/api-client";
import type { InstantQuery } from "@vedic-patro/domain/calendar/instant-query";
import { localizeItemLabel } from "@vedic-patro/domain/jyotish/kundali/report-labels";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type KundaliReportStatus = "idle" | "streaming" | "done" | "error";

export const REPORT_CONFIDENCE_LEVELS: ReportConfidence[] = ["strong", "moderate", "mixed", "tentative"];

const CONFIDENCE_LABEL: Record<ReportConfidence, string> = {
  strong: "kundali.report.confidence_strong",
  moderate: "kundali.report.confidence_moderate",
  mixed: "kundali.report.confidence_mixed",
  tentative: "kundali.report.confidence_tentative",
};

/** Sections whose items read best as a wider grid. */
const GRID_SECTIONS = new Set(["planet_by_planet", "house_by_house", "divisional_charts"]);

export type ReportMetaCell = { label: string; value: string; sub?: string };

/** Labels for one confidence badge, a factor toggle and an item card. */
export function useReportLabels() {
  const { t, lang } = useLocale();
  const isEnglish = lang === "en";
  return {
    confidence: (level: ReportConfidence) => t(CONFIDENCE_LABEL[level]),
    confidenceTitle: (level: ReportConfidence) => t("kundali.report.confidence_title", { label: t(CONFIDENCE_LABEL[level]) }),
    factors: (count: number) => t(count === 1 ? "kundali.report.factors_based" : "kundali.report.factors_based_plural", { count }),
    itemLabel: (item: ReportItem) => localizeItemLabel(item.label, isEnglish),
    section: (section: ReportSection) => ({
      title: bilingualText(lang, section.title_ne, section.title_en),
      titleEn: isEnglish ? section.title_en : null,
      grid: GRID_SECTIONS.has(section.id),
    }),
  };
}

function metaCells(meta: ReportMeta, t: ReturnType<typeof useLocale>["t"], lang: string): ReportMetaCell[] {
  const isEnglish = lang === "en";
  const md = meta.mahadasha;
  return [
    { label: t("kundali.report.meta_lagna"), value: bilingualText(lang, meta.lagna.name_ne, meta.lagna.name_en) },
    {
      label: t("kundali.report.meta_nakshatra"),
      value: meta.nakshatra
        ? bilingualText(lang, meta.nakshatra.name_ne, meta.nakshatra.name_en)
        : bilingualText(lang, meta.moon_sign.name_ne, meta.moon_sign.name_en),
      sub: meta.nakshatra
        ? isEnglish
          ? `${meta.nakshatra.name_en} · ${t("kundali.report.meta_pada", { pada: meta.nakshatra.pada })}`
          : t("kundali.report.meta_pada", { pada: meta.nakshatra.pada })
        : t("kundali.report.meta_moon_sign"),
    },
    {
      label: t("kundali.report.meta_sun"),
      value: bilingualText(lang, meta.sun_sign.name_ne, meta.sun_sign.name_en),
      sub: isEnglish ? meta.sun_sign.name_en : undefined,
    },
    {
      label: t("kundali.report.meta_mahadasha"),
      value: md
        ? `${bilingualText(lang, md.lord_ne, md.lord_en)}${
            md.antardasha
              ? ` / ${bilingualText(lang, md.antardasha_ne ?? md.antardasha, md.antardasha_en ?? md.antardasha)}`
              : ""
          }`
        : "—",
      sub: md?.antardasha_ends ? t("kundali.report.meta_antar_ends", { date: md.antardasha_ends }) : undefined,
    },
  ];
}

export function useKundaliReport({
  moment,
  location,
  ayanamsha,
  disabled,
}: {
  moment: InstantQuery;
  location?: LocationParams;
  ayanamsha?: string;
  disabled?: boolean;
}) {
  const { t, lang } = useLocale();
  const [status, setStatus] = useState<KundaliReportStatus>("idle");
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* eslint-disable react-hooks/set-state-in-effect -- locale switch should drop stale report text */
  useEffect(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setMeta(null);
    setSections([]);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setFromCache(false);
  }, [lang]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const generate = useCallback(
    (force = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("streaming");
      setMeta(null);
      setSections([]);
      setProgress({ done: 0, total: 0 });
      setError(null);
      setFromCache(false);

      streamKundaliReport(
        moment,
        location,
        { ayanamsha, lang, force },
        (record) => {
          if (record.kind === "meta") {
            setMeta(record);
          } else if (record.kind === "section") {
            setSections((prev) => [...prev, record]);
            setProgress({ done: record.index + 1, total: record.total });
          } else if (record.kind === "done") {
            setStatus("done");
          }
        },
        controller.signal,
      )
        .then(({ fromCache: cached }) => {
          if (!controller.signal.aborted) setFromCache(cached);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setError(t("kundali.report.error_generic"));
          setStatus("error");
        });
    },
    [moment, location, ayanamsha, lang, t],
  );

  useEffect(() => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate(false);
  }, [moment, location, ayanamsha, lang, disabled, generate]);

  const streaming = status === "streaming";
  return {
    status,
    streaming,
    sections,
    error,
    regenerate: () => generate(true),
    showRegenerate: status === "done" || status === "error",
    /** The spinner pill: while waiting to start or streaming. */
    busyLabel:
      (status === "idle" && !disabled) || streaming
        ? streaming && progress.total
          ? t("kundali.report.streaming_progress", { done: progress.done, total: progress.total })
          : t("kundali.report.streaming_reading")
        : null,
    showConfidenceLegend: streaming || status === "done",
    metaCells: meta ? metaCells(meta, t, lang) : null,
    cacheNote: fromCache && status === "done" ? t("kundali.report.loaded_from_cache") : null,
    idleHint: status === "idle" && disabled ? t("kundali.report.idle_hint") : null,
    disclaimer: meta && (status === "done" || streaming) ? `${meta.disclaimer} · ${meta.method}.` : null,
    copy: {
      titleKey: "kundali.report.title",
      title: t("kundali.report.title"),
      introKey: "kundali.report.intro",
      regenerate: t("kundali.report.regenerate"),
      confidenceLabel: t("kundali.report.confidence_label"),
    },
  };
}
