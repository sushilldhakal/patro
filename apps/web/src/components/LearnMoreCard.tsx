import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, ArrowRight } from "lucide-react";
import { LEARN_TOPICS_BY_SLUG } from "@/lib/learn/learn-topics-meta";
import { useLocale, bilingualText } from "@/i18n/locale";

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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const resolvedHeading = heading ?? t("learn_more.default_heading");
  const topics = slugs
    .map((s) => LEARN_TOPICS_BY_SLUG[s])
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (topics.length === 0) return null;

  return (
    <section
      className={
        "rounded-2xl border border-border bg-card/40 p-4 sm:p-5 " + (className ?? "")
      }
    >
      <div className="mb-3 flex items-center gap-2 text-secondary">
        <BookOpen className="size-4" />
        <h2 className="text-sm font-semibold text-foreground">{resolvedHeading}</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.slug}
              to="/learn/$slug"
              params={{ slug: t.slug }}
              className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 transition-colors hover:border-secondary/60 hover:bg-secondary/[0.04]"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {bilingualText(lang, t.titleNe, t.titleEn)}
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
