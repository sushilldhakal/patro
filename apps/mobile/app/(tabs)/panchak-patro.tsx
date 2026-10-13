import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { Text } from "@/components/ui/Text";
import { fetchPanchakYear, panchakKeys } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { mapPanchakPeriod, type PanchakPeriod } from "@vedic-patro/domain/panchak/panchak-patro-data";
import { PANCHAK_VARIETIES, panchakVarietyFromStartAd } from "@vedic-patro/domain/panchak/panchak-types";
import { formatBsMonthDayPatro } from "@vedic-patro/domain/panchanga-format";
import { eraToApi } from "@vedic-patro/domain/era";
import { formatBrowsePatroYear } from "@vedic-patro/domain/patro-year-axis";
import { patroNoteBox } from "@/lib/patro-classes";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { illustration } from "@vedic-patro/design-tokens";

function fmtAdShort(iso: string, lang: "ne" | "en"): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PanchakPeriodCard({
  index,
  period,
  width,
}: {
  index: number;
  period: PanchakPeriod;
  width: string;
}) {
  const { t, lang, pick, digits } = useLocale();
  const { width: screenWidth } = useBreakpoint();
  const en = lang === "en";
  const variety = panchakVarietyFromStartAd(period.start.ad);

  const bsStart = formatBsMonthDayPatro(period.start.bsYear, period.start.bsMonth, period.start.bsDay);
  const bsEnd = formatBsMonthDayPatro(period.end.bsYear, period.end.bsMonth, period.end.bsDay);

  const Boundary = ({ label, bs, time, ad }: { label: string; bs: string; time: string; ad: string }) => (
    <View
      className={cn(pc.boundary, "flex-1")}
    >
      <Text className={pc.boundaryLabel} style={nepaliTextStyle()}>
        {label}
      </Text>
      <Text className={pc.boundaryValue} style={nepaliTextStyle()}>
        {digits(bs)}, {time}
      </Text>
      <Text className={pc.boundaryAd} style={nepaliTextStyle()}>{ad}</Text>
    </View>
  );

  return (
    <View
      style={{ width: width as never }}
      className={pc.periodCard}
    >
      <View className={pc.periodHead}>
        <Text className={pc.periodTitle} style={nepaliTextStyle()}>
          {pick(`पञ्चक ${digits(index + 1)}`, `Panchak ${index + 1}`)}
        </Text>
        {variety ? (
          <View className={pc.varietyBadge}>
            <Text className={pc.varietyText} style={nepaliTextStyle()}>
              {en ? variety.labelEn : variety.labelNe}
            </Text>
          </View>
        ) : null}
      </View>

      <View className={screenWidth >= 640 ? "flex-row gap-4" : "gap-4"}>
        <Boundary
          label={t("panchak.start_date")}
          bs={bsStart}
          time={en ? period.start.timeEn : period.start.timeNe}
          ad={fmtAdShort(period.start.ad, lang)}
        />
        <Boundary
          label={t("panchak.end_date")}
          bs={bsEnd}
          time={en ? period.end.timeEn : period.end.timeNe}
          ad={fmtAdShort(period.end.ad, lang)}
        />
      </View>

      <Text className={pc.duration} style={nepaliTextStyle()}>
        {t("panchak.duration")}:{" "}
        <Text className={pc.durationValue}>{en ? period.durationEn : period.durationNe}</Text>
      </Text>
    </View>
  );
}

const PROHIBITED_ITEMS = [
  {
    key: "south_travel",
    titleNe: "दक्षिण यात्रा",
    titleEn: "Travel south",
    descNe: "यमराजको दिशाबाट बच्न (Avoiding the direction of Yamaraj)",
    descEn: "Avoiding the direction of Yama (south)",
  },
  {
    key: "roof",
    titleNe: "घर छाउनु",
    titleEn: "Roofing a house",
    descNe: "नयाँ घरमा छत हाल्नु (Putting the roof on a new house)",
    descEn: "Placing the roof on a new house",
  },
  {
    key: "bed",
    titleNe: "खाट/छपरी बुन्नु",
    titleEn: "Weaving a bed or cot",
    descNe: "खाट वा कोक्रो बुन्नु वा बनाउनु (Weaving or constructing a bed/cot)",
    descEn: "Weaving or constructing a bed/cot (charpai)",
  },
  {
    key: "fuel",
    titleNe: "काठ-दाउरा सञ्चय",
    titleEn: "Gathering firewood or grass",
    descNe: "दाउरा वा घाँस जम्मा गर्नु (Gathering firewood or grass)",
    descEn: "Stockpiling fuel or fodder",
  },
  {
    key: "last_rites",
    titleNe: "दाह संस्कार",
    titleEn: "Last rites",
    descNe: "अन्तिम संस्कार गर्नु (Performing last rites)",
    descEn: "Performing cremation or final funeral rites",
  },
] as const;

export default function PanchakPatroScreen() {
  const { t, lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const en = lang === "en";
  const apiEra = eraToApi(era);

  const yearLabel = useMemo(
    () => formatBrowsePatroYear(era, year, lang, digits),
    [era, year, lang, digits],
  );

  const query = useQuery({
    queryKey: panchakKeys.year(year, location.params, apiEra),
    queryFn: () => fetchPanchakYear(year, location.params, apiEra),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const periods = useMemo(
    () => query.data?.periods.map(mapPanchakPeriod) ?? [],
    [query.data?.periods],
  );
  const cardWidth = width >= 1024 ? "49%" : "100%";

  return (
    <AppShell title="" showHeader={false}>
      <View className="mb-4">
        <PageHeader
          icon={<Ionicons name="calendar-outline" size={28} color={colors.secondary} />}
          title={t("ui.panchak_patro.panchak_patro_yearlabel", { yearLabel })}
          subtitle={t("panchak.subtitle")}
        />
      </View>

      <PatroYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={query.data?.gregorian_range}
        location={location}
        onLocationChange={setLocation}
      />

      <View className={cn(patroNoteBox, "mt-4")}>
        <Text className={pc.introText} style={nepaliTextStyle()}>
          {t("panchak.intro")}
        </Text>
      </View>

      {query.isLoading && !query.data ? (
        <Text className={pc.noData} style={nepaliTextStyle()}>
          {t("common.loading")}
        </Text>
      ) : query.isError ? (
        <Text className={pc.errorText} style={nepaliTextStyle()}>
          {t("ui.panchak_patro.could_not_load_panchak_details")}
        </Text>
      ) : !periods.length ? (
        <Text className={pc.noData} style={nepaliTextStyle()}>
          {t("ui.panchak_patro.panchak_details_for_yearlabel_are_not", { yearLabel })}
        </Text>
      ) : (
        <View className={pc.windows}>
          <View className={pc.windowsHeading}>
            <Ionicons name="warning-outline" size={16} color={illustration.amber67} />
            <Text className={pc.sectionTitle} style={nepaliTextStyle()}>
              {t("ui.panchak_patro.panchak_windows_for_yearlabel", { yearLabel })}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {periods.map((period, i) => (
              <PanchakPeriodCard
                key={`${period.start.ad}-${period.end.ad}`}
                index={i}
                period={period}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      )}

      <View className={cn(pc.panel, "mt-4")}>
        <Text className={pc.panelTitleSpaced} style={nepaliTextStyle()}>
          {t("panchak.prohibited_title")}
        </Text>
        <View className={pc.prohibitedList}>
          {PROHIBITED_ITEMS.map((item, i) => (
            <View
              key={item.key}
              className={cn(
                pc.prohibitedItem,
                i === PROHIBITED_ITEMS.length - 1 && "border-b-0 pb-0",
              )}
            >
              <Text className={pc.itemTitle} style={nepaliTextStyle()}>
                {pick(item.titleNe, item.titleEn)}
              </Text>
              <Text className={pc.itemDesc} style={nepaliTextStyle()}>
                {pick(item.descNe, item.descEn)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className={cn(pc.panelLearn, "mt-4")}>
        <Text className={pc.panelTitle} style={nepaliTextStyle()}>
          {t("panchak.learn_title")}
        </Text>

        <View>
          <Text className={pc.learnHeading} style={nepaliTextStyle()}>
            {t("panchak.what_title")}
          </Text>
          <Text className={pc.learnBody} style={nepaliTextStyle()}>
            {t("panchak.what_body")}
          </Text>
        </View>

        <View>
          <Text className={pc.learnHeading} style={nepaliTextStyle()}>
            {t("panchak.rahita_title")}
          </Text>
          <Text className={pc.learnBody} style={nepaliTextStyle()}>
            {t("panchak.rahita_body")}
          </Text>
        </View>

        <View>
          <Text className={pc.learnHeadingSpaced} style={nepaliTextStyle()}>
            {t("panchak.types_title")}
          </Text>
          <View className={pc.typesList}>
            {PANCHAK_VARIETIES.map((v) => (
              <Text key={v.id} className={pc.typeItem} style={nepaliTextStyle()}>
                <Text className={pc.typeName}>{en ? v.labelEn : v.labelNe}</Text>
                {" — "}
                {en ? v.noteEn : v.noteNe}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </AppShell>
  );
}
