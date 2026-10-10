import { useEffect, useMemo, useState } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { View } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { GocharIngressSection } from "@/components/gochar/GocharIngressSection";
import { GocharPlanetDeepDive } from "@/components/gochar/GocharPlanetDeepDive";
import { GocharSkySection } from "@/components/gochar/GocharSkySection";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { Text } from "@/components/ui/Text";
import { apiKeys, fetchGochar, fetchGocharIngress, gocharKeys } from "@/lib/api";
import { adToBS, bsToAD, BS_MONTH_NAMES, BS_MONTHS_NE, getBSMonthLength, shiftBsMonth } from "@vedic-patro/domain/bs-calendar";
import { formatGocharPatroDate } from "@/lib/gochar-page-utils";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import { formatBsDateKey } from "@vedic-patro/domain/patro-day";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function GocharScreen() {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));
  const [selectedPlanet, setSelectedPlanet] = useState<GrahaKey>("sun");

  const dateAd = useMemo(() => toAdStr(date), [date]);
  const bs = useMemo(() => adToBS(date), [date]);

  const gocharQ = useQuery({
    queryKey: gocharKeys.dayLegacy(dateAd, "ad", location.params),
    queryFn: () => fetchGochar(dateAd, "ad", location.params),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const monthQ = useQuery({
    queryKey: apiKeys.month(bs.year, bs.month, location.params, "bs"),
    queryFn: () => fetchMonthCalendarOffline(bs.year, bs.month, location.params, { era: "bs" }),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (monthQ.data?.limits) applyPatroApiLimits(monthQ.data.limits);
  }, [monthQ.data?.limits]);

  // Ingress list covers the browsed BS month. Range keys stay in BS so the API
  // owns conversion; local calendar tables are not used to mint the request.
  const ingressRange = useMemo(() => {
    const days = (monthQ.data?.calendar ?? []).filter((d) => !d.outsideMonth);
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) return null;
    return {
      from: formatBsDateKey(bs.year, bs.month, first.day),
      to: formatBsDateKey(bs.year, bs.month, last.day),
    };
  }, [monthQ.data?.calendar, bs.year, bs.month]);

  const ingressQ = useQuery({
    queryKey: gocharKeys.ingress(
      ingressRange?.from ?? "",
      ingressRange?.to ?? "",
      "patro",
      location.params,
    ),
    queryFn: () =>
      fetchGocharIngress(ingressRange!.from, ingressRange!.to, location.params, {
        level: "patro",
        era: "bs",
      }),
    enabled: Boolean(ingressRange),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const stepIngressMonth = (delta: number) => {
    const next = shiftBsMonth(bs.year, bs.month, delta);
    const day = Math.min(bs.day, getBSMonthLength(next.year, next.month));
    setDate(bsToAD(next.year, next.month, day));
  };

  const monthLabel = `${pick(BS_MONTHS_NE[bs.month - 1], BS_MONTH_NAMES[bs.month - 1])} ${digits(bs.year)}`;
  const dateLabel = formatGocharPatroDate(dateAd, lang);
  const gochar = gocharQ.data?.gochar;

  return (
    <AppShell title={pick("गोचर", "Gochar")} showHeader={false}>
      <PatroPageHeader
        icon={<AppNavIcon name="orbit" size={28} color={colors.secondary} />}
        title={t("gochar.page_title")}
        subtitle={t("gochar.page_subtitle")}
      />

      <PanchangaDateNav
        date={date}
        onDateChange={setDate}
        todayAd={todayAd}
        clock={clock}
        onClockChange={setClock}
        location={location}
        onLocationChange={setLocation}
      />

      {gochar ? (
        <View className="gap-6">
          <GocharSkySection
            gochar={gochar}
            dateLabel={dateLabel}
            onSelectPlanet={setSelectedPlanet}
          />

          <View className={width >= 1024 ? "flex-row items-start gap-6" : "gap-6"}>
            <View className={width >= 1024 ? "min-w-0 flex-1" : "w-full"}>
              <GocharIngressSection
                events={ingressQ.data?.events ?? []}
                refDateAd={dateAd}
                loading={ingressQ.isLoading && !ingressQ.data}
                browseMonthLabel={monthLabel}
                onPrevMonth={() => stepIngressMonth(-1)}
                onNextMonth={() => stepIngressMonth(1)}
              />
            </View>
            <View className={width >= 1024 ? "min-w-0 flex-1" : "w-full"}>
              <GocharPlanetDeepDive
                gochar={gochar}
                selected={selectedPlanet}
                onSelect={setSelectedPlanet}
              />
            </View>
          </View>
        </View>
      ) : gocharQ.isError ? (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-body">
          {pick("गोचर ल्याउन सकिएन।", "Could not load transits.")}
        </Text>
      ) : (
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      )}

      <Text className="text-body mt-4 text-muted-foreground" style={nepaliTextStyle(13)}>
        {pick(
          "स्थितिहरू स्थानीय सूर्योदय (उदय) मा गणना गरिएका छन् — लाहिरी निरयन।",
          "Positions are computed at local sunrise (udaya) — Lahiri sidereal.",
        )}
      </Text>
    </AppShell>
  );
}
