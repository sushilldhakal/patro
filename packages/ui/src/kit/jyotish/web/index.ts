import type { JyotishKit } from "../contract";
import { SaitRulesSection } from "./SaitRulesSection";
import { SaitSources } from "./SaitSources";
import { SuitabilityBadge, SuitabilityLegend } from "./SaitSuitability";

export type { SaitRule, SaitRulesSectionProps, SaitSourcesProps, SuitabilityBadgeProps, SuitabilityLegendProps } from "../contract";
export { SaitRulesSection, SaitSources, SuitabilityBadge, SuitabilityLegend };

export const jyotishKit = { SaitSources, SuitabilityBadge, SuitabilityLegend, SaitRulesSection } satisfies JyotishKit;
