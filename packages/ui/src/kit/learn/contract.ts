/**
 * Learn kit props. Each platform draws these: HTML on the website
 * (`web/`), React Native in the app (`native/`).
 */
import type { ReactNode } from "react";
import type { ArticleData } from "@vedic-patro/domain/learn/article-schema";

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

export type LearnKit = {
  ArticleBody: (props: ArticleBodyProps) => ReactNode;
};
