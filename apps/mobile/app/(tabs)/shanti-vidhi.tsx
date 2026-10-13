import { useMemo, useState } from "react";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ShantiVidhiPanel } from "@/components/kundali/ShantiVidhiPanel";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { Text } from "@/components/ui/Text";
import { fetchKundaliDetail, kundaliDetailKeys } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { instantFromCivilIso } from "@vedic-patro/domain/instant-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { shantiClasses as sc } from "@vedic-patro/design-tokens/classes/shanti-classes";
import { cn } from "@vedic-patro/domain/utils";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ShantiVidhiScreen() {
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const timezone = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), timezone);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(timezone));

  const adDateStr = toAdStr(date);
  // Memoised — a new object each render would re-key every dependent query.
  const birthMoment = useMemo(
    () => instantFromCivilIso(adDateStr, clock),
    [adDateStr, clock],
  );

  const detailQ = useQuery({
    queryKey: kundaliDetailKeys.atTime(birthMoment, location.params),
    queryFn: () => fetchKundaliDetail(birthMoment, location.params),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <AppShell title={t("nav.shanti_vidhi")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="flame-outline" size={28} color={colors.secondary} />}
        title={t("shanti_vidhi.title")}
        subtitle={t("shanti_vidhi.subtitle")}
      />

      <View className={cn(sc.card, "overflow-hidden")}>
        <View className={sc.header}>
          <Ionicons name="person-outline" size={16} color={colors.secondary} />
          <Text className={sc.headerTitle} style={nepaliTextStyle(14)}>
            {t("shanti_vidhi.birth_section")}
          </Text>
          <Text
            className={sc.headerMeta}
            style={nepaliTextStyle(12)}
            numberOfLines={1}
          >
            {t("shanti_vidhi.birth_meta")}
          </Text>
        </View>

        <View className={sc.body}>
          <PanchangaDateNav
            date={date}
            onDateChange={setDate}
            todayAd={todayAd}
            clock={clock}
            onClockChange={setClock}
            location={location}
            onLocationChange={setLocation}
            adDateStr={adDateStr}
          />

          <ShantiVidhiPanel grahaShanti={detailQ.data?.grahaShanti} isError={detailQ.isError} />
        </View>
      </View>
    </AppShell>
  );
}
