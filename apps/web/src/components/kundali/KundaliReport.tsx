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
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import { useLocale, bilingualText } from "@/i18n/locale";
import { PanchangaSection } from "@/components/panchanga/PanchangaLayout";
import { cn } from "@vedic-patro/domain/utils";
import { localizeItemLabel } from "@vedic-patro/domain/kundali/report-labels";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Status = "idle" | "streaming" | "done" | "error";

const r = kundaliDetailClasses.report;

function useConfidenceLabels(): Record<
  ReportConfidence,
  { label: string; cls: string }
> {
  const { t } = useTranslation();
  return {
    strong: {
      label: t("kundali.report.confidence_strong"),
      cls: cn(r.strongBox, r.strongText),
    },
    moderate: {
      label: t("kundali.report.confidence_moderate"),
      cls: cn(r.moderateBox, r.moderateText),
    },
    mixed: {
      label: t("kundali.report.confidence_mixed"),
      cls: cn(r.mixedBox, r.mixedText),
    },
    tentative: {
      label: t("kundali.report.confidence_tentative"),
      cls: r.tentativeBox,
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
        r.badge,
        r.badgeText,
        "inline-flex",
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
    <div className={r.factorWrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(r.factorToggle, r.factorToggleText, "inline-flex hover:text-foreground transition-colors")}
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
        <ul className={cn(r.factorList, "space-y-1")}>
          {factors.map((f, i) => (
            <li key={i} className={r.factorItem}>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: ReportItem }) {
  const { isEnglish } = useLocale();
  return (
    <div className={r.itemCard}>
      <div className={cn(r.itemHead, "flex")}>
        <p className={r.itemLabel}>
          {localizeItemLabel(item.label, isEnglish)}
        </p>
        <ConfidenceBadge level={item.confidence} />
      </div>
      <p className={r.itemText}>{item.text}</p>
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
        r.sectionCard,
        section.optional && "border-dashed"
      )}
    >
      <div className={cn(r.sectionHead, "flex")}>
        <h3 className={r.sectionTitle}>{title}</h3>
        {isEnglish && (
          <span className={r.sectionTitleEn}>
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
            <p key={i} className={r.sectionParagraph}>
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
          className={r.metaCell}
        >
          <p className={r.metaLabel}>
            {c.label}
          </p>
          <p className={r.metaValue}>{c.value}</p>
          {c.sub && <p className={r.metaSub}>{c.sub}</p>}
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
          <p className={cn(r.intro, "max-w-2xl")}>
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
                className={cn(r.statusPill, r.statusText, "inline-flex text-foreground transition-colors hover:bg-muted disabled:opacity-50")}
              >
                <RefreshCw className="h-4 w-4" />
                {t("kundali.report.regenerate")}
              </button>
            )}
            {status === "idle" && !disabled && (
              <span className={cn(r.statusPill, r.statusText, "inline-flex")}>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("kundali.report.streaming_reading")}
              </span>
            )}
            {streaming && (
              <span className={cn(r.statusPill, r.statusText, "inline-flex")}>
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
          <div className={cn(r.confidenceRow, "flex text-sm")}>
            <span className={r.confidenceLabel}>{t("kundali.report.confidence_label")}</span>
            {(["strong", "moderate", "mixed", "tentative"] as ReportConfidence[]).map(
              (lvl) => (
                <ConfidenceBadge key={lvl} level={lvl} />
              )
            )}
          </div>
        )}

        {error && (
          <div className={cn(r.errorBox, r.errorText, "flex")}>
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
          <p className={r.cacheNote}>
            {t("kundali.report.loaded_from_cache")}
          </p>
        )}

        {status === "idle" && disabled && (
          <div className={cn(r.idleBox, r.idleText, "flex")}>
            <ScrollText className="h-5 w-5 shrink-0" />
            {t("kundali.report.idle_hint")}
          </div>
        )}

        {meta && (status === "done" || streaming) && (
          <p className={r.disclaimer}>
            {meta.disclaimer} · {meta.method}.
          </p>
        )}
      </div>
    </PanchangaSection>
  );
}

export default KundaliReport;
