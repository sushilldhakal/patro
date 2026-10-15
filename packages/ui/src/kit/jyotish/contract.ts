/**
 * Jyotish kit props — one contract for the website and the app.
 * `web/` draws these with HTML, `native/` with React Native. Both indexes
 * satisfy `JyotishKit`.
 */
import type { ComponentType } from "react";
import type { DocumentSummary, SaitSuitability } from "@vedic-patro/api-client";
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

export type DocumentJumpFormProps = {
  chapterNumbers: number[];
  /** On a chapter page the chapter field is hidden and fixed to this. */
  currentChapter?: number;
  /** Open the chapter, or scroll to the verse. Return false when it cannot be found. */
  onJump: (chapter: number, verse: string) => boolean;
};

export type DocumentCardProps = {
  doc: DocumentSummary;
  /** List-page group, carried into the website link so Back returns there. */
  category?: string;
  topic?: string;
  /** App navigation. The website renders a link from `doc.slug`. */
  onPress?: () => void;
};

export type JyotishKit = {
  SaitSources: ComponentType<SaitSourcesProps>;
  SuitabilityBadge: ComponentType<SuitabilityBadgeProps>;
  SuitabilityLegend: ComponentType<SuitabilityLegendProps>;
  SaitRulesSection: ComponentType<SaitRulesSectionProps>;
  DocumentJumpForm: ComponentType<DocumentJumpFormProps>;
  DocumentCard: ComponentType<DocumentCardProps>;
};
