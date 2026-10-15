/**
 * Shell kit props — one contract for the website and the app.
 * Drawing lives in `web/` and `native/`; both indexes must export every name.
 */
import type { ComponentType, ReactNode } from "react";
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import type { Era, Language } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@vedic-patro/domain/panchanga-location";
import type { LocateDevice, SeoContentRoute } from "@vedic-patro/features/common";
import type { usePatroDayTimeHeader } from "@vedic-patro/features/patro-date";

export type StatCardProps = {
  label: string;
  value?: string | null;
  sub?: string;
  highlight?: boolean;
  className?: string;
  /** Fractional tile width in the app (`"48.00%"`). The website sizes the card with `className`. */
  width?: string;
};

export type SeoContentSectionProps = {
  route: SeoContentRoute;
  className?: string;
};

export type PatroHeaderTab = { key: string; label: string; active: boolean; onPress: () => void };

export type PatroHeaderTabsProps = {
  tabs: PatroHeaderTab[];
  label?: string;
  className?: string;
};

export type PatroHeaderSwapProps = {
  tabs: PatroHeaderTab[];
  className?: string;
};

export type SiteFooterProps = {
  /** Opens an in-app page (`/privacy`, `/terms`). Each app supplies its router. */
  onOpenPage: (path: string) => void;
  className?: string;
};

export type LanguageButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
};

export type TodayHighlightMoon = { tithiIndex: number; title: string };

export type TodayHighlightCardProps = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  isAdCalendar: boolean;
  year: number;
  month: number;
  p?: PanchangaDay;
  className?: string;
  /** Moon artwork stays in each app (it is a panchanga drawing). */
  moon?: (info: TodayHighlightMoon) => ReactNode;
};

export type CalendarHeaderSegment = { key: string; label: string; active: boolean; onPress: () => void };

export type PatroHeaderLocationProps = {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  /** Reads the device position. Each app supplies its own geolocation. */
  locate: LocateDevice;
  className?: string;
  /** Controlled panel, so a header can keep only one panel open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type PatroCalendarHeaderProps = {
  era: Era;
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  onEraChange?: (era: Era) => void;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  locate?: LocateDevice;
  segments?: CalendarHeaderSegment[];
  segmentsLabel?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  crossEraSubtitle?: string | null;
  displayLanguage?: Language;
  className?: string;
};

export type PatroMonthYearNavProps = Omit<PatroCalendarHeaderProps, "onChange"> & {
  onBrowse: (next: { year: number; month: number }) => void;
};

export type PatroDayTimeModel = ReturnType<typeof usePatroDayTimeHeader>;

export type PatroDayTimePanelProps = {
  h: PatroDayTimeModel;
  onEraChange?: (era: Era) => void;
  onOk?: () => void;
  onToday?: () => void;
};

export type PatroDayTimeHeaderProps = {
  era: Era;
  year: number;
  month: number;
  day: number;
  weekday: number;
  today?: { year: number; month: number; day: number } | null;
  clock?: string;
  nowClock?: string;
  onSelect: (year: number, month: number, day: number) => void;
  onStepDay: (delta: 1 | -1) => void;
  onToday: () => void;
  onClockChange?: (clock: string) => void;
  onEraChange?: (era: Era) => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  subtitle?: string;
  crossEraText?: string;
  className?: string;
};

export type PatroYearHeaderProps = {
  era: Era;
  year: number;
  onChange: (year: number) => void;
  onToday: () => void;
  todayYear?: number;
  onEraChange?: (era: Era) => void;
  subtitle?: string | null;
  className?: string;
};

export type PatroYearNavProps = {
  era: Era;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  gregorianRange?: { start: string; end: string } | null;
  rangeLabel?: string | null;
  yearError?: string | null;
  todayAd?: string;
  onToday?: () => void;
  displayLanguage?: Language;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  locate?: LocateDevice;
  tabs?: PatroHeaderTab[];
  tabsLabel?: string;
  className?: string;
};

export type PatroYearNavBlockProps = PatroYearNavProps & {
  /** Wrapper around the year nav. Default is the website's vertical spacing. */
  className?: string;
};

export type ShellKit = {
  StatCard: ComponentType<StatCardProps>;
  SeoContentSection: ComponentType<SeoContentSectionProps>;
  PatroHeaderTabs: ComponentType<PatroHeaderTabsProps>;
  PatroHeaderSwap: ComponentType<PatroHeaderSwapProps>;
  SiteFooter: ComponentType<SiteFooterProps>;
  LanguageButton: ComponentType<LanguageButtonProps>;
  TodayHighlightCard: ComponentType<TodayHighlightCardProps>;
  PatroHeaderLocation: ComponentType<PatroHeaderLocationProps>;
  PatroCalendarHeader: ComponentType<PatroCalendarHeaderProps>;
  PatroMonthYearNav: ComponentType<PatroMonthYearNavProps>;
  PatroDayTimePanel: ComponentType<PatroDayTimePanelProps>;
  PatroDayTimeHeader: ComponentType<PatroDayTimeHeaderProps>;
  PatroYearHeader: ComponentType<PatroYearHeaderProps>;
  PatroYearNav: ComponentType<PatroYearNavProps>;
  PatroYearNavBlock: ComponentType<PatroYearNavBlockProps>;
};
