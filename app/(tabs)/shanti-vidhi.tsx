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
import { instantFromCivilIso } from "@/lib/instant-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@/lib/zoned-time";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ShantiVidhiScreen() {
  const { pick, t, digits } = useLocale();
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
    <AppShell title={pick("शान्ति विधि", "Shanti Vidhi")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="flame-outline" size={28} color={colors.secondary} />}
        title={t("shanti_vidhi.title")}
        subtitle={t("shanti_vidhi.subtitle")}
      />

      <View className="overflow-hidden rounded-2xl border border-border">
        <View className="flex-row items-center gap-1.5 border-b border-border px-4 py-3">
          <Ionicons name="person-outline" size={16} color={colors.secondary} />
          <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
            {t("shanti_vidhi.birth_section")}
          </Text>
          <Text
            className="ml-auto text-xs text-muted-foreground"
            style={nepaliTextStyle(12)}
            numberOfLines={1}
          >
            {t("shanti_vidhi.birth_meta")}
          </Text>
        </View>

        <View className="gap-4 p-4">
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
