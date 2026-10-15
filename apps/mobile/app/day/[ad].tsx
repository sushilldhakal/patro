import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { PanchangaDetailCard } from "@/components/PanchangaDetailCard";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { apiKeys, fetchPanchanga } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileShellClasses as msc } from "../../../../packages/design-tokens/src/classes/shell/mobile-shell-classes";

export default function DayDetailScreen() {
  const { ad } = useLocalSearchParams<{ ad: string }>();
  const { t } = useLocale();

  const query = useQuery({
    queryKey: apiKeys.panchanga(ad ?? "", "ad"),
    queryFn: () => fetchPanchanga(ad!, "ad"),
    enabled: !!ad,
  });

  return (
    <SafeAreaView className={msc.dayScreen}>
      <View className={msc.dayHeader} style={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING }}>
        <Text className={msc.dayTitle}>{t("ui.day.day_detail")}</Text>
        <Text className={msc.daySubtitle}>{ad}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: PAGE_HORIZONTAL_PADDING }}>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState />
        ) : query.data ? (
          <PanchangaDetailCard data={query.data} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
