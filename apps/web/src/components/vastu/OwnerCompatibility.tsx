import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import type { Profile } from "@/lib/auth/client";
import { profileChartParams } from "@/lib/kundali/profile-chart";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import {
  DEFAULT_PANCHANGA_LOCATION,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { fetchJanmaRashi, fetchPanchangaDay, type NavataraTone } from "@/lib/api";
import { patroDayFetchFromApiDateAd } from "@/lib/patro-day-url";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { bilingualText, useLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

function todayIso(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

const TONE_LABEL_KEY: Record<NavataraTone, string> = {
  best: "vastu.plot.tone.best",
  good: "vastu.plot.tone.good",
  neutral: "vastu.plot.tone.neutral",
  bad: "vastu.plot.tone.bad",
  worst: "vastu.plot.tone.worst",
};

export function OwnerCompatibility() {
  const { t } = useTranslation();
  const { lang } = useLocale();

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const chartParams = selectedProfile ? profileChartParams(selectedProfile) : null;

  // Independent from the app's shared site-wide location —
  // usePanchangaLocation() persists to a single global localStorage key with
  // no scoping, so using it here would silently overwrite the location the
  // rest of the app (panchanga, etc.) shows.
  const [plotLocation, setPlotLocation] = useState<PanchangaLocation>(DEFAULT_PANCHANGA_LOCATION);
  const [candidateDate, setCandidateDate] = useState(() => todayIso());

  const janmaQ = useQuery({
    queryKey: ["vastu-owner-nakshatra", chartParams?.moment, chartParams?.location.params],
    queryFn: () => fetchJanmaRashi(chartParams!.moment, resolveLocationTimezone(chartParams!.location)),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  const dayQ = useQuery({
    queryKey: ["vastu-construction-day", candidateDate, plotLocation.params, lang],
    queryFn: () =>
      fetchPanchangaDay(patroDayFetchFromApiDateAd(candidateDate, { era: "ad", language: lang }), plotLocation.params),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  // janma_nakshatra is 1..27; NavataraRow.index is 0-based — convert once, here.
  const ownerIndex = janmaQ.data ? janmaQ.data.janma_nakshatra - 1 : null;
  const row =
    ownerIndex !== null ? (dayQ.data?.tarabala_table?.rows.find((r) => r.index === ownerIndex) ?? null) : null;

  const isLoading = chartParams != null && (janmaQ.isLoading || dayQ.isLoading);
  const isError = chartParams != null && (janmaQ.isError || dayQ.isError);

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarClock className="h-4 w-4 shrink-0 text-secondary" />
        <h3 className="text-sm font-semibold text-foreground">{t("vastu.plot.owner_heading")}</h3>
      </div>

      <div className="mt-3 space-y-4">
        <p className="text-sm">{t("vastu.plot.owner_blurb")}</p>

        <SaitProfilePicker selectedId={selectedProfile?.id ?? null} onSelect={setSelectedProfile} />

        {chartParams && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vastu-construction-date"
                  className="mb-1 block text-xs font-semibold text-muted-foreground"
                >
                  {t("vastu.plot.construction_date_label")}
                </label>
                <input
                  id="vastu-construction-date"
                  type="date"
                  value={candidateDate}
                  onChange={(e) => setCandidateDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {t("vastu.plot.construction_place_label")}
                </p>
                <LocationSelector compact location={plotLocation} onLocationChange={setPlotLocation} />
              </div>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">{t("vastu.plot.owner_loading")}</p>}
            {isError && <p className="text-sm text-destructive">{t("vastu.plot.owner_error")}</p>}

            {row && (
              <div className={cn("rounded-xl border border-border p-3.5", patroNavataraToneBg(row.tone))}>
                <p className="text-sm font-semibold text-foreground">
                  {t("vastu.plot.owner_nakshatra_label")}: {bilingualText(lang, row.name, row.name_en ?? row.name)}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {t("vastu.plot.construction_result", {
                    tone: t(TONE_LABEL_KEY[row.tone]),
                  })}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t("vastu.plot.construction_disclaimer")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OwnerCompatibility;
