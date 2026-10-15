import type { LearnKit } from "../contract";
import { ArticleBody } from "./ArticleBody";
import { ChapterOverlay } from "./ChapterOverlay";
import { ChapterStill, ChapterTip } from "./ChapterAsides";

export type { ArticleBodyProps, ChapterOverlayProps, ChapterStillProps, ChapterTipProps } from "../contract";
export { ArticleBody, ChapterOverlay, ChapterStill, ChapterTip };

export const learnKit = { ArticleBody, ChapterOverlay, ChapterStill, ChapterTip } satisfies LearnKit;
