import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useCalendarSystem, useLocale } from "@/lib/i18n";
import { formatBsDate } from "@vedic-patro/domain/calendar/bs-date-format";
import type { PanchangaDay } from "@/lib/api";
import { timeShort } from "@/lib/api";
import { Card } from "./ui/Card";
import { tFor } from "@vedic-patro/i18n/runtime";
import {
  formatPakshaLabel,
  getMoonrise,
  getMoonset,
  getSunrise,
  getSunset,
} from "@vedic-patro/read-models/panchanga/panchanga-format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-border/60 py-2.5">
      <Text className="text-body flex-1 text-muted-foreground">{label}</Text>
      <Text className="text-body flex-1 text-right font-medium text-foreground">{value}</Text>
    </View>
  );
}

export function PanchangaDetailCard({ data }: { data: PanchangaDay }) {
  const { pick, lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  const t = (ne?: string, en?: string) => (lang === "ne" ? ne || en : en || ne) || "—";

  // The BS date in the UI language (Nepali months in Devanagari or English letters), and the
  // AD date; which one leads is the calendar preference, not the language.
  const bsParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.date_bs ?? "");
  const bsText =
    data.display?.bs_ne && lang === "ne"
      ? data.display.bs_ne
      : bsParts
        ? formatBsDate({ year: Number(bsParts[1]), month: Number(bsParts[2]), day: Number(bsParts[3]) }, lang, digits)
        : digits(data.date_bs ?? data.date_ad ?? "—");
  const adText = digits(data.display?.gregorian_en ?? data.date_ad);
  const [primaryDate, secondaryDate] = calendar === "ad" ? [adText, bsText] : [bsText, adText];

  return (
    <Card className="gap-0 p-0">
      <View className="border-b border-border/60 px-4 py-3">
        <Text className="text-title font-bold text-foreground">
          {primaryDate}
        </Text>
        <Text className="text-body text-muted-foreground">
          {secondaryDate}
          {data.weekday ? ` · ${data.weekday}` : ""}
        </Text>
        {data.samvatsara ? (
          <Text className="text-body mt-1 text-primary">
            {t(data.samvatsara.name_ne, data.samvatsara.name_en)}
          </Text>
        ) : null}
      </View>
      <View className="px-4 pb-2">
        <Row label={pick(tFor("ne", "tithi"), tFor("en", "tithi"))} value={t(data.tithi?.name_ne, data.tithi?.name)} />
        <Row label={pick(tFor("ne", "nakshatra"), tFor("en", "nakshatra"))} value={t(data.nakshatra?.name_ne, data.nakshatra?.name)} />
        <Row label={pick(tFor("ne", "kundali.yoga"), tFor("en", "kundali.yoga"))} value={t(data.yoga?.name_ne, data.yoga?.name)} />
        <Row label={pick(tFor("ne", "kundali.karana"), tFor("en", "kundali.karana"))} value={t(data.karana?.name_ne, data.karana?.name)} />
        <Row
          label={pick(tFor("ne", "sections.paksha"), tFor("en", "sections.paksha"))}
          value={
            formatPakshaLabel(
              data,
              lang,
              data.paksha_ne,
              typeof (data.paksha as unknown) === "string" ? (data.paksha as unknown as string) : undefined,
            ) ?? "—"
          }
        />
        <Row label={pick(tFor("ne", "kundali.sunrise"), tFor("en", "kundali.sunrise"))} value={digits(timeShort(getSunrise(data)))} />
        <Row label={pick(tFor("ne", "kundali.sunset"), tFor("en", "kundali.sunset"))} value={digits(timeShort(getSunset(data)))} />
        <Row label={pick(tFor("ne", "sections.moonrise"), tFor("en", "sections.moonrise"))} value={digits(timeShort(getMoonrise(data)))} />
        <Row label={pick(tFor("ne", "sections.moonset"), tFor("en", "sections.moonset"))} value={digits(timeShort(getMoonset(data)))} />
      </View>
      {data.muhurta ? (
        <View className="border-t border-border/60 px-4 py-2">
          <Text className="text-body mb-1 font-semibold text-foreground">
            {pick(tFor("ne", "ui.panchanga_detail_card.muhurta"), tFor("en", "ui.panchanga_detail_card.muhurta"))}
          </Text>
          {data.muhurta.rahu_kalam ? (
            <Row
              label={pick(tFor("ne", "ui.panchanga_detail_card.rahu_kaal"), tFor("en", "ui.panchanga_detail_card.rahu_kaal"))}
              value={digits(`${data.muhurta.rahu_kalam.start_time?.slice(0, 5) ?? "—"} – ${data.muhurta.rahu_kalam.end_time?.slice(0, 5) ?? "—"}`)}
            />
          ) : null}
          {data.muhurta.abhijit ? (
            <Row
              label={pick(tFor("ne", "ui.panchanga.abhijit"), tFor("en", "ui.panchanga.abhijit"))}
              value={digits(`${data.muhurta.abhijit.start_time?.slice(0, 5) ?? "—"} – ${data.muhurta.abhijit.end_time?.slice(0, 5) ?? "—"}`)}
            />
          ) : null}
        </View>
      ) : null}
      {data.festivals?.length ? (
        <View className="border-t border-border/60 px-4 py-3">
          <Text className="text-body mb-2 font-semibold text-foreground">
            {pick(tFor("ne", "ui.panchanga_detail_card.festivals_holidays"), tFor("en", "ui.panchanga_detail_card.festivals_holidays"))}
          </Text>
          {data.festivals.map((f, i) => (
            <Text key={`${f.name}-${i}`} className="text-body py-0.5 text-foreground">
              • {t(f.name_ne, f.name)}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
