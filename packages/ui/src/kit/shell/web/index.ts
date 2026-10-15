import type { ShellKit } from "../contract";
import { LanguageButton } from "./LanguageButton";
import { PatroHeaderSwap, PatroHeaderTabs } from "./PatroHeaderTabs";
import { SeoContentSection } from "./SeoContentSection";
import { SiteFooter } from "./SiteFooter";
import { StatCard } from "./StatCard";

export { LanguageButton, PatroHeaderSwap, PatroHeaderTabs, SeoContentSection, SiteFooter, StatCard };
export type {
  LanguageButtonProps,
  PatroHeaderSwapProps,
  PatroHeaderTab,
  PatroHeaderTabsProps,
  SeoContentSectionProps,
  SiteFooterProps,
  StatCardProps,
  ShellKit,
} from "../contract";

export const shellKit = {
  StatCard,
  SeoContentSection,
  PatroHeaderTabs,
  PatroHeaderSwap,
  SiteFooter,
  LanguageButton,
} satisfies ShellKit;
