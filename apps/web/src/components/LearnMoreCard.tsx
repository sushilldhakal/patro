import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight } from "lucide-react";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { useLearnMoreCard } from "@vedic-patro/features/common";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import { cn } from "@vedic-patro/domain/utils";

interface Props {
  slugs: string[];
  heading?: string;
  className?: string;
}

/**
 * Subtle contextual "Learn more" block. Drop it at the bottom of a functional
 * page to point interested users at the relevant Knowledge Center articles
 * without cluttering the page itself.
 */
export function LearnMoreCard({ slugs, heading, className }: Props) {
  const card = useLearnMoreCard(slugs, heading);

  if (card.topics.length === 0) return null;

  return (
    <section
      className={cn(learnPageClasses.moreCard, className)}
    >
      <div className={cn(learnPageClasses.moreHead, "text-secondary")}>
        <BookOpen className="size-4" />
        <h2 className={learnPageClasses.moreHeading}>{card.heading}</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {card.topics.map((topic) => {
          const Icon = LEARN_ICONS[topic.icon];
          return (
            <Link
              key={topic.slug}
              to="/learn/$slug"
              params={{ slug: topic.slug }}
              className={cn(learnPageClasses.moreItem, "group transition-colors hover:border-secondary/60 hover:bg-secondary/[0.04]")}
            >
              <span className={cn(learnPageClasses.moreIcon, "text-secondary")}>
                <Icon className="size-4" />
              </span>
              <span className={cn(learnPageClasses.moreLabel, "truncate")}>
                {topic.title}
              </span>
              <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default LearnMoreCard;
