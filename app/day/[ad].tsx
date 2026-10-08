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

export default function DayDetailScreen() {
  const { ad } = useLocalSearchParams<{ ad: string }>();
  const { pick } = useLocale();

  const query = useQuery({
    queryKey: apiKeys.panchanga(ad ?? "", "ad"),
    queryFn: () => fetchPanchanga(ad!, "ad"),
    enabled: !!ad,
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="border-b border-border py-3" style={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING }}>
        <Text className="text-xl font-bold text-foreground">{pick("दिन विवरण", "Day detail")}</Text>
        <Text className="text-sm text-muted-foreground">{ad}</Text>
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
