import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useDayEvents } from "@vedic-patro/features/events";
import { DayEvents } from "@vedic-patro/ui/kit/events";
import { PatroDayTimeHeader } from "@vedic-patro/ui/kit/shell";
import { FactIcon, MoonPhaseIcon, moonPhaseIconName } from "@vedic-patro/ui/kit/weather";
import { space, withAlpha } from "@vedic-patro/design-tokens";
import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { monthShortLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { tithiIndexFromPanchanga } from "@vedic-patro/read-models/panchanga/tithi-wheel-data";
import { BackHeader } from "@/components/home/BackHeader";
import { SLIDER_TINT } from "@/components/home/TintCard";
import { UpcomingFestivalsSlider } from "@/components/home/UpcomingFestivalsSlider";
import { HeaderDateTitle, usePatroYearLine } from "@/components/patro-date/HeaderDateTitle";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiKeys, fetchPanchanga, type PanchangaDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useNavBottomPadding } from "@/lib/mobile-nav";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

const DAY_MS = 86_400_000;
/** Today in Kathmandu (+05:45). */
const todayNp = () => new Date(Date.now() + 345 * 60_000).toISOString().slice(0, 10);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const adDate = (iso: string) => new Date(`${iso}T12:00:00`);

type Anga = { name?: string; name_ne?: string; end?: string; next?: string; next_ne?: string };
type Span = { start_time?: string; end_time?: string };
type DayPayload = {
  bs_date?: { year: number; month: number; day: number; month_name?: string; month_name_ne?: string };
  weekday?: string;
  weekday_en?: string;
  tithi?: Anga;
  nakshatra?: Anga;
  yoga?: Anga;
  karana?: Anga;
  paksha?: string;
  paksha_ne?: string;
  chandra_rashi?: string;
  chandra_rashi_ne?: string;
  surya_rashi?: string;
  surya_rashi_ne?: string;
  ritu?: string;
  ritu_ne?: string;
  aayan?: string;
  aayan_ne?: string;
  festivals?: { id: string; name?: string; name_ne?: string }[];
  sun?: { sunrise?: string; sunset?: string };
  muhurta?: { abhijit?: Span; rahu_kalam?: Span };
};

/**
 * One day, opened from a festival card: back and home's date title (badge + year line, which opens
 * the day picker); the day's card (date on the left; festivals and tithi on the right; moon, sunrise
 * and sunset under it); the panchanga as a grid of its elements with when each ends; the day's good
 * and bad times; the festivals ahead; the reader's notes. Everything for the reader's place.
 */
export default function DayDetailScreen() {
  const params = useLocalSearchParams<{ ad: string }>();
  const ad = params.ad ?? todayNp();
  const router = useRouter();
  const colors = useThemeColors();
  const { t, digits, lang } = useLocale();
  const navBottom = useNavBottomPadding(false);
  const { isAuthenticated } = useAuth();
  const { location } = usePanchangaLocation();
  const dayEvents = useDayEvents(ad, isAuthenticated);
  const [pickerOpen, setPickerOpen] = useState(false);
  const query = useQuery({
    queryKey: apiKeys.panchanga(ad, "ad", location.params),
    queryFn: () => fetchPanchanga(ad, "ad", location.params),
    enabled: !!ad,
  });
  const p = query.data as (PanchangaDay & DayPayload) | undefined;
  const ne = nepaliTextStyle();
  const pick = (en?: string, np?: string) => (lang === "en" ? en : np) ?? en ?? np ?? "";
  const setAd = (iso: string) => router.setParams({ ad: iso });

  const bs = p?.bs_date ?? adToBS(adDate(ad));
  const yearLine = usePatroYearLine("bs", bs.year);
  const today = todayNp();
  const todayBs = adToBS(adDate(today));
  const monthName = p?.bs_date ? pick(p.bs_date.month_name, p.bs_date.month_name_ne) : "";
  const adLabel = adDate(ad).toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", { month: "short", day: "numeric", year: "numeric" });
  const away = Math.round((Date.parse(`${ad}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  const badge =
    away === 0 ? t("calendar.today_btn") : away > 0 ? t("ui.home.in_n_days", { n: digits(away) }) : t("ui.day.days_ago", { n: digits(-away) });
  const festivals = (p?.festivals ?? []).map((f) => pick(f.name, f.name_ne)).filter(Boolean);
  const until = (end?: string) => {
    const time = end?.slice(11, 16);
    if (!time) return "";
    return t(end!.slice(0, 10) > ad ? "ui.day.until_next_day" : "ui.day.until", { time: digits(time) });
  };
  const tithiLine = p?.tithi ? [pick(p.paksha, p.paksha_ne), pick(p.tithi.name, p.tithi.name_ne)].filter(Boolean).join(" ") : "";
  const tithiIndex = p ? tithiIndexFromPanchanga(p) : null;
  const phaseKey = tithiIndex == null ? null : moonPhaseIconName(tithiIndex).replace("moon-", "").replace(/-/g, "_");
  const tint = festivals.length ? SLIDER_TINT.festival : colors.secondary;

  const angas: { key: string; label: string; anga?: Anga }[] = [
    { key: "tithi", label: t("ui.day.el.tithi"), anga: p?.tithi },
    { key: "nakshatra", label: t("ui.day.el.nakshatra"), anga: p?.nakshatra },
    { key: "yoga", label: t("ui.day.el.yoga"), anga: p?.yoga },
    { key: "karana", label: t("ui.day.el.karana"), anga: p?.karana },
  ];
  const plain: { key: string; label: string; value: string }[] = [
    { key: "chandra", label: t("ui.day.el.chandra_rashi"), value: pick(p?.chandra_rashi, p?.chandra_rashi_ne) },
    { key: "surya", label: t("ui.day.el.surya_rashi"), value: pick(p?.surya_rashi, p?.surya_rashi_ne) },
    { key: "ritu", label: t("ui.day.el.ritu"), value: pick(p?.ritu, p?.ritu_ne) },
    { key: "ayan", label: t("ui.day.el.ayan"), value: pick(p?.aayan, p?.aayan_ne) },
  ].filter((x) => x.value);
  const span = (s?: Span) => (s?.start_time && s.end_time ? digits(`${s.start_time} – ${s.end_time}`) : "");
  const times = [
    { key: "abhijit", label: t("ui.day.abhijit"), value: span(p?.muhurta?.abhijit), good: true },
    { key: "rahu", label: t("ui.day.rahu"), value: span(p?.muhurta?.rahu_kalam), good: false },
  ].filter((x) => x.value);

  const dateTitle = (
    <HeaderDateTitle
      badgeTop={monthShortLabel("bs", bs.month, lang)}
      badgeBottom={digits(bs.day)}
      title={yearLine}
      subtitle={adLabel}
      onToday={() => setAd(today)}
      onPick={() => setPickerOpen(true)}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <BackHeader title={t("ui.day.day_detail")} center={dateTitle} />
      {/* The day picker's sheet only; the year line opens it. */}
      <PatroDayTimeHeader
        buttonless
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        era="bs"
        year={bs.year}
        month={bs.month}
        day={bs.day}
        weekday={adDate(ad).getDay()}
        today={todayBs}
        onSelect={(y, m, d) => setAd(isoOf(bsToAD(y, m, d)))}
        onStepDay={(delta) => setAd(isoOf(new Date(adDate(ad).getTime() + delta * DAY_MS)))}
        onToday={() => setAd(today)}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: navBottom + space["2xl"], gap: space.lg }}>
        {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState /> : null}

        {p ? (
          <View className="overflow-hidden rounded-3xl border bg-card" style={{ borderColor: withAlpha(tint, 0.35) }}>
            <View className="flex-row p-4">
              <View className="w-28 items-center justify-center border-r border-border pr-3">
                <Text className="text-base font-bold text-foreground" style={ne}>
                  {monthName} {digits(bs.year)}
                </Text>
                <Text className="text-5xl font-extrabold" style={{ color: tint }}>
                  {digits(bs.day)}
                </Text>
                <Text className="text-base font-bold text-foreground" style={ne}>
                  {lang === "en" ? p.weekday_en : p.weekday}
                </Text>
                <Text className="text-sm text-muted-foreground">{adLabel}</Text>
              </View>
              <View className="flex-1 gap-2 pl-4">
                <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: withAlpha(tint, 0.15) }}>
                  <Text className="text-sm font-bold text-foreground">{badge}</Text>
                </View>
                <Text className="text-xl font-extrabold leading-snug" style={[ne, { color: festivals.length ? tint : colors.foreground }]}>
                  {festivals.length ? festivals.join(" / ") : t("ui.day.no_festival")}
                </Text>
                {tithiLine ? (
                  <Text className="text-base text-foreground" style={ne}>
                    {tithiLine} {p.tithi?.end ? `(${until(p.tithi.end)})` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row border-t border-border" style={{ backgroundColor: withAlpha(tint, 0.06) }}>
              <View className="flex-1 items-center gap-1 py-3">
                {tithiIndex != null ? <MoonPhaseIcon tithiIndex={tithiIndex} size={40} /> : null}
                <Text className="text-sm font-semibold text-foreground" style={ne} numberOfLines={1}>
                  {phaseKey ? t(`weather.moon.${phaseKey}`) : "—"}
                </Text>
              </View>
              {[
                { key: "sunrise" as const, value: p.sun?.sunrise, label: t("ui.day.sunrise") },
                { key: "sunset" as const, value: p.sun?.sunset, label: t("ui.day.sunset") },
              ].map((x) => (
                <View key={x.key} className="flex-1 items-center gap-1 border-l border-border py-3">
                  <FactIcon icon={{ kind: "icon", name: x.key }} size={40} />
                  <Text className="text-base font-bold tabular-nums text-foreground">{x.value ? digits(x.value) : "—"}</Text>
                  <Text className="text-xs text-muted-foreground">{x.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {p ? (
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">{t("ui.day.panchanga")}</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {angas.map(({ key, label, anga }) =>
                anga ? (
                  <View key={key} className="w-[48.5%] gap-0.5 rounded-2xl border p-3" style={{ borderColor: withAlpha(SLIDER_TINT.festivalSoon, 0.3), backgroundColor: withAlpha(SLIDER_TINT.festivalSoon, 0.07) }}>
                    <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
                    <Text className="text-lg font-bold text-foreground" style={ne} numberOfLines={1}>
                      {pick(anga.name, anga.name_ne)}
                    </Text>
                    {anga.end ? (
                      <Text className="text-sm text-foreground" style={ne} numberOfLines={1}>
                        {until(anga.end)}
                      </Text>
                    ) : null}
                    {pick(anga.next, anga.next_ne) ? (
                      <Text className="text-xs text-muted-foreground" style={ne} numberOfLines={1}>
                        {t("ui.day.then", { next: pick(anga.next, anga.next_ne) })}
                      </Text>
                    ) : null}
                  </View>
                ) : null,
              )}
              {plain.map((x) => (
                <View key={x.key} className="w-[48.5%] gap-0.5 rounded-2xl border border-border bg-card p-3">
                  <Text className="text-sm font-medium text-muted-foreground">{x.label}</Text>
                  <Text className="text-lg font-bold text-foreground" style={ne} numberOfLines={1}>
                    {x.value}
                  </Text>
                </View>
              ))}
            </View>

            {times.length ? (
              <View className="gap-2 rounded-2xl border border-border bg-card p-3">
                <Text className="text-base font-bold text-foreground">{t("ui.day.times")}</Text>
                {times.map((x) => (
                  <View key={x.key} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: x.good ? colors.success : colors.destructive }} />
                      <Text className="text-base text-foreground">{x.label}</Text>
                    </View>
                    <Text className="text-base font-semibold tabular-nums text-foreground">{x.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={() => router.push({ pathname: "/panchanga", params: { date: ad } })}
              accessibilityRole="button"
              className="items-center rounded-2xl border border-border bg-card py-3 active:opacity-70"
            >
              <Text className="text-base font-semibold" style={{ color: colors.secondary }}>
                {t("ui.day.full")} ›
              </Text>
            </Pressable>
          </View>
        ) : null}

        <UpcomingFestivalsSlider location={location.params} horizontalInset={space.md} />

        {p ? <DayEvents events={dayEvents.events} /> : null}
      </ScrollView>
    </View>
  );
}
