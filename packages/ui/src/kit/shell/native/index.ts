import type { ShellKit } from "../contract";
import { PatroHeaderSwap, PatroHeaderTabs } from "./PatroHeaderTabs";
import { SeoContentSection } from "./SeoContentSection";
import { StatCard } from "./StatCard";

export { PatroHeaderSwap, PatroHeaderTabs, SeoContentSection, StatCard };
export type { PatroHeaderSwapProps, PatroHeaderTab, PatroHeaderTabsProps, SeoContentSectionProps, StatCardProps, ShellKit } from "../contract";

export const shellKit = { StatCard, SeoContentSection, PatroHeaderTabs, PatroHeaderSwap } satisfies ShellKit;
