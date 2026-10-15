import type { JyotishKit } from "../contract";
import { DocumentCard } from "./DocumentCard";
import { DocumentJumpForm } from "./DocumentJumpForm";
import {
  RashifalComponents,
  RashifalDomains,
  RashifalGocharChips,
  RashifalLucky,
  RashifalMeter,
  RashifalPersonalCard,
  RashifalProfilePicker,
  RashifalSignCard,
  RashifalWhyButton,
} from "./Rashifal";
import { SaitRulesSection } from "./SaitRulesSection";
import { SaitSources } from "./SaitSources";
import { SuitabilityBadge, SuitabilityLegend } from "./SaitSuitability";

export type {
  DocumentCardProps,
  DocumentJumpFormProps,
  RashifalCardView,
  RashifalComponentsProps,
  RashifalDomainsProps,
  RashifalGlyph,
  RashifalGocharChipsProps,
  RashifalLuckyProps,
  RashifalMeterProps,
  RashifalPersonalCardProps,
  RashifalProfilePickerProps,
  RashifalSignCardProps,
  RashifalWhyButtonProps,
  SaitRule,
  SaitRulesSectionProps,
  SaitSourcesProps,
  SuitabilityBadgeProps,
  SuitabilityLegendProps,
} from "../contract";
export {
  DocumentCard,
  DocumentJumpForm,
  RashifalComponents,
  RashifalDomains,
  RashifalGocharChips,
  RashifalLucky,
  RashifalMeter,
  RashifalPersonalCard,
  RashifalProfilePicker,
  RashifalSignCard,
  RashifalWhyButton,
  SaitRulesSection,
  SaitSources,
  SuitabilityBadge,
  SuitabilityLegend,
};

export const jyotishKit = {
  SaitSources,
  SuitabilityBadge,
  SuitabilityLegend,
  SaitRulesSection,
  DocumentJumpForm,
  DocumentCard,
  RashifalMeter,
  RashifalDomains,
  RashifalLucky,
  RashifalWhyButton,
  RashifalComponents,
  RashifalGocharChips,
  RashifalSignCard,
  RashifalPersonalCard,
  RashifalProfilePicker,
} satisfies JyotishKit;
