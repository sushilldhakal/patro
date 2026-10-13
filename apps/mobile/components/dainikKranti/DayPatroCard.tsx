import { type ReactNode } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import type { CalendarDay } from "@/lib/api";
import { formatTimeShort } from "@vedic-patro/domain/panchanga-format";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { parseCivilIso } from "@vedic-patro/domain/patro-day";
import { resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { useThemeColors } from "@/lib/theme-context";
import { DayPatroExpandPanel } from "./DayPatroExpandPanel";
import { dowOf } from "@vedic-patro/domain/dainikKranti/day-helpers";

export type TransitEvent = {
  planetNe: string;
  planetEn: string;
  labelNe: string;
  labelEn: string;
  time?: string;
  sortKey: string;
};

type Props = {
  day: CalendarDay;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  transits: TransitEvent[] | undefined;
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
};

function fmtAd(dateAd: string): string {
  try {
    return String(parseCivilIso(dateAd).day);
  } catch {
    const d = new Date(`${dateAd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateAd;
    return String(d.getDate());
  }
}

function phaseOf(day: CalendarDay): "krishna" | "shukla" | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

function pakshaShort(day: CalendarDay, isEn = false): string {
  const p = phaseOf(day);
  if (isEn) return p === "shukla" ? "Shukla" : p === "krishna" ? "Krishna" : "";
  return p === "shukla" ? "शुक्ल" : p === "krishna" ? "कृष्ण" : "";
}

function angaEnd(
  end?: string,
  d: (v: string | number) => string = String,
  isEn = false,
): string | null {
  const t = formatTimeShort(end);
  if (!t) return null;
  return isEn ? d(t) : `${d(t)} बजे`;
}

function CardField({
  label,
  value,
  sub,
  wide,
}: {
  label: string;
  value: ReactNode;
  sub?: string | null;
  /** Spans both columns (web `col-span-2`). */
  wide?: boolean;
}) {
  return (
    <View className={dainikKrantiClasses.field} style={{ width: wide ? "100%" : "48%" }}>
      <Text className={dainikKrantiClasses.fieldLabel} style={nepaliTextStyle()}>{label}</Text>
      <View>{typeof value === "string" ? <Text className={dainikKrantiClasses.fieldValue} style={nepaliTextStyle()}>{value}</Text> : value}</View>
      {sub ? <Text className={dainikKrantiClasses.fieldSub} style={nepaliTextStyle()}>{sub}</Text> : null}
    </View>
  );
}

export function DayPatroCard({
  day,
  isToday,
  isExpanded,
  onToggle,
  transits,
  lagna,
  graha,
  notes,
}: Props) {
  const colors = useThemeColors();
  const { pick, digits, lang, t } = useLocale();
  const isEn = lang === "en";
  const det = day.panchanga;
  const tithiEnd = angaEnd(det?.tithi?.end ?? det?.tithi?.end_local_time, digits, isEn);
  const nakEnd = angaEnd(det?.nakshatra?.end ?? det?.nakshatra?.end_local_time, digits, isEn);
  const yogaEnd = angaEnd(det?.yoga?.end ?? det?.yoga?.end_local_time, digits, isEn);
  const karanaEnd = angaEnd(det?.karana?.end ?? det?.karana?.end_local_time, digits, isEn);
  const sunRashi =
    resolveRashiDisplay(det?.surya_rashi_ne, det?.surya_rashi, lang) ??
    pick(det?.surya_rashi_ne ?? "", det?.surya_rashi ?? "");
  const moonRashi =
    resolveRashiDisplay(det?.chandra_rashi_ne ?? day.chandra_rashi_ne, det?.chandra_rashi ?? day.chandra_rashi, lang) ??
    pick(det?.chandra_rashi_ne ?? "", det?.chandra_rashi ?? "");
  const isSaturday = dowOf(day.date_ad) === 6;
  const hasFestival = (day.festivals?.length ?? 0) > 0;
  const hasExtra = Boolean(lagna || graha || (notes?.length ?? 0) > 0);
  const dayColor =
    isSaturday || hasFestival ? "text-rose-600 dark:text-rose-400" : "text-foreground";

  return (
    <View
      className={cn(
        dainikKrantiClasses.dayCard,
        isToday
          ? dainikKrantiClasses.dayCardToday
          : hasFestival
            ? dainikKrantiClasses.dayCardFestival
            : dainikKrantiClasses.dayCardPlain,
      )}
    >
      <View className={dainikKrantiClasses.cardHead}>
        <View>
          <View className="flex-row items-baseline gap-1">
            <Text className={cn(dainikKrantiClasses.dayNumBs, dayColor)} style={nepaliTextStyle()}>
              {digits(day.day)}
            </Text>
            <Text className={cn(dainikKrantiClasses.dayNumAdSmall, "leading-none")} style={nepaliTextStyle()}>
              {digits(fmtAd(day.date_ad))}
            </Text>
          </View>
          <Text
            className={cn(dainikKrantiClasses.weekday, "leading-tight", isSaturday && dainikKrantiClasses.saturday)}
            style={nepaliTextStyle()}
          >
            {pick(day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday)}
          </Text>
        </View>
        {isToday ? (
          <View className={dainikKrantiClasses.todayBadge}>
            <Text className={dainikKrantiClasses.todayBadgeText} style={nepaliTextStyle()}>
              {t("dainik.today")}
            </Text>
          </View>
        ) : null}
      </View>

      <View className={cn(dainikKrantiClasses.fieldGrid, "flex-row flex-wrap")}>
        <CardField
          label={t("dainik.tithi")}
          value={`${pakshaShort(day, isEn)} ${pick(day.tithi_ne ?? day.tithi, day.tithi ?? day.tithi_ne) ?? "—"}`}
          sub={tithiEnd ? pick(`${tithiEnd} सम्म`, `until ${tithiEnd}`) : null}
        />
        <CardField
          label={t("dainik.nakshatra")}
          value={pick(day.nakshatra_ne ?? day.nakshatra ?? "—", day.nakshatra ?? day.nakshatra_ne ?? "—")}
          sub={nakEnd ? pick(`${nakEnd} सम्म`, `until ${nakEnd}`) : null}
        />
        <CardField
          label={t("dainik.yoga")}
          value={pick(day.yoga_ne ?? day.yoga ?? "—", day.yoga ?? day.yoga_ne ?? "—")}
          sub={yogaEnd ? pick(`${yogaEnd} सम्म`, `until ${yogaEnd}`) : null}
        />
        <CardField
          label={t("dainik.karana")}
          value={pick(day.karana_ne ?? day.karana ?? "—", day.karana ?? day.karana_ne ?? "—")}
          sub={karanaEnd ? pick(`${karanaEnd} सम्म`, `until ${karanaEnd}`) : null}
        />
      </View>

      <View className={cn(dainikKrantiClasses.fieldGridMuted, "flex-row flex-wrap")}>
        <CardField
          wide
          label={t("dainik.sun_rise_set_sign")}
          value={
            <View className={dainikKrantiClasses.field}>
              <Text className={cn(dainikKrantiClasses.sunRiseSetTimes, "font-num leading-snug")} style={nepaliTextStyle()}>
                {`${day.sunrise ? digits(formatTimeShort(day.sunrise) ?? day.sunrise) : "—"}/${day.sunset ? digits(formatTimeShort(day.sunset) ?? day.sunset) : "—"}`}
              </Text>
              <Text className={dainikKrantiClasses.subLine} style={nepaliTextStyle()}>
                {sunRashi ? `${sunRashi}${det?.ayana_mark ? ` ${det.ayana_mark}` : ""}` : "—"}
              </Text>
            </View>
          }
        />
        <CardField label={t("dainik.moon_sign")} value={moonRashi || "—"} />
      </View>

      {(transits?.length ?? 0) > 0 ? (
        <View className={dainikKrantiClasses.transitsBlock}>
          <Text className={dainikKrantiClasses.fieldLabel} style={nepaliTextStyle()}>
            {t("dainik.transits_rise_set")}
          </Text>
          <View className={cn(dainikKrantiClasses.transitsList, "gap-0.5")}>
            {transits!.map((ev, i) => (
              <Text key={i} className={dainikKrantiClasses.transitRow} style={nepaliTextStyle()}>
                <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.transitName)}>{pick(ev.labelNe, ev.labelEn)} </Text>
                <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.transitPlanet)}>{pick(ev.planetNe, ev.planetEn)}</Text>
                {ev.time ? <Text className={dainikKrantiClasses.cellText}> {digits(ev.time)}</Text> : null}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {hasFestival ? (
        <View className={dainikKrantiClasses.festivalBox}>
          <Text className={dainikKrantiClasses.fieldLabel} style={nepaliTextStyle()}>{t("dainik.festival")}</Text>
          <Text numberOfLines={2} className={dainikKrantiClasses.festivalText} style={nepaliTextStyle()}>
            {day.festivals.join(" · ")}
          </Text>
        </View>
      ) : null}

      {hasExtra ? (
        <>
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            className={cn(dainikKrantiClasses.expandBtn, "flex-row active:bg-muted")}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.secondary}
            />
            <Text className={dainikKrantiClasses.expandBtnText} style={nepaliTextStyle()}>
              {isExpanded
                ? pick("विवरण लुकाउनुहोस्", "Hide details")
                : pick("लग्न · ग्रहस्पष्ट · थप विवरण", "Lagna · planets & more")}
            </Text>
          </Pressable>
          {isExpanded ? (
            <View className={dainikKrantiClasses.expandBody}>
              <DayPatroExpandPanel lagna={lagna} graha={graha} notes={notes} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
