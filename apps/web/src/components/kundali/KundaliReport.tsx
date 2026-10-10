import { useCallback, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ChevronDown,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import {
  streamKundaliReport,
  type LocationParams,
  type ReportConfidence,
  type ReportItem,
  type ReportMeta,
  type ReportSection,
} from "@/lib/api";
import type { InstantQuery } from "@/lib/instant-query";
import { useLocale, bilingualText } from "@/i18n/locale";
import { PanchangaSection } from "@/components/panchanga/PanchangaLayout";
import { cn } from "@/lib/utils";

type Status = "idle" | "streaming" | "done" | "error";

function useConfidenceLabels(): Record<
  ReportConfidence,
  { label: string; cls: string }
> {
  const { t } = useTranslation();
  return {
    strong: {
      label: t("kundali.report.confidence_strong"),
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    moderate: {
      label: t("kundali.report.confidence_moderate"),
      cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    },
    mixed: {
      label: t("kundali.report.confidence_mixed"),
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    tentative: {
      label: t("kundali.report.confidence_tentative"),
      cls: "bg-muted border-border",
    },
  };
}

function ConfidenceBadge({
  level,
  className,
}: {
  level: ReportConfidence;
  className?: string;
}) {
  const { t } = useTranslation();
  const styles = useConfidenceLabels();
  const s = styles[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold leading-none",
        s.cls,
        className
      )}
      title={t("kundali.report.confidence_title", { label: s.label })}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {s.label}
    </span>
  );
}

function FactorList({ factors }: { factors?: string[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!factors || factors.length === 0) return null;
  const count = factors.length;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm text-base hover:text-foreground transition-colors"
      >
        <Info className="h-3 w-3" />
        {t(count === 1 ? "kundali.report.factors_based" : "kundali.report.factors_based_plural", {
          count,
        })}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3">
          {factors.map((f, i) => (
            <li key={i} className="text-sm leading-snug">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Prefer Nepali label when the API sends "English (नेपाली)" pairs. */
function localizeItemLabel(label: string, isEnglish: boolean): string {
  if (isEnglish) return label;
  const paired = label.match(/^(.+?) \(([^)]+)\)$/);
  if (paired) return paired[2].trim();
  const house = label.match(/^House (\d+) \(([^)]+)\)$/i);
  if (house) return `${house[2]} भाव`;
  return label;
}

function ItemCard({ item }: { item: ReportItem }) {
  const { isEnglish } = useLocale();
  return (
    <div className="rounded-lg border border-border bg-background/40 dark:bg-background/20 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {localizeItemLabel(item.label, isEnglish)}
        </p>
        <ConfidenceBadge level={item.confidence} />
      </div>
      <p className="text-sm leading-relaxed">{item.text}</p>
      <FactorList factors={item.factors} />
    </div>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const { lang, isEnglish } = useLocale();
  const title = bilingualText(lang, section.title_ne, section.title_en);
  const isGrid =
    section.id === "planet_by_planet" ||
    section.id === "house_by_house" ||
    section.id === "divisional_charts";
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/60 p-4",
        section.optional && "border-dashed"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {isEnglish && (
          <span className="text-sm text-base uppercase tracking-wider">
            {section.title_en}
          </span>
        )}
        {section.confidence && (
          <ConfidenceBadge level={section.confidence} className="ml-auto" />
        )}
      </div>

      {section.body.length > 0 && (
        <div className="space-y-2">
          {section.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      )}

      {section.confidence && <FactorList factors={section.factors} />}

      {section.items && section.items.length > 0 && (
        <div
          className={cn(
            "mt-3 grid gap-2.5",
            isGrid ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
          )}
        >
          {section.items.map((it, i) => (
            <ItemCard key={i} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetaStrip({ meta }: { meta: ReportMeta }) {
  const { t } = useTranslation();
  const { lang, isEnglish } = useLocale();
  const cells: { label: string; value: string; sub?: string }[] = [
    {
      label: t("kundali.report.meta_lagna"),
      value: bilingualText(lang, meta.lagna.name_ne, meta.lagna.name_en),
    },
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
      value: meta.mahadasha
        ? `${bilingualText(lang, meta.mahadasha.lord_ne, meta.mahadasha.lord_en)}${
            meta.mahadasha.antardasha
              ? ` / ${bilingualText(lang, meta.mahadasha.antardasha_ne ?? meta.mahadasha.antardasha, meta.mahadasha.antardasha_en ?? meta.mahadasha.antardasha)}`
              : ""
          }`
        : "—",
      sub:
        meta.mahadasha && meta.mahadasha.antardasha_ends
          ? t("kundali.report.meta_antar_ends", { date: meta.mahadasha.antardasha_ends })
          : undefined,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-background/50 px-3 py-2"
        >
          <p className="mb-0.5 text-sm font-semibold uppercase tracking-wide">
            {c.label}
          </p>
          <p className="text-sm font-bold leading-tight text-foreground">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-sm">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function KundaliReport({
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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
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
        controller.signal
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
    [moment, location, ayanamsha, lang, t]
  );

  useEffect(() => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate(false);
  }, [moment, location, ayanamsha, lang, disabled, generate]);

  const streaming = status === "streaming";

  return (
    <PanchangaSection titleKey="kundali.report.title">
      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed">
            <Trans
              i18nKey="kundali.report.intro"
              components={{
                1: <span className="text-base text-foreground" />,
                2: <span className="text-base text-foreground" />,
              }}
            />
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {(status === "done" || status === "error") && (
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm text-base text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                {t("kundali.report.regenerate")}
              </button>
            )}
            {status === "idle" && !disabled && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("kundali.report.streaming_reading")}
              </span>
            )}
            {streaming && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress.total
                  ? t("kundali.report.streaming_progress", {
                      done: progress.done,
                      total: progress.total,
                    })
                  : t("kundali.report.streaming_reading")}
              </span>
            )}
          </div>
        </div>

        {(streaming || status === "done") && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-base">{t("kundali.report.confidence_label")}</span>
            {(["strong", "moderate", "mixed", "tentative"] as ReportConfidence[]).map(
              (lvl) => (
                <ConfidenceBadge key={lvl} level={lvl} />
              )
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {meta && <MetaStrip meta={meta} />}

        {sections.length > 0 && (
          <div className="space-y-3">
            {sections.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
          </div>
        )}

        {fromCache && status === "done" && (
          <p className="text-sm text-base">
            {t("kundali.report.loaded_from_cache")}
          </p>
        )}

        {status === "idle" && disabled && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm">
            <ScrollText className="h-5 w-5 shrink-0" />
            {t("kundali.report.idle_hint")}
          </div>
        )}

        {meta && (status === "done" || streaming) && (
          <p className="border-t border-border pt-3 text-sm leading-relaxed">
            {meta.disclaimer} · {meta.method}.
          </p>
        )}
      </div>
    </PanchangaSection>
  );
}

export default KundaliReport;
