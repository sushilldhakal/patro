import type { ShellKit } from "../contract";
import { AccountMenu } from "./AccountMenu";
import { AuthDialog } from "./AuthDialog";
import { HomeQuickLinks } from "./HomeQuickLinks";
import { HomeRashifalSignPicker } from "./HomeRashifalSignPicker";
import { HomeVedaMantra } from "./HomeVedaMantra";
import { LanguageButton } from "./LanguageButton";
import { PatroCalendarHeader, PatroMonthYearNav } from "./PatroCalendarHeader";
import { PatroDayTimeHeader } from "./PatroDayTimeHeader";
import { PatroDayTimePanel } from "./PatroDayTimePanel";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import { PatroHeaderSwap, PatroHeaderTabs } from "./PatroHeaderTabs";
import { PatroYearHeader } from "./PatroYearHeader";
import { PatroYearNav, PatroYearNavBlock } from "./PatroYearNav";
import { SeoContentSection } from "./SeoContentSection";
import { SiteFooter } from "./SiteFooter";
import { StatCard } from "./StatCard";
import { TodayHighlightCard } from "./TodayHighlightCard";

export {
  AccountMenu,
  AuthDialog,
  HomeQuickLinks,
  HomeRashifalSignPicker,
  HomeVedaMantra,
  LanguageButton,
  PatroCalendarHeader,
  PatroDayTimeHeader,
  PatroDayTimePanel,
  PatroHeaderLocation,
  PatroHeaderSwap,
  PatroHeaderTabs,
  PatroMonthYearNav,
  PatroYearHeader,
  PatroYearNav,
  PatroYearNavBlock,
  SeoContentSection,
  SiteFooter,
  StatCard,
  TodayHighlightCard,
};
export type {
  AccountMenuProps,
  AuthDialogViewProps,
  CalendarHeaderSegment,
  HomeQuickLinkGroup,
  HomeQuickLinkItem,
  HomeQuickLinksProps,
  HomeRashifalSignPickerProps,
  HomeRashifalThumbView,
  HomeVedaMantraProps,
  LanguageButtonProps,
  PatroCalendarHeaderProps,
  PatroDayTimeHeaderProps,
  PatroDayTimeModel,
  PatroDayTimePanelProps,
  PatroHeaderLocationProps,
  PatroHeaderSwapProps,
  PatroHeaderTab,
  PatroHeaderTabsProps,
  PatroMonthYearNavProps,
  PatroYearHeaderProps,
  PatroYearNavBlockProps,
  PatroYearNavProps,
  SeoContentSectionProps,
  SiteFooterProps,
  StatCardProps,
  TodayHighlightCardProps,
  ShellKit,
} from "../contract";

export const shellKit = {
  StatCard,
  SeoContentSection,
  PatroHeaderTabs,
  PatroHeaderSwap,
  SiteFooter,
  LanguageButton,
  TodayHighlightCard,
  PatroHeaderLocation,
  PatroCalendarHeader,
  PatroMonthYearNav,
  PatroDayTimePanel,
  PatroDayTimeHeader,
  PatroYearHeader,
  PatroYearNav,
  PatroYearNavBlock,
  HomeQuickLinks,
  HomeVedaMantra,
  HomeRashifalSignPicker,
  AccountMenu,
  AuthDialog,
} satisfies ShellKit;
