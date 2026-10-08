import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import type { PanchangaDay } from "@/lib/api";
import { timeShort } from "@/lib/api";
import { Card } from "./ui/Card";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-border/60 py-2.5">
      <Text className="flex-1 text-sm text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}

export function PanchangaDetailCard({ data }: { data: PanchangaDay }) {
  const { pick, lang } = useLocale();
  const t = (ne?: string, en?: string) => (lang === "ne" ? ne || en : en || ne) || "—";

  return (
    <Card className="gap-0 p-0">
      <View className="border-b border-border/60 px-4 py-3">
        <Text className="text-lg font-bold text-foreground">
          {data.display?.bs_ne && lang === "ne"
            ? data.display.bs_ne
            : data.date_bs ?? data.date_ad ?? "—"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {data.display?.gregorian_en ?? data.date_ad}
          {data.weekday ? ` · ${data.weekday}` : ""}
        </Text>
        {data.samvatsara ? (
          <Text className="mt-1 text-sm text-primary">
            {t(data.samvatsara.name_ne, data.samvatsara.name_en)}
          </Text>
        ) : null}
      </View>
      <View className="px-4 pb-2">
        <Row label={pick("तिथि", "Tithi")} value={t(data.tithi?.name_ne, data.tithi?.name)} />
        <Row label={pick("नक्षत्र", "Nakshatra")} value={t(data.nakshatra?.name_ne, data.nakshatra?.name)} />
        <Row label={pick("योग", "Yoga")} value={t(data.yoga?.name_ne, data.yoga?.name)} />
        <Row label={pick("करण", "Karana")} value={t(data.karana?.name_ne, data.karana?.name)} />
        <Row
          label={pick("पक्ष", "Paksha")}
          value={t(data.paksha?.label_ne, data.paksha?.label_en)}
        />
        <Row label={pick("सूर्योदय", "Sunrise")} value={timeShort(data.sunrise)} />
        <Row label={pick("सूर्यास्त", "Sunset")} value={timeShort(data.sunset)} />
        <Row label={pick("चन्द्रोदय", "Moonrise")} value={timeShort(data.moonrise)} />
        <Row label={pick("चन्द्रास्त", "Moonset")} value={timeShort(data.moonset)} />
      </View>
      {data.muhurta ? (
        <View className="border-t border-border/60 px-4 py-2">
          <Text className="mb-1 text-sm font-semibold text-foreground">
            {pick("मुहूर्त", "Muhurta")}
          </Text>
          {data.muhurta.rahu_kalam ? (
            <Row
              label={pick("राहु काल", "Rahu Kaal")}
              value={`${data.muhurta.rahu_kalam.start_time?.slice(0, 5) ?? "—"} – ${data.muhurta.rahu_kalam.end_time?.slice(0, 5) ?? "—"}`}
            />
          ) : null}
          {data.muhurta.abhijit ? (
            <Row
              label={pick("अभिजित", "Abhijit")}
              value={`${data.muhurta.abhijit.start_time?.slice(0, 5) ?? "—"} – ${data.muhurta.abhijit.end_time?.slice(0, 5) ?? "—"}`}
            />
          ) : null}
        </View>
      ) : null}
      {data.festivals?.length ? (
        <View className="border-t border-border/60 px-4 py-3">
          <Text className="mb-2 text-sm font-semibold text-foreground">
            {pick("पर्व / बिदा", "Festivals / Holidays")}
          </Text>
          {data.festivals.map((f, i) => (
            <Text key={`${f.name}-${i}`} className="py-0.5 text-sm text-foreground">
              • {t(f.name_ne, f.name)}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
