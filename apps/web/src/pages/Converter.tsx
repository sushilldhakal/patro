import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import {
  fetchAdToBs, fetchBsToAd,
  convertorKeys,
  type ConvertAdToBs, type ConvertBsToAd,
} from "../lib/api";
import { PageShell, PageHeader } from "../components/PageShell";
import { SeoContentSection } from "../components/seo/SeoContentSection";
import { useRouteLoading } from "@/lib/route-loading";
import { formatLocaleDigits } from "@/i18n/digits";
import { useLocale, bilingualText } from "@/i18n/locale";
import { StatCard } from "../components/StatCard";
import { cn } from "@vedic-patro/domain/utils";
import { converterClasses } from "@vedic-patro/design-tokens/classes/converter-classes";

const WEEKDAY_NE: Record<string, string> = {
  Sunday: "आइतबार",
  Monday: "सोमबार",
  Tuesday: "मङ्गलबार",
  Wednesday: "बुधबार",
  Thursday: "बिहिबार",
  Friday: "शुक्रबार",
  Saturday: "शनिबार",
};

function todayAd() {
  return new Date().toISOString().split("T")[0];
}

export function Converter() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [mode, setMode] = useState<"ad-to-bs" | "bs-to-ad">("ad-to-bs");
  const [adInput, setAdInput] = useState(todayAd());
  const [bsInput, setBsInput] = useState("2083-02-01");
  const [adDate, setAdDate] = useState(todayAd());
  const [bsDate, setBsDate] = useState("2083-02-01");

  const adToBsQ = useQuery({
    queryKey: convertorKeys.adToBs(adDate),
    queryFn: () => fetchAdToBs(adDate),
    enabled: mode === "ad-to-bs" && !!adDate,
    staleTime: Infinity,
  });

  const bsToAdQ = useQuery({
    queryKey: convertorKeys.bsToAd(bsDate),
    queryFn: () => fetchBsToAd(bsDate),
    enabled: mode === "bs-to-ad" && !!bsDate,
    staleTime: Infinity,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "ad-to-bs") setAdDate(adInput);
    else setBsDate(bsInput);
  }

  const adResult = adToBsQ.data as ConvertAdToBs | undefined;
  const bsResult = bsToAdQ.data as ConvertBsToAd | undefined;
  const loading = mode === "ad-to-bs" ? adToBsQ.isLoading : bsToAdQ.isLoading;
  const error = mode === "ad-to-bs" ? adToBsQ.isError : bsToAdQ.isError;

  useRouteLoading(loading);

  return (
    <PageShell>
      <PageHeader
        icon={<ArrowLeftRight className="w-6 h-6 text-secondary" />}
        title={t("converter.title")}
        subtitle={t("converter.subtitle")}
      />

      {/* Mode toggle */}
      <div className={cn("flex w-fit", converterClasses.modeToggle)}>
        {(["ad-to-bs", "bs-to-ad"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex transition-colors",
              converterClasses.modeButton,
              converterClasses.modeLabel,
              mode === m
                ? cn(converterClasses.modeButtonActive, converterClasses.modeLabelActive)
                : cn(converterClasses.modeLabelIdle, "hover:bg-muted")
            )}
          >
            {m === "ad-to-bs" ? (
              <>AD <ArrowRight className="w-3.5 h-3.5" /> BS</>
            ) : (
              <>BS <ArrowRight className="w-3.5 h-3.5" /> AD</>
            )}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className={cn("flex flex-wrap", converterClasses.form)}>
        {mode === "ad-to-bs" ? (
          <div className={cn("flex flex-col", converterClasses.field)}>
            <label className={converterClasses.label}>
              {t("converter.ad_date")}
            </label>
            <input
              type="date"
              value={adInput}
              onChange={e => setAdInput(e.target.value)}
              className={cn(converterClasses.input, "focus:outline-none focus:ring-2 focus:ring-primary/40")}
            />
          </div>
        ) : (
          <div className={cn("flex flex-col", converterClasses.field)}>
            <label className={converterClasses.label}>
              {t("converter.bs_date")}
            </label>
            <input
              type="text"
              value={bsInput}
              onChange={e => setBsInput(e.target.value)}
              placeholder="2083-02-24"
              className={cn(converterClasses.input, "focus:outline-none focus:ring-2 focus:ring-primary/40")}
            />
          </div>
        )}
        <button
          type="submit"
          className={cn(converterClasses.submit, converterClasses.submitLabel, "hover:bg-secondary/90 transition-colors")}
        >
          {t("converter.convert")}
        </button>
      </form>

      {error && (
        <div className={cn(converterClasses.errorBox, converterClasses.errorText)}>
          {t("converter.error")}
        </div>
      )}

      {/* AD → BS result */}
      {mode === "ad-to-bs" && adResult && (
        <div className="space-y-4">
          <div className={cn("flex", converterClasses.resultRow, converterClasses.resultText)}>
            <span className={converterClasses.resultValue}>{adResult.ad_date}</span>
            <ArrowRight className="w-5 h-5" />
            <span className={converterClasses.resultValue}>{adResult.bs_date}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard label={t("converter.bs_date")} value={adResult.bs_date} highlight />
            <StatCard label={t("converter.bs_year")} value={formatLocaleDigits(adResult.bs_year)} />
            <StatCard label={t("converter.bs_month")} value={bilingualText(lang, adResult.bs_month_name_ne, adResult.bs_month_name)} />
            <StatCard label={t("converter.bs_day")} value={formatLocaleDigits(adResult.bs_day)} />
            <StatCard label={t("converter.ad_date")} value={adResult.ad_date} />
            <StatCard label={t("converter.weekday")} value={bilingualText(lang, WEEKDAY_NE[adResult.weekday] ?? adResult.weekday, adResult.weekday)} />
          </div>
        </div>
      )}

      {/* BS → AD result */}
      {mode === "bs-to-ad" && bsResult && (
        <div className="space-y-4">
          <div className={cn("flex", converterClasses.resultRow, converterClasses.resultText)}>
            <span className={converterClasses.resultValue}>{bsResult.bs_date}</span>
            <ArrowRight className="w-5 h-5" />
            <span className={converterClasses.resultValue}>{bsResult.ad_date}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard label={t("converter.ad_date")} value={bsResult.ad_date} highlight />
            <StatCard label={t("converter.bs_date")} value={bsResult.bs_date} />
            <StatCard label={t("converter.bs_month")} value={bilingualText(lang, bsResult.bs_month_name_ne, bsResult.bs_month_name)} />
            <StatCard label={t("converter.bs_day")} value={formatLocaleDigits(bsResult.bs_day)} />
            <StatCard label={t("converter.bs_year")} value={formatLocaleDigits(bsResult.bs_year)} />
            <StatCard label={t("converter.weekday")} value={bilingualText(lang, WEEKDAY_NE[bsResult.weekday] ?? bsResult.weekday, bsResult.weekday)} />
          </div>
        </div>
      )}

      <SeoContentSection route="converter" />
    </PageShell>
  );
}
