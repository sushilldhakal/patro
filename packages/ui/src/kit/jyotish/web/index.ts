import type { JyotishKit } from "../contract";
import { DocumentCard } from "./DocumentCard";
import { DocumentJumpForm } from "./DocumentJumpForm";
import { SaitRulesSection } from "./SaitRulesSection";
import { SaitSources } from "./SaitSources";
import { SuitabilityBadge, SuitabilityLegend } from "./SaitSuitability";

export type {
  DocumentCardProps,
  DocumentJumpFormProps,
  SaitRule,
  SaitRulesSectionProps,
  SaitSourcesProps,
  SuitabilityBadgeProps,
  SuitabilityLegendProps,
} from "../contract";
export { DocumentCard, DocumentJumpForm, SaitRulesSection, SaitSources, SuitabilityBadge, SuitabilityLegend };

export const jyotishKit = {
  SaitSources,
  SuitabilityBadge,
  SuitabilityLegend,
  SaitRulesSection,
  DocumentJumpForm,
  DocumentCard,
} satisfies JyotishKit;
