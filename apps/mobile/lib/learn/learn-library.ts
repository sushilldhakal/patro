import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons/Ionicons";

import {
  LEARN_LIBRARY as DOMAIN_LIBRARY,
  LEARN_SECTIONS as DOMAIN_SECTIONS,
  assertLearnLibrary,
  buildLearnViews,
  type LearnIconKey,
  type LibrarySection as DomainSection,
  type LibraryTopic as DomainTopic,
  type TopicStatus,
} from "@vedic-patro/domain/learn/learn-library";

export type { TopicStatus };

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** The shared Learn library with the app's Ionicons in place of the site's Lucide icons. */
const ICONS: Record<LearnIconKey, IoniconName> = {
  ArrowLeftRight: "book-outline",
  Axis3d: "sync-outline",
  Calculator: "calculator-outline",
  CalendarClock: "time-outline",
  CalendarRange: "calendar-outline",
  CircleDot: "ellipse-outline",
  Compass: "compass-outline",
  GitCompare: "git-compare-outline",
  Globe: "globe-outline",
  Hourglass: "book-outline",
  Layers: "book-outline",
  Locate: "book-outline",
  Milestone: "book-outline",
  Moon: "moon-outline",
  Rotate3d: "sync-outline",
  RotateCw: "refresh-outline",
  Ruler: "book-outline",
  ScrollText: "document-text-outline",
  Server: "server-outline",
  Sigma: "moon-outline",
  Sun: "sunny-outline",
  SunMoon: "book-outline",
  Telescope: "telescope-outline",
  Timer: "book-outline",
  Workflow: "layers-outline",
};

export type LibraryTopic = DomainTopic<IoniconName>;
export type LibrarySection = DomainSection<IoniconName>;

export const LEARN_SECTIONS: LibrarySection[] = DOMAIN_SECTIONS.map((s) => ({
  ...s,
  icon: ICONS[s.icon],
}));

export const LEARN_LIBRARY: LibraryTopic[] = DOMAIN_LIBRARY.map((t) => ({
  ...t,
  icon: ICONS[t.icon],
}));

const views = buildLearnViews(LEARN_SECTIONS, LEARN_LIBRARY);

export const LEARN_LIBRARY_BY_SLUG = views.bySlug;
export const PUBLISHED_TOPICS = views.published;
export const LEARN_SECTIONS_BY_ID = views.sectionsById;
export const publishedInSection = views.publishedInSection;
export const adjacentPublishedTopics = views.adjacentPublished;

/** Outlined-but-unwritten articles per section, for the hub's "N more being written" line. */
export function plannedCountInSection(sectionId: string): number {
  return views.plannedInSection(sectionId).length;
}

if (__DEV__) assertLearnLibrary(LEARN_SECTIONS, LEARN_LIBRARY);
