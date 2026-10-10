import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useQuery } from "@tanstack/react-query";
import type { LocationParams, SaitMonthAllResponse } from "@/lib/api";
import { apiKeys, fetchSaitMonthAll } from "@/lib/api";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS } from "@/lib/sait-data";
import { useThemeColors } from "@/lib/theme-context";

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
  accent: string,
) {
  if (!days.length) {
    return <Text className="text-body text-muted-foreground">—</Text>;
  }

  return (
    <View className="flex-row flex-wrap justify-end">
      {days.map((day, i) => {
        const hl = highlightDay === day;
        return (
          <Text
            key={`${day}-${i}`}
            className="text-body font-semibold text-foreground"
            style={hl ? { color: accent, fontWeight: "800" } : undefined}
          >
            {i > 0 ? ", " : ""}
            {digits(day)}
          </Text>
        );
      })}
    </View>
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
  const { pick, digits } = useLocale();
  const colors = useThemeColors();

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
    return <View className="h-48 rounded-md bg-muted" />;
  }

  if (error && !data) {
    return (
      <View className="gap-2 py-4">
        <Text className="text-body text-center text-muted-foreground">
          {pick("साइत डाटा लोड गर्न सकिएन।", "Could not load sait data.")}
        </Text>
        <Pressable onPress={retry} className="self-center rounded-md bg-secondary px-3 py-1.5">
          <Text className="text-body font-semibold text-secondary-foreground">
            {pick("पुनः प्रयास", "Retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-caption font-semibold text-muted-foreground">{monthName}</Text>
      <View className="gap-1">
        {SAIT_CATEGORIES.map((cat) => {
          const days = cats?.[cat.id] ?? [];
          const labels = SAIT_CATEGORY_LABELS[cat.id];
          return (
            <View
              key={cat.id}
              className="flex-row items-center gap-2 rounded-md px-2.5 py-2"
              style={{ backgroundColor: colors.surfaceInset }}
            >
              <Text className="text-body w-[42%] shrink-0 font-bold text-foreground">
                {pick(labels.ne, labels.en)}
              </Text>
              <View className="min-w-0 flex-1">
                {formatSaitDays(days, highlightDay, digits, colors.accent)}
              </View>
            </View>
          );
        })}
      </View>
      {!anyDates ? (
        <Text className="text-body py-4 text-center text-muted-foreground">
          {pick(
            "यस महिना कुनै साइत उपलब्ध छैन।",
            "No sait dates are available for this month.",
          )}
        </Text>
      ) : null}
    </View>
  );
}
