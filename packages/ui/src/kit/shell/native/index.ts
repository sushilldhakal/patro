import type { ShellKit } from "../contract";
import { SeoContentSection } from "./SeoContentSection";
import { StatCard } from "./StatCard";

export { SeoContentSection, StatCard };
export type { SeoContentSectionProps, StatCardProps, ShellKit } from "../contract";

export const shellKit = { StatCard, SeoContentSection } satisfies ShellKit;
