import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@/components/icons/Ionicons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { LocationParams, SaitMonthAllResponse } from "@/lib/api";
import { apiKeys, fetchSaitMonthAll } from "@/lib/api";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS } from "@vedic-patro/domain/sait-data";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";

type Props = {
  year: number;
  month: number;
  highlightDay?: number;
  location?: LocationParams;
  data?: SaitMonthAllResponse;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

function formatSaitDays(
  days: number[],
  highlightDay: number | undefined,
  digits: (v: string | number) => string,
) {
  if (!days.length) {
    return <Text className={homeClasses.saitDaysNone}>—</Text>;
  }

  return (
    <Text className={homeClasses.saitDays}>
      {days.map((day, i) => (
        <Text
          key={`${day}-${i}`}
          className={highlightDay === day ? homeClasses.saitHighlight : undefined}
        >
          {i > 0 ? ", " : ""}
          {digits(day)}
        </Text>
      ))}
    </Text>
  );
}

export function SaitAsidePanel({
  year,
  month,
  highlightDay,
  location,
  data: dataProp,
  loading: loadingProp,
  error: errorProp,
  onRetry,
}: Props) {
  const { t, pick, digits } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();

  const internalQ = useQuery({
    queryKey: apiKeys.saitMonthAll(year, month, location),
    queryFn: () => fetchSaitMonthAll(year, month, location),
    staleTime: 1000 * 60 * 60,
    retry: 2,
    enabled: dataProp == null,
  });

  const data = dataProp ?? internalQ.data;
  const loading = loadingProp ?? (dataProp == null && internalQ.isPending);
  const error = errorProp ?? (dataProp == null && internalQ.isError);
  const retry = onRetry ?? (() => internalQ.refetch());

  const cats = data?.categories;
  const monthName = pick(
    data?.month_name_ne ?? BS_MONTHS_NE[month - 1],
    BS_MONTH_NAMES[month - 1],
  );
  const anyDates = cats ? Object.values(cats).some((d) => d.length > 0) : false;

  if (loading && !data) {
    return <View className={homeClasses.saitSkeleton} />;
  }

  if (error && !data) {
    return (
      <View className="gap-2 py-4">
        <Text className="text-body text-center text-muted-foreground">
          {t("ui.home.could_not_load_sait_data")}
        </Text>
        <Pressable onPress={retry} className="self-center rounded-md bg-secondary px-3 py-1.5">
          <Text className="text-body font-semibold text-secondary-foreground">
            {t("ui.common.retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={homeClasses.saitStack}>
      <Text className={homeClasses.saitMonth}>{monthName}</Text>
      <View className={homeClasses.saitList}>
        {SAIT_CATEGORIES.map((cat) => {
          const days = cats?.[cat.id] ?? [];
          const labels = SAIT_CATEGORY_LABELS[cat.id];
          return (
            <Pressable
              key={cat.id}
              onPress={() => router.push({ pathname: "/sait/[category]", params: { category: cat.id } } as never)}
              accessibilityRole="link"
              className={cn(homeClasses.saitRow, "active:opacity-80")}
            >
              <Text className={homeClasses.saitName} style={nepaliTextStyle()}>
                {pick(labels.ne, labels.en)}
              </Text>
              <View className="min-w-0 flex-1">{formatSaitDays(days, highlightDay, digits)}</View>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </Pressable>
          );
        })}
      </View>
      {!anyDates ? (
        <Text className={homeClasses.saitEmpty} style={nepaliTextStyle()}>
          {t("ui.home.no_sait_dates_are_available_for")}
        </Text>
      ) : null}
    </View>
  );
}
