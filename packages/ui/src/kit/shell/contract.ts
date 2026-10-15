/**
 * Shell kit props — one contract for the website and the app.
 * Drawing lives in `web/` and `native/`; both indexes must export every name.
 */
import type { ComponentType, ReactNode } from "react";
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import type { SeoContentRoute } from "@vedic-patro/features/common";

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

export type ShellKit = {
  StatCard: ComponentType<StatCardProps>;
  SeoContentSection: ComponentType<SeoContentSectionProps>;
  PatroHeaderTabs: ComponentType<PatroHeaderTabsProps>;
  PatroHeaderSwap: ComponentType<PatroHeaderSwapProps>;
  SiteFooter: ComponentType<SiteFooterProps>;
  LanguageButton: ComponentType<LanguageButtonProps>;
  TodayHighlightCard: ComponentType<TodayHighlightCardProps>;
};
