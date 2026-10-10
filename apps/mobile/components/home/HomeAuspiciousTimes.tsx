import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { PanchangaDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { WINDOW_OPTIONS } from "@/lib/notifications/types";
import { getMuhurtaRows } from "@/lib/panchanga-format";
import { useThemeColors } from "@/lib/theme-context";

const GOOD = "#2e8b57";
const BAD = "#c0392b";

function TimesCard({
  title,
  rows,
  color,
  digits,
}: {
  title: string;
  rows: { label: string; value: string }[];
  color: string;
  digits: (n: number) => string;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const { pick } = useLocale();
  if (rows.length === 0) return null;

  return (
    <Card className="gap-1 p-0">
      <View className="border-b border-border px-4 py-3" style={{ borderTopWidth: 3, borderTopColor: color, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Text className="text-body font-bold" style={[nepaliTextStyle(16), { color }]}>
          {title}
        </Text>
      </View>
      {rows.map((row, i) => {
        const option = WINDOW_OPTIONS.find((o) => o.ne === row.label || o.en === row.label);
        return (
          <View key={`${row.label}-${row.value}`} className="flex-row items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
            <Text className="text-caption w-5 text-muted-foreground">{digits(i + 1)}</Text>
            <View className="min-w-0 flex-1">
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
                {row.label}
              </Text>
              <Text className="text-body font-num" style={[nepaliTextStyle(13), { color }]}>
                {row.value}
              </Text>
            </View>
            {option ? (
              <Pressable
                onPress={() => router.push({ pathname: "/reminders", params: { window: option.key } } as never)}
                accessibilityRole="button"
                accessibilityLabel={pick("रिमाइन्डर राख्नुहोस्", "Set a reminder")}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              >
                <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

/** Today's शुभ / अशुभ windows, each with a bell that opens "new reminder" on that window. */
export function HomeAuspiciousTimes({ p }: { p: PanchangaDay | undefined }) {
  const { pick, lang, digits } = useLocale();
  if (!p) return null;
  const rows = getMuhurtaRows(p, lang);
  const bad = rows.filter((r) => !r.auspicious);
  const good = rows.filter((r) => r.auspicious);
  if (rows.length === 0) return null;
  const num = (n: number) => String(digits(n));

  return (
    <View className="gap-4">
      <TimesCard title={pick("अशुभ समय", "Ashubh times")} rows={bad} color={BAD} digits={num} />
      <TimesCard title={pick("शुभ समय", "Shubh times")} rows={good} color={GOOD} digits={num} />
    </View>
  );
}
