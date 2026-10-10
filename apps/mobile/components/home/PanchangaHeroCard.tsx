import { ImageBackground, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LinearGradient } from "expo-linear-gradient";
import { useLocale } from "@/lib/i18n";
import {
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  adToBS,
  bsMonthLabel,
} from "@vedic-patro/domain/bs-calendar";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { MONTH_HERO_COLORS } from "@/lib/theme";
import { bsMonthArt } from "@/lib/month-art";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatPakshaLabel, getPanchangaDetail } from "@vedic-patro/domain/panchanga-format";
import {
  formatGregorianFromDateParts,
  formatPatroCivilDayLabel,
  patroHeadlineDigits,
} from "@vedic-patro/domain/patro-headline-subtitle";
import { type Era } from "@vedic-patro/domain/era";
import { patroEraShortLabel } from "@/components/patro-date/patro-era-labels";
import { resolveSamvatsaraForPatroYear, type SamvatsaraPayload } from "@/lib/samvatsara";
import { parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";

type Props = {
  month: number;
  year: number;
  browseEra?: Era;
  isAdCalendar?: boolean;
  selectedAd: string;
  todayAd: string;
  p?: PanchangaDay;
  contextDay?: CalendarDay | null;
};

export function PanchangaHeroCard({
  month,
  year,
  browseEra = "bs",
  isAdCalendar = false,
  selectedAd,
  todayAd,
  p,
  contextDay,
}: Props) {
  const colors = useThemeColors();
  const { pick, digits, lang } = useLocale();
  const isToday = selectedAd === todayAd;
  const digitFn = patroHeadlineDigits(lang);

  const weekdayNe = pick(
    p?.weekday ?? contextDay?.weekday_ne ?? contextDay?.weekday ?? "",
    contextDay?.weekday_en ?? p?.weekday ?? contextDay?.weekday ?? "",
  );

  const detail = p ? getPanchangaDetail(p) : undefined;
  const tithiBlock = (detail?.tithi ?? p?.tithi) as { name?: string; name_ne?: string } | undefined;
  const tithi = pick(
    tithiBlock?.name_ne ?? p?.tithi?.name_ne ?? p?.tithi?.name ?? contextDay?.tithi_ne ?? contextDay?.tithi ?? "",
    tithiBlock?.name ?? p?.tithi?.name ?? p?.tithi?.name_ne ?? contextDay?.tithi ?? contextDay?.tithi_ne ?? "",
  );

  const paksha = formatPakshaLabel(
    p,
    lang,
    contextDay?.paksha_ne ?? contextDay?.panchanga?.paksha_ne,
    contextDay?.paksha ?? contextDay?.panchanga?.paksha,
  );

  const topFest = p?.festivals?.[0];
  const topFestName = pick(
    topFest?.name_ne ?? topFest?.name_en ?? topFest?.name ?? contextDay?.festivals[0] ?? "",
    topFest?.name_en ?? topFest?.name ?? topFest?.name_ne ?? contextDay?.festivals[0] ?? "",
  );
  const topFestPublic = topFest?.is_public_holiday ?? false;

  const displayHeroDate = (() => {
    const v = p?.date_parts?.vikram;
    if (v?.month && v.day) {
      const monthName = pick(BS_MONTHS_NE[v.month - 1], BS_MONTH_NAMES[v.month - 1]);
      return `${monthName} ${digits(v.day)}`;
    }
    if (p?.display?.bs_ne) return digits(p.display.bs_ne);
    if (p?.bs_date && typeof p.bs_date === "object") {
      const monthName = pick(BS_MONTHS_NE[p.bs_date.month - 1], BS_MONTH_NAMES[p.bs_date.month - 1]);
      return `${monthName} ${digits(p.bs_date.day)}`;
    }
    if (contextDay && !isAdCalendar) {
      return `${bsMonthLabel(month, lang)} ${digits(contextDay.day)}`;
    }
    if (contextDay) {
      const bs = adToBS(parseCivilIsoToDate(contextDay.date_ad));
      const monthName = pick(BS_MONTHS_NE[bs.month - 1], BS_MONTH_NAMES[bs.month - 1]);
      return `${monthName} ${digits(bs.day)}`;
    }
    if (p?.date_bs) return digits(p.date_bs);
    const fallback = adToBS(new Date(`${selectedAd}T12:00:00`));
    return `${bsMonthLabel(fallback.month, lang)} ${digits(fallback.day)}`;
  })();

  const patroYearForLabel =
    p?.date_parts?.vikram?.year ??
    (p?.bs_date && typeof p.bs_date === "object" ? p.bs_date.year : year);
  const patroEraForLabel =
    (p?.date_parts?.vikram?.era as Era | undefined) ??
    (p?.bs_date && typeof p.bs_date === "object" && p.bs_date.year < 0 ? "bbs" : browseEra);
  const vikramEraLabel = patroEraShortLabel(patroEraForLabel, pick);
  const samvatsaraInfo = resolveSamvatsaraForPatroYear(
    patroEraForLabel,
    patroYearForLabel,
    p?.samvatsara as SamvatsaraPayload | undefined,
  );
  const samvatsaraLabel = samvatsaraInfo ? pick(samvatsaraInfo.name_ne, samvatsaraInfo.name_en) : "";

  const adDisplay = (() => {
    const g = p?.date_parts?.gregorian;
    if (g?.year && g.month && g.day) {
      return formatGregorianFromDateParts(g, lang, digitFn);
    }
    if (lang === "en" && p?.display?.gregorian_en) return p.display.gregorian_en;
    if (p?.date_ad) return formatPatroCivilDayLabel(p.date_ad, lang, digitFn);
    return formatPatroCivilDayLabel(selectedAd, lang, digitFn);
  })();

  const heroMonth =
    p?.date_parts?.vikram?.month ??
    (p?.bs_date && typeof p.bs_date === "object" ? p.bs_date.month : month);
  const base = MONTH_HERO_COLORS[heroMonth] ?? colors.secondary;

  return (
    <View className="overflow-hidden rounded-xl shadow-lg">
      <ImageBackground
        source={bsMonthArt(heroMonth)}
        resizeMode="cover"
        style={{ backgroundColor: base }}
        accessibilityIgnoresInvertColors
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.82)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.4)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 22 }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-body font-semibold tracking-widest text-white/70">
                {(isToday ? pick("आज", "TODAY") : (weekdayNe ?? "")).toUpperCase()}
              </Text>
              <Text className="text-display mt-2 font-bold text-white">
                {displayHeroDate}
              </Text>
              <Text className="text-body mt-0.5 text-white/90">
                {weekdayNe}
                {`, ${vikramEraLabel} ${digits(patroYearForLabel)}`}
                {samvatsaraLabel ? (
                  <Text className="text-white/75">{` · ${samvatsaraLabel}`}</Text>
                ) : null}
              </Text>
              <Text className="text-caption mt-1.5 text-white/70">{adDisplay}</Text>
            </View>

            {(paksha || tithi || topFestName) ? (
              <View className="mt-0.5 max-w-[42%] shrink-0 items-end gap-1.5">
                {paksha ? <HeroPill label={paksha} /> : null}
                {tithi ? <HeroPill label={tithi} /> : null}
                {topFestName ? (
                  <HeroPill label={topFestName} kind={topFestPublic ? "public" : "festival"} />
                ) : null}
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

function HeroPill({ label, kind }: { label: string; kind?: "public" | "festival" }) {
  const bg =
    kind === "public"
      ? "rgba(255,90,90,0.16)"
      : kind === "festival"
        ? "rgba(0,170,180,0.18)"
        : "rgba(255,255,255,0.10)";
  const border =
    kind === "public"
      ? "rgba(255,120,120,0.35)"
      : kind === "festival"
        ? "rgba(0,200,210,0.35)"
        : "rgba(255,255,255,0.20)";
  const text =
    kind === "public" ? "#ffb4b4" : kind === "festival" ? "#8fe3e8" : "#ffffff";

  return (
    <View
      style={{ backgroundColor: bg, borderColor: border }}
      className="rounded-full border px-2.5 py-1.5"
    >
      <Text
        style={{ color: text, ...nepaliTextStyle(14) }}
        className="text-body font-semibold"
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}
