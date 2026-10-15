import type { ShellKit } from "../contract";
import { PatroHeaderSwap, PatroHeaderTabs } from "./PatroHeaderTabs";
import { SeoContentSection } from "./SeoContentSection";
import { SiteFooter } from "./SiteFooter";
import { StatCard } from "./StatCard";

export { PatroHeaderSwap, PatroHeaderTabs, SeoContentSection, SiteFooter, StatCard };
export type {
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
} satisfies ShellKit;
