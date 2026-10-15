/**
 * Learn kit props. Each platform draws these: HTML on the website
 * (`web/`), React Native in the app (`native/`).
 */
import type { ReactNode } from "react";
import type { ArticleData } from "@vedic-patro/domain/learn/article-schema";
import type { LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import type { LearnTopicCard as LearnTopic } from "@vedic-patro/features/learn";

export type ChapterOverlayProps = {
  onClose: () => void;
  className?: string;
  /** The diagram for this chapter. Each app supplies its own registry. */
  children: ReactNode;
};

export type ChapterStillProps = {
  /** Path under the site's public illustrations, no leading slash. */
  src: string;
  captionKey?: string;
  onClose: () => void;
};

export type ChapterTipProps = {
  tipKey: string;
};

export type ArticleBodyProps = {
  article: ArticleData;
  /** Continues section numbers across a merged chapter (0 → 01). */
  sectionOffset?: number;
  /** A merged page draws one see-also footer, not one after every chapter. */
  hideSeeAlso?: boolean;
  /** Opens `/learn/:slug`. The website also exposes that path as the anchor href. */
  openArticle: (slug: string) => void;
  /** The app's diagram registry. An unknown id draws nothing. */
  renderDiagram?: (id: string) => ReactNode;
};

export type LearnMoreCardProps = {
  slugs: string[];
  heading?: string;
  className?: string;
  /** Book glyph beside the heading. Each app supplies its own icon set. */
  headingIcon: ReactNode;
  renderIcon: (icon: LearnIconKey) => ReactNode;
  /** Website anchor. A normal click calls `onOpen`; modified clicks follow the href. */
  hrefFor: (slug: string) => string;
  onOpen: (slug: string) => void;
};

export type LearnTopicCardProps = {
  topic: LearnTopic;
  readMore: string;
  icon: ReactNode;
  href: string;
  onOpen: () => void;
};

export type LearnKit = {
  ArticleBody: (props: ArticleBodyProps) => ReactNode;
  ChapterOverlay: (props: ChapterOverlayProps) => ReactNode;
  ChapterStill: (props: ChapterStillProps) => ReactNode;
  ChapterTip: (props: ChapterTipProps) => ReactNode;
  LearnMoreCard: (props: LearnMoreCardProps) => ReactNode;
  LearnTopicCard: (props: LearnTopicCardProps) => ReactNode;
};
