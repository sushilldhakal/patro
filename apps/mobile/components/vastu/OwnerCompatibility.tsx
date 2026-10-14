/**
 * Does the owner's own नक्षत्र suit the day they mean to start building?
 *
 * Native counterpart of the web app's
 * `src/components/vastu/OwnerCompatibility.tsx`: pick a saved profile, pick a
 * candidate date and place, and read that day's ताराबल row for the owner's
 * birth nakshatra. The web version's `<input type="date">` becomes three
 * `NativeStringSelect`s, which is how the rest of this app asks for an option
 * on device; everything else — the two queries, the 0-based index conversion,
 * the tone colouring — is the same.
 */

import { useMemo, useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@/components/icons/Ionicons";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import type { Profile } from "@/lib/auth/client";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import {
  DEFAULT_PANCHANGA_LOCATION,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { fetchJanmaRashi, fetchPanchanga, type NavataraTone } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import { lazyList } from "@vedic-patro/i18n/runtime";

const TONE_LABEL_KEY: Record<NavataraTone, string> = {
  best: "vastu.plot.tone.best",
  good: "vastu.plot.tone.good",
  neutral: "vastu.plot.tone.neutral",
  bad: "vastu.plot.tone.bad",
  worst: "vastu.plot.tone.worst",
};

const AD_MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AD_MONTHS_NE = lazyList("ne", "ui.panchanga_og_preview.x_483e5df7");

/** Days in an AD month, leap years included. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function OwnerCompatibility() {
  const { t, lang, pick, digits } = useLocale();
  const colors = useThemeColors();

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const chartParams = selectedProfile ? profileChartParams(selectedProfile) : null;

  // Independent from the app's shared site-wide location — usePanchangaLocation()
  // persists to a single global key with no scoping, so using it here would
  // silently overwrite the location the rest of the app (panchanga, etc.) shows.
  const [plotLocation, setPlotLocation] = useState<PanchangaLocation>(DEFAULT_PANCHANGA_LOCATION);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  // A month change can strand the day (31st → February); clamp on read so the
  // date sent to the API is always one that exists.
  const safeDay = Math.min(day, daysInMonth(year, month));
  const candidateDate = `${year}-${pad(month)}-${pad(safeDay)}`;

  const janmaQ = useQuery({
    queryKey: ["vastu-owner-nakshatra", chartParams?.moment, chartParams?.location.params],
    queryFn: () => fetchJanmaRashi(chartParams!.moment, resolveLocationTimezone(chartParams!.location)),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  const dayQ = useQuery({
    queryKey: ["vastu-construction-day", candidateDate, plotLocation.params, lang],
    queryFn: () => fetchPanchanga(candidateDate, "ad", plotLocation.params),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  // janma_nakshatra is 1..27; NavataraRow.index is 0-based — convert once, here.
  const ownerIndex = janmaQ.data ? janmaQ.data.janma_nakshatra - 1 : null;
  const row =
    ownerIndex !== null ? (dayQ.data?.tarabala_table?.rows.find((r) => r.index === ownerIndex) ?? null) : null;

  const isLoading = chartParams != null && (janmaQ.isLoading || dayQ.isLoading);
  const isError = chartParams != null && (janmaQ.isError || dayQ.isError);

  const yearOptions = Array.from({ length: 12 }, (_, i) => {
    const y = today.getFullYear() - 1 + i;
    return { value: String(y), label: digits(y) };
  });
  const monthOptions = AD_MONTHS_EN.map((en, i) => ({
    value: String(i + 1),
    label: pick(AD_MONTHS_NE[i]!, en),
  }));
  const dayOptions = Array.from({ length: daysInMonth(year, month) }, (_, i) => ({
    value: String(i + 1),
    label: digits(i + 1),
  }));

  return (
    <View className={vastuClasses.ownerCard}>
      <View className={vastuClasses.ownerHeader}>
        <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
        <Text className={vastuClasses.ownerHeading} style={nepaliTextStyle(14)}>
          {t("vastu.plot.owner_heading")}
        </Text>
      </View>

      <View className={vastuClasses.ownerBody}>
        <Text className={cn(vastuClasses.planBlurb, "text-foreground")} style={nepaliTextStyle(13)}>
          {t("vastu.plot.owner_blurb")}
        </Text>

        <SaitProfilePicker selectedId={selectedProfile?.id ?? null} onSelect={setSelectedProfile} />

        {chartParams && (
          <>
            <View className="gap-3">
              <View>
                <Text
                  className={vastuClasses.fieldLabel}
                  style={nepaliTextStyle(12)}
                >
                  {t("vastu.plot.construction_date_label")}
                </Text>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <NativeStringSelect
                      value={String(year)}
                      options={yearOptions}
                      ariaLabel={t("vastu.plot.construction_date_label")}
                      onChange={(v) => setYear(Number(v))}
                    />
                  </View>
                  <View className="flex-[1.4]">
                    <NativeStringSelect
                      value={String(month)}
                      options={monthOptions}
                      ariaLabel={t("vastu.plot.construction_date_label")}
                      onChange={(v) => setMonth(Number(v))}
                    />
                  </View>
                  <View className="flex-1">
                    <NativeStringSelect
                      value={String(safeDay)}
                      options={dayOptions}
                      ariaLabel={t("vastu.plot.construction_date_label")}
                      onChange={(v) => setDay(Number(v))}
                    />
                  </View>
                </View>
              </View>
              <View>
                <Text
                  className={vastuClasses.fieldLabel}
                  style={nepaliTextStyle(12)}
                >
                  {t("vastu.plot.construction_place_label")}
                </Text>
                <LocationSelector location={plotLocation} onLocationChange={setPlotLocation} />
              </View>
            </View>

            {isLoading && (
              <Text className={vastuClasses.mutedNote} style={nepaliTextStyle(13)}>
                {t("vastu.plot.owner_loading")}
              </Text>
            )}
            {isError && (
              <Text className={vastuClasses.destructiveText} style={nepaliTextStyle(13)}>
                {t("vastu.plot.owner_error")}
              </Text>
            )}

            {row && (
              <View className={cn(vastuClasses.ownerResult, patroNavataraToneBg(row.tone))}>
                <Text className={vastuClasses.ownerResultTitle} style={nepaliTextStyle(13)}>
                  {t("vastu.plot.owner_nakshatra_label")}: {pick(row.name, row.name_en ?? row.name)}
                </Text>
                <Text className={cn(vastuClasses.ownerResultVerdict, "text-foreground")} style={nepaliTextStyle(13)}>
                  {t("vastu.plot.construction_result", { tone: t(TONE_LABEL_KEY[row.tone]) })}
                </Text>
                <Text className={vastuClasses.infoDisclaimer} style={nepaliTextStyle(13)}>
                  {t("vastu.plot.construction_disclaimer")}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default OwnerCompatibility;
