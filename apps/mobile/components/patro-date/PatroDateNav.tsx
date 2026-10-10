import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import {
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  getBSMonthLength,
} from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  AD_MONTHS_SHORT,
  BS_MONTHS_SHORT,
  adMonthLabel,
  bsMonthLabel,
} from "@vedic-patro/domain/patro-month-labels";
import { isGregorianEra, type Era } from "@vedic-patro/domain/era";
import { resolveSamvatsaraForPatroYear, type SamvatsaraPayload } from "@vedic-patro/domain/samvatsara";
import { displayLocationLabel, DEFAULT_PANCHANGA_LOCATION, type PanchangaLocation } from "@/lib/use-panchanga-location";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import {
  patroMonthChipDay,
  patroMonthChipHead,
  patroMonthChipHeadBoxStyle,
  patroMonthChipBodyBoxStyle,
  patroMonthChipHeadLabelStyle,
  patroMonthChipShell,
  patroMonthChipSpan,
} from "@/lib/patro-classes";
import { parseClockParts } from "@/components/panchanga/use-panchanga-mode";
import { PatroBsHeadline } from "./PatroBsHeadline";
import { PatroDateSheet } from "./PatroDateSheet";
import type { PatroDateSheetDraft } from "./PatroDateSheetDatePanel";
import { patroEraShortLabel } from "./patro-era-labels";
import type { PatroDateNavProps } from "./types";
import { usePatroDateSheet } from "./use-patro-date-sheet";

function chipMonthLabel(month: number, lang: string, era: Era): string {
  if (isGregorianEra(era)) {
    return AD_MONTHS_SHORT[month - 1]!.toUpperCase();
  }
  if (lang === "en") return BS_MONTHS_SHORT[month - 1]!.toUpperCase();
  return BS_MONTHS_NE[month - 1]!;
}

function monthChipSpan(
  year: number,
  month: number,
  era: Era,
  digits: (n: number) => string,
): string {
  if (isGregorianEra(era)) {
    const len = new Date(year, month, 0).getDate();
    return `${digits(1)}-${digits(len)}`;
  }
  const length = getBSMonthLength(year, month);
  return `${digits(1)}-${digits(length)}`;
}

function buildMonthOptions(era: Era, lang: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return {
      value: m,
      label: isGregorianEra(era) ? adMonthLabel(m, lang) : bsMonthLabel(m, lang),
    };
  });
}

function StepBtn({
  onPress,
  disabled,
  icon,
  compact,
}: {
  onPress: () => void;
  disabled?: boolean;
  icon: "chevron-back" | "chevron-forward";
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const size = compact ? 25 : 30;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "shrink-0 items-center justify-center rounded-lg border border-border bg-card active:bg-muted",
        disabled && "opacity-40",
      )}
      style={{ width: size, height: size }}
    >
      <Ionicons name={icon} size={compact ? 14 : 16} color={colors.foreground} />
    </Pressable>
  );
}

function LocationChip({
  location,
  onPress,
}: {
  location: PanchangaLocation;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { pick, lang } = useLocale();
  const safeLocation = location ?? DEFAULT_PANCHANGA_LOCATION;
  const label = displayLocationLabel(safeLocation, undefined, lang);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={pick("स्थान बदल्नुहोस्", "Change location")}
      /* Fixed width, not a max: as a content-sized chip the city name was the
         thing being measured, and it came back short — "Kathman…" inside a box
         that had room for the whole word. 108dp keeps the phone nav row inside
         360dp (25 + 104 + 25 steppers/chip + gaps + 108). */
      className="h-[30px] w-[6.75rem] shrink-0 flex-row items-center gap-1 rounded-lg border border-border bg-card px-2 active:bg-muted"
    >
      <Ionicons name="location-outline" size={13} color={colors.secondary} />
      <Text numberOfLines={1} className="text-body min-w-0 flex-1 font-medium text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Single Patro date + location chrome (3 modes × phone/tablet).
 * Phone: chips + steppers → bottom sheet (Date | Location tabs).
 * Tablet: inline pickers matching web md+ layout.
 */
export function PatroDateNav(props: PatroDateNavProps) {
  const {
    mode,
    era,
    onEraChange,
    year,
    onYearChange,
    location,
    onLocationChange,
    onToday,
    onPrev,
    onNext,
    prevDisabled,
    nextDisabled,
    crossEraSubtitle,
    toolbar,
    mobileToolbar,
    mobileToolbarLower,
    hideNavLocation,
    vikramEra,
    samvatsara: samvatsaraPayload,
    className,
  } = props;

  const colors = useThemeColors();
  const { pick, digits, lang } = useLocale();
  const { isCompact, isPhone, isNarrow } = useBreakpoint();
  const sheet = usePatroDateSheet();

  const safeLocation = location ?? DEFAULT_PANCHANGA_LOCATION;

  const month = mode === "year" ? 1 : props.month;
  const day = mode === "year-month-time" ? props.day : 1;
  const clock = mode === "year-month-time" ? props.clock ?? "" : "";
  const showTime = mode === "year-month-time" && Boolean(props.onClockChange);
  const todayAd = mode === "year-month-time" ? props.todayAd : undefined;

  const monthOptions = useMemo(() => buildMonthOptions(era, lang), [era, lang]);

  const eraShort = patroEraShortLabel(era, lang);
  const headlineEra = vikramEra ?? era;
  const samvatsaraInfo = !isGregorianEra(era)
    ? resolveSamvatsaraForPatroYear(
        headlineEra,
        year,
        samvatsaraPayload as SamvatsaraPayload | undefined,
      )
    : undefined;
  const samvatsaraLabel = samvatsaraInfo
    ? pick(samvatsaraInfo.name_ne, samvatsaraInfo.name_en)
    : undefined;

  const monthTitle =
    mode === "year"
      ? null
      : isGregorianEra(era)
        ? adMonthLabel(month, lang)
        : lang === "en"
          ? BS_MONTH_NAMES[month - 1]!
          : pick(BS_MONTHS_NE[month - 1]!, BS_MONTH_NAMES[month - 1]!);

  const monthTitleShort =
    mode === "year"
      ? null
      : lang === "en" || isGregorianEra(era)
        ? (isGregorianEra(era)
            ? AD_MONTHS_SHORT[month - 1]!
            : BS_MONTHS_SHORT[month - 1]!
          ).toUpperCase()
        : monthTitle;

  const clockSummary =
    showTime && clock
      ? (() => {
          const { hour, minute } = parseClockParts(clock);
          return `${digits(String(hour).padStart(2, "0"))}:${digits(String(minute).padStart(2, "0"))}`;
        })()
      : null;

  const dateChipLabel = (() => {
    if (mode === "year") return digits(year);
    if (mode === "year-month") {
      return monthTitleShort ?? monthTitle ?? "";
    }
    if (mode === "year-month-time") {
      const dayPart = `${digits(day)} ${monthTitle ?? ""}`.trim();
      return clockSummary ? `${dayPart} · ${clockSummary}` : dayPart;
    }
    return clockSummary ? `${digits(day)} · ${clockSummary}` : `${digits(day)}`;
  })();

  const dateChipLabelCompact =
    mode === "year-month-time"
      ? `${digits(day)}${clockSummary ? ` · ${clockSummary}` : ""}`
      : dateChipLabel;

  const handleCommit = (draft: PatroDateSheetDraft) => {
    if (draft.era !== era) onEraChange(draft.era);
    if (draft.year !== year) onYearChange(draft.year);
    if (mode === "year-month" && draft.month !== month) {
      props.onMonthChange(draft.month);
    }
    if (mode === "year-month-time") {
      if (draft.month !== month) props.onMonthChange(draft.month);
      if (draft.day !== day) props.onDayChange(draft.day);
      if (showTime && draft.clock !== clock) props.onClockChange?.(draft.clock);
      props.onSelectDate?.(draft.year, draft.month, draft.day);
    }
  };

  const todayChip = (
    <Pressable
      onPress={onToday}
      accessibilityLabel={pick("आज", "Today")}
      className={cn(
        patroMonthChipShell,
        "shrink-0 overflow-hidden active:opacity-90",
        mode === "year" && "w-[3.5rem] sm:w-[3.75rem]",
      )}
    >
      {mode === "year" ? (
        <>
          <View className={patroMonthChipHead} style={patroMonthChipHeadBoxStyle}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              className="w-full text-center font-bold tracking-wide text-secondary-foreground"
              style={patroMonthChipHeadLabelStyle(lang !== "en", isNarrow)}
            >
              {eraShort}
            </Text>
          </View>
          <View className={patroMonthChipDay} style={patroMonthChipBodyBoxStyle({ narrow: isNarrow })}>
            <Text className="text-body font-num font-bold text-foreground">
              {digits(year)}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View className={patroMonthChipHead} style={patroMonthChipHeadBoxStyle}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              className="w-full text-center font-bold tracking-wide text-secondary-foreground"
              style={patroMonthChipHeadLabelStyle(lang !== "en", isNarrow)}
            >
              {chipMonthLabel(month, lang, era)}
            </Text>
          </View>
          <View
            className={
              mode === "year-month-time" ? patroMonthChipDay : patroMonthChipSpan
            }
            style={patroMonthChipBodyBoxStyle({
              narrow: isNarrow,
              monthSpan: mode === "year-month",
            })}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className={cn(
                "font-num font-bold text-foreground",
                mode === "year-month-time"
                  ? "text-body"
                  : "text-body tracking-tight",
              )}
            >
              {mode === "year-month-time" ? digits(day) : monthChipSpan(year, month, era, digits)}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );

  /** Year + era + samvatsara + AD range — one baseline row (web `BsHeadline`). */
  const headlineMeta = (compact: boolean) => {
    const size = compact ? 14 : 20;
    const secondary = { color: colors.secondary };
    const bsPart = (
      <Text className="font-semibold text-secondary" style={[nepaliTextStyle(size), secondary]}>
        <Text className="font-num" style={secondary}>
          {digits(year)}
        </Text>
        {` ${patroEraShortLabel(headlineEra, lang)}`}
      </Text>
    );
    return (
      <PatroBsHeadline
        compact={compact}
        bs={bsPart}
        samvatsara={samvatsaraLabel}
        gregorian={crossEraSubtitle}
      />
    );
  };

  const headlineCompact = headlineMeta(true);
  const headlineTablet = headlineMeta(false);

  /**
   * A floor per mode, and a label that fills it.
   *
   * The label used to be the flex item that carried the chip's width, so it
   * was measured against whatever the row had left — and Android kept that
   * cramped measurement, drawing "भ…" in a box with 30dp of blank space on
   * either side of it. Sizing the chip first (`minWidth`) and letting the
   * label take the remainder (`flex-1`) means the label's box is definite
   * before it is measured, which is what the today-chip labels beside it
   * already do.
   */
  const dateChipMinWidth =
    mode === "year"
      ? 88
      : mode === "year-month"
        ? 104
        : isCompact
          ? 132
          : 176;

  const dateChip = (
    <Pressable
      onPress={sheet.openDate}
      style={{ minWidth: dateChipMinWidth }}
      className="h-[30px] max-w-[13rem] shrink-0 flex-row items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 active:bg-muted"
    >
      {mode === "year-month-time" ? (
        <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
      ) : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        className="text-body min-w-0 flex-1 text-center font-num font-semibold text-foreground"
      >
        {isCompact && mode === "year-month-time" ? dateChipLabelCompact : dateChipLabel}
      </Text>
      <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
    </Pressable>
  );

  const locationChip = (
    <LocationChip location={safeLocation} onPress={sheet.openLocation} />
  );

  const resolvedToolbarLower =
    mobileToolbarLower ?? (!hideNavLocation ? locationChip : null);

  const navControlsPhone = (
    <View className="min-w-0 flex-1 flex-row items-center gap-1">
      {onPrev ? <StepBtn disabled={prevDisabled} onPress={onPrev} icon="chevron-back" compact={isPhone} /> : null}
      {dateChip}
      {onNext ? <StepBtn disabled={nextDisabled} onPress={onNext} icon="chevron-forward" compact={isPhone} /> : null}
    </View>
  );

  const navRowPhone = resolvedToolbarLower ? (
    <View className="min-h-[30px] flex-row items-center gap-2">
      {navControlsPhone}
      <View className="shrink-0 items-end justify-center">{resolvedToolbarLower}</View>
    </View>
  ) : (
    <View className="flex-row items-center justify-between gap-2">
      {navControlsPhone}
      {!hideNavLocation ? locationChip : null}
    </View>
  );

  const usesSheetPicker = mode === "year" || mode === "year-month";

  const navRowTablet = (
    <View className="mt-1.5 flex-row items-center justify-between gap-2">
      <View className="min-w-0 flex-1 flex-row items-center gap-1">
        {onPrev && !usesSheetPicker ? (
          <StepBtn disabled={prevDisabled} onPress={onPrev} icon="chevron-back" />
        ) : null}
        {usesSheetPicker ? (
          <View className="flex-row items-center gap-1">
            {onPrev ? (
              <StepBtn disabled={prevDisabled} onPress={onPrev} icon="chevron-back" />
            ) : null}
            {dateChip}
            {onNext ? (
              <StepBtn disabled={nextDisabled} onPress={onNext} icon="chevron-forward" />
            ) : null}
          </View>
        ) : (
          dateChip
        )}
        {onNext && !usesSheetPicker ? (
          <StepBtn disabled={nextDisabled} onPress={onNext} icon="chevron-forward" />
        ) : null}
      </View>
      {!hideNavLocation ? locationChip : null}
    </View>
  );

  return (
    <View className={cn("mb-4", className)}>
      <View className="flex-row items-start gap-1.5 sm:gap-3">
        {onToday ? <View className="self-center">{todayChip}</View> : null}
        <View className="min-w-0 flex-1">
          {isCompact ? (
            <View className="gap-1.5">
              {/* Rows are independent: each is at least one 30px control tall and
                  centres its children, so no control's height sets another's
                  (and no negative margin is needed to hide the difference). */}
              <View className="min-h-[30px] flex-row items-center gap-2">
                {/* marginBottom cancels the empty line-height under the letters so the
                    visible gap to the date row matches the toolbar-to-location gap. */}
                <View className="min-w-0 flex-1 shrink self-end" style={{ marginBottom: -10 }}>
                  {headlineCompact}
                </View>
                {mobileToolbar ? <View className="shrink-0 justify-center">{mobileToolbar}</View> : null}
              </View>
              {!mobileToolbar && toolbar ? (
                <View className="flex-row justify-end">{toolbar}</View>
              ) : null}
              {navRowPhone}
            </View>
          ) : (
            <>
              <View className="relative z-10 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <View className="min-w-0 flex-1 shrink">{headlineTablet}</View>
                {toolbar ? (
                  <View className="shrink-0 flex-row flex-wrap items-center justify-end gap-1.5">
                    {toolbar}
                  </View>
                ) : null}
              </View>
              {navRowTablet}
            </>
          )}
        </View>
      </View>

      <PatroDateSheet
        sheet={sheet}
        mode={mode}
        era={era}
        year={year}
        month={month}
        day={day}
        clock={clock}
        monthOptions={monthOptions}
        todayAd={todayAd}
        showTime={showTime}
        location={safeLocation}
        onLocationChange={onLocationChange}
        onCommit={handleCommit}
      />
    </View>
  );
}

export { usePatroDateSheet } from "./use-patro-date-sheet";
export type { PatroDateNavMode, PatroDateNavProps } from "./types";
