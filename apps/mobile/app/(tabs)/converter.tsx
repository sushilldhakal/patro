import { useState } from "react";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Text } from "@/components/ui/Text";
import { apiKeys } from "@/lib/api";
import { convertAdToBs, convertBsToAd } from "@/lib/offline/convert-fallback";
import { adToBS, todayAdString } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { converterClasses } from "@vedic-patro/design-tokens/classes/converter-classes";

const WEEKDAY_NE: Record<string, string> = {
  Sunday: "आइतबार",
  Monday: "सोमबार",
  Tuesday: "मङ्गलबार",
  Wednesday: "बुधबार",
  Thursday: "बिहिबार",
  Friday: "शुक्रबार",
  Saturday: "शनिबार",
};

type Mode = "ad-to-bs" | "bs-to-ad";

export default function ConverterScreen() {
  const { pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width, isCalendarWide } = useBreakpoint();
  const today = todayAdString();
  const bs = adToBS(new Date());
  const todayBs = `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;

  const [mode, setMode] = useState<Mode>("ad-to-bs");
  const [adInput, setAdInput] = useState(today);
  const [bsInput, setBsInput] = useState(todayBs);
  const [adDate, setAdDate] = useState(today);
  const [bsDate, setBsDate] = useState(todayBs);

  const adToBsQ = useQuery({
    queryKey: apiKeys.convertAd(adDate),
    queryFn: () => convertAdToBs(adDate),
    enabled: mode === "ad-to-bs" && !!adDate,
    staleTime: Infinity,
  });

  const bsToAdQ = useQuery({
    queryKey: apiKeys.convertBs(bsDate),
    queryFn: () => convertBsToAd(bsDate),
    enabled: mode === "bs-to-ad" && !!bsDate,
    staleTime: Infinity,
  });

  const submit = () => {
    if (mode === "ad-to-bs") setAdDate(adInput.trim());
    else setBsDate(bsInput.trim());
  };

  const adResult = adToBsQ.data;
  const bsResult = bsToAdQ.data;
  const isError = mode === "ad-to-bs" ? adToBsQ.isError : bsToAdQ.isError;

  // Web grid: grid-cols-2 / sm:grid-cols-3 / lg:grid-cols-4
  const cols = width >= 1024 ? 4 : width >= 640 ? 3 : 2;
  /* percent widths + a 12px gap: leave ~4% per gap or the last tile wraps. */
  const tileWidth = `${((100 - 4 * (cols - 1)) / cols).toFixed(2)}%`;

  return (
    <AppShell
      title={pick("मिति रूपान्तर", "Date Converter")}
      showHeader={false}
    >
      <PatroPageHeader
        className="mb-8"
        icon={<AppNavIcon name="arrow-left-right" size={24} color={colors.secondary} />}
        title={t("converter.title")}
        subtitle={t("converter.subtitle")}
      />

      <View className={cn("mb-8 flex-row self-start", converterClasses.modeToggle)}>
        {(["ad-to-bs", "bs-to-ad"] as const).map((m) => {
          const active = mode === m;
          const tone = active ? converterClasses.modeLabelActive : converterClasses.modeLabelIdle;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={cn(
                "flex-row active:opacity-80",
                converterClasses.modeButton,
                active && converterClasses.modeButtonActive,
              )}
            >
              <Text className={cn(converterClasses.modeLabel, tone)}>{m === "ad-to-bs" ? "AD" : "BS"}</Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={active ? inkOn(colors.secondary) : colors.foreground}
              />
              <Text className={cn(converterClasses.modeLabel, tone)}>{m === "ad-to-bs" ? "BS" : "AD"}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className={cn("mb-8 flex-row flex-wrap", converterClasses.form)}>
        <View className={converterClasses.field}>
          <Text className={converterClasses.label} style={nepaliTextStyle()}>
            {mode === "ad-to-bs" ? t("converter.ad_date") : t("converter.bs_date")}
          </Text>
          <TextInput
            value={mode === "ad-to-bs" ? adInput : bsInput}
            onChangeText={mode === "ad-to-bs" ? setAdInput : setBsInput}
            onSubmitEditing={submit}
            placeholder={mode === "ad-to-bs" ? "2026-07-22" : "2083-02-24"}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            className={converterClasses.input}
          />
        </View>
        <Button
          label={t("converter.convert")}
          variant="secondary"
          className={cn("h-auto", converterClasses.submit)}
          textClassName={converterClasses.submitLabel}
          onPress={submit}
        />
      </View>

      {isError ? (
        <View className={cn("mb-8", converterClasses.errorBox)}>
          <Text className={converterClasses.errorText} style={nepaliTextStyle()}>
            {t("converter.error")}
          </Text>
        </View>
      ) : null}

      {mode === "ad-to-bs" && adResult ? (
        <View className="mb-8 gap-4">
          <View className={cn("flex-row", converterClasses.resultRow)}>
            <Text className={converterClasses.resultValue}>{adResult.ad_date}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
            <Text className={converterClasses.resultValue}>{adResult.bs_date}</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <StatCard width={tileWidth} highlight label={t("converter.bs_date")} value={adResult.bs_date} />
            <StatCard width={tileWidth} label={t("converter.bs_year")} value={digits(adResult.bs_year)} />
            <StatCard
              width={tileWidth}
              label={t("converter.bs_month")}
              value={pick(adResult.bs_month_name_ne ?? "", adResult.bs_month_name ?? "")}
            />
            <StatCard width={tileWidth} label={t("converter.bs_day")} value={digits(adResult.bs_day)} />
            <StatCard width={tileWidth} label={t("converter.ad_date")} value={adResult.ad_date} />
            <StatCard
              width={tileWidth}
              label={t("converter.weekday")}
              value={pick(WEEKDAY_NE[adResult.weekday] ?? adResult.weekday, adResult.weekday)}
            />
          </View>
        </View>
      ) : null}

      {mode === "bs-to-ad" && bsResult ? (
        <View className="mb-8 gap-4">
          <View className={cn("flex-row", converterClasses.resultRow)}>
            <Text className={converterClasses.resultValue}>{bsResult.bs_date}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
            <Text className={converterClasses.resultValue}>{bsResult.ad_date}</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <StatCard width={tileWidth} highlight label={t("converter.ad_date")} value={bsResult.ad_date} />
            <StatCard width={tileWidth} label={t("converter.bs_date")} value={bsResult.bs_date} />
            <StatCard
              width={tileWidth}
              label={t("converter.bs_month")}
              value={pick(bsResult.bs_month_name_ne ?? "", bsResult.bs_month_name ?? "")}
            />
            <StatCard width={tileWidth} label={t("converter.bs_day")} value={digits(bsResult.bs_day)} />
            <StatCard width={tileWidth} label={t("converter.bs_year")} value={digits(bsResult.bs_year)} />
            <StatCard
              width={tileWidth}
              label={t("converter.weekday")}
              value={pick(WEEKDAY_NE[bsResult.weekday] ?? bsResult.weekday, bsResult.weekday)}
            />
          </View>
        </View>
      ) : null}
      <SeoContentSection route="converter" />
    </AppShell>
  );
}
