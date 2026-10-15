/**
 * Jyotish kit props — one contract for the website and the app.
 * `web/` draws these with HTML, `native/` with React Native. Both indexes
 * satisfy `JyotishKit`.
 */
import type { ComponentType, ReactNode } from "react";
import type {
  DocumentSummary,
  Profile,
  RashifalGocharRow,
  RashifalPeriod,
  RashifalPersonal,
  RashifalSignBlock,
  SaitSuitability,
} from "@vedic-patro/api-client";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import type { useRashifalSignCard } from "@vedic-patro/features/rashifal";

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

/** Fields both rashifal cards hand to the shared meter, domains, lucky row and details. */
export type RashifalCardView = Pick<
  ReturnType<typeof useRashifalSignCard>,
  "open" | "toggle" | "stars" | "tone" | "percent" | "percentLabel" | "domains" | "whyLabel" | "components" | "gochar" | "lucky"
>;

export type RashifalMeterProps = { card: RashifalCardView };
export type RashifalDomainsProps = { card: RashifalCardView };
/** Two columns on a sign card. Three on a personal card (two until the sm breakpoint on the website). */
export type RashifalLuckyProps = { card: RashifalCardView; columns: 2 | 3 };
export type RashifalWhyButtonProps = { card: RashifalCardView; detailsId: string };
export type RashifalComponentsProps = { card: RashifalCardView };

export type RashifalGocharChipsProps = {
  rows: RashifalGocharRow[];
  className?: string;
};

/** The rashi glyph the card asks the app to draw (Agent 2 owns the glyph component). */
export type RashifalGlyph = { name: string; number: number };

export type RashifalSignCardProps = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
  taraLine?: string;
  renderGlyph: (glyph: RashifalGlyph) => ReactNode;
};

export type RashifalPersonalCardProps = {
  name: string;
  personal: RashifalPersonal;
  renderGlyph: (glyph: RashifalGlyph) => ReactNode;
};

export type RashifalProfilePickerProps = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
  isAuthenticated: boolean;
  /** Sign-in dialog. The kit does not import the app auth screen. */
  renderAuth: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
};

export type JyotishKit = {
  SaitSources: ComponentType<SaitSourcesProps>;
  SuitabilityBadge: ComponentType<SuitabilityBadgeProps>;
  SuitabilityLegend: ComponentType<SuitabilityLegendProps>;
  SaitRulesSection: ComponentType<SaitRulesSectionProps>;
  DocumentJumpForm: ComponentType<DocumentJumpFormProps>;
  DocumentCard: ComponentType<DocumentCardProps>;
  RashifalMeter: ComponentType<RashifalMeterProps>;
  RashifalDomains: ComponentType<RashifalDomainsProps>;
  RashifalLucky: ComponentType<RashifalLuckyProps>;
  RashifalWhyButton: ComponentType<RashifalWhyButtonProps>;
  RashifalComponents: ComponentType<RashifalComponentsProps>;
  RashifalGocharChips: ComponentType<RashifalGocharChipsProps>;
  RashifalSignCard: ComponentType<RashifalSignCardProps>;
  RashifalPersonalCard: ComponentType<RashifalPersonalCardProps>;
  RashifalProfilePicker: ComponentType<RashifalProfilePickerProps>;
};
