import type { LearnKit } from "../contract";
import { ArticleBody } from "./ArticleBody";
import { ChapterOverlay } from "./ChapterOverlay";
import { ChapterStill, ChapterTip } from "./ChapterAsides";
import { LearnMoreCard, LearnTopicCard } from "./LearnCards";
import { EotGraph } from "./EotGraph";
import { EarthRotationDiagram } from "./EarthRotationDiagram";
import { ServerPipelineDiagram } from "./ServerPipelineDiagram";

export type {
  ArticleBodyProps,
  ChapterOverlayProps,
  ChapterStillProps,
  ChapterTipProps,
  LearnMoreCardProps,
  LearnTopicCardProps,
  EotGraphProps,
  EarthRotationDiagramProps,
  ServerPipelineDiagramProps,
} from "../contract";
export {
  ArticleBody,
  ChapterOverlay,
  ChapterStill,
  ChapterTip,
  LearnMoreCard,
  LearnTopicCard,
  EotGraph,
  EarthRotationDiagram,
  ServerPipelineDiagram,
};

export const learnKit = {
  ArticleBody,
  ChapterOverlay,
  ChapterStill,
  ChapterTip,
  LearnMoreCard,
  LearnTopicCard,
  EotGraph,
  EarthRotationDiagram,
  ServerPipelineDiagram,
} satisfies LearnKit;
