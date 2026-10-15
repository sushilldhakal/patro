import type { LearnKit } from "../contract";
import { ArticleBody } from "./ArticleBody";
import { ChapterOverlay } from "./ChapterOverlay";
import { ChapterStill, ChapterTip } from "./ChapterAsides";
import { LearnMoreCard, LearnTopicCard } from "./LearnCards";

export type {
  ArticleBodyProps,
  ChapterOverlayProps,
  ChapterStillProps,
  ChapterTipProps,
  LearnMoreCardProps,
  LearnTopicCardProps,
} from "../contract";
export { ArticleBody, ChapterOverlay, ChapterStill, ChapterTip, LearnMoreCard, LearnTopicCard };

export const learnKit = { ArticleBody, ChapterOverlay, ChapterStill, ChapterTip, LearnMoreCard, LearnTopicCard } satisfies LearnKit;
