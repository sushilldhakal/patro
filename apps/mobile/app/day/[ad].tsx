import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { useDayEvents } from "@vedic-patro/features/events";
import { DayEvents } from "@vedic-patro/ui/kit/events";
import { useAuth } from "@/lib/auth/AuthContext";
import { PanchangaDetailCard } from "@/components/PanchangaDetailCard";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { apiKeys, fetchPanchanga } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { PAGE_HORIZONTAL_PADDING, useNavBottomPadding } from "@/lib/mobile-nav";
import { StandaloneChrome } from "@/components/StandaloneChrome";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

export default function DayDetailScreen() {
  const { ad } = useLocalSearchParams<{ ad: string }>();
  const { t, digits } = useLocale();
  const navBottom = useNavBottomPadding(true);
  const { isAuthenticated } = useAuth();
  const dayEvents = useDayEvents(ad, isAuthenticated);

  const query = useQuery({
    queryKey: apiKeys.panchanga(ad ?? "", "ad"),
    queryFn: () => fetchPanchanga(ad!, "ad"),
    enabled: !!ad,
  });

  return (
    <StandaloneChrome>
    <View className={msc.dayScreen}>
      <View className={msc.dayHeader} style={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING }}>
        <Text className={msc.dayTitle}>{t("ui.day.day_detail")}</Text>
        <Text className={msc.daySubtitle}>{digits(ad)}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: PAGE_HORIZONTAL_PADDING, paddingBottom: navBottom }}>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState />
        ) : query.data ? (
          <>
            <DayEvents events={dayEvents.events} />
            <PanchangaDetailCard data={query.data} />
          </>
        ) : null}
      </ScrollView>
    </View>
    </StandaloneChrome>
  );
}
