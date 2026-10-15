import type { LearnKit } from "../contract";
import { ArticleBody } from "./ArticleBody";
import { ChapterOverlay } from "./ChapterOverlay";
import { ChapterStill, ChapterTip } from "./ChapterAsides";
import { LearnMoreCard, LearnTopicCard } from "./LearnCards";
import { EotGraph } from "./EotGraph";
import { EarthRotationDiagram } from "./EarthRotationDiagram";
import { ServerPipelineDiagram } from "./ServerPipelineDiagram";
import { CompassControl } from "./CompassControl";
import { SkyTimeSheet } from "./SkyTimeSheet";
import {
  GrahaReferenceTable,
  KaranaReferenceTable,
  NakshatraReferenceTable,
  RashiReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
} from "./ReferenceTables";
import { DayChapterBar, DayChapterWelcome } from "./DayChapterChrome";

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
  CompassControlProps,
  SkyTimeSheetProps,
  DayChapterWelcomeProps,
  DayChapterBarProps,
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
  CompassControl,
  SkyTimeSheet,
  RashiReferenceTable,
  GrahaReferenceTable,
  NakshatraReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
  KaranaReferenceTable,
  DayChapterWelcome,
  DayChapterBar,
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
  CompassControl,
  SkyTimeSheet,
  RashiReferenceTable,
  GrahaReferenceTable,
  NakshatraReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
  KaranaReferenceTable,
  DayChapterWelcome,
  DayChapterBar,
} satisfies LearnKit;
