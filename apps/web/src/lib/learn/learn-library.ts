import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Axis3d,
  Calculator,
  CalendarClock,
  CalendarRange,
  CircleDot,
  Compass,
  GitCompare,
  Globe,
  Hourglass,
  Layers,
  Locate,
  Milestone,
  Moon,
  Rotate3d,
  RotateCw,
  Ruler,
  ScrollText,
  Server,
  Sigma,
  Sun,
  SunMoon,
  Telescope,
  Timer,
  Workflow,
} from "lucide-react";
import {
  LEARN_LIBRARY as DOMAIN_LIBRARY,
  LEARN_SECTIONS as DOMAIN_SECTIONS,
  assertLearnLibrary,
  buildLearnViews,
  topicPath,
  type LearnIconKey,
  type LibrarySection as DomainSection,
  type LibraryTopic as DomainTopic,
  type TopicStatus,
} from "@vedic-patro/domain/learn/learn-library";

export type { TopicStatus };
export { topicPath };

const ICONS: Record<LearnIconKey, LucideIcon> = {
  ArrowLeftRight,
  Axis3d,
  Calculator,
  CalendarClock,
  CalendarRange,
  CircleDot,
  Compass,
  GitCompare,
  Globe,
  Hourglass,
  Layers,
  Locate,
  Milestone,
  Moon,
  Rotate3d,
  RotateCw,
  Ruler,
  ScrollText,
  Server,
  Sigma,
  Sun,
  SunMoon,
  Telescope,
  Timer,
  Workflow,
};

export type LibraryTopic = DomainTopic<LucideIcon>;
export type LibrarySection = DomainSection<LucideIcon>;

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
export const PLANNED_TOPICS = views.planned;
export const LEARN_SECTIONS_BY_ID = views.sectionsById;
export const publishedInSection = views.publishedInSection;
export const plannedInSection = views.plannedInSection;

/*
 * `import.meta.env` is a Vite injection, and this module is also imported by
 * the sitemap script under plain tsx — where it is undefined. Check for it
 * before reading DEV rather than crashing the build.
 */
if (typeof import.meta.env !== "undefined" && import.meta.env.DEV) {
  assertLearnLibrary(LEARN_SECTIONS, LEARN_LIBRARY);
}
