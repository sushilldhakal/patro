/**
 * Jyotish kit props — one contract for the website and the app.
 * `web/` draws these with HTML, `native/` with React Native. Both indexes
 * satisfy `JyotishKit`.
 */
import type { ComponentType } from "react";
import type { SaitSuitability } from "@vedic-patro/api-client";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";

export type SaitSourcesProps = {
  category: SaitCategoryId;
};

export type SuitabilityBadgeProps = {
  suitability: SaitSuitability;
  className?: string;
};

export type SuitabilityLegendProps = {
  counts?: { favourable: number; neutral: number; avoid: number } | null;
};

/** A ceremony rule row. Same shape the rules catalogue already uses. */
export type SaitRule = SaitRuleEntry;

export type SaitRulesSectionProps = {
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
  defaultOpen?: boolean;
  /** Ids currently applied. A toggleable rule not listed here is treated as ON. */
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  /** Recomputing indicator while a custom-rule fetch is in flight. */
  busy?: boolean;
};

export type JyotishKit = {
  SaitSources: ComponentType<SaitSourcesProps>;
  SuitabilityBadge: ComponentType<SuitabilityBadgeProps>;
  SuitabilityLegend: ComponentType<SuitabilityLegendProps>;
  SaitRulesSection: ComponentType<SaitRulesSectionProps>;
};
