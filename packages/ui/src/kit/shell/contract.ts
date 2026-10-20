/**
 * Shell kit props — one contract for the website and the app.
 * Drawing lives in `web/` and `native/`; both indexes must export every name.
 */
import type { ComponentType, ReactNode } from "react";
import type { CalendarDay, LocationParams, PanchangaDay } from "@vedic-patro/api-client";
import type { Era, Language } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@vedic-patro/domain/panchanga-location";
import type { LocateDevice, SeoContentRoute } from "@vedic-patro/features/common";
import type { SunTimesPage } from "@vedic-patro/features/sun-times";
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
  /** App only: right end of the title row (the location button). The website lays these out in its own grid. */
  titleAside?: ReactNode;
  /** App only: right end of the date row (the tabs). */
  navAside?: ReactNode;
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
  /** App only: right end of the title row (the location button). */
  titleAside?: ReactNode;
  /** App only: right end of the date row (the tabs). */
  navAside?: ReactNode;
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

export type HomeQuickLinkItem = {
  key: string;
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  description?: string;
};

export type HomeQuickLinkGroup = {
  id: string;
  title: string;
  items: HomeQuickLinkItem[];
};

export type HomeQuickLinksProps = {
  groups: HomeQuickLinkGroup[];
  className?: string;
};

export type HomeVedaMantraProps = {
  title: string;
  tokens: string[];
  /** Index of the word under the playhead, or -1. */
  activeToken: number;
  source: string;
  readMore: string;
  playLabel: string;
  pauseLabel: string;
  playing: boolean;
  onToggle?: () => void;
  onOpenPassage: () => void;
  className?: string;
};

export type HomeRashifalThumbView = {
  id: number;
  index: number;
  name: string;
  percent: number;
  percentLabel: string;
  active: boolean;
  barClassName: string;
  percentClassName: string;
  glyph: ReactNode;
};

export type HomeRashifalSignPickerProps = {
  label: string;
  thumbs: HomeRashifalThumbView[];
  onSelect: (index: number) => void;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  /** The selected sign's card, and the following one on a wide screen. */
  cards: ReactNode;
  className?: string;
};

export type AccountMenuProps = {
  status: "loading" | "signed-out" | "signed-in";
  initial: string;
  email: string;
  verified: boolean;
  statusLabel: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onSignIn: () => void;
  onProfiles: () => void;
  onSignOut: () => void;
  copy: { signIn: string; menuAria: string; myProfiles: string; signOut: string };
  /** The sign-in dialog, rendered by the app while it is open. */
  auth?: ReactNode;
};

export type AuthDialogViewProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  social?: ReactNode;
  email: string;
  onEmail: (value: string) => void;
  emailLabel: string;
  emailPlaceholder: string;
  showPassword: boolean;
  password: string;
  onPassword: (value: string) => void;
  passwordLabel: string;
  passwordPlaceholder?: string;
  showConfirm: boolean;
  confirm: string;
  onConfirm: (value: string) => void;
  confirmLabel: string;
  error?: string | null;
  notice?: string | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
  mode: "login" | "signup" | "forgot";
  onSwitch: (mode: "login" | "signup" | "forgot") => void;
  switchCopy: { forgot: string; newHere: string; create: string; already: string; signIn: string; back: string };
  showLegal: boolean;
  legalAgree?: string;
  privacyLabel?: string;
  termsLabel?: string;
  onPrivacy?: () => void;
  onTerms?: () => void;
  closeLabel: string;
};

export type RelatedLinkItem = {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onPress: () => void;
};

export type RelatedPageLinksProps = {
  heading: string;
  label: string;
  headingIcon?: ReactNode;
  items: RelatedLinkItem[];
  className?: string;
};

export type VedicPatroLoaderProps = {
  /** Omit for the localized default; pass null to hide the caption. */
  label?: string | null;
  /** The mark: the website's image, or the app's animated art. */
  mark: ReactNode;
  className?: string;
};

export type MobileNavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onPress: () => void;
};

export type MobileNavSection = {
  id: string;
  title: string;
  items: MobileNavItem[];
};

export type MobileNavMenuProps = {
  label: string;
  sections: MobileNavSection[];
  className?: string;
};

export type BsCalendarMoon = { tithiIndex: number; title?: string };

export type BsCalendarGridProps = {
  days: CalendarDay[];
  publicHolidayDates?: Set<string>;
  selectedAdDate?: string;
  onSelectDay?: (day: CalendarDay) => void;
  isEnriching?: boolean;
  todayAd?: string;
  primaryDate?: "bs" | "ad";
  /** Moon artwork stays in each app (it is a panchanga drawing). */
  moon?: (info: BsCalendarMoon) => ReactNode;
  className?: string;
};

export type BsNativeSelectOption = {
  value: number;
  label: string;
  /** Closed control below `md` when the full label is too wide. */
  shortLabel?: string;
};

export type BsNativeSelectProps = {
  value: number;
  options: BsNativeSelectOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
  comfortable?: boolean;
};

export type MuhurtaAsidePanelProps = {
  p: PanchangaDay;
  /** Hint glyph. Each app supplies its icon set. */
  hintIcon?: ReactNode;
  /** Opens the full table for the active sub-tab. The app supplies the route. */
  onOpenTable?: (elementId: string) => void;
  className?: string;
};

export type VivaranPlanetStatus = { key: string; isRetrograde?: boolean; isCombust?: boolean };

export type PanchangaVivaranPanelProps = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  loading?: boolean;
  /** Retrograde and combust marks. Drawn by the graha kit, passed in. */
  renderPlanetStatus?: (planet: VivaranPlanetStatus) => ReactNode;
  /** Opens the day's full panchanga. Each app supplies its router. */
  onOpenDetail?: () => void;
  className?: string;
};

export type PatroYearEraToggleProps = {
  era: Era;
  onEraChange: (era: Era) => void;
  className?: string;
  compact?: boolean;
  comfortable?: boolean;
  variant?: "inline" | "dropdown";
};

export type RituSeasonsProps = {
  location?: LocationParams;
  /** Title row. The ritu page uses the toolbar (`false`). */
  showHeader?: boolean;
  placeLabel?: string;
  headerIcon?: ReactNode;
  onWhyPress?: () => void;
  className?: string;
};

export type VerticalEdgeLabelProps = {
  text: string;
  side: "left" | "right";
  className?: string;
  /** Tailwind inset override, for example `inset-y-2`. */
  insetClass?: string;
  /** App callers pass a theme colour. The website uses `className`. */
  color?: string;
};

export type MatrixCell = {
  key: string;
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  /** `row` makes the body cell a row header. */
  scope?: "col" | "row";
  title?: string;
};

export type MatrixRow = { key: string; className?: string; cells: MatrixCell[] };

export type MatrixTableProps = {
  label?: string;
  headerRows: MatrixRow[];
  rows: MatrixRow[];
  className?: string;
  tableClassName?: string;
};

export type SunTimesYearGridProps = {
  page: SunTimesPage;
  hideHeader?: boolean;
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
  HomeQuickLinks: ComponentType<HomeQuickLinksProps>;
  HomeVedaMantra: ComponentType<HomeVedaMantraProps>;
  HomeRashifalSignPicker: ComponentType<HomeRashifalSignPickerProps>;
  AccountMenu: ComponentType<AccountMenuProps>;
  AuthDialog: ComponentType<AuthDialogViewProps>;
  RelatedPageLinks: ComponentType<RelatedPageLinksProps>;
  VedicPatroLoader: ComponentType<VedicPatroLoaderProps>;
  MobileNavMenu: ComponentType<MobileNavMenuProps>;
  BsCalendarGrid: ComponentType<BsCalendarGridProps>;
  BsNativeSelect: ComponentType<BsNativeSelectProps>;
  MuhurtaAsidePanel: ComponentType<MuhurtaAsidePanelProps>;
  PanchangaVivaranPanel: ComponentType<PanchangaVivaranPanelProps>;
  PatroYearEraToggle: ComponentType<PatroYearEraToggleProps>;
  RituSeasons: ComponentType<RituSeasonsProps>;
  VerticalEdgeLabel: ComponentType<VerticalEdgeLabelProps>;
  MatrixTable: ComponentType<MatrixTableProps>;
  SunTimesYearGrid: ComponentType<SunTimesYearGridProps>;
};
