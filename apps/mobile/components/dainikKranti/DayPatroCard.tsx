import { type ReactNode } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import type { CalendarDay } from "@/lib/api";
import { formatTimeShort } from "@vedic-patro/domain/panchanga-format";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { parseCivilIso } from "@vedic-patro/domain/patro-day";
import { resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { useThemeColors } from "@/lib/theme-context";
import { DayPatroExpandPanel } from "./DayPatroExpandPanel";

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

function dowOf(dateAd: string): number {
  const d = new Date(`${dateAd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
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
    <View className="min-w-0" style={{ width: wide ? "100%" : "48%" }}>
      <Text className="text-caption text-muted-foreground">{label}</Text>
      <View>{typeof value === "string" ? <Text className="text-body text-foreground">{value}</Text> : value}</View>
      {sub ? <Text className="text-caption text-muted-foreground">{sub}</Text> : null}
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
        "rounded-xl border bg-card p-3.5",
        isToday
          ? "border-secondary/60 bg-secondary/10"
          : hasFestival
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-border",
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row items-baseline gap-2">
          <Text className={cn("text-display font-num font-bold", dayColor)}>
            {digits(day.day)}
          </Text>
          <View>
            <Text
              className={cn(
                "text-body font-semibold",
                isSaturday && "text-rose-600 dark:text-rose-400",
              )}
            >
              {pick(day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday)}
            </Text>
            <Text className="text-caption text-muted-foreground">{digits(fmtAd(day.date_ad))}</Text>
          </View>
        </View>
        {isToday ? (
          <View className="rounded-full bg-secondary px-2 py-0.5">
            <Text className="text-caption font-semibold text-secondary-foreground">
              {t("dainik.today")}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-2.5">
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

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-2.5 rounded-lg bg-muted/40 p-2.5">
        <CardField
          wide
          label={t("dainik.sun_rise_set_sign")}
          value={
            <View className="min-w-0">
              <Text className="text-body font-num text-foreground">
                {`${day.sunrise ? digits(formatTimeShort(day.sunrise) ?? day.sunrise) : "—"}/${day.sunset ? digits(formatTimeShort(day.sunset) ?? day.sunset) : "—"}`}
              </Text>
              <Text className="text-caption text-muted-foreground">
                {sunRashi ? `${sunRashi}${det?.ayana_mark ? ` ${det.ayana_mark}` : ""}` : "—"}
              </Text>
            </View>
          }
        />
        <CardField label={t("dainik.moon_sign")} value={moonRashi || "—"} />
      </View>

      {(transits?.length ?? 0) > 0 ? (
        <View className="mt-3">
          <Text className="text-caption text-muted-foreground">
            {t("dainik.transits_rise_set")}
          </Text>
          <View className="mt-1 gap-0.5">
            {transits!.map((ev, i) => (
              <Text key={i} className="text-body">
                <Text className="text-foreground">{pick(ev.labelNe, ev.labelEn)} </Text>
                <Text className="text-secondary">{pick(ev.planetNe, ev.planetEn)}</Text>
                {ev.time ? <Text> {digits(ev.time)}</Text> : null}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {hasFestival ? (
        <View className="mt-3 rounded-lg bg-rose-500/5 px-2.5 py-2">
          <Text className="text-caption text-muted-foreground">{t("dainik.festival")}</Text>
          <Text className="text-body text-rose-600 dark:text-rose-300">
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
            className="mt-3 flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 py-2 active:bg-muted"
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.secondary}
            />
            <Text className="text-body font-semibold text-secondary">
              {isExpanded
                ? pick("विवरण लुकाउनुहोस्", "Hide details")
                : pick("लग्न · ग्रहस्पष्ट · थप विवरण", "Lagna · planets & more")}
            </Text>
          </Pressable>
          {isExpanded ? (
            <View className="mt-1 border-t border-border pt-2">
              <DayPatroExpandPanel lagna={lagna} graha={graha} notes={notes} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
